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
    Button,
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
    Divider,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import abTestService from 'src/services/abTestService';

// ApexCharts SSR-safe import
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const TEST_NAME = 'onboarding_activacion_rapida';

// ─── Helpers ──────────────────────────────────────────────

function getEstadoChip(estado) {
    const map = {
        activo: { color: 'success', label: '🟢 Activo' },
        pausado: { color: 'warning', label: '⏸️ Pausado' },
        finalizado: { color: 'default', label: '⏹️ Finalizado' },
    };
    const config = map[estado] || { color: 'default', label: estado };
    return <Chip size="small" color={config.color} label={config.label} />;
}

function safeMetric(metricas, variante, key) {
    if (!metricas) return 0;
    const v = metricas[variante] || metricas.get?.(variante);
    if (!v) return 0;
    return v[key] || 0;
}

function pct(numerador, denominador) {
    if (!denominador || denominador === 0) return '0%';
    return ((numerador / denominador) * 100).toFixed(1) + '%';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Componentes ──────────────────────────────────────────

function MetricasResumen({ test }) {
    if (!test) return null;

    const { metricas, contadores } = test;
    const variantes = ['A', 'B'];

    const rows = [
        { label: 'Asignados', key: 'contactos' },
        { label: 'Probaron', key: 'probaron' },
        { label: 'Completaron gasto', key: 'completaron' },
        { label: 'Agendaron demo', key: 'agendaron' },
        { label: 'Timeouts (1h)', key: 'timeouts' },
    ];

    return (
        <Card>
            <CardHeader title="📊 Métricas por variante" />
            <CardContent>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Métrica</TableCell>
                                {variantes.map((v) => (
                                    <TableCell key={v} align="center">
                                        <strong>Variante {v}</strong>
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {v === 'A' ? '(Control — Asistente IA)' : '(Tratamiento — Demo directa)'}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => {
                                const valA = safeMetric(metricas, 'A', row.key);
                                const valB = safeMetric(metricas, 'B', row.key);
                                const totalA = safeMetric(metricas, 'A', 'contactos');
                                const totalB = safeMetric(metricas, 'B', 'contactos');
                                return (
                                    <TableRow key={row.key}>
                                        <TableCell>{row.label}</TableCell>
                                        <TableCell align="center">
                                            <strong>{valA}</strong>
                                            {row.key !== 'contactos' && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({pct(valA, totalA)})
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>{valB}</strong>
                                            {row.key !== 'contactos' && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({pct(valB, totalB)})
                                                </Typography>
                                            )}
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

function GraficoFunnel({ test }) {
    if (!test?.metricas) return null;

    const { metricas } = test;
    const steps = ['contactos', 'probaron', 'completaron', 'agendaron'];
    const labels = ['Asignados', 'Probaron', 'Completaron', 'Agendaron'];

    const seriesA = steps.map((s) => safeMetric(metricas, 'A', s));
    const seriesB = steps.map((s) => safeMetric(metricas, 'B', s));

    const options = {
        chart: { type: 'bar', toolbar: { show: false } },
        plotOptions: {
            bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 },
        },
        xaxis: { categories: labels },
        yaxis: { title: { text: 'Contactos' } },
        colors: ['#3f51b5', '#f44336'],
        legend: { position: 'top' },
        dataLabels: { enabled: true },
        tooltip: {
            y: { formatter: (val) => `${val} contactos` },
        },
    };

    const series = [
        { name: 'Variante A (Control)', data: seriesA },
        { name: 'Variante B (Demo directa)', data: seriesB },
    ];

    return (
        <Card>
            <CardHeader title="📈 Funnel de conversión" />
            <CardContent>
                <Chart options={options} series={series} type="bar" height={350} />
            </CardContent>
        </Card>
    );
}

function GraficoConversion({ test }) {
    if (!test?.metricas) return null;

    const { metricas } = test;
    const totalA = safeMetric(metricas, 'A', 'contactos');
    const totalB = safeMetric(metricas, 'B', 'contactos');
    const compA = safeMetric(metricas, 'A', 'completaron');
    const compB = safeMetric(metricas, 'B', 'completaron');
    const agA = safeMetric(metricas, 'A', 'agendaron');
    const agB = safeMetric(metricas, 'B', 'agendaron');

    const convRateA = totalA > 0 ? ((compA + agA) / totalA * 100) : 0;
    const convRateB = totalB > 0 ? ((compB + agB) / totalB * 100) : 0;

    const options = {
        chart: { type: 'radialBar' },
        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: { fontSize: '14px' },
                    value: { fontSize: '20px', formatter: (val) => val.toFixed(1) + '%' },
                },
            },
        },
        labels: ['Variante A', 'Variante B'],
        colors: ['#3f51b5', '#f44336'],
    };

    return (
        <Card>
            <CardHeader
                title="🎯 Tasa de conversión"
                subheader="Completaron + Agendaron / Total asignados"
            />
            <CardContent>
                <Chart options={options} series={[convRateA, convRateB]} type="radialBar" height={300} />
            </CardContent>
        </Card>
    );
}

function TablaContactos({ contactos, variante }) {
    const lista = contactos?.[variante] || [];

    if (lista.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No hay contactos en Variante {variante} aún.
            </Typography>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Teléfono</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Pre-calificación</TableCell>
                        <TableCell>Fecha</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {lista.map((c) => (
                        <TableRow key={c._id}>
                            <TableCell>{c.nombre}</TableCell>
                            <TableCell>{c.telefono}</TableCell>
                            <TableCell>
                                <Chip size="small" label={c.estado} variant="outlined" />
                            </TableCell>
                            <TableCell>{c.precalificacionBot || '—'}</TableCell>
                            <TableCell>{formatDate(c.createdAt)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// ─── Página principal ─────────────────────────────────────

const AbTestContactActivationPage = () => {
    const [test, setTest] = useState(null);
    const [contactos, setContactos] = useState({ A: [], B: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [testRes, contactosRes] = await Promise.all([
                abTestService.getTest(TEST_NAME),
                abTestService.getContactos(TEST_NAME),
            ]);

            setTest(testRes.test || null);
            setContactos(contactosRes.contactos || { A: [], B: [] });
        } catch (err) {
            console.error('Error cargando datos del A/B test:', err);
            setError(err.response?.data?.error || err.message || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCambiarEstado = async (nuevoEstado) => {
        try {
            await abTestService.cambiarEstado(TEST_NAME, nuevoEstado);
            fetchData();
        } catch (err) {
            console.error('Error cambiando estado:', err);
            setError(err.response?.data?.error || err.message);
        }
    };

    return (
        <>
            <Head>
                <title>A/B Test — Activación Contacto | Sorbydata</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">
                    {/* Header */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box>
                            <Typography variant="h4">🧪 A/B Test: Activación de Contacto</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Comparación entre Variante A (Asistente IA) y Variante B (Demo directa + gasto guiado)
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {test && getEstadoChip(test.estado)}
                            <Tooltip title="Refrescar datos">
                                <IconButton onClick={fetchData} disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {/* Loading */}
                    {loading && !test && (
                        <Box display="flex" justifyContent="center" py={8}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* No test */}
                    {!loading && !test && !error && (
                        <Alert severity="info">
                            No se encontró el test &quot;{TEST_NAME}&quot;.
                            Crealo primero con el endpoint POST /api/ab-tests.
                        </Alert>
                    )}

                    {/* Contenido */}
                    {test && (
                        <>
                            {/* Info del test */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" color="text.secondary">Nombre</Typography>
                                            <Typography variant="body1"><strong>{test.nombre}</strong></Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="subtitle2" color="text.secondary">Inicio</Typography>
                                            <Typography variant="body1">{formatDate(test.fechaInicio)}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Stack direction="row" spacing={1}>
                                                {test.estado !== 'activo' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="success"
                                                        startIcon={<PlayIcon />}
                                                        onClick={() => handleCambiarEstado('activo')}
                                                    >
                                                        Activar
                                                    </Button>
                                                )}
                                                {test.estado === 'activo' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="warning"
                                                        startIcon={<PauseIcon />}
                                                        onClick={() => handleCambiarEstado('pausado')}
                                                    >
                                                        Pausar
                                                    </Button>
                                                )}
                                                {test.estado !== 'finalizado' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<StopIcon />}
                                                        onClick={() => handleCambiarEstado('finalizado')}
                                                    >
                                                        Finalizar
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Gráficos */}
                            <Grid container spacing={3} sx={{ mb: 3 }}>
                                <Grid item xs={12} md={8}>
                                    <GraficoFunnel test={test} />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <GraficoConversion test={test} />
                                </Grid>
                            </Grid>

                            {/* Tabla de métricas */}
                            <Box sx={{ mb: 3 }}>
                                <MetricasResumen test={test} />
                            </Box>

                            {/* Contactos por variante */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardHeader
                                            title="Variante A — Control"
                                            subheader={`${contactos.A.length} contactos`}
                                        />
                                        <CardContent>
                                            <TablaContactos contactos={contactos} variante="A" />
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card>
                                        <CardHeader
                                            title="Variante B — Demo directa"
                                            subheader={`${contactos.B.length} contactos`}
                                        />
                                        <CardContent>
                                            <TablaContactos contactos={contactos} variante="B" />
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </>
                    )}
                </Container>
            </Box>
        </>
    );
};

AbTestContactActivationPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default AbTestContactActivationPage;
