/**
 * Oráculo - Auto-Backup con File System Access API
 * Permite guardar backups automáticos en una carpeta local del usuario
 *
 * Compatibilidad:
 * - Chrome 86+ / Edge 86+: Soporte completo
 * - Firefox / Safari / iOS: Fallback a descarga clásica
 */

// Constantes
const DB_NAME = 'oraculo-backup-db';
const STORE_NAME = 'handles';
const DEBOUNCE_MS = 30000; // 30 segundos

// Estado interno del módulo
let directoryHandle = null;
let debounceTimer = null;
let lastBackupTime = null;
let getDataCallback = null;

// ========================================
// Verificación de soporte
// ========================================

/**
 * Verifica si el navegador soporta File System Access API
 */
export const isSupported = () => 'showDirectoryPicker' in window;

// ========================================
// IndexedDB para persistir el handle
// ========================================

/**
 * Abre la base de datos IndexedDB
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Guarda el handle de la carpeta en IndexedDB
 */
const saveHandleToIndexedDB = async (handle) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put({ key: 'directory', handle });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    return true;
  } catch (error) {
    console.error('[AutoBackup] Error guardando handle:', error);
    return false;
  }
};

/**
 * Carga el handle de la carpeta desde IndexedDB
 */
const loadHandleFromIndexedDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const result = await new Promise((resolve, reject) => {
      const request = store.get('directory');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return result?.handle || null;
  } catch (error) {
    console.error('[AutoBackup] Error cargando handle:', error);
    return null;
  }
};

/**
 * Elimina el handle guardado en IndexedDB
 */
const clearHandleFromIndexedDB = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete('directory');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    return true;
  } catch (error) {
    console.error('[AutoBackup] Error limpiando handle:', error);
    return false;
  }
};

// ========================================
// Gestión de permisos
// ========================================

/**
 * Verifica si tenemos permiso de escritura en la carpeta
 */
const verifyPermission = async (handle) => {
  if (!handle) return false;

  try {
    // Verificar permiso actual
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') return true;

    // Solicitar permiso si es necesario
    const requested = await handle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  } catch (error) {
    console.error('[AutoBackup] Error verificando permiso:', error);
    return false;
  }
};

// ========================================
// Funciones principales
// ========================================

/**
 * Vincula una carpeta para backups
 * Abre el selector de carpetas y guarda el handle
 */
export const linkFolder = async () => {
  if (!isSupported()) {
    throw new Error('Tu navegador no soporta esta función. Usa Chrome o Edge.');
  }

  try {
    directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    // Guardar handle para futuras sesiones
    await saveHandleToIndexedDB(directoryHandle);

    console.log('[AutoBackup] Carpeta vinculada:', directoryHandle.name);
    return directoryHandle.name;
  } catch (error) {
    if (error.name === 'AbortError') {
      // Usuario canceló el diálogo
      return null;
    }
    throw error;
  }
};

/**
 * Desvincula la carpeta actual
 */
export const unlinkFolder = async () => {
  directoryHandle = null;
  lastBackupTime = null;
  await clearHandleFromIndexedDB();
  console.log('[AutoBackup] Carpeta desvinculada');
};

/**
 * Guarda un backup en la carpeta vinculada
 */
export const saveBackup = async (data) => {
  // Si no hay carpeta vinculada, intentar fallback
  if (!directoryHandle) {
    return { success: false, error: 'NO_FOLDER' };
  }

  // Verificar permiso
  const hasPermission = await verifyPermission(directoryHandle);
  if (!hasPermission) {
    return { success: false, error: 'NO_PERMISSION' };
  }

  try {
    // Generar nombre de archivo con fecha
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `oraculo-backup-${dateStr}.json`;

    // Crear o sobrescribir archivo
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();

    // Preparar datos con metadatos
    const backupData = {
      ...data,
      _backup: {
        createdAt: now.toISOString(),
        filename: filename,
        folder: directoryHandle.name
      }
    };

    await writable.write(JSON.stringify(backupData, null, 2));
    await writable.close();

    lastBackupTime = now;

    console.log('[AutoBackup] Backup guardado:', filename);
    return {
      success: true,
      filename,
      folder: directoryHandle.name,
      time: now
    };
  } catch (error) {
    console.error('[AutoBackup] Error guardando backup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fallback: descarga clásica para navegadores sin soporte
 */
export const downloadBackup = (data) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `oraculo-backup-${dateStr}.json`;

  const backupData = {
    ...data,
    _backup: {
      createdAt: now.toISOString(),
      filename: filename,
      method: 'download'
    }
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
  lastBackupTime = now;

  console.log('[AutoBackup] Descarga iniciada:', filename);
  return { success: true, filename, method: 'download', time: now };
};

/**
 * Guarda backup inteligente: usa File System API si está disponible, sino descarga
 */
export const smartSave = async (data) => {
  if (directoryHandle) {
    return await saveBackup(data);
  } else if (isSupported()) {
    // Primera vez: vincular carpeta
    const folderName = await linkFolder();
    if (folderName) {
      return await saveBackup(data);
    }
    return { success: false, error: 'CANCELLED' };
  } else {
    // Fallback a descarga
    return downloadBackup(data);
  }
};

// ========================================
// Auto-guardado con debounce
// ========================================

/**
 * Programa un auto-guardado con debounce
 */
export const scheduleAutoSave = () => {
  if (!directoryHandle || !getDataCallback) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    const data = getDataCallback();
    const result = await saveBackup(data);

    if (result.success) {
      // Emitir evento para que la UI pueda reaccionar
      window.dispatchEvent(new CustomEvent('backup-saved', {
        detail: result
      }));
    }
  }, DEBOUNCE_MS);
};

/**
 * Cancela cualquier auto-guardado pendiente
 */
export const cancelScheduledSave = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};

// ========================================
// Inicialización
// ========================================

/**
 * Inicializa el módulo de auto-backup
 * @param {Function} getData - Función que retorna los datos actuales de la app
 * @returns {Promise<boolean>} - true si hay una carpeta vinculada
 */
export const init = async (getData) => {
  getDataCallback = getData;

  if (!isSupported()) {
    console.log('[AutoBackup] File System Access API no soportada');
    return false;
  }

  // Intentar recuperar handle guardado
  const savedHandle = await loadHandleFromIndexedDB();

  if (savedHandle) {
    // Verificar que el permiso aún es válido
    try {
      const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        directoryHandle = savedHandle;
        console.log('[AutoBackup] Carpeta restaurada:', directoryHandle.name);
        return true;
      } else {
        // El permiso expiró, guardar handle pero indicar que necesita re-autorización
        directoryHandle = savedHandle;
        console.log('[AutoBackup] Carpeta restaurada (requiere re-autorización):', directoryHandle.name);
        return true;
      }
    } catch (error) {
      console.warn('[AutoBackup] Handle guardado inválido, limpiando...');
      await clearHandleFromIndexedDB();
      return false;
    }
  }

  return false;
};

// ========================================
// Getters
// ========================================

/**
 * Verifica si hay una carpeta vinculada
 */
export const hasLinkedFolder = () => !!directoryHandle;

/**
 * Obtiene el nombre de la carpeta vinculada
 */
export const getFolderName = () => {
  const name = directoryHandle?.name;
  // Validar que sea un nombre válido (no vacío, no caracteres de escape)
  if (!name || name === '\\' || name === '/' || name.trim() === '') {
    return directoryHandle ? 'Carpeta vinculada' : null;
  }
  return name;
};

/**
 * Obtiene la última hora de backup
 */
export const getLastBackupTime = () => lastBackupTime;

/**
 * Verifica si el permiso actual es válido (sin solicitar)
 */
export const checkPermission = async () => {
  if (!directoryHandle) return false;

  try {
    const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
};

/**
 * Solicita re-autorización para la carpeta vinculada
 */
export const requestReauthorization = async () => {
  if (!directoryHandle) return false;

  try {
    const permission = await directoryHandle.requestPermission({ mode: 'readwrite' });
    return permission === 'granted';
  } catch {
    return false;
  }
};

// ========================================
// Utilidades de tiempo
// ========================================

/**
 * Formatea el tiempo transcurrido desde el último backup
 */
export const getTimeSinceLastBackup = () => {
  if (!lastBackupTime) return null;

  const now = new Date();
  const diffMs = now - lastBackupTime;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'hace unos segundos';
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
};
