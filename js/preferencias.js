// Preferencias y ordenamiento (§4.6, §4.7). La lógica pura no toca el DOM;
// el render queda protegido para que el archivo cargue también fuera del navegador.
// Depende de rejilla.js (sesionesDeResultado, metricasResultado, DIAS_REJILLA) y
// tiempo.js, pero solo los invoca en tiempo de ejecución: este archivo carga antes.

/* ---------- Lógica pura ---------- */

const CRITERIOS_ORDEN = ['menos-dias', 'menos-muertas', 'salida-temprana'];
const FILTROS_VACIOS = { diasLibres: [], horaMin: '', horaMax: '' };

// Resumen por resultado, cacheado: filtrar y ordenar lo consultan varias veces
// y la lista del generador puede ser grande.
const cacheResumenPreferencias = new WeakMap();

// Promedio de la hora de salida (minutos) contando solo los días con clases.
function salidaPromedioMin(resultado) {
  const salidaPorDia = new Map();
  sesionesDeResultado(resultado).forEach(s => {
    if (!salidaPorDia.has(s.dia) || s.fin > salidaPorDia.get(s.dia)) salidaPorDia.set(s.dia, s.fin);
  });
  if (!salidaPorDia.size) return null;
  let suma = 0;
  salidaPorDia.forEach(fin => { suma += fin; });
  return suma / salidaPorDia.size;
}

function resumenPreferencias(resultado) {
  const clave = Array.isArray(resultado) ? resultado : null;
  if (clave && cacheResumenPreferencias.has(clave)) return cacheResumenPreferencias.get(clave);
  const m = metricasResultado(resultado);
  const resumen = {
    dias: new Set(sesionesDeResultado(resultado).map(s => s.dia)),
    entradaMin: m.entradaMin,
    salidaMin: m.salidaMin,
    diasAsistencia: m.diasAsistencia,
    horasMuertasMin: m.horasMuertasMin,
    salidaPromedioMin: salidaPromedioMin(resultado)
  };
  if (clave) cacheResumenPreferencias.set(clave, resumen);
  return resumen;
}

function normalizarFiltros(filtros) {
  const f = filtros || {};
  return {
    diasLibres: Array.isArray(f.diasLibres) ? f.diasLibres : [],
    horaMin: f.horaMin ? String(f.horaMin) : '',
    horaMax: f.horaMax ? String(f.horaMax) : ''
  };
}

// Un rango con mínimo >= máximo no admite ninguna sesión: se informa en lugar de filtrar a cero.
function validarFiltrosPreferencias(filtros) {
  const f = normalizarFiltros(filtros);
  if (f.horaMin && f.horaMax && hhmmToMin(f.horaMin) >= hhmmToMin(f.horaMax)) {
    return { ok: false, mensaje: 'La hora mínima de entrada debe ser anterior a la hora máxima de salida.' };
  }
  return { ok: true, mensaje: '' };
}

// Un filtro vacío no restringe. Los límites de hora son inclusivos.
function resultadoCumpleFiltros(resultado, filtros) {
  const f = normalizarFiltros(filtros);
  const r = resumenPreferencias(resultado);
  if (f.diasLibres.some(d => r.dias.has(d))) return false;
  if (f.horaMin && r.entradaMin !== null && r.entradaMin < hhmmToMin(f.horaMin)) return false;
  if (f.horaMax && r.salidaMin !== null && r.salidaMin > hhmmToMin(f.horaMax)) return false;
  return true;
}

function claveOrden(resultado, criterio) {
  const r = resumenPreferencias(resultado);
  if (criterio === 'menos-dias') return r.diasAsistencia;
  if (criterio === 'menos-muertas') return r.horasMuertasMin;
  return r.salidaPromedioMin === null ? Infinity : r.salidaPromedioMin;
}

// Estable: los empates conservan el orden del generador. No muta la entrada.
function ordenarResultados(resultados, criterio) {
  const lista = Array.isArray(resultados) ? resultados.slice() : [];
  if (CRITERIOS_ORDEN.indexOf(criterio) < 0) return lista;
  return lista
    .map((r, i) => ({ r, i, k: claveOrden(r, criterio) }))
    .sort((a, b) => (a.k - b.k) || (a.i - b.i))
    .map(e => e.r);
}

function aplicarPreferencias(resultados, filtros, criterio) {
  const origen = Array.isArray(resultados) ? resultados : [];
  const validacion = validarFiltrosPreferencias(filtros);
  if (!validacion.ok) {
    return { visibles: [], total: origen.length, mostrados: 0, error: validacion.mensaje };
  }
  const visibles = ordenarResultados(origen.filter(r => resultadoCumpleFiltros(r, filtros)), criterio);
  return { visibles, total: origen.length, mostrados: visibles.length, error: null };
}

function textoContadorPreferencias(mostrados, total) {
  if (!total) return 'Sin resultados generados';
  return mostrados + ' de ' + total + (total === 1 ? ' resultado' : ' resultados');
}

/* ---------- Estado y render ---------- */

let resultadosOrigenPreferencias = [];
let resultadosVisiblesPreferencias = [];

const suscriptoresPreferencias = [];

function suscribirCambioPreferencias(callback) {
  if (typeof callback === 'function') suscriptoresPreferencias.push(callback);
}

function notificarCambioPreferencias(detalle) {
  suscriptoresPreferencias.forEach(cb => {
    try {
      cb(detalle || {});
    } catch (error) {
      console.error('Fallo en un manejador de preferencias:', error);
    }
  });
}

// Lista completa que entrega el generador, sin filtros ni orden.
function obtenerResultadosOrigenPreferencias() {
  return resultadosOrigenPreferencias.slice();
}

// Lista que se muestra en la rejilla, ya filtrada y ordenada.
function obtenerResultadosVisiblesPreferencias() {
  return resultadosVisiblesPreferencias.slice();
}

function hayDomPreferencias() {
  return typeof document !== 'undefined' && !!document.getElementById('pref-contador');
}

function leerFiltrosPreferencias() {
  const dias = document.getElementById('pref-dias');
  const hmin = document.getElementById('pref-hmin');
  const hmax = document.getElementById('pref-hmax');
  return {
    diasLibres: dias ? Array.from(dias.selectedOptions).map(o => o.value) : [],
    horaMin: hmin ? hmin.value : '',
    horaMax: hmax ? hmax.value : ''
  };
}

function leerOrdenPreferencias() {
  const orden = document.getElementById('pref-orden');
  return orden ? orden.value : '';
}

function mostrarMensajePreferencias(texto) {
  const msg = document.getElementById('pref-mensaje');
  if (msg) msg.textContent = texto || '';
  ['pref-hmin', 'pref-hmax'].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    if (texto) campo.setAttribute('aria-invalid', 'true');
    else campo.removeAttribute('aria-invalid');
  });
}

// Mensaje de la rejilla cuando hay resultados generados pero ninguno visible.
function mensajeVacioPreferencias(error) {
  return error
    ? { titulo: 'Rango de horas no válido', texto: error }
    : { titulo: 'Ningún horario cumple las preferencias', texto: 'Quita o ajusta algún filtro para ver las opciones generadas.' };
}

// Recalcula la lista visible y la entrega a la rejilla (la navegación vuelve a la opción 1).
function recalcularPreferencias() {
  const filtros = hayDomPreferencias() ? leerFiltrosPreferencias() : FILTROS_VACIOS;
  const orden = hayDomPreferencias() ? leerOrdenPreferencias() : '';
  const r = aplicarPreferencias(resultadosOrigenPreferencias, filtros, orden);
  resultadosVisiblesPreferencias = r.visibles;
  if (hayDomPreferencias()) {
    mostrarMensajePreferencias(r.error);
    const contador = document.getElementById('pref-contador');
    contador.textContent = r.error ? '' : textoContadorPreferencias(r.mostrados, r.total);
    const limpiar = document.getElementById('pref-limpiar');
    if (limpiar) limpiar.disabled = !hayFiltrosActivos(filtros);
  }
  if (typeof establecerResultadosRejilla === 'function') {
    const hayOrigen = resultadosOrigenPreferencias.length > 0;
    establecerResultadosRejilla(r.visibles, hayOrigen ? { mensajeVacio: mensajeVacioPreferencias(r.error) } : undefined);
  }
  notificarCambioPreferencias({
    mostrados: r.mostrados,
    total: r.total,
    error: r.error,
    filtros: filtros,
    orden: orden
  });
  return r;
}

function hayFiltrosActivos(filtros) {
  const f = normalizarFiltros(filtros);
  return f.diasLibres.length > 0 || !!f.horaMin || !!f.horaMax;
}

// Punto de entrada para generador.js: recibe la lista completa de combinaciones
// (vacía al invalidar) y aplica los filtros y el orden vigentes.
function establecerResultadosPreferencias(resultados) {
  resultadosOrigenPreferencias = Array.isArray(resultados) ? resultados.slice() : [];
  return recalcularPreferencias();
}

function quitarFiltrosPreferencias() {
  const dias = document.getElementById('pref-dias');
  if (dias) Array.from(dias.options).forEach(o => { o.selected = false; });
  ['pref-hmin', 'pref-hmax'].forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = '';
  });
  recalcularPreferencias();
}

function inicializarPreferencias() {
  if (!hayDomPreferencias()) return;
  ['pref-dias', 'pref-hmin', 'pref-hmax', 'pref-orden'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', recalcularPreferencias);
    if (el.type === 'time') el.addEventListener('input', recalcularPreferencias);
  });
  const contador = document.getElementById('pref-contador');
  contador.setAttribute('role', 'status');
  contador.setAttribute('aria-live', 'polite');
  const limpiar = crearElemento('button', { id: 'pref-limpiar', type: 'button', clase: 'secondary', texto: 'Quitar filtros' });
  limpiar.addEventListener('click', quitarFiltrosPreferencias);
  contador.insertAdjacentElement('beforebegin', limpiar);
  contador.insertAdjacentElement('afterend', crearElemento('div', { id: 'pref-mensaje', clase: 'error', role: 'alert' }));
  recalcularPreferencias();
}
