# Módulo de Materiales — Plan de Implementación

> **Fecha**: 10/03/2026  
> **Basado en**: STOCK_V2_DOCUMENTO_TECNICO.md v4 y STOCK_V2_DOCUMENTO_FUNCIONAL.md v4  
> **Estado**: Para revisión del equipo  
> **Estimación total**: 6-8 semanas

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Estado actual del codebase](#2-estado-actual-del-codebase)
3. [Fase 0 — Puente Caja → Stock/Acopio + Deprecación V1](#3-fase-0--puente-caja--stockacopio--deprecación-v1)
4. [Fase 1 — Vista unificada por obra](#4-fase-1--vista-unificada-por-obra)
5. [Fase 2 — Hook post-desacopio](#5-fase-2--hook-post-desacopio)
6. [Fase 3 — Solicitud con destino flexible](#6-fase-3--solicitud-con-destino-flexible)
7. [Fase T — Configuración por empresa + Validación](#7-fase-t--configuración-por-empresa--validación)
8. [Fase 4 — Integración WhatsApp](#8-fase-4--integración-whatsapp)
9. [Criterios de aceptación globales](#9-criterios-de-aceptación-globales)
10. [Riesgos por fase](#10-riesgos-por-fase)

---

## 1. Resumen ejecutivo

### ¿Qué hay que hacer?

Conectar Stock V2, Acopio y Caja en un flujo unificado, y eliminar el sistema legacy V1 que genera confusión.

### ¿Qué ya existe y funciona?

El core de Stock V2 está completo: modelos Mongoose (`material`, `movimientomaterial`, `solicitud`), repos, services, controllers, rutas API, extracción IA de facturas/remitos, conciliación de materiales, y frontend completo (páginas + componentes).

### ¿Qué falta?

| Fase | Descripción | Estimación |
|---|---|---|
| **Fase 0** | Puente Caja → Stock/Acopio + Deprecación V1 | 1-2 semanas |
| **Fase 1** | Vista unificada de materiales por obra | 1 semana |
| **Fase 2** | Hook post-desacopio (Acopio → Stock) | 1 semana |
| **Fase 3** | Solicitud con destino flexible por línea | 1-2 semanas |
| **Fase T** | Configuración por empresa + Validación (transversal) | 1 semana |
| **Fase 4** | Integración WhatsApp | 1 semana |

### Orden y dependencias

```
Fase 0 (Caja→Stock + Deprecar V1)
  │
  ├──→ Fase 1 (Vista obra) ──→ Fase 2 (Hook desacopio)
  │                                      │
  └──────────────────────────────────────→ Fase 3 (Destino flexible)
                                                    │
  Fase T (Config + Validación) ── transversal ──────┤
                                                    │
                                                    └──→ Fase 4 (WhatsApp)
```

> **Fase T** es transversal: se puede implementar en cualquier momento después de Fase 0. Impacta cómo se muestran las opciones en todas las demás fases.

---

## 2. Estado actual del codebase

### Archivos clave existentes (Stock V2)

**Backend** (`backend/src/`):

| Capa | Archivo | Descripción |
|---|---|---|
| Modelo | `models/movimientoMaterial.js` | Schema Mongoose: `movimientomaterial`. Campos: empresa_id, id_material, nombre_item, nombre_material, cantidad, tipo, subtipo, estado, solicitud_id, proyecto_id/nombre |
| Modelo | `models/solicitud.js` | Schema Mongoose: `solicitud`. Campos: tipo, subtipo, empresa_id, estado, proveedor, proyecto_id/nombre, documentos |
| Modelo | `models/material.js` | Schema Mongoose: `material`. Campos: nombre, SKU, alias[], categoria, precio_unitario, fecha_precio |
| Repo | `repositories/stock/materialesRepository.js` | CRUD + búsqueda por texto/alias |
| Repo | `repositories/stock/movimientoMaterialesRepository.js` | CRUD MM V2 (MongoDB) |
| Repo | `repositories/stock/solicitudRepository.js` | CRUD solicitudes |
| Service | `services/stock/solicitudService.js` | create, list, get, update, delete + lógica de negocio |
| Service | `services/stock/movimientoMaterialesService.js` | CRUD + entregas parciales + estados |
| Service | `services/stock/materialesService.js` | CRUD + validación alias únicos |
| Service | `services/stock/stockService.js` | getStock, getStockPorProyecto, formatearStockParaWhatsApp |
| Controller | `controllers/stock/solicitudController.js` | 536 líneas. CRUD + extractFromFactura (async/polling) + conciliarMateriales ingreso/egreso |
| Controller | `controllers/stock/movimientoMaterialesController.js` | CRUD movimientos V2 |
| Controller | `controllers/stock/materialesController.js` | CRUD materiales + stock calculado/valorizado |
| Routes | `routes/solicitudMovimientoMaterialesRoutes.js` | `/extraer-factura`, `/extraer-remito`, `/conciliar-materiales`, etc. |
| Routes | `routes/movimientoMaterialesRoutes.js` | CRUD movimientos V2 |
| Routes | `routes/materialesRoutes.js` | CRUD materiales |
| IA | `flows/stockFlows/utilsIngresarMateriales.js` | extractMaterialesFromFactura (GPT O3) + conciliarConCatalogo |
| IA | `flows/stockFlows/utilsRetirarMateriales.js` | extractMaterialesFromRemito + conciliarEgreso |

**Frontend** (`app-web/src/`):

| Archivo | Descripción |
|---|---|
| `pages/stockMovimientos.js` | Lista movimientos Stock V2 (638 líneas) |
| `pages/stockSolicitudes.js` | Lista solicitudes Stock V2 (976 líneas) |
| `pages/stockMateriales.js` | CRUD materiales Stock V2 |
| `components/stock/IngresoDesdeFactura.js` | Componente ingreso desde factura con IA |
| `components/stock/EgresoDesdeRemito.js` | Componente egreso desde remito con IA |
| `components/stock/solicitudes/SolicitudFormDialog.js` | Form de solicitud |
| `components/stock/solicitudes/ConfirmarIngresoDialog.js` | Confirmar ingreso |
| `components/stock/solicitudes/EntregaParcialDialog.js` | Entrega parcial |
| `components/stock/solicitudes/AjusteStockDialog.js` | Ajuste de stock |

### Archivos clave existentes (Legacy V1 + Acopio)

| Archivo | Descripción | Acción requerida |
|---|---|---|
| `app-web/src/pages/movementForm.js` | 1576 líneas. Contiene `reconcileMmFromMateriales()` (~L589) que escribe MM en Firestore | **Modificar**: reemplazar sección MM por nuevo componente |
| `app-web/src/pages/movimientosMateriales.js` | Página legacy MM Firestore | **Eliminar o redirigir** |
| `backend/src/repositories/MovimientoMaterialRepository.js` | Repo legacy Firestore | **Deprecar** |
| `backend/src/routes/movimientoMaterialRoutes.js` | Rutas legacy Firestore (montado en `/api/movimientos-materiales`) | **Deprecar** |
| `backend/src/services/acopio/AcopioService.js` | 1600 líneas. 100% Firestore | **Modificar**: agregar hook en Fase 2 |
| `backend/src/routes/acopioRoutes.js` | 1360 líneas. Rutas de acopio | **Modificar**: agregar endpoint destino |
| `app-web/src/pages/movimientosAcopio.js` | 1385 líneas. UI desacopio | **Modificar**: agregar selector destino |

### Montaje de rutas en `app.api.js`

```
/api/acopio                → acopioRoutes (Firestore)
/api/movimientos-materiales → movimientoMaterialRoutes (Firestore legacy) ← A DEPRECAR
/api/materiales            → materialesRoutes (MongoDB V2)
/api/inventario            → inventarioRoutes (MongoDB)
/api/movimiento-material   → movimientoMaterialesRoutes (MongoDB V2)
/api/solicitud-material    → solicitudMovimientoMaterialesRoutes (MongoDB V2)
```

---

## 3. Fase 0 — Puente Caja → Stock/Acopio + Deprecación V1

> **Estimación**: 1-2 semanas  
> **Impacto**: Alto — resuelve "cargo factura y no pasa nada"  
> **Riesgo**: Medio — toca `movementForm.js` que es un archivo crítico

### Contexto

Cuando un usuario confirma una factura de compra en `movementForm.js`, el array `formik.values.materiales[]` contiene los materiales extraídos por IA. Hoy, `reconcileMmFromMateriales()` (~L589) los escribe en Firestore (V1) donde nadie los consume. Hay que reemplazar eso por acciones reales.

---

### Tarea 0.1 — Auditoría de datos legacy V1

**Objetivo**: Determinar si hay datos activos en V1 que requieran migración.

**Acciones**:
1. Escribir script que cuente documentos en `movimientos_materiales` (subcollection Firestore) por empresa
2. Contar `AsignacionMaterial` (MongoDB) que referencien `movimiento_material_id` de V1
3. Documentar hallazgos en un issue/nota

**Criterio de aceptación**: Sabemos exactamente cuántas empresas/documentos usan V1 activamente y si hay asignaciones que migrar.

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/scripts/auditoria-stock-v1.js` | **Crear** — script de auditoría |

---

### Tarea 0.2 — Agregar campos de referencia cruzada a modelos

**Objetivo**: Permitir vincular solicitudes/acopios con movimientos de caja.

**Campos a agregar**:

En `backend/src/models/solicitud.js`:
```javascript
origen_movimiento_caja_id: { type: String, default: null }  // ID del movimiento de caja que originó esta solicitud
```

En `backend/src/models/movimientoMaterial.js`:
```javascript
origen_movimiento_caja_id: { type: String, default: null }  // trazabilidad hacia caja
```

**Criterio de aceptación**: Los modelos aceptan el nuevo campo, los endpoints existentes siguen funcionando (el campo es opcional con default null).

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/models/solicitud.js` | **Modificar** — agregar campo |
| `backend/src/models/movimientoMaterial.js` | **Modificar** — agregar campo |

---

### Tarea 0.3 — Endpoint: crear solicitud Stock V2 desde caja

**Objetivo**: Un endpoint que reciba materiales de una factura de caja y cree una solicitud de ingreso en Stock V2.

**Endpoint**: `POST /api/solicitud-material/from-caja`

**Payload**:
```json
{
  "empresa_id": "xxx",
  "movimiento_caja_id": "yyy",
  "proyecto_id": "zzz",           // null si va a depósito o pendiente
  "proyecto_nombre": "Obra X",    // null si va a depósito o pendiente
  "subtipo": "COMPRA",            // o "PENDIENTE_ASIGNAR"
  "proveedor": { "nombre": "Ferretería Norte" },
  "materiales": [
    { "nombre": "Caño 20x20", "cantidad": 10, "precio_unitario": 15000 }
  ]
}
```

**Lógica** (reutilizar lo que ya existe):
1. Conciliar materiales con catálogo → reutilizar `conciliarConCatalogo()` de `utilsIngresarMateriales.js`
2. Crear `Material` si no existe → reutilizar `materialesService.create()`
3. Crear `Solicitud` tipo=INGRESO, subtipo=COMPRA (o PENDIENTE_ASIGNAR), estado=ENTREGADO (o PENDIENTE_CONFIRMACION si `validacion_movimientos`), `origen_movimiento_caja_id`
4. Crear N `MovimientoMaterial` (uno por material, cantidad positiva)
5. Retornar `{ solicitud_id, materiales_creados, materiales_conciliados }`

> Si `subtipo = PENDIENTE_ASIGNAR`: solicitud se crea sin `proyecto_id`. El material queda en depósito sin destino fijo. Después el usuario puede asignar a obra o descartar.

**Criterio de aceptación**: 
- Crear solicitud desde caja con materiales → solicitud + movimientos existen en MongoDB
- Materiales se concilian con catálogo existente (match por nombre/alias)
- Materiales nuevos se crean en catálogo
- Campo `origen_movimiento_caja_id` queda seteado
- Con subtipo PENDIENTE_ASIGNAR: solicitud sin proyecto, estado correcto

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/controllers/stock/solicitudController.js` | **Modificar** — agregar handler `createFromCaja` |
| `backend/src/services/stock/solicitudService.js` | **Modificar** — agregar `createFromCaja()` con lógica de conciliación |
| `backend/src/routes/solicitudMovimientoMaterialesRoutes.js` | **Modificar** — agregar ruta POST `/from-caja` |

---

### Tarea 0.4 — Endpoint: crear acopio desde caja

**Objetivo**: Un endpoint que reciba materiales de una factura de caja y cree un acopio + compra en Firestore.

**Endpoint**: `POST /api/acopio/from-caja`

**Payload**:
```json
{
  "empresa_id": "xxx",
  "movimiento_caja_id": "yyy",
  "proveedor": { "id": "...", "nombre": "Cerámicos Norte", "cuit": "..." },
  "proyecto_id": "zzz",
  "materiales": [
    { "codigo": "LAD001", "descripcion": "Ladrillo hueco 12x18", "cantidad": 1096, "precio_unitario": 8500 }
  ]
}
```

**Lógica**:
1. Crear acopio en Firestore con datos del proveedor → reutilizar `AcopioService.createAcopio()`
2. Crear compra con movimientos_materiales tipo `acopio` → reutilizar lógica existente en `AcopioService`
3. Calcular `valor_acopio`
4. Retornar `{ acopio_id, compra_id }`

**Criterio de aceptación**:
- Crear acopio desde caja → acopio + compra existen en Firestore
- Los valores se calculan correctamente
- Se puede ver el acopio en la UI existente de acopios

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/routes/acopioRoutes.js` | **Modificar** — agregar ruta POST `/from-caja` |
| `backend/src/services/acopio/AcopioService.js` | **Modificar** — agregar método `createFromCaja()` (wrapper del create existente) |

---

### Tarea 0.5 — Componente frontend: MaterialesFacturaActions

**Objetivo**: Componente que muestra las 5 opciones de destino para materiales extraídos de una factura.

**Opciones**:
- 🏭 Enviar a depósito → llama POST `/api/solicitud-material/from-caja` sin proyecto
- 🏗️ Enviar a obra → llama POST `/api/solicitud-material/from-caja` con proyecto (selector de proyectos)
- 📦 Crear acopio → llama POST `/api/acopio/from-caja` (selector de proveedor) — **solo si `acopio_habilitado`**
- ⏳ Pendiente de asignar → llama POST `/api/solicitud-material/from-caja` sin proyecto, subtipo=PENDIENTE_ASIGNAR
- 🔀 Distribuir → modal donde por cada línea se elige destino — **solo si `distribucion_por_linea`**
- ❌ No hacer nada → cierra el bloque

> Las opciones visibles dependen de la configuración de la empresa (Fase T). Sin config, se muestran: depósito, obra, pendiente, no hacer nada.

**Props**:
```javascript
<MaterialesFacturaActions
  materiales={formik.values.materiales}   // array de materiales extraídos
  empresaId={empresaId}
  movimientoCajaId={movimientoId}         // ID del movimiento de caja
  proveedor={formik.values.proveedor}     // proveedor de la factura
  solicitudStockId={movimiento.solicitud_stock_id}  // si ya se generó, no mostrar acciones
  acopioId={movimiento.acopio_id}                    // si ya se generó, no mostrar acciones
  onComplete={(result) => { /* actualizar movimiento con referencia */ }}
/>
```

**Estados del componente**:
1. **Sin referencia** → mostrar opciones (según config de la empresa)
2. **Con `solicitud_stock_id`** → mostrar link "📦 Ver solicitud de stock" + botón deshacer
3. **Con `acopio_id`** → mostrar link "📦 Ver acopio" + botón deshacer

**Criterio de aceptación**:
- Se ven las opciones según la config de la empresa (sin config: depósito, obra, pendiente, no hacer nada)
- "Enviar a depósito" crea solicitud + movimientos correctamente
- "Enviar a obra" muestra selector de proyecto y crea solicitud vinculada
- "Crear acopio" crea acopio en Firestore (solo si `acopio_habilitado`)
- "Pendiente de asignar" crea solicitud sin proyecto, subtipo PENDIENTE_ASIGNAR
- "Distribuir" permite elegir destino por línea y ejecuta las acciones correspondientes (solo si `distribucion_por_linea`)
- "No hacer nada" no genera nada
- Si ya se generó solicitud/acopio, muestra link en vez de acciones
- No se puede duplicar (botón deshabilitado durante request, referencia cruzada)

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/components/stock/MaterialesFacturaActions.js` | **Crear** — componente principal |
| `app-web/src/components/stock/DistribuirMaterialesDialog.js` | **Crear** — modal de distribución por línea |

---

### Tarea 0.6 — Integrar componente en movementForm.js

**Objetivo**: Reemplazar la sección de `reconcileMmFromMateriales()` por el nuevo componente `MaterialesFacturaActions`.

**Cambios en `app-web/src/pages/movementForm.js`**:
1. Importar `MaterialesFacturaActions`
2. Eliminar la función `reconcileMmFromMateriales()` (~L589) y sus llamadas
3. Eliminar la función `reconcileMaterialesFromMm()` y sus llamadas
4. Donde antes se mostraba la tabla de MM legacy, renderizar `<MaterialesFacturaActions />`
5. Agregar campos `solicitud_stock_id` y `acopio_id` al formulario para persistir la referencia

**Criterio de aceptación**:
- Al guardar una factura con materiales, ya no se escriben MM en Firestore
- Se muestra el nuevo bloque de acciones en lugar de la tabla legacy
- El flujo de carga de factura sigue funcionando normalmente
- Si se recarga la página, el estado (solicitud ya creada o no) se mantiene

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/pages/movementForm.js` | **Modificar** — reemplazar sección MM legacy |

---

### Tarea 0.7 — Deprecar UI y escrituras de Stock V1

**Objetivo**: Eliminar la página legacy y los endpoints de escritura.

**Cambios**:

1. **Frontend**: Eliminar o redirigir `movimientosMateriales.js`
   - Opción A: Eliminar la página y quitar del menú de navegación
   - Opción B: Redirigir a `stockMovimientos.js` con un banner "Esta sección se movió"

2. **Backend**: Marcar como deprecated las rutas de escritura de V1 en `movimientoMaterialRoutes.js`
   - POST/PUT/DELETE → devolver 410 Gone con mensaje "Use /api/solicitud-material"
   - GET → mantener temporalmente (lectura de históricos)

3. **Backend**: Eliminar `syncMovimientosMaterialesService.js` si existe, o la lógica de sync en el service que corresponda

**Criterio de aceptación**:
- La página legacy ya no es accesible (o redirige)
- No se pueden crear/editar MM en Firestore desde la API
- Los datos históricos en Firestore siguen intactos (no se borran)
- No hay errores en consola ni llamadas huérfanas al endpoint viejo

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/pages/movimientosMateriales.js` | **Eliminar o redirigir** |
| Menú/navegación del frontend | **Modificar** — quitar link a MM legacy |
| `backend/src/routes/movimientoMaterialRoutes.js` | **Modificar** — deprecar escrituras |

---

### Tarea 0.8 — Tests Fase 0

**Tests backend** (Jest):
- `createFromCaja` con materiales nuevos → crea Material + Solicitud + MovimientoMaterial
- `createFromCaja` con materiales existentes → concilia con catálogo, no duplica
- `createFromCaja` con proyecto → movimientos vinculados a proyecto
- `createFromCaja` con subtipo PENDIENTE_ASIGNAR → solicitud sin proyecto
- `createFromCaja` con `validacion_movimientos = true` → estado PENDIENTE_CONFIRMACION
- Doble llamada con mismo `movimiento_caja_id` → error o idempotente
- Endpoint deprecated devuelve 410

**Tests frontend** (si hay infraestructura de testing):
- `MaterialesFacturaActions` renderiza opciones según config de empresa
- Sin config → muestra depósito, obra, pendiente, no hacer nada (4 opciones)
- Con `acopio_habilitado` → muestra también acopio (5 opciones)
- Con `distribucion_por_linea` → muestra también distribuir (6 opciones)
- Click "Enviar a depósito" → llama endpoint correcto
- Click "Pendiente de asignar" → llama endpoint con subtipo PENDIENTE_ASIGNAR
- Con `solicitud_stock_id` → muestra link, no acciones

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/test/stock/solicitudFromCaja.test.js` | **Crear** |
| `backend/test/stock/acopioFromCaja.test.js` | **Crear** |

---

## 4. Fase 1 — Vista unificada por obra

> **Estimación**: 1 semana  
> **Impacto**: Alto — "cuánto gasté en materiales por obra"  
> **Riesgo**: Bajo — solo lectura, no modifica datos  
> **Depende de**: Fase 0 (para que haya datos reales que mostrar)

---

### Tarea 1.1 — Service: vistaObraService.js

**Objetivo**: Servicio que agrega movimientos de Stock V2 (MongoDB) + movimientos de Acopio (Firestore) para un proyecto.

**Lógica**:
```
1. MongoDB: MovimientoMaterial.find({ proyecto_id, empresa_id })
   → populate id_material para precio_unitario
   
2. MongoDB: buscar TRANSFERENCIAS tipo reserva para el proyecto
   → material sigue en depósito pero está "reservado" para esta obra
   → marcar origen: "reserva_deposito"
   
3. Firestore: buscar acopios donde proyecto_id = proyectoId
   → para cada acopio, traer remitos > movimientos_materiales (tipo desacopio)
   → intentar match con catálogo Stock V2 por nombre/alias
   
4. Normalizar en formato común:
   { material_id, nombre, cantidad, origen, precio_unitario_actual, subtotal, estado }
   
5. Agregar totales:
   { items, total_valorizado, items_sin_precio, cantidad_pendiente_total }
```

**Criterio de aceptación**:
- Devuelve movimientos de Stock V2 normalizados
- Devuelve materiales reservados (transferencia) con indicador "en depósito, reservado para esta obra"
- Devuelve movimientos de Acopio (desacopios) normalizados
- Materiales de acopio que matchean con catálogo usan precio de Material (MongoDB)
- Materiales de acopio sin match usan precio del acopio como fallback y se marcan
- Si `validacion_movimientos`: materiales en PENDIENTE_CONFIRMACION se muestran con indicador
- Totales calculados correctamente

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/services/stock/vistaObraService.js` | **Crear** |

---

### Tarea 1.2 — Controller + Route: vista obra

**Endpoint**: `GET /api/materiales/vista-obra/:proyectoId?empresa_id=xxx`

**Response**:
```json
{
  "items": [
    {
      "material_id": "...",
      "nombre": "Caño 20x20",
      "cantidad": 10,
      "origen": "stock_v2",
      "origen_detalle": "Solicitud #123",
      "precio_unitario_actual": 15000,
      "subtotal": 150000,
      "precio_source": "catalogo",
      "estado": "ENTREGADO"
    },
    {
      "material_id": null,
      "nombre": "Ladrillo hueco 12x18",
      "cantidad": 300,
      "origen": "acopio",
      "origen_detalle": "Acopio Cerámicos Norte",
      "precio_unitario_actual": 8500,
      "subtotal": 2550000,
      "precio_source": "acopio_fallback",
      "estado": "ENTREGADO"
    }
  ],
  "total_valorizado": 2700000,
  "items_sin_precio": 0,
  "cantidad_pendiente_total": 796
}
```

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/controllers/stock/vistaObraController.js` | **Crear** |
| `backend/src/routes/vistaObraRoutes.js` | **Crear** |
| `backend/app.api.js` | **Modificar** — registrar ruta `/api/materiales/vista-obra` |

---

### Tarea 1.3 — Página frontend: vista materiales por obra

**Objetivo**: Nueva sección (puede ser una tab dentro de la ficha de proyecto, o una página standalone accesible desde el proyecto).

**Componentes de la vista**:
- Tabla con columnas: Material, Cantidad, Origen, Precio actual, Subtotal
- Indicadores: Total valorizado, items sin precio (⚠️), pendientes de entrega (⏳)
- Filtros: por origen (stock/acopio/todos), por estado
- Acción: link a la solicitud o acopio de origen

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/pages/stockVistaObra.js` (o como sección dentro de proyecto) | **Crear** |
| `app-web/src/services/vistaObraService.js` | **Crear** — client API |
| Navegación/menú | **Modificar** — agregar acceso |

---

### Tarea 1.4 — Tests Fase 1

**Tests backend**:
- Vista obra con solo movimientos Stock V2 → totales correctos
- Vista obra con solo desacopios → matchea con catálogo, totales correctos
- Vista obra mixta → todo combinado
- Material sin precio → aparece en `items_sin_precio`
- Proyecto sin movimientos → respuesta vacía, totales en 0

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/test/stock/vistaObra.test.js` | **Crear** |

---

## 5. Fase 2 — Hook post-desacopio (Acopio → Stock)

> **Estimación**: 1 semana  
> **Impacto**: Alto — resuelve el dolor de Carranza  
> **Riesgo**: Medio — modifica el flujo de desacopio existente  
> **Depende de**: Fase 1 (para que el resultado sea visible en vista obra)

---

### Tarea 2.1 — Service: desacopioHookService.js

**Objetivo**: Después de confirmar un remito de desacopio, generar movimientos en Stock V2.

**Lógica**:
```
Input: { acopio_id, remito_id, empresa_id, materiales[], destino, proyecto_id? }

1. Conciliar materiales de acopio con catálogo Stock V2:
   a. Match exacto por nombre
   b. Match por alias
   c. Match fuzzy (Levenshtein)
   d. Si no hay match → crear Material nuevo
   
2. Crear Solicitud:
   tipo = INGRESO
   subtipo = DESACOPIO
   estado = ENTREGADO
   origen_acopio_id = acopio_id
   proyecto_id = proyecto_id (si destino = obra)

3. Crear MovimientoMaterial por cada material:
   cantidad positiva
   origen_acopio_id = acopio_id
   origen_remito_id = remito_id
   proyecto_id = proyecto_id (si destino = obra)
```

**Criterio de aceptación**:
- Desacopio genera movimientos en Stock V2 automáticamente
- Materiales se concilian con catálogo (reutilizando lógica existente de `conciliarConCatalogo`)
- Si destino = obra → movimientos aparecen en vista de obra (Fase 1)
- Si destino = depósito → movimientos aparecen en stock general
- Subtipo DESACOPIO claramente identificado

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/services/acopio/desacopioHookService.js` | **Crear** |

---

### Tarea 2.2 — Integrar hook en flujo de desacopio

**Objetivo**: Después de que `AcopioService` crea un remito de desacopio, invocar el hook.

**Cambios**:
- En `AcopioService.js`, después de crear remito de desacopio exitosamente, llamar a `desacopioHookService.execute()`
- Pasar datos del remito + materiales + destino elegido por el usuario

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/services/acopio/AcopioService.js` | **Modificar** — invocar hook post-desacopio |
| `backend/src/routes/acopioRoutes.js` | **Modificar** — recibir parámetros de destino en endpoint de remito |

---

### Tarea 2.3 — UI: selector de destino al confirmar remito

**Objetivo**: En `movimientosAcopio.js`, cuando el usuario confirma un desacopio, mostrar selector de destino.

**UI**:
```
¿A dónde van estos materiales?
  ○ 🏗️ A obra (selector de proyecto)
  ○ 🏭 A depósito
  ○ 🔀 Distribuir por línea
```

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/pages/movimientosAcopio.js` | **Modificar** — agregar selector de destino en flujo de desacopio |
| `app-web/src/components/acopio/DestinoDesacopioDialog.js` | **Crear** — dialog de selección de destino |

---

### Tarea 2.4 — Agregar campos de origen acopio a modelos

**Campos a agregar en `movimientoMaterial.js`**:
```javascript
origen_acopio_id: { type: String, default: null },
origen_remito_id: { type: String, default: null }
```

**Campos a agregar en `solicitud.js`**:
```javascript
origen_acopio_id: { type: String, default: null }
```

**Nota**: si Tarea 0.2 ya se implementó, solo falta agregar los campos de acopio.

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/models/movimientoMaterial.js` | **Modificar** — agregar campos origen_acopio |
| `backend/src/models/solicitud.js` | **Modificar** — agregar campo origen_acopio_id |

---

### Tarea 2.5 — Tests Fase 2

**Tests**:
- Desacopio con destino obra → Solicitud + MovimientoMaterial con proyecto_id
- Desacopio con destino depósito → Solicitud + MovimientoMaterial sin proyecto_id
- Conciliación: material existente en catálogo → se reutiliza
- Conciliación: material nuevo → se crea en catálogo
- Hook falla → el desacopio en Firestore no se revierte (el hook es best-effort)

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/test/stock/desacopioHook.test.js` | **Crear** |

---

## 6. Fase 3 — Solicitud con destino flexible por línea

> **Estimación**: 1-2 semanas  
> **Impacto**: Medio — habilita distribución múltiple en una sola compra  
> **Riesgo**: Medio — modifica modelos y UI existentes  
> **Depende de**: Fases 0-2 (conceptos de destino ya probados)  
> **Nota**: La distribución por línea solo es visible si la empresa tiene `distribucion_por_linea = true` (Fase T). Sin ese flag, el destino se aplica a toda la solicitud completa.
>
> **Reserva (ya existe)**: Asignar material de depósito a una obra sin moverlo físicamente ya se resuelve con el tipo TRANSFERENCIA existente en Stock V2. No requiere desarrollo nuevo.

---

### Tarea 3.1 — Agregar campos de destino a MovimientoMaterial

**Campos nuevos en `movimientoMaterial.js`**:
```javascript
destino: {
  type: String,
  enum: ['deposito', 'obra', 'acopio', 'pendiente_asignar'],
  default: 'deposito'
},
destino_proyecto_id: { type: String, default: null },
destino_proyecto_nombre: { type: String, default: null },
destino_acopio_id: { type: String, default: null },
destino_acopio_codigo: { type: String, default: null }
```

**Criterio de aceptación**: Modelos aceptan nuevos campos, endpoints existentes siguen funcionando (campos opcionales con defaults).

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/models/movimientoMaterial.js` | **Modificar** |

---

### Tarea 3.2 — Lógica de distribución en solicitudService

**Cambios en `solicitudService.js`**:

Al crear una solicitud con movimientos, por cada movimiento:
- Si `destino = 'deposito'` → comportamiento actual, `proyecto_id = null`
- Si `destino = 'obra'` → `proyecto_id` del destino elegido
- Si `destino = 'acopio'` → crear acopio/compra en Firestore (invocando AcopioService) + dejar movimiento vinculado — **solo si `acopio_habilitado`**
- Si `destino = 'pendiente_asignar'` → sin `proyecto_id`, subtipo=PENDIENTE_ASIGNAR (se asigna o descarta después)

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/services/stock/solicitudService.js` | **Modificar** — lógica de distribución |
| `backend/src/controllers/stock/solicitudController.js` | **Modificar** — validación de destinos |

---

### Tarea 3.3 — UI: selector de destino por línea en solicitud

**Cambios en `stockSolicitudes.js` / `SolicitudFormDialog.js`**:

En el modal de crear solicitud, agregar por cada línea:
- Selector de destino: `Depósito` | `Obra (autocomplete)` | `Pendiente de asignar` | `Acopio (autocomplete)` (si `acopio_habilitado`)
- Si elige "Obra" → autocomplete de proyectos de la empresa
- Si elige "Acopio" → autocomplete de acopios existentes o crear nuevo
- Default: "Depósito" (comportamiento actual)

> **Nota**: Este selector solo aparece si `distribucion_por_linea = true`. Sin ese flag, se usa el destino único ya elegido en Fase 0.

**Criterio de aceptación**:
- Crear solicitud sin cambiar destino → funciona exactamente como hoy
- Crear solicitud con líneas mixtas (parte obra, parte depósito) → cada movimiento va a su destino
- Crear solicitud con línea a acopio → se crea compra en Firestore (solo si `acopio_habilitado`)
- Crear solicitud con línea a pendiente_asignar → solicitud sin proyecto, se puede asignar/descartar después

**Archivos**:
| Archivo | Acción |
|---|---|
| `app-web/src/pages/stockSolicitudes.js` | **Modificar** |
| `app-web/src/components/stock/solicitudes/SolicitudFormDialog.js` | **Modificar** |

---

### Tarea 3.4 — Tests Fase 3

**Tests**:
- Solicitud con todos a depósito → funciona como antes
- Solicitud con líneas a obra → proyecto_id correcto
- Solicitud con línea a acopio → acopio creado en Firestore (solo si `acopio_habilitado`)
- Solicitud con línea a pendiente_asignar → sin proyecto, subtipo PENDIENTE_ASIGNAR
- Solicitud mixta → cada movimiento tiene su destino
- Validación: destino=obra sin proyecto_id → error
- Validación: destino=acopio sin `acopio_habilitado` → error

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/test/stock/solicitudDestinoFlexible.test.js` | **Crear** |

---

## 7. Fase T — Configuración por empresa + Validación

> **Estado real (verificado 19/04/2026)**: Mayormente completo — 2 gaps pendientes  
> **Estimación original**: 1 semana  
> **Impacto**: Medio — permite adaptar stock a cada cliente  
> **Riesgo**: Bajo — son flags que condicionan UI y lógica, no cambian modelos core  
> **Transversal**: se puede implementar en cualquier momento después de Fase 0

### Estado por tarea

| Tarea | Estado | Notas |
|---|---|---|
| T.1 Modelo config | ✅ Completo | Campo en `EmpresaModel.js` + panel UI `StockConfigDetails.js` |
| T.2 Condicionar UI | ✅ Completo | `MaterialesFacturaActions.js` ya lee `acopio_habilitado` y `distribucion_por_linea` |
| T.3 PENDIENTE_CONFIRMACION | ✅ Completo | Enums, service, endpoint POST confirmar, UI en stockSolicitudes |
| T.4 Tests | ❌ Pendiente | Archivos de test no existen |
| Guard aplicado a rutas | ❌ Pendiente | `stockConfigGuard.js` existe pero no está importado en ninguna ruta |

> **Corrección al análisis previo**: `distribucion_por_linea` NO está deshabilitado en la UI. En
> `StockConfigDetails.js` todos los ejes del array `ejes[]` están activos (ninguno tiene `disabled: true`).
> El flag puede activarse y guardarse normalmente.

> **Nota sobre los flags implementados**: La implementación real expandió el schema original. Los flags activos hoy son 6:
> `acopio_habilitado`, `caja_a_stock`, `destino_desacopio`, `distribucion_por_linea`, `validacion_movimientos`, `extraccion_automatica`.

---

### Tarea T.1 — Modelo de configuración de stock por empresa ✅ COMPLETO

**Objetivo**: Almacenar la configuración de stock de cada empresa.

~~Opción A: Agregar campo `stock_config` al modelo de empresa existente.~~  
~~Opción B: Colección separada `stockconfigs` con `empresa_id` único.~~

**Implementado**: Opción A. Campo `stock_config: Schema.Types.Mixed` en `EmpresaModel.js` (línea 62).

**Schema real implementado** (superset del planeado):
```javascript
stock_config: {
  acopio_habilitado:       Boolean  // habilita crear acopios y desacopio con destino
  caja_a_stock:            Boolean  // muestra acciones destino al cargar factura de materiales
  destino_desacopio:       Boolean  // al desacopiar pregunta a dónde van los materiales
  distribucion_por_linea:  Boolean  // destino diferente por cada línea de material
  validacion_movimientos:  Boolean  // movimientos quedan pendientes hasta confirmar
  extraccion_automatica:   Boolean  // IA extrae materiales al subir imagen de factura
}
```

**UI**: `app-web/src/sections/empresa/StockConfigDetails.js` — Panel completo en la ficha de empresa con switch maestro + 6 toggles individuales. Accesible desde la tab "Stock / Materiales" en la ficha de empresa.

**Criterio de aceptación**: ✅ La config se lee correctamente, defaults seguros (todo false), se modifica desde la UI de empresa.

---

### Tarea T.2 — Condicionar UI según configuración ✅ COMPLETO

**Objetivo**: Los componentes de stock leen la config de la empresa y muestran/ocultan opciones.

**Implementado**:
- `MaterialesFacturaActions.js` — lee `stockConfig.acopio_habilitado` (muestra opción acopio) y `stockConfig.distribucion_por_linea` (muestra opción distribuir por línea)
- `movementForm.js` — lee `empresa.stock_config.caja_a_stock` para mostrar sección de destino de materiales
- `flowConfirmarRemito.js` (bot WhatsApp) — lee `stock_config.destino_desacopio` para preguntar destino al desacopiar

**Criterio de aceptación**: ✅ Empresa sin config ve opciones base. Con `acopio_habilitado` ve acopio. Con `distribucion_por_linea` ve distribuir.

---

### Tarea T.3 — Estado PENDIENTE_CONFIRMACION ✅ COMPLETO

**Objetivo**: Cuando `validacion_movimientos = true`, los movimientos se crean con estado `PENDIENTE_CONFIRMACION` en vez de `ENTREGADO`.

**Implementado**:
- `movimientoMaterialModel.js` — `PENDIENTE_CONFIRMACION` en enum de estados
- `solicitudModel.js` — `PENDIENTE_CONFIRMACION` en enum de estados
- `solicitudService.js` — lee `validacion_movimientos` al crear, setea estado correcto
- `solicitudMovimientoMaterialesRoutes.js` — `PUT /:solicitudId/confirmar` existe
- `stockSolicitudes.js` — UI para confirmar ingreso (wizard `ConfirmarIngresoDialog`)

**Criterio de aceptación**: ✅ Todo funcional.

---

### Tarea T.4 — Tests Fase T ❌ PENDIENTE

**Tests requeridos**:
- Empresa sin config → defaults correctos (todo false)
- Empresa con `acopio_habilitado = false` + request destino acopio → error
- Empresa con `validacion_movimientos = true` → solicitud en PENDIENTE_CONFIRMACION
- Confirmar solicitud → estado cambia a ENTREGADO
- Stock calculado incluye PENDIENTE_CONFIRMACION

**Archivos**:
| Archivo | Estado |
|---|---|
| `backend/test/stock/stockConfig.test.js` | ❌ No existe |
| `backend/test/stock/validacionMovimientos.test.js` | ❌ No existe |

---

### GAP: stockConfigGuard sin aplicar a rutas ❌ PENDIENTE

`backend/src/middleware/stockConfigGuard.js` está completo y funcional, pero **no está importado ni usado en ningún route file**. Actualmente cualquier empresa puede llamar los endpoints de stock sin tener `stock_config` configurado; el guard es letra muerta.

**Rutas candidatas para aplicar el guard**:
```
POST /api/solicitud-material/from-caja        → stockConfigGuard
PUT  /api/solicitud-material/:id/confirmar    → stockConfigGuard
POST /api/acopio/from-caja                    → stockConfigGuard
```

> Las rutas de solo lectura (GET) no requieren el guard obligatoriamente.

---

## 8. Fase 4 — Integración WhatsApp

> **Estimación**: 1 semana  
> **Impacto**: Medio — consulta rápida desde WhatsApp  
> **Riesgo**: Bajo — solo lectura + nuevos flows  
> **Depende de**: Fases 1-3

---

### Tarea 4.1 — Intent: VER_MATERIALES_OBRA

**Objetivo**: Agregar intent en `acciones.js` para que el bot reconozca "ver materiales obra X".

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/src/acciones.js` (o donde se definan intents) | **Modificar** |

---

### Tarea 4.2 — Flow: flowVerMaterialesObra.js

**Objetivo**: Flow que consume `GET /api/materiales/vista-obra/:proyectoId` y formatea respuesta WhatsApp.

**Formato de mensaje**:
```
📊 *Materiales en Obra Mendoza*

📦 Ladrillo hueco 12x18 — 500 u × $8.500 = $4.250.000
   └ 200 de compra directa | 300 de Acopio Cerámicos Norte
🔩 Caño 20x20 — 10 u × $15.000 = $150.000
   └ Depósito

💰 *Total: $4.400.000* (a precios de hoy)
⚠️ 2 materiales sin precio cargado
⏳ 796 ladrillos pendientes en proveedor
```

**Archivos**:
| Archivo | Acción |
|---|---|
| `backend/flows/flowVerMaterialesObra.js` | **Crear** |

---

### Tarea 4.3 — Destino en desacopio desde WhatsApp

**Objetivo**: En el flow existente de desacopio, agregar paso "¿a dónde va?" antes de confirmar.

**Archivos**:
| Archivo | Acción |
|---|---|
| Flow de desacopio existente en `backend/flows/` | **Modificar** |

---

## 9. Criterios de aceptación globales

### Funcionales
- [ ] Un usuario carga factura/ticket de materiales en caja → puede enviar a stock, obra, acopio o pendiente de asignar
- [ ] Un usuario desacopia → puede elegir destino (obra o depósito)
- [ ] La vista de obra muestra todos los materiales de todas las fuentes (incluye reservados en depósito)
- [ ] Los precios se calculan con valor actual del material (no histórico)
- [ ] El sistema viejo de materiales (V1) no es visible ni escribible
- [ ] No se pueden duplicar solicitudes desde la misma factura de caja
- [ ] Las opciones de destino visibles dependen de la configuración de la empresa
- [ ] La validación de movimientos funciona cuando está activada (pendiente → confirmar)
- [ ] "Pendiente de asignar" permite asignar a obra o descartar después

### No funcionales
- [ ] La vista de obra responde en < 3 segundos para obras con < 500 movimientos
- [ ] Los endpoints nuevos requieren autenticación (mismo middleware existente)
- [ ] Los datos históricos de V1 en Firestore no se eliminan

---

## 10. Riesgos por fase

### Fase 0
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `movementForm.js` es un archivo de 1576 líneas muy acoplado | Alta | Alto | Cambio quirúrgico: solo reemplazar la sección MM, no refactorizar todo |
| Usuarios pierden la funcionalidad de "ver materiales" temporalmente | Media | Medio | Hacer Tarea 0.5 y 0.6 juntas, nunca quitar sin reemplazar |
| Asignaciones V1 quedan huérfanas | Baja | Bajo | Tarea 0.1 (auditoría) determina si hay datos que migrar |

### Fase 1
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Consulta MongoDB + Firestore lenta | Media | Medio | Cache con TTL 5 min + paginación |
| Match de catálogos genera duplicados | Media | Medio | Reutilizar `conciliarConCatalogo` probada + match por alias |

### Fase 2
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Hook falla y deja desacopio sin stock | Media | Medio | Hook es best-effort, desacopio no se revierte. Log + alerta |
| Usuarios no entienden "¿a dónde va?" | Baja | Bajo | Default a "depósito", el paso es opcional |

### Fase 3
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Complejidad de UI con destino por línea | Media | Medio | Solo visible si `distribucion_por_linea = true`. Default "depósito" para todos |
| Caso acopio + stock en misma solicitud cruza dos BDs | Media | Alto | Transacción MongoDB + compensación Firestore si falla |

### Fase T
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Config desincronizada entre frontend y backend | Baja | Medio | Frontend siempre lee config al cargar componentes de stock |
| Nadie confirma movimientos y quedan en PENDIENTE_CONFIRMACION para siempre | Media | Bajo | Material ya cuenta en stock (no es bloqueo). Indicador visual suficiente |

### Transversal
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| UX de stock aún no está estandarizada internamente | Alta | Medio | Implementar Fases 0-1 primero (bajo riesgo, alto valor) y validar con clientes reales antes de Fases 2-3 |

---

## Anexo: Resumen de archivos por fase

### Archivos a CREAR

| Fase | Archivo | Tipo |
|---|---|---|
| 0 | `backend/scripts/auditoria-stock-v1.js` | Script |
| 0 | `app-web/src/components/stock/MaterialesFacturaActions.js` | Componente React |
| 0 | `app-web/src/components/stock/DistribuirMaterialesDialog.js` | Componente React |
| 0 | `backend/test/stock/solicitudFromCaja.test.js` | Test |
| 0 | `backend/test/stock/acopioFromCaja.test.js` | Test |
| 1 | `backend/src/services/stock/vistaObraService.js` | Service |
| 1 | `backend/src/controllers/stock/vistaObraController.js` | Controller |
| 1 | `backend/src/routes/vistaObraRoutes.js` | Route |
| 1 | `app-web/src/pages/stockVistaObra.js` | Página React |
| 1 | `app-web/src/services/vistaObraService.js` | Client API |
| 1 | `backend/test/stock/vistaObra.test.js` | Test |
| 2 | `backend/src/services/acopio/desacopioHookService.js` | Service |
| 2 | `app-web/src/components/acopio/DestinoDesacopioDialog.js` | Componente React |
| 2 | `backend/test/stock/desacopioHook.test.js` | Test |
| 3 | `backend/test/stock/solicitudDestinoFlexible.test.js` | Test |
| T | `backend/src/models/stockConfig.js` (o campo en empresa) | Modelo |
| T | `app-web/src/services/stockConfigService.js` | Client API |
| T | `backend/test/stock/stockConfig.test.js` | Test |
| T | `backend/test/stock/validacionMovimientos.test.js` | Test |
| 4 | `backend/flows/flowVerMaterialesObra.js` | Flow WhatsApp |

### Archivos a MODIFICAR

| Fase | Archivo | Cambio |
|---|---|---|
| 0 | `backend/src/models/solicitud.js` | + campo `origen_movimiento_caja_id` |
| 0 | `backend/src/models/movimientoMaterial.js` | + campo `origen_movimiento_caja_id` |
| 0 | `backend/src/controllers/stock/solicitudController.js` | + handler `createFromCaja` |
| 0 | `backend/src/services/stock/solicitudService.js` | + método `createFromCaja()` |
| 0 | `backend/src/routes/solicitudMovimientoMaterialesRoutes.js` | + ruta POST `/from-caja` |
| 0 | `backend/src/routes/acopioRoutes.js` | + ruta POST `/from-caja` |
| 0 | `backend/src/services/acopio/AcopioService.js` | + método `createFromCaja()` |
| 0 | `app-web/src/pages/movementForm.js` | Reemplazar sección MM legacy |
| 0 | `backend/src/routes/movimientoMaterialRoutes.js` | Deprecar escrituras (410 Gone) |
| 0 | `app-web/src/pages/movimientosMateriales.js` | Eliminar o redirigir |
| 0 | Navegación frontend | Quitar link a MM legacy |
| 1 | `backend/app.api.js` | + registrar ruta vista-obra |
| 1 | Navegación frontend | + acceso a vista obra |
| 2 | `backend/src/models/movimientoMaterial.js` | + campos `origen_acopio_id`, `origen_remito_id` |
| 2 | `backend/src/models/solicitud.js` | + campo `origen_acopio_id` |
| 2 | `backend/src/services/acopio/AcopioService.js` | Invocar hook post-desacopio |
| 2 | `backend/src/routes/acopioRoutes.js` | + parámetros destino en endpoint remito |
| 2 | `app-web/src/pages/movimientosAcopio.js` | + selector destino en desacopio |
| 3 | `backend/src/models/movimientoMaterial.js` | + campos `destino*` |
| 3 | `backend/src/services/stock/solicitudService.js` | Lógica distribución por destino |
| 3 | `backend/src/controllers/stock/solicitudController.js` | Validación destinos |
| 3 | `app-web/src/pages/stockSolicitudes.js` | UI selector destino |
| 3 | `app-web/src/components/stock/solicitudes/SolicitudFormDialog.js` | UI selector destino por línea |
| T | `backend/src/models/movimientoMaterial.js` | + estado PENDIENTE_CONFIRMACION |
| T | `backend/src/models/solicitud.js` | + estado PENDIENTE_CONFIRMACION |
| T | `backend/src/services/stock/solicitudService.js` | Leer config al crear |
| T | `backend/src/controllers/stock/solicitudController.js` | + endpoint confirmar |
| T | `backend/src/routes/solicitudMovimientoMaterialesRoutes.js` | + ruta PUT confirmar |
| T | `app-web/src/components/stock/MaterialesFacturaActions.js` | Condicionar opciones según config |
| T | `app-web/src/pages/stockSolicitudes.js` | + botón confirmar |
| 4 | `backend/src/acciones.js` | + intent VER_MATERIALES_OBRA |
| 4 | Flow de desacopio existente | + paso "¿a dónde va?" |
