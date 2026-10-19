const catalogoAbiertos = new Set();

function horarioLegibleSesion(sesion) {
  if (!sesion || !Array.isArray(sesion.bloques) || sesion.bloques.length === 0) return '';
  const bloques = obtenerBloques();
  const usados = sesion.bloques
    .map(id => bloques.find(b => b.id === id))
    .filter(Boolean);
  if (usados.length === 0) return '';
  const inicio = Math.min.apply(null, usados.map(b => hhmmToMin(b.inicio)));
  const fin = Math.max.apply(null, usados.map(b => hhmmToMin(b.fin)));
  return minutosAHhmm(inicio) + ' - ' + minutosAHhmm(fin);
}

function obtenerTrimestresDisponibles() {
  const set = new Set(obtenerCatalogoCompleto().map(m => m.trimestre));
  return Array.from(set).sort((a, b) => a - b);
}

function esMateriaManual(codigo) {
  return obtenerMateriasManuales().some(m => m.codigo === codigo);
}

/* ---------- Presentación ---------- */

function llenarSelectTrimestres(id) {
  const select = document.getElementById(id);
  if (!select) return;
  const previo = select.value;
  while (select.options.length > 1) select.remove(1);
  obtenerTrimestresDisponibles().forEach(t => {
    const op = document.createElement('option');
    op.value = String(t);
    op.textContent = 'Trimestre ' + t;
    select.appendChild(op);
  });
  select.value = previo;
}

function crearDetalleMateria(materia) {
  const detalle = crearElemento('details', { clase: 'cat-detalle', 'data-codigo': materia.codigo }, [
    crearElemento('summary', { texto: 'Ver secciones y horarios' }),
    crearElemento('ul', { clase: 'cat-secciones' }, materia.secciones.map(s =>
      crearElemento('li', { clase: 'cat-seccion' }, [
        crearElemento('div', {}, [
          crearElemento('strong', { texto: 'Sección ' + s.id }),
          crearElemento('span', { clase: 'muted', texto: ' · ' + (s.profesor || 'Sin profesor') })
        ]),
        crearElemento('ul', { clase: 'sel-sesiones' }, (s.horario || []).map(ses =>
          crearElemento('li', { texto: ses.dia + ' · ' + horarioLegibleSesion(ses) + (ses.aula ? ' · ' + ses.aula : '') })
        ))
      ])
    ))
  ]);
  detalle.open = catalogoAbiertos.has(materia.codigo);
  detalle.addEventListener('toggle', function () {
    if (detalle.open) catalogoAbiertos.add(materia.codigo);
    else catalogoAbiertos.delete(materia.codigo);
  });
  return detalle;
}

function crearTarjetaCatalogo(materia) {
  const seleccionada = estaSeleccionada(materia.codigo);
  const boton = crearElemento('button', {
    type: 'button',
    clase: 'btn-sel' + (seleccionada ? ' activo' : ''),
    'data-accion': seleccionada ? 'quitar' : 'agregar',
    'data-codigo': materia.codigo,
    'aria-pressed': seleccionada ? 'true' : 'false',
    'aria-label': (seleccionada ? 'Quitar ' : 'Agregar ') + materia.nombre + (seleccionada ? ' de la selección' : ' a la selección'),
    texto: seleccionada ? 'Quitar' : 'Agregar'
  });
  return crearElemento('article', { clase: 'card cat-card' + (seleccionada ? ' seleccionada' : '') }, [
    crearElemento('header', { clase: 'cat-cabecera' }, [
      crearElemento('div', {}, [
        crearElemento('strong', { clase: 'codigo', texto: materia.codigo }),
        esMateriaManual(materia.codigo) ? crearElemento('span', { clase: 'etiqueta etiqueta-manual', texto: 'Manual' }) : null,
        seleccionada ? crearElemento('span', { clase: 'etiqueta etiqueta-activa', texto: 'Seleccionada' }) : null
      ]),
      boton
    ]),
    crearElemento('h3', { clase: 'cat-nombre', texto: materia.nombre }),
    crearElemento('div', { clase: 'muted', texto: 'Trimestre ' + materia.trimestre + ' · ' + materia.uc + ' UC · ' + materia.secciones.length + (materia.secciones.length === 1 ? ' sección' : ' secciones') }),
    crearDetalleMateria(materia)
  ]);
}

function renderCatalogo() {
  if (typeof document === 'undefined') return;
  const lista = document.getElementById('catalogo-lista');
  if (!lista) return;
  llenarSelectTrimestres('filtro-trimestre');
  llenarSelectTrimestres('sel-trim-completo');
  const campo = document.getElementById('busqueda');
  const filtro = document.getElementById('filtro-trimestre');
  const texto = campo ? campo.value : '';
  const trimestre = filtro && filtro.value !== '' ? filtro.value : null;
  const resultado = buscarMaterias({ texto: texto, trimestre: trimestre });

  const foco = document.activeElement && document.activeElement.getAttribute
    ? document.activeElement.getAttribute('data-codigo') : null;
  const accionFoco = foco && document.activeElement.getAttribute('data-accion');
  lista.textContent = '';
  if (resultado.length === 0) {
    lista.appendChild(crearElemento('div', { clase: 'estado-vacio' }, [
      crearElemento('strong', { texto: 'Sin resultados' }),
      crearElemento('p', { clase: 'muted', texto: 'Ninguna materia coincide con la búsqueda o el trimestre elegido. Pruebe con otro término o quite el filtro.' })
    ]));
    return;
  }
  resultado.forEach(m => lista.appendChild(crearTarjetaCatalogo(m)));
  if (foco && accionFoco) {
    const nuevo = lista.querySelector('button[data-codigo="' + foco.replace(/["\\]/g, '\\$&') + '"]');
    if (nuevo) nuevo.focus();
  }
}

function inicializarCatalogo() {
  if (typeof document === 'undefined') return;
  const campo = document.getElementById('busqueda');
  const filtro = document.getElementById('filtro-trimestre');
  if (campo) campo.addEventListener('input', renderCatalogo);
  if (filtro) filtro.addEventListener('change', renderCatalogo);
  const lista = document.getElementById('catalogo-lista');
  if (lista) {
    lista.addEventListener('click', function (ev) {
      const b = ev.target.closest ? ev.target.closest('button[data-accion]') : null;
      if (!b) return;
      const codigo = b.getAttribute('data-codigo');
      const r = b.getAttribute('data-accion') === 'quitar'
        ? quitarMateriaSeleccion(codigo)
        : agregarMateriaSeleccion(codigo);
      mostrarMensajeSeleccion(r.mensaje, r.ok ? 'ok' : 'error');
    });
  }
  suscribirCambioSeleccion(renderCatalogo);
  renderCatalogo();
}

// Arranque provisional de la Fase 2: app.js (Fase 6) asumirá la coordinación
// y este bloque debe eliminarse entonces.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    inicializarSeleccion();
    inicializarCatalogo();
  });
}
