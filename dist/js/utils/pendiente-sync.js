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
import { decidirCambioDePestana, DECISION_IGNORAR } from './sincronia-pestanas.js';

/** Lo que había pendiente no se ha tocado: no hay nada que preparar. */
export const PREPARADO_NADA = 'nada';

/** Lo pendiente venía de la nube y se ha fundido con lo que hay en memoria. */
export const PREPARADO_NUBE = 'nube';

/** Lo pendiente venía de otra pestaña y se ha fundido con lo que hay en memoria. */
export const PREPARADO_PESTANA = 'pestana';

/**
 * Vacía lo pendiente: los datos que esperan, de dónde venían y la copia de
 * cómo estaban las cosas cuando llegaron.
 *
 * @param {Object|null} estado - Estado de la aplicación. Se modifica.
 */
export const limpiarPendiente = (estado) => {
  if (!estado) return;
  estado.pendingSync = null;
  estado.pendingSyncOrigen = null;
  estado.pendingSyncBase = null;
};

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

  limpiarPendiente(estado);

  return estado;
};

/**
 * Deja los datos listos para guardar sin pisar lo más nuevo de otra pestaña.
 *
 * Si quedó algo pendiente de otra pestaña y es más nuevo que lo que hay en
 * memoria, se funde con lo que hay: así este guardado deja dentro tanto lo
 * que venía de la otra pestaña como lo que la usuaria acaba de escribir.
 *
 * Si lo pendiente viene de la nube, se funde también: el guardado no puede
 * dejar fuera ni lo que venía de la nube ni lo que la usuaria acaba de
 * guardar.
 *
 * La función es pura sobre el estado: la app avisa después de lo que ha
 * pasado, porque solo ella sabe qué hay abierto en pantalla.
 *
 * @param {Object|null} estado - Estado de la aplicación. Se modifica.
 * @returns {string} Qué se ha hecho: 'nada', 'nube' o 'pestana'.
 */
export const prepararGuardado = (estado) => {
  if (!estado || !estado.data || !estado.pendingSync) return PREPARADO_NADA;

  if (estado.pendingSyncOrigen === 'nube') {
    // Lo que viene de la nube se funde con lo que hay y lo pendiente queda
    // vacío: si se quedara, al aplicar lo pendiente otra vez se volvería a
    // fusionar y lo que la usuaria acaba de borrar reaparecería.
    fusionarPendiente(estado);
    return PREPARADO_NUBE;
  }

  if (estado.pendingSyncOrigen !== 'pestana') return PREPARADO_NADA;

  const decision = decidirCambioDePestana({
    updatedAtEnMemoria: estado.data?.updatedAt,
    updatedAtRecibido: estado.pendingSync?.updatedAt,
    hayModalAbierto: false,
    estaEditando: false
  });

  if (decision === DECISION_IGNORAR) {
    // Lo pendiente ya no es más nuevo que lo que hay aquí.
    limpiarPendiente(estado);
    return PREPARADO_NADA;
  }

  // Lo pendiente es más nuevo: se funde con lo que hay en memoria. La fusión
  // respeta lo que la usuaria haya cambiado y deja dentro lo que vino de la
  // otra pestaña, sin sustituir las secciones que los módulos tienen
  // guardadas.
  estado.data = fusionarDatos(estado.pendingSyncBase, estado.data, estado.pendingSync);
  limpiarPendiente(estado);

  return PREPARADO_PESTANA;
};

export default { fusionarPendiente, limpiarPendiente, prepararGuardado };
