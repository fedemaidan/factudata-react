import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── Helpers ──
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const getRetencionColor = (valor) => {
  if (valor >= 80) return '#4caf50';
  if (valor >= 60) return '#8bc34a';
  if (valor >= 40) return '#ff9800';
  if (valor >= 20) return '#f44336';
  return '#b71c1c';
};

const getRetencionBg = (valor) => {
  if (valor == null) return 'transparent';
  return getRetencionColor(valor) + '33';
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

// ── Tabla de cohortes (heat-map) ──
const CohortTable = ({ cohortes = [] }) => {
  if (cohortes.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Retención por Cohortes</Typography>
          <Typography color="textSecondary">No hay datos de cohortes disponibles.</Typography>
        </CardContent>
      </Card>
    );
  }

  // Encontrar máximo de meses de retención para saber cuántas columnas
  const maxMeses = Math.max(...cohortes.map(c => Object.keys(c.retencion || {}).length), 0);
  const columnas = Array.from({ length: maxMeses }, (_, i) => i);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Retención por Cohortes</Typography>
        <Typography variant="body2" color="textSecondary" mb={2}>
          Cada fila es un mes de ingreso. Los valores muestran el % de clientes que siguen activos en el mes N.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Cohorte</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Clientes</TableCell>
                {columnas.map(i => (
                  <TableCell key={i} align="center" sx={{ fontWeight: 'bold', minWidth: 55 }}>
                    Mes {i}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {cohortes.map((cohorte, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {cohorte.mesInicio}
                  </TableCell>
                  <TableCell align="center">{cohorte.clientesIngresados}</TableCell>
                  {columnas.map(i => {
                    const valor = cohorte.retencion?.[`mes${i}`];
                    return (
                      <TableCell
                        key={i}
                        align="center"
                        sx={{
                          backgroundColor: getRetencionBg(valor),
                          fontWeight: valor != null ? 'bold' : 'normal',
                          color: valor != null ? getRetencionColor(valor) : 'text.disabled'
                        }}
                      >
                        {valor != null ? `${valor}%` : '–'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

// ── Lista de inactivas ──
const InactivasTable = ({ inactivas = [] }) => (
  <Card>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Clientes Inactivos
          {inactivas.length > 0 && (
            <Chip label={inactivas.length} color="error" size="small" sx={{ ml: 1 }} />
          )}
        </Typography>
      </Stack>
      {inactivas.length === 0 ? (
        <Alert severity="success">No hay clientes inactivos en el período seleccionado.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Empresa</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Días sin actividad</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Riesgo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inactivas.map((emp, idx) => (
                <TableRow key={idx}>
                  <TableCell>{emp.nombre || emp.empresaId}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<AccessTimeIcon />}
                      label={`${emp.diasInactivo} días`}
                      size="small"
                      color={emp.diasInactivo > 21 ? 'error' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {emp.diasInactivo > 30 ? (
                      <Chip label="CRÍTICO" color="error" size="small" />
                    ) : emp.diasInactivo > 21 ? (
                      <Chip label="ALTO" color="warning" size="small" />
                    ) : (
                      <Chip label="MODERADO" color="default" size="small" />
                    )}
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
const AnalyticsRetencion = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cohortes, setCohortes] = useState([]);
  const [inactivas, setInactivas] = useState([]);
  const [meses, setMeses] = useState(6);
  const [diasInactividad, setDiasInactividad] = useState(14);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cohortesData, inactivasData] = await Promise.all([
        leadershipService.getCohortes(meses),
        leadershipService.getInactivas(diasInactividad)
      ]);
      setCohortes(cohortesData.cohortes || []);
      setInactivas(inactivasData.inactivas || []);
    } catch (err) {
      console.error('Error cargando retención:', err);
      setError('No se pudieron cargar los datos de retención.');
    } finally {
      setLoading(false);
    }
  }, [meses, diasInactividad]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Métricas calculadas
  const metricas = useMemo(() => {
    if (cohortes.length === 0) return { churnPromedio: 0, retencionMes1: 0, totalClientes: 0 };
    const totalClientes = cohortes.reduce((s, c) => s + (c.clientesIngresados || 0), 0);
    // Retención promedio del mes 1 (promedio ponderado)
    let sumProd = 0, sumClientes = 0;
    cohortes.forEach(c => {
      if (c.retencion?.mes1 != null) {
        sumProd += c.retencion.mes1 * c.clientesIngresados;
        sumClientes += c.clientesIngresados;
      }
    });
    const retencionMes1 = sumClientes > 0 ? Math.round(sumProd / sumClientes) : 0;
    const churnPromedio = 100 - retencionMes1;
    return { churnPromedio, retencionMes1, totalClientes };
  }, [cohortes]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      <Head><title>Retención | Leadership</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h4">Retención de Clientes</Typography>
              <Typography variant="body2" color="textSecondary">
                Análisis de cohortes y detección de clientes en riesgo
              </Typography>
            </Box>
            <Stack direction="row" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Meses atrás</InputLabel>
                <Select value={meses} label="Meses atrás" onChange={(e) => setMeses(e.target.value)}>
                  {[3, 6, 9, 12].map(v => <MenuItem key={v} value={v}>{v} meses</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Días inactividad</InputLabel>
                <Select value={diasInactividad} label="Días inactividad" onChange={(e) => setDiasInactividad(e.target.value)}>
                  {[7, 14, 21, 30].map(v => <MenuItem key={v} value={v}>{v} días</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarDatos}>
                Actualizar
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          )}

          {/* KPIs */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Retención Mes 1 (prom)"
                value={`${metricas.retencionMes1}%`}
                subtitle="Promedio ponderado de cohortes"
                icon={<PeopleIcon color="primary" />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Churn Mensual (prom)"
                value={`${metricas.churnPromedio}%`}
                subtitle="100% - retención mes 1"
                icon={<TrendingDownIcon color="error" />}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Clientes en Riesgo"
                value={inactivas.length}
                subtitle={`Sin actividad hace ${diasInactividad}+ días`}
                icon={<WarningIcon color="warning" />}
                color="warning"
              />
            </Grid>
          </Grid>

          {/* Tabla de cohortes */}
          <Box mb={3}>
            <CohortTable cohortes={cohortes} />
          </Box>

          {/* Inactivas */}
          <InactivasTable inactivas={inactivas} />
        </Container>
      </Box>
    </>
  );
};

AnalyticsRetencion.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsRetencion;
