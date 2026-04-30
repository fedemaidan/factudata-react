# Módulo de Reportes — Documento Funcional

> Fecha: Abril 2026  
> Estado: Implementado  
> Autores: Equipo Sorby

---

## 1. Visión del Módulo

### El problema

Los clientes de Sorby quieren ver su información (movimientos de caja, presupuestos) de formas distintas. Esto se resolvía con:
- **Soporte armando Excels personalizados** → no escala, se rehace cada vez
- **Filtros de la caja** → limitados, no agrupan ni comparan
- **Copiar/pegar datos** → propenso a errores, sin conexión a datos reales

### La solución

Un módulo donde cada empresa tiene **reportes configurables** que:
- Reemplazan los Excels personalizados
- Se crean inicialmente por soporte (sin código, con un editor visual)
- Se abren por cualquier usuario de la empresa
- Son exportables (XLSX, PDF, clipboard) para compartir
- Están siempre conectados a datos reales
- Se pueden compartir públicamente (sin login) vía link con token

### Principios de diseño

1. **Un reporte = una vista reutilizable.** Se crea una vez, se usa siempre.
2. **Mismo dataset, diferentes lentes.** Filtros + moneda + bloques configurables.
3. **Simple por defecto, potente si querés.** El usuario ve cards + tabla. El editor configura sin código.
4. **Exportable y compartible.** XLSX, PDF o link público.
5. **Siempre en tu moneda.** ARS, USD, CAC, o simultáneamente varios mediante chips.

---

## 2. Concepto: Bloques

Un reporte es una **lista vertical de bloques**. Cada bloque es una sección visual independiente con su propio tipo de visualización y configuración. El editor permite agregar, reordenar y configurar bloques sin código.

Tipos de bloque disponibles:

| Tipo | Para qué sirve |
|------|---------------|
| **Métricas** (`metric_cards`) | KPIs arriba: totales, promedios, conteos |
| **Tabla resumen** (`summary_table`) | Datos agrupados por categoría/proveedor/mes/etc. |
| **Tabla de movimientos** (`movements_table`) | Listado de movimientos individuales paginado |
| **Presupuesto vs Ejecutado** (`budget_vs_actual`) | Comparativo presupuesto de control vs gastos reales |
| **Gráfico** (`chart`) | Visualización de barras, tortas, líneas o áreas |
| **Detalle agrupado** (`grouped_detail`) | Selector de grupos + tabla de movimientos del grupo |
| **Matriz presupuestaria** (`category_budget_matrix`) | Tabla de conceptos vs proyectos (estado financiero multi-proyecto) |
| **Balance entre socios** (`balance_between_partners`) | Balance neto por socio y transferencias necesarias para equilibrar |

Cada bloque tiene un **ancho configurable** en el grid (de 1 a 12 columnas). Dos bloques de 6 columnas aparecen lado a lado.

---

## 3. Templates Pre-armados

Cuando se activa el módulo para una empresa, se crean automáticamente 4 reportes template:

### 🏗️ Template 1: "Estado de Obra"
> Métricas clave + resumen por categoría + últimos movimientos.

- **Dataset:** Movimientos
- **Filtros:** Fecha (mes actual) + Proyecto + Tipo + Categorías
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Egresos | Total Ingresos | Cantidad de Movimientos | Ticket Promedio
  2. **Tabla resumen** agrupada por categoría (top 10, egresos, con % del total)
  3. **Tabla de movimientos** (15 por página)

### 💰 Template 2: "Caja General"
> Balance de ingresos y egresos con evolución mensual.

- **Dataset:** Movimientos
- **Filtros:** Fecha (año actual) + Proyecto
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Ingresos | Total Egresos
  2. **Tabla resumen** agrupada por mes (con totales)

### 👷 Template 3: "Resumen por Proveedor"
> Top proveedores por gasto total.

- **Dataset:** Movimientos
- **Filtros:** Fecha (año actual) + Proyecto + Categorías + Proveedores
- **Moneda:** ARS
- **Bloques:**
  1. **Tabla resumen** agrupada por proveedor (top 15, egresos, con % del total, ticket promedio)

### 📊 Template 4: "Presupuesto vs Real"
> Comparativo entre presupuesto de control y gastos reales.

- **Dataset:** Movimientos + Presupuestos
- **Filtros:** Fecha (año actual) + Proyecto
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Egresos
  2. **Presupuesto vs Ejecutado** (agrupado por categoría, alerta de sobreejecución activa)

---

## 4. Flujos de Usuario

### 4.1 Home — Listado de Reportes

```
┌─────────────────────────────────────────────────┐
│  Reportes                        [+ Nuevo]      │
│                                                 │
│  🔍 Buscar por nombre o tag...                  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🏗️ Estado de Obra            Publicado    │  │
│  │   Métricas + resumen por categoría        │  │
│  │   ARS · hace 2 días                       │  │
│  ├───────────────────────────────────────────┤  │
│  │ 💰 Caja General              Publicado    │  │
│  │   Balance mensual de ingresos y egresos   │  │
│  │   ARS · hace 5 días                       │  │
│  ├───────────────────────────────────────────┤  │
│  │ 📋 Resumen Semanal           Borrador     │  │
│  │   Semana en curso                         │  │
│  │   ARS · hace 1 hora                       │  │
│  └───────────────────────────────────────────┘  │
│  Mostrando 3 reportes                           │
└─────────────────────────────────────────────────┘
```

**Acciones por reporte:**
- **Click en fila** → abre la vista del reporte
- **Menú ⋮** → Editar | Duplicar | Eliminar (con confirmación)

**Estados visibles:**
- `Borrador` — solo visible para el creador. En construcción.
- `Publicado` — visible para todos los usuarios de la empresa.
- `Público` — tiene link público generado, accesible sin login.

**Crear nuevo:** Se abre un dialog que pide nombre y opcionalmente permite partir de un template.

---

### 4.2 Vista del Reporte (modo lectura)

Esta es la pantalla principal que reemplaza al Excel.

```
┌──────────────────────────────────────────────────────────┐
│  ← Reportes    Estado de Obra — Torre Norte              │
│                                                          │
│  [Exportar Excel ▾]  [PDF]  [Compartir]  [✏️ Editar]   │
│                                                          │
│  ▶ Filtros ──────────────────────────────────────────── │
│    📅 01/01/2026 → 31/01/2026    🏗️ Torre Norte ▾       │
│    Tipo: [Todos ▾]               💱 [ARS] [USD]         │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Total Egr.│ │Total Ing.│ │Movimient.│ │Tkt Prom. │   │
│  │$15.000.0 │ │$22.000.0 │ │   342    │ │  $43.859 │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  Desglose por Categoría                                  │
│  ┌────────────┬────────────┬──────────┬──────────────┐  │
│  │ Categoría  │ Monto Total│ Cantidad │ % del Total  │  │
│  ├────────────┼────────────┼──────────┼──────────────┤  │
│  │ Materiales │ $5.200.000 │    45    │    34.7%     │  │
│  │ Mano Obra  │ $8.100.000 │    22    │    54.0%     │  │
│  │ Otros      │ $1.700.000 │    18    │    11.3%     │  │
│  ├────────────┼────────────┼──────────┼──────────────┤  │
│  │ TOTAL      │$15.000.000 │    85    │   100.0%     │  │
│  └────────────┴────────────┴──────────┴──────────────┘  │
│                                                          │
│  Últimos Movimientos                         📋 Copiar  │
│  ┌──────┬────────────┬───────────┬────────┬──────────┐  │
│  │Fecha │ Proveedor  │ Categoría │ Obs.   │  Total   │  │
│  ├──────┼────────────┼───────────┼────────┼──────────┤  │
│  │15/01 │ Corralón X │ Materiales│ Hierro │$450.000  │  │
│  └──────┴────────────┴───────────┴────────┴──────────┘  │
│  Mostrando 15 de 342 · [1] [2] ... →                   │
└──────────────────────────────────────────────────────────┘
```

**Interacciones clave:**

| Acción | Comportamiento |
|--------|---------------|
| Cambiar filtro | Recomputa todos los bloques instantáneamente (datos ya en memoria) |
| Chips de moneda (ARS/USD/CAC) | Activa o desactiva monedas. Con varios chips activos, las columnas monetarias se expanden por moneda |
| Click en fila agrupada (tabla/gráfico) | Abre DrillDown modal con los movimientos individuales del grupo |
| Click en movimiento | Abre link a `/cajaProyecto` con filtros pre-aplicados |
| Exportar Excel | Descarga .xlsx con hojas separadas por bloque |
| PDF | Genera PDF server-side (usando la configuración actual) |
| Copiar (en tabla) | Copia al clipboard en formato TSV (pegable en Excel/Sheets) |
| Compartir | Genera un link público con token. Opcional: fija los filtros actuales en el link |

---

### 4.3 DrillDown — Ver movimientos detrás de un dato

Al hacer click en cualquier fila agrupada (tabla resumen, gráfico, etc.) se abre un modal con:
- El nombre del grupo (ej: "Materiales")
- La tabla de movimientos individuales que conforman ese valor
- Los mismos filtros de moneda que el reporte principal

Esto permite ir del resumen al detalle sin salir del reporte.

---

### 4.4 Editor de Reporte (estilo DataStudio)

El editor se divide en dos paneles:

```
┌──────────────────────────────────────────────────────────┐
│  ← Reportes    Estado de Obra                            │
│                                          [Guardar]       │
│  ┌─────────────────────┐ ┌────────────────────────────┐  │
│  │  CONFIGURACIÓN      │ │  PREVIEW (datos reales)     │  │
│  │                     │ │                             │  │
│  │  ▼ General          │ │  ┌────────┐ ┌────────┐      │  │
│  │    Nombre: [...]    │ │  │$15.000 │ │  342   │      │  │
│  │    Estado: Borrador │ │  └────────┘ └────────┘      │  │
│  │    Desc:   [...]    │ │                             │  │
│  │    Presupuestos: ☐  │ │  ┌─────────────────────┐   │  │
│  │                     │ │  │ Materiales │$5.200.000│   │  │
│  │  ▼ Monedas          │ │  │ Mano Obra  │$8.100.000│   │  │
│  │    [ARS] [USD] [CAC]│ │  └─────────────────────┘   │  │
│  │                     │ │                             │  │
│  │  ▶ Filtros          │ │  ┌─────────────────────┐   │  │
│  │  ▶ Permisos         │ │  │ 15/01 | Materiales  │   │  │
│  │                     │ │  │ 14/01 | Mano Obra   │   │  │
│  │  ▼ Bloques          │ │  └─────────────────────┘   │  │
│  │    1. Métricas  ⚙🗑 │ │                             │  │
│  │    2. Tabla Cat ⚙🗑 │ └────────────────────────────┘  │
│  │    3. Movimient ⚙🗑 │                                 │
│  │    [+ Agregar]      │                                 │
│  └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

**Panel izquierdo — acordeones:**

**General:**
- Nombre del reporte
- Estado (Borrador / Publicado)
- Descripción
- Toggle para incluir presupuestos de control

**Monedas:** Multi-select de monedas disponibles para el reporte (ARS / USD / CAC)

**Filtros disponibles:** Toggles para habilitar/deshabilitar cada filtro en la vista. Opciones:
- Fecha (siempre habilitado)
- Proyecto(s) — con opción "Fijar proyectos" para que el usuario no pueda cambiarlos
- Tipo (egreso/ingreso)
- Categorías, Proveedores, Etapas
- Medio de pago, Moneda del movimiento
- Usuarios
- Factura cliente

**Permisos:** Multi-select de usuarios con acceso. Opción de generar link público.

**Bloques:** Lista de bloques con botones para reordenar (↑↓), configurar (⚙), duplicar y eliminar. Botón "Agregar bloque" abre el selector de tipo.

**Panel derecho:** Preview en vivo con datos reales del período/proyecto por defecto.

---

### 4.5 Configurar un bloque

Al hacer click en ⚙ de un bloque se abre un dialog. Primero muestra los campos comunes:

- **Título** del bloque
- **Ancho** (col_span: 6 para medio ancho, 12 para ancho completo)
- **Filtrar por tipo** (Todos / Solo Egresos / Solo Ingresos)

Luego los campos específicos por tipo:

**Métricas:** Hasta 8 cards. Para cada una: título, operación (suma/conteo/promedio/min/max), campo (total/subtotal), filtro por tipo, color (gris/verde/rojo/naranja/azul).

**Tabla resumen:** Agrupar por (categoría/proveedor/etapa/proyecto/mes/moneda/medio de pago/usuario), columnas de datos, mostrar %, mostrar fila de totales, Top N, exclusiones.

**Tabla de movimientos:** Columnas visibles (selección múltiple), filas por página (5–100), ordenamiento.

**Presupuesto vs Ejecutado:** Agrupar por, tipo (egresos/ingresos/ambos), columnas a mostrar (presupuestado/ejecutado/disponible/%/barra de progreso), alerta de sobreejecución en rojo, exclusiones.

**Gráfico:** Tipo (barras/torta/dona/línea/área), agrupación, columnas (series), Top N.

**Detalle agrupado:** Agrupación, estilo de chips (chip simple o mini-card con valor), columnas de tabla interna, filas por página.

**Matriz presupuestaria:** Categoría objetivo, tipo de presupuesto, etiquetas de filas, opción de proyectos específicos.

**Balance entre socios:** Selección de socios por teléfono, mostrar/ocultar cards de resumen.

---

## 5. Moneda de Visualización

### El selector de moneda

En la barra de filtros hay chips de moneda:

```
💱  [ARS]  [USD]  [CAC]
```

- Se pueden activar **varios simultáneamente**
- Con un solo chip activo: las columnas monetarias muestran el valor en esa moneda
- Con varios chips: las columnas monetarias se expanden (una sub-columna por moneda)
- El modo `'original'` no está en los chips; está como opción de display_currency en la config

### Qué pasa cuando cambia la moneda

| Cambio | Efecto |
|--------|--------|
| ARS → USD | Reconvierte usando `equivalencias.total.usd_blue` de cada movimiento |
| ARS → CAC | Reconvierte usando `equivalencias.total.cac` |
| Activar ARS + USD | Columnas dobles: `Total (ARS)` y `Total (USD)` lado a lado |
| Moneda original (en config) | Cada movimiento en su moneda nativa; métricas separadas por moneda |

### Caso especial: Presupuesto vs Ejecutado

Tanto presupuesto como ejecutado se convierten a la moneda seleccionada. Útil para comparar presupuestos en CAC con gastos en ARS y USD.

---

## 6. Exportación y Compartir

### Exportar a Excel (XLSX)

Botón siempre visible. Genera un `.xlsx` con una hoja por bloque relevante:

| Hoja | Contenido |
|------|-----------|
| **Métricas** | Cards como tabla (Nombre \| Valor) |
| **[Nombre de bloque]** | Datos de cada tabla resumen |
| **Presupuesto vs Ejecutado** | Si existe el bloque |
| **Movimientos** | Todos los movimientos filtrados (no solo la página visible) |

El archivo respeta la moneda de visualización activa y los filtros actuales.

### Generar PDF

Botón "PDF" en la vista del reporte. El PDF se genera server-side y se descarga como archivo.

### Copiar tabla

Cada tabla tiene un botón 📋 que copia los datos al clipboard en formato TSV. Al pegar en Excel/Google Sheets, las columnas quedan separadas.

### Compartir — Link público

El botón "Compartir" permite:
1. Generar un link con token único
2. Opcionalmente fijar los filtros actuales en el link (fecha, proyectos, etc.)
3. El destinatario abre el link y ve el reporte completo sin necesidad de login

Los datos se sirven desde MongoDB server-side. Si el reporte tiene proyectos fijos en su config, el link solo muestra esos proyectos independientemente de los filtros del link.

---

## 7. Permisos

### MVP

| Rol | Puede hacer |
|-----|-------------|
| **Soporte Sorby** | Crear, editar, eliminar, publicar cualquier reporte |
| **Usuario de la empresa** | Ver reportes publicados. Cambiar filtros. Exportar |
| **Usuario con acceso explícito** | Ver reportes en estado borrador si está en `permisos.usuarios` |
| **Anónimo (link público)** | Ver reportes con `permisos.publico = true` vía token |

### Futuro (V2)

- Permisos granulares por reporte (viewer / editor / admin)
- Roles: admin de empresa puede crear reportes
- Reportes "privados" vs "de empresa"

---

## 8. Historias de Usuario

### Implementado (MVP-0 a MVP-2)

#### HU1 — Entidad Reporte + Home + Templates ✅

**Como** soporte de Sorby  
**Quiero** que exista un listado de reportes con templates pre-armados  
**Para** tener la base del módulo con reportes útiles desde el primer día

**Alcance implementado:**
- Modelo `Report` en MongoDB con todos los sub-schemas
- Endpoints CRUD completos
- Página `reportes/index.js` con listado y búsqueda
- 4 templates sembrados automáticamente por empresa
- Acciones: abrir, menú con editar/duplicar/eliminar

---

#### HU2 — Report Engine ✅

**Como** desarrollador  
**Quiero** un módulo JS que reciba datos + config y devuelva resultados computados  
**Para** separar la lógica de cómputo del rendering y poder testearla

**Alcance implementado:**
- `reportEngine.js` (~1.750 LOC, sin dependencias de React)
- `executeReport()` como función principal
- 8 procesadores de bloque
- Conversión multi-moneda con `equivalencias`
- Filtros globales y por bloque, con normalización de texto

---

#### HU3 — Vista del Reporte + Filtros ✅

**Como** usuario de una empresa  
**Quiero** abrir un reporte y ver métricas + tablas con filtros interactivos  
**Para** reemplazar los Excels que arma soporte

**Alcance implementado:**
- `ReportView.js` que renderiza los 8 tipos de bloque
- Barra de filtros colapsable con todos los filtros habilitados
- Chips de moneda multi-seleccionables (ARS/USD/CAC)
- DrillDown: click en fila agrupada abre modal con movimientos
- Paginación frontend en tabla de movimientos
- Link a movimiento individual desde la tabla

---

#### HU4 — Editor de Reportes ✅

**Como** soporte de Sorby  
**Quiero** crear y editar reportes desde un editor visual  
**Para** ser autónomo y dejar de armar Excels

**Alcance implementado:**
- Editor DataStudio-style: panel de config + preview en vivo
- Configuración de meta, filtros, permisos y bloques
- `BlockEditorDialog.js` para configurar los 8 tipos de bloque
- Preview con datos reales
- Guardar como borrador / Publicar

---

#### HU5 — Exportación + Compartir ✅

**Como** usuario  
**Quiero** exportar el reporte y compartirlo  
**Para** mandarlo por mail o WhatsApp

**Alcance implementado:**
- Exportación XLSX con hojas por bloque
- Generación de PDF server-side
- Copiar tabla al clipboard (TSV)
- Compartir: link público con token opcional, con filtros fijados

---

### Pendiente (V2)

#### HU6 — Versionado + Auditoría + Snapshots

**Como** admin/soporte  
**Quiero** versionar cambios, auditar ediciones y guardar "cortes"  
**Para** escalar sin miedo a romper reportes productivos

---

#### HU7 — Asistente IA para crear reportes

**Como** usuario  
**Quiero** describir en lenguaje natural qué quiero ver y que se genere un reporte  
**Para** no tener que aprender el editor

---

#### HU8 — Reportes Programados (email digest)

**Como** usuario  
**Quiero** recibir un reporte por email periódicamente  
**Para** no tener que entrar a la plataforma cada semana

---

## 9. Roadmap

```
    MVP-0 ✅                MVP-1 ✅
    ┌─────────────┐         ┌───────────────────┐
    │ HU1         │         │ HU2 + HU3         │
    │ Schema +    │────────>│ Engine (8 bloques) │
    │ Listado +   │         │ Vista de lectura + │
    │ 4 Templates │         │ Filtros + Monedas  │
    └─────────────┘         └────────┬──────────┘
                                     │
                  MVP-2 ✅            │
                  ┌──────────────────┐│
                  │ HU4 + HU5       │◄┘
                  │ Editor          │
                  │ Export XLSX+PDF │
                  │ Link público    │
                  └────────┬─────────┘
                           │
                V2 (pendiente)
                ┌──────────────────────┐
                │ HU6: Governance       │
                │ HU7: Asistente IA     │
                │ HU8: Email digest     │
                └──────────────────────┘
```

---

## 10. Métricas de éxito

| Métrica | Objetivo |
|---------|----------|
| Excels armados por soporte por semana | Reducir de ~5 a ~1 |
| Tiempo para responder "quiero ver X" | De 1-2 días a inmediato |
| Usuarios que usan reportes vs caja directa | >30% en 3 meses |
| Exportaciones XLSX por semana | >10 (señal de que reemplaza al Excel) |
| Links públicos generados | >5/mes (señal de uso para compartir) |

---

## 11. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Performance con muchos movimientos (>5.000) | Media | Alto | El engine es JS puro, portable al backend. Filtros de fecha reducen el dataset |
| Los usuarios no adoptan y siguen pidiendo Excel | Alta | Alto | Templates pre-armados + exportación XLSX cubren el caso "copiar y mandar". El link público facilita el compartir |
| El editor es complejo para soporte | Media | Medio | Preview en vivo. Duplicar templates existentes como base |
| Equivalencias de moneda faltantes en movimientos viejos | Baja | Medio | Fallback a mostrar en moneda original. Botón "recalcular equivalencias" ya existe |
| Firestore query límites | Media | Medio | Se trae por `empresa_id` y se filtra en memoria. Con <3.000 docs es viable |
| Link público expone datos sensibles | Media | Alto | El token es único y revocable. El admin elige qué proyectos están en el scope del link |
