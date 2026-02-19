# 📦 Stock — Manual Técnico de Diseño

> Documentación técnica del módulo de stock para desarrolladores y agentes de IA.  
> Última actualización: Febrero 2026.

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Modelos de Datos (Mongoose)](#2-modelos-de-datos-mongoose)
   - [Material](#21-material)
   - [Solicitud (Ticket)](#22-solicitud-ticket)
   - [Movimiento](#23-movimiento)
   - [Relaciones entre modelos](#24-relaciones-entre-modelos)
3. [Reglas de Negocio Fundamentales](#3-reglas-de-negocio-fundamentales)
   - [Tipos de ticket y estados](#31-tipos-de-ticket-y-estados)
   - [Convención de signos en cantidades](#32-convención-de-signos-en-cantidades)
   - [Fórmula de stock](#33-fórmula-de-stock)
   - [Flujo de estados (solo INGRESO)](#34-flujo-de-estados-solo-ingreso)
4. [Backend — Capas y Archivos](#4-backend--capas-y-archivos)
   - [Repositorios](#41-repositorios)
   - [Servicios](#42-servicios)
   - [Controladores](#43-controladores)
   - [Rutas HTTP](#44-rutas-http)
5. [Funciones Clave](#5-funciones-clave)
   - [buildSolicitudCreatePayload](#51-buildsolicitudcreatepayload)
   - [conciliarMovimiento](#52-conciliarmovimiento)
   - [buildFiltersMovimiento / buildFiltersSolicitud](#53-buildfiltersmovimiento--buildfilterssolicitud)
   - [recalcularEstadoSolicitud](#54-recalcularestadosolicitud)
   - [autoVincularMaterial](#55-autovincularMaterial)
6. [Conciliación de Materiales](#6-conciliación-de-materiales)
   - [Pipeline de búsqueda (4 niveles)](#61-pipeline-de-búsqueda-4-niveles)
   - [Pre-conciliación con ChatGPT + catálogo](#62-pre-conciliación-con-chatgpt--catálogo)
   - [Conciliación final antes de guardar](#63-conciliación-final-antes-de-guardar)
7. [WhatsApp Bot — Flows de Stock](#7-whatsapp-bot--flows-de-stock)
   - [Arquitectura del bot](#71-arquitectura-del-bot)
   - [Acción CREAR_SOLICITUD_MATERIAL](#72-acción-crear_solicitud_material)
   - [flowStockPorTexto (texto/audio)](#73-flowstockportexto-textoaudio)
   - [flowIngresarMateriales (foto factura)](#74-flowingresarmateriales-foto-factura)
   - [flowRetirarMateriales (foto remito)](#75-flowretirarmateriales-foto-remito)
   - [flowConsultarStock](#76-flowconsultarstock)
   - [Registro de flows en app.js](#77-registro-de-flows-en-appjs)
8. [Extracción con IA (Vision/O3)](#8-extracción-con-ia-visiono3)
   - [Sistema async de tareas (Web)](#81-sistema-async-de-tareas-web)
   - [Extracción en WhatsApp](#82-extracción-en-whatsapp)
9. [Frontend (Next.js + MUI)](#9-frontend-nextjs--mui)
   - [Páginas](#91-páginas)
   - [Servicios frontend](#92-servicios-frontend)
   - [Componentes principales](#93-componentes-principales)
10. [Diagramas de Flujo](#10-diagramas-de-flujo)
    - [Flujo completo: WhatsApp texto/audio → ticket](#101-flujo-completo-whatsapp-textoaudio--ticket)
    - [Flujo completo: WhatsApp foto → ticket](#102-flujo-completo-whatsapp-foto--ticket)
    - [Flujo completo: Web IA → ticket](#103-flujo-completo-web-ia--ticket)
    - [Entrega parcial](#104-entrega-parcial)

---

## 1. Arquitectura General

```
┌───────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  app-web/src/pages/stockMateriales.js                            │
│  app-web/src/pages/stockSolicitudes.js                           │
│  app-web/src/pages/stockMovimientos.js                           │
│  app-web/src/services/stock/*Service.js                          │
│  app-web/src/components/stock/**                                 │
├───────────────────────────────────────────────────────────────────┤
│                          REST API                                │
│  backend/src/routes/material*.js                                 │
│  backend/src/routes/solicitud*.js                                │
│  backend/src/routes/movimiento*.js                               │
├───────────────────────────────────────────────────────────────────┤
│                     BACKEND (Node/Express)                       │
│  Controllers → Services → Repositories → Mongoose Models         │
│  backend/src/controllers/stock/*                                 │
│  backend/src/services/stock/*                                    │
│  backend/src/repositories/*                                      │
│  backend/src/models/Material.js, Solicitud.js, Movimiento.js     │
├───────────────────────────────────────────────────────────────────┤
│                     WHATSAPP BOT (BuilderBot)                    │
│  backend/app.js (entry point, createFlow, createProvider)        │
│  backend/utils/acciones.js (acción CREAR_SOLICITUD_MATERIAL)     │
│  backend/flows/stockFlows/flowStockPorTexto.js (texto/audio)     │
│  backend/flows/stockFlows/flowIngresarMateriales.js (foto fact)  │
│  backend/flows/stockFlows/flowRetirarMateriales.js (foto remito) │
│  backend/flows/stockFlows/flowConsultarStock.js                  │
├───────────────────────────────────────────────────────────────────┤
│                     HELPERS / UTILIDADES                          │
│  backend/utils/stock/movYSolicitudHelper.js (buildPayload, etc.) │
│  backend/utils/stock/materialHelper.js (builders, listMaterials) │
│  backend/flows/stockFlows/utilsIngresarMateriales.js (Vision IA) │
│  backend/flows/stockFlows/utilsRetirarMateriales.js (Vision IA)  │
├───────────────────────────────────────────────────────────────────┤
│                        STORAGE                                   │
│  MongoDB (Mongoose) → Material, Solicitud, Movimiento            │
│  ChatGPT (O3/4o) → Extracción de facturas, parsing texto, conc. │
│  Whisper → Transcripción de audios WhatsApp                      │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelos de Datos (Mongoose)

### 2.1 Material

**Archivo:** `backend/src/models/Material.js`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `nombre` | String | ✅ | Nombre principal. Unique por empresa. |
| `SKU` | String | — | Código de proveedor |
| `empresa_id` | String | ✅ | FK a empresa |
| `empresa_nombre` | String | — | Desnormalizado |
| `alias` | Mixed | — | Array de strings o string. Nombres alternativos para conciliación. |
| `desc_material` | String | — | Descripción libre |
| `categoria` | String | — | Ej: "Construcción en seco" |
| `subcategoria` | String | — | Ej: "Placas de yeso" |
| `precio_unitario` | Number | — | Último precio conocido |
| `fecha_precio` | Date | — | Fecha de última actualización de precio |

**Índices:**
- `{ empresa_id, nombre }` — unique
- `{ empresa_id, SKU }` — sparse
- `{ empresa_id, categoria, subcategoria }` — sparse
- Text search: `nombre` (peso 10), `SKU` (6), `alias` (5), `desc_material` (3), idioma spanish

### 2.2 Solicitud (Ticket)

**Archivo:** `backend/src/models/Solicitud.js`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `solicitud_id` | String | — | ID legible opcional |
| `tipo` | String | ✅ | `INGRESO` \| `EGRESO` \| `TRANSFERENCIA` \| `AJUSTE` |
| `subtipo` | String | ✅ | `COMPRA`, `RETIRO`, `RETIRO_REMITO`, `TRANSFERENCIA`, `AJUSTE`, `AJUSTE_POSITIVO`, etc. |
| `empresa_id` | String | ✅ | FK a empresa |
| `responsable` | String | — | Nombre de quien crea |
| `estado` | String | — | Enum: `PENDIENTE`, `PARCIALMENTE_ENTREGADO`, `ENTREGADO`. Default: `PENDIENTE`. |
| `proveedor` | SubDoc | — | `{ id, nombre, cuit, contacto, extra }` |
| `id_compra` | String | — | Nro de factura/remito |
| `url_doc` | String | — | URL principal de documento |
| `documentos` | [String] | — | Array de URLs de documentos adjuntos |
| `proyecto_id` | String | — | FK a proyecto (null para transferencias) |
| `proyecto_nombre` | String | — | Desnormalizado |
| `fecha` | Date | ✅ | Fecha del ticket |

### 2.3 Movimiento

**Archivo:** `backend/src/models/Movimiento.js`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | String | — | ID legible opcional |
| `empresa_id` | String | ✅ | FK a empresa |
| `empresa_nombre` | String | — | Desnormalizado |
| `usuario_id` | String | — | Quién creó |
| `usuario_mail` | String | — | Email del creador |
| `id_material` | String | — | **FK a Material** (string, no ObjectId). `null` = sin conciliar. |
| `nombre_item` | String | ✅ | Nombre original del remito/factura/texto. Máx 300. |
| `nombre_material` | String | — | Nombre del material post-conciliación |
| `cantidad` | Number | ✅ | **Con signo**: positivo = ingreso, negativo = egreso |
| `tipo` | String | ✅ | `INGRESO` \| `EGRESO` \| `TRANSFERENCIA` \| `AJUSTE` |
| `subtipo` | String | ✅ | Heredado de la solicitud |
| `estado` | String | — | `PENDIENTE` \| `PARCIALMENTE_ENTREGADO` \| `ENTREGADO` |
| `cantidad_original` | Number | — | `abs(cantidad)` al crear. Para tracking de entregas parciales. |
| `cantidad_entregada` | Number | — | Cuánto se entregó hasta ahora. Default 0. |
| `movimiento_padre_id` | ObjectId | — | Ref a Movimiento. Se usa en splits de entrega parcial. |
| `fecha_entrega` | Date | — | Fecha de última entrega |
| `solicitud_id` | ObjectId | — | **FK a Solicitud** (ref: 'Solicitud') |
| `observacion` | String | — | Texto libre. Máx 2000. |
| `fecha_movimiento` | Date | ✅ | Fecha del movimiento |
| `proyecto_id` | String | — | FK a proyecto |
| `proyecto_nombre` | String | — | Desnormalizado |

**Índices clave:**
- `{ empresa_id, id_material, estado, tipo }` — para cálculo de stock
- `{ empresa_id, id_material, fecha_movimiento: -1 }` — para historial
- `{ solicitud_id }` — para lookup de movimientos por ticket

### 2.4 Relaciones entre modelos

```
Material (1) ←─── id_material ───── (N) Movimiento
                                          │
Solicitud (1) ←── solicitud_id ──── (N) Movimiento
                                          │
Movimiento ←── movimiento_padre_id ── Movimiento (split entrega parcial)
```

- **Solicitud → Movimientos**: Relación 1:N. Una solicitud agrupa múltiples movimientos. Se hace `$lookup` en queries de listado.
- **Material → Movimientos**: Relación 1:N por `id_material` (string). Un material `null` = movimiento sin conciliar.
- **Movimiento → Movimiento padre**: Para entregas parciales. El movimiento original se splitea en uno ENTREGADO + uno PENDIENTE con el restante.

---

## 3. Reglas de Negocio Fundamentales

### 3.1 Tipos de ticket y estados

| Tipo | Estado inicial | Permite entrega parcial | Stock se aplica |
|---|---|---|---|
| `INGRESO` | `PENDIENTE` | ✅ | Al confirmar entrega |
| `EGRESO` | `ENTREGADO` | ❌ | Inmediato al crear |
| `TRANSFERENCIA` | `ENTREGADO` | ❌ | Inmediato al crear |
| `AJUSTE` | `ENTREGADO` | ❌ | Inmediato al crear |

### 3.2 Convención de signos en cantidades

La normalización se hace en `buildSolicitudCreatePayload`:

| Tipo | Signo en BD | Lógica |
|---|---|---|
| `INGRESO` | `+abs(cantidad)` | Siempre positivo |
| `EGRESO` | `-abs(cantidad)` | Siempre negativo |
| `AJUSTE` | Se respeta signo original | Puede ser + o − |
| `TRANSFERENCIA` | Par de movimientos | `-abs()` (EGRESO del origen) + `+abs()` (INGRESO al destino) |

### 3.3 Fórmula de stock

```
Stock de un material = Σ movimiento.cantidad
  WHERE id_material = X
    AND estado = 'ENTREGADO'
```

Como las cantidades ya tienen el signo correcto (INGRESO=+, EGRESO=−), la fórmula es simplemente la **suma de todas las cantidades de movimientos ENTREGADOS** de ese material. Los movimientos PENDIENTE no cuentan.

### 3.4 Flujo de estados (solo INGRESO)

```
PENDIENTE ──── confirmar entrega total ────────────→ ENTREGADO
    │                                                      ↑
    └── confirmar entrega parcial → PARCIALMENTE_ENTREGADO ┘
                                           │               ↑
                                           └── otra parcial ┘
```

**Entrega parcial — mecánica interna:**

1. El movimiento original (ej: 50 unidades PENDIENTE) se actualiza:
   - `cantidad` = cantidad recibida (ej: 30)
   - `cantidad_entregada` = 30
   - `estado` = `ENTREGADO`
2. Se crea un **nuevo movimiento** con:
   - `cantidad` = restante (ej: 20)
   - `estado` = `PENDIENTE`
   - `movimiento_padre_id` = ID del movimiento original
3. Se ejecuta `recalcularEstadoSolicitud` para actualizar el estado de la solicitud padre.

---

## 4. Backend — Capas y Archivos

### 4.1 Repositorios

| Archivo | Modelo | Operaciones principales |
|---|---|---|
| `src/repositories/solicitudRepository.js` | Solicitud | `create`, `findById`, `findAll` (aggregate con `$lookup` a Movimiento), `update`, `delete` |
| `src/repositories/movimientoRepository.js` | Movimiento | `create`, `findById`, `findAll`, `bulkCreate`, `updateMany`, `delete`, `deleteMany` |
| `src/repositories/materialRepository.js` | Material | CRUD + `findByText` (text search), `getMaterialConStock` (aggregate pipeline), `getTotalesPorProyecto`, `bulkUpdateCategoria` |

### 4.2 Servicios

| Archivo | Responsabilidad |
|---|---|
| `src/services/stock/solicitudService.js` | `createSolicitud` (transacción: crea solicitud + movimientos + autoVincula), `getSolicitud`, `listSolicitudes`, `updateSolicitud` (transaccional con diff de movimientos), `deleteSolicitud` |
| `src/services/stock/materialService.js` | CRUD materiales + `findByAlias`, `findByNombreExact`, `upsertAlias`, `getMaterialConStock`, `getTotalesPorProyecto`, `bulkUpdateCategoria` |
| `src/services/stock/stockService.js` | `calcularStock` (itera movimientos), `getStockDeMaterial`, `getStockDeTodosMateriales`, `formatearStockParaWhatsApp` |

### 4.3 Controladores

| Archivo | Endpoints destacados |
|---|---|
| `src/controllers/stock/solicitudController.js` | CRUD + `extraerFactura` (async task con IA), `extraerFacturaStatus` (polling), `extraerRemito`, `conciliarMateriales`, `conciliarMaterialesEgreso` |
| `src/controllers/stock/materialController.js` | CRUD + `getStock`, `getTotalesPorProyecto`, `bulkUpdateCategoria`, `exportMaterials` |
| `src/controllers/stock/movimientoController.js` | CRUD + `entregarMovimiento` (entrega parcial: split + recálculo estado), `conciliarMovimiento` |

### 4.4 Rutas HTTP

| Base | Archivo | Endpoints principales |
|---|---|---|
| `/api/materiales` | `materialRoutes.js` | `GET /stock/totales`, `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id`, `PATCH /categorias/bulk`, `GET /export` |
| `/api/solicitudes` | `solicitudRoutes.js` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/entregar` |
| `/api/movimientos-materiales` | `solicitudMovimientoMaterialesRoutes.js` | `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id`, `POST /extraer-factura`, `GET /extraer-factura/status/:taskId`, `POST /extraer-remito`, `POST /conciliar-materiales`, `POST /conciliar-materiales-egreso` |

Las rutas se montan en `src/routes/index.js`, que se importa desde `app.api.js`.

---

## 5. Funciones Clave

### 5.1 buildSolicitudCreatePayload

**Archivo:** `backend/utils/stock/movYSolicitudHelper.js`

**Propósito:** Función central que normaliza y valida el input antes de crear una solicitud + movimientos. Se usa tanto desde la API web como desde WhatsApp.

**Input:**
```javascript
{
  solicitud: { tipo, subtipo, empresa_id, responsable, fecha, proyecto_id, ... },
  movimientos: [
    { empresa_id, nombre_item, cantidad, tipo, subtipo, proyecto_id, id_material, ... }
  ]
}
```

**Qué hace:**
1. Valida que haya al menos 1 movimiento.
2. Valida tipo de solicitud (`INGRESO|EGRESO|TRANSFERENCIA|AJUSTE`).
3. Asigna estado inicial: `INGRESO` → `PENDIENTE`, otros → `ENTREGADO`.
4. Para cada movimiento:
   - Valida `empresa_id` (required) y `cantidad ≠ 0`.
   - **Normaliza cantidad**: INGRESO → `+abs`, EGRESO → `−abs`, AJUSTE/TRANSFERENCIA → respeta signo.
   - Calcula `cantidad_original = abs(cantidad)`.
   - Calcula `cantidad_entregada` = si ENTREGADO → `abs(cantidad)`, si PENDIENTE → 0.
   - Maneja tipo especial `DEVOLUCION_RECHAZO` → se convierte a EGRESO con subtipo DEVOLUCION_RECHAZO.

**Output:**
```javascript
{ solicitud: { ...normalizado }, movimientos: [ ...normalizados ] }
```

### 5.2 conciliarMovimiento

**Archivo:** `backend/utils/stock/movYSolicitudHelper.js`

**Propósito:** Vincular o desvincular un movimiento con un material existente.

**Lógica:**
- Si recibe `id_material` → busca el Material por ID → setea `id_material` y `nombre_material` en el movimiento.
- Si `id_material = null` → limpia la vinculación (desconcilia).
- Normaliza la cantidad según el tipo del movimiento.

### 5.3 buildFiltersMovimiento / buildFiltersSolicitud

**Archivo:** `backend/utils/stock/movYSolicitudHelper.js`

**Filtros soportados en movimientos:**
- `empresa_id`, `proyecto_id`, `usuario_id`, `tipo`, `subtipo`, `nombre` (regex), `conciliado` (true/false → `id_material` exists o null), `id_material`, `fecha_desde`/`fecha_hasta`, `estado`, `estados` (CSV → `$in`)

**Filtros soportados en solicitudes:**
- `empresa_id`, `proyecto_id`, `tipo`, `subtipo`, `estado`, `estados` (CSV → `$in`), `fecha_desde`/`fecha_hasta`, `search` (regex en responsable)

### 5.4 recalcularEstadoSolicitud

**Archivo:** `backend/utils/stock/movYSolicitudHelper.js`

**Lógica:**
- Busca todos los movimientos de una solicitud.
- Si todos `ENTREGADO` → solicitud = `ENTREGADO`.
- Si todos `PENDIENTE` → solicitud = `PENDIENTE`.
- Si mix → solicitud = `PARCIALMENTE_ENTREGADO`.

### 5.5 autoVincularMaterial

**Archivo:** `backend/utils/stock/movYSolicitudHelper.js`

**Propósito:** Al crear una solicitud, intenta vincular automáticamente cada movimiento con un material existente usando `empresa_id` + `nombre_item`.

**Lógica:** Busca material por nombre exacto (case-insensitive) → si encuentra, setea `id_material` y `nombre_material`.

---

## 6. Conciliación de Materiales

La conciliación es el proceso de vincular un movimiento (que tiene `nombre_item` como texto libre del remito/factura/mensaje) con un `Material` existente en la base de datos.

### 6.1 Pipeline de búsqueda (4 niveles)

**Archivo:** `backend/flows/stockFlows/utilsRetirarMateriales.js` → `buscarMaterialPorNombreYAlias`

Se ejecuta secuencialmente, para en el primer match:

| Nivel | Método | Detalle |
|---|---|---|
| 1 | Nombre exacto | `findByNombreExact(empresa_id, nombre)` |
| 2 | Nombre case-insensitive | Regex `^nombre$` con flag `i` |
| 3 | Alias | `findByAlias(empresa_id, nombre)` — busca en el array de alias |
| 4 | ChatGPT (fallback) | Envía el nombre + lista de materiales existentes a ChatGPT para matching semántico |

### 6.2 Pre-conciliación con ChatGPT + catálogo

**Archivo:** `backend/flows/stockFlows/flowStockPorTexto.js` → `parsearMaterialesDeTexto`

Cuando el usuario crea un ticket por **texto/audio**, antes de la conciliación por pipeline, ChatGPT ya recibe el catálogo completo:

1. Se cargan hasta 150 materiales de la BD con `listMaterials`.
2. Se incluyen en el prompt: nombre, ID, SKU, alias de cada material.
3. ChatGPT interpreta el mensaje del usuario Y matchea contra el catálogo.
4. Devuelve `id_material` directamente cuando hay match.

**Resultado:** Los materiales que ChatGPT matchea llegan al builder de movimientos con `id_material` ya seteado.

### 6.3 Conciliación final antes de guardar

**Archivo:** `backend/flows/stockFlows/flowStockPorTexto.js` → `conciliarMateriales`

Después de que el usuario confirma, se ejecuta `conciliarMateriales(movimientos, empresa_id)`:

```javascript
for (movimiento of movimientos) {
  if (movimiento.id_material) { skip; }  // Ya matcheado por ChatGPT → preservar
  buscarMaterialPorNombreYAlias(nombre_item, empresa_id)  // Pipeline de 4 niveles
  if (match) → setea id_material + actualiza nombre_item
}
```

**Clave:** Los materiales ya conciliados por ChatGPT (etapa 6.2) se preservan, no se re-procesan.

---

## 7. WhatsApp Bot — Flows de Stock

### 7.1 Arquitectura del bot

El bot usa **@builderbot/bot** con Meta Cloud API. El entry point es `backend/app.js`.

**Patrón general:**
```
Usuario escribe → ChatGPT clasifica acción → acciones.js (switch) → gotoFlow(flowEspecífico)
```

**State management:** Cada flow usa `state.update()` y `state.getMyState()` para pasar datos entre pasos. Los campos de state se limpian al finalizar con `limpiarState()`.

**Captura de input:** Los flows usan `.addAction({ capture: true }, ...)` para capturar la siguiente respuesta del usuario.

### 7.2 Acción CREAR_SOLICITUD_MATERIAL

**Archivo:** `backend/utils/acciones.js`

**Trigger:** ChatGPT detecta intención de stock (ej: "quiero ingresar materiales", "retirar del stock").

**Datos de ChatGPT:**
```json
{
  "accion": "CREAR_SOLICITUD_MATERIAL",
  "tipo": "INGRESO|EGRESO|AJUSTE|TRANSFERENCIA"
}
```

**Routing en `flowCrearTicketStock`:**

| Tipo | Acción |
|---|---|
| `INGRESO` | `state._stockTextoTipo = 'INGRESO'` → `gotoFlow(flowSeleccionarMetodoStock)` |
| `EGRESO` | `state._stockTextoTipo = 'EGRESO'` → `gotoFlow(flowSeleccionarMetodoStock)` |
| `AJUSTE` | `state._stockTextoTipo = 'AJUSTE'` → `gotoFlow(flowStockTextoInicio)` (directo a texto) |
| `TRANSFERENCIA` | `state._stockTextoTipo = 'TRANSFERENCIA'` → `gotoFlow(flowStockTextoInicio)` (directo a texto) |
| default (sin tipo) | Muestra menú con las 4 opciones |

### 7.3 flowStockPorTexto (texto/audio)

**Archivo:** `backend/flows/stockFlows/flowStockPorTexto.js`

Contiene 4 sub-flows y funciones auxiliares:

#### flowSeleccionarMetodoStock
- **Keyword:** `__seleccionar_metodo_stock__`
- **Solo para INGRESO/EGRESO.** Pregunta: 1=foto/PDF, 2=texto/audio.
- Opción 1 → redirige a `flowIngresarMateriales` o `flowPedirRemitoOData`.
- Opción 2 → `gotoFlow(flowStockTextoInicio)`.

#### flowStockTextoInicio
- **Keyword:** `__stock_texto_inicio__`
- Pide mensaje de texto o audio con lista de materiales.
- Captura input con `dameInputCualquierFormato(ctx)` (maneja texto plano y audio → Whisper).
- Carga `materialesDB` con `listMaterials()` (hasta 1000 materiales de la empresa).
- Llama a `parsearMaterialesDeTexto(texto, materialesDB)` → ChatGPT extrae + matchea.
- Guarda `_stockTextoDatosUsuario` en state (para no re-consultar).
- Muestra resumen con ✅/⚠️ por material.
- `gotoFlow(flowStockTextoProyecto)`.

#### flowStockTextoProyecto
- **Keyword:** `__stock_texto_proyecto__`
- Muestra menú numérico de proyectos.
- Para TRANSFERENCIA: captura 2 proyectos (origen + destino) usando `fallBack()` para re-capturar.
- `gotoFlow(flowStockTextoConfirmar)`.

#### flowStockTextoConfirmar
- **Keyword:** `__stock_texto_confirmar__`
- Muestra resumen completo (tipo, proyecto(s), materiales).
- Al confirmar:
  1. Construye array de movimientos con `id_material: m.id_material || null` (preserva pre-conciliación).
  2. Ejecuta `conciliarMateriales(movimientos, empresa_id)` — intenta vincular los que quedaron sin id_material.
  3. `buildSolicitudCreatePayload(inputPayload)` — normaliza.
  4. `createSolicitud(estructura)` — persiste en MongoDB.
  5. Informa resultado + cantidad de conciliados/sin conciliar.
- `limpiarState(state)` al finalizar.

**Variables de state usadas:**

| Campo | Tipo | Descripción |
|---|---|---|
| `_stockTextoTipo` | String | INGRESO/EGRESO/AJUSTE/TRANSFERENCIA |
| `_stockTextoMateriales` | Array | `[{nombre, cantidad, unidad, id_material}]` |
| `_stockTextoInput` | String | Texto original del usuario |
| `_stockTextoDatosUsuario` | Object | Datos de `datosInicialesPorTelefono` (cacheado) |
| `_stockTextoDatos` | Object | Alias de datosUsuario usado en confirmación |
| `_stockTextoProyectos` | Array | Lista de proyectos disponibles |
| `_stockTextoProyecto` | Object | `{id, nombre}` proyecto seleccionado |
| `_stockTextoProyOrigen` | Object | Proyecto origen (TRANSFERENCIA) |
| `_stockTextoProyDestino` | Object | Proyecto destino (TRANSFERENCIA) |
| `_stockTextoEsperando` | Boolean | Flag de captura activa |
| `_stockTextoEsperandoProy` | Boolean | Flag captura proyecto |
| `_stockTextoEsperandoProyOrigen` | Boolean | Flag captura origen |
| `_stockTextoEsperandoProyDestino` | Boolean | Flag captura destino |
| `_stockTextoEsperandoConfirm` | Boolean | Flag captura confirmación |
| `_stockMetodoEsperando` | Boolean | Flag captura método (foto vs texto) |

#### parsearMaterialesDeTexto(texto, materialesDB)

**Prompt a ChatGPT (4o):**
- Rol: asistente de materiales de construcción.
- Input: mensaje de WhatsApp + catálogo de hasta 150 materiales (nombre, id, SKU, alias).
- Reglas: matchear contra catálogo si hay coincidencia (flexible), devolver `id_material`. Si no hay match → `id_material: null`.
- Output: `{ "materiales": [{ "nombre", "cantidad", "unidad", "id_material" }] }`.

#### conciliarMateriales(materiales, empresa_id)

```javascript
for each material:
  if (m.id_material) → skip (ya conciliado) → conciliados++
  else → buscarMaterialPorNombreYAlias(m.nombre_item, empresa_id)
    if match → setea id_material, actualiza nombre_item → conciliados++
    else → sinConciliar++
return { conciliados, sinConciliar, total }
```

### 7.4 flowIngresarMateriales (foto factura)

**Archivos:**
- `backend/flows/stockFlows/flowIngresarMateriales.js` — flows
- `backend/flows/stockFlows/utilsIngresarMateriales.js` — utilidades

**Flows:**
1. `flowIngresarMateriales` — Pide foto/PDF del documento.
2. `flowIngresarProyecto` — Selección de proyecto.
3. `flowProcesarFactura` — Envía imagen a O3 (Vision) → extrae materiales + datos factura → conciliación → muestra resumen.
4. `flowIngresarConfirmar` — Confirmar → `buildSolicitudCreatePayload` → `createSolicitud`.
5. `flowIngresarModificar` — Modificar materiales por texto/audio (ChatGPT interpreta instrucciones de modificación).

**Funciones en utilsIngresarMateriales:**
- `extraerDatosFacturaCompra(imagenes)` — Envía a O3 con prompt de extracción de facturas.
- `procesarFacturaAIngreso(datos, phone)` — Construye payload de solicitud.
- `analizarConciliacion(movimientos, empresa_id)` — Itera y concilia.
- `procesarSolicitudDirecta(payload, empresa_id)` — Limpia y llama a `createSolicitud`.

### 7.5 flowRetirarMateriales (foto remito)

**Archivos:**
- `backend/flows/stockFlows/flowRetirarMateriales.js` — flows
- `backend/flows/stockFlows/utilsRetirarMateriales.js` — utilidades

**Flows:**
1. `flowPedirRemitoOData` — Selección de proyecto → espera foto.
2. `flowProcesarRemito` — O3 extrae datos → conciliación → si hay cantidades ambiguas → `flowConfirmarCantidad`.
3. `flowConfirmarCantidad` — Pregunta cantidad uno a uno.
4. `flowContinuarRemito` — Retoma después de confirmaciones.
5. `flowRetirarConfirmar` — Resumen → confirmar/modificar/cancelar → `createSolicitud`.
6. `flowRetirarModificar` — Modificar por texto/audio.

**Función clave en utilsRetirarMateriales:**
- `buscarMaterialPorNombreYAlias(nombre, empresa_id)` — Pipeline de 4 niveles (ver sección 6.1). **Esta función se usa en todo el módulo**, no solo en retiros.

### 7.6 flowConsultarStock

**Archivo:** `backend/flows/stockFlows/flowConsultarStock.js`

Se activa desde acción `CONSULTAR_STOCK`. Lee datos de stock calculados → formatea con `formatearStockParaWhatsApp` → responde al usuario.

### 7.7 Registro de flows en app.js

**Archivo:** `backend/app.js`

Todos los flows deben estar:
1. **Exportados** desde `backend/flows/index.js`.
2. **Importados** en `app.js`.
3. **Incluidos** en el array de `createFlow([...])`.

> ⚠️ **Gotcha crítico:** Si un flow se exporta pero no se agrega a `createFlow`, los `gotoFlow()` hacia ese flow fallan **silenciosamente** — el bot se queda colgado sin error visible.

**Flows de stock registrados:**

```javascript
// En flows/index.js — exports
flowSeleccionarMetodoStock, flowStockTextoInicio, flowStockTextoProyecto, flowStockTextoConfirmar,
flowIngresarMateriales, flowIngresarProyecto, flowProcesarFactura, flowIngresarConfirmar, flowIngresarModificar,
flowPedirRemitoOData, flowProcesarRemito, flowConfirmarCantidad, flowContinuarRemito, flowRetirarConfirmar, flowRetirarModificar,
flowConsultarStock
```

---

## 8. Extracción con IA (Vision/O3)

### 8.1 Sistema async de tareas (Web)

**Archivo:** `backend/src/controllers/stock/solicitudController.js` → `extraerFactura`

Cuando el frontend sube una factura para extracción IA:

1. `POST /extraer-factura` → genera `taskId` (UUID) → responde `202 { taskId }`.
2. Procesa en background con O3 Vision.
3. Frontend hace polling: `GET /extraer-factura/status/:taskId` → `{ status: 'pending' | 'completed' | 'error', data }`.
4. Map en memoria con TTL de 10 minutos + limpieza automática cada 5 min.

### 8.2 Extracción en WhatsApp

En WhatsApp se procesa de forma síncrona (el usuario espera):

1. `extraerDatosFacturaCompra(imagenes)` / `extraerDatosRemitoStock(imagenes)` → llama a ChatGPT O3 con Vision.
2. Prompt especializado para facturas (extrae: proveedor, número, fecha, total, materiales con SKU/cantidad/precio/unidad).
3. Respuesta en JSON → `limpiarJson()` → parse → array de materiales.

---

## 9. Frontend (Next.js + MUI)

### 9.1 Páginas

| Página | Archivo | Descripción |
|---|---|---|
| Stock de Materiales | `app-web/src/pages/stockMateriales.js` | Tabla de materiales con tabs por proyecto. Drawer de detalle. CRUD. Import/Export Excel. ~1675 líneas. |
| Tickets (Solicitudes) | `app-web/src/pages/stockSolicitudes.js` | Tabla de solicitudes con filtros. Acciones: crear, editar, eliminar, confirmar ingreso, cargar IA. Filtro "Sin conciliar" (client-side). ~974 líneas. |
| Movimientos | `app-web/src/pages/stockMovimientos.js` | Tabla de movimientos individuales. Conciliación manual (popup con radio buttons para vincular). ~638 líneas. |

### 9.2 Servicios frontend

| Servicio | Archivo | API Base |
|---|---|---|
| `stockMaterialesService` | `app-web/src/services/stock/stockMaterialesService.js` | `/api/materiales` |
| `stockSolicitudesService` | `app-web/src/services/stock/stockSolicitudesService.js` | `/api/solicitudes` |
| `stockMovimientosService` | `app-web/src/services/stock/stockMovimientosService.js` | `/api/movimientos-materiales` |
| `stockAjusteService` | `app-web/src/services/stock/stockAjusteService.js` | Usa solicitudes service |

**Patrón**: Cada servicio exporta funciones que hacen fetch al backend con el token de Firebase Auth. `buildParams` arma los query params con filtros, paginación y sort.

### 9.3 Componentes principales

| Componente | Directorio | Descripción |
|---|---|---|
| `IngresoFacturaIA` | `app-web/src/components/stock/solicitudes/` | Wizard de 3 pasos: subir imagen → revisar materiales IA → confirmar ingreso |
| `EgresoRemitoIA` | `app-web/src/components/stock/solicitudes/` | Igual pero para egresos |
| `SolicitudForm` | `app-web/src/components/stock/solicitudes/` | Form modal para crear/editar solicitud manualmente |
| `EntregaParcialDialog` | `app-web/src/components/stock/solicitudes/` | Dialog para registrar entrega parcial |
| `ConfirmarIngresoDialog` | `app-web/src/components/stock/solicitudes/` | Wizard de confirmación de ingreso |
| `AjusteStockDialog` | `app-web/src/components/stock/solicitudes/` | Dialog para ajustes de stock |
| `MaterialDrawer` | `app-web/src/components/stock/materiales/` | Drawer lateral de detalle de material |
| `ExportarStock` | `app-web/src/components/stock/materiales/` | Export a Excel |
| `ImportarStock` | `app-web/src/components/stock/materiales/` | Import desde Excel (4 pasos) |

---

## 10. Diagramas de Flujo

### 10.1 Flujo completo: WhatsApp texto/audio → ticket

```
Usuario WhatsApp
  │
  ├─ "Quiero ingresar materiales" (o egreso/ajuste/transferencia)
  │
  ▼
ChatGPT (acciones.js) → acción: CREAR_SOLICITUD_MATERIAL, tipo: INGRESO
  │
  ▼
flowCrearTicketStock(data)
  │
  ├─ INGRESO/EGRESO → gotoFlow(flowSeleccionarMetodoStock)
  │   │
  │   ├─ Opción 1 (foto) → flowIngresarMateriales / flowPedirRemitoOData
  │   └─ Opción 2 (texto) ─┐
  │                         │
  ├─ AJUSTE/TRANSFERENCIA ──┘
  │
  ▼
flowStockTextoInicio
  │
  ├─ Usuario envía texto/audio
  ├─ dameInputCualquierFormato() → texto plano (Whisper si audio)
  ├─ listMaterials() → carga catálogo de BD
  ├─ parsearMaterialesDeTexto(texto, materialesDB) → ChatGPT 4o
  │   └─ ChatGPT matchea vs catálogo → [{nombre, cantidad, unidad, id_material}]
  ├─ Muestra resumen con ✅/⚠️
  │
  ▼
flowStockTextoProyecto
  │
  ├─ Muestra menú de proyectos
  ├─ TRANSFERENCIA: captura origen + destino (2 interacciones)
  ├─ Otros: captura 1 proyecto
  │
  ▼
flowStockTextoConfirmar
  │
  ├─ Muestra resumen final
  ├─ Usuario confirma con "1"
  │
  ├─ Construye movimientos (id_material: m.id_material || null)
  │   ├─ TRANSFERENCIA: 2 movs por material (−origen, +destino)
  │   ├─ AJUSTE: cantidad positiva, subtipo AJUSTE_POSITIVO
  │   ├─ INGRESO: cantidad positiva
  │   └─ EGRESO: cantidad negativa
  │
  ├─ conciliarMateriales(movimientos) → pipeline 4 niveles para los sin id_material
  ├─ buildSolicitudCreatePayload() → normaliza + valida
  ├─ createSolicitud() → MongoDB (transacción)
  │
  ├─ Informa: "✅ TICKET CREADO" + estado conciliación
  └─ limpiarState()
```

### 10.2 Flujo completo: WhatsApp foto → ticket

```
Usuario envía foto de factura/remito
  │
  ▼
flowSeleccionarMetodoStock (opción 1) ─── o ─── detección automática de imagen
  │
  ├─── INGRESO (factura) ──────────────── EGRESO (remito) ───────────────┐
  │                                                                       │
  ▼                                                                       ▼
flowIngresarMateriales                                flowPedirRemitoOData
  │ pide foto/PDF                                       │ pide proyecto + foto
  ▼                                                     ▼
flowIngresarProyecto                                flowProcesarRemito
  │ selección proyecto                                  │ O3 Vision extrae
  ▼                                                     │ si cantidad ambigua → flowConfirmarCantidad
flowProcesarFactura                                     ▼
  │ O3 Vision extrae                                flowRetirarConfirmar
  │ conciliación                                        │ resumen + confirmar
  ▼                                                     │ buildPayload + createSolicitud
flowIngresarConfirmar                                   │ tipo: EGRESO, estado: ENTREGADO
  │ resumen + confirmar                                 │
  │ buildPayload + createSolicitud                      │
  │ tipo: INGRESO, estado: PENDIENTE                    │
  ▼                                                     ▼
  ✅ Ticket creado                                     ✅ Ticket creado
```

### 10.3 Flujo completo: Web IA → ticket

```
Frontend (IngresoFacturaIA)
  │
  ├─ Paso 1: Subir imagen
  │   POST /api/movimientos-materiales/extraer-factura
  │   → 202 { taskId }
  │   → Polling GET /extraer-factura/status/:taskId
  │   → { status: 'completed', data: { materiales, proveedor, ... } }
  │
  ├─ Paso 2: Revisar materiales
  │   POST /api/movimientos-materiales/conciliar-materiales
  │   → { materiales: [{ ...m, id_material, conciliado: true/false }] }
  │   → Usuario revisa, crea materiales inline, sugiere alias
  │
  ├─ Paso 3: Confirmar
  │   POST /api/solicitudes
  │   body: { solicitud: {...}, movimientos: [...] }
  │   → Backend: buildSolicitudCreatePayload → createSolicitud
  │   → Respuesta: { ok, solicitud_id, cantidad_movimientos }
  │
  └─ ✅ Ticket creado (INGRESO → PENDIENTE, EGRESO → ENTREGADO)
```

### 10.4 Entrega parcial

```
Ticket INGRESO en estado PENDIENTE (5 movimientos)
  │
  ├─ Usuario hace clic en 🚚 desde la web
  │
  ├─ Opción A: Entrega Total
  │   POST /api/solicitudes/:id/entregar { entrega_total: true }
  │   → Todos los movimientos → estado: ENTREGADO, cantidad_entregada = cantidad_original
  │   → Solicitud → estado: ENTREGADO
  │
  └─ Opción B: Entrega Parcial
      POST /api/solicitudes/:id/entregar { movimientos: [{ id, cantidad_recibida }] }
      │
      Para cada movimiento:
      │
      ├─ Si cantidad_recibida = cantidad_original
      │   → estado: ENTREGADO
      │
      ├─ Si cantidad_recibida < cantidad_original
      │   │
      │   ├─ Movimiento original:
      │   │   cantidad = cantidad_recibida (con signo)
      │   │   cantidad_entregada = cantidad_recibida
      │   │   estado = ENTREGADO
      │   │
      │   └─ Nuevo movimiento (split):
      │       cantidad = restante (con signo)
      │       estado = PENDIENTE
      │       movimiento_padre_id = ID del original
      │
      └─ Si cantidad_recibida = 0
          → no se toca, sigue PENDIENTE
      │
      ▼
      recalcularEstadoSolicitud()
      │
      ├─ Todos ENTREGADO → Solicitud: ENTREGADO
      ├─ Todos PENDIENTE → Solicitud: PENDIENTE
      └─ Mix → Solicitud: PARCIALMENTE_ENTREGADO
```
