# SDR — Documentación Funcional

> **Última actualización**: Marzo 2026  
> **Estado**: Fase 1 completa (tarea manda), Fase 2 pendiente (templates contextuales)

---

## 1. Visión General

El módulo SDR gestiona el ciclo de vida comercial de contactos: desde la captura (bot o importación) hasta la conversión (reunión → venta). El flujo está optimizado para **mobile-first** y basado en el principio de **"la tarea manda"**: cada contacto tiene una próxima tarea concreta (llamar, enviar WA, recordatorio) que guía al SDR.

### Principios de diseño

1. **La tarea manda** — El contacto tiene `proximaTarea` como dato principal. El wizard muestra la acción correspondiente automáticamente.
2. **Wizard post-acción** — Después de cada acción, el sistema sugiere la próxima tarea (tipo + fecha + nota). El SDR puede modificarla.
3. **Cadencia como fallback** — Si el contacto tiene cadencia activa pero no tarea explícita, el wizard usa el paso actual de la cadencia.
4. **Un contacto, una bandeja** — Cada contacto aparece en una sola bandeja según su estado y situación.

---

## 2. Entidades Principales

### 2.1 Contacto SDR

Entidad central del sistema. Representa una persona/empresa a contactar.

| Campo | Descripción |
|-------|-------------|
| **nombre** / **teléfono** | Datos obligatorios |
| **email** / **empresa** / **cargo** | Datos opcionales |
| **estado** | Ciclo de vida del contacto (ver §2.2) |
| **segmento** | `inbound` (viene del bot) o `outbound` (importado/manual) |
| **sdrAsignado** | SDR responsable (Firebase UID) |
| **proximaTarea** | `{ tipo, fecha, nota, autoGenerada }` — la próxima acción a realizar |
| **proximoContacto** | Fecha/hora del siguiente contacto (derivada de proximaTarea.fecha) |
| **contadores** | `{ llamadasNoAtendidas, llamadasAtendidas, mensajesEnviados, reunionesTotales }` |
| **precalificacionBot** | Resultado del bot: `sin_calificar`, `calificado`, `quiere_meet`, `no_llego` |
| **planEstimado** | Plan estimado: `basico` ($250k), `avanzado` ($375k), `premium` ($625k), `a_medida` |
| **intencionCompra** | `alta`, `media`, `baja` |
| **prioridadScore** | Puntaje calculado para ordenar la cola de trabajo |
| **cadenciaActiva** | Cadencia asignada (legacy, usado como fallback si no hay proximaTarea) |
| **origenImportacion** | `manual`, `excel`, `notion`, `bot` |
| **resumenSDR** | Resumen ejecutivo del contacto generado por IA a pedido del SDR (§2.6) |

### 2.2 Estados del Contacto

```
nuevo → contactado → calificado → cierre → ganado
                  ↘ no_responde
                  ↘ no_contacto
                  ↘ revisar_mas_adelante
                  ↘ no_califica
                  ↘ perdido
```

| Estado | Significado | Color |
|--------|-------------|-------|
| `nuevo` | Recién ingresado, sin contacto efectivo | 🔵 info |
| `contactado` | Se logró contacto efectivo (atendió llamada o respondió WA) | 🟠 warning |
| `calificado` | Interés y datos confirmados | 🟢 success |
| `cierre` | Negociación activa / propuesta enviada | 🟣 secondary |
| `ganado` | Conversión exitosa | 🟢 success |
| `no_contacto` | No se pudo establecer contacto | ⚪ default |
| `no_responde` | Múltiples intentos sin respuesta | ⚪ default |
| `revisar_mas_adelante` | Para revisar después | 🟠 warning |
| `no_califica` | Descartado | 🔴 error |
| `perdido` | Oportunidad perdida | 🔴 error |

**Transición `nuevo → contactado`**: Solo ocurre cuando hay **contacto efectivo bidireccional**: llamada atendida, respuesta de WA confirmada, o WA con resultado "respondió". Enviar un WA sin respuesta **no** cambia el estado.

### 2.3 Próxima Tarea

Reemplaza a la cadencia como mecanismo principal de trabajo. Cada contacto tiene una tarea pendiente:

| Campo | Descripción |
|-------|-------------|
| `tipo` | `llamada`, `whatsapp`, `email`, `recordatorio` |
| `fecha` | Cuándo ejecutar la tarea |
| `nota` | Contexto (ej: "3 llamadas sin respuesta, probar WA") |
| `autoGenerada` | `true` si la generó el sistema, `false` si la definió el SDR |

**Sugerencia automática post-acción:**

| Acción | Resultado | Tarea sugerida |
|--------|-----------|----------------|
| 📞 Llamada | No atendió (1-2x) | 📞 Llamar +1 día |
| 📞 Llamada | No atendió (3+) | 💬 WA ahora |
| 📞 Llamada | Atendió → llamar después | 📞 Llamar +1 día |
| 📞 Llamada | Atendió → mensaje después | 💬 WA +1 día |
| 📞 Llamada | Atendió → coordinar reunión | 📝 Recordatorio +2h |
| 💬 WA | Enviado, pendiente respuesta | 📝 Revisar +2 días |
| 💬 WA | Respondió positivo | 📞 Llamar ahora |
| 💬 WA | No respondió | 📞 Llamar +1 día |
| ✉️ Email | Enviado | 📞 Llamar +2 días |

### 2.4 Reunión SDR

Representa una reunión coordinada con un contacto.

| Estado | Significado |
|--------|-------------|
| `agendada` | Programada, pendiente |
| `realizada` | Se llevó a cabo |
| `no_show` | El contacto no se presentó |
| `cancelada` | Cancelada |

Campos adicionales: fecha, hora, link, lugar, notas, participantes, duración, datos de evaluación (empresa, tamaño, puntos de dolor, módulos potenciales).

Campos post-reunión:
- **comentario**: Comentario obligatorio del SDR al registrar resultado
- **transcripcion**: Transcripción de la reunión (subida manual o pegada)
- **resumenIA**: Resumen generado por GPT-4o a partir de la transcripción (clasificación, puntos de interés, pasos acordados, objeciones)
- **nextSteps**: Siguientes pasos definidos por el SDR
- **modulosInteres**: Módulos de interés para contratar (`[String]`)
- **calificacionRapida**: `frio`, `tibio`, `caliente`, `listo_para_cerrar`

### 2.5 Evento Historial

Cada acción sobre un contacto genera un evento en el historial. Hay **38 tipos** agrupados en:

- **Llamadas**: `llamada_atendida`, `llamada_no_atendida`
- **WhatsApp**: `whatsapp_enviado`, `whatsapp_respuesta`, `whatsapp_respuesta_confirmada`
- **Otros canales**: `email_enviado`, `linkedin_enviado`, `instagram_contacto`
- **Reuniones**: `reunion_agendada`, `reunion_realizada`, `reunion_no_show`, `reunion_cancelada`, etc.
- **Comerciales**: `presupuesto_enviado`, `negociacion_iniciada`, `link_pago_enviado`
- **Bot**: `bot_interaccion`, `bot_timeout`, `lead_inbound_bot`
- **Estado**: `cambio_estado`, `estado_cambiado`, `marcado_no_califica`, `marcado_no_responde`
- **Cadencia**: `cadencia_iniciada`, `cadencia_avanzada`, `cadencia_completada`, `cadencia_detenida`
- **Asignaciones**: `contacto_creado`, `contacto_asignado`, `contacto_desasignado`, `contacto_reasignado`
- **Importación**: `importado_excel`, `importado_notion`, `contexto_inicial`
- **Otros**: `nota_agregada`, `comentario`, `proximo_contacto_programado`

**Visualización agrupada**: El historial se agrupa por bloques temporales de **30 minutos**. Los eventos de una misma sesión de trabajo (ej: llamar → registrar resultado → programar siguiente) se muestran agrupados con un separador temporal ("Hoy 14:30", "Ayer 09:15", "Lun 11:00").

### 2.6 Resumen SDR (campo del contacto)

Campo `resumenSDR` en ContactoSDR. Es un resumen ejecutivo del contacto generado por **GPT-4o a pedido del SDR** (no se genera automáticamente).

**Cómo funciona:**
1. El SDR hace click en "Generar resumen" desde la ficha del contacto
2. El backend arma un prompt con: datos del contacto, historial completo, chat de WA, reuniones previas, datos del bot
3. GPT-4o genera un resumen enfocado en:
   - **Clasificación del lead** (frío/tibio/caliente + justificación)
   - **Motivación principal** (qué problema quiere resolver)
   - **Datos clave** (decididor, presupuesto, timeline, competencia)
   - **Resumen de interacciones** (puntos relevantes)
4. Se guarda como campo del contacto. El SDR puede regenerarlo cuando quiera.

**Uso principal:** En la página de reuniones (§3.5), la card de "Hoy" muestra este resumen para que el SDR se prepare antes de cada reunión.

---

## 3. Páginas del Sistema

### 3.1 Gestión SDR (`/gestionSDR`)

Vista de administrador con **3 tabs**:

| Tab | Contenido |
|-----|-----------|
| **Dashboard** | Métricas del día (llamadas, WA, reuniones, pendientes, sin asignar), tabla de actividad por SDR, últimas reuniones |
| **Contactos** | Tabla de TODOS los contactos con filtros: búsqueda, estado, Status Notion, SDR, sin asignar. Acciones masivas: asignar, desasignar, eliminar |
| **Reuniones** | Lista de reuniones agendadas con evaluación |

### 3.2 Contactos SDR (`/contactosSDR`)

Vista del SDR individual. Solo muestra **sus contactos asignados**.

#### Bandejas (Tabs)

| Bandeja | Qué muestra | Objetivo del SDR |
|---------|-------------|------------------|
| **📥 Nuevos** | Leads vírgenes: estado `nuevo`, 0 intentos (contadores todos en 0) | Lograr primer contacto |
| **🔄 Reintentos** | `nuevo` con intentos fallidos (algún contador > 0) O cadencia activa vencida | Lograr contacto efectivo |
| **🤝 Seguimiento** | `contactado` / `calificado` / `cierre` **sin reunión agendada** | Agendar una reunión |
| **📅 Reuniones** | Con reunión agendada a futuro (fecha ≥ hoy) | Prepararse y asistir |
| **⏪ Pasadas** | Con reunión pasada sin reunión pendiente (realizada, no_show, o agendada vencida) | Registrar resultado, post-follow up |
| **📋 Todos** | Todos los contactos (con filtros por estado) | Vista general |

**Un contacto aparece en una sola bandeja** (no hay solapamiento):
```
[NUEVOS] (0 intentos)
    ↓ intento sin éxito
[REINTENTOS] (intentando lograr contacto)
    ↓ contacto efectivo
[SEGUIMIENTO] (contactado, objetivo: agendar)
    ↓ reunión agendada
[REUNIONES] (pendientes)
    ↓ reunión realizada / pasada
[PASADAS] (registrar resultado)
```

#### Vista Reuniones (Pendientes y Pasadas)

En estas bandejas, la tabla muestra columnas específicas:
- **Pendientes**: Fecha, Hora, Contacto, Empresa, Estado, Link/Lugar
- **Pasadas**: Fecha, Hora, Contacto, Empresa, Estado, **Resultado** (Realizada/No show/Cancelada/Vencida), Lugar

#### Otros filtros
- **Próximo contacto**: Sin fecha / Vencidos / Vencidos hoy 🔥 / Pendientes
- **Segmento**: 🔵 Inbound / 🟠 Outbound
- **Actividad**: Sin actividad / No atendidas / Atendidas / Sin llamadas / Mensajes / Reuniones
- **Ordenamiento**: Próximo / Más nuevo / Prioridad / Estado
- **Búsqueda**: Por nombre, empresa, teléfono
- **Vistas guardadas**: Combinaciones de filtros reutilizables

### 3.3 Detalle Contacto (`/sdr/contacto/[id]`)

Vista de contacto individual con **3 tabs**:

| Tab | Contenido |
|-----|-----------|
| **Info** | Datos del contacto, estado editable, plan estimado, intención de compra, próxima tarea, cadencia activa, reuniones |
| **Historial** | Timeline de eventos agrupados por bloque temporal (30 min), campo para comentarios, eliminar evento |
| **Chat** | Visor de chat de WhatsApp en tiempo real |

#### Wizard de Acción

Barra fija inferior (mobile) / Sección dedicada (desktop). Muestra la acción a realizar según `proximaTarea.tipo`:

| Tarea | Wizard muestra |
|-------|---------------|
| `llamada` | Botón "📞 Llamar" → Resultado → Seguimiento → Próxima tarea |
| `whatsapp` | Campo de mensaje + "💬 Enviar WA" → ¿Respondió? → Seguimiento → Próxima tarea |
| `email` | Campo de mensaje + "✉️ Email" → Seguimiento → Próxima tarea |
| `recordatorio` | Nota de la tarea + "✅ Listo" → Definir próxima tarea |
| Sin tarea + cadencia | Fallback al paso actual de cadencia (chip "📋 Cadencia") |
| Sin nada | Botones genéricos: Llamar / WhatsApp / Otra acción |

**Elementos del wizard:**
- Chip con horario sugerido de la tarea
- Botones para modificar o eliminar la tarea
- Pre-selección automática de próxima tarea al completar acción
- Navegación ← → entre contactos sin salir del detalle

### 3.4 Cadencias (`/sdr/cadencias`)

ABM completo de cadencias con pasos multi-acción, templates de WA por variante de rubro, delays configurables. Se usan como fallback cuando un contacto no tiene `proximaTarea`.

### 3.5 Reuniones SDR (`/sdr/reuniones`) — Fase 3

> ⏳ **Pendiente de implementación**

Página dedicada para gestionar reuniones. Complementa a contactosSDR (que mantiene sus bandejas de reuniones pendientes/pasadas como referencia rápida con un banner "📅 Tenés X reuniones hoy → Ir a Mis Reuniones").

#### Tabs

| Tab | Contenido | Objetivo del SDR |
|-----|-----------|------------------|
| **📅 Hoy** | Reuniones agendadas para hoy, ordenadas por hora | Prepararse para el día |
| **⏳ Próximas** | Agendadas para los próximos días, agrupadas por día | Ver pipeline de reuniones |
| **📝 Sin registrar** | Fecha pasada + siguen en `agendada` (sin resultado) | Registrar qué pasó (no debe quedar ninguna) |
| **✅ Realizadas** | Marcadas como `realizada` | Seguimiento post-reunión |
| **❌ No show** | Contacto no se presentó | Reagendar o descartar |
| **📄 Propuestas** | Contactos en `cierre` con reunión realizada (futuro) | Pipeline de cierre |

#### Tab "Hoy" — Card expandida

Cada reunión del día se muestra como card con:
- **Hora + countdown** ("En 45 min" / "Hace 20 min")
- **Nombre + empresa** del contacto
- **Link de videoconferencia** (botones Copiar / Abrir)
- **Resumen SDR** (§2.6) — el resumen ejecutivo generado por IA del contacto
- **Link WA con template de recordatorio** — abre WhatsApp con mensaje pre-armado: "Hola {nombre}! Te recuerdo nuestra reunión hoy a las {hora}. {link} ¡Nos vemos!"
- **Acciones**: ✅ Realizada → abre modal resultado, ❌ No show, 📋 Ver contacto ↗

#### Tab "Sin registrar" — Modal de resultado

Cuando el SDR marca "Realizada" (desde cualquier tab), se abre un modal completo:

1. **Estado**: Realizada / No show / Cancelada
2. **Comentario de la reunión** (obligatorio): Qué se habló, conclusiones
3. **Transcripción** (opcional): Subir archivo, subir audio, o pegar texto
4. **Resumen IA** (auto-generado si hay transcripción): GPT-4o genera clasificación del lead, puntos de interés, pasos acordados, objeciones
5. **Módulos de interés**: Checkboxes (Stock, Acopios, Presupuestos, Movimientos, Plan de obra, Reportes, Otro)
6. **Calificación rápida**: Frío / Tibio / Caliente / Listo para cerrar
7. **Próximo contacto** (obligatorio): Tipo (Llamar/WA/2da reunión/Enviar propuesta/Recordatorio) + Fecha + Nota
8. **Link al contacto** ↗

#### Tab "Realizadas"

- Sub-filtros: **Sin next step** ⚠️ / **Sin evaluación** / **Todas**
- Datos por fila: Fecha, Contacto (link ↗), Empresa, Notas, Estado, Próxima tarea

#### Tab "No show"

- Acciones: Reagendar / Mover a revisar más adelante / Descartar / Ver contacto ↗

#### Tab "Propuestas" (futuro)

- Requiere campos nuevos: `propuestaEnviada`, `montoEstimado`
- Se implementa después

#### Flujo del SDR en esta página

```
☀️ Arranca el día
   → Tab "Hoy" → Lee resumen SDR, copia link Zoom, envía recordatorio WA
   → Después de cada reunión → Marca "Realizada" → Modal resultado:
     Comentario + Transcripción + Módulos de interés + Próximo contacto
   → Tab "Sin registrar" → Verifica que no quede ninguna sin cargar
   → Tab "Realizadas" → Filtra "Sin next step" → Define siguiente acción
   → Tab "No show" → Reagendar o descartar
```

---

## 4. Flujos de Uso

### 4.1 Flujo Inbound (Bot → SDR)

1. Visitante interactúa con el bot de WhatsApp
2. Bot precalifica y captura datos (nombre, rubro, interés)
3. **Bridge** crea automáticamente un `ContactoSDR` con `segmento: 'inbound'`
4. Se auto-asigna la cadencia default inbound (si existe)
5. El contacto aparece en la bandeja "Nuevos" del SDR asignado

### 4.2 Flujo Outbound (Importación → SDR)

1. Admin importa contactos desde Excel o Notion
2. Contactos se crean con `segmento: 'outbound'`
3. Admin asigna contactos a SDRs desde gestión
4. SDR puede asignar cadencia masivamente o trabajar por tarea
5. SDR trabaja la cola empezando por "Nuevos"

### 4.3 Ciclo Diario del SDR

```
Abrir contactosSDR → Bandeja "Nuevos" → Tocar contacto →
  Wizard muestra acción según proximaTarea:
  │
  ├── 📞 Llamar → Resultado → Sistema sugiere próxima tarea → Siguiente
  ├── 💬 WhatsApp → Enviar → ¿Respondió? → Próxima tarea → Siguiente
  └── 📝 Recordatorio → Ver nota → Definir próxima tarea → Siguiente
```

### 4.4 Evaluación de Reuniones

1. SDR coordina reunión → estado `agendada` → bandeja "Reuniones" en contactosSDR
2. El día de la reunión → aparece en tab "Hoy" de `/sdr/reuniones`
3. SDR se prepara con el resumen SDR + envía recordatorio WA
4. Post-reunión → marca resultado con modal completo (comentario + transcripción + módulos + próximo contacto)
5. Si quedó sin registrar → aparece en tab "Sin registrar" (alerta visual)
6. En "Realizadas" → verifica que tenga next step definido

---

## 5. Importación de Contactos

### 5.1 Excel

| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| Nombre | ✅ | Nombre completo |
| Teléfono | ✅ | Cualquier formato (se normaliza a E.164) |
| Email | ❌ | Correo electrónico |
| Empresa | ❌ | Nombre de empresa |
| Cargo | ❌ | Cargo del contacto |
| Notas | ❌ | Notas iniciales |
| Próximo contacto | ❌ | Fecha DD/MM/YYYY |

**Validaciones**: duplicados internos, duplicados en BD, formato de teléfono.

### 5.2 Notion

Importa contactos desde bases de datos Notion con mapeo automático de campos y comentarios.

---

## 6. Asignación y Distribución

- **Individual**: Gestión SDR → seleccionar contactos → "Asignar" → elegir SDR
- **Masiva**: Seleccionar múltiples → "Distribuir equitativamente" → round-robin entre SDRs
- **Desasignación**: Contacto vuelve al pool (sin SDR)
- **Pool**: Contactos sin `sdrAsignado`, visibles con filtro "Sin asignar"

---

## 7. Métricas

### Métricas del SDR (en contactosSDR)
- Llamadas realizadas / atendidas
- WhatsApp enviados
- Reuniones coordinadas
- Tasa de contacto (%)
- Total asignados
- Filtrable por período: Hoy / Semana / Mes

### Métricas Admin (en gestionSDR)
- Métricas agregadas del equipo
- Tabla de actividad por SDR
- Últimas reuniones coordinadas
