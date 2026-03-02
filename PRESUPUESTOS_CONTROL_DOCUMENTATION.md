# Módulo: Presupuestos de Control de Proyecto

> **Fecha de creación:** 2026-02-13  
> **Estado:** Producción  
> **Branch:** `feat/control-proyecto-presupuestos-multicurrency`  
> **Base de datos:** Firebase Firestore (colección `presupuestos`)

---

## 1. Contexto del problema

Las constructoras/estudios de arquitectura necesitan **controlar cuánto presupuestaron gastar vs cuánto realmente gastaron** en cada obra. Antes, esto se hacía en planillas sueltas, sin conexión con los movimientos reales del sistema.

### Problemas que resuelve
- Los presupuestos estaban desconectados de los movimientos de caja.
- No había forma de ver la ejecución real vs lo presupuestado.
- La inflación argentina hacía que un presupuesto en pesos perdiera sentido al mes siguiente.
- No había visibilidad de ingresos vs egresos proyectados por proyecto.

### Qué construimos
1. Un **CRUD de presupuestos** vinculados a proyectos, con agrupación por categoría, etapa y proveedor.
2. **Cálculo automático del ejecutado** a partir de los movimientos reales del sistema.
3. **Soporte multimoneda**: ARS, USD, con indexación opcional por CAC o USD.
4. **Vista de control por proyecto** con resumen de ingresos, egresos y ganancia proyectada.
5. **Base de cálculo configurable**: el usuario elige si sumar el total o el neto (sin impuestos) de cada factura.

---

## 2. Conceptos clave

### 2.1 Presupuesto

Un presupuesto es un **monto que se destina a un concepto dentro de un proyecto**. Define "cuánto vamos a gastar (o cobrar) en X".

Cada presupuesto puede tener:
- **Tipo**: `egreso` (gasto) o `ingreso` (cobro al cliente)
- **Agrupación opcional**: categoría, etapa, proveedor, subcategoría
- **Moneda**: ARS o USD (la que el usuario piensa)
- **Indexación** (solo ARS): sin indexar, por CAC, o por USD
- **Base de cálculo**: total (con impuestos) o subtotal/neto (sin impuestos)
- **Fecha del presupuesto**: fecha a la que corresponde el presupuesto (determina qué CAC/USD se usa para la conversión). Default: hoy.

### 2.2 Ejecutado

El **ejecutado** es la suma de los movimientos reales que coinciden con los filtros del presupuesto (proyecto, proveedor, categoría, etapa, fecha). Se calcula automáticamente.

### 2.3 Indexación

La indexación protege contra la inflación. El modelo mental es:

| El usuario elige... | Lo que pasa internamente | Lo que ve el usuario |
|---|---|---|
| **ARS sin indexar** | Se guarda en ARS tal cual | Monto fijo en pesos |
| **ARS indexado CAC** | Ingresa pesos → se divide por índice CAC → se guarda en CAC | Ve pesos (monto CAC × índice actual) |
| **ARS indexado USD** | Ingresa pesos → se divide por dólar blue → se guarda en USD | Ve pesos (monto USD × dólar actual) |
| **USD** | Se guarda en USD directamente | Monto fijo en dólares |

> **Regla clave**: El usuario siempre piensa en ARS o USD. CAC nunca es una moneda que el usuario "elige" — es una unidad de indexación interna.

### 2.4 Base de cálculo

Cada presupuesto puede configurar qué campo de los movimientos se suma al ejecutado:
- **Total** (default): suma `mov.total` — incluye IVA, percepciones, retenciones.
- **Subtotal/Neto**: suma `mov.subtotal` — solo el neto gravado, sin impuestos.

Esto es relevante para constructoras que trabajan con Factura A (desglosan IVA) y quieren presupuestar en neto.

---

## 3. Modelo de datos (Firestore)

### 3.1 Documento `presupuestos/{id}`

```js
{
  // Identificación
  codigo: 42,                          // Auto-incremental por empresa
  empresa_id: "emp_123",
  proyecto_id: "proy_456",
  
  // Agrupación (todos opcionales)
  proveedor: "Hormigonera Sur",
  proveedor_id: "prov_789",
  etapa: "Estructura",
  categoria: "Materiales",
  subcategoria: "Hormigón",
  
  // Tipo
  tipo: "egreso",                      // "egreso" | "ingreso"
  
  // Moneda y valores
  moneda: "CAC",                       // Moneda REAL de almacenamiento: "ARS" | "USD" | "CAC"
  moneda_display: "ARS",               // Moneda en la que el usuario piensa: "ARS" | "USD"
  indexacion: "CAC",                   // null | "CAC" | "USD"
  base_calculo: "total",              // "total" | "subtotal"
  
  monto: 523.45,                       // Monto en moneda de almacenamiento
  monto_original: 523.45,             // Monto inicial (para referencia)
  monto_ingresado: 50000000,          // Monto que el usuario ingresó (en moneda_display)
  ejecutado: 312.10,                   // Suma de movimientos (en moneda de almacenamiento)
  
  // Fecha del presupuesto (determina qué cotización CAC/USD se usa)
  fecha_presupuesto: "2026-02-13",     // YYYY-MM-DD — fecha a la que corresponde el presupuesto
  
  // Cotización al momento de crear/editar (basada en fecha_presupuesto)
  cotizacion_snapshot: {
    fecha: "2026-02-13",
    fecha_presupuesto: "2026-02-13",   // Fecha del presupuesto usada para el cálculo
    dolar_blue: 1470,
    cac_indice: 95432.5,
    cac_fecha: "2025-12",              // Mes del CAC efectivamente aplicado (regla -2 meses)
    cac_override: true,          // Presente si el usuario hizo override manual
    dolar_override: true,        // Presente si el usuario hizo override manual
  },
  
  // Adicionales (incrementos posteriores al presupuesto original)
  adicionales: [
    {
      fecha: Timestamp,                  // Fecha de creación del registro
      fecha_adicional: "2026-03-15",     // Fecha a la que corresponde el adicional (determina CAC/USD)
      tipo: "adicional",
      concepto: "Cambio de especificación",
      monto: 50.00,
      montoAnterior: 523.45,
      montoNuevo: 573.45,
      creadoPor: "uid_usuario",
      cotizacion_snapshot: {             // Cotización usada para este adicional
        fecha: "2026-03-15",
        dolar_blue: 1520,
        cac_indice: 98200.0,
        cac_fecha: "2026-01",
      }
    }
  ],
  
  // Historial de cambios
  historial: [
    {
      fecha: Timestamp,
      tipo: "edicion",
      concepto: "Ajuste por inflación",
      montoAnterior: 523.45,
      montoNuevo: 600.00,
      monto_ingresado: 60000000,
      diferencia: 76.55,
      monedaAnterior: "CAC",
      monedaNueva: "CAC",
      indexacionAnterior: "CAC",
      indexacionNueva: "CAC",
      baseCalculoAnterior: "total",
      baseCalculoNueva: "total",
      creadoPor: "uid_usuario"
    }
  ],
  
  // Metadatos
  responsables: [],
  fechaInicio: Timestamp,             // Opcional: solo suma movimientos desde esta fecha
  creadoEn: Timestamp
}
```

### 3.2 Campos del movimiento usados

Del documento `movimientos/{id}`, el presupuesto usa:

| Campo | Uso |
|---|---|
| `total` | Se suma al ejecutado cuando `base_calculo = 'total'` |
| `subtotal` | Se suma al ejecutado cuando `base_calculo = 'subtotal'` |
| `type` | Match: `'egreso'` para presupuestos egreso, `'ingreso'` para presupuestos ingreso |
| `moneda` | Moneda del movimiento (`'ARS'`, `'USD'`). Si coincide con la del presupuesto, no hay conversión |
| `proyecto_id` | Match con `presupuesto.proyecto_id` |
| `nombre_proveedor` | Match con `presupuesto.proveedor` |
| `etapa` | Match con `presupuesto.etapa` |
| `categoria` | Match con `presupuesto.categoria` |
| `subcategoria` | Match con `presupuesto.subcategoria` |
| `fecha_factura` | Debe ser `>= presupuesto.fechaInicio` (si existe) |
| `equivalencias` | Pre-calculado: `{total: {usd_blue, ars, cac}, subtotal: {...}}`. Se usa como fuente de verdad para conversión en `recalcularPresupuestoPorId` |

---

## 4. Arquitectura técnica

### 4.1 Backend

**Archivos:**
- `src/services/presupuesto/presupuestoService.js` — Lógica de negocio central
- `src/routes/presupuestoRoutes.js` — Rutas Express

**Funciones principales:**

| Función | Qué hace |
|---|---|
| `crearPresupuesto(data)` | Crea presupuesto. Recibe `fecha_presupuesto` (default: hoy) que determina qué CAC/USD se usa para la conversión. Convierte monto si hay indexación, toma snapshot de cotización basado en la fecha, recalcula ejecutado |
| `editarPresupuesto(data)` | Edita monto/moneda/indexación/base_calculo. Recibe `fecha_presupuesto` opcional. Guarda historial, toma nueva cotización basada en la fecha |
| `agregarAdicional(data)` | Suma un adicional al monto total. Recibe `fecha_adicional` (default: `fecha_presupuesto` del padre) que determina qué CAC/USD se aplica al adicional. Guarda `cotizacion_snapshot` dentro de cada adicional |
| `recalcularPresupuestoPorId({id})` | Re-suma movimientos que matchean. Usa `mov.equivalencias` como fuente de verdad; fallback a servicio de cotización. Soporta multi-moneda (USD↔ARS↔CAC) |
| `sumarEgresoAPresupuesto(data)` | Llamado al crear un movimiento: busca presupuestos que matchean por tipo (egreso→egreso, ingreso→ingreso) y suma el monto. Acepta `moneda` del movimiento para conversión directa |
| `recalcularPresupuestosPorMovimiento(data)` | Llamado al editar/eliminar movimiento: recalcula todos los presupuestos afectados. Matchea tipo del movimiento con tipo del presupuesto |
| `obtenerResumenProyecto(proyecto_id, empresa_id)` | Devuelve presupuestos agrupados por tipo e ingresos/egresos con totales |
| `buscarPresupuestosFiltrados(filtros)` | Query con filtros opcionales por empresa, proyecto, proveedor, etapa, categoría |

**Rutas:**

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/presupuesto` | `crearPresupuesto` |
| `GET` | `/presupuesto/empresa/:empresaId` | `buscarPresupuestosFiltrados` |
| `PUT` | `/presupuesto/:id/editar` | `editarPresupuesto` |
| `POST` | `/presupuesto/:id/adicional` | `agregarAdicional` |
| `POST` | `/presupuesto/:id/recalcular` | `recalcularPresupuestoPorId` |
| `GET` | `/presupuesto/proyecto/:proyectoId/resumen` | `obtenerResumenProyecto` |
| `DELETE` | `/presupuesto/doc/:id` | `eliminarPresupuestoPorId` |
| `PUT` | `/presupuesto/:codigo` | `modificarPresupuesto` (legacy) |
| `DELETE` | `/presupuesto/:codigo` | `eliminarPresupuesto` (legacy) |

**Servicios externos usados:**
- `CACService.obtenerUltimoIndiceCAC()` — Último índice CAC publicado
- `CACService.dameIndiceParaFechaDeUsoReal(fechaAAAAMM)` — Índice para una fecha (resta 2 meses por desfase de publicación)
- `DolarService.dameValorDelDolarEnFecha(fechaStr, tipo)` — Valor del dólar blue para una fecha

### 4.2 Frontend

**Archivos:**

| Archivo | Propósito |
|---|---|
| `src/components/PresupuestoDrawer.js` | Drawer reutilizable para crear y editar presupuestos |
| `src/pages/controlProyecto.js` | Vista de control por proyecto (ingresos, egresos, agrupaciones) |
| `src/pages/presupuestos.js` | Tabla CRUD de todos los presupuestos. Columnas ocultables (toggle ⊞), columna "Detalle" combina proveedor/categoría/etapa en texto compacto |
| `src/services/presupuestoService.js` | Servicio HTTP (axios) |
| `src/services/monedasService.js` | Para obtener cotizaciones (dólar, CAC) |

### 4.3 PresupuestoDrawer — UX del formulario

**Modo Crear:**
1. Toggle **Egreso / Ingreso**
1. Toggle **Egreso / Ingreso**
2. **Fecha del presupuesto** (DatePicker, default: hoy). Determina qué CAC/USD se usa.
3. Campo **Monto** + toggle **ARS / USD**
4. Si ARS → selector de **Indexación**: Sin indexar | Indexar CAC | Indexar USD
   - Si indexa: muestra preview de equivalencia ("Equivale a CAC X.XX") con la fecha del índice aplicado visible
   - Info: "Fecha presupuesto: Mayo 2026 → Índice CAC aplicado: Marzo 2026 (regla: -2 meses)"
   - Link discreto **"Modificar índice manualmente…"** como escape hatch (override manual)
5. Selector de **Base de cálculo**: Total (con imp.) | Neto (sin imp.)
6. Si `showFullForm` (página presupuestos): Proyecto, Categoría, Proveedor, Etapa, Subcategoría
7. Preview resumen

**Modo Editar:**
1. Resumen actual (tipo, monto en pesos con unidades indexadas como subtítulo, ejecutado con barra de progreso, chip con fecha del presupuesto)
2. Link "Ver movimientos" que abre la caja del proyecto filtrada
3. Tabs: **Editar** | **Adicional** | **Historial**
4. Tab Editar: **Fecha del presupuesto** (editable) + Monto + Moneda + Indexación + Base cálculo + Motivo
   - Info de fecha/índice aplicado visible
   - Override de índice disponible como escape hatch
5. Tab Adicional: **Fecha del adicional** (DatePicker, default: fecha del presupuesto) + Concepto + Monto
   - Info de índice aplicado al adicional visible
   - Cotizaciones se cargan para la fecha del adicional, NO para hoy
6. Tab Historial: tabla con registros de ediciones y adicionales
7. Acciones: Guardar / Recalcular / Eliminar

### 4.4 controlProyecto.js — Vista por proyecto

**Layout:**
```
┌─ Header: nombre proyecto + toggle ARS/USD + chip dólar blue + Actualizar ─┐
├─ 3 Cards: Ingresos Proyectados | Egresos Proyectados | Ganancia Proyectada ─┤
├─ Sección Ingresos: lista de presupuestos tipo ingreso ─────────────────────┤
├─ Sección Egresos ──────────────────────────────────────────────────────────┤
│  ├─ Resumen: Presupuesto General | Asignado por tab | Sin asignar         │
│  ├─ Tabs: Por Categoría | Por Etapa | Por Proveedor                       │
│  └─ Lista de PresupuestoItem por agrupación                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Badges informativos en cada item:**
- 🇦🇷 / 🇺🇸 — Moneda (con tooltip)
- `idx CAC` / `idx USD` — Indexación (con tooltip)
- `neto` — Base de cálculo subtotal (con tooltip)

---

## 5. Flujos de negocio

### 5.1 Crear presupuesto indexado por CAC

```
Usuario ingresa: $50.000.000 ARS, indexación CAC, fecha_presupuesto: 2026-05-15
    ↓
Backend calcula fecha CAC: Mayo 2026 − 2 meses = Marzo 2026
    ↓
Backend obtiene índice CAC de Marzo 2026 (ej: 95432.5)
    ↓
monto_almacenamiento = 50.000.000 / 95432.5 = 523.95 CAC
    ↓
Se guarda: moneda="CAC", moneda_display="ARS", monto=523.95, 
  monto_ingresado=50000000, fecha_presupuesto="2026-05-15",
  cotizacion_snapshot.cac_fecha="2026-03"
    ↓
Frontend muestra: $50.000.000 (recalculado: 523.95 × CAC_actual)
```

### 5.2 Recalcular ejecutado (ARS indexado CAC)

```
Presupuesto: moneda="CAC", base_calculo="subtotal", tipo="egreso"
    ↓
Query: movimientos donde type="egreso" AND proyecto_id=X AND proveedor=Y ...
    ↓
Por cada movimiento:
  1. Si misma moneda → sumar directo
  2. Si tiene mov.equivalencias[subtotal][cac] → usar ese valor (fuente de verdad)
  3. Fallback: convertir con servicio de cotización para la fecha del movimiento
    ↓
Guardar ejecutado actualizado en el presupuesto
```

### 5.3 Sumar movimiento nuevo a presupuesto

```
Se crea movimiento (factura de proveedor)
    ↓
sumarEgresoAPresupuesto busca TODOS los presupuestos de la empresa
    ↓
Filtra: coincide proyecto + proveedor + etapa + categoría + subcategoría + fecha
  + tipo del movimiento debe coincidir con tipo del presupuesto (egreso→egreso, ingreso→ingreso)
    ↓
Si misma moneda → sumar directo (movimiento USD a presupuesto USD)
Si distinta moneda → convertir (ej: movimiento USD * dólar → ARS para presupuesto ARS)
    ↓
Suma al ejecutado
```

---

## 6. Decisiones de diseño

### ¿Por qué `moneda` y `moneda_display` son campos separados?
Porque el usuario piensa en pesos o dólares, pero el sistema puede almacenar en CAC internamente. `moneda_display` es lo que el usuario eligió, `moneda` es la unidad real de almacenamiento. Esto permite mostrar siempre el valor actualizado en la moneda que el usuario entiende.

### ¿Por qué no se guarda `monto` en ARS cuando hay indexación?
Porque un monto en ARS pierde valor con la inflación. Si guardamos 50M ARS hoy, dentro de 6 meses no tiene sentido comparar contra ejecución. Guardamos en CAC/USD y reconvertimos al mostrar, así el presupuesto "se actualiza solo".

### ¿Por qué `base_calculo` es un campo del presupuesto y no global?
Porque un proveedor puede facturar con Factura A (IVA discriminado) y otro con Factura B/C (total = neto). Cada presupuesto necesita su propia lógica.

### ¿Por qué `sumarEgresoAPresupuesto` busca todos los presupuestos de la empresa?
Porque un movimiento puede impactar múltiples presupuestos (uno por categoría, otro por proveedor, otro general). Es un fan-out: un movimiento puede sumar a N presupuestos.

### ¿Por qué el presupuesto general no tiene categoría/etapa/proveedor?
Es un presupuesto "catch-all" del proyecto. Sirve como techo para comparar contra la suma de presupuestos específicos. Se identifica como `!categoria && !etapa && !proveedor`.

---

## 7. Relación con otros módulos

| Módulo | Relación |
|---|---|
| **Movimientos** | Los movimientos de egreso alimentan el ejecutado del presupuesto |
| **Proveedores** | `ensureProveedorExiste()` crea el proveedor si no existe al crear presupuesto |
| **Monedas (CAC/Dólar)** | Se usan para snapshots de cotización y conversiones al recalcular |
| **Presupuestos Profesionales** | Módulo SEPARADO (MongoDB) — son cotizaciones de obra para enviar al cliente, NO son los presupuestos de control |

> ⚠️ **No confundir** con `PRESUPUESTOS_PROFESIONALES.md` (backend/docs/). Ese módulo maneja cotizaciones de obra que se envían como PDF al cliente final. Este módulo maneja el control interno de cuánto se gasta vs cuánto se presupuestó.
