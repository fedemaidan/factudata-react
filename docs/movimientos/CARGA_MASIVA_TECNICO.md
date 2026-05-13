# Carga Masiva — Documentación Técnica (Frontend)

## Arquitectura de componentes

```
CargaMasivaDialog.js          ← Componente raíz (Dialog MUI)
├── steps/CargaArchivosStep   ← Drag & drop + lista (OCR)
├── steps/PreguntasContextoStep ← Preguntas GPT + defaults lote (OCR)
├── steps/ValidacionLoteStep  ← Revisión asistida comprobante a comprobante (OCR)
├── ImportPlanillaStep         ← Upload CSV/Excel (tabular)
├── PasoRevisarCategorias      ← Mapeo categorías (tabular)
├── PasoRevisarProveedores     ← Mapeo proveedores (tabular)
├── PasoAclaracionesMovimientos ← Texto libre para IA (tabular)
├── PasoValidarMovimientosImport ← Tabla validación IA (tabular)
└── PasoResumen                ← Confirmación final (tabular)
```

## Estado local (useState)

El diálogo mantiene todo en estado local del componente:

- `mode`: `null | 'ocr' | 'tabular'`
- `step`: índice del stepper activo
- `files`: archivos subidos (File[])
- `pdfSplitPerPage`: boolean — toggle "una página = un comprobante" para PDFs multi-página (OCR). Default `false`. Solo se muestra el switch en `CargaArchivosStep` si al menos un PDF tiene >1 página (detectado en cliente vía `utils/pdfPageCount`). Se reenvía al backend en `contexto_lote.pdf_split_per_page`.
- `contexto`: objeto con proyecto, tipo, moneda, categorías, medios, notas, cuestionario GPT
- `batchItems`: ítems procesados por IA (OCR). Cada item lleva `page` y `total_pages` cuando proviene de un PDF splitteado (sino `null`).
- `tabularWizard`: estado del wizard de importación (tabular).
- `loading`, `analyzeError`, `confirmError`: estados de UI

## Servicios y endpoints

### OCR (`movimientosService.js`)

| Método | Endpoint | Tipo | Payload |
|--------|----------|------|---------|
| `sugerirPreguntasCargaMasiva` | `POST /movimiento/carga-masiva/sugerir-preguntas` | multipart | `muestra` (hasta 5 archivos) + `metadata_lote` (JSON) |
| `analizarCargaMasiva` | `POST /movimiento/carga-masiva/analizar` | multipart | `archivos` (todos) + `contexto_lote` (JSON con defaults + cuestionario) |
| `confirmarCargaMasiva` | `POST /movimiento/carga-masiva/confirmar` | JSON | `{ movimientos }` |

### Tabular (`importMovimientosService.js`)

| Método | Endpoint |
|--------|----------|
| `extraerData` | `POST /api/importar-movimientos/extraerData` |
| `previsualizar` | `POST /api/importar-movimientos/previsualizar` |
| `consultarEstadoImportacion` | `GET /api/importar-movimientos/status/:codigo` |
| `confirmarMovimientos` | `POST /api/importar-movimientos/confirmar-movimientos` |

## Archivos auxiliares

| Archivo | Función |
|---------|---------|
| `cargaMasivaPreguntasUtils.js` | `pickRandomFiles(files, 5)`, `buildContextoCuestionarioTexto`, `preguntasEstanCompletas` |
| `cargaMasivaMap.js` | `mapExtractedToForm`, `emptyForm` — normaliza salida IA a formulario. `copyShareableFields(source, target, { overwrite })` y `SHAREABLE_FIELDS` — usados por la acción "Copiar a las demás páginas" cuando un PDF se splittea. |
| `buildBatchMovimientoPayload.js` | Construye payload para `confirmarCargaMasiva` desde cada ítem validado |
| `BatchValidationForm.js` | Formulario de edición por ítem OCR (misma lógica de campos que comprobante único) |
| `utils/pdfPageCount.js` | `getPdfPageCount(file)` — lee `numPages` de un PDF en el cliente con `pdfjs-dist`. Fallback a 1 si falla. |

## Flujo de datos OCR

```
archivos → sugerirPreguntasCargaMasiva(muestra) → preguntas GPT
         → analizarCargaMasiva(todos + contexto_lote) → items[{originalname, url_imagen, extracted, error, page, total_pages}]
         → mapExtractedToForm → batchItems → ValidacionLoteStep
         → buildBatchMovimientoPayload → confirmarCargaMasiva → movimientos creados
```

`page` y `total_pages` solo vienen poblados cuando `contexto_lote.pdf_split_per_page === true` y el archivo era PDF; en ese caso el backend genera N items (uno por página) en vez de uno solo. La cantidad de items puede ser mayor que `files.length`. `ValidacionLoteStep` agrupa visualmente los items hermanos (mismo `originalname`) y ofrece navegación intra-PDF y "Copiar a las demás páginas" (vía `copyShareableFields`).

## Flujo de datos tabular

```
archivos → upload a storage → extraerData (categorías/proveedores)
         → mapeo usuario → previsualizar (polling status/:codigo)
         → filas con ia_data → validación/edición tabla
         → confirmarMovimientos → movimientos creados
```

## Validación pre-confirmación

### OCR
- `itemFormIsValid`: proyecto (si `getCamposConfig` lo requiere), total > 0, fecha_factura.
- `canConfirm`: todos los ítems no omitidos pasan `itemFormIsValid`.

### Tabular
- `rowIsValid`: acción (CREAR_EGRESO/INGRESO), moneda, estado, fecha, total, proyecto si la empresa tiene proyectos y es import general. Si `estado === 'Parcialmente Pagado'` y `accion === 'CREAR_EGRESO'`, exige `monto_pagado > 0` y `< total`.

## Estado / monto_pagado / creador (tabular)

El payload de cada fila enviado a `confirmar-movimientos` (clave `ia_data`) incluye:

- `estado`: `'Pendiente' | 'Parcialmente Pagado' | 'Pagado'` (solo si la empresa tiene `con_estados`).
- `monto_pagado`: `number | null` — solo cuando `estado === 'Parcialmente Pagado'` y `accion === 'CREAR_EGRESO'`.
- `user_phone`: teléfono del creador detectado por GPT a partir de la fila y la lista de perfiles de la empresa que el backend inyecta en el prompt (campos `phone`, `email`, `firstName`, `lastName`). Si GPT no encuentra match, queda `null`. Override manual por fila desde el `<Select label="Creador">` del modal de edición.

Doble validación del `user_phone` en backend:
1. `acciones.normalizarPayloadImportacionIA(data, datos, perfiles)` descarta valores que no pertenecen a la empresa apenas vuelve la respuesta de GPT (anti-alucinación).
2. `persistirMovimientoImportDesdeIa` revalida al confirmar y, si pertenece, arma `data.creador = { phone, firstName, lastName, id }` que `crearEgreso/IngresoSinWhatsapp` usa para los campos `user_phone` / `nombre_user` / `id_user` del documento Mongo. Si no pertenece, se ignora y se usa el del importador.

## Catálogos cargados al abrir

- Proveedores (vía `proveedorService.getNombres(empresa.id)`)
- Categorías de la empresa (excluyendo "Ingreso dinero" y "Ajuste")
- Medios de pago
- Etapas, obras, clientes
- **Perfiles de la empresa** (vía `profileService.getProfileByEmpresa(empresa.id)`) — usados para el `<Select>` "Creador" del modal de edición por fila (override manual sobre la detección de GPT). El backend carga los perfiles independientemente para inyectarlos al prompt del LLM.
