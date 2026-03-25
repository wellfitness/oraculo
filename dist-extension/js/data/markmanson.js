/**
 * Oráculo - Sistema Mark Manson
 * Filosofía sobre valores, sufrimiento y lo que realmente importa
 *
 * Extraído del libro "El sutil arte de que casi todo te importe una mierda" - Versión Diario
 */

// ============================================================
// REFLEXIONES POR TEMA
// ============================================================

/**
 * TEMA: VALORES
 * Sobre qué importa realmente y cómo elegir valores conscientes
 */
const VALORES = [
  "Nuestros valores determinan la naturaleza de nuestros problemas, y la naturaleza de nuestros problemas determina la calidad de nuestra vida. Buenos valores equivalen a buena vida.",
  "Los valores no significan nada sin la acción.",
  "Recuerda, más allá de cómo pienses o sientas o desees que sea tu vida, los verdaderos valores se reflejan en tus actos y decisiones.",
  "Todos escogemos qué cosas nos importan de verdad en cada momento, tanto si nos damos cuenta como si no. Si te estás preguntando qué cosas deben importarte, entonces las fuerzas que te rodean decidirán tus valores por ti.",
  "Si no estás satisfecho con los problemas a los que te enfrentas actualmente en tu vida, echa una larga y severa mirada a los valores que han traído esos problemas. Quizá sea hora de cambiar tus prioridades.",
  "Solo puedes dar importancia a un número limitado de cosas. A muy pocas cosas, de hecho. Y si andas por ahí dando importancia a todo y a todos sin pensarlo o decidirlo conscientemente... bueno, entonces vas a acabar jodido."
];

/**
 * TEMA: FELICIDAD Y PROBLEMAS
 * Sobre la naturaleza real de la felicidad
 */
const FELICIDAD = [
  "La verdadera felicidad se produce solo cuando descubres los problemas que te gusta tener y disfrutas resolviéndolos.",
  "La felicidad no es algo que esté fuera de nosotros: es simplemente una elección, una elección basada en lo que decidimos valorar y consideramos importante en cada momento.",
  "El deseo de una experiencia más positiva es en sí mismo una experiencia negativa. Y paradójicamente, la aceptación de una experiencia negativa es en sí misma una experiencia positiva.",
  "Las emociones negativas son una llamada a la acción. Son el agente preferido de la naturaleza para inspirar un cambio."
];

/**
 * TEMA: RESPONSABILIDAD Y CONTROL
 * Sobre lo que podemos y no podemos cambiar
 */
const RESPONSABILIDAD = [
  "Concéntrate en lo que puedes controlar. A la mierda lo demás.",
  "Solo porque algo no sea culpa tuya no quiere decir que no sea responsabilidad tuya. Nuestra capacidad para actuar y cambiar es proporcional a la cantidad de responsabilidad que asumimos.",
  "Consuélate: nadie sabe en realidad qué demonios está haciendo. Todo el mundo sigue simplemente la conjetura que ahora mismo le parece mejor."
];

/**
 * TEMA: CRECIMIENTO PERSONAL
 * Sobre el proceso de crecer y cambiar
 */
const CRECIMIENTO = [
  "Todo crecimiento requiere una pérdida. Una pérdida de tus antiguos valores, de tus antiguos comportamientos, de tus antiguos amores, de tu antigua identidad. Por lo tanto, el crecimiento tiene con frecuencia un componente doloroso.",
  "No desarrollas resiliencia psicológica sintiéndote bien todo el tiempo. Desarrollas resiliencia adquiriendo una mayor capacidad para sentirte mal.",
  "El sacrificio no es la antítesis de una vida satisfactoria y realizada. El sacrificio forma parte de una vida satisfactoria y realizada."
];

/**
 * TEMA: AUTENTICIDAD
 * Sobre ser uno mismo
 */
const AUTENTICIDAD = [
  "Es mejor ser odiado por lo que eres que amado por lo que no eres.",
  "Yo digo que no te encuentres a ti mismo. Yo digo que nunca llegues a saber lo que eres. Porque es eso lo que te hace seguir esforzándote y descubriéndote. Y te obliga a ser humilde en tus juicios y a aceptar las diferencias de los demás.",
  "Pese a lo que dicen todos los clichés, no deberíamos fiarnos necesariamente de nuestras propias emociones. De hecho, deberíamos adquirir el hábito de cuestionarlas."
];

/**
 * TEMA: RELACIONES Y AUTOCUIDADO
 * Sobre conexiones y cuidarse
 */
const RELACIONES = [
  "Si quieres ser amado, ama. Si quieres ser apreciado, aprecia a los demás. Si quieres ser respetado, respeta a los demás.",
  "Amarte a ti mismo suele ser molesto y aburrido. Ahorrar para tu jubilación es amarte a ti mismo. Acostarse temprano es amarte a ti mismo. Comerte una maldita ensalada es amarte a ti mismo."
];

// ============================================================
// REFLEXIONES POR CONTEXTO DE LA APP
// ============================================================

/**
 * Reflexiones para VALORES (Brújula de Valores)
 */
const MANSON_VALUES = [
  ...VALORES,
  "Recuerda, más allá de cómo pienses o sientas o desees que sea tu vida, los verdaderos valores se reflejan en tus actos y decisiones.",
  "El sacrificio no es la antítesis de una vida satisfactoria y realizada. El sacrificio forma parte de una vida satisfactoria y realizada."
];

/**
 * Reflexiones para RUEDA DE LA VIDA
 */
const MANSON_LIFEWHEEL = [
  ...FELICIDAD,
  ...RELACIONES,
  "Si no estás satisfecho con los problemas a los que te enfrentas actualmente en tu vida, echa una larga y severa mirada a los valores que han traído esos problemas."
];

/**
 * Reflexiones para DIARIO
 */
const MANSON_JOURNAL = [
  ...CRECIMIENTO,
  ...AUTENTICIDAD,
  ...RESPONSABILIDAD
];

// ============================================================
// HERRAMIENTAS DE REFLEXIÓN
// ============================================================

/**
 * HERRAMIENTA 1: Gratitud
 * "Cierra el pico y sé agradecida"
 */
const HERRAMIENTA_GRATITUD = {
  id: 'gratitude',
  titulo: "Cierra el pico y sé agradecida",
  subtitulo: "La gratitud es como vitamina D para el alma",
  descripcion: "Una pequeña dosis proporciona un chute de inmunidad frente a las chorradas y te ayuda a mantener una salud psicológica robusta.",
  instruccion: "Lista cosas por las que te sientes agradecida. Pueden ser abstractas o concretas. Vuélvete loca de gratitud.",
  icono: "favorite",
  prompts: [
    "¿Qué 3 cosas agradeces hoy?",
    "¿Qué persona ha hecho tu vida mejor esta semana?",
    "¿Qué tienes ahora que antes deseabas?",
    "¿Qué parte de tu cuerpo funciona bien y agradeces?",
    "¿Qué problema NO tienes que otras personas sí tienen?"
  ]
};

/**
 * HERRAMIENTA 2: Lista Soltar
 * "A la mierda"
 */
const HERRAMIENTA_SOLTAR = {
  id: 'letting-go',
  titulo: "Lista 'A la mierda'",
  subtitulo: "Identifica lo que no te enriquece",
  descripcion: "Identificar a la gente y las cosas de tu vida que no te enriquecen ni te ayudan como persona... y deshacerte de ellas.",
  instruccion: "Haz una lista de cosas que quieres que dejen de importarte. Cosas que necesitas soltar.",
  icono: "delete_sweep",
  ejemplos: [
    "Decir que 'sí' demasiado a menudo a cosas que no importan",
    "El drama absurdo que mi familia monta sin ningún motivo",
    "La angustia de estar a la altura de las expectativas del mundo",
    "Preocuparme por lo que piensen los demás",
    "Comparar mi vida con la de otros en redes sociales"
  ],
  prompts: [
    "¿Qué te preocupa que realmente no puedes controlar?",
    "¿A qué le estás dando importancia que no la merece?",
    "¿Qué expectativas de otros estás intentando cumplir sin querer?",
    "¿Qué deberías soltar para tener más paz?",
    "¿Qué 'debería' te está haciendo infeliz?"
  ]
};

/**
 * HERRAMIENTA 3: Análisis de Control
 * "¿Qué puedes cambiar?"
 */
const HERRAMIENTA_CONTROL = {
  id: 'control-analysis',
  titulo: "¿Qué puedes controlar?",
  subtitulo: "Concéntrate en lo que puedes cambiar",
  descripcion: "El primer paso para abordar cualquier problema es determinar qué aspectos podemos controlar y cuáles no.",
  instruccion: "Analiza tu problema separando lo que puedes y no puedes cambiar.",
  icono: "tune",
  noPuedesControlar: [
    "El pasado",
    "El mundo",
    "Las otras personas"
  ],
  puedesControlar: [
    "Tu actitud",
    "Tus suposiciones",
    "Tu comportamiento"
  ],
  prompts: [
    "Describe el problema que te preocupa",
    "¿Qué aspectos de este problema están fuera de tu control?",
    "¿Qué aspectos SÍ puedes controlar o influenciar?",
    "¿Qué acción concreta puedes tomar esta semana?",
    "¿Qué necesitas aceptar y soltar?"
  ]
};

/**
 * HERRAMIENTA 4: Reflexión Compasiva
 * Procesar días difíciles con autocompasión
 */
const HERRAMIENTA_COMPASION = {
  id: 'compassionate-reflection',
  titulo: "Reflexión Compasiva",
  subtitulo: "Habla contigo como hablarías con alguien a quien amas",
  descripcion: "Cuando tenemos un día difícil, solemos ser muy duras con nosotras mismas. Esta herramienta te ayuda a procesar lo ocurrido desde la compasión, no desde la crítica.",
  instruccion: "Responde a cada pregunta con honestidad. No hay respuestas correctas. El objetivo es entenderte y tratarte con amabilidad.",
  icono: "spa",
  ejemplos: [
    "Me siento frustrada porque no logré hacer todo lo que quería",
    "Estoy siendo muy dura conmigo misma por un error en el trabajo",
    "No tengo energía y me siento culpable por descansar",
    "Me comparo con otras personas y me siento menos"
  ],
  prompts: [
    "¿Qué pasó hoy? Describe los hechos, sin juzgarte.",
    "¿Qué te estás diciendo a ti misma sobre esto?",
    "¿Qué le dirías a una amiga que estuviera pasando por lo mismo?",
    "¿Qué puedes aprender de esta experiencia?",
    "Escribe un mensaje de compasión para ti misma."
  ]
};

// ============================================================
// GUÍA DE VALORES
// ============================================================

/**
 * Características de buenos vs malos valores
 */
const BUENOS_VALORES = {
  caracteristicas: [
    "Realistas",
    "Constructivos",
    "Controlables"
  ],
  ejemplos: [
    "Honestidad",
    "Vulnerabilidad",
    "Defenderse uno por sí mismo",
    "Defender a los demás",
    "Respetarse uno mismo",
    "Curiosidad",
    "Humildad",
    "Creatividad"
  ]
};

const MALOS_VALORES = {
  caracteristicas: [
    "De raíz emocional",
    "Destructivos",
    "Incontrolables"
  ],
  ejemplos: [
    "Dominar a los demás",
    "Sentirse bien constantemente",
    "Ser siempre el centro de atención",
    "No estar solo nunca",
    "Gustar a todo el mundo"
  ]
};

/**
 * Preguntas de coherencia actos-valores
 */
const PREGUNTAS_COHERENCIA = [
  "¿Cómo han reflejado tus actos tus valores personales?",
  "Si te cuesta hacer coincidir tus actos con tus valores, ¿qué estás priorizando de hecho? ¿Qué dicen en realidad tus actos?",
  "¿Qué influencias o actos puedes eliminar de tu vida para vivir más de acuerdo con tus valores?"
];

/**
 * Pregunta para valores en conflicto
 */
const PREGUNTA_CONFLICTO = "¿Cuál es la perturbación o el conflicto que estás experimentando en tu vida y que te ha llevado a cuestionar ahora mismo tus valores?";

// ============================================================
// TRIÁNGULO DE LA FELICIDAD (para Rueda de la Vida)
// ============================================================

const TRIANGULO_FELICIDAD = {
  areas: [
    {
      nombre: "Libertad",
      icono: "flight_takeoff",
      descripcion: "Control sobre cómo empleas tu tiempo",
      insight: "La forma en que ganas tu dinero es más importante que la cantidad de dinero que ganas."
    },
    {
      nombre: "Relaciones",
      icono: "group",
      descripcion: "Calidad de conexiones humanas",
      insight: "Cuanto mejores son las relaciones, más felices y satisfechos estamos."
    },
    {
      nombre: "Salud",
      icono: "favorite",
      descripcion: "Base de todo lo demás",
      insight: "Si todos los aspectos de tu vida son un desastre, empieza por la salud."
    }
  ],
  conexion: "Los tres se retroalimentan. Mejorar uno impacta positivamente en los otros dos."
};

// ============================================================
// FUNCIONES DE UTILIDAD
// ============================================================

/**
 * Obtiene una reflexión aleatoria para un contexto específico
 * @param {string} contexto - values, lifewheel, journal
 * @returns {string} Una reflexión de Manson
 */
export const getReflexion = (contexto) => {
  const reflexiones = REFLEXIONES_POR_CONTEXTO[contexto] || MANSON_JOURNAL;
  return reflexiones[Math.floor(Math.random() * reflexiones.length)];
};

/**
 * Obtiene una reflexión que rota según el día
 * @param {string} contexto - El contexto de la app
 * @returns {string} Una reflexión de Manson
 */
export const getReflexionDelDia = (contexto) => {
  const reflexiones = REFLEXIONES_POR_CONTEXTO[contexto] || MANSON_JOURNAL;
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % reflexiones.length;
  return reflexiones[index];
};

/**
 * Obtiene una reflexión de un tema específico
 * @param {string} tema - valores, felicidad, responsabilidad, crecimiento, autenticidad, relaciones
 * @returns {string} Una reflexión del tema
 */
export const getReflexionPorTema = (tema) => {
  const temas = {
    valores: VALORES,
    felicidad: FELICIDAD,
    responsabilidad: RESPONSABILIDAD,
    crecimiento: CRECIMIENTO,
    autenticidad: AUTENTICIDAD,
    relaciones: RELACIONES
  };
  const reflexiones = temas[tema] || VALORES;
  return reflexiones[Math.floor(Math.random() * reflexiones.length)];
};

/**
 * Obtiene una herramienta por su ID
 * @param {string} id - gratitude, letting-go, control-analysis
 * @returns {Object} La herramienta completa
 */
export const getHerramienta = (id) => {
  const herramientas = {
    'gratitude': HERRAMIENTA_GRATITUD,
    'letting-go': HERRAMIENTA_SOLTAR,
    'control-analysis': HERRAMIENTA_CONTROL,
    'compassionate-reflection': HERRAMIENTA_COMPASION
  };
  return herramientas[id] || null;
};

/**
 * Obtiene todas las herramientas disponibles
 * @returns {Object[]} Array de herramientas
 */
export const getHerramientas = () => [
  HERRAMIENTA_GRATITUD,
  HERRAMIENTA_SOLTAR,
  HERRAMIENTA_CONTROL,
  HERRAMIENTA_COMPASION
];

/**
 * Obtiene la guía de buenos valores
 * @returns {Object} Buenos valores con características y ejemplos
 */
export const getBuenosValores = () => BUENOS_VALORES;

/**
 * Obtiene la guía de malos valores
 * @returns {Object} Malos valores con características y ejemplos
 */
export const getMalosValores = () => MALOS_VALORES;

/**
 * Obtiene las preguntas de coherencia actos-valores
 * @returns {string[]} Las preguntas
 */
export const getPreguntasCoherencia = () => PREGUNTAS_COHERENCIA;

/**
 * Obtiene el triángulo de la felicidad
 * @returns {Object} El triángulo con sus áreas
 */
export const getTrianguloFelicidad = () => TRIANGULO_FELICIDAD;

// ============================================================
// 6 HÁBITOS NADA SEXIS (para Laboratorio de Hábitos)
// ============================================================

const HABITOS_MANSON = [
  {
    id: 'ejercicio',
    nombre: 'Ejercicio',
    icono: 'fitness_center',
    area: 'ejercicio',
    descripcion: 'Empieza de forma sencilla. No sobreestimes el esfuerzo necesario.',
    microVersion: '30 minutos caminando al día',
    identidad: 'Soy una persona que mueve su cuerpo cada día',
    beneficios: ['Más energía', 'Mejor humor', 'Claridad mental']
  },
  {
    id: 'cocinar',
    nombre: 'Cocinar',
    icono: 'cooking',
    area: 'alimentacion',
    descripcion: 'Control sobre qué y cuánto comes.',
    microVersion: 'Preparar una comida casera al día',
    identidad: 'Soy una persona que nutre su cuerpo con comida real',
    beneficios: ['Más energía', 'Mejor concentración', 'Mejor humor']
  },
  {
    id: 'meditacion',
    nombre: 'Meditación',
    icono: 'self_improvement',
    area: 'descanso',
    descripcion: 'Incluso 1 minuto al día produce beneficios.',
    microVersion: '1 minuto de respiración consciente',
    identidad: 'Soy una persona que cultiva la calma interior',
    beneficios: ['Autoconocimiento', 'Reducción del estrés', 'Claridad']
  },
  {
    id: 'lectura',
    nombre: 'Lectura',
    icono: 'menu_book',
    area: 'descanso',
    descripcion: 'Te hace más empático e informado. Si no disfrutas un libro, déjalo.',
    microVersion: '10 páginas al día (o 15 minutos)',
    identidad: 'Soy una persona que alimenta su mente con buenas lecturas',
    beneficios: ['Empatía', 'Conocimiento', 'Relajación']
  },
  {
    id: 'escribir',
    nombre: 'Escribir',
    icono: 'edit_note',
    area: 'organizacion',
    descripcion: 'Herramienta de autodescubrimiento. Terapéutico.',
    microVersion: '5 minutos de escritura libre',
    identidad: 'Soy una persona que procesa sus pensamientos escribiendo',
    beneficios: ['Autodescubrimiento', 'Claridad mental', 'Terapéutico']
  },
  {
    id: 'relacionarse',
    nombre: 'Relacionarse',
    icono: 'groups',
    area: 'descanso',
    descripcion: 'La soledad es tan nociva como fumar.',
    microVersion: 'Escribir a un amigo diferente cada día',
    identidad: 'Soy una persona que cultiva sus relaciones',
    beneficios: ['Conexión', 'Apoyo social', 'Bienestar emocional']
  }
];

/**
 * Obtiene los 6 hábitos recomendados por Manson
 * @returns {Object[]} Array de hábitos con sus propiedades
 */
export const getHabitosManson = () => HABITOS_MANSON;

// ============================================================
// MAPEO DE CONTEXTOS
// ============================================================

const REFLEXIONES_POR_CONTEXTO = {
  values: MANSON_VALUES,
  lifewheel: MANSON_LIFEWHEEL,
  journal: MANSON_JOURNAL
};

// ============================================================
// EXPORTACIONES
// ============================================================

export const MANSON = {
  // Reflexiones por tema
  temas: {
    valores: VALORES,
    felicidad: FELICIDAD,
    responsabilidad: RESPONSABILIDAD,
    crecimiento: CRECIMIENTO,
    autenticidad: AUTENTICIDAD,
    relaciones: RELACIONES
  },

  // Reflexiones por contexto
  contextos: REFLEXIONES_POR_CONTEXTO,

  // Herramientas
  herramientas: {
    gratitud: HERRAMIENTA_GRATITUD,
    soltar: HERRAMIENTA_SOLTAR,
    control: HERRAMIENTA_CONTROL,
    compasion: HERRAMIENTA_COMPASION
  },

  // Guía de valores
  buenosValores: BUENOS_VALORES,
  malosValores: MALOS_VALORES,
  preguntasCoherencia: PREGUNTAS_COHERENCIA,
  preguntaConflicto: PREGUNTA_CONFLICTO,

  // Triángulo de la felicidad
  trianguloFelicidad: TRIANGULO_FELICIDAD,

  // 6 Hábitos Nada Sexis
  habitosManson: HABITOS_MANSON,

  // Funciones de utilidad
  getReflexion,
  getReflexionDelDia,
  getReflexionPorTema,
  getHerramienta,
  getHerramientas,
  getBuenosValores,
  getMalosValores,
  getPreguntasCoherencia,
  getTrianguloFelicidad,
  getHabitosManson
};

export default MANSON;
