// Vista de detalle de una receta (#42)
//
// Muestra la receta completa (imagen, nombre, categoría, origen, etiquetas,
// video, ingredientes y pasos) y dos secciones de recetas relacionadas: hasta
// 6 de la misma categoría y hasta 6 del mismo origen. La receta principal sale
// de la caché (CacheApi.obtenerReceta); las dos consultas de relacionadas se
// hacen en paralelo con Promise.allSettled para que el fallo de una no impida
// mostrar la otra. Emite 'volver' (sin datos) y 'agregar-comparador { receta }'.
class VistaDetalle {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;              // { id, signal, paneles } (app.js añade signal y paneles)
    this.estado = {
      receta: null                   // receta completa normalizada
    };
    this.token = 0;                  // identifica la carga vigente
    this.raiz = null;
    this.elementos = {};
    this.componentes = {};
    this.oyentes = [];               // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Crea el elemento raíz, monta los componentes y carga o restaura la receta.
  crear() {
    const raiz = document.createElement('section');
    raiz.className = 'vista-detalle';
    raiz.setAttribute('aria-labelledby', 'detalle-nombre');

    // Barra de acciones: Volver siempre visible; Agregar aparece con la receta.
    const acciones = document.createElement('div');
    acciones.className = 'detalle-acciones';
    const volver = document.createElement('button');
    volver.type = 'button';
    volver.className = 'boton--texto';
    volver.dataset.accion = 'volver';
    volver.textContent = 'Volver';
    acciones.appendChild(volver);
    raiz.appendChild(acciones);

    // Estado de carga o error de la receta principal.
    const estado = document.createElement('div');
    estado.className = 'vista-detalle__estado';
    raiz.appendChild(estado);

    // Receta completa, oculta hasta que se obtenga.
    const receta = document.createElement('article');
    receta.className = 'detalle-receta';
    receta.hidden = true;
    const cabecera = document.createElement('div');
    cabecera.className = 'detalle-receta__cabecera';

    const imagen = document.createElement('img');
    imagen.className = 'detalle-receta__imagen';
    imagen.loading = 'eager';
    imagen.decoding = 'async';
    cabecera.appendChild(imagen);

    const resumen = document.createElement('div');
    resumen.className = 'detalle-receta__resumen';
    const nombre = document.createElement('h2');
    nombre.className = 'detalle-receta__nombre';
    nombre.id = 'detalle-nombre';
    const categoria = document.createElement('p');
    categoria.className = 'detalle-receta__meta';
    const origen = document.createElement('p');
    origen.className = 'detalle-receta__meta';
    const etiquetas = document.createElement('ul');
    etiquetas.className = 'detalle-receta__etiquetas';
    etiquetas.hidden = true;
    const video = document.createElement('a');
    video.className = 'detalle-receta__video';
    video.target = '_blank';
    video.rel = 'noopener noreferrer';
    video.textContent = 'Ver video de preparación';
    video.hidden = true;
    const comparar = document.createElement('button');
    comparar.type = 'button';
    comparar.className = 'boton--primario detalle-receta__comparar';
    comparar.dataset.accion = 'comparar';
    comparar.textContent = 'Agregar al comparador';
    resumen.append(nombre, categoria, origen, etiquetas, video, comparar);
    cabecera.appendChild(resumen);
    receta.appendChild(cabecera);

    // Ingredientes y pasos, cada uno en su sección.
    const ingredientesSeccion = document.createElement('section');
    ingredientesSeccion.className = 'detalle-receta__seccion';
    ingredientesSeccion.setAttribute('aria-labelledby', 'detalle-ingredientes-titulo');
    const tituloIngredientes = document.createElement('h3');
    tituloIngredientes.id = 'detalle-ingredientes-titulo';
    tituloIngredientes.textContent = 'Ingredientes';
    const lista = document.createElement('div');
    lista.className = 'detalle-receta__ingredientes';
    ingredientesSeccion.append(tituloIngredientes, lista);
    receta.appendChild(ingredientesSeccion);

    const pasosSeccion = document.createElement('section');
    pasosSeccion.className = 'detalle-receta__seccion';
    pasosSeccion.setAttribute('aria-labelledby', 'detalle-pasos-titulo');
    const tituloPasos = document.createElement('h3');
    tituloPasos.id = 'detalle-pasos-titulo';
    tituloPasos.textContent = 'Preparación';
    const pasos = document.createElement('div');
    pasos.className = 'detalle-receta__pasos';
    pasosSeccion.append(tituloPasos, pasos);
    receta.appendChild(pasosSeccion);

    raiz.appendChild(receta);

    // Recetas relacionadas: dos secciones independientes.
    const relacionadas = document.createElement('section');
    relacionadas.className = 'detalle-relacionadas';
    relacionadas.setAttribute('aria-labelledby', 'detalle-relacionadas-titulo');
    const tituloRelacionadas = document.createElement('h2');
    tituloRelacionadas.id = 'detalle-relacionadas-titulo';
    tituloRelacionadas.textContent = 'Recetas relacionadas';
    relacionadas.appendChild(tituloRelacionadas);

    const categoriaRel = this.crearSeccionRelacionada(relacionadas, 'categoria', 'De la misma categoría');
    const origenRel = this.crearSeccionRelacionada(relacionadas, 'origen', 'Del mismo origen');
    raiz.appendChild(relacionadas);

    this.raiz = raiz;
    this.elementos = {
      volver, estado, receta, imagen, nombre, categoria, origen,
      etiquetas, video, comparar,
      relacionCategoria: categoriaRel, relacionOrigen: origenRel
    };
    this.contenedor.appendChild(raiz);

    this.componentes.estado = new EstadoCarga(estado, { forma: 'detalle', contexto: 'detalle-receta' });
    this.componentes.ingredientes = new ListaIngredientes(lista, { respaldo: 'assets/ingrediente-fallback.svg' });
    this.componentes.pasos = new PasosPreparacion(pasos, {});
    this.componentes.estadoCategoria = new EstadoCarga(categoriaRel.estado, { forma: 'tarjetas', cantidad: 6, contexto: 'detalle-categoria' });
    this.componentes.estadoOrigen = new EstadoCarga(origenRel.estado, { forma: 'tarjetas', cantidad: 6, contexto: 'detalle-origen' });
    this.componentes.relacionCategoria = new ListadoRecetas(categoriaRel.listado, { recetas: [] });
    this.componentes.relacionOrigen = new ListadoRecetas(origenRel.listado, { recetas: [] });
    Object.values(this.componentes).forEach(componente => componente.crear());

    this.configurarEventos();

    const previa = this.props.estado && this.props.estado.receta ? this.props.estado.receta : null;
    if (previa) {
      this.estado.receta = previa;
      this.render();
      this.cargarRelacionadas(previa);
    } else {
      this.cargar();
    }
    return raiz;
  }

  // Crea el contenedor de una sección de relacionadas con su estado y listado.
  crearSeccionRelacionada(padre, tipo, titulo) {
    const seccion = document.createElement('section');
    seccion.className = 'detalle-relacionadas__seccion detalle-relacionadas__' + tipo;
    const id = 'detalle-relacionadas-' + tipo + '-titulo';
    seccion.setAttribute('aria-labelledby', id);
    const encabezado = document.createElement('h3');
    encabezado.id = id;
    encabezado.textContent = titulo;
    const estado = document.createElement('div');
    estado.className = 'detalle-relacionadas__estado';
    const listado = document.createElement('div');
    listado.className = 'detalle-relacionadas__listado';
    seccion.append(encabezado, estado, listado);
    padre.appendChild(seccion);
    return { estado, listado };
  }

  // Pinta la receta principal y sus partes.
  render() {
    if (!this.raiz) return;
    const e = this.elementos;
    const receta = this.estado.receta;
    e.receta.hidden = !receta;
    if (!receta) return;

    e.nombre.textContent = receta.nombre;
    e.categoria.textContent = 'Categoría: ' + (receta.categoria || 'sin dato');
    e.origen.textContent = 'Origen: ' + (receta.origen || 'sin dato');

    if (receta.imagen) {
      e.imagen.src = receta.imagen;
      e.imagen.alt = receta.nombre;
      e.imagen.hidden = false;
    } else {
      e.imagen.removeAttribute('src');
      e.imagen.alt = '';
      e.imagen.hidden = true;
    }

    this.pintarEtiquetas(receta.etiquetas);
    this.pintarVideo(receta.video);
    e.comparar.setAttribute('aria-label', 'Agregar ' + receta.nombre + ' al comparador');
    this.componentes.ingredientes.actualizar(receta.ingredientes);
    this.componentes.pasos.actualizar(receta.pasos);
  }

  // Pinta las etiquetas como chips; oculta la lista si no hay ninguna.
  pintarEtiquetas(etiquetas) {
    const lista = this.elementos.etiquetas;
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    const valores = Array.isArray(etiquetas) ? etiquetas : [];
    lista.hidden = valores.length === 0;
    valores.forEach(etiqueta => {
      const item = document.createElement('li');
      item.className = 'detalle-receta__etiqueta';
      item.textContent = etiqueta;
      lista.appendChild(item);
    });
  }

  // Muestra el enlace al video o lo oculta si la receta no lo tiene.
  pintarVideo(video) {
    const enlace = this.elementos.video;
    if (video) {
      enlace.href = video;
      enlace.hidden = false;
    } else {
      enlace.removeAttribute('href');
      enlace.hidden = true;
    }
  }

  // Registra Volver, Agregar al comparador, Reintentar y la cancelación.
  configurarEventos() {
    this.escuchar(this.raiz, 'click', evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton || !this.raiz.contains(boton)) return;
      const accion = boton.dataset.accion;
      if (accion === 'volver') this.emitir('volver');
      else if (accion === 'comparar' && this.estado.receta) this.emitir('agregar-comparador', { receta: this.estado.receta });
    });
    this.escuchar(this.raiz, 'reintentar', evento => {
      const contexto = evento.detail && evento.detail.contexto;
      if (contexto === 'detalle-receta') this.cargar();
      else if (contexto === 'detalle-categoria') this.cargarRelacionada('categoria');
      else if (contexto === 'detalle-origen') this.cargarRelacionada('origen');
    });
    if (this.props.signal) this.escuchar(this.props.signal, 'abort', () => this.cancelar());
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

  // Descarta la carga en curso incrementando el token.
  cancelar() {
    this.token++;
  }

  // Pide la receta principal de la caché y, al tenerla, sus relacionadas.
  async cargar() {
    this.cancelar();
    const token = this.token;
    this.estado.receta = null;
    this.elementos.receta.hidden = true;
    this.componentes.estado.cargando();

    let receta;
    try {
      const cruda = await CacheApi.obtenerReceta(this.props.id);
      if (this.destruido || token !== this.token) return;
      if (!cruda) {
        this.componentes.estado.vacio('sin-resultados', 'No encontramos esta receta.');
        return;
      }
      receta = Recetas.normalizar(cruda);
    } catch (error) {
      if (this.destruido || token !== this.token) return;
      this.componentes.estado.fallo(error);
      return;
    }

    this.estado.receta = receta;
    this.componentes.estado.ocultar();
    this.render();
    this.cargarRelacionadas(receta);
  }

  // Pide en paralelo las relacionadas de categoría y de origen, tolerando fallos.
  async cargarRelacionadas(receta) {
    const token = this.token;
    this.componentes.estadoCategoria.cargando();
    this.componentes.estadoOrigen.cargando();
    this.componentes.relacionCategoria.actualizar([]);
    this.componentes.relacionOrigen.actualizar([]);

    const pedirCategoria = receta.categoria
      ? Api.filtrarPorCategoria(receta.categoria, { signal: this.props.signal })
      : Promise.resolve(null);
    const pedirOrigen = receta.origen
      ? Api.filtrarPorOrigen(receta.origen, { signal: this.props.signal })
      : Promise.resolve(null);

    const [resultadoCategoria, resultadoOrigen] = await Promise.allSettled([pedirCategoria, pedirOrigen]);
    if (this.destruido || token !== this.token) return;
    this.resolverRelacion('categoria', resultadoCategoria);
    this.resolverRelacion('origen', resultadoOrigen);
  }

  // Vuelve a pedir una sola sección de relacionadas (Reintentar).
  async cargarRelacionada(tipo) {
    const receta = this.estado.receta;
    if (!receta) return;
    const token = this.token;
    const esCategoria = tipo === 'categoria';
    const estado = esCategoria ? this.componentes.estadoCategoria : this.componentes.estadoOrigen;
    const listado = esCategoria ? this.componentes.relacionCategoria : this.componentes.relacionOrigen;
    estado.cargando();
    listado.actualizar([]);

    const valor = esCategoria ? receta.categoria : receta.origen;
    let resultado;
    if (!valor) {
      resultado = { status: 'fulfilled', value: null };
    } else {
      try {
        const crudas = esCategoria
          ? await Api.filtrarPorCategoria(valor, { signal: this.props.signal })
          : await Api.filtrarPorOrigen(valor, { signal: this.props.signal });
        resultado = { status: 'fulfilled', value: crudas };
      } catch (error) {
        resultado = { status: 'rejected', reason: error };
      }
    }
    if (this.destruido || token !== this.token) return;
    this.resolverRelacion(tipo, resultado);
  }

  // Muestra una sección de relacionadas: su listado, su vacío o su error.
  resolverRelacion(tipo, resultado) {
    const esCategoria = tipo === 'categoria';
    const estado = esCategoria ? this.componentes.estadoCategoria : this.componentes.estadoOrigen;
    const listado = esCategoria ? this.componentes.relacionCategoria : this.componentes.relacionOrigen;

    if (resultado.status === 'rejected') {
      estado.fallo(resultado.reason);
      listado.actualizar([]);
      return;
    }

    if (resultado.value === null) {
      estado.vacio('sin-resultados', esCategoria
        ? 'Esta receta no tiene categoría.'
        : 'Esta receta no tiene origen.');
      listado.actualizar([]);
      return;
    }

    const resumenes = Recetas.normalizarLista(resultado.value)
      .filter(receta => receta.id !== this.estado.receta.id)
      .slice(0, VistaDetalle.relacionadasMaximas);

    if (resumenes.length === 0) {
      estado.vacio('sin-resultados', esCategoria
        ? 'No hay otras recetas de esta categoría.'
        : 'No hay otras recetas de este origen.');
      listado.actualizar([]);
    } else {
      estado.ocultar();
      listado.actualizar(resumenes);
    }
  }

  // Libera sus listeners y componentes, y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.token++;
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    Object.values(this.componentes).forEach(componente => componente.destruir());
    this.componentes = {};
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }

  // Devuelve la receta mostrada para restaurar el detalle al volver.
  obtenerEstado() {
    return { receta: this.estado.receta };
  }
}

// Máximo de recetas por sección de relacionadas.
VistaDetalle.relacionadasMaximas = 6;
