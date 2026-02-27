# SDR — Documentación Técnica

## 1. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js (React), Material UI v5, Axios |
| **Backend** | Express.js, Node.js |
| **Base de datos** | MongoDB (Mongoose ODM) |
| **Auth** | Firebase Authentication |
| **Usuarios** | Firestore (collection `profile`, campo `sdr: true`) |
| **Chat** | Baileys (WhatsApp Web) |

---

## 2. Modelos de Datos (MongoDB)

### 2.1 ContactoSDR

**Colección**: `contactosdrs`

```
{
  nombre: String (required),
  telefono: String (required, único por empresaId),
  telefonosSecundarios: [String],
  email: String,
  empresa: String,
  cargo: String,
  tamanoEmpresa: Enum('1-10', '11-50', '51-200', '200+'),
  
  estado: Enum('nuevo', 'contactado', 'calificado', 'cierre', 'ganado', 
               'no_contacto', 'no_responde', 'revisar_mas_adelante', 
               'no_califica', 'perdido'),
  segmento: Enum('outbound', 'inbound'),
  
  sdrAsignado: String (Firebase UID),
  sdrAsignadoNombre: String,
  ultimaAccion: Date,
  proximoContacto: Date,
  cantidadIntentos: Number,
  
  origenImportacion: Enum('manual', 'excel', 'notion', 'bot'),
  notionId: String,
  notionDatabaseId: String,
  statusNotion: String,
  
  precalificacionBot: Enum('sin_calificar', 'no_llego', 'calificado', 'quiere_meet'),
  datosBot: {
    rubro: String,
    interes: String,
    cantidadObras: String,
    interaccionFecha: Date,
    saludoInicial: String,
    empresaFirestoreId: String
  },
  leadId: String,
  
  planEstimado: Enum('basico', 'avanzado', 'premium', 'a_medida'),
  intencionCompra: Enum('alta', 'media', 'baja'),
  prioridadManual: Number,
  prioridadScore: Number,
  
  cadenciaActiva: {
    cadenciaId: ObjectId → CadenciaSDR,
    pasoActual: Number,
    iniciadaEn: Date,
    pausada: Boolean,
    completada: Boolean
  },
  
  historialEstados: [{ estado, fecha, cambiadoPor }],
  datosVenta: { monto, moneda, productoInteres, notas, cerradoEn, cerradoPor },
  
  rubro: String,
  empresaId: String,
  creadoPor: String,
  creadoPorNombre: String
}
```

**Índices clave**: 
- `{ empresaId: 1, estado: 1 }` — filtro principal
- `{ empresaId: 1, sdrAsignado: 1 }` — contactos por SDR
- `{ telefono: 1, empresaId: 1 }` — unique, dedup
- `{ empresaId: 1, proximoContacto: 1 }` — cola de trabajo
- `{ 'cadenciaActiva.cadenciaId': 1 }` — contactos en cadencia

### 2.2 EventoHistorialSDR

**Colección**: `eventohistorialsdrs`

```
{
  contactoId: String (required),
  tipo: Enum(38 tipos — ver SDR-FUNCIONAL.md §2.4),
  canal: Enum('llamada', 'whatsapp', 'email', 'linkedin', 'otro'),
  resultado: Enum('atendio', 'no_atendio', 'respondio', 'no_respondio', 'pendiente'),
  descripcion: String,
  nota: String,
  metadata: Mixed,
  estadoAnterior: String,
  estadoNuevo: String,
  cadenciaPaso: Number,
  cadenciaAccion: Number,
  templateUsado: String,
  reunionId: ObjectId,
  realizadoPor: String,
  realizadoPorNombre: String,
  sdrNombre: String,
  empresaId: String
}
```

### 2.3 ReunionSDR

**Colección**: `reunionsdrs`

```
{
  contactoId: String (required),
  numero: Number (auto-incremental por contacto),
  estado: Enum('agendada', 'realizada', 'no_show', 'cancelada'),
  fecha: Date (required),
  hora: String,
  link: String,
  lugar: String,
  notas: String,
  participantes: [String],
  asistio: Boolean,
  duracionMinutos: Number,
  empresaNombre: String,
  tamanoEmpresa: String,
  contactoPrincipal: String,
  rolContacto: String,
  puntosDeDolor: [String],
  modulosPotenciales: [String],
  registradoPor: String,
  registradoPorNombre: String,
  sdrId: String,
  empresaId: String
}
```

### 2.4 CadenciaSDR

**Colección**: `cadenciasdrs`

Ver [SDR-CADENCIAS.md](SDR-CADENCIAS.md) §2 para estructura completa.

### 2.5 VistaGuardadaSDR

**Colección**: `vistaguardadasdrs`

```
{
  nombre: String (required),
  empresaId: String,
  usuarioId: String (null = compartida),
  filtros: {
    estados: [String],
    planEstimado: [String],
    intencionCompra: [String],
    precalificacionBot: [String],
    tamanoEmpresa: [String],
    cadenciaPaso: Number,
    proximoContacto: String,
    tieneReunion: Boolean,
    sdrAsignado: String,
    segmento: String,
    fechaCreacionDesde: Date,
    fechaCreacionHasta: Date,
    busqueda: String
  },
  ordenarPor: String,
  ordenDir: Enum('asc', 'desc'),
  esDefault: Boolean,
  icono: String,
  color: String
}
```

---

## 3. API REST

Todas las rutas están bajo el prefijo `/sdr` y requieren autenticación Firebase (`verifyFirebaseToken` middleware).

### 3.1 Contactos

| Método | Ruta | Descripción | Query/Body params |
|--------|------|-------------|-------------------|
| `GET` | `/contactos` | Listar contactos | `empresaId, estado, sdrAsignado, segmento, busqueda, soloSinAsignar, excluirEstados, soloVencidos, statusNotion, planEstimado, intencionCompra, precalificacionBot, tieneReunion, ordenarPor, ordenDir, page, limit` |
| `POST` | `/contactos` | Crear contacto | `{ nombre, telefono, email, empresa, cargo, empresaId, sdrId, ... }` |
| `PUT` | `/contactos/:id` | Actualizar contacto | `{ campo: valor }` |
| `GET` | `/contactos/:id` | Obtener contacto + historial + reuniones | — |
| `GET` | `/contactos/siguiente` | Siguiente contacto pendiente | `sdrAsignado` |
| `POST` | `/contactos/asignar` | Asignar contactos a SDR | `{ contactoIds, sdrId, sdrNombre, empresaId }` |
| `POST` | `/contactos/desasignar` | Desasignar contactos | `{ contactoIds, empresaId }` |
| `POST` | `/contactos/eliminar` | Eliminar contactos | `{ contactoIds }` |
| `POST` | `/contactos/eliminar-todos` | Eliminar todos | `{ empresaId, confirmar: true }` |

### 3.2 Acciones Rápidas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/acciones/registrar` | Registrar acción genérica |
| `POST` | `/acciones/llamada` | Registrar llamada |
| `POST` | `/acciones/whatsapp` | Registrar WhatsApp |
| `POST` | `/acciones/email` | Registrar email |
| `POST` | `/acciones/no-responde` | Marcar no responde |
| `POST` | `/acciones/no-califica` | Marcar no califica |
| `POST` | `/acciones/cambiar-estado` | Cambiar estado |
| `POST` | `/acciones/reunion` | Crear reunión |

### 3.3 Reuniones

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/reuniones` | Listar reuniones | 
| `POST` | `/reuniones` | Crear reunión |
| `PUT` | `/reuniones/:id` | Actualizar reunión |
| `PUT` | `/reuniones/:id/evaluar` | Evaluar reunión |

### 3.4 Importación / Exportación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/importar/preview` | Vista previa de importación Excel |
| `POST` | `/importar` | Ejecutar importación Excel |
| `POST` | `/notion/consultar` | Consultar base de datos Notion |
| `GET` | `/notion/schema` | Obtener schema de base Notion |
| `POST` | `/notion/importar-pagina` | Importar página individual |
| `GET` | `/exportar/contactos` | Exportar contactos a Excel |
| `GET` | `/exportar/metricas` | Exportar métricas |

### 3.5 Métricas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/metricas/diarias` | Métricas del día (llamadas, WA, reuniones por SDR) |
| `GET` | `/metricas/periodo` | Métricas por rango de fechas |
| `GET` | `/metricas/funnel` | Funnel de conversión |

### 3.6 Historial

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/historial/:id` | Obtener historial de un contacto |
| `DELETE` | `/historial/:eventoId` | Eliminar evento del historial |

### 3.7 Cadencias

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/cadencias` | Listar cadencias activas |
| `POST` | `/cadencias` | Crear cadencia |
| `PUT` | `/cadencias/:id` | Actualizar cadencia |
| `DELETE` | `/cadencias/:id` | Eliminar cadencia |
| `POST` | `/cadencias/asignar` | Asignar cadencia a 1 contacto |
| `POST` | `/cadencias/asignar-masiva` | Asignar cadencia masivamente |
| `POST` | `/cadencias/detener` | Detener cadencia |
| `GET` | `/cadencias/paso-actual/:id` | Obtener paso actual resuelto |
| `POST` | `/cadencias/avanzar` | Avanzar al siguiente paso |

### 3.8 Templates WhatsApp

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/templates/whatsapp` | Listar templates |
| `POST` | `/templates/whatsapp` | Crear template |
| `PUT` | `/templates/whatsapp/:id` | Actualizar template |
| `DELETE` | `/templates/whatsapp/:id` | Eliminar template |
| `GET` | `/templates/tipos` | Listar tipos de template |
| `POST` | `/templates/tipos` | Crear tipo |
| `PUT` | `/templates/tipos/:id` | Actualizar tipo |
| `DELETE` | `/templates/tipos/:id` | Eliminar tipo |

### 3.9 Vistas Guardadas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/vistas` | Listar vistas del usuario |
| `POST` | `/vistas` | Crear vista |
| `PUT` | `/vistas/:id` | Actualizar vista |
| `DELETE` | `/vistas/:id` | Eliminar vista |

### 3.10 Otros

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/sdrs` | Obtener SDRs disponibles (Firestore) |
| `POST` | `/webhook/nuevo-lead` | Webhook para leads nuevos del bot |

---

## 4. Servicios Backend

### 4.1 sdrService.js (~2100 líneas)

Servicio principal. Contiene toda la lógica de negocio:
- CRUD de contactos con validación de duplicados por teléfono
- Registro de acciones con auto-incremento de `cantidadIntentos`
- Gestión de reuniones con auto-numeración
- Métricas agregadas por día/periodo/funnel
- Importación Excel con validación y dedup
- Integración Notion (consulta + importación)
- CRUD de cadencias con lógica de `defaultInbound`/`defaultOutbound`
- CRUD de vistas guardadas

### 4.2 cadenciaEngine.js (282 líneas)

Motor de cadencias. Ver [SDR-CADENCIAS.md](SDR-CADENCIAS.md) §3.

### 4.3 leadContactoBridge.js (244 líneas)

Puente entre el sistema de leads (bot WhatsApp) y el módulo SDR:
- Crea `ContactoSDR` con `segmento: 'inbound'` cuando llega un lead del bot
- Auto-asigna cadencia `defaultInbound`
- Enriquece contactos existentes con datos del bot
- Evita duplicados por `leadId` o `telefono`

---

## 5. Frontend — Servicios

### 5.1 sdrService.js (app-web, 704 líneas)

Cliente API con axios. Todos los métodos son `async` y retornan `res.data`.

Secciones:
- Contactos (CRUD, listar, siguiente)
- Acciones (registrar, llamada, WA, email, estado)
- Reuniones (CRUD, evaluar)
- Importación/Exportación
- Notion
- Métricas
- Historial (obtener, eliminar)
- SDRs
- Templates WhatsApp + Tipos
- Cadencias (CRUD, asignar, masiva, detener, paso actual, avanzar)
- Vistas guardadas (CRUD)
- Webhook

### 5.2 sdrConstants.js

Diccionarios compartidos con label, color, icono y emoji para:
- `ESTADOS_CONTACTO` (10 estados)
- `PLANES_SORBY` (4 planes con precio)
- `INTENCIONES_COMPRA` (3 niveles)
- `PRECALIFICACION_BOT` (4 estados)
- `ESTADOS_REUNION` (4 estados)

---

## 6. Arquitectura de Componentes Frontend

```
pages/
├── gestionSDR.js               → Admin: Dashboard + Contactos + Reuniones
│   ├── renderDashboard()       → Métricas, tabla SDRs, últimas reuniones
│   ├── renderContactos()       → Tabla filtrable, acciones masivas
│   ├── renderReuniones()       → Lista con evaluación
│   └── ModalAsignar            → Asignar/distribuir contactos a SDRs
│
├── contactosSDR.js             → SDR: Lista de mis contactos
│   ├── Filtros (tipo, estado, próximo, segmento, búsqueda)
│   ├── Cards de contacto mobile
│   ├── Vistas guardadas
│   └── Acciones masivas (fecha, cadencia)
│
└── sdr/
    ├── cadencias.js            → ABM de cadencias
    │   ├── Lista con cards
    │   └── Formulario editor (pasos, acciones, variantes)
    │
    └── contacto/[id].js        → Detalle contacto
        ├── Tab Info             → Datos, estado editable, plan, intención
        ├── Tab Historial        → Timeline de eventos + comentarios
        ├── Tab Chat             → MiniChatViewer (WhatsApp)
        └── Barra fija mobile    → Cadencia actual + acciones rápidas

components/sdr/
├── DrawerDetalleContactoSDR.js → Drawer + EstadoChip + EstadoChipEditable + ModalEditarContacto
├── ModalRegistrarAccion.js     → Wizard 3 fases: tipo → resultado → seguimiento
├── ModalSelectorTemplate.js    → Selector de templates WA por paso cadencia
├── ModalAgregarContacto.js     → Form crear contacto
├── ModalImportarExcel.js       → Upload + preview + importar Excel
├── ModalAdminTemplates.js      → CRUD de templates WA
├── MiniChatViewer.js           → Visor de chat WA embebido
└── ContactoDrawer.js           → Drawer genérico
```

---

## 7. Variables de Entorno

### Backend

| Variable | Uso |
|----------|-----|
| `MONGO_URI_DHN` | URI MongoDB (producción usa DigitalOcean) |
| `FIREBASE_*` | Credenciales Firebase Admin SDK |
| `NOTION_TOKEN` | Token de integración Notion |

### Frontend

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | URL base del backend |
| `NEXT_PUBLIC_FIREBASE_*` | Config Firebase client |
