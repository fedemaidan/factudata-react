# Carga masiva de movimientos (web) — documento funcional

## Objetivo

Permitir crear **varios movimientos** en una sola sesión desde la aplicación web, sin mezclar en la misma corrida **comprobantes** (imagen/PDF) con **planillas** (CSV/Excel). El usuario elige un modo al inicio y sigue un asistente por pasos.

## Punto de entrada en la UI

El flujo vive en el diálogo **“Carga masiva de movimientos”** (`CargaMasivaDialog`). Al abrirlo, el usuario ve dos opciones exclusivas:

| Modo | Qué permite |
|------|-------------|
| **Comprobantes (imagen / PDF)** | Subir hasta **50** archivos de imagen o PDF; el sistema los interpreta con OCR/visión y propone un movimiento por archivo. |
| **Planilla (CSV / Excel)** | Reutiliza el asistente de importación por planilla: análisis del archivo, mapeo de categorías/proveedores, aclaraciones, validación y resumen antes de persistir. |

No se pueden combinar comprobantes y planillas en la **misma** sesión del diálogo.

## Modo comprobantes (OCR) — pasos para el usuario

El stepper muestra: **Archivos → Contexto → Validación**.

1. **Archivos**  
   - Subir o arrastrar archivos (imágenes o PDF).  
   - Máximo **50** archivos.  
   - Al avanzar, el sistema envía una **muestra** (hasta 5 archivos aleatorios) para generar, si aplica, **preguntas extra** con IA.

2. **Contexto**  
   - **Proyecto por defecto** (obligatorio): aplica al lote y enriquece el contexto del OCR.  
   - Si el modelo generó preguntas dinámicas, el usuario las responde (opciones u “Otro” con texto libre).  
   - Campos fijos del lote: tipo por defecto (egreso/ingreso), moneda (ARS/USD), categorías y medios de pago candidatos (opcionales), etapa, notas del lote, etc.  
   - Si no hay preguntas extra, se informa que el formulario ya cubre el contexto necesario.

3. **Validación**  
   - Lista de ítems (uno por archivo analizado).  
   - Navegación asistida: revisar/editar cada comprobante, omitir ítems, aplicar proyecto a todos si hace falta.  
   - Reglas de validez por ítem alineadas al formulario de movimiento (por ejemplo proyecto si la empresa lo exige, total y fecha obligatorios).  
   - Al confirmar, se abre un diálogo final y se crean los movimientos en el backend.

## Modo planilla (tabular) — pasos para el usuario

El stepper muestra: **Planilla → Categorías → Proveedores → Aclaraciones → Validación → Resumen**.

1. **Planilla**: subir CSV/Excel, revisar detección de columnas/hojas y elegir alcance (por ejemplo importación general vs proyecto específico, según lo que exponga `ImportPlanillaStep`).  
2. **Categorías**: resolver/mapear categorías detectadas vs catálogo de la empresa.  
3. **Proveedores**: idem para proveedores.  
4. **Aclaraciones**: texto u orientaciones adicionales para la IA sobre el lote.  
5. **Validación**: revisar filas/movimientos propuestos antes de crear.  
6. **Resumen**: cierre y persistencia del import.

Al finalizar, el padre recibe un callback con el resultado del import (no es el mismo endpoint que el modo OCR de “confirmar carga masiva”).

## Catálogos y datos auxiliares

Al abrir el diálogo (con empresa válida), se cargan en memoria, entre otros:

- Configuración de campos de comprobante e ingreso de la empresa.  
- Lista de proveedores (nombres).  
- Categorías (más entradas sintéticas como “Ingreso dinero” / “Ajuste” si aplica).  
- Medios de pago (desde empresa o lista por defecto).  
- Etapas, obras y clientes derivados de obras (para campos opcionales del movimiento).

## Resultado esperado

- **OCR**: array de movimientos creados y posibles errores por ítem (`onSuccess` con `ok` / `errores`).  
- **Tabular**: resultado del wizard de importación (`tabularImport`, `resultado`, `wizardSnapshot`).

## Límites y mensajes relevantes

- **50** archivos máximo en modo comprobantes (`CargaArchivosStep`).  
- Lotes grandes pueden tardar varios minutos en analizarse (mensaje informativo en contexto).  
- Sin teléfono de usuario en sesión no se puede confirmar la creación en modo OCR (validación explícita en el diálogo).
