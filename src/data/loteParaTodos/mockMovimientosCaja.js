// src/data/loteParaTodos/mockMovimientosCaja.js

export const mockMovimientosCaja = [
  {
    id: 1,
    fecha: '2025-11-05',
    tipo: 'INGRESO',
    concepto: 'Pago cuota - Contrato #123',
    monto: 45000,
    cliente: 'Juan Pérez',
    contrato_id: 123,
    metodo_pago: 'TRANSFERENCIA'
  },
  {
    id: 2,
    fecha: '2025-11-04',
    tipo: 'INGRESO',
    concepto: 'Entrega inicial - Contrato #124',
    monto: 120000,
    cliente: 'María García',
    contrato_id: 124,
    metodo_pago: 'EFECTIVO'
  },
  {
    id: 3,
    fecha: '2025-11-04',
    tipo: 'EGRESO',
    concepto: 'Comisión vendedor',
    monto: 35000,
    cliente: 'Ana Martínez (vendedor)',
    vendedor_id: 1,
    metodo_pago: 'TRANSFERENCIA'
  },
  {
    id: 4,
    fecha: '2025-11-03',
    tipo: 'INGRESO',
    concepto: 'Pago cuota - Contrato #118',
    monto: 52000,
    cliente: 'Carlos López',
    contrato_id: 118,
    metodo_pago: 'CHEQUE'
  },
  {
    id: 5,
    fecha: '2025-11-03',
    tipo: 'INGRESO',
    concepto: 'Regularización mora',
    monto: 15000,
    cliente: 'Pedro Rodríguez',
    contrato_id: 119,
    metodo_pago: 'EFECTIVO'
  },
  {
    id: 6,
    fecha: '2025-11-02',
    tipo: 'INGRESO',
    concepto: 'Pago cuota - Contrato #125',
    monto: 38000,
    cliente: 'Lucía Fernández',
    contrato_id: 125,
    metodo_pago: 'TRANSFERENCIA'
  },
  {
    id: 7,
    fecha: '2025-11-02',
    tipo: 'EGRESO',
    concepto: 'Gastos administrativos',
    monto: 12000,
    cliente: 'Gastos generales',
    categoria: 'ADMINISTRATIVO'
  },
  {
    id: 8,
    fecha: '2025-11-01',
    tipo: 'INGRESO',
    concepto: 'Entrega inicial - Contrato #126',
    monto: 95000,
    cliente: 'Roberto Silva',
    contrato_id: 126,
    metodo_pago: 'TRANSFERENCIA'
  },
  {
    id: 9,
    fecha: '2025-11-01',
    tipo: 'INGRESO',
    concepto: 'Pago adelantado cuotas',
    monto: 180000,
    cliente: 'Carmen Morales',
    contrato_id: 127,
    metodo_pago: 'CHEQUE'
  },
  {
    id: 10,
    fecha: '2025-10-31',
    tipo: 'EGRESO',
    concepto: 'Comisión vendedor',
    monto: 28500,
    cliente: 'Jorge Martínez (vendedor)',
    vendedor_id: 2,
    metodo_pago: 'EFECTIVO'
  },
  {
    id: 11,
    fecha: '2025-10-31',
    tipo: 'INGRESO',
    concepto: 'Pago cuota - Contrato #128',
    monto: 62000,
    cliente: 'Diana Aguirre',
    contrato_id: 128,
    metodo_pago: 'TRANSFERENCIA'
  },
  {
    id: 12,
    fecha: '2025-10-30',
    tipo: 'INGRESO',
    concepto: 'Regularización deuda',
    monto: 75000,
    cliente: 'Fernando Castro',
    contrato_id: 129,
    metodo_pago: 'EFECTIVO'
  }
];

// Funciones de utilidad para movimientos de caja
export const getMovimientosPorFecha = (fechaInicio, fechaFin) => {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  
  return mockMovimientosCaja.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    return fechaMov >= inicio && fechaMov <= fin;
  });
};

export const getMovimientosPorTipo = (tipo) => {
  return mockMovimientosCaja.filter(mov => mov.tipo === tipo);
};

export const getTotalIngresosPorPeriodo = (fechaInicio, fechaFin) => {
  const movimientos = getMovimientosPorFecha(fechaInicio, fechaFin);
  return movimientos
    .filter(mov => mov.tipo === 'INGRESO')
    .reduce((total, mov) => total + mov.monto, 0);
};

export const getTotalEgresosPorPeriodo = (fechaInicio, fechaFin) => {
  const movimientos = getMovimientosPorFecha(fechaInicio, fechaFin);
  return movimientos
    .filter(mov => mov.tipo === 'EGRESO')
    .reduce((total, mov) => total + mov.monto, 0);
};

export const getSaldoPorPeriodo = (fechaInicio, fechaFin) => {
  const ingresos = getTotalIngresosPorPeriodo(fechaInicio, fechaFin);
  const egresos = getTotalEgresosPorPeriodo(fechaInicio, fechaFin);
  return ingresos - egresos;
};