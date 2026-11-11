// Tarjeta reutilizable de una receta (#30)
class TarjetaReceta {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      receta: props.receta || null,
      modo: TarjetaReceta.modoInicial(props)
    };
    this.raiz = null;
    this.elementos = {};
    this.oyentes = [];    // { elemento, tipo, funcion }
  }

  // Calcula el estado inicial según las propiedades.
  static modoInicial(props) {
    if (props.incompleta) return 'incompleta';
    return props.receta && props.receta.completa ? 'completa' : 'resumen';
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    const raiz = document.createElement('article');
    raiz.className = 'tarjeta tarjeta-receta';

    const imagen = document.createElement('img');
    imagen.className = 'tarjeta__media tarjeta-receta__imagen';
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    raiz.appendChild(imagen);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'tarjeta__cuerpo';

    const titulo = document.createElement('h3');
    titulo.className = 'tarjeta__titulo';
    cuerpo.appendChild(titulo);

    const categoria = this.crearDato(cuerpo);
    const origen = this.crearDato(cuerpo);
    const ingredientes = this.crearDato(cuerpo);

    const aviso = document.createElement('p');
    aviso.className = 'tarjeta-receta__aviso';
    aviso.textContent = 'Datos incompletos: no se pudo cargar el detalle.';
    cuerpo.appendChild(aviso);

    const acciones = document.createElement('div');
    acciones.className = 'tarjeta-receta__acciones';
    const detalle = this.crearBoton(acciones, 'abrir', 'Ver detalle', 'boton--secundario');
    const comparar = this.crearBoton(acciones, 'comparar', 'Agregar al comparador', 'boton--primario');
    const reintentar = this.crearBoton(acciones, 'reintentar', 'Reintentar', 'boton--texto');
    cuerpo.appendChild(acciones);

    raiz.appendChild(cuerpo);
    this.raiz = raiz;
    this.elementos = { imagen, titulo, categoria, origen, ingredientes, aviso, detalle, comparar, reintentar };
    this.contenedor.appendChild(raiz);
    this.configurarEventos();
    this.render();
    return raiz;
  }

  // Crea una línea de dato (categoría, origen o ingredientes) dentro del cuerpo.
  crearDato(cuerpo) {
    const dato = document.createElement('p');
    dato.className = 'tarjeta__meta tarjeta-receta__dato';
    cuerpo.appendChild(dato);
    return dato;
  }

  // Crea un botón de acción identificado por data-accion.
  crearBoton(acciones, accion, texto, clase) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = clase;
    boton.dataset.accion = accion;
    boton.textContent = texto;
    acciones.appendChild(boton);
    return boton;
  }

  // Pinta el estado actual de la tarjeta.
  render() {
    if (!this.raiz) return;
    const { receta, modo } = this.estado;
    const e = this.elementos;
    const nombre = receta ? receta.nombre : '';
    this.raiz.dataset.estado = modo;
    this.raiz.dataset.id = receta ? receta.id : '';

    e.titulo.textContent = nombre;
    if (receta && receta.imagen) {
      e.imagen.src = receta.imagen;
      e.imagen.alt = nombre;
      e.imagen.hidden = false;
    } else {
      e.imagen.removeAttribute('src');
      e.imagen.alt = '';
      e.imagen.hidden = true;
    }

    // En resumen faltan datos porque se están resolviendo; en incompleta no se pudieron obtener.
    const pendiente = modo === 'completa' ? null : (modo === 'incompleta' ? 'no disponible' : 'cargando…');
    e.categoria.textContent = 'Categoría: ' + (pendiente || (receta && receta.categoria) || 'sin dato');
    e.origen.textContent = 'Origen: ' + (pendiente || (receta && receta.origen) || 'sin dato');
    e.ingredientes.textContent = 'Ingredientes: ' + (pendiente || (receta ? receta.ingredientes.length : 0));

    e.aviso.hidden = modo !== 'incompleta';
    e.reintentar.hidden = modo !== 'incompleta';
    e.detalle.setAttribute('aria-label', 'Ver detalle de ' + nombre);
    e.comparar.setAttribute('aria-label', 'Agregar ' + nombre + ' al comparador');
    e.reintentar.setAttribute('aria-label', 'Reintentar el detalle de ' + nombre);
  }

  // Registra un único click en la raíz para las tres acciones.
  configurarEventos() {
    const alClick = evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton || !this.raiz.contains(boton) || !this.estado.receta) return;
      const accion = boton.dataset.accion;
      if (accion === 'abrir') this.emitir('abrir-detalle', { id: this.estado.receta.id });
      else if (accion === 'comparar') this.emitir('agregar-comparador', { receta: this.estado.receta });
      else if (accion === 'reintentar') this.reintentar();
    };
    this.raiz.addEventListener('click', alClick);
    this.oyentes.push({ elemento: this.raiz, tipo: 'click', funcion: alClick });
  }

  // Emite un CustomEvent que burbujea con los datos en detail.
  emitir(tipo, detalle) {
    this.raiz.dispatchEvent(new CustomEvent(tipo, { bubbles: true, detail: detalle }));
  }

  // Vuelve al estado resumen y pide al listado que resuelva de nuevo la receta.
  reintentar() {
    this.estado.modo = 'resumen';
    this.render();
    this.emitir('reintentar-tarjeta', { id: this.estado.receta.id });
  }

  // Reemplaza la receta (por ejemplo, con el detalle ya resuelto) y vuelve a pintar.
  actualizar(receta) {
    this.estado.receta = receta;
    this.estado.modo = receta && receta.completa ? 'completa' : 'resumen';
    this.render();
  }

  // Marca la tarjeta como incompleta porque no se pudo resolver el detalle.
  marcarIncompleta() {
    this.estado.modo = 'incompleta';
    this.render();
  }

  // Libera sus listeners y saca su elemento del DOM.
  destruir() {
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }
}
