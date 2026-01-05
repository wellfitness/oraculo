/**
 * Oráculo Cloud - Lógica de Sincronización
 *
 * Maneja la sincronización entre localStorage y Supabase.
 * Estrategia: Last-Write-Wins con timestamps.
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
 * Guarda datos en Supabase
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
    console.log('[Sync] Datos guardados en Supabase');

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
 * Verifica si los datos son "vacíos" (recién creados, sin contenido real)
 * @param {object} data - Datos a verificar
 * @returns {boolean}
 */
const isEmptyData = (data) => {
  if (!data) return true;

  const hasValues = data.values && data.values.length > 0;
  const hasJournal = data.journal && data.journal.length > 0;
  const hasProjects = data.projects && data.projects.length > 0;
  const hasObjectives = data.objectives && (
    (data.objectives.backlog && data.objectives.backlog.length > 0) ||
    (data.objectives.quarterly && data.objectives.quarterly.length > 0) ||
    (data.objectives.monthly && data.objectives.monthly.length > 0) ||
    (data.objectives.weekly && data.objectives.weekly.length > 0) ||
    (data.objectives.daily && data.objectives.daily.length > 0)
  );

  return !hasValues && !hasJournal && !hasProjects && !hasObjectives;
};

/**
 * Resuelve conflictos entre datos locales y remotos
 * Estrategia:
 * 1. Si datos locales están vacíos y remotos tienen contenido → usar remotos
 * 2. Si no, Last-Write-Wins (el más reciente gana)
 *
 * @param {object} localData - Datos de localStorage
 * @param {object} remoteData - Datos de Supabase
 * @param {string} remoteUpdatedAt - Timestamp de última actualización remota
 * @returns {{source: 'local'|'remote', data: object}}
 */
export const resolveConflict = (localData, remoteData, remoteUpdatedAt) => {
  const localTime = new Date(localData?.updatedAt || 0).getTime();
  const remoteTime = new Date(remoteUpdatedAt || 0).getTime();

  console.log('[Sync] Resolviendo conflicto:', {
    localTime: new Date(localTime).toISOString(),
    remoteTime: new Date(remoteTime).toISOString(),
    localEmpty: isEmptyData(localData),
    remoteEmpty: isEmptyData(remoteData)
  });

  // Caso especial: datos locales vacíos pero remotos tienen contenido
  // Esto ocurre típicamente en el primer login en un dispositivo nuevo
  if (isEmptyData(localData) && !isEmptyData(remoteData)) {
    console.log('[Sync] Datos locales vacíos, usando datos remotos (primera sincronización)');
    return { source: 'remote', data: remoteData };
  }

  // Caso normal: Last-Write-Wins
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
