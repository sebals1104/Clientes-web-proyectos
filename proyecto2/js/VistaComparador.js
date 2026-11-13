// Vista del comparador de dos recetas (#43)
//
// Monta dos PanelComparador (A y B) y la TablaComparacion cuando ambos tienen
// receta. Escucha 'receta-elegida' y 'vaciar-panel' de los paneles para
// sincronizar el estado, y emite 'comparador-cambio { paneles }' para que
// app.js lo conserve y la barra actualice su contador. También ofrece el botón
// Intercambiar y, si app.js la monta con { reemplazar }, pregunta en pantalla
// qué panel reemplaza la receta pendiente (sin confirm()).
class VistaComparador {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;              // { signal, paneles, reemplazar }
    this.paneles = [
      props.paneles && props.paneles[0] ? props.paneles[0] : null,
      props.paneles && props.paneles[1] ? props.paneles[1] : null
    ];
    this.reemplazar = props.reemplazar || null;   // receta pendiente de ubicar
    this.raiz = null;
    this.elementos = {};
    this.componentes = {};
    this.oyentes = [];               // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Crea el elemento raíz, monta los paneles y la tabla, y pinta el estado.
  crear() {
    const raiz = document.createElement('section');
    raiz.className = 'vista-comparador';
    raiz.setAttribute('aria-labelledby', 'comparador-titulo');

    const cabecera = document.createElement('div');
    cabecera.className = 'comparador-cabecera';
    const titulo = document.createElement('h2');
    titulo.id = 'comparador-titulo';
    titulo.textContent = 'Comparador';
    const intercambiar = document.createElement('button');
    intercambiar.type = 'button';
    intercambiar.className = 'boton--secundario';
    intercambiar.dataset.accion = 'intercambiar';
    intercambiar.textContent = 'Intercambiar';
    cabecera.append(titulo, intercambiar);
    raiz.appendChild(cabecera);

    // Aviso de reemplazo: se muestra cuando app.js pide ubicar una receta.
    const reemplazo = document.createElement('div');
    reemplazo.className = 'comparador-reemplazo';
    reemplazo.hidden = true;
    reemplazo.setAttribute('role', 'status');
    reemplazo.setAttribute('aria-live', 'polite');
    const reemplazoTexto = document.createElement('p');
    reemplazoTexto.className = 'comparador-reemplazo__texto';
    const reemplazoAcciones = document.createElement('div');
    reemplazoAcciones.className = 'comparador-reemplazo__acciones';
    const reemplazarA = document.createElement('button');
    reemplazarA.type = 'button';
    reemplazarA.className = 'boton--primario';
    reemplazarA.dataset.accion = 'reemplazar-a';
    reemplazarA.textContent = 'Reemplazar panel A';
    const reemplazarB = document.createElement('button');
    reemplazarB.type = 'button';
    reemplazarB.className = 'boton--secundario';
    reemplazarB.dataset.accion = 'reemplazar-b';
    reemplazarB.textContent = 'Reemplazar panel B';
    reemplazoAcciones.append(reemplazarA, reemplazarB);
    reemplazo.append(reemplazoTexto, reemplazoAcciones);
    raiz.appendChild(reemplazo);

    const paneles = document.createElement('div');
    paneles.className = 'comparador-paneles';
    const panelA = document.createElement('div');
    panelA.className = 'comparador-panel-a';
    const panelB = document.createElement('div');
    panelB.className = 'comparador-panel-b';
    paneles.append(panelA, panelB);
    raiz.appendChild(paneles);

    const tabla = document.createElement('div');
    tabla.className = 'comparador-tabla';
    raiz.appendChild(tabla);

    this.raiz = raiz;
    this.elementos = { intercambiar, reemplazo, reemplazoTexto, reemplazarA, reemplazarB };
    this.contenedor.appendChild(raiz);

    this.componentes.panelA = new PanelComparador(panelA, { panel: 'A', receta: this.paneles[0], otra: this.paneles[1] });
    this.componentes.panelB = new PanelComparador(panelB, { panel: 'B', receta: this.paneles[1], otra: this.paneles[0] });
    this.componentes.tabla = new TablaComparacion(tabla, { a: this.paneles[0], b: this.paneles[1] });
    Object.values(this.componentes).forEach(componente => componente.crear());

    this.configurarEventos();
    this.renderControles();
    this.renderReemplazo();
    return raiz;
  }

  // Actualiza el estado del botón Intercambiar y el aviso de reemplazo.
  render() {
    this.renderControles();
    this.renderReemplazo();
  }

  // Intercambiar solo tiene sentido con dos recetas cargadas.
  renderControles() {
    this.elementos.intercambiar.disabled = !(this.paneles[0] && this.paneles[1]);
  }

  // Muestra la pregunta de reemplazo o la oculta si no hay receta pendiente.
  renderReemplazo() {
    const cont = this.elementos.reemplazo;
    if (!this.reemplazar) {
      cont.hidden = true;
      this.elementos.reemplazoTexto.textContent = '';
      return;
    }
    cont.hidden = false;
    this.elementos.reemplazoTexto.textContent =
      'El comparador está lleno. Elige qué panel reemplaza «' + this.reemplazar.nombre + '».';
    this.elementos.reemplazarA.setAttribute('aria-label', 'Reemplazar el panel A por ' + this.reemplazar.nombre);
    this.elementos.reemplazarB.setAttribute('aria-label', 'Reemplazar el panel B por ' + this.reemplazar.nombre);
  }

  // Registra elección, vaciado, intercambio y reemplazo.
  configurarEventos() {
    this.escuchar(this.raiz, 'click', evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton || !this.raiz.contains(boton)) return;
      const accion = boton.dataset.accion;
      if (accion === 'intercambiar') this.intercambiar();
      else if (accion === 'reemplazar-a') this.reemplazarEn('A');
      else if (accion === 'reemplazar-b') this.reemplazarEn('B');
    });
    this.escuchar(this.raiz, 'receta-elegida', evento => this.alElegir(evento.detail || {}));
    this.escuchar(this.raiz, 'vaciar-panel', evento => this.alVaciar(evento.detail || {}));
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion) {
    elemento.addEventListener(tipo, funcion);
    this.oyentes.push({ elemento, tipo, funcion });
  }

  // Emite un CustomEvent que burbujea con los datos en detail.
  emitir(tipo, detalle) {
    this.raiz.dispatchEvent(new CustomEvent(tipo, { bubbles: true, detail: detalle }));
  }

  // Una receta fue elegida en un panel: guarda y sincroniza el resto.
  alElegir(detalle) {
    const indice = detalle.panel === 'B' ? 1 : 0;
    if (!detalle.receta) return;
    this.paneles[indice] = detalle.receta;
    this.reemplazar = null;
    this.sincronizar();
  }

  // Un panel quedó vacío: guarda y sincroniza.
  alVaciar(detalle) {
    const indice = detalle.panel === 'B' ? 1 : 0;
    this.paneles[indice] = null;
    this.sincronizar();
  }

  // Intercambia las recetas de los dos paneles.
  intercambiar() {
    if (!this.paneles[0] || !this.paneles[1]) return;
    this.paneles.reverse();
    this.componentes.panelA.actualizar(this.paneles[0]);
    this.componentes.panelB.actualizar(this.paneles[1]);
    this.sincronizar();
  }

  // Pone la receta pendiente en el panel elegido para reemplazarlo.
  reemplazarEn(panel) {
    if (!this.reemplazar) return;
    const indice = panel === 'B' ? 1 : 0;
    this.paneles[indice] = this.reemplazar;
    this.reemplazar = null;
    this.componentes.panelA.actualizar(this.paneles[0]);
    this.componentes.panelB.actualizar(this.paneles[1]);
    this.sincronizar();
  }

  // Sincroniza la receta del otro panel, la tabla y avisa a app.js.
  sincronizar() {
    const [a, b] = this.paneles;
    this.componentes.panelA.actualizarOtra(b);
    this.componentes.panelB.actualizarOtra(a);
    this.componentes.tabla.actualizar(a, b);
    this.renderControles();
    this.renderReemplazo();
    this.emitir('comparador-cambio', { paneles: this.paneles.slice() });
  }

  // Libera sus listeners y componentes, y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    Object.values(this.componentes).forEach(componente => componente.destruir());
    this.componentes = {};
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }

  // Devuelve las recetas cargadas, por si otra vista necesita restaurarse.
  obtenerEstado() {
    return { paneles: this.paneles.slice() };
  }
}
