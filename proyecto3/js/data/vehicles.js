// Store de vehículos (#49)
//
// CRUD de vehículos sobre IndexedDB, con borrado en cascada y validación de
// integridad (placa única entre activos y odómetro no negativo). El recálculo
// fino del odómetro (monotónico y máximo) vive en el dominio (issue #55) y se
// conecta desde aquí cuando esté listo.
const Vehiculos = {
  // Año actual + 1, límite superior del año de fabricación.
  anioMaximo() {
    return new Date().getFullYear() + 1;
  },

  // Convierte los datos sueltos en un vehículo con tipos correctos.
  normalizar(datos) {
    const d = datos || {};
    return {
      alias: String(d.alias || '').trim(),
      brand: String(d.brand || '').trim(),
      model: String(d.model || '').trim(),
      year: Number(d.year) || 0,
      plate: String(d.plate || '').trim().toUpperCase(),
      type: String(d.type || '').trim(),
      fuelType: String(d.fuelType || '').trim(),
      currentOdometer: Math.floor(Number(d.currentOdometer) || 0),
      image: String(d.image || '').trim(),
      notes: String(d.notes || '').trim(),
      registrationDate: d.registrationDate || new Date().toISOString(),
      active: d.active !== false
    };
  },

  // Valida los campos obligatorios y sus rangos; lanza un mensaje específico.
  validar(vehiculo) {
    if (!vehiculo.alias || vehiculo.alias.length > 40) throw new Error('El alias es obligatorio y debe tener entre 1 y 40 caracteres.');
    if (!vehiculo.brand || vehiculo.brand.length > 40) throw new Error('La marca es obligatoria y debe tener entre 1 y 40 caracteres.');
    if (!vehiculo.model || vehiculo.model.length > 40) throw new Error('El modelo es obligatorio y debe tener entre 1 y 40 caracteres.');
    if (vehiculo.year && (vehiculo.year < 1950 || vehiculo.year > Vehiculos.anioMaximo())) {
      throw new Error('El año debe estar entre 1950 y ' + Vehiculos.anioMaximo() + '.');
    }
    if (vehiculo.plate && !/^[A-Z0-9]{1,12}$/.test(vehiculo.plate)) {
      throw new Error('La placa debe tener hasta 12 caracteres alfanuméricos.');
    }
    if (vehiculo.currentOdometer < 0 || vehiculo.currentOdometer > 9999999) {
      throw new Error('El odómetro debe estar entre 0 y 9.999.999 km.');
    }
  },

  // Indica si la placa ya la usa otro vehículo activo.
  async placaEnUso(placa, idIgnorar) {
    if (!placa) return false;
    const todos = await DB.todos('vehicles');
    return todos.some(v => v.active && v.plate === placa && String(v.id) !== String(idIgnorar));
  },

  // Crea un vehículo y devuelve el objeto completo con su id.
  async crear(datos) {
    const vehiculo = Vehiculos.normalizar(datos);
    Vehiculos.validar(vehiculo);
    if (await Vehiculos.placaEnUso(vehiculo.plate, null)) {
      throw new Error('Ya existe un vehículo activo con esa placa.');
    }
    const ahora = new Date().toISOString();
    vehiculo.createdAt = ahora;
    vehiculo.updatedAt = ahora;
    const id = await DB.agregar('vehicles', vehiculo);
    return Object.assign(vehiculo, { id });
  },

  // Guarda los cambios de un vehículo existente.
  async actualizar(id, datos) {
    const actual = await Vehiculos.obtener(Number(id));
    if (!actual) throw new Error('El vehículo no existe.');
    const vehiculo = Vehiculos.normalizar(Object.assign({}, actual, datos));
    Vehiculos.validar(vehiculo);
    if (vehiculo.currentOdometer < actual.currentOdometer) {
      throw new Error('El odómetro no puede disminuir (actual: ' + actual.currentOdometer + ' km).');
    }
    if (await Vehiculos.placaEnUso(vehiculo.plate, actual.id)) {
      throw new Error('Ya existe un vehículo activo con esa placa.');
    }
    vehiculo.id = actual.id;
    vehiculo.createdAt = actual.createdAt;
    vehiculo.updatedAt = new Date().toISOString();
    await DB.poner('vehicles', vehiculo);
    return vehiculo;
  },

  // Archiva (active=false) o reactiva (active=true) un vehículo.
  async cambiarActivo(id, activo) {
    const actual = await Vehiculos.obtener(Number(id));
    if (!actual) throw new Error('El vehículo no existe.');
    actual.active = Boolean(activo);
    actual.updatedAt = new Date().toISOString();
    await DB.poner('vehicles', actual);
    return actual;
  },

  // Devuelve un vehículo por id, o null si no existe.
  async obtener(id) {
    const vehiculo = await DB.obtener('vehicles', Number(id));
    return vehiculo || null;
  },

  // Devuelve todos los vehículos ordenados por alias.
  async listar() {
    const todos = await DB.todos('vehicles');
    return todos.sort((a, b) => a.alias.localeCompare(b.alias, 'es', { sensitivity: 'base' }));
  },

  // Elimina el vehículo y todo su historial en una sola transacción.
  // Devuelve el detalle del impacto para mostrarlo antes de confirmar.
  async eliminar(id) {
    return DB.enTransaccion(['vehicles', 'services', 'parts', 'fuelLogs'], 'readwrite', async stores => {
      const vehiculo = await pedir(stores.vehicles.get(Number(id)));
      if (!vehiculo) throw new Error('El vehículo no existe.');

      const servicios = await pedir(stores.services.index('vehicleId').getAll(Number(id)));
      const repuestos = await pedir(stores.parts.index('vehicleId').getAll(Number(id)));
      const cargas = await pedir(stores.fuelLogs.index('vehicleId').getAll(Number(id)));

      servicios.forEach(s => stores.services.delete(s.id));
      repuestos.forEach(p => stores.parts.delete(p.id));
      cargas.forEach(c => stores.fuelLogs.delete(c.id));
      stores.vehicles.delete(Number(id));

      return { servicios: servicios.length, repuestos: repuestos.length, cargas: cargas.length };
    });
  }
};
