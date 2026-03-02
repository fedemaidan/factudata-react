# Rediseño Módulo Comercial — Documento Técnico v2

> **Versión**: 2.0  
> **Fecha**: 24/02/2026  
> **Documento complementario**: [SDR-COMERCIAL-FUNCIONAL.md](SDR-COMERCIAL-FUNCIONAL.md)  
> **Stack actual**: Next.js (frontend) + Express/Node.js (backend) + MongoDB (Mongoose) + Firebase Auth

---

## Changelog v2

| # | Cambio técnico | Antes (v1) | Ahora (v2) |
|---|---------------|-----------|------------|
| 1 | **Estados enum** | 12 estados incluyendo `meet_agendada`, `meet_realizada` | 10 estados. Meets son entidad separada |
| 2 | **Campo `precalificacionBot`** | No existía | Nuevo enum en ContactoSDR |
| 3 | **Campo `leadId`** | No existía | Referencia a Lead de Firestore para trazabilidad |
| 4 | **Modelo ReunionSDR** | Sin lifecycle | `estado`: agendada/realizada/no_show/cancelada + `numero` auto-incremental. Campo `notas` único (simplificado) |
| 5 | **Modelo CadenciaSDR** | 1 acción por paso, delay en horas | Múltiples acciones por paso, variantes de template por rubro, delay en días |
| 6 | **`calcularPrioridadScore`** | Sin factor bot ni reuniones | Agrega factores: precalificacionBot, reuniones. Quita meet_agendada/meet_realizada |
| 7 | **HistorialSDR tipos** | Set reducido | Agrega: `bot_interaccion`, `whatsapp_respuesta`, `instagram_contacto`, `link_pago_enviado`, `presupuesto_enviado`, `negociacion_iniciada`, `contacto_enriquecido`, `reunion_*` |
| 8 | **Puente Lead↔ContactoSDR** | No existía | Lógica de auto-creación desde bot + deduplicación por teléfono normalizado |
| 9 | **Migración** | `meet` → `meet_agendada` | `meet` → `calificado` + crear ReunionSDR separada. Outbound: `precalificacionBot = null` |
| 10 | **Constantes frontend** | Incluían meet_agendada/meet_realizada | Sin meets. Agrega PRECALIFICACION_BOT |
| 11 | **Puntos de inserción bot** | No documentados | 6 puntos exactos donde el bot actualiza `precalificacionBot` progresivamente |
| 12 | **Impacto reunión → estado** | No definido | Reunión NO cambia estado automáticamente. Prompts sugeridos al SDR |

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
│   ├── ModalAgregarContacto.js       ├── flows/onboardingFlows/
│   └── ModalImportarExcel.js         │   └── flowInicioGeneral.js
├── services/sdrService.js            └── src/services/
└── docs/SDR-MANUAL.md                    ├── leadServices/leadService.js
                                          ├── eventService.js
                                          └── notifyService.js
```

### Problemas técnicos actuales

1. **Archivos monolíticos**: `gestionSDR.js` (2400 LOC) y `DrawerDetalleContactoSDR.js` (1840 LOC)
2. **Estados insuficientes**: Solo 6 estados, no reflejan el pipeline real
3. **No hay scoring**: Sin priorización inteligente
4. **Métricas estimadas**: Se multiplican por factores fijos en vez de calcular realmente
5. **No hay cadencias**: Los templates tienen `paso` pero no hay lógica de cadencia
6. **Importaciones en memoria**: Estado en `Map()` (se pierde al reiniciar)
7. **No hay pipeline post-meet**
8. **Lead y ContactoSDR desconectados**: Dos modelos en dos DBs sin vínculo

---

## Fase 1: Estados + Scoring + Loop de Llamadas + Puente Lead↔ContactoSDR

### 1.1 Modelo `ContactoSDR.js` — Cambios

```javascript
// CAMBIO: Enum de estados (10, sin meets)
const ESTADOS_CONTACTO = [
    'nuevo',                // Recién llegado, sin intentos
    'contactado',           // Se habló al menos una vez (reemplaza 'en_gestion')
    'calificado',           // Dio info útil de calificación
    'cierre',               // En negociación activa / propuesta enviada
    'ganado',               // Venta concretada
    'no_contacto',          // Cadencia completada sin respuesta (14 días)
    'no_responde',          // Contactó pero ghost
    'revisar_mas_adelante', // Interés pero timing no es ahora
    'no_califica',          // No es target
    'perdido'               // Pasó por pipeline pero no cerró
];

// NUEVO: Pre-calificación del bot
precalificacionBot: {
    type: String,
    enum: ['sin_calificar', 'no_llego', 'calificado', 'quiere_meet', null],
    default: null
},

// NUEVO: Datos recopilados por el bot
datosBot: {
    rubro: { type: String, default: null },
    interes: { type: String, default: null },        // 'probar', 'info', 'humano', 'usuario_existente'
    cantidadObras: { type: String, default: null },
    interaccionFecha: { type: Date, default: null },
    saludoInicial: { type: String, default: null }    // Primer mensaje del usuario
},

// NUEVO: Vínculo con Lead de Firestore (para trazabilidad marketing)
leadId: {
    type: String,
    default: null   // ID del documento Lead en Firestore
},

// NUEVO: Plan estimado (¿qué plan le conviene por perfil?)
planEstimado: {
    type: String,
    enum: ['basico', 'avanzado', 'premium', 'a_medida', null],
    default: null
},

// NUEVO: Intención de compra (¿cuántas ganas tiene?)
intencionCompra: {
    type: String,
    enum: ['alta', 'media', 'baja', null],
    default: null
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

// NUEVO: Historial de estados (Status Sum rápido)
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

#### Índices nuevos

```javascript
ContactoSDRSchema.index({ empresaId: 1, sdrAsignado: 1, estado: 1, prioridadScore: -1 });
ContactoSDRSchema.index({ empresaId: 1, 'cadenciaActiva.cadenciaId': 1 });
ContactoSDRSchema.index({ empresaId: 1, planEstimado: 1 });
ContactoSDRSchema.index({ empresaId: 1, intencionCompra: 1 });
ContactoSDRSchema.index({ empresaId: 1, precalificacionBot: 1 });
// Clave para deduplicación:
ContactoSDRSchema.index({ telefono: 1, empresaId: 1 }, { unique: true });
```

### 1.2 Modelo `ReunionSDR.js` — Cambios

```javascript
// backend/src/models/sdr/ReunionSDR.js

const ESTADOS_REUNION = ['agendada', 'realizada', 'no_show', 'cancelada'];

const ReunionSDRSchema = new Schema({
    contacto: { type: Schema.Types.ObjectId, ref: 'ContactoSDR', required: true },
    empresaId: { type: String, required: true },

    // NUEVO: Número auto-incremental por contacto (Meet #1, #2, #3...)
    numero: { type: Number, required: true },

    // NUEVO: Lifecycle de la reunión
    estado: {
        type: String,
        enum: ESTADOS_REUNION,
        default: 'agendada'
    },

    fecha: { type: Date, required: true },
    hora: { type: String },                        // "15:00"
    link: { type: String, default: null },         // URL de Zoom/Meet/lugar
    lugar: { type: String, default: null },        // Dirección física si aplica

    // Notas (campo único, simplificado)
    notas: { type: String, default: '' },          // Preparación, resultado, next steps — todo junto

    // NUEVO: Participantes
    participantes: [{
        nombre: String,
        rol: String,                               // "Director", "SDR", etc.
        esNuestro: { type: Boolean, default: false } // true = de Sorby
    }],

    // NUEVO: Evaluación post-meet
    asistio: { type: Boolean, default: null },     // null = no evaluada aún
    duracionMinutos: { type: Number, default: null },

    // Tracking
    sdrId: { type: String },
    sdrNombre: { type: String },
    creadoPor: { type: String, required: true },
    creadoPorNombre: { type: String }
}, { timestamps: true });

// Auto-calcular número de reunión al crear
ReunionSDRSchema.pre('save', async function(next) {
    if (this.isNew && !this.numero) {
        const count = await this.constructor.countDocuments({ contacto: this.contacto });
        this.numero = count + 1;
    }
    next();
});

ReunionSDRSchema.index({ contacto: 1, estado: 1 });
ReunionSDRSchema.index({ empresaId: 1, fecha: 1 });
ReunionSDRSchema.index({ empresaId: 1, estado: 1 });
```

### 1.3 Modelo `HistorialSDR.js` — Cambios

```javascript
// Tipos de evento completos (v2)
const TIPOS_EVENTO = [
    // Llamadas
    'llamada_atendida',
    'llamada_no_atendida',

    // WhatsApp
    'whatsapp_enviado',
    'whatsapp_respuesta',          // NUEVO: contacto respondió

    // Otros canales
    'instagram_contacto',          // NUEVO
    'email_enviado',               // NUEVO

    // Reuniones (NUEVO: separadas de estados)
    'reunion_agendada',
    'reunion_realizada',
    'reunion_no_show',
    'reunion_cancelada',

    // Acciones comerciales (NUEVO)
    'presupuesto_enviado',
    'negociacion_iniciada',
    'link_pago_enviado',           // NUEVO: "Alias" en Notion

    // Bot (NUEVO)
    'bot_interaccion',             // Interacción del contacto con el bot

    // Cambios de datos
    'cambio_estado',
    'plan_estimado_actualizado',
    'intencion_compra_actualizada',

    // Cadencia
    'cadencia_iniciada',
    'cadencia_avanzada',
    'cadencia_completada',
    'cadencia_detenida',

    // Sistema
    'contacto_creado',
    'contacto_enriquecido',        // NUEVO: datos importados/fusionados
    'nota',
];

// Campos adicionales en el schema
estadoAnterior: { type: String, default: null },
estadoNuevo: { type: String, default: null },
cadenciaPaso: { type: Number, default: null },
cadenciaAccion: { type: Number, default: null },  // NUEVO: nro de acción dentro del paso
templateUsado: { type: String, default: null },    // NUEVO: nombre del template enviado
reunionId: { type: Schema.Types.ObjectId, ref: 'ReunionSDR', default: null }, // NUEVO
```

### 1.4 Función de cálculo de prioridad

```javascript
// utils/calcularPrioridad.js

const PLANES_SORBY = {
    a_medida: { score: 500, label: 'A medida', precio: null },
    premium:  { score: 400, label: 'Premium',  precio: 625000 },
    avanzado: { score: 250, label: 'Avanzado', precio: 375000 },
    basico:   { score: 150, label: 'Básico',   precio: 250000 }
};

function calcularPrioridadScore(contacto, reuniones = []) {
    let score = 0;
    const ahora = new Date();

    // Factor 1: Próximo contacto vencido (+100/día, max 500)
    if (contacto.proximoContacto && contacto.proximoContacto < ahora) {
        const diasVencido = Math.floor((ahora - contacto.proximoContacto) / 86400000);
        score += Math.min(diasVencido * 100, 500);
    }

    // Factor 2: Plan estimado
    if (contacto.planEstimado && PLANES_SORBY[contacto.planEstimado]) {
        score += PLANES_SORBY[contacto.planEstimado].score;
    }

    // Factor 3: Intención de compra
    const SCORE_INTENCION = { alta: 300, media: 200, baja: 100 };
    if (contacto.intencionCompra) {
        score += SCORE_INTENCION[contacto.intencionCompra] || 0;
    }

    // Factor 4: Pre-calificación del bot (NUEVO v2)
    const SCORE_BOT = { quiere_meet: 200, calificado: 100, sin_calificar: 30, no_llego: 0 };
    if (contacto.precalificacionBot) {
        score += SCORE_BOT[contacto.precalificacionBot] || 0;
    }

    // Factor 5: Tamaño de empresa
    const SCORE_TAMANO = { '200+': 100, '51-200': 60, '11-50': 30, '1-10': 10 };
    score += SCORE_TAMANO[contacto.tamanoEmpresa] || 0;

    // Factor 6: Frescura
    const diasDesdeCreacion = Math.floor((ahora - contacto.createdAt) / 86400000);
    if (diasDesdeCreacion <= 1) score += 200;
    else if (diasDesdeCreacion <= 7) score += 150;
    else if (diasDesdeCreacion <= 14) score += 100;
    else if (diasDesdeCreacion <= 30) score += 50;

    // Factor 7: Estado (v2: sin meet_agendada/meet_realizada)
    const SCORE_ESTADO = {
        cierre: 300, calificado: 150, contactado: 100,
        nuevo: 80, revisar_mas_adelante: 30, no_contacto: 10
    };
    score += SCORE_ESTADO[contacto.estado] || 0;

    // Factor 8: Reuniones (NUEVO v2 — entidad separada)
    const reunionAgendada = reuniones.some(r => r.estado === 'agendada');
    const reunionRealizada = reuniones.some(r => r.estado === 'realizada');
    if (reunionAgendada) score += 250;
    else if (reunionRealizada) score += 200;

    // Factor 9: Sin próximo contacto (-50)
    if (!contacto.proximoContacto) score -= 50;

    return score;
}

module.exports = { calcularPrioridadScore, PLANES_SORBY };
```

### 1.5 Impacto de Reunión en Estado del Contacto

La reunión es una entidad **independiente** del estado del contacto. Su resolución **NO cambia el estado automáticamente** — siempre es decisión del SDR.

#### Reglas de negocio

| Resultado reunión | Estado del contacto | Comportamiento |
|---|---|---|
| `realizada` | Se mantiene en `calificado` | Mostrar prompt: *"¿Querés mover a Cierre?"* (botón rápido, no obligatorio) |
| `no_show` | Se mantiene donde estaba | Se puede reagendar. Al 2do no_show consecutivo → sugerir *"¿Revisar más adelante?"* |
| `cancelada` | Se mantiene donde estaba | Se puede reagendar. Misma lógica que no_show |

#### Implementación del prompt post-evaluación

```javascript
// En ModalEvaluarReunion.js — después de guardar el estado de la reunión:

async function onEvaluarReunion(reunionId, resultado) {
    await sdrService.actualizarReunion(reunionId, { estado: resultado });

    if (resultado === 'realizada') {
        // Prompt sugerido, NO automático
        setPrompt({
            show: true,
            mensaje: '¿Querés mover este contacto a Cierre?',
            accion: () => cambiarEstado(contacto._id, 'cierre')
        });
    }

    if (resultado === 'no_show') {
        // Contar no_shows consecutivos
        const noShows = reuniones.filter(r => r.estado === 'no_show').length;
        if (noShows >= 2) {
            setPrompt({
                show: true,
                mensaje: `${noShows} no-shows seguidos. ¿Revisar más adelante?`,
                accion: () => cambiarEstado(contacto._id, 'revisar_mas_adelante')
            });
        }
    }
}
```

> **Principio**: El sistema sugiere, el SDR decide. Nunca mover estado automáticamente por resultado de reunión.

---

### 1.6 Puente Lead (Firestore) ↔ ContactoSDR (MongoDB)

```javascript
// backend/src/services/leadContactoBridge.js
//
// Este servicio es el puente entre el mundo de marketing (Lead en Firestore)
// y el mundo comercial (ContactoSDR en MongoDB).

const ContactoSDR = require('../models/sdr/ContactoSDR');
const HistorialSDR = require('../models/sdr/HistorialSDR');
const { normalizarTelefono } = require('../../utils/normalizarTelefono');

const EMPRESA_ID_DEFAULT = 'sorby'; // O la que corresponda

/**
 * Se llama desde flowInicioGeneral.js después de crear/actualizar el Lead en Firestore.
 * Crea o enriquece un ContactoSDR según corresponda.
 *
 * @param {string} phone - Teléfono del contacto
 * @param {object} leadData - Datos del lead de Firestore { id, nombre, saludoInicial, ... }
 * @param {string} evento - Evento del bot ('nuevo_contacto', 'menu_onboarding_probar', etc.)
 * @returns {object} { contacto, esNuevo, fueEnriquecido }
 */
async function sincronizarLeadConContactoSDR(phone, leadData, evento) {
    const telefonoNorm = normalizarTelefono(phone);

    // Buscar ContactoSDR existente por teléfono
    let contacto = await ContactoSDR.findOne({
        telefono: telefonoNorm,
        empresaId: EMPRESA_ID_DEFAULT
    });

    if (!contacto) {
        // ─── ESCENARIO A: Nuevo contacto por bot ───
        contacto = await ContactoSDR.create({
            nombre: leadData.nombre || `WA ${telefonoNorm.slice(-4)}`,
            telefono: telefonoNorm,
            estado: 'nuevo',
            segmento: 'inbound',
            precalificacionBot: 'sin_calificar',
            datosBot: {
                interes: leadData.interes || null,
                rubro: leadData.rubro || null,
                interaccionFecha: new Date(),
                saludoInicial: leadData.saludoInicial || null
            },
            leadId: leadData.id || null,
            empresaId: EMPRESA_ID_DEFAULT,
            origenImportacion: 'bot',
            creadoPor: 'sistema'
        });

        await HistorialSDR.create({
            contacto: contacto._id,
            tipo: 'contacto_creado',
            descripcion: `Lead inbound creado automáticamente desde bot. Saludo: "${leadData.saludoInicial?.substring(0, 80) || 'N/A'}"`,
            empresaId: EMPRESA_ID_DEFAULT,
            realizadoPor: 'sistema',
            realizadoPorNombre: 'Bot'
        });

        return { contacto, esNuevo: true, fueEnriquecido: false };

    } else {
        // ─── ESCENARIO C: Contacto existente interactúa con bot ───
        const cambios = {};
        let descripcion = 'Contacto existente interactuó con el bot.';

        // Vincular leadId si no tenía
        if (!contacto.leadId && leadData.id) {
            cambios.leadId = leadData.id;
        }

        // Actualizar precalificacionBot
        if (leadData.precalificacionBot) {
            cambios.precalificacionBot = leadData.precalificacionBot;
        }

        // Enriquecer datosBot si tiene nuevos datos
        if (leadData.rubro && !contacto.rubro) {
            cambios.rubro = leadData.rubro;
            cambios['datosBot.rubro'] = leadData.rubro;
        }
        if (leadData.interes) {
            cambios['datosBot.interes'] = leadData.interes;
        }
        cambios['datosBot.interaccionFecha'] = new Date();

        if (Object.keys(cambios).length > 0) {
            await ContactoSDR.findByIdAndUpdate(contacto._id, { $set: cambios });
        }

        await HistorialSDR.create({
            contacto: contacto._id,
            tipo: 'bot_interaccion',
            descripcion,
            empresaId: contacto.empresaId,
            realizadoPor: 'sistema',
            realizadoPorNombre: 'Bot'
        });

        // Notificar al SDR si tiene uno asignado
        if (contacto.sdrAsignado) {
            // TODO: push notification / in-app notification
            // notificarSDR(contacto.sdrAsignado, contacto, 'bot_interaccion');
        }

        return { contacto, esNuevo: false, fueEnriquecido: true };
    }
}

/**
 * Actualizar precalificacionBot conforme avanza en el bot.
 * Se llama desde cada flow del bot (flowOnboardingRol, flowOnboardingInfo, etc.)
 */
async function actualizarPrecalificacionBot(phone, precalificacion, datosExtra = {}) {
    const telefonoNorm = normalizarTelefono(phone);
    const contacto = await ContactoSDR.findOne({
        telefono: telefonoNorm,
        empresaId: EMPRESA_ID_DEFAULT
    });

    if (!contacto) return null;

    const update = { precalificacionBot: precalificacion };
    if (datosExtra.rubro) update['datosBot.rubro'] = datosExtra.rubro;
    if (datosExtra.cantidadObras) update['datosBot.cantidadObras'] = datosExtra.cantidadObras;
    if (datosExtra.interes) update['datosBot.interes'] = datosExtra.interes;

    await ContactoSDR.findByIdAndUpdate(contacto._id, { $set: update });

    await HistorialSDR.create({
        contacto: contacto._id,
        tipo: 'bot_interaccion',
        descripcion: `Bot: precalificación → ${precalificacion}. ${JSON.stringify(datosExtra)}`,
        empresaId: contacto.empresaId,
        realizadoPor: 'sistema',
        realizadoPorNombre: 'Bot'
    });

    return contacto;
}

module.exports = { sincronizarLeadConContactoSDR, actualizarPrecalificacionBot };
```

#### Normalización de teléfono

```javascript
// backend/utils/normalizarTelefono.js

function normalizarTelefono(phone) {
    if (!phone) return null;

    // Limpiar: quitar +, espacios, guiones, paréntesis
    let limpio = String(phone).replace(/[\s\-\(\)\+]/g, '');

    // Si empieza con 0 (ej: 01145678900) → reemplazar por 549
    if (limpio.startsWith('0')) {
        limpio = '549' + limpio.substring(1);
    }

    // Si tiene 10 dígitos (ej: 1145678900) → agregar 549
    if (limpio.length === 10 && !limpio.startsWith('54')) {
        limpio = '549' + limpio;
    }

    // Si tiene 11 dígitos y empieza con 54 pero no 549 → insertar 9
    if (limpio.length === 12 && limpio.startsWith('54') && !limpio.startsWith('549')) {
        limpio = '549' + limpio.substring(2);
    }

    // Si empieza con 15 (celular viejo) → quitar 15 y agregar 549 + código de área
    // Nota: esto requiere conocer el código de área, simplificamos asumiendo CABA/GBA
    if (limpio.startsWith('15') && limpio.length === 10) {
        limpio = '54911' + limpio.substring(2);
    }

    return limpio;
}

module.exports = { normalizarTelefono };
```

#### Cambio en `flowInicioGeneral.js`

```javascript
// AGREGAR al inicio:
const { sincronizarLeadConContactoSDR } = require('../../src/services/leadContactoBridge');

// MODIFICAR dentro del primer addAction:
// Después de: await addEvent(phone, 'nuevo_contacto', null, ctx.body);
// AGREGAR:
await sincronizarLeadConContactoSDR(phone, {
    id: lead?.id || null,
    nombre,
    saludoInicial: ctx.body,
    rubro: null,
    interes: null,
    precalificacionBot: 'sin_calificar'
}, 'nuevo_contacto');

// MODIFICAR en el switch del segundo addAction:
// case 2 (probar):
await actualizarPrecalificacionBot(phone, 'calificado', { interes: 'probar' });
// case 4 (humano):
await actualizarPrecalificacionBot(phone, 'quiere_meet', { interes: 'humano' });
```

#### Deduplicación en importación (Notion/Excel)

```javascript
// MODIFICAR: backend/src/services/leadServices/ (el que importa desde Notion/Excel)
// Agregar al flujo de importación:

async function importarContactoConDeduplicacion(datos, empresaId) {
    const telefonoNorm = normalizarTelefono(datos.telefono);

    // Buscar duplicado
    const existente = await ContactoSDR.findOne({ telefono: telefonoNorm, empresaId });

    if (existente) {
        // ESCENARIO D: ya existe (puede ser de bot o de otra importación)
        return {
            duplicado: true,
            contactoExistente: {
                id: existente._id,
                nombre: existente.nombre,
                estado: existente.estado,
                origen: existente.segmento,
                precalificacionBot: existente.precalificacionBot
            },
            mensaje: `Ya existe: ${existente.nombre} (${existente.estado}, ${existente.segmento})`
        };
    }

    // ESCENARIO B: no existe, crear
    const contacto = await ContactoSDR.create({
        ...datos,
        telefono: telefonoNorm,
        estado: 'nuevo',
        segmento: 'outbound',
        empresaId,
        origenImportacion: datos.origenImportacion || 'notion'
    });

    return { duplicado: false, contacto };
}

// Para cuando el usuario acepta enriquecer un duplicado:
async function enriquecerContactoDesdeImportacion(contactoId, datosNuevos) {
    const contacto = await ContactoSDR.findById(contactoId);
    if (!contacto) throw new Error('Contacto no encontrado');

    // Solo actualizar campos que estén vacíos en el contacto existente
    const cambios = {};
    if (!contacto.empresa && datosNuevos.empresa) cambios.empresa = datosNuevos.empresa;
    if (!contacto.cargo && datosNuevos.cargo) cambios.cargo = datosNuevos.cargo;
    if (!contacto.tamanoEmpresa && datosNuevos.tamanoEmpresa) cambios.tamanoEmpresa = datosNuevos.tamanoEmpresa;
    if (!contacto.email && datosNuevos.email) cambios.email = datosNuevos.email;
    if (!contacto.rubro && datosNuevos.rubro) cambios.rubro = datosNuevos.rubro;
    if (datosNuevos.notionPageId) cambios.notionPageId = datosNuevos.notionPageId;
    if (datosNuevos.notionDbId) cambios.notionDbId = datosNuevos.notionDbId;

    if (Object.keys(cambios).length > 0) {
        await ContactoSDR.findByIdAndUpdate(contactoId, { $set: cambios });
        await HistorialSDR.create({
            contacto: contactoId,
            tipo: 'contacto_enriquecido',
            descripcion: `Datos importados desde ${datosNuevos.origenImportacion || 'Notion'}. Campos: ${Object.keys(cambios).join(', ')}`,
            empresaId: contacto.empresaId,
            realizadoPor: datosNuevos.creadoPor || 'sistema'
        });
    }

    return { cambiosAplicados: Object.keys(cambios) };
}
```

### 1.7 Backend — Endpoints nuevos/modificados

```javascript
// MODIFICAR: listarContactos
// - Ordenamiento default por prioridadScore desc
// - Nuevos filtros: planEstimado, intencionCompra, precalificacionBot, tieneReunion
// - Eliminar estado 'en_gestion', agregar los 10 nuevos

// MODIFICAR: registrarIntento
// - Recalcular prioridadScore después de cada acción
// - Actualizar historialEstados cuando cambia el estado
// - Avanzar paso de cadencia si aplica
// - Detener cadencia si contacto responde (estado → contactado o superior)

// NUEVO: POST /acciones/plan-estimado
// - Actualizar planEstimado + registrar en historial + recalcular score

// NUEVO: POST /acciones/intencion-compra
// - Actualizar intencionCompra + registrar en historial + recalcular score

// MODIFICAR: obtenerMetricasDiarias / obtenerMetricasPeriodo
// - Calcular con aggregate real en vez de estimaciones
// - Agregar: tasa de contacto, velocidad de contacto
// - Reuniones se cuentan desde ReunionSDR (no desde estados)

// NUEVO: GET /metricas/funnel
// - Conteo por estado + "con meet" calculado de ReunionSDR
// - Filtrable por período y SDR
```

#### Recálculo de prioridad — Middleware

```javascript
// middleware/recalcularPrioridad.js
async function recalcularPrioridad(contactoId) {
    const contacto = await ContactoSDR.findById(contactoId);
    if (!contacto) return;

    const reuniones = await ReunionSDR.find({ contacto: contactoId });
    contacto.prioridadScore = calcularPrioridadScore(contacto, reuniones);
    await contacto.save();
}
```

#### Métricas reales por período

```javascript
async function obtenerMetricasPeriodo(req, res) {
    const { empresaId, sdrId, desde, hasta } = req.query;

    const matchBase = {
        empresaId,
        createdAt: { $gte: new Date(desde), $lte: new Date(hasta) }
    };
    if (sdrId) matchBase.realizadoPor = sdrId;

    const metricas = await HistorialSDR.aggregate([
        { $match: matchBase },
        { $group: { _id: '$tipo', cantidad: { $sum: 1 } } }
    ]);

    // Reuniones en el período (v2: entidad separada)
    const reuniones = await ReunionSDR.aggregate([
        { $match: {
            empresaId,
            fecha: { $gte: new Date(desde), $lte: new Date(hasta) }
        }},
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
    ]);

    // Funnel: contactos por estado + "con meet" calculado
    const funnel = await ContactoSDR.aggregate([
        { $match: { empresaId, ...(sdrId ? { sdrAsignado: sdrId } : {}) } },
        { $group: { _id: '$estado', cantidad: { $sum: 1 } } }
    ]);

    // "Con Meet" = contactos que tienen al menos 1 reunión realizada
    const conMeetRealizada = await ReunionSDR.aggregate([
        { $match: { empresaId, estado: 'realizada' } },
        { $group: { _id: '$contacto' } },
        { $count: 'total' }
    ]);

    res.json({ metricas, reuniones, funnel, conMeetRealizada: conMeetRealizada[0]?.total || 0 });
}
```

### 1.8 Nuevas rutas API (Fase 1)

```javascript
// sdrRoutes.js — Agregar:

// Scoring
router.post('/acciones/plan-estimado', sdrController.actualizarPlanEstimado);
router.post('/acciones/intencion-compra', sdrController.actualizarIntencionCompra);

// Reuniones (CRUD — v2: entidad independiente)
router.get('/reuniones/:contactoId', sdrController.listarReuniones);
router.post('/reuniones', sdrController.crearReunion);
router.put('/reuniones/:id', sdrController.actualizarReunion);
router.put('/reuniones/:id/evaluar', sdrController.evaluarReunion);

// Funnel y métricas
router.get('/metricas/funnel', sdrController.obtenerFunnel);

// Webhook de leads (desde bot)
router.post('/webhook/nuevo-lead', sdrController.webhookNuevoLead);

// Modo llamadas
router.get('/contactos/siguiente', sdrController.obtenerSiguienteContacto);
```

### 1.9 Frontend — Cambios

#### Nueva estructura de archivos

```
app-web/src/
├── pages/
│   ├── contactosSDR.js          # MODIFICAR: estados, scoring, badge bot
│   └── gestionSDR.js            # MODIFICAR: métricas reales, estados
│
├── components/sdr/
│   ├── DrawerDetalleContactoSDR.js   # MODIFICAR: scoring, reuniones section, badge bot
│   ├── ModalRegistrarAccion.js       # MODIFICAR: nuevas acciones
│   ├── ModalSelectorTemplate.js      # SIN CAMBIOS
│   ├── ModalAgregarContacto.js       # MODIFICAR: rubro, scoring
│   ├── ModalImportarExcel.js         # MODIFICAR: deduplicación
│   │
│   │ # NUEVOS:
│   ├── ModoLlamadas.js               # Loop de llamadas mobile-first
│   ├── PlanEstimadoSelector.js       # Selector de plan
│   ├── IntencionCompraSelector.js    # Selector de intención
│   ├── FunnelChart.js                # Embudo de conversión
│   ├── MetricasDashboard.js          # Extraer métricas de gestionSDR
│   ├── FiltrosAvanzados.js           # Filtros reutilizables
│   ├── ReunionesSection.js           # NUEVO: sección de reuniones en drawer
│   ├── ModalAgendarReunion.js        # NUEVO: modal para agendar
│   ├── ModalEvaluarReunion.js        # NUEVO: modal post-meet
│   └── BadgePrecalificacionBot.js    # NUEVO: chip 🤖 Bot: calificado
│
├── services/
│   └── sdrService.js                 # MODIFICAR: agregar nuevos endpoints
```

#### Constantes actualizadas (v2)

```javascript
// constants/sdrConstants.js — Compartido entre componentes

// Estados del contacto (v2: sin meets)
const ESTADOS_CONTACTO = {
    nuevo:               { label: 'Nuevo',              color: 'info',    icon: FiberNewIcon,       emoji: 'ℹ️' },
    contactado:          { label: 'Contactado',         color: 'warning', icon: PhoneIcon,          emoji: '💬' },
    calificado:          { label: 'Calificado',         color: 'success', icon: StarIcon,           emoji: '⭐' },
    cierre:              { label: 'En cierre',          color: 'success', icon: HandshakeIcon,      emoji: '🤝' },
    ganado:              { label: 'Ganado',             color: 'success', icon: EmojiEventsIcon,    emoji: '🏆' },
    no_contacto:         { label: 'No contactado',      color: 'default', icon: PhoneDisabledIcon,  emoji: '📵' },
    no_responde:         { label: 'No responde',        color: 'default', icon: DoNotDisturbIcon,   emoji: '👻' },
    revisar_mas_adelante:{ label: 'Revisar más adelante',color: 'warning', icon: ScheduleIcon,      emoji: '⏰' },
    no_califica:         { label: 'No califica',        color: 'error',   icon: BlockIcon,          emoji: '🚫' },
    perdido:             { label: 'Perdido',            color: 'error',   icon: ThumbDownIcon,      emoji: '❌' }
};

// Planes de Sorby
const PLANES_SORBY = {
    basico:   { label: 'Básico',   color: 'success',   precio: 250000, icon: '🟢' },
    avanzado: { label: 'Avanzado', color: 'primary',   precio: 375000, icon: '🔵' },
    premium:  { label: 'Premium',  color: 'secondary', precio: 625000, icon: '🟣' },
    a_medida: { label: 'A medida', color: 'warning',   precio: null,   icon: '🟡' }
};

// Intención de compra
const INTENCIONES_COMPRA = {
    alta:  { label: 'Alta',  color: 'error',   icon: '🔴' },
    media: { label: 'Media', color: 'warning', icon: '🟠' },
    baja:  { label: 'Baja',  color: 'default', icon: '🟡' }
};

// NUEVO v2: Pre-calificación del bot
const PRECALIFICACION_BOT = {
    sin_calificar: { label: 'Sin calificar', color: 'default', icon: '🤖' },
    no_llego:      { label: 'No llegó',      color: 'default', icon: '🤖' },
    calificado:    { label: 'Calificado',    color: 'info',    icon: '🤖' },
    quiere_meet:   { label: 'Quiere meet',   color: 'primary', icon: '🤖' }
};

// NUEVO v2: Estados de reunión
const ESTADOS_REUNION = {
    agendada:  { label: 'Agendada',  color: 'primary', icon: '📅' },
    realizada: { label: 'Realizada', color: 'success', icon: '✅' },
    no_show:   { label: 'No show',   color: 'error',   icon: '❌' },
    cancelada: { label: 'Cancelada', color: 'default', icon: '🚫' }
};
```

### 1.10 Actualización progresiva de `precalificacionBot` desde el Bot

El campo `precalificacionBot` se actualiza **progresivamente** conforme el usuario avanza en la conversación con el bot. No es un valor que se asigna una vez — va evolucionando.

#### Árbol de decisiones

```
Usuario escribe por WA
    │
    ▼
flowInicioGeneral → ContactoSDR creado con precalificacionBot = 'sin_calificar'
    │
    ├─ Opción 1: "Ya tengo cuenta" → NO CAMBIA (usuario existente, no es lead)
    │
    ├─ Opción 2: "Probar gratis"
    │   └─ flowOnboardingRol (elige rubro) → sigue 'sin_calificar'
    │       └─ flowOnboardingConstructora (asistente GPT)
    │           ├─ function crear_empresa  → ✅ 'calificado'
    │           └─ function solicitar_reunion → ✅ 'quiere_meet'
    │
    ├─ Opción 3: "Saber más"
    │   └─ flowOnboardingInfo (elige tema)
    │       ├─ Temas 1-5: asistente GPT info → sigue 'sin_calificar'
    │       │   └─ Si escala al asistente de Construcción → mismas reglas ↑
    │       └─ Tema 6: "Hablar con humano" → ✅ 'quiere_meet'
    │
    ├─ Opción 4: "Hablar con humano" → ✅ 'quiere_meet'
    │
    └─ [No responde al menú] → ⏰ 'no_llego' (por cron/timeout)
```

#### Los 6 puntos de inserción

| # | Archivo | Trigger | Valor | Datos extra |
|---|---------|---------|-------|-------------|
| 1 | `flowInicioGeneral.js` | Primer mensaje → crear ContactoSDR | `sin_calificar` | `{ interes: null }` |
| 2 | `flowInicioGeneral.js` | Opción 4: "Hablar con humano" | `quiere_meet` | `{ interes: 'humano' }` |
| 3 | `flowOnboardingConstructora.js` | Asistente GPT ejecuta `crear_empresa` | `calificado` | `{ rubro, cantidadObras }` |
| 4 | `asistenteChatgptService.js` | Asistente GPT ejecuta `solicitar_reunion` | `quiere_meet` | `{ interes: 'reunion' }` |
| 5 | `flowOnboardingInfo.js` | Opción 6 del sub-menú: "Hablar con humano" | `quiere_meet` | `{ interes: 'humano' }` |
| 6 | **Script standalone** (`sdrBotTimeoutJob.js`) | ContactoSDR con `sin_calificar` + `createdAt` > 48hs | `no_llego` | — |

#### Script para `no_llego`

```javascript
// backend/src/scripts/sdrBotTimeoutJob.js
const HORAS_TIMEOUT = 48;

async function procesarTimeoutBot(deps = {}) {
    const ContactoSDR = deps.ContactoSDR || require('../models/sdr').ContactoSDR;
    const EventoHistorialSDR = deps.EventoHistorialSDR || require('../models/sdr').EventoHistorialSDR;

    const limite = new Date();
    limite.setHours(limite.getHours() - HORAS_TIMEOUT);

    const contactos = await ContactoSDR.find({
        precalificacionBot: 'sin_calificar',
        createdAt: { $lt: limite }
    });

    for (const contacto of contactos) {
        await ContactoSDR.findByIdAndUpdate(contacto._id, {
            $set: { precalificacionBot: 'no_llego' }
        });

        await new EventoHistorialSDR({
            contactoId: contacto._id,
            tipo: 'bot_timeout',
            descripcion: `Precalificación cambiada a no_llego (sin actividad en ${HORAS_TIMEOUT}h)`,
            empresaId: contacto.empresaId,
            realizadoPor: 'system-cron',
            realizadoPorNombre: 'Sistema (cron)'
        }).save();
    }

    return { actualizados, errores, totalEvaluados: contactos.length };
}

module.exports = { procesarTimeoutBot, HORAS_TIMEOUT };
```

**Ejecución**: Script standalone, no integrado como cron en `app.js`.

```bash
# Ejecución manual
node src/scripts/sdrBotTimeoutJob.js

# Configurar en crontab de producción (cada 6 horas)
0 */6 * * * cd /ruta/al/backend && node src/scripts/sdrBotTimeoutJob.js >> logs/sdr-timeout.log 2>&1
```

#### Diferencia clave: `null` vs `sin_calificar` vs `no_llego`

| Valor | Significado | Origen |
|---|---|---|
| `null` | Nunca interactuó con el bot | Contacto outbound (Notion/Excel/manual) |
| `sin_calificar` | Interactuó con el bot pero no completó el recorrido | Bot: primer mensaje recibido |
| `no_llego` | Interactuó pero abandonó (timeout 48hs) | Script: `sdrBotTimeoutJob.js` |
| `calificado` | Completó el recorrido del bot (creó empresa/dio datos) | Bot: function `crear_empresa` |
| `quiere_meet` | Pidió hablar con un humano explícitamente | Bot: opción 4 / opción 6 / function `solicitar_reunion` |

---

## Fase 2: Cadencias de 14 Días + Historial Rico + Filtros

### 2.1 Modelo `CadenciaSDR.js` (v2: multi-acción + variantes)

```javascript
// backend/src/models/sdr/CadenciaSDR.js

const CadenciaSDRSchema = new Schema({
    nombre: { type: String, required: true },       // "Ciclo de Vida de Lead"
    descripcion: { type: String },
    empresaId: { type: String, required: true },

    // v2: Pasos con múltiples acciones y variantes de template
    pasos: [{
        orden: { type: Number, required: true },     // 1, 2, 3, 4
        nombre: { type: String },                    // "Gancho", "Entregar valor", etc.
        delayDias: { type: Number, default: 0 },     // v2: días (no horas) desde el paso anterior

        // v2: Múltiples acciones por paso (ej: Llamar + WhatsApp)
        acciones: [{
            orden: { type: Number, required: true },  // 1, 2 (dentro del paso)
            tipo: {
                type: String,
                enum: ['llamada', 'whatsapp', 'email', 'espera'],
                required: true
            },
            // v2: Variantes de template por rubro
            variantes: [{
                rubro: { type: String, default: 'general' }, // 'constructora', 'estudio', 'general'
                templateTexto: { type: String },              // Texto del template con {{variables}}
                templateNombre: { type: String }              // "Gancho - Constructoras"
            }],
            condicion: { type: String, default: null },       // "si_no_atendio" → ejecutar solo si no atendió
            descripcion: { type: String }
        }],

        // Descripción del objetivo del paso
        objetivo: { type: String }                    // "Pedir permiso para compartir ejemplo"
    }],

    // Variables disponibles para templates
    variablesDisponibles: {
        type: [String],
        default: ['nombre', 'rubro_texto', 'momento_bot', 'sdr_nombre']
    },

    // Configuración
    detenerAlResponder: { type: Boolean, default: true },
    diasEsperaPostCadencia: { type: Number, default: 6 },  // v2: días antes de no_contacto
    estadoAlCompletar: { type: String, default: 'no_contacto' },

    activa: { type: Boolean, default: true },
    esDefault: { type: Boolean, default: false },

    creadoPor: String,
    creadoPorNombre: String
}, { timestamps: true });
```

#### Cadencia default seed ("Ciclo de Vida de Lead")

```javascript
// scripts/seedCadenciaDefault.js
// Se ejecuta una vez para crear la cadencia basada en el proceso real de Fernando

const cadenciaDefault = {
    nombre: 'Ciclo de Vida de Lead',
    descripcion: '4 pasos en 14 días. Proceso real de Fernando sistematizado.',
    esDefault: true,
    diasEsperaPostCadencia: 6,
    estadoAlCompletar: 'no_contacto',
    variablesDisponibles: ['nombre', 'rubro_texto', 'momento_bot', 'sdr_nombre'],
    pasos: [
        {
            orden: 1,
            nombre: 'Gancho',
            delayDias: 1,
            objetivo: 'Pedir permiso para compartir un ejemplo relevante al rubro',
            acciones: [
                {
                    orden: 1,
                    tipo: 'llamada',
                    condicion: null,
                    descripcion: 'Si atiende → registrar y detener cadencia'
                },
                {
                    orden: 2,
                    tipo: 'whatsapp',
                    condicion: 'si_no_atendio',
                    descripcion: 'Enviar gancho personalizado por rubro',
                    variantes: [
                        {
                            rubro: 'constructora',
                            templateNombre: 'Gancho - Constructoras',
                            templateTexto: 'Hola, {{nombre}}! {{sdr_nombre}} de Sorby Data por acá! Estuviste en contacto con nuestro BOT {{momento_bot}}. Te escribo cortito: te viene bien que te comparta 1 ejemplo de cómo otras constructoras están ordenando materiales sin planillas?'
                        },
                        {
                            rubro: 'estudio',
                            templateNombre: 'Gancho - Estudios',
                            templateTexto: 'Hola, {{nombre}}! {{sdr_nombre}} de Sorby Data por acá! Estuviste en contacto con nuestro BOT {{momento_bot}}. Te escribo cortito: te viene bien que te comparta 1 ejemplo de cómo otros estudios gestionan gastos directo por WhatsApp, sin usar planillas?'
                        },
                        {
                            rubro: 'general',
                            templateNombre: 'Gancho - General consultivo',
                            templateTexto: 'Hola, {{nombre}}! 👋 Soy {{sdr_nombre}}, tu asesor de Sorby Data. Sé que estuviste en contacto con nuestro bot y quería conocer un poco más cómo venís gestionando tus obras. Cómo venís gestionando hoy caja, materiales y pedidos? Con Sorby podés ordenar todo eso de forma simple y ahorrar tiempo ⏳ Querés que lo charlemos por acá o preferís que hagamos una llamada rápida?'
                        }
                    ]
                }
            ]
        },
        {
            orden: 2,
            nombre: 'Entregar valor',
            delayDias: 2, // D+3 (1+2)
            objetivo: 'Mandar el recurso prometido en el paso anterior',
            acciones: [
                {
                    orden: 1,
                    tipo: 'whatsapp',
                    descripcion: 'Video o caso de uso relevante',
                    variantes: [
                        {
                            rubro: 'general',
                            templateNombre: 'Entrega de valor - Video',
                            templateTexto: 'Hola, {{nombre}}! Soy {{sdr_nombre}} de Sorby Data. Te dejo el video que te mencioné ayer. En un minuto vas a ver cómo {{rubro_texto}} están ordenando caja y materiales directo desde WhatsApp, y sin planillas. Cómo lo vienen manejando ustedes?'
                        }
                    ]
                }
            ]
        },
        {
            orden: 3,
            nombre: 'Evaluar interés',
            delayDias: 2, // D+5 (3+2)
            objetivo: 'Preguntar si vio el material, probar engagement',
            acciones: [
                { orden: 1, tipo: 'llamada', descripcion: 'Intentar llamar primero' },
                {
                    orden: 2,
                    tipo: 'whatsapp',
                    condicion: 'si_no_atendio',
                    variantes: [
                        {
                            rubro: 'general',
                            templateNombre: 'Follow-up - Consultivo',
                            templateTexto: '{{nombre}}! Cómo estás? Te escribo para saber si pudiste ver la presentación que te compartí el otro día. Me gustaría entender si estamos alineados y si nuestra solución te resultaría útil 😁 Charlamos?'
                        }
                    ]
                }
            ]
        },
        {
            orden: 4,
            nombre: 'Cierre suave',
            delayDias: 3, // D+8 (5+3)
            objetivo: 'Último intento: cerrar con puerta abierta',
            acciones: [
                { orden: 1, tipo: 'llamada', descripcion: 'Último intento de llamada' },
                {
                    orden: 2,
                    tipo: 'whatsapp',
                    condicion: 'si_no_atendio',
                    variantes: [
                        {
                            rubro: 'general',
                            templateNombre: 'Cierre suave',
                            templateTexto: '{{nombre}}! Prometo que este es mi último mensaje por ahora 😅 Vi que no pudimos coordinar todavía, y capaz estás a mil con las obras. Igual te dejo mi contacto directo por si más adelante querés optimizar tu gestión con Sorby. Lo bueno es que no necesitás instalar nada ni aprender un sistema nuevo. Es todo por WhatsApp y en 24hs lo tenés activo 👌 Abrazo, {{sdr_nombre}}.'
                        }
                    ]
                }
            ]
        }
    ]
};
```

### 2.2 Motor de Cadencias (v2)

```javascript
// backend/src/services/cadenciaEngine.js

class CadenciaEngine {
    /**
     * Asignar cadencia a un contacto.
     * Se llama al: crear contacto nuevo, reasignar cadencia manual.
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
        contacto.proximoContacto = this._calcularFecha(paso1.delayDias);

        await contacto.save();
        await HistorialSDR.create({
            contacto: contactoId,
            tipo: 'cadencia_iniciada',
            descripcion: `Cadencia "${cadencia.nombre}" asignada`,
            empresaId: contacto.empresaId,
            realizadoPor: 'sistema'
        });
    }

    /**
     * Avanzar al siguiente paso.
     * Se llama después de que el SDR ejecuta todas las acciones del paso actual.
     */
    async avanzarPaso(contactoId) {
        const contacto = await ContactoSDR.findById(contactoId)
            .populate('cadenciaActiva.cadenciaId');

        if (!contacto.cadenciaActiva?.cadenciaId) return;
        if (contacto.cadenciaActiva.pausada || contacto.cadenciaActiva.completada) return;

        const cadencia = contacto.cadenciaActiva.cadenciaId;
        const pasoActual = contacto.cadenciaActiva.pasoActual;
        const siguientePaso = cadencia.pasos.find(p => p.orden === pasoActual + 1);

        if (!siguientePaso) {
            // Cadencia completada — esperar diasEsperaPostCadencia antes de no_contacto
            contacto.cadenciaActiva.completada = true;
            contacto.proximoContacto = this._calcularFecha(cadencia.diasEsperaPostCadencia);

            await HistorialSDR.create({
                contacto: contactoId,
                tipo: 'cadencia_completada',
                descripcion: `Cadencia completada. Esperando ${cadencia.diasEsperaPostCadencia} días antes de marcar no_contacto`,
                empresaId: contacto.empresaId,
                cadenciaPaso: pasoActual
            });
        } else {
            contacto.cadenciaActiva.pasoActual = siguientePaso.orden;
            contacto.proximoContacto = this._calcularFecha(siguientePaso.delayDias);

            await HistorialSDR.create({
                contacto: contactoId,
                tipo: 'cadencia_avanzada',
                descripcion: `Paso ${siguientePaso.orden}: ${siguientePaso.nombre}`,
                empresaId: contacto.empresaId,
                cadenciaPaso: siguientePaso.orden
            });
        }

        await contacto.save();
    }

    /**
     * Detener cadencia (contacto respondió).
     */
    async detenerCadencia(contactoId, motivo) {
        const contacto = await ContactoSDR.findById(contactoId);
        if (!contacto?.cadenciaActiva?.cadenciaId) return;

        contacto.cadenciaActiva.completada = true;
        await contacto.save();

        await HistorialSDR.create({
            contacto: contactoId,
            tipo: 'cadencia_detenida',
            descripcion: `Cadencia detenida: ${motivo}`,
            empresaId: contacto.empresaId,
            cadenciaPaso: contacto.cadenciaActiva.pasoActual
        });
    }

    /**
     * Seleccionar variante de template según rubro del contacto.
     */
    seleccionarVariante(acciones, rubro) {
        return acciones.map(accion => {
            if (!accion.variantes || accion.variantes.length === 0) return accion;

            // Buscar por rubro exacto, fallback a 'general'
            const variante = accion.variantes.find(v => v.rubro === rubro)
                || accion.variantes.find(v => v.rubro === 'general')
                || accion.variantes[0];

            return { ...accion.toObject(), varianteSeleccionada: variante };
        });
    }

    /**
     * Resolver variables en un template.
     */
    resolverTemplate(texto, contacto, sdr) {
        if (!texto) return texto;
        return texto
            .replace(/\{\{nombre\}\}/g, contacto.nombre?.split(' ')[0] || '')
            .replace(/\{\{rubro_texto\}\}/g, contacto.rubro || 'empresas')
            .replace(/\{\{sdr_nombre\}\}/g, sdr?.nombre?.split(' ')[0] || 'Fer')
            .replace(/\{\{momento_bot\}\}/g, this._calcularMomentoBot(contacto.datosBot?.interaccionFecha));
    }

    _calcularFecha(dias) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + dias);
        fecha.setHours(9, 0, 0, 0); // Default: 09:00
        return fecha;
    }

    _calcularMomentoBot(fecha) {
        if (!fecha) return '';
        const ahora = new Date();
        const diff = ahora - new Date(fecha);
        const horas = Math.floor(diff / 3600000);
        const dias = Math.floor(diff / 86400000);

        if (horas < 6) return 'hace un ratito';
        if (horas < 12) return 'esta mañana';
        if (horas < 24) return 'ayer';
        if (dias === 1) return 'ayer';
        if (dias < 7) {
            const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            return `el ${diasSemana[new Date(fecha).getDay()]}`;
        }
        return `hace ${dias} días`;
    }
}

module.exports = new CadenciaEngine();
```

### 2.3 CRUD Cadencias + Filtros (rutas)

```javascript
// sdrRoutes.js — Agregar:

// CRUD Cadencias
router.get('/cadencias', sdrController.listarCadencias);
router.post('/cadencias', sdrController.crearCadencia);
router.put('/cadencias/:id', sdrController.actualizarCadencia);
router.delete('/cadencias/:id', sdrController.eliminarCadencia);

// Asignar/detener cadencia
router.post('/cadencias/asignar', sdrController.asignarCadencia);
router.post('/cadencias/detener', sdrController.detenerCadencia);

// Obtener paso actual con templates resueltos
router.get('/cadencias/paso-actual/:contactoId', sdrController.obtenerPasoActual);
```

### 2.4 Vistas Guardadas ✅ IMPLEMENTADO

```javascript
// backend/src/models/sdr/VistaGuardadaSDR.js

const VistaGuardadaSDRSchema = new Schema({
    nombre: { type: String, required: true },
    empresaId: { type: String, required: true },
    usuarioId: { type: String },          // null = compartida
    filtros: {
        estados: [String],
        planEstimado: [String],
        intencionCompra: [String],
        precalificacionBot: [String],
        tamanoEmpresa: [String],
        cadenciaPaso: Number,
        proximoContacto: String,           // 'vencido', 'hoy', 'semana', 'sin_programar'
        tieneReunion: String,              // 'agendada', 'realizada', 'sin_reunion'
        sdrAsignado: String,
        segmento: String,
        fechaCreacionDesde: Date,
        fechaCreacionHasta: Date,
        busqueda: String
    },
    ordenarPor: { type: String, default: 'prioridadScore' },
    ordenDir: { type: String, default: 'desc' },
    esDefault: { type: Boolean, default: false },
    icono: { type: String, default: 'bookmark' },
    color: { type: String, default: 'default' }
}, { timestamps: true });

// Indexes
VistaGuardadaSDRSchema.index({ empresaId: 1, usuarioId: 1 });
VistaGuardadaSDRSchema.index({ empresaId: 1, esDefault: 1 });
```

**CRUD implementado**: `GET/POST/PUT/DELETE /api/sdr/vistas`  
**Frontend**: chips de vistas + modal guardar/eliminar en `contactosSDR.js`

---

## Fase 3: Pipeline de Ventas

### 3.1 Modelo `OportunidadSDR.js`

```javascript
const ESTADOS_OPORTUNIDAD = ['propuesta', 'negociacion', 'ganado', 'perdido'];

const OportunidadSDRSchema = new Schema({
    contacto: { type: Schema.Types.ObjectId, ref: 'ContactoSDR', required: true },
    empresaId: { type: String, required: true },

    estado: { type: String, enum: ESTADOS_OPORTUNIDAD, default: 'propuesta' },

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
    clienteId: { type: String, default: null },

    // Si perdió
    motivoPerdida: { type: String, default: null },
    fechaPerdida: { type: Date, default: null },

    notas: { type: String, default: '' },
    sdrId: { type: String },
    sdrNombre: { type: String },
    creadoPor: { type: String, required: true },
    creadoPorNombre: { type: String }
}, { timestamps: true });
```

### 3.2 Rutas y métricas de pipeline

```javascript
// sdrRoutes.js

router.get('/oportunidades', sdrController.listarOportunidades);
router.post('/oportunidades', sdrController.crearOportunidad);
router.put('/oportunidades/:id', sdrController.actualizarOportunidad);
router.get('/metricas/ventas', sdrController.obtenerMetricasVentas);
router.get('/metricas/pipeline', sdrController.obtenerPipeline);
```

```javascript
// GET /api/sdr/metricas/pipeline
// Response:
{
    pipeline: {
        propuesta:   { cantidad: 5, ticketTotal: 2500000 },
        negociacion: { cantidad: 3, ticketTotal: 1500000 },
        ganado:      { cantidad: 2, ticketTotal: 1000000 },
        perdido:     { cantidad: 1, ticketTotal: 375000 }
    },
    pipelinePorPlan: {
        premium:  { cantidad: 2, ticketTotal: 1250000 },
        avanzado: { cantidad: 4, ticketTotal: 1500000 },
        basico:   { cantidad: 2, ticketTotal: 500000 }
    },
    mesActual: {
        clientesNuevos: 2,
        ticketPromedio: 500000,
        tasaCierre: 0.67,
        tiempoPromedioCierre: 18 // días
    },
    motivosPerdida: [
        { motivo: 'Precio', cantidad: 2 },
        { motivo: 'Timing', cantidad: 1 }
    ]
}
```

---

## Fase 4: Automatización WhatsApp

### 4.1 Arquitectura

```
// Bot SEPARADO del bot principal de Sorby
// Razones:
// 1. Número diferente (no mezclar con el de Fernando)
// 2. Si falla, no afecta al bot principal
// 3. Diferentes reglas de rate limiting

backend/src/
├── services/
│   └── sdrWhatsAppBot.js        # Bot dedicado para SDR
├── jobs/
│   └── cadenciaScheduler.js     # Cron que procesa pasos pendientes
```

### 4.2 Scheduler de Cadencias

```javascript
// backend/src/jobs/cadenciaScheduler.js
const cron = require('node-cron');

async function procesarCadenciasPendientes() {
    const ahora = new Date();

    // Contactos con cadencia activa y próximo contacto pasado
    const contactos = await ContactoSDR.find({
        'cadenciaActiva.pausada': false,
        'cadenciaActiva.completada': false,
        'cadenciaActiva.cadenciaId': { $ne: null },
        proximoContacto: { $lte: ahora }
    }).populate('cadenciaActiva.cadenciaId');

    for (const contacto of contactos) {
        const cadencia = contacto.cadenciaActiva.cadenciaId;
        const paso = cadencia.pasos.find(
            p => p.orden === contacto.cadenciaActiva.pasoActual
        );
        if (!paso) continue;

        // ETAPA A: Crear notificación para el SDR (semi-auto)
        // ETAPA B: Enviar automáticamente (full-auto, futuro)
        await crearNotificacionPendiente(contacto, paso);
    }

    // Contactos con cadencia completada + espera vencida → no_contacto
    const paraNoContacto = await ContactoSDR.find({
        'cadenciaActiva.completada': true,
        proximoContacto: { $lte: ahora },
        estado: { $nin: ['contactado', 'calificado', 'cierre', 'ganado', 'no_califica', 'perdido'] }
    });

    for (const contacto of paraNoContacto) {
        contacto.estado = 'no_contacto';
        contacto.historialEstados.push({ estado: 'no_contacto', fecha: new Date(), cambiadoPor: 'sistema' });
        await contacto.save();

        await HistorialSDR.create({
            contacto: contacto._id,
            tipo: 'cambio_estado',
            descripcion: 'Cadencia completada + espera vencida → no_contacto',
            estadoAnterior: contacto.estado,
            estadoNuevo: 'no_contacto',
            empresaId: contacto.empresaId,
            realizadoPor: 'sistema'
        });
    }
}

// Cada 15 min de 8:00 a 21:00, lunes a sábado
cron.schedule('*/15 8-21 * * 1-6', procesarCadenciasPendientes);
```

### 4.3 Rate Limiting

```javascript
const LIMITES_WHATSAPP = {
    maxMensajesPorDia: 50,
    maxMensajesPorHora: 10,
    horaInicio: 8,
    horaFin: 21,
    diasLaborales: [1, 2, 3, 4, 5, 6],
    delayEntreEnvios: 30000,  // 30s mínimo
};
```

---

## Fase 5: Reportes Avanzados

### 5.1 Endpoints

```javascript
router.get('/metricas/funnel', sdrController.obtenerFunnel);
router.get('/metricas/comparativa', sdrController.obtenerComparativa);       // Este mes vs anterior
router.get('/metricas/velocidad', sdrController.obtenerVelocidadPorEtapa);
router.get('/metricas/conversion-por-origen', sdrController.conversionPorOrigen);
router.get('/metricas/conversion-por-plan', sdrController.conversionPorPlan);
router.get('/metricas/matriz-plan-intencion', sdrController.matrizPlanIntencion);
```

### 5.2 Componentes frontend

```
components/sdr/reportes/
├── FunnelConversion.js        # Embudo visual con % entre etapas
├── ComparativaPeriodos.js     # Barras: este mes vs anterior
├── MetricasPorSDR.js          # Tabla comparativa del equipo
├── TendenciaSemanal.js        # Línea temporal
├── MatrizPlanIntencion.js     # NUEVO: grilla de calor plan × intención
└── AlertasPanel.js            # Situaciones que requieren atención
```

---

## Plan de Migración

### Script de migración de estados

```javascript
// scripts/migrar-estados-sdr.js

const MAPEO_ESTADOS = {
    'nuevo': 'nuevo',
    'en_gestion': 'contactado',
    'meet': 'calificado',            // v2: meet ya no es estado, pasa a calificado
    'calificado': 'calificado',
    'no_califica': 'no_califica',
    'no_responde': 'no_contacto'     // no_responde viejo → no_contacto nuevo
};

async function migrar() {
    const contactos = await ContactoSDR.find({});

    for (const c of contactos) {
        const estadoNuevo = MAPEO_ESTADOS[c.estado] || 'nuevo';
        const cambios = {
            estado: estadoNuevo,
            historialEstados: [{ estado: estadoNuevo, fecha: c.updatedAt || new Date(), cambiadoPor: 'migracion' }],
            planEstimado: null,
            intencionCompra: null,
            precalificacionBot: null,
            leadId: null,
            datosBot: {},
            prioridadScore: 0
        };

        // v2: Si estaba en 'meet', crear una ReunionSDR
        if (c.estado === 'meet') {
            await ReunionSDR.create({
                contacto: c._id,
                empresaId: c.empresaId,
                numero: 1,
                estado: 'realizada',       // Asumimos que si estaba en 'meet' es porque ocurrió
                fecha: c.ultimaAccion || c.updatedAt || new Date(),
                notas: 'Migrada desde estado meet',
                creadoPor: 'migracion'
            });
        }

        // Outbound (importados de Notion/Excel): precalificacionBot queda null
        // porque nunca pasaron por el bot. null ≠ sin_calificar:
        //   null         → nunca interactuó con bot (outbound puro)
        //   sin_calificar → interactuó con bot pero no completó el recorrido

        await ContactoSDR.findByIdAndUpdate(c._id, { $set: cambios });
    }

    // Recalcular scores
    const todos = await ContactoSDR.find({});
    for (const c of todos) {
        const reuniones = await ReunionSDR.find({ contacto: c._id });
        c.prioridadScore = calcularPrioridadScore(c, reuniones);
        await c.save();
    }

    console.log(`Migrados ${contactos.length} contactos`);
}
```

### Pasos de deploy

```bash
# 1. Backup
mongodump --db sorby --collection contactosdrs
mongodump --db sorby --collection reunionsdrs
mongodump --db sorby --collection historialsdrs

# 2. Migrar estados + crear reuniones
node scripts/migrar-estados-sdr.js

# 3. Seed cadencia default
node scripts/seedCadenciaDefault.js

# 4. Recalcular prioridades
node scripts/recalcular-prioridades.js

# 5. Deploy backend (backward compatible)
# 6. Deploy frontend con feature flag
# 7. Validar con Fernando (1 semana paralelo)
# 8. Desactivar Notion/Sheets para SDR
```

---

## Consideraciones Técnicas

### Performance
- **Índice compuesto** en `prioridadScore` para sort eficiente
- **Recálculo de prioridad**: en cada acción individual, no batch
- **Métricas**: `aggregate` de MongoDB, no cargar todo a memoria
- **Paginación**: 50 por página con sort por `prioridadScore`
- **Reuniones**: consulta separada con `contacto` index (no populated en lista)

### Backwards Compatibility
- Backend acepta estados viejos durante transición
- Endpoints existentes mantienen firma, nuevos se agregan
- Feature flags para componentes nuevos (ModoLlamadas, ReunionesSection, etc.)

### Deduplicación
- `telefono` + `empresaId` = unique index en ContactoSDR
- `normalizarTelefono()` se ejecuta SIEMPRE antes de buscar o crear
- Importación muestra UI de conflicto si encuentra duplicado

### Testing
- Tests para `calcularPrioridadScore` con combinaciones plan+bot+reuniones
- Tests para `normalizarTelefono` con todos los formatos posibles
- Tests para `CadenciaEngine` (asignar, avanzar, detener, completar)
- Tests para `sincronizarLeadConContactoSDR` (4 escenarios)
- Migración en modo dry-run primero

### Seguridad del Bot WhatsApp (Fase 4)
- Número separado obligatorio
- Kill switch: endpoint para parar todo envío
- Logs de todo mensaje enviado
- Alert si tasa de bloqueo > 5%
