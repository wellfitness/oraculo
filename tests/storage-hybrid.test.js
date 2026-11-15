/**
 * Tests para el módulo único de almacenamiento (storage-hybrid.js)
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent ??= class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.document = {
  createElement: () => ({ click: () => {}, href: '', download: '' }),
  body: { appendChild: () => {}, removeChild: () => {} }
};
globalThis.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
globalThis.Blob = class { constructor(d) { this.data = d; } };
globalThis.confirm = () => { throw new Error('confirm no debe llamarse desde el almacenamiento'); };

const storage = await import('../js/storage-hybrid.js');
const KEY = 'oraculo_data';
beforeEach(() => localStorage.clear());

describe('ensureDataShape', () => {
  it('rellena las secciones que faltan sin tocar las que existen', () => {
    const tarea = { id: 't1', text: 'Comprar pan', completed: false };
    const d = storage.ensureDataShape({ version: '1.5', objectives: { daily: [tarea] }, _sectionMeta: { x: 1 } });
    assert.deepStrictEqual(d.objectives.daily, [tarea]);
    for (const h of ['backlog', 'quarterly', 'monthly', 'weekly', 'completed']) assert.ok(Array.isArray(d.objectives[h]), h);
    assert.ok(Array.isArray(d.values));
    assert.ok(Array.isArray(d.journal));
    assert.ok(Array.isArray(d.projects));
    assert.ok(Array.isArray(d.habits.history));
    assert.ok(Array.isArray(d.habits.audit.activities));
    assert.ok(Array.isArray(d.calendar.events));
    assert.strictEqual(typeof d.muevete.timerState, 'object');
    assert.deepStrictEqual(d._sectionMeta, { x: 1 });
  });
  it('sustituye por su valor por defecto lo que tiene un tipo equivocado', () => {
    const d = storage.ensureDataShape({ version: '1.5', values: () => {}, journal: 'x', objectives: [], lifeWheel: null, dailySetup: null });
    assert.deepStrictEqual(d.values, []);
    assert.deepStrictEqual(d.journal, []);
    assert.ok(Array.isArray(d.objectives.weekly));
    assert.ok(Array.isArray(d.lifeWheel.evaluations));
    assert.strictEqual(d.dailySetup.dailyLimit, 3);
  });
  it('respeta un valor nulo donde el valor por defecto también es nulo', () => {
    const d = storage.ensureDataShape({ version: '1.5', habits: { active: null } });
    assert.strictEqual(d.habits.active, null);
  });
  it('es idempotente', () => {
    const una = storage.ensureDataShape({ version: '1.5' });
    const copia = JSON.stringify(una);
    assert.strictEqual(JSON.stringify(storage.ensureDataShape(una)), copia);
  });
});

describe('loadData con datos incompletos', () => {
  it('datos 1.5 sin muevete ni values se cargan completos', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', objectives: { backlog: [{ id: 'a', text: 'Idea' }] } }));
    const d = storage.loadData();
    assert.strictEqual(d.objectives.backlog[0].text, 'Idea');
    assert.ok(Array.isArray(d.values));
    assert.strictEqual(d.muevete.timerState.status, 'idle');
  });
  it('datos de la versión 1.2 conservan sus tareas tras cargar', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.2', values: [{ id: 'v', name: 'Salud' }], objectives: { daily: [{ id: 'd', text: 'Caminar' }] } }));
    const d = storage.loadData();
    assert.strictEqual(d.version, '1.5');
    assert.strictEqual(d.values[0].name, 'Salud');
    assert.strictEqual(d.objectives.daily[0].text, 'Caminar');
  });
});

describe('shouldPersistOnUnload', () => {
  const mem = { updatedAt: '2026-11-13T10:00:00.000Z' };
  const raw = (updatedAt) => JSON.stringify(updatedAt ? { updatedAt } : {});
  it('no guarda si la clave ya no existe', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, null), false));
  it('no guarda si lo guardado no se puede leer', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, 'no es json'), false));
  it('no guarda si lo guardado es más nuevo que la memoria', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T10:00:01.000Z')), false));
  it('guarda si coinciden', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T10:00:00.000Z')), true));
  it('guarda si la memoria es más nueva', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T09:00:00.000Z')), true));
  it('guarda si lo guardado no tiene fecha', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw(null)), true));
  it('no guarda si la memoria no tiene fecha y lo guardado sí', () => assert.strictEqual(storage.shouldPersistOnUnload({}, raw('2026-11-13T09:00:00.000Z')), false));
});

describe('borrado sin confirm', () => {
  const sembrar = () => localStorage.setItem(KEY, JSON.stringify(storage.ensureDataShape({
    version: '1.5', values: [{ id: 'v' }], journal: [{ id: 'j' }], projects: [{ id: 'p' }],
    objectives: { weekly: [{ id: 't' }] }, habits: { graduated: [{ id: 'g' }] }
  })));
  it('clearProductivityData vacía tareas y proyectos y deja el resto', () => {
    sembrar(); storage.clearProductivityData();
    const d = storage.loadData();
    assert.strictEqual(d.objectives.weekly.length, 0);
    assert.strictEqual(d.projects.length, 0);
    assert.strictEqual(d.journal.length, 1);
    assert.strictEqual(d.values.length, 1);
  });
  it('clearJournalData vacía solo el diario', () => {
    sembrar(); storage.clearJournalData();
    const d = storage.loadData();
    assert.strictEqual(d.journal.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearIdentityData vacía valores y hábitos y deja las tareas', () => {
    sembrar(); storage.clearIdentityData();
    const d = storage.loadData();
    assert.strictEqual(d.values.length, 0);
    assert.strictEqual(d.habits.graduated.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearAllData elimina la clave', () => {
    sembrar(); storage.clearAllData();
    assert.strictEqual(localStorage.getItem(KEY), null);
  });
});

describe('año nuevo', () => {
  it('getNextNotebookYear', () => {
    assert.strictEqual(storage.getNextNotebookYear({ notebook: { year: 2026 } }, new Date('2026-11-13')), 2027);
    assert.strictEqual(storage.getNextNotebookYear({ notebook: { year: 2026 } }, new Date('2028-01-05')), 2028);
    assert.strictEqual(storage.getNextNotebookYear({}, new Date('2026-06-01')), 2027);
  });
  it('startNewYear conserva identidad y preferencias y limpia el año', () => {
    localStorage.setItem(KEY, JSON.stringify(storage.ensureDataShape({
      version: '1.5', notebook: { year: 2026 }, values: [{ id: 'v' }], journal: [{ id: 'j' }],
      objectives: { weekly: [{ id: 't' }] }, habits: { graduated: [{ id: 'g' }], history: [{ habitId: 'g' }] },
      burkemanSettings: { showReflexiones: false }, onboarding: { completed: true },
      lifeWheel: { evaluations: [{ id: 'e' }] }
    })));
    const esperado = storage.getNextNotebookYear(storage.loadData());
    const d = storage.startNewYear([{ year: 2026 }]);
    assert.strictEqual(d.notebook.year, esperado);
    assert.strictEqual(d.notebook.name, `Cuaderno ${esperado}`);
    assert.strictEqual(d.values.length, 1);
    assert.strictEqual(d.habits.graduated.length, 1);
    assert.strictEqual(d.habits.history.length, 0);
    assert.strictEqual(d.journal.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 0);
    assert.strictEqual(d.burkemanSettings.showReflexiones, false);
    assert.strictEqual(d.onboarding.completed, true);
    assert.strictEqual(d.lifeWheel.evaluations.length, 1);
    assert.deepStrictEqual(d.archivedNotebooks, [{ year: 2026 }]);
    assert.strictEqual(storage.loadData().notebook.year, esperado);
  });
});

describe('importación', () => {
  it('rechaza texto que no es JSON', () => {
    assert.throws(() => storage.parseImportText('esto no es json {{{'), /No es un archivo JSON válido/);
  });
  it('rechaza una lista', () => {
    assert.throws(() => storage.parseImportText('[1,2,3]'), /Archivo no válido/);
  });
  it('rechaza un objeto ajeno a Oráculo', () => {
    assert.throws(() => storage.parseImportText('{"foo":1}'), /Archivo no válido/);
  });
  it('acepta un backup y lo devuelve sin transformar', () => {
    const d = storage.parseImportText('{"version":"1.5","objectives":{"daily":[]}}');
    assert.deepStrictEqual(d, { version: '1.5', objectives: { daily: [] } });
  });
  it('summarizeBackup cuenta tareas pendientes y entradas de diario', () => {
    const s = storage.summarizeBackup({ objectives: { backlog: [{}, {}], weekly: [{}], completed: [{}] }, journal: [{}, {}, {}] });
    assert.deepStrictEqual(s, { tasks: 3, journalEntries: 3 });
    assert.deepStrictEqual(storage.summarizeBackup({}), { tasks: 0, journalEntries: 0 });
  });
  it('applyImportedData guarda copia de lo anterior y deja datos completos', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', objectives: { backlog: [{ id: 'viejo' }] } }));
    const ok = storage.applyImportedData({ version: '1.5', objectives: { backlog: [{ id: 'nuevo' }] } });
    assert.strictEqual(ok, true);
    assert.ok(localStorage.getItem('oraculo_data_backup').includes('viejo'));
    const d = storage.loadData();
    assert.strictEqual(d.objectives.backlog[0].id, 'nuevo');
    assert.ok(Array.isArray(d.values));
  });
});

describe('datos corruptos', () => {
  it('conserva el original, arranca con datos por defecto y lo comunica una vez', () => {
    localStorage.setItem(KEY, '{"version":"1.5","objectives":{"backlog":[{"id":"a"');
    const d = storage.loadData();
    assert.ok(Array.isArray(d.objectives.backlog));
    assert.strictEqual(localStorage.getItem('oraculo_data_corrupt'), '{"version":"1.5","objectives":{"backlog":[{"id":"a"');
    assert.strictEqual(storage.consumeLoadIssue(), 'corrupt');
    assert.strictEqual(storage.consumeLoadIssue(), null);
  });
  it('una carga normal no deja incidencia', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5' }));
    storage.loadData();
    assert.strictEqual(storage.consumeLoadIssue(), null);
  });
});

describe('elementos sueltos', () => {
  it('descarta de las listas del modelo los elementos que no son objetos', () => {
    const d = storage.ensureDataShape({
      version: '1.5',
      values: [null, { id: 'v1', name: 'Salud' }],
      journal: ['texto'],
      objectives: { weekly: [null, { id: 't1' }] }
    });

    assert.deepStrictEqual(d.values, [{ id: 'v1', name: 'Salud' }]);
    assert.deepStrictEqual(d.journal, []);
    assert.deepStrictEqual(d.objectives.weekly, [{ id: 't1' }]);
  });

  it('es idempotente', () => {
    const una = storage.ensureDataShape({ version: '1.5', values: [null, { id: 'v1' }] });
    const copia = JSON.stringify(una);
    assert.strictEqual(JSON.stringify(storage.ensureDataShape(una)), copia);
  });

  it('loadData deja los datos sin elementos sueltos', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [null, { id: 'v1' }], projects: [null] }));
    const d = storage.loadData();

    assert.strictEqual(d.values.length, 1);
    assert.strictEqual(d.values[0].id, 'v1');
    assert.deepStrictEqual(d.projects, []);
  });

  it('loadData deja los números del modelo en su sitio', () => {
    localStorage.setItem(KEY, JSON.stringify({
      version: '1.5',
      lifeWheel: { evaluations: [{ scores: { health: { current: '<img src=x onerror=alert(1)>', desired: '9' } } }] },
      muevete: { activityLog: { entries: [{ completed: 'x', earlyEnds: 1 }] }, timerState: { blocksCompleted: '<svg onload=alert(1)>' } },
      notebook: { year: '2026' }
    }));
    const d = storage.loadData();

    assert.strictEqual(d.lifeWheel.evaluations[0].scores.health.current, 0);
    assert.strictEqual(d.lifeWheel.evaluations[0].scores.health.desired, 9);
    assert.strictEqual(d.muevete.activityLog.entries[0].completed, 0);
    assert.strictEqual(d.muevete.timerState.blocksCompleted, 0);
    assert.strictEqual(d.notebook.year, 2026);
  });
});

describe('generateYearSummary', () => {
  it('cuenta las tareas movidas a completadas', () => {
    const s = storage.generateYearSummary(storage.ensureDataShape({
      version: '1.5',
      objectives: { weekly: [{ completed: true }, { completed: false }], completed: [{ completed: true }, { completed: true }] }
    }));
    assert.strictEqual(s.totalTasksCompleted, 3);
  });
});
