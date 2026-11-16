/**
 * Oráculo - Datos que esperan a que la usuaria termine de escribir
 *
 * Cuando llegan datos de la nube o de otra pestaña y la usuaria tiene algo a
 * medias (un modal abierto, un campo donde está escribiendo), lo que llega
 * espera. Mientras espera, la usuaria puede guardar cosas.
 *
 * Al fusionar lo pendiente hay que vaciarlo. Si se deja puesto, la siguiente
 * aplicación de lo pendiente vuelve a fusionar lo mismo con la base de
 * siempre, y lo que la usuaria acababa de borrar reaparece.
 *
 * Aquí vive la fusión y el vaciado, en funciones puras sobre el estado de la
 * aplicación, para que se puedan probar sin navegador.
 */

import { fusionarDatos } from './fusionar-datos.js';

/**
 * Fusiona lo pendiente con los datos que hay en memoria y deja el pendiente
 * vacío.
 *
 * La fusión se hace sobre el propio objeto de datos, sin sustituir sus
 * secciones: los módulos de la app guardan referencias a ellas y, si se
 * sustituyeran, el guardado de un módulo escribiría encima de lo que acaba de
 * llegar.
 *
 * @param {Object|null} estado - Estado de la aplicación. Se modifica.
 * @returns {Object|null} El mismo estado, con lo pendiente ya fusionado.
 */
export const fusionarPendiente = (estado) => {
  if (!estado || !estado.pendingSync) return estado;

  estado.data = fusionarDatos(estado.pendingSyncBase, estado.data, estado.pendingSync);

  estado.pendingSync = null;
  estado.pendingSyncOrigen = null;
  estado.pendingSyncBase = null;

  return estado;
};

export default { fusionarPendiente };
