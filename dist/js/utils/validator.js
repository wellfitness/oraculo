/**
 * Oráculo - Validador
 * Utilidades para validar la integridad de los datos
 */

/**
 * Valida la estructura básica del archivo de backup.
 * Ahora es más permisivo para aceptar archivos de versiones anteriores.
 *
 * @param {Object} data - El objeto de datos a validar.
 * @returns {Object} Resultado de la validación { valid: boolean, error?: string, warnings?: string[] }.
 */
export const validateDataStructure = (data) => {
  const warnings = [];

  // Validación básica: debe ser un objeto
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }

  // Validación mínima: al menos debe tener ALGO que parezca de Oráculo
  // Aceptamos si tiene version O createdAt O objectives O habits
  const oraculoFields = ['version', 'createdAt', 'objectives', 'habits', 'settings', 'values', 'journal'];
  const hasAnyField = oraculoFields.some(field => field in data);

  if (!hasAnyField) {
    return {
      valid: false,
      error: 'Este archivo no parece ser un backup de Oráculo. No contiene campos reconocibles.'
    };
  }

  // Advertencias (no errores) para campos faltantes
  const recommendedFields = ['version', 'createdAt', 'objectives', 'habits', 'settings'];
  const missingFields = recommendedFields.filter(field => !(field in data));

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
