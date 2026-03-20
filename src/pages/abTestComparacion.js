/**
 * abTestComparacion.js
 *
 * Página de comparación histórica: Pre-test vs Variante A vs Variante B.
 * Métricas comparables entre los 3 grupos:
 *   - Contactos totales
 *   - Reuniones agendadas (y %)
 *   - Empresas creadas (y %)
 *   - Mensajes promedio por contacto
 *
 * NOTA: la carga puede demorar porque itera cada contacto en Firestore.
 */

import { useState, useCallback, Fragment } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Grid,
    Button,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
    CircularProgress,
    Alert,
    Stack,
    Chip,
    Tooltip,
    Collapse,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    InfoOutlined as InfoIcon,
    Refresh as RefreshIcon,
    PictureAsPdf as PdfIcon,
    TextSnippet as TxtIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import abTestService from 'src/services/abTestService';
import { exportComparacionToPDF, exportComparacionToTXT } from 'src/utils/abTest/exportAbTest';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEST_NAME = 'onboarding_activacion_rapida';

// ─── Helpers ──────────────────────────────────────────────

function pct(num, den) {
    if (!den || den === 0) return '—';
    return ((num / den) * 100).toFixed(1) + '%';
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

// ─── Componente tabla comparativa ─────────────────────────

const ROWS = [
    {
        key: 'contactos',
        label: 'Contactos',
        showPct: false,
        tooltip: 'Total de contactos en cada grupo.',
    },
    {
        key: 'reunionesAgendadas',
        label: 'Reuniones agendadas',
        showPct: true,
        tooltip: 'Contactos con al menos 1 ReunionSDR registrada (estado ≠ cancelada). Mide conversión real a demo.',
    },
    {
        key: 'empresasCreadas',
        label: 'Empresas creadas',
        showPct: true,
        tooltip: 'Contactos con perfil en Firestore vinculado a empresa con empresa_demo = false.',
    },
    {
        key: 'mensajesPromedio',
        label: 'Mensajes promedio/contacto',
        showPct: false,
        tooltip: 'Promedio de mensajes enviados por el contacto al bot. Indica engagement y fricción del flujo.',
        extra: (grupo) => grupo.mensajesTotal != null ? ` (${grupo.mensajesTotal} total)` : '',
    },
];

// Las métricas filtrables en la vista de comparación (tienen _flags por contacto)
const METRICAS_FILTRABLES_COMP = new Set(['reunionesAgendadas', 'empresasCreadas']);

function TablaComparacion({ preTest, A, B, filtroMetrica, onFiltroChange }) {
    const grupos = [
        { label: 'Pre-test', sub: 'Sin variante — antes del test', data: preTest, color: 'default' },
        { label: 'Variante A', sub: 'Control — Calificación directa', data: A, color: 'primary' },
        { label: 'Variante B', sub: 'Tratamiento — Demo directa', data: B, color: 'error' },
    ];

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '30%' }}>Métrica</TableCell>
                        {grupos.map(g => (
                            <TableCell key={g.label} align="center">
                                <Typography variant="subtitle2">{g.label}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {g.sub}
                                </Typography>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {ROWS.map(row => {
                        const filtrable = METRICAS_FILTRABLES_COMP.has(row.key);
                        const selected = filtroMetrica === row.key;
                        return (
                        <TableRow
                            key={row.key}
                            onClick={filtrable ? () => onFiltroChange(selected ? null : row.key) : undefined}
                            sx={{
                                cursor: filtrable ? 'pointer' : 'default',
                                bgcolor: selected ? 'action.selected' : 'inherit',
                                '&:hover': filtrable ? { bgcolor: 'action.hover' } : {},
                            }}
                        >
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {row.label}
                                    {filtrable && (
                                        <Chip
                                            label={selected ? 'filtrando ✕' : 'filtrar'}
                                            size="small"
                                            variant={selected ? 'filled' : 'outlined'}
                                            color={selected ? 'primary' : 'default'}
                                            sx={{ fontSize: '0.65rem', height: 18, ml: 0.5 }}
                                        />
                                    )}
                                    {row.tooltip && (
                                        <Tooltip
                                            title={<Typography variant="caption">{row.tooltip}</Typography>}
                                            placement="right"
                                            arrow
                                        >
                                            <InfoIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                                        </Tooltip>
                                    )}
                                </Box>
                            </TableCell>
                            {grupos.map(g => {
                                const val = g.data?.[row.key] ?? '—';
                                const total = g.data?.contactos ?? 0;
                                const extra = row.extra ? row.extra(g.data || {}) : '';
                                return (
                                    <TableCell key={g.label} align="center">
                                        <strong>{val}</strong>
                                        {extra && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                {extra}
                                            </Typography>
                                        )}
                                        {row.showPct && typeof val === 'number' && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                ({pct(val, total)})
                                            </Typography>
                                        )}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// ─── Gráfico de barras comparativo ────────────────────────

function GraficoComparacion({ preTest, A, B }) {
    if (!preTest || !A || !B) return null;

    const safeNum = (v) => {
        const n = Number(v ?? 0);
        return (isNaN(n) || !isFinite(n)) ? 0 : n;
    };

    const grupos = [
        { label: 'Pre-test', data: preTest },
        { label: 'Variante A', data: A },
        { label: 'Variante B', data: B },
    ];

    const metricas = [
        { key: 'reunionesAgendadas', label: 'Reuniones agendadas', pctBase: 'contactos' },
        { key: 'empresasCreadas', label: 'Empresas creadas', pctBase: 'contactos' },
    ].filter(m => grupos.some(g => safeNum(g.data?.[m.key]) > 0));

    // Si no hay métricas con datos, no renderizar el gráfico
    if (metricas.length === 0) return null;

    const series = grupos.map(g => ({
        name: g.label,
        data: metricas.map(m => {
            const total = safeNum(g.data?.[m.pctBase]) || 1;
            const valor = safeNum(g.data?.[m.key]);
            return parseFloat(((valor / total) * 100).toFixed(1));
        }),
    }));

    const categories = metricas.map(m => m.label);
    const seriesKey = JSON.stringify(series);

    const options = {
        chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: '60%' } },
        xaxis: { categories },
        yaxis: { title: { text: '% del grupo' }, min: 0, max: 100 },
        colors: ['#9e9e9e', '#3f51b5', '#f44336'],
        legend: { position: 'top' },
        dataLabels: { enabled: true, formatter: (v) => `${v}%` },
        tooltip: { y: { formatter: (v) => `${v}%` } },
    };

    return (
        <Card>
            <CardHeader
                title="📊 Tasas de conversión comparadas"
                subheader="% de cada grupo que alcanzó cada métrica"
            />
            <CardContent>
                <Chart key={seriesKey} options={options} series={series} type="bar" height={320} />
            </CardContent>
        </Card>
    );
}

// ─── Lista de leads expandible ───────────────────────────

function ListaLeads({ lista, label, filtroMetrica }) {
    const [open, setOpen] = useState(false);
    if (!lista || lista.length === 0) return null;

    const listaFiltrada = filtroMetrica
        ? lista.filter(c => c._flags?.[filtroMetrica] === true)
        : lista;

    return (
        <Box mt={1}>
            <Button
                size="small"
                variant="text"
                onClick={() => setOpen(o => !o)}
                endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ px: 0, fontSize: '0.75rem', color: 'text.secondary' }}
            >
                {open ? 'Ocultar' : 'Ver'} {filtroMetrica ? `${listaFiltrada.length} de ${lista.length}` : lista.length} contactos
                {filtroMetrica && listaFiltrada.length !== lista.length && (
                    <Chip
                        label={filtroMetrica}
                        size="small"
                        color="primary"
                        sx={{ ml: 0.5, fontSize: '0.6rem', height: 16 }}
                    />
                )}
            </Button>
            <Collapse in={open}>
                {listaFiltrada.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, pl: 1 }}>
                        Ninguno en este grupo con {filtroMetrica}.
                    </Typography>
                ) : (
                    <List dense disablePadding sx={{ maxHeight: 260, overflowY: 'auto', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        {listaFiltrada.map((c, i) => (
                            <Fragment key={c._id}>
                                {i > 0 && <Divider component="li" />}
                                <ListItemButton
                                    component="a"
                                    href={`/sdr/contacto/${c._id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ py: 0.5 }}
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant="caption" fontWeight={500}>
                                                {c.nombre || c.telefono}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {c.telefono}
                                            </Typography>
                                        }
                                    />
                                    <OpenInNewIcon sx={{ fontSize: 12, color: 'text.disabled', ml: 1 }} />
                                </ListItemButton>
                            </Fragment>
                        ))}
                    </List>
                )}
            </Collapse>
        </Box>
    );
}

// ─── Cards resumen ────────────────────────────────────────

function CardResumen({ label, sub, data, chipColor, filtroMetrica }) {
    if (!data) return null;
    return (
        <Card variant="outlined">
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Chip label={label} color={chipColor} size="small" />
                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                </Stack>
                <Typography variant="h4">{data.contactos}</Typography>
                <Typography variant="caption" color="text.secondary">contactos</Typography>
                <Box mt={1.5}>
                    <Typography variant="body2">
                        🤝 <strong>{data.reunionesAgendadas}</strong> reuniones ({pct(data.reunionesAgendadas, data.contactos)})
                    </Typography>
                    <Typography variant="body2">
                        🏢 <strong>{data.empresasCreadas}</strong> empresas creadas ({pct(data.empresasCreadas, data.contactos)})
                    </Typography>
                    <Typography variant="body2">
                        💬 <strong>{data.mensajesPromedio}</strong> mensajes/contacto promedio
                    </Typography>
                </Box>
                <ListaLeads lista={data.lista} label={label} filtroMetrica={filtroMetrica} />
            </CardContent>
        </Card>
    );
}

// ─── Página ───────────────────────────────────────────────

const AbTestComparacionPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filtroMetrica, setFiltroMetrica] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await abTestService.getPretest(TEST_NAME);
            setData(res);
        } catch (err) {
            console.error('Error cargando comparación pre-test:', err);
            setError(err.response?.data?.error || err.message || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <>
            <Head>
                <title>Comparación Histórica — A/B Test | Sorbydata</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">

                    {/* Header */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <NextLink href="/abTestContactActivation" passHref legacyBehavior>
                                    <Button component="a" size="small" startIcon={<BackIcon />} variant="text">
                                        Volver al test
                                    </Button>
                                </NextLink>
                            </Stack>
                            <Typography variant="h4">📈 Comparación histórica de onboarding</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Pre-test (antes del A/B) vs Variante A vs Variante B — métricas comunes comparables
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {data && (
                                <>
                                    <Tooltip title="Exportar PDF">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<PdfIcon />}
                                            onClick={() => exportComparacionToPDF(data, TEST_NAME)}
                                        >
                                            PDF
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Exportar TXT">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<TxtIcon />}
                                            onClick={() => exportComparacionToTXT(data, TEST_NAME)}
                                        >
                                            TXT
                                        </Button>
                                    </Tooltip>
                                </>
                            )}
                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                                onClick={fetchData}
                                disabled={loading}
                            >
                                {loading ? 'Calculando...' : data ? 'Recalcular' : 'Cargar datos'}
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Advertencia de demora */}
                    {!data && !loading && !error && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Este cálculo itera todos los contactos del bot contra Firestore y MongoDB.
                            Puede demorar entre 30 seg y 2 min dependiendo del volumen. Hacé clic en <strong>Cargar datos</strong> cuando estés listo.
                        </Alert>
                    )}

                    {/* Loading */}
                    {loading && (
                        <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={2}>
                            <CircularProgress />
                            <Typography variant="body2" color="text.secondary">
                                Consultando Firestore y MongoDB para cada contacto...
                            </Typography>
                        </Box>
                    )}

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {/* Resultados */}
                    {data && !loading && (
                        <>
                            {/* Fecha del test */}
                            {data.fechaInicioTest && (
                                <Alert severity="info" sx={{ mb: 3 }} icon={false}>
                                    El test <strong>{TEST_NAME}</strong> inició el <strong>{formatDate(data.fechaInicioTest)}</strong>.
                                    Los contactos pre-test son del bot con <code>origenImportacion=bot</code> y sin variante asignada, anteriores a esa fecha.
                                </Alert>
                            )}

                            {/* Cards resumen */}
                            <Grid container spacing={3} mb={3}>
                                <Grid item xs={12} md={4}>
                                    <CardResumen
                                        label="Pre-test"
                                        sub="Sin variante — antes del test"
                                        data={data.preTest}
                                        chipColor="default"
                                        filtroMetrica={filtroMetrica}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <CardResumen
                                        label="Variante A"
                                        sub="Control — Asistente IA"
                                        data={data.A}
                                        chipColor="primary"
                                        filtroMetrica={filtroMetrica}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <CardResumen
                                        label="Variante B"
                                        sub="Tratamiento — Demo directa"
                                        data={data.B}
                                        chipColor="error"
                                        filtroMetrica={filtroMetrica}
                                    />
                                </Grid>
                            </Grid>

                            {/* Banner de filtro activo */}
                            {filtroMetrica && (
                                <Alert
                                    severity="info"
                                    sx={{ mb: 2 }}
                                    action={
                                        <Button color="inherit" size="small" onClick={() => setFiltroMetrica(null)}>
                                            Limpiar filtro
                                        </Button>
                                    }
                                >
                                    Mostrando solo contactos con <strong>{filtroMetrica}</strong> en las listas de cada grupo
                                </Alert>
                            )}

                            {/* Gráfico */}
                            <Box mb={3}>
                                <GraficoComparacion
                                    preTest={data.preTest}
                                    A={data.A}
                                    B={data.B}
                                />
                            </Box>

                            {/* Tabla detallada */}
                            <Card>
                                <CardHeader
                                    title="📋 Detalle comparativo"
                                    subheader={filtroMetrica ? `Hacé click en una fila para filtrar los contactos de las tarjetas` : 'Hacé click en una métrica para filtrar los contactos'}
                                />
                                <CardContent>
                                    <TablaComparacion
                                        preTest={data.preTest}
                                        A={data.A}
                                        B={data.B}
                                        filtroMetrica={filtroMetrica}
                                        onFiltroChange={setFiltroMetrica}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>
            </Box>
        </>
    );
};

AbTestComparacionPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default AbTestComparacionPage;
