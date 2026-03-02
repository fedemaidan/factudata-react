# Rediseño Módulo Comercial — Documento Funcional v2

> **Versión**: 2.0  
> **Fecha**: 24/02/2026  
> **Origen**: Reunión Federico Maidan + Fernando Falasca — Procesos Área Comercial  
> **Objetivo**: Unificar todo el flujo comercial (SDR + Ventas) dentro de la app interna, eliminando la dependencia de Notion, Google Sheets y procesos manuales fragmentados.

---

## Changelog v2

Cambios respecto a la versión anterior, incorporando feedback de Fernando Falasca:

| # | Cambio | Antes (v1) | Ahora (v2) | Motivo |
|---|--------|-----------|------------|--------|
| 1 | **Estados simplificados** | 12 estados incluyendo `meet_agendada` y `meet_realizada` como estados del contacto | 10 estados puros. Las reuniones dejan de ser estados del contacto | Las meets son eventos con ciclo de vida propio, no un estado del contacto. Un contacto calificado puede tener 3 meets sin que su estado cambie |
| 2 | **Reuniones como entidad separada** | Las reuniones eran un estado más en el flujo lineal | Entidad independiente con lifecycle propio: `agendada` → `realizada` / `no_show` / `cancelada`. Cada reunión tiene número (1ª, 2ª, 3ª...) | Fernando hace Meet, Meet2, NoShow, CancelMeet — esto no encaja en un estado lineal del contacto |
| 3 | **Pre-calificación del Bot** | No existía. El bot era parte del estado "nuevo" | Nuevo campo `precalificacionBot` con valores: `sin_calificar`, `no_llego`, `calificado`, `quiere_meet` | Los estados de Notion BOTNew, BOT, BOTQualified, BotMeet representan el progreso del lead en el bot antes de llegar al SDR |
| 4 | **Canal ≠ Estado** | Humano, WA, Llamado, Instagram aparecían en el mapeo como estados | El canal es implícito en el tipo de acción del historial (`llamada_atendida`, `whatsapp_enviado`, `instagram_contacto`). No es un estado | En Notion son "Status Sum" (log de acciones), no estados exclusivos. Un contacto puede haber sido llamado Y whatsappeado |
| 5 | **Alias = Link de pago** | Alias mapeaba a `no_califica` | Alias es una acción del historial: `link_pago_enviado`. Significa que se envió el link de pago/onboarding | En el proceso real, "Alias" es cuando Fernando envía el link de pago. Es una acción de cierre, no un descarte |
| 6 | **Cadencia real de 14 días** | Cadencia genérica de 5 pasos en 3 días | 4 pasos en 14 días con templates reales de Fernando, variaciones por rubro, y secuencia progresiva donde cada mensaje referencia al anterior | Cadencia basada en el proceso real que Fernando ejecuta manualmente hoy |
| 7 | **Status Sum = Historial** | El historial era un registro plano de acciones | Se aclara que el historial es el equivalente del "Status Sum" de Notion: un log acumulativo de todo lo que pasó con el contacto. Los estados de Notion NO son estados exclusivos sino entradas de log | Fernando explicó que en Notion los "status" son entradas de log, no estados mutuamente exclusivos |
| 8 | **Presupuesto y Negociación** | Mapeaban a estado `cierre` directamente | Son acciones del historial (`presupuesto_enviado`, `negociacion_iniciada`). El estado `cierre` se activa cuando hay intención concreta post-meet | Son eventos que ocurren durante el proceso de cierre, no el estado en sí |
| 9 | **Fuentes de leads y deduplicación** | No existía. Lead (Firestore) y ContactoSDR (MongoDB) eran dos mundos sin vínculo | Se define el puente entre ambos: el bot crea/actualiza ContactoSDR automáticamente; importaciones desde Notion deduplicat por teléfono; contactos fríos se enriquecen si después interactúan con el bot | Hoy un mismo contacto puede existir dos veces sin saberlo. El teléfono es la clave de deduplicación universal |
| 10 | **Contadores de actividad por contacto** | Solo se mostraba "Intentos: 3" genérico en la tarjeta | 4 contadores calculados automáticamente desde el historial: `llamadasNoAtendidas`, `llamadasAtendidas`, `mensajesEnviados`, `reunionesTotales`. Visibles como mini-badges en tarjeta, drawer y modo llamadas | Permite al SDR ver de un vistazo cuánto esfuerzo se invirtió en cada contacto y diferenciar leads vírgenes de leads trabajados sin cambiar de estado |

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
| **Reuniones** | Checkbox en Notion + fecha manual | Entidad independiente con lifecycle completo |
| **Ventas** | Columna en Sheets con fecha manual | Pipeline integrado con plan y ticket |
| **Cadencias** | Templates manuales sueltos | Cadencias de 14 días con pasos, templates por rubro y seguimiento automático |

---

## 1. Rediseño de Estados

### Principio de diseño

> **Los estados representan dónde está el contacto en el funnel comercial, no qué acciones se hicieron ni qué canal se usó.**

Los estados de Notion (Humano, WA, Llamado, Instagram, BOT, BOTQualified, etc.) son en realidad entradas del **Status Sum** — un log de acciones. En nuestro sistema, eso va al **historial**. El estado del contacto es uno solo y representa su posición real en el embudo.

### Flujo principal de estados

> 📎 **Diagrama Excalidraw sugerido**: `docs/excalidraw/flujo-estados-sdr.excalidraw`  
> Ver instrucciones al final del documento para crearlo.

```
                           FLUJO PRINCIPAL (happy path)

 ┌──────────┐     ┌────────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
 │  NUEVO   │────▶│ CONTACTADO │────▶│ CALIFICADO │────▶│  CIERRE  │────▶│  GANADO  │
 │   ℹ️     │     │    💬      │     │    ⭐      │     │   🤝     │     │   🏆     │
 └────┬─────┘     └─────┬──────┘     └─────┬──────┘     └────┬─────┘     └──────────┘
      │                 │                   │                  │
      │                 │                   │                  │
      ▼                 ▼                   ▼                  ▼
 ┌──────────┐     ┌───────────┐     ┌─────────────────┐  ┌──────────┐
 │    NO    │     │    NO     │     │    REVISAR      │  │ PERDIDO  │
 │ CONTACTO │     │ RESPONDE  │     │  MÁS ADELANTE   │  │    ❌    │
 │   📵     │     │    👻     │     │      ⏰         │  └──────────┘
 └──────────┘     └───────────┘     └─────────────────┘
                                                         ┌──────────┐
                       (Desde cualquier estado) ────────▶│    NO    │
                                                         │ CALIFICA │
                                                         │    🚫    │
                                                         └──────────┘

     Las reuniones NO son estados del contacto.
     Son una entidad aparte (ver sección 3).
```

### Definición de estados

| Estado | Emoji | Color | Significado | ¿Cuándo se aplica? | Visible para |
|--------|-------|-------|-------------|---------------------|--------------|
| **nuevo** | ℹ️ | Celeste | Acaba de llegar, no se intentó contactar | Lead entra al sistema | SDR |
| **contactado** | 💬 | Amarillo | Se habló al menos una vez | Llamada atendida o respuesta de WhatsApp | SDR |
| **calificado** | ⭐ | Verde | Dio información útil: rubro, obras, tamaño, interés | SDR obtiene datos de calificación | SDR |
| **cierre** | 🤝 | Verde fuerte | En negociación activa / propuesta enviada | Post-meet con interés concreto o envío de presupuesto | Vendedor |
| **ganado** | 🏆 | Verde brillante | Venta concretada | Se cierra la venta (link de pago enviado y aceptado) | Manager |
| **no_contacto** | 📵 | Gris | Intentos hechos sin lograr contacto | Cadencia completa sin respuesta (14 días) | SDR |
| **no_responde** | 👻 | Gris claro | Contactó pero dejó de responder | Contacto ghost: respondió alguna vez y luego silencio | SDR |
| **revisar_mas_adelante** | ⏰ | Naranja | Interés pero timing no es ahora | "Háblame en 2 meses" | SDR |
| **no_califica** | 🚫 | Rojo | No es target (no es del rubro, no aplica) | SDR descarta | Archivo |
| **perdido** | ❌ | Rojo oscuro | Pasó por pipeline pero no se concretó | Tras meet/propuesta sin éxito, eligió competencia | Archivo |

### Mapeo desde Notion → Nuevos Estados + Historial

> **Concepto clave**: Los "Status" de Notion son en realidad entradas del **Status Sum** (log acumulativo). Muchos de ellos no mapean a un estado exclusivo sino a una **acción del historial** o a un **campo del contacto**.

| Notion Status | → ¿A dónde va? | Detalle |
|---------------|----------------|---------|
| Lead | **Estado**: `nuevo` | Lead recién ingresado |
| BOTNew, BOT | **Campo**: `precalificacionBot` = `sin_calificar` | El lead interactuó con el bot pero no completó |
| BOTQualified | **Campo**: `precalificacionBot` = `calificado` | Bot recopiló datos mínimos |
| BotMeet | **Campo**: `precalificacionBot` = `quiere_meet` | Bot detectó intención de reunirse |
| Cadence2..5 | **Historial**: paso de cadencia completado | El estado sigue siendo `nuevo` (no respondió aún) |
| NoContact | **Estado**: `no_contacto` | Cadencia agotada sin respuesta |
| Humano | **Historial**: acción tipo `llamada_atendida` | Es un canal/acción, no un estado |
| Whatsapp | **Historial**: acción tipo `whatsapp_enviado` | Es un canal/acción, no un estado |
| Llamado | **Historial**: acción tipo `llamada_no_atendida` o `llamada_atendida` | Es un canal/acción, no un estado |
| Instagram | **Historial**: acción tipo `instagram_contacto` | Es un canal/acción, no un estado |
| Qualified, Consulta Valores | **Estado**: `calificado` | Contacto dio info de calificación |
| BookedMeet | **Reunión** creada con estado `agendada` | Entidad separada |
| Meet | **Reunión** con estado `realizada` (número 1) | Entidad separada |
| Meet2 | **Reunión** con estado `realizada` (número 2) | Entidad separada |
| NoShow | **Reunión** con estado `no_show` | Entidad separada |
| CancelMeet | **Reunión** con estado `cancelada` | Entidad separada |
| Presupuesto | **Historial**: acción tipo `presupuesto_enviado` | Acción dentro del estado `cierre` |
| Negotiation | **Historial**: acción tipo `negociacion_iniciada` | Acción dentro del estado `cierre` |
| Alias | **Historial**: acción tipo `link_pago_enviado` | Envío del link de pago/onboarding |
| NoInteres | **Estado**: `no_califica` | No es target |
| Lost | **Estado**: `perdido` | No se concretó |

### Campo: Pre-calificación del Bot

Antes de que el SDR toque al contacto, el bot ya puede haber recopilado información. Este campo captura ese progreso sin agregar estados al funnel del SDR.

| Valor | Significado | Datos que el bot recopiló |
|-------|-------------|---------------------------|
| `sin_calificar` | El bot interactuó pero no sacó datos útiles | Solo el teléfono |
| `no_llego` | El lead no llegó a interactuar con el bot | Entró por formulario/ads directo |
| `calificado` | El bot recopiló rubro, tamaño, necesidades | Rubro, cantidad de obras, equipo |
| `quiere_meet` | El bot detectó que quiere reunirse | Todo lo anterior + intención explícita |

Esto se muestra como un badge en la ficha del contacto:

```
┌───────────────────────────────────────────────────────────────────┐
│  Juan Pérez                                                       │
│  [ℹ️ Nuevo]  [🤖 Bot: calificado]                                │
│                                                                   │
│  Info del bot:                                                    │
│  • Rubro: Constructora                                            │
│  • Obras: 3 activas                                               │
│  • Interacción: hace 2 horas                                      │
└───────────────────────────────────────────────────────────────────┘
```

### Visualización del estado en la UI

El estado se muestra como un **Chip de color** con emoji, consistente en toda la app:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tarjeta de contacto (lista)                                        │
│                                                                     │
│  Juan Pérez                          [⭐ Calificado]               │
│  Constructora ABC · 51-200 emp.      [🟣 Premium] [🔴 Alta]       │
│  📞 +5491145678900                   [🤖 Bot: calificado]         │
│  Próximo: mañana 10:00               Intentos: 3                   │
│  📅 1 reunión agendada (26/02 15:00)                               │
│  "Lo charla con su socio, llamar el 26"                            │
│                                                                     │
│  [📞 Llamar]  [💬 WhatsApp]  [⋮]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

Los chips visibles en cada tarjeta:
- **Chip de estado** (ej: `⭐ Calificado` en verde)
- **Chip de plan estimado** (ej: `🟣 Premium` en violeta) — solo si está definido
- **Chip de intención** (ej: `🔴 Alta` en rojo) — solo si está definido
- **Badge de bot** (ej: `🤖 Bot: calificado`) — solo si hay data del bot
- **Info de reuniones** — si tiene reuniones, se muestra la próxima
- **Contadores de actividad** — mini-badges con el resumen de interacciones

### Contadores de Actividad por Contacto

Cada contacto tiene **4 contadores calculados automáticamente** a partir de las acciones registradas en el historial. No se editan manualmente: se incrementan cada vez que se registra una acción.

| Contador | Emoji | Campo | Se incrementa cuando... | Incluye |
|----------|-------|-------|-------------------------|--------|
| **Llamadas no atendidas** | 📵 | `llamadasNoAtendidas` | Se registra acción `llamada_no_atendida` | Llamadas sin respuesta, ocupado, buzón de voz |
| **Llamadas atendidas** | 📞 | `llamadasAtendidas` | Se registra acción `llamada_atendida` | Llamadas donde se habló con el contacto |
| **Mensajes enviados** | 💬 | `mensajesEnviados` | Se registra acción `whatsapp_enviado`, `instagram_contacto`, `email_enviado` | WhatsApp, Instagram, Email — todos los canales de mensajería |
| **Reuniones** | 📅 | `reunionesTotales` | Se crea una reunión (cualquier estado) | Agendadas, realizadas, no-show, canceladas |

#### Visualización en la tarjeta de contacto (lista)

Los contadores se muestran como **mini-badges compactos** debajo de los chips de estado:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Tarjeta de contacto (lista)                                        │
│                                                                     │
│  Juan Pérez                          [⭐ Calificado]               │
│  Constructora ABC · 51-200 emp.      [🟣 Premium] [🔴 Alta]       │
│  📞 +5491145678900                   [🤖 Bot: calificado]         │
│                                                                     │
│  📵 2  📞 1  💬 3  📅 1             Próximo: mañana 10:00         │
│  ▲ contadores de actividad                                         │
│                                                                     │
│  📅 1 reunión agendada (26/02 15:00)                               │
│  "Lo charla con su socio, llamar el 26"                            │
│                                                                     │
│  [📞 Llamar]  [💬 WhatsApp]  [⋮]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Cómo leer los contadores

- `📵 2` → Se intentó llamar 2 veces y no atendió
- `📞 1` → Se habló 1 vez por teléfono
- `💬 3` → Se enviaron 3 mensajes (WA, IG, email)
- `📅 1` → Tiene 1 reunión (agendada o realizada)

#### Casos de uso para el SDR

| Contadores | Lectura rápida |
|-----------|----------------|
| `📵 0  📞 0  💬 0  📅 0` | Lead virgen, nunca se intentó contactar |
| `📵 3  📞 0  💬 2  📅 0` | Se intentó 3 veces por teléfono + 2 mensajes, nunca respondió |
| `📵 1  📞 1  💬 2  📅 0` | Se habló 1 vez, se intentó otra sin éxito, 2 mensajes — falta agendar meet |
| `📵 0  📞 2  💬 1  📅 1` | Contacto activo: 2 llamadas exitosas, 1 mensaje, 1 reunión |
| `📵 5  📞 0  💬 4  📅 0` | Mucho esfuerzo sin resultado — candidato a `no_contacto` |

> **Nota**: Los contadores resuelven el problema de diferenciar leads vírgenes de leads trabajados dentro del estado `nuevo`. Un lead `nuevo` con contadores en 0 es virgen; un lead `nuevo` con `📵 3 💬 2` ya fue trabajado pero no respondió aún.

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
| **Pre-calificación bot** | Medio | quiere_meet: +200, calificado: +100, sin_calificar: +30, no_llego: 0 |
| **Tamaño empresa** | Medio | 200+: +100, 51-200: +60, 11-50: +30, 1-10: +10 |
| **Frescura** | Medio | ≤1 día: +200, ≤7 días: +150, ≤14 días: +100, ≤30 días: +50 |
| **Estado avanzado** | Medio | cierre: +300, calificado: +150, contactado: +100 |
| **Reuniones** | Medio | Con reunión agendada: +250, con meet realizada: +200 |
| **Sin próximo contacto** | Penalización | -50 (para que aparezcan pero no arriba del todo) |

#### Ejemplo práctico de ordenamiento

| # | Contacto | Plan | Intención | Vencido | Score | Por qué está ahí |
|---|----------|------|-----------|---------|-------|-------------------|
| 1° | Constructora ABC | 🟣 Premium | 🔴 Alta | 2 días | **1160** | Premium + Alta + vencido |
| 2° | Estudio Arq. XYZ | 🔵 Avanzado | 🟠 Media | 1 día | **730** | Avanzado + Media + vencido |
| 3° | María (lead nueva) | ⚪ Sin definir | ⚪ Sin definir | — | **330** | Nueva de hoy (frescura alta) + bot calificado |
| 4° | Pedro (básico) | 🟢 Básico | 🟡 Baja | — | **210** | Básico + Baja, sin urgencia |

**El SDR no ve el número de score**, solo ve la lista ordenada. Pero el manager puede ver un indicador visual (barra o color) del score relativo.

---

## 3. Reuniones (Entidad Independiente)

> **Cambio v2**: Las reuniones dejan de ser estados del contacto y pasan a ser una **entidad independiente** vinculada al contacto. Esto permite que un contacto tenga múltiples reuniones sin que su estado cambie entre "meet_agendada" y "meet_realizada" cada vez.

### ¿Por qué entidad separada?

En la realidad de Fernando:
- Un contacto puede tener **Meet, Meet2, Meet3** (varias reuniones)
- Puede haber **NoShow** (no se presentó) y re-agendar
- Puede haber **CancelMeet** y re-agendar
- El contacto puede estar en estado `calificado` y tener una meet agendada, sin que su estado cambie

Si las meets fueran estados, el contacto saltaría entre `calificado` → `meet_agendada` → `calificado` → `meet_agendada` cada vez. No tiene sentido.

### Lifecycle de una Reunión

```
                  ┌──────────┐
                  │ AGENDADA │
                  │    📅    │
                  └────┬─────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │REALIZADA │  │ NO SHOW  │  │CANCELADA │
   │    ✅    │  │    ❌    │  │    🚫    │
   └──────────┘  └────┬─────┘  └────┬─────┘
                      │             │
                      └──────┬──────┘
                             ▼
                      Re-agendar (nueva reunión)
```

### Datos de una Reunión

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Número | Auto | 1ª, 2ª, 3ª... se incrementa automáticamente |
| Estado | Selector | `agendada` / `realizada` / `no_show` / `cancelada` |
| Fecha y hora | DateTime | Cuándo está/estuvo agendada |
| Link/Lugar | Text | Zoom, Google Meet, dirección física, etc. |
| Notas pre-meet | Text | Qué preparar, qué preguntar |
| Notas post-meet | Text | Resultado, next steps, impresiones |
| Participantes | Array | Quiénes participaron (de nuestro lado y del contacto) |
| Asistió | Boolean | Solo para `realizada` — ¿vino el contacto? |

### Wireframe: Modal de Agendar Reunión

```
┌──────────────────────────────────────────────────────────────────┐
│  📅 AGENDAR REUNIÓN                                    [✕]      │
│                                                                  │
│  Con: Juan Pérez · Constructora ABC                              │
│  Reunión #1                                                      │
│                                                                  │
│  Fecha:  [26/02/2026]    Hora: [15:00]                          │
│                                                                  │
│  Link/Lugar:                                                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ https://meet.google.com/abc-defg-hij                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Notas:                                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Preguntar por cantidad de obras activas, mostrar demo    │    │
│  │ del módulo de materiales                                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Cancelar]                                    [Agendar reunión] │
└──────────────────────────────────────────────────────────────────┘
```

### Wireframe: Evaluar Reunión (post-meet)

```
┌──────────────────────────────────────────────────────────────────┐
│  ✅ EVALUAR REUNIÓN #1                                  [✕]     │
│                                                                  │
│  Con: Juan Pérez · Constructora ABC                              │
│  Fecha: 26/02/2026 15:00                                        │
│                                                                  │
│  Resultado:                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │✅ Asistió │  │❌ No Show │  │🚫Canceló │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│       ● seleccionado                                             │
│                                                                  │
│  Notas de la reunión:                                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Le gustó mucho el módulo de caja. Quiere arrancar con   │    │
│  │ el plan Avanzado. Pide presupuesto formal para          │    │
│  │ presentar a su socio.                                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ¿Cambiar estado del contacto?                                   │
│  [🤝 Pasar a Cierre]  [⭐ Mantener Calificado]  [⏰ Revisar]   │
│                                                                  │
│  Plan:      [🔵 Avanzado ▼]    Intención: [🔴 Alta ▼]          │
│                                                                  │
│  ¿Agendar otra reunión?                                          │
│  [Sí, agendar Meet #2]  [No por ahora]                          │
│                                                                  │
│  [Cancelar]                                           [Guardar]  │
└──────────────────────────────────────────────────────────────────┘
```

### Reuniones en la ficha del contacto

Las reuniones se muestran como una sección propia en el drawer:

```
┌──────────────────────────────────────────────────────────────────┐
│  REUNIONES                                      [+ Agendar nueva]│
│                                                                  │
│  📅 Meet #2 — 28/02 10:00 — AGENDADA                           │
│     Link: meet.google.com/xyz                                    │
│     "Presentar propuesta formal con detalle de módulos"          │
│                                                                  │
│  ✅ Meet #1 — 26/02 15:00 — REALIZADA                           │
│     "Le gustó el módulo de caja. Pide presupuesto formal."       │
│     Duración: 35 min                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Ficha del Contacto (Drawer de Detalle)

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
│  [🤖 Bot: calificado]                                              │
│                                                                     │
│  📵 2  📞 1  💬 3  📅 1                                            │
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
│  │ REUNIONES                                    [+ Agendar nueva]│  │
│  │                                                              │   │
│  │ 📅 Meet #1 — 26/02 15:00 — AGENDADA                        │   │
│  │    "Presentar demo de materiales"                            │   │
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
│  │     SDR: Fernando | Cadencia: Paso 1                         │   │
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
  │ 🤝 En cierre      │                │ 🟡 A medida      │          │ ⚪ Sin definir    │
  │ 🏆 Ganado         │                │ ⚪ Sin definir    │          └──────────────────┘
  │ ─ ─ ─ ─ ─ ─ ─ ─  │                └──────────────────┘
  │ 📵 No contacto    │
  │ 👻 No responde    │
  │ ⏰ Revisar luego  │
  │ 🚫 No califica    │
  │ ❌ Perdido         │
  └──────────────────┘
```

> **Nota v2**: Ya no hay `📅 Meet agendada` ni `✅ Meet realizada` en el dropdown de estados. Las reuniones se gestionan desde su propia sección.

---

## 5. Loop de Llamadas (Modo Llamadas)

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
│            [🤖 Bot: calificado]                                     │
│            📵 2  📞 1  💬 3  📅 1                                   │
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
│        Cadencia: Paso 2/4 · Intentos: 3                            │
│        📅 Meet #1 agendada: 26/02 15:00                            │
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
1. Se registra intento automáticamente en el historial
2. Se incrementa contador de intentos
3. Aparece opción: **"¿Enviar WhatsApp?"** → si sí, abre selector de template del paso actual de cadencia
4. Si completó toda la cadencia (paso 4 + espera 6 días) → sugerir cambiar a `no_contacto`
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
4. La cadencia se detiene automáticamente al registrar una llamada atendida

#### "WhatsApp"
1. Abre selector de template (por paso de cadencia)
2. Se reemplazan variables (`{{nombre}}`, `{{rubro_texto}}`, `{{sdr_nombre}}`, `{{momento_bot}}`)
3. Se abre `wa.me` con el mensaje pre-cargado
4. Al volver a la app: se registra automáticamente en historial
5. Se avanza al siguiente contacto

#### "Agendar Reunión"
1. Se abre modal de reunión con campos: fecha, hora, link, notas (ver sección 3)
2. Se crea la entidad Reunión vinculada al contacto
3. Estado del contacto **no cambia automáticamente** — el SDR decide si pasar a otro estado
4. Se avanza al siguiente contacto

### Tabla resumen de acciones

| Resultado | Nota | Próximo contacto | Estado | Plan | Intención | Reunión |
|-----------|------|-------------------|--------|------|-----------|---------|
| No atendió | Opcional | Auto: según cadencia | Sin cambio | — | — | — |
| Atendió - sin info | Requerida | Manual | → contactado | — | Opcional | — |
| Atendió - con info | Requerida | Manual | → calificado | **Selector** | **Selector** | — |
| Quiere meet | Requerida | Fecha de meet | Sin cambio | **Selector** | **Selector** | **Se crea** |
| No interesa | Motivo requerido | — | → no_califica | — | — | — |
| "Hablame más adelante" | Requerida | Obligatorio | → revisar_mas_adelante | Opcional | Opcional | — |
| Link pago enviado | Requerida | Auto: 3 días | → cierre o ganado | — | — | — |

---

## 6. Métricas Automáticas

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
│  │  Con Meet   ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   18    │   │
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

> **Nota v2**: "Con Meet" en el funnel ahora se calcula como "contactos que tienen al menos 1 reunión realizada", no por estado del contacto.

---

## 7. Ingreso de Leads, Fuentes y Deduplicación

### Contexto técnico actual

Hoy existen **dos modelos separados sin vínculo entre sí**:

| | **Lead** (Firestore) | **ContactoSDR** (MongoDB) |
|---|---|---|
| **Se crea cuando** | Un usuario escribe por WhatsApp o llega de la landing | Se importa manualmente desde Notion o Excel |
| **Sync con Notion** | Crea la página en Notion automáticamente | Lee desde Notion |
| **Propósito** | Tracking de marketing + onboarding del bot | Gestión comercial del SDR |
| **Vínculo entre ellos** | ❌ No existe | ❌ No existe |

Esto genera que un mismo contacto pueda existir como Lead en Firestore y como ContactoSDR en MongoDB sin que el sistema lo sepa. El objetivo es **unificar ambos mundos** usando el **teléfono como clave de deduplicación universal**.

### Principio de diseño

> **El ContactoSDR es la entidad maestra del módulo comercial.** Todo lead, venga de donde venga, debe terminar como un ContactoSDR. El Lead de Firestore sigue existiendo para marketing y atribución (Facebook, campañas), pero el SDR solo trabaja con ContactoSDR.

### Escenario A: Nuevo contacto por Bot (inbound)

Flujo actual:
```
Usuario escribe por WA → Lead (Firestore) → Página en Notion → [Fernando importa manualmente] → ContactoSDR
```

Flujo nuevo:
```
Usuario escribe por WA → Lead (Firestore)  → ContactoSDR se crea automáticamente
                          (se mantiene)       con datos del bot
                               │
                               ▼
                         Notion sigue sincronizando
                         (para el período de transición)
```

**Comportamiento detallado:**

1. El usuario escribe por WhatsApp → `flowInicioGeneral` se ejecuta
2. Se crea/actualiza el **Lead en Firestore** (comportamiento actual — se mantiene para atribución FB, follow-up automático, etc.)
3. **NUEVO**: Se busca un ContactoSDR por teléfono en MongoDB
   - **Si no existe** → se crea un ContactoSDR con:
     - `estado`: `nuevo`
     - `origen`: `inbound`
     - `precalificacionBot`: `sin_calificar` (se irá actualizando)
     - `telefono`: del contexto de WhatsApp
     - `nombre`: pushName del WhatsApp + últimos 4 dígitos
     - `leadId`: referencia al Lead de Firestore (para trazabilidad)
     - `notionPageId`: si la sincronización con Notion lo creó
   - **Si ya existe** → se enriquece (ver Escenario C)
4. A medida que el usuario avanza en el bot:
   - Elige "Quiero probar" → `precalificacionBot` se actualiza a `calificado`, se registra `interes: probar`
   - Elige "Quiero hablar con humano" → `precalificacionBot` = `quiere_meet`
   - Da info de rubro/obras → se actualizan los campos en el ContactoSDR
   - Cada interacción se registra en el **historial del ContactoSDR** como acción tipo `bot_interaccion`
5. El SDR ve el contacto aparecer en su bandeja sin hacer nada

**Mapeo bot → precalificacionBot:**

| Evento del bot | → precalificacionBot | → Se registra en historial |
|---|---|---|
| Primer mensaje (menú) | `sin_calificar` | `bot_interaccion`: "Menú inicial mostrado" |
| Elige opción 1 (usuario existente) | `sin_calificar` | `bot_interaccion`: "Seleccionó: usuario existente" |
| Elige opción 2 (probar) + da datos | `calificado` | `bot_interaccion`: "Seleccionó: probar. Rubro: X, Obras: Y" |
| Elige opción 3 (info) | `sin_calificar` | `bot_interaccion`: "Seleccionó: más info" |
| Elige opción 4 (humano) | `quiere_meet` | `bot_interaccion`: "Pidió hablar con humano" |
| No interactúa (solo envió mensaje) | `no_llego` | `bot_interaccion`: "Envió mensaje pero no respondió al menú" |

### Escenario B: Importado de Notion o Excel (outbound / frío)

Flujo actual:
```
Notion / Excel → Importación manual → ContactoSDR (MongoDB)
```

Flujo nuevo:
```
Notion / Excel → Importación → Deduplicar por teléfono → ContactoSDR
                                      │
                                      ├─ Si no existe → crear con origen: outbound
                                      └─ Si ya existe → NO duplicar, avisar
```

**Comportamiento detallado:**

1. El manager importa contactos desde Notion o Excel (funcionalidad existente)
2. **NUEVO**: Antes de crear, se busca por teléfono normalizado en MongoDB
   - **Si no existe** → se crea el ContactoSDR con `origen: outbound`
   - **Si ya existe** → se muestra al usuario: "Este contacto ya existe como [nombre] en estado [estado]. ¿Actualizar datos?" → si acepta, se enriquecen los datos (empresa, cargo, etc.) sin perder el historial existente
3. Los contactos importados de Notion **no** crean Lead en Firestore (no tienen interacción de marketing)
4. Si más adelante ese contacto interactúa con el bot → Escenario C

### Escenario C: Contacto frío que después interactúa con el Bot

El contacto fue importado de Notion (outbound), el SDR lo llamó, no avanzó. Semanas después, el contacto ve un ad y escribe por WhatsApp.

```
                    Ya existe como ContactoSDR (outbound)
                              │
                              ▼
Usuario escribe por WA → Lead (Firestore) se crea
                              │
                              ▼
                    Buscar ContactoSDR por teléfono
                              │
                              ▼
                    ✅ ENCONTRADO → Enriquecer, no duplicar
```

**Comportamiento detallado:**

1. Se crea el Lead en Firestore normalmente (para atribución FB)
2. Se busca ContactoSDR por teléfono → **se encuentra**
3. Se enriquece el ContactoSDR existente:
   - `precalificacionBot` se actualiza según progreso en bot
   - `leadId` se vincula al Lead de Firestore (para atribución)
   - Se agrega al historial: `bot_interaccion` con nota "Contacto existente (outbound) interactuó con el bot"
   - Los datos del bot (rubro, interés) se agregan si el ContactoSDR no los tenía
4. **Se notifica al SDR asignado**: "🔔 Tu contacto [nombre] acaba de interactuar con el bot. Origen original: outbound"
5. El contacto **sube en prioridad** (la frescura se recalcula por la nueva interacción)
6. El estado del contacto **no cambia automáticamente** — el SDR decide. Pero si estaba en `no_contacto` o `no_responde`, se sugiere volver a `nuevo` o `contactado`

### Escenario D: Contacto del Bot que después se importa de Notion

Fernando tiene un contacto en Notion que quiere importar, pero resulta que ese contacto ya escribió por WhatsApp y ya existe como ContactoSDR.

```
                    Ya existe como ContactoSDR (inbound, del bot)
                              │
                              ▼
Importación desde Notion → Buscar por teléfono
                              │
                              ▼
                    ✅ ENCONTRADO → Enriquecer, no duplicar
```

**Comportamiento detallado:**

1. Al importar, se busca por teléfono normalizado → **se encuentra**
2. Se muestra al usuario: "Este contacto ya existe como [nombre] (inbound, del bot). ¿Enriquecer con datos de Notion?"
3. Si acepta:
   - Se agregan/actualizan: empresa, cargo, tamaño, datos que Notion tenga y el bot no
   - Se vincula `notionPageId` y `notionDbId`
   - Se agrega al historial: `contacto_enriquecido` con nota "Datos importados desde Notion"
   - El `origen` **no cambia** (sigue siendo `inbound`)
4. Si rechaza: no se hace nada, el contacto queda como está

### Normalización de teléfono (clave de deduplicación)

Para que la deduplicación funcione, el teléfono debe normalizarse siempre igual:

| Input | → Normalizado |
|---|---|
| +5491145678900 | 5491145678900 |
| 5491145678900 | 5491145678900 |
| 011-4567-8900 | 5491145678900 |
| 1145678900 | 5491145678900 |
| 54 9 11 4567-8900 | 5491145678900 |

Reglas:
- Eliminar espacios, guiones, paréntesis, signo `+`
- Si empieza con `15` o tiene 8 dígitos → agregar `549` + código de área
- Si empieza con `0` → reemplazar por `549`
- Si ya tiene 13 dígitos y empieza con `549` → dejarlo
- Almacenar siempre el formato limpio de 13 dígitos

### Vista del lead recién ingresado (por bot)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🆕 NUEVO                                            hace 3 min    │
│                                                                     │
│  5491122439888                     [🤖 Bot: calificado]            │
│  "Yo trabajo en una fábrica de puertas de madera,                  │
│   en este momento... 894 puertas"                                   │
│                                                                     │
│  Info del bot:                                                      │
│  • Rubro: Fábrica / Manufactura                                    │
│  • Obras: ~894 puertas activas                                      │
│  • Interacción con bot: hace 2 horas                                │
│  • Intención: probar                                                │
│                                                                     │
│  Origen: Inbound (bot)                                              │
│  Sin asignar                                                        │
│                                                                     │
│  [📞 Llamar]  [💬 WhatsApp]  [👤 Asignarme]                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Vista de contacto frío que interactuó con bot (notificación al SDR)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔔 ACTIVIDAD DE BOT                                 hace 5 min    │
│                                                                     │
│  Tu contacto Juan Pérez (Constructora ABC) acaba de                │
│  interactuar con el bot.                                            │
│                                                                     │
│  Estado actual: 📵 No contacto                                      │
│  Origen original: Outbound (Notion)                                 │
│  Bot: Eligió "Quiero probar"  → precalificación: calificado        │
│                                                                     │
│  ¿Qué querés hacer?                                                │
│  [📞 Llamar ahora]  [⏰ Programar contacto]  [👁️ Ver ficha]       │
└─────────────────────────────────────────────────────────────────────┘
```

### Resumen de flujo unificado

```
         FUENTES DE LEADS
              │
    ┌─────────┼──────────┐
    │         │          │
    ▼         ▼          ▼
  WhatsApp   Notion    Excel
   (Bot)    (Import)  (Import)
    │         │          │
    ▼         ▼          ▼
  Lead      ────────────────
 (Firestore)      │
    │              ▼
    │      ┌──────────────┐
    └─────▶│ DEDUPLICAR   │
           │ por teléfono │
           └──────┬───────┘
                  │
          ┌───────┼────────┐
          ▼                ▼
     No existe          Ya existe
          │                │
          ▼                ▼
     Crear nuevo      Enriquecer
     ContactoSDR      ContactoSDR
          │                │
          └───────┬────────┘
                  ▼
           ContactoSDR
           (MongoDB)
              │
              ▼
        SDR lo ve en
        su bandeja
```

---

## 8. Sistema de Cadencias

Una cadencia es una secuencia de pasos de contacto con tiempos definidos. El ciclo de vida de un lead dura aproximadamente **14 días**: 8 días de cadencia activa + 6 días de espera antes de marcar como `no_contacto`.

### Cadencia por defecto: "Ciclo de Vida de Lead"

Basada en el proceso real que Fernando ejecuta manualmente hoy, sistematizado en 4 pasos:

| Paso | Día | Acciones | Objetivo | Condición |
|------|-----|----------|----------|-----------|
| **1** | D+1 | 📞 Llamada + 💬 WhatsApp personalizado | **Gancho**: pedir permiso para compartir un ejemplo relevante al rubro | Siempre (primer intento) |
| **2** | D+3 | 💬 WhatsApp con caso de uso / mini video / testimonio | **Entregar valor**: mandar el recurso prometido en el paso anterior | Si no respondió o se acordó enviar video |
| **3** | D+5 | 📞 Llamada + 💬 Follow-up sobre visualización | **Evaluar interés**: preguntar si vio el material, probar engagement | Si no respondió |
| **4** | D+8 | 📞 Llamada + 💬 WhatsApp de cierre suave | **Último intento**: cerrar con puerta abierta, dejar contacto | Si no respondió |

```
Línea de tiempo:

D+1          D+3          D+5          D+8                D+14
 │            │            │            │                   │
 ▼            ▼            ▼            ▼                   ▼
📞+💬        💬           📞+💬        📞+💬              ⏹️ no_contacto
Gancho     Entregar      Evaluar      Cierre             (si no respondió)
           valor         interés      suave
 │                                     │
 └── Si responde en cualquier punto ──→ CADENCIA SE DETIENE
                                        Estado → contactado
```

### Pasos con múltiples acciones

Cada paso puede tener **más de una acción**. El sistema sugiere ambas y el SDR las ejecuta en orden:

```
┌──────────────────────────────────────────────────────────────────┐
│  PASO 1 — Día 1: Primer contacto                                │
│                                                                  │
│  Acciones:                                                       │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  1. 📞 Llamar                                 [Llamar] │     │
│  │     Si atiende → registrar y detener cadencia           │     │
│  │     Si no atiende → pasar a acción 2                    │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │  2. 💬 WhatsApp personalizado                [Enviar]  │     │
│  │     Template: "Gancho - {{rubro}}"                      │     │
│  │     Preview: "Hola, {{nombre}}! Fer de Sorby Data..."   │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  [Saltar paso]                              [Marcar completado]  │
└──────────────────────────────────────────────────────────────────┘
```

### Templates por paso (con variaciones)

Cada paso tiene múltiples variantes de template. El sistema selecciona la variante según **rubro del contacto** y **contexto del bot** (cuándo interactuó, qué hizo).

#### Paso 1 — "Gancho" (variaciones reales)

**Variables disponibles**: `{{nombre}}`, `{{rubro_texto}}`, `{{momento_bot}}`, `{{sdr_nombre}}`

| Variante | Para rubro | Template |
|----------|-----------|----------|
| A | Constructoras | Hola, {{nombre}}! {{sdr_nombre}} de Sorby Data por acá! Estuviste en contacto con nuestro BOT {{momento_bot}}. Te escribo cortito: te viene bien que te comparta 1 ejemplo de cómo otras constructoras están ordenando materiales sin planillas? |
| B | Estudios | ...cómo otros estudios gestionan gastos directo por WhatsApp, sin usar planillas? |
| C | Profesionales independientes | ...cómo otros profesionales independientes gestionan gastos directo por WhatsApp, sin usar planillas? |
| D | General (más consultivo) | Hola, {{nombre}}! 👋 Soy {{sdr_nombre}}, tu asesor de Sorby Data. Sé que estuviste en contacto con nuestro bot y quería conocer un poco más cómo venís gestionando tus obras. Cómo venís gestionando hoy caja, materiales y pedidos? Con Sorby podés ordenar todo eso de forma simple y ahorrar tiempo ⏳ Querés que lo charlemos por acá o preferís que hagamos una llamada rápida? |
| E | General (más directo) | Hola, {{nombre}}! 👋 Soy {{sdr_nombre}} de Sorby Data. Vi que hablaste con nuestro bot y que estás con algunas obras activas. Cómo vienen manejando la parte de caja y materiales? Podemos charlarlo por acá o agendar una llamadita corta, como te quede más cómodo |

> **Nota**: `{{momento_bot}}` se calcula automáticamente a partir de la fecha de interacción con el bot: "ayer por la noche", "el sábado por la tarde", "el lunes", etc.

#### Paso 2 — "Entrega de valor"

| Variante | Template |
|----------|----------|
| A (con video) | Hola, {{nombre}}! Soy {{sdr_nombre}} de Sorby Data. Te dejo el video que te mencioné ayer. En un minuto vas a ver cómo {{rubro_texto}} están ordenando caja y materiales directo desde WhatsApp, y sin planillas. Cómo lo vienen manejando ustedes? |
| B (con ejemplo) | ...Te dejo el ejemplo que te comenté. Es solo para que tengas contexto de cómo se usa en el día a día. Si te sirve, lo vemos |

#### Paso 3 — "Evaluar interés"

| Variante | Template |
|----------|----------|
| A (consultivo) | {{nombre}}! Cómo estás? Te escribo para saber si pudiste ver la presentación que te compartí el otro día. Me gustaría entender si estamos alineados y si nuestra solución te resultaría útil 😁 Charlamos? |
| B (corto) | {{nombre}}! Cómo va? Te escribo por el video que te pasé hace unos días. Si te sirve, esta semana lo vemos 10 min. Y si ahora no es momento, todo bien |
| C (directo) | {{nombre}}! Viendo lo que te compartí el otro día, te hago una consulta cortita. Hoy estás llevando caja y materiales con planillas o por WhatsApp? Así te muestro un ejemplo parecido al tuyo. |

#### Paso 4 — "Cierre suave"

| Variante | Template |
|----------|----------|
| A | {{nombre}}! Prometo que este es mi último mensaje por ahora 😅 Vi que no pudimos coordinar todavía, y capaz estás a mil con las obras. Igual te dejo mi contacto directo por si más adelante querés optimizar tu gestión con Sorby. Lo bueno es que no necesitás instalar nada ni aprender un sistema nuevo. Es todo por WhatsApp y en 24hs lo tenés activo 👌 Abrazo, {{sdr_nombre}}. |

### Secuencia progresiva (cada paso referencia al anterior)

Detalle clave: los mensajes **no son independientes entre sí**. Cada paso hace referencia a lo que se envió antes ("el video que te mencioné", "la presentación que te compartí el otro día"). El sistema debe trackear qué se envió en cada paso para que los templates posteriores tengan contexto.

```
Paso 1: "Te viene bien que te comparta 1 ejemplo?"
                    │
                    ▼  (el SDR envía el video/ejemplo)
Paso 2: "Te dejo el video que te mencioné ayer"
                    │
                    ▼  (espera a que lo vea)
Paso 3: "Pudiste ver la presentación que te compartí?"
                    │
                    ▼  (último intento)
Paso 4: "Prometo que este es mi último mensaje 😅"
```

### Selección automática de variante

El sistema sugiere la variante más apropiada según:

| Factor | Cómo influye |
|--------|-------------|
| **Rubro** del contacto | Constructora → variante con "otras constructoras". Estudio → "otros estudios" |
| **Precalificación del bot** | Si el bot ya recopiló info → variante más consultiva. Si no → más genérica |
| **Paso de cadencia** | Cada paso tiene sus propias variantes |
| **SDR** puede elegir otra | El sistema sugiere pero el SDR puede cambiar antes de enviar |

### Comportamiento de la cadencia

- Al crear un contacto `nuevo`, se asigna la cadencia "Ciclo de Vida de Lead"
- El sistema programa los `proximoContacto` automáticamente según los días de cada paso
- **Si el contacto responde** (estado cambia a `contactado` o superior) → la cadencia se **detiene**
- **Si no responde tras paso 4** → 6 días de espera → estado cambia a `no_contacto`
- El SDR ve el paso actual de la cadencia en la tarjeta del contacto
- El SDR **puede saltear pasos**, **pausar** la cadencia, o **elegir otra variante** de template

### Cadencias adicionales (configurables por el manager)

| Cadencia | Para quién | Trigger | Duración aprox. |
|----------|-----------|---------|-----------------|
| "Re-engagement" | Contactos `revisar_mas_adelante` | Cuando llega la fecha programada | 5 días |
| "Post-meet sin respuesta" | Contactos con meet `realizada` que no avanzan | 3 días después de la meet sin cambio | 5 días |
| "Follow-up calificado" | Contactos `calificado` que no llegan a meet | 5 días sin acción | 5 días |

### Indicador visual de cadencia en la tarjeta

```
┌─────────────────────────────────────────────────────────────────────┐
│  Juan Pérez · Constructora ABC              [ℹ️ Nuevo]             │
│                                                                     │
│  Cadencia: Ciclo de Vida de Lead                                    │
│  ● ● ○ ○   Paso 2/4 — 💬 Video/caso de uso                       │
│  ▲▲                                                                │
│  completados                                                        │
│                                                                     │
│  Próximo: Mañana 09:00 (en 18h)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Importante (de la reunión)
> "Primero pasar por eso y después vemos" — Fernando  
> "Si hacemos lo 100% automático, se nos podía [ir de las manos]" — Federico

Las cadencias **NO envían mensajes automáticamente**. Solo organizan la cola y sugieren la acción + template. El SDR siempre confirma manualmente (puede editar el mensaje antes de enviar). En una fase futura se podrían automatizar los WhatsApp.

---

## 9. Historial Enriquecido (Status Sum)

> **Concepto v2**: El historial es el equivalente directo del **"Status Sum"** de Notion. En Notion, los "Status" no son estados exclusivos — son un log acumulativo de todo lo que pasó con el contacto. Nuestro historial replica y mejora ese concepto.

### Tipos de acciones en el historial

| Tipo | Emoji | Descripción | Origen |
|------|-------|-------------|--------|
| `llamada_atendida` | 📞✅ | Se llamó y atendió | SDR registra |
| `llamada_no_atendida` | 📞❌ | Se llamó y no atendió | SDR registra |
| `whatsapp_enviado` | 💬 | Se envió WhatsApp | SDR desde la app |
| `whatsapp_respuesta` | 💬✅ | El contacto respondió al WhatsApp | Automático (bot detecta) |
| `instagram_contacto` | 📷 | Interacción por Instagram | SDR registra |
| `email_enviado` | 📧 | Se envió email | SDR registra |
| `reunion_agendada` | 📅 | Se creó una reunión | SDR desde la app |
| `reunion_realizada` | ✅📅 | Reunión se concretó | SDR evalúa |
| `reunion_no_show` | ❌📅 | Contacto no se presentó | SDR evalúa |
| `reunion_cancelada` | 🚫📅 | Reunión fue cancelada | SDR o contacto |
| `presupuesto_enviado` | 📄 | Se envió presupuesto/propuesta | SDR registra |
| `negociacion_iniciada` | 🤝 | Se abrió negociación formal | SDR registra |
| `link_pago_enviado` | 💳 | Se envió link de pago/onboarding (Alias) | SDR registra |
| `cambio_estado` | 🔄 | Cambio de estado del contacto | Automático |
| `cambio_plan` | 🔄💰 | Cambio de plan estimado | SDR cambia |
| `cambio_intencion` | 🔄🎯 | Cambio de intención de compra | SDR cambia |
| `nota` | 📝 | Nota manual del SDR | SDR escribe |
| `contacto_creado` | ℹ️ | El contacto fue creado en el sistema | Automático |
| `cadencia_paso` | ⏩ | Se ejecutó un paso de la cadencia | Sistema + SDR |

### Vista del historial en el Drawer

```
┌──────────────────────────────────────────────────────────────────┐
│  HISTORIAL                                  [Filtrar por tipo ▼] │
│                                                                  │
│  ┌───── Hoy ──────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  14:30  📞✅ Llamada atendida                              │  │
│  │         ┌─────────────────────────────────────────────┐    │  │
│  │         │ "Tiene 3 obras, estudio de 15 personas.     │    │  │
│  │         │  Quiere ver el video. Lo charla con su      │    │  │
│  │         │  socio. Llamar el 26."                      │    │  │
│  │         └─────────────────────────────────────────────┘    │  │
│  │         SDR: Fernando                                      │  │
│  │         🔄 Estado: 💬 Contactado → ⭐ Calificado           │  │
│  │         🔄 Plan: ⚪ → 🟣 Premium   Intención: ⚪ → 🟠 Media│  │
│  │                                                            │  │
│  │  10:00  📞❌ Llamada no atendida                           │  │
│  │         SDR: Fernando · Cadencia: Paso 1, Acción 1         │  │
│  │                                                            │  │
│  │  10:02  💬 WhatsApp enviado                                │  │
│  │         Template: "Gancho - Constructoras"                 │  │
│  │         SDR: Fernando · Cadencia: Paso 1, Acción 2         │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───── Ayer ─────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  09:00  📅 Reunión #1 agendada                             │  │
│  │         26/02 15:00 · Google Meet                          │  │
│  │         SDR: Fernando                                      │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───── 20/02 ────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  12:00  ℹ️ Contacto creado                                 │  │
│  │         Origen: Inbound (nuevo_contacto)                   │  │
│  │         Bot: calificado · Rubro: Constructora              │  │
│  │         Asignado a: Fernando Falasca                       │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Filtros del historial

El dropdown "Filtrar por tipo" permite ver solo:
- 📞 Llamadas (atendidas + no atendidas)
- 💬 WhatsApp (enviados + respuestas)
- 📅 Reuniones (agendadas + realizadas + no show + canceladas)
- 📝 Notas
- 🔄 Cambios (estado, plan, intención)
- 📄 Acciones comerciales (presupuesto, negociación, link pago)
- Todos (default)

---

## 10. Búsqueda y Filtros Avanzados

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
| **Estado** | Multi-select: todos los 10 estados |
| **Plan estimado** | Premium / Avanzado / Básico / A medida / Sin definir |
| **Intención de compra** | Alta / Media / Baja / Sin definir |
| **Pre-calificación bot** | sin_calificar / no_llego / calificado / quiere_meet |
| **Tamaño empresa** | 1-10 / 11-50 / 51-200 / 200+ |
| **Paso de cadencia** | Paso 1, 2, 3, 4 / Sin cadencia / Cadencia completada |
| **Próximo contacto** | Vencido / Hoy / Esta semana / Sin programar |
| **Reuniones** | Con reunión agendada / Con meet realizada / Sin reuniones |
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
| "Calificados sin meet" | Estado = calificado, reuniones = Sin reuniones | Por score desc |
| "Con meet pendiente" | Reuniones = Con reunión agendada | Por fecha de reunión |
| "Revisar esta semana" | Estado = revisar_mas_adelante, próximo = esta semana | Por fecha próximo contacto |
| "Reintentar" | Estado = no_contacto, creado hace > 1 semana | Por fecha creación |

El manager puede crear vistas propias y compartirlas con el equipo.

---

## 11. Pipeline de Ventas Post-Meet

Hoy el proceso termina en "calificado" o "meet". Pero Fernando también trackea ventas, planes, tickets. El pipeline extiende el flujo:

### Flujo post-meet

```
Contacto calificado + meet realizada → cierre → ganado
                                             └→ perdido
```

> **Nota v2**: El contacto puede pasar a `cierre` tras una meet, pero también puede ir directo si hay una propuesta sin meet (caso raro pero posible). El estado `cierre` se activa cuando hay negociación concreta.

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

### Acciones comerciales en el historial

Las acciones de cierre se registran en el historial, no como estados separados:

| Acción | Qué registra |
|--------|-------------|
| `presupuesto_enviado` | Se envió propuesta económica formal |
| `negociacion_iniciada` | Se abrió negociación (contraoferta, condiciones) |
| `link_pago_enviado` | Se envió el link de pago/alta ("Alias" en Notion) |

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
- En historial queda registrado `link_pago_enviado` + cambio a `ganado`

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
| Meets_Realizadas / Meets_Agendadas | Entidad Reunión (por estado) |
| Fecha_Reunion / Mes_Reunion | Auto (fecha de la reunión) |
| Ventas_A | Contactos en estado `ganado` |
| Fecha_Venta / Mes_Venta | Auto (fecha de cambio a `ganado`) |

---

## 12. Automatización de WhatsApp

### Etapa A: Asistido (primera implementación)

- El sistema **sugiere** el mensaje del paso actual de la cadencia
- El SDR toca "Enviar" → se abre WhatsApp pre-cargado → confirma
- Se registra automáticamente el envío en historial y avanza al siguiente paso
- Es lo que ya existe, pero integrado con las cadencias y los templates por rubro

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
- Se registra en historial como `whatsapp_respuesta`
- El contacto sube en prioridad

---

## 13. Reportes e Inteligencia

### Funnel de Conversión Visual

> **Nota v2**: El escalón "Con Meet" ahora se calcula cruzando contactos con la entidad Reunión (al menos 1 reunión realizada), no por estado del contacto.

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
│  Con Meet   ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   18  (9%)    │
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
| No show en reunión | SDR + Manager | Push |
| Cadencia completada sin respuesta | SDR | In-app |

---

## Resumen de Funcionalidades por Fase

| Fase | Funcionalidades |
|------|----------------|
| **1** | Estados puros (10) · Scoring (plan + intención) · Pre-calificación bot · Loop de llamadas · Métricas auto · Ingreso automático de leads |
| **2** | Cadencias de 14 días con templates · Reuniones como entidad independiente · Historial enriquecido (Status Sum) · Filtros avanzados · Vistas guardadas |
| **3** | Pipeline de ventas · Acciones comerciales en historial · Transición a cliente · Reemplazo de Google Sheets |
| **4** | WhatsApp asistido con cadencias · Bot dedicado (futuro) |
| **5** | Funnel visual · Alertas · Comparativas de período · Reportes avanzados |

---

## Notas de la Reunión Relevantes

- **Fernando prioriza por nuevos** (< 2 semanas) y luego por estado → el score calculado debe replicar esto
- **Las cadencias NO deben ser inmutables**: "No tan inmutable por así decir" — el SDR debe poder ajustar tiempos
- **Delegabilidad**: "Si es difícil delegar después no lo puede delegar" — pocos estados, flujo simple
- **Revivir contactos**: Leads viejos que vuelven necesitan un camino claro (→ `revisar_mas_adelante` con próximo contacto)
- **Meet ≠ Qualify**: Hay que separar "tuve meet" de "lo califiqué". Un contacto puede estar calificado sin meet y con meet sin estar en cierre. Por eso las meets son entidad separada
- **Status Sum ≠ Estado**: En Notion los "status" son un log acumulativo, no estados exclusivos. Nuestro historial replica este concepto correctamente
- **Canal ≠ Estado**: Humano, WA, Llamado, Instagram son canales de contacto (tipos de acción), no estados del contacto
- **Alias = Link de pago**: No es un descarte, es el envío del link de pago/onboarding. Es una acción de cierre
- **Plan estimado ≠ Intención de compra**: Son dos dimensiones distintas. Plan = qué plan le conviene por perfil. Intención = cuántas ganas tiene de comprar
- **El control sigue siendo del SDR**: "Si hacemos lo 100% automático, se nos podía [correr]" — nada se envía sin confirmación humana (al menos en las primeras fases)

---

## Guía para Excalidraw

Para crear los diagramas sugeridos, usar estos lineamientos:

### `flujo-estados-sdr.excalidraw`
- **Tipo**: Diagrama de flujo con nodos y flechas
- **Nodos**: Rectángulos redondeados con emoji + nombre del estado + color de fondo
- **Flechas**: Líneas sólidas para el happy path, punteadas para salidas negativas
- **Colores**: Celeste (nuevo), Amarillo (contactado), Verde (calificado), Verde fuerte (cierre/ganado), Gris (no_contacto/no_responde), Naranja (revisar), Rojo (no_califica/perdido)
- **Nota**: Las reuniones NO aparecen en este diagrama — tienen su propio lifecycle

### `lifecycle-reuniones.excalidraw` (NUEVO en v2)
- **Tipo**: Diagrama de estados de la entidad Reunión
- **Nodos**: agendada → realizada / no_show / cancelada
- **Flechas**: no_show y cancelada pueden generar una nueva reunión (re-agendar)

### `matriz-plan-intencion.excalidraw`
- **Tipo**: Grilla/tabla 4×4 con colores de calor
- **Filas**: Planes (Premium, Avanzado, Básico, Sin definir)
- **Columnas**: Intención (Alta, Media, Baja, Sin definir)
- **Colores**: De rojo intenso (Premium + Alta) a gris claro (Sin definir + Sin definir)
- **Números**: Cantidad de contactos en cada celda

### `drawer-contacto-mobile.excalidraw`
- **Tipo**: Wireframe de pantalla mobile
- **Dimensiones**: 375×812 (iPhone)
- **Secciones**: Header con chips, CTAs, datos, **sección de reuniones** (NUEVO), próximo contacto, comentario, historial, FAB

### `modo-llamadas.excalidraw`
- **Tipo**: Wireframe de pantalla mobile
- **Foco**: Botón LLAMAR enorme en el centro, barra de progreso arriba, acciones rápidas abajo (incluyendo "Agendar reunión")

### `dashboard-sdr.excalidraw`
- **Tipo**: Wireframe de dashboard
- **Secciones**: Métricas cards arriba, pipeline por plan en el medio, botón modo llamadas

### `pipeline-ventas.excalidraw`
- **Tipo**: Kanban board con 3 columnas (Cierre, Ganado, Perdido)
- **Cards**: Con plan, ticket, probabilidad
- **Barra inferior**: Pipeline por plan con barras de progreso
