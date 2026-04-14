# Carga Masiva — Documentación Funcional (Frontend)

## Descripción general

La carga masiva permite al usuario crear múltiples movimientos en una sola sesión, a partir de comprobantes (imágenes/PDF) o planillas (CSV/Excel). Los dos modos son excluyentes dentro de la misma sesión.

## Flujo de usuario

### Modo comprobantes (OCR)

| Paso | Acción |
|------|--------|
| 1 | El usuario abre el diálogo "Carga masiva" y elige **Comprobantes (imagen / PDF)**. |
| 2 | **Archivos:** sube hasta 50 archivos (drag & drop o selector). Tipos: `image/*`, `.pdf`. |
| 3 | **Contexto:** se envía una muestra aleatoria de hasta 5 archivos al backend para que la IA sugiera preguntas de contexto. El usuario completa: |
|   | • Preguntas GPT dinámicas (0-5), con opciones + "Otro". |
|   | • Proyecto por defecto (obligatorio). |
|   | • Tipo por defecto (egreso / ingreso). |
|   | • Moneda por defecto (ARS / USD). |
|   | • Categorías candidatas (multi-select, opcional). |
|   | • Medios de pago candidatos (multi-select, opcional). |
|   | • Notas del lote (texto libre, opcional). |
| 4 | El sistema analiza todos los archivos con IA (GPT visión). |
| 5 | **Validación:** revisión uno a uno con navegación asistida. Cada ítem muestra la imagen/PDF y un formulario con los datos extraídos. Se puede omitir o corregir. |
| 6 | **Confirmación:** se crean los movimientos no omitidos que pasen validación (proyecto, total y fecha obligatorios). |

### Modo planilla (tabular)

| Paso | Acción |
|------|--------|
| 1 | Elige **Planilla (CSV / Excel)**. |
| 2 | **Planilla:** sube hasta 10 archivos (`.csv`, `.xlsx`, `.xls`; ~10 MB c/u). Para Excel multi-hoja, selecciona hojas. |
| 3 | **Categorías:** revisión y mapeo de categorías detectadas. |
| 4 | **Proveedores:** revisión y mapeo de proveedores detectados. |
| 5 | **Aclaraciones:** instrucciones adicionales para la IA. |
| 6 | **Validación:** tabla con filas procesadas por IA. Se puede editar, omitir o aprobar cada fila. |
| 7 | **Resumen:** confirmación final y creación de movimientos. |

## Límites y constantes

| Parámetro | Valor |
|-----------|-------|
| Máx. archivos OCR | 50 |
| Muestra para preguntas GPT | 5 (aleatoria) |
| Máx. archivos planilla | 10 |
| Tamaño máx. por planilla (UI) | 10 MB |
| Intervalo polling previsualización | 4000 ms |

## Tipos de archivo aceptados

- **OCR:** JPEG, PNG, GIF, WEBP, PDF
- **Tabular:** CSV, XLSX, XLS

## Manejo de errores

- Archivos que no se puedan analizar se marcan con error y formulario manual.
- Alertas con reintento para fallas de red o análisis.
- Validación de campos obligatorios antes de confirmar (proyecto si aplica, total, fecha).
