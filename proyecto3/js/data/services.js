// Store de servicios (mantenimientos y reparaciones) (#50)
//
// CRUD de servicios sobre IndexedDB: tareas embebidas, repuestos asociados
// (partIds), estado pendiente/completado y costo total calculado. Las
// operaciones que tocan varios stores (guardar con repuestos y odómetro,
// asociar/desasociar) van en una sola transacción. El recálculo del odómetro
// al eliminar se completa en el dominio (issue #55).
const Servicios = {
  // Convierte los datos sueltos en un servicio con tipos correctos.
  normalizar(datos) {
    const d = datos || {};
    return {
      vehicleId: Number(d.vehicleId) || 0,
      type: d.type === 'repair' ? 'repair' : 'maintenance',
      category: String(d.category || '').trim(),
      date: d.date || null,
      odometer: Math.floor(Number(d.odometer) || 0),
      workshop: String(d.workshop || '').trim(),
      description: String(d.description || '').trim(),
      tasks: Array.isArray(d.tasks) ? d.tasks.map(tarea => ({
        name: String(tarea.name || '').trim(),
        cost: Number(tarea.cost) || 0,
        notes: String(tarea.notes || '').trim()
      })) : [],
      partIds: Array.isArray(d.partIds) ? [...new Set(d.partIds.map(Number))].filter(Number.isInteger) : [],
      laborCost: Number(d.laborCost) || 0,
      status: d.status === 'pending' ? 'pending' : 'completed',
      completedAt: d.completedAt || null,
      notes: String(d.notes || '').trim()
    };
  },

  // Valida los campos obligatorios y sus reglas; lanza un mensaje específico.
  validar(servicio) {
    if (!servicio.vehicleId) throw new Error('El servicio debe tener un vehículo.');
    if (!servicio.date) throw new Error('El servicio debe tener una fecha.');
    if (servicio.status === 'completed') {
      const fecha = new Date(servicio.date);
      if (!isNaN(fecha) && fecha > new Date()) throw new Error('La fecha del servicio no puede ser futura.');
    }
    if (servicio.odometer < 0) throw new Error('El odómetro no puede ser negativo.');
    if (servicio.tasks.length === 0 && !servicio.description) {
      throw new Error('El servicio necesita al menos una tarea o una descripción.');
    }
    if (servicio.laborCost < 0) throw new Error('La mano de obra no puede ser negativa.');
    servicio.tasks.forEach(tarea => {
      if (tarea.cost < 0) throw new Error('El costo de una tarea no puede ser negativo.');
      if (!tarea.name) throw new Error('Cada tarea debe tener un nombre.');
    });
  },

  // Lee los repuestos asociados dentro de una transacción.
  async leerRepuestos(stores, partIds) {
    const repuestos = [];
    for (const id of (partIds || [])) {
      const repuesto = await pedir(stores.parts.get(Number(id)));
      if (repuesto) repuestos.push(repuesto);
    }
    return repuestos;
  },

  // Sube el odómetro del vehículo dentro de la transacción si la lectura es mayor.
  async subirOdometroEnTx(stores, vehicleId, odometer) {
    const vehiculo = await pedir(stores.vehicles.get(Number(vehicleId)));
    if (!vehiculo) throw new Error('El vehículo del servicio no existe.');
    if (Number(odometer) > vehiculo.currentOdometer) {
      vehiculo.currentOdometer = Number(odometer);
      vehiculo.updatedAt = new Date().toISOString();
      await pedir(stores.vehicles.put(vehiculo));
    }
  },

  // Costo total: tareas + repuestos + mano de obra, redondeado al final.
  calcularTotal(servicio, repuestos) {
    const tareas = (servicio.tasks || []).reduce((suma, t) => suma + (Number(t.cost) || 0), 0);
    const labor = Number(servicio.laborCost) || 0;
    const partes = (repuestos || []).reduce((suma, p) => suma + (Number(p.totalCost) || 0), 0);
    return redondearImporte(tareas + labor + partes);
  },

  // Devuelve una copia del servicio con su costo total recién calculado.
  conTotal(servicio, repuestos) {
    return Object.assign({}, servicio, { totalCost: Servicios.calcularTotal(servicio, repuestos) });
  },

  // Crea un servicio (actualizando el odómetro del vehículo si corresponde).
  async crear(datos) {
    const servicio = Servicios.normalizar(datos);
    Servicios.validar(servicio);
    const ahora = new Date().toISOString();
    servicio.createdAt = ahora;
    servicio.updatedAt = ahora;
    if (servicio.status === 'completed' && !servicio.completedAt) servicio.completedAt = ahora;

    const id = await DB.enTransaccion(['services', 'vehicles', 'parts'], 'readwrite', async stores => {
      const repuestos = await Servicios.leerRepuestos(stores, servicio.partIds);
      servicio.totalCost = Servicios.calcularTotal(servicio, repuestos);
      const nuevoId = await pedir(stores.services.add(servicio));
      await Servicios.subirOdometroEnTx(stores, servicio.vehicleId, servicio.odometer);
      return nuevoId;
    });
    return Object.assign(servicio, { id });
  },

  // Guarda los cambios de un servicio existente.
  async actualizar(id, datos) {
    const actual = await DB.obtener('services', Number(id));
    if (!actual) throw new Error('El servicio no existe.');
    const servicio = Servicios.normalizar(Object.assign({}, actual, datos));
    Servicios.validar(servicio);
    servicio.id = actual.id;
    servicio.createdAt = actual.createdAt;
    servicio.updatedAt = new Date().toISOString();

    await DB.enTransaccion(['services', 'vehicles', 'parts'], 'readwrite', async stores => {
      const repuestos = await Servicios.leerRepuestos(stores, servicio.partIds);
      servicio.totalCost = Servicios.calcularTotal(servicio, repuestos);
      await pedir(stores.services.put(servicio));
      await Servicios.subirOdometroEnTx(stores, servicio.vehicleId, servicio.odometer);
    });
    return servicio;
  },

  // Cambia el estado entre pendiente y completado; registra la finalización.
  async cambiarEstado(id, status) {
    const servicio = await Servicios.obtener(Number(id));
    if (!servicio) throw new Error('El servicio no existe.');
    servicio.status = status === 'pending' ? 'pending' : 'completed';
    servicio.completedAt = servicio.status === 'completed'
      ? (servicio.completedAt || new Date().toISOString())
      : null;
    servicio.updatedAt = new Date().toISOString();
    await DB.poner('services', servicio);
    return servicio;
  },

  // Elimina un servicio; sus repuestos vuelven a quedar pendientes (no se borran).
  async eliminar(id) {
    return DB.enTransaccion('services', 'readwrite', async stores => {
      const servicio = await pedir(stores.services.get(Number(id)));
      if (!servicio) throw new Error('El servicio no existe.');
      stores.services.delete(Number(id));
      return servicio;
    });
  },

  // Asocia un repuesto al servicio aplicando las reglas de vehículo y unicidad.
  async asociarRepuesto(serviceId, partId) {
    return DB.enTransaccion(['services', 'parts'], 'readwrite', async stores => {
      const servicio = await pedir(stores.services.get(Number(serviceId)));
      if (!servicio) throw new Error('El servicio no existe.');
      const repuesto = await pedir(stores.parts.get(Number(partId)));
      if (!repuesto) throw new Error('El repuesto no existe.');

      const ids = servicio.partIds || [];
      if (ids.includes(Number(partId))) return Servicios.conTotal(servicio, await Servicios.leerRepuestos(stores, ids));

      const todos = await pedir(stores.services.getAll());
      const enOtro = todos.some(s => s.id !== Number(serviceId) && (s.partIds || []).includes(Number(partId)));
      if (enOtro) throw new Error('El repuesto ya está asociado a otro servicio. Desasócialo primero.');

      if (repuesto.vehicleId == null) {
        repuesto.vehicleId = servicio.vehicleId;
        repuesto.updatedAt = new Date().toISOString();
        await pedir(stores.parts.put(repuesto));
      } else if (Number(repuesto.vehicleId) !== Number(servicio.vehicleId)) {
        throw new Error('El repuesto pertenece a otro vehículo.');
      }

      servicio.partIds = ids.concat(Number(partId));
      servicio.updatedAt = new Date().toISOString();
      const repuestos = await Servicios.leerRepuestos(stores, servicio.partIds);
      servicio.totalCost = Servicios.calcularTotal(servicio, repuestos);
      await pedir(stores.services.put(servicio));
      return Servicios.conTotal(servicio, repuestos);
    });
  },

  // Quita un repuesto del servicio; el repuesto vuelve a quedar pendiente.
  async desasociarRepuesto(serviceId, partId) {
    return DB.enTransaccion(['services', 'parts'], 'readwrite', async stores => {
      const servicio = await pedir(stores.services.get(Number(serviceId)));
      if (!servicio) throw new Error('El servicio no existe.');
      servicio.partIds = (servicio.partIds || []).filter(id => Number(id) !== Number(partId));
      servicio.updatedAt = new Date().toISOString();
      const repuestos = await Servicios.leerRepuestos(stores, servicio.partIds);
      servicio.totalCost = Servicios.calcularTotal(servicio, repuestos);
      await pedir(stores.services.put(servicio));
      return Servicios.conTotal(servicio, repuestos);
    });
  },

  // Devuelve un servicio con su costo total recién calculado, o null.
  async obtener(id) {
    const servicio = await DB.obtener('services', Number(id));
    if (!servicio) return null;
    const repuestos = await Servicios.repuestosDe(servicio.partIds);
    return Servicios.conTotal(servicio, repuestos);
  },

  // Lee los repuestos asociados (fuera de una transacción).
  async repuestosDe(partIds) {
    const repuestos = [];
    for (const id of (partIds || [])) {
      const repuesto = await DB.obtener('parts', Number(id));
      if (repuesto) repuestos.push(repuesto);
    }
    return repuestos;
  },

  // Devuelve los servicios que cumplen los filtros, con su costo total.
  async listar(filtros = {}) {
    const [todos, repuestos] = await Promise.all([DB.todos('services'), DB.todos('parts')]);
    const porId = new Map(repuestos.map(p => [p.id, p]));
    return todos
      .filter(s => Servicios.coincide(s, filtros))
      .sort(Servicios.ordenar)
      .map(s => Servicios.conTotal(s, (s.partIds || []).map(id => porId.get(Number(id))).filter(Boolean)));
  },

  // Indica si un servicio cumple los filtros (vehículo, tipo, categoría, estado, fechas y texto).
  coincide(servicio, f) {
    if (f.vehicleId && Number(servicio.vehicleId) !== Number(f.vehicleId)) return false;
    if (f.type && servicio.type !== f.type) return false;
    if (f.category && servicio.category !== f.category) return false;
    if (f.status && servicio.status !== f.status) return false;
    if (f.desde && servicio.date && servicio.date < f.desde) return false;
    if (f.hasta && servicio.date && servicio.date > f.hasta) return false;
    if (f.texto) {
      const texto = f.texto.toLowerCase();
      const en = [servicio.description, servicio.workshop, servicio.notes].join(' ').toLowerCase();
      if (!en.includes(texto)) return false;
    }
    return true;
  },

  // Ordena por fecha descendente y, ante empate, por fecha de creación.
  ordenar(a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
  }
};

// Redondea un importe a dos decimales (se moverá a domain/money.js, issue #54).
function redondearImporte(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
