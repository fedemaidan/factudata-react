import { Card, CardContent, Tooltip, Typography } from '@mui/material';

// Formato de plata completo (ARS) y compacto ($M / $k) — vocabulario del mock.
export const fmt = (n) => (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

// ─── Moneda / indexación (F7): montos guardados NATIVOS (CAC/USD), no pesos ─────
// `info` = { moneda, cac_tipo, cac_indice, dolar } | null (null ⇒ ARS).

// Número plano sin símbolo de $ (para no falsear CAC/USD como pesos).
const fmtNum = (n) => (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });

export const esMonedaNativa = (info) => !!(info && info.moneda && info.moneda !== 'ARS');

// Etiqueta corta de la moneda: "CAC gral", "CAC m.o.", "USD".
export const monedaLabel = (info) => {
  if (!info || !info.moneda || info.moneda === 'ARS') return 'ARS';
  if (info.moneda === 'USD') return 'USD';
  const sub = { general: 'gral', mano_obra: 'm.o.', materiales: 'mat.' }[info.cac_tipo] || info.cac_tipo || 'gral';
  return `CAC ${sub}`;
};

// Valoriza un monto nativo a pesos (mismo criterio que el backend).
export const valorizarPesos = (n, info) => {
  const base = Number(n) || 0;
  if (!esMonedaNativa(info)) return base;
  if (info.moneda === 'CAC') return info.cac_indice ? base * info.cac_indice : base;
  if (info.moneda === 'USD') return info.dolar ? base * info.dolar : base;
  return base;
};

// Formatea un monto según su moneda: ARS con "$"; nativo como "<n> <MONEDA>" (código
// corto "8.896 CAC" / "50 USD"). Sin chip: el sufijo en texto es claro y legible. El
// subíndice CAC (general/mano_obra) y el equivalente en pesos van en el tooltip.
export const fmtMoneda = (n, info) => (esMonedaNativa(info) ? `${fmtNum(n)} ${info.moneda}` : fmt(n));

// Moneda "de la obra" para los agregados (totales/KPIs): CAC si está indexada, si no
// USD/ARS. Los sub-rubros pueden tener monedas mezcladas — esto es la moneda declarada
// de la obra, útil para etiquetar totales cuando la obra es de una sola moneda.
export const obraMonedaInfo = (obra) => {
  if (!obra) return null;
  if (obra.indexacion === 'CAC') return { moneda: 'CAC', cac_tipo: obra.cac_tipo || 'general', cac_indice: null, dolar: null };
  if (obra.moneda === 'USD') return { moneda: 'USD', cac_tipo: null, cac_indice: null, dolar: null };
  return null; // ARS
};


export const fmtM = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

// Tarjeta de KPI (mismo estilo que el mock).
export function KpiCard({ label, value, sub, color = 'text.primary', tooltip }) {
  const card = (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
  return tooltip ? <Tooltip title={tooltip} arrow>{card}</Tooltip> : card;
}
