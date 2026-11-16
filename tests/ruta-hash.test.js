/**
 * Tests de la elección del hash de navegación.
 *
 * La app navega a vistas que pueden tener subruta (`#journal/new/free`). Al
 * entrar por una dirección así, la subruta no puede perderse: si se pierde, la
 * usuaria acaba en el listado del diario en lugar de en el editor.
 *
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { getBaseView, elegirHashDeNavegacion } from '../js/utils/ruta-hash.js';

describe('getBaseView', () => {
  it('saca la vista base de una dirección con subruta', () => {
    assert.strictEqual(getBaseView('journal/new/free'), 'journal');
    assert.strictEqual(getBaseView('journal/edit/abc123'), 'journal');
  });

  it('acepta la dirección con o sin almohadilla', () => {
    assert.strictEqual(getBaseView('#journal/new/free'), 'journal');
    assert.strictEqual(getBaseView('journal'), 'journal');
  });

  it('devuelve el inicio cuando no hay nada', () => {
    assert.strictEqual(getBaseView(''), 'dashboard');
    assert.strictEqual(getBaseView('#'), 'dashboard');
    assert.strictEqual(getBaseView(undefined), 'dashboard');
    assert.strictEqual(getBaseView(null), 'dashboard');
  });
});

describe('elegirHashDeNavegacion', () => {
  it('conserva la subruta cuando es de la misma vista', () => {
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/new/free'),
      'journal/new/free'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/edit/abc123'),
      'journal/edit/abc123'
    );
  });

  it('acepta la dirección con almohadilla', () => {
    assert.strictEqual(
      elegirHashDeNavegacion('journal', '#journal/new/free'),
      'journal/new/free'
    );
  });

  it('deja la vista sola cuando la subruta es de otra vista', () => {
    assert.strictEqual(
      elegirHashDeNavegacion('dashboard', 'journal/new/free'),
      'dashboard'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'kanban'),
      'journal'
    );
  });

  it('deja la vista sola cuando no hay dirección', () => {
    assert.strictEqual(elegirHashDeNavegacion('journal', ''), 'journal');
    assert.strictEqual(elegirHashDeNavegacion('journal', undefined), 'journal');
    assert.strictEqual(elegirHashDeNavegacion('journal', null), 'journal');
    assert.strictEqual(elegirHashDeNavegacion('journal', '#'), 'journal');
  });

  it('deja la vista sola cuando la subruta tiene caracteres raros', () => {
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/<script>alert(1)</script>'),
      'journal'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/new/free?salto=1'),
      'journal'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/new/'),
      'journal'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal//new'),
      'journal'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/nuevo con espacios'),
      'journal'
    );
  });

  it('deja la vista sola cuando la subruta es demasiado larga', () => {
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/new/free/extra/otra'),
      'journal'
    );
  });

  it('aguanta una vista que no es un texto', () => {
    assert.strictEqual(elegirHashDeNavegacion('', 'journal/new/free'), '');
    assert.strictEqual(elegirHashDeNavegacion(undefined, undefined), '');
    assert.strictEqual(elegirHashDeNavegacion(null, 'journal'), '');
  });

  it('acepta los caracteres que usan los identificadores y los tipos de entrada', () => {
    // Los tipos de entrada del diario llevan guion y los identificadores
    // pueden llevar punto, guion y guion bajo.
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/new/evening-check-in'),
      'journal/new/evening-check-in'
    );
    assert.strictEqual(
      elegirHashDeNavegacion('journal', 'journal/edit/abc-123_x.y'),
      'journal/edit/abc-123_x.y'
    );
  });
});
