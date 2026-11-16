/**
 * Tests de la sincronía pendiente: lo que llega de la nube o de otra pestaña
 * y espera a que la usuaria termine de escribir.
 *
 * El fallo que evita este módulo: al fusionar lo pendiente de la nube en un
 * guardado, lo pendiente se quedaba puesto. La siguiente aplicación de lo
 * pendiente volvía a fusionar lo mismo con la base de siempre, y lo que la
 * usuaria acababa de borrar volvía a aparecer.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { fusionarPendiente } from '../js/utils/pendiente-sync.js';

describe('fusionarPendiente', () => {
  it('trae lo que llegó de la nube sin perder lo que hay en memoria', () => {
    const estado = {
      data: { journal: [{ id: 'j1', content: 'lo mío' }] },
      pendingSync: { journal: [{ id: 'j2', content: 'de la nube' }] },
      pendingSyncOrigen: 'nube',
      pendingSyncBase: { journal: [] }
    };

    fusionarPendiente(estado);

    assert.strictEqual(estado.data.journal.length, 2);
    assert.strictEqual(estado.pendingSync, null);
  });

  it('vacía lo pendiente, su origen y su base', () => {
    const estado = {
      data: { journal: [] },
      pendingSync: { journal: [{ id: 'j2' }] },
      pendingSyncOrigen: 'nube',
      pendingSyncBase: { journal: [] }
    };

    fusionarPendiente(estado);

    assert.strictEqual(estado.pendingSync, null);
    assert.strictEqual(estado.pendingSyncOrigen, null);
    assert.strictEqual(estado.pendingSyncBase, null);
  });

  it('lo borrado no vuelve cuando la usuaria borra lo que llegó de la nube', () => {
    // Al llegar la nube, la lista del diario estaba vacía.
    const estado = {
      data: { journal: [] },
      pendingSync: { journal: [{ id: 'j2', content: 'de la nube' }] },
      pendingSyncOrigen: 'nube',
      pendingSyncBase: { journal: [] }
    };

    // La usuaria guarda: lo pendiente entra.
    fusionarPendiente(estado);
    assert.strictEqual(estado.data.journal.length, 1);

    // La usuaria borra esa entrada y vuelve a guardar. Como lo pendiente ya
    // está fusionado, no se vuelve a fusionar y lo borrado se queda.
    estado.data.journal = [];
    fusionarPendiente(estado);

    assert.strictEqual(estado.data.journal.length, 0);
  });

  it('aplicar lo pendiente después de fusionarlo no cambia nada', () => {
    const estado = {
      data: { journal: [] },
      pendingSync: { journal: [{ id: 'j2' }] },
      pendingSyncOrigen: 'nube',
      pendingSyncBase: { journal: [] }
    };

    fusionarPendiente(estado);
    estado.data.journal = [];

    // Segunda aplicación: no hay nada pendiente, así que no toca nada.
    fusionarPendiente(estado);

    assert.strictEqual(estado.data.journal.length, 0);
  });

  it('sin nada pendiente no hace nada', () => {
    const estado = {
      data: { journal: [{ id: 'j1' }] },
      pendingSync: null,
      pendingSyncOrigen: null,
      pendingSyncBase: null
    };

    fusionarPendiente(estado);

    assert.strictEqual(estado.data.journal.length, 1);
  });

  it('aguanta un estado que no existe', () => {
    assert.doesNotThrow(() => fusionarPendiente(null));
    assert.doesNotThrow(() => fusionarPendiente(undefined));
  });
});
