# Dos Fuegos

Aplicación de una sola página para explorar, consultar y comparar recetas de
[TheMealDB](https://www.themealdb.com/).

## Integrantes y división del trabajo

- **Sebastián Alsleben:** api, caché, `app.js`, barra de navegación, tarjeta, listado,
  paginador, formulario, Inicio, Explorar y Categorías y orígenes.
- **Andrés Acure:** identidad visual, estilos, recetas, comparación, estados de carga,
  ingredientes, pasos, comparador, Detalle, README y pruebas.

## ¿Cómo ejecutar?

Abrir `index.html` en el navegador. No necesita servidor ni instalación.

## Archivos

Todo el JavaScript está en `js/`, un archivo por pseudocomponente. `index.html` los carga
en este orden: servicios (`api`, `cache`, `recetas`, `comparacion`), componentes, vistas
y por último `app.js`.

## Contrato de arquitectura

Cada pseudocomponente es una clase con `constructor(contenedor, props)` y los métodos
`crear()`, `render()`, `configurarEventos()` y `destruir()`. Se comunican con
`CustomEvent` que burbujean, y `app.js` escucha los eventos de la aplicación en
`document`. Las vistas tienen además `obtenerEstado()`, para que **Volver** las deje
como estaban.

| Pseudocomponente | Responsable | Qué hace | Eventos que emite |
|---|---|---|---|
| `BarraNavegacion` | Sebastián | Enlaces a las vistas, vista activa y contador del comparador | `navegar { vista }` |
| `TarjetaReceta` | Sebastián | Imagen, nombre, categoría, origen y cantidad de ingredientes | `abrir-detalle { id }`, `agregar-comparador { receta }`, `reintentar-tarjeta { id }` |
| `ListadoRecetas` | Sebastián | Tarjetas de la página actual y el detalle de cada una | — |
| `Paginador` | Sebastián | Página actual y total, 12 recetas por página | `cambiar-pagina { pagina }` |
| `FormularioBusqueda` | Sebastián | Nombre, categoría, origen e ingrediente | `buscar { criterios }`, `limpiar` |
| `EstadoCarga` | Andrés | Carga, vacío y error de una sección | `reintentar` |
| `ListaIngredientes` | Andrés | Ingredientes con imagen y medida | — |
| `PasosPreparacion` | Andrés | Pasos numerados | — |
| `PanelComparador` | Andrés | Panel A o B con su buscador | `receta-elegida { panel, receta }`, `vaciar-panel { panel }` |
| `TablaComparacion` | Andrés | Métricas de las dos recetas | — |
| `VistaInicio` | Sebastián | Receta destacada y categorías | `abrir-detalle`, `navegar` |
| `VistaExplorar` | Sebastián | Búsqueda combinada y resultados | — |
| `VistaCategoriasOrigenes` | Sebastián | Pestañas, listados y fichas | — |
| `VistaDetalle` | Andrés | Detalle y recetas relacionadas | `volver`, `agregar-comparador` |
| `VistaComparador` | Andrés | Los dos paneles y la comparación | `comparador-cambio { paneles }` |

### Servicios

- **`Api`** (`api.js`): todas las peticiones pasan por `Api.pedir`. Cada función devuelve
  un arreglo, vacío si no hay resultados. Si algo falla lanza un `ErrorApi` con `tipo`
  `'red'`, `'servicio'` (con el `estado` HTTP), `'datos'` o `'cancelado'` (este no se
  muestra).
- **`CacheApi`** (`cache.js`): cada receta y cada lista (categorías, orígenes e
  ingredientes) se pide una sola vez.
- **`Recetas`** (`recetas.js`): convierte una receta de la API en
  `{ id, nombre, imagen, categoria, origen, etiquetas, ingredientes, pasos, palabras, video, completa }`,
  donde cada ingrediente es `{ nombre, medida, imagen }`.
- **`Comparacion`** (`comparacion.js`): calcula las métricas del comparador a partir de
  dos recetas.

---

## Decisiones de diseño

> **Issue #23 · Fase 0.** Identidad visual definida por Andrés.

**Nombre:** **Dos Fuegos**. Juega con los dos fogones de la cocina y con los dos paneles
del comparador: *dos recetas, una elección*. Es corto, pronunciable, no describe un
recetario genérico y permite una marca gráfica sencilla (dos llamas o dos puntos).
**Lema:** «Dos recetas, una elección».

**Concepto visual:** recetario editorial de papel cálido. Fondo hueso, tinta charcoal,
rojo brasa para la acción principal y azafrán para los destacados. La serif de los
títulos aporta el tono de libro de cocina; la sans de la interfaz mantiene la lectura
rápida y la mono se reserva para métricas y cantidades.

Todos los valores viven en [`css/tokens.css`](css/tokens.css). Ningún otro CSS debe
escribir colores literales: los estilos consumen las custom properties.

---

### Paleta

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

### Tipografía

| Rol | Stack | Uso |
|---|---|---|
| Títulos | `--fuente-titulo`: Iowan Old Style, Palatino, Georgia, serif | Nombre de la app, títulos de vista y nombres de recetas. |
| Interfaz | `--fuente-texto`: `system-ui`, Segoe UI, Roboto, Arial, sans-serif | Campos, botones, párrafos y navegación. |
| Datos | `--fuente-mono`: `ui-monospace`, Cascadia Mono, Consolas, monospace | Métricas del comparador, cantidades y tiempos. |

La escala va de `--texto-xs` (12 px) a `--texto-display` (44–64 px con `clamp`). Se usan
**stacks del sistema**: no hay fuentes externas ni CDN, por lo que la app conserva su
aspecto sin conexión y no depende de kits de terceros. El interlineado y los pesos
también están tokenizados (`--linea-*`, `--peso-*`).

### Iconografía

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

### Formas, movimiento y referencias

- Radios suaves (`--radio-sm/md/lg`), bordes cálidos de 1 px y sombras discretas.
- Movimiento breve (120–320 ms) con `--curva-estandar`; se anula con
  `prefers-reduced-motion`.
- Referencias de inspiración: libros de cocina de corte editorial (maquetación a dos
  columnas, fotografía y serifas), tarjetas de receta de mediados de siglo XX y
  rotulación de mercados. La paleta parte del papel, el barro cocido, el azafrán y la
  oliva. No se usaron plantillas, temas ni kits de interfaz.

### Cómo consumir los tokens

```css
.boton-primario {
  background: var(--color-primario);
  color: var(--color-sobre-primario);
  border-radius: var(--radio-md);
  padding: var(--espacio-2) var(--espacio-4);
  font-family: var(--fuente-texto);
  font-size: var(--texto-base);
  transition: background var(--duracion-rapida) var(--curva-estandar);
}

.boton-primario:hover {
  background: var(--color-primario-hover);
}

.boton-primario:focus-visible {
  outline: var(--borde-foco);
  outline-offset: 2px;
}
```

### Verificación

- Contrastes calculados con la fórmula WCAG 2.1; todos los pares de texto superan
  **AA (≥ 4.5:1)**.
- Sin fuentes, iconos, plantillas ni kits externos.
- Sin colores literales fuera de `css/tokens.css`.
