// Barra de navegación principal entre vistas (#29)
class BarraNavegacion {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      vistaActiva: props.vistaActiva || null,
      total: props.total || 0
    };
    this.raiz = null;
    this.enlaces = {};     // vista -> <a>
    this.contador = null;
    this.oyentes = [];     // { elemento, tipo, funcion }
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    const raiz = document.createElement('ul');
    raiz.className = 'barra-navegacion';

    BarraNavegacion.enlaces.forEach(definicion => {
      const item = document.createElement('li');
      const enlace = document.createElement('a');
      enlace.className = 'barra-navegacion__enlace';
      enlace.href = '#' + definicion.vista;
      enlace.dataset.vista = definicion.vista;
      enlace.appendChild(document.createTextNode(definicion.texto));
      if (definicion.vista === 'comparador') this.contador = this.crearContador(enlace);
      item.appendChild(enlace);
      raiz.appendChild(item);
      this.enlaces[definicion.vista] = enlace;
    });

    this.raiz = raiz;
    this.contenedor.appendChild(raiz);
    this.configurarEventos();
    this.render();
    return raiz;
  }

  // Crea el contador del comparador con su texto para lectores de pantalla.
  crearContador(enlace) {
    const contador = document.createElement('span');
    contador.className = 'barra-navegacion__contador';
    const numero = document.createElement('span');
    numero.className = 'barra-navegacion__numero';
    const lectores = document.createElement('span');
    lectores.className = 'solo-lectores';
    lectores.textContent = ' recetas cargadas';
    contador.appendChild(numero);
    contador.appendChild(lectores);
    enlace.appendChild(contador);
    return contador;
  }

  // Pinta la vista activa y el contador del comparador.
  render() {
    if (!this.raiz) return;
    Object.keys(this.enlaces).forEach(vista => {
      if (vista === this.estado.vistaActiva) this.enlaces[vista].setAttribute('aria-current', 'page');
      else this.enlaces[vista].removeAttribute('aria-current');
    });
    this.contador.firstChild.textContent = String(this.estado.total);
    this.contador.dataset.total = String(this.estado.total);
  }

  // Registra el click en los enlaces y el cambio del comparador en document.
  configurarEventos() {
    const alClick = evento => {
      const enlace = evento.target.closest('a[data-vista]');
      if (!enlace || !this.raiz.contains(enlace)) return;
      evento.preventDefault();
      this.raiz.dispatchEvent(new CustomEvent('navegar', {
        bubbles: true,
        detail: { vista: enlace.dataset.vista }
      }));
    };
    this.raiz.addEventListener('click', alClick);
    this.oyentes.push({ elemento: this.raiz, tipo: 'click', funcion: alClick });

    const alCambiarComparador = evento => {
      const paneles = evento.detail && evento.detail.paneles;
      this.actualizarTotal(paneles ? Object.values(paneles).filter(Boolean).length : 0);
    };
    document.addEventListener('comparador-cambio', alCambiarComparador);
    this.oyentes.push({ elemento: document, tipo: 'comparador-cambio', funcion: alCambiarComparador });
  }

  // Resalta el enlace de la vista indicada (null si ninguna de la barra).
  marcarActiva(vista) {
    this.estado.vistaActiva = vista;
    this.render();
  }

  // Cambia el número de recetas cargadas en el comparador.
  actualizarTotal(total) {
    this.estado.total = Math.min(Math.max(Number(total) || 0, 0), 2);
    this.render();
  }

  // Libera sus listeners y saca su elemento del DOM.
  destruir() {
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.enlaces = {};
    this.contador = null;
  }
}

// Enlaces de la barra en orden; vista es el nombre que viaja en navegar { vista }.
BarraNavegacion.enlaces = [
  { vista: 'inicio', texto: 'Inicio' },
  { vista: 'explorar', texto: 'Explorar' },
  { vista: 'categorias-origenes', texto: 'Categorías y orígenes' },
  { vista: 'comparador', texto: 'Comparador' }
];
