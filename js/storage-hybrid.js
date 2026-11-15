/**
 * Oráculo - Sistema de Almacenamiento Local
 *
 * Solo localStorage, sin Supabase. Misma API que storage-hybrid.js.
 * Usado por la extensión Chrome y como fallback de la web.
 */

import { validateDataStructure, sanearIdentificadores, descartarElementosInvalidos, normalizarHorizontes, normalizarContadores } from './utils/validator.js';
import { normalizarNumeros } from './utils/numeros.js';

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
    daily: [],
    completed: []
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

// Incidencia de la última carga. La app la consulta una vez y la descarta.
let loadIssue = null;

/**
 * Incidencia de la última carga y su caducidad.
 *
 * 'corrupt'   → no se ha podido leer lo que había.
 * 'repaired'  → se ha leído, pero había elementos sueltos y se han quitado.
 */
export const LOAD_ISSUE_CORRUPT = 'corrupt';
export const LOAD_ISSUE_REPAIRED = 'repaired';

// Si ya se ha avisado de que el almacenamiento está lleno, no se avisa otra
// vez: el aviso saldría en cada guardado y llenaría la pantalla de avisos.
let quotaWarningShown = false;

const loadFromLocalStorage = () => {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('[Storage] Error cargando de localStorage:', error);
    // Conserva lo que había para que la usuaria no lo pierda del todo
    if (stored) {
      try {
        localStorage.setItem('oraculo_data_corrupt', stored);
      } catch { /* noop */ }
      loadIssue = LOAD_ISSUE_CORRUPT;
    }
    return null;
  }
};

/**
 * Devuelve la incidencia de la última carga y la borra, para que el aviso
 * salga una sola vez.
 *
 * @returns {'corrupt'|null} Incidencia pendiente.
 */
export const consumeLoadIssue = () => {
  const issue = loadIssue;
  loadIssue = null;
  return issue;
};

const saveToLocalStorage = (data) => {
  try {
    // Los datos se dejan en forma antes de escribirlos: así lo que queda en
    // el almacenamiento es lo mismo que ve la app, y no un dato sucio que
    // vuelve a salir en la siguiente carga.
    if (isPlainObject(data)) {
      ensureDataShape(data);
    }

    data.updatedAt = new Date().toISOString();

    // Prune tombstones viejos (>30 dias) para evitar crecimiento indefinido
    if (data._deletions?.length > 0) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      data._deletions = data._deletions.filter(
        d => new Date(d.deletedAt).getTime() > cutoff
      );
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    quotaWarningShown = false;

    // Notificar al sync layer (Google Drive) que hubo cambio
    window.dispatchEvent(new CustomEvent('data-saved'));

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

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const fillFromDefaults = (target, defaults) => {
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const cur = target[key];
    if (Array.isArray(def)) {
      if (!Array.isArray(cur)) target[key] = def;
    } else if (isPlainObject(def)) {
      if (!isPlainObject(cur)) target[key] = def;
      else fillFromDefaults(cur, def);
    } else if (cur === undefined) {
      target[key] = def;
    }
  }
  return target;
};

/**
 * Deja los datos con la forma que espera la app.
 *
 * Rellena las secciones que falten, descarta de las listas del modelo los
 * elementos que no son objetos y normaliza el horizonte de origen de las
 * tareas. Los datos llegan por la importación y por la sincronización con
 * Drive, que escribe directamente en `localStorage`, así que la limpieza se
 * hace aquí y no solo en el importador.
 *
 * @param {Object} data - Datos a dejar en forma.
 * @returns {Object} Los mismos datos, ya en forma.
 */
export const ensureDataShape = (data) => {
  fillFromDefaults(data, getDefaultData());
  descartarElementosInvalidos(data);
  normalizarHorizontes(data);
  normalizarContadores(data);
  normalizarNumeros(data);
  return data;
};

export const loadData = () => {
  let localData = loadFromLocalStorage();

  if (!localData) {
    localData = getDefaultData();
    saveToLocalStorage(localData);
  } else if (localData.version !== STORAGE_VERSION) {
    localData = migrateData(localData);
  }

  // Se cuentan antes de limpiar para poder avisar de que la carga ha tenido
  // que quitar algo: si no, el aviso sale en silencio y la usuaria no sabe
  // por qué falta un dato.
  const descartados = descartarElementosInvalidos(localData);

  ensureDataShape(localData);
  // Los identificadores se normalizan al cargar, no solo al importar: los
  // datos también llegan por la sincronización con Drive, que escribe
  // directamente en localStorage.
  sanearIdentificadores(localData);
  cleanupLegacyGcalSettings(localData);

  if (descartados > 0 && !loadIssue) {
    loadIssue = LOAD_ISSUE_REPAIRED;
  }

  return localData;
};

/**
 * Limpia `data.settings.gcal` legacy. En un primer intento de esta feature
 * guardamos la config de Google Calendar dentro de `oraculo_data.settings.gcal`,
 * pero eso hacía que Drive sync pisara la config en cada pull. La config
 * ahora vive en su propia key de localStorage (`oraculo_gcal_settings`) vía
 * gcal-local-store.js. Esta limpieza:
 *   1) migra la config legacy al nuevo storage si existía y estaba enabled,
 *   2) borra la copia del objeto sincronizado,
 *   3) marca data modificada para que la próxima save propague la eliminación.
 */
const cleanupLegacyGcalSettings = (data) => {
  if (!data?.settings || !('gcal' in data.settings)) return;

  const legacy = data.settings.gcal;
  try {
    const LOCAL_KEY = 'oraculo_gcal_settings';
    const existingLocal = localStorage.getItem(LOCAL_KEY);
    if (legacy && legacy.enabled && !existingLocal) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(legacy));
    }
  } catch { /* noop */ }

  delete data.settings.gcal;
  saveToLocalStorage(data);
};

export const saveData = (data) => {
  return saveToLocalStorage(data);
};

/**
 * Decide si la memoria de la app debe volcar a localStorage al cerrar.
 *
 * Si otra pestaña (o la sincronización con Drive) ha guardado algo más
 * reciente, volcar la memoria dejaría los datos más nuevos fuera. Las
 * fechas `updatedAt` se comparan como texto porque las fechas ISO se
 * ordenan igual como texto que como fecha. Una fecha ausente cuenta como
 * cadena vacía.
 *
 * @param {Object} memoryData - Datos que la app tiene en memoria.
 * @param {string|null} storedRaw - Texto exacto que hay en localStorage.
 * @returns {boolean} true si es seguro guardar.
 */
export const shouldPersistOnUnload = (memoryData, storedRaw) => {
  if (storedRaw === null || storedRaw === undefined) return false;

  let stored;
  try {
    stored = JSON.parse(storedRaw);
  } catch {
    return false;
  }

  const storedAt = typeof stored?.updatedAt === 'string' ? stored.updatedAt : '';
  const memoryAt = typeof memoryData?.updatedAt === 'string' ? memoryData.updatedAt : '';

  return !(storedAt > memoryAt);
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
  const exists = data._deletions.some(d => d.section === section && d.itemId === itemId);
  if (!exists) {
    data._deletions.push({
      section,
      itemId,
      deletedAt: new Date().toISOString()
    });
  }
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

/**
 * Convierte el texto de un backup en datos de Oráculo.
 * Lanza un Error con un mensaje para la usuaria si el texto no es un
 * backup válido.
 *
 * @param {string} text - Texto del archivo.
 * @returns {Object} Datos validados, sin transformar.
 */
export const parseImportText = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('No es un archivo JSON válido.');
  }

  const validation = validateDataStructure(parsed);
  if (!validation.valid) {
    throw new Error('Archivo no válido: ' + validation.error);
  }

  return parsed;
};

/**
 * Lee un archivo de backup y devuelve sus datos validados.
 *
 * @param {File} file - Archivo elegido por la usuaria.
 * @returns {Promise<Object>} Datos validados.
 */
export const parseImportFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        resolve(parseImportText(e.target.result));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsText(file);
  });
};

/**
 * Cuenta lo que contiene un backup, para poder contarlo antes de
 * reemplazar los datos.
 *
 * @param {Object} data - Datos de un backup.
 * @returns {{ tasks: number, journalEntries: number }} Resumen.
 */
export const summarizeBackup = (data) => {
  const objectives = data?.objectives || {};
  const count = (key) => (Array.isArray(objectives[key]) ? objectives[key].length : 0);

  return {
    tasks: count('backlog') + count('quarterly') + count('monthly') + count('weekly') + count('daily'),
    journalEntries: Array.isArray(data?.journal) ? data.journal.length : 0
  };
};

/**
 * Guarda los datos importados. Antes deja una copia de lo que había.
 *
 * @param {Object} data - Datos validados.
 * @returns {boolean} true si se han guardado.
 */
export const applyImportedData = (data) => {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current !== null) {
    // La copia de seguridad es una cortesía: si el almacenamiento está lleno
    // y no cabe, la importación sigue adelante con los datos nuevos.
    try {
      localStorage.setItem(STORAGE_KEY + '_backup', current);
    } catch (error) {
      console.warn('[Storage] No se ha podido guardar la copia de seguridad:', error);
    }
  }

  return saveData(data);
};

export const importData = async (file) => {
  const data = await parseImportFile(file);
  if (!applyImportedData(data)) throw new Error('No se pudieron guardar los datos');
  return data;
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
  if (quotaWarningShown) return;
  quotaWarningShown = true;

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
  localStorage.removeItem(STORAGE_KEY);
};

export const clearIdentityData = () => {
  const data = loadData();
  data.values = [];
  data.habits = {
    active: null,
    graduated: [],
    history: [],
    audit: { activities: [], lastAuditAt: null }
  };
  // La rueda de la vida vuelve a su estado de fábrica: los ocho áreas son
  // las de la app, pero se borran las evaluaciones de la usuaria. Ponerla a
  // null no servía, porque al rellenar la forma por defecto volvía a salir
  // igual, y el dato guardado no decía la verdad.
  data.lifeWheel = getDefaultData().lifeWheel;
  saveData(data);
};

export const clearProductivityData = () => {
  const data = loadData();
  data.objectives = { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [], completed: [] };
  data.projects = [];
  data.spontaneousAchievements = [];
  data.dailySetup = null;
  saveData(data);
};

export const clearJournalData = () => {
  const data = loadData();
  data.journal = [];
  saveData(data);
};

export const generateYearSummary = (data) => {
  const countCompleted = (items) => items.filter(i => i.completed).length;

  return {
    totalTasksCompleted:
      countCompleted(data.objectives.quarterly || []) +
      countCompleted(data.objectives.monthly || []) +
      countCompleted(data.objectives.weekly || []) +
      countCompleted(data.objectives.daily || []) +
      // Las tareas completadas se mueven a objectives.completed
      (data.objectives.completed || []).length,
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

/**
 * Año del cuaderno nuevo. Es el mayor entre "año del cuaderno + 1" y el
 * año en curso, para que archivar dos veces no retroceda el cuaderno.
 * Un año que no sea entero cuenta como ausente.
 *
 * @param {Object} data - Datos actuales.
 * @param {Date} now - Fecha de referencia.
 * @returns {number} Año del cuaderno nuevo.
 */
export const getNextNotebookYear = (data, now = new Date()) => {
  const currentYear = now.getFullYear();
  const notebookYear = Number.isInteger(data?.notebook?.year) ? data.notebook.year : currentYear;
  return Math.max(notebookYear + 1, currentYear);
};

export const startNewYear = (archivedNotebooks = []) => {
  const data = loadData();
  const newYear = getNextNotebookYear(data);

  const newData = {
    ...getDefaultData(),
    values: data.values || [],
    settings: data.settings || getDefaultData().settings,
    burkemanSettings: data.burkemanSettings || getDefaultData().burkemanSettings,
    onboarding: data.onboarding || getDefaultData().onboarding,
    lifeWheel: data.lifeWheel || getDefaultData().lifeWheel,
    objectiveEvaluation: data.objectiveEvaluation || getDefaultData().objectiveEvaluation,
    muevete: data.muevete || getDefaultData().muevete,
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

/**
 * Indica si un archivo es un cuaderno de Oráculo archivado.
 *
 * @param {*} data - Contenido del archivo ya leído.
 * @returns {boolean} true si es un cuaderno archivado.
 */
export const esCuadernoArchivado = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!data.version || !data.notebook) return false;
  if (typeof data.notebook !== 'object' || Array.isArray(data.notebook)) return false;
  return true;
};

export const loadArchivedYear = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const archivedData = JSON.parse(e.target.result);

        if (!esCuadernoArchivado(archivedData)) {
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
