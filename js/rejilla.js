// Rejilla semanal (§4.8). La lógica pura no toca el DOM; el render queda
// protegido para que el archivo cargue también fuera del navegador.

// Dominio del campo `dia` definido por el enunciado.
const DIAS_REJILLA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const SLOTS_COLOR_MATERIA = 8;
const PX_POR_MINUTO_REJILLA = 1.4;

/* ---------- Escala y ubicación ---------- */

function mcdEnteros(a, b) {
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

function intervaloSesionMin(sesion) {
  const porId = new Map(obtenerBloques().map(b => [b.id, b]));
  const bloques = ((sesion && sesion.bloques) || []).map(id => porId.get(id)).filter(Boolean);
  if (!bloques.length) return null;
  return {
    ini: Math.min.apply(null, bloques.map(b => hhmmToMin(b.inicio))),
    fin: Math.max.apply(null, bloques.map(b => hhmmToMin(b.fin)))
  };
}

// Escala vertical derivada de BLOQUES: nada del dataset queda fijo en el código.
function escalaRejilla() {
  const bloques = obtenerBloques();
  if (!bloques.length) return { inicio: 0, fin: 0, paso: 1, filas: 0 };
  const inicios = bloques.map(b => hhmmToMin(b.inicio));
  const fines = bloques.map(b => hhmmToMin(b.fin));
  const inicio = Math.min.apply(null, inicios);
  const fin = Math.max.apply(null, fines);
  let paso = 0;
  inicios.concat(fines).forEach(m => { paso = mcdEnteros(paso, m - inicio); });
  if (!paso) paso = 1;
  return { inicio, fin, paso, filas: (fin - inicio) / paso };
}

function ubicacionSesion(ini, fin, escala) {
  return {
    filaInicio: (ini - escala.inicio) / escala.paso + 1,
    span: (fin - ini) / escala.paso
  };
}

/* ---------- Normalización y sesiones ---------- */

function normalizarResultado(resultado) {
  if (!Array.isArray(resultado)) return [];
  const salida = [];
  resultado.forEach(e => {
    if (!e || typeof e !== 'object') return;
    if (e.materia && typeof e.materia === 'object' && e.seccion && typeof e.seccion === 'object') {
      salida.push({ materia: e.materia, seccion: e.seccion });
      return;
    }
    const idSeccion = e.seccionId !== undefined ? e.seccionId
      : (e.seccion && typeof e.seccion === 'object' ? e.seccion.id : e.seccion);
    const materia = obtenerMateriaPorCodigo(e.codigo);
    if (!materia || idSeccion === undefined || idSeccion === null) return;
    const seccion = (materia.secciones || []).find(s => s.id === idSeccion);
    if (seccion) salida.push({ materia, seccion });
  });
  return salida;
}

function sesionesDeResultado(resultado) {
  const sesiones = [];
  normalizarResultado(resultado).forEach(({ materia, seccion }) => {
    (seccion.horario || []).forEach(h => {
      const intervalo = intervaloSesionMin(h);
      if (!intervalo) return;
      sesiones.push({
        codigo: materia.codigo, nombre: materia.nombre, seccionId: seccion.id,
        profesor: seccion.profesor, dia: h.dia, aula: h.aula,
        ini: intervalo.ini, fin: intervalo.fin
      });
    });
  });
  return sesiones;
}

function firmaResultado(resultado) {
  return normalizarResultado(resultado)
    .map(e => e.materia.codigo + '#' + e.seccion.id)
    .sort()
    .join('|');
}

/* ---------- Métricas (reutilizables por preferencias.js, §4.7) ---------- */

function metricasResultado(resultado) {
  const sesiones = sesionesDeResultado(resultado);
  if (!sesiones.length) return { diasAsistencia: 0, horasMuertasMin: 0, entradaMin: null, salidaMin: null };
  const porDia = new Map();
  sesiones.forEach(s => {
    if (!porDia.has(s.dia)) porDia.set(s.dia, []);
    porDia.get(s.dia).push(s);
  });
  let muertas = 0;
  porDia.forEach(lista => {
    lista.sort((a, b) => a.ini - b.ini);
    let finMax = lista[0].fin;
    for (let i = 1; i < lista.length; i++) {
      if (lista[i].ini > finMax) muertas += lista[i].ini - finMax;
      finMax = Math.max(finMax, lista[i].fin);
    }
  });
  return {
    diasAsistencia: porDia.size,
    horasMuertasMin: muertas,
    entradaMin: Math.min.apply(null, sesiones.map(s => s.ini)),
    salidaMin: Math.max.apply(null, sesiones.map(s => s.fin))
  };
}

function formatearDuracion(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return m + ' min';
  return m ? h + ' h ' + m + ' min' : h + ' h';
}

/* ---------- Color estable por materia (reglas de tokens.css) ---------- */

const coloresMaterias = new Map();

function asignarColoresMaterias(codigos) {
  (codigos || []).forEach(c => {
    if (!coloresMaterias.has(c)) coloresMaterias.set(c, coloresMaterias.size + 1);
  });
}

function slotColorMateria(codigo) {
  asignarColoresMaterias([codigo]);
  return ((coloresMaterias.get(codigo) - 1) % SLOTS_COLOR_MATERIA) + 1;
}

/* ---------- Estado de navegación ---------- */

let resultadosRejilla = [];
let indiceRejilla = 0;
let sesionActivaRejilla = null;
let elementoActivoRejilla = null;

function hayDomRejilla() {
  return typeof document !== 'undefined' && !!document.getElementById('rej-grid');
}

function establecerResultadosRejilla(resultados) {
  resultadosRejilla = Array.isArray(resultados) ? resultados.slice() : [];
  indiceRejilla = 0;
  resultadosRejilla.forEach(r => {
    asignarColoresMaterias(normalizarResultado(r).map(e => e.materia.codigo));
  });
  renderRejilla();
}

function limpiarResultadosRejilla() {
  resultadosRejilla = [];
  indiceRejilla = 0;
  renderRejilla();
}

function obtenerResultadoActual() {
  return resultadosRejilla[indiceRejilla] || null;
}

function irResultadoSiguiente() {
  if (indiceRejilla < resultadosRejilla.length - 1) indiceRejilla++;
  renderRejilla();
}

function irResultadoAnterior() {
  if (indiceRejilla > 0) indiceRejilla--;
  renderRejilla();
}

function textoPosicionRejilla() {
  const total = resultadosRejilla.length;
  return 'Opción ' + (total ? indiceRejilla + 1 : 0) + ' de ' + total;
}

/* ---------- Render ---------- */

function textoHorasSesion(s) {
  return minutosAHhmm(s.ini) + '–' + minutosAHhmm(s.fin);
}

function etiquetasEjeRejilla(escala) {
  const bloques = obtenerBloques();
  const regulares = bloques.filter(b => b.tipo === 'regular');
  const base = regulares.length ? regulares : bloques;
  const marcas = new Set(base.map(b => hhmmToMin(b.inicio)));
  return Array.from(marcas).sort((a, b) => a - b).concat(escala.fin);
}

function construirRejilla(resultado, opciones) {
  const opts = opciones || {};
  const escala = escalaRejilla();
  const grid = crearElemento('div', { clase: 'rejilla-grid' });
  const alto = Math.max(escala.paso * PX_POR_MINUTO_REJILLA, 4);
  grid.style.gridTemplateColumns = '3.5rem repeat(' + DIAS_REJILLA.length + ', minmax(7rem, 1fr))';
  grid.style.gridTemplateRows = 'auto repeat(' + escala.filas + ', ' + alto + 'px)';

  grid.appendChild(crearElemento('div', { clase: 'rej-esquina' }));
  DIAS_REJILLA.forEach((dia, i) => {
    const cab = crearElemento('div', { clase: 'rej-dia', texto: dia });
    cab.style.gridColumn = String(i + 2);
    cab.style.gridRow = '1';
    grid.appendChild(cab);
  });

  etiquetasEjeRejilla(escala).forEach(min => {
    const fila = (min - escala.inicio) / escala.paso;
    if (!Number.isInteger(fila) || fila < 0 || fila > escala.filas) return;
    const final = fila === escala.filas;
    if (!final) {
      const guia = crearElemento('div', { clase: 'rej-guia', 'aria-hidden': 'true' });
      guia.style.gridColumn = '1 / -1';
      guia.style.gridRow = String(fila + 2);
      grid.appendChild(guia);
    }
    const hora = crearElemento('div', { clase: 'rej-hora' + (final ? ' final' : ''), texto: minutosAHhmm(min) });
    hora.style.gridColumn = '1';
    hora.style.gridRow = String(final ? fila + 1 : fila + 2);
    grid.appendChild(hora);
  });

  sesionesDeResultado(resultado).forEach(s => {
    const col = DIAS_REJILLA.indexOf(s.dia);
    if (col < 0) return;
    const { filaInicio, span } = ubicacionSesion(s.ini, s.fin, escala);
    const slot = slotColorMateria(s.codigo);
    const etiqueta = s.codigo + ' ' + s.nombre + ', sección ' + s.seccionId + ', ' + s.dia + ' ' +
      textoHorasSesion(s) + ', aula ' + s.aula;
    const el = crearElemento(opts.interactiva ? 'button' : 'div', {
      clase: 'rej-sesion',
      type: opts.interactiva ? 'button' : null,
      'aria-pressed': opts.interactiva ? 'false' : null,
      'aria-label': etiqueta,
      'data-slot': slot
    }, [
      crearElemento('strong', { clase: 'rej-sesion-codigo', texto: s.codigo }),
      crearElemento('span', { texto: 'Sec. ' + s.seccionId }),
      crearElemento('span', { clase: 'rej-sesion-aula', texto: s.aula })
    ]);
    el.style.setProperty('--rej-color', 'var(--materia-' + slot + ')');
    el.style.gridColumn = String(col + 2);
    el.style.gridRow = String(filaInicio + 1) + ' / span ' + span;
    if (opts.interactiva) {
      el.addEventListener('click', function () {
        if (typeof opts.alSeleccionar === 'function') opts.alSeleccionar(s, el);
      });
    }
    grid.appendChild(el);
  });
  return grid;
}

function renderMetricasRejilla(resultado) {
  const cont = document.getElementById('rej-metricas');
  if (!cont) return;
  cont.textContent = '';
  if (!normalizarResultado(resultado).length) return;
  const m = metricasResultado(resultado);
  const sinDato = v => (v === null ? '—' : minutosAHhmm(v));
  [
    ['Días de asistencia', String(m.diasAsistencia)],
    ['Horas muertas', formatearDuracion(m.horasMuertasMin)],
    ['Entrada más temprana', sinDato(m.entradaMin)],
    ['Salida más tardía', sinDato(m.salidaMin)]
  ].forEach(([titulo, valor]) => {
    cont.appendChild(crearElemento('div', { clase: 'rej-metrica' }, [
      crearElemento('span', { clase: 'rej-metrica-titulo', texto: titulo }),
      crearElemento('strong', { texto: valor })
    ]));
  });
}

function cerrarDetalleRejilla(devolverFoco) {
  const det = document.getElementById('rej-detalle');
  if (det) {
    det.classList.remove('abierto');
    det.setAttribute('aria-hidden', 'true');
    det.textContent = '';
  }
  const el = elementoActivoRejilla;
  if (el) {
    el.classList.remove('activa');
    el.setAttribute('aria-pressed', 'false');
    if (devolverFoco && el.isConnected) el.focus();
  }
  sesionActivaRejilla = null;
  elementoActivoRejilla = null;
}

function abrirDetalleRejilla(sesion, elemento) {
  const det = document.getElementById('rej-detalle');
  if (!det) return;
  // Pulsar de nuevo la misma sesión alterna el detalle.
  if (elementoActivoRejilla === elemento) { cerrarDetalleRejilla(true); return; }
  cerrarDetalleRejilla(false);
  sesionActivaRejilla = sesion;
  elementoActivoRejilla = elemento;
  elemento.classList.add('activa');
  elemento.setAttribute('aria-pressed', 'true');
  const filas = [
    ['Código', sesion.codigo],
    ['Sección', sesion.seccionId],
    ['Profesor', sesion.profesor],
    ['Día', sesion.dia],
    ['Horario', textoHorasSesion(sesion)],
    ['Aula', sesion.aula]
  ];
  const lista = crearElemento('dl', { clase: 'rej-detalle-datos' });
  filas.forEach(([t, v]) => {
    lista.appendChild(crearElemento('dt', { texto: t }));
    lista.appendChild(crearElemento('dd', { texto: v }));
  });
  const cerrar = crearElemento('button', { type: 'button', clase: 'btn-sel', texto: 'Cerrar detalle' });
  cerrar.addEventListener('click', function () { cerrarDetalleRejilla(true); });
  det.appendChild(crearElemento('h3', { texto: sesion.nombre }));
  det.appendChild(lista);
  det.appendChild(cerrar);
  det.setAttribute('aria-hidden', 'false');
  det.classList.add('abierto');
}

function renderRejilla() {
  if (!hayDomRejilla()) return;
  const resultado = obtenerResultadoActual();
  const hay = !!resultado;
  const pos = document.getElementById('rej-pos');
  if (pos) pos.textContent = textoPosicionRejilla();
  const ant = document.getElementById('rej-anterior');
  const sig = document.getElementById('rej-siguiente');
  const def = document.getElementById('btn-definitivo');
  if (ant) ant.disabled = !hay || indiceRejilla <= 0;
  if (sig) sig.disabled = !hay || indiceRejilla >= resultadosRejilla.length - 1;
  if (def) def.disabled = !hay;

  cerrarDetalleRejilla(false);
  renderMetricasRejilla(resultado);

  const cont = document.getElementById('rej-grid');
  cont.textContent = '';
  if (hay) {
    const scroll = crearElemento('div', { clase: 'rej-scroll' });
    scroll.appendChild(construirRejilla(resultado, { interactiva: true, alSeleccionar: abrirDetalleRejilla }));
    cont.appendChild(scroll);
  } else {
    cont.appendChild(crearElemento('div', { clase: 'estado-vacio muted' }, [
      crearElemento('strong', { texto: 'Todavía no hay horarios generados' }),
      crearElemento('p', { texto: 'Usa "Generar horarios" para ver aquí las opciones.' })
    ]));
  }
  document.dispatchEvent(new CustomEvent('rejilla:cambio'));
}

function inicializarRejilla() {
  if (typeof document === 'undefined') return;
  const ant = document.getElementById('rej-anterior');
  const sig = document.getElementById('rej-siguiente');
  if (ant) ant.addEventListener('click', irResultadoAnterior);
  if (sig) sig.addEventListener('click', irResultadoSiguiente);
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && sesionActivaRejilla) cerrarDetalleRejilla(true);
  });
  renderRejilla();
}

// Arranque provisional de la Fase 5: app.js (Fase 6) asumirá la coordinación
// y este bloque debe eliminarse entonces.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', inicializarRejilla);
}
