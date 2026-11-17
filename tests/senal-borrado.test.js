/**
 * Tests de la señal de borrado entre pestañas.
 *
 * Cuando la usuaria borra datos en una pestaña, las demás tienen que enterarse
 * enseguida. Si no, una pestaña que tenga el diario abierto (o un modal)
 * aplaza lo que llega y, al guardar, vuelve a escribir lo que se acababa de
 * borrar.
 *
 * La señal es una clave propia de localStorage (`oraculo_borrado`): las otras
 * pestañas la reciben por el evento `storage`.
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
const {
  CLAVE_SENAL_BORRADO,
  TIPO_BORRADO,
  aplicarBorradoEnMemoria,
  emitirSenalBorrado,
  leerSenalBorrado,
  recibirSenalBorrado
} = await import('../js/utils/borrado-senal.js');

const KEY = 'oraculo_data';

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

const leerLaSenal = () => leerSenalBorrado(localStorage.getItem(CLAVE_SENAL_BORRADO));

beforeEach(() => {
  localStorage.clear();
  globalThis.indexedDB = crearIndexedDBFalso();
});

// --- La señal se emite en los cuatro borrados --------------------------------

describe('la señal de borrado avisa a las otras pestañas', () => {
  it('borrar todo avisa de que se ha borrado todo', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearAllData();

    const senal = leerLaSenal();
    assert.ok(senal, 'tiene que haber señal');
    assert.strictEqual(senal.tipo, TIPO_BORRADO.TODO);
  });

  it('borrar la identidad avisa de que se ha borrado la identidad', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearIdentityData();

    const senal = leerLaSenal();
    assert.ok(senal, 'tiene que haber señal');
    assert.strictEqual(senal.tipo, TIPO_BORRADO.IDENTIDAD);
  });

  it('borrar la productividad avisa de que se ha borrado la productividad', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearProductivityData();

    const senal = leerLaSenal();
    assert.ok(senal, 'tiene que haber señal');
    assert.strictEqual(senal.tipo, TIPO_BORRADO.PRODUCTIVIDAD);
  });

  it('borrar el diario avisa de que se ha borrado el diario', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearJournalData();

    const senal = leerLaSenal();
    assert.ok(senal, 'tiene que haber señal');
    assert.strictEqual(senal.tipo, TIPO_BORRADO.DIARIO);
  });

  it('la señal sale después de que el borrado esté guardado', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearJournalData();

    // La otra pestaña lee el almacenamiento al recibir la señal: si el
    // borrado no estuviera guardado ya, leería el diario entero.
    const guardado = JSON.parse(localStorage.getItem(KEY));
    assert.deepStrictEqual(guardado.journal, []);
    assert.deepStrictEqual(leerLaSenal().tipo, TIPO_BORRADO.DIARIO);
  });

  it('dos borrados seguidos dejan dos señales distintas', async () => {
    guardarEnLocalStorage(datosConContenido());

    await storage.clearJournalData();
    const primera = localStorage.getItem(CLAVE_SENAL_BORRADO);

    await storage.clearIdentityData();
    const segunda = localStorage.getItem(CLAVE_SENAL_BORRADO);

    // Si las dos señales fueran iguales, la segunda no dispararía el
    // evento de almacenamiento y la otra pestaña no se enteraría.
    assert.notStrictEqual(primera, segunda);
    assert.strictEqual(leerLaSenal().tipo, TIPO_BORRADO.IDENTIDAD);
  });
});

// --- La señal se lee y se valida ---------------------------------------------

describe('leerSenalBorrado', () => {
  it('lee una señal válida', () => {
    const senal = leerSenalBorrado(JSON.stringify({ tipo: 'diario', at: 1700000000000, id: 'x' }));

    assert.strictEqual(senal.tipo, 'diario');
    assert.strictEqual(senal.at, 1700000000000);
  });

  it('ignora un tipo que no existe', () => {
    assert.strictEqual(leerSenalBorrado(JSON.stringify({ tipo: 'inventado', at: 1 })), null);
  });

  it('ignora lo que no es texto', () => {
    assert.strictEqual(leerSenalBorrado(null), null);
    assert.strictEqual(leerSenalBorrado(undefined), null);
    assert.strictEqual(leerSenalBorrado(''), null);
    assert.strictEqual(leerSenalBorrado(42), null);
  });

  it('ignora un texto que no es una señal', () => {
    assert.strictEqual(leerSenalBorrado('esto no es json'), null);
    assert.strictEqual(leerSenalBorrado('[]'), null);
    assert.strictEqual(leerSenalBorrado('null'), null);
  });

  it('no deja pasar una señal con el tipo fuera de la lista', () => {
    const senal = leerSenalBorrado(JSON.stringify({ tipo: 'constructor' }));

    assert.strictEqual(senal, null);
  });
});

describe('emitirSenalBorrado', () => {
  it('escribe la señal en el almacenamiento', () => {
    emitirSenalBorrado(TIPO_BORRADO.DIARIO);

    assert.strictEqual(leerLaSenal().tipo, TIPO_BORRADO.DIARIO);
  });

  it('no rompe si el almacenamiento no está disponible', () => {
    assert.doesNotThrow(() => {
      emitirSenalBorrado(TIPO_BORRADO.TODO, { almacenamiento: null });
    });
  });
});

// --- Lo que hace la otra pestaña al recibir la señal --------------------------

describe('recibirSenalBorrado', () => {
  const estadoDeLaPestanaB = () => ({
    data: {
      updatedAt: '2026-11-17T08:00:00.000Z',
      journal: [{ id: 'j1', type: 'daily', content: 'SECRETO DEL DIARIO' }],
      values: [{ id: 'v1', name: 'Salud ósea' }]
    },
    pendingSync: { updatedAt: '2026-11-17T08:01:00.000Z', journal: [] },
    pendingSyncOrigen: 'pestana',
    pendingSyncBase: { updatedAt: '2026-11-17T08:00:00.000Z', journal: [] }
  });

  it('descarta lo que estaba pendiente', () => {
    const estado = estadoDeLaPestanaB();

    recibirSenalBorrado(estado, { tipo: TIPO_BORRADO.DIARIO, at: 1, id: 'a' }, { journal: [] });

    assert.strictEqual(estado.pendingSync, null);
    assert.strictEqual(estado.pendingSyncOrigen, null);
    assert.strictEqual(estado.pendingSyncBase, null);
  });

  it('vacía el diario en memoria, también en la lista que tiene el módulo abierto', () => {
    const estado = estadoDeLaPestanaB();
    // El módulo del diario tiene una referencia a esta lista.
    const listaDelModulo = estado.data.journal;

    recibirSenalBorrado(estado, { tipo: TIPO_BORRADO.DIARIO, at: 1, id: 'a' }, { journal: [] });

    assert.deepStrictEqual(estado.data.journal, []);
    assert.deepStrictEqual(listaDelModulo, [], 'la lista que tiene el módulo también se vacía');
  });

  it('no toca lo que no se ha borrado', () => {
    const estado = estadoDeLaPestanaB();

    recibirSenalBorrado(estado, { tipo: TIPO_BORRADO.DIARIO, at: 1, id: 'a' }, {
      journal: [],
      values: [{ id: 'v1', name: 'Salud ósea' }]
    });

    assert.strictEqual(estado.data.values.length, 1);
  });

  it('un borrado total no toca la memoria: la app recarga la página', () => {
    const estado = estadoDeLaPestanaB();

    const tipo = recibirSenalBorrado(estado, { tipo: TIPO_BORRADO.TODO, at: 1, id: 'a' }, null);

    assert.strictEqual(tipo, TIPO_BORRADO.TODO);
    assert.strictEqual(estado.pendingSync, null);
  });

  it('aguanta que no haya estado', () => {
    assert.doesNotThrow(() => recibirSenalBorrado(null, { tipo: TIPO_BORRADO.DIARIO, at: 1, id: 'a' }, {}));
  });

  it('una señal que no es válida no toca nada', () => {
    const estado = estadoDeLaPestanaB();

    const tipo = recibirSenalBorrado(estado, { tipo: 'inventado', at: 1, id: 'a' }, { journal: [] });

    assert.strictEqual(tipo, null);
    assert.ok(estado.pendingSync, 'lo pendiente se queda como estaba');
    assert.strictEqual(estado.data.journal.length, 1, 'el diario no se toca');
  });
});

describe('aplicarBorradoEnMemoria', () => {
  it('vacía en su sitio la sección borrada', () => {
    const datos = {
      journal: [{ id: 'j1' }],
      values: [{ id: 'v1' }]
    };
    const lista = datos.journal;

    aplicarBorradoEnMemoria(datos, TIPO_BORRADO.DIARIO, { journal: [], values: [{ id: 'v1' }] });

    assert.deepStrictEqual(lista, []);
    assert.strictEqual(datos.values.length, 1);
  });

  it('vacía la identidad cuando es lo que se ha borrado', () => {
    const datos = {
      journal: [{ id: 'j1' }],
      values: [{ id: 'v1' }],
      habits: { active: { id: 'h1' }, graduated: [{ id: 'g1' }], history: [{ habitId: 'h1' }] }
    };

    aplicarBorradoEnMemoria(datos, TIPO_BORRADO.IDENTIDAD, {
      journal: [{ id: 'j1' }],
      values: [],
      habits: { active: null, graduated: [], history: [] }
    });

    assert.deepStrictEqual(datos.values, []);
    assert.strictEqual(datos.habits.active, null);
    assert.deepStrictEqual(datos.habits.graduated, []);
    assert.strictEqual(datos.journal.length, 1, 'el diario no se toca');
  });

  it('aguanta datos que no son un objeto', () => {
    assert.doesNotThrow(() => aplicarBorradoEnMemoria(null, TIPO_BORRADO.DIARIO, {}));
    assert.doesNotThrow(() => aplicarBorradoEnMemoria({}, TIPO_BORRADO.DIARIO, null));
  });

  it('no deja pasar una clave que contamine el prototipo', () => {
    const datos = { journal: [] };
    // Los datos vienen del almacenamiento: pueden traer cualquier clave.
    const frescos = JSON.parse('{"journal": [], "__proto__": {"contaminado": true}}');

    aplicarBorradoEnMemoria(datos, TIPO_BORRADO.DIARIO, frescos);

    assert.strictEqual(Object.getPrototypeOf(datos), Object.prototype);
    assert.strictEqual(datos.contaminado, undefined);
    assert.strictEqual({}.contaminado, undefined);
  });
});
