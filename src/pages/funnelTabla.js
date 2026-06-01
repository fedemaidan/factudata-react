// ─── Funnel Tabla — desglose por día × fuente/campaña × variante ──────────
//
// Responde la pregunta: "por cada día y campaña/fuente, cuánta gente entró,
// completó el paso 1 (según variante), el paso 2, agendó y eligió rubro".
//
// Lee los contadores cruzados que el backend acumula en LandingStats.extraSteps:
//   srcv:<fuente>:<variante>:<evento>     (por fuente UTM)
//   campv:<campaña>:<variante>:<evento>   (por campaña UTM)
// Eventos: visita, abrioModal, completoDatos (A), eligioSlot, intentoSubmit (B),
//          agendaron, eligioRubro.
//
// Sólo aparece tráfico con UTM (campañas). El tráfico directo / orgánico no
// tiene estas claves cruzadas — para el total general usá funnelV2.

import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardHeader,
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

// ─── Util ──────────────────────────────────────────────
const toYMD = (d) => {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const fmtNum = (n) => (n > 0 ? n.toLocaleString('es-AR') : '—');
const fmtPct = (num, den) => (!den || den === 0 ? '—' : `${((num / den) * 100).toFixed(0)}%`);

const RANGOS_PRESET = [
    { key: 'd7',         label: '7 días',       dias: 7 },
    { key: 'd14',        label: '14 días',      dias: 14 },
    { key: 'd30',        label: '30 días',      dias: 30 },
    { key: 'post_28may', label: 'Desde 28-may', desde: '2026-05-28' },
];

// Columnas por variante, EN EL ORDEN REAL del embudo de esa variante.
const COLS_A = [
    { key: 'visita',        label: 'Entró',          color: '#6366f1' },
    { key: 'abrioModal',    label: 'Abrió modal',    color: '#0ea5e9' },
    { key: 'completoDatos', label: 'Completó datos', color: '#22c55e', paso: 1 },
    { key: 'eligioSlot',    label: 'Eligió slot',    color: '#f59e0b', paso: 2 },
    { key: 'agendaron',     label: 'Agendó',         color: '#10b981' },
    { key: 'eligioRubro',   label: 'Eligió rubro',   color: '#a855f7' },
];
const COLS_B = [
    { key: 'visita',        label: 'Entró',          color: '#6366f1' },
    { key: 'abrioModal',    label: 'Abrió modal',    color: '#0ea5e9' },
    { key: 'eligioSlot',    label: 'Eligió slot',    color: '#f59e0b', paso: 1 },
    { key: 'intentoSubmit', label: 'Intentó confirmar', color: '#8b5cf6', paso: 2 },
    { key: 'agendaron',     label: 'Agendó',         color: '#10b981' },
    { key: 'eligioRubro',   label: 'Eligió rubro',   color: '#a855f7' },
];

// Parsea las claves cruzadas de un row.extraSteps para un prefijo dado.
// Devuelve { [variant]: { [dim]: { [evento]: count } } }
function parseRow(extraSteps, prefix) {
    const out = { A: {}, B: {} };
    if (!extraSteps) return out;
    for (const [k, v] of Object.entries(extraSteps)) {
        if (!k.startsWith(prefix + ':')) continue;
        const parts = k.split(':'); // [prefix, dim, variant, event]
        if (parts.length !== 4) continue;
        const [, dim, variant, event] = parts;
        if (variant !== 'A' && variant !== 'B') continue;
        if (!out[variant][dim]) out[variant][dim] = {};
        out[variant][dim][event] = (out[variant][dim][event] || 0) + (v || 0);
    }
    return out;
}

// Construye filas de tabla: una por (fecha, dim) para la variante pedida.
function buildTableRows(rows, prefix, variant) {
    const result = [];
    for (const r of rows) {
        const parsed = parseRow(r.extraSteps, prefix)[variant];
        for (const [dim, metrics] of Object.entries(parsed)) {
            result.push({ fecha: r.fecha, dim, metrics });
        }
    }
    // Orden: fecha desc, luego dim asc
    result.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.dim < b.dim ? -1 : 1)));
    return result;
}

// ─── Tabla de una variante ─────────────────────────────
function VarianteTabla({ titulo, subtitulo, color, cols, tableRows, dimLabel }) {
    // Totales por columna
    const totales = {};
    for (const c of cols) totales[c.key] = tableRows.reduce((s, r) => s + (r.metrics[c.key] || 0), 0);
    const hayDatos = tableRows.length > 0;

    return (
        <Card sx={{ borderTop: `4px solid ${color}` }}>
            <CardHeader
                title={titulo}
                subheader={subtitulo}
                titleTypographyProps={{ variant: 'h6', sx: { color } }}
            />
            <CardContent sx={{ pt: 0 }}>
                {!hayDatos ? (
                    <Alert severity="info">Sin tráfico con UTM para esta variante en el rango elegido.</Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Día</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>{dimLabel}</TableCell>
                                    {cols.map(c => (
                                        <TableCell key={c.key} align="right" sx={{ fontWeight: 700, color: c.color, whiteSpace: 'nowrap' }}>
                                            {c.paso ? `${c.label} ` : c.label}
                                            {c.paso && <Chip label={`paso ${c.paso}`} size="small" sx={{ ml: 0.5, height: 16, fontSize: 9 }} />}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tableRows.map((r, i) => {
                                    const entro = r.metrics.visita || 0;
                                    return (
                                        <TableRow key={r.fecha + '|' + r.dim} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.fecha.slice(5)}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.dim}</TableCell>
                                            {cols.map(c => {
                                                const val = r.metrics[c.key] || 0;
                                                return (
                                                    <TableCell key={c.key} align="right">
                                                        <Tooltip
                                                            title={c.key !== 'visita' && entro > 0 ? `${fmtPct(val, entro)} de los que entraron` : ''}
                                                            placement="top" arrow
                                                        >
                                                            <span style={{ fontWeight: c.key === 'agendaron' ? 700 : 400, color: val ? c.color : '#bbb' }}>
                                                                {fmtNum(val)}
                                                            </span>
                                                        </Tooltip>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                                {/* Fila de totales */}
                                <TableRow sx={{ bgcolor: `${color}10` }}>
                                    <TableCell sx={{ fontWeight: 700 }} colSpan={2}>TOTAL</TableCell>
                                    {cols.map(c => (
                                        <TableCell key={c.key} align="right" sx={{ fontWeight: 700, color: c.color }}>
                                            {fmtNum(totales[c.key])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Página ─────────────────────────────────────────────
const FunnelTablaPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rangoKey, setRangoKey] = useState('d14');
    const [modo, setModo] = useState('preset');
    const [fechaDesde, setFechaDesde] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 13); return d; });
    const [fechaHasta, setFechaHasta] = useState(() => new Date());
    const [dimension, setDimension] = useState('camp'); // 'camp' = campaña | 'src' = fuente

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

    const rows = data?.rows || [];
    const prefix = dimension === 'camp' ? 'campv' : 'srcv';
    const dimLabel = dimension === 'camp' ? 'Campaña' : 'Fuente';

    const tablaA = useMemo(() => buildTableRows(rows, prefix, 'A'), [rows, prefix]);
    const tablaB = useMemo(() => buildTableRows(rows, prefix, 'B'), [rows, prefix]);

    return (
        <>
            <Head><title>Funnel por campaña | Sorbydata</title></Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">
                    {/* Header */}
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} mb={2}>
                        <Box>
                            <Typography variant="h4">📋 Funnel por día · campaña/fuente</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Desglose por variante — entró, pasos, agendó y rubro, separado por origen de tráfico
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_, v) => v && setModo(v)}>
                                <ToggleButton value="preset">Preset</ToggleButton>
                                <ToggleButton value="rango">Rango</ToggleButton>
                            </ToggleButtonGroup>
                            {modo === 'preset' ? (
                                <ToggleButtonGroup size="small" exclusive value={rangoKey} onChange={(_, v) => v && setRangoKey(v)}>
                                    {RANGOS_PRESET.map(r => (<ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>))}
                                </ToggleButtonGroup>
                            ) : (
                                <Stack direction="row" spacing={1}>
                                    <DatePicker label="Desde" value={fechaDesde} onChange={setFechaDesde} maxDate={fechaHasta} format="dd/MM/yyyy" slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
                                    <DatePicker label="Hasta" value={fechaHasta} onChange={setFechaHasta} minDate={fechaDesde} maxDate={new Date()} format="dd/MM/yyyy" slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
                                </Stack>
                            )}
                            <Tooltip title="Refrescar"><IconButton onClick={fetchData} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
                        </Stack>
                    </Stack>

                    {/* Dimensión */}
                    <Card sx={{ mb: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>Agrupar por:</Typography>
                                <ToggleButtonGroup size="small" exclusive value={dimension} onChange={(_, v) => v && setDimension(v)}>
                                    <ToggleButton value="camp">Campaña (UTM)</ToggleButton>
                                    <ToggleButton value="src">Fuente (UTM)</ToggleButton>
                                </ToggleButtonGroup>
                                <Typography variant="caption" color="text.secondary">
                                    Cada fila = un día y una {dimLabel.toLowerCase()}. Solo aparece tráfico con UTM.
                                </Typography>
                            </Stack>
                        </CardContent>
                    </Card>

                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                    {loading && !data && <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>}

                    {data && (
                        <Stack spacing={3}>
                            <VarianteTabla
                                titulo="🅰️ Variante A — datos primero"
                                subtitulo="Entró → abrió modal → completó datos (paso 1) → eligió slot (paso 2) → agendó → rubro"
                                color="#0ea5e9"
                                cols={COLS_A}
                                tableRows={tablaA}
                                dimLabel={dimLabel}
                            />
                            <VarianteTabla
                                titulo="🅱️ Variante B — horario primero"
                                subtitulo="Entró → abrió modal → eligió slot (paso 1) → intentó confirmar (paso 2) → agendó → rubro"
                                color="#10b981"
                                cols={COLS_B}
                                tableRows={tablaB}
                                dimLabel={dimLabel}
                            />

                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong>Cómo leerlo:</strong> cada tabla es una variante del A/B. Las columnas siguen el orden
                                        real en que avanza el usuario en esa variante (el "paso 1" y "paso 2" significan cosas distintas
                                        en A y en B, por eso están separadas). Pasá el mouse sobre un número para ver el % respecto a los que entraron.<br /><br />
                                        <strong>Por qué puede no coincidir con el total:</strong> acá solo se cuenta tráfico con UTM
                                        (campañas). Las visitas directas / orgánicas no tienen campaña ni fuente, así que no aparecen.
                                        Para el total general (incluyendo directo) usá <strong>Funnel V2</strong>.
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

FunnelTablaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default FunnelTablaPage;
