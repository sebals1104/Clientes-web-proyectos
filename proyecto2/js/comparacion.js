// Comparación de dos recetas normalizadas (#27)
const Comparacion = {
  /* ---------- Auxiliares ---------- */

  // Clave de comparación: sin espacios sobrantes ni mayúsculas.
  clave(texto) {
    return String(texto || '').trim().toLowerCase();
  },

  // Indica cuál de dos números es el menor: 'a', 'b' o 'empate'.
  menor(a, b) {
    if (a < b) return 'a';
    if (b < a) return 'b';
    return 'empate';
  },

  // Nombres de ingredientes distintos de una receta, con la primera escritura
  // de cada uno. La clave ignora mayúsculas y espacios sobrantes.
  nombresDistintos(ingredientes) {
    const nombres = new Map();
    (ingredientes || []).forEach(ingrediente => {
      const clave = Comparacion.clave(ingrediente.nombre);
      if (clave !== '' && !nombres.has(clave)) nombres.set(clave, String(ingrediente.nombre).trim());
    });
    return nombres;
  },

  // Etiquetas presentes en ambas recetas, sin repetir.
  etiquetasComunes(a, b) {
    const etiquetasB = new Set((b.etiquetas || []).map(etiqueta => Comparacion.clave(etiqueta)));
    const comunes = [];
    const vistas = new Set();
    (a.etiquetas || []).forEach(etiqueta => {
      const clave = Comparacion.clave(etiqueta);
      if (etiquetasB.has(clave) && !vistas.has(clave)) {
        vistas.add(clave);
        comunes.push(String(etiqueta).trim());
      }
    });
    return comunes;
  },

  // Receta más sencilla: menos ingredientes; si empatan, menos pasos; si
  // empatan, menos palabras; si persiste, empate.
  masSencilla(a, b) {
    let sencilla = Comparacion.menor(a.ingredientes.length, b.ingredientes.length);
    if (sencilla === 'empate') sencilla = Comparacion.menor(a.pasos.length, b.pasos.length);
    if (sencilla === 'empate') sencilla = Comparacion.menor(a.palabras, b.palabras);
    return sencilla;
  },

  /* ---------- Comparación ---------- */

  // Compara dos recetas normalizadas y devuelve las métricas de la sección
  // 4.6. Las listas se comparan sin distinguir mayúsculas de minúsculas e
  // ignorando espacios al inicio y al final.
  //
  // Resultado:
  // {
  //   ingredientes, pasos, palabras:  { a, b, menor }   menor: 'a' | 'b' | 'empate'
  //   categoria, origen:             { a, b, coinciden }
  //   etiquetasComunes:              [ ... ]
  //   video:                         { a, b }           true si tiene video
  //   ingredientesComunes:           [ ... ]
  //   ingredientesExclusivosA/B:     [ ... ]
  //   similitud:                     0..100 (porcentaje entero)
  //   masSencilla:                   'a' | 'b' | 'empate'
  // }
  comparar(a, b) {
    if (!a || !b) return null;

    const nombresA = Comparacion.nombresDistintos(a.ingredientes);
    const nombresB = Comparacion.nombresDistintos(b.ingredientes);

    const ingredientesComunes = [];
    const ingredientesExclusivosA = [];
    nombresA.forEach((nombre, clave) => {
      if (nombresB.has(clave)) ingredientesComunes.push(nombre);
      else ingredientesExclusivosA.push(nombre);
    });

    const ingredientesExclusivosB = [];
    nombresB.forEach((nombre, clave) => {
      if (!nombresA.has(clave)) ingredientesExclusivosB.push(nombre);
    });

    // Similitud: ingredientes en común sobre el total de ingredientes
    // distintos de ambas recetas, como porcentaje entero.
    const totalDistintos = ingredientesComunes.length + ingredientesExclusivosA.length + ingredientesExclusivosB.length;
    const similitud = totalDistintos === 0 ? 0 : Math.round((ingredientesComunes.length / totalDistintos) * 100);

    return {
      ingredientes: {
        a: a.ingredientes.length,
        b: b.ingredientes.length,
        menor: Comparacion.menor(a.ingredientes.length, b.ingredientes.length)
      },
      pasos: {
        a: a.pasos.length,
        b: b.pasos.length,
        menor: Comparacion.menor(a.pasos.length, b.pasos.length)
      },
      palabras: {
        a: a.palabras,
        b: b.palabras,
        menor: Comparacion.menor(a.palabras, b.palabras)
      },
      categoria: {
        a: a.categoria,
        b: b.categoria,
        coinciden: Comparacion.clave(a.categoria) === Comparacion.clave(b.categoria)
      },
      origen: {
        a: a.origen,
        b: b.origen,
        coinciden: Comparacion.clave(a.origen) === Comparacion.clave(b.origen)
      },
      etiquetasComunes: Comparacion.etiquetasComunes(a, b),
      video: { a: a.video !== null, b: b.video !== null },
      ingredientesComunes,
      ingredientesExclusivosA,
      ingredientesExclusivosB,
      similitud,
      masSencilla: Comparacion.masSencilla(a, b)
    };
  }
};
