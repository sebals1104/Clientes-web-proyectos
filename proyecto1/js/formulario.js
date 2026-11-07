// formulario.js - Materias manuales con validación en el DOM.
//
// Alta, edición y baja de materias que no están en el catálogo original.
// Todos los avisos se escriben en el DOM: no se usa alert(), confirm() ni
// prompt(). Al guardar o borrar, el catálogo y la selección se refrescan
// para que las demás vistas queden al día.

const DIAS_FORMULARIO = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const PATRON_CODIGO = /^[A-Za-z0-9][A-Za-z0-9._-]{1,19}$/;

function escapeHtml(s) {
  if (s == null) return '';
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, c => mapa[c]);
}

function initFormulario() {
  const form = document.getElementById('form-manual');
  const btnAddSeccion = document.getElementById('btn-add-seccion');
  const seccionesDiv = document.getElementById('form-secciones');
  const msg = document.getElementById('form-manual-msg');
  const listaManuales = document.getElementById('manuales-lista');
  if (!form) return;

  let editandoCodigo = null;
  let secCount = 0;

  /* ---------- Utilidades de formulario ---------- */

  function mostrarMensaje(texto, tipo) {
    if (!msg) return;
    msg.textContent = texto || '';
    msg.className = tipo || 'muted';
  }

  function limpiarErrores() {
    form.querySelectorAll('.err').forEach(e => e.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach(e => e.removeAttribute('aria-invalid'));
  }

  function marcarError(campo, texto) {
    if (!campo) return;
    campo.setAttribute('aria-invalid', 'true');
    const span = document.createElement('span');
    span.className = 'err error';
    span.textContent = texto;
    const contenedor = campo.closest('label') || campo.parentElement;
    if (contenedor) contenedor.appendChild(span);
  }

  function opcionesDia(seleccionado) {
    return '<option value="">--</option>' + DIAS_FORMULARIO
      .map(d => '<option value="' + d + '"' + (d === seleccionado ? ' selected' : '') + '>' + d + '</option>')
      .join('');
  }

  function opcionesBloque(b) {
    return '<option value="' + escapeHtml(b.id) + '">' + escapeHtml(b.id) + ' (' + escapeHtml(b.tipo) + ') '
      + escapeHtml(b.inicio) + '-' + escapeHtml(b.fin) + '</option>';
  }

  function renderBloquesSelect() {
    return obtenerBloques().map(opcionesBloque).join('');
  }

  function nuevaSesionHTML(sIdx, sesIdx, valores) {
    const v = valores || {};
    const opts = renderBloquesSelect();
    const bloques = Array.isArray(v.bloques) ? v.bloques : [];
    const selects = opts.replace(/<option value="([^"]+)"([^>]*)>/g, (match, id, resto) => {
      const activo = bloques.indexOf(id) !== -1 ? ' selected' : '';
      return '<option value="' + id + '"' + (resto.replace(' selected', '')) + activo + '>';
    });
    return '<div class="card" data-sesion="' + sesIdx + '">'
      + '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">'
      + '<label>Día<select name="dia-' + sIdx + '-' + sesIdx + '" required>' + opcionesDia(v.dia) + '</select></label>'
      + '<label>Bloques<select name="bloques-' + sIdx + '-' + sesIdx + '" multiple required>' + selects + '</select></label>'
      + '<label>Aula<input name="aula-' + sIdx + '-' + sesIdx + '" value="' + escapeHtml(v.aula || '') + '" required></label>'
      + '<button type="button" class="secondary btn-del-ses">Eliminar sesión</button>'
      + '</div></div>';
  }

  function nuevaSeccionHTML(idx, valores) {
    const v = valores || {};
    const sesiones = Array.isArray(v.horario) ? v.horario : [];
    const sesionesHTML = (sesiones.length ? sesiones : [{}])
      .map((s, i) => nuevaSesionHTML(idx, i, s)).join('');
    return '<div class="card" data-seccion-idx="' + idx + '">'
      + '<div class="flex">'
      + '<label>ID Sección<input name="sec-id-' + idx + '" value="' + escapeHtml(v.id || '') + '" required></label>'
      + '<label>Profesor<input name="sec-prof-' + idx + '" value="' + escapeHtml(v.profesor || '') + '" required></label>'
      + '<button type="button" class="secondary btn-del-sec">Eliminar sección</button>'
      + '</div>'
      + '<div class="grid" data-sesiones-' + idx + '>' + sesionesHTML + '</div>'
      + '<button type="button" class="secondary btn-add-ses" data-sidx="' + idx + '">Agregar sesión</button>'
      + '</div>';
  }

  function agregarSeccionHTML(materia) {
    secCount++;
    seccionesDiv.insertAdjacentHTML('beforeend', nuevaSeccionHTML(secCount, materia));
  }

  function tituloFormulario() {
    const detalles = form.closest('details');
    return detalles ? detalles.querySelector('summary') : null;
  }

  function reiniciarFormulario() {
    form.reset();
    seccionesDiv.textContent = '';
    secCount = 0;
    editandoCodigo = null;
    agregarSeccionHTML();
    const boton = form.querySelector('button[type="submit"]');
    if (boton) boton.textContent = 'Guardar materia manual';
    const titulo = tituloFormulario();
    if (titulo) titulo.textContent = 'Agregar materia manual';
    const cancelar = form.querySelector('#btn-cancelar-edicion');
    if (cancelar) cancelar.remove();
  }

  /* ---------- Lectura y validación ---------- */

  function leerSesiones(seccion) {
    const sIdx = seccion.getAttribute('data-seccion-idx');
    const contenedor = seccion.querySelector('[data-sesiones-' + sIdx + ']');
    if (!contenedor) return [];
    return Array.prototype.map.call(contenedor.querySelectorAll('[data-sesion]'), nodo => {
      const sesIdx = nodo.getAttribute('data-sesion');
      const dia = nodo.querySelector('[name="dia-' + sIdx + '-' + sesIdx + '"]');
      const bloques = nodo.querySelector('[name="bloques-' + sIdx + '-' + sesIdx + '"]');
      const aula = nodo.querySelector('[name="aula-' + sIdx + '-' + sesIdx + '"]');
      const seleccionados = bloques
        ? Array.prototype.map.call(bloques.selectedOptions || [], o => o.value)
        : [];
      return {
        dia: dia ? dia.value : '',
        bloques: seleccionados,
        aula: aula ? aula.value.trim() : '',
        campos: { dia: dia, bloques: bloques, aula: aula }
      };
    });
  }

  function leerFormulario() {
    const errores = [];
    const codigo = form.querySelector('[name="codigo"]');
    const nombre = form.querySelector('[name="nombre"]');
    const trimestre = form.querySelector('[name="trimestre"]');
    const uc = form.querySelector('[name="uc"]');

    const codigoValor = codigo ? codigo.value.trim() : '';
    const nombreValor = nombre ? nombre.value.trim() : '';
    const trimestreValor = trimestre ? trimestre.value : '';
    const ucValor = uc ? uc.value.trim() : '';

    if (!codigoValor) {
      errores.push('El código es obligatorio.');
      marcarError(codigo, 'El código es obligatorio.');
    } else if (!PATRON_CODIGO.test(codigoValor)) {
      errores.push('El código admite letras, números, punto, guion y guion bajo (2 a 20 caracteres).');
      marcarError(codigo, 'Formato de código no válido.');
    } else if (existeCodigoMateria(codigoValor) && codigoValor !== editandoCodigo) {
      errores.push('Ya existe una materia con el código ' + codigoValor + '.');
      marcarError(codigo, 'El código ya está en uso.');
    }

    if (!nombreValor) {
      errores.push('El nombre es obligatorio.');
      marcarError(nombre, 'El nombre es obligatorio.');
    }

    if (!trimestreValor) {
      errores.push('El trimestre es obligatorio.');
      marcarError(trimestre, 'El trimestre es obligatorio.');
    }

    const numeroUc = Number(ucValor);
    if (!ucValor) {
      errores.push('Las UC son obligatorias.');
      marcarError(uc, 'Las UC son obligatorias.');
    } else if (!Number.isInteger(numeroUc) || numeroUc < 1 || numeroUc > 5) {
      errores.push('Las UC deben ser un número entero entre 1 y 5.');
      marcarError(uc, 'Las UC deben ser un entero entre 1 y 5.');
    }

    const secciones = Array.prototype.map.call(seccionesDiv.querySelectorAll('[data-seccion-idx]'), seccion => {
      const sIdx = seccion.getAttribute('data-seccion-idx');
      const campoId = seccion.querySelector('[name="sec-id-' + sIdx + '"]');
      const campoProf = seccion.querySelector('[name="sec-prof-' + sIdx + '"]');
      const idValor = campoId ? campoId.value.trim() : '';
      const profValor = campoProf ? campoProf.value.trim() : '';
      if (!idValor) {
        errores.push('Cada sección necesita un ID.');
        marcarError(campoId, 'El ID de la sección es obligatorio.');
      }
      if (!profValor) {
        errores.push('Cada sección necesita un profesor.');
        marcarError(campoProf, 'El profesor es obligatorio.');
      }
      const sesiones = leerSesiones(seccion).map(ses => {
        if (!ses.dia) {
          errores.push('Cada sesión necesita un día.');
          marcarError(ses.campos.dia, 'El día es obligatorio.');
        }
        if (!ses.bloques.length) {
          errores.push('Cada sesión necesita al menos un bloque.');
          marcarError(ses.campos.bloques, 'Seleccione al menos un bloque.');
        }
        if (!ses.aula) {
          errores.push('Cada sesión necesita un aula.');
          marcarError(ses.campos.aula, 'El aula es obligatoria.');
        }
        return { dia: ses.dia, bloques: ses.bloques.slice(), aula: ses.aula };
      });
      if (!sesiones.length) {
        errores.push('Cada sección necesita al menos una sesión.');
      }
      return { id: idValor, profesor: profValor, horario: sesiones };
    });

    if (!secciones.length) {
      errores.push('La materia necesita al menos una sección.');
    }

    const ids = secciones.map(s => s.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      errores.push('Los ID de sección deben ser distintos dentro de la materia.');
    }

    if (errores.length) return { ok: false, errores: errores };

    return {
      ok: true,
      materia: {
        codigo: codigoValor,
        nombre: nombreValor,
        trimestre: Number(trimestreValor),
        uc: numeroUc,
        secciones: secciones,
        esManual: true
      }
    };
  }

  /* ---------- Guardar, editar y borrar ---------- */

  function refrescarVistas() {
    if (typeof renderCatalogo === 'function') renderCatalogo();
    renderManuales();
  }

  function guardarMateria(ev) {
    if (ev) ev.preventDefault();
    limpiarErrores();
    const lectura = leerFormulario();
    if (!lectura.ok) {
      mostrarMensaje('Revise los campos marcados: ' + lectura.errores[0], 'error');
      return;
    }

    const materia = lectura.materia;
    const edicion = editandoCodigo !== null;

    if (edicion) {
      const anterior = obtenerMateriaPorCodigo(editandoCodigo);
      const cambioCodigo = materia.codigo !== editandoCodigo;
      const guardada = editarMateriaManual(editandoCodigo, materia);
      if (!guardada) {
        mostrarMensaje('No se pudo guardar la materia: el código ' + materia.codigo + ' ya está en uso.', 'error');
        return;
      }
      if (cambioCodigo) {
        // Si estaba en la selección, la referencia quedaría colgando.
        if (estaSeleccionada(editandoCodigo)) {
          quitarMateriaSeleccion(editandoCodigo);
          mostrarMensaje('Materia ' + editandoCodigo + ' actualizada a ' + materia.codigo
            + ' y quitada de la selección porque cambió el código.', 'ok');
        } else {
          mostrarMensaje('Materia ' + editandoCodigo + ' actualizada a ' + materia.codigo + '.', 'ok');
        }
      } else {
        mostrarMensaje('Materia ' + materia.codigo + ' actualizada.', 'ok');
      }
      if (anterior) anterior.esManual = true;
    } else {
      if (!agregarMateriaManual(materia)) {
        mostrarMensaje('No se pudo guardar la materia: el código ' + materia.codigo + ' ya está en uso.', 'error');
        return;
      }
      mostrarMensaje('Materia ' + materia.codigo + ' agregada al catálogo.', 'ok');
    }

    reiniciarFormulario();
    refrescarVistas();
  }

  function editarMateria(codigo) {
    const materia = obtenerMateriaPorCodigo(codigo);
    if (!materia || !materia.esManual) return;

    limpiarErrores();
    editandoCodigo = codigo;
    form.querySelector('[name="codigo"]').value = materia.codigo;
    form.querySelector('[name="nombre"]').value = materia.nombre;
    form.querySelector('[name="trimestre"]').value = String(materia.trimestre);
    form.querySelector('[name="uc"]').value = String(materia.uc);

    seccionesDiv.textContent = '';
    secCount = 0;
    (materia.secciones || []).forEach(s => agregarSeccionHTML(s));
    if (!materia.secciones || !materia.secciones.length) agregarSeccionHTML();

    const boton = form.querySelector('button[type="submit"]');
    if (boton) boton.textContent = 'Guardar cambios';
    const titulo = tituloFormulario();
    if (titulo) titulo.textContent = 'Editar materia ' + materia.codigo;

    if (!form.querySelector('#btn-cancelar-edicion')) {
      const cancelar = document.createElement('button');
      cancelar.id = 'btn-cancelar-edicion';
      cancelar.type = 'button';
      cancelar.className = 'secondary';
      cancelar.textContent = 'Cancelar edición';
      cancelar.addEventListener('click', function () {
        reiniciarFormulario();
        mostrarMensaje('Edición cancelada.', 'muted');
      });
      const btnAdd = form.querySelector('#btn-add-seccion');
      if (btnAdd && btnAdd.parentElement) btnAdd.parentElement.appendChild(cancelar);
    }

    mostrarMensaje('Editando ' + materia.codigo + '.', 'muted');
    const detalles = form.closest('details');
    if (detalles) detalles.open = true;
    const codigoCampo = form.querySelector('[name="codigo"]');
    if (codigoCampo) codigoCampo.focus();
  }

  function borrarMateria(codigo) {
    const eliminada = eliminarMateriaManual(codigo);
    if (!eliminada) {
      mostrarMensaje('No se encontró la materia ' + codigo + '.', 'error');
      return;
    }
    if (estaSeleccionada(codigo)) {
      quitarMateriaSeleccion(codigo);
      mostrarMensaje('Materia ' + codigo + ' eliminada y quitada de la selección.', 'ok');
    } else {
      mostrarMensaje('Materia ' + codigo + ' eliminada.', 'ok');
    }
    if (editandoCodigo === codigo) reiniciarFormulario();
    refrescarVistas();
  }

  function renderManuales() {
    if (!listaManuales) return;
    const mans = obtenerMateriasManuales();
    listaManuales.textContent = '';
    if (mans.length === 0) {
      listaManuales.appendChild(crearElemento('div', { clase: 'muted', texto: 'Sin materias manuales.' }));
      return;
    }
    mans.forEach(m => {
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = '<div class="flex"><strong>' + escapeHtml(m.codigo) + ' - ' + escapeHtml(m.nombre)
        + '</strong><span class="muted">Trim ' + escapeHtml(m.trimestre) + ' | UC ' + escapeHtml(m.uc)
        + '</span><button class="secondary btn-editar" data-cod="' + escapeHtml(m.codigo) + '">Editar</button>'
        + '<button class="secondary btn-eliminar" data-cod="' + escapeHtml(m.codigo) + '">Eliminar</button></div>';
      listaManuales.appendChild(d);
    });
  }

  /* ---------- Eventos ---------- */

  if (btnAddSeccion) btnAddSeccion.addEventListener('click', function () { agregarSeccionHTML(); });

  seccionesDiv.addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-del-sec')) {
      const c = e.target.closest('[data-seccion-idx]');
      if (c) c.remove();
    }
    if (e.target.classList.contains('btn-add-ses')) {
      const c = e.target.closest('[data-seccion-idx]');
      if (!c) return;
      const sIdx = c.getAttribute('data-seccion-idx');
      const cont = c.querySelector('[data-sesiones-' + sIdx + ']');
      if (!cont) return;
      const sc = cont.querySelectorAll('[data-sesion]').length;
      cont.insertAdjacentHTML('beforeend', nuevaSesionHTML(sIdx, sc));
    }
    if (e.target.classList.contains('btn-del-ses')) {
      const s = e.target.closest('[data-sesion]');
      if (s) s.remove();
    }
  });

  form.addEventListener('submit', guardarMateria);

  if (listaManuales) {
    listaManuales.addEventListener('click', function (e) {
      const boton = e.target.closest ? e.target.closest('button[data-cod]') : null;
      if (!boton) return;
      const codigo = boton.getAttribute('data-cod');
      if (boton.classList.contains('btn-eliminar')) borrarMateria(codigo);
      else if (boton.classList.contains('btn-editar')) editarMateria(codigo);
    });
  }

  reiniciarFormulario();
  renderManuales();
}
