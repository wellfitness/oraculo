/**
 * Borrador automático del diario.
 *
 * Guarda lo que se escribe en el editor para que no se pierda al salir
 * de la vista sin guardar. Vive en su propia clave de localStorage
 * (`oraculo_journal_draft`) porque no forma parte de los datos de la
 * usuaria: no se sincroniza, no se exporta y no se archiva.
 */

const STORAGE_KEY = 'oraculo_journal_draft';

/**
 * Devuelve el identificador del borrador de una ruta del diario.
 * `new:TIPO` para una entrada nueva, `edit:ID` para editar una entrada
 * existente y `null` si la ruta no es un editor.
 */
export const draftIdFor = (route) => {
  if (!route || typeof route !== 'object') return null;

  if (route.mode === 'new') {
    return `new:${route.type || 'free'}`;
  }
  if (route.mode === 'edit' && route.id) {
    return `edit:${route.id}`;
  }
  return null;
};

/**
 * Guarda el texto del borrador. Un contenido vacío (o solo espacios)
 * borra el borrador de esa entrada en lugar de guardarlo.
 */
export const saveDraft = (draftId, content) => {
  if (!draftId) return;

  try {
    if (typeof content !== 'string' || content.trim() === '') {
      clearDraft(draftId);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: draftId,
      content,
      savedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('[Diario] No se ha podido guardar el borrador:', e);
  }
};

/**
 * Devuelve el texto del borrador solo si pertenece a la entrada indicada.
 */
export const loadDraft = (draftId) => {
  if (!draftId) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return null;
    if (draft.id !== draftId) return null;
    if (typeof draft.content !== 'string') return null;

    return draft.content;
  } catch (e) {
    // Un borrador ilegible cuenta como ausente
    return null;
  }
};

/**
 * Borra el borrador guardado.
 *
 * Si se indica el identificador de una entrada, solo se borra cuando el
 * borrador guardado es el de esa entrada: el borrador de otra no se toca.
 * Sin identificador, se borra el que haya.
 */
export const clearDraft = (draftId = null) => {
  try {
    if (draftId) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      let draft = null;
      try {
        draft = JSON.parse(raw);
      } catch {
        draft = null;
      }
      if (!draft || draft.id !== draftId) return;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[Diario] No se ha podido borrar el borrador:', e);
  }
};
