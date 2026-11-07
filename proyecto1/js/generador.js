/* ---------- Estado ---------- */

let resultadosGenerador = [];
let generadoAlgunaVez = false;
let resultadosInvalidados = false;
let mensajeGenerador = '';

const suscriptoresGenerador = [];

/* ---------- Suscripción ---------- */

// Registra una función que se llama cada vez que cambian los resultados.
function suscribirCambioGenerador(callback) {
  suscriptoresGenerador.push(callback);
}

// Avisa a los suscriptores; un fallo en uno no detiene a los demás.
function notificarCambioGenerador(detalle) {
  suscriptoresGenerador.forEach(callback => {
    try {
      callback(detalle);
    } catch (error) {
      console.error('Fallo en un manejador del generador:', error);
    }
  });
}

// Descarta los resultados cuando la selección cambia.
function invalidarResultados() {
  const habiaInformacion = resultadosGenerador.length > 0 || generadoAlgunaVez;
  mensajeGenerador = '';
  if (!habiaInformacion) {
    renderGenerador();
    return;
  }
  resultadosGenerador = [];
  resultadosInvalidados = generadoAlgunaVez;
  establecerResultadosPreferencias([]);
  renderGenerador();
  notificarCambioGenerador({ total: 0, invalidados: true });
}

/* ---------- Generación de combinaciones ---------- */

// Indica si alguna sesión de la sección choca con las ya elegidas.
function seccionChocaConSesiones(seccion, sesionesAcumuladas) {
  return seccion.horario.some(propia => sesionesAcumuladas.some(otra => sesionChocaCon(propia, otra)));
}

// Recorre las materias eligiendo una sección por materia; descarta la rama al primer choque.
function generarCombinaciones(materias, indice, eleccionActual, sesionesAcumuladas, resultado, estadisticas) {
  if (indice === materias.length) {
    resultado.push(eleccionActual);
    estadisticas.completas++;
    return;
  }

  const materia = materias[indice];
  const secciones = seccionesDisponibles(materia.codigo);
  if (secciones.length === 0) {
    estadisticas.ramasDescartadas++;
    return;
  }

  secciones.forEach(seccion => {
    estadisticas.nodosVisitados++;
    if (seccionChocaConSesiones(seccion, sesionesAcumuladas)) {
      estadisticas.ramasDescartadas++;
      return;
    }
    generarCombinaciones(
      materias,
      indice + 1,
      eleccionActual.concat([{ materia, seccion }]),
      sesionesAcumuladas.concat(seccion.horario),
      resultado,
      estadisticas
    );
  });
}

// Genera las combinaciones válidas de la selección actual y actualiza la pantalla.
function generarHorarios() {
  const seleccionActual = obtenerSeleccion();
  if (seleccionActual.length === 0) {
    resultadosGenerador = [];
    resultadosInvalidados = generadoAlgunaVez;
    mensajeGenerador = 'Seleccione al menos una materia antes de generar horarios.';
    renderGenerador();
    notificarCambioGenerador({ total: 0, invalidados: true });
    return { ok: false, total: 0, combinaciones: [], mensaje: mensajeGenerador };
  }

  const materias = seleccionActual.map(entrada => obtenerMateriaPorCodigo(entrada.codigo)).filter(Boolean);
  const combinaciones = [];
  const estadisticas = { nodosVisitados: 0, ramasDescartadas: 0, completas: 0 };
  generarCombinaciones(materias, 0, [], [], combinaciones, estadisticas);

  resultadosGenerador = combinaciones;
  generadoAlgunaVez = true;
  resultadosInvalidados = false;

  if (combinaciones.length === 0) {
    const incompatibles = detectarIncompatibilidades(seleccionActual);
    let mensaje = 'No existe ninguna combinación válida para la selección actual.';
    if (incompatibles.length > 0) {
      mensaje += ` Materias incompatibles: ${textoIncompatibilidades(incompatibles)}.`;
    }
    mensajeGenerador = mensaje;
    renderGenerador();
    notificarCambioGenerador({ total: 0, invalidados: false, incompatibles });
    return { ok: false, total: 0, combinaciones: [], incompatibles, mensaje, estadisticas };
  }

  mensajeGenerador = '';
  renderGenerador();
  notificarCambioGenerador({ total: combinaciones.length, invalidados: false });
  return {
    ok: true,
    total: combinaciones.length,
    combinaciones: combinaciones.slice(),
    mensaje: `Se encontraron ${combinaciones.length} combinación(es) válida(s).`,
    estadisticas
  };
}

/* ---------- Presentación ---------- */

// Arma el texto que describe cada par de materias incompatibles.
function textoIncompatibilidades(pares) {
  return pares.map(par => {
    const materiaA = obtenerMateriaPorCodigo(par.a);
    const materiaB = obtenerMateriaPorCodigo(par.b);
    return `${materiaA.nombre} (${par.a})  incompatible con  ${materiaB.nombre} (${par.b})`;
  }).join('; ');
}

// Escribe el total de combinaciones generadas.
function renderTotalGenerador() {
  const cantidad = resultadosGenerador.length;
  const palabra = cantidad === 1 ? 'combinación' : 'combinaciones';
  document.getElementById('gen-total').textContent = `${cantidad} ${palabra}`;
}

// Escribe el mensaje de estado del generador según lo que haya pasado.
function renderMensajeGenerador() {
  const mensaje = document.getElementById('gen-msg');
  if (resultadosGenerador.length > 0) {
    mensaje.textContent = `Horarios generados: ${resultadosGenerador.length} combinación(es) válida(s).`;
    mensaje.className = 'muted ok';
  } else if (resultadosInvalidados) {
    mensaje.textContent = 'Sin resultados. La selección cambió y los horarios anteriores ya no son válidos: vuelva a generar.';
    mensaje.className = 'muted';
  } else if (mensajeGenerador) {
    mensaje.textContent = mensajeGenerador;
    mensaje.className = 'muted error';
  } else if (generadoAlgunaVez) {
    mensaje.textContent = 'Sin resultados. Pulse "Generar horarios" para buscar combinaciones válidas.';
    mensaje.className = 'muted';
  } else if (obtenerSeleccion().length === 0) {
    mensaje.textContent = 'Sin resultados. Agregue materias a la selección y pulse "Generar horarios".';
    mensaje.className = 'muted';
  } else {
    mensaje.textContent = 'Listo para generar. Pulse "Generar horarios" para buscar combinaciones válidas.';
    mensaje.className = 'muted';
  }
}

// Escribe el aviso de choques e incompatibilidades de la selección.
function renderChoques() {
  const contenedor = document.getElementById('choques-info');
  const seleccionActual = obtenerSeleccion();
  if (seleccionActual.length === 0) {
    contenedor.textContent = 'Sin materias seleccionadas, no hay choques que evaluar.';
    contenedor.className = 'muted';
    return;
  }
  const incompatibles = detectarIncompatibilidades(seleccionActual);
  if (incompatibles.length === 0) {
    contenedor.textContent = 'No se detectaron incompatibilidades entre las materias seleccionadas.';
    contenedor.className = 'muted ok';
    return;
  }
  contenedor.textContent = `Materias incompatibles: ${textoIncompatibilidades(incompatibles)}.`;
  contenedor.className = 'muted error';
}

// Redibuja total, mensaje y choques.
function renderGenerador() {
  renderTotalGenerador();
  renderMensajeGenerador();
  renderChoques();
}

/* ---------- Arranque ---------- */

// Conecta el botón Generar y la invalidación al cambiar la selección.
function inicializarGenerador() {
  document.getElementById('btn-generar').addEventListener('click', function () {
    const resultado = generarHorarios();
    establecerResultadosPreferencias(resultado.combinaciones);
  });
  suscribirCambioSeleccion(invalidarResultados);
  renderGenerador();
}
