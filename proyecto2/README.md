# Dos Fuegos — Decisiones de diseño

> Sección correspondiente al issue **#23** (Fase 0). El contrato de arquitectura
> (#21) y la estructura base (#22) se agregarán a este README cuando se implementen;
> este documento no los reemplaza.

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

## Paleta

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

## Tipografía

| Rol | Stack | Uso |
|---|---|---|
| Títulos | `--fuente-titulo`: Iowan Old Style, Palatino, Georgia, serif | Nombre de la app, títulos de vista y nombres de recetas. |
| Interfaz | `--fuente-texto`: `system-ui`, Segoe UI, Roboto, Arial, sans-serif | Campos, botones, párrafos y navegación. |
| Datos | `--fuente-mono`: `ui-monospace`, Cascadia Mono, Consolas, monospace | Métricas del comparador, cantidades y tiempos. |

La escala va de `--texto-xs` (12 px) a `--texto-display` (44–64 px con `clamp`). Se usan
**stacks del sistema**: no hay fuentes externas ni CDN, por lo que la app conserva su
aspecto sin conexión y no depende de kits de terceros. El interlineado y los pesos
también están tokenizados (`--linea-*`, `--peso-*`).

## Iconografía

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

## Formas, movimiento y referencias

- Radios suaves (`--radio-sm/md/lg`), bordes cálidos de 1 px y sombras discretas.
- Movimiento breve (120–320 ms) con `--curva-estandar`; se anula con
  `prefers-reduced-motion`.
- Referencias de inspiración: libros de cocina de corte editorial (maquetación a dos
  columnas, fotografía y serifas), tarjetas de receta de mediados de siglo XX y
  rotulación de mercados. La paleta parte del papel, el barro cocido, el azafrán y la
  oliva. No se usaron plantillas, temas ni kits de interfaz.

## Cómo consumir los tokens

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

## Verificación

- Contrastes calculados con la fórmula WCAG 2.1; todos los pares de texto superan
  **AA (≥ 4.5:1)**.
- Sin fuentes, iconos, plantillas ni kits externos.
- Sin colores literales fuera de `css/tokens.css`.
