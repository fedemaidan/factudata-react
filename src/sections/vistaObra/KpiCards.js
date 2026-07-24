// Las 4 tarjetas por tema (costo / cobros / margen / por m²).
// Siempre en el mismo lugar: en "Todas" suman la cartera; con una obra elegida,
// muestran los números de esa obra. Todo en USD.

import PropTypes from 'prop-types';
import { Card, CardContent, Chip, LinearProgress, Stack, Typography, Box, Grid } from '@mui/material';
import WalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SquareFootIcon from '@mui/icons-material/SquareFoot';

import { fmtUsdCompact, fmtUsdM2, fmtPct } from './format';

function CardShell({ icon, titulo, children }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary', mb: 1 }}>
          {icon}
          <Typography variant="caption" sx={{ fontWeight: 500 }}>{titulo}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

CardShell.propTypes = { icon: PropTypes.node, titulo: PropTypes.string, children: PropTypes.node };

function LineaM2({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{fmtUsdM2(value)}</Typography>
    </Stack>
  );
}

LineaM2.propTypes = { label: PropTypes.string, value: PropTypes.number };

export default function KpiCards({ totales }) {
  const pctGastado = totales.pctGastado != null ? Math.min(totales.pctGastado, 1.2) : 0;
  const gastoColor = totales.pctGastado > 1 ? 'error' : totales.pctGastado > 0.85 ? 'warning' : 'success';

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <CardShell icon={<WalletIcon fontSize="small" />} titulo="Costo">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{fmtUsdCompact(totales.gastado)}</Typography>
          <Typography variant="caption" color="text.secondary">
            de {fmtUsdCompact(totales.costo)} presupuestado
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.round(pctGastado * 100 / 1.2)}
            color={gastoColor}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" color="text.secondary">
            {fmtPct(totales.pctGastado)} consumido
          </Typography>
        </CardShell>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <CardShell icon={<PaymentsIcon fontSize="small" />} titulo="Cobros">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>{fmtUsdCompact(totales.cobrado)}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            de {fmtUsdCompact(totales.venta)} a cobrar
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="success" variant="outlined" label={`Este mes ${fmtUsdCompact(totales.esteMes)}`} />
            {totales.vencido > 0 && (
              <Chip size="small" color="error" variant="outlined" label={`Vencido ${fmtUsdCompact(totales.vencido)}`} />
            )}
          </Stack>
        </CardShell>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <CardShell icon={<TrendingUpIcon fontSize="small" />} titulo="Margen">
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>{fmtUsdCompact(totales.margen)}</Typography>
            <Typography variant="body2" color="text.secondary">{fmtPct(totales.margenPct)}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            venta {fmtUsdCompact(totales.venta)} · costo {fmtUsdCompact(totales.costo)}
          </Typography>
        </CardShell>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <CardShell icon={<SquareFootIcon fontSize="small" />} titulo="Por m²">
          <Box sx={{ mt: 0.5 }}>
            <LineaM2 label="Costo/m²" value={totales.costoM2} />
            <LineaM2 label="Precio/m²" value={totales.precioM2} />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Ganancia/m²</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }} color="success.main">
                {fmtUsdM2(totales.gananciaM2)}
              </Typography>
            </Stack>
          </Box>
        </CardShell>
      </Grid>
    </Grid>
  );
}

KpiCards.propTypes = {
  totales: PropTypes.object.isRequired,
};
