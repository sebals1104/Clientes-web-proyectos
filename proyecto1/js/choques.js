/* ---------- Choques entre sesiones y secciones ---------- */

const bloquesPorId = new Map(obtenerBloques().map(bloque => [bloque.id, bloque]));

// Devuelve el inicio y fin ("HH:MM") de una sesión, o null si ningún bloque existe.
function intervaloDeSesion(sesion) {
  const bloques = sesion.bloques.map(id => bloquesPorId.get(id)).filter(Boolean);
  if (bloques.length === 0) return null;
  const inicio = Math.min(...bloques.map(bloque => hhmmToMin(bloque.inicio)));
  const fin = Math.max(...bloques.map(bloque => hhmmToMin(bloque.fin)));
  return { inicio: minutosAHhmm(inicio), fin: minutosAHhmm(fin) };
}

// Indica si dos sesiones del mismo día se solapan.
function sesionChocaCon(sesionA, sesionB) {
  if (sesionA.dia !== sesionB.dia) return false;
  const a = intervaloDeSesion(sesionA);
  const b = intervaloDeSesion(sesionB);
  if (a === null || b === null) return false;
  return chocanIntervalos(a.inicio, a.fin, b.inicio, b.fin);
}

// Indica si alguna sesión de una sección choca con alguna de la otra.
function seccionesChocanEntre(seccionA, seccionB) {
  return seccionA.horario.some(sesionA => seccionB.horario.some(sesionB => sesionChocaCon(sesionA, sesionB)));
}

/* ---------- Incompatibilidades ---------- */

// Devuelve las secciones disponibles de la materia, o todas si no hay ninguna disponible.
function seccionesParaChoques(materia) {
  const disponibles = seccionesDisponibles(materia.codigo);
  return disponibles.length > 0 ? disponibles : materia.secciones;
}

// Dos materias son incompatibles si todas sus secciones disponibles chocan entre sí.
function detectarIncompatibilidades(seleccion) {
  const codigos = seleccion.map(entrada => (typeof entrada === 'string' ? entrada : entrada.codigo));
  const materias = codigos.map(obtenerMateriaPorCodigo).filter(Boolean);
  const incompatibles = [];
  for (let i = 0; i < materias.length; i++) {
    for (let j = i + 1; j < materias.length; j++) {
      const seccionesA = seccionesParaChoques(materias[i]);
      const seccionesB = seccionesParaChoques(materias[j]);
      if (seccionesA.length === 0 || seccionesB.length === 0) continue;
      const todasChocan = seccionesA.every(a => seccionesB.every(b => seccionesChocanEntre(a, b)));
      if (todasChocan) incompatibles.push({ a: materias[i].codigo, b: materias[j].codigo });
    }
  }
  return incompatibles;
}
