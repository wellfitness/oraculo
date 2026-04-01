/**
 * Google Drive Sync - Motor de sincronizacion bidireccional
 *
 * Orquesta la sincronizacion entre localStorage y Google Drive.
 * localStorage es SIEMPRE el almacenamiento primario.
 * Drive es una capa de sync que funciona cuando hay conexion.
 *
 * Proteccion de 3 capas:
 *  1. Version check: verifica que nadie escribio en Drive antes de hacer push
 *  2. Merge inteligente: combina datos por seccion en vez de sobrescribir todo
 *  3. Conflict log: guarda versiones descartadas para recuperacion
 *
 * Sync bidireccional:
 *  - Push: cambios locales → Drive (debounced, tras evento data-saved)
 *  - Pull periodico: cada 30s verifica si hay cambios remotos (metadata-only)
 *  - Pull on focus: al volver a la tab, check inmediato
 */

import { GDRIVE_CONFIG } from './config.js';
import { setTokenRefresher, findFile, readFile, createFile, updateFile, getFileMetadata } from './drive-api.js';
import { mergeData, isEmptyData, calculateDataRichness } from './merge.js';

const STORAGE_KEY = 'oraculo_data';
const SYNC_STATE_KEY = 'oraculo_gdrive_sync';
const CONFLICT_LOG_KEY = 'oraculo_sync_conflicts';
const BACKUP_KEY = 'oraculo_data_pre_sync_backup';
const MAX_CONFLICTS = 50;

let _authModule = null;
let _platform = null;
let _debounceTimer = null;
let _syncing = false;
let _lastSyncAt = 0;
let _applyingRemote = false; // Flag anti-ciclo: evita push tras recibir datos de pull

// Polling y salud del sync
let _pollTimer = null;
let _syncHealth = 'healthy';  // 'healthy' | 'token_expired' | 'error'
let _consecutiveFailures = 0;

// ───────────────────────────────────────────────
// Estado persistente de sync
// ───────────────────────────────────────────────

function getSyncState() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATE_KEY)) || {};
  } catch {
    return {};
  }
}

function setSyncState(updates) {
  const state = { ...getSyncState(), ...updates };
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  return state;
}

export function isConnected() {
  const state = getSyncState();
  return !!state.connected;
}

export function getSyncInfo() {
  return { ...getSyncState(), syncHealth: _syncHealth };
}

// ───────────────────────────────────────────────
// Conflict Log (Capa 3)
// ───────────────────────────────────────────────

function loadConflictLog() {
  try {
    return JSON.parse(localStorage.getItem(CONFLICT_LOG_KEY)) || { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function saveConflicts(conflicts) {
  if (!conflicts || conflicts.length === 0) return;

  const log = loadConflictLog();
  log.entries.push(...conflicts);

  // Cap: mantener solo los ultimos MAX_CONFLICTS
  if (log.entries.length > MAX_CONFLICTS) {
    log.entries = log.entries.slice(-MAX_CONFLICTS);
  }

  localStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify(log));
  console.log(`[GDrive Sync] ${conflicts.length} conflicto(s) guardado(s) en log`);
}

export function getConflicts() {
  return loadConflictLog().entries;
}

export function clearConflicts() {
  localStorage.setItem(CONFLICT_LOG_KEY, JSON.stringify({ entries: [] }));
}

// ───────────────────────────────────────────────
// Salud del sync
// ───────────────────────────────────────────────

function markHealthy() {
  _syncHealth = 'healthy';
  _consecutiveFailures = 0;
  setSyncState({ syncHealth: 'healthy' });
}

function markTokenExpired() {
  _syncHealth = 'token_expired';
  setSyncState({ syncHealth: 'token_expired' });
  stopPolling();
  notifySyncStatus('token_expired');
}

function markError() {
  _consecutiveFailures++;
  if (_consecutiveFailures >= 3) {
    _syncHealth = 'error';
    setSyncState({ syncHealth: 'error' });
    notifySyncStatus('error');
  }
}

// ───────────────────────────────────────────────
// Inicializacion
// ───────────────────────────────────────────────

/**
 * Inicializa el motor de sync.
 * @param {'web' | 'extension' | 'capacitor'} platform
 */
export async function init(platform) {
  _platform = platform;

  // Cargar modulo de auth segun plataforma
  if (platform === 'extension') {
    _authModule = await import('./auth-extension.js');
  } else if (platform === 'capacitor') {
    _authModule = await import('./auth-capacitor.js');
  } else {
    _authModule = await import('./auth-web.js');
  }

  // Conectar token refresher para retry automatico en 401
  setTokenRefresher(() => _authModule.refreshToken());

  // Si estaba conectado, intentar sync silencioso al iniciar
  if (isConnected()) {
    try {
      const token = await _authModule.getTokenSilent();
      if (token) {
        await pull(token);
        markHealthy();
        notifySyncStatus('synced');
        _lastSyncAt = Date.now();
        // Iniciar polling tras pull exitoso
        startPolling();
      } else {
        markTokenExpired();
      }
    } catch (err) {
      console.warn('[GDrive Sync] Error en sync inicial:', err.message);
      markError();
    }
  }

  // Escuchar cambios locales para push automatico
  // El flag _applyingRemote evita el ciclo: pull → applyRemote → data-saved → push
  window.addEventListener('data-saved', () => {
    if (isConnected() && !_applyingRemote) {
      debouncedPush();
    }
  });

  // Pull inmediato al volver a la tab (el usuario pudo haber editado en otro dispositivo)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isConnected() && !_syncing) {
      checkForRemoteChanges();
    }
  });

  console.log(`[GDrive Sync] Inicializado (${platform}) con sync bidireccional`);
}

// ───────────────────────────────────────────────
// Polling periodico
// ───────────────────────────────────────────────

function startPolling() {
  stopPolling(); // Evitar duplicados
  _pollTimer = setInterval(checkForRemoteChanges, GDRIVE_CONFIG.POLL_INTERVAL_MS);
  console.log(`[GDrive Sync] Polling iniciado (cada ${GDRIVE_CONFIG.POLL_INTERVAL_MS / 1000}s)`);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

/**
 * Verifica si hay cambios remotos comparando solo la version del archivo.
 * Es una llamada ligera (metadata-only, ~200 bytes) que no gasta cuota significativa.
 * Solo descarga el archivo completo si la version cambio.
 */
async function checkForRemoteChanges() {
  // No poll en tabs ocultas (ahorra bateria y cuota)
  if (document.visibilityState === 'hidden') return;
  if (_syncing) return;
  if (!isConnected()) return;

  const syncState = getSyncState();
  if (!syncState.fileId) return;

  _syncing = true;
  try {
    const token = await _authModule.getTokenSilent();
    if (!token) {
      markTokenExpired();
      return;
    }

    const meta = await getFileMetadata(token, syncState.fileId);

    if (meta.version !== syncState.fileVersion) {
      // Version diferente → otro dispositivo hizo push → pull completo
      console.log(
        `[GDrive Sync] Cambio remoto detectado (local: ${syncState.fileVersion}, ` +
        `remote: ${meta.version}). Descargando...`
      );
      await pull(token);
      markHealthy();
      notifySyncStatus('synced');
    }
    // Si version es igual, no hay nada que hacer

    _lastSyncAt = Date.now();
  } catch (err) {
    if (err.status === 401) {
      markTokenExpired();
    } else {
      console.warn('[GDrive Sync] Error en poll:', err.message);
      markError();
    }
  } finally {
    _syncing = false;
  }
}

// ───────────────────────────────────────────────
// Conectar / Desconectar
// ───────────────────────────────────────────────

/**
 * Inicia el flujo de conexion con Google Drive.
 * Abre popup de consentimiento si es necesario.
 */
export async function connect() {
  if (!_authModule) throw new Error('Sync no inicializado');

  const result = await _authModule.signIn();
  if (!result?.token) throw new Error('No se obtuvo token');

  // Guardar estado conectado
  setSyncState({
    connected: true,
    email: result.email || '',
    connectedAt: new Date().toISOString(),
  });

  // Sync inicial tras conectar
  await syncNow(result.token);

  // Iniciar polling
  markHealthy();
  startPolling();

  notifySyncStatus('connected');
  return result;
}

/**
 * Desconecta Google Drive y limpia estado.
 */
export async function disconnect() {
  stopPolling();

  if (_authModule) {
    try {
      await _authModule.signOut();
    } catch {
      // Ignorar errores al revocar
    }
  }

  // Limpiar estado pero mantener datos locales intactos
  localStorage.removeItem(SYNC_STATE_KEY);
  _syncHealth = 'healthy';
  _consecutiveFailures = 0;
  notifySyncStatus('disconnected');
}

// ───────────────────────────────────────────────
// Pull: Drive → localStorage (con merge)
// ───────────────────────────────────────────────

async function pull(accessToken) {
  const syncState = getSyncState();
  let fileId = syncState.fileId;

  // Buscar archivo en Drive
  let file;
  if (fileId) {
    try {
      // Obtener metadata fresca (con version)
      file = await getFileMetadata(accessToken, fileId);
    } catch {
      // Si falla (archivo borrado?), buscar de nuevo
      file = await findFile(accessToken);
    }
  } else {
    file = await findFile(accessToken);
  }

  if (!file) {
    // No hay datos en Drive → hacer push inicial
    console.log('[GDrive Sync] No hay archivo en Drive, subiendo datos locales...');
    await push(accessToken);
    return;
  }

  // Cachear fileId y version
  if (file.id !== syncState.fileId || file.version !== syncState.fileVersion) {
    setSyncState({ fileId: file.id, fileVersion: file.version });
  }

  // Leer datos remotos
  const remoteData = await readFile(accessToken, file.id);

  if (!remoteData || !remoteData.updatedAt) {
    console.log('[GDrive Sync] Datos remotos invalidos, subiendo locales...');
    await push(accessToken);
    return;
  }

  // Comparar con datos locales
  const localRaw = localStorage.getItem(STORAGE_KEY);
  const localData = localRaw ? JSON.parse(localRaw) : null;

  if (!localData || !localData.updatedAt) {
    // No hay datos locales → usar remotos directamente
    console.log('[GDrive Sync] Sin datos locales, aplicando remotos');
    applyRemoteData(remoteData);
    setSyncState({ lastSyncAt: new Date().toISOString(), fileVersion: file.version });
    return;
  }

  const localTime = new Date(localData.updatedAt).getTime();
  const remoteTime = new Date(remoteData.updatedAt).getTime();

  if (remoteTime > localTime) {
    // Remoto es mas nuevo → MERGE en vez de sobrescribir ciegamente
    console.log('[GDrive Sync] Datos remotos mas recientes, haciendo merge...');

    // Anti-regresion: si local esta vacio y remote tiene datos, usar remote directo
    if (isEmptyData(localData) && !isEmptyData(remoteData)) {
      console.log('[GDrive Sync] Local vacio, aplicando remote completo');
      localStorage.setItem(BACKUP_KEY, localRaw);
      applyRemoteData(remoteData);
      setSyncState({ lastSyncAt: new Date().toISOString(), fileVersion: file.version });
      return;
    }

    // Backup local antes de merge
    localStorage.setItem(BACKUP_KEY, localRaw);

    // Merge inteligente
    const { merged, conflicts } = mergeData(localData, remoteData);

    // Guardar conflictos si los hay
    if (conflicts.length > 0) {
      saveConflicts(conflicts);
    }

    // Aplicar datos mergeados
    applyRemoteData(merged);

    // Push merged a Drive para convergencia (ambos dispositivos quedan iguales)
    try {
      const result = await updateFile(accessToken, file.id, merged);
      setSyncState({
        lastSyncAt: new Date().toISOString(),
        fileVersion: result.version,
      });
    } catch (err) {
      console.warn('[GDrive Sync] Error subiendo merged, se reintentara:', err.message);
      setSyncState({ lastSyncAt: new Date().toISOString() });
    }
  } else if (localTime > remoteTime) {
    // Local es mas nuevo → push
    console.log('[GDrive Sync] Datos locales mas recientes, subiendo...');
    await push(accessToken);
  } else {
    console.log('[GDrive Sync] Datos sincronizados');
    setSyncState({ lastSyncAt: new Date().toISOString(), fileVersion: file.version });
  }
}

// ───────────────────────────────────────────────
// Push: localStorage → Drive (con version check)
// ───────────────────────────────────────────────

async function push(accessToken) {
  const localRaw = localStorage.getItem(STORAGE_KEY);
  if (!localRaw) return;

  const localData = JSON.parse(localRaw);
  const syncState = getSyncState();

  let fileId = syncState.fileId;

  if (fileId) {
    // CAPA 1: Verificar version antes de escribir
    let meta;
    try {
      meta = await getFileMetadata(accessToken, fileId);
    } catch (err) {
      // getFileMetadata fallo (404 = archivo borrado, 401 = token)
      console.warn('[GDrive Sync] No se pudo verificar version:', err.message);
      const existing = await findFile(accessToken);
      if (existing) {
        setSyncState({ fileId: existing.id, fileVersion: existing.version });
        if (syncState.fileVersion && existing.version !== syncState.fileVersion) {
          await pullAndMerge(accessToken, existing.id);
          return;
        }
        const result = await updateFile(accessToken, existing.id, localData);
        setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
      } else {
        const result = await createFile(accessToken, localData);
        setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
        console.log('[GDrive Sync] Push completado (archivo nuevo)');
      }
      return;
    }

    // Metadata obtenida OK → verificar version
    if (syncState.fileVersion && meta.version !== syncState.fileVersion) {
      console.log(
        `[GDrive Sync] Version mismatch (local: ${syncState.fileVersion}, ` +
        `remote: ${meta.version}). Iniciando merge...`
      );
      await pullAndMerge(accessToken, fileId);
      return;
    }

    // Version OK → actualizar (try separado para distinguir de error de metadata)
    const result = await updateFile(accessToken, fileId, localData);
    setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
  } else {
    // No tenemos fileId → buscar o crear
    const existing = await findFile(accessToken);
    if (existing) {
      // Guardar fileId inmediatamente (aunque updateFile falle, no repetimos findFile)
      setSyncState({ fileId: existing.id, fileVersion: existing.version });

      // Leer remote para anti-regresion y posible merge
      const remoteData = await readFile(accessToken, existing.id);

      if (remoteData && !isEmptyData(remoteData) && isEmptyData(localData)) {
        console.log('[GDrive Sync] Anti-regresion: local vacio, aplicando remote');
        applyRemoteData(remoteData);
        setSyncState({ lastSyncAt: new Date().toISOString() });
        return;
      }

      if (remoteData && remoteData.updatedAt) {
        // Remote tiene datos → merge para no perder nada
        const { merged, conflicts } = mergeData(localData, remoteData);
        if (conflicts.length > 0) saveConflicts(conflicts);

        // Subir merged PRIMERO, luego aplicar localmente
        const result = await updateFile(accessToken, existing.id, merged);
        setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
        applyRemoteData(merged);
        console.log('[GDrive Sync] Push completado (con merge)');
        return;
      }

      // Remote vacio o sin updatedAt → push directo
      const result = await updateFile(accessToken, existing.id, localData);
      setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
    } else {
      const result = await createFile(accessToken, localData);
      setSyncState({ fileId: result.id, fileVersion: result.version, lastSyncAt: new Date().toISOString() });
    }
  }

  console.log('[GDrive Sync] Push completado');
}

// ───────────────────────────────────────────────
// Pull + Merge (cuando se detecta colision)
// ───────────────────────────────────────────────

/**
 * Se dispara cuando push detecta version mismatch.
 * Lee datos remotos frescos, hace merge, y sube el resultado.
 */
async function pullAndMerge(accessToken, fileId) {
  console.log('[GDrive Sync] Ejecutando pullAndMerge...');

  // Leer datos remotos frescos, luego metadata (secuencial para evitar race condition)
  const remoteData = await readFile(accessToken, fileId);
  const remoteMeta = await getFileMetadata(accessToken, fileId);

  const localRaw = localStorage.getItem(STORAGE_KEY);
  const localData = localRaw ? JSON.parse(localRaw) : null;

  if (!localData) {
    // Sin datos locales → usar remote
    applyRemoteData(remoteData);
    setSyncState({
      fileVersion: remoteMeta.version,
      lastSyncAt: new Date().toISOString(),
    });
    return;
  }

  // Anti-regresion con richness check
  const localRichness = calculateDataRichness(localData);
  const remoteRichness = calculateDataRichness(remoteData);

  if (remoteRichness > 0 && localRichness < remoteRichness * 0.3) {
    // Local tiene menos del 30% de riqueza que remote → probable datos stale
    console.log(
      `[GDrive Sync] Anti-regresion: local (${localRichness}) vs remote (${remoteRichness}). ` +
      'Aplicando remote completo.'
    );
    localStorage.setItem(BACKUP_KEY, localRaw);
    applyRemoteData(remoteData);
    setSyncState({
      fileVersion: remoteMeta.version,
      lastSyncAt: new Date().toISOString(),
    });
    return;
  }

  // Backup local
  localStorage.setItem(BACKUP_KEY, localRaw);

  // CAPA 2: Merge inteligente
  const { merged, conflicts } = mergeData(localData, remoteData);

  // CAPA 3: Guardar conflictos
  if (conflicts.length > 0) {
    saveConflicts(conflicts);
  }

  // Aplicar merged localmente
  applyRemoteData(merged);

  // Subir merged a Drive para convergencia
  try {
    const result = await updateFile(accessToken, fileId, merged);
    setSyncState({
      fileVersion: result.version,
      lastSyncAt: new Date().toISOString(),
    });
    console.log('[GDrive Sync] pullAndMerge completado exitosamente');
  } catch (err) {
    // Si falla de nuevo (otra colision, extremadamente raro)
    // Fallback: leer estado fresco de Drive y aplicarlo
    console.error('[GDrive Sync] Doble colision, releyendo Drive como fallback:', err.message);
    try {
      const freshRemote = await readFile(accessToken, fileId);
      const freshMeta = await getFileMetadata(accessToken, fileId);
      applyRemoteData(freshRemote);
      setSyncState({
        fileVersion: freshMeta.version,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (innerErr) {
      console.error('[GDrive Sync] Fallback tambien fallo:', innerErr.message);
      // Limpiar fileId por si el archivo fue borrado/recreado
      setSyncState({ fileId: null, fileVersion: null, lastSyncAt: new Date().toISOString() });
    }
  }
}

// ───────────────────────────────────────────────
// Sync publico
// ───────────────────────────────────────────────

/**
 * Fuerza sincronizacion completa (pull + push).
 */
export async function syncNow(token) {
  if (_syncing) return;
  _syncing = true;

  try {
    const accessToken = token || await _authModule.getTokenSilent();
    if (!accessToken) {
      markTokenExpired();
      return;
    }

    await pull(accessToken);
    markHealthy();
    notifySyncStatus('synced');
    _lastSyncAt = Date.now();
  } catch (err) {
    console.error('[GDrive Sync] Error en syncNow:', err);
    if (err.status === 401) {
      markTokenExpired();
    } else {
      markError();
    }
  } finally {
    _syncing = false;
  }
}

// ───────────────────────────────────────────────
// Push con debounce (tras cambios locales)
// ───────────────────────────────────────────────

function debouncedPush() {
  if (_debounceTimer) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(async () => {
    if (_syncing) return;

    // Cooldown para no hacer push muy seguido
    if (Date.now() - _lastSyncAt < GDRIVE_CONFIG.SYNC_COOLDOWN_MS) return;

    _syncing = true;
    try {
      const accessToken = await _authModule.getTokenSilent();
      if (!accessToken) {
        markTokenExpired();
        return;
      }

      await push(accessToken);
      _lastSyncAt = Date.now();
      markHealthy();
      notifySyncStatus('synced');
    } catch (err) {
      console.warn('[GDrive Sync] Error en push:', err.message);
      if (err.status === 401) {
        markTokenExpired();
      } else {
        markError();
      }
    } finally {
      _syncing = false;
    }
  }, GDRIVE_CONFIG.DEBOUNCE_MS);
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

/**
 * Aplica datos del cloud al localStorage local.
 * Usa flag _applyingRemote para evitar que el evento data-saved
 * dispare un push de vuelta (ciclo infinito).
 */
function applyRemoteData(data) {
  _applyingRemote = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Notificar a app.js que hay datos nuevos del cloud
  window.dispatchEvent(new CustomEvent('data-synced-from-cloud', {
    detail: { data }
  }));

  // Desactivar flag tras un tick para cubrir listeners sincronos
  setTimeout(() => { _applyingRemote = false; }, 0);
}

function notifySyncStatus(status) {
  window.dispatchEvent(new CustomEvent('gdrive-sync-status', {
    detail: { status, syncHealth: _syncHealth, timestamp: Date.now() }
  }));
}
