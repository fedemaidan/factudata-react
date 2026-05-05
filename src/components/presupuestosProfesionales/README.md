# Presupuestos Profesionales — modelo mental

Esta carpeta contiene el módulo de presupuestos profesionales (UI + lógica
pura). Está pensado para usuarios no técnicos: editar el formulario debe ser
predecible y nunca debe haber cascadas silenciosas que cambien campos que el
usuario no tocó.

## Glosario

- **Rubro**: categoría de costos del presupuesto (ej. "Mampostería"). Tiene
  nombre, monto y opcionalmente subrubros (tareas).
- **Tarea / subrubro**: ítem dentro de un rubro. Tiene descripción, cantidad
  y precio unitario (campo `monto`).
- **Cantidad**: cantidad de unidades del subrubro. `null` o vacío equivale a
  `1` (compat con datos antiguos).
- **Valor unitario** (`monto` de la tarea): precio por unidad.
- **Monto efectivo** de una tarea: `(cantidad || 1) × monto`.
- **`incidencia_pct`** (derivada): porcentaje calculado a partir de los montos
  reales. Solo lectura, se muestra como chip.
- **`incidencia_objetivo_pct`** (input solo en modo distribuir): porcentaje
  que el usuario fija para que el sistema reparta el monto entre items.
- **Total neto** del presupuesto: `Σ rubro.monto`.

## Dos modos del formulario

### Modo normal (default)

> Bottom-up: el usuario edita cada tarea y los totales se calculan solos.

| Tipo | Campos |
|---|---|
| **Inputs** (TextField, editables) | `tarea.descripcion`, `tarea.cantidad`, `tarea.monto` (val. unitario), `rubro.nombre` |
| **Derivados** (Chip read-only) | `total_neto = Σ rubros`, `incidencia_pct` (rubro y tarea) |
| **Mixto** (TextField o Chip según contenido) | `rubro.monto` |
| **Ocultos** | `incidencia_objetivo_pct` (no se muestra ni se modifica) |

**Regla del `rubro.monto` en modo normal:**

- Si los subrubros tienen valor (`Σ cantidad × monto > 0`): el monto del rubro
  es **derivado** (= Σ tareas) y se ve como Chip read-only. Editar un subrubro
  recalcula el monto del rubro automáticamente.
- Si no hay subrubros, o todos están vacíos: el monto del rubro es
  **editable directamente** (TextField). Útil para rubros "sueltos" sin
  desglose. Si el usuario después agrega un subrubro con valor, el rubro pasa
  a derivado y refleja la suma; si vuelve a vaciarlos, conserva el último
  valor manual (no se pisa a cero).

Editar un input en modo normal **solo modifica campos derivados**. Nunca
sobrescribe otro input.

### Modo distribuir (toggle "Distribuir por incidencias")

> Top-down: el usuario fija un total y porcentajes, el sistema reparte montos.

| Tipo | Campos |
|---|---|
| **Inputs** | Total objetivo, `rubro.incidencia_objetivo_pct`, `tarea.incidencia_objetivo_pct` |
| **Derivados** | `rubro.monto`, `tarea.monto`, `incidencia_pct` |

Editar un % objetivo en modo distribuir redistribuye los montos según largest
remainder (ver más abajo). Editar un % objetivo en modo normal **solo persiste
el valor**, no redistribuye.

## Invariante a respetar

> **Editar un input nunca debe modificar otro input que el usuario no tocó.**

Los handlers viven en `presupuestosHandlers.js` como funciones puras:

- `aplicarUpdateTareaMonto(form, ri, ti, raw)` — escribe `tareas[ti].monto`,
  recalcula `rubro.monto`. No toca `incidencia_objetivo_pct` de nadie.
- `aplicarUpdateTareaCantidad(form, ri, ti, raw)` — análogo a monto.
- `aplicarUpdateTareaDescripcion(form, ri, ti, value)` — solo descripción.
- `aplicarRemoveTarea(form, ri, ti)` — elimina y recalcula `rubro.monto`.
- `aplicarUpdateRubro(form, idx, field, value, { modoDistribuir })` — para el
  campo `monto` solo actúa si `modoDistribuir = true`. En modo normal, el monto
  del rubro es derivado y este handler es no-op (defensivo).
- `aplicarUpdateIncidenciaObjetivoRubro(form, idx, value, { modoDistribuir, totalObjetivo })`.
- `aplicarUpdateIncidenciaObjetivoTarea(form, ri, ti, value, { modoDistribuir })`.
- `aplicarDistribuirPorTotal(form, totalStr)`.

Los handlers `pp*` en `src/pages/presupuestosProfesionales.js` son thin
wrappers que invocan estas funciones puras en `setPpForm((f) => ...)`.

## Largest remainder (Hamilton) en `incidenciaHelpers.js`

Las funciones `distribuirMontosPorIncidencia` y
`distribuirMontosPorIncidenciaTareas` reparten un total según porcentajes
usando el método de **largest remainder en centavos enteros**:

1. Cada item recibe `floor(total × pct / 100)` centavos.
2. El sobrante (centavos no asignados) se reparte uno a uno entre los items
   con mayor parte fraccional descendente.
3. Si la suma de % es < 100, el sobrante **no se inventa**: queda monto sin
   asignar (la UI muestra warning).

Beneficios:
- La suma de los montos coincide exactamente con el total cuando los % suman 100%.
- El % que el usuario escribió **no se altera** al re-render (antes el viejo
  algoritmo ajustaba la última fila y el usuario veía 50% → 50.01%).

Tests en `__tests__/incidenciaHelpers.test.js` verifican estas invariantes.

## Archivos

```
presupuestosProfesionales/
├── PresupuestoFormDialog.js     ← UI principal del formulario
├── PlantillaFormDialog.js       ← UI de plantillas
├── ImportarPlantillaDialog.js
├── PresupuestoDetalleDialog.js
├── ...
├── constants.js                  ← formatters, parsers, estados
├── incidenciaHelpers.js          ← distribución por % (largest remainder)
├── presupuestosHandlers.js       ← lógica pura de actualización del form
└── __tests__/
    ├── incidenciaHelpers.test.js
    └── presupuestosHandlers.test.js
```

## Cómo correr los tests

```bash
cd factudata-react
npm test                                      # corre todos los tests
npx jest src/components/presupuestosProfesionales  # solo este módulo
```
