# Rediseño Módulo Comercial — Documento Funcional

> **Fecha**: 23/02/2026  
> **Origen**: Reunión Federico Maidan + Fernando Falasca — Procesos Área Comercial  
> **Objetivo**: Unificar todo el flujo comercial (SDR + Ventas) dentro de la app interna, eliminando la dependencia de Notion, Google Sheets y procesos manuales fragmentados.

---

## Resumen Ejecutivo

Hoy el proceso comercial está fragmentado en 4 herramientas: **Google Sheets** (métricas), **Notion** (seguimiento de estados), **WhatsApp Web** (contacto manual) y la **agenda del celular** (llamadas). El SDR tiene que copiar/pegar entre todas, lo que genera:

- Pérdida de tiempo en contexto switching entre herramientas
- Riesgo de error humano (contactos que se pierden, estados desactualizados)
- Imposibilidad de delegar (el proceso es demasiado artesanal)
- Métricas inconsistentes (se cargan manualmente con retraso)

**La visión**: Un SDR abre la app → ve sus contactos ordenados por prioridad → toca "Llamar" → marca resultado → envía WhatsApp → pasa al siguiente. Todo sin salir de la app. Las métricas se generan solas.

---

## Estado Actual vs. Objetivo

| Aspecto | Hoy | Objetivo |
|---------|-----|----------|
| **Carga de leads nuevos** | Manual: copiar teléfonos de Sheet → WhatsApp → agenda | Automático: leads entran al sistema y se asignan |
| **Llamadas** | Copiar teléfono → app teléfono → volver a Notion → registrar | Tap "Llamar" → se inicia llamada → marcar resultado |
| **WhatsApp** | Copiar número → buscar en WhatsApp → pegar template | Tap "WhatsApp" → seleccionar template → se abre pre-cargado |
| **Estados** | ~25 estados en Notion (confusos, no delegables) | Estados limpios + scoring multidimensional + historial completo |
| **Métricas** | Manual en Google Sheets (Looker Studio 2) | Automáticas a partir de las acciones registradas |
| **Seguimiento** | Filtros por fecha en Notion (se mezclan contactos) | Por estado + próximo contacto + scoring |
| **Reuniones** | Checkbox en Notion + fecha manual | Registro completo con evaluación |
| **Ventas** | Columna en Sheets con fecha manual | Pipeline integrado con plan y ticket |
| **Cadencias** | Templates manuales sueltos | Cadencias configurables con pasos |

---

## 1. Rediseño de Estados

El problema principal identificado en la reunión: los estados actuales no representan la realidad del contacto, por eso Fernando necesita filtrar por fecha. Los estados deben ser **puros** y representar el paso real en el funnel.

### Flujo principal de estados

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/flujo-estados-sdr.excalidraw`  
> Ver instrucciones al final del documento para crearlo.

```
                              FLUJO PRINCIPAL (happy path)
 ┌──────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
 │  NUEVO   │────▶│ CONTACTADO │────▶│ CALIFICADO │────▶│   MEET     │────▶│  MEET    │────▶│  CIERRE  │──▶ GANADO
 │   ℹ️     │     │    💬      │     │    ⭐      │     │  AGENDADA  │     │ REALIZADA│     │   🤝     │
 └────┬─────┘     └─────┬──────┘     └─────┬──────┘     │    📅      │     │   ✅     │     └────┬─────┘
      │                 │                   │            └────────────┘     └──────────┘          │
      │                 │                   │                                                     │
      ▼                 ▼                   ▼                                                     ▼
 ┌──────────┐     ┌───────────┐     ┌─────────────────┐                                    ┌──────────┐
 │    NO    │     │    NO     │     │    REVISAR      │                                    │ PERDIDO  │
 │ CONTACTO │     │ RESPONDE  │     │  MÁS ADELANTE   │                                    │    ❌    │
 │   📵     │     │    👻     │     │      ⏰         │                                    └──────────┘
 └──────────┘     └───────────┘     └─────────────────┘
                                                         ┌──────────┐
                       (Desde cualquier estado) ────────▶│    NO    │
                                                         │ CALIFICA │
                                                         │    🚫    │
                                                         └──────────┘
```

### Definición de estados

| Estado | Emoji | Color | Significado | ¿Cuándo se aplica? | Visible para |
|--------|-------|-------|-------------|---------------------|--------------|
| **nuevo** | ℹ️ | Celeste | Acaba de llegar, no se intentó contactar | Lead entra al sistema | SDR |
| **contactado** | 💬 | Amarillo | Se habló al menos una vez | Llamada atendida o respuesta de WhatsApp | SDR |
| **calificado** | ⭐ | Verde | Dio información útil: rubro, obras, tamaño, interés | SDR obtiene datos de calificación | SDR |
| **meet_agendada** | 📅 | Azul | Se coordinó reunión con fecha/hora | SDR agenda reunión | SDR + Manager |
| **meet_realizada** | ✅ | Azul oscuro | La reunión ocurrió (pendiente evaluar resultado) | Se marca que la meet se hizo | Manager |
| **cierre** | 🤝 | Verde fuerte | En negociación activa / propuesta enviada | Post-meet con interés concreto | Vendedor |
| **ganado** | 🏆 | Verde brillante | Venta concretada | Se cierra la venta | Manager |
| **no_contacto** | 📵 | Gris | Intentos hechos sin lograr contacto | Múltiples intentos sin respuesta | SDR |
| **no_responde** | 👻 | Gris claro | Contactó pero dejó de responder | Contacto ghost | SDR |
| **revisar_mas_adelante** | ⏰ | Naranja | Interés pero timing no es ahora | "Háblame en 2 meses" | SDR |
| **no_califica** | 🚫 | Rojo | No es target (no es del rubro, no aplica) | SDR descarta | Archivo |
| **perdido** | ❌ | Rojo oscuro | Pasó por pipeline pero no se concretó | Tras meet o propuesta sin éxito | Archivo |

### Mapeo desde Notion → Nuevos Estados

| Notion Status | → Nuevo Estado |
|---------------|----------------|
| BOT, Lead | nuevo |
| Cadence2..5 | nuevo (con paso de cadencia registrado) |
| NoContact | no_contacto |
| Humano, Whatsapp, Llamado, Instagram | contactado |
| Qualified | calificado |
| BotQualified, Consulta Valores | calificado |
| BotMeet, BookedMeet | meet_agendada |
| Meet, Meet2 | meet_realizada |
| NoMeet, NoShow | meet_realizada (con resultado negativo) |
| Presupuesto, Negotiation | cierre |
| NoInteres | no_califica |
| Lost | perdido |
| Alias | no_califica (con nota) |

### Visualización del estado en la UI

El estado se muestra como un **Chip de color** con emoji, consistente en toda la app:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tarjeta de contacto (lista)                                        │
│                                                                     │
│  Juan Pérez                          [⭐ Calificado]               │
│  Constructora ABC · 51-200 emp.      [🟣 Premium] [🔴 Alta]       │
│  📞 +5491145678900                                                  │
│  Próximo: mañana 10:00               Intentos: 3                   │
│  "Lo charla con su socio, llamar el 26"                            │
│                                                                     │
│  [📞 Llamar]  [💬 WhatsApp]  [⋮]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

Los chips visibles en cada tarjeta:
- **Chip de estado** (ej: `⭐ Calificado` en verde)
- **Chip de plan estimado** (ej: `🟣 Premium` en violeta) — solo si está definido
- **Chip de intención** (ej: `🔴 Alta` en rojo) — solo si está definido

---

## 2. Scoring Multidimensional (Priorización)

El scoring tiene **dos dimensiones independientes** que se combinan para calcular la prioridad de un contacto:

### 2.1 Plan Estimado (¿Qué plan le conviene?)

Es la lectura del SDR sobre **qué plan de Sorby encaja mejor** con el perfil del contacto. Se basa en datos objetivos: cantidad de obras, tamaño del equipo, necesidades técnicas.

| Plan | Precio | Criterio de asignación | Color | Emoji |
|------|--------|------------------------|-------|-------|
| **Premium** | $625.000/mes | +10 obras, necesita ERP, integraciones | Violeta | 🟣 |
| **Avanzado** | $375.000/mes | 5-10 obras, equipo en calle, personalización | Azul | 🔵 |
| **Básico** | $250.000/mes | 1-5 obras, equipo chico, recién empieza | Verde | 🟢 |
| **A medida** | Variable | +20 obras, corporativo, requisitos custom | Amarillo | 🟡 |
| **Sin definir** | — | Todavía no se habló lo suficiente | Gris | ⚪ |

**Cuándo se asigna**: Al calificar al contacto. El SDR pregunta "¿Cuántas obras tenés?" / "¿Cuántas personas son?" y con eso elige el plan.

**Se puede cambiar**: Sí, en cualquier momento. Si en la meet se revela que es más grande de lo pensado, se sube.

#### Selector visual del plan

```
┌─────────────────────────────────────────────────────────────────────┐
│  Plan estimado                                                      │
│                                                                     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐          │
│  │ 🟢 Básico │ │🔵 Avanzado│ │🟣 Premium │ │🟡 A medida│          │
│  │  $250k    │ │  $375k    │ │  $625k    │ │  Custom   │          │
│  │  ≤5 obras │ │  5-10     │ │  10+      │ │  20+      │          │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘          │
│       ○              ○            ●              ○                  │
│                                 ▲ seleccionado                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Intención de Compra (¿Cuántas ganas tiene?)

Es la lectura **subjetiva** del SDR sobre qué tan probable es que este contacto compre. Se basa en señales blandas: urgencia, entusiasmo, preguntas que hace, tiempos que menciona.

| Intención | Significado | Señales típicas | Color | Emoji |
|-----------|-------------|-----------------|-------|-------|
| **Alta** | Quiere arrancar, timing claro | "Arrancamos la semana que viene", pregunta precios, pide demo | Rojo | 🔴 |
| **Media** | Interesado pero sin urgencia | "Lo tengo que ver con mi socio", "pasame más info" | Naranja | 🟠 |
| **Baja** | Curiosidad, exploración | "Solo quiero ver qué hacen", no hace preguntas | Amarillo | 🟡 |
| **Sin definir** | Todavía no se habló lo suficiente | Default | Gris | ⚪ |

**Cuándo se asigna**: Cuando el SDR tiene una impresión. Puede ser desde la primera llamada atendida.

**Se puede cambiar**: Sí, se actualiza con cada interacción. Un contacto de intención "Baja" puede subir a "Alta" después de una buena meet.

#### Selector visual de intención

```
┌─────────────────────────────────────────────────────────────────────┐
│  Intención de compra                                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                         │
│  │ 🟡 Baja  │  │ 🟠 Media │  │ 🔴 Alta  │                         │
│  └──────────┘  └──────────┘  └──────────┘                         │
│       ○              ●              ○                               │
│                    ▲ seleccionado                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Matriz Plan × Intención (vista Manager)

Combinar ambas dimensiones permite visualizar el pipeline como una **matriz de calor**:

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/matriz-plan-intencion.excalidraw`

```
              │  🟡 Baja    │  🟠 Media   │  🔴 Alta    │
──────────────┼─────────────┼─────────────┼─────────────┤
🟣 Premium    │      1      │      2      │    ★ 3      │  ← MÁS VALIOSOS
──────────────┼─────────────┼─────────────┼─────────────┤
🔵 Avanzado   │      3      │      5      │    ★ 4      │
──────────────┼─────────────┼─────────────┼─────────────┤
🟢 Básico     │      8      │      4      │      2      │
──────────────┼─────────────┼─────────────┼─────────────┤
⚪ Sin definir │     12      │      —      │      —      │  ← NECESITAN CALIFICARSE
──────────────┴─────────────┴─────────────┴─────────────┘
                                              ★ = prioridad máxima
```

Los números representan cantidad de contactos. Las celdas con **★** son los que el SDR debe atender primero. Esto se muestra en el dashboard del manager como una grilla de calor con colores de intensidad.

### 2.4 Prioridad Calculada (automática)

La lista de contactos se ordena por un **score compuesto** que mezcla todas las dimensiones:

| Factor | Peso | Lógica |
|--------|------|--------|
| **Próximo contacto vencido** | Máximo | +100 por día vencido (cap en 500). Siempre primero |
| **Intención de compra** | Alto | Alta: +300, Media: +200, Baja: +100, Sin definir: 0 |
| **Plan estimado** | Alto | A medida: +500, Premium: +400, Avanzado: +250, Básico: +150, Sin definir: 0 |
| **Tamaño empresa** | Medio | 200+: +100, 51-200: +60, 11-50: +30, 1-10: +10 |
| **Frescura** | Medio | ≤1 día: +200, ≤7 días: +150, ≤14 días: +100, ≤30 días: +50 |
| **Estado avanzado** | Medio | meet_agendada/cierre: +250, calificado: +150, contactado: +100 |
| **Sin próximo contacto** | Penalización | -50 (para que aparezcan pero no arriba del todo) |

#### Ejemplo práctico de ordenamiento

| # | Contacto | Plan | Intención | Vencido | Score | Por qué está ahí |
|---|----------|------|-----------|---------|-------|-------------------|
| 1° | Constructora ABC | 🟣 Premium | 🔴 Alta | 2 días | **1160** | Premium + Alta + vencido |
| 2° | Estudio Arq. XYZ | 🔵 Avanzado | 🟠 Media | 1 día | **730** | Avanzado + Media + vencido |
| 3° | María (lead nueva) | ⚪ Sin definir | ⚪ Sin definir | — | **280** | Nueva de hoy (frescura alta) |
| 4° | Pedro (básico) | 🟢 Básico | 🟡 Baja | — | **210** | Básico + Baja, sin urgencia |

**El SDR no ve el número de score**, solo ve la lista ordenada. Pero el manager puede ver un indicador visual (barra o color) del score relativo.

---

## 3. Ficha del Contacto (Drawer de Detalle)

El drawer es la pantalla principal donde el SDR trabaja cada contacto. Se abre al tocar un contacto de la lista.

### Layout mobile (pantalla completa desde abajo)

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/drawer-contacto-mobile.excalidraw`

```
┌─────────────────────────────────────────────────────────────────────┐
│  [←]  Juan Pérez                                    [← Ant] [Sig →]│
│       Constructora ABC                                              │
│                                                                     │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ ⭐ Calificado  ▼  │  │  🟣 Premium  ▼   │  │  🔴 Alta  ▼     │ │
│  └───────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐   │
│  │                             │  │                            │   │
│  │   📞  LLAMAR                │  │   💬  WHATSAPP             │   │
│  │   +5491145678900            │  │   Seleccionar template     │   │
│  │                             │  │                            │   │
│  └─────────────────────────────┘  └────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ DATOS DEL CONTACTO                                  [Editar]│   │
│  │ 📞 +5491145678900 (principal)                               │   │
│  │ 📞 +5491198765432 (oficina)                                 │   │
│  │ 📧 juan@constructora-abc.com                                │   │
│  │ 🏢 Constructora ABC · 51-200 empleados                     │   │
│  │ 👤 Director de Obra                                         │   │
│  │ 🏗️ Construcción                                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ PRÓXIMO CONTACTO                                             │   │
│  │                                                              │   │
│  │ ⚠️ Vencido hace 2 días (21/02 10:00)                        │   │
│  │                                                              │   │
│  │ Reprogramar:                                                 │   │
│  │ [1h] [3h] [Mañana] [3 días] [1 sem] [📅 Elegir fecha]     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ COMENTARIO RÁPIDO                                            │   │
│  │ ┌──────────────────────────────────────────────┐ [Enviar]   │   │
│  │ │ Escribir nota...                             │             │   │
│  │ └──────────────────────────────────────────────┘             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ HISTORIAL                               [Filtrar por tipo ▼]│   │
│  │                                                              │   │
│  │  📞 23/02 14:30 — Llamada atendida                          │   │
│  │     "Tiene 3 obras, estudio de 15 personas, quiere ver      │   │
│  │      el video. Lo charla con su socio."                      │   │
│  │     SDR: Fernando → Estado: ⭐ Calificado                   │   │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │   │
│  │  📞 23/02 10:00 — Llamada no atendida                       │   │
│  │     SDR: Fernando | Cadencia: Paso 1                         │   │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │   │
│  │  💬 22/02 16:00 — WhatsApp enviado                          │   │
│  │     Template: "Primer contacto - Constructoras"              │   │
│  │     SDR: Fernando | Cadencia: Paso 3                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ╔══════════════════════════════════════════════════════════════╗   │
│  ║              📋 REGISTRAR ACCIÓN                            ║   │
│  ╚══════════════════════════════════════════════════════════════╝   │
│           ▲ Botón sticky en la parte inferior                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Chips editables inline

Los tres chips de la parte superior son **tocables** y abren un menú desplegable para cambiar el valor:

```
  Toco "⭐ Calificado ▼"              Toco "🟣 Premium ▼"           Toco "🔴 Alta ▼"
  ┌──────────────────┐                ┌──────────────────┐          ┌──────────────────┐
  │ ℹ️ Nuevo          │                │ 🟢 Básico        │          │ 🟡 Baja          │
  │ 💬 Contactado     │                │ 🔵 Avanzado      │          │ 🟠 Media         │
  │ ⭐ Calificado  ✓  │                │ 🟣 Premium    ✓  │          │ 🔴 Alta       ✓  │
  │ 📅 Meet agendada  │                │ 🟡 A medida      │          │ ⚪ Sin definir    │
  │ ✅ Meet realizada  │                │ ⚪ Sin definir    │          └──────────────────┘
  │ 🤝 En cierre      │                └──────────────────┘
  │ ─ ─ ─ ─ ─ ─ ─ ─  │
  │ 📵 No contacto    │
  │ 👻 No responde    │
  │ ⏰ Revisar luego  │
  │ 🚫 No califica    │
  │ ❌ Perdido         │
  └──────────────────┘
```

---

## 4. Loop de Llamadas (Modo Llamadas)

El flujo que Fernando describió como ideal: **"Siguiente → Llamar → Registrar → Siguiente"**

### Pantalla "Modo Llamadas" (mobile-first)

Se accede desde un botón prominente en la vista de contactos. Es una pantalla dedicada, no un drawer.

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/modo-llamadas.excalidraw`

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [✕ Salir]           12 / 47                        [Filtro ▼]     │
│                    contactados                                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ■■■■■■■■■■■■□□□□□□□□□□□                  │   │
│  │                         Barra de progreso                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                                                     │
│            [⭐ Calificado]  [🟣 Premium]  [🔴 Alta]                │
│                                                                     │
│                      Juan Pérez                                     │
│                   Constructora ABC                                  │
│                   51-200 empleados                                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📝 Última nota (23/02 14:30):                               │   │
│  │  "Lo charla con su socio, le mandé el video.                │   │
│  │   Llamar el 26 para ver si avanzó."                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│        Cadencia: Paso 2/5 · Intentos: 3                            │
│                                                                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │                                                              │   │
│  │                     📞  LLAMAR                               │   │
│  │                  +5491145678900                               │   │
│  │                                                              │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                                                     │
│  [← Anterior]                                       [Saltar →]     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   │
│  │ 📞 ✗      │   │ 📞 ✓      │   │ 💬 WA     │   │ 📅 Meet   │   │
│  │ No        │   │ Atendió   │   │ Enviar    │   │ Agendar   │   │
│  │ atendió   │   │           │   │ WhatsApp  │   │ reunión   │   │
│  └───────────┘   └───────────┘   └───────────┘   └───────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Filtros de entrada al Modo Llamadas

Antes de entrar, el SDR elige qué grupo de contactos trabajar:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ¿A quiénes vas a llamar?                                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  🔴 Vencidos                                           (23) │   │
│  │  Contactos con próximo contacto pasado                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  🆕 Nuevos de hoy                                      (8)  │   │
│  │  Leads que entraron hoy, sin ningún intento                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📅 Con próximo contacto hoy                           (12) │   │
│  │  Programados para hoy                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📵 No contactados (reintentar)                        (45) │   │
│  │  Estado no_contacto, para un segundo ciclo                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  📋 Todos mis contactos                               (187) │   │
│  │  Ordenados por prioridad (score)                             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujos post-acción

#### "No atendió"
1. Se registra intento automáticamente
2. Se incrementa contador de intentos
3. Aparece opción: **"¿Enviar WhatsApp?"** → si sí, abre selector de template
4. Si tiene 3+ intentos sin respuesta → sugerir cambiar a `no_contacto`
5. Se avanza al siguiente contacto

#### "Atendió"
1. Se abre mini-modal:
   ```
   ┌──────────────────────────────────────────┐
   │  📞 Llamada atendida                     │
   │                                          │
   │  Nota: ________________________________  │
   │  ____________________________________    │
   │                                          │
   │  Nuevo estado:  [💬 Contactado ▼]        │
   │  Plan estimado: [⚪ Sin definir ▼]       │
   │  Intención:     [⚪ Sin definir ▼]       │
   │                                          │
   │  Próximo contacto:                       │
   │  [Mañana] [3 días] [1 sem] [📅 Fecha]  │
   │                                          │
   │  [Cancelar]            [Guardar + Sig →] │
   └──────────────────────────────────────────┘
   ```
2. El plan e intención se muestran solo si el estado es `calificado` o superior
3. "Guardar + Sig" guarda todo y avanza al siguiente contacto

#### "WhatsApp"
1. Abre selector de template (por paso de cadencia)
2. Se reemplazan variables (`{{first_name}}`, `{{company}}`, `{{assigned_to}}`)
3. Se abre `wa.me` con el mensaje pre-cargado
4. Al volver a la app: se registra automáticamente
5. Se avanza al siguiente contacto

#### "Agendar Reunión"
1. Se abre modal de reunión con campos: fecha, hora, link, notas
2. Estado cambia a `meet_agendada`
3. Se avanza al siguiente contacto

### Tabla resumen de acciones

| Resultado | Nota | Próximo contacto | Estado | Plan | Intención |
|-----------|------|-------------------|--------|------|-----------|
| No atendió | Opcional | Auto: mañana | → no_contacto (si 3+) | — | — |
| Atendió - sin info | Requerida | Manual | → contactado | — | Opcional |
| Atendió - con info | Requerida | Manual | → calificado | **Selector** | **Selector** |
| Quiere meet | Requerida | Fecha de meet | → meet_agendada | **Selector** | **Selector** |
| No interesa | Motivo requerido | — | → no_califica | — | — |
| "Hablame más adelante" | Requerida | Obligatorio | → revisar_mas_adelante | Opcional | Opcional |

---

## 5. Métricas Automáticas

Todas las métricas se calculan desde el historial de acciones. No hay carga manual.

### Dashboard SDR (su vista)

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/dashboard-sdr.excalidraw`

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Mis métricas                     [Hoy ▼] [Semana] [Mes]       │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ 📞 32    │ │ ✅ 12    │ │ 💬 18    │ │ ⭐ 5     │ │ 📅 2     ││
│  │ Llamadas │ │ Atendidas│ │ WhatsApp │ │Calificad.│ │ Meets    ││
│  │          │ │  37.5%   │ │          │ │          │ │          ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PENDIENTES                                                  │   │
│  │  🔴 8 vencidos · 🟡 12 para hoy · 📵 3 sin programar       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MI PIPELINE (por plan estimado)                             │   │
│  │                                                              │   │
│  │  🟣 Premium   ████████░░░░░░░░░░░  3 contactos  ($1.875k)  │   │
│  │  🔵 Avanzado  ████████████░░░░░░░  5 contactos  ($1.875k)  │   │
│  │  🟢 Básico    ██████░░░░░░░░░░░░░  4 contactos  ($1.000k)  │   │
│  │  ⚪ Sin definir ████████████████░░ 15 contactos              │   │
│  │                                              Total: $4.750k  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ╔══════════════════════════════════════════════════════════════╗   │
│  ║               📞 INICIAR MODO LLAMADAS                      ║   │
│  ╚══════════════════════════════════════════════════════════════╝   │
└─────────────────────────────────────────────────────────────────────┘
```

### Dashboard Manager (vista equipo)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Métricas del equipo                  [Hoy ▼] [Semana] [Mes]   │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ 📞 84    │ │ ✅ 31    │ │ 💬 52    │ │ ⭐ 12    │ │ 📅 5     ││
│  │ Llamadas │ │ Atendidas│ │ WhatsApp │ │Calificad.│ │ Meets    ││
│  │ total    │ │  36.9%   │ │ total    │ │          │ │          ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  FUNNEL DE CONVERSIÓN                                        │   │
│  │                                                              │   │
│  │  Nuevo      ████████████████████████████████████████  200    │   │
│  │  Contactado ████████████████████████░░░░░░░░░░░░░░░  120    │   │
│  │  Calificado █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   45    │   │
│  │  Meet       ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   18    │   │
│  │  Cierre     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    8    │   │
│  │  Ganado     █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    3    │   │
│  │                                                              │   │
│  │  Tasa contacto: 60% → Tasa calificación: 37% → Cierre: 1.5% │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MATRIZ PLAN × INTENCIÓN                                    │   │
│  │                                                              │   │
│  │             │  🟡 Baja  │  🟠 Media │  🔴 Alta  │  ⚪ S/D  │   │
│  │  🟣 Premium │    ░░ 1   │    ▒▒ 2   │    ██ 3 ★ │    ░░ 1  │   │
│  │  🔵 Avanzado│    ░░ 3   │    ▒▒ 5   │    ██ 4 ★ │    ░░ 2  │   │
│  │  🟢 Básico  │    ░░ 8   │    ▒▒ 4   │    ▒▒ 2   │    ░░ 3  │   │
│  │  ⚪ S/D     │    ░░ 5   │    ░░ —   │    ░░ —   │   ░░ 12  │   │
│  │                                                              │   │
│  │  ★ = prioridad máxima    ░ bajo  ▒ medio  █ alto            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  POR SDR                                                     │   │
│  │                                                              │   │
│  │  Fernando  📞 42  ✅ 18  💬 28  ⭐ 8  📅 3    Carga: 98    │   │
│  │  Miriam    📞 42  ✅ 13  💬 24  ⭐ 4  📅 2    Carga: 89    │   │
│  │                                                              │   │
│  │  📊 Velocidad de contacto: 2.3h promedio (lead → 1er intento)│   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Ingreso Automático de Leads

Eliminar el paso manual de copiar teléfonos de la Sheet "Métricas Leads":

- Los eventos `nuevo_contacto` de la base de datos de eventos (la tabla de Google Sheets "event") se procesan automáticamente
- El lead se crea en el sistema con estado `nuevo` y se asigna al SDR de turno (o al pool)
- El SDR ve los nuevos en su bandeja sin hacer nada
- Si el lead ya existe (mismo teléfono), no se duplica

### Vista del lead recién ingresado

```
┌─────────────────────────────────────────────────────────────────────┐
│  🆕 NUEVO                                            hace 3 min    │
│                                                                     │
│  5491122439888                                                      │
│  "Yo trabajo en una fábrica de puertas de madera,                  │
│   en este momento... 894 puertas"                                   │
│                                                                     │
│  Origen: Inbound (nuevo_contacto)                                   │
│  Sin asignar                                                        │
│                                                                     │
│  [📞 Llamar]  [💬 WhatsApp]  [👤 Asignarme]                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Sistema de Cadencias

Una cadencia es una secuencia de pasos de contacto con tiempos definidos.

### Cadencia por defecto: "Primer Contacto"

Lo que Fernando ya hace manualmente, sistematizado:

| Paso | Momento | Acción | Template | Condición |
|------|---------|--------|----------|-----------|
| 1 | D+0 (AM) | 📞 Llamada | — | Siempre |
| 2 | D+0 (PM) | 📞 Llamada | — | Si paso 1 no atendió |
| 3 | D+0 (PM) | 💬 WhatsApp | "Primer contacto" (según rubro) | Si paso 2 no atendió |
| 4 | D+1 | 💬 WhatsApp | "Video + presentación" | Si no respondió |
| 5 | D+3 | 💬 WhatsApp | "Último follow-up" | Si no respondió |

### Comportamiento

- Al crear un contacto `nuevo`, se asigna la cadencia "Primer Contacto"
- El sistema programa los `proximoContacto` automáticamente según el paso
- **Si el contacto responde** (estado cambia a `contactado` o superior) → la cadencia se **detiene**
- **Si no responde tras paso 5** → estado cambia a `no_contacto` automáticamente
- El SDR ve el paso actual de la cadencia en la tarjeta del contacto
- El SDR **puede saltear pasos** o **pausar** la cadencia manualmente

### Cadencias adicionales (configurables por el manager)

| Cadencia | Para quién | Trigger |
|----------|-----------|---------|
| "Re-engagement" | Contactos `revisar_mas_adelante` | Cuando llega la fecha programada |
| "Post-meet sin respuesta" | Contactos `meet_realizada` que no avanzan | 3 días después de la meet sin cambio |
| "Follow-up calificado" | Contactos `calificado` que no llegan a meet | 5 días sin acción |

### Indicador visual de cadencia en la tarjeta

```
┌─────────────────────────────────────────────────────────────────────┐
│  Juan Pérez · Constructora ABC              [ℹ️ Nuevo]             │
│                                                                     │
│  Cadencia: Primer Contacto                                          │
│  ● ● ● ○ ○   Paso 3/5 — WhatsApp "Primer contacto"               │
│  ▲▲▲                                                               │
│  completados                                                        │
│                                                                     │
│  Próximo: Hoy 16:00 (en 2h)                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Importante (de la reunión)
> "Primero pasar por eso y después vemos" — Fernando  
> "Si hacemos lo 100% automático, se nos podía [ir de las manos]" — Federico

Las cadencias **NO envían mensajes automáticamente**. Solo organizan la cola y sugieren la acción. El SDR siempre confirma manualmente. En una fase futura se podrían automatizar los WhatsApp.

---

## 8. Historial Enriquecido (Status Sum)

Equivalente al "Status Sum" de Notion: un registro de todos los estados por los que pasó el contacto, más todas las acciones realizadas.

### Vista del historial en el Drawer

```
┌──────────────────────────────────────────────────────────────────┐
│  HISTORIAL                                  [Filtrar por tipo ▼] │
│                                                                  │
│  ┌───── Hoy ──────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  14:30  📞 Llamada atendida                                │  │
│  │         ┌─────────────────────────────────────────────┐    │  │
│  │         │ "Tiene 3 obras, estudio de 15 personas.     │    │  │
│  │         │  Quiere ver el video. Lo charla con su      │    │  │
│  │         │  socio. Llamar el 26."                      │    │  │
│  │         └─────────────────────────────────────────────┘    │  │
│  │         SDR: Fernando                                      │  │
│  │         Estado: 💬 Contactado → ⭐ Calificado              │  │
│  │         Plan: ⚪ → 🟣 Premium   Intención: ⚪ → 🟠 Media   │  │
│  │                                                            │  │
│  │  10:00  📞 Llamada no atendida                             │  │
│  │         SDR: Fernando · Cadencia: Paso 1                   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───── Ayer ─────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  16:00  💬 WhatsApp enviado                                │  │
│  │         Template: "Primer contacto - Constructoras"        │  │
│  │         SDR: Fernando · Cadencia: Paso 3                   │  │
│  │                                                            │  │
│  │  09:00  📞 Llamada no atendida                             │  │
│  │         SDR: Fernando · Cadencia: Paso 2                   │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───── 20/02 ────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  12:00  ℹ️ Contacto creado                                 │  │
│  │         Origen: Inbound (nuevo_contacto)                   │  │
│  │         Asignado a: Fernando Falasca                       │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Filtros del historial

El dropdown "Filtrar por tipo" permite ver solo:
- 📞 Llamadas
- 💬 WhatsApp
- 📅 Reuniones
- 📝 Notas
- 🔄 Cambios de estado
- Todos (default)

### Novedades vs. historial actual

Lo que se agrega al historial que ya existe:
- **Cambios de plan/intención visibles**: cuando cambia plan estimado o intención, se registra con `antes → después`
- **Paso de cadencia visible** en cada acción
- **Notas más prominentes**: las notas se muestran en un recuadro visual destacado, no como texto plano
- **Agrupado por día** con separadores visuales claros
- **Filtro por tipo de evento**: para que el SDR pueda buscar rápido

---

## 9. Búsqueda y Filtros Avanzados

Para reemplazar las vistas personalizadas de Notion.

### Barra de filtros

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Buscar contacto...                                             │
│                                                                     │
│  [Estado ▼] [Plan ▼] [Intención ▼] [Próximo ▼] [SDR ▼] [Más ▼]  │
│                                                                     │
│  Filtros activos: ⭐ Calificado ✕  |  🟣 Premium ✕  |  🔴 Alta ✕ │
└─────────────────────────────────────────────────────────────────────┘
```

### Filtros disponibles

| Filtro | Opciones |
|--------|----------|
| **Estado** | Multi-select: todos los estados |
| **Plan estimado** | Premium / Avanzado / Básico / A medida / Sin definir |
| **Intención de compra** | Alta / Media / Baja / Sin definir |
| **Tamaño empresa** | 1-10 / 11-50 / 51-200 / 200+ |
| **Paso de cadencia** | Paso 1, 2, 3, 4, 5 / Sin cadencia |
| **Próximo contacto** | Vencido / Hoy / Esta semana / Sin programar |
| **SDR asignado** | Dropdown con SDRs (solo vista manager) |
| **Segmento** | Outbound / Inbound |
| **Fecha de creación** | Rango de fechas |
| **Última acción** | Rango de fechas |
| **Búsqueda libre** | Nombre, empresa, teléfono, notas |

### Vistas guardadas (presets)

Aparecen como tabs/chips encima de la lista:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [🔴 Para llamar hoy (23)] [🆕 Nuevos (8)] [⭐ Calificados (15)] │
│  [⏰ Revisar esta semana (5)] [📵 Reintentar (45)] [+ Nueva vista] │
└─────────────────────────────────────────────────────────────────────┘
```

| Vista | Filtros aplicados | Orden |
|-------|-------------------|-------|
| "Para llamar hoy" | Próximo = Vencido + Hoy | Por score desc |
| "Nuevos sin contactar" | Estado = nuevo, intentos = 0 | Más reciente primero |
| "Calificados sin meet" | Estado = calificado, sin reunión | Por score desc |
| "Revisar esta semana" | Estado = revisar_mas_adelante, próximo = esta semana | Por fecha próximo contacto |
| "Reintentar" | Estado = no_contacto, creado hace > 1 semana | Por fecha creación |

El manager puede crear vistas propias y compartirlas con el equipo.

---

## 10. Pipeline de Ventas Post-Meet

Hoy el proceso termina en "calificado" o "meet". Pero Fernando también trackea ventas, planes, tickets. El pipeline extiende el flujo:

### Flujo post-meet

```
meet_realizada → cierre → ganado
                       └→ perdido
```

### Datos de la Oportunidad de Venta

Cuando un contacto pasa a `cierre`, se le agregan estos datos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Plan interesado | Selector | Básico / Avanzado / Premium / A medida |
| Ticket estimado | Número | Valor mensual estimado en $ |
| Fecha estimada de cierre | Date | Cuándo se espera cerrar |
| Módulos interesados | Multi-select | Qué módulos de Sorby le interesan |
| Probabilidad | % | Manual: 25%, 50%, 75%, 90% |
| Notas de negociación | Text | Objeciones, condiciones, next steps |

### Vista Pipeline (Manager)

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/pipeline-ventas.excalidraw`

```
┌─────────────────────────────────────────────────────────────────────┐
│  PIPELINE DE VENTAS                          Período: [Feb 2026 ▼] │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  🤝 CIERRE   │  │  🏆 GANADO   │  │  ❌ PERDIDO  │             │
│  │    5 deals   │  │    2 deals   │  │    1 deal    │             │
│  │   $2.375k    │  │   $1.000k    │  │    $375k     │             │
│  │              │  │              │  │              │             │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │             │
│  │ │Const. ABC│ │  │ │Estudio XY│ │  │ │Ing. López│ │             │
│  │ │🟣 Premium│ │  │ │🔵 Avanz. │ │  │ │🔵 Avanz. │ │             │
│  │ │  $625k   │ │  │ │  $375k   │ │  │ │  $375k   │ │             │
│  │ │  90% 📅3d│ │  │ │ Alta: ✅ │ │  │ │Motivo:   │ │             │
│  │ └──────────┘ │  │ └──────────┘ │  │ │"Precio"  │ │             │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ └──────────┘ │             │
│  │ │Arq. Peres│ │  │ │ACME SRL  │ │  │              │             │
│  │ │🔵 Avanz. │ │  │ │🟣 Premium│ │  │              │             │
│  │ │  $375k   │ │  │ │  $625k   │ │  │              │             │
│  │ │  75% 📅7d│ │  │ │          │ │  │              │             │
│  │ └──────────┘ │  │ └──────────┘ │  │              │             │
│  │ ┌──────────┐ │  │              │  │              │             │
│  │ │  ...+3   │ │  │              │  │              │             │
│  │ └──────────┘ │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
│  ──────────────────────────────────────────────────────────────     │
│  Pipeline por plan:                                                 │
│  🟣 Premium   ████████████████  3 × $625k = $1.875k               │
│  🔵 Avanzado  ████████████      4 × $375k = $1.500k               │
│  🟢 Básico    ████              2 × $250k = $500k                  │
│                                             Total: $3.875k/mes     │
│                                                                     │
│  Tasa de cierre: 67% (2/3) · Ticket promedio: $500k               │
│  Tiempo promedio: 18 días (lead → ganado)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Transición a Cliente

Cuando un contacto pasa a `ganado`:
- Se crea el registro de cliente en el sistema de Sorby
- Se registra: plan, fecha de alta, ticket, módulos
- El contacto SDR queda vinculado al cliente para trazabilidad
- El SDR recibe crédito en sus métricas

### Métricas de Google Sheets Reemplazadas

La hoja "Looker Studio2" quedaría obsoleta:

| Columna Sheet | → Reemplazo en App |
|---------------|---------------------|
| WhatsApp | Teléfono del contacto |
| Contactos | Auto (1 contacto = 1 registro) |
| Fecha_Semana / Mes_Contacto | Auto (createdAt agrupado) |
| Leads_Calificados | Historial: cambio a estado `calificado` |
| Basura | Estado `no_califica` |
| Leads_Llamada | Historial: eventos `llamada_atendida` |
| Leads_Whatsapp | Historial: eventos `whatsapp_enviado` |
| Meets_Realizadas / Meets_Agendadas | Reuniones (por estado) |
| Fecha_Reunion / Mes_Reunion | Auto (fecha de la reunión) |
| Ventas_A | Contactos en estado `ganado` |
| Fecha_Venta / Mes_Venta | Auto (fecha de cambio a `ganado`) |

---

## 11. Automatización de WhatsApp

### Etapa A: Asistido (primera implementación)

- El sistema **sugiere** el mensaje del paso actual de la cadencia
- El SDR toca "Enviar" → se abre WhatsApp pre-cargado → confirma
- Se registra automáticamente el envío y avanza al siguiente paso
- Es lo que ya existe, pero integrado con las cadencias

### Etapa B: Bot Dedicado (futuro)

- Un segundo número de WhatsApp (no el personal de Fernando)
- Bot que envía los mensajes de cadencia automáticamente
- Se detiene al recibir respuesta o al cambiar de estado
- Requiere: número nuevo, sesión Baileys separada, monitoreo

### Reglas de seguridad

- **Máximo 50 mensajes/día** por número (evitar ban)
- **No enviar entre 21:00 y 08:00**
- **Si responde → detener cadencia inmediatamente**
- **Si bloquea → marcar como no_contacto**
- **El SDR puede pausar/reanudar cualquier cadencia**

### Detección de Respuesta

Cuando el contacto responde al WhatsApp:
- Notificación al SDR
- Se pausa la cadencia automática
- Se registra en historial como "respuesta recibida"
- El contacto sube en prioridad

---

## 12. Reportes e Inteligencia

### Funnel de Conversión Visual

```
┌──────────────────────────────────────────────────────────────────┐
│  FUNNEL DE CONVERSIÓN                Feb 2026 vs Ene 2026       │
│                                                                  │
│  Nuevo      ████████████████████████████████████  200  (100%)   │
│                                                    ↓ 60%        │
│  Contactado ██████████████████████░░░░░░░░░░░░░░  120  (60%)   │
│                                                    ↓ 37.5%      │
│  Calificado ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░   45  (22.5%) │
│                                                    ↓ 40%        │
│  Meet       ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   18  (9%)    │
│                                                    ↓ 44.4%      │
│  Cierre     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    8  (4%)    │
│                                                    ↓ 37.5%      │
│  Ganado     █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    3  (1.5%)  │
│                                                                  │
│  ────────────────────────────────────────────────────────────    │
│  vs mes anterior: +12% contactados, -5% calificados             │
└──────────────────────────────────────────────────────────────────┘
```

### Alertas y Notificaciones

| Alerta | Destinatario | Canal |
|--------|-------------|-------|
| Lead nuevo asignado | SDR | Push / In-app |
| Próximo contacto vencido (>24h) | SDR + Manager | In-app |
| Meet mañana | SDR | Push |
| Contacto sin acción hace 5 días | Manager | In-app |
| Reunión pendiente de evaluar | Manager | In-app |
| Premium con intención Alta sin acción | Manager | In-app |

---

## Resumen de Funcionalidades por Fase

| Fase | Funcionalidades |
|------|----------------|
| **1** | Estados puros · Scoring (plan + intención) · Loop de llamadas · Métricas auto · Ingreso automático de leads |
| **2** | Cadencias configurables · Historial enriquecido · Filtros avanzados · Vistas guardadas |
| **3** | Pipeline de ventas · Transición a cliente · Reemplazo de Google Sheets |
| **4** | WhatsApp asistido con cadencias · Bot dedicado (futuro) |
| **5** | Funnel visual · Alertas · Comparativas de período |

---

## Notas de la Reunión Relevantes

- **Fernando prioriza por nuevos** (< 2 semanas) y luego por estado → el score calculado debe replicar esto
- **Las cadencias NO deben ser inmutables**: "No tan inmutable por así decir" — el SDR debe poder ajustar tiempos
- **Delegabilidad**: "Si es difícil delegar después no lo puede delegar" — pocos estados, flujo simple
- **Revivir contactos**: Leads viejos que vuelven necesitan un camino claro (→ `revisar_mas_adelante` con próximo contacto)
- **Meet ≠ Qualify**: Hay que separar "tuve meet" de "lo califiqué". Un contacto puede estar calificado sin meet y con meet sin estar en cierre
- **Plan estimado ≠ Intención de compra**: Son dos dimensiones distintas. Plan = qué plan le conviene por perfil. Intención = cuántas ganas tiene de comprar. Un contacto puede ser Premium con intención baja (empresa grande que no tiene urgencia) o Básico con intención alta (equipo chico que quiere arrancar ya)
- **El control sigue siendo del SDR**: "Si hacemos lo 100% automático, se nos podía [correr]" — nada se envía sin confirmación humana (al menos en las primeras fases)

---

## Guía para Excalidraw

Para crear los diagramas sugeridos, usar estos lineamientos:

### `flujo-estados-sdr.excalidraw`
- **Tipo**: Diagrama de flujo con nodos y flechas
- **Nodos**: Rectángulos redondeados con emoji + nombre del estado + color de fondo
- **Flechas**: Líneas sólidas para el happy path, punteadas para salidas negativas
- **Colores**: Celeste (nuevo), Amarillo (contactado), Verde (calificado), Azul (meets), Verde fuerte (cierre/ganado), Gris (no_contacto/no_responde), Naranja (revisar), Rojo (no_califica/perdido)

### `matriz-plan-intencion.excalidraw`
- **Tipo**: Grilla/tabla 4×4 con colores de calor
- **Filas**: Planes (Premium, Avanzado, Básico, Sin definir)
- **Columnas**: Intención (Alta, Media, Baja, Sin definir)
- **Colores**: De rojo intenso (Premium + Alta) a gris claro (Sin definir + Sin definir)
- **Números**: Cantidad de contactos en cada celda

### `drawer-contacto-mobile.excalidraw`
- **Tipo**: Wireframe de pantalla mobile
- **Dimensiones**: 375×812 (iPhone)
- **Secciones**: Header con chips, CTAs, datos, próximo contacto, comentario, historial, FAB

### `modo-llamadas.excalidraw`
- **Tipo**: Wireframe de pantalla mobile
- **Foco**: Botón LLAMAR enorme en el centro, barra de progreso arriba, acciones rápidas abajo

### `dashboard-sdr.excalidraw`
- **Tipo**: Wireframe de dashboard
- **Secciones**: Métricas cards arriba, pipeline por plan en el medio, botón modo llamadas

### `pipeline-ventas.excalidraw`
- **Tipo**: Kanban board con 3 columnas (Cierre, Ganado, Perdido)
- **Cards**: Con plan, ticket, probabilidad
- **Barra inferior**: Pipeline por plan con barras de progreso
