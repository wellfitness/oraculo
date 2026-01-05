/**
 * Oráculo Cloud - Monitor de Conexión
 *
 * Detecta estado online/offline y gestiona sincronización pendiente.
 */

const SYNC_STATUS_KEY = 'oraculo_sync_status';

/**
 * Estado del monitor de conexión
 */
export const connectionState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSync: false,
  listeners: []
};

/**
 * Inicializa el monitor de conexión
 * @param {function} onReconnect - Callback cuando se reconecta
 */
export const initConnectionMonitor = (onReconnect) => {
  // Verificar estado inicial de sync pendiente
  connectionState.pendingSync = localStorage.getItem(SYNC_STATUS_KEY) === 'pending';

  // Escuchar eventos de conexión
  window.addEventListener('online', () => {
    console.log('[Connection] Conexión restaurada');
    connectionState.isOnline = true;
    notifyListeners('online');

    // Si hay sync pendiente, ejecutar callback
    if (connectionState.pendingSync && onReconnect) {
      console.log('[Connection] Ejecutando sync pendiente...');
      onReconnect();
    }
  });

  window.addEventListener('offline', () => {
    console.log('[Connection] Sin conexión');
    connectionState.isOnline = false;
    notifyListeners('offline');
  });

  console.log('[Connection] Monitor inicializado. Estado:', connectionState.isOnline ? 'online' : 'offline');
};

/**
 * Marca que hay datos pendientes de sincronizar
 */
export const markPendingSync = () => {
  connectionState.pendingSync = true;
  localStorage.setItem(SYNC_STATUS_KEY, 'pending');
  notifyListeners('pending');
  console.log('[Connection] Sync pendiente marcado');
};

/**
 * Limpia el estado de sync pendiente
 */
export const clearPendingSync = () => {
  connectionState.pendingSync = false;
  localStorage.removeItem(SYNC_STATUS_KEY);
  notifyListeners('synced');
  console.log('[Connection] Sync completado');
};

/**
 * Verifica si hay sync pendiente
 * @returns {boolean}
 */
export const hasPendingSync = () => {
  return connectionState.pendingSync || localStorage.getItem(SYNC_STATUS_KEY) === 'pending';
};

/**
 * Verifica si está online
 * @returns {boolean}
 */
export const isOnline = () => {
  return connectionState.isOnline && navigator.onLine;
};

/**
 * Suscribirse a cambios de estado de conexión
 * @param {function} callback - Función a llamar con el nuevo estado
 * @returns {function} Función para cancelar suscripción
 */
export const subscribeToConnectionChanges = (callback) => {
  connectionState.listeners.push(callback);
  return () => {
    const index = connectionState.listeners.indexOf(callback);
    if (index > -1) {
      connectionState.listeners.splice(index, 1);
    }
  };
};

/**
 * Notifica a todos los listeners del cambio de estado
 * @param {string} status - 'online', 'offline', 'pending', 'synced'
 */
const notifyListeners = (status) => {
  connectionState.listeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('[Connection] Error en listener:', error);
    }
  });
};

/**
 * Obtiene el estado actual para mostrar en UI
 * @returns {'online'|'offline'|'syncing'|'pending'}
 */
export const getConnectionStatus = () => {
  if (!connectionState.isOnline) return 'offline';
  if (connectionState.pendingSync) return 'pending';
  return 'online';
};
