// Lista de ingredientes con su imagen, nombre y medida (#32)
//
// Recibe los ingredientes ya normalizados por recetas.js: cada uno es
// { nombre, medida, imagen }. Si la imagen de TheMealDB no carga, se
// reemplaza por la imagen alternativa propia assets/ingrediente-fallback.svg
// (el evento error de <img> no burbujea, así que el oyente se registra en
// cada imagen durante el render). Los datos de la API solo entran por
// textContent y atributos. No emite eventos.
class ListaIngredientes {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;                    // { respaldo }: URL de la imagen alternativa
    this.ingredientes = [];
    this.raiz = null;
  }

  // Crea el elemento raíz, lo agrega al contenedor y pinta sin datos.
  crear() {
    this.raiz = document.createElement('ul');
    this.raiz.className = 'lista-ingredientes';
    this.raiz.hidden = true;
    this.contenedor.appendChild(this.raiz);
    this.configurarEventos();
    this.render();
    return this.raiz;
  }

  // Reemplaza los ingredientes y vuelve a pintar.
  actualizar(ingredientes) {
    this.ingredientes = Array.isArray(ingredientes) ? ingredientes : [];
    this.render();
  }

  // Pinta la lista reemplazando el contenido anterior.
  render() {
    if (!this.raiz) return;
    while (this.raiz.firstChild) this.raiz.removeChild(this.raiz.firstChild);
    this.raiz.hidden = this.ingredientes.length === 0;

    this.ingredientes.forEach(ingrediente => {
      const item = document.createElement('li');
      item.className = 'lista-ingredientes__item';

      const imagen = document.createElement('img');
      imagen.className = 'lista-ingredientes__imagen';
      imagen.src = ingrediente.imagen;
      imagen.alt = ingrediente.nombre;
      imagen.loading = 'lazy';
      imagen.decoding = 'async';
      imagen.addEventListener('error', () => this.usarRespaldo(imagen));
      item.appendChild(imagen);

      const datos = document.createElement('div');
      datos.className = 'lista-ingredientes__datos';

      const nombre = document.createElement('span');
      nombre.className = 'lista-ingredientes__nombre';
      nombre.textContent = ingrediente.nombre;
      datos.appendChild(nombre);

      // La medida puede venir vacía; styles.css la oculta si no tiene texto.
      const medida = document.createElement('span');
      medida.className = 'lista-ingredientes__medida';
      medida.textContent = ingrediente.medida || '';
      datos.appendChild(medida);

      item.appendChild(datos);
      this.raiz.appendChild(item);
    });
  }

  // Sin eventos hacia afuera: el único oyente es el error de cada imagen,
  // que se registra en render() porque no burbujea.
  configurarEventos() {}

  // Sustituye una imagen rota por la alternativa propia. Solo actúa una vez
  // por imagen para no entrar en un bucle si el respaldo tampoco cargara.
  usarRespaldo(imagen) {
    if (imagen.dataset.respaldo) return;
    imagen.dataset.respaldo = 'true';
    imagen.classList.add('lista-ingredientes__imagen--respaldo');
    imagen.src = this.props.respaldo || 'assets/ingrediente-fallback.svg';
  }

  // Saca su elemento del DOM. Los oyentes de las imágenes mueren con ellas.
  destruir() {
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.ingredientes = [];
  }
}
