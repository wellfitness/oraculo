/**
 * Oráculo - Elementos del modelo
 *
 * Lectura segura de los datos que se pintan en las vistas.
 *
 * Las listas del modelo (valores, proyectos, tareas, entradas del diario)
 * guardan objetos. Un objeto puede llegar sin una propiedad, o incluso nulo,
 * cuando los datos vienen de un archivo importado o de una sincronización.
 * Estas funciones dejan que la vista siga funcionando en vez de reventar.
 */

/**
 * Devuelve el texto de una propiedad de un elemento, sin reventar.
 *
 * @param {*} elemento - Elemento del que leer.
 * @param {string} clave - Propiedad que se quiere leer.
 * @param {string} [porDefecto] - Texto a devolver si no hay nada legible.
 * @returns {string} El texto de la propiedad.
 */
export const textoDe = (elemento, clave, porDefecto = '') => {
  const valor = elemento ? elemento[clave] : undefined;
  return typeof valor === 'string' ? valor : porDefecto;
};

/**
 * Nombre de un valor, normalizado para poder compararlo.
 *
 * @param {*} valor - Valor de la brújula.
 * @returns {string} Nombre en minúsculas y sin espacios sobrantes.
 */
export const nombreDeValor = (valor) => textoDe(valor, 'name').trim().toLowerCase();

/**
 * Indica si ya hay un valor con ese nombre.
 *
 * @param {Array} valores - Valores de la brújula.
 * @param {string} nombre - Nombre que se busca.
 * @param {string|null} [idExcluido] - Identificador del valor que se está editando.
 * @returns {boolean} true si el nombre ya está repetido.
 */
export const hayValorConNombre = (valores, nombre, idExcluido = null) => {
  if (!Array.isArray(valores)) return false;
  const buscado = String(nombre || '').trim().toLowerCase();
  return valores.some(valor => valor?.id !== idExcluido && nombreDeValor(valor) === buscado);
};

/**
 * Nombre de un elemento del modelo.
 *
 * @param {*} elemento - Elemento del que leer el nombre.
 * @returns {string} El nombre, o cadena vacía si no lo tiene.
 */
export const nombreDe = (elemento) => textoDe(elemento, 'name');

/**
 * Busca el proyecto al que apunta una etiqueta del tipo #proyecto.
 *
 * @param {Array} proyectos - Proyectos activos.
 * @param {string} etiqueta - Etiqueta sin la almohadilla.
 * @returns {*} El proyecto que coincide, o null.
 */
export const buscarProyectoPorEtiqueta = (proyectos, etiqueta) => {
  if (!Array.isArray(proyectos) || !etiqueta) return null;
  const buscada = String(etiqueta).toLowerCase();

  return proyectos.find(proyecto => {
    const nombre = nombreDe(proyecto).toLowerCase();
    if (!nombre) return false;
    return nombre.includes(buscada) || nombre.replace(/\s+/g, '-').includes(buscada);
  }) || null;
};

/**
 * Busca el proyecto que coincide con un hashtag.
 *
 * @param {Array} proyectos - Proyectos activos.
 * @param {string} hashtag - Hashtag sin la almohadilla.
 * @returns {*} El proyecto que coincide, o null.
 */
export const buscarProyectoPorHashtag = (proyectos, hashtag) => {
  if (!Array.isArray(proyectos) || !hashtag) return null;
  const buscado = String(hashtag).toLowerCase();

  return proyectos.find(proyecto => {
    const nombre = nombreDe(proyecto).toLowerCase();
    if (!nombre) return false;
    return nombre.includes(buscado) || buscado.includes(nombre);
  }) || null;
};

/**
 * Filtra las entradas del diario por texto y por tipo.
 *
 * @param {Array} entradas - Entradas del diario.
 * @param {string} query - Texto de búsqueda.
 * @param {string} [type] - Tipo de entrada.
 * @returns {Array} Las entradas que coinciden.
 */
export const filtrarEntradasPorTexto = (entradas, query, type) => {
  if (!Array.isArray(entradas)) return [];
  const buscado = String(query || '').toLowerCase();

  return entradas.filter(entrada => {
    const coincideTexto = !buscado ||
      textoDe(entrada, 'content').toLowerCase().includes(buscado);
    const coincideTipo = !type || entrada?.type === type;
    return coincideTexto && coincideTipo;
  });
};
