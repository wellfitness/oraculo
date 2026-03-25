/**
 * Oráculo - Sistema Burkeman
 * Reflexiones filosóficas y técnicas de Oliver Burkeman
 *
 * Este archivo centraliza toda la filosofía de Burkeman para que
 * las reflexiones refuercen la mentalidad en cada momento de la app.
 */

// ============================================================
// REFLEXIONES POR PILAR FILOSÓFICO
// ============================================================

/**
 * PILAR 1: ENFRENTAR LA FINITUD
 * Aceptar que nuestro tiempo es limitado (~4000 semanas)
 * y que no podemos hacerlo todo.
 */
const FINITUD = [
  "Si tenemos suerte, tendremos unas cuatro mil semanas. ¿Cómo quieres usar la de hoy?",
  "La vida es, en esencia, un desafío de gestión del tiempo.",
  "La mayoría de nuestros problemas con el tiempo provienen de evitar enfrentar que es finito.",
  "Volverse más rápida tachando cosas no te hace sentir menos estresada.",
  "No puedes hacerlo todo. Y eso está bien.",
  "Hay demasiadas rocas grandes. Tienes que decidir cuáles priorizar.",
  "Cada vez que dices 'sí' a algo, estás diciendo 'no' a todo lo demás.",
  "Decidir significa cortar alternativas. Busca decisiones, no las evites.",
  "El tiempo que tienes es el tiempo que tienes. Úsalo en lo que importa.",
  "Priorizar significa decepcionar algunas expectativas, incluidas las tuyas."
];

/**
 * PILAR 2: PRINCIPIO DE INCOMODIDAD
 * El crecimiento personal se siente incómodo por definición.
 * No evites el "cringe", apóyate en él.
 */
const INCOMODIDAD = [
  "El cambio personal y el crecimiento se sienten incómodos por definición.",
  "Si sientes incomodidad, no es señal de que algo esté mal, sino de que estás creciendo.",
  "Las técnicas que me resultaron incómodas fueron las que más necesité.",
  "Tuve que inclinarme hacia el rechazo. Ahí está el crecimiento.",
  "No te trates a ti misma de maneras que no tratarías a un amigo.",
  "¿Dónde estás tomando decisiones al servicio de la comodidad, cuando lo que se requiere es incomodidad?"
];

/**
 * PILAR 3: CUESTIONAMIENTO PROFUNDO
 * En lugar de buscar respuestas rápidas, "vive las preguntas".
 */
const CUESTIONAMIENTO = [
  "El punto no es encontrar respuestas sólidas, sino vivir las preguntas.",
  "Debes ser tú misma. No le sirve a nadie que reprimas a quien sabes que eres.",
  "Pregúntate: ¿esta elección te agranda o te disminuye?",
  "La verdad es que todos estamos improvisando, todo el tiempo.",
  "La vida se desarrolla en momentos presentes. En algún momento tendrás que estar presente.",
  "¿A qué estás diciendo NO para poder decir SÍ a esto?"
];

/**
 * Las 3 Preguntas de Jung - Para reflexión profunda en el Diario
 */
const PREGUNTAS_JUNG = [
  "¿Dónde en tu vida deberías elegir la incomodidad?",
  "¿Has aceptado ya quién eres?",
  "¿Esta elección te agranda o te disminuye?"
];

/**
 * PILAR 4: INSIGNIFICANCIA CÓSMICA
 * Soltar la presión de "dejar huella en el universo".
 * A largo plazo, no importa tanto.
 */
const INSIGNIFICANCIA = [
  "Hay algo muy reductor del estrés en aceptar tu insignificancia cósmica.",
  "Si decides que lo que haces solo importa si se recordará en siglos, te pones presión inútil.",
  "Un gran peso se levanta de tus hombros cuando sueltas esa expectativa.",
  "Sostener tu vida a un estándar de significado que exija que importe durante siglos es arbitrario.",
  "Adoptar una 'mente de principiante' te hace receptiva al aprendizaje.",
  "No tienes que ganarte el derecho a existir siendo productiva."
];

/**
 * PILAR 5: IMPERFECCIÓN LIBERADORA
 * La procrastinación viene del perfeccionismo.
 * La liberación viene de aceptar la imperfección.
 */
const IMPERFECCION = [
  "Nunca podrás escribir la novela que fantaseaste, y eso está bien.",
  "Usar tu tiempo de manera significativa siempre será cuestión de tomar una acción imperfecta tras otra.",
  "Es un error esperar hasta que te sientas completamente lista.",
  "La única diferencia entre tú y quienes ya lanzaron sus proyectos es que estuvieron dispuestos a improvisar.",
  "La paciencia es una forma muy poderosa de hacer las cosas.",
  "Incrementalismo Radical: estar dispuesta a lograr solo una pequeña cantidad de progreso.",
  "La única forma de convertirte en quien quieres ser es hacer la cosa una vez.",
  "Quédate en el maldito autobús. La originalidad viene después."
];

// ============================================================
// REFLEXIONES POR CONTEXTO DE LA APP
// ============================================================

/**
 * Reflexiones para el DASHBOARD
 * Momento: Al empezar el día, ver el panorama general
 */
const DASHBOARD = [
  ...FINITUD.slice(0, 5),
  "La vida se desarrolla en una secuencia de momentos presentes. Este es uno de ellos.",
  "No buscamos libertad del tiempo, sino libertad en el tiempo.",
  "Usar tu tiempo de manera significativa siempre será cuestión de tomar una acción imperfecta tras otra."
];

/**
 * Reflexiones para el KANBAN / HORIZONTES
 * Momento: Al gestionar tareas, priorizar, mover entre columnas
 */
const KANBAN = [
  "Hay demasiadas rocas grandes. Tienes que decidir cuáles priorizar.",
  "El verdadero arte no es meter más cosas en tu día, sino aprender la negligencia creativa.",
  "Vivimos en un mundo de entradas infinitas. Hacer más solo atrae más cosas para hacer.",
  "Decidir significa cortar alternativas. Busca decisiones, no las evites.",
  "Cada vez que dices 'sí' a algo, estás diciendo 'no' a todo lo demás.",
  "Priorizar significa decepcionar algunas expectativas, incluidas las tuyas.",
  "Tienes 20 opciones pero solo tiempo para 5. No es una lista para terminar, es un menú para elegir."
];

/**
 * Reflexiones para HÁBITOS
 * Momento: Al crear, mantener o reflexionar sobre hábitos
 */
const HABITOS = [
  "La paciencia es una forma muy poderosa de hacer las cosas. A veces llegas más rápido yendo más despacio.",
  "La única forma de convertirte en el tipo de persona que hace tales cosas es hacer la cosa una vez.",
  "Incrementalismo Radical: estar dispuesta a lograr solo una pequeña cantidad de progreso.",
  "Quédate en el maldito autobús. La originalidad viene después de las etapas de imitación.",
  "Es un error esperar hasta que te sientas completamente lista.",
  "El cambio personal y el crecimiento se sienten incómodos por definición."
];

/**
 * Reflexiones para el CALENDARIO
 * Momento: Al planificar eventos, ver la semana
 */
const CALENDARIO = [
  "Casi todas las cosas que valen la pena requieren coordinar tu tiempo con otras personas.",
  "El tiempo es un bien de red: su valor aumenta cuando lo compartes.",
  "Inscribirse en grupos con horario fijo es una rendición de libertad que te libera.",
  "Cuanto más buscamos una vida exclusivamente conveniente, más solos nos encontramos.",
  "Poner esfuerzo para hacer las cosas de forma menos conveniente puede ser gratificante."
];

/**
 * Reflexiones para el DIARIO
 * Momento: Al escribir, reflexionar
 */
const DIARIO = [
  "El punto no es encontrar respuestas sólidas, sino vivir las preguntas.",
  "Pregúntate: ¿esta elección te agranda o te disminuye?",
  "Debes ser tú misma. No le sirve a nadie que reprimas a quien sabes que eres.",
  "La verdad es que todos estamos improvisando, todo el tiempo.",
  "La vida se desarrolla en momentos presentes. En algún momento tendrás que estar presente.",
  "¿A qué estás diciendo NO para poder decir SÍ a esto?"
];

/**
 * Reflexiones para VALORES
 * Momento: Al definir o revisar valores personales
 */
const VALORES = [
  "¿Dónde estás tomando decisiones al servicio de la comodidad, cuando lo que se requiere es incomodidad?",
  "¿Has aceptado ya quién eres?",
  "Adoptar una 'mente de principiante' te hace receptiva al aprendizaje.",
  "Hay algo muy reductor del estrés en aceptar tu insignificancia cósmica.",
  "Debes ser tú misma. No le sirve a nadie que reprimas a quien sabes que eres."
];

/**
 * Reflexiones para MOMENTOS DE DECISIÓN
 * Momento: Al elegir qué hacer, mover tarea a "hoy", etc.
 */
const DECISIONES = [
  "La alegría de tomar una decisión es que altera tu realidad. En esa nueva realidad, todo es avanzar.",
  "Priorizar significa decepcionar algunas expectativas, incluidas las tuyas.",
  "El verdadero arte no es meter más cosas en tu día, sino aprender la negligencia creativa.",
  "Tienes que decidir aquí y ahora adoptar una actitud más sensata hacia el tiempo.",
  "Cada vez que decides dedicar una hora a una cosa, no la estás dedicando a infinitas otras.",
  "No es que tengamos poco tiempo, es que intentamos meter demasiado."
];

/**
 * Reflexiones para DESCANSO Y OCIO
 * Momento: En sección atélica, después de completar tareas
 */
const DESCANSO = [
  "Si no hay espacio para cosas divertidas y reconstituyentes, algo ha ido mal.",
  "Hemos llegado a tratar el tiempo libre como algo de lo que sacar provecho productivo.",
  "Una actividad atélica es una que haces por sí misma, no por su resultado.",
  "Es beneficioso y satisfactorio hacer algo en lo que no eres muy buena.",
  "El ocio es un fin en sí mismo, no un medio para ser más productiva.",
  "No tienes que ganarte el derecho a existir siendo productiva."
];

/**
 * Reflexiones para LOGROS
 * Momento: Al ver lo completado, celebrar
 */
const LOGROS = [
  "Celebra lo que has logrado. Cada pequeño paso cuenta.",
  "Usar tu tiempo de manera significativa siempre será cuestión de tomar una acción imperfecta tras otra.",
  "La única diferencia entre tú y quienes ya lanzaron sus proyectos es que estuvieron dispuestos a improvisar.",
  "Incrementalismo Radical: estar dispuesta a lograr solo una pequeña cantidad de progreso."
];

// ============================================================
// PROMPTS ESPECIALES PARA EL DIARIO
// ============================================================

/**
 * Prompts para tipo de entrada "Incomodidad"
 * Registro de crecimiento a través de la incomodidad
 */
const PROMPTS_INCOMODIDAD = [
  "¿Qué nueva acción te generó incomodidad hoy?",
  "¿Qué emociones surgieron?",
  "¿Qué aprendiste de ello?",
  "¿Cómo te sentiste después de hacerlo?",
  "Si sientes incomodidad, no es señal de que algo esté mal, sino de que estás creciendo."
];

/**
 * Ejercicio de Zooming-Out
 * Para reducir ansiedad antes de escribir
 */
const ZOOMING_OUT = `Imagina que ves tu vida desde muy lejos, desde el espacio.
Todas esas preocupaciones... ¿qué tamaño tienen ahora?
Respira. Escribe sin juzgarte.`;

/**
 * Ejercicio de Derrotar la Fantasía Perfecta
 * Para combatir el perfeccionismo
 */
const DERROTAR_FANTASIA = `Escribe la versión "perfecta" de lo que quieres lograr.
Ahora, conscientemente, derrótala.
¿Cuál es la versión imperfecta que puedes empezar HOY?`;

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Obtiene una reflexión aleatoria para un contexto específico
 * @param {string} contexto - dashboard, kanban, habits, calendar, journal, values, decisions, rest, achievements
 * @returns {string} Una reflexión de Burkeman
 */
export const getReflexion = (contexto) => {
  const reflexiones = REFLEXIONES_POR_CONTEXTO[contexto] || DASHBOARD;
  return reflexiones[Math.floor(Math.random() * reflexiones.length)];
};

/**
 * Obtiene una reflexión que rota según el día
 * (Misma reflexión durante todo el día, cambia al día siguiente)
 * @param {string} contexto - El contexto de la app
 * @returns {string} Una reflexión de Burkeman
 */
export const getReflexionDelDia = (contexto) => {
  const reflexiones = REFLEXIONES_POR_CONTEXTO[contexto] || DASHBOARD;
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % reflexiones.length;
  return reflexiones[index];
};

/**
 * Obtiene una reflexión de un pilar filosófico específico
 * @param {string} pilar - finitud, incomodidad, cuestionamiento, insignificancia, imperfeccion
 * @returns {string} Una reflexión del pilar
 */
export const getReflexionPorPilar = (pilar) => {
  const pilares = {
    finitud: FINITUD,
    incomodidad: INCOMODIDAD,
    cuestionamiento: CUESTIONAMIENTO,
    insignificancia: INSIGNIFICANCIA,
    imperfeccion: IMPERFECCION
  };
  const reflexiones = pilares[pilar] || FINITUD;
  return reflexiones[Math.floor(Math.random() * reflexiones.length)];
};

/**
 * Obtiene las 3 preguntas de Jung para reflexión profunda
 * @returns {string[]} Las 3 preguntas
 */
export const getPreguntasJung = () => PREGUNTAS_JUNG;

/**
 * Obtiene los prompts para una entrada de tipo "Incomodidad"
 * @returns {string[]} Los prompts
 */
export const getPromptsIncomodidad = () => PROMPTS_INCOMODIDAD;

/**
 * Obtiene el ejercicio de Zooming-Out
 * @returns {string} El texto del ejercicio
 */
export const getZoomingOut = () => ZOOMING_OUT;

/**
 * Obtiene el ejercicio de Derrotar la Fantasía
 * @returns {string} El texto del ejercicio
 */
export const getDerrotarFantasia = () => DERROTAR_FANTASIA;

// ============================================================
// EXPORTACIONES
// ============================================================

// Mapeo de contextos para fácil acceso
const REFLEXIONES_POR_CONTEXTO = {
  dashboard: DASHBOARD,
  kanban: KANBAN,
  habits: HABITOS,
  calendar: CALENDARIO,
  journal: DIARIO,
  values: VALORES,
  decisions: DECISIONES,
  rest: DESCANSO,
  achievements: LOGROS
};

// Exportar todo el sistema Burkeman
export const BURKEMAN = {
  // Pilares filosóficos
  pilares: {
    finitud: FINITUD,
    incomodidad: INCOMODIDAD,
    cuestionamiento: CUESTIONAMIENTO,
    insignificancia: INSIGNIFICANCIA,
    imperfeccion: IMPERFECCION
  },

  // Reflexiones por contexto
  contextos: REFLEXIONES_POR_CONTEXTO,

  // Elementos especiales
  preguntasJung: PREGUNTAS_JUNG,
  promptsIncomodidad: PROMPTS_INCOMODIDAD,
  zoomingOut: ZOOMING_OUT,
  derrotarFantasia: DERROTAR_FANTASIA,

  // Funciones de utilidad
  getReflexion,
  getReflexionDelDia,
  getReflexionPorPilar,
  getPreguntasJung,
  getPromptsIncomodidad,
  getZoomingOut,
  getDerrotarFantasia
};

export default BURKEMAN;
