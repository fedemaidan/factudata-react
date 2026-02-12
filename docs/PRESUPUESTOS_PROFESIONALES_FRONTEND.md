# Presupuestos Profesionales – Frontend

> Documentación del módulo frontend para la gestión de Presupuestos Profesionales en SorbyData.

---

## Índice

1. [Resumen](#resumen)
2. [Archivos creados](#archivos-creados)
3. [Arquitectura y patrones](#arquitectura-y-patrones)
4. [Estructura de la página](#estructura-de-la-página)
5. [Service – endpoints consumidos](#service--endpoints-consumidos)
6. [Modelos de datos (referencia)](#modelos-de-datos-referencia)
7. [Componentes y diálogos internos](#componentes-y-diálogos-internos)
8. [Flujos de usuario](#flujos-de-usuario)
9. [Convenciones y decisiones de diseño](#convenciones-y-decisiones-de-diseño)
10. [Pendientes / Iteraciones futuras](#pendientes--iteraciones-futuras)

---

## Resumen

El módulo de **Presupuestos Profesionales** permite a constructoras crear, gestionar y seguir presupuestos de obra con rubros/tareas, manejo de estados (workflow), versionado con equivalencias CAC/USD, y modificaciones post-aceptación vía anexos.

**URL de la página:** `/presupuestosProfesionales`

---

## Archivos creados

| Archivo | Descripción |
|---|---|
| `src/services/presupuestoProfesional/presupuestoProfesionalService.js` | Service Axios con todos los métodos CRUD para presupuestos y plantillas |
| `src/pages/presupuestosProfesionales.js` | Página principal monolítica con tabs, tablas, filtros y diálogos |
| `docs/PRESUPUESTOS_PROFESIONALES_FRONTEND.md` | Este documento |

---

## Arquitectura y patrones

Se sigue el mismo patrón que las páginas más nuevas del proyecto (ej: `stockMateriales.js`):

```
Page (presupuestosProfesionales.js)
  ├─ Layout: DashboardLayout (src/layouts/dashboard/layout.js)
  │    └─ Envuelto con withAuthGuard (autenticación automática)
  ├─ Service: presupuestoProfesionalService.js
  │    └─ Usa axiosConfig.js (token Firebase inyectado por interceptor)
  ├─ Auth context: useAuthContext() → user
  │    └─ getEmpresaDetailsFromUser(user) → empresa_id
  │    └─ getProyectosFromUser(user) → lista de proyectos
  └─ Estado: useState + useEffect + useCallback (sin React Query)
```

### Decisiones clave

| Decisión | Justificación |
|---|---|
| Página monolítica (sin carpeta `sections/`) | Consistente con `stockMateriales.js` y `stockMovimientos.js` |
| `useState` + `useEffect` manual | Patrón usado en todas las páginas existentes del proyecto |
| Axios via `axiosConfig.js` | Token de Firebase se inyecta automáticamente; base URL según entorno |
| `Page.getLayout` pattern | Requerido por Next.js pages router para layout persistente |

---

## Estructura de la página

La página tiene **dos tabs principales**:

### Tab 0: Presupuestos

- **Filtros:** búsqueda por título, estado, moneda, proyecto
- **Tabla:** listado con expansión de rubros por fila
- **Acciones por fila:**
  - 👁️ Ver detalle (abre dialog con sub-tabs: rubros, versiones, historial, anexos)
  - ✏️ Editar (solo en estado `borrador`)
  - 🔀 Cambiar estado (según transiciones válidas)
  - 📎 Agregar anexo (solo en estado `aceptado`)
  - 🗑️ Eliminar (solo en estado `borrador`)
- **Paginación:** server-side con `page` + `limit`

### Tab 1: Plantillas de Rubros

- **Tabla:** listado de plantillas con nombre, tipo, cantidad de rubros, estado
- **Acciones por fila:**
  - ✏️ Editar
  - 📋 Duplicar como nuevo presupuesto (cambia a tab 0 y abre form con rubros precargados)
  - 🗑️ Eliminar
- **Botones globales:**
  - ➕ Nueva plantilla (manual)
  - 📤 Importar archivo (Excel/PDF/imagen)

---

## Service – endpoints consumidos

Base URL backend: `/presupuestos-profesionales`

### Presupuestos

| Método | Función del service | Endpoint backend |
|---|---|---|
| `crear(data)` | `POST /` | Crea nuevo presupuesto |
| `listar(filters)` | `GET /` | Lista con filtros + paginación |
| `obtenerPorId(id)` | `GET /:id` | Detalle completo |
| `actualizar(id, data)` | `PUT /:id` | Actualiza (solo borrador) |
| `eliminar(id)` | `DELETE /:id` | Elimina (solo borrador) |
| `actualizarRubros(id, rubros)` | `PUT /:id/rubros` | Edición parcial de rubros |
| `cambiarEstado(id, estado, meta)` | `PUT /:id/estado` | Cambia estado con validación |
| `agregarAnexo(id, data)` | `POST /:id/anexo` | Agrega anexo (solo aceptado) |

### Plantillas

| Método | Función del service | Endpoint backend |
|---|---|---|
| `crearPlantilla(data)` | `POST /plantillas` | Crea plantilla |
| `listarPlantillas(empresaId, soloActivas)` | `GET /plantillas/:empresaId` | Lista plantillas |
| `obtenerPlantilla(id)` | `GET /plantillas/detalle/:id` | Detalle plantilla |
| `actualizarPlantilla(id, data)` | `PUT /plantillas/:id` | Actualiza plantilla |
| `eliminarPlantilla(id)` | `DELETE /plantillas/:id` | Elimina plantilla |
| `uploadPlantilla(file, empresaId)` | `POST /plantillas/upload` | Importa archivo → crea plantilla |

---

## Modelos de datos (referencia)

> Detalle completo en `backend/docs/PRESUPUESTOS_PROFESIONALES.md`

### Presupuesto Profesional (campos principales)

```
empresa_id, proyecto_id, proyecto_nombre,
titulo, obra_direccion, fecha,
moneda (ARS|USD), total_neto (calculado),
rubros[{ nombre, orden, monto, incidencia_pct, tareas[{ descripcion, orden }] }],
notas_texto, analisis_superficies,
empresa_nombre, empresa_logo_url,
estado (borrador|enviado|aceptado|rechazado|vencido),
historial_estados[], version_actual, versiones[], anexos[]
```

### Plantilla de Rubros (campos principales)

```
empresa_id, nombre, tipo, activa,
rubros[{ nombre, orden, tareas[{ descripcion, orden }] }],
archivo_origen { url, tipo_archivo, nombre_original }
```

---

## Componentes y diálogos internos

La página incluye los siguientes diálogos (todos `<Dialog>` de MUI):

| Dialog | Propósito | Cuándo se abre |
|---|---|---|
| **Crear/Editar Presupuesto** | Form completo con rubros editor, notas, superficies | Botón "Nuevo presupuesto" o ícono editar |
| **Eliminar Presupuesto** | Confirmación de eliminación | Ícono eliminar (solo borrador) |
| **Cambiar Estado** | Select con transiciones válidas + aviso de congelamiento | Ícono cambiar estado |
| **Ver Detalle** | Sub-tabs: rubros, versiones, historial, anexos | Ícono ojo |
| **Agregar Anexo** | Form con motivo + tipo de anexo | Ícono agregar anexo (solo aceptado) |
| **Crear/Editar Plantilla** | Form con rubros/tareas editor | Botón "Nueva plantilla" o ícono editar |
| **Eliminar Plantilla** | Confirmación | Ícono eliminar |
| **Importar Archivo** | Upload + procesamiento backend | Botón "Importar archivo" |

### Editor de rubros (reutilizado)

Tanto el form de presupuesto como el de plantilla incluyen un **editor inline de rubros**:

- Agregar/eliminar rubros
- Agregar/eliminar tareas dentro de cada rubro
- En presupuestos: campo de monto + cálculo de incidencia en vivo
- En presupuestos: reordenar rubros (flechas arriba/abajo)
- En presupuestos: selector para cargar rubros desde plantilla existente

---

## Flujos de usuario

### Flujo 1: Crear presupuesto desde cero

1. Tab "Presupuestos" → "Nuevo presupuesto"
2. Completar título, moneda, proyecto (opcional), dirección
3. Agregar rubros manualmente (nombre + monto + tareas)
4. Editar notas (viene pre-cargado con texto sugerido por SorbyData)
5. (Opcional) Completar análisis de superficies
6. Guardar → estado `borrador`

### Flujo 2: Crear presupuesto desde plantilla

1. Tab "Presupuestos" → "Nuevo presupuesto"
2. Seleccionar plantilla en el combo "Cargar rubros desde plantilla"
3. Los rubros se pre-cargan con monto $0 → el usuario completa montos
4. Guardar → estado `borrador`

### Flujo 3: Crear presupuesto desde tab Plantillas

1. Tab "Plantillas" → ícono 📋 "Duplicar como nuevo presupuesto"
2. Se cambia automáticamente al tab "Presupuestos" con el form abierto y rubros cargados
3. El usuario completa datos + montos
4. Guardar

### Flujo 4: Ciclo de vida del presupuesto

```
borrador → enviado → aceptado → (anexos) → vencido
                  ↘ rechazado → borrador (re-editar)
```

- Al pasar a `aceptado`: se congela una versión con snapshot de rubros + equivalencias CAC/USD
- En `aceptado`: se pueden agregar anexos (adición, deducción, modificación)
- Solo se puede editar/eliminar en `borrador`

### Flujo 5: Importar plantilla desde archivo

1. Tab "Plantillas" → "Importar archivo"
2. Subir .xlsx, .pdf, .png, .jpg
3. El backend procesa con xlsx/pdf-parse/tesseract.js (OCR)
4. Se crea una plantilla automáticamente (el usuario puede editarla después)

---

## Convenciones y decisiones de diseño

| Aspecto | Decisión |
|---|---|
| **Formato de moneda** | `Intl.NumberFormat` con `es-AR`, style `currency` |
| **Formato de fecha** | `toLocaleDateString('es-AR')` con día/mes/año |
| **Chips de estado** | Colores MUI: default (borrador), info (enviado), success (aceptado), error (rechazado), warning (vencido) |
| **Paginación** | Server-side para presupuestos (pueden ser muchos); client-side para plantillas (pocas por empresa) |
| **Textos en español** | Toda la UI usa español argentino (vos, etc.) |
| **Sin React Query** | Consistente con el resto del proyecto; se usa useState/useEffect manual |
| **Snackbar para feedback** | Mismo patrón que stockMateriales.js |

---

## Pendientes / Iteraciones futuras

### Iteración 2

- [ ] **Exportar PDF** desde el frontend (botón en tabla o detalle) → requiere endpoint backend
- [ ] **Drag & drop** para reordenar rubros (actualmente usa flechas arriba/abajo)
- [ ] **Navegación lateral** – agregar ítem en SideNav/config.js si se decide incluir en el menú principal

### Iteración 3

- [ ] **Portal del cliente** – vista pública para que el cliente vea/acepte el presupuesto sin login
- [ ] **Comparador de versiones** – vista diff entre dos versiones congeladas
- [ ] **Notificaciones** – alertas cuando un presupuesto cambia de estado

### Mejoras técnicas

- [ ] Migrar a `useFetch` hook para reducir boilerplate en los useEffect
- [ ] Extraer el editor de rubros a un componente reutilizable en `src/components/presupuestos/`
- [ ] Agregar validaciones de formulario más robustas (ej: al menos un rubro para enviar)
- [ ] Tests unitarios del service

---

## Referencia rápida de navegación

```
/presupuestosProfesionales          → Página principal
  Tab 0: Presupuestos               → CRUD + workflow de estados
  Tab 1: Plantillas de Rubros       → CRUD + importación de archivos
```

---

*Última actualización: Enero 2025*
