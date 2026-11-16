/**
 * Oráculo - Elección del hash de navegación
 *
 * La app navega a vistas que pueden tener subruta: `#journal/new/free` abre el
 * editor de escritura libre y `#journal/edit/ID` el de editar una entrada.
 *
 * Al entrar por una dirección así, la subruta no puede perderse por el camino.
 * Esta función decide qué hash se escribe en la barra de direcciones: el de
 * la vista con su subruta, o el de la vista a secas.
 *
 * Las dos funciones son puras: reciben el hash y devuelven el hash. No saben
 * nada de la app ni del navegador.
 */

/**
 * Caracteres que pueden aparecer en la subruta.
 *
 * Son los que usan los tipos de entrada del diario (guion) y los
 * identificadores (letras, números, punto, guion y guion bajo). Cualquier otra
 * cosa se descarta: la subruta se escribe en la barra de direcciones y no
 * hace falta que admita caracteres raros.
 */
const CARACTERES_SUBRUTA = /^[A-Za-z0-9._-]+$/;

/**
 * Cuántas partes puede tener la dirección, contando la vista.
 *
 * La más larga que usa la app es `#journal/new/TIPO` o `#journal/edit/ID`:
 * tres partes.
 */
const MAXIMO_PARTES = 3;

/**
 * Extrae la vista base de un hash (la parte anterior a la primera barra).
 * Ej: "journal/new/gratitude" -> "journal"
 *
 * @param {string} [hash] - La dirección de la página.
 * @returns {string} La vista base, o 'dashboard' si no hay ninguna.
 */
export const getBaseView = (hash) => {
  const limpio = typeof hash === 'string' ? hash : '';
  const sinAlmohadilla = limpio.startsWith('#') ? limpio.slice(1) : limpio;
  return sinAlmohadilla.split('/')[0] || 'dashboard';
};

/**
 * Elige el hash con el que se navega a una vista.
 *
 * La subruta solo se usa si es de la vista a la que se navega: si no, se
 * ignora y se va a la vista a secas. Una subruta con caracteres que la app no
 * usa, o con más partes de las que usa, también se ignora.
 *
 * @param {string} viewName - La vista a la que se navega.
 * @param {string} [hashCompleto] - La dirección de la que se parte.
 * @returns {string} El hash sin almohadilla que se escribe en la dirección.
 */
export const elegirHashDeNavegacion = (viewName, hashCompleto) => {
  if (typeof viewName !== 'string' || viewName.length === 0) return '';

  const direccion = typeof hashCompleto === 'string' ? hashCompleto.trim() : '';
  const sinAlmohadilla = direccion.startsWith('#') ? direccion.slice(1) : direccion;

  if (sinAlmohadilla.length === 0) return viewName;

  const partes = sinAlmohadilla.split('/');

  // La subruta es de otra vista: no se usa.
  if (partes[0] !== viewName) return viewName;

  // No hay subruta: la vista a secas.
  if (partes.length === 1) return viewName;

  // Demasiadas partes: no son una subruta de la app.
  if (partes.length > MAXIMO_PARTES) return viewName;

  // Cada parte tiene que usar los caracteres que la app usa.
  for (const parte of partes.slice(1)) {
    if (!CARACTERES_SUBRUTA.test(parte)) return viewName;
  }

  return partes.join('/');
};
