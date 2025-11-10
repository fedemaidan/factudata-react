// src/data/loteParaTodos/mockCaja.js

export const mockMovimientosCaja = [
  // ENERO 2024
  { id: 1, fecha: '2024-01-02', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 15000, descripcion: 'Seña lote A-001 - Cliente García', cliente_id: 1, lote_id: 1, comprobante: 'REC-0001' },
  { id: 2, fecha: '2024-01-02', tipo: 'EGRESO', concepto: 'COMISION_VENDEDOR', monto: 1500, descripcion: 'Comisión vendedor venta lote A-001', empleado: 'Juan Pérez', comprobante: 'COM-0001' },
  { id: 3, fecha: '2024-01-05', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 3200, descripcion: 'Cuota 12/60 - Cliente Rodríguez', cliente_id: 2, comprobante: 'REC-0002' },
  { id: 4, fecha: '2024-01-08', tipo: 'EGRESO', concepto: 'GASTOS_ADMINISTRATIVOS', monto: 2500, descripcion: 'Gastos oficina enero', comprobante: 'FAC-0001' },
  { id: 5, fecha: '2024-01-10', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 32000, descripcion: 'Pago contado lote P-001 - Cliente Martínez', cliente_id: 3, lote_id: 11, comprobante: 'REC-0003' },
  { id: 6, fecha: '2024-01-10', tipo: 'EGRESO', concepto: 'COMISION_VENDEDOR', monto: 3200, descripcion: 'Comisión vendedor venta lote P-001', empleado: 'María López', comprobante: 'COM-0002' },
  { id: 7, fecha: '2024-01-15', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 2800, descripcion: 'Cuota 6/36 - Cliente Fernández', cliente_id: 4, comprobante: 'REC-0004' },
  { id: 8, fecha: '2024-01-18', tipo: 'EGRESO', concepto: 'IMPUESTOS', monto: 4200, descripcion: 'IIBB y otros impuestos', comprobante: 'FAC-0002' },
  { id: 9, fecha: '2024-01-20', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 28000, descripcion: 'Entrega inicial lote G-001 - Cliente Silva', cliente_id: 5, lote_id: 19, comprobante: 'REC-0005' },
  { id: 10, fecha: '2024-01-22', tipo: 'EGRESO', concepto: 'INFRAESTRUCTURA', monto: 15000, descripcion: 'Obras de infraestructura Cerro Verde I', comprobante: 'FAC-0003' },
  
  // FEBRERO 2024
  { id: 11, fecha: '2024-02-01', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 3200, descripcion: 'Cuota 13/60 - Cliente Rodríguez', cliente_id: 2, comprobante: 'REC-0006' },
  { id: 12, fecha: '2024-02-03', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 18500, descripcion: 'Seña lote B-001 - Cliente González', cliente_id: 6, lote_id: 6, comprobante: 'REC-0007' },
  { id: 13, fecha: '2024-02-05', tipo: 'EGRESO', concepto: 'MARKETING', monto: 3500, descripcion: 'Publicidad redes sociales y web', comprobante: 'FAC-0004' },
  { id: 14, fecha: '2024-02-08', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 4100, descripcion: 'Cuota 8/24 - Cliente Silva', cliente_id: 5, comprobante: 'REC-0008' },
  { id: 15, fecha: '2024-02-10', tipo: 'EGRESO', concepto: 'GASTOS_ADMINISTRATIVOS', monto: 2800, descripcion: 'Gastos oficina febrero', comprobante: 'FAC-0005' },
  { id: 16, fecha: '2024-02-15', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 2800, descripcion: 'Cuota 7/36 - Cliente Fernández', cliente_id: 4, comprobante: 'REC-0009' },
  { id: 17, fecha: '2024-02-18', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 45000, descripcion: 'Pago total lote L-001 - Cliente Herrera', cliente_id: 7, lote_id: 22, comprobante: 'REC-0010' },
  { id: 18, fecha: '2024-02-18', tipo: 'EGRESO', concepto: 'COMISION_VENDEDOR', monto: 4500, descripcion: 'Comisión vendedor venta lote L-001', empleado: 'Carlos Ruiz', comprobante: 'COM-0003' },
  { id: 19, fecha: '2024-02-20', tipo: 'EGRESO', concepto: 'SERVICIOS', monto: 1800, descripcion: 'Mantenimiento y servicios generales', comprobante: 'FAC-0006' },
  { id: 20, fecha: '2024-02-25', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 3200, descripcion: 'Cuota 14/60 - Cliente Rodríguez', cliente_id: 2, comprobante: 'REC-0011' },
  
  // MARZO 2024
  { id: 21, fecha: '2024-03-01', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 22000, descripcion: 'Seña lote C-001 - Cliente Morales', cliente_id: 8, lote_id: 9, comprobante: 'REC-0012' },
  { id: 22, fecha: '2024-03-05', tipo: 'EGRESO', concepto: 'INFRAESTRUCTURA', monto: 18000, descripcion: 'Mejoras en emprendimiento Norte Premium', comprobante: 'FAC-0007' },
  { id: 23, fecha: '2024-03-08', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 2800, descripcion: 'Cuota 8/36 - Cliente Fernández', cliente_id: 4, comprobante: 'REC-0013' },
  { id: 24, fecha: '2024-03-10', tipo: 'EGRESO', concepto: 'IMPUESTOS', monto: 5200, descripcion: 'Impuestos trimestrales', comprobante: 'FAC-0008' },
  { id: 25, fecha: '2024-03-12', tipo: 'INGRESO', concepto: 'VENTA_LOTE', monto: 38000, descripcion: 'Pago inicial lote T-001 Horizonte I', cliente_id: 9, lote_id: 26, comprobante: 'REC-0014' },
  { id: 26, fecha: '2024-03-15', tipo: 'EGRESO', concepto: 'GASTOS_ADMINISTRATIVOS', monto: 3200, descripcion: 'Gastos oficina marzo', comprobante: 'FAC-0009' },
  { id: 27, fecha: '2024-03-18', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 4100, descripcion: 'Cuota 10/24 - Cliente Silva', cliente_id: 5, comprobante: 'REC-0015' },
  { id: 28, fecha: '2024-03-22', tipo: 'EGRESO', concepto: 'COMISION_VENDEDOR', monto: 2200, descripcion: 'Comisión vendedor venta lote C-001', empleado: 'Ana Castillo', comprobante: 'COM-0004' },
  { id: 29, fecha: '2024-03-25', tipo: 'INGRESO', concepto: 'CUOTA_FINANCIACION', monto: 3200, descripcion: 'Cuota 15/60 - Cliente Rodríguez', cliente_id: 2, comprobante: 'REC-0016' },
  { id: 30, fecha: '2024-03-28', tipo: 'EGRESO', concepto: 'MARKETING', monto: 4200, descripcion: 'Campaña publicitaria Horizonte I', comprobante: 'FAC-0010' }
];

export const mockEstadoCaja = [
  {
    fecha: '2024-01-31',
    saldo_inicial: 0,
    total_ingresos: 80200,
    total_egresos: 26400,
    saldo_final: 53800,
    movimientos_cantidad: 10
  },
  {
    fecha: '2024-02-29',
    saldo_inicial: 53800,
    total_ingresos: 76100,
    total_egresos: 12600,
    saldo_final: 117300,
    movimientos_cantidad: 10
  },
  {
    fecha: '2024-03-31',
    saldo_inicial: 117300,
    total_ingresos: 70300,
    total_egresos: 32600,
    saldo_final: 155000,
    movimientos_cantidad: 10
  }
];

export const mockConceptos = [
  { codigo: 'VENTA_LOTE', descripcion: 'Venta de lote', tipo: 'INGRESO', categoria: 'VENTAS' },
  { codigo: 'CUOTA_FINANCIACION', descripcion: 'Cuota de financiación', tipo: 'INGRESO', categoria: 'VENTAS' },
  { codigo: 'SEÑA', descripcion: 'Seña de reserva', tipo: 'INGRESO', categoria: 'VENTAS' },
  { codigo: 'COMISION_VENDEDOR', descripcion: 'Comisión vendedor', tipo: 'EGRESO', categoria: 'COMERCIAL' },
  { codigo: 'GASTOS_ADMINISTRATIVOS', descripcion: 'Gastos administrativos', tipo: 'EGRESO', categoria: 'ADMINISTRATIVO' },
  { codigo: 'INFRAESTRUCTURA', descripcion: 'Obras de infraestructura', tipo: 'EGRESO', categoria: 'DESARROLLO' },
  { codigo: 'MARKETING', descripcion: 'Marketing y publicidad', tipo: 'EGRESO', categoria: 'COMERCIAL' },
  { codigo: 'IMPUESTOS', descripcion: 'Impuestos y tasas', tipo: 'EGRESO', categoria: 'TRIBUTARIO' },
  { codigo: 'SERVICIOS', descripcion: 'Servicios generales', tipo: 'EGRESO', categoria: 'ADMINISTRATIVO' }
];

export const getMovimientosPorPeriodo = (fechaDesde, fechaHasta) => {
  return mockMovimientosCaja.filter(mov => 
    mov.fecha >= fechaDesde && mov.fecha <= fechaHasta
  ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

export const getMovimientosPorCliente = (clienteId) => {
  return mockMovimientosCaja.filter(mov => mov.cliente_id === clienteId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
};

export const getMovimientosPorTipo = (tipo) => {
  return mockMovimientosCaja.filter(mov => mov.tipo === tipo);
};

export const calcularEstadisticasPeriodo = (fechaDesde, fechaHasta) => {
  const movimientos = getMovimientosPorPeriodo(fechaDesde, fechaHasta);
  
  const ingresos = movimientos.filter(m => m.tipo === 'INGRESO');
  const egresos = movimientos.filter(m => m.tipo === 'EGRESO');
  
  const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = egresos.reduce((sum, m) => sum + m.monto, 0);
  
  // Agrupar ingresos por concepto
  const ingresosPorConcepto = ingresos.reduce((acc, mov) => {
    acc[mov.concepto] = (acc[mov.concepto] || 0) + mov.monto;
    return acc;
  }, {});
  
  // Agrupar egresos por concepto
  const egresosPorConcepto = egresos.reduce((acc, mov) => {
    acc[mov.concepto] = (acc[mov.concepto] || 0) + mov.monto;
    return acc;
  }, {});
  
  return {
    periodo: { desde: fechaDesde, hasta: fechaHasta },
    resumen: {
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_neto: totalIngresos - totalEgresos,
      cantidad_movimientos: movimientos.length,
      ticket_promedio: movimientos.length > 0 ? Math.round(totalIngresos / ingresos.length) : 0
    },
    ingresos_por_concepto: ingresosPorConcepto,
    egresos_por_concepto: egresosPorConcepto,
    movimientos: movimientos
  };
};

export const getSaldoActual = () => {
  const ultimoEstado = mockEstadoCaja[mockEstadoCaja.length - 1];
  return ultimoEstado ? ultimoEstado.saldo_final : 0;
};

export const registrarMovimiento = (movimiento) => {
  const nuevoId = Math.max(...mockMovimientosCaja.map(m => m.id)) + 1;
  const nuevoMovimiento = {
    id: nuevoId,
    fecha: new Date().toISOString().split('T')[0],
    ...movimiento,
    comprobante: `${movimiento.tipo === 'INGRESO' ? 'REC' : 'FAC'}-${String(nuevoId).padStart(4, '0')}`
  };
  
  mockMovimientosCaja.push(nuevoMovimiento);
  return nuevoMovimiento;
};

export const getFlujoCaja = (meses = 12) => {
  const fechaHasta = new Date();
  const fechaDesde = new Date();
  fechaDesde.setMonth(fechaDesde.getMonth() - meses);
  
  const movimientos = getMovimientosPorPeriodo(
    fechaDesde.toISOString().split('T')[0],
    fechaHasta.toISOString().split('T')[0]
  );
  
  // Agrupar por mes
  const flujoMensual = {};
  
  movimientos.forEach(mov => {
    const mes = mov.fecha.substring(0, 7); // YYYY-MM
    if (!flujoMensual[mes]) {
      flujoMensual[mes] = {
        mes: mes,
        ingresos: 0,
        egresos: 0,
        saldo_neto: 0,
        acumulado: 0
      };
    }
    
    if (mov.tipo === 'INGRESO') {
      flujoMensual[mes].ingresos += mov.monto;
    } else {
      flujoMensual[mes].egresos += mov.monto;
    }
    
    flujoMensual[mes].saldo_neto = flujoMensual[mes].ingresos - flujoMensual[mes].egresos;
  });
  
  // Calcular acumulado
  const mesesOrdenados = Object.keys(flujoMensual).sort();
  let acumulado = 0;
  
  mesesOrdenados.forEach(mes => {
    acumulado += flujoMensual[mes].saldo_neto;
    flujoMensual[mes].acumulado = acumulado;
  });
  
  return Object.values(flujoMensual);
};

export const getTopClientes = (limite = 10) => {
  const clientesIngresos = {};
  
  mockMovimientosCaja
    .filter(m => m.tipo === 'INGRESO' && m.cliente_id)
    .forEach(mov => {
      clientesIngresos[mov.cliente_id] = (clientesIngresos[mov.cliente_id] || 0) + mov.monto;
    });
  
  return Object.entries(clientesIngresos)
    .map(([clienteId, total]) => ({
      cliente_id: parseInt(clienteId),
      total_pagado: total,
      cantidad_pagos: mockMovimientosCaja.filter(m => 
        m.cliente_id === parseInt(clienteId) && m.tipo === 'INGRESO'
      ).length
    }))
    .sort((a, b) => b.total_pagado - a.total_pagado)
    .slice(0, limite);
};