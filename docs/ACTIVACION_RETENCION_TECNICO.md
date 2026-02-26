# Proyecto Activación & Retención — Documento Técnico

> **Fecha:** Febrero 2026  
> **Autor:** Federico Maidan  
> **Estado:** En desarrollo — Iteración continua  
> **Scope:** Activación post-venta y retención de clientes. SDR comercial queda fuera de scope (ver `SDR-COMERCIAL-TECNICO.md`).

---

## Índice

1. [Arquitectura General](#1-arquitectura-general)
2. [Eje 1 — Onboarding Post-Venta](#2-eje-1--onboarding-post-venta)
3. [Eje 2 — Estado de Salud de Empresa](#3-eje-2--estado-de-salud-de-empresa)
4. [Eje 3 — Calidad de Interacciones WhatsApp](#4-eje-3--calidad-de-interacciones-whatsapp)
5. [Eje 4 — Automatizaciones y Comunicación Proactiva](#5-eje-4--automatizaciones-y-comunicación-proactiva)
6. [Eje 5 — Reportes y Valor Recurrente](#6-eje-5--reportes-y-valor-recurrente)
7. [Hooks y Side Effects](#7-hooks-y-side-effects)
8. [API Endpoints](#8-api-endpoints)
9. [Crons y Workers](#9-crons-y-workers)
10. [Sincronización Firestore](#10-sincronización-firestore)
11. [Plan de Implementación (Tickets Técnicos)](#11-plan-de-implementación-tickets-técnicos)
12. [Testing](#12-testing)
13. [Mapa de Archivos](#13-mapa-de-archivos)
14. [Consideraciones y Decisiones](#14-consideraciones-y-decisiones)

---

## 1. Arquitectura General

### Stack

| Componente | Tecnología |
|-----------|-----------|
| Backend | Express.js + Node.js |
| Base de datos principal | MongoDB (Mongoose) |
| Base de datos operativa | Firebase Firestore |
| Autenticación | Firebase Auth |
| Bot WhatsApp | @builderbot/bot + Baileys |
| Frontend | Next.js |
| Envío WA programado | Meta Cloud API + Baileys fallback |

### Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                         │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │ onboardingCliente  │  │  analyticsService   │                  │
│  │ Service            │  │  (932 líneas)       │                  │
│  │ (~577 líneas)      │  │  - métricas uso     │                  │
│  │ - tracking pasos   │  │  - ratioActivos     │                  │
│  │ - score módulo     │  │  - días sin uso     │                  │
│  │ - score empresa    │  └──────────┬─────────┘                  │
│  └──────────┬─────────┘             │                            │
│             │                       │                            │
│  ┌──────────▼─────────────────────  ▼──────────┐                 │
│  │           estadoSaludService (📋)            │                 │
│  │  - calcula estado diario                     │                 │
│  │  - detecta transiciones                      │                 │
│  │  - dispara alertas                           │                 │
│  └──────────┬──────────────────────────────────┘                 │
│             │                                                    │
│  ┌──────────▼─────────┐  ┌────────────────────┐                  │
│  │ flowSessionService │  │  followUpService    │                  │
│  │ (📋 por impl.)     │  │  (303 líneas)       │                  │
│  │ - sesiones WA      │  │  - cadenas eventos  │                  │
│  │ - correcciones     │  │  - acciones config. │                  │
│  │ - métricas calidad │  └──────────┬─────────┘                  │
│  └────────────────────┘             │                            │
│                          ┌──────────▼─────────┐                  │
│                          │ mensajesProgramados │                  │
│                          │ Scheduler           │                  │
│                          │ (222 líneas)        │                  │
│                          │ - envío diferido    │                  │
│                          │ - templates Meta    │                  │
│                          └────────────────────┘                  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │  eventService      │  │  reporteInterno     │                  │
│  │  (88 líneas)       │  │  Service (📋)       │                  │
│  │  - pub/sub interno │  │  - reporte diario   │                  │
│  └────────────────────┘  │  - alertas WA       │                  │
│                          └────────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐        ┌───────────┐        ┌──────────┐
    │ MongoDB │        │ Firestore │        │ WhatsApp │
    │         │        │           │        │ (Bot)    │
    └─────────┘        └───────────┘        └──────────┘
```

### Patrón de Mongoose

Todos los modelos siguen el patrón estándar del proyecto:

```javascript
const Model = mongoose.models.NombreModelo || mongoose.model('NombreModelo', schema);
```

Con `timestamps: true` y `collection:` explícito.

---

## 2. Eje 1 — Onboarding Post-Venta

### Estado: ✅ Parcialmente implementado (Módulo Caja)

### Modelo: OnboardingCliente

**Archivo:** `backend/src/models/OnboardingCliente.js`  
**Colección:** `onboarding_cliente`

```javascript
// PasoSchema (sub-documento)
{
  nombre:       String,    // 'crearGasto', 'editarGasto', etc.
  completado:   Boolean,   // default false
  fechaCompletado: Date,
  peso:         Number     // 0.0 - 1.0 (ej: 0.4 para crearGasto)
}

// ModuloSchema (sub-documento)
{
  nombre:       String,    // 'caja', 'notaPedido', 'acopio', 'tomaDecision'
  activo:       Boolean,   // default true
  pasos:        [PasoSchema],
  score:        Number,    // 0.0 - 1.0 calculado
  completado:   Boolean,
  fechaCompletado: Date
}

// OnboardingClienteSchema (documento principal)
{
  profileId:    String,    // required — ID del perfil en Firestore
  empresaId:    String,    // required — ID de la empresa
  phone:        String,    // teléfono del usuario
  rol:          String,    // 'cargador' | 'dueño' | 'admin'
  modulos:      Map<String, ModuloSchema>,  // Mongoose Map
  scoreGeneral: Number,    // 0.0 - 1.0
  timestamps:   true
}
```

**Índices:**
- `{ empresaId, profileId }` — unique
- `{ empresaId, phone }`

### Servicio: onboardingClienteService

**Archivo:** `backend/src/services/onboardingClienteService.js` (~577 líneas)

#### Funciones principales

| Función | Descripción | Estado |
|---------|------------|--------|
| `crearOnboarding(empresaId, profileId, phone, rol, modulosActivos)` | Crea documento con pasos pre-configurados | ✅ |
| `registrarPaso(empresaId, profileId, modulo, paso)` | Marca paso como completado (idempotente) | ✅ |
| `recalcularScores(onboardingDoc)` | Recalcula score por módulo y general | ✅ |
| `recalcularScoreEmpresa(empresaId)` | Promedia scores de todos los usuarios + sync Firestore | ✅ |
| `obtenerOnboarding(empresaId, profileId)` | Lee onboarding individual | ✅ |
| `obtenerOnboardingEmpresa(empresaId)` | Lee todos los onboardings de la empresa | ✅ |
| `obtenerResumenEmpresa(empresaId)` | Resumen con porcentajes por módulo | ✅ |

#### Configuración de módulos

```javascript
const MODULOS_CONFIG = {
  caja: {
    pasos: [
      { nombre: 'crearGasto', peso: 0.4 },
      { nombre: 'editarGasto', peso: 0.2 },
      { nombre: 'eliminarGasto', peso: 0.2 },
      { nombre: 'accederWeb', peso: 0.2 }
    ]
  }
  // Futuros: notaPedido, acopio, tomaDecision
};
```

#### Score empresa ponderado

```javascript
const PESOS_MODULOS = {
  soloCAja: { caja: 0.7, tomaDecision: 0.3 },
  todos:    { caja: 0.4, notaPedido: 0.15, acopio: 0.15, tomaDecision: 0.3 }
};
```

#### Hooks implementados en dataService.js

Los hooks se disparan como **fire-and-forget** (no bloquean la operación principal):

```javascript
// En save() de movimiento (~línea 508)
onboardingClienteService.registrarPaso(empresaId, profileId, 'caja', 'crearGasto')
  .catch(err => console.error('[Onboarding hook]', err));

// En edit() de movimiento (~línea 651)
onboardingClienteService.registrarPaso(empresaId, profileId, 'caja', 'editarGasto')
  .catch(err => console.error('[Onboarding hook]', err));

// En delete() de movimiento (~línea 693)
onboardingClienteService.registrarPaso(empresaId, profileId, 'caja', 'eliminarGasto')
  .catch(err => console.error('[Onboarding hook]', err));
```

### Por implementar

| Componente | Detalle |
|-----------|---------|
| Hook acceso web | Detectar primera visita a la app web y registrar paso `accederWeb` |
| Módulo Nota Pedido | `crearEditarNota` (0.5) + `accederWeb` (0.5) |
| Módulo Acopio | `crearAcopio` (0.3) + `registrarRemito` (0.4) + `accederWeb` (0.3) |
| Módulo Toma Decisión | 5 pasos × 0.2 cada uno, ventana 30 días |
| Creación automática | Al dar de alta cliente, crear onboarding para cada perfil |

---

## 3. Eje 2 — Estado de Salud de Empresa

### Estado: 📋 Diseñado, por implementar

### Modelo propuesto: EstadoSaludEmpresa

**Archivo futuro:** `backend/src/models/EstadoSaludEmpresa.js`  
**Colección:** `estado_salud_empresa`

```javascript
{
  empresaId:         String,     // required, unique
  estado:            String,     // enum: onboarding | activo | en_riesgo | inactivo | churneado
  estadoAnterior:    String,     // para detectar transiciones
  fechaCambioEstado: Date,
  metricas: {
    movimientosUltimos7d:  Number,
    ratioUsuariosActivos:  Number,  // 0.0 - 1.0
    diasSinUso:            Number,
    ratioOnboardingPaso2:  Number,  // 0.0 - 1.0
    scoreOnboarding:       Number   // 0.0 - 1.0
  },
  historial: [{
    estado:     String,
    fecha:      Date,
    motivo:     String    // ej: "ratioActivos < 0.3"
  }],
  timestamps: true
}
```

### Servicio propuesto: estadoSaludService

| Función | Descripción |
|---------|------------|
| `calcularEstadoEmpresa(empresaId)` | Recopila métricas + aplica reglas → retorna estado |
| `actualizarTodas()` | Itera todas las empresas activas, recalcula y guarda |
| `detectarTransicion(empresaId, estadoNuevo)` | Compara con anterior, dispara acción si cambió |
| `obtenerEstado(empresaId)` | Lee estado actual |
| `obtenerEmpresas(filtro)` | Lista empresas por estado |

### Reglas de cálculo

```javascript
function calcularEstado(metricas, diasComoCliente) {
  if (diasComoCliente < 30) return 'onboarding';
  
  if (metricas.diasSinUso > 30) return 'churneado';
  if (metricas.diasSinUso > 14) return 'inactivo';
  
  if (metricas.ratioUsuariosActivos < 0.3 || 
      metricas.diasSinUso > 5 ||
      metricas.ratioOnboardingPaso2 < 0.5) return 'en_riesgo';
  
  if (metricas.ratioUsuariosActivos >= 0.5 && 
      metricas.ratioOnboardingPaso2 >= 0.5) return 'activo';
  
  return 'en_riesgo'; // default conservador
}
```

### Acciones por transición

```javascript
const ACCIONES_TRANSICION = {
  'onboarding→en_riesgo':  { tipo: 'alerta_cs', urgencia: 'alta' },
  'activo→en_riesgo':      { tipo: 'alerta_cs_nudge', urgencia: 'media' },
  'en_riesgo→inactivo':    { tipo: 'escalado_personal', urgencia: 'alta' },
  'inactivo→churneado':    { tipo: 'post_mortem', urgencia: 'baja' },
  'en_riesgo→activo':      { tipo: 'desactivar_nudges', urgencia: 'info' }
};
```

### Fuentes de datos

| Métrica | Servicio fuente | Método |
|---------|----------------|--------|
| movimientosUltimos7d | analyticsService | `getMovimientosCount(empresaId, 7)` |
| ratioUsuariosActivos | analyticsService | `getRatioUsuariosActivos(empresaId)` |
| diasSinUso | analyticsService | `getDiasSinUso(empresaId)` |
| ratioOnboardingPaso2 | onboardingClienteService | `obtenerResumenEmpresa(empresaId)` |
| scoreOnboarding | onboardingClienteService | `obtenerResumenEmpresa(empresaId)` |

---

## 4. Eje 3 — Calidad de Interacciones WhatsApp

### Estado: 📋 Diseñado, por implementar

### Modelo propuesto: FlowSession

**Archivo futuro:** `backend/src/models/FlowSession.js`  
**Colección:** `flow_sessions`

```javascript
// CorreccionSchema (sub-documento)
{
  campo:     String,     // 'categoría', 'total', 'proveedor', etc.
  tipo:      String,     // 'voluntaria' | 'forzada'
  timestamp: Date
}

// FlowSessionSchema
{
  empresaId:    String,     // required
  profileId:    String,     // required
  phone:        String,     // required
  flujo:        String,     // 'crearEgreso', 'crearIngreso', 'editarMovimiento', etc.
  estado:       String,     // enum: en_curso | completado | cancelado | abandonado | error
  origenInput:  String,     // 'foto' | 'audio' | 'texto' | 'documento' | 'mixto'
  iniciadoEn:   Date,
  finalizadoEn: Date,
  duracionMs:   Number,     // calculado al finalizar
  correcciones: [CorreccionSchema],
  totalCorrecciones: Number,
  metadata: {
    flowName:     String,   // nombre técnico del flow de @builderbot
    movimientoId: String,   // ID del movimiento resultante (si aplica)
    error:        String    // descripción del error (si estado = error)
  },
  timestamps: true
}
```

**Índices:**
- `{ empresaId, profileId, iniciadoEn: -1 }`
- `{ empresaId, flujo, estado }`
- `{ estado, iniciadoEn }` — para cron de abandonadas

### Servicio propuesto: flowSessionService

| Función | Descripción |
|---------|------------|
| `iniciarSesion(empresaId, profileId, phone, flujo, origenInput)` | Crea sesión en estado `en_curso` |
| `registrarCorreccion(sessionId, campo, tipo)` | Agrega corrección a sesión activa |
| `finalizarSesion(sessionId, estado, metadata)` | Cierra sesión, calcula duración |
| `cerrarAbandonadas()` | Marca como `abandonado` sesiones > 30min sin cierre |
| `obtenerMetricasUsuario(empresaId, profileId, periodo)` | Tasa éxito, correcciones promedio |
| `obtenerMetricasEmpresa(empresaId, periodo)` | Agregado de todos los usuarios |
| `obtenerMetricasPorFlujo(flujo, periodo)` | Para equipo de producto |

### Puntos de hook en flujos del bot

Los hooks se insertan en los flujos de @builderbot/bot:

```javascript
// Al iniciar un flujo de carga (ej: flowCrearEgreso)
await flowSessionService.iniciarSesion(empresaId, profileId, phone, 'crearEgreso', 'foto');

// Cuando el usuario corrige un campo
await flowSessionService.registrarCorreccion(sessionId, 'categoría', 'voluntaria');

// Al finalizar exitosamente
await flowSessionService.finalizarSesion(sessionId, 'completado', { movimientoId });

// Al cancelar
await flowSessionService.finalizarSesion(sessionId, 'cancelado');

// Al producirse un error
await flowSessionService.finalizarSesion(sessionId, 'error', { error: err.message });
```

### Métricas calculadas

```javascript
// Tasa de éxito
tasaExito = sesiones.filter(s => s.estado === 'completado').length / sesiones.length;

// Correcciones promedio (solo completadas)
correccionesPromedio = completadas.reduce((sum, s) => sum + s.totalCorrecciones, 0) / completadas.length;

// Tiempo promedio por flujo
tiempoPromedio = completadas.reduce((sum, s) => sum + s.duracionMs, 0) / completadas.length;

// Campos más corregidos (para producto)
camposRanking = correcciones.reduce((acc, c) => { acc[c.campo] = (acc[c.campo] || 0) + 1; return acc; }, {});
```

---

## 5. Eje 4 — Automatizaciones y Comunicación Proactiva

### Estado: 📋 Diseñado (infraestructura de envío implementada)

### Infraestructura existente

#### followUpService (303 líneas)

Motor de cadenas de eventos. Actualmente se usa para follow-up de leads, pero la arquitectura soporta cualquier cadena:

```javascript
// Estructura de una cadena
{
  tipo: 'post_venta',           // tipo de cadena
  empresaId: '...',
  contacto: { phone, nombre },
  etapaActual: 2,               // 0-indexed
  etapas: [
    {
      nombre: 'bienvenida',
      delay: 0,                 // minutos
      accion: 'enviar_mensaje',
      template: 'bienvenida_cliente',
      completada: true
    },
    // ... más etapas
  ],
  estado: 'en_curso'            // en_curso | completado | cancelado
}
```

#### mensajesProgramadosScheduler (222 líneas)

Sistema de envío diferido:
- Soporte Meta Cloud API (templates aprobados) + Baileys (mensajes libres)
- Ventana de 24h de Meta
- Cola con reintentos
- Soporte adjuntos (PDF, imágenes)

### Modelo propuesto: CadenaPostVenta

**Archivo futuro:** `backend/src/models/CadenaPostVenta.js`

Extiende el concepto de followUpService para la cadena de 13 automatizaciones:

```javascript
{
  empresaId:       String,
  tipo:            'post_venta',
  destinatarios:   [{ profileId, phone, nombre }],
  etapas: [{
    codigo:        String,    // 'A1', 'A2', ..., 'A13'
    nombre:        String,
    trigger:       String,    // condición para disparar
    accion:        String,    // tipo de acción
    ejecutada:     Boolean,
    fechaEjecucion: Date,
    resultado:     String     // 'enviado' | 'skipped' | 'error'
  }],
  estado:          String,    // 'en_curso' | 'completada'
  iniciadaEn:      Date,
  timestamps: true
}
```

### Nudges inteligentes

Los nudges se manejan como eventos reactivos, no como cadena secuencial:

```javascript
// Modelo: NudgeConfig (estático, puede estar en config)
const NUDGES = {
  'usuario_inactivo_5d': {
    condicion: (user) => user.diasSinUso >= 5,
    template: 'nudge_inactivo',
    destino: 'usuario',
    cooldown: 7 * 24 * 60 * 60 * 1000 // no repetir en 7 días
  },
  'onboarding_completo_caja': {
    condicion: (user) => user.onboarding.modulos.caja.completado,
    template: 'felicitacion_caja',
    destino: 'usuario',
    unaVez: true
  },
  'cancelaciones_seguidas_3': {
    condicion: (sessions) => ultimasCancelaciones(sessions) >= 3,
    template: 'alerta_cancelaciones',
    destino: 'cs',
    cooldown: 24 * 60 * 60 * 1000
  },
  // ... más nudges
};
```

### Mensajes de valor al dueño

```javascript
// Semanal (cron domingos 10am)
async function enviarResumenSemanal(empresaId) {
  const stats = await analyticsService.getResumenSemanal(empresaId);
  const mensaje = `Esta semana tu equipo cargó ${stats.cantGastos} gastos por $${stats.totalGastos}. Ver resumen → ${link}`;
  await mensajesProgramadosScheduler.programar(dueno.phone, mensaje);
}

// Mensual (cron primer día del mes)
async function enviarResumenMensual(empresaId) {
  const pdf = await generarPDFResumen(empresaId, mesAnterior);
  await mensajesProgramadosScheduler.programar(dueno.phone, 'Tu resumen mensual', { adjunto: pdf });
}
```

---

## 6. Eje 5 — Reportes y Valor Recurrente

### Estado: Parcialmente implementado (presupuestos ✅, reportes 📋)

### Reportes (diseñado — frontend)

**Motor de cómputo:** corre en frontend (Next.js) consultando movimientos de Firestore

```javascript
// Estructura de un reporte
{
  templateId:    String,      // 'estado_obra' | 'caja_general' | etc.
  empresaId:     String,
  filtros: {
    fechaDesde:  Date,
    fechaHasta:  Date,
    proyectoId:  String,
    categorias:  [String],
    proveedores: [String]
  },
  configuracion: {
    moneda:      String,      // 'ARS' | 'USD' | 'CAC'
    agrupacion:  String       // 'mensual' | 'semanal' | 'diario'
  }
}
```

### Presupuestos de Control (implementado)

El presupuesto de control vinculado a un proyecto calcula automáticamente:

```javascript
// Para cada rubro del presupuesto
ejecutado = movimientos
  .filter(m => m.proyectoId === presupuesto.proyectoId && m.categoria === rubro.categoria)
  .reduce((sum, m) => sum + m.total, 0);

porcentaje = ejecutado / rubro.presupuestado;
// Si porcentaje > 1.0 → sobreejecución (alerta)
```

### Portal Cliente

Frontend independiente (datos mock actualmente). Accesible por link único (`/portal/:token`).  
Cuando tenga datos reales, será un diferenciador de retención fuerte.

---

## 7. Hooks y Side Effects

### 7.1 Hooks en dataService.js (✅ implementados)

| Operación | Hook | Servicio destino |
|-----------|------|-----------------|
| `save()` movimiento | `registrarPaso('caja', 'crearGasto')` | onboardingClienteService |
| `edit()` movimiento | `registrarPaso('caja', 'editarGasto')` | onboardingClienteService |
| `delete()` movimiento | `registrarPaso('caja', 'eliminarGasto')` | onboardingClienteService |

**Patrón:** fire-and-forget con `.catch(console.error)`. No bloquean la operación principal.

### 7.2 Hooks futuros en flujos del bot

| Flujo | Evento | Hook |
|-------|--------|------|
| Cualquier flujo de carga | Inicio | `flowSessionService.iniciarSesion()` |
| Cualquier flujo de carga | Corrección | `flowSessionService.registrarCorreccion()` |
| Cualquier flujo de carga | Fin exitoso | `flowSessionService.finalizarSesion('completado')` |
| Cualquier flujo de carga | Cancelación | `flowSessionService.finalizarSesion('cancelado')` |
| Cualquier flujo de carga | Error | `flowSessionService.finalizarSesion('error')` |

### 7.3 Hooks futuros en frontend (acceso web)

| Evento | Hook | Servicio |
|--------|------|---------|
| Primera visita a `/caja` | `registrarPaso('caja', 'accederWeb')` | onboardingClienteService |
| Primera visita a `/notas` | `registrarPaso('notaPedido', 'accederWeb')` | onboardingClienteService |
| Primera visita a `/acopios` | `registrarPaso('acopio', 'accederWeb')` | onboardingClienteService |
| Ver caja (dueño) | `registrarPaso('tomaDecision', 'verCaja')` | onboardingClienteService |
| Crear filtro (dueño) | `registrarPaso('tomaDecision', 'crearFiltro')` | onboardingClienteService |
| Crear reporte (dueño) | `registrarPaso('tomaDecision', 'crearReporte')` | onboardingClienteService |
| Exportar PDF (dueño) | `registrarPaso('tomaDecision', 'exportarPDF')` | onboardingClienteService |

---

## 8. API Endpoints

### 8.1 Onboarding

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/onboarding/:empresaId` | Todos los onboardings de la empresa |
| GET | `/api/onboarding/:empresaId/:profileId` | Onboarding individual |
| GET | `/api/onboarding/:empresaId/resumen` | Resumen con scores por módulo |
| POST | `/api/onboarding/:empresaId/:profileId/paso` | Registrar paso (body: `{modulo, paso}`) |
| POST | `/api/onboarding/:empresaId/recalcular` | Forzar recálculo de scores |

### 8.2 Estado de Salud

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/salud/:empresaId` | Estado actual de la empresa |
| GET | `/api/salud` | Lista todas con filtro (`?estado=en_riesgo`) |
| GET | `/api/salud/:empresaId/historial` | Historial de cambios de estado |
| POST | `/api/salud/recalcular` | Forzar recálculo de todas |

### 8.3 Sesiones de Flujo (Calidad WA)

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/flow-sessions/:empresaId` | Sesiones de la empresa (paginado) |
| GET | `/api/flow-sessions/:empresaId/metricas` | Métricas agregadas |
| GET | `/api/flow-sessions/:empresaId/:profileId/metricas` | Métricas por usuario |
| GET | `/api/flow-sessions/metricas-producto` | Métricas globales por flujo (para producto) |

### 8.4 Vista Unificada (Panel CS)

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/empresa/:empresaId/vista-completa` | Agrega: onboarding + salud + métricas WA + actividad |
| POST | `/api/empresa/:empresaId/enviar-recordatorio` | Envía nudge manual a usuario(s) |

### 8.5 Reporte Interno

| Método | Ruta | Descripción |
|--------|------|------------|
| GET | `/api/reporte-interno/diario` | Genera reporte diario bajo demanda |
| POST | `/api/reporte-interno/enviar` | Fuerza envío del reporte al grupo WA |

---

## 9. Crons y Workers

| Cron | Horario | Servicio | Descripción |
|------|---------|----------|------------|
| Cálculo estado salud | 06:00 | estadoSaludService | Recalcula estado de todas las empresas |
| Reporte diario interno | 09:00 | reporteInternoService | Genera y envía reporte por WhatsApp al equipo |
| Cerrar sesiones abandonadas | */30 * * * * | flowSessionService | Marca sesiones >30min como abandonadas |
| Evaluar cadenas post-venta | 08:00 | followUpService | Verifica triggers de cada etapa pendiente |
| Resumen semanal al dueño | Dom 10:00 | mensajesProgramadosScheduler | Envía resumen semanal a cada dueño |
| Resumen mensual al dueño | 1° del mes 10:00 | mensajesProgramadosScheduler | Genera PDF y envía |
| Evaluar nudges inteligentes | 10:00 | nudgeService | Evalúa condiciones y envía nudges |

---

## 10. Sincronización Firestore

### Datos que se sincronizan de Mongo → Firestore

| Dato | Colección Firestore | Campo | Trigger |
|------|---------------------|-------|---------|
| Score onboarding empresa | `empresas/{id}` | `onboarding.scoreGeneral` | Cada recálculo de score |
| Estado de salud | `empresas/{id}` | `estadoSalud` | Cada cambio de estado |
| Métricas calidad WA | `empresas/{id}` | `metricas.tasaExitoWA` | Diario (cron) |

### Datos que se leen de Firestore → Servicios Mongo

| Dato | Colección Firestore | Consumidor |
|------|---------------------|-----------|
| Movimientos (conteo, último) | `empresas/{id}/movimientos` | analyticsService, estadoSaludService |
| Perfiles de empresa | `empresas/{id}/profile` | onboardingClienteService (para crear docs) |
| Info empresa (fecha alta, plan) | `empresas/{id}` | estadoSaludService (días como cliente) |

### Principio

- **MongoDB es la fuente de verdad** para datos de activación/retención
- **Firestore recibe solo resúmenes** para que el frontend los lea sin queries pesadas
- **Firestore es fuente de verdad** para datos operativos (movimientos, perfiles, empresas)

---

## 11. Plan de Implementación (Tickets Técnicos)

### Ola 1 — Fundamentos (Semana 1-2)

| Ticket | Descripción | Dependencias | Estimación |
|--------|-------------|-------------|------------|
| 1.1 | Crear modelo EstadoSaludEmpresa + servicio base | analyticsService existente | 1 día |
| 1.2 | Cron de cálculo de estado diario (6am) | 1.1 | 0.5 días |
| 1.3 | Acciones de transición (alertas a CS por WA) | 1.1 + mensajesProgramados | 1 día |
| 1.4 | Hook de acceso web (primera visita por sección) | onboardingClienteService | 0.5 días |
| 1.5 | API endpoints: onboarding + estadoSalud | 1.1 + existente | 1 día |
| 1.6 | reporteInternoService: reporte diario por WA | 1.1 + mensajesProgramados | 1 día |
| 1.7 | Vista empresa en frontend (panel CS básico) | 1.5 | 2 días |

### Ola 2 — Calidad WA + Automatizaciones (Semana 3-4)

| Ticket | Descripción | Dependencias | Estimación |
|--------|-------------|-------------|------------|
| 2.1 | Crear modelo FlowSession + flowSessionService | — | 1 día |
| 2.2 | Hooks en flujos del bot (inicio/fin/corrección) | 2.1 | 2 días |
| 2.3 | Cron cerrar sesiones abandonadas | 2.1 | 0.5 días |
| 2.4 | Métricas agregadas (por usuario/empresa/flujo) | 2.1 | 1 día |
| 2.5 | Sync métricas calidad → Firestore | 2.4 | 0.5 días |
| 2.6 | CadenaPostVenta modelo + wiring con followUp | followUpService | 1 día |
| 2.7 | Implementar 13 automatizaciones (A1→A13) | 2.6 + mensajesProgramados | 2 días |
| 2.8 | Nudges inteligentes (evaluación + envío) | estadoSaludService + 2.1 | 1 día |
| 2.9 | API endpoints: sesiones de flujo + métricas | 2.1 | 0.5 días |

### Ola 3 — Expansión y Valor (Semana 5+)

| Ticket | Descripción | Dependencias | Estimación |
|--------|-------------|-------------|------------|
| 3.1 | Módulos onboarding: Nota Pedido + Acopio | onboardingClienteService | 1 día |
| 3.2 | Módulo onboarding: Toma Decisión | onboardingClienteService | 1 día |
| 3.3 | Score empresa multi-módulo ponderado | 3.1 + 3.2 | 0.5 días |
| 3.4 | Módulo reportes frontend (MVP) | Diseño existente | 3 días |
| 3.5 | PDF resumen mensual | generarPDF existente | 1 día |
| 3.6 | Mensajes valor periódicos (semanal + eventual) | analyticsService | 1 día |
| 3.7 | Dashboard matutino CS (frontend completo) | todas las APIs | 2 días |
| 3.8 | Portal cliente datos reales | Portal mock existente | 2 días |

---

## 12. Testing

### Unit Tests

| Servicio | Tests clave |
|----------|------------|
| onboardingClienteService | Crear onboarding, registrar paso idempotente, recalcular scores, score empresa ponderado |
| estadoSaludService | Cada regla de estado, transiciones, acción correcta por transición |
| flowSessionService | Crear/cerrar sesión, registrar corrección, cerrar abandonadas, métricas agregadas |
| reporteInternoService | Generación de contenido, formato correcto |

### Integration Tests

| Test | Descripción |
|------|------------|
| Hook dataService → onboarding | Verificar que crear/editar/eliminar movimiento registra paso |
| Cron estadoSalud | Verificar que recalcula y guarda para todas las empresas |
| Cadena post-venta E2E | Crear empresa → verificar que se disparan A1+A2 → simular día 1 sin uso → A3 |
| Nudge inteligente | Simular 3 cancelaciones → verificar alerta a CS |

### Datos de prueba

```javascript
// Empresa de prueba para QA
const EMPRESA_TEST = {
  id: 'test_activacion_001',
  nombre: 'Constructora Test',
  perfiles: [
    { id: 'p1', nombre: 'Carlos', rol: 'dueño', phone: '5491100000001' },
    { id: 'p2', nombre: 'Juan', rol: 'cargador', phone: '5491100000002' },
    { id: 'p3', nombre: 'María', rol: 'cargador', phone: '5491100000003' }
  ]
};
```

---

## 13. Mapa de Archivos

### Existentes (ya implementados)

```
backend/
├── src/
│   ├── models/
│   │   └── OnboardingCliente.js          # ✅ Modelo onboarding por usuario
│   └── services/
│       ├── onboardingClienteService.js   # ✅ Servicio completo onboarding
│       ├── analyticsService.js           # ✅ Métricas de uso (932 líneas)
│       ├── followUpService.js            # ✅ Motor de cadenas de eventos
│       └── mensajesProgramadosScheduler.js # ✅ Envío diferido WA
├── utils/
│   └── dataService.js                    # ✅ Hooks de onboarding inyectados
└── flows/
    └── (flujos @builderbot existentes)
```

### Por crear

```
backend/
├── src/
│   ├── models/
│   │   ├── EstadoSaludEmpresa.js         # 📋 Ola 1
│   │   ├── FlowSession.js               # 📋 Ola 2
│   │   └── CadenaPostVenta.js            # 📋 Ola 2
│   └── services/
│       ├── estadoSaludService.js         # 📋 Ola 1
│       ├── flowSessionService.js         # 📋 Ola 2
│       ├── reporteInternoService.js      # 📋 Ola 1
│       └── nudgeService.js              # 📋 Ola 2
├── test/
│   ├── onboardingCliente.test.js         # 📋 Ola 1
│   ├── estadoSalud.test.js              # 📋 Ola 1
│   ├── flowSession.test.js              # 📋 Ola 2
│   └── cadenaPostVenta.test.js          # 📋 Ola 2
app-web/
├── src/
│   ├── sections/
│   │   └── empresa-salud/               # 📋 Ola 1 (panel CS)
│   └── pages/
│       └── dashboard-cs/                # 📋 Ola 3
```

---

## 14. Consideraciones y Decisiones

### ¿Por qué MongoDB para onboarding y no Firestore?

- **Queries complejas:** Necesitamos aggregations (promedio de scores, filtros por módulo, por empresa) que son costosas en Firestore.
- **Costos:** Firestore cobra por lectura. Un cron diario que lee 100 empresas × N perfiles se vuelve caro.
- **Consistencia:** Los datos de activación/retención son analíticos, no operativos. No necesitan real-time listeners.
- **Patrón:** MongoDB como fuente de verdad para analytics, Firestore recibe solo resúmenes para el frontend.

### ¿Por qué fire-and-forget en los hooks?

- La operación principal (crear/editar/eliminar movimiento) NO debe fallar porque el tracking de onboarding falló.
- El tracking es eventual: si se pierde un evento, el siguiente lo compensará (los pasos son idempotentes).
- Logging del error para monitoreo.

### ¿Por qué no tracking en tiempo real?

- El onboarding es un proceso de días/semanas, no de segundos.
- Las métricas se consumen en dashboards y reportes diarios, no en tiempo real.
- Reducir complejidad y costos: un cron diario es más simple que listeners en tiempo real.

### ¿Por qué WhatsApp para reportes internos?

- El equipo de CS ya vive en WhatsApp.
- Un reporte por WhatsApp tiene mayor tasa de lectura que un email.
- La infraestructura de envío ya existe (mensajesProgramadosScheduler).
- Futuro: migrar a Slack si el equipo crece.

### Scope de SDR

La adquisición y calificación de leads (SDR comercial) tiene documentación técnica propia en `SDR-COMERCIAL-TECNICO.md`. El código del SDR (ContactoSDR, sdrService, leadContactoBridge) está implementado en la rama `Feat/comercial-nuevo-eje` pero queda fuera del scope de este proyecto de activación y retención.
