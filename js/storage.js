/**
 * Oráculo - Sistema de Almacenamiento
 * Gestiona localStorage con opción de migrar a SQLite
 */

const STORAGE_KEY = 'oraculo_data';
const STORAGE_VERSION = '1.5';
const MAX_ACTIVE_PROJECTS = 4;

// Estructura inicial de datos
const getDefaultData = () => ({
  version: STORAGE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // Brújula de valores
  values: [],

  // Objetivos por horizonte temporal (Listas Duales Burkeman)
  objectives: {
    backlog: [],    // Lista abierta - sin límite (captura de ideas)
    quarterly: [],  // Máx 3 objetivos trimestrales
    monthly: [],    // Hitos mensuales
    weekly: [],     // Tareas de la semana
    daily: []       // En Foco - lista cerrada (máx 3)
  },

  // Laboratorio de hábitos
  habits: {
    active: null,       // Solo 1 hábito activo a la vez
    graduated: [],      // Hábitos consolidados
    history: [],        // Registro de cumplimiento
    // Auditoría de hábitos (v1.5) - Reflexión previa a crear hábito
    audit: {
      activities: [],   // { id, name, evaluation: 'maintain'|'change'|'indifferent', createdAt }
      lastAuditAt: null // Timestamp de última auditoría
    }
  },

  // Calendario
  calendar: {
    events: [],
    recurring: []
  },

  // Diario
  journal: [],

  // Proyectos (máx 4 activos)
  projects: [],

  // Configuración
  settings: {
    storageType: 'localStorage',
    notificationsEnabled: false,
    theme: 'light'
  },

  // Cuaderno actual (sistema de archivos anuales)
  notebook: {
    year: new Date().getFullYear(),
    startedAt: new Date().toISOString(),
    name: `Cuaderno ${new Date().getFullYear()}`
  },

  // Metadatos de cuadernos archivados
  archivedNotebooks: [],

  // ============================================================
  // SISTEMA BURKEMAN (v1.3)
  // ============================================================

  // Setup diario - Volumen Fijo
  // Define tiempo/energía disponible ANTES de elegir tareas
  dailySetup: {
    date: null,                    // YYYY-MM-DD del setup
    availableTime: null,           // '2h' | '4h' | '6h' | 'full'
    energyLevel: null,             // 'low' | 'medium' | 'high'
    dailyLimit: 3,                 // Límite dinámico para tareas diarias
    rocaPrincipal: null,           // ID de la tarea prioritaria del día
    setupAt: null,                 // Timestamp del setup
    // Anticipación de obstáculos (v1.6)
    potentialObstacle: null,       // "¿Qué podría dificultar hoy?"
    contingencyPlan: null          // "Si pasa, haré..."
  },

  // Logros espontáneos - Done List
  // Registro de logros que no estaban planificados
  spontaneousAchievements: [],     // { id, text, createdAt, mood }

  // Actividades atélicas - Descanso sin objetivo
  // Ocio donde está permitido "ser malo"
  atelicActivities: [],            // { id, name, date, duration?, note?, icon }

  // Preferencias del Sistema Burkeman
  burkemanSettings: {
    showReflexiones: true,         // Mostrar reflexiones rotativas
    menuModeDefault: false,        // Kanban en modo menú por defecto
    dailySetupEnabled: true,       // Mostrar modal de setup diario
    atelicReminder: true,          // Recordar tomar descansos atélicos
    askValueOnPriority: true       // Preguntar valor al marcar roca principal
  },

  // ============================================================
  // RUEDA DE LA VIDA (v1.4)
  // ============================================================

  // Sistema de evaluación de áreas de vida
  lifeWheel: {
    // Áreas personalizables (8 por defecto)
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

    // Histórico de evaluaciones trimestrales
    // Cada evaluación: { id, date, quarter, scores: {areaId: {current, desired, reflection: {why, improve, actions}}}, overallReflection, createdAt }
    evaluations: [],

    // Configuración de la rueda
    settings: {
      reminderEnabled: true,           // Recordar evaluación trimestral
      lastReminderDismissed: null      // Fecha último recordatorio ignorado
    }
  },

  // Sistema de evaluación de objetivos (10 criterios ponderados)
  objectiveEvaluation: {
    // Criterios con pesos para calcular puntuación
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

    // Historial de evaluaciones de objetivos
    // { id, objectiveId, objectiveText, date, scores: {criterionId: 1-10}, totalScore, recommendation, notes, createdAt }
    evaluations: [],

    // Umbrales para recomendación
    thresholds: {
      proceed: 75,    // >= 75% = adelante
      review: 50      // >= 50% y < 75% = revisar, < 50% = reconsiderar
    }
  }
});

/**
 * Carga los datos desde localStorage
 */
export const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultData = getDefaultData();
      saveData(defaultData);
      return defaultData;
    }

    const data = JSON.parse(stored);

    // Migración si la versión es diferente
    if (data.version !== STORAGE_VERSION) {
      return migrateData(data);
    }

    return data;
  } catch (error) {
    console.error('Error cargando datos:', error);
    return getDefaultData();
  }
};

/**
 * Guarda los datos en localStorage
 */
export const saveData = (data) => {
  try {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error guardando datos:', error);

    // Verificar si es error de espacio
    if (error.name === 'QuotaExceededError') {
      showStorageWarning();
    }
    return false;
  }
};

/**
 * Actualiza una sección específica de los datos
 */
export const updateSection = (section, newData) => {
  const data = loadData();

  if (section.includes('.')) {
    // Soportar rutas anidadas como 'objectives.daily'
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
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Validar estructura básica
        if (!importedData.version || !importedData.objectives) {
          throw new Error('Archivo no válido');
        }

        // Hacer backup antes de importar
        const currentData = loadData();
        localStorage.setItem(STORAGE_KEY + '_backup', JSON.stringify(currentData));

        // Importar
        saveData(importedData);
        resolve(importedData);
      } catch (error) {
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
  const maxBytes = 5 * 1024 * 1024; // ~5MB límite típico

  return {
    used: usedBytes,
    max: maxBytes,
    percentage: Math.round((usedBytes / maxBytes) * 100),
    usedMB: (usedBytes / 1024 / 1024).toFixed(2),
    maxMB: (maxBytes / 1024 / 1024).toFixed(0)
  };
};

/**
 * Muestra advertencia cuando el almacenamiento está casi lleno
 */
const showStorageWarning = () => {
  const usage = getStorageUsage();
  console.warn(`Almacenamiento casi lleno: ${usage.percentage}% usado`);
  // El UI manejará mostrar esto al usuario
  window.dispatchEvent(new CustomEvent('storage-warning', { detail: usage }));
};

/**
 * Migra datos de versiones anteriores
 */
const migrateData = (oldData) => {
  const newData = getDefaultData();

  // Copiar datos existentes que sean compatibles
  if (oldData.values) newData.values = oldData.values;
  if (oldData.objectives) newData.objectives = { ...newData.objectives, ...oldData.objectives };
  if (oldData.habits) newData.habits = { ...newData.habits, ...oldData.habits };
  if (oldData.calendar) newData.calendar = { ...newData.calendar, ...oldData.calendar };
  if (oldData.journal) newData.journal = oldData.journal;
  if (oldData.projects) newData.projects = oldData.projects;
  if (oldData.settings) newData.settings = { ...newData.settings, ...oldData.settings };

  // Migrar notebook y archivedNotebooks si existen
  if (oldData.notebook) newData.notebook = oldData.notebook;
  if (oldData.archivedNotebooks) newData.archivedNotebooks = oldData.archivedNotebooks;

  // ============================================================
  // Migración v1.2 → v1.3 (Sistema Burkeman)
  // ============================================================

  // Migrar campos Burkeman si existen (en caso de migración parcial)
  if (oldData.dailySetup) newData.dailySetup = { ...newData.dailySetup, ...oldData.dailySetup };
  if (oldData.spontaneousAchievements) newData.spontaneousAchievements = oldData.spontaneousAchievements;
  if (oldData.atelicActivities) newData.atelicActivities = oldData.atelicActivities;
  if (oldData.burkemanSettings) {
    newData.burkemanSettings = { ...newData.burkemanSettings, ...oldData.burkemanSettings };
  }

  // Migrar tareas diarias: añadir campos Burkeman si no existen
  if (newData.objectives.daily) {
    newData.objectives.daily = newData.objectives.daily.map(task => ({
      ...task,
      isRocaPrincipal: task.isRocaPrincipal || false,
      taskType: task.taskType || null,
      valueId: task.valueId || null
    }));
  }

  // Migrar eventos: añadir campo isSincronia si no existe
  if (newData.calendar.events) {
    newData.calendar.events = newData.calendar.events.map(event => ({
      ...event,
      isSincronia: event.isSincronia || false
    }));
  }

  // ============================================================
  // Migración v1.3 → v1.4 (Rueda de la Vida)
  // ============================================================

  // Migrar lifeWheel si existe (en caso de migración parcial)
  if (oldData.lifeWheel) {
    newData.lifeWheel = {
      ...newData.lifeWheel,
      areas: oldData.lifeWheel.areas || newData.lifeWheel.areas,
      evaluations: oldData.lifeWheel.evaluations || [],
      settings: { ...newData.lifeWheel.settings, ...oldData.lifeWheel.settings }
    };
  }

  // Migrar objectiveEvaluation si existe
  if (oldData.objectiveEvaluation) {
    newData.objectiveEvaluation = {
      ...newData.objectiveEvaluation,
      criteria: oldData.objectiveEvaluation.criteria || newData.objectiveEvaluation.criteria,
      evaluations: oldData.objectiveEvaluation.evaluations || [],
      thresholds: { ...newData.objectiveEvaluation.thresholds, ...oldData.objectiveEvaluation.thresholds }
    };
  }

  // ============================================================
  // Migración v1.4 → v1.5 (Auditoría de Hábitos + Wizard mejorado)
  // ============================================================

  // Asegurar que habits.audit existe
  if (!newData.habits.audit) {
    newData.habits.audit = {
      activities: [],
      lastAuditAt: null
    };
  }

  // Migrar audit si existe en datos antiguos
  if (oldData.habits?.audit) {
    newData.habits.audit = {
      ...newData.habits.audit,
      ...oldData.habits.audit
    };
  }

  // Los campos nuevos del hábito (area, scheduledTime, location)
  // son opcionales y se añadirán cuando el usuario cree/edite un hábito

  saveData(newData);
  console.log('Datos migrados a versión', STORAGE_VERSION);

  return newData;
};

/**
 * Limpia todos los datos (con confirmación)
 */
export const clearAllData = () => {
  if (confirm('¿Estás segura de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }
  return false;
};

/**
 * Borrado parcial: Identidad (valores, hábitos, rueda de la vida)
 */
export const clearIdentityData = () => {
  if (confirm('¿Borrar valores, hábitos y rueda de la vida?\n\nLas tareas, proyectos y diario se mantienen.')) {
    const data = getData();
    data.values = [];
    data.habits = {
      active: null,
      graduated: [],
      history: [],
      audit: { activities: [], lastAuditAt: null }
    };
    if (data.lifeWheel) data.lifeWheel = null;
    data.updatedAt = new Date().toISOString();
    saveData(data);
    return true;
  }
  return false;
};

/**
 * Borrado parcial: Productividad (tareas, proyectos, logros)
 */
export const clearProductivityData = () => {
  if (confirm('¿Borrar tareas, proyectos y logros?\n\nValores, hábitos y diario se mantienen.')) {
    const data = getData();
    data.objectives = {
      backlog: [],
      quarterly: [],
      monthly: [],
      weekly: [],
      daily: []
    };
    data.projects = [];
    data.spontaneousAchievements = [];
    data.dailySetup = null;
    data.updatedAt = new Date().toISOString();
    saveData(data);
    return true;
  }
  return false;
};

/**
 * Borrado parcial: Diario
 */
export const clearJournalData = () => {
  if (confirm('¿Borrar todas las entradas del diario?\n\nTodo lo demás se mantiene.')) {
    const data = getData();
    data.journal = [];
    data.updatedAt = new Date().toISOString();
    saveData(data);
    return true;
  }
  return false;
};

/**
 * Genera un resumen automático de los datos para archivado
 */
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

/**
 * Archiva el año actual y prepara para empezar uno nuevo
 * Retorna el archivo JSON para descargar
 */
export const archiveCurrentYear = () => {
  const data = loadData();
  const year = data.notebook?.year || new Date().getFullYear();

  // Crear archivo de archivo con resumen
  const archiveData = {
    ...data,
    notebook: {
      ...data.notebook,
      archivedAt: new Date().toISOString()
    },
    summary: generateYearSummary(data)
  };

  // Generar y descargar archivo
  const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oraculo-${year}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Registrar en archivedNotebooks
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
 * Inicia un nuevo año limpiando datos transitorios
 * Mantiene: values, habits.graduated, settings, archivedNotebooks
 */
export const startNewYear = (archivedNotebooks = []) => {
  const data = loadData();
  const newYear = new Date().getFullYear();

  // Crear nueva estructura limpia
  const newData = {
    ...getDefaultData(),
    // Mantener datos permanentes
    values: data.values || [],
    settings: data.settings || getDefaultData().settings,
    archivedNotebooks: archivedNotebooks,
    // Mantener hábitos graduados pero limpiar historial
    habits: {
      active: null,
      graduated: data.habits?.graduated || [],
      history: []
    },
    // Archivar proyectos completados, mantener activos
    projects: (data.projects || []).map(p => {
      if (p.status === 'completed') {
        return { ...p, status: 'archived' };
      }
      return p;
    }),
    // Nuevo cuaderno
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
 * Carga un archivo de año archivado para consulta (solo lectura)
 * Retorna los datos parseados o null si hay error
 */
export const loadArchivedYear = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const archivedData = JSON.parse(e.target.result);

        // Validar que es un archivo de Oráculo
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
