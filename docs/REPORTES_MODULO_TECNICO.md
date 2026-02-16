# Módulo de Reportes — Documento Técnico

> Fecha: Febrero 2026  
> Estado: Diseño — Pre-implementación  
> Autores: Equipo Sorby

---

## 1. Decisión de Arquitectura: Frontend-First

### ¿Por qué el cómputo vive en el frontend?

| Factor | Decisión |
|--------|----------|
| **Backend single-process** | El backend Node.js corre en un solo proceso. Agregar cómputo pesado de reportes puede bloquear requests de otros usuarios (carga de movimientos, WhatsApp bot, etc.) |
| **Firestore no soporta agregaciones** | No hay `GROUP BY`, `SUM`, `AVG` nativos. Cualquier agregación requiere traer documentos y computar en memoria |
| **Volumen de datos manejable** | ~3.000 movimientos máx por empresa. En un browser moderno, agregar 3.000 objetos toma <100ms |
| **Equipo** | La persona que va a desarrollar el módulo (Milagros) trabaja en frontend. Minimizar dependencia del backend acelera el desarrollo |
| **Iteración rápida** | Cambiar lógica de agregación en frontend = hot reload. En backend = restart + redeploy |

### Qué vive en cada capa

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                           │
│                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ Report       │   │ Report       │   │ Report    │ │
│  │ Config CRUD  │   │ Engine       │   │ Renderer  │ │
│  │ (fetch/save) │   │ (compute)    │   │ (React)   │ │
│  └──────┬───────┘   └──────┬───────┘   └─────┬─────┘ │
│         │                  │                  │       │
│         │    ┌─────────────┤                  │       │
│         │    │ Data Fetcher│                  │       │
│         │    │ (movimientos│                  │       │
│         │    │ presupuestos│                  │       │
│         │    │ cotizaciones│                  │       │
│         │    └──────┬──────┘                  │       │
└─────────┼───────────┼─────────────────────────┼───────┘
          │           │                         │
          ▼           ▼                         │
┌─────────────────────────────────────┐         │
│              BACKEND                │         │
│                                     │         │
│  ┌────────────┐  ┌───────────────┐  │         │
│  │ Reports    │  │ Firestore     │  │         │
│  │ CRUD API   │  │ (movimientos, │  │         │
│  │ (MongoDB)  │  │ presupuestos) │  │         │
│  └────────────┘  └───────────────┘  │         │
└─────────────────────────────────────┘         │
                                                │
                                    ┌───────────▼────┐
                                    │   Browser UI   │
                                    │ (tablas, cards, │
                                    │  export XLSX)   │
                                    └────────────────┘
```

### Resumen de responsabilidades

| Capa | Responsabilidad |
|------|----------------|
| **Backend (MongoDB)** | CRUD de configuraciones de reportes. Persistencia, listado, duplicación. Nada de cómputo |
| **Backend (Firestore)** | Fuente de datos: movimientos y presupuestos. Endpoints existentes, sin cambios |
| **Frontend — Data Fetcher** | Trae movimientos, presupuestos y cotizaciones usando servicios existentes |
| **Frontend — Report Engine** | Aplica filtros, convierte monedas, computa métricas, agrupa, ordena. Puro JS, sin React |
| **Frontend — Report Renderer** | Componentes React que consumen el output del engine y renderizan bloques |

---

## 2. Modelo de Datos — Report Config (MongoDB)

### Colección: `reports`

```javascript
{
  _id: ObjectId,
  empresa_id: String,           // required, indexed
  
  // ── Meta ──
  nombre: String,               // "Estado de Obra - Torre Norte"
  descripcion: String,          // Texto libre
  tags: [String],               // ["obra", "mensual", "materiales"]
  es_template: Boolean,         // true = plantilla pre-armada, no editable por usuario
  template_origen: String,      // ID del template del que se creó (null si es original)
  
  // ── Estado ──
  status: String,               // 'draft' | 'published'
  owner_user_id: String,        // UID del creador
  
  // ── Dataset ──
  // Qué datos consume este reporte
  datasets: {
    movimientos: Boolean,       // default true — trae movimientos de caja
    presupuestos: Boolean,      // default false — trae presupuestos de control
  },
  
  // ── Moneda de visualización ──
  // Concepto central: en qué moneda se muestra TODO el reporte
  display_currency: String,     // 'ARS' | 'USD' | 'CAC' | 'original'
                                // 'original' = cada ítem en su moneda nativa
  
  // ── Filtros globales ──
  // Define qué filtros están disponibles y sus defaults
  filtros_schema: {
    fecha: {
      enabled: true,            // siempre true, no se puede desactivar
      default_range: String,    // 'last_30_days' | 'current_month' | 'last_month' | 'current_year' | 'custom'
      default_from: Date,       // solo si default_range = 'custom'
      default_to: Date,
    },
    proyectos: {
      enabled: Boolean,
      default_ids: [String],    // IDs de proyectos pre-seleccionados (multi-select)
    },
    tipo: {                     // egreso | ingreso
      enabled: Boolean,
      default_value: String,    // null = ambos
    },
    categorias: {
      enabled: Boolean,
      default_values: [String],
    },
    proveedores: {
      enabled: Boolean,
      default_values: [String],
    },
    etapas: {
      enabled: Boolean,
      default_values: [String],
    },
    medio_pago: {
      enabled: Boolean,
      default_values: [String],
    },
    moneda_movimiento: {        // filtrar por moneda original del movimiento
      enabled: Boolean,
      default_value: String,    // 'ARS' | 'USD' | null (todas)
    },
  },
  
  // ── Layout: bloques del reporte ──
  // Array ordenado de bloques que se renderizan de arriba a abajo
  layout: [
    // Cada bloque es un objeto con type + config
    // Ver sección "Tipos de Bloques" abajo
  ],
  
  // ── Timestamps ──
  createdAt: Date,
  updatedAt: Date,
}
```

### Índices recomendados

```javascript
{ empresa_id: 1, updatedAt: -1 }   // Listado por empresa, más reciente primero
{ empresa_id: 1, status: 1 }       // Filtrar por publicados
{ empresa_id: 1, es_template: 1 }  // Listar templates
```

---

## 3. Tipos de Bloques (layout[])

### 3.1 `metric_cards` — Tarjetas de métricas

```javascript
{
  type: 'metric_cards',
  titulo: String,               // "Resumen General" (opcional)
  metricas: [
    {
      id: String,               // UUID para referenciar
      titulo: String,           // "Total Egresos"
      dataset: String,          // 'movimientos' | 'presupuestos'
      operacion: String,        // 'sum' | 'count' | 'avg' | 'min' | 'max'
      campo: String,            // 'total' | 'subtotal' (para movimientos)
                                // 'monto' | 'ejecutado' | 'disponible' (para presupuestos)
      filtro_tipo: String,      // 'egreso' | 'ingreso' | null (hereda del global)
      filtros_extra: {          // Filtros ADICIONALES al global (se intersectan)
        categorias: [String],
        proveedores: [String],
        etapas: [String],
      },
      formato: String,          // 'currency' | 'number' | 'percentage'
      color: String,            // 'default' | 'success' | 'error' | 'warning' | 'info'
    }
  ],
}
```

**Output del engine:**
```javascript
{
  type: 'metric_cards',
  titulo: "Resumen General",
  resultados: [
    { id: "xxx", titulo: "Total Egresos", valor: 15000000, formato: "currency", color: "error" },
    { id: "yyy", titulo: "Total Ingresos", valor: 22000000, formato: "currency", color: "success" },
    { id: "zzz", titulo: "Movimientos", valor: 342, formato: "number", color: "default" },
  ]
}
```

### 3.2 `summary_table` — Tabla resumen agrupada

```javascript
{
  type: 'summary_table',
  titulo: String,               // "Desglose por Categoría"
  dataset: String,              // 'movimientos' | 'presupuestos'
  agrupar_por: String,          // 'categoria' | 'proveedor' | 'etapa' | 'proyecto' | 'mes' | 'moneda_original'
  columnas: [
    {
      id: String,
      titulo: String,           // "Total Gastado"
      operacion: String,        // 'sum' | 'count' | 'avg'
      campo: String,            // 'total' | 'subtotal' | 'monto' | 'ejecutado'
      formato: String,          // 'currency' | 'number' | 'percentage'
    }
  ],
  mostrar_porcentaje: Boolean,  // Columna "% del Total"
  orden: {
    campo: String,              // ID de la columna o '_grupo'
    direccion: String,          // 'asc' | 'desc'
  },
  top_n: Number,                // null = mostrar todo, N = top N + "Otros"
  mostrar_total: Boolean,       // Fila de totales al final
  filtro_tipo: String,          // 'egreso' | 'ingreso' | null
  filtros_extra: {},            // Igual que en métricas
}
```

**Output del engine:**
```javascript
{
  type: 'summary_table',
  titulo: "Desglose por Categoría",
  columnas: ["Categoría", "Total Gastado", "Cantidad", "% del Total"],
  filas: [
    { grupo: "Materiales", valores: [5200000, 45, 34.7] },
    { grupo: "Mano de Obra", valores: [8100000, 22, 54.0] },
    { grupo: "Otros", valores: [1700000, 18, 11.3] },
  ],
  totales: [15000000, 85, 100],
}
```

### 3.3 `movements_table` — Tabla de movimientos (detalle)

```javascript
{
  type: 'movements_table',
  titulo: String,               // "Detalle de Movimientos"
  columnas_visibles: [String],  // ['fecha_factura', 'proveedor', 'categoria', 'observacion', 'total', 'moneda']
                                // Subconjunto de campos del movimiento
  orden: {
    campo: String,              // 'fecha_factura' | 'total' | 'proveedor' | etc.
    direccion: String,
  },
  page_size: Number,            // 25 | 50 | 100
  filtro_tipo: String,
  filtros_extra: {},
}
```

**Nota:** La paginación es 100% frontend (slice del array filtrado). No hay request paginado.

### 3.4 `budget_vs_actual` — Presupuesto vs Ejecutado ⭐

Este es el bloque estrella. Cruza datos de presupuestos de control con movimientos ejecutados.

```javascript
{
  type: 'budget_vs_actual',
  titulo: String,               // "Control Presupuestario"
  agrupar_por: String,          // 'categoria' | 'proveedor' | 'etapa'  
  mostrar_tipo: String,         // 'egreso' | 'ingreso' | 'ambos'
  columnas: [String],           // Subconjunto de: ['presupuestado', 'ejecutado', 'disponible', 'porcentaje', 'barra']
  orden: {
    campo: String,
    direccion: String,
  },
  alerta_sobreejecucion: Boolean, // Resaltar en rojo si ejecutado > presupuestado
  filtros_extra: {},
}
```

**Output del engine:**
```javascript
{
  type: 'budget_vs_actual',
  titulo: "Control Presupuestario",
  filas: [
    { 
      grupo: "Materiales", 
      presupuestado: 5000000, 
      ejecutado: 3200000, 
      disponible: 1800000, 
      porcentaje: 64.0,
      sobreejecucion: false 
    },
    { 
      grupo: "Mano de Obra", 
      presupuestado: 8000000, 
      ejecutado: 9100000, 
      disponible: -1100000, 
      porcentaje: 113.75,
      sobreejecucion: true 
    },
  ],
  totales: { presupuestado: 13000000, ejecutado: 12300000, disponible: 700000, porcentaje: 94.6 },
}
```

---

## 4. Moneda de Visualización — Cómo funciona

### El concepto

Cada reporte tiene un `display_currency` que define en qué moneda se muestran **todos** los valores monetarios. Esto es una "lente" que transforma los datos antes de renderizar.

### Opciones

| Valor | Comportamiento |
|-------|---------------|
| `'ARS'` | Todos los montos se muestran en pesos argentinos. Movimientos USD se convierten usando `equivalencias.total.ars` (o `subtotal.ars`) |
| `'USD'` | Todos los montos se muestran en dólares blue. Movimientos ARS se convierten usando `equivalencias.total.usd_blue` |
| `'CAC'` | Todos los montos se muestran en unidades CAC. Se usa `equivalencias.total.cac` |
| `'original'` | Cada movimiento se muestra en su moneda nativa. Las métricas de suma se separan por moneda |

### Implementación en el Engine

```javascript
// reportEngine.js — función de conversión de moneda

const EQUIV_MAP = {
  ARS: (mov, campo) => mov.equivalencias?.[campo]?.ars ?? mov[campo],
  USD: (mov, campo) => mov.equivalencias?.[campo]?.usd_blue ?? null,
  CAC: (mov, campo) => mov.equivalencias?.[campo]?.cac ?? null,
};

function getMontoEnMoneda(movimiento, displayCurrency, campoBase = 'total') {
  // campoBase = 'total' | 'subtotal'
  
  if (displayCurrency === 'original') {
    // Devolver en moneda nativa
    return {
      valor: movimiento[campoBase] || 0,
      moneda: movimiento.moneda || 'ARS',
    };
  }
  
  const monedaMov = movimiento.moneda || 'ARS';
  
  // Si la moneda del movimiento ya es la de display, usar directo
  if (
    (displayCurrency === 'ARS' && monedaMov === 'ARS') ||
    (displayCurrency === 'USD' && monedaMov === 'USD')
  ) {
    return { valor: movimiento[campoBase] || 0, moneda: displayCurrency };
  }
  
  // Usar equivalencias pre-calculadas
  const converter = EQUIV_MAP[displayCurrency];
  if (converter) {
    const valor = converter(movimiento, campoBase);
    return { valor: valor || 0, moneda: displayCurrency };
  }
  
  // Fallback: devolver en moneda original
  return { valor: movimiento[campoBase] || 0, moneda: monedaMov };
}
```

### Moneda en presupuestos de control

Los presupuestos ya almacenan en moneda de almacenamiento (ARS/USD/CAC). Para convertir:

```javascript
function getMontoPresupuestoEnMoneda(presupuesto, displayCurrency, cotizacionActual) {
  const monedaAlmacenamiento = presupuesto.moneda; // 'ARS' | 'USD' | 'CAC'
  
  if (monedaAlmacenamiento === displayCurrency) {
    return presupuesto.monto;
  }
  
  // Primero a ARS, después a display
  let enARS = presupuesto.monto;
  if (monedaAlmacenamiento === 'USD') enARS = presupuesto.monto * cotizacionActual.dolar_blue;
  if (monedaAlmacenamiento === 'CAC') enARS = presupuesto.monto * cotizacionActual.cac_indice;
  
  if (displayCurrency === 'ARS') return enARS;
  if (displayCurrency === 'USD') return enARS / cotizacionActual.dolar_blue;
  if (displayCurrency === 'CAC') return enARS / cotizacionActual.cac_indice;
  
  return presupuesto.monto;
}
```

### El caso `'original'` en métricas y tablas resumen

Cuando `display_currency = 'original'`, no se puede sumar ARS + USD. El engine separa por moneda:

```javascript
// En vez de: { titulo: "Total", valor: 15000000 }
// Devuelve: 
{ 
  titulo: "Total", 
  valores_por_moneda: { 
    ARS: 12500000, 
    USD: 2300 
  } 
}
```

El renderer muestra ambos valores apilados.

---

## 5. Flujo de Datos — Data Fetcher

### Qué datos se traen y de dónde

```
Al abrir un reporte:
│
├─ 1. Fetch config del reporte
│     GET /api/reports/:id
│     → MongoDB → report config JSON
│
├─ 2. Fetch movimientos (si datasets.movimientos = true)
│     → Firestore directo (client-side, igual que cajaProyecto.js)
│     → Query: empresa_id + filtros básicos (proyecto, moneda, fecha)
│     → Resultado: array de movimientos con equivalencias
│
├─ 3. Fetch presupuestos (si datasets.presupuestos = true)
│     GET /api/presupuesto/empresa/:empresaId
│     → presupuestoService.listarPresupuestos()
│     → Resultado: array de presupuestos con monto, ejecutado, etc.
│
├─ 4. Fetch cotizaciones actuales (para display_currency y presupuestos indexados)
│     → MonedasService.listarDolar({ limit: 1 })
│     → MonedasService.listarCAC({ limit: 1 })
│     → Resultado: { dolar_blue, cac_indice }
│
└─ 5. Pasar todo al Report Engine
      engine.run(config, movimientos, presupuestos, cotizaciones)
      → Devuelve resultados por bloque, listos para renderizar
```

### Caching y performance

| Estrategia | Detalle |
|------------|---------|
| **Caching de datos** | Los movimientos se cachean en estado React (o context). Si el usuario cambia filtros, se re-filtra el array en memoria, no se re-fetcha |
| **Re-fetch** | Solo al abrir el reporte o al hacer "Actualizar" explícito |
| **Cotizaciones** | Se traen una vez al montar la página. No cambian durante la sesión |
| **Config del reporte** | Se trae una vez. Se re-fetcha solo si el usuario entra al editor |

### Fetch de movimientos — Reutilizar patrón existente

Hoy `cajaProyecto.js` trae movimientos directo de Firestore:

```javascript
// Patrón existente (funciona bien con <3000 docs)
const q = query(
  collection(db, 'movimientos'),
  where('empresa_id', '==', empresaId),
  // + where por proyecto si aplica
  orderBy('fecha_factura', 'desc')
);
const snapshot = await getDocs(q);
const movimientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

Para reportes multi-proyecto, se trae por `empresa_id` sin filtrar por proyecto, y se filtra en memoria.

---

## 6. Report Engine — Lógica pura (sin React)

### Diseño

El engine es un módulo JS puro (sin dependencias de React) que recibe datos y config, y devuelve resultados. Esto permite:
- Testear con unit tests sin DOM
- Reusar la lógica si en el futuro se mueve al backend
- Separar cómputo de renderizado

### Archivo: `src/tools/reportEngine.js`

```
reportEngine.js
├── run(config, data, cotizaciones) → resultados[]
│   ├── applyGlobalFilters(movimientos, filtros, filtersValues)
│   ├── processBlock(block, filteredData, cotizaciones, displayCurrency)
│   │   ├── processMetricCards(block, data, ...)
│   │   ├── processSummaryTable(block, data, ...)
│   │   ├── processMovementsTable(block, data, ...)
│   │   └── processBudgetVsActual(block, data, presupuestos, ...)
│   └── return resultados[]
├── getMontoEnMoneda(mov, displayCurrency, campo)
├── getMontoPresupuestoEnMoneda(presupuesto, displayCurrency, cotiz)
└── helpers: sum, avg, count, groupBy, sortBy, topN
```

### Contrato del engine

```javascript
// Input
const input = {
  config: reportConfig,           // El JSON de MongoDB
  filtersValues: {                // Valores ACTUALES de los filtros (lo que el usuario eligió en la UI)
    fecha_from: '2026-01-01',
    fecha_to: '2026-01-31',
    proyectos: ['proj_123', 'proj_456'],
    categorias: ['Materiales'],
    // ...
  },
  movimientos: [...],             // Array completo de movimientos
  presupuestos: [...],            // Array de presupuestos de control (si aplica)
  cotizaciones: {
    dolar_blue: 1450,
    cac_indice: 1180.5,
  },
};

// Output
const output = {
  bloques: [
    { type: 'metric_cards', titulo: '...', resultados: [...] },
    { type: 'summary_table', titulo: '...', columnas: [...], filas: [...], totales: [...] },
    { type: 'budget_vs_actual', titulo: '...', filas: [...], totales: {...} },
    { type: 'movements_table', titulo: '...', columnas: [...], filas: [...], totalCount: 342, page: 1 },
  ],
  meta: {
    movimientos_total: 342,
    presupuestos_total: 12,
    filtros_aplicados: { ... },
    display_currency: 'ARS',
    ejecutado_en_ms: 45,
  },
};
```

---

## 7. API Backend — Endpoints del módulo (MongoDB)

Solo CRUD de configuraciones. No hay cómputo.

### Base: `/api/reports`

| Verbo | Ruta | Descripción |
|-------|------|-------------|
| `GET` | `/` | Listar reportes de la empresa. Query: `?empresa_id=X&status=published` |
| `GET` | `/:id` | Obtener config de un reporte |
| `POST` | `/` | Crear reporte (body = config JSON) |
| `PUT` | `/:id` | Actualizar reporte |
| `DELETE` | `/:id` | Eliminar reporte |
| `POST` | `/:id/duplicate` | Duplicar reporte (clona config, status = draft) |
| `GET` | `/templates` | Listar plantillas pre-armadas (es_template = true) |
| `POST` | `/from-template/:templateId` | Crear reporte desde plantilla |

### Modelo Mongoose

```javascript
const ReportSchema = new Schema({
  empresa_id: { type: String, required: true, index: true },
  nombre: { type: String, required: true },
  descripcion: String,
  tags: [String],
  es_template: { type: Boolean, default: false },
  template_origen: String,
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  owner_user_id: String,
  datasets: {
    movimientos: { type: Boolean, default: true },
    presupuestos: { type: Boolean, default: false },
  },
  display_currency: { type: String, enum: ['ARS', 'USD', 'CAC', 'original'], default: 'ARS' },
  filtros_schema: { type: Schema.Types.Mixed, default: {} },
  layout: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true });

ReportSchema.index({ empresa_id: 1, updatedAt: -1 });
ReportSchema.index({ empresa_id: 1, es_template: 1 });
```

---

## 8. Exportación XLSX

### Estrategia: 100% frontend

Ya existe la librería `xlsx` (`SheetJS`) usada en `presupuestos.js`. Se reutiliza.

### Flujo

```
Usuario clickea "Exportar Excel"
│
├─ 1. Tomar resultados actuales del engine (ya computados)
│
├─ 2. Generar workbook:
│     ├─ Hoja "Resumen": métricas como tabla (nombre | valor)
│     ├─ Hoja "Desglose": tabla resumen agrupada
│     ├─ Hoja "Presupuesto vs Ejecutado": si hay bloque budget_vs_actual
│     └─ Hoja "Movimientos": tabla de detalle
│
├─ 3. Formato: headers en negrita, números formateados, moneda como prefijo
│
└─ 4. Descargar: XLSX.writeFile(wb, `${reporte.nombre}.xlsx`)
```

### Copiar tabla al clipboard

Los componentes de tabla tendrán un botón "Copiar". Implementación:

```javascript
// Convertir filas a TSV (Tab-Separated Values) compatible con Excel/Google Sheets
const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
navigator.clipboard.writeText(tsv);
```

---

## 9. Estructura de Archivos (Frontend)

```
src/
├── pages/
│   └── reportes.js                    // Página principal: listado + vista + editor
│
├── tools/
│   └── reportEngine.js                // Engine puro (sin React). Toda la lógica de cómputo
│
├── components/
│   └── reportes/
│       ├── ReportList.js              // Listado de reportes (Home)
│       ├── ReportView.js              // Vista de lectura de un reporte
│       ├── ReportFiltersBar.js        // Barra de filtros globales
│       ├── ReportEditor.js            // Editor/wizard para crear/editar
│       ├── ReportExport.js            // Lógica de exportación XLSX
│       │
│       │── blocks/                    // Un componente por tipo de bloque
│       │   ├── MetricCardsBlock.js
│       │   ├── SummaryTableBlock.js
│       │   ├── MovementsTableBlock.js
│       │   └── BudgetVsActualBlock.js
│       │
│       └── editor/                    // Sub-componentes del editor
│           ├── BlockConfigurator.js   // Config de un bloque (form)
│           ├── FilterToggle.js        // Toggle de filtros habilitados
│           └── MetricConfigurator.js  // Config de una métrica individual
│
├── services/
│   └── reportService.js               // Axios wrapper para /api/reports
```

### Estructura Backend

```
src/
├── models/
│   └── Report.js                      // Schema Mongoose
│
├── routes/
│   └── reportRoutes.js                // Express router
│
├── controllers/
│   └── reportController.js            // Handlers (thin: valida + llama service)
│
└── services/
    └── reportService.js               // CRUD MongoDB (create, update, delete, list, duplicate)
```

---

## 10. Campos del Movimiento relevantes para Reportes

Estos son los campos que el Report Engine necesita leer:

| Campo | Tipo | Uso en reportes |
|-------|------|----------------|
| `fecha_factura` | Timestamp | Filtro por fecha, agrupación por mes |
| `type` | `'egreso'` \| `'ingreso'` | Filtro por tipo |
| `total` | Number | Monto principal |
| `subtotal` | Number | Monto sin impuestos |
| `moneda` | `'ARS'` \| `'USD'` | Moneda original |
| `equivalencias` | Object | Conversión multi-moneda (ver estructura arriba) |
| `categoria` | String | Agrupación/filtro |
| `subcategoria` | String | Agrupación/filtro |
| `nombre_proveedor` | String | Agrupación/filtro |
| `etapa` | String | Agrupación/filtro |
| `proyecto_id` | String | Filtro por proyecto |
| `proyecto_nombre` | String | Display en tablas |
| `observacion` | String | Display en detalle |
| `tipo_comprobante` | String | Display |
| `numero_factura` | String | Display |
| `medio_pago` | String | Filtro/agrupación |
| `empresa_id` | String | Filtro base |
| `imagen_url` | String | Link a comprobante |
| `codigo` | String | Referencia |

---

## 11. Plan de Migración Futura (si el frontend se queda corto)

Si en el futuro el volumen de datos supera lo razonable para frontend (~10.000+ movimientos), el plan es:

1. Crear un sync periódico Firestore → MongoDB (cloud function o cron)
2. Mover el `reportEngine.js` al backend (ya es JS puro, portable)
3. El endpoint `POST /reports/run` ejecuta el engine server-side
4. El frontend solo renderiza resultados

La arquitectura actual (engine como módulo puro sin dependencias de React) está diseñada para que esta migración sea un cambio de dónde se invoca, no de qué se invoca.
