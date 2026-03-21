import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
    Box, Container, Stack, Typography, Button, Chip, Grid,
    CircularProgress, Paper, IconButton, Card, CardContent, CardActions,
    Snackbar, Alert, Divider, Tabs, Tab, Badge, Switch, FormControlLabel,
    Tooltip, useTheme, useMediaQuery, Skeleton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Event as EventIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    OpenInNew as OpenInNewIcon,
    ContentCopy as ContentCopyIcon,
    ArrowBack as ArrowBackIcon,
    EventBusy as EventBusyIcon,
    Add as AddIcon,
    Today as TodayIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import DescriptionIcon from '@mui/icons-material/Description';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import ModalResultadoReunion from 'src/components/sdr/ModalResultadoReunion';
import CalendarSyncPendientes from 'src/components/sdr/CalendarSyncPendientes';
import SyncIcon from '@mui/icons-material/Sync';

// ==================== HELPERS ====================

const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatearHora = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const formatearFechaCompleta = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const esHoy = (fecha) => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const hoy = new Date();
    return d.toDateString() === hoy.toDateString();
};

const esFuturo = (fecha) => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    return d >= manana;
};

const esPasado = (fecha) => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return d < hoy;
};

const getCountdown = (fecha) => {
    if (!fecha) return '';
    const ahora = new Date();
    const d = new Date(fecha);
    const diffMs = d - ahora;
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin > 0 && diffMin < 60) return `En ${diffMin} min`;
    if (diffMin >= 60 && diffMin < 1440) return `En ${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
    if (diffMin < 0 && diffMin > -60) return `Hace ${Math.abs(diffMin)} min`;
    if (diffMin <= -60 && diffMin > -1440) return `Hace ${Math.floor(Math.abs(diffMin) / 60)}h`;
    return '';
};

const getAntiguedadSinRegistrar = (fecha) => {
    if (!fecha) return 0;
    const d = new Date(fecha);
    const ahora = new Date();
    return Math.floor((ahora - d) / (1000 * 60 * 60));
};

const getCalificacionChip = (calificacion) => {
    const map = {
        frio: { label: '❄️ Frío', color: 'info' },
        tibio: { label: '🌤️ Tibio', color: 'warning' },
        caliente: { label: '🔥 Caliente', color: 'error' },
        listo_para_cerrar: { label: '🎯 Listo', color: 'success' }
    };
    return map[calificacion] || null;
};

// ==================== COMPONENTE CARD DE REUNIÓN ====================

const ReunionCard = ({ reunion, variant = 'hoy', onMarcarRealizada, onMarcarNoShow, onCancelar, onVerContacto, onCopiarLink, mostrarSnackbar, mostrarSDR = false }) => {
    const contacto = reunion.contactoId || {};
    const fechaReunion = reunion.fecha || reunion.fechaHora;
    const countdown = getCountdown(fechaReunion);
    const horasAntigua = getAntiguedadSinRegistrar(fechaReunion);

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: variant === 'sin_registrar' && horasAntigua > 24
                    ? '4px solid #f44336'
                    : variant === 'sin_registrar'
                        ? '4px solid #ff9800'
                        : variant === 'hoy'
                            ? '4px solid #2196f3'
                            : '4px solid #e0e0e0'
            }}
        >
            <CardContent sx={{ pb: 1, flex: 1, '&:last-child': { pb: 1 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                {formatearHora(fechaReunion)}
                            </Typography>
                            {countdown && (
                                <Chip
                                    label={countdown}
                                    size="small"
                                    color={countdown.startsWith('Hace') ? 'warning' : 'info'}
                                    variant="outlined"
                                />
                            )}
                            {reunion.calificacionRapida && (() => {
                                const chip = getCalificacionChip(reunion.calificacionRapida);
                                return chip ? <Chip label={chip.label} size="small" color={chip.color} /> : null;
                            })()}
                            {reunion.origen === 'auto_calendar' && (
                                <Chip label="🤖 Bot" size="small" color="secondary" variant="outlined" />
                            )}
                        </Stack>

                        <Typography variant="body1" fontWeight={500}>
                            {contacto.nombre || reunion.contactoPrincipal || 'Sin nombre'}
                            {(contacto.empresa || reunion.empresaNombre) && (
                                <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                                    — {contacto.empresa || reunion.empresaNombre}
                                </Typography>
                            )}
                        </Typography>

                        {/* SDR asignado (modo ver todas) */}
                        {mostrarSDR && (contacto.sdrAsignadoNombre || reunion.sdrAsignadoNombre) && (
                            <Chip
                                icon={<PeopleIcon fontSize="small" />}
                                label={contacto.sdrAsignadoNombre || reunion.sdrAsignadoNombre}
                                size="small"
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                            />
                        )}

                        {/* Resumen SDR del contacto (si existe) */}
                        {variant === 'hoy' && contacto.resumenSDR && (
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'grey.50', maxHeight: 120, overflow: 'auto' }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    📋 Resumen SDR
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.8rem' }}>
                                    {contacto.resumenSDR.substring(0, 500)}{contacto.resumenSDR.length > 500 ? '...' : ''}
                                </Typography>
                            </Paper>
                        )}

                        {/* Link de reunión */}
                        {reunion.link && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <Chip
                                    label="Link reunión"
                                    size="small"
                                    icon={<OpenInNewIcon />}
                                    onClick={() => window.open(reunion.link, '_blank')}
                                    clickable
                                    color="primary"
                                    variant="outlined"
                                />
                                <Tooltip title="Copiar link">
                                    <IconButton size="small" onClick={() => onCopiarLink(reunion.link)}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        )}

                        {/* Comentario (para tab realizadas) */}
                        {variant === 'realizada' && reunion.comentario && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                💬 {reunion.comentario.substring(0, 200)}{reunion.comentario.length > 200 ? '...' : ''}
                            </Typography>
                        )}

                        {/* Módulos de interés */}
                        {reunion.modulosInteres?.length > 0 && (
                            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                {reunion.modulosInteres.map(m => (
                                    <Chip key={m} label={m} size="small" variant="outlined" />
                                ))}
                            </Stack>
                        )}

                        {/* Alerta sin registrar */}
                        {variant === 'sin_registrar' && (
                            <Alert
                                severity={horasAntigua > 24 ? 'error' : 'warning'}
                                sx={{ mt: 1, py: 0 }}
                            >
                                {horasAntigua > 24
                                    ? `⚠️ Hace más de ${Math.floor(horasAntigua / 24)} día(s) sin registrar`
                                    : `Hace ${horasAntigua}h sin registrar`
                                }
                            </Alert>
                        )}

                        {/* Próxima tarea del contacto (tab realizadas) */}
                        {variant === 'realizada' && contacto.proximaTarea?.tipo && (
                            <Chip
                                label={`Próximo: ${contacto.proximaTarea.tipo.replace(/_/g, ' ')}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mt: 1 }}
                            />
                        )}
                        {variant === 'realizada' && !contacto.proximaTarea?.tipo && (
                            <Chip
                                label="⚠️ Sin próximo paso"
                                size="small"
                                color="warning"
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Box>
                </Stack>
            </CardContent>
            <CardActions sx={{ pt: 0, px: 2, pb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                {/* Acciones según variant */}
                {(variant === 'hoy' || variant === 'sin_registrar') && (
                    <>
                        <Button size="small" color="success" variant="contained" onClick={() => onMarcarRealizada(reunion)}>
                            ✅ Realizada
                        </Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => onMarcarNoShow(reunion)}>
                            ❌ No show
                        </Button>
                    </>
                )}
                {variant === 'proxima' && (
                    <>
                        <Button size="small" variant="outlined" onClick={() => onCancelar(reunion)}>
                            Cancelar
                        </Button>
                    </>
                )}
                {variant === 'no_show' && (
                    <>
                        <Button size="small" variant="contained" onClick={() => onMarcarRealizada(reunion)}>
                            Reagendar
                        </Button>
                    </>
                )}
                <Button
                    size="small"
                    onClick={() => onVerContacto(reunion)}
                    endIcon={<OpenInNewIcon fontSize="small" />}
                >
                    Ver contacto
                </Button>
            </CardActions>
        </Card>
    );
};

// ==================== TABS CONFIG ====================
const TABS = [
    { key: 'hoy', label: 'Hoy', icon: <TodayIcon fontSize="small" /> },
    { key: 'proximas', label: 'Próximas', icon: <ScheduleIcon fontSize="small" /> },
    { key: 'sin_registrar', label: 'Sin registrar', icon: <EditCalendarIcon fontSize="small" /> },
    { key: 'realizadas', label: 'Realizadas', icon: <CheckCircleIcon fontSize="small" /> },
    { key: 'no_show', label: 'No show', icon: <PersonOffIcon fontSize="small" /> },
    { key: 'propuestas', label: 'Propuestas', icon: <DescriptionIcon fontSize="small" /> },
    { key: 'calendar_sync', label: 'Calendar', icon: <SyncIcon fontSize="small" /> }
];

// ==================== PÁGINA PRINCIPAL ====================

const ReunionesSDRPage = () => {
    const { user } = useAuthContext();
    const router = useRouter();
    const empresaId = user?.empresa?.id || 'demo-empresa';
    const sdrId = user?.user_id;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estado
    const [tab, setTab] = useState(0);
    const [reuniones, setReuniones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [verTodas, setVerTodas] = useState(false);

    // Determinar si el usuario puede ver todas las reuniones
    const puedeVerTodas = user?.admin || user?.sdr_admin;

    // Modales
    const [modalResultado, setModalResultado] = useState(false);
    const [reunionSeleccionada, setReunionSeleccionada] = useState(null);

    // No Show dialog
    const [noShowDialog, setNoShowDialog] = useState(false);
    const [noShowComentario, setNoShowComentario] = useState('');
    const [reunionNoShow, setReunionNoShow] = useState(null);

    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    // ==================== CARGAR DATOS ====================

    const cargarReuniones = useCallback(async () => {
        setLoading(true);
        try {
            const params = { limit: 200 };
            if (!verTodas) {
                params.sdrAsignado = sdrId;
            }
            const data = await SDRService.listarReuniones(params);
            setReuniones(data.reuniones || []);
        } catch (error) {
            console.error('Error cargando reuniones:', error);
            mostrarSnackbar('Error al cargar reuniones', 'error');
        } finally {
            setLoading(false);
        }
    }, [sdrId, verTodas]);

    useEffect(() => {
        if (sdrId) cargarReuniones();
    }, [sdrId, cargarReuniones]);

    // ==================== CLASIFICACIÓN POR TAB ====================

    const clasificar = useCallback(() => {
        const hoy = [];
        const proximas = [];
        const sinRegistrar = [];
        const realizadas = [];
        const noShow = [];
        const propuestas = [];

        reuniones.forEach(r => {
            const fecha = r.fecha || r.fechaHora;
            const contacto = r.contactoId || {};

            if (r.estado === 'realizada') {
                realizadas.push(r);
                // También propuestas si el contacto está en cierre
                if (contacto.estado === 'cierre') {
                    propuestas.push(r);
                }
                return;
            }
            if (r.estado === 'no_show') {
                noShow.push(r);
                return;
            }
            if (r.estado === 'cancelada') {
                return; // No se muestran en ningún tab activo
            }

            // Estado = agendada
            if (esHoy(fecha)) {
                hoy.push(r);
            } else if (esFuturo(fecha)) {
                proximas.push(r);
            } else if (esPasado(fecha)) {
                sinRegistrar.push(r);
            }
        });

        // Ordenar
        hoy.sort((a, b) => new Date(a.fecha || a.fechaHora) - new Date(b.fecha || b.fechaHora));
        proximas.sort((a, b) => new Date(a.fecha || a.fechaHora) - new Date(b.fecha || b.fechaHora));
        sinRegistrar.sort((a, b) => new Date(a.fecha || a.fechaHora) - new Date(b.fecha || b.fechaHora));
        realizadas.sort((a, b) => new Date(b.fecha || b.fechaHora) - new Date(a.fecha || a.fechaHora));
        noShow.sort((a, b) => new Date(b.fecha || b.fechaHora) - new Date(a.fecha || a.fechaHora));

        return { hoy, proximas, sinRegistrar, realizadas, noShow, propuestas };
    }, [reuniones]);

    const { hoy, proximas, sinRegistrar, realizadas, noShow, propuestas } = clasificar();

    // ==================== ACCIONES ====================

    const handleMarcarRealizada = (reunion) => {
        setReunionSeleccionada(reunion);
        setModalResultado(true);
    };

    const handleMarcarNoShow = (reunion) => {
        setReunionNoShow(reunion);
        setNoShowComentario('');
        setNoShowDialog(true);
    };

    const handleConfirmarNoShow = async () => {
        if (!reunionNoShow) return;
        setActionLoading(true);
        try {
            await SDRService.evaluarReunion(reunionNoShow._id, {
                estado: 'no_show',
                comentario: noShowComentario || undefined
            });
            mostrarSnackbar('Reunión marcada como no show');
            setNoShowDialog(false);
            setReunionNoShow(null);
            setNoShowComentario('');
            cargarReuniones();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelar = async (reunion) => {
        setActionLoading(true);
        try {
            await SDRService.evaluarReunion(reunion._id, { estado: 'cancelada' });
            mostrarSnackbar('Reunión cancelada');
            cargarReuniones();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerContacto = (reunion) => {
        const contactoId = reunion.contactoId?._id || reunion.contactoId;
        if (contactoId) {
            router.push(`/sdr/contacto/${contactoId}`);
        }
    };

    const handleCopiarLink = (link) => {
        navigator.clipboard.writeText(link);
        mostrarSnackbar('Link copiado al portapapeles');
    };

    const handleSubmitResultado = async (data) => {
        if (!reunionSeleccionada) return;
        setActionLoading(true);
        try {
            // 1. Cambiar estado de la reunión
            await SDRService.evaluarReunion(reunionSeleccionada._id, {
                estado: data.estado,
                motivoRechazo: data.estado === 'cancelada' ? data.comentario : undefined,
                notasEvaluador: data.comentario
            });

            // 2. Actualizar campos de Fase 3 en la reunión
            if (data.estado === 'realizada') {
                await SDRService.actualizarReunion(reunionSeleccionada._id, {
                    comentario: data.comentario,
                    transcripcion: data.transcripcion,
                    modulosInteres: data.modulosInteres,
                    calificacionRapida: data.calificacionRapida
                });

                // 3. Si hay transcripción, procesar con IA
                if (data.transcripcion && data.transcripcion.trim().length >= 50) {
                    try {
                        await SDRService.procesarTranscripcion(reunionSeleccionada._id);
                        mostrarSnackbar('Reunión registrada y resumen IA generado ✨');
                    } catch (iaError) {
                        console.warn('Error procesando transcripción con IA:', iaError);
                        mostrarSnackbar('Reunión registrada (error al generar resumen IA)', 'warning');
                    }
                }
            }

            // 4. Establecer próxima tarea si se definió
            if (data.proximoContacto?.tipo && data.proximoContacto?.fecha) {
                const contactoId = reunionSeleccionada.contactoId?._id || reunionSeleccionada.contactoId;
                if (contactoId) {
                    await SDRService.actualizarProximoContacto(contactoId, null, null, {
                        tipo: data.proximoContacto.tipo,
                        fecha: data.proximoContacto.fecha,
                        nota: data.proximoContacto.nota || ''
                    });
                }
            }

            if (!data.transcripcion || data.transcripcion.trim().length < 50) {
                mostrarSnackbar('Reunión registrada ✅');
            }
            setModalResultado(false);
            setReunionSeleccionada(null);
            cargarReuniones();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al registrar resultado', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ==================== AGRUPAR PRÓXIMAS POR DÍA ====================

    const agruparPorDia = (reunionesList) => {
        const grupos = {};
        reunionesList.forEach(r => {
            const fecha = r.fecha || r.fechaHora;
            const key = new Date(fecha).toDateString();
            if (!grupos[key]) {
                grupos[key] = { label: formatearFechaCompleta(fecha), reuniones: [] };
            }
            grupos[key].reuniones.push(r);
        });
        return Object.values(grupos);
    };

    // ==================== RENDER HELPERS ====================

    const renderEmptyState = (emoji, texto) => (
        <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>{emoji}</Typography>
            <Typography color="text.secondary">{texto}</Typography>
        </Box>
    );

    const renderCardItem = (r, variant) => (
        <Grid item xs={12} md={6} key={r._id}>
            <ReunionCard
                reunion={r}
                variant={variant}
                onMarcarRealizada={handleMarcarRealizada}
                onMarcarNoShow={handleMarcarNoShow}
                onCancelar={handleCancelar}
                onVerContacto={handleVerContacto}
                onCopiarLink={handleCopiarLink}
                mostrarSnackbar={mostrarSnackbar}
                mostrarSDR={verTodas}
            />
        </Grid>
    );

    const renderReuniones = (list, variant) => {
        if (list.length === 0) {
            const mensajes = {
                hoy: ['🎉', 'No tenés reuniones para hoy.'],
                proxima: ['📅', 'No hay reuniones próximas agendadas.'],
                sin_registrar: ['✨', '¡Genial! No hay reuniones pendientes de registrar.'],
                realizada: ['📋', 'No hay reuniones realizadas aún.'],
                no_show: ['👍', 'No hay reuniones con no show.'],
                propuestas: ['📄', 'No hay contactos en fase de propuesta.']
            };
            const [emoji, msg] = mensajes[variant] || ['📋', 'Sin resultados'];
            return renderEmptyState(emoji, msg);
        }

        if (variant === 'proxima') {
            // Agrupar por día
            const grupos = agruparPorDia(list);
            return grupos.map((grupo, idx) => (
                <Box key={idx} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600, textTransform: 'capitalize' }}>
                        ── {grupo.label} ──
                    </Typography>
                    <Grid container spacing={2}>
                        {grupo.reuniones.map(r => renderCardItem(r, variant))}
                    </Grid>
                </Box>
            ));
        }

        return (
            <Grid container spacing={2}>
                {list.map(r => renderCardItem(r, variant))}
            </Grid>
        );
    };

    // ==================== RENDER ====================

    const tabCounts = [hoy.length, proximas.length, sinRegistrar.length, realizadas.length, noShow.length, propuestas.length, 0];

    return (
        <>
            <Head>
                <title>{verTodas ? 'Todas las Reuniones' : 'Mis Reuniones'} | SDR</title>
            </Head>
            <Box sx={{ flexGrow: 1, py: isMobile ? 1 : 3, px: isMobile ? 1 : 2 }}>
                <Container maxWidth="xl">
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton onClick={() => router.push('/contactosSDR')}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={600}>
                                {verTodas ? '📅 Todas las Reuniones' : '📅 Mis Reuniones'}
                            </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {puedeVerTodas && (
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={verTodas}
                                            onChange={(e) => setVerTodas(e.target.checked)}
                                            size="small"
                                        />
                                    }
                                    label={isMobile ? 'Todas' : 'Ver todas'}
                                    sx={{ mr: 0 }}
                                />
                            )}
                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={cargarReuniones}
                                disabled={loading}
                                size="small"
                            >
                                {isMobile ? '' : 'Actualizar'}
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Tabs */}
                    <Paper variant="outlined" sx={{ mb: 2, overflow: 'visible' }}>
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontSize: '0.85rem', overflow: 'visible' },
                                '& .MuiTabs-scroller': { overflow: 'visible !important' }
                            }}
                        >
                            {TABS.map((t, idx) => (
                                <Tab
                                    key={t.key}
                                    label={
                                        <Badge
                                            badgeContent={tabCounts[idx]}
                                            color={
                                                t.key === 'sin_registrar' && tabCounts[idx] > 0 ? 'error'
                                                    : t.key === 'hoy' ? 'primary'
                                                        : 'default'
                                            }
                                            max={99}
                                            sx={{ pr: tabCounts[idx] > 0 ? 1.5 : 0 }}
                                        >
                                            <Stack direction="row" spacing={0.75} alignItems="center">
                                                {t.icon}
                                                <span>{t.label}</span>
                                            </Stack>
                                        </Badge>
                                    }
                                />
                            ))}
                        </Tabs>
                    </Paper>

                    {/* Content */}
                    {loading ? (
                        <Grid container spacing={2}>
                            {[1, 2, 3, 4].map(i => (
                                <Grid item xs={12} md={6} key={i}>
                                    <Skeleton variant="rounded" height={120} />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box>
                            {tab === 0 && renderReuniones(hoy, 'hoy')}
                            {tab === 1 && renderReuniones(proximas, 'proxima')}
                            {tab === 2 && renderReuniones(sinRegistrar, 'sin_registrar')}
                            {tab === 3 && renderReuniones(realizadas, 'realizada')}
                            {tab === 4 && renderReuniones(noShow, 'no_show')}
                            {tab === 5 && renderReuniones(propuestas, 'propuestas')}
                            {tab === 6 && <CalendarSyncPendientes empresaId={empresaId} onVinculado={cargarReuniones} />}
                        </Box>
                    )}
                </Container>
            </Box>

            {/* Modal Resultado de Reunión */}
            <ModalResultadoReunion
                open={modalResultado}
                onClose={() => { setModalResultado(false); setReunionSeleccionada(null); }}
                reunion={reunionSeleccionada}
                onSubmit={handleSubmitResultado}
                loading={actionLoading}
            />

            {/* Dialog No Show con comentario */}
            <Dialog open={noShowDialog} onClose={() => setNoShowDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar No Show</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        value={noShowComentario}
                        onChange={(e) => setNoShowComentario(e.target.value)}
                        placeholder="¿Qué pasó? ej: me dejó en visto, no se conectó..."
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNoShowDialog(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmarNoShow} disabled={actionLoading}>
                        {actionLoading ? <CircularProgress size={20} /> : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

ReunionesSDRPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ReunionesSDRPage;
