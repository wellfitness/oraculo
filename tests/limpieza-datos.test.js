/**
 * Tests del borrado de datos: el cuaderno, sus copias y los respaldos
 * automáticos que la app guarda en IndexedDB.
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
globalThis.indexedDB = crearIndexedDBFalso();

const storage = await import('../js/storage-hybrid.js');
const autoBackup = await import('../js/utils/auto-backup.js');

const KEY = 'oraculo_data';
const CLAVE_MARCA = 'oraculo_lastAutoBackupAt';

beforeEach(() => {
  localStorage.clear();
  // IndexedDB no se puede vaciar con localStorage.clear(): se reinicia el
  // doble entero para que cada prueba parta de la base vacía.
  globalThis.indexedDB = crearIndexedDBFalso();
});

// --- Utilidades --------------------------------------------------------------

const datosConContenido = () => ({
  version: '1.5',
  values: [{ id: 'v1', name: 'Salud ósea' }],
  journal: [{ id: 'j1', type: 'daily', content: 'SECRETO DEL DIARIO' }],
  projects: [{ id: 'p1', name: 'Proyecto' }],
  objectives: { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [], completed: [] },
  habits: { active: { id: 'h1', name: 'Caminar' }, graduated: [], history: [], audit: { activities: [], lastAuditAt: null } },
  calendar: { events: [], recurring: [] },
  spontaneousAchievements: [],
  atelicActivities: [],
  lifeWheel: { areas: [], evaluations: [], settings: {} },
  settings: {},
  burkemanSettings: {},
  dailySetup: null
});

const guardarEnLocalStorage = (datos) => localStorage.setItem(KEY, JSON.stringify(datos));

const leerUltimoRespaldo = async () => {
  const lista = await autoBackup.listAutoBackups();
  if (lista.length === 0) return null;
  return autoBackup.restoreAutoBackup(lista[0].id);
};

// --- Respaldos automáticos en IndexedDB --------------------------------------

describe('respaldos automáticos', () => {
  it('guarda una copia del cuaderno y la puede recuperar', async () => {
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());

    const lista = await autoBackup.listAutoBackups();
    assert.strictEqual(lista.length, 1);

    const datos = await leerUltimoRespaldo();
    assert.strictEqual(datos.journal[0].content, 'SECRETO DEL DIARIO');
  });

  it('borrarBackupsAutomaticos deja el almacén de respaldos vacío', async () => {
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());
    assert.strictEqual((await autoBackup.listAutoBackups()).length, 1);

    await autoBackup.borrarBackupsAutomaticos();

    assert.strictEqual((await autoBackup.listAutoBackups()).length, 0);
    assert.strictEqual(localStorage.getItem(CLAVE_MARCA), null);
  });

  it('no crea un respaldo de un cuaderno vacío', async () => {
    const hecho = await autoBackup.runAutoBackupIfNeeded({
      version: '1.5',
      values: [], journal: [], projects: [], objectives: {},
      habits: { active: null, graduated: [], history: [] },
      calendar: { events: [], recurring: [] },
      spontaneousAchievements: [], atelicActivities: [],
      lifeWheel: { evaluations: [] }
    });

    assert.strictEqual(hecho, false);
    assert.strictEqual((await autoBackup.listAutoBackups()).length, 0);
  });

  it('sí crea un respaldo de un cuaderno con contenido', async () => {
    const hecho = await autoBackup.runAutoBackupIfNeeded(datosConContenido());

    assert.strictEqual(hecho, true);
    assert.strictEqual((await autoBackup.listAutoBackups()).length, 1);
  });
});

describe('tieneContenidoParaRespaldar', () => {
  const vacio = {
    values: [], journal: [], projects: [], objectives: { backlog: [], weekly: [] },
    habits: { active: null, graduated: [], history: [] },
    calendar: { events: [], recurring: [] },
    spontaneousAchievements: [], atelicActivities: [],
    lifeWheel: { evaluations: [] }
  };

  it('un cuaderno sin nada de la usuaria no tiene nada que respaldar', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar(vacio), false);
  });

  it('una entrada de diario sí es contenido', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar({ ...vacio, journal: [{ id: 'j1' }] }), true);
  });

  it('una tarea pendiente sí es contenido', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar({ ...vacio, objectives: { backlog: [{ id: 't1' }] } }), true);
  });

  it('un hábito con historial sí es contenido', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar({ ...vacio, habits: { ...vacio.habits, history: [{ id: 'h1' }] } }), true);
  });

  it('un evento de calendario sí es contenido', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar({ ...vacio, calendar: { events: [{ id: 'e1' }], recurring: [] } }), true);
  });

  it('un dato que no es un objeto no tiene contenido', () => {
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar(null), false);
    assert.strictEqual(autoBackup.tieneContenidoParaRespaldar('texto'), false);
  });
});

// --- Borrado total -----------------------------------------------------------

describe('borrar todo', () => {
  it('borra también los respaldos automáticos de IndexedDB', async () => {
    guardarEnLocalStorage(datosConContenido());
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());
    assert.strictEqual((await autoBackup.listAutoBackups()).length, 1);

    await storage.clearAllData();

    assert.strictEqual((await autoBackup.listAutoBackups()).length, 0);
    assert.strictEqual(await autoBackup.restoreAutoBackup(1), null);
  });

  it('no deja nada en el almacenamiento local', async () => {
    guardarEnLocalStorage(datosConContenido());
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());

    await storage.clearAllData();

    assert.strictEqual(localStorage.getItem(KEY), null);
    assert.strictEqual(localStorage.getItem(CLAVE_MARCA), null);
  });
});

// --- Borrado parcial ---------------------------------------------------------

describe('borrado parcial', () => {
  it('borrar el diario conserva los respaldos automáticos', async () => {
    guardarEnLocalStorage(datosConContenido());
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());

    await storage.clearJournalData();

    // Los respaldos son la red de la usuaria si borra sin querer: el
    // borrado parcial no los toca.
    const respaldo = await leerUltimoRespaldo();
    assert.ok(respaldo, 'el respaldo automático sigue ahí');
    assert.strictEqual(respaldo.journal.length, 1);
    assert.strictEqual(respaldo.journal[0].content, 'SECRETO DEL DIARIO');
  });

  it('borrar la identidad conserva los respaldos automáticos', async () => {
    guardarEnLocalStorage(datosConContenido());
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());

    await storage.clearIdentityData();

    const respaldo = await leerUltimoRespaldo();
    assert.ok(respaldo, 'el respaldo automático sigue ahí');
    assert.strictEqual(respaldo.values.length, 1);
    assert.strictEqual(respaldo.habits.active.name, 'Caminar');
  });

  it('borrar la productividad conserva los respaldos automáticos', async () => {
    guardarEnLocalStorage(datosConContenido());
    await autoBackup.saveAutoBackupToIndexedDB(datosConContenido());

    await storage.clearProductivityData();

    const respaldo = await leerUltimoRespaldo();
    assert.ok(respaldo, 'el respaldo automático sigue ahí');
    assert.strictEqual(respaldo.projects.length, 1);
  });

  it('el cuaderno sí queda vacío aunque el respaldo siga intacto', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearJournalData();

    const datos = JSON.parse(localStorage.getItem(KEY));
    assert.deepStrictEqual(datos.journal, []);
  });
});
