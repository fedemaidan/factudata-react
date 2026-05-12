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
- `tabularWizard`: estado del wizard de importación (tabular). Incluye `creadorDefaultPhone` (creador por defecto del lote, override-able por fila en validación).
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
- `rowIsValid`: acción (CREAR_EGRESO/INGRESO), moneda, estado, fecha, total, proyecto si la empresa tiene proyectos y es import general. Si `estado === 'Parcialmente Pagado'` y `accion === 'CREAR_EGRESO'`, exige `monto_pagado > 0` y `< total`.

## Estado / monto_pagado / creador (tabular)

El payload de cada fila enviado a `confirmar-movimientos` (clave `ia_data`) incluye:

- `estado`: `'Pendiente' | 'Parcialmente Pagado' | 'Pagado'` (solo si la empresa tiene `con_estados`).
- `monto_pagado`: `number | null` — solo cuando `estado === 'Parcialmente Pagado'` y `accion === 'CREAR_EGRESO'`.
- `user_phone`: teléfono del creador. Default = `wizardData.creadorDefaultPhone` (= `user.phone` al iniciar). Override por fila desde el `<Select label="Creador">` del modal de edición.

En backend, `persistirMovimientoImportDesdeIa` valida `data.user_phone` contra los perfiles de la empresa; si pertenece, arma `data.creador = { phone, firstName, lastName, id }` que `crearEgreso/IngresoSinWhatsapp` usa para los campos `user_phone` / `nombre_user` / `id_user` del documento Mongo. Si no pertenece, se ignora y se usa el del importador.

## Catálogos cargados al abrir

- Proveedores (vía `proveedorService.getNombres(empresa.id)`)
- Categorías de la empresa (excluyendo "Ingreso dinero" y "Ajuste")
- Medios de pago
- Etapas, obras, clientes
- **Perfiles de la empresa** (vía `profileService.getProfileByEmpresa(empresa.id)`) — usados para el selector "Creador del lote" en aclaraciones y para el override por fila en validación
