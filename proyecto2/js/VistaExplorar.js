// Vista de exploración y búsqueda de recetas (#40)
class VistaExplorar {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      fase: 'inicial',      // 'inicial', 'cargando', 'error' o 'listo'
      criterios: null,      // criterios aplicados de la búsqueda lista
      resultados: [],       // recetas normalizadas, ordenadas por nombre
      pagina: 1,
      error: null
    };
    this.pendientes = null;      // criterios de la última búsqueda, para Reintentar
    this.token = 0;              // identifica la búsqueda vigente
    this.controlador = null;     // AbortController de la búsqueda vigente
    this.raiz = null;
    this.elementos = {};
    this.componentes = {};
    this.oyentes = [];           // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Crea el elemento raíz, monta los componentes y restaura el estado si hay uno.
  crear() {
    const raiz = document.createElement('section');
    raiz.className = 'vista-explorar';
    raiz.setAttribute('aria-labelledby', 'explorar-titulo');

    const titulo = document.createElement('h2');
    titulo.id = 'explorar-titulo';
    titulo.textContent = 'Explorar recetas';
    raiz.appendChild(titulo);

    const formulario = this.crearBloque(raiz, 'vista-explorar__formulario');
    const estado = this.crearBloque(raiz, 'vista-explorar__estado');
    const resultados = this.crearBloque(raiz, 'vista-explorar__resultados');
    resultados.hidden = true;

    const total = document.createElement('p');
    total.className = 'vista-explorar__total';
    total.setAttribute('aria-live', 'polite');
    resultados.appendChild(total);
    const listado = this.crearBloque(resultados, 'vista-explorar__listado');
    const paginador = this.crearBloque(resultados, 'vista-explorar__paginador');

    this.raiz = raiz;
    this.elementos = { formulario, estado, resultados, total, listado, paginador };
    this.contenedor.appendChild(raiz);

    const previo = this.props.estado;
    const restaurable = previo && Array.isArray(previo.resultados);
    this.componentes.formulario = new FormularioBusqueda(formulario, { criterios: previo && previo.criterios });
    this.componentes.estado = new EstadoCarga(estado, { forma: 'tarjetas', contexto: 'explorar' });
    this.componentes.listado = new ListadoRecetas(listado, { recetas: [] });
    this.componentes.paginador = new Paginador(paginador, { totalElementos: 0 });
    Object.values(this.componentes).forEach(componente => componente.crear());

    this.configurarEventos();
    if (restaurable) this.restaurar(previo);
    else this.render();
    return raiz;
  }

  // Crea un contenedor de bloque dentro de la raíz.
  crearBloque(padre, clase) {
    const bloque = document.createElement('div');
    bloque.className = clase;
    padre.appendChild(bloque);
    return bloque;
  }

  // Pinta la fase actual: sin criterios, cargando, error, vacío o resultados.
  render() {
    if (!this.raiz) return;
    const { fase, resultados, pagina, error } = this.estado;
    const estado = this.componentes.estado;
    this.elementos.resultados.hidden = true;
    if (fase === 'cargando') {
      estado.cargando('tarjetas');
    } else if (fase === 'error') {
      estado.fallo(error);
    } else if (fase === 'inicial') {
      estado.vacio('sin-criterios');
    } else if (resultados.length === 0) {
      estado.vacio('sin-resultados');
    } else {
      estado.ocultar();
      this.pintarResultados(resultados, pagina);
    }
  }

  // Muestra el total, el paginador y el listado de la página indicada.
  pintarResultados(resultados, pagina) {
    const total = resultados.length;
    this.elementos.total.textContent = total + (total === 1 ? ' receta encontrada' : ' recetas encontradas');
    this.componentes.paginador.actualizar(total, pagina);
    this.estado.pagina = this.componentes.paginador.obtenerPagina();
    this.componentes.listado.actualizar(resultados, this.estado.pagina);
    this.elementos.resultados.hidden = false;
  }

  // Registra el formulario, el paginador, Reintentar y la cancelación de la vista.
  configurarEventos() {
    this.escuchar(this.elementos.formulario, 'buscar', evento => this.buscar(evento.detail.criterios));
    this.escuchar(this.elementos.formulario, 'limpiar', () => this.limpiar());
    this.escuchar(this.elementos.paginador, 'cambiar-pagina', evento => this.cambiarPagina(evento.detail.pagina));
    this.escuchar(this.elementos.estado, 'reintentar', () => {
      if (this.pendientes) this.buscar(this.pendientes);
    });
    if (this.props.signal) this.escuchar(this.props.signal, 'abort', () => this.cancelar());
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion) {
    elemento.addEventListener(tipo, funcion);
    this.oyentes.push({ elemento, tipo, funcion });
  }

  // Cancela la búsqueda en curso y descarta su respuesta.
  cancelar() {
    this.token++;
    if (this.controlador) this.controlador.abort();
    this.controlador = null;
  }

  // Prepara la señal de una búsqueda nueva, ligada a la de la vista.
  nuevaSenal() {
    this.controlador = new AbortController();
    if (this.props.signal && this.props.signal.aborted) this.controlador.abort();
    return this.controlador.signal;
  }

  // Pide la lista de cada criterio aplicado, todas en paralelo.
  pedirCriterios(criterios, signal) {
    const opciones = { signal };
    const peticiones = [];
    if (criterios.nombre) peticiones.push(CacheApi.buscarRecetas(criterios.nombre, opciones));
    if (criterios.categoria) peticiones.push(Api.filtrarPorCategoria(criterios.categoria, opciones));
    if (criterios.origen) peticiones.push(Api.filtrarPorOrigen(criterios.origen, opciones));
    if (criterios.ingrediente) peticiones.push(Api.filtrarPorIngrediente(criterios.ingrediente, opciones));
    return Promise.all(peticiones);
  }

  // Deja solo las recetas presentes en todas las listas, con el dato más completo de cada una.
  intersectar(listas) {
    const porId = new Map();
    listas.forEach(lista => lista.forEach(receta => {
      const id = String(receta.idMeal);
      const actual = porId.get(id);
      if (!actual || (!actual.strInstructions && receta.strInstructions)) porId.set(id, receta);
    }));
    const conjuntos = listas.map(lista => new Set(lista.map(receta => String(receta.idMeal))));
    const comunes = [...porId.keys()].filter(id => conjuntos.every(conjunto => conjunto.has(id)));
    return comunes.map(id => Recetas.normalizar(porId.get(id)));
  }

  // Ordena alfabéticamente por nombre.
  ordenar(recetas) {
    return recetas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  }

  // Busca con los criterios, descartando la respuesta si llegó otra búsqueda o se salió de la vista.
  async buscar(criterios) {
    this.cancelar();
    const token = this.token;
    const signal = this.nuevaSenal();
    this.pendientes = criterios;
    this.estado = { fase: 'cargando', criterios: null, resultados: [], pagina: 1, error: null };
    this.render();
    try {
      const listas = await this.pedirCriterios(criterios, signal);
      if (this.destruido || token !== this.token) return;
      const resultados = this.ordenar(this.intersectar(listas));
      this.estado = { fase: 'listo', criterios, resultados, pagina: 1, error: null };
    } catch (error) {
      if (this.destruido || token !== this.token) return;
      this.estado = { fase: 'error', criterios: null, resultados: [], pagina: 1, error };
    }
    this.render();
  }

  // Muestra otra página de los resultados que ya están cargados.
  cambiarPagina(pagina) {
    if (this.estado.fase !== 'listo') return;
    this.estado.pagina = pagina;
    this.componentes.listado.mostrarPagina(pagina);
  }

  // Borra los criterios y los resultados, y descarta la búsqueda en curso.
  limpiar() {
    this.cancelar();
    this.pendientes = null;
    this.estado = { fase: 'inicial', criterios: null, resultados: [], pagina: 1, error: null };
    this.render();
  }

  // Restaura criterios, resultados y página sin repetir las peticiones de búsqueda.
  restaurar(previo) {
    this.componentes.formulario.restaurar(previo.criterios);
    this.pendientes = previo.criterios || null;
    this.estado = {
      fase: 'listo',
      criterios: previo.criterios || null,
      resultados: previo.resultados.slice(),
      pagina: previo.pagina || 1,
      error: null
    };
    this.render();
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

  // Devuelve criterios, resultados y página para restaurar la vista.
  obtenerEstado() {
    const lista = this.estado.fase === 'listo';
    return {
      criterios: lista ? Object.assign({}, this.estado.criterios) : null,
      resultados: lista ? this.estado.resultados.slice() : null,
      pagina: this.estado.pagina
    };
  }
}
