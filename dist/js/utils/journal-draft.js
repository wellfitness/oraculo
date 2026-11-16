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
 * Dice qué parte del diario se está viendo.
 *
 * Formatos de la dirección: `#journal` (listado), `#journal/new/TIPO` (entrada
 * nueva) y `#journal/edit/ID` (editar una entrada).
 *
 * @param {string} [hash] - La dirección de la página.
 * @returns {{mode: string, type?: string, id?: string}} La ruta del diario.
 */
export const parseRutaDiario = (hash) => {
  const partes = String(hash || '').split('/');

  if (partes.length >= 3 && partes[1] === 'new') {
    return { mode: 'new', type: partes[2] || 'free' };
  }
  if (partes.length >= 3 && partes[1] === 'edit') {
    return { mode: 'edit', id: partes[2] };
  }
  return { mode: 'list' };
};

/**
 * Dice si el editor del diario está abierto de verdad.
 *
 * Solo lo están las rutas de entrada nueva y de edición. En el listado del
 * diario no hay ningún editor en pantalla: un borrador viejo guardado ahí no
 * significa que la usuaria esté escribiendo ahora mismo.
 *
 * @param {string} [hash] - La dirección de la página.
 * @returns {boolean} true si hay un editor abierto.
 */
export const esEditorDeDiarioAbierto = (hash) => {
  const ruta = parseRutaDiario(hash);
  return ruta.mode === 'new' || ruta.mode === 'edit';
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
 * Indica si hay un borrador del diario sin guardar.
 *
 * El editor guarda lo que se escribe en su propia clave. Si hay un borrador,
 * lo que hay en pantalla todavía no está en los datos: aplicar datos de fuera
 * ahora perdería lo que la usuaria está escribiendo.
 *
 * @returns {boolean} true si hay un borrador con contenido.
 */
export const tieneBorradorPendiente = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object') return false;
    if (typeof draft.content !== 'string') return false;

    return draft.content.trim() !== '';
  } catch {
    // Un borrador ilegible cuenta como ausente
    return false;
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
