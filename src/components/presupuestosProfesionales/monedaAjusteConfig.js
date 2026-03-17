export const INDEXACION_VALUES = {
  FIJO: null,
  CAC: 'CAC',
  USD: 'USD',
};

export const CAC_TIPOS = {
  GENERAL: 'general',
  MANO_OBRA: 'mano_obra',
  MATERIALES: 'materiales',
};

export const CAC_LABELS = {
  [CAC_TIPOS.GENERAL]: 'Promedio',
  [CAC_TIPOS.MANO_OBRA]: 'Mano de obra',
  [CAC_TIPOS.MATERIALES]: 'Materiales',
};

export const USD_FUENTES = {
  OFICIAL: 'oficial',
  BLUE: 'blue',
};

export const USD_VALORES = {
  COMPRA: 'compra',
  VENTA: 'venta',
  PROMEDIO: 'promedio',
};

export const USD_FUENTE_LABELS = {
  [USD_FUENTES.OFICIAL]: 'USD Oficial',
  [USD_FUENTES.BLUE]: 'USD Blue',
};

export const USD_VALOR_LABELS = {
  [USD_VALORES.COMPRA]: 'compra',
  [USD_VALORES.VENTA]: 'venta',
  [USD_VALORES.PROMEDIO]: 'promedio',
};

export const hoyIso = () => new Date().toISOString().slice(0, 10);

/** Devuelve el mes de 2 meses atrás en formato YYYY-MM para CAC (el índice se publica con retraso). */
export const toMesAnterior = (fechaIso = '') => {
  const str = typeof fechaIso === 'string' ? fechaIso : '';
  const mes = str.length >= 7 ? str.slice(0, 7) : '';
  if (!mes || mes.length < 7) return '';
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 3, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const normalizarAjusteMoneda = (form = {}) => {
  const moneda = form.moneda === 'USD' ? 'USD' : 'ARS';
  const indexacion = moneda === 'USD'
    ? INDEXACION_VALUES.USD
    : [INDEXACION_VALUES.CAC, INDEXACION_VALUES.USD].includes(form.indexacion)
      ? form.indexacion
      : INDEXACION_VALUES.FIJO;

  return {
    moneda,
    indexacion,
    cac_tipo: form.cac_tipo || CAC_TIPOS.GENERAL,
    usd_fuente: form.usd_fuente || USD_FUENTES.OFICIAL,
    usd_valor: form.usd_valor || USD_VALORES.PROMEDIO,
  };
};

