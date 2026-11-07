# Contrato de arquitectura — Proyecto 2 (Dos Fuegos)

> **Fase 0 · Issue #21.** Documento de coordinación para que las fases 1 a 4 se puedan
> desarrollar en paralelo sin pisarse. La identidad visual se define en el issue **#23**
> y se resume en la sección 13.

**Estado:** propuesto para validación de Andrés antes de cerrar #21.
**Referencia:** `proyecto2/Proyecto 2 — Recetario (TheMealDB).md`.

---

## 1. Convenciones generales

- HTML5, CSS3 y JavaScript Vanilla. **Sin librerías, frameworks ni módulos ES**
  (`import`/`export`). Todas las clases y funciones son globales y se cargan con
  etiquetas `<script>` en el orden indicado en la sección 3.
- **Sin persistencia**: nada de `localStorage`, `sessionStorage`, `IndexedDB` ni cookies.
  El estado vive en memoria mientras la pestaña está abierta.
- **Sin diálogos nativos**: prohibido `alert()`, `confirm()` y `prompt()`. Todos los
  mensajes y preguntas se muestran en el DOM.
- Toda la lógica asíncrona usa `async/await` con `try/catch`. No se permiten cadenas
  de `.then()`.
- Los datos que vienen de la API se insertan con `textContent` o como valor de
  atributos. `innerHTML` solo se usa para estructura estática escrita por la pareja.
- Cada pseudocomponente vive en su propio archivo y se instancia varias veces cuando
  el diseño lo permite (`TarjetaReceta`, `PanelComparador`).
- Ningún pseudocomponente accede ni modifica el DOM interno de otro. La comunicación
  es siempre mediante `CustomEvent`.

---

## 2. Integrantes y responsabilidades

| Integrante | Issues asignados |
|---|---|
| **Sebastián Alsleben** | #21 contrato, #22 estructura base, #24 `api.js`, #25 `cache.js`, #28 `app.js`, #29 `BarraNavegacion`, #30 `TarjetaReceta`, #35 `Paginador`, #36 `FormularioBusqueda`, #39 `VistaInicio`, #40 `VistaExplorar`, #41 `VistaCategoriasOrigenes` |
| **Andrés Acure** | #23 identidad visual, #26 `recetas.js`, #27 `comparacion.js`, #31 `EstadoCarga`, #32 `ListaIngredientes`, #33 `PasosPreparacion`, #34 `styles.css`, #37 `PanelComparador`, #38 `TablaComparacion`, #42 `VistaDetalle`, #43 `VistaComparador`, #44 README final, #45 pruebas cruzadas |

La coordinación de la arquitectura es conjunta: cualquier cambio en este contrato se
acuerda entre ambos antes de modificar los archivos implicados.

---

## 3. Estructura de archivos y orden de carga

```
proyecto2/
  index.html
  README.md
  css/
    tokens.css              # #23 identidad visual
    styles.css              # #34 estilos e interacción
  js/
    servicios/
      api.js                # #24 petición centralizada y endpoints
      cache.js              # #25 caché en memoria
      recetas.js            # #26 normalización de recetas
      comparacion.js        # #27 métricas del comparador
    componentes/
      BarraNavegacion.js    # #29
      TarjetaReceta.js      # #30
      EstadoCarga.js        # #31
      ListaIngredientes.js  # #32
      PasosPreparacion.js   # #33
      Paginador.js          # #35
      FormularioBusqueda.js # #36
      PanelComparador.js    # #37
      TablaComparacion.js   # #38
    vistas/
      VistaInicio.js        # #39
      VistaExplorar.js      # #40
      VistaCategoriasOrigenes.js # #41
      VistaDetalle.js       # #42
      VistaComparador.js    # #43
    app.js                  # #28 punto de entrada
  assets/                   # imágenes alternativas e iconos
```

Orden de los `<script>` en `index.html` (servicios → componentes → vistas → `app.js`):

```html
<!-- Servicios -->
<script src="js/servicios/api.js"></script>
<script src="js/servicios/cache.js"></script>
<script src="js/servicios/recetas.js"></script>
<script src="js/servicios/comparacion.js"></script>

<!-- Componentes -->
<script src="js/componentes/BarraNavegacion.js"></script>
<script src="js/componentes/TarjetaReceta.js"></script>
<script src="js/componentes/EstadoCarga.js"></script>
<script src="js/componentes/ListaIngredientes.js"></script>
<script src="js/componentes/PasosPreparacion.js"></script>
<script src="js/componentes/Paginador.js"></script>
<script src="js/componentes/FormularioBusqueda.js"></script>
<script src="js/componentes/PanelComparador.js"></script>
<script src="js/componentes/TablaComparacion.js"></script>

<!-- Vistas -->
<script src="js/vistas/VistaInicio.js"></script>
<script src="js/vistas/VistaExplorar.js"></script>
<script src="js/vistas/VistaCategoriasOrigenes.js"></script>
<script src="js/vistas/VistaDetalle.js"></script>
<script src="js/vistas/VistaComparador.js"></script>

<!-- Punto de entrada -->
<script src="js/app.js"></script>
```

`index.html` expone tres contenedores estables:

| ID | Elemento | Uso |
|---|---|---|
| `#barra-navegacion` | `<nav>` dentro de `<header>` | Monta `BarraNavegacion`. |
| `#vista` | `<main>` | Contenedor de la vista activa. |
| `#anuncios` | `<div role="status" aria-live="polite">` | Anuncios accesibles de `app.js` (cambios de vista, receta agregada, etc.). |

Las vistas se montan **dentro** de `#vista`, nunca reemplazan el `<main>`. El `<h1>`
de la cabecera es el título de la aplicación; cada vista usa un `<h2>` (o un `<h2>`
visualmente equivalente) como encabezado principal y `app.js` lleva el foco a `#vista`
después de cada navegación.

---

## 4. Receta normalizada (`recetas.js`)

Todas las vistas y componentes trabajan con un único formato, sin volver a leer los
campos `str*` de la API.

```js
{
  id: '52772',                       // string
  nombre: 'Teriyaki Chicken Casserole',
  imagen: 'https://www.themealdb.com/images/media/meals/.......jpg',
  categoria: 'Chicken',              // '' si no viene
  origen: 'Japanese',                // '' si no viene
  etiquetas: ['Meat', 'Casserole'],
  ingredientes: [
    {
      nombre: 'soy sauce',
      medida: '3/4 cup',             // puede ser ''
      imagen: 'https://www.themealdb.com/images/ingredients/soy%20sauce.png'
    }
  ],
  pasos: ['Preheat oven to 350° F.', '...'],
  palabras: 245,                     // cantidad de palabras de strInstructions
  video: 'https://www.youtube.com/watch?v=...', // o null
  completa: true                     // false en recetas resumidas sin resolver
}
```

Reglas de normalización:

- `id`, `nombre`, `imagen`, `categoria`, `origen` y `medida` se recortan con `trim()`.
- **Resumen** (`filter.php`): solo llegan `idMeal`, `strMeal` y `strMealThumb`. Se
  devuelve el mismo objeto con `categoria: ''`, `origen: ''`, `etiquetas: []`,
  `ingredientes: []`, `pasos: []`, `palabras: 0`, `video: null` y `completa: false`.
- **Receta completa** (`search.php`, `lookup.php`, `random.php`): `completa: true`.
  Al resolver un resumen con `lookup.php` se reemplaza el objeto completo.
- **Ingredientes**: se recorren los pares `strIngredient1..20` / `strMeasure1..20`.
  Se descartan los que tienen nombre vacío o `null`. La imagen se construye con
  `encodeURIComponent(nombre)` sobre
  `https://www.themealdb.com/images/ingredients/{nombre}.png`.
- **Etiquetas**: `strTags` se separa por comas, se recorta cada valor y se descartan
  los vacíos. Se conserva el texto original; las comparaciones se hacen en minúsculas.
- **Pasos**: se divide `strInstructions` por saltos de línea, se recorta cada línea,
  se descartan las líneas vacías y las que solo contienen un encabezado de numeración
  (`"STEP 1"`, `"1."`, `"Paso 2:"`, etc.). El componente `PasosPreparacion` agrega la
  numeración visible.
- **Palabras**: `(strInstructions.match(/\S+/g) || []).length` sobre el texto original.
- **Video**: `strYoutube` recortado; si queda vacío, `null`.
- **Comparaciones de texto**: `claveComparacion(texto)` devuelve
  `texto.trim().toLowerCase()` para ingredientes y etiquetas.
- Los ids se comparan siempre como string.

Funciones públicas de `recetas.js`:

```js
normalizarReceta(completa)      // receta completa de la API
normalizarResumen(resumen)      // tarjeta de filter.php
normalizarCategoria(categoria)  // { id, nombre, descripcion, imagen }
normalizarLista(items)          // categorías, orígenes o ingredientes
claveComparacion(texto)         // minúsculas + trim
```

---

## 5. Estructura común de un pseudocomponente

Todos los componentes y vistas respetan el mismo ciclo de vida. No se usa herencia
obligatoria ni una clase base compartida: cada archivo implementa estos métodos.

```js
class Ejemplo {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {};              // estado propio, solo se modifica aquí
    this.raiz = this.crear();      // crea el elemento raíz
    this.configurarEventos();      // listeners propios
    this.render();                 // pinta el estado actual
    this.contenedor.appendChild(this.raiz);
  }

  crear() { /* devuelve el elemento raíz, sin datos de la API */ }
  render() { /* actualiza el DOM a partir de this.estado y this.props */ }
  configurarEventos() { /* listeners internos y delegación */ }
  destruir() { /* quita listeners, aborta peticiones y this.raiz.remove() */ }
}

// Evento hacia el exterior: siempre desde la raíz y con burbujeo.
this.raiz.dispatchEvent(new CustomEvent('nombre-evento', {
  bubbles: true,
  detail: { /* datos */ }
}));
```

Reglas:

- `crear()` usa `innerHTML` solo para estructura fija; nunca interpola datos de la API.
- `render()` puede reconstruir el contenido, pero los textos de la API entran con
  `textContent`.
- `destruir()` es obligatorio y debe dejar `this.raiz = null`. Las vistas además
  abortan su `AbortController`.
- Los eventos internos (entre una vista y sus componentes) burbujean hasta la raíz de
  la vista. Los eventos de aplicación (sección 8) llegan a `document`, donde escucha
  `app.js`.
- Si un componente necesita avisar a su vista, emite el evento y la vista decide; el
  componente no toca el DOM de la vista.

---

## 6. Pseudocomponentes (9)

| Pseudocomponente | Issue / responsable | Props del constructor | Eventos que emite | Responsabilidad |
|---|---|---|---|---|
| `BarraNavegacion` | #29 · Sebastián | `{ vistas, vistaActiva, comparadorCantidad }` | `navegar` | Barra permanente con enlaces a Inicio, Explorar, Categorías y orígenes y Comparador. Marca la vista activa y muestra el contador del comparador (0, 1 o 2). Métodos `actualizarActiva(vistaId)` y `actualizarContador(cantidad)`. |
| `TarjetaReceta` | #30 · Sebastián | `{ receta, contexto }` | `abrir-detalle`, `agregar-comparador`, `reintentar-tarjeta` | Tarjeta reutilizable con imagen, nombre, categoría, origen y cantidad de ingredientes. Si `receta.completa === false`, muestra los datos resumidos, la marca como incompleta y ofrece reintentar. Se reutiliza en Inicio, Explorar, Categorías y orígenes y recetas relacionadas. |
| `EstadoCarga` | #31 · Andrés | `{ tipo, forma, mensaje, error, reintentar }` | `reintentar` | Indicador de carga con la forma del contenido que reemplaza (`forma`: `'tarjetas'`, `'detalle'`, `'paneles'`, `'lista'`, `'tabla'`), estado vacío y estado de error. Traduce `error.tipo` a un mensaje (sección 10) y muestra el botón de reintentar si corresponde. |
| `ListaIngredientes` | #32 · Andrés | `{ ingredientes }` | — | Lista de ingredientes con imagen, nombre y medida. Si la imagen no carga, usa la imagen alternativa de `assets/`. |
| `PasosPreparacion` | #33 · Andrés | `{ pasos }` | — | Pasos numerados a partir del arreglo normalizado, descartando encabezados vacíos. |
| `Paginador` | #35 · Sebastián | `{ pagina, totalPaginas, totalResultados }` | `cambiar-pagina` | Paginación en el cliente de 12 resultados por página. Muestra la página actual y el total. |
| `FormularioBusqueda` | #36 · Sebastián | `{ categorias, origenes, ingredientes, valores }` | `buscar`, `limpiar` | Criterios combinables (nombre, categoría, origen, ingrediente). Valida en el DOM que haya al menos un criterio y que el nombre tenga 2 caracteres o más. Las sugerencias de ingredientes se filtran localmente. |
| `PanelComparador` | #37 · Andrés | `{ panel, receta }` | `receta-elegida`, `vaciar-panel` | Panel A o B del comparador. Incluye el buscador interno por nombre con debounce de 400 ms y `AbortController`, muestra la receta elegida y permite vaciarla. Se instancia dos veces con datos distintos. |
| `TablaComparacion` | #38 · Andrés | `{ comparacion }` | — | Tabla de métricas del comparador (sección 7), resalta el menor valor numérico y declara la receta más sencilla o el empate. |

### Forma de `comparacion.js`

`comparacion.js` recibe dos recetas normalizadas y devuelve:

```js
{
  ingredientes: { a: 8, b: 10, menor: 'A' },      // 'A' | 'B' | 'empate'
  pasos:        { a: 6, b: 5,  menor: 'B' },
  palabras:     { a: 320, b: 410, menor: 'A' },
  categoria:    { a: 'Chicken', b: 'Beef', coinciden: false },
  origen:       { a: 'Japanese', b: 'Italian', coinciden: false },
  etiquetasComunes: ['Meat'],
  video:        { a: true, b: false },
  ingredientesComunes: ['soy sauce'],
  ingredientesSoloA: ['chicken'],
  ingredientesSoloB: ['beef'],
  similitud: 20,                                  // porcentaje entero
  masSencilla: 'B'                                // 'A' | 'B' | 'empate'
}
```

Para `masSencilla` se comparan ingredientes, luego pasos y luego palabras; si todo
empata, `'empate'`. La similitud es
`comunes / (total de ingredientes distintos) * 100`, redondeada a entero.

---

## 7. Vistas (5)

Las vistas también implementan el ciclo de vida de la sección 5 y, además,
`obtenerEstado()` para que `app.js` pueda restaurarlas al volver del detalle.

| Vista | Issue / responsable | Props del constructor | Eventos que emite | Responsabilidad |
|---|---|---|---|---|
| `VistaInicio` | #39 · Sebastián | `{}` | `abrir-detalle`, `agregar-comparador`, `navegar` | Receta destacada aleatoria (sin repetir la anterior) y cuadrícula de categorías con descripción recortada a 120 caracteres. Carga ambas secciones en paralelo y tolera el fallo de una. |
| `VistaExplorar` | #40 · Sebastián | `{ estadoInicial }` | `abrir-detalle`, `agregar-comparador` | Formulario de criterios combinables, intersección de resultados, orden alfabético, paginación de 12 y resolución en paralelo de las tarjetas de la página visible. |
| `VistaCategoriasOrigenes` | #41 · Sebastián | `{ estadoInicial }` | `abrir-detalle`, `agregar-comparador` | Pestañas Categorías/Orígenes, listado y ficha con descripción, cantidad de recetas y tarjetas paginadas. |
| `VistaDetalle` | #42 · Andrés | `{ id, vistaOrigen }` | `volver`, `agregar-comparador` | Detalle completo, ingredientes, pasos, etiquetas, video y hasta 6 recetas relacionadas por categoría y 6 por origen, tolerando fallos parciales. |
| `VistaComparador` | #43 · Andrés | `{ paneles, recetaPendiente }` | `comparador-cambio` | Dos paneles, intercambio, comparación y elección en pantalla del panel a reemplazar cuando ambos están ocupados. |

`obtenerEstado()` devuelve un objeto serializable con lo necesario para restaurar la
vista: en Explorar, `{ criterios, pagina, resultados }`; en Categorías y orígenes,
`{ pestana, seleccion }`; en Inicio, `{ ultimaReceta }` para no repetirla.

---

## 8. Catálogo de eventos

Los eventos se emiten con `bubbles: true`. Los de aplicación se escuchan en
`document`; los internos, en la raíz de la vista que instanció el componente.

| Evento | `detail` | Emitido por | Escuchado por |
|---|---|---|---|
| `navegar` | `{ vista: 'inicio'\|'explorar'\|'categorias'\|'comparador' }` | `BarraNavegacion`, `VistaInicio` | `app.js` |
| `abrir-detalle` | `{ id, vistaOrigen }` | `TarjetaReceta`, tarjetas de categoría/origen | `app.js` |
| `volver` | `{ vista }` | `VistaDetalle` | `app.js` |
| `agregar-comparador` | `{ receta }` (receta normalizada completa) | `TarjetaReceta`, `VistaDetalle` | `app.js` |
| `comparador-cambio` | `{ cantidad, paneles: { A: receta\|null, B: receta\|null } }` | `VistaComparador` | `app.js` |
| `cambiar-pagina` | `{ pagina }` | `Paginador` | vista dueña |
| `buscar` | `{ criterios: { nombre?, categoria?, origen?, ingrediente? }, pagina: 1 }` | `FormularioBusqueda` | `VistaExplorar` |
| `limpiar` | `{}` | `FormularioBusqueda` | `VistaExplorar` |
| `reintentar` | `{ alcance }` | `EstadoCarga` | vista dueña |
| `reintentar-tarjeta` | `{ id }` | `TarjetaReceta` | vista dueña |
| `receta-elegida` | `{ panel: 'A'\|'B', receta }` | `PanelComparador` | `VistaComparador` |
| `vaciar-panel` | `{ panel: 'A'\|'B' }` | `PanelComparador` | `VistaComparador` |

Flujo del comparador:

1. Una tarjeta o el detalle emiten `agregar-comparador` con la receta normalizada.
2. `app.js` la guarda en el primer panel libre de `estadoApp.comparador`.
3. Si ambos paneles están ocupados, `app.js` navega al comparador con
   `recetaPendiente` y `VistaComparador` pregunta en pantalla qué panel reemplazar.
4. Ante cualquier cambio, `VistaComparador` emite `comparador-cambio`; `app.js`
   actualiza su estado, el contador de `BarraNavegacion` y el anuncio accesible.
5. Los paneles se conservan al navegar porque `app.js` los pasa como props al
   reconstruir la vista.

---

## 9. `app.js`: estado y ciclo de vida

```js
estadoApp = {
  vista: 'inicio',
  vistaAnterior: null,
  parametros: {},
  estadosVista: {},              // resultado de obtenerEstado() por vista
  comparador: { A: null, B: null },
  recetaPendiente: null
};
```

Responsabilidades:

- Montar `BarraNavegacion` una sola vez en `#barra-navegacion`.
- Crear la vista activa dentro de `#vista` y **destruir la anterior** antes de crear
  la nueva (`destruir()` + `AbortController`).
- Escuchar en `document` los eventos de aplicación de la sección 8.
- Guardar el estado de la vista saliente con `obtenerEstado()` y pasarlo como
  `estadoInicial` al volver del detalle, para conservar búsqueda, filtros y página.
- Actualizar la barra (vista activa y contador) y anunciar los cambios en `#anuncios`.
- Llevar el foco a `#vista` después de cada cambio de vista (accesibilidad).
- No renderizar datos de la API: solo coordina vistas y estado.

---

## 10. Errores de `api.js`

Todas las peticiones pasan por una función centralizada `pedir(ruta, { signal })`.
Cuando algo falla lanza un `ErrorApi`:

```js
class ErrorApi extends Error {
  constructor(tipo, mensaje, { estado = null, url = '' } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.tipo = tipo;       // 'red' | 'servicio' | 'datos' | 'cancelado'
    this.estado = estado;   // código HTTP cuando aplica
    this.url = url;
  }
}
```

| `tipo` | Cuándo se lanza | Mensaje de `EstadoCarga` | ¿Reintentar? |
|---|---|---|---|
| `red` | `fetch` rechaza (sin conexión, DNS, CORS) | «No hay conexión con el servicio. Revisa tu conexión e inténtalo de nuevo.» | Sí |
| `servicio` | `response.ok === false` | «El servicio no está disponible (HTTP {estado}).» | Sí |
| `datos` | JSON inválido o respuesta con forma inesperada | «El servicio devolvió una respuesta inesperada.» | Sí |
| `cancelado` | `AbortError` por `AbortController` | No se muestra: la petición fue reemplazada | No |

`api.js` expone además `esCancelacion(error)` para que las vistas ignoren los
abortos sin tratarlos como error. Una petición cancelada tampoco se cachea.

Funciones públicas de `api.js`:

```js
pedir(ruta, opciones)                 // centralizada; valida response.ok
buscarRecetas(nombre, opciones)       // search.php?s=
obtenerReceta(id, opciones)           // lookup.php?i=
obtenerRecetaAleatoria(opciones)      // random.php
obtenerCategorias(opciones)           // categories.php
obtenerOrigenes(opciones)             // list.php?a=list
obtenerIngredientes(opciones)         // list.php?i=list
filtrarPorCategoria(categoria, opciones)   // filter.php?c=
filtrarPorOrigen(origen, opciones)         // filter.php?a=
filtrarPorIngrediente(ingrediente, opciones) // filter.php?i=
esCancelacion(error)
```

La URL base es `https://www.themealdb.com/api/json/v1/1/` y todos los valores se
codifican con `encodeURIComponent`.

---

## 11. Uso de `Promise.all` y `Promise.allSettled`

| Lugar | Método | Por qué |
|---|---|---|
| Explorar: peticiones de los criterios aplicados | `Promise.all` | Sin todas las respuestas no se puede calcular la intersección; si una falla, la búsqueda completa falla. |
| Comparador: búsqueda interna | petición única con `AbortController` | No hay concurrencia que coordinar. |
| Inicio: receta destacada + categorías | `Promise.allSettled` | El enunciado exige que el fallo de una sección no impida mostrar la otra. |
| Detalle: relacionadas por categoría + por origen | `Promise.allSettled` | Cada sección se muestra de forma independiente. |
| Resolución de las tarjetas de la página visible | `Promise.allSettled` | Una tarjeta que falla se marca como incompleta y las demás se muestran. |
| Categorías y orígenes: listado + cantidad/ficha | `Promise.allSettled` | La ficha se muestra aunque falle el conteo. |

El README final (#44) ampliará esta tabla con las referencias exactas a cada archivo.

---

## 12. Caché en memoria (`cache.js`)

- `obtenerReceta(id)` / `guardarReceta(receta)` para recetas completas.
- `obtenerLista(clave)` / `guardarLista(clave, valor)` para categorías, orígenes,
  ingredientes y resultados de filtros.
- `limpiarCache()` solo para pruebas.
- Solo se cachean respuestas exitosas. La caché vive mientras dure la pestaña y no
  usa ningún mecanismo de persistencia.

---

## 13. Decisiones de diseño (#23)

**Nombre:** **Dos Fuegos**. Juega con los dos fogones de la cocina y con los dos paneles
del comparador: *dos recetas, una elección*. Es corto, pronunciable, no describe un
recetario genérico y permite una marca gráfica sencilla (dos llamas o dos puntos).
**Lema:** «Dos recetas, una elección».

**Concepto visual:** recetario editorial de papel cálido. Fondo hueso, tinta charcoal,
rojo brasa para la acción principal y azafrán para los destacados. La serif de los
títulos aporta el tono de libro de cocina; la sans de la interfaz mantiene la lectura
rápida y la mono se reserva para métricas y cantidades.

### 13.1. Paleta

Todos los valores viven en `css/tokens.css`. Ningún otro CSS debe escribir colores
literales.

| Token | Valor | Uso | Contraste comprobado |
|---|---|---|---|
| `--color-fondo` | `#FAF6EE` | Fondo general (papel cálido) | tinta 15.67:1 |
| `--color-superficie` | `#FFFDF8` | Tarjetas, campos y paneles | tinta 16.62:1 |
| `--color-superficie-alt` | `#F3EBDD` | Filas alternas y campos inactivos | tinta 14.27:1 |
| `--color-tinta` | `#211C17` | Texto principal | 15.67:1 sobre fondo |
| `--color-tinta-suave` | `#5E554B` | Metadatos y texto secundario | 6.77:1 sobre fondo |
| `--color-primario` | `#A63D2A` | Marca y acción principal (rojo brasa) | blanco 6.32:1 |
| `--color-primario-hover` | `#8A2F20` | Hover de la acción principal | blanco 8.37:1 |
| `--color-acento` | `#D99A26` | Destacados y detalles (azafrán) | tinta 6.92:1 |
| `--color-exito` | `#2F6B4F` | Éxito y confirmaciones | blanco 6.29:1 |
| `--color-error` | `#A3261C` | Errores | blanco 7.37:1 |
| `--color-aviso` | `#7A5300` | Avisos | blanco 6.85:1 |
| `--color-info` | `#2E5E8C` | Información | blanco 6.78:1 |
| `--color-foco` | `#1F5FBF` | Anillo de foco visible | 5.65:1 sobre fondo |

Los estados tienen además su variante `-suave` para fondos de avisos y etiquetas. La
paleta categórica (`--color-cat-1` a `--color-cat-8`) se usa como punto, borde o icono
sobre fondo claro; el texto de las etiquetas sigue siendo `--color-tinta`, de modo que
el contraste no depende del tono elegido.

### 13.2. Tipografía

| Rol | Stack | Uso |
|---|---|---|
| Títulos | `--fuente-titulo`: Iowan Old Style, Palatino, Georgia, serif | Nombre de la app, títulos de vista y nombres de recetas. |
| Interfaz | `--fuente-texto`: `system-ui`, Segoe UI, Roboto, Arial, sans-serif | Campos, botones, párrafos y navegación. |
| Datos | `--fuente-mono`: `ui-monospace`, Cascadia Mono, Consolas, monospace | Métricas del comparador, cantidades y tiempos. |

La escala va de `--texto-xs` (12 px) a `--texto-display` (44–64 px con `clamp`). Se usan
**stacks del sistema**: no hay fuentes externas ni CDN, por lo que la app conserva su
aspecto sin conexión y no depende de kits de terceros. El interlineado y los pesos
también están tokenizados (`--linea-*`, `--peso-*`).

### 13.3. Iconografía

- **Estilo:** línea geométrica con extremos y uniones redondeados, trazo
  `--icono-trazo` (1.75) sobre una cuadrícula de 24 × 24.
- **Color:** `currentColor`, para que el icono herede el estado del control.
- **Tamaños:** `--icono-sm` (16 px), `--icono-md` (20 px), `--icono-lg` (24 px) y
  `--icono-xl` (32 px). El área táctil mínima es `--area-tactil` (44 px).
- **Origen:** SVG propios en `assets/`, sin librerías de iconos ni fuentes de iconos.
- **Uso:** siempre acompañados de texto visible, salvo los universalmente reconocidos
  (cerrar, reproducir video, intercambiar paneles). Los decorativos llevan
  `aria-hidden="true"`; los interactivos, nombre accesible.
- **Estados:** hover y foco visibles; el foco usa `--color-foco` con `outline-offset`.

### 13.4. Formas, movimiento y referencias

- Radios suaves (`--radio-sm/md/lg`), bordes cálidos de 1 px y sombras discretas.
- Movimiento breve (120–320 ms) con `--curva-estandar`; se anula con
  `prefers-reduced-motion`.
- Referencias de inspiración: libros de cocina de corte editorial (maquetación a dos
  columnas, fotografía y serifas), tarjetas de receta de mediados de siglo XX y
  rotulación de mercados. La paleta parte del papel, el barro cocido, el azafrán y la
  oliva. No se usaron plantillas, temas ni kits de interfaz.

---

## 14. Pendientes y validación

- [ ] Validar este contrato con Andrés antes de cerrar #21.
- [x] Definir nombre, paleta, tipografía e iconografía en #23.
- [x] Completar `css/tokens.css` (#23).
- [ ] Completar `css/styles.css` (#34).
- [ ] Implementar la Fase 1 (`api.js`, `cache.js`, `recetas.js`, `comparacion.js`).
- [ ] Ampliar este README con la documentación final en #44 (capturas, división real
      del trabajo y referencias de `Promise.all`/`allSettled`).

Cualquier cambio en nombres de eventos, props o en la receta normalizada se avisa en
el issue correspondiente y se actualiza este documento en el mismo commit.
