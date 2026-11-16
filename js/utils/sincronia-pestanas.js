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

/** Aviso que sale cuando los datos de otra pestaña se aplican. */
export const AVISO_DATOS_OTRA_PESTAÑA = 'Datos actualizados desde otra pestaña.';

/** Aviso que sale cuando los datos de otra pestaña esperan al cierre del modal. */
export const AVISO_DATOS_EN_ESPERA = 'Datos actualizados. Se aplicarán al cerrar el modal.';

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

/**
 * Elige el aviso que corresponde a los datos que llegan de otra pestaña.
 *
 * - Si los datos se aplican, se avisa de que se han actualizado.
 * - Si quedan esperando a que cierre el modal, se avisa de que se aplicarán
 *   después.
 * - Si lo único que hay es la usuaria escribiendo, no se avisa: no se le
 *   interrumpe mientras escribe.
 * - Si lo que llega no es más nuevo y se descarta, no se avisa.
 *
 * @param {Object} estado - Estado en el momento de la decisión.
 * @param {string} [estado.decision] - La decisión que se ha tomado.
 * @param {boolean} [estado.hayModalAbierto] - true si hay un modal abierto.
 * @returns {string|null} El texto del aviso, o null si no hay que avisar.
 */
export const avisoDeDatosDePestana = (estado) => {
  const { decision, hayModalAbierto = false } = estado || {};

  if (decision === DECISION_APLICAR) return AVISO_DATOS_OTRA_PESTAÑA;
  if (decision === DECISION_APLAZAR) {
    return hayModalAbierto ? AVISO_DATOS_EN_ESPERA : null;
  }

  return null;
};
