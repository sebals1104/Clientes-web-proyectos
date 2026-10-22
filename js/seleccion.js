var TOPE_UC_POR_DEFECTO = 28;

let topeUc = TOPE_UC_POR_DEFECTO;
let seleccion = [];
let mensajeSeleccion = { texto: '', tipo: 'muted' };
const suscriptoresSeleccion = [];
const seleccionExpandidas = new Set();

function obtenerTopeUc() {
  return topeUc;
}

function totalUcSeleccion() {
  return seleccion.reduce((suma, e) => {
    const m = obtenerMateriaPorCodigo(e.codigo);
    return suma + (m ? m.uc : 0);
  }, 0);
}

function buscarEntrada(codigo) {
  return seleccion.find(e => e.codigo === codigo) || null;
}

function estaSeleccionada(codigo) {
  return buscarEntrada(codigo) !== null;
}

function obtenerSeleccion() {
  return seleccion.map(e => ({
    codigo: e.codigo,
    seccionFijada: e.seccionFijada,
    seccionesExcluidas: e.seccionesExcluidas.slice()
  }));
}

function suscribirCambioSeleccion(callback) {
  if (typeof callback === 'function') suscriptoresSeleccion.push(callback);
}

function notificarCambioSeleccion() {
  renderSeleccion();
  suscriptoresSeleccion.forEach(cb => cb());
}

function establecerTopeUc(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : valor;
  const numero = typeof texto === 'string' && texto === '' ? NaN : Number(texto);
  if (!Number.isInteger(numero) || numero <= 0) {
    return { ok: false, mensaje: 'El tope de UC debe ser un número entero positivo.' };
  }
  const total = totalUcSeleccion();
  if (numero < total) {
    return { ok: false, mensaje: 'El tope (' + numero + ' UC) no puede ser menor al total seleccionado (' + total + ' UC).' };
  }
  topeUc = numero;
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Tope actualizado a ' + numero + ' UC.' };
}

function agregarMateriaSeleccion(codigo) {
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!materia) return { ok: false, mensaje: 'La materia ' + codigo + ' no existe en el catálogo.' };
  if (estaSeleccionada(codigo)) return { ok: false, mensaje: 'La materia ' + codigo + ' ya está seleccionada.' };
  const resultante = totalUcSeleccion() + materia.uc;
  if (resultante > topeUc) {
    const exceso = resultante - topeUc;
    return {
      ok: false,
      mensaje: 'No se puede agregar ' + codigo + ': excede el tope en ' + exceso + ' UC.',
      ucExcedidas: exceso
    };
  }
  seleccion.push({ codigo: codigo, seccionFijada: null, seccionesExcluidas: [] });
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Materia ' + codigo + ' agregada.' };
}

function quitarMateriaSeleccion(codigo) {
  const idx = seleccion.findIndex(e => e.codigo === codigo);
  if (idx === -1) return { ok: false, mensaje: 'La materia ' + codigo + ' no está seleccionada.' };
  seleccion.splice(idx, 1);
  seleccionExpandidas.delete(codigo);
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Materia ' + codigo + ' quitada.' };
}

function agregarTrimestreCompleto(trimestre) {
  const numero = Number(trimestre);
  if (trimestre === '' || trimestre === null || trimestre === undefined || !Number.isFinite(numero)) {
    return { ok: false, mensaje: 'Seleccione un trimestre.' };
  }
  const pendientes = obtenerCatalogoCompleto().filter(m => m.trimestre === numero && !estaSeleccionada(m.codigo));
  if (pendientes.length === 0) {
    return { ok: false, mensaje: 'No hay materias pendientes por agregar en el trimestre ' + numero + '.' };
  }
  const resultante = totalUcSeleccion() + pendientes.reduce((s, m) => s + m.uc, 0);
  if (resultante > topeUc) {
    const exceso = resultante - topeUc;
    return {
      ok: false,
      mensaje: 'No se agregó el trimestre ' + numero + ': excedería el tope en ' + exceso + ' UC.',
      ucExcedidas: exceso
    };
  }
  pendientes.forEach(m => {
    seleccion.push({ codigo: m.codigo, seccionFijada: null, seccionesExcluidas: [] });
  });
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Se agregaron ' + pendientes.length + ' materias del trimestre ' + numero + '.' };
}

function buscarSeccion(codigo, seccionId) {
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!materia) return null;
  return materia.secciones.find(s => s.id === seccionId) || null;
}

function fijarSeccion(codigo, seccionId) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: 'La materia ' + codigo + ' no está seleccionada.' };
  if (!buscarSeccion(codigo, seccionId)) {
    return { ok: false, mensaje: 'La sección ' + seccionId + ' no existe en ' + codigo + '.' };
  }
  if (entrada.seccionesExcluidas.includes(seccionId)) {
    return { ok: false, mensaje: 'La sección ' + seccionId + ' está excluida; inclúyala antes de elegirla.' };
  }
  entrada.seccionFijada = seccionId;
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Clase elegida en ' + codigo + ': sección ' + seccionId + '.' };
}

function quitarFijadoSeccion(codigo) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: 'La materia ' + codigo + ' no está seleccionada.' };
  if (entrada.seccionFijada === null) return { ok: false, mensaje: 'La materia ' + codigo + ' no tiene una clase elegida.' };
  entrada.seccionFijada = null;
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Se quitó la clase elegida de ' + codigo + '.' };
}

function alternarExclusionSeccion(codigo, seccionId) {
  const entrada = buscarEntrada(codigo);
  if (!entrada) return { ok: false, mensaje: 'La materia ' + codigo + ' no está seleccionada.' };
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!buscarSeccion(codigo, seccionId)) {
    return { ok: false, mensaje: 'La sección ' + seccionId + ' no existe en ' + codigo + '.' };
  }
  const idx = entrada.seccionesExcluidas.indexOf(seccionId);
  if (idx !== -1) {
    entrada.seccionesExcluidas.splice(idx, 1);
    notificarCambioSeleccion();
    return { ok: true, mensaje: 'Sección ' + seccionId + ' incluida de nuevo en ' + codigo + '.' };
  }
  if (materia.secciones.length - entrada.seccionesExcluidas.length <= 1) {
    return { ok: false, mensaje: 'No se puede excluir la última sección disponible de ' + codigo + '.' };
  }
  entrada.seccionesExcluidas.push(seccionId);
  if (entrada.seccionFijada === seccionId) entrada.seccionFijada = null;
  notificarCambioSeleccion();
  return { ok: true, mensaje: 'Sección ' + seccionId + ' excluida de ' + codigo + '.' };
}

function seccionesDisponibles(codigo) {
  const entrada = buscarEntrada(codigo);
  const materia = obtenerMateriaPorCodigo(codigo);
  if (!entrada || !materia) return [];
  if (entrada.seccionFijada !== null) {
    return materia.secciones.filter(s => s.id === entrada.seccionFijada);
  }
  return materia.secciones.filter(s => !entrada.seccionesExcluidas.includes(s.id));
}

function reiniciarSeleccion() {
  seleccion = [];
  seleccionExpandidas.clear();
  topeUc = TOPE_UC_POR_DEFECTO;
  mensajeSeleccion = { texto: '', tipo: 'muted' };
  renderSeleccion();
}

/* ---------- Presentación ---------- */

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

function mostrarMensajeSeleccion(texto, tipo) {
  mensajeSeleccion = { texto: texto || '', tipo: tipo || 'muted' };
  if (typeof document === 'undefined') return;
  const cont = document.getElementById('sel-msg');
  if (!cont) return;
  cont.textContent = mensajeSeleccion.texto;
  cont.className = 'sel-msg ' + mensajeSeleccion.tipo;
}

function reportarResultado(r) {
  mostrarMensajeSeleccion(r.mensaje, r.ok ? 'ok' : 'error');
}

function resumenSesionesSeccion(seccion) {
  return (seccion.horario || []).map(ses => {
    const hora = typeof horarioLegibleSesion === 'function' ? horarioLegibleSesion(ses) : '';
    return ses.dia + ' ' + hora + (ses.aula ? ' · ' + ses.aula : '');
  });
}

function crearFilaSeccion(entrada, seccion, totalNoExcluidas) {
  const fijada = entrada.seccionFijada === seccion.id;
  const excluida = entrada.seccionesExcluidas.includes(seccion.id);
  const claveBase = entrada.codigo + '|' + seccion.id;

  const estado = fijada ? 'Elegida' : (excluida ? 'Excluida' : '');
  const botonFijar = crearElemento('button', {
    type: 'button',
    clase: 'btn-sel' + (fijada ? ' activo' : ''),
    'data-accion': 'fijar',
    'data-codigo': entrada.codigo,
    'data-seccion': seccion.id,
    'data-foco': claveBase + '|fijar',
    'aria-pressed': fijada ? 'true' : 'false',
    disabled: excluida,
    texto: fijada ? 'Quitar elección' : 'Elegir esta clase'
  });
  const ultima = !excluida && totalNoExcluidas <= 1;
  const botonExcluir = crearElemento('button', {
    type: 'button',
    clase: 'btn-sel',
    'data-accion': 'excluir',
    'data-codigo': entrada.codigo,
    'data-seccion': seccion.id,
    'data-foco': claveBase + '|excluir',
    'aria-pressed': excluida ? 'true' : 'false',
    disabled: ultima,
    title: ultima ? 'Debe quedar al menos una sección disponible' : null,
    texto: excluida ? 'Incluir' : 'Excluir'
  });

  const sesiones = crearElemento('ul', { clase: 'sel-sesiones' },
    resumenSesionesSeccion(seccion).map(t => crearElemento('li', { texto: t })));

  return crearElemento('li', { clase: 'sel-seccion' + (fijada ? ' fijada' : '') + (excluida ? ' excluida' : '') }, [
    crearElemento('div', { clase: 'sel-seccion-info' }, [
      crearElemento('div', { clase: 'sel-seccion-titulo' }, [
        crearElemento('strong', { texto: 'Sección ' + seccion.id }),
        crearElemento('span', { clase: 'muted', texto: ' · ' + (seccion.profesor || 'Sin profesor') }),
        estado ? crearElemento('span', { clase: 'etiqueta ' + (fijada ? 'etiqueta-activa' : 'etiqueta-excluida'), texto: estado }) : null
      ]),
      sesiones
    ]),
    crearElemento('div', { clase: 'sel-seccion-acciones' }, [botonFijar, botonExcluir])
  ]);
}

function crearTarjetaSeleccion(entrada) {
  const materia = obtenerMateriaPorCodigo(entrada.codigo);
  if (!materia) return null;
  const totalNoExcluidas = materia.secciones.length - entrada.seccionesExcluidas.length;
  const quitar = crearElemento('button', {
    type: 'button',
    clase: 'btn-sel peligro',
    'data-accion': 'quitar',
    'data-codigo': entrada.codigo,
    'data-foco': entrada.codigo + '|quitar',
    'aria-label': 'Quitar ' + materia.nombre + ' de la selección',
    texto: 'Quitar'
  });
  const fijadaId = entrada.seccionFijada;
  const expandida = fijadaId !== null && seleccionExpandidas.has(entrada.codigo);
  if (fijadaId === null) seleccionExpandidas.delete(entrada.codigo);
  const visibles = fijadaId !== null && !expandida
    ? materia.secciones.filter(s => s.id === fijadaId)
    : materia.secciones;
  const pista = fijadaId === null
    ? crearElemento('p', {
      clase: 'muted sel-pista',
      texto: 'Sin clase elegida: el generador probará ' + totalNoExcluidas + (totalNoExcluidas === 1 ? ' sección.' : ' secciones.')
    })
    : null;
  const cambiar = fijadaId !== null
    ? crearElemento('button', {
      type: 'button',
      clase: 'btn-sel sel-cambiar',
      'data-accion': 'cambiar',
      'data-codigo': entrada.codigo,
      'data-foco': entrada.codigo + '|cambiar',
      'aria-expanded': expandida ? 'true' : 'false',
      texto: expandida ? 'Ocultar otras clases' : 'Cambiar clase'
    })
    : null;
  return crearElemento('article', { clase: 'card sel-card' }, [
    crearElemento('header', { clase: 'sel-card-cabecera' }, [
      crearElemento('div', {}, [
        crearElemento('strong', { clase: 'codigo', texto: materia.codigo }),
        crearElemento('div', { texto: materia.nombre }),
        crearElemento('div', { clase: 'muted', texto: 'Trimestre ' + materia.trimestre + ' · ' + materia.uc + ' UC' })
      ]),
      quitar
    ]),
    pista,
    crearElemento('ul', { clase: 'sel-secciones' },
      visibles.map(s => crearFilaSeccion(entrada, s, totalNoExcluidas))),
    cambiar
  ]);
}

function renderSeleccion() {
  if (typeof document === 'undefined') return;
  const cant = document.getElementById('sel-cant');
  const uc = document.getElementById('sel-uc');
  const tope = document.getElementById('sel-tope');
  if (cant) cant.textContent = String(seleccion.length);
  if (uc) uc.textContent = String(totalUcSeleccion());
  if (tope) tope.textContent = String(topeUc);
  const campoTope = document.getElementById('tope-uc');
  if (campoTope && document.activeElement !== campoTope) campoTope.value = String(topeUc);

  const lista = document.getElementById('sel-lista');
  if (lista) {
    const foco = document.activeElement && document.activeElement.getAttribute
      ? document.activeElement.getAttribute('data-foco') : null;
    lista.textContent = '';
    if (seleccion.length === 0) {
      lista.appendChild(crearElemento('div', { clase: 'estado-vacio' }, [
        crearElemento('strong', { texto: 'Aún no hay materias seleccionadas' }),
        crearElemento('p', { clase: 'muted', texto: 'Agregue materias desde el catálogo o use el atajo de trimestre completo.' })
      ]));
    } else {
      seleccion.forEach(e => {
        const tarjeta = crearTarjetaSeleccion(e);
        if (tarjeta) lista.appendChild(tarjeta);
      });
    }
    if (foco) {
      const nuevo = Array.prototype.find.call(lista.querySelectorAll('[data-foco]'), n => n.getAttribute('data-foco') === foco);
      if (nuevo && !nuevo.disabled) nuevo.focus();
    }
  }
  mostrarMensajeSeleccion(mensajeSeleccion.texto, mensajeSeleccion.tipo);
}

function inicializarSeleccion() {
  if (typeof document === 'undefined') return;
  const campoTope = document.getElementById('tope-uc');
  if (campoTope) {
    campoTope.value = String(topeUc);
    campoTope.addEventListener('change', function () {
      const r = establecerTopeUc(campoTope.value);
      campoTope.value = String(topeUc);
      reportarResultado(r);
    });
  }
  const boton = document.getElementById('btn-agregar-trim');
  const selTrim = document.getElementById('sel-trim-completo');
  if (boton && selTrim) {
    boton.addEventListener('click', function () {
      reportarResultado(agregarTrimestreCompleto(selTrim.value));
    });
  }
  const lista = document.getElementById('sel-lista');
  if (lista) {
    lista.addEventListener('click', function (ev) {
      const b = ev.target.closest ? ev.target.closest('button[data-accion]') : null;
      if (!b || b.disabled) return;
      const codigo = b.getAttribute('data-codigo');
      const seccion = b.getAttribute('data-seccion');
      const accion = b.getAttribute('data-accion');
      let r;
      if (accion === 'quitar') r = quitarMateriaSeleccion(codigo);
      else if (accion === 'excluir') r = alternarExclusionSeccion(codigo, seccion);
      else if (accion === 'fijar') {
        const e = buscarEntrada(codigo);
        seleccionExpandidas.delete(codigo);
        r = e && e.seccionFijada === seccion ? quitarFijadoSeccion(codigo) : fijarSeccion(codigo, seccion);
      } else if (accion === 'cambiar') {
        if (!seleccionExpandidas.delete(codigo)) seleccionExpandidas.add(codigo);
        renderSeleccion();
        return;
      }
      if (r) reportarResultado(r);
    });
  }
  renderSeleccion();
}
