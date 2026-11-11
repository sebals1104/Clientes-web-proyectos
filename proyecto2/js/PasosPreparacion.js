// Pasos de preparación numerados de una receta (#33)
//
// Recibe los pasos ya normalizados por recetas.js (cada línea no vacía de
// strInstructions, descartando los encabezados de numeración) y los pinta
// en una lista ordenada. El número visible es decorativo (aria-hidden): el
// orden real lo aporta el <ol>. Los textos de la API solo entran por
// textContent. No emite eventos.
class PasosPreparacion {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.pasos = [];
    this.raiz = null;
  }

  // Crea el elemento raíz, lo agrega al contenedor y pinta sin datos.
  crear() {
    this.raiz = document.createElement('ol');
    this.raiz.className = 'pasos-preparacion';
    this.raiz.hidden = true;
    this.contenedor.appendChild(this.raiz);
    this.configurarEventos();
    this.render();
    return this.raiz;
  }

  // Reemplaza los pasos y vuelve a pintar.
  actualizar(pasos) {
    this.pasos = Array.isArray(pasos) ? pasos : [];
    this.render();
  }

  // Pinta la lista ordenada reemplazando el contenido anterior.
  render() {
    if (!this.raiz) return;
    while (this.raiz.firstChild) this.raiz.removeChild(this.raiz.firstChild);
    this.raiz.hidden = this.pasos.length === 0;

    this.pasos.forEach((texto, indice) => {
      const paso = document.createElement('li');
      paso.className = 'pasos-preparacion__paso';

      // Número decorativo para los estilos; el orden semántico lo da el <ol>.
      const numero = document.createElement('span');
      numero.className = 'pasos-preparacion__numero';
      numero.setAttribute('aria-hidden', 'true');
      numero.textContent = String(indice + 1);
      paso.appendChild(numero);

      const cuerpo = document.createElement('span');
      cuerpo.className = 'pasos-preparacion__texto';
      cuerpo.textContent = texto;
      paso.appendChild(cuerpo);

      this.raiz.appendChild(paso);
    });
  }

  // No hay interacción: la lista solo se lee.
  configurarEventos() {}

  // Saca su elemento del DOM.
  destruir() {
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.pasos = [];
  }
}
