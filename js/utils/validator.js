/**
 * Oráculo - Validador
 * Utilidades para validar la integridad de los datos
 */

/**
 * Valida la estructura básica del archivo de backup.
 * @param {Object} data - El objeto de datos a validar.
 * @returns {Object} Resultado de la validación { valid: boolean, error?: string }.
 */
export const validateDataStructure = (data) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }

  // Verificar campos obligatorios
  const requiredFields = ['version', 'createdAt', 'objectives', 'habits', 'settings'];
  const missingFields = requiredFields.filter(field => !(field in data));

  if (missingFields.length > 0) {
    return { valid: false, error: `Faltan campos obligatorios: ${missingFields.join(', ')}` };
  }

  // Verificar estructura de objetivos
  if (typeof data.objectives !== 'object' || !Array.isArray(data.objectives.daily)) {
    return { valid: false, error: 'Estructura de objetivos inválida.' };
  }

  // Verificar estructura de hábitos
  if (typeof data.habits !== 'object' || !Array.isArray(data.habits.history)) {
    return { valid: false, error: 'Estructura de hábitos inválida.' };
  }

  return { valid: true };
};
