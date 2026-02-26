# Manual del Módulo SDR

## Descripción General

El módulo SDR (Sales Development Representative) permite gestionar contactos de manera eficiente desde dispositivos móviles. El flujo principal es:

**Llamar → WhatsApp → Registrar acción → Siguiente**

---

## Funcionalidades Principales

### 1. Lista de Contactos

Los contactos se muestran ordenados por prioridad:
1. **Vencidos primero**: Contactos cuya fecha de "próximo contacto" ya pasó
2. **Por fecha de próximo contacto** (ascendente)
3. **Sin fecha** al final

#### Filtros por Estado

Se muestran como chips seleccionables. Hay 10 estados:

| Estado | Descripción |
|--------|-------------|
| **Nuevos** | Contactos recién ingresados |
| **Contactados** | Se hizo al menos un intento de contacto |
| **Calificados** | Interés y datos confirmados |
| **En Cierre** | Negociación activa |
| **Ganados** | Conversión exitosa |
| **No Contactado** | No se pudo establecer contacto |
| **No Responde** | Múltiples intentos sin respuesta |
| **Revisar** | Para revisar más adelante |
| **No Califica** | Descartado |
| **Perdidos** | Oportunidad perdida |

#### Filtros Avanzados

- **Plan estimado**: básico, avanzado, premium
- **Intención de compra**: baja, media, alta
- **Precalificación bot**: sin_calificar, calificado, quiere_meet, no_llego
- **Tamaño empresa**: 1-10, 11-50, 51-200, 200+
- **Próximo contacto**: vencido, hoy, esta semana, sin programar

#### Vistas Guardadas

Permite guardar combinaciones de filtros como "vistas" reutilizables:

1. Aplicar los filtros deseados
2. Click en **"Guardar vista"**
3. Asignar un nombre descriptivo (ej: "Leads calientes")
4. Elegir si es **privada** (solo vos) o **compartida** (todo el equipo)
5. La vista aparece como un chip rápido para aplicar con un click

Para eliminar una vista, click en el ícono de eliminar (🗑️) del chip.

---

### 2. Acciones Rápidas

#### Desde la lista
- **Tap en teléfono**: Inicia llamada directa
- **Tap en WhatsApp**: Abre WhatsApp sin template

#### Desde el drawer de detalle
- **Botón Llamar**: Inicia llamada
- **Botón WhatsApp**: Abre selector de templates por paso de cadencia

---

### 3. Templates de WhatsApp

Los templates están organizados por **paso de cadencia**:

| Paso | Descripción |
|------|-------------|
| 1 | Primer contacto (presentación) |
| 2 | Follow-up (segundo intento) |
| 3 | Último intento |

#### Variables disponibles en templates

| Variable | Se reemplaza por |
|----------|-----------------|
| `{{first_name}}` | Nombre del contacto |
| `{{company}}` | Empresa del contacto |
| `{{assigned_to}}` | Nombre del SDR asignado |

#### Ejemplo de template
```
Hola {{first_name}}! 👋

Soy {{assigned_to}} de FactuData. Vi que trabajan en {{company}} y quería comentarles sobre nuestra solución...
```

---

### 4. Registrar Acción

El botón **"Registrar Acción"** está siempre visible en la parte inferior de la pantalla móvil (sticky).

#### Tipos de acciones

| Tipo | Icono | Descripción |
|------|-------|-------------|
| `llamada_atendida` | 📞✓ | Llamada con respuesta |
| `llamada_no_atendida` | 📞✗ | Llamada sin respuesta |
| `whatsapp_enviado` | 💬 | Mensaje de WhatsApp enviado |
| `reunion_coordinada` | 📅 | Reunión agendada |
| `no_responde` | 🔕 | Sin respuesta múltiple |
| `no_califica` | ⛔ | Descarta el contacto |
| `nota` | 📝 | Solo agregar nota |

#### Flujo post-acción
1. Seleccionar tipo de acción
2. (Opcional) Agregar nota
3. (Opcional) Programar próximo contacto
4. Confirmar
5. Opción de "Siguiente contacto" para continuar el loop

---

### 5. Alta de Contactos

#### Manual (botón "+")
Campos:
- **Nombre** (requerido)
- **Teléfono** (requerido) - Se normaliza automáticamente a formato E.164
- **Email** (opcional)
- **Empresa** (opcional)
- **Cargo** (opcional)
- **Notas iniciales** (opcional)

#### Importación Excel (botón 📄)

##### Formato esperado del Excel

| Columna | Requerido | Descripción |
|---------|-----------|-------------|
| Nombre | ✅ | Nombre completo del contacto |
| Teléfono | ✅ | Número de teléfono (cualquier formato) |
| Email | ❌ | Correo electrónico |
| Empresa | ❌ | Nombre de la empresa |
| Cargo | ❌ | Cargo del contacto |
| Notas | ❌ | Notas iniciales |
| Próximo contacto | ❌ | Fecha en formato DD/MM/YYYY |

##### Proceso de importación
1. Descargar plantilla (botón "Descargar plantilla")
2. Completar datos
3. Subir archivo (.xlsx o .xls)
4. Revisar vista previa con errores
5. Confirmar importación

##### Validaciones automáticas
- **Duplicados internos**: Detecta teléfonos repetidos en el mismo Excel
- **Duplicados en base de datos**: Identifica teléfonos que ya existen
- **Formato de teléfono**: Valida y normaliza a E.164

---

### 6. Navegación entre Contactos

Los botones **Anterior / Siguiente** permiten navegar sin salir del detalle.

**Importante**: Si el contacto actual no tiene "próximo contacto" o está vencido, al navegar se preguntará si desea programar uno.

#### Atajos de teclado (desktop)
- `←` Anterior
- `→` Siguiente

---

## Normalización de Teléfonos

El sistema normaliza automáticamente los teléfonos al formato **E.164** para Argentina:

| Entrada | Salida |
|---------|--------|
| `011 4567-8900` | `+5491145678900` |
| `15 4567-8900` | `+5491145678900` |
| `+54 9 11 4567-8900` | `+5491145678900` |
| `1145678900` | `+5491145678900` |

---

## Importación desde Notion

El sistema soporta dos formatos de comentarios:

### Formato viejo (string)
```
"Comentario 1\n---\nComentario 2\n---\nComentario 3"
```

### Formato nuevo (array de items)
```json
{
  "items": [
    { "text": "Comentario 1", "date": "2024-01-15", "author": "SDR" },
    { "text": "Comentario 2", "date": "2024-01-16", "author": "SDR" }
  ]
}
```

Ambos formatos son detectados y parseados automáticamente. Se importan máximo las **últimas 10 notas**.

---

## API Endpoints

### Templates WhatsApp
```
GET  /api/sdr/whatsapp/templates
POST /api/sdr/whatsapp/templates
PUT  /api/sdr/whatsapp/templates/:id
DELETE /api/sdr/whatsapp/templates/:id
```

### Importación Excel
```
POST /api/sdr/contactos/importar-excel
  Body: { contactos: [], empresaId, sdrId, options: { normalizePhone, deduplicateByPhone, upsert } }

POST /api/sdr/contactos/validar-excel
  Body: { telefonos: [] }
```

---

## Arquitectura de Componentes

```
src/
├── pages/
│   └── contactosSDR.js          # Página principal
├── components/sdr/
│   ├── DrawerDetalleContactoSDR.js  # Drawer de detalle del contacto
│   ├── ModalSelectorTemplate.js     # Selector de templates WhatsApp
│   ├── ModalRegistrarAccion.js      # Modal de registro de acción
│   ├── ModalAgregarContacto.js      # Modal para crear contacto manual
│   └── ModalImportarExcel.js        # Modal para importar Excel
├── services/
│   └── sdrService.js            # Servicio de API
└── utils/
    ├── phoneUtils.js            # Normalización de teléfonos
    └── notionMapper.js          # Mapper de comentarios Notion
```

---

## Troubleshooting

### El botón "Registrar Acción" no aparece
- Verificar que se está en vista móvil (< 900px)
- El botón solo aparece dentro del drawer de detalle

### Los templates no cargan
- El sistema usa templates por defecto si el endpoint no responde
- Verificar configuración de `sdrService.js`

### Error al importar Excel
- Verificar que las columnas se llamen exactamente como en la plantilla
- Asegurarse que el archivo sea .xlsx o .xls
- Revisar errores por fila en la vista previa

### Los teléfonos no se normalizan
- El sistema espera números argentinos
- Para números internacionales, ingresar con código de país completo (+XX...)
