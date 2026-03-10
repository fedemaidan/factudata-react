# Funnel de Conversión — Documento Técnico

> **Fecha**: Marzo 2026  
> **Estado**: Diseño  
> **Dependencias**: MongoDB (ContactoSDR, EventoHistorialSDR), Firestore (empresas, event, movimientos)  
> **Nota**: No confundir con Analytics de Onboarding (`/analyticsOnboarding`) que mide activación post-venta.

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — /funnel                                         │
│  components/funnel/                                         │
│  ├── FunnelPage.js            (página principal, tabs)      │
│  ├── FunnelFilters.js         (filtros compartidos)         │
│  ├── FunnelConversionProducto.js (tab conversión producto)  │
│  ├── FunnelPipelineComercial.js  (tab pipeline comercial)   │
│  ├── FunnelChart.js           (barras horizontales)         │
│  ├── FunnelComparison.js      (vista lado a lado)           │
│  └── FunnelDropoff.js         (tabla de drop-off)           │
│  services/funnelService.js    (API client)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Axios (Bearer token)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend                                                     │
│  routes/funnelRoutes.js                                      │
│  controllers/funnelController.js                             │
│  services/funnelService.js      (orquestador)               │
│  └── consulta MongoDB + Firestore                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API — Endpoints

Base: `/api/funnel`  
Auth: `verifyToken` (Firebase)

### 2.1 Conversión Producto

```
GET /api/funnel/conversion-producto
```

**Query params:**

| Param | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `desde` | ISO date string | ✅ | — | Inicio del rango (createdAt del ContactoSDR) |
| `hasta` | ISO date string | ✅ | — | Fin del rango |
| `segmento` | `inbound` \| `outbound` \| `todos` | — | `inbound` | Filtra por campo `segmento` de ContactoSDR |
| `sdrAsignado` | string (Firebase UID) | — | — | Filtra por SDR (para "Solo mis contactos") |

**Response:**

```json
{
  "cohorte": {
    "desde": "2026-02-01",
    "hasta": "2026-02-28",
    "segmento": "inbound",
    "totalContactos": 247
  },
  "pasos": [
    {
      "id": "contacto_creado",
      "label": "Contacto creado",
      "cantidad": 247,
      "porcentajeBase": 100,
      "porcentajePasoAnterior": 100
    },
    {
      "id": "empresa_creada",
      "label": "Empresa creada",
      "cantidad": 183,
      "porcentajeBase": 74.1,
      "porcentajePasoAnterior": 74.1
    },
    {
      "id": "onboarding_completado",
      "label": "Onboarding completado",
      "cantidad": 152,
      "porcentajeBase": 61.5,
      "porcentajePasoAnterior": 83.1
    },
    {
      "id": "primer_movimiento",
      "label": "Primer movimiento",
      "cantidad": 89,
      "porcentajeBase": 36.0,
      "porcentajePasoAnterior": 58.6
    },
    {
      "id": "vio_caja",
      "label": "Vio su caja",
      "cantidad": 54,
      "porcentajeBase": 21.9,
      "porcentajePasoAnterior": 60.7,
      "nota": "Solo Constructoras",
      "baseEspecifica": {
        "label": "Constructoras con movimiento",
        "cantidad": 61
      }
    }
  ]
}
```

### 2.2 Pipeline Comercial

```
GET /api/funnel/pipeline-comercial
```

**Query params:** Iguales a conversión producto.

**Response:**

```json
{
  "cohorte": {
    "desde": "2026-02-01",
    "hasta": "2026-02-28",
    "segmento": "inbound",
    "totalContactos": 247
  },
  "pasos": [
    { "id": "nuevo", "label": "Nuevo", "cantidad": 247, "porcentajeBase": 100, "porcentajePasoAnterior": 100 },
    { "id": "contactado", "label": "Contactado", "cantidad": 156, "porcentajeBase": 63.2, "porcentajePasoAnterior": 63.2 },
    { "id": "calificado", "label": "Calificado", "cantidad": 89, "porcentajeBase": 36.0, "porcentajePasoAnterior": 57.1 },
    { "id": "cierre", "label": "Cierre", "cantidad": 34, "porcentajeBase": 13.8, "porcentajePasoAnterior": 38.2 },
    { "id": "ganado", "label": "Ganado", "cantidad": 12, "porcentajeBase": 4.9, "porcentajePasoAnterior": 35.3 }
  ],
  "estadosTerminales": [
    { "id": "no_califica", "label": "No califica", "cantidad": 23, "porcentaje": 9.3 },
    { "id": "perdido", "label": "Perdido", "cantidad": 8, "porcentaje": 3.2 },
    { "id": "no_responde", "label": "No responde", "cantidad": 31, "porcentaje": 12.6 },
    { "id": "revisar_mas_adelante", "label": "Revisar más adelante", "cantidad": 12, "porcentaje": 4.9 },
    { "id": "no_contacto", "label": "No contacto", "cantidad": 15, "porcentaje": 6.1 }
  ]
}
```

---

## 3. Lógica del Backend — Conversión Producto

### 3.1 Algoritmo general

```
función calcularFunnelConversionProducto(desde, hasta, segmento, sdrAsignado):

  1. PASO 1 — Contactos creados (MongoDB)
     query ContactoSDR:
       - createdAt >= desde AND createdAt <= hasta
       - empresaId = 'sorby' (tenant fijo)
       - si segmento != 'todos': segmento = segmento
       - si sdrAsignado: sdrAsignado = sdrAsignado
     → contactos[] (guardar ids, teléfonos, empresaFirestoreId)

  2. PASO 2 — Empresa creada (filtro en memoria)
     filtrar contactos donde empresaFirestoreId != null
     → contactosConEmpresa[]

  3. PASO 3 — Onboarding completado (Firestore)
     obtener teléfonos únicos de contactosConEmpresa
     query Firestore colección 'event':
       - where phone IN [teléfonos]  (batches de 30 — límite de Firestore)
       - where event_name == 'fin'
     → telefonosConFin = Set de phones que tienen evento 'fin'
     filtrar contactosConEmpresa donde telefono IN telefonosConFin
     → contactosOnboarded[]

  4. PASO 4 — Primer movimiento (Firestore)
     obtener empresaFirestoreIds únicos de contactosOnboarded
     para cada empresaFirestoreId (batches de 30):
       query Firestore colección 'movimientos':
         - where empresa_id == empresaFirestoreId
         - limit(1)
     → empresasConMovimiento = Set de empresaFirestoreIds con resultado
     filtrar contactosOnboarded donde empresaFirestoreId IN empresasConMovimiento
     → contactosConMovimiento[]

  5. PASO 5 — Vio su caja (Firestore, solo Constructoras)
     obtener empresaFirestoreIds de contactosConMovimiento
     para cada empresaFirestoreId (batches de 30):
       leer documento empresa de Firestore
       - filtrar donde tipo == 'Constructora'
       - de las Constructoras: verificar que 'verSaldoCaja' NO esté en array 'onboarding'
     → constructorasQueVieronCaja
     base_paso5 = constructoras con movimiento (para el %)

  6. Retornar conteos de cada paso
```

### 3.2 Consideraciones de performance

| Paso | Storage | Estimación | Estrategia |
|------|---------|-----------|-----------|
| 1 | MongoDB | ~300/mes → query indexada rápida | Índice: `{ empresaId: 1, createdAt: -1 }` (ya existe) |
| 2 | En memoria | Filtro sobre resultado de paso 1 | Trivial |
| 3 | Firestore | ~300 phones, batches de 30 → ~10 queries | `where('phone', 'in', batch)` — paralelizable con `Promise.all` |
| 4 | Firestore | ~200 empresas, batches de 30 → ~7 queries | `where('empresa_id', '==', id).limit(1)` — pero son N queries individuales. Alternativa: batch por empresa_id `in` |
| 5 | Firestore | ~100 empresas → ~4 reads batch | `getAll()` para leer docs de empresa |

**Total estimado**: ~50-80ms MongoDB + ~200-400ms Firestore ≈ **< 500ms por período**. Para comparación de dos períodos se ejecutan en paralelo → **< 600ms total**.

### 3.3 Optimización: batch de Firestore

Firestore `in` soporta máximo 30 valores. Se necesita un helper:

```javascript
async function queryInBatches(collection, field, values, extraConditions = []) {
  const batches = chunk(values, 30); // chunks de 30
  const results = await Promise.all(
    batches.map(batch => {
      let query = db.collection(collection).where(field, 'in', batch);
      extraConditions.forEach(c => { query = query.where(c.field, c.op, c.value); });
      return query.get();
    })
  );
  return results.flatMap(snap => snap.docs);
}
```

---

## 4. Lógica del Backend — Pipeline Comercial

### 4.1 Algoritmo

```
función calcularFunnelPipelineComercial(desde, hasta, segmento, sdrAsignado):

  1. Obtener contactos de la cohorte (misma query que conversión producto paso 1)
     → contactoIds[]

  2. Query EventoHistorialSDR:
       - contactoId IN contactoIds
       - tipo IN ['cambio_estado', 'estado_cambiado']
     → eventos[]

  3. Para cada contacto, construir set de estados por los que pasó:
     - Del historial: extraer estadoNuevo de cada evento
     - Agregar el estado actual del contacto
     - Inferencia: si estado actual es 'calificado', asumir que pasó por 'nuevo' y 'contactado'

  4. Contar cuántos contactos tienen cada estado en su set:
     - nuevo: todos (= cohorte completa)
     - contactado: los que tienen 'contactado' o superior en su set
     - calificado: los que tienen 'calificado' o superior
     - cierre: los que tienen 'cierre' o superior
     - ganado: los que tienen 'ganado'

  5. Contar estados terminales: agrupar por estado actual
     filtrar los que están en ['no_califica', 'perdido', 'no_responde', 'revisar_mas_adelante', 'no_contacto']
```

### 4.2 Orden jerárquico de estados (para inferencia)

```javascript
const ESTADO_ORDEN = {
  'nuevo': 0,
  'contactado': 1,
  'calificado': 2,
  'cierre': 3,
  'ganado': 4,
};
```

Si un contacto está en estado `calificado` (orden 2) sin historial, se infiere que pasó por todos los de orden ≤ 2.

### 4.3 Performance

Todo está en MongoDB. Con ~300 contactos por cohorte y sus eventos:

- Query 1 (contactos): índice `{ empresaId, createdAt }` → < 50ms
- Query 2 (eventos): índice `{ contactoId, createdAt }` → ~100ms (puede ser más si hay muchos eventos)
- Procesamiento en memoria: trivial

**Total: < 200ms**

---

## 5. Modelos — Sin cambios a modelos existentes

No se requieren nuevos modelos ni campos. Todo se calcula a partir de datos existentes:

| Dato | Fuente | Campo |
|------|--------|-------|
| Contactos de cohorte | MongoDB `ContactoSDR` | `createdAt`, `segmento`, `sdrAsignado`, `empresaFirestoreId`, `telefono` |
| Estados transitados | MongoDB `EventoHistorialSDR` | `contactoId`, `tipo`, `detalles.estadoNuevo` o metadata equivalente |
| Estado actual | MongoDB `ContactoSDR` | `estado` |
| Evento "fin" | Firestore `event` | `phone`, `event_name` |
| Movimientos | Firestore `movimientos` | `empresa_id` |
| Onboarding empresa | Firestore `empresas/{id}` | `onboarding` (array), `tipo` |

---

## 6. Estructura de Archivos

### 6.1 Backend

```
backend/src/
├── routes/funnelRoutes.js              # 2 endpoints GET
├── controller/funnel.controller.js     # Parseo de params, respuesta
└── services/funnelService.js           # Lógica de negocio
    ├── calcularFunnelConversionProducto()
    ├── calcularFunnelPipelineComercial()
    └── helpers:
        ├── getCohorteContactos()       # Query MongoDB paso 1
        ├── getEventosFin()             # Query Firestore evento "fin"
        ├── getEmpresasConMovimiento()  # Query Firestore movimientos
        ├── getEmpresasOnboarding()     # Query Firestore empresa docs
        └── getTransicionesEstado()     # Query MongoDB EventoHistorialSDR
```

### 6.2 Frontend

```
app-web/src/
├── pages/funnel.js                     # Página principal
├── components/funnel/
│   ├── FunnelFilters.js                # Selector de fechas, segmento, vista
│   ├── FunnelConversionProductoTab.js  # Tab conversión producto
│   ├── FunnelPipelineComercialTab.js   # Tab pipeline comercial
│   ├── FunnelBarChart.js               # Barras horizontales reutilizable
│   ├── FunnelComparison.js             # Vista lado a lado (2 períodos)
│   ├── FunnelDropoff.js                # Tabla de drop-off entre pasos
│   └── FunnelTerminalStates.js         # Chips de estados terminales
└── services/funnelService.js           # Axios client
```

### 6.3 Rutas

```javascript
// backend/src/routes/funnelRoutes.js
const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controller/funnel.controller.js');

router.get('/conversion-producto', verifyToken, ctrl.getFunnelConversionProducto);
router.get('/pipeline-comercial', verifyToken, ctrl.getFunnelPipelineComercial);

module.exports = router;

// Montar en app.api.js:
// app.use('/api/funnel', require('./src/routes/funnelRoutes'));
```

---

## 7. Flujo de Datos — Diagrama de Secuencia

```
Frontend                    Backend                     MongoDB              Firestore
   │                           │                           │                     │
   │  GET /funnel/conversion-producto │                           │                     │
   │  {desde, hasta, segmento} │                           │                     │
   │ ─────────────────────────>│                           │                     │
   │                           │  find ContactoSDR         │                     │
   │                           │  (createdAt in range)     │                     │
   │                           │ ─────────────────────────>│                     │
   │                           │  ← contactos[] (id,tel,   │                     │
   │                           │     empresaFirestoreId)   │                     │
   │                           │<──────────────────────────│                     │
   │                           │                           │                     │
   │                           │  Paso 2: filtro en memoria (empresaFirestoreId ≠ null)
   │                           │                           │                     │
   │                           │  query 'event'            │                     │
   │                           │  phone IN [...], name=fin │                     │
   │                           │ ────────────────────────────────────────────────>│
   │                           │  ← phones con evento fin  │                     │
   │                           │<────────────────────────────────────────────────│
   │                           │                           │                     │
   │                           │  query 'movimientos'      │                     │
   │                           │  empresa_id IN [...]      │                     │
   │                           │ ────────────────────────────────────────────────>│
   │                           │  ← empresas con mov       │                     │
   │                           │<────────────────────────────────────────────────│
   │                           │                           │                     │
   │                           │  getAll empresas docs     │                     │
   │                           │  (tipo, onboarding)       │                     │
   │                           │ ────────────────────────────────────────────────>│
   │                           │  ← empresa docs           │                     │
   │                           │<────────────────────────────────────────────────│
   │                           │                           │                     │
   │  ← { pasos: [...] }      │                           │                     │
   │<──────────────────────────│                           │                     │
```

---

## 8. Comparación de Períodos

El frontend hace **2 llamadas en paralelo** (una por período) al mismo endpoint:

```javascript
const [periodoA, periodoB] = await Promise.all([
  funnelService.getConversionProducto({ desde: a.desde, hasta: a.hasta, segmento }),
  periodoB_activo
    ? funnelService.getConversionProducto({ desde: b.desde, hasta: b.hasta, segmento })
    : Promise.resolve(null),
]);
```

El componente `FunnelComparison` recibe ambos resultados y calcula los deltas:

- **Cantidades**: `((cantB - cantA) / cantA) * 100` → variación %
- **Tasas**: `tasaB - tasaA` → diferencia en puntos porcentuales (pp)

---

## 9. Caching (opcional, fase 2)

Con ~300 contactos por mes, el cálculo es rápido (< 600ms). No se necesita caching en fase 1.

Si escala a miles de contactos:
- **Opción A**: Cache en Redis con TTL de 5 minutos por combinación `{desde, hasta, segmento}`
- **Opción B**: Denormalizar en ContactoSDR campos `tieneEmpresaFirestore`, `completoOnboarding`, `tieneMovimientos`, `vioCaja` que se actualicen via hooks. Esto eliminaría consultas a Firestore.

---

## 10. Testing

### 10.1 Unit tests (backend)

| Test | Qué valida |
|------|-----------|
| `funnelService.calcularFunnelConversionProducto` con mocks | Que los conteos sean secuencialmente decrecientes |
| Paso 5 sin Constructoras | Que retorne `cantidad: 0` con nota explicativa |
| Batch helper con > 30 items | Que se particione correctamente |
| Inferencia de estados comerciales | Que `calificado` cuente para `contactado` y `nuevo` |

### 10.2 Integration tests

| Test | Qué valida |
|------|-----------|
| Crear 5 ContactoSDR con distintos niveles de avance | Que el funnel cuente correctamente cada paso |
| Filtro por segmento | Que `inbound` no incluya `outbound` |
| Rango de fechas | Que contactos fuera del rango no se cuenten |

---

## 11. Estimación de Esfuerzo

| Componente | Estimación |
|-----------|-----------|
| **Backend**: rutas + controller + service (conversión producto) | 4-6h |
| **Backend**: service (pipeline comercial) | 2-3h |
| **Frontend**: página + filtros + tabs | 3-4h |
| **Frontend**: FunnelBarChart + comparación | 4-5h |
| **Frontend**: estados terminales + drop-off | 2-3h |
| **Tests** | 3-4h |
| **Total** | ~18-25h |
