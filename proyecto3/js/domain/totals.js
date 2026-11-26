// Totales e indicadores del Resumen (dashboard) (#57)
//
// Cálculo puro de los indicadores de la vista principal. Recibe los datos ya
// leídos (vehículos, servicios, repuestos y cargas) y un período, y devuelve
// los totales. Solo los servicios completados y sus repuestos suman; los
// pendientes aportan 0. Los totales se recalculan al abrir la vista, nunca se
// guardan precalculados.
const Totales = {
  // Calcula todos los indicadores para un período y, opcionalmente, un vehículo.
  // `datos`: { vehicles, services, parts, fuelLogs }.
  // `periodo`: { desde, hasta, vehicleId }. desde/hasta son cadenas ISO inclusivas.
  calcular(datos, periodo) {
    const p = periodo || {};
    const vehicles = datos.vehicles || [];
    const services = datos.services || [];
    const parts = datos.parts || [];
    const fuelLogs = datos.fuelLogs || [];
    const desde = p.desde || null;
    const hasta = p.hasta || null;
    const vehicleId = p.vehicleId || null;

    const porParte = {};
    parts.forEach(part => { porParte[part.id] = part; });

    const servicios = services.filter(s => !vehicleId || Number(s.vehicleId) === Number(vehicleId));
    const cargas = fuelLogs.filter(f => !vehicleId || Number(f.vehicleId) === Number(vehicleId));

    const gastoMantenimiento = Totales.gastoServicios(servicios, porParte, desde, hasta, 'maintenance');
    const gastoReparacion = Totales.gastoServicios(servicios, porParte, desde, hasta, 'repair');
    const gastoCombustible = Dinero.redondear(
      cargas.filter(c => Totales.enPeriodo(c, desde, hasta)).reduce((s, c) => s + (Number(c.totalCost) || 0), 0)
    );
    const gastoRepuestosAsociados = Totales.gastoRepuestosAsociados(servicios, porParte, desde, hasta);
    const repuestosPendientes = Totales.repuestosPendientes(services, parts);

    const gastoTotal = Dinero.redondear(gastoMantenimiento + gastoReparacion + gastoCombustible);
    const kilometros = Totales.kilometros(vehicles, services, fuelLogs, desde, hasta, vehicleId);
    const costoPorKilometro = kilometros != null && kilometros > 0
      ? Dinero.redondear(gastoTotal / kilometros)
      : null;
    const vehiculoMayorGasto = Totales.vehiculoMayorGasto(vehicles, services, parts, fuelLogs, desde, hasta);

    return {
      gastoTotal,
      gastoMantenimiento,
      gastoReparacion,
      gastoCombustible,
      gastoRepuestosAsociados,
      repuestosPendientes,
      kilometros,
      costoPorKilometro,
      vehiculoMayorGasto
    };
  },

  // Costo de un servicio: tareas + mano de obra + repuestos (redondeado al final).
  costoServicio(servicio, porParte) {
    const tareas = (servicio.tasks || []).reduce((s, t) => s + (Number(t.cost) || 0), 0);
    const labor = Number(servicio.laborCost) || 0;
    const partes = (servicio.partIds || []).reduce((s, pid) => {
      const part = porParte[pid];
      return s + (part ? (Number(part.totalCost) || 0) : 0);
    }, 0);
    return Dinero.redondear(tareas + labor + partes);
  },

  // Gasto de los servicios completados de un tipo dentro del período.
  gastoServicios(servicios, porParte, desde, hasta, tipo) {
    return Dinero.redondear(
      servicios
        .filter(s => s.status === 'completed' && s.type === tipo && Totales.enPeriodo(s, desde, hasta))
        .reduce((suma, s) => suma + Totales.costoServicio(s, porParte), 0)
    );
  },

  // Suma de los repuestos asociados a servicios completados del período (informativo).
  gastoRepuestosAsociados(servicios, porParte, desde, hasta) {
    const ids = new Set();
    servicios
      .filter(s => s.status === 'completed' && Totales.enPeriodo(s, desde, hasta))
      .forEach(s => (s.partIds || []).forEach(pid => ids.add(pid)));
    let total = 0;
    ids.forEach(pid => { if (porParte[pid]) total += Number(porParte[pid].totalCost) || 0; });
    return Dinero.redondear(total);
  },

  // Suma de los repuestos sin servicio (pendientes), informativo y fuera del total.
  repuestosPendientes(services, parts) {
    const referenciados = new Set();
    services.forEach(s => (s.partIds || []).forEach(pid => referenciados.add(pid)));
    return Dinero.redondear(
      parts
        .filter(p => !referenciados.has(p.id))
        .reduce((suma, p) => suma + (Number(p.totalCost) || 0), 0)
    );
  },

  // Kilómetros recorridos en el período: última lectura del período menos la
  // última lectura anterior al inicio. Devuelve null si faltan lecturas.
  kilometros(vehicles, services, fuelLogs, desde, hasta, vehicleId) {
    if (vehicleId) {
      return Totales.kilometrosDeVehiculo(services, fuelLogs, desde, hasta, vehicleId);
    }
    const ids = new Set();
    services.forEach(s => ids.add(Number(s.vehicleId)));
    fuelLogs.forEach(f => ids.add(Number(f.vehicleId)));
    let total = 0;
    let hayDato = false;
    ids.forEach(id => {
      const km = Totales.kilometrosDeVehiculo(services, fuelLogs, desde, hasta, id);
      if (km != null) { total += km; hayDato = true; }
    });
    return hayDato ? total : null;
  },

  // Kilómetros de un solo vehículo.
  kilometrosDeVehiculo(services, fuelLogs, desde, hasta, vehicleId) {
    const lecturas = [];
    services.forEach(s => {
      if (Number(s.vehicleId) === Number(vehicleId) && s.odometer != null) {
        lecturas.push({ date: s.date, odometer: Number(s.odometer) });
      }
    });
    fuelLogs.forEach(f => {
      if (Number(f.vehicleId) === Number(vehicleId) && f.odometer != null) {
        lecturas.push({ date: f.date, odometer: Number(f.odometer) });
      }
    });
    if (lecturas.length < 2) return null;

    lecturas.sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.odometer - b.odometer);

    let previa = null;
    let ultima = null;
    lecturas.forEach(l => {
      if (desde && String(l.date) < String(desde)) previa = l;
      if ((!desde || String(l.date) >= String(desde)) && (!hasta || String(l.date) <= String(hasta))) ultima = l;
    });
    if (!previa || !ultima) return null;
    return Math.max(0, ultima.odometer - previa.odometer);
  },

  // Alias del vehículo con mayor gasto del período (empate: alias alfabético primero).
  vehiculoMayorGasto(vehicles, services, parts, fuelLogs, desde, hasta) {
    const porParte = {};
    parts.forEach(p => { porParte[p.id] = p; });

    const gastos = vehicles.map(v => {
      const servicios = services.filter(s =>
        Number(s.vehicleId) === Number(v.id) && s.status === 'completed' && Totales.enPeriodo(s, desde, hasta)
      );
      const cargas = fuelLogs.filter(f =>
        Number(f.vehicleId) === Number(v.id) && Totales.enPeriodo(f, desde, hasta)
      );
      const gastoServicios = servicios.reduce((s, sv) => s + Totales.costoServicio(sv, porParte), 0);
      const gastoCargas = cargas.reduce((s, c) => s + (Number(c.totalCost) || 0), 0);
      return { alias: v.alias, gasto: Dinero.redondear(gastoServicios + gastoCargas) };
    });

    if (gastos.length === 0) return null;
    gastos.sort((a, b) => b.gasto - a.gasto || a.alias.localeCompare(b.alias, 'es', { sensitivity: 'base' }));
    return gastos[0].gasto > 0 ? gastos[0].alias : null;
  },

  // Indica si un registro cae dentro del período (fechas inclusivas).
  enPeriodo(registro, desde, hasta) {
    if (desde && String(registro.date) < String(desde)) return false;
    if (hasta && String(registro.date) > String(hasta)) return false;
    return true;
  }
};
