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
- `contexto`: objeto con proyecto, tipo, moneda, categorías, medios, notas, cuestionario GPT
- `batchItems`: ítems procesados por IA (OCR)
- `tabularWizard`: estado del wizard de importación (tabular)
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
| `cargaMasivaMap.js` | `mapExtractedToForm`, `emptyForm` — normaliza salida IA a formulario |
| `buildBatchMovimientoPayload.js` | Construye payload para `confirmarCargaMasiva` desde cada ítem validado |
| `BatchValidationForm.js` | Formulario de edición por ítem OCR (misma lógica de campos que comprobante único) |

## Flujo de datos OCR

```
archivos → sugerirPreguntasCargaMasiva(muestra) → preguntas GPT
         → analizarCargaMasiva(todos + contexto_lote) → items[{originalname, url_imagen, extracted, error}]
         → mapExtractedToForm → batchItems → ValidacionLoteStep
         → buildBatchMovimientoPayload → confirmarCargaMasiva → movimientos creados
```

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
- `rowIsValid`: acción (CREAR_EGRESO/INGRESO), moneda, estado, fecha, total, proyecto si la empresa tiene proyectos y es import general.

## Catálogos cargados al abrir

- Proveedores (vía `proveedorService.getNombres(empresa.id)`)
- Categorías de la empresa (excluyendo "Ingreso dinero" y "Ajuste")
- Medios de pago
- Etapas, obras, clientes
