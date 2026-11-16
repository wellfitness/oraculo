/**
 * Oráculo - Validador
 * Utilidades para validar la integridad de los datos
 */

import { nombrePorDefecto as nombrePorDefectoDeArea } from './rueda-por-defecto.js';

// Los identificadores de Oráculo los genera la propia app (letras, números,
// punto, guion y guion bajo) y se pintan en atributos como data-id o value.
// Un identificador con comillas o ángulos rompería el marcado, así que un
// archivo que los traiga no se importa.
const PATRON_ID_SEGURO = /^[A-Za-z0-9._-]+$/;
const CLAVES_ID = ['id', 'rocaPrincipal'];
const esClaveDeId = (clave) => CLAVES_ID.includes(clave) || clave.endsWith('Id');

/** Caracteres que se quedan en un identificador al normalizarlo. */
const CARACTERES_ID = /[^A-Za-z0-9._-]/g;

/** Profundidad máxima del recorrido, para no meterse en datos anidados sin fin. */
const PROFUNDIDAD_MAXIMA = 12;

/**
 * Resumen corto y estable de un texto.
 *
 * Se usa para inventar un identificador cuando el original se queda sin
 * caracteres. Tiene que ser el mismo para el mismo texto, porque un
 * identificador y las referencias que apuntan a él se normalizan por separado:
 * si el inventado fuera aleatorio, el vínculo se rompería.
 *
 * @param {string} valor - Texto del que sacar el resumen.
 * @returns {string} Resumen en base 36.
 */
const resumenEstable = (valor) => {
  let h = 0;
  for (let i = 0; i < valor.length; i++) {
    h = (h * 31 + valor.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
};

/**
 * Normaliza un identificador: deja solo los caracteres que la app usa en sus
 * identificadores (letras, números, punto, guion y guion bajo).
 *
 * Es la misma transformación para el identificador y para las referencias que
 * apuntan a él, así que un vínculo entre dos elementos sigue funcionando.
 *
 * @param {string} valor - Identificador de partida.
 * @returns {string} Identificador seguro.
 */
const normalizarIdentificador = (valor) => {
  const limpio = valor.replace(CARACTERES_ID, '');
  if (limpio.length > 0) return limpio;
  return `id-${resumenEstable(valor)}`;
};

/**
 * Normaliza todos los identificadores de los datos, en el sitio.
 *
 * La importación ya rechaza los identificadores con comillas o ángulos, pero
 * los datos también llegan por la sincronización con Drive, que escribe
 * directamente en `localStorage`. Normalizando al cargar, ningún
 * identificador llega al marcado con caracteres que lo rompan, venga de donde
 * venga.
 *
 * @param {*} data - Datos a normalizar.
 * @param {number} [profundidad] - Profundidad actual de la recursión.
 * @returns {*} Los mismos datos, ya normalizados.
 */
export const sanearIdentificadores = (data, profundidad = 0) => {
  if (profundidad > PROFUNDIDAD_MAXIMA || !data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    for (const item of data) sanearIdentificadores(item, profundidad + 1);
    return data;
  }

  // Se recorre con for...in y sin Object.entries porque este recorrido
  // ocurre en cada carga, y cada guardado ya serializa los datos enteros.
  for (const clave in data) {
    if (!Object.hasOwn(data, clave)) continue;
    const contenido = data[clave];

    // El registro de borrados guarda la clave con la que la nube identifica
    // cada elemento, y esa clave puede llevar los dos puntos del historial
    // (`hábito:día`). Si se saneara, dejaría de coincidir con la que usa el
    // motor de fusión y lo borrado volvería. Aquí no hay identificadores de
    // la usuaria que sanear.
    if (clave === '_deletions') continue;

    if (esClaveDeId(clave) && typeof contenido === 'string') {
      data[clave] = normalizarIdentificador(contenido);
    } else if (contenido && typeof contenido === 'object') {
      sanearIdentificadores(contenido, profundidad + 1);
    }
  }

  return data;
};

/**
 * Busca el primer identificador con caracteres no permitidos.
 * No devuelve el valor, solo el nombre de la propiedad: el contenido del
 * archivo no se repite en el mensaje que ve la usuaria.
 *
 * @param {*} valor - Valor a recorrer.
 * @param {number} [profundidad] - Profundidad actual de la recursión.
 * @returns {string|null} Nombre de la propiedad con un identificador inválido.
 */
const buscarIdInvalido = (valor, profundidad = 0) => {
  if (profundidad > 8 || !valor || typeof valor !== 'object') return null;

  if (Array.isArray(valor)) {
    for (const item of valor) {
      const encontrado = buscarIdInvalido(item, profundidad + 1);
      if (encontrado) return encontrado;
    }
    return null;
  }

  for (const [clave, contenido] of Object.entries(valor)) {
    // El registro de borrados guarda la clave con la que la nube identifica
    // cada elemento, y esa clave puede llevar los dos puntos del historial
    // (`hábito:día`). No va al marcado, así que no tiene por qué seguir las
    // reglas de los identificadores de la usuaria.
    if (clave === '_deletions') continue;

    if (esClaveDeId(clave) && typeof contenido === 'string' && !PATRON_ID_SEGURO.test(contenido)) {
      return clave;
    }
    const encontrado = buscarIdInvalido(contenido, profundidad + 1);
    if (encontrado) return encontrado;
  }

  return null;
};

/**
 * Listas del modelo donde cada elemento es un objeto (un valor, un proyecto,
 * una tarea, un evento). Un elemento nulo o de otro tipo dentro de estas
 * listas revienta las vistas que los pintan, así que el importador lo
 * rechaza y la carga los descarta.
 */
const LISTAS_DE_OBJETOS = [
  ['values'],
  ['projects'],
  ['journal'],
  ['objectives', 'backlog'],
  ['objectives', 'quarterly'],
  ['objectives', 'monthly'],
  ['objectives', 'weekly'],
  ['objectives', 'daily'],
  ['objectives', 'completed'],
  ['habits', 'graduated'],
  ['habits', 'history'],
  ['habits', 'audit', 'activities'],
  ['calendar', 'events'],
  ['calendar', 'recurring'],
  ['lifeWheel', 'areas'],
  ['lifeWheel', 'evaluations'],
  ['objectiveEvaluation', 'criteria'],
  ['objectiveEvaluation', 'evaluations'],
  ['muevete', 'activityLog', 'entries'],
  ['spontaneousAchievements'],
  ['atelicActivities'],
  ['archivedNotebooks'],
  ['_deletions']
];

/** Un elemento de lista solo es válido si es un objeto y no un array. */
const esObjetoDeLista = (elemento) =>
  elemento !== null && typeof elemento === 'object' && !Array.isArray(elemento);

/**
 * Horizontes (columnas) que admite el modelo.
 */
const HORIZONTES = ['backlog', 'quarterly', 'monthly', 'weekly', 'daily'];

/**
 * Contadores que guarda el resumen de un cuaderno archivado.
 */
const CAMPOS_CONTADOR = [
  'totalTasksCompleted',
  'habitsGraduated',
  'habitDaysLogged',
  'projectsCompleted',
  'journalEntries'
];

/**
 * Normaliza los contadores de los cuadernos archivados.
 *
 * El resumen se pinta en la vista de años anteriores y en el visor de solo
 * lectura. Los datos llegan de un archivo importado o de la nube, así que
 * los contadores se fuerzan a número: si no lo son, valen cero.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántos contadores se han corregido.
 */
export const normalizarContadores = (data) => {
  if (!data || typeof data !== 'object') return 0;

  const archivados = data.archivedNotebooks;
  if (!Array.isArray(archivados)) return 0;

  let corregidos = 0;

  for (const cuaderno of archivados) {
    if (!esObjetoDeLista(cuaderno) || !esObjetoDeLista(cuaderno.summary)) continue;

    for (const campo of CAMPOS_CONTADOR) {
      const valor = cuaderno.summary[campo];
      if (valor === undefined || valor === null) continue;

      const numero = Number(valor);
      if (Number.isFinite(numero)) {
        cuaderno.summary[campo] = numero;
        continue;
      }

      cuaderno.summary[campo] = 0;
      corregidos++;
    }
  }

  return corregidos;
};

/**
 * Normaliza el horizonte de origen de las tareas (`movedFrom`).
 *
 * El dato llega de una importación o de la nube. Si no es un horizonte
 * conocido se deja en el de por defecto, para que ni el marcado ni el
 * destino de la tarea puedan usar un valor ajeno al modelo.
 *
 * @param {*} data - Datos a normalizar, en el sitio.
 * @returns {number} Cuántas tareas se han corregido.
 */
export const normalizarHorizontes = (data) => {
  if (!data || typeof data !== 'object') return 0;

  let corregidas = 0;

  for (const clave of ['backlog', 'quarterly', 'monthly', 'weekly', 'daily', 'completed']) {
    const lista = data.objectives?.[clave];
    if (!Array.isArray(lista)) continue;

    for (const tarea of lista) {
      if (!esObjetoDeLista(tarea)) continue;
      if (tarea.movedFrom === undefined || tarea.movedFrom === null) continue;
      if (HORIZONTES.includes(tarea.movedFrom)) continue;
      tarea.movedFrom = 'weekly';
      corregidas++;
    }
  }

  return corregidas;
};

/**
 * Lee un valor anidado siguiendo una ruta de claves.
 *
 * @param {*} data - Datos de partida.
 * @param {string[]} ruta - Claves por las que bajar.
 * @returns {*} El valor encontrado o undefined.
 */
const valorEnRuta = (data, ruta) =>
  ruta.reduce((valor, clave) => (valor && typeof valor === 'object' ? valor[clave] : undefined), data);

/**
 * Busca la primera lista del modelo que tiene un elemento que no es un objeto.
 *
 * @param {*} data - Datos a recorrer.
 * @returns {string|null} Ruta de la lista, como texto, o null si todas están bien.
 */
export const buscarElementoInvalido = (data) => {
  if (!data || typeof data !== 'object') return null;

  for (const ruta of LISTAS_DE_OBJETOS) {
    const lista = valorEnRuta(data, ruta);
    if (!Array.isArray(lista)) continue;
    if (lista.some((elemento) => !esObjetoDeLista(elemento))) return ruta.join('.');
  }

  return null;
};

/**
 * Descarta de las listas del modelo los elementos que no son objetos.
 *
 * Los datos llegan por la importación y por la sincronización con Drive, que
 * escribe directamente en `localStorage`. Con esta limpieza, ninguna vista
 * recibe un elemento suelto que la haga fallar al pintar.
 *
 * @param {*} data - Datos a limpiar, en el sitio.
 * @returns {number} Cuántos elementos se han descartado.
 */
export const descartarElementosInvalidos = (data) => {
  if (!data || typeof data !== 'object') return 0;

  let descartados = 0;

  for (const ruta of LISTAS_DE_OBJETOS) {
    const lista = valorEnRuta(data, ruta);
    if (!Array.isArray(lista)) continue;

    const limpia = lista.filter((elemento) => {
      if (esObjetoDeLista(elemento)) return true;
      descartados++;
      return false;
    });

    if (limpia.length === lista.length) continue;

    const padre = ruta.length === 1 ? data : valorEnRuta(data, ruta.slice(0, -1));
    if (padre && typeof padre === 'object') padre[ruta[ruta.length - 1]] = limpia;
  }

  return descartados;
};

/**
 * Campos con los que se reconoce un backup de Oráculo. Basta con que tenga
 * uno cualquiera para darlo por bueno.
 */
const CAMPOS_DE_ORACULO = ['version', 'createdAt', 'objectives', 'habits', 'settings', 'values', 'journal'];

/**
 * Dice si el objeto parece un backup de Oráculo.
 *
 * Solo mira los nombres de las secciones de primer nivel. No mira si sus
 * elementos son válidos, porque eso lo comprueba la carga: cuando la carga
 * reparada, lo que hay en el almacenamiento sigue sucio pero lo que se
 * copia es la copia ya limpiada.
 *
 * @param {*} data - Datos a mirar.
 * @returns {boolean} true si tiene alguna sección reconocible.
 */
export const pareceBackupDeOraculo = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return CAMPOS_DE_ORACULO.some(campo => Object.hasOwn(data, campo));
};

/**
 * Cuántos niveles se admiten como mucho en un archivo importado.
 *
 * Los datos de Oráculo no llegan a cuatro niveles. Un archivo con cientos no
 * viene de la app, y guardarlo revienta la pila cuando se serializa.
 */
export const PROFUNDIDAD_MAXIMA_ARCHIVO = 20;

/**
 * Mide hasta dónde se anidan los datos.
 *
 * El recorrido es iterativo y no recursivo a propósito: un archivo con
 * miles de niveles reventaría la pila al recorrerlo recursivamente, que es
 * justo lo que se quiere evitar.
 *
 * @param {*} valor - Datos a medir.
 * @param {number} [limite] - Nivel a partir del cual se deja de medir.
 * @returns {number} Nivel más profundo encontrado.
 */
export const medirProfundidad = (valor, limite = PROFUNDIDAD_MAXIMA_ARCHIVO) => {
  if (!valor || typeof valor !== 'object') return 0;

  const pila = [{ valor, nivel: 0 }];
  let maxima = 0;

  while (pila.length > 0) {
    const actual = pila.pop();
    if (!actual.valor || typeof actual.valor !== 'object') continue;

    if (actual.nivel > maxima) maxima = actual.nivel;
    if (maxima > limite) return maxima;

    for (const clave of Object.keys(actual.valor)) {
      pila.push({ valor: actual.valor[clave], nivel: actual.nivel + 1 });
    }
  }

  return maxima;
};

/**
 * Valida la estructura básica del archivo de backup.
 * Ahora es más permisivo para aceptar archivos de versiones anteriores.
 *
 * @param {Object} data - El objeto de datos a validar.
 * @returns {Object} Resultado de la validación { valid: boolean, error?: string, warnings?: string[] }.
 */
export const validateDataStructure = (data) => {
  const warnings = [];

  // Validación básica: debe ser un objeto y no una lista
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }

  // Un archivo demasiado hondo no se puede guardar: al serializarlo, la app
  // se queda sin pila. Se rechaza antes, con un mensaje propio.
  if (medirProfundidad(data) > PROFUNDIDAD_MAXIMA_ARCHIVO) {
    return {
      valid: false,
      error: 'El archivo es demasiado profundo para importarlo. Prueba con una copia más reciente.'
    };
  }

  // Validación mínima: al menos debe tener ALGO que parezca de Oráculo
  // Aceptamos si tiene version O createdAt O objectives O habits
  if (!pareceBackupDeOraculo(data)) {
    return {
      valid: false,
      error: 'Este archivo no parece ser un backup de Oráculo. No contiene campos reconocibles.'
    };
  }

  // Las secciones presentes deben tener el tipo que Oráculo espera
  const listSections = ['values', 'journal', 'projects'];
  const objectSections = ['objectives', 'habits', 'settings', 'calendar'];

  for (const section of listSections) {
    if (Object.hasOwn(data, section) && !Array.isArray(data[section])) {
      return {
        valid: false,
        error: `El archivo tiene la sección "${section}" con un formato que Oráculo no reconoce.`
      };
    }
  }

  for (const section of objectSections) {
    const value = data[section];
    const esObjeto = typeof value === 'object' && value !== null && !Array.isArray(value);
    if (Object.hasOwn(data, section) && !esObjeto) {
      return {
        valid: false,
        error: `El archivo tiene la sección "${section}" con un formato que Oráculo no reconoce.`
      };
    }
  }

  // Las listas del modelo guardan objetos. Un elemento nulo o de otro tipo
  // revienta la vista que lo pinta, así que el archivo no se importa.
  const elementoInvalido = buscarElementoInvalido(data);
  if (elementoInvalido) {
    return {
      valid: false,
      error: `El archivo tiene un elemento que no es válido en "${elementoInvalido}". Las listas de Oráculo solo admiten elementos completos.`
    };
  }

  // Los identificadores van dentro de atributos del marcado. Si uno trae
  // comillas o ángulos, rompería el HTML al pintarse.
  const idInvalido = buscarIdInvalido(data);
  if (idInvalido) {
    return {
      valid: false,
      error: `El archivo tiene un identificador no válido en "${idInvalido}". Los identificadores de Oráculo solo admiten letras, números, punto, guion y guion bajo.`
    };
  }

  // Advertencias (no errores) para campos faltantes
  const recommendedFields = ['version', 'createdAt', 'objectives', 'habits', 'settings'];
  const missingFields = recommendedFields.filter(field => !Object.hasOwn(data, field));

  if (missingFields.length > 0) {
    warnings.push(`Campos faltantes (se usarán valores por defecto): ${missingFields.join(', ')}`);
  }

  // Verificar estructura de objetivos (permisivo)
  if (data.objectives && typeof data.objectives === 'object') {
    // Solo verificar que sea un objeto, no requerir daily
    if (data.objectives.daily && !Array.isArray(data.objectives.daily)) {
      warnings.push('objectives.daily no es un array, se convertirá');
    }
  }

  // Verificar estructura de hábitos (permisivo)
  if (data.habits && typeof data.habits === 'object') {
    // Solo verificar que sea un objeto, no requerir history
    if (data.habits.history && !Array.isArray(data.habits.history)) {
      warnings.push('habits.history no es un array, se convertirá');
    }
  }

  // Log warnings para debugging
  if (warnings.length > 0) {
    console.warn('[Validator] Advertencias en el archivo importado:', warnings);
  }

  return { valid: true, warnings };
};

/**
 * Secciones del modelo donde vive lo que la usuaria ha escrito.
 *
 * Cada entrada es la ruta de una lista. Si alguna tiene elementos, el cuaderno
 * tiene contenido. Las secciones que vienen por defecto en un cuaderno nuevo
 * (ajustes, cuaderno, valores por defecto de la rueda, criterios de evaluación)
 * no se cuentan: un cuaderno recién creado está vacío de verdad.
 */
const RUTAS_DE_CONTENIDO = [
  ['values'],
  ['projects'],
  ['journal'],
  ['spontaneousAchievements'],
  ['atelicActivities'],
  ['archivedNotebooks'],
  ['objectives', 'backlog'],
  ['objectives', 'quarterly'],
  ['objectives', 'monthly'],
  ['objectives', 'weekly'],
  ['objectives', 'daily'],
  ['objectives', 'completed'],
  ['habits', 'graduated'],
  ['habits', 'history'],
  ['habits', 'audit', 'activities'],
  ['calendar', 'events'],
  ['calendar', 'recurring'],
  ['lifeWheel', 'evaluations'],
  ['objectiveEvaluation', 'evaluations'],
  ['muevete', 'activityLog', 'entries']
];

/**
 * Dice si el cuaderno tiene algo escrito por la usuaria.
 *
 * @param {Object} data - Datos a mirar.
 * @returns {boolean} true si hay al menos un dato propio.
 */
export const tieneContenido = (data) => {
  if (!data || typeof data !== 'object') return false;

  for (const ruta of RUTAS_DE_CONTENIDO) {
    const lista = valorEnRuta(data, ruta);
    if (Array.isArray(lista) && lista.length > 0) return true;
  }

  // Estas dos no son listas: el hábito activo y las notas del setup del día.
  const habitoActivo = data.habits?.active;
  if (habitoActivo && typeof habitoActivo === 'object') return true;

  // El setup del día cuenta solo si la usuaria escribió algo en él. Haberlo
  // hecho no es contenido: un cuaderno recién creado lo tiene hecho y sigue
  // siendo un cuaderno vacío.
  for (const campo of ['potentialObstacle', 'contingencyPlan']) {
    const nota = data.dailySetup?.[campo];
    if (typeof nota === 'string' && nota.trim() !== '') return true;
  }

  // Las áreas de la rueda salen con un nombre y un icono. Cuentan como
  // contenido si la usuaria las ha enlazado con un valor o si les ha
  // cambiado el nombre. Un cuaderno nuevo trae las áreas tal como salen de
  // fábrica y sigue estando vacío.
  const areas = data.lifeWheel?.areas;
  if (Array.isArray(areas)) {
    for (const area of areas) {
      if (!area || typeof area !== 'object') continue;
      if (area.linkedValueId) return true;

      const nombrePorDefecto = nombrePorDefectoDeArea(area.id);
      if (nombrePorDefecto === undefined || area.name !== nombrePorDefecto) return true;
    }
  }

  return false;
};

/**
 * Comprueba que lo que hay guardado sirva como backup para la otra plataforma
 * (la web y la extensión Chrome).
 *
 * Sin esta comprobación, copiar desde un cuaderno vacío lleva un backup sin
 * nada a la otra parte, donde sustituye a los datos que sí había. Y copiar lo
 * que no se puede leer propaga el problema en lugar de avisar de él.
 *
 * Lo que se comprueba y lo que se copia tienen que ser **lo mismo**. Por eso
 * se reciben los dos: el texto crudo del almacenamiento dice si se puede
 * leer, y `datos` son los datos ya normalizados que se van a copiar. Si se
 * validara el texto sucio y se copiara la copia limpia, una carga reparada
 * dejaría a la usuaria sin poder pasar sus datos de una plataforma a otra,
 * con un aviso que además se contradiría con el de la reparación.
 *
 * @param {string|null|undefined} rawText - Texto exacto guardado en el almacenamiento.
 * @param {Object} [datos] - Los datos ya normalizados que se van a copiar.
 * @returns {{ok: boolean, motivo: string|null, data: Object|null}} Resultado de la comprobación.
 */
export const comprobarBackupCopiable = (rawText, datos = null) => {
  // ¿Se puede leer lo que hay guardado?
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    return { ok: false, motivo: 'ilegible', data: null };
  }

  let guardado = null;
  try {
    guardado = JSON.parse(rawText);
  } catch {
    return { ok: false, motivo: 'ilegible', data: null };
  }

  // ¿Es siquiera un cuaderno de Oráculo? Aquí no se mira si sus elementos son
  // válidos: la carga ya se ha encargado de eso.
  if (!pareceBackupDeOraculo(guardado)) {
    return { ok: false, motivo: 'invalido', data: null };
  }

  // ¿Lo que se va a copiar es un backup válido?
  if (!datos || typeof datos !== 'object' || !validateDataStructure(datos).valid) {
    return { ok: false, motivo: 'invalido', data: null };
  }

  // ¿Hay algo que copiar?
  if (!tieneContenido(datos)) {
    return { ok: false, motivo: 'vacio', data: null };
  }

  return { ok: true, motivo: null, data: datos };
};
