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

export const USD_FUENTES = {
  OFICIAL: 'oficial',
  BLUE: 'blue',
};

export const USD_VALORES = {
  COMPRA: 'compra',
  VENTA: 'venta',
  PROMEDIO: 'promedio',
};

export const hoyIso = () => new Date().toISOString().slice(0, 10);

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

