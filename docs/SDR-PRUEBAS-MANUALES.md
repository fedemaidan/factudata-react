# Pruebas Manuales — Rediseño Módulo Comercial SDR v2

> **Fecha**: 25/02/2026  
> **Branch**: `Feat/comercial-nuevo-eje`  
> **Sprints cubiertos**: 1 (Utilidades + Modelos), 2 (Backend lógica v2), 3 (Frontend v2), 4 (Templates contextuales — Fase 2), 5 (Reuniones avanzadas — Fase 3)  
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

1. [Contactos — Crear y validar](#1-contactos--crear-y-validar)
2. [Scoring y métricas desde la web](#2-scoring-y-métricas-desde-la-web)
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
15. [Visor de Conversación — MiniChatViewer](#15-visor-de-conversación)
16. [Página de Detalle — /sdr/contacto/[id]](#16-página-de-detalle)
17. [Página de Reuniones — /sdr/reuniones](#17-página-de-reuniones)
18. [ModalCrearReunion](#18-modalcrearreunion)
19. [ModalResultadoReunion](#19-modalresultadoreunion)
20. [Resumen SDR (IA)](#20-resumen-sdr-ia)

---

## 1. Contactos — Crear y validar

### 1.1 Crear contacto desde la web

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.1.1 | Crear contacto con campos mínimos | En `/contactosSDR` → click "+" → llenar solo Nombre y Teléfono → Crear | Se crea con chip "Nuevo", aparece en la lista | | |
| 1.1.2 | Los 10 estados | Abrir drawer del contacto → click en chip de estado → cambiar a cada uno de los 10 estados disponibles en el menú | Todos los cambios se aceptan sin error, chip se actualiza | | |
| 1.1.3 | Teléfono duplicado misma empresa | Click "+" → crear contacto con el mismo teléfono de uno existente → Crear | Error "Ya existe un contacto con ese teléfono" | | |
| 1.1.4 | Plan estimado desde drawer | Abrir drawer → sección "Calificación comercial" → click chip "🔵 Avanzado" | Chip se marca filled, snackbar confirma | | |
| 1.1.5 | Intención compra desde drawer | Abrir drawer → sección "Calificación comercial" → click chip "🔴 Alta" | Chip se marca filled, snackbar confirma | | |
| 1.1.6 | Plan inválido no existe en UI | Verificar chips de plan en el drawer | Solo aparecen Básico, Avanzado, Premium, A medida — no se puede setear un valor inválido | | |

> **Nota**: Las validaciones de modelo (enum, unique index, precalificacionBot) están cubiertas por tests automatizados. Ejecutar: `cd backend && npx jest --runInBand test/unit/`

### 1.2 Reuniones desde la web

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.2.1 | Crear reunión desde drawer | Abrir contacto → "Registrar Acción" → "Reunión agendada" → llenar fecha, empresa, tamaño, contacto principal → "Registrar Reunión" | Snackbar "¡Reunión registrada!", aparece en sección Reuniones del drawer | | |
| 1.2.2 | Reunión aparece en Gestión | Después de crear → ir a `/gestionSDR` → tab "Reuniones" | La reunión recién creada aparece en la lista | | |
| 1.2.3 | Número auto-incremental | Crear 2 reuniones para el mismo contacto → ver en drawer | Primera muestra #1, segunda #2 | | |
| 1.2.4 | Fecha requerida | En modal de reunión → dejar campo "Fecha y hora" vacío | Botón "Registrar Reunión" está deshabilitado (gris) | | |
| 1.2.5 | Evaluar como Realizada | En `/gestionSDR` → tab Reuniones → click "Realizada" en una reunión | Estado cambia a `realizada`, snackbar confirma | | |
| 1.2.6 | Evaluar como No Show | En tab Reuniones → click "No Show" | Estado cambia a `no_show` | | |
| 1.2.7 | Evaluar como Cancelada | En tab Reuniones → click "Cancelar" | Estado cambia a `cancelada` | | |

### 1.3 Historial de eventos

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 1.3.1 | Eventos de nuevos canales | Abrir drawer → "Registrar Acción" → seleccionar Instagram/Email/Presupuesto/Link pago/Negociación, una por una | Cada acción aparece en el historial con su icono y tipo correcto | | |
| 1.3.2 | Eventos de scoring | Abrir drawer → cambiar Plan Estimado y luego Intención de Compra | Aparecen en historial: "Plan estimado actualizado" e "Intención de compra actualizada" | | |
| 1.3.3 | Evento prioridad manual | Abrir detalle contacto → click "+ Puntos" → sumar puntos → confirmar | Aparece en historial evento tipo `prioridad_manual_actualizada` | | |
| 1.3.4 | Evento comentario | Abrir detalle contacto → escribir comentario → enviar | Aparece en historial evento tipo `comentario` con el texto | | |

---

## 2. Scoring y métricas desde la web

### 2.1 Calificación comercial

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 2.1.1 | Actualizar plan estimado | Abrir drawer → click chip "🟣 Premium" | Chip se marca, snackbar confirma, cerrar y reabrir: persiste | | |
| 2.1.2 | Actualizar intención compra | Abrir drawer → click chip "🔴 Alta" | Chip se marca, snackbar confirma, cerrar y reabrir: persiste | | |
| 2.1.3 | Funnel en Gestión SDR | Ir a `/gestionSDR` → ver dashboard de métricas | Cards muestran contadores correctos por cada estado (10 estados) | | |
| 2.1.4 | Siguiente contacto | Navegar entre contactos usando flechas ← → en el drawer (desktop) | Se navega al siguiente contacto ordenado por prioridad | | |

### 2.2 Webhook (solo backend)

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 2.2.1 | Webhook nuevo lead | `curl -X POST http://localhost:3003/api/sdr/webhook/nuevo-lead -H "Content-Type: application/json" -d '{"nombre":"Test","telefono":"5491199887766","empresaId":"<ID>"}'` | 200, crea contacto, retorna `{ contactoId }` | | |

> **Nota**: El webhook es un endpoint externo sin auth. Se prueba con curl o se verifica que los leads del bot aparezcan automáticamente en la lista de contactos SDR.

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

### 5.3 Métricas "Mi Actividad"

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 5.3.1 | Título "Mi Actividad" | Ambos | Abrir `/contactosSDR` → ver sección métricas | Título dice "Mi Actividad" con subtítulo indicando período ("hoy", "últimos 7 días" o "último mes") | | |
| 5.3.2 | Card "Tasa contacto" muestra % | Ambos | Ver card "Tasa contacto" | Muestra porcentaje (atendidas/realizadas), no número absoluto | | |
| 5.3.3 | Card "Nuevos" ya no existe | Ambos | Verificar todas las cards | No existe card "Nuevos" (fue reemplazada por "Tasa contacto") | | |
| 5.3.4 | Métricas fijas al filtrar por estado | Ambos | Cambiar filtro de estado (ej: "Ganados") → observar métricas | Las cards de métricas NO cambian al filtrar por estado | | |
| 5.3.5 | Subtítulo cambia con período | Ambos | Cambiar selector de período en métricas | Subtítulo se actualiza: "hoy", "últimos 7 días" o "último mes" | | |

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

### 6.5 Tab Chat / Conversación

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 6.5.1 | Tab "Chat" visible | Desktop | Abrir drawer de contacto con teléfono | 3er tab "Chat" aparece junto a "Info" e "Historial" | | |
| 6.5.2 | Tab Chat muestra mensajes | Desktop | Click en tab "Chat" | Se cargan hasta 50 mensajes, burbujas estilo WhatsApp | | |
| 6.5.3 | Sección "Conversación" colapsable | Mobile | Abrir drawer → buscar sección "Conversación" | Sección se expande/colapsa mostrando los mensajes | | |
| 6.5.4 | Sin conversación | Ambos | Abrir contacto sin mensajes de WhatsApp | Muestra estado vacío ("No se encontró conversación") sin errores | | |
| 6.5.5 | Link "Ver completa" | Ambos | En el chat → click "Ver completa" | Navega a `/conversaciones?conversationId=<ID>` | | |
| 6.5.6 | Mensajes diferenciados | Ambos | Verificar burbujas | Mensajes entrantes (izq) vs salientes (der) con colores distintos | | |

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

## 15. Visor de Conversación

### 15.1 MiniChatViewer — Componente

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 15.1.1 | Carga mensajes | Ambos | Abrir contacto con teléfono que tiene conversación | Se muestran hasta 50 mensajes con burbujas estilo WhatsApp (fondo #efeae2) | | |
| 15.1.2 | Auto-scroll al final | Ambos | Abrir visor con muchos mensajes | Scroll posicionado automáticamente al final (mensajes más recientes) | | |
| 15.1.3 | Estado loading | Ambos | Abrir contacto → observar carga | Se muestra spinner mientras carga mensajes | | |
| 15.1.4 | Contacto sin conversación | Ambos | Abrir contacto sin mensajes WhatsApp | Muestra "No se encontró conversación" (404), sin error en consola | | |
| 15.1.5 | Contacto sin teléfono | Ambos | Abrir contacto sin campo teléfono | No intenta cargar, muestra estado vacío | | |
| 15.1.6 | Tipos de mensaje | Ambos | Conversación con texto, imagen, audio | Cada tipo se renderiza correctamente en su burbuja | | |
| 15.1.7 | Link "Ver completa" | Ambos | Click en link al pie del visor | Abre `/conversaciones?conversationId=<ID>` en nueva pestaña | | |

---

## 16. Página de Detalle

### 16.1 Layout y navegación — `/sdr/contacto/[id]`

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 16.1.1 | Página carga sin error | Ambos | Navegar a `/sdr/contacto/<ID_VÁLIDO>` | Página carga con datos del contacto, sin errores en consola | | |
| 16.1.2 | Layout 50/50 | Desktop | Ver disposición en pantalla ancha | Chat a la izquierda (50%), comentario + historial a la derecha (50%) | | |
| 16.1.3 | Tabs Chat/Historial en mobile | Mobile | Ver sección inferior | Aparecen 2 tabs: "Chat" e "Historial (N)" en vez de apilar todo | | |
| 16.1.4 | Tab Chat mobile (400px) | Mobile | Click en tab "Chat" | MiniChatViewer con altura fija 400px, scroll interno | | |
| 16.1.5 | Tab Historial mobile | Mobile | Click en tab "Historial" | Muestra campo comentario + lista de eventos | | |
| 16.1.6 | Scroll independiente desktop | Desktop | Scroll en panel derecho | No afecta al panel izquierdo y viceversa | | |
| 16.1.7 | Altura fija 500px desktop | Desktop | Verificar paneles | Ambos paneles con altura 500px con overflow scroll | | |
| 16.1.8 | ID inválido | Ambos | Navegar a `/sdr/contacto/ID_INEXISTENTE` | Manejo de error (mensaje o redirect), sin pantalla en blanco | | |

### 16.2 Acciones desde la página de detalle

| # | Caso | Plataforma | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|------------|-------|--------------------|-------|-----|
| 16.2.1 | Botón "Editar" | Ambos | Click en "Editar" en card de info | Abre ModalEditarContacto con datos pre-cargados | | |
| 16.2.2 | Edición persiste | Ambos | Editar nombre → guardar → recargar página | Nombre actualizado se mantiene | | |
| 16.2.3 | Chip "+ Puntos" siempre visible | Ambos | Verificar que aparece "+ Puntos" | Chip visible independientemente del score o prioridad manual actual | | |
| 16.2.4 | Sumar puntos manuales | Ambos | Click "+ Puntos" → ingresar valor → confirmar | Prioridad manual se actualiza, evento en historial | | |
| 16.2.5 | Agregar comentario | Ambos | Escribir comentario → enviar | Comentario aparece en historial del panel derecho | | |
| 16.2.6 | Botones Llamar/WhatsApp | Ambos | Click en Llamar / WhatsApp | Se abren las apps correspondientes con el número correcto | | |

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

## 17. Página de Reuniones — `/sdr/reuniones`

### 17.1 Navegación y acceso

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.1.1 | Acceso desde sidebar | Click "Mis Reuniones" en sidebar | Abre `/sdr/reuniones` con 6 tabs | | |
| 17.1.2 | Acceso desde banner | En contactosSDR tab Reuniones → click banner "Ir a Mis Reuniones" | Navega a `/sdr/reuniones` | | |
| 17.1.3 | Botón volver | Click flecha ← en header | Navega a `/contactosSDR` | | |
| 17.1.4 | Botón actualizar | Click "Actualizar" | Recarga reuniones sin perder tab seleccionado | | |

### 17.2 Tab Hoy

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.2.1 | Cards con countdown | Tener reuniones agendadas para hoy | Cada card muestra hora + "En Xh Xmin" o "Hace Xmin" | | |
| 17.2.2 | Resumen SDR visible | Contacto con `resumenSDR` poblado | Se muestra el resumen en la card | | |
| 17.2.3 | Link de reunión | Reunión con campo `link` | Botón "Link reunión" abre URL, botón copiar funciona | | |
| 17.2.4 | Marcar realizada | Click "✅ Realizada" | Abre ModalResultadoReunion | | |
| 17.2.5 | Marcar no show | Click "❌ No show" | Reunión cambia a no_show, desaparece de Hoy, aparece en No show | | |
| 17.2.6 | Ver contacto | Click "Ver contacto" | Navega a `/sdr/contacto/[id]` | | |
| 17.2.7 | Empty state | Sin reuniones hoy | Muestra "🎉 No tenés reuniones para hoy" | | |

### 17.3 Tab Próximas

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.3.1 | Agrupación por día | Reuniones en distintos días futuros | Se agrupan con separador "── lunes 9 de marzo ──" etc. | | |
| 17.3.2 | Cancelar reunión | Click "Cancelar" en una reunión próxima | Reunión desaparece del tab | | |

### 17.4 Tab Sin registrar

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.4.1 | Alerta visual | Reunión agendada con fecha pasada | Card con borde rojo/naranja + alerta "Hace Xh sin registrar" | | |
| 17.4.2 | Alerta >24h | Reunión de hace más de 1 día | Alerta roja "⚠️ Hace más de X día(s) sin registrar" | | |
| 17.4.3 | Forzar registro | Click "✅ Realizada" | Abre modal resultado, al completar desaparece del tab | | |

### 17.5 Tab Realizadas

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.5.1 | Comentario visible | Reunión realizada con comentario | Se muestra el comentario en la card | | |
| 17.5.2 | Módulos visible | Reunión con modulosInteres | Chips de módulos visibles | | |
| 17.5.3 | Calificación visible | Reunión con calificacionRapida | Chip de calificación visible (❄️/🌤️/🔥/🎯) | | |
| 17.5.4 | Próximo paso | Contacto con proximaTarea | Chip "Próximo: tipo" visible | | |
| 17.5.5 | Sin próximo paso | Contacto sin proximaTarea | Chip "⚠️ Sin próximo paso" visible | | |

### 17.6 Tab No show

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.6.1 | Reagendar | Click "Reagendar" | Abre modal resultado para definir nueva acción | | |

### 17.7 Badges en tabs

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 17.7.1 | Badges con cantidad | Tener reuniones en distintos estados | Cada tab muestra badge con cantidad correcta | | |
| 17.7.2 | Badge rojo sin registrar | Tener reuniones sin registrar | Tab "Sin registrar" con badge rojo | | |
| 17.7.3 | Badge azul hoy | Tener reuniones hoy | Tab "Hoy" con badge azul | | |

---

## 18. ModalCrearReunion

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 18.1 | Abrir desde contactosSDR | En lista → abrir contacto → "Agendar reunión" | Modal se abre con campos del formulario | | |
| 18.2 | Abrir desde contacto/[id] | En detalle contacto → "Agendar reunión" | Modal se abre con datos pre-cargados del contacto | | |
| 18.3 | Campos del formulario | Verificar campos | Fecha/hora, empresa, tamaño, contacto principal, rol, puntos de dolor, módulos, link | | |
| 18.4 | Enviar formulario | Completar y enviar | Reunión creada, modal se cierra, snackbar de éxito | | |
| 18.5 | Cancelar | Click "Cancelar" | Modal se cierra sin crear reunión | | |

---

## 19. ModalResultadoReunion

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 19.1 | Paso 1: Estado | Seleccionar "Realizada" | Avanza al paso 2 (Comentario) | | |
| 19.2 | Paso 1: No show | Seleccionar "No show" | Salta al paso 5 (Próximo contacto) | | |
| 19.3 | Paso 1: Cancelada | Seleccionar "Cancelada" | Salta al paso 5 (Próximo contacto) | | |
| 19.4 | Paso 2: Comentario obligatorio | Intentar avanzar sin comentario (estado=realizada) | No avanza, campo marcado como requerido | | |
| 19.5 | Paso 3: Transcripción | Pegar texto de transcripción | Se guarda en el campo, botón "Siguiente" disponible | | |
| 19.6 | Paso 4: Módulos | Seleccionar módulos de interés | Checkboxes se marcan correctamente | | |
| 19.7 | Paso 4: Calificación | Seleccionar calificación rápida | Se selecciona una opción del grupo de radio buttons | | |
| 19.8 | Paso 5: Próximo contacto | Seleccionar tipo + fecha + nota | Formulario completo, botón "Guardar" habilitado | | |
| 19.9 | Submit completo | Completar todos los pasos y guardar | Reunión actualizada, próximo contacto programado, snackbar éxito | | |
| 19.10 | Transcripción + IA | Pegar transcripción ≥50 chars y guardar | Se genera resumen IA automáticamente, snackbar "resumen IA generado ✨" | | |
| 19.11 | Stepper navegación | Usar botones Atrás/Siguiente | Stepper navega correctamente entre pasos | | |

---

## 20. Resumen SDR (IA)

### 20.1 Generar resumen desde contacto

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 20.1.1 | Botón visible | Abrir `/sdr/contacto/[id]` | Card "Resumen SDR (IA)" visible con botón "Generar resumen" | | |
| 20.1.2 | Generar resumen | Click "Generar resumen" | Loading → se muestra el resumen generado por GPT-4o | | |
| 20.1.3 | Regenerar | Contacto ya tiene resumen → click "🔄 Regenerar" | Nuevo resumen reemplaza al anterior | | |
| 20.1.4 | Resumen en tab Hoy | Generar resumen → ir a /sdr/reuniones tab Hoy | El resumen aparece en la card de la reunión del contacto | | |

### 20.2 Procesar transcripción

| # | Caso | Pasos | Resultado esperado | ✅/❌ | Obs |
|---|------|-------|--------------------|-------|-----|
| 20.2.1 | Transcripción corta | Registrar resultado con transcripción <50 chars | No se intenta generar resumen IA | | |
| 20.2.2 | Transcripción larga | Registrar resultado con transcripción ≥50 chars | Se genera `resumenIA` en la reunión automáticamente | | |
| 20.2.3 | Error de IA | Simular error de red/API | Reunión se guarda igual, snackbar warning "error al generar resumen IA" | | |

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
| 1. Contactos (crear/validar/reuniones/historial) | 18 | | | |
| 2. Scoring y métricas | 5 | | | |
| 3. Normalización | 8 | | | |
| 4. Prioridad | 5 | | | |
| 5. Lista contactos (filtros + badges + métricas) | 23 | | | |
| 6. Drawer detalle (+ tab Chat) | 28 | | | |
| 7. Modal acción | 12 | | | |
| 8. Modal agregar | 12 | | | |
| 9. Gestión SDR | 13 | | | |
| 10. Reuniones | 6 | | | |
| 11. Puente bot | 5 | | | |
| 12. Timeout job | 3 | | | |
| 13. Vistas guardadas | 8 | | | |
| 14. Flujos cross | 8 | | | |
| 15. Visor de conversación | 7 | | | |
| 16. Página de detalle | 14 | | | |
| 17. Página de reuniones | 23 | | | |
| 18. ModalCrearReunion | 5 | | | |
| 19. ModalResultadoReunion | 11 | | | |
| 20. Resumen SDR (IA) | 7 | | | |
| **TOTAL** | **221** | | | |

**Firma del tester**: ________________________  
**Fecha completado**: ____/____/______  
**Versión**: Sprint 5 + reuniones avanzadas (Fase 3) — `Feat/comercial-nuevo-eje`
