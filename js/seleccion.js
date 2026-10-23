/* ---------- Estado ---------- */

const TOPE_UC_POR_DEFECTO = 28;

let topeUc = TOPE_UC_POR_DEFECTO;
let seleccion = [];
let mensajeSeleccion = { texto: '', tipo: 'muted' };
const suscriptoresSeleccion = [];
const seleccionExpandidas = new Set();

/* ---------- Consultas ---------- */

// Suma las UC de las materias seleccionadas.
function totalUcSeleccion() {
  return seleccion.reduce((suma, entrada) => {
    const materia = obtenerMateriaPorCodigo(entrada.codigo);
    return suma + (materia ? materia.uc : 0);
  }, 0);
}

// Devuelve la entrada de la selección con ese código, o null.
function buscarEntrada(codigo) {
  return seleccion.find(entrada => entrada.codigo === codigo) || null;
}

// Indica si la materia está en la selección.
function estaSeleccionada(codigo) {
  return buscarEntrada(codigo) !== null;
}

// Devuelve una copia de la selección para que nadie la modifique desde fuera.
function obtenerSeleccion() {
  return seleccion.map(entrada => ({
    codigo: entrada.codigo,
    seccionFijada: entrada.seccionFijada,
    seccionesExcluidas: entrada.seccionesExcluidas.slice()
  }));
}

// Devuelve una sección de una materia, o null si no existe.
function buscarSeccion(codigo, seccionId) {
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!materia) return null;
  return materia.secciones.find(seccion => seccion.id === seccionId) || null;
}

// Devuelve las secciones que el generador puede usar para la materia.
function seccionesDisponibles(codigo) {
  const entrada = buscarEntrada(codigo);
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!entrada || !materia) return [];
  if (entrada.seccionFijada !== null) {
    return materia.secciones.filter(seccion => seccion.id === entrada.seccionFijada);
  }
  return materia.secciones.filter(seccion => !entrada.seccionesExcluidas.includes(seccion.id));
}

/* ---------- Suscriptores ---------- */

// Registra una función que se llama cada vez que cambia la selección.
function suscribirCambioSeleccion(callback) {
  suscriptoresSeleccion.push(callback);
}

// Redibuja la selección y avisa a los suscriptores.
function notificarCambioSeleccion() {
  renderSeleccion();
  suscriptoresSeleccion.forEach(callback => callback());
}

/* ---------- Acciones sobre la selección ---------- */

// Cambia el tope de UC si es un entero positivo y no es menor al total elegido.
function establecerTopeUc(valor) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return { ok: false, mensaje: 'El tope de UC debe ser un número entero positivo.' };
  }
  const total = totalUcSeleccion();
  if (numero < total) {
    return { ok: false, mensaje: `El tope (${numero} UC) no puede ser menor al total seleccionado (${total} UC).` };
  }
  topeUc = numero;
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Tope actualizado a ${numero} UC.` };
}

// Agrega una materia si existe, no está repetida y cabe en el tope.
function agregarMateriaSeleccion(codigo) {
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!materia) return { ok: false, mensaje: `La materia ${codigo} no existe en el catálogo.` };
  if (estaSeleccionada(codigo)) return { ok: false, mensaje: `La materia ${codigo} ya está seleccionada.` };
  const resultante = totalUcSeleccion() + materia.uc;
  if (resultante > topeUc) {
    const exceso = resultante - topeUc;
    return {
      ok: false,
      mensaje: `No se puede agregar ${codigo}: excede el tope en ${exceso} UC.`,
      ucExcedidas: exceso
    };
  }
  seleccion.push({ codigo: codigo, seccionFijada: null, seccionesExcluidas: [] });
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Materia ${codigo} agregada.` };
}

// Quita una materia de la selección.
function quitarMateriaSeleccion(codigo) {
  const posicion = seleccion.findIndex(entrada => entrada.codigo === codigo);
  if (posicion === -1) return { ok: false, mensaje: `La materia ${codigo} no está seleccionada.` };
  seleccion.splice(posicion, 1);
  seleccionExpandidas.delete(codigo);
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Materia ${codigo} quitada.` };
}

// Agrega todas las materias pendientes de un trimestre, o ninguna si exceden el tope.
function agregarTrimestreCompleto(trimestre) {
  const numero = Number(trimestre);
  if (trimestre === '' || trimestre === null || !Number.isFinite(numero)) {
    return { ok: false, mensaje: 'Seleccione un trimestre.' };
  }
  const pendientes = obtenerCatalogoCompleto().filter(materia => materia.trimestre === numero && !estaSeleccionada(materia.codigo));
  if (pendientes.length === 0) {
    return { ok: false, mensaje: `No hay materias pendientes por agregar en el trimestre ${numero}.` };
  }
  const resultante = totalUcSeleccion() + pendientes.reduce((suma, materia) => suma + materia.uc, 0);
  if (resultante > topeUc) {
    const exceso = resultante - topeUc;
    return {
      ok: false,
      mensaje: `No se agregó el trimestre ${numero}: excedería el tope en ${exceso} UC.`,
      ucExcedidas: exceso
    };
  }
  pendientes.forEach(materia => {
    seleccion.push({ codigo: materia.codigo, seccionFijada: null, seccionesExcluidas: [] });
  });
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Se agregaron ${pendientes.length} materias del trimestre ${numero}.` };
}

// Elige una sección concreta para la materia.
function fijarSeccion(codigo, seccionId) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: `La materia ${codigo} no está seleccionada.` };
  if (!buscarSeccion(codigo, seccionId)) {
    return { ok: false, mensaje: `La sección ${seccionId} no existe en ${codigo}.` };
  }
  if (entrada.seccionesExcluidas.includes(seccionId)) {
    return { ok: false, mensaje: `La sección ${seccionId} está excluida; inclúyala antes de elegirla.` };
  }
  entrada.seccionFijada = seccionId;
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Clase elegida en ${codigo}: sección ${seccionId}.` };
}

// Quita la sección elegida de la materia.
function quitarFijadoSeccion(codigo) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: `La materia ${codigo} no está seleccionada.` };
  if (entrada.seccionFijada === null) return { ok: false, mensaje: `La materia ${codigo} no tiene una clase elegida.` };
  entrada.seccionFijada = null;
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Se quitó la clase elegida de ${codigo}.` };
}

// Excluye o vuelve a incluir una sección; siempre debe quedar al menos una.
function alternarExclusionSeccion(codigo, seccionId) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: `La materia ${codigo} no está seleccionada.` };
  if (!buscarSeccion(codigo, seccionId)) {
    return { ok: false, mensaje: `La sección ${seccionId} no existe en ${codigo}.` };
  }
  const posicion = entrada.seccionesExcluidas.indexOf(seccionId);
  if (posicion !== -1) {
    entrada.seccionesExcluidas.splice(posicion, 1);
    notificarCambioSeleccion();
    return { ok: true, mensaje: `Sección ${seccionId} incluida de nuevo en ${codigo}.` };
  }
  const materia = obtenerMateriaPorCodigo(codigo);
  if (materia.secciones.length - entrada.seccionesExcluidas.length <= 1) {
    return { ok: false, mensaje: `No se puede excluir la última sección disponible de ${codigo}.` };
  }
  entrada.seccionesExcluidas.push(seccionId);
  if (entrada.seccionFijada === seccionId) entrada.seccionFijada = null;
  notificarCambioSeleccion();
  return { ok: true, mensaje: `Sección ${seccionId} excluida de ${codigo}.` };
}

/* ---------- Compatibilidad ---------- */

// Se mantiene porque formulario.js y app.js todavía la usan; los demás archivos no.
function crearElemento(etiqueta, atributos, hijos) {
  const nodo = document.createElement(etiqueta);
  Object.keys(atributos || {}).forEach(clave => {
    const valor = atributos[clave];
    if (valor === null || valor === undefined || valor === false) return;
    if (clave === 'texto') nodo.textContent = valor;
    else if (clave === 'clase') nodo.className = valor;
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  });
  (hijos || []).forEach(h => {
    if (h) nodo.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
  });
  return nodo;
}

/* ---------- Mensajes ---------- */

// Guarda y muestra el mensaje de la selección.
function mostrarMensajeSeleccion(texto, tipo) {
  mensajeSeleccion = { texto: texto || '', tipo: tipo || 'muted' };
  const contenedor = document.getElementById('sel-msg');
  contenedor.textContent = mensajeSeleccion.texto;
  contenedor.className = `sel-msg ${mensajeSeleccion.tipo}`;
}

// Muestra como mensaje el resultado { ok, mensaje } de una acción.
function reportarResultado(resultado) {
  mostrarMensajeSeleccion(resultado.mensaje, resultado.ok ? 'ok' : 'error');
}

/* ---------- Fila de sección ---------- */

// Crea el botón "Elegir esta clase" / "Quitar elección".
function crearBotonFijar(entrada, seccion, fijada, excluida) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-sel';
  boton.dataset.accion = 'fijar';
  boton.dataset.codigo = entrada.codigo;
  boton.dataset.seccion = seccion.id;
  boton.dataset.foco = `${entrada.codigo}|${seccion.id}|fijar`;
  boton.disabled = excluida;
  if (fijada) {
    boton.classList.add('activo');
    boton.setAttribute('aria-pressed', 'true');
    boton.textContent = 'Quitar elección';
  } else {
    boton.setAttribute('aria-pressed', 'false');
    boton.textContent = 'Elegir esta clase';
  }
  return boton;
}

// Crea el botón "Excluir" / "Incluir"; se desactiva si es la última sección disponible.
function crearBotonExcluir(entrada, seccion, excluida, esUltima) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-sel';
  boton.dataset.accion = 'excluir';
  boton.dataset.codigo = entrada.codigo;
  boton.dataset.seccion = seccion.id;
  boton.dataset.foco = `${entrada.codigo}|${seccion.id}|excluir`;
  boton.disabled = esUltima;
  if (esUltima) boton.title = 'Debe quedar al menos una sección disponible';
  if (excluida) {
    boton.setAttribute('aria-pressed', 'true');
    boton.textContent = 'Incluir';
  } else {
    boton.setAttribute('aria-pressed', 'false');
    boton.textContent = 'Excluir';
  }
  return boton;
}

// Crea la lista con los días, horas y aula de una sección.
function crearSesionesSeleccion(seccion) {
  const lista = document.createElement('ul');
  lista.className = 'sel-sesiones';
  seccion.horario.forEach(sesion => {
    const item = document.createElement('li');
    item.textContent = `${sesion.dia} ${horarioLegibleSesion(sesion)}`;
    if (sesion.aula) item.textContent += ` · ${sesion.aula}`;
    lista.appendChild(item);
  });
  return lista;
}

// Crea el título de la sección con su profesor y su estado (Elegida / Excluida).
function crearTituloSeccion(seccion, fijada, excluida) {
  const numero = document.createElement('strong');
  numero.textContent = `Sección ${seccion.id}`;
  const profesor = document.createElement('span');
  profesor.className = 'muted';
  profesor.textContent = ` · ${seccion.profesor || 'Sin profesor'}`;
  const titulo = document.createElement('div');
  titulo.className = 'sel-seccion-titulo';
  titulo.appendChild(numero);
  titulo.appendChild(profesor);
  if (fijada || excluida) {
    const estado = document.createElement('span');
    if (fijada) {
      estado.className = 'etiqueta etiqueta-activa';
      estado.textContent = 'Elegida';
    } else {
      estado.className = 'etiqueta etiqueta-excluida';
      estado.textContent = 'Excluida';
    }
    titulo.appendChild(estado);
  }
  return titulo;
}

// Crea la fila de una sección con sus datos y sus dos botones.
function crearFilaSeccion(entrada, seccion, totalNoExcluidas) {
  const fijada = entrada.seccionFijada === seccion.id;
  const excluida = entrada.seccionesExcluidas.includes(seccion.id);
  const esUltima = !excluida && totalNoExcluidas <= 1;

  const info = document.createElement('div');
  info.className = 'sel-seccion-info';
  info.appendChild(crearTituloSeccion(seccion, fijada, excluida));
  info.appendChild(crearSesionesSeleccion(seccion));

  const acciones = document.createElement('div');
  acciones.className = 'sel-seccion-acciones';
  acciones.appendChild(crearBotonFijar(entrada, seccion, fijada, excluida));
  acciones.appendChild(crearBotonExcluir(entrada, seccion, excluida, esUltima));

  const fila = document.createElement('li');
  fila.className = 'sel-seccion';
  if (fijada) fila.classList.add('fijada');
  if (excluida) fila.classList.add('excluida');
  fila.appendChild(info);
  fila.appendChild(acciones);
  return fila;
}

/* ---------- Tarjeta de materia seleccionada ---------- */

// Crea el botón "Quitar" de la materia.
function crearBotonQuitar(materia) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-sel peligro';
  boton.dataset.accion = 'quitar';
  boton.dataset.codigo = materia.codigo;
  boton.dataset.foco = `${materia.codigo}|quitar`;
  boton.setAttribute('aria-label', `Quitar ${materia.nombre} de la selección`);
  boton.textContent = 'Quitar';
  return boton;
}

// Crea la cabecera de la tarjeta: datos de la materia y botón "Quitar".
function crearCabeceraSeleccion(materia) {
  const codigo = document.createElement('strong');
  codigo.className = 'codigo';
  codigo.textContent = materia.codigo;
  const nombre = document.createElement('div');
  nombre.textContent = materia.nombre;
  const detalle = document.createElement('div');
  detalle.className = 'muted';
  detalle.textContent = `Trimestre ${materia.trimestre} · ${materia.uc} UC`;
  const datos = document.createElement('div');
  datos.appendChild(codigo);
  datos.appendChild(nombre);
  datos.appendChild(detalle);

  const cabecera = document.createElement('header');
  cabecera.className = 'sel-card-cabecera';
  cabecera.appendChild(datos);
  cabecera.appendChild(crearBotonQuitar(materia));
  return cabecera;
}

// Crea la pista que indica cuántas secciones probará el generador.
function crearPistaSeleccion(totalNoExcluidas) {
  const palabra = totalNoExcluidas === 1 ? 'sección' : 'secciones';
  const pista = document.createElement('p');
  pista.className = 'muted sel-pista';
  pista.textContent = `Sin clase elegida: el generador probará ${totalNoExcluidas} ${palabra}.`;
  return pista;
}

// Crea el botón "Cambiar clase" / "Ocultar otras clases".
function crearBotonCambiar(codigo, expandida) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-sel sel-cambiar';
  boton.dataset.accion = 'cambiar';
  boton.dataset.codigo = codigo;
  boton.dataset.foco = `${codigo}|cambiar`;
  if (expandida) {
    boton.setAttribute('aria-expanded', 'true');
    boton.textContent = 'Ocultar otras clases';
  } else {
    boton.setAttribute('aria-expanded', 'false');
    boton.textContent = 'Cambiar clase';
  }
  return boton;
}

// Crea la tarjeta de una materia seleccionada, o null si la materia ya no existe.
function crearTarjetaSeleccion(entrada) {
  const materia = obtenerMateriaPorCodigo(entrada.codigo);
  if (!materia) return null;
  const totalNoExcluidas = materia.secciones.length - entrada.seccionesExcluidas.length;
  const hayClaseElegida = entrada.seccionFijada !== null;
  const expandida = hayClaseElegida && seleccionExpandidas.has(entrada.codigo);
  if (!hayClaseElegida) seleccionExpandidas.delete(entrada.codigo);

  // Con una clase elegida solo se muestra esa, salvo que se pida ver las demás.
  let visibles = materia.secciones;
  if (hayClaseElegida && !expandida) {
    visibles = materia.secciones.filter(seccion => seccion.id === entrada.seccionFijada);
  }
  const secciones = document.createElement('ul');
  secciones.className = 'sel-secciones';
  visibles.forEach(seccion => secciones.appendChild(crearFilaSeccion(entrada, seccion, totalNoExcluidas)));

  const tarjeta = document.createElement('article');
  tarjeta.className = 'card sel-card';
  tarjeta.appendChild(crearCabeceraSeleccion(materia));
  if (!hayClaseElegida) tarjeta.appendChild(crearPistaSeleccion(totalNoExcluidas));
  tarjeta.appendChild(secciones);
  if (hayClaseElegida) tarjeta.appendChild(crearBotonCambiar(entrada.codigo, expandida));
  return tarjeta;
}

/* ---------- Render ---------- */

// Crea el aviso que se muestra cuando no hay materias seleccionadas.
function crearVacioSeleccion() {
  const titulo = document.createElement('strong');
  titulo.textContent = 'Aún no hay materias seleccionadas';
  const texto = document.createElement('p');
  texto.className = 'muted';
  texto.textContent = 'Agregue materias desde el catálogo o use el atajo de trimestre completo.';
  const vacio = document.createElement('div');
  vacio.className = 'estado-vacio';
  vacio.appendChild(titulo);
  vacio.appendChild(texto);
  return vacio;
}

// Devuelve el foco al botón que lo tenía antes de redibujar, si sigue habilitado.
function restaurarFocoSeleccion(lista, clave) {
  const botones = Array.from(lista.querySelectorAll('[data-foco]'));
  const nuevo = botones.find(boton => boton.dataset.foco === clave);
  if (nuevo && !nuevo.disabled) nuevo.focus();
}

// Dibuja los totales, la lista de materias seleccionadas y el mensaje.
function renderSeleccion() {
  document.getElementById('sel-cant').textContent = String(seleccion.length);
  document.getElementById('sel-uc').textContent = String(totalUcSeleccion());
  document.getElementById('sel-tope').textContent = String(topeUc);
  const campoTope = document.getElementById('tope-uc');
  if (document.activeElement !== campoTope) campoTope.value = String(topeUc);

  const lista = document.getElementById('sel-lista');
  const claveEnFoco = document.activeElement.dataset.foco;
  lista.textContent = '';
  if (seleccion.length === 0) {
    lista.appendChild(crearVacioSeleccion());
  } else {
    seleccion.forEach(entrada => {
      const tarjeta = crearTarjetaSeleccion(entrada);
      if (tarjeta) lista.appendChild(tarjeta);
    });
  }
  if (claveEnFoco) restaurarFocoSeleccion(lista, claveEnFoco);
  mostrarMensajeSeleccion(mensajeSeleccion.texto, mensajeSeleccion.tipo);
}

/* ---------- Eventos ---------- */

// Atiende un clic en un botón de la lista de materias seleccionadas.
function atenderClicSeleccion(boton) {
  const codigo = boton.dataset.codigo;
  const seccion = boton.dataset.seccion;
  const accion = boton.dataset.accion;
  if (accion === 'cambiar') {
    if (!seleccionExpandidas.delete(codigo)) seleccionExpandidas.add(codigo);
    renderSeleccion();
    return;
  }
  let resultado;
  if (accion === 'quitar') {
    resultado = quitarMateriaSeleccion(codigo);
  } else if (accion === 'excluir') {
    resultado = alternarExclusionSeccion(codigo, seccion);
  } else if (accion === 'fijar') {
    seleccionExpandidas.delete(codigo);
    if (buscarEntrada(codigo).seccionFijada === seccion) resultado = quitarFijadoSeccion(codigo);
    else resultado = fijarSeccion(codigo, seccion);
  }
  if (resultado) reportarResultado(resultado);
}

// Conecta el tope de UC, el atajo de trimestre y los clics de la lista.
function inicializarSeleccion() {
  const campoTope = document.getElementById('tope-uc');
  campoTope.value = String(topeUc);
  campoTope.addEventListener('change', function () {
    const resultado = establecerTopeUc(campoTope.value);
    campoTope.value = String(topeUc);
    reportarResultado(resultado);
  });

  const selectTrimestre = document.getElementById('sel-trim-completo');
  document.getElementById('btn-agregar-trim').addEventListener('click', function () {
    reportarResultado(agregarTrimestreCompleto(selectTrimestre.value));
  });

  document.getElementById('sel-lista').addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton || boton.disabled) return;
    atenderClicSeleccion(boton);
  });

  renderSeleccion();
}
