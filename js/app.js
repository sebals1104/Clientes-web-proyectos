// app.js - Punto de entrada y coordinación de la aplicación (Fase 6)
//
// app.js es el único arranque de la SPA: inicializa los módulos en el orden
// correcto, mantiene el estado global de la sesión y conecta los eventos
// entre vistas.
//
// El estado vive solo en memoria mientras la pestaña está abierta. No se usa
// localStorage, sessionStorage, IndexedDB ni cookies: al recargar, la sesión
// empieza de cero. Tampoco se usan alert(), confirm() ni prompt(); todos los
// avisos se escriben en el DOM.
//
// Orden de inicialización (respeta las dependencias entre módulos):
//   selección -> catálogo -> formulario -> generador -> preferencias
//   -> rejilla -> resumen
// La carga de los scripts la define index.html (Fase 6, #18).

/* ---------- Estado global en memoria ---------- */

const estadoApp = {
  iniciado: false,
  seleccion: [],
  filtros: { diasLibres: [], horaMin: '', horaMax: '' },
  orden: '',
  resultados: [],
  resultadosVisibles: [],
  horarioDefinitivo: null
};

function obtenerEstadoApp() {
  return estadoApp;
}

/* ---------- Bus de eventos de la aplicación ---------- */

const suscriptoresApp = {};

function suscribirEventoApp(evento, callback) {
  if (typeof callback !== 'function') return;
  if (!suscriptoresApp[evento]) suscriptoresApp[evento] = [];
  suscriptoresApp[evento].push(callback);
}

function emitirEventoApp(evento, detalle) {
  const lista = suscriptoresApp[evento] || [];
  lista.forEach(callback => {
    try {
      callback(detalle);
    } catch (error) {
      console.error('Fallo en el manejador de "' + evento + '":', error);
    }
  });
}

/* ---------- Sincronización con los módulos ---------- */

function leerFiltrosActuales() {
  if (typeof leerFiltrosPreferencias !== 'function') return { diasLibres: [], horaMin: '', horaMax: '' };
  return leerFiltrosPreferencias();
}

function leerOrdenActual() {
  if (typeof leerOrdenPreferencias !== 'function') return '';
  return leerOrdenPreferencias();
}

function sincronizarEstadoApp() {
  estadoApp.seleccion = typeof obtenerSeleccion === 'function' ? obtenerSeleccion() : [];
  estadoApp.filtros = leerFiltrosActuales();
  estadoApp.orden = leerOrdenActual();
  estadoApp.resultados = typeof obtenerResultadosOrigenPreferencias === 'function'
    ? obtenerResultadosOrigenPreferencias() : [];
  estadoApp.resultadosVisibles = typeof obtenerResultadosVisiblesPreferencias === 'function'
    ? obtenerResultadosVisiblesPreferencias() : [];
  estadoApp.horarioDefinitivo = typeof obtenerHorarioDefinitivo === 'function'
    ? obtenerHorarioDefinitivo() : null;
}

/* ---------- Integración visible entre vistas ---------- */

// Franja de estado que resume la sesión y hace visible cómo se relacionan
// las vistas: lo que se selecciona, lo que se genera y lo que ya es definitivo.
function renderEstadoApp() {
  if (typeof document === 'undefined') return;
  const cont = document.getElementById('app-estado');
  if (!cont) return;

  const totalUc = estadoApp.seleccion.reduce((suma, e) => {
    const materia = typeof obtenerMateriaPorCodigo === 'function' ? obtenerMateriaPorCodigo(e.codigo) : null;
    return suma + (materia ? materia.uc : 0);
  }, 0);

  const filtrosActivos = estadoApp.filtros.diasLibres.length
    + (estadoApp.filtros.horaMin ? 1 : 0)
    + (estadoApp.filtros.horaMax ? 1 : 0);

  const def = estadoApp.horarioDefinitivo;
  const textoDefinitivo = def
    ? def.filas.length + ' materias · ' + def.totalUc + ' UC'
    : 'sin definir';

  const partes = [
    'Selección: ' + estadoApp.seleccion.length + (estadoApp.seleccion.length === 1 ? ' materia' : ' materias')
      + ' · ' + totalUc + ' UC',
    'Generadas: ' + estadoApp.resultados.length
      + ' · Visibles: ' + estadoApp.resultadosVisibles.length
      + (filtrosActivos > 0 ? ' (' + filtrosActivos + (filtrosActivos === 1 ? ' filtro' : ' filtros') + ')' : ''),
    'Horario definitivo: ' + textoDefinitivo
  ];

  cont.textContent = partes.join('   |   ');
  cont.className = 'estado-panel no-print';
}

/* ---------- Coordinación entre módulos ---------- */

// Cada módulo notifica su cambio; app.js actualiza el estado global y
// refresca la franja de estado para que todas las vistas queden alineadas.
function conectarEventosApp() {
  if (typeof suscribirCambioSeleccion === 'function') {
    suscribirCambioSeleccion(function () {
      sincronizarEstadoApp();
      renderEstadoApp();
      emitirEventoApp('seleccion:cambio', { seleccion: estadoApp.seleccion });
    });
  }

  if (typeof suscribirCambioGenerador === 'function') {
    suscribirCambioGenerador(function (detalle) {
      sincronizarEstadoApp();
      renderEstadoApp();
      emitirEventoApp('generador:cambio', detalle || {});
    });
  }

  if (typeof suscribirCambioPreferencias === 'function') {
    suscribirCambioPreferencias(function (detalle) {
      sincronizarEstadoApp();
      renderEstadoApp();
      emitirEventoApp('preferencias:cambio', detalle || {});
    });
  }

  if (typeof suscribirCambioResumen === 'function') {
    suscribirCambioResumen(function (detalle) {
      sincronizarEstadoApp();
      renderEstadoApp();
      emitirEventoApp('resumen:cambio', detalle || {});
    });
  }

  document.addEventListener('rejilla:cambio', function () {
    sincronizarEstadoApp();
    renderEstadoApp();
    emitirEventoApp('rejilla:cambio', { indice: 0 });
  });
}

// Inserta la franja de estado en la cabecera. Se hace desde app.js para no
// depender de cambios en index.html (#18).
function montarFranjaEstado() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('app-estado')) return;
  const cabecera = document.querySelector('header');
  if (!cabecera) return;
  const franja = crearElemento('div', {
    id: 'app-estado', clase: 'estado-panel no-print', role: 'status', 'aria-live': 'polite'
  });
  cabecera.appendChild(franja);
}

/* ---------- Arranque ---------- */

function inicializarApp() {
  if (estadoApp.iniciado) return;
  estadoApp.iniciado = true;

  montarFranjaEstado();

  // 1. Selección: es la fuente de la que dependen catálogo, choques y generador.
  if (typeof inicializarSeleccion === 'function') inicializarSeleccion();

  // 2. Catálogo: lee la selección para marcar las materias ya elegidas.
  if (typeof inicializarCatalogo === 'function') inicializarCatalogo();

  // 3. Materias manuales: agrega, edita y elimina del catálogo propio.
  if (typeof initFormulario === 'function') initFormulario();

  // 4. Generador: produce combinaciones y las entrega a las preferencias.
  if (typeof inicializarGenerador === 'function') inicializarGenerador();

  // 5. Preferencias: filtra y ordena lo que entrega el generador.
  if (typeof inicializarPreferencias === 'function') inicializarPreferencias();

  // 6. Rejilla: muestra la opción visible y sus métricas.
  if (typeof inicializarRejilla === 'function') inicializarRejilla();

  // 7. Resumen: horario definitivo e impresión.
  if (typeof inicializarResumen === 'function') inicializarResumen();

  conectarEventosApp();
  sincronizarEstadoApp();
  renderEstadoApp();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
  } else {
    inicializarApp();
  }
}
