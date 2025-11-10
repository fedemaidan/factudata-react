# Funcionalidad: Pago entre cajas (Egreso con Caja Pagadora)

## Resumen
Implementación completa de la funcionalidad que permite crear gastos de un proyecto que son pagados desde una caja diferente, manteniendo la trazabilidad contable y la consistencia de los flujos de caja.

## Caso de uso típico
**Escenario:** "Pago la instalación eléctrica del Lote 5, desde Caja Omar."

**Resultado:** El sistema registra automáticamente:
1. Transferencia desde "Caja Omar" hacia "Lote 5"
2. Egreso en "Lote 5" por "Instalación eléctrica"

## Arquitectura implementada

### Backend (Node.js/Express)

#### 1. Función principal: `addEgresoConCajaPagadora`
**Ubicación:** `/utils/dataService.js`

**Parámetros:**
- `datosEgreso`: Objeto con los datos del gasto (proveedor, categoría, total, etc.)
- `proyectoPagadorId`: ID del proyecto/caja que realizará el pago
- `proyectoPagadorNombre`: Nombre del proyecto/caja pagadora
- `guardar`: Boolean para guardar en BD (default: true)
- `actualizaSheets`: Boolean para actualizar hojas de cálculo (default: true)

**Proceso automático:**
1. **Validaciones:**
   - Verificar que los proyectos existan
   - Validar que no sean el mismo proyecto
   - Validar que el total sea mayor a 0

2. **Crear 3 movimientos:**
   - **Egreso de transferencia** en caja pagadora
   - **Ingreso de transferencia** en caja del proyecto
   - **Egreso operativo** en caja del proyecto

3. **Flags especiales:**
   - `es_pago_entre_cajas: true`
   - `movimiento_relacionado_tipo: 'transferencia_pago' | 'egreso_operativo'`
   - `caja_pagadora_id` y `caja_pagadora_nombre` en el egreso operativo

#### 2. Endpoint REST: `/egreso-con-caja-pagadora/`
**Método:** POST
**Autenticación:** Requerida

**Body esperado:**
```json
{
  "datosEgreso": {
    "proyecto_id": "proyecto123",
    "proyecto_nombre": "Lote 5",
    "nombre_proveedor": "Electricista SA",
    "categoria": "Instalaciones",
    "total": 50000,
    "moneda": "ARS",
    "observacion": "Instalación eléctrica completa"
  },
  "proyectoPagadorId": "proyecto456",
  "proyectoPagadorNombre": "Caja Omar"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Egreso con caja pagadora creado con éxito",
  "resultado": {
    "success": true,
    "movimientosCreados": 3,
    "presupuestosImpactados": 2,
    "detalles": {
      "proyectoEgreso": "Lote 5",
      "proyectoPagador": "Caja Omar",
      "concepto": "Instalaciones",
      "proveedor": "Electricista SA",
      "total": 50000,
      "moneda": "ARS"
    }
  }
}
```

### Frontend (React/Material-UI)

#### 1. Servicio: `movimientosService.createEgresoConCajaPagadora`
**Ubicación:** `/src/services/movimientosService.js`

**Uso:**
```javascript
const resultado = await movimientosService.createEgresoConCajaPagadora(
  datosEgreso,
  proyectoPagadorId,
  proyectoPagadorNombre
);
```

#### 2. Componente principal: `EgresoConCajaPagadoraDialog`
**Ubicación:** `/src/components/EgresoConCajaPagadoraDialog.js`

**Props:**
- `open`: Boolean para mostrar el diálogo
- `onClose`: Función callback al cerrar
- `datosEgreso`: Datos del egreso a crear
- `proyectos`: Lista de proyectos disponibles como caja pagadora
- `onSuccess`: Callback cuando se crea exitosamente

**Características:**
- Selector de caja pagadora con filtrado automático
- Vista previa del egreso a crear
- Explicación detallada del proceso automático
- Validaciones en tiempo real
- Manejo de errores

#### 3. Componente informativo: `PagoEntreCajasInfo`
**Ubicación:** `/src/components/PagoEntreCajasInfo.js`

**Funcionalidad:**
- Se muestra automáticamente en movimientos con `es_pago_entre_cajas: true`
- Explica la mecánica del pago entre cajas
- Diferencia entre egreso operativo y transferencia
- Trazabilidad visual del flujo de fondos

#### 4. Integración en formulario: `movementForm.js`
**Nuevos elementos:**
- Botón "Pagar desde otra caja" en la barra de acciones
- Diálogo modal para seleccionar caja pagadora
- Componente informativo para movimientos existentes
- Tooltips explicativos y validaciones

**Condiciones para mostrar el botón:**
- Modo crear (no edición)
- Tipo de movimiento = 'egreso'
- Proyecto seleccionado
- Total completado
- Más de un proyecto disponible

## Contabilidad y flujos

### Ejemplo práctico:
**Caso:** Pagar $50,000 de "Instalación eléctrica" del "Lote 5" desde "Caja Omar"

**Movimientos generados:**

1. **En Caja Omar:**
   ```
   Egreso: $50,000
   Categoría: Transferencia
   Subcategoría: Lote 5
   Concepto: Financiación de Instalaciones - Electricista SA
   ```

2. **En Lote 5:**
   ```
   Ingreso: $50,000
   Categoría: Transferencia  
   Subcategoría: Caja Omar
   Concepto: Recepción de fondos desde Caja Omar para Instalaciones
   ```

3. **En Lote 5:**
   ```
   Egreso: $50,000
   Categoría: Instalaciones
   Proveedor: Electricista SA
   Concepto: Instalación eléctrica completa - Pagado desde Caja Omar
   ```

### Resultado en reportes:
- **Caja Omar:** Ve un egreso por transferencia (sabe que financió al Lote 5)
- **Lote 5:** Ve el ingreso de transferencia y su egreso operativo (flujo consistente)
- **Reporte por proyecto Lote 5:** Muestra el gasto correcto de instalaciones
- **Reporte por caja Omar:** Muestra que salió dinero para financiar otro proyecto

## Beneficios implementados

### Para el usuario:
1. **Un solo paso:** Crear el gasto y especificar la caja pagadora
2. **Trazabilidad completa:** Todos los movimientos quedan registrados automáticamente
3. **Explicación clara:** Tooltips y componentes informativos explican el proceso
4. **Validaciones:** Previene errores comunes (mismo proyecto, falta de datos, etc.)

### Para la contabilidad:
1. **Consistencia:** Cada caja mantiene su flujo correcto
2. **Transparencia:** Se ve claramente de dónde salió el dinero
3. **Categorización correcta:** El gasto queda imputado al proyecto correcto
4. **Reconciliación:** Los totales por proyecto y por caja son coherentes

### Para los reportes:
1. **Por proyecto:** Muestra todos los gastos correctamente categorizados
2. **Por caja:** Muestra las transferencias como trazabilidad del financiamiento
3. **Consolidado:** Los totales generales siguen siendo correctos
4. **Auditoría:** Fácil seguimiento de los fondos entre cajas

## Consideraciones técnicas

### Flags de identificación:
- `es_pago_entre_cajas: true`: Identifica movimientos de este flujo
- `movimiento_relacionado_tipo`: Diferencia entre transferencia y egreso operativo
- `caja_pagadora_id/nombre`: Trazabilidad en el egreso operativo

### Manejo de errores:
- Validaciones tanto en frontend como backend
- Rollback automático si falla algún movimiento
- Mensajes de error descriptivos
- Logs detallados para debugging

### Performance:
- Operaciones en lote para crear los 3 movimientos
- Actualización de hojas de cálculo optimizada
- Carga diferida de proyectos disponibles

## Testing y casos de prueba

### Casos válidos:
1. Egreso simple pagado desde otra caja
2. Egreso con impuestos pagado desde otra caja
3. Egreso en USD pagado desde caja en ARS
4. Múltiples egresos del mismo proyecto pagados desde cajas diferentes

### Casos de error:
1. Intentar pagar desde el mismo proyecto
2. Proyecto pagador inexistente
3. Total cero o negativo
4. Usuario sin permisos en proyecto pagador

### Validaciones UI:
1. Botón deshabilitado sin datos completos
2. Tooltip explicativo cuando está deshabilitado
3. Selector filtra proyectos válidos automáticamente
4. Preview del egreso antes de confirmar

## Archivos modificados/creados

### Backend:
- `utils/dataService.js`: Nueva función `addEgresoConCajaPagadora`
- `src/routes/routes.js`: Nuevo endpoint `/egreso-con-caja-pagadora/`

### Frontend:
- `src/services/movimientosService.js`: Nuevo método `createEgresoConCajaPagadora`
- `src/components/EgresoConCajaPagadoraDialog.js`: Diálogo principal (nuevo)
- `src/components/PagoEntreCajasInfo.js`: Componente informativo (nuevo)
- `src/pages/movementForm.js`: Integración del botón y diálogos

## Próximas mejoras sugeridas

1. **Reportes especializados:** Vista consolidada de pagos entre cajas
2. **Configuración por empresa:** Permitir/restringir qué proyectos pueden pagar por otros
3. **Límites de pago:** Configurar montos máximos para pagos entre cajas
4. **Notificaciones:** Alertar a responsables cuando se usan sus cajas para pagar
5. **Historial:** Vista de todos los pagos realizados/recibidos por cada caja
6. **Conciliación:** Herramientas para verificar que las transferencias automáticas son correctas