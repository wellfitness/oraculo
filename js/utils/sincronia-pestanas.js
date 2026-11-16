/**
 * Oráculo - Sincronía entre pestañas
 *
 * Cuando la usuaria tiene la app abierta en dos pestañas, la que guarda
 * escribe en el almacenamiento y la otra se entera por el evento `storage`.
 * Sustituir los datos de golpe mientras la usuaria está escribiendo en esta
 * perdería lo que tiene a medias, así que la decisión se toma antes de
 * tocar nada.
 *
 * La función es pura: recibe el estado y devuelve qué hacer. La app decide
 * después, porque solo ella sabe qué hay abierto en pantalla.
 */

/** Lo que llega de otra pestaña se aplica ya. */
export const DECISION_APLICAR = 'aplicar';

/** Lo que llega de otra pestaña espera a que la usuaria termine de escribir. */
export const DECISION_APLAZAR = 'aplazar';

/** Lo que llega de otra pestaña no es más nuevo y se descarta. */
export const DECISION_IGNORAR = 'ignorar';

/**
 * Decide qué hacer con los datos que llegan de otra pestaña.
 *
 * - 'ignorar' si lo recibido no es más reciente que lo que hay en memoria.
 * - 'aplazar' si es más reciente pero hay un modal abierto o la usuaria está
 *   editando.
 * - 'aplicar' en el resto de los casos.
 *
 * Las fechas se comparan como texto porque las fechas ISO se ordenan igual
 * como texto que como fecha. Una fecha ausente cuenta como cadena vacía.
 *
 * @param {Object} estado - Estado en el momento de la decisión.
 * @param {string} [estado.updatedAtEnMemoria] - Fecha de los datos en memoria.
 * @param {string} [estado.updatedAtRecibido] - Fecha de los datos recibidos.
 * @param {boolean} [estado.hayModalAbierto] - true si hay un modal abierto.
 * @param {boolean} [estado.estaEditando] - true si la usuaria está escribiendo.
 * @returns {string} Una de las decisiones: 'aplicar', 'aplazar' o 'ignorar'.
 */
export const decidirCambioDePestana = (estado) => {
  const {
    updatedAtEnMemoria,
    updatedAtRecibido,
    hayModalAbierto = false,
    estaEditando = false
  } = estado || {};
  const enMemoria = typeof updatedAtEnMemoria === 'string' ? updatedAtEnMemoria : '';
  const recibido = typeof updatedAtRecibido === 'string' ? updatedAtRecibido : '';

  // Lo que no es más nuevo que lo que ya hay no aporta nada.
  if (!(recibido > enMemoria)) return DECISION_IGNORAR;

  // Es más nuevo, pero la usuaria está a medias: espera.
  if (hayModalAbierto || estaEditando) return DECISION_APLAZAR;

  return DECISION_APLICAR;
};
