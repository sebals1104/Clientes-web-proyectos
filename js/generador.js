// generador.js - Generación de combinaciones válidas con descarte temprano
// Reglas:
//  - Una sección por materia seleccionada.
//  - Ninguna de las sesiones de secciones elegidas puede chocar con otra.
//  - Se respetan las secciones fijadas y excluidas de la selección.
//  - Descarte temprano: en cuanto una combinación parcial tiene un choque,
//    la rama se abandona sin construir las combinaciones completas que la contenían.

let resultadosGenerador = [];
let resultadosValidos = false;
let generadoAlgunaVez = false;
let resultadosInvalidados = false;
let firmaGenerador = '';
let mensajeGenerador = '';

const suscriptoresGenerador = [];

function obtenerFirmaSeleccion() {
  return obtenerSeleccion().map(e =>
    e.codigo + '|' + (e.seccionFijada === null ? '*' : e.seccionFijada) + '|' +
    e.seccionesExcluidas.slice().sort().join(',')
  ).sort().join(';');
}

function obtenerResultadosGenerados() {
  return resultadosGenerador.slice();
}

function hayResultadosValidos() {
  if (!resultadosValidos || resultadosInvalidados) return false;
  return firmaGenerador === obtenerFirmaSeleccion();
}

function suscribirCambioGenerador(callback) {
  if (typeof callback === 'function') suscriptoresGenerador.push(callback);
}

function notificarCambioGenerador() {
  renderGenerador();
}

function invalidarResultados() {
  const habiaInformacion = resultadoHayInformacion();
  mensajeGenerador = '';
  if (!habiaInformacion) { renderGenerador(); return; }
  resultadosGenerador = [];
  resultadosValidos = false;
  resultadosInvalidados = generadoAlgunaVez;
  firmaGenerador = '';
  if (typeof limpiarResultadosRejilla === 'function') limpiarResultadosRejilla();
  renderGenerador();
}

function resultadoHayInformacion() {
  return resultadosGenerador.length > 0 || generadoAlgunaVez;
}

/* ---------- Núcleo de generación ---------- */

function sesionesDeSeccion(seccion) {
  return (seccion && seccion.horario) ? seccion.horario : [];
}

function seccionChocaConSesiones(seccion, sesionesAcumuladas) {
  const propias = sesionesDeSeccion(seccion);
  for (let i = 0; i < propias.length; i++) {
    for (let j = 0; j < sesionesAcumuladas.length; j++) {
      if (sesionChocaCon(propias[i], sesionesAcumuladas[j])) return true;
    }
  }
  return false;
}

function generarCombinaciones(materias, indiceActual, eleccionActual, sesionesAcumuladas, resultado, estadisticas) {
  if (indiceActual === materias.length) {
    resultado.push(eleccionActual.slice());
    estadisticas.completas++;
    return;
  }

  const actual = materias[indiceActual];
  const secciones = seccionesDisponibles(actual.codigo);

  if (secciones.length === 0) {
    estadisticas.ramasDescartadas++;
    return;
  }

  for (let s = 0; s < secciones.length; s++) {
    const seccion = secciones[s];
    estadisticas.nodosVisitados++;

    // Descarte temprano: si esta sección choca con lo ya elegido, la rama
    // se abandona aquí. No se construyen las combinaciones completas que
    // contendrían esta elección.
    if (seccionChocaConSesiones(seccion, sesionesAcumuladas)) {
      estadisticas.ramasDescartadas++;
      continue;
    }

    eleccionActual.push({ materia: actual, seccion: seccion });
    const sesionesNuevas = sesionesDeSeccion(seccion);
    for (let k = 0; k < sesionesNuevas.length; k++) sesionesAcumuladas.push(sesionesNuevas[k]);

    generarCombinaciones(materias, indiceActual + 1, eleccionActual, sesionesAcumuladas, resultado, estadisticas);

    for (let k = 0; k < sesionesNuevas.length; k++) sesionesAcumuladas.pop();
    eleccionActual.pop();
  }
}

function generarHorarios() {
  const seleccionActual = obtenerSeleccion();
  if (seleccionActual.length === 0) {
    resultadosGenerador = [];
    resultadosValidos = false;
    resultadosInvalidados = generadoAlgunaVez;
    firmaGenerador = '';
    mensajeGenerador = 'Seleccione al menos una materia antes de generar horarios.';
    renderGenerador();
    return { ok: false, total: 0, combinaciones: [], mensaje: mensajeGenerador };
  }

  const materias = seleccionActual
    .map(e => obtenerMateriaPorCodigo(e.codigo))
    .filter(m => m !== null && m !== undefined);

  const combinaciones = [];
  const estadisticas = { nodosVisitados: 0, ramasDescartadas: 0, completas: 0 };
  generarCombinaciones(materias, 0, [], [], combinaciones, estadisticas);

  resultadosGenerador = combinaciones;
  resultadosValidos = combinaciones.length > 0;
  generadoAlgunaVez = true;
  resultadosInvalidados = false;
  firmaGenerador = obtenerFirmaSeleccion();

  if (combinaciones.length === 0) {
    const incompatibles = detectarIncompatibilidades(seleccionActual.map(e => e.codigo));
    let mensaje = 'No existe ninguna combinación válida para la selección actual.';
    if (incompatibles.length > 0) {
      mensaje += ' Materias incompatibles: ' + textoIncompatibilidades(incompatibles) + '.';
    }
    mensajeGenerador = mensaje;
    renderGenerador();
    return { ok: false, total: 0, combinaciones: [], incompatibles: incompatibles, mensaje: mensaje, estadisticas: estadisticas };
  }

  mensajeGenerador = '';
  renderGenerador();

  return {
    ok: true,
    total: combinaciones.length,
    combinaciones: combinaciones.slice(),
    mensaje: 'Se encontraron ' + combinaciones.length + ' combinación(es) válida(s).',
    estadisticas: estadisticas
  };
}

/* ---------- Presentación ---------- */

function textoIncompatibilidades(pares) {
  if (!pares || pares.length === 0) return '';
  return pares.map(p => {
    const a = obtenerMateriaPorCodigo(p.a);
    const b = obtenerMateriaPorCodigo(p.b);
    const na = a ? a.nombre : p.a;
    const nb = b ? b.nombre : p.b;
    return na + ' (' + p.a + ')  incompatible con  ' + nb + ' (' + p.b + ')';
  }).join('; ');
}

function renderGenerador() {
  if (typeof document === 'undefined') return;

  const total = document.getElementById('gen-total');
  if (total) {
    total.textContent = resultadosGenerador.length + (resultadosGenerador.length === 1 ? ' combinación' : ' combinaciones');
  }

  const msg = document.getElementById('gen-msg');
  if (msg) {
    const seleccionActual = obtenerSeleccion();
    if (resultadosGenerador.length > 0) {
      msg.textContent = 'Horarios generados: ' + resultadosGenerador.length + ' combinación(es) válida(s).';
      msg.className = 'muted ok';
    } else if (resultadosInvalidados) {
      msg.textContent = 'Sin resultados. La selección cambió y los horarios anteriores ya no son válidos: vuelva a generar.';
      msg.className = 'muted';
    } else if (mensajeGenerador) {
      msg.textContent = mensajeGenerador;
      msg.className = 'muted error';
    } else if (!generadoAlgunaVez) {
      msg.textContent = seleccionActual.length === 0
        ? 'Sin resultados. Agregue materias a la selección y pulse "Generar horarios".'
        : 'Listo para generar. Pulse "Generar horarios" para buscar combinaciones válidas.';
      msg.className = 'muted';
    } else {
      msg.textContent = 'Sin resultados. Pulse "Generar horarios" para buscar combinaciones válidas.';
      msg.className = 'muted';
    }
  }

  renderChoques();
}

function renderChoques() {
  if (typeof document === 'undefined') return;
  const cont = document.getElementById('choques-info');
  if (!cont) return;
  const seleccionActual = obtenerSeleccion();
  if (seleccionActual.length === 0) {
    cont.textContent = 'Sin materias seleccionadas, no hay choques que evaluar.';
    cont.className = 'muted';
    return;
  }
  const incompatibles = detectarIncompatibilidades(seleccionActual.map(e => e.codigo));
  if (incompatibles.length === 0) {
    cont.textContent = 'No se detectaron incompatibilidades entre las materias seleccionadas.';
    cont.className = 'muted ok';
    return;
  }
  cont.textContent = 'Materias incompatibles: ' + textoIncompatibilidades(incompatibles) + '.';
  cont.className = 'muted error';
}

function inicializarGenerador() {
  if (typeof document === 'undefined') return;

  const boton = document.getElementById('btn-generar');
  if (boton) {
    boton.addEventListener('click', function () {
      const r = generarHorarios();
      if (r.ok && typeof establecerResultadosRejilla === 'function') {
        establecerResultadosRejilla(r.combinaciones);
      }
    });
  }

  if (typeof suscribirCambioSeleccion === 'function') {
    suscribirCambioSeleccion(function () {
      // Cualquier cambio en la selección invalida los resultados mostrados.
      invalidarResultados();
    });
  }

  renderGenerador();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', inicializarGenerador);
}
