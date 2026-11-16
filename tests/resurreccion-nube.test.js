/**
 * Tests del borrado parcial cuando hay una nube detrás.
 *
 * Cuando la usuaria borra una parte de su cuaderno y luego ese cuaderno se
 * fusiona con la copia que hay en Google Drive, lo borrado no puede volver.
 * Estas pruebas usan el motor de fusión real del proyecto (`js/gdrive/merge.js`),
 * no una imitación, porque el resultado depende de cómo se resuelven las
 * secciones atómicas y los registros de borrados.
 *
 * Ejecutar: pnpm test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { crearIndexedDBFalso } from './apoyo/indexeddb-falso.js';

// --- Entorno mínimo de navegador -------------------------------------------

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] ?? null
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent ??= class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.document = {
  createElement: () => ({ click: () => {}, href: '', download: '' }),
  body: { appendChild: () => {}, removeChild: () => {} }
};
globalThis.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
globalThis.Blob = class { constructor(d) { this.data = d; } };
globalThis.indexedDB = crearIndexedDBFalso();

const storage = await import('../js/storage-hybrid.js');
const { mergeData } = await import('../js/gdrive/merge.js');

const KEY = 'oraculo_data';

// --- Utilidades --------------------------------------------------------------

/**
 * Cuaderno de la usuaria con un hábito, su historial, su auditoría y el
 * setup del día. Es el estado que la nube tiene guardado.
 *
 * @param {string} sello - Fecha del sello de sección.
 * @returns {object} Cuaderno completo.
 */
const cuadernoEnLaNube = (sello = '2026-11-10T10:00:00.000Z') => ({
  version: '1.5',
  updatedAt: sello,
  values: [{ id: 'v1', name: 'Salud ósea' }],
  journal: [{ id: 'j1', type: 'daily', content: 'Entrada del diario', createdAt: '2026-11-10T10:00:00.000Z' }],
  projects: [],
  objectives: { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [], completed: [] },
  habits: {
    active: {
      id: 'h1',
      name: 'Caminar 30 minutos',
      identity: 'Soy una persona que camina',
      micro: 'Caminar 5 minutos',
      trigger: '09:00'
    },
    graduated: [],
    history: [{ habitId: 'h1', date: '2026-11-09' }],
    audit: {
      activities: [
        { id: 'a1', name: 'Caminar', evaluation: 'change', createdAt: '2026-11-09T10:00:00.000Z' }
      ],
      lastAuditAt: '2026-11-09T10:00:00.000Z'
    }
  },
  calendar: { events: [], recurring: [] },
  spontaneousAchievements: [],
  atelicActivities: [],
  lifeWheel: { areas: [], evaluations: [], settings: {} },
  settings: {},
  burkemanSettings: {},
  dailySetup: {
    date: '2026-11-10',
    availableTime: '4h',
    energyLevel: 'medium',
    dailyLimit: 3,
    rocaPrincipal: null,
    setupAt: '2026-11-10T08:00:00.000Z'
  },
  _sectionMeta: {
    'habits.active': { updatedAt: sello },
    'habits.audit.lastAuditAt': { updatedAt: sello },
    dailySetup: { updatedAt: sello }
  }
});

const guardarEnLocalStorage = (datos) => localStorage.setItem(KEY, JSON.stringify(datos));

const leerLocal = () => JSON.parse(localStorage.getItem(KEY));

beforeEach(() => {
  localStorage.clear();
  globalThis.indexedDB = crearIndexedDBFalso();
});

// --- Borrado de identidad frente a la nube ----------------------------------

describe('borrar la identidad no resucita desde la nube', () => {
  it('el hábito activo no vuelve', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearIdentityData();

    const fusionado = mergeData(leerLocal(), remoto).merged;
    assert.strictEqual(fusionado.habits.active, null);
  });

  it('el historial del hábito no vuelve', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearIdentityData();

    const fusionado = mergeData(leerLocal(), remoto).merged;
    assert.deepStrictEqual(fusionado.habits.history, []);
  });

  it('las actividades de la auditoría no vuelven', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearIdentityData();

    const fusionado = mergeData(leerLocal(), remoto).merged;
    assert.deepStrictEqual(fusionado.habits.audit.activities, []);
  });

  it('lo que no se ha borrado sigue ahí', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearIdentityData();

    const fusionado = mergeData(leerLocal(), remoto).merged;
    assert.strictEqual(fusionado.journal.length, 1);
    assert.strictEqual(fusionado.journal[0].content, 'Entrada del diario');
  });

  it('el historial sigue borrado aunque la app cargue los datos otra vez', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearIdentityData();

    // La app recarga los datos al volver a la vista, y al cargarlos se
    // sanean los identificadores. El registro de borrados tiene que
    // sobrevivir a esa vuelta.
    const recargados = storage.loadData();

    const fusionado = mergeData(recargados, remoto).merged;
    assert.deepStrictEqual(fusionado.habits.history, []);
  });
});

// --- Borrado de productividad frente a la nube -------------------------------

describe('borrar la productividad no resucita desde la nube', () => {
  it('el setup del día no vuelve con las notas de la usuaria', async () => {
    const remoto = cuadernoEnLaNube();
    guardarEnLocalStorage(cuadernoEnLaNube());

    await storage.clearProductivityData();

    const fusionado = mergeData(leerLocal(), remoto).merged;
    // El setup vuelve vacío, no con lo que la usuaria había escrito.
    assert.notStrictEqual(fusionado.dailySetup?.availableTime, '4h');
    assert.notStrictEqual(fusionado.dailySetup?.setupAt, '2026-11-10T08:00:00.000Z');
  });
});

// --- La migración no puede borrar el registro de borrados ------------------

describe('la migración de versión no borra el registro de borrados', () => {
  it('conserva el registro de borrados y los sellos', () => {
    const antiguo = cuadernoEnLaNube();
    antiguo.version = '1.4';
    antiguo._deletions = [{ section: 'values', itemId: 'v1', deletedAt: '2026-11-11T10:00:00.000Z' }];
    antiguo._sectionMeta = { 'habits.active': { updatedAt: '2026-11-11T10:00:00.000Z' } };
    guardarEnLocalStorage(antiguo);

    const datos = storage.loadData();

    assert.strictEqual(datos.version, '1.5');
    assert.strictEqual(datos._deletions.length, 1);
    assert.strictEqual(datos._deletions[0].itemId, 'v1');
    assert.strictEqual(datos._sectionMeta['habits.active'].updatedAt, '2026-11-11T10:00:00.000Z');
  });

  it('lo borrado no vuelve desde la nube tras una migración', () => {
    const remoto = cuadernoEnLaNube();
    const antiguo = cuadernoEnLaNube();
    antiguo.version = '1.4';
    // El valor ya estaba borrado en este cuaderno.
    antiguo.values = [];
    antiguo._deletions = [{ section: 'values', itemId: 'v1', deletedAt: '2026-11-11T10:00:00.000Z' }];
    guardarEnLocalStorage(antiguo);

    const datos = storage.loadData();

    const fusionado = mergeData(datos, remoto).merged;
    // Sin registro de borrados, el valor borrado vuelve desde la nube.
    assert.strictEqual(fusionado.values.length, 0);
  });
});
