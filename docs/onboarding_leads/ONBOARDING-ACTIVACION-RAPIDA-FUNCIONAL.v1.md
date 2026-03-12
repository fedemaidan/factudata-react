# Onboarding: Activación Rápida — Documento Funcional

> **Fecha**: Marzo 2026  
> **Estado**: Propuesta  
> **Área**: Bot WhatsApp — Flujo de onboarding  
> **Objetivo del documento**: Validar con el equipo de negocio los cambios propuestos al flujo de primer contacto, basados en datos reales del funnel 01–06 Marzo 2026.

---

## 1. Contexto y Problema

### 1.1 Datos del funnel actual (01–06 Marzo 2026, Inbound)

| # | Paso | Cantidad | % sobre total | Drop vs anterior |
|---|------|----------|---------------|------------------|
| 1 | Contacto creado | 68 | 100% | — |
| 2 | Respondió primer mensaje | 47 | 69.1% | -30.9% |
| 3 | Empresa creada | 23 | 33.8% | -51.1% |
| 4 | Onboarding completado | 20 | 29.4% | -13.0% |
| 5 | Primer movimiento | 8 | 11.8% | -60.0% |
| 6 | Vio su caja | 8 | 11.8% | 0% |

**Precalificación por bot (sobre 99 inbound acumulados en la DB, ver Apéndice A):**

| Precalificación | Cantidad | % |
|-----------------|----------|---|
| sin_calificar | 47 | 47.5% |
| calificado | 29 | 29.3% |
| quiere_meet | 23 | 23.2% |

> **Nota:** El funnel (68 contactos) corresponde al período 01–06 Marzo. La tabla de precalificación (99 contactos) viene del análisis sobre todos los inbound acumulados en la DB, no filtrados por fecha. Los datos de evidencia y el Apéndice A usan los 99 contactos.

### 1.2 Distribución de respuestas al primer mensaje

De los 47 que responden:

| Opción | Cantidad | % |
|--------|----------|---|
| Quiero probar | 37 | 79% |
| Quiero info | 11 | 23% |
| Quiero hablar con humano | 0 | 0% |

**Del análisis sobre los 99 inbound acumulados:** 47 (47.5%) nunca superaron la precalificación del bot (quedaron como `sin_calificar`). De ellos, 25 tienen ≤3 mensajes totales: vieron el menú y no respondieron.

### 1.3 Métricas de cierre conocidas

| Métrica | Valor |
|---------|-------|
| Web → Chat | 16% (422 → 68) |
| Demo → Venta | ~30% |
| Reuniones agendadas (inbound) | 12 (11 agendada, 1 realizada) |
| Reuniones con transcripción/resumen | 0 |

### 1.4 Diagnóstico

**Lo que funciona bien:**
- La landing convierte bien (16% web→chat es alto para SaaS).
- La demo cierra bien (30% es excelente).
- La mayoría quiere probar (79% elige opción 2).

**Los dos mayores problemas del funnel están identificados:**

#### Problema A — Caída entre "Quiero probar" y "Empresa creada"

```
37 eligen "probar"  →  23 crean empresa  =  14 perdidos (38% de caída)
```

Estos 14 leads se pierden durante el proceso de calificación (rol → preguntas del asistente GPT → configuración). Son personas que **ya expresaron intención de probar** y se fueron antes de ver el producto.

**Evidencia real:** Julieta eligió "probar", respondió su rol, y el bot le pidió *"nombre de empresa, cuántas obras y de qué tipo"*. Se cortó ahí: 9 mensajes, 4 de ellos mensajes de loading del bot ("⏳ Analizando..."), 0 valor entregado.

#### Problema B — Caída entre "Onboarding completado" y "Primer movimiento"

```
20 completan onboarding  →  8 hacen primer movimiento  =  12 perdidos (60% de caída)
```

Este es el drop más grave. **Tienen cuenta creada, proyectos configurados, y aun así no registran un gasto.** Esto indica que el momento posterior al onboarding no guía al usuario de forma efectiva hacia la acción clave.

**Evidencia real:** Rodo completó toda la calificación (25 mensajes), el bot le dijo *"Perfecto, ya puedes empezar a configurar tu cuenta y probar el bot gratuitamente. ¿Tienes alguna otra duda?"*... y ahí murió la conversación. El bot **cerró con una pregunta abierta** en vez de guiar al primer movimiento. En contraste, Felipe (que sí fue guiado) escribió *"Hoy gasté 403 dólares en corralón Luciani"* y el bot registró el egreso exitosamente.

#### Problema C — La opción "Info" es un callejón sin salida

11 personas (23%) eligen "Quiero saber más" en vez de "Probar". Esta ruta les da información textual sobre features pero **no los lleva al producto**. Muy probablemente estos 11 no avanzan a empresa creada.

**Evidencia real:** Santi Ordoñez, Leandro Solis, Nazareno Escobar y Sergio Raffaeli eligieron opción 3 (info). Todos recibieron texto descriptivo genérico. Nazareno y Sergio luego preguntaron por precios — señal de interés real — pero el bot los dejó en un loop de info sin ruta al producto. Todos abandonaron sin probar.

#### Problema D — La opción "Humano" no se usa

0 personas la eligieron. Ocupa espacio en el menú y agrega carga cognitiva sin aportar valor.

#### Problema E — Cuello de botella SDR post-calificación bot

```
26 calificados/quiere_meet por bot  →  0 reuniones agendadas  →  siguen en estado "nuevo"
```

Del análisis sobre los 99 inbound acumulados: el bot calificó a 52 (29 `calificado` + 23 `quiere_meet`), pero **26 siguen en estado "nuevo"** — el SDR no logró avanzarlos. 25 de esos 26 tienen intentos de llamada no atendida. El patrón típico es: cadencia_iniciada → llamada_no_atendida → proximo_contacto_programado → llamada_no_atendida (loop).

Además, **17 de 23 contactos que dijeron "quiero reunión" al bot no tienen reunión agendada**. El bot detecta la intención correctamente, la graba como `quiere_meet`, y espera al SDR. Pero con 92 llamadas no atendidas sobre los 99 contactos analizados, la ventana de interés se cierra.

**Implicancia:** Mejorar el bot sin resolver el handoff al SDR genera más leads calificados que se enfrían. La activación rápida hace esto más urgente: un usuario que ya probó y le gustó tiene una ventana de interés más corta.

---

## 2. Principio de diseño

**Value before setup** (valor antes de configuración).

Hoy el flujo es:

```
Menú → Calificación → Setup → Producto
```

Propuesta:

```
Producto → Setup → Calificación
```

El usuario debe poder experimentar la funcionalidad core de Sorby (registrar un gasto por WhatsApp) **en los primeros 30 segundos**, sin responder preguntas previas.

---

## 3. Flujo actual vs. Flujo propuesto

### 3.1 Flujo actual

```
Usuario escribe
    ↓
Menú 4 opciones (decisión cognitiva)
    ↓
[si elige "probar"]
    ↓
Pregunta rol (5 opciones)
    ↓
Asistente GPT pregunta nombre empresa
    ↓
Asistente GPT pregunta cantidad de obras
    ↓
Asistente GPT pregunta tipo de obras
    ↓
Asistente GPT pregunta nombres de obras
    ↓
Se crea empresa + proyectos
    ↓
Mensaje: "Ahora probá escribir un gasto..."
    ↓
(usuario debe actuar por iniciativa propia)
```

**~8-10 mensajes antes de ver valor.**
**Tiempo estimado: 3-5 minutos.**

### 3.2 Flujo propuesto

```
Usuario escribe
    ↓
Bot crea empresa demo + proyecto "Obra Demo" (en background)
    ↓
Mensaje de activación directa: "Probá escribir: Compré cemento por 120000"
    ↓
Usuario escribe un gasto
    ↓
Bot registra y muestra el resultado (MOMENTO MÁGICO)
    ↓
Bot ofrece opciones post-activación:
  1. Configurar con mis obras reales
  2. Agendar demo de 20 min
  3. Seguir probando
    ↓
[si elige configurar] → flujo de calificación actual (simplificado)
[si elige demo] → link de agenda
[si elige probar] → uso libre del bot demo
```

**1 mensaje antes de ver valor.**
**Tiempo estimado: 30 segundos hasta el momento mágico.**

---

## 4. Cambios propuestos en detalle

### 4.1 Cambio 1 — Eliminar menú inicial de 4 opciones

**Hoy:**

```
¡Hola! Soy SorbyBot, tu asistente virtual 🤖

Elegí una opción para continuar:

1️⃣ Ya tengo cuenta
2️⃣ Quiero probar Sorby gratis
3️⃣ Quiero saber más de Sorby
4️⃣ Quiero hablar con un humano
```

**Propuesta:**

```
Hola 👋

Soy Sorby, el asistente que registra gastos de obra por WhatsApp.

Te muestro cómo funciona en 10 segundos.

Probá escribir algo como:

"Compré cemento por 120000"
```

**Justificación:**
- 79% elige "probar" → el menú agrega fricción innecesaria para la mayoría.
- 0% elige "humano" → no aporta.
- 23% elige "info" → ruta de baja conversión. Mejor que entiendan probando.

**Riesgo identificado:**
- Usuarios existentes que escriben al bot por primera vez necesitan una vía alternativa. Se resuelve con detección: si el usuario escribe algo como "ya tengo cuenta" o "quiero hablar con alguien", el bot redirige al flujo correspondiente (detección por keywords, no por menú).

### 4.2 Cambio 2 — Crear empresa demo automáticamente al primer contacto

**Hoy:** La empresa se crea después de 5-8 preguntas de calificación.

**Propuesta:** Al recibir el primer mensaje del usuario, crear automáticamente en background:
- Empresa: "[Nombre de WhatsApp] - Demo"
- Proyecto: "Obra Demo"
- Usuario vinculado al teléfono

**Justificación:**
- La infraestructura ya existe (`onboardingCreaInicioConstructora` en `flowOnboarding.js`).
- Esto elimina la barrera 37 → 23 (los 14 perdidos en calificación).
- La calificación real (nombre empresa, cantidad de obras, tipo) se hace **después** de que el usuario entienda el producto.

**Riesgo identificado:**
- Se crearán más empresas demo que antes (incluyendo de leads que nunca avancen). Esto se mitiga con un flag `tipo: 'demo'` en la empresa para poder limpiar o distinguir en reportes.

### 4.3 Cambio 3 — Guiar activamente al primer movimiento

**Hoy:** Después del onboarding, el bot envía un ejemplo y espera. Si el usuario responde "Perfecto" o algo genérico, el bot cierra la conversación con "¡Encantado de haberte sido útil!". El 60% nunca registra su primer gasto.

**Propuesta:** Después de crear la cuenta demo, el bot guía paso a paso:

```
Paso 1 — Invitación a registrar gasto
"Probá escribir algo como: Compré cemento por 120000"

Paso 2 — Si el usuario registra el gasto, el bot muestra resultado:
"Registré el gasto:
📂 Proyecto: Obra Demo
💰 Monto: $120.000
🏷 Categoría: Materiales"

Paso 3 — Invitación a segunda acción:
"Ahora probá pedir un resumen. Escribí: resumen de gastos"

Paso 4 — Opciones post-activación:
"¿Querés configurarlo para tus obras reales?
1️⃣ Sí, configurar mi empresa
2️⃣ Agendar demo de 20 min
3️⃣ Seguir probando"
```

**Justificación:**
- El drop de 60% (20 → 8) indica que los usuarios no saben qué hacer después del setup, no que no quieren hacerlo.
- Guiar al usuario a 2 acciones (registrar gasto + pedir resumen) le muestra el ciclo completo del producto.

### 4.4 Cambio 4 — Mover calificación después de la activación

**Hoy:** Rol → nombre empresa → cantidad obras → tipo obras → nombres → crear cuenta.

**Propuesta:** Solo cuando el usuario elige "Configurar mi empresa" (después de haber probado):

```
"¡Genial! Para configurar tus obras reales necesito algunos datos:

¿Cómo se llama tu empresa?"
→ responde
"¿Cuántas obras activas tenés?"
→ responde
"¿Cómo se llaman?"
→ responde
"Listo. Ahora podés registrar gastos en tus obras reales."
```

**Justificación:**
- Un usuario que ya probó y elige configurar tiene intención real. La tasa de completar calificación será mucho mayor.
- Se eliminan preguntas innecesarias para la demo (rol, tipo de obras).
- La pregunta de "rol" puede inferirse más adelante o preguntarse en la demo.

### 4.5 Cambio 5 — Arreglar bug "No encontramos proyectos"

**Hoy:** Cuando el usuario pide un resumen y no hay movimientos, el bot responde:

```
❗ No encontramos proyectos para mostrar el resumen.
```

Esto rompe la experiencia. El usuario interpreta: "esto no funciona".

**Propuesta:**

```
Todavía no hay movimientos registrados en Obra Demo.

Probá registrar un gasto primero. Ejemplo:
"Compré arena por 80000"
```

**Justificación:**
- Este error se observó en una conversación real con un lead calificado que estaba mostrando señales de compra (preguntaba por reportes) y el bot le respondió con un error.
- Un mensaje de error útil redirige al usuario a la acción correcta en vez de frustrarlo.

### 4.6 Cambio 6 — Eliminar mensajes "⏳ Analizando" del flujo de activación

**Hoy:** Cada interacción con el asistente GPT envía 1-2 mensajes de loading como texto:

```
⏳ Analizando respuesta ⏳
⏳ Analizando...⏳
```

En una conversación de 9 mensajes como la de Julieta, **4 son mensajes de loading del bot**. El usuario percibe lentitud, ruido, y la conversación se siente mecánica.

**Propuesta:** 
- En el flujo de activación directa (Cambio 1-3), **no enviar mensajes de loading como texto**.
- Usar el indicador nativo de "typing" de WhatsApp (`presenceUpdate: 'composing'`) que ya está soportado por la API.
- Si el procesamiento tarda >3s, enviar un único mensaje breve: "✨ Un momento..." (no dos).

**Justificación:**
- El flujo promete "valor en 30 segundos". Cada mensaje de loading ocupa tiempo de lectura y scroll del usuario.
- Los contactos calificados tienen en promedio 20 msgs, pero solo 6 son del usuario — los otros 14 son del bot, muchos de loading.

### 4.7 Cambio 7 — Arreglar flujo "Ya tengo cuenta"

**Hoy:** El usuario que elige opción 1 ("Ya tengo cuenta") recibe un mensaje genérico *"¡Genial que ya seas parte de Sorby!"* y luego se le vuelve a mostrar el menú de 4 opciones. No se lo redirige a nada útil.

**Evidencia real:** Juan Lucas Melling eligió "1", recibió el mensaje genérico, se le mostró el menú de nuevo, eligió "3" (info), pidió precios, y terminó en un loop de 21 mensajes sin valor. Quedó como `sin_calificar`.

**Propuesta:**
- Detectar por keywords ("ya tengo cuenta", "mi cuenta", "no puedo entrar") y redirigir a `flowOnboardingUsuariosExistentes` con asistencia concreta.
- Si no se puede resolver, ofrecer link directo al soporte por WA o email.

### 4.8 Cambio 8 — Auto-agenda cuando el bot detecta `quiere_meet`

**Hoy:** El bot detecta correctamente cuando un usuario quiere reunión y lo graba como `quiere_meet`. Luego espera a que el SDR llame. Resultado: **17 de 23 contactos `quiere_meet` no tienen reunión agendada.**

**Propuesta:** Cuando el bot detecta intención de reunión, enviar link de agenda inmediatamente:

```
📅 ¡Perfecto! Podés agendar una demo de 20 min directamente acá:
[link de Calendly]

Si preferís, también podés seguir probando y agendar después.
```

**Justificación:**
- De 23 que dijeron quiero reunión, solo 6 tienen una agendada. El SDR tiene 92 llamadas no atendidas sobre 99 contactos.
- La auto-agenda elimina la dependencia del SDR para el paso más crítico (convertir intención en acción).
- El SDR puede dedicar su tiempo a preparar las demos, no a perseguir leads para agendarlas.

---

## 5. Detección de intención (usuarios que no encajan en el flujo nuevo)

El nuevo flujo elimina el menú, pero ciertos usuarios necesitan rutas alternativas. Se propone detección por keywords:

| Intención | Keywords a detectar | Acción |
|-----------|---------------------|--------|
| Usuario existente | "ya tengo cuenta", "mi cuenta", "no puedo entrar", "mi usuario" | Redirigir a `flowOnboardingUsuariosExistentes` |
| Quiere hablar con humano | "hablar con alguien", "humano", "representante", "llamar" | Notificar al equipo + ofrecer agenda |
| Quiere info/precios | "precio", "cuánto sale", "planes", "info" | Responder brevemente + invitar a probar |
| Señal de compra | "resumen", "reportes", "integración", "drive", "sheets" | Ofrecer demo de 20 min |

**Nota:** La detección por keywords ya existe en el proyecto (`opcionElegida`, `dameInputCualquierFormato`). No es infraestructura nueva.

---

## 6. Impacto esperado

### 6.1 Hipótesis medibles

| Hipótesis | Métrica | Valor actual | Objetivo |
|-----------|---------|--------------|----------|
| H1: Sin menú, más usuarios interactúan | % que envía segundo mensaje | 69% (47/68) | ≥ 80% |
| H2: Con guía activa, más usuarios hacen primer movimiento | % primer movimiento sobre total | 11.8% (8/68) | ≥ 25% |
| H3: Más activados = más demos calificadas | Demos agendadas/semana | 12 en total (1 realizada) | +100% |
| H4: La ruta "info" sin salida desaparece | % leads en ruta info sin avance | ~23% (11/47) | < 5% |
| H5: Auto-agenda reduce quiere_meet sin reunión | % quiere_meet sin reunión agendada | 74% (17/23)* | < 20% |
| H6: Calificados no se quedan en "nuevo" | % calificados por bot en estado nuevo | 50% (26/52)* | < 15% |

> *H5 y H6 medidos sobre los 99 inbound acumulados en la DB (ver Apéndice A), no sobre el funnel semanal de 68.

> **Nota sobre H2:** La métrica original de "empresa creada" pierde sentido si la empresa demo se crea automáticamente (sería 100% por definición). La métrica real de activación es el **primer movimiento registrado**.

### 6.2 Qué NO debería cambiar

- **Web → Chat (16%)**: No se toca el flujo principal de la landing. Se sugiere agregar un CTA secundario de Calendly directo como ruta alternativa (ver Apéndice B).
- **Demo → Venta (30%)**: No se toca la demo.
- **Calidad de leads**: La calificación sigue existiendo, solo se mueve después.

### 6.3 Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Usuarios existentes no encuentran su ruta | Media | Detección por keywords (sección 5) + fix Cambio 7 |
| Se crean muchas empresas demo "basura" | Alta | Flag `tipo: 'demo'` + cleanup periódico |
| El primer mensaje sin menú confunde a algunos | Baja | Si el usuario no responde en 5 min, enviar opciones como fallback |
| El equipo comercial pierde visibilidad de intención temprana | Media | Trackear eventos: `activacion_directa`, `primer_movimiento_demo`, `pidio_configurar`, `pidio_demo` |
| **Más leads calificados se enfrían si SDR no conecta** | **Alta** | Alerta push inmediata al SDR cuando lead completa activación (Cambio 8) + auto-agenda Calendly |
| Mensajes "⏳ Analizando" rompen la magia de los 30 segundos | Media | Cambio 6: typing nativo de WA en vez de mensajes de texto |

---

## 7. Plan de medición

### 7.1 Eventos a trackear (nuevos)

| Evento | Cuándo se dispara |
|--------|-------------------|
| `activacion_directa_inicio` | Bot envía mensaje de activación (reemplaza al menú) |
| `activacion_directa_empresa_demo_creada` | Se crea empresa+proyecto demo automáticamente |
| `activacion_directa_primer_gasto` | Usuario registra primer movimiento en cuenta demo |
| `activacion_directa_pidio_resumen` | Usuario pide resumen después del primer gasto |
| `activacion_directa_pidio_configurar` | Elige "Configurar mi empresa" post-activación |
| `activacion_directa_pidio_demo` | Elige "Agendar demo" post-activación |
| `activacion_directa_sigue_probando` | Elige "Seguir probando" post-activación |
| `activacion_directa_deteccion_existente` | Se detectó usuario existente por keywords |
| `activacion_directa_deteccion_humano` | Se detectó intención de hablar con humano |
| `activacion_directa_autoagenda_enviada` | Se envió link de Calendly automáticamente (quiere_meet) |
| `activacion_directa_autoagenda_confirmada` | El usuario efectivamente agendó por Calendly |
| `activacion_directa_alerta_sdr` | Se envió alerta push al SDR por lead activado |

### 7.2 Cómo comparar

**Opción A — Corte temporal:**
Activar el nuevo flujo en una fecha fija y comparar la cohorte post-cambio vs la cohorte 01–06 Marzo como baseline.

**Opción B — A/B test:**
50% de nuevos contactos reciben el flujo nuevo, 50% el actual. Comparar después de ≥100 contactos por variante (~3 semanas con tráfico actual).

**Recomendación:** Opción A (corte temporal). Con ~68 contactos/semana, un A/B tardaría ~3 semanas en tener datos significativos. Un corte temporal da resultados comparables en 1-2 semanas.

---

## 8. Alcance de implementación

### Fase 1 — Mínimo viable (Semana 1)

| Cambio | Ref. | Esfuerzo estimado |
|--------|------|-------------------|
| Reemplazar menú por mensaje de activación directa | Cambio 1 | Bajo |
| Crear empresa demo automática al primer contacto | Cambio 2 | Bajo (reutiliza `onboardingCreaInicioConstructora`) |
| Guiar al primer movimiento (paso a paso) | Cambio 3 | Medio |
| Detección keywords para usuarios existentes/humano | Cambio 7 | Bajo |
| Auto-agenda Calendly cuando bot detecta quiere_meet | Cambio 8 | Bajo |
| Alerta push inmediata al SDR cuando lead completa activación | Nuevo | Bajo |
| Eliminar/reducir mensajes "⏳ Analizando" en flujo de activación | Cambio 6 | Bajo |
| Eventos de tracking nuevos | — | Bajo |

### Fase 2 — Mejoras (Semana 2-3)

| Cambio | Ref. | Esfuerzo estimado |
|--------|------|-------------------|
| Arreglar bug "No encontramos proyectos" | Cambio 5 | Medio (requiere investigar causa raíz) |
| Flujo de calificación post-activación simplificado | Cambio 4 | Medio |
| Detección de señales de compra → ofrecer demo | — | Bajo |

### Fase 3 — Optimización (Semana 3-4)

| Cambio | Ref. | Esfuerzo estimado |
|--------|------|-------------------|
| Mensaje de fallback si no responde en 5 min | — | Bajo |
| Dashboard de funnel actualizado con nuevos pasos | — | Medio |
| Limpieza automática de empresas demo inactivas | — | Bajo |
| Eliminar mensajes "⏳ Analizando" de TODOS los flujos (no solo activación) | Cambio 6 ext. | Medio |

---

## 9. Preguntas abiertas para el equipo

1. **¿El proyecto demo debería llamarse "Obra Demo" o algo más contextual?** Ej: si el usuario se llama "Arq. Pérez", crear "Obra de prueba - Pérez".

2. **¿Cuánto tiempo mantenemos activas las cuentas demo?** Propuesta: 30 días, luego se archivan.

3. **¿Queremos mantener la ruta de "info" como fallback?** Hoy 11 de 47 la eligen. Si eliminamos el menú, esos 11 probablemente prueben directamente. Pero podríamos perder los que realmente solo quieren info antes de decidir.

4. **¿Calendly o flujo propio para auto-agenda?** Calendly es Fase 1 por rapidez. ¿Se migra después a un flujo propio con más control (elección de SDR, horarios custom)? Además, se propone agregar un CTA de Calendly directo en la landing como ruta alternativa al bot (ver Apéndice B).

5. **¿Hacemos corte temporal o A/B test?** (ver sección 7.2)

6. **¿Cómo manejamos la alerta al SDR?** Opciones: notificación push en app, mensaje WA automático al SDR asignado, o ambas. La data muestra que las cadencias programadas no alcanzan (92 llamadas no atendidas sobre 99 contactos analizados, ver Apéndice A).

---

## 10. Resumen ejecutivo

**Situación actual:** De 68 leads inbound semanales, solo 8 llegan a registrar un gasto (11.8%). Un análisis más amplio sobre 99 contactos acumulados muestra que 47 ni siquiera superan la precalificación del bot, y de los 52 que el bot sí califica, 26 quedan estancados en estado "nuevo" porque el SDR no logra conectar (92 llamadas no atendidas). El producto funciona y vende bien cuando se entiende (30% de cierre en demo), pero el flujo tiene dos cuellos de botella: el onboarding pone barreras antes de mostrar valor, y el handoff bot→SDR pierde leads calificados.

**Cambio central:** Invertir el orden — primero mostrar valor (registrar un gasto en 30 segundos), después calificar. Complementado con auto-agenda para eliminar la dependencia del SDR en el paso crítico.

**Impacto esperado:** Llevar el primer movimiento de 11.8% a ≥25% y reducir quiere_meet sin reunión de 74% a <20%, sin cambiar la landing, la demo ni el producto.

**Esfuerzo:** Semana 1 para el flujo mínimo viable. La infraestructura técnica ya existe.

---

## Apéndice A — Validación con datos reales

> Análisis realizado sobre 99 contactos inbound del período 01–06 Marzo 2026, cruzando contactos SDR con conversaciones WA, eventos del historial, y reuniones.

### A.1 Estadísticas de conversación

| Métrica | Valor |
|---------|-------|
| Total con conversación WA | 99/99 (100%) |
| Promedio mensajes por contacto | 16.7 |
| Promedio mensajes bot | 11.9 |
| Promedio mensajes usuario | 4.8 |

**Distribución de mensajes por conversación:**

| Rango | Cantidad |
|-------|----------|
| 1-5 msgs | 33 |
| 6-10 msgs | 20 |
| 11-20 msgs | 10 |
| 21-50 msgs | 34 |
| 50+ msgs | 2 |

### A.2 Precalificación vs. longitud de conversación

| Precalificación | Contactos | Avg msgs | Avg msgs usuario |
|-----------------|-----------|----------|------------------|
| sin_calificar | 47 | 6.7 | 2.3 |
| calificado | 29 | 20.1 | 5.9 |
| quiere_meet | 23 | 33.0 | 8.8 |

**Sin calificar — distribución:**
- 25 con ≤3 msgs (vieron menú, no respondieron)
- 8 con 4-8 msgs (empezaron pero abandonaron)
- 14 con 9+ msgs (hablaron mucho pero el bot no los calificó)

### A.3 Estado vs. acciones SDR

| Estado | Contactos | Con llamada | Con WA | Con reunión | Avg eventos |
|--------|-----------|-------------|--------|-------------|-------------|
| nuevo | 57 | 50 | 2 | 0 | 8.5 |
| contactado | 23 | 23 | 5 | 5 | 13.8 |
| calificado | 12 | 10 | 3 | 7 | 16.9 |
| no_califica | 6 | 2 | 0 | 0 | 9.5 |

### A.4 Hallazgos críticos

1. **26 calificados por bot siguen en estado "nuevo"** — el SDR no los avanzó. 25 tienen intentos de llamada no atendida.
2. **17 de 23 `quiere_meet` no tienen reunión agendada** — la intención se detecta pero no se convierte.
3. **Solo 1 reunión realizada** de 12 agendadas, 0 con transcripción, 0 con resumen IA.
4. **Top eventos SDR:** proximo_contacto_programado (218), contacto_asignado (115), cadencia_iniciada (102), llamada_no_atendida (92).

### A.5 Extractos de conversaciones reales

**Caso típico: Abandonó en el menú (sin_calificar, 3 msgs)**
```
[USUARIO] Hola, quiero probar SorbyData
[BOT]    ⏳ Analizando respuesta ⏳
[BOT]    ¡Hola! Soy *SorbyBot*... Elegí una opción: 1️⃣ Ya tengo cuenta 2️⃣ Probar...
         → no respondió más
```

**Caso típico: Ruta "info" sin salida (sin_calificar, 9 msgs)**
```
[USUARIO] Hola, quiero empezar con SorbyData
[BOT]    Menú de 4 opciones
[USUARIO] 3 (info)
[BOT]    Texto descriptivo genérico sobre features
[USUARIO] 5 (precios)
[BOT]    "Los planes se ajustan al tamaño de tu empresa..."
[BOT]    "Si querés seguir, podés escribirme otra consulta..."
         → no respondió más
```

**Caso éxito: Cuando el bot SÍ guía al gasto (quiere_meet, 33 msgs)**
```
[BOT]    ✅ Listo. Para registrar una compra, enviá un mensaje con el formato...
[USUARIO] Hoy gasté 403 dólares en corralón Luciani materiales
[BOT]    ⏳ Crear egreso ⏳
[BOT]    Los datos del comprobante son: 👉 Proyecto O1719 👉 $403 👉 Materiales
[BOT]    ¿Los datos son correctos? 1. ✅ Sí  2. 📝 Corregir...
[USUARIO] 3 (confirmar con foto)
[BOT]    ✅ El egreso fue registrado correctamente
         → MOMENTO MÁGICO: vio valor real del producto
```

**Caso problema: Calificó pero bot cierra con pregunta abierta (calificado, 25 msgs)**
```
[BOT]    Perfecto, tu empresa "Pindonga SA" ya está configurada.
[BOT]    ¿Quieres coordinar una reunión o empezar a configurar?
[USUARIO] quiero configurar mi cuenta de manera gratuita
[BOT]    Perfecto, ya puedes empezar. ¿Tienes alguna otra duda? 🤔
         → no respondió más (el bot no lo guió a una acción concreta)
```

---

## Apéndice B — Análisis: Bot primero vs. Calendly directo

### B.1 Las dos estrategias

Se evaluó una alternativa al flujo propuesto: en vez de que el lead entre por WhatsApp al bot, que la landing lo mande directo a Calendly para agendar una demo, y que el bot le escriba después.

| | Opción A: Bot → Calendly | Opción B: Calendly directo |
|---|---|---|
| **Flujo** | Landing → WA → Bot activa en 30s → opción de agendar | Landing → Calendly → Agenda demo → Bot post-agenda |
| **Fricción de entrada** | Baja (mandar un WA) | Alta (elegir día/hora, dejar email, comprometerse a call) |
| **Conversión landing esperada** | ~16% (dato real) | ~3-5% (benchmark SaaS para booking directo) |
| **Volumen semanal estimado** | ~68 chats → X activan → algunos agendan | ~15-20 bookings directos |
| **Calidad del lead en la demo** | Ya probó, ya vio valor, sabe qué es | No probó, el SDR explica desde cero |
| **Tipo de demo** | "Profundización" (corta, enfocada) | "Explicación" (larga, desde cero) |
| **Costo humano por lead** | Bot filtra gratis, SDR solo en leads calientes | Cada lead consume 20 min de SDR |
| **No-show rate esperado** | Bajo (usuario ya enganchado con el producto) | 30-40% típico en Calendly SaaS |
| **Aprovecha el diferenciador** | Sí: el producto ES WhatsApp, la demo es el producto | No: una call de Zoom no transmite la experiencia WA |

### B.2 A favor de Calendly directo

- **Elimina el cuello de botella SDR para agendar.** Hoy el SDR persigue leads por teléfono (92 llamadas no atendidas). Con Calendly directo, el lead se agenda solo — el SDR deja de perseguir y se enfoca en dar demos.
- **Ruta más corta a la demo para leads de alta intención.** Algunos usuarios no quieren "probar" — quieren hablar con alguien. Hoy no tienen ruta directa (0% elige "humano" en el menú, pero eso puede ser porque la opción no es atractiva, no porque no quieran).
- **Simplicidad operativa.** Un Calendly no requiere desarrollo.

### B.3 En contra de Calendly directo

- **Se pierde ~70% del tráfico.** Agendar una call es un compromiso mayor que mandar un WA. Si la conversión baja de 16% a 4%, pasamos de 68 a ~17 leads/semana. Los otros 51 se pierden.
- **Los leads llegan "fríos" a la demo.** Un usuario que nunca probó Sorby necesita que le expliquen todo desde cero. La demo pasa de ser "¿viste cómo registraste un gasto? ahora mirá esto" a "te voy a mostrar una herramienta que registra gastos por WhatsApp". La tasa de cierre probablemente baja del 30% actual.
- **No escala.** Con 15-20 bookings/semana × 20 min = 5-7 horas de demos. Si el tráfico crece 2x, necesitás otro SDR. Con el bot, 2x tráfico = 0 costo humano adicional.
- **Desperdicia el diferenciador.** La magia de Sorby es que funciona por WhatsApp. Que el primer contacto sea por WA y en 30 segundos registres un gasto real es la mejor demo posible — más convincente que cualquier call con slides.
- **No-show.** En Calendly SaaS, 30-40% no se presenta. De 17 bookings, se realizan ~10-12. De ahí 30% cierra = 3-4 ventas. Con el bot: 68 chats → si 25% activa = 17 activados → si 30% agenda demo → 5 demos → 30% cierra + los que compran sin demo.

### B.4 Sugerencia: las dos rutas desde la landing

La respuesta no es elegir una u otra — es **ofrecer ambas desde la landing** para capturar los dos tipos de lead:

```
Landing
  ├── CTA principal (botón grande): "Probalo gratis por WhatsApp"
  │     → Bot activación rápida (flujo propuesto en este doc)
  │     → Captura al ~16% que quiere probar algo rápido
  │
  └── CTA secundario (link o botón chico): "Agendá una demo de 20 min"
        → Calendly directo (sin pasar por el bot)
        → Captura al lead de alta intención que prefiere hablar con un humano
```

**Para los que van por Calendly**, el bot puede enviarles un mensaje post-agenda:

```
📅 ¡Tenés una demo agendada para el [fecha]!

Mientras tanto, podés probar cómo funciona Sorby.
Escribí algo como: "Compré cemento por 120000"
```

Esto convierte la espera entre agenda y demo en una oportunidad de activación. El lead llega a la demo habiendo probado → mejor cierre.

### B.5 Impacto estimado de la doble ruta

| Ruta | Conversión landing | Leads/semana | Demos | Ventas estimadas |
|------|-------------------|-------------|-------|------------------|
| Solo bot (propuesta actual) | 16% | 68 chats | las que salgan del bot | depende de activación |
| Solo Calendly | ~4% | ~17 bookings (~12 se presentan) | 12 | ~3-4 |
| **Ambas** | ~18-20% | ~68 chats + ~8-10 bookings extra | 12 + las del bot | ~3-4 de Calendly + las del bot |

La doble ruta **no canibaliza** — el que iba a mandar un WA sigue mandando un WA. Agrega un canal para los que nunca iban a mandar un WA pero sí agendarían una call.

**Recomendación:** Implementar la doble ruta en Fase 1. El CTA de Calendly es un link — no requiere desarrollo. El esfuerzo es configurar un Calendly y agregar un botón a la landing.
