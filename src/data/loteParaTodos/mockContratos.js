// src/data/loteParaTodos/mockContratos.js

export const mockContratos = [
  // Contratos activos
  {
    id: 1,
    cliente_id: 1,
    lote_id: 1,
    vendedor_id: 'juan.perez',
    plan_financiacion_id: 2,
    precio_acordado: 280000,
    entrega_inicial: 84000,
    cuotas_cantidad: 24,
    cuota_mensual: 8167,
    pago_contado_hoy: 0,
    estado: 'ACTIVO', // ACTIVO, CAIDO, COMPLETADO, RESCINDIDO
    fecha_contrato: '2023-03-15',
    fecha_vencimiento: '2025-03-15',
    ultimo_pago: '2023-03-15',
    saldo_pendiente: 0,
    observaciones: 'Contrato pagado al contado'
  },
  {
    id: 2,
    cliente_id: 2,
    lote_id: 4,
    vendedor_id: 'maria.garcia',
    plan_financiacion_id: 2,
    precio_acordado: 320000,
    entrega_inicial: 96000,
    cuotas_cantidad: 24,
    cuota_mensual: 9333,
    pago_contado_hoy: 15000,
    estado: 'ACTIVO',
    fecha_contrato: '2023-07-22',
    fecha_vencimiento: '2025-07-22',
    ultimo_pago: '2024-03-25',
    saldo_pendiente: 45000,
    observaciones: 'Cliente al día con pagos'
  },
  {
    id: 3,
    cliente_id: 2, // Ana Rodríguez tiene SEGUNDO contrato
    lote_id: 7,
    vendedor_id: 'maria.garcia',
    plan_financiacion_id: 3,
    precio_acordado: 290000,
    entrega_inicial: 58000,
    cuotas_cantidad: 36,
    cuota_mensual: 6444,
    pago_contado_hoy: 20000,
    estado: 'ACTIVO',
    fecha_contrato: '2024-01-10',
    fecha_vencimiento: '2027-01-10',
    ultimo_pago: '2024-03-20',
    saldo_pendiente: 38000,
    observaciones: 'Segundo lote del mismo cliente'
  },
  {
    id: 4,
    cliente_id: 3,
    lote_id: 12,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 1,
    precio_acordado: 450000,
    entrega_inicial: 450000,
    cuotas_cantidad: 1,
    cuota_mensual: 0,
    pago_contado_hoy: 450000,
    estado: 'COMPLETADO',
    fecha_contrato: '2023-08-15',
    fecha_vencimiento: '2023-08-15',
    ultimo_pago: '2023-08-15',
    saldo_pendiente: 0,
    observaciones: 'Pago contado completo'
  },
  {
    id: 5,
    cliente_id: 3, // Pedro Martínez - segundo contrato
    lote_id: 15,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 1,
    precio_acordado: 380000,
    entrega_inicial: 380000,
    cuotas_cantidad: 1,
    cuota_mensual: 0,
    pago_contado_hoy: 380000,
    estado: 'COMPLETADO',
    fecha_contrato: '2023-09-20',
    fecha_vencimiento: '2023-09-20',
    ultimo_pago: '2023-09-20',
    saldo_pendiente: 0,
    observaciones: 'Segundo lote - pago contado'
  },
  {
    id: 6,
    cliente_id: 3, // Pedro Martínez - tercer contrato
    lote_id: 20,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 1,
    precio_acordado: 420000,
    entrega_inicial: 420000,
    cuotas_cantidad: 1,
    cuota_mensual: 0,
    pago_contado_hoy: 420000,
    estado: 'COMPLETADO',
    fecha_contrato: '2023-11-05',
    fecha_vencimiento: '2023-11-05',
    ultimo_pago: '2023-11-05',
    saldo_pendiente: 0,
    observaciones: 'Tercer lote - inversor'
  },
  {
    id: 7,
    cliente_id: 4, // Laura Fernández - en mora
    lote_id: 8,
    vendedor_id: 'ana.martinez',
    plan_financiacion_id: 3,
    precio_acordado: 310000,
    entrega_inicial: 62000,
    cuotas_cantidad: 36,
    cuota_mensual: 6889,
    pago_contado_hoy: 10000,
    estado: 'ACTIVO',
    fecha_contrato: '2023-10-15',
    fecha_vencimiento: '2026-10-15',
    ultimo_pago: '2024-01-15',
    saldo_pendiente: 75000, // Debe 3 cuotas + intereses
    observaciones: 'Cliente en mora desde febrero 2024'
  },
  {
    id: 8,
    cliente_id: 5, // Carlos Silva - en mora
    lote_id: 19,
    vendedor_id: 'juan.perez',
    plan_financiacion_id: 4,
    precio_acordado: 520000,
    entrega_inicial: 130000,
    cuotas_cantidad: 24,
    cuota_mensual: 16250,
    pago_contado_hoy: 50000,
    estado: 'ACTIVO',
    fecha_contrato: '2023-01-20',
    fecha_vencimiento: '2025-01-20',
    ultimo_pago: '2023-12-18',
    saldo_pendiente: 180000, // Debe muchos meses
    observaciones: 'Moroso desde diciembre 2023'
  },
  {
    id: 9,
    cliente_id: 9, // Tecnológica SRL - en mora
    lote_id: 26,
    vendedor_id: 'maria.garcia',
    plan_financiacion_id: 3,
    precio_acordado: 480000,
    entrega_inicial: 96000,
    cuotas_cantidad: 36,
    cuota_mensual: 10667,
    pago_contado_hoy: 0,
    estado: 'ACTIVO',
    fecha_contrato: '2024-03-12',
    fecha_vencimiento: '2027-03-12',
    ultimo_pago: '2024-03-12', // Solo entrega inicial
    saldo_pendiente: 85000,
    observaciones: 'Solo pagó entrega inicial, sin cuotas posteriores'
  },
  {
    id: 10,
    cliente_id: 11, // Familia Rossi - reserva
    lote_id: 3,
    vendedor_id: 'ana.martinez',
    plan_financiacion_id: 2,
    precio_acordado: 295000,
    entrega_inicial: 88500,
    cuotas_cantidad: 24,
    cuota_mensual: 8604,
    pago_contado_hoy: 0,
    estado: 'RESERVADO',
    fecha_contrato: '2024-04-01',
    fecha_vencimiento: '2026-04-01',
    ultimo_pago: null,
    saldo_pendiente: 290000, // Solo seña
    observaciones: 'Reserva hasta fin de mes, seña $5000'
  },
  {
    id: 11,
    cliente_id: 12, // Inversiones del Norte - dos contratos
    lote_id: 15,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 5,
    precio_acordado: 380000,
    entrega_inicial: 76000,
    cuotas_cantidad: 60,
    cuota_mensual: 5067,
    pago_contado_hoy: 0,
    estado: 'RESERVADO',
    fecha_contrato: '2024-03-20',
    fecha_vencimiento: '2029-03-20',
    ultimo_pago: null,
    saldo_pendiente: 370000,
    observaciones: 'Reserva con financiación aprobada'
  },
  {
    id: 12,
    cliente_id: 12, // Inversiones del Norte - segundo lote
    lote_id: 16,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 5,
    precio_acordado: 390000,
    entrega_inicial: 78000,
    cuotas_cantidad: 60,
    cuota_mensual: 5200,
    pago_contado_hoy: 0,
    estado: 'RESERVADO',
    fecha_contrato: '2024-03-25',
    fecha_vencimiento: '2029-03-25',
    ultimo_pago: null,
    saldo_pendiente: 380000,
    observaciones: 'Segundo lote reservado'
  },
  // Ejemplo de CONTRATO CAÍDO
  {
    id: 13,
    cliente_id: 13, // Cliente que tuvo contrato caído
    lote_id: 25,
    vendedor_id: 'juan.perez',
    plan_financiacion_id: 3,
    precio_acordado: 350000,
    entrega_inicial: 70000,
    cuotas_cantidad: 36,
    cuota_mensual: 7778,
    pago_contado_hoy: 15000,
    estado: 'CAIDO',
    fecha_contrato: '2023-06-10',
    fecha_vencimiento: '2026-06-10',
    ultimo_pago: '2023-08-10',
    saldo_pendiente: 265000,
    observaciones: 'Contrato caído por falta de pago - lote disponible nuevamente'
  },
  // Contratos en etapa comercial (Ventas)
  {
    id: 101,
    cliente_id: 5,
    lote_id: 15,
    vendedor_id: 'juan.perez',
    plan_financiacion_id: 1,
    precio_acordado: 350000,
    entrega_inicial: 105000,
    cuotas_cantidad: 12,
    cuota_mensual: 20416,
    pago_contado_hoy: 0,
    estado: 'PRE-RESERVA',
    fecha_contrato: '2025-11-20',
    fecha_vencimiento: '2025-11-27', // Vence en 7 días
    ultimo_pago: null,
    saldo_pendiente: 0,
    observaciones: 'Cliente interesado, falta confirmar anticipo.'
  },
  {
    id: 102,
    cliente_id: 8,
    lote_id: 18,
    vendedor_id: 'maria.garcia',
    plan_financiacion_id: 2,
    precio_acordado: 290000,
    entrega_inicial: 87000,
    cuotas_cantidad: 24,
    cuota_mensual: 8458,
    pago_contado_hoy: 50000, // Ya pagó parte del anticipo
    estado: 'RESERVA',
    fecha_contrato: '2025-11-22',
    fecha_vencimiento: '2025-12-22',
    ultimo_pago: '2025-11-22',
    saldo_pendiente: 37000, // Resto del anticipo
    observaciones: 'Seña recibida. Esperando completitud de documentación.'
  },
  {
    id: 103,
    cliente_id: 12,
    lote_id: 22,
    vendedor_id: 'carlos.lopez',
    plan_financiacion_id: 3,
    precio_acordado: 410000,
    entrega_inicial: 82000,
    cuotas_cantidad: 36,
    cuota_mensual: 9111,
    pago_contado_hoy: 0,
    estado: 'CANCELADO',
    fecha_contrato: '2025-11-10',
    fecha_vencimiento: '2025-11-17',
    ultimo_pago: null,
    saldo_pendiente: 0,
    observaciones: 'Cliente desistió por falta de fondos.'
  }
];

// Generar contratos adicionales automáticamente
const generarContratosAdicionales = () => {
  const vendedores = ['juan.perez', 'maria.garcia', 'carlos.lopez', 'ana.martinez', 'luis.rodriguez'];
  const planes = [1, 2, 3, 4, 5]; // IDs de planes disponibles
  const estados = ['ACTIVO', 'COMPLETADO', 'RESERVADO', 'CAIDO'];
  const probabilidadEstado = { 'ACTIVO': 0.6, 'COMPLETADO': 0.2, 'RESERVADO': 0.15, 'CAIDO': 0.05 };
  
  const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomChoice = (arr) => arr[random(0, arr.length - 1)];
  const randomDate = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    return new Date(randomTime).toISOString().slice(0, 10);
  };
  
  const getEstadoAleatorio = () => {
    const rand = Math.random();
    if (rand < 0.6) return 'ACTIVO';
    if (rand < 0.8) return 'COMPLETADO'; 
    if (rand < 0.95) return 'RESERVADO';
    return 'CAIDO';
  };
  
  const contratosAdicionales = [];
  let contratoId = 14; // Continúa desde el último ID existente
  
  // Generar contratos para más clientes (del 3 al 60)
  for (let clienteId = 3; clienteId <= 60; clienteId++) {
    // 70% de probabilidad de tener al menos 1 contrato
    if (Math.random() < 0.7) {
      const cantidadContratos = Math.random() < 0.8 ? 1 : 2; // 80% tiene 1 contrato, 20% tiene 2
      
      for (let i = 0; i < cantidadContratos; i++) {
        // Seleccionar lote disponible (algunos lotes pueden repetirse para simular historial)
        const loteId = random(1, 35);
        const estado = getEstadoAleatorio();
        const vendedor = randomChoice(vendedores);
        const planId = randomChoice(planes);
        const fechaContrato = randomDate('2020-01-01', '2024-10-30');
        
        const precioBase = random(150000, 800000);
        const entregaInicial = Math.round(precioBase * (random(20, 50) / 100));
        const cuotasCantidad = [12, 24, 36, 48, 60][random(0, 4)];
        const saldoFinanciar = precioBase - entregaInicial;
        const cuotaMensual = Math.round(saldoFinanciar / cuotasCantidad);
        
        let saldoPendiente = 0;
        let ultimoPago = null;
        
        if (estado === 'ACTIVO') {
          // Para contratos activos, calcular saldo pendiente realista
          const mesesTranscurridos = Math.min(
            Math.floor((new Date() - new Date(fechaContrato)) / (1000 * 60 * 60 * 24 * 30)),
            cuotasCantidad
          );
          const cuotasPagadas = Math.max(0, mesesTranscurridos - random(0, 3)); // Algunas cuotas atrasadas
          saldoPendiente = Math.max(0, saldoFinanciar - (cuotasPagadas * cuotaMensual));
          ultimoPago = cuotasPagadas > 0 ? randomDate(fechaContrato, '2024-11-01') : null;
        } else if (estado === 'COMPLETADO') {
          saldoPendiente = 0;
          ultimoPago = randomDate(fechaContrato, '2024-11-01');
        } else if (estado === 'RESERVADO') {
          saldoPendiente = saldoFinanciar; // Reserva sin pagos
          ultimoPago = fechaContrato; // Solo entrega inicial
        } else if (estado === 'CAIDO') {
          // Contrato caído con deuda
          const mesesPagados = random(1, Math.floor(cuotasCantidad / 2));
          saldoPendiente = saldoFinanciar - (mesesPagados * cuotaMensual);
          ultimoPago = randomDate(fechaContrato, '2024-06-01');
        }
        
        const contrato = {
          id: contratoId++,
          cliente_id: clienteId,
          lote_id: loteId,
          vendedor_id: vendedor,
          plan_financiacion_id: planId,
          precio_acordado: precioBase,
          entrega_inicial: entregaInicial,
          cuotas_cantidad: cuotasCantidad,
          cuota_mensual: cuotaMensual,
          pago_contado_hoy: estado === 'COMPLETADO' && Math.random() < 0.3 ? precioBase : 0,
          estado: estado,
          fecha_contrato: fechaContrato,
          fecha_vencimiento: new Date(new Date(fechaContrato).getTime() + (cuotasCantidad * 30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
          ultimo_pago: ultimoPago,
          saldo_pendiente: saldoPendiente,
          observaciones: `Contrato generado automáticamente - Estado: ${estado}`
        };
        
        contratosAdicionales.push(contrato);
      }
    }
  }
  
  return contratosAdicionales;
};

// Agregar contratos generados al array principal
mockContratos.push(...generarContratosAdicionales());

// Funciones de utilidad para contratos
export const getContratosByClienteId = (clienteId) => {
  return mockContratos.filter(contrato => contrato.cliente_id === clienteId);
};

export const getContratosActivosByClienteId = (clienteId) => {
  return mockContratos.filter(contrato => 
    contrato.cliente_id === clienteId && 
    ['ACTIVO', 'COMPLETADO', 'RESERVADO'].includes(contrato.estado)
  );
};

export const getContratoActivoByLoteId = (loteId) => {
  return mockContratos.find(contrato => 
    contrato.lote_id === loteId && 
    ['ACTIVO', 'COMPLETADO', 'RESERVADO'].includes(contrato.estado)
  );
};

export const getContratosByLoteId = (loteId) => {
  return mockContratos.filter(contrato => contrato.lote_id === loteId);
};

export const getContratosByVendedor = (vendedorId) => {
  return mockContratos.filter(contrato => contrato.vendedor_id === vendedorId);
};

export const getContratosEnMora = () => {
  return mockContratos.filter(contrato => 
    contrato.estado === 'ACTIVO' && contrato.saldo_pendiente > 0
  );
};

export const getEstadisticasContratos = () => {
  const estados = ['ACTIVO', 'COMPLETADO', 'RESERVADO', 'CAIDO'];
  const estadisticas = {};
  
  estados.forEach(estado => {
    estadisticas[estado] = mockContratos.filter(c => c.estado === estado).length;
  });
  
  return {
    ...estadisticas,
    total: mockContratos.length,
    en_mora: getContratosEnMora().length
  };
};