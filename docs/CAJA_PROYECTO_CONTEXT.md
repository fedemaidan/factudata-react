# Contexto: cajaProyecto.js

Documento de contexto para la página de Caja de Proyecto. Incluye estructura de UI, endpoints, persistencia y flujo de edición.

---

## 1. Estructura de la UI

### Layout general
- **DashboardLayout** con título dinámico (nombre del proyecto o "Proyecto - Código: X" si hay filtro por código)
- **Container** `maxWidth="xl"` con **Stack** principal

### Bloques principales (orden visual)

1. **Fila superior: Cajas virtuales + Botones**
   - **Cajas virtuales**: Botones por cada caja (ej. "Caja en Pesos", "Caja en Dólares", "Gastos en USD Blue")
   - Cada caja muestra nombre, equivalencia (opcional) y total calculado
   - En desktop: botones horizontales con menú (⋯) para editar/eliminar caja
   - En mobile: toggle "Mostrar/Ocultar cajas" + cards colapsables
   - **Botones**: Ordenar columnas | Columnas | Acciones (menú)

2. **Filtros**
   - **FilterBarCajaProyecto**: fechas, categorías, proveedores, moneda, tipo, monto, etc.
   - En desktop: barra expandible
   - En mobile: Drawer desde abajo

3. **Totales filtrados**
   - **TotalesFiltrados**: Neto, Ingreso, Egreso por moneda (ARS/USD)
   - Opcional: Totales USD blue
   - Chips de filtros activos (clickeables para abrir filtros)

4. **Tabla de movimientos**
   - Scroll horizontal sincronizado (barra superior "fantasma" + tabla)
   - Flechas ChevronLeft/ChevronRight para scroll por pasos
   - **TableHead**: Checkbox + columnas dinámicas (según `columnasFiltradas`)
   - **TableBody**: Filas agrupadas por prorrateo o individuales
   - Columnas configurables: código, fechas, tipo, total, categoría, proveedor, obra, cliente, observación, usuario, tc, usd, mep, estado, etc.
   - Columna **acciones** siempre al final (sticky right): Ver imagen | Editar | Eliminar
   - Paginación (TablePagination) al pie

5. **Modales / Drawers**
   - **Popover Columnas**: checkboxes para mostrar/ocultar columnas, modo compacto, presets (Finanzas, Operativo, Auditoría)
   - **OrdenarColumnasDialog**: drag-and-drop para reordenar columnas
   - **Dialog Crear/Editar caja**: nombre, moneda, tipo, medio de pago, equivalencia
   - **Dialog Confirmar eliminación** de movimiento
   - **Dialog Imagen**: preview de adjunto (imagen o PDF)
   - **Drawer Detalle**: panel lateral con datos del movimiento seleccionado
   - **Menu Acciones** (desktop): Registrar movimiento, Transferencia interna, Compra/Venta moneda, Recalcular sheets, Filtros, Agregar caja, Actualizar saldos, Recalcular equivalencias, Exportar CSV
   - **Menu Acciones móvil** (por fila): Ver adjunto, Editar, Eliminar
   - **BulkEditDialog**: edición masiva de movimientos seleccionados
   - **TransferenciaInternaDialog**, **IntercambioMonedaDialog**

6. **Mobile**
   - Cards en lugar de tabla
   - FAB flotante para menú Acciones
   - Drawer para filtros

---

## 2. Endpoints y persistencia

### Lectura de movimientos (Firestore)
- **Servicio**: `ticketService.getMovimientosForProyecto(proyectoId, moneda)`
- **Fuente**: Firestore, colección `movimientos`
- **Query**: `where('proyecto_id', '==', proyectoId)`, `where('moneda', '==', moneda)`, `orderBy('fecha_factura', 'desc')`
- **Uso**: Carga inicial en `fetchMovimientosData` y en `handleRefresh`

### API REST (movimientosService, baseURL desde config.apiUrl)

| Acción | Método | Endpoint | Uso |
|--------|--------|----------|-----|
| Obtener movimiento | GET | `movimiento/:id` | movementForm (edición) |
| Crear movimiento | POST | `movimiento/` | movementForm (alta) |
| Actualizar movimiento | PUT | `movimiento/:id` | movementForm (guardar), BulkEdit |
| Eliminar movimiento | DELETE | `movimiento/:id` | cajaProyecto (eliminar) |
| Edición masiva | PUT | `movimientos/bulk-update` | BulkEditDialog |
| Recalcular equivalencias | POST | `proyecto/:id/recalcular-equivalencias` | Menú Acciones |
| Crear prorrateo | POST | `movimiento/prorrateo` | movementForm |
| Obtener por prorrateo | GET | `movimientos/prorrateo/:grupoId` | movementForm |
| Transferencia interna | POST | `transferencia-interna/` | TransferenciaInternaDialog |
| Intercambio moneda | POST | `intercambio-monedas/comprar-dolares` / `vender-dolares` | IntercambioMonedaDialog |

### Preferencias de UI (proyecto)
- **Servicio**: `updateProyecto(proyectoId, { ui_prefs: { columnas: { compact, visible, orden } } })`
- **Persistencia**: Backend (proyecto en Firestore o API)
- **Contenido**: columnas visibles, modo compacto, orden de columnas

### Empresa (cajas virtuales)
- **Servicio**: `updateEmpresaDetails(empresaId, { cajas_virtuales: [...] })`
- **Persistencia**: Backend

### Enriquecimiento de datos
- **profileService**: `getProfileById` / `getProfileByUserId` para completar `nombre_user` en movimientos con `id_user`

---

## 3. Flujo de edición de un movimiento

### Desde cajaProyecto
1. Usuario hace clic en **Editar** (ícono lápiz) en la columna acciones de una fila.
2. `goToEdit(mov)` ejecuta:
   ```js
   router.push({
     pathname: '/movementForm',
     query: {
       movimientoId: mov.id,
       lastPageName: proyecto?.nombre,
       proyectoId: proyecto?.id,
       proyectoName: proyecto?.nombre,
       lastPageUrl: router.asPath,
     },
   });
   ```
3. Navegación a `/movementForm` con query params.

### En movementForm.js (página de edición)
- **Modo**: `isEditMode = Boolean(movimientoId)`
- **Carga inicial**: `movimientosService.getMovimientoById(movimientoId)` vía API GET `movimiento/:id`
- **Formulario**: Formik + `MovementFields` (campos: fecha, tipo, total, categoría, proveedor, obra, cliente, observación, medio de pago, estado, factura cliente, tags, etc.)
- **Tabs**: Datos principales, Materiales, Prorrateo, etc.
- **Guardar**: `movimientosService.updateMovimiento(movimientoId, payload)` vía API PUT `movimiento/:id`
- **Payload**: merge de `movimiento` actual con valores del form
- **Retorno**: Usuario vuelve manualmente (breadcrumb o lastPageUrl) a cajaProyecto

### UI del formulario de edición
- Layout con **DashboardLayout**
- Breadcrumbs: Inicio > Proyecto > Editar (código)
- **MovementFields**: Grid con TextField, Select, DatePicker, etc.
- Sección de imagen: preview, reemplazar, extraer datos (OCR)
- Sección de prorrateo si aplica
- Sección de materiales (movimientos de materiales)
- Botón "Guardar" que llama a `savePayload`
- Snackbar para éxito/error

---

## 4. Resumen de flujos de datos

```
LECTURA:
  Firestore (movimientos) 
    → ticketService.getMovimientosForProyecto 
    → setMovimientos / setMovimientosUSD
    → useMovimientosFilters → movimientosFiltrados
    → Tabla / Cards

ESCRITURA (movimientos):
  movementForm / BulkEdit / cajaProyecto
    → movimientosService (API REST)
    → Backend (persiste en Firestore u otra DB)

PREFERENCIAS:
  updateProyecto (ui_prefs.columnas)
    → Backend
```

---

## 5. Componentes relacionados

- `FilterBarCajaProyecto`: filtros
- `CajaTablaCell`: celda de tabla por tipo de columna
- `cajaColumnasConfig`: configuración de columnas, orden, labels
- `OrdenarColumnasDialog`: modal ordenar columnas
- `BulkEditDialog`: edición masiva
- `TransferenciaInternaDialog`, `IntercambioMonedaDialog`
- `MovementFields`, `MovementForm` (página `/movementForm`)
