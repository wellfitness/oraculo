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

/** Un valor es un objeto si no es nulo, no es un array y tiene tipo objeto. */
const esObjeto = (valor) =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor);

/**
 * Fuerza un valor a número, con un sustituto si no se puede.
 *
 * @param {*} valor - Valor de partida.
 * @param {number} porDefecto - Número a dejar si el valor no es numérico.
 * @returns {number} Un número finito.
 */
const aNumero = (valor, porDefecto) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
};

/**
 * Normaliza los valores numéricos de un modelo de tarea.
 *
 * @param {*} tarea - Tarea a normalizar.
 * @param {string[]} campos - Campos que deben ser números.
 * @param {number} porDefecto - Valor a dejar si el campo no es numérico.
 * @returns {number} Cuántos campos se han corregido.
 */
const normalizarCampos = (tarea, campos, porDefecto = 0) => {
  if (!esObjeto(tarea)) return 0;

  let corregidos = 0;

  for (const campo of campos) {
    const valor = tarea[campo];
    if (valor === undefined || valor === null) continue;

    const numero = aNumero(valor, porDefecto);
    if (numero !== valor) {
      tarea[campo] = numero;
      corregidos++;
    }
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
      corregidos += normalizarCampos(evaluacion.scores[areaId], ['current', 'desired']);
    }
  }

  return corregidos;
};

/**
 * Normaliza los contadores de Muévete.
 *
 * El registro de actividad lleva cuántos descansos se completaron y cuántos
 * se cortaron, y el temporizador lleva los bloques hechos. Se suman y se
 * pintan, así que tienen que ser números.
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

  const temporizador = data?.muevete?.timerState;
  if (esObjeto(temporizador)) {
    corregidos += normalizarCampos(temporizador, ['blocksCompleted']);
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
    current: aNumero(score.current, 0),
    desired: aNumero(score.desired, 0)
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

  let corregidos = normalizarCampos(habito, ['duration'], 30);

  const actividades = habito.activities;
  if (Array.isArray(actividades)) {
    for (const actividad of actividades) {
      corregidos += normalizarCampos(actividad, ['duration']);
    }
  }

  return corregidos;
};

/**
 * Normaliza la duración de las actividades atélicas.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos valores se han corregido.
 */
export const normalizarDuracionesAtelicas = (data) => {
  const actividades = data?.atelicActivities;
  if (!Array.isArray(actividades)) return 0;

  let corregidos = 0;
  for (const actividad of actividades) {
    corregidos += normalizarCampos(actividad, ['duration']);
  }

  return corregidos;
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
