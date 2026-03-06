# Funnel de Conversión — Plan de Implementación

> **Última actualización**: Marzo 2026  
> **Documentos relacionados**: [FUNNEL-ACTIVACION-FUNCIONAL.md](FUNNEL-ACTIVACION-FUNCIONAL.md) · [FUNNEL-ACTIVACION-TECNICO.md](FUNNEL-ACTIVACION-TECNICO.md)  
> **Nota**: No confundir con Analytics de Onboarding (`/analyticsOnboarding`) que mide activación post-venta.

---

## Resumen Ejecutivo

Página nueva `/funnel` con 2 tabs (Conversión Producto y Pipeline Comercial), filtros compartidos, análisis de cohortes por rango libre, comparación de dos períodos, y filtro por segmento (default inbound).

Se implementa en **3 fases incrementales**. La Fase 1 entrega valor inmediato (el funnel funcional), la Fase 2 agrega comparación y la Fase 3 mejoras de UX.

| Fase | Nombre | Estimación | Dependencias |
|------|--------|-----------|-------------|
| **Fase 1** | Backend + Funnel Conversión Producto | ~10h | Ninguna |
| **Fase 2** | Pipeline Comercial + Comparación | ~8h | Fase 1 |
| **Fase 3** | Pulido UX + Drop-off + Filtro SDR | ~5h | Fase 2 |
| **Total** | | **~23h** | |

---

## Fase 1 — Backend + Funnel Conversión Producto

### Objetivo
Tener el endpoint de conversión producto funcionando y la página con el tab de conversión producto visible, un solo período, filtro de segmento.

### 1.1 Backend: Infraestructura de rutas ⬜

- [ ] Crear `backend/src/routes/funnelRoutes.js`
  - `GET /conversion-producto` → `funnelController.getFunnelConversionProducto`
  - `GET /pipeline-comercial` → `funnelController.getFunnelPipelineComercial` (stub 501 por ahora)
- [ ] Crear `backend/src/controller/funnel.controller.js`
  - Parseo de query params: `desde`, `hasta`, `segmento`, `sdrAsignado`
  - Validación: `desde` y `hasta` requeridos, formato ISO
- [ ] Montar ruta en `app.api.js`: `app.use('/api/funnel', funnelRoutes)`

**Archivos nuevos**: 2  
**Archivos modificados**: 1 (`app.api.js`)

### 1.2 Backend: Servicio de Funnel Conversión Producto ⬜

- [ ] Crear `backend/src/services/funnelService.js`
- [ ] Implementar `calcularFunnelConversionProducto(desde, hasta, segmento, sdrAsignado)`

**Paso 1 — Contactos creados (MongoDB)**
```
ContactoSDR.find({
  empresaId: 'sorby',
  createdAt: { $gte: desde, $lte: hasta },
  ...(segmento !== 'todos' && { segmento }),
  ...(sdrAsignado && { sdrAsignado }),
}).select('_id telefono empresaFirestoreId')
```

**Paso 2 — Empresa creada (filtro en memoria)**
```
contactos.filter(c => c.empresaFirestoreId != null)
```

**Paso 3 — Onboarding completado (Firestore)**
```
query colección 'event':
  where phone IN [teléfonos] (batches de 30)
  where event_name == 'fin'
→ Set de phones que completaron
```

**Paso 4 — Primer movimiento (Firestore)**
```
query colección 'movimientos':
  where empresa_id IN [empresaFirestoreIds] (batches de 30)
  limit(1) por empresa
→ Set de empresaFirestoreIds con movimiento
```

**Paso 5 — Vio su caja (Firestore, solo Constructoras)**
```
leer docs de empresa por ID (getAll en batches)
filtrar: tipo == 'Constructora' AND 'verSaldoCaja' NOT IN onboarding[]
```

- [ ] Helper `queryInBatches(collection, field, values)` para manejar límite de 30 del `in` de Firestore
- [ ] Helper `getEmpresaDocs(empresaIds)` para leer documentos de empresa en batch
- [ ] Tests unitarios con mocks de Firestore

**Archivos nuevos**: 1  
**Estimación**: 4-5h

### 1.3 Frontend: Página y Tab Conversión Producto ⬜

- [ ] Crear `app-web/src/pages/funnel.js` — Layout con tabs
- [ ] Crear `app-web/src/services/funnelService.js` — Axios client
  - `getConversionProducto({ desde, hasta, segmento, sdrAsignado })`
  - `getPipelineComercial({ desde, hasta, segmento, sdrAsignado })`
- [ ] Crear `app-web/src/components/funnel/FunnelFilters.js`
  - DatePicker de rango (Período A solamente en Fase 1)
  - RadioGroup de segmento: Inbound (default) / Outbound / Todos
- [ ] Crear `app-web/src/components/funnel/FunnelBarChart.js`
  - Barras horizontales con: nombre, barra proporcional, cantidad, % base, % vs anterior
  - Nota especial para paso 5 (Solo Constructoras)
- [ ] Crear `app-web/src/components/funnel/FunnelConversionProductoTab.js`
  - Integra FunnelFilters + FunnelBarChart
  - Maneja loading, error, empty state
- [ ] Agregar entrada en el menú lateral (layout)
  - Ícono 📊, label "Funnel", path `/funnel`

**Archivos nuevos**: 5  
**Archivos modificados**: 1-2 (layout/nav)  
**Estimación**: 4-5h

### Entregable Fase 1
Página `/funnel` con tab Conversión Producto funcional. Un rango de fechas, segmento inbound por default, barras horizontales con los 5 pasos y porcentajes. Tab Pipeline Comercial visible pero deshabilitado.

---

## Fase 2 — Pipeline Comercial + Comparación de Períodos

### Objetivo
Completar el tab de pipeline comercial y agregar la comparación de dos períodos en ambos tabs.

### 2.1 Backend: Pipeline Comercial ⬜

- [ ] Implementar `calcularFunnelPipelineComercial(desde, hasta, segmento, sdrAsignado)` en `funnelService.js`

**Algoritmo:**
1. Obtener contactos de la cohorte (misma query que activación paso 1)
2. Query `EventoHistorialSDR` para eventos tipo `cambio_estado` / `estado_cambiado` de esos contactoIds
3. Para cada contacto, construir set de estados por los que pasó:
   - Del historial: extraer `estadoNuevo` de metadata
   - Inferencia por jerarquía: si estado actual es `calificado` (orden 2), pasó por `nuevo` (0) y `contactado` (1)
4. Contar por paso del funnel
5. Contar estados terminales: `no_califica`, `perdido`, `no_responde`, `revisar_mas_adelante`, `no_contacto`

```javascript
const ESTADO_ORDEN = {
  'nuevo': 0, 'contactado': 1, 'calificado': 2, 'cierre': 3, 'ganado': 4
};
```

- [ ] Reemplazar stub 501 del controller con implementación real
- [ ] Tests: verificar que inferencia funciona y que estados terminales se cuentan aparte

**Estimación**: 3h

### 2.2 Frontend: Tab Pipeline Comercial ⬜

- [ ] Crear `app-web/src/components/funnel/FunnelPipelineComercialTab.js`
  - Reutiliza `FunnelBarChart` con los 5 estados
  - Sección adicional: chips de estados terminales con cantidad y %
- [ ] Crear `app-web/src/components/funnel/FunnelTerminalStates.js`
  - Chips con colores por estado (rojo para no_califica/perdido, gris para no_responde, naranja para revisar)

**Estimación**: 2h

### 2.3 Frontend: Comparación de Períodos ⬜

- [ ] Agregar segundo DatePicker (Período B, opcional) a `FunnelFilters.js`
- [ ] Crear `app-web/src/components/funnel/FunnelComparison.js`
  - Recibe `datosA` y `datosB`
  - Tabla lado a lado: Paso | Período A (cant + %) | Período B (cant + %) | Δ
  - Delta: pp (puntos porcentuales) para tasas, % para cantidades absolutas
  - Flechas ↑/↓ con color verde/rojo
- [ ] Modificar `FunnelConversionProductoTab` y `FunnelPipelineComercialTab`:
  - Si hay Período B → llamar endpoint dos veces en paralelo → renderizar `FunnelComparison`
  - Si no hay Período B → renderizar `FunnelBarChart` (como Fase 1)

**Estimación**: 3h

### Entregable Fase 2
Ambos tabs funcionales. Comparación de dos períodos con deltas. Estados terminales visibles en tab pipeline comercial.

---

## Fase 3 — Pulido UX + Drop-off + Filtro SDR

### Objetivo
Agregar las funcionalidades secundarias: tabla de drop-off, filtro "Solo mis contactos", y pulido general.

### 3.1 Drop-off entre pasos ⬜

- [ ] Crear `app-web/src/components/funnel/FunnelDropoff.js`
  - Tabla: Transición | Abandonaron | % drop-off
  - Se calcula en frontend a partir de los datos ya devueltos por el backend
  - Resaltado visual del mayor drop-off (rojo)
- [ ] Agregar debajo del chart en ambos tabs

**Estimación**: 1.5h

### 3.2 Filtro "Solo mis contactos" / por SDR ⬜

- [ ] Agregar RadioGroup a `FunnelFilters.js`: Global / Solo mis contactos
- [ ] "Solo mis contactos" envía `sdrAsignado` = UID del usuario logueado
- [ ] Si es admin: mostrar selector de SDR (dropdown con SDRs disponibles vía endpoint existente `GET /sdr/contactos/sdrs`)
- [ ] Si es SDR: solo mostrar toggle Global / Mis contactos

**Estimación**: 1.5h

### 3.3 Empty states y edge cases ⬜

- [ ] Período sin datos: ilustración + "No hay contactos creados en este período"
- [ ] Comparación con período B vacío: columna B muestra "—" y Δ muestra "—"
- [ ] Paso 5 sin Constructoras: nota "No hay constructoras en esta cohorte"
- [ ] Loading state: skeleton de barras
- [ ] Error state: retry button

**Estimación**: 1h

### 3.4 Navegación y menú ⬜

- [ ] Verificar que el link en menú lateral funciona en mobile y desktop
- [ ] Breadcrumb si aplica al layout existente
- [ ] Título de página dinámico en `<Head>`

**Estimación**: 0.5h

### Entregable Fase 3
Feature completo: funnel de activación y comercial con comparación, drop-off, filtro por segmento y SDR, empty states, mobile ready.

---

## Resumen de Archivos

### Archivos nuevos (10)

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `backend/src/routes/funnelRoutes.js` | 1 | 2 endpoints GET |
| `backend/src/controller/funnel.controller.js` | 1 | Parseo y validación |
| `backend/src/services/funnelService.js` | 1+2 | Lógica de negocio |
| `app-web/src/pages/funnel.js` | 1 | Página principal |
| `app-web/src/services/funnelService.js` | 1 | Axios client |
| `app-web/src/components/funnel/FunnelFilters.js` | 1 | Filtros compartidos |
| `app-web/src/components/funnel/FunnelBarChart.js` | 1 | Barras horizontales |
| `app-web/src/components/funnel/FunnelConversionProductoTab.js` | 1 | Tab conversión producto |
| `app-web/src/components/funnel/FunnelPipelineComercialTab.js` | 2 | Tab pipeline comercial |
| `app-web/src/components/funnel/FunnelComparison.js` | 2 | Vista comparativa |
| `app-web/src/components/funnel/FunnelDropoff.js` | 3 | Tabla drop-off |
| `app-web/src/components/funnel/FunnelTerminalStates.js` | 2 | Chips estados terminales |

### Archivos modificados (2-3)

| Archivo | Fase | Cambio |
|---------|------|--------|
| `backend/app.api.js` | 1 | Montar ruta `/api/funnel` |
| Layout/Nav del dashboard | 1 | Agregar link a `/funnel` |

### Archivos NO tocados

No se modifican modelos existentes. No se agregan campos a `ContactoSDR`, `EventoHistorialSDR`, ni colecciones de Firestore. Todo se calcula en tiempo real a partir de datos existentes.

---

## Dependencias Técnicas

| Dependencia | Estado | Notas |
|------------|--------|-------|
| `ContactoSDR.empresaFirestoreId` | ✅ Existe | Debe estar seteado para que el contacto avance del paso 1 |
| Colección Firestore `event` | ✅ Existe | Eventos con `event_name: 'fin'` y `phone` |
| Colección Firestore `movimientos` | ✅ Existe | Campo `empresa_id` coincide con `empresaFirestoreId` |
| Campo `onboarding` en empresa Firestore | ✅ Existe | Array de pasos pendientes, se busca `verSaldoCaja` |
| Campo `tipo` en empresa Firestore | ✅ Existe | Para filtrar solo Constructoras en paso 5 |
| Índice `{ empresaId: 1, createdAt: -1 }` en ContactoSDR | ✅ Existe | Para query de cohorte |
| Índice `{ contactoId, createdAt }` en EventoHistorialSDR | ✅ Existe | Para query de transiciones |
| Firebase Admin SDK en backend | ✅ Configurado | Ya se usa en otros servicios |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| `empresaFirestoreId` no se setea en todos los flujos | Media | Paso 2 subreporta | Auditar `vincularEmpresaConContactoSDR` y flujos de onboarding. Agregar log cuando se crea empresa sin vincular |
| Teléfonos en formato distinto entre ContactoSDR y evento Firestore | Media | Paso 3 pierde matches | Normalizar teléfonos en el helper (strip `+`, asegurar `549...`) |
| Colección `movimientos` crece mucho → query lenta | Baja (< 300/mes) | Paso 4 lento | Ya se usa `limit(1)`. Si crece, denormalizar en ContactoSDR |
| Empresa Firestore sin campo `tipo` (datos legacy) | Baja | Paso 5 no las cuenta | Default a excluir del paso 5 si no tiene tipo |

---

## Orden de Ejecución Sugerido

```
Día 1 (5h)
├── 1.1 Rutas + controller (backend)          ~1h
├── 1.2 Servicio funnel conversión producto (backend)   ~4h
│   ├── Helper queryInBatches
│   ├── Paso 1-2 (MongoDB + filtro)
│   ├── Paso 3 (Firestore events)
│   ├── Paso 4 (Firestore movimientos)
│   └── Paso 5 (Firestore empresa docs)

Día 2 (5h)
├── 1.3 Página frontend + FunnelBarChart       ~3h
├── 1.3 FunnelFilters + integración            ~2h
└── ✅ Fase 1 entregable

Día 3 (5h)
├── 2.1 Pipeline comercial backend               ~3h
├── 2.2 Tab pipeline comercial frontend           ~2h

Día 4 (5h)
├── 2.3 Comparación de períodos frontend       ~3h
├── 3.1 Drop-off                               ~1.5h
└── 3.2 Filtro SDR                             ~0.5h

Día 5 (3h)
├── 3.2 Filtro SDR (completar)                 ~1h
├── 3.3 Empty states y edge cases              ~1h
├── 3.4 Navegación y menú                      ~0.5h
└── Testing final                              ~0.5h
└── ✅ Feature completo
```

**Total: ~23h distribuidas en 5 días de trabajo.**
