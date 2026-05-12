# Módulo de Reportes — Documento Técnico

> Fecha: Abril 2026  
> Estado: Implementado  
> Autores: Equipo Sorby

---

## 1. Decisión de Arquitectura: Frontend-First

### ¿Por qué el cómputo vive en el frontend?

| Factor | Decisión |
|--------|----------|
| **Backend single-process** | El backend Node.js corre en un solo proceso. Agregar cómputo pesado de reportes puede bloquear requests de otros usuarios (carga de movimientos, WhatsApp bot, etc.) |
| **Firestore no soporta agregaciones** | No hay `GROUP BY`, `SUM`, `AVG` nativos. Cualquier agregación requiere traer documentos y computar en memoria |
| **Volumen de datos manejable** | ~3.000 movimientos máx por empresa. En un browser moderno, agregar 3.000 objetos toma <100ms |
| **Iteración rápida** | Cambiar lógica de agregación en frontend = hot reload. En backend = restart + redeploy |

### Qué vive en cada capa

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                           │
│                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ Report       │   │ Report       │   │ Block     │ │
│  │ Config CRUD  │   │ Engine       │   │ Renderers │ │
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
│  │ Reports    │  │ Firestore /   │  │         │
│  │ CRUD API   │  │ MongoDB       │  │         │
│  │ (MongoDB)  │  │ (movimientos, │  │         │
│  └────────────┘  │ presupuestos) │  │         │
│                  └───────────────┘  │         │
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
| **Backend (MongoDB)** | CRUD de configuraciones de reportes. Persistencia, listado, duplicación, templates. Nada de cómputo |
| **Backend (Firestore / MongoDB)** | Fuente de datos: movimientos y presupuestos. Para vistas autenticadas se usa Firestore desde el cliente; para vistas públicas se usa MongoDB server-side |
| **Frontend — Data Fetcher** | Hook `useReportData`: trae movimientos, presupuestos, proyectos, usuarios de empresa y cotizaciones |
| **Frontend — Report Engine** | `executeReport()`: aplica filtros, convierte monedas, computa métricas, agrupa, ordena. Puro JS sin React |
| **Frontend — Block Renderers** | Componentes React por tipo de bloque. Consumen el output del engine |

---

## 2. Modelo de Datos — Report Config (MongoDB)

### Colección: `reports`

```javascript
{
  _id: ObjectId,
  empresa_id: String,           // required, indexed

  // ── Meta ──
  nombre: String,               // "Estado de Obra - Torre Norte"
  descripcion: String,
  tags: [String],
  es_template: Boolean,         // true = plantilla pre-armada
  template_origen: String,      // ID del template origen (null si es original)

  // ── Estado ──
  status: String,               // 'draft' | 'published'
  owner_user_id: String,

  // ── Permisos de acceso ──
  permisos: {
    usuarios: [String],         // user IDs / emails con acceso explícito
    publico: Boolean,           // true = accesible sin login vía link_token
    link_token: String,         // token único para el link público (null si no generado)
  },

  // ── Dataset ──
  datasets: {
    movimientos: Boolean,       // default true
    presupuestos: Boolean,      // default false
  },

  // ── Moneda de visualización por defecto ──
  display_currency: String,     // 'ARS' | 'USD' | 'CAC' | 'original'

  // ── Filtros configurables ──
  filtros_schema: {
    fecha: {
      enabled: true,            // siempre true
      default_range: String,    // 'last_30_days' | 'current_month' | 'last_month' | 'current_year' | 'custom'
      default_from: Date,       // solo si default_range = 'custom'
      default_to: Date,
    },
    proyectos: {
      enabled: Boolean,
      default_ids: [String],
      fijos: Boolean,           // true = los proyectos están forzados, el usuario no puede cambiarlos
      proyecto_ids: [String],   // proyectos forzados (solo si fijos = true)
    },
    tipo: {
      enabled: Boolean,
      default_value: String,    // null = ambos
    },
    categorias:        { enabled, default_values: [String] },
    proveedores:       { enabled, default_values: [String] },
    etapas:            { enabled, default_values: [String] },
    medio_pago:        { enabled, default_values: [String] },
    moneda_movimiento: { enabled, default_value: String },
    usuarios:          { enabled, default_values: [String] },
    factura_cliente:   { enabled, default_value: String }, // 'cliente' | 'propia' | null
    moneda_equivalente: {
      enabled: Boolean,
      default_values: [String], // default ['ARS'] — los chips pre-seleccionados
    },
  },

  // ── Layout: bloques del reporte ──
  layout: [BlockSchema],        // Array ordenado — ver sección 3

  // ── Timestamps ──
  createdAt: Date,
  updatedAt: Date,
}
```

### Índices

```javascript
{ empresa_id: 1, updatedAt: -1 }
{ empresa_id: 1, status: 1 }
{ empresa_id: 1, es_template: 1 }
```

---

## 3. Bloques (layout[])

Un **bloque** es la unidad visual de un reporte. El campo `layout` es un array ordenado de bloques que se renderizan de arriba a abajo. Cada bloque tiene un `type` que determina cómo lo procesa el engine y qué componente lo renderiza.

### Campos comunes a todos los bloques

```javascript
{
  type: String,           // Ver tipos abajo
  titulo: String,         // Título visible encima del bloque (opcional)
  col_span: Number,       // Ancho en columnas del grid (1–12). Default 12 = ancho completo
  filtro_tipo: String,    // 'egreso' | 'ingreso' | null — filtra el dataset del bloque
  filtros_extra: {        // Filtros adicionales al global (se intersectan)
    categorias: [String],
    proveedores: [String],
    etapas: [String],
  },
  excluir: Object,        // Exclusiones: { categorias, proveedores, etapas, usuarios }
  presupuestos_con_campo: String, // Filtra presupuestos que tengan un campo específico no vacío
}
```

---

### 3.1 `metric_cards` — Tarjetas de métricas

Cards con un valor grande. Útiles para KPIs arriba del reporte.

```javascript
{
  type: 'metric_cards',
  titulo: String,
  metricas: [
    {
      id: String,
      titulo: String,           // "Total Egresos"
      dataset: String,          // 'movimientos' | 'presupuestos'
      operacion: String,        // 'sum' | 'count' | 'avg' | 'min' | 'max'
      campo: String,            // 'total' | 'subtotal' (mov.) | 'monto' | 'ejecutado' | 'disponible' (presup.)
      filtro_tipo: String,
      filtros_extra: {},
      formato: String,          // 'currency' | 'number' | 'percentage'
      color: String,            // 'default' | 'success' | 'error' | 'warning' | 'info'

      // Vinculación con bloque budget_vs_actual (opcional)
      sync_with_budget_vs_actual: Boolean,  // Hereda filtros/exclusiones del bloque BvA
      linked_budget_block_id: String,       // ID específico del bloque BvA a vincular
      linked_budget_block_index: Number,    // Alternativa: índice en el layout
    }
  ],
}
```

**Nota:** Una métrica puede "vincularse" a un bloque `budget_vs_actual` del mismo reporte para que sus filtros sean coherentes. Si `sync_with_budget_vs_actual = true`, el engine busca automáticamente el primer bloque BvA del layout.

**Output del engine:**
```javascript
[
  { id: "xxx", titulo: "Total Egresos", valor: 15000000, formato: "currency", color: "error" },
  // Si hay múltiples displayCurrencies:
  { id: "yyy", titulo: "Total", valores: { ARS: 15000000, USD: 10000 }, formato: "currency", color: "default" },
]
```

---

### 3.2 `summary_table` — Tabla resumen agrupada

```javascript
{
  type: 'summary_table',
  titulo: String,
  dataset: String,              // 'movimientos' | 'presupuestos'
  agrupar_por: String,          // 'categoria' | 'proveedor' | 'etapa' | 'proyecto' | 'mes'
                                // | 'moneda_original' | 'medio_pago' | 'usuario'
  columnas: [
    {
      id: String,
      titulo: String,
      operacion: String,        // 'sum' | 'count' | 'avg'
      campo: String,
      formato: String,
    }
  ],
  mostrar_porcentaje: Boolean,  // Columna "% del Total"
  orden: { campo, direccion },
  top_n: Number,                // null = todo, N = top N + "Otros"
  mostrar_total: Boolean,
  filtro_tipo: String,
  filtros_extra: {},
  excluir: {},
}
```

**Output del engine:**
```javascript
{
  headers: ["Categoría", "Monto Total", "Cantidad", "% del Total"],
  rows: [
    { grupo: "Materiales", valores: [5200000, 45, 34.7] },
    { grupo: "Otros", valores: [1700000, 18, 11.3] },
  ],
  totals: [15000000, 85, 100],
}
```

---

### 3.3 `movements_table` — Tabla de movimientos (detalle)

```javascript
{
  type: 'movements_table',
  titulo: String,
  columnas_visibles: [String],  // Subconjunto de: 'fecha', 'tipo', 'categoria',
                                // 'proveedor_nombre', 'proyecto_nombre', 'monto_display',
                                // 'subtotal_display', 'ingreso_display', 'egreso_display',
                                // 'moneda', 'medioPago', 'notas', 'etapa', 'estado',
                                // 'usuario_nombre'
  orden: { campo, direccion },
  page_size: Number,            // 5–100, default 25
  filtro_tipo: String,
  filtros_extra: {},
}
```

La paginación es 100% frontend (slice del array). El engine devuelve todas las filas; el componente las pagina.

---

### 3.4 `budget_vs_actual` — Presupuesto vs Ejecutado

Cruza datos de presupuestos de control con movimientos ejecutados.

```javascript
{
  type: 'budget_vs_actual',
  titulo: String,
  agrupar_por: String,          // 'categoria' | 'etapa' | 'proveedor'
  mostrar_tipo: String,         // 'egreso' | 'ingreso' | 'ambos'
  columnas_budget: [String],    // Subconjunto de: 'presupuestado', 'ejecutado', 'disponible', 'porcentaje', 'barra'
  orden: { campo, direccion },
  alerta_sobreejecucion: Boolean,
  filtros_extra: {},
  presupuestos_con_campo: String,
  excluir: {},
}
```

**Output del engine:**
```javascript
{
  columnas: ["Categoría", "Presup.", "Ejecutado", "Disponible", "%"],
  rows: [
    { grupo: "Materiales", presupuestado: 5000000, ejecutado: 3200000, disponible: 1800000, porcentaje: 64.0, sobreejecucion: false },
    { grupo: "Mano de Obra", presupuestado: 8000000, ejecutado: 9100000, disponible: -1100000, porcentaje: 113.75, sobreejecucion: true },
  ],
  totals: { presupuestado: 13000000, ejecutado: 12300000, disponible: 700000, porcentaje: 94.6 },
}
```

---

### 3.5 `chart` — Gráfico

```javascript
{
  type: 'chart',
  titulo: String,
  chart_type: String,           // 'bar' | 'pie' | 'donut' | 'line' | 'area'
  agrupar_por: String,          // Igual que summary_table
  columnas: [ColumnaConfig],    // Hasta 4 columnas (series)
  top_n: Number,
  filtro_tipo: String,
  filtros_extra: {},
  excluir: {},
}
```

Renderizado por `ChartBlock.js` usando Chart.js.

---

### 3.6 `grouped_detail` — Detalle agrupado con selector

Muestra grupos como chips/cards clicables. Al seleccionar un grupo, aparece la tabla de movimientos de ese grupo.

```javascript
{
  type: 'grouped_detail',
  titulo: String,
  agrupar_por: String,
  chips_style: String,          // 'chip' | 'metric'
  columnas_visibles: [String],  // Columnas de la tabla interna
  page_size: Number,
  filtro_tipo: String,
  filtros_extra: {},
  excluir: {},
}
```

**Output del engine:**
```javascript
{
  groups: [
    { key: "Materiales", count: 45, total: 5200000 },
    { key: "Mano de Obra", count: 22, total: 8100000 },
  ],
  columnas: [...],
  pageSize: 25,
  currencies: ['ARS'],
  chipsStyle: 'chip',
}
```

El componente filtra los movimientos del grupo seleccionado en el cliente, sin llamadas adicionales al engine.

---

### 3.7 `category_budget_matrix` — Matriz presupuestaria por proyecto

Muestra una matriz donde las columnas son proyectos y las filas son conceptos (presupuestos) de una categoría. Útil para ver el estado financiero de múltiples proyectos a la vez.

```javascript
{
  type: 'category_budget_matrix',
  titulo: String,
  categoria_objetivo: String,         // Categoría de presupuestos a mostrar
  tipo_presupuesto: String,           // 'egreso' | 'ingreso' | 'ambos'
  columna_concepto_titulo: String,    // Título de la columna de conceptos (default 'Concepto')
  asumir_monto_incluye_adicionales: Boolean, // Si true, no suma adicionales por separado
  label_presupuesto_inicial: String,
  label_total_presupuesto: String,
  label_recibido: String,
  label_saldo: String,
  proyectos_seleccionados: [String],  // [] = todos los proyectos con datos
}
```

**Output del engine:**
```javascript
{
  categoria: "Subcontratos",
  rowHeaderTitle: "Concepto",
  projectColumns: ["Torre Norte", "Torre Sur", "Local A"],
  rows: [
    {
      concepto: "Estructura",
      byProject: {
        "Torre Norte": { presupuesto_inicial: 1000000, adicionales: 200000, total: 1200000, recibido: 900000, saldo: 300000 },
        "Torre Sur":   { ... },
      }
    },
  ],
}
```

---

### 3.8 `balance_between_partners` — Balance entre socios

Calcula el balance neto por socio (basado en movimientos ingresados desde su teléfono) y muestra las transferencias necesarias para equilibrar aportes.

```javascript
{
  type: 'balance_between_partners',
  titulo: String,
  show_summary_cards: Boolean,        // Mostrar tarjetas resumen por socio
  socios_telefonos: [String],         // Teléfonos de los socios a incluir ([] = todos)
}
```

**Output del engine:**
```javascript
{
  socios: [
    { nombre: "Juan", telefono: "...", totalIngresado: 1200000, totalEgresado: 800000, saldo: 400000 },
    { nombre: "María", telefono: "...", totalIngresado: 600000, totalEgresado: 900000, saldo: -300000 },
  ],
  saldoNetoTotal: 100000,
  aporteIdeal: 350000,
  isBalanced: false,
  transfers: [
    { de: "María", a: "Juan", monto: 300000 },
  ],
  showSummaryCards: true,
}
```

El algoritmo de transferencias es greedy: los deudores pagan primero a los mayores acreedores.

---

## 4. Moneda de Visualización

### `display_currency` vs `displayCurrencies`

El campo `display_currency` en la config del reporte define el **default**. Pero la UI permite al usuario activar múltiples monedas simultáneamente mediante chips (`moneda_equivalente`). El engine recibe `displayCurrencies: string[]` — si hay más de una, expande las columnas monetarias.

### Opciones de moneda

| Valor | Comportamiento |
|-------|---------------|
| `'ARS'` | Montos en pesos. Usa `equivalencias[campo].ars` |
| `'USD'` | Montos en dólares blue. Usa `equivalencias[campo].usd_blue` |
| `'CAC'` | Montos en índice CAC. Usa `equivalencias[campo].cac` |
| `'original'` | Cada movimiento en su moneda nativa. Sin conversión |

### Implementación en el Engine

```javascript
// reportEngine.js
const CURRENCY_FIELD = {
  ARS: 'ars',
  USD: 'usd_blue',
  CAC: 'cac',
};

export function getAmount(mov, displayCurrency = 'ARS', campo = 'total') {
  if (displayCurrency === 'original') {
    return campo === 'total'
      ? (mov.total ?? mov.monto ?? 0)
      : (mov.subtotal ?? mov.total ?? mov.monto ?? 0);
  }
  const key = CURRENCY_FIELD[displayCurrency];
  const val = mov?.equivalencias?.[campo]?.[key];
  if (val != null && !isNaN(val)) return val;
  return mov.total ?? mov.monto ?? 0; // fallback a monto original
}
```

### Presupuestos

Los presupuestos almacenan un `cotizacion_snapshot` al momento de creación y el engine usa las cotizaciones actuales para convertir:

```javascript
function getPresupuestoAmount(pres, displayCurrency, cotizaciones) {
  const moneda = pres.moneda; // 'ARS' | 'USD' | 'CAC'
  if (moneda === displayCurrency) return pres.monto;
  // Normalizar a ARS, luego convertir a target
  let enARS = pres.monto;
  if (moneda === 'USD') enARS = pres.monto * cotizaciones.dolar_blue;
  if (moneda === 'CAC') enARS = pres.monto * cotizaciones.cac_indice;
  if (displayCurrency === 'ARS') return enARS;
  if (displayCurrency === 'USD') return enARS / cotizaciones.dolar_blue;
  if (displayCurrency === 'CAC') return enARS / cotizaciones.cac_indice;
  return pres.monto;
}
```

---

## 5. Filtros del Engine

### Filtros globales (`filterMovimientos`)

El engine aplica los filtros en este orden:

| Filtro | Campo en movimiento | Comparación |
|--------|---------------------|-------------|
| `fecha_from / fecha_to` | `fecha_factura` o `fecha` | Fecha local, inclusive en ambos extremos |
| `proyectos` | `proyecto_id` | Set de IDs exactos |
| `tipo` | `type` | `'egreso'` \| `'ingreso'` |
| `categorias` | `categoria` | Normalizado (sin tildes, lowercase) |
| `proveedores` | `nombre_proveedor` | Normalizado |
| `etapas` | `etapa` | Normalizado |
| `medio_pago` | `medio_pago` | Normalizado |
| `usuarios` | `usuario_nombre`, `usuario`, `user_id`, teléfono | Multi-campo + lookup por empresa |
| `moneda_movimiento` | `moneda` | Exacto |
| `factura_cliente` | campo de factura de cliente | `'cliente'` \| `'propia'` |

### Normalización de texto

Todos los filtros de texto usan la misma normalización para comparación insensible a tildes y mayúsculas:

```javascript
function normalizeFilterText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/\s+/g, ' ');
}
```

### Filtros por bloque (`applyBlockFilters`)

Además de los filtros globales, cada bloque puede tener sus propios `filtro_tipo` y `filtros_extra` que se aplican sobre el subset ya filtrado globalmente.

---

## 6. Report Engine — Contrato

### Archivo: `src/tools/reportEngine.js` (JS puro, sin React, ~1.750 LOC)

```
reportEngine.js
├── executeReport(config, movimientos, presupuestos, displayCurrencies, cotizaciones, extraContext) → Array<BlockResult>
│   └── Para cada bloque: BLOCK_PROCESSORS[block.type](block, movs, presupuestos, currencies, cotizaciones, extraContext)
│
├── filterMovimientos(movimientos, filters, extraContext) → Array
├── applyBlockFilters(movimientos, block) → Array
├── groupBy(movimientos, campo) → Map<string, Array>
├── aggregate(values, operacion) → number
├── getAmount(mov, displayCurrency, campo) → number
├── getMes(mov) → string ('YYYY-MM')
│
├── processMetricCards(block, movs, presupuestos, currencies, cotizaciones, extraContext)
├── processSummaryTable(block, movs, presupuestos, currencies)
├── processMovementsTable(block, movs, presupuestos, currencies)
├── processBudgetVsActual(block, movs, presupuestos, currencies, cotizaciones, extraContext)
├── processCategoryBudgetMatrix(block, movs, presupuestos, currencies, cotizaciones, extraContext)
├── processGroupedDetail(block, movs, presupuestos, currencies)
├── processBalanceBetweenPartners(block, movs, presupuestos, currencies, cotizaciones, extraContext)
├── processChart(block, movs, presupuestos, currencies, cotizaciones)
│
├── getUniqueValues(movimientos, campo) → Array  // Para poblar dropdowns de filtros
├── buildDefaultFilters(filtrosSchema) → Object  // Construye estado inicial de filtros
└── formatValue(value, formato, displayCurrency) → string
```

### Contrato de `executeReport`

```javascript
// Input
executeReport(
  reportConfig,          // Objeto de MongoDB (con layout, filtros_schema, etc.)
  movimientos,           // Array completo ya traído de Firestore/MongoDB
  presupuestos,          // Array de presupuestos ([] si datasets.presupuestos = false)
  displayCurrencies,     // ['ARS'] | ['ARS', 'USD'] | ['USD'] — array, no string
  cotizaciones,          // { dolar_blue: 1450, cac_indice: 1180.5 }
  extraContext,          // { usuariosEmpresa, proyectos, reportConfig }
);

// Output: Array<BlockResult>
[
  { type: 'metric_cards', titulo: 'Resumen', data: [...] },
  { type: 'summary_table', titulo: 'Desglose', data: { headers, rows, totals } },
  { type: 'movements_table', titulo: 'Detalle', data: { columnas, rows, pageSize, totalRows } },
  { type: 'budget_vs_actual', titulo: 'Control', data: { columnas, rows, totals } },
  // Si hubo error en un bloque:
  { type: 'chart', titulo: '...', data: null, error: 'mensaje' },
]
```

---

## 7. Flujo de Datos — Hook `useReportData`

El hook `useReportData` en el componente `/pages/reportes/[id].js` orquesta todos los fetches:

```
Al montar la página del reporte:
│
├─ 1. Fetch config del reporte
│     GET /api/reports/:id
│     → MongoDB → report config JSON (con layout, filtros_schema, permisos)
│
├─ 2. Fetch movimientos (si datasets.movimientos = true)
│     → Firestore client-side (query por empresa_id)
│     → Array de movimientos con equivalencias pre-calculadas
│
├─ 3. Fetch presupuestos (si datasets.presupuestos = true)
│     GET /api/presupuesto/empresa/:empresaId
│     → Array de presupuestos de control
│
├─ 4. Fetch proyectos + usuariosEmpresa
│     → Para poblar dropdowns de filtros y lookup de usuarios
│
├─ 5. Fetch cotizaciones actuales
│     → MonedasService.listarDolar() + MonedasService.listarCAC()
│     → { dolar_blue, cac_indice }
│
├─ 6. Calcular availableOptions (para dropdowns de filtros)
│     getUniqueValues(movimientos, campo) para cada filtro habilitado
│
└─ 7. Al cambiar filtros → executeReport(config, movimientos, presupuestos, ...)
      Los datos completos quedan en memoria; no se re-fetcha al cambiar filtros
```

### Vista pública (sin login)

Para reportes con `permisos.publico = true`, la página `reportes/public/[token].js` hace:

```
GET /api/reports/public/:token
→ Backend devuelve { report, movimientos, presupuestos }
  Los movimientos se traen server-side desde MongoDB (MovimientoCajaRepository)
  respetando proyectos fijos si los hay
```

---

## 8. API Backend — Endpoints

Solo CRUD de configuraciones. Todo el cómputo es frontend.

### Base: `/api/reports`

| Verbo | Ruta | Descripción |
|-------|------|-------------|
| `GET` | `/` | Listar reportes de la empresa. Query: `?empresa_id=X` |
| `GET` | `/:id` | Obtener config completa de un reporte |
| `POST` | `/` | Crear reporte |
| `PUT` | `/:id` | Actualizar reporte |
| `DELETE` | `/:id` | Eliminar reporte |
| `POST` | `/:id/duplicate` | Duplicar (clona config, status = draft) |
| `GET` | `/templates` | Listar templates disponibles para la empresa |
| `POST` | `/from-template` | Crear reporte a partir de un template. Body: `{ templateId, empresa_id, nombre }` |
| `POST` | `/export-pdf` | Generar PDF server-side. Body: `{ reportConfig, results, ... }`. Devuelve URL del PDF |
| `GET` | `/public/:token` | Obtener reporte público con datos. No requiere autenticación |

### Modelo Mongoose (ReportModel.js)

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
  permisos: {
    usuarios: [String],
    publico: { type: Boolean, default: false },
    link_token: { type: String, default: null },
  },
  datasets: {
    movimientos: { type: Boolean, default: true },
    presupuestos: { type: Boolean, default: false },
  },
  display_currency: { type: String, enum: ['ARS', 'USD', 'CAC', 'original'], default: 'ARS' },
  filtros_schema: FiltrosSchemaConfig,
  layout: [BlockSchema],
}, { timestamps: true });
```

Sub-schemas relevantes:
- `FiltroExtraSchema`: `{ categorias, proveedores, etapas }`
- `MetricaConfigSchema`: Config de una métrica individual (14 campos)
- `ColumnaConfigSchema`: Config de una columna de tabla (5 campos)
- `BlockSchema`: Wrapper genérico con todos los campos posibles para los 8 tipos
- `FiltrosSchemaConfig`: Configuración de disponibilidad de filtros (10 filtros)

---

## 9. Backend Service (`reportService.js`)

| Método | Descripción |
|--------|-------------|
| `list(empresa_id)` | Lista reportes (resumen sin layout completo) |
| `getById(id, empresa_id)` | Reporte completo |
| `create(data)` | Valida `empresa_id` + `nombre` obligatorios |
| `update(id, empresa_id, data)` | Previene sobrescribir `_id`, `createdAt`, `updatedAt`, `empresa_id` |
| `delete(id, empresa_id)` | Hard delete |
| `duplicate(id, empresa_id, nuevoNombre)` | Clona config, resetea timestamps, status = draft |
| `createFromTemplate(templateId, empresa_id, overrides)` | Templates del sistema (`__system__`) o de la empresa |
| `getTemplates(empresa_id)` | Busca templates con `es_template: true` |
| `getByToken(token)` | Busca por `permisos.link_token` + `permisos.publico: true` |
| `getPublicData(token)` | Igual que anterior + trae movimientos y presupuestos desde MongoDB |
| `seedDefaultTemplatesIfMissing(empresaId)` | Siembra los 4 templates default si la empresa no tiene ninguno. Idempotente (usa upsert) |

### `getPublicData` — Lógica de proyectos para vista pública

```
1. Si filtros_schema.proyectos.fijos = true y proyecto_ids definidos
   → fetchMovimientosByProyectos(proyecto_ids)
2. Si report.proyectos_compartidos tiene IDs
   → fetchMovimientosByProyectos(proyectos_compartidos)
3. Fallback
   → fetchMovimientosByEmpresa(empresa_id)
```

Los movimientos se traen de **MongoDB** (no Firestore) server-side.

---

## 10. Templates Default (`defaultTemplates.js`)

Se siembran automáticamente la primera vez que una empresa accede a sus templates (`seedDefaultTemplatesIfMissing`). Son 4 templates:

| Nombre | Datasets | Bloques |
|--------|----------|---------|
| **Estado de Obra** | Movimientos | metric_cards + summary_table (por categoría) + movements_table |
| **Caja General** | Movimientos | metric_cards (ingresos/egresos) + summary_table (por mes) |
| **Resumen por Proveedor** | Movimientos | summary_table (por proveedor, top 15) |
| **Presupuesto vs Real** | Movimientos + Presupuestos | metric_cards + budget_vs_actual |

Los templates tienen `empresa_id` asignado a la empresa destino (no son templates de sistema global). Pueden ser editados por el equipo después de creados.

---

## 11. Exportación

### XLSX (100% frontend)

Usa la librería `xlsx` (SheetJS) ya presente en el proyecto:

```
Usuario clickea "Exportar Excel"
│
├─ 1. Tomar resultados actuales del engine (ya en memoria)
├─ 2. Generar workbook con hojas separadas por bloque
└─ 3. XLSX.writeFile(wb, `${reporte.nombre}.xlsx`)
```

### PDF (server-side)

```
POST /api/reports/export-pdf
Body: { reportConfig, results, ... }
→ Backend usa generarReportePDF()
→ Devuelve URL del PDF generado
```

### Copiar tabla al clipboard

```javascript
// TSV compatible con Excel/Google Sheets
const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
navigator.clipboard.writeText(tsv);
```

---

## 12. Estructura de Archivos

### Frontend

```
src/
├── pages/reportes/
│   ├── index.js                       // Listado de reportes de la empresa
│   ├── [id].js                        // Vista + editor de un reporte
│   └── public/[token].js              // Vista pública sin login
│
├── tools/
│   └── reportEngine.js                // Engine puro (~1.750 LOC)
│
├── components/reportes/
│   ├── ReportView.js                  // Renderiza los bloques (ejecuta engine)
│   ├── ReportFiltersBar.js            // Barra de filtros interactiva
│   ├── ReportEditor.js                // Editor DataStudio-style (left panel config + right panel preview)
│   ├── BlockEditorDialog.js           // Dialog para configurar un bloque (8 tipos)
│   ├── DrillDownDialog.js             // Modal con movimientos al hacer click en un dato agrupado
│   │
│   └── blocks/
│       ├── MetricCardsBlock.js
│       ├── SummaryTableBlock.js
│       ├── MovementsTableBlock.js
│       ├── BudgetVsActualBlock.js
│       ├── CategoryBudgetMatrixBlock.js
│       ├── ChartBlock.js
│       ├── GroupedDetailBlock.js
│       └── BalanceBetweenPartnersBlock.js
│
└── services/
    └── reportService.js               // Axios wrapper para /api/reports
```

### Backend

```
src/
├── models/report/
│   └── ReportModel.js                 // Schema Mongoose (todos los sub-schemas)
│
├── routes/
│   └── reportRoutes.js                // Express router
│
├── controllers/report/
│   └── reportController.js            // Handlers (delgados: valida + llama service)
│
└── services/report/
    ├── reportService.js               // CRUD + getPublicData + seedDefaultTemplatesIfMissing
    └── defaultTemplates.js            // Definición de los 4 templates default
```

---

## 13. Campos de Movimiento relevantes para el Engine

| Campo | Tipo | Uso |
|-------|------|-----|
| `fecha_factura` | Timestamp / ISO string | Filtro por fecha, agrupación por mes |
| `type` | `'egreso'` \| `'ingreso'` | Filtro por tipo |
| `total` | Number | Monto principal |
| `subtotal` | Number | Monto sin impuestos |
| `moneda` | `'ARS'` \| `'USD'` | Moneda original |
| `equivalencias` | Object | `{ total: { ars, usd_blue, cac }, subtotal: { ... } }` |
| `categoria` | String | Agrupación/filtro (null → 'Sin categoría') |
| `nombre_proveedor` | String | Agrupación/filtro |
| `etapa` | String | Agrupación/filtro |
| `medio_pago` | String | Agrupación/filtro |
| `proyecto_id` | String | Filtro por proyecto |
| `proyecto` / `proyecto_nombre` | String | Display + agrupación |
| `observacion` / `notas` | String | Display en detalle |
| `empresa_id` | String | Filtro base (todos los movimientos ya son de la empresa) |
| `usuario_nombre`, `usuario`, `user_id` | String / Object | Filtro por usuario (multi-campo) |
| `telefono` / `from` | String | Identificación de socio (para balance_between_partners) |

---

## 14. Plan de Migración Futura

Si el volumen supera lo razonable para frontend (~10.000+ movimientos):

1. Crear un sync periódico Firestore → MongoDB (cloud function o cron)
2. Mover `reportEngine.js` al backend (ya es JS puro, portable)
3. El endpoint `POST /reports/run` ejecuta el engine server-side
4. El frontend solo renderiza resultados

La arquitectura actual (engine como módulo puro sin dependencias de React) está diseñada para que esta migración sea mínima.
