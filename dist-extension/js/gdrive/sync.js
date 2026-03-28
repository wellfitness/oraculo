/**
 * Google Drive Sync - Motor de sincronizacion
 *
 * Orquesta la sincronizacion entre localStorage y Google Drive.
 * localStorage es SIEMPRE el almacenamiento primario.
 * Drive es una capa de sync que funciona cuando hay conexion.
 */

import { GDRIVE_CONFIG } from './config.js';
import { findFile, readFile, createFile, updateFile, verifyToken } from './drive-api.js';

const STORAGE_KEY = 'oraculo_data';
const SYNC_STATE_KEY = 'oraculo_gdrive_sync';

let _authModule = null;
let _platform = null;
let _debounceTimer = null;
let _syncing = false;
let _lastSyncAt = 0;

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
  return getSyncState();
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
  } else {
    // Web y Capacitor usan el mismo flujo GIS
    _authModule = await import('./auth-web.js');
  }

  // Si estaba conectado, intentar sync silencioso al iniciar
  if (isConnected()) {
    try {
      const token = await _authModule.getTokenSilent();
      if (token) {
        await pull(token);
        notifySyncStatus('synced');
      } else {
        notifySyncStatus('token_expired');
      }
    } catch (err) {
      console.warn('[GDrive Sync] Error en sync inicial:', err.message);
      notifySyncStatus('error');
    }
  }

  // Escuchar cambios locales para push automatico
  window.addEventListener('data-saved', () => {
    if (isConnected()) {
      debouncedPush();
    }
  });

  console.log(`[GDrive Sync] Inicializado (${platform})`);
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

  notifySyncStatus('connected');
  return result;
}

/**
 * Desconecta Google Drive y limpia estado.
 */
export async function disconnect() {
  if (_authModule) {
    try {
      await _authModule.signOut();
    } catch {
      // Ignorar errores al revocar
    }
  }

  // Limpiar estado pero mantener datos locales intactos
  localStorage.removeItem(SYNC_STATE_KEY);
  notifySyncStatus('disconnected');
}

// ───────────────────────────────────────────────
// Pull: Drive → localStorage
// ───────────────────────────────────────────────

async function pull(accessToken) {
  const syncState = getSyncState();
  const fileId = syncState.fileId;

  // Buscar archivo en Drive
  let file;
  if (fileId) {
    try {
      file = { id: fileId };
    } catch {
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

  // Cachear fileId
  if (file.id !== syncState.fileId) {
    setSyncState({ fileId: file.id });
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
    // No hay datos locales → usar remotos
    console.log('[GDrive Sync] Sin datos locales, aplicando remotos');
    applyRemoteData(remoteData);
    return;
  }

  const localTime = new Date(localData.updatedAt).getTime();
  const remoteTime = new Date(remoteData.updatedAt).getTime();

  if (remoteTime > localTime) {
    // Remoto es mas nuevo
    console.log('[GDrive Sync] Datos remotos mas recientes, aplicando...');

    // Backup local antes de sobrescribir
    localStorage.setItem('oraculo_data_pre_sync_backup', localRaw);

    applyRemoteData(remoteData);
  } else if (localTime > remoteTime) {
    // Local es mas nuevo → push
    console.log('[GDrive Sync] Datos locales mas recientes, subiendo...');
    await push(accessToken);
  } else {
    console.log('[GDrive Sync] Datos sincronizados');
  }

  setSyncState({ lastSyncAt: new Date().toISOString() });
}

// ───────────────────────────────────────────────
// Push: localStorage → Drive
// ───────────────────────────────────────────────

async function push(accessToken) {
  const localRaw = localStorage.getItem(STORAGE_KEY);
  if (!localRaw) return;

  const localData = JSON.parse(localRaw);
  const syncState = getSyncState();

  let fileId = syncState.fileId;

  if (fileId) {
    // Actualizar archivo existente
    const result = await updateFile(accessToken, fileId, localData);
    setSyncState({ fileId: result.id, lastSyncAt: new Date().toISOString() });
  } else {
    // Buscar si existe
    const existing = await findFile(accessToken);
    if (existing) {
      const result = await updateFile(accessToken, existing.id, localData);
      setSyncState({ fileId: result.id, lastSyncAt: new Date().toISOString() });
    } else {
      // Crear por primera vez
      const result = await createFile(accessToken, localData);
      setSyncState({ fileId: result.id, lastSyncAt: new Date().toISOString() });
    }
  }

  console.log('[GDrive Sync] Push completado');
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
      notifySyncStatus('token_expired');
      return;
    }

    await pull(accessToken);
    notifySyncStatus('synced');
    _lastSyncAt = Date.now();
  } catch (err) {
    console.error('[GDrive Sync] Error en syncNow:', err);
    notifySyncStatus('error');
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
      if (!accessToken) return;

      await push(accessToken);
      _lastSyncAt = Date.now();
      setSyncState({ lastSyncAt: new Date().toISOString() });
      notifySyncStatus('synced');
    } catch (err) {
      console.warn('[GDrive Sync] Error en push:', err.message);
    } finally {
      _syncing = false;
    }
  }, GDRIVE_CONFIG.DEBOUNCE_MS);
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function applyRemoteData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Notificar a app.js que hay datos nuevos del cloud
  window.dispatchEvent(new CustomEvent('data-synced-from-cloud', {
    detail: { data }
  }));
}

function notifySyncStatus(status) {
  window.dispatchEvent(new CustomEvent('gdrive-sync-status', {
    detail: { status, timestamp: Date.now() }
  }));
}
