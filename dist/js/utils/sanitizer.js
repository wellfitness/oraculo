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
