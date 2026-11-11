// Panel de selección de una receta del comparador (#37)
//
// Cada instancia es un panel A o B. Busca recetas por nombre con un retardo
// de 400 ms, cancela la petición anterior y permite elegir una receta o
// vaciar el panel. Emite dos CustomEvent que burbujean:
//   receta-elegida { panel, receta }
//   vaciar-panel   { panel }
// La receta que ya ocupa el otro panel se muestra deshabilitada y, si se
// intenta elegir, se informa en pantalla sin emitir el evento.
class PanelComparador {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;             // { panel, receta, otra }
    this.panel = props.panel === 'B' ? 'B' : 'A';
    this.estado = {
      receta: props.receta || null,
      otra: props.otra || null,
      resultados: [],               // recetas normalizadas de la búsqueda
      activa: -1,                   // índice resaltado en el listbox
      abierta: false,               // visibilidad del listbox
      buscando: false,
      mensaje: null,                // { texto, tipo: 'info' | 'error' }
      consulta: ''
    };
    this.id = 'panel-comparador-' + (++PanelComparador.contador);
    this.raiz = null;
    this.elementos = {};
    this.oyentes = [];              // { elemento, tipo, funcion, captura }
    this.temporizador = null;
    this.controlador = null;
    this.destruido = false;
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    const raiz = document.createElement('article');
    raiz.className = 'panel-comparador';
    raiz.dataset.panel = this.panel;
    raiz.setAttribute('aria-label', 'Panel ' + this.panel + ' del comparador');

    const cabecera = document.createElement('header');
    cabecera.className = 'panel-comparador__cabecera';
    const titulo = document.createElement('h2');
    titulo.className = 'panel-comparador__titulo';
    titulo.textContent = 'Panel ' + this.panel;
    const vaciar = document.createElement('button');
    vaciar.type = 'button';
    vaciar.className = 'boton--texto panel-comparador__vaciar';
    vaciar.dataset.accion = 'vaciar';
    vaciar.textContent = 'Vaciar';
    cabecera.appendChild(titulo);
    cabecera.appendChild(vaciar);
    raiz.appendChild(cabecera);

    const buscador = document.createElement('div');
    buscador.className = 'campo panel-comparador__buscador';
    const rotulo = document.createElement('label');
    rotulo.htmlFor = this.id + '-busqueda';
    rotulo.textContent = 'Buscar receta para el panel ' + this.panel;

    const combo = document.createElement('div');
    combo.className = 'panel-comparador__combo';
    const entrada = document.createElement('input');
    entrada.type = 'text';
    entrada.id = this.id + '-busqueda';
    entrada.autocomplete = 'off';
    entrada.placeholder = 'Nombre de la receta';
    entrada.setAttribute('role', 'combobox');
    entrada.setAttribute('aria-autocomplete', 'list');
    entrada.setAttribute('aria-expanded', 'false');
    entrada.setAttribute('aria-controls', this.id + '-resultados');
    combo.appendChild(entrada);

    const lista = document.createElement('ul');
    lista.className = 'panel-comparador__resultados';
    lista.id = this.id + '-resultados';
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', 'Recetas encontradas para el panel ' + this.panel);
    lista.hidden = true;
    combo.appendChild(lista);

    const mensaje = document.createElement('p');
    mensaje.className = 'panel-comparador__estado';
    mensaje.setAttribute('role', 'status');
    mensaje.setAttribute('aria-live', 'polite');

    buscador.appendChild(rotulo);
    buscador.appendChild(combo);
    buscador.appendChild(mensaje);
    raiz.appendChild(buscador);

    const receta = document.createElement('div');
    receta.className = 'panel-comparador__receta';
    receta.hidden = true;

    const media = document.createElement('div');
    media.className = 'panel-comparador__media';
    const imagen = document.createElement('img');
    imagen.className = 'panel-comparador__imagen';
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    const sinImagen = document.createElement('span');
    sinImagen.className = 'panel-comparador__sin-imagen';
    sinImagen.textContent = 'Sin imagen';
    sinImagen.hidden = true;
    media.appendChild(imagen);
    media.appendChild(sinImagen);

    const datos = document.createElement('div');
    datos.className = 'panel-comparador__datos';
    const nombre = document.createElement('h3');
    nombre.className = 'panel-comparador__nombre';
    const categoria = document.createElement('p');
    categoria.className = 'panel-comparador__dato';
    const origen = document.createElement('p');
    origen.className = 'panel-comparador__dato';
    datos.appendChild(nombre);
    datos.appendChild(categoria);
    datos.appendChild(origen);

    receta.appendChild(media);
    receta.appendChild(datos);
    raiz.appendChild(receta);

    const vacio = document.createElement('p');
    vacio.className = 'panel-comparador__vacio';
    vacio.textContent = 'Busca una receta por nombre y elígela de la lista.';
    raiz.appendChild(vacio);

    this.raiz = raiz;
    this.elementos = { vaciar, entrada, lista, mensaje, receta, imagen, sinImagen, nombre, categoria, origen, vacio };
    this.contenedor.appendChild(raiz);
    this.configurarEventos();
    this.render();
    return raiz;
  }

  // Pinta la receta elegida, el estado del buscador y los resultados.
  render() {
    if (!this.raiz) return;
    const { receta } = this.estado;
    const e = this.elementos;

    this.raiz.dataset.ocupado = receta ? 'true' : 'false';
    e.receta.hidden = !receta;
    e.vacio.hidden = Boolean(receta);
    e.vaciar.hidden = !receta;

    if (receta) {
      e.nombre.textContent = receta.nombre;
      e.categoria.textContent = 'Categoría: ' + (receta.categoria || 'sin dato');
      e.origen.textContent = 'Origen: ' + (receta.origen || 'sin dato');
      e.vaciar.setAttribute('aria-label', 'Vaciar el panel ' + this.panel + ' y quitar ' + receta.nombre);
      this.renderImagen(receta);
    } else {
      e.imagen.removeAttribute('src');
      e.imagen.alt = '';
      e.imagen.hidden = true;
      e.sinImagen.hidden = true;
      e.nombre.textContent = '';
      e.categoria.textContent = '';
      e.origen.textContent = '';
      e.vaciar.removeAttribute('aria-label');
    }

    this.renderEstado();
    this.renderResultados();
  }

  // Pinta la imagen de la receta elegida o su texto alternativo si falla.
  renderImagen(receta) {
    const e = this.elementos;
    if (receta.imagen && e.imagen.dataset.fallida !== receta.imagen) {
      e.imagen.hidden = false;
      if (e.imagen.getAttribute('src') !== receta.imagen) e.imagen.src = receta.imagen;
      e.imagen.alt = receta.nombre;
      e.sinImagen.hidden = true;
    } else {
      e.imagen.hidden = true;
      e.imagen.alt = '';
      e.sinImagen.hidden = false;
    }
  }

  // Pinta el mensaje del buscador: aviso, búsqueda en curso o resultado.
  renderEstado() {
    const { mensaje, buscando, consulta, resultados, abierta, receta } = this.estado;
    let texto = '';
    let error = false;

    if (mensaje) {
      texto = mensaje.texto;
      error = mensaje.tipo === 'error';
    } else if (buscando) {
      texto = 'Buscando recetas…';
    } else if (consulta.trim().length === 1) {
      texto = 'Escribe al menos ' + PanelComparador.minimoTexto + ' caracteres.';
    } else if (abierta && resultados.length > 0) {
      texto = resultados.length === 1 ? '1 receta encontrada.' : resultados.length + ' recetas encontradas.';
    } else if (receta && consulta === '') {
      texto = '«' + receta.nombre + '» está en el panel ' + this.panel + '.';
    }

    this.elementos.mensaje.textContent = texto;
    this.elementos.mensaje.classList.toggle('panel-comparador__estado--error', error);
  }

  // Pinta el listbox de resultados y su estado de accesibilidad.
  renderResultados() {
    const lista = this.elementos.lista;
    const { resultados, activa, abierta } = this.estado;
    while (lista.firstChild) lista.removeChild(lista.firstChild);

    resultados.forEach((receta, indice) => {
      const opcion = document.createElement('li');
      opcion.className = 'panel-comparador__opcion';
      opcion.id = this.id + '-resultado-' + indice;
      opcion.setAttribute('role', 'option');
      opcion.setAttribute('aria-selected', indice === activa ? 'true' : 'false');
      opcion.dataset.indice = String(indice);

      const esOtra = this.esLaOtra(receta);
      if (esOtra) {
        opcion.setAttribute('aria-disabled', 'true');
        opcion.classList.add('panel-comparador__opcion--ocupada');
      }

      if (receta.imagen) {
        const imagen = document.createElement('img');
        imagen.className = 'panel-comparador__opcion-imagen';
        imagen.src = receta.imagen;
        imagen.alt = '';
        imagen.loading = 'lazy';
        imagen.decoding = 'async';
        opcion.appendChild(imagen);
      }

      const texto = document.createElement('span');
      texto.className = 'panel-comparador__opcion-texto';
      const nombre = document.createElement('span');
      nombre.className = 'panel-comparador__opcion-nombre';
      nombre.textContent = receta.nombre;
      const meta = document.createElement('span');
      meta.className = 'panel-comparador__opcion-meta';
      meta.textContent = esOtra
        ? 'Ya está en el panel ' + this.otroPanel() + '.'
        : ([receta.categoria, receta.origen].filter(Boolean).join(' · ') || 'Sin categoría ni origen');
      texto.appendChild(nombre);
      texto.appendChild(meta);
      opcion.appendChild(texto);
      lista.appendChild(opcion);
    });

    const visible = abierta && resultados.length > 0;
    lista.hidden = !visible;
    this.elementos.entrada.setAttribute('aria-expanded', visible ? 'true' : 'false');
    if (visible && activa >= 0) {
      this.elementos.entrada.setAttribute('aria-activedescendant', this.id + '-resultado-' + activa);
    } else {
      this.elementos.entrada.removeAttribute('aria-activedescendant');
    }
  }

  // Registra escritura, teclado, elección, vaciado e imágenes rotas.
  configurarEventos() {
    const entrada = this.elementos.entrada;

    this.escuchar(entrada, 'input', () => this.alEscribir());
    this.escuchar(entrada, 'keydown', evento => this.teclear(evento));
    this.escuchar(entrada, 'focus', () => {
      if (this.estado.resultados.length > 0) {
        this.estado.abierta = true;
        this.renderResultados();
        this.renderEstado();
      }
    });
    this.escuchar(entrada, 'blur', () => this.cerrarLista());

    // mousedown evita que el campo pierda el foco antes de elegir la opción.
    this.escuchar(this.elementos.lista, 'mousedown', evento => {
      evento.preventDefault();
      const opcion = evento.target.closest('[data-indice]');
      if (opcion) this.elegir(Number(opcion.dataset.indice));
    });
    // Los lectores de pantalla pueden activar la opción con un click sin mousedown.
    this.escuchar(this.elementos.lista, 'click', evento => {
      if (evento.detail !== 0) return;
      const opcion = evento.target.closest('[data-indice]');
      if (opcion) this.elegir(Number(opcion.dataset.indice));
    });

    this.escuchar(this.raiz, 'click', evento => {
      const boton = evento.target.closest('button[data-accion="vaciar"]');
      if (boton) this.vaciar();
    });

    // El evento error de <img> no burbujea; se captura desde la raíz.
    this.escuchar(this.raiz, 'error', evento => this.alFallarImagen(evento), true);
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion, captura = false) {
    elemento.addEventListener(tipo, funcion, captura);
    this.oyentes.push({ elemento, tipo, funcion, captura });
  }

  // Guarda lo escrito, reinicia el retardo y busca si hay texto suficiente.
  alEscribir() {
    const consulta = this.elementos.entrada.value;
    this.estado.consulta = consulta;
    this.estado.mensaje = null;
    this.estado.activa = -1;
    this.estado.abierta = false;
    this.limpiarTemporizador();
    this.cancelarBusqueda();

    const texto = consulta.trim();
    if (texto.length < PanelComparador.minimoTexto) {
      this.estado.resultados = [];
      this.estado.buscando = false;
      this.renderEstado();
      this.renderResultados();
      return;
    }

    this.estado.buscando = true;
    this.renderEstado();
    this.renderResultados();
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.buscar(texto);
    }, PanelComparador.retraso);
  }

  // Consulta la API después del retardo y descarta respuestas viejas.
  async buscar(texto) {
    this.cancelarBusqueda();
    const controlador = new AbortController();
    this.controlador = controlador;
    this.estado.buscando = true;
    this.estado.mensaje = null;
    this.renderEstado();

    try {
      const crudas = await CacheApi.buscarRecetas(texto, { signal: controlador.signal });
      if (this.destruido || controlador !== this.controlador) return;

      const normalizadas = Recetas.normalizarLista(crudas);
      const resultados = normalizadas.filter(receta =>
        !this.estado.receta || String(receta.id) !== String(this.estado.receta.id)
      );

      this.estado.resultados = resultados;
      this.estado.activa = -1;
      this.estado.abierta = resultados.length > 0;
      this.estado.buscando = false;
      if (resultados.length === 0) {
        this.estado.mensaje = normalizadas.length > 0
          ? { texto: 'La única coincidencia ya está en este panel.', tipo: 'info' }
          : { texto: 'No se encontraron recetas con ese nombre.', tipo: 'info' };
      }
    } catch (error) {
      if (this.destruido || controlador.signal.aborted || Api.esCancelacion(error) || controlador !== this.controlador) return;
      this.estado.buscando = false;
      this.estado.abierta = false;
      this.estado.resultados = [];
      this.estado.mensaje = { texto: 'No se pudo buscar. Revisa la conexión e inténtalo de nuevo.', tipo: 'error' };
    } finally {
      if (controlador === this.controlador) {
        this.controlador = null;
        if (!this.destruido) {
          this.renderEstado();
          this.renderResultados();
        }
      }
    }
  }

  // Maneja flechas, Enter y Escape en el campo de búsqueda.
  teclear(evento) {
    const { resultados, activa, abierta } = this.estado;

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      if (resultados.length === 0) return;
      evento.preventDefault();
      const haciaAbajo = evento.key === 'ArrowDown';
      if (!abierta) {
        this.estado.abierta = true;
        this.estado.activa = haciaAbajo ? 0 : resultados.length - 1;
      } else if (haciaAbajo) {
        this.estado.activa = (activa + 1) % resultados.length;
      } else {
        this.estado.activa = activa <= 0 ? resultados.length - 1 : activa - 1;
      }
      this.renderResultados();
      this.renderEstado();
    } else if (evento.key === 'Enter') {
      if (abierta && activa >= 0) {
        evento.preventDefault();
        this.elegir(activa);
      }
    } else if (evento.key === 'Escape') {
      if (abierta) {
        evento.preventDefault();
        this.cerrarLista();
      }
    }
  }

  // Elige una receta de los resultados, salvo la que ocupa el otro panel.
  elegir(indice) {
    const receta = this.estado.resultados[indice];
    if (!receta) return;

    if (this.esLaOtra(receta)) {
      this.estado.mensaje = {
        texto: '«' + receta.nombre + '» ya está en el panel ' + this.otroPanel() + '.',
        tipo: 'error'
      };
      this.renderEstado();
      return;
    }

    this.estado.receta = receta;
    this.estado.consulta = '';
    this.estado.resultados = [];
    this.estado.activa = -1;
    this.estado.abierta = false;
    this.estado.buscando = false;
    this.estado.mensaje = null;
    this.elementos.entrada.value = '';
    this.limpiarTemporizador();
    this.cancelarBusqueda();
    this.render();
    this.emitir('receta-elegida', { panel: this.panel, receta });
    this.elementos.entrada.focus();
  }

  // Quita la receta del panel y avisa para que la vista actualice el otro.
  vaciar() {
    if (!this.estado.receta) return;
    this.estado.receta = null;
    this.estado.consulta = '';
    this.estado.resultados = [];
    this.estado.activa = -1;
    this.estado.abierta = false;
    this.estado.buscando = false;
    this.estado.mensaje = null;
    this.elementos.entrada.value = '';
    this.limpiarTemporizador();
    this.cancelarBusqueda();
    this.render();
    this.emitir('vaciar-panel', { panel: this.panel });
    this.elementos.entrada.focus();
  }

  // Reemplaza la receta del panel sin emitir eventos.
  actualizar(receta) {
    this.estado.receta = receta || null;
    this.estado.consulta = '';
    this.estado.resultados = [];
    this.estado.activa = -1;
    this.estado.abierta = false;
    this.estado.buscando = false;
    this.estado.mensaje = null;
    if (this.elementos.entrada) this.elementos.entrada.value = '';
    this.limpiarTemporizador();
    this.cancelarBusqueda();
    this.render();
  }

  // Informa qué receta ocupa el otro panel para deshabilitarla en la lista.
  actualizarOtra(receta) {
    this.estado.otra = receta || null;
    if (this.estado.abierta) this.renderResultados();
  }

  // Indica si la receta es la que ya está en el otro panel.
  esLaOtra(receta) {
    return Boolean(this.estado.otra && String(receta.id) === String(this.estado.otra.id));
  }

  // Nombre del panel contrario.
  otroPanel() {
    return this.panel === 'A' ? 'B' : 'A';
  }

  // Cierra el listbox sin borrar los resultados ni lo escrito.
  cerrarLista() {
    this.estado.abierta = false;
    this.estado.activa = -1;
    this.renderResultados();
    this.renderEstado();
  }

  // Sustituye una imagen rota por el texto «Sin imagen» o la oculta.
  alFallarImagen(evento) {
    const imagen = evento.target;
    if (!(imagen instanceof HTMLImageElement)) return;

    if (imagen.classList.contains('panel-comparador__imagen')) {
      const src = imagen.getAttribute('src') || '';
      if (imagen.dataset.fallida === src) return;
      imagen.dataset.fallida = src;
      imagen.hidden = true;
      this.elementos.sinImagen.hidden = false;
    } else if (imagen.classList.contains('panel-comparador__opcion-imagen')) {
      if (imagen.dataset.fallida) return;
      imagen.dataset.fallida = 'true';
      imagen.hidden = true;
    }
  }

  // Cancela la búsqueda en curso; una cancelación no se muestra como error.
  cancelarBusqueda() {
    if (this.controlador) {
      this.controlador.abort();
      this.controlador = null;
    }
  }

  // Cancela el retardo del debounce.
  limpiarTemporizador() {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  // Emite un CustomEvent que burbujea con los datos en detail.
  emitir(tipo, detalle) {
    this.raiz.dispatchEvent(new CustomEvent(tipo, { bubbles: true, detail: detalle }));
  }

  // Limpia el retardo, aborta la petición y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.limpiarTemporizador();
    this.cancelarBusqueda();
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion, oyente.captura));
    this.oyentes = [];
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.elementos = {};
  }
}

// Contador para ids únicos, retardo del debounce y mínimo de caracteres.
PanelComparador.contador = 0;
PanelComparador.retraso = 400;
PanelComparador.minimoTexto = 2;
