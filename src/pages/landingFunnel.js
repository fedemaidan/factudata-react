import { useState, useEffect, useCallback } from 'react';
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
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import landingStatsService from 'src/services/landingStatsService';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ─── Config ──────────────────────────────────────────────

const METRICAS = [
    { key: 'visitasLanding', label: 'Visitas', emoji: '👁️', color: '#6366f1', desc: 'Llegaron a la landing' },
    { key: 'abrioModal',    label: 'Abrió modal',     emoji: '📆', color: '#0ea5e9', desc: 'Hicieron clic en "Agendar"' },
    { key: 'eligioSlot',    label: 'Eligió horario',  emoji: '🕐', color: '#f59e0b', desc: 'Seleccionaron un slot' },
    { key: 'agendaron',     label: 'Agendaron',       emoji: '✅', color: '#10b981', desc: 'Confirmaron la reunión' },
];

// Totales históricos congelados del A/B test finalizado (para mostrar como contexto)
const HISTORICO = {
    visitasLanding: 1819,
    abrioModal: 155,
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
                                    <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                                        ⚠️ Pendiente activar tracking en landing
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
                        {METRICAS.map(m => (
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

    const mostrarVisitas = rows.some(r => r.visitasLanding > 0);
    const seriesVisibles = METRICAS.filter(m => m.key !== 'visitasLanding' || mostrarVisitas);

    const series = seriesVisibles.map(m => ({
        name: `${m.emoji} ${m.label}`,
        data: rows.map(r => r[m.key] || 0),
    }));

    const options = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            background: 'transparent',
            fontFamily: 'inherit',
        },
        colors: seriesVisibles.map(m => m.color),
        xaxis: {
            categories: rows.map(r => formatFechaDia(r.fecha)),
            labels: { style: { fontSize: '11px' } },
        },
        yaxis: {
            labels: { style: { fontSize: '11px' } },
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

    return (
        <Card>
            <CardHeader
                title="📅 Datos por día"
                subheader={`${filas.length} días con actividad registrada`}
            />
            <CardContent sx={{ pt: 0 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>Fecha</strong></TableCell>
                                {METRICAS.filter(m => m.key !== 'visitasLanding' || mostrarVisitas).map(m => (
                                    <TableCell key={m.key} align="center">
                                        <strong>{m.emoji} {m.label}</strong>
                                    </TableCell>
                                ))}
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
                                    {METRICAS.filter(m => m.key !== 'visitasLanding' || mostrarVisitas).map(m => (
                                        <TableCell key={m.key} align="center">
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
                                    ))}
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

// ─── Página principal ─────────────────────────────────────

const LandingFunnelPage = () => {
    const [data, setData] = useState(null);
    const [dias, setDias] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await landingStatsService.getStats(dias);
            setData(res);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, [dias]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totales = data?.totales || {};
    const rows = data?.rows || [];

    return (
        <>
            <Head>
                <title>Funnel Landing | Sorbydata</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">

                    {/* ─── Header ─── */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box>
                            <Typography variant="h4">📊 Funnel — Landing → Agenda</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Conversión diaria del embudo de agendamiento · Nuevo tracking desde may 2026
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={dias}
                                onChange={(_, v) => { if (v) setDias(v); }}
                            >
                                {[7, 14, 30, 90].map(d => (
                                    <ToggleButton key={d} value={d}>{d}d</ToggleButton>
                                ))}
                            </ToggleButtonGroup>
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

                            {/* ─── Tarjetas resumen ─── */}
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

                            {/* ─── Tabla diaria ─── */}
                            <TablaDaily rows={rows} />

                        </Stack>
                    )}

                    {/* Estado vacío después de cargar */}
                    {!loading && data && rows.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            No hay datos registrados en los últimos {dias} días.
                            Los contadores se empezarán a llenar cuando haya actividad en la landing.
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
