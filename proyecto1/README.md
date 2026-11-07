# Horasstudio

**Horasstudio** es un armador de horarios académicos para crear, filtrar, comparar y guardar un horario definitivo sin solapamientos, a partir del catálogo de materias, secciones y bloques horarias de la asignación.

## Integrantes y división del trabajo

| Integrante | División del trabajo |
|---|---|
| Sebastián Alsleben | Estructura base, datos, tiempo, catálogo, selección con tope de UC, fijar/excluir secciones, materias manuales, choques e incompatibilidades, generador con descarte temprano, preferencias y ordenamiento, integración de ramas del compañero y coordinación. |
| Andrés Acure | Rejilla semanal con CSS Grid, navegación entre opciones, métricas del horario, detalle de sesiones, horario definitivo con tabla por materia, versión imprimible, identidad visual (tokens), ajustes de CSS, integración visual. |

*El desarrollo fue iterativo con integración continua de ramas y coordinación entre ambas partes para conectar los módulos.*

## ¿Cómo ejecutar?

La aplicación es **100 % estática**. No requiere servidor, Node, build ni dependencias externas.

1. Clonar o descargar el repositorio.
2. Abrir `index.html` directamente en un navegador moderno (Chrome, Firefox, Edge).
3. Usar la aplicación desde `file://`.

> No se usa `localStorage`, `sessionStorage`, `IndexedDB`, cookies, `alert()`, `confirm()` ni `prompt()`. Todo el estado vive en memoria mientras la pestaña está abierta.

## Orden de ejecución de los módulos

Los scripts se cargan en `index.html` de la siguiente manera (datos primero, lógica, coordinación al final):

```html
<!-- Datos -->
<script src="data/bloques.js"></script>
<script src="data/materias.js"></script>

<!-- Núcleo -->
<script src="js/tiempo.js"></script>
<script src="js/datos.js"></script>
<script src="js/catalogo.js"></script>
<script src="js/seleccion.js"></script>
<script src="js/formulario.js"></script>
<script src="js/choques.js"></script>
<script src="js/generador.js"></script>
<script src="js/preferencias.js"></script>
<script src="js/rejilla.js"></script>
<script src="js/resumen.js"></script>

<!-- Punto de entrada y coordinación -->
<script src="js/app.js"></script>
```

`js/app.js` es el único punto de arranque: inicializa los módulos en orden (`selección` → `catálogo` → `formulario` → `generador` → `preferencias` → `rejilla` → `resumen`), mantiene el **estado global en memoria** y coordina los eventos entre vistas.

## Flujo de uso

1. **Catálogo** – Buscar por código o nombre y filtrar por trimestre. Agregar materias con el botón *Agregar/Quitar*.
2. **Selección** – Ver materias elegidas, total de UC y tope (por defecto 28). Agregar un trimestre completo o ajustar el tope. Para cada materia se puede **elegir una clase** (`Elegir esta clase` / `Quitar elección` / `Cambiar clase`) o **excluir secciones** (se debe dejar al menos una disponible). También se pueden gestionar **materias manuales** (agregar/editar/eliminar con validación).
3. **Choques e incompatibilidades** – Se muestran las incompatibilidades entre las materias seleccionadas.
4. **Generador** – Pulsar *Generar horarios*. Usa **backtracking con descarte temprano**: en cuanto una sección choca con lo ya elegido, esa rama se abandona. Respeta secciones fijadas y excluidas. Si no hay combinaciones válidas, se indican las materias incompatibles.
5. **Preferencias y ordenamiento** – Filtrar por **días libres** (no se mostrarán horarios que usen esos días), rango de **hora mínima de entrada** / **hora máxima de salida** (inclusivos) y **ordenar** por *Menos días*, *Menos horas muertas* o *Salida más temprana*. Los empates conservan el orden del generador.
6. **Rejilla semanal** – Navegar entre opciones con *Anterior/Siguiente*, ver **métricas** (días de asistencia, horas muertas, entrada más temprana, salida más tardía), detalle al pulsar una sesión y elegir *Elegir como horario definitivo*.
7. **Horario definitivo** – Se guarda una **copia independiente** del resultado elegido. Se muestra en rejilla (no interactiva) y en **tabla por materia** con horario, aula, profesor y total de UC. Se puede imprimir desde *Imprimir resumen* (vista optimizada para impresión).

## Criterios de ordenamiento y métricas

**Métricas mostradas en la rejilla:**
- **Días de asistencia** – Número de días distintos con al menos una clase.
- **Horas muertas** – Huecos libres entre la primera y última clase del día (suma sobre todos los días).
- **Entrada más temprana** / **Salida más tardía** – Extremos del horario completo.

**Criterios de ordenamiento (`js/preferencias.js`):**
- **Menos días** – Prioriza horarios con menos días de asistencia.
- **Menos horas muertas** – Prioriza horarios con menos huecos.
- **Salida más temprana** – Prioriza por la **media** de la hora de salida por día con clases.
- **Empates** – Se conserva el orden original devuelto por el generador (estable).
- **Lógica pura** separada del DOM; el filtrado y el ordenado se aplican antes de pintar la rejilla.

## Decisiones de diseño

### Paleta y tokens
- **Tokens centralizados** en `css/tokens.css` (`--fondo`, `--superficie`, `--texto`, `--texto-apagado`, `--acento`, `--borde`, `--error`).
- **Paleta categórica de materias** (`--materia-1` … `--materia-8`) validada con simulación de daltonismo (Machado–Oliveira–Fernandes 2009, severidad 1.0) y contraste WCAG AA.
- **Reglas estrictas**: el color sigue a la **materia**, nunca a la posición; el orden de slots es fijo; el **texto siempre usa tokens de texto** (el color refuerza, la identidad es el código/sección/aula).

### Tipografías
- **Sistema tipográfico nativo**: `system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`. Sin dependencias externas ni webfonts.

### Iconografía
- **Sin librería de iconos**. Se usan texto, estados (`Elegida`/`Excluida`), contadores y botones con etiquetas claras.

### Impresión
- **Vista monocroma para imprimir** (`css/print.css`). La identidad de materia se codifica con el **código** y una **trama de borde** (`border-left` con distintos estilos/grosor por slot), nunca solo con color. Layout A4 horizontal: la rejilla en la primera página y la tabla en la segunda.

### Coordinación
- **`js/app.js`** actúa como punto de entrada y coordinación. Mantiene un **estado global en memoria** y usa un bus de eventos entre módulos. Todas las notificaciones van al DOM (sin diálogos nativos). Las vistas se mantienen integradas mediante la franja de estado de la cabecera.

### Inspiración
- **Planificadores de horarios académicos** (enfoque en legibilidad, navegación clara entre alternativas y selección de un horario definitivo).
- **Diseño minimalista funcional**: prioriza la información horaria sobre la decoración.

## Capturas de pantalla

*Las capturas se añadirán al finalizar la validación cruzada (Fase 6). Se incluirá la **vista normal** y la **vista imprimible** del horario definitivo.*

## Tecnologías

- **HTML5**, **CSS3** (Grid, Flexbox, variables CSS, `@media print`), **JavaScript Vanilla** (ES6+, sin módulos ES, sin frameworks, sin librerías).
