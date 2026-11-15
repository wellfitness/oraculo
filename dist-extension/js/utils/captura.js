/**
 * Oráculo - Captura inteligente
 *
 * Lee la sintaxis de la captura global y saca los metadatos:
 *
 *   texto #proyecto >horizonte !
 *     #nombre  → asigna al proyecto que coincida
 *     >horizonte → horizonte destino (por defecto, backlog)
 *     ! al inicio → marca como importante
 *
 * Es lógica pura: recibe el texto y la lista de proyectos y devuelve lo que
 * ha entendido, sin tocar el DOM ni los datos de la app.
 *
 * El horizonte solo se reconoce si la `>` está al principio del texto o
 * detrás de un espacio. Si no, el texto puede traer un `>` de su cuenta
 * (por ejemplo, una etiqueta de HTML) y no debe confundirse con la
 * sintaxis de captura.
 */

import { buscarProyectoPorEtiqueta } from './elementos.js';

/** Alias de horizonte que entiende la captura, con su horizonte de destino. */
export const HORIZONTES_CAPTURA = {
  semana: 'weekly',
  sem: 'weekly',
  s: 'weekly',
  mes: 'monthly',
  m: 'monthly',
  trimestre: 'quarterly',
  tri: 'quarterly',
  t: 'quarterly',
  hoy: 'daily',
  foco: 'daily',
  prioridades: 'daily',
  prioridad: 'daily',
  p: 'daily',
  h: 'daily'
};

/** La `>` de horizonte, solo al principio del texto o detrás de un espacio. */
const HORIZONTE_EN_TEXTO = /(^|\s)>(\S+)/;

/** La etiqueta de proyecto, con su almohadilla. */
const ETIQUETA_EN_TEXTO = /#(\S+)/;

/**
 * Lee el texto de la captura y devuelve sus metadatos.
 *
 * @param {string} rawText - Texto escrito por la usuaria.
 * @param {Array} proyectos - Proyectos donde buscar la etiqueta.
 * @returns {{ text: string, projectId: string|null, horizon: string, isImportant: boolean, unknownTag: string|null }}
 *   El texto sin la sintaxis, el proyecto asignado, el horizonte de destino,
 *   si es importante y la etiqueta que no corresponde a ningún proyecto.
 */
export const parseCapture = (rawText, proyectos = []) => {
  let text = typeof rawText === 'string' ? rawText : '';
  let projectId = null;
  let horizon = 'backlog';
  let isImportant = false;
  let unknownTag = null;

  // Detectar ! al inicio → importante
  if (text.startsWith('!')) {
    isImportant = true;
    text = text.slice(1).trim();
  }

  // Detectar #proyecto
  const hashMatch = text.match(ETIQUETA_EN_TEXTO);
  if (hashMatch) {
    const tag = hashMatch[1].toLowerCase();
    const match = buscarProyectoPorEtiqueta(proyectos, tag);
    if (match) {
      projectId = match.id;
      text = text.replace(/#\S+/, '').trim();
    } else {
      unknownTag = hashMatch[1];
    }
  }

  // Detectar >horizonte
  const horizonMatch = text.match(HORIZONTE_EN_TEXTO);
  if (horizonMatch) {
    const alias = horizonMatch[2].toLowerCase();
    // Solo las claves propias del mapa son horizontes. Sin esta comprobación,
    // un alias heredado como `constructor` o `__proto__` saldría de la cadena
    // de prototipos y la tarea se guardaría en una lista fantasma, invisible
    // en todas las vistas y perdida en silencio.
    const destino = Object.hasOwn(HORIZONTES_CAPTURA, alias) ? HORIZONTES_CAPTURA[alias] : null;
    if (destino) {
      horizon = destino;
      text = text.replace(HORIZONTE_EN_TEXTO, '$1').trim();
    }
  }

  return { text, projectId, horizon, isImportant, unknownTag };
};
