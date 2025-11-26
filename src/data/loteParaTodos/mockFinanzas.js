
// src/data/loteParaTodos/mockFinanzas.js

export const mockCuentas = [
  {
    id: 1,
    nombre: 'Caja Central - Efectivo',
    tipo: 'CAJA',
    moneda: 'ARS',
    saldo: 1540000,
    descripcion: 'Caja fuerte oficina central',
    ultimo_movimiento: '2025-11-24'
  },
  {
    id: 2,
    nombre: 'Caja Chica - Gastos',
    tipo: 'CAJA',
    moneda: 'ARS',
    saldo: 25000,
    descripcion: 'Gastos diarios menores',
    ultimo_movimiento: '2025-11-23'
  },
  {
    id: 3,
    nombre: 'Banco Galicia - CC $',
    tipo: 'BANCO',
    moneda: 'ARS',
    saldo: 12500000,
    cbu: '0070000000000000000001',
    descripcion: 'Cuenta Corriente Operativa',
    ultimo_movimiento: '2025-11-24'
  },
  {
    id: 4,
    nombre: 'Banco Galicia - CC USD',
    tipo: 'BANCO',
    moneda: 'USD',
    saldo: 45000,
    cbu: '0070000000000000000002',
    descripcion: 'Cuenta Dólares',
    ultimo_movimiento: '2025-11-20'
  },
  {
    id: 5,
    nombre: 'MercadoPago',
    tipo: 'VIRTUAL',
    moneda: 'ARS',
    saldo: 850000,
    alias: 'loteparatodos.mp',
    descripcion: 'Cobros digitales',
    ultimo_movimiento: '2025-11-24'
  }
];

export const mockMovimientos = [
  {
    id: 1001,
    fecha: '2025-11-24',
    descripcion: 'Cobro Cuota 5 - Lote 14 (Juan Perez)',
    monto: 150000,
    moneda: 'ARS',
    tipo: 'INGRESO',
    categoria: 'COBRANZA_CUOTA',
    cuenta_id: 1, // Caja Central
    contrato_id: 101,
    conciliado: true,
    usuario: 'admin'
  },
  {
    id: 1002,
    fecha: '2025-11-24',
    descripcion: 'Pago Luz Oficina',
    monto: 45000,
    moneda: 'ARS',
    tipo: 'EGRESO',
    categoria: 'GASTOS_OPERATIVOS',
    cuenta_id: 3, // Banco Galicia
    contrato_id: null,
    conciliado: false,
    usuario: 'admin'
  },
  {
    id: 1003,
    fecha: '2025-11-23',
    descripcion: 'Seña Reserva Lote 22 (Maria Gonzalez)',
    monto: 500000,
    moneda: 'ARS',
    tipo: 'INGRESO',
    categoria: 'COBRANZA_ANTICIPO',
    cuenta_id: 5, // MercadoPago
    contrato_id: 105,
    conciliado: true,
    usuario: 'vendedor1'
  },
  {
    id: 1004,
    fecha: '2025-11-23',
    descripcion: 'Compra Insumos Librería',
    monto: 12500,
    moneda: 'ARS',
    tipo: 'EGRESO',
    categoria: 'GASTOS_VARIOS',
    cuenta_id: 2, // Caja Chica
    contrato_id: null,
    conciliado: true,
    usuario: 'admin'
  },
  {
    id: 1005,
    fecha: '2025-11-20',
    descripcion: 'Cobro Refuerzo Semestral - Lote 8',
    monto: 2000,
    moneda: 'USD',
    tipo: 'INGRESO',
    categoria: 'COBRANZA_REFUERZO',
    cuenta_id: 4, // Galicia USD
    contrato_id: 108,
    conciliado: true,
    usuario: 'admin'
  }
];

export const CATEGORIAS_MOVIMIENTOS = [
  'COBRANZA_CUOTA',
  'COBRANZA_ANTICIPO',
  'COBRANZA_REFUERZO',
  'GASTOS_OPERATIVOS',
  'GASTOS_VARIOS',
  'HONORARIOS',
  'IMPUESTOS',
  'TRANSFERENCIA_INTERNA',
  'AJUSTE'
];

export const mockExtractoBancario = [
  {
    id: 'EXT-001',
    fecha: '2025-11-24',
    descripcion: 'DEBIN EDESUR S.A.',
    monto: 45000,
    tipo: 'EGRESO',
    cuenta_id: 3, // Galicia ARS
    conciliado: false
  },
  {
    id: 'EXT-002',
    fecha: '2025-11-24',
    descripcion: 'TRANSFERENCIA RECIBIDA VARIOS',
    monto: 150000,
    tipo: 'INGRESO',
    cuenta_id: 3, // Galicia ARS
    conciliado: false
  },
  {
    id: 'EXT-003',
    fecha: '2025-11-23',
    descripcion: 'IMPUESTO LEY 25413',
    monto: 1200,
    tipo: 'EGRESO',
    cuenta_id: 3, // Galicia ARS
    conciliado: false
  },
  {
    id: 'EXT-004',
    fecha: '2025-11-20',
    descripcion: 'TRANSFERENCIA USD EXTERIOR',
    monto: 2000,
    tipo: 'INGRESO',
    cuenta_id: 4, // Galicia USD
    conciliado: true // Ya conciliado con el mov 1005
  }
];
