// Estado de carga, vacío o error de una sección (#31)
//
// Un único componente para los tres estados de la sección 4.7. La sección
// dueña lo crea una vez y cambia de estado con sus métodos:
//   cargando()        -> esqueleto con la forma del contenido que reemplaza
//   vacio(tipo)       -> 'sin-criterios' | 'sin-resultados' | 'comparador'
//   fallo(error)      -> mensaje según el tipo de ErrorApi (con Reintentar)
//   aviso(mensaje)    -> entrada inválida, junto al campo y sin peticiones
//   ocultar()         -> la sección vuelve a mostrar su contenido
//
// El botón Reintentar emite un CustomEvent 'reintentar' que burbujea hasta
// document; la sección dueña decide qué volver a pedir. Las peticiones
// canceladas no se muestran como error (contrato de api.js).
class EstadoCarga {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;   // { forma, cantidad, contexto }
    this.estado = null;   // estado actual o null si está oculto
    this.raiz = null;
    this.oyentes = [];    // { elemento, tipo, funcion }
    this.eventosConfigurados = false;
  }

  // Crea el elemento raíz, lo agrega al contenedor y registra sus eventos.
  crear() {
    this.raiz = document.createElement('div');
    this.raiz.className = 'estado-carga';
    this.raiz.setAttribute('role', 'status');
    this.raiz.setAttribute('aria-live', 'polite');
    this.raiz.hidden = true;
    this.contenedor.appendChild(this.raiz);
    this.configurarEventos();
    this.render();
    return this.raiz;
  }

  // Pinta el estado actual reemplazando el contenido anterior.
  render() {
    if (!this.raiz) return;
    while (this.raiz.firstChild) this.raiz.removeChild(this.raiz.firstChild);
    this.raiz.hidden = this.estado === null;
    if (!this.estado) return;
    if (this.estado.tipo === 'carga') this.renderCarga();
    else if (this.estado.tipo === 'vacio') this.renderVacio();
    else if (this.estado.tipo === 'error') this.renderError();
    else if (this.estado.tipo === 'aviso') this.renderAviso();
  }

  // Registra el click de Reintentar en la raíz, para que sobreviva a los
  // renderizados. Es idempotente: llamarlo dos veces no duplica listeners.
  configurarEventos() {
    if (this.eventosConfigurados || !this.raiz) return;
    this.eventosConfigurados = true;
    const alClick = evento => {
      const boton = evento.target.closest('.estado-carga__reintentar');
      if (!boton) return;
      this.raiz.dispatchEvent(new CustomEvent('reintentar', {
        bubbles: true,
        detail: { contexto: this.props.contexto || null }
      }));
    };
    this.raiz.addEventListener('click', alClick);
    this.oyentes.push({ elemento: this.raiz, tipo: 'click', funcion: alClick });
  }

  // Libera los listeners y saca su elemento del DOM.
  destruir() {
    this.oyentes.forEach(oyente => oyente.elemento.removeEventListener(oyente.tipo, oyente.funcion));
    this.oyentes = [];
    this.eventosConfigurados = false;
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.estado = null;
  }

  /* ---------- Cambio de estado ---------- */

  // Muestra el esqueleto de carga con la forma del contenido que reemplaza:
  // 'tarjetas' (cuadrícula), 'detalle', 'panel' del comparador o 'filas'.
  cargando(forma) {
    this.estado = {
      tipo: 'carga',
      forma: forma || this.props.forma || 'tarjetas',
      cantidad: this.props.cantidad || 8
    };
    this.render();
  }

  // Muestra un estado vacío diseñado. El tipo define icono y textos; el
  // mensaje opcional reemplaza el texto por defecto.
  vacio(tipo = 'sin-resultados', mensaje) {
    this.estado = { tipo: 'vacio', vacio: tipo, mensaje: mensaje || null };
    this.render();
  }

  // Muestra el mensaje de error que corresponde al ErrorApi recibido.
  // Una petición cancelada no se muestra.
  fallo(error) {
    if (error && error.tipo === 'cancelado') {
      this.ocultar();
      return;
    }
    this.estado = { tipo: 'error', error };
    this.render();
  }

  // Muestra un aviso de entrada inválida: mensaje corto, sin Reintentar.
  aviso(mensaje) {
    this.estado = { tipo: 'aviso', mensaje };
    this.render();
  }

  // Oculta el estado y deja a la sección mostrar su contenido.
  ocultar() {
    this.estado = null;
    this.render();
  }

  /* ---------- Renderizado ---------- */

  // Crea una barra de esqueleto.
  crearBarra(clase) {
    const barra = document.createElement('div');
    barra.className = clase;
    return barra;
  }

  // Crea un icono propio: SVG de 24 x 24, trazo 1.75 y currentColor.
  crearIcono(paths, clase) {
    const espacios = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(espacios, 'svg');
    svg.setAttribute('class', clase);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    paths.forEach(d => {
      const path = document.createElementNS(espacios, 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);
    });
    return svg;
  }

  // Esqueleto de carga con la forma del contenido que reemplaza.
  renderCarga() {
    const avisoLectores = document.createElement('span');
    avisoLectores.className = 'solo-lectores';
    avisoLectores.textContent = 'Cargando…';
    this.raiz.appendChild(avisoLectores);

    const esqueleto = document.createElement('div');
    esqueleto.className = 'estado-carga__esqueleto estado-carga__esqueleto--' + this.estado.forma;
    esqueleto.setAttribute('aria-hidden', 'true');
    this.raiz.appendChild(esqueleto);

    const forma = this.estado.forma;
    if (forma === 'tarjetas') {
      for (let i = 0; i < this.estado.cantidad; i++) {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-esqueleto';
        const imagen = document.createElement('div');
        imagen.className = 'tarjeta-esqueleto__imagen';
        tarjeta.appendChild(imagen);
        tarjeta.appendChild(this.crearBarra('tarjeta-esqueleto__barra'));
        tarjeta.appendChild(this.crearBarra('tarjeta-esqueleto__barra tarjeta-esqueleto__barra--ancha'));
        tarjeta.appendChild(this.crearBarra('tarjeta-esqueleto__barra tarjeta-esqueleto__barra--corta'));
        esqueleto.appendChild(tarjeta);
      }
    } else if (forma === 'detalle') {
      const detalle = document.createElement('div');
      detalle.className = 'detalle-esqueleto';
      const imagen = document.createElement('div');
      imagen.className = 'detalle-esqueleto__imagen';
      detalle.appendChild(imagen);
      detalle.appendChild(this.crearBarra('detalle-esqueleto__barra detalle-esqueleto__barra--titulo'));
      for (let i = 0; i < 4; i++) detalle.appendChild(this.crearBarra('detalle-esqueleto__barra'));
      detalle.appendChild(this.crearBarra('detalle-esqueleto__barra detalle-esqueleto__barra--corta'));
      esqueleto.appendChild(detalle);
    } else if (forma === 'panel') {
      const panel = document.createElement('div');
      panel.className = 'panel-esqueleto';
      panel.appendChild(this.crearBarra('panel-esqueleto__barra panel-esqueleto__barra--titulo'));
      const imagen = document.createElement('div');
      imagen.className = 'panel-esqueleto__imagen';
      panel.appendChild(imagen);
      panel.appendChild(this.crearBarra('panel-esqueleto__barra'));
      panel.appendChild(this.crearBarra('panel-esqueleto__barra panel-esqueleto__barra--corta'));
      esqueleto.appendChild(panel);
    } else {
      for (let i = 0; i < this.estado.cantidad && i < 8; i++) {
        const fila = document.createElement('div');
        fila.className = 'fila-esqueleto';
        fila.appendChild(this.crearBarra('fila-esqueleto__barra fila-esqueleto__barra--icono'));
        fila.appendChild(this.crearBarra('fila-esqueleto__barra fila-esqueleto__barra--ancha'));
        esqueleto.appendChild(fila);
      }
    }
  }

  // Estado vacío diseñado según el tipo de sección.
  renderVacio() {
    const tipos = {
      'sin-criterios': {
        titulo: 'Empieza una búsqueda',
        texto: 'Escribe al menos un criterio para encontrar recetas.',
        ayuda: 'Puedes combinar nombre, categoría, origen e ingrediente.',
        icono: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z', 'M15.5 15.5 21 21']
      },
      'sin-resultados': {
        titulo: 'No hay recetas',
        texto: 'No encontramos recetas con esos criterios.',
        ayuda: 'Prueba con otro nombre o quita algún filtro.',
        icono: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z', 'M6.8 11.8 14.2 4.4', 'M15.5 15.5 21 21']
      },
      comparador: {
        titulo: 'El comparador está vacío',
        texto: 'Agrega hasta dos recetas para verlas frente a frente.',
        ayuda: 'Usa «Agregar al comparador» desde una tarjeta o un detalle.',
        icono: [
          'M8 3c2 2.6 3.2 4.6 3.2 6.6a3.2 3.2 0 0 1-6.4 0c0-1 .3-1.9.8-2.8.5.9 1.2 1.4 2.2 1.4C7.2 6.4 7.4 4.6 8 3z',
          'M16 3c2 2.6 3.2 4.6 3.2 6.6a3.2 3.2 0 0 1-6.4 0c0-1 .3-1.9.8-2.8.5.9 1.2 1.4 2.2 1.4C15.2 6.4 15.4 4.6 16 3z',
          'M4 21h16'
        ]
      }
    };
    // Tipo efectivo: uno desconocido cae a 'sin-resultados' (clase y textos).
    const tipo = tipos[this.estado.vacio] ? this.estado.vacio : 'sin-resultados';
    const definicion = tipos[tipo];

    const bloque = document.createElement('div');
    bloque.className = 'estado-vacio estado-vacio--' + tipo;
    bloque.appendChild(this.crearIcono(definicion.icono, 'estado-vacio__icono'));

    const titulo = document.createElement('h3');
    titulo.className = 'estado-vacio__titulo';
    titulo.textContent = definicion.titulo;
    bloque.appendChild(titulo);

    const texto = document.createElement('p');
    texto.className = 'estado-vacio__texto';
    texto.textContent = this.estado.mensaje || definicion.texto;
    bloque.appendChild(texto);

    const ayuda = document.createElement('p');
    ayuda.className = 'estado-vacio__ayuda';
    ayuda.textContent = definicion.ayuda;
    bloque.appendChild(ayuda);

    this.raiz.appendChild(bloque);
  }

  // Mensaje de error específico según el tipo de ErrorApi, con Reintentar.
  renderError() {
    const error = this.estado.error || {};
    const tipo = error.tipo || 'desconocido';
    let mensaje = 'No pudimos completar la operación.';
    if (tipo === 'red') mensaje = 'No hay conexión con el servicio.';
    else if (tipo === 'servicio') mensaje = 'El servicio no está disponible.';
    else if (tipo === 'datos') mensaje = 'La respuesta del servicio no es válida.';

    const bloque = document.createElement('div');
    bloque.className = 'estado-error';
    bloque.appendChild(this.crearIcono(
      ['M12 3 2.5 20.25h19L12 3z', 'M12 9.5v5', 'M12 17.4v.1'],
      'estado-error__icono'
    ));

    const titulo = document.createElement('h3');
    titulo.className = 'estado-error__titulo';
    titulo.textContent = 'Algo no salió bien';
    bloque.appendChild(titulo);

    const texto = document.createElement('p');
    texto.className = 'estado-error__texto';
    texto.textContent = mensaje;
    bloque.appendChild(texto);

    if (tipo === 'servicio' && error.estado) {
      const detalle = document.createElement('p');
      detalle.className = 'estado-error__detalle';
      detalle.textContent = 'Estado recibido: ' + error.estado;
      bloque.appendChild(detalle);
    }

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'estado-carga__reintentar';
    boton.textContent = 'Reintentar';
    bloque.appendChild(boton);

    this.raiz.appendChild(bloque);
  }

  // Aviso corto de entrada inválida, sin Reintentar.
  renderAviso() {
    const bloque = document.createElement('div');
    bloque.className = 'estado-aviso';
    bloque.appendChild(this.crearIcono(
      ['M12 8.5v.1', 'M10.8 12.2 12 16.5h1.5', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'],
      'estado-aviso__icono'
    ));

    const texto = document.createElement('p');
    texto.className = 'estado-aviso__texto';
    texto.textContent = this.estado.mensaje;
    bloque.appendChild(texto);

    this.raiz.appendChild(bloque);
  }
}
