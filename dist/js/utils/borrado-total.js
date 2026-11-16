/**
 * Oráculo - Aviso de «borrar todo» incompleto
 *
 * «Borrar todo» borra por un lado los respaldos automáticos del dispositivo y
 * por otro la carpeta de respaldos vinculada. Son dos cosas distintas: si solo
 * falla una, el aviso tiene que decir cuál, porque no es lo mismo que quede
 * una copia del cuaderno en el equipo que que la carpeta siga vinculada y el
 * cuaderno vuelva a guardarse allí.
 *
 * La función es pura: recibe el resultado del borrado y devuelve el texto.
 */

/**
 * Elige el aviso cuando no se ha podido borrar todo.
 *
 * @param {Object} [resultado] - Qué se ha podido borrar y qué no.
 * @param {boolean} [resultado.respaldos] - true si los respaldos automáticos
 *   del dispositivo se han podido borrar.
 * @param {boolean} [resultado.carpeta] - true si la carpeta de respaldos se ha
 *   podido desvincular.
 * @returns {string} El texto del aviso, o una cadena vacía si no ha faltado nada.
 */
export const mensajeDeBorradoIncompleto = (resultado) => {
  const { respaldos = true, carpeta = true } = resultado || {};
  const partes = [];

  if (!respaldos) {
    partes.push('los respaldos automáticos del dispositivo no se han podido borrar. Revisa los permisos del navegador.');
  }

  if (!carpeta) {
    partes.push('la carpeta de respaldos sigue vinculada, así que el cuaderno volverá a guardarse allí. Desvincula la carpeta en Configuración.');
  }

  if (partes.length === 0) return '';

  // La primera parte va en minúscula, porque va después de «pero». Las
  // siguientes empiezan por mayúscula, para que el texto se lea como frases
  // y no como una lista pegada.
  const texto = partes
    .map((parte, indice) => (indice === 0 ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
    .join(' ');

  return `Se ha borrado el cuaderno, pero ${texto}`;
};
