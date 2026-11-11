// Paginador del cliente: página actual y total, 12 resultados por página (#35)
class Paginador {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      totalElementos: props.totalElementos || 0,
      porPagina: props.porPagina || Paginador.porPagina,
      pagina: props.pagina || 1
    };
    this.raiz = null;
    this.elementos = {};
    this.oyentes = [];    // { elemento, tipo, funcion }
  }

  // Cantidad de páginas según el total y el tamaño de página.
  totalPaginas() {
    return Math.ceil(this.estado.totalElementos / this.estado.porPagina);
  }

  // Deja la página dentro del rango válido (mínimo 1).
  limitar(pagina) {
    const numero = Math.floor(Number(pagina)) || 1;
    return Math.min(Math.max(numero, 1), Math.max(this.totalPaginas(), 1));
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    const raiz = document.createElement('nav');
    raiz.className = 'paginador';
    raiz.setAttribute('aria-label', 'Paginación');

    const anterior = this.crearBoton('anterior', 'Anterior');
    const texto = document.createElement('span');
    texto.className = 'paginador__estado';
    texto.tabIndex = -1;
    texto.setAttribute('aria-live', 'polite');
    const siguiente = this.crearBoton('siguiente', 'Siguiente');

    raiz.appendChild(anterior);
    raiz.appendChild(texto);
    raiz.appendChild(siguiente);
    this.raiz = raiz;
    this.elementos = { anterior, texto, siguiente };
    this.contenedor.appendChild(raiz);
    this.estado.pagina = this.limitar(this.estado.pagina);
    this.configurarEventos();
    this.render();
    return raiz;
  }

  // Crea un botón de navegación identificado por data-accion.
  crearBoton(accion, texto) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'paginador__boton';
    boton.dataset.accion = accion;
    boton.textContent = texto;
    return boton;
  }

  // Pinta la página actual y el total; se oculta si hay una sola página.
  render() {
    if (!this.raiz) return;
    const total = this.totalPaginas();
    const pagina = this.estado.pagina;
    this.raiz.hidden = total <= 1;
    this.elementos.texto.textContent = 'Página ' + pagina + ' de ' + total;
    this.elementos.anterior.disabled = pagina <= 1;
    this.elementos.siguiente.disabled = pagina >= total;
  }

  // Registra un único click en la raíz para Anterior y Siguiente.
  configurarEventos() {
    const alClick = evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton || boton.disabled) return;
      const paso = boton.dataset.accion === 'anterior' ? -1 : 1;
      this.cambiarPagina(this.estado.pagina + paso);
    };
    this.raiz.addEventListener('click', alClick);
    this.oyentes.push({ elemento: this.raiz, tipo: 'click', funcion: alClick });
  }

  // Cambia de página por acción del usuario y emite cambiar-pagina.
  cambiarPagina(pagina) {
    const nueva = this.limitar(pagina);
    if (nueva === this.estado.pagina) return;
    this.estado.pagina = nueva;
    this.render();
    this.conservarFoco();
    this.raiz.dispatchEvent(new CustomEvent('cambiar-pagina', { bubbles: true, detail: { pagina: nueva } }));
  }

  // Si el botón pulsado quedó deshabilitado, mueve el foco al texto de página.
  conservarFoco() {
    if (this.raiz.contains(document.activeElement) && document.activeElement.disabled) {
      this.elementos.texto.focus();
    }
  }

  // Restaura una página sin emitir evento (por ejemplo, al volver del detalle).
  establecerPagina(pagina) {
    this.estado.pagina = this.limitar(pagina);
    this.render();
  }

  // Cambia el total de resultados y, opcionalmente, la página; no emite evento.
  actualizar(totalElementos, pagina = 1) {
    this.estado.totalElementos = totalElementos || 0;
    this.estado.pagina = this.limitar(pagina);
    this.render();
  }

  // Devuelve la página actual (para obtenerEstado() de las vistas).
  obtenerPagina() {
    return this.estado.pagina;
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

// Resultados por página (§4.3).
Paginador.porPagina = 12;
