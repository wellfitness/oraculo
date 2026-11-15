import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const { draftIdFor, saveDraft, loadDraft, clearDraft } = await import('../js/utils/journal-draft.js');
beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('borrador del diario', () => {
  it('draftIdFor', () => {
    assert.strictEqual(draftIdFor({ mode: 'new', type: 'daily' }), 'new:daily');
    assert.strictEqual(draftIdFor({ mode: 'edit', id: 'abc' }), 'edit:abc');
    assert.strictEqual(draftIdFor({ mode: 'list' }), null);
  });
  it('guarda y recupera solo para la misma entrada', () => {
    saveDraft('new:daily', 'Hoy me siento bien');
    assert.strictEqual(loadDraft('new:daily'), 'Hoy me siento bien');
    assert.strictEqual(loadDraft('new:free'), null);
    assert.strictEqual(loadDraft('edit:abc'), null);
  });
  it('un texto vacío borra el borrador', () => {
    saveDraft('new:daily', 'algo');
    saveDraft('new:daily', '   ');
    assert.strictEqual(loadDraft('new:daily'), null);
  });
  it('clearDraft lo elimina', () => {
    saveDraft('new:daily', 'algo');
    clearDraft();
    assert.strictEqual(loadDraft('new:daily'), null);
  });
  it('un borrador ilegible cuenta como ausente', () => {
    localStorage.setItem('oraculo_journal_draft', 'no es json');
    assert.strictEqual(loadDraft('new:daily'), null);
  });
  it('vaciar el texto no borra el borrador de otra entrada', () => {
    saveDraft('new:daily', 'lo que escribí en la entrada diaria');
    saveDraft('new:weekly', '   ');
    assert.strictEqual(loadDraft('new:daily'), 'lo que escribí en la entrada diaria');
    assert.strictEqual(loadDraft('new:weekly'), null);
  });
  it('clearDraft con identificador borra solo ese borrador', () => {
    saveDraft('new:daily', 'borrador diario');
    clearDraft('new:weekly');
    assert.strictEqual(loadDraft('new:daily'), 'borrador diario');
    clearDraft('new:daily');
    assert.strictEqual(loadDraft('new:daily'), null);
  });
});
