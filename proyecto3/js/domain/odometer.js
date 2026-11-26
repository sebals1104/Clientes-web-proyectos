// Reglas del odómetro monotónico (#55)
//
// El odómetro se guarda siempre en kilómetros enteros no negativos y es
// monotónico por vehículo: ninguna operación lo reduce. Los servicios y las
// cargas lo actualizan cuando su lectura es mayor; al editar o eliminar un
// registro se recalcula como el máximo entre el valor de la ficha y las
// lecturas restantes (que, por monotonicidad, nunca queda por debajo del
// actual). La conversión km/mi es solo de captura y presentación.
const Odometro = {
  // Kilómetros por milla.
  kilometrosPorMilla: 1.609344,

  // Convierte a entero no negativo (valores inválidos o negativos caen a 0).
  normalizar(valor) {
    const n = Math.floor(Number(valor));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  },

  // Valida una lectura nueva (al crear un servicio o carga): no puede ser
  // menor al odómetro actual del vehículo.
  validarNueva(lectura, actual, campo) {
    const nombre = campo || 'El odómetro';
    const l = Odometro.normalizar(lectura);
    const a = Odometro.normalizar(actual);
    if (l < a) {
      const formateado = new Intl.NumberFormat('es', { maximumFractionDigits: 0 }).format(a);
      throw new Error(nombre + ' no puede ser menor al actual (' + formateado + ' km).');
    }
    return l;
  },

  // Odómetro resultante de registrar una lectura: el máximo (monotónico).
  siguiente(lectura, actual) {
    return Math.max(Odometro.normalizar(lectura), Odometro.normalizar(actual));
  },

  // Recalcula tras editar o eliminar: el máximo entre el odómetro actual y las
  // lecturas restantes. Nunca devuelve menos que el actual.
  recalcular(actual, lecturas) {
    return (lecturas || []).reduce(
      (maximo, lectura) => Math.max(maximo, Odometro.normalizar(lectura)),
      Odometro.normalizar(actual)
    );
  },

  /* ---------- Conversión km/mi (solo presentación y captura) ---------- */

  // Convierte kilómetros a millas.
  aMillas(km) {
    return (Number(km) || 0) / Odometro.kilometrosPorMilla;
  },

  // Convierte millas a kilómetros.
  aKilometros(millas) {
    return (Number(millas) || 0) * Odometro.kilometrosPorMilla;
  },

  // Convierte km a la unidad indicada (o a la preferida).
  convertir(km, unidad) {
    const u = unidad || Prefs.obtener('distanceUnit');
    return u === 'mi' ? Odometro.aMillas(km) : (Number(km) || 0);
  },

  // Formatea un odómetro según la unidad (con Intl, sin decimales).
  formatear(km, unidad) {
    const u = unidad || Prefs.obtener('distanceUnit');
    const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 0 })
      .format(Odometro.convertir(km, u));
    return numero + (u === 'mi' ? ' mi' : ' km');
  }
};
