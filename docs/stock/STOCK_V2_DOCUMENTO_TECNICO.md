# Módulo de Materiales — Documento Técnico v3

> **Fecha**: 26/02/2026  
> **Estado**: Borrador para validación  
> **Audiencia**: Equipo de desarrollo  
> **Cambios v3**: Se agregan Capa 0 (puente Caja → Stock/Acopio) y plan de deprecación de Stock V1

---

## 1. Estado actual de la arquitectura

### Subsistemas coexistentes

| Subsistema | Base de datos | Colecciones | Estado |
|---|---|---|---|
| **Stock V2** (principal) | MongoDB/Mongoose | `materials`, `movimientomaterials`, `solicituds` | ✅ Activo |
| **Stock V1** (legacy) | Firestore | `movimientos_materiales` (subcollection de empresas) | 🔴 **A deprecar** — se elimina UI y escrituras |
| **Inventario** (paralelo) | MongoDB | `inventarioproductos`, `inventariomovimientos` | ❓ Evaluar deprecación |
| **Acopio** | Firestore | `acopios` → `compras` → `movimientos_materiales` / `remitos` → `movimientos_materiales` | ✅ Activo |

### Problema central

Stock V2 y Acopio son **módulos completamente aislados**:
- No comparten catálogo de materiales
- No comparten movimientos
- Un desacopio no impacta en stock
- No existe una vista consolidada por obra
- Usan bases de datos diferentes (MongoDB vs Firestore)

### Modelo de datos actual relevante

**Material (Stock V2 — MongoDB)**
```
{
  nombre: String (unique por empresa),
  SKU: String,
  alias: [String],
  empresa_id: String,
  categoria: String,
  subcategoria: String,
  precio_unitario: Number,        // ← precio de referencia vivo
  fecha_precio: Date,
  desc_material: String
}
```

**MovimientoMaterial (Stock V2 — MongoDB)**
```
{
  empresa_id, usuario_id, usuario_mail,
  id_material: String,             // FK a Material._id
  nombre_item: String,             // nombre original (factura/remito)
  nombre_material: String,         // nombre conciliado
  cantidad: Number,                // +ingreso / -egreso
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'AJUSTE',
  subtipo: String,
  estado: 'PENDIENTE' | 'PARCIALMENTE_ENTREGADO' | 'ENTREGADO',
  cantidad_original: Number,
  cantidad_entregada: Number,
  solicitud_id: ObjectId,
  proyecto_id: String,
  proyecto_nombre: String,
  fecha_movimiento: Date
}
```

**Solicitud (Stock V2 — MongoDB)**
```
{
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA' | 'AJUSTE',
  subtipo: String,
  empresa_id: String,
  estado: 'PENDIENTE' | 'PARCIALMENTE_ENTREGADO' | 'ENTREGADO',
  proveedor: { id, nombre, cuit },
  proyecto_id: String,
  proyecto_nombre: String,
  documentos: [String],
  fecha: Date
}
```

**Acopio (Firestore)**
```
acopios/{acopioId}
  ├── empresa_id, proveedor, proyecto_id, codigo, tipo, estado
  ├── valor_acopio: Number       // Σ compras
  ├── valor_desacopio: Number    // Σ remitos
  ├── compras/{compraId}
  │     └── movimientos_materiales/{movId}
  │           └── { codigo, descripcion, cantidad, precio_unitario, tipo: 'acopio' }
  └── remitos/{remitoId}
        └── movimientos_materiales/{movId}
              └── { codigo, descripcion, cantidad, precio_unitario, tipo: 'desacopio' }
```

---

## 2. Cambios propuestos

### Principio de diseño: No reescribir, conectar. Limpiar lo que sobra.

No se migran datos ni se cambian los módulos activos. Se agregan conexiones y se depreca lo obsoleto:
0. Un **puente Caja → Stock/Acopio** (Capa 0) — punto de entrada desde facturas
1. Un **endpoint agregador** (Capa 1) — vista unificada por obra
2. Extensiones al **modelo de Solicitud** (Capa 2) — destino por línea
3. Un **hook post-desacopio** (Capa 3) — puente Acopio → Stock
4. **Deprecación de Stock V1** — eliminar UI, escrituras y sincronización legacy

---

### CAPA 0 — Puente Caja → Stock / Acopio

#### Objetivo
Cuando un movimiento financiero de caja tiene materiales extraídos por IA, permitir al usuario derivarlos a Stock V2 (depósito u obra) o a Acopio (proveedor), generando las solicitudes/compras correspondientes.

#### Contexto del problema
Hoy en `movementForm.js`, cuando se confirma una factura de compra:
- `formik.values.materiales[]` contiene los materiales extraídos por IA
- La función `reconcileMmFromMateriales()` sincroniza estos materiales con `movimientos_materiales` en Firestore (Stock V1 legacy)
- Esos movimientos legacy no impactan en Stock V2 ni en Acopio
- El usuario ve los materiales pero no puede hacer nada útil con ellos

#### Flujo propuesto

```
Usuario confirma factura en caja
  │
  ├─ formik.values.materiales[] tiene N materiales extraídos
  │
  ├─ Se muestra bloque de acciones:
  │   ├─ 🏭 "Enviar a depósito" → Crear Solicitud Stock V2 (INGRESO, sin proyecto)
  │   ├─ 🏗️ "Enviar a obra"     → Crear Solicitud Stock V2 (INGRESO, con proyecto)
  │   ├─ 📦 "Crear acopio"      → Crear Acopio + Compra en Firestore
  │   ├─ 🔀 "Distribuir"        → Modal por línea con destino individual
  │   └─ ❌ "No hacer nada"     → Comportamiento actual (no genera nada)
  │
  └─ Referencia cruzada:
      ├─ En Solicitud/Acopio: origen_movimiento_caja_id = movimientoId
      └─ En Movimiento de caja: solicitud_stock_id | acopio_id (para no ofrecer de nuevo)
```

#### Lógica de negocio

**Acción: Enviar a depósito**
```
1. Conciliar materiales con catálogo Stock V2 (reutilizar conciliarMateriales())
2. Crear Material si no existe
3. Crear Solicitud tipo=INGRESO, subtipo='COMPRA', estado='ENTREGADO'
4. Crear N MovimientoMaterial (uno por material, cantidad positiva, sin proyecto)
5. Guardar referencia: solicitud.origen_movimiento_caja_id = movimientoId
6. Actualizar movimiento de caja: solicitud_stock_id = solicitud._id
```

**Acción: Enviar a obra**
```
Igual que depósito, pero:
- Solicitud.proyecto_id = proyecto seleccionado
- Cada movimiento.proyecto_id = proyecto seleccionado
```

**Acción: Crear acopio**
```
1. Crear Acopio en Firestore con proveedor de la factura
2. Crear Compra con movimientos tipo 'acopio'
3. Calcular valor_acopio
4. Actualizar movimiento de caja: acopio_id = acopioId
```

**Acción: Distribuir**
```
Por cada línea, el usuario elige destino → se ejecuta la lógica correspondiente
Puede generar Solicitud + Acopio en la misma operación
```

#### Prevención de duplicación
Una vez que el movimiento de caja tiene `solicitud_stock_id` o `acopio_id`:
- No se muestran las acciones de nuevo
- Se muestra un link: "📦 Ver solicitud de stock" o "📦 Ver acopio"
- Opción de deshacer: elimina la solicitud/acopio y limpia la referencia

#### Reemplazo de Stock V1 legacy
Esta capa **reemplaza** la funcionalidad de `reconcileMmFromMateriales()` que hoy escribe en Firestore (Stock V1). El código de sincronización legacy se elimina (ver sección Deprecación).

#### Archivos a crear/modificar
| Archivo | Cambio |
|---|---|
| `app-web/src/pages/movementForm.js` | Reemplazar sección MM legacy por bloque de acciones |
| `app-web/src/components/stock/MaterialesFacturaActions.js` | **Nuevo** — componente con las 5 opciones |
| `src/routes/solicitudMovimientoMaterialesRoutes.js` | Nuevo endpoint: crear solicitud desde caja |
| `src/controllers/stock/solicitudController.js` | Nuevo handler: `createFromCaja` |
| `src/services/stock/solicitudService.js` | Lógica de creación con referencia a caja |
| `src/routes/acopioRoutes.js` | Nuevo endpoint: crear acopio desde caja |
| Modelo `MovimientoMaterial` | Agregar campo `origen_movimiento_caja_id` |
| Modelo `Solicitud` | Agregar campo `origen_movimiento_caja_id` |

---

### CAPA 1 — Vista unificada de materiales por obra

#### Objetivo
Un endpoint que agregue movimientos de Stock V2 + movimientos de Acopio para una obra/proyecto, normalizados en un formato común.

#### Endpoint propuesto

```
GET /api/materiales/vista-obra/:proyectoId
Query params: ?empresa_id=xxx
```

#### Lógica

```
1. Traer movimientos de Stock V2 (MongoDB)
   → MovimientoMaterial.find({ proyecto_id, empresa_id })
   → Populate id_material para obtener precio_unitario actual

2. Traer movimientos de Acopio (Firestore)
   → Buscar acopios donde proyecto_id = proyectoId
   → Para cada acopio, traer remitos y sus movimientos_materiales
   → Filtrar tipo = 'desacopio'
   → Intentar match con catálogo de materiales de Stock V2 por codigo/nombre/alias

3. Normalizar ambos en formato común:
   {
     material_id: String | null,
     nombre: String,
     cantidad: Number,
     precio_unitario_actual: Number | null,
     subtotal: Number | null,         // cantidad × precio_unitario_actual
     origen: 'stock' | 'acopio',
     origen_detalle: String,          // "Depósito" | "Acopio Cerámicos Norte"
     acopio_id: String | null,
     remito_id: String | null,
     solicitud_id: String | null,
     fecha: Date,
     estado: String
   }

4. Agregar totales:
   {
     items: [...],
     total_valorizado: Number,        // Σ subtotales (solo donde hay precio)
     items_sin_precio: Number,        // count donde precio = null
     items_pendientes: Number,        // count donde estado = PENDIENTE
     cantidad_pendiente_total: Number  // Σ cantidades pendientes
   }
```

#### Consideraciones
- Los materiales de acopio usan `codigo`+`descripcion`, no `id_material`. Se necesita un **best-effort match** contra el catálogo de Stock V2 por nombre/alias para obtener el precio actual.
- Si no hay match, el material aparece con `precio_unitario_actual: null` y se marca como "sin precio".
- Este endpoint es **read-only**, no modifica datos.

#### Archivos a crear/modificar
| Archivo | Cambio |
|---|---|
| `src/services/stock/vistaObraService.js` | **Nuevo** — lógica de agregación |
| `src/controllers/stock/vistaObraController.js` | **Nuevo** — handler del endpoint |
| `src/routes/vistaObraRoutes.js` | **Nuevo** — ruta GET |
| `app.api.js` | Registrar nueva ruta |
| `app-web/src/pages/` | Nueva página o sección en proyecto existente |

#### Integración WhatsApp
- Agregar intent en `acciones.js`: `VER_MATERIALES_OBRA`
- Nuevo flow `flowVerMaterialesObra.js` que consuma el mismo endpoint
- Formato de mensaje:
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

---

### CAPA 2 — Solicitud con distribución flexible (destino por línea)

#### Objetivo
Permitir que una solicitud de compra distribuya cada línea de material a un destino diferente (obra, depósito, acopio/proveedor).

#### Cambios en el modelo MovimientoMaterial

```javascript
// Campos nuevos en el schema de MovimientoMaterial
{
  // ... campos existentes ...
  
  destino: {
    type: String,
    enum: ['deposito', 'obra', 'acopio'],
    default: 'deposito'
  },
  destino_proyecto_id: String,      // si destino = 'obra'
  destino_proyecto_nombre: String,
  destino_acopio_id: String,        // si destino = 'acopio'
  destino_acopio_codigo: String,
  origen_acopio_id: String,         // si viene de un desacopio (Capa 3)
  origen_remito_id: String
}
```

#### Lógica de negocio en `solicitudService.js`

Al crear una solicitud con movimientos:

```
Para cada movimiento:
  SI destino = 'deposito':
    → Comportamiento actual (ingreso a stock sin proyecto)
    → proyecto_id = null
  
  SI destino = 'obra':
    → Ingreso a stock vinculado a la obra
    → proyecto_id = destino_proyecto_id
    → (funciona igual que hoy, solo que el UI permite elegir)
  
  SI destino = 'acopio':
    → Crear/actualizar acopio en Firestore
    → Crear compra en el acopio con los materiales correspondientes
    → NO crear movimiento en Stock V2 (vive solo en acopio)
    → Registrar destino_acopio_id en el movimiento como referencia
```

#### Impacto en frontend (`stockSolicitudes.js`)

En el modal de crear solicitud, agregar por cada línea de movimiento:
- Selector de destino: `Depósito` | `Obra (seleccionar)` | `Proveedor/Acopio (seleccionar)`
- Si elige "Obra" → autocomplete de proyectos
- Si elige "Acopio" → autocomplete de acopios existentes o crear nuevo

#### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `src/models/MovimientoMaterial.js` | Agregar campos `destino*`, `origen_acopio*` |
| `src/services/stock/solicitudService.js` | Lógica de distribución por destino |
| `src/controllers/stock/solicitudController.js` | Validación de destinos |
| `app-web/src/pages/stockSolicitudes.js` | UI de selección de destino por línea |

---

### CAPA 3 — Hook post-desacopio (puente Acopio → Stock)

#### Objetivo
Cuando se confirma un remito de desacopio en el módulo de Acopio, permitir al usuario elegir destino y generar automáticamente los movimientos correspondientes en Stock V2.

#### Flujo

```
Usuario confirma remito de desacopio
  │
  ├─ UI/WhatsApp pregunta: "¿A dónde van estos materiales?"
  │   ├─ "Obra X"
  │   ├─ "Depósito"
  │   └─ "Mixto" (N líneas, cada una con destino)
  │
  ├─ Se ejecuta lógica actual de desacopio en Acopio (Firestore)
  │   └─ Recalcula valor_desacopio ✅
  │
  └─ Hook post-desacopio:
      ├─ Para cada material del remito:
      │   ├─ Buscar match en catálogo de Stock V2 (por nombre/codigo/alias)
      │   ├─ Si no existe → crear Material en Stock V2
      │   └─ Crear MovimientoMaterial en Stock V2:
      │       tipo: 'INGRESO'
      │       subtipo: 'DESACOPIO'
      │       origen_acopio_id: acopioId
      │       origen_remito_id: remitoId
      │       destino: 'obra' | 'deposito'
      │       proyecto_id: (si destino = obra)
      │       estado: 'ENTREGADO'
      │
      └─ Opcionalmente crear Solicitud en Stock V2 para agrupar
         los movimientos (trazabilidad completa)
```

#### Conciliación de catálogos

El punto crítico es vincular los materiales de Acopio (Firestore, `codigo`+`descripcion`) con los de Stock V2 (MongoDB, `nombre`+`SKU`+`alias`).

Estrategia de match:
```
1. Match exacto por nombre
2. Match por alias (el nombre del acopio está en los alias del material)
3. Match fuzzy (distancia Levenshtein < umbral)
4. Si no hay match → crear material nuevo en Stock V2
5. Preguntar al usuario para confirmar matches dudosos
```

Podemos reutilizar la lógica existente de `conciliarMateriales` en `solicitudController.js` que ya hace algo similar para facturas extraídas con IA.

#### Archivos a crear/modificar
| Archivo | Cambio |
|---|---|
| `src/services/acopio/desacopioHookService.js` | **Nuevo** — lógica del puente |
| `src/services/acopio/acopioService.js` | Invocar hook después de crear remito |
| `src/routes/acopioRoutes.js` | Agregar parámetros de destino al endpoint de remito |
| `app-web/src/pages/movimientosAcopio.js` | UI de selección de destino al confirmar remito |
| Flows WhatsApp de desacopio | Agregar paso de "¿a dónde va?" |

---

## 3. Modelo de precios

### Principio: precio siempre vivo, nunca congelado

```
Costo de obra = Σ (cantidad_movimiento × material.precio_unitario_ACTUAL)
```

- El movimiento **NO almacena precio**. Solo cantidad + referencia al material.
- El precio vive exclusivamente en `Material.precio_unitario`.
- Actualizar un precio → todos los reportes se recalculan automáticamente.
- Si `precio_unitario = null` → el material se marca como "sin precio" en reportes.

### Indicador de precio stale

Ya existe en el frontend (`stockMateriales.js`, constante `STALE_DAYS = 30`). Extender esta lógica a la vista unificada de obra.

### Implicancia para Acopio

Los materiales de acopio tienen su propio `precio_unitario` (en Firestore). Para la vista unificada:
- Si el material está conciliado con Stock V2 → usar `Material.precio_unitario` (MongoDB)
- Si no está conciliado → usar `precio_unitario` del acopio como fallback
- Mostrar indicador de "precio de acopio, puede diferir del actual"

---

## 4. Deprecación de Stock V1 (legacy Firestore)

### ¿Qué es Stock V1?
Sistema anterior de movimientos de materiales que vive en Firestore como subcollection `movimientos_materiales` dentro de cada empresa. Usa campos `descripcion`, `tipo: 'entrada'|'salida'`, `validado`, `asignado_estado`.

### ¿Por qué se depreca?
- Modelo de datos incompatible con Stock V2 (diferentes campos, diferentes tipos, diferente BD)
- La UI (`movimientosMateriales.js`) muestra datos que no reflejan la realidad del stock actual
- La sincronización en `movementForm.js` (`reconcileMmFromMateriales`) escribe en Firestore pero esos datos no se consumen en ningún reporte útil
- Genera confusión: el usuario ve dos sistemas de materiales que no coinciden

### Plan de deprecación

#### Paso 1: Auditoría de datos (pre-implementación)
```
- Contar documentos en movimientos_materiales por empresa en Firestore
- Contar asignaciones_materiales (MongoDB) que referencian movimiento_material_id de V1
- Determinar si hay datos activos que requieran migración o solo históricos
```

#### Paso 2: Congelar escrituras
- Eliminar `reconcileMmFromMateriales()` de `movementForm.js`
- Eliminar los endpoints de escritura del controlador legacy `movimientosMaterialesController.js` (Firestore)
- Mantener endpoints de lectura temporalmente (para no romper links existentes)

#### Paso 3: Reemplazar UI
- Eliminar la página `movimientosMateriales.js` del frontend (o redirigir a `stockMovimientos.js`)
- En `movementForm.js`: reemplazar la sección "MM" (tabla de materiales abajo) por el nuevo componente `MaterialesFacturaActions` (Capa 0)
- Eliminar el tab/sección de "Alta rápida MM" y "Asignar" vinculado a V1

#### Paso 4: Migración de asignaciones (si aplica)
- Si existen `AsignacionMaterial` que referencian movimientos V1:
  - Opción A: Migrar las asignaciones para que apunten a movimientos de Stock V2
  - Opción B: Dejar como histórico read-only con indicador "(legacy)"

#### Paso 5: Limpieza de código backend
| Archivo | Acción |
|---|---|
| `src/controllers/stock/movimientosMaterialesController.js` (Firestore) | Eliminar o marcar deprecated |
| `src/services/stock/movimientosMaterialesService.js` (Firestore) | Eliminar o marcar deprecated |
| `src/repositories/movimientosMaterialesRepository.js` (Firestore) | Eliminar o marcar deprecated |
| `src/services/syncMovimientosMaterialesService.js` | Eliminar |
| `src/routes/` ruta que monta el controlador legacy | Eliminar |
| `app-web/src/pages/movimientosMateriales.js` | Eliminar |
| `app-web/src/services/movimientoMaterialService.js` (si es el client del legacy) | Eliminar |

### Datos en Firestore
Los documentos en `movimientos_materiales` de Firestore **no se eliminan**. Quedan como histórico. Solo se deja de escribir y de mostrar en UI.

---

## 5. Orden de implementación sugerido

### Fase 0 — Puente Caja → Stock/Acopio (Capa 0) + Deprecación V1 — ~1-2 semanas
- **Mayor impacto inmediato**: resuelve el problema de Andrés ("cargo factura y no pasa nada")
- Reemplaza la funcionalidad legacy de MM en movementForm.js
- Se hace junto con la deprecación porque tocan los mismos archivos
- Incluye: nuevo componente de acciones, endpoints de creación desde caja, limpieza de código V1

### Fase 1 — Vista unificada (Capa 1) — ~1 semana
- Máximo valor con mínimo riesgo
- Solo lectura, no modifica datos existentes
- El cliente ya puede ver "cuánto gasté en materiales por obra"
- Complementa Fase 0: ahora los materiales que se enviaron a obra desde caja se ven en la vista unificada

### Fase 2 — Hook post-desacopio (Capa 3) — ~1 semana
- Conecta los dos mundos
- Resuelve el dolor de Carranza directamente
- Depende de Fase 1 para que el resultado sea visible

### Fase 3 — Solicitud flexible (Capa 2) — ~1-2 semanas
- Más cambios de UI
- Requiere modificar modelos existentes
- Habilita el caso de compra con distribución múltiple

### Fase 4 — Integración WhatsApp — ~1 semana
- Flow de "ver materiales obra"
- Destino en desacopio desde WhatsApp
- Depende de Fases 1-3

---

## 6. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Conciliación de catálogos falla (Acopio usa nombres diferentes a Stock) | Materiales duplicados, precios incorrectos en vista unificada | Reutilizar lógica de conciliación existente + match por alias + confirmación manual |
| Performance de la vista unificada (consulta MongoDB + Firestore) | Lentitud en obras con muchos movimientos | Cache con TTL corto (5 min) + paginación |
| Desacopio genera movimientos fantasma en Stock | Confusión del usuario que ve movimientos que "no hizo" | Subtipo 'DESACOPIO' claramente identificado + indicador visual "Origen: Acopio X" |
| Precio null en materiales nuevos creados desde acopio | Costo de obra incompleto | Alerta visual "X materiales sin precio" + prompt para completar |
| Duplicación de stock desde caja (usuario genera solicitud 2 veces) | Stock inflado | Referencia cruzada `solicitud_stock_id` / `acopio_id` en movimiento de caja. Si ya tiene, no ofrece de nuevo |
| Deprecación de V1 rompe asignaciones existentes | Usuarios que usaron asignaciones a plan de obra pierden data | Auditoría previa de `AsignacionMaterial` + migración o congelamiento como histórico |
| Usuarios acostumbrados a la UI vieja se confunden | Resistencia al cambio | La UI nueva ofrece estrictamente más funcionalidad. Comunicar el cambio con anticipación |

---

## 7. Diagrama de arquitectura propuesta

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                            │
├──────────┬──────────┬──────────┬───────────┬─────────────────────────┤
│ Stock    │ Acopio   │ NUEVA:   │Solicitud  │ NUEVA:                  │
│ Material │ Movimien │ Vista    │(destino   │ Acciones de materiales  │
│ Movimien │ Remitos  │ Obra     │ por línea)│ en factura de caja      │
│ Solicitu │ Compras  │ Unificad │           │ (reemplaza MM legacy)   │
└────┬─────┴────┬─────┴────┬─────┴─────┬─────┴──────────┬─────────────┘
     │          │          │           │                │
     ▼          ▼          ▼           ▼                ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────────────┐
│Stock V2 │ │Acopio  │ │Vista   │ │Solicitu │ │Puente Caja→Stock │
│API      │ │API     │ │Obra API│ │API      │ │(Capa 0)          │
│(MongoDB)│ │(Firest)│ │(agreg.)│ │(MongoDB)│ │                  │
└────┬────┘ └───┬────┘ └───┬────┘ └────┬────┘ └────────┬─────────┘
     │          │          │           │                │
     │          │   ┌──────┴───────┐   │          ┌─────▼──────┐
     │          │   │Lee de ambos  │   │          │Genera      │
     │          │   │MongoDB+Fires │   │          │Solicitud o │
     │          │   └──────────────┘   │          │Acopio      │
     │          │                      │          └──┬────┬────┘
     │    ┌─────▼──────┐               │             │    │
     │    │Hook post-  │               │             │    │
     │    │desacopio   │───Crea mov───►│             │    │
     │    └────────────┘  en Stock V2  │             │    │
     │                                 │             │    │
┌────▼─────────────────────────────────▼─────────────▼────┘
│                     MongoDB                              │
│  materials | movimientomaterials | solicituds             │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│                     Firestore                            │
│  acopios → compras → movimientos_materiales              │
│          → remitos → movimientos_materiales              │
│                                                          │
│  ██████████████████████████████████████████████████████   │
│  █ movimientos_materiales (Stock V1) — DEPRECADO ██████  │
│  ██████████████████████████████████████████████████████   │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Decisiones pendientes

1. **¿Deprecar módulo de Inventario?** (`inventarioproductos` / `inventariomovimientos` en MongoDB) — ¿Lo usa algún cliente activamente? Si no, conviene eliminarlo para reducir confusión.

2. **¿Migración futura de Acopio a MongoDB?** — El puente (Capa 3) funciona bien a mediano plazo, pero a largo plazo tener dos BDs para datos relacionados genera fricción. Evaluar migración gradual post-implementación.

3. **¿Catálogo compartido?** — ¿Queremos que los materiales de acopio eventualmente sean los mismos `Material` de Stock V2? Esto simplificaría la conciliación pero requiere un proceso de migración de datos.

## Decisiones tomadas

- ✅ **Stock V1 (legacy Firestore) se depreca** — Se elimina UI y escrituras. Datos quedan como histórico. Se reemplaza por Capa 0 (puente Caja → Stock/Acopio). Ver sección 4.
- ✅ **Precio siempre vivo** — No se congela precio al movimiento. El costo se calcula con `Material.precio_unitario` actual. Ver sección 3.
