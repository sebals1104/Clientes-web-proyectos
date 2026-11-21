# Sistema de Control de Mantenimiento de Vehículos

Aplicación web (SPA) para controlar el mantenimiento, las reparaciones y los gastos
de uno o varios vehículos: gestionar vehículos, registrar servicios (mantenimientos
y reparaciones), registrar repuestos y asociarlos a los servicios, registrar cargas
de combustible y visualizar costos y rendimiento en un resumen con gráficos.

- **Persistencia:** IndexedDB (entidades) + LocalStorage (solo preferencias).
- **Tecnología:** JavaScript vanilla, sin frameworks ni Web Components. Solo Chart.js
  (local y versionado) para los gráficos.
- **Arquitectura:** SPA con pseudocomponentes (clases) y enrutado por hash.
- **PWA:** plus opcional.

> Documento de requisitos: `REQ-2026C-VEH-01` v1.3 (Ing. Victor Kneider).

## Estado

Andamiaje inicial. El trabajo está organizado en **issues** del repositorio
(`#46` a `#73`), con etiqueta `proyecto-3`, repartidos equitativamente entre
Sebastián Alsleben y Andrés Acure.

## Estructura prevista

```
proyecto3/
  index.html
  css/
    tokens.css          # identidad visual + tema claro/oscuro
    styles.css
  js/
    data/               # capa de datos (IndexedDB, LocalStorage, respaldo)
      db.js             # núcleo: apertura, stores, índices, transacciones
      vehicles.js services.js parts.js fuelLogs.js
      prefs.js backup.js catalog.js
    domain/             # reglas y cálculos de negocio
      money.js odometer.js fuelEfficiency.js totals.js
    core/               # infraestructura de la SPA
      Router.js dom.js
    components/         # componentes reutilizables
      Modal.js ConfirmDialog.js Toast.js
      LoadingState.js EmptyState.js ErrorState.js
      VehicleCard.js FilterBar.js ChartCard.js
    views/              # una clase por vista
      VistaDashboard.js VistaVehicles.js VistaVehicleDetail.js
      VistaServices.js VistaServiceForm.js VistaServiceDetail.js
      VistaParts.js VistaPartForm.js VistaPartDetail.js
      VistaFuel.js VistaHistory.js VistaSettings.js
    app.js              # arranque, router y barra de navegación
  assets/
    vehicles/           # imágenes por tipo de vehículo
    icons/
  vendor/
    chart.umd.js        # Chart.js versionado
  docs/screenshots/
  manifest.webmanifest  # plus PWA
  sw.js                 # plus PWA
```

## Modelo de datos (IndexedDB)

| Store | Clave | Índices sugeridos |
|-------|-------|-------------------|
| `vehicles` | `id` | `alias`, `type`, `fuelType`, `active` |
| `services` | `id` | `vehicleId`, `date`, `type`, `category`, `status`, `partIds` (multiEntry) |
| `parts`    | `id` | `vehicleId`, `date`, `category` |
| `fuelLogs` | `id` | `vehicleId`, `date`, `fullTank` |

IDs `autoIncrement: true`; campos en inglés `camelCase`; `createdAt`/`updatedAt` en
ISO 8601. Interfaz en español.

## Reglas transversales (resumen)

- **Dinero:** 2 decimales, ≥ 0, redondeo al final; el repuesto aporta su `totalCost`.
- **Odómetro:** entero ≥ 0 en km, monotónico por vehículo; se recalcula al editar/eliminar.
- **Fechas:** ISO 8601, filtros inclusivos, sin fechas futuras (salvo servicio pendiente).
- **Totales:** solo servicios `completed` y sus repuestos suman; pendientes se etiquetan.
- **Borrado:** confirmación con impacto; vehículo borra en cascada en una transacción.
- **Seguridad:** todo texto del usuario se escapa; sin `eval`/`new Function`/`document.write`.
```
