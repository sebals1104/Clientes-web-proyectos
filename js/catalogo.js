/* ---------- Estado ---------- */

const LIMITE_CATALOGO = 9;
const catalogoAbiertos = new Set();
let catalogoExpandido = false;

/* ---------- Datos ---------- */

// Devuelve el horario de una sesión como "HH:MM - HH:MM".
function horarioLegibleSesion(sesion) {
  const intervalo = intervaloDeSesion(sesion);
  if (intervalo === null) return '';
  return `${intervalo.inicio} - ${intervalo.fin}`;
}

// Devuelve los trimestres del catálogo, ordenados.
function obtenerTrimestresDisponibles() {
  const trimestres = new Set(obtenerCatalogoCompleto().map(materia => materia.trimestre));
  return Array.from(trimestres).sort((a, b) => a - b);
}

// Indica si la materia fue agregada con el formulario manual.
function esMateriaManual(codigo) {
  return obtenerMateriasManuales().some(materia => materia.codigo === codigo);
}

/* ---------- Filtro de trimestres ---------- */

// Rellena un select con una opción por trimestre y conserva el valor elegido.
function llenarSelectTrimestres(id) {
  const select = document.getElementById(id);
  const valorPrevio = select.value;
  while (select.options.length > 1) select.remove(1);
  obtenerTrimestresDisponibles().forEach(trimestre => {
    const opcion = document.createElement('option');
    opcion.value = String(trimestre);
    opcion.textContent = `Trimestre ${trimestre}`;
    select.appendChild(opcion);
  });
  select.value = valorPrevio;
}

/* ---------- Tarjeta de materia ---------- */

// Crea un <li> con las sesiones de una sección.
function crearSeccionCatalogo(seccion) {
  const titulo = document.createElement('strong');
  titulo.textContent = `Sección ${seccion.id}`;
  const profesor = document.createElement('span');
  profesor.className = 'muted';
  profesor.textContent = ` · ${seccion.profesor || 'Sin profesor'}`;
  const encabezado = document.createElement('div');
  encabezado.appendChild(titulo);
  encabezado.appendChild(profesor);

  const sesiones = document.createElement('ul');
  sesiones.className = 'sel-sesiones';
  seccion.horario.forEach(sesion => {
    const item = document.createElement('li');
    item.textContent = `${sesion.dia} · ${horarioLegibleSesion(sesion)}`;
    if (sesion.aula) item.textContent += ` · ${sesion.aula}`;
    sesiones.appendChild(item);
  });

  const fila = document.createElement('li');
  fila.className = 'cat-seccion';
  fila.appendChild(encabezado);
  fila.appendChild(sesiones);
  return fila;
}

// Crea el desplegable con las secciones y horarios de la materia.
function crearDetalleMateria(materia) {
  const resumen = document.createElement('summary');
  resumen.textContent = 'Ver secciones y horarios';
  const secciones = document.createElement('ul');
  secciones.className = 'cat-secciones';
  materia.secciones.forEach(seccion => secciones.appendChild(crearSeccionCatalogo(seccion)));

  const detalle = document.createElement('details');
  detalle.className = 'cat-detalle';
  detalle.dataset.codigo = materia.codigo;
  detalle.appendChild(resumen);
  detalle.appendChild(secciones);
  detalle.open = catalogoAbiertos.has(materia.codigo);
  detalle.addEventListener('toggle', function () {
    if (detalle.open) catalogoAbiertos.add(materia.codigo);
    else catalogoAbiertos.delete(materia.codigo);
  });
  return detalle;
}

// Crea el botón Agregar/Quitar de la tarjeta.
function crearBotonCatalogo(materia, seleccionada) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-sel';
  boton.dataset.codigo = materia.codigo;
  if (seleccionada) {
    boton.classList.add('activo');
    boton.dataset.accion = 'quitar';
    boton.setAttribute('aria-pressed', 'true');
    boton.setAttribute('aria-label', `Quitar ${materia.nombre} de la selección`);
    boton.textContent = 'Quitar';
  } else {
    boton.dataset.accion = 'agregar';
    boton.setAttribute('aria-pressed', 'false');
    boton.setAttribute('aria-label', `Agregar ${materia.nombre} a la selección`);
    boton.textContent = 'Agregar';
  }
  return boton;
}

// Crea la cabecera de la tarjeta: código, etiquetas y botón.
function crearCabeceraCatalogo(materia, seleccionada) {
  const codigo = document.createElement('strong');
  codigo.className = 'codigo';
  codigo.textContent = materia.codigo;
  const datos = document.createElement('div');
  datos.appendChild(codigo);
  if (esMateriaManual(materia.codigo)) {
    const manual = document.createElement('span');
    manual.className = 'etiqueta etiqueta-manual';
    manual.textContent = 'Manual';
    datos.appendChild(manual);
  }
  if (seleccionada) {
    const activa = document.createElement('span');
    activa.className = 'etiqueta etiqueta-activa';
    activa.textContent = 'Seleccionada';
    datos.appendChild(activa);
  }

  const cabecera = document.createElement('header');
  cabecera.className = 'cat-cabecera';
  cabecera.appendChild(datos);
  cabecera.appendChild(crearBotonCatalogo(materia, seleccionada));
  return cabecera;
}

// Crea la línea "Trimestre N · X UC · M secciones".
function crearResumenMateria(materia) {
  const total = materia.secciones.length;
  const palabra = total === 1 ? 'sección' : 'secciones';
  const resumen = document.createElement('div');
  resumen.className = 'muted';
  resumen.textContent = `Trimestre ${materia.trimestre} · ${materia.uc} UC · ${total} ${palabra}`;
  return resumen;
}

// Crea la tarjeta completa de una materia del catálogo.
function crearTarjetaCatalogo(materia) {
  const seleccionada = estaSeleccionada(materia.codigo);
  const nombre = document.createElement('h3');
  nombre.className = 'cat-nombre';
  nombre.textContent = materia.nombre;

  const tarjeta = document.createElement('article');
  tarjeta.className = 'card cat-card';
  if (seleccionada) tarjeta.classList.add('seleccionada');
  tarjeta.appendChild(crearCabeceraCatalogo(materia, seleccionada));
  tarjeta.appendChild(nombre);
  tarjeta.appendChild(crearResumenMateria(materia));
  tarjeta.appendChild(crearDetalleMateria(materia));
  return tarjeta;
}

// Crea el aviso que se muestra cuando la búsqueda no encuentra materias.
function crearVacioCatalogo() {
  const titulo = document.createElement('strong');
  titulo.textContent = 'Sin resultados';
  const texto = document.createElement('p');
  texto.className = 'muted';
  texto.textContent = 'Ninguna materia coincide con la búsqueda o el trimestre elegido. Pruebe con otro término o quite el filtro.';
  const vacio = document.createElement('div');
  vacio.className = 'estado-vacio';
  vacio.appendChild(titulo);
  vacio.appendChild(texto);
  return vacio;
}

/* ---------- Render ---------- */

// Devuelve el código del botón enfocado dentro de la lista, o null si el foco está fuera.
function codigoConFocoEnCatalogo(lista) {
  const activo = document.activeElement;
  if (!lista.contains(activo) || !activo.dataset.accion) return null;
  return activo.dataset.codigo || null;
}

// Devuelve el foco al botón de la materia indicada.
function restaurarFocoCatalogo(lista, codigo) {
  const botones = lista.querySelectorAll('button[data-codigo]');
  for (const boton of botones) {
    if (boton.dataset.codigo === codigo) {
      boton.focus();
      return;
    }
  }
}

// Dibuja el catálogo según la búsqueda, el trimestre y el límite de materias.
function renderCatalogo() {
  const lista = document.getElementById('catalogo-lista');
  llenarSelectTrimestres('filtro-trimestre');
  llenarSelectTrimestres('sel-trim-completo');
  const filtro = document.getElementById('filtro-trimestre');
  const trimestre = filtro.value === '' ? null : filtro.value;
  const resultado = buscarMaterias({ texto: document.getElementById('busqueda').value, trimestre });

  // Solo se restaura el foco si estaba dentro del catálogo: los botones de la
  // selección también llevan data-codigo y no deben arrastrar el foco hasta aquí.
  const codigoEnFoco = codigoConFocoEnCatalogo(lista);
  document.getElementById('btn-catalogo-mas').hidden = catalogoExpandido || resultado.length <= LIMITE_CATALOGO;
  lista.textContent = '';
  if (resultado.length === 0) {
    lista.appendChild(crearVacioCatalogo());
    return;
  }
  const visibles = catalogoExpandido ? resultado : resultado.slice(0, LIMITE_CATALOGO);
  visibles.forEach(materia => lista.appendChild(crearTarjetaCatalogo(materia)));
  if (codigoEnFoco) restaurarFocoCatalogo(lista, codigoEnFoco);
}

/* ---------- Eventos ---------- */

// Conecta búsqueda, filtro, botón "Más" y clics de la lista.
function inicializarCatalogo() {
  const lista = document.getElementById('catalogo-lista');

  // Una búsqueda o filtro nuevo vuelve a mostrar solo las primeras materias.
  function nuevaBusqueda() {
    catalogoExpandido = false;
    renderCatalogo();
  }
  document.getElementById('busqueda').addEventListener('input', nuevaBusqueda);
  document.getElementById('filtro-trimestre').addEventListener('change', nuevaBusqueda);

  document.getElementById('btn-catalogo-mas').addEventListener('click', function () {
    catalogoExpandido = true;
    renderCatalogo();
    // El botón se oculta: el foco pasa a la primera materia que acaba de aparecer.
    const primeraNueva = lista.querySelectorAll('button[data-accion]')[LIMITE_CATALOGO];
    if (primeraNueva) primeraNueva.focus();
  });

  lista.addEventListener('click', function (evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;
    let resultado;
    if (boton.dataset.accion === 'quitar') resultado = quitarMateriaSeleccion(boton.dataset.codigo);
    else resultado = agregarMateriaSeleccion(boton.dataset.codigo);
    mostrarMensajeSeleccion(resultado.mensaje, resultado.ok ? 'ok' : 'error');
  });

  suscribirCambioSeleccion(renderCatalogo);
  renderCatalogo();
}
