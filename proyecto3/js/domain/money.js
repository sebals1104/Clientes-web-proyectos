// Reglas de dinero y formato con Intl (#54)
//
// Centraliza los importes (redondeo a dos decimales, validación de no
// negativos y suma con redondeo al final) y el formato de números, fechas y
// moneda con Intl, usando las preferencias (moneda y formato de fecha).
const Dinero = {
  // Locale base para todos los formatos.
  locale: 'es',

  /* ---------- Importes ---------- */

  // Redondea un importe a dos decimales. Debe usarse solo al final de un
  // cálculo, nunca en cada sumando.
  redondear(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  },

  // Indica si un valor es un importe válido: número finito y no negativo.
  esImporteValido(valor) {
    return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
  },

  // Valida un importe y lanza un mensaje específico si es inválido.
  validar(valor, campo) {
    const nombre = campo || 'El importe';
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      throw new Error(nombre + ' no es un número válido.');
    }
    if (valor < 0) throw new Error(nombre + ' no puede ser negativo.');
    return Dinero.redondear(valor);
  },

  // Suma importes redondeando solo al final del cálculo.
  sumar(importes) {
    const total = (importes || []).reduce((suma, n) => suma + (Number(n) || 0), 0);
    return Dinero.redondear(total);
  },

  /* ---------- Formato ---------- */

  // Formatea un importe como moneda según la preferencia (o la indicada).
  formatear(valor, moneda) {
    const divisa = moneda || Prefs.obtener('currency');
    const numero = Number(valor) || 0;
    try {
      return new Intl.NumberFormat(Dinero.locale, { style: 'currency', currency: divisa }).format(numero);
    } catch (_) {
      // Moneda desconocida: se muestra el número con dos decimales.
      return new Intl.NumberFormat(Dinero.locale, { maximumFractionDigits: 2 }).format(numero);
    }
  },

  // Formatea un número (kilómetros, litros, etc.) con separadores de miles.
  formatearNumero(valor, maxDecimales) {
    const decimales = maxDecimales === undefined ? 2 : maxDecimales;
    return new Intl.NumberFormat(Dinero.locale, { maximumFractionDigits: decimales }).format(Number(valor) || 0);
  },

  // Formatea una fecha según la preferencia de formato (dd/MM/yyyy por defecto).
  formatearFecha(fecha, formato) {
    const f = formato || Prefs.obtener('dateFormat');
    const fechaObjeto = Dinero.comoFecha(fecha);
    const partes = new Intl.DateTimeFormat(Dinero.locale, {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).formatToParts(fechaObjeto);
    const mapa = {};
    partes.forEach(parte => { mapa[parte.type] = parte.value; });
    switch (f) {
      case 'yyyy-MM-dd': return mapa.year + '-' + mapa.month + '-' + mapa.day;
      case 'MM/dd/yyyy': return mapa.month + '/' + mapa.day + '/' + mapa.year;
      default: return mapa.day + '/' + mapa.month + '/' + mapa.year; // dd/MM/yyyy
    }
  },

  // Convierte un valor a Date (acepta Date o cadena ISO).
  comoFecha(fecha) {
    if (fecha instanceof Date) return fecha;
    const d = new Date(fecha);
    return isNaN(d) ? new Date() : d;
  }
};
