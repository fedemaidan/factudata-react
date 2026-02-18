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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── Helpers ──
const formatMoney = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR');
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const MESES_NOMBRES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const METODOS_PAGO = ['mercadopago', 'transferencia', 'efectivo'];

const estadoColor = {
  pendiente: 'warning',
  pagado: 'success',
  vencido: 'error',
  parcial: 'info'
};

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

// ── Tabla de pagos del período ──
const PagosTable = ({ pagos = [], onRegistrarPago }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Detalle de Pagos del Período</Typography>
      {pagos.length === 0 ? (
        <Typography color="textSecondary">No hay pagos para este período.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Empresa</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Método</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Vencimiento</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Semana Pago</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Demora</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagos.map((pago) => (
                <TableRow key={pago._id}>
                  <TableCell>{pago.empresaNombre || pago.empresaId}</TableCell>
                  <TableCell align="right">{formatMoney(pago.monto)}</TableCell>
                  <TableCell align="center">
                    <Chip label={pago.metodoPago || '–'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={pago.estado} size="small" color={estadoColor[pago.estado] || 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    {pago.fechaVencimiento ? new Date(pago.fechaVencimiento).toLocaleDateString('es-AR') : '–'}
                  </TableCell>
                  <TableCell align="center">
                    {pago.semanaPago ? `S${pago.semanaPago}` : '–'}
                  </TableCell>
                  <TableCell align="center">
                    {pago.diasDemora != null ? (
                      <Chip
                        label={`${pago.diasDemora}d`}
                        size="small"
                        color={pago.diasDemora > 7 ? 'error' : pago.diasDemora > 0 ? 'warning' : 'success'}
                      />
                    ) : '–'}
                  </TableCell>
                  <TableCell align="center">
                    {pago.estado === 'pendiente' || pago.estado === 'vencido' ? (
                      <Button size="small" variant="contained" color="success" onClick={() => onRegistrarPago(pago)}>
                        Cobrar
                      </Button>
                    ) : null}
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

// ── Distribución por semana ──
const SemanaDistribucion = ({ porSemana = [] }) => {
  const total = porSemana.reduce((s, w) => s + (w.cantidad || 0), 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Distribución por Semana de Pago</Typography>
        {porSemana.length === 0 ? (
          <Typography color="textSecondary">Sin datos</Typography>
        ) : (
          <Box>
            {porSemana.map((sem, idx) => (
              <Box key={idx} mb={1.5}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">Semana {sem._id || sem.semana}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {sem.cantidad} pagos ({formatMoney(sem.totalMonto)})
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct(sem.cantidad, total)}
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Dialog para registrar pago ──
const RegistrarPagoDialog = ({ open, pago, onClose, onConfirm }) => {
  const [metodoPago, setMetodoPago] = useState(pago?.metodoPago || 'mercadopago');
  const [comprobante, setComprobante] = useState('');

  if (!pago) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar Pago - {pago.empresaNombre}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography>Monto: <strong>{formatMoney(pago.monto)}</strong></Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Método de pago</InputLabel>
            <Select value={metodoPago} label="Método de pago" onChange={(e) => setMetodoPago(e.target.value)}>
              {METODOS_PAGO.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Comprobante (opcional)"
            value={comprobante}
            onChange={(e) => setComprobante(e.target.value)}
            size="small"
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="success" onClick={() => onConfirm(pago._id, { metodoPago, comprobante })}>
          Confirmar Cobro
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
const AnalyticsCobranza = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [pagoDialog, setPagoDialog] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagosResp, resumenResp] = await Promise.all([
        leadershipService.getPagosPorPeriodo(mes, anio),
        leadershipService.getResumenCobranza(mes, anio)
      ]);
      setPagos(Array.isArray(pagosResp?.pagos) ? pagosResp.pagos : []);
      setResumen(resumenResp || {});
    } catch (err) {
      console.error('Error cargando cobranza:', err);
      setError('No se pudieron cargar los datos de cobranza.');
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleRegistrarPago = async (pagoId, datos) => {
    try {
      await leadershipService.registrarPago(pagoId, datos);
      setPagoDialog(null);
      cargarDatos(); // Recargar
    } catch (err) {
      console.error('Error registrando pago:', err);
    }
  };

  const handleGenerarPendientes = async () => {
    try {
      await leadershipService.generarPagosPendientes(mes, anio);
      cargarDatos();
    } catch (err) {
      console.error('Error generando pendientes:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const totalPagos = pagos.length;
  const totalCobrado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.monto || 0), 0);
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + (p.monto || 0), 0);
  const totalVencido = pagos.filter(p => p.estado === 'vencido').reduce((s, p) => s + (p.monto || 0), 0);
  const totalEsperado = pagos.reduce((s, p) => s + (p.monto || 0), 0);
  const porcentajeCobrado = pct(totalCobrado, totalEsperado);

  return (
    <>
      <Head><title>Cobranza | Leadership</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4">Cobranza</Typography>
              <Typography variant="body2" color="textSecondary">
                Seguimiento de pagos mensuales de suscripciones
              </Typography>
            </Box>
            <Stack direction="row" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Mes</InputLabel>
                <Select value={mes} label="Mes" onChange={(e) => setMes(e.target.value)}>
                  {MESES_NOMBRES.slice(1).map((nombre, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Año</InputLabel>
                <Select value={anio} label="Año" onChange={(e) => setAnio(e.target.value)}>
                  {[2024, 2025, 2026].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleGenerarPendientes}>
                Generar Pendientes
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarDatos}>
                Actualizar
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* KPIs */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Cobrado"
                value={formatMoney(totalCobrado)}
                subtitle={`${porcentajeCobrado}% del esperado`}
                icon={<CheckIcon color="success" />}
                color="success"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Pendiente"
                value={formatMoney(totalPendiente)}
                subtitle={`${pagos.filter(p => p.estado === 'pendiente').length} pagos`}
                icon={<ScheduleIcon color="warning" />}
                color="warning"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Vencido"
                value={formatMoney(totalVencido)}
                subtitle={`${pagos.filter(p => p.estado === 'vencido').length} pagos`}
                icon={<WarningIcon color="error" />}
                color="error"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Total Esperado"
                value={formatMoney(totalEsperado)}
                subtitle={`${totalPagos} pagos totales`}
                icon={<MoneyIcon color="primary" />}
                color="primary"
              />
            </Grid>
          </Grid>

          {/* Barra de progreso de cobranza */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Progreso de Cobranza - {MESES_NOMBRES[mes]} {anio}</Typography>
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={porcentajeCobrado}
                  color={porcentajeCobrado >= 80 ? 'success' : porcentajeCobrado >= 50 ? 'warning' : 'error'}
                  sx={{ height: 24, borderRadius: 2 }}
                />
              </Box>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="textSecondary">
                  {formatMoney(totalCobrado)} cobrado de {formatMoney(totalEsperado)}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color={porcentajeCobrado >= 80 ? 'success.main' : 'warning.main'}>
                  {porcentajeCobrado}%
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {/* Distribución + Tabla */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <SemanaDistribucion porSemana={resumen?.porSemana || []} />
            </Grid>
            <Grid item xs={12} md={8}>
              <PagosTable pagos={pagos} onRegistrarPago={(pago) => setPagoDialog(pago)} />
            </Grid>
          </Grid>

          {/* Dialog */}
          <RegistrarPagoDialog
            open={!!pagoDialog}
            pago={pagoDialog}
            onClose={() => setPagoDialog(null)}
            onConfirm={handleRegistrarPago}
          />
        </Container>
      </Box>
    </>
  );
};

AnalyticsCobranza.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsCobranza;
