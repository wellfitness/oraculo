/**
 * Tests del sanitizador
 *
 * `escapeHTML` neutraliza el marcado. `colorSeguro` neutraliza el CSS, que
 * es un contexto distinto: escapar el HTML no toca `;`, `:` ni `url()`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { escapeHTML, colorSeguro, numeroSeguro } from '../js/utils/sanitizer.js';

describe('escapeHTML', () => {
  it('escapa los caracteres que rompen el marcado', () => {
    assert.strictEqual(escapeHTML('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
    assert.strictEqual(escapeHTML('"'), '&quot;');
    assert.strictEqual(escapeHTML("'"), '&#039;');
    assert.strictEqual(escapeHTML('a & b'), 'a &amp; b');
  });

  it('devuelve cadena vacía para valores sin contenido', () => {
    assert.strictEqual(escapeHTML(''), '');
    assert.strictEqual(escapeHTML(null), '');
    assert.strictEqual(escapeHTML(undefined), '');
  });
});

describe('numeroSeguro', () => {
  it('deja pasar un número', () => {
    assert.strictEqual(numeroSeguro(7), 7);
    assert.strictEqual(numeroSeguro('7'), 7);
    assert.strictEqual(numeroSeguro(0), 0);
  });

  it('sustituye por cero lo que no es un número', () => {
    assert.strictEqual(numeroSeguro('<img src=x onerror=alert(1)>'), 0);
    assert.strictEqual(numeroSeguro(null), 0);
    assert.strictEqual(numeroSeguro(undefined), 0);
    assert.strictEqual(numeroSeguro({}), 0);
    assert.strictEqual(numeroSeguro(Number.NaN), 0);
    assert.strictEqual(numeroSeguro(Number.POSITIVE_INFINITY), 0);
  });

  it('acepta el valor por defecto que se le pase', () => {
    assert.strictEqual(numeroSeguro('nada', 5), 5);
  });

  it('no revienta con un símbolo', () => {
    assert.strictEqual(numeroSeguro(Symbol('x')), 0);
    assert.strictEqual(numeroSeguro(Symbol('x'), 5), 5);
  });

  it('trata el texto vacío como un valor que no es un número', () => {
    assert.strictEqual(numeroSeguro('', 30), 30);
    assert.strictEqual(numeroSeguro('   ', 30), 30);
    assert.strictEqual(numeroSeguro('', 0), 0);
  });
});

describe('colorSeguro', () => {
  it('deja pasar un color hexadecimal de la paleta', () => {
    assert.strictEqual(colorSeguro('#f43f5e'), '#f43f5e');
    assert.strictEqual(colorSeguro('#06b6d4'), '#06b6d4');
  });

  it('descarta un color que inyecta declaraciones CSS', () => {
    const peligroso = 'red;position:fixed;inset:0;z-index:99999;background:url(https://atacante.example/b.png)';
    const resultado = colorSeguro(peligroso);
    assert.strictEqual(resultado, '#06b6d4');
    assert.ok(!resultado.includes(';'));
    assert.ok(!resultado.includes('url'));
  });

  it('descarta un color que no es un hexadecimal válido', () => {
    for (const malo of ['', '   ', 'red', 'rgb(1,2,3)', '#xyz', '#12345', null, undefined, 42, {}]) {
      assert.strictEqual(colorSeguro(malo), '#06b6d4', String(malo));
    }
  });

  it('acepta el color por defecto que se le pase', () => {
    assert.strictEqual(colorSeguro('basura', '#f43f5e'), '#f43f5e');
  });
});
