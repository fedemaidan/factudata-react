import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import LatenciaBotService from 'src/services/latenciaBotService';

const VENTANAS = [
  { value: '24h', label: 'Últimas 24 h' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' }
];

// Semáforo de latencia: verde < 1s, ámbar 1-3s, rojo > 3s
const nivelLatencia = (ms) => {
  if (ms == null) return null;
  if (ms < 1000) return 'success';
  if (ms < 3000) return 'warning';
  return 'error';
};

const formatMs = (ms) => {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} s`;
};

const formatNumber = (value) => (value == null ? '—' : value.toLocaleString('es-AR'));

const haceCuanto = (iso) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'recién calculado';
  if (min === 1) return 'hace 1 min';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h === 1 ? 'hace 1 h' : `hace ${h} h`;
};

// Celda numérica con dígitos tabulares (columnas alineadas) y semáforo opcional
const CeldaMs = ({ ms, semaforo = false }) => {
  const nivel = semaforo ? nivelLatencia(ms) : null;
  return (
    <TableCell align="right">
      <Box
        component="span"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: nivel === 'error' ? 600 : 400,
          color: nivel ? `${nivel}.main` : 'text.primary',
          ...(nivel && {
            backgroundColor: (theme) => alpha(theme.palette[nivel].main, 0.08),
            borderRadius: 1,
            px: 0.75,
            py: 0.25
          })
        }}
      >
        {formatMs(ms)}
      </Box>
    </TableCell>
  );
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography color="text.secondary" variant="overline">
            {title}
          </Typography>
          <Typography variant="h5" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" variant="body2" noWrap sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: (theme) => alpha(theme.palette[color].main, 0.12),
            borderRadius: 2,
            p: 1,
            display: 'flex'
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const COLUMNAS = [
  { id: 'tipo', label: 'Tipo', numeric: false },
  { id: 'accion', label: 'Acción', numeric: false },
  { id: 'flujo', label: 'Flujo', numeric: false },
  { id: 'step', label: 'Step', numeric: false },
  { id: 'n', label: 'N', numeric: true },
  { id: 'promedio_ms', label: 'Promedio', numeric: true },
  { id: 'p50_ms', label: 'p50', numeric: true, percentil: true },
  { id: 'p95_ms', label: 'p95', numeric: true, percentil: true },
  { id: 'max_ms', label: 'Máx', numeric: true },
  { id: 'exito_pct', label: '% Éxito', numeric: true }
];

const BotLatenciaPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [alerta, setAlerta] = useState({ open: false, message: '', severity: 'info' });

  const [ventana, setVentana] = useState('24h');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroFlujo, setFiltroFlujo] = useState(null);
  const [filtroAccion, setFiltroAccion] = useState(null);
  const [busquedaStep, setBusquedaStep] = useState('');
  const [orden, setOrden] = useState({ campo: 'promedio_ms', dir: 'desc' });

  const fetchData = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const result = await LatenciaBotService.getStats(refresh);
      setData(result);
      if (refresh) setAlerta({ open: true, message: 'Métricas recalculadas', severity: 'success' });
    } catch (error) {
      setAlerta({ open: true, message: 'No se pudieron cargar las métricas de latencia', severity: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filas = useMemo(() => data?.ventanas?.[ventana] || [], [data, ventana]);

  const opcionesFlujo = useMemo(
    () => [...new Set(filas.map((f) => f.flujo).filter(Boolean))].sort(),
    [filas]
  );
  const opcionesAccion = useMemo(
    () => [...new Set(filas.map((f) => f.accion).filter(Boolean))].sort(),
    [filas]
  );

  const filasFiltradas = useMemo(() => {
    const busqueda = busquedaStep.trim().toLowerCase();
    const filtradas = filas.filter((f) => {
      if (filtroTipo !== 'todos' && f.tipo !== filtroTipo) return false;
      if (filtroFlujo && f.flujo !== filtroFlujo) return false;
      if (filtroAccion && f.accion !== filtroAccion) return false;
      if (busqueda && !(f.step || '').toLowerCase().includes(busqueda)) return false;
      return true;
    });
    const { campo, dir } = orden;
    const mult = dir === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const va = a[campo];
      const vb = b[campo];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * mult;
      return (va - vb) * mult;
    });
  }, [filas, filtroTipo, filtroFlujo, filtroAccion, busquedaStep, orden]);

  const kpis = useMemo(() => {
    const total = filas.reduce((acc, f) => acc + f.n, 0);
    const acciones = filas.filter((f) => f.tipo === 'accion');
    const steps = filas.filter((f) => f.tipo === 'step');
    const metrica = data?.percentiles_disponibles ? 'p95_ms' : 'promedio_ms';
    const peor = (arr) =>
      arr.reduce((max, f) => (f[metrica] != null && (max == null || f[metrica] > max[metrica]) ? f : max), null);
    const peorAccion = peor(acciones);
    const peorStep = peor(steps);
    const exitos = filas.reduce((acc, f) => acc + (f.exito_pct != null ? (f.exito_pct / 100) * f.n : f.n), 0);
    return {
      total,
      peorAccion,
      peorStep,
      exitoGlobal: total ? Math.round((exitos / total) * 1000) / 10 : null,
      etiquetaMetrica: data?.percentiles_disponibles ? 'p95' : 'promedio'
    };
  }, [filas, data]);

  const cambiarOrden = (campo) => {
    setOrden((prev) => ({
      campo,
      dir: prev.campo === campo && prev.dir === 'desc' ? 'asc' : 'desc'
    }));
  };

  const columnas = useMemo(
    () => COLUMNAS.filter((c) => !c.percentil || data?.percentiles_disponibles),
    [data]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Latencia del Bot | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <SpeedIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h5">Latencia del Bot</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Cuánto tarda cada acción y cada step de los flujos de WhatsApp
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                {data?.calculado_en && (
                  <Tooltip title={new Date(data.calculado_en).toLocaleString('es-AR')}>
                    <Chip size="small" variant="outlined" label={`Actualizado ${haceCuanto(data.calculado_en)}`} />
                  </Tooltip>
                )}
                <Tooltip title="Recalcular ahora">
                  <span>
                    <IconButton onClick={() => fetchData(true)} disabled={refreshing}>
                      {refreshing ? <CircularProgress size={22} /> : <RefreshIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <ToggleButtonGroup
              value={ventana}
              exclusive
              size="small"
              onChange={(e, v) => v && setVentana(v)}
            >
              {VENTANAS.map((v) => (
                <ToggleButton key={v.value} value={v.value}>
                  {v.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title="Mediciones"
                  value={formatNumber(kpis.total)}
                  subtitle={`en ${VENTANAS.find((v) => v.value === ventana)?.label.toLowerCase()}`}
                  icon={BoltIcon}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title={`Acción más lenta (${kpis.etiquetaMetrica})`}
                  value={formatMs(kpis.peorAccion?.[data?.percentiles_disponibles ? 'p95_ms' : 'promedio_ms'])}
                  subtitle={kpis.peorAccion?.accion || 'Sin datos'}
                  icon={SpeedIcon}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title={`Step más lento (${kpis.etiquetaMetrica})`}
                  value={formatMs(kpis.peorStep?.[data?.percentiles_disponibles ? 'p95_ms' : 'promedio_ms'])}
                  subtitle={kpis.peorStep ? `${kpis.peorStep.flujo || ''} · ${kpis.peorStep.step || ''}` : 'Sin datos'}
                  icon={ReportProblemIcon}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KpiCard
                  title="Éxito global"
                  value={kpis.exitoGlobal != null ? `${kpis.exitoGlobal}%` : '—'}
                  subtitle="mediciones sin error"
                  icon={CheckCircleIcon}
                  color="success"
                />
              </Grid>
            </Grid>

            <Card>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={2.5}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Tipo"
                      value={filtroTipo}
                      onChange={(e) => setFiltroTipo(e.target.value)}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="accion">Acción</MenuItem>
                      <MenuItem value="step">Step</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      size="small"
                      options={opcionesAccion}
                      value={filtroAccion}
                      onChange={(e, v) => setFiltroAccion(v)}
                      renderInput={(params) => <TextField {...params} label="Acción" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      size="small"
                      options={opcionesFlujo}
                      value={filtroFlujo}
                      onChange={(e, v) => setFiltroFlujo(v)}
                      renderInput={(params) => <TextField {...params} label="Flujo" />}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Buscar step"
                      placeholder="ej: transcribir_audio"
                      value={busquedaStep}
                      onChange={(e) => setBusquedaStep(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>

              <TableContainer sx={{ maxHeight: 640 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {columnas.map((col) => (
                        <TableCell key={col.id} align={col.numeric ? 'right' : 'left'}>
                          <TableSortLabel
                            active={orden.campo === col.id}
                            direction={orden.campo === col.id ? orden.dir : 'desc'}
                            onClick={() => cambiarOrden(col.id)}
                          >
                            {col.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columnas.length} align="center" sx={{ py: 6 }}>
                          <Typography color="text.secondary">
                            {filas.length === 0
                              ? 'Todavía no hay mediciones en esta ventana'
                              : 'Ninguna fila coincide con los filtros'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filasFiltradas.map((f) => (
                        <TableRow
                          hover
                          key={`${f.tipo}|${f.flujo}|${f.accion}|${f.step}`}
                        >
                          <TableCell>
                            <Chip
                              size="small"
                              label={f.tipo === 'accion' ? 'Acción' : 'Step'}
                              color={f.tipo === 'accion' ? 'primary' : 'default'}
                              variant={f.tipo === 'accion' ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>{f.accion || '—'}</TableCell>
                          <TableCell>{f.flujo || '—'}</TableCell>
                          <TableCell>
                            {f.step ? (
                              <Box component="code" sx={{ fontSize: 13 }}>{f.step}</Box>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatNumber(f.n)}
                          </TableCell>
                          <CeldaMs ms={f.promedio_ms} semaforo />
                          {data?.percentiles_disponibles && <CeldaMs ms={f.p50_ms} />}
                          {data?.percentiles_disponibles && <CeldaMs ms={f.p95_ms} semaforo />}
                          <CeldaMs ms={f.max_ms} />
                          <TableCell align="right">
                            <Box
                              component="span"
                              sx={{
                                fontVariantNumeric: 'tabular-nums',
                                color: f.exito_pct != null && f.exito_pct < 95 ? 'error.main' : 'text.primary'
                              }}
                            >
                              {f.exito_pct != null ? `${f.exito_pct}%` : '—'}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Stack>
        </Container>
      </Box>

      <Snackbar
        open={alerta.open}
        autoHideDuration={4000}
        onClose={() => setAlerta((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={alerta.severity} onClose={() => setAlerta((prev) => ({ ...prev, open: false }))}>
          {alerta.message}
        </Alert>
      </Snackbar>
    </>
  );
};

BotLatenciaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default BotLatenciaPage;
