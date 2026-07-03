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
    Button,
    Collapse,
    IconButton,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    FileDownloadOutlined as DownloadIcon,
    HistoryToggleOff as HistoryIcon,
} from '@mui/icons-material';
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

// Fecha de corte: el flujo nuevo (landing → WhatsApp → agente) arranca el 1-jun-2026.
// Antes de esta fecha la data corresponde al flujo viejo (modal web), que se muestra
// sólo en la tabla histórica oculta.
const CORTE_FLUJO_NUEVO = '2026-06-01';

// Go-live de la instrumentación de los pasos del flujo de WhatsApp (fue_whatsapp,
// eligio_tipo_empresa, califico, dejo_email). LandingStats guarda por día, así que
// el 2026-06-01 quedó parcial/sucio (Visitas todo el día, pasos nuevos solo
// post-deploy). El preset arranca el primer día COMPLETO ya instrumentado para
// no distorsionar las conversiones.
const INICIO_FUNNEL_WA = '2026-06-02';

// ─── Config: embudo nuevo (landing → WhatsApp) ───────────
// Cada paso lee su valor de `metricaVal()` (ver abajo), que mapea la métrica al
// campo correcto del payload de /api/agendar/stats. Algunos pasos intermedios del
// flujo de WhatsApp todavía NO están instrumentados en el backend: leen claves de
// `extraSteps` que hoy no se emiten y aparecen en "—" hasta que se cuenten.
const METRICAS = [
    { key: 'visita',            label: 'Visitas',          emoji: '👁️', color: '#6366f1', desc: 'Llegaron a la landing',                 instrumentado: true },
    { key: 'fueWhatsapp',       label: 'Click agendar',    emoji: '💬', color: '#25d366', desc: 'Click en "Agendar" → abrió WhatsApp',    instrumentado: true },
    { key: 'nuevoContacto',     label: 'Nuevo Contacto',   emoji: '📲', color: '#22c55e', desc: 'Llegó el mensaje de WhatsApp',           instrumentado: true },
    { key: 'eligioTipoEmpresa', label: 'Respondió rubro',  emoji: '🏷️', color: '#0ea5e9', desc: 'Respondió el tipo de empresa en WA',     instrumentado: true },
    { key: 'califico',          label: 'Respondió obras',  emoji: '🏗️', color: '#f59e0b', desc: 'Respondió obras/sucursales (Lead)',      instrumentado: true },
    { key: 'agendo',            label: 'Agendó',           emoji: '✅', color: '#10b981', desc: 'Confirmó la reunión (Schedule)',         instrumentado: true },
    { key: 'dejoEmail',         label: 'Dejó email',       emoji: '📧', color: '#8b5cf6', desc: 'Dejó el email post-agenda',              instrumentado: true },
];

// Etapas comerciales que NO viven en los contadores diarios de LandingStats sino
// en el CRM (ContactoSDR/ReunionSDR). Se anexan al final del embudo, alimentadas
// por /api/funnel/landing-outcomes (vista por cohorte, no por día). Cada una
// declara `baseKey`: el paso contra el que se calcula su conversión (el CRM tiene
// su propio "agendó" = agendoCrm, distinto del contador diario `agendo`).
const METRICAS_OUTCOME = [
    { key: 'reunionExitosa', label: 'Reunión exitosa', emoji: '🤝', color: '#14b8a6', desc: 'Reunión realizada (CRM)', baseKey: 'agendoCrm', crm: true },
    { key: 'ganado',         label: 'Ganado',          emoji: '🏆', color: '#eab308', desc: 'Cliente ganado (CRM)',   baseKey: 'reunionExitosa', crm: true },
];

// Embudo completo = pasos del landing (contadores diarios) + outcomes del CRM.
const METRICAS_FUNNEL = [...METRICAS, ...METRICAS_OUTCOME];

// Métricas del flujo VIEJO (modal web) — sólo para la tabla histórica pre 1-jun.
const METRICAS_HIST = [
    { key: 'visitasLanding', label: 'Visitas',        emoji: '👁️', color: '#6366f1' },
    { key: 'abrioModal',     label: 'Abrió modal',    emoji: '📆', color: '#0ea5e9' },
    { key: 'eligioSlot',     label: 'Eligió horario', emoji: '🕐', color: '#f59e0b' },
    { key: 'agendaron',      label: 'Agendaron',      emoji: '✅', color: '#10b981' },
];

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

/**
 * Valor de una métrica del embudo nuevo. `src` puede ser `totales` o una fila
 * diaria — ambos tienen campos planos + `extraSteps` como objeto. Centraliza el
 * mapeo métrica → campo del backend para que los componentes no lo repitan.
 */
function metricaVal(src, key) {
    if (!src) return 0;
    const ex = src.extraSteps || {};
    switch (key) {
        case 'visita':            return Number(src.visitasLanding ?? src.visita ?? 0);
        case 'fueWhatsapp':       return Number(ex.fue_whatsapp ?? ex.lead_whatsapp ?? 0);
        case 'nuevoContacto':     return Number(ex.nuevo_contacto ?? 0);
        case 'eligioTipoEmpresa': return Number(ex.eligio_tipo_empresa ?? 0);
        case 'califico':          return Number(ex.califico ?? 0);
        case 'agendo':            return Number(src.agendaron ?? ex.agendo ?? 0);
        case 'dejoEmail':         return Number(ex.dejo_email ?? 0);
        // Outcomes del CRM (inyectados como campos planos en `totales`).
        case 'agendoCrm':         return Number(src.agendoCrm ?? 0);
        case 'reunionExitosa':    return Number(src.reunionExitosa ?? 0);
        case 'ganado':            return Number(src.ganado ?? 0);
        default:                  return Number(src[key] ?? 0);
    }
}

/**
 * Conversión de un paso `i` dentro de una lista de métricas. Por defecto se
 * calcula contra el paso anterior; si la métrica declara `baseKey`, se usa ese
 * campo como denominador (las etapas del CRM no son secuenciales respecto al
 * email, sino que cuelgan del "agendó" del CRM).
 */
function conversionEnLista(src, metricas, i) {
    const m = metricas[i];
    const val = metricaVal(src, m.key);
    if (m.baseKey) {
        const base = metricaVal(src, m.baseKey);
        return base > 0 ? pct(val, base) : null;
    }
    const prev = i > 0 ? metricas[i - 1] : null;
    return prev ? pct(val, metricaVal(src, prev.key)) : null;
}

// ─── Tarjetas de resumen ──────────────────────────────────

function SummaryCards({ totales, metricas = METRICAS }) {
    return (
        <Grid container spacing={2}>
            {metricas.map((m, i) => {
                const val = metricaVal(totales, m.key);
                const conversion = conversionEnLista(totales, metricas, i);

                return (
                    <Grid item xs={12} sm={6} md={2} key={m.key}>
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
                                            label={conversion}
                                            sx={{ bgcolor: `${m.color}18`, color: m.color, fontWeight: 600, fontSize: 11 }}
                                        />
                                    )}
                                </Stack>
                                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                                    {m.emoji} {m.label}
                                </Typography>
                                {!m.instrumentado && !m.crm && (
                                    <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                                        ⚠️ Pendiente de instrumentar
                                    </Typography>
                                )}
                                {m.crm && (
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                        📋 Cohorte CRM
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

function FunnelVisual({ totales, metricas = METRICAS }) {
    const metricaBase = metricas.find(m => metricaVal(totales, m.key) > 0);
    const baseVal = metricaBase ? (metricaVal(totales, metricaBase.key) || 1) : 1;

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                title="🔽 Embudo de conversión"
                subheader="Landing → WhatsApp → agenda → reunión → cierre · 🤝🏆 = cohorte CRM"
            />
            <CardContent>
                <Stack spacing={2}>
                    {metricas.map((m, i) => {
                        const val = metricaVal(totales, m.key);
                        const stepPct = conversionEnLista(totales, metricas, i);
                        const barPct = baseVal > 0 ? Math.max((val / baseVal) * 100, val > 0 ? 3 : 0) : 0;

                        return (
                            <Box key={m.key}>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                    <Typography variant="body2" sx={{ minWidth: 130, fontWeight: 500 }}>
                                        {m.emoji} {m.label}
                                    </Typography>
                                    <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden', height: 32 }}>
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
                                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}>
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
                                {i < metricas.length - 1 && (
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', pl: '146px', lineHeight: 1.2 }}>
                                        ↓
                                    </Typography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </CardContent>
        </Card>
    );
}

// ─── Gráfico de tendencia ─────────────────────────────────

function TendenciaChart({ rows }) {
    const safeRows = (rows || []).filter(r => r && r.fecha);

    if (safeRows.length === 0) {
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

    // Sólo graficamos métricas con algún dato — evita series planas en cero.
    const seriesVisibles = METRICAS.filter(m => safeRows.some(r => metricaVal(r, m.key) > 0));
    const series = seriesVisibles.map(m => ({
        name: `${m.emoji} ${m.label}`,
        data: safeRows.map(r => metricaVal(r, m.key)),
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
        xaxis: { categories: categorias, labels: { style: { fontSize: '11px' } } },
        yaxis: { labels: { style: { fontSize: '11px' }, formatter: (v) => (v == null ? '' : String(v)) }, min: 0 },
        plotOptions: { bar: { columnWidth: '75%', borderRadius: 3, borderRadiusApplication: 'end' } },
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
                {seriesVisibles.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                        <Typography variant="body2" color="text.secondary">
                            Sin métricas con datos todavía
                        </Typography>
                    </Box>
                ) : (
                    <Chart type="bar" series={series} options={options} height={280} />
                )}
            </CardContent>
        </Card>
    );
}

// ─── Atribución por fuente / campaña de Meta ─────────────────
// Parsea las claves `src:<source>:<event>` y `camp:<campaign>:<event>` de
// extraSteps, mapeando los eventos crudos a los pasos del embudo nuevo. Permite
// ver el funnel completo por campaña de Meta.
const RAW_EVENT_A_PASO = {
    visita: 'visita',
    fue_whatsapp: 'fueWhatsapp',
    lead_whatsapp: 'fueWhatsapp',
    nuevo_contacto: 'nuevoContacto',
    eligio_tipo_empresa: 'eligioTipoEmpresa',
    califico: 'califico',
    agendaron: 'agendo',
    agendo: 'agendo',
    dejo_email: 'dejoEmail',
};

function parseAttributionBreakdown(extraSteps, prefix /* 'src' | 'camp' */) {
    const buckets = {}; // { dim: { paso: count } }
    Object.entries(extraSteps || {}).forEach(([k, v]) => {
        if (!k.startsWith(prefix + ':')) return;
        const parts = k.split(':');
        if (parts.length < 3) return;
        const dim = parts.slice(1, -1).join(':'); // permite ':' dentro del nombre
        const evRaw = parts[parts.length - 1];
        const paso = RAW_EVENT_A_PASO[evRaw];
        if (!paso) return; // ignora eventos del flujo viejo (abrioModal, eligioSlot…)
        if (!buckets[dim]) buckets[dim] = {};
        buckets[dim][paso] = (buckets[dim][paso] || 0) + (v || 0);
    });
    return buckets;
}

function AtribucionTabla({ extraSteps, prefix, title, dimLabel, dimLabels }) {
    const buckets = parseAttributionBreakdown(extraSteps, prefix);
    const rows = Object.entries(buckets)
        .map(([dim, pasos]) => ({ dim, ...pasos }))
        .sort((a, b) => (b.visita || b.fueWhatsapp || 0) - (a.visita || a.fueWhatsapp || 0));

    if (rows.length === 0) {
        return (
            <Card sx={{ borderLeft: '4px solid #8b5cf6' }}>
                <CardHeader title={title} subheader="Sin datos todavía — aparecerán cuando lleguen visitas con UTM/campaña" />
            </Card>
        );
    }

    return (
        <Card sx={{ borderLeft: '4px solid #8b5cf6' }}>
            <CardHeader
                title={title}
                subheader={`${rows.length} ${dimLabel}${rows.length > 1 ? 's' : ''} detectada${rows.length > 1 ? 's' : ''} — embudo por dimensión · vis = % sobre visitas · ant = % sobre paso anterior`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>{dimLabel.charAt(0).toUpperCase() + dimLabel.slice(1)}</strong></TableCell>
                                {METRICAS.map(m => (
                                    <TableCell key={m.key} align="right"><strong>{m.emoji} {m.label}</strong></TableCell>
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
                                const cr = r.visita > 0 ? pct(r.agendo || 0, r.visita) : '—';
                                return (
                                    <TableRow key={r.dim} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: dimLabels?.[r.dim] ? 'inherit' : 'monospace', fontWeight: 600 }}>{dimLabels?.[r.dim] || r.dim}</Typography>
                                        </TableCell>
                                        {METRICAS.map((m, i) => {
                                            const val = r[m.key] || 0;
                                            const base = r.visita || 0;
                                            // Paso anterior del embudo (según el orden de METRICAS)
                                            const prevVal = i > 0 ? (r[METRICAS[i - 1].key] || 0) : 0;
                                            const mostrar = m.key !== 'visita' && val > 0;
                                            return (
                                                <TableCell key={m.key} align="right">
                                                    <Typography variant="body2" sx={{ color: val > 0 ? m.color : 'text.disabled', fontWeight: val > 0 ? 700 : 400 }}>
                                                        {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                                    </Typography>
                                                    {mostrar && base > 0 && (
                                                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.15, color: 'text.secondary' }}>
                                                            vis {pct(val, base)}
                                                        </Typography>
                                                    )}
                                                    {mostrar && prevVal > 0 && (
                                                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.15, color: 'text.disabled' }}>
                                                            ant {pct(val, prevVal)}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
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

// ─── Resultados comerciales por rubro (cohorte CRM) ───────
// Diferencia la cohorte del landing por el rubro que el lead respondió en
// WhatsApp ("Sin rubro" = nunca lo respondió). Las columnas Agendó / Reunión /
// Ganado salen del CRM (no de los contadores diarios), por eso es una vista por
// cohorte: un lead del período cuenta acá aunque haya ganado más tarde.

function RubroOutcomesTabla({ outcomes }) {
    const porRubro = outcomes?.porRubro || [];

    if (porRubro.length === 0) {
        return (
            <Card sx={{ borderLeft: '4px solid #14b8a6' }}>
                <CardHeader
                    title="🏷️ Resultados por rubro (cohorte CRM)"
                    subheader="Sin contactos en el período — aparecerán cuando lleguen leads con rubro asignado"
                />
            </Card>
        );
    }

    const totalContactos = porRubro.reduce((a, r) => a + (r.contactos || 0), 0);

    return (
        <Card sx={{ borderLeft: '4px solid #14b8a6' }}>
            <CardHeader
                title="🏷️ Resultados por rubro (cohorte CRM)"
                subheader={`${porRubro.length} rubro${porRubro.length > 1 ? 's' : ''} · agendó / reunión / ganado por cohorte de leads del período · % sobre el paso anterior`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>🏷️ Rubro</strong></TableCell>
                                <TableCell align="right"><strong>👤 Contactos</strong></TableCell>
                                <TableCell align="right"><strong>✅ Agendó</strong></TableCell>
                                <TableCell align="right"><strong>🤝 Reunión exitosa</strong></TableCell>
                                <TableCell align="right"><strong>🏆 Ganado</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {porRubro.map(r => {
                                const sinRubro = r.rubro === 'Sin rubro';
                                const celdaOutcome = (val, base, color) => (
                                    <TableCell align="right">
                                        <Typography variant="body2" sx={{ color: val > 0 ? color : 'text.disabled', fontWeight: val > 0 ? 700 : 400 }}>
                                            {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                        </Typography>
                                        {val > 0 && base > 0 && (
                                            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.15, color: 'text.secondary' }}>
                                                {pct(val, base)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                );
                                return (
                                    <TableRow key={r.rubro} sx={{ '&:hover': { bgcolor: 'action.hover' }, opacity: sinRubro ? 0.7 : 1 }}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, fontStyle: sinRubro ? 'italic' : 'normal' }}>
                                                {r.rubro}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                {(r.contactos || 0).toLocaleString('es-AR')}
                                            </Typography>
                                        </TableCell>
                                        {celdaOutcome(r.agendo || 0, r.contactos || 0, '#10b981')}
                                        {celdaOutcome(r.reunionExitosa || 0, r.agendo || 0, '#14b8a6')}
                                        {celdaOutcome(r.ganado || 0, r.reunionExitosa || 0, '#eab308')}
                                    </TableRow>
                                );
                            })}
                            {porRubro.length > 1 && (
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell><strong>Total</strong></TableCell>
                                    <TableCell align="right"><strong>{totalContactos.toLocaleString('es-AR')}</strong></TableCell>
                                    <TableCell align="right"><strong>{(outcomes?.totales?.agendo || 0).toLocaleString('es-AR')}</strong></TableCell>
                                    <TableCell align="right"><strong>{(outcomes?.totales?.reunionExitosa || 0).toLocaleString('es-AR')}</strong></TableCell>
                                    <TableCell align="right"><strong>{(outcomes?.totales?.ganado || 0).toLocaleString('es-AR')}</strong></TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
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
    // Sólo columnas con algún dato, para no saturar con métricas vacías.
    const metricasVisibles = METRICAS.filter(m => rows.some(r => metricaVal(r, m.key) > 0));
    const cols = metricasVisibles.length > 0 ? metricasVisibles : METRICAS;

    return (
        <Card>
            <CardHeader
                title="📅 Datos por día"
                subheader={`${filas.length} días con actividad · CR entre eventos consecutivos`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Fecha</strong></TableCell>
                                {cols.map((m, i) => {
                                    const prev = i > 0 ? cols[i - 1] : null;
                                    return (
                                        <Fragment key={`h-${m.key}`}>
                                            {prev && (
                                                <TableCell align="center" sx={{ bgcolor: 'action.hover' }}>
                                                    <Tooltip title={`Conversión ${prev.label} → ${m.label}`} placement="top" arrow>
                                                        <strong style={{ cursor: 'help', fontSize: 11 }}>
                                                            CR {prev.emoji}→{m.emoji}
                                                        </strong>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                            <TableCell align="center"><strong>{m.emoji} {m.label}</strong></TableCell>
                                        </Fragment>
                                    );
                                })}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filas.map(r => (
                                <TableRow key={r.fecha} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                                            {r.fecha}
                                        </Typography>
                                    </TableCell>
                                    {cols.map((m, i) => {
                                        const prev = i > 0 ? cols[i - 1] : null;
                                        const val = metricaVal(r, m.key);
                                        const cr = prev ? pct(val, metricaVal(r, prev.key)) : null;
                                        return (
                                            <Fragment key={`${r.fecha}-${m.key}`}>
                                                {prev && (
                                                    <TableCell align="center" sx={{ bgcolor: 'action.hover' }}>
                                                        <Typography variant="caption" sx={{ color: cr && cr !== '—' ? m.color : 'text.disabled', fontWeight: cr && cr !== '—' ? 600 : 400 }}>
                                                            {cr}
                                                        </Typography>
                                                    </TableCell>
                                                )}
                                                <TableCell align="center">
                                                    <Typography variant="body2" sx={{ color: val > 0 ? m.color : 'text.disabled', fontWeight: val > 0 ? 700 : 400 }}>
                                                        {val > 0 ? val.toLocaleString('es-AR') : '—'}
                                                    </Typography>
                                                </TableCell>
                                            </Fragment>
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
}

// ─── Tabla histórica semanal (flujo viejo, pre 1-jun) ─────
// Oculta por defecto. Agrupa por semana (lun-dom) las filas diarias previas al
// corte y muestra las métricas del modal viejo. Trae su propio rango.

function startOfWeek(ymd) {
    const d = new Date(`${ymd}T00:00:00`);
    const day = (d.getDay() + 6) % 7; // 0 = lunes
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function agruparPorSemana(rows) {
    const map = new Map();
    for (const r of rows || []) {
        if (!r.fecha || r.fecha >= CORTE_FLUJO_NUEVO) continue; // sólo pre-corte
        const inicio = startOfWeek(r.fecha);
        const key = toYMD(inicio);
        if (!map.has(key)) {
            const fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
            map.set(key, {
                key,
                label: `${formatFechaDia(toYMD(inicio))}–${formatFechaDia(toYMD(fin))}`,
                ...Object.fromEntries(METRICAS_HIST.map(m => [m.key, 0])),
            });
        }
        const acc = map.get(key);
        for (const m of METRICAS_HIST) acc[m.key] += Number(r[m.key] || 0);
    }
    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

function HistoricoSemanal() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        if (rows) return; // cache: una sola vez
        setLoading(true);
        setError(null);
        try {
            // Todo lo previo al corte del flujo nuevo.
            const res = await landingStatsService.getStats({ desde: '2024-01-01', hasta: '2026-05-31' });
            setRows(res?.rows || []);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Error al cargar histórico');
        } finally {
            setLoading(false);
        }
    }, [rows]);

    const semanas = agruparPorSemana(rows || []);

    return (
        <Card variant="outlined" sx={{ borderStyle: 'dashed' }}>
            <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                    <Box>
                        <Typography variant="subtitle2">🗄️ Funnel histórico por semana (flujo viejo, pre {formatFechaDia(CORTE_FLUJO_NUEVO)}/06)</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Datos del modal web previo al flujo de WhatsApp. Oculto por defecto.
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => { const next = !open; setOpen(next); if (next) cargar(); }}
                    >
                        {open ? 'Ocultar' : 'Ver histórico'}
                    </Button>
                </Stack>

                <Collapse in={open} sx={{ mt: open ? 2 : 0 }}>
                    {loading && (
                        <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
                    )}
                    {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
                    {!loading && !error && rows && semanas.length === 0 && (
                        <Alert severity="info" sx={{ my: 1 }}>No hay datos previos al corte.</Alert>
                    )}
                    {!loading && semanas.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>Semana</strong></TableCell>
                                        {METRICAS_HIST.map(m => (
                                            <TableCell key={m.key} align="center"><strong>{m.emoji} {m.label}</strong></TableCell>
                                        ))}
                                        <TableCell align="center">
                                            <Tooltip title="Agendaron / Abrió modal" placement="top" arrow>
                                                <strong style={{ cursor: 'help' }}>Modal→Agenda</strong>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {semanas.map(s => (
                                        <TableRow key={s.key} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{s.label}</Typography>
                                            </TableCell>
                                            {METRICAS_HIST.map(m => (
                                                <TableCell key={m.key} align="center">
                                                    <Typography variant="body2" sx={{ color: s[m.key] > 0 ? m.color : 'text.disabled', fontWeight: s[m.key] > 0 ? 700 : 400 }}>
                                                        {s[m.key] > 0 ? s[m.key].toLocaleString('es-AR') : '—'}
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                            <TableCell align="center">
                                                <Typography variant="caption" color="text.secondary">
                                                    {pct(s.agendaron || 0, s.abrioModal || 0)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Collapse>
            </CardContent>
        </Card>
    );
}

// ─── Export CSV ───────────────────────────────────────────

function exportarCSV(rows) {
    const headers = ['fecha', ...METRICAS.map(m => m.label)];
    const escapar = (v) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [...rows]
        .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
        .map(r => [r.fecha, ...METRICAS.map(m => metricaVal(r, m.key))].map(escapar).join(','));
    const csv = [headers.map(escapar).join(','), ...lineas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funnel-landing-${toYMD(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Rangos preset ────────────────────────────────────────
const RANGOS_PRESET = [
    { key: 'flujo_wa', label: 'Flujo WhatsApp (2-jun →)', desde: INICIO_FUNNEL_WA, hasta: null, desc: 'Embudo nuevo instrumentado: landing → WhatsApp → agenda (desde el primer día completo)' },
    { key: 'todo',     label: 'Todo el histórico',         desde: '2024-01-01',      hasta: null, desc: 'Incluye datos previos al flujo nuevo' },
];

// Filtra el funnel por fuente/campaña usando los eventos `src:`/`camp:` de
// extraSteps, mapeando los eventos crudos a la forma de `totales`.
function buildTotalesFiltrados(extraSteps, { fuentes, campañas }) {
    const out = { visitasLanding: 0, agendaron: 0, extraSteps: {} };
    const setExtra = (k, v) => { out.extraSteps[k] = (out.extraSteps[k] || 0) + v; };
    const sumarPorPrefijo = (prefix, valores) => {
        const set = new Set(valores);
        Object.entries(extraSteps || {}).forEach(([k, v]) => {
            if (!k.startsWith(prefix + ':')) return;
            const parts = k.split(':');
            if (parts.length < 3) return;
            const dim = parts.slice(1, -1).join(':');
            if (!set.has(dim)) return;
            const paso = RAW_EVENT_A_PASO[parts[parts.length - 1]];
            const n = v || 0;
            // Volcamos a la forma que entiende metricaVal().
            if (paso === 'visita') out.visitasLanding += n;
            else if (paso === 'agendo') out.agendaron += n;
            else if (paso === 'fueWhatsapp') setExtra('fue_whatsapp', n);
            else if (paso === 'nuevoContacto') setExtra('nuevo_contacto', n);
            else if (paso === 'eligioTipoEmpresa') setExtra('eligio_tipo_empresa', n);
            else if (paso === 'califico') setExtra('califico', n);
            else if (paso === 'dejoEmail') setExtra('dejo_email', n);
        });
    };
    // Sólo un eje a la vez (no hay datos cruzados src×camp en extraSteps).
    if (fuentes && fuentes.length > 0) sumarPorPrefijo('src', fuentes);
    else if (campañas && campañas.length > 0) sumarPorPrefijo('camp', campañas);
    // Mantenemos el extraSteps original para que la atribución siga mostrándose.
    out.extraSteps = { ...(extraSteps || {}), ...out.extraSteps };
    return out;
}

const LandingFunnelPage = () => {
    const [data, setData] = useState(null);
    const [outcomes, setOutcomes] = useState(null); // resultados comerciales (CRM)
    const [modo, setModo] = useState('preset'); // 'preset' | 'rango'
    const [rangoKey, setRangoKey] = useState('flujo_wa');
    const [fechaDesde, setFechaDesde] = useState(() => new Date(`${INICIO_FUNNEL_WA}T00:00:00`));
    const [fechaHasta, setFechaHasta] = useState(() => new Date());
    const [fuentesFiltro, setFuentesFiltro] = useState([]); // [] = todas
    const [campañasFiltro, setCampañasFiltro] = useState([]); // [] = todas
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
                const r = RANGOS_PRESET.find(x => x.key === rangoKey) || RANGOS_PRESET[0];
                args = { desde: r.desde, hasta: r.hasta || toYMD(new Date()) };
            }
            if (args.desde && args.hasta && args.desde > args.hasta) {
                setData({ totales: {}, rows: [], _futuro: true, _desde: args.desde });
                setOutcomes(null);
                return;
            }
            const res = await landingStatsService.getStats(args);
            setData(res);

            // Resultados comerciales del CRM (reunión exitosa + ganados) para el
            // mismo rango. Best-effort: si falla, el embudo de visitas igual se
            // muestra (las etapas del CRM quedan en "—").
            try {
                const out = await landingStatsService.getLandingOutcomes({ desde: args.desde, hasta: args.hasta });
                setOutcomes(out);
            } catch (_) {
                setOutcomes(null);
            }
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

    const detectarDimensiones = (prefix) => Array.from(new Set(
        Object.keys(totalesRaw.extraSteps || {})
            .filter(k => k.startsWith(prefix + ':'))
            .map(k => { const parts = k.split(':'); return parts.slice(1, -1).join(':'); })
            .filter(Boolean)
    )).sort();
    const fuentesDetectadas = detectarDimensiones('src');
    const campañasDetectadas = detectarDimensiones('camp');

    useEffect(() => {
        const f = fuentesFiltro.filter(x => fuentesDetectadas.includes(x));
        if (f.length !== fuentesFiltro.length) setFuentesFiltro(f);
        const c = campañasFiltro.filter(x => campañasDetectadas.includes(x));
        if (c.length !== campañasFiltro.length) setCampañasFiltro(c);
    }, [fuentesFiltro, campañasFiltro, fuentesDetectadas, campañasDetectadas]);

    const hayFiltro = fuentesFiltro.length > 0 || campañasFiltro.length > 0;
    const totales = hayFiltro
        ? buildTotalesFiltrados(totalesRaw.extraSteps, { fuentes: fuentesFiltro, campañas: campañasFiltro })
        : totalesRaw;

    // Inyecta las etapas del CRM (cohorte global del período) como campos planos
    // para que SummaryCards/FunnelVisual las muestren al final del embudo. Son
    // globales: no se reparten por fuente/campaña (el CRM no guarda esa dimensión).
    const totalesConOutcomes = {
        ...totales,
        agendoCrm: outcomes?.totales?.agendo ?? 0,
        reunionExitosa: outcomes?.totales?.reunionExitosa ?? 0,
        ganado: outcomes?.totales?.ganado ?? 0,
    };
    const metricasFunnel = outcomes ? METRICAS_FUNNEL : METRICAS;

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
                            <Typography variant="h4">📊 Funnel — Landing → WhatsApp → Agenda</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Embudo del flujo nuevo (agente de WhatsApp) · desde jun 2026
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_, v) => { if (v) setModo(v); }}>
                                <ToggleButton value="preset">Por etapa</ToggleButton>
                                <ToggleButton value="rango">Rango exacto</ToggleButton>
                            </ToggleButtonGroup>
                            {modo === 'preset' ? (
                                <ToggleButtonGroup size="small" exclusive value={rangoKey} onChange={(_, v) => { if (v) setRangoKey(v); }}>
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
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>src:</Typography>
                                    <ToggleButtonGroup
                                        size="small"
                                        value={fuentesFiltro}
                                        onChange={(_, v) => { setFuentesFiltro(v || []); if (v && v.length) setCampañasFiltro([]); }}
                                    >
                                        {fuentesDetectadas.map(f => (
                                            <Tooltip key={f} title={`Incluir fuente: ${f}`} placement="top" arrow>
                                                <ToggleButton value={f} sx={{ fontFamily: 'monospace', textTransform: 'none' }}>{f}</ToggleButton>
                                            </Tooltip>
                                        ))}
                                    </ToggleButtonGroup>
                                </Stack>
                            )}
                            {campañasDetectadas.length > 0 && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>camp:</Typography>
                                    <ToggleButtonGroup
                                        size="small"
                                        value={campañasFiltro}
                                        onChange={(_, v) => { setCampañasFiltro(v || []); if (v && v.length) setFuentesFiltro([]); }}
                                    >
                                        {campañasDetectadas.map(c => (
                                            <Tooltip key={c} title={`Incluir campaña: ${c}`} placement="top" arrow>
                                                <ToggleButton value={c} sx={{ fontFamily: 'monospace', textTransform: 'none' }}>{c}</ToggleButton>
                                            </Tooltip>
                                        ))}
                                    </ToggleButtonGroup>
                                </Stack>
                            )}
                            <Tooltip title="Exportar la data del período a CSV">
                                <span>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        onClick={() => exportarCSV(rows)}
                                        disabled={loading || rows.length === 0}
                                    >
                                        Exportar
                                    </Button>
                                </span>
                            </Tooltip>
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

                            {data?._futuro && (
                                <Alert severity="info" sx={{ mb: -1 }}>
                                    Este período arranca el <strong>{data._desde}</strong> y todavía no comenzó — no hay datos para mostrar.
                                </Alert>
                            )}

                            {METRICAS.some(m => !m.instrumentado) && (
                                <Alert severity="warning" sx={{ mb: -1 }}>
                                    Los pasos del flujo de WhatsApp marcados con ⚠️ (Fue a WhatsApp, Eligió rubro, Calificó, Dejó email)
                                    todavía <strong>no están instrumentados en el backend</strong>, por eso aparecen en "—". El dashboard
                                    ya los lee de <code>extraSteps</code>: se llenan apenas se empiecen a contar esos eventos.
                                </Alert>
                            )}

                            {hayFiltro && (() => {
                                const esCamp = campañasFiltro.length > 0;
                                const seleccionadas = esCamp ? campañasFiltro : fuentesFiltro;
                                const label = esCamp
                                    ? (seleccionadas.length === 1 ? 'campaña' : 'campañas')
                                    : (seleccionadas.length === 1 ? 'fuente' : 'fuentes');
                                return (
                                    <Alert
                                        severity="warning"
                                        sx={{ mb: -1 }}
                                        onClose={() => { setFuentesFiltro([]); setCampañasFiltro([]); }}
                                    >
                                        Filtrando funnel principal por {label} <strong>{seleccionadas.join(', ')}</strong>. La tendencia diaria y la tabla por día siguen mostrando el total — la dimensión no está desagregada en esas vistas.
                                    </Alert>
                                );
                            })()}

                            <SummaryCards totales={totalesConOutcomes} metricas={metricasFunnel} />

                            {/* ─── Funnel + Chart ─── */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={5}>
                                    <FunnelVisual totales={totalesConOutcomes} metricas={metricasFunnel} />
                                </Grid>
                                <Grid item xs={12} md={7}>
                                    <TendenciaChart rows={rows} />
                                </Grid>
                            </Grid>

                            <RubroOutcomesTabla outcomes={outcomes} />

                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="lp"
                                title="🧪 A/B de la landing (variante del hero)"
                                dimLabel="variante"
                            />
                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="flow"
                                title="🔀 A/B de flujo (WhatsApp vs Web directa)"
                                dimLabel="flujo"
                                dimLabels={{
                                    wa: 'WhatsApp',
                                    web: 'Web directa',
                                    wa_sin_atribuir: '⚠️ WhatsApp sin atribuir',
                                }}
                            />
                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="src"
                                title="🎯 Atribución por fuente"
                                dimLabel="fuente"
                            />
                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="camp"
                                title="📣 Atribución por campaña de Meta"
                                dimLabel="campaña"
                            />
                            <AtribucionTabla
                                extraSteps={totales.extraSteps}
                                prefix="content"
                                title="🖼️ Atribución por anuncio"
                                dimLabel="anuncio"
                            />

                            <TablaDaily rows={rows} />

                            <HistoricoSemanal />

                        </Stack>
                    )}

                    {!loading && data && rows.length === 0 && !data._futuro && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            {modo === 'rango'
                                ? `No hay datos registrados entre ${toYMD(fechaDesde)} y ${toYMD(fechaHasta)}.`
                                : `No hay datos registrados en el rango "${rangoActivo?.label || rangoKey}".`}
                            {' '}Los contadores se empiezan a llenar cuando haya actividad en la landing.
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
