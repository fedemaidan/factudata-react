// src/data/loteParaTodos/mockPrestamos.js

import { CONFIG_DEUDA_MUNICIPAL } from './constantes';

export const ESTADO_PRESTAMO = {
  SOLICITADO: 'solicitado',
  APROBADO: 'aprobado',
  DESEMBOLSADO: 'desembolsado',
  ACTIVO: 'activo',
  COMPLETADO: 'completado',
  VENCIDO: 'vencido',
  REFINANCIADO: 'refinanciado',
  CANCELADO: 'cancelado'
};

export const ESTADO_PRESTAMO_LABELS = {
  [ESTADO_PRESTAMO.SOLICITADO]: 'Solicitado',
  [ESTADO_PRESTAMO.APROBADO]: 'Aprobado',
  [ESTADO_PRESTAMO.DESEMBOLSADO]: 'Desembolsado',
  [ESTADO_PRESTAMO.ACTIVO]: 'Activo',
  [ESTADO_PRESTAMO.COMPLETADO]: 'Completado',
  [ESTADO_PRESTAMO.VENCIDO]: 'Vencido',
  [ESTADO_PRESTAMO.REFINANCIADO]: 'Refinanciado',
  [ESTADO_PRESTAMO.CANCELADO]: 'Cancelado'
};

export const TIPO_PRESTAMO = {
  MEJORAS: 'mejoras',
  EMERGENCIA: 'emergencia',
  CONSTRUCCION: 'construccion',
  SERVICIOS: 'servicios'
};

export const TIPO_PRESTAMO_LABELS = {
  [TIPO_PRESTAMO.MEJORAS]: 'Para Mejoras del Lote',
  [TIPO_PRESTAMO.EMERGENCIA]: 'Préstamo de Emergencia',
  [TIPO_PRESTAMO.CONSTRUCCION]: 'Para Construcción',
  [TIPO_PRESTAMO.SERVICIOS]: 'Para Contratación de Servicios'
};

export const mockPrestamos = [
  {
    id: 1,
    cliente_id: 2,
    garantia_lote_id: 7, // Lote que garantiza el préstamo
    tipo: TIPO_PRESTAMO.MEJORAS,
    monto_solicitado: 15000,
    monto_aprobado: 15000,
    plazo_meses: 6,
    tasa_interes_mensual: 2.5, // 2.5% mensual
    cuota_mensual: 2750,
    fecha_solicitud: '2024-01-15',
    fecha_aprobacion: '2024-01-20',
    fecha_desembolso: '2024-02-01',
    fecha_primer_vencimiento: '2024-03-01',
    estado: ESTADO_PRESTAMO.ACTIVO,
    motivo: 'Construcción de galpón en lote 7',
    observaciones: 'Préstamo aprobado con garantía del lote',
    vendedor_id: 'maria.garcia',
    user_aprobacion: 'admin'
  },
  {
    id: 2,
    cliente_id: 3,
    garantia_lote_id: 12,
    tipo: TIPO_PRESTAMO.SERVICIOS,
    monto_solicitado: 45000,
    monto_aprobado: 40000,
    plazo_meses: 12,
    tasa_interes_mensual: 2.0,
    cuota_mensual: 3760,
    fecha_solicitud: '2023-10-05',
    fecha_aprobacion: '2023-10-08',
    fecha_desembolso: '2023-10-15',
    fecha_primer_vencimiento: '2023-11-15',
    estado: ESTADO_PRESTAMO.COMPLETADO,
    motivo: 'Instalación de servicios básicos (agua, luz, gas)',
    observaciones: 'Préstamo completado exitosamente',
    vendedor_id: 'carlos.lopez',
    user_aprobacion: 'admin'
  },
  {
    id: 3,
    cliente_id: 1,
    garantia_lote_id: 1,
    tipo: TIPO_PRESTAMO.EMERGENCIA,
    monto_solicitado: 8000,
    monto_aprobado: 8000,
    plazo_meses: 3,
    tasa_interes_mensual: 3.0,
    cuota_mensual: 2840,
    fecha_solicitud: '2024-10-15',
    fecha_aprobacion: '2024-10-18',
    fecha_desembolso: null,
    fecha_primer_vencimiento: null,
    estado: ESTADO_PRESTAMO.APROBADO,
    motivo: 'Reparación urgente de alambrado por vandalismo',
    observaciones: 'Pendiente de desembolso - documentación en proceso',
    vendedor_id: 'juan.perez',
    user_aprobacion: 'admin'
  }
];

// Cuotas de préstamos
export const mockCuotasPrestamos = [
  // Cuotas del préstamo 1 (Cliente 2 - Ana Rodríguez)
  {
    id: 1,
    prestamo_id: 1,
    numero_cuota: 1,
    monto: 2750,
    fecha_vencimiento: '2024-03-01',
    fecha_pago: '2024-03-01',
    estado: 'pagado',
    metodo_pago: 'TRANSFERENCIA',
    observaciones: 'Primera cuota - pago puntual'
  },
  {
    id: 2,
    prestamo_id: 1,
    numero_cuota: 2,
    monto: 2750,
    fecha_vencimiento: '2024-04-01',
    fecha_pago: null,
    estado: 'vencido',
    metodo_pago: null,
    observaciones: 'Cuota vencida - enviar recordatorio'
  },
  {
    id: 3,
    prestamo_id: 1,
    numero_cuota: 3,
    monto: 2750,
    fecha_vencimiento: '2024-05-01',
    fecha_pago: null,
    estado: 'pendiente',
    metodo_pago: null,
    observaciones: null
  },
  {
    id: 4,
    prestamo_id: 1,
    numero_cuota: 4,
    monto: 2750,
    fecha_vencimiento: '2024-06-01',
    fecha_pago: null,
    estado: 'pendiente',
    metodo_pago: null,
    observaciones: null
  },
  {
    id: 5,
    prestamo_id: 1,
    numero_cuota: 5,
    monto: 2750,
    fecha_vencimiento: '2024-07-01',
    fecha_pago: null,
    estado: 'pendiente',
    metodo_pago: null,
    observaciones: null
  },
  {
    id: 6,
    prestamo_id: 1,
    numero_cuota: 6,
    monto: 2750,
    fecha_vencimiento: '2024-08-01',
    fecha_pago: null,
    estado: 'pendiente',
    metodo_pago: null,
    observaciones: null
  },
  
  // Cuotas del préstamo 2 (Cliente 3 - Pedro Martínez) - COMPLETADO
  {
    id: 7,
    prestamo_id: 2,
    numero_cuota: 1,
    monto: 3760,
    fecha_vencimiento: '2023-11-15',
    fecha_pago: '2023-11-15',
    estado: 'pagado',
    metodo_pago: 'EFECTIVO',
    observaciones: 'Pago en oficina'
  },
  {
    id: 8,
    prestamo_id: 2,
    numero_cuota: 2,
    monto: 3760,
    fecha_vencimiento: '2023-12-15',
    fecha_pago: '2023-12-15',
    estado: 'pagado',
    metodo_pago: 'TRANSFERENCIA',
    observaciones: null
  },
  // ... (las otras 10 cuotas del préstamo 2 estarían todas pagadas)
];

// Funciones auxiliares
export const getPrestamosByCliente = (clienteId) => {
  return mockPrestamos.filter(prestamo => prestamo.cliente_id === clienteId);
};

export const getPrestamosByLote = (loteId) => {
  return mockPrestamos.filter(prestamo => prestamo.garantia_lote_id === loteId);
};

export const getPrestamosByContrato = (contratoId, loteId) => {
  // Los préstamos están asociados al lote que garantiza el préstamo
  return mockPrestamos.filter(prestamo => prestamo.garantia_lote_id === loteId);
};

export const getPrestamosActivos = (clienteId = null) => {
  const filtrados = clienteId 
    ? getPrestamosByCliente(clienteId)
    : mockPrestamos;
  
  return filtrados.filter(prestamo => 
    prestamo.estado === ESTADO_PRESTAMO.ACTIVO || 
    prestamo.estado === ESTADO_PRESTAMO.DESEMBOLSADO
  );
};

export const getCuotasPrestamo = (prestamoId) => {
  return mockCuotasPrestamos.filter(cuota => cuota.prestamo_id === prestamoId);
};

export const getSaldoPendientePrestamo = (prestamoId) => {
  const cuotas = getCuotasPrestamo(prestamoId);
  const pendientes = cuotas.filter(cuota => 
    cuota.estado === 'pendiente' || cuota.estado === 'vencido'
  );
  
  return pendientes.reduce((total, cuota) => total + cuota.monto, 0);
};

export const calcularCreditoDisponiblePorContrato = (contratoId, montoPagado = 0) => {
  // Calcular crédito máximo basado en el monto pagado del contrato específico
  const creditoMaximo = montoPagado * (CONFIG_DEUDA_MUNICIPAL.PORCENTAJE_CREDITO_MAXIMO / 100);
  
  // Obtener préstamos activos garantizados por el lote de este contrato
  const prestamosDelContrato = mockPrestamos.filter(prestamo => 
    prestamo.garantia_lote_id === contratoId && 
    (prestamo.estado === ESTADO_PRESTAMO.ACTIVO || prestamo.estado === ESTADO_PRESTAMO.DESEMBOLSADO)
  );
  
  const deudaPrestamos = prestamosDelContrato.reduce((total, prestamo) => {
    return total + getSaldoPendientePrestamo(prestamo.id);
  }, 0);
  
  // Crédito disponible = crédito máximo - deuda actual de préstamos del contrato
  const creditoDisponible = Math.max(0, creditoMaximo - deudaPrestamos);
  
  return {
    credito_maximo: creditoMaximo,
    deuda_prestamos_actual: deudaPrestamos,
    credito_disponible: creditoDisponible,
    porcentaje_utilizado: creditoMaximo > 0 ? (deudaPrestamos / creditoMaximo) * 100 : 0,
    prestamos_activos: prestamosDelContrato
  };
};

export const calcularCreditoDisponible = (clienteId, montosPagados = {}) => {
  // Esta función ahora se calcula desde el componente cliente
  // Mantener para compatibilidad pero el cálculo real se hace por contrato
  let creditoTotalMaximo = 0;
  let deudaTotalPrestamos = 0;
  let creditoTotalDisponible = 0;
  
  // Iterar sobre los montos pagados proporcionados
  Object.keys(montosPagados).forEach(contratoId => {
    const montoPagado = montosPagados[contratoId];
    const loteId = parseInt(contratoId); // Asumir que el loteId corresponde al contratoId para este cálculo
    const creditoContrato = calcularCreditoDisponiblePorContrato(loteId, montoPagado);
    
    creditoTotalMaximo += creditoContrato.credito_maximo;
    deudaTotalPrestamos += creditoContrato.deuda_prestamos_actual;
    creditoTotalDisponible += creditoContrato.credito_disponible;
  });
  
  return {
    credito_maximo: creditoTotalMaximo,
    deuda_prestamos_actual: deudaTotalPrestamos,
    credito_disponible: creditoTotalDisponible,
    porcentaje_utilizado: creditoTotalMaximo > 0 ? (deudaTotalPrestamos / creditoTotalMaximo) * 100 : 0
  };
};export const validarSolicitudPrestamo = (loteId, montoSolicitado, montoPagado = 0) => {
  const creditoInfo = calcularCreditoDisponiblePorContrato(loteId, montoPagado);
  
  const esValido = montoSolicitado <= creditoInfo.credito_disponible;
  
  return {
    es_valido: esValido,
    monto_maximo_disponible: creditoInfo.credito_disponible,
    lote_id: loteId,
    mensaje: esValido 
      ? 'Solicitud dentro del límite de crédito para este lote'
      : `Monto excede el crédito disponible para este lote. Máximo: $${creditoInfo.credito_disponible.toLocaleString('es-AR')}`
  };
};

export const getEstadisticasPrestamos = () => {
  const totalPrestamos = mockPrestamos.length;
  const activos = mockPrestamos.filter(p => p.estado === ESTADO_PRESTAMO.ACTIVO).length;
  const completados = mockPrestamos.filter(p => p.estado === ESTADO_PRESTAMO.COMPLETADO).length;
  const vencidos = mockPrestamos.filter(p => p.estado === ESTADO_PRESTAMO.VENCIDO).length;
  
  const montoTotalDesembolsado = mockPrestamos
    .filter(p => p.fecha_desembolso)
    .reduce((total, p) => total + p.monto_aprobado, 0);
  
  const montoTotalPendiente = mockPrestamos
    .filter(p => p.estado === ESTADO_PRESTAMO.ACTIVO)
    .reduce((total, p) => total + getSaldoPendientePrestamo(p.id), 0);
  
  return {
    total_prestamos: totalPrestamos,
    activos,
    completados,
    vencidos,
    monto_total_desembolsado: montoTotalDesembolsado,
    monto_total_pendiente: montoTotalPendiente
  };
};