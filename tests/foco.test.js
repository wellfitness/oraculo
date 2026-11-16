/**
 * Tests de la decisión «¿el foco ha salido del bloque de edición?».
 *
 * Cuando llega un cambio de otra pestaña o de la nube, la app lo aplica
 * repintando la vista. Si se aplica mientras la usuaria está rellenando un
 * formulario, el repintado borra lo que ha escrito en el resto de campos y se
 * pierde el clic del botón.
 *
 * La función es pura: recibe los elementos y decide. Las pruebas usan un doble
 * mínimo de nodo con `closest` y `contains`, que es lo único que usa.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { haSalidoDelBloqueDeEdicion } from '../js/utils/foco.js';

/**
 * Crea un nodo con lo mínimo que necesita la función: su etiqueta, su padre
 * y las consultas `closest` y `contains`.
 *
 * @param {string} etiqueta - La etiqueta del nodo ('form', 'dialog', etc.).
 * @param {object|null} [padre] - El nodo padre.
 * @returns {object} El nodo.
 */
const crearNodo = (etiqueta, padre = null) => {
  const nodo = {
    etiqueta,
    padre,

    closest(selector) {
      const candidatas = selector.split(',').map((parte) => parte.trim());
      let actual = nodo;
      while (actual) {
        if (candidatas.includes(actual.etiqueta)) return actual;
        actual = actual.padre;
      }
      return null;
    },

    contains(otro) {
      let actual = otro;
      while (actual) {
        if (actual === nodo) return true;
        actual = actual.padre;
      }
      return false;
    }
  };

  return nodo;
};

describe('haSalidoDelBloqueDeEdicion', () => {
  it('si el foco pasa a otro campo del mismo formulario, no ha salido', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);
    const otroCampo = crearNodo('input', formulario);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: otroCampo }),
      false
    );
  });

  it('si el foco pasa a un botón del mismo formulario, no ha salido', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);
    const boton = crearNodo('button', formulario);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: boton }),
      false
    );
  });

  it('si el foco sale del formulario, ha salido', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);
    const fuera = crearNodo('input');

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: fuera }),
      true
    );
  });

  it('si el foco pasa a otro elemento del mismo diálogo, no ha salido', () => {
    const dialogo = crearNodo('dialog');
    const campo = crearNodo('textarea', dialogo);
    const otro = crearNodo('input', dialogo);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: otro }),
      false
    );
  });

  it('si el foco sale del diálogo, ha salido', () => {
    const dialogo = crearNodo('dialog');
    const campo = crearNodo('textarea', dialogo);
    const fuera = crearNodo('input');

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: fuera }),
      true
    );
  });

  it('un contenedor de edición también cuenta como bloque', () => {
    const bloque = crearNodo('[data-bloque-edicion]');
    const campo = crearNodo('input', bloque);
    const otro = crearNodo('input', bloque);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: otro }),
      false
    );
  });

  it('un formulario dentro de un diálogo no sale al cambiar dentro del diálogo', () => {
    const dialogo = crearNodo('dialog');
    const formulario = crearNodo('form', dialogo);
    const campo = crearNodo('input', formulario);
    const otroDelDialogo = crearNodo('button', dialogo);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: otroDelDialogo }),
      false
    );
  });

  it('si el foco se pierde del todo, ha salido', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: null }),
      true
    );
  });

  it('si se ha pulsado un botón del bloque, el clic tiene que llegar', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);
    const boton = crearNodo('button', formulario);

    // Algunos navegadores no enfocan el botón al pulsarlo: el foco se
    // pierde y no hay forma de saberlo por `relatedTarget`.
    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: null, elementoPulsado: boton }),
      false
    );
  });

  it('si se ha pulsado algo fuera del bloque, ha salido', () => {
    const formulario = crearNodo('form');
    const campo = crearNodo('input', formulario);
    const fuera = crearNodo('button');

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: null, elementoPulsado: fuera }),
      true
    );
  });

  it('un campo que no está en ningún bloque de edición se queda solo', () => {
    const campo = crearNodo('input');
    const fuera = crearNodo('input');

    assert.strictEqual(
      haSalidoDelBloqueDeEdicion({ destino: campo, nuevoFoco: fuera }),
      true
    );
  });

  it('aguanta entradas que no son elementos', () => {
    assert.strictEqual(haSalidoDelBloqueDeEdicion({}), true);
    assert.strictEqual(haSalidoDelBloqueDeEdicion({ destino: null, nuevoFoco: null }), true);
    assert.strictEqual(haSalidoDelBloqueDeEdicion({ destino: {}, nuevoFoco: {} }), true);
  });
});
