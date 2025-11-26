# Portal del Cliente - Documentación

## 📋 Descripción General

El Portal del Cliente es una aplicación web que permite a los clientes acceder a toda la información de sus contratos de forma transparente y en tiempo real, reduciendo la necesidad de soporte administrativo.

## ✨ Características Implementadas

### 🏠 PC1 - Home del Cliente

Vista principal con resumen ejecutivo:
- **Información del Contrato**: Emprendimiento, lote, estado, fechas
- **Indicadores Financieros**: Precio acordado, total pagado, saldo pendiente, cuota mensual
- **Barra de Progreso**: Visualización del avance de pagos
- **Alertas Inteligentes**: Cuotas vencidas y próximos vencimientos
- **Resumen de Servicios**: Vista previa de los 2 primeros servicios contratados
- **Accesos Rápidos**: Botones para navegar a pagos, servicios, documentos y estado de cuenta
- **Último Pago**: Información del último pago registrado

### 💰 PC2 - Estado de Cuenta

Detalle completo de operaciones financieras:
- **Tabla Cronológica**: Todos los movimientos (cuotas, pagos, servicios, préstamos)
- **Resumen Financiero**: Total generado, total pagado, saldo actual
- **Descarga de Comprobantes**: Acceso directo a PDFs de pagos
- **Exportar Estado de Cuenta**: Botón para descargar PDF completo
- **Código de Colores**: Verde (pagado), Rojo (vencido), Amarillo (pendiente)

### PC2.5 - Mis Servicios *(NUEVO)*

Gestión completa de servicios contratados:
- **Vista Detallada por Servicio**:
  - Alambrado Perimetral (con metros lineales medidos)
  - Nivelación de Terreno (con barra de progreso)
  - Corte de Césped (servicio mensual recurrente)
  - Conexión de Agua Potable
  - Instalación Eléctrica
  - Limpieza y Desmonte
  - Otros servicios del emprendimiento
  
- **Información Mostrada**:
  - Precio total del servicio
  - Monto pagado y saldo pendiente
  - Cuotas mensuales (si aplica)
  - Fechas de inicio y finalización estimada
  - Metros medidos (para servicios que requieren medición)
  - Porcentaje de avance (para servicios en proceso)
  - Estado actual (Completado, En Proceso, Activo, Pendiente, Cotizado)
  
- **Resumen Financiero de Servicios**:
  - Total invertido en servicios
  - Total pagado en servicios
  - Saldo pendiente en servicios

### 📄 PC3 - Documentos

Repositorio de documentación oficial:
- **Documentos Disponibles**:
  - Contrato de compraventa
  - Boleto de reserva
  - Cronograma de pagos
  - Reglamento del emprendimiento
  - Recibos y comprobantes
  - Comunicaciones oficiales
  
- **Funcionalidades**:
  - Descarga directa de PDFs
  - Organización por tipo
  - Vista previa online
  - Control de visibilidad desde administración

### 💳 PC4 - Pagos Online

Sistema de pagos integrado:
- **Opciones de Pago**:
  - Cuota del mes
  - Anticipos
  - Servicios adicionales
  
- **Medios de Pago**:
  - Transferencia bancaria
  - Tarjeta de débito
  - Tarjeta de crédito
  
- **Proceso de Pago**:
  1. Selección del concepto
  2. Elección del medio de pago
  3. Upload de comprobante (para transferencias)
  4. Confirmación
  5. Validación por Tesorería
  
- **Datos Bancarios**: CBU, Alias, Titular visibles para transferencias

## 🔄 Múltiples Contratos *(NUEVO)*

### Selector de Contratos

Cuando un cliente tiene más de un contrato:
- **Botón en Header**: "Contrato [NÚMERO]" con icono de intercambio
- **Dialog de Selección**: Lista visual de todos los contratos del cliente
- **Información Mostrada**:
  - Emprendimiento y ubicación
  - Lote, manzana y superficie
  - Número de contrato
  - Estado (Activo, Reserva, etc.)
  - Saldo pendiente
  
- **Cambio de Contexto**: Al seleccionar otro contrato, toda la vista se actualiza:
  - Home
  - Estado de cuenta
  - Servicios
  - Documentos
  - Pagos

### Indicador Visual
- El contrato actualmente seleccionado se destaca con:
  - Borde azul
  - Fondo celeste claro
  - Resaltado en la lista

## 🎨 Diseño y UX

### Paleta de Colores Semántica
- **Azul (#1976d2)**: Información general, header
- **Verde (#4caf50)**: Pagos completados, estados positivos
- **Rojo (#f44336)**: Vencidos, alertas críticas
- **Amarillo/Naranja (#ff9800)**: Pendientes, advertencias
- **Gris (#757575)**: Información secundaria

### Componentes UI
- **Material-UI**: Framework de diseño
- **Responsive**: Adapta a mobile, tablet y desktop
- **Cards y Papers**: Organización visual clara
- **Chips**: Estados y categorías
- **Progress Bars**: Avances visuales
- **Dialogs**: Modales para acciones importantes

### Navegación
- **Tabs Principales**: 5 secciones (Inicio, Estado de Cuenta, Servicios, Documentos, Pagos)
- **Breadcrumbs**: En header (nombre del cliente)
- **Botones de Acción**: CTAs claros y destacados

## 🔐 Seguridad

### Autenticación
- **Token en URL**: `/portal-cliente/[token]`
- **URLs Firmadas**: Expiración automática
- **Sesión Individual**: Cada cliente solo ve sus contratos

### Privacidad
- **Documentos Controlados**: Solo visibles si admin los habilita
- **Datos Sensibles**: Protegidos y encriptados
- **Auditoría**: Registro de accesos y descargas

## 📊 Datos Mock Incluidos

### Contratos de Ejemplo
1. **Contrato CR1-001** (Activo):
   - Lote 15, Manzana A (350 m²)
   - 3 servicios:
     - Alambrado Perimetral Básico (Completado - 190 metros)
     - Nivelación de Terreno (En Proceso - 50% avance)
     - Corte de Césped Mensual (Activo - servicio recurrente)
   - 20 cuotas pagadas de 24

2. **Contrato CR1-042** (Reserva):
   - Lote 28, Manzana C (400 m²)
   - 3 servicios:
     - Conexión de Agua Potable (En Proceso - 30% avance)
     - Instalación Eléctrica Básica (Cotizado)
     - Limpieza y Desmonte Inicial (Pendiente - 400 m²)
   - Reciente, con anticipo pagado

### Servicios Incluidos
- **Alambrado Perimetral**: 190 metros lineales completados
- **Nivelación de Terreno**: 350 m² en proceso (50% de avance)
- **Corte de Césped**: Servicio mensual activo ($3,500/mes)
- **Conexión de Agua Potable**: En proceso, incluye medidor
- **Instalación Eléctrica**: Cotizado, con tablero principal
- **Limpieza y Desmonte**: Pendiente, 400 m² de terreno

## 🚀 Próximas Mejoras Sugeridas

1. **Notificaciones Push**: Alertas de vencimientos
2. **Chat en Vivo**: Soporte directo desde el portal
3. **Galería de Fotos**: Avance de construcción con imágenes
4. **Calendario de Pagos**: Vista mensual/anual
5. **Simulador de Refinanciación**: Calcular nuevos planes
6. **Firma Digital**: Documentos firmables online
7. **Pagos Recurrentes**: Débito automático

## 📱 Acceso al Portal

### URL de Acceso
```
/loteParaTodosMock/portal-cliente/[token-unico-del-cliente]
```

### Ejemplo
```
http://localhost:3000/loteParaTodosMock/portal-cliente/abc123xyz789
```

## 🛠️ Tecnologías Utilizadas

- **Next.js**: Framework React con SSR
- **Material-UI**: Componentes y diseño
- **React Hooks**: useState, useMemo para gestión de estado
- **JavaScript ES6+**: Sintaxis moderna

## 📞 Soporte

Para consultas sobre el Portal del Cliente, contactar al equipo de desarrollo o al área de IT.

---

**Última Actualización**: 24 de noviembre de 2025
**Versión**: 2.0 (con Servicios y Múltiples Contratos)
