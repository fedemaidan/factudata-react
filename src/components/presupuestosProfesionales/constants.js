export const ESTADOS = ['borrador', 'enviado', 'aceptado', 'rechazado', 'vencido'];

export const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
};

export const ESTADO_COLOR = {
  borrador: 'default',
  enviado: 'info',
  aceptado: 'success',
  rechazado: 'error',
  vencido: 'warning',
};

export const TRANSICIONES_VALIDAS = {
  borrador: ['enviado'],
  enviado: ['aceptado', 'rechazado'],
  aceptado: ['vencido'],
  rechazado: ['borrador'],
  vencido: [],
};

export const MONEDAS = ['ARS', 'USD'];

export const TIPOS_ANEXO = [
  { value: 'adicion', label: 'Adición' },
  { value: 'deduccion', label: 'Deducción' },
  { value: 'modificacion', label: 'Modificación' },
];

export const formatCurrency = (val, moneda = 'ARS') => {
  const num = Number(val) || 0;
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  });
};

export const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatPct = (v) => `${(Number(v) || 0).toFixed(1)}%`;
