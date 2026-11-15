/**
 * Tests del parser de captura inteligente (utils/captura.js)
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { parseCapture } from '../js/utils/captura.js';

describe('parseCapture', () => {
  it('deja el texto tal cual cuando no hay sintaxis', () => {
    const parsed = parseCapture('Comprar pan');

    assert.strictEqual(parsed.text, 'Comprar pan');
    assert.strictEqual(parsed.horizon, 'backlog');
    assert.strictEqual(parsed.projectId, null);
    assert.strictEqual(parsed.isImportant, false);
    assert.strictEqual(parsed.unknownTag, null);
  });

  it('reconoce el horizonte al final del texto', () => {
    const parsed = parseCapture('Comprar pan >semana');

    assert.strictEqual(parsed.horizon, 'weekly');
    assert.strictEqual(parsed.text, 'Comprar pan');
  });

  it('reconoce el horizonte al principio del texto', () => {
    const parsed = parseCapture('>mes Planificar el trimestre');

    assert.strictEqual(parsed.horizon, 'monthly');
    assert.strictEqual(parsed.text, 'Planificar el trimestre');
  });

  it('no confunde un greater-than de HTML con la sintaxis de horizonte', () => {
    const parsed = parseCapture('Comprar <b>pan</b> >semana');

    assert.strictEqual(parsed.horizon, 'weekly');
    assert.strictEqual(parsed.text, 'Comprar <b>pan</b>');
  });

  it('ignora un greater-than que no está al principio ni tras un espacio', () => {
    const parsed = parseCapture('Comprar pan>semana');

    assert.strictEqual(parsed.horizon, 'backlog');
    assert.strictEqual(parsed.text, 'Comprar pan>semana');
  });

  it('marca como importante cuando el texto empieza por !', () => {
    const parsed = parseCapture('!Llamar al médico');

    assert.strictEqual(parsed.isImportant, true);
    assert.strictEqual(parsed.text, 'Llamar al médico');
  });

  it('asigna el proyecto que coincide con la etiqueta', () => {
    const proyectos = [{ id: 'p1', name: 'Cocina' }];
    const parsed = parseCapture('Limpiar la nevera #cocina', proyectos);

    assert.strictEqual(parsed.projectId, 'p1');
    assert.strictEqual(parsed.text, 'Limpiar la nevera');
  });

  it('avisa de una etiqueta que no corresponde a ningún proyecto', () => {
    const parsed = parseCapture('Limpiar la nevera #cocina', []);

    assert.strictEqual(parsed.projectId, null);
    assert.strictEqual(parsed.unknownTag, 'cocina');
    assert.strictEqual(parsed.text, 'Limpiar la nevera #cocina');
  });

  it('acepta los alias de cada horizonte', () => {
    assert.strictEqual(parseCapture('Tarea >sem').horizon, 'weekly');
    assert.strictEqual(parseCapture('Tarea >s').horizon, 'weekly');
    assert.strictEqual(parseCapture('Tarea >m').horizon, 'monthly');
    assert.strictEqual(parseCapture('Tarea >tri').horizon, 'quarterly');
    assert.strictEqual(parseCapture('Tarea >t').horizon, 'quarterly');
    assert.strictEqual(parseCapture('Tarea >hoy').horizon, 'daily');
    assert.strictEqual(parseCapture('Tarea >foco').horizon, 'daily');
    assert.strictEqual(parseCapture('Tarea >p').horizon, 'daily');
  });

  it('no reconoce un horizonte que no existe', () => {
    const parsed = parseCapture('Tarea >siglo');

    assert.strictEqual(parsed.horizon, 'backlog');
    assert.strictEqual(parsed.text, 'Tarea >siglo');
  });

  it('no reconoce un alias que viene del prototipo', () => {
    // `constructor`, `__proto__` o `toString` son claves heredadas, no
    // horizontes. Si se aceptaran, la tarea se guardaría en una lista
    // fantasma que no existe en ninguna vista y se perdería en silencio.
    for (const alias of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']) {
      const parsed = parseCapture('Tarea >' + alias);

      assert.strictEqual(parsed.horizon, 'backlog', `no debería aceptar: ${alias}`);
      assert.strictEqual(parsed.text, 'Tarea >' + alias, `no debería tocar el texto: ${alias}`);
    }
  });

  it('aguanta un texto que no es una cadena', () => {
    const parsed = parseCapture(null);

    assert.strictEqual(parsed.text, '');
    assert.strictEqual(parsed.horizon, 'backlog');
  });
});
