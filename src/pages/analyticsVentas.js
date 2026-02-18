import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Stack,
  LinearProgress,
  Tooltip,
  Button,
  Divider
} from '@mui/material';
import {
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Phone as PhoneIcon,
  Handshake as HandshakeIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { subMonths } from 'date-fns';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── Helpers ──
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ── StatCard ──
const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>{title}</Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>{value}</Typography>
          {subtitle && <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ backgroundColor: `${color}.light`, borderRadius: 2, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Funnel Visual ──
const FunnelChart = ({ funnel = {} }) => {
  const steps = [
    { key: 'leads', label: 'Leads', color: '#90caf9', icon: <PeopleIcon /> },
    { key: 'contactados', label: 'Contactados', color: '#64b5f6', icon: <PhoneIcon /> },
    { key: 'reunionesAgendadas', label: 'Reuniones Agendadas', color: '#42a5f5', icon: <FilterIcon /> },
    { key: 'reunionesRealizadas', label: 'Reuniones Realizadas', color: '#1e88e5', icon: <HandshakeIcon /> },
    { key: 'ventas', label: 'Ventas', color: '#4caf50', icon: <MoneyIcon /> }
  ];
  const maxVal = Math.max(...steps.map(s => funnel[s.key] || 0), 1);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Funnel de Ventas</Typography>
        <Box sx={{ mt: 2 }}>
          {steps.map((step, idx) => {
            const val = funnel[step.key] || 0;
            const prevVal = idx > 0 ? (funnel[steps[idx - 1].key] || 0) : val;
            const conversion = idx > 0 ? pct(val, prevVal) : 100;

            return (
              <Box key={step.key} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    {step.icon}
                    <Typography variant="body2" fontWeight="bold">{step.label}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography variant="h6" fontWeight="bold">{val}</Typography>
                    {idx > 0 && (
                      <Chip
                        label={`${conversion}%`}
                        size="small"
                        color={conversion >= 50 ? 'success' : conversion >= 25 ? 'warning' : 'error'}
                      />
                    )}
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct(val, maxVal)}
                  sx={{
                    height: 24,
                    borderRadius: 1,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': { backgroundColor: step.color, borderRadius: 1 }
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {/* Conversión global */}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary">Conversión Lead → Venta</Typography>
          <Chip
            label={`${pct(funnel.ventas || 0, funnel.leads || 0)}%`}
            color="primary"
            icon={<TrendingUpIcon />}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

// ── Tabla por Canal ──
const CanalTable = ({ canales = [] }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Rendimiento por Canal</Typography>
      {canales.length === 0 ? (
        <Typography color="textSecondary">Sin datos</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Canal</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Leads</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Contactados</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Reuniones</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ventas</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Conversión</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {canales.map((canal, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Chip label={canal.canal || canal._id || 'N/A'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">{canal.leads || 0}</TableCell>
                  <TableCell align="center">{canal.contactados || 0}</TableCell>
                  <TableCell align="center">{canal.reuniones || 0}</TableCell>
                  <TableCell align="center">{canal.ventas || 0}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${pct(canal.ventas || 0, canal.leads || 0)}%`}
                      size="small"
                      color={pct(canal.ventas || 0, canal.leads || 0) >= 10 ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardContent>
  </Card>
);

// ── Tabla por SDR ──
const SDRTable = ({ sdrs = [] }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Métricas por SDR</Typography>
      {sdrs.length === 0 ? (
        <Typography color="textSecondary">Sin datos</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>SDR</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Contactos Asignados</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Intentos</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Reuniones</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Conv. a Reunión</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sdrs.map((sdr, idx) => (
                <TableRow key={idx}>
                  <TableCell fontWeight="bold">{sdr.nombre || sdr._id || 'Sin asignar'}</TableCell>
                  <TableCell align="center">{sdr.contactos || 0}</TableCell>
                  <TableCell align="center">{sdr.intentos || 0}</TableCell>
                  <TableCell align="center">{sdr.reuniones || 0}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${pct(sdr.reuniones || 0, sdr.contactos || 0)}%`}
                      size="small"
                      color={pct(sdr.reuniones || 0, sdr.contactos || 0) >= 5 ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardContent>
  </Card>
);

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
const AnalyticsVentas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(subMonths(new Date(), 1));
  const [fechaHasta, setFechaHasta] = useState(new Date());

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [funnelResp, canalResp, sdrResp] = await Promise.all([
        leadershipService.getFunnel(fechaDesde, fechaHasta),
        leadershipService.getMetricasPorCanal(fechaDesde, fechaHasta),
        leadershipService.getMetricasPorSDR(fechaDesde, fechaHasta)
      ]);
      setData({
        funnel: funnelResp?.funnel || {},
        porCanal: Array.isArray(canalResp?.canales) ? canalResp.canales : [],
        porSDR: Array.isArray(sdrResp?.sdrs) ? sdrResp.sdrs : []
      });
    } catch (err) {
      console.error('Error cargando ventas:', err);
      setError('No se pudieron cargar los datos de ventas.');
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const { funnel = {}, porCanal = [], porSDR = [] } = data || {};

  return (
    <>
      <Head><title>Ventas & Funnel | Leadership</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4">Ventas & Funnel</Typography>
              <Typography variant="body2" color="textSecondary">
                Pipeline de ventas, conversión por canal y rendimiento SDR
              </Typography>
            </Box>
            <Stack direction="row" gap={2} alignItems="center">
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <DatePicker
                  label="Desde"
                  value={fechaDesde}
                  onChange={setFechaDesde}
                  slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                />
                <DatePicker
                  label="Hasta"
                  value={fechaHasta}
                  onChange={setFechaHasta}
                  slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                />
              </LocalizationProvider>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarDatos}>
                Actualizar
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* KPIs */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard title="Total Leads" value={funnel.leads || 0} icon={<PeopleIcon color="primary" />} color="primary" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Reuniones" value={funnel.reunionesRealizadas || 0} icon={<HandshakeIcon color="info" />} color="info" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Ventas" value={funnel.ventas || 0} icon={<MoneyIcon color="success" />} color="success" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Conv. Global"
                value={`${pct(funnel.ventas || 0, funnel.leads || 0)}%`}
                icon={<TrendingUpIcon color="warning" />}
                color="warning"
              />
            </Grid>
          </Grid>

          {/* Funnel */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <FunnelChart funnel={funnel} />
            </Grid>
            <Grid item xs={12} md={6}>
              <CanalTable canales={porCanal} />
            </Grid>
          </Grid>

          {/* SDR */}
          <SDRTable sdrs={porSDR} />
        </Container>
      </Box>
    </>
  );
};

AnalyticsVentas.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsVentas;
