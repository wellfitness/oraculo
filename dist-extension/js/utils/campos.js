/**
 * Conserva lo que la usuaria está escribiendo cuando la vista se repinta.
 *
 * Al aplicar datos que llegan de fuera (de la nube o de otra pestaña) se
 * repinta la vista, y con ella se va el contenido de los campos que había.
 * Con lo escrito a mano en el campo, el repintado se lleva el texto.
 *
 * Aquí solo se guarda el texto del campo que tenía el foco: es el que la
 * usuaria estaba rellenando. Los formularios con su propio mecanismo de
 * recuperación, como el diario, se entienden aparte.
 */

/**
 * Guarda el texto del campo indicado, si tiene algo escrito.
 *
 * @param {HTMLElement|null} elemento - Elemento que tenía el foco.
 * @returns {{id: string, valor: string}|null} El texto guardado, o null si no
 *   hay nada que guardar.
 */
export const capturarTextoDeCampo = (elemento) => {
  if (!elemento) return null;
  if (typeof elemento.id !== 'string' || !elemento.id) return null;

  const esCampo = typeof elemento.matches === 'function' &&
    elemento.matches('input, textarea, [contenteditable]');
  if (!esCampo) return null;

  const valor = 'value' in elemento ? elemento.value : elemento.textContent;
  if (typeof valor !== 'string' || valor === '') return null;

  return { id: elemento.id, valor };
};

/**
 * Devuelve al campo el texto que tenía antes del repintado.
 *
 * Solo se devuelve si el campo sigue ahí y si su contenido no ha cambiado
 * por otra causa: si la app lo ha vaciado al guardar, lo que había ya está
 * en los datos y no hay que volver a ponerlo.
 *
 * @param {{id: string, valor: string}|null} campo - Texto guardado.
 * @param {Document} documento - Documento donde buscar el campo.
 * @returns {boolean} true si el texto se ha devuelto al campo.
 */
export const restaurarTextoEnCampo = (campo, documento) => {
  if (!campo || !documento) return false;

  const destino = documento.getElementById(campo.id);
  if (!destino || !('value' in destino)) return false;

  const actual = typeof destino.value === 'string' ? destino.value : '';
  if (actual !== '' && actual !== campo.valor) return false;

  destino.value = campo.valor;
  return true;
};

export default { capturarTextoDeCampo, restaurarTextoEnCampo };
