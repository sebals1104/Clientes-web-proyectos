// Vista de inicio con receta destacada y categorías (#39)
class VistaInicio {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      receta: null,         // receta destacada normalizada
      categorias: null      // categorías tal como las devuelve la API
    };
    this.tokenReceta = 0;        // identifica la petición vigente de la receta
    this.raiz = null;
    this.elementos = {};
    this.componentes = {};
    this.oyentes = [];           // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Crea el elemento raíz con sus dos secciones y carga los datos o restaura el estado.
  crear() {
    const raiz = document.createElement('section');
    raiz.className = 'vista-inicio';

    const destacada = document.createElement('section');
    destacada.className = 'inicio-destacada';
    destacada.setAttribute('aria-labelledby', 'inicio-destacada-titulo');
    const tituloDestacada = document.createElement('h2');
    tituloDestacada.id = 'inicio-destacada-titulo';
    tituloDestacada.textContent = 'Receta destacada';
    const estadoReceta = document.createElement('div');
    const receta = this.crearReceta();
    destacada.append(tituloDestacada, estadoReceta, receta.raiz);

    const categorias = document.createElement('section');
    categorias.className = 'inicio-categorias';
    categorias.setAttribute('aria-labelledby', 'inicio-categorias-titulo');
    const tituloCategorias = document.createElement('h2');
    tituloCategorias.id = 'inicio-categorias-titulo';
    tituloCategorias.textContent = 'Categorías';
    const estadoCategorias = document.createElement('div');
    const cuadricula = document.createElement('div');
    cuadricula.className = 'inicio-categorias__cuadricula';
    categorias.append(tituloCategorias, estadoCategorias, cuadricula);

    raiz.append(destacada, categorias);
    this.raiz = raiz;
    this.elementos = Object.assign({ estadoReceta, estadoCategorias, cuadricula }, receta.elementos);
    this.contenedor.appendChild(raiz);

    this.componentes.estadoReceta = new EstadoCarga(estadoReceta, { forma: 'detalle', contexto: 'inicio-receta' });
    this.componentes.estadoCategorias = new EstadoCarga(estadoCategorias, { forma: 'tarjetas', cantidad: 6, contexto: 'inicio-categorias' });
    Object.values(this.componentes).forEach(componente => componente.crear());

    this.configurarEventos();
    const previo = this.props.estado;
    if (previo && previo.receta && previo.categorias) {
      this.estado = { receta: previo.receta, categorias: previo.categorias };
      this.render();
    } else {
      this.cargar();
    }
    return raiz;
  }

  // Crea la tarjeta de la receta destacada, oculta hasta tener datos.
  crearReceta() {
    const raiz = document.createElement('article');
    raiz.className = 'tarjeta inicio-destacada__tarjeta';
    raiz.hidden = true;

    const imagen = document.createElement('img');
    imagen.className = 'tarjeta__media inicio-destacada__imagen';
    raiz.appendChild(imagen);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'tarjeta__cuerpo';
    const nombre = document.createElement('h3');
    nombre.className = 'tarjeta__titulo';
    const categoria = document.createElement('p');
    categoria.className = 'tarjeta__meta';
    const origen = document.createElement('p');
    origen.className = 'tarjeta__meta';
    const aviso = document.createElement('p');
    aviso.className = 'inicio-destacada__aviso';
    aviso.setAttribute('role', 'status');
    aviso.hidden = true;

    const acciones = document.createElement('div');
    acciones.className = 'inicio-destacada__acciones';
    const detalle = this.crearBoton('detalle', 'Ver detalle', 'boton--primario');
    const otra = this.crearBoton('otra', 'Otra receta', 'boton--secundario');
    acciones.append(detalle, otra);

    cuerpo.append(nombre, categoria, origen, aviso, acciones);
    raiz.appendChild(cuerpo);
    return { raiz, elementos: { receta: raiz, imagen, nombre, categoria, origen, aviso, detalle, otra } };
  }

  // Crea un botón de acción identificado por data-accion.
  crearBoton(accion, texto, clase) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = clase;
    boton.dataset.accion = accion;
    boton.textContent = texto;
    return boton;
  }

  // Pinta la receta y las categorías que ya están en el estado.
  render() {
    if (!this.raiz) return;
    this.componentes.estadoReceta.ocultar();
    this.componentes.estadoCategorias.ocultar();
    this.pintarReceta(this.estado.receta);
    this.pintarCategorias(this.estado.categorias);
  }

  // Muestra la receta destacada con su imagen, nombre, categoría y origen.
  pintarReceta(receta) {
    const e = this.elementos;
    e.receta.hidden = !receta;
    e.aviso.hidden = true;
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
    e.detalle.setAttribute('aria-label', 'Ver detalle de ' + receta.nombre);
  }

  // Reemplaza la cuadrícula por una tarjeta por cada categoría.
  pintarCategorias(categorias) {
    const cuadricula = this.elementos.cuadricula;
    while (cuadricula.firstChild) cuadricula.removeChild(cuadricula.firstChild);
    (categorias || []).forEach(categoria => cuadricula.appendChild(this.crearCategoria(categoria)));
  }

  // Crea la tarjeta de una categoría con imagen, nombre, descripción recortada y botón.
  crearCategoria(categoria) {
    const nombre = String(categoria.strCategory || '');
    const raiz = document.createElement('article');
    raiz.className = 'tarjeta tarjeta-categoria';

    if (categoria.strCategoryThumb) {
      const imagen = document.createElement('img');
      imagen.className = 'tarjeta__media';
      imagen.loading = 'lazy';
      imagen.decoding = 'async';
      imagen.src = categoria.strCategoryThumb;
      imagen.alt = nombre;
      raiz.appendChild(imagen);
    }

    const cuerpo = document.createElement('div');
    cuerpo.className = 'tarjeta__cuerpo';
    const titulo = document.createElement('h3');
    titulo.className = 'tarjeta__titulo';
    titulo.textContent = nombre;
    const descripcion = document.createElement('p');
    descripcion.className = 'tarjeta__meta';
    descripcion.textContent = VistaInicio.resumir(categoria.strCategoryDescription);
    const boton = this.crearBoton('categoria', 'Ver categoría', 'boton--secundario');
    boton.dataset.categoria = nombre;
    boton.setAttribute('aria-label', 'Ver la categoría ' + nombre);
    cuerpo.append(titulo, descripcion, boton);
    raiz.appendChild(cuerpo);
    return raiz;
  }

  // Devuelve los primeros 120 caracteres del texto, con puntos suspensivos si se recortó.
  static resumir(texto) {
    const completo = String(texto || '');
    if (completo.length <= VistaInicio.largoDescripcion) return completo;
    return completo.slice(0, VistaInicio.largoDescripcion) + '…';
  }

  // Registra los botones de la vista y Reintentar de cada sección.
  configurarEventos() {
    this.escuchar(this.raiz, 'click', evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton || !this.raiz.contains(boton)) return;
      const accion = boton.dataset.accion;
      if (accion === 'detalle' && this.estado.receta) this.emitir('abrir-detalle', { id: this.estado.receta.id });
      else if (accion === 'otra') this.cargarReceta();
      else if (accion === 'categoria') this.emitir('navegar', { vista: 'categorias-origenes', props: { categoria: boton.dataset.categoria } });
    });
    this.escuchar(this.raiz, 'reintentar', evento => {
      const contexto = evento.detail && evento.detail.contexto;
      if (contexto === 'inicio-receta') this.cargarReceta();
      else if (contexto === 'inicio-categorias') this.cargarCategorias();
    });
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion) {
    elemento.addEventListener(tipo, funcion);
    this.oyentes.push({ elemento, tipo, funcion });
  }

  // Emite un CustomEvent que burbuja con los datos en detail.
  emitir(tipo, detalle) {
    this.raiz.dispatchEvent(new CustomEvent(tipo, { bubbles: true, detail: detalle }));
  }

  // Pide una receta al azar distinta de la mostrada, con un máximo de intentos.
  async pedirReceta() {
    const anterior = this.estado.receta ? this.estado.receta.id : null;
    for (let intento = 0; intento < VistaInicio.intentosMaximos; intento++) {
      const cruda = await CacheApi.obtenerRecetaAleatoria({ signal: this.props.signal });
      if (!cruda) throw new ErrorApi('datos', 'La respuesta del servicio no es válida.');
      const receta = Recetas.normalizar(cruda);
      if (receta.id !== anterior) return receta;
    }
    return null;
  }

  // Pide la receta y las categorías en paralelo, tolerando que una de las dos falle.
  async cargar() {
    const token = ++this.tokenReceta;
    this.componentes.estadoReceta.cargando();
    this.componentes.estadoCategorias.cargando();
    const [receta, categorias] = await Promise.allSettled([this.pedirReceta(), CacheApi.obtenerCategorias()]);
    if (this.destruido) return;
    if (token === this.tokenReceta) this.resolverReceta(receta);
    this.resolverCategorias(categorias);
  }

  // Muestra la receta recibida o el error de su sección.
  resolverReceta(resultado) {
    if (resultado.status === 'rejected') {
      this.elementos.receta.hidden = true;
      this.componentes.estadoReceta.fallo(resultado.reason);
      return;
    }
    this.componentes.estadoReceta.ocultar();
    if (resultado.value) {
      this.estado.receta = resultado.value;
      this.pintarReceta(resultado.value);
    } else {
      this.pintarReceta(this.estado.receta);
      this.elementos.aviso.textContent = 'No encontramos otra receta distinta. Inténtalo de nuevo.';
      this.elementos.aviso.hidden = false;
    }
  }

  // Muestra las categorías recibidas o el error de su sección.
  resolverCategorias(resultado) {
    if (resultado.status === 'rejected') {
      this.pintarCategorias(null);
      this.componentes.estadoCategorias.fallo(resultado.reason);
      return;
    }
    this.componentes.estadoCategorias.ocultar();
    this.estado.categorias = resultado.value;
    this.pintarCategorias(resultado.value);
  }

  // Pide otra receta (o repite la que falló) sin tocar las categorías.
  async cargarReceta() {
    const token = ++this.tokenReceta;
    this.elementos.receta.hidden = true;
    this.componentes.estadoReceta.cargando();
    const [resultado] = await Promise.allSettled([this.pedirReceta()]);
    if (this.destruido || token !== this.tokenReceta) return;
    this.resolverReceta(resultado);
  }

  // Vuelve a pedir las categorías sin tocar la receta.
  async cargarCategorias() {
    this.pintarCategorias(null);
    this.componentes.estadoCategorias.cargando();
    const [resultado] = await Promise.allSettled([CacheApi.obtenerCategorias()]);
    if (this.destruido) return;
    this.resolverCategorias(resultado);
  }

  // Libera sus listeners y componentes, y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.tokenReceta++;
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    Object.values(this.componentes).forEach(componente => componente.destruir());
    this.componentes = {};
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }

  // Devuelve la receta y las categorías mostradas para restaurar la vista.
  obtenerEstado() {
    return { receta: this.estado.receta, categorias: this.estado.categorias };
  }
}

// Largo máximo de la descripción de una categoría y máximo de intentos para no repetir receta.
VistaInicio.largoDescripcion = 120;
VistaInicio.intentosMaximos = 5;
