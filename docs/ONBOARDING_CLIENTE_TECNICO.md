# Onboarding de Clientes & Métricas de Adopción — Documento Técnico

> **Fecha:** Febrero 2026  
> **Estado:** Diseño — Pre-implementación  
> **Documento funcional:** [ONBOARDING_CLIENTE_FUNCIONAL.md](ONBOARDING_CLIENTE_FUNCIONAL.md)

---

## 1. Arquitectura General

### Stack involucrado

| Componente | Tecnología | Repositorio |
|-----------|-----------|-------------|
| API REST | Express.js / Node.js | `/backend` |
| Base de datos principal | MongoDB (Mongoose) | `/backend/src/models` |
| Base de datos legacy/front | Firestore | Colecciones: `empresas`, `profile`, `movimientos` |
| Bot WhatsApp | @builderbot/bot + Baileys | `/backend/flows` |
| Frontend | Next.js | `/app-web` |
| Crons/Schedulers | node-cron | `/backend/src/services/*Scheduler.js` |
| Mensajes programados | Meta API / Baileys | `mensajesProgramadosScheduler.js` |

### Principio de diseño

- **MongoDB para datos nuevos.** Todo lo relacionado con onboarding, sesiones de flujo, y métricas calculadas vive en MongoDB.
- **Firestore para sincronización al frontend.** Scores agregados a nivel empresa se sincronizan a Firestore (`empresas/{id}`) para que el frontend los lea sin cambiar su patrón de acceso.
- **Fire-and-forget en hooks.** Ningún tracking bloquea la operación principal. Todos los hooks son async con try/catch que loguean pero no tiran.

---

## 2. Modelos de Datos

### 2.1 `OnboardingCliente` (MongoDB)

**Colección:** `onboarding_cliente`

Registra el progreso de onboarding de un usuario individual dentro de una empresa.

```javascript
const PasoSchema = new Schema({
  completado: { type: Boolean, default: false },
  fecha: { type: Date, default: null },        // cuándo se completó
  peso: { type: Number, required: true },       // peso relativo (0.0-1.0)
  origen: { type: String, default: null }       // 'whatsapp' | 'web' | 'auto'
}, { _id: false });

const ModuloSchema = new Schema({
  pasos: { type: Map, of: PasoSchema },
  scoreModulo: { type: Number, default: 0 },    // 0.0-1.0
  completado: { type: Boolean, default: false },
  fechaCompletado: { type: Date, default: null }
}, { _id: false });

const OnboardingClienteSchema = new Schema({
  profileId: { type: String, required: true },   // ID del doc en Firestore `profile`
  empresaId: { type: String, required: true },   // ID de la empresa en Firestore
  userId: { type: String, default: null },        // Firebase Auth UID (si validó web)
  phone: { type: String, required: true },        // Teléfono (identificador WhatsApp)
  nombre: { type: String, default: '' },
  rol: {
    type: String,
    enum: ['cargador', 'admin', 'tomaDecision'],
    default: 'cargador'
  },
  modulos: { type: Map, of: ModuloSchema },
  scoreGeneral: { type: Number, default: 0 },    // 0.0-1.0
  ultimaActividad: { type: Date, default: null },
  activo: { type: Boolean, default: true }
}, { timestamps: true, collection: 'onboarding_cliente' });

// Índices
OnboardingClienteSchema.index({ empresaId: 1, profileId: 1 }, { unique: true });
OnboardingClienteSchema.index({ empresaId: 1, phone: 1 });
```

**Configuración de módulos:**

```javascript
const MODULOS_CONFIG = {
  caja: {
    pasos: {
      crearGasto:    { peso: 0.4 },
      editarGasto:   { peso: 0.2 },
      eliminarGasto: { peso: 0.2 },
      accederWeb:    { peso: 0.2 }
    }
  },
  // Futuros (no implementar en Ola 1):
  notaPedido: {
    pasos: {
      crearEditarNota: { peso: 0.5 },
      accederWeb:      { peso: 0.5 }
    }
  },
  acopio: {
    pasos: {
      crearAcopio:    { peso: 0.3 },
      registrarRemito:{ peso: 0.4 },
      accederWeb:     { peso: 0.3 }
    }
  },
  tomaDecision: {
    pasos: {
      verCaja:          { peso: 0.2 },
      crearFiltro:      { peso: 0.2 },
      crearReporte:     { peso: 0.2 },
      crearPresupuesto: { peso: 0.2 },
      exportarPdf:      { peso: 0.2 }
    }
  }
};
```

### 2.2 `FlowSession` (MongoDB) — NUEVO

**Colección:** `flow_sessions`

Registra cada interacción de un usuario con un flujo del bot de WhatsApp.

```javascript
const CorreccionSchema = new Schema({
  campo: { type: String },          // 'categoria', 'total', 'proveedor', etc.
  tipo: {
    type: String,
    enum: ['voluntaria', 'forzada'] // voluntaria = usuario eligió corregir
  },                                 // forzada = campo vacío/error, el sistema lo pidió
  timestamp: { type: Date }
}, { _id: false });

const FlowSessionSchema = new Schema({
  empresaId: { type: String, required: true, index: true },
  phone: { type: String, required: true, index: true },
  profileId: { type: String, default: null },
  
  // Identificación del flujo
  flujo: { type: String, required: true },        // 'crearEgreso', 'ingresarDinero', etc.
  flujoDetalle: { type: String, default: null },   // sub-flujo o variante
  
  // Estado de la sesión
  estado: {
    type: String,
    enum: ['en_curso', 'completado', 'cancelado', 'abandonado', 'error'],
    default: 'en_curso'
  },
  
  // Tiempos
  inicioAt: { type: Date, default: Date.now },
  finAt: { type: Date, default: null },
  duracionSegundos: { type: Number, default: null },
  
  // Input
  origenInput: {
    type: String,
    enum: ['foto', 'audio', 'texto', 'documento', 'mixto'],
    default: null
  },
  
  // Correcciones
  correcciones: [CorreccionSchema],
  totalCorrecciones: { type: Number, default: 0 },
  
  // Navegación
  pasosRecorridos: { type: Number, default: 0 },
  flujosCadena: [{ type: String }],   // ['flowImage', 'flowValidaData', 'flowOK']
  
  // Resultado (si completó, qué se creó)
  movimientoId: { type: String, default: null },
  tipoMovimiento: { type: String, default: null },  // 'egreso', 'ingreso', etc.
  
}, { timestamps: true, collection: 'flow_sessions' });

// Índices
FlowSessionSchema.index({ empresaId: 1, phone: 1, inicioAt: -1 });
FlowSessionSchema.index({ empresaId: 1, estado: 1 });
FlowSessionSchema.index({ flujo: 1, estado: 1 });          // para analytics por flujo
FlowSessionSchema.index({ estado: 1, inicioAt: 1 });        // para cerrar abandonadas
```

### 2.3 Campos sincronizados a Firestore

En `empresas/{empresaId}` se sincroniza un resumen:

```javascript
// Campo: onboardingCliente
{
  scoreGeneral: 0.55,           // promedio ponderado de todos los usuarios
  ratioCompletados: 0.33,       // 1 de 3 usuarios completó 100%
  totalUsuarios: 3,
  usuariosCompletados: 1,
  modulos: {
    caja: { score: 0.6, completados: 1, total: 3 }
  },
  ultimaActualizacion: Timestamp
}

// Campo: estadoSalud
{
  estado: 'en_riesgo',          // onboarding | activo | en_riesgo | inactivo | churneado
  desde: Timestamp,             // desde cuándo tiene este estado
  scoreOnboarding: 0.55,
  ratioUsuariosActivos: 0.33,
  movimientos7d: 2,
  diasSinUso: 5,
  ultimaActualizacion: Timestamp
}

// Campo: calidadInteracciones (resumen)
{
  tasaExito: 0.78,              // 78% de flujos completados
  correccionesPromedio: 0.4,    // 0.4 correcciones por operación
  sesiones7d: 12,               // sesiones en últimos 7 días
  ultimaActualizacion: Timestamp
}
```

---

## 3. Servicios

### 3.1 `onboardingClienteService.js`

**Ubicación:** `/backend/src/services/onboardingClienteService.js`  
**Estado:** Implementado (Ola 1, módulo Caja)

| Función | Descripción | Llamada desde |
|---------|------------|---------------|
| `crearOnboardingUsuario(data)` | Crea doc con módulos según config empresa | Al crear perfil / API |
| `registrarPaso(empresaId, phone, modulo, paso, origen)` | Marca paso completado (idempotente). Recalcula scores. | Hooks |
| `recalcularScores(onboardingDoc)` | Recalcula `scoreModulo` y `scoreGeneral` | `registrarPaso` |
| `recalcularScoreEmpresa(empresaId)` | Agrega scores de todos los usuarios → sinc a Firestore | `registrarPaso` |
| `hookMovimientoCreado(movimiento)` | Detecta tipo y registra paso correspondiente | `dataService.saveMovimiento` |
| `hookMovimientoEditado(data)` | Registra paso `editarGasto` | `dataService.editMovimiento` |
| `hookMovimientoEliminado(data)` | Registra paso `eliminarGasto` | `dataService.deleteMovimiento` |
| `registrarValidacionWeb(empresaId, profileId, userId)` | Marca `accederWeb` en todos los módulos | Login web / validación |
| `obtenerOnboardingsPorEmpresa(empresaId)` | Retorna todos los docs de una empresa | API / Vista empresa |
| `buscarPorPhone(empresaId, phone)` | Busca doc por teléfono | Hooks WA |

### 3.2 `flowSessionService.js` — NUEVO

**Ubicación:** `/backend/src/services/flowSessionService.js`  
**Estado:** Por implementar (Ola 2)

| Función | Descripción | Llamada desde |
|---------|------------|---------------|
| `iniciarSesion(empresaId, phone, flujo, origenInput)` | Crea FlowSession con estado `en_curso`. Retorna `sessionId`. | Hook en `irAlFlow` o inicio de flujo |
| `registrarCorreccion(sessionId, campo, tipo)` | Agrega corrección al array. Incrementa contador. | `flowCorregirAhora`, flujos de corrección |
| `registrarPaso(sessionId, flujoNombre)` | Incrementa `pasosRecorridos`, agrega a `flujosCadena` | Hook en transiciones de flujo |
| `finalizarSesion(sessionId, estado, movimientoId?)` | Cierra la sesión (calcula duración) | `flowOK` (completado), `flowCancelar` (cancelado) |
| `cerrarAbandonadas()` | Cierra sesiones `en_curso` con >30min sin actividad | Cron cada 15min |
| `obtenerSesionesPorEmpresa(empresaId, opciones)` | Lista sesiones con filtros | API / Vista empresa |
| `calcularMetricasEmpresa(empresaId, dias)` | Agrega: tasa éxito, correcciones prom, etc. | Cron diario |
| `calcularMetricasPorFlujo(dias)` | Agrega por flujo: tasa éxito, campo más corregido | Reporte interno |
| `obtenerSesionActiva(phone)` | Busca sesión en_curso para el teléfono | Para verificar si hay sesión abierta |

### 3.3 `estadoSaludService.js` — NUEVO

**Ubicación:** `/backend/src/services/estadoSaludService.js`  
**Estado:** Por implementar (Ola 1)

| Función | Descripción |
|---------|------------|
| `calcularEstadoSalud(empresaId)` | Evalúa métricas y determina estado. Sinc a Firestore. |
| `recalcularTodas()` | Recalcula todas las empresas clientes. Cron diario 6am. |
| `obtenerResumen()` | Retorna conteo por estado (para reporte). |
| `obtenerEmpresasEnRiesgo()` | Retorna empresas en_riesgo e inactivas. |

**Lógica de cálculo:**

```javascript
function determinarEstado(empresa, metricas) {
  const { esCliente, diasDesdeRegistro, dadaDeBaja } = empresa;
  const { movimientos7d, ratioUsuariosActivos, diasSinUso, ratioOnboardingPaso2 } = metricas;

  if (!esCliente) return null;
  if (dadaDeBaja || diasSinUso > 30) return 'churneado';
  if (diasSinUso > 14) return 'inactivo';
  if (diasDesdeRegistro < 30) return 'onboarding';
  
  // Activo: buen uso + buena adopción
  if (ratioUsuariosActivos >= 0.5 && ratioOnboardingPaso2 >= 0.5) return 'activo';
  
  // En riesgo: bajo uso O baja adopción O muchos días sin uso
  if (ratioUsuariosActivos < 0.3 || ratioOnboardingPaso2 < 0.5 || diasSinUso > 5) return 'en_riesgo';
  
  return 'activo';
}
```

### 3.4 `reporteInternoService.js` — NUEVO

**Ubicación:** `/backend/src/services/reporteInternoService.js`  
**Estado:** Por implementar (Ola 1)

| Función | Descripción |
|---------|------------|
| `generarReporteDiario()` | Genera texto del reporte diario para CS |
| `enviarReporteDiario()` | Envía por WhatsApp al grupo de CS. Cron 9am. |

---

## 4. Hooks e Integraciones

### 4.1 Hooks existentes (ya implementados)

Los siguientes hooks ya están inyectados en `dataService.js`:

```
dataService.saveMovimiento()
  └─ después de addMovimientosDerivados()
     └─ onboardingClienteService.hookMovimientoCreado(movimiento)  // fire-and-forget

dataService.editMovimiento()
  └─ antes del return
     └─ onboardingClienteService.hookMovimientoEditado({empresaId, profileId, phone, origen})

dataService.deleteMovimiento()
  └─ antes del return
     └─ onboardingClienteService.hookMovimientoEliminado({empresaId, profileId, phone, origen})
```

### 4.2 Hooks por implementar

#### En flujos de WhatsApp (para FlowSession)

**Punto de inyección 1: Inicio de flujo**

```
Cuando un flujo principal arranca (flowImage, flowIngresarDinero, flowCrearEgreso, etc.)
  └─ flowSessionService.iniciarSesion(empresaId, phone, nombreFlujo, origenInput)
  └─ Guardar sessionId en ctx.state.flowSessionId
```

Archivos a modificar:
- `/backend/flows/flowImage.js` — cuando recibe imagen/PDF
- `/backend/flows/flowIngresarDinero.js` — cuando inicia ingreso
- `/backend/flows/flowCrearEgreso.js` — cuando inicia egreso por texto/audio
- Y cada flujo principal equivalente para otros módulos

**Punto de inyección 2: Correcciones**

```
Cuando el usuario elige corregir (flowCorregirAhora, flowCorregirMonto, etc.)
  └─ flowSessionService.registrarCorreccion(sessionId, campo, tipo)
```

Archivos a modificar:
- `/backend/flows/flowCorregirAhora.js` — corrección por texto libre (voluntaria)
- `/backend/flows/flowCorregirMonto.js` — corrección de monto (forzada si vacío, voluntaria si elige)
- `/backend/flows/flowCorregirProveedor.js`
- `/backend/flows/flowCorregirCategoria.js`
- `/backend/flows/flowCorregirDescripcion.js`
- `/backend/flows/flowCorregirObra.js`

**Punto de inyección 3: Transiciones**

```
Cuando se transiciona de un flujo a otro (gotoFlow)
  └─ flowSessionService.registrarPaso(sessionId, nombreFlujoDestino)
```

Archivo a modificar:
- `/backend/utils/irAlFlow.js` — wrapper de gotoFlow (si existe), o directamente en cada `gotoFlow` call

**Punto de inyección 4: Fin exitoso**

```
Cuando el flujo confirma y crea el movimiento (flowOK, confirmación final)
  └─ flowSessionService.finalizarSesion(sessionId, 'completado', movimientoId)
```

Archivos a modificar:
- `/backend/flows/flowOK.js` o equivalente
- Cualquier flujo que termine con creación de movimiento

**Punto de inyección 5: Cancelación**

```
Cuando el usuario elige cancelar
  └─ flowSessionService.finalizarSesion(sessionId, 'cancelado')
```

Archivos a modificar:
- `/backend/flows/flowCancelar.js` o equivalente
- Opciones de menú "❌ Cancelar" en flujos de confirmación

### 4.3 Hook de login web

Para registrar `accederWeb` en el onboarding:

```
Opción A: En el middleware de autenticación del backend
  └─ Si es primera vez del usuario → onboardingClienteService.registrarValidacionWeb()

Opción B: Desde el frontend, al detectar primer login
  └─ Llamar API → backend registra paso

Recomendado: Opción A, usando el middleware existente que valida Firebase tokens.
```

Archivo a evaluar:
- `/backend/src/middlewares/` — buscar middleware de auth existente
- Agregar check: si tiene onboarding y no completó `accederWeb`, registrar

### 4.4 Cron jobs

| Cron | Horario | Función |
|------|---------|---------|
| Recálculo estado salud | 6:00 AM | `estadoSaludService.recalcularTodas()` |
| Reporte diario CS | 9:00 AM | `reporteInternoService.enviarReporteDiario()` |
| Cerrar sesiones abandonadas | Cada 15 min | `flowSessionService.cerrarAbandonadas()` |
| Métricas de calidad WA | 2:00 AM | `flowSessionService.calcularMetricasEmpresa()` para cada empresa |
| Sync scores a Firestore | Cada 1 hora | `onboardingClienteService.syncPendientes()` (si hay cambios) |

---

## 5. API Endpoints

### 5.1 Onboarding

| Método | Ruta | Descripción |
|--------|------|------------|
| `GET` | `/api/onboarding-cliente/:empresaId` | Lista onboarding de todos los usuarios |
| `GET` | `/api/onboarding-cliente/:empresaId/:profileId` | Detalle de un usuario |
| `POST` | `/api/onboarding-cliente` | Crear onboarding para usuario nuevo |
| `POST` | `/api/onboarding-cliente/:empresaId/:profileId/paso` | Registrar paso manualmente |
| `POST` | `/api/onboarding-cliente/:empresaId/recalcular` | Forzar recálculo de scores |

### 5.2 Estado de salud

| Método | Ruta | Descripción |
|--------|------|------------|
| `GET` | `/api/estado-salud` | Resumen de todas las empresas |
| `GET` | `/api/estado-salud/:empresaId` | Detalle de una empresa |
| `GET` | `/api/estado-salud/en-riesgo` | Empresas en riesgo e inactivas |
| `POST` | `/api/estado-salud/recalcular` | Forzar recálculo de todas |

### 5.3 Sesiones de flujo

| Método | Ruta | Descripción |
|--------|------|------------|
| `GET` | `/api/flow-sessions/:empresaId` | Sesiones de una empresa (paginado) |
| `GET` | `/api/flow-sessions/:empresaId/metricas` | Métricas agregadas de calidad |
| `GET` | `/api/flow-sessions/metricas-por-flujo` | Métricas por tipo de flujo (para producto) |

### 5.4 Reportes

| Método | Ruta | Descripción |
|--------|------|------------|
| `GET` | `/api/reportes/diario` | Preview del reporte diario |
| `POST` | `/api/reportes/diario/enviar` | Forzar envío del reporte |

---

## 6. Plan de Implementación Técnico

### Ola 1 — Fundamentos (Semana 1)

#### Ticket 1.1: Modelo OnboardingCliente + Servicio base
- **Estado:** ✅ Implementado
- **Archivos:** `src/models/OnboardingCliente.js`, `src/services/onboardingClienteService.js`
- **Notas:** Solo módulo Caja. Hooks en dataService.js ya inyectados.

#### Ticket 1.2: Modelo estadoSalud + Servicio + Cron
- **Estado:** Pendiente
- **Crear:** `src/services/estadoSaludService.js`
- **Modificar:** Registrar cron en el scheduler principal del backend
- **Dependencias:** analyticsService.js (para `movimientos7d`, `diasSinUso`, `ratioUsuariosActivos`)
- **Detalle:** Reutilizar métricas de `analyticsService.calcularUsoEmpresa()`. Agregar campo `estadoSalud` a doc Firestore de empresa. Cron 6am recalcula todas.

#### Ticket 1.3: API endpoints onboarding + estadoSalud
- **Estado:** Pendiente
- **Crear:** `src/routes/onboardingClienteRoutes.js`, `src/routes/estadoSaludRoutes.js`
- **Modificar:** `app.api.js` o equivalente para registrar rutas
- **Auth:** Requiere token de admin/CS

#### Ticket 1.4: Hook de accederWeb
- **Estado:** Pendiente
- **Investigar:** Cómo se autentica el frontend hoy (middleware de auth en backend)
- **Implementar:** Al validar token, si usuario tiene onboarding → registrar paso `accederWeb`
- **Alternativa:** Endpoint dedicado que el frontend llame al primer login

#### Ticket 1.5: Reporte diario interno
- **Estado:** Pendiente
- **Crear:** `src/services/reporteInternoService.js`
- **Dependencias:** estadoSaludService, onboardingClienteService
- **Envío:** Via mensajesProgramadosScheduler o directamente con Baileys al grupo de CS
- **Cron:** 9am

#### Ticket 1.6: Vista empresa en frontend
- **Estado:** Pendiente
- **Crear:** Componente en Next.js que consuma los endpoints
- **Lee de:** Firestore (campos sync) + API backend (detalle)

---

### Ola 2 — Calidad WA + Automatizaciones (Semana 2-3)

#### Ticket 2.1: Modelo FlowSession + Servicio base
- **Estado:** Pendiente
- **Crear:** `src/models/FlowSession.js`, `src/services/flowSessionService.js`
- **Incluye:** CRUD, cerrar abandonadas, métricas

#### Ticket 2.2: Hooks de inicio/fin en flujos principales
- **Estado:** Pendiente
- **Modificar:** ~6-8 archivos de flujos en `/backend/flows/`
- **Patrón:**
  ```javascript
  // Al inicio del flujo (primer addAction)
  const session = await flowSessionService.iniciarSesion(
    state.empresaId, state.phone, 'crearEgreso', 'foto'
  );
  await state.update({ flowSessionId: session._id });
  
  // Al confirmar (flowOK o equivalente)
  if (state.flowSessionId) {
    await flowSessionService.finalizarSesion(
      state.flowSessionId, 'completado', movimiento.id
    );
  }
  ```
- **Riesgo:** Los flujos usan `state` de builderbot. Verificar que `flowSessionId` persiste entre `gotoFlow`.

#### Ticket 2.3: Hooks de corrección
- **Estado:** Pendiente
- **Modificar:** `flowCorregirAhora.js` + flujos de corrección individual
- **Patrón:**
  ```javascript
  if (state.flowSessionId) {
    await flowSessionService.registrarCorreccion(
      state.flowSessionId, 'categoria', 'voluntaria'
    );
  }
  ```

#### Ticket 2.4: Hooks de cancelación
- **Estado:** Pendiente
- **Modificar:** `flowCancelar.js` + opciones de cancelar en menús de confirmación
- **Patrón:**
  ```javascript
  if (state.flowSessionId) {
    await flowSessionService.finalizarSesion(state.flowSessionId, 'cancelado');
  }
  ```

#### Ticket 2.5: Cron cerrar abandonadas
- **Estado:** Pendiente
- **Detalle:** Cada 15min, buscar `FlowSession` con `estado: 'en_curso'` y `updatedAt < 30min ago`
- **Marcar:** `estado: 'abandonado'`, `finAt: now`, calcular duración

#### Ticket 2.6: Sync métricas calidad a Firestore
- **Estado:** Pendiente
- **Detalle:** Cron 2am agrega métricas → sinc a campo `calidadInteracciones` en empresa
- **Métricas:** tasaExito, correccionesPromedio, sesiones7d

#### Ticket 2.7: Follow-up automático post-venta
- **Estado:** Pendiente
- **Dependencias:** mensajesProgramadosScheduler, estadoSaludService
- **Detalle:** Cadena de mensajes automáticos según estado de onboarding
- **Triggers:**
  - Día 0: Bienvenida + link validación
  - Día 1: Recordatorio 1er gasto (si no lo hizo)
  - Día 3: Pre-meet reminder
  - Día 7: Si score < 50%, nudge
  - Día 14: Si estado en_riesgo, alerta a CS

#### Ticket 2.8: API endpoints sesiones de flujo
- **Estado:** Pendiente
- **Crear:** `src/routes/flowSessionRoutes.js`

---

### Ola 3 — Expansión (Semana 4+)

#### Ticket 3.1: Módulo Nota de Pedido en onboarding
- Agregar config a `MODULOS_CONFIG`
- Hooks en flujos de nota de pedido
- Agregar módulo a usuarios de empresas con NP activo

#### Ticket 3.2: Módulo Acopio en onboarding
- Agregar config
- Hooks en flujos de acopio/remito
- Lógica especial: paso `crearAcopio` es a nivel empresa, no usuario

#### Ticket 3.3: Rol Toma Decisión
- Hooks en frontend (ver caja, crear filtro, crear reporte, etc.)
- Plazo de 30 días desde registro
- Score ponderado empresa: 0.4×Caja + 0.15×NP + 0.15×Acopio + 0.3×TD

#### Ticket 3.4: Dashboard matutino CS
- Panel full en frontend con: lista empresas por estado, drilldown, acciones
- Gráficos de tendencia

#### Ticket 3.5: Métricas de producto por flujo
- Vista interna con: flujo con peor tasa, campo más corregido, comparación foto/audio/texto
- Export a CSV

---

## 7. Consideraciones Técnicas

### 7.1 Idempotencia

`registrarPaso` es idempotente: si se llama 10 veces para el mismo paso, solo la primera tiene efecto. Esto es crítico porque los hooks se disparan en cada operación.

```javascript
// Si el paso ya está completado, no hace nada
if (onboarding.modulos.get(modulo)?.pasos.get(paso)?.completado) {
  return onboarding;
}
```

### 7.2 Performance

- Los hooks son fire-and-forget: no bloquean la operación principal.
- El recálculo de score empresa es O(n) donde n = usuarios de la empresa (típicamente <10).
- Los crons diarios procesan todas las empresas en batch. Si escala, se puede usar cursor streaming.
- Índices en MongoDB diseñados para las queries más frecuentes.

### 7.3 Persistencia de flowSessionId en state

@builderbot/bot mantiene `state` por número de teléfono. Cuando se hace `gotoFlow`, el state se preserva. Pero hay que verificar:

- ¿Se pierde el state si el usuario envía un mensaje que matchea otro keyword?
- ¿Se pierde en idle timeout?
- **Mitigación:** el cron de abandonadas cubre estos casos.

### 7.4 Tracking gaps conocidos

| Gap | Impacto | Mitigación |
|-----|---------|-----------|
| `editMovimiento` no guarda quién editó desde web | No se puede atribuir al usuario correcto | Campo `origen: 'web'` + se atribuye al profileId del token |
| `deleteMovimiento` sin audit trail | Idem | Idem |
| Login web no tiene tracking custom | No se detecta primer acceso web | Implementar hook en auth middleware (Ticket 1.4) |
| Flujos de WA no tienen instrumentación | No se mide calidad | Implementar FlowSession (Tickets 2.1-2.5) |

### 7.5 Migración de datos

Para clientes existentes (ya están usando Sorby antes de que exista el sistema):

1. **No crear onboarding retroactivo.** Solo aplica a clientes nuevos o a los que se les active manualmente.
2. **estadoSalud sí aplica a todos.** Se puede calcular con datos existentes (movimientos en Firestore).
3. **FlowSession solo hacia adelante.** No hay forma de reconstruir sesiones pasadas.

### 7.6 Patrón Mongoose del proyecto

Seguir el patrón existente para evitar errores de HMR/restart:

```javascript
const Model = mongoose.models.NombreModelo || mongoose.model('NombreModelo', Schema);
module.exports = Model;
```

Con `collection: 'nombre_coleccion'` explícito en las opciones del schema.

---

## 8. Diagrama de dependencias entre servicios

```
                    ┌──────────────────────┐
                    │   dataService.js     │
                    │  (saveMovimiento,    │
                    │   editMovimiento,    │
                    │   deleteMovimiento)  │
                    └──────────┬───────────┘
                               │ hooks (fire-and-forget)
                               ▼
                    ┌──────────────────────┐
                    │ onboardingCliente    │
                    │    Service.js        │
                    │  (registrarPaso,     │
                    │   recalcularScores)  │
                    └──────────┬───────────┘
                               │ sync scores
                               ▼
                    ┌──────────────────────┐
                    │   Firestore          │
                    │  empresas/{id}       │
                    │  .onboardingCliente  │
                    │  .estadoSalud        │
                    │  .calidadInteracc.   │
                    └──────────────────────┘
                               ▲
                               │ sync estado
                    ┌──────────┴───────────┐
                    │  estadoSalud         │
                    │    Service.js        │◄─── cron 6am
                    │  (calcularEstado)    │
                    └──────────┬───────────┘
                               │ lee de
                               ▼
                    ┌──────────────────────┐
                    │  analyticsService.js │
                    │  (métricas de uso    │
                    │   existentes)        │
                    └──────────────────────┘

    ┌──────────────────────┐
    │  Flujos WhatsApp     │
    │  (flowImage,         │
    │   flowIngresarDinero,│
    │   flowCorregir*, etc)│
    └──────────┬───────────┘
               │ hooks (fire-and-forget)
               ▼
    ┌──────────────────────┐
    │  flowSession         │
    │    Service.js        │
    │  (iniciar, corregir, │
    │   finalizar, cerrar) │
    └──────────┬───────────┘
               │ sync métricas
               ▼
          [Firestore]

    ┌──────────────────────┐
    │  reporteInterno      │
    │    Service.js        │◄─── cron 9am
    │  (genera + envía)    │
    └──────────┬───────────┘
               │ lee de
               ▼
    [estadoSaludService + onboardingClienteService + flowSessionService]
```

---

## 9. Testing

### Unitarios

| Test | Qué valida |
|------|-----------|
| `registrarPaso` idempotente | Llamar 2 veces al mismo paso, verificar que solo se marca 1 vez |
| `recalcularScores` con pesos | Score = suma ponderada de pasos completados |
| `determinarEstado` por caso | Cada combinación de métricas → estado correcto |
| `iniciarSesion` + `finalizarSesion` | Duración se calcula correctamente |
| `cerrarAbandonadas` | Solo cierra las que tienen >30min de inactividad |

### Integración

| Test | Qué valida |
|------|-----------|
| Crear movimiento → hook → onboarding actualizado | El flujo completo funciona end-to-end |
| Score empresa se actualiza en Firestore | La sincronización funciona |
| Cron de estado salud recalcula correctamente | Todas las empresas se procesan |
| FlowSession persiste entre gotoFlow | El sessionId sobrevive en state |

---

## 10. Archivos del proyecto (referencia rápida)

### Nuevos (por crear)
```
backend/
  src/
    models/
      OnboardingCliente.js    ✅ creado
      FlowSession.js          ○ pendiente (Ola 2)
    services/
      onboardingClienteService.js  ✅ creado
      flowSessionService.js        ○ pendiente (Ola 2)
      estadoSaludService.js        ○ pendiente (Ola 1)
      reporteInternoService.js     ○ pendiente (Ola 1)
    routes/
      onboardingClienteRoutes.js   ○ pendiente (Ola 1)
      estadoSaludRoutes.js         ○ pendiente (Ola 1)
      flowSessionRoutes.js         ○ pendiente (Ola 2)
```

### Existentes a modificar
```
backend/
  utils/
    dataService.js            ✅ modificado (hooks onboarding)
  flows/
    flowImage.js              ○ modificar (Ola 2, FlowSession hook)
    flowIngresarDinero.js     ○ modificar (Ola 2)
    flowCrearEgreso.js        ○ modificar (Ola 2)
    flowCorregirAhora.js      ○ modificar (Ola 2)
    flowCorregirMonto.js      ○ modificar (Ola 2)
    flowCorregirCategoria.js  ○ modificar (Ola 2)
    flowOK.js                 ○ modificar (Ola 2)
    flowCancelar.js           ○ modificar (Ola 2)
  app.api.js                  ○ modificar (Ola 1, registrar rutas)
```
