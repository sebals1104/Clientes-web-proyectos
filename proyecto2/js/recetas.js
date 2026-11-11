// Normalización de recetas de TheMealDB (#26)
const Recetas = {
  // TheMealDB publica la imagen de cada ingrediente en esta URL.
  urlImagenIngrediente: 'https://www.themealdb.com/images/ingredients/',

  // La API trae como máximo 20 ingredientes por receta.
  maximoIngredientes: 20,

  /* ---------- Auxiliares ---------- */

  // Devuelve el texto recortado o null si no hay valor utilizable.
  texto(valor) {
    const limpio = typeof valor === 'string' ? valor.trim() : '';
    return limpio === '' ? null : limpio;
  },

  /* ---------- Partes de la receta ---------- */

  // Ingredientes de strIngredient1..20 con su medida y su imagen.
  // Descarta los que no tienen nombre y recorta los espacios sobrantes.
  ingredientes(receta) {
    const ingredientes = [];
    for (let i = 1; i <= Recetas.maximoIngredientes; i++) {
      const nombre = Recetas.texto(receta['strIngredient' + i]);
      if (!nombre) continue;
      ingredientes.push({
        nombre,
        medida: typeof receta['strMeasure' + i] === 'string' ? receta['strMeasure' + i].trim() : '',
        imagen: Recetas.urlImagenIngrediente + encodeURIComponent(nombre) + '.png'
      });
    }
    return ingredientes;
  },

  // Etiquetas de strTags separadas por comas, sin vacíos ni espacios sobrantes.
  etiquetas(receta) {
    return String(receta.strTags || '')
      .split(',')
      .map(etiqueta => etiqueta.trim())
      .filter(etiqueta => etiqueta !== '');
  },

  // Indica si una línea de las instrucciones solo trae un encabezado de
  // numeración ("STEP 1", "step 2", "1.", "1)", "1 -").
  esEncabezado(linea) {
    return /^(?:step\s*)?\d+\s*[.)\-–—:;]?\s*$/i.test(linea.trim());
  },

  // Pasos de preparación: cada línea no vacía de las instrucciones,
  // descartando las que solo contienen un encabezado de numeración.
  pasos(instrucciones) {
    return String(instrucciones || '')
      .split(/\r?\n/)
      .map(linea => linea.trim())
      .filter(linea => linea !== '' && !Recetas.esEncabezado(linea));
  },

  // Cantidad de palabras de las instrucciones tal como las trae la API.
  palabras(instrucciones) {
    const texto = String(instrucciones || '').trim();
    if (texto === '') return 0;
    return texto.split(/\s+/).length;
  },

  // Enlace al video de la preparación o null si la receta no lo tiene.
  video(receta) {
    return Recetas.texto(receta.strYoutube);
  },

  /* ---------- Normalización ---------- */

  // Convierte una receta de la API al formato acordado en el contrato:
  // { id, nombre, imagen, categoria, origen, etiquetas, ingredientes, pasos,
  //   palabras, video, completa }, con ingredientes { nombre, medida, imagen }.
  // Acepta recetas completas y resumidas (filter.php); completa indica si
  // la receta ya tiene instrucciones.
  normalizar(receta) {
    if (!receta) return null;
    const instrucciones = typeof receta.strInstructions === 'string' ? receta.strInstructions : '';
    return {
      id: String(receta.idMeal),
      nombre: String(receta.strMeal || '').trim(),
      imagen: Recetas.texto(receta.strMealThumb),
      categoria: Recetas.texto(receta.strCategory),
      origen: Recetas.texto(receta.strArea),
      etiquetas: Recetas.etiquetas(receta),
      ingredientes: Recetas.ingredientes(receta),
      pasos: Recetas.pasos(instrucciones),
      palabras: Recetas.palabras(instrucciones),
      video: Recetas.video(receta),
      completa: instrucciones.trim() !== ''
    };
  },

  // Normaliza una lista de recetas descartando las que no existen.
  normalizarLista(recetas) {
    return (Array.isArray(recetas) ? recetas : [])
      .map(Recetas.normalizar)
      .filter(receta => receta !== null);
  }
};
