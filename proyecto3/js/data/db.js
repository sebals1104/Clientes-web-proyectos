// Núcleo de IndexedDB: apertura, stores, índices y transacciones (#48)
//
// Versión base compartida: crea la base con sus cuatro stores e índices y
// expone helpers de transacción y CRUD. Los stores de cada entidad usan estas
// funciones; ninguna vista toca IndexedDB directamente.
// El endurecimiento completo (QuotaExceededError, onblocked, versionchange) se
// termina en el issue #48 de Sebastián; aquí se deja un manejo base de errores.
const DB = {
  nombre: 'vehicle-maintenance',
  version: 1,
  conexion: null,

  // Abre (o crea) la base una sola vez y devuelve la conexión.
  abrir() {
    if (DB.conexion) return Promise.resolve(DB.conexion);
    return new Promise((resolve, reject) => {
      const solicitud = indexedDB.open(DB.nombre, DB.version);

      solicitud.onupgradeneeded = evento => {
        const db = evento.target.result;
        if (!db.objectStoreNames.contains('vehicles')) {
          const store = db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
          store.createIndex('alias', 'alias');
          store.createIndex('type', 'type');
          store.createIndex('fuelType', 'fuelType');
          store.createIndex('active', 'active');
        }
        if (!db.objectStoreNames.contains('services')) {
          const store = db.createObjectStore('services', { keyPath: 'id', autoIncrement: true });
          store.createIndex('vehicleId', 'vehicleId');
          store.createIndex('date', 'date');
          store.createIndex('type', 'type');
          store.createIndex('category', 'category');
          store.createIndex('status', 'status');
          store.createIndex('partIds', 'partIds', { multiEntry: true });
        }
        if (!db.objectStoreNames.contains('parts')) {
          const store = db.createObjectStore('parts', { keyPath: 'id', autoIncrement: true });
          store.createIndex('vehicleId', 'vehicleId');
          store.createIndex('date', 'date');
          store.createIndex('category', 'category');
        }
        if (!db.objectStoreNames.contains('fuelLogs')) {
          const store = db.createObjectStore('fuelLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('vehicleId', 'vehicleId');
          store.createIndex('date', 'date');
          store.createIndex('fullTank', 'fullTank');
        }
      };

      solicitud.onsuccess = () => {
        DB.conexion = solicitud.result;
        // Si otra pestaña pide una versión nueva, cerramos para no bloquearla.
        DB.conexion.onversionchange = () => {
          DB.conexion.close();
          DB.conexion = null;
        };
        resolve(DB.conexion);
      };
      solicitud.onerror = () => reject(DB.errorDe(solicitud.error));
      solicitud.onblocked = () => reject(new Error('Otra pestaña mantiene abierta una versión anterior de la base. Recarga la página.'));
    });
  },

  // Convierte un error de IndexedDB en un mensaje claro.
  errorDe(error) {
    if (error && error.name === 'QuotaExceededError') {
      return new Error('No hay espacio de almacenamiento. Exporta un respaldo desde Ajustes y libera espacio.');
    }
    return error || new Error('No se pudo acceder a la base de datos.');
  },

  // Ejecuta `trabajo` dentro de una transacción sobre uno o varios stores.
  // `trabajo` recibe los object stores y puede hacer await; lo que devuelva
  // es el resultado. Si algo falla, la transacción se aborta y se propaga.
  enTransaccion(nombres, modo, trabajo) {
    return DB.abrir().then(db => new Promise((resolve, reject) => {
      const lista = Array.isArray(nombres) ? nombres : [nombres];
      const tx = db.transaction(lista, modo);
      const stores = {};
      lista.forEach(nombre => { stores[nombre] = tx.objectStore(nombre); });

      let resultado;

      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(DB.errorDe(tx.error));
      tx.onabort = () => reject(DB.errorDe(tx.error));

      // Ejecuta el trabajo; si lanza, se aborta y se rechaza con su error.
      Promise.resolve()
        .then(() => trabajo(stores, tx))
        .then(valor => { resultado = valor; })
        .catch(error => {
          reject(error);
          try { tx.abort(); } catch (_) { /* la transacción ya terminó */ }
        });
    }));
  },

  /* ---------- CRUD de un solo store ---------- */

  // Inserta un objeto y devuelve su id autoincremental.
  agregar(store, objeto) {
    return DB.enTransaccion(store, 'readwrite', stores => pedir(stores[store].add(objeto)));
  },

  // Guarda (inserta o reemplaza) un objeto por su id.
  poner(store, objeto) {
    return DB.enTransaccion(store, 'readwrite', stores => pedir(stores[store].put(objeto)));
  },

  // Devuelve el objeto con ese id, o undefined si no existe.
  obtener(store, id) {
    return DB.enTransaccion(store, 'readonly', stores => pedir(stores[store].get(id)));
  },

  // Devuelve todos los objetos de un store.
  todos(store) {
    return DB.enTransaccion(store, 'readonly', stores => pedir(stores[store].getAll()));
  },

  // Devuelve los objetos cuyo índice coincide con el valor.
  porIndice(store, indice, valor) {
    return DB.enTransaccion(store, 'readonly', stores => pedir(stores[store].index(indice).getAll(valor)));
  },

  // Elimina el objeto con ese id.
  eliminar(store, id) {
    return DB.enTransaccion(store, 'readwrite', stores => pedir(stores[store].delete(id)));
  }
};

// Envuelve una petición de IndexedDB en una promesa.
function pedir(peticion) {
  return new Promise((resolve, reject) => {
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(DB.errorDe(peticion.error));
  });
}
