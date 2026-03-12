# Onboarding: Activación Rápida — Plan de Implementación

> **Fecha**: Marzo 2026  
> **Estado**: Implementado — branch `feature/onboarding-activacion-rapida`  
> **Documento de referencia**: [ONBOARDING-ACTIVACION-RAPIDA-FUNCIONAL.md](ONBOARDING-ACTIVACION-RAPIDA-FUNCIONAL.md)  
> **Objetivo**: Plan técnico de implementación con A/B test para validar el flujo de activación rápida vs. el flujo actual.

---

## 1. Estrategia de A/B test

### 1.1 Diseño

| Parámetro | Valor |
|-----------|-------|
| **Variante A (control)** | Flujo actual: menú 4 opciones → calificación → setup → producto |
| **Variante B (test)** | Flujo nuevo: activación directa → producto → setup → calificación |
| **Split** | 50/50 por número de teléfono (hash determinístico) |
| **Tamaño mínimo** | 100 contactos por variante (~3 semanas con tráfico actual) |
| **Métrica primaria** | % primer movimiento registrado |
| **Métricas secundarias** | % segundo mensaje, % empresa creada, % demo agendada, tiempo al primer movimiento |
| **Criterio de éxito** | Variante B ≥ 20% primer movimiento (vs 11.8% actual) |
| **Criterio de corte** | Si variante B < 8% en primer movimiento después de 50 contactos → pausar |

### 1.2 Cómo asignar la variante

Asignación determinística por teléfono para que un mismo contacto siempre caiga en la misma variante aunque reinicie la conversación:

```js
function getVariante(phone) {
    // Hash simple del teléfono → A o B
    const digits = String(phone).replace(/\D/g, '');
    const lastDigits = parseInt(digits.slice(-4), 10);
    return lastDigits % 2 === 0 ? 'A' : 'B';
}
```

Se evalúa **una sola vez** al inicio del flujo y se persiste en el lead y en el ContactoSDR como campo `varianteAB`.

### 1.3 Qué NO incluir en el A/B

El A/B testea solo el flujo del bot. Estos cambios se aplican a **todos** los contactos (no por variante):

- Auto-agenda Calendly cuando bot detecta `quiere_meet` (Cambio 8)
- Alerta push al SDR
- CTA de Calendly directo en landing (Apéndice B del funcional)
- Eventos de tracking nuevos (se agregan a ambas variantes)

---

## 2. Arquitectura técnica

### 2.1 Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `flows/onboardingFlows/flowInicioGeneral.js` | **Modificado** | Split A/B antes del menú. Variante A → flujo actual. Variante B → `flowActivacionDirecta`. |
| `flows/onboardingFlows/flowActivacionDirecta.js` | **Modificado** | Flujo Variante B: mensaje de activación + empresa demo + pasos demo guiados. |
| `flows/onboardingFlows/flowCargarObras.js` | **Creado** | Reemplaza el `flowCalificacionPost.js` planeado. Pide nombre empresa + obras + confirmación, renombra empresa demo sin borrarla, muestra menú de 6 funcionalidades avanzadas. |
| `src/services/empresaDemoService.js` | **Modificado** | Lógica del pool de demos (2 disponibles). Presupuestos indexados por CAC. Fue creado como `empresaDemoService.js` (no `demoAccountService.js` como se planificó). |
| `src/services/abTestService.js` | **Modificado** | `getVariante(phone)` con balanceo dinámico, `registrarVariante()`, `getEstadisticasAB()`. |
| `src/services/onboardingService.js` | **Modificado** | Pasos demo (`pasosDemo`, `pasosDemoSugerencias`), flag `esperaAccion: true` en sugerenciaIngreso y sugerenciaPresupuesto. |
| `src/services/mensajesProgramadosScheduler.js` | **Modificado** | Soporte de campo `buttons` para mensajes programados interactivos. |
| `utils/sendSafe.js` | **Modificado** | Agregado `sendButtonUrl()` (botón CTA con URL). |
| `utils/demoHelper.js` | **Creado** (nuevo) | Helper centralizado para botones/mensajes del demo flow. Evita deps circulares. |
| `utils/acciones.js` | **Modificado** | Handlers para `cargar_obras`, `agendar_demo`, `si_agende`, `no_agende`, `activar_*`, pasos demo. |
| `scripts/regenerar-pool-demos.js` | **Creado** (nuevo) | Script para reconstruir el pool: borra solo demos disponibles, repone hasta `POOL_SIZE`. |

### 2.2 Flujo de decisión

```
flowInicioGeneral.addAction
    │
    ├── Detectar keywords ("ya tengo cuenta", "humano", etc.)
    │     → redirigir al flujo correspondiente (ambas variantes)
    │
    ├── getVariante(phone) === 'A'
    │     → flujo actual (menú 4 opciones, sin cambios)
    │
    └── getVariante(phone) === 'B'
          │
          ├── Crear empresa demo en background (demoAccountService)
          ├── Enviar mensaje de activación directa
          ├── presenceUpdate('composing') en vez de "⏳ Analizando"
          │
          └── flowActivacionDirecta
                ├── Capturar primer gasto → registrar → mostrar resultado
                ├── Invitar a pedir resumen
                └── Opciones post-activación:
                      ├── "Configurar mi empresa" → flowCalificacionPost
                      ├── "Agendar demo" → link Calendly
                      └── "Seguir probando" → uso libre
```

---

## 3. Implementación paso a paso

### Paso 1 — Servicio A/B test (`abTestService.js`)

```
src/services/abTestService.js
```

**Responsabilidades:**
- `getVariante(phone)` → retorna `'A'` o `'B'` determinísticamente
- `registrarVariante(phone, variante)` → guarda en lead y ContactoSDR el campo `varianteAB`
- `getEstadisticasAB()` → query de MongoDB para dashboard (contactos, activaciones, demos por variante)

**Campos a agregar:**
- En `Lead` (Firestore): `varianteAB: 'A' | 'B'`
- En `ContactoSDR` (MongoDB): `varianteAB: 'A' | 'B'`

**Dependencias:** `leadService.actualizarLead`, `sincronizarLeadConContactoSDR`

---

### Paso 2 — Servicio de empresa demo (`empresaDemoService.js`)

```
src/services/empresaDemoService.js
```

**Responsabilidades:**
- Mantiene un pool de `POOL_SIZE` (2) empresas demo pre-creadas y disponibles en MongoDB (`EmpresaDemo`)
- `crearEmpresaDemoCompleta()` → crea empresa en Firestore con `esDemo: true`, perfil placeholder, proyecto "Obra Demo", 4 movimientos y 2 presupuestos indexados por CAC
- Al asignar una demo a un usuario, se la marca como `estado: 'asignada'` y se repone el pool en background
- Script de mantenimiento: `scripts/regenerar-pool-demos.js` — borra solo demos `disponibles` y repone el pool

**Nota:** Se implementó como `empresaDemoService.js` (no `demoAccountService.js` como se planeaba). El campo demo en Firestore es `esDemo: true` al crear; cuando el usuario configura su empresa real se actualiza con `empresa_demo: false` vía `updateEmpresaDetails`.

---

### Paso 3 — Modificar `flowInicioGeneral.js`

**Cambio principal:** Después de crear el contacto y antes de enviar el menú, evaluar variante.

**Pseudo-código del cambio:**

```js
// En el primer .addAction (línea ~22)
const { getVariante, registrarVariante } = require('../../src/services/abTestService');

// ... código existente de crear lead, sincronizar contacto SDR ...

const variante = getVariante(phone);
await registrarVariante(phone, variante);
await addEvent(phone, 'ab_test_asignado', null, { variante });

if (variante === 'B') {
    return await gotoFlow(flowActivacionDirecta);
}

// Variante A: flujo actual sin cambios
await sendSafe(ctx, MENU_MESSAGE);
await state.update({ last_msg: MENU_PROMPT });
```

**Detección de keywords (ambas variantes):** Agregar antes del split:

```js
const input = ctx.body?.toLowerCase() || '';
if (/ya tengo cuenta|mi cuenta|no puedo entrar/.test(input)) {
    return await gotoFlow(flowOnboardingUsuariosExistentes);
}
if (/hablar con|humano|representante|llamar/.test(input)) {
    await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'humano' });
    await notify(`📞 ${phone} pidió hablar con un humano.`);
    await sendSafe(ctx, '🤝 Alguien de nuestro equipo te va a contactar.');
    // Enviar Calendly
    await sendSafe(ctx, '📅 Si preferís, podés agendar directamente acá:\n[link Calendly]');
    return;
}
```

---

### Paso 4 — Crear `flowActivacionDirecta.js`

```
flows/onboardingFlows/flowActivacionDirecta.js
```

**Estructura del flujo:**

```
Step 1: Crear cuenta demo + enviar mensaje de activación
    "Hola 👋 Soy Sorby... Probá escribir: Compré cemento por 120000"

Step 2: Capturar respuesta del usuario
    → Si escribe un gasto → registrarlo normalmente (el engine existente lo procesa)
    → Si escribe otra cosa → reintentar con ejemplo más concreto
    → Si no responde en 5min → enviar fallback con opciones

Step 3: Post primer gasto
    "Registré el gasto: 📂 Obra Demo 💰 $120.000 🏷 Materiales"
    "Ahora probá pedir un resumen: resumen de gastos"

Step 4: Post resumen (o skip)
    "¿Querés configurarlo para tus obras reales?
     1️⃣ Sí, configurar mi empresa
     2️⃣ Agendar demo de 20 min
     3️⃣ Seguir probando"

Step 5: Capturar elección post-activación
    → 1: gotoFlow(flowCalificacionPost)
    → 2: enviar link Calendly + addEvent('activacion_directa_pidio_demo')
    → 3: mensaje de uso libre + addEvent('activacion_directa_sigue_probando')
```

**Consideraciones técnicas:**
- No usar `⏳ Analizando` — usar `await provider.sendPresenceUpdate(phone)` (typing nativo)
- El registro del gasto lo maneja el engine existente de movimientos — el flujo solo necesita detectar que se creó un movimiento y mostrar el resultado
- Usar `sendButtons` para las opciones post-activación (max 3 botones)

**Eventos a disparar:**

| Momento | Evento |
|---------|--------|
| Al entrar al flujo | `activacion_directa_inicio` |
| Al crear empresa demo | `activacion_directa_empresa_demo_creada` |
| Al registrar primer gasto | `activacion_directa_primer_gasto` |
| Al pedir resumen | `activacion_directa_pidio_resumen` |
| Al elegir configurar | `activacion_directa_pidio_configurar` |
| Al elegir demo | `activacion_directa_pidio_demo` |
| Al elegir seguir probando | `activacion_directa_sigue_probando` |

---

### Paso 5 — Crear `flowCargarObras.js` (reemplaza `flowCalificacionPost.js`)

```
flows/onboardingFlows/flowCargarObras.js
```

En vez del `flowCalificacionPost.js` planeado (que eliminaba la demo), se implementó `flowCargarObras.js` que **renombra** la empresa demo y la convierte en real sin borrar historial:

```
Step 1: "¿Cuál es el nombre de tu empresa?"
    → capturar nombre

Step 2: "¿Cómo se llaman tus obras? (separadas por coma)"
    → capturar lista, guardar en state

Step 3: Mostrar resumen para confirmación
    → [Confirmar] / [Modificar obras]
    → Si modifica: fallBack() al step 2

Step 4 (confirmado): Crear en DB
    → updateEmpresaDetails({ nombre, empresa_demo: false, onboarding: [] })
    → crearProyecto() por cada obra
    → notificarCambioCache()
    → Mostrar sendListMenu con 6 opciones de activación avanzada
       (todas llevan a agendar reunión con soporte)
```

**Diferencia vs. plan original:**
- No borra ni reemplaza la empresa demo
- Incluye paso de confirmación antes de guardar
- No pregunta "cuántas obras" — directamente pide los nombres
- Ofrece 6 funcionalidades activables post-configuración vía `sendListMenu`

---

### Paso 6 — Auto-agenda Calendly (ambas variantes)

**Dónde:** En `flowOnboardingConstructora.js` (y en el nuevo `flowActivacionDirecta.js`), cuando el asistente GPT o el flujo detecta `quiere_meet`.

**Implementación:**

```js
// Cuando se detecta intención de reunión
await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'demo' });
await addEvent(phone, 'activacion_directa_autoagenda_enviada');
await sendSafe(ctx, '📅 ¡Perfecto! Podés agendar una demo de 20 min directamente acá:\n' + CALENDLY_LINK);
await sendSafe(ctx, 'Si preferís, también podés seguir probando y agendar después.');
```

**Config:** `CALENDLY_LINK` como variable de entorno o constante en config.

---

### Paso 7 — Alerta push al SDR (ambas variantes)

**Cuándo disparar:**
- Variante B: cuando el usuario completa el primer gasto demo
- Variante A: cuando se completa el onboarding (ya existe parcialmente)
- Ambas: cuando se detecta `quiere_meet`

**Implementación:** Reutilizar `notify()` existente con mensaje enriquecido:

```js
await notify(
    `🔥 Lead activado (variante ${variante})\n` +
    `📱 ${phone} — ${nombre}\n` +
    `✅ Registró primer gasto demo\n` +
    `🤖 Precalificación: ${precalificacion}\n` +
    `→ Contactar en las próximas 2 horas`
);
```

---

## 4. Timeline

### Semana 1 — Infraestructura + Variante B básica

| Día | Tarea | Archivos |
|-----|-------|----------|
| L | Crear `abTestService.js` + agregar campo `varianteAB` a ContactoSDR y Lead | `abTestService.js`, modelo ContactoSDR |
| L | Crear `demoAccountService.js` (wrapper de `onboardingCreaInicioConstructora` con flag demo) | `demoAccountService.js` |
| M | Crear `flowActivacionDirecta.js` — steps 1-2 (mensaje de activación + captura de gasto) | `flowActivacionDirecta.js` |
| M | Modificar `flowInicioGeneral.js` — split A/B + detección keywords | `flowInicioGeneral.js` |
| X | Completar `flowActivacionDirecta.js` — steps 3-5 (post-gasto, opciones, routing) | `flowActivacionDirecta.js` |
| X | Implementar typing nativo (`presenceUpdate`) en vez de "⏳ Analizando" para variante B | `flowActivacionDirecta.js` |
| J | Crear `flowCalificacionPost.js` (calificación simplificada post-activación) | `flowCalificacionPost.js` |
| J | Agregar auto-agenda Calendly en detección de `quiere_meet` (ambas variantes) | `flowOnboardingConstructora.js`, `flowActivacionDirecta.js` |
| V | Agregar alerta push al SDR para leads activados | `flowActivacionDirecta.js`, `flowOnboardingConstructora.js` |
| V | Testing interno: probar ambas variantes end-to-end con números de prueba | — |

### Semana 2 — Lanzamiento + monitoreo

| Día | Tarea |
|-----|-------|
| L | Deploy a producción con A/B activo |
| L | Verificar que el split funciona (primeros 10 contactos caen ~50/50) |
| M-V | Monitoreo diario: revisar eventos, detectar errores, ajustar copy si es necesario |
| V | Primer corte parcial (~35 contactos por variante): revisar métricas |

### Semana 3 — Ajustes + segundo corte

| Día | Tarea |
|-----|-------|
| L-X | Fix de bugs detectados en semana 2 |
| X | Implementar mejoras de Fase 2 si la variante B va bien: fix "No encontramos proyectos", detección señales de compra |
| V | Segundo corte (~70 contactos por variante): decisión de continuar o pivotar |

### Semana 4 — Cierre del A/B

| Día | Tarea |
|-----|-------|
| L-X | Alcanzar ~100 contactos por variante |
| J | Análisis final del A/B |
| V | Decisión: escalar variante B al 100% o iterar |

---

## 5. Métricas del A/B test

### 5.1 Eventos a comparar entre variantes

| Evento | Variante A (esperado) | Variante B (objetivo) |
|--------|----------------------|----------------------|
| Segundo mensaje enviado | ~69% | ≥ 80% |
| Empresa creada | ~34% | ~100% (auto) |
| Primer movimiento registrado | ~12% | ≥ 25% |
| Demo agendada | dato a medir | +100% vs A |
| Tiempo al primer movimiento | dato a medir | < 2 min |
| Contactos en estado "nuevo" después de 48h | ~57% | < 30% |

### 5.2 Query para dashboard

```js
// Pipeline de MongoDB para comparar variantes
db.contactosdrs.aggregate([
    { $match: { segmento: 'inbound', varianteAB: { $exists: true } } },
    { $group: {
        _id: '$varianteAB',
        total: { $sum: 1 },
        calificados: { $sum: { $cond: [{ $ne: ['$precalificacionBot', 'sin_calificar'] }, 1, 0] } },
        quiereMeet: { $sum: { $cond: [{ $eq: ['$precalificacionBot', 'quiere_meet'] }, 1, 0] } },
        enNuevo: { $sum: { $cond: [{ $eq: ['$estado', 'nuevo'] }, 1, 0] } },
        conReunion: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$reuniones', []] } }, 0] }, 1, 0] } },
    }},
]);
```

Los eventos detallados (primer gasto, pidió resumen, etc.) se cruzan desde `eventohistorialsdrs` agrupando por `varianteAB` del contacto.

### 5.3 Criterios de decisión

| Resultado | Acción |
|-----------|--------|
| B ≥ 20% primer movimiento Y B > A en demos agendadas | **Escalar B al 100%**. Eliminar variante A. |
| B entre 12-20% primer movimiento | **Iterar**. Ajustar copy, timing, guía. Extender A/B 2 semanas. |
| B < 12% primer movimiento (igual o peor que A) | **Pausar B**. Investigar por qué. Revisar extractos de conversaciones de variante B. |
| B tiene primer movimiento alto pero menos demos que A | **Iterar el paso 4** (opciones post-activación). El bot activa pero no convierte a demo. |

---

## 6. Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| El engine de movimientos no procesa el gasto en contexto de cuenta demo | Alto | Testear con cuenta demo antes del deploy. Verificar que `onboardingCreaInicioConstructora` crea todo lo necesario para que el engine funcione. |
| El `gotoFlow` a `flowActivacionDirecta` rompe el state del builderbot | Alto | Testear el transition exhaustivamente. Guardar `last_msg` y variables críticas en state antes del goto. |
| La asignación por hash no da 50/50 exacto | Bajo | Con 100+ contactos converge. Monitorear en el primer corte. Si está muy desbalanceado (>60/40), ajustar el hash. |
| Crear empresa demo falla silenciosamente | Medio | Wrappear `crearCuentaDemo` en try/catch. Si falla, fallback a variante A (enviar menú). Loguear el error. |
| El usuario escribe algo que no es un gasto y el bot no sabe qué hacer | Medio | Detección por keywords: si no matchea con gasto/resumen/opción, responder con ejemplo más concreto. Después de 2 intentos fallidos, ofrecer menú de opciones. |
| Usuarios de variante B que regresan días después empiezan de cero | Bajo | Detectar si ya tienen empresa demo y retomar desde donde quedaron (verificar si ya hicieron primer movimiento). |

---

## 7. Checklist pre-deploy

- [x] `abTestService.js` implementado con balanceo dinámico
- [x] `empresaDemoService.js` — pool de 2 demos, presupuestos con CAC, script `regenerar-pool-demos.js`
- [x] `flowActivacionDirecta.js` completo — pasos demo guiados con `esperaAccion` en sugerenciaIngreso/Presupuesto
- [x] `flowCargarObras.js` — renombra empresa, crea obras con confirmación, menú 6 funcionalidades avanzadas
- [x] `flowInicioGeneral.js` modificado — split A/B activo, keywords detectados
- [x] `sendButtonUrl()` en `sendSafe.js` — botón CTA con URL
- [x] `demoHelper.js` — helper centralizado para pasos demo y botones
- [x] Auto-agenda Calendly en `agendar_demo` con follow-up de 5 min
- [x] Scheduler soporta campo `buttons` para mensajes programados interactivos
- [x] `sugerenciaLinkWeb` — mensaje + botón CTA en un solo envío
- [x] Campo `varianteAB` se guarda en `ContactoSDR`
- [x] Probado end-to-end variante A: flujo actual intacto
- [x] Probado end-to-end variante B: activación → gasto → sugerencias → cargar obras → menú avanzado
- [ ] Typing nativo (`presenceUpdate`) en variante B
- [ ] Alerta push al SDR con datos enriquecidos para leads activados
- [ ] Dashboard `/abTestContactActivation` completo con gráfico de evolución
- [ ] Limpieza automática de empresas demo inactivas (ver Sección 15 del funcional)
