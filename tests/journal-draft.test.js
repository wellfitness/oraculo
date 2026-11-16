import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const {
  draftIdFor,
  saveDraft,
  loadDraft,
  clearDraft,
  tieneBorradorPendiente,
  parseRutaDiario,
  esEditorDeDiarioAbierto
} = await import('../js/utils/journal-draft.js');
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

describe('tieneBorradorPendiente', () => {
  it('no hay borrador pendiente si no hay nada guardado', () => {
    assert.strictEqual(tieneBorradorPendiente(), false);
  });

  it('hay borrador pendiente si hay texto sin guardar', () => {
    saveDraft('new:daily', 'lo que escribí y no guardé');

    assert.strictEqual(tieneBorradorPendiente(), true);
  });

  it('un borrador vacío no cuenta como pendiente', () => {
    saveDraft('new:daily', 'algo');
    saveDraft('new:daily', '   ');

    assert.strictEqual(tieneBorradorPendiente(), false);
  });

  it('un borrador ilegible cuenta como ausente', () => {
    localStorage.setItem('oraculo_journal_draft', 'no es json');

    assert.strictEqual(tieneBorradorPendiente(), false);
  });

  it('un borrador sin texto cuenta como ausente', () => {
    localStorage.setItem('oraculo_journal_draft', JSON.stringify({ id: 'new:daily' }));

    assert.strictEqual(tieneBorradorPendiente(), false);
  });
});

describe('parseRutaDiario', () => {
  it('el listado del diario no es un editor', () => {
    assert.deepStrictEqual(parseRutaDiario('#journal'), { mode: 'list' });
    assert.deepStrictEqual(parseRutaDiario(''), { mode: 'list' });
    assert.deepStrictEqual(parseRutaDiario(undefined), { mode: 'list' });
  });

  it('una entrada nueva es un editor del tipo indicado', () => {
    assert.deepStrictEqual(parseRutaDiario('#journal/new/daily'), { mode: 'new', type: 'daily' });
  });

  it('una ruta incompleta no es un editor', () => {
    assert.deepStrictEqual(parseRutaDiario('#journal/new'), { mode: 'list' });
    assert.deepStrictEqual(parseRutaDiario('#journal/edit'), { mode: 'list' });
  });

  it('editar una entrada es un editor con su identificador', () => {
    assert.deepStrictEqual(parseRutaDiario('#journal/edit/abc123'), { mode: 'edit', id: 'abc123' });
  });

  it('una ruta que no es del diario no es un editor', () => {
    assert.deepStrictEqual(parseRutaDiario('#dashboard'), { mode: 'list' });
  });
});

describe('esEditorDeDiarioAbierto', () => {
  it('solo hay editor en las rutas de nueva entrada y de edición', () => {
    assert.strictEqual(esEditorDeDiarioAbierto('#journal/new/daily'), true);
    assert.strictEqual(esEditorDeDiarioAbierto('#journal/edit/abc123'), true);
  });

  it('en el listado del diario no hay editor abierto', () => {
    assert.strictEqual(esEditorDeDiarioAbierto('#journal'), false);
    assert.strictEqual(esEditorDeDiarioAbierto(''), false);
    assert.strictEqual(esEditorDeDiarioAbierto('#dashboard'), false);
  });
});
