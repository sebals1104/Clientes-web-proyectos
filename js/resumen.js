// Horario definitivo (§4.9): copia independiente del catálogo, tabla por
// materia y versión imprimible. La lógica pura no toca el DOM.

let horarioDefinitivo = null;

/* ---------- Lógica pura ---------- */

function filasResumen(resultado) {
  return normalizarResultado(resultado).map(({ materia, seccion }) => {
    const sesiones = [];
    (seccion.horario || []).forEach(h => {
      const intervalo = intervaloSesionMin(h);
      if (!intervalo) return;
      sesiones.push({
        dia: h.dia, inicio: minutosAHhmm(intervalo.ini), fin: minutosAHhmm(intervalo.fin),
        aula: h.aula, _ini: intervalo.ini
      });
    });
    sesiones.sort((a, b) => (DIAS_REJILLA.indexOf(a.dia) - DIAS_REJILLA.indexOf(b.dia)) || (a._ini - b._ini));
    return {
      codigo: materia.codigo, nombre: materia.nombre, seccion: seccion.id,
      profesor: seccion.profesor, uc: materia.uc,
      sesiones: sesiones.map(({ dia, inicio, fin, aula }) => ({ dia, inicio, fin, aula }))
    };
  });
}

function totalUcResumen(filas) {
  return (filas || []).reduce((suma, f) => suma + (Number(f.uc) || 0), 0);
}

function elegirHorarioDefinitivo(resultado) {
  const normalizado = normalizarResultado(resultado);
  if (!normalizado.length) {
    return { ok: false, mensaje: 'No hay un horario válido para elegir como definitivo.' };
  }
  // Copia profunda: el definitivo no depende de cambios posteriores del catálogo.
  const copia = JSON.parse(JSON.stringify(normalizado));
  const filas = filasResumen(copia);
  horarioDefinitivo = { resultado: copia, filas, totalUc: totalUcResumen(filas) };
  renderResumen();
  return { ok: true, mensaje: 'Horario definitivo guardado: ' + filas.length + ' materias, ' + horarioDefinitivo.totalUc + ' UC.' };
}

function obtenerHorarioDefinitivo() {
  return horarioDefinitivo;
}

function esHorarioDefinitivo(resultado) {
  return !!horarioDefinitivo && firmaResultado(resultado) === firmaResultado(horarioDefinitivo.resultado);
}

function borrarHorarioDefinitivo() {
  horarioDefinitivo = null;
  renderResumen();
}

/* ---------- Render ---------- */

const ETIQUETA_DEFINITIVO_ACTIVO = 'Es tu horario definitivo';
let etiquetaDefinitivoOriginal = null;

function hayDomResumen() {
  return typeof document !== 'undefined' && !!document.getElementById('res-tabla');
}

function listaCelda(sesiones, texto) {
  return crearElemento('ul', { clase: 'res-lista' },
    sesiones.map(s => crearElemento('li', { texto: texto(s) })));
}

function construirTablaResumen(def) {
  const encabezado = ['Código', 'Nombre', 'Sección', 'Profesor', 'Horario', 'Aula', 'UC'];
  const filas = def.filas.map(f => {
    const muestra = crearElemento('span', { clase: 'res-muestra', 'aria-hidden': 'true', 'data-slot': slotColorMateria(f.codigo) });
    muestra.style.setProperty('--rej-color', 'var(--materia-' + slotColorMateria(f.codigo) + ')');
    return crearElemento('tr', {}, [
      crearElemento('th', { scope: 'row', clase: 'res-codigo' }, [muestra, f.codigo]),
      crearElemento('td', { texto: f.nombre }),
      crearElemento('td', { texto: f.seccion }),
      crearElemento('td', { texto: f.profesor }),
      crearElemento('td', {}, [listaCelda(f.sesiones, s => s.dia + ' ' + s.inicio + '–' + s.fin)]),
      crearElemento('td', {}, [listaCelda(f.sesiones, s => s.aula)]),
      crearElemento('td', { clase: 'res-num', texto: String(f.uc) })
    ]);
  });
  return crearElemento('table', { clase: 'res-tabla' }, [
    crearElemento('caption', { texto: 'Materias del horario definitivo' }),
    crearElemento('thead', {}, [crearElemento('tr', {},
      encabezado.map(t => crearElemento('th', { scope: 'col', texto: t })))]),
    crearElemento('tbody', {}, filas),
    crearElemento('tfoot', {}, [crearElemento('tr', {}, [
      crearElemento('th', { scope: 'row', colspan: '6', texto: 'Total de unidades de crédito' }),
      crearElemento('td', { clase: 'res-num', texto: String(def.totalUc) })
    ])])
  ]);
}

function renderResumen() {
  if (!hayDomResumen()) return;
  const def = obtenerHorarioDefinitivo();
  const rej = document.getElementById('res-rejilla');
  const tabla = document.getElementById('res-tabla');
  const total = document.getElementById('res-total');
  const imprimir = document.getElementById('btn-imprimir');
  const quitar = document.getElementById('btn-quitar-definitivo');
  rej.textContent = '';
  tabla.textContent = '';
  if (imprimir) imprimir.disabled = !def;
  if (quitar) quitar.disabled = !def;
  if (!def) {
    total.textContent = '';
    tabla.appendChild(crearElemento('div', { clase: 'estado-vacio muted' }, [
      crearElemento('strong', { texto: 'Aún no eliges un horario definitivo' }),
      crearElemento('p', { texto: 'Elige una opción en la rejilla con «Elegir como horario definitivo».' })
    ]));
  } else {
    const scroll = crearElemento('div', { clase: 'rej-scroll' });
    scroll.appendChild(construirRejilla(def.resultado, { interactiva: false }));
    rej.appendChild(scroll);
    tabla.appendChild(construirTablaResumen(def));
    total.textContent = def.filas.length + ' materias · ' + def.totalUc + ' UC';
  }
  actualizarBotonDefinitivo();
}

function actualizarBotonDefinitivo() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btn-definitivo');
  if (!btn) return;
  if (etiquetaDefinitivoOriginal === null) etiquetaDefinitivoOriginal = btn.textContent;
  const actual = obtenerResultadoActual();
  const esDefinitivo = !!actual && esHorarioDefinitivo(actual);
  btn.textContent = esDefinitivo ? ETIQUETA_DEFINITIVO_ACTIVO : etiquetaDefinitivoOriginal;
  btn.classList.toggle('activo', esDefinitivo);
  btn.disabled = !actual || esDefinitivo;
}

function mostrarMensajeResumen(texto, tipo) {
  const msg = document.getElementById('res-mensaje');
  if (!msg) return;
  msg.textContent = texto;
  // Conserva no-print: el aviso es parte de los controles, no del resumen impreso.
  msg.className = 'res-mensaje no-print' + (texto ? ' ' + tipo : '');
}

function alElegirDefinitivo() {
  const r = elegirHorarioDefinitivo(obtenerResultadoActual());
  mostrarMensajeResumen(r.mensaje, r.ok ? 'ok' : 'error');
  if (!r.ok) return;
  const sec = document.getElementById('sec-resumen');
  const titulo = sec && sec.querySelector('h2');
  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sec) sec.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  if (titulo) titulo.focus({ preventScroll: true });
}

function inicializarResumen() {
  if (typeof document === 'undefined') return;
  const sec = document.getElementById('sec-resumen');
  const controles = sec && sec.querySelector('.no-print');
  const titulo = sec && sec.querySelector('h2');
  if (titulo) titulo.setAttribute('tabindex', '-1');
  if (controles) {
    const quitar = crearElemento('button', { id: 'btn-quitar-definitivo', type: 'button', clase: 'secondary', texto: 'Quitar horario definitivo' });
    quitar.addEventListener('click', function () {
      borrarHorarioDefinitivo();
      mostrarMensajeResumen('Se quitó el horario definitivo.', 'ok');
    });
    controles.appendChild(quitar);
    controles.insertAdjacentElement('afterend',
      crearElemento('div', { id: 'res-mensaje', clase: 'res-mensaje no-print', role: 'status' }));
  }
  const def = document.getElementById('btn-definitivo');
  if (def) def.addEventListener('click', alElegirDefinitivo);
  const imprimir = document.getElementById('btn-imprimir');
  if (imprimir) imprimir.addEventListener('click', function () { window.print(); });
  document.addEventListener('rejilla:cambio', actualizarBotonDefinitivo);
  renderResumen();
}

// Arranque provisional de la Fase 5: app.js (Fase 6) asumirá la coordinación
// y este bloque debe eliminarse entonces.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', inicializarResumen);
}
