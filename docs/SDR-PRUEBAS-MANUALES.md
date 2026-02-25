# Pruebas Manuales — Rediseño Módulo Comercial SDR v2

> **Fecha**: 25/02/2026  
> **Branch**: `Feat/comercial-nuevo-eje`  
> **Sprints cubiertos**: 1 (Utilidades + Modelos), 2 (Backend lógica v2), 3 (Frontend v2)  
> **Tester**: ________________________  
> **Fecha ejecución**: ____/____/______

---

## Cómo usar este documento

- Marcar cada caso con ✅ (pasa), ❌ (falla) o ⏭️ (no aplica).
- Anotar observaciones en la columna correspondiente.
- **Prerequisito**: tener datos de prueba en la base. Ver sección "Datos de prueba" al final.
- Probar tanto en **mobile** (< 900px) como en **desktop** (≥ 900px) donde se indique.

---

## Tabla de contenidos

1. [Modelos y validaciones (Backend)](#1-modelos-y-validaciones-backend)
2. [Endpoints API (Backend)](#2-endpoints-api-backend)
3. [Normalización de teléfonos](#3-normalización-de-teléfonos)
4. [Prioridad Score](#4-prioridad-score)
5. [Lista de Contactos — contactosSDR.js](#5-lista-de-contactos)
6. [Drawer de Detalle — DrawerDetalleContactoSDR.js](#6-drawer-de-detalle)
7. [Modal Registrar Acción — ModalRegistrarAccion.js](#7-modal-registrar-acción)
8. [Modal Agregar Contacto — ModalAgregarContacto.js](#8-modal-agregar-contacto)
9. [Gestión SDR — gestionSDR.js](#9-gestión-sdr)
10. [Reuniones](#10-reuniones)
11. [Puente Bot ↔ Contacto SDR](#11-puente-bot--contacto-sdr)
12. [Timeout Job del Bot](#12-timeout-job-del-bot)
13. [Vistas Guardadas](#13-vistas-guardadas)
14. [Flujos cross-funcionales](#14-flujos-cross-funcionales)

---

## 1. Modelos y validaciones (Backend)

### 1.1 ContactoSDR

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.1.1 | Crear contacto con campos mínimos | POST `/api/sdr/contactos` con `{ nombre, telefono, empresaId }` | Se crea con `estado: 'nuevo'`, `origen: 'manual'`, `prioridadScore: 0` | | |
| 1.1.2 | Estado válido | Intentar crear con `estado: 'inexistente'` | Error de validación Mongoose | | |
| 1.1.3 | Los 10 estados aceptados | Crear o cambiar estado a cada uno: `nuevo`, `contactado`, `calificado`, `cierre`, `ganado`, `no_contacto`, `no_responde`, `revisar_mas_adelante`, `no_califica`, `perdido` | Todos aceptados sin error | | |
| 1.1.4 | Teléfono duplicado misma empresa | Crear 2 contactos con mismo teléfono y empresaId | Error de duplicado (unique index) | | |
| 1.1.5 | Teléfono duplicado distinta empresa | Crear contacto con mismo teléfono pero otro empresaId | Se crea correctamente | | |
| 1.1.6 | planEstimado válido | Setear `planEstimado: 'avanzado'` | Se guarda | | |
| 1.1.7 | planEstimado inválido | Setear `planEstimado: 'mega'` | Error de validación (enum) | | |
| 1.1.8 | intencionCompra válida | Setear `intencionCompra: 'alta'` | Se guarda | | |
| 1.1.9 | precalificacionBot válida | Setear `precalificacionBot: 'quiere_meet'` | Se guarda | | |
| 1.1.10 | tamanoEmpresa vacío → null | Setear `tamanoEmpresa: ''` | Se guarda como `null` | | |

### 1.2 ReunionSDR

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.2.1 | Crear reunión mínima | POST con `{ contactoId, fecha, empresaId }` | Se crea con `estado: 'agendada'`, `numero` auto-generado | | |
| 1.2.2 | Numero auto-incremental | Crear 2 reuniones para el mismo contacto | Primera `numero: 1`, segunda `numero: 2` | | |
| 1.2.3 | Estados de reunión válidos | Cambiar a `agendada`, `realizada`, `no_show`, `cancelada` | Todos aceptados | | |
| 1.2.4 | Campo `fecha` requerido | Crear reunión sin `fecha` | Error de validación | | |
| 1.2.5 | Mapping `fechaHora` → `fecha` | Enviar `{ fechaHora: '2026-03-01', ... }` desde frontend | El servicio mapea a `fecha` y se guarda correctamente | | |

### 1.3 EventoHistorialSDR

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.3.1 | Eventos de nuevos canales | Registrar intento tipo `instagram_contacto`, `email_enviado`, `presupuesto_enviado`, `link_pago_enviado`, `negociacion_iniciada` | Se crea evento en historial con tipo correcto | | |
| 1.3.2 | Eventos de scoring | Actualizar planEstimado e intencionCompra | Se crean eventos `plan_estimado_actualizado` e `intencion_compra_actualizada` | | |

---

## 2. Endpoints API (Backend)

### 2.1 Acciones de scoring (nuevos)

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 2.1.1 | Actualizar plan estimado | POST `/api/sdr/acciones/plan-estimado` con `{ contactoId, plan: 'premium', empresaId }` | 200, contacto actualizado con `planEstimado: 'premium'` | | |
| 2.1.2 | Actualizar intención compra | POST `/api/sdr/acciones/intencion-compra` con `{ contactoId, intencion: 'alta', empresaId }` | 200, contacto actualizado con `intencionCompra: 'alta'` | | |
| 2.1.3 | Obtener siguiente contacto | GET `/api/sdr/contactos/siguiente?empresaId=X&sdrId=Y` | 200, devuelve el contacto con mayor prioridad o próximo vencido | | |
| 2.1.4 | Obtener funnel | GET `/api/sdr/metricas/funnel?empresaId=X` | 200, devuelve contadores por cada uno de los 10 estados | | |
| 2.1.5 | Actualizar reunión v2 | PUT `/api/sdr/reuniones/:id` con campos actualizados | 200, reunión actualizada | | |
| 2.1.6 | Webhook nuevo lead | POST `/api/sdr/webhook/nuevo-lead` (sin auth Firebase) | 200, crea o actualiza contacto, retorna `{ contactoId }` | | |

### 2.2 Evaluar reunión v2

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 2.2.1 | Marcar reunión como realizada | PUT `/api/sdr/reuniones/:id/evaluar` con `{ estado: 'realizada', notas }` | Estado cambia a `realizada` | | |
| 2.2.2 | Marcar reunión como no_show | PUT con `{ estado: 'no_show' }` | Estado cambia a `no_show` | | |
| 2.2.3 | Marcar reunión como cancelada | PUT con `{ estado: 'cancelada' }` | Estado cambia a `cancelada` | | |
| 2.2.4 | Evaluar con datos de scoring | PUT con `{ estado: 'realizada', interesado: true, planEstimado: 'basico' }` | Reunión evaluada + contacto actualizado | | |

---

## 3. Normalización de teléfonos

| # | Entrada | Salida esperada | ✅/❌ | Obs |
|---|---------|-----------------|-------|-----|
| 3.1 | `+54 9 11 4567-8900` | `5491145678900` | | |
| 3.2 | `01145678900` | `5491145678900` | | |
| 3.3 | `1145678900` | `5491145678900` | | |
| 3.4 | `541145678900` | `5491145678900` | | |
| 3.5 | `15 4567 8900` | `5491145678900` | | |
| 3.6 | `5491145678900` | `5491145678900` (ya normalizado) | | |
| 3.7 | `null` | `null` | | |
| 3.8 | `""` | `null` | | |

> **Nota**: Estas pruebas ya están cubiertas por **16 tests unitarios** (`normalizarTelefono.test.js`). Verificar que pasan: `npx jest test/unit/normalizarTelefono.test.js`

---

## 4. Prioridad Score

| # | Caso | Resultado esperado | ✅/❌ | Obs |
|---|------|--------------------|-------|-----|
| 4.1 | Contacto nuevo sin acciones | `prioridadScore` = bajo (< 20) | | |
| 4.2 | Contacto con `precalificacionBot: 'quiere_meet'` | Score alto (factor bot +25) | | |
| 4.3 | Contacto con `intencionCompra: 'alta'` | Score aumenta (factor intención) | | |
| 4.4 | Contacto con próximo contacto vencido hace 3 días | Score aumenta (factor vencimiento) | | |
| 4.5 | Al registrar intento, se recalcula | Después de `registrarIntento`, `prioridadScore` se actualiza | | |

> **Nota**: Cubiertas por **20 tests unitarios** (`calcularPrioridad.test.js`). Verificar: `npx jest test/unit/calcularPrioridad.test.js`

---

## 5. Lista de Contactos

### 5.1 Filtros por estado

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 5.1.1 | Chips de 10 estados visibles | Mobile | Abrir `/contactosSDR`, scroll horizontal en chips | Se ven: Nuevos, Contactados, En Cierre, Calificados, No Responde, Ganados, No Contactado, Revisar, Perdidos | | |
| 5.1.2 | Chips de 10 estados visibles | Desktop | Abrir `/contactosSDR` | Mismos 10 chips visibles | | |
| 5.1.3 | Filtro por chip "Ganados" | Ambos | Click en chip "Ganados" | Solo se muestran contactos con `estado: 'ganado'` | | |
| 5.1.4 | Filtro por chip "Perdidos" | Ambos | Click en chip "Perdidos" | Solo contactos `perdido` | | |
| 5.1.5 | Filtro por chip "Revisar" | Ambos | Click en chip "Revisar" | Solo contactos `revisar_mas_adelante` | | |
| 5.1.6 | Filtro por chip "No Contactado" | Ambos | Click | Solo contactos `no_contacto` | | |
| 5.1.7 | Toggle de filtro | Ambos | Click en chip activo (filled) | Se deselecciona, vuelve a mostrar todos | | |
| 5.1.8 | Contadores correctos | Ambos | Verificar número en cada chip | Coincide con cantidad real de contactos en ese estado | | |

### 5.2 Badges en filas

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 5.2.1 | Columnas Bot y Prior. en tabla | Desktop | Verificar cabecera de tabla | Aparecen columnas "Bot" y "Prior." | | |
| 5.2.2 | Badge precalificación "Calificado" | Desktop | Contacto con `precalificacionBot: 'calificado'` | Chip 🤖 "Calificado" color info en columna Bot | | |
| 5.2.3 | Badge precalificación "Quiere meet" | Desktop | Contacto con `precalificacionBot: 'quiere_meet'` | Chip 🤖 "Quiere meet" color primary | | |
| 5.2.4 | Sin precalificación | Desktop | Contacto con `precalificacionBot: 'sin_calificar'` o sin campo | Muestra "-" | | |
| 5.2.5 | Prioridad alta (≥70) | Desktop | Contacto con `prioridadScore: 85` | Chip rojo "85" en columna Prior. | | |
| 5.2.6 | Prioridad media (40-69) | Desktop | Contacto con `prioridadScore: 55` | Chip warning/naranja "55" | | |
| 5.2.7 | Prioridad baja (<40) | Desktop | Contacto con `prioridadScore: 20` | Chip default "20" | | |
| 5.2.8 | Sin prioridad | Desktop | Contacto con `prioridadScore: 0` | Muestra "-" | | |
| 5.2.9 | Badges en cards mobile | Mobile | Contacto con precalificación y prioridad | Badges aparecen debajo de nombre/empresa | | |
| 5.2.10 | Cards mobile sin badges | Mobile | Contacto sin precalificación ni prioridad | No se muestran badges vacíos, no hay error | | |

---

## 6. Drawer de Detalle

### 6.1 Sección "Calificación comercial"

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 6.1.1 | Sección visible | Ambos | Abrir drawer de un contacto | Aparece sección "Calificación comercial" con icono 📈 | | |
| 6.1.2 | Plan estimado — 4 chips | Ambos | Ver sección | Chips: 🟢 Básico, 🔵 Avanzado, 🟣 Premium, 🟡 A medida | | |
| 6.1.3 | Seleccionar plan "Avanzado" | Ambos | Click en chip "🔵 Avanzado" | Chip se marca como filled, snackbar "Plan actualizado a Avanzado" | | |
| 6.1.4 | Cambiar plan de Avanzado a Premium | Ambos | Click en "🟣 Premium" | Avanzado se desmarca (outlined), Premium se marca (filled) | | |
| 6.1.5 | Plan se persiste | Ambos | Cerrar y reabrir drawer | El plan seleccionado sigue marcado | | |
| 6.1.6 | Intención de compra — 3 chips | Ambos | Ver sección | Chips: 🔴 Alta, 🟠 Media, 🟡 Baja | | |
| 6.1.7 | Seleccionar intención "Alta" | Ambos | Click en chip "🔴 Alta" | Chip filled, snackbar confirma | | |
| 6.1.8 | Intención se persiste | Ambos | Cerrar y reabrir | Intención sigue marcada | | |
| 6.1.9 | Badge prioridad score | Ambos | Contacto con `prioridadScore: 75` | Chip "Prioridad: 75" color rojo | | |
| 6.1.10 | Badge precalificación bot | Ambos | Contacto con `precalificacionBot: 'quiere_meet'` | Chip 🤖 "Quiere meet" | | |
| 6.1.11 | Sin scoring previo | Ambos | Contacto nuevo sin plan/intención | Todos los chips en outlined, sin badges | | |
| 6.1.12 | Spinner durante guardado | Ambos | Click rápido en plan | Spinner aparece junto al título mientras guarda | | |

### 6.2 Sección "Datos del Bot"

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 6.2.1 | Sección visible con datos | Ambos | Contacto con `datosBot: { rubro: 'Construcción' }` | Aparece "Datos del Bot" con 🏗️ Rubro: Construcción | | |
| 6.2.2 | Mostrar interés | Ambos | Contacto con `datosBot.interes: 'Software de gestión'` | 💡 Interés: Software de gestión | | |
| 6.2.3 | Mostrar saludo inicial | Ambos | Contacto con `datosBot.saludoInicial: 'Hola, vi su publicidad'` | 💬 "Hola, vi su publicidad" (italic) | | |
| 6.2.4 | Todos los campos del bot | Ambos | Contacto con rubro + interes + saludoInicial | Las 3 líneas visibles | | |
| 6.2.5 | Sección oculta sin datos | Ambos | Contacto sin `datosBot` o con `datosBot: {}` | La sección NO aparece, sin errores | | |
| 6.2.6 | Sección oculta parcial | Ambos | Contacto con `datosBot: { otrosCampos: 'x' }` (sin rubro/interes/saludo) | La sección NO aparece | | |

### 6.3 Estado editable

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 6.3.1 | Menú de estados | Ambos | Click en chip de estado → menú desplegable | Muestra los 10 estados con iconos y colores | | |
| 6.3.2 | Cambiar estado | Ambos | Seleccionar otro estado del menú | Estado cambia inmediatamente en UI, snackbar confirma | | |
| 6.3.3 | Estado persiste | Ambos | Cerrar drawer, reabrir | Estado nuevo se mantiene | | |

### 6.4 Funcionalidad existente (regresión)

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 6.4.1 | Botón Llamar | Ambos | Click en "Llamar" | Se abre la app de teléfono con el número | | |
| 6.4.2 | Botón WhatsApp | Ambos | Click en "WhatsApp" | Se abre WhatsApp con el número correcto | | |
| 6.4.3 | Próximo contacto rápido | Ambos | Click en "1h", "3h", "24h", etc. | Se guarda la fecha, chip muestra la hora | | |
| 6.4.4 | Próximo contacto fecha/hora | Ambos | Usar input datetime-local | Se guarda la fecha exacta seleccionada | | |
| 6.4.5 | Nota rápida | Ambos | Escribir y enviar comentario | Se agrega al historial | | |
| 6.4.6 | Historial expandible | Mobile | Click en "Historial" | Se expande/colapsa, muestra eventos con colores | | |
| 6.4.7 | Navegación ← → | Desktop | Flechas de teclado | Navega entre contactos | | |
| 6.4.8 | Navegación con confirmación | Ambos | Navegar cuando no hay próximo contacto | Muestra modal preguntando cuándo contactar | | |
| 6.4.9 | Botón "Registrar Acción" sticky | Mobile | Scroll en drawer | Botón siempre visible en la parte inferior | | |
| 6.4.10 | Editar contacto | Ambos | Click en "Editar" | Abre modal de edición con datos pre-cargados | | |

---

## 7. Modal Registrar Acción

### 7.1 Tipos de acción

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 7.1.1 | 11 tipos visibles | Abrir modal "Registrar Acción" | Se ven 11 opciones: 6 originales + 5 nuevas | | |
| 7.1.2 | Llamada atendida | Seleccionar → confirmar | Se registra en historial, icono ✓ verde | | |
| 7.1.3 | Llamada no atendida | Seleccionar → confirmar | Se registra, sugiere seguimiento en 3h | | |
| 7.1.4 | WhatsApp enviado | Seleccionar → confirmar | Se registra, sugiere seguimiento en 24h | | |
| 7.1.5 | Reunión agendada | Seleccionar | Abre modal de reunión (no directamente registra) | | |
| 7.1.6 | No califica | Seleccionar | Pide motivo obligatorio | | |
| 7.1.7 | Agregar nota | Seleccionar → escribir nota → confirmar | Se registra como nota en historial | | |

### 7.2 Nuevos tipos de acción

| # | Tipo | Icono | Color | Seguimiento default | Pasos | ✅/❌ | Obs |
|---|------|-------|-------|---------------------|-------|-------|-----|
| 7.2.1 | Contacto por Instagram | Instagram icon | secondary (morado) | 24h | Seleccionar → confirmar → verificar historial | | |
| 7.2.2 | Email enviado | Email icon | info (azul) | 24h | Seleccionar → confirmar → verificar historial | | |
| 7.2.3 | Presupuesto enviado | Description icon | primary | 3 días | Seleccionar → confirmar → verificar historial | | |
| 7.2.4 | Link de pago enviado | Link icon | success (verde) | 24h | Seleccionar → confirmar → verificar historial | | |
| 7.2.5 | Negociación iniciada | Handshake icon | warning (naranja) | 3 días | Seleccionar → confirmar → verificar historial | | |

### 7.3 Flujo post-acción

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 7.3.1 | Agregar nota a acción | Seleccionar tipo → escribir nota → confirmar | Nota aparece en historial junto al evento | | |
| 7.3.2 | Programar seguimiento | Seleccionar tipo con seguimiento → elegir tiempo | Próximo contacto se actualiza | | |
| 7.3.3 | Botón "Siguiente contacto" | Registrar acción → click "Siguiente" | Drawer navega al siguiente contacto | | |
| 7.3.4 | Acción sin nota | Seleccionar tipo → confirmar directamente | Se registra sin nota (campo vacío) | | |

---

## 8. Modal Agregar Contacto

### 8.1 Campo Rubro (nuevo)

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 8.1.1 | Campo rubro visible | Abrir modal "+" agregar contacto | Campo "Rubro" aparece entre Cargo y Notas iniciales | | |
| 8.1.2 | Crear con rubro | Llenar nombre, teléfono, rubro: "Construcción" → Crear | Contacto se crea con `rubro: 'Construcción'` | | |
| 8.1.3 | Crear sin rubro | Llenar nombre y teléfono, dejar rubro vacío → Crear | Contacto se crea sin error, `rubro: undefined` | | |
| 8.1.4 | Rubro se resetea | Crear contacto con rubro → cerrar modal → reabrir | Campo rubro vacío | | |
| 8.1.5 | Placeholder correcto | Ver campo rubro | Placeholder: "Ej: Construcción, Inmobiliaria, etc." | | |

### 8.2 Funcionalidad existente (regresión)

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 8.2.1 | Nombre requerido | Dejar nombre vacío → Crear | Error "El nombre es requerido" | | |
| 8.2.2 | Teléfono requerido | Dejar teléfono vacío → Crear | Error "El teléfono es requerido" | | |
| 8.2.3 | Teléfono inválido | Ingresar "123" → Crear | Error "El teléfono no es válido (mínimo 8 dígitos)" | | |
| 8.2.4 | Email inválido | Ingresar "hola" en email → Crear | Error "El email no es válido" | | |
| 8.2.5 | Teléfono duplicado | Crear con teléfono que ya existe en la empresa | Error "Ya existe un contacto con ese teléfono" | | |
| 8.2.6 | Normalización de teléfono | Crear con "11 4567 8900" | Se guarda como `5491145678900` | | |
| 8.2.7 | Notas iniciales | Crear con notas "Primer contacto" | Se crea evento `comentario` en historial | | |

---

## 9. Gestión SDR

### 9.1 Imports centralizados

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 9.1.1 | Página carga sin error | Navegar a `/gestionSDR` | Página carga completamente, sin errores en consola | | |
| 9.1.2 | Estados en filtros | Verificar chips/dropdowns de filtro | Labels y colores coinciden con `sdrConstants.js` (10 estados) | | |
| 9.1.3 | Colores correctos | Verificar cada estado en la vista | `calificado` = success, `cierre` = success, `ganado` = success, `no_contacto` = default, `perdido` = error, etc. | | |

### 9.2 Tab de Reuniones

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 9.2.1 | Reuniones agendadas | Ir a tab "Reuniones" | Muestra reuniones con `estado: 'agendada'` (no "pendiente") | | |
| 9.2.2 | Título correcto | Ver título del listado | "Reuniones agendadas" (no "pendientes de evaluación") | | |
| 9.2.3 | Fecha válida | Ver fecha de una reunión | Muestra fecha legible (no "Invalid Date") | | |
| 9.2.4 | Botones v2 | Ver acciones de reunión | Botones: "Realizada", "No Show", "Cancelar" (no "Aprobar"/"Rechazar") | | |
| 9.2.5 | Evaluar como Realizada | Click "Realizada" en una reunión | Estado cambia a `realizada`, snackbar confirma | | |
| 9.2.6 | Evaluar como No Show | Click "No Show" | Estado cambia a `no_show` | | |
| 9.2.7 | Evaluar como Cancelada | Click "Cancelar" | Estado cambia a `cancelada` | | |

### 9.3 Dashboard de métricas (regresión)

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 9.3.1 | Cards de métricas | Ver dashboard | Cards con Total, Nuevos, Reuniones, etc. muestran números | | |
| 9.3.2 | Tabla de contactos | Ver lista de contactos en gestión | Muestra nombre, empresa, estado, SDR asignado | | |
| 9.3.3 | Asignar SDR | Seleccionar contactos → asignar a SDR | Contactos se actualizan con SDR asignado | | |
| 9.3.4 | Desasignar SDR | Seleccionar contactos → desasignar | Contactos se desasignan | | |
| 9.3.5 | Importar Excel | Click "Importar Excel" → subir archivo | Contactos se importan correctamente | | |
| 9.3.6 | Exportar Excel | Click "Exportar" | Se descarga archivo Excel con contactos | | |

---

## 10. Reuniones

### 10.1 Crear reunión

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 10.1.1 | Crear desde acción | Registrar Acción → "Reunión agendada" → completar formulario | Reunión creada con `estado: 'agendada'`, número auto-generado | | |
| 10.1.2 | Campos del formulario | Verificar campos disponibles | Fecha, hora (opcional), link (opcional), notas | | |
| 10.1.3 | Reunión aparece en Gestión | Después de crear → ir a Gestión SDR → tab Reuniones | La reunión aparece en la lista | | |

### 10.2 Evaluar reunión

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 10.2.1 | Evaluar desde drawer | Abrir contacto con reunión → evaluar inline | Botones Realizada/No Show/Cancelar funcionan | | |
| 10.2.2 | Evaluar desde gestión | Tab reuniones → botones de evaluación | Mismos botones funcionan | | |
| 10.2.3 | Notas de reunión | Al evaluar como "Realizada" → agregar notas | Se guardan las notas | | |

---

## 11. Puente Bot ↔ Contacto SDR

### 11.1 Sincronización de leads

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 11.1.1 | Nuevo lead del bot | Simular lead entrante vía bot | Se crea `ContactoSDR` con `origen: 'bot'`, `precalificacionBot`, `datosBot` poblados | | |
| 11.1.2 | Lead existente | Lead con teléfono ya en ContactoSDR | Se actualiza precalificación, no duplica | | |
| 11.1.3 | Datos del bot se mapean | Lead con rubro, interés y saludo | `datosBot.rubro`, `datosBot.interes`, `datosBot.saludoInicial` correctos | | |

### 11.2 Vinculación con empresa

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 11.2.1 | Empresa se vincula | Contacto completa onboarding → se crea empresa en Firestore | `ContactoSDR.datosBot.empresaFirestoreId` se actualiza con ID de la empresa | | |
| 11.2.2 | Sin contacto SDR | Onboarding sin contacto SDR previo | No hay error, flujo continúa normal | | |

---

## 12. Timeout Job del Bot

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 12.1 | Contacto sin actividad > 48h | Contacto con `precalificacionBot: 'sin_calificar'` y `createdAt` > 48h atrás | Job marca `precalificacionBot` como `no_llego`, crea evento `bot_timeout` | | |
| 12.2 | Contacto reciente | Contacto con `precalificacionBot: 'sin_calificar'` y `createdAt` < 48h | No se modifica | | |
| 12.3 | Contacto con otra precalificación | Contacto con `precalificacionBot: 'calificado'` (u otro valor ≠ `sin_calificar`) | No se modifica (solo aplica a `sin_calificar`) | | |

> **Ejecución manual**: `cd backend && node src/scripts/sdrBotTimeoutJob.js`  
> **Crontab producción**: `0 */6 * * * cd /ruta/backend && node src/scripts/sdrBotTimeoutJob.js`  
> **Tests unitarios** (5): `npx jest test/unit/sdrBotTimeoutJob.test.js`

---

## 13. Vistas Guardadas

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 13.1 | Listar vistas | Abrir página de contactos SDR | Se cargan las vistas guardadas como chips | | |
| 13.2 | Crear vista privada | Aplicar filtros → "Guardar vista" → nombre → desmarcar compartida → Guardar | Vista aparece como chip, solo visible para el usuario | | |
| 13.3 | Crear vista compartida | Guardar vista con "Compartida" activado | Vista visible para todos los usuarios de la empresa | | |
| 13.4 | Aplicar vista | Click en chip de vista guardada | Filtros se aplican automáticamente, lista se filtra | | |
| 13.5 | Limpiar vista | Click en "Limpiar" o en la vista activa | Filtros se resetean, vista se deselecciona | | |
| 13.6 | Eliminar vista | Click en ícono eliminar del chip de vista | Vista se elimina, desaparece de los chips | | |
| 13.7 | Vista default | Crear vista con `esDefault: true` | Se aplica automáticamente al cargar la página | | |
| 13.8 | Mobile + Desktop | Repetir 13.1-13.6 en ambos layouts | Vistas funcionan en ambos renders (mobile < 900px, desktop ≥ 900px) | | |

---

## 14. Flujos cross-funcionales

### 14.1 Loop completo de llamadas

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 14.1.1 | Flujo Llamar → Registrar → Siguiente | Abrir contacto → Llamar → Registrar "Llamada atendida" con nota → Siguiente contacto | Todo el flujo sin errores, historial actualizado, navega al siguiente | | |
| 14.1.2 | Flujo WhatsApp → Registrar → Seguimiento | Abrir contacto → WhatsApp → Registrar "WhatsApp enviado" → Programar seguimiento 24h | WhatsApp se abre, acción registrada, próximo contacto en 24h | | |
| 14.1.3 | Flujo No Responde → Siguiente | Registrar "Llamada no atendida" → aceptar seguimiento 3h → Siguiente | Acción registrada, próximo en 3h, navega | | |

### 14.2 Pipeline comercial completo

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 14.2.1 | Nuevo → Contactado | Contacto nuevo → registrar llamada atendida | Estado cambia a `contactado` | | |
| 14.2.2 | Contactado → Calificado | Contacto contactado → marcar intención alta + plan premium | Estado se puede cambiar a `calificado` manualmente | | |
| 14.2.3 | Calificado → Cierre | Contacto calificado → enviar presupuesto | Estado se puede cambiar a `cierre` | | |
| 14.2.4 | Cierre → Ganado | Contacto en cierre → enviar link de pago → marcar ganado | Estado `ganado` | | |
| 14.2.5 | Contacto → No califica | Registrar acción "No califica" con motivo | Estado cambia a `no_califica`, contacto sale del flujo activo | | |

### 14.3 Scoring end-to-end

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 14.3.1 | Plan + Intención → Prioridad | Seleccionar plan "Premium" + intención "Alta" | `prioridadScore` se recalcula y aumenta | | |
| 14.3.2 | Prioridad se refleja en lista | Después de actualizar scoring → volver a lista | Contacto muestra badge de prioridad actualizado | | |
| 14.3.3 | Bot data visible | Lead del bot con datos → abrir drawer | Sección "Datos del Bot" muestra rubro, interés, saludo | | |

---

## Datos de prueba

### Insertar contacto con todos los campos v2 en MongoDB

```javascript
// Ejecutar en MongoDB Shell o Compass
db.contactosdrs.insertOne({
  nombre: "Test Scoring Completo",
  telefono: "5491199999999",
  email: "test@ejemplo.com",
  empresa: "Constructora Test",
  cargo: "Gerente",
  rubro: "Construcción",
  tamanoEmpresa: "11-50",
  estado: "calificado",
  segmento: "inbound",
  origen: "bot",
  precalificacionBot: "quiere_meet",
  planEstimado: "avanzado",
  intencionCompra: "alta",
  prioridadScore: 75,
  datosBot: {
    rubro: "Construcción residencial",
    interes: "Software de gestión de obra",
    saludoInicial: "Hola, vi su publicidad en Instagram y me interesa",
    empresaFirestoreId: null
  },
  empresaId: "<TU_EMPRESA_ID>",
  sdrAsignado: "<TU_SDR_UID>",
  sdrAsignadoNombre: "SDR Test",
  proximoContacto: new Date(Date.now() - 86400000), // Vencido ayer
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Insertar contacto mínimo (sin scoring ni bot)

```javascript
db.contactosdrs.insertOne({
  nombre: "Test Mínimo",
  telefono: "5491188888888",
  estado: "nuevo",
  origen: "manual",
  prioridadScore: 0,
  empresaId: "<TU_EMPRESA_ID>",
  sdrAsignado: "<TU_SDR_UID>",
  sdrAsignadoNombre: "SDR Test",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Insertar reunión de prueba

```javascript
db.reunionsdrs.insertOne({
  contactoId: ObjectId("<CONTACTO_ID>"),
  numero: 1,
  estado: "agendada",
  fecha: new Date(Date.now() + 86400000), // Mañana
  hora: "15:00",
  link: "https://meet.google.com/test",
  notas: "Primera reunión demo",
  empresaId: "<TU_EMPRESA_ID>",
  creadoPor: "<TU_SDR_UID>",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

---

## Resumen de tests automatizados existentes

| Suite | Tests | Comando |
|-------|-------|---------|
| normalizarTelefono | 16 | `npx jest test/unit/normalizarTelefono.test.js` |
| calcularPrioridad | 20 | `npx jest test/unit/calcularPrioridad.test.js` |
| leadContactoBridge | 25 | `npx jest test/unit/leadContactoBridge.test.js` |
| sdrBotTimeoutJob | 5 | `npx jest test/unit/sdrBotTimeoutJob.test.js` |
| **Total SDR** | **66** | `npx jest --runInBand test/unit/` |

Ejecutar todos: `cd backend && npx jest --runInBand --forceExit`

---

## Resultado final

| Sección | Total casos | Pasan | Fallan | N/A |
|---------|-------------|-------|--------|-----|
| 1. Modelos | 15 | | | |
| 2. Endpoints | 10 | | | |
| 3. Normalización | 8 | | | |
| 4. Prioridad | 5 | | | |
| 5. Lista contactos | 18 | | | |
| 6. Drawer detalle | 22 | | | |
| 7. Modal acción | 12 | | | |
| 8. Modal agregar | 12 | | | |
| 9. Gestión SDR | 13 | | | |
| 10. Reuniones | 6 | | | |
| 11. Puente bot | 5 | | | |
| 12. Timeout job | 3 | | | |
| 13. Vistas guardadas | 8 | | | |
| 14. Flujos cross | 8 | | | |
| **TOTAL** | **145** | | | |

**Firma del tester**: ________________________  
**Fecha completado**: ____/____/______  
**Versión**: Sprint 3 completado — `Feat/comercial-nuevo-eje`
