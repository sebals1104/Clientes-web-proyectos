function obtenerBloques() {
  if (typeof BLOQUES === 'undefined' || !Array.isArray(BLOQUES)) return [];
  return BLOQUES;
}

function obtenerMateriasCatalogo() {
  if (typeof MATERIAS === 'undefined' || !Array.isArray(MATERIAS)) return [];
  return MATERIAS;
}

let materiasManuales = [];

function obtenerMateriasManuales() {
  return materiasManuales.slice();
}

function agregarMateriaManual(materia) {
  if (!materia || !materia.codigo) return false;
  if (existeCodigoMateria(materia.codigo)) return false;
  materiasManuales.push(materia);
  return true;
}

function editarMateriaManual(codigo, nuevaMateria) {
  const idx = materiasManuales.findIndex(m => m.codigo === codigo);
  if (idx === -1) return false;
  if (nuevaMateria.codigo !== codigo && existeCodigoMateria(nuevaMateria.codigo)) return false;
  materiasManuales[idx] = nuevaMateria;
  return true;
}

function eliminarMateriaManual(codigo) {
  const idx = materiasManuales.findIndex(m => m.codigo === codigo);
  if (idx === -1) return false;
  materiasManuales.splice(idx,1);
  return true;
}

function existeCodigoMateria(codigo) {
  if (!codigo) return false;
  const catalogo = obtenerMateriasCatalogo();
  if (catalogo.some(m => m.codigo === codigo)) return true;
  if (materiasManuales.some(m => m.codigo === codigo)) return true;
  return false;
}

function obtenerCatalogoCompleto() {
  return obtenerMateriasCatalogo().concat(obtenerMateriasManuales());
}

function buscarMaterias({texto='', trimestre=null} = {}) {
  const textoLower = (texto||'').toLowerCase().trim();
  return obtenerCatalogoCompleto().filter(m => {
    const matchTrim = trimestre === null || trimestre === undefined || m.trimestre === Number(trimestre);
    if (!matchTrim) return false;
    if (!textoLower) return true;
    return (m.codigo||'').toLowerCase().includes(textoLower) || (m.nombre||'').toLowerCase().includes(textoLower);
  });
}

function obtenerMateriaPorCodigo(codigo) {
  return obtenerCatalogoCompleto().find(m => m.codigo === codigo) || null;
}