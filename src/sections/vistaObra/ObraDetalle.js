// Detalle de una obra: cash flow, cuotas (quién debe), gasto por categoría y análisis m².
// Todo en USD. Se muestra debajo de las 4 tarjetas cuando hay una obra elegida.

import PropTypes from 'prop-types';
import {
  Card, CardContent, Typography, Stack, Chip, Box, LinearProgress, Divider, Grid,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

import { fmtUsd, fmtUsdCompact, fmtUsdM2, fmtFechaCorta } from './format';

function Panel({ titulo, extra, children }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2">{titulo}</Typography>
          {extra && <Typography variant="caption" color="text.disabled">{extra}</Typography>}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

Panel.propTypes = { titulo: PropTypes.string, extra: PropTypes.string, children: PropTypes.node };

function CashflowPanel({ cashflow }) {
  if (!cashflow.length) {
    return <Panel titulo="Cash flow · esperado vs cobrado"><VacioMsg /></Panel>;
  }
  const meses = cashflow.map((m) => m.mes.slice(2)); // YY-MM
  return (
    <Panel titulo="Cash flow · esperado vs cobrado">
      <BarChart
        height={200}
        xAxis={[{ scaleType: 'band', data: meses }]}
        series={[
          { data: cashflow.map((m) => Math.round(m.esperado)), label: 'Esperado', color: '#B4B2A9' },
          { data: cashflow.map((m) => Math.round(m.cobrado)), label: 'Cobrado', color: '#378ADD' },
        ]}
        margin={{ left: 60, right: 10, top: 20, bottom: 40 }}
      />
    </Panel>
  );
}

CashflowPanel.propTypes = { cashflow: PropTypes.array.isRequired };

function CuotasPanel({ cuotas }) {
  return (
    <Panel titulo="Cuotas · quién debe">
      {cuotas.length === 0 && <VacioMsg texto="Sin cuotas pendientes." />}
      {cuotas.slice(0, 6).map((c) => (
        <Stack key={c.id} direction="row" justifyContent="space-between" alignItems="center"
          sx={{ py: 0.75, borderBottom: '0.5px solid', borderColor: 'divider' }}>
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2">{c.label}</Typography>
              {c.esAdicional && <Chip size="small" variant="outlined" label="adicional" sx={{ height: 18, fontSize: '0.6rem' }} />}
            </Stack>
            <Typography variant="caption" color={c.vencida ? 'error.main' : 'warning.main'}>
              {c.vencida ? 'Venció' : 'Vence'} {fmtFechaCorta(c.fecha)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{fmtUsdCompact(c.monto)}</Typography>
        </Stack>
      ))}
    </Panel>
  );
}

CuotasPanel.propTypes = { cuotas: PropTypes.array.isRequired };

function GastoCategoriaPanel({ items }) {
  return (
    <Panel titulo="Gasto vs presupuesto · por categoría">
      {items.length === 0 && <VacioMsg />}
      {items.slice(0, 6).map((c) => {
        const pct = c.presupuestado > 0 ? Math.min((c.gastado / c.presupuestado) * 100, 100) : 0;
        return (
          <Box key={c.categoria} sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption">{c.categoria}</Typography>
              <Typography variant="caption" color={c.excedido ? 'error.main' : 'text.secondary'}>
                {fmtUsdCompact(c.gastado)} / {fmtUsdCompact(c.presupuestado)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={c.excedido ? 'error' : 'success'}
              sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
            />
          </Box>
        );
      })}
    </Panel>
  );
}

GastoCategoriaPanel.propTypes = { items: PropTypes.array.isRequired };

function AnalisisM2Panel({ analisis, m2 }) {
  return (
    <Panel titulo="Análisis por m²" extra={m2 ? `· ${Math.round(m2)} m²` : undefined}>
      {analisis.filas.length === 0 && <VacioMsg texto="Falta cargar el presupuesto de costo." />}
      {analisis.filas.slice(0, 6).map((f) => (
        <Stack key={f.categoria} direction="row" justifyContent="space-between"
          sx={{ py: 0.75, borderBottom: '0.5px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">{f.categoria}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{fmtUsdM2(f.montoM2)}</Typography>
        </Stack>
      ))}
      {analisis.precioM2 != null && (
        <>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>Precio / m²</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }} color="success.main">{fmtUsdM2(analisis.precioM2)}</Typography>
          </Stack>
        </>
      )}
    </Panel>
  );
}

AnalisisM2Panel.propTypes = { analisis: PropTypes.object.isRequired, m2: PropTypes.number };

function VacioMsg({ texto = 'Sin datos para esta obra.' }) {
  return <Typography variant="body2" color="text.disabled" sx={{ py: 1 }}>{texto}</Typography>;
}

VacioMsg.propTypes = { texto: PropTypes.string };

export default function ObraDetalle({ detalle }) {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}><CashflowPanel cashflow={detalle.cashflow} /></Grid>
      <Grid item xs={12} md={6}><CuotasPanel cuotas={detalle.cuotas} /></Grid>
      <Grid item xs={12} md={6}><GastoCategoriaPanel items={detalle.gastoPorCategoria} /></Grid>
      <Grid item xs={12} md={6}><AnalisisM2Panel analisis={detalle.analisisM2} m2={detalle.m2} /></Grid>
    </Grid>
  );
}

ObraDetalle.propTypes = {
  detalle: PropTypes.object.isRequired,
};
