import { Fragment, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  LinearProgress,
  Paper,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { usePlanesCobroList } from 'src/hooks/usePlanCobro';
import PlanCobroCard from 'src/components/planCobro/PlanCobroCard';
import CobroCuotaDialog from 'src/components/planCobro/CobroCuotaDialog';
import planCobroService from 'src/services/planCobroService';
import DesgloseCuotas from 'src/components/planCobro/DesgloseCuotas';
import { mensajeCobroRegistrado } from 'src/utils/planCobro/cobroCuota';
import { filasDeCelda, filasDeGestion, filasRealizadoAnterior, totalPorTrack, claveDeFila } from 'src/utils/planCobro/cashflowDetalle';

// Clave de "celda expandida" para el bloque de realizado anterior, que no es un período.
const REALIZADO_ANTERIOR = 'realizado-anterior';

const SORT_OPTIONS = [
  { value: 'reciente', label: 'Más recientes' },
  { value: 'proxima_cuota', label: 'Próxima cuota' },
  { value: 'monto', label: 'Mayor monto' },
];

const sortPlanes = (planes, sortBy) => {
  const sorted = [...planes];
  switch (sortBy) {
    case 'proxima_cuota':
      return sorted.sort((a, b) => {
        const fa = a.resumen?.proxima_cuota?.fecha_vencimiento || '9999';
        const fb = b.resumen?.proxima_cuota?.fecha_vencimiento || '9999';
        return fa.localeCompare(fb);
      });
    case 'monto':
      return sorted.sort((a, b) => (b.resumen?.total || 0) - (a.resumen?.total || 0));
    case 'reciente':
    default:
      return sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }
};

// ── Cash Flow: tracks ARS/USD (los buckets llegan como { ARS, USD }) ──
// pickTrack tolera el shape viejo (número plano) y el nuevo ({ ARS, USD }).
const pickTrack = (x, track) => (x && typeof x === 'object') ? (Number(x[track]) || 0) : (Number(x) || 0);
const sumTrack = (arr, track) => (arr || []).reduce((a, b) => a + pickTrack(b, track), 0);
const hasTrack = (arr, track) => (arr || []).some((x) => pickTrack(x, track) !== 0);
const fmtMoney = (n, track = 'ARS') => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: track === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });

// ── Labels de período legibles (TAR-576): '2026-08' → 'ago 26'; '2026-W33' → 'Sem 33 · 3–9 ago' ──
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const rangoSemanaISO = (year, week) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday, sunday];
};
// 'YYYY-MM-DD' → '3 ago 26'. Sin `new Date()`: el string ya viene normalizado del
// backend y parsearlo como UTC retrocedería un día en AR.
const fechaCorta = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} ${y.slice(2)}`; };

const estadoChip = (e) => (e === 'vencida' ? <Chip size="small" label="Vencida" color="error" />
  : e === 'cobrada' ? <Chip size="small" label="Cobrada" color="success" />
    : e === 'cobrada_parcial' ? <Chip size="small" label="Parcial" color="warning" />
      : <Chip size="small" label="Pendiente" variant="outlined" />);

const etiquetaPeriodo = (key) => {
  const mes = String(key || '').match(/^(\d{4})-(\d{2})$/);
  if (mes) return `${MESES_CORTOS[Number(mes[2]) - 1]} ${mes[1].slice(2)}`;
  const sem = String(key || '').match(/^(\d{4})-W(\d{2})$/);
  if (sem) {
    const [ini, fin] = rangoSemanaISO(Number(sem[1]), Number(sem[2]));
    const dIni = ini.getUTCDate(), dFin = fin.getUTCDate();
    const mIni = MESES_CORTOS[ini.getUTCMonth()], mFin = MESES_CORTOS[fin.getUTCMonth()];
    const rango = mIni === mFin ? `${dIni}–${dFin} ${mFin}` : `${dIni} ${mIni}–${dFin} ${mFin}`;
    return `Sem ${sem[2]} · ${rango}`;
  }
  return String(key || '');
};

const CobrosList = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroProyecto, setFiltroProyecto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sortBy, setSortBy] = useState('reciente');
  const [vista, setVista] = useState('tabla'); // 'cards' | 'tabla'
  const [seccion, setSeccion] = useState('planes'); // 'planes' | 'cashflow' | 'gestion'
  const [cashflow, setCashflow] = useState({ meses: [], esperado: [], cobrado: [], acumulado: [], kpis: {}, vencido: { ARS: 0, USD: 0, cuotas: 0 }, realizado_anterior: { ARS: 0, USD: 0 } });
  const [cfGranularidad, setCfGranularidad] = useState('adaptativo'); // 'mes' | 'semana' | 'adaptativo'
  // Abre en tabla: el desglose por período vive en la tabla, así que es la vista
  // desde la que se puede accionar sin tener que cambiar de modo primero.
  const [cfVista, setCfVista] = useState('tabla'); // 'grafico' | 'tabla'
  const [cfHistorico, setCfHistorico] = useState(false);
  const [cfTrack, setCfTrack] = useState('ARS'); // 'ARS' | 'USD' — track visible (sólo se ofrece si hay USD)
  const [cfCelda, setCfCelda] = useState(null); // período expandido: su `bucket_key` (uno a la vez)
  const [detalle, setDetalle] = useState([]); // lista accionable por cuota (Cash Flow + Gestión)
  const [cobroSel, setCobroSel] = useState(null); // { fila, plan, cuota } con el plan ya cargado
  const [recargas, setRecargas] = useState(0); // bump tras cobrar: recarga agregado y desglose
  const [gestionMes, setGestionMes] = useState(() => new Date().toISOString().slice(0, 7)); // filtro por mes (default: mes actual)
  const [gestionPorObra, setGestionPorObra] = useState(true); // toggle "por obra ↔ todo junto" (default: por obra)
  const [gestionColapsadas, setGestionColapsadas] = useState(() => new Set()); // obras colapsadas (accordion)
  const [gestionPage, setGestionPage] = useState(0);
  const [gestionRpp, setGestionRpp] = useState(25);
  const [proyectos, setProyectos] = useState([]);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [confirmEliminar, setConfirmEliminar] = useState(null); // plan object or null

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((empresa) => {
      if (empresa?.id) setEmpresaId(empresa.id);
    });
    getProyectosFromUser(user).then((list) => setProyectos(list || []));
  }, [user]);

  useEffect(() => {
    if (!empresaId) return;
    planCobroService.getCashflow(empresaId, filtroProyecto || null, cfGranularidad, { incluirHistorico: cfHistorico })
      .then((res) => setCashflow(res?.data?.data || {}))
      .catch(() => setCashflow({ meses: [], esperado: [], cobrado: [] }));
  }, [empresaId, filtroProyecto, cfGranularidad, cfHistorico, recargas]);

  // Lista accionable por cuota. La consumen el desglose del Cash Flow (que filtra
  // por `bucket_key`) y la vista de Gestión. En Cash Flow se pide con la MISMA
  // granularidad y ventana que el gráfico: si no, los buckets no se corresponden.
  useEffect(() => {
    if (!empresaId || (seccion !== 'gestion' && seccion !== 'cashflow')) return;
    const enCashflow = seccion === 'cashflow';
    planCobroService.getCashflow(
      empresaId,
      filtroProyecto || null,
      enCashflow ? cfGranularidad : 'mes',
      { detalle: true, ...(enCashflow ? { incluirHistorico: cfHistorico } : {}) },
    )
      .then((res) => setDetalle(res?.data?.data?.detalle || []))
      .catch(() => setDetalle([]));
  }, [empresaId, filtroProyecto, seccion, cfGranularidad, cfHistorico, recargas]);

  // Una celda expandida deja de tener sentido si cambian los buckets debajo.
  useEffect(() => { setCfCelda(null); }, [cfGranularidad, cfHistorico, filtroProyecto, cfTrack]);

  // Reset de paginación al cambiar filtro/modo/datos de la vista de gestión.
  useEffect(() => { setGestionPage(0); }, [gestionMes, gestionPorObra, detalle]);

  const filterParams = filtroEstado ? { estado: filtroEstado } : {};
  const { planes, loading, error, refresh } = usePlanesCobroList(empresaId, filterParams);

  const handleEliminar = async () => {
    if (!confirmEliminar) return;
    const planId = confirmEliminar._id;
    setConfirmEliminar(null);
    try {
      const res = await planCobroService.eliminarPlan(planId, empresaId);
      const d = res?.data;
      if (!d?.ok) throw new Error(d?.error || 'Error al eliminar');
      setAlert({ open: true, message: 'Plan eliminado correctamente', severity: 'success' });
      refresh();
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al eliminar el plan', severity: 'error' });
    }
  };

  useEffect(() => {
    if (error) setAlert({ open: true, message: 'Error al cargar planes de cobro', severity: 'error' });
  }, [error]);

  // ── Cobrar una cuota sin salir de esta pantalla ──
  // Las filas del detalle no traen el plan completo, y el diálogo lo necesita para
  // resolver el monto al índice del día. Se carga igual que en cobranzas de obra.
  const abrirCobro = async (fila) => {
    try {
      const res = await planCobroService.getPlan(fila.plan_id, empresaId);
      const plan = res?.data?.data;
      const cuota = (plan?.cuotas || []).find((c) => String(c._id) === String(fila.cuota_id));
      if (!cuota) throw new Error('La cuota ya no existe en el plan');
      setCobroSel({ fila, plan, cuota });
    } catch (err) {
      setAlert({ open: true, message: err.message || 'No se pudo cargar el plan de la cuota', severity: 'error' });
    }
  };

  // Sin actualización optimista: en planes indexados el monto que se registra lo
  // resuelve el backend con el índice del día del cobro, y un optimista mostraría
  // un número distinto al persistido. Se recargan agregado y desglose.
  const confirmarCobro = async (payload) => {
    const { fila } = cobroSel;
    setCobroSel(null);
    try {
      const res = await planCobroService.marcarCuotaCobrada(fila.plan_id, fila.cuota_id, { empresa_id: empresaId, ...payload });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'No se pudo registrar el cobro');
      setAlert({ open: true, message: mensajeCobroRegistrado(payload), severity: 'success' });
      setRecargas((n) => n + 1);
      refresh();
    } catch (err) {
      setAlert({ open: true, message: err?.response?.data?.error || err.message || 'No se pudo registrar el cobro', severity: 'error' });
    }
  };

  const planesFiltrados = useMemo(() => {
    let result = planes;
    if (filtroProyecto) {
      result = result.filter((p) => p.proyecto_id === filtroProyecto);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      // `String(...)`: el código de un plan puede venir numérico y sin esto la
      // búsqueda revienta apenas se escribe la primera letra.
      const contiene = (v) => String(v ?? '').toLowerCase().includes(q);
      result = result.filter((p) => contiene(p.nombre) || contiene(p.codigo));
    }
    return sortPlanes(result, sortBy);
  }, [planes, filtroProyecto, busqueda, sortBy]);

  return (
    <>
      <Head>
        <title>Planes de Cobro | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Planes de Cobro
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/cobros/nuevo')}
            >
              Nuevo plan
            </Button>
          </Stack>

          {/* KPIs de situación — siempre visibles. ARS y USD como líneas de igual peso (tracks distintos, no se suman). */}
          {(() => {
            const k = cashflow.kpis || {};
            const venc = cashflow.vencido || { ARS: 0, USD: 0, cuotas: 0 };
            const vencARS = pickTrack(venc, 'ARS');
            // ¿Hay algún monto en dólares (planes USD)? Sólo entonces mostramos la línea USD.
            const hayUSD = pickTrack(venc, 'USD') !== 0
              || ['periodo_actual', 'vencido', 'proximos_90'].some((c) => pickTrack(k[c], 'USD') !== 0);
            const usdLine = (obj) => (hayUSD && pickTrack(obj, 'USD') ? fmtMoney(pickTrack(obj, 'USD'), 'USD') : null);
            const items = [
              { label: 'Vencido', value: fmtMoney(vencARS), valueUsd: usdLine(venc), border: '#D32F2F', danger: true, sub: venc.cuotas ? `${venc.cuotas} cuota${venc.cuotas > 1 ? 's' : ''}` : 'al día' },
              { label: 'A cobrar este mes', value: fmtMoney(pickTrack(k.periodo_actual, 'ARS')), valueUsd: usdLine(k.periodo_actual), border: '#1976D2' },
              { label: 'Próximos 90 días', value: fmtMoney(pickTrack(k.proximos_90, 'ARS')), valueUsd: usdLine(k.proximos_90), border: '#2E7D32' },
            ];
            return (
              <Grid container spacing={2} mb={3}>
                {items.map((m) => {
                  const color = m.danger && vencARS > 0 ? 'error.main' : 'text.primary';
                  return (
                  <Grid item xs={12} sm={4} key={m.label}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderTop: `3px solid ${m.border}`, bgcolor: m.danger && vencARS > 0 ? '#FFF5F5' : 'background.paper' }}>
                      <Typography variant="overline" color="text.secondary" display="block">{m.label}</Typography>
                      <Typography variant="h6" fontWeight={700} color={color} lineHeight={1.25}>{m.value}</Typography>
                      {m.valueUsd && <Typography variant="h6" fontWeight={700} color={color} lineHeight={1.25}>{m.valueUsd}</Typography>}
                      {m.sub && <Typography variant="caption" color="text.secondary">{m.sub}</Typography>}
                    </Paper>
                  </Grid>
                  );
                })}
              </Grid>
            );
          })()}

          <ToggleButtonGroup
            value={seccion}
            exclusive
            size="small"
            onChange={(_, v) => v && setSeccion(v)}
            sx={{ mb: 3 }}
          >
            <ToggleButton value="planes">Planes</ToggleButton>
            <ToggleButton value="cashflow">Cashflow</ToggleButton>
            <ToggleButton value="gestion">Gestión</ToggleButton>
          </ToggleButtonGroup>

          {seccion === 'cashflow' && (() => {
            // Track ARS por defecto; el toggle USD sólo aparece si hay planes en dólares.
            const usdPresent = hasTrack(cashflow.esperado, 'USD') || hasTrack(cashflow.cobrado, 'USD') || pickTrack(cashflow.vencido, 'USD') !== 0;
            const track = (usdPresent && cfTrack === 'USD') ? 'USD' : 'ARS';
            const money = (n) => fmtMoney(n, track);
            const labels = (cashflow.meses || []).map(etiquetaPeriodo);
            const esperado = (cashflow.esperado || []).map((x) => pickTrack(x, track));
            const cobrado = (cashflow.cobrado || []).map((x) => pickTrack(x, track));
            const acumulado = (cashflow.acumulado || []).map((x) => pickTrack(x, track));
            const realizadoAnterior = pickTrack(cashflow.realizado_anterior, track);
            const periodoLabel = cfGranularidad === 'semana' ? 'semana' : cfGranularidad === 'adaptativo' ? 'período' : 'mes';

            // ── Desglose del período ──
            // Un solo desglose por fila, con lo esperado y lo cobrado uno debajo del
            // otro. El backend etiquetó cada cuota con el mismo bucket que usó para el
            // agregado, así que acá sólo se filtra: la suma cierra por construcción.
            const toggleFila = (bucket) => setCfCelda((k) => (k === bucket ? null : bucket));

            const filaDesglose = (bucket) => {
              const esperadas = filasDeCelda(detalle, { bucketKey: bucket, track, tipo: 'esperado' });
              const cobradas = filasDeCelda(detalle, { bucketKey: bucket, track, tipo: 'cobrado' });
              return (
                <TableRow>
                  <TableCell colSpan={5} sx={{ p: 0, bgcolor: 'action.hover', borderBottom: '2px solid', borderColor: 'divider' }}>
                    {esperadas.length > 0 && (
                      <DesgloseCuotas
                        filas={esperadas}
                        tipo="esperado"
                        track={track}
                        titulo={`Cuotas a cobrar en ${etiquetaPeriodo(bucket)}`}
                        onCobrar={abrirCobro}
                      />
                    )}
                    {/* Lo ya cobrado va sin `onCobrar`: no queda nada que cobrar ahí. */}
                    {cobradas.length > 0 && (
                      <Box sx={esperadas.length > 0 ? { borderTop: '1px dashed', borderColor: 'divider' } : undefined}>
                        <DesgloseCuotas
                          filas={cobradas}
                          tipo="cobrado"
                          track={track}
                          titulo={`Cobros registrados en ${etiquetaPeriodo(bucket)}`}
                        />
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            };
            return (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center" useFlexGap>
                <ToggleButtonGroup value={cfGranularidad} exclusive size="small" onChange={(_, v) => v && setCfGranularidad(v)}>
                  <ToggleButton value="adaptativo">Auto</ToggleButton>
                  <ToggleButton value="mes">Mes</ToggleButton>
                  <ToggleButton value="semana">Semana</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup value={cfVista} exclusive size="small" onChange={(_, v) => v && setCfVista(v)}>
                  <ToggleButton value="grafico">Gráfico</ToggleButton>
                  <ToggleButton value="tabla">Tabla</ToggleButton>
                </ToggleButtonGroup>
                {usdPresent && (
                  <ToggleButtonGroup value={track} exclusive size="small" onChange={(_, v) => v && setCfTrack(v)}>
                    <ToggleButton value="ARS">Pesos</ToggleButton>
                    <ToggleButton value="USD">Dólares</ToggleButton>
                  </ToggleButtonGroup>
                )}
                <ToggleButton
                  value="hist"
                  selected={cfHistorico}
                  size="small"
                  onChange={() => setCfHistorico((v) => !v)}
                >
                  {cfHistorico ? 'Ocultar histórico' : 'Ver histórico'}
                </ToggleButton>
                {cfGranularidad === 'adaptativo' && (
                  <Typography variant="caption" color="text.secondary">Próximas 8 semanas al detalle, luego por mes</Typography>
                )}
              </Stack>

              {(cashflow.meses || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin cobros proyectados en la ventana. Probá "Ver histórico".</Typography>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  {usdPresent && (
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Mostrando {track === 'USD' ? 'planes en dólares (US$)' : 'planes en pesos (indexados valuados a hoy)'}.
                    </Typography>
                  )}
                  {/* Los cobros previos a la ventana no tienen fila propia: el agregado
                      los colapsa acá. Se pueden abrir para entender de qué se trata. */}
                  {!cfHistorico && realizadoAnterior > 0 && (
                    <Box mb={1}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        onClick={() => setCfCelda((k) => (k === REALIZADO_ANTERIOR ? null : REALIZADO_ANTERIOR))}
                        sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      >
                        Realizado antes de la ventana: {money(realizadoAnterior)} (colapsado)
                        {cfCelda === REALIZADO_ANTERIOR ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </Typography>
                      {cfCelda === REALIZADO_ANTERIOR && (
                        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }}>
                          <DesgloseCuotas
                            filas={filasRealizadoAnterior(detalle, track)}
                            tipo="cobrado"
                            track={track}
                            titulo="Cobros anteriores a la ventana"
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                  {cfVista === 'grafico' ? (
                    <Box sx={{ overflowX: 'auto' }}>
                      <BarChart
                        height={280}
                        xAxis={[{ scaleType: 'band', data: labels }]}
                        series={[
                          { data: esperado, label: 'Esperado', color: '#90A4D4' },
                          { data: cobrado, label: 'Cobrado', color: '#2E7D32' },
                        ]}
                      />
                      {/* Curva de saldo acumulado (#4) */}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Saldo acumulado proyectado</Typography>
                      <LineChart
                        height={200}
                        xAxis={[{ scaleType: 'point', data: labels }]}
                        series={[{ data: acumulado, label: 'Acumulado', color: '#1976D2', area: true, showMark: false }]}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        Tocá un período para ver las cuotas que lo componen.
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{periodoLabel === 'semana' ? 'Semana' : periodoLabel === 'período' ? 'Período' : 'Mes'}</TableCell>
                            <TableCell align="right">Esperado</TableCell>
                            <TableCell align="right">Cobrado</TableCell>
                            <TableCell align="right">Total período</TableCell>
                            <TableCell align="right">Acumulado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {cashflow.meses.map((m, i) => {
                            const esp = esperado[i] || 0;
                            const cob = cobrado[i] || 0;
                            const abierta = cfCelda === m;
                            const tieneDesglose = !!esp || !!cob;
                            return (
                              <Fragment key={m}>
                                <TableRow
                                  hover={tieneDesglose}
                                  onClick={tieneDesglose ? () => toggleFila(m) : undefined}
                                  sx={{ cursor: tieneDesglose ? 'pointer' : 'default' }}
                                >
                                  <TableCell>
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      {tieneDesglose && (abierta
                                        ? <ExpandMoreIcon fontSize="small" color="action" />
                                        : <ChevronRightIcon fontSize="small" color="disabled" />)}
                                      <span>{etiquetaPeriodo(m)}</span>
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">{money(esp)}</TableCell>
                                  <TableCell align="right" sx={{ color: 'success.main' }}>{money(cob)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700 }}>{money(esp + cob)}</TableCell>
                                  <TableCell align="right" sx={{ color: 'primary.main' }}>{money(acumulado[i])}</TableCell>
                                </TableRow>
                                {abierta && filaDesglose(m)}
                              </Fragment>
                            );
                          })}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Total ventana</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{money(esperado.reduce((a, b) => a + b, 0))}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{money(cobrado.reduce((a, b) => a + b, 0))}</TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
            );
          })()}

          {seccion === 'gestion' && (() => {
            // A2: "a quién reclamar". Lista accionable por cuota, vencidos arriba,
            // filtrable por mes y agrupable por obra.
            // El mes actual siempre figura como opción (aunque no tenga cuotas), porque es el filtro por default.
            const mesActual = new Date().toISOString().slice(0, 7);
            // Sólo lo que hay que reclamar: las filas de cobrado del detalle son
            // historial y viven en el desglose del Cash Flow.
            const gestion = filasDeGestion(detalle);
            const mesesDisp = [...new Set([...gestion.map((r) => (r.fecha_vencimiento || '').slice(0, 7)).filter(Boolean), mesActual])].sort();
            const filtradas = gestion.filter((r) => gestionMes === 'todos' || (r.fecha_vencimiento || '').slice(0, 7) === gestionMes);
            // Vencidas primero, luego por vencimiento ascendente.
            const ordenadas = [...filtradas].sort((a, b) => {
              const va = a.estado === 'vencida' ? 0 : 1, vb = b.estado === 'vencida' ? 0 : 1;
              if (va !== vb) return va - vb;
              return (a.fecha_vencimiento || '9999').localeCompare(b.fecha_vencimiento || '9999');
            });
            const subtotal = (rows, track) => rows.reduce((a, r) => a + (r.track === track ? (r.monto || 0) : 0), 0);
            // Total del mes filtrado: sobre TODAS las cuotas del filtro, antes de
            // paginar, para que el número no dependa de dónde esté el paginador.
            const totalMes = totalPorTrack(filtradas);
            const grupos = gestionPorObra
              ? [...ordenadas.reduce((map, r) => { const k = r.proyecto_nombre || 'Sin obra'; if (!map.has(k)) map.set(k, []); map.get(k).push(r); return map; }, new Map())]
              : [['', ordenadas]];

            // Paginación: en "todo junto" pagina cuotas; en "por obra" pagina obras (mantiene los grupos enteros).
            const total = gestionPorObra ? grupos.length : ordenadas.length;
            const start = gestionPage * gestionRpp;
            const gruposPage = gestionPorObra
              ? grupos.slice(start, start + gestionRpp)
              : [['', ordenadas.slice(start, start + gestionRpp)]];

            // Accordion por obra: colapsar/expandir sus cuotas.
            const toggleObra = (obra) => setGestionColapsadas((prev) => { const n = new Set(prev); if (n.has(obra)) n.delete(obra); else n.add(obra); return n; });
            const todasObras = grupos.map(([o]) => o);
            const todasColapsadas = gestionPorObra && todasObras.length > 0 && todasObras.every((o) => gestionColapsadas.has(o));

            const filaCuota = (r) => (
              <TableRow key={claveDeFila(r)} sx={{ bgcolor: r.estado === 'vencida' ? '#FFF5F5' : 'inherit' }}>
                <TableCell>{r.cliente_nombre || '—'}</TableCell>
                {!gestionPorObra && <TableCell>{r.proyecto_nombre || '—'}</TableCell>}
                <TableCell>{r.plan_nombre ? `${r.plan_nombre} · ` : ''}Cuota {r.numero}</TableCell>
                <TableCell>{fechaCorta(r.fecha_vencimiento)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtMoney(r.monto, r.track)}</TableCell>
                <TableCell>{estadoChip(r.estado)}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="contained" onClick={() => abrirCobro(r)}>Cobrar</Button>
                </TableCell>
              </TableRow>
            );
            return (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center" useFlexGap>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Mes de vencimiento</InputLabel>
                  <Select value={gestionMes} label="Mes de vencimiento" onChange={(e) => setGestionMes(e.target.value)}>
                    <MenuItem value="todos">Todos</MenuItem>
                    {mesesDisp.map((m) => <MenuItem key={m} value={m}>{etiquetaPeriodo(m)}</MenuItem>)}
                  </Select>
                </FormControl>
                <ToggleButtonGroup value={gestionPorObra ? 'obra' : 'todo'} exclusive size="small" onChange={(_, v) => v && setGestionPorObra(v === 'obra')}>
                  <ToggleButton value="obra">Por obra</ToggleButton>
                  <ToggleButton value="todo">Todo junto</ToggleButton>
                </ToggleButtonGroup>
                {gestionPorObra && (
                  <Button size="small" onClick={() => setGestionColapsadas(todasColapsadas ? new Set() : new Set(todasObras))}>
                    {todasColapsadas ? 'Expandir todo' : 'Contraer todo'}
                  </Button>
                )}
                <Typography variant="caption" color="text.secondary">{ordenadas.length} cuota{ordenadas.length === 1 ? '' : 's'} a cobrar</Typography>
              </Stack>

              {ordenadas.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No hay cuotas pendientes para reclamar en este filtro.</Typography>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        {!gestionPorObra && <TableCell>Obra</TableCell>}
                        <TableCell>Cuota</TableCell>
                        <TableCell>Vence</TableCell>
                        <TableCell align="right">A cobrar (a hoy)</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gruposPage.map(([obra, rows]) => {
                        const subARS = subtotal(rows, 'ARS'), subUSD = subtotal(rows, 'USD');
                        const colapsada = gestionColapsadas.has(obra);
                        return (
                          <Fragment key={obra || 'todo'}>
                            {gestionPorObra && (
                              <TableRow hover onClick={() => toggleObra(obra)} sx={{ bgcolor: 'action.hover', cursor: 'pointer' }}>
                                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    {colapsada ? <ChevronRightIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                    <span>{obra}</span>
                                    <Typography component="span" variant="caption" color="text.secondary">({rows.length})</Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                  {subARS ? fmtMoney(subARS, 'ARS') : ''}{subARS && subUSD ? ' · ' : ''}{subUSD ? fmtMoney(subUSD, 'USD') : ''}
                                </TableCell>
                                <TableCell colSpan={2} />
                              </TableRow>
                            )}
                            {!colapsada && rows.map(filaCuota)}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </Box>

                  {/* Total del mes filtrado: fijo sobre el paginador, así que sigue
                      visible al cambiar de página o colapsar obras. Pesos y dólares
                      en líneas separadas: son tracks distintos, no se suman. */}
                  <Box sx={{
                    position: 'sticky', bottom: 0, zIndex: 2,
                    px: 2, py: 1.25, bgcolor: 'background.paper',
                    borderTop: '2px solid', borderColor: 'divider',
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography variant="overline" color="text.secondary" display="block" lineHeight={1.4}>
                          Total {gestionMes === 'todos' ? 'del filtro' : etiquetaPeriodo(gestionMes)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {totalMes.cuotas} cuota{totalMes.cuotas === 1 ? '' : 's'} a cobrar
                        </Typography>
                      </Box>
                      <Stack alignItems="flex-end">
                        <Typography variant="h6" fontWeight={700} lineHeight={1.3}>{fmtMoney(totalMes.ARS, 'ARS')}</Typography>
                        {totalMes.USD !== 0 && (
                          <Typography variant="h6" fontWeight={700} lineHeight={1.3}>{fmtMoney(totalMes.USD, 'USD')}</Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Box>

                  <TablePagination
                    component="div"
                    count={total}
                    page={gestionPage}
                    onPageChange={(_, p) => setGestionPage(p)}
                    rowsPerPage={gestionRpp}
                    onRowsPerPageChange={(e) => { setGestionRpp(parseInt(e.target.value, 10)); setGestionPage(0); }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage={gestionPorObra ? 'Obras por página' : 'Cuotas por página'}
                  />
                </Paper>
              )}
            </Box>
            );
          })()}

          {seccion === 'planes' && (
          <>
          <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Buscar plan..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filtroEstado}
                label="Estado"
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="completado">Completado</MenuItem>
              </Select>
            </FormControl>
            {proyectos.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filtroProyecto}
                  label="Proyecto"
                  onChange={(e) => setFiltroProyecto(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {proyectos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.nombre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Ordenar</InputLabel>
              <Select
                value={sortBy}
                label="Ordenar"
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <ToggleButtonGroup
              value={vista}
              exclusive
              size="small"
              onChange={(_, v) => v && setVista(v)}
            >
              <ToggleButton value="cards">Tarjetas</ToggleButton>
              <ToggleButton value="tabla">Tabla</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Skeleton loading */}
          {loading && (
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map((k) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={k}>
                  <Skeleton variant="rounded" height={180} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Empty state */}
          {!loading && planesFiltrados.length === 0 && (
            <Box textAlign="center" py={8}>
              <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" mb={1}>
                {planes.length === 0
                  ? 'No hay planes de cobro todavía'
                  : 'No se encontraron planes con esos filtros'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {planes.length === 0
                  ? 'Creá tu primer plan de cobro para empezar a hacer seguimiento de pagos.'
                  : 'Probá ajustando los filtros o la búsqueda.'}
              </Typography>
              {planes.length === 0 && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/cobros/nuevo')}
                >
                  Crear el primero
                </Button>
              )}
            </Box>
          )}

          {!loading && planesFiltrados.length > 0 && vista === 'cards' && (
            <Grid container spacing={2}>
              {planesFiltrados.map((plan) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={plan._id}>
                  <PlanCobroCard
                    plan={plan}
                    onClick={() => router.push(`/cobros/${plan._id}`)}
                    onDelete={(p) => setConfirmEliminar(p)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {!loading && planesFiltrados.length > 0 && vista === 'tabla' && (
            <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Plan</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Cobrado</TableCell>
                    <TableCell align="right">Pendiente</TableCell>
                    <TableCell align="center">Avance</TableCell>
                    <TableCell>Próxima</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {planesFiltrados.map((plan) => {
                    const r = plan.resumen || {};
                    const pct = r.total ? Math.round((r.cobrado || 0) / r.total * 100) : 0;
                    const money = (n) => (n || 0).toLocaleString('es-AR', { style: 'currency', currency: plan.moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });
                    return (
                      <TableRow
                        key={plan._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/cobros/${plan._id}`)}
                      >
                        <TableCell>{plan.nombre}</TableCell>
                        <TableCell>{plan.cliente_nombre || '—'}</TableCell>
                        <TableCell>{plan.proyecto_nombre || '—'}</TableCell>
                        <TableCell align="right">{money(r.total)}</TableCell>
                        <TableCell align="right">{money(r.cobrado)}</TableCell>
                        <TableCell align="right">{money(r.pendiente)}</TableCell>
                        <TableCell align="center" sx={{ minWidth: 90 }}>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                        </TableCell>
                        <TableCell>
                          {r.proxima_cuota?.fecha_vencimiento
                            ? new Date(r.proxima_cuota.fecha_vencimiento).toLocaleDateString('es-AR')
                            : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={plan.estado}
                            color={plan.estado === 'completado' ? 'success' : plan.estado === 'activo' ? 'primary' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          </>
          )}
        </Container>
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>

      {/* Mismo diálogo de cobro que el detalle del plan y cobranzas de control de
          obra: no hay flujo nuevo, sólo se monta en una pantalla más. */}
      <CobroCuotaDialog
        open={!!cobroSel}
        cuota={cobroSel?.cuota}
        plan={cobroSel?.plan}
        empresaId={empresaId}
        onClose={() => setCobroSel(null)}
        onConfirm={confirmarCobro}
      />

      {/* Diálogo confirmar eliminación */}
      <Dialog open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)}>
        <DialogTitle>Eliminar plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que querés eliminar el plan &ldquo;{confirmEliminar?.nombre}&rdquo;?
            Esta acción no se puede deshacer.
          </DialogContentText>
          {(confirmEliminar?.estado === 'activo' || confirmEliminar?.estado === 'completado') &&
            (confirmEliminar?.cuotas || []).some((c) => c.estado === 'cobrada' || c.estado === 'cobrada_parcial') && (
            <DialogContentText sx={{ mt: 1.5, color: 'error.main', fontWeight: 500 }}>
              Este plan tiene cuotas cobradas. Se eliminarán también los movimientos de caja asociados.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleEliminar}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

CobrosList.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default CobrosList;
