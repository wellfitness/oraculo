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
 * Crea un almacén con clave 'id' autogenerada.
 *
 * @param {string} nombre - Nombre del almacén.
 * @returns {object} Almacén con las operaciones que usa la app.
 */
const crearAlmacen = (nombre) => {
  const registros = new Map();
  let siguiente = 1;

  return {
    nombre,

    add(valor) {
      const id = siguiente++;
      const guardado = { ...valor, id };
      registros.set(id, guardado);
      return crearPeticion(id);
    },

    put(valor) {
      const id = valor?.id ?? siguiente++;
      const guardado = { ...valor, id };
      registros.set(id, guardado);
      return crearPeticion(id);
    },

    get(id) {
      return crearPeticion(registros.get(id));
    },

    getAll() {
      return crearPeticion([...registros.values()]);
    },

    getAllKeys() {
      return crearPeticion([...registros.keys()]);
    },

    delete(id) {
      registros.delete(id);
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
        createObjectStore(nombreAlmacen) {
          const almacen = crearAlmacen(nombreAlmacen);
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
    }
  };
};
