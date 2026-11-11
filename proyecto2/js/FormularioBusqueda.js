// Formulario de Explorar con cuatro criterios combinables (#36)
class FormularioBusqueda {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      criterios: FormularioBusqueda.normalizar(props.criterios),
      ingredientes: [],      // nombres de la lista de la API
      sugerencias: [],       // sugerencias visibles
      activa: -1             // índice de la sugerencia resaltada
    };
    this.id = 'formulario-busqueda-' + (++FormularioBusqueda.contador);
    this.raiz = null;
    this.campos = {};
    this.oyentes = [];       // { elemento, tipo, funcion }
    this.destruido = false;
  }

  // Devuelve los criterios con las cuatro claves, siempre como texto.
  static normalizar(criterios) {
    const c = criterios || {};
    return {
      nombre: String(c.nombre || ''),
      categoria: String(c.categoria || ''),
      origen: String(c.origen || ''),
      ingrediente: String(c.ingrediente || '')
    };
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    const raiz = document.createElement('form');
    raiz.className = 'formulario-busqueda';
    raiz.noValidate = true;
    raiz.setAttribute('aria-label', 'Buscar recetas');

    const nombre = this.crearInput('nombre', 'Nombre');
    const categoria = this.crearSelect('categoria', 'Categoría');
    const origen = this.crearSelect('origen', 'Origen');
    const ingrediente = this.crearIngrediente();
    [nombre, categoria, origen, ingrediente].forEach(campo => raiz.appendChild(campo));

    const mensaje = document.createElement('p');
    mensaje.className = 'formulario-busqueda__mensaje';
    mensaje.setAttribute('role', 'alert');
    mensaje.hidden = true;
    raiz.appendChild(mensaje);

    const listas = document.createElement('div');
    listas.className = 'formulario-busqueda__listas';
    listas.hidden = true;
    const textoListas = document.createElement('span');
    const reintentar = document.createElement('button');
    reintentar.type = 'button';
    reintentar.className = 'boton--texto';
    reintentar.dataset.accion = 'reintentar-listas';
    reintentar.textContent = 'Reintentar';
    listas.appendChild(textoListas);
    listas.appendChild(reintentar);
    raiz.appendChild(listas);

    const acciones = document.createElement('div');
    acciones.className = 'formulario-busqueda__acciones';
    const buscar = document.createElement('button');
    buscar.type = 'submit';
    buscar.className = 'boton--primario';
    buscar.textContent = 'Buscar';
    const limpiar = document.createElement('button');
    limpiar.type = 'button';
    limpiar.className = 'boton--secundario';
    limpiar.dataset.accion = 'limpiar';
    limpiar.textContent = 'Limpiar';
    acciones.appendChild(buscar);
    acciones.appendChild(limpiar);
    raiz.appendChild(acciones);

    this.raiz = raiz;
    this.campos.mensaje = mensaje;
    this.campos.listas = listas;
    this.campos.textoListas = textoListas;
    this.contenedor.appendChild(raiz);
    this.configurarEventos();
    this.render();
    this.cargarListas();
    return raiz;
  }

  // Crea el bloque de un campo: etiqueta, control (o su envoltorio) y mensaje de error.
  crearCampo(clave, etiqueta, control, envoltorio = control) {
    const bloque = document.createElement('div');
    bloque.className = 'campo formulario-busqueda__campo';
    const rotulo = document.createElement('label');
    rotulo.htmlFor = control.id;
    rotulo.textContent = etiqueta;
    const error = document.createElement('p');
    error.className = 'formulario-busqueda__error';
    error.id = control.id + '-error';
    error.hidden = true;
    bloque.appendChild(rotulo);
    bloque.appendChild(envoltorio);
    bloque.appendChild(error);
    this.campos[clave] = control;
    this.campos[clave + 'Error'] = error;
    return bloque;
  }

  // Crea un campo de texto.
  crearInput(clave, etiqueta) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = this.id + '-' + clave;
    input.name = clave;
    input.autocomplete = 'off';
    return this.crearCampo(clave, etiqueta, input);
  }

  // Crea un selector con la opción «Cualquiera».
  crearSelect(clave, etiqueta) {
    const select = document.createElement('select');
    select.id = this.id + '-' + clave;
    select.name = clave;
    select.appendChild(this.crearOpcion('', 'Cualquiera'));
    return this.crearCampo(clave, etiqueta, select);
  }

  // Crea una opción de selector.
  crearOpcion(valor, texto) {
    const opcion = document.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    return opcion;
  }

  // Crea el campo de ingrediente con su lista de sugerencias.
  crearIngrediente() {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = this.id + '-ingrediente';
    input.name = 'ingrediente';
    input.autocomplete = 'off';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', this.id + '-sugerencias');

    const combo = document.createElement('div');
    combo.className = 'formulario-busqueda__combo';
    combo.appendChild(input);
    const bloque = this.crearCampo('ingrediente', 'Ingrediente', input, combo);
    const lista = document.createElement('ul');
    lista.className = 'formulario-busqueda__sugerencias';
    lista.id = this.id + '-sugerencias';
    lista.setAttribute('role', 'listbox');
    lista.setAttribute('aria-label', 'Sugerencias de ingredientes');
    lista.hidden = true;
    combo.appendChild(lista);
    this.campos.sugerencias = lista;
    return bloque;
  }

  // Pinta los criterios actuales en los campos y las sugerencias visibles.
  render() {
    if (!this.raiz) return;
    const c = this.estado.criterios;
    this.campos.nombre.value = c.nombre;
    this.campos.categoria.value = c.categoria;
    this.campos.origen.value = c.origen;
    this.campos.ingrediente.value = c.ingrediente;
    this.renderSugerencias();
  }

  // Pinta la lista de sugerencias y el estado del combobox.
  renderSugerencias() {
    const lista = this.campos.sugerencias;
    const { sugerencias, activa } = this.estado;
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    sugerencias.forEach((nombre, indice) => {
      const opcion = document.createElement('li');
      opcion.className = 'formulario-busqueda__sugerencia';
      opcion.id = this.id + '-sugerencia-' + indice;
      opcion.setAttribute('role', 'option');
      opcion.setAttribute('aria-selected', indice === activa ? 'true' : 'false');
      opcion.dataset.indice = String(indice);
      opcion.textContent = nombre;
      lista.appendChild(opcion);
    });
    const abierta = sugerencias.length > 0;
    lista.hidden = !abierta;
    this.campos.ingrediente.setAttribute('aria-expanded', abierta ? 'true' : 'false');
    if (activa >= 0) this.campos.ingrediente.setAttribute('aria-activedescendant', this.id + '-sugerencia-' + activa);
    else this.campos.ingrediente.removeAttribute('aria-activedescendant');
  }

  // Registra envío, limpiar, escritura, teclado y sugerencias.
  configurarEventos() {
    this.escuchar(this.raiz, 'submit', evento => {
      evento.preventDefault();
      this.enviar();
    });
    this.escuchar(this.raiz, 'click', evento => {
      const boton = evento.target.closest('button[data-accion]');
      if (!boton) return;
      if (boton.dataset.accion === 'limpiar') this.limpiar();
      else if (boton.dataset.accion === 'reintentar-listas') this.cargarListas();
    });
    ['nombre', 'categoria', 'origen'].forEach(clave => {
      this.escuchar(this.campos[clave], clave === 'nombre' ? 'input' : 'change', () => {
        this.estado.criterios[clave] = this.campos[clave].value;
        this.mostrarError(clave, null);
      });
    });

    const ingrediente = this.campos.ingrediente;
    this.escuchar(ingrediente, 'input', () => {
      this.estado.criterios.ingrediente = ingrediente.value;
      this.mostrarError('ingrediente', null);
      this.filtrarSugerencias();
    });
    this.escuchar(ingrediente, 'keydown', evento => this.teclearIngrediente(evento));
    this.escuchar(ingrediente, 'blur', () => this.cerrarSugerencias());
    // mousedown evita que el campo pierda el foco antes de elegir la sugerencia.
    this.escuchar(this.campos.sugerencias, 'mousedown', evento => {
      evento.preventDefault();
      const opcion = evento.target.closest('[data-indice]');
      if (opcion) this.elegirSugerencia(Number(opcion.dataset.indice));
    });
  }

  // Registra un listener y lo guarda para quitarlo en destruir().
  escuchar(elemento, tipo, funcion) {
    elemento.addEventListener(tipo, funcion);
    this.oyentes.push({ elemento, tipo, funcion });
  }

  // Pide categorías, orígenes e ingredientes a la caché y llena los campos.
  async cargarListas() {
    this.campos.listas.hidden = true;
    this.campos.categoria.disabled = true;
    this.campos.origen.disabled = true;
    const [categorias, origenes, ingredientes] = await Promise.allSettled([
      CacheApi.obtenerCategorias(),
      CacheApi.obtenerOrigenes(),
      CacheApi.obtenerIngredientes()
    ]);
    if (this.destruido || !this.raiz) return;

    if (categorias.status === 'fulfilled') this.llenarSelect('categoria', categorias.value.map(c => c.strCategory));
    if (origenes.status === 'fulfilled') this.llenarSelect('origen', origenes.value.map(o => o.strArea));
    if (ingredientes.status === 'fulfilled') {
      this.estado.ingredientes = ingredientes.value.map(i => i.strIngredient).filter(Boolean);
    }
    this.campos.categoria.disabled = false;
    this.campos.origen.disabled = false;

    const fallos = [categorias, origenes, ingredientes].filter(r => r.status === 'rejected' && !Api.esCancelacion(r.reason));
    if (fallos.length > 0) {
      this.campos.textoListas.textContent = 'No se pudieron cargar algunas listas del formulario.';
      this.campos.listas.hidden = false;
    }
  }

  // Reemplaza las opciones de un selector conservando el criterio actual.
  llenarSelect(clave, valores) {
    const select = this.campos[clave];
    while (select.options.length > 1) select.remove(1);
    valores.filter(Boolean).forEach(valor => select.appendChild(this.crearOpcion(valor, valor)));
    select.value = this.estado.criterios[clave];
  }

  // Filtra los ingredientes según lo escrito: primero los que empiezan por el texto.
  filtrarSugerencias() {
    const texto = this.campos.ingrediente.value.trim().toLowerCase();
    let resultado = [];
    if (texto !== '') {
      const empiezan = this.estado.ingredientes.filter(n => n.toLowerCase().startsWith(texto));
      const contienen = this.estado.ingredientes.filter(n => !n.toLowerCase().startsWith(texto) && n.toLowerCase().includes(texto));
      resultado = empiezan.concat(contienen).slice(0, FormularioBusqueda.maximoSugerencias);
    }
    this.estado.sugerencias = resultado;
    this.estado.activa = -1;
    this.renderSugerencias();
  }

  // Maneja flechas, Enter y Escape en el campo de ingrediente.
  teclearIngrediente(evento) {
    const { sugerencias, activa } = this.estado;
    if (evento.key === 'ArrowDown' && sugerencias.length > 0) {
      evento.preventDefault();
      this.estado.activa = (activa + 1) % sugerencias.length;
      this.renderSugerencias();
    } else if (evento.key === 'ArrowUp' && sugerencias.length > 0) {
      evento.preventDefault();
      this.estado.activa = activa <= 0 ? sugerencias.length - 1 : activa - 1;
      this.renderSugerencias();
    } else if (evento.key === 'Enter' && activa >= 0) {
      evento.preventDefault();
      this.elegirSugerencia(activa);
    } else if (evento.key === 'Escape' && sugerencias.length > 0) {
      evento.preventDefault();
      this.cerrarSugerencias();
    }
  }

  // Copia la sugerencia elegida al campo y cierra la lista.
  elegirSugerencia(indice) {
    const nombre = this.estado.sugerencias[indice];
    if (nombre === undefined) return;
    this.estado.criterios.ingrediente = nombre;
    this.campos.ingrediente.value = nombre;
    this.cerrarSugerencias();
  }

  // Oculta las sugerencias sin cambiar lo escrito.
  cerrarSugerencias() {
    this.estado.sugerencias = [];
    this.estado.activa = -1;
    this.renderSugerencias();
  }

  // Muestra u oculta el mensaje de error junto a un campo.
  mostrarError(clave, texto) {
    const error = this.campos[clave + 'Error'];
    const campo = this.campos[clave];
    error.textContent = texto || '';
    error.hidden = !texto;
    if (texto) {
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', error.id);
    } else {
      campo.removeAttribute('aria-invalid');
      campo.removeAttribute('aria-describedby');
    }
  }

  // Valida los criterios; devuelve los aplicados o null si hay errores (ya mostrados).
  validar() {
    const c = this.estado.criterios;
    const aplicados = {
      nombre: c.nombre.trim() || null,
      categoria: c.categoria || null,
      origen: c.origen || null,
      ingrediente: c.ingrediente.trim() || null
    };
    let valido = true;
    ['nombre', 'ingrediente'].forEach(clave => {
      const texto = aplicados[clave];
      if (texto !== null && texto.length < FormularioBusqueda.minimoTexto) {
        this.mostrarError(clave, 'Escribe al menos ' + FormularioBusqueda.minimoTexto + ' caracteres.');
        valido = false;
      } else {
        this.mostrarError(clave, null);
      }
    });

    const hayCriterio = Object.values(aplicados).some(valor => valor !== null);
    this.campos.mensaje.hidden = hayCriterio;
    this.campos.mensaje.textContent = hayCriterio ? '' : 'Indica al menos un criterio para buscar.';
    if (!hayCriterio) valido = false;

    if (aplicados.ingrediente !== null) {
      const exacto = this.estado.ingredientes.find(n => n.toLowerCase() === aplicados.ingrediente.toLowerCase());
      if (exacto) aplicados.ingrediente = exacto;
    }
    return valido ? aplicados : null;
  }

  // Valida y, si es correcto, emite buscar con los criterios aplicados.
  enviar() {
    this.cerrarSugerencias();
    const criterios = this.validar();
    if (!criterios) return;
    this.raiz.dispatchEvent(new CustomEvent('buscar', { bubbles: true, detail: { criterios } }));
  }

  // Borra los criterios y los mensajes, y avisa para que se limpien los resultados.
  limpiar() {
    this.estado.criterios = FormularioBusqueda.normalizar(null);
    this.cerrarSugerencias();
    ['nombre', 'ingrediente'].forEach(clave => this.mostrarError(clave, null));
    this.campos.mensaje.hidden = true;
    this.render();
    this.raiz.dispatchEvent(new CustomEvent('limpiar', { bubbles: true }));
  }

  // Restaura criterios anteriores (por ejemplo, al volver del detalle) sin emitir eventos.
  restaurar(criterios) {
    this.estado.criterios = FormularioBusqueda.normalizar(criterios);
    this.render();
  }

  // Devuelve los criterios escritos actualmente, aunque no se hayan enviado.
  obtenerCriterios() {
    return Object.assign({}, this.estado.criterios);
  }

  // Libera sus listeners y saca su elemento del DOM.
  destruir() {
    this.destruido = true;
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.campos = {};
  }
}

// Contador para ids únicos, mínimo de caracteres de texto y máximo de sugerencias.
FormularioBusqueda.contador = 0;
FormularioBusqueda.minimoTexto = 2;
FormularioBusqueda.maximoSugerencias = 8;
