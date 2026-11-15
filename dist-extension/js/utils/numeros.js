/**
 * Oráculo - Números del modelo
 *
 * Normalización de los valores numéricos que la app pinta.
 *
 * Los datos llegan de un archivo importado o de la sincronización con la
 * nube, y ahí un número puede ser cualquier cosa: una cadena, un texto con
 * marcado o un objeto. Aquí se dejan como números finitos, para que ni el
 * marcado ni los cálculos se coman el dato.
 */

import { numeroSeguro, esObjeto } from './sanitizer.js';

/** Duración por defecto de un hábito, en días. */
const DURACION_HABITO = 30;

/** Bloque de trabajo por defecto de Muévete, en milisegundos. */
const BLOQUE_TRABAJO = 7200000;

/** Descanso por defecto de Muévete, en milisegundos. */
const DESCANSO = 480000;

/** Recordatorio de sóleo por defecto, en milisegundos. */
const INTERVALO_SOLEO = 1800000;

/**
 * Normaliza los valores numéricos de un modelo de tarea.
 *
 * Un campo vacío o nulo significa "no informado": se deja con el valor por
 * defecto, para que lo que se guarda sea lo mismo que se pinta. Un campo por
 * debajo del mínimoAllowed tampoco vale: se sustituye por el valor por
 * defecto.
 *
 * Un campo que no está no se toca, salvo que se pida rellenarlo: en las
 * listas del modelo (registro de descansos, actividades) añadir un campo
 * que la app nunca usou solo genera ruido.
 *
 * @param {*} tarea - Tarea a normalizar.
 * @param {string[]} campos - Campos que deben ser números.
 * @param {number} porDefecto - Valor a dejar si el campo no es numérico.
 * @param {number|null} [minimo] - Valor por debajo del cual no vale.
 * @param {boolean} [rellenarAusentes] - Si un campo ausente se rellena.
 * @returns {number} Cuántos campos se han corregido.
 */
const normalizarCampos = (tarea, campos, porDefecto = 0, minimo = null, rellenarAusentes = false) => {
  if (!esObjeto(tarea)) return 0;

  let corregidos = 0;

  for (const campo of campos) {
    const valor = tarea[campo];
    if (valor === undefined && !rellenarAusentes) continue;

    const numero = (valor === undefined || valor === null)
      ? porDefecto
      : numeroSeguro(valor, porDefecto);
    const limpio = (minimo !== null && numero < minimo) ? porDefecto : numero;

    if (limpio !== valor) {
      tarea[campo] = limpio;
      corregidos++;
    }
  }

  return corregidos;
};

/**
 * Normaliza la duración de cada elemento de una lista.
 *
 * Es el mismo recorrido para las actividades de un hábito y para las
 * actividades atélicas: solo cambia el valor por defecto.
 *
 * @param {*} lista - Lista de actividades.
 * @param {number} porDefecto - Valor a dejar si la duración no es numérica.
 * @param {number} [minimo] - Valor por debajo del cual no vale.
 * @returns {number} Cuántos valores se han corregido.
 */
const normalizarDuracionesDeLista = (lista, porDefecto = 0, minimo = 0) => {
  if (!Array.isArray(lista)) return 0;

  let corregidos = 0;
  for (const actividad of lista) {
    corregidos += normalizarCampos(actividad, ['duration'], porDefecto, minimo);
  }

  return corregidos;
};

/**
 * Normaliza las puntuaciones de las evaluaciones de la Rueda de la Vida.
 *
 * Cada evaluación tiene las puntuaciones por área (`current` y `desired`),
 * que la Rueda y el gráfico de evolución pintan.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarPuntuaciones = (data) => {
  const evaluaciones = data?.lifeWheel?.evaluations;
  if (!Array.isArray(evaluaciones)) return 0;

  let corregidos = 0;

  for (const evaluacion of evaluaciones) {
    if (!esObjeto(evaluacion) || !esObjeto(evaluacion.scores)) continue;

    for (const areaId of Object.keys(evaluacion.scores)) {
      const score = evaluacion.scores[areaId];

      // Una puntuación que no es un objeto (una cadena, un número) no
      // significa nada: se sustituye por la de cero, para que el modelo no
      // guarde un valor sucio.
      if (!esObjeto(score)) {
        evaluacion.scores[areaId] = { current: 0, desired: 0 };
        corregidos++;
        continue;
      }

      corregidos += normalizarCampos(score, ['current', 'desired']);
    }
  }

  return corregidos;
};

/**
 * Normaliza los contadores de Muévete.
 *
 * El registro de actividad lleva cuántos descansos se completaron y cuántos
 * se cortaron, y el temporizador lleva los bloques hechos. Se suman y se
 * pintan, así que tienen que ser números. Las duraciones del temporizador
 * también se normalizan: si no lo están, la vista pinta "NaN min".
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarContadoresMuévete = (data) => {
  let corregidos = 0;

  const entradas = data?.muevete?.activityLog?.entries;
  if (Array.isArray(entradas)) {
    for (const entrada of entradas) {
      corregidos += normalizarCampos(entrada, ['completed', 'earlyEnds']);
    }
  }

  const registro = data?.muevete?.activityLog;
  if (esObjeto(registro)) {
    corregidos += normalizarCampos(registro, ['currentStreak', 'bestStreak']);
  }

  const temporizador = data?.muevete?.timerState;
  if (esObjeto(temporizador)) {
    corregidos += normalizarCampos(temporizador, ['blocksCompleted']);
    corregidos += normalizarCampos(temporizador, ['workBlockDuration'], BLOQUE_TRABAJO, 1);
    corregidos += normalizarCampos(temporizador, ['breakDuration'], DESCANSO, 1);
    corregidos += normalizarCampos(temporizador, ['soleusInterval'], INTERVALO_SOLEO, 1);
  }

  return corregidos;
};

/**
 * Normaliza el año del cuaderno.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarAñoCuaderno = (data) => {
  const cuaderno = data?.notebook;
  if (!esObjeto(cuaderno)) return 0;

  const valor = cuaderno.year;
  if (valor === undefined || valor === null) return 0;

  const numero = Number(valor);
  const limpio = Number.isFinite(numero) ? Math.trunc(numero) : new Date().getFullYear();
  if (limpio === valor) return 0;

  cuaderno.year = limpio;
  return 1;
};

/**
 * Devuelve la puntuación de un área con sus números en su sitio.
 *
 * @param {*} scores - Mapa de puntuaciones por área.
 * @param {string} areaId - Identificador del área.
 * @returns {Object} La puntuación con `current` y `desired` como números.
 */
export const puntuacionDe = (scores, areaId) => {
  const score = scores?.[areaId];
  if (!esObjeto(score)) return { current: 0, desired: 0 };

  return {
    ...score,
    current: numeroSeguro(score.current, 0),
    desired: numeroSeguro(score.desired, 0)
  };
};

/**
 * Normaliza la duración del hábito activo y la de sus actividades.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarDuracionHabito = (data) => {
  const habito = data?.habits?.active;
  if (!esObjeto(habito)) return 0;

  let corregidos = normalizarCampos(habito, ['duration'], DURACION_HABITO, 1, true);
  corregidos += normalizarDuracionesDeLista(habito.activities, 0, 0);

  return corregidos;
};

/**
 * Normaliza la duración de las actividades atélicas.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarDuracionesAtelicas = (data) => {
  return normalizarDuracionesDeLista(data?.atelicActivities, 0, 0);
};

/**
 * Normaliza el límite diario del Volumen Fijo.
 *
 * El modelo admite de 1 a 3 prioridades al día. Cualquier otra cosa se deja
 * en 3, que es el valor por defecto de la app.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarLimiteDiario = (data) => {
  const setup = data?.dailySetup;
  if (!esObjeto(setup)) return 0;

  const valor = setup.dailyLimit;
  if (valor === undefined || valor === null) return 0;

  const numero = Number(valor);
  const limpio = Number.isInteger(numero) && numero >= 1 && numero <= 3 ? numero : 3;
  if (limpio === valor) return 0;

  setup.dailyLimit = limpio;
  return 1;
};

/**
 * Normaliza todos los valores numéricos del modelo.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarNumeros = (data) => {
  if (!esObjeto(data)) return 0;

  return normalizarPuntuaciones(data)
    + normalizarContadoresMuévete(data)
    + normalizarAñoCuaderno(data)
    + normalizarDuracionHabito(data)
    + normalizarDuracionesAtelicas(data)
    + normalizarLimiteDiario(data);
};
