/**
 * Oráculo Cloud - Lógica de Sincronización
 *
 * Maneja la sincronización entre localStorage y Supabase.
 * Estrategia: Last-Write-Wins + protección contra pérdida de datos.
 *
 * PROTECCIONES (v2.0):
 * 1. Comparación de "riqueza" de datos — datos más pobres NUNCA sobreescriben datos más ricos
 * 2. Backup automático en localStorage antes de sobreescribir con datos remotos
 * 3. Logs detallados de cada decisión de sync para debugging
 */

import { getSupabase, isAuthenticated, getCurrentUser } from './client.js';
import { markPendingSync, clearPendingSync, isOnline } from './connection.js';

// Estado de sincronización
const syncState = {
  inProgress: false,
  lastSyncAt: null,
  debounceTimer: null
};

// Constante para debounce (2 segundos)
const SYNC_DEBOUNCE_MS = 2000;

// Clave para backup pre-sync en localStorage
const SYNC_BACKUP_KEY = 'oraculo_pre_sync_backup';

/**
 * Carga datos desde Supabase
 * @returns {Promise<{data: object|null, updatedAt: string|null}>}
 */
export const loadFromSupabase = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, updatedAt: null };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { data: null, updatedAt: null };
  }

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // PGRST116 = no rows found (usuario nuevo)
      if (error.code === 'PGRST116') {
        console.log('[Sync] No hay datos en Supabase (usuario nuevo)');
        return { data: null, updatedAt: null };
      }
      throw error;
    }

    console.log('[Sync] Datos cargados desde Supabase');
    return {
      data: data.data,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('[Sync] Error cargando desde Supabase:', error);
    throw error;
  }
};

/**
 * Guarda datos en Supabase (con protección contra regresión)
 * @param {object} data - Datos a guardar
 * @returns {Promise<boolean>}
 */
export const saveToSupabase = async (data) => {
  if (syncState.inProgress) {
    console.log('[Sync] Sync ya en progreso, ignorando...');
    return false;
  }

  const supabase = getSupabase();
  if (!supabase) {
    markPendingSync();
    return false;
  }

  if (!isOnline()) {
    markPendingSync();
    return false;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.log('[Sync] No hay usuario autenticado');
    return false;
  }

  syncState.inProgress = true;

  try {
    // PROTECCIÓN: Leer datos actuales de Supabase antes de sobreescribir
    const { data: currentRemote, error: readError } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .single();

    if (!readError && currentRemote?.data) {
      const remoteRichness = calculateDataRichness(currentRemote.data);
      const localRichness = calculateDataRichness(data);

      // Si los datos que vamos a subir son significativamente más pobres, BLOQUEAR
      if (remoteRichness > 0 && localRichness < remoteRichness * 0.5) {
        console.warn('[Sync] BLOQUEADO: Los datos locales son mucho más pobres que Supabase', {
          localRichness,
          remoteRichness,
          ratio: (localRichness / remoteRichness).toFixed(2)
        });

        // Guardar backup de lo que hay en Supabase por si acaso
        savePreSyncBackup(currentRemote.data, 'blocked-overwrite');
        return false;
      }

      // Guardar backup de datos remotos antes de sobreescribir
      if (remoteRichness > 0) {
        savePreSyncBackup(currentRemote.data, 'pre-overwrite');
      }
    }

    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: user.id,
        data: data,
        version: data.version || '1.5',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }

    syncState.lastSyncAt = new Date().toISOString();
    clearPendingSync();
    console.log('[Sync] Datos guardados en Supabase (riqueza:', calculateDataRichness(data), ')');

    // Emitir evento de sync completado
    window.dispatchEvent(new CustomEvent('supabase-synced', {
      detail: { timestamp: syncState.lastSyncAt }
    }));

    return true;
  } catch (error) {
    console.error('[Sync] Error guardando en Supabase:', error);
    markPendingSync();
    return false;
  } finally {
    syncState.inProgress = false;
  }
};

/**
 * Guarda en Supabase con debounce (evita múltiples llamadas seguidas)
 * @param {object} data - Datos a guardar
 */
export const saveToSupabaseDebounced = (data) => {
  // Cancelar timer anterior si existe
  if (syncState.debounceTimer) {
    clearTimeout(syncState.debounceTimer);
  }

  // Programar nuevo sync
  syncState.debounceTimer = setTimeout(async () => {
    await saveToSupabase(data);
  }, SYNC_DEBOUNCE_MS);
};

/**
 * Calcula una puntuación de "riqueza" de los datos.
 * Cuenta el total de items en todas las secciones.
 * Se usa para detectar si unos datos son significativamente más pobres que otros.
 *
 * @param {object} data - Datos a evaluar
 * @returns {number} Puntuación de riqueza (0 = vacío)
 */
const calculateDataRichness = (data) => {
  if (!data) return 0;

  let score = 0;

  // Valores (peso alto - es contenido creado por el usuario)
  score += (data.values?.length || 0) * 2;

  // Objetivos
  if (data.objectives) {
    score += (data.objectives.backlog?.length || 0);
    score += (data.objectives.quarterly?.length || 0) * 2;
    score += (data.objectives.monthly?.length || 0) * 2;
    score += (data.objectives.weekly?.length || 0) * 2;
    score += (data.objectives.daily?.length || 0);
  }

  // Proyectos (peso alto)
  score += (data.projects?.length || 0) * 3;

  // Journal (peso alto - contenido personal)
  score += (data.journal?.length || 0) * 3;

  // Hábitos
  if (data.habits) {
    score += data.habits.active ? 5 : 0;
    score += (data.habits.graduated?.length || 0) * 3;
    score += (data.habits.history?.length || 0);
    if (data.habits.audit?.activities?.length > 0) score += 2;
  }

  // Calendario
  if (data.calendar) {
    score += (data.calendar.events?.length || 0) * 2;
    score += (data.calendar.recurring?.length || 0) * 2;
  }

  // Logros espontáneos
  score += (data.spontaneousAchievements?.length || 0) * 2;

  // Actividades atélicas
  score += (data.atelicActivities?.length || 0);

  // Rueda de la vida
  if (data.lifeWheel?.evaluations?.length > 0) {
    score += data.lifeWheel.evaluations.length * 2;
  }

  return score;
};

/**
 * Verifica si los datos son "vacíos" (recién creados, sin contenido real)
 * @param {object} data - Datos a verificar
 * @returns {boolean}
 */
const isEmptyData = (data) => {
  return calculateDataRichness(data) === 0;
};

/**
 * Guarda un backup pre-sync en localStorage
 * Útil para recuperar datos si la sync salió mal
 * @param {object} data - Datos a respaldar
 * @param {string} reason - Razón del backup
 */
const savePreSyncBackup = (data, reason) => {
  try {
    const backup = {
      data,
      reason,
      savedAt: new Date().toISOString(),
      richness: calculateDataRichness(data)
    };
    localStorage.setItem(SYNC_BACKUP_KEY, JSON.stringify(backup));
    console.log(`[Sync] Backup pre-sync guardado (razón: ${reason}, riqueza: ${backup.richness})`);
  } catch (error) {
    console.warn('[Sync] No se pudo guardar backup pre-sync:', error);
  }
};

/**
 * Resuelve conflictos entre datos locales y remotos
 *
 * Estrategia (v2.0 - protección contra pérdida de datos):
 * 1. Si datos locales están vacíos y remotos tienen contenido → usar remotos
 * 2. Si datos remotos son significativamente más ricos que locales → usar remotos
 *    (protección contra sobreescritura accidental por localStorage con datos stale)
 * 3. Si ambos tienen datos similares → Last-Write-Wins (el más reciente gana)
 *
 * @param {object} localData - Datos de localStorage
 * @param {object} remoteData - Datos de Supabase
 * @param {string} remoteUpdatedAt - Timestamp de última actualización remota
 * @returns {{source: 'local'|'remote', data: object}}
 */
export const resolveConflict = (localData, remoteData, remoteUpdatedAt) => {
  const localTime = new Date(localData?.updatedAt || 0).getTime();
  const remoteTime = new Date(remoteUpdatedAt || 0).getTime();
  const localRichness = calculateDataRichness(localData);
  const remoteRichness = calculateDataRichness(remoteData);

  console.log('[Sync] Resolviendo conflicto:', {
    localTime: new Date(localTime).toISOString(),
    remoteTime: new Date(remoteTime).toISOString(),
    localRichness,
    remoteRichness,
    localEmpty: isEmptyData(localData),
    remoteEmpty: isEmptyData(remoteData)
  });

  // Caso 1: datos locales vacíos pero remotos tienen contenido
  if (isEmptyData(localData) && !isEmptyData(remoteData)) {
    console.log('[Sync] Datos locales vacíos, usando datos remotos (primera sincronización)');
    return { source: 'remote', data: remoteData };
  }

  // Caso 2: PROTECCIÓN ANTI-REGRESIÓN
  // Si los datos remotos son significativamente más ricos que los locales,
  // preferir remotos sin importar timestamps.
  // Esto previene que localStorage con datos stale/parciales sobreescriba Supabase.
  if (remoteRichness > 0 && localRichness < remoteRichness * 0.5) {
    console.warn('[Sync] PROTECCIÓN: Datos remotos mucho más ricos que locales', {
      localRichness,
      remoteRichness,
      ratio: (localRichness / remoteRichness).toFixed(2)
    });

    // Guardar backup de datos locales por si el usuario realmente los quiere
    savePreSyncBackup(localData, 'local-overridden-by-richer-remote');

    return { source: 'remote', data: remoteData };
  }

  // Caso 3: Last-Write-Wins (ambos tienen datos comparables)
  if (remoteTime > localTime) {
    console.log('[Sync] Usando datos remotos (más recientes)');
    return { source: 'remote', data: remoteData };
  }

  console.log('[Sync] Usando datos locales (más recientes o iguales)');
  return { source: 'local', data: localData };
};

/**
 * Sincroniza forzadamente (sin debounce)
 * Útil para sincronización manual o al reconectar
 * @param {object} data - Datos a sincronizar
 * @returns {Promise<boolean>}
 */
export const syncNow = async (data) => {
  // Cancelar debounce pendiente
  if (syncState.debounceTimer) {
    clearTimeout(syncState.debounceTimer);
    syncState.debounceTimer = null;
  }

  return await saveToSupabase(data);
};

/**
 * Obtiene el estado de la sincronización
 * @returns {{inProgress: boolean, lastSyncAt: string|null, hasPending: boolean}}
 */
export const getSyncStatus = () => {
  return {
    inProgress: syncState.inProgress,
    lastSyncAt: syncState.lastSyncAt,
    hasPending: localStorage.getItem('oraculo_sync_status') === 'pending'
  };
};

/**
 * Verifica si es posible sincronizar (online + autenticado)
 * @returns {Promise<boolean>}
 */
export const canSync = async () => {
  return isOnline() && await isAuthenticated();
};

/**
 * Recupera el backup pre-sync guardado (si existe)
 * @returns {object|null} Datos del backup o null
 */
export const getPreSyncBackup = () => {
  try {
    const raw = localStorage.getItem(SYNC_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Exportar para uso en debugging desde consola
export { calculateDataRichness };
