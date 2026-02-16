# Movimientos — Referencia de Campos (Firestore)

> Colección: `movimientos`  
> Última actualización: Febrero 2026  
> Fuente de verdad: `backend/utils/dataService.js` → `generarMovimiento()`

---

## ⚠️ Lecciones aprendidas

1. **Los movimientos usan nombres en inglés/español mezclados.** No hay convención uniforme.
2. **El campo de tipo es `type`** (inglés), no `tipo`. Esto difiere de presupuestos y stock que sí usan `tipo`.
3. **El campo de monto principal es `total`**, no `monto`. Aunque `monto` también existe como campo legacy/paralelo.
4. **El nombre del proveedor es `nombre_proveedor`**, no `proveedor_nombre`.
5. **El nombre del proyecto se guarda en `proyecto`**, no `proyecto_nombre`.
6. **Las notas/observaciones son `observacion`**, no `notas`.
7. **El medio de pago es `medio_pago`** (snake_case), no `medioPago` (camelCase).

---

## Campos principales

| Campo | Tipo | Ejemplo | Notas |
|-------|------|---------|-------|
| `type` | `'ingreso'` \| `'egreso'` | `'egreso'` | ⚠️ Inglés! No `tipo` |
| `total` | Number | `450000` | Monto principal con impuestos |
| `subtotal` | Number | `371900` | Sin impuestos. Si no viene, se calcula como `total / 1.21` |
| `moneda` | `'ARS'` \| `'USD'` | `'ARS'` | Moneda original del movimiento |
| `categoria` | String | `'Materiales'` | Categoría del gasto/ingreso |
| `nombre_proveedor` | String | `'Corralón Norte'` | ⚠️ No `proveedor_nombre` |
| `proyecto_id` | String | `'abc123'` | ID del proyecto al que pertenece |
| `proyecto` | String | `'Torre Norte'` | ⚠️ Nombre del proyecto, no `proyecto_nombre` |
| `etapa` | String | `'Estructura'` | Etapa de obra |
| `medio_pago` | String | `'Transferencia'` | ⚠️ snake_case, no `medioPago` |
| `fecha_factura` | Timestamp | Firestore Timestamp | Fecha principal para ordenar/filtrar |
| `fecha` | Timestamp | Firestore Timestamp | Fecha alternativa (legacy) |
| `observacion` | String | `'Hierro 12mm'` | ⚠️ No `notas` ni `observaciones` |
| `empresa_id` | String | `'emp_456'` | ID de la empresa |
| `moneda` | `'ARS'` \| `'USD'` | | Moneda nativa del movimiento |

---

## Campos secundarios

| Campo | Tipo | Notas |
|-------|------|-------|
| `monto` | Number | Monto original. En general = `total`, pero `total` es el canónico |
| `totalUSD` | Number | Conversión directa: `total / tipo_cambio_dolar` |
| `subtotalUSD` | Number | Idem para subtotal |
| `tipo_cambio_dolar` | Number | TC usado para calcular `totalUSD` / `subtotalUSD` |
| `tipo_cambio_manual` | Number | TC ingresado manualmente por el usuario |
| `tipo_comprobante` | String | `'Factura A'`, `'Recibo'`, etc. |
| `numero_factura` | String | Número del comprobante |
| `imagen_url` | String | URL a la imagen del comprobante |
| `codigo` | String | Código de referencia interno |
| `estado` | String | Estado del movimiento |
| `usuario_nombre` | String | Nombre del usuario que cargó el movimiento |

---

## Estructura de `equivalencias`

Pre-calculada al crear/editar un movimiento. Permite ver cualquier movimiento en cualquier moneda sin recalcular.

```javascript
equivalencias: {
  total: {
    ars: Number,           // Monto en pesos argentinos
    usd_blue: Number,      // Monto en dólar blue
    usd_oficial: Number,   // Monto en dólar oficial
    usd_mep_medio: Number, // Monto en dólar MEP (puede ser null)
    cac: Number,           // Monto en índice CAC (puede ser null)
  },
  subtotal: {
    ars: Number,
    usd_blue: Number,
    usd_oficial: Number,
    usd_mep_medio: Number,
    cac: Number,
  }
}
```

### Cómo leer equivalencias

```javascript
// Para obtener el monto total en dólar blue:
mov.equivalencias.total.usd_blue

// Para obtener el subtotal en CAC:
mov.equivalencias.subtotal.cac

// Mapeo de display_currency → campo:
// ARS       → 'ars'
// USD       → 'usd_blue'
// CAC       → 'cac'
```

### Cuándo se (re)calculan

- Al **crear** movimiento: `generarMovimiento()` en `dataService.js`
- Al **editar** (si cambia total/type/moneda): `editarMovimiento()`
- **Recálculo masivo por proyecto**: `recalcularEquivalenciasMovimientosPorProyecto()` — recorre ARS y USD

---

## Queries de Firestore

Los movimientos se consultan **por proyecto + moneda** (no por empresa directamente, porque Firestore requiere un índice compuesto por cada combinación de where+orderBy):

```javascript
// Traer movimientos ARS de un proyecto
getDocs(query(
  collection(db, 'movimientos'),
  where('proyecto_id', '==', proyectoId),
  where('moneda', '==', 'ARS'),
  orderBy('fecha_factura', 'desc'),
))

// Traer movimientos USD de un proyecto
getDocs(query(
  collection(db, 'movimientos'),
  where('proyecto_id', '==', proyectoId),
  where('moneda', '==', 'USD'),
  orderBy('fecha_factura', 'desc'),
))
```

Para obtener todos los de una empresa: primero obtener IDs de proyectos, luego consultar cada uno.

---

## Comparación de nombres entre entidades

| Concepto | Movimientos (Firestore) | Presupuestos (MongoDB) | Stock (MongoDB) |
|----------|------------------------|----------------------|-----------------|
| Tipo | `type` = `'egreso'`/`'ingreso'` | `tipo` = `'egreso'`/`'ingreso'` | `tipo` = `'EGRESO'`/`'INGRESO'` |
| Monto | `total` (principal) + `monto` (legacy) | `monto_presupuestado` | `cantidad` |
| Proveedor | `nombre_proveedor` | — | — |
| Proyecto | `proyecto` (nombre) + `proyecto_id` | `proyecto_id` | `proyecto_id` |
| Medio pago | `medio_pago` | — | — |
| Notas | `observacion` | `observaciones` | `observacion` |

---

## Patrón de acceso en cajaProyecto.js

```javascript
// Tipo
mov.type === 'ingreso'

// Monto nativo
mov.total

// Monto en USD Blue
mov.equivalencias?.total?.usd_blue

// Contribución al saldo (ingresos suman, egresos restan)
const contribution = (mov.type === 'ingreso' ? val : -val);

// Filtro de tipo
const matchType = caja.type ? mov.type === caja.type : true;
```
