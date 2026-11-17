/**
 * Oráculo - Señal de borrado entre pestañas
 *
 * Cuando la usuaria borra datos en una pestaña, las demás tienen que enterarse
 * enseguida. Si no, la pestaña que tiene el diario abierto (o un modal)
 * aplaza lo que llega, y cuando la usuaria guarda vuelve a escribir lo que se
 * acababa de borrar: el cuaderno borrado aparece otra vez.
 *
 * La señal es una clave propia de localStorage (`oraculo_borrado`). Las otras
 * pestañas la reciben por el evento `storage`, que ya es la forma que usa la
 * app para enterarse de lo que guarda otra pestaña.
 *
 * Por qué localStorage y no `BroadcastChannel`: los dos mecanismos se quedan
 * dentro del mismo origen, así que ninguno de los dos llega de la web a la
 * extensión de Chrome (son orígenes distintos) ni al revés. Entre pestañas de
 * la web y entre paneles laterales de la extensión, el evento `storage` ya
 * funciona y no hay que añadir una API nueva. Además, la señal se escribe
 * después de que el borrado esté guardado, así que la otra pestaña lee del
 * almacenamiento una versión que ya refleja el borrado.
 *
 * La clave guarda el tipo de borrado, el momento y un identificador: no
 * contiene nada de la usuaria. El identificador hace que dos borrados seguidos
 * produzcan dos valores distintos, porque si fueran iguales el evento de
 * almacenamiento no se dispararía y la otra pestaña no se enteraría del
 * segundo borrado.
 */

import { CLAVES_PROHIBIDAS } from './fusionar-datos.js';

/** Clave del almacenamiento donde vive la señal. */
export const CLAVE_SENAL_BORRADO = 'oraculo_borrado';

/** Los tipos de borrado que la app entiende. */
export const TIPO_BORRADO = {
  TODO: 'todo',
  IDENTIDAD: 'identidad',
  PRODUCTIVIDAD: 'productividad',
  DIARIO: 'diario'
};

/** Lista de tipos válidos, para no fiarse de lo que llega escrito. */
const TIPOS_VALIDOS = Object.values(TIPO_BORRADO);

/**
 * Secciones del cuaderno que toca cada tipo de borrado.
 *
 * El borrado total vacía todo el cuaderno. Los borrados parciales solo tocan
 * su parte: la identidad son los valores, los hábitos y la rueda de la vida;
 * la productividad son las tareas, los proyectos, los logros espontáneos y el
 * setup del día; el diario son las entradas.
 */
export const SECCIONES_POR_TIPO = {
  [TIPO_BORRADO.TODO]: [
    'journal',
    'values',
    'habits',
    'lifeWheel',
    'objectives',
    'projects',
    'spontaneousAchievements',
    'dailySetup',
    'calendar',
    'atelicActivities'
  ],
  [TIPO_BORRADO.IDENTIDAD]: ['values', 'habits', 'lifeWheel'],
  [TIPO_BORRADO.PRODUCTIVIDAD]: [
    'objectives',
    'projects',
    'spontaneousAchievements',
    'dailySetup'
  ],
  [TIPO_BORRADO.DIARIO]: ['journal']
};

/**
 * Genera un identificador para la señal.
 *
 * @returns {string} Un identificador que no se repite.
 */
const generarId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Avisa a las otras pestañas de que se ha borrado algo.
 *
 * @param {string} tipo - Qué se ha borrado: 'todo', 'identidad',
 *   'productividad' o 'diario'.
 * @param {Object} [opciones] - Ajustes.
 * @param {Object} [opciones.almacenamiento] - Dónde se escribe la señal. Por
 *   defecto, el almacenamiento local del navegador.
 * @param {number} [opciones.ahora] - Momento del borrado.
 * @returns {Object|null} La señal que se ha emitido, o null si el tipo no es
 *   válido.
 */
export const emitirSenalBorrado = (tipo, opciones = {}) => {
  const {
    almacenamiento = globalThis.localStorage,
    ahora = Date.now()
  } = opciones || {};

  if (!TIPOS_VALIDOS.includes(tipo)) return null;

  const senal = { tipo, at: ahora, id: generarId() };

  if (!almacenamiento) return senal;

  try {
    almacenamiento.setItem(CLAVE_SENAL_BORRADO, JSON.stringify(senal));
  } catch (e) {
    // Si no se puede avisar, el borrado ya está hecho: no se puede dejar de
    // borrar por no poder avisar. Las otras pestañas lo detectarán igualmente
    // al ver que el cuaderno ha cambiado.
    console.warn('[Borrado] No se ha podido avisar a las otras pestañas:', e);
  }

  return senal;
};

/**
 * Lee una señal de borrado.
 *
 * La señal la escribe otra pestaña, así que no se fía de ella: solo se
 * acepta si es un objeto con un tipo de los conocidos.
 *
 * @param {string|null|undefined} texto - El texto que llega.
 * @returns {{tipo: string, at: number, id: string}|null} La señal, o null si
 *   no es válida.
 */
export const leerSenalBorrado = (texto) => {
  if (typeof texto !== 'string' || texto.length === 0) return null;

  let senal;
  try {
    senal = JSON.parse(texto);
  } catch {
    return null;
  }

  if (!senal || typeof senal !== 'object' || Array.isArray(senal)) return null;
  if (typeof senal.tipo !== 'string') return null;
  if (!TIPOS_VALIDOS.includes(senal.tipo)) return null;

  return {
    tipo: senal.tipo,
    at: typeof senal.at === 'number' && Number.isFinite(senal.at) ? senal.at : 0,
    id: typeof senal.id === 'string' ? senal.id : ''
  };
};

/**
 * Vacía un valor en el sitio donde está.
 *
 * Las listas se vacían sin cambiar de referencia: los módulos de la app
 * guardan la lista que tienen abierta, y si se sustituye por otra, un
 * guardado posterior escribiría la lista vieja (con lo borrado) de vuelta.
 *
 * @param {*} valor - El valor a vaciar.
 */
const vaciarEnPlace = (valor) => {
  if (Array.isArray(valor)) {
    valor.length = 0;
    return;
  }

  if (!valor || typeof valor !== 'object') return;

  for (const clave of Object.keys(valor)) {
    vaciarEnPlace(valor[clave]);
  }
};

/**
 * Deja en memoria lo que se ha borrado en otra pestaña.
 *
 * Lo que se ha borrado se vacía en el sitio, y el resto del cuaderno se
 * relee del almacenamiento, que es la versión buena.
 *
 * @param {Object} datos - Los datos que hay en memoria. Se modifican.
 * @param {string} tipo - Qué se ha borrado.
 * @param {Object} frescos - Los datos que hay ahora en el almacenamiento.
 * @returns {Object} Los mismos datos que hay en memoria.
 */
export const aplicarBorradoEnMemoria = (datos, tipo, frescos) => {
  if (!datos || typeof datos !== 'object') return datos;
  if (!frescos || typeof frescos !== 'object') return datos;

  // La sección se busca con la comprobación de la clave: una búsqueda suelta
  // encontraría lo que hereda el prototipo ('constructor', por ejemplo).
  const secciones = Object.hasOwn(SECCIONES_POR_TIPO, tipo) ? SECCIONES_POR_TIPO[tipo] : [];

  for (const seccion of secciones) {
    if (!Object.hasOwn(datos, seccion)) continue;
    vaciarEnPlace(datos[seccion]);
  }

  for (const clave of Object.keys(frescos)) {
    // Las claves que pueden contaminar el prototipo no se copian: asignar
    // '__proto__' con corchetes cambiaría el prototipo del objeto de datos.
    if (CLAVES_PROHIBIDAS.includes(clave)) continue;
    datos[clave] = frescos[clave];
  }

  return datos;
};

/**
 * Quita de lo pendiente lo que ha llegado de fuera.
 *
 * @param {Object|null} estado - Estado de la aplicación. Se modifica.
 */
const descartarPendiente = (estado) => {
  if (!estado) return;
  estado.pendingSync = null;
  estado.pendingSyncOrigen = null;
  estado.pendingSyncBase = null;
};

/**
 * Reacciona a un borrado hecho en otra pestaña.
 *
 * Lo que la otra pestaña borró manda: lo que esta tenía a medias (un modal
 * abierto, una entrada a medio escribir) se pierde, y lo pendiente se
 * descarta, porque si se quedara, el siguiente guardado volvería a escribir
 * lo que se ha borrado.
 *
 * @param {Object|null} estado - Estado de la aplicación. Se modifica.
 * @param {{tipo: string}|null} senal - La señal que ha llegado.
 * @param {Object|null} frescos - Los datos que hay ahora en el
 *   almacenamiento. No hace falta para un borrado total: la app recarga la
 *   página y los vuelve a leer.
 * @returns {string|null} El tipo de borrado que se ha aplicado, o null si no
 *   había nada que aplicar.
 */
export const recibirSenalBorrado = (estado, senal, frescos) => {
  if (!estado) return null;
  if (!senal || !TIPOS_VALIDOS.includes(senal.tipo)) return null;

  // A partir de aquí la señal es válida: lo que estaba a medias se suelta.
  descartarPendiente(estado);

  // El borrado total no se aplica en memoria: la app suelta la carpeta de
  // respaldos y recarga la página para partir del cuaderno vacío.
  if (senal.tipo === TIPO_BORRADO.TODO) return TIPO_BORRADO.TODO;

  aplicarBorradoEnMemoria(estado.data, senal.tipo, frescos);

  return senal.tipo;
};

export default {
  CLAVE_SENAL_BORRADO,
  TIPO_BORRADO,
  SECCIONES_POR_TIPO,
  emitirSenalBorrado,
  leerSenalBorrado,
  aplicarBorradoEnMemoria,
  recibirSenalBorrado
};
