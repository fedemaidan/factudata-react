# Módulo de Materiales — Documento Funcional v4

> **Fecha**: 10/03/2026  
> **Estado**: Borrador para validación  
> **Audiencia**: Equipo de negocio, clientes  
> **Cambios v4**: Se agrega destino "Pendiente de asignar", configuración por empresa (ejes independientes), instancia de validación opcional, perfil de cliente Mica. Se aclara que la reserva de material a obra ya existe (transferencia).  
> **Cambios v3**: Se agregan Mejora 4 (flujo caja → stock) y Mejora 5 (limpieza de módulo viejo)

---

## 1. Contexto y problema actual

### ¿Qué nos dijeron los clientes?

**Alvarado (Diego y Andrés):**
- "No me importa el stock, me importa verlo reflejado en la obra, el costo"
- "Quiero cargar un listado de materiales con ítem, cantidad y precio, y que se asigne a la obra"
- "No me limite que no esté en el depósito, que se pueda contabilizar igual"
- "Lo ideal sería carga diaria, pero terminamos cargando todo junto al final"

**Carranza (Rocío y Bárbara):**
- "Nos falta ese intermedio que nos dé alerta de material por entregar"
- Compran 1296 ladrillos al proveedor → 200 van a obra → el resto queda en el proveedor
- Ven acopio y stock como lo mismo, no como dos módulos separados
- Quieren controlar el desacopio: cuánto retiraron, cuánto queda disponible

**Mica y Flor (constructora chica, refacciones):**
- Operación caótica: 2-5 obras en paralelo, equipo chico, mucho WhatsApp
- "Siempre tienen una caja chica" — trabajadores compran en ferreterías con tickets informales
- Depósito poco central, la mayoría va directo a obra o queda en proveedor
- Quieren saber dónde están las herramientas y materiales sin sentarse a mirar un dashboard
- No necesitan distribución por línea: "todo a la misma obra" les alcanza
- Necesitan que sea **liviano**, sin fricciones al registrar

### ¿Cuál es el problema de fondo?

Hoy tenemos dos módulos separados (Acopio y Stock) que no se comunican entre sí. Cuando un cliente compra materiales:

- Si los deja en el proveedor → usa Acopio
- Si los lleva a su depósito → usa Stock  
- Si los manda directo a obra → no tiene un camino claro

Y cuando retira materiales del proveedor (desacopio), ese movimiento **no se refleja** en el stock ni en el costo de la obra.

Además, cuando un cliente carga una factura de compra de materiales en caja:

- El sistema extrae los materiales con IA ✅
- Le muestra al usuario los materiales detectados ✅
- El usuario dice "ok" y... **no pasa nada más** ❌
- Los materiales no van al stock, no van a la obra, no van a ningún lado

Andrés (Alvarado) lo dijo textual: *"siempre que cargo una factura me dice estos materiales, le digo okay y no hice nada con eso"*.

Por otro lado, existe un sistema viejo de materiales que genera confusión: muestra información desactualizada y duplicada respecto al módulo nuevo.

**Resultado**: el cliente tiene que registrar las cosas dos veces, o directamente no las registra.

---

## 2. ¿Qué queremos lograr?

### Objetivo principal
Que el cliente pueda ver, **en un solo lugar**, todo lo que gastó en materiales para cada obra, sin importar de dónde vinieron (compra directa, depósito, proveedor/acopio).

### Objetivos secundarios
1. Que al retirar materiales del proveedor (desacopio), el usuario pueda indicar si van a una obra o al depósito
2. Que una sola compra pueda distribuir materiales a diferentes destinos
3. Que el costo de materiales por obra se calcule siempre a **precio actual** del material (no al precio de cuando se compró)
4. Que cuando se carga una factura de compra de materiales en caja, los materiales detectados se puedan enviar a stock, obra o acopio de forma directa
5. Eliminar el sistema viejo de materiales que genera ruido y confusión

---

## 3. ¿Cómo funciona hoy vs. cómo va a funcionar?

### HOY (flujos separados)

```
FACTURA EN CAJA → IA extrae materiales → usuario dice "ok" → ??? (no pasa nada)

COMPRA DESDE STOCK → ¿Queda en proveedor?  → Acopio (módulo 1)
                     ¿Va a depósito?       → Stock (módulo 2)
                     ¿Va directo a obra?   → ??? (no hay camino claro)

RETIRO DE PROVEEDOR (desacopio) → Solo queda en Acopio
                                   No impacta en Stock
                                   No se ve en el costo de obra

SISTEMA VIEJO DE MATERIALES → Muestra datos desactualizados
                               Confunde al usuario
                               Duplica información con el módulo nuevo
```

### PROPUESTO (flujo conectado)

```
FACTURA/TICKET EN CAJA → IA extrae materiales → usuario elige destino:
         • 🏭 Enviar a depósito (stock)
         • 🏗️ Enviar a obra
         • 📦 Crear acopio (queda en proveedor)
         • ⏳ Pendiente de asignar (compré, no sé a dónde va todavía)
         • 🔀 Distribuir (parte a cada destino)

COMPRA DESDE STOCK → Distribución flexible por línea:
         • Parte al proveedor (acopio)
         • Parte al depósito (stock)
         • Parte directo a obra
         • Parte pendiente de asignar

RETIRO → Siempre es: origen → obra
         • Del depósito → obra (egreso de stock)
         • Del proveedor (desacopio) → obra

RESERVA EN DEPÓSITO (ya existe como transferencia):
         • Material está en depósito, pero se "reserva" para una obra
         • El material sigue contando en stock del depósito (es informativo)
         • El responsable de la obra puede consultar "qué materiales tengo reservados"
         • Cuando se retira físicamente, recién sale del stock

VISTA DE OBRA → Un solo lugar que muestra TODO:
         • Lo que vino del depósito
         • Lo que vino del proveedor (desacopio)
         • Lo que se compró directo desde caja
         • Lo reservado en depósito (marcado como "en depósito, reservado")
         • Total valorizado a precios de hoy

SISTEMA VIEJO → Eliminado (sin confusión)
```

> **Nota**: Funciona igual con facturas, tickets de ferretería, recibos o cualquier comprobante. Mientras más información tenga el comprobante, más datos extrae la IA, pero el flujo es el mismo.

---

## 4. Las 5 mejoras concretas

### Mejora 1: Vista unificada de materiales por obra

**¿Qué es?**  
Una nueva pantalla (o sección dentro de la obra) donde el cliente ve todos los materiales que se usaron en esa obra, sin importar de dónde vinieron.

**¿Qué muestra?**

| Material | Cantidad | Origen | Precio actual | Subtotal |
|---|---|---|---|---|
| Caño 20x20 | 10 | Depósito | $15.000 | $150.000 |
| Caño 15x15 | 4 | Acopio Prov. X | $12.000 | $48.000 |
| Pintura látex 20L | 5 | Compra directa | $45.000 | $225.000 |
| Cemento x50kg | 200 | Acopio Prov. Y | $8.500 | $1.700.000 |
| **Total materiales** | | | | **$2.123.000** |

**Indicadores que muestra:**
- ✅ Total invertido en materiales (a precio de hoy)
- ⏳ Materiales pendientes de entrega (del proveedor)
- ⚠️ Materiales sin precio cargado (para que el total sea confiable)

**¿Desde dónde se accede?**  
Desde la ficha de cada proyecto/obra + consultable por WhatsApp ("ver materiales obra Mendoza").

---

### Mejora 2: Solicitud de compra con distribución flexible

**¿Qué es?**  
Cuando el cliente registra una compra de materiales, puede indicar para cada línea a dónde va ese material.

**Ejemplo concreto (caso Carranza):**

> "Compré 1296 ladrillos al proveedor Cerámicos Norte"

| Material | Cantidad | Destino |
|---|---|---|
| Ladrillo hueco 12x18 | 200 | Obra Flores 35 |
| Ladrillo hueco 12x18 | 1096 | Queda en proveedor (acopio) |

**Destinos posibles por línea:**
- 🏗️ **Obra** → Impacta directo en el costo de la obra
- 🏭 **Depósito** → Queda como stock disponible de la empresa
- 📦 **Proveedor (acopio)** → Queda registrado como pendiente de retirar
- ⏳ **Pendiente de asignar** → Se compró, no se sabe a dónde va todavía

**¿Y si ya sé que es para una obra pero lo dejo en depósito?**  
Eso ya existe hoy: la **transferencia/reserva**. Mandás el material a depósito y lo reservás para una obra. El material sigue físicamente en el depósito (sigue contando en stock), pero la obra lo ve como "reservado". Cuando lo retirás, recién sale del stock.

**¿Cambia algo para el que ya usa stock normal?**  
No. Si no tenés acopio, simplemente el destino es siempre "depósito" u "obra". Funciona igual que hoy.

---

### Mejora 3: Desacopio con destino

**¿Qué es?**  
Cuando el cliente retira materiales del proveedor (desacopio), ahora puede elegir a dónde van.

**Ejemplo concreto (caso Carranza):**

> Remito de retiro de Cerámicos Norte: 500 ladrillos

| Material | Cantidad retirada | ¿A dónde va? |
|---|---|---|
| Ladrillo hueco 12x18 | 300 | Obra Flores 35 |
| Ladrillo hueco 12x18 | 200 | Depósito central |

**Resultado automático:**
- ✅ El acopio descuenta 500 ladrillos del disponible en proveedor
- ✅ 300 aparecen en el costo de materiales de Obra Flores 35
- ✅ 200 aparecen en el stock disponible de la empresa

**Esto resuelve el problema de Carranza**: hoy si desacopian, ese movimiento queda solo en el acopio y no se refleja en ningún otro lugar.

---

### Mejora 4: Materiales de factura → Stock / Obra / Acopio (desde Caja)

**¿Qué es?**  
Cuando un usuario carga una factura o ticket de compra de materiales en caja, el sistema ya extrae los materiales con IA. Hoy esos materiales quedan en el limbo. Con esta mejora, el usuario puede elegir qué hacer con ellos.

> Funciona con cualquier comprobante: factura, ticket de ferretería, recibo. Mientras más datos tenga, más extrae la IA, pero el flujo es el mismo.

**¿Cómo funciona?**

Después de confirmar la factura/ticket en caja, aparece un bloque:

```
📦 Materiales detectados (5 items)
┌─────────────────────────────────────────────┐
│  Caño 20x20 .......... 10 u                │
│  Pintura látex 20L ... 5 u                 │
│  Cemento x50kg ....... 200 u               │
└─────────────────────────────────────────────┘

¿Qué querés hacer con estos materiales?

  🏭 Enviar a depósito (quedan en stock)
  🏗️ Enviar a obra (se asignan al proyecto)
  📦 Crear acopio (quedan en el proveedor)
  ⏳ Pendiente de asignar (no sé a dónde van todavía)
  🔀 Distribuir (parte a cada destino)
  ❌ No hacer nada
```

**¿Qué es "Pendiente de asignar"?**  
Cuando comprás materiales para la empresa en general y todavía no sabés a qué obra van. Quedan registrados en stock sin proyecto. Después los podés asignar a una obra o descartarlos.

**Ejemplo concreto (caso Alvarado):**

> Andrés carga factura de ferretería: 10 caños y 5 tarros de pintura

| Material | Cantidad | Destino elegido |
|---|---|---|
| Caño 20x20 | 10 | Obra Todo Moda Mendoza |
| Pintura látex 20L | 5 | Depósito |

**Resultado automático:**
- ✅ 10 caños aparecen en el costo de materiales de Obra Mendoza
- ✅ 5 tarros de pintura aparecen en stock disponible
- ✅ La factura ya estaba registrada en caja (no se duplica)
- ✅ Se vincula la solicitud de stock con el movimiento de caja (trazabilidad)

**¿Cambia algo en la carga de facturas?**  
No. El proceso de cargar la factura y extraer materiales sigue exactamente igual. Solo se agrega una pregunta al final: "¿qué hacés con estos materiales?"

**Si el usuario elige "No hacer nada"**, funciona exactamente como hoy. Nada cambia para el que no quiere usar stock.

---

### Mejora 5: Limpieza del sistema viejo de materiales

**¿Qué es?**  
Existe un sistema anterior de movimientos de materiales que quedó desactualizado. Muestra información vieja, no está conectado con el módulo nuevo de stock, y genera confusión.

**¿Qué se hace?**
- Se **elimina** la pantalla vieja de movimientos de materiales (la que muestra "Entrada/Salida" con validación manual)
- Se **elimina** la sección de materiales dentro del formulario de movimiento de caja que sincronizaba con el sistema viejo
- Se **reemplaza** por las nuevas acciones de la Mejora 4 (enviar a stock / obra / acopio)

**¿Se pierde información?**  
No. Los datos históricos quedan almacenados. Solo se retira la interfaz porque ya no refleja la realidad y confunde más de lo que ayuda.

**¿A quién afecta?**  
A los usuarios que hoy ven la sección de materiales dentro de una factura. En vez de ver una tabla que no hace nada útil, van a ver las opciones de la Mejora 4 que sí generan impacto real.

---

## 5. Tema precios

### Principio: el precio del material es un valor vivo

- Cada material tiene **un precio de referencia actual** que el usuario actualiza cuando quiere
- Todos los cálculos de costo (por obra, por stock valorizado) se hacen **siempre con el precio actual**
- No se congela el precio al momento de la compra ni del movimiento
- Si se actualiza el precio de un material, automáticamente todos los reportes reflejan el nuevo valor

### ¿Por qué?

En el contexto argentino, un precio de hace 3 meses no representa la realidad. Los clientes necesitan ver "cuánto vale mi obra en materiales HOY", no "cuánto pagué históricamente".

### Indicador de precio desactualizado

Si un material no tiene precio, o el precio no se actualizó hace más de 30 días, se muestra un indicador visual (⚠️) para que el usuario sepa que el cálculo puede estar incompleto o desactualizado.

---

## 6. Configuración por empresa

### Principio: cada empresa usa stock a su manera

No todas las empresas necesitan lo mismo. El módulo de stock se configura **por empresa** con ejes independientes que se activan según la necesidad. La activación la hace el equipo de Sorby.

### Ejes de configuración

| Eje | Desactivado (default) | Activado |
|---|---|---|
| **Acopio** | Solo depósito y obra como destinos | Se habilita "Crear acopio" + desacopio con destino |
| **Distribución por línea** | Todo el material va al mismo destino | Cada línea de la compra puede ir a un destino diferente |
| **Validación de movimientos** | El movimiento se confirma al instante | Los movimientos quedan en estado pendiente hasta que alguien confirma |

### ¿Cómo se ve cada eje?

**Sin acopio (default):**  
Al comprar material, las opciones son: depósito, obra, pendiente de asignar. Simple.

**Con acopio:**  
Se agrega la opción "Crear acopio" al comprar y "Desacopio con destino" al retirar del proveedor.

**Sin distribución por línea (default):**  
Al comprar, todo va al mismo destino. "Enviar todo a obra Flores" → listo.

**Con distribución por línea:**  
Se agrega la opción "Distribuir" donde cada material puede ir a un destino diferente. Pensado para empresas que compran en volumen y distribuyen a varias obras.

**Sin validación (default):**  
Cuando registrás una compra o un retiro, el movimiento se confirma automáticamente. Sin fricción.

**Con validación:**  
Los movimientos quedan en estado "pendiente de confirmar" hasta que alguien los valida. El material **ya cuenta** en el stock (no se bloquea), pero queda marcado como pendiente. Cualquier usuario puede confirmar. Útil para empresas que quieren un doble chequeo (ej: "compré material, queda pendiente hasta que llega al depósito").

### ¿Quién configura esto?

Por ahora lo activa el equipo de Sorby según la necesidad del cliente. No es un switch que el usuario toque solo.

---

## 7. ¿Qué cambia y qué NO cambia?

**No cambia:**
- El módulo de Acopio sigue funcionando igual que hoy
- El módulo de Stock (nuevo) sigue funcionando igual que hoy
- La carga de facturas por IA sigue igual
- Los flujos de WhatsApp existentes siguen funcionando
- Los movimientos financieros de caja siguen funcionando igual

**Sí cambia:**
- Se **elimina** la pantalla vieja de movimientos de materiales (sistema legacy)
- Se **reemplaza** la sección de materiales dentro del formulario de factura por las nuevas acciones (enviar a stock / obra / acopio / pendiente)
- Se **agrega** la vista unificada de materiales por obra (incluye materiales reservados en depósito)
- Se **agrega** la posibilidad de elegir destino al desacopiar
- Se **agrega** el destino "Pendiente de asignar" para compras sin destino definido
- Se **agrega** configuración por empresa para activar/desactivar ejes (acopio, distribución, validación)

**Principio**: se quita lo que confunde, se agrega lo que conecta.

---

## 8. Flujo del usuario — Caso completo

### Escenario: Constructora Alvarado, Obra Todo Moda Mendoza

**Semana 1 — Compra inicial (desde caja)**
1. Andrés carga la factura de Cerámicos Norte en el bot de WhatsApp
2. La factura se registra en caja como egreso ✅
3. El sistema extrae los materiales con IA: 1296 ladrillos
4. Andrés abre la factura en la web y ve: "📦 Materiales detectados: 1296 ladrillos"
5. Elige "Distribuir":
   - 200 → Obra Mendoza
   - 1096 → Crear acopio en Cerámicos Norte
6. ✅ Obra Mendoza muestra: 200 ladrillos consumidos
7. ✅ Acopio muestra: 1096 ladrillos disponibles en Cerámicos Norte
8. ✅ La factura en caja queda vinculada (no se puede volver a generar stock de la misma factura)

**Semana 2 — Compra de herrería (desde caja)**
1. Diego carga factura de ferretería: 10 caños 20x20 y 5 tarros de pintura
2. Abre la factura → ve materiales detectados
3. Elige "Enviar a depósito"
4. ✅ Stock muestra: 10 caños y 5 tarros de pintura disponibles

**Semana 3 — Retiro parcial del proveedor**
1. Andrés retira 300 ladrillos de Cerámicos Norte
2. Sube remito → el sistema crea el desacopio
3. Andrés indica: 300 → Obra Mendoza
4. ✅ Acopio descuenta 300 (quedan 796)
5. ✅ Obra Mendoza muestra: 500 ladrillos consumidos (200 + 300)

**Semana 5 — Retiro de depósito**
1. Diego saca 10 caños del depósito para Obra Mendoza
2. Registra egreso de stock → Obra Mendoza
3. ✅ Obra Mendoza muestra: 500 ladrillos + 10 caños

**Fin de obra — Reporte**
1. Fabio pide: "cuánto gastamos en materiales en Mendoza"
2. El sistema muestra la vista unificada:
   - 500 ladrillos × $8.500 = $4.250.000
   - 10 caños × $15.000 = $150.000
   - Total: $4.400.000 (a precios de hoy)
3. También ve: 796 ladrillos aún disponibles en proveedor
4. Cada línea tiene trazabilidad: de qué factura vino, si pasó por acopio o stock

---

## 9. Preguntas abiertas para validar

1. ¿La vista de materiales por obra debería ser accesible para los arquitectos de campo o solo para administración?
2. ¿Quieren recibir alertas automáticas cuando hay material pendiente de retirar del proveedor hace más de X días?
3. ¿Es útil poder comparar el costo de materiales entre obras? (ej: "¿en qué obra gasté más en cemento?")
4. ¿Necesitan poder exportar la vista de materiales por obra a PDF/Excel para presentar a clientes?
5. Cuando cargan una factura de materiales en caja, ¿prefieren que el sistema les pregunte siempre qué hacer con los materiales, o que sea opcional (un botón que pueden ignorar)?
6. Para "Pendiente de asignar": ¿debería haber un recordatorio automático después de X días? ¿O el usuario lo resuelve cuando quiere?
7. ¿La validación de movimientos debería bloquear algo, o es solo informativa (el material ya cuenta, pero queda marcado como pendiente de confirmar)?

---

## Anexo: Glosario

| Término | Significado |
|---|---|
| **Acopio** | Material comprado que queda en poder del proveedor hasta que se retira |
| **Desacopio** | Retiro de material del proveedor |
| **Stock / Depósito** | Material que la empresa tiene físicamente en su poder |
| **Solicitud** | Ticket que agrupa una operación de compra/retiro/transferencia con sus líneas de materiales |
| **Conciliación** | Proceso de vincular un nombre de material (ej: de una factura) con un material del catálogo |
| **Precio de referencia** | Precio actual del material, actualizable por el usuario |
| **Pendiente de asignar** | Material comprado que todavía no tiene un destino definido (obra, depósito, acopio). Estado temporal que se resuelve o descarta |
| **Reserva** | Material que está en depósito pero está asignado lógicamente a una obra. Sigue contando en stock del depósito. Es informativo. Funciona con la transferencia existente |
| **Validación** | Instancia opcional donde un movimiento queda "pendiente de confirmar" hasta que alguien lo valida. El material ya cuenta, pero queda marcado |
