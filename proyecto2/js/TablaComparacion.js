// Tabla de comparación de dos recetas (#38)
//
// Recibe dos recetas normalizadas y pinta todas las métricas de
// Comparacion.comparar(a, b). Si falta una de las dos, se oculta y se limpia:
// la vista dueña decide qué mostrar en su lugar. No emite eventos.
class TablaComparacion {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;          // { a, b }
    this.estado = {
      a: props.a || null,
      b: props.b || null,
      metricas: null
    };
    this.raiz = null;
  }

  // Crea el elemento raíz con su estructura fija y lo agrega al contenedor.
  crear() {
    this.raiz = document.createElement('div');
    this.raiz.className = 'tabla-comparacion';
    this.raiz.hidden = true;
    this.contenedor.appendChild(this.raiz);
    this.configurarEventos();
    this.render();
    return this.raiz;
  }

  // Reemplaza las dos recetas y vuelve a pintar.
  actualizar(a, b) {
    this.estado.a = a || null;
    this.estado.b = b || null;
    this.render();
  }

  // Pinta la tabla y los grupos; si falta una receta, oculta y limpia.
  render() {
    if (!this.raiz) return;
    this.limpiar();

    const { a, b } = this.estado;
    if (!a || !b) {
      this.estado.metricas = null;
      this.raiz.hidden = true;
      return;
    }

    const metricas = Comparacion.comparar(a, b);
    if (!metricas) {
      this.estado.metricas = null;
      this.raiz.hidden = true;
      return;
    }

    this.estado.metricas = metricas;
    this.raiz.hidden = false;
    this.raiz.appendChild(this.crearTabla(a, b, metricas));
    this.raiz.appendChild(this.crearGrupos(a, b, metricas));
  }

  // Quita el contenido anterior para no dejar datos de la comparación previa.
  limpiar() {
    while (this.raiz.firstChild) this.raiz.removeChild(this.raiz.firstChild);
  }

  // Crea la tabla semántica con las métricas y la lectura final.
  crearTabla(a, b, metricas) {
    const marco = document.createElement('div');
    marco.className = 'tabla-comparacion__marco';

    const tabla = document.createElement('table');
    tabla.className = 'tabla-comparacion__tabla';

    const titulo = document.createElement('caption');
    titulo.className = 'tabla-comparacion__titulo';
    titulo.textContent = 'Comparación de «' + a.nombre + '» y «' + b.nombre + '»';
    tabla.appendChild(titulo);

    const cabecera = document.createElement('thead');
    const filaCabecera = document.createElement('tr');
    filaCabecera.appendChild(this.crearCelda('th', 'Métrica', 'col'));
    filaCabecera.appendChild(this.crearCeldaReceta('A', a.nombre));
    filaCabecera.appendChild(this.crearCeldaReceta('B', b.nombre));
    cabecera.appendChild(filaCabecera);
    tabla.appendChild(cabecera);

    const cuerpo = document.createElement('tbody');
    cuerpo.appendChild(this.crearFilaNumero('Ingredientes', metricas.ingredientes));
    cuerpo.appendChild(this.crearFilaNumero('Pasos', metricas.pasos));
    cuerpo.appendChild(this.crearFilaNumero('Palabras', metricas.palabras));
    cuerpo.appendChild(this.crearFilaTexto('Categoría', metricas.categoria));
    cuerpo.appendChild(this.crearFilaTexto('Origen', metricas.origen));
    cuerpo.appendChild(this.crearFilaVideo(metricas.video));
    cuerpo.appendChild(this.crearFilaSimilitud(metricas.similitud));
    cuerpo.appendChild(this.crearFilaSencilla(a, b, metricas.masSencilla));
    tabla.appendChild(cuerpo);

    marco.appendChild(tabla);
    return marco;
  }

  // Crea una celda simple con el alcance indicado (col o row).
  crearCelda(etiqueta, texto, alcance) {
    const celda = document.createElement(etiqueta);
    if (alcance) celda.setAttribute('scope', alcance);
    celda.textContent = texto;
    return celda;
  }

  // Crea la celda de cabecera de una receta con su panel A o B.
  crearCeldaReceta(panel, nombre) {
    const celda = document.createElement('th');
    celda.setAttribute('scope', 'col');
    celda.className = 'tabla-comparacion__cabecera-receta';

    const etiqueta = document.createElement('span');
    etiqueta.className = 'tabla-comparacion__panel tabla-comparacion__panel--' + panel.toLowerCase();
    etiqueta.textContent = panel;

    const texto = document.createElement('span');
    texto.className = 'tabla-comparacion__receta';
    texto.textContent = nombre;

    celda.appendChild(etiqueta);
    celda.appendChild(texto);
    return celda;
  }

  // Crea una fila numérica y resalta el valor menor (o marca el empate).
  crearFilaNumero(etiqueta, datos) {
    const fila = document.createElement('tr');
    const cabecera = document.createElement('th');
    cabecera.setAttribute('scope', 'row');
    cabecera.textContent = etiqueta;

    if (datos.menor === 'empate') {
      const empate = document.createElement('span');
      empate.className = 'tabla-comparacion__empate';
      empate.textContent = 'Empate';
      cabecera.appendChild(empate);
    }

    fila.appendChild(cabecera);
    fila.appendChild(this.crearCeldaNumero(datos.a, datos.menor === 'a'));
    fila.appendChild(this.crearCeldaNumero(datos.b, datos.menor === 'b'));
    return fila;
  }

  // Crea una celda numérica; la menor lleva fondo y la insignia «Menos».
  crearCeldaNumero(valor, esMenor) {
    const celda = document.createElement('td');
    celda.className = 'tabla-comparacion__valor';
    celda.textContent = String(valor);

    if (esMenor) {
      celda.classList.add('tabla-comparacion__valor--menor');
      const insignia = document.createElement('span');
      insignia.className = 'tabla-comparacion__insignia';
      insignia.textContent = 'Menos';
      celda.appendChild(insignia);
    }
    return celda;
  }

  // Crea una fila de texto (categoría u origen) con su lectura de coincidencia.
  crearFilaTexto(etiqueta, datos) {
    const fila = document.createElement('tr');
    const cabecera = document.createElement('th');
    cabecera.setAttribute('scope', 'row');
    cabecera.textContent = etiqueta;

    const lectura = document.createElement('span');
    lectura.className = 'tabla-comparacion__coincide' + (datos.coinciden ? '' : ' tabla-comparacion__coincide--no');
    lectura.textContent = datos.coinciden ? 'Coinciden' : 'Diferentes';
    cabecera.appendChild(lectura);

    fila.appendChild(cabecera);
    fila.appendChild(this.crearCeldaTexto(datos.a, datos.coinciden));
    fila.appendChild(this.crearCeldaTexto(datos.b, datos.coinciden));
    return fila;
  }

  // Crea una celda de texto con «Sin dato» si la API no lo trae.
  crearCeldaTexto(valor, coincide) {
    const celda = document.createElement('td');
    celda.className = 'tabla-comparacion__texto';
    if (coincide) celda.classList.add('tabla-comparacion__texto--coincide');
    celda.textContent = valor || 'Sin dato';
    return celda;
  }

  // Crea la fila de video: cada receta tiene uno o no.
  crearFilaVideo(datos) {
    const fila = document.createElement('tr');
    const cabecera = document.createElement('th');
    cabecera.setAttribute('scope', 'row');
    cabecera.textContent = 'Video';

    fila.appendChild(cabecera);
    fila.appendChild(this.crearCeldaTexto(datos.a ? 'Con video' : 'Sin video', false));
    fila.appendChild(this.crearCeldaTexto(datos.b ? 'Con video' : 'Sin video', false));
    return fila;
  }

  // Crea la fila de similitud con una barra y el porcentaje en texto.
  crearFilaSimilitud(porcentaje) {
    const fila = document.createElement('tr');
    fila.className = 'tabla-comparacion__fila-resumen';

    const cabecera = document.createElement('th');
    cabecera.setAttribute('scope', 'row');
    cabecera.textContent = 'Similitud';

    const celda = document.createElement('td');
    celda.colSpan = 2;

    const grupo = document.createElement('div');
    grupo.className = 'tabla-comparacion__similitud';

    const barra = document.createElement('span');
    barra.className = 'tabla-comparacion__barra';
    barra.setAttribute('aria-hidden', 'true');
    const relleno = document.createElement('span');
    relleno.className = 'tabla-comparacion__barra-relleno';
    relleno.style.setProperty('--similitud', porcentaje + '%');
    barra.appendChild(relleno);

    const texto = document.createElement('span');
    texto.className = 'tabla-comparacion__porcentaje';
    texto.textContent = porcentaje + ' %';
    const sufijo = document.createElement('span');
    sufijo.className = 'solo-lectores';
    sufijo.textContent = ' de ingredientes en común';
    texto.appendChild(sufijo);

    grupo.appendChild(barra);
    grupo.appendChild(texto);
    celda.appendChild(grupo);
    fila.appendChild(cabecera);
    fila.appendChild(celda);
    return fila;
  }

  // Crea la fila que declara la receta más sencilla o el empate.
  crearFilaSencilla(a, b, resultado) {
    const fila = document.createElement('tr');
    fila.className = 'tabla-comparacion__fila-resumen';

    const cabecera = document.createElement('th');
    cabecera.setAttribute('scope', 'row');
    cabecera.textContent = 'Receta más sencilla';

    const celda = document.createElement('td');
    celda.colSpan = 2;

    const texto = document.createElement('p');
    texto.className = 'tabla-comparacion__sencilla';
    if (resultado === 'a' || resultado === 'b') {
      const ganadora = resultado === 'a' ? a : b;
      const otra = resultado === 'a' ? b : a;
      texto.classList.add('tabla-comparacion__sencilla--' + resultado);
      texto.textContent = this.textoSencilla(ganadora, otra);
    } else {
      texto.classList.add('tabla-comparacion__sencilla--empate');
      texto.textContent = 'Empate: las dos recetas tienen la misma cantidad de ingredientes, pasos y palabras.';
    }

    celda.appendChild(texto);
    fila.appendChild(cabecera);
    fila.appendChild(celda);
    return fila;
  }

  // Explica por qué una receta es más sencilla que la otra.
  textoSencilla(ganadora, otra) {
    if (ganadora.ingredientes.length !== otra.ingredientes.length) {
      return '«' + ganadora.nombre + '» es más sencilla: tiene menos ingredientes.';
    }
    if (ganadora.pasos.length !== otra.pasos.length) {
      return '«' + ganadora.nombre + '» es más sencilla: empatan en ingredientes y tiene menos pasos.';
    }
    return '«' + ganadora.nombre + '» es más sencilla: empatan en ingredientes y pasos, y tiene menos palabras.';
  }

  // Crea los grupos separados de etiquetas e ingredientes.
  crearGrupos(a, b, metricas) {
    const grupos = document.createElement('div');
    grupos.className = 'tabla-comparacion__grupos';

    grupos.appendChild(this.crearGrupo(
      'Etiquetas en común',
      metricas.etiquetasComunes,
      'comun',
      'Sin etiquetas en común.'
    ));
    grupos.appendChild(this.crearGrupo(
      'Ingredientes en común',
      metricas.ingredientesComunes,
      'comun',
      'Sin ingredientes en común.'
    ));
    grupos.appendChild(this.crearGrupo(
      'Solo en «' + a.nombre + '» (A)',
      metricas.ingredientesExclusivosA,
      'a',
      'Ninguno.'
    ));
    grupos.appendChild(this.crearGrupo(
      'Solo en «' + b.nombre + '» (B)',
      metricas.ingredientesExclusivosB,
      'b',
      'Ninguno.'
    ));

    return grupos;
  }

  // Crea un grupo con su título, su cuenta y la lista de elementos.
  crearGrupo(titulo, elementos, tipo, mensajeVacio) {
    const grupo = document.createElement('section');
    grupo.className = 'tabla-comparacion__grupo tabla-comparacion__grupo--' + tipo;

    const cabecera = document.createElement('h3');
    cabecera.className = 'tabla-comparacion__grupo-titulo';
    const texto = document.createElement('span');
    texto.textContent = titulo;
    const cuenta = document.createElement('span');
    cuenta.className = 'tabla-comparacion__cuenta';
    cuenta.textContent = String(elementos.length);
    const sufijo = document.createElement('span');
    sufijo.className = 'solo-lectores';
    sufijo.textContent = elementos.length === 1 ? ' elemento' : ' elementos';
    cuenta.appendChild(sufijo);
    cabecera.appendChild(texto);
    cabecera.appendChild(cuenta);
    grupo.appendChild(cabecera);

    if (elementos.length === 0) {
      const vacio = document.createElement('p');
      vacio.className = 'tabla-comparacion__sin-datos';
      vacio.textContent = mensajeVacio;
      grupo.appendChild(vacio);
      return grupo;
    }

    const lista = document.createElement('ul');
    lista.className = 'tabla-comparacion__lista';
    elementos.forEach(elemento => {
      const item = document.createElement('li');
      item.className = 'tabla-comparacion__chip';
      item.textContent = elemento;
      lista.appendChild(item);
    });
    grupo.appendChild(lista);
    return grupo;
  }

  // No emite eventos ni necesita listeners propios.
  configurarEventos() {}

  // Saca su elemento del DOM y olvida las recetas.
  destruir() {
    if (this.raiz && this.raiz.parentNode) this.raiz.parentNode.removeChild(this.raiz);
    this.raiz = null;
    this.estado.a = null;
    this.estado.b = null;
    this.estado.metricas = null;
  }
}
