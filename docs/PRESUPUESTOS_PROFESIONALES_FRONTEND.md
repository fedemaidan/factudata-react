# Presupuestos Profesionales – Frontend

> Documentación del módulo frontend para la gestión de Presupuestos Profesionales en SorbyData.

---

## Índice

1. [Resumen](#resumen)
2. [Archivos y estructura](#archivos-y-estructura)
3. [Arquitectura y patrones](#arquitectura-y-patrones)
4. [Estructura de la página](#estructura-de-la-página)
5. [Modelo de cálculos del formulario](#modelo-de-c%C3%A1lculos-del-formulario)
6. [Moneda y ajuste monetario](#moneda-y-ajuste-monetario)
7. [Análisis de superficies y costo por m²](#an%C3%A1lisis-de-superficies-y-costo-por-m%C2%B2)
8. [Plantilla SorbyData](#plantilla-sorbydata)
9. [Export a PDF](#export-a-pdf)
10. [Service – endpoints consumidos](#service--endpoints-consumidos)
11. [Modelos de datos (referencia)](#modelos-de-datos-referencia)
12. [Componentes y diálogos](#componentes-y-di%C3%A1logos)
13. [Hooks](#hooks)
14. [Flujos de usuario](#flujos-de-usuario)
15. [Convenciones y decisiones de diseño](#convenciones-y-decisiones-de-dise%C3%B1o)
16. [Tests](#tests)
17. [Pendientes / Iteraciones futuras](#pendientes--iteraciones-futuras)

---

## Resumen

El módulo de **Presupuestos Profesionales** permite a constructoras crear, gestionar y seguir presupuestos de obra con rubros/tareas, manejo de estados (workflow), versionado con equivalencias CAC/USD, y modificaciones post-aceptación vía anexos.

**URL de la página:** `/presupuestosProfesionales`

**Funcionalidades principales:**
- CRUD de presupuestos y plantillas
- Al aceptar: modal para asignar proyecto y tipo (ingreso/egreso), crea presupuestos de control en Firebase de rubros
- Moneda ARS/USD con opciones de ajuste (Pesos fijos, CAC, dólar) y override manual de cotización
- Base de cálculo contra facturas (`total` o `subtotal`)
- Análisis de superficies ponderado (cubierta, patios, vereda) → costo por m² en ARS, USD y CAC
- Personalización visual del encabezado PDF (color de fondo, color de texto, escala de logo)
- Plantilla predefinida SorbyData (9 rubros estándar)
- Export a PDF client-side con `@react-pdf/renderer`; diálogo de opciones para incluir/excluir costo por m²
- Vista previa del PDF antes de guardar el presupuesto
- Importación de plantillas desde archivo (Excel/PDF/imagen)
- Carga de logo en el form de presupuesto (se envía junto al alta, soporte de 12+ formatos)

---

## Archivos y estructura

### Página y hooks

| Archivo | Descripción |
|---|---|
| `src/pages/presupuestosProfesionales.js` | Página principal con tabs, estado y orquestación |
| `src/hooks/presupuestosProfesionales/usePresupuestosList.js` | Hook para listar presupuestos con filtros y paginación |
| `src/hooks/presupuestosProfesionales/usePlantillasList.js` | Hook para listar plantillas de la empresa |
| `src/hooks/presupuestosProfesionales/usePlantillas.js` | Hook alternativo de plantillas |
| `src/hooks/presupuestosProfesionales/usePlantillaImport.js` | Hook para importar plantilla desde archivo |
| `src/hooks/presupuestosProfesionales/usePresupuestos.js` | Hook de presupuestos individual |
| `src/hooks/presupuestosProfesionales/usePresupuestosData.js` | Hook alternativo de datos de presupuestos |
| `src/hooks/presupuestosProfesionales/useRubrosEditor.js` | Hook para gestión de estado del editor de rubros |
| `src/hooks/presupuestosProfesionales/useAlert.js` | Hook de alertas/snackbar local |
| `src/hooks/presupuestosProfesionales/index.js` | Barrel exports |

### Componentes

| Archivo | Descripción |
|---|---|
| `src/components/presupuestosProfesionales/PresupuestoFormDialog.js` | Form crear/editar presupuesto (rubros, moneda, colores, notas, superficies, preview PDF) |
| `src/components/presupuestosProfesionales/PresupuestoPdfFullPreviewDialog.js` | Diálogo de vista previa completa del PDF (antes de guardar) |
| `src/components/presupuestosProfesionales/PresupuestoPdfPreviewInner.js` | Componente interno del preview con @react-pdf/renderer |
| `src/components/presupuestosProfesionales/PresupuestoDeleteDialog.js` | Confirmación de eliminación |
| `src/components/presupuestosProfesionales/PresupuestoDetalleDialog.js` | Detalle con sub-tabs (rubros, versiones, historial, anexos) |
| `src/components/presupuestosProfesionales/AceptarPresupuestoModal.js` | Modal para aceptar presupuesto: selección de proyecto antes de crear control |
| `src/components/presupuestosProfesionales/AgregarAnexoDialog.js` | Form para agregar anexo (solo aceptado) |
| `src/components/presupuestosProfesionales/PlantillaFormDialog.js` | Form crear/editar plantilla |
| `src/components/presupuestosProfesionales/PlantillaDeleteDialog.js` | Confirmación de eliminación de plantilla |
| `src/components/presupuestosProfesionales/ImportarPlantillaDialog.js` | Upload de archivo para crear plantilla |
| `src/components/presupuestosProfesionales/PresupuestosFilters.js` | Filtros (título, estado, moneda) |
| `src/components/presupuestosProfesionales/PresupuestosFiltrosBar.js` | Barra de filtros alternativa |
| `src/components/presupuestosProfesionales/PresupuestosTableRow.js` | Fila expandible de presupuesto con acciones |
| `src/components/presupuestosProfesionales/PresupuestosTable.js` | Tabla wrapper de presupuestos |
| `src/components/presupuestosProfesionales/PlantillasTable.js` | Tabla de plantillas (incluye fila Plantilla SorbyData) |
| `src/components/presupuestosProfesionales/PlantillasToolbar.js` | Toolbar sobre la tabla de plantillas |
| `src/components/presupuestosProfesionales/index.js` | Barrel exports |

### Utilidades y constantes

| Archivo | Descripción |
|---|---|
| `src/components/presupuestosProfesionales/constants.js` | ESTADOS, MONEDAS, TRANSICIONES_VALIDAS, TEXTO_NOTAS_DEFAULT, PLANTILLA_SORBYDATA, helpers de formato y parseo numérico |
| `src/components/presupuestosProfesionales/monedaAjusteConfig.js` | INDEXACION_VALUES, CAC_TIPOS, USD_FUENTES, USD_VALORES, toMesAnterior, normalizarAjusteMoneda |
| `src/components/presupuestosProfesionales/incidenciaHelpers.js` | `plantillaRubrosToPresupuestoRubros`, `distribuirMontosPorIncidencia`, `distribuirMontosPorIncidenciaTareas` (largest remainder en centavos enteros) |
| `src/components/presupuestosProfesionales/presupuestosHandlers.js` | Funciones puras de actualización del form: `aplicarUpdateTareaMonto`, `aplicarUpdateTareaCantidad`, `aplicarUpdateRubro`, `aplicarUpdateIncidenciaObjetivo*`, `aplicarDistribuirPorTotal`, `sumaEfectivaTareas`. Garantizan la invariante "no cascada" (ver §5) |
| `src/components/presupuestosProfesionales/README.md` | Modelo mental del módulo: glosario, los dos modos, invariantes, lista de handlers |
| `src/components/presupuestosProfesionales/__tests__/` | Tests unitarios con Jest (`incidenciaHelpers.test.js`, `presupuestosHandlers.test.js`) |
| `src/utils/presupuestos/exportPresupuestoToPdfRenderer.js` | Export PDF con @react-pdf/renderer — flujo principal + cálculo costoM2 |
| `src/utils/presupuestos/exportPresupuestoToPdf.js` | Export PDF con jspdf (alternativo) |
| `src/utils/presupuestos/PdfPresupuestoDocument.js` | Componente React para render del PDF |
| `src/utils/presupuestos/buildPresupuestoDraftForPdfPreview.js` | Construye borrador para la vista previa del PDF |
| `src/utils/presupuestos/loadLogoForPdf.js` | Carga logo para PDF (proxy CORS, conversión WebP→PNG) |
| `src/utils/presupuestos/logoFileValidation.js` | Validación de tipo y tamaño del archivo de logo |
| `src/utils/presupuestos/presupuestoAdjuntosFirebase.js` | Helpers de Firebase Storage para adjuntos |
| `src/utils/presupuestos/presupuestoM2Base.js` | Calcula superficie ponderada base para costo por m² |

### Service

| Archivo | Descripción |
|---|---|
| `src/services/presupuestoProfesional/presupuestoProfesionalService.js` | CRUD presupuestos y plantillas |
| `src/services/presupuestoService.js` | Crear presupuestos de control en Firebase (usado al aceptar) |
| `src/services/proxyService.js` | Proxy de imágenes (getImageProxyUrl) |

---

## Arquitectura y patrones

```
Page (presupuestosProfesionales.js)
  ├─ Layout: DashboardLayout (withAuthGuard)
  ├─ Hooks: usePresupuestosList, usePlantillasList, usePlantillaImport
  ├─ Service: presupuestoProfesionalService.js (axiosConfig)
  ├─ Auth: useAuthContext() → getEmpresaDetailsFromUser(user)
  └─ Componentes: PresupuestosFilters, PresupuestosTableRow, PlantillasTable, diálogos
```

### Decisiones clave

| Decisión | Justificación |
|---|---|
| Hooks extraídos | usePresupuestosList, usePlantillasList, usePlantillaImport, useRubrosEditor reducen complejidad de la página |
| Componentes de tabla separados | PresupuestosTableRow (fila expandible), PlantillasTable (tabla completa) |
| useState + useEffect | Patrón del proyecto; sin React Query |
| Import dinámico para PDF | `import('../utils/presupuestos/exportPresupuestoToPdfRenderer')` para code-splitting |
| PDF client-side | @react-pdf/renderer en el navegador; sin endpoint de PDF en el backend |

---

## Estructura de la página

### Tab 0: Presupuestos

- **Filtros:** título, estado, moneda (PresupuestosFilters)
- **Tabla:** PresupuestosTableRow con expansión de rubros
- **Acciones por fila:**
  - 👁️ Ver detalle
  - 📄 Exportar PDF
  - ✏️ Editar (solo borrador)
  - 📎 Agregar anexo (solo aceptado)
  - 🗑️ Eliminar (solo borrador)
- **Estado:** Select inline en la columna Estado para cambiar entre transiciones válidas
- **Paginación:** server-side (page, limit)

### Tab 1: Plantillas de Rubros

- **Fila fija:** Plantilla SorbyData (chip "Sistema", solo Duplicar)
- **Tabla:** plantillas propias con Editar, Duplicar, Eliminar
- **Botones:** Importar archivo, Nueva plantilla

---

## Modelo de cálculos del formulario

> Versión condensada. Para un walkthrough con ejemplos ver
> `src/components/presupuestosProfesionales/README.md`.

### Glosario

- **Rubro**: categoría con nombre, monto y opcionalmente subrubros (tareas).
- **Tarea / subrubro**: ítem dentro de un rubro con descripción, cantidad y
  precio unitario (`monto`). `cantidad = null` equivale a `1` (compat con
  datos antiguos).
- **Monto efectivo de una tarea**: `(cantidad || 1) × monto`.
- **`incidencia_pct`** (derivada): porcentaje calculado a partir de los
  montos reales. Solo lectura, se muestra como Chip outlined.
- **`incidencia_objetivo_pct`** (input solo en modo distribuir): porcentaje
  que el usuario fija para que el sistema reparta el monto.

### Dos modos del formulario

#### Modo normal (default — bottom-up)

| Tipo | Campos |
|---|---|
| **Inputs** (TextField) | `tarea.descripcion`, `tarea.cantidad`, `tarea.monto`, `rubro.nombre` |
| **Mixto** (TextField o Chip) | `rubro.monto` (ver regla más abajo) |
| **Derivados** (Chip read-only) | `total_neto = Σ rubros`, `incidencia_pct` (rubro y tarea) |
| **Ocultos** | `incidencia_objetivo_pct` (no se muestra ni se modifica) |

**Regla del `rubro.monto` en modo normal:**
- Si los subrubros tienen valor (`Σ cantidad × monto > 0`) → es **derivado**
  (`= Σ tareas`) y se ve como Chip read-only. Editar un subrubro recalcula el
  rubro automáticamente.
- Si no hay subrubros, o todos están vacíos → es **editable directamente**
  (TextField). Útil para rubros "sueltos" sin desglose.
- Transición transparente: si el usuario suma un subrubro con valor, el rubro
  pasa a derivado y refleja la suma. Si vuelve a vaciar todos, el monto vuelve
  a ser editable y se preserva el último valor manual (no se pisa a cero).

#### Modo distribuir (toggle "Distribuir por incidencias" — top-down)

| Tipo | Campos |
|---|---|
| **Inputs** | Total neto objetivo, `rubro.incidencia_objetivo_pct`, `tarea.incidencia_objetivo_pct` |
| **Derivados** | `rubro.monto`, `tarea.monto` (recalculados por la distribución) |

Editar un % objetivo redistribuye los montos según largest remainder. Editar
un % objetivo en modo normal **solo persiste el valor**, no redistribuye
(antes esto generaba cascadas confusas).

### Invariante crítica

> **Editar un input nunca debe modificar otro input que el usuario no tocó.**

Los handlers en `presupuestosHandlers.js` son funciones puras y se testean
para garantizar esta invariante. Editar `tarea.monto` o `tarea.cantidad`
solo recalcula `rubro.monto` (cuando corresponde) — no toca
`incidencia_objetivo_pct` de nadie. Editar el `% objetivo` de una tarea en
modo normal solo persiste el valor.

### Largest remainder en `incidenciaHelpers.js`

`distribuirMontosPorIncidencia` y `distribuirMontosPorIncidenciaTareas`
reparten un total según porcentajes con **largest remainder en centavos
enteros**:

1. Cada item recibe `floor(total × pct / 100)` centavos.
2. El sobrante se asigna uno a uno entre los items con mayor parte fraccional.
3. Si la suma de % es < 100, el sobrante **no se inventa**: queda monto sin
   asignar y la UI muestra warning ("Falta X% sin asignar").

Beneficios: la suma coincide exactamente con el total cuando los % suman
100%, y el % escrito por el usuario nunca se altera al re-render.

### Advertencias en el formulario

| Caso | UI | Severidad |
|---|---|---|
| Modo distribuir, Σ % rubros > 100 | Texto al lado del Total | Error |
| Modo distribuir, Σ % rubros < 100 | Texto al lado del Total | Warning |
| Modo distribuir, Σ % tareas dentro de un rubro fuera de rango | Banner por rubro | Error/Warning |
| Modo distribuir, `Σ rubros.monto ≠ totalObjetivo` (desfase > $1) | Banner debajo del Total: "Desfase con el total objetivo: el total real es … (±… respecto al objetivo de …). Se produjo por editar cantidad o precio en algún subrubro." | Warning |
| Modo normal | Sin warnings de inconsistencia (todo se autocalcula consistentemente) | — |

---

## Moneda y ajuste monetario

### Opciones por moneda

| Moneda | Modos |
|---|---|
| **ARS** | Pesos fijos, Ajustar por CAC, Ajustar por dólar |
| **USD** | Siempre ajuste por dólar (configurable) |

### Si Ajustar por CAC

- **Tipo:** Promedio, Mano de Obra, Materiales
- **Cotización:** Se obtiene el índice CAC del **mes anterior** usando `toMesAnterior`, que retorna **2 meses previos** a la fecha dada (el índice CAC se publica con retraso de ~1 mes)

### Si Ajustar por dólar (ARS o USD)

- **Fuente:** USD Oficial, USD Blue
- **Referencia:** Compra, Venta, Promedio

### Override manual de cotización

El formulario permite ingresar una cotización personalizada en lugar de la obtenida automáticamente. El valor se guarda en `cotizacion_snapshot` con los metadatos correspondientes.

### Persistencia

Al guardar se congela la cotización en `cotizacion_snapshot`:

```js
{
  tipo: 'CAC' | 'USD',
  fuente: 'cac' | 'oficial' | 'blue',
  referencia: 'general' | 'mano_obra' | 'materiales' | 'compra' | 'venta' | 'promedio',
  valor: number,
  fecha_origen: string  // ej: "2026-02" (CAC) o "2026-03-04" (USD)
}
```

**Archivos clave:** `monedaAjusteConfig.js`, `PresupuestoFormDialog.js` (MonedaAjusteBlock)

### Base de cálculo contra facturas

El form permite definir cómo comparar contra facturas:

- `total`: suma con impuestos
- `subtotal`: suma neta sin impuestos

Se persiste en el campo `base_calculo` (default: `total`).

### Detalle monetario en PresupuestoDetalleDialog

En el encabezado del diálogo de detalle, debajo de la moneda se muestra un resumen condicional (`DetalleMonetarioResumen`):

- **ARS:** Pesos fijos, Índice CAC (tipo: Promedio/Mano de obra/Materiales), o Dólar (fuente + valor)
- **USD:** Dólar Oficial/Blue + Compra/Venta/Promedio (si está configurado)
- **Base de cálculo:** Total (con imp.) o Neto (sin imp.)

Solo se muestran los campos relevantes; no se muestran valores nulos.

---

## Análisis de superficies y costo por m²

### Campos del bloque `analisis_superficies`

| Campo | Tipo | Descripción |
|---|---|---|
| `sup_cubierta_m2` | Number | Superficie cubierta (pondera 100%) |
| `sup_patios_m2` | Number | Superficie patios (antes de aplicar coeficiente) |
| `coef_patios` | Number (0–1) | Coeficiente de ponderación de patios (default 0.5) |
| `sup_vereda_m2` | Number | Superficie vereda (antes de aplicar coeficiente) |
| `coef_vereda` | Number (0–1) | Coeficiente de ponderación de vereda |
| `sup_ponderada_m2` | Number | Total ponderado (calculado) |

**Fórmula:** `sup_ponderada_m2 = sup_cubierta_m2 + sup_patios_m2 × coef_patios + sup_vereda_m2 × coef_vereda`

El bloque es informativo: su valor solo se usa para calcular costos por m² en el PDF. No impacta en `total_neto` ni en ningún cálculo de presupuesto.

**Archivo:** `presupuestoM2Base.js` expone `calcularM2Base(analisis_superficies)`.

### Costo por m² en el PDF

La función `calcularCostoM2DataForPdf(presupuesto)` en `exportPresupuestoToPdfRenderer.js` calcula:

- **costoM2Ars**: `totalActualizado / sup_ponderada_m2`
- **costoM2Usd**: si moneda=USD → `totalActualizado / sup_ponderada_m2`; si moneda=ARS → `(totalActualizado / tipoCambio) / sup_ponderada_m2`
- **costoM2Cac**: `(totalActualizado / tipoCambio / valorCac) / sup_ponderada_m2`

Los tipos de cambio se resuelven desde `cotizacion_snapshot`, o, si no existe, desde las APIs de dólar/CAC del mes de referencia.

Retorna `null` si no hay superficie ponderada o el total es ≤ 0.

---

## Plantilla SorbyData

Plantilla predefinida del sistema (no se guarda en backend). ID especial: `sorbydata`.

**Rubros incluidos (9):**
1. Demolición
2. Albañilería General
3. Instalación Sanitaria
4. Instalación Eléctrica
5. Colocaciones de Placas de Porcelanato y/o Marmetas
6. Pintura
7. Instalación de Toma Corrientes, Llaves de Enc. y Artef. de Iluminación
8. Colocación de Artefactos Sanitarios, Griferías y Accesorios
9. Varios

**Uso:**
- Selector "Cargar rubros desde plantilla" en el form de presupuesto (siempre visible)
- Fila en tabla de plantillas con acción "Duplicar como nuevo presupuesto"
- Si la plantilla tiene notas vacías, se usa `TEXTO_NOTAS_DEFAULT`

**Constantes:** `PLANTILLA_SORBYDATA_ID`, `PLANTILLA_SORBYDATA` en `constants.js`

---

## Export a PDF

### Flujo principal

1. Usuario hace clic en "Exportar PDF" (fila o detalle)
2. Se abre un diálogo de opciones: el usuario elige si **incluir costo por m²** (`incluirTotalesM2`)
3. Se obtiene el presupuesto completo vía `obtenerPorId`
4. Import dinámico de `exportPresupuestoToPdfRenderer`
5. Si `incluirTotalesM2`: se calcula `costoM2Data` (ARS, USD, CAC) usando `cotizacion_snapshot` o APIs (MonedasService, cacService)
6. Se genera PDF con `@react-pdf/renderer` y se descarga

### Contenido del PDF

- **Encabezado (fondo configurable):**
  - Color de fondo: `header_bg_color` (default `#0a4791`)
  - Color de texto: `header_text_color` (default blanco)
  - Dirección de obra arriba a la izquierda
  - Fecha arriba a la derecha
  - Logo centrado (escala por `logo_pdf_escala` 0.5–2.0) o nombre de empresa si no hay logo
- Tabla de rubros y tareas con columnas: #, Descripción, Total, Inc.%
- TOTAL PRESUPUESTO
- **Total en USD/CAC** (si aplica): valor + (Fuente, Referencia, Fecha) entre paréntesis
- Con anexos: tabla de anexos + RESUMEN CONTRACTUAL + Total actualizado + Total en USD/CAC
- **Costo por m²** (si `incluirTotalesM2` y hay datos): ARS, USD, CAC
- Notas / Condiciones
- Análisis de superficies (superficies sin decimales)
- Footer fijo: "Este documento no es válido como factura." + numeración de páginas

### Vista previa antes de guardar

`PresupuestoPdfFullPreviewDialog` (con `PresupuestoPdfPreviewInner`) permite ver el PDF generado en tiempo real con los datos del borrador antes de guardar. Se usa `buildPresupuestoDraftForPdfPreview.js` para construir el objeto de preview.

### Personalización del encabezado

En el `PresupuestoFormDialog` hay un bloque `HeaderColorBlock` con dos campos `ColorInput`:
- `header_bg_color`: hex del fondo (default `#0a4791`)
- `header_text_color`: hex del texto (default blanco)

Estos campos se persisten en el documento del presupuesto.

### Formatos de logo soportados

JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF, ICO, SVG, HEIC/HEIF (fotos iPhone), máximo 8 MB. Validación en `logoFileValidation.js`.

### Carga del logo

El logo se obtiene de `empresa_logo_url` (Firebase Storage). Para evitar CORS y soportar WebP, se usa:
- `loadLogoForPdf.js`: si la URL es de GCS/Firebase, se pasa por proxy backend (`/proxy/image`) y se convierte a PNG vía canvas.

### Archivos

- `exportPresupuestoToPdfRenderer.js` – flujo principal + cálculo costoM2
- `PdfPresupuestoDocument.js` – componente React del documento
- `buildPresupuestoDraftForPdfPreview.js` – borrador para preview
- `exportPresupuestoToPdf.js` – alternativa con jspdf
- `loadLogoForPdf.js` – carga y conversión de imagen para PDF
- `logoFileValidation.js` – validación de archivo de logo

---

## Service – endpoints consumidos

Base URL: `/presupuestos-profesionales`

### Presupuestos

| Método | Endpoint | Nota |
|---|---|---|
| `crear(data, logoFile?)` | POST / | multipart si hay logo |
| `listar(filters)` | GET / | soporta `empresa_id`, `proyecto_id`, `estado`, `moneda`, `titulo`, `sort`, `limit`, `page` |
| `obtenerPorId(id)` | GET /:id | |
| `actualizar(id, data, logoFile?)` | PUT /:id | multipart si hay logo |
| `eliminar(id)` | DELETE /:id | |
| `actualizarRubros(id, rubros)` | PUT /:id/rubros | Reemplaza array completo; recalcula totales e incidencias |
| `cambiarEstado(id, estado, meta)` | PUT /:id/estado | |
| `agregarAnexo(id, data)` | POST /:id/anexo | |

#### Crear/actualizar con logo

Ambos endpoints (`POST /` y `PUT /:id`) soportan `multipart/form-data`:
- `payload`: JSON string con el presupuesto
- `logo`: archivo imagen (`image/*`, máx 8MB)

El backend sube la imagen a Firebase Storage y guarda la URL en `empresa_logo_url`.

### Plantillas

| Método | Endpoint |
|---|---|
| `crearPlantilla(data)` | POST /plantillas |
| `listarPlantillas(empresaId, soloActivas)` | GET /plantillas/:empresaId |
| `obtenerPlantilla(id)` | GET /plantillas/detalle/:id |
| `actualizarPlantilla(id, data)` | PUT /plantillas/:id |
| `eliminarPlantilla(id)` | DELETE /plantillas/:id |
| `uploadPlantilla(files, empresaId, nombre, tipo)` | POST /plantillas/upload |

---

## Modelos de datos (referencia)

### Presupuesto Profesional (campos principales)

```
empresa_id, proyecto_id, proyecto_nombre,
titulo, obra_direccion, fecha, fecha_presupuesto,
moneda (ARS|USD), total_neto,
indexacion (CAC|USD|null), cac_tipo, usd_fuente, usd_valor,
base_calculo (total|subtotal),
cotizacion_snapshot { tipo, fuente, referencia, valor, fecha_origen },
empresa_logo_url, logo_pdf_escala (0.5–2.0), header_bg_color ('#RRGGBB'), header_text_color ('#RRGGBB'),
rubros[{
  nombre, orden, monto,
  incidencia_pct,                  // calculada
  incidencia_objetivo_pct (Number|null),         // input solo en modo distribuir
  tareas[{
    descripcion, orden,
    monto,                         // valor unitario
    cantidad,                      // null = 1 (compat con datos antiguos)
    incidencia_pct,                // calculada
    incidencia_objetivo_pct,       // input solo en modo distribuir
  }],
}],
notas_texto, analisis_superficies {
  sup_cubierta_m2, sup_patios_m2, coef_patios,
  sup_vereda_m2, coef_vereda, sup_ponderada_m2
},
estado, historial_estados[], version_actual, versiones[], anexos[]
```

### Plantilla de Rubros

```
empresa_id, nombre, tipo, activa, notas,
rubros[{
  nombre, incidencia_pct_sugerida,
  tareas[{ descripcion, incidencia_pct_sugerida }]
}],
archivo_origen { url, tipo_archivo, nombre_original }
```

---

## Componentes y diálogos

| Componente | Propósito |
|---|---|
| PresupuestoFormDialog | Crear/editar presupuesto (rubros, moneda, ajuste, colores de header, notas, superficies, preview PDF) |
| PresupuestoPdfFullPreviewDialog | Vista previa completa del PDF antes de guardar |
| PresupuestoPdfPreviewInner | Componente interno del preview (@react-pdf/renderer) |
| AceptarPresupuestoModal | Modal al cambiar estado a aceptado: selecciona proyecto, crea presupuestos de control en Firebase |
| PresupuestoDeleteDialog | Confirmación eliminar |
| PresupuestoDetalleDialog | Detalle (rubros, versiones, historial, anexos) + export PDF. Encabezado con moneda, detalle monetario, total, dirección, versión |
| AgregarAnexoDialog | Agregar anexo (tipo, motivo, monto, impacto, fecha, detalle) |
| PlantillaFormDialog | Crear/editar plantilla |
| PlantillaDeleteDialog | Confirmación eliminar plantilla |
| ImportarPlantillaDialog | Upload archivo → plantilla |
| PresupuestosFilters | Filtros de tabla |
| PresupuestosFiltrosBar | Barra de filtros alternativa |
| PresupuestosTableRow | Fila expandible con select de estado inline y acciones |
| PresupuestosTable | Tabla wrapper |
| PlantillasTable | Tabla completa (SorbyData + plantillas propias) |
| PlantillasToolbar | Toolbar con botones Importar y Nueva plantilla |

---

## Hooks

| Hook | Parámetros | Retorno |
|---|---|---|
| usePresupuestosList | empresaId, currentTab, ppPage, ppRowsPerPage, filtros, showAlert | presupuestos, presupuestosLoading, totalPresupuestos, refreshPresupuestos |
| usePlantillasList | empresaId, currentTab, showAlert | plantillas, plantillasLoading, refreshPlantillas |
| usePlantillaImport | empresaId, showAlert, onSuccess, onClose | open, loading, handleFile, resetImportDialog |
| useRubrosEditor | rubrosInit | rubros, handlers de CRUD/reorden, distribuirPorIncidencia |
| usePresupuestosData | empresaId, filters | presupuestos, loading, total, refresh |

---

## Flujos de usuario

### Crear presupuesto desde cero

1. Tab Presupuestos → Nuevo presupuesto
2. Completar título, moneda, dirección, fecha
3. Configurar ajuste monetario (Pesos fijos / CAC / Dólar) y cotización
4. Agregar rubros manualmente (o cargar desde Plantilla SorbyData / plantilla propia)
5. Editar notas (TEXTO_NOTAS_DEFAULT si no hay plantilla)
6. Opcional: completar análisis de superficies
7. Opcional: personalizar colores del header PDF y escala de logo
8. Opcional: Vista previa del PDF
9. Guardar → borrador

### Crear presupuesto desde Plantilla SorbyData

1. Tab Presupuestos → Nuevo presupuesto
2. Combo "Cargar rubros desde plantilla" → Plantilla SorbyData
3. Rubros pre-cargados con monto 0; completar montos
4. Notas = TEXTO_NOTAS_DEFAULT (plantilla sin notas)
5. Guardar

### Crear presupuesto desde tab Plantillas

1. Tab Plantillas → Duplicar (Plantilla SorbyData o plantilla propia)
2. Cambia a tab Presupuestos con form abierto
3. Completar datos + montos
4. Guardar

### Export a PDF

1. Desde fila: ícono exportar → diálogo de opciones (incluir/excluir m²)
2. Desde detalle: botón Exportar PDF → mismo diálogo
3. Presupuesto completo → PDF con rubros, equivalencias, costo m² (si se eligió), anexos (si los hay)

### Ciclo de vida y cambio de estado

El cambio de estado se realiza **inline en la columna Estado** de la tabla.

```
borrador → enviado, rechazado, vencido
enviado  → aceptado, rechazado, vencido
rechazado → borrador
vencido   → borrador
aceptado  → (sin transiciones; modificaciones vía anexos)
```

### Aceptar presupuesto → Control de presupuestos

Cuando el usuario selecciona **aceptado**:

1. Se abre **AceptarPresupuestoModal**.
2. El usuario debe seleccionar un **Proyecto** (obligatorio).
3. Al confirmar:
   - Se crean presupuestos de control en Firebase (uno por rubro) vía `presupuestoService.crearPresupuesto`.
   - Mapeo: `etapa` = `rubro.nombre`, `monto` = `rubro.monto`, se copian `moneda`, `indexacion`, `base_calculo`, `fecha_presupuesto`, `cac_tipo`, `cotizacion_override` (desde `cotizacion_snapshot`).
   - Los anexos existentes se distribuyen proporcionalmente entre los presupuestos de control.
   - Solo si todos se crean correctamente, se llama a `cambiarEstado(id, 'aceptado')`.
4. Si no hay proyectos disponibles, el modal muestra "No hay proyectos. Creá uno primero."

---

## Convenciones y decisiones de diseño

| Aspecto | Decisión |
|---|---|
| Formato moneda | `Intl.NumberFormat` es-AR, style currency |
| Formato fecha | `toLocaleDateString('es-AR')` |
| Chips estado | default, info, success, error, warning |
| CAC | `toMesAnterior` devuelve 2 meses previos (publicación retrasada) |
| Plantillas vacías | notas = TEXTO_NOTAS_DEFAULT |
| Textos | Español argentino (vos) |
| Inputs vs derivados | Inputs como TextField; derivados como Chip read-only (con tooltip "Calculado a partir de…" cuando aplica) |
| Cascadas | Editar un input solo afecta campos derivados; nunca a otros inputs (ver §5) |
| Distribución por % | Largest remainder en centavos enteros; nunca se ajusta el último renglón silenciosamente |
| Parseo numérico | `parseNumberInput`: último `.` o `,` = decimal; `.` anteriores = miles. Acepta `1.000.000`, `20.5`, `20,5` |
| PDF | Client-side con @react-pdf/renderer; sin endpoint de PDF en el backend |
| Header PDF | Colores customizables por presupuesto; default azul Sorby `#0a4791` |
| Logo PDF | Escala 50%–200% configurable en el form |

---

## Tests

Configuración Jest minimalista (no afecta la build de Next, que sigue usando SWC):

- `babel.config.js`: presets babel solo cuando `NODE_ENV=test`.
- `jest.config.js`: `testEnvironment: 'node'`, busca `**/__tests__/**/*.test.js`.
- Script: `npm test`.

### Suites

| Archivo | Cobertura |
|---|---|
| `src/components/presupuestosProfesionales/__tests__/incidenciaHelpers.test.js` | `distribuirMontosPorIncidencia` (casos: centavos, percentajes que suman <100 o >100, respeto de `cantidad`) |
| `src/components/presupuestosProfesionales/__tests__/presupuestosHandlers.test.js` | Invariante "no cascada" para cada handler en modo normal; redistribución correcta en modo distribuir; preservación del monto manual cuando todas las tareas quedan vacías |

Total actual: **34 tests, todos passing**.

Para correr solo este módulo: `npx jest src/components/presupuestosProfesionales`.

---

## Pendientes / Iteraciones futuras

### Iteración 2

- [ ] **Drag & drop** para reordenar rubros (actualmente flechas arriba/abajo)
- [ ] **Navegación lateral** – ítem en SideNav si se incluye en menú principal

### Iteración 3

- [ ] **Portal del cliente** – vista pública para ver/aceptar presupuesto
- [ ] **Comparador de versiones** – diff entre versiones congeladas
- [ ] **Notificaciones** – alertas al cambiar estado

### Mejoras técnicas

- [ ] Migrar a useFetch para reducir boilerplate
- [ ] Extraer editor de rubros a componente reutilizable
- [ ] Validaciones más robustas (ej: al menos un rubro)
- [ ] Tests unitarios del service
- [x] Tests unitarios de helpers de cálculo y handlers del form (`incidenciaHelpers`, `presupuestosHandlers`)
- [x] Largest remainder para distribución por porcentajes (sin ajustes silenciosos al re-render)
- [x] Eliminar cascadas confusas: editar un input no modifica otros inputs

---

*Última actualización: 2026-05-04 — Documento fusionado: modelo de cálculos, análisis m², personalización PDF, handlers puras y tests.*
