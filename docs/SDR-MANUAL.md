# Manual de Usuario — Módulo SDR

> Este manual está dirigido a los SDRs (representantes de desarrollo de ventas) que usan el sistema diariamente.

---

## 1. Acceso

### Vista SDR Individual: `/contactosSDR`
Tu lista personal de contactos asignados. Desde acá trabajás el día a día.

### Vista Admin: `/gestionSDR`
Panel de administración con métricas generales, todos los contactos y reuniones.

### Detalle de Contacto: `/sdr/contacto/[id]`
Vista completa de un contacto con 3 tabs: Info, Historial y Chat.

### Gestión de Cadencias: `/sdr/cadencias`
ABM de cadencias de contacto (crear, editar, duplicar, eliminar).

---

## 2. Flujo Diario

```
1. Abrí /contactosSDR
2. Filtrá por "Vencidos" para ver los contactos pendientes
3. Tocá un contacto para abrirlo
4. Llamá (botón verde 📞)
   ├── Si atiende → Registrar llamada → Programar siguiente / Coordinar reunión
   └── Si no atiende → Registrar → WhatsApp (template de cadencia) → Siguiente
5. Repetí con el siguiente contacto
```

---

## 3. Lista de Contactos (`/contactosSDR`)

### Filtros Disponibles

| Filtro | Opciones |
|--------|----------|
| **Tipo** | Activos, Vencidos, No calificados, Todos |
| **Estado** | Nuevos, Contactados, Calificados, En Cierre, Ganados, No Responde, etc. |
| **Próximo contacto** | Sin fecha, Vencidos, Pendientes |
| **Segmento** | 🔵 Inbound (vienen del bot), 🟠 Outbound (importados/manuales) |
| **Búsqueda** | Por nombre, empresa o teléfono |

### Cards de Contacto

Cada card muestra:
- **Nombre** + chip de estado (color)
- **Empresa** o teléfono
- **Badges**: precalificación bot, prioridad, segmento (In/Out)
- **Próximo contacto**: verde = pendiente, rojo = vencido
- **Botones**: 📞 Llamar directo, 💬 WhatsApp directo

### Ordenamiento

Los contactos se muestran priorizados:
1. **Vencidos primero** (fecha de próximo contacto ya pasó)
2. **Por fecha de próximo contacto** (ascendente)
3. **Sin fecha** al final

### Acciones Masivas

1. Seleccioná varios contactos con los checkboxes
2. Aparece la barra de acciones:
   - 📅 **Fecha**: Programar próximo contacto para todos
   - 🔄 **Cadencia**: Asignar cadencia a todos

### Vistas Guardadas

Podés guardar una combinación de filtros para reutilizar:
1. Aplicá los filtros que querés
2. Tocá **"Guardar"**
3. Poné un nombre descriptivo (ej: "Leads calientes inbound")
4. Elegí si es privada (solo vos) o compartida (todo el equipo)
5. La vista aparece como chip rápido

---

## 4. Detalle de Contacto (`/sdr/contacto/[id]`)

### Tab Info
- Datos del contacto (nombre, empresa, cargo, teléfono, email)
- **Estado**: editable tocando el chip
- **Plan estimado** y **Intención de compra**: seleccionables
- **Próximo contacto**: fecha/hora programada
- **Cadencia activa**: muestra el paso actual
- **Reuniones**: lista de reuniones coordinadas

### Tab Historial
- Timeline de todas las acciones (llamadas, WhatsApp, cambios de estado, etc.)
- Cada evento muestra: tipo (ícono color), descripción, nota (si hay), fecha y SDR
- **Eliminar evento**: botón 🗑️ en cada evento para eliminar registros erróneos (con confirmación)
- **Agregar comentario**: campo de texto al inicio del historial

### Tab Chat
- Visor en tiempo real del chat de WhatsApp con el contacto
- Solo lectura (los mensajes se envían desde la app de WhatsApp)

### Barra Fija (Mobile)
Siempre visible en la parte inferior. Muestra:
- Paso actual de la cadencia (ej: "Paso 2/4 — Entregar valor")
- Botones de acción rápida según la cadencia

### Navegación
- Botones **← Anterior** / **Siguiente →** para recorrer contactos sin salir
- Atajos de teclado en desktop: `←` y `→`
- Si el contacto no tiene próximo contacto o está vencido, se pregunta si querés programar uno al navegar

---

## 5. Registrar Acción

### Tipos de Acciones

| Tipo | Descripción |
|------|-------------|
| 📞✓ Llamada atendida | Se atendió la llamada |
| 📞✗ Llamada no atendida | No atendió |
| 💬 WhatsApp enviado | Se envió mensaje de WhatsApp |
| 📅 Reunión coordinada | Se agendó una reunión |
| 🔕 No responde | Sin respuesta múltiple |
| ⛔ No califica | Descarta el contacto |
| 📝 Nota | Solo agregar una nota |

### Flujo
1. Seleccionar tipo de acción
2. (Opcional) Agregar nota
3. (Opcional) Programar próximo contacto
4. Confirmar
5. Opción de ir al "Siguiente contacto" para continuar el loop

---

## 6. Templates de WhatsApp

Los templates están organizados por **paso de cadencia**. Al tocar el botón de WhatsApp, se muestra el template correspondiente al paso actual con las variables ya resueltas.

### Variables Disponibles

| Variable | Se reemplaza por |
|----------|-----------------|
| `{{nombre}}` | Nombre del contacto |
| `{{rubro_texto}}` | Rubro del contacto |
| `{{sdr_nombre}}` | Tu nombre |
| `{{momento_bot}}` | Cuándo interactuó con el bot |

El sistema elige automáticamente la variante del template según el rubro del contacto (constructora, estudio, general, etc.).

---

## 7. Cadencias

Una cadencia es una secuencia automática de pasos para contactar a un lead.

### Ver la Cadencia Actual
- En mobile: la **barra fija inferior** muestra el paso actual
- En desktop: sección "Cadencia" en el tab Info

### Avanzar Paso
Después de completar las acciones del paso actual, tocá **"Avanzar"** para pasar al siguiente paso. El sistema programa automáticamente la fecha del próximo contacto.

### Detener Cadencia
Si el contacto ya respondió o no corresponde seguir, tocá **"Detener cadencia"**.

### Cadencias por Segmento
- Las cadencias pueden ser **default para Inbound** (leads del bot) o **default para Outbound** (contactos importados)
- Se asignan automáticamente o manualmente

---

## 8. Alta de Contactos

### Manual (botón "+")
Campos:
- **Nombre** (obligatorio)
- **Teléfono** (obligatorio) — se normaliza automáticamente
- Email, Empresa, Cargo, Notas (opcionales)

### Importación Excel
1. Descargar plantilla
2. Completar datos (mínimo: Nombre y Teléfono)
3. Subir archivo .xlsx o .xls
4. Revisar vista previa (se marcan errores y duplicados)
5. Confirmar importación

### Normalización de Teléfonos

El sistema normaliza automáticamente a formato E.164 argentino:

| Entrada | Resultado |
|---------|-----------|
| `011 4567-8900` | `+5491145678900` |
| `15 4567-8900` | `+5491145678900` |
| `+54 9 11 4567-8900` | `+5491145678900` |
| `1145678900` | `+5491145678900` |

---

## 9. Gestión SDR (`/gestionSDR`) — Solo Admin

### Tab Dashboard
- **Métricas del día**: llamadas realizadas, WhatsApp enviados, reuniones coordinadas, pendientes, sin asignar
- **Actividad por SDR**: tabla con métricas de cada SDR
- **Últimas reuniones**: tabla con las 5 reuniones más recientes

### Tab Contactos
- **Tabla de todos los contactos** (no solo los tuyos)
- **Filtros**: búsqueda, estado, Status Notion, **SDR** (dropdown), sin asignar
- **Acciones masivas**: asignar a SDR, desasignar, eliminar

### Tab Reuniones
- Lista de reuniones agendadas
- Evaluar: marcar como realizada, no_show o cancelada

---

## 10. Troubleshooting

### No veo mis contactos
- Verificá que estés logueado con el usuario correcto
- Los contactos deben estar asignados a tu usuario

### La cadencia no avanza
- Verificá que la cadencia esté activa
- Revisá si se detuvo automáticamente (el contacto pasó a estado calificado/cierre/ganado)

### No veo templates al enviar WhatsApp
- Los templates se cargan del paso actual de la cadencia
- Si no hay cadencia asignada, se muestran templates generales

### Error al importar Excel
- Verificá que las columnas se llamen exactamente como en la plantilla
- El archivo debe ser .xlsx o .xls
- Revisá los errores por fila en la vista previa

### Los teléfonos no se normalizan correctamente
- El sistema espera números argentinos
- Para internacionales, ingresá con código de país completo (+XX...)
