# SDR — Sistema de Cadencias

## 1. Concepto

Una **cadencia** es un flujo automatizado de N pasos que define cómo contactar a un lead. Cada paso tiene acciones (llamada, WhatsApp, email) con templates personalizados por rubro.

```
Cadencia "Ciclo de Vida de Lead" (14 días)
│
├── Paso 1: Gancho (+1 día)
│   ├── Acción 1: Llamada
│   └── Acción 2: WhatsApp (si no atendió) → template por rubro
│
├── Paso 2: Entregar valor (+2 días)
│   └── Acción 1: WhatsApp → video/caso de uso
│
├── Paso 3: Evaluar interés (+2 días)
│   ├── Acción 1: Llamada
│   └── Acción 2: WhatsApp (si no atendió) → follow-up
│
└── Paso 4: Cierre suave (+3 días)
    ├── Acción 1: Llamada
    └── Acción 2: WhatsApp (si no atendió) → cierre con puerta abierta
    
→ Espera post-cadencia: 6 días
→ Si no responde: estado = "no_contacto"
```

---

## 2. Modelo de Datos

### Estructura Jerárquica

```
CadenciaSDR
├── nombre, descripcion
├── defaultInbound: Boolean    ← cadencia auto-asignada a leads inbound
├── defaultOutbound: Boolean   ← cadencia auto-asignada a leads outbound  
├── esDefault: Boolean         ← retrocompatibilidad (true si defaultInbound || defaultOutbound)
├── activa: Boolean
├── detenerAlResponder: Boolean
├── diasEsperaPostCadencia: Number
├── estadoAlCompletar: String (default: 'no_contacto')
│
└── pasos: [PasoSchema]
    ├── orden: Number
    ├── nombre: String
    ├── delayDias: Number (días u horas de espera desde paso anterior)
    ├── delayUnidad: 'dias' | 'horas'
    ├── objetivo: String
    │
    └── acciones: [AccionSchema]
        ├── orden: Number
        ├── tipo: 'llamada' | 'whatsapp' | 'email' | 'espera'
        ├── condicion: 'si_atendio' | 'si_no_atendio' | 'si_respondio' | 'si_no_respondio' | null
        ├── descripcion: String
        │
        └── variantes: [VarianteSchema]
            ├── rubro: String (default: 'general')
            ├── templateNombre: String
            └── templateTexto: String (con variables {{nombre}}, {{rubro_texto}}, etc.)
```

### Cadencia Default por Segmento

El sistema soporta **dos cadencias default simultáneas**:

| Campo | Uso |
|-------|-----|
| `defaultInbound: true` | Se auto-asigna cuando un lead llega del bot |
| `defaultOutbound: true` | Disponible para asignar a contactos importados/manuales |

Cuando se marca una cadencia como `defaultInbound`, se quita automáticamente el flag de la cadencia anterior que lo tenía. Lo mismo para `defaultOutbound`. Una misma cadencia puede ser default para ambos segmentos.

El campo `esDefault` se mantiene como `defaultInbound || defaultOutbound` por retrocompatibilidad.

---

## 3. Motor de Cadencias (cadenciaEngine.js)

### 3.1 Asignar Cadencia

```javascript
await cadenciaEngine.asignarCadencia(contactoId, cadenciaId, usuario)
```

1. Busca la cadencia y el contacto
2. Setea `contacto.cadenciaActiva = { cadenciaId, pasoActual: 1, iniciadaEn: now }`
3. Programa `proximoContacto` según `delayDias` del paso 1
4. Registra evento `cadencia_iniciada` en historial

### 3.2 Avanzar Paso

```javascript
await cadenciaEngine.avanzarPaso(contactoId, usuario)
```

1. Incrementa `cadenciaActiva.pasoActual`
2. Si no hay más pasos → marca `completada: true`
3. Programa `proximoContacto` según delay del siguiente paso
4. Si completada, programa espera de `diasEsperaPostCadencia` días
5. Registra evento `cadencia_avanzada` o `cadencia_completada`

### 3.3 Detener Cadencia

```javascript
await cadenciaEngine.detenerCadencia(contactoId, usuario)
```

Marca `cadenciaActiva.completada = true`. Registra `cadencia_detenida`.

### 3.4 Obtener Paso Actual

```javascript
const paso = await cadenciaEngine.obtenerPasoActual(contactoId)
```

Retorna el paso actual con templates **resueltos** (variables reemplazadas y variante seleccionada por rubro del contacto).

### 3.5 Resolución de Templates

El motor resuelve las variantes de template siguiendo esta prioridad:

1. Busca variante con `rubro` que coincida exactamente con `contacto.datosBot?.rubro`
2. Fallback a variante con `rubro: 'general'`
3. Fallback a la primera variante disponible

> **Nota (Fase 2)**: En el frontend, el `ModalSelectorTemplate` ya no filtra por paso de cadencia (`cadencia_step`) sino por **tags de contexto** detectados automáticamente por `detectarContextoTemplate()`. Los tags se asignan según la situación del contacto (etapa, segmento, actividad). El motor de cadencias del backend sigue resolviendo variantes por rubro internamente.

**Variables disponibles:**

| Variable | Se reemplaza por |
|----------|-----------------|
| `{{nombre}}` | `contacto.nombre` |
| `{{rubro_texto}}` | `contacto.datosBot?.rubro` o 'tu rubro' |
| `{{sdr_nombre}}` | `contacto.sdrAsignadoNombre` o 'el equipo' |
| `{{momento_bot}}` | Texto humanizado de `contacto.datosBot?.interaccionFecha` |

### 3.6 Detención Automática

Después de cada acción registrada (llamada atendida, WhatsApp respondido), el sistema verifica automáticamente si debe detenerse la cadencia:

- Se detiene si el contacto pasa a estado: `calificado`, `cierre`, `ganado`
- **NO** se detiene en estado: `contactado` (para permitir que la cadencia siga si solo se hizo un contacto parcial)

---

## 4. Auto-asignación desde Bot

Cuando un lead llega del bot (via `leadContactoBridge.js`):

1. Se crea un `ContactoSDR` con `segmento: 'inbound'`
2. Se busca cadencia: `CadenciaSDR.findOne({ defaultInbound: true, activa: true })`
3. Fallback: `CadenciaSDR.findOne({ esDefault: true, activa: true })`
4. Si existe, se asigna automáticamente

---

## 5. UI de Gestión de Cadencias (`/sdr/cadencias`)

### 5.1 Lista de Cadencias

Muestra todas las cadencias activas con:
- Nombre + chips: "Default Inbound" (azul), "Default Outbound" (naranja), "Activa"/"Inactiva"
- Resumen: cantidad de pasos, cantidad de acciones, detiene al responder
- Mini-timeline de pasos con íconos por tipo de acción
- Acciones: Editar, Duplicar, Eliminar

### 5.2 Formulario de Cadencia

**Configuración general:**
- Nombre y descripción
- Switches: Activa, Default Inbound, Default Outbound, Detener al responder
- Días espera post-cadencia
- Estado al completar

**Editor de pasos:**
- Agregar/eliminar pasos
- Por paso: nombre, delay (días/horas), objetivo
- Acciones dentro de cada paso: tipo, condición (árbol de decisiones), descripción
- Variantes de template por rubro (con editor de texto y variables)

### 5.3 Asignación desde Detalle de Contacto

En la vista de contacto (`/sdr/contacto/[id]`):
- La barra fija inferior muestra el paso actual de la cadencia
- Botones para avanzar al siguiente paso o detener
- Templates pre-resueltos con las variables del contacto

### 5.4 Asignación Masiva

Desde `contactosSDR.js`:
- Seleccionar múltiples contactos con checkbox
- Botón "🔄 Cadencia" para asignar cadencia a todos los seleccionados

---

## 6. Cadencia Default — Ejemplo

La cadencia seed "Ciclo de Vida de Lead" define 4 pasos en 14 días:

### Paso 1: Gancho (+1 día)
- **Acción 1**: Llamada — "Si atiende → registrar y detener cadencia"
- **Acción 2** (si no atendió): WhatsApp con variantes:
  - Constructoras: "...te viene bien que te comparta 1 ejemplo de cómo otras constructoras están ordenando materiales..."
  - Estudios: "...otros estudios gestionan gastos directo por WhatsApp..."
  - General: "...te viene bien que te comparta 1 ejemplo concreto..."

### Paso 2: Entregar valor (+2 días)
- **Acción 1**: WhatsApp — Video o caso de uso relevante al rubro

### Paso 3: Evaluar interés (+2 días)
- **Acción 1**: Llamada
- **Acción 2** (si no atendió): WhatsApp — Follow-up evaluando interés

### Paso 4: Cierre suave (+3 días)
- **Acción 1**: Llamada
- **Acción 2** (si no atendió): WhatsApp — Cierre con puerta abierta

→ **Post-cadencia**: 6 días de espera. Si no responde, estado → `no_contacto`.

---

## 7. Deploy de Cadencia a Producción

### Opción A: Ejecutar seed script

```bash
cd backend/
MONGO_URI="mongodb+srv://...@.../dhn?tls=true&authSource=admin" node scripts/seedCadenciaDefault.js
```

> ⚠️ El script usa `process.env.MONGO_URI` (no `MONGO_URI_DHN`). Pasarla explícitamente.

> ⚠️ Si ya existe una cadencia con `esDefault: true`, el script no crea duplicados.

### Opción B: Export/Import directo

```bash
# Export desde local
mongoexport --uri="mongodb://localhost:27017/dhn" --collection=cadenciasdrs --out=cadencia.json

# Import a prod
mongoimport --uri="<URI_PROD>" --collection=cadenciasdrs --file=cadencia.json
```

### Opción C: Crear desde la UI

1. Ir a `/sdr/cadencias` en producción
2. Crear nueva cadencia manualmente
3. Marcar como "Default Inbound" y/o "Default Outbound"
