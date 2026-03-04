# Presupuestos Profesionales – Frontend

> Documentación del módulo frontend para la gestión de Presupuestos Profesionales en SorbyData.

---

## Índice

1. [Resumen](#resumen)
2. [Archivos y estructura](#archivos-y-estructura)
3. [Arquitectura y patrones](#arquitectura-y-patrones)
4. [Estructura de la página](#estructura-de-la-página)
5. [Moneda y ajuste monetario](#moneda-y-ajuste-monetario)
6. [Plantilla SorbyData](#plantilla-sorbydata)
7. [Export a PDF](#export-a-pdf)
8. [Service – endpoints consumidos](#service--endpoints-consumidos)
9. [Modelos de datos (referencia)](#modelos-de-datos-referencia)
10. [Componentes y diálogos](#componentes-y-diálogos)
11. [Hooks](#hooks)
12. [Flujos de usuario](#flujos-de-usuario)
13. [Convenciones y decisiones de diseño](#convenciones-y-decisiones-de-diseño)
14. [Pendientes / Iteraciones futuras](#pendientes--iteraciones-futuras)

---

## Resumen

El módulo de **Presupuestos Profesionales** permite a constructoras crear, gestionar y seguir presupuestos de obra con rubros/tareas, manejo de estados (workflow), versionado con equivalencias CAC/USD, y modificaciones post-aceptación vía anexos.

**URL de la página:** `/presupuestosProfesionales`

**Funcionalidades principales:**
- CRUD de presupuestos y plantillas de rubros
- Moneda ARS/USD con opciones de ajuste (Pesos fijos, CAC, dólar)
- Base de cálculo contra facturas (`total` o `subtotal`)
- Plantilla predefinida SorbyData (9 rubros estándar)
- Export a PDF con detalle de ajuste monetario
- Importación de plantillas desde archivo (Excel/PDF/imagen)
- Carga de logo en el form de presupuesto (se envía junto al alta)

---

## Archivos y estructura

### Página y hooks

| Archivo | Descripción |
|---|---|
| `src/pages/presupuestosProfesionales.js` | Página principal con tabs, estado y orquestación |
| `src/hooks/presupuestosProfesionales/usePresupuestosList.js` | Hook para listar presupuestos con filtros y paginación |
| `src/hooks/presupuestosProfesionales/usePlantillasList.js` | Hook para listar plantillas de la empresa |
| `src/hooks/presupuestosProfesionales/usePlantillaImport.js` | Hook para importar plantilla desde archivo |

### Componentes

| Archivo | Descripción |
|---|---|
| `src/components/presupuestosProfesionales/PresupuestoFormDialog.js` | Form crear/editar presupuesto (rubros, moneda, notas, superficies) |
| `src/components/presupuestosProfesionales/PresupuestoDeleteDialog.js` | Confirmación de eliminación |
| `src/components/presupuestosProfesionales/CambiarEstadoDialog.js` | Cambio de estado con transiciones válidas |
| `src/components/presupuestosProfesionales/PresupuestoDetalleDialog.js` | Detalle con sub-tabs (rubros, versiones, historial, anexos) |
| `src/components/presupuestosProfesionales/AgregarAnexoDialog.js` | Form para agregar anexo (solo aceptado) |
| `src/components/presupuestosProfesionales/PlantillaFormDialog.js` | Form crear/editar plantilla |
| `src/components/presupuestosProfesionales/PlantillaDeleteDialog.js` | Confirmación de eliminación de plantilla |
| `src/components/presupuestosProfesionales/ImportarPlantillaDialog.js` | Upload de archivo para crear plantilla |
| `src/components/presupuestosProfesionales/PresupuestosFilters.js` | Filtros (título, estado, moneda) |
| `src/components/presupuestosProfesionales/PresupuestosTableRow.js` | Fila expandible de presupuesto con acciones |
| `src/components/presupuestosProfesionales/PlantillasTable.js` | Tabla de plantillas (incluye fila Plantilla SorbyData) |

### Utilidades y constantes

| Archivo | Descripción |
|---|---|
| `src/components/presupuestosProfesionales/constants.js` | ESTADOS, MONEDAS, TEXTO_NOTAS_DEFAULT, PLANTILLA_SORBYDATA, etc. |
| `src/components/presupuestosProfesionales/monedaAjusteConfig.js` | INDEXACION_VALUES, CAC_TIPOS, USD_FUENTES, toMesAnterior, normalizarAjusteMoneda |
| `src/components/presupuestosProfesionales/incidenciaHelpers.js` | plantillaRubrosToPresupuestoRubros, distribuirMontosPorIncidencia |
| `src/utils/presupuestos/exportPresupuestoToPdfRenderer.js` | Export PDF con @react-pdf/renderer (principal) |
| `src/utils/presupuestos/exportPresupuestoToPdf.js` | Export PDF con jspdf (alternativo) |
| `src/utils/presupuestos/PdfPresupuestoDocument.js` | Componente React para render del PDF |

### Service

| Archivo | Descripción |
|---|---|
| `src/services/presupuestoProfesional/presupuestoProfesionalService.js` | CRUD presupuestos y plantillas |

---

## Arquitectura y patrones

```
Page (presupuestosProfesionales.js)
  ├─ Layout: DashboardLayout (withAuthGuard)
  ├─ Hooks: usePresupuestosList, usePlantillasList, usePlantillaImport
  ├─ Service: presupuestoProfesionalService.js (axiosConfig)
  ├─ Auth: useAuthContext() → getEmpresaDetailsFromUser(user)
  └─ Componentes: PresupuestosFilters, PresupuestosTableRow, PlantillasTable, diálogos
```

### Decisiones clave

| Decisión | Justificación |
|---|---|
| Hooks extraídos | usePresupuestosList, usePlantillasList, usePlantillaImport reducen complejidad de la página |
| Componentes de tabla separados | PresupuestosTableRow (fila expandible), PlantillasTable (tabla completa) |
| useState + useEffect | Patrón del proyecto; sin React Query |
| Import dinámico para PDF | `import('../utils/presupuestos/exportPresupuestoToPdfRenderer')` para code-splitting |

---

## Estructura de la página

### Tab 0: Presupuestos

- **Filtros:** título, estado, moneda (PresupuestosFilters)
- **Tabla:** PresupuestosTableRow con expansión de rubros
- **Acciones por fila:**
  - 👁️ Ver detalle
  - 📄 Exportar PDF
  - ✏️ Editar (solo borrador)
  - 🔀 Cambiar estado
  - 📎 Agregar anexo (solo aceptado)
  - 🗑️ Eliminar (solo borrador)
- **Paginación:** server-side (page, limit)

### Tab 1: Plantillas de Rubros

- **Fila fija:** Plantilla SorbyData (chip "Sistema", solo Duplicar)
- **Tabla:** plantillas propias con Editar, Duplicar, Eliminar
- **Botones:** Importar archivo, Nueva plantilla

---

## Moneda y ajuste monetario

### Opciones por moneda

| Moneda | Modos |
|---|---|
| **ARS** | Pesos fijos, Ajustar por CAC, Ajustar por dólar |
| **USD** | Siempre ajuste por dólar (configurable) |

### Si Ajustar por CAC

- **Tipo:** Promedio, Mano de Obra, Materiales
- **Cotización:** Se obtiene el índice CAC del **mes anterior** (el índice se publica con retraso)

### Si Ajustar por dólar (ARS o USD)

- **Fuente:** USD Oficial, USD Blue
- **Referencia:** Compra, Venta, Promedio

### Persistencia

Al guardar se congela la cotización en `cotizacion_snapshot`:

```js
{
  tipo: 'CAC' | 'USD',
  fuente: 'cac' | 'oficial' | 'blue',
  referencia: 'general' | 'mano_obra' | 'materiales' | 'compra' | 'venta' | 'promedio',
  valor: number,
  fecha_origen: string  // ej: "2026-02" (CAC) o "2026-03-04" (USD)
}
```

**Archivos clave:** `monedaAjusteConfig.js`, `PresupuestoFormDialog.js` (MonedaAjusteBlock)

### Base de cálculo contra facturas

El form permite definir cómo comparar contra facturas:

- `total`: suma con impuestos
- `subtotal`: suma neta sin impuestos

Se persiste en el campo `base_calculo` (default: `total`).

---

## Plantilla SorbyData

Plantilla predefinida del sistema (no se guarda en backend). ID especial: `sorbydata`.

**Rubros incluidos (9):**
1. Demolición
2. Albañilería General
3. Instalación Sanitaria
4. Instalación Eléctrica
5. Colocaciones de Placas de Porcelanato y/o Marmetas
6. Pintura
7. Instalación de Toma Corrientes, Llaves de Enc. y Artef. de Iluminación
8. Colocación de Artefactos Sanitarios, Griferías y Accesorios
9. Varios

**Uso:**
- Selector "Cargar rubros desde plantilla" en el form de presupuesto (siempre visible)
- Fila en tabla de plantillas con acción "Duplicar como nuevo presupuesto"
- Si la plantilla tiene notas vacías, se usa `TEXTO_NOTAS_DEFAULT`

**Constantes:** `PLANTILLA_SORBYDATA_ID`, `PLANTILLA_SORBYDATA` en `constants.js`

---

## Export a PDF

### Flujo principal

1. Usuario hace clic en "Exportar PDF" (fila o detalle)
2. Se obtiene el presupuesto completo vía `obtenerPorId`
3. Import dinámico de `exportPresupuestoToPdfRenderer`
4. Se calcula `costoM2Data` (ARS, USD, CAC) usando `cotizacion_snapshot` o APIs (MonedasService, cacService)
5. Se genera PDF con `@react-pdf/renderer` y se descarga

### Contenido del PDF

- Encabezado (empresa, fecha)
- Tabla de rubros y tareas
- TOTAL PRESUPUESTO
- **Total en USD/CAC** (si aplica): valor + (Fuente, Referencia, Fecha) entre paréntesis, con fondo azul
- Con anexos: RESUMEN CONTRACTUAL + Total actualizado + Total en USD/CAC
- Costo por m² (ARS, USD, CAC)
- Notas / Análisis de superficies

### Archivos

- `exportPresupuestoToPdfRenderer.js` – flujo principal
- `PdfPresupuestoDocument.js` – componente React del documento
- `exportPresupuestoToPdf.js` – alternativa con jspdf

---

## Service – endpoints consumidos

Base URL: `/presupuestos-profesionales`

### Presupuestos

| Método | Endpoint |
|---|---|
| `crear(data, logoFile?)` | POST / |
| `listar(filters)` | GET / |
| `obtenerPorId(id)` | GET /:id |
| `actualizar(id, data)` | PUT /:id |
#### Crear presupuesto con logo (mismo endpoint)

El alta soporta dos variantes:

- JSON normal (sin logo)
- `multipart/form-data` con:
  - `payload`: JSON string con el presupuesto
  - `logo`: archivo imagen (`image/*`)

El backend sube la imagen a Firebase Storage y guarda la URL en `empresa_logo_url`.

| `eliminar(id)` | DELETE /:id |
| `cambiarEstado(id, estado, meta)` | PUT /:id/estado |
| `agregarAnexo(id, data)` | POST /:id/anexo |

### Plantillas

| Método | Endpoint |
|---|---|
| `crearPlantilla(data)` | POST /plantillas |
| `listarPlantillas(empresaId, soloActivas)` | GET /plantillas/:empresaId |
| `obtenerPlantilla(id)` | GET /plantillas/detalle/:id |
| `actualizarPlantilla(id, data)` | PUT /plantillas/:id |
| `eliminarPlantilla(id)` | DELETE /plantillas/:id |
| `uploadPlantilla(file, empresaId)` | POST /plantillas/upload |

---

## Modelos de datos (referencia)

### Presupuesto Profesional (campos principales)

```
empresa_id, proyecto_id, proyecto_nombre,
titulo, obra_direccion, fecha, fecha_presupuesto,
moneda (ARS|USD), total_neto,
indexacion (CAC|USD|null), cac_tipo, usd_fuente, usd_valor,
base_calculo (total|subtotal),
cotizacion_snapshot { tipo, fuente, referencia, valor, fecha_origen },
empresa_logo_url,
rubros[{ nombre, orden, monto, incidencia_pct, tareas[] }],
notas_texto, analisis_superficies,
estado, historial_estados[], version_actual, versiones[], anexos[]
```

### Plantilla de Rubros

```
empresa_id, nombre, tipo, activa, notas,
rubros[{ nombre, incidencia_pct_sugerida, tareas[{ descripcion }] }],
archivo_origen { url, tipo_archivo, nombre_original }
```

---

## Componentes y diálogos

| Componente | Propósito |
|---|---|
| PresupuestoFormDialog | Crear/editar presupuesto (rubros, moneda, ajuste, notas, superficies) |
| PresupuestoDeleteDialog | Confirmación eliminar |
| CambiarEstadoDialog | Cambio de estado |
| PresupuestoDetalleDialog | Detalle (rubros, versiones, historial, anexos) + export PDF |
| AgregarAnexoDialog | Agregar anexo |
| PlantillaFormDialog | Crear/editar plantilla |
| PlantillaDeleteDialog | Confirmación eliminar plantilla |
| ImportarPlantillaDialog | Upload archivo → plantilla |
| PresupuestosFilters | Filtros de tabla |
| PresupuestosTableRow | Fila expandible con acciones |
| PlantillasTable | Tabla completa (SorbyData + plantillas propias) |

---

## Hooks

| Hook | Parámetros | Retorno |
|---|---|---|
| usePresupuestosList | empresaId, currentTab, ppPage, ppRowsPerPage, filtros, showAlert | presupuestos, presupuestosLoading, totalPresupuestos, refreshPresupuestos |
| usePlantillasList | empresaId, currentTab, showAlert | plantillas, plantillasLoading, refreshPlantillas |
| usePlantillaImport | empresaId, showAlert, onSuccess, onClose | open, loading, handleFile, resetImportDialog |

---

## Flujos de usuario

### Crear presupuesto desde cero

1. Tab Presupuestos → Nuevo presupuesto
2. Completar título, moneda, dirección
3. Agregar rubros manualmente (o cargar desde Plantilla SorbyData / plantilla propia)
4. Editar notas (TEXTO_NOTAS_DEFAULT si no hay plantilla)
5. Guardar → borrador

### Crear presupuesto desde Plantilla SorbyData

1. Tab Presupuestos → Nuevo presupuesto
2. Combo "Cargar rubros desde plantilla" → Plantilla SorbyData
3. Rubros pre-cargados con monto 0; completar montos
4. Notas = TEXTO_NOTAS_DEFAULT (plantilla sin notas)
5. Guardar

### Crear presupuesto desde tab Plantillas

1. Tab Plantillas → Duplicar (Plantilla SorbyData o plantilla propia)
2. Cambia a tab Presupuestos con form abierto
3. Completar datos + montos
4. Guardar

### Export a PDF

1. Desde fila: ícono exportar
2. Desde detalle: botón Exportar PDF
3. Presupuesto completo → PDF con rubros, total actualizado, Total en USD/CAC (si aplica)

### Ciclo de vida

```
borrador → enviado → aceptado → (anexos) → vencido
                  ↘ rechazado → borrador
```

---

## Convenciones y decisiones de diseño

| Aspecto | Decisión |
|---|---|
| Formato moneda | `Intl.NumberFormat` es-AR, style currency |
| Formato fecha | `toLocaleDateString('es-AR')` |
| Chips estado | default, info, success, error, warning |
| CAC | Siempre mes anterior (toMesAnterior) |
| Plantillas vacías | notas = TEXTO_NOTAS_DEFAULT |
| Textos | Español argentino (vos) |

---

## Pendientes / Iteraciones futuras

### Iteración 2

- [ ] **Drag & drop** para reordenar rubros (actualmente flechas arriba/abajo)
- [ ] **Navegación lateral** – ítem en SideNav si se incluye en menú principal

### Iteración 3

- [ ] **Portal del cliente** – vista pública para ver/aceptar presupuesto
- [ ] **Comparador de versiones** – diff entre versiones congeladas
- [ ] **Notificaciones** – alertas al cambiar estado

### Mejoras técnicas

- [ ] Migrar a useFetch para reducir boilerplate
- [ ] Extraer editor de rubros a componente reutilizable
- [ ] Validaciones más robustas (ej: al menos un rubro)
- [ ] Tests unitarios del service

---

## Referencia rápida

```
/presupuestosProfesionales
  Tab 0: Presupuestos     → CRUD, workflow, export PDF
  Tab 1: Plantillas      → Plantilla SorbyData + plantillas propias + import
```

---

*Última actualización: Marzo 2025*
