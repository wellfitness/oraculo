/**
 * Oráculo - Foco y bloques de edición
 *
 * Cuando llegan datos de otra pestaña o de la nube, la app los aplica
 * repintando la vista. Si se aplica mientras la usuaria está rellenando un
 * formulario, el repintado borra lo que ha escrito en el resto de campos y se
 * pierde el clic del botón.
 *
 * Aquí se decide si el foco ha salido del bloque de edición (el formulario, el
 * diálogo o el contenedor de edición). La función es pura: recibe los
 * elementos y devuelve la decisión. La app se encarga del resto.
 */

/**
 * Selectores de los bloques de edición que reconoce la app.
 */
const SELECTORES_DE_BLOQUE = ['form', 'dialog', '[data-bloque-edicion]'];

/**
 * Devuelve los bloques de edición a los que pertenece un elemento.
 *
 * Un elemento puede estar en más de uno: un formulario dentro de un
 * diálogo está en los dos, y el foco puede pasar de un campo del formulario
 * a otro elemento del diálogo sin salir de la edición.
 *
 * @param {Element|null} elemento - Elemento que perdió el foco.
 * @returns {Element[]} Los bloques de edición que lo contienen.
 */
const bloquesDeEdicion = (elemento) => {
  if (!elemento || typeof elemento.closest !== 'function') return [];

  const bloques = [];
  for (const selector of SELECTORES_DE_BLOQUE) {
    const bloque = elemento.closest(selector);
    if (bloque && !bloques.includes(bloque)) bloques.push(bloque);
  }
  return bloques;
};

/**
 * Dice si el foco ha salido del bloque de edición.
 *
 * - Si el nuevo foco está dentro del mismo bloque, el foco no ha salido: la
 *   usuaria sigue escribiendo.
 * - Si se ha pulsado algo dentro del bloque (un botón, por ejemplo), el clic
 *   tiene que llegar: algunos navegadores no enfocan el botón al pulsarlo, y
 *   sin mirar lo pulsado el clic se perdería al repintar.
 * - En cualquier otro caso, el foco ha salido del bloque y lo pendiente se
 *   puede aplicar.
 *
 * @param {Object} estado - Estado en el momento de la decisión.
 * @param {Element|null} [estado.destino] - Elemento que perdió el foco.
 * @param {Element|null} [estado.nuevoFoco] - Elemento que ha recibido el foco.
 * @param {Element|null} [estado.elementoPulsado] - Elemento que se ha pulsado.
 * @returns {boolean} true si el foco ha salido del bloque de edición.
 */
export const haSalidoDelBloqueDeEdicion = ({ destino, nuevoFoco, elementoPulsado } = {}) => {
  const bloques = bloquesDeEdicion(destino);

  // Sin bloque de edición no hay nada que esperar: el foco ya no está donde
  // la usuaria estaba escribiendo.
  if (bloques.length === 0) return true;

  const dentro = (elemento) =>
    !!elemento && bloques.some((bloque) => bloque.contains(elemento));

  if (dentro(nuevoFoco)) return false;
  if (dentro(elementoPulsado)) return false;

  return true;
};

export default { haSalidoDelBloqueDeEdicion };
