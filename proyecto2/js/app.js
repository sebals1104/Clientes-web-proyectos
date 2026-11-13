// Punto de entrada y cambio de vistas (#28)
class Aplicacion {
  constructor() {
    this.contenedor = null;      // #vista
    this.anuncios = null;        // #anuncios
    this.barra = null;
    this.vista = null;           // instancia de la vista activa
    this.nombre = null;          // nombre de la vista activa
    this.propsVista = {};        // props propias de la vista activa (sin signal ni paneles)
    this.controlador = null;     // AbortController de la vista activa
    this.historial = [];         // vistas de origen: { nombre, props, estado }
    this.paneles = [null, null]; // recetas del comparador (A y B), vivas durante la sesión
    this.emitiendo = false;      // evita atender el comparador-cambio que emite la propia app
    this.oyentes = [];           // { tipo, funcion }
  }

  // Monta la barra, registra los eventos y muestra la vista de inicio.
  iniciar() {
    this.contenedor = document.getElementById('vista');
    this.anuncios = document.getElementById('anuncios');
    this.barra = new BarraNavegacion(document.getElementById('barra-navegacion'), { vistaActiva: 'inicio', total: 0 });
    this.barra.crear();
    this.configurarEventos();
    this.montar('inicio', {}, false);
  }

  // Escucha en document los eventos de la aplicación.
  configurarEventos() {
    this.escuchar('navegar', evento => this.alNavegar(evento.detail || {}));
    this.escuchar('abrir-detalle', evento => this.alAbrirDetalle(evento.detail || {}));
    this.escuchar('volver', () => this.alVolver());
    this.escuchar('agregar-comparador', evento => this.alAgregarComparador(evento.detail || {}));
    this.escuchar('comparador-cambio', evento => this.alCambiarComparador(evento.detail || {}));
  }

  // Registra un listener en document y lo guarda para detener().
  escuchar(tipo, funcion) {
    document.addEventListener(tipo, funcion);
    this.oyentes.push({ tipo, funcion });
  }

  // Quita los listeners y destruye la vista y la barra.
  detener() {
    this.oyentes.forEach(oyente => document.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    this.desmontar();
    if (this.barra) this.barra.destruir();
    this.barra = null;
  }

  /* ---------- Vistas ---------- */

  // Cancela las peticiones de la vista activa y la destruye.
  desmontar() {
    if (this.controlador) this.controlador.abort();
    this.controlador = null;
    if (this.vista) this.vista.destruir();
    this.vista = null;
  }

  // Destruye la vista anterior y monta la indicada con sus props.
  montar(nombre, props = {}, animar = true) {
    const Vista = Aplicacion.vistas[nombre];
    if (!Vista) return;
    this.desmontar();
    this.controlador = new AbortController();
    this.nombre = nombre;
    this.propsVista = props;
    this.vista = new Vista(this.contenedor, Object.assign({}, props, {
      signal: this.controlador.signal,
      paneles: this.paneles.slice()
    }));
    this.vista.crear();
    this.barra.marcarActiva(this.vistaDeLaBarra());
    if (animar) this.transicion(nombre);
  }

  // Indica qué enlace de la barra se resalta: la vista, o su origen si es el detalle.
  vistaDeLaBarra() {
    if (this.nombre !== 'detalle') return this.nombre;
    const origen = this.historial[this.historial.length - 1];
    return origen ? origen.nombre : null;
  }

  // Anima la entrada de la vista, la anuncia y lleva el foco al contenido.
  transicion(nombre) {
    this.contenedor.classList.remove('aparece');
    void this.contenedor.offsetWidth;
    this.contenedor.classList.add('aparece');
    this.contenedor.focus({ preventScroll: true });
    const enlace = BarraNavegacion.enlaces.find(e => e.vista === nombre);
    this.anunciar('Vista ' + (enlace ? enlace.texto : 'Detalle de receta'));
  }

  // Escribe un mensaje en la región de anuncios para lectores de pantalla.
  anunciar(mensaje) {
    if (this.anuncios) this.anuncios.textContent = mensaje;
  }

  /* ---------- Eventos ---------- */

  // Cambia de vista desde la barra o desde otra vista y olvida el historial.
  alNavegar(detalle) {
    if (!Aplicacion.vistas[detalle.vista] || detalle.vista === 'detalle') return;
    if (detalle.vista === this.nombre && !detalle.props) return;
    this.historial = [];
    this.montar(detalle.vista, detalle.props || {});
  }

  // Abre el detalle guardando la vista de origen con su estado.
  alAbrirDetalle(detalle) {
    if (detalle.id === undefined || detalle.id === null) return;
    this.historial.push({
      nombre: this.nombre,
      props: this.propsVista,
      estado: this.vista ? this.vista.obtenerEstado() : undefined
    });
    this.montar('detalle', { id: String(detalle.id) });
  }

  // Vuelve a la vista de origen con el estado que tenía; sin origen, a Inicio.
  alVolver() {
    const origen = this.historial.pop();
    if (!origen) {
      this.montar('inicio');
      return;
    }
    this.montar(origen.nombre, Object.assign({}, origen.props, { estado: origen.estado }));
  }

  // Pone la receta en el primer panel libre del comparador y avisa del cambio.
  alAgregarComparador(detalle) {
    const receta = detalle.receta;
    if (!receta) return;
    if (this.paneles.some(p => p && p.id === receta.id)) {
      this.anunciar('«' + receta.nombre + '» ya está en el comparador.');
      return;
    }
    const libre = this.paneles.findIndex(p => p === null);
    if (libre === -1) {
      this.anunciar('El comparador está lleno. Elige qué panel reemplazar.');
      this.montar('comparador', { reemplazar: receta });
      return;
    }
    this.paneles[libre] = receta;
    this.anunciar('«' + receta.nombre + '» se agregó al comparador.');
    this.emitirCambioComparador();
  }

  // Guarda las recetas que informó la vista del comparador.
  alCambiarComparador(detalle) {
    if (this.emitiendo) return;
    const paneles = Array.isArray(detalle.paneles) ? detalle.paneles : [];
    this.paneles = [paneles[0] || null, paneles[1] || null];
  }

  // Emite comparador-cambio en document para que la barra actualice su contador.
  emitirCambioComparador() {
    this.emitiendo = true;
    try {
      document.dispatchEvent(new CustomEvent('comparador-cambio', {
        bubbles: true,
        detail: { paneles: this.paneles.slice() }
      }));
    } finally {
      this.emitiendo = false;
    }
  }
}

// Vistas disponibles por nombre.
Aplicacion.vistas = {
  inicio: VistaInicio,
  explorar: VistaExplorar,
  'categorias-origenes': VistaCategoriasOrigenes,
  detalle: VistaDetalle,
  comparador: VistaComparador
};

const aplicacion = new Aplicacion();
aplicacion.iniciar();
