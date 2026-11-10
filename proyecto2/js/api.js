// Error de una petición a TheMealDB: red, servicio, datos o cancelado.
class ErrorApi extends Error {
  constructor(tipo, mensaje, estado = null) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.tipo = tipo;
    this.estado = estado;
  }
}

// Peticiones a TheMealDB. Es el único lugar del proyecto que usa fetch.
const Api = {
  urlBase: 'https://www.themealdb.com/api/json/v1/1/',

  /* ---------- Petición centralizada ---------- */

  // Hace la petición y devuelve la lista pedida (vacía si no hay resultados).
  async pedir(ruta, clave, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetch(Api.urlBase + ruta, { signal: opciones.signal });
    } catch (error) {
      if (error.name === 'AbortError' || opciones.signal?.aborted) throw new ErrorApi('cancelado', 'La petición se canceló.');
      throw new ErrorApi('red', 'No hay conexión con el servicio.');
    }

    if (!respuesta.ok) {
      throw new ErrorApi('servicio', `El servicio respondió con el estado ${respuesta.status}.`, respuesta.status);
    }

    let datos;
    try {
      datos = await respuesta.json();
    } catch (error) {
      if (error.name === 'AbortError' || opciones.signal?.aborted) throw new ErrorApi('cancelado', 'La petición se canceló.');
      throw new ErrorApi('datos', 'La respuesta del servicio no es válida.');
    }

    const lista = datos ? datos[clave] : undefined;
    if (lista === null) return [];
    if (!Array.isArray(lista)) throw new ErrorApi('datos', 'La respuesta del servicio no es válida.');
    return lista;
  },

  // Indica si el error es una petición cancelada.
  esCancelacion(error) {
    return error instanceof ErrorApi && error.tipo === 'cancelado';
  },

  /* ---------- Endpoints ---------- */

  // Busca recetas completas por nombre.
  buscarRecetas(nombre, opciones) {
    return Api.pedir(`search.php?s=${encodeURIComponent(nombre)}`, 'meals', opciones);
  },

  // Devuelve [receta] con ese id, o [] si no existe.
  obtenerReceta(id, opciones) {
    return Api.pedir(`lookup.php?i=${encodeURIComponent(id)}`, 'meals', opciones);
  },

  // Devuelve [receta] al azar.
  obtenerRecetaAleatoria(opciones) {
    return Api.pedir('random.php', 'meals', opciones);
  },

  // Devuelve todas las categorías.
  obtenerCategorias(opciones) {
    return Api.pedir('categories.php', 'categories', opciones);
  },

  // Devuelve todos los orígenes.
  obtenerOrigenes(opciones) {
    return Api.pedir('list.php?a=list', 'meals', opciones);
  },

  // Devuelve todos los ingredientes.
  obtenerIngredientes(opciones) {
    return Api.pedir('list.php?i=list', 'meals', opciones);
  },

  // Devuelve las recetas resumidas de una categoría.
  filtrarPorCategoria(categoria, opciones) {
    return Api.pedir(`filter.php?c=${encodeURIComponent(categoria)}`, 'meals', opciones);
  },

  // Devuelve las recetas resumidas de un origen.
  filtrarPorOrigen(origen, opciones) {
    return Api.pedir(`filter.php?a=${encodeURIComponent(origen)}`, 'meals', opciones);
  },

  // Devuelve las recetas resumidas que tienen un ingrediente.
  filtrarPorIngrediente(ingrediente, opciones) {
    return Api.pedir(`filter.php?i=${encodeURIComponent(ingrediente)}`, 'meals', opciones);
  }
};
