# Plan de Implementación — Activación & Retención

> **Diseñado para:** Agentes de programación Claude Opus 4.6  
> **Fecha:** 24 de febrero de 2026  
> **Autor:** Federico Maidan  
> **Documentos de referencia:**
> - `app-web/docs/ACTIVACION_RETENCION_FUNCIONAL.md` — Requisitos funcionales
> - `app-web/docs/ACTIVACION_RETENCION_TECNICO.md` — Diseño técnico

---

## Convenciones del Proyecto (leer antes de cada ticket)

> **⚠️ Estado de implementación (Febrero 2026):**  
> Todas las Olas 1, 2 y 3 están **✅ implementadas** (53 tests pasando, 5 suites).  
> Además se implementaron funcionalidades adicionales no previstas en los tickets originales:
> - **Progreso por WhatsApp:** `_enviarProgresoAlUsuario` envía notificación tras cada paso completado
> - **Comando "mi progreso":** `VER_MI_PROGRESO` en el bot permite al usuario ver su avance
> - **Endpoint progreso:** `GET /onboarding/:profileId/progreso` con datos formateados
> - **OnboardingProgress:** Componente React integrado en cajaSimple y cajaProyecto
> - **Creación automática:** `onboardingCreaInicio` crea onboarding + cadena + envía bienvenida (fire-and-forget)
> - **Alertas reales:** `onTransicion` envía alertas WA reales al grupo CS (no solo logging)
> - **Resumen mensual:** `getResumenMensual` con ventana rolling 30 días (no getResumenSemanal)

### Stack y dependencias

| Componente | Versión/Detalle |
|-----------|----------------|
| Runtime | Node.js |
| API | Express 4.19 |
| ODM | Mongoose 8.19 |
| Firebase | firebase-admin 12 (Firestore + Auth) |
| Bot WA | @builderbot/bot (archivo .tgz local) + provider-baileys |
| Fechas | dayjs 1.11 |
| Testing | Jest 30.2 + mongodb-memory-server 10.2 + supertest 7.1 |
| Schedulers | setTimeout/setInterval recursivo (NO node-cron) |

### Patrones obligatorios

**Modelos Mongoose:**
```javascript
const mongoose = require('mongoose');
const schema = new mongoose.Schema({ /* ... */ }, { timestamps: true, collection: 'nombre_coleccion' });
const Model = mongoose.models.NombreModelo || mongoose.model('NombreModelo', schema);
module.exports = Model;
```

**Servicios:** Funciones exportadas individuales (NO clases). Excepción: `analyticsService` usa clase estática.
```javascript
async function miFuncion(param) {
  try {
    // lógica
  } catch (error) {
    console.error('[MiServicio] Error en miFuncion:', error);
    return null; // o false, nunca propagar
  }
}
module.exports = { miFuncion };
```

**Hooks fire-and-forget:**
```javascript
try {
  const { miHook } = require('../ruta/servicio');
  miHook(datos);
} catch (_) { /* no bloquear */ }
```

**Rutas Express:**
```javascript
const router = require('express').Router();
const { authenticate } = require('../../utils/firebaseUtils');
router.use(authenticate);
router.get('/ruta', controller.metodo);
module.exports = router;
```

**Tests:**
```javascript
const { setupDB, teardownDB, clearDB } = require('../setupMongo');
beforeAll(async () => await setupDB(), 30000);
afterAll(async () => await teardownDB(), 15000);
afterEach(async () => await clearDB());
```

**Logging:** Prefijo `[NombreServicio]` + emojis (✅ ❌ 📦 ⚠️).

**Schedulers:** `setInterval` con guard anti-solapamiento + feature flag:
```javascript
let isRunning = false;
async function ejecutar() {
  if (isRunning) return;
  isRunning = true;
  try { /* lógica */ } catch (e) { console.error(e); }
  finally { isRunning = false; }
}
function start() { setInterval(ejecutar, INTERVALO_MS); }
```

### Archivos clave de referencia

| Archivo | Qué mirar |
|---------|----------|
| `backend/src/models/OnboardingCliente.js` | Patrón de modelo con sub-documentos Map |
| `backend/src/services/onboardingClienteService.js` | Patrón de servicio completo (577 líneas) |
| `backend/utils/dataService.js` | Dónde inyectar hooks (L508, L657, L705) |
| `backend/src/routes/index.js` | Router principal (1143 líneas), cómo montar sub-routers |
| `backend/src/services/analyticsService.js` | Clase estática con métodos de métricas (597 líneas) |
| `backend/src/services/FollowUpServices/followUpService.js` | Motor de cadenas de eventos |
| `backend/src/services/mensajesProgramadosScheduler.js` | Patrón de scheduler con setInterval |
| `backend/app.js` | Dónde arrancan schedulers (L515-518) |
| `backend/test/unit/leadContactoBridge.test.js` | Patrón de test unitario |

---

## Estructura de Olas

> **Todas las olas están ✅ completadas.** 53 tests pasando en 5 suites.

```
OLA 1 — Fundamentos ✅ (Tickets 1.1 → 1.8)
  ├── 1.1  ✅ Métodos de métricas en analyticsService
  ├── 1.2  ✅ Modelo EstadoSaludEmpresa
  ├── 1.3  ✅ estadoSaludService (con alertas WA reales)
  ├── 1.4  ✅ Scheduler de estado de salud
  ├── 1.5  ✅ reporteInternoService
  ├── 1.6  ✅ Rutas API onboarding + estadoSalud
  ├── 1.7  ✅ Hook de acceso web (caja + notas + acopio)
  └── 1.8  ✅ Tests unitarios Ola 1

OLA 2 — Calidad WA + Automatizaciones ✅ (Tickets 2.1 → 2.9)
  ├── 2.1  ✅ Modelo FlowSession
  ├── 2.2  ✅ flowSessionService
  ├── 2.3  ✅ Hooks en flujos del bot
  ├── 2.4  ✅ Scheduler cerrar sesiones abandonadas
  ├── 2.5  ✅ Modelo CadenaPostVenta
  ├── 2.6  ✅ Cadena post-venta (auto-creada desde onboardingCreaInicio)
  ├── 2.7  ✅ nudgeService
  ├── 2.8  ✅ Rutas API sesiones + métricas
  └── 2.9  ✅ Tests unitarios Ola 2

OLA 3 — Expansión y Valor ✅ (Tickets 3.1 → 3.6)
  ├── 3.1  ✅ Módulos onboarding: Nota Pedido + Acopio + TomaDecisión
  ├── 3.2  ✅ Score empresa multi-módulo ponderado
  ├── 3.3  ✅ Mensajes de valor al dueño (getResumenMensual 30d)
  ├── 3.4  ✅ Vista empresa en frontend (Panel CS)
  ├── 3.5  ✅ Dashboard matutino CS (frontend)
  └── 3.6  ✅ Tests integración E2E

EXTRAS (no previstos en tickets originales):
  ├── ✅ Progreso por WhatsApp (_enviarProgresoAlUsuario)
  ├── ✅ Comando "mi progreso" (VER_MI_PROGRESO)
  ├── ✅ Endpoint GET /onboarding/:profileId/progreso
  ├── ✅ OnboardingProgress componente React
  └── ✅ Creación automática onboarding+cadena+bienvenida
```

---

## OLA 1 — Fundamentos (✅ Completada)

---

### Ticket 1.1 — Métodos de métricas en analyticsService

**Objetivo:** Agregar 4 métodos estáticos a `analyticsService` que `estadoSaludService` necesita como fuentes de datos.

**Archivo a modificar:** `backend/src/services/analyticsService.js`

**Contexto:** La clase `AnalyticsService` ya tiene ~597 líneas con métodos estáticos (`getEmpresaStats`, `getMovimientosStats`, `getUsuariosStats`, etc.). Los datos de movimientos están en Firestore en `empresas/{empresaId}/movimientos`. Los perfiles están en `empresas/{empresaId}/profile`.

**Métodos a agregar:**

```javascript
/**
 * Cuenta movimientos de una empresa en los últimos N días.
 * @param {string} empresaId
 * @param {number} dias - default 7
 * @returns {Promise<number>} cantidad de movimientos
 */
static async getMovimientosCount(empresaId, dias = 7)

/**
 * Ratio de usuarios activos: usuarios que generaron al menos 1 movimiento
 * en los últimos 7 días / total de perfiles de la empresa.
 * @param {string} empresaId
 * @returns {Promise<number>} 0.0 a 1.0
 */
static async getRatioUsuariosActivos(empresaId)

/**
 * Días transcurridos desde el último movimiento de cualquier usuario.
 * Si no hay movimientos, retorna Infinity.
 * @param {string} empresaId
 * @returns {Promise<number>}
 */
static async getDiasSinUso(empresaId)

/**
 * Resumen semanal para mensajes de valor al dueño.
 * @param {string} empresaId
 * @returns {Promise<{cantGastos: number, totalGastos: number, cantIngresos: number, totalIngresos: number}>}
 */
static async getResumenSemanal(empresaId)
```

**Instrucciones:**
1. Leer el archivo completo para entender cómo se accede a Firestore (buscar `db.collection` o `admin.firestore()`).
2. Los movimientos en Firestore tienen campos: `fecha` (string o Timestamp), `total` (number), `tipo` ('egreso'|'ingreso'), `profileId` (string), `proyectoId`, `createdAt`.
3. Para `getRatioUsuariosActivos`: obtener perfiles de `empresas/{id}/profile`, contar cuántos tienen movimientos en últimos 7 días.
4. Usar `dayjs` para cálculos de fecha (ya está importado en el archivo).
5. NO modificar métodos existentes.
6. Manejar errores con try/catch, retornar 0 o Infinity según corresponda.

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] 4 métodos estáticos agregados a la clase `AnalyticsService`
- [ ] Cada método tiene try/catch y no propaga excepciones
- [ ] Los métodos usan Firestore para leer movimientos (misma conexión que el resto del archivo)
- [ ] `getRatioUsuariosActivos` retorna un número entre 0.0 y 1.0
- [ ] `getDiasSinUso` retorna `Infinity` si no hay movimientos

---

### Ticket 1.2 — Modelo EstadoSaludEmpresa

**Objetivo:** Crear el modelo Mongoose para persistir el estado de salud de cada empresa.

**Archivo a crear:** `backend/src/models/EstadoSaludEmpresa.js`

**Modelo de referencia:** Leer `backend/src/models/OnboardingCliente.js` para el patrón.

**Schema:**

```javascript
{
  empresaId:         { type: String, required: true, unique: true, index: true },
  estado:            { type: String, enum: ['onboarding', 'activo', 'en_riesgo', 'inactivo', 'churneado'], default: 'onboarding' },
  estadoAnterior:    { type: String, enum: ['onboarding', 'activo', 'en_riesgo', 'inactivo', 'churneado', null], default: null },
  fechaCambioEstado: { type: Date, default: Date.now },
  metricas: {
    movimientosUltimos7d:  { type: Number, default: 0 },
    ratioUsuariosActivos:  { type: Number, default: 0 },   // 0.0 - 1.0
    diasSinUso:            { type: Number, default: 0 },
    ratioOnboardingPaso2:  { type: Number, default: 0 },   // 0.0 - 1.0
    scoreOnboarding:       { type: Number, default: 0 }    // 0.0 - 1.0
  },
  historial: [{
    estado:  String,
    fecha:   { type: Date, default: Date.now },
    motivo:  String    // ej: "ratioActivos < 0.3"
  }]
}
// timestamps: true, collection: 'estado_salud_empresa'
```

**Instrucciones:**
1. Seguir el patrón exacto de `OnboardingCliente.js`: schema separado, `mongoose.models.X || mongoose.model()`.
2. El campo `historial` es un array de sub-documentos sin `_id` (agregar `{ _id: false }` al sub-schema).
3. Índice único en `empresaId`.

**Dependencias:** Ninguna.

**Criterios de aceptación:**
- [ ] Archivo creado siguiendo el patrón del proyecto
- [ ] `collection: 'estado_salud_empresa'`
- [ ] Enum de estados: onboarding, activo, en_riesgo, inactivo, churneado
- [ ] El historial NO genera `_id` por cada entrada
- [ ] Export default del modelo

---

### Ticket 1.3 — estadoSaludService

> **✅ IMPLEMENTADO** — Nota: `onTransicion` envía alertas WA reales al grupo CS (variable `GRUPO_CS_PHONE`) para 3 transiciones: onboarding→en_riesgo, activo→en_riesgo, en_riesgo→inactivo. No usa logging temporal.

**Objetivo:** Crear el servicio que calcula el estado de salud de cada empresa, detecta transiciones y dispara acciones.

**Archivo a crear:** `backend/src/services/estadoSaludService.js`

**Dependencias:** Ticket 1.1 (analyticsService), Ticket 1.2 (modelo), `onboardingClienteService` existente.

**Funciones a implementar:**

```javascript
/**
 * Calcula el estado de una empresa a partir de sus métricas actuales.
 * 
 * Reglas (en orden):
 *   1. Si diasComoCliente < 30 → 'onboarding'
 *   2. Si diasSinUso > 30 → 'churneado'
 *   3. Si diasSinUso > 14 → 'inactivo'
 *   4. Si ratioUsuariosActivos < 0.3 O diasSinUso > 5 O ratioOnboardingPaso2 < 0.5 → 'en_riesgo'
 *   5. Si ratioUsuariosActivos >= 0.5 Y ratioOnboardingPaso2 >= 0.5 → 'activo'
 *   6. Default → 'en_riesgo'
 * 
 * @param {object} metricas - { movimientosUltimos7d, ratioUsuariosActivos, diasSinUso, ratioOnboardingPaso2, scoreOnboarding }
 * @param {number} diasComoCliente
 * @returns {string} estado
 */
function calcularEstado(metricas, diasComoCliente)

/**
 * Recopila métricas y calcula estado para UNA empresa.
 * - Lee métricas de analyticsService (getMovimientosCount, getRatioUsuariosActivos, getDiasSinUso)
 * - Lee métricas de onboardingClienteService (obtenerOnboardingsPorEmpresa → calcular ratioOnboardingPaso2 y scoreOnboarding)
 * - Lee diasComoCliente desde Firestore (empresa.fechaAlta o empresa.createdAt)
 * - Calcula estado con calcularEstado()
 * - Guarda en EstadoSaludEmpresa (upsert)
 * - Si cambió el estado → push a historial + dispara onTransicion()
 * - Sync estado a Firestore: empresas/{id}.estadoSalud = estado
 * @param {string} empresaId
 * @returns {Promise<{estado: string, cambio: boolean}>}
 */
async function actualizarEstadoEmpresa(empresaId)

/**
 * Recorre TODAS las empresas activas y actualiza su estado.
 * Lee lista de empresas desde Firestore (o usa analyticsService.getEmpresasLista()).
 * Procesa secuencialmente (no en paralelo) para no saturar.
 * @returns {Promise<{procesadas: number, cambios: number, errores: number}>}
 */
async function actualizarTodas()

/**
 * Obtener estado actual de una empresa.
 * @param {string} empresaId
 * @returns {Promise<object|null>} documento EstadoSaludEmpresa
 */
async function obtenerEstado(empresaId)

/**
 * Listar empresas filtradas por estado.
 * @param {string} estado - filtro opcional
 * @returns {Promise<array>}
 */
async function listarPorEstado(estado)

/**
 * Ejecuta acción según la transición de estado.
 * NO envía mensajes directamente — programa mensajes vía mensajesProgramadosScheduler.
 * 
 * Transiciones:
 *   onboarding→en_riesgo:  log + enviar alerta WA a grupo CS
 *   activo→en_riesgo:      log + enviar alerta WA a grupo CS
 *   en_riesgo→inactivo:    log + enviar alerta urgente a grupo CS
 *   inactivo→churneado:    log
 *   en_riesgo→activo:      log (recuperación)
 * 
 * Para enviar al grupo CS: usar el bot directamente con sendSafe o programar mensaje.
 * Ver cómo lo hace reporteInternoService.
 * 
 * @param {string} empresaId
 * @param {string} estadoAnterior
 * @param {string} estadoNuevo
 * @param {string} motivo
 */
async function onTransicion(empresaId, estadoAnterior, estadoNuevo, motivo)
```

**Instrucciones:**
1. Leer `onboardingClienteService.js` para entender cómo importar y usar otros servicios.
2. Para calcular `ratioOnboardingPaso2`: obtener todos los onboardings de la empresa → contar los que tienen al menos 2 pasos completados en algún módulo / total de onboardings.
3. Para `diasComoCliente`: leer `empresas/{empresaId}` de Firestore, campo `fechaAlta` o `createdAt` (usar dayjs para diff).
4. Usar `upsert` en MongoDB para que `actualizarEstadoEmpresa` cree o actualice.
5. `onTransicion` debe ser tolerante a fallos: try/catch, nunca propagar. La fase 1 puede loggear solamente; el envío real por WA se implementa en el ticket 1.5.
6. Exportar `calcularEstado` también para testing.

**Criterios de aceptación:**
- [ ] `calcularEstado` es función pura (sin I/O), exportada para testing
- [ ] `actualizarEstadoEmpresa` hace upsert y detecta cambio de estado
- [ ] Historial se acumula (push, no replace)
- [ ] `actualizarTodas` procesa secuencialmente con logging de progreso
- [ ] Estado se sincroniza a Firestore en `empresas/{id}`
- [ ] Errores nunca propagan, siempre se loggean con `[EstadoSalud]`

---

### Ticket 1.4 — Scheduler de Estado de Salud

**Objetivo:** Crear scheduler que ejecute `estadoSaludService.actualizarTodas()` todos los días a las 6am y registrarlo en el arranque de la app.

**Archivos a modificar:**
- Crear: `backend/src/services/estadoSaludScheduler.js`
- Modificar: `backend/app.js` (agregar arranque del scheduler)

**Dependencias:** Ticket 1.3

**Instrucciones:**

1. **Archivo `estadoSaludScheduler.js`:**

El proyecto NO usa `node-cron`. El patrón es `setInterval` + lógica de "hora fija":

```javascript
// Patrón para ejecución a hora fija con setInterval
const HORA_EJECUCION = 6; // 6am
const CHECK_INTERVAL_MS = 60 * 1000; // chequear cada 1 minuto

let ultimaEjecucion = null;
let isRunning = false;

async function check() {
  if (isRunning) return;
  const ahora = new Date();
  const hora = ahora.getHours();
  const hoy = ahora.toDateString();
  
  if (hora === HORA_EJECUCION && ultimaEjecucion !== hoy) {
    isRunning = true;
    ultimaEjecucion = hoy;
    try {
      console.log('[EstadoSaludScheduler] ⏰ Iniciando cálculo diario...');
      const resultado = await estadoSaludService.actualizarTodas();
      console.log(`[EstadoSaludScheduler] ✅ Completado: ${resultado.procesadas} empresas, ${resultado.cambios} cambios, ${resultado.errores} errores`);
    } catch (error) {
      console.error('[EstadoSaludScheduler] ❌ Error:', error);
    } finally {
      isRunning = false;
    }
  }
}

function startEstadoSaludScheduler() {
  console.log('[EstadoSaludScheduler] 📦 Scheduler iniciado, ejecución diaria a las 6am');
  setInterval(check, CHECK_INTERVAL_MS);
}
```

Export: `{ startEstadoSaludScheduler }`

2. **Modificar `app.js`:**
- Buscar la sección donde se inician schedulers (línea ~515-518, buscar `startFollowUpScheduler` y `startScheduler`).
- Agregar después:
```javascript
const { startEstadoSaludScheduler } = require('./src/services/estadoSaludScheduler');
if (process.env.SCHEDULER_ENABLED !== 'false') {
  startEstadoSaludScheduler();
}
```

**Criterios de aceptación:**
- [ ] Se ejecuta a las 6am hora local, una vez por día
- [ ] Guard anti-solapamiento (`isRunning`)
- [ ] Respeta feature flag `SCHEDULER_ENABLED`
- [ ] No ejecuta en la primera carga (espera a que sean las 6am)
- [ ] Logging claro con prefijo y emojis

---

### Ticket 1.5 — reporteInternoService

**Objetivo:** Crear servicio que genera y envía el reporte diario por WhatsApp al grupo interno de CS.

**Archivo a crear:** `backend/src/services/reporteInternoService.js`

**Dependencias:** Ticket 1.3 (estadoSaludService), Ticket 1.1 (analyticsService), `onboardingClienteService` existente.

**Funciones a implementar:**

```javascript
/**
 * Genera el contenido del reporte diario como texto plano (para WhatsApp).
 * 
 * Secciones del reporte:
 * 
 * 1. "🔴 EN RIESGO (N empresas)" — empresas con estado en_riesgo
 *    - Nombre, días sin uso, score, motivo principal
 * 
 * 2. "🟡 ONBOARDING LENTO (N empresas)" — empresas con estado onboarding
 *    cuyo score < 0.3 y llevan > 7 días como cliente
 *    - Nombre, día N de onboarding, score
 * 
 * 3. "✅ LOGROS" — transiciones positivas en las últimas 24h
 *    - Empresas que pasaron a activo
 *    - Usuarios que completaron onboarding de algún módulo
 * 
 * 4. "📌 PENDIENTES HOY" — acciones del día
 *    - Cantidad de nudges programados, meets, etc.
 *    (Placeholder hasta que exista el sistema de nudges)
 * 
 * @returns {Promise<string>} texto formateado para WhatsApp
 */
async function generarReporteDiario()

/**
 * Genera y envía el reporte al grupo de WhatsApp del equipo CS.
 * 
 * El número de grupo CS debe leerse de env: GRUPO_CS_PHONE
 * Usar el bot para enviar: buscar patrón en el codebase donde se envía
 * un mensaje a un grupo (probablemente via provider.sendMessage o sendSafe).
 * 
 * Alternativa: programar como mensaje programado via mensajesProgramadosScheduler.
 * 
 * @returns {Promise<boolean>} true si se envió correctamente
 */
async function enviarReporteDiario()
```

**Instrucciones:**
1. Buscar en el codebase cómo se envían mensajes al grupo interno (buscar `sendMessage` + `@g.us` o `grupo`). El bot de WhatsApp tiene una función `sendSafe` global o se accede via el provider.
2. El formato del reporte debe ser WhatsApp-friendly: emojis, bullet points con `•`, sin markdown.
3. Si no se encuentra patrón de envío a grupo, dejarlo como TODO con un `console.log` del contenido y retornar true.
4. Las transiciones de las últimas 24h se leen del historial de `EstadoSaludEmpresa` (campo `historial` con `fecha`).
5. Para saber el nombre de cada empresa: leer de Firestore `empresas/{id}.nombre` o `empresas/{id}.empresa`.

**Scheduler asociado:** Crear `backend/src/services/reporteInternoScheduler.js` con el mismo patrón del ticket 1.4 pero a las 9am. Registrar en `app.js`.

**Criterios de aceptación:**
- [ ] `generarReporteDiario()` retorna string con las 4 secciones
- [ ] Si una sección está vacía, dice "Ninguna" o similar, no la omite
- [ ] Scheduler a las 9am con guard anti-solapamiento
- [ ] Si falla el envío, loggea pero no crashea
- [ ] Registrado en `app.js` con feature flag

---

### Ticket 1.6 — Rutas API Onboarding + Estado de Salud

**Objetivo:** Crear rutas REST para que el frontend consuma datos de onboarding y estado de salud.

**Archivos a crear:**
- `backend/src/routes/onboardingRoutes.js`
- `backend/src/routes/estadoSaludRoutes.js`

**Archivo a modificar:** `backend/src/routes/index.js` (montar sub-routers)

**Dependencias:** Tickets 1.2 + 1.3 + `onboardingClienteService` existente.

**Instrucciones:**

1. **Leer `backend/src/routes/index.js`** para ver cómo se montan los sub-routers existentes (buscar `router.use`). El patrón es:
```javascript
const miRouter = require('./miRouter');
router.use('/mi-ruta', miRouter);
```

2. **Leer una ruta existente** (ej: `backend/src/routes/sdrRoutes.js` o `analyticsRoutes.js`) para copiar el patrón exacto con `authenticate` middleware.

3. **onboardingRoutes.js:**

| Método | Ruta | Handler |
|--------|------|---------|
| GET | `/` | Listar onboardings de la empresa del usuario autenticado |
| GET | `/:profileId` | Onboarding individual |
| GET | `/resumen` | Resumen con scores por módulo (para panel CS) |
| POST | `/:profileId/paso` | Registrar paso manual (body: `{modulo, paso}`) |
| POST | `/recalcular` | Forzar recálculo de scores de toda la empresa |

> **Nota sobre empresaId:** El middleware `authenticate` decodifica el token Firebase y pone `req.user` con el UID. Para obtener `empresaId`, buscar en el codebase cómo otras rutas lo obtienen (probablemente de un perfil en Firestore vinculado al UID, o de `req.query.empresaId`).

4. **estadoSaludRoutes.js:**

| Método | Ruta | Handler |
|--------|------|---------|
| GET | `/` | Listar todas las empresas con filtro `?estado=en_riesgo` |
| GET | `/:empresaId` | Estado actual de una empresa |
| GET | `/:empresaId/historial` | Historial de cambios |
| POST | `/recalcular` | Forzar recálculo de todas (admin) |
| POST | `/:empresaId/recalcular` | Forzar recálculo de una |

5. **Montar en index.js:**
```javascript
router.use('/onboarding', onboardingRoutes);
router.use('/salud', estadoSaludRoutes);
```

**Criterios de aceptación:**
- [ ] Ambos routers usan `authenticate` middleware
- [ ] Responses siguen el patrón del proyecto: `res.json({ success: true, data: ... })` o similar (verificar patrón en rutas existentes)
- [ ] Errores retornan `res.status(500).json({ error: ... })`
- [ ] Montados en `index.js` bajo `/onboarding` y `/salud`

---

### Ticket 1.7 — Hook de acceso web (onboarding)

> **✅ IMPLEMENTADO** — Nota: `useTrackPrimeraVisita` insertado en 3 páginas: cajaSimple (`caja`), notaPedido (`notaPedido`) y acopios (`acopio`). Usa localStorage como cache.

**Objetivo:** Detectar cuando un usuario accede por primera vez a una sección de la web y registrar el paso correspondiente en su onboarding.

**Archivos a modificar:**
- `app-web/src/hooks/` — crear custom hook o integrar en hook existente
- Posiblemente `app-web/src/layouts/` o `app-web/src/guards/`

**Dependencias:** API endpoint de ticket 1.6 (`POST /api/onboarding/:profileId/paso`)

**Instrucciones:**

1. **Investigar el frontend** antes de implementar:
   - Leer `app-web/src/` para entender la estructura Next.js
   - Buscar cómo se identifica al usuario autenticado (probablemente un contexto de Firebase Auth)
   - Buscar si ya existe un hook `useAuth` o `useFirebaseUser` o similar
   - Buscar cómo se hace el `empresaId` disponible en el frontend
   - Buscar qué layout envuelve las páginas de caja, notas, acopios

2. **Enfoque recomendado:** Crear un hook `useTrackPrimeraVisita(seccion)` que:
   - Se ejecuta en el mount de la página
   - Verifica en `localStorage` si ya trackeó esta sección para este usuario (para no llamar a la API cada vez)
   - Si es primera vez: llama a `POST /api/onboarding/:profileId/paso` con `{modulo, paso: 'accederWeb'}`
   - Guarda flag en localStorage
   - Es fire-and-forget: no bloquea la UI

3. **Dónde insertarlo:**
   - En la página o layout de `/caja` → `useTrackPrimeraVisita('caja')`
   - En la página de `/notas` → `useTrackPrimeraVisita('notaPedido')`
   - En la página de `/acopios` → `useTrackPrimeraVisita('acopio')`

4. **Pasos de tomaDecision del dueño** (futuros, diseñar pero no implementar aún):
   - `verCaja`: al cargar la página de caja
   - `crearFiltro`: al aplicar un filtro
   - `crearReporte`: al abrir reportes
   - `exportarPDF`: al exportar

**Criterios de aceptación:**
- [ ] Hook creado y reutilizable
- [ ] Usa localStorage como cache para no spamear la API
- [ ] Funciona con el sistema de auth existente del frontend
- [ ] Insertado en al menos la página de caja
- [ ] Fire-and-forget: errores de API no afectan la UI

---

### Ticket 1.8 — Tests unitarios Ola 1

**Objetivo:** Tests para los componentes de la Ola 1.

**Archivos a crear:**
- `backend/test/unit/estadoSalud.test.js`
- `backend/test/unit/onboardingCliente.test.js` (si no existe)

**Dependencias:** Tickets 1.1, 1.2, 1.3

**Tests requeridos:**

**estadoSalud.test.js:**
```
describe('calcularEstado')
  ✓ retorna onboarding si diasComoCliente < 30
  ✓ retorna churneado si diasSinUso > 30
  ✓ retorna inactivo si diasSinUso > 14
  ✓ retorna en_riesgo si ratioActivos < 0.3
  ✓ retorna en_riesgo si diasSinUso > 5
  ✓ retorna en_riesgo si ratioOnboardingPaso2 < 0.5
  ✓ retorna activo si ratioActivos >= 0.5 y ratioOnboarding >= 0.5
  ✓ default es en_riesgo
  ✓ prioridad: onboarding gana sobre todo si < 30 días

describe('actualizarEstadoEmpresa') [usa MongoMemoryServer]
  ✓ crea documento si no existía (upsert)
  ✓ actualiza documento existente
  ✓ detecta transición y agrega al historial
  ✓ no agrega al historial si el estado no cambió
```

**onboardingCliente.test.js:**
```
describe('registrarPaso')
  ✓ marca paso como completado
  ✓ es idempotente: no cambia si ya estaba completado
  ✓ recalcula score del módulo correctamente

describe('recalcularScoreEmpresa')
  ✓ promedia scores de todos los usuarios
```

**Instrucciones:**
1. Seguir exactamente el patrón de `backend/test/unit/leadContactoBridge.test.js`
2. Importar `calcularEstado` directamente (es función pura, no necesita DB)
3. Para tests con DB: usar `setupDB/teardownDB/clearDB`
4. Mock de servicios externos (Firestore) si es necesario

**Criterios de aceptación:**
- [ ] Todos los tests pasan con `npm test`
- [ ] `calcularEstado` tiene cobertura completa de las 6 reglas
- [ ] Tests de integración usan MongoMemoryServer
- [ ] No hay dependencias de datos externos (Firestore mockeado)

---

## OLA 2 — Calidad WA + Automatizaciones (✅ Completada)

---

### Ticket 2.1 — Modelo FlowSession

**Objetivo:** Crear modelo Mongoose para registrar sesiones de interacción en WhatsApp.

**Archivo a crear:** `backend/src/models/FlowSession.js`

**Schema:**

```javascript
const CorreccionSchema = new mongoose.Schema({
  campo:     { type: String, required: true },     // 'categoría', 'total', 'proveedor'
  tipo:      { type: String, enum: ['voluntaria', 'forzada'], default: 'voluntaria' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const FlowSessionSchema = new mongoose.Schema({
  empresaId:    { type: String, required: true },
  profileId:    { type: String, required: true },
  phone:        { type: String, required: true },
  flujo:        { type: String, required: true },  // 'crearEgreso', 'crearIngreso', 'editarMovimiento', etc.
  estado:       { type: String, enum: ['en_curso', 'completado', 'cancelado', 'abandonado', 'error'], default: 'en_curso' },
  origenInput:  { type: String, enum: ['foto', 'audio', 'texto', 'documento', 'mixto'], default: 'texto' },
  iniciadoEn:   { type: Date, default: Date.now },
  finalizadoEn: { type: Date, default: null },
  duracionMs:   { type: Number, default: null },
  correcciones:       [CorreccionSchema],
  totalCorrecciones:  { type: Number, default: 0 },
  metadata: {
    flowName:      String,   // nombre técnico del flow de @builderbot
    movimientoId:  String,   // ID del movimiento resultante
    error:         String    // descripción del error
  }
}, { timestamps: true, collection: 'flow_sessions' });
```

**Índices:**
```javascript
FlowSessionSchema.index({ empresaId: 1, profileId: 1, iniciadoEn: -1 });
FlowSessionSchema.index({ empresaId: 1, flujo: 1, estado: 1 });
FlowSessionSchema.index({ estado: 1, iniciadoEn: 1 });  // para cron de abandonadas
```

**Criterios de aceptación:**
- [ ] Patrón `mongoose.models.X || mongoose.model()`
- [ ] 3 índices definidos
- [ ] Correcciones sin `_id`
- [ ] `collection: 'flow_sessions'`

---

### Ticket 2.2 — flowSessionService

**Objetivo:** Servicio completo para gestión de sesiones de flujo WhatsApp con métricas.

**Archivo a crear:** `backend/src/services/flowSessionService.js`

**Dependencias:** Ticket 2.1 (modelo)

**Funciones:**

```javascript
async function iniciarSesion({ empresaId, profileId, phone, flujo, origenInput, flowName })
  // Crea doc FlowSession en estado 'en_curso'. Retorna el _id de la sesión.

async function registrarCorreccion(sessionId, campo, tipo = 'voluntaria')
  // Push corrección al array + incrementa totalCorrecciones.
  // Retorna true/false.

async function finalizarSesion(sessionId, estado, metadata = {})
  // Setea estado, finalizadoEn, calcula duracionMs.
  // Solo si estado actual es 'en_curso'. Retorna true/false.

async function cerrarAbandonadas(timeoutMinutos = 30)
  // Busca sesiones en_curso con iniciadoEn > timeoutMinutos ago.
  // Las marca como 'abandonado'. Retorna cantidad cerradas.

async function obtenerMetricasUsuario(empresaId, profileId, diasAtras = 30)
  // Retorna: { tasaExito, correccionesPromedio, tiempoPromedioMs, totalSesiones, abandonadas }

async function obtenerMetricasEmpresa(empresaId, diasAtras = 30)
  // Retorna: métricas promedio de todos los usuarios + ranking de usuarios

async function obtenerMetricasPorFlujo(diasAtras = 30)
  // Para producto: por cada flujo → tasa éxito, correcciones promedio, campos más corregidos

async function obtenerSesiones(empresaId, { profileId, flujo, estado, limit = 50, skip = 0 })
  // Listado paginado con filtros opcionales
```

**Instrucciones para métricas:**
```javascript
// tasaExito = completados / total (excluyendo en_curso)
// correccionesPromedio = sum(totalCorrecciones de completadas) / completadas.length
// tiempoPromedioMs = sum(duracionMs de completadas) / completadas.length
// campos más corregidos = aggregation pipeline groupBy campo
```

**Criterios de aceptación:**
- [ ] `iniciarSesion` retorna `_id` como string
- [ ] `finalizarSesion` es idempotente: no hace nada si ya está finalizada
- [ ] `cerrarAbandonadas` solo toca sesiones `en_curso`
- [ ] Métricas usan aggregation pipeline de MongoDB (no cargar todos los docs en memoria)
- [ ] Errores loggeados con `[FlowSession]`, nunca propagan

---

### Ticket 2.3 — Hooks de FlowSession en flujos del bot

**Objetivo:** Inyectar inicio/corrección/finalización de sesiones en los flujos existentes del bot.

**Archivos a modificar:** Flujos del bot en `backend/flows/`

**Dependencias:** Ticket 2.2 (flowSessionService)

**Instrucciones:**

1. **PRIMERO investigar:** Leer los siguientes flujos del bot para entender la estructura:
   - `backend/flows/flowCrearEgreso.js` (o similar para crear gasto con imagen)
   - `backend/flows/flowGestionarMovimiento.js` (para editar/eliminar)
   - `backend/flows/flowIngresarDinero.js` (para ingresos)
   - Buscar dónde se corrigen campos (ej: `flowCorregirCategoria`, `flowCorregirProveedor`, `flowCorregirFecha`)

2. **Patrón de inyección:** Igual que los hooks de onboarding, fire-and-forget:

```javascript
// Al inicio del flujo (primer addAction)
try {
  const { iniciarSesion } = require('../src/services/flowSessionService');
  const sessionId = await iniciarSesion({
    empresaId: state.get('empresaId'),
    profileId: state.get('profileId'),
    phone: ctx.from,
    flujo: 'crearEgreso',
    origenInput: /* detectar: si ctx.message.imageMessage → 'foto', etc */,
    flowName: 'flowCrearEgreso'
  });
  await state.update({ flowSessionId: sessionId });
} catch (_) {}

// Cuando se corrige un campo
try {
  const { registrarCorreccion } = require('../src/services/flowSessionService');
  const sessionId = state.get('flowSessionId');
  if (sessionId) await registrarCorreccion(sessionId, 'categoría', 'voluntaria');
} catch (_) {}

// Al final exitoso
try {
  const { finalizarSesion } = require('../src/services/flowSessionService');
  const sessionId = state.get('flowSessionId');
  if (sessionId) await finalizarSesion(sessionId, 'completado', { movimientoId });
} catch (_) {}

// En cancelación/error
try {
  const { finalizarSesion } = require('../src/services/flowSessionService');
  const sessionId = state.get('flowSessionId');
  if (sessionId) await finalizarSesion(sessionId, 'cancelado');
} catch (_) {}
```

3. **Detección de `origenInput`:** Buscar en el codebase cómo el bot detecta si el mensaje tiene imagen (`ctx.message.imageMessage`), audio (`ctx.message.audioMessage`), documento (`ctx.message.documentMessage`). Puede estar en las funciones helper.

4. **Empezar con 3 flujos principales:**
   - Crear egreso (el más usado)
   - Crear ingreso
   - Editar movimiento

5. **Los flujos de corrección** (corregir fecha, proveedor, categoría) ya son sub-flujos que se llaman desde el flujo principal. Cuando se ejecutan, el `flowSessionId` ya debería estar en el state.

**Criterios de aceptación:**
- [ ] Al menos 3 flujos instrumentados (crear egreso, crear ingreso, editar)
- [ ] `flowSessionId` se persiste en el state del bot
- [ ] Correcciones se registran cuando el usuario pasa por flujos de corrección
- [ ] Cancelaciones se registran
- [ ] Todo es fire-and-forget: un error en tracking no rompe el flujo

---

### Ticket 2.4 — Scheduler cerrar sesiones abandonadas

**Objetivo:** Cron cada 30 minutos que cierra sesiones `en_curso` que llevan > 30 minutos.

**Archivo a crear:** `backend/src/services/flowSessionScheduler.js`

**Dependencias:** Ticket 2.2

**Instrucciones:**
- Mismo patrón que ticket 1.4 (estadoSaludScheduler) pero con `CHECK_INTERVAL_MS = 30 * 60 * 1000` (cada 30 min).
- No necesita lógica de hora fija: ejecuta cada 30 minutos directamente.
- Llama a `flowSessionService.cerrarAbandonadas(30)`.
- Registrar en `app.js` con feature flag.

**Criterios de aceptación:**
- [ ] Se ejecuta cada 30 minutos
- [ ] Guard anti-solapamiento
- [ ] Logging con cantidad de sesiones cerradas
- [ ] Registrado en `app.js`

---

### Ticket 2.5 — Modelo CadenaPostVenta

**Objetivo:** Crear modelo para representar la cadena de 13 automatizaciones post-venta por empresa.

**Archivo a crear:** `backend/src/models/CadenaPostVenta.js`

**Schema:**

```javascript
const EtapaSchema = new mongoose.Schema({
  codigo:          { type: String, required: true },  // 'A1', 'A2', ..., 'A13'
  nombre:          { type: String },
  triggerDescripcion: { type: String },  // descripción human-readable del trigger
  estado:          { type: String, enum: ['pendiente', 'ejecutada', 'skipped', 'error'], default: 'pendiente' },
  fechaEjecucion:  { type: Date, default: null },
  resultado:       { type: String, default: null },  // detalle de qué pasó
  intentos:        { type: Number, default: 0 }
}, { _id: false });

const CadenaPostVentaSchema = new mongoose.Schema({
  empresaId:      { type: String, required: true, unique: true },
  destinatarios:  [{ 
    profileId: String, 
    phone: String, 
    nombre: String, 
    rol: { type: String, enum: ['cargador', 'admin', 'dueño'] }
  }],
  etapas:         [EtapaSchema],
  estado:         { type: String, enum: ['en_curso', 'completada', 'cancelada'], default: 'en_curso' },
  diaInicio:      { type: Date, default: Date.now },  // día 0 = cuando se creó
  timestamps:     true
}, { collection: 'cadenas_post_venta' });
```

**Criterios de aceptación:**
- [ ] 13 etapas pre-cargadas al crear (A1→A13) con nombre y trigger descriptivo
- [ ] Patrón Mongoose estándar del proyecto
- [ ] `empresaId` unique

---

### Ticket 2.6 — Cadena post-venta (A1→A13)

> **✅ IMPLEMENTADO** — Nota: La cadena se crea automáticamente desde `onboardingService.onboardingCreaInicio` junto con el onboarding del usuario y el envío de bienvenida (fire-and-forget).

**Objetivo:** Implementar el servicio que ejecuta las 13 automatizaciones post-venta y el scheduler que las evalúa diariamente.

**Archivo a crear:** `backend/src/services/cadenaPostVentaService.js`

**Dependencias:** Ticket 2.5, `onboardingClienteService`, `estadoSaludService`, `mensajesProgramadosScheduler`

**Contexto funcional (leer `ACTIVACION_RETENCION_FUNCIONAL.md` sección 6, Capa 1):**

Las 13 automatizaciones se organizan en 6 etapas temporales. No son secuenciales estrictas: cada una tiene su propio trigger que se evalúa en el momento correcto.

**Funciones:**

```javascript
/**
 * Crea una cadena para una empresa nueva.
 * Se debe llamar cuando una empresa se convierte en cliente.
 * Pre-carga las 13 etapas con sus triggers y nombres.
 * @param {string} empresaId
 * @param {array} destinatarios - [{profileId, phone, nombre, rol}]
 */
async function crearCadena(empresaId, destinatarios)

/**
 * Evalúa todas las cadenas en_curso. Para cada una:
 * - Calcula diasDesdInicio (desde diaInicio)
 * - Para cada etapa pendiente, verifica si el trigger se cumple
 * - Si sí: ejecuta la acción (enviar mensaje vía mensajesProgramados) y marca como ejecutada
 * - Si la condición no aplica (ej: A3 pregunta "si nadie cargó gasto al día 1"
 *   pero alguien cargó) → skip
 */
async function evaluarTodas()

/**
 * Evalúa triggers de una cadena específica.
 * @param {string} empresaId
 */
async function evaluarCadena(empresaId)
```

**Tabla de triggers (implementar la evaluación de cada uno):**

| Código | Día | Trigger | Acción |
|--------|-----|---------|--------|
| A1 | 0 | Cadena creada | Enviar bienvenida + link web |
| A2 | 0 | Cadena creada | Enviar "mandame foto de factura" |
| A3 | 1 | Nadie cargó gasto | Recordatorio |
| A4 | 1-2 | Cargó gasto Y no validó web | "Entrá a la web" |
| A5 | 2-3 | Meet agendada en 24h (si existe meet en calendario) | Recordatorio meet |
| A6 | 2-3 | A5 + nadie cargó gasto | Recordatorio urgente pre-meet |
| A7 | 3-5 | Meet se realizó (si se marca como realizada) | Resumen post-meet |
| A8 | 5 | 2 días post-meet sin actividad | "¿Necesitan ayuda?" |
| A9 | 7 | Score onboarding < 50% | Nudge personalizado |
| A10 | 14 | Estado = en_riesgo | Alerta a CS |
| A11 | 21 | Sigue en_riesgo | Segundo contacto CS |
| A12 | 30 | Score < 30% | Marcar para análisis churn |
| A13 | 30 | Score ≥ 70% | Felicitación + sugerencia módulo |

**Instrucciones:**
1. A5/A6/A7 dependen de un sistema de meets que puede no existir aún. Implementar como "skip" si no hay datos de meet. Dejar un TODO comentado.
2. Para A1/A2: usar `mensajesProgramadosScheduler` para enviar. Crear mensajes en MensajeProgramado de MongoDB (buscar el modelo existente).
3. El scheduler asociado debe correr a las 8am (mismo patrón que ticket 1.4).

**Criterios de aceptación:**
- [ ] `crearCadena` crea documento con 13 etapas pre-cargadas
- [ ] `evaluarTodas` itera cadenas `en_curso` y evalúa triggers
- [ ] A1/A2 se ejecutan inmediatamente al crear (día 0)
- [ ] A5/A6/A7 tienen placeholder/skip si no hay sistema de meets
- [ ] Cada etapa se ejecuta una sola vez (idempotente)
- [ ] Scheduler a las 8am registrado en `app.js`

---

### Ticket 2.7 — nudgeService

**Objetivo:** Servicio de nudges inteligentes que evalúa condiciones y envía mensajes reactivos.

**Archivo a crear:** `backend/src/services/nudgeService.js`

**Dependencias:** Tickets 1.3 (estadoSalud), 2.2 (flowSession), `onboardingClienteService`, `mensajesProgramadosScheduler`

**Funciones:**

```javascript
/**
 * Configuración estática de nudges.
 * Cada nudge tiene: id, condicion (función), template de mensaje, destino, cooldown.
 */
const NUDGES_CONFIG = [
  {
    id: 'usuario_inactivo_5d',
    descripcion: 'Usuario sin usar hace 5+ días',
    evaluar: async (empresa, usuario) => { /* diasSinUso >= 5 */ },
    generarMensaje: (empresa, usuario) => `¡Hola ${usuario.nombre}! ...`,
    destino: 'usuario',  // 'usuario' | 'cs' | 'dueño'
    cooldownDias: 7,
    unaVez: false
  },
  // ... 6 más según doc funcional
];

/**
 * Evalúa todos los nudges para todas las empresas.
 * Para cada empresa, para cada usuario, evalúa cada nudge.
 * Respeta cooldowns: no envía si ya se envió en los últimos N días.
 * 
 * Necesita un modelo ligero para trackear nudges enviados (NudgeLog).
 */
async function evaluarTodos()

/**
 * Evalúa nudges para una empresa específica.
 */
async function evaluarEmpresa(empresaId)
```

**Modelo auxiliar NudgeLog:** (puede ir en el mismo archivo o archivo separado)
```javascript
{
  empresaId:  String,
  profileId:  String,     // null si destino es 'cs'
  nudgeId:    String,     // id del nudge
  enviadoEn:  Date,
  mensaje:    String      // el mensaje que se envió
}
// collection: 'nudge_log'
// Índice: { empresaId, profileId, nudgeId, enviadoEn }
```

**Scheduler:** 10am diario (mismo patrón).

**Criterios de aceptación:**
- [ ] 7 nudges configurados según doc funcional
- [ ] Cooldown respetado: no repite nudge antes de N días
- [ ] NudgeLog persiste cada envío
- [ ] `unaVez: true` se envía solo la primera vez que la condición se cumple
- [ ] Scheduler a las 10am registrado en `app.js`

---

### Ticket 2.8 — Rutas API sesiones de flujo + métricas

**Objetivo:** Exponer endpoints REST para consultar sesiones de flujo y métricas de calidad WA.

**Archivo a crear:** `backend/src/routes/flowSessionRoutes.js`

**Archivo a modificar:** `backend/src/routes/index.js`

**Dependencias:** Ticket 2.2

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/flow-sessions/:empresaId` | Sesiones paginadas (`?limit=50&skip=0&estado=completado&flujo=crearEgreso`) |
| GET | `/flow-sessions/:empresaId/metricas` | Métricas empresa (`?dias=30`) |
| GET | `/flow-sessions/:empresaId/:profileId/metricas` | Métricas usuario |
| GET | `/flow-sessions/metricas-producto` | Métricas globales por flujo (para producto) |

**Montar:** `router.use('/flow-sessions', flowSessionRoutes);`

**Criterios de aceptación:**
- [ ] Middleware `authenticate` en todas las rutas
- [ ] Paginación en listado
- [ ] Filtros opcionales por query params
- [ ] Montado en `index.js`

---

### Ticket 2.9 — Tests unitarios Ola 2

**Archivos a crear:**
- `backend/test/unit/flowSession.test.js`
- `backend/test/unit/cadenaPostVenta.test.js`

**Tests:**

**flowSession.test.js:**
```
describe('flowSessionService')
  ✓ iniciarSesion crea doc en estado en_curso
  ✓ registrarCorreccion agrega corrección e incrementa contador
  ✓ finalizarSesion calcula duración correctamente
  ✓ finalizarSesion no modifica sesión ya finalizada (idempotente)
  ✓ cerrarAbandonadas marca sesiones viejas como abandonado
  ✓ cerrarAbandonadas no toca sesiones recientes
  ✓ obtenerMetricasUsuario calcula tasa de éxito correctamente
```

**cadenaPostVenta.test.js:**
```
describe('cadenaPostVentaService')
  ✓ crearCadena genera 13 etapas
  ✓ evaluarCadena ejecuta A1 y A2 en día 0
  ✓ evaluarCadena skip A3 si hay gastos cargados
  ✓ evaluarCadena ejecuta A3 si no hay gastos al día 1
  ✓ etapas se ejecutan una sola vez
```

**Criterios de aceptación:**
- [ ] Todos los tests pasan
- [ ] Usan MongoMemoryServer
- [ ] Servicios externos mockeados (mensajesProgramados, bot)

---

## OLA 3 — Expansión y Valor (✅ Completada)

---

### Ticket 3.1 — Módulos onboarding: Nota Pedido + Acopio + TomaDecisión

**Objetivo:** Extender `onboardingClienteService` y su `MODULOS_CONFIG` para soportar 3 módulos adicionales.

**Archivo a modificar:** `backend/src/services/onboardingClienteService.js`

**Instrucciones:**

1. Agregar a `MODULOS_CONFIG`:

```javascript
notaPedido: {
  pasos: [
    { nombre: 'crearEditarNota', peso: 0.5 },
    { nombre: 'accederWeb', peso: 0.5 }
  ]
},
acopio: {
  pasos: [
    { nombre: 'crearAcopio', peso: 0.3 },
    { nombre: 'registrarRemito', peso: 0.4 },
    { nombre: 'accederWeb', peso: 0.3 }
  ]
},
tomaDecision: {
  pasos: [
    { nombre: 'verCaja', peso: 0.2 },
    { nombre: 'crearFiltro', peso: 0.2 },
    { nombre: 'crearReporte', peso: 0.2 },
    { nombre: 'crearPresupuesto', peso: 0.2 },
    { nombre: 'exportarPDF', peso: 0.2 }
  ]
}
```

2. Agregar hooks en los servicios correspondientes:
   - Buscar el servicio de notas de pedido y agregar hook para `crearEditarNota`
   - Buscar el servicio de acopios/remitos y agregar hooks
   - Los hooks de `tomaDecision` van en el frontend (ya cubierto parcialmente en ticket 1.7)

3. Verificar que `crearOnboardingUsuario` acepta `modulosActivos` y crea solo los módulos indicados.

**Criterios de aceptación:**
- [ ] `MODULOS_CONFIG` tiene 4 módulos completos
- [ ] `crearOnboardingUsuario` respeta `modulosActivos` (solo crea los indicados)
- [ ] Hooks inyectados en servicios de notas y acopios (fire-and-forget)
- [ ] Tests actualizados

---

### Ticket 3.2 — Score empresa multi-módulo ponderado

**Objetivo:** Implementar el cálculo de score empresa con pesos diferenciados por módulos activos.

**Archivo a modificar:** `backend/src/services/onboardingClienteService.js`

**Instrucciones:**

Actualizar `recalcularScoreEmpresa` para usar pesos:

```javascript
const PESOS_MODULOS = {
  soloCaja:       { caja: 0.7, tomaDecision: 0.3 },
  cajaYNotas:     { caja: 0.5, notaPedido: 0.2, tomaDecision: 0.3 },
  cajaYAcopio:    { caja: 0.5, acopio: 0.2, tomaDecision: 0.3 },
  todos:          { caja: 0.4, notaPedido: 0.15, acopio: 0.15, tomaDecision: 0.3 }
};
```

Detectar qué módulos están activos en la empresa (mirando los onboardings de los usuarios) y seleccionar el esquema de pesos.

**Criterios de aceptación:**
- [ ] Score empresa refleja pesos diferenciados
- [ ] Si un módulo no tiene datos (ningún usuario lo tiene), no pesa
- [ ] Sync a Firestore sigue funcionando
- [ ] Test que verifica cálculo con múltiples módulos

---

### Ticket 3.3 — Mensajes de valor al dueño

> **✅ IMPLEMENTADO** — Nota: `enviarResumenesMensual` usa `analyticsService.getResumenMensual` (ventana rolling 30 días) en lugar de `getResumenSemanal`. Clave corregida: `cantGastos` (no `cantidadGastos`).

**Objetivo:** Implementar envío semanal y mensual de resúmenes de valor al dueño de cada empresa.

**Archivo a crear:** `backend/src/services/mensajesValorService.js`

**Dependencias:** Ticket 1.1 (getResumenSemanal en analyticsService), `mensajesProgramadosScheduler`

**Funciones:**

```javascript
/**
 * Envía resumen semanal a cada dueño de empresa activa.
 * Contenido: "Esta semana tu equipo cargó N gastos por $X."
 */
async function enviarResumenesSemanal()

/**
 * Genera PDF resumen mensual y lo envía como adjunto por WhatsApp.
 * Usa pdfkit o pdf-lib (ya están como dependencias).
 */
async function enviarResumenesMensual()
```

**Schedulers:** Domingos 10am (semanal), Primer día del mes 10am (mensual).

**Instrucciones:**
1. Para obtener el dueño: buscar en los perfiles de la empresa el que tiene rol 'dueño' o 'tomaDecision'.
2. Para el PDF: buscar en el codebase cómo se generan PDFs actualmente (buscar `pdfkit` o `PDFDocument`).
3. Los mensajes se programan via `mensajesProgramadosScheduler`.

**Criterios de aceptación:**
- [ ] Resumen semanal se envía solo a empresas con estado `activo` u `onboarding`
- [ ] PDF mensual tiene: total gastos, total ingresos, top 5 categorías, gráfico textual
- [ ] Schedulers registrados en `app.js`
- [ ] Si una empresa no tiene dueño identificado, se salta sin error

---

### Ticket 3.4 — Vista empresa en frontend (Panel CS)

**Objetivo:** Crear la vista unificada de empresa para el equipo de CS en el frontend Next.js.

**Archivos a crear:** Componentes en `app-web/src/sections/` y página en `app-web/src/pages/`

**Dependencias:** APIs de tickets 1.6 y 2.8

**Instrucciones:**

1. **PRIMERO investigar la estructura frontend:**
   - Leer `app-web/src/pages/` para entender el routing de Next.js
   - Leer `app-web/src/sections/` para ver patrones de componentes
   - Buscar cómo se hacen llamadas API (axios? fetch? SWR? react-query?)
   - Buscar el sistema de layouts y guards (auth)

2. **Endpoint único para la vista:** `GET /api/empresa/:empresaId/vista-completa` (implementar en backend si no existe del ticket 1.6)

3. **Secciones del panel** (ver doc funcional sección 8):
   - Header: nombre + chip estado salud + días como cliente + score
   - Bloque 1: barras de progreso onboarding por módulo
   - Bloque 2: tabla de usuarios con scores + último acceso + éxito WA
   - Bloque 3: métricas calidad WA (tasa éxito, correcciones promedio)
   - Bloque 4: timeline/historial
   - Acciones: enviar recordatorio, forzar recálculo

4. **Implementar el endpoint backend** `GET /api/empresa/:empresaId/vista-completa`:
```javascript
// Agrega datos de:
// - onboardingClienteService.obtenerResumenEmpresa(empresaId)
// - estadoSaludService.obtenerEstado(empresaId)
// - flowSessionService.obtenerMetricasEmpresa(empresaId)
// - analyticsService.getEmpresaStats(empresaId)
// Todo en una sola respuesta para minimizar requests del frontend.
```

**Criterios de aceptación:**
- [ ] Endpoint agregador implementado en backend
- [ ] Página creada y accesible por ruta
- [ ] Muestra las 4 secciones + acciones
- [ ] Chip de color de estado de salud funcional
- [ ] Responsive (al menos desktop)

---

### Ticket 3.5 — Dashboard matutino CS (frontend)

**Objetivo:** Página de dashboard que muestra la visión general de todas las empresas para el equipo CS.

**Dependencias:** Ticket 3.4

**Instrucciones:**

1. Vista con 3 columnas o tabs:
   - 🔴 En riesgo / Inactivas
   - 🟡 Onboarding lento
   - 🟢 Activas (resumen)

2. Cada tarjeta de empresa muestra: nombre, estado, score, días sin uso, acción rápida.

3. Click en tarjeta → navega a vista individual (ticket 3.4).

4. Endpoint: `GET /api/salud?estado=en_riesgo` (ya existe del ticket 1.6).

**Criterios de aceptación:**
- [ ] Muestra empresas agrupadas por estado
- [ ] Ordenadas por urgencia (en_riesgo primero, luego inactivo)
- [ ] Click navega a detalle
- [ ] Se refresca con los datos más recientes

---

### Ticket 3.6 — Tests de integración E2E

**Objetivo:** Test end-to-end que simula el ciclo de vida completo de un cliente.

**Archivo a crear:** `backend/test/integration/activacionRetencion.e2e.test.js`

**Dependencias:** Todos los tickets anteriores

**Test principal:**

```
describe('Ciclo de vida de un cliente')
  ✓ Crear empresa → se crea cadena post-venta + onboardings
  ✓ Crear movimiento → registra paso crearGasto en onboarding
  ✓ Editar movimiento → registra paso editarGasto
  ✓ Recalcular score empresa → refleja progreso
  ✓ Cron salud → empresa en estado 'onboarding' (< 30 días)
  ✓ Simular inactividad → estado cambia a 'en_riesgo'
  ✓ Simular actividad → estado vuelve a 'activo'
  ✓ FlowSession: crear y cerrar sesión → métricas correctas
  ✓ Nudge: usuario inactivo 5d → nudge enviado
  ✓ Nudge: cooldown respetado → no se repite
```

**Instrucciones:**
- Usar MongoMemoryServer
- Mockear Firestore con jest.mock
- Mockear mensajesProgramadosScheduler (verificar que se llama, no enviar realmente)
- El test debe ser autocontenido: crear datos, ejecutar lógica, verificar resultados

**Criterios de aceptación:**
- [ ] Test cubre el flujo completo desde creación hasta evaluación de salud
- [ ] Servicios reales contra MongoDB in-memory
- [ ] Servicios externos (Firestore, WhatsApp) mockeados
- [ ] Test pasa en < 30 segundos

---

## Grafo de Dependencias

```
Ola 1:
  1.1 ──┐
        ├──▶ 1.3 ──▶ 1.4 (scheduler)
  1.2 ──┘     │
              ├──▶ 1.5 (reporte)
              │
  1.6 ◄───── 1.3 + existente
  1.7 ◄───── 1.6 (necesita API)
  1.8 ◄───── 1.1 + 1.2 + 1.3

Ola 2:
  2.1 ──▶ 2.2 ──▶ 2.3 (hooks bot)
              │──▶ 2.4 (scheduler)
              │──▶ 2.8 (rutas)
  2.5 ──▶ 2.6 (cadena)
  1.3 ──▶ 2.7 (nudges, necesita estadoSalud)
  2.9 ◄── 2.2 + 2.6

Ola 3:
  3.1 ──▶ 3.2
  1.1 ──▶ 3.3
  1.6 + 2.8 ──▶ 3.4 ──▶ 3.5
  Todo ──▶ 3.6
```

---

## Orden de ejecución recomendado para agentes

Dentro de cada ola, ejecutar en este orden estricto:

**Ola 1:** `1.1` → `1.2` → `1.3` → `1.4` → `1.5` → `1.6` → `1.7` → `1.8`

**Ola 2:** `2.1` → `2.2` → `2.3` → `2.4` → `2.5` → `2.6` → `2.7` → `2.8` → `2.9`

**Ola 3:** `3.1` → `3.2` → `3.3` → (`3.4` → `3.5`) → `3.6`

Tickets que se pueden paralelizar (sin dependencias entre sí):
- `1.1` y `1.2` en paralelo
- `1.4` y `1.5` y `1.6` en paralelo (todos dependen de 1.3)
- `2.1` y `2.5` en paralelo
- `2.3` y `2.4` y `2.8` en paralelo (todos dependen de 2.2)
- `3.1` y `3.3` en paralelo
