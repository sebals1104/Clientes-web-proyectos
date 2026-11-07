/* ---------- Estado ---------- */

const ETIQUETA_DEFINITIVO_ACTIVO = 'Es tu horario definitivo';

let horarioDefinitivo = null;
let etiquetaDefinitivoOriginal = '';
const suscriptoresResumen = [];

/* ---------- Suscriptores ---------- */

// Registra una función que se llama cada vez que cambia el horario definitivo.
function suscribirCambioResumen(callback) {
  suscriptoresResumen.push(callback);
}

// Avisa a los suscriptores; un fallo en uno no impide avisar a los demás.
function notificarCambioResumen(detalle) {
  suscriptoresResumen.forEach(callback => {
    try {
      callback(detalle || {});
    } catch (error) {
      console.error('Fallo en un manejador del resumen:', error);
    }
  });
}

/* ---------- Lógica ---------- */

// Convierte un resultado en una fila por materia, con sus sesiones ordenadas por día y hora.
function filasResumen(resultado) {
  return normalizarResultado(resultado).map(({ materia, seccion }) => {
    const sesiones = [];
    seccion.horario.forEach(horario => {
      const intervalo = intervaloSesionMin(horario);
      if (!intervalo) return;
      sesiones.push({ dia: horario.dia, ini: intervalo.ini, fin: intervalo.fin, aula: horario.aula });
    });
    sesiones.sort((a, b) => (DIAS_REJILLA.indexOf(a.dia) - DIAS_REJILLA.indexOf(b.dia)) || (a.ini - b.ini));
    return {
      codigo: materia.codigo, nombre: materia.nombre, seccion: seccion.id,
      profesor: seccion.profesor, uc: materia.uc,
      sesiones: sesiones.map(s => ({ dia: s.dia, inicio: minutosAHhmm(s.ini), fin: minutosAHhmm(s.fin), aula: s.aula }))
    };
  });
}

// Suma las UC de las filas.
function totalUcResumen(filas) {
  return filas.reduce((suma, fila) => suma + fila.uc, 0);
}

// Guarda una copia del resultado como horario definitivo y avisa del cambio.
function elegirHorarioDefinitivo(resultado) {
  const entradas = normalizarResultado(resultado);
  if (entradas.length === 0) {
    return { ok: false, mensaje: 'No hay un horario válido para elegir como definitivo.' };
  }
  // Copia profunda: el definitivo no depende de cambios posteriores del catálogo.
  const copia = JSON.parse(JSON.stringify(entradas));
  const filas = filasResumen(copia);
  horarioDefinitivo = { resultado: copia, filas, totalUc: totalUcResumen(filas) };
  renderResumen();
  notificarCambioResumen({ definido: true, filas: filas.length, totalUc: horarioDefinitivo.totalUc });
  return { ok: true, mensaje: `Horario definitivo guardado: ${filas.length} materias, ${horarioDefinitivo.totalUc} UC.` };
}

// Devuelve el horario definitivo, o null si no hay.
function obtenerHorarioDefinitivo() {
  return horarioDefinitivo;
}

// Indica si el resultado tiene las mismas materias y secciones que el definitivo.
function esHorarioDefinitivo(resultado) {
  if (horarioDefinitivo === null) return false;
  return firmaResultado(resultado) === firmaResultado(horarioDefinitivo.resultado);
}

// Quita el horario definitivo y avisa del cambio.
function borrarHorarioDefinitivo() {
  horarioDefinitivo = null;
  renderResumen();
  notificarCambioResumen({ definido: false });
}

/* ---------- Tabla ---------- */

// Crea una celda <td> con texto.
function crearCelda(texto, clase) {
  const celda = document.createElement('td');
  celda.textContent = texto;
  if (clase) celda.className = clase;
  return celda;
}

// Crea una celda con una lista <ul>; `textoDe` decide el texto de cada sesión.
function crearCeldaLista(sesiones, textoDe) {
  const lista = document.createElement('ul');
  lista.className = 'res-lista';
  sesiones.forEach(sesion => {
    const item = document.createElement('li');
    item.textContent = textoDe(sesion);
    lista.appendChild(item);
  });
  const celda = document.createElement('td');
  celda.appendChild(lista);
  return celda;
}

// Crea la fila de una materia del horario definitivo.
function crearFilaResumen(fila) {
  const slot = slotColorMateria(fila.codigo);
  const muestra = document.createElement('span');
  muestra.className = 'res-muestra';
  muestra.setAttribute('aria-hidden', 'true');
  muestra.dataset.slot = slot;
  muestra.style.setProperty('--rej-color', `var(--materia-${slot})`);

  const codigo = document.createElement('th');
  codigo.scope = 'row';
  codigo.className = 'res-codigo';
  codigo.appendChild(muestra);
  codigo.appendChild(document.createTextNode(fila.codigo));

  const tr = document.createElement('tr');
  tr.appendChild(codigo);
  tr.appendChild(crearCelda(fila.nombre));
  tr.appendChild(crearCelda(fila.seccion));
  tr.appendChild(crearCelda(fila.profesor));
  tr.appendChild(crearCeldaLista(fila.sesiones, sesion => `${sesion.dia} ${sesion.inicio}–${sesion.fin}`));
  tr.appendChild(crearCeldaLista(fila.sesiones, sesion => sesion.aula));
  tr.appendChild(crearCelda(String(fila.uc), 'res-num'));
  return tr;
}

// Crea la fila de encabezados de la tabla.
function crearEncabezadoTabla() {
  const fila = document.createElement('tr');
  ['Código', 'Nombre', 'Sección', 'Profesor', 'Horario', 'Aula', 'UC'].forEach(titulo => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = titulo;
    fila.appendChild(th);
  });
  const thead = document.createElement('thead');
  thead.appendChild(fila);
  return thead;
}

// Crea el pie de la tabla con el total de UC.
function crearPieTabla(totalUc) {
  const titulo = document.createElement('th');
  titulo.scope = 'row';
  titulo.colSpan = 6;
  titulo.textContent = 'Total de unidades de crédito';
  const fila = document.createElement('tr');
  fila.appendChild(titulo);
  fila.appendChild(crearCelda(String(totalUc), 'res-num'));
  const tfoot = document.createElement('tfoot');
  tfoot.appendChild(fila);
  return tfoot;
}

// Crea la tabla del horario definitivo.
function construirTablaResumen(definitivo) {
  const caption = document.createElement('caption');
  caption.textContent = 'Materias del horario definitivo';
  const tbody = document.createElement('tbody');
  definitivo.filas.forEach(fila => tbody.appendChild(crearFilaResumen(fila)));

  const tabla = document.createElement('table');
  tabla.className = 'res-tabla';
  tabla.appendChild(caption);
  tabla.appendChild(crearEncabezadoTabla());
  tabla.appendChild(tbody);
  tabla.appendChild(crearPieTabla(definitivo.totalUc));
  return tabla;
}

/* ---------- Render ---------- */

// Crea el aviso que se muestra cuando todavía no hay horario definitivo.
function crearVacioResumen() {
  const titulo = document.createElement('strong');
  titulo.textContent = 'Aún no eliges un horario definitivo';
  const texto = document.createElement('p');
  texto.textContent = 'Elige una opción en la rejilla con «Elegir como horario definitivo».';
  const vacio = document.createElement('div');
  vacio.className = 'estado-vacio muted';
  vacio.appendChild(titulo);
  vacio.appendChild(texto);
  return vacio;
}

// Dibuja la rejilla, la tabla y el total del horario definitivo.
function renderResumen() {
  const definitivo = obtenerHorarioDefinitivo();
  const rejilla = document.getElementById('res-rejilla');
  const tabla = document.getElementById('res-tabla');
  const total = document.getElementById('res-total');
  const quitar = document.getElementById('btn-quitar-definitivo');
  rejilla.textContent = '';
  tabla.textContent = '';
  document.getElementById('btn-imprimir').disabled = !definitivo;
  if (quitar) quitar.disabled = !definitivo;
  if (definitivo) {
    const desplazable = document.createElement('div');
    desplazable.className = 'rej-scroll';
    desplazable.appendChild(construirRejilla(definitivo.resultado, { interactiva: false }));
    rejilla.appendChild(desplazable);
    tabla.appendChild(construirTablaResumen(definitivo));
    total.textContent = `${definitivo.filas.length} materias · ${definitivo.totalUc} UC`;
  } else {
    total.textContent = '';
    tabla.appendChild(crearVacioResumen());
  }
  actualizarBotonDefinitivo();
}

// Cambia el texto y el estado del botón "Elegir como horario definitivo".
function actualizarBotonDefinitivo() {
  const boton = document.getElementById('btn-definitivo');
  const actual = obtenerResultadoActual();
  const esDefinitivo = actual !== null && esHorarioDefinitivo(actual);
  if (esDefinitivo) boton.textContent = ETIQUETA_DEFINITIVO_ACTIVO;
  else boton.textContent = etiquetaDefinitivoOriginal;
  boton.classList.toggle('activo', esDefinitivo);
  boton.disabled = actual === null || esDefinitivo;
}

// Muestra un aviso bajo los controles del resumen.
function mostrarMensajeResumen(texto, tipo) {
  const mensaje = document.getElementById('res-mensaje');
  mensaje.textContent = texto;
  // Conserva no-print: el aviso es parte de los controles, no del resumen impreso.
  if (texto) mensaje.className = `res-mensaje no-print ${tipo}`;
  else mensaje.className = 'res-mensaje no-print';
}

/* ---------- Eventos ---------- */

// Elige el resultado actual como definitivo y lleva el foco al resumen.
function alElegirDefinitivo() {
  const resultado = elegirHorarioDefinitivo(obtenerResultadoActual());
  mostrarMensajeResumen(resultado.mensaje, resultado.ok ? 'ok' : 'error');
  if (!resultado.ok) return;
  const seccion = document.getElementById('sec-resumen');
  const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  seccion.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'start' });
  seccion.querySelector('h2').focus({ preventScroll: true });
}

// Crea el botón y el aviso del resumen y conecta los botones de elegir e imprimir.
function inicializarResumen() {
  const seccion = document.getElementById('sec-resumen');
  const controles = seccion.querySelector('.no-print');
  seccion.querySelector('h2').setAttribute('tabindex', '-1');

  const quitar = document.createElement('button');
  quitar.id = 'btn-quitar-definitivo';
  quitar.type = 'button';
  quitar.className = 'secondary';
  quitar.textContent = 'Quitar horario definitivo';
  quitar.addEventListener('click', function () {
    borrarHorarioDefinitivo();
    mostrarMensajeResumen('Se quitó el horario definitivo.', 'ok');
  });
  controles.appendChild(quitar);

  const mensaje = document.createElement('div');
  mensaje.id = 'res-mensaje';
  mensaje.className = 'res-mensaje no-print';
  mensaje.setAttribute('role', 'status');
  controles.insertAdjacentElement('afterend', mensaje);

  const botonDefinitivo = document.getElementById('btn-definitivo');
  etiquetaDefinitivoOriginal = botonDefinitivo.textContent;
  botonDefinitivo.addEventListener('click', alElegirDefinitivo);
  document.getElementById('btn-imprimir').addEventListener('click', function () {
    window.print();
  });
  document.addEventListener('rejilla:cambio', actualizarBotonDefinitivo);
  renderResumen();
}
