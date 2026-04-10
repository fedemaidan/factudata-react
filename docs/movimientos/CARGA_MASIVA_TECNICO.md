# Carga masiva de movimientos (web) — documento técnico

## Ubicación en el código

| Pieza | Ruta |
|-------|------|
| Diálogo orquestador | `src/components/movimientos/cargaMasiva/CargaMasivaDialog.js` |
| Paso archivos OCR | `src/components/movimientos/cargaMasiva/steps/CargaArchivosStep.js` |
| Paso contexto + GPT | `src/components/movimientos/cargaMasiva/steps/PreguntasContextoStep.js` |
| Paso validación OCR | `src/components/movimientos/cargaMasiva/steps/ValidacionLoteStep.js` |
| Formulario por ítem | `src/components/movimientos/cargaMasiva/BatchValidationForm.js` |
| Mapeo extracción → form | `src/components/movimientos/cargaMasiva/cargaMasivaMap.js` |
| Payload confirmación | `src/components/movimientos/cargaMasiva/buildBatchMovimientoPayload.js` |
| Utilidades preguntas GPT | `src/components/movimientos/cargaMasiva/cargaMasivaPreguntasUtils.js` |
| API cliente | `src/services/movimientosService.js` |

## Arquitectura del componente `CargaMasivaDialog`

### Props

- `open`, `onClose`, `onSuccess`  
- `empresa`, `proyectos`, `user` (entre otros datos necesarios para catálogos y confirmación)

### Estado principal

- `cargaModo`: `null` \| `'ocr'` \| `'tabular'` — selector inicial.  
- `activeStep`: índice dentro del stepper del modo activo.  
- **OCR**: `files`, `contexto`, `preguntasGpt`, `respuestasGpt`, `batchItems`, flags de loading/error de análisis y preguntas.  
- **Tabular**: `importWizardData` — objeto grande que alimenta los pasos reutilizados del import (`ImportPlanillaStep`, `PasoRevisarCategorias`, etc.).  
- `drawerCatalogos`: comprobante/ingreso info, proveedores, categorías, medios de pago, etapas, obras, clientes (hidratado en `useEffect` al abrir).

### Stepper

Constantes:

- `STEPS_OCR = ['Archivos', 'Contexto', 'Validación']`  
- `STEPS_TABULAR = ['Planilla', 'Categorías', 'Proveedores', 'Aclaraciones', 'Validación', 'Resumen']`

## Flujo OCR — secuencia técnica

1. **Paso 0 — Archivos**  
   - `CargaArchivosStep` mantiene `files` (máx. 50, dedupe por `name-size-lastModified`).  
   - Al pulsar “Siguiente”, `fetchPreguntasYAvanzar`:  
     - `pickRandomFiles(files, 5)` → muestra.  
     - `metadata_lote = { total, archivos: [{ name, type, size }] }`.  
     - `movimientosService.sugerirPreguntasCargaMasiva(muestra, metadata_lote)` → guarda `preguntasGpt` y avanza a paso 1.

2. **Paso 1 — Contexto**  
   - `PreguntasContextoStep` actualiza `contexto` y `respuestasGpt`.  
   - Condiciones para avanzar: `contexto.proyecto_id` definido y `preguntasEstanCompletas(preguntasGpt, respuestasGpt)`.  
   - `textoCuestionario` = `buildContextoCuestionarioTexto(preguntasGpt, respuestasGpt)` (memo).  
   - `payloadContextoLote` (memo): `proyecto_id/nombre`, `default_type`, `default_moneda`, opcionales `default_categorias`, `default_medios_pago`, `default_etapa`, `notas_lote`, `contexto_cuestionario_texto`.

3. **Paso 2 — Análisis y validación**  
   - `handleRunAnalyze` → `movimientosService.analizarCargaMasiva(files, payloadContextoLote)`.  
   - Respuesta esperada: `data.items[]` con `originalname`, `url_imagen`, `extracted`, `error`.  
   - Cada ítem se mapea a `batchItems[]` con `clientId` estable, `form` = `mapExtractedToForm(it.extracted, contextoForMap)` o `emptyForm`.  
   - `ValidacionLoteStep` + `BatchValidationForm` usan `getCamposConfig` para alinear visibilidad/required con el formulario estándar de movimientos.

4. **Confirmación**  
   - `buildMovimientoPayloadFromBatchItem` por cada ítem no omitido.  
   - `movimientosService.confirmarCargaMasiva(movimientos)` → POST JSON.  
   - Respuesta: `{ ok, errores }` tipicamente; éxito dispara `onSuccess` y `onClose`.

## Flujo tabular — integración

No duplica lógica de negocio: embebe componentes existentes de `importMovimientos`:

- `ImportPlanillaStep`  
- `PasoRevisarCategorias`, `PasoRevisarProveedores`, `PasoAclaracionesMovimientos`  
- `PasoValidarMovimientosImport`  
- `PasoResumen`

Refs (`categoriasRef`, `proveedoresRef`, etc.) exponen `submitStep()` para avanzar de forma imperativa en `handleTabularNext`. El estado vive en `importWizardData` + `updateImportWizardData`.

## Endpoints HTTP (modo OCR)

Definidos en `movimientosService.js`:

| Método | Ruta | Uso |
|--------|------|-----|
| POST (multipart) | `/movimiento/carga-masiva/sugerir-preguntas` | Campos: `muestra` (archivos), `metadata_lote` (JSON string). |
| POST (multipart) | `/movimiento/carga-masiva/analizar` | Campos: `archivos`, `contexto_lote` (JSON string). |
| POST (JSON) | `/movimiento/carga-masiva/confirmar` | Body: `{ movimientos }` — payloads alineados a movimiento estándar. |

## Mapeo de datos

- **`mapExtractedToForm`**: fusiona respuesta del backend por archivo con defaults del `contexto` (tipo, moneda, categoría/medio únicos del lote, proyecto, fechas normalizadas con `toDateInputValue`).  
- **`buildMovimientoPayloadFromBatchItem`**: convierte el formulario validado a payload de API (timestamps, subtotal derivado si aplica, `user_phone`, nombres de proyecto, etc.).

## Consideraciones de UX / reglas en código

- `itemFormIsValid` y `ValidacionLoteStep.continuarDisabled` replican reglas mínimas (proyecto si config lo pide, total y fecha).  
- `canConfirm` exige que todos los ítems no omitidos pasen `itemFormIsValid`.  
- Al cerrar el diálogo (`open === false`), `resetWizard` limpia todo el estado para la próxima apertura.

## Dependencias externas relevantes

- MUI: `Dialog`, `Stepper`, `ToggleButtonGroup`, `Alert`, etc.  
- `getCamposConfig` / `movementFieldsConfig` para paridad con el formulario único de movimiento.  
- `proveedorService.getNombres` para catálogo de proveedores al abrir.
