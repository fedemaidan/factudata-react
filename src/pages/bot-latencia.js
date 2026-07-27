import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Drawer,
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
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { Chart } from 'src/components/chart';
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

const formatFecha = (fecha) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

const formatHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Identidad legible de una fila de métrica para títulos del drawer
const etiquetaMetrica = (m) => {
  if (!m) return '';
  if (m.tipo === 'accion') return m.accion || '—';
  return [m.flujo, m.step].filter(Boolean).join(' · ') || '—';
};

const REGISTROS_POR_PAGINA = 25;

/**
 * Drill-down de una métrica: nivel 1 = desglose día por día (serie + gráfico),
 * nivel 2 = mediciones individuales de un día, con salto a la conversación.
 */
const DetalleMetricaDrawer = ({ metrica, percentilesDisponibles, onClose, onError }) => {
  const router = useRouter();
  const theme = useTheme();
  const [serieData, setSerieData] = useState(null);
  const [loadingSerie, setLoadingSerie] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [registrosData, setRegistrosData] = useState(null);
  const [pagina, setPagina] = useState(0);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [resolviendoMensaje, setResolviendoMensaje] = useState(null);

  useEffect(() => {
    if (!metrica) return undefined;
    setSerieData(null);
    setFechaSeleccionada(null);
    setRegistrosData(null);
    setPagina(0);
    let cancelado = false;
    setLoadingSerie(true);
    LatenciaBotService.getSerie({
      tipo: metrica.tipo,
      flujo: metrica.flujo,
      accion: metrica.accion,
      step: metrica.step
    })
      .then((d) => !cancelado && setSerieData(d))
      .catch(() => !cancelado && onError('No se pudo cargar el desglose diario'))
      .finally(() => !cancelado && setLoadingSerie(false));
    return () => {
      cancelado = true;
    };
  }, [metrica, onError]);

  useEffect(() => {
    if (!metrica || !fechaSeleccionada) return undefined;
    let cancelado = false;
    setLoadingRegistros(true);
    LatenciaBotService.getRegistros({
      fecha: fechaSeleccionada,
      tipo: metrica.tipo,
      flujo: metrica.flujo,
      accion: metrica.accion,
      step: metrica.step,
      page: pagina,
      limit: REGISTROS_POR_PAGINA
    })
      .then((d) => !cancelado && setRegistrosData(d))
      .catch(() => !cancelado && onError('No se pudieron cargar los registros del día'))
      .finally(() => !cancelado && setLoadingRegistros(false));
    return () => {
      cancelado = true;
    };
  }, [metrica, fechaSeleccionada, pagina, onError]);

  const serie = serieData?.serie || [];

  // Días fuera de la retención de crudos: hay agregado pero no detalle
  const fechaLimiteDetalle = useMemo(() => {
    const dias = serieData?.retencion_registros_dias || 60;
    return new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }, [serieData]);

  const chartOptions = useMemo(
    () => ({
      chart: { toolbar: { show: false }, zoom: { enabled: false }, background: 'transparent' },
      theme: { mode: theme.palette.mode },
      stroke: { curve: 'smooth', width: 2 },
      colors: [theme.palette.primary.main, theme.palette.warning.main],
      dataLabels: { enabled: false },
      xaxis: {
        categories: serie.map((s) => s.fecha.slice(5)),
        labels: { rotate: 0, style: { fontSize: '11px' } },
        tooltip: { enabled: false }
      },
      yaxis: { labels: { formatter: (v) => formatMs(v) } },
      tooltip: { y: { formatter: (v) => formatMs(v) } },
      grid: { borderColor: theme.palette.divider, strokeDashArray: 3 },
      legend: { show: true, position: 'top', horizontalAlign: 'right' }
    }),
    [serie, theme]
  );

  const chartSeries = useMemo(() => {
    const series = [{ name: 'Promedio', data: serie.map((s) => s.promedio_ms) }];
    if (percentilesDisponibles) series.push({ name: 'p95', data: serie.map((s) => s.p95_ms) });
    return series;
  }, [serie, percentilesDisponibles]);

  const verConversacion = async (registro) => {
    setResolviendoMensaje(registro._id);
    try {
      const { conversationId, messageId } = await LatenciaBotService.getConversacionDeMensaje(
        registro.mensaje_id
      );
      router.push({ pathname: '/conversaciones', query: { conversationId, messageId } });
    } catch (error) {
      onError('No se encontró el mensaje en las conversaciones');
      setResolviendoMensaje(null);
    }
  };

  const enNivelRegistros = Boolean(fechaSeleccionada);

  return (
    <Drawer
      anchor="right"
      open={Boolean(metrica)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 640, md: 760 } } }}
    >
      {metrica && (
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            {enNivelRegistros && (
              <IconButton size="small" onClick={() => { setFechaSeleccionada(null); setRegistrosData(null); setPagina(0); }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <Chip
              size="small"
              label={metrica.tipo === 'accion' ? 'Acción' : 'Step'}
              color={metrica.tipo === 'accion' ? 'primary' : 'default'}
              variant={metrica.tipo === 'accion' ? 'filled' : 'outlined'}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                {etiquetaMetrica(metrica)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {enNivelRegistros
                  ? `Mediciones del ${formatFecha(fechaSeleccionada)}`
                  : 'Evolución día por día · click en un día para ver cada medición'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {!enNivelRegistros && (
              <>
                {loadingSerie && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}
                {!loadingSerie && serie.length === 0 && serieData && (
                  <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
                    Sin datos diarios para esta métrica
                  </Typography>
                )}
                {!loadingSerie && serie.length > 0 && (
                  <>
                    <Box sx={{ px: 2, pt: 1 }}>
                      <Chart options={chartOptions} series={chartSeries} type="area" height={200} width="100%" />
                    </Box>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Día</TableCell>
                          <TableCell align="right">N</TableCell>
                          <TableCell align="right">Promedio</TableCell>
                          {percentilesDisponibles && <TableCell align="right">p50</TableCell>}
                          {percentilesDisponibles && <TableCell align="right">p95</TableCell>}
                          <TableCell align="right">Máx</TableCell>
                          <TableCell align="right">% Éxito</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...serie].reverse().map((dia) => {
                          const sinDetalle = dia.fecha < fechaLimiteDetalle;
                          return (
                            <Tooltip
                              key={dia.fecha}
                              title={sinDetalle ? 'Fuera de retención: solo queda el agregado del día' : ''}
                            >
                              <TableRow
                                hover={!sinDetalle}
                                onClick={() => !sinDetalle && setFechaSeleccionada(dia.fecha)}
                                sx={{ cursor: sinDetalle ? 'default' : 'pointer', opacity: sinDetalle ? 0.5 : 1 }}
                              >
                                <TableCell>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <span>{formatFecha(dia.fecha)}</span>
                                    {dia.parcial && <Chip size="small" label="hoy" color="info" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatNumber(dia.n)}
                                </TableCell>
                                <CeldaMs ms={dia.promedio_ms} semaforo />
                                {percentilesDisponibles && <CeldaMs ms={dia.p50_ms} />}
                                {percentilesDisponibles && <CeldaMs ms={dia.p95_ms} semaforo />}
                                <CeldaMs ms={dia.max_ms} />
                                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {dia.exito_pct != null ? `${dia.exito_pct}%` : '—'}
                                </TableCell>
                              </TableRow>
                            </Tooltip>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </>
                )}
              </>
            )}

            {enNivelRegistros && (
              <>
                {loadingRegistros && !registrosData && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}
                {registrosData && (
                  <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 82 }}>Hora</TableCell>
                        <TableCell align="right" sx={{ width: 96 }}>Duración</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell sx={{ width: '22%' }}>Empresa</TableCell>
                        <TableCell align="center" sx={{ width: 56 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {registrosData.registros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                            <Typography color="text.secondary">Sin mediciones ese día</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrosData.registros.map((r) => (
                          <TableRow key={r._id} hover sx={{ opacity: loadingRegistros ? 0.5 : 1 }}>
                            <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                              {formatHora(r.creado_en)}
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                {!r.exito && (
                                  <Tooltip title={r.error || 'Falló'}>
                                    <CancelIcon sx={{ fontSize: 16 }} color="error" />
                                  </Tooltip>
                                )}
                                <Box
                                  component="span"
                                  sx={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: nivelLatencia(r.duracion_ms) === 'error' ? 600 : 400,
                                    color: `${nivelLatencia(r.duracion_ms)}.main`,
                                    backgroundColor: (theme) =>
                                      alpha(theme.palette[nivelLatencia(r.duracion_ms)].main, 0.08),
                                    borderRadius: 1,
                                    px: 0.75,
                                    py: 0.25
                                  }}
                                >
                                  {formatMs(r.duracion_ms)}
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ overflow: 'hidden' }}>
                              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }} noWrap>
                                {r.telefono || '—'}
                              </Typography>
                              {r.email && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  {r.email}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ overflow: 'hidden' }}>
                              <Tooltip title={r.empresa_nombre || r.empresa_id || ''}>
                                <Typography variant="body2" noWrap>
                                  {r.empresa_nombre || (r.empresa_id ? `${r.empresa_id.slice(0, 8)}…` : '—')}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center" sx={{ px: 0.5 }}>
                              {r.mensaje_id ? (
                                <Tooltip title="Ver el mensaje en Conversaciones">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      disabled={resolviendoMensaje === r._id}
                                      onClick={() => verConversacion(r)}
                                    >
                                      {resolviendoMensaje === r._id ? (
                                        <CircularProgress size={18} />
                                      ) : (
                                        <WhatsAppIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="text.disabled">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </Box>

          {enNivelRegistros && registrosData && (
            <TablePagination
              component="div"
              count={registrosData.total}
              page={pagina}
              onPageChange={(e, p) => setPagina(p)}
              rowsPerPage={REGISTROS_POR_PAGINA}
              rowsPerPageOptions={[REGISTROS_POR_PAGINA]}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              sx={{ borderTop: 1, borderColor: 'divider' }}
            />
          )}
        </Stack>
      )}
    </Drawer>
  );
};

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
  const [data, setData] = useState(null);
  const [alerta, setAlerta] = useState({ open: false, message: '', severity: 'info' });

  const [ventana, setVentana] = useState('24h');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroFlujo, setFiltroFlujo] = useState(null);
  const [filtroAccion, setFiltroAccion] = useState(null);
  const [busquedaStep, setBusquedaStep] = useState('');
  const [orden, setOrden] = useState({ campo: 'promedio_ms', dir: 'desc' });
  const [metricaSeleccionada, setMetricaSeleccionada] = useState(null);

  const mostrarError = useCallback(
    (message) => setAlerta({ open: true, message, severity: 'error' }),
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await LatenciaBotService.getStats();
      setData(result);
    } catch (error) {
      setAlerta({ open: true, message: 'No se pudieron cargar las métricas de latencia', severity: 'error' });
    } finally {
      setLoading(false);
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
              {data?.calculado_en && (
                <Tooltip title={new Date(data.calculado_en).toLocaleString('es-AR')}>
                  <Chip size="small" variant="outlined" label={`Actualizado ${haceCuanto(data.calculado_en)}`} />
                </Tooltip>
              )}
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  Click en una fila para ver la evolución diaria y cada medición individual
                </Typography>
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
                          onClick={() => setMetricaSeleccionada(f)}
                          sx={{ cursor: 'pointer' }}
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

      <DetalleMetricaDrawer
        metrica={metricaSeleccionada}
        percentilesDisponibles={Boolean(data?.percentiles_disponibles)}
        onClose={() => setMetricaSeleccionada(null)}
        onError={mostrarError}
      />

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
