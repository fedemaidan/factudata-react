// src/data/loteParaTodos/constantes.js

// Estados y condiciones de lotes
export const CONDICION_LOTE = {
  DISPONIBLE: 'disponible',
  RESERVADO: 'reservado', 
  PRE_RESERVADO: 'pre_reservado',
  ACTIVO: 'activo',
  NO_A_LA_VENTA: 'no_a_la_venta',
  OFICINA: 'oficina'
};

export const CONDICION_LOTE_LABELS = {
  [CONDICION_LOTE.DISPONIBLE]: 'Disponible',
  [CONDICION_LOTE.RESERVADO]: 'Reservado',
  [CONDICION_LOTE.PRE_RESERVADO]: 'Pre-reservado',
  [CONDICION_LOTE.ACTIVO]: 'Activo',
  [CONDICION_LOTE.NO_A_LA_VENTA]: 'No a la venta',
  [CONDICION_LOTE.OFICINA]: 'Oficina'
};

export const ESTADO_LEGAL = {
  NORMAL: 'normal',
  EN_LEGALES: 'en_legales',
  BLOQUEADO: 'bloqueado'
};

export const ESTADO_LEGAL_LABELS = {
  [ESTADO_LEGAL.NORMAL]: 'Normal',
  [ESTADO_LEGAL.EN_LEGALES]: 'En legales',
  [ESTADO_LEGAL.BLOQUEADO]: 'Bloqueado'
};

export const SITUACION_FISICA = {
  BALDIO: 'baldio',
  CERCADO: 'cercado',
  EN_CONSTRUCCION: 'en_construccion',
  OBRA_TERMINADA: 'obra_terminada',
  VIVIENDO: 'viviendo'
};

export const SITUACION_FISICA_LABELS = {
  [SITUACION_FISICA.BALDIO]: 'Baldío',
  [SITUACION_FISICA.CERCADO]: 'Cercado',
  [SITUACION_FISICA.EN_CONSTRUCCION]: 'En construcción',
  [SITUACION_FISICA.OBRA_TERMINADA]: 'Obra terminada',
  [SITUACION_FISICA.VIVIENDO]: 'Viviendo'
};

// Colores para la UI
export const CONDICION_LOTE_COLORS = {
  [CONDICION_LOTE.DISPONIBLE]: 'success',
  [CONDICION_LOTE.RESERVADO]: 'warning',
  [CONDICION_LOTE.PRE_RESERVADO]: 'info',
  [CONDICION_LOTE.ACTIVO]: 'primary',
  [CONDICION_LOTE.NO_A_LA_VENTA]: 'default',
  [CONDICION_LOTE.OFICINA]: 'secondary'
};

export const ESTADO_LEGAL_COLORS = {
  [ESTADO_LEGAL.NORMAL]: 'success',
  [ESTADO_LEGAL.EN_LEGALES]: 'warning',
  [ESTADO_LEGAL.BLOQUEADO]: 'error'
};

export const SITUACION_FISICA_COLORS = {
  [SITUACION_FISICA.BALDIO]: 'default',
  [SITUACION_FISICA.CERCADO]: 'info',
  [SITUACION_FISICA.EN_CONSTRUCCION]: 'warning',
  [SITUACION_FISICA.OBRA_TERMINADA]: 'success',
  [SITUACION_FISICA.VIVIENDO]: 'primary'
};

// Estados de contrato
export const ESTADO_CONTRATO = {
  ACTIVO: 'activo',
  EN_MORA: 'en_mora',
  EN_LEGALES: 'en_legales',
  BLOQUEADO: 'bloqueado',
  RESCINDIDO: 'rescindido',
  FINALIZADO: 'finalizado'
};

export const ESTADO_CONTRATO_LABELS = {
  [ESTADO_CONTRATO.ACTIVO]: 'Activo',
  [ESTADO_CONTRATO.EN_MORA]: 'En Mora',
  [ESTADO_CONTRATO.EN_LEGALES]: 'En Legales',
  [ESTADO_CONTRATO.BLOQUEADO]: 'Bloqueado',
  [ESTADO_CONTRATO.RESCINDIDO]: 'Rescindido',
  [ESTADO_CONTRATO.FINALIZADO]: 'Finalizado'
};

export const ESTADO_CONTRATO_COLORS = {
  [ESTADO_CONTRATO.ACTIVO]: 'success',
  [ESTADO_CONTRATO.EN_MORA]: 'warning',
  [ESTADO_CONTRATO.EN_LEGALES]: 'error',
  [ESTADO_CONTRATO.BLOQUEADO]: 'error',
  [ESTADO_CONTRATO.RESCINDIDO]: 'default',
  [ESTADO_CONTRATO.FINALIZADO]: 'primary'
};

// Tipos de pago
export const TIPO_PAGO = {
  CUOTA: 'cuota',
  PRESTAMO: 'prestamo',
  SERVICIO: 'servicio',
  MOVIMIENTO_INTERNO: 'movimiento_interno'
};

export const TIPO_PAGO_LABELS = {
  [TIPO_PAGO.CUOTA]: 'Cuota de Contrato',
  [TIPO_PAGO.PRESTAMO]: 'Préstamo',
  [TIPO_PAGO.SERVICIO]: 'Servicio',
  [TIPO_PAGO.MOVIMIENTO_INTERNO]: 'Movimiento Interno'
};

// Métodos de pago
export const METODO_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA: 'transferencia',
  CHEQUE: 'cheque',
  TARJETA: 'tarjeta',
  DEBITO_AUTOMATICO: 'debito_automatico'
};

export const METODO_PAGO_LABELS = {
  [METODO_PAGO.EFECTIVO]: 'Efectivo',
  [METODO_PAGO.TRANSFERENCIA]: 'Transferencia',
  [METODO_PAGO.CHEQUE]: 'Cheque',
  [METODO_PAGO.TARJETA]: 'Tarjeta',
  [METODO_PAGO.DEBITO_AUTOMATICO]: 'Débito Automático'
};

// Configuración deuda municipal
export const CONFIG_DEUDA_MUNICIPAL = {
  URL_TEMPLATE: 'https://municipio.gov.ar/consulta?partida={partida}',
  PORCENTAJE_CREDITO_MAXIMO: 20 // % del monto pagado
};

// Funciones de mapeo de estados legacy a nuevos
export const mapLegacyEstadoToCondicion = (legacyEstado) => {
  const mapping = {
    'DISPONIBLE': CONDICION_LOTE.DISPONIBLE,
    'VENDIDO': CONDICION_LOTE.ACTIVO,
    'RESERVADO': CONDICION_LOTE.RESERVADO,
    'BLOQUEADO': CONDICION_LOTE.NO_A_LA_VENTA
  };
  return mapping[legacyEstado] || CONDICION_LOTE.DISPONIBLE;
};

export const mapLegacyEstadoToEstadoLegal = (legacyEstado) => {
  const mapping = {
    'BLOQUEADO': ESTADO_LEGAL.BLOQUEADO,
    'DISPONIBLE': ESTADO_LEGAL.NORMAL,
    'VENDIDO': ESTADO_LEGAL.NORMAL,
    'RESERVADO': ESTADO_LEGAL.NORMAL
  };
  return mapping[legacyEstado] || ESTADO_LEGAL.NORMAL;
};

// Estados permitidos para nueva reserva/venta
export const CONDICIONES_PARA_NUEVA_RESERVA = [
  CONDICION_LOTE.DISPONIBLE,
  CONDICION_LOTE.PRE_RESERVADO
];

// Transiciones de estado permitidas
export const TRANSICIONES_CONDICION = {
  [CONDICION_LOTE.DISPONIBLE]: [CONDICION_LOTE.PRE_RESERVADO, CONDICION_LOTE.NO_A_LA_VENTA],
  [CONDICION_LOTE.PRE_RESERVADO]: [CONDICION_LOTE.RESERVADO, CONDICION_LOTE.DISPONIBLE],
  [CONDICION_LOTE.RESERVADO]: [CONDICION_LOTE.ACTIVO, CONDICION_LOTE.DISPONIBLE],
  [CONDICION_LOTE.ACTIVO]: [],
  [CONDICION_LOTE.NO_A_LA_VENTA]: [CONDICION_LOTE.DISPONIBLE],
  [CONDICION_LOTE.OFICINA]: [CONDICION_LOTE.DISPONIBLE]
};