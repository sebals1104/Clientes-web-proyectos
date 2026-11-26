// Respaldo: exportar, validar e importar todas las entidades (#53)
//
// Exporta las cuatro entidades (vehicles, services, parts, fuelLogs) y las
// preferencias a un objeto JSON; importa un respaldo validado en una sola
// transacción, conservando los IDs del archivo (IndexedDB continúa el
// autoincrement desde el mayor ID importado) y rechazando versiones de esquema
// desconocidas o referencias rotas.
const Respaldo = {
  versionEsquema: 1,
  app: 'vehicle-maintenance',

  // Lista de stores que forman el respaldo, en el orden de inserción.
  stores: ['vehicles', 'services', 'parts', 'fuelLogs'],

  // Exporta todas las entidades y las preferencias a un objeto respaldo.
  async exportar() {
    const data = {};
    const lecturas = Respaldo.stores.map(store => DB.todos(store));
    const resultados = await Promise.all(lecturas);
    Respaldo.stores.forEach((store, indice) => { data[store] = resultados[indice]; });
    return {
      schemaVersion: Respaldo.versionEsquema,
      app: Respaldo.app,
      exportedAt: new Date().toISOString(),
      preferences: Prefs.leer(),
      data
    };
  },

  // Valida la estructura, la versión y la integridad referencial de un respaldo.
  // Devuelve el resumen de registros a importar, o lanza un mensaje claro.
  validar(respaldo) {
    if (!respaldo || typeof respaldo !== 'object') throw new Error('El archivo no es un respaldo válido.');
    if (respaldo.app !== Respaldo.app) throw new Error('El archivo no pertenece a esta aplicación.');
    if (respaldo.schemaVersion !== Respaldo.versionEsquema) {
      throw new Error('La versión del respaldo (' + respaldo.schemaVersion + ') no es compatible.');
    }
    const data = respaldo.data;
    if (!data || typeof data !== 'object') throw new Error('El respaldo no contiene datos.');

    Respaldo.stores.forEach(store => {
      if (!Array.isArray(data[store])) throw new Error('La sección «' + store + '» no es válida.');
      data[store].forEach(item => {
        if (!item || typeof item !== 'object' || !Number.isInteger(Number(item.id))) {
          throw new Error('Hay un registro sin id válido en «' + store + '».');
        }
      });
    });

    // Integridad referencial: toda referencia apunta a un registro existente.
    const idsVehiculos = new Set(data.vehicles.map(v => Number(v.id)));
    const idsRepuestos = new Set(data.parts.map(p => Number(p.id)));

    data.services.forEach(servicio => {
      if (!idsVehiculos.has(Number(servicio.vehicleId))) {
        throw new Error('Hay un servicio que apunta a un vehículo inexistente.');
      }
      (servicio.partIds || []).forEach(pid => {
        if (!idsRepuestos.has(Number(pid))) {
          throw new Error('Hay un servicio que referencia un repuesto inexistente.');
        }
      });
    });
    data.parts.forEach(repuesto => {
      if (repuesto.vehicleId != null && !idsVehiculos.has(Number(repuesto.vehicleId))) {
        throw new Error('Hay un repuesto que apunta a un vehículo inexistente.');
      }
    });
    data.fuelLogs.forEach(carga => {
      if (!idsVehiculos.has(Number(carga.vehicleId))) {
        throw new Error('Hay una carga que apunta a un vehículo inexistente.');
      }
    });

    return {
      vehicles: data.vehicles.length,
      services: data.services.length,
      parts: data.parts.length,
      fuelLogs: data.fuelLogs.length
    };
  },

  // Importa un respaldo reemplazando todos los datos en una sola transacción.
  // `opciones.aplicarPreferencias` decide si se aplican las preferencias.
  async importar(respaldo, opciones = {}) {
    Respaldo.validar(respaldo);
    const data = respaldo.data;

    await DB.enTransaccion(Respaldo.stores, 'readwrite', async stores => {
      // Limpia el contenido actual antes de escribir el nuevo.
      for (const store of Respaldo.stores) {
        await pedir(stores[store].clear());
      }
      // Inserta conservando los IDs del archivo (put, no add). IndexedDB
      // continúa el autoincrement desde el mayor ID importado.
      Respaldo.stores.forEach(store => {
        data[store].forEach(item => stores[store].put(item));
      });
    });

    if (opciones.aplicarPreferencias && respaldo.preferences) {
      Prefs.reemplazar(respaldo.preferences);
    }
    return Respaldo.validar(respaldo);
  },

  // Borra todas las entidades y las preferencias.
  async borrarTodo() {
    await DB.enTransaccion(Respaldo.stores, 'readwrite', async stores => {
      for (const store of Respaldo.stores) {
        await pedir(stores[store].clear());
      }
    });
    Prefs.borrar();
  },

  // Devuelve el uso estimado de almacenamiento, o null si no está disponible.
  async estimarUso() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    return navigator.storage.estimate();
  },

  // Solicita almacenamiento persistente; devuelve si se concedió.
  async solicitarPersistencia() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    return navigator.storage.persist();
  }
};
