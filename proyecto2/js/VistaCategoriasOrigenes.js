// Vista de categorías y orígenes (#41)
class VistaCategoriasOrigenes {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      pestana: 'categorias',                                // 'categorias' u 'origenes'
      lista: { fase: 'cargando', items: [], error: null },  // categorías u orígenes de la pestaña
      seleccion: null,                                      // nombre elegido en la pestaña activa
      recetas: { fase: 'inicial', items: [], error: null }, // recetas normalizadas, ordenadas por nombre
      pagina: 1
    };
    this.tokenLista = 0;         // identifica la carga vigente de la lista
    this.token = 0;              // identifica la selección vigente
    this.controlador = null;     // AbortController de la selección vigente
    this.raiz = null;
    this.elementos = {};
    this.componentes = {};
    this.oyentes = [];           // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Crea el elemento raíz, monta los componentes y restaura el estado si hay uno.
  crear() {
    const raiz = document.createElement('section');
    raiz.className = 'vista-categorias';
    raiz.setAttribute('aria-labelledby', 'categorias-titulo');

    const titulo = document.createElement('h2');
    titulo.id = 'categorias-titulo';
    titulo.textContent = 'Categorías y orígenes';
    raiz.appendChild(titulo);

    const pestanas = this.crearBloque(raiz, 'pestanas');
    pestanas.setAttribute('role', 'tablist');
    pestanas.setAttribute('aria-label', 'Explorar por');
    const botones = VistaCategoriasOrigenes.pestanas.map(pestana => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.id = 'categorias-pestana-' + pestana.id;
      boton.setAttribute('role', 'tab');
      boton.setAttribute('aria-controls', 'categorias-panel');
      boton.dataset.pestana = pestana.id;
      boton.textContent = pestana.texto;
      pestanas.appendChild(boton);
      return boton;
    });

    const panel = this.crearBloque(raiz, 'vista-categorias__panel');
    panel.id = 'categorias-panel';
    panel.setAttribute('role', 'tabpanel');
    const estadoLista = this.crearBloque(panel, 'vista-categorias__estado');
    const lista = document.createElement('ul');
    lista.className = 'vista-categorias__lista';
    panel.appendChild(lista);

    const detalle = this.crearBloque(panel, 'vista-categorias__detalle');
    detalle.hidden = true;
    const ficha = this.crearBloque(detalle, 'vista-categorias__ficha');
    const estadoRecetas = this.crearBloque(detalle, 'vista-categorias__estado');
    const resultados = this.crearBloque(detalle, 'vista-categorias__resultados');
    resultados.hidden = true;
    const listado = this.crearBloque(resultados, 'vista-categorias__listado');
    const paginador = this.crearBloque(resultados, 'vista-categorias__paginador');

    this.raiz = raiz;
    this.elementos = { pestanas, botones, panel, estadoLista, lista, detalle, ficha, estadoRecetas, resultados, listado, paginador };
    this.contenedor.appendChild(raiz);

    this.componentes.estadoLista = new EstadoCarga(estadoLista, { forma: 'filas', contexto: 'categorias-lista' });
    this.componentes.estadoRecetas = new EstadoCarga(estadoRecetas, { forma: 'tarjetas', contexto: 'categorias-recetas' });
    this.componentes.listado = new ListadoRecetas(listado, { recetas: [] });
    this.componentes.paginador = new Paginador(paginador, { totalElementos: 0 });
    Object.values(this.componentes).forEach(componente => componente.crear());

    this.configurarEventos();
    this.render();
    const previo = this.props.estado;
    if (previo && previo.pestana) this.restaurar(previo);
    else this.cargarLista(this.props.categoria || null);
    return raiz;
  }

  // Crea un contenedor de bloque dentro del padre.
  crearBloque(padre, clase) {
    const bloque = document.createElement('div');
    bloque.className = clase;
    padre.appendChild(bloque);
    return bloque;
  }

  // Pinta las pestañas, la lista y la selección actual.
  render() {
    if (!this.raiz) return;
    this.renderPestanas();
    this.renderLista();
    this.renderSeleccion();
  }

  // Marca la pestaña activa y enlaza el panel con ella.
  renderPestanas() {
    if (!this.raiz) return;
    VistaCategoriasOrigenes.pestanas.forEach((pestana, indice) => {
      const activa = pestana.id === this.estado.pestana;
      const boton = this.elementos.botones[indice];
      boton.setAttribute('aria-selected', activa ? 'true' : 'false');
      boton.tabIndex = activa ? 0 : -1;
    });
    this.elementos.panel.setAttribute('aria-labelledby', 'categorias-pestana-' + this.estado.pestana);
  }

  // Pinta la carga, el error o los botones de la lista de la pestaña.
  renderLista() {
    if (!this.raiz) return;
    const { fase, items, error } = this.estado.lista;
    const estado = this.componentes.estadoLista;
    this.elementos.lista.replaceChildren();
    if (fase === 'cargando') {
      estado.cargando('filas');
    } else if (fase === 'error') {
      estado.fallo(error);
    } else if (items.length === 0) {
      estado.vacio('sin-resultados');
    } else {
      estado.ocultar();
      items.forEach(item => this.elementos.lista.appendChild(this.crearItem(this.nombreDe(item))));
      this.marcarSeleccion();
    }
  }

  // Crea el elemento de lista con el botón que elige una categoría u origen.
  crearItem(nombre) {
    const item = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton boton--secundario';
    boton.dataset.nombre = nombre;
    boton.textContent = nombre;
    item.appendChild(boton);
    return item;
  }

  // Indica con aria-pressed cuál botón de la lista está elegido.
  marcarSeleccion() {
    if (!this.raiz) return;
    this.elementos.lista.querySelectorAll('button[data-nombre]').forEach(boton => {
      boton.setAttribute('aria-pressed', boton.dataset.nombre === this.estado.seleccion ? 'true' : 'false');
    });
  }

  // Pinta la ficha y el estado de las recetas de la selección.
  renderSeleccion() {
    if (!this.raiz) return;
    const { seleccion, recetas } = this.estado;
    const estado = this.componentes.estadoRecetas;
    this.elementos.detalle.hidden = seleccion === null;
    this.elementos.resultados.hidden = true;
    if (seleccion === null) return;
    this.pintarFicha();
    if (recetas.fase === 'cargando') {
      estado.cargando('tarjetas');
    } else if (recetas.fase === 'error') {
      estado.fallo(recetas.error);
    } else if (recetas.items.length === 0) {
      estado.vacio('sin-resultados');
    } else {
      estado.ocultar();
      this.pintarResultados();
    }
  }

  // Pinta la ficha: imagen y descripción de la categoría, o el origen, con la cantidad de recetas.
  pintarFicha() {
    const { pestana, seleccion, recetas, lista } = this.estado;
    const ficha = this.elementos.ficha;
    ficha.replaceChildren();
    const item = lista.items.find(elemento => this.nombreDe(elemento) === seleccion);

    if (pestana === 'categorias' && item && item.strCategoryThumb) {
      const imagen = document.createElement('img');
      imagen.className = 'vista-categorias__imagen';
      imagen.src = item.strCategoryThumb;
      imagen.alt = seleccion;
      ficha.appendChild(imagen);
    }

    const cuerpo = this.crearBloque(ficha, 'vista-categorias__cuerpo');
    const nombre = document.createElement('h3');
    nombre.className = 'vista-categorias__nombre';
    nombre.textContent = seleccion;
    cuerpo.appendChild(nombre);

    if (pestana === 'categorias' && item && item.strCategoryDescription) {
      const descripcion = document.createElement('p');
      descripcion.className = 'vista-categorias__descripcion';
      descripcion.textContent = item.strCategoryDescription;
      cuerpo.appendChild(descripcion);
    }

    const cantidad = document.createElement('p');
    cantidad.className = 'vista-categorias__cantidad';
    cantidad.setAttribute('aria-live', 'polite');
    const total = recetas.items.length;
    if (recetas.fase === 'listo') cantidad.textContent = total + (total === 1 ? ' receta' : ' recetas');
    cuerpo.appendChild(cantidad);
  }

  // Muestra el paginador y el listado de la página actual.
  pintarResultados() {
    const total = this.estado.recetas.items.length;
    this.componentes.paginador.actualizar(total, this.estado.pagina);
    this.estado.pagina = this.componentes.paginador.obtenerPagina();
    this.componentes.listado.actualizar(this.estado.recetas.items, this.estado.pagina);
    this.elementos.resultados.hidden = false;
  }

  // Registra pestañas, lista, paginador, Reintentar y la cancelación de la vista.
  configurarEventos() {
    this.escuchar(this.elementos.pestanas, 'click', evento => {
      const boton = evento.target.closest('button[data-pestana]');
      if (boton) this.cambiarPestana(boton.dataset.pestana);
    });
    this.escuchar(this.elementos.pestanas, 'keydown', evento => this.alTeclear(evento));
    this.escuchar(this.elementos.lista, 'click', evento => {
      const boton = evento.target.closest('button[data-nombre]');
      if (boton) this.seleccionar(boton.dataset.nombre);
    });
    this.escuchar(this.elementos.paginador, 'cambiar-pagina', evento => this.cambiarPagina(evento.detail.pagina));
    this.escuchar(this.elementos.estadoLista, 'reintentar', () => this.cargarLista(null));
    this.escuchar(this.elementos.estadoRecetas, 'reintentar', () => {
      if (this.estado.seleccion !== null) this.seleccionar(this.estado.seleccion);
    });
    if (this.props.signal) this.escuchar(this.props.signal, 'abort', () => this.cancelar());
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion) {
    elemento.addEventListener(tipo, funcion);
    this.oyentes.push({ elemento, tipo, funcion });
  }

  // Mueve la pestaña activa con las flechas, Inicio y Fin.
  alTeclear(evento) {
    const total = VistaCategoriasOrigenes.pestanas.length;
    const actual = VistaCategoriasOrigenes.pestanas.findIndex(pestana => pestana.id === this.estado.pestana);
    let destino = -1;
    if (evento.key === 'ArrowRight') destino = (actual + 1) % total;
    else if (evento.key === 'ArrowLeft') destino = (actual - 1 + total) % total;
    else if (evento.key === 'Home') destino = 0;
    else if (evento.key === 'End') destino = total - 1;
    if (destino === -1) return;
    evento.preventDefault();
    this.cambiarPestana(VistaCategoriasOrigenes.pestanas[destino].id);
    this.elementos.botones[destino].focus();
  }

  // Devuelve el nombre de una categoría o de un origen según la pestaña activa.
  nombreDe(item) {
    return this.estado.pestana === 'categorias' ? item.strCategory : item.strArea;
  }

  // Cancela la selección en curso y la carga de la lista, descartando sus respuestas.
  cancelar() {
    this.tokenLista++;
    this.token++;
    if (this.controlador) this.controlador.abort();
    this.controlador = null;
  }

  // Prepara la señal de una selección nueva, ligada a la de la vista.
  nuevaSenal() {
    this.controlador = new AbortController();
    if (this.props.signal && this.props.signal.aborted) this.controlador.abort();
    return this.controlador.signal;
  }

  // Ordena alfabéticamente por nombre.
  ordenar(recetas) {
    return recetas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  // Cambia de pestaña, quita la selección y carga su lista.
  cambiarPestana(pestana) {
    if (pestana === this.estado.pestana) return;
    this.cancelar();
    this.estado.pestana = pestana;
    this.estado.seleccion = null;
    this.estado.recetas = { fase: 'inicial', items: [], error: null };
    this.estado.pagina = 1;
    this.renderPestanas();
    this.renderSeleccion();
    this.cargarLista(null);
  }

  // Carga la lista de la pestaña y, si se pide, elige una categoría u origen al terminar.
  async cargarLista(inicial) {
    const token = ++this.tokenLista;
    const categorias = this.estado.pestana === 'categorias';
    this.estado.lista = { fase: 'cargando', items: [], error: null };
    this.renderLista();
    try {
      const items = await (categorias ? CacheApi.obtenerCategorias() : CacheApi.obtenerOrigenes());
      if (this.destruido || token !== this.tokenLista) return;
      this.estado.lista = { fase: 'listo', items, error: null };
    } catch (error) {
      if (this.destruido || token !== this.tokenLista) return;
      this.estado.lista = { fase: 'error', items: [], error };
      this.renderLista();
      return;
    }
    this.renderLista();
    if (inicial && this.estado.lista.items.some(item => this.nombreDe(item) === inicial)) this.seleccionar(inicial);
  }

  // Pide las recetas de la selección, descartando la respuesta si llegó otra selección o se salió.
  async seleccionar(nombre, pagina = 1) {
    if (this.controlador) this.controlador.abort();
    const token = ++this.token;
    const signal = this.nuevaSenal();
    const categorias = this.estado.pestana === 'categorias';
    this.estado.seleccion = nombre;
    this.estado.recetas = { fase: 'cargando', items: [], error: null };
    this.estado.pagina = 1;
    this.marcarSeleccion();
    this.renderSeleccion();
    try {
      const crudas = await (categorias ? Api.filtrarPorCategoria(nombre, { signal }) : Api.filtrarPorOrigen(nombre, { signal }));
      if (this.destruido || token !== this.token) return;
      const items = this.ordenar(Recetas.normalizarLista(crudas));
      this.estado.recetas = { fase: 'listo', items, error: null };
      this.estado.pagina = pagina;
    } catch (error) {
      if (this.destruido || token !== this.token) return;
      this.estado.recetas = { fase: 'error', items: [], error };
    }
    this.renderSeleccion();
  }

  // Muestra otra página de las recetas que ya están cargadas.
  cambiarPagina(pagina) {
    if (this.estado.recetas.fase !== 'listo') return;
    this.estado.pagina = pagina;
    this.componentes.listado.mostrarPagina(pagina);
  }

  // Restaura pestaña, lista, selección y página sin repetir las peticiones ya hechas.
  restaurar(previo) {
    this.estado.pestana = previo.pestana === 'origenes' ? 'origenes' : 'categorias';
    this.renderPestanas();
    if (!Array.isArray(previo.lista)) {
      this.cargarLista(previo.seleccion || null);
      return;
    }
    this.estado.lista = { fase: 'listo', items: previo.lista.slice(), error: null };
    this.renderLista();
    if (!previo.seleccion) return;
    if (!Array.isArray(previo.recetas)) {
      this.seleccionar(previo.seleccion, previo.pagina || 1);
      return;
    }
    this.estado.seleccion = previo.seleccion;
    this.estado.recetas = { fase: 'listo', items: previo.recetas.slice(), error: null };
    this.estado.pagina = previo.pagina || 1;
    this.marcarSeleccion();
    this.renderSeleccion();
  }

  // Libera su estado, listeners y componentes, y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.cancelar();
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    Object.values(this.componentes).forEach(componente => componente.destruir());
    this.componentes = {};
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }

  // Devuelve pestaña, lista, selección, recetas y página para restaurar la vista.
  obtenerEstado() {
    const { pestana, lista, seleccion, recetas, pagina } = this.estado;
    return {
      pestana,
      lista: lista.fase === 'listo' ? lista.items.slice() : null,
      seleccion,
      recetas: seleccion !== null && recetas.fase === 'listo' ? recetas.items.slice() : null,
      pagina
    };
  }
}

// Pestañas de la vista, en orden.
VistaCategoriasOrigenes.pestanas = [
  { id: 'categorias', texto: 'Categorías' },
  { id: 'origenes', texto: 'Orígenes' }
];
