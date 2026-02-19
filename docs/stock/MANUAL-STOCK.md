# 📦 Manual de Gestión de Stock

> Guía completa para administrar el inventario de materiales, crear tickets de ingreso/egreso, y controlar el stock por proyecto.

---

## Índice

1. [Conceptos Clave](#1-conceptos-clave)
   - [¿Cómo varía el stock?](#11-cómo-varía-el-stock)
2. [Stock de Materiales](#2-stock-de-materiales)
   - [Vista General](#21-vista-general)
   - [Panel Resumen](#22-panel-resumen)
   - [Tabs: General, Sin Asignar y Proyectos](#23-tabs-general-sin-asignar-y-proyectos)
   - [Filtros y Búsqueda](#24-filtros-y-búsqueda)
   - [Detalle de Material (Drawer)](#25-detalle-de-material-drawer)
   - [Crear Material](#26-crear-material)
   - [Acciones Masivas](#27-acciones-masivas)
   - [Exportar e Importar](#28-exportar-e-importar)
3. [Tickets (Solicitudes)](#3-tickets-solicitudes)
   - [Vista General de Tickets](#31-vista-general-de-tickets)
   - [Tipos de Ticket](#32-tipos-de-ticket)
   - [Estados de un Ticket](#33-estados-de-un-ticket)
   - [Crear Ticket Manualmente](#34-crear-ticket-manualmente)
   - [Cargar con IA](#35-cargar-con-ia)
   - [Confirmar Ingreso](#36-confirmar-ingreso)
   - [Entrega Parcial](#37-entrega-parcial)
   - [Ajuste de Stock](#38-ajuste-de-stock)
   - [Editar y Eliminar Tickets](#39-editar-y-eliminar-tickets)
   - [Exportar Tickets](#310-exportar-tickets)
4. [Flujos Comunes](#4-flujos-comunes)
5. [Stock desde WhatsApp](#5-stock-desde-whatsapp)
   - [Retirar Materiales (Egreso por Remito)](#51-retirar-materiales-egreso-por-remito)
   - [Ingresar Materiales (Ingreso por Documento)](#52-ingresar-materiales-ingreso-por-documento)
   - [Consultar Stock](#53-consultar-stock)
   - [Conciliación Automática en WhatsApp](#54-conciliación-automática-en-whatsapp)
   - [Diferencias entre Web y WhatsApp](#55-diferencias-entre-web-y-whatsapp)
   - [Crear Ticket por Texto](#56-crear-ticket-por-texto-sin-foto)
6. [Preguntas Frecuentes](#6-preguntas-frecuentes)

---

## 1. Conceptos Clave

| Concepto | Descripción |
|---|---|
| **Material** | Un ítem de inventario (ej: "Cemento Portland x 50kg"). Tiene nombre, categoría, SKU, precio y alias. |
| **Ticket (Solicitud)** | Un registro que agrupa uno o más movimientos de stock. Puede ser de tipo INGRESO, EGRESO, TRANSFERENCIA o AJUSTE. |
| **Movimiento** | Cada línea dentro de un ticket. Representa el ingreso o egreso de un material específico con una cantidad determinada. |
| **Proyecto** | Obra o proyecto al que se asigna el stock. Un material puede tener stock distribuido en varios proyectos. |
| **Categoría** | Clasificación del material (ej: "Construcción en seco", "Herramientas"). Se configura a nivel empresa. |
| **Alias** | Nombres alternativos de un material. Sirven para que la conciliación automática (IA) reconozca el mismo material con distintos nombres en facturas/remitos. |

### 1.1 ¿Cómo varía el stock?

El stock de un material **nunca se edita directamente**. Siempre cambia a través de **tickets** (solicitudes). Cada tipo de ticket afecta el stock de forma distinta:

| Tipo de Ticket | Efecto en el stock | Momento en que se aplica | Ejemplo |
|---|---|---|---|
| **INGRESO** | ➕ Suma unidades | Cuando se confirma la entrega (pasa a ENTREGADO) | Comprás 50 bolsas de cemento → quedan pendientes hasta que confirmás que llegaron |
| **EGRESO** | ➖ Resta unidades | Inmediatamente al crear el ticket | Retirás 10 caños para la obra → el stock baja al instante |
| **TRANSFERENCIA** | ➖ Resta en proyecto origen / ➕ Suma en proyecto destino | Inmediatamente al crear el ticket | Movés 20 ladrillos de "Depósito" a "Obra Norte" |
| **AJUSTE** | ➕ o ➖ según diferencia | Inmediatamente al crear el ticket | Contás 45 bolsas de cemento pero el sistema dice 50 → se genera un ajuste de -5 |

**Fórmula del stock actual de un material:**

```
Stock = Σ INGRESOS entregados + Σ AJUSTES − Σ EGRESOS − Σ TRANSFERENCIAS salientes + Σ TRANSFERENCIAS entrantes
```

**Diagrama de flujo de estados y stock:**

```
📦 INGRESO (compra)
   │
   ├─ Se crea ──────── Estado: PENDIENTE ──── Stock: sin cambios
   ├─ Entrega parcial ─ Estado: PARCIAL ───── Stock: +cantidad recibida
   └─ Entrega total ─── Estado: ENTREGADO ─── Stock: +cantidad total

📤 EGRESO (retiro)
   └─ Se crea ──────── Estado: ENTREGADO ──── Stock: −cantidad (inmediato)

🔄 TRANSFERENCIA
   └─ Se crea ──────── Estado: ENTREGADO ──── Stock: −origen / +destino (inmediato)

🎚 AJUSTE
   └─ Se crea ──────── Estado: ENTREGADO ──── Stock: ±diferencia (inmediato)
```

> ⚠️ **Importante:** Los ingresos en estado PENDIENTE **no cuentan como stock disponible**. El stock solo se incrementa cuando se confirma la entrega. Sin embargo, en la vista de materiales se muestra un indicador de "Pendientes de recibir" para que sepas cuánto esperás.

> 💡 **Tip:** Si necesitás corregir un error, no edites el ticket original. Creá un ticket de **AJUSTE** para compensar la diferencia. Así mantenés la trazabilidad completa.

---

## 2. Stock de Materiales

### 2.1 Vista General

La página **Stock de materiales** es el centro de control de tu inventario. Desde acá podés:

- Ver todo tu inventario con cantidades y valores.
- Filtrar por categoría, estado de stock y estado de entregas pendientes.
- Ver el detalle de cada material haciendo clic en una fila.
- Crear materiales nuevos.
- Exportar e importar datos desde/hacia Excel.

**Acceso:** Menú lateral → **Stock de materiales**

### 2.2 Panel Resumen

En la parte superior de la página se muestra un panel consolidado con:

| Indicador | Qué muestra |
|---|---|
| **Stock total valorizado** | Suma de (stock × precio unitario) de todos los materiales con precio cargado. |
| **Unidades totales** | Cantidad total de unidades en inventario. |
| **Materiales sin precio** | ⚠️ Cantidad de materiales que no tienen precio cargado (no se incluyen en la valorización). |
| **Sin asignar a proyecto** | Unidades y valor de stock que no está asignado a ningún proyecto. |

### 2.3 Tabs: General, Sin Asignar y Proyectos

La página tiene **tabs en formato de tarjetas con scroll horizontal**:

| Tab | Qué muestra |
|---|---|
| **General** | Todos los materiales con su stock consolidado (suma de todos los proyectos). Tiene todos los filtros disponibles. |
| **Sin Asignar** | Solo materiales que tienen stock sin asignar a ningún proyecto. Columnas: Nombre, SKU, Stock, Precio unit., Costo. |
| **[Nombre del Proyecto]** | Stock asignado a ese proyecto específico. Mismas columnas que Sin Asignar. Incluye fila de "Total invertido". |

Cada tarjeta de proyecto muestra: nombre, total valorizado ($), unidades y cuántos materiales no tienen precio.

**Columnas del tab General:**

| Columna | Descripción |
|---|---|
| ☑ (checkbox) | Para selección masiva |
| **Nombre** | Nombre del material + SKU (chip) + alias (chips) |
| **Categoría** | Categoría / Subcategoría |
| **Precio** | Precio unitario. Muestra ⚠️ si tiene más de 30 días sin actualizar. |
| **Stock / Pend.** | Stock actual + chip de pendientes de recibir (si hay tickets INGRESO pendientes). |

> 💡 **Tip:** Hacé clic en cualquier fila para abrir el **Drawer de detalle** del material.

### 2.4 Filtros y Búsqueda

| Filtro | Opciones | Notas |
|---|---|---|
| **Buscar** (texto) | Busca por nombre, SKU, alias o descripción | Escribí y presioná Enter o el botón "Buscar" |
| **Estado Stock** | Todos / Sin Stock / Con Stock | Filtra materiales con cantidad 0 o mayor a 0 |
| **Estado Entrega** | Todos / Pendientes de entrega / Entregados | Filtra según si tienen tickets de ingreso pendientes |
| **Categoría** | Todas / Sin categoría / [categorías configuradas] | |
| **Subcategoría** | Se habilita al elegir categoría | Muestra las subcategorías de la categoría seleccionada |

### 2.5 Detalle de Material (Drawer)

Al hacer clic en cualquier fila de material se abre un **panel lateral derecho** con toda la información:

#### Header
- Nombre del material (grande, en negrita).
- SKU (si tiene).
- Descripción.
- Chips de **categoría** y **subcategoría**.
- Chips de **alias**.

#### Tarjetas de estadísticas
| Card | Dato |
|---|---|
| 🟢 **Stock total** | Cantidad total de unidades. |
| 🔵 **Valor total** | Stock × precio unitario (en $). |

- Precio por unidad con fecha de última actualización.
- ⚠️ Alerta si el precio tiene más de 30 días sin actualizar.

#### Acciones rápidas — "Crear ticket"

Desde el drawer podés crear tickets directamente para ese material:

| Botón | Acción |
|---|---|
| 🟢 **Compra** | Abre la página de Tickets con un formulario de INGRESO (subtipo COMPRA) pre-cargado con este material. |
| 🔴 **Retiro** | Abre la página de Tickets con un formulario de EGRESO (subtipo RETIRO) pre-cargado. |
| 🔵 **Transferir** | Abre la página de Tickets con un formulario de TRANSFERENCIA pre-cargado. |

#### Tabla "Stock por proyecto"

Muestra cómo se distribuye el stock de este material entre proyectos:

| Columna | Dato |
|---|---|
| **Proyecto** | Nombre del proyecto (o "Sin asignar") |
| **Stock** | Cantidad en ese proyecto |
| **Costo** | Stock × precio unitario |

Incluye fila de **Total** al final.

#### Editar material (sección colapsable)

Podés editar todos los campos sin salir del drawer:
- Nombre, Descripción, SKU, Precio unitario
- Categoría y Subcategoría
- Alias (en formato de chips)

Botón **"Guardar cambios"** para confirmar.

#### Eliminar material

Botón rojo **"Eliminar material"** al final del drawer. Pide confirmación antes de borrar.

### 2.6 Crear Material

**Desde el botón "Agregar material"** en el header de Stock de materiales.

Campos del formulario:

| Campo | Requerido | Descripción |
|---|---|---|
| **Nombre** | ✅ Sí | Nombre principal del material |
| **Descripción** | No | Detalle adicional del material |
| **SKU** | No | Código identificador (ej: código de proveedor) |
| **Precio unitario ($)** | No | Se registra la fecha de carga automáticamente |
| **Categoría** | ✅ Sí | Seleccionar de las categorías configuradas en la empresa |
| **Subcategoría** | No | Depende de la categoría seleccionada |
| **Alias** | No | Nombres alternativos. Escribí y presioná Enter, coma o punto y coma para agregar chips. |

> ⚠️ **La categoría es obligatoria.** Si no tenés categorías configuradas, andá a **Empresa → Categorías Materiales** para crearlas.

#### Crear material inline (desde formularios de tickets)

Cuando estás creando un ticket (manual o con IA) y el material no existe, podés crearlo directo desde el campo de búsqueda:

1. Escribí el nombre del material → aparece el chip rojo **"Nuevo"**.
2. Hacé clic en el botón **"Crear"** que aparece.
3. Se abre un diálogo con:
   - **Nombre** (pre-llenado con lo que escribiste).
   - **Categoría** y **Subcategoría** (selects con las opciones de la empresa).
   - **Alias** (pre-llenado automáticamente si el nombre del remito/factura difiere del nombre que elegiste).
4. Confirmá con **"Crear Material"**.

### 2.7 Acciones Masivas

Cuando seleccionás materiales con los checkboxes aparece una barra de acciones:

| Acción | Descripción |
|---|---|
| **Seleccionar página** | Selecciona todos los materiales de la página actual |
| **Asignar categoría** | Abre un diálogo para categorizar los materiales seleccionados en lote. Seleccioná categoría y opcionalmente subcategoría → **"Aplicar"**. |
| **Limpiar selección** | Deselecciona todo |

> 💡 **Tip:** Ideal para categorizar materiales importados o recién creados de forma masiva.

### 2.8 Exportar e Importar

#### Exportar a Excel
1. Clic en **"Exportar"** en el header.
2. Elegí un proyecto específico o **"TODOS"**.
3. Se descarga un archivo **Excel (.xlsx)** con columnas: ID Material, Nombre, Categoría, Subcategoría, SKU, Descripción, Stock Actual, Proyecto.
4. Si tenés filtros activos, se aplican al export.

#### Importar desde Excel
1. Clic en **"Importar"** en el header.
2. **Paso 1:** Subí un archivo Excel con los materiales.
3. **Paso 2:** Si hay materiales nuevos que no existen en el sistema, se te pregunta si querés crearlos.
4. **Paso 3:** Revisá las diferencias (stock actual del sistema vs. stock del Excel).
5. **Paso 4:** Confirmá los ajustes → se generan movimientos de ajuste automáticos.

---

## 3. Tickets (Solicitudes)

### 3.1 Vista General de Tickets

La página **Tickets** muestra todos los movimientos de stock agrupados en solicitudes.

**Acceso:** Menú lateral → **Tickets**

**Columnas de la tabla:**

| Columna | Contenido |
|---|---|
| **Tipo** | Icono + nombre (INGRESO, EGRESO, TRANSFERENCIA, AJUSTE, COMPRA) |
| **Subtipo** | Descripción libre (ej: "COMPRA", "RETIRO", etc.) |
| **Estado** | Chip de estado (solo para INGRESO). Los demás tipos muestran "—". |
| **Fecha** | Fecha del ticket |
| **Actualizado** | Última modificación |
| **Items** | Cantidad de movimientos (líneas) |
| **Proyectos** | Chips con los proyectos involucrados (máx. 3 + "+N") |
| **Acciones** | Adjuntos / Confirmar Ingreso / Editar / Eliminar |

**Filtros disponibles:**

| Filtro | Tipo |
|---|---|
| **Tipo** | Select: INGRESO, EGRESO, TRANSFERENCIA, AJUSTE, COMPRA |
| **Estado** | Select: PENDIENTE, PARCIALMENTE_ENTREGADO, ENTREGADO |
| **Subtipo** | Texto libre |
| **Desde / Hasta** | Rango de fechas |

Los filtros activos se muestran como **chips** con contador de resultados y botón "Limpiar todo".

### 3.2 Tipos de Ticket

| Tipo | Ícono | Descripción | Ejemplo |
|---|---|---|---|
| **INGRESO** | ↙️ verde | Material que entra al inventario | Compra de materiales |
| **EGRESO** | ↗️ rojo | Material que sale del inventario | Retiro para obra |
| **TRANSFERENCIA** | ↔️ azul | Mover stock de un proyecto a otro | Redistribución entre obras |
| **AJUSTE** | 🎚 púrpura | Corrección de cantidades | Conteo físico |
| **COMPRA** | 🛒 primario | Compra (variante de ingreso) | Orden de compra |

### 3.3 Estados de un Ticket

Los estados **solo aplican a tickets de tipo INGRESO**. Los demás tipos (EGRESO, TRANSFERENCIA, AJUSTE) se crean directamente en estado **ENTREGADO** (no tienen flujo de confirmación).

| Estado | Chip | Significado |
|---|---|---|
| **PENDIENTE** | 🔴 Rojo | Se registró el ingreso pero aún no llegaron los materiales |
| **PARCIALMENTE_ENTREGADO** | 🟠 Naranja | Algunos materiales ya fueron recibidos, otros no |
| **ENTREGADO** | 🟢 Verde | Todos los materiales fueron recibidos y confirmados |

**Flujo de estados (solo INGRESO):**
```
PENDIENTE → PARCIALMENTE_ENTREGADO → ENTREGADO
   │                                      ↑
   └──────────── (entrega total) ─────────┘
```

> ℹ️ Para tickets de EGRESO, TRANSFERENCIA y AJUSTE no se muestra columna de estado porque se ejecutan al momento de crearlos.

### 3.4 Crear Ticket Manualmente

Desde el botón **"Nuevo ticket" ▾** en el header:

#### Registrar Ingreso
1. Seleccioná **"Registrar ingreso"**.
2. Completá: Fecha, Observación, Proyecto (opcional — sin proyecto = "Sin asignar").
3. Agregá movimientos: buscá o creá materiales con el campo de búsqueda, indicá la cantidad.
4. Clic en **"Crear"** → se genera el ticket en estado **PENDIENTE**.

#### Registrar Egreso
1. Seleccioná **"Registrar egreso"**.
2. Mismos campos que ingreso.
3. Clic en **"Crear"** → se genera el ticket en estado **ENTREGADO** (el stock se descuenta inmediatamente).

#### Realizar Transferencia
1. Seleccioná **"Realizar transferencia"**.
2. Completá: Fecha, Observación.
3. Elegí **Proyecto de egreso (desde)** y **Proyecto de ingreso (hacia)**.
4. Agregá los materiales y cantidades.
5. Clic en **"Crear"** → se genera el ticket en estado **ENTREGADO** (el stock se mueve inmediatamente).

#### Crear ticket rápido desde un material
Desde el **Drawer de detalle** de cualquier material, usá los botones **Compra**, **Retiro** o **Transferir** para ir directamente a crear un ticket con ese material pre-cargado.

### 3.5 Cargar con IA

Desde el botón **"Cargar con IA" ▾** podés extraer materiales automáticamente de una imagen de factura o remito:

#### Ingreso desde Factura
1. Seleccioná **"Ingreso desde Factura"**.
2. **Paso 1 — Subir Factura:** Subí una imagen (JPG, PNG, PDF) de la factura de compra.
3. **Paso 2 — Revisar Materiales:** La IA extrae los materiales automáticamente y los concilia con tu inventario.
   - Los materiales conciliados muestran chip verde **"Conciliado"**.
   - Los no encontrados muestran chip naranja **"Nuevo"** → podés vincularlos a un material existente o crearlos inline (con categoría y alias).
   - Se extrae automáticamente: proveedor, N° de factura, fecha y total.
   - Podés editar cantidades, nombres y agregar/quitar materiales.
4. **Paso 3 — Confirmar Ingreso:** Elegí el proyecto de destino, la fecha y una observación → **"Crear Ingreso"**.

#### Egreso desde Remito
1. Seleccioná **"Egreso desde Remito"**.
2. Mismo flujo de 3 pasos pero para egresos.
3. El ticket se crea en estado **ENTREGADO**.

> 💡 **Sugerencia de alias:** Cuando seleccionás un material existente cuyo nombre difiere del texto del remito/factura, el sistema te pregunta si querés guardar ese nombre como **alias**. Así la próxima vez se concilia automáticamente.

### 3.6 Confirmar Ingreso

Cuando un ticket de INGRESO está en estado **PENDIENTE** o **PARCIALMENTE_ENTREGADO**, aparece el botón 🚚 en la columna de acciones.

**Flujo del wizard:**

1. **"¿Cómo fue la entrega?"**
   - Se muestra información del ticket: subtipo, materiales pendientes, unidades pendientes.
   - **✅ Entrega Total** — "Se recibieron TODOS los materiales en las cantidades solicitadas" → confirma todo de una vez, todos los movimientos pasan a ENTREGADO.
   - **⚠️ Entrega Parcial** — "Algunos materiales llegaron incompletos o no llegaron" → avanza al paso 2.

2. **Lista de cantidades (solo entrega parcial)**
   - Tabla con cada material: Nombre, Cantidad Pendiente, Cantidad Recibida (input numérico).
   - Resumen: "Total pendiente: X" / "Total a confirmar: Y".
   - Clic en **"Confirmar Ingreso"** → los movimientos se actualizan según lo recibido.

> ℹ️ Si un material se confirma parcialmente, el ticket pasa a **PARCIALMENTE_ENTREGADO**. Cuando se confirman todos, pasa a **ENTREGADO**.

### 3.7 Entrega Parcial

Para confirmar la entrega de **un único movimiento** dentro de un ticket:

1. Se muestra: Material, Cantidad original, Ya entregado, Pendiente.
2. Ingresá la **"Cantidad a entregar ahora"** (máximo = pendiente).
3. Helper dinámico:
   - Si es menor al pendiente → _"Se creará un movimiento pendiente de N unidades"_.
   - Si es igual al pendiente → _"Entrega completa — el movimiento quedará como ENTREGADO"_.
4. Clic en **"Confirmar Entrega"**.

### 3.8 Ajuste de Stock

Desde el botón **"Nuevo ticket" → "Ajustar stock"**:

1. Seleccioná un **Proyecto** (opcional — sin proyecto = stock general).
2. Agregá materiales usando el campo de búsqueda (se carga el stock actual automáticamente).
3. Para cada material:
   - **Stock Actual:** chip de solo lectura (dato del sistema).
   - **Cantidad Real:** ingresá la cantidad que realmente tenés.
   - **Diferencia:** se calcula automáticamente → chip verde `+N` (ajuste positivo) o rojo `-N` (ajuste negativo).
   - **Motivo:** texto libre (ej: "Conteo físico", "Rotura").
4. Revisá el **panel resumen** que lista todos los ajustes.
5. Clic en **"Aplicar Ajuste"** → se genera un ticket de tipo AJUSTE en estado ENTREGADO con los movimientos correspondientes.

### 3.9 Editar y Eliminar Tickets

#### Editar
- Clic en el ícono ✏️ de la fila.
- Se abre el formulario con los datos cargados.
- Podés modificar fecha, proyecto, documentos adjuntos y los movimientos.
- Para tickets de INGRESO, se muestran los estados de cada movimiento (PENDIENTE, PARCIAL, ENTREGADO con fracción "N/M").

#### Eliminar
- Clic en el ícono 🗑 de la fila.
- Se pide confirmación.
- Se elimina la solicitud y **todos sus movimientos asociados**.

### 3.10 Exportar Tickets

Clic en el botón **"Exportar"** en el header de Tickets.

Se descarga un archivo **CSV** con las columnas:
- Tipo, Subtipo, Fecha, Total Items, Cantidad Total, Actualizado.

> ℹ️ Se exportan los tickets que cumplen los filtros activos.

---

## 4. Flujos Comunes

### Registrar una compra de materiales

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Registrar ingreso"**.
2. Completar los datos y agregar los materiales comprados con sus cantidades.
3. Crear el ticket → queda en estado **PENDIENTE**.
4. Cuando llegan los materiales → clic en 🚚 → **"Entrega Total"** (o parcial si falta algo).

### Registrar una compra con factura (IA)

1. Ir a **Tickets** → **"Cargar con IA"** → **"Ingreso desde Factura"**.
2. Subir foto de la factura.
3. Revisar y corregir los materiales extraídos.
4. Confirmar → queda en estado **PENDIENTE**.
5. Confirmar ingreso cuando lleguen los materiales.

### Registrar un retiro de materiales para obra

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Registrar egreso"**.
2. Seleccionar el proyecto de la obra.
3. Agregar los materiales y cantidades que se retiran.
4. Crear → el stock se descuenta inmediatamente.

### Transferir stock entre proyectos

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Realizar transferencia"**.
2. Elegir proyecto de origen y proyecto de destino.
3. Agregar materiales y cantidades.
4. Crear → el stock se mueve inmediatamente.

### Corregir stock tras un conteo físico

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Ajustar stock"**.
2. Seleccionar el proyecto (o general).
3. Buscar cada material y cargar la cantidad real.
4. Indicar el motivo.
5. Aplicar → se generan movimientos de ajuste automáticos.

### Crear un material rápido desde un ticket con IA

1. Mientras revisás los materiales extraídos de una factura/remito:
2. Si un material muestra chip **"Nuevo"** → clic en **"Crear"**.
3. Completar: nombre, categoría (obligatoria), subcategoría (opcional), alias (se sugiere automáticamente).
4. Crear → el material queda vinculado al movimiento.

---

## 5. Stock desde WhatsApp

Además del panel web, el sistema permite gestionar stock directamente desde **WhatsApp** mediante el bot conversacional. Estas operaciones crean tickets y movimientos en el **mismo módulo de stock** que la web — los datos están unificados.

### 5.1 Retirar Materiales (Egreso por Remito)

Permite registrar un egreso de materiales enviando una **foto del remito** por WhatsApp.

**Flujo paso a paso:**

1. **Enviar la foto del remito** al bot.
2. El bot detecta que es un remito y pregunta: **"Elegí el proyecto"**.
   - Muestra una lista numerada de proyectos disponibles.
   - Opción `0` = Sin asignar proyecto.
   - Escribí el **número** del proyecto o `x` para cancelar.
3. **Procesamiento automático:**
   - La IA (ChatGPT Vision) extrae los materiales, cantidades y datos del remito.
   - Si hay materiales con cantidades ambiguas, el bot pregunta **uno a uno**: _"¿Cuántos hay de [material]?"_
4. **Conciliación:** El sistema intenta vincular cada material del remito con materiales existentes en el inventario (por nombre exacto, alias, o IA).
5. **Resumen:** El bot muestra un resumen con todos los materiales, cantidades y estado de conciliación:
   - ✅ = Conciliado (vinculado a un material existente)
   - ❌ = Sin conciliar (no se encontró match)
6. **Opciones:**
   - `1` → **Continuar** — Procesar el ticket de egreso
   - `2` → **Modificar** — Cambiar cantidades, agregar o eliminar materiales (por texto o audio, procesado con IA)
   - `x` → **Cancelar**
7. Al confirmar, se crea un ticket de tipo **EGRESO** con subtipo **RETIRO_REMITO** en estado **ENTREGADO** (el stock se descuenta inmediatamente).

> 💡 Las modificaciones se procesan con IA: podés decir _"cambiar cantidad del material 2 a 15"_ o _"eliminar el material 3"_ por texto o audio.

### 5.2 Ingresar Materiales (Ingreso por Documento)

Permite registrar un ingreso de materiales enviando una **foto de cualquier documento de compra** (factura, remito, presupuesto, etc.) por WhatsApp.

**Flujo paso a paso:**

1. El bot pide: **"Enviá la foto o PDF del documento de compra (factura, remito, presupuesto, etc.)"**.
2. **Subir el archivo** (foto o PDF).
3. El bot pregunta: **"Elegí el proyecto/depósito destino"**.
   - Lista numerada de proyectos.
   - Opción `0` = Sin asignar.
4. **Extracción con IA:** Se extraen automáticamente:
   - Lista de materiales con cantidades
   - Precios unitarios (si están disponibles)
   - Datos de la factura (proveedor, número, fecha, total)
5. **Conciliación automática** con materiales existentes.
6. **Resumen** con detalle de cada material, precio unitario y estado de conciliación.
7. **Opciones:** Continuar / Modificar / Cancelar.
8. Al confirmar, se crea un ticket de tipo **INGRESO** con subtipo **COMPRA** en estado **PENDIENTE**.

> ℹ️ El ticket queda en PENDIENTE hasta que se confirme la recepción desde la web (ver [Confirmar Ingreso](#36-confirmar-ingreso)).

### 5.3 Consultar Stock

Desde WhatsApp podés preguntarle al bot sobre el estado del stock. Por ejemplo:
- _"¿Cuánto cemento tenemos?"_
- _"¿Qué stock hay en el proyecto X?"_

El bot consulta la base de datos de stock y responde con la información formateada.

### 5.4 Conciliación Automática en WhatsApp

Cuando el bot extrae materiales de un remito o factura, intenta vincularlos con materiales existentes en el inventario usando esta jerarquía:

| Prioridad | Método | Ejemplo |
|---|---|---|
| 1️⃣ | **Nombre exacto** | "Cemento Portland" = "Cemento Portland" |
| 2️⃣ | **Nombre case-insensitive** | "cemento portland" = "Cemento Portland" |
| 3️⃣ | **Alias** | "Cem. Portland x 50kg" coincide con alias guardado |
| 4️⃣ | **IA (ChatGPT)** | Análisis semántico como último recurso |

> 💡 **Los alias que guardás desde la web funcionan también en WhatsApp.** Si desde el panel web vinculás un material con un alias, la próxima vez que el bot encuentre ese nombre en un remito/factura, lo concilia automáticamente.

### 5.5 Diferencias entre Web y WhatsApp

| Funcionalidad | Web | WhatsApp |
|---|---|---|
| Crear tickets de ingreso | ✅ | ✅ (por foto de factura/remito) |
| Crear tickets de egreso | ✅ | ✅ (por foto de remito) |
| Crear transferencias | ✅ | ❌ (indica link a la web) |
| Ajustar stock | ✅ | ❌ (indica link a la web) |
| Confirmar ingreso (entrega) | ✅ | ❌ (solo desde la web) |
| Consultar stock | ✅ | ✅ |
| Crear materiales nuevos inline | ✅ (con categoría y alias) | ❌ (quedan sin conciliar) |
| Modificar ticket antes de crear | ✅ (formulario) | ✅ (texto/audio con IA) |
| Conciliación automática | ✅ | ✅ (misma base de datos) |
| Sugerencia de alias | ✅ | ❌ |
| Exportar datos | ✅ (Excel/CSV) | ❌ |

> ⚠️ **Importante:** Los tickets creados desde WhatsApp aparecen en la misma tabla de tickets de la web. Todo queda registrado en el mismo sistema.

### 5.6 Crear Ticket por Texto (sin foto)

Además de enviar fotos, podés **pedirle al bot que cree un ticket de stock escribéndole directamente**. Ejemplos:

| Lo que escribís | Lo que hace el bot |
|---|---|
| _"Quiero ingresar materiales al stock"_ | Inicia el flujo de **ingreso** (pide foto de documento) |
| _"Crear ticket de ingreso de stock"_ | Inicia el flujo de **ingreso** |
| _"Retirar materiales del stock"_ | Inicia el flujo de **egreso** (pide foto de remito) |
| _"Egresar materiales"_ | Inicia el flujo de **egreso** |
| _"Ajustar stock"_ | Te indica que esta operación se hace desde la **web** con el link directo |
| _"Transferir materiales entre proyectos"_ | Te indica que esta operación se hace desde la **web** con el link directo |
| _"Crear ticket de stock"_ (sin especificar tipo) | Muestra un **menú** con las 4 opciones disponibles |

> 💡 **Tip:** No hace falta enviar una foto primero. Podés escribir directamente _"quiero cargar una factura al stock"_ y el bot te guía paso a paso.

---

## 6. Preguntas Frecuentes

### ¿Por qué los egresos no muestran estado?
Los tickets de EGRESO, TRANSFERENCIA y AJUSTE se ejecutan inmediatamente al crearlos (el stock se actualiza al instante). Solo los INGRESOS tienen flujo de confirmación (PENDIENTE → ENTREGADO) porque representan materiales que se esperan recibir.

### ¿Qué pasa si creo un material sin categoría?
El sistema te va a pedir que asignes una categoría. Es obligatorio para mantener el inventario organizado. Si no tenés categorías configuradas, andá a **Empresa → Categorías Materiales**.

### ¿Qué son los alias y para qué sirven?
Los alias son nombres alternativos de un material. Cuando cargás una factura o remito con IA, el sistema usa los alias para identificar automáticamente a qué material corresponde cada línea. Por ejemplo: en tu sistema el material se llama "Cemento Portland" pero en la factura dice "Cem. Portland x 50kg" → si guardás eso como alias, la próxima vez se concilia solo.

### ¿Cómo veo el stock de un proyecto específico?
En la página de **Stock de materiales**, hacé clic en la tarjeta del proyecto en la barra de tabs. Vas a ver solo los materiales con stock en ese proyecto, con sus cantidades y costos.

### ¿Puedo crear un ticket directamente desde un material?
Sí. Hacé clic en un material para abrir el drawer de detalle → usá los botones **Compra**, **Retiro** o **Transferir**. Se abre el formulario de ticket con el material ya cargado.

### ¿Cómo categorizo muchos materiales a la vez?
En el tab **General** de Stock de materiales, seleccioná los materiales con los checkboxes → clic en **"Asignar categoría"** → elegí la categoría → **"Aplicar"**.

### ¿Qué significa el ⚠️ en el precio?
Significa que el precio del material tiene más de 30 días sin actualizarse. Considerá revisarlo y actualizarlo.

### ¿Cómo importo datos desde un Excel?
Clic en **"Importar"** → subí tu archivo Excel → el sistema detecta materiales nuevos y diferencias de stock → confirmá para aplicar los ajustes automáticamente.

### ¿Los tickets creados desde WhatsApp aparecen en la web?
Sí. WhatsApp y la web usan la **misma base de datos de stock**. Un ticket creado desde WhatsApp se ve en la tabla de Tickets de la web, y los movimientos afectan el stock visible en Stock de materiales.

### ¿Qué pasa con los materiales sin conciliar desde WhatsApp?
Si el bot no logra vincular un material del remito/factura con uno existente, el movimiento se crea con `id_material: null`. El ticket funciona igual, pero ese movimiento no se vincula a un material específico del inventario. Podés editarlo desde la web para corregirlo.

### ¿Puedo crear un material nuevo desde WhatsApp?
No directamente. Desde WhatsApp solo podés trabajar con materiales existentes. Si necesitás crear un material nuevo, hacelo desde la web (Stock de materiales → Agregar material, o inline desde un ticket con IA). Una vez creado, el bot lo encontrará automáticamente en futuras conciliaciones.
