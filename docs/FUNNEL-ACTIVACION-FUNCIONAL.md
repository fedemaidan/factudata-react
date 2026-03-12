# Funnel de Conversión — Documento Funcional

> **Fecha**: Marzo 2026  
> **Estado**: Diseño  
> **Página**: `/funnel` (nueva)  
> **Nota**: No confundir con **Analytics de Onboarding** (`/analyticsOnboarding`) que mide la activación post-venta de clientes que ya pagan. Este funnel mide el camino previo: desde que un contacto SDR ingresa hasta que llega a usar el producto.

---

## 1. Objetivo

Medir la conversión de contactos SDR a lo largo de dos ejes:

- **Conversión Producto**: ¿Cuántos contactos llegaron a usar el producto?
- **Pipeline Comercial**: ¿Cuántos avanzaron en el ciclo de venta?

Ambos funcionan con **análisis de cohortes** (agrupando contactos por su fecha de creación) y permiten **comparar dos períodos** lado a lado.

---

## 2. Estructura de la Página

### Layout general

```
┌─────────────────────────────────────────────────────────────┐
│  FILTROS GLOBALES (compartidos entre tabs)                   │
│  [Período A: ___/___  a  ___/___]  [Período B: ___/___  a  ___/___] │
│  [Segmento: ● Inbound ○ Outbound ○ Todos]                  │
│  [Vista: ● Global ○ Solo mis contactos]                     │
│                                                             │
│  ┌────────────────────────┐ ┌────────────────────────┐      │
│  │ 📊 Conversión Producto  │ │ 🤝 Pipeline Comercial  │ Tabs│
│  └────────────────────────┘ └────────────────────────┘      │
│                                                             │
│  [Contenido del tab activo]                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Filtros globales (compartidos entre tabs)

| Filtro | Tipo | Default | Notas |
|--------|------|---------|-------|
| **Período A** | Rango de fechas (desde–hasta) | Último mes | Obligatorio |
| **Período B** | Rango de fechas (desde–hasta) | Vacío | Opcional. Si se llena, se activa la comparación |
| **Segmento** | Radio: `Inbound` / `Outbound` / `Todos` | `Inbound` | Filtra por `segmento` del ContactoSDR |
| **Vista** | Radio: `Global` / `Solo mis contactos` | `Global` | Para SDRs que quieran ver solo sus asignados |

La **cohorte** se define por el `createdAt` del ContactoSDR dentro del rango de fechas seleccionado. Es decir: "contactos creados entre fecha A y fecha B".

---

## 3. Tab: Conversión Producto

### 3.1 Definición de pasos

El funnel es **secuencial**: cada paso es un subconjunto del anterior.

| # | Paso | Definición técnica | Pregunta que responde |
|---|------|-------------------|----------------------|
| 1 | **Contacto creado** | ContactoSDR con `createdAt` dentro del rango | ¿Cuántos leads ingresaron? |
| 2 | **Empresa creada** | Tiene `empresaFirestoreId` != null | ¿Cuántos llegaron a que el bot les cree una empresa? |
| 3 | **Onboarding completado** | Existe evento con `event_name` = `"fin"` en Firestore, matcheando por teléfono | ¿Cuántos terminaron el tutorial del asistente? |
| 4 | **Primer movimiento** | La empresa (por `empresaFirestoreId`) tiene al menos 1 documento en la colección `movimientos` de Firestore | ¿Cuántos cargaron al menos un gasto/ingreso? |
| 5 | **Vio su caja** ⚠️ | La empresa **no** tiene `verSaldoCaja` en su array `onboarding` de Firestore | ¿Cuántos completaron el paso de ver saldo? |

> ⚠️ **Paso 5 — Solo Constructoras**: Este paso aplica únicamente a empresas de tipo Constructora (que son las que tienen `verSaldoCaja` en su onboarding inicial). La base del % cambia: se calcula sobre los contactos del paso 4 **que sean Constructoras**, no sobre el total. Se muestra un indicador visual: _"Solo Constructoras (N de M)"_.

### 3.2 Visualización — Sin comparación

Cuando solo hay Período A:

```
CONVERSIÓN PRODUCTO — Feb 2026

Contactos creados          ████████████████████████  247  (100%)
Empresa creada             ██████████████████        183  (74.1%)
Onboarding completado      ███████████████           152  (61.5%)
Primer movimiento          █████████                  89  (36.0%)
Vio su caja ᶜ              ██████                     54  (21.9%)

ᶜ Solo Constructoras: 54 de 61 que generaron movimiento
```

Cada barra muestra:
- **Nombre del paso**
- **Barra horizontal** proporcional al paso 1
- **Cantidad absoluta**
- **% sobre el paso 1** (la cohorte completa)
- **% de conversión vs. paso anterior** (mostrado entre barras como "↓ 74.1%")

### 3.3 Visualización — Con comparación

Cuando se llenan ambos períodos:

```
                           Período A (Feb)    Período B (Ene)    Δ
Contactos creados          247  (100%)        198  (100%)        +24.7%
Empresa creada             183  (74.1%)       136  (68.7%)       +5.4pp ↑
Onboarding completado      152  (61.5%)       109  (55.1%)       +6.5pp ↑
Primer movimiento           89  (36.0%)        58  (29.3%)       +6.7pp ↑
Vio su caja ᶜ               54  (21.9%)        31  (15.7%)       +6.2pp ↑
```

La columna **Δ** muestra:
- Para cantidades absolutas: variación % (ej: +24.7%)
- Para tasas de conversión: diferencia en **puntos porcentuales** (pp) con flecha ↑/↓ y color verde/rojo

### 3.4 Drop-off entre pasos

Debajo del funnel principal, una sección muestra el **drop-off** entre cada par de pasos consecutivos:

| Transición | Abandonaron | % drop-off |
|-----------|-------------|-----------|
| Creado → Empresa | 64 | 25.9% |
| Empresa → Onboarding | 31 | 16.9% |
| Onboarding → Movimiento | 63 | 41.4% |
| Movimiento → Vio caja ᶜ | 7 | 11.5% |

Esto identifica rápidamente **dónde se pierden más contactos**.

---

## 4. Tab: Pipeline Comercial

### 4.1 Definición de pasos

Basado en los estados del ContactoSDR. También secuencial: se cuenta cuántos contactos de la cohorte alcanzaron **al menos** ese estado en algún momento.

| # | Estado | Significado |
|---|--------|------------|
| 1 | **Nuevo** | Contacto creado (= base de la cohorte) |
| 2 | **Contactado** | Se logró contacto efectivo bidireccional |
| 3 | **Calificado** | Interés y datos confirmados |
| 4 | **Cierre** | Negociación activa / propuesta enviada |
| 5 | **Ganado** | Conversión exitosa |

Los estados negativos (`no_contacto`, `no_responde`, `no_califica`, `perdido`, `revisar_mas_adelante`) **no forman parte del funnel** pero se muestran como métricas complementarias debajo:

```
Contactos en estados terminales:
  No califica: 23 (9.3%)   |   Perdido: 8 (3.2%)   |   No responde: 31 (12.6%)
  Revisar más adelante: 12 (4.9%)   |   No contacto: 15 (6.1%)
```

### 4.2 Cómo se determina si "pasó por" un estado

Dado que un contacto hoy puede estar en `calificado` pero antes estuvo en `contactado` y `nuevo`, se usa el **historial de eventos** (`EventoHistorialSDR`) filtrando por tipo `cambio_estado` o `estado_cambiado`. Si un contacto tiene un evento de cambio a `contactado`, cuenta para ese paso aunque hoy esté en `calificado`.

**Fallback**: Si no hay historial de transiciones (contactos viejos), se infiere del estado actual: si está en `calificado`, se asume que pasó por `nuevo` y `contactado`.

### 4.3 Visualización

Igual que Conversión Producto: barras horizontales con cantidad, % sobre base, % vs. paso anterior, y comparación opcional.

---

## 5. Permisos

| Rol | Qué ve | Filtro "Solo mis contactos" |
|-----|--------|---------------------------|
| **Admin** | Funnel global de todos los contactos | Puede filtrar por SDR específico |
| **SDR** | Funnel global por defecto | Puede activar "Solo mis contactos" para ver su rendimiento |

---

## 6. Navegación

- Acceso desde el menú lateral: ícono de 📊 con label "Funnel"
- URL: `/funnel`
- No reemplaza ninguna vista existente; es complementaria a `/gestionSDR` (que tiene métricas operativas diarias)

---

## 7. Casos de borde

| Caso | Comportamiento |
|------|---------------|
| Contacto sin `empresaFirestoreId` | Se cuenta en paso 1, no avanza a paso 2+ |
| Contacto outbound (importado de Excel) que nunca pasó por el bot | Se cuenta en paso 1. Si alguien le creó empresa manualmente, avanza. Sino queda en paso 1 |
| Período sin datos | Mostrar "No hay contactos en este período" con sugerencia de ampliar rango |
| Comparación con período vacío | Mostrar solo Período A, Período B muestra "—" |
| Paso 5 sin Constructoras | Mostrar "No hay constructoras en esta cohorte" |
| SDR ve "Solo mis contactos" con 0 contactos | Mensaje: "No tenés contactos asignados en este período" |

---

## 8. Métricas derivadas (futuro)

Métricas que se pueden agregar fácilmente una vez que el funnel base funcione:

- **Tiempo medio entre pasos**: ¿Cuántos días tarda un contacto en pasar de "Empresa creada" a "Primer movimiento"?
- **Tasa de conversión por SDR**: Comparar funnels entre SDRs
- **Funnel por origen**: `manual` vs `excel` vs `notion` vs `bot`
- **Tendencia mensual**: Gráfico de línea mostrando la tasa de conversión de cada paso mes a mes
