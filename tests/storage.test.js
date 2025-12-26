/**
 * Tests para el sistema de almacenamiento
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: npm test
 *
 * Estos tests verifican:
 * - Estructura de datos por defecto
 * - Migraciones entre versiones (v1.2 → v1.3 → v1.4 → v1.5)
 * - Preservación de datos durante migraciones
 * - Funciones auxiliares (generateYearSummary, etc.)
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// ============================================================
// Mock de localStorage para Node.js
// ============================================================

const createLocalStorageMock = () => {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
    _store: store // Para inspección en tests
  };
};

// Configurar mock global antes de importar
globalThis.localStorage = createLocalStorageMock();
globalThis.window = { dispatchEvent: () => {} };
globalThis.document = {
  createElement: () => ({ click: () => {}, href: '', download: '' }),
  body: { appendChild: () => {}, removeChild: () => {} }
};
globalThis.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
globalThis.Blob = class { constructor(data) { this.data = data; this.size = JSON.stringify(data).length; } };
globalThis.confirm = () => true;

// Importar después de configurar mocks
const {
  loadData,
  saveData,
  updateSection,
  getStorageUsage,
  generateYearSummary,
  startNewYear
} = await import('../js/storage.js');

// ============================================================
// Datos de prueba para migraciones
// ============================================================

// Datos simulados versión 1.2 (sin Sistema Burkeman)
const createV12Data = () => ({
  version: '1.2',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-15T12:00:00.000Z',
  values: [
    { id: 'v1', name: 'Salud', description: 'Cuidar mi cuerpo', icon: 'favorite' }
  ],
  objectives: {
    backlog: [{ id: 'b1', text: 'Idea pendiente', completed: false }],
    quarterly: [{ id: 'q1', text: 'Meta trimestral', completed: true }],
    monthly: [],
    weekly: [{ id: 'w1', text: 'Tarea semanal', completed: false }],
    daily: [{ id: 'd1', text: 'Tarea hoy', completed: false }]
  },
  habits: {
    active: { id: 'h1', name: 'Meditar', startDate: '2024-01-01' },
    graduated: [],
    history: [{ habitId: 'h1', date: '2024-06-14', completedAt: '2024-06-14T08:00:00.000Z' }]
  },
  calendar: {
    events: [{ id: 'e1', title: 'Reunión', date: '2024-06-20', time: '10:00' }],
    recurring: []
  },
  journal: [
    { id: 'j1', type: 'daily', content: { mood: 'good' }, createdAt: '2024-06-14T20:00:00.000Z' }
  ],
  projects: [
    { id: 'p1', name: 'Proyecto Test', status: 'active', color: '#06b6d4' }
  ],
  settings: {
    storageType: 'localStorage',
    notificationsEnabled: false,
    theme: 'light'
  },
  notebook: {
    year: 2024,
    startedAt: '2024-01-01T00:00:00.000Z',
    name: 'Cuaderno 2024'
  },
  archivedNotebooks: []
});

// Datos simulados versión 1.3 (con Sistema Burkeman pero sin Rueda de la Vida)
const createV13Data = () => ({
  ...createV12Data(),
  version: '1.3',
  dailySetup: {
    date: '2024-06-15',
    availableTime: '4h',
    energyLevel: 'medium',
    dailyLimit: 2,
    rocaPrincipal: 'd1',
    setupAt: '2024-06-15T07:00:00.000Z'
  },
  spontaneousAchievements: [
    { id: 'sa1', text: 'Logro inesperado', mood: 'orgullosa', createdAt: '2024-06-15T18:00:00.000Z' }
  ],
  atelicActivities: [
    { id: 'aa1', name: 'Paseo', category: 'naturaleza', createdAt: '2024-06-15T19:00:00.000Z' }
  ],
  burkemanSettings: {
    showReflexiones: true,
    menuModeDefault: false,
    dailySetupEnabled: true,
    atelicReminder: true
  }
});

// Datos simulados versión 1.4 (con Rueda de la Vida pero sin Auditoría)
const createV14Data = () => ({
  ...createV13Data(),
  version: '1.4',
  lifeWheel: {
    areas: [
      { id: 'health', name: 'Salud física', icon: 'fitness_center', order: 0 }
    ],
    evaluations: [],
    settings: { reminderEnabled: true }
  },
  objectiveEvaluation: {
    criteria: [],
    evaluations: [],
    thresholds: { proceed: 75, review: 50 }
  }
});

// ============================================================
// Tests para getDefaultData (estructura)
// ============================================================

describe('Estructura de datos por defecto', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  it('debe crear datos con versión 1.5', () => {
    const data = loadData();

    assert.strictEqual(data.version, '1.5');
  });

  it('debe tener todas las secciones principales', () => {
    const data = loadData();

    // Secciones básicas
    assert.ok(data.values !== undefined, 'values debe existir');
    assert.ok(data.objectives !== undefined, 'objectives debe existir');
    assert.ok(data.habits !== undefined, 'habits debe existir');
    assert.ok(data.calendar !== undefined, 'calendar debe existir');
    assert.ok(data.journal !== undefined, 'journal debe existir');
    assert.ok(data.projects !== undefined, 'projects debe existir');
    assert.ok(data.settings !== undefined, 'settings debe existir');
    assert.ok(data.notebook !== undefined, 'notebook debe existir');

    // Secciones Burkeman (v1.3)
    assert.ok(data.dailySetup !== undefined, 'dailySetup debe existir');
    assert.ok(data.spontaneousAchievements !== undefined, 'spontaneousAchievements debe existir');
    assert.ok(data.atelicActivities !== undefined, 'atelicActivities debe existir');
    assert.ok(data.burkemanSettings !== undefined, 'burkemanSettings debe existir');

    // Secciones Rueda de la Vida (v1.4)
    assert.ok(data.lifeWheel !== undefined, 'lifeWheel debe existir');
    assert.ok(data.objectiveEvaluation !== undefined, 'objectiveEvaluation debe existir');
  });

  it('objectives debe tener todos los horizontes temporales', () => {
    const data = loadData();

    assert.ok(Array.isArray(data.objectives.backlog), 'backlog debe ser array');
    assert.ok(Array.isArray(data.objectives.quarterly), 'quarterly debe ser array');
    assert.ok(Array.isArray(data.objectives.monthly), 'monthly debe ser array');
    assert.ok(Array.isArray(data.objectives.weekly), 'weekly debe ser array');
    assert.ok(Array.isArray(data.objectives.daily), 'daily debe ser array');
  });

  it('habits debe tener estructura para auditoría (v1.5)', () => {
    const data = loadData();

    assert.ok(data.habits.audit !== undefined, 'habits.audit debe existir');
    assert.ok(Array.isArray(data.habits.audit.activities), 'audit.activities debe ser array');
    assert.strictEqual(data.habits.audit.lastAuditAt, null, 'lastAuditAt inicial debe ser null');
  });

  it('lifeWheel debe tener 8 áreas por defecto', () => {
    const data = loadData();

    assert.strictEqual(data.lifeWheel.areas.length, 8, 'Debe tener 8 áreas');

    const areaIds = data.lifeWheel.areas.map(a => a.id);
    assert.ok(areaIds.includes('health'), 'Debe incluir health');
    assert.ok(areaIds.includes('emotional'), 'Debe incluir emotional');
    assert.ok(areaIds.includes('growth'), 'Debe incluir growth');
    assert.ok(areaIds.includes('family'), 'Debe incluir family');
  });

  it('burkemanSettings debe tener todos los toggles', () => {
    const data = loadData();

    assert.strictEqual(typeof data.burkemanSettings.showReflexiones, 'boolean');
    assert.strictEqual(typeof data.burkemanSettings.menuModeDefault, 'boolean');
    assert.strictEqual(typeof data.burkemanSettings.dailySetupEnabled, 'boolean');
    assert.strictEqual(typeof data.burkemanSettings.atelicReminder, 'boolean');
    assert.strictEqual(typeof data.burkemanSettings.askValueOnPriority, 'boolean');
  });
});

// ============================================================
// Tests para migraciones
// ============================================================

describe('Migraciones de datos', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Migración v1.2 → v1.5', () => {

    it('debe migrar datos v1.2 a v1.5 preservando datos existentes', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      // Versión actualizada
      assert.strictEqual(migrated.version, '1.5');

      // Datos preservados
      assert.strictEqual(migrated.values.length, 1, 'Values preservados');
      assert.strictEqual(migrated.values[0].name, 'Salud');

      assert.strictEqual(migrated.objectives.backlog.length, 1, 'Backlog preservado');
      assert.strictEqual(migrated.objectives.quarterly.length, 1, 'Quarterly preservado');

      assert.strictEqual(migrated.journal.length, 1, 'Journal preservado');
      assert.strictEqual(migrated.projects.length, 1, 'Projects preservado');
    });

    it('debe añadir campos Burkeman faltantes', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      // Campos Burkeman añadidos
      assert.ok(migrated.dailySetup !== undefined, 'dailySetup añadido');
      assert.ok(Array.isArray(migrated.spontaneousAchievements), 'spontaneousAchievements añadido');
      assert.ok(Array.isArray(migrated.atelicActivities), 'atelicActivities añadido');
      assert.ok(migrated.burkemanSettings !== undefined, 'burkemanSettings añadido');
    });

    it('debe añadir campos a tareas diarias existentes', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      const dailyTask = migrated.objectives.daily[0];
      assert.strictEqual(dailyTask.isRocaPrincipal, false, 'isRocaPrincipal añadido');
      assert.strictEqual(dailyTask.taskType, null, 'taskType añadido');
      assert.strictEqual(dailyTask.valueId, null, 'valueId añadido');
    });

    it('debe añadir campo isSincronia a eventos', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      const event = migrated.calendar.events[0];
      assert.strictEqual(event.isSincronia, false, 'isSincronia añadido');
    });

    it('debe añadir Rueda de la Vida', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      assert.ok(migrated.lifeWheel !== undefined, 'lifeWheel añadido');
      assert.ok(Array.isArray(migrated.lifeWheel.areas), 'areas es array');
      assert.strictEqual(migrated.lifeWheel.areas.length, 8, '8 áreas por defecto');
    });

    it('debe añadir auditoría de hábitos', () => {
      const v12Data = createV12Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v12Data));

      const migrated = loadData();

      assert.ok(migrated.habits.audit !== undefined, 'audit añadido');
      assert.ok(Array.isArray(migrated.habits.audit.activities), 'audit.activities es array');
    });
  });

  describe('Migración v1.3 → v1.5', () => {

    it('debe preservar datos Burkeman existentes', () => {
      const v13Data = createV13Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v13Data));

      const migrated = loadData();

      // Datos Burkeman preservados
      assert.strictEqual(migrated.dailySetup.availableTime, '4h');
      assert.strictEqual(migrated.dailySetup.rocaPrincipal, 'd1');
      assert.strictEqual(migrated.spontaneousAchievements.length, 1);
      assert.strictEqual(migrated.atelicActivities.length, 1);
      assert.strictEqual(migrated.burkemanSettings.showReflexiones, true);
    });

    it('debe añadir campos faltantes a burkemanSettings', () => {
      const v13Data = createV13Data();
      // v1.3 no tenía askValueOnPriority
      delete v13Data.burkemanSettings.askValueOnPriority;
      localStorage.setItem('oraculo_data', JSON.stringify(v13Data));

      const migrated = loadData();

      // Campo añadido con valor por defecto
      assert.strictEqual(typeof migrated.burkemanSettings.askValueOnPriority, 'boolean');
    });
  });

  describe('Migración v1.4 → v1.5', () => {

    it('debe preservar Rueda de la Vida existente', () => {
      const v14Data = createV14Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v14Data));

      const migrated = loadData();

      // Areas personalizadas preservadas
      assert.strictEqual(migrated.lifeWheel.areas.length, 1);
      assert.strictEqual(migrated.lifeWheel.areas[0].id, 'health');
    });

    it('debe añadir auditoría de hábitos', () => {
      const v14Data = createV14Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v14Data));

      const migrated = loadData();

      assert.ok(migrated.habits.audit !== undefined, 'audit añadido');
    });

    it('debe preservar hábito activo existente', () => {
      const v14Data = createV14Data();
      localStorage.setItem('oraculo_data', JSON.stringify(v14Data));

      const migrated = loadData();

      assert.strictEqual(migrated.habits.active.name, 'Meditar');
      assert.strictEqual(migrated.habits.history.length, 1);
    });
  });
});

// ============================================================
// Tests para funciones auxiliares
// ============================================================

describe('Funciones auxiliares', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  describe('updateSection', () => {

    it('debe actualizar sección simple', () => {
      loadData(); // Inicializar

      updateSection('values', [{ id: 'v1', name: 'Test' }]);

      const data = loadData();
      assert.strictEqual(data.values.length, 1);
      assert.strictEqual(data.values[0].name, 'Test');
    });

    it('debe actualizar sección anidada con notación de punto', () => {
      loadData(); // Inicializar

      updateSection('objectives.daily', [{ id: 'd1', text: 'Tarea' }]);

      const data = loadData();
      assert.strictEqual(data.objectives.daily.length, 1);
      assert.strictEqual(data.objectives.daily[0].text, 'Tarea');
    });
  });

  describe('generateYearSummary', () => {

    it('debe calcular resumen correctamente', () => {
      const data = createV12Data();
      data.objectives.quarterly[0].completed = true;
      data.objectives.weekly[0].completed = true;
      data.projects[0].status = 'completed';

      const summary = generateYearSummary(data);

      assert.strictEqual(summary.totalTasksCompleted, 2, 'Tareas completadas');
      assert.strictEqual(summary.habitsGraduated, 0, 'Hábitos graduados');
      assert.strictEqual(summary.habitDaysLogged, 1, 'Días de hábito');
      assert.strictEqual(summary.projectsCompleted, 1, 'Proyectos completados');
      assert.strictEqual(summary.journalEntries, 1, 'Entradas de diario');
      assert.strictEqual(summary.valuesCount, 1, 'Valores');
    });

    it('debe manejar datos vacíos sin errores', () => {
      const data = {
        objectives: {},
        habits: {},
        projects: [],
        journal: [],
        values: []
      };

      const summary = generateYearSummary(data);

      assert.strictEqual(summary.totalTasksCompleted, 0);
      assert.strictEqual(summary.habitsGraduated, 0);
      assert.strictEqual(summary.journalEntries, 0);
    });
  });

  describe('startNewYear', () => {

    it('debe preservar valores', () => {
      const initialData = createV13Data();
      saveData(initialData);

      startNewYear([]);

      const newData = loadData();
      assert.strictEqual(newData.values.length, 1);
      assert.strictEqual(newData.values[0].name, 'Salud');
    });

    it('debe preservar hábitos graduados pero limpiar historial', () => {
      const initialData = createV13Data();
      initialData.habits.graduated = [{ id: 'hg1', name: 'Hábito graduado' }];
      saveData(initialData);

      startNewYear([]);

      const newData = loadData();
      assert.strictEqual(newData.habits.graduated.length, 1);
      assert.strictEqual(newData.habits.history.length, 0, 'Historial limpiado');
      assert.strictEqual(newData.habits.active, null, 'Active limpiado');
    });

    it('debe limpiar objectives', () => {
      const initialData = createV13Data();
      saveData(initialData);

      startNewYear([]);

      const newData = loadData();
      assert.strictEqual(newData.objectives.backlog.length, 0);
      assert.strictEqual(newData.objectives.quarterly.length, 0);
      assert.strictEqual(newData.objectives.daily.length, 0);
    });

    it('debe archivar proyectos completados', () => {
      const initialData = createV13Data();
      initialData.projects[0].status = 'completed';
      saveData(initialData);

      startNewYear([]);

      const newData = loadData();
      assert.strictEqual(newData.projects[0].status, 'archived');
    });

    it('debe crear nuevo notebook con año actual', () => {
      const initialData = createV13Data();
      saveData(initialData);

      startNewYear([]);

      const newData = loadData();
      assert.strictEqual(newData.notebook.year, new Date().getFullYear());
      assert.ok(newData.notebook.startedAt);
    });
  });

  describe('getStorageUsage', () => {

    it('debe calcular uso correctamente', () => {
      localStorage.clear();
      loadData(); // Crear datos iniciales

      const usage = getStorageUsage();

      assert.ok(usage.used > 0, 'Debe tener bytes usados');
      assert.strictEqual(usage.max, 5 * 1024 * 1024, 'Máximo 5MB');
      assert.ok(usage.percentage >= 0 && usage.percentage <= 100, 'Porcentaje válido');
    });
  });
});

// ============================================================
// Tests de edge cases
// ============================================================

describe('Edge cases', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  it('debe manejar datos corruptos graciosamente', () => {
    localStorage.setItem('oraculo_data', 'not valid json{{{');

    // No debe lanzar error, debe devolver datos por defecto
    const data = loadData();

    assert.strictEqual(data.version, '1.5');
    assert.ok(Array.isArray(data.values));
  });

  it('debe manejar versión futura desconocida', () => {
    const futureData = {
      version: '99.0',
      values: [{ id: 'v1', name: 'Test' }],
      objectives: { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [] }
    };
    localStorage.setItem('oraculo_data', JSON.stringify(futureData));

    const data = loadData();

    // Debe migrar a versión actual preservando datos
    assert.strictEqual(data.version, '1.5');
    assert.strictEqual(data.values.length, 1);
  });

  it('debe manejar objetivos parcialmente definidos', () => {
    const partialData = {
      version: '1.2',
      objectives: {
        daily: [{ id: 'd1', text: 'Tarea' }]
        // Faltan backlog, quarterly, etc.
      }
    };
    localStorage.setItem('oraculo_data', JSON.stringify(partialData));

    const data = loadData();

    // Debe completar con valores por defecto
    assert.ok(Array.isArray(data.objectives.backlog));
    assert.ok(Array.isArray(data.objectives.quarterly));
    assert.strictEqual(data.objectives.daily.length, 1);
  });
});
