/**
 * Oráculo - Reglas de tareas en un solo sitio
 *
 * Límites de cada horizonte, marca de «importante» y desvinculación de
 * proyecto. Todo lo que la app sepa de reglas de tareas vive aquí, para
 * que la captura, la revisión semanal y la Agenda no se contradigan.
 *
 * Es lógica pura: no importa nada.
 */

import { numeroSeguro } from './sanitizer.js';

/** Límite de tareas por horizonte. `null` significa sin límite. */
export const LIMITS = {
  backlog: null,
  quarterly: 3,
  monthly: 6,
  weekly: 10,
  daily: 3
};

/** Valor con el que se marca una tarea como importante. */
export const IMPORTANT_TASK_TYPE = 'importante';

/** Las seis listas donde puede haber tareas. */
const TASK_LISTS = ['backlog', 'quarterly', 'monthly', 'weekly', 'daily', 'completed'];

/**
 * Fecha en formato AAAA-MM-DD usando la hora local.
 *
 * @param {Date} date - Fecha a formatear.
 * @returns {string} Fecha local.
 */
export const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Límite de tareas del día. Sale del setup de hoy; si no hay setup de hoy,
 * vale el límite por defecto.
 *
 * El setup viene de un archivo importado o de la nube, así que el número se
 * comprueba antes de fiarse: solo vale si es un entero dentro del rango que
 * admite el modelo.
 *
 * @param {Object} data - Datos de la app.
 * @param {string} today - Fecha de referencia (AAAA-MM-DD).
 * @returns {number} Límite diario.
 */
export const getDailyLimit = (data, today = getLocalDateString()) => {
  const setup = data?.dailySetup;
  if (!setup || setup.date !== today) return LIMITS.daily;

  const limite = numeroSeguro(setup.dailyLimit);
  return Number.isInteger(limite) && limite >= 1 && limite <= 3 ? limite : LIMITS.daily;
};

/**
 * Límite de un horizonte. `null` si ese horizonte no tiene límite.
 *
 * @param {Object} data - Datos de la app.
 * @param {string} horizon - Nombre del horizonte.
 * @returns {number|null} Límite.
 */
export const getHorizonLimit = (data, horizon) => {
  if (horizon === 'daily') return getDailyLimit(data);
  return LIMITS[horizon] ?? null;
};

/**
 * Cuenta las tareas que siguen abiertas.
 *
 * @param {Object[]} items - Lista de tareas.
 * @returns {number} Tareas activas.
 */
export const countActive = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.filter(item => !item?.completed).length;
};

/**
 * Indica si un horizonte ya está al completo.
 *
 * @param {Object} data - Datos de la app.
 * @param {string} horizon - Nombre del horizonte.
 * @returns {boolean} true si no cabe ninguna tarea más.
 */
export const isHorizonFull = (data, horizon) => {
  const limit = getHorizonLimit(data, horizon);
  if (limit === null) return false;
  return countActive(data?.objectives?.[horizon]) >= limit;
};

/**
 * Indica si una tarea está marcada como importante. Acepta el valor actual
 * y el heredado de la captura.
 *
 * @param {Object} task - Tarea.
 * @returns {boolean} true si es importante.
 */
export const isImportantTask = (task) => {
  const type = task?.taskType;
  return type === IMPORTANT_TASK_TYPE || type === 'important';
};

/**
 * Desvincula de un proyecto todas sus tareas, en las seis listas.
 *
 * @param {Object} objectives - Sección objectives de los datos.
 * @param {string} projectId - Id del proyecto.
 * @returns {number} Cuántas tareas se han desvinculado.
 */
export const unlinkProjectTasks = (objectives, projectId) => {
  if (!objectives || !projectId) return 0;

  let unlinked = 0;
  for (const list of TASK_LISTS) {
    const items = objectives[list];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (item && item.projectId === projectId) {
        item.projectId = null;
        unlinked++;
      }
    }
  }
  return unlinked;
};

/**
 * Fecha que se usa para saber cuándo se completó una tarea.
 *
 * La app guarda `completedAt` al completarla, pero un backup importado puede
 * traer la tarea completada sin esa fecha. En vez de reventar al pintar la
 * Agenda, se cae en la fecha de actualización y, si tampoco la hay, en la de
 * creación.
 *
 * @param {Object} task - Tarea.
 * @returns {Date|null} La fecha, o null si no hay ninguna válida.
 */
export const fechaDeCompletado = (task) => {
  for (const campo of ['completedAt', 'updatedAt', 'createdAt']) {
    const valor = task?.[campo];
    if (!valor) continue;
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }
  return null;
};
