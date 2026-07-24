import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Snackbar,
  Alert,
  TextField,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import adminSuscripcionService from 'src/services/adminSuscripcionService';
import gastoRecurrenteService from 'src/services/gastoRecurrenteService';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';

// ── Resumen financiero del mes (Sorby Admin) ────────────────────────────────
// Vista "de un vistazo": ingresos (cobrado / esperado / por cobrar, y por tipo
// de suscripción) + gastos (egresos reales por categoría + recurrentes por pagar).
//
// Regla anti-doble-conteo (clave): un recurrente, al registrarse, CREA un
// MovimientoCaja egreso con gasto_recurrente_id. Por eso:
//   • "Egresos del mes" = movimientos de caja (ya incluye recurrentes aplicados).
//   • "Recurrentes por pagar" = filas de a-cargar todavía NO registradas (estado
//     pendiente/proximo/vencido). Nunca se solapan con los movimientos reales.
// Todo se calcula en el cliente cruzando endpoints existentes; sin backend nuevo.

const COLORS = {
  mensual: '#23B5D3',
  anual: '#1E4469',
  otras: '#7A8CA3',
  implementacion: '#2DC197',
  recurrente: '#0097B2',
  puntual: '#E0A93B',
};
const CAT_PALETTE = ['#1E4469', '#23B5D3', '#0097B2', '#2DC197', '#E0A93B', '#B4657A', '#7A8CA3', '#5B54A5'];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthRange = (periodo) => {
  const [y, m] = periodo.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { desde: `${periodo}-01`, hasta: `${periodo}-${String(last).padStart(2, '0')}` };
};
const fmt = (n) => (n == null ? '—' : Math.round(Number(n)).toLocaleString('es-AR'));
const money = (n, mon = 'ARS') => `${mon === 'USD' ? 'US$' : '$'} ${fmt(n)}`;

// Acumulador por moneda { ARS, USD }
const emptyCur = () => ({ ARS: 0, USD: 0 });
const addCur = (acc, moneda, val) => {
  const k = (moneda || 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS';
  acc[k] += Number(val) || 0;
};

// Aplana los items del dashboard de cajas a movimientos planos.
const flattenDashboard = (items = []) => items.flatMap((it) => {
  if (it?.tipo === 'grupo_prorrateo') return it.movimientos || [];
  return it?.data ? [it.data] : [];
});

// Card de métrica (mismo estilo que admin-reportes, con secundario USD opcional).
const Metric = ({ label, value, usd, color, hint }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {hint && (
        <Tooltip title={hint}>
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        </Tooltip>
      )}
    </Stack>
    <Typography variant="h5" sx={{ color: color || 'text.primary', lineHeight: 1.2 }}>{value}</Typography>
    {usd ? <Typography variant="caption" color="text.secondary">+ {money(usd, 'USD')}</Typography> : null}
  </Card>
);

// Barra de proporción horizontal a partir de segmentos [{label,value,color}].
const StackBar = ({ segments }) => {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0);
  if (total <= 0) return <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover' }} />;
  return (
    <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
      {segments.filter((s) => s.value > 0).map((s) => (
        <Tooltip key={s.label} title={`${s.label}: ${money(s.value)} (${Math.round((s.value / total) * 100)}%)`}>
          <Box sx={{ width: `${(s.value / total) * 100}%`, bgcolor: s.color }} />
        </Tooltip>
      ))}
    </Box>
  );
};

const Legend = ({ items }) => (
  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
    {items.map((i) => (
      <Stack key={i.label} direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: i.color }} />
        <Typography variant="caption" color="text.secondary">{i.label} · {money(i.value)}</Typography>
      </Stack>
    ))}
  </Stack>
);

const AdminResumen = () => {
  const { user } = useAuthContext();
  const [periodo, setPeriodo] = useState(currentMonth());
  const [empresaId, setEmpresaId] = useState(null);
  const [maestro, setMaestro] = useState([]);      // clientes (para periodicidad por empresa)
  const [cobranzas, setCobranzas] = useState([]);  // cobranzas del período
  const [aCargar, setACargar] = useState([]);      // recurrentes (incluye realizados)
  const [egresos, setEgresos] = useState([]);      // movimientos egreso reales del mes
  const [cajas, setCajas] = useState([]);          // saldo (neto all-time) por caja/proyecto
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Empresa (Sorby) + maestro de clientes: no dependen del período.
  useEffect(() => {
    (async () => {
      try {
        const [emp, m] = await Promise.all([
          getEmpresaDetailsFromUser(user),
          adminSuscripcionService.maestro(),
        ]);
        setEmpresaId(emp?.id || null);
        setMaestro(Array.isArray(m) ? m : []);
      } catch (e) {
        setSnackbar({ open: true, message: 'Error al cargar datos base', severity: 'error' });
      }
    })();
  }, [user]);

  // Saldo actual (neto de todos los tiempos) de cada caja/proyecto de Sorby.
  // Es independiente del período: es "cuánta plata hay hoy en cada caja".
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        const proys = (await getProyectosFromUser(user) || [])
          .filter((p) => p && p.eliminado !== true && p.activo !== false)
          .map((p) => ({ id: String(p._id || p.id), nombre: p.nombre || '—' }))
          .filter((p) => p.id);
        const conSaldo = await Promise.all(proys.map(async (p) => {
          try {
            const { totals } = await movimientosService.getCajaProyectoTotales(p.id, {});
            return { ...p, ars: totals?.currencies?.ARS?.neto || 0, usd: totals?.currencies?.USD?.neto || 0 };
          } catch {
            return { ...p, ars: 0, usd: 0 };
          }
        }));
        setCajas(conSaldo);
      } catch {
        setCajas([]);
      }
    })();
  }, [empresaId, user]);

  // Trae TODOS los egresos del mes paginando el dashboard de cajas.
  // empresaId es obligatorio: sin él el backend responde 403 (scope de empresa).
  const fetchEgresosDelMes = useCallback(async () => {
    const { desde, hasta } = monthRange(periodo);
    const base = {
      empresaId, tipo: 'egreso', fechaDesde: desde, fechaHasta: hasta,
      sort: 'fecha_factura', order: 'desc', limit: 200, includeOptions: 'false',
    };
    const all = [];
    let page = 1;
    let totalPages = 1;
    do {
      // eslint-disable-next-line no-await-in-loop
      const res = await movimientosService.getCajasDashboard({ ...base, page });
      all.push(...flattenDashboard(res.items));
      totalPages = res.pagination?.totalPages || 1;
      page += 1;
    } while (page <= totalPages && page <= 25); // tope de seguridad (5.000 movs)
    return all;
  }, [periodo, empresaId]);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    // Fuentes independientes: si una falla (p.ej. permisos de caja), las otras
    // igual se muestran en vez de dejar toda la vista en cero.
    const [cob, ac, eg] = await Promise.allSettled([
      adminSuscripcionService.cobranzas(periodo),
      gastoRecurrenteService.aCargar(empresaId, { incluirRealizados: true }),
      fetchEgresosDelMes(),
    ]);
    setCobranzas(cob.status === 'fulfilled' && Array.isArray(cob.value) ? cob.value : []);
    setACargar(ac.status === 'fulfilled' && Array.isArray(ac.value) ? ac.value : []);
    setEgresos(eg.status === 'fulfilled' && Array.isArray(eg.value) ? eg.value : []);
    const fallos = [
      cob.status === 'rejected' && 'cobranzas',
      ac.status === 'rejected' && 'gastos recurrentes',
      eg.status === 'rejected' && 'egresos de caja',
    ].filter(Boolean);
    if (fallos.length) {
      setSnackbar({ open: true, message: `No se pudo cargar: ${fallos.join(', ')}`, severity: 'warning' });
    }
    setLoading(false);
  }, [empresaId, periodo, fetchEgresosDelMes]);

  useEffect(() => { cargar(); }, [cargar]);

  // empresa_id → periodicidad de la suscripción (para clasificar mensual/anual).
  const periodicidadPorEmpresa = useMemo(() => {
    const map = {};
    maestro.forEach((c) => { if (c?.id) map[c.id] = c?.suscripcion?.periodicidad || ''; });
    return map;
  }, [maestro]);
  const tipoDeSuscripcion = (periodicidad) => {
    if (periodicidad === 'mensual') return 'mensual';
    if (periodicidad === 'anual') return 'anual';
    return 'otras'; // bimestral / semestral / sin definir
  };

  // ── INGRESOS ──────────────────────────────────────────────────────────────
  const ingresos = useMemo(() => {
    const kpi = { esperado: emptyCur(), cobrado: emptyCur(), pendiente: emptyCur(), vencido: emptyCur() };
    // Cobrado y esperado desglosados por tipo (solo ARS para el desglose visual).
    const cobradoTipo = { mensual: 0, anual: 0, otras: 0, implementacion: 0 };
    const esperadoTipo = { mensual: 0, anual: 0, otras: 0, implementacion: 0 };

    cobranzas.forEach((r) => {
      const tipo = tipoDeSuscripcion(periodicidadPorEmpresa[r.empresa_id]);
      if (r.estado !== 'omitido') {
        addCur(kpi.esperado, r.moneda, r.importe_esperado);
        addCur(kpi.pendiente, r.moneda, r.saldo);
        if ((r.moneda || 'ARS') !== 'USD') esperadoTipo[tipo] += Number(r.importe_esperado) || 0;
      }
      addCur(kpi.cobrado, r.moneda, r.importe_cobrado);
      if (r.estado === 'vencido') addCur(kpi.vencido, r.moneda, r.saldo);

      // Cobrado por tipo: se lee de cobros[] para separar implementación de suscripción.
      const cobros = Array.isArray(r.cobros) ? r.cobros : [];
      if (cobros.length && (r.moneda || 'ARS') !== 'USD') {
        cobros.forEach((c) => {
          const val = Number(c.importe_cobrado) || 0;
          if (c.concepto === 'implementacion') cobradoTipo.implementacion += val;
          else cobradoTipo[tipo] += val;
        });
      } else if ((r.moneda || 'ARS') !== 'USD') {
        cobradoTipo[tipo] += Number(r.importe_cobrado) || 0; // fallback sin cobros[]
      }
    });
    return { kpi, cobradoTipo, esperadoTipo };
  }, [cobranzas, periodicidadPorEmpresa]);

  // ── GASTOS ────────────────────────────────────────────────────────────────
  const gastos = useMemo(() => {
    // Egresos reales del mes (movimientos). Ya incluyen recurrentes registrados.
    const totalEgreso = emptyCur();
    const recurrente = emptyCur();
    const puntual = emptyCur();
    const porCategoria = {}; // catName -> { ARS, USD }
    egresos.forEach((m) => {
      addCur(totalEgreso, m.moneda, m.total);
      if (m.gasto_recurrente_id) addCur(recurrente, m.moneda, m.total);
      else addCur(puntual, m.moneda, m.total);
      const cat = m.categoria || 'Sin categoría';
      porCategoria[cat] = porCategoria[cat] || emptyCur();
      addCur(porCategoria[cat], m.moneda, m.total);
    });

    // Recurrentes por pagar del mes: filas a-cargar aún NO registradas.
    const PENDIENTE = new Set(['pendiente', 'proximo', 'vencido']);
    const porPagar = emptyCur();
    aCargar.forEach((r) => {
      if (!String(r.periodo || '').startsWith(periodo)) return;
      if (!PENDIENTE.has(r.estado)) return; // registrado/pagado/omitido ya no cuentan
      addCur(porPagar, r.moneda, r.importe_estandar);
    });

    const categorias = Object.entries(porCategoria)
      .map(([nombre, cur]) => ({ nombre, ars: cur.ARS, usd: cur.USD }))
      .sort((a, b) => b.ars - a.ars);

    return { totalEgreso, recurrente, puntual, porPagar, categorias };
  }, [egresos, aCargar, periodo]);

  const hasUsd = (cur) => Math.abs(cur.USD) > 0.001;
  const catTotalArs = gastos.categorias.reduce((s, c) => s + c.ars, 0);

  // Saldo en cajas agrupado: Fede, Facu y "resto" (las demás sumadas).
  const cajasAgg = useMemo(() => {
    const acc = { total: emptyCur(), fede: emptyCur(), facu: emptyCur(), resto: emptyCur() };
    cajas.forEach((c) => {
      const n = (c.nombre || '').toLowerCase();
      const bucket = n.includes('fede') ? 'fede' : n.includes('facu') ? 'facu' : 'resto';
      addCur(acc.total, 'ARS', c.ars); addCur(acc.total, 'USD', c.usd);
      addCur(acc[bucket], 'ARS', c.ars); addCur(acc[bucket], 'USD', c.usd);
    });
    return acc;
  }, [cajas]);

  // Proyección de cierre: saldo de hoy + todo lo que falta cobrar − recurrentes por pagar.
  const proyeccionArs = cajasAgg.total.ARS + ingresos.kpi.pendiente.ARS - gastos.porPagar.ARS;
  const proyeccionUsd = cajasAgg.total.USD + ingresos.kpi.pendiente.USD - gastos.porPagar.USD;

  return (
    <>
      <Head><title>Resumen del mes · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <div>
                <Typography variant="h4">Resumen del mes</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ingresos y gastos de un vistazo. Los importes en USD se muestran aparte.
                </Typography>
              </div>
              <TextField
                type="month" size="small" label="Período"
                InputLabelProps={{ shrink: true }}
                value={periodo} onChange={(e) => setPeriodo(e.target.value)}
              />
            </Stack>

            {loading && <Skeleton variant="rounded" height={160} />}

            {/* ── SALDO EN CAJAS + PROYECCIÓN ── */}
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Grid container spacing={3} alignItems="stretch">
                  {/* Total en cajas + composición */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="overline" color="text.secondary">Total en cajas (hoy)</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                      {money(cajasAgg.total.ARS)}
                      {hasUsd(cajasAgg.total) && (
                        <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1 }}>+ {money(cajasAgg.total.USD, 'USD')}</Typography>
                      )}
                    </Typography>
                    <Box sx={{ mt: 1.5, maxWidth: 520 }}>
                      <StackBar segments={[
                        { label: 'Caja Fede', value: cajasAgg.fede.ARS, color: COLORS.mensual },
                        { label: 'Caja Facu', value: cajasAgg.facu.ARS, color: COLORS.anual },
                        { label: 'Resto', value: cajasAgg.resto.ARS, color: COLORS.otras },
                      ]} />
                    </Box>
                    <Grid container spacing={2} sx={{ mt: 0.5, maxWidth: 560 }}>
                      {[
                        { label: 'Caja Fede', cur: cajasAgg.fede, color: COLORS.mensual },
                        { label: 'Caja Facu', cur: cajasAgg.facu, color: COLORS.anual },
                        { label: 'Resto de cajas', cur: cajasAgg.resto, color: COLORS.otras },
                      ].map((b) => (
                        <Grid item xs={4} key={b.label}>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: b.color }} />
                            <Typography variant="caption" color="text.secondary">{b.label}</Typography>
                          </Stack>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{money(b.cur.ARS)}</Typography>
                          {hasUsd(b.cur) && <Typography variant="caption" color="text.secondary">+ {money(b.cur.USD, 'USD')}</Typography>}
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  {/* Proyección de cierre de mes */}
                  <Grid item xs={12} md={5}>
                    <Box sx={{ height: '100%', p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="overline" color="text.secondary">Proyección fin de mes</Typography>
                        <Tooltip title="Saldo de hoy + todo lo que falta cobrar − recurrentes que faltan pagar. No incluye egresos puntuales futuros.">
                          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        </Tooltip>
                      </Stack>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: proyeccionArs >= 0 ? 'success.main' : 'error.main', lineHeight: 1.15 }}>
                        {money(proyeccionArs)}
                        {hasUsd({ USD: proyeccionUsd }) && (
                          <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>+ {money(proyeccionUsd, 'USD')}</Typography>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {money(cajasAgg.total.ARS)} hoy&nbsp; + &nbsp;{money(ingresos.kpi.pendiente.ARS)} por cobrar&nbsp; − &nbsp;{money(gastos.porPagar.ARS)} recurrentes
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* ── INGRESOS ── */}
            <Card variant="outlined">
              <CardHeader title="Ingresos" subheader="Cobranzas de suscripciones del período" />
              <Divider />
              <CardContent>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Cobré" value={money(ingresos.kpi.cobrado.ARS)} usd={hasUsd(ingresos.kpi.cobrado) && ingresos.kpi.cobrado.USD}
                      color="success.main" hint="Total efectivamente cobrado este mes." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Debería cobrar" value={money(ingresos.kpi.esperado.ARS)} usd={hasUsd(ingresos.kpi.esperado) && ingresos.kpi.esperado.USD}
                      hint="Esperado del mes (excluye clientes omitidos)." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Por cobrar" value={money(ingresos.kpi.pendiente.ARS)} usd={hasUsd(ingresos.kpi.pendiente) && ingresos.kpi.pendiente.USD}
                      color="warning.main" hint="Saldo pendiente = esperado − cobrado." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Vencido" value={money(ingresos.kpi.vencido.ARS)} usd={hasUsd(ingresos.kpi.vencido) && ingresos.kpi.vencido.USD}
                      color="error.main" hint="Pendiente cuyo vencimiento ya pasó." />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Mezcla de lo cobrado (ARS)
                </Typography>
                <StackBar segments={[
                  { label: 'Suscripción mensual', value: ingresos.cobradoTipo.mensual, color: COLORS.mensual },
                  { label: 'Suscripción anual', value: ingresos.cobradoTipo.anual, color: COLORS.anual },
                  { label: 'Otras (bi/semestral)', value: ingresos.cobradoTipo.otras, color: COLORS.otras },
                  { label: 'Implementación', value: ingresos.cobradoTipo.implementacion, color: COLORS.implementacion },
                ]} />
                <Legend items={[
                  { label: 'Mensual', value: ingresos.cobradoTipo.mensual, color: COLORS.mensual },
                  { label: 'Anual', value: ingresos.cobradoTipo.anual, color: COLORS.anual },
                  { label: 'Otras', value: ingresos.cobradoTipo.otras, color: COLORS.otras },
                  { label: 'Implementación', value: ingresos.cobradoTipo.implementacion, color: COLORS.implementacion },
                ]} />

                <Table size="small" sx={{ mt: 3 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo de ingreso (ARS)</TableCell>
                      <TableCell align="right">Cobrado</TableCell>
                      <TableCell align="right">Por cobrar</TableCell>
                      <TableCell align="right">
                        Esperado (total)
                        <Tooltip title="Total a cobrar del mes = cobrado + por cobrar.">
                          <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { k: 'mensual', label: 'Suscripción mensual' },
                      { k: 'anual', label: 'Suscripción anual' },
                      { k: 'otras', label: 'Otras (bi/semestral)' },
                    ].map(({ k, label }) => {
                      const cobrado = ingresos.cobradoTipo[k];
                      const esperado = ingresos.esperadoTipo[k];
                      return (
                        <TableRow key={k}>
                          <TableCell>{label}</TableCell>
                          <TableCell align="right">{money(cobrado)}</TableCell>
                          <TableCell align="right" sx={{ color: 'warning.main' }}>{money(Math.max(0, esperado - cobrado))}</TableCell>
                          <TableCell align="right">{money(esperado)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell>
                        Implementación
                        <Tooltip title="One-time. No tiene 'esperado' recurrente.">
                          <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">{money(ingresos.cobradoTipo.implementacion)}</TableCell>
                      <TableCell align="right">—</TableCell>
                      <TableCell align="right">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* ── GASTOS ── */}
            <Card variant="outlined">
              <CardHeader
                title="Gastos"
                subheader="Egresos reales del mes (ya incluyen recurrentes aplicados) + recurrentes que faltan pagar"
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Egresos del mes" value={money(gastos.totalEgreso.ARS)} usd={hasUsd(gastos.totalEgreso) && gastos.totalEgreso.USD}
                      color="error.main" hint="Total de egresos reales cargados en caja este mes." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="· Recurrentes" value={money(gastos.recurrente.ARS)} usd={hasUsd(gastos.recurrente) && gastos.recurrente.USD}
                      color={COLORS.recurrente} hint="Egresos del mes que provienen de un gasto recurrente." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="· Puntuales" value={money(gastos.puntual.ARS)} usd={hasUsd(gastos.puntual) && gastos.puntual.USD}
                      color={COLORS.puntual} hint="Egresos del mes que NO son recurrentes." />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Metric label="Recurrentes por pagar" value={money(gastos.porPagar.ARS)} usd={hasUsd(gastos.porPagar) && gastos.porPagar.USD}
                      color="warning.main" hint="Recurrentes de este mes todavía no registrados (pronóstico, no suma a egresos reales)." />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Recurrente vs puntual (ARS)
                </Typography>
                <StackBar segments={[
                  { label: 'Recurrentes', value: gastos.recurrente.ARS, color: COLORS.recurrente },
                  { label: 'Puntuales', value: gastos.puntual.ARS, color: COLORS.puntual },
                ]} />

                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
                  Egresos por categoría (ARS)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="right" sx={{ width: 90 }}>%</TableCell>
                      <TableCell sx={{ width: '35%' }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gastos.categorias.map((c, i) => (
                      <TableRow key={c.nombre}>
                        <TableCell>{c.nombre}{c.usd ? <Typography variant="caption" color="text.secondary" display="block">+ {money(c.usd, 'USD')}</Typography> : null}</TableCell>
                        <TableCell align="right">{money(c.ars)}</TableCell>
                        <TableCell align="right">{catTotalArs > 0 ? `${Math.round((c.ars / catTotalArs) * 100)}%` : '—'}</TableCell>
                        <TableCell>
                          <StackBar segments={[{ label: c.nombre, value: c.ars, color: CAT_PALETTE[i % CAT_PALETTE.length] }, { label: '', value: Math.max(0, catTotalArs - c.ars), color: 'transparent' }]} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && gastos.categorias.length === 0 && (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography color="text.secondary">Sin egresos en el período.</Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminResumen.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminResumen;
