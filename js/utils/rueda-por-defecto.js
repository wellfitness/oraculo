/**
 * Oráculo - Áreas de la Rueda de la Vida por defecto
 *
 * Las áreas de la rueda salen con un nombre y un icono. La usuaria puede
 * renombrarlas y enlazarlas con sus valores.
 *
 * Para saber si un área se ha tocado o no hace falta una referencia con la
 * que compararla, y esa referencia tiene que ser la misma en la carga y en
 * las comprobaciones de contenido: por eso vive aquí y no en un solo sitio.
 *
 * Los nombres por defecto se comparan con `Object.hasOwn` y no con una
 * búsqueda directa, porque un área puede traer cualquier identificador y las
 * claves del prototipo no son áreas.
 */

/** Nombre por defecto de cada área de la rueda. */
export const NOMBRES_POR_DEFECTO = Object.freeze({
  health: 'Salud física',
  emotional: 'Estado emocional',
  growth: 'Desarrollo personal',
  family: 'Familia/Pareja',
  social: 'Relaciones sociales',
  career: 'Profesión',
  finances: 'Finanzas',
  leisure: 'Ocio/Tiempo libre'
});

/**
 * Devuelve el nombre por defecto de un área.
 *
 * @param {*} id - Identificador del área.
 * @returns {string|undefined} El nombre, o undefined si no es un área del modelo.
 */
export const nombrePorDefecto = (id) =>
  (Object.hasOwn(NOMBRES_POR_DEFECTO, id) ? NOMBRES_POR_DEFECTO[id] : undefined);

/**
 * Devuelve las áreas por defecto de la rueda, nuevas cada vez.
 *
 * Cada llamada devuelve objetos nuevos: si compartieran entre sí, tocar un
 * área de un cuaderno tocaría también la de todos los demás.
 *
 * @returns {Array<Object>} Las áreas por defecto.
 */
export const areasPorDefecto = () => ([
  { id: 'health', name: 'Salud física', icon: 'fitness_center', order: 0, linkedValueId: null },
  { id: 'emotional', name: 'Estado emocional', icon: 'psychology', order: 1, linkedValueId: null },
  { id: 'growth', name: 'Desarrollo personal', icon: 'school', order: 2, linkedValueId: null },
  { id: 'family', name: 'Familia/Pareja', icon: 'favorite', order: 3, linkedValueId: null },
  { id: 'social', name: 'Relaciones sociales', icon: 'groups', order: 4, linkedValueId: null },
  { id: 'career', name: 'Profesión', icon: 'work', order: 5, linkedValueId: null },
  { id: 'finances', name: 'Finanzas', icon: 'savings', order: 6, linkedValueId: null },
  { id: 'leisure', name: 'Ocio/Tiempo libre', icon: 'spa', order: 7, linkedValueId: null }
]);
