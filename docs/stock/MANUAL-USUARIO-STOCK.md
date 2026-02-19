# 📦 Stock — Guía para el Usuario

> Todo lo que necesitás saber para manejar el inventario de materiales desde la web y desde WhatsApp.

---

## Índice

1. [Antes de empezar](#1-antes-de-empezar)
2. [¿Cómo ingresar materiales al stock? (Compra)](#2-cómo-ingresar-materiales-al-stock-compra)
   - [Desde la web — con foto de factura (IA)](#21-desde-la-web--con-foto-de-factura-ia)
   - [Desde la web — carga manual](#22-desde-la-web--carga-manual)
   - [Desde WhatsApp — con foto de factura](#23-desde-whatsapp--con-foto-de-factura)
   - [Desde WhatsApp — por texto o audio](#24-desde-whatsapp--por-texto-o-audio)
3. [¿Cómo retirar materiales del stock? (Egreso)](#3-cómo-retirar-materiales-del-stock-egreso)
   - [Desde la web — con foto de remito (IA)](#31-desde-la-web--con-foto-de-remito-ia)
   - [Desde la web — carga manual](#32-desde-la-web--carga-manual)
   - [Desde WhatsApp — con foto de remito](#33-desde-whatsapp--con-foto-de-remito)
   - [Desde WhatsApp — por texto o audio](#34-desde-whatsapp--por-texto-o-audio)
4. [¿Cómo transferir materiales entre proyectos?](#4-cómo-transferir-materiales-entre-proyectos)
   - [Desde la web](#41-desde-la-web)
   - [Desde WhatsApp — por texto o audio](#42-desde-whatsapp--por-texto-o-audio)
5. [¿Cómo ajustar el stock? (Conteo físico)](#5-cómo-ajustar-el-stock-conteo-físico)
   - [Desde la web](#51-desde-la-web)
   - [Desde WhatsApp — por texto o audio](#52-desde-whatsapp--por-texto-o-audio)
6. [¿Cómo confirmar que llegaron los materiales?](#6-cómo-confirmar-que-llegaron-los-materiales)
7. [¿Cómo consultar el stock actual?](#7-cómo-consultar-el-stock-actual)
   - [Desde la web](#71-desde-la-web)
   - [Desde WhatsApp](#72-desde-whatsapp)
8. [¿Cómo manejo los materiales?](#8-cómo-manejo-los-materiales)
   - [Crear un material nuevo](#81-crear-un-material-nuevo)
   - [¿Qué pasa si el material no existe?](#82-qué-pasa-si-el-material-no-existe)
   - [Alias: para que el sistema reconozca nombres distintos](#83-alias-para-que-el-sistema-reconozca-nombres-distintos)
   - [Categorías](#84-categorías)
9. [¿Cómo edito o borro un ticket?](#9-cómo-edito-o-borro-un-ticket)
10. [Exportar e importar datos](#10-exportar-e-importar-datos)
11. [Resumen rápido — ¿Qué puedo hacer desde cada lugar?](#11-resumen-rápido--qué-puedo-hacer-desde-cada-lugar)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Antes de empezar

### Conceptos básicos

- **Material**: Cada cosa que tenés en el inventario (ej: "Cemento Portland x 50kg", "Varillas Ø10mm").
- **Ticket**: Un registro que dice "entraron X materiales" o "salieron Y materiales". Cada ticket tiene una o más líneas (movimientos).
- **Proyecto**: La obra o depósito donde están los materiales. Un mismo material puede estar repartido en varios proyectos.

### ¿Cómo cambia el stock?

El stock **nunca se cambia a mano**. Siempre se modifica creando un **ticket**:

| Situación | Qué tipo de ticket creo | ¿Cuándo se mueve el stock? |
|---|---|---|
| Compré materiales | **INGRESO** | Cuando confirmo que llegaron ⏳ |
| Retiré materiales para la obra | **EGRESO** | Al instante ✅ |
| Moví materiales de un proyecto a otro | **TRANSFERENCIA** | Al instante ✅ |
| Conté y hay diferencia con el sistema | **AJUSTE** | Al instante ✅ |

> 💡 **Importante:** Cuando cargás una compra (INGRESO), los materiales quedan como "pendientes de recibir". El stock sube recién cuando confirmás que llegaron. Los demás tipos (egreso, transferencia, ajuste) se aplican al instante.

---

## 2. ¿Cómo ingresar materiales al stock? (Compra)

Tenés **4 formas** de cargar una compra. Elegí la que te resulte más cómoda:

### 2.1 Desde la web — con foto de factura (IA)

**La más rápida si tenés la factura a mano.**

1. Ir a **Tickets** → botón **"Cargar con IA"** → **"Ingreso desde Factura"**.
2. Subí la foto o PDF de la factura.
3. El sistema extrae automáticamente los materiales, cantidades y precios.
4. **Revisá lo que detectó:**
   - Los materiales que el sistema reconoce aparecen con chip verde **"Conciliado"** ✅.
   - Los que no reconoce aparecen con chip naranja **"Nuevo"** ⚠️ → [¿Qué hago?](#82-qué-pasa-si-el-material-no-existe)
5. Podés corregir cantidades, nombres, agregar o quitar materiales.
6. Elegí el **proyecto** destino y confirmá.
7. El ticket se crea en estado **PENDIENTE** → cuando lleguen los materiales, [confirmá la entrega](#6-cómo-confirmar-que-llegaron-los-materiales).

### 2.2 Desde la web — carga manual

**Si no tenés factura o preferís cargar a mano.**

1. Ir a **Tickets** → botón **"Nuevo ticket"** → **"Registrar ingreso"**.
2. Completá: fecha, observación y proyecto.
3. Buscá cada material en el campo de búsqueda (si no existe, [podés crearlo ahí mismo](#82-qué-pasa-si-el-material-no-existe)).
4. Indicá la cantidad de cada uno.
5. Clic en **"Crear"** → queda en estado **PENDIENTE**.

### 2.3 Desde WhatsApp — con foto de factura

1. Escribile al bot: _"Quiero ingresar materiales al stock"_.
2. El bot te pregunta: **"¿Cómo querés cargarlo?"**
   - Elegí **1** → Foto/PDF de documento.
3. Subí la foto de la factura.
4. Elegí el proyecto (lista numerada, 0 = sin asignar).
5. El bot extrae los materiales automáticamente y te muestra un resumen.
6. Revisá y confirmá con **1** (o **2** para modificar, **x** para cancelar).
7. Se crea el ticket en estado **PENDIENTE**.

### 2.4 Desde WhatsApp — por texto o audio

**Si no tenés factura. Ideal para cargas rápidas.**

1. Escribile al bot: _"Quiero ingresar materiales al stock"_.
2. El bot pregunta: **"¿Cómo querés cargarlo?"**
   - Elegí **2** → Texto o audio.
3. Enviá un mensaje de texto o un **audio de voz** con los materiales y cantidades:
   - Ejemplo texto: _"50 bolsas de cemento, 100 ladrillos y 20 varillas del 10"_
   - Ejemplo audio: describí los materiales hablando normalmente.
4. El bot analiza tu mensaje, lo compara con los materiales que ya tenés cargados, y muestra:
   - ✅ = Material identificado en tu sistema (ya vinculado).
   - ⚠️ = Material que no encontró (se puede conciliar después desde la web).
5. Elegí el proyecto destino (lista numerada).
6. Revisá el resumen y confirmá con **1**.
7. Se crea el ticket en estado **PENDIENTE**.

> 💡 **Tip:** Cuanto más claro sea tu mensaje, mejor. Incluí nombres completos y cantidades. Por ejemplo: _"50 bolsas de cemento portland, 100 ladrillos huecos y 3 chapas galvanizadas"_.

---

## 3. ¿Cómo retirar materiales del stock? (Egreso)

Cuando sacás materiales del depósito para llevarlos a una obra, creás un ticket de **EGRESO**. El stock se descuenta **al instante**.

### 3.1 Desde la web — con foto de remito (IA)

1. Ir a **Tickets** → **"Cargar con IA"** → **"Egreso desde Remito"**.
2. Subí la foto del remito.
3. Revisá los materiales extraídos (misma lógica que la factura: conciliados ✅ y nuevos ⚠️).
4. Elegí el proyecto y confirmá.
5. El stock se descuenta inmediatamente.

### 3.2 Desde la web — carga manual

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Registrar egreso"**.
2. Completá los datos, buscá los materiales, indicá cantidades.
3. Clic en **"Crear"** → el stock se descuenta inmediatamente.

### 3.3 Desde WhatsApp — con foto de remito

1. Enviá la foto del remito al bot.
2. El bot detecta que es un remito y pregunta el proyecto.
3. Extrae los materiales automáticamente. Si alguna cantidad no está clara, te pregunta una por una.
4. Te muestra el resumen con estado de conciliación (✅ / ❌).
5. Confirmá con **1** → el stock se descuenta inmediatamente.

### 3.4 Desde WhatsApp — por texto o audio

1. Escribí: _"Quiero retirar materiales del stock"_ (o _"egresar materiales"_).
2. El bot pregunta foto o texto/audio → elegí **2**.
3. Enviá tu texto o audio con los materiales y cantidades.
4. Elegí el proyecto.
5. Confirmá → el stock se descuenta inmediatamente.

---

## 4. ¿Cómo transferir materiales entre proyectos?

Cuando movés materiales de una obra a otra (o de un depósito a otro).

### 4.1 Desde la web

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Realizar transferencia"**.
2. Elegí el **proyecto de origen** (de dónde salen).
3. Elegí el **proyecto de destino** (a dónde van).
4. Agregá los materiales y cantidades.
5. Clic en **"Crear"** → el stock se mueve inmediatamente.

### 4.2 Desde WhatsApp — por texto o audio

1. Escribí: _"Quiero transferir materiales entre proyectos"_.
2. Enviá un texto o audio con los materiales y cantidades.
3. El bot pide que elijas el **proyecto de origen** (lista numerada).
4. Luego pide el **proyecto de destino** (otra lista numerada).
5. Revisá el resumen y confirmá → el stock se mueve inmediatamente.

---

## 5. ¿Cómo ajustar el stock? (Conteo físico)

Si contaste y las cantidades no coinciden con el sistema.

### 5.1 Desde la web

1. Ir a **Tickets** → **"Nuevo ticket"** → **"Ajustar stock"**.
2. Elegí el proyecto (o dejá en general).
3. Buscá cada material → el sistema te muestra el **stock actual**.
4. Poné la **cantidad real** que contaste.
5. La diferencia se calcula automática:
   - Chip verde `+5` = tenés 5 más de lo que dice el sistema.
   - Chip rojo `-3` = te faltan 3.
6. Indicá el motivo (ej: "Conteo físico", "Rotura").
7. Clic en **"Aplicar Ajuste"** → el stock se corrige inmediatamente.

### 5.2 Desde WhatsApp — por texto o audio

1. Escribí: _"Quiero ajustar el stock"_.
2. Enviá un texto o audio indicando los materiales y las cantidades reales.
3. Elegí el proyecto.
4. Confirmá → el stock se ajusta inmediatamente.

---

## 6. ¿Cómo confirmar que llegaron los materiales?

Cuando cargaste un **INGRESO** (compra), el ticket queda en estado **PENDIENTE** hasta que confirmes que los materiales llegaron. Esto **solo se hace desde la web**.

### Entrega total (llegó todo)

1. En la tabla de Tickets, buscá el ticket → aparece el botón 🚚 en la columna de acciones.
2. Hacé clic → te pregunta **"¿Cómo fue la entrega?"**.
3. Elegí **✅ Entrega Total** → _"Se recibieron TODOS los materiales"_.
4. El ticket pasa a **ENTREGADO** y el stock sube.

### Entrega parcial (llegaron algunos)

1. Clic en 🚚 → elegí **⚠️ Entrega Parcial**.
2. Te muestra cada material con su cantidad pedida.
3. Ingresá la **cantidad que recibiste** de cada uno.
4. Clic en **"Confirmar Ingreso"** → el ticket pasa a **PARCIALMENTE ENTREGADO**.
5. Cuando llegue el resto, repetí el proceso → cuando esté todo, pasa a **ENTREGADO**.

> ⚠️ Los materiales pendientes de recibir **no cuentan como stock disponible**. En la pantalla de materiales se muestran aparte como "Pendientes de recibir".

---

## 7. ¿Cómo consultar el stock actual?

### 7.1 Desde la web

Ir a **Stock de materiales** (menú lateral).

- **Tab General**: Todos los materiales con su stock total.
- **Tab Sin Asignar**: Materiales que no están asignados a ningún proyecto.
- **Tabs de proyectos**: Stock de cada proyecto individual.
- **Buscar**: Por nombre, SKU o alias.
- **Filtros**: Por categoría, estado de stock (con/sin stock), entregas pendientes.

Hacé clic en cualquier material para ver su **detalle**: stock por proyecto, precio, historial, y acciones rápidas (crear ticket de compra, retiro o transferencia).

### 7.2 Desde WhatsApp

Escribile al bot, por ejemplo:
- _"¿Cuánto cemento tenemos?"_
- _"¿Qué stock hay en el proyecto Obra Norte?"_
- _"Stock de varillas"_

El bot busca en la base de datos y te responde con las cantidades por proyecto.

---

## 8. ¿Cómo manejo los materiales?

### 8.1 Crear un material nuevo

**Desde la pantalla de materiales:**
1. Ir a **Stock de materiales** → botón **"Agregar material"**.
2. Completar:
   - **Nombre** (obligatorio) — ej: "Cemento Portland x 50kg"
   - **Categoría** (obligatorio) — ej: "Materiales de construcción"
   - **SKU** (opcional) — código del proveedor
   - **Precio unitario** (opcional)
   - **Alias** (opcional) — nombres alternativos para que el sistema lo reconozca en facturas
3. Guardar.

### 8.2 ¿Qué pasa si el material no existe?

Depende de dónde estés:

**Desde la web (cargando un ticket):**
- Al buscar el material aparece chip rojo **"Nuevo"**.
- Hacé clic en **"Crear"** → se abre un mini-formulario para crear el material en el momento.
- Se pre-llena el nombre. Solo tenés que elegir la categoría.
- Si venía de una factura y el nombre era diferente, el sistema sugiere guardarlo como **alias**.

**Desde WhatsApp:**
- No podés crear materiales nuevos.
- Si el bot no reconoce un material, el movimiento queda **sin conciliar** (sin vincular a un material del sistema).
- Después podés entrar a la web y vincularlo manualmente desde la pantalla de **Movimientos** o editar el ticket.

> 💡 **Consejo:** Antes de empezar a cargar por WhatsApp, asegurate de tener los materiales principales cargados en el sistema. Así el bot los reconoce automáticamente.

### 8.3 Alias: para que el sistema reconozca nombres distintos

Un **alias** es un nombre alternativo de un material. Sirve para que el sistema vincule automáticamente cuando en la factura o remito dice algo distinto.

**Ejemplo:**
- Tu material se llama: **"Cemento Portland x 50kg"**
- En la factura del proveedor dice: **"Cem. Portland bolsa 50"**
- Si guardás _"Cem. Portland bolsa 50"_ como alias → la próxima vez se reconoce solo.

**¿Cómo agrego un alias?**
1. Ir a **Stock de materiales** → clic en el material.
2. En el panel lateral, sección **"Editar material"**.
3. En el campo **Alias**, escribí el nombre alternativo y presioná Enter.
4. Se agrega como chip. Podés agregar varios.
5. **"Guardar cambios"**.

Los alias funcionan tanto en la web como en WhatsApp.

### 8.4 Categorías

Cada material debe tener una **categoría** (ej: "Construcción en seco", "Herramientas", "Eléctricos"). Las categorías se configuran en **Empresa → Categorías Materiales**.

**Categorizar en lote:** Si tenés muchos materiales sin categoría, seleccionalos con los checkboxes → clic en **"Asignar categoría"** → elegí la categoría → **"Aplicar"**.

---

## 9. ¿Cómo edito o borro un ticket?

### Editar

1. En la tabla de Tickets, clic en el ícono ✏️ del ticket.
2. Podés cambiar: fecha, proyecto, observación, documentos adjuntos y los materiales.
3. Guardar.

### Eliminar

1. Clic en el ícono 🗑.
2. Confirmar → se borra el ticket y todos sus movimientos.

> ⚠️ Al borrar un ticket, el stock se revierte automáticamente. Si borrás un egreso, las cantidades vuelven al stock.

> 💡 **Tip:** Si te equivocaste en una cantidad, en vez de borrar el ticket podés crear un **AJUSTE** para corregir la diferencia. Así mantenés un historial completo.

---

## 10. Exportar e importar datos

### Exportar materiales a Excel

1. En **Stock de materiales** → botón **"Exportar"**.
2. Elegí un proyecto o **"TODOS"**.
3. Se descarga un archivo Excel con: nombre, categoría, SKU, stock, proyecto.

### Exportar tickets a CSV

1. En **Tickets** → botón **"Exportar"**.
2. Se descarga un CSV con los tickets que cumplen los filtros activos.

### Importar stock desde Excel

1. En **Stock de materiales** → botón **"Importar"**.
2. Subí tu archivo Excel.
3. El sistema detecta materiales nuevos y diferencias de stock.
4. Revisá y confirmá → se generan ajustes automáticos.

---

## 11. Resumen rápido — ¿Qué puedo hacer desde cada lugar?

| Acción | Web | WhatsApp |
|---|:---:|:---:|
| Ingresar materiales (compra) | ✅ Manual o foto de factura | ✅ Foto de factura o texto/audio |
| Retirar materiales (egreso) | ✅ Manual o foto de remito | ✅ Foto de remito o texto/audio |
| Transferir entre proyectos | ✅ Manual | ✅ Texto/audio |
| Ajustar stock | ✅ Manual | ✅ Texto/audio |
| Confirmar entrega (PENDIENTE → ENTREGADO) | ✅ | ❌ Solo web |
| Consultar stock | ✅ | ✅ |
| Crear materiales nuevos | ✅ | ❌ |
| Editar/borrar tickets | ✅ | ❌ |
| Exportar/importar datos | ✅ | ❌ |
| Conciliar materiales manualmente | ✅ | ❌ |

---

## 12. Preguntas frecuentes

### Cargué una compra pero el stock no subió. ¿Qué pasó?
Los ingresos quedan en estado **PENDIENTE** hasta que confirmés la entrega. Andate a Tickets → buscá el ticket → clic en 🚚 → Entrega Total. Ahí sube el stock.

### ¿Puedo enviar un audio en vez de escribir?
Sí. En cualquier momento que el bot espere la lista de materiales, podés enviar un **audio de voz**. El sistema lo transcribe automáticamente y lo procesa igual que un texto.

### El bot no reconoció un material. ¿Qué hago?
Dos opciones:
1. **Después**: Entrá a la web → Movimientos → buscá el movimiento sin conciliar → vinculalo al material correcto.
2. **Preventivo**: Agregale **alias** al material desde la web (Stock de materiales → clic en el material → Editar → Alias). La próxima vez se reconoce solo.

### ¿Los tickets de WhatsApp aparecen en la web?
Sí. Todo se guarda en la misma base de datos. Un ticket creado desde WhatsApp aparece en la tabla de Tickets de la web.

### ¿Cómo sé qué materiales están sin conciliar?
En la tabla de **Tickets**, usá el botón **"Sin conciliar"** para filtrar los tickets que tienen materiales sin vincular a un material del sistema. También podés ver la cantidad en la columna "Items" (chip rojo "N sin conc.").

### ¿Cuándo conviene usar foto y cuándo texto/audio?
- **Foto**: Cuando tenés una factura o remito a mano. El sistema extrae todo automáticamente.
- **Texto/audio**: Cuando no tenés documento, o para cargas rápidas ("me llegaron 50 bolsas de cemento y 20 varillas").

### ¿Cómo corrijo un error?
No edites el ticket original. Creá un ticket de **AJUSTE** para compensar la diferencia. Así mantenés la trazabilidad completa.

### ¿Qué significa el ⚠️ en el precio de un material?
Que el precio tiene más de 30 días sin actualizarse. Considerá revisarlo.

### ¿Puedo ver el stock de un solo proyecto?
Sí. En **Stock de materiales**, hacé clic en la tarjeta del proyecto (barra de tabs horizontal). Te muestra solo los materiales con stock en ese proyecto.
