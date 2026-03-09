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

> **Que cualquier lead inbound pueda registrar un primer gasto exitoso en menos de 30 segundos desde su primer mensaje.**

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

### North Star Metric

**% de conversaciones inbound con primer movimiento exitoso en 24h**

### Valor actual

8 / 68 = **11.8%**

### Objetivo inicial

Llevar esa métrica a **20–25%** en una primera iteración.

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
Se crea empresa demo + proyecto demo en background
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

**Propuesta:** Al primer mensaje del usuario, crear automáticamente en background:

- Empresa: `[Nombre de WhatsApp] - Demo`
- Proyecto: `Obra Demo`
- Usuario vinculado al teléfono

**Objetivo:** Eliminar la barrera de setup inicial y permitir uso inmediato. La infraestructura ya existe (`onboardingCreaInicioConstructora` en `flowOnboarding.js`).

**Aclaración de producto:** Esto debe definirse explícitamente como **modo demo** (flag `tipo: 'demo'`), no como cuenta real final. Luego, si el usuario avanza, se migra/configura su cuenta real.

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

## 8. Hipótesis a validar

| Hipótesis                                      | Métrica                                 | Actual |             Objetivo |
| ---------------------------------------------- | --------------------------------------- | -----: | -------------------: |
| H1. Activación directa aumenta interacción     | % que envía segundo mensaje             |  69.1% |                 >75% |
| H2. Demo automática aumenta activación         | % con primer movimiento en 24h          |  11.8% |                 >20% |
| H3. Guía secuencial reduce abandono post-setup | % de usuarios activados tras crear demo |      — | subir sostenidamente |
| H4. Auto-agenda mejora conversión a demo       | % intención demo → demo agendada        |    26% |                 >80% |

---

## 9. Métricas de seguimiento

### Métrica principal

**% de conversaciones inbound con primer movimiento exitoso en 24h**

### Métricas secundarias

- % que responde al segundo mensaje
- % que pide resumen después del primer gasto
- % que elige configurar cuenta real
- % que agenda demo (desde bot + desde Calendly directo)
- % demo → venta
- Tiempo promedio hasta primer movimiento

### Eventos a trackear (nuevos)

| Evento | Cuándo se dispara |
|--------|-------------------|
| `activacion_directa_inicio` | Bot envía mensaje de activación |
| `activacion_directa_empresa_demo_creada` | Se crea empresa+proyecto demo |
| `activacion_directa_primer_gasto` | Usuario registra primer movimiento en demo |
| `activacion_directa_pidio_resumen` | Usuario pide resumen post-primer gasto |
| `activacion_directa_pidio_configurar` | Elige "Configurar mi empresa" |
| `activacion_directa_pidio_demo` | Elige "Agendar demo" |
| `activacion_directa_sigue_probando` | Elige "Seguir probando" |
| `activacion_directa_autoagenda_enviada` | Se envió link de Calendly |
| `activacion_directa_autoagenda_confirmada` | El usuario agendó por Calendly |

---

## 10. Regla de decisión

Para evitar discusión infinita, conviene fijar criterios claros.

### El rediseño se considera exitoso si:

- El primer movimiento sube de **11.8% a al menos 20%**
- No cae significativamente el rate de demo → venta
- No aumenta de forma problemática el soporte por confusión

### Si mejora interacción pero no activación:

Revisar copy del primer mensaje y guía posterior.

### Si mejora activación pero no mejora demo:

Revisar CTA post-activación.

### Si confunde a usuarios existentes:

Fortalecer detección por keywords o reintroducir fallback selectivo.

---

## 11. Plan de implementación

### Semana 1 — MVP de activación

- Crear empresa demo automática (Cambio 2)
- Reemplazar menú por activación directa (Cambio 1)
- Guiar al primer gasto y primer resumen (Cambio 3)
- Auto-agenda Calendly para `quiere_meet` (Cambio 8)
- Trackear eventos nuevos

### Semana 2 — Robustez

- Arreglar bug de resumen/proyectos (Cambio 5)
- Mejorar mensajes de error (Cambio 5)
- Ajustar flow de usuarios existentes (Cambio 7)
- Reducir loadings (Cambio 6)

### Semana 3 — Optimización

- Detectar señales de compra → ofrecer demo
- Ajustar CTA post-activación según datos de Semana 1-2
- Dashboard de funnel con nuevos pasos
- Limpieza automática de empresas demo inactivas

---

## 12. Preguntas abiertas

1. **¿Cómo se define el paso de demo → cuenta real?** ¿Se migran datos demo o se arranca limpia?

2. **¿Cuánto tiempo vive una cuenta demo?** Propuesta: 30 días, luego se archivan.

3. **¿Conviene mantener algún fallback de menú si el usuario no responde?** Ej: si no responde en 5 min, enviar opciones.

4. **¿Calendly o agenda propia en fase 2?** Calendly es Fase 1 por rapidez. ¿Se migra después a un flujo propio?

5. **¿El proyecto demo se llama "Obra Demo" o algo más contextual?** Ej: "Obra de prueba - Pérez" si se llama Arq. Pérez.

6. **¿Doble ruta en la landing?** Se sugiere agregar un CTA secundario de Calendly directo en la landing ("Agendá una demo de 20 min") como ruta alternativa al bot. Captura leads de alta intención que prefieren hablar con alguien. No canibaliza — el que iba a mandar WA sigue mandando WA. Es un botón, no requiere desarrollo.

---

## 13. Conclusión

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
