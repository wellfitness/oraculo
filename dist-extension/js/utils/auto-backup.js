/**
 * Oráculo - Auto-Backup con File System Access API + IndexedDB Safety Net
 *
 * Dos capas de protección:
 * 1. MANUAL: Botón de guardar → File System API (carpeta vinculada) o descarga
 * 2. AUTOMÁTICO: Backup silencioso en IndexedDB cada 2 días (rolling, últimos 5)
 *
 * IndexedDB es independiente de localStorage — sobrevive a limpiezas de caché.
 *
 * Compatibilidad File System API:
 * - Chrome 86+ / Edge 86+: Soporte completo
 * - Firefox / Safari / iOS: Fallback a descarga clásica
 */

// Constantes
const DB_NAME = 'oraculo-backup-db';
const DB_VERSION = 2; // Incrementado para añadir store de backups
const STORE_HANDLES = 'handles';
const STORE_BACKUPS = 'backups';
const DEBOUNCE_MS = 30000; // 30 segundos
const AUTO_BACKUP_INTERVAL_DAYS = 2;
const MAX_ROLLING_BACKUPS = 5;
const LAST_AUTO_BACKUP_KEY = 'oraculo_lastAutoBackupAt';

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
// IndexedDB (handles + backups)
// ========================================

/**
 * Abre la base de datos IndexedDB (v2: con store de backups)
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store para handles de carpeta (v1)
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES, { keyPath: 'key' });
      }

      // Store para backups automáticos (v2)
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        const backupStore = db.createObjectStore(STORE_BACKUPS, { keyPath: 'id', autoIncrement: true });
        backupStore.createIndex('savedAt', 'savedAt', { unique: false });
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
    const tx = db.transaction(STORE_HANDLES, 'readwrite');
    const store = tx.objectStore(STORE_HANDLES);

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
    const tx = db.transaction(STORE_HANDLES, 'readonly');
    const store = tx.objectStore(STORE_HANDLES);

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
    const tx = db.transaction(STORE_HANDLES, 'readwrite');
    const store = tx.objectStore(STORE_HANDLES);

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
// Backup automático en IndexedDB (Safety Net)
// ========================================

/**
 * Guarda un backup automático en IndexedDB.
 * Mantiene solo los últimos MAX_ROLLING_BACKUPS.
 * @param {object} data - Datos de la app a respaldar
 * @returns {Promise<boolean>}
 */
export const saveAutoBackupToIndexedDB = async (data) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BACKUPS, 'readwrite');
    const store = tx.objectStore(STORE_BACKUPS);

    // Guardar nuevo backup
    const now = new Date().toISOString();
    await new Promise((resolve, reject) => {
      const request = store.add({
        data: data,
        savedAt: now,
        version: data.version || '1.5'
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Limpiar backups antiguos (mantener solo los últimos N)
    const allKeys = await new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (allKeys.length > MAX_ROLLING_BACKUPS) {
      const keysToDelete = allKeys.slice(0, allKeys.length - MAX_ROLLING_BACKUPS);
      for (const key of keysToDelete) {
        store.delete(key);
      }
    }

    await new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });

    db.close();

    // Registrar timestamp del último backup automático
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, now);

    console.log('[AutoBackup] Backup automático guardado en IndexedDB');
    return true;
  } catch (error) {
    console.error('[AutoBackup] Error guardando backup automático:', error);
    return false;
  }
};

/**
 * Lista todos los backups disponibles en IndexedDB
 * @returns {Promise<Array<{id: number, savedAt: string, version: string}>>}
 */
export const listAutoBackups = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BACKUPS, 'readonly');
    const store = tx.objectStore(STORE_BACKUPS);

    const all = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    // Devolver metadatos sin los datos completos (para listado)
    return all.map(b => ({
      id: b.id,
      savedAt: b.savedAt,
      version: b.version
    })).reverse(); // Más recientes primero
  } catch (error) {
    console.error('[AutoBackup] Error listando backups:', error);
    return [];
  }
};

/**
 * Restaura un backup específico de IndexedDB
 * @param {number} id - ID del backup a restaurar
 * @returns {Promise<object|null>} Datos del backup o null
 */
export const restoreAutoBackup = async (id) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BACKUPS, 'readonly');
    const store = tx.objectStore(STORE_BACKUPS);

    const result = await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return result?.data || null;
  } catch (error) {
    console.error('[AutoBackup] Error restaurando backup:', error);
    return null;
  }
};

/**
 * Verifica si es necesario hacer un backup automático
 * (si han pasado más de AUTO_BACKUP_INTERVAL_DAYS desde el último)
 * @returns {boolean}
 */
export const needsAutoBackup = () => {
  const lastBackup = localStorage.getItem(LAST_AUTO_BACKUP_KEY);
  if (!lastBackup) return true; // Nunca se ha hecho

  const lastDate = new Date(lastBackup);
  const now = new Date();
  const diffMs = now - lastDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= AUTO_BACKUP_INTERVAL_DAYS;
};

/**
 * Ejecuta el backup automático si es necesario.
 * Se llama desde app.js al inicializar.
 * @param {object} data - Datos actuales de la app
 * @returns {Promise<boolean>} true si se hizo backup
 */
export const runAutoBackupIfNeeded = async (data) => {
  if (!needsAutoBackup()) {
    return false;
  }

  console.log('[AutoBackup] Han pasado 2+ días, ejecutando backup automático...');
  const saved = await saveAutoBackupToIndexedDB(data);

  if (saved) {
    console.log('[AutoBackup] Backup automático completado');
  }

  return saved;
};

// ========================================
// Gestión de permisos (File System API)
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
// Funciones principales (File System API)
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
  // Siempre guardar también en IndexedDB (safety net)
  saveAutoBackupToIndexedDB(data);

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
// Auto-guardado con debounce (File System)
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

  // Ejecutar backup automático en IndexedDB si toca (cada 2 días)
  const data = getData();
  if (data) {
    runAutoBackupIfNeeded(data);
  }

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
