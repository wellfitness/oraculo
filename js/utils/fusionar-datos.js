/**
 * Fusión de los datos que llegan de fuera con los que hay en memoria.
 *
 * Cuando llegan datos de la nube (o de otra pestaña) y la usuaria tiene
 * algo a medias (un modal abierto, un campo donde está escribiendo), lo
 * pendiente espera. Mientras espera puede guardar cosas, y al aplicar lo
 * pendiente no se puede simplemente sustituir el estado entero: eso perdería
 * lo que la usuaria acaba de guardar.
 *
 * La fusión es de tres partes:
 *   - base: los datos como estaban cuando llegó lo de fuera,
 *   - local: los datos que hay ahora en memoria,
 *   - remoto: los datos que han llegado.
 *
 * En lo que ha cambiado en local respecto a la base manda lo local. En lo
 * demás manda lo remoto. Así no se pierde ni lo que acabas de guardar ni lo
 * que venía de la nube.
 *
 * La fusión se hace sobre el propio objeto local, sin sustituirlo: los
 * módulos de la app tienen referencias a sus secciones y las siguen
 * necesitando.
 */

/**
 * Claves que no se copian nunca.
 *
 * '__proto__' podría cambiar el prototipo del objeto al que se asigna, y los
 * datos vienen de fuera (nube, importación, otra pestaña), así que se
 * ignoran. Las demás son los miembros de Object.prototype: una clave que se
 * llame 'toString' o 'valueOf' dejaría el objeto de datos con un método
 * sombraado, y el código que lo use se rompería.
 */
const CLAVES_PROHIBIDAS = [
  '__proto__',
  'constructor',
  'prototype',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
];

/**
 * Cuántos niveles se bajan como mucho.
 *
 * Los datos llegan como texto y guardarlos ya rompe con estructuras
 * demasiado hondas, pero la fusión no tiene por qué fiarse de eso: si los
 * datos llegan por otra vía, la fusión se detiene antes de reventar la
 * pila.
 */
const PROFUNDIDAD_MAXIMA = 100;

const esObjeto = (valor) =>
  !!valor && typeof valor === 'object' && !Array.isArray(valor);

const esLista = (valor) => Array.isArray(valor);

const esClaveProhibida = (clave) => CLAVES_PROHIBIDAS.includes(clave);

/**
 * Dice si dos valores son iguales, comparando los objetos por su contenido.
 *
 * @param {*} a - Primer valor.
 * @param {*} b - Segundo valor.
 * @returns {boolean} true si son iguales.
 */
const esIgual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    // Si no se pueden comparar, se consideran distintos: manda lo local.
    return false;
  }
};

/**
 * Copia un valor para no compartir referencias con lo que viene de fuera.
 *
 * Las claves prohibidas no se copian, a ningún nivel. Si el valor es más
 * hondo de lo permitido, no se copia y se devuelve null: es preferible
 * perder una parte de lo que viene de fuera que dejar la app sin poder
 * guardar nada.
 *
 * @param {*} valor - Valor a copiar.
 * @param {number} [profundidad] - Nivel en el que se está.
 * @returns {*} Copia del valor.
 */
const copiar = (valor, profundidad = 0) => {
  if (valor === undefined) return undefined;

  // Los valores simples no tienen profundidad: se copian siempre.
  if (!esLista(valor) && !esObjeto(valor)) return valor;

  if (profundidad > PROFUNDIDAD_MAXIMA) return null;

  if (esLista(valor)) {
    return valor.map((elemento) => copiar(elemento, profundidad + 1));
  }

  const copia = {};
  for (const clave of Object.keys(valor)) {
    if (esClaveProhibida(clave)) continue;
    copia[clave] = copiar(valor[clave], profundidad + 1);
  }
  return copia;
};

/**
 * Dice si un elemento de lista tiene identificador propio.
 *
 * @param {*} elemento - Elemento de la lista.
 * @returns {boolean} true si tiene identificador.
 */
const tieneIdentificador = (elemento) =>
  esObjeto(elemento) && typeof elemento.id === 'string' && elemento.id.length > 0;

/**
 * Dice si todos los elementos de una lista tienen identificador.
 *
 * @param {Array} lista - Lista a comprobar.
 * @returns {boolean} true si se pueden emparejar por identificador.
 */
const todosConIdentificador = (lista) =>
  lista.length > 0 && lista.every(tieneIdentificador);

/**
 * Fusiona dos objetos sección a sección, sobre el objeto local.
 *
 * @param {Object} base - Sección en la base.
 * @param {Object} local - Sección local, que se modifica.
 * @param {Object} remoto - Sección remota.
 * @param {number} [profundidad] - Nivel en el que se está.
 */
const fusionarObjeto = (base, local, remoto, profundidad = 0) => {
  if (profundidad > PROFUNDIDAD_MAXIMA) return;

  for (const clave of Object.keys(remoto)) {
    if (esClaveProhibida(clave)) continue;

    const enBase = base[clave];
    const enLocal = local[clave];
    const enRemoto = remoto[clave];

    if (!Object.hasOwn(local, clave)) {
      // Local no tiene la clave. Si tampoco estaba en la base, la añadió lo
      // remoto y entra. Si estaba en la base, la borró lo local y el borrado
      // local manda: lo borrado no vuelve.
      if (!Object.hasOwn(base, clave)) {
        const copia = copiar(enRemoto, profundidad + 1);
        // Si no se ha podido copiar (es demasiado hondo), se deja lo que hay:
        // es preferible perder una parte de lo remoto que romper la app.
        if (copia !== null) local[clave] = copia;
      }
      continue;
    }

    if (!Object.hasOwn(remoto, clave)) {
      // Remoto no tiene la clave. Si tampoco estaba en la base, la añadió lo
      // local y se queda. Si estaba en la base, la borró lo remoto: solo se
      // aplica si en local no se había tocado.
      if (Object.hasOwn(base, clave) && esIgual(enLocal, enBase)) delete local[clave];
      continue;
    }

    // Las dos tienen la clave.
    if (esObjeto(enLocal) && esObjeto(enRemoto)) {
      fusionarObjeto(
        esObjeto(enBase) ? enBase : {},
        enLocal,
        enRemoto,
        profundidad + 1
      );
      continue;
    }

    if (esLista(enLocal) && esLista(enRemoto)) {
      fusionarLista(
        esLista(enBase) ? enBase : [],
        enLocal,
        enRemoto,
        profundidad + 1
      );
      continue;
    }

    // Valor simple: si en local no ha cambiado, entra lo remoto.
    if (esIgual(enLocal, enBase)) {
      const copia = copiar(enRemoto, profundidad + 1);
      if (copia !== null) local[clave] = copia;
    }
  }
};

/**
 * Fusiona dos listas, emparejando los elementos por identificador.
 *
 * @param {Array} base - Lista en la base.
 * @param {Array} local - Lista local, que se modifica.
 * @param {Array} remoto - Lista remota.
 * @param {number} [profundidad] - Nivel en el que se está.
 */
const fusionarLista = (base, local, remoto, profundidad = 0) => {
  if (profundidad > PROFUNDIDAD_MAXIMA) return;

  if (!todosConIdentificador(local) || !todosConIdentificador(remoto)) {
    // Sin identificadores no hay forma de emparejar: la lista es una unidad.
    if (!esIgual(local, base)) return;
    local.length = 0;
    // Se añaden de uno en uno: si la lista es muy larga, pasarla entera como
    // argumentos revienta el límite de la llamada.
    const copiados = copiar(remoto, profundidad + 1);
    // Si no se ha podido copiar (es demasiado hondo), se deja la lista local
    // como estaba: es preferible perder lo remoto que romper la app.
    if (!Array.isArray(copiados)) return;
    for (const elemento of copiados) local.push(elemento);
    return;
  }

  const basePorId = new Map(base.filter(tieneIdentificador).map((e) => [e.id, e]));
  const localPorId = new Map(local.map((e) => [e.id, e]));
  const remotoPorId = new Map(remoto.map((e) => [e.id, e]));

  // Lo que solo está en lo remoto entra, salvo que lo local lo hubiera
  // borrado (estaba en la base y ya no está): ese borrado se respeta.
  for (const [id, elemento] of remotoPorId) {
    if (localPorId.has(id) || basePorId.has(id)) continue;
    const copia = copiar(elemento, profundidad + 1);
    // Si no se ha podido copiar (es demasiado hondo), no se añade.
    if (copia === null) continue;
    local.push(copia);
  }

  // Lo que lo remoto borró se quita, salvo que en local se hubiera cambiado.
  for (let i = local.length - 1; i >= 0; i--) {
    const id = local[i].id;
    if (remotoPorId.has(id)) continue;
    const enBase = basePorId.get(id);
    if (!enBase) continue;
    if (esIgual(local[i], enBase)) local.splice(i, 1);
  }

  // Lo que está en las dos: si en local ha cambiado, se queda; si no, entra
  // lo remoto.
  for (const [id, elementoLocal] of localPorId) {
    const elementoRemoto = remotoPorId.get(id);
    const enBase = basePorId.get(id);

    if (esObjeto(elementoLocal) && esObjeto(elementoRemoto)) {
      fusionarObjeto(
        esObjeto(enBase) ? enBase : {},
        elementoLocal,
        elementoRemoto,
        profundidad + 1
      );
      continue;
    }

    if (esIgual(elementoLocal, enBase)) {
      const indice = local.findIndex((e) => e.id === id);
      if (indice >= 0) {
        const copia = copiar(elementoRemoto, profundidad + 1);
        if (copia !== null) local[indice] = copia;
      }
    }
  }
};

/**
 * Copia unos datos para poder compararlos más tarde.
 *
 * La copia no comparte nada con el original y no deja pasar las claves
 * prohibidas, a ningún nivel.
 *
 * @param {*} valor - Datos a copiar.
 * @returns {*} Copia de los datos.
 */
export const copiarDatos = (valor) => copiar(valor);

/**
 * Fusiona los datos que llegan de fuera con los que hay en memoria.
 *
 * @param {Object|null} base - Datos como estaban cuando llegó lo de fuera.
 * @param {Object} local - Datos que hay ahora en memoria. Se modifican.
 * @param {Object} remoto - Datos que han llegado.
 * @returns {Object} Los datos ya fusionados (el mismo objeto local).
 */
export const fusionarDatos = (base, local, remoto) => {
  if (!esObjeto(local)) return remoto;
  if (!esObjeto(remoto)) return local;

  if (!esObjeto(base)) {
    // Sin base no se puede saber qué cambió en local, así que se conserva lo
    // local y se añade lo que falte de lo remoto.
    for (const clave of Object.keys(remoto)) {
      if (esClaveProhibida(clave)) continue;
      if (!Object.hasOwn(local, clave)) local[clave] = copiar(remoto[clave], 1);
    }
    return local;
  }

  fusionarObjeto(base, local, remoto, 0);
  return local;
};

export default { fusionarDatos };
