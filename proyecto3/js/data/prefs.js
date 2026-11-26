// Preferencias en LocalStorage (#53)
//
// Guarda las preferencias de la aplicación (tema, unidad, moneda, formato de
// fecha, vehículo por defecto, último período/filtros y última vista) bajo una
// única clave con prefijo «vm.». La lectura es tolerante: si el valor está
// corrupto o falta, se devuelve el valor por defecto. Aquí nunca se guardan
// entidades del sistema.
const Prefs = {
  CLAVE: 'vm.prefs',

  // Valores por defecto.
  porDefecto: {
    theme: 'light',
    distanceUnit: 'km',
    currency: 'USD',
    dateFormat: 'dd/MM/yyyy',
    defaultVehicleId: null,
    lastPeriod: null,
    lastFilters: null,
    lastView: null,
    dismissedNotices: []
  },

  // Lee todas las preferencias combinadas con los valores por defecto.
  leer() {
    try {
      const crudo = localStorage.getItem(Prefs.CLAVE);
      if (!crudo) return Object.assign({}, Prefs.porDefecto);
      const guardado = JSON.parse(crudo);
      return Prefs.sanear(Object.assign({}, Prefs.porDefecto, guardado));
    } catch (_) {
      // Valor corrupto: se vuelve a los valores por defecto.
      return Object.assign({}, Prefs.porDefecto);
    }
  },

  // Corrige valores con tipo o rango inválido, campo por campo.
  sanear(prefs) {
    const p = Object.assign({}, Prefs.porDefecto, prefs);
    if (p.theme !== 'dark') p.theme = 'light';
    if (p.distanceUnit !== 'mi') p.distanceUnit = 'km';
    if (typeof p.currency !== 'string' || !p.currency) p.currency = 'USD';
    if (typeof p.dateFormat !== 'string' || !p.dateFormat) p.dateFormat = 'dd/MM/yyyy';
    if (typeof p.defaultVehicleId !== 'number' && p.defaultVehicleId !== null) p.defaultVehicleId = null;
    if (!Array.isArray(p.dismissedNotices)) p.dismissedNotices = [];
    return p;
  },

  // Devuelve una preferencia concreta.
  obtener(clave) {
    return Prefs.leer()[clave];
  },

  // Actualiza una o varias preferencias y devuelve el objeto completo.
  actualizar(cambios) {
    const nuevas = Prefs.sanear(Object.assign({}, Prefs.leer(), cambios));
    localStorage.setItem(Prefs.CLAVE, JSON.stringify(nuevas));
    return nuevas;
  },

  // Reemplaza todas las preferencias (por ejemplo, al importar un respaldo).
  reemplazar(prefs) {
    const saneadas = Prefs.sanear(prefs || {});
    localStorage.setItem(Prefs.CLAVE, JSON.stringify(saneadas));
    return saneadas;
  },

  // Borra las preferencias y vuelve a los valores por defecto.
  borrar() {
    localStorage.removeItem(Prefs.CLAVE);
  }
};
