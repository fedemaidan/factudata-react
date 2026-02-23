# Rediseño Módulo Comercial — Documento Técnico

> **Fecha**: 23/02/2026  
> **Documento complementario**: [SDR-COMERCIAL-FUNCIONAL.md](SDR-COMERCIAL-FUNCIONAL.md)  
> **Stack actual**: Next.js (frontend) + Express/Node.js (backend) + MongoDB (Mongoose) + Firebase Auth

---

## Arquitectura Actual

```
app-web/                              backend/
├── pages/                            ├── src/
│   ├── contactosSDR.js (1400 LOC)    │   ├── controllers/sdrController.js
│   └── gestionSDR.js   (2400 LOC)    │   ├── models/sdr/
├── components/sdr/                   │   │   ├── ContactoSDR.js
│   ├── DrawerDetalleContactoSDR.js   │   │   ├── ReunionSDR.js
│   │   (1840 LOC)                    │   │   └── HistorialSDR.js
│   ├── ModalSelectorTemplate.js      │   └── routes/sdrRoutes.js
│   ├── ModalRegistrarAccion.js       ├── utils/
│   ├── ModalAgregarContacto.js       └── services/
│   └── ModalImportarExcel.js
├── services/sdrService.js
└── docs/SDR-MANUAL.md
```

### Problemas técnicos actuales identificados

1. **Archivos monolíticos**: `gestionSDR.js` (2400 LOC) y `DrawerDetalleContactoSDR.js` (1840 LOC) son difíciles de mantener
2. **Estados insuficientes**: Solo 6 estados (`nuevo`, `en_gestion`, `meet`, `calificado`, `no_califica`, `no_responde`), no reflejan el pipeline real
3. **No hay scoring**: Sin priorización inteligente de contactos
4. **Métricas estimadas**: Para semana/mes se multiplican por factores fijos en vez de calcular realmente
5. **No hay cadencias**: Los templates de WhatsApp tienen `paso` pero no hay lógica de cadencia
6. **Importaciones en memoria**: Estado de importaciones asíncronas se guarda en `Map()` en memoria (se pierde al reiniciar)
7. **No hay pipeline post-meet**: El flujo termina en `calificado`

---

## Fase 1: Estados Puros + Loop de Llamadas + Métricas Reales

### 1.1 Cambios en el Modelo de Datos

#### `ContactoSDR.js` — Campos nuevos y modificados

```javascript
// CAMBIO: Ampliar enum de estados
const ESTADOS_CONTACTO = [
    'nuevo',                // Recién llegado, sin intentos
    'contactado',           // Se habló al menos una vez (reemplaza 'en_gestion')
    'calificado',           // Dio info útil de calificación
    'meet_agendada',        // Reunión coordinada con fecha
    'meet_realizada',       // La reunión ocurrió
    'cierre',               // En negociación activa
    'ganado',               // Venta concretada
    'no_contacto',          // Intentos sin lograr contacto (era 'no_responde' parcial)
    'no_responde',          // Contactó pero ghost
    'revisar_mas_adelante', // Interés pero timing no es ahora
    'no_califica',          // No es target
    'perdido'               // Pasó por pipeline pero no cerró
];

// NUEVO: Plan estimado (¿qué plan le conviene por perfil?)
planEstimado: {
    type: String,
    enum: ['basico', 'avanzado', 'premium', 'a_medida', null],
    default: null  // null = sin definir
},

// NUEVO: Intención de compra (¿cuántas ganas tiene?)
intencionCompra: {
    type: String,
    enum: ['alta', 'media', 'baja', null],
    default: null  // null = sin definir
},

// NUEVO: Prioridad calculada (se recalcula en cada acción)
prioridadScore: {
    type: Number,
    default: 0
},

// NUEVO: Cadencia activa
cadenciaActiva: {
    cadenciaId: { type: Schema.Types.ObjectId, ref: 'CadenciaSDR', default: null },
    pasoActual: { type: Number, default: 0 },
    iniciadaEn: { type: Date, default: null },
    pausada: { type: Boolean, default: false },
    completada: { type: Boolean, default: false }
},

// NUEVO: Historial de estados (Status Sum de Notion)
historialEstados: [{
    estado: String,
    fecha: { type: Date, default: Date.now },
    cambiadoPor: String
}],

// NUEVO: Datos de venta (Fase 3, pero el campo va desde ahora)
datosVenta: {
    planInteresado: { type: String, default: null },
    ticketEstimado: { type: Number, default: null },
    fechaEstimadaCierre: { type: Date, default: null },
    modulosInteresados: [String],
    fechaAlta: { type: Date, default: null },
    motivoPerdida: { type: String, default: null }
},

// NUEVO: Rubro del contacto/empresa
rubro: {
    type: String,
    trim: true,
    default: null
}
```

#### Migración de datos existentes

```javascript
// Script de migración: scripts/migrar-estados-sdr.js
// Mapeo de estados viejos → nuevos
const MAPEO_ESTADOS = {
    'nuevo': 'nuevo',
    'en_gestion': 'contactado',      // El más importante
    'meet': 'meet_agendada',
    'calificado': 'calificado',
    'no_califica': 'no_califica',
    'no_responde': 'no_contacto'     // Ojo: no_responde viejo → no_contacto nuevo
};

// Para cada contacto existente:
// 1. Mapear estado
// 2. Inicializar historialEstados con [{ estado: estadoNuevo, fecha: updatedAt }]
// 3. Inicializar planEstimado = null e intencionCompra = null
// 4. Calcular prioridadScore inicial
```

#### Nuevo índice compuesto para priorización

```javascript
ContactoSDRSchema.index({ 
    empresaId: 1, 
    sdrAsignado: 1, 
    estado: 1, 
    prioridadScore: -1 
});
ContactoSDRSchema.index({ empresaId: 1, 'cadenciaActiva.cadenciaId': 1 });
ContactoSDRSchema.index({ empresaId: 1, planEstimado: 1 });
ContactoSDRSchema.index({ empresaId: 1, intencionCompra: 1 });
```

#### Función de cálculo de prioridad

```javascript
// utils/calcularPrioridad.js

// Planes de Sorby y su valor como score
const PLANES_SORBY = {
    a_medida: { score: 500, label: 'A medida', precio: null },
    premium:  { score: 400, label: 'Premium',  precio: 625000 },
    avanzado: { score: 250, label: 'Avanzado', precio: 375000 },
    basico:   { score: 150, label: 'Básico',   precio: 250000 }
};

function calcularPrioridadScore(contacto) {
    let score = 0;
    const ahora = new Date();
    
    // Factor 1: Próximo contacto vencido (+100 por día vencido, max 500)
    if (contacto.proximoContacto && contacto.proximoContacto < ahora) {
        const diasVencido = Math.floor((ahora - contacto.proximoContacto) / 86400000);
        score += Math.min(diasVencido * 100, 500);
    }
    
    // Factor 2: Plan estimado (proxy de valor del lead)
    if (contacto.planEstimado && PLANES_SORBY[contacto.planEstimado]) {
        score += PLANES_SORBY[contacto.planEstimado].score;
    }
    
    // Factor 3: Intención de compra (ganas de comprar)
    const SCORE_INTENCION = { alta: 300, media: 200, baja: 100 };
    if (contacto.intencionCompra) {
        score += SCORE_INTENCION[contacto.intencionCompra] || 0;
    }
    
    // Factor 4: Tamaño de empresa (complementa al plan)
    const SCORE_TAMANO = { '200+': 100, '51-200': 60, '11-50': 30, '1-10': 10 };
    score += SCORE_TAMANO[contacto.tamanoEmpresa] || 0;
    
    // Factor 5: Frescura (leads nuevos = más score)
    const diasDesdeCreacion = Math.floor((ahora - contacto.createdAt) / 86400000);
    if (diasDesdeCreacion <= 1) score += 200;
    else if (diasDesdeCreacion <= 7) score += 150;
    else if (diasDesdeCreacion <= 14) score += 100;
    else if (diasDesdeCreacion <= 30) score += 50;
    
    // Factor 6: Estado (estados más avanzados = más prioridad)
    const SCORE_ESTADO = {
        meet_agendada: 250, cierre: 250, meet_realizada: 200,
        calificado: 150, contactado: 100, nuevo: 80,
        revisar_mas_adelante: 30, no_contacto: 10
    };
    score += SCORE_ESTADO[contacto.estado] || 0;
    
    // Factor 7: Sin próximo contacto programado (-50, para que aparezcan pero no arriba)
    if (!contacto.proximoContacto) score -= 50;
    
    return score;
}
```

### 1.2 Cambios en el Backend

#### `sdrController.js` — Endpoints nuevos/modificados

```
// MODIFICAR: listarContactos
// - Agregar ordenamiento por prioridadScore (default)
// - Agregar filtros: planEstimado, intencionCompra, cadenciaPaso, proximoContacto (vencido/hoy/semana)
// - Eliminar filtro de estado viejo 'en_gestion', agregar los nuevos

// MODIFICAR: registrarIntento
// - Recalcular prioridadScore después de cada acción
// - Actualizar historialEstados cuando cambia el estado
// - Avanzar paso de cadencia si aplica

// NUEVO: POST /acciones/plan-estimado
// - Actualizar planEstimado de un contacto (basico/avanzado/premium/a_medida)
// - Recalcular prioridadScore

// NUEVO: POST /acciones/intencion-compra
// - Actualizar intencionCompra de un contacto (alta/media/baja)
// - Recalcular prioridadScore

// MODIFICAR: obtenerMetricasDiarias / obtenerMetricasPeriodo
// - Calcular con aggregate real en vez de estimaciones
// - Agregar: tasa de contacto, velocidad de contacto

// NUEVO: GET /metricas/funnel
// - Devuelve conteo por estado para el embudo de conversión
// - Filtrable por período y SDR
```

#### Recálculo de prioridad — Middleware

```javascript
// middleware/recalcularPrioridad.js
// Se ejecuta después de: registrarIntento, cambiarEstado, actualizarProximoContacto
async function recalcularPrioridad(contactoId) {
    const contacto = await ContactoSDR.findById(contactoId);
    if (!contacto) return;
    
    contacto.prioridadScore = calcularPrioridadScore(contacto);
    await contacto.save();
}
```

#### Métricas reales por período

```javascript
// REEMPLAZAR la lógica actual de multiplicar por factores
// USAR: aggregate pipeline con $match por fecha real

async function obtenerMetricasPeriodo(req, res) {
    const { empresaId, sdrId, desde, hasta } = req.query;
    
    const matchBase = {
        empresaId,
        createdAt: { $gte: new Date(desde), $lte: new Date(hasta) }
    };
    if (sdrId) matchBase.realizadoPor = sdrId;
    
    const metricas = await HistorialSDR.aggregate([
        { $match: matchBase },
        { $group: {
            _id: '$tipo',
            cantidad: { $sum: 1 }
        }}
    ]);
    
    // Reuniones en el período
    const reuniones = await ReunionSDR.aggregate([
        { $match: { 
            empresaId, 
            fecha: { $gte: new Date(desde), $lte: new Date(hasta) }
        }},
        { $group: { _id: '$estado', cantidad: { $sum: 1 } }}
    ]);
    
    // Funnel: contactos por estado actual
    const funnel = await ContactoSDR.aggregate([
        { $match: { empresaId, ...(sdrId ? { sdrAsignado: sdrId } : {}) }},
        { $group: { _id: '$estado', cantidad: { $sum: 1 } }}
    ]);
    
    res.json({ metricas, reuniones, funnel });
}
```

### 1.3 Cambios en el Frontend

#### Nueva estructura de archivos (refactorización progresiva)

```
app-web/src/
├── pages/
│   ├── contactosSDR.js         # MODIFICAR: actualizar estados, scoring
│   └── gestionSDR.js           # MODIFICAR: actualizar estados, métricas
│
├── components/sdr/
│   ├── DrawerDetalleContactoSDR.js  # MODIFICAR: scoring, nuevo estado
│   ├── ModalRegistrarAccion.js      # MODIFICAR: nuevas acciones
│   ├── ModalSelectorTemplate.js     # SIN CAMBIOS
│   ├── ModalAgregarContacto.js      # MODIFICAR: agregar rubro, scoring
│   ├── ModalImportarExcel.js        # SIN CAMBIOS
│   │
│   │ # NUEVOS COMPONENTES:
│   ├── ModoLlamadas.js              # [NUEVO] Pantalla de loop de llamadas
│   ├── PlanEstimadoSelector.js      # [NUEVO] Selector de plan (Básico/Avanzado/Premium/A medida)
│   ├── IntencionCompraSelector.js   # [NUEVO] Selector de intención (Alta/Media/Baja)
│   ├── FunnelChart.js               # [NUEVO] Visualización de embudo
│   ├── MetricasDashboard.js         # [NUEVO] Extraer métricas de gestionSDR
│   └── FiltrosAvanzados.js          # [NUEVO] Componente de filtros reutilizable
│
├── services/
│   └── sdrService.js               # MODIFICAR: agregar nuevos endpoints
```

#### `ModoLlamadas.js` — Loop de llamadas (componente nuevo clave)

```
Concepto de UI (mobile-first):

┌─────────────────────────────────────┐
│  ← 12/47 contactados     [Salir]   │  ← Barra superior con progreso
│─────────────────────────────────────│
│                                     │
│  🔴 SCORE ALTO                      │  ← Badge de scoring
│                                     │
│  Juan Pérez                         │  ← Nombre grande
│  Constructora ABC · 51-200 emp.     │  ← Empresa + tamaño
│  📞 +5491145678900                  │  ← Teléfono
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Última nota: "Lo charla     │    │  ← Contexto rápido
│  │ con su socio, llamar el 26" │    │
│  │ — 23/02 14:30               │    │
│  └─────────────────────────────┘    │
│                                     │
│  Cadencia: Paso 2/5                 │  ← Paso actual
│  Intentos: 3                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      📞 LLAMAR              │    │  ← Botón principal enorme
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [← Anterior]  [Saltar →]          │  ← Navegación
│─────────────────────────────────────│
│  [No atendió]  [Atendió]  [WhatsApp]│ ← Acciones rápidas post-llamada
└─────────────────────────────────────┘
```

**Lógica del componente:**

```javascript
// Flujo interno:
// 1. Pre-filtra contactos según criterio seleccionado
// 2. Los ordena por prioridadScore desc
// 3. Muestra uno a la vez (índice en estado local)
// 4. "Llamar" → window.open(`tel:${telefono}`) → espera resultado
// 5. "No atendió" → POST /acciones/intento { tipo: 'llamada_no_atendida' }
//    → sugiere "Enviar WhatsApp?" → si sí, abre selector template
//    → avanza al siguiente
// 6. "Atendió" → abre mini-modal: nota + plan estimado + próximo contacto + nuevo estado
//    → POST /acciones/intento + POST /acciones/plan-estimado
//    → avanza al siguiente
// 7. "Saltar" → no registra nada, va al siguiente
```

#### Constantes actualizadas

```javascript
// Planes de Sorby para scoring — compartido entre componentes
const PLANES_SORBY = {
    basico:   { label: 'Básico',   color: 'success', precio: 250000, icon: '🟢' },
    avanzado: { label: 'Avanzado', color: 'primary', precio: 375000, icon: '🔵' },
    premium:  { label: 'Premium',  color: 'secondary', precio: 625000, icon: '🟣' },
    a_medida: { label: 'A medida', color: 'warning', precio: null, icon: '🟡' }
};

// Intención de compra — dimensión independiente del plan
const INTENCIONES_COMPRA = {
    alta:  { label: 'Alta',  color: 'error',   icon: '🔴' },
    media: { label: 'Media', color: 'warning', icon: '🟠' },
    baja:  { label: 'Baja',  color: 'default', icon: '🟡' }
};
```

```javascript
// Reemplazar en ambas páginas (contactosSDR.js, gestionSDR.js)
const ESTADOS_CONTACTO = {
    nuevo:               { label: 'Nuevo',              color: 'info',    icon: FiberNewIcon },
    contactado:          { label: 'Contactado',         color: 'warning', icon: PhoneIcon },
    calificado:          { label: 'Calificado',         color: 'success', icon: StarIcon },
    meet_agendada:       { label: 'Meet agendada',      color: 'primary', icon: EventIcon },
    meet_realizada:      { label: 'Meet realizada',     color: 'primary', icon: EventAvailableIcon },
    cierre:              { label: 'En cierre',          color: 'success', icon: HandshakeIcon },
    ganado:              { label: 'Ganado',             color: 'success', icon: EmojiEventsIcon },
    no_contacto:         { label: 'No contactado',      color: 'default', icon: PhoneDisabledIcon },
    no_responde:         { label: 'No responde',        color: 'default', icon: DoNotDisturbIcon },
    revisar_mas_adelante:{ label: 'Revisar más adelante',color: 'warning', icon: ScheduleIcon },
    no_califica:         { label: 'No califica',        color: 'error',   icon: BlockIcon },
    perdido:             { label: 'Perdido',            color: 'error',   icon: ThumbDownIcon }
};
```

### 1.4 Ingreso automático de leads

#### Opción A: Webhook desde Google Sheets (más simple)

```javascript
// backend: POST /api/sdr/webhook/nuevo-lead
// Google Sheets tiene un script (Apps Script) que al insertar fila en "event"
// con evento "nuevo_contacto", hace POST con { telefono, extra, created_at }

router.post('/webhook/nuevo-lead', async (req, res) => {
    const { telefono, extra, created_at, empresaId } = req.body;
    
    // Verificar que no exista
    const existe = await ContactoSDR.findOne({ telefono, empresaId });
    if (existe) return res.json({ duplicado: true });
    
    const contacto = await ContactoSDR.create({
        nombre: extra?.split(' ')[0] || 'Nuevo lead',
        telefono: normalizarTelefono(telefono),
        estado: 'nuevo',
        segmento: 'inbound',
        empresaId,
        creadoPor: 'sistema',
        notas: extra || ''
    });
    
    // Asignar al SDR de turno (round-robin o al pool)
    // ...
    
    res.json({ ok: true, contactoId: contacto._id });
});
```

#### Opción B: Cron job que lee la tabla de eventos (más robusto)

```javascript
// scripts/syncLeadsDesdeEventos.js
// Cron: cada 5 minutos lee la tabla de eventos y crea contactos nuevos
// Guarda un cursor (último created_at procesado) en MongoDB
```

**Recomendación**: Empezar con **Opción A** (webhook) porque es más simple y en tiempo real. La Opción B sirve como fallback si el webhook falla.

### 1.5 Nuevas rutas API

```javascript
// Agregar a sdrRoutes.js

// Plan estimado y intención de compra (scoring)
router.post('/acciones/plan-estimado', sdrController.actualizarPlanEstimado);
router.post('/acciones/intencion-compra', sdrController.actualizarIntencionCompra);

// Funnel
router.get('/metricas/funnel', sdrController.obtenerFunnel);

// Webhook de leads
router.post('/webhook/nuevo-lead', sdrController.webhookNuevoLead);

// Modo llamadas: obtener siguiente contacto con prioridad
router.get('/contactos/siguiente', sdrController.obtenerSiguienteContacto);
```

---

## Fase 2: Cadencias Configurables + Historial Rico

### 2.1 Nuevo Modelo: `CadenciaSDR.js`

```javascript
// backend/src/models/sdr/CadenciaSDR.js

const CadenciaSDRSchema = new Schema({
    nombre: { type: String, required: true },        // "Primer Contacto"
    descripcion: { type: String },
    empresaId: { type: String, required: true },
    
    pasos: [{
        orden: { type: Number, required: true },      // 1, 2, 3...
        tipoAccion: { 
            type: String, 
            enum: ['llamada', 'whatsapp', 'email', 'espera'],
            required: true 
        },
        templateId: { type: Schema.Types.ObjectId, ref: 'TemplateWhatsAppSDR' },
        delayHoras: { type: Number, default: 0 },    // Horas desde el paso anterior
        delayDesde: { 
            type: String, 
            enum: ['paso_anterior', 'inicio_cadencia'],
            default: 'paso_anterior'
        },
        descripcion: String,                          // "Llamar AM"
        horaPreferida: { type: String, default: null } // "09:00" - para scheduling
    }],
    
    // Configuración
    detenerAlResponder: { type: Boolean, default: true },
    estadoAlCompletar: { 
        type: String, 
        enum: ESTADOS_CONTACTO,
        default: 'no_contacto'  // Si termina sin respuesta
    },
    
    // Control
    activa: { type: Boolean, default: true },
    esDefault: { type: Boolean, default: false },     // Cadencia por defecto para nuevos
    
    creadoPor: String,
    creadoPorNombre: String
}, { timestamps: true });
```

### 2.2 Motor de Cadencias

```javascript
// backend/src/services/cadenciaEngine.js

class CadenciaEngine {
    /**
     * Asignar cadencia a un contacto
     * Se llama al: crear contacto nuevo, reasignar cadencia manual
     */
    async asignarCadencia(contactoId, cadenciaId) {
        const cadencia = await CadenciaSDR.findById(cadenciaId);
        const contacto = await ContactoSDR.findById(contactoId);
        
        contacto.cadenciaActiva = {
            cadenciaId: cadencia._id,
            pasoActual: 1,
            iniciadaEn: new Date(),
            pausada: false,
            completada: false
        };
        
        // Programar próximo contacto según paso 1
        const paso1 = cadencia.pasos.find(p => p.orden === 1);
        contacto.proximoContacto = calcularFechaProximoContacto(paso1);
        
        await contacto.save();
    }
    
    /**
     * Avanzar al siguiente paso de la cadencia
     * Se llama después de cada acción del SDR
     */
    async avanzarPaso(contactoId) {
        const contacto = await ContactoSDR.findById(contactoId)
            .populate('cadenciaActiva.cadenciaId');
        
        if (!contacto.cadenciaActiva?.cadenciaId) return;
        if (contacto.cadenciaActiva.pausada) return;
        if (contacto.cadenciaActiva.completada) return;
        
        const cadencia = contacto.cadenciaActiva.cadenciaId;
        const pasoActual = contacto.cadenciaActiva.pasoActual;
        const siguientePaso = cadencia.pasos.find(p => p.orden === pasoActual + 1);
        
        if (!siguientePaso) {
            // Cadencia completada
            contacto.cadenciaActiva.completada = true;
            if (cadencia.estadoAlCompletar) {
                contacto.estado = cadencia.estadoAlCompletar;
            }
        } else {
            contacto.cadenciaActiva.pasoActual = siguientePaso.orden;
            contacto.proximoContacto = calcularFechaProximoContacto(siguientePaso);
        }
        
        await contacto.save();
    }
    
    /**
     * Detener cadencia (contacto respondió / cambió de estado)
     */
    async detenerCadencia(contactoId, motivo) {
        const contacto = await ContactoSDR.findById(contactoId);
        if (contacto.cadenciaActiva?.cadenciaId) {
            contacto.cadenciaActiva.completada = true;
            await contacto.save();
            
            await HistorialSDR.create({
                contacto: contactoId,
                tipo: 'cadencia_detenida',
                descripcion: `Cadencia detenida: ${motivo}`,
                empresaId: contacto.empresaId
            });
        }
    }
}
```

### 2.3 CRUD de Cadencias (nuevas rutas)

```javascript
// Agregar a sdrRoutes.js

// CRUD Cadencias
router.get('/cadencias', sdrController.listarCadencias);
router.post('/cadencias', sdrController.crearCadencia);
router.put('/cadencias/:id', sdrController.actualizarCadencia);
router.delete('/cadencias/:id', sdrController.eliminarCadencia);

// Asignar/detener cadencia
router.post('/cadencias/asignar', sdrController.asignarCadencia);
router.post('/cadencias/detener', sdrController.detenerCadencia);
```

### 2.4 Modificaciones a `HistorialSDR.js`

```javascript
// Nuevos tipos de evento
const TIPOS_EVENTO = [
    // ... existentes ...
    'cadencia_iniciada',
    'cadencia_avanzada',       // Pasó de paso N a N+1
    'cadencia_completada',     // Llegó al final sin respuesta
    'cadencia_detenida',       // Se detuvo por respuesta o manual
    'plan_estimado_actualizado', // Cambió plan estimado del contacto
    'intencion_compra_actualizada', // Cambió intención de compra del contacto
    'estado_automatico',       // Cambio de estado automático por cadencia
];

// Nuevo campo
estadoAnterior: { type: String, default: null },
estadoNuevo: { type: String, default: null },
cadenciaPaso: { type: Number, default: null },
```

### 2.5 Frontend — Gestión de Cadencias

```
// Nuevo componente: components/sdr/CadenciaManager.js
// Dentro de gestionSDR.js, nueva pestaña "Cadencias"

// UI:
// - Lista de cadencias configuradas
// - Editor visual de pasos (drag & drop para reordenar)
// - Cada paso: tipo de acción + delay + template asociado
// - Preview de la cadencia como timeline
// - Botón "Establecer como default"
```

### 2.6 Filtros Avanzados + Vistas Guardadas

```javascript
// Nuevo modelo: VistaGuardadaSDR.js
const VistaGuardadaSDRSchema = new Schema({
    nombre: { type: String, required: true },
    empresaId: { type: String, required: true },
    usuarioId: { type: String },  // null = compartida con todos
    filtros: {
        estados: [String],
        planEstimado: [String],  // ['basico', 'avanzado', 'premium', 'a_medida']
        intencionCompra: [String],  // ['alta', 'media', 'baja']
        tamanoEmpresa: [String],
        cadenciaPaso: Number,
        proximoContacto: String,  // 'vencido', 'hoy', 'semana', 'sin_programar'
        sdrAsignado: String,
        segmento: String,
        fechaCreacionDesde: Date,
        fechaCreacionHasta: Date,
        busqueda: String
    },
    ordenarPor: { type: String, default: 'prioridadScore' },
    ordenDir: { type: String, default: 'desc' },
    esDefault: { type: Boolean, default: false }
}, { timestamps: true });
```

---

## Fase 3: Pipeline de Ventas

### 3.1 Nuevo Modelo: `OportunidadSDR.js`

```javascript
// backend/src/models/sdr/OportunidadSDR.js

const ESTADOS_OPORTUNIDAD = [
    'propuesta',      // Se envió presupuesto/propuesta
    'negociacion',    // En discusión de términos
    'ganado',         // Cerró la venta
    'perdido'         // No se concretó
];

const OportunidadSDRSchema = new Schema({
    contacto: { type: Schema.Types.ObjectId, ref: 'ContactoSDR', required: true },
    empresaId: { type: String, required: true },
    
    estado: { 
        type: String, 
        enum: ESTADOS_OPORTUNIDAD, 
        default: 'propuesta' 
    },
    
    // Datos comerciales
    planInteresado: { type: String },
    ticketMensual: { type: Number },
    modulosInteresados: [String],
    fechaEstimadaCierre: { type: Date },
    probabilidad: { type: Number, min: 0, max: 100 },
    
    // Si ganó
    fechaCierre: { type: Date, default: null },
    planFinal: { type: String, default: null },
    ticketFinal: { type: Number, default: null },
    clienteId: { type: String, default: null },  // ID del cliente en Sorby
    
    // Si perdió
    motivoPerdida: { type: String, default: null },
    fechaPerdida: { type: Date, default: null },
    
    // Notas
    notas: { type: String, default: '' },
    
    // Tracking
    sdrId: { type: String },
    sdrNombre: { type: String },
    creadoPor: { type: String, required: true },
    creadoPorNombre: { type: String }
}, { timestamps: true });
```

### 3.2 Nuevas rutas de oportunidades

```javascript
// Agregar a sdrRoutes.js

// CRUD Oportunidades
router.get('/oportunidades', sdrController.listarOportunidades);
router.post('/oportunidades', sdrController.crearOportunidad);
router.put('/oportunidades/:id', sdrController.actualizarOportunidad);

// Métricas de ventas
router.get('/metricas/ventas', sdrController.obtenerMetricasVentas);
router.get('/metricas/pipeline', sdrController.obtenerPipeline);
```

### 3.3 Dashboard de Ventas

```javascript
// GET /api/sdr/metricas/pipeline
// Devuelve:
{
    pipeline: {
        propuesta:    { cantidad: 5, ticketTotal: 2500000 },
        negociacion:  { cantidad: 3, ticketTotal: 1500000 },
        ganado:       { cantidad: 2, ticketTotal: 1000000 },
        perdido:      { cantidad: 1, ticketTotal: 375000 }
    },
    // Pipeline desglosado por plan de Sorby
    pipelinePorPlan: {
        premium:  { cantidad: 2, ticketTotal: 1250000 },  // 2 × $625k
        avanzado: { cantidad: 4, ticketTotal: 1500000 },  // 4 × $375k
        basico:   { cantidad: 2, ticketTotal: 500000 },   // 2 × $250k
        a_medida: { cantidad: 1, ticketTotal: 800000 }    // custom
    },
    mesActual: {
        clientesNuevos: 2,
        ticketPromedio: 500000,
        ticketTotal: 1000000,
        tasaCierre: 0.67,  // 2 ganados / 3 cerrados (ganados+perdidos)
        tiempoPromedioCierre: 18  // días
    },
    porPlan: [
        { plan: 'premium', label: 'Premium', cantidad: 1, ticketTotal: 625000, precio: 625000 },
        { plan: 'avanzado', label: 'Avanzado', cantidad: 1, ticketTotal: 375000, precio: 375000 },
        { plan: 'basico', label: 'Básico', cantidad: 0, ticketTotal: 0, precio: 250000 }
    ],
    motivosPerdida: [
        { motivo: 'Precio', cantidad: 2 },
        { motivo: 'Timing', cantidad: 1 }
    ]
}
```

### 3.4 Frontend — Vista de Pipeline

```
// Nueva pestaña en gestionSDR.js: "Pipeline" (o nueva página)
// components/sdr/PipelineKanban.js

// Vista Kanban:
// | Propuesta | Negociación | Ganado | Perdido |
// | card      | card        | card   | card    |
// | card      |             | card   |         |

// Cada card:
// - Nombre del contacto
// - Empresa + tamaño
// - Plan interesado + ticket estimado
// - Fecha estimada de cierre
// - SDR asignado
// - Drag & drop entre columnas
```

---

## Fase 4: Automatización WhatsApp

### 4.1 Arquitectura del Bot SDR

```
// IMPORTANTE: Bot separado del bot principal de Sorby
// Razones:
// 1. Número diferente (no mezclar con el personal de Fernando)
// 2. Si falla, no afecta al bot principal
// 3. Diferentes reglas de rate limiting

backend/
├── src/
│   ├── services/
│   │   └── sdrWhatsAppBot.js      # [NUEVO] Bot dedicado para SDR
│   ├── jobs/
│   │   └── cadenciaScheduler.js   # [NUEVO] Cron que ejecuta pasos de cadencia
```

### 4.2 Scheduler de Cadencias

```javascript
// backend/src/jobs/cadenciaScheduler.js
// Se ejecuta cada 15 minutos

const cron = require('node-cron');

async function procesarCadenciasPendientes() {
    const ahora = new Date();
    
    // Buscar contactos con cadencia activa y próximo contacto pasado
    const contactos = await ContactoSDR.find({
        'cadenciaActiva.pausada': false,
        'cadenciaActiva.completada': false,
        'cadenciaActiva.cadenciaId': { $ne: null },
        proximoContacto: { $lte: ahora }
    }).populate('cadenciaActiva.cadenciaId');
    
    for (const contacto of contactos) {
        const cadencia = contacto.cadenciaActiva.cadenciaId;
        const pasoActual = cadencia.pasos.find(
            p => p.orden === contacto.cadenciaActiva.pasoActual
        );
        
        if (!pasoActual) continue;
        
        if (pasoActual.tipoAccion === 'whatsapp' && pasoActual.templateId) {
            // ETAPA A (semi-auto): Crear notificación para el SDR
            // ETAPA B (full-auto): Enviar vía bot
            await crearNotificacionPendiente(contacto, pasoActual);
        }
        
        if (pasoActual.tipoAccion === 'llamada') {
            // Solo notificar al SDR que tiene que llamar
            await crearNotificacionPendiente(contacto, pasoActual);
        }
    }
}

// Ejecutar cada 15 min de 8:00 a 21:00
cron.schedule('*/15 8-21 * * 1-6', procesarCadenciasPendientes);
```

### 4.3 Rate Limiting y Seguridad

```javascript
// Reglas hardcodeadas para proteger el número
const LIMITES_WHATSAPP = {
    maxMensajesPorDia: 50,
    maxMensajesPorHora: 10,
    horaInicio: 8,            // No antes de las 8:00
    horaFin: 21,              // No después de las 21:00
    diasLaborales: [1,2,3,4,5,6], // Lun-Sáb
    delayEntreEnvios: 30000,  // 30 segundos mínimo entre mensajes
};
```

---

## Fase 5: Reportes Avanzados

### 5.1 Endpoints de métricas extendidos

```javascript
// GET /api/sdr/metricas/funnel?desde=2026-01-01&hasta=2026-02-23
// GET /api/sdr/metricas/comparativa?periodo=mes  // Este mes vs anterior
// GET /api/sdr/metricas/velocidad                // Tiempo medio por etapa
// GET /api/sdr/metricas/conversion-por-origen    // Inbound vs Outbound
// GET /api/sdr/metricas/conversion-por-plan      // Tasa de cierre por plan estimado
// GET /api/sdr/metricas/matriz-plan-intencion    // Grilla de calor plan × intención
```

### 5.2 Componentes de visualización

```
components/sdr/reportes/
├── FunnelConversion.js      # Embudo visual con % entre etapas
├── ComparativaPeriodos.js   # Barras lado a lado: este mes vs anterior
├── MetricasPorSDR.js        # Tabla comparativa del equipo
├── TendenciaSemanal.js      # Línea temporal de métricas clave
└── AlertasPanel.js          # Lista de situaciones que requieren atención
```

---

## Plan de Migración

### Paso 1: Preparar base de datos
```bash
# 1. Backup de colecciones SDR actuales
mongodump --db sorby --collection contactosdrs
mongodump --db sorby --collection reunionsdrs
mongodump --db sorby --collection historialsdrs

# 2. Ejecutar script de migración de estados
node scripts/migrar-estados-sdr.js

# 3. Recalcular prioridadScore para todos los contactos
node scripts/recalcular-prioridades.js
```

### Paso 2: Deploy por fases
1. **Backend primero**: Nuevos estados + scoring + endpoints (backward compatible)
2. **Frontend**: Actualizar constantes de estados → probar con datos migrados
3. **Modo llamadas**: Feature flag → habilitar para Fernando primero
4. **Cadencias**: Crear cadencia default → asignar a contactos `nuevo`
5. **Pipeline**: Agregar pestaña → habilitar progresivamente

### Paso 3: Validación con Fernando
- 1 semana de uso paralelo (Notion + App) para validar que no se pierde nada
- Exportar métricas de ambos y comparar
- Ajustar scoring/prioridad según feedback
- Una vez validado: dejar de usar Notion/Sheets para SDR

---

## Estimación de Esfuerzo por Archivo

### Fase 1

| Archivo | Tipo | Esfuerzo | Descripción |
|---------|------|----------|-------------|
| `ContactoSDR.js` | Modificar | 🟢 Bajo | Agregar campos, ampliar enum |
| `sdrController.js` | Modificar | 🟡 Medio | Nuevos endpoints, scoring, métricas reales |
| `sdrRoutes.js` | Modificar | 🟢 Bajo | Agregar rutas nuevas |
| `sdrService.js` | Modificar | 🟢 Bajo | Agregar llamadas API |
| `calcularPrioridad.js` | Nuevo | 🟢 Bajo | Función pura de cálculo |
| `migrar-estados-sdr.js` | Nuevo | 🟢 Bajo | Script one-time |
| `ModoLlamadas.js` | Nuevo | 🔴 Alto | Componente complejo, mobile-first |
| `PlanEstimadoSelector.js` | Nuevo | 🟢 Bajo | Selector de plan de suscripción |
| `contactosSDR.js` | Modificar | 🟡 Medio | Nuevos estados, plan estimado, modo llamadas |
| `gestionSDR.js` | Modificar | 🟡 Medio | Métricas reales, nuevos estados |
| `DrawerDetalleContactoSDR.js` | Modificar | 🟡 Medio | Plan estimado, cadencia, historial mejorado |

### Fase 2

| Archivo | Tipo | Esfuerzo |
|---------|------|----------|
| `CadenciaSDR.js` | Nuevo | 🟢 Bajo |
| `cadenciaEngine.js` | Nuevo | 🟡 Medio |
| `VistaGuardadaSDR.js` | Nuevo | 🟢 Bajo |
| `CadenciaManager.js` | Nuevo | 🟡 Medio |
| `FiltrosAvanzados.js` | Nuevo | 🟡 Medio |

### Fase 3

| Archivo | Tipo | Esfuerzo |
|---------|------|----------|
| `OportunidadSDR.js` | Nuevo | 🟢 Bajo |
| `PipelineKanban.js` | Nuevo | 🟡 Medio |
| Dashboard ventas endpoints | Nuevo | 🟡 Medio |

---

## Consideraciones Técnicas

### Performance
- **Índice compuesto** en `prioridadScore` es clave para que el sort sea eficiente
- **Recálculo de prioridad**: se hace en cada acción individual, no batch (mantener score actualizado)
- **Métricas**: usar `aggregate` de MongoDB, no cargar todo a memoria
- **Paginación**: mantener la paginación actual (50 por página) con sort por `prioridadScore`

### Backwards Compatibility
- Los estados viejos se migran, pero el backend debe aceptar ambos durante la transición
- Los endpoints existentes mantienen sus firmas, los nuevos se agregan como rutas adicionales
- El frontend puede mostrar los estados viejos como fallback si llegan del backend

### Testing
- Script de migración debe correr en modo dry-run primero
- Agregar tests para `calcularPrioridadScore` con combinaciones de plan+tamaño+vencimiento
- Agregar tests para el motor de cadencias (estado + transiciones)
- Validar que PLANES_SORBY se mantenga sincronizado entre frontend y backend

### Seguridad del Bot WhatsApp (Fase 4)
- Número separado **obligatorio**
- Kill switch: endpoint para parar todo envío inmediatamente
- Logs de todo mensaje enviado
- Alert si tasa de bloqueo > 5%
