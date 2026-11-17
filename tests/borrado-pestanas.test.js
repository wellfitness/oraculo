/**
 * Tests del borrado hecho en una pestaña y su efecto en las demás.
 *
 * El fallo que evita este archivo: la usuaria borra el diario en una pestaña
 * y, en la otra, el editor del diario está abierto. Lo que llega de la otra
 * pestaña se aplaza (no se puede aplicar sin perder lo que la usuaria está
 * escribiendo) y, cuando la usuaria guarda, la fusión deja la lista entera
 * como estaba: la entrada que se acaba de borrar vuelve al cuaderno.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { prepararGuardado } from '../js/utils/pendiente-sync.js';

/**
 * Estado de la pestaña B: la usuaria tiene el diario abierto y lo que ha
 * llegado de la otra pestaña está aplazado, porque hay algo a medias.
 *
 * @returns {Object} El estado de la aplicación en esa pestaña.
 */
const estadoDeLaPestanaB = () => ({
  data: {
    updatedAt: '2026-11-17T08:00:00.000Z',
    journal: [{ id: 'j1', type: 'daily', content: 'Entrada de la usuaria' }]
  },
  // Lo que llega de la otra pestaña: el diario, vacío.
  pendingSync: {
    updatedAt: '2026-11-17T08:01:00.000Z',
    journal: []
  },
  pendingSyncOrigen: 'pestana',
  // Cómo estaban las cosas cuando llegó lo pendiente.
  pendingSyncBase: {
    updatedAt: '2026-11-17T08:00:00.000Z',
    journal: [{ id: 'j1', type: 'daily', content: 'Entrada de la usuaria' }]
  }
});

describe('el borrado de otra pestaña no vuelve al guardar', () => {
  it('lo que la otra pestaña borró no reaparece en el diario', () => {
    const estado = estadoDeLaPestanaB();

    // La usuaria sigue escribiendo y guarda una entrada nueva.
    estado.data.journal.push({ id: 'j2', type: 'free', content: 'Lo que estaba escribiendo' });

    // Guarda: lo que llegó de la otra pestaña entra en lo que hay en memoria.
    prepararGuardado(estado);

    // La entrada que la otra pestaña borró no puede volver. La que la usuaria
    // acaba de escribir, sí.
    assert.deepStrictEqual(estado.data.journal.map((e) => e.id), ['j2']);
  });

  it('la entrada que la usuaria cambió se conserva', () => {
    const estado = estadoDeLaPestanaB();

    // La usuaria retoca la entrada que la otra pestaña borró.
    estado.data.journal[0].content = 'Retocada por la usuaria';

    prepararGuardado(estado);

    // Lo que la usuaria ha tocado se respeta: no se pierde su trabajo.
    assert.deepStrictEqual(estado.data.journal.map((e) => e.id), ['j1']);
    assert.strictEqual(estado.data.journal[0].content, 'Retocada por la usuaria');
  });
});
