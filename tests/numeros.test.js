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

    assert.strictEqual(normalizarPuntuaciones(data), 0);
    assert.strictEqual(normalizarPuntuaciones({}), 0);
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

    assert.strictEqual(normalizarDuracionHabito(data), 1);
    assert.strictEqual(data.habits.active.activities[0].duration, 0);
  });
});

describe('normalizarDuracionesAtelicas', () => {
  it('sustituye por cero la duración que no es un número', () => {
    const data = { atelicActivities: [{ id: 'a1', duration: '<img src=x onerror=alert(1)>' }] };

    assert.strictEqual(normalizarDuracionesAtelicas(data), 1);
    assert.strictEqual(data.atelicActivities[0].duration, 0);
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
