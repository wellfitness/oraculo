/**
 * Tests del módulo de números del modelo (utils/numeros.js)
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  normalizarNumeros,
  normalizarPuntuaciones,
  normalizarContadoresMuévete,
  normalizarAñoCuaderno,
  normalizarDuracionHabito,
  normalizarDuracionesAtelicas,
  normalizarLimiteDiario,
  puntuacionDe
} from '../js/utils/numeros.js';
import { numeroSeguro } from '../js/utils/sanitizer.js';

describe('normalizarPuntuaciones', () => {
  it('deja las puntuaciones que ya son números', () => {
    const data = { lifeWheel: { evaluations: [{ scores: { health: { current: 7, desired: 9 } } }] } };

    assert.strictEqual(normalizarPuntuaciones(data), 0);
    assert.strictEqual(data.lifeWheel.evaluations[0].scores.health.current, 7);
  });

  it('sustituye por cero la puntuación que no es un número', () => {
    const data = {
      lifeWheel: {
        evaluations: [{
          scores: {
            health: { current: '<img src=x onerror=alert(1)>', desired: '8' }
          }
        }]
      }
    };

    assert.strictEqual(normalizarPuntuaciones(data), 2);
    assert.strictEqual(data.lifeWheel.evaluations[0].scores.health.current, 0);
    assert.strictEqual(data.lifeWheel.evaluations[0].scores.health.desired, 8);
  });

  it('aguanta evaluaciones mal formadas', () => {
    const data = { lifeWheel: { evaluations: [null, { scores: null }, { scores: { health: 'x' } }] } };

    // La puntuación que no es un objeto se sustituye por la de cero: el
    // modelo no guarda un valor sucio.
    assert.strictEqual(normalizarPuntuaciones(data), 1);
    assert.deepStrictEqual(data.lifeWheel.evaluations[2].scores.health, { current: 0, desired: 0 });
    assert.strictEqual(normalizarPuntuaciones({}), 0);
  });

  it('sustituye por cero una puntuación que no es un objeto', () => {
    const data = { lifeWheel: { evaluations: [{ scores: { health: 'x', energy: 5 } }] } };

    assert.strictEqual(normalizarPuntuaciones(data), 2);
    assert.deepStrictEqual(data.lifeWheel.evaluations[0].scores.health, { current: 0, desired: 0 });
    assert.deepStrictEqual(data.lifeWheel.evaluations[0].scores.energy, { current: 0, desired: 0 });
  });
});

describe('normalizarContadoresMuévete', () => {
  it('deja los contadores que ya son números', () => {
    const data = { muevete: { activityLog: { entries: [{ completed: 2, earlyEnds: 1 }] }, timerState: { blocksCompleted: 3 } } };

    assert.strictEqual(normalizarContadoresMuévete(data), 0);
    assert.strictEqual(data.muevete.timerState.blocksCompleted, 3);
  });

  it('sustituye por cero el contador que no es un número', () => {
    const data = {
      muevete: {
        activityLog: { entries: [{ completed: '0<img src=x onerror=alert(1)>', earlyEnds: 1 }] },
        timerState: { blocksCompleted: '<svg onload=alert(1)>' }
      }
    };

    assert.strictEqual(normalizarContadoresMuévete(data), 2);
    assert.strictEqual(data.muevete.activityLog.entries[0].completed, 0);
    assert.strictEqual(data.muevete.timerState.blocksCompleted, 0);
  });
});

describe('normalizarAñoCuaderno', () => {
  it('deja el año que ya es un número', () => {
    const data = { notebook: { year: 2026 } };

    assert.strictEqual(normalizarAñoCuaderno(data), 0);
    assert.strictEqual(data.notebook.year, 2026);
  });

  it('convierte el año en número y descarta el que no lo es', () => {
    const data = { notebook: { year: '2026' } };
    assert.strictEqual(normalizarAñoCuaderno(data), 1);
    assert.strictEqual(data.notebook.year, 2026);

    const hostil = { notebook: { year: '<img src=x onerror=alert(1)>' } };
    assert.strictEqual(normalizarAñoCuaderno(hostil), 1);
    assert.strictEqual(Number.isInteger(hostil.notebook.year), true);
  });
});

describe('normalizarDuracionHabito', () => {
  it('deja la duración que ya es un número', () => {
    const data = { habits: { active: { id: 'h1', duration: 30 } } };

    assert.strictEqual(normalizarDuracionHabito(data), 0);
    assert.strictEqual(data.habits.active.duration, 30);
  });

  it('sustituye por 30 la duración que no es un número', () => {
    const data = { habits: { active: { id: 'h1', duration: '<img src=x onerror=alert(1)>' } } };

    assert.strictEqual(normalizarDuracionHabito(data), 1);
    assert.strictEqual(data.habits.active.duration, 30);
  });

  it('normaliza también la duración de las actividades del hábito', () => {
    const data = { habits: { active: { activities: [{ id: 'a1', duration: '<svg onload=alert(1)>' }] } } };

    // Una corrección por la duración del hábito, que estaba ausente, y otra
    // por la duración de la actividad.
    assert.strictEqual(normalizarDuracionHabito(data), 2);
    assert.strictEqual(data.habits.active.duration, 30);
    assert.strictEqual(data.habits.active.activities[0].duration, 0);
  });

  it('sustituye por 30 una duración negativa', () => {
    const data = { habits: { active: { id: 'h1', duration: -5 } } };

    assert.strictEqual(normalizarDuracionHabito(data), 1);
    assert.strictEqual(data.habits.active.duration, 30);
  });

  it('sustituye por 30 una duración vacía o nula', () => {
    const vacia = { habits: { active: { id: 'h1', duration: '' } } };
    assert.strictEqual(normalizarDuracionHabito(vacia), 1);
    assert.strictEqual(vacia.habits.active.duration, 30);

    const nula = { habits: { active: { id: 'h1', duration: null } } };
    assert.strictEqual(normalizarDuracionHabito(nula), 1);
    assert.strictEqual(nula.habits.active.duration, 30);

    const ausente = { habits: { active: { id: 'h1' } } };
    assert.strictEqual(normalizarDuracionHabito(ausente), 1);
    assert.strictEqual(ausente.habits.active.duration, 30);
  });

  it('deja el valor guardado igual al valor que se pinta', () => {
    const data = { habits: { active: { id: 'h1', duration: '' } } };
    normalizarDuracionHabito(data);

    // El pintado usa `numeroSeguro(habit.duration) || 30`: los dos tienen que
    // dar lo mismo o la usuaria ve una cosa y el modelo guarda otra. Si la
    // normalización no existiera, lo guardado seguiría vacío y lo pintado
    // sería 30, que es justo lo que este test tiene que detectar.
    const pintado = numeroSeguro(data.habits.active.duration) || 30;

    assert.strictEqual(data.habits.active.duration, pintado);
    assert.strictEqual(pintado, 30);
  });
});

describe('normalizarDuracionesAtelicas', () => {
  it('sustituye por cero la duración que no es un número', () => {
    const data = { atelicActivities: [{ id: 'a1', duration: '<img src=x onerror=alert(1)>' }] };

    assert.strictEqual(normalizarDuracionesAtelicas(data), 1);
    assert.strictEqual(data.atelicActivities[0].duration, 0);
  });

  it('sustituye por cero una duración negativa', () => {
    const data = { atelicActivities: [{ id: 'a1', duration: -20 }] };

    assert.strictEqual(normalizarDuracionesAtelicas(data), 1);
    assert.strictEqual(data.atelicActivities[0].duration, 0);
  });
});

describe('normalizarContadoresMuévete', () => {
  it('normaliza las duraciones del temporizador', () => {
    const data = {
      muevete: {
        timerState: {
          workBlockDuration: '<img src=x onerror=alert(1)>',
          breakDuration: -5,
          soleusInterval: 'abc'
        }
      }
    };

    normalizarContadoresMuévete(data);

    assert.strictEqual(data.muevete.timerState.workBlockDuration, 7200000);
    assert.strictEqual(data.muevete.timerState.breakDuration, 480000);
    assert.strictEqual(data.muevete.timerState.soleusInterval, 1800000);
  });
});

describe('normalizarLimiteDiario', () => {
  it('deja el límite que está en el rango del modelo', () => {
    const data = { dailySetup: { dailyLimit: 2 } };

    assert.strictEqual(normalizarLimiteDiario(data), 0);
    assert.strictEqual(data.dailySetup.dailyLimit, 2);
  });

  it('sustituye por 3 el límite que no es un número o se sale del rango', () => {
    const hostil = { dailySetup: { dailyLimit: '<img src=x onerror=alert(1)>' } };
    assert.strictEqual(normalizarLimiteDiario(hostil), 1);
    assert.strictEqual(hostil.dailySetup.dailyLimit, 3);

    const fueraDeRango = { dailySetup: { dailyLimit: 99 } };
    assert.strictEqual(normalizarLimiteDiario(fueraDeRango), 1);
    assert.strictEqual(fueraDeRango.dailySetup.dailyLimit, 3);
  });
});

describe('normalizarNumeros', () => {
  it('normaliza todo el modelo de una vez', () => {
    const data = {
      lifeWheel: { evaluations: [{ scores: { health: { current: '<b>x</b>', desired: 9 } } }] },
      muevete: { activityLog: { entries: [{ completed: 'x', earlyEnds: 2 }] }, timerState: { blocksCompleted: '3' } },
      notebook: { year: '2026' }
    };

    const corregidos = normalizarNumeros(data);

    assert.strictEqual(corregidos, 4);
    assert.strictEqual(data.lifeWheel.evaluations[0].scores.health.current, 0);
    assert.strictEqual(data.muevete.activityLog.entries[0].completed, 0);
    assert.strictEqual(data.muevete.timerState.blocksCompleted, 3);
    assert.strictEqual(data.notebook.year, 2026);
  });

  it('aguanta datos que no son un objeto', () => {
    assert.strictEqual(normalizarNumeros(null), 0);
    assert.strictEqual(normalizarNumeros('texto'), 0);
    assert.strictEqual(normalizarNumeros([]), 0);
  });
});

describe('puntuacionDe', () => {
  it('devuelve la puntuación con sus números en su sitio', () => {
    const scores = { health: { current: 7, desired: 9, reflection: 'texto' } };

    assert.deepStrictEqual(puntuacionDe(scores, 'health'), { current: 7, desired: 9, reflection: 'texto' });
  });

  it('sustituye por cero la puntuación que no es un número', () => {
    const scores = { health: { current: '<img src=x onerror=alert(1)>', desired: '9' } };
    const score = puntuacionDe(scores, 'health');

    assert.strictEqual(score.current, 0);
    assert.strictEqual(score.desired, 9);
  });

  it('devuelve cero si no hay puntuación para el área', () => {
    assert.deepStrictEqual(puntuacionDe({}, 'health'), { current: 0, desired: 0 });
    assert.deepStrictEqual(puntuacionDe(null, 'health'), { current: 0, desired: 0 });
  });
});
