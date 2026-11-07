/* ---------- Estado ---------- */

const materiasManuales = [];

/* ---------- Catálogo ---------- */

// Devuelve los bloques horarios definidos en data/bloques.js.
function obtenerBloques() {
  return BLOQUES;
}

// Devuelve las materias del catálogo más las manuales.
function obtenerCatalogoCompleto() {
  return MATERIAS.concat(materiasManuales);
}

// Devuelve una copia de la lista de materias manuales.
function obtenerMateriasManuales() {
  return materiasManuales.slice();
}

// Indica si el código ya existe en el catálogo o entre las manuales.
function existeCodigoMateria(codigo) {
  if (!codigo) return false;
  return obtenerCatalogoCompleto().some(materia => materia.codigo === codigo);
}

// Busca la materia por código; devuelve null si no existe.
function obtenerMateriaPorCodigo(codigo) {
  return obtenerCatalogoCompleto().find(materia => materia.codigo === codigo) || null;
}

// Filtra por texto (código o nombre) y por trimestre.
function buscarMaterias({ texto = '', trimestre = null } = {}) {
  const buscado = (texto || '').toLowerCase().trim();
  const sinTrimestre = trimestre === null || trimestre === undefined;
  return obtenerCatalogoCompleto().filter(materia => {
    if (!sinTrimestre && materia.trimestre !== Number(trimestre)) return false;
    if (!buscado) return true;
    return materia.codigo.toLowerCase().includes(buscado) || materia.nombre.toLowerCase().includes(buscado);
  });
}

/* ---------- Materias manuales ---------- */

// Agrega una materia manual; falla si no tiene código o si ya existe.
function agregarMateriaManual(materia) {
  if (!materia || !materia.codigo) return false;
  if (existeCodigoMateria(materia.codigo)) return false;
  materiasManuales.push(materia);
  return true;
}

// Reemplaza una materia manual; falla si no existe o si el nuevo código ya está en uso.
function editarMateriaManual(codigo, nuevaMateria) {
  const indice = materiasManuales.findIndex(materia => materia.codigo === codigo);
  if (indice === -1) return false;
  if (nuevaMateria.codigo !== codigo && existeCodigoMateria(nuevaMateria.codigo)) return false;
  materiasManuales[indice] = nuevaMateria;
  return true;
}

// Elimina una materia manual; falla si no existe.
function eliminarMateriaManual(codigo) {
  const indice = materiasManuales.findIndex(materia => materia.codigo === codigo);
  if (indice === -1) return false;
  materiasManuales.splice(indice, 1);
  return true;
}
