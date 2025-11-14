// src/data/loteParaTodos/mockPagos.js

import { TIPO_PAGO, METODO_PAGO } from './constantes';

export const mockPagos = [
  // Pagos del contrato 1 (Cliente 1 - Juan Carlos)
  {
    id: 1,
    contrato_id: 1,
    cliente_id: 1,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 1,
    monto: 8167,
    metodo_pago: METODO_PAGO.TRANSFERENCIA,
    medio_detalle: 'CBU: 0000003100010000000001 - Ref: TR001234',
    fecha_pago: '2023-03-15',
    fecha_vencimiento: '2023-03-15',
    estado: 'pagado',
    observaciones: 'Primera cuota - pago puntual',
    user_id: 'juan.perez',
    fecha_creacion: '2023-03-15T10:30:00'
  },
  {
    id: 2,
    contrato_id: 1,
    cliente_id: 1,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 2,
    monto: 8167,
    metodo_pago: METODO_PAGO.EFECTIVO,
    medio_detalle: 'Recibo Nº 0001234',
    fecha_pago: '2023-04-15',
    fecha_vencimiento: '2023-04-15',
    estado: 'pagado',
    observaciones: 'Segunda cuota',
    user_id: 'maria.garcia',
    fecha_creacion: '2023-04-15T14:20:00'
  },
  
  // Pagos del contrato 2 (Cliente 2 - Ana Rodríguez)
  {
    id: 3,
    contrato_id: 2,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 1,
    monto: 9333,
    metodo_pago: METODO_PAGO.CHEQUE,
    medio_detalle: 'Banco Nación - Cheque Nº 12345678',
    fecha_pago: '2023-07-22',
    fecha_vencimiento: '2023-07-22',
    estado: 'pagado',
    observaciones: 'Entrega inicial',
    user_id: 'maria.garcia',
    fecha_creacion: '2023-07-22T11:45:00'
  },
  {
    id: 4,
    contrato_id: 2,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.SERVICIO,
    servicio_id: 1, // Alambrado perimetral
    monto: 25000,
    metodo_pago: METODO_PAGO.TRANSFERENCIA,
    medio_detalle: 'CBU: 0110590520000000123456 - Ref: SRV001',
    fecha_pago: '2023-08-15',
    fecha_vencimiento: '2023-08-15',
    estado: 'pagado',
    observaciones: 'Servicio de alambrado perimetral lote 4',
    user_id: 'carlos.lopez',
    fecha_creacion: '2023-08-15T16:30:00'
  },
  
  // Pagos del contrato 3 (Cliente 2 - Ana Rodríguez - segundo lote)
  {
    id: 5,
    contrato_id: 3,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 1,
    monto: 6444,
    metodo_pago: METODO_PAGO.DEBITO_AUTOMATICO,
    medio_detalle: 'CBU autorizado: 0000003100010000000002',
    fecha_pago: '2024-01-10',
    fecha_vencimiento: '2024-01-10',
    estado: 'pagado',
    observaciones: 'Débito automático configurado',
    user_id: 'sistema',
    fecha_creacion: '2024-01-10T08:00:00'
  },
  {
    id: 6,
    contrato_id: 3,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.PRESTAMO,
    prestamo_id: 1, // Préstamo para mejoras
    monto: 15000,
    metodo_pago: METODO_PAGO.TRANSFERENCIA,
    medio_detalle: 'Préstamo aprobado - Desembolso',
    fecha_pago: '2024-02-01',
    fecha_vencimiento: null, // Los préstamos no tienen vencimiento en el pago inicial
    estado: 'pagado',
    observaciones: 'Préstamo para mejoras del lote 7',
    user_id: 'maria.garcia',
    fecha_creacion: '2024-02-01T10:15:00'
  },
  
  // Movimientos internos - ajustes contables
  {
    id: 7,
    contrato_id: 2,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.MOVIMIENTO_INTERNO,
    monto: -500, // Ajuste negativo
    metodo_pago: null, // No aplica método para movimientos internos
    medio_detalle: 'Ajuste por diferencia cambiaria',
    fecha_pago: '2024-03-01',
    fecha_vencimiento: null,
    estado: 'aplicado',
    observaciones: 'Ajuste contable por actualización de índices',
    user_id: 'admin',
    fecha_creacion: '2024-03-01T09:30:00'
  },
  
  // Más pagos para generar historial
  {
    id: 8,
    contrato_id: 4,
    cliente_id: 3,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 1,
    monto: 450000,
    metodo_pago: METODO_PAGO.TRANSFERENCIA,
    medio_detalle: 'Pago contado completo - CBU: 0170329440000000987654',
    fecha_pago: '2023-08-15',
    fecha_vencimiento: '2023-08-15',
    estado: 'pagado',
    observaciones: 'Pago contado total del lote',
    user_id: 'carlos.lopez',
    fecha_creacion: '2023-08-15T13:45:00'
  },
  
  // Pagos pendientes (para mostrar vencimientos)
  {
    id: 9,
    contrato_id: 2,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 8,
    monto: 9333,
    metodo_pago: null,
    medio_detalle: null,
    fecha_pago: null,
    fecha_vencimiento: '2024-03-22',
    estado: 'vencido',
    observaciones: 'Cuota vencida - enviar recordatorio',
    user_id: null,
    fecha_creacion: '2024-02-22T00:00:00'
  },
  {
    id: 10,
    contrato_id: 2,
    cliente_id: 2,
    tipo_pago: TIPO_PAGO.CUOTA,
    cuota_numero: 9,
    monto: 9333,
    metodo_pago: null,
    medio_detalle: null,
    fecha_pago: null,
    fecha_vencimiento: '2024-04-22',
    estado: 'pendiente',
    observaciones: 'Próxima cuota',
    user_id: null,
    fecha_creacion: '2024-03-22T00:00:00'
  }
];

// Funciones auxiliares para consultar pagos
export const getPagosByContrato = (contratoId) => {
  return mockPagos.filter(pago => pago.contrato_id === contratoId);
};

export const getPagosByCliente = (clienteId) => {
  return mockPagos.filter(pago => pago.cliente_id === clienteId);
};

export const getPagosVencidos = () => {
  const hoy = new Date().toISOString().split('T')[0];
  return mockPagos.filter(pago => 
    pago.estado === 'vencido' || 
    (pago.estado === 'pendiente' && pago.fecha_vencimiento < hoy)
  );
};

export const getPagosPendientes = (clienteId = null) => {
  const filtrados = clienteId 
    ? mockPagos.filter(pago => pago.cliente_id === clienteId)
    : mockPagos;
  
  return filtrados.filter(pago => pago.estado === 'pendiente');
};

export const getUltimoPago = (contratoId) => {
  const pagos = getPagosByContrato(contratoId)
    .filter(pago => pago.estado === 'pagado')
    .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));
  
  return pagos.length > 0 ? pagos[0] : null;
};

export const getSaldoPendiente = (contratoId) => {
  const pagos = getPagosByContrato(contratoId);
  const pendientes = pagos.filter(pago => 
    pago.estado === 'pendiente' || pago.estado === 'vencido'
  );
  
  return pendientes.reduce((total, pago) => total + pago.monto, 0);
};

export const getEstadisticasPagos = () => {
  const totalPagos = mockPagos.filter(p => p.estado === 'pagado').length;
  const totalVencidos = mockPagos.filter(p => p.estado === 'vencido').length;
  const totalPendientes = mockPagos.filter(p => p.estado === 'pendiente').length;
  const montoTotal = mockPagos
    .filter(p => p.estado === 'pagado')
    .reduce((total, p) => total + p.monto, 0);
  
  return {
    total_pagos: totalPagos,
    total_vencidos: totalVencidos,
    total_pendientes: totalPendientes,
    monto_total_cobrado: montoTotal,
    monto_pendiente: mockPagos
      .filter(p => p.estado === 'pendiente' || p.estado === 'vencido')
      .reduce((total, p) => total + p.monto, 0)
  };
};