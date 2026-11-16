/**
 * Oráculo - Doble mínimo de IndexedDB para las pruebas
 *
 * Los respaldos automáticos de la app viven en IndexedDB, que Node no
 * trae. Este doble implementa la parte de la API que usa `js/utils/auto-backup.js`:
 * abrir la base, crear los almacenes, y guardar, leer, borrar y limpiar
 * registros.
 *
 * No pretende ser un IndexedDB completo: solo lo justo para comprobar que la
 * app borra de verdad lo que dice que borra.
 */

/**
 * Crea una petición con los callbacks que espera el código de la app.
 *
 * @param {*} resultado - Valor de `request.result`.
 * @param {Error|null} [error] - Error, si la operación falló.
 * @returns {object} Petición con `onsuccess` y `onerror`.
 */
const crearPeticion = (resultado, error = null) => {
  const peticion = { onsuccess: null, onerror: null, result: resultado, error };

  setTimeout(() => {
    if (error) {
      peticion.onerror?.();
    } else {
      peticion.onsuccess?.();
    }
  }, 0);

  return peticion;
};

/**
 * Crea un almacén con la clave que indique el `keyPath`.
 *
 * En el navegador, un almacén con `keyPath` guarda cada registro por el valor
 * de esa propiedad, así que borrar «directory» borra el registro «directory».
 * El doble respeta esa regla: si no, el handle de la carpeta se borraría de
 * un sitio y se escribiría en otro, y las pruebas no dirían la verdad.
 *
 * @param {string} nombre - Nombre del almacén.
 * @param {string} [keyPath='id'] - Propiedad por la que se guarda cada registro.
 * @returns {object} Almacén con las operaciones que usa la app.
 */
const crearAlmacen = (nombre, keyPath = 'id') => {
  const registros = new Map();
  let siguiente = 1;

  const claveDe = (valor) => {
    const clave = valor?.[keyPath];
    if (clave !== undefined && clave !== null) return clave;
    return siguiente++;
  };

  return {
    nombre,
    keyPath,

    add(valor) {
      const clave = claveDe(valor);
      const guardado = keyPath === 'id'
        ? { ...valor, id: clave }
        : { ...valor };
      registros.set(clave, guardado);
      return crearPeticion(clave);
    },

    put(valor) {
      const clave = claveDe(valor);
      const guardado = keyPath === 'id'
        ? { ...valor, id: clave }
        : { ...valor };
      registros.set(clave, guardado);
      return crearPeticion(clave);
    },

    get(clave) {
      return crearPeticion(registros.get(clave));
    },

    getAll() {
      return crearPeticion([...registros.values()]);
    },

    getAllKeys() {
      return crearPeticion([...registros.keys()]);
    },

    delete(clave) {
      registros.delete(clave);
      return crearPeticion(undefined);
    },

    clear() {
      registros.clear();
      return crearPeticion(undefined);
    },

    createIndex() {
      return {};
    }
  };
};

/**
 * Crea una transacción.
 *
 * `oncomplete` se dispara en cuanto se le asigna el manejador: así el código
 * que espera al final de la transacción nunca se queda colgado, aunque en el
 * doble no haya un ciclo de vida real de transacciones.
 *
 * @param {object} base - Base de datos con sus almacenes.
 * @param {string|string[]} nombres - Almacenes de la transacción.
 * @returns {object} Transacción.
 */
const crearTransaccion = (base, nombres) => {
  const lista = Array.isArray(nombres) ? nombres : [nombres];

  const transaccion = {
    oncomplete: null,
    onerror: null,
    objectStore(nombre) {
      return base.almacenes.get(nombre);
    }
  };

  let manejador = null;
  Object.defineProperty(transaccion, 'oncomplete', {
    get: () => manejador,
    set: (fn) => {
      manejador = fn;
      if (typeof fn === 'function') setTimeout(() => fn(), 0);
    }
  });

  transaccion.lista = lista;
  return transaccion;
};

/**
 * Crea un doble de IndexedDB.
 *
 * @returns {object} Doble con `open`, listo para instalar en `globalThis`.
 */
export const crearIndexedDBFalso = () => {
  const bases = new Map();

  return {
    open(nombre, version) {
      const base = bases.get(nombre) ?? { almacenes: new Map(), version: 0 };
      bases.set(nombre, base);

      const peticion = { onsuccess: null, onerror: null, onupgradeneeded: null, result: null, error: null };

      const db = {
        objectStoreNames: {
          contains: (n) => base.almacenes.has(n)
        },
        createObjectStore(nombreAlmacen, opciones = {}) {
          const almacen = crearAlmacen(nombreAlmacen, opciones.keyPath || 'id');
          base.almacenes.set(nombreAlmacen, almacen);
          return { createIndex: () => ({}) };
        },
        transaction(nombres) {
          return crearTransaccion(base, nombres);
        },
        close() {}
      };

      peticion.result = db;

      setTimeout(() => {
        if (version && version > base.version) {
          base.version = version;
          peticion.onupgradeneeded?.({ target: { result: db } });
        }
        peticion.onsuccess?.();
      }, 0);

      return peticion;
    },

    deleteDatabase(nombre) {
      bases.delete(nombre);
      return crearPeticion(undefined);
    },

    /**
     * Devuelve el almacén pedido de una base de datos, para que las pruebas
     * puedan comprobar lo que queda guardado dentro.
     *
     * @param {string} nombreDB - Nombre de la base de datos.
     * @param {string} nombreAlmacen - Nombre del almacén.
     * @returns {object|null} El almacén, o null si no existe.
     */
    almacen(nombreDB, nombreAlmacen) {
      const base = bases.get(nombreDB);
      return base?.almacenes.get(nombreAlmacen) || null;
    }
  };
};
