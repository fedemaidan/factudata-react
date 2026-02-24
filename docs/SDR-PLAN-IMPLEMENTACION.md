# Plan de Implementación — Rediseño Módulo Comercial SDR

> **Fecha**: 24/02/2026  
> **Optimizado para**: Agentes de programación (Claude Opus 4.6)  
> **Documentos fuente**: [SDR-COMERCIAL-FUNCIONAL.md](SDR-COMERCIAL-FUNCIONAL.md) · [SDR-COMERCIAL-TECNICO.md](SDR-COMERCIAL-TECNICO.md)  
> **Branch**: `Feat/comercial-nuevo-eje`

---

## Convenciones del Plan

- **Cada tarea = 1 prompt para un agente**. El agente recibe el contexto y ejecuta.
- **Dependencias explícitas**: no empezar una tarea sin que sus deps estén completas.
- **Criterios de aceptación**: cada tarea tiene condiciones verificables (tests, lint, compilación).
- **Archivos exactos**: se listan los archivos a leer, modificar o crear.
- Las tareas están numeradas `F{fase}.{grupo}.{secuencia}` (ej: `F1.1.1`).

---

## Mapa de Dependencias (Fase 1)

```
F1.1.1 normalizarTelefono ──┐
F1.1.2 calcularPrioridad ───┤
                             ├──▶ F1.2.1 ContactoSDR ──┐
F1.1.3 sdrConstants (FE) ───┘                          │
                                                        ├──▶ F1.3.1 sdrService (BE)
F1.2.2 ReunionSDR ──────────────────────────────────────┤
F1.2.3 HistorialSDR ────────────────────────────────────┘
                                                               │
         F1.3.1 sdrService (BE) ──┐                            │
                                   ├──▶ F1.3.2 sdrController ──┤
                                   │    F1.3.3 sdrRoutes ──────┘
                                   │
                                   ├──▶ F1.4.1 leadContactoBridge
                                   │    F1.4.2 flowInicioGeneral
                                   │    F1.4.3 flowOnboardingConstructora
                                   │    F1.4.4 flowOnboardingInfo
                                   │    F1.4.5 botTimeoutJob
                                   │
                                   └──▶ F1.5.x Frontend (paralelo)
                                        F1.5.1 contactosSDR
                                        F1.5.2 gestionSDR
                                        F1.5.3 DrawerDetalle
                                        F1.5.4 ModalRegistrarAccion
                                        F1.5.5 ModalImportarExcel
                                        F1.5.6 ModalAgregarContacto
                                        F1.5.7 sdrService (FE)
                                        F1.5.8 componentes nuevos

F1.6.1 migracion (último, cuando todo funciona)
```

---

## Fase 1: Estados + Scoring + Loop de Llamadas + Puente Lead↔ContactoSDR

### Grupo 1 — Utilidades (sin dependencias, ejecutar en paralelo)

---

#### F1.1.1 — Crear `normalizarTelefono.js`

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🔴 Crítica (bloqueante para F1.2.1, F1.4.1)

**Contexto para el agente**:
> Necesitamos una función de normalización de teléfonos argentinos que será la clave de deduplicación universal del sistema. Se usa en: importación de contactos, puente bot→ContactoSDR, búsqueda de duplicados. Todos los teléfonos del sistema deben pasar por esta función antes de guardarse o compararse.

**Archivos a crear**:
- `backend/utils/normalizarTelefono.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.6, "Normalización de teléfono")
- `backend/utils/convertMoney.js` (para ver estilo del proyecto en utils)

**Especificación**:
```
Función: normalizarTelefono(phone) → string|null
Reglas de normalización (Argentina):
- Limpiar +, espacios, guiones, paréntesis
- 0XX... → 549XX... (quitar el 0, agregar 549)
- 10 dígitos sin 54 → agregar 549 al inicio
- 12 dígitos 54XX → 549XX (insertar 9 después del 54)
- 15XXXXXXXX (10 dígitos) → 54911XXXXXXXX (asumiendo CABA/GBA)
- null/undefined/vacío → return null
Exportar: module.exports = { normalizarTelefono }
```

**Tests a crear** (`backend/test/normalizarTelefono.test.js`):
```
Casos:
- "+54 9 11 4567-8900" → "5491145678900"
- "01145678900" → "54911456789 00"  
- "1145678900" → "5491145678900"
- "541145678900" → "5491145678900"
- "15 4567 8900" → "54911456789 00"
- null → null
- "" → null
- "5491145678900" → "5491145678900" (ya normalizado)
```

**Criterios de aceptación**:
- [ ] `normalizarTelefono` exportada correctamente
- [ ] Todos los tests pasan
- [ ] No tiene dependencias externas

---

#### F1.1.2 — Crear `calcularPrioridad.js`

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🔴 Crítica (bloqueante para F1.2.1, F1.3.1)

**Contexto para el agente**:
> Sistema de scoring que prioriza contactos automáticamente. Se recalcula después de cada acción del SDR. El score determina el orden en que aparecen los contactos en la lista y en el modo llamadas. Tiene 9 factores ponderados.

**Archivos a crear**:
- `backend/utils/calcularPrioridad.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.4)

**Especificación**:
```
Exportar: { calcularPrioridadScore, PLANES_SORBY }

PLANES_SORBY = {
  a_medida: { score: 500, label: 'A medida', precio: null },
  premium:  { score: 400, label: 'Premium',  precio: 625000 },
  avanzado: { score: 250, label: 'Avanzado', precio: 375000 },
  basico:   { score: 150, label: 'Básico',   precio: 250000 }
}

calcularPrioridadScore(contacto, reuniones = []) → Number
  Factor 1: Próximo contacto vencido (+100/día, max 500)
  Factor 2: Plan estimado (score de PLANES_SORBY)
  Factor 3: Intención de compra (alta:300, media:200, baja:100)
  Factor 4: precalificacionBot (quiere_meet:200, calificado:100, sin_calificar:30, no_llego:0)
  Factor 5: Tamaño empresa ('200+':100, '51-200':60, '11-50':30, '1-10':10)
  Factor 6: Frescura (≤1d:200, ≤7d:150, ≤14d:100, ≤30d:50)
  Factor 7: Estado (cierre:300, calificado:150, contactado:100, nuevo:80, revisar:30, no_contacto:10)
  Factor 8: Reuniones (agendada:+250, realizada:+200)
  Factor 9: Sin próximo contacto (-50)
```

**Tests a crear** (`backend/test/calcularPrioridad.test.js`):
```
Casos:
- Contacto nuevo sin datos → score bajo (80 + frescura)
- Contacto con plan premium + intención alta + bot quiere_meet → score alto
- Contacto con próximo contacto vencido 3 días → +300
- Contacto con reunión agendada → +250
- Contacto sin próximo contacto → -50
- PLANES_SORBY exporta correctamente los 4 planes
```

**Criterios de aceptación**:
- [ ] Ambas exports funcionan
- [ ] Score es siempre un número (no NaN)
- [ ] Todos los tests pasan

---

#### F1.1.3 — Crear `sdrConstants.js` (Frontend)

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🔴 Crítica (bloqueante para todo el frontend)

**Contexto para el agente**:
> Hoy las constantes de estados SDR están inline en `gestionSDR.js` (línea 49) con solo 6 estados. Necesitamos un archivo centralizado con los 10 estados nuevos + planes + intenciones + precalificación bot + estados de reunión. Todos los componentes frontend importarán de aquí.

**Archivos a crear**:
- `app-web/src/constant/sdrConstants.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.9, "Constantes actualizadas v2")
- `app-web/src/pages/gestionSDR.js` (líneas 49-60, para ver formato actual de constantes)
- `app-web/src/constant/importSteps.js` (para ver estilo de constantes del proyecto)

**Especificación**:
```
Exportar:
- ESTADOS_CONTACTO (10 estados con label, color, icon, emoji)
- PLANES_SORBY (4 planes con label, color, precio, icon)
- INTENCIONES_COMPRA (3 niveles con label, color, icon)
- PRECALIFICACION_BOT (4 valores con label, color, icon)
- ESTADOS_REUNION (4 estados con label, color, icon)

Nota: los icons son componentes MUI (FiberNewIcon, PhoneIcon, StarIcon, etc.).
Importar de '@mui/icons-material'.
```

**Criterios de aceptación**:
- [ ] Archivo exporta las 5 constantes
- [ ] Los icons importan correctamente de MUI
- [ ] No hay errores de lint

---

### Grupo 2 — Modelos de datos (dependen del Grupo 1)

---

#### F1.2.1 — Actualizar modelo `ContactoSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.1.1, F1.1.2

**Contexto para el agente**:
> El modelo ContactoSDR es el corazón del sistema. Hoy tiene 6 estados y campos básicos. Necesita expandirse a 10 estados + 8 campos nuevos + 6 índices nuevos. Este cambio es backward compatible: los campos nuevos tienen defaults `null` o `0`, y el enum de estados se expande (no se renombra nada que rompa queries existentes — excepto `en_gestion`→`contactado` y `meet` que se manejan con migración).

**Archivos a modificar**:
- `backend/src/models/sdr/ContactoSDR.js` (123 líneas)

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.1)

**Cambios requeridos**:
```
1. ESTADOS_CONTACTO: Reemplazar array de 6 por array de 10:
   Quitar: 'en_gestion', 'meet'
   Agregar: 'contactado', 'cierre', 'ganado', 'no_contacto', 'revisar_mas_adelante', 'perdido'
   Mantener: 'nuevo', 'calificado', 'no_califica', 'no_responde'

2. Campos nuevos (agregar al schema):
   - precalificacionBot: String, enum ['sin_calificar','no_llego','calificado','quiere_meet',null], default null
   - datosBot: { rubro, interes, cantidadObras, interaccionFecha, saludoInicial }
   - leadId: String, default null
   - planEstimado: String, enum ['basico','avanzado','premium','a_medida',null], default null
   - intencionCompra: String, enum ['alta','media','baja',null], default null
   - prioridadScore: Number, default 0
   - cadenciaActiva: { cadenciaId (ObjectId ref CadenciaSDR), pasoActual, iniciadaEn, pausada, completada }
   - historialEstados: [{ estado, fecha, cambiadoPor }]
   - datosVenta: { planInteresado, ticketEstimado, fechaEstimadaCierre, modulosInteresados, fechaAlta, motivoPerdida }
   - rubro: String, trim, default null

3. Índices nuevos:
   - { empresaId: 1, sdrAsignado: 1, estado: 1, prioridadScore: -1 }
   - { empresaId: 1, 'cadenciaActiva.cadenciaId': 1 }
   - { empresaId: 1, planEstimado: 1 }
   - { empresaId: 1, intencionCompra: 1 }
   - { empresaId: 1, precalificacionBot: 1 }
   - { telefono: 1, empresaId: 1 } con unique: true

4. Actualizar ESTADOS_CONTACTO export para que otros archivos puedan importarlo
```

**Criterios de aceptación**:
- [ ] Enum tiene exactamente 10 estados
- [ ] Todos los campos nuevos tienen defaults (no rompe documentos existentes)
- [ ] Índice unique en telefono+empresaId creado
- [ ] El archivo sigue exportando el modelo y las constantes
- [ ] `node -e "require('./backend/src/models/sdr/ContactoSDR')"` no falla

---

#### F1.2.2 — Actualizar modelo `ReunionSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: Ninguna

**Contexto para el agente**:
> Las reuniones pasan de ser un sub-recurso simple a una entidad con lifecycle propio. Hoy el modelo tiene estados (pendiente/aprobada/rechazada) orientados a "solicitud". Necesitamos estados orientados a "evento": agendada/realizada/no_show/cancelada. Se agrega número auto-incremental por contacto y campos de evaluación post-meet. Las notas se simplifican a un solo campo `notas` (no pre/post).

**Archivos a modificar**:
- `backend/src/models/sdr/ReunionSDR.js` (125 líneas)

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.2 + sección 1.5 "Impacto de Reunión en Estado")

**Cambios requeridos**:
```
1. ESTADOS_REUNION: Reemplazar ['pendiente','aprobada','rechazada'] → ['agendada','realizada','no_show','cancelada']
   Default: 'agendada'

2. Campos nuevos:
   - numero: Number, required (auto-incremental por contacto)
   - hora: String (ej: "15:00")
   - link: String, default null (URL Zoom/Meet)
   - lugar: String, default null
   - notas: String, default '' (campo único, simplificado)
   - participantes: [{ nombre: String, rol: String, esNuestro: Boolean }]
   - asistio: Boolean, default null
   - duracionMinutos: Number, default null

3. Quitar campos obsoletos (si existen): notasPre, notasPost, evaluacion (separados)

4. Pre-save hook: auto-calcular `numero` como count de reuniones del mismo contacto + 1

5. Índices:
   - { contacto: 1, estado: 1 }
   - { empresaId: 1, fecha: 1 }
   - { empresaId: 1, estado: 1 }

6. Exportar ESTADOS_REUNION junto con el modelo
```

**Criterios de aceptación**:
- [ ] Enum tiene 4 estados nuevos
- [ ] Pre-save hook calcula `numero` correctamente
- [ ] Campo `notas` es único (no hay notasPre/notasPost)
- [ ] Índices creados

---

#### F1.2.3 — Actualizar modelo `HistorialSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: Ninguna

**Contexto para el agente**:
> El historial es el equivalente del "Status Sum" de Notion: un log acumulativo de todo lo que pasó con un contacto. Hoy tiene 34 tipos de evento. Necesitamos agregar ~12 tipos nuevos y 5 campos adicionales para soportar: interacciones del bot, acciones comerciales avanzadas, reuniones como entidad separada, y cadencias.

**Archivos a modificar**:
- `backend/src/models/sdr/HistorialSDR.js` (127 líneas)

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.3)

**Cambios requeridos**:
```
1. Agregar tipos de evento al enum (si no existen ya):
   - 'whatsapp_respuesta'
   - 'instagram_contacto'
   - 'email_enviado'
   - 'reunion_agendada', 'reunion_realizada', 'reunion_no_show', 'reunion_cancelada'
   - 'presupuesto_enviado', 'negociacion_iniciada', 'link_pago_enviado'
   - 'bot_interaccion'
   - 'plan_estimado_actualizado', 'intencion_compra_actualizada'
   - 'cadencia_iniciada', 'cadencia_avanzada', 'cadencia_completada', 'cadencia_detenida'
   - 'contacto_creado', 'contacto_enriquecido'

2. Campos nuevos en el schema:
   - estadoAnterior: String, default null
   - estadoNuevo: String, default null
   - cadenciaPaso: Number, default null
   - cadenciaAccion: Number, default null
   - templateUsado: String, default null
   - reunionId: ObjectId ref 'ReunionSDR', default null
```

**Criterios de aceptación**:
- [ ] Todos los tipos nuevos existen en el enum
- [ ] Campos nuevos tienen defaults (backward compatible)
- [ ] No se eliminó ningún tipo existente

---

#### F1.2.4 — Actualizar `index.js` de modelos SDR

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: F1.2.1, F1.2.2, F1.2.3

**Archivos a modificar**:
- `backend/src/models/sdr/index.js` (18 líneas)

**Cambios**:
```
Asegurar que re-exporta: ContactoSDR, ReunionSDR, HistorialSDR + sus constantes (ESTADOS_CONTACTO, ESTADOS_REUNION, etc.)
Si hay nuevos modelos en fases futuras (CadenciaSDR, etc.) se agregarán después.
```

---

### Grupo 3 — Lógica de negocio backend (depende del Grupo 2)

---

#### F1.3.1 — Actualizar `sdrService.js` (Backend)

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.2.1, F1.2.2, F1.2.3, F1.1.1, F1.1.2

**Contexto para el agente**:
> El SDR Service es el archivo más grande del backend SDR (1531 líneas). Es una clase con métodos estáticos que maneja toda la lógica de negocio. Necesitamos: (1) recalcular prioridadScore después de cada acción, (2) nuevos métodos para scoring, (3) métodos actualizados para reuniones v2, (4) normalización de teléfono en importación, (5) nuevos filtros en listarContactos.

**Archivos a modificar**:
- `backend/src/services/sdrService.js` (1531 líneas)

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (secciones 1.5, 1.7, métricas)
- `backend/utils/calcularPrioridad.js` (creado en F1.1.2)
- `backend/utils/normalizarTelefono.js` (creado en F1.1.1)

**Cambios requeridos**:
```
1. Importar al inicio:
   - const { calcularPrioridadScore } = require('../../utils/calcularPrioridad');
   - const { normalizarTelefono } = require('../../utils/normalizarTelefono');

2. Crear método helper: async recalcularPrioridad(contactoId)
   - Carga contacto + reuniones
   - Calcula score
   - Guarda contacto.prioridadScore

3. Modificar registrarIntento():
   - Después de guardar acción → llamar recalcularPrioridad()
   - Si el estado cambia a 'contactado' o superior → detener cadencia activa (si tiene)
   - Registrar en historialEstados del contacto

4. Nuevos métodos:
   - actualizarPlanEstimado(contactoId, plan, userId, userName)
   - actualizarIntencionCompra(contactoId, intencion, userId, userName)
   - obtenerFunnel(empresaId, filtros) — aggregate por estado + conMeetRealizada
   - obtenerSiguienteContacto(empresaId, sdrId) — contacto con mayor prioridadScore + proximoContacto vencido

5. Modificar listarContactos():
   - Agregar filtros: planEstimado, intencionCompra, precalificacionBot, tieneReunion
   - Ordenamiento default: prioridadScore desc (mantener alternativas existentes)

6. Modificar importación (importarContactos/processImport):
   - Normalizar teléfono antes de buscar/crear
   - Retornar info de duplicados para UI

7. Actualizar métricas:
   - Reuniones se cuentan desde ReunionSDR (no desde estados)
   - Agregar conMeetRealizada al response de funnel
```

**Criterios de aceptación**:
- [ ] `recalcularPrioridad` se llama después de cada acción
- [ ] Nuevos métodos (actualizarPlanEstimado, etc.) funcionan
- [ ] listarContactos acepta nuevos filtros
- [ ] Importación normaliza teléfono
- [ ] No se rompe funcionalidad existente

---

#### F1.3.2 — Actualizar `sdrController.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.3.1

**Contexto para el agente**:
> El controller es el punto de entrada HTTP que delega al service. Hoy tiene 32 funciones. Necesitamos agregar handlers para los nuevos endpoints y actualizar los existentes que cambiaron de firma.

**Archivos a modificar**:
- `backend/src/controllers/sdrController.js` (841 líneas)

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (secciones 1.7, 1.8)
- `backend/src/services/sdrService.js` (para ver firmas de nuevos métodos)

**Cambios requeridos**:
```
Nuevos handlers:
- actualizarPlanEstimado(req, res) — body: { contactoId, plan }
- actualizarIntencionCompra(req, res) — body: { contactoId, intencion }
- obtenerFunnel(req, res) — query: { empresaId, desde?, hasta?, sdrId? }
- webhookNuevoLead(req, res) — body: { phone, leadData, evento }
- obtenerSiguienteContacto(req, res) — query: { empresaId, sdrId }
- actualizarReunion(req, res) — body: { id, campos a actualizar }

Modificar handlers existentes:
- listarContactos: pasar nuevos filtros al service
- obtenerMetricasPeriodo: incluir datos de funnel y reuniones v2
```

**Criterios de aceptación**:
- [ ] Todos los handlers nuevos exportados
- [ ] Validación básica de parámetros en cada handler
- [ ] try/catch con respuesta 500 en errores

---

#### F1.3.3 — Actualizar `sdrRoutes.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.3.2

**Archivos a modificar**:
- `backend/src/routes/sdrRoutes.js` (143 líneas)

**Cambios requeridos**:
```
Agregar rutas:
- POST /acciones/plan-estimado → sdrController.actualizarPlanEstimado
- POST /acciones/intencion-compra → sdrController.actualizarIntencionCompra
- PUT /reuniones/:id → sdrController.actualizarReunion
- PUT /reuniones/:id/evaluar → sdrController.evaluarReunion
- GET /metricas/funnel → sdrController.obtenerFunnel
- POST /webhook/nuevo-lead → sdrController.webhookNuevoLead
- GET /contactos/siguiente → sdrController.obtenerSiguienteContacto

NOTA: Revisar que las rutas de reuniones existentes (crear, listar, evaluar) siguen funcionando.
Las rutas nuevas deben estar ANTES de rutas con parámetros genéricos para evitar conflictos.
```

**Criterios de aceptación**:
- [ ] Todas las rutas nuevas registradas
- [ ] No hay conflictos de orden entre rutas
- [ ] Middleware de auth aplicado a todas las rutas nuevas (mismo pattern que las existentes)

---

### Grupo 4 — Integración Bot (depende del Grupo 3)

---

#### F1.4.1 — Crear `leadContactoBridge.js`

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.2.1, F1.1.1

**Contexto para el agente**:
> Este servicio es el puente entre el mundo de marketing (Lead en Firestore, creado por el bot principal) y el mundo comercial (ContactoSDR en MongoDB, usado por el SDR). Se llama desde los flows del bot de onboarding. Maneja dos funciones: (1) crear/enriquecer ContactoSDR cuando el bot interactúa con alguien, (2) actualizar precalificacionBot conforme el usuario avanza en el bot.

**Archivos a crear**:
- `backend/src/services/leadContactoBridge.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.6 completa)
- `backend/src/models/sdr/ContactoSDR.js` (modelo actualizado)
- `backend/src/models/sdr/HistorialSDR.js` (para registrar eventos)
- `backend/flows/onboardingFlows/flowInicioGeneral.js` (para entender cómo se llama)

**Especificación**:
```
Exportar: { sincronizarLeadConContactoSDR, actualizarPrecalificacionBot }

sincronizarLeadConContactoSDR(phone, leadData, evento):
  - Normalizar teléfono
  - Buscar ContactoSDR existente por telefono+empresaId
  - Si NO existe → crear (Escenario A: nuevo contacto por bot)
    - estado: 'nuevo', segmento: 'inbound', precalificacionBot: 'sin_calificar'
    - Crear HistorialSDR tipo 'contacto_creado'
  - Si existe → enriquecer (Escenario C: contacto existente interactúa con bot)
    - Vincular leadId si no tenía
    - Actualizar precalificacionBot si viene
    - Enriquecer datosBot
    - Crear HistorialSDR tipo 'bot_interaccion'
    - Si tiene SDR asignado → TODO: notificar

actualizarPrecalificacionBot(phone, precalificacion, datosExtra):
  - Normalizar teléfono
  - Buscar ContactoSDR
  - Actualizar precalificacionBot + datosBot
  - Crear HistorialSDR tipo 'bot_interaccion'
```

**Criterios de aceptación**:
- [ ] Crea ContactoSDR si no existe
- [ ] Enriquece si ya existe (no duplica)
- [ ] Siempre normaliza teléfono antes de buscar
- [ ] Registra en historial cada interacción

---

#### F1.4.2 — Modificar `flowInicioGeneral.js` (puntos de inserción #1 y #2)

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: F1.4.1

**Contexto para el agente**:
> Este es el punto de entrada del bot cuando un usuario nuevo escribe por WhatsApp. Tiene un menú de 4 opciones. Necesitamos agregar dos llamadas al bridge: (1) al inicio, cuando se crea el lead, para crear el ContactoSDR correspondiente; (2) cuando elige opción 4 "hablar con humano", para marcar quiere_meet.

**Archivos a modificar**:
- `backend/flows/onboardingFlows/flowInicioGeneral.js` (81 líneas)

**Archivos a leer como referencia**:
- `backend/src/services/leadContactoBridge.js` (creado en F1.4.1)

**Cambios requeridos**:
```
1. Al inicio del archivo: importar sincronizarLeadConContactoSDR y actualizarPrecalificacionBot

2. En el primer addAction (donde se crea el lead):
   Después de: await addEvent(phone, 'nuevo_contacto', null, ctx.body)
   Agregar: await sincronizarLeadConContactoSDR(phone, { id: lead?.id, nombre, saludoInicial: ctx.body }, 'nuevo_contacto')

3. En el switch del segundo addAction, case 4 (humano):
   Agregar: await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'humano' })

IMPORTANTE: Envolver las llamadas al bridge en try/catch para que si falla el bridge, no rompa el flow del bot.
```

**Criterios de aceptación**:
- [ ] Se crea ContactoSDR al primer mensaje
- [ ] Se marca `quiere_meet` al elegir opción 4
- [ ] Error en bridge NO rompe el flow del bot (try/catch)
- [ ] No cambia el comportamiento visible del bot

---

#### F1.4.3 — Modificar `flowOnboardingConstructora.js` (puntos #3 y #4)

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: F1.4.1

**Contexto para el agente**:
> Este flow usa un asistente GPT que puede ejecutar function calls. Cuando el GPT ejecuta `crear_empresa`, significa que el usuario dio datos concretos (nombre de empresa, cantidad de obras) → debe marcarse como `calificado`. Cuando ejecuta `solicitar_reunion`, pidió reunión → debe marcarse como `quiere_meet`.

**Archivos a modificar**:
- `backend/flows/onboardingFlows/flowOnboardingConstructora.js` (29 líneas)

**Archivos a leer como referencia**:
- `backend/src/services/leadContactoBridge.js`
- El archivo podría tener la lógica de function calls en otro lugar — buscar dónde se procesan las function calls del asistente GPT (probablemente en `flowOnboarding.js` o en un handler de asistentes)

**Cambios requeridos**:
```
Buscar dónde se procesan las function calls del asistente GPT:
- Cuando function_name === 'crear_empresa':
  await actualizarPrecalificacionBot(phone, 'calificado', { rubro: args.rubro, cantidadObras: args.cantidadObras })
- Cuando function_name === 'solicitar_reunion':
  await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'reunion' })

Envolver en try/catch.
```

**Criterios de aceptación**:
- [ ] `calificado` se setea al crear empresa
- [ ] `quiere_meet` se setea al solicitar reunión
- [ ] try/catch para no romper el flow

---

#### F1.4.4 — Modificar `flowOnboardingInfo.js` (punto #5)

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: F1.4.1

**Contexto para el agente**:
> Este flow tiene un sub-menú de 6 opciones. La opción 6 es "Hablar con un humano". Necesitamos marcar `quiere_meet` cuando la elige.

**Archivos a modificar**:
- `backend/flows/onboardingFlows/flowOnboardingInfo.js` (151 líneas)

**Cambios requeridos**:
```
1. Importar actualizarPrecalificacionBot del bridge
2. En la opción 6 del sub-menú ("hablar con humano"):
   await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'humano' })
3. Envolver en try/catch
```

---

#### F1.4.5 — Crear `botTimeoutJob.js` (punto #6)

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🟢 Media  
**Depende de**: F1.2.1

**Contexto para el agente**:
> Los contactos que interactúan con el bot pero nunca completan el recorrido (no eligen opción, no responden más) quedan en `precalificacionBot: 'sin_calificar'` para siempre. Necesitamos un cron job que tras 48hs sin actividad los marque como `no_llego`.

**Archivos a crear**:
- `backend/src/jobs/botTimeoutJob.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.10, "Código del cron para no_llego")
- `backend/src/jobs/jobStore.js` (para ver estilo de jobs existentes)

**Especificación**:
```
Función: marcarNoLlego()
  - Buscar ContactoSDR con:
    - precalificacionBot: 'sin_calificar'
    - datosBot.interaccionFecha: <= hace 48 horas
    - estado: 'nuevo' (solo si no avanzaron por otro medio)
  - Para cada uno:
    - Actualizar precalificacionBot → 'no_llego'
    - Crear HistorialSDR tipo 'bot_interaccion'
  - Log: "[botTimeoutJob] X contactos marcados como no_llego"

Cron: cada 6 horas → '0 */6 * * *'

Exportar: { marcarNoLlego } (para testing)
```

**Integración**: Importar y ejecutar desde el archivo principal de la app (`app.js` o donde se inician los cron jobs).

**Criterios de aceptación**:
- [ ] Cron registrado correctamente
- [ ] Solo afecta contactos con `sin_calificar` + 48hs + estado `nuevo`
- [ ] Registra en historial
- [ ] Exporta función para testing

---

### Grupo 5 — Frontend (depende del Grupo 3 para APIs, puede empezar UI en paralelo)

---

#### F1.5.1 — Actualizar `contactosSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.1.3, F1.5.7

**Contexto para el agente**:
> Página principal de lista de contactos (1434 líneas). Necesita: usar los 10 nuevos estados desde sdrConstants, agregar badge de precalificacionBot, ordenar por prioridadScore por default, y agregar nuevos filtros.

**Archivos a modificar**:
- `app-web/src/pages/contactosSDR.js` (1434 líneas)

**Archivos a leer como referencia**:
- `app-web/src/constant/sdrConstants.js` (creado en F1.1.3)
- `app-web/src/services/sdrService.js` (actualizado en F1.5.7)
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección 1.9)

**Cambios requeridos**:
```
1. Importar ESTADOS_CONTACTO, PRECALIFICACION_BOT, PLANES_SORBY desde sdrConstants
2. Reemplazar constantes inline de estados por las importadas
3. Agregar badge de precalificacionBot en cada fila de contacto (chip 🤖 con color)
4. Agregar filtros: planEstimado, intencionCompra, precalificacionBot
5. Ordenamiento default: prioridadScore desc
6. Mostrar score en la fila del contacto (número o barra visual)
```

**Criterios de aceptación**:
- [ ] Los 10 estados se muestran con sus colores correctos
- [ ] Badge bot visible cuando precalificacionBot no es null
- [ ] Filtros funcionan
- [ ] Sin errores de consola

---

#### F1.5.2 — Actualizar `gestionSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.1.3, F1.5.7

**Contexto para el agente**:
> Página de gestión/dashboard (2418 líneas). Tiene constantes inline de 6 estados que hay que reemplazar. Las métricas usan datos estimados que deben pasar a usar los endpoints reales. Es el archivo más grande y más propenso a errores.

**Archivos a modificar**:
- `app-web/src/pages/gestionSDR.js` (2418 líneas)

**Cambios requeridos**:
```
1. Importar constantes desde sdrConstants (reemplazar las inline en línea ~49)
2. Actualizar ESTADOS_CONTACTO de 6 → 10 (en toda la página)
3. Actualizar métricas para incluir datos del funnel (si el endpoint está disponible)
4. Ajustar filtros de estado en toda la página
```

**Criterios de aceptación**:
- [ ] Constantes importadas de sdrConstants (no inline)
- [ ] Los 10 estados se muestran correctamente
- [ ] Métricas no se rompen (pueden seguir con datos actuales hasta que el backend tenga los endpoints nuevos)

---

#### F1.5.3 — Actualizar `DrawerDetalleContactoSDR.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica  
**Depende de**: F1.1.3, F1.5.7

**Contexto para el agente**:
> Drawer lateral que muestra todo el detalle de un contacto (1839 líneas). Es el componente más complejo del frontend SDR. Necesita: sección de scoring (plan + intención), badge de precalificacionBot, sección de reuniones v2 con lifecycle, y prompt post-evaluación de reunión.

**Archivos a modificar**:
- `app-web/src/components/sdr/DrawerDetalleContactoSDR.js` (1839 líneas)

**Cambios requeridos**:
```
1. Importar constantes desde sdrConstants
2. Agregar sección de Scoring:
   - Selector de Plan Estimado (basico/avanzado/premium/a_medida)
   - Selector de Intención de Compra (alta/media/baja)
   - Mostrar prioridadScore numérico
3. Agregar badge de precalificacionBot (si no es null)
4. Actualizar sección de reuniones:
   - Mostrar número de reunión (#1, #2, etc.)
   - Mostrar estado con color (agendada/realizada/no_show/cancelada)
   - Botón para evaluar reunión
   - Prompt post-evaluación: "¿Mover a Cierre?" (si realizada), "¿Revisar más adelante?" (si 2+ no_show)
5. Actualizar estados en selector de cambio de estado (10 estados)
6. Mostrar datosBot si existen (rubro, interés, saludo inicial)
```

**Criterios de aceptación**:
- [ ] Plan y intención editables desde el drawer
- [ ] Reuniones muestran lifecycle completo
- [ ] Prompt post-evaluación aparece correctamente
- [ ] 10 estados en el selector

---

#### F1.5.4 — Actualizar `ModalRegistrarAccion.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟡 Alta  
**Depende de**: F1.1.3

**Archivos a modificar**:
- `app-web/src/components/sdr/ModalRegistrarAccion.js` (692 líneas)

**Cambios requeridos**:
```
Agregar tipos de acción nuevos:
- instagram_contacto
- link_pago_enviado (Alias)
- presupuesto_enviado
- negociacion_iniciada
- email_enviado
```

---

#### F1.5.5 — Actualizar `ModalImportarExcel.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟢 Media  
**Depende de**: F1.5.7

**Archivos a modificar**:
- `app-web/src/components/sdr/ModalImportarExcel.js` (455 líneas)

**Cambios requeridos**:
```
Mejorar UI de deduplicación:
- Cuando el backend retorna duplicados, mostrar: nombre, estado, origen (inbound/outbound), precalificacionBot
- Botón "Enriquecer datos" para fusionar campos vacíos del existente con los del import
- Botón "Ignorar" para saltar el duplicado
```

---

#### F1.5.6 — Actualizar `ModalAgregarContacto.js`

**Tipo**: Modificar archivo existente  
**Prioridad**: 🟢 Media  
**Depende de**: F1.1.3

**Archivos a modificar**:
- `app-web/src/components/sdr/ModalAgregarContacto.js` (272 líneas)

**Cambios requeridos**:
```
Agregar campo 'rubro' al formulario de creación de contacto.
Fase 2: agregar planEstimado e intencionCompra opcionales.
```

---

#### F1.5.7 — Actualizar `sdrService.js` (Frontend)

**Tipo**: Modificar archivo existente  
**Prioridad**: 🔴 Crítica (bloqueante para otros frontend)  
**Depende de**: F1.3.3 (rutas backend deben existir)

**Archivos a modificar**:
- `app-web/src/services/sdrService.js` (535 líneas)

**Cambios requeridos**:
```
Agregar llamadas API:
- actualizarPlanEstimado(contactoId, plan)
- actualizarIntencionCompra(contactoId, intencion)
- obtenerFunnel(empresaId, filtros)
- obtenerSiguienteContacto(empresaId, sdrId)
- actualizarReunion(reunionId, datos)
- evaluarReunion(reunionId, resultado)

Mantener la misma convención de los métodos existentes (axios, headers con token, etc.)
```

---

#### F1.5.8 — Crear componentes nuevos (pueden hacerse en paralelo entre sí)

**Tipo**: Crear archivos nuevos  
**Prioridad**: 🟢 Media  
**Depende de**: F1.1.3

Cada componente es una tarea independiente para un agente:

| ID | Componente | Propósito | Complejidad |
|---|---|---|---|
| F1.5.8a | `BadgePrecalificacionBot.js` | Chip 🤖 que muestra el valor de precalificacionBot con color | Simple |
| F1.5.8b | `PlanEstimadoSelector.js` | Selector de plan (4 opciones con ícono y precio) | Simple |
| F1.5.8c | `IntencionCompraSelector.js` | Selector de intención (3 opciones con color) | Simple |
| F1.5.8d | `ReunionesSection.js` | Sección de reuniones dentro del drawer: lista + estados + evaluación | Media |
| F1.5.8e | `ModalAgendarReunion.js` | Modal para agendar reunión: fecha, hora, link, notas | Media |
| F1.5.8f | `ModalEvaluarReunion.js` | Modal post-meet: marcar realizada/no_show/cancelada + prompt sugerido | Media |
| F1.5.8g | `ModoLlamadas.js` | Loop de llamadas: muestra 1 contacto → Llamar → Resultado → Siguiente | Alta |
| F1.5.8h | `FunnelChart.js` | Embudo de conversión visual con % entre etapas | Media |

Para cada componente, el agente debe:
1. Leer `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección frontend)
2. Leer `app-web/docs/SDR-COMERCIAL-FUNCIONAL.md` (sección correspondiente para UX)
3. Leer un componente existente similar (ej: `ModalRegistrarAccion.js`) para mantener estilo
4. Crear en `app-web/src/components/sdr/`

---

### Grupo 6 — Migración (ÚLTIMO, cuando todo funciona)

---

#### F1.6.1 — Crear script de migración de estados

**Tipo**: Crear archivo nuevo  
**Prioridad**: 🟡 Alta (pero ejecutar al final)  
**Depende de**: Todos los anteriores

**Archivos a crear**:
- `backend/scripts/migrar-estados-sdr.js`

**Archivos a leer como referencia**:
- `app-web/docs/SDR-COMERCIAL-TECNICO.md` (sección "Plan de Migración")

**Especificación**:
```
Mapeo:
  'nuevo' → 'nuevo'
  'en_gestion' → 'contactado'
  'meet' → 'calificado' + crear ReunionSDR(estado:'realizada', numero:1)
  'calificado' → 'calificado'
  'no_califica' → 'no_califica'
  'no_responde' → 'no_contacto'

Para cada contacto:
  1. Mapear estado
  2. Inicializar historialEstados con el estado mapeado
  3. Setear campos nuevos a null/0/defaults
  4. Si era 'meet' → crear ReunionSDR
  5. Outbound: precalificacionBot queda null (nunca interactuó con bot)

Después: recalcular prioridadScore para todos.

MODO: --dry-run por default (solo loggea), --execute para aplicar.
```

**Criterios de aceptación**:
- [ ] Modo dry-run funciona y muestra preview
- [ ] Modo execute aplica cambios
- [ ] Contactos en 'meet' generan ReunionSDR
- [ ] No hay contactos con estados viejos después de migrar
- [ ] Scores recalculados

---

## Fase 2: Cadencias + Historial Rico + Filtros

### Grupo 1 — Modelo y Motor

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F2.1.1** | Crear modelo `CadenciaSDR.js` | Crear | — |
| **F2.1.2** | Crear `cadenciaEngine.js` | Crear | F2.1.1 |
| **F2.1.3** | Crear `seedCadenciaDefault.js` | Crear | F2.1.1 |
| **F2.1.4** | Crear modelo `VistaGuardadaSDR.js` | Crear | — |

### Grupo 2 — Backend

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F2.2.1** | Agregar CRUD cadencias al service/controller/routes | Modificar | F2.1.1, F2.1.2 |
| **F2.2.2** | Agregar CRUD vistas guardadas | Modificar | F2.1.4 |
| **F2.2.3** | Integrar cadenciaEngine en registrarIntento | Modificar | F2.1.2 |

### Grupo 3 — Frontend

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F2.3.1** | Crear `FiltrosAvanzados.js` con vistas guardadas | Crear | F2.2.2 |
| **F2.3.2** | Crear `MetricasDashboard.js` (extraer de gestionSDR) | Crear | — |
| **F2.3.3** | Integrar cadencia en drawer (paso actual, template sugerido) | Modificar | F2.2.1 |
| **F2.3.4** | Crear UI de configuración de cadencias (admin) | Crear | F2.2.1 |

---

## Fase 3: Pipeline de Ventas

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F3.1.1** | Crear modelo `OportunidadSDR.js` | Crear | — |
| **F3.1.2** | Agregar CRUD oportunidades al backend | Modificar | F3.1.1 |
| **F3.1.3** | Crear endpoint métricas de pipeline | Modificar | F3.1.1 |
| **F3.2.1** | Crear página/sección de Pipeline visual | Crear | F3.1.2 |
| **F3.2.2** | Agregar métricas de ventas al dashboard | Modificar | F3.1.3 |

---

## Fase 4: Automatización WhatsApp

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F4.1.1** | Crear `cadenciaScheduler.js` (cron 15 min) | Crear | F2.1.2 |
| **F4.1.2** | Implementar rate limiting WhatsApp | Crear | F4.1.1 |
| **F4.1.3** | Crear `sdrWhatsAppBot.js` (bot separado) | Crear | F4.1.2 |
| **F4.1.4** | Kill switch y alertas de bloqueo | Crear | F4.1.3 |
| **F4.2.1** | UI de estado de cadencia automática | Crear | F4.1.1 |

---

## Fase 5: Reportes Avanzados

| ID | Tarea | Tipo | Depende de |
|---|---|---|---|
| **F5.1.1** | Endpoints de reportes (comparativa, velocidad, conversión) | Crear | F1.* completo |
| **F5.2.1** | `FunnelConversion.js` — embudo visual | Crear | F5.1.1 |
| **F5.2.2** | `ComparativaPeriodos.js` — este mes vs anterior | Crear | F5.1.1 |
| **F5.2.3** | `MetricasPorSDR.js` — tabla comparativa equipo | Crear | F5.1.1 |
| **F5.2.4** | `MatrizPlanIntencion.js` — grilla de calor | Crear | F5.1.1 |
| **F5.2.5** | `AlertasPanel.js` — situaciones que requieren atención | Crear | F5.1.1 |

---

## Orden de Ejecución Recomendado

### Sprint 1 (Fase 1, Grupos 1-2): Fundaciones
```
Paralelo:
  F1.1.1 normalizarTelefono
  F1.1.2 calcularPrioridad
  F1.1.3 sdrConstants (FE)
  F1.2.2 ReunionSDR
  F1.2.3 HistorialSDR

Después:
  F1.2.1 ContactoSDR (depende de F1.1.1, F1.1.2)
  F1.2.4 index.js de modelos
```

### Sprint 2 (Fase 1, Grupos 3-4): Backend + Bot
```
Secuencial:
  F1.3.1 sdrService (BE)
  F1.3.2 sdrController
  F1.3.3 sdrRoutes

Paralelo (después de F1.3.1):
  F1.4.1 leadContactoBridge
  F1.4.2 flowInicioGeneral
  F1.4.3 flowOnboardingConstructora
  F1.4.4 flowOnboardingInfo
  F1.4.5 botTimeoutJob
```

### Sprint 3 (Fase 1, Grupo 5): Frontend
```
Primero:
  F1.5.7 sdrService (FE)

Paralelo:
  F1.5.1 contactosSDR
  F1.5.2 gestionSDR
  F1.5.3 DrawerDetalle
  F1.5.4 ModalRegistrarAccion
  F1.5.5 ModalImportarExcel
  F1.5.6 ModalAgregarContacto
  F1.5.8a-h componentes nuevos
```

### Sprint 4: Migración + QA
```
  F1.6.1 migración (dry-run primero)
  QA manual con Fernando
```

### Sprint 5: Fase 2 (Cadencias)
### Sprint 6: Fase 3 (Pipeline)
### Sprint 7: Fase 4 (Automatización)
### Sprint 8: Fase 5 (Reportes)

---

## Notas para el Agente Ejecutor

### Convenciones del proyecto
- **Backend**: Express + Mongoose. Services como clases con métodos estáticos. Controllers como funciones sueltas.
- **Frontend**: Next.js + MUI. Páginas en `pages/`, componentes en `components/sdr/`. Servicios con axios.
- **Estilo**: Sin TypeScript. CommonJS (`require/module.exports`). ESLint configurado.
- **Auth**: Firebase Auth. Token se pasa en headers.
- **DB**: MongoDB con Mongoose. Las conexiones ya están configuradas.

### Cómo leer contexto
Antes de cada tarea, el agente DEBE:
1. Leer el archivo que va a modificar completo
2. Leer los archivos de referencia indicados
3. Leer los docs funcional y técnico (secciones relevantes)
4. Verificar que las dependencias de la tarea están completas

### Cómo validar
Después de cada tarea:
1. `node -e "require('./path/to/file')"` — verificar que no crashea
2. Correr tests si se crearon
3. `npx eslint path/to/file` — sin errores de lint
4. Si es frontend: verificar que compila sin errores
