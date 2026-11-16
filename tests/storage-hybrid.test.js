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
  it('clearProductivityData vacía tareas y proyectos y deja el resto', async () => {
    sembrar(); await storage.clearProductivityData();
    const d = storage.loadData();
    assert.strictEqual(d.objectives.weekly.length, 0);
    assert.strictEqual(d.projects.length, 0);
    assert.strictEqual(d.journal.length, 1);
    assert.strictEqual(d.values.length, 1);
  });
  it('clearJournalData vacía solo el diario', async () => {
    sembrar(); await storage.clearJournalData();
    const d = storage.loadData();
    assert.strictEqual(d.journal.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearIdentityData vacía valores y hábitos y deja las tareas', async () => {
    sembrar(); await storage.clearIdentityData();
    const d = storage.loadData();
    assert.strictEqual(d.values.length, 0);
    assert.strictEqual(d.habits.graduated.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearIdentityData borra la rueda de la vida', async () => {
    localStorage.setItem(KEY, JSON.stringify({
      version: '1.5',
      lifeWheel: { evaluations: [{ id: 'e1', scores: { health: { current: 8 } } }] }
    }));
    await storage.clearIdentityData();
    const d = storage.loadData();
    assert.deepStrictEqual(d.lifeWheel.evaluations, []);
    assert.ok(d.lifeWheel.areas.length > 0, 'los áreas por defecto se mantienen');
  });
  it('clearAllData elimina la clave', async () => {
    sembrar(); await storage.clearAllData();
    assert.strictEqual(localStorage.getItem(KEY), null);
  });

  it('clearAllData elimina también la copia de lo que no se pudo leer', async () => {
    sembrar();
    localStorage.setItem('oraculo_data_corrupt', 'texto que no se pudo leer');

    await storage.clearAllData();

    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
    assert.strictEqual(localStorage.getItem('oraculo_data_corrupt'), null);
  });

  it('los borrados parciales no borran la copia de lo que no se pudo leer', async () => {
    sembrar();
    localStorage.setItem('oraculo_data_corrupt', 'texto que no se pudo leer');

    await storage.clearJournalData();

    assert.strictEqual(storage.tieneCopiaCorrupta(), true);
  });

  it('clearAllData borra las copias que la app guardó en el dispositivo', async () => {
    sembrar();
    localStorage.setItem('oraculo_data_corrupt', 'copia ilegible');
    localStorage.setItem('oraculo_data_backup', 'copia previa a una importación');
    localStorage.setItem('oraculo_data_pre_sync_backup', 'copia previa a una sincronización');
    localStorage.setItem('oraculo_journal_draft', '{"id":"new:free","content":"sin guardar"}');
    localStorage.setItem('oraculo_sync_conflicts', '{"entries":[{"keptVersion":{"content":"diario"}}]}');

    await storage.clearAllData();

    assert.strictEqual(localStorage.getItem('oraculo_data'), null);
    assert.strictEqual(localStorage.getItem('oraculo_data_corrupt'), null);
    assert.strictEqual(localStorage.getItem('oraculo_data_backup'), null);
    assert.strictEqual(localStorage.getItem('oraculo_data_pre_sync_backup'), null);
    assert.strictEqual(localStorage.getItem('oraculo_journal_draft'), null);
    // El registro de conflictos guarda copias literales de las entradas en
    // conflicto: si sobrevive, el texto sigue en el dispositivo.
    assert.strictEqual(localStorage.getItem('oraculo_sync_conflicts'), null);
  });

  it('clearAllData desconecta el puente del Agente IA', async () => {
    sembrar();
    localStorage.setItem('oraculo_mcp_bridge', '{"enabled":true,"folderName":"Oráculo"}');

    await storage.clearAllData();

    assert.strictEqual(localStorage.getItem('oraculo_mcp_bridge'), null);
  });

  it('clearAllData corta la conexión con la nube', async () => {
    sembrar();
    localStorage.setItem('oraculo_gdrive_sync', '{"connected":true,"fileId":"abc"}');
    localStorage.setItem('oraculo_gdrive_token', 'token-drive');
    localStorage.setItem('oraculo_gdrive_token_expiry', '123');
    localStorage.setItem('oraculo_gauth_token_scope_drive', 'token-web');
    localStorage.setItem('oraculo_gauth_token_expiry_scope_drive', '123');
    localStorage.setItem('oraculo_gcal_settings', '{"email":"correo@ejemplo.com"}');
    localStorage.setItem('oraculo_habitWizardProgress', '{"name":"Caminar"}');
    localStorage.setItem('oraculo_lastAutoBackupAt', '2026-11-01');

    await storage.clearAllData();

    // Si la conexión se queda, la nube devuelve el cuaderno que la usuaria
    // acaba de borrar.
    assert.strictEqual(localStorage.getItem('oraculo_gdrive_sync'), null);
    assert.strictEqual(localStorage.getItem('oraculo_gdrive_token'), null);
    assert.strictEqual(localStorage.getItem('oraculo_gdrive_token_expiry'), null);
    assert.strictEqual(localStorage.getItem('oraculo_gauth_token_scope_drive'), null);
    assert.strictEqual(localStorage.getItem('oraculo_gauth_token_expiry_scope_drive'), null);
    assert.strictEqual(localStorage.getItem('oraculo_gcal_settings'), null);
    assert.strictEqual(localStorage.getItem('oraculo_habitWizardProgress'), null);
    assert.strictEqual(localStorage.getItem('oraculo_lastAutoBackupAt'), null);
  });

  it('los borrados parciales conservan las copias del dispositivo', async () => {
    sembrar();
    const copia = JSON.stringify({
      version: '1.5',
      journal: [{ id: 'j1', content: 'Texto del diario' }],
      values: [{ id: 'v1', name: 'Salud' }],
      objectives: { daily: [{ id: 't1', text: 'Tarea' }] }
    });
    localStorage.setItem('oraculo_data_backup', copia);
    localStorage.setItem('oraculo_data_pre_sync_backup', copia);
    localStorage.setItem('oraculo_sync_conflicts', '{"entries":[{"keptVersion":{"content":"conflicto"}}]}');
    localStorage.setItem('oraculo_journal_draft', '{"id":"new:free","content":"sin guardar"}');

    await storage.clearJournalData();

    // Las copias son la red de la usuaria si borra sin querer: el borrado
    // parcial no las toca.
    assert.deepStrictEqual(JSON.parse(localStorage.getItem('oraculo_data_backup')).journal, [{ id: 'j1', content: 'Texto del diario' }]);
    assert.deepStrictEqual(JSON.parse(localStorage.getItem('oraculo_data_pre_sync_backup')).journal, [{ id: 'j1', content: 'Texto del diario' }]);
    assert.notStrictEqual(localStorage.getItem('oraculo_sync_conflicts'), null);

    // El borrador sí se borra: es texto que está en pantalla.
    assert.strictEqual(localStorage.getItem('oraculo_journal_draft'), null);
  });

  it('los borrados parciales conservan la sección que toca en las copias', async () => {
    sembrar();
    const copia = JSON.stringify({
      version: '1.5',
      values: [{ id: 'v1', name: 'Salud' }],
      journal: [{ id: 'j1', content: 'Texto del diario' }]
    });
    localStorage.setItem('oraculo_data_backup', copia);

    await storage.clearIdentityData();

    const copiaRestante = JSON.parse(localStorage.getItem('oraculo_data_backup'));
    assert.deepStrictEqual(copiaRestante.values, [{ id: 'v1', name: 'Salud' }]);
    assert.strictEqual(copiaRestante.journal.length, 1);
  });

  it('borrar la identidad borra el progreso del asistente de hábitos', async () => {
    sembrar();
    localStorage.setItem('oraculo_habitWizardProgress', '{"step":3,"data":{"name":"Hábito privado"}}');

    await storage.clearIdentityData();

    // El progreso guarda el nombre, la identidad, el lugar y la hora del
    // hábito: es contenido de la usuaria, igual que el hábito activo.
    assert.strictEqual(localStorage.getItem('oraculo_habitWizardProgress'), null);
  });

  it('importar un archivo de otra versión deja el cuaderno en la versión actual', () => {
    const datos = storage.parseImportText('{"version":"1.4","values":[{"id":"v1","name":"Salud ósea"}]}');

    storage.applyImportedData(datos);

    const guardado = JSON.parse(localStorage.getItem(KEY));
    assert.strictEqual(guardado.version, '1.5');
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

describe('importación de un archivo', () => {
  it('no deja pasar claves que pueden romper el objeto de datos', () => {
    const texto = '{"version":"1.5","values":[],"__proto__":{"polluted":true},"constructor":{"x":1},"toString":"666"}';

    const datos = storage.parseImportText(texto);

    assert.strictEqual(Object.hasOwn(datos, '__proto__'), false);
    assert.strictEqual(Object.hasOwn(datos, 'constructor'), false);
    assert.strictEqual(Object.hasOwn(datos, 'toString'), false);
    assert.strictEqual({}.polluted, undefined);
  });

  it('rechaza un archivo demasiado profundo con un mensaje propio', () => {
    const anidado = '['.repeat(300) + '1' + ']'.repeat(300);
    const texto = `{"version":"1.5","values":[],"caja":${anidado}}`;

    assert.throws(() => storage.parseImportText(texto), /profundo|complejo/i);
  });

  it('acepta un archivo con la forma normal', () => {
    const texto = '{"version":"1.5","values":[{"id":"v1","name":"Salud ósea"}],"journal":[]}';

    const datos = storage.parseImportText(texto);

    assert.strictEqual(datos.values.length, 1);
    assert.strictEqual(datos.values[0].name, 'Salud ósea');
  });

  it('acepta un cuaderno con el registro de borrados del historial', () => {
    // La clave con la que la nube identifica cada elemento borrado del
    // historial lleva dos puntos (`hábito:día`). El registro no va al
    // marcado, así que no tiene por qué cumplir las reglas de los
    // identificadores: si las cumpliera, un cuaderno exportado no se
    // podría importar.
    const texto = JSON.stringify({
      version: '1.5',
      values: [],
      journal: [],
      _deletions: [{ section: 'habits.history', itemId: 'h1:2026-11-09', deletedAt: '2026-11-16T09:00:00.000Z' }]
    });

    const datos = storage.parseImportText(texto);

    assert.strictEqual(datos._deletions.length, 1);
    assert.strictEqual(datos._deletions[0].itemId, 'h1:2026-11-09');
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

describe('copia de datos que no se pudieron leer', () => {
  const COPIA = 'oraculo_data_corrupt';

  it('no hay copia cuando no se ha guardado ninguna', () => {
    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
    assert.strictEqual(storage.leerCopiaCorrupta(), null);
  });

  it('la copia se lee tal cual, sin transformarla', () => {
    localStorage.setItem(COPIA, '{"version":"1.5","objectives":{"backlog":[{"id":"a"');

    assert.strictEqual(storage.tieneCopiaCorrupta(), true);
    assert.strictEqual(storage.leerCopiaCorrupta(), '{"version":"1.5","objectives":{"backlog":[{"id":"a"');
  });

  it('una copia vacía no cuenta como copia', () => {
    localStorage.setItem(COPIA, '');
    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
    assert.strictEqual(storage.leerCopiaCorrupta(), null);

    localStorage.setItem(COPIA, '   ');
    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
    assert.strictEqual(storage.leerCopiaCorrupta(), null);
  });

  it('borrarCopiaCorrupta quita la copia', () => {
    localStorage.setItem(COPIA, 'texto roto');

    storage.borrarCopiaCorrupta();

    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
    assert.strictEqual(storage.leerCopiaCorrupta(), null);
    assert.strictEqual(localStorage.getItem(COPIA), null);
  });

  it('borrarCopiaCorrupta no falla cuando no hay copia', () => {
    assert.doesNotThrow(() => storage.borrarCopiaCorrupta());
    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
  });

  it('la copia que deja la carga se puede leer y borrar', () => {
    localStorage.setItem(KEY, '{"version":"1.5","objectives":{"backlog":[{"id":"a"');

    storage.loadData();

    assert.strictEqual(storage.tieneCopiaCorrupta(), true);
    assert.ok(storage.leerCopiaCorrupta().includes('backlog'));
    // La carga deja avisada la incidencia: se consume aquí para no
    // contaminar las pruebas siguientes.
    storage.consumeLoadIssue();

    storage.borrarCopiaCorrupta();
    assert.strictEqual(storage.tieneCopiaCorrupta(), false);
  });
});

describe('lectura que no debe rearmar el aviso', () => {
  it('loadDataSinIncidencia no deja pendiente el aviso de reparación', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [null, { id: 'v1' }] }));

    storage.loadDataSinIncidencia();

    assert.strictEqual(storage.consumeLoadIssue(), null);
  });

  it('no se come una incidencia que ya estaba pendiente', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [null, { id: 'v1' }] }));

    storage.loadData();
    storage.loadDataSinIncidencia();

    assert.strictEqual(storage.consumeLoadIssue(), 'repaired');
  });

  it('devuelve los datos de la lectura', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [{ id: 'v1', name: 'Salud' }] }));

    const datos = storage.loadDataSinIncidencia();

    assert.strictEqual(datos.values[0].name, 'Salud');
  });

  it('loadDataSinIncidencia no se come el aviso de datos ilegibles', () => {
    localStorage.setItem(KEY, '{"version":"1.5","objectives":{"backlog":[{"id":"a"');

    storage.loadDataSinIncidencia();

    // La usuaria tiene que enterarse de que sus datos no se han podido leer.
    assert.strictEqual(storage.consumeLoadIssue(), 'corrupt');
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

  it('loadData deja la duración del hábito, la atélica y el límite diario en su sitio', () => {
    localStorage.setItem(KEY, JSON.stringify({
      version: '1.5',
      habits: { active: { id: 'h1', name: 'Caminar', duration: -5 } },
      atelicActivities: [{ id: 'a1', name: 'Pasear', duration: -20 }],
      dailySetup: { date: '2026-11-15', dailyLimit: 99 }
    }));
    const d = storage.loadData();

    assert.strictEqual(d.habits.active.duration, 30);
    assert.strictEqual(d.atelicActivities[0].duration, 0);
    assert.strictEqual(d.dailySetup.dailyLimit, 3);
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

describe('guardado', () => {
  it('saveData guarda los datos ya normalizados', () => {
    const datos = storage.ensureDataShape({ version: '1.5' });
    datos.habits.active = { id: 'h1', name: 'Caminar', duration: -5 };
    datos.notebook.year = '<img src=x onerror=alert(1)>';

    storage.saveData(datos);

    const guardado = JSON.parse(localStorage.getItem(KEY));
    assert.strictEqual(guardado.habits.active.duration, 30);
    assert.strictEqual(Number.isInteger(guardado.notebook.year), true);
  });

  it('avisa una sola vez cuando el almacenamiento está lleno', () => {
    const avisos = [];
    const dispatchOriginal = globalThis.window.dispatchEvent;
    const setItemOriginal = localStorage.setItem;

    globalThis.window.dispatchEvent = (evento) => {
      if (evento.type === 'storage-warning') avisos.push(evento);
    };
    localStorage.setItem = () => {
      const error = new Error('almacenamiento lleno');
      error.name = 'QuotaExceededError';
      throw error;
    };

    try {
      storage.saveData({ version: '1.5' });
      storage.saveData({ version: '1.5' });
      storage.saveData({ version: '1.5' });
    } finally {
      globalThis.window.dispatchEvent = dispatchOriginal;
      localStorage.setItem = setItemOriginal;
    }

    assert.strictEqual(avisos.length, 1);
  });

  it('la importación sigue aunque la copia de seguridad no quepa', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5' }));
    const setItemOriginal = localStorage.setItem;
    localStorage.setItem = (k, v) => {
      if (k === KEY + '_backup') {
        const error = new Error('no cabe');
        error.name = 'QuotaExceededError';
        throw error;
      }
      setItemOriginal(k, v);
    };

    let guardado = false;
    try {
      guardado = storage.applyImportedData({ version: '1.5', values: [] });
    } finally {
      localStorage.setItem = setItemOriginal;
    }

    assert.strictEqual(guardado, true);
    assert.ok(localStorage.getItem(KEY));
  });
});

describe('esCuadernoArchivado', () => {
  it('acepta un cuaderno de Oráculo', () => {
    assert.strictEqual(storage.esCuadernoArchivado({ version: '1.5', notebook: { year: 2025 } }), true);
  });

  it('rechaza lo que no es un cuaderno', () => {
    assert.strictEqual(storage.esCuadernoArchivado(null), false);
    assert.strictEqual(storage.esCuadernoArchivado('texto'), false);
    assert.strictEqual(storage.esCuadernoArchivado([]), false);
    assert.strictEqual(storage.esCuadernoArchivado({ version: '1.5' }), false);
    assert.strictEqual(storage.esCuadernoArchivado({ notebook: { year: 2025 } }), false);
    assert.strictEqual(storage.esCuadernoArchivado({ version: '1.5', notebook: '2025' }), false);
  });
});

describe('aviso de carga', () => {
  it('avisa cuando al cargar se ha tenido que descartar algo', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [null, { id: 'v1', name: 'Salud' }] }));

    const d = storage.loadData();
    assert.strictEqual(d.values.length, 1);
    assert.strictEqual(storage.consumeLoadIssue(), 'repaired');
  });

  it('no avisa cuando la carga está limpia', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', values: [{ id: 'v1', name: 'Salud' }] }));

    storage.loadData();
    assert.strictEqual(storage.consumeLoadIssue(), null);
  });
});
