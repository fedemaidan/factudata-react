// Formateo compacto en dólares para la Vista única de obra.
// Los KPIs usan forma compacta (US$1.28M); las tablas, el valor exacto.

export function fmtUsdCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}US$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}US$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}US$${Math.round(abs)}`;
}

export function fmtUsd(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function fmtUsdM2(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value) || 0;
  return `US$${Math.round(n).toLocaleString('es-AR')}/m²`;
}

export function fmtPct(value) {
  if (value === null || value === undefined) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

export function fmtFechaCorta(date) {
  if (!date) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}
