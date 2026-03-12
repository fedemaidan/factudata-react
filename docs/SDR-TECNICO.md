# SDR — Documentación Técnica

> **Última actualización**: Marzo 2026  
> **Estado**: Fase 1, 2 y 3 completas

---

## 1. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js (Pages Router) + Material UI v5 |
| **Backend** | Express.js + Node.js |
| **Base de datos** | MongoDB + Mongoose |
| **Auth** | Firebase Authentication (tokens verificados server-side) |
| **WhatsApp** | Integración con API de WA (envío + recepción) |
| **Transcripción** | GPT-4o para audio → texto |
| **Deploy** | Firebase Hosting (frontend) + Docker (backend) |

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js)                             │
│  ├── pages/contactosSDR.js     (lista SDR)      │
│  ├── pages/sdr/reuniones.js   (reuniones 6tabs) │
│  ├── pages/sdr/contacto/[id].js (detalle)       │
│  ├── components/sdr/*          (11 componentes) │
│  └── services/sdrService.js     (API client)    │
└──────────────────┬──────────────────────────────┘
                   │ Axios (Bearer token Firebase)
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend (Express)                 :3003         │
│  ├── routes/sdrRoutes.js           (55 endpoints)│
│  ├── controllers/sdrController.js  (1521 líneas) │
│  ├── services/sdrService.js        (2491 líneas) │
│  ├── services/cadenciaEngine.js    (282 líneas)  │
│  └── models/sdr/*                  (5 modelos)   │
└──────────────────┬──────────────────────────────┘
                   │ Mongoose
                   ▼
┌─────────────────────────────────────────────────┐
│  MongoDB                                         │
│  ├── contactos_sdr     (12 índices)             │
│  ├── reuniones_sdr     (4 índices)              │
│  ├── eventos_historial_sdr (3 índices)          │
│  ├── cadencias_sdr     (4 índices)              │
│  └── vistas_guardadas_sdr (2 índices)           │
└─────────────────────────────────────────────────┘
```

---

## 3. Modelos (Mongoose)

### 3.1 ContactoSDR

**Archivo**: `backend/src/models/sdr/ContactoSDR.js` (~240 líneas)  
**Colección**: `contactos_sdr`

**Campos principales:**

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `nombre` | String | ✅ | trim |
| `telefono` | String | ✅ | trim |
| `telefonosSecundarios` | [String] | — | Teléfonos adicionales |
| `email` | String | — | trim, lowercase |
| `empresa` | String | — | |
| `cargo` | String | — | |
| `tamanoEmpresa` | String | — | enum: `1-10`, `11-50`, `51-200`, `200+` |
| `estado` | String | — | enum de 10 estados, default `nuevo` |
| `segmento` | String | — | enum: `outbound`, `inbound` |
| `sdrAsignado` | String | — | Firebase UID |
| `sdrAsignadoNombre` | String | — | Denormalizado |
| `sdrAsignadoEmail` | String | — | Denormalizado |
| `notas` | String | — | |
| `origenImportacion` | String | — | enum: `manual`, `excel`, `notion`, `bot` |

**Próxima Tarea (sub-documento):**

```javascript
proximaTarea: {
  tipo: { type: String, enum: ['llamada', 'whatsapp', 'email', 'recordatorio'] },
  fecha: Date,
  nota: String,
  autoGenerada: { type: Boolean, default: false }
}
```

**Contadores (atómicos con `$inc`):**

```javascript
contadores: {
  llamadasNoAtendidas: { type: Number, default: 0 },
  llamadasAtendidas: { type: Number, default: 0 },
  mensajesEnviados: { type: Number, default: 0 },
  reunionesTotales: { type: Number, default: 0 }
}
```

**Cadencia Activa (sub-documento — legacy/fallback):**

```javascript
cadenciaActiva: {
  cadenciaId: { type: ObjectId, ref: 'CadenciaSDR' },
  pasoActual: Number,
  accionActual: Number,
  estado: { type: String, enum: ['activa', 'pausada', 'completada', 'detenida'] },
  fechaInicio: Date,
  proximoContacto: Date,
  intentosEnPaso: Number
}
```

**Otros campos:**
- `proximoContacto` (Date) — derivada de proximaTarea.fecha
- `precalificacionBot` — enum: `sin_calificar`, `calificado`, `no_llego`, `quiere_meet`
- `planEstimado` — enum: `basico`, `avanzado`, `premium`, `a_medida`
- `intencionCompra` — enum: `alta`, `media`, `baja`
- `prioridadScore` (Number, default 0)
- `prioridadCalculada` (Mixed) — calculado por scoring engine
- `leadFirestore` — `{ leadId, conversationId }` para bridge con bot
- `importacion` (sub-doc) — metadata de importación
- `reuniones` ([ObjectId] ref ReunionSDR) — embebido
- `negociacion` (sub-doc) — Fase 3
- `resumenSDR` (String) — Resumen ejecutivo generado por IA a pedido del SDR (Fase 3)
- `empresaId` (String, required) — Firebase UID del tenant
- `timestamps: true`

**Índices (12):**

```javascript
{ empresaId: 1, estado: 1 }
{ empresaId: 1, sdrAsignado: 1 }
{ empresaId: 1, sdrAsignado: 1, estado: 1 }
{ empresaId: 1, proximoContacto: 1 }
{ empresaId: 1, telefono: 1 }                    // unique
{ 'leadFirestore.leadId': 1, empresaId: 1 }      // sparse
{ empresaId: 1, segmento: 1 }
{ empresaId: 1, sdrAsignado: 1, proximoContacto: 1 }  // compound v2
{ empresaId: 1, prioridadScore: -1 }
{ empresaId: 1, createdAt: -1 }
{ empresaId: 1, 'cadenciaActiva.estado': 1 }
{ empresaId: 1, 'cadenciaActiva.proximoContacto': 1 }
```

### 3.2 ReunionSDR

**Archivo**: `backend/src/models/sdr/ReunionSDR.js` (~175 líneas)  
**Colección**: `reuniones_sdr`

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `contactoId` | ObjectId ref | ✅ | Referencia a ContactoSDR |
| `numero` | Number | — | Auto-incremental por contacto (pre-validate hook) |
| `estado` | String | — | enum: `agendada`, `realizada`, `no_show`, `cancelada` |
| `fecha` | Date | ✅ | |
| `hora` | String | — | ej: "15:00" |
| `link` | String | — | URL de videoconferencia |
| `lugar` | String | — | |
| `notas` | String | — | |
| `participantes` | String | — | |
| `duracion` | Number | — | Minutos |
| `evaluacion` | Boolean | — | null = no evaluada |
| `resumen` | String | — | |
| Campos de calificación | String | — | `nombreEmpresa`, `tamanoEmpresa`, `puntosDeDolor`, `competencia`, `modulosPotenciales`, `etapaCompra` |
| `transcripcion` | String | — | Transcripción de la reunión (Fase 3) |
| `resumenIA` | String | — | Resumen IA de la transcripción (Fase 3) |
| `nextSteps` | String | — | Siguientes pasos definidos (Fase 3) |
| `modulosInteres` | [String] | — | Módulos de interés para contratar (Fase 3) |
| `calificacionRapida` | String | — | enum: `frio`, `tibio`, `caliente`, `listo_para_cerrar` (Fase 3) |
| `comentario` | String | — | Comentario obligatorio del SDR al registrar resultado (Fase 3) |
| `empresaId` | String | ✅ | |
| `creadoPor` | String | ✅ | Firebase UID |

**Índices**: `{ contactoId }`, `{ empresaId, estado }`, `{ empresaId, fecha }`, `{ empresaId, creadoPor }`

### 3.3 EventoHistorialSDR

**Archivo**: `backend/src/models/sdr/EventoHistorialSDR.js` (~213 líneas)  
**Colección**: `eventos_historial_sdr`

| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `contactoId` | ObjectId | ✅ | |
| `tipo` | String | ✅ | ~40 tipos (ver constante `TIPOS_EVENTO`) |
| `canal` | String | — | enum: `llamada`, `whatsapp`, `email`, `linkedin`, `otro` |
| `resultado` | String | — | enum: `atendio`, `no_atendio`, `respondio`, `no_respondio`, `pendiente` |
| `descripcion` | String | ✅ | Texto legible |
| `detalles` | Mixed | — | Datos adicionales sin schema fijo |
| `nota` | String | — | |
| `seguimiento` | String | — | |
| `reunionId` | ObjectId ref | — | Si el evento involucra reunión |
| `realizadoPor` | String | ✅ | Firebase UID |
| `realizadoPorNombre` | String | — | |
| `duracion` | Number | — | Segundos (para llamadas) |
| `transcripcion` / `resumenIA` | String | — | GPT-4o |
| `audioUrl` | String | — | |

**Tipos de evento (`TIPOS_EVENTO`)**: ~40 tipos agrupados en llamada, whatsapp, email, linkedin, instagram, reunión, bot, comercial, estado, cadencia, asignación, importación, IA (`resumen_ia_generado`, `resumen_sdr_generado`), otros.

**Índices**: `{ contactoId, createdAt: -1 }`, `{ empresaId, createdAt: -1 }`, `{ empresaId, tipo, createdAt: -1 }`

### 3.4 CadenciaSDR

**Archivo**: `backend/src/models/sdr/CadenciaSDR.js` (~80 líneas)  
**Colección**: `cadencias_sdr`

Schema jerárquico: **Cadencia → Pasos → Acciones → Variantes**

```javascript
{
  nombre: String,        // required
  descripcion: String,
  pasos: [{
    orden: Number,
    acciones: [{
      tipo: String,      // enum: llamada, whatsapp, email
      delayHoras: Number,
      variantes: [{
        rubro: String,
        mensaje: String,
        archivos: [Mixed]
      }]
    }]
  }],
  variables: [String],   // default: ['nombre_contacto', 'rubro_texto', 'momento_bot', 'sdr_nombre']
  activa: Boolean,       // default: true
  maxIntentosPorPaso: Number,    // default: 6
  estadoAlCompletar: String,     // default: 'no_contacto'
  empresaId: String,     // required
}
```

### 3.5 VistaGuardadaSDR

**Archivo**: `backend/src/models/sdr/VistaGuardadaSDR.js` (~65 líneas)  
**Colección**: `vistas_guardadas_sdr`

| Campo | Tipo | Notas |
|-------|------|-------|
| `nombre` | String | required |
| `empresaId` | String | required |
| `userId` | String | null = compartida |
| `filtros` | Sub-doc | Todos los filtros aplicados |
| `orden` | Number | default 0 |
| `ordenDireccion` | String | enum: `asc`, `desc` |
| `bandejaActiva` | Mixed | |
| `mostrarSoloMios` | Mixed | |

---

## 4. API REST

**Base**: `/api/sdr` (montada en `app.js`)  
**Auth**: Middleware `verifyToken` (Firebase) en todas las rutas excepto archivos estáticos.  
**Total**: **55 endpoints**

### 4.1 Contactos CRUD

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/contactos` | Crear contacto |
| `GET` | `/contactos` | Listar contactos (con bandejas y filtros) |
| `GET` | `/contactos/:id` | Obtener contacto por ID |
| `GET` | `/contactos/buscar` | Búsqueda por teléfono/nombre |
| `GET` | `/contactos/bandejas/contadores` | Contadores por bandeja |
| `PUT` | `/contactos/:id` | Actualizar contacto |
| `POST` | `/contactos/:id/asignar` | Asignar SDR |
| `POST` | `/contactos/:id/desasignar` | Desasignar SDR |
| `POST` | `/contactos/asignar-masivo` | Asignación masiva |
| `POST` | `/contactos/eliminar-masivo` | Eliminación masiva |

### 4.2 Acciones (Wizard)

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/contactos/:id/registrar-intento` | Registrar acción (llamada/WA/email) + próxima tarea |
| `POST` | `/contactos/:id/accion-rapida` | Acciones varias (marcar no califica, etc.) |
| `POST` | `/contactos/:id/cambiar-estado` | Cambio manual de estado |
| `POST` | `/contactos/:id/agregar-nota` | Agregar nota al historial |
| `POST` | `/contactos/:id/proxima-tarea` | Establecer/modificar próxima tarea |
| `POST` | `/contactos/:id/proximo-contacto` | Programar próximo contacto |
| `POST` | `/contactos/:id/confirmar-respuesta-wa` | Confirmar que respondió WA |
| `POST` | `/contactos/:id/recalificar-bot` | Recalificar del bot |
| `POST` | `/contactos/:id/subir-audio` | Subir audio de llamada (multer) |
| `POST` | `/contactos/:id/transcribir-audio` | Transcribir audio con GPT-4o |

### 4.3 Reuniones

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/reuniones` | Crear reunión |
| `GET` | `/reuniones` | Listar reuniones (con filtros) |
| `PUT` | `/reuniones/:id` | Actualizar reunión |
| `PUT` | `/reuniones/:id/estado` | Cambiar estado de reunión |
| `GET` | `/reuniones/:id` | Obtener reunión individual (Fase 3) |
| `DELETE` | `/reuniones/:id` | Eliminar reunión (Fase 3) |
| `POST` | `/reuniones/:id/procesar-transcripcion` | Procesar transcripción con GPT-4o (Fase 3) |
| `POST` | `/contactos/:id/generar-resumen` | Generar resumen SDR del contacto con GPT-4o (Fase 3) |

### 4.4 Importación

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/contactos/validar-importacion` | Validar Excel antes de importar |
| `POST` | `/importar` | Importar contactos desde Excel |
| `GET` | `/contactos/verificar-duplicados` | Verificar duplicados por teléfono |

### 4.5 Notion

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/notion/importar` | Importar desde Notion |
| `GET` | `/notion/databases` | Listar bases de datos Notion |
| `GET` | `/notion/databases/:id` | Leer base de datos específica |
| `POST` | `/notion/config` | Guardar configuración Notion |

### 4.6 Métricas

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/metricas/diarias` | Métricas del día |
| `GET` | `/metricas/diarias-por-sdr` | Métricas del día por SDR |
| `GET` | `/metricas/periodo` | Métricas en rango de fechas |

### 4.7 Historial

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/contactos/:id/historial` | Historial del contacto |
| `DELETE` | `/historial/:id` | Eliminar evento del historial |

### 4.8 Cadencias

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/cadencias` | Listar cadencias |
| `POST` | `/cadencias` | Crear cadencia |
| `PUT` | `/cadencias/:id` | Actualizar cadencia |
| `DELETE` | `/cadencias/:id` | Eliminar cadencia |
| `POST` | `/contactos/:id/asignar-cadencia` | Asignar cadencia a contacto |
| `POST` | `/contactos/:id/detener-cadencia` | Detener cadencia del contacto |
| `POST` | `/contactos/cadencia-masiva` | Asignar cadencia masivamente |
| `GET` | `/cadencias/:id/estadisticas` | Estadísticas de cadencia |
| `POST` | `/cadencias/:id/ejecutar-paso` | Ejecutar paso manualmente |

### 4.9 Templates WhatsApp

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/templates` | Listar templates |
| `POST` | `/templates` | Crear template |
| `PUT` | `/templates/:id` | Actualizar template |
| `DELETE` | `/templates/:id` | Eliminar template |

### 4.10 Tipos de Templates

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/template-tipos` | Listar tipos |
| `POST` | `/template-tipos` | Crear tipo |
| `PUT` | `/template-tipos/:id` | Actualizar tipo |
| `DELETE` | `/template-tipos/:id` | Eliminar tipo |

### 4.11 Vistas Guardadas

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/vistas` | Listar vistas |
| `POST` | `/vistas` | Crear vista |
| `PUT` | `/vistas/:id` | Actualizar vista |
| `DELETE` | `/vistas/:id` | Eliminar vista |

### 4.12 Otros

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/sdrs` | Listar SDRs del equipo |
| `POST` | `/webhook/nuevo-lead` | Webhook para leads del bot |
| `GET` | `/contactos/exportar` | Exportar contactos |
| `GET` | `/contactos/exportar-metricas` | Exportar métricas |
| `GET` | `/audios/*` | Archivos estáticos de audio (sin auth) |

---

## 5. Servicios Backend

### 5.1 SdrService (`sdrService.js` — 2491 líneas)

Clase principal con **59 métodos**. Patrón: clase con métodos async que reciben `empresaId` y datos.

**Métodos clave:**

| Método | Líneas aprox. | Responsabilidad |
|--------|---------------|-----------------|
| `listarContactos()` | ~117-210 | Filtros + bandejas. Usa aggregation para nulls-last en proximoContacto |
| `contadorBandejas()` | ~210-280 | Retorna `{ nuevos, reintentos, seguimiento, reunionesPendientes, reunionesPasadas }` |
| `registrarIntento()` | ~563-750 | Core del wizard: registra acción, actualiza contadores (`$inc`), genera evento historial, cambia estado, sugiere próxima tarea |
| `_sugerirProximaTarea()` | ~20-80 | Lógica pura: dado canal/resultado/contadores → retorna `{ tipo, fecha, nota }` |
| `establecerProximaTarea()` | ~80-115 | Setea proximaTarea + proximoContacto + historial |
| `crearReunion()` | ~800-900 | Crea reunión + actualiza contadores + historial + referencia en contacto |
| `confirmarRespuestaWA()` | ~750-800 | Cambia estado si bidireccional + historial |
| `calcularPrioridadScore()` | ~950-1050 | Scoring: segmento + bot + intención + contadores + antigüedad |
| `metricasDiarias()` | ~1100-1150 | Aggregation pipeline por tipo de evento |
| `metricasDiariasPorSdr()` | ~1150-1200 | Double $group pipeline |
| `importarContactos()` | ~1300-1450 | Bulk import con validación de duplicados |
| `importarDesdeNotion()` | ~1450-1600 | Import con mapeo de campos Notion → ContactoSDR |

**Lógica de bandejas:**

```javascript
// nuevos: estado nuevo, sin intentos
nuevos: { estado: 'nuevo', 'contadores.llamadasNoAtendidas': 0, 
           'contadores.mensajesEnviados': 0, 'contadores.llamadasAtendidas': 0 }

// reintentos: intentando lograr contacto
reintentos: { $or: [
  { estado: 'nuevo', $or: [
    { 'contadores.llamadasNoAtendidas': { $gt: 0 } },
    { 'contadores.mensajesEnviados': { $gt: 0 } },
    { 'contadores.llamadasAtendidas': { $gt: 0 } }
  ]},
  { 'cadenciaActiva.estado': 'activa', 'cadenciaActiva.proximoContacto': { $lte: now } }
]}

// seguimiento: contactado/calificado/cierre SIN reunión agendada
seguimiento: { estado: { $in: ['contactado', 'calificado', 'cierre'] },
               _id: { $nin: idsConReunionAgendada } }

// reunionesPendientes: con reunión agendada >= hoy
reunionesPendientes: { _id: { $in: idsReunionPendiente } }

// reunionesPasadas: con reunión pasada sin reunión pendiente
reunionesPasadas: { _id: { $in: idsReunionPasada, $nin: idsReunionPendiente } }
```

**Transición de estado en `registrarIntento()`:**

```javascript
const huboContactoEfectivo = 
  (canal === 'llamada' && resultado === 'atendio') ||
  confirmarRespuestaWA ||
  (canal === 'whatsapp' && resultado === 'respondio');

if (huboContactoEfectivo && contacto.estado === 'nuevo') {
  contacto.estado = 'contactado';
}
```

### 5.2 CadenciaEngine (`cadenciaEngine.js` — 282 líneas)

Motor de cadencias secuenciales. **11 invocaciones desde sdrService**.

| Método | Descripción |
|--------|-------------|
| `iniciarCadencia()` | Asigna cadencia a contacto, setea paso 0, acción 0 |
| `avanzarPaso()` | Incrementa paso/acción, calcula próximo delay |
| `ejecutarPasoActual()` | Obtiene definición del paso actual + template |
| `detenerCadencia()` | Cambia estado a `detenida`, registra historial |
| `obtenerEstadoCadencia()` | Estado actual del contacto en su cadencia |
| `verificarTimeout()` | Verifica si se pasó el delay |
| `completarCadencia()` | Marca como completada + historial |
| `estaEnCadencia()` | Boolean helper |

### 5.3 SdrController (`sdrController.js` — 1521 líneas)

Capa controller Express: wrappea cada método del service con manejo de req/res, extracción de parámetros, y error handling. No contiene lógica de negocio.

---

## 6. Frontend

### 6.1 Service (`sdrService.js` — 751 líneas)

API client con Axios. Usa `apiClient` de `./axiosConfig` con interceptors para auth.

Funciones principales:
- `crearContacto()`, `obtenerContactos()`, `obtenerContacto()`
- `registrarIntento()`, `accionRapida()`, `cambiarEstado()`
- `confirmarRespuestaWA()`, `establecerProximaTarea()`
- `crearReunion()`, `actualizarReunion()`, `cambiarEstadoReunion()`
- `obtenerReunion()`, `eliminarReunion()`
- `procesarTranscripcion()`, `generarResumenContacto()`
- `importarContactos()`, `validarImportacion()`
- `obtenerMetricasDiarias()`, `obtenerFunnelConversion()`
- Templates: `obtenerTemplates()`, `crearTemplate()`, etc.
- Cadencias: `obtenerCadencias()`, `asignarCadencia()`, etc.
- Vistas: `obtenerVistas()`, `crearVista()`, etc.
- Polling: `monitorearChatWA()`, `monitorearMensajesWA()`

### 6.2 Páginas

| Página | Archivo | Líneas | Descripción |
|--------|---------|--------|-------------|
| Contactos SDR | `pages/contactosSDR.js` | ~2566 | Lista con 6 bandejas, filtros, vistas guardadas, móvil y desktop |
| Reuniones SDR | `pages/sdr/reuniones.js` | ~690 | 6 tabs (Hoy/Próximas/Sin registrar/Realizadas/No show/Propuestas), cards con countdown, resultado con IA |
| Detalle Contacto | `pages/sdr/contacto/[id].js` | ~2529 | 3 tabs (Info/Historial/Chat), wizard, historial agrupado, resumen SDR (IA) |

### 6.3 Componentes (`components/sdr/`)

| Componente | Líneas | Propósito |
|------------|--------|-----------|
| `ContactDrawer.js` | 2504 | Drawer lateral con ficha completa del contacto (usado en gestionSDR) |
| `ModalAdminTemplates.js` | 842 | ABM completo de templates WhatsApp con variantes por rubro |
| `SDRWizard.js` | 742 | Wizard de registro de intento/acción (stepper multi-paso) |
| `ContactDrawerSimple.js` | 577 | Drawer simplificado de contacto |
| `ModalImportarExcel.js` | 455 | Modal de importación Excel con preview, mapeo y validación |
| `ModalSelectorTemplate.js` | 370 | Selector de template para WA, filtra por tags de contexto (`detectarContextoTemplate`) |
| `ModalCrearReunion.js` | 180 | Modal compartido para agendar reunión (reemplazó 3 copias inline) |
| `ModalResultadoReunion.js` | 280 | Wizard de 5 pasos para registrar resultado de reunión (estado/comentario/transcripción/detalles/próximo contacto) |
| `FormularioContacto.js` | 285 | Formulario de alta de contacto |
| `ChatViewer.js` | 168 | Visor compacto de chat WhatsApp integrado |
| `ActivityBadges.js` | 43 | Badges con contadores de actividad del contacto |

**Total frontend SDR: ~11,241 líneas**

### 6.4 Funciones de UI Relevantes (en `[id].js`)

| Función | Descripción |
|---------|-------------|
| `agruparEventosPorBloque()` | Agrupa eventos del historial en bloques de 30 minutos |
| `formatearEtiquetaGrupo()` | "Hoy 14:30", "Ayer 09:15", "Lun 11:00" |
| Wizard IIFE (desktop ~L2097, mobile ~L3000) | Determina `canalWizard` desde `proximaTarea.tipo`, fallback a cadencia |

---

## 7. Aggregation Pipelines MongoDB

### 7.1 Listado con nulls-last

```javascript
ContactoSDR.aggregate([
  { $match: query },
  { $addFields: { 
    _hasProximoContacto: { 
      $cond: [{ $ifNull: ['$proximoContacto', false] }, 1, 0] 
    } 
  }},
  { $sort: sortObj },  // _hasProximoContacto: -1, proximoContacto: 1
  { $skip }, { $limit },
  { $project: { _hasProximoContacto: 0 } }
])
```

### 7.2 Funnel de conversión

```javascript
ContactoSDR.aggregate([
  { $match: { empresaId, createdAt: rango } },
  { $group: { _id: '$estado', count: { $sum: 1 } } }
])
// Calcula tasas de conversión entre etapas
```

### 7.3 Métricas diarias

```javascript
EventoHistorialSDR.aggregate([
  { $match: { createdAt: rango_dia, empresaId, realizadoPor? } },
  { $group: { _id: '$tipo', count: { $sum: 1 } } }
])
```

### 7.4 Métricas por período

```javascript
EventoHistorialSDR.aggregate([
  { $match: { empresaId, createdAt: rango } },
  { $group: { _id: { fecha: { $dateToString: '%Y-%m-%d' }, tipo: '$tipo' }, count: { $sum: 1 } } },
  { $group: { _id: '$_id.fecha', eventos: { $push: { tipo: '$_id.tipo', count: '$count' } } } },
  { $sort: { _id: 1 } }
])
```

---

## 8. Autenticación y Seguridad

- **Middleware**: `verifyToken` en `backend/src/middleware/auth.js`
- Verifica Firebase ID Token via `admin.auth().verifyIdToken()`
- Inyecta `req.user` con `{ uid, email, name, ... }`
- Retorna `401` (sin header) o `403` (token inválido)
- **Autorización**: No hay middleware de roles. La lógica admin vs SDR se maneja en el service (ej: `listarContactos` filtra por `sdrAsignado` si no es admin)
- **Excepción**: Archivos de audio estáticos (`/api/sdr/audios/*`) se sirven sin auth

---

## 9. Integraciones

| Sistema | Integración | Mecanismo |
|---------|-------------|-----------|
| **Bot WhatsApp** | Lead → ContactoSDR | `leadContactoBridge.js` (244 líneas) |
| **WhatsApp API** | Envío de mensajes | Endpoint directo desde wizard |
| **Firebase Auth** | Autenticación | Token verification middleware |
| **Notion API** | Importación de contactos | Endpoints dedicados con mapeo de campos |
| **GPT-4o** | Transcripción de audio | `POST /contactos/:id/transcribir-audio` |
| **GPT-4o** | Procesar transcripción de reunión | `POST /reuniones/:id/procesar-transcripcion` |
| **GPT-4o** | Generar resumen SDR del contacto | `POST /contactos/:id/generar-resumen` |

---

## 10. Resumen de Volumen

| Capa | Archivos | Líneas |
|------|----------|--------|
| Models | 5 + index | ~730 |
| Routes | 1 | ~245 |
| Controller | 1 | ~1,521 |
| Backend Services | 2 | ~2,773 |
| Frontend Service | 1 | ~783 |
| Frontend Pages | 3 | ~5,785 |
| Frontend Components | 11 | ~6,446 |
| **TOTAL** | **23** | **~18,283** |
