import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
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
    CompareArrows as CompareIcon,
    PictureAsPdf as PdfIcon,
    TextSnippet as TxtIcon,
    OpenInNew as OpenInNewIcon,
    VisibilityOff as IgnorarIcon,
    Visibility as RestaurarIcon,
} from '@mui/icons-material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import abTestService from 'src/services/abTestService';
import { exportTestToPDF, exportTestToTXT } from 'src/utils/abTest/exportAbTest';

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

function computeAgg(lista) {
    const activos = lista.filter(c => !c.ab_test_ignorado);
    const f = (key) => activos.filter(c => c._flags?.[key]).length;
    const sum = (key) => activos.reduce((s, c) => s + (c._flags?.[key] || 0), 0);
    return {
        contactos: activos.length,
        completaron: f('completaron'),
        abrieronLink: f('abrieronLink'),
        agendaronReunion: f('agendaronReunion'),
        crearonEmpresaReal: f('crearonEmpresaReal'),
        generaronMovimiento: f('generaronMovimiento'),
        mensajesMas3: f('mensajesMas3'),
        mensajesMas6: f('mensajesMas6'),
        mensajesMas10: f('mensajesMas10'),
        mensajes: lista.reduce((s, c) => s + (c._flags?.mensajes || 0), 0),
        llamadasAtendidas: sum('llamadasAtendidas'),
        llamadasNoAtendidas: sum('llamadasNoAtendidas'),
        mensajesWA: sum('mensajesWA'),
    };
}

const ROWS_RESUMEN = [
    {
        key: 'contactos',
        label: 'Asignados',
        tooltip: 'Contactos asignados a esta variante por el sistema de A/B test.',
        filtrable: false,
    },
    {
        key: 'completaron',
        label: 'Completaron',
        tooltip: 'A: precalificacionBot = calificado/quiere_meet.\nB: Registró al menos 1 movimiento en Firestore.',
        filtrable: true,
    },
    {
        key: 'abrieronLink',
        label: 'Abrieron link agendar',
        tooltip: 'Hicieron click en el link de Google Calendar (evento calendario_click en Firestore).',
        filtrable: true,
    },
    {
        key: 'agendaronReunion',
        label: 'Agendaron reunión real',
        tooltip: 'Tienen al menos 1 ReunionSDR con estado ≠ cancelada.',
        filtrable: true,
    },
    null,
    {
        key: 'crearonEmpresaReal',
        label: 'Crearon empresa real',
        tooltip: 'Tienen empresa en Firestore con esDemo!==true y empresa_demo!==true.',
        filtrable: true,
    },
    {
        key: 'generaronMovimiento',
        label: 'Generaron movimiento',
        tooltip: 'Al menos 1 movimiento en una empresa real via el bot.',
        filtrable: true,
    },
    {
        key: 'mensajesMas3',
        label: 'Enviaron > 3 mensajes',
        tooltip: 'Contactos con más de 3 mensajes al bot (excluye mensajes del bot).',
        filtrable: true,
    },
    {
        key: 'mensajesMas6',
        label: 'Enviaron > 6 mensajes',
        tooltip: 'Contactos con más de 6 mensajes al bot (excluye mensajes del bot).',
        filtrable: true,
    },
    {
        key: 'mensajesMas10',
        label: 'Enviaron > 10 mensajes',
        tooltip: 'Contactos con más de 10 mensajes al bot (excluye mensajes del bot).',
        filtrable: true,
    },
    {
        key: 'mensajes',
        label: 'Mensajes totales',
        tooltip: 'Total de mensajes recibidos del usuario (fromMe=false) en MongoDB.',
        filtrable: false,
        isText: true,
    },
    null,
    {
        key: 'llamadasAtendidas',
        label: 'Llamadas atendidas',
        tooltip: 'Total de llamadas atendidas por el SDR a contactos de esta variante.',
        filtrable: false,
        isText: true,
    },
    {
        key: 'llamadasNoAtendidas',
        label: 'Llamadas no atendidas',
        tooltip: 'Total de llamadas no atendidas por el SDR a contactos de esta variante.',
        filtrable: false,
        isText: true,
    },
    {
        key: 'mensajesWA',
        label: 'Mensajes WA (SDR)',
        tooltip: 'Total de mensajes WhatsApp enviados por el SDR a contactos de esta variante.',
        filtrable: false,
        isText: true,
    },
];

function MetricasResumen({ contactos, filtroMetrica, onFiltroChange }) {
    const aggA = computeAgg(contactos.A || []);
    const aggB = computeAgg(contactos.B || []);

    return (
        <Card>
            <CardHeader
                title="📊 Métricas por variante"
                subheader={filtroMetrica ? `Filtrando contactos por: ${filtroMetrica}` : 'Hacé click en una métrica para filtrar los contactos'}
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
                                        (Control — Asistente IA)
                                    </Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <strong>Variante B</strong>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        (Tratamiento — Demo directa)
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ROWS_RESUMEN.map((row, i) => {
                                if (!row) {
                                    const labels = [
                                        'Métricas adicionales',
                                        'Comunicación SDR',
                                    ];
                                    // Contar cuántos separadores van antes de este índice
                                    const sepIndex = ROWS_RESUMEN.slice(0, i).filter(r => r === null).length;
                                    const label = labels[sepIndex] || 'Más métricas';
                                    return (
                                        <TableRow key={`sep-${i}`}>
                                            <TableCell colSpan={3} sx={{ py: 0.5 }}>
                                                <Divider>
                                                    <Chip label={label} size="small" variant="outlined" />
                                                </Divider>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }
                                const valA = aggA[row.key] ?? 0;
                                const valB = aggB[row.key] ?? 0;
                                const tA = aggA.contactos;
                                const tB = aggB.contactos;
                                const selected = filtroMetrica === row.key;
                                return (
                                    <TableRow
                                        key={row.key}
                                        onClick={row.filtrable ? () => onFiltroChange(selected ? null : row.key) : undefined}
                                        sx={{
                                            cursor: row.filtrable ? 'pointer' : 'default',
                                            bgcolor: selected ? 'action.selected' : 'inherit',
                                            '&:hover': row.filtrable ? { bgcolor: 'action.hover' } : {},
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {row.label}
                                                {row.filtrable && (
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
                                            {row.isText ? (
                                                <strong>{valA}</strong>
                                            ) : (
                                                <>
                                                    <strong>{valA}</strong>
                                                    {row.key !== 'contactos' && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                            ({pct(valA, tA)})
                                                        </Typography>
                                                    )}
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {row.isText ? (
                                                <strong>{valB}</strong>
                                            ) : (
                                                <>
                                                    <strong>{valB}</strong>
                                                    {row.key !== 'contactos' && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                            ({pct(valB, tB)})
                                                        </Typography>
                                                    )}
                                                </>
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

const FLAG_COLS = [
    { key: 'completaron', label: 'Completó', tooltip: 'A: calificado/quiere_meet. B: 1er movimiento en Firestore.' },
    { key: 'abrieronLink', label: 'Link agenda', tooltip: 'Evento calendario_click en Firestore.' },
    { key: 'agendaronReunion', label: 'Reunión', tooltip: 'ReunionSDR con estado ≠ cancelada.' },
    { key: 'crearonEmpresaReal', label: 'Emp. real', tooltip: 'Empresa Firestore con esDemo!==true.' },
    { key: 'generaronMovimiento', label: 'Movimiento', tooltip: 'Al menos 1 movimiento en empresa real.' },
];

function FlagCell({ value }) {
    if (!value || value === 0) {
        return <Typography variant="body2" color="text.disabled">—</Typography>;
    }
    if (value === 1) {
        return <Chip size="small" label="✓" color="success" sx={{ minWidth: 32, fontSize: '0.75rem' }} />;
    }
    return <Chip size="small" label={`×${value}`} color="error" sx={{ minWidth: 32, fontSize: '0.75rem' }} />;
}

function TablaUnificada({ contactos, filtroMetrica, filtroVariante, onFiltroChange, onVarianteChange, onToggleIgnorar }) {
    const listaA = (contactos.A || []).map(c => ({ ...c, variante: 'A' }));
    const listaB = (contactos.B || []).map(c => ({ ...c, variante: 'B' }));
    const listaBase = filtroVariante === 'A' ? listaA : filtroVariante === 'B' ? listaB : [...listaA, ...listaB];
    const lista = filtroMetrica ? listaBase.filter(c => c._flags?.[filtroMetrica]) : listaBase;

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
                        {filtroMetrica && (
                            <>
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="caption" color="text.secondary">Filtro:</Typography>
                                <Chip
                                    size="small"
                                    label={`${filtroMetrica} ✕`}
                                    color="primary"
                                    variant="filled"
                                    onClick={() => onFiltroChange(null)}
                                    sx={{ cursor: 'pointer', fontSize: '0.65rem' }}
                                />
                            </>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {lista.length} contactos
                        </Typography>
                    </Stack>
                }
            />
            <CardContent sx={{ pt: 0 }}>
                {lista.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No hay contactos con los filtros actuales.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nombre</TableCell>
                                    <TableCell>Teléfono</TableCell>
                                    <TableCell align="center">Variante</TableCell>
                                    <TableCell>Estado</TableCell>
                                    {FLAG_COLS.map(col => (
                                        <TableCell key={col.key} align="center">
                                            <Tooltip
                                                title={<Typography variant="caption">{col.tooltip}</Typography>}
                                                placement="top"
                                                arrow
                                            >
                                                <span>{col.label}</span>
                                            </Tooltip>
                                        </TableCell>
                                    ))}
                                    <TableCell align="center">Msj</TableCell>
                                    <TableCell align="center">
                                        <Tooltip
                                            title={<Typography variant="caption">Atendidas / No atendidas</Typography>}
                                            placement="top"
                                            arrow
                                        >
                                            <span>Llamadas</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip
                                            title={<Typography variant="caption">Mensajes WhatsApp (contador SDR)</Typography>}
                                            placement="top"
                                            arrow
                                        >
                                            <span>WA</span>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell align="center"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lista.map((c) => (
                                <TableRow
                                        key={c._id}
                                        sx={c.ab_test_ignorado ? { opacity: 0.4, background: '#f5f5f5', textDecoration: 'line-through' } : {}}
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
                                            <Chip size="small" label={c.estado} variant="outlined" />
                                        </TableCell>
                                        {FLAG_COLS.map(col => (
                                            <TableCell key={col.key} align="center">
                                                <FlagCell value={c._flags?.[col.key]} />
                                            </TableCell>
                                        ))}
                                        <TableCell align="center">
                                            <Typography variant="caption">
                                                {c._flags?.mensajes ?? '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="caption">
                                                {(c._flags?.llamadasAtendidas || c._flags?.llamadasNoAtendidas)
                                                    ? `${c._flags.llamadasAtendidas}/${c._flags.llamadasNoAtendidas}`
                                                    : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="caption">
                                                {c._flags?.mensajesWA ?? '—'}
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

const AbTestContactActivationPage = () => {
    const [test, setTest] = useState(null);
    const [contactos, setContactos] = useState({ A: [], B: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pesoA, setPesoA] = useState(50);
    const [savingPesos, setSavingPesos] = useState(false);
    const [filtroMetrica, setFiltroMetrica] = useState(null);
    const [filtroVariante, setFiltroVariante] = useState('todos');

    const handleToggleIgnorar = async (contactoId, ignorar) => {
        // Actualización optimista
        setContactos(prev => {
            const update = (lista) => lista.map(c =>
                String(c._id) === String(contactoId) ? { ...c, ab_test_ignorado: ignorar } : c
            );
            return { A: update(prev.A), B: update(prev.B) };
        });
        try {
            await abTestService.toggleIgnorar(TEST_NAME, contactoId, ignorar);
        } catch (err) {
            // Revertir si falla
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

            // Sincronizar slider de pesos con datos del test
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
            console.error('Error cambiando estado:', err);
            setError(err.response?.data?.error || err.message);
        }
    };

    const handleGuardarPesos = async () => {
        try {
            setSavingPesos(true);
            await abTestService.actualizarPesos(TEST_NAME, { A: pesoA, B: 100 - pesoA });
            fetchData();
        } catch (err) {
            console.error('Error guardando pesos:', err);
            setError(err.response?.data?.error || err.message);
        } finally {
            setSavingPesos(false);
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
                            <NextLink href="/abTestComparacion" passHref legacyBehavior>
                                <Button
                                    component="a"
                                    size="small"
                                    variant="outlined"
                                    startIcon={<CompareIcon />}
                                >
                                    Comparación histórica
                                </Button>
                            </NextLink>
                            {test && (
                                <>
                                    <Tooltip title="Exportar PDF">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<PdfIcon />}
                                            onClick={() => exportTestToPDF(test, contactos)}
                                        >
                                            PDF
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Exportar TXT">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<TxtIcon />}
                                            onClick={() => exportTestToTXT(test, contactos)}
                                        >
                                            TXT
                                        </Button>
                                    </Tooltip>
                                </>
                            )}
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

                                        {/* Distribución de variantes */}
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

                            {/* Métricas resumen */}
                            <Box sx={{ mb: 3 }}>
                                <MetricasResumen
                                    contactos={contactos}
                                    filtroMetrica={filtroMetrica}
                                    onFiltroChange={setFiltroMetrica}
                                />
                            </Box>

                            {/* Tabla unificada */}
                            <TablaUnificada
                                contactos={contactos}
                                filtroMetrica={filtroMetrica}
                                filtroVariante={filtroVariante}
                                onFiltroChange={setFiltroMetrica}
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

AbTestContactActivationPage.getLayout = (page) => (
    <DashboardLayout>{page}</DashboardLayout>
);

export default AbTestContactActivationPage;
