// Caché en memoria: cada receta y cada lista se pide una sola vez.
const CacheApi = {
  recetas: new Map(),
  listas: new Map(),

  // Devuelve lo guardado o lo pide una sola vez; si falla, lo borra para poder reintentar.
  async recordar(mapa, clave, pedir) {
    if (!mapa.has(clave)) mapa.set(clave, pedir());
    const promesa = mapa.get(clave);
    try {
      return await promesa;
    } catch (error) {
      if (mapa.get(clave) === promesa) mapa.delete(clave);
      throw error;
    }
  },

  // Guarda recetas completas que ya se obtuvieron.
  guardarRecetas(recetas) {
    recetas.forEach(receta => CacheApi.recetas.set(String(receta.idMeal), Promise.resolve(receta)));
  },

  // Devuelve la receta completa con ese id, o null si no existe.
  obtenerReceta(id) {
    return CacheApi.recordar(CacheApi.recetas, String(id), async () => {
      const recetas = await Api.obtenerReceta(id);
      return recetas[0] || null;
    });
  },

  // Busca recetas por nombre y las guarda.
  async buscarRecetas(nombre, opciones) {
    const recetas = await Api.buscarRecetas(nombre, opciones);
    CacheApi.guardarRecetas(recetas);
    return recetas;
  },

  // Pide una receta al azar, la guarda y la devuelve.
  async obtenerRecetaAleatoria(opciones) {
    const recetas = await Api.obtenerRecetaAleatoria(opciones);
    CacheApi.guardarRecetas(recetas);
    return recetas[0] || null;
  },

  // Devuelve las categorías.
  obtenerCategorias() {
    return CacheApi.recordar(CacheApi.listas, 'categorias', () => Api.obtenerCategorias());
  },

  // Devuelve los orígenes.
  obtenerOrigenes() {
    return CacheApi.recordar(CacheApi.listas, 'origenes', () => Api.obtenerOrigenes());
  },

  // Devuelve los ingredientes.
  obtenerIngredientes() {
    return CacheApi.recordar(CacheApi.listas, 'ingredientes', () => Api.obtenerIngredientes());
  }
};
