/**
 * Tests para el validador de datos
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { validateDataStructure, sanearIdentificadores, descartarElementosInvalidos, normalizarHorizontes, normalizarContadores, comprobarBackupCopiable } from '../js/utils/validator.js';

// ============================================================
// Tests para validateDataStructure
// ============================================================
describe('validateDataStructure', () => {

  // === Tests de rechazo ===

  it('debe rechazar null', () => {
    const result = validateDataStructure(null);

    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('objeto JSON válido'));
  });

  it('debe rechazar undefined', () => {
    const result = validateDataStructure(undefined);

    assert.strictEqual(result.valid, false);
  });

  it('debe rechazar strings', () => {
    const result = validateDataStructure('not an object');

    assert.strictEqual(result.valid, false);
  });

  it('debe rechazar arrays', () => {
    const result = validateDataStructure([1, 2, 3]);

    assert.strictEqual(result.valid, false);
  });

  it('debe rechazar secciones con un tipo equivocado', () => {
    for (const malo of [{ values: 1 }, { journal: {} }, { projects: 'x' }, { objectives: [] }, { habits: 'x' }, { settings: [] }, { calendar: 3 }]) {
      assert.strictEqual(validateDataStructure(malo).valid, false, JSON.stringify(malo));
    }
  });

  it('debe rechazar identificadores con caracteres que rompen el marcado', () => {
    const malId = 'x" onmouseover="alert(1)';
    for (const malo of [
      { version: '1.5', values: [{ id: malId, name: 'Salud' }] },
      { version: '1.5', objectives: { daily: [{ id: 'ok', text: 'Tarea', projectId: malId }] } },
      { version: '1.5', habits: { history: [{ habitId: malId, date: '2026-11-14' }] } },
      { version: '1.5', dailySetup: { rocaPrincipal: malId } }
    ]) {
      const result = validateDataStructure(malo);
      assert.strictEqual(result.valid, false, JSON.stringify(malo));
      assert.ok(/identificador/i.test(result.error), result.error);
    }
  });

  it('debe aceptar identificadores normales', () => {
    const resultado = validateDataStructure({
      version: '1.5',
      values: [{ id: 'v1', name: 'Salud' }],
      objectives: { daily: [{ id: 't1', text: 'Caminar', projectId: 'p1' }] },
      habits: { history: [{ habitId: 'h1', date: '2026-11-14' }] }
    });
    assert.strictEqual(resultado.valid, true);
  });

  it('debe rechazar objetos sin campos de Oráculo', () => {
    const result = validateDataStructure({ foo: 'bar', random: 123 });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('no parece ser un backup de Oráculo'));
  });

  // === Tests de aceptación ===

  it('debe aceptar objeto con campo "version"', () => {
    const result = validateDataStructure({ version: '1.5' });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "createdAt"', () => {
    const result = validateDataStructure({ createdAt: '2025-01-01T00:00:00Z' });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "objectives"', () => {
    const result = validateDataStructure({ objectives: { daily: [] } });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "habits"', () => {
    const result = validateDataStructure({ habits: { active: null } });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "values"', () => {
    const result = validateDataStructure({ values: [] });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "journal"', () => {
    const result = validateDataStructure({ journal: [] });

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar objeto con campo "settings"', () => {
    const result = validateDataStructure({ settings: {} });

    assert.strictEqual(result.valid, true);
  });

  // === Tests de advertencias ===

  it('debe añadir advertencias para campos faltantes', () => {
    const result = validateDataStructure({ version: '1.0' });

    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings?.length > 0);
    assert.ok(result.warnings[0].includes('Campos faltantes'));
  });

  it('debe advertir si objectives.daily no es array', () => {
    const result = validateDataStructure({
      version: '1.5',
      createdAt: '2025-01-01',
      objectives: { daily: 'not an array' },
      habits: {},
      settings: {}
    });

    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes('objectives.daily no es un array')));
  });

  it('debe advertir si habits.history no es array', () => {
    const result = validateDataStructure({
      version: '1.5',
      createdAt: '2025-01-01',
      objectives: {},
      habits: { history: 'not an array' },
      settings: {}
    });

    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.includes('habits.history no es un array')));
  });

  // === Tests de estructura completa ===

  it('debe aceptar estructura completa sin advertencias críticas', () => {
    const completeData = {
      version: '1.5',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
      values: [{ id: '1', name: 'Salud' }],
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
        audit: { activities: [], lastAuditAt: null }
      },
      calendar: { events: [], recurring: [] },
      journal: [],
      projects: [],
      settings: { storageType: 'localStorage' },
      dailySetup: { date: null },
      spontaneousAchievements: [],
      atelicActivities: [],
      burkemanSettings: {}
    };

    const result = validateDataStructure(completeData);

    assert.strictEqual(result.valid, true);
    // No debería tener advertencias de campos faltantes
    const hasMissingFieldsWarning = result.warnings?.some(w => w.includes('Campos faltantes'));
    assert.strictEqual(hasMissingFieldsWarning, false, 'No debería faltar ningún campo recomendado');
  });

  // === Tests de compatibilidad hacia atrás ===

  it('debe aceptar datos de versión 1.2 (sin Burkeman)', () => {
    const oldData = {
      version: '1.2',
      createdAt: '2024-06-01',
      values: [],
      objectives: { daily: [] },
      habits: { active: null, graduated: [], history: [] },
      settings: {}
    };

    const result = validateDataStructure(oldData);

    assert.strictEqual(result.valid, true);
  });

  it('debe aceptar datos de versión 1.3 (con Burkeman básico)', () => {
    const oldData = {
      version: '1.3',
      createdAt: '2024-09-01',
      objectives: { daily: [] },
      habits: { active: null },
      dailySetup: { date: null },
      spontaneousAchievements: []
    };

    const result = validateDataStructure(oldData);

    assert.strictEqual(result.valid, true);
  });
});

describe('sanearIdentificadores', () => {
  it('deja intactos los identificadores que ya son seguros', () => {
    const data = {
      version: '1.5',
      values: [{ id: 'v1', name: 'Salud' }],
      objectives: { daily: [{ id: 't1', text: 'Caminar', projectId: 'p1' }] }
    };
    const copia = JSON.parse(JSON.stringify(data));

    sanearIdentificadores(data);

    assert.deepStrictEqual(data, copia);
  });

  it('quita de un identificador los caracteres que rompen el marcado', () => {
    const data = {
      values: [{ id: 'x" onmouseover="alert(1)', name: 'Salud' }],
      objectives: { daily: [{ id: 'ok', text: 'Tarea', projectId: 'y"><img src=x onerror=alert(1)>' }] }
    };

    sanearIdentificadores(data);

    for (const id of [data.values[0].id, data.objectives.daily[0].projectId]) {
      assert.ok(!id.includes('"'), id);
      assert.ok(!id.includes('<'), id);
      assert.ok(!id.includes('>'), id);
      assert.ok(!id.includes(' '), id);
      assert.ok(/^[A-Za-z0-9._-]+$/.test(id), id);
    }
  });

  it('normaliza igual un identificador y las referencias que apuntan a él', () => {
    const data = {
      projects: [{ id: 'p 1', name: 'Viaje' }],
      objectives: { daily: [{ id: 't1', text: 'Tarea', projectId: 'p 1' }] }
    };

    sanearIdentificadores(data);

    assert.strictEqual(data.objectives.daily[0].projectId, data.projects[0].id);
  });

  it('sustituye por un identificador seguro el que se queda sin caracteres', () => {
    const data = { values: [{ id: '"><', name: 'Salud' }] };

    sanearIdentificadores(data);

    assert.ok(/^[A-Za-z0-9._-]+$/.test(data.values[0].id), data.values[0].id);
    assert.ok(data.values[0].id.length > 0);
  });

  it('mantiene el vínculo cuando el identificador se queda sin caracteres', () => {
    const data = {
      projects: [{ id: '"><', name: 'Viaje' }],
      objectives: { daily: [{ id: 't1', text: 'Tarea', projectId: '"><' }] }
    };

    sanearIdentificadores(data);

    assert.strictEqual(data.objectives.daily[0].projectId, data.projects[0].id);
  });

  it('normaliza también la roca principal y el historial de hábitos', () => {
    const data = {
      dailySetup: { rocaPrincipal: 'r 1' },
      habits: { history: [{ habitId: 'h 1', date: '2026-11-14' }] }
    };

    sanearIdentificadores(data);

    assert.strictEqual(data.dailySetup.rocaPrincipal, 'r1');
    assert.strictEqual(data.habits.history[0].habitId, 'h1');
  });

  it('no rompe con datos que no son un objeto', () => {
    for (const malo of [null, undefined, 42, 'texto']) {
      assert.doesNotThrow(() => sanearIdentificadores(malo));
    }
  });
});

describe('elementos inválidos en las listas', () => {
  it('rechaza un elemento nulo en values', () => {
    const result = validateDataStructure({ version: '1.5', values: [null] });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('values'), result.error);
  });

  it('rechaza un elemento nulo en projects y en journal', () => {
    for (const seccion of ['projects', 'journal']) {
      const result = validateDataStructure({ version: '1.5', [seccion]: [null] });
      assert.strictEqual(result.valid, false, seccion);
      assert.ok(result.error.includes(seccion), result.error);
    }
  });

  it('rechaza un elemento que no es un objeto', () => {
    const result = validateDataStructure({ version: '1.5', values: ['texto'] });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes('values'), result.error);
  });

  it('rechaza un elemento nulo en las listas anidadas', () => {
    const resultadoDaily = validateDataStructure({ version: '1.5', objectives: { daily: [null] } });
    assert.strictEqual(resultadoDaily.valid, false);
    assert.ok(resultadoDaily.error.includes('objectives.daily'), resultadoDaily.error);

    const resultadoEventos = validateDataStructure({ version: '1.5', calendar: { events: [null] } });
    assert.strictEqual(resultadoEventos.valid, false);
    assert.ok(resultadoEventos.error.includes('calendar.events'), resultadoEventos.error);

    const resultadoAreas = validateDataStructure({ version: '1.5', lifeWheel: { areas: [null] } });
    assert.strictEqual(resultadoAreas.valid, false);
    assert.ok(resultadoAreas.error.includes('lifeWheel.areas'), resultadoAreas.error);
  });

  it('acepta listas con elementos válidos', () => {
    const result = validateDataStructure({
      version: '1.5',
      values: [{ id: 'v1', name: 'Salud' }],
      projects: [{ id: 'p1', name: 'Viaje' }],
      journal: [{ id: 'j1', content: 'Hola' }],
      objectives: { daily: [{ id: 't1', text: 'Caminar' }] },
      calendar: { events: [{ id: 'e1', title: 'Cita' }] },
      lifeWheel: { areas: [{ id: 'health', name: 'Salud física' }] }
    });

    assert.strictEqual(result.valid, true);
  });

  it('acepta listas vacías', () => {
    const result = validateDataStructure({ version: '1.5', values: [], projects: [], journal: [] });

    assert.strictEqual(result.valid, true);
  });
});

describe('descartarElementosInvalidos', () => {
  it('descarta los elementos que no son objetos y deja el resto', () => {
    const data = {
      values: [null, { id: 'v1', name: 'Salud' }],
      journal: ['texto', { id: 'j1' }],
      projects: [undefined]
    };

    const descartados = descartarElementosInvalidos(data);

    assert.strictEqual(descartados, 3);
    assert.deepStrictEqual(data.values, [{ id: 'v1', name: 'Salud' }]);
    assert.deepStrictEqual(data.journal, [{ id: 'j1' }]);
    assert.deepStrictEqual(data.projects, []);
  });

  it('descarta también los elementos sueltos de las listas anidadas', () => {
    const data = {
      objectives: { weekly: [null, { id: 't1' }] },
      calendar: { events: [null] },
      lifeWheel: { areas: [null, { id: 'health' }] },
      habits: { history: [null, { habitId: 'h1' }] },
      muevete: { activityLog: { entries: [null, { date: '2026-11-15' }] } }
    };

    descartarElementosInvalidos(data);

    assert.deepStrictEqual(data.objectives.weekly, [{ id: 't1' }]);
    assert.deepStrictEqual(data.calendar.events, []);
    assert.deepStrictEqual(data.lifeWheel.areas, [{ id: 'health' }]);
    assert.deepStrictEqual(data.habits.history, [{ habitId: 'h1' }]);
    assert.deepStrictEqual(data.muevete.activityLog.entries, [{ date: '2026-11-15' }]);
  });

  it('no toca las listas que no existen y aguanta datos que no son un objeto', () => {
    const data = { version: '1.5' };

    assert.strictEqual(descartarElementosInvalidos(data), 0);
    assert.strictEqual(descartarElementosInvalidos(null), 0);
    assert.strictEqual(descartarElementosInvalidos('texto'), 0);
  });
});

describe('normalizarHorizontes', () => {
  it('deja el horizonte de origen si es uno del modelo', () => {
    const data = { objectives: { daily: [{ id: 't1', movedFrom: 'monthly' }] } };

    assert.strictEqual(normalizarHorizontes(data), 0);
    assert.strictEqual(data.objectives.daily[0].movedFrom, 'monthly');
  });

  it('sustituye por el horizonte de por defecto el que no existe', () => {
    const data = {
      objectives: {
        daily: [{ id: 't1', movedFrom: '"><img src=x onerror=alert(1)>' }],
        weekly: [{ id: 't2', movedFrom: 'inventado' }]
      }
    };

    assert.strictEqual(normalizarHorizontes(data), 2);
    assert.strictEqual(data.objectives.daily[0].movedFrom, 'weekly');
    assert.strictEqual(data.objectives.weekly[0].movedFrom, 'weekly');
  });

  it('no toca las tareas sin horizonte de origen ni las que no son objetos', () => {
    const data = { objectives: { daily: [{ id: 't1' }, null] } };

    assert.strictEqual(normalizarHorizontes(data), 0);
    assert.strictEqual(data.objectives.daily[0].movedFrom, undefined);
  });

  it('aguanta datos que no son un objeto', () => {
    assert.strictEqual(normalizarHorizontes(null), 0);
    assert.strictEqual(normalizarHorizontes('texto'), 0);
  });
});

describe('normalizarContadores', () => {
  it('deja los contadores que ya son números', () => {
    const data = { archivedNotebooks: [{ year: 2025, summary: { totalTasksCompleted: 12, journalEntries: 3 } }] };

    assert.strictEqual(normalizarContadores(data), 0);
    assert.strictEqual(data.archivedNotebooks[0].summary.totalTasksCompleted, 12);
  });

  it('sustituye por cero el contador que no es un número', () => {
    const data = {
      archivedNotebooks: [{
        year: 2025,
        summary: { totalTasksCompleted: '<img src=x onerror=alert(1)>', journalEntries: '5' }
      }]
    };

    assert.strictEqual(normalizarContadores(data), 1);
    assert.strictEqual(data.archivedNotebooks[0].summary.totalTasksCompleted, 0);
    assert.strictEqual(data.archivedNotebooks[0].summary.journalEntries, 5);
  });

  it('no toca los cuadernos sin resumen ni los que no son objetos', () => {
    const data = { archivedNotebooks: [{ year: 2025 }, null] };

    assert.strictEqual(normalizarContadores(data), 0);
    assert.strictEqual(data.archivedNotebooks[0].summary, undefined);
  });

  it('aguanta datos que no son un objeto', () => {
    assert.strictEqual(normalizarContadores(null), 0);
    assert.strictEqual(normalizarContadores('texto'), 0);
    assert.strictEqual(normalizarContadores({}), 0);
  });
});

// ============================================================
// Tests para comprobarBackupCopiable
// ============================================================

describe('comprobarBackupCopiable', () => {
  // Backup mínimo con la forma de Oráculo y sin nada escrito.
  const backupVacio = () => ({
    version: '1.5',
    createdAt: '2026-01-01T00:00:00.000Z',
    values: [],
    objectives: { backlog: [], quarterly: [], monthly: [], weekly: [], daily: [] },
    habits: { active: null, graduated: [], history: [] },
    calendar: { events: [], recurring: [] },
    journal: [],
    projects: [],
    settings: {},
    lifeWheel: { areas: [], evaluations: [] },
    objectiveEvaluation: { criteria: [], evaluations: [] },
    archivedNotebooks: [],
    spontaneousAchievements: [],
    atelicActivities: [],
    dailySetup: { date: null },
    muevete: { activityLog: { entries: [] } }
  });

  it('rechaza lo que no está guardado', () => {
    assert.strictEqual(comprobarBackupCopiable(null, null).ok, false);
    assert.strictEqual(comprobarBackupCopiable(null, null).motivo, 'ilegible');
    assert.strictEqual(comprobarBackupCopiable(undefined, null).motivo, 'ilegible');
    assert.strictEqual(comprobarBackupCopiable('', null).motivo, 'ilegible');
    assert.strictEqual(comprobarBackupCopiable('   ', null).motivo, 'ilegible');
  });

  it('rechaza lo que no se puede leer como JSON', () => {
    const resultado = comprobarBackupCopiable('{esto no es json', null);

    assert.strictEqual(resultado.ok, false);
    assert.strictEqual(resultado.motivo, 'ilegible');
  });

  it('rechaza lo que no es un backup de Oráculo', () => {
    const resultado = comprobarBackupCopiable(JSON.stringify({ hola: 'mundo' }), null);

    assert.strictEqual(resultado.ok, false);
    assert.strictEqual(resultado.motivo, 'invalido');
  });

  it('rechaza lo que se va a copiar si no es un backup válido', () => {
    const raw = JSON.stringify(backupVacio());

    assert.strictEqual(comprobarBackupCopiable(raw, 'texto').motivo, 'invalido');
    assert.strictEqual(comprobarBackupCopiable(raw, null).motivo, 'invalido');
  });

  it('acepta un backup con elementos sueltos si lo que se copia ya está limpio', () => {
    // Es lo que pasa tras una carga reparada: en el almacenamiento sigue
    // habiéndolo, pero lo que se copia es la copia ya limpiada. La app avisa
    // de la reparación, así que la copia no puede negarse a Copy Data.
    const guardado = { version: '1.5', journal: [null, { id: 'j1', content: 'Una entrada' }] };
    const limpio = { version: '1.5', journal: [{ id: 'j1', content: 'Una entrada' }] };

    const resultado = comprobarBackupCopiable(JSON.stringify(guardado), limpio);

    assert.strictEqual(resultado.ok, true);
    assert.strictEqual(resultado.motivo, null);
    assert.deepStrictEqual(resultado.data.journal, [{ id: 'j1', content: 'Una entrada' }]);
  });

  it('rechaza un backup válido pero vacío', () => {
    const backup = backupVacio();

    const resultado = comprobarBackupCopiable(JSON.stringify(backup), backup);

    assert.strictEqual(resultado.ok, false);
    assert.strictEqual(resultado.motivo, 'vacio');
  });

  it('acepta un backup con contenido y lo devuelve', () => {
    const backup = backupVacio();
    backup.journal = [{ id: 'j1', content: 'Una entrada' }];

    const resultado = comprobarBackupCopiable(JSON.stringify(backup), backup);

    assert.strictEqual(resultado.ok, true);
    assert.strictEqual(resultado.motivo, null);
    assert.deepStrictEqual(resultado.data.journal, [{ id: 'j1', content: 'Una entrada' }]);
  });

  it('acepta contenido en cualquiera de las secciones del modelo', () => {
    const casos = [
      ['values', { values: [{ id: 'v1' }] }],
      ['proyectos', { projects: [{ id: 'p1' }] }],
      ['tarea en el backlog', { objectives: { backlog: [{ id: 't1' }] } }],
      ['tarea completada', { objectives: { completed: [{ id: 't1' }] } }],
      ['hábito activo', { habits: { active: { id: 'h1', name: 'Caminar' } } }],
      ['historial de hábito', { habits: { history: [{ habitId: 'h1' }] } }],
      ['hábito graduado', { habits: { graduated: [{ id: 'h1' }] } }],
      ['auditoría de hábito', { habits: { audit: { activities: [{ id: 'a1' }] } } }],
      ['evento de calendario', { calendar: { events: [{ id: 'e1' }] } }],
      ['evento recurrente', { calendar: { recurring: [{ id: 'e1' }] } }],
      ['logro espontáneo', { spontaneousAchievements: [{ id: 's1' }] }],
      ['actividad atélica', { atelicActivities: [{ id: 'at1' }] }],
      ['cuaderno archivado', { archivedNotebooks: [{ year: 2025 }] }],
      ['notas del setup diario', { dailySetup: { potentialObstacle: 'Me cuesta levantarme' } }],
      ['evaluación de la rueda', { lifeWheel: { evaluations: [{ id: 'w1' }] } }],
      ['evaluación de objetivos', { objectiveEvaluation: { evaluations: [{ id: 'o1' }] } }],
      ['registro de Muévete', { muevete: { activityLog: { entries: [{ date: '2026-11-15' }] } } }]
    ];

    for (const [nombre, parcial] of casos) {
      const backup = { ...backupVacio(), ...parcial };
      const resultado = comprobarBackupCopiable(JSON.stringify(backup), backup);
      assert.strictEqual(resultado.ok, true, `debería aceptar: ${nombre}`);
    }
  });

  it('no cuenta como contenido lo que viene por defecto en un cuaderno nuevo', () => {
    const backup = backupVacio();
    backup.onboarding = { completed: true, completedAt: '2026-01-01T00:00:00.000Z' };
    backup.notebook = { year: 2026, name: 'Cuaderno 2026' };
    backup.burkemanSettings = { showReflexiones: true };
    backup.muevete.timerState = { status: 'idle', workBlockDuration: 7200000 };
    // Haber hecho el setup del día no es contenido: un cuaderno recién creado
    // lo tiene hecho y sigue vacío.
    backup.dailySetup = { date: '2026-11-15', dailyLimit: 3 };

    const resultado = comprobarBackupCopiable(JSON.stringify(backup), backup);

    assert.strictEqual(resultado.ok, false);
    assert.strictEqual(resultado.motivo, 'vacio');
  });
});
