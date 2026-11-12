// Listado paginado de tarjetas de receta (#40)
class ListadoRecetas {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      recetas: Array.isArray(props.recetas) ? props.recetas : [],
      pagina: props.pagina || 1,
      version: 0            // cambia con cada página pintada para ignorar respuestas viejas
    };
    this.raiz = null;
    this.tarjetas = new Map();   // id -> TarjetaReceta de la página visible
    this.oyentes = [];           // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Cantidad de páginas según el total de recetas.
  totalPaginas() {
    return Math.max(Math.ceil(this.estado.recetas.length / Paginador.porPagina), 1);
  }

  // Deja la página dentro del rango válido (mínimo 1).
  limitar(pagina) {
    const numero = Math.floor(Number(pagina)) || 1;
    return Math.min(Math.max(numero, 1), this.totalPaginas());
  }

  // Crea el elemento raíz y lo agrega al contenedor.
  crear() {
    this.raiz = document.createElement('div');
    this.raiz.className = 'listado-recetas';
    this.contenedor.appendChild(this.raiz);
    this.estado.pagina = this.limitar(this.estado.pagina);
    this.configurarEventos();
    this.render();
    return this.raiz;
  }

  // Pinta las tarjetas de la página actual y resuelve su detalle.
  render() {
    if (!this.raiz) return;
    this.estado.version++;
    this.vaciar();
    const desde = (this.estado.pagina - 1) * Paginador.porPagina;
    const pagina = this.estado.recetas.slice(desde, desde + Paginador.porPagina);
    pagina.forEach(receta => {
      const tarjeta = new TarjetaReceta(this.raiz, { receta });
      tarjeta.crear();
      this.tarjetas.set(receta.id, tarjeta);
    });
    this.resolverPagina(pagina.map(receta => receta.id), this.estado.version);
  }

  // Destruye las tarjetas de la página anterior.
  vaciar() {
    this.tarjetas.forEach(tarjeta => tarjeta.destruir());
    this.tarjetas.clear();
  }

  // Registra el reintento individual de una tarjeta.
  configurarEventos() {
    const alReintentar = evento => {
      const id = evento.detail && evento.detail.id;
      if (id !== undefined) this.reintentar(String(id));
    };
    this.raiz.addEventListener('reintentar-tarjeta', alReintentar);
    this.oyentes.push({ elemento: this.raiz, tipo: 'reintentar-tarjeta', funcion: alReintentar });
  }

  // Resuelve en paralelo el detalle de la página visible; cada fallo deja su tarjeta incompleta.
  async resolverPagina(ids, version) {
    const resultados = await Promise.allSettled(ids.map(id => CacheApi.obtenerReceta(id)));
    if (!this.esVigente(version)) return;
    resultados.forEach((resultado, indice) => {
      const valor = resultado.status === 'fulfilled' ? Recetas.normalizar(resultado.value) : null;
      this.aplicarDetalle(ids[indice], valor);
    });
  }

  // Resuelve de nuevo el detalle de una sola tarjeta.
  async reintentar(id) {
    const version = this.estado.version;
    let receta = null;
    try {
      receta = Recetas.normalizar(await CacheApi.obtenerReceta(id));
    } catch (error) {
      receta = null;
    }
    if (!this.esVigente(version)) return;
    this.aplicarDetalle(id, receta);
  }

  // Actualiza la tarjeta con el detalle, o la marca incompleta si no se obtuvo.
  aplicarDetalle(id, receta) {
    const tarjeta = this.tarjetas.get(id);
    if (!tarjeta) return;
    if (receta) tarjeta.actualizar(receta);
    else tarjeta.marcarIncompleta();
  }

  // Indica si la respuesta pertenece a la página que sigue visible.
  esVigente(version) {
    return !this.destruido && this.raiz !== null && version === this.estado.version;
  }

  // Reemplaza las recetas y muestra la página indicada.
  actualizar(recetas, pagina = 1) {
    this.estado.recetas = Array.isArray(recetas) ? recetas : [];
    this.estado.pagina = this.limitar(pagina);
    this.render();
  }

  // Muestra otra página de las mismas recetas.
  mostrarPagina(pagina) {
    this.estado.pagina = this.limitar(pagina);
    this.render();
  }

  // Devuelve la página que se está mostrando.
  obtenerPagina() {
    return this.estado.pagina;
  }

  // Libera sus listeners y tarjetas, y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.estado.version++;
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    this.vaciar();
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
  }
}
