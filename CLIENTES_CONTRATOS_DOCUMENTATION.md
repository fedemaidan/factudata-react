# Clientes & Contratos — Documento funcional para validación (Lote Para Todos)

> **Contexto:** Este documento resume, en lenguaje de negocio, el alcance del módulo Clientes & Contratos. Está pensado para conversar con el cliente final y asegurarnos de que la solución propuesta cubre sus necesidades. No contiene referencias técnicas ni nombres de archivos.

## 1. Objetivo del módulo

Centralizar todo lo relacionado con clientes y contratos dentro de Lote Para Todos, brindando a ventas, administración y atención al cliente una única herramienta para:

- Monitorear el estado comercial de cada persona o empresa (prospectos, reservas, contratos vigentes, mora).
- Ejecutar reservas o ventas guiadas sin errores ni pasos duplicados.
- Consultar y actualizar la información crítica de cada contrato: pagos, documentación, comentarios internos y alertas.

## 2. Alcance y exclusiones

| Incluido | Descripción |
| --- | --- |
| Seguimiento de clientes | Tableros con filtros avanzados, indicadores y acciones rápidas.
| Resúmenes 360° | Vista consolidada de contratos, saldos, servicios y crédito disponible.
| Wizard de venta/reserva | Flujo guiado en cuatro pasos para iniciar nuevas operaciones.
| Gestión de contratos | Listado global con métricas y ficha detallada por contrato.
| Pagos/Comentarios/Re-financiaciones | Diálogos controlados para registrar acciones administrativas.

| Excluido | Motivo |
| --- | --- |
| Definición de planes, precios o estados del lote | Se administran en el módulo de Emprendimientos & Lotes.
| Creación de productos financieros o catálogos maestros | Fuera del alcance de este módulo.
| Automatización contable completa | Requiere integraciones futuras; hoy se registran eventos operativos.

## 3. Perfiles y beneficios

| Perfil | Necesidad cubierta | Beneficios clave |
| --- | --- | --- |
| Comercial | Saber quién está listo para avanzar o requiere seguimiento. | KPIs, filtros guardables, acceso a wizard en un clic.
| Cobranzas | Detectar mora, registrar promesas y pagos. | Alertas visuales, diálogo de pagos, exportación para reportes.
| Atención al cliente | Responder consultas sin pedir información adicional a otras áreas. | Resumen 360, historial de servicios y préstamos, notas internas.

## 4. Experiencia por pantalla

### 4.1 C1 – Tablero de Clientes
- Vista inicial del módulo.
- Indicadores: clientes totales, pagados, al día, en mora, reservados y potenciales.
- Filtros por datos personales y por relación con el emprendimiento (ej. lote asignado, estado comercial).
- Acciones inmediatas: abrir resumen, ver estado de cuenta, editar datos o eliminar.
- Exportación de la vista filtrada para reportes externos.

### 4.2 Resumen 360 / Estado de cuenta
- Se abre como un panel lateral sin perder el contexto.
- KPIs del cliente (contratos activos, saldo total, crédito disponible).
- Detalle de cada contrato con su lote, emprendimiento, vendedor y último pago.
- Acciones habilitadas según perfil: registrar pago, contratar servicios anexos, solicitar préstamo interno, abrir ficha del contrato.
- Explicación clara de cómo se calcula el saldo y el estado (“al día”, “mora”, etc.).

### 4.3 Wizard de Venta / Reserva
- Flujo en cuatro pasos: cliente → emprendimiento/lote → modo de pago → confirmación.
- Permite crear un cliente nuevo sin abandonar el asistente.
- Sólo muestra lotes disponibles del emprendimiento elegido y alerta si están bloqueados.
- Calcula automáticamente el plan seleccionado (entrega, cuotas, descuentos/recargos).
- Resumen final con todos los datos para validar antes de confirmar.

### 4.4 K1 – Tablero de Contratos
- Tarjetas con métricas financieras (monto vendido, saldo pendiente, contratos activos/caídos).
- Búsqueda avanzada por ID, cliente, DNI, lote, vendedor o emprendimiento.
- Navegación directa hacia la ficha para profundizar o registrar un evento.
- Exportación de la vista filtrada a Excel para auditorías o reportes.

### 4.5 K1-Detalle – Ficha del Contrato
- Pestañas temáticas:
  1. Información general (cliente, vendedor, plan, fechas, entregas, cuotas).
  2. Lote y emprendimiento (medidas, servicios, estado, responsables).
  3. Cuotas y pagos (calendario por ciclos, próximos vencimientos, progreso).
  4. Cuenta corriente (saldo real considerando entregas, cuotas y pagos).
  5. Documentación (boletos, pagarés, anexos, estado por cada documento).
- Diálogos asociados: comentarios internos, registro de pagos, solicitud de re-financiación, edición de campos administrativos.

## 5. Flujos principales

1. **Seguimiento diario**
	- Inicia en C1 con filtros guardados (ej. “Clientes en mora”).
	- Abre el resumen 360 para ver detalle y tomar una acción (comentario, pago, recordatorio).

2. **Venta guiada**
	- Desde C1 se lanza el wizard.
	- Se valida la disponibilidad del lote y se muestra el cálculo financiero.
	- Se confirma con todos los datos visibles y se deja al cliente en estado “Reservado”.

3. **Gestión administrativa del contrato**
	- Cobranzas ingresa a K1, aplica filtros por estado y entra a la ficha.
	- Registra pagos o solicita re-financiación con justificación.

4. **Alertas y auditoría**
	- Chips y mensajes indican cuotas vencidas, documentos faltantes, deudas municipales o bloqueos por legales.
	- Cada acción queda registrada con fecha y usuario para futuras revisiones.

## 6. Integraciones y dependencias

- **Catálogos**: reutiliza los datos maestros de Emprendimientos & Lotes (precios, planes, estados, servicios).
- **Documentos**: se enlaza con carpetas externas (Drive, SharePoint) para consultas y versiones vigentes.
- **Pagos & préstamos**: se prepara para conectarse con plataformas de firma/cobro (Tractea, Merchant). Inicialmente opera en modo “registro” y luego se habilitará la integración real.
- **Alertas**: puede recibir información de deuda municipal u otras fuentes externas para colorear los lotes y contratos.

## 7. Roadmap y próximos pasos

1. Validar con el cliente final este diseño funcional.
2. Ajustar permisos por rol/perfil según feedback.
3. Priorizar integraciones críticas (pagos reales, documentos firmados).
4. Planificar capacitaciones para los equipos que adoptarán el módulo.
5. Definir métricas de éxito post-implementación (tiempo de respuesta, reducción de mora, etc.).

---

### Versión para Notion

```
Clientes & Contratos — Documento funcional

1. Objetivo
- Control unificado del pipeline comercial.
- Asistente guiado para reservas/ventas.
- Gestión integral de contratos vigentes.

2. Alcance
- Tablero de clientes con KPIs y filtros.
- Resumen 360 y estado de cuenta.
- Wizard de venta en 4 pasos.
- Tablero y ficha de contratos.
- Pagos, comentarios y re-financiaciones controladas.

3. Perfiles y beneficios
- Comercial: visibilidad y acción en un clic.
- Cobranzas: alertas de mora, registro de pagos.
- Atención: respuestas rápidas con toda la info.

4. Pantallas
- C1 Tablero de Clientes.
- Resumen 360 / Estado de cuenta.
- Wizard de venta.
- K1 Tablero de Contratos.
- K1-Detalle Ficha del contrato.

5. Flujos
- Seguimiento diario.
- Venta guiada.
- Gestión administrativa.
- Alertas y auditoría.

6. Integraciones
- Catálogos de Emprendimientos & Lotes.
- Documentos en Drive/SharePoint.
- Pagos/Firmas (Tractea, Merchant) en roadmap.

7. Próximos pasos
- Validar con cliente.
- Ajustar permisos.
- Priorizar integraciones.
- Capacitar equipos.
```
