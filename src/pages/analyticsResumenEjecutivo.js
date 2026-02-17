import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Stack,
  LinearProgress,
  Tooltip,
  Divider,
  Button
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  PersonOff as PersonOffIcon,
  Flag as FlagIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── Helpers ──
const formatMoney = (n) => {
  if (n == null) return '$0';
  return '$' + Math.round(n).toLocaleString('es-AR');
};

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ── StatCard ──
const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
          {trend != null && (
            <Chip
              size="small"
              icon={trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${trend >= 0 ? '+' : ''}${trend}%`}
              color={trend >= 0 ? 'success' : 'error'}
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Gauge Break-Even ──
const BreakEvenGauge = ({ mrr, objetivo }) => {
  const porcentaje = pct(mrr, objetivo);
  const brecha = objetivo - mrr;
  const color = porcentaje >= 100 ? 'success' : porcentaje >= 70 ? 'warning' : 'error';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Break-Even</Typography>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={Math.min(porcentaje, 100)}
              size={120}
              thickness={6}
              color={color}
            />
            <Box
              sx={{
                top: 0, left: 0, bottom: 0, right: 0,
                position: 'absolute',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Typography variant="h5" fontWeight="bold" color={`${color}.main`}>
                {porcentaje}%
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">MRR actual</Typography>
            <Typography variant="h5" fontWeight="bold">{formatMoney(mrr)}</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Objetivo</Typography>
            <Typography variant="h6">{formatMoney(objetivo)}</Typography>
            {brecha > 0 && (
              <>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>Brecha</Typography>
                <Typography variant="body1" color="error.main" fontWeight="bold">
                  {formatMoney(brecha)}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Barra horizontal de distribución ──
const DistribucionBar = ({ items, title }) => {
  const total = items.reduce((s, i) => s + i.value, 0);
  const colores = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box sx={{ display: 'flex', height: 32, borderRadius: 1, overflow: 'hidden', mb: 2 }}>
          {items.map((item, i) => (
            <Tooltip key={i} title={`${item.label}: ${item.value} (${pct(item.value, total)}%)`}>
              <Box sx={{ width: `${pct(item.value, total)}%`, backgroundColor: colores[i % colores.length], minWidth: item.value > 0 ? 8 : 0 }} />
            </Tooltip>
          ))}
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {items.map((item, i) => (
            <Chip
              key={i}
              size="small"
              label={`${item.label}: ${item.value}`}
              sx={{ backgroundColor: colores[i % colores.length] + '22', borderLeft: `3px solid ${colores[i % colores.length]}` }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ── Movimientos Mes a Mes (nuevos vs cancelaciones) ──
const MovimientosMesChart = ({ data = [] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.nuevas || 0, d.cancelaciones || 0)), 1);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Altas vs Bajas por Mes</Typography>
        {data.length === 0 ? (
          <Typography color="textSecondary" variant="body2">Sin datos</Typography>
        ) : (
          <Box>
            {data.map((mes, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  {mes.mes}/{mes.anio}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="caption" sx={{ width: 80 }} color="success.main">
                    + {mes.nuevas || 0} altas
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct(mes.nuevas || 0, maxVal)}
                    color="success"
                    sx={{ flex: 1, height: 12, borderRadius: 1 }}
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ width: 80 }} color="error.main">
                    - {mes.cancelaciones || 0} bajas
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct(mes.cancelaciones || 0, maxVal)}
                    color="error"
                    sx={{ flex: 1, height: 12, borderRadius: 1 }}
                  />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Neto: {(mes.nuevas || 0) - (mes.cancelaciones || 0) >= 0 ? '+' : ''}{(mes.nuevas || 0) - (mes.cancelaciones || 0)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
const AnalyticsResumenEjecutivo = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumen, distribucionPlan, movimientos] = await Promise.all([
        leadershipService.getResumenEjecutivo(),
        leadershipService.getDistribucionPorPlan(),
        leadershipService.getMovimientosPorMes(6)
      ]);
      setData({ resumen, distribucionPlan, movimientos });
    } catch (err) {
      console.error('Error cargando resumen ejecutivo:', err);
      setError('No se pudieron cargar los datos. Verificá que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={cargarDatos}>Reintentar</Button>}>
          {error}
        </Alert>
      </Container>
    );
  }

  const { resumen = {}, distribucionPlan = [], movimientos = [] } = data || {};
  const { breakEven = {}, mesActual = {}, historico = {} } = resumen;

  const planItems = (distribucionPlan || []).map(d => ({ label: d._id || 'Sin plan', value: d.cantidad || 0 }));

  return (
    <>
      <Head><title>Resumen Ejecutivo | Leadership</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h4">Resumen Ejecutivo</Typography>
              <Typography variant="body2" color="textSecondary">
                Métricas clave para la reunión semanal de liderazgo
              </Typography>
            </Box>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarDatos}>
              Actualizar
            </Button>
          </Stack>

          {/* ── Break-Even + KPIs principales ── */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={5}>
              <BreakEvenGauge mrr={breakEven.mrr || 0} objetivo={breakEven.objetivo || 1} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    title="Clientes Activos"
                    value={breakEven.clientesActivos || 0}
                    icon={<PeopleIcon color="primary" />}
                    color="primary"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    title="Ticket Promedio"
                    value={formatMoney(breakEven.ticketPromedio)}
                    icon={<MoneyIcon color="success" />}
                    color="success"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    title="Altas este Mes"
                    value={mesActual.nuevos || 0}
                    icon={<PersonAddIcon color="info" />}
                    color="info"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    title="Bajas este Mes"
                    value={mesActual.cancelaciones || 0}
                    icon={<PersonOffIcon color="error" />}
                    color="error"
                  />
                </Grid>
              </Grid>
              <Box mt={2}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="textSecondary">Neto este mes</Typography>
                        <Typography
                          variant="h5"
                          fontWeight="bold"
                          color={(mesActual.netos || 0) >= 0 ? 'success.main' : 'error.main'}
                        >
                          {(mesActual.netos || 0) >= 0 ? '+' : ''}{mesActual.netos || 0} clientes
                        </Typography>
                      </Box>
                      {breakEven.clientesFaltantes > 0 && (
                        <Tooltip title="Clientes que faltan para alcanzar el break-even">
                          <Chip
                            icon={<FlagIcon />}
                            label={`Faltan ${breakEven.clientesFaltantes} clientes`}
                            color="warning"
                          />
                        </Tooltip>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* ── Distribuciones + Movimientos ── */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <DistribucionBar items={planItems.length > 0 ? planItems : [{ label: 'Sin datos', value: 0 }]} title="Distribución por Plan" />
            </Grid>
            <Grid item xs={12} md={7}>
              <MovimientosMesChart data={movimientos} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

AnalyticsResumenEjecutivo.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsResumenEjecutivo;
