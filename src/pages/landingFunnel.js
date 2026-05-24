import { useState, useEffect, useCallback, Fragment } from 'react';
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
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import landingStatsService from 'src/services/landingStatsService';

const toYMD = (d) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Config ──────────────────────────────────────────────

// Funnel principal (variante B ganadora — categoría es post-booking).
// `eligioCategoria` legacy (pre-booking del A/B viejo) ya no se incrementa,
// así que se quita del funnel para evitar CR inflados (>100%).
const METRICAS = [
    { key: 'visitasLanding',     label: 'Visitas',          emoji: '👁️', color: '#6366f1', desc: 'Llegaron a la landing' },
    { key: 'abrioModal',         label: 'Abrió modal',      emoji: '📆', color: '#0ea5e9', desc: 'Hicieron clic en "Agendar"' },
    { key: 'eligioSlot',         label: 'Eligió horario',   emoji: '🕐', color: '#f59e0b', desc: 'Seleccionaron un slot' },
    { key: 'agendaron',          label: 'Agendaron',        emoji: '✅', color: '#10b981', desc: 'Confirmaron la reunión' },
    { key: 'eligioCategoriaPost', label: 'Eligió rubro',    emoji: '🏷️', color: '#8b5cf6', desc: 'Eligieron rubro después de agendar (opcional)' },
];

// Embudo granular dentro del modal — viene de LandingStats.extraSteps.
// Orden lógico del recorrido del usuario una vez que tocó un horario.
const GRANULAR_FUNNEL = [
    { key: 'eligioSlot',                 source: 'top',   label: 'Tocó horario',           emoji: '🕐', color: '#f59e0b', desc: 'Click en una píldora de slot (== eligioSlot)' },
    { key: 'view_datos',                 source: 'extra', label: 'Vio form datos',         emoji: '📝', color: '#0ea5e9', desc: 'El step 2 se renderizó (form visible)' },
    { key: 'focus_form',                 source: 'extra', label: 'Tocó un campo',          emoji: '👆', color: '#06b6d4', desc: 'Primer focus en cualquier input' },
    { key: 'submit_attempt',             source: 'extra', label: 'Intentó confirmar',     emoji: '🚀', color: '#8b5cf6', desc: 'Clickeó "Confirmar agendamiento"' },
    { key: 'agendaron',                  source: 'top',   label: 'Agendaron',              emoji: '✅', color: '#10b981', desc: 'Backend devolvió ok' },
];

// Errores que cortan el flujo en el form — no son parte del happy path.
const GRANULAR_ERRORES = [
    { key: 'submit_validation_error',    label: 'Error validación local',   emoji: '⚠️', color: '#f59e0b', desc: 'Faltaba nombre o email mal formado' },
    { key: 'submit_backend_error',       label: 'Error backend',            emoji: '❌', color: '#ef4444', desc: 'POST /book devolvió ok:false' },
    { key: 'submit_network_error',       label: 'Error red',                emoji: '🌐', color: '#ef4444', desc: 'fetch tiró excepción (CORS / 5xx / sin conexión)' },
];

// Abandonos: cierres del modal en cada step.
const GRANULAR_CIERRES = [
    { key: 'close_step_1',  label: 'Cerró en horario',  emoji: '🚪', color: '#94a3b8', desc: 'Cerró el modal viendo el calendario' },
    { key: 'close_step_2',  label: 'Cerró en form',     emoji: '🚪', color: '#94a3b8', desc: 'Cerró el modal viendo el form de datos' },
];

// Totales históricos congelados del A/B test finalizado (para mostrar como contexto)
const HISTORICO = {
    visitasLanding: 1819,
    abrioModal: 155,
    eligioCategoria: null, // no trackeado en el A/B test
    eligioSlot: 45,
    agendaron: 24,
};

// ─── Helpers ──────────────────────────────────────────────

function pct(num, den) {
    if (!den || den === 0) return '—';
    return ((num / den) * 100).toFixed(1) + '%';
}

function formatFechaDia(f) {
    if (!f) return '—';
    const [, m, d] = f.split('-');
    return `${d}/${m}`;
}

// ─── Tarjetas de resumen ──────────────────────────────────

function SummaryCards({ totales }) {
    return (
        <Grid container spacing={2}>
            {METRICAS.map((m, i) => {
                const val = totales[m.key] || 0;
                const prevVal = i > 0 ? (totales[METRICAS[i - 1].key] || 0) : null;
                const conversion = prevVal !== null ? pct(val, prevVal) : null;

                return (
                    <Grid item xs={12} sm={6} md={3} key={m.key}>
                        <Card sx={{ borderTop: `3px solid ${m.color}`, height: '100%' }}>
                            <CardContent>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                    {m.desc}
                                </Typography>
                                <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
                                    <Typography variant="h3" sx={{ color: m.color, fontWeight: 700 }}>
                                        {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                    </Typography>
                                    {conversion && conversion !== '—' && (
                                        <Chip
                                            size="small"
                                            label={`${conversion} del paso ant.`}
                                            sx={{ bgcolor: `${m.color}18`, color: m.color, fontWeight: 600, fontSize: 11 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                    {m.emoji} {m.label}
                                </Typography>
                                {m.key === 'visitasLanding' && val === 0 && (
                                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                                        Sin visitas en el período
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
}

// ─── Funnel visual ────────────────────────────────────────

function FunnelVisual({ totales }) {
    // Primer métrica con valor > 0 como referencia del 100% visual
    const metricaBase = METRICAS.find(m => totales[m.key] > 0);
    const baseVal = metricaBase ? (totales[metricaBase.key] || 1) : 1;

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                title="🔽 Embudo de conversión"
                subheader={`Período seleccionado — desde el nuevo tracking (may 2026)`}
            />
            <CardContent>
                <Stack spacing={2}>
                    {METRICAS.map((m, i) => {
                        const val = totales[m.key] || 0;
                        const prevVal = i > 0 ? (totales[METRICAS[i - 1].key] || 0) : null;
                        const stepPct = prevVal !== null ? pct(val, prevVal) : null;
                        const barPct = baseVal > 0 ? Math.max((val / baseVal) * 100, val > 0 ? 3 : 0) : 0;

                        return (
                            <Box key={m.key}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Typography
                                        variant="body2"
                                        sx={{ minWidth: 130, fontWeight: 500 }}
                                    >
                                        {m.emoji} {m.label}
                                    </Typography>
                                    <Box
                                        sx={{
                                            flex: 1,
                                            bgcolor: 'action.hover',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            height: 32,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                height: '100%',
                                                width: `${barPct}%`,
                                                bgcolor: m.color,
                                                borderRadius: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                px: 1.5,
                                                transition: 'width 0.8s ease',
                                                minWidth: val > 0 ? 40 : 0,
                                            }}
                                        >
                                            {val > 0 && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                >
                                                    {val.toLocaleString('es-AR')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ minWidth: 52, textAlign: 'right', fontWeight: stepPct && stepPct !== '—' ? 600 : 400 }}
                                    >
                                        {stepPct || ''}
                                    </Typography>
                                </Stack>
                                {i < METRICAS.length - 1 && (
                                    <Typography
                                        variant="caption"
                                        color="text.disabled"
                                        sx={{ display: 'block', pl: '146px', lineHeight: 1.2 }}
                                    >
                                        ↓
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>

                {/* Contexto histórico */}
                <Box sx={{ mt: 3, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        📌 Histórico A/B test (congelado, previo al nuevo tracking):
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {METRICAS.filter(m => HISTORICO[m.key] != null).map(m => (
                            <Chip
                                key={m.key}
                                size="small"
                                label={`${m.emoji} ${HISTORICO[m.key].toLocaleString('es-AR')}`}
                                sx={{ bgcolor: `${m.color}18`, color: m.color, fontSize: 11 }}
                            />
                        ))}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}

// ─── Gráfico de tendencia ─────────────────────────────────

function TendenciaChart({ rows }) {
    if (!rows || rows.length === 0) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardHeader title="📈 Tendencia diaria" />
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                        <Typography variant="body2" color="text.secondary">
                            Sin datos para el período seleccionado
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    const mostrarVisitas = rows.some(r => Number(r.visitasLanding) > 0);
    const seriesVisibles = METRICAS.filter(m => m.key !== 'visitasLanding' || mostrarVisitas);
    const safeRows = rows.filter(r => r && r.fecha);

    const series = seriesVisibles.map(m => ({
        name: `${m.emoji} ${m.label}`,
        data: safeRows.map(r => Number(r[m.key]) || 0),
    }));

    const categorias = safeRows.map(r => formatFechaDia(r.fecha));

    const options = {
        chart: {
            id: `tendencia-${safeRows.length}-${seriesVisibles.length}`,
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'inherit',
            animations: { enabled: false },
        },
        colors: seriesVisibles.map(m => m.color),
        xaxis: {
            categories: categorias,
            labels: { style: { fontSize: '11px' } },
        },
        yaxis: {
            labels: { style: { fontSize: '11px' }, formatter: (v) => (v == null ? '' : String(v)) },
            min: 0,
        },
        plotOptions: {
            bar: { columnWidth: '75%', borderRadius: 3, borderRadiusApplication: 'end' },
        },
        dataLabels: { enabled: false },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
        grid: { borderColor: '#e5e7eb', yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
        tooltip: { shared: true, intersect: false },
        stroke: { show: false },
        noData: { text: 'Sin datos' },
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader title="📈 Tendencia diaria" />
            <CardContent sx={{ pt: 0 }}>
                <Chart type="bar" series={series} options={options} height={280} />
            </CardContent>
        </Card>
    );
}

// ─── Embudo granular del modal (eventos extraSteps) ──────
// Une los counters principales (eligioSlot, agendaron) con los granulares
// (view_datos, focus_form, submit_attempt, errores y cierres) para revelar
// exactamente dónde se cae la gente DENTRO del modal.

function getStepValue(totales, step) {
    if (step.source === 'top') return totales[step.key] || 0;
    return totales.extraSteps?.[step.key] || 0;
}

function EmbudoGranular({ totales }) {
    const hayDatosGranulares = totales.extraSteps && Object.keys(totales.extraSteps).length > 0;

    return (
        <Card sx={{ borderLeft: '4px solid #0ea5e9' }}>
            <CardHeader
                title="🔍 Embudo granular dentro del modal"
                subheader={hayDatosGranulares
                    ? 'Eventos finos del flujo de agendamiento — revela el lugar exacto del abandono'
                    : 'Sin datos granulares todavía — se llenarán a medida que entren visitas con el tracking nuevo'}
            />
            <CardContent sx={{ pt: 0 }}>
                {/* Happy path: tocó horario → vio form → tocó campo → intentó submit → agendó */}
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Happy path
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Paso</strong></TableCell>
                                <TableCell align="right"><strong>Conteo</strong></TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Conversión desde el paso inmediatamente anterior" placement="top" arrow>
                                        <strong style={{ cursor: 'help' }}>CR paso ant.</strong>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Conversión desde 'Tocó horario'" placement="top" arrow>
                                        <strong style={{ cursor: 'help' }}>CR vs horario</strong>
                                    </Tooltip>
                                </TableCell>
                                <TableCell><strong>Descripción</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {GRANULAR_FUNNEL.map((m, i) => {
                                const val = getStepValue(totales, m);
                                const prev = i > 0 ? GRANULAR_FUNNEL[i - 1] : null;
                                const prevVal = prev ? getStepValue(totales, prev) : null;
                                const base = getStepValue(totales, GRANULAR_FUNNEL[0]);
                                const crStep = prev ? pct(val, prevVal) : null;
                                const crBase = i > 0 ? pct(val, base) : null;
                                return (
                                    <TableRow key={m.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: m.color }}>
                                                {m.emoji} {m.label}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: val > 0 ? m.color : 'text.disabled' }}>
                                                {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="caption" sx={{ color: crStep && crStep !== '—' ? m.color : 'text.disabled', fontWeight: 600 }}>
                                                {crStep || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="caption" color="text.secondary">
                                                {crBase || '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">{m.desc}</Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Errores y abandonos en una grilla compacta */}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Errores al confirmar
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {GRANULAR_ERRORES.map(e => {
                                        const val = totales.extraSteps?.[e.key] || 0;
                                        const submits = totales.extraSteps?.submit_attempt || 0;
                                        const pctSubmit = submits > 0 ? pct(val, submits) : '—';
                                        return (
                                            <TableRow key={e.key}>
                                                <TableCell>
                                                    <Tooltip title={e.desc} placement="top" arrow>
                                                        <Typography variant="body2" sx={{ cursor: 'help', fontWeight: val > 0 ? 600 : 400, color: val > 0 ? e.color : 'text.secondary' }}>
                                                            {e.emoji} {e.label}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: val > 0 ? e.color : 'text.disabled' }}>
                                                        {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ width: 80 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {val > 0 && pctSubmit !== '—' ? `${pctSubmit} subm.` : ''}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Abandonos por step
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {GRANULAR_CIERRES.map(c => {
                                        const val = totales.extraSteps?.[c.key] || 0;
                                        return (
                                            <TableRow key={c.key}>
                                                <TableCell>
                                                    <Tooltip title={c.desc} placement="top" arrow>
                                                        <Typography variant="body2" sx={{ cursor: 'help', fontWeight: val > 0 ? 600 : 400 }}>
                                                            {c.emoji} {c.label}
                                                        </Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ fontWeight: 700, color: val > 0 ? c.color : 'text.disabled' }}>
                                                        {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>

                {/* Eventos crudos que llegaron pero no encajan en las categorías arriba */}
                {hayDatosGranulares && (() => {
                    const conocidos = new Set([
                        ...GRANULAR_FUNNEL.filter(s => s.source === 'extra').map(s => s.key),
                        ...GRANULAR_ERRORES.map(s => s.key),
                        ...GRANULAR_CIERRES.map(s => s.key),
                    ]);
                    const otros = Object.entries(totales.extraSteps || {})
                        // Excluir las claves de atribución (van a su propio bloque)
                        .filter(([k]) => !conocidos.has(k) && !k.startsWith('src:') && !k.startsWith('camp:'))
                        .sort((a, b) => b[1] - a[1]);
                    if (otros.length === 0) return null;
                    return (
                        <Box mt={3}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Otros eventos
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableBody>
                                        {otros.map(([k, v]) => (
                                            <TableRow key={k}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{k}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {v.toLocaleString('es-AR')}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    );
                })()}
            </CardContent>
        </Card>
    );
}

// ─── Tabla por día ────────────────────────────────────────

function TablaDaily({ rows }) {
    if (!rows || rows.length === 0) {
        return (
            <Card>
                <CardHeader title="📅 Datos por día" />
                <CardContent>
                    <Typography variant="body2" color="text.secondary" align="center" py={4}>
                        Sin datos para el período seleccionado.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const filas = [...rows].reverse();
    const mostrarVisitas = rows.some(r => r.visitasLanding > 0);
    const metricasVisibles = METRICAS.filter(m => m.key !== 'visitasLanding' || mostrarVisitas);

    return (
        <Card>
            <CardHeader
                title="📅 Datos por día"
                subheader={`${filas.length} días con actividad · incluye CR entre eventos consecutivos`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Fecha</strong></TableCell>
                                {metricasVisibles.map((m, i) => {
                                    const prev = i > 0 ? metricasVisibles[i - 1] : null;
                                    return (
                                        <Fragment key={`h-${m.key}`}>
                                            {prev && (
                                                <TableCell align="center" sx={{ bgcolor: 'action.hover' }}>
                                                    <Tooltip
                                                        title={`Conversión ${prev.label} → ${m.label}`}
                                                        placement="top"
                                                        arrow
                                                    >
                                                        <strong style={{ cursor: 'help', fontSize: 11 }}>
                                                            CR {prev.emoji}→{m.emoji}
                                                        </strong>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                            <TableCell align="center">
                                                <strong>{m.emoji} {m.label}</strong>
                                            </TableCell>
                                        </Fragment>
                                    );
                                })}
                                <TableCell align="center">
                                    <Tooltip
                                        title="Porcentaje de quienes abrieron el modal y terminaron agendando"
                                        placement="top"
                                        arrow
                                    >
                                        <strong style={{ cursor: 'help' }}>Modal → Agenda</strong>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filas.map(r => (
                                <TableRow
                                    key={r.fecha}
                                    sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                                            {r.fecha}
                                        </Typography>
                                    </TableCell>
                                    {metricasVisibles.map((m, i) => {
                                        const prev = i > 0 ? metricasVisibles[i - 1] : null;
                                        const cr = prev ? pct(r[m.key] || 0, r[prev.key] || 0) : null;
                                        return (
                                            <Fragment key={`${r.fecha}-${m.key}`}>
                                                {prev && (
                                                    <TableCell align="center" sx={{ bgcolor: 'action.hover' }}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{
                                                                color: cr && cr !== '—' ? m.color : 'text.disabled',
                                                                fontWeight: cr && cr !== '—' ? 600 : 400,
                                                            }}
                                                        >
                                                            {cr}
                                                        </Typography>
                                                    </TableCell>
                                                )}
                                                <TableCell align="center">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: r[m.key] > 0 ? m.color : 'text.disabled',
                                                            fontWeight: r[m.key] > 0 ? 700 : 400,
                                                        }}
                                                    >
                                                        {r[m.key] > 0 ? r[m.key] : '—'}
                                                    </Typography>
                                                </TableCell>
                                            </Fragment>
                                        );
                                    })}
                                    <TableCell align="center">
                                        <Typography variant="caption" color="text.secondary">
                                            {pct(r.agendaron || 0, r.abrioModal || 0)}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

// ─── Atribución por fuente / campaña ─────────────────────────
// Parsea las claves `src:<source>:<event>` y `camp:<campaign>:<event>` de
// extraSteps en una tabla que muestra el funnel completo por dimensión:
//   visita → abrioModal → eligioSlot → agendaron + (lead_parcial, lead_whatsapp)
function parseAttributionBreakdown(extraSteps, prefix /* 'src' | 'camp' */) {
    const buckets = {}; // { source/campaign: { visita, abrioModal, eligioSlot, agendaron, lead_parcial, lead_whatsapp } }
    Object.entries(extraSteps || {}).forEach(([k, v]) => {
        if (!k.startsWith(prefix + ':')) return;
        const parts = k.split(':');
        if (parts.length < 3) return;
        const dim = parts.slice(1, -1).join(':'); // permite ':' dentro del nombre
        const ev = parts[parts.length - 1];
        if (!buckets[dim]) buckets[dim] = {};
        buckets[dim][ev] = (buckets[dim][ev] || 0) + (v || 0);
    });
    return buckets;
}

const ATTR_EVENTS = [
    { key: 'visita',         label: 'Visitas',        color: '#6366f1' },
    { key: 'abrioModal',     label: 'Abrió modal',    color: '#0ea5e9' },
    { key: 'eligioSlot',     label: 'Eligió slot',    color: '#f59e0b' },
    { key: 'agendaron',      label: 'Agendaron',      color: '#10b981' },
    { key: 'lead_parcial',   label: 'Lead parcial',   color: '#94a3b8' },
    { key: 'lead_whatsapp',  label: 'Lead WA',        color: '#25d366' },
];

function AtribucionTabla({ extraSteps, prefix, title, dimLabel }) {
    const buckets = parseAttributionBreakdown(extraSteps, prefix);
    const rows = Object.entries(buckets)
        .map(([dim, evs]) => ({ dim, ...evs }))
        .sort((a, b) => (b.visita || b.abrioModal || 0) - (a.visita || a.abrioModal || 0));

    if (rows.length === 0) {
        return (
            <Card sx={{ borderLeft: '4px solid #8b5cf6' }}>
                <CardHeader title={title} subheader="Sin datos todavía — empezarán a aparecer cuando lleguen visitas con UTM" />
            </Card>
        );
    }

    return (
        <Card sx={{ borderLeft: '4px solid #8b5cf6' }}>
            <CardHeader
                title={title}
                subheader={`${rows.length} ${dimLabel}${rows.length > 1 ? 's' : ''} detectado${rows.length > 1 ? 's' : ''} — funnel completo por dimensión`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>{dimLabel.charAt(0).toUpperCase() + dimLabel.slice(1)}</strong></TableCell>
                                {ATTR_EVENTS.map(e => (
                                    <TableCell key={e.key} align="right"><strong>{e.label}</strong></TableCell>
                                ))}
                                <TableCell align="right">
                                    <Tooltip title="Tasa agenda / visita" placement="top" arrow>
                                        <strong style={{ cursor: 'help' }}>CR</strong>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(r => {
                                const cr = r.visita > 0 ? pct(r.agendaron || 0, r.visita) : '—';
                                return (
                                    <TableRow key={r.dim} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.dim}</Typography>
                                        </TableCell>
                                        {ATTR_EVENTS.map(e => (
                                            <TableCell key={e.key} align="right">
                                                <Typography variant="body2" sx={{ color: (r[e.key] || 0) > 0 ? e.color : 'text.disabled', fontWeight: (r[e.key] || 0) > 0 ? 700 : 400 }}>
                                                    {r[e.key] > 0 ? r[e.key].toLocaleString('es-AR') : '—'}
                                                </Typography>
                                            </TableCell>
                                        ))}
                                        <TableCell align="right">
                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{cr}</Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

// ─── Rangos preset basados en hitos del producto ──────────
// Cortes históricos relevantes para entender el impacto de cada cambio:
//   • antes_7may  → baseline previo al primer rediseño (visitasLanding viejo)
//   • 7may_23may  → ventana del A/B test categoría pre vs post
//   • post_23may  → desde el rediseño propuesta-3 (CTA verde, sticky, WhatsApp, tracking granular)
const RANGOS_PRESET = [
    { key: 'antes_7may',    label: 'Pre 7-may',          desde: '2024-01-01', hasta: '2026-05-06', desc: 'Baseline previo al rediseño' },
    { key: '7may_23may',    label: '7-may → 23-may',     desde: '2026-05-07', hasta: '2026-05-23', desc: 'Ventana del A/B test cat-pre vs cat-post' },
    { key: 'post_23may',    label: '23-may en adelante', desde: '2026-05-24', hasta: null,         desc: 'Desde el rediseño propuesta-3 (verde + sticky + WA + tracking granular)' },
];

// Mapea los eventos `src:<fuente>:<evento>` al shape del funnel principal
// para poder reusar SummaryCards y FunnelVisual con datos filtrados por fuente.
const EVENT_TO_METRICA = {
    visita: 'visitasLanding',
    abrioModal: 'abrioModal',
    eligioSlot: 'eligioSlot',
    agendaron: 'agendaron',
};

function buildTotalesPorFuente(extraSteps, fuente) {
    const out = { visitasLanding: 0, abrioModal: 0, eligioSlot: 0, agendaron: 0, eligioCategoriaPost: 0, extraSteps: {} };
    Object.entries(extraSteps || {}).forEach(([k, v]) => {
        if (!k.startsWith('src:')) return;
        const parts = k.split(':');
        if (parts.length < 3) return;
        const dim = parts.slice(1, -1).join(':');
        if (dim !== fuente) return;
        const ev = parts[parts.length - 1];
        const metricaKey = EVENT_TO_METRICA[ev];
        if (metricaKey) out[metricaKey] += v || 0;
    });
    return out;
}

const LandingFunnelPage = () => {
    const [data, setData] = useState(null);
    const [modo, setModo] = useState('preset'); // 'preset' | 'rango'
    const [rangoKey, setRangoKey] = useState('post_23may');
    const [fechaDesde, setFechaDesde] = useState(() => new Date('2026-05-24T00:00:00'));
    const [fechaHasta, setFechaHasta] = useState(() => new Date());
    const [fuenteFiltro, setFuenteFiltro] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let args;
            if (modo === 'rango') {
                args = { desde: toYMD(fechaDesde), hasta: toYMD(fechaHasta) };
            } else {
                const r = RANGOS_PRESET.find(x => x.key === rangoKey) || RANGOS_PRESET[2];
                args = { desde: r.desde, hasta: r.hasta || toYMD(new Date()) };
            }
            const res = await landingStatsService.getStats(args);
            setData(res);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [modo, rangoKey, fechaDesde, fechaHasta]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalesRaw = data?.totales || {};
    const rows = data?.rows || [];
    const rangoActivo = RANGOS_PRESET.find(r => r.key === rangoKey);

    // Fuentes detectadas en extraSteps (`src:<fuente>:<evento>`)
    const fuentesDetectadas = Array.from(new Set(
        Object.keys(totalesRaw.extraSteps || {})
            .filter(k => k.startsWith('src:'))
            .map(k => {
                const parts = k.split(':');
                return parts.slice(1, -1).join(':');
            })
            .filter(Boolean)
    )).sort();

    // Si el filtro activo ya no existe en el período actual, volver a 'all'
    useEffect(() => {
        if (fuenteFiltro !== 'all' && !fuentesDetectadas.includes(fuenteFiltro)) {
            setFuenteFiltro('all');
        }
    }, [fuenteFiltro, fuentesDetectadas]);

    const totales = fuenteFiltro === 'all'
        ? totalesRaw
        : buildTotalesPorFuente(totalesRaw.extraSteps, fuenteFiltro);

    return (
        <>
            <Head>
                <title>Funnel Landing | Sorbydata</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">

                    {/* ─── Header ─── */}
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2} mb={3}>
                        <Box>
                            <Typography variant="h4">📊 Funnel — Landing → Agenda</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Conversión diaria del embudo de agendamiento · Nuevo tracking desde may 2026
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={modo}
                                onChange={(_, v) => { if (v) setModo(v); }}
                            >
                                <ToggleButton value="preset">Por etapa</ToggleButton>
                                <ToggleButton value="rango">Rango exacto</ToggleButton>
                            </ToggleButtonGroup>
                            {modo === 'preset' ? (
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={rangoKey}
                                    onChange={(_, v) => { if (v) setRangoKey(v); }}
                                >
                                    {RANGOS_PRESET.map(r => (
                                        <Tooltip key={r.key} title={r.desc} placement="top" arrow>
                                            <ToggleButton value={r.key}>{r.label}</ToggleButton>
                                        </Tooltip>
                                    ))}
                                </ToggleButtonGroup>
                            ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Desde"
                                        value={fechaDesde}
                                        onChange={setFechaDesde}
                                        maxDate={fechaHasta}
                                        format="dd/MM/yyyy"
                                        slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                    />
                                    <DatePicker
                                        label="Hasta"
                                        value={fechaHasta}
                                        onChange={setFechaHasta}
                                        minDate={fechaDesde}
                                        maxDate={new Date()}
                                        format="dd/MM/yyyy"
                                        slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                    />
                                </Stack>
                            )}
                            {fuentesDetectadas.length > 0 && (
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={fuenteFiltro}
                                    onChange={(_, v) => { if (v) setFuenteFiltro(v); }}
                                >
                                    <Tooltip title="Sin filtro de fuente" placement="top" arrow>
                                        <ToggleButton value="all">Todas las fuentes</ToggleButton>
                                    </Tooltip>
                                    {fuentesDetectadas.map(f => (
                                        <Tooltip key={f} title={`Filtrar por fuente: ${f}`} placement="top" arrow>
                                            <ToggleButton value={f} sx={{ fontFamily: 'monospace', textTransform: 'none' }}>{f}</ToggleButton>
                                        </Tooltip>
                                    ))}
                                </ToggleButtonGroup>
                            )}
                            <Tooltip title="Refrescar datos">
                                <span>
                                    <IconButton onClick={fetchData} disabled={loading}>
                                        <RefreshIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {loading && !data && (
                        <Box display="flex" justifyContent="center" py={10}>
                            <CircularProgress />
                        </Box>
                    )}

                    {data && (
                        <Stack spacing={3}>

                            {modo === 'preset' && rangoActivo && (
                                <Alert severity="info" sx={{ mb: -1 }}>
                                    <strong>{rangoActivo.label}</strong> ({rangoActivo.desde} → {rangoActivo.hasta || 'hoy'}) — {rangoActivo.desc}
                                </Alert>
                            )}

                            {fuenteFiltro !== 'all' && (
                                <Alert severity="warning" sx={{ mb: -1 }} onClose={() => setFuenteFiltro('all')}>
                                    Filtrando funnel principal por fuente <strong>{fuenteFiltro}</strong>. La tendencia diaria, embudo granular y tabla por día siguen mostrando el total — la fuente no está desagregada en esas vistas.
                                </Alert>
                            )}

                            <SummaryCards totales={totales} />

                            {/* ─── Funnel + Chart ─── */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={5}>
                                    <FunnelVisual totales={totales} />
                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <TendenciaChart rows={rows} />
                                </Grid>
                            </Grid>

                            <EmbudoGranular totales={totales} />

                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="src"
                                title="🎯 Atribución por fuente"
                                dimLabel="fuente"
                            />
                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="camp"
                                title="📣 Atribución por campaña"
                                dimLabel="campaña"
                            />

                            <TablaDaily rows={rows} />

                        </Stack>
                    )}

                    {/* Estado vacío después de cargar */}
                    {!loading && data && rows.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            {modo === 'rango'
                                ? `No hay datos registrados entre ${toYMD(fechaDesde)} y ${toYMD(fechaHasta)}.`
                                : `No hay datos registrados en el rango "${rangoActivo?.label || rangoKey}".`}
                            {' '}Los contadores se empezarán a llenar cuando haya actividad en la landing.
                        </Alert>
                    )}

                </Container>
            </Box>
        </>
    );
};

LandingFunnelPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default LandingFunnelPage;
