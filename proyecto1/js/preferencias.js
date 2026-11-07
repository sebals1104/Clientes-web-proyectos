/* ---------- Filtros y orden ---------- */

const CRITERIOS_ORDEN = ['menos-dias', 'menos-muertas', 'salida-temprana'];

// Resumen por resultado; se guarda porque filtrar y ordenar lo consultan varias veces.
const cacheResumenPreferencias = new WeakMap();

// Promedio de la hora de salida (minutos) contando solo los días con clases.
function salidaPromedioMin(sesiones) {
  const salidaPorDia = new Map();
  sesiones.forEach(sesion => {
    if (!salidaPorDia.has(sesion.dia) || sesion.fin > salidaPorDia.get(sesion.dia)) {
      salidaPorDia.set(sesion.dia, sesion.fin);
    }
  });
  if (salidaPorDia.size === 0) return null;
  const suma = Array.from(salidaPorDia.values()).reduce((total, fin) => total + fin, 0);
  return suma / salidaPorDia.size;
}

// Calcula los días con clase y las métricas de un resultado.
function resumenPreferencias(resultado) {
  if (cacheResumenPreferencias.has(resultado)) return cacheResumenPreferencias.get(resultado);
  const sesiones = sesionesDeResultado(resultado);
  const metricas = metricasResultado(resultado);
  const resumen = {
    dias: new Set(sesiones.map(sesion => sesion.dia)),
    entradaMin: metricas.entradaMin,
    salidaMin: metricas.salidaMin,
    diasAsistencia: metricas.diasAsistencia,
    horasMuertasMin: metricas.horasMuertasMin,
    salidaPromedioMin: salidaPromedioMin(sesiones)
  };
  cacheResumenPreferencias.set(resultado, resumen);
  return resumen;
}

// Completa los filtros que falten con valores vacíos.
function normalizarFiltros(filtros) {
  const f = filtros || {};
  return {
    diasLibres: f.diasLibres || [],
    horaMin: f.horaMin || '',
    horaMax: f.horaMax || ''
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
  const resumen = resumenPreferencias(resultado);
  if (f.diasLibres.some(dia => resumen.dias.has(dia))) return false;
  if (f.horaMin && resumen.entradaMin !== null && resumen.entradaMin < hhmmToMin(f.horaMin)) return false;
  if (f.horaMax && resumen.salidaMin !== null && resumen.salidaMin > hhmmToMin(f.horaMax)) return false;
  return true;
}

// Valor numérico por el que se ordena un resultado según el criterio.
function claveOrden(resultado, criterio) {
  const resumen = resumenPreferencias(resultado);
  if (criterio === 'menos-dias') return resumen.diasAsistencia;
  if (criterio === 'menos-muertas') return resumen.horasMuertasMin;
  if (resumen.salidaPromedioMin === null) return Infinity;
  return resumen.salidaPromedioMin;
}

// Ordena de menor a mayor sin mutar la entrada; los empates conservan el orden del generador.
function ordenarResultados(resultados, criterio) {
  const lista = resultados.slice();
  if (!CRITERIOS_ORDEN.includes(criterio)) return lista;
  return lista
    .map((resultado, indice) => ({ resultado, indice, clave: claveOrden(resultado, criterio) }))
    .sort((a, b) => (a.clave - b.clave) || (a.indice - b.indice))
    .map(elemento => elemento.resultado);
}

// Filtra y ordena los resultados; informa el error si el rango de horas no es válido.
function aplicarPreferencias(resultados, filtros, criterio) {
  const validacion = validarFiltrosPreferencias(filtros);
  if (!validacion.ok) {
    return { visibles: [], total: resultados.length, mostrados: 0, error: validacion.mensaje };
  }
  const filtrados = resultados.filter(resultado => resultadoCumpleFiltros(resultado, filtros));
  const visibles = ordenarResultados(filtrados, criterio);
  return { visibles, total: resultados.length, mostrados: visibles.length, error: null };
}

// Texto del contador "N de M resultados".
function textoContadorPreferencias(mostrados, total) {
  if (!total) return 'Sin resultados generados';
  const palabra = total === 1 ? 'resultado' : 'resultados';
  return `${mostrados} de ${total} ${palabra}`;
}

// Indica si hay algún filtro puesto.
function hayFiltrosActivos(filtros) {
  const f = normalizarFiltros(filtros);
  return f.diasLibres.length > 0 || !!f.horaMin || !!f.horaMax;
}

/* ---------- Estado ---------- */

let resultadosOrigenPreferencias = [];
let resultadosVisiblesPreferencias = [];

const suscriptoresPreferencias = [];

// Registra una función que se llama cada vez que cambian los resultados visibles.
function suscribirCambioPreferencias(callback) {
  suscriptoresPreferencias.push(callback);
}

// Avisa a los suscriptores; un fallo en uno no detiene a los demás.
function notificarCambioPreferencias(detalle) {
  suscriptoresPreferencias.forEach(callback => {
    try {
      callback(detalle);
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

/* ---------- Lectura de la pantalla ---------- */

// Lee los filtros escritos en los campos.
function leerFiltrosPreferencias() {
  const dias = document.getElementById('pref-dias');
  return {
    diasLibres: Array.from(dias.selectedOptions).map(opcion => opcion.value),
    horaMin: document.getElementById('pref-hmin').value,
    horaMax: document.getElementById('pref-hmax').value
  };
}

// Lee el criterio de orden elegido.
function leerOrdenPreferencias() {
  return document.getElementById('pref-orden').value;
}

/* ---------- Presentación ---------- */

// Muestra u oculta el error del rango de horas y marca los campos.
function mostrarMensajePreferencias(texto) {
  const mensaje = document.getElementById('pref-mensaje');
  if (mensaje) mensaje.textContent = texto || '';
  ['pref-hmin', 'pref-hmax'].forEach(id => {
    const campo = document.getElementById(id);
    if (texto) campo.setAttribute('aria-invalid', 'true');
    else campo.removeAttribute('aria-invalid');
  });
}

// Mensaje de la rejilla cuando hay resultados generados pero ninguno visible.
function mensajeVacioPreferencias(error) {
  if (error) return { titulo: 'Rango de horas no válido', texto: error };
  return {
    titulo: 'Ningún horario cumple las preferencias',
    texto: 'Quita o ajusta algún filtro para ver las opciones generadas.'
  };
}

// Recalcula la lista visible y la entrega a la rejilla (la navegación vuelve a la opción 1).
function recalcularPreferencias() {
  const filtros = leerFiltrosPreferencias();
  const orden = leerOrdenPreferencias();
  const resultado = aplicarPreferencias(resultadosOrigenPreferencias, filtros, orden);
  resultadosVisiblesPreferencias = resultado.visibles;

  mostrarMensajePreferencias(resultado.error);
  const contador = document.getElementById('pref-contador');
  contador.textContent = resultado.error ? '' : textoContadorPreferencias(resultado.mostrados, resultado.total);
  const limpiar = document.getElementById('pref-limpiar');
  if (limpiar) limpiar.disabled = !hayFiltrosActivos(filtros);

  let opcionesRejilla;
  if (resultadosOrigenPreferencias.length > 0) {
    opcionesRejilla = { mensajeVacio: mensajeVacioPreferencias(resultado.error) };
  }
  establecerResultadosRejilla(resultado.visibles, opcionesRejilla);

  notificarCambioPreferencias({
    mostrados: resultado.mostrados,
    total: resultado.total,
    error: resultado.error,
    filtros,
    orden
  });
  return resultado;
}

// Recibe la lista completa del generador (vacía al invalidar) y aplica filtros y orden.
function establecerResultadosPreferencias(resultados) {
  resultadosOrigenPreferencias = resultados.slice();
  return recalcularPreferencias();
}

// Limpia los filtros y recalcula.
function quitarFiltrosPreferencias() {
  const dias = document.getElementById('pref-dias');
  Array.from(dias.options).forEach(opcion => { opcion.selected = false; });
  document.getElementById('pref-hmin').value = '';
  document.getElementById('pref-hmax').value = '';
  recalcularPreferencias();
}

/* ---------- Arranque ---------- */

// Conecta los campos, crea el botón Quitar filtros y el aviso de error.
function inicializarPreferencias() {
  ['pref-dias', 'pref-hmin', 'pref-hmax', 'pref-orden'].forEach(id => {
    const campo = document.getElementById(id);
    campo.addEventListener('change', recalcularPreferencias);
    if (campo.type === 'time') campo.addEventListener('input', recalcularPreferencias);
  });

  const contador = document.getElementById('pref-contador');
  contador.setAttribute('role', 'status');
  contador.setAttribute('aria-live', 'polite');

  const limpiar = document.createElement('button');
  limpiar.id = 'pref-limpiar';
  limpiar.type = 'button';
  limpiar.className = 'secondary';
  limpiar.textContent = 'Quitar filtros';
  limpiar.addEventListener('click', quitarFiltrosPreferencias);
  contador.insertAdjacentElement('beforebegin', limpiar);

  const mensaje = document.createElement('div');
  mensaje.id = 'pref-mensaje';
  mensaje.className = 'error';
  mensaje.setAttribute('role', 'alert');
  contador.insertAdjacentElement('afterend', mensaje);

  recalcularPreferencias();
}
