# SDR — Documentación Funcional

## 1. Visión General

El módulo SDR gestiona el ciclo de vida comercial de contactos: desde la captura (bot o importación) hasta la conversión (reunión → venta). El flujo está optimizado para mobile-first.

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
| **proximoContacto** | Fecha/hora del siguiente contacto programado |
| **cantidadIntentos** | Número acumulado de intentos de contacto |
| **precalificacionBot** | Resultado del bot: `sin_calificar`, `calificado`, `quiere_meet`, `no_llego` |
| **planEstimado** | Plan estimado: `basico` ($250k), `avanzado` ($375k), `premium` ($625k), `a_medida` |
| **intencionCompra** | `alta`, `media`, `baja` |
| **prioridadScore** | Puntaje calculado para ordenar la cola de trabajo |
| **cadenciaActiva** | Cadencia asignada (ID, paso actual, estado) |
| **origenImportacion** | `manual`, `excel`, `notion`, `bot` |

### 2.2 Estados del Contacto

El contacto pasa por estos estados (no necesariamente lineales):

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
| `nuevo` | Recién ingresado, sin contactar | 🔵 info |
| `contactado` | Se hizo al menos un intento | 🟠 warning |
| `calificado` | Interés y datos confirmados | 🟢 success |
| `cierre` | Negociación activa | 🟣 secondary |
| `ganado` | Conversión exitosa | 🟢 success |
| `no_contacto` | No se pudo establecer contacto | ⚪ default |
| `no_responde` | Múltiples intentos sin respuesta | ⚪ default |
| `revisar_mas_adelante` | Para revisar después | 🟠 warning |
| `no_califica` | Descartado | 🔴 error |
| `perdido` | Oportunidad perdida | 🔴 error |

### 2.3 Reunión SDR

Representa una reunión coordinada con un contacto.

| Estado | Significado |
|--------|-------------|
| `agendada` | Programada, pendiente |
| `realizada` | Se llevó a cabo |
| `no_show` | El contacto no se presentó |
| `cancelada` | Cancelada |

Campos adicionales: fecha, hora, link, lugar, notas, participantes, duración, datos de evaluación.

### 2.4 Evento Historial

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

Cada evento puede tener: resultado (`atendio`, `no_atendio`, `respondio`, `no_respondio`, `pendiente`), nota, canal, metadata.

---

## 3. Páginas del Sistema

### 3.1 Gestión SDR (`/gestionSDR`)

Vista de administrador con **3 tabs**:

| Tab | Contenido |
|-----|-----------|
| **Dashboard** | Métricas del día (llamadas, WhatsApp, reuniones, pendientes, sin asignar), tabla de actividad por SDR, últimas reuniones |
| **Contactos** | Tabla/lista de TODOS los contactos con filtros: búsqueda, estado, Status Notion, **SDR**, sin asignar. Acciones masivas: asignar, desasignar, eliminar |
| **Reuniones** | Lista de reuniones agendadas con evaluación (aprobar/rechazar) |

**Filtros disponibles (tab Contactos):**
- Búsqueda por texto
- Estado del contacto
- Status Notion
- SDR asignado (dropdown)
- Solo sin asignar

### 3.2 Contactos SDR (`/contactosSDR`)

Vista del SDR individual. Solo muestra **sus contactos asignados**.

**Filtros:**
- **Tipo**: Activos / Vencidos / No calificados / Todos
- **Estado**: Chips por cada estado
- **Próximo contacto**: Sin fecha / Vencidos / Pendientes
- **Segmento**: 🔵 Inbound / 🟠 Outbound
- **Búsqueda**: Por nombre, empresa, teléfono

**Cards de contacto muestran:**
- Nombre + estado (chip color)
- Empresa o teléfono
- Badges: precalificación bot, prioridad, segmento (In/Out)
- Próximo contacto con color (verde=pendiente, rojo=vencido)
- Botones rápidos: 📞 Llamar / 💬 WhatsApp

**Vistas guardadas**: El SDR puede guardar combinaciones de filtros como "vistas" reutilizables (privadas o compartidas).

### 3.3 Detalle Contacto (`/sdr/contacto/[id]`)

Vista de contacto individual con **3 tabs** (mobile y desktop):

| Tab | Contenido |
|-----|-----------|
| **Info** | Datos del contacto, estado editable, plan estimado, intención de compra, próximo contacto, cadencia activa, reuniones |
| **Historial** | Timeline de todos los eventos (con posibilidad de eliminar eventos erróneos), campo para agregar comentarios |
| **Chat** | Visor de chat de WhatsApp en tiempo real |

**Barra fija inferior (mobile)**: Siempre visible, muestra el paso actual de la cadencia con botones de acción rápida.

**Navegación**: Botones ← → para ir al contacto anterior/siguiente sin salir del detalle. Atajos de teclado en desktop.

### 3.4 Cadencias (`/sdr/cadencias`)

ABM completo de cadencias. Ver [SDR-CADENCIAS.md](SDR-CADENCIAS.md) para detalle.

---

## 4. Flujos de Uso

### 4.1 Flujo Inbound (Bot → SDR)

1. Visitante interactúa con el bot de WhatsApp
2. Bot precalifica y captura datos (nombre, rubro, interés)
3. **Bridge** crea automáticamente un `ContactoSDR` con `segmento: 'inbound'`
4. Se auto-asigna la **cadencia default inbound** (si existe)
5. El contacto aparece en la cola del SDR asignado

### 4.2 Flujo Outbound (Importación → SDR)

1. Admin importa contactos desde Excel o Notion
2. Contactos se crean con `segmento: 'outbound'`
3. Admin asigna contactos a SDRs desde gestión
4. SDR asigna **cadencia default outbound** manualmente o masivamente
5. SDR trabaja la cola

### 4.3 Ciclo Diario del SDR

```
Abrir lista → Filtrar vencidos → Abrir contacto →
  ├── Llamar
  │   ├── Atendió → Registrar llamada → Programar siguiente / Coordinar reunión
  │   └── No atendió → Registrar → WhatsApp (template cadencia) → Siguiente
  ├── WhatsApp directo
  │   └── Elegir template → Enviar → Registrar → Siguiente
  └── Marcar estado
      ├── No responde
      ├── No califica
      └── Reunión coordinada
```

### 4.4 Evaluación de Reuniones (Admin)

1. SDR coordina reunión → queda con estado `agendada`
2. Después de la reunión, admin evalúa en tab Reuniones
3. Puede marcar: `realizada`, `no_show`, `cancelada`
4. Agrega notas de evaluación

---

## 5. Importación de Contactos

### 5.1 Excel

**Columnas esperadas:**

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

Importa contactos desde bases de datos Notion con soporte para:
- Mapeo automático de campos
- Comentarios (formato viejo string y nuevo array)
- Máximo 10 notas importadas por contacto

---

## 6. Asignación y Distribución

### Asignación Individual
- Desde gestión SDR → seleccionar contactos → "Asignar" → elegir SDR

### Asignación Masiva
- Seleccionar múltiples contactos → "Distribuir equitativamente" → seleccionar SDRs → se reparten round-robin

### Desasignación
- Contacto vuelve al pool (sin SDR asignado)

### Pool
- Contactos sin `sdrAsignado` están en el pool
- Visible desde gestión con filtro "Sin asignar"
