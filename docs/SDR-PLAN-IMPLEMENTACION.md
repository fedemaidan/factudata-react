# SDR — Plan de Implementación

> **Última actualización**: Marzo 2026

---

## Resumen Ejecutivo

El módulo SDR se implementa en **3 fases**. La Fase 1 (workflow por tareas) está **completa**. La Fase 2 (templates contextuales) y la Fase 3 (gestión avanzada de reuniones) están **pendientes**.

| Fase | Nombre | Estado |
|------|--------|--------|
| **Fase 1** | Workflow Task-Driven | ✅ Completa |
| **Fase 2** | Templates Contextuales | ❌ Pendiente |
| **Fase 3** | Gestión Avanzada de Reuniones | ❌ Pendiente |

---

## Fase 1 — Workflow Task-Driven ✅

### Objetivo
Reemplazar la cadencia como mecanismo principal de trabajo por un sistema basado en tareas concretas (`proximaTarea`), manteniendo cadencias como fallback.

### Lo que se implementó

#### 1.1 Próxima Tarea ✅
- [x] Campo `proximaTarea` en modelo ContactoSDR: `{ tipo, fecha, nota, autoGenerada }`
- [x] `_sugerirProximaTarea()` — lógica de sugerencia automática post-acción
- [x] Tabla de reglas: canal × resultado × contadores → tipo + fecha + nota
- [x] Endpoint `POST /contactos/:id/proxima-tarea`
- [x] El SDR puede aceptar, modificar o rechazar la sugerencia

#### 1.2 Wizard Híbrido ✅
- [x] Wizard determina `canalWizard` desde `proximaTarea.tipo`
- [x] Si no hay proximaTarea → fallback a cadencia activa (paso actual)
- [x] Si no hay nada → botones genéricos (Llamar / WhatsApp / Otra acción)
- [x] Chip con horario de la tarea (ej: "📅 Hoy 14:30")
- [x] Botones de modificar ✏️ y eliminar 🗑️ en header del wizard
- [x] Chip "📋 Cadencia" cuando se usa fallback
- [x] Pre-selección automática de próxima tarea al completar acción
- [x] Funciona en desktop y mobile

#### 1.3 Bandejas Reorganizadas ✅
- [x] **Nuevos**: estado `nuevo`, 0 intentos (contadores todos en 0)
- [x] **Reintentos**: `nuevo` con contadores > 0 ó cadencia activa vencida
- [x] **Seguimiento**: `contactado`/`calificado`/`cierre` **sin** reunión agendada
- [x] **Reuniones Pendientes**: con reunión agendada, fecha ≥ hoy
- [x] **Reuniones Pasadas**: reunión realizada/no_show/cancelada/vencida, sin reunión pendiente
- [x] Sin solapamiento entre bandejas
- [x] Contadores en tabs (mobile y desktop)
- [x] Columna "Resultado" en tabla de reuniones pasadas (desktop)
- [x] Empty states contextuales por bandeja

#### 1.4 Historial Agrupado ✅
- [x] Agrupación por bloques temporales de 30 minutos
- [x] Etiquetas legibles: "Hoy 14:30", "Ayer 09:15", "Lun 11:00"
- [x] Funciona en 3 vistas: resumen desktop, resumen mobile, tab historial completo
- [x] Eventos dentro del bloque se muestran en orden cronológico inverso
- [x] Separadores visuales entre bloques

#### 1.5 Fix de Estado WA ✅
- [x] Enviar WA sin respuesta **no** cambia estado `nuevo → contactado`
- [x] Solo cambia con contacto efectivo bidireccional:
  - Llamada atendida (`canal === 'llamada' && resultado === 'atendio'`)
  - Confirmación de respuesta WA (`confirmarRespuestaWA`)
  - WA con resultado respondió (`canal === 'whatsapp' && resultado === 'respondio'`)

#### 1.6 Lo que NO se tocó (legacy funcional)
- CadenciaEngine sigue activo (282 líneas, 11 invocaciones)
- ABM de cadencias completo y funcional
- `cadenciaActiva` sigue en el modelo con todos sus campos
- Asignación masiva de cadencias funcional
- Templates filtran por `cadencia_step` (1/2/3) — se refactoriza en Fase 2

---

## Fase 2 — Templates Contextuales ❌

### Objetivo
Reemplazar el filtrado de templates por `cadencia_step` con un sistema de **tags contextuales** que se adaptan automáticamente al estado del contacto.

### Problema actual
- `ModalSelectorTemplate.js` filtra templates por `cadencia_step` (1, 2, 3)
- Esto solo tiene sentido si el contacto está en una cadencia
- Con el workflow task-driven, muchos contactos no tienen cadencia
- El SDR tiene que buscar manualmente el template adecuado

### Diseño propuesto

#### 2.1 Tags de contexto

Reemplazar `cadencia_step` por tags que describen la situación del contacto:

| Tag | Cuándo aplica |
|-----|---------------|
| `primer_contacto_inbound` | Nuevo + segmento inbound + 0 intentos |
| `primer_contacto_outbound` | Nuevo + segmento outbound + 0 intentos |
| `post_llamada_no_atendio` | Última acción = llamada no atendida (1-2x) |
| `post_llamada_no_atendio_3x` | 3+ llamadas no atendidas consecutivas |
| `follow_up` | Contactado, sin actividad reciente |
| `re_engagement` | `no_responde` o `revisar_mas_adelante` |
| `post_reunion` | Reunión realizada, pendiente de propuesta |
| `propuesta` | Estado `cierre`, propuesta enviada |
| `generico` | Catch-all |

#### 2.2 Función `detectarContextoTemplate(contacto)`

Nueva función pura que analiza el contacto y retorna un array ordenado de tags aplicables:

```javascript
function detectarContextoTemplate(contacto) {
  const tags = [];
  
  if (contacto.estado === 'nuevo' && todosContadoresEnCero(contacto)) {
    tags.push(contacto.segmento === 'inbound' 
      ? 'primer_contacto_inbound' 
      : 'primer_contacto_outbound');
  }
  
  if (contacto.contadores.llamadasNoAtendidas >= 3) {
    tags.push('post_llamada_no_atendio_3x');
  } else if (contacto.contadores.llamadasNoAtendidas > 0) {
    tags.push('post_llamada_no_atendio');
  }
  
  // ... más reglas
  
  tags.push('generico'); // siempre incluir
  return tags;
}
```

#### 2.3 Cambios en modelo Template

```javascript
// ANTES (actual)
{ cadencia_step: 1, tipo: 'prospecto', mensaje: '...' }

// DESPUÉS
{ tags: ['primer_contacto_inbound', 'primer_contacto_outbound'], 
  tipo: 'prospecto', mensaje: '...' }
```

#### 2.4 Cambios en ModalSelectorTemplate

- Recibe `contacto` como prop (además del contactoId actual)
- Llama a `detectarContextoTemplate(contacto)` para obtener tags
- Filtra templates que tengan al menos un tag en común
- Ordena por cantidad de tags coincidentes (más específico primero)
- Muestra chips de tags en cada template para contexto

#### 2.5 Cambios en ModalAdminTemplates

- Reemplazar selector de `cadencia_step` por multi-select de tags
- Chips visuales para cada tag
- Preview del contexto donde aplica cada template

#### 2.6 Auto-fill en Wizard

- Cuando el wizard muestra acción WhatsApp, pre-detectar contexto
- Pre-llenar el campo de mensaje con el mejor template (mayor coincidencia de tags)
- SDR puede cambiar el template o escribir desde cero

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `ModalSelectorTemplate.js` | Filtrar por tags en vez de `cadencia_step` |
| `ModalAdminTemplates.js` | UI de tags en vez de `cadencia_step` |
| `sdr/contacto/[id].js` | Pasar `contacto` al modal, auto-fill en wizard |
| Backend: `sdrService.js` | `detectarContextoTemplate()` (o frontend-only) |
| Backend: modelo Template | Migrar `cadencia_step` → `tags[]` |
| Backend: endpoint templates | Filtro por tags |

### Migración

1. Agregar campo `tags` al modelo template
2. Script de migración: `cadencia_step: 1` → `['primer_contacto_inbound', 'primer_contacto_outbound']`, etc.
3. Mantener `cadencia_step` temporalmente para backwards compatibility
4. Eliminar `cadencia_step` después de verificar

---

## Fase 3 — Gestión Avanzada de Reuniones ❌

### Objetivo
Crear una página dedicada (`/sdr/reuniones`) para gestionar el ciclo completo de reuniones: preparación, registro de resultado con transcripción/IA, y seguimiento post-reunión. Arquitectura **híbrida**: página separada + banner en contactosSDR.

### Arquitectura: Página separada + banner

```
/contactosSDR  → Se queda como está (6 tabs)
  Nuevos | Reintentos | Seguimiento | Reuniones Pend. | Pasadas | Todos
  En tabs de reuniones: banner "📅 Tenés X reuniones hoy → Ir a Mis Reuniones ↗"

/sdr/reuniones → Página nueva dedicada (6 tabs)
  Hoy | Próximas | Sin registrar | Realizadas | No show | Propuestas
```

**Justificación**: Cada página tiene un propósito enfocado. contactosSDR es la "cola de trabajo" (¿a quién contacto?). Reuniones es el "modo reunión" (preparar, registrar, follow-up). 6 tabs por página es manejable; 12 no.

### 3.1 Tab "📅 Hoy"

Reuniones agendadas para hoy, ordenadas por hora. El SDR arranca el día acá.

**Card de reunión (expandida):**
- Hora + countdown ("En 45 min" / "Hace 20 min")
- Nombre + empresa del contacto
- Link de videoconferencia (botones Copiar / Abrir)
- **Resumen SDR** — Campo `resumenSDR` del contacto (§3.7). Resumen ejecutivo generado por IA a pedido del SDR desde la ficha del contacto. Muestra clasificación del lead, motivación principal, datos clave, resumen de interacciones.
- **Link WA con template recordatorio** — Abre WhatsApp con mensaje pre-armado: "Hola {nombre}! Te recuerdo nuestra reunión hoy a las {hora}. {link} ¡Nos vemos!". Template configurable por empresa.
- Acciones: ✅ Realizada (→ modal resultado), ❌ No show, 📋 Ver contacto ↗

**Empty state**: "🎉 No tenés reuniones para hoy."

### 3.2 Tab "⏳ Próximas"

Reuniones agendadas para los próximos días, agrupadas por día.

```
── Mañana (Viernes 7/3) ──────────────
  09:00  María López — Ing. Delta    [Editar] [Cancelar] [Ver contacto ↗]
  14:30  Pedro García — Est. Gamma    [Editar] [Cancelar] [Ver contacto ↗]

── Lunes 10/3 ─────────────────────────
  11:00  Ana Ruiz — Metal. Omega      [Editar] [Cancelar] [Ver contacto ↗]
```

### 3.3 Tab "📝 Sin registrar"

Reuniones cuya fecha ya pasó pero siguen en `agendada`. **Este tab no debería tener items.** Alerta visual (badge rojo) si hay reuniones > 24hs sin registrar.

Cada card muestra highlight naranja/rojo según antigüedad + "¿Cómo fue la reunión?" + botones de acción + link al contacto ↗.

**Modal de resultado (al marcar "Realizada"):**

| Paso | Campo | Obligatorio | Detalle |
|------|-------|-------------|--------|
| 1 | Estado | ✅ | Realizada / No show / Cancelada |
| 2 | Comentario | ✅ | Qué se habló, conclusiones de la reunión |
| 3 | Transcripción | ❌ | Subir archivo, subir audio, o pegar texto |
| 4 | Resumen IA | Auto | Si hay transcripción → GPT-4o genera: clasificación, puntos de interés, pasos acordados, objeciones |
| 5 | Módulos de interés | ❌ | Checkboxes: Stock, Acopios, Presupuestos, Movimientos, Plan de obra, Reportes, Otro |
| 6 | Calificación rápida | ❌ | Frío / Tibio / Caliente / Listo para cerrar |
| 7 | Próximo contacto | ✅ | Tipo (Llamar/WA/2da reunión/Propuesta/Recordatorio) + Fecha + Nota |

**Al guardar:**
1. `cambiarEstadoReunion(id, 'realizada', { comentario, transcripcion, modulosInteres, calificacionRapida })` 
2. Si hay transcripción → `POST /reuniones/:id/procesar-transcripcion` → GPT-4o genera resumenIA
3. `establecerProximaTarea(contactoId, { tipo, fecha, nota })`
4. Si elige "Enviar propuesta" → cambia estado contacto a `cierre`

### 3.4 Tab "✅ Realizadas"

Reuniones marcadas como `realizada`. Sub-filtros:
- **Sin next step** ⚠️ — Sin próxima tarea definida en el contacto
- **Sin evaluación** — Sin calificación completada
- **Todas**

Datos por fila: Fecha, Contacto (link ↗), Empresa, Comentario, Estado contacto, Próxima tarea (o "⚠️ Sin definir").

### 3.5 Tab "❌ No show"

Reuniones donde el contacto no se presentó. Acciones:
- **Reagendar** → Modal nueva reunión pre-llenado
- **Revisar más adelante** → Cambia estado contacto
- **Descartar** → Marca `no_califica`
- **Ver contacto** ↗

### 3.6 Tab "📄 Propuestas" (futuro)

Contactos en estado `cierre` con reunión realizada. Requiere campos nuevos (`propuestaEnviada`, `montoEstimado`). Se implementa en una etapa posterior.

### 3.7 Resumen SDR (campo del contacto)

Campo `resumenSDR` en ContactoSDR. Generado por **GPT-4o a pedido del SDR** (botón "Generar resumen" en la ficha del contacto). No es automático.

**Flujo:**
1. SDR hace click en "Generar resumen" desde `/sdr/contacto/[id]`
2. `POST /contactos/:id/generar-resumen`
3. Backend arma prompt con: datos del contacto, historial completo, chat WA, reuniones previas, datos del bot
4. GPT-4o genera resumen enfocado en:
   - Clasificación del lead (frío/tibio/caliente + justificación)
   - Motivación principal (qué problema quiere resolver)
   - Datos clave (decididor, presupuesto, timeline, competencia)
   - Resumen de interacciones relevantes
5. Se guarda en `contacto.resumenSDR`. Se puede regenerar en cualquier momento.

### Flujo diario del SDR

```
☀️ Arranca el día
   → /sdr/reuniones → Tab "Hoy"
   → Lee resumen SDR de cada contacto, copia link Zoom
   → Envía recordatorio WA con template pre-armado
   → Después de cada reunión → Marca "Realizada":
     Comentario obligatorio + Transcripción + Módulos de interés + Próximo contacto
   → Tab "Sin registrar" → Verifica que no quede ninguna sin cargar
   → Tab "Realizadas" → Filtra "Sin next step" → Define siguiente acción
   → Tab "No show" → Reagendar o descartar
```

### Cambios técnicos

#### Backend — Nuevos campos

| Modelo | Campo | Tipo | Detalle |
|--------|-------|------|---------|
| ContactoSDR | `resumenSDR` | String | Resumen IA del contacto |
| ReunionSDR | `comentario` | String | Comentario obligatorio post-reunión |
| ReunionSDR | `transcripcion` | String | Transcripción de la reunión |
| ReunionSDR | `resumenIA` | String | Resumen IA de la transcripción |
| ReunionSDR | `nextSteps` | String | Siguientes pasos (fix: ya se usaba sin estar en schema) |
| ReunionSDR | `modulosInteres` | [String] | Módulos de interés |
| ReunionSDR | `calificacionRapida` | String | enum: frio/tibio/caliente/listo_para_cerrar |

#### Backend — Nuevos endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/reuniones/:id` | Obtener reunión individual |
| `DELETE` | `/reuniones/:id` | Eliminar reunión |
| `POST` | `/reuniones/:id/procesar-transcripcion` | GPT-4o procesa transcripción → resumenIA |
| `POST` | `/contactos/:id/generar-resumen` | GPT-4o genera resumenSDR del contacto |

#### Backend — Modificaciones

| Qué | Detalle |
|-----|---------|
| `listarReuniones()` | Enriquecer con datos del contacto (nombre, empresa, estado, proximaTarea, contadores, resumenSDR) |
| Filtro por SDR | Filtrar por `sdrAsignado` del contacto (no solo `creadoPor`) |

#### Frontend — Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `pages/sdr/reuniones.js` | Página principal con 6 tabs |
| `components/sdr/ReunionCard.js` | Card reutilizable de reunión |
| `components/sdr/ModalResultadoReunion.js` | Modal de resultado + transcripción + próximo contacto |
| `components/sdr/ModalCrearReunion.js` | Extraer de las 3 copias inline actuales |

#### Frontend — Modificaciones

| Archivo | Cambio |
|---------|--------|
| `contactosSDR.js` | Banner en tabs reuniones → link a `/sdr/reuniones` |
| `sdr/contacto/[id].js` | Botón "Generar resumen" + mostrar `resumenSDR` |
| Nav/sidebar | Agregar link a `/sdr/reuniones` |

### Orden de implementación

| Paso | Qué | Esfuerzo |
|------|-----|----------|
| 1 | Fix schema ReunionSDR (`nextSteps` + campos nuevos) + endpoints GET/:id, DELETE | 🟢 Bajo |
| 2 | Extraer `ModalCrearReunion.js` (elimina 3 copias inline) | 🟡 Medio |
| 3 | `ModalResultadoReunion.js` (comentario + transcripción + módulos + próximo contacto) | 🟡 Medio |
| 4 | Endpoint `generar-resumen` + botón en ficha contacto | 🟡 Medio |
| 5 | Endpoint `procesar-transcripcion` (GPT-4o) | 🟡 Medio |
| 6 | Página `/sdr/reuniones` — tabs Hoy + Próximas + Sin registrar | 🔴 Alto |
| 7 | Tabs Realizadas + No show + banner en contactosSDR | 🟡 Medio |
| 8 | Tab Propuestas (futuro, requiere campos nuevos) | 🟡 Medio |

---

## Backlog (Ideas sin priorizar)

### Mejoras de UX
- [ ] Drag & drop para reordenar próximos contactos
- [ ] Atajos de teclado en el wizard (desktop)
- [ ] Notificaciones push cuando llega respuesta de WA
- [ ] Modo "focus" que muestra solo el próximo contacto

### Métricas avanzadas
- [ ] Dashboard de conversión por cadencia vs task-driven
- [ ] Heatmap de mejores horarios de contacto
- [ ] Tiempo promedio entre intentos
- [ ] Comparativa entre SDRs

### Integraciones
- [ ] Calendario (Google Calendar / Outlook) para reuniones
- [ ] CRM sync (HubSpot, Pipedrive)
- [ ] Enriquecimiento de datos (LinkedIn, Apollo)

### Automatización
- [ ] Auto-asignación de leads por reglas (rubro, zona, carga)
- [ ] Alertas de contactos sin actividad > X días
- [ ] Auto-follow-up con templates después de N días sin respuesta

---

## Cronograma Sugerido

| Semana | Fase | Entregable |
|--------|------|-----------|
| S1 | Fase 2a | Migración modelo template + `detectarContextoTemplate()` |
| S2 | Fase 2b | Refactor `ModalSelectorTemplate` + `ModalAdminTemplates` |
| S3 | Fase 2c | Auto-fill en wizard + testing |
| S4 | Fase 3a | Fix schema + endpoints faltantes + extraer `ModalCrearReunion` |
| S5 | Fase 3b | `ModalResultadoReunion` + endpoint `generar-resumen` + `procesar-transcripcion` |
| S6 | Fase 3c | Página `/sdr/reuniones` — tabs Hoy + Próximas + Sin registrar |
| S7 | Fase 3d | Tabs Realizadas + No show + banner en contactosSDR |
| S8 | Buffer | QA, ajustes, edge cases |
