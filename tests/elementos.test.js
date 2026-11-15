/**
 * Tests para el módulo de elementos del modelo (utils/elementos.js)
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { textoDe, nombreDeValor, hayValorConNombre, nombreDe, buscarProyectoPorEtiqueta, buscarProyectoPorHashtag, filtrarEntradasPorTexto } from '../js/utils/elementos.js';

describe('textoDe', () => {
  it('devuelve el texto de la propiedad', () => {
    assert.strictEqual(textoDe({ name: 'Salud' }, 'name'), 'Salud');
  });

  it('devuelve cadena vacía si el elemento es nulo o no tiene la propiedad', () => {
    assert.strictEqual(textoDe(null, 'name'), '');
    assert.strictEqual(textoDe(undefined, 'name'), '');
    assert.strictEqual(textoDe({}, 'name'), '');
  });

  it('devuelve el valor por defecto cuando se le pasa', () => {
    assert.strictEqual(textoDe(null, 'name', 'Sin nombre'), 'Sin nombre');
  });

  it('no devuelve un valor que no sea texto', () => {
    assert.strictEqual(textoDe({ name: 42 }, 'name'), '');
    assert.strictEqual(textoDe({ name: null }, 'name'), '');
  });
});

describe('nombreDeValor', () => {
  it('normaliza el nombre para poder compararlo', () => {
    assert.strictEqual(nombreDeValor({ name: '  Salud  ' }), 'salud');
  });

  it('no revienta con un valor nulo o sin nombre', () => {
    assert.strictEqual(nombreDeValor(null), '');
    assert.strictEqual(nombreDeValor({}), '');
  });
});

describe('hayValorConNombre', () => {
  it('detecta el valor repetido', () => {
    assert.strictEqual(hayValorConNombre([{ id: 'v1', name: 'Salud' }], 'salud'), true);
    assert.strictEqual(hayValorConNombre([{ id: 'v1', name: 'Salud' }], 'familia'), false);
  });

  it('ignora el valor que se está editando', () => {
    assert.strictEqual(hayValorConNombre([{ id: 'v1', name: 'Salud' }], 'salud', 'v1'), false);
  });

  it('no revienta con valores nulos o sin nombre', () => {
    assert.strictEqual(hayValorConNombre([null, { id: 'v2' }], 'salud'), false);
    assert.strictEqual(hayValorConNombre(null, 'salud'), false);
  });
});

describe('nombreDe', () => {
  it('devuelve el nombre del elemento', () => {
    assert.strictEqual(nombreDe({ name: 'Salud' }), 'Salud');
  });

  it('no revienta con un elemento nulo o sin nombre', () => {
    assert.strictEqual(nombreDe(null), '');
    assert.strictEqual(nombreDe({}), '');
  });
});

describe('buscarProyectoPorEtiqueta', () => {
  it('encuentra el proyecto por la etiqueta', () => {
    const proyectos = [{ id: 'p1', name: 'Viaje a Lisboa' }];
    assert.strictEqual(buscarProyectoPorEtiqueta(proyectos, 'lisboa'), proyectos[0]);
    assert.strictEqual(buscarProyectoPorEtiqueta(proyectos, 'viaje-a-lisboa'), proyectos[0]);
    assert.strictEqual(buscarProyectoPorEtiqueta(proyectos, 'otro'), null);
  });

  it('no revienta con proyectos nulos o sin nombre', () => {
    assert.strictEqual(buscarProyectoPorEtiqueta([null, { id: 'p1' }], 'lisboa'), null);
    assert.strictEqual(buscarProyectoPorEtiqueta(null, 'lisboa'), null);
  });
});

describe('buscarProyectoPorHashtag', () => {
  it('encuentra el proyecto que coincide con el hashtag', () => {
    const proyectos = [{ id: 'p1', name: 'Viaje' }];
    assert.strictEqual(buscarProyectoPorHashtag(proyectos, 'viaje'), proyectos[0]);
    assert.strictEqual(buscarProyectoPorHashtag(proyectos, 'viajes'), proyectos[0]);
    assert.strictEqual(buscarProyectoPorHashtag(proyectos, 'otro'), null);
  });

  it('no revienta con proyectos nulos o sin nombre', () => {
    assert.strictEqual(buscarProyectoPorHashtag([null, { id: 'p1' }], 'viaje'), null);
    assert.strictEqual(buscarProyectoPorHashtag(null, 'viaje'), null);
  });
});

describe('filtrarEntradasPorTexto', () => {
  it('filtra por texto y por tipo', () => {
    const entradas = [
      { id: 'j1', content: 'Caminar por el monte', type: 'daily' },
      { id: 'j2', content: 'Café con Ana', type: 'weekly' }
    ];
    assert.deepStrictEqual(filtrarEntradasPorTexto(entradas, 'monte', null), [entradas[0]]);
    assert.deepStrictEqual(filtrarEntradasPorTexto(entradas, '', 'weekly'), [entradas[1]]);
    assert.deepStrictEqual(filtrarEntradasPorTexto(entradas, '', null), entradas);
  });

  it('no revienta con entradas nulas', () => {
    const entradas = [null, { id: 'j1', content: 'Café', type: 'daily' }];
    assert.deepStrictEqual(filtrarEntradasPorTexto(entradas, 'café', null), [entradas[1]]);
    assert.deepStrictEqual(filtrarEntradasPorTexto(entradas, '', 'weekly'), []);
    assert.deepStrictEqual(filtrarEntradasPorTexto(null, 'café', null), []);
  });
});
