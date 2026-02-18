# Módulo de Reportes — Documento Funcional

> Fecha: Febrero 2026  
> Estado: Diseño — Pre-implementación  
> Autores: Equipo Sorby

---

## 1. Visión del Módulo

### El problema

Hoy los clientes de Sorby quieren ver la misma información (movimientos de caja, presupuestos) de formas distintas. Esto se resuelve con:
- **Soporte armando Excels personalizados** → no escala, se rehace cada vez
- **Filtros de la caja** → limitados, no agrupan ni comparan
- **Copiar/pegar datos** → propenso a errores, sin conexión a datos reales

El patrón siempre se repite: **"totales arriba, lista abajo"**, agrupado por categoría/proveedor/etapa, en la moneda que el cliente quiere ver.

### La solución

Un módulo donde cada empresa tiene **reportes configurables** que:
- Reemplazan los Excels personalizados
- Se crean inicialmente por soporte (sin código, con un editor visual)
- Se abren por cualquier usuario de la empresa
- Son exportables (XLSX, clipboard) para compartir
- Están siempre conectados a datos reales (no son fotos estáticas)
- A futuro: los crea el propio usuario

### Principios de diseño

1. **Un reporte = una vista reutilizable.** Se crea una vez, se usa siempre. No es un Excel que se vuelve a armar.
2. **Mismo dataset, diferentes lentes.** Filtros + moneda de visualización + bloques configurables.
3. **Simple por defecto, potente si querés.** El usuario ve cards + tabla. El editor de soporte configura sin código.
4. **Exportable y compartible.** Si no lo puedo mandar por WhatsApp, no sirve.
5. **Siempre en tu moneda.** Todo el reporte se ve en la moneda que elegís (ARS, USD, CAC, o cada movimiento en su original).

---

## 2. Templates Pre-armados

Cuando una empresa se da de alta (o se activa el módulo), se crean automáticamente estos reportes:

### 🏗️ Template 1: "Estado de Obra"
> El Excel más pedido. Reemplaza el 70% de los pedidos a soporte.

- **Dataset:** Movimientos + Presupuestos
- **Filtros:** Fecha (mes actual) + Proyecto (obligatorio) + Tipo
- **Moneda de visualización:** ARS
- **Bloques:**
  1. **Métricas:** Total Presupuestado | Total Ejecutado | Disponible | % Avance
  2. **Presupuesto vs Ejecutado** agrupado por categoría (con barras de progreso)
  3. **Tabla de movimientos** del proyecto

### 💰 Template 2: "Caja General"
> Resumen rápido de lo que entra y sale.

- **Dataset:** Movimientos
- **Filtros:** Fecha (últimos 30 días) + Proyecto (multi-select)
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Ingresos | Total Egresos | Saldo
  2. **Tabla resumen** agrupada por categoría
  3. **Tabla de movimientos** con todos los campos

### 👷 Template 3: "Resumen por Proveedor"
> Cuánto le pagué a cada proveedor, ranking.

- **Dataset:** Movimientos
- **Filtros:** Fecha (mes actual) + Proyecto + Solo egresos
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Pagado a Proveedores | Cantidad de Proveedores | Promedio por Proveedor
  2. **Tabla resumen** agrupada por proveedor (ordenado por total desc, top 20 + "Otros")
  3. **Tabla de movimientos** filtrada

### 📊 Template 4: "Evolución Mensual"
> Cómo viene la obra mes a mes.

- **Dataset:** Movimientos
- **Filtros:** Fecha (año actual) + Proyecto
- **Moneda:** ARS
- **Bloques:**
  1. **Métricas:** Total Año | Promedio Mensual
  2. **Tabla resumen** agrupada por mes (columnas: ingresos, egresos, saldo)

---

## 3. Flujos de Usuario

### 3.1 Home — Listado de Reportes

```
┌─────────────────────────────────────────────────┐
│  Reportes                        [+ Nuevo]      │
│                                                 │
│  🔍 Buscar por nombre o tag...                  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 🏗️ Estado de Obra           Publicado     │  │
│  │   Presupuesto vs ejecutado por categoría  │  │
│  │   hace 2 días · soporte                   │  │
│  ├───────────────────────────────────────────┤  │
│  │ 💰 Caja General              Publicado     │  │
│  │   Ingresos, egresos y saldo del mes       │  │
│  │   hace 5 días · soporte                   │  │
│  ├───────────────────────────────────────────┤  │
│  │ 👷 Resumen por Proveedor     Borrador     │  │
│  │   Ranking de proveedores por gasto        │  │
│  │   hace 1 hora · milagros                  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Mostrando 3 reportes                           │
└─────────────────────────────────────────────────┘
```

**Acciones por reporte:**
- **Click en fila** → abre la vista del reporte
- **Menú ⋮** → Editar | Duplicar | Eliminar (solo owner/soporte)

**Estados:**
- `Borrador` — solo visible para el creador. En construcción.
- `Publicado` — visible para todos los usuarios de la empresa.

---

### 3.2 Vista del Reporte (modo lectura)

Esta es la pantalla principal que reemplaza al Excel.

```
┌──────────────────────────────────────────────────────────┐
│  ← Reportes    Estado de Obra — Torre Norte              │
│                                                          │
│  [Exportar Excel ▾]  [Copiar]  [✏️ Editar]              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Filtros                                            │  │
│  │                                                    │  │
│  │ 📅 01/01/2026 → 31/01/2026    🏗️ Torre Norte ▾    │  │
│  │ 💱 Moneda: [ARS ▾]            Tipo: [Todos ▾]     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Presup.  │ │ Ejecutado│ │Disponible│ │ Avance   │   │
│  │$13.000.0 │ │$12.300.0 │ │  $700.000│ │  94.6%   │   │
│  │          │ │          │ │          │ │ ████████░│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  Control Presupuestario                                  │
│  ┌────────────┬────────────┬───────────┬──────┬──────┐  │
│  │ Categoría  │Presupuest. │ Ejecutado │Disp. │  %   │  │
│  ├────────────┼────────────┼───────────┼──────┼──────┤  │
│  │ Materiales │ $5.000.000 │$3.200.000 │$1.8M │ 64%  │  │
│  │            │            │ ██████░░░ │      │      │  │
│  ├────────────┼────────────┼───────────┼──────┼──────┤  │
│  │ Mano Obra  │ $8.000.000 │$9.100.000 │-$1.1M│114% 🔴│
│  │            │            │ ██████████│      │      │  │
│  ├────────────┼────────────┼───────────┼──────┼──────┤  │
│  │ TOTAL      │$13.000.000 │$12.300.00 │$700K │94.6% │  │
│  └────────────┴────────────┴───────────┴──────┴──────┘  │
│                                                          │
│  Detalle de Movimientos                    Copiar 📋     │
│  ┌──────┬────────────┬───────────┬────────┬──────────┐  │
│  │Fecha │ Proveedor  │ Categoría │ Obs.   │  Total   │  │
│  ├──────┼────────────┼───────────┼────────┼──────────┤  │
│  │15/01 │ Corralón X │ Materiales│ Hierro │$450.000  │  │
│  │14/01 │ Electrici..│ Mano Obra │ Inst.  │$320.000  │  │
│  │...   │            │           │        │          │  │
│  └──────┴────────────┴───────────┴────────┴──────────┘  │
│  Mostrando 25 de 342 · [1] [2] [3] ... [14] →          │
└──────────────────────────────────────────────────────────┘
```

**Interacciones clave:**

| Acción | Comportamiento |
|--------|---------------|
| Cambiar filtro | Recomputa todos los bloques instantáneamente (datos ya en memoria) |
| Cambiar moneda | Reconvierte todos los valores usando equivalencias. El dropdown está siempre visible |
| Click en fila de movimiento | Abre el movimiento en la caja (link a `/cajaProyecto?...`) |
| Exportar Excel | Descarga .xlsx con hojas separadas |
| Copiar (en tabla) | Copia al clipboard en formato Tab-Separated (pegable en Excel/Sheets) |

---

### 3.3 Editor de Reporte (modo constructor)

Para soporte al principio, luego para admins de la empresa.

#### Paso 1: Meta y Dataset

```
┌──────────────────────────────────────────────────┐
│  Crear Reporte                                    │
│                                                   │
│  Nombre: [Estado de Obra - Torre Norte       ]    │
│  Descripción: [Control presupuestario mensual]    │
│  Tags: [obra] [mensual] [+]                       │
│                                                   │
│  ── Dataset ──                                    │
│  ☑ Movimientos de caja                            │
│  ☑ Presupuestos de control                        │
│                                                   │
│  ── Moneda de visualización ──                    │
│  (●) Pesos ARS                                    │
│  ( ) Dólares USD                                  │
│  ( ) Índice CAC                                   │
│  ( ) Moneda original de cada movimiento           │
│                                                   │
│                      [Siguiente →]                │
└──────────────────────────────────────────────────┘
```

#### Paso 2: Filtros disponibles

```
┌──────────────────────────────────────────────────┐
│  Filtros del Reporte                              │
│                                                   │
│  Qué filtros puede usar el usuario al ver el      │
│  reporte? Los que actives aparecen en la barra.   │
│                                                   │
│  ☑ Fecha (siempre activo)                         │
│     Default: [Mes actual ▾]                       │
│                                                   │
│  ☑ Proyecto(s)                                    │
│     Default: [Ninguno — el usuario elige ▾]       │
│                                                   │
│  ☑ Tipo (egreso/ingreso)                          │
│     Default: [Todos ▾]                            │
│                                                   │
│  ☑ Categoría                                      │
│  ☐ Proveedor                                      │
│  ☐ Etapa                                          │
│  ☐ Medio de pago                                  │
│  ☐ Moneda original                                │
│                                                   │
│              [← Anterior]  [Siguiente →]          │
└──────────────────────────────────────────────────┘
```

#### Paso 3: Layout — Bloques

```
┌──────────────────────────────────────────────────┐
│  Bloques del Reporte               [+ Agregar]   │
│                                                   │
│  Cada bloque es una sección visual.               │
│  Arrastrá para reordenar.                         │
│                                                   │
│  ┌─ 1. Métricas ──────────────────── [⚙] [🗑] ─┐│
│  │  • Total Presupuestado (sum, presup.monto)    ││
│  │  • Total Ejecutado (sum, presup.ejecutado)    ││
│  │  • Disponible (sum, presup.disponible)        ││
│  │  • % Avance (avg, presup.porcentaje)          ││
│  └───────────────────────────────────────────────┘│
│                                                   │
│  ┌─ 2. Presupuesto vs Ejecutado ──── [⚙] [🗑] ─┐│
│  │  Agrupar por: Categoría                       ││
│  │  Tipo: Egresos                                ││
│  │  Columnas: presupuestado, ejecutado,          ││
│  │           disponible, %, barra                ││
│  └───────────────────────────────────────────────┘│
│                                                   │
│  ┌─ 3. Tabla de Movimientos ──────── [⚙] [🗑] ─┐│
│  │  Columnas: fecha, proveedor, categoría,       ││
│  │           observación, total                  ││
│  │  Ordenar por: fecha desc                      ││
│  │  25 por página                                ││
│  └───────────────────────────────────────────────┘│
│                                                   │
│          [← Anterior]  [Preview]  [Guardar]       │
└──────────────────────────────────────────────────┘
```

#### Configuración de un bloque (ejemplo: Métrica)

Al clickear ⚙ en un bloque de métricas:

```
┌──────────────────────────────────────────────────┐
│  Configurar Métrica                               │
│                                                   │
│  Título: [Total Egresos                      ]    │
│                                                   │
│  Dataset:    [Movimientos ▾]                      │
│  Operación:  [Suma ▾]                             │
│  Campo:      [Total ▾]                            │
│  Filtrar por tipo: [Solo Egresos ▾]               │
│                                                   │
│  Filtros extra (opcional):                        │
│  Categoría: [                              ]      │
│  Proveedor: [                              ]      │
│                                                   │
│  Color: (●) Rojo  ( ) Verde  ( ) Azul  ( ) Gris  │
│                                                   │
│                          [Cancelar]  [Aceptar]    │
└──────────────────────────────────────────────────┘
```

---

## 4. Moneda de Visualización — Experiencia de Usuario

### Cómo lo ve el usuario

En la barra de filtros hay un selector de moneda que dice **"Ver en:"**

```
💱 Ver en: [ARS ▾]
            ├─ $ Pesos (ARS)
            ├─ USD Dólares (blue)
            ├─ CAC (índice construcción)
            └─ Original (cada mov. en su moneda)
```

### Qué pasa cuando cambia la moneda

| Cambio | Efecto |
|--------|--------|
| ARS → USD | Todas las cards, tablas y movimientos se reconvierten a dólares. Se usan las `equivalencias` pre-calculadas de cada movimiento |
| ARS → CAC | Idem pero a unidades CAC. Útil para comparar contra presupuestos indexados por CAC |
| Cualquiera → Original | Cada movimiento se muestra en su moneda nativa. Las métricas de suma se muestran separadas: "$12.500.000 ARS + USD 2.300" |

### Caso especial: Presupuesto vs Ejecutado

En el bloque `budget_vs_actual`, tanto el presupuesto como el ejecutado se convierten a la moneda de visualización. Esto es especialmente útil cuando hay presupuestos indexados por CAC que se comparan con gastos en ARS y USD.

---

## 5. Exportación

### Exportar a Excel (XLSX)

Botón siempre visible en la vista del reporte. Genera un archivo `.xlsx` con:

| Hoja | Contenido |
|------|-----------|
| **Resumen** | Métricas como tabla (Nombre | Valor) |
| **Desglose** | Tabla resumen agrupada (si existe el bloque) |
| **Presupuesto vs Ejecutado** | Tabla de control (si existe el bloque) |
| **Movimientos** | Tabla de detalle completa (todos, no solo la página visible) |

El archivo lleva el nombre del reporte: `Estado de Obra - Torre Norte.xlsx`

### Copiar tabla

Cada tabla tiene un botón 📋 que copia los datos al clipboard en formato TSV (Tab-Separated). Al pegar en Excel/Google Sheets, queda con columnas separadas.

---

## 6. Permisos (simplificado para MVP)

### MVP — Sin sistema de permisos granular

| Rol | Puede hacer |
|-----|-------------|
| **Soporte Sorby** | Crear, editar, eliminar, publicar cualquier reporte |
| **Usuario de la empresa** | Ver reportes publicados. Cambiar filtros. Exportar |

No hay viewer/editor/admin por reporte en el MVP. Se agrega en V2.

### Futuro (V2)

- Permisos por reporte: quién puede ver, quién puede editar
- Roles: admin de empresa puede crear reportes (no solo soporte)
- Reportes "privados" vs "de empresa"

---

## 7. Historias de Usuario — Plan de Implementación

### MVP-0: Base del módulo

#### HU1 — Entidad Reporte + Home + Templates pre-armados

**Como** soporte de Sorby  
**Quiero** que exista un listado de reportes por empresa con templates pre-armados  
**Para** tener la base del módulo y que el usuario ya vea reportes útiles al entrar

**Alcance:**
- Modelo `Report` en MongoDB
- Endpoints CRUD: crear, listar, obtener, actualizar, eliminar, duplicar
- Página `reportes.js` con listado (nombre, descripción, tags, estado, fecha)
- Al activar el módulo para una empresa, se crean los 4 templates pre-armados
- Acciones: abrir (click en fila), menú con editar/duplicar/eliminar

**Criterios de aceptación:**
- Se listan reportes de la empresa con búsqueda por nombre/tag
- Los 4 templates aparecen automáticamente para una empresa nueva
- Se puede duplicar un reporte (clona config, queda como borrador)
- Empty state claro cuando no hay reportes

---

### MVP-1: Motor + Vista de lectura

#### HU2 — Report Engine (frontend, lógica pura)

**Como** desarrollador  
**Quiero** un módulo JS que reciba datos + config y devuelva resultados computados  
**Para** separar la lógica de cómputo del rendering y poder testearla

**Alcance:**
- Archivo `reportEngine.js` (sin dependencias de React)
- Funciones: `run()`, `applyGlobalFilters()`, `processBlock()`
- Procesadores por tipo de bloque: métricas, tabla resumen, tabla movimientos, presupuesto vs ejecutado
- Conversión de moneda usando `equivalencias` del movimiento
- Helpers: sum, avg, count, groupBy, sortBy, topN

**Criterios de aceptación:**
- Dado un array de movimientos + config de reporte + filtros, devuelve resultados para cada bloque
- La conversión de moneda funciona correctamente para ARS→USD, USD→ARS, ARS→CAC, y 'original'
- Bloque `budget_vs_actual` cruza presupuestos con ejecutado correctamente
- Funciona con 3.000 movimientos en <200ms

---

#### HU3 — Vista del Reporte + Filtros Globales

**Como** usuario de una empresa  
**Quiero** abrir un reporte y ver métricas + tablas con filtros interactivos  
**Para** reemplazar los Excels que me arma soporte

**Alcance:**
- Componente `ReportView.js` (dentro de `reportes.js`)
- Barra de filtros: fecha (DateRange), proyectos (multi-select), tipo, categoría, etc.
- Selector de moneda de visualización siempre visible
- Renderizar bloques:
  - `MetricCardsBlock` — cards horizontales
  - `SummaryTableBlock` — tabla agrupada con totales
  - `MovementsTableBlock` — tabla paginada con link a movimiento
  - `BudgetVsActualBlock` — tabla con barras de progreso y alerta de sobreejecución
- Fetch de datos: movimientos desde Firestore + presupuestos desde API + cotizaciones

**Criterios de aceptación:**
- Cambiar un filtro recomputa todos los bloques instantáneamente
- Cambiar la moneda reconvierte todos los valores
- La tabla de movimientos pagina en frontend (25/50/100 por página)
- Click en movimiento abre link a cajaProyecto con filtros
- Empty state: "No hay datos para estos filtros"
- El bloque presupuesto vs ejecutado resalta en rojo las sobreejecuciones

---

### MVP-2: Editor + Exportación

#### HU4 — Editor de Reportes (wizard para soporte)

**Como** soporte de Sorby  
**Quiero** crear y editar reportes desde un editor visual paso a paso  
**Para** dejar de depender de un dev y dejar de armar Excels manualmente

**Alcance:**
- Componente `ReportEditor.js` (wizard de 3 pasos)
- Paso 1: Meta (nombre, descripción, tags) + Dataset + Moneda display
- Paso 2: Filtros disponibles (toggles + defaults)
- Paso 3: Layout (agregar/reordenar/configurar bloques)
- Configurador por tipo de bloque (forms específicos)
- Preview en vivo (usa el engine con datos reales)
- Guardar como borrador / Publicar

**Criterios de aceptación:**
- Soporte puede crear un reporte completo sin tocar código
- Puede agregar los 4 tipos de bloque y configurar cada uno
- El preview muestra datos reales con los filtros default
- Puede publicar y que aparezca para los usuarios de la empresa
- Puede editar un reporte existente (carga la config actual)

---

#### HU5 — Exportación XLSX + Copiar al Clipboard

**Como** usuario  
**Quiero** exportar el reporte a Excel y copiar tablas al clipboard  
**Para** mandarlo por mail o WhatsApp como hacen hoy con los Excels

**Alcance:**
- Botón "Exportar Excel" en la vista del reporte
- Genera .xlsx con hojas: Resumen, Desglose, Presupuesto vs Ejecutado, Movimientos
- Respeta la moneda de visualización actual
- Respeta los filtros globales actuales
- Botón "Copiar" en cada tabla (copia TSV al clipboard)

**Criterios de aceptación:**
- El XLSX se descarga y abre correctamente en Excel/Google Sheets
- Los números están formateados como números (no texto)
- La hoja de movimientos incluye TODOS los movimientos filtrados (no solo la página visible)
- Copiar tabla + pegar en Excel mantiene columnas y datos

---

### V2: Governance + IA

#### HU6 — Versionado + Auditoría + Snapshots

**Como** admin/soporte  
**Quiero** versionar cambios, auditar ediciones y guardar "cortes"  
**Para** escalar el módulo sin miedo a romper reportes productivos

**Alcance:**
- Versionado: draft + publishedVersion + historial de versiones
- Rollback a versión anterior
- Auditoría: log de cambios (quién, qué, cuándo)
- Snapshot: guardar "corte" de un reporte con fecha (datos congelados para informe mensual)
- Comparar snapshot vs datos actuales

**Criterios de aceptación:**
- Puedo volver a una versión anterior de un reporte
- Se registra quién cambió qué y cuándo
- Puedo guardar un snapshot y reabrirlo meses después con los mismos datos

---

#### HU7 — Asistente IA para crear reportes

**Como** usuario  
**Quiero** describir en lenguaje natural qué quiero ver y que se genere un reporte  
**Para** no tener que aprender el editor ni depender de soporte

**Alcance:**
- Input: "Quiero ver cuánto gasté en materiales este mes vs el anterior, agrupado por proveedor"
- Output: config de reporte generada automáticamente
- El usuario revisa la config y puede ajustar antes de guardar
- Usa el modelo de IA existente (asistente flotante de proyecto como referencia)

**Criterios de aceptación:**
- Genera un reporte válido con bloques correctos el 80% de las veces
- El usuario puede editar la config generada antes de guardar
- Si no entiende el pedido, hace preguntas de clarificación

---

#### HU8 — Reportes Programados (email digest)

**Como** usuario  
**Quiero** recibir un reporte por email periódicamente  
**Para** no tener que entrar a la plataforma cada lunes

**Alcance:**
- Configurar frecuencia: diario, semanal (qué día), mensual (qué día del mes)
- Generar el reporte como PDF/XLSX y enviarlo por email
- El engine ya es JS puro, se puede correr server-side con un cron

**Criterios de aceptación:**
- Un reporte programado se ejecuta en el horario configurado
- El email llega con el reporte adjunto (XLSX)
- Si no hay datos para el periodo, se envía email informativo ("Sin movimientos esta semana")

---

## 8. Roadmap Visual

```
    MVP-0 (Semana 1-2)          MVP-1 (Semana 3-5)
    ┌─────────────┐             ┌───────────────────┐
    │ HU1         │             │ HU2 + HU3         │
    │ Schema +    │────────────>│ Engine +           │
    │ Listado +   │             │ Vista de lectura + │
    │ Templates   │             │ Filtros + Moneda   │
    └─────────────┘             └────────┬──────────┘
                                         │
                      MVP-2 (Semana 6-8)  │
                      ┌──────────────────┐│
                      │ HU4 + HU5       │◄┘
                      │ Editor wizard +  │
                      │ Export XLSX      │
                      └────────┬─────────┘
                               │
                    V2 (Cuando esté listo)
                    ┌──────────────────────┐
                    │ HU6: Governance       │
                    │ HU7: Asistente IA     │
                    │ HU8: Email digest     │
                    └──────────────────────┘
```

### Hito clave: al terminar MVP-1, los usuarios ya pueden consumir reportes pre-armados.

Soporte no necesita el editor todavía — los templates se crean por código. El editor (HU4) es para que soporte sea autónomo y deje de pedir cambios al dev.

---

## 9. Métricas de éxito

| Métrica | Objetivo |
|---------|----------|
| Excels armados por soporte por semana | Reducir de ~5 a ~1 |
| Tiempo promedio para responder "quiero ver X" | De 1-2 días a inmediato (el reporte ya existe) |
| Usuarios que usan reportes vs caja directa | >30% en 3 meses |
| Reportes creados por empresa | >5 en el primer mes |
| Exportaciones XLSX por semana | >10 (señal de que reemplaza al Excel) |

---

## 10. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Performance con muchos movimientos (>5.000) | Media | Alto | El engine es JS puro, portable al backend si es necesario. Filtros de fecha reducen el dataset |
| Los usuarios no adoptan y siguen pidiendo Excel | Alta | Alto | Templates pre-armados + exportación XLSX cubren el caso "copiar y mandar". Soporte los guía al reporte en vez de armar Excel |
| El editor es complejo para soporte | Media | Medio | Wizard paso a paso. Preview en vivo. Duplicar templates existentes como base |
| Equivalencias de moneda faltantes en movimientos viejos | Baja | Medio | Fallback a mostrar en moneda original si no hay equivalencias. Botón "recalcular equivalencias" ya existe |
| Firestore query límites (no puede filtrar por muchos campos a la vez) | Media | Medio | Traer por empresa_id y filtrar en memoria. Con <3.000 docs es viable |
