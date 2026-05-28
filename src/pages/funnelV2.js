// ─── Funnel V2 — vista por variante ──────────────────────────────
//
// Reemplazo de landingFunnel.js que refleja la realidad del A/B:
//   - Variante A (form-first): visita → modal → form → completó → slot → agendó
//   - Variante B (cal-first):  visita → modal → slot → form → agendó
//
// Cada variante muestra SU embudo en su orden real, lado a lado, con CR entre
// pasos consecutivos. Arriba: totales (incluyendo leads parciales que solo
// existen en A). Filtros de atribución: "excluir directos" por default y
// multi-select de fuentes/campañas, todo aplicado del lado cliente sumando
// los counters granulares `src:X:Y` y `camp:X:Y` del backend.
//
// La página vieja `/landingFunnel` sigue activa — ésta es una vista paralela
// hasta validarla.

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Chip,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    Paper,
    CircularProgress,
    Alert,
    Stack,
    IconButton,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    FormControlLabel,
    Switch,
    Divider,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import landingStatsService from 'src/services/landingStatsService';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Util ──────────────────────────────────────────────

const toYMD = (d) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const pct = (num, den) => (!den || den === 0 ? null : (num / den) * 100);
const fmtPct = (p) => (p == null ? '—' : `${p.toFixed(1)}%`);
const fmtNum = (n) => (n > 0 ? n.toLocaleString('es-AR') : '—');

const RANGOS_PRESET = [
    { key: 'hoy',          label: 'Hoy',         dias: 1 },
    { key: 'd7',           label: '7 días',      dias: 7 },
    { key: 'd14',          label: '14 días',     dias: 14 },
    { key: 'd30',          label: '30 días',     dias: 30 },
    { key: 'post_28may',   label: 'Desde 28-may',desde: '2026-05-28' }, // arranque variante A
];

// ─── Definición de los dos funnels ────────────────────
// Cada paso declara cómo extraer su counter del `totales` (incluyendo
// extraSteps). El orden importa: define el embudo visual.

const FUNNEL_A = [
    { key: 'visitasLanding', label: 'Visita',         emoji: '👁️',  color: '#6366f1', source: 'top' },
    { key: 'abrioModal',     label: 'Abrió modal',    emoji: '📆',  color: '#0ea5e9', source: 'top' },
    { key: 'view_datos_a',   label: 'Vio form',       emoji: '📝',  color: '#0284c7', source: 'extra' },
    { key: 'submit_datos_a', label: 'Completó datos', emoji: '🎯',  color: '#22c55e', source: 'extra', meta: 'ViewContent dispara acá' },
    { key: 'eligioSlot',     label: 'Eligió slot',    emoji: '🕐',  color: '#f59e0b', source: 'top' },
    { key: 'agendaron',      label: 'Agendó',         emoji: '✅',  color: '#10b981', source: 'top' },
];

const FUNNEL_B = [
    { key: 'visitasLanding', label: 'Visita',         emoji: '👁️',  color: '#6366f1', source: 'top' },
    { key: 'abrioModal',     label: 'Abrió modal',    emoji: '📆',  color: '#0ea5e9', source: 'top' },
    { key: 'eligioSlot',     label: 'Eligió slot',    emoji: '🕐',  color: '#f59e0b', source: 'top', meta: 'ViewContent dispara acá' },
    { key: 'view_datos',     label: 'Vio form',       emoji: '📝',  color: '#0284c7', source: 'extra' },
    { key: 'submit_attempt', label: 'Intentó submit', emoji: '🚀',  color: '#8b5cf6', source: 'extra' },
    { key: 'agendaron',      label: 'Agendó',         emoji: '✅',  color: '#10b981', source: 'top' },
];

// ─── Filtrado por atribución ─────────────────────────
// El backend acumula counters `src:<source>:<event>` y `camp:<campaign>:<event>`
// en extraSteps. Si filtramos por atribución, RECONSTRUIMOS los counters
// "top-level" (visitas/abrió/agendó) sumando solo las fuentes elegidas.
// Los pasos que NO tienen variant-aware attribution (view_datos_a, submit_*)
// SOLO existen como totales globales — al filtrar mostramos "—" para ser
// honestos en vez de inventar.

// Mapeo evento-modal → clave que se acumula en src:/camp:
// (definido en agendarRoutes.js _incAttribution)
const EVENT_KEY_MAP = {
    visitasLanding: 'visita',
    abrioModal:     'abrioModal',
    eligioSlot:     'eligioSlot',
    agendaron:      'agendaron',
};

function detectarDimensiones(extraSteps, prefix) {
    return Array.from(new Set(
        Object.keys(extraSteps || {})
            .filter(k => k.startsWith(prefix + ':'))
            .map(k => k.split(':').slice(1, -1).join(':'))
            .filter(Boolean)
    )).sort();
}

function totalAttrEvent(extraSteps, prefix, dim, eventKey) {
    return extraSteps?.[`${prefix}:${dim}:${eventKey}`] || 0;
}

function buildTotalesFiltrados(totalesRaw, { fuentes, campañas, excluirDirectos }) {
    const extra = totalesRaw.extraSteps || {};
    const ejeFuentes = fuentes && fuentes.length > 0;
    const ejeCampañas = campañas && campañas.length > 0;

    // Determinar set efectivo de fuentes a sumar (cliente decide qué incluir).
    let prefix, dimsActivas;
    if (ejeCampañas) {
        prefix = 'camp';
        dimsActivas = campañas;
    } else {
        prefix = 'src';
        const todas = detectarDimensiones(extra, 'src');
        if (ejeFuentes) {
            dimsActivas = fuentes;
        } else if (excluirDirectos) {
            dimsActivas = todas.filter(d => d !== 'direct' && d !== 'na');
        } else {
            dimsActivas = todas;
        }
    }

    // Reconstruir counters top-level
    const filtrado = {
        visitasLanding: 0,
        abrioModal: 0,
        eligioSlot: 0,
        agendaron: 0,
        extraSteps: extra,   // los extraSteps no se "filtran" (no hay desglose por src de view_datos_a)
        byVariant: totalesRaw.byVariant, // tampoco hay byVariant×attribution
    };
    for (const dim of dimsActivas) {
        filtrado.visitasLanding += totalAttrEvent(extra, prefix, dim, EVENT_KEY_MAP.visitasLanding);
        filtrado.abrioModal    += totalAttrEvent(extra, prefix, dim, EVENT_KEY_MAP.abrioModal);
        filtrado.eligioSlot    += totalAttrEvent(extra, prefix, dim, EVENT_KEY_MAP.eligioSlot);
        filtrado.agendaron     += totalAttrEvent(extra, prefix, dim, EVENT_KEY_MAP.agendaron);
    }
    return { totales: filtrado, dimsActivas, prefix };
}

// ─── Componente: un funnel ────────────────────────────

function getStepValue(totales, step) {
    if (step.source === 'top') return totales[step.key] || 0;
    return totales.extraSteps?.[step.key] || 0;
}

function FunnelColumn({ title, subtitle, color, steps, totales, hideExtraOnFilter }) {
    return (
        <Card sx={{ borderTop: `4px solid ${color}`, height: '100%' }}>
            <CardHeader
                title={title}
                subheader={subtitle}
                titleTypographyProps={{ variant: 'h6', sx: { color } }}
            />
            <CardContent sx={{ pt: 0 }}>
                <Stack spacing={0}>
                    {steps.map((step, i) => {
                        const isExtra = step.source === 'extra';
                        const valRaw = getStepValue(totales, step);
                        // Si filtran y el step es extraStep, no podemos
                        // particionar por src → mostrar dash con tooltip.
                        const val = hideExtraOnFilter && isExtra ? null : valRaw;
                        const prev = i > 0 ? steps[i - 1] : null;
                        const prevRaw = prev ? getStepValue(totales, prev) : null;
                        const prevVal = hideExtraOnFilter && prev?.source === 'extra' ? null : prevRaw;
                        const cr = val != null && prevVal != null && prevVal > 0
                            ? pct(val, prevVal) : null;
                        // Ancho relativo del bar al primer step (visitas)
                        const top = getStepValue(totales, steps[0]) || 1;
                        const width = val != null ? Math.max(4, Math.round((valRaw / top) * 100)) : 0;
                        return (
                            <Box key={step.key}>
                                {prev && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 1.5, my: 0.5 }}>
                                        <Typography variant="caption" sx={{
                                            color: cr != null ? step.color : 'text.disabled',
                                            fontWeight: 600,
                                        }}>
                                            ↓ {cr != null ? fmtPct(cr) : '—'}
                                        </Typography>
                                    </Box>
                                )}
                                <Tooltip
                                    placement="left"
                                    arrow
                                    title={hideExtraOnFilter && isExtra
                                        ? 'Este step no se desglosa por fuente/campaña — mostramos solo los pasos atribuibles cuando hay filtro activo.'
                                        : (step.meta || '')}
                                >
                                    <Box sx={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        bgcolor: val != null ? `${step.color}15` : 'transparent',
                                        border: val != null ? `1px solid ${step.color}40` : '1px dashed #e0e0e0',
                                        borderRadius: 1,
                                        px: 1.5,
                                        py: 1.2,
                                        cursor: 'help',
                                    }}>
                                        <Box sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${width}%`,
                                            bgcolor: `${step.color}25`,
                                            borderRadius: 1,
                                            transition: 'width 0.5s ease',
                                        }} />
                                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: step.color, flex: 1 }}>
                                                {step.emoji} {step.label}
                                                {step.meta && (
                                                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                                                        — {step.meta}
                                                    </Typography>
                                                )}
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: val ? step.color : 'text.disabled' }}>
                                                {val != null ? fmtNum(valRaw) : '—'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Tooltip>
                            </Box>
                        );
                    })}
                </Stack>
            </CardContent>
        </Card>
    );
}

// ─── Resumen arriba ───────────────────────────────────

function TotalesResumen({ totales, byVariant, hideAttrSensitive }) {
    const visitas = totales.visitasLanding || 0;
    const agendados = totales.agendaron || 0;
    const parcialesA = totales.extraSteps?.lead_parcial_var_A || 0;
    const parcialesB = totales.extraSteps?.lead_parcial_var_B || 0;
    const parciales = parcialesA + parcialesB;
    const leadsCapturados = agendados + parciales;
    const crGlobal = pct(agendados, visitas);
    const crLead = pct(leadsCapturados, visitas);

    const cards = [
        { label: 'Visitas',           val: visitas,          color: '#6366f1', emoji: '👁️' },
        { label: 'Leads capturados',  val: leadsCapturados,  color: '#22c55e', emoji: '🎯',
          sub: parciales > 0 ? `${agendados} agendaron + ${parciales} parciales` : null,
          pct: crLead != null ? `${fmtPct(crLead)} vs visitas` : null },
        { label: 'Agendados',         val: agendados,        color: '#10b981', emoji: '✅',
          pct: crGlobal != null ? `${fmtPct(crGlobal)} vs visitas` : null },
        { label: 'Parciales (solo A)', val: parcialesA,      color: '#0ea5e9', emoji: '📝',
          sub: 'Dejaron datos sin agendar — recuperables por WA' },
    ];
    return (
        <Grid container spacing={2}>
            {cards.map(c => (
                <Grid item xs={6} md={3} key={c.label}>
                    <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
                        <CardContent sx={{ py: 2 }}>
                            <Typography variant="caption" color="text.secondary" gutterBottom>{c.emoji} {c.label}</Typography>
                            <Typography variant="h4" sx={{ color: c.color, fontWeight: 700, lineHeight: 1 }}>{fmtNum(c.val)}</Typography>
                            {c.pct && (
                                <Typography variant="caption" sx={{ color: c.color, fontWeight: 600, display: 'block', mt: 0.5 }}>{c.pct}</Typography>
                            )}
                            {c.sub && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{c.sub}</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

// ─── Tendencia diaria simplificada ────────────────────

function TendenciaChart({ rows }) {
    if (!rows || rows.length === 0) return null;
    const fechas = rows.map(r => r.fecha.slice(5)); // MM-DD
    const series = [
        { name: 'Agendados', data: rows.map(r => r.agendaron || 0), color: '#10b981' },
        { name: 'Eligió slot', data: rows.map(r => r.eligioSlot || 0), color: '#f59e0b' },
        { name: 'Abrió modal', data: rows.map(r => r.abrioModal || 0), color: '#0ea5e9' },
    ];
    const opts = {
        chart: { type: 'line', toolbar: { show: false }, sparkline: { enabled: false } },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: fechas },
        legend: { position: 'top', horizontalAlign: 'right' },
        grid: { borderColor: '#f0f0f0' },
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false },
    };
    return (
        <Card>
            <CardHeader title="📈 Tendencia diaria" subheader="Apertura · slot · booking por día" />
            <CardContent sx={{ pt: 0 }}>
                <Chart type="line" series={series} options={opts} height={260} />
            </CardContent>
        </Card>
    );
}

// ─── Página ───────────────────────────────────────────

const FunnelV2Page = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rangoKey, setRangoKey] = useState('d14');
    const [modo, setModo] = useState('preset');
    const [fechaDesde, setFechaDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return d; });
    const [fechaHasta, setFechaHasta] = useState(() => new Date());
    const [excluirDirectos, setExcluirDirectos] = useState(true);
    const [fuentesFiltro, setFuentesFiltro] = useState([]);
    const [campañasFiltro, setCampañasFiltro] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let args;
            if (modo === 'rango') {
                args = { desde: toYMD(fechaDesde), hasta: toYMD(fechaHasta) };
            } else {
                const r = RANGOS_PRESET.find(x => x.key === rangoKey) || RANGOS_PRESET[1];
                if (r.desde) args = { desde: r.desde, hasta: toYMD(new Date()) };
                else args = { dias: r.dias };
            }
            const res = await landingStatsService.getStats(args);
            setData(res);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Error');
        } finally {
            setLoading(false);
        }
    }, [modo, rangoKey, fechaDesde, fechaHasta]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalesRaw = data?.totales || {};
    const rows = data?.rows || [];
    const extra = totalesRaw.extraSteps || {};

    const fuentesDetectadas = useMemo(() => detectarDimensiones(extra, 'src'), [extra]);
    const campañasDetectadas = useMemo(() => detectarDimensiones(extra, 'camp'), [extra]);

    // Limpiar selecciones obsoletas
    useEffect(() => {
        setFuentesFiltro(prev => prev.filter(x => fuentesDetectadas.includes(x)));
        setCampañasFiltro(prev => prev.filter(x => campañasDetectadas.includes(x)));
    }, [fuentesDetectadas, campañasDetectadas]);

    const hayFiltroExplicito = fuentesFiltro.length > 0 || campañasFiltro.length > 0;
    const hayAlgúnFiltro = hayFiltroExplicito || excluirDirectos;

    const { totales: totalesFiltrados, dimsActivas } = useMemo(() => {
        if (!hayAlgúnFiltro) return { totales: totalesRaw, dimsActivas: null };
        return buildTotalesFiltrados(totalesRaw, {
            fuentes: fuentesFiltro,
            campañas: campañasFiltro,
            excluirDirectos: excluirDirectos && fuentesFiltro.length === 0 && campañasFiltro.length === 0,
        });
    }, [totalesRaw, fuentesFiltro, campañasFiltro, excluirDirectos, hayAlgúnFiltro]);

    // byVariant para mostrar A y B con el dataset filtrado: hoy NO podemos
    // partir byVariant por atribución (el backend no acumula esa intersección).
    // Cuando hay filtro, mostramos el funnel agregado A+B con dimensiones
    // afectadas y un aviso. Cuando NO hay filtro, mostramos A y B separados.
    const byVariant = totalesRaw.byVariant || { A: {}, B: {} };

    return (
        <>
            <Head><title>Funnel V2 | Sorbydata</title></Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">
                    {/* ─── Header ─── */}
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} mb={3}>
                        <Box>
                            <Typography variant="h4">📊 Funnel V2 — Landing → Agenda</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Vista por variante (form-first vs cal-first) con filtros de atribución
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_, v) => v && setModo(v)}>
                                <ToggleButton value="preset">Preset</ToggleButton>
                                <ToggleButton value="rango">Rango</ToggleButton>
                            </ToggleButtonGroup>
                            {modo === 'preset' ? (
                                <ToggleButtonGroup size="small" exclusive value={rangoKey} onChange={(_, v) => v && setRangoKey(v)}>
                                    {RANGOS_PRESET.map(r => (
                                        <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                            ) : (
                                <Stack direction="row" spacing={1}>
                                    <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} maxDate={fechaHasta} format="dd/MM/yyyy" slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
                                    <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} minDate={fechaDesde} maxDate={new Date()} format="dd/MM/yyyy" slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
                                </Stack>
                            )}
                            <Tooltip title="Refrescar">
                                <IconButton onClick={fetchData} disabled={loading}><RefreshIcon /></IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    {/* ─── Filtros de atribución ─── */}
                    <Card sx={{ mb: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={excluirDirectos}
                                            onChange={(_, v) => setExcluirDirectos(v)}
                                            disabled={hayFiltroExplicito}
                                        />
                                    }
                                    label={<Typography variant="body2"><strong>Excluir directos / sin UTM</strong> — quita el ruido orgánico para análisis de campañas</Typography>}
                                />
                                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                                {fuentesDetectadas.length > 0 && (
                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Fuentes:</Typography>
                                        <ToggleButtonGroup size="small" value={fuentesFiltro} onChange={(_, v) => { setFuentesFiltro(v || []); if (v && v.length) setCampañasFiltro([]); }}>
                                            {fuentesDetectadas.map(f => (
                                                <ToggleButton key={f} value={f} sx={{ fontFamily: 'monospace', textTransform: 'none', py: 0.2, px: 1 }}>{f}</ToggleButton>
                                            ))}
                                        </ToggleButtonGroup>
                                    </Stack>
                                )}
                                {campañasDetectadas.length > 0 && (
                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Campañas:</Typography>
                                        <ToggleButtonGroup size="small" value={campañasFiltro} onChange={(_, v) => { setCampañasFiltro(v || []); if (v && v.length) setFuentesFiltro([]); }}>
                                            {campañasDetectadas.map(c => (
                                                <ToggleButton key={c} value={c} sx={{ fontFamily: 'monospace', textTransform: 'none', py: 0.2, px: 1 }}>{c}</ToggleButton>
                                            ))}
                                        </ToggleButtonGroup>
                                    </Stack>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>

                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                    {loading && !data && <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>}

                    {data && (
                        <Stack spacing={3}>
                            {hayAlgúnFiltro && (
                                <Alert severity="info" sx={{ mb: -1 }}>
                                    Filtro activo: {hayFiltroExplicito
                                        ? `${campañasFiltro.length ? 'Campañas' : 'Fuentes'} = ${(campañasFiltro.length ? campañasFiltro : fuentesFiltro).join(', ')}`
                                        : 'excluyendo direct/sin UTM'} —
                                    los pasos del modal (vio form, completó, intentó submit) <strong>no se desglosan por atribución</strong> y aparecen como "—". Cuando se quita el filtro se muestran completos.
                                </Alert>
                            )}

                            <TotalesResumen totales={totalesFiltrados} byVariant={byVariant} hideAttrSensitive={hayAlgúnFiltro} />

                            {/* Dos funnels lado a lado.
                                Cuando hay filtro de atribución, mostramos el funnel agregado (sumando A+B)
                                porque byVariant no se cruza con src/camp. */}
                            {hayAlgúnFiltro ? (
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <FunnelColumn
                                            title="Funnel agregado (A + B)"
                                            subtitle="Sumando ambas variantes — pasos intermedios del modal ocultos por filtro de atribución"
                                            color="#8b5cf6"
                                            steps={FUNNEL_A.filter(s => s.source === 'top')}
                                            totales={totalesFiltrados}
                                            hideExtraOnFilter={false}
                                        />
                                    </Grid>
                                </Grid>
                            ) : (
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <FunnelColumn
                                            title="🅰️ Variante A — form-first"
                                            subtitle="Datos antes del calendario · captura leads aunque no agenden"
                                            color="#0ea5e9"
                                            steps={FUNNEL_A.map(s => s.source === 'top'
                                                ? { ...s, _val: byVariant.A?.[s.key] || 0 }
                                                : s)}
                                            totales={{
                                                ...byVariant.A,
                                                extraSteps: extra,
                                            }}
                                            hideExtraOnFilter={false}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FunnelColumn
                                            title="🅱️ Variante B — calendar-first"
                                            subtitle="Flujo histórico · sin captura de leads parciales"
                                            color="#10b981"
                                            steps={FUNNEL_B}
                                            totales={{
                                                ...byVariant.B,
                                                extraSteps: extra,
                                            }}
                                            hideExtraOnFilter={false}
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            <TendenciaChart rows={rows} />

                            {/* Footnote pedagógica */}
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong>Cómo leerlo:</strong> Cada columna muestra el orden REAL en el que el usuario avanza por esa variante.
                                        En A, "Completó datos" es donde dispara el ViewContent del Pixel; en B, eso pasa en "Eligió slot".
                                        Los porcentajes son CR entre el step y el inmediatamente anterior.<br /><br />
                                        <strong>Filtros:</strong> Por defecto se excluyen los visitantes directos (sin UTM) porque inflan el funnel con tráfico no atribuible a campañas.
                                        Cuando elegís fuentes o campañas específicas, los pasos intermedios del modal (Vio form, Completó datos, Intentó submit) aparecen como "—"
                                        porque el backend no almacena la intersección variant × atribución. Para verlos completos, sacá los filtros.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Stack>
                    )}
                </Container>
            </Box>
        </>
    );
};

FunnelV2Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default FunnelV2Page;
