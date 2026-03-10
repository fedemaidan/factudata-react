# Prompt de implementación — Onboarding Activación Rápida

## Contexto del proyecto

Sos un agente implementando cambios en **SorbyData**, un SaaS de gestión de gastos de obra que funciona principalmente por WhatsApp. El producto permite a constructoras registrar gastos, pedir resúmenes y controlar presupuestos por WhatsApp.

El documento funcional completo está en `app-web/docs/ONBOARDING-ACTIVACION-RAPIDA-FUNCIONAL.md`. **Leelo completo antes de empezar.** Contiene el diagnóstico del problema, los cambios propuestos, el diseño del A/B test, y el plan de implementación.

---

## Stack técnico

- **Backend:** Node.js
- **Bot framework:** `@builderbot/bot` con `@builderbot/provider-meta` (WhatsApp Cloud API)
- **Bases de datos:** Firestore (empresas, perfiles, leads, eventos, proyectos) + MongoDB (ContactoSDR, MensajeProgramado, ReunionSDR, AbTest, estado del bot)
- **Frontend:** Next.js (app-web)
- **API REST:** Express en `backend/app.api.js` (puerto 3003)
- **IA:** OpenAI GPT (asistentes para calificación, interpretación de mensajes)

---

## Arquitectura del bot — lo que necesitás saber

### Cómo se definen flows

```js
const { addKeyword, EVENTS } = require('@builderbot/bot');

const miFlow = addKeyword(['trigger_keyword'])
    .addAction(async (ctx, { state, provider, flowDynamic, gotoFlow, endFlow, fallBack }) => {
        // lógica sin esperar input
    })
    .addAction({ capture: true }, async (ctx, { state, gotoFlow }) => {
        // captura el siguiente mensaje del usuario
    });
```

- `gotoFlow(otroFlow)` → redirige a otro flow
- `fallBack()` → re-ejecuta el capture actual
- `endFlow()` → termina
- `state.update({ key: value })` → persiste estado por conversación
- `state.get('key')` → lee estado

### Entry point del bot

El archivo `backend/app.js` registra todos los flows:
```js
const adapterFlow = createFlow([...todosLosFlows]);
```

Los flows se importan desde `backend/flows/index.js`. Para agregar un flow nuevo:
1. Crear archivo en `backend/flows/`
2. Exportarlo desde `backend/flows/index.js`
3. Agregarlo al array en `app.js`

### Flow principal: `flowProxy` (EVENTS.WELCOME)

Captura TODO mensaje de texto. Dentro llama a `interpretarYEjecutar()` en `backend/utils/acciones.js` que:
1. Verifica si necesita onboarding → redirige a `flowInicioGeneral`
2. Verifica si hay asistente GPT activo → delega
3. Usa GPT para interpretar la intención del usuario
4. Ejecuta la acción correspondiente

### Menú actual: `flowInicioGeneral`

Archivo: `backend/flows/flowInicioGeneral.js`

Muestra menú de 4 opciones y routea:
- "Ya tengo cuenta" → `flowOnboardingUsuariosExistentes`
- "Probar gratis" → `flowOnboardingRol` → `flowOnboardingConstructora`
- "Saber más" → `flowOnboardingInfo`
- "Hablar con humano" → notifica equipo

Usa `opcionElegida(menu, input)` (IA) para interpretar respuestas libres como opciones numéricas.

### Creación de empresa en onboarding

Archivo: `backend/flows/flowOnboarding.js`

```
onboardingCreaInicioConstructora(phone, proyectos, nombre)
  → onboardingCreaInicio(phone, formData)
    → crearEmpresa(formData)           // Firestore 'empresas'
    → createProfile(profileData)       // Firestore 'profile'
  → crearProyecto(phone, {nombre})     // por cada obra
  → vincularEmpresaConContactoSDR()    // MongoDB
```

Ya existe la infraestructura para crear empresa + proyecto automáticamente. Reusar `onboardingCreaInicioConstructora`.

### Envío de botones WhatsApp

Archivo: `backend/utils/sendSafe.js`

```js
const { sendButtons } = require('../../utils/sendSafe');
await sendButtons(ctx, 'Texto del mensaje', [
    { body: 'Opción 1', id: 'opcion_1' },  // max 3 botones, 20 chars c/u
    { body: 'Opción 2', id: 'opcion_2' }
]);
```

### Mensajes programados (para timeout de 1h)

Modelo: `backend/src/models/MensajeProgramado.js`
Servicio: `backend/src/services/mensajesProgramadosService.js`
Scheduler: `backend/src/services/mensajesProgramadosScheduler.js` (corre cada 60s)

```js
await mensajesProgramadosService.createMensaje({
    createdFor: 'SYSTEM_FOLLOWUP',
    to: phone,
    mensaje: 'Texto del mensaje',
    template: templateData,  // opcional, para mensajes fuera de ventana 24h
    fechaEnvioProgramada: new Date(Date.now() + 60 * 60 * 1000), // +1h
    estado: 'PENDIENTE'
});
```

Para cancelar: buscar por `to` y `estado: 'PENDIENTE'` y marcar como `'CANCELADO'`.

**Importante:** Si la ventana de 24h de WhatsApp está cerrada y no hay template, el mensaje se cancela automáticamente. Para el timeout de 1h, **necesitás un template aprobado en Meta** o asegurarte de que se envíe dentro de la ventana de 24h (que en este caso sí, porque el usuario escribió hace <1h).

### Event tracking

Archivo: `backend/src/services/eventService.js`

```js
const { addEvent } = require('../services/eventService');
await addEvent(phone, 'nombre_evento', email, { extra_data });
```

### Lead / ContactoSDR

- **Lead** (Firestore): Marketing/atribución. Colección `leads`.
- **ContactoSDR** (MongoDB): Pipeline comercial. Modelo en `backend/src/models/sdr/ContactoSDR.js`.
- **Bridge:** `backend/src/services/leadContactoBridge.js` → `sincronizarLeadConContactoSDR(phone, data, evento)`

ContactoSDR tiene campo `precalificacion`: `sin_calificar`, `no_llego`, `calificado`, `quiere_meet`.

### Rutas web (Next.js)

Páginas en `app-web/src/pages/`. Cada archivo es una ruta. 
API del backend en `backend/src/routes/` servida por Express.

---

## Implementación — Fase 1: Normalización (Semana 0)

Implementar estos 4 cambios al flujo existente. NO son el A/B test todavía — son mejoras que aplican a todos.

### N1 — Timeout de 1 hora → Calendly

**Qué hacer:**
1. En `flowInicioGeneral.js`, después de enviar el primer mensaje (menú), programar un mensaje para +1h usando `mensajesProgramadosService.createMensaje()`.
2. Si el usuario responde antes de 1h, cancelar el mensaje programado (buscar mensajes PENDIENTE para ese teléfono con `createdFor: 'ONBOARDING_TIMEOUT'` y marcar CANCELADO).
3. El mensaje de timeout debe ser:

```
Hola de nuevo 👋

Si preferís, podés agendar una demo de 20 min y te mostramos Sorby aplicado a tu empresa:

https://calendly.com/sorby/demo
```

**Nota:** El link de Calendly exacto lo definirá el equipo. Usar un placeholder configurable (variable de entorno o config).

**Archivos a modificar:**
- `backend/flows/flowInicioGeneral.js` — programar mensaje después del menú
- Posiblemente crear un helper `cancelarTimeoutOnboarding(phone)` que se llame cuando el usuario responde

**Criterio de aceptación:** Si un lead nuevo escribe y no responde en 1h, recibe el mensaje de Calendly. Si responde antes, no lo recibe.

---

### N2 — Botonera de 2 opciones (reemplaza menú de 4)

**Qué hacer:**
1. En `flowInicioGeneral.js`, reemplazar el menú de texto con 4 opciones numéricas por una botonera de WhatsApp con 2 botones.
2. Usar `sendButtons()` de `utils/sendSafe.js`.

**Mensaje nuevo:**
```
¡Hola! Soy SorbyBot, tu asistente virtual 🤖
```
Botones:
- `[Probar Sorby gratis]` (id: `probar`)
- `[Agendar demo]` (id: `agendar_demo`)

**Routing:**
- `probar` → flujo actual de onboarding (flowOnboardingRol)
- `agendar_demo` → enviar link de Calendly + trackear evento `autoagenda_enviada`

**Mantener** la interpretación por IA (`opcionElegida`) como fallback para mensajes de texto libre.

**Archivos a modificar:**
- `backend/flows/flowInicioGeneral.js`

**Criterio de aceptación:** Lead nuevo ve 2 botones. Si clickea "Probar" va al flujo normal. Si clickea "Agendar demo" recibe link de Calendly.

---

### N3 — Keywords de info/humano → Calendly

**Qué hacer:**
1. En el flow de captura de respuesta del menú, si el usuario escribe algo que indica querer info o hablar con alguien (detectar keywords: "saber más", "info", "información", "quiero saber", "hablar", "humano", "persona", "llamar", "alguien"), responder brevemente y ofrecer Calendly.

**Para info:**
```
Sorby registra gastos de obra automáticamente desde WhatsApp, con reportes y control por proyecto.

¿Querés verlo en acción?
```
Botones: `[Probar ahora]` `[Agendar demo]`

**Para humano:**
```
📅 Podés agendar una demo de 20 min directamente acá:
https://calendly.com/sorby/demo

Si preferís, también podés probar el bot.
```
Botón: `[Probar ahora]`

**Archivos a modificar:**
- `backend/flows/flowInicioGeneral.js` — agregar detección de keywords en el capture

**Criterio de aceptación:** Si escriben "quiero saber más" o "hablar con alguien", reciben respuesta breve + opciones de Calendly/probar en vez de caer al flow de info o notificar al equipo.

---

### N4 — Keywords de usuarios existentes → redirect

**Qué hacer:**
1. En el capture del menú de `flowInicioGeneral.js`, ANTES de interpretar la opción del menú, chequear si el mensaje contiene keywords de usuario existente: "ya tengo cuenta", "mi cuenta", "no puedo entrar", "mi usuario", "ya soy cliente", "ya estoy registrado".
2. Si matchea → `gotoFlow(flowOnboardingUsuariosExistentes)`.

**Archivos a modificar:**
- `backend/flows/flowInicioGeneral.js`

**Criterio de aceptación:** Si un usuario existente escribe "ya tengo cuenta" en cualquier momento del menú, va directo al flow de usuarios existentes sin quedar en loop.

---

### Testing de Fase 1

Después de implementar N1-N4:
1. Testear con un número nuevo → debe ver botonera de 2 opciones
2. No responder por 1h → debe recibir mensaje de Calendly
3. Responder "quiero saber más" → debe recibir info breve + botones
4. Responder "ya tengo cuenta" → debe ir a flow de usuarios existentes
5. Clickear "Probar Sorby gratis" → debe ir al flujo de onboarding normal
6. Clickear "Agendar demo" → debe recibir link de Calendly
7. Verificar que el flujo de onboarding normal (calificación → empresa → probar) sigue funcionando sin cambios

---

## Implementación — Fase 2: A/B Test (Semana 1)

### Paso 1 — Modelo AbTest (MongoDB)

Crear `backend/src/models/AbTest.js`:

```js
const AbTestSchema = new Schema({
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    status: { type: String, enum: ['activo', 'pausado', 'finalizado'], default: 'activo' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    targetSampleSize: { type: Number, default: 100 },
    metricaGanadora: { type: String, default: 'reuniones_por_contacto' },
    variantes: [{
        key: String,      // "A" o "B"
        nombre: String    // "Control — Flujo normalizado"
    }],
    reglaDecision: String,
    resultado: { type: String, default: null }  // "A", "B", "empate", null
}, { timestamps: true });
```

### Paso 2 — Campo `ab_test_variante` en ContactoSDR

Agregar al schema de ContactoSDR (`backend/src/models/sdr/ContactoSDR.js`):

```js
ab_test_variante: { type: String, default: null },  // "A" o "B"
ab_test_name: { type: String, default: null }        // "onboarding_activacion_rapida"
```

### Paso 3 — Servicio de asignación de variante

Crear `backend/src/services/abTestService.js`:

```js
async function asignarVariante(phone) {
    // 1. Buscar si ya tiene variante asignada → retornarla
    // 2. Buscar test activo con name "onboarding_activacion_rapida"
    // 3. Si no hay test activo o está pausado → retornar null (flujo default)
    // 4. Si hay test activo → Math.random() < 0.5 ? 'A' : 'B'
    // 5. Guardar en ContactoSDR.ab_test_variante
    // 6. Trackear evento ab_test_asignado con { variante, test_name }
    // 7. Retornar variante
}

async function getVariante(phone) {
    // Solo leer, no asignar
}
```

### Paso 4 — Flow de activación directa (Variante B)

Crear `backend/flows/flowActivacionDirecta.js`:

**Trigger:** Keyword interno (nunca se activa por keyword, solo via `gotoFlow`).

**Secuencia:**

1. **Crear empresa demo en background:**
   - Usar `onboardingCreaInicioConstructora(phone, [{ nombre: 'Obra Demo' }], nombreWhatsApp + ' - Demo')`
   - La empresa debe tener un flag para identificarla como demo: `tipo: 'demo'` o similar
   - Trackear evento `activacion_directa_empresa_demo_creada`

2. **Enviar mensaje de activación:**
```
Hola 👋

Soy Sorby. Registro gastos de obra automáticamente desde WhatsApp.

Te muestro cómo funciona — mandame un gasto de ejemplo como si fuera real:

"Compré cemento por 120000 para la obra de Belgrano"

Y mirá lo que pasa 👇
```
   - Trackear evento `activacion_directa_inicio`

3. **Capturar el mensaje del usuario:**
   - Si escribe algo que parece un gasto → delegarlo al sistema de interpretación existente (que usará GPT para parsearlo y registrarlo en la empresa demo)
   - Después del registro exitoso, mostrar resultado y guiar al resumen:
```
✅ Registré el gasto:

📂 Proyecto: Obra Demo
💰 Monto: $120.000
🏷 Categoría: Materiales

Ahora probá pedir un resumen.
Escribí: "resumen de gastos"
```
   - Trackear evento `activacion_directa_primer_gasto`

4. **Capturar pedido de resumen:**
   - Delegar al sistema existente de resúmenes
   - Después del resumen, ofrecer opciones:
```
¿Querés configurarlo para tus obras reales?
```
   Botones: `[Configurar mi empresa]` `[Agendar demo]` `[Seguir probando]`

5. **Según la opción:**
   - "Configurar mi empresa" → `gotoFlow(flowOnboardingRol)` o crear un flow simplificado de configuración (sin preguntar rol, solo empresa y obras). Trackear `activacion_directa_pidio_configurar`.
   - "Agendar demo" → link de Calendly. Trackear `activacion_directa_pidio_demo`.
   - "Seguir probando" → `endFlow()` y dejar que el flow normal (flowProxy) maneje los siguientes mensajes. Trackear `activacion_directa_sigue_probando`.

**Manejo de edge cases en el capture:**
- Si escribe keywords de usuario existente → `gotoFlow(flowOnboardingUsuariosExistentes)`
- Si escribe keywords de info → respuesta breve + Calendly
- Si escribe keywords de agendar → link de Calendly directo
- Si no escribe un gasto (texto irrelevante) → re-intentar con fallBack():
```
No pude interpretar eso como un gasto. Probá con algo como:
"Compré arena por 80000"
```
  Máximo 2 re-intentos, después ofrecer Calendly como alternativa.

**Programar timeout de 1h** igual que en Variante A (N1).

### Paso 5 — Modificar flowInicioGeneral para routear según variante

En `flowInicioGeneral.js`, al inicio del flow (antes de mostrar menú):

```js
// 1. Verificar si es usuario existente (tiene empresa activa) → flujo normal
// 2. Si es contacto nuevo:
const variante = await asignarVariante(phone);
if (variante === 'B') {
    return gotoFlow(flowActivacionDirecta);
}
// 3. Si variante es 'A' o null → mostrar menú normalizado (botonera de 2 opciones)
```

### Paso 6 — Eventos de tracking

En cada punto relevante, llamar a `addEvent(phone, 'nombre_evento', null, { variante, test_name })`.

Lista completa de eventos en la Sección 10 del documento funcional. Todos deben incluir `variante: 'A' | 'B'` en el extra data.

### Paso 7 — API REST para el panel de A/B tests

Crear `backend/src/routes/abTestRoutes.js` y `backend/src/controllers/abTestController.js`.

**Endpoints:**

```
GET    /api/ab-tests                    → lista de tests
GET    /api/ab-tests/:id                → detalle de un test
POST   /api/ab-tests                    → crear test (admin)
PATCH  /api/ab-tests/:id/status         → pausar/finalizar
GET    /api/ab-tests/:id/metrics        → métricas agregadas por variante
GET    /api/ab-tests/:id/export         → CSV con todos los contactos + eventos
```

**Endpoint de métricas** (`/api/ab-tests/:id/metrics`):
- Buscar todos los ContactoSDR con `ab_test_name` = test.name
- Agrupar por `ab_test_variante`
- Para cada variante, calcular:
  - Total contactos
  - % que envió 2do mensaje (contar en historial de chat)
  - % empresa creada (buscar en Firestore)
  - % primer movimiento en 24h (buscar eventos)
  - % pidió demo (buscar eventos `activacion_directa_pidio_demo` o `autoagenda_enviada`)
  - % reuniones agendadas (buscar en ReunionSDR o evento `autoagenda_confirmada`)
  - Evolución diaria (agrupar por fecha de `ab_test_asignado`)

**Registrar las rutas** en `backend/app.api.js`.

### Paso 8 — Página web `/ab-tests`

Crear `app-web/src/pages/ab-tests.js` (o `abTests.js` según la convención del proyecto — revisar cómo se nombran las otras páginas).

**Diseño funcional detallado en Sección 9.9 del documento funcional.** Incluye wireframes ASCII de las vistas de lista y detalle.

Componentes:
1. **Vista lista:** Card por cada test con nombre, estado, contactos, métrica ganadora por variante, delta.
2. **Vista detalle:** Dos columnas (A vs B) con todas las métricas, gráfico de evolución diaria (usar chart library que ya use el proyecto, probablemente recharts o similar).
3. **Acciones:** Pausar, Finalizar, Exportar CSV.

Verificar qué library de charts usa el proyecto antes de elegir una.

Solo accesible para admins (seguir el patrón de auth del proyecto).

### Paso 9 — Seed del primer test

Crear un script o endpoint para crear el test inicial:

```js
{
    name: 'onboarding_activacion_rapida',
    displayName: 'Onboarding Activación Rápida',
    status: 'activo',
    targetSampleSize: 100,
    metricaGanadora: 'reuniones_por_contacto',
    variantes: [
        { key: 'A', nombre: 'Control — Flujo normalizado' },
        { key: 'B', nombre: 'Activación directa' }
    ],
    reglaDecision: 'B gana si % reuniones/contacto de B > A y demo→venta no cae bajo 20%. Con ~100 contactos.'
}
```

---

## Orden de implementación recomendado

```
1. N4 — Keywords usuarios existentes (más simple, previene bugs)
2. N2 — Botonera de 2 opciones (cambio de UI del menú)
3. N3 — Info/Humano → Calendly (routing de keywords)
4. N1 — Timeout 1h → Calendly (usa mensajes programados)
5. [VALIDAR que normalización funciona — 2-3 días]
6. Modelo AbTest + campo en ContactoSDR
7. abTestService (asignación de variantes)
8. flowActivacionDirecta (Variante B completa)
9. Modificar flowInicioGeneral para routear por variante
10. Eventos de tracking en ambas variantes
11. API REST de A/B tests
12. Página web /ab-tests
13. Seed del test
14. [ACTIVAR TEST]
```

---

## Reglas generales

1. **No romper nada existente.** El flujo actual de onboarding para usuarios que ya tienen empresa debe seguir funcionando exactamente igual.
2. **Cada cambio con su commit.** Mensajes descriptivos.
3. **Reusar infraestructura existente.** No reinventar: usar `sendButtons`, `mensajesProgramadosService`, `addEvent`, `onboardingCreaInicioConstructora`, `opcionElegida`.
4. **El link de Calendly es un placeholder.** Usar variable de entorno `CALENDLY_DEMO_URL` o similar. No hardcodear.
5. **Logging.** Agregar logs descriptivos en puntos clave (asignación de variante, creación de demo, timeout enviado, timeout cancelado).
6. **Idempotencia.** Si el usuario ya tiene variante asignada y vuelve a escribir, no reasignar. Si ya tiene empresa demo, no crear otra.
7. **El documento funcional es la fuente de verdad.** Ante dudas, referirse a `app-web/docs/ONBOARDING-ACTIVACION-RAPIDA-FUNCIONAL.md`.

---

## Variables de entorno nuevas

```
CALENDLY_DEMO_URL=https://calendly.com/sorby/demo
AB_TEST_ENABLED=true
ONBOARDING_TIMEOUT_MINUTES=60
```

---

## Preguntas que el agente debe decidir durante la implementación

1. **Empresa demo:** ¿Usar `onboardingCreaInicioConstructora` directamente o crear un wrapper que marque la empresa como `tipo: 'demo'`? Recomendación: wrapper que llame a la función existente y luego actualice el campo `tipo`.
2. **Capture del gasto en Variante B:** ¿Dejar que `flowProxy` (el flow principal) maneje el gasto, o interceptarlo dentro de `flowActivacionDirecta`? Recomendación: interceptar dentro del flow con un capture, detectar si parece un gasto, y delegarlo al sistema de interpretación existente para que registre el movimiento. Así se mantiene el control de la secuencia guiada.
3. **"Seguir probando":** Después de esta opción, el usuario cae al flow normal (flowProxy). La empresa demo ya existe, los movimientos se registran ahí. Funciona sin cambios adicionales.
