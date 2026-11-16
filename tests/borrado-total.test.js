/**
 * Tests del aviso de «borrar todo» incompleto.
 *
 * «Borrar todo» borra dos cosas distintas: los respaldos automáticos del
 * dispositivo y la carpeta de respaldos vinculada. Si solo falla una de las
 * dos, el aviso tiene que decir cuál, porque no es lo mismo que quede una
 * copia del cuaderno en el equipo que que la carpeta siga vinculada.
 *
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { mensajeDeBorradoIncompleto } from '../js/utils/borrado-total.js';

describe('mensajeDeBorradoIncompleto', () => {
  it('avisa de los respaldos del dispositivo cuando eso es lo que no se ha podido borrar', () => {
    const mensaje = mensajeDeBorradoIncompleto({ respaldos: false, carpeta: true });

    assert.strictEqual(
      mensaje,
      'Se ha borrado el cuaderno, pero los respaldos automáticos del dispositivo no se han podido borrar. Revisa los permisos del navegador.'
    );
  });

  it('avisa de la carpeta cuando eso es lo que no se ha podido desvincular', () => {
    const mensaje = mensajeDeBorradoIncompleto({ respaldos: true, carpeta: false });

    assert.match(mensaje, /carpeta de respaldos sigue vinculada/);
    assert.match(mensaje, /volverá a guardarse allí/);
    assert.doesNotMatch(mensaje, /respaldos automáticos del dispositivo/);
  });

  it('avisa de las dos cosas cuando fallan las dos', () => {
    const mensaje = mensajeDeBorradoIncompleto({ respaldos: false, carpeta: false });

    assert.match(mensaje, /respaldos automáticos del dispositivo/);
    assert.match(mensaje, /carpeta de respaldos sigue vinculada/);
    // Cada parte es una frase: la segunda empieza por mayúscula.
    assert.match(mensaje, /navegador\. La carpeta/);
  });

  it('no dice nada cuando no ha faltado nada', () => {
    assert.strictEqual(mensajeDeBorradoIncompleto({ respaldos: true, carpeta: true }), '');
    assert.strictEqual(mensajeDeBorradoIncompleto({}), '');
    assert.strictEqual(mensajeDeBorradoIncompleto(null), '');
    assert.strictEqual(mensajeDeBorradoIncompleto(undefined), '');
  });
});
