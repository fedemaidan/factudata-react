// data/loteParaTodos/mockContratos.js
export const mockContratos = [
  // Contratos del Emprendimiento 1: Barrio Los Ceibos
  {
    id: 1,
    emprendimiento_id: 1,
    lote_id: 2,
    cliente: {
      nombre: 'Juan Carlos Pérez',
      dni: '12345678',
      telefono: '+54 9 351 123-4567',
      email: 'juan.perez@email.com'
    },
    tipo_contrato: 'BOLETO_COMPRAVENTA',
    estado: 'ACTIVO',
    fecha_firma: '2024-01-15',
    monto_total: 380000,
    moneda: 'ARS',
    seña_pagada: 76000, // 20%
    financiacion: {
      tipo: 'CUOTAS_FIJAS',
      cuotas_totales: 60,
      cuotas_pagas: 6,
      monto_cuota: 5066.67,
      vencimiento_proxima: '2024-07-15'
    },
    observaciones: 'Cliente con buen historial crediticio'
  },
  {
    id: 2,
    emprendimiento_id: 1,
    lote_id: 4,
    cliente: {
      nombre: 'María Elena González',
      dni: '87654321',
      telefono: '+54 9 351 987-6543',
      email: 'maria.gonzalez@email.com'
    },
    tipo_contrato: 'ESCRITURA',
    estado: 'FINALIZADO',
    fecha_firma: '2023-11-20',
    monto_total: 361000,
    moneda: 'ARS',
    seña_pagada: 361000, // 100% - Contado
    financiacion: {
      tipo: 'CONTADO',
      cuotas_totales: 1,
      cuotas_pagas: 1,
      monto_cuota: 361000,
      vencimiento_proxima: null
    },
    observaciones: 'Compra al contado con descuento del 5%'
  },
  {
    id: 3,
    emprendimiento_id: 1,
    lote_id: 8,
    cliente: {
      nombre: 'Roberto Silva',
      dni: '11223344',
      telefono: '+54 9 351 111-2233',
      email: 'roberto.silva@email.com'
    },
    tipo_contrato: 'RESERVA',
    estado: 'ACTIVO',
    fecha_firma: '2024-02-28',
    monto_total: 403750,
    moneda: 'ARS',
    seña_pagada: 40375, // 10%
    financiacion: {
      tipo: 'CUOTAS_CRECIENTES',
      cuotas_totales: 48,
      cuotas_pagas: 2,
      monto_cuota: 7569.79,
      vencimiento_proxima: '2024-07-01'
    },
    observaciones: 'Promoción especial 2024'
  },
  {
    id: 4,
    emprendimiento_id: 1,
    lote_id: 10,
    cliente: {
      nombre: 'Ana Martínez',
      dni: '55667788',
      telefono: '+54 9 351 555-6677',
      email: 'ana.martinez@email.com'
    },
    tipo_contrato: 'ESCRITURA',
    estado: 'FINALIZADO',
    fecha_firma: '2023-12-10',
    monto_total: 427500,
    moneda: 'ARS',
    seña_pagada: 427500, // 100%
    financiacion: {
      tipo: 'CONTADO',
      cuotas_totales: 1,
      cuotas_pagas: 1,
      monto_cuota: 427500,
      vencimiento_proxima: null
    },
    observaciones: 'Compra familiar - segundo lote'
  },

  // Contratos del Emprendimiento 2: Costa Verde Residencial (USD)
  {
    id: 5,
    emprendimiento_id: 2,
    lote_id: 12,
    cliente: {
      nombre: 'Carlos Mendoza',
      dni: '99887766',
      telefono: '+54 9 351 998-8776',
      email: 'carlos.mendoza@email.com'
    },
    tipo_contrato: 'BOLETO_COMPRAVENTA',
    estado: 'ACTIVO',
    fecha_firma: '2024-03-01',
    monto_total: 90000,
    moneda: 'USD',
    seña_pagada: 18000, // 20%
    financiacion: {
      tipo: 'CUOTAS_FIJAS',
      cuotas_totales: 36,
      cuotas_pagas: 3,
      monto_cuota: 2000,
      vencimiento_proxima: '2024-07-01'
    },
    observaciones: 'Financiación en dólares'
  },
  {
    id: 6,
    emprendimiento_id: 2,
    lote_id: 14,
    cliente: {
      nombre: 'Patricia López',
      dni: '44556677',
      telefono: '+54 9 351 445-5667',
      email: 'patricia.lopez@email.com'
    },
    tipo_contrato: 'ESCRITURA',
    estado: 'FINALIZADO',
    fecha_firma: '2023-09-15',
    monto_total: 108000,
    moneda: 'USD',
    seña_pagada: 108000, // 100%
    financiacion: {
      tipo: 'CONTADO',
      cuotas_totales: 1,
      cuotas_pagas: 1,
      monto_cuota: 108000,
      vencimiento_proxima: null
    },
    observaciones: 'Lote premium esquina'
  },

  // Contratos del Emprendimiento 3: Miradores del Río
  {
    id: 7,
    emprendimiento_id: 3,
    lote_id: 17,
    cliente: {
      nombre: 'Diego Fernández',
      dni: '33445599',
      telefono: '+54 9 351 334-4559',
      email: 'diego.fernandez@email.com'
    },
    tipo_contrato: 'RESERVA',
    estado: 'ACTIVO',
    fecha_firma: '2024-02-15',
    monto_total: 300000,
    moneda: 'ARS',
    seña_pagada: 30000, // 10%
    financiacion: {
      tipo: 'CUOTAS_FIJAS',
      cuotas_totales: 72,
      cuotas_pagas: 4,
      monto_cuota: 3750,
      vencimiento_proxima: '2024-07-15'
    },
    observaciones: 'Plan extendido de financiación'
  },

  // Contratos del Emprendimiento 4: Portal de la Montaña
  {
    id: 8,
    emprendimiento_id: 4,
    lote_id: 21,
    cliente: {
      nombre: 'Luciana Ruiz',
      dni: '66778899',
      telefono: '+54 9 351 667-7889',
      email: 'luciana.ruiz@email.com'
    },
    tipo_contrato: 'ESCRITURA',
    estado: 'FINALIZADO',
    fecha_firma: '2023-10-20',
    monto_total: 162000,
    moneda: 'ARS',
    seña_pagada: 162000, // 100%
    financiacion: {
      tipo: 'CONTADO',
      cuotas_totales: 1,
      cuotas_pagas: 1,
      monto_cuota: 162000,
      vencimiento_proxima: null
    },
    observaciones: 'Compra de inversión'
  },
  {
    id: 9,
    emprendimiento_id: 4,
    lote_id: 22,
    cliente: {
      nombre: 'Sebastián Torres',
      dni: '22334455',
      telefono: '+54 9 351 223-3445',
      email: 'sebastian.torres@email.com'
    },
    tipo_contrato: 'BOLETO_COMPRAVENTA',
    estado: 'ACTIVO',
    fecha_firma: '2024-01-20',
    monto_total: 135000,
    moneda: 'ARS',
    seña_pagada: 27000, // 20%
    financiacion: {
      tipo: 'CUOTAS_FIJAS',
      cuotas_totales: 48,
      cuotas_pagas: 5,
      monto_cuota: 2250,
      vencimiento_proxima: '2024-07-20'
    },
    observaciones: 'Cliente referido'
  },

  // Contratos del Emprendimiento 5: Quintas del Valle (USD)
  {
    id: 10,
    emprendimiento_id: 5,
    lote_id: 24,
    cliente: {
      nombre: 'Alejandra Castro',
      dni: '77889900',
      telefono: '+54 9 351 778-8990',
      email: 'alejandra.castro@email.com'
    },
    tipo_contrato: 'RESERVA',
    estado: 'ACTIVO',
    fecha_firma: '2024-03-10',
    monto_total: 22500,
    moneda: 'USD',
    seña_pagada: 2250, // 10%
    financiacion: {
      tipo: 'CUOTAS_FIJAS',
      cuotas_totales: 60,
      cuotas_pagas: 2,
      monto_cuota: 338.33,
      vencimiento_proxima: '2024-07-10'
    },
    observaciones: 'Primera quinta del desarrollo'
  },
  {
    id: 11,
    emprendimiento_id: 5,
    lote_id: 25,
    cliente: {
      nombre: 'Fernando Giménez',
      dni: '88990011',
      telefono: '+54 9 351 889-9001',
      email: 'fernando.gimenez@email.com'
    },
    tipo_contrato: 'ESCRITURA',
    estado: 'FINALIZADO',
    fecha_firma: '2023-08-30',
    monto_total: 30000,
    moneda: 'USD',
    seña_pagada: 30000, // 100%
    financiacion: {
      tipo: 'CONTADO',
      cuotas_totales: 1,
      cuotas_pagas: 1,
      monto_cuota: 30000,
      vencimiento_proxima: null
    },
    observaciones: 'Inversor extranjero'
  }
];

// Estados posibles para contratos
export const ESTADO_CONTRATO = {
  ACTIVO: 'ACTIVO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
  SUSPENDIDO: 'SUSPENDIDO'
};

// Tipos de contrato
export const TIPO_CONTRATO = {
  RESERVA: 'RESERVA',
  BOLETO_COMPRAVENTA: 'BOLETO_COMPRAVENTA',
  ESCRITURA: 'ESCRITURA'
};

// Tipos de financiación
export const TIPO_FINANCIACION = {
  CONTADO: 'CONTADO',
  CUOTAS_FIJAS: 'CUOTAS_FIJAS',
  CUOTAS_CRECIENTES: 'CUOTAS_CRECIENTES'
};

// Funciones de utilidad
export const getContratosByEmprendimiento = (emprendimientoId) => {
  return mockContratos.filter(contrato => contrato.emprendimiento_id === emprendimientoId);
};

export const getContratoById = (id) => {
  return mockContratos.find(contrato => contrato.id === id);
};

export const getContratosByEstado = (emprendimientoId, estado) => {
  return mockContratos.filter(contrato => 
    contrato.emprendimiento_id === emprendimientoId && contrato.estado === estado
  );
};

export const getEstadisticasContratos = (emprendimientoId) => {
  const contratos = getContratosByEmprendimiento(emprendimientoId);
  
  const activos = contratos.filter(c => c.estado === 'ACTIVO');
  const finalizados = contratos.filter(c => c.estado === 'FINALIZADO');
  
  const montoTotalVentas = contratos.reduce((sum, c) => {
    // Convertir a moneda principal si es necesario
    return sum + c.monto_total;
  }, 0);
  
  const saldoPendiente = activos.reduce((sum, c) => {
    return sum + (c.monto_total - c.seña_pagada);
  }, 0);
  
  return {
    total: contratos.length,
    activo: activos.length,
    finalizado: finalizados.length,
    cancelado: contratos.filter(c => c.estado === 'CANCELADO').length,
    monto_total_ventas: montoTotalVentas,
    saldo_pendiente: saldoPendiente,
    seña_total_cobrada: contratos.reduce((sum, c) => sum + c.seña_pagada, 0)
  };
};