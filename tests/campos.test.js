/**
 * Tests de la conservación del texto de un campo cuando la vista se repinta.
 *
 * Al aplicar datos que llegan de otra pestaña o de la nube se repinta la
 * vista, y con ella se va lo que la usuaria tenía escrito en el campo. Aquí
 * se comprueba que el texto se guarda y se devuelve.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  capturarTextoDeCampo,
  restaurarTextoEnCampo
} from '../js/utils/campos.js';

const crearCampo = (id, valor, opciones = {}) => ({
  id,
  value: valor,
  textContent: valor,
  matches: (selector) => opciones.esCampo !== false && selector.includes('input')
});

const crearDocumento = (campos = {}) => ({
  getElementById: (id) => campos[id] || null
});

describe('capturarTextoDeCampo', () => {
  it('guarda el texto de un campo con algo escrito', () => {
    const campo = crearCampo('tarea', 'Comprar pan');

    assert.deepStrictEqual(capturarTextoDeCampo(campo), {
      id: 'tarea',
      valor: 'Comprar pan'
    });
  });

  it('no guarda nada si el campo está vacío', () => {
    assert.strictEqual(capturarTextoDeCampo(crearCampo('tarea', '')), null);
  });

  it('no guarda nada si el elemento no es un campo', () => {
    const parrafo = crearCampo('nota', 'Texto', { esCampo: false });

    assert.strictEqual(capturarTextoDeCampo(parrafo), null);
  });

  it('no guarda nada si el campo no tiene identificador', () => {
    assert.strictEqual(capturarTextoDeCampo(crearCampo('', 'Texto')), null);
  });

  it('aguanta que no haya elemento', () => {
    assert.strictEqual(capturarTextoDeCampo(null), null);
    assert.strictEqual(capturarTextoDeCampo(undefined), null);
  });
});

describe('restaurarTextoEnCampo', () => {
  it('devuelve el texto al campo', () => {
    const destino = crearCampo('tarea', '');
    const documento = crearDocumento({ tarea: destino });

    const restaurado = restaurarTextoEnCampo({ id: 'tarea', valor: 'Comprar pan' }, documento);

    assert.strictEqual(restaurado, true);
    assert.strictEqual(destino.value, 'Comprar pan');
  });

  it('no pisa un campo que ya tiene otro contenido', () => {
    const destino = crearCampo('tarea', 'Otro texto');
    const documento = crearDocumento({ tarea: destino });

    const restaurado = restaurarTextoEnCampo({ id: 'tarea', valor: 'Comprar pan' }, documento);

    assert.strictEqual(restaurado, false);
    assert.strictEqual(destino.value, 'Otro texto');
  });

  it('no hace nada si el campo ya no está', () => {
    const documento = crearDocumento({});

    assert.strictEqual(restaurarTextoEnCampo({ id: 'tarea', valor: 'Comprar pan' }, documento), false);
  });

  it('aguanta que no haya campo guardado', () => {
    assert.strictEqual(restaurarTextoEnCampo(null, crearDocumento({})), false);
    assert.strictEqual(restaurarTextoEnCampo({ id: 'a', valor: 'b' }, null), false);
  });
});
