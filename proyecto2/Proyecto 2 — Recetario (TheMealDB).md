# Especificaciones del Proyecto: "Recetario" (Edición en Pareja)

**Curso:** Desarrollo de Lenguajes para Clientes Web **Tecnologías:** HTML5, CSS3, JavaScript (Vanilla) **API:** TheMealDB (pública y gratuita) **Modalidad:** Trabajo en pareja (2 integrantes) **Profesor:** Ing. Victor Kneider

---

## 1. Descripción General

El objetivo de este proyecto es desarrollar una aplicación web de página única (SPA) que consuma la API pública **TheMealDB** para explorar, consultar y comparar recetas de cocina. Toda la información de la aplicación se obtiene de la API en tiempo de ejecución: no hay datos locales ni persistencia.

La aplicación cuenta con **cinco vistas**: inicio, exploración con filtros combinados, detalle de receta, categorías y orígenes, y un **comparador de dos recetas**. La interfaz debe construirse íntegramente con **pseudocomponentes**: clases de JavaScript propias que encapsulan estado, renderizado, eventos y destrucción de cada pieza de la interfaz, y que se comunican entre sí mediante eventos personalizados.

## 2. Objetivos de Aprendizaje

Al finalizar este proyecto, los estudiantes serán capaces de:

- Consumir una **API REST pública** con `fetch` y `async/await`, validando las respuestas y manejando los errores de red y de servidor.
- Coordinar **peticiones en paralelo** con `Promise.all` y `Promise.allSettled`, eligiendo cada una según el comportamiento esperado ante fallos parciales.
- **Combinar y transformar datos** provenientes de varias peticiones (intersección de resultados, normalización de campos, cálculo de métricas).
- Diseñar la interfaz como una composición de **pseudocomponentes** basados en clases, con estado propio, ciclo de vida y comunicación mediante `CustomEvent`.
- Controlar la experiencia de uso en operaciones asíncronas: estados de carga, vacíos y de error, cancelación de peticiones obsoletas y caché en memoria.
- **Trabajar de forma colaborativa** con Git, dividiendo responsabilidades, resolviendo conflictos y manteniendo un historial de commits consistente por ambos integrantes.

---

## 3. API a Consumir: TheMealDB

TheMealDB es una base de datos pública de recetas. Se utiliza la **versión 1 con la clave de prueba `1`**, destinada a desarrollo y uso educativo. No requiere registro.

**URL base:** `https://www.themealdb.com/api/json/v1/1/`

### 3.1. Endpoints

Solo se permite el uso de los siguientes endpoints:

| Endpoint | Descripción |
| --- | --- |
| `search.php?s={nombre}` | Busca recetas por nombre. Devuelve recetas completas. |
| `lookup.php?i={id}` | Devuelve la receta completa con el identificador indicado. |
| `random.php` | Devuelve una receta completa al azar. |
| `categories.php` | Lista las categorías con imagen y descripción. |
| `list.php?a=list` | Lista los orígenes (cocinas) disponibles. |
| `list.php?i=list` | Lista los ingredientes disponibles. |
| `filter.php?c={categoría}` | Recetas de una categoría. Devuelve recetas resumidas. |
| `filter.php?a={origen}` | Recetas de un origen. Devuelve recetas resumidas. |
| `filter.php?i={ingrediente}` | Recetas que contienen un ingrediente. Devuelve recetas resumidas. |

Los endpoints de filtro aceptan **un solo valor por petición**. Cuando una consulta no tiene resultados, la API responde con el campo `meals` en `null`.

### 3.2. Estructura de los datos

**Receta resumida** (respuesta de `filter.php`):

| Campo | Descripción |
| --- | --- |
| `idMeal` | Identificador de la receta. |
| `strMeal` | Nombre. |
| `strMealThumb` | URL de la imagen. |

**Receta completa** (respuesta de `search.php`, `lookup.php` y `random.php`), además de los campos anteriores:

| Campo | Descripción |
| --- | --- |
| `strCategory` | Categoría. |
| `strArea` | Origen. |
| `strInstructions` | Instrucciones de preparación en un único texto. |
| `strTags` | Etiquetas separadas por comas. Puede ser `null`. |
| `strYoutube` | Enlace a un video de la preparación. Puede estar vacío. |
| `strIngredient1` … `strIngredient20` | Nombre de cada ingrediente. Los no utilizados vienen vacíos o en `null`. |
| `strMeasure1` … `strMeasure20` | Medida del ingrediente con el mismo número. |

**Categoría** (respuesta de `categories.php`): `idCategory`, `strCategory`, `strCategoryThumb` (URL de la imagen) y `strCategoryDescription` (texto descriptivo).

**Imagen de ingrediente:** TheMealDB publica la imagen de cada ingrediente en `https://www.themealdb.com/images/ingredients/{nombre}.png`, donde `{nombre}` es el nombre del ingrediente.

---

## 4. Requerimientos Funcionales

### 4.1. Navegación

- La aplicación tiene un único `index.html`. Las vistas se intercambian dinámicamente sin recargar la página.
- Una barra de navegación permanente da acceso a **Inicio**, **Explorar**, **Categorías y orígenes** y **Comparador**. El enlace al comparador indica cuántas recetas tiene cargadas (0, 1 o 2).
- La vista activa se distingue visualmente en la barra de navegación.
- Desde la vista de detalle, un botón **Volver** regresa a la vista de origen **conservando su estado**: búsqueda, filtros aplicados y página actual.

### 4.2. Vista de Inicio

- **Receta destacada:** al cargar, se muestra una receta obtenida al azar con su imagen, nombre, categoría y origen, y un acceso a su detalle.
- Un botón **Otra receta** obtiene una nueva receta al azar. La receta mostrada no puede repetirse de forma consecutiva.
- **Cuadrícula de categorías:** todas las categorías con su imagen, nombre y los primeros 120 caracteres de su descripción seguidos de puntos suspensivos. Cada categoría abre su ficha (sección 4.5).
- La receta destacada y las categorías se solicitan **en paralelo**. Si una de las dos peticiones falla, la otra sección se muestra igualmente y la que falló muestra su propio mensaje de error con opción de reintentar.

### 4.3. Vista Explorar

- **Criterios de búsqueda**, combinables entre sí:
  - **Nombre:** campo de texto. La búsqueda se ejecuta al enviar el formulario.
  - **Categoría:** selector con las categorías de la API.
  - **Origen:** selector con los orígenes de la API.
  - **Ingrediente:** campo con sugerencias obtenidas de la lista de ingredientes de la API, filtradas mientras el usuario escribe.
- Se requiere al menos un criterio. Los criterios se combinan con **intersección**: una receta aparece en los resultados solo si cumple todos los criterios aplicados.
- Las peticiones de cada criterio aplicado se realizan **en paralelo**.
- Se muestra la cantidad total de resultados, ordenados alfabéticamente por nombre.
- **Paginación en el cliente** de 12 resultados por página, con indicación de la página actual y del total de páginas.
- Cada resultado se presenta como una **tarjeta** con imagen, nombre, categoría, origen y cantidad de ingredientes. Como los filtros devuelven recetas resumidas, el detalle de las recetas de la **página visible** se resuelve en paralelo al mostrarla.
- Si la resolución de una receta falla, su tarjeta muestra solo los datos resumidos, se marca como incompleta y ofrece reintentar de forma individual. El resto de la página se muestra con normalidad.
- Un botón **Limpiar** elimina todos los criterios y resultados.
- Cada tarjeta permite abrir el detalle y **agregar la receta al comparador**.

### 4.4. Vista de Detalle

- Imagen, nombre, categoría, origen y etiquetas de la receta. Las etiquetas se obtienen separando `strTags` por comas, descartando espacios sobrantes y valores vacíos.
- **Lista de ingredientes** con la imagen, el nombre y la medida de cada uno. Si la imagen de un ingrediente no carga, se reemplaza por una imagen alternativa definida por la pareja.
- **Pasos de preparación** numerados. Un paso es cada línea no vacía de `strInstructions`, descartando las líneas que solo contienen un encabezado de numeración (por ejemplo, "STEP 1" o "1.").
- Enlace al video de la preparación, que se abre en una pestaña nueva. Si la receta no tiene video, el enlace no se muestra.
- **Recetas relacionadas:** hasta 6 recetas de la misma categoría y hasta 6 del mismo origen, excluyendo la receta actual, en dos secciones separadas. Ambas consultas se realizan en paralelo, y el fallo de una no impide mostrar la otra.
- Acceso para **agregar la receta al comparador**.

### 4.5. Vista de Categorías y Orígenes

- Dos pestañas: **Categorías** y **Orígenes**.
- **Categorías:** listado de todas las categorías. Al seleccionar una se muestra su ficha: imagen, nombre, descripción completa, cantidad de recetas y sus recetas en tarjetas con la misma paginación y resolución de detalle de la sección 4.3.
- **Orígenes:** listado de todos los orígenes. Al seleccionar uno se muestran la cantidad de recetas y sus recetas en tarjetas con el mismo comportamiento.

### 4.6. Comparador

- El comparador tiene **dos paneles** (A y B). Cada panel contiene un **buscador interno por nombre** que muestra resultados mientras el usuario escribe y permite elegir una receta.
- Al agregar una receta al comparador desde otra vista, ocupa el primer panel libre. Si ambos están ocupados, se pregunta en pantalla qué panel reemplazar.
- No se puede comparar una receta consigo misma. El intento se informa en pantalla.
- Cada panel muestra la imagen, el nombre, la categoría y el origen de su receta, y permite vaciarlo.
- Un botón intercambia las recetas entre los paneles.
- Cuando ambos paneles tienen receta, se muestra la **comparación**:

| Métrica | Cálculo |
| --- | --- |
| Cantidad de ingredientes | Ingredientes no vacíos de cada receta. |
| Cantidad de pasos | Según la definición de paso de la sección 4.4. |
| Extensión de las instrucciones | Cantidad de palabras de `strInstructions`. |
| Categoría y origen | Valor de cada receta, indicando si coinciden. |
| Etiquetas en común | Etiquetas presentes en ambas recetas. |
| Video | Si cada receta tiene o no video. |
| Ingredientes en común | Ingredientes presentes en ambas recetas. |
| Ingredientes exclusivos | Ingredientes presentes solo en A y solo en B, en dos grupos separados. |
| Similitud | Ingredientes en común dividido entre el total de ingredientes distintos de ambas recetas, expresado como porcentaje entero. |

- La comparación de ingredientes y etiquetas **no distingue mayúsculas de minúsculas** e ignora espacios sobrantes al inicio y al final.
- En las métricas numéricas se resalta el menor valor.
- Se declara la **receta más sencilla**: la de menos ingredientes. En caso de empate, la de menos pasos; si persiste, la de menos palabras en sus instrucciones. Si persiste, se declara empate.
- Las recetas del comparador se conservan al navegar entre vistas durante la sesión.

### 4.7. Estados de Carga, Vacíos y Errores

- Toda operación asíncrona muestra un **indicador de carga** en la sección afectada, sin bloquear el resto de la interfaz.
- Cada vista y sección tiene un **estado vacío** diseñado (sin criterios, sin resultados, comparador sin recetas).
- La aplicación distingue y comunica con mensajes específicos los siguientes casos:

| Caso | Condición | Comportamiento |
| --- | --- | --- |
| Entrada inválida | Texto vacío o de menos de 2 caracteres, o ningún criterio aplicado. | Mensaje junto al campo, sin realizar peticiones. |
| Sin resultados | La API responde con `meals` en `null` o la intersección queda vacía. | Mensaje de estado vacío en la sección. |
| Sin conexión | La petición no llega al servidor. | Mensaje de conexión con opción de reintentar. |
| Servicio no disponible | El servidor responde con un estado de error. | Mensaje con el estado recibido y opción de reintentar. |
| Fallo parcial | Falla una parte de un conjunto de peticiones en paralelo. | Se muestra lo obtenido y se marca lo que falló (secciones 4.2, 4.3 y 4.4). |

- Todos los mensajes se integran al DOM.

---

## 5. Requerimientos Técnicos

### 5.1. Maquetación y Estilos (HTML/CSS)

- **Estructura HTML:** Debe ser semántica y bien organizada. El `index.html` contiene solo la estructura base: barra de navegación y contenedor de vistas.
- **Diseño Responsivo:** Uso de CSS Grid o Flexbox para cuadrículas de tarjetas, comparador y estructura general. Ninguna vista debe producir desplazamiento horizontal en pantallas móviles.
- **Comparador responsivo:** En pantallas anchas, los paneles A y B se muestran lado a lado. En pantallas estrechas se apilan, sin perder la lectura de la comparación.
- **Transiciones:** Se requieren transiciones visuales al cambiar de vista y al aparecer los resultados de una carga.
- **Indicadores de carga:** Deben tener la forma del contenido que reemplazan (tarjetas, detalle, paneles), no un único indicador genérico para toda la página.

### 5.2. Asincronía y Comunicación con la API

- **`async/await`:** Toda la lógica asíncrona se escribe con `async/await`. No se permiten cadenas de `.then()`.
- **Manejo de errores:** Cada función asíncrona maneja sus errores con `try/catch`. Ningún error se reporta únicamente en consola.
- **Función de petición centralizada:** Todas las peticiones pasan por una única función que verifica `response.ok` antes de leer el JSON y distingue los casos de la sección 4.7.
- **Paralelismo:** Las peticiones independientes entre sí se ejecutan en paralelo. No se permite esperar secuencialmente, dentro de un ciclo, peticiones que no dependen unas de otras.
- **`Promise.all` y `Promise.allSettled`:** Se usa `Promise.allSettled` donde la sección 4 exige tolerar fallos parciales, y `Promise.all` donde todas las respuestas son necesarias para continuar. El README debe indicar dónde se usó cada una y por qué.
- **Caché en memoria:** Una receta completa ya obtenida no se vuelve a solicitar durante la sesión. Las listas de categorías, orígenes e ingredientes se solicitan una sola vez.
- **Búsqueda del comparador:** El buscador interno de cada panel espera a que el usuario deje de escribir al menos 400 ms antes de consultar la API (*debounce*), y **cancela la petición anterior** con `AbortController` cuando inicia una nueva. Una petición cancelada no debe mostrarse como error.
- **Respuestas obsoletas:** Si el usuario cambia de vista, de página o de criterios antes de que termine una carga, los resultados que lleguen tarde no deben sobrescribir el contenido actual.

### 5.3. Pseudocomponentes

La interfaz se construye con **pseudocomponentes**: clases de JavaScript propias que encapsulan una pieza de la interfaz. No se permite el uso de Custom Elements (`customElements.define`), Shadow DOM ni plantillas de Web Components.

- Se requieren **al menos 8 pseudocomponentes distintos**.
- Cada pseudocomponente:
  - Recibe en su constructor el **contenedor** donde se monta y sus **propiedades** iniciales.
  - Mantiene su **estado interno** y lo modifica solo mediante sus propios métodos.
  - Separa en métodos distintos la **creación** de su elemento, el **renderizado**, la configuración de **eventos** y la **destrucción**.
  - Implementa un método **`destruir()`** que elimina su elemento del DOM y los recursos que haya creado.
- **Reutilización:** al menos 2 pseudocomponentes deben instanciarse varias veces con datos distintos. Como mínimo, la tarjeta de receta (Explorar, Categorías y orígenes, recetas relacionadas) y el panel del comparador (A y B).
- **Comunicación:** los pseudocomponentes notifican sus acciones mediante `CustomEvent` con los datos en `detail`. Ningún pseudocomponente accede ni modifica el DOM interno de otro.
- **Ciclo de vida:** al cambiar de vista, los pseudocomponentes de la vista anterior se destruyen.
- **Datos de la API en el DOM:** el texto proveniente de la API se inserta con `textContent` o como valor de atributos. No se permite insertar datos de la API mediante `innerHTML`. `innerHTML` solo puede usarse para estructura estática.

### 5.4. Restricciones Generales

- **Sin librerías externas:** No se permite el uso de jQuery, axios, frameworks o utilidades externas. Todo el código debe ser JavaScript puro (Vanilla).
- **Sin persistencia:** No se permite el uso de `localStorage`, `sessionStorage`, `IndexedDB` ni cookies. Todo el estado vive en memoria durante la sesión.
- **Prohibido:** El uso de `alert()`, `confirm()` o `prompt()` para cualquier interacción con el usuario.
- **Organización en múltiples archivos:** Cada pseudocomponente se ubica en su propio archivo. Los archivos se cargan desde `index.html` mediante etiquetas `<script>` en el orden correcto. **No se requiere ni se evaluará el uso de módulos ES (`import`/`export`)**.
- **Endpoints:** Solo se permiten los endpoints de la sección 3.1.

### 5.5. Estructura de Archivos Sugerida

A modo de referencia, una organización válida del proyecto es:

```
/proyecto
  index.html
  /css
    styles.css
  /js
    /servicios
      api.js              → función de petición centralizada y endpoints
      cache.js            → caché en memoria
      recetas.js          → normalización de recetas (ingredientes, pasos, etiquetas)
      comparacion.js      → cálculo de métricas del comparador
    /componentes
      BarraNavegacion.js
      TarjetaReceta.js
      Paginador.js
      FormularioBusqueda.js
      ListaIngredientes.js
      PasosPreparacion.js
      PanelComparador.js
      TablaComparacion.js
      EstadoCarga.js      → indicadores de carga, vacío y error
    /vistas
      VistaInicio.js
      VistaExplorar.js
      VistaDetalle.js
      VistaCategoriasOrigenes.js
      VistaComparador.js
    app.js                → punto de entrada y cambio de vistas
  /assets
    ...                   → imágenes alternativas e iconos
```

Esta estructura es una **sugerencia**; la pareja puede ajustarla siempre que justifique la separación por responsabilidades y mantenga la carga ordenada de scripts en `index.html`.

### 5.6. Originalidad y Personalización

- **Identidad de la aplicación:** El proyecto debe incluir un **nombre original y creativo** (diferente a "Recetario", que es solo el nombre genérico del proyecto).
- **Identidad visual:** Paleta, tipografía e iconografía coherentes en toda la aplicación.
- **Interfaz de diseño propio:** No se permite usar plantillas, temas o kits de interfaz de terceros (Bootstrap, Tailwind, Bulma u otros).
- **Componentes con estilo propio:** Botones, campos, selectores, pestañas, tarjetas y avisos con estilo definido por la pareja. No se aceptan controles con la apariencia por defecto del navegador.
- **Interacción visible:** Todos los elementos interactivos tienen estados de *hover* y de foco visibles, y el foco puede seguirse al navegar con teclado.
- **Elementos personalizados:** Se valorará la creatividad en la presentación del comparador, los estados vacíos y de error, y los detalles que mejoren la experiencia de uso.

---

## 6. Modalidad de Trabajo en Pareja

El proyecto se desarrolla en parejas de **dos integrantes**. Ambos miembros son responsables del producto final en su totalidad, pero deben repartir el trabajo de forma equilibrada y dejar evidencia de ello.

La **coordinación de la arquitectura general** (qué pseudocomponentes existen, qué eventos emite y escucha cada uno, formato de los datos normalizados, integración final) es **responsabilidad conjunta**.

### 6.1. Evidencia de Trabajo Colaborativo

- **Ambos integrantes deben tener commits propios** en el repositorio de forma consistente a lo largo del tiempo del proyecto. No se aceptarán repositorios donde más del 80% de los commits sean de un solo integrante.
- En la presentación final, **ambos integrantes deben poder explicar cualquier parte del código**, no únicamente la suya.

---

## 7. Entrega y Control de Versiones

> **Nota:** Los criterios y la escala de evaluación del proyecto están detallados en el documento de **rúbrica** adjunto, publicado junto a este enunciado en Google Classroom.

### 7.1. Repositorio Git

- El proyecto debe estar alojado en un repositorio de Git (GitHub).
- El repositorio debe tener configurados como colaboradores a **ambos integrantes** desde el inicio del proyecto.
- **Estructura recomendada de commits:**
  - Commit inicial con estructura básica del proyecto.
  - Commits incrementales por funcionalidad (función de petición, caché, navegación, inicio, explorar, detalle, categorías y orígenes, comparador, estados de error, etc.).
  - Mensajes de commit descriptivos en español o inglés, consistentes en idioma.

### 7.2. Entregables

1. **Código fuente completo** en repositorio Git (link entregado por Google Classroom).
2. Aplicación funcionando localmente abriendo `index.html` (no requiere servidor).
3. **Archivo `README.md`** que incluya:
   - Nombre original de la aplicación y descripción.
   - Nombres de los dos integrantes y división del trabajo realizado.
   - Instrucciones para ejecutar el proyecto.
   - Lista de pseudocomponentes con su responsabilidad y los eventos que emite cada uno.
   - Dónde se usó `Promise.all` y dónde `Promise.allSettled`, y por qué.
   - Sección de **decisiones de diseño**: paleta de colores, tipografías, criterio de iconografía y referencias de inspiración.
   - Capturas de pantalla de cada vista.
