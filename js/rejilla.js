// Dominio del campo `dia` definido por el enunciado.
const DIAS_REJILLA = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const SLOTS_COLOR_MATERIA = 8;

/* ---------- Escala y ubicación ---------- */

// Calcula el máximo común divisor de dos enteros.
function mcdEnteros(a, b) {
  while (b !== 0) {
    const resto = a % b;
    a = b;
    b = resto;
  }
  return a;
}

// Devuelve el inicio y fin (en minutos) de una sesión, o null si ningún bloque existe.
function intervaloSesionMin(sesion) {
  const bloques = sesion.bloques.map(id => bloquesPorId.get(id)).filter(Boolean);
  if (bloques.length === 0) return null;
  return {
    ini: Math.min(...bloques.map(bloque => hhmmToMin(bloque.inicio))),
    fin: Math.max(...bloques.map(bloque => hhmmToMin(bloque.fin)))
  };
}

// Deriva la escala vertical de los bloques: nada del dataset queda fijo en el código.
function escalaRejilla() {
  const bloques = obtenerBloques();
  const inicios = bloques.map(bloque => hhmmToMin(bloque.inicio));
  const fines = bloques.map(bloque => hhmmToMin(bloque.fin));
  const inicio = Math.min(...inicios);
  const fin = Math.max(...fines);
  let paso = 0;
  inicios.concat(fines).forEach(minuto => {
    paso = mcdEnteros(paso, minuto - inicio);
  });
  return { inicio, fin, paso, filas: (fin - inicio) / paso };
}

// Calcula la fila de inicio y las filas que ocupa una sesión en la rejilla.
function ubicacionSesion(ini, fin, escala) {
  return {
    filaInicio: (ini - escala.inicio) / escala.paso + 1,
    span: (fin - ini) / escala.paso
  };
}

/* ---------- Sesiones de un resultado ---------- */

// Devuelve las entradas { materia, seccion } de un resultado; vacío si no hay resultado.
function normalizarResultado(resultado) {
  return resultado || [];
}

// Convierte un resultado en una lista de sesiones con sus minutos de inicio y fin.
function sesionesDeResultado(resultado) {
  const sesiones = [];
  normalizarResultado(resultado).forEach(({ materia, seccion }) => {
    seccion.horario.forEach(horario => {
      const intervalo = intervaloSesionMin(horario);
      if (!intervalo) return;
      sesiones.push({
        codigo: materia.codigo, nombre: materia.nombre, seccionId: seccion.id,
        profesor: seccion.profesor, dia: horario.dia, aula: horario.aula,
        ini: intervalo.ini, fin: intervalo.fin
      });
    });
  });
  return sesiones;
}

// Devuelve un texto que identifica la combinación de materias y secciones.
function firmaResultado(resultado) {
  return normalizarResultado(resultado)
    .map(entrada => `${entrada.materia.codigo}#${entrada.seccion.id}`)
    .sort()
    .join('|');
}

/* ---------- Métricas (las usa también preferencias.js) ---------- */

// Calcula días de asistencia, horas muertas, entrada más temprana y salida más tardía.
function metricasResultado(resultado) {
  const sesiones = sesionesDeResultado(resultado);
  if (sesiones.length === 0) {
    return { diasAsistencia: 0, horasMuertasMin: 0, entradaMin: null, salidaMin: null };
  }
  const sesionesPorDia = new Map();
  sesiones.forEach(sesion => {
    if (!sesionesPorDia.has(sesion.dia)) sesionesPorDia.set(sesion.dia, []);
    sesionesPorDia.get(sesion.dia).push(sesion);
  });
  let horasMuertasMin = 0;
  sesionesPorDia.forEach(delDia => {
    delDia.sort((a, b) => a.ini - b.ini);
    let finMasTardio = delDia[0].fin;
    for (let i = 1; i < delDia.length; i++) {
      if (delDia[i].ini > finMasTardio) horasMuertasMin += delDia[i].ini - finMasTardio;
      finMasTardio = Math.max(finMasTardio, delDia[i].fin);
    }
  });
  return {
    diasAsistencia: sesionesPorDia.size,
    horasMuertasMin: horasMuertasMin,
    entradaMin: Math.min(...sesiones.map(sesion => sesion.ini)),
    salidaMin: Math.max(...sesiones.map(sesion => sesion.fin))
  };
}

// Convierte minutos en texto: "45 min", "2 h" o "1 h 30 min".
function formatearDuracion(min) {
  const horas = Math.floor(min / 60);
  const minutos = min % 60;
  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas} h`;
  return `${horas} h ${minutos} min`;
}

/* ---------- Color estable por materia (reglas de tokens.css) ---------- */

const coloresMaterias = new Map();

// Asigna un número de color a cada materia nueva, en orden de aparición.
function asignarColoresMaterias(codigos) {
  codigos.forEach(codigo => {
    if (!coloresMaterias.has(codigo)) coloresMaterias.set(codigo, coloresMaterias.size + 1);
  });
}

// Devuelve el slot de color (1 a 8) de una materia.
function slotColorMateria(codigo) {
  asignarColoresMaterias([codigo]);
  return ((coloresMaterias.get(codigo) - 1) % SLOTS_COLOR_MATERIA) + 1;
}

/* ---------- Estado de navegación ---------- */

let resultadosRejilla = [];
let indiceRejilla = 0;
let mensajeVacioRejilla = null;
let elementoActivoRejilla = null;

// Guarda los resultados a mostrar; `opciones.mensajeVacio` ({ titulo, texto })
// reemplaza el aviso por defecto, p. ej. cuando los filtros excluyen todo.
function establecerResultadosRejilla(resultados, opciones = {}) {
  resultadosRejilla = resultados.slice();
  mensajeVacioRejilla = opciones.mensajeVacio || null;
  indiceRejilla = 0;
  resultadosRejilla.forEach(resultado => {
    asignarColoresMaterias(normalizarResultado(resultado).map(entrada => entrada.materia.codigo));
  });
  renderRejilla();
}

// Devuelve el resultado que se está mostrando, o null.
function obtenerResultadoActual() {
  return resultadosRejilla[indiceRejilla] || null;
}

// Pasa a la opción siguiente, si hay.
function irResultadoSiguiente() {
  if (indiceRejilla < resultadosRejilla.length - 1) indiceRejilla++;
  renderRejilla();
}

// Vuelve a la opción anterior, si hay.
function irResultadoAnterior() {
  if (indiceRejilla > 0) indiceRejilla--;
  renderRejilla();
}

// Devuelve el texto "Opción X de Y".
function textoPosicionRejilla() {
  const total = resultadosRejilla.length;
  const posicion = total === 0 ? 0 : indiceRejilla + 1;
  return `Opción ${posicion} de ${total}`;
}

/* ---------- Construcción de la rejilla ---------- */

// Convierte el inicio y fin de una sesión en "HH:MM–HH:MM".
function textoHorasSesion(sesion) {
  return `${minutosAHhmm(sesion.ini)}–${minutosAHhmm(sesion.fin)}`;
}

// Devuelve los minutos que llevan etiqueta de hora en el eje vertical.
function etiquetasEjeRejilla(escala) {
  const bloques = obtenerBloques();
  const regulares = bloques.filter(bloque => bloque.tipo === 'regular');
  const base = regulares.length > 0 ? regulares : bloques;
  const marcas = new Set(base.map(bloque => hhmmToMin(bloque.inicio)));
  return Array.from(marcas).sort((a, b) => a - b).concat(escala.fin);
}

// Coloca un elemento en la columna y fila indicadas de la rejilla CSS.
function ubicarEnGrid(elemento, columna, fila) {
  elemento.style.gridColumn = columna;
  elemento.style.gridRow = fila;
}

// Crea el contenedor con las columnas de días y las filas de la escala.
function crearGridBase(escala) {
  const grid = document.createElement('div');
  grid.className = 'rejilla-grid';
  // Altura por minuto en CSS (--rej-px-minuto) para que print.css pueda reducirla.
  const alto = `max(4px, calc(${escala.paso} * var(--rej-px-minuto, 1.4px)))`;
  grid.style.gridTemplateColumns = `3.5rem repeat(${DIAS_REJILLA.length}, minmax(7rem, 1fr))`;
  grid.style.gridTemplateRows = `auto repeat(${escala.filas}, ${alto})`;
  return grid;
}

// Agrega la esquina y los encabezados de los días.
function agregarCabecerasDias(grid) {
  const esquina = document.createElement('div');
  esquina.className = 'rej-esquina';
  grid.appendChild(esquina);
  DIAS_REJILLA.forEach((dia, i) => {
    const cabecera = document.createElement('div');
    cabecera.className = 'rej-dia';
    cabecera.textContent = dia;
    ubicarEnGrid(cabecera, String(i + 2), '1');
    grid.appendChild(cabecera);
  });
}

// Agrega las horas del eje vertical y sus líneas guía.
function agregarEjeHoras(grid, escala) {
  etiquetasEjeRejilla(escala).forEach(minuto => {
    const fila = (minuto - escala.inicio) / escala.paso;
    if (!Number.isInteger(fila) || fila < 0 || fila > escala.filas) return;
    const esFinal = fila === escala.filas;
    if (!esFinal) {
      const guia = document.createElement('div');
      guia.className = 'rej-guia';
      guia.setAttribute('aria-hidden', 'true');
      ubicarEnGrid(guia, '1 / -1', String(fila + 2));
      grid.appendChild(guia);
    }
    const hora = document.createElement('div');
    hora.className = 'rej-hora';
    if (esFinal) hora.classList.add('final');
    hora.textContent = minutosAHhmm(minuto);
    ubicarEnGrid(hora, '1', String(esFinal ? fila + 1 : fila + 2));
    grid.appendChild(hora);
  });
}

// Crea la caja de una sesión; es un botón si la rejilla es interactiva.
function crearSesionRejilla(sesion, columna, escala, opciones) {
  const { filaInicio, span } = ubicacionSesion(sesion.ini, sesion.fin, escala);
  const slot = slotColorMateria(sesion.codigo);

  const codigo = document.createElement('strong');
  codigo.className = 'rej-sesion-codigo';
  codigo.textContent = sesion.codigo;
  const seccion = document.createElement('span');
  seccion.textContent = `Sec. ${sesion.seccionId}`;
  const aula = document.createElement('span');
  aula.className = 'rej-sesion-aula';
  aula.textContent = sesion.aula;

  const caja = document.createElement(opciones.interactiva ? 'button' : 'div');
  caja.className = 'rej-sesion';
  caja.dataset.slot = slot;
  caja.setAttribute('aria-label',
    `${sesion.codigo} ${sesion.nombre}, sección ${sesion.seccionId}, ${sesion.dia} ${textoHorasSesion(sesion)}, aula ${sesion.aula}`);
  caja.style.setProperty('--rej-color', `var(--materia-${slot})`);
  ubicarEnGrid(caja, String(columna + 2), `${filaInicio + 1} / span ${span}`);
  caja.appendChild(codigo);
  caja.appendChild(seccion);
  caja.appendChild(aula);
  if (opciones.interactiva) {
    caja.type = 'button';
    caja.setAttribute('aria-pressed', 'false');
    caja.addEventListener('click', function () {
      opciones.alSeleccionar(sesion, caja);
    });
  }
  return caja;
}

// Construye la rejilla semanal de un resultado (también la usa resumen.js).
function construirRejilla(resultado, opciones) {
  const escala = escalaRejilla();
  const grid = crearGridBase(escala);
  agregarCabecerasDias(grid);
  agregarEjeHoras(grid, escala);
  sesionesDeResultado(resultado).forEach(sesion => {
    const columna = DIAS_REJILLA.indexOf(sesion.dia);
    if (columna === -1) return;
    grid.appendChild(crearSesionRejilla(sesion, columna, escala, opciones));
  });
  return grid;
}

/* ---------- Métricas en pantalla ---------- */

// Devuelve "HH:MM", o una raya si no hay dato.
function textoHoraMetrica(minutos) {
  if (minutos === null) return '—';
  return minutosAHhmm(minutos);
}

// Dibuja las cuatro métricas del resultado.
function renderMetricasRejilla(resultado) {
  const contenedor = document.getElementById('rej-metricas');
  contenedor.textContent = '';
  if (normalizarResultado(resultado).length === 0) return;
  const metricas = metricasResultado(resultado);
  const datos = [
    ['Días de asistencia', String(metricas.diasAsistencia)],
    ['Horas muertas', formatearDuracion(metricas.horasMuertasMin)],
    ['Entrada más temprana', textoHoraMetrica(metricas.entradaMin)],
    ['Salida más tardía', textoHoraMetrica(metricas.salidaMin)]
  ];
  datos.forEach(([titulo, valor]) => {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'rej-metrica-titulo';
    etiqueta.textContent = titulo;
    const dato = document.createElement('strong');
    dato.textContent = valor;
    const metrica = document.createElement('div');
    metrica.className = 'rej-metrica';
    metrica.appendChild(etiqueta);
    metrica.appendChild(dato);
    contenedor.appendChild(metrica);
  });
}

/* ---------- Panel de detalle ---------- */

// Cierra el panel de detalle y, si se pide, devuelve el foco a la sesión activa.
function cerrarDetalleRejilla(devolverFoco) {
  const detalle = document.getElementById('rej-detalle');
  detalle.classList.remove('abierto');
  detalle.setAttribute('aria-hidden', 'true');
  detalle.textContent = '';
  const elemento = elementoActivoRejilla;
  elementoActivoRejilla = null;
  if (!elemento) return;
  elemento.classList.remove('activa');
  elemento.setAttribute('aria-pressed', 'false');
  if (devolverFoco && elemento.isConnected) elemento.focus();
}

// Crea la lista de datos (código, sección, profesor, día, horario y aula) de una sesión.
function crearDatosDetalle(sesion) {
  const filas = [
    ['Código', sesion.codigo],
    ['Sección', sesion.seccionId],
    ['Profesor', sesion.profesor],
    ['Día', sesion.dia],
    ['Horario', textoHorasSesion(sesion)],
    ['Aula', sesion.aula]
  ];
  const lista = document.createElement('dl');
  lista.className = 'rej-detalle-datos';
  filas.forEach(([titulo, valor]) => {
    const dt = document.createElement('dt');
    dt.textContent = titulo;
    const dd = document.createElement('dd');
    dd.textContent = valor;
    lista.appendChild(dt);
    lista.appendChild(dd);
  });
  return lista;
}

// Abre el detalle de una sesión; pulsar de nuevo la misma sesión lo cierra.
function abrirDetalleRejilla(sesion, elemento) {
  if (elementoActivoRejilla === elemento) {
    cerrarDetalleRejilla(true);
    return;
  }
  cerrarDetalleRejilla(false);
  elementoActivoRejilla = elemento;
  elemento.classList.add('activa');
  elemento.setAttribute('aria-pressed', 'true');

  const titulo = document.createElement('h3');
  titulo.textContent = sesion.nombre;
  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'btn-sel';
  cerrar.textContent = 'Cerrar detalle';
  cerrar.addEventListener('click', function () {
    cerrarDetalleRejilla(true);
  });

  const detalle = document.getElementById('rej-detalle');
  detalle.appendChild(titulo);
  detalle.appendChild(crearDatosDetalle(sesion));
  detalle.appendChild(cerrar);
  detalle.setAttribute('aria-hidden', 'false');
  detalle.classList.add('abierto');
}

/* ---------- Render ---------- */

// Crea el aviso que se muestra cuando no hay horarios.
function crearVacioRejilla() {
  const vacio = mensajeVacioRejilla || {
    titulo: 'Todavía no hay horarios generados',
    texto: 'Usa "Generar horarios" para ver aquí las opciones.'
  };
  const titulo = document.createElement('strong');
  titulo.textContent = vacio.titulo;
  const texto = document.createElement('p');
  texto.textContent = vacio.texto;
  const aviso = document.createElement('div');
  aviso.className = 'estado-vacio muted';
  aviso.appendChild(titulo);
  aviso.appendChild(texto);
  return aviso;
}

// Dibuja la posición, los botones, las métricas y la rejilla; avisa con `rejilla:cambio`.
function renderRejilla() {
  const resultado = obtenerResultadoActual();
  const hayResultado = resultado !== null;
  document.getElementById('rej-pos').textContent = textoPosicionRejilla();
  document.getElementById('rej-anterior').disabled = !hayResultado || indiceRejilla <= 0;
  document.getElementById('rej-siguiente').disabled = !hayResultado || indiceRejilla >= resultadosRejilla.length - 1;
  document.getElementById('btn-definitivo').disabled = !hayResultado;

  cerrarDetalleRejilla(false);
  renderMetricasRejilla(resultado);

  const contenedor = document.getElementById('rej-grid');
  contenedor.textContent = '';
  if (hayResultado) {
    const desplazable = document.createElement('div');
    desplazable.className = 'rej-scroll';
    desplazable.appendChild(construirRejilla(resultado, { interactiva: true, alSeleccionar: abrirDetalleRejilla }));
    contenedor.appendChild(desplazable);
  } else {
    contenedor.appendChild(crearVacioRejilla());
  }
  document.dispatchEvent(new CustomEvent('rejilla:cambio'));
}

/* ---------- Eventos ---------- */

// Conecta los botones de navegación y la tecla Escape.
function inicializarRejilla() {
  document.getElementById('rej-anterior').addEventListener('click', irResultadoAnterior);
  document.getElementById('rej-siguiente').addEventListener('click', irResultadoSiguiente);
  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && elementoActivoRejilla) cerrarDetalleRejilla(true);
  });
  renderRejilla();
}
