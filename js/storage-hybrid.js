/**
 * Oráculo Cloud - Sistema de Almacenamiento Híbrido
 *
 * Combina localStorage (offline-first) con Supabase (sincronización cloud).
 * - Sin login: funciona igual que storage.js original (solo localStorage)
 * - Con login: localStorage + sync automático con Supabase
 *
 * API compatible con storage.js original - los módulos no necesitan cambios.
 */

import { validateDataStructure } from './utils/validator.js';
import { isAuthenticated, getCurrentUser } from './supabase/client.js';
import { loadFromSupabase, saveToSupabaseDebounced, resolveConflict, syncNow } from './supabase/sync.js';
import { initConnectionMonitor, isOnline, hasPendingSync } from './supabase/connection.js';

const STORAGE_KEY = 'oraculo_data';
const STORAGE_VERSION = '1.5';
const MAX_ACTIVE_PROJECTS = 4;

// Flag para evitar sync loops
let isInitialLoad = true;

// Estructura inicial de datos (igual que storage.js original)
const getDefaultData = () => ({
  version: STORAGE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // Brújula de valores
  values: [],

  // Objetivos por horizonte temporal (Listas Duales Burkeman)
  objectives: {
    backlog: [],
    quarterly: [],
    monthly: [],
    weekly: [],
    daily: []
  },

  // Laboratorio de hábitos
  habits: {
    active: null,
    graduated: [],
    history: [],
    audit: {
      activities: [],
      lastAuditAt: null
    }
  },

  // Calendario
  calendar: {
    events: [],
    recurring: []
  },

  // Diario
  journal: [],

  // Proyectos
  projects: [],

  // Configuración
  settings: {
    storageType: 'hybrid', // Cambiado de 'localStorage' a 'hybrid'
    notificationsEnabled: false,
    theme: 'light',
    usageMode: 'complete' // 'complete' | 'habits' | 'journal' | 'complement'
  },

  // Onboarding (primera vez)
  onboarding: {
    completed: false,
    completedAt: null,
    selectedMode: null
  },

  // Cuaderno actual
  notebook: {
    year: new Date().getFullYear(),
    startedAt: new Date().toISOString(),
    name: `Cuaderno ${new Date().getFullYear()}`
  },

  // Metadatos de cuadernos archivados
  archivedNotebooks: [],

  // Sistema Burkeman (v1.3)
  dailySetup: {
    date: null,
    availableTime: null,
    energyLevel: null,
    dailyLimit: 3,
    rocaPrincipal: null,
    setupAt: null,
    potentialObstacle: null,
    contingencyPlan: null
  },

  spontaneousAchievements: [],
  atelicActivities: [],

  burkemanSettings: {
    showReflexiones: true,
    menuModeDefault: false,
    dailySetupEnabled: true,
    atelicReminder: true,
    askValueOnPriority: true
  },

  // Rueda de la Vida (v1.4)
  lifeWheel: {
    areas: [
      { id: 'health', name: 'Salud física', icon: 'fitness_center', order: 0, linkedValueId: null },
      { id: 'emotional', name: 'Estado emocional', icon: 'psychology', order: 1, linkedValueId: null },
      { id: 'growth', name: 'Desarrollo personal', icon: 'school', order: 2, linkedValueId: null },
      { id: 'family', name: 'Familia/Pareja', icon: 'favorite', order: 3, linkedValueId: null },
      { id: 'social', name: 'Relaciones sociales', icon: 'groups', order: 4, linkedValueId: null },
      { id: 'career', name: 'Profesión', icon: 'work', order: 5, linkedValueId: null },
      { id: 'finances', name: 'Finanzas', icon: 'savings', order: 6, linkedValueId: null },
      { id: 'leisure', name: 'Ocio/Tiempo libre', icon: 'spa', order: 7, linkedValueId: null }
    ],
    evaluations: [],
    settings: {
      reminderEnabled: true,
      lastReminderDismissed: null
    }
  },

  // Sistema de evaluación de objetivos
  objectiveEvaluation: {
    criteria: [
      { id: 'relevance', name: 'Relevancia para mis valores', weight: 1.5, icon: 'explore' },
      { id: 'intrinsic', name: 'Valor intrínseco (disfrute)', weight: 1.2, icon: 'mood' },
      { id: 'utility', name: 'Utilidad práctica', weight: 1.0, icon: 'construction' },
      { id: 'opportunity', name: 'Coste de oportunidad', weight: 1.3, icon: 'compare_arrows' },
      { id: 'timeEffect', name: 'Tiempo hasta ver efectos', weight: 1.0, icon: 'schedule' },
      { id: 'capability', name: 'Capacidad actual', weight: 1.1, icon: 'psychology_alt' },
      { id: 'support', name: 'Soporte social disponible', weight: 0.9, icon: 'handshake' },
      { id: 'timeAvailable', name: 'Tiempo disponible', weight: 1.2, icon: 'hourglass_empty' },
      { id: 'resources', name: 'Recursos necesarios', weight: 1.0, icon: 'inventory_2' },
      { id: 'strength', name: 'Fortaleza/Motivación', weight: 1.2, icon: 'bolt' }
    ],
    evaluations: [],
    thresholds: {
      proceed: 75,
      review: 50
    }
  }
});

// ============================================================
// FUNCIONES DE LOCALSTORAGE (Base, siempre disponible)
// ============================================================

/**
 * Carga datos desde localStorage
 */
const loadFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('[Storage] Error cargando de localStorage:', error);
    return null;
  }
};

/**
 * Guarda datos en localStorage
 */
const saveToLocalStorage = (data) => {
  try {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[Storage] Error guardando en localStorage:', error);
    if (error.name === 'QuotaExceededError') {
      showStorageWarning();
    }
    return false;
  }
};

// ============================================================
// FUNCIONES HÍBRIDAS (localStorage + Supabase)
// ============================================================

/**
 * Carga los datos - Híbrido: localStorage primero, luego sync con Supabase
 * Esta función es SÍNCRONA para mantener compatibilidad con el código existente.
 * La sincronización con Supabase se hace en background.
 */
export const loadData = () => {
  // 1. Siempre cargar primero de localStorage (rápido, disponible offline)
  let localData = loadFromLocalStorage();

  if (!localData) {
    // Primera vez - crear datos por defecto
    localData = getDefaultData();
    saveToLocalStorage(localData);
  } else if (localData.version !== STORAGE_VERSION) {
    // Migrar si es versión antigua
    localData = migrateData(localData);
  }

  // 2. Iniciar sync con Supabase en background (si está autenticado)
  if (isInitialLoad) {
    isInitialLoad = false;
    syncWithSupabaseInBackground(localData);
  }

  return localData;
};

/**
 * Sincroniza con Supabase en background (no bloquea la carga inicial)
 */
const syncWithSupabaseInBackground = async (localData) => {
  try {
    // Verificar si hay autenticación
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.log('[Storage] Sin autenticación - usando solo localStorage');
      return;
    }

    // Inicializar monitor de conexión con callback de reconexión
    initConnectionMonitor(async () => {
      // Al reconectar, sincronizar datos pendientes
      const currentData = loadFromLocalStorage();
      if (currentData) {
        await syncNow(currentData);
      }
    });

    if (!isOnline()) {
      console.log('[Storage] Sin conexión - datos pendientes de sync');
      return;
    }

    // Cargar datos de Supabase
    const { data: remoteData, updatedAt: remoteUpdatedAt } = await loadFromSupabase();

    if (remoteData) {
      // Resolver conflictos (last-write-wins)
      const resolved = resolveConflict(localData, remoteData, remoteUpdatedAt);

      if (resolved.source === 'remote') {
        // Datos remotos son más recientes - actualizar localStorage
        console.log('[Storage] Usando datos de Supabase (más recientes)');
        saveToLocalStorage(resolved.data);

        // Notificar a la app que los datos cambiaron
        window.dispatchEvent(new CustomEvent('data-synced-from-cloud', {
          detail: { data: resolved.data }
        }));
      } else {
        // Datos locales son más recientes - subir a Supabase
        console.log('[Storage] Subiendo datos locales a Supabase');
        saveToSupabaseDebounced(localData);
      }
    } else {
      // No hay datos remotos - primera sincronización, subir datos locales
      console.log('[Storage] Primera sync - subiendo datos a Supabase');
      saveToSupabaseDebounced(localData);
    }
  } catch (error) {
    console.error('[Storage] Error en sync background:', error);
  }
};

/**
 * Guarda los datos - localStorage inmediato + Supabase en background
 */
export const saveData = (data) => {
  // 1. Guardar en localStorage (siempre, inmediato)
  const localSaved = saveToLocalStorage(data);

  if (!localSaved) {
    return false;
  }

  // 2. Sincronizar con Supabase en background (si está autenticado)
  syncToCloudIfAuthenticated(data);

  return true;
};

/**
 * Sincroniza con Supabase si hay autenticación
 */
const syncToCloudIfAuthenticated = async (data) => {
  try {
    const authenticated = await isAuthenticated();
    if (authenticated && isOnline()) {
      saveToSupabaseDebounced(data);
    }
  } catch (error) {
    // Silenciar errores de sync - localStorage ya tiene los datos
    console.warn('[Storage] Error en sync a cloud:', error);
  }
};

/**
 * Actualiza una sección específica de los datos
 */
export const updateSection = (section, newData) => {
  const data = loadData();

  if (section.includes('.')) {
    const parts = section.split('.');
    let target = data;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = newData;
  } else {
    data[section] = newData;
  }

  return saveData(data);
};

/**
 * Fuerza una sincronización inmediata con Supabase
 */
export const forceSyncNow = async () => {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    console.log('[Storage] No autenticado - no se puede sincronizar');
    return false;
  }

  if (!isOnline()) {
    console.log('[Storage] Sin conexión - no se puede sincronizar');
    return false;
  }

  const data = loadFromLocalStorage();
  if (data) {
    return await syncNow(data);
  }
  return false;
};

/**
 * Obtiene el estado de sincronización
 */
export const getSyncStatus = async () => {
  const authenticated = await isAuthenticated();
  const user = authenticated ? await getCurrentUser() : null;

  return {
    isAuthenticated: authenticated,
    userEmail: user?.email || null,
    isOnline: isOnline(),
    hasPendingSync: hasPendingSync(),
    storageType: authenticated ? 'cloud' : 'local'
  };
};

// ============================================================
// FUNCIONES ORIGINALES DE STORAGE.JS (sin cambios)
// ============================================================

/**
 * Exporta todos los datos como JSON
 */
export const exportData = () => {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `oraculo-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Importa datos desde un archivo JSON
 */
export const importData = (file) => {
  return new Promise((resolve, reject) => {
    console.log('[Storage] Iniciando importación de:', file.name);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        console.log('[Storage] Archivo leído, parseando JSON...');
        const importedData = JSON.parse(e.target.result);

        const validation = validateDataStructure(importedData);
        if (!validation.valid) {
          throw new Error('Archivo no válido: ' + validation.error);
        }

        // Backup antes de importar
        const currentData = loadData();
        localStorage.setItem(STORAGE_KEY + '_backup', JSON.stringify(currentData));

        // Importar
        const saved = saveData(importedData);

        if (saved) {
          // Sincronizar con Supabase si está autenticado
          const authenticated = await isAuthenticated();
          if (authenticated) {
            await syncNow(importedData);
          }

          resolve(importedData);
        } else {
          throw new Error('No se pudieron guardar los datos');
        }
      } catch (error) {
        console.error('[Storage] Error en importación:', error);
        reject(new Error('Error al importar: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
};

/**
 * Calcula el espacio usado en localStorage
 */
export const getStorageUsage = () => {
  const data = localStorage.getItem(STORAGE_KEY) || '';
  const usedBytes = new Blob([data]).size;
  const maxBytes = 5 * 1024 * 1024;

  return {
    used: usedBytes,
    max: maxBytes,
    percentage: Math.round((usedBytes / maxBytes) * 100),
    usedMB: (usedBytes / 1024 / 1024).toFixed(2),
    maxMB: (maxBytes / 1024 / 1024).toFixed(0)
  };
};

const showStorageWarning = () => {
  const usage = getStorageUsage();
  console.warn(`Almacenamiento casi lleno: ${usage.percentage}% usado`);
  window.dispatchEvent(new CustomEvent('storage-warning', { detail: usage }));
};

/**
 * Migra datos de versiones anteriores
 */
const migrateData = (oldData) => {
  const newData = getDefaultData();

  // Copiar datos existentes
  if (oldData.values) newData.values = oldData.values;
  if (oldData.objectives) newData.objectives = { ...newData.objectives, ...oldData.objectives };
  if (oldData.habits) newData.habits = { ...newData.habits, ...oldData.habits };
  if (oldData.calendar) newData.calendar = { ...newData.calendar, ...oldData.calendar };
  if (oldData.journal) newData.journal = oldData.journal;
  if (oldData.projects) newData.projects = oldData.projects;
  if (oldData.settings) newData.settings = { ...newData.settings, ...oldData.settings };
  if (oldData.notebook) newData.notebook = oldData.notebook;
  if (oldData.archivedNotebooks) newData.archivedNotebooks = oldData.archivedNotebooks;

  // Migraciones Burkeman
  if (oldData.dailySetup) newData.dailySetup = { ...newData.dailySetup, ...oldData.dailySetup };
  if (oldData.spontaneousAchievements) newData.spontaneousAchievements = oldData.spontaneousAchievements;
  if (oldData.atelicActivities) newData.atelicActivities = oldData.atelicActivities;
  if (oldData.burkemanSettings) newData.burkemanSettings = { ...newData.burkemanSettings, ...oldData.burkemanSettings };

  // Migrar tareas diarias
  if (newData.objectives.daily) {
    newData.objectives.daily = newData.objectives.daily.map(task => ({
      ...task,
      isRocaPrincipal: task.isRocaPrincipal || false,
      taskType: task.taskType || null,
      valueId: task.valueId || null
    }));
  }

  // Migrar eventos
  if (newData.calendar.events) {
    newData.calendar.events = newData.calendar.events.map(event => ({
      ...event,
      isSincronia: event.isSincronia || false
    }));
  }

  // Migraciones Rueda de la Vida
  if (oldData.lifeWheel) {
    newData.lifeWheel = {
      ...newData.lifeWheel,
      areas: oldData.lifeWheel.areas || newData.lifeWheel.areas,
      evaluations: oldData.lifeWheel.evaluations || [],
      settings: { ...newData.lifeWheel.settings, ...oldData.lifeWheel.settings }
    };
  }

  if (oldData.objectiveEvaluation) {
    newData.objectiveEvaluation = {
      ...newData.objectiveEvaluation,
      criteria: oldData.objectiveEvaluation.criteria || newData.objectiveEvaluation.criteria,
      evaluations: oldData.objectiveEvaluation.evaluations || [],
      thresholds: { ...newData.objectiveEvaluation.thresholds, ...oldData.objectiveEvaluation.thresholds }
    };
  }

  // Migraciones Auditoría de Hábitos
  if (!newData.habits.audit) {
    newData.habits.audit = { activities: [], lastAuditAt: null };
  }
  if (oldData.habits?.audit) {
    newData.habits.audit = { ...newData.habits.audit, ...oldData.habits.audit };
  }

  // Migraciones Onboarding y usageMode
  if (oldData.onboarding) {
    newData.onboarding = { ...newData.onboarding, ...oldData.onboarding };
  }
  if (oldData.settings?.usageMode) {
    newData.settings.usageMode = oldData.settings.usageMode;
  }

  saveData(newData);
  console.log('[Storage] Datos migrados a versión', STORAGE_VERSION);

  return newData;
};

/**
 * Limpia todos los datos (con confirmación)
 */
export const clearAllData = async () => {
  if (confirm('¿Estás segura de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.removeItem(STORAGE_KEY);

    // También limpiar en Supabase si está autenticado
    const authenticated = await isAuthenticated();
    if (authenticated) {
      // TODO: Implementar borrado en Supabase si se desea
      console.log('[Storage] Datos borrados. Nota: Los datos en Supabase se mantienen como backup.');
    }

    return true;
  }
  return false;
};

export const clearIdentityData = () => {
  if (confirm('¿Borrar valores, hábitos y rueda de la vida?\n\nLas tareas, proyectos y diario se mantienen.')) {
    const data = loadData();
    data.values = [];
    data.habits = {
      active: null,
      graduated: [],
      history: [],
      audit: { activities: [], lastAuditAt: null }
    };
    if (data.lifeWheel) data.lifeWheel = null;
    saveData(data);
    return true;
  }
  return false;
};

export const clearProductivityData = () => {
  if (confirm('¿Borrar tareas, proyectos y logros?\n\nValores, hábitos y diario se mantienen.')) {
    const data = loadData();
    data.objectives = { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [] };
    data.projects = [];
    data.spontaneousAchievements = [];
    data.dailySetup = null;
    saveData(data);
    return true;
  }
  return false;
};

export const clearJournalData = () => {
  if (confirm('¿Borrar todas las entradas del diario?\n\nTodo lo demás se mantiene.')) {
    const data = loadData();
    data.journal = [];
    saveData(data);
    return true;
  }
  return false;
};

export const generateYearSummary = (data) => {
  const countCompleted = (items) => items.filter(i => i.completed).length;

  return {
    totalTasksCompleted:
      countCompleted(data.objectives.quarterly || []) +
      countCompleted(data.objectives.monthly || []) +
      countCompleted(data.objectives.weekly || []) +
      countCompleted(data.objectives.daily || []),
    habitsGraduated: (data.habits.graduated || []).length,
    habitDaysLogged: (data.habits.history || []).length,
    projectsCompleted: (data.projects || []).filter(p => p.status === 'completed').length,
    journalEntries: (data.journal || []).length,
    valuesCount: (data.values || []).length
  };
};

export const archiveCurrentYear = () => {
  const data = loadData();
  const year = data.notebook?.year || new Date().getFullYear();

  const archiveData = {
    ...data,
    notebook: {
      ...data.notebook,
      archivedAt: new Date().toISOString()
    },
    summary: generateYearSummary(data)
  };

  const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oraculo-${year}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const archivedNotebooks = data.archivedNotebooks || [];
  archivedNotebooks.push({
    year,
    name: data.notebook?.name || `Cuaderno ${year}`,
    archivedAt: new Date().toISOString(),
    filename: `oraculo-${year}.json`,
    summary: archiveData.summary
  });

  return { archiveData, archivedNotebooks };
};

export const startNewYear = (archivedNotebooks = []) => {
  const data = loadData();
  const newYear = new Date().getFullYear();

  const newData = {
    ...getDefaultData(),
    values: data.values || [],
    settings: data.settings || getDefaultData().settings,
    archivedNotebooks: archivedNotebooks,
    habits: {
      active: null,
      graduated: data.habits?.graduated || [],
      history: [],
      audit: { activities: [], lastAuditAt: null }
    },
    projects: (data.projects || []).map(p => {
      if (p.status === 'completed') {
        return { ...p, status: 'archived' };
      }
      return p;
    }),
    notebook: {
      year: newYear,
      startedAt: new Date().toISOString(),
      name: `Cuaderno ${newYear}`
    }
  };

  saveData(newData);
  return newData;
};

export const loadArchivedYear = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const archivedData = JSON.parse(e.target.result);

        if (!archivedData.version || !archivedData.notebook) {
          throw new Error('Este archivo no es un cuaderno de Oráculo válido');
        }

        resolve(archivedData);
      } catch (error) {
        reject(new Error('Error al leer el archivo: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
};

// Exportar constantes
export { MAX_ACTIVE_PROJECTS };
