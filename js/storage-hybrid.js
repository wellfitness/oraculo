/**
 * Oráculo - Sistema de Almacenamiento Local
 *
 * Solo localStorage, sin Supabase. Misma API que storage-hybrid.js.
 * Usado por la extensión Chrome y como fallback de la web.
 */

import { validateDataStructure } from './utils/validator.js';

const STORAGE_KEY = 'oraculo_data';
const STORAGE_VERSION = '1.5';
const MAX_ACTIVE_PROJECTS = 4;

// Estructura inicial de datos
const getDefaultData = () => ({
  version: STORAGE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  values: [],

  objectives: {
    backlog: [],
    quarterly: [],
    monthly: [],
    weekly: [],
    daily: []
  },

  habits: {
    active: null,
    graduated: [],
    history: [],
    audit: {
      activities: [],
      lastAuditAt: null
    }
  },

  calendar: {
    events: [],
    recurring: []
  },

  journal: [],
  projects: [],

  settings: {
    storageType: 'localStorage',
    notificationsEnabled: false,
    theme: 'light',
    usageMode: 'complete',
    lastWeeklyReview: null,
    weeklyReviewDay: 0,
    weeklyReviewReminder: true
  },

  onboarding: {
    completed: false,
    completedAt: null,
    selectedMode: null
  },

  notebook: {
    year: new Date().getFullYear(),
    startedAt: new Date().toISOString(),
    name: `Cuaderno ${new Date().getFullYear()}`
  },

  archivedNotebooks: [],

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
  },

  // Muévete - Breaks de movimiento
  muevete: {
    timerState: {
      status: 'idle',
      startTime: null,
      breakStartTime: null,
      blocksCompleted: 0,
      lastResetDate: null,
      soleusEnabled: true,
      workBlockDuration: 7200000,
      breakDuration: 480000,
      soleusInterval: 1800000,
      soundEnabled: true
    },
    activityLog: {
      entries: [],
      currentStreak: 0,
      bestStreak: 0
    }
  }
});

// ============================================================
// FUNCIONES DE LOCALSTORAGE
// ============================================================

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
// API PÚBLICA (compatible con storage-hybrid.js)
// ============================================================

export const loadData = () => {
  let localData = loadFromLocalStorage();

  if (!localData) {
    localData = getDefaultData();
    saveToLocalStorage(localData);
  } else if (localData.version !== STORAGE_VERSION) {
    localData = migrateData(localData);
  }

  return localData;
};

export const saveData = (data) => {
  return saveToLocalStorage(data);
};

/**
 * Marca una seccion como modificada en _sectionMeta.
 * Llamar antes de saveData() en modulos que mutan datos directamente.
 */
export const stampSection = (data, section) => {
  if (!data._sectionMeta) data._sectionMeta = {};
  data._sectionMeta[section] = { updatedAt: new Date().toISOString() };
};

/**
 * Registra un tombstone de eliminacion para sync cross-device.
 * Llamar ANTES de hacer filter/splice para borrar un item.
 */
export const recordDeletion = (data, section, itemId) => {
  if (!data._deletions) data._deletions = [];
  data._deletions.push({
    section,
    itemId,
    deletedAt: new Date().toISOString()
  });
};

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

  // Registrar que seccion fue modificada (para merge inteligente)
  stampSection(data, section);

  return saveData(data);
};

// Stubs para compatibilidad con storage-hybrid.js
export const forceSyncNow = async () => false;

export const getSyncStatus = async () => ({
  isAuthenticated: false,
  userEmail: null,
  isOnline: navigator.onLine,
  hasPendingSync: false,
  storageType: 'local'
});

// ============================================================
// FUNCIONES DE DATOS
// ============================================================

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

export const importData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        const validation = validateDataStructure(importedData);
        if (!validation.valid) {
          throw new Error('Archivo no válido: ' + validation.error);
        }

        // Backup antes de importar
        const currentData = loadData();
        localStorage.setItem(STORAGE_KEY + '_backup', JSON.stringify(currentData));

        const saved = saveData(importedData);
        if (saved) {
          resolve(importedData);
        } else {
          throw new Error('No se pudieron guardar los datos');
        }
      } catch (error) {
        reject(new Error('Error al importar: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
};

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

// ============================================================
// MIGRACIÓN
// ============================================================

const migrateData = (oldData) => {
  const newData = getDefaultData();

  if (oldData.values) newData.values = oldData.values;
  if (oldData.objectives) newData.objectives = { ...newData.objectives, ...oldData.objectives };
  if (oldData.habits) newData.habits = { ...newData.habits, ...oldData.habits };
  if (oldData.calendar) newData.calendar = { ...newData.calendar, ...oldData.calendar };
  if (oldData.journal) newData.journal = oldData.journal;
  if (oldData.projects) newData.projects = oldData.projects;
  if (oldData.settings) newData.settings = { ...newData.settings, ...oldData.settings };
  if (oldData.notebook) newData.notebook = oldData.notebook;
  if (oldData.archivedNotebooks) newData.archivedNotebooks = oldData.archivedNotebooks;

  if (oldData.dailySetup) newData.dailySetup = { ...newData.dailySetup, ...oldData.dailySetup };
  if (oldData.spontaneousAchievements) newData.spontaneousAchievements = oldData.spontaneousAchievements;
  if (oldData.atelicActivities) newData.atelicActivities = oldData.atelicActivities;
  if (oldData.burkemanSettings) newData.burkemanSettings = { ...newData.burkemanSettings, ...oldData.burkemanSettings };

  if (newData.objectives.daily) {
    newData.objectives.daily = newData.objectives.daily.map(task => ({
      ...task,
      isRocaPrincipal: task.isRocaPrincipal || false,
      taskType: task.taskType || null,
      valueId: task.valueId || null
    }));
  }

  if (newData.calendar.events) {
    newData.calendar.events = newData.calendar.events.map(event => ({
      ...event,
      isSincronia: event.isSincronia || false
    }));
  }

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

  if (!newData.habits.audit) {
    newData.habits.audit = { activities: [], lastAuditAt: null };
  }
  if (oldData.habits?.audit) {
    newData.habits.audit = { ...newData.habits.audit, ...oldData.habits.audit };
  }

  if (oldData.onboarding) {
    newData.onboarding = { ...newData.onboarding, ...oldData.onboarding };
  }
  if (oldData.settings?.usageMode) {
    newData.settings.usageMode = oldData.settings.usageMode;
  }

  if (newData.projects && newData.projects.length > 0) {
    newData.projects = newData.projects.map(project => ({
      ...project,
      nextActionId: project.nextActionId || null
    }));
  }

  if (!newData.settings.lastWeeklyReview) {
    newData.settings.lastWeeklyReview = null;
  }
  if (newData.settings.weeklyReviewDay === undefined) {
    newData.settings.weeklyReviewDay = 0;
  }
  if (newData.settings.weeklyReviewReminder === undefined) {
    newData.settings.weeklyReviewReminder = true;
  }

  // Migración Muévete
  if (oldData.muevete) {
    newData.muevete = {
      ...newData.muevete,
      timerState: { ...newData.muevete.timerState, ...(oldData.muevete.timerState || {}) },
      activityLog: { ...newData.muevete.activityLog, ...(oldData.muevete.activityLog || {}) }
    };
  }

  saveData(newData);
  console.log('[Storage] Datos migrados a versión', STORAGE_VERSION);

  return newData;
};

// ============================================================
// FUNCIONES DE LIMPIEZA
// ============================================================

export const clearAllData = () => {
  if (confirm('¿Estás segura de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.removeItem(STORAGE_KEY);
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

export { MAX_ACTIVE_PROJECTS };
