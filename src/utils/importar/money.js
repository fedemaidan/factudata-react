export const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
