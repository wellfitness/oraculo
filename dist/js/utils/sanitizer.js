/**
 * Oráculo - Sanitizador
 * Utilidades para prevenir ataques XSS
 */

/**
 * Escapa caracteres peligrosos en una cadena de texto para prevenir XSS.
 * @param {string} str - El texto a escapar.
 * @returns {string} El texto escapado.
 */
export const escapeHTML = (str) => {
  if (!str) return '';
  // Convertir a string si no lo es (ej. números)
  const string = String(str);
  
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Escapa todas las propiedades de tipo string en un objeto.
 * Útil para limpiar objetos antes de usarlos.
 * @param {Object} obj - El objeto a sanitizar.
 * @returns {Object} Una copia sanitizada del objeto.
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = escapeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/** La app solo usa colores hexadecimales de seis dígitos. */
const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

/** Color con el que se sustituye un color que no es seguro. */
const COLOR_POR_DEFECTO = '#06b6d4';

/**
 * Devuelve un color que se puede pintar dentro de un atributo `style`.
 *
 * Escapar el HTML no sirve aquí: `escapeHTML` no toca `;`, `:` ni `url()`,
 * y un color con esas características abre dentro del atributo `style` otras
 * declaraciones CSS (superponer la interfaz o pedir una imagen externa). Por
 * eso aquí el color se acepta o se rechaza entero: solo pasa el hexadecimal
 * de la paleta.
 *
 * @param {*} color - Color de partida.
 * @param {string} [porDefecto] - Color con el que se sustituye si no es seguro.
 * @returns {string} Un hexadecimal de seis dígitos.
 */
export const colorSeguro = (color, porDefecto = COLOR_POR_DEFECTO) => {
  const valor = typeof color === 'string' ? color.trim() : '';
  return COLOR_HEX.test(valor) ? valor : porDefecto;
};

/**
 * Devuelve un número que se puede pintar sin confiar en el dato.
 *
 * Los contadores llegan de un archivo importado o de una sincronización, y
 * pueden traer cualquier cosa dentro. Escapar el HTML no valdría aquí: lo
 * que se quiere es un número, y si no lo es se pinta cero.
 *
 * @param {*} valor - Valor de partida.
 * @param {number} [porDefecto] - Número a devolver si el valor no es numérico.
 * @returns {number} Un número finito.
 */
export const numeroSeguro = (valor, porDefecto = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : porDefecto;
};

