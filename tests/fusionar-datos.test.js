/**
 * Tests de la fusión de los datos que llegan de fuera con los que hay en
 * memoria.
 *
 * Cuando llegan datos de la nube (o de otra pestaña) y la usuaria tiene
 * algo a medias, lo pendiente espera. Mientras espera, puede guardar cosas.
 * Al aplicar lo pendiente no se puede simplesmente sustituir el estado
 * entero: eso perdería lo que la usuaria acaba de guardar.
 *
 * La fusión es de tres partes:
 *   - base: los datos como estaban cuando llegó lo de fuera,
 *   - local: los datos que hay ahora en memoria,
 *   - remoto: los datos que han llegado.
 * Lo local manda en lo que ha cambiado respecto a la base; lo remoto, en
 * lo demás.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { fusionarDatos, copiarDatos } from '../js/utils/fusionar-datos.js';

const copia = (valor) => JSON.parse(JSON.stringify(valor));

describe('copiarDatos', () => {
  it('copia sin compartir nada con el original', () => {
    const original = { values: [{ id: 'a', name: 'A' }], ajustes: { tema: 'claro' } };

    const copiaDatos = copiarDatos(original);

    assert.deepStrictEqual(copiaDatos, original);
    assert.notStrictEqual(copiaDatos.values, original.values);
    assert.notStrictEqual(copiaDatos.values[0], original.values[0]);
  });

  it('no deja pasar las claves prohibidas', () => {
    const original = JSON.parse('{"values": [], "__proto__": {"contaminado": true}}');

    const copiaDatos = copiarDatos(original);

    assert.strictEqual(Object.hasOwn(copiaDatos, '__proto__'), false);
    assert.strictEqual({}.contaminado, undefined);
  });
});

describe('fusionarDatos', () => {
  it('trae lo remoto cuando en local no ha cambiado nada', () => {
    const base = { values: [{ id: 'a', name: 'A' }], updatedAt: '2026-11-15T10:00:00.000Z' };
    const local = copia(base);
    const remoto = { values: [{ id: 'a', name: 'A nube' }], updatedAt: '2026-11-15T10:00:05.000Z' };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A nube' }]);
    assert.strictEqual(resultado.updatedAt, '2026-11-15T10:00:05.000Z');
  });

  it('conserva lo que la usuaria ha cambiado en local', () => {
    const base = { values: [{ id: 'a', name: 'A' }] };
    const local = { values: [{ id: 'a', name: 'A escrito por la usuaria' }] };
    const remoto = { values: [{ id: 'a', name: 'A nube' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A escrito por la usuaria' }]);
  });

  it('añade lo que solo está en lo remoto', () => {
    const base = { values: [{ id: 'a', name: 'A' }] };
    const local = copia(base);
    const remoto = { values: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B de la nube' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B de la nube' }
    ]);
  });

  it('respeta el borrado local: lo borrado no vuelve', () => {
    const base = { values: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
    const local = { values: [{ id: 'a', name: 'A' }] };
    const remoto = { values: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A' }]);
  });

  it('aplica el borrado remoto cuando en local no se ha tocado', () => {
    const base = { values: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
    const local = copia(base);
    const remoto = { values: [{ id: 'a', name: 'A' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A' }]);
  });

  it('conserva el cambio local aunque lo remoto haya borrado ese elemento', () => {
    const base = { values: [{ id: 'a', name: 'A' }] };
    const local = { values: [{ id: 'a', name: 'A retocado' }] };
    const remoto = { values: [] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A retocado' }]);
  });

  it('funciona dentro de un elemento, sin perder lo que local ya tenía', () => {
    const base = { values: [{ id: 'a', name: 'A', linkedValueId: null }] };
    const local = { values: [{ id: 'a', name: 'A', linkedValueId: 'v1' }] };
    const remoto = { values: [{ id: 'a', name: 'A', linkedValueId: null, description: 'de la nube' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(resultado.values[0].linkedValueId, 'v1');
    assert.strictEqual(resultado.values[0].description, 'de la nube');
  });

  it('funciona con listas sin identificador, que se tratan como una unidad', () => {
    const base = { habits: { graduated: ['a', 'b'] } };
    const local = { habits: { graduated: ['a'] } };
    const remoto = { habits: { graduated: ['a', 'b', 'c'] } };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.habits.graduated, ['a']);
  });

  it('trae la lista remota entera cuando en local no ha cambiado', () => {
    const base = { habits: { graduated: ['a', 'b'] } };
    const local = copia(base);
    const remoto = { habits: { graduated: ['a', 'b', 'c'] } };

    const resultado = fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(resultado.habits.graduated, ['a', 'b', 'c']);
  });

  it('no toca los datos que vienen de fuera', () => {
    const base = { values: [{ id: 'a', name: 'A' }] };
    const local = copia(base);
    const remoto = { values: [{ id: 'a', name: 'A' }], settings: { theme: 'light' } };
    const antesRemoto = copia(remoto);

    fusionarDatos(base, local, remoto);

    assert.deepStrictEqual(remoto, antesRemoto);
  });

  it('devuelve el mismo objeto de memoria, para no romper a los módulos', () => {
    const base = { values: [] };
    const local = { values: [] };
    const remoto = { values: [{ id: 'a', name: 'A' }] };

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(resultado, local);
    assert.strictEqual(resultado.values, local.values);
  });

  it('sin base conserva lo local y añade lo que falte de lo remoto', () => {
    const local = { values: [{ id: 'a', name: 'A' }] };
    const remoto = { values: [{ id: 'a', name: 'A' }], settings: { theme: 'light' } };

    const resultado = fusionarDatos(null, local, remoto);

    assert.deepStrictEqual(resultado.values, [{ id: 'a', name: 'A' }]);
    assert.deepStrictEqual(resultado.settings, { theme: 'light' });
  });

  it('aguanta que lo que llega no sea un objeto', () => {
    // Si lo que hay en memoria no es un objeto, lo único utilizable es lo
    // que llega de fuera.
    assert.deepStrictEqual(fusionarDatos({}, 'texto', { a: 1 }), { a: 1 });
    // Y si lo que llega no es utilizable, se conserva lo que hay.
    assert.deepStrictEqual(fusionarDatos({}, { a: 1 }, null), { a: 1 });
  });

  it('ignora las claves que podrían contaminar el prototipo', () => {
    const base = { values: [] };
    const local = { values: [] };
    // Los datos vienen de fuera: pueden traer cualquier clave.
    const remoto = JSON.parse('{"values": [], "__proto__": {"contaminado": true}}');

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(Object.getPrototypeOf(resultado), Object.prototype);
    assert.strictEqual(resultado.contaminado, undefined);
    assert.strictEqual({}.contaminado, undefined);
  });

  it('las claves prohibidas no viajan a los elementos que se añaden', () => {
    const base = { values: [] };
    const local = { values: [] };
    const remoto = JSON.parse(
      '{"values": [{"id": "a", "name": "A", "__proto__": {"contaminado": true}}]}'
    );

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(Object.getPrototypeOf(resultado.values[0]), Object.prototype);
    assert.strictEqual(resultado.values[0].contaminado, undefined);
    assert.strictEqual({}.contaminado, undefined);
    assert.strictEqual(Object.hasOwn(resultado.values[0], '__proto__'), false);
  });

  it('aguanta datos demasiado honds sin reventar la pila', () => {
    // Se monta una estructura muy honda a mano, porque JSON.stringify ya no
    // llega a serializarla.
    let remoto = { id: 'a', valor: 'hoja' };
    for (let i = 0; i < 5000; i++) remoto = { id: 'n' + i, hijo: remoto };

    const base = { values: [] };
    const local = { values: [] };

    const resultado = fusionarDatos(base, local, { values: [remoto] });

    assert.strictEqual(resultado.values.length, 1);
    assert.strictEqual(resultado.values[0].id, 'n4999');
  });

  it('aguanta una lista que está al final de una estructura muy honda', () => {
    // La lista queda por debajo del límite de profundidad: no se puede
    // copiar, pero la app no puede romperse por ello.
    let remoto = { id: 'hoja', values: [{ id: 'a', name: 'A' }] };
    for (let i = 0; i < 98; i++) remoto = { id: 'n' + i, hijo: remoto };

    const base = { values: [] };
    const local = { values: [] };

    let resultado = null;
    assert.doesNotThrow(() => {
      resultado = fusionarDatos(base, local, { values: [remoto] });
    });
    assert.strictEqual(resultado.values.length, 1);
    assert.strictEqual(resultado.values[0].id, 'n97');
  });

  it('no deja valores vacíos en el objeto fusionado', () => {
    let remoto = { id: 'hoja', valores: [{ id: 'a', name: 'A' }] };
    for (let i = 0; i < 120; i++) remoto = { id: 'n' + i, hijo: remoto };

    const base = { values: [] };
    const local = { values: [] };

    const resultado = fusionarDatos(base, local, { values: [remoto] });

    assert.strictEqual(resultado.values.length, 1);
    assert.ok(!('valores' in resultado.values[0]), 'lo que no se pudo copiar no se cuela');
  });

  it('aguanta una lista muy larga sin reventar la llamada', () => {
    // Pasarle la lista entera como argumentos revienta el límite de la
    // llamada, y la excepción dejaría a la app sin poder guardar nada.
    const base = { values: [] };
    const local = { values: [] };
    const remoto = { values: [] };
    for (let i = 0; i < 130000; i++) remoto.values.push({ id: 'v' + i, name: 'Valor ' + i });

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(resultado.values.length, 130000);
  });

  it('una clave que sombrea un método no crea una propiedad propia', () => {
    const base = { settings: {} };
    const local = { settings: {} };
    const remoto = { settings: { toString: 'atacado' } };

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(Object.hasOwn(resultado.settings, 'toString'), false);
    assert.strictEqual(typeof resultado.settings.toString, 'function');
  });

  it('funciona con las secciones reales del cuaderno', () => {
    const base = {
      values: [{ id: 'v1', name: 'Salud' }],
      objectives: { daily: [{ id: 't1', text: 'Tarea' }] },
      settings: { theme: 'light' }
    };
    const local = copia(base);
    local.values.push({ id: 'v2', name: 'Fuerza' });
    const remoto = {
      values: [{ id: 'v1', name: 'Salud' }, { id: 'v3', name: 'De la nube' }],
      objectives: { daily: [{ id: 't1', text: 'Tarea' }, { id: 't2', text: 'Otra' }] },
      settings: { theme: 'dark' }
    };

    const resultado = fusionarDatos(base, local, remoto);

    assert.strictEqual(resultado.values.length, 3);
    assert.ok(resultado.values.some((v) => v.id === 'v2'), 'se conserva lo local');
    assert.ok(resultado.values.some((v) => v.id === 'v3'), 'entra lo de la nube');
    assert.strictEqual(resultado.objectives.daily.length, 2);
    assert.strictEqual(resultado.settings.theme, 'dark');
  });
});
