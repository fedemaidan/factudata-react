import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
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
    Slider,
    Link,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
    InfoOutlined as InfoIcon,
    OpenInNew as OpenInNewIcon,
    VisibilityOff as IgnorarIcon,
    Visibility as RestaurarIcon,
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import abTestService from 'src/services/abTestService';

const TEST_NAME = 'landing_agenda_directo';

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

function pct(numerador, denominador) {
    if (!denominador || denominador === 0) return '—';
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

function getContador(test, variante) {
    if (!test?.contadores) return 0;
    // contadores puede ser un Map serializado como objeto o un Map de Mongoose
    if (typeof test.contadores.get === 'function') return test.contadores.get(variante) || 0;
    return test.contadores[variante] || 0;
}

function getMetrica(test, variante, key) {
    if (!test?.metricas) return 0;
    const m = typeof test.metricas.get === 'function'
        ? test.metricas.get(variante)
        : test.metricas[variante];
    return m?.[key] || 0;
}

// ─── Tabla de métricas ────────────────────────────────────

function MetricasResumen({ test, contactos }) {
    const actA = (contactos.A || []).filter(c => !c.ab_test_ignorado);
    const actB = (contactos.B || []).filter(c => !c.ab_test_ignorado);

    const visitasA = getContador(test, 'A');
    const visitasB = getContador(test, 'B');

    // abrieronLink: A = click en CTA WhatsApp. B = click en CTA agendar reunión → calendario.
    // Ambos se incrementan en el backend cuando sucede el click efectivo.
    const abrieronLinkA = getMetrica(test, 'A', 'abrieronLink');
    const abrieronLinkB = getMetrica(test, 'B', 'abrieronLink');

    const contactosA = actA.length;
    const contactosB = actB.length;

    const movimientosA = actA.filter(c => c._flags?.generaronMovimiento).length;
    const movimientosB = actB.filter(c => c._flags?.generaronMovimiento).length;

    const quisieronAgendarA = actA.filter(c => c._flags?.pidieronDemo).length;

    const reunionesA = actA.filter(c => c._flags?.agendaronReunion).length;
    const reunionesB = actB.filter(c => c._flags?.agendaronReunion).length;

    const rows = [
        {
            label: 'Visitas al landing',
            tooltip: 'Cantidad de veces que se mostró cada variante (registrado por la cookie sb_lp_variante).',
            valA: visitasA,
            valB: visitasB,
            pctA: null,
            pctB: null,
        },
        {
            label: 'Clics al CTA principal',
            tooltip: 'Variante A: clicks en "Probá Sorby" → redirección a WhatsApp.\nVariante B: clicks en "Agendar reunión" → redirección a Google Calendar.',
            valA: abrieronLinkA,
            valB: abrieronLinkB,
            pctA: pct(abrieronLinkA, visitasA),
            pctB: pct(abrieronLinkB, visitasB),
            highlight: true,
        },
        null,
        {
            label: 'Contactos creados',
            tooltip: 'ContactoSDR generados para cada variante.\nA: creados via bot (leadContactoBridge).\nB: creados via Calendar Sync cuando se detecta un evento con teléfono + asistente externo.',
            valA: contactosA,
            valB: contactosB,
            pctA: pct(contactosA, visitasA),
            pctB: pct(contactosB, visitasB),
        },
        {
            label: 'Generaron movimiento',
            tooltip: 'Registraron al menos 1 movimiento en su empresa de Sorby (no demo).',
            valA: movimientosA,
            valB: movimientosB,
            pctA: pct(movimientosA, contactosA),
            pctB: pct(movimientosB, contactosB),
        },
        {
            label: 'Quisieron agendar',
            tooltip: 'Variante A: tocaron el botón "Agendar reunión" dentro del bot de WhatsApp.\nVariante B: ya están en el calendario al hacer clic en el CTA (no aplica por separado).',
            valA: quisieronAgendarA,
            valB: '—',
            pctA: pct(quisieronAgendarA, contactosA),
            pctB: null,
        },
        {
            label: 'Agendaron reunión',
            tooltip: 'Tienen al menos 1 ReunionSDR con estado ≠ cancelada.',
            valA: reunionesA,
            valB: reunionesB,
            pctA: pct(reunionesA, visitasA),
            pctB: pct(reunionesB, visitasB),
            highlight: true,
        },
    ];

    return (
        <Card>
            <CardHeader
                title="📊 Métricas del test"
                subheader="Conversión landing → reunión por variante"
            />
            <CardContent>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Métrica</TableCell>
                                <TableCell align="center">
                                    <strong>Variante A</strong>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        CTA WhatsApp
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <strong>Variante B</strong>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        CTA Agendar Reunión
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row, i) => {
                                if (!row) {
                                    return (
                                        <TableRow key={`sep-${i}`}>
                                            <TableCell colSpan={3} sx={{ py: 0.5 }}>
                                                <Divider>
                                                    <Chip label="Conversión" size="small" variant="outlined" />
                                                </Divider>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                return (
                                    <TableRow
                                        key={row.label}
                                        sx={row.highlight ? { bgcolor: 'action.hover' } : {}}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {row.highlight && <strong>{row.label}</strong>}
                                                {!row.highlight && row.label}
                                                {row.tooltip && (
                                                    <Tooltip
                                                        title={
                                                            <Typography variant="caption" sx={{ whiteSpace: 'pre-line' }}>
                                                                {row.tooltip}
                                                            </Typography>
                                                        }
                                                        placement="right"
                                                        arrow
                                                    >
                                                        <InfoIcon sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>{row.valA}</strong>
                                            {row.pctA && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({row.pctA})
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>{row.valB}</strong>
                                            {row.pctB && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({row.pctB})
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

// ─── Tabla de contactos ───────────────────────────────────

function TablaContactos({ contactos, filtroVariante, onVarianteChange, onToggleIgnorar }) {
    const listaA = (contactos.A || []).map(c => ({ ...c, variante: 'A' }));
    const listaB = (contactos.B || []).map(c => ({ ...c, variante: 'B' }));
    const lista = filtroVariante === 'A' ? listaA : filtroVariante === 'B' ? listaB : [...listaA, ...listaB];

    return (
        <Card>
            <CardHeader
                title="👥 Contactos del test"
                subheader={
                    <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">Variante:</Typography>
                        {['todos', 'A', 'B'].map(v => (
                            <Chip
                                key={v}
                                label={v === 'todos' ? 'Todos' : `Variante ${v}`}
                                size="small"
                                variant={filtroVariante === v ? 'filled' : 'outlined'}
                                color={filtroVariante === v ? (v === 'A' ? 'primary' : v === 'B' ? 'error' : 'default') : 'default'}
                                onClick={() => onVarianteChange(v)}
                                sx={{ cursor: 'pointer' }}
                            />
                        ))}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {lista.length} contactos
                        </Typography>
                    </Stack>
                }
            />
            <CardContent sx={{ pt: 0 }}>
                {lista.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No hay contactos registrados aún.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell align="center">Variante</TableCell>
                                    <TableCell>Origen</TableCell>
                                    <TableCell>Estado</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title={<Typography variant="caption">Tiene ReunionSDR con estado ≠ cancelada</Typography>} placement="top" arrow>
                                            <span>Reunión</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title={<Typography variant="caption">Hizo click en el link de Google Calendar</Typography>} placement="top" arrow>
                                            <span>Link cal.</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="right">Creado</TableCell>
                                    <TableCell align="center"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lista.map((c) => (
                                    <TableRow
                                        key={c._id}
                                        sx={c.ab_test_ignorado ? { opacity: 0.4, background: '#f5f5f5' } : {}}
                                    >
                                        <TableCell>
                                            <Link
                                                href={`/sdr/contacto/${c._id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                            >
                                                {c.nombre}
                                                <OpenInNewIcon sx={{ fontSize: 12 }} />
                                            </Link>
                                        </TableCell>
                                        <TableCell>{c.telefono}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                size="small"
                                                label={`V${c.variante}`}
                                                color={c.variante === 'A' ? 'primary' : 'error'}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={c.origenImportacion || '—'}
                                                variant="outlined"
                                                color={c.origenImportacion === 'calendar' ? 'secondary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" label={c.estado} variant="outlined" />
                                        </TableCell>
                                        <TableCell align="center">
                                            {c._flags?.agendaronReunion
                                                ? <Chip size="small" label="✓" color="success" sx={{ minWidth: 32 }} />
                                                : <Typography variant="body2" color="text.disabled">—</Typography>
                                            }
                                        </TableCell>
                                        <TableCell align="center">
                                            {c._flags?.abrieronLink
                                                ? <Chip size="small" label="✓" color="info" sx={{ minWidth: 32 }} />
                                                : <Typography variant="body2" color="text.disabled">—</Typography>
                                            }
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="caption" color="text.secondary">
                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ px: 0.5 }}>
                                            <Tooltip title={c.ab_test_ignorado ? 'Restaurar (incluir en métricas)' : 'Ignorar (excluir de métricas, es de prueba)'} placement="left">
                                                <IconButton
                                                    size="small"
                                                    color={c.ab_test_ignorado ? 'success' : 'default'}
                                                    onClick={() => onToggleIgnorar(c._id, !c.ab_test_ignorado)}
                                                    sx={{ opacity: 0.7 }}
                                                >
                                                    {c.ab_test_ignorado ? <RestaurarIcon fontSize="small" /> : <IgnorarIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Página principal ─────────────────────────────────────

const AbTestLandingAgendaPage = () => {
    const [test, setTest] = useState(null);
    const [contactos, setContactos] = useState({ A: [], B: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pesoA, setPesoA] = useState(50);
    const [savingPesos, setSavingPesos] = useState(false);
    const [filtroVariante, setFiltroVariante] = useState('todos');

    const handleToggleIgnorar = async (contactoId, ignorar) => {
        setContactos(prev => {
            const update = (lista) => lista.map(c =>
                String(c._id) === String(contactoId) ? { ...c, ab_test_ignorado: ignorar } : c
            );
            return { A: update(prev.A), B: update(prev.B) };
        });
        try {
            await abTestService.toggleIgnorar(TEST_NAME, contactoId, ignorar);
        } catch (err) {
            setContactos(prev => {
                const revert = (lista) => lista.map(c =>
                    String(c._id) === String(contactoId) ? { ...c, ab_test_ignorado: !ignorar } : c
                );
                return { A: revert(prev.A), B: revert(prev.B) };
            });
            console.error('Error marcando ignorado:', err);
        }
    };

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

            if (testRes.test?.pesos) {
                const p = testRes.test.pesos;
                setPesoA(p.A ?? p?.get?.('A') ?? 50);
            }
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
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleGuardarPesos = async () => {
        try {
            setSavingPesos(true);
            await abTestService.actualizarPesos(TEST_NAME, { A: pesoA, B: 100 - pesoA });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setSavingPesos(false);
        }
    };

    return (
        <>
            <Head>
                <title>A/B Test — Landing Agenda | Sorbydata</title>
            </Head>
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
                <Container maxWidth="xl">
                    {/* Header */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box>
                            <Typography variant="h4">🧪 A/B Test: Landing → Agenda</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Variante A (CTA WhatsApp) vs Variante B (CTA Agendar Reunión directo)
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

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {loading && !test && (
                        <Box display="flex" justifyContent="center" py={8}>
                            <CircularProgress />
                        </Box>
                    )}

                    {!loading && !test && !error && (
                        <Alert severity="info">
                            No se encontró el test &quot;{TEST_NAME}&quot;.
                            Ejecutá <code>node scripts/seedLandingAbTest.js</code> para crearlo.
                        </Alert>
                    )}

                    {test && (
                        <>
                            {/* Info del test */}
                            <Card sx={{ mb: 3 }}>
                                <CardContent>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={3}>
                                            <Typography variant="subtitle2" color="text.secondary">Nombre</Typography>
                                            <Typography variant="body1"><strong>{test.nombre}</strong></Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <Typography variant="subtitle2" color="text.secondary">Inicio</Typography>
                                            <Typography variant="body1">{formatDate(test.fechaInicio)}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <Typography variant="subtitle2" color="text.secondary">Fin</Typography>
                                            <Typography variant="body1">{formatDate(test.fechaFin)}</Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={3}>
                                            <Stack direction="row" spacing={1}>
                                                {test.estado !== 'activo' && (
                                                    <Button size="small" variant="outlined" color="success" startIcon={<PlayIcon />} onClick={() => handleCambiarEstado('activo')}>
                                                        Activar
                                                    </Button>
                                                )}
                                                {test.estado === 'activo' && (
                                                    <Button size="small" variant="outlined" color="warning" startIcon={<PauseIcon />} onClick={() => handleCambiarEstado('pausado')}>
                                                        Pausar
                                                    </Button>
                                                )}
                                                {test.estado !== 'finalizado' && (
                                                    <Button size="small" variant="outlined" color="error" startIcon={<StopIcon />} onClick={() => handleCambiarEstado('finalizado')}>
                                                        Finalizar
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                Distribución de variantes
                                            </Typography>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Chip label={`A: ${pesoA}%`} color="primary" size="small" />
                                                <Slider
                                                    value={pesoA}
                                                    onChange={(_, v) => setPesoA(v)}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    valueLabelDisplay="auto"
                                                    valueLabelFormat={(v) => `A:${v}% / B:${100 - v}%`}
                                                    sx={{ flex: 1, maxWidth: 300 }}
                                                />
                                                <Chip label={`B: ${100 - pesoA}%`} color="error" size="small" />
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={handleGuardarPesos}
                                                    disabled={savingPesos}
                                                >
                                                    {savingPesos ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Métricas */}
                            <Box sx={{ mb: 3 }}>
                                <MetricasResumen test={test} contactos={contactos} />
                            </Box>

                            {/* Contactos */}
                            <TablaContactos
                                contactos={contactos}
                                filtroVariante={filtroVariante}
                                onVarianteChange={setFiltroVariante}
                                onToggleIgnorar={handleToggleIgnorar}
                            />
                        </>
                    )}
                </Container>
            </Box>
        </>
    );
};

AbTestLandingAgendaPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default AbTestLandingAgendaPage;
