# Onboarding: Activación Rápida — Documento Funcional

**Fecha:** Marzo 2026
**Estado:** Propuesta
**Área:** Bot WhatsApp — Onboarding / Activación
**Objetivo:** Aumentar la cantidad de leads inbound que llegan al **primer movimiento exitoso**, reduciendo fricción inicial y dependencia del equipo comercial.

---

## 1. Resumen ejecutivo

Hoy Sorby **adquiere bien** y **vende bien cuando logra hacer demo**, pero pierde demasiados leads antes de que entiendan el producto.

### Datos clave del funnel (01–06 Marzo 2026)

| Paso                     | Cantidad |                 Conversión |
| ------------------------ | -------: | -------------------------: |
| Visitas web              |      422 |                          — |
| Conversaciones iniciadas |       68 |        16.1% sobre visitas |
| Respondió primer mensaje |       47 | 69.1% sobre conversaciones |
| Empresa creada           |       23 | 33.8% sobre conversaciones |
| Onboarding completado    |       20 | 29.4% sobre conversaciones |
| Primer movimiento        |        8 | 11.8% sobre conversaciones |

### Lo que muestran estos datos

- **La landing funciona bien**: 16% web → chat.
- **La demo funciona bien**: ~30% demo → venta.
- **El problema principal no es adquisición ni cierre**.
- **El problema principal es activación**: muy pocos leads llegan a experimentar el valor real del producto.

### Tesis del rediseño

Hoy el flujo exige configuración antes de mostrar valor:

```text
Menú → Calificación → Setup → Uso
```

La propuesta es invertir ese orden:

```text
Uso → Valor → Setup → Calificación
```

Objetivo central:

> **Lograr que más leads inbound agenden una reunión de demo**, mostrándoles el valor del producto antes de pedirles datos. El mecanismo: que cualquier lead pueda registrar un primer gasto exitoso en menos de 30 segundos desde su primer mensaje.

### Plan de ejecución en 2 fases

#### Fase 1 — Normalización (Semana 0)

Mejoras inmediatas al flujo actual, sin cambiar la lógica de onboarding:

| Cambio | Descripción |
|--------|-------------|
| Timeout 1h | Si no responde en 1 hora, el bot envía link de Calendly |
| Botonera | Menú pasa de 4 opciones de texto a 2 botones: `Probar Sorby gratis` y `Agendar demo` |
| Info/Humano → Calendly | Si piden info o hablar con alguien, respuesta breve + link de agenda |
| Keywords usuarios existentes | Detección automática para redirigir sin menú |

Detalle completo: Sección 8.

#### Fase 2 — A/B Test (Semanas 1-3)

Sobre el flujo ya normalizado, se testean dos variantes:

| | Variante A (control) | Variante B (tratamiento) |
|---|---|---|
| Primer mensaje | Botonera: Probar / Agendar | Activación directa: "Probá escribir un gasto" |
| Onboarding | Calificación → Setup → Uso | Demo automática → Uso → Calificación después |
| Timeout 1h | ✅ Calendly | ✅ Calendly |

**Métrica ganadora:** % de reuniones agendadas por contacto.
**Muestra:** ~50 contactos por variante (~12 días).
**Monitoreo:** Página `/abTestContactActivation` con panel en tiempo real.

Detalle completo: Sección 9.

---

## 2. Problema principal a resolver

La mayor pérdida del funnel ocurre **antes del momento mágico**, es decir, antes de que el usuario entienda concretamente qué hace Sorby.

### Cuello de botella 1 — Fricción antes de probar

De 47 personas que responden el primer mensaje, solo 23 crean empresa. 14 se pierden durante la calificación (rol → preguntas del asistente GPT → configuración). Son personas que **ya expresaron intención de probar** y se fueron antes de ver el producto.

> **Evidencia:** Julieta eligió "probar", respondió su rol, y el bot le pidió nombre de empresa, cuántas obras y de qué tipo. Se cortó ahí: 9 mensajes, 4 de ellos "⏳ Analizando...", 0 valor entregado.

---

### Cuello de botella 2 — Onboarding completado pero sin activación

De 20 personas que completan onboarding, solo 8 hacen primer movimiento. **60% de caída.** El bot no guía hacia la primera acción clave — en varios casos cierra con frases abiertas tipo "¿Tenés alguna otra duda?" o "Ya podés empezar".

> **Evidencia:** Rodo completó toda la calificación (25 mensajes). El bot le dijo *"Perfecto, ya puedes empezar. ¿Tienes alguna otra duda? 🤔"* y ahí murió la conversación. En contraste, Felipe — que sí fue guiado — escribió *"Hoy gasté 403 dólares en corralón Luciani"* y el bot registró el egreso exitosamente. Esa es la diferencia entre cerrar con pregunta abierta y guiar a la acción.

---

### Cuello de botella 3 — Ruta "info" sin salida

11 de 47 que responden (23%) eligen "Quiero saber más". Esa ruta entrega texto descriptivo pero **no los lleva al producto**. Genera conversaciones informativas que rara vez activan.

> **Evidencia:** Nazareno Escobar y Sergio Raffaeli eligieron info, recibieron texto genérico, luego preguntaron por precios — señal de interés real — pero el bot los dejó en un loop de info sin ruta al producto. Ambos abandonaron sin probar.

---

### Cuello de botella 4 — Handoff comercial lento

El bot detecta intención de reunión correctamente y la graba como `quiere_meet`. Pero la conversión queda frenada esperando al SDR:

- **17 de 23** contactos `quiere_meet` no tienen reunión agendada.
- **26 de 52** calificados por bot siguen en estado "nuevo" — el SDR no los avanzó.
- **92 llamadas no atendidas** sobre 99 contactos analizados. Patrón típico: cadencia_iniciada → llamada_no_atendida → proximo_contacto_programado → llamada_no_atendida (loop).

Este problema existe, pero es **secundario respecto al principal**: primero hay que lograr que más usuarios entiendan el producto. Dicho esto, la auto-agenda (Cambio 8) tiene impacto alto con esfuerzo casi nulo — es un link de Calendly.

---

## 3. Principio de diseño

### Value before setup

La regla central del nuevo onboarding será:

> **Primero mostrar el producto funcionando, después pedir datos.**

En Sorby, el momento mágico no es "crear empresa" ni "terminar onboarding".

El momento mágico es:

- registrar un gasto
- ver cómo queda estructurado
- pedir un resumen o ver la caja

Eso tiene que pasar lo antes posible.

---

## 4. Objetivo del rediseño

### Objetivo de negocio

**Lograr que más leads inbound agenden una reunión de demo.**

Hoy la demo funciona bien (~30% cierra), el problema es que muy pocos llegan a ella. El rediseño apunta a que más leads experimenten el producto → entiendan su valor → quieran una demo.

### Métrica ganadora del A/B test

**% de reuniones agendadas por contacto**

Se elige esta métrica porque es la más cercana a la venta. Activación y primer movimiento son intermedias — lo que importa al negocio es si el cambio genera más demos.

### Mecanismo

Que cualquier lead pueda registrar un primer gasto exitoso en menos de 30 segundos desde su primer mensaje. Si ven el valor rápido, más van a querer agendar.

### North Star Metric (post-test)

**% de conversaciones inbound con primer movimiento exitoso en 24h**

### Valor actual

8 / 68 = **11.8%** (primer movimiento)
Reuniones agendadas: dato a medir desde el inicio del test como baseline.

### Objetivo inicial

Que la variante B supere a la variante A en reuniones agendadas por contacto.

---

## 5. Flujo actual vs flujo propuesto

### Flujo actual

```text
Usuario escribe
    ↓
Menú de 4 opciones
    ↓
Si elige "probar"
    ↓
Pregunta rol
    ↓
Asistente pregunta nombre empresa
    ↓
Pregunta cantidad de obras
    ↓
Pregunta tipo de obras
    ↓
Pregunta nombres de obras
    ↓
Se crea empresa + proyectos
    ↓
El bot invita a probar
    ↓
El usuario debe actuar por iniciativa propia
```

**~8-10 mensajes antes de ver valor. Tiempo estimado: 3-5 minutos.**

---

### Flujo propuesto

```text
Usuario escribe
    ↓
Se asigna empresa demo del pool (instantáneo, ya tiene datos precargados)
    ↓
Bot invita a registrar un gasto de ejemplo
    ↓
Usuario registra un gasto
    ↓
Bot muestra resultado estructurado (MOMENTO MÁGICO)
    ↓
Bot invita a pedir un resumen
    ↓
Usuario ve el ciclo completo del producto
    ↓
Recién ahí se le ofrece:
  1. Configurar mis obras reales
  2. Agendar demo de 20 min
  3. Seguir probando
```

**1 mensaje antes de ver valor. Tiempo estimado: 30 segundos.**

---

## 6. Cambios propuestos

### Cambio 1 — Reemplazar el menú inicial por activación directa

**Hoy:** El bot abre con un menú de 4 opciones que obliga al usuario a decidir antes de entender el producto.

**Propuesta:** Abrir con un mensaje orientado a acción inmediata:

```text
Hola 👋

Soy Sorby, el asistente que registra gastos de obra por WhatsApp.

Te muestro cómo funciona en 10 segundos.

Probá escribir algo como:
"Compré cemento por 120000"
```

**Hipótesis:** Sacar la decisión inicial y llevar directamente al uso aumentará la tasa de interacción y activación.

**Nota:** Esto debe tratarse como **hipótesis principal de producto**, no como verdad absoluta. Se valida con medición.

**Riesgo:** Usuarios existentes necesitan una vía alternativa. Se resuelve con detección por keywords ("ya tengo cuenta", "mi cuenta", "no puedo entrar") — la infraestructura ya existe en el proyecto.

---

### Cambio 2 — Crear cuenta demo automáticamente al primer contacto

**Hoy:** La empresa y proyectos se crean después de varias preguntas.

**Propuesta:** Mantener un **pool de 2 empresas demo pre-armadas** en background, listas para asignar instantáneamente. Cuando llega un contacto nuevo en Variante B:

1. Se le asigna una empresa demo del pool (instantáneo)
2. Se personaliza: `[Nombre de WhatsApp] - Demo`
3. Se crea el perfil vinculado al teléfono
4. En background, se repone el pool creando una nueva empresa demo

Cada empresa demo incluye:
- Proyecto: `Obra Demo`
- **Movimientos precargados:**
  - Egreso: Cemento x 50 bolsas — $150.000 (Materiales, Corralón López)
  - Egreso: Arena y piedra — $85.000 (Materiales, Corralón López)
  - Egreso: Jornales albañilería semana 1 — $320.000 (Mano de Obra)
  - Ingreso: Aporte inicial del cliente — $2.000.000
- **Presupuestos asignados:**
  - Materiales: $3.000.000
  - Mano de Obra: $5.000.000

**Beneficio:** El usuario ve una obra "viva" con caja positiva, gastos reales y presupuestos con ejecución parcial desde el primer momento. Si pide un resumen, hay datos para mostrar.

**Marcado como demo:** Campo `esDemo: true` en el documento de la empresa en Firestore. El campo `tipo` se mantiene como `'Constructora'` para que toda la lógica existente funcione sin cambios.

**Objetivo:** Eliminar la barrera de setup inicial y permitir uso inmediato. La asignación del pool es instantánea — la creación de nuevas demos es asincrónica y no bloquea al usuario.

**Limpieza:** Las empresas demo inactivas (sin actividad en 30 días) se archivarán con un proceso de limpieza posterior. Ver Sección 15.

---

### Cambio 3 — Guiar activamente al primer movimiento

Este es uno de los cambios más importantes.

**Problema actual:** Después del onboarding, el bot suele dejar la conversación abierta en lugar de conducir al usuario a una acción concreta. El 60% nunca registra su primer gasto.

**Propuesta — Secuencia guiada obligatoria:**

**Paso 1** — Invitar a registrar gasto:

```text
Probá escribir:
"Compré cemento por 120000"
```

**Paso 2** — Cuando lo haga, mostrar resultado:

```text
Registré el gasto:

📂 Proyecto: Obra Demo
💰 Monto: $120.000
🏷 Categoría: Materiales
```

**Paso 3** — Invitar a segunda acción:

```text
Ahora probá pedir un resumen.
Escribí: resumen de gastos
```

**Paso 4** — Ofrecer siguientes caminos:

```text
¿Querés configurarlo para tus obras reales?
1️⃣ Sí, configurar mi empresa
2️⃣ Agendar demo de 20 min
3️⃣ Seguir probando
```

**Objetivo:** No dejar que el usuario "descubra solo" cómo seguir. Guiarlo secuencialmente hasta cerrar el ciclo de valor (registrar gasto + pedir resumen).

---

### Cambio 4 — Mover la calificación real después de la activación

**Hoy:** Se piden datos de empresa y obras antes de que el usuario pruebe el producto.

**Propuesta:** Pedir esos datos recién cuando el usuario ya probó y elige "Configurar mi empresa":

```text
¡Genial! Para configurar tus obras reales:

¿Cómo se llama tu empresa?
→ responde
¿Cuántas obras activas tenés?
→ responde
¿Cómo se llaman?
→ responde
Listo. Ahora podés registrar gastos en tus obras reales.
```

**Beneficio:** Se reserva el esfuerzo de configuración para usuarios que ya demostraron intención real. Se eliminan preguntas innecesarias para la demo (rol, tipo de obras).

---

### Cambio 5 — Separar bug técnico de mejora UX en errores

**Problema detectado:** Cuando el usuario pide un resumen y no hay movimientos, el bot responde:

```text
❗ No encontramos proyectos para mostrar el resumen
```

Eso rompe la confianza. Acá hay dos problemas distintos:

**A. Problema técnico:** Hay que revisar por qué el sistema no encuentra correctamente proyectos/movimientos en ciertos casos. Cambiar el copy ayuda, pero **no reemplaza arreglar el bug de fondo**.

**B. Mitigación UX:** Mientras tanto, mejorar el mensaje:

```text
Todavía no hay movimientos registrados en Obra Demo.

Probá registrar un gasto primero. Ejemplo:
"Compré arena por 80000"
```

---

### Cambio 6 — Reducir mensajes de loading en el flujo de activación

**Hoy:** El bot envía múltiples mensajes de loading como texto ("⏳ Analizando respuesta ⏳", "⏳ Analizando...⏳"). En una conversación de 9 mensajes, 4 pueden ser loading del bot.

**Propuesta:**

- Usar typing nativo de WhatsApp (`presenceUpdate: 'composing'`) en vez de mensajes de texto.
- Si el procesamiento tarda >3s, enviar un único mensaje breve: "✨ Un momento..."

**Prioridad:** Mejora de experiencia, no la palanca principal.

---

### Cambio 7 — Corregir el flujo "Ya tengo cuenta"

**Problema:** Hoy un usuario que ya tiene cuenta puede volver al menú o quedar en loop informativo.

> **Evidencia:** Juan Lucas Melling eligió "Ya tengo cuenta", recibió un mensaje genérico, se le mostró el menú de nuevo, eligió info, pidió precios, y terminó en un loop de 21 mensajes sin valor. Quedó como `sin_calificar`.

**Propuesta:** Detectar intención por keywords y redirigir al flujo correcto (`flowOnboardingUsuariosExistentes`). Keywords: "ya tengo cuenta", "no puedo entrar", "mi usuario", "mi cuenta". Si no se puede resolver, ofrecer link directo a soporte.

---

### Cambio 8 — Auto-agenda cuando detecta intención de demo

**Problema:** 17 de 23 contactos que dijeron "quiero reunión" al bot no tienen reunión agendada. El bot detecta la intención correctamente pero espera al SDR, y con 92 llamadas no atendidas la ventana de interés se cierra.

**Propuesta:** Si el bot detecta intención de demo, enviar link de agenda inmediata:

```text
📅 ¡Perfecto! Podés agendar una demo de 20 min directamente acá:
[link de Calendly]

Si preferís, también podés seguir probando y agendar después.
```

**Prioridad:** P1. El esfuerzo es casi nulo (es un link) y el impacto es alto (17 leads con intención que hoy se pierden). El SDR puede dedicar su tiempo a preparar las demos, no a perseguir leads para agendarlas.

---

## 7. Prioridades

### Prioridad 1 — Activación + auto-agenda

1. Crear demo automática al inicio (Cambio 2)
2. Reemplazar menú inicial por activación directa (Cambio 1)
3. Guiar al primer gasto (Cambio 3)
4. Guiar al primer resumen (Cambio 3)
5. Mover configuración real después (Cambio 4)
6. Auto-agenda Calendly cuando detecta `quiere_meet` (Cambio 8)
7. Trackear eventos nuevos

### Prioridad 2 — Robustez

8. Arreglar bug de proyectos/resumen (Cambio 5)
9. Mejorar mensajes de error (Cambio 5)
10. Reducir mensajes de loading (Cambio 6)

### Prioridad 3 — Conversión comercial

11. Corregir flujo "ya tengo cuenta" (Cambio 7)
12. Detección de señales de compra → ofrecer demo
13. Dashboard de funnel actualizado con nuevos pasos

---

## 8. Etapa previa — Normalización del flujo actual

Antes de arrancar el A/B test, se aplican cambios al flujo actual que nivelan la cancha. Estos cambios aplican a **ambas variantes** (o solo a A donde se indica) y no son parte de lo que se testea.

El objetivo es que la variante A no pierda por problemas ya diagnosticados (falta de seguimiento, opciones inútiles en el menú), sino que la comparación sea exclusivamente sobre **activación directa vs. menú + calificación**.

### N1 — Timeout de 1 hora → mensaje con Calendly

**Aplica a:** Ambas variantes.

Si el usuario no responde dentro de 1 hora después de recibir el primer mensaje del bot, se le envía automáticamente un mensaje con el link para agendar:

```text
Hola de nuevo 👋

Si preferís, podés agendar una demo de 20 min y te mostramos Sorby aplicado a tu empresa:

[link de Calendly]
```

**Justificación:** Hoy los leads que no responden se pierden completamente o quedan esperando una llamada del SDR (que en el 92% de los casos no se atiende). Este mensaje captura leads tibios que tal vez no quieren interactuar con el bot pero sí hablarían con alguien.

**Implementación:** Usar el sistema de mensajes programados existente (`mensajesProgramadosService`). Al enviar el primer mensaje, programar uno para +1h. Si el usuario responde antes, cancelar el programado.

### N2 — Botonera en menú + eliminar "Ya soy cliente"

**Aplica a:** Variante A solamente (B no tiene menú).

Reemplazar el menú actual de 4 opciones por texto con 2 opciones en botonera de WhatsApp:

**Hoy:**

```text
¡Hola! Soy SorbyBot, tu asistente virtual 🤖

Elegí una opción para continuar:

1️⃣ Ya tengo cuenta
2️⃣ Quiero probar Sorby gratis
3️⃣ Quiero saber más de Sorby
4️⃣ Quiero hablar con un humano
```

**Normalizado:**

```text
¡Hola! Soy SorbyBot, tu asistente virtual 🤖
```

Botones:
- `[Probar Sorby gratis]`
- `[Agendar demo de 20 min]`

**Justificación:**
- "Ya soy cliente" la eligen pocos y genera loops (caso Juan Lucas). Se reemplaza por detección por keywords.
- "Saber más" es un callejón sin salida (23% de los que responden caen ahí sin avanzar).
- "Hablar con humano" tiene 0 selecciones en el período medido.
- Los botones de WhatsApp tienen mayor tasa de click que opciones numéricas.

### N3 — "Info" y "Humano" redirigen a Calendly

**Aplica a:** Variante A (en B se detecta por keywords).

Si el usuario escribe algo que indica que quiere info o hablar con alguien (detectado por keywords), el bot responde brevemente y ofrece Calendly:

**Para info:**

```text
Sorby es un asistente que registra gastos de obra automáticamente desde WhatsApp, con reportes y control por proyecto.

¿Querés verlo en acción? Podés:

[Probar ahora]
[Agendar demo de 20 min]
```

**Para humano:**

```text
📅 ¡Perfecto! Podés agendar una demo de 20 min directamente acá:
[link de Calendly]

Si preferís, también podés probar el bot mientras tanto.

[Probar ahora]
```

**Justificación:** Ambas rutas hoy terminan en callejones sin salida o esperando al SDR. Redirigir a Calendly convierte leads que de otra forma se perderían.

### N4 — Detección de keywords para usuarios existentes

**Aplica a:** Ambas variantes.

Si el usuario escribe algo como "ya tengo cuenta", "mi usuario", "no puedo entrar", "mi cuenta", redirigir a `flowOnboardingUsuariosExistentes` sin pasar por el menú/activación.

**Justificación:** Evita que usuarios existentes se cuenten como leads perdidos en el test.

### Resumen de normalización

| # | Cambio | Variante A | Variante B |
|---|--------|:----------:|:----------:|
| N1 | Timeout 1h → Calendly | ✅ | ✅ |
| N2 | Botonera + sacar "Ya soy cliente" | ✅ | — (no tiene menú) |
| N3 | Info/Humano → Calendly | ✅ | — (por keywords) |
| N4 | Keywords usuarios existentes | ✅ | ✅ |

---

## 9. A/B Test — Diseño del experimento

### 9.1 Hipótesis central

El flujo de activación directa (sin menú, con demo automática y guía al primer gasto) generará más reuniones agendadas por contacto que el flujo actual normalizado.

### 9.2 Variantes

**Variante A — Flujo normalizado (control)**

El flujo actual con los cambios de normalización (Sección 8) aplicados:

```text
¡Hola! Soy SorbyBot, tu asistente virtual 🤖

[Probar Sorby gratis]    [Agendar demo de 20 min]
```

Si elige "Probar" → flujo de calificación actual (rol → asistente GPT → crear empresa → probar).
Si elige "Agendar" → link de Calendly directo.
Si no responde en 1h → mensaje con Calendly (N1).
Si escribe keywords de info/humano → respuesta breve + Calendly (N3).
Si escribe keywords de usuario existente → redirige (N4).

Todo el flujo posterior (calificación → onboarding → uso) se mantiene igual.

**Variante B — Activación directa (tratamiento)**

Se implementan los Cambios 1, 2 y 3 de este documento, más la normalización (Sección 8):

```text
Hola 👋

Soy Sorby. Registro gastos de obra automáticamente desde WhatsApp.

Te muestro cómo funciona — mandame un gasto de ejemplo como si fuera real:

"Compré cemento por 120000 para la obra de Belgrano"

Y mirá lo que pasa 👇
```

Se crea empresa demo automática en background. Se guía al primer gasto y primer resumen. Después se ofrecen opciones:

```text
¿Querés configurarlo para tus obras reales?
1️⃣ Sí, configurar mi empresa
2️⃣ Agendar demo de 20 min
3️⃣ Seguir probando
```

Si no responde en 1h → mensaje con Calendly (N1).
Si escribe keywords de info/humano → respuesta breve + Calendly.
Si escribe keywords de usuario existente → redirige (N4).

### 9.3 Asignación

- **Método:** Aleatorio, 50/50.
- **Implementación:** Al recibir el primer mensaje de un contacto nuevo, se asigna aleatoriamente a variante A o B (`Math.random() < 0.5`). La variante asignada se guarda en el lead/estado para que sea consistente si el usuario vuelve a escribir.
- **Criterio de inclusión:** Solo contactos nuevos inbound (no outbound, no usuarios existentes).

### 9.4 Métrica ganadora

**% de reuniones agendadas por contacto**

```
reuniones agendadas de la variante / contactos totales de la variante
```

Se elige esta métrica porque es la que está más cerca de la venta. Activación y primer movimiento son intermedias — lo que importa al negocio es si el cambio genera más demos.

### 9.5 Métricas secundarias (para diagnosticar)

| Métrica | Para qué sirve |
|---------|----------------|
| % que envía segundo mensaje | Mide si el primer mensaje genera más o menos interacción |
| % empresa creada | Mide si la demo automática supera a la calificación |
| % primer movimiento en 24h | Mide si la activación directa realmente activa |
| % que pide demo desde el bot | Mide si el flujo post-activación genera intención comercial |
| Tiempo promedio hasta primer movimiento | Mide velocidad de activación |
| % demo → venta | Verifica que la calidad de leads no baje |

Estas métricas ayudan a entender **por qué** una variante ganó, no cuál ganó.

### 9.6 Tamaño de muestra y duración

- **Objetivo:** ~50 contactos por variante = ~100 contactos totales.
- **Tráfico actual:** ~68 conversaciones/semana.
- **Duración estimada:** ~10-12 días.
- **Nota:** Con 50 por rama y una métrica binaria (agendó o no), se puede detectar una diferencia de ~15pp con confianza razonable. No es un test estadísticamente perfecto, pero es suficiente para tomar una decisión de producto con esta escala.

### 9.7 Qué se aplica en ambas variantes (no es parte del test)

Toda la **normalización** (Sección 8) se aplica antes de arrancar el test:

- **N1** — Timeout 1h → Calendly
- **N2** — Botonera en menú (solo A)
- **N3** — Info/Humano → Calendly (solo A)
- **N4** — Keywords usuarios existentes
- **Tracking de eventos** nuevos (para poder medir el test)

Estos no se testean porque nivelan la cancha, no son el cambio experimental.

### 9.8 Hipótesis secundarias

| Hipótesis | Métrica | Actual | Objetivo |
|-----------|---------|-------:|---------:|
| H1. La activación directa genera más interacción | % segundo mensaje | 69.1% | >75% en B |
| H2. La demo automática produce más primer movimiento | % primer movimiento en 24h | 11.8% | >20% en B |
| H3. La auto-agenda mejora conversión a demo | % intención demo → demo agendada | 26% | >80% en ambas |

### 9.9 Panel web de monitoreo de A/B tests

Se construye una página reutilizable para monitorear este y futuros A/B tests.

**Ruta:** `/abTestContactActivation` (nueva página en el admin)

**Vista principal — Lista de tests**

```
┌─────────────────────────────────────────────────────────────────┐
│  A/B Tests                                                      │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🟢 Onboarding Activación Rápida                          │  │
│  │ Inicio: 15/03/2026  │  Estado: Activo  │  87/100 contactos│  │
│  │ A: 8.5% reuniones   │  B: 19.5% reuniones  │  ↑ +11pp    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⚪ (futuro test)                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Vista de detalle de un test**

```
┌─────────────────────────────────────────────────────────────────┐
│  Onboarding Activación Rápida                                   │
│  Inicio: 15/03/2026  │  Estado: 🟢 Activo                      │
│                                                                 │
│  ┌─────────────────────────────┬─────────────────────────────┐  │
│  │ VARIANTE A (control)        │ VARIANTE B (tratamiento)    │  │
│  │                             │                             │  │
│  │ Contactos:         47       │ Contactos:         40       │  │
│  │ 2do mensaje:       69%      │ 2do mensaje:       82%      │  │
│  │ Empresa creada:    34%      │ Empresa creada:    72%      │  │
│  │ 1er movimiento:    11%      │ 1er movimiento:    30%      │  │
│  │ Pidió demo:        8%       │ Pidió demo:        22%      │  │
│  │ ──────────────────────────  │ ──────────────────────────  │  │
│  │ 🎯 Reuniones:      8.5%     │ 🎯 Reuniones:      19.5%    │  │
│  │ Demo → venta:      30%      │ Demo → venta:      33%      │  │
│  └─────────────────────────────┴─────────────────────────────┘  │
│                                                                 │
│  Δ métrica ganadora: +11pp  │  Confianza: Moderada             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Evolución diaria (gráfico de líneas)                     │   │
│  │                                                          │   │
│  │  Reuniones/contacto  — A (rojo) vs B (verde)             │   │
│  │  Contactos acumulados — A vs B                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [ Pausar test ]  [ Finalizar test ]  [ Exportar datos ]        │
└─────────────────────────────────────────────────────────────────┘
```

**Datos que muestra por variante:**

| Métrica | Descripción |
|---------|-------------|
| Contactos | Total asignados a esta variante |
| % 2do mensaje | Respondió al primer mensaje del bot |
| % empresa creada | Tiene empresa en Firestore |
| % 1er movimiento | Registró al menos un gasto/ingreso en 24h |
| % pidió demo | Expresó intención de demo (evento o keyword) |
| 🎯 % reuniones | **Métrica ganadora** — reuniones agendadas / contactos |
| % demo → venta | Para verificar calidad — solo si hay datos suficientes |

**Datos del test:**

| Campo | Descripción |
|-------|-------------|
| Nombre | Identificador del test |
| Fecha inicio | Cuándo se activó |
| Estado | Activo / Pausado / Finalizado |
| Contactos objetivo | Meta de muestra (ej: 100) |
| Contactos actuales | Cuántos van |
| Métrica ganadora | Cuál se usa para decidir |
| Regla de decisión | Resumen de cuándo se decide |

**Gráfico de evolución diaria:**

- Eje X: días desde inicio del test
- Eje Y: % reuniones/contacto acumulado
- Dos líneas: A (rojo) y B (verde)
- Permite ver si la diferencia se estabiliza o si es ruido

**Acciones:**

- **Pausar test**: deja de asignar nuevos contactos, los existentes siguen su flujo
- **Finalizar test**: marca como terminado, congela los números
- **Exportar datos**: CSV con todos los contactos, variante asignada, eventos y métricas

**Modelo de datos para soportar múltiples tests:**

```
AbTest {
  _id
  name: string              // "onboarding_activacion_rapida"
  displayName: string       // "Onboarding Activación Rápida"
  status: enum              // activo | pausado | finalizado
  startDate: Date
  endDate: Date | null
  targetSampleSize: number  // 100
  metricaGanadora: string   // "reuniones_por_contacto"
  variantes: [
    { key: "A", nombre: "Control — Flujo actual" },
    { key: "B", nombre: "Activación directa" }
  ]
  reglaDecision: string     // Texto libre con la regla
  resultado: string | null  // "B" | "A" | "empate" | null
  createdAt
  updatedAt
}
```

La asignación de variante por contacto se guarda en el lead/ContactoSDR (campo `ab_test_variante`), no en este modelo. Este modelo solo define el test.

**Permisos:** Solo admin.

---

## 10. Métricas de seguimiento

### Métrica ganadora del A/B

**% de reuniones agendadas por contacto** (por variante)

### Métricas secundarias

- % que envía segundo mensaje (por variante)
- % empresa creada (por variante)
- % primer movimiento en 24h (por variante)
- % que pide demo desde el bot (por variante)
- % demo → venta (por variante — para verificar calidad)
- Tiempo promedio hasta primer movimiento (por variante)

### Eventos a trackear (nuevos)

Todos los eventos deben incluir el campo `variante: 'A' | 'B'` para poder segmentar.

| Evento | Cuándo se dispara |
|--------|-------------------|
| `ab_test_asignado` | Se asigna variante al contacto nuevo |
| `activacion_directa_inicio` | Bot envía mensaje de activación (solo B) |
| `activacion_directa_empresa_demo_creada` | Se crea empresa+proyecto demo (solo B) |
| `activacion_directa_primer_gasto` | Usuario registra primer movimiento en demo (solo B) |
| `activacion_directa_pidio_resumen` | Usuario pide resumen post-primer gasto (solo B) |
| `activacion_directa_pidio_configurar` | Elige "Configurar mi empresa" (solo B) |
| `activacion_directa_pidio_demo` | Elige "Agendar demo" (ambas) |
| `activacion_directa_sigue_probando` | Elige "Seguir probando" (solo B) |
| `autoagenda_enviada` | Se envió link de Calendly (ambas) |
| `autoagenda_confirmada` | El usuario agendó por Calendly (ambas) |
| `menu_opcion_elegida` | Opción elegida en menú inicial (solo A, para comparar distribución) |

---

## 11. Regla de decisión del A/B test

Para evitar discusión infinita, se fijan criterios de decisión antes de empezar.

### Variante B gana si:

- **% reuniones/contacto de B > % reuniones/contacto de A**
- Y el rate de **demo → venta no cae** significativamente (>20%)

Si se cumple: se apaga A, se queda B para todos los contactos nuevos.

### Variante A gana si:

- B no supera a A en reuniones agendadas después de ~100 contactos.

Si se cumple: se mantiene flujo actual y se revisan hipótesis.

### Empate / resultados no claros:

- Extender el test 1 semana más (~50 contactos adicionales).
- Si sigue sin diferencia clara, mirar métricas secundarias para decidir.

### Independientemente de quién gane:

- La auto-agenda Calendly (Cambio 8) se queda en ambos casos — es una mejora independiente del flujo.
- Si B pierde en reuniones pero gana en activación, revisar el CTA post-activación (puede ser un problema de copy, no de flujo).
- Si B confunde a usuarios existentes, fortalecer detección por keywords antes de descartar.

---

## 12. Plan de implementación

### Semana 0 — Normalización (antes del A/B)

- Implementar timeout de 1h → mensaje con Calendly (N1)
- Cambiar menú a botonera de 2 opciones + sacar "Ya soy cliente" (N2)
- Info/Humano redirigen a Calendly (N3)
- Detección keywords usuarios existentes (N4)
- **Dejar correr unos días para verificar que la normalización no rompe nada**

### Semana 1 — Implementación del A/B test

- Implementar lógica de asignación aleatoria 50/50 en `flowInicioGeneral`
- Implementar Variante B: empresa demo automática (Cambio 2) + activación directa (Cambio 1) + guía al primer gasto y resumen (Cambio 3)
- Variante A: flujo normalizado (Sección 8)
- Trackear eventos nuevos + variante asignada en cada evento
- Crear página `/ab-tests` con panel de monitoreo (Sección 9.9)
- **Activar el test**

### Semana 2 — Test corriendo + robustez

- Monitorear métricas diarias desde `/ab-tests` (reuniones, activación, interacción)
- Arreglar bug de resumen/proyectos (Cambio 5) — aplica a variante B
- Mejorar mensajes de error (Cambio 5)
- Reducir loadings (Cambio 6)

### Semana 3 — Decisión + rollout

- Con ~100 contactos: evaluar resultados según regla de decisión (Sección 11)
- Si B gana: apagar A, rollout completo de variante B
- Si A gana: mantener, revisar hipótesis
- Si empate: extender test 1 semana
- Independientemente: ajustar CTA y copy según datos observados

### Post-test — Optimización

- Detectar señales de compra → ofrecer demo
- Dashboard de funnel con nuevos pasos
- **Limpieza automática de empresas demo inactivas** — Firestore + Google Sheets/Drive + MongoDB (ver Sección 15)
- Mover calificación después de activación si B ganó (Cambio 4)

---

## 13. Preguntas abiertas

1. ~~**¿Cómo se define el paso de demo → cuenta real?**~~ Pendiente. Se arranca limpia o se migra — a definir post-test.

2. ~~**¿Cuánto tiempo vive una cuenta demo?**~~ **Resuelto:** 30 días, luego se archivan con el proceso de limpieza (ver Sección 15).

3. ~~¿Conviene mantener algún fallback si el usuario no responde?~~ **Resuelto:** Timeout de 1h con Calendly (N1).

4. **¿Calendly o agenda propia en fase 2?** Calendly es Fase 1 por rapidez. ¿Se migra después a un flujo propio?

5. ~~**¿El proyecto demo se llama "Obra Demo" o algo más contextual?**~~ **Resuelto:** Siempre `"Obra Demo"`. Sin personalización por nombre.

6. **¿Doble ruta en la landing?** Se sugiere agregar un CTA secundario de Calendly directo en la landing ("Agendá una demo de 20 min") como ruta alternativa al bot. Captura leads de alta intención que prefieren hablar con alguien. No canibaliza — el que iba a mandar WA sigue mandando WA. Es un botón, no requiere desarrollo.

---

## 14. Decisiones técnicas confirmadas

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | **Empresa demo: campo `esDemo`** | Se agrega `esDemo: true` en Firestore. NO se cambia el campo `tipo` (sigue siendo `'Constructora'`). Así toda la lógica existente funciona sin modificaciones. |
| 2 | **Pool de 2 demos** | Siempre hay 2 empresas demo pre-creadas con datos. Al asignar una, se repone en background. Si no hay disponible, se crea una en el momento (fallback sincrónico). |
| 3 | **Datos precargados** | Cada demo tiene 4 movimientos (3 egresos + 1 ingreso) y 2 presupuestos (Materiales + Mano de Obra). Se crean con `createMovimiento(actualizaSheets=true)` y `crearPresupuesto()`. |
| 4 | **Procesamiento de gasto en Variante B** | Se intercepta dentro del flow con `capture` y se llama a `accionarSegunEmpresa()` directamente. Así se mantiene la secuencia guiada sin perder contexto. |
| 5 | **Referencia a empresa del contacto** | Se usa `datosBot.empresaFirestoreId` en ContactoSDR. El campo `empresaId` en la raíz es del tenant SDR, no del lead. |
| 6 | **Calendly** | Se configura por variable de entorno `CALENDLY_DEMO_URL`. |
| 7 | **Template de Meta** | Hay template aprobado para el timeout de 1h. Es backup — la ventana de 24h debería estar abierta. |
| 8 | **Página A/B** | Ruta: `/abTestContactActivation`. Archivo: `app-web/src/pages/abTestContactActivation.js`. |

---

## 15. Limpieza de empresas demo (trabajo pendiente)

**No se implementa en esta fase.** Se documenta para el ciclo posterior.

### Qué hay que limpiar

1. **Firestore:**
   - Colección `empresas` — documentos con `esDemo: true` inactivos (sin movimientos nuevos en 30 días)
   - Colección `movimientos` — todos los movimientos vinculados a esas empresas
   - Colección `proyectos` — proyectos vinculados
   - Colección `profile` — perfiles vinculados
   - Colección `presupuestos` — presupuestos vinculados

2. **Google Sheets y Drive:**
   - Cada empresa demo genera un Sheet y una carpeta en Drive (igual que una empresa real)
   - Hay que eliminar los Sheets y carpetas de empresas demo archivadas usando la API de Google Drive

3. **MongoDB:**
   - Modelo `EmpresaDemo` — marcar como archivadas o eliminar registros de demos viejas
   - `ContactoSDR.datosBot.empresaFirestoreId` — limpiar referencia si se elimina la empresa

### Criterio propuesto

- **30 días sin actividad** desde la creación → archivar/eliminar
- Implementar como **cron job** o script manual ejecutable desde el admin
- Ejecutar la limpieza en orden: Sheets/Drive → Firestore (movimientos, presupuestos, proyectos, profile, empresa) → MongoDB
- Prioridad: post-test, cuando se valide que la Variante B funciona

---

## 16. Conclusión

Sorby no necesita rediseñar toda su adquisición ni su demo comercial.
Necesita mover el momento mágico al principio.

Hoy el onboarding pide esfuerzo antes de mostrar valor.
La propuesta busca invertir ese orden para que más leads entiendan el producto, lleguen a activarse y recién después configuren su operación real o agenden una demo.

> **El objetivo de este rediseño es que probar Sorby se parezca más a usarlo y menos a completar un formulario.**

---

## Apéndice A — Conversaciones reales que ilustran el problema

### Caso 1: Abandonó en calificación (Julieta)

Eligió "probar", respondió su rol. El bot le pidió nombre de empresa, cuántas obras y de qué tipo. Se cortó: 9 mensajes totales, 4 del bot eran "⏳ Analizando...", 0 valor entregado. **El bot le pidió esfuerzo sin darle nada a cambio.**

### Caso 2: Calificó pero el bot cerró mal (Rodo)

Completó toda la calificación (25 mensajes). El bot le dijo *"Perfecto, ya puedes empezar. ¿Tienes alguna otra duda? 🤔"*. No respondió más. **El bot cerró con pregunta abierta en vez de guiar al primer movimiento.**

### Caso 3: El momento mágico funciona cuando se guía (Felipe)

Escribió *"Hoy gasté 403 dólares en corralón Luciani materiales"*. El bot registró el egreso, mostró proyecto + monto + categoría, pidió confirmación. Felipe confirmó con foto. **Vio el valor real del producto en un mensaje.** Esa es la experiencia que hay que lograr para todos.

### Caso 4: Ruta info → loop → abandono (Juan Lucas)

Eligió "Ya tengo cuenta", recibió mensaje genérico, se le mostró el menú de nuevo, eligió info, pidió precios. 21 mensajes sin valor. Quedó como `sin_calificar`. **El bot no supo redirigirlo a nada útil.**

---

## Apéndice B — Datos SDR de referencia

> Análisis sobre 99 contactos inbound acumulados en la DB, cruzando contactos SDR con conversaciones WA, eventos del historial y reuniones.

| Dato | Valor |
|------|-------|
| Calificados por bot (calificado + quiere_meet) | 52 |
| De esos, siguen en estado "nuevo" | 26 (50%) |
| `quiere_meet` sin reunión agendada | 17 de 23 (74%) |
| Reuniones agendadas | 12 |
| Reuniones realizadas | 1 |
| Llamadas no atendidas (total sobre 99 contactos) | 92 |
| Top evento SDR | proximo_contacto_programado (218) |

**Precalificación por bot:**

| Precalificación | Contactos | Avg msgs | Avg msgs usuario |
|-----------------|-----------|----------|------------------|
| sin_calificar | 47 (47.5%) | 6.7 | 2.3 |
| calificado | 29 (29.3%) | 20.1 | 5.9 |
| quiere_meet | 23 (23.2%) | 33.0 | 8.8 |

De los 47 sin calificar: 25 tienen ≤3 mensajes (vieron el menú y no respondieron).
