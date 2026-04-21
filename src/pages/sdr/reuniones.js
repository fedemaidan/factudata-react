import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
    Box, Container, Stack, Typography, Button, Chip, Grid,
    CircularProgress, Paper, IconButton, Card, CardContent, CardActions,
    Snackbar, Alert, Divider, Tabs, Tab, Badge, Switch, FormControlLabel,
    Tooltip, useTheme, useMediaQuery, Skeleton, Collapse,
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
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import { appendBrowserTimezoneOffset } from 'src/utils/sdrDateTime';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import ModalResultadoReunion from 'src/components/sdr/ModalResultadoReunion';
import CalendarSyncPendientes from 'src/components/sdr/CalendarSyncPendientes';
import SyncIcon from '@mui/icons-material/Sync';
import ReunionCardSDR from 'src/components/sdr/ReunionCardSDR';

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

// ==================== TABS CONFIG ====================
const TABS = [
    { key: 'hoy', label: 'Hoy', icon: <TodayIcon fontSize="small" /> },
    { key: 'proximas', label: 'Próximas', icon: <ScheduleIcon fontSize="small" /> },
    { key: 'sin_registrar', label: 'Sin registrar', icon: <EditCalendarIcon fontSize="small" /> },
    { key: 'realizadas', label: 'Realizadas', icon: <CheckCircleIcon fontSize="small" /> },
    { key: 'no_show', label: 'No show', icon: <PersonOffIcon fontSize="small" /> },
    { key: 'propuestas', label: 'Propuestas', icon: <DescriptionIcon fontSize="small" /> },
    { key: 'canceladas', label: 'Canceladas', icon: <EventBusyIcon fontSize="small" /> },
    { key: 'calendar_sync', label: 'Calendario', icon: <SyncIcon fontSize="small" /> }
];

// ==================== PÁGINA PRINCIPAL ====================

const ReunionesSDRPage = () => {
    const { user } = useAuthContext();
    const router = useRouter();
    const empresaId = user?.empresa?.id || user?.empresaData?.id || user?.empresa_id || 'demo-empresa';
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
    const [filtros, setFiltros] = useState({ desde: '', hasta: '' });
    const [showFiltros, setShowFiltros] = useState(false);

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

    // Reuniones filtradas por rango de fecha (se aplica antes de clasificar por tabs)
    const reunionesFiltradas = useMemo(() => {
        let result = reuniones;
        if (filtros.desde) {
            const desde = new Date(filtros.desde + 'T00:00:00');
            result = result.filter(r => new Date(r.fecha || r.fechaHora) >= desde);
        }
        if (filtros.hasta) {
            const hasta = new Date(filtros.hasta + 'T23:59:59');
            result = result.filter(r => new Date(r.fecha || r.fechaHora) <= hasta);
        }
        return result;
    }, [reuniones, filtros]);

    // ==================== CLASIFICACIÓN POR TAB ====================

    const clasificar = useCallback(() => {
        const hoy = [];
        const proximas = [];
        const sinRegistrar = [];
        const realizadas = [];
        const noShow = [];
        const propuestas = [];
        const canceladas = [];

        reunionesFiltradas.forEach(r => {
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
                canceladas.push(r);
                return;
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
        canceladas.sort((a, b) => new Date(b.fecha || b.fechaHora) - new Date(a.fecha || a.fechaHora));

        return { hoy, proximas, sinRegistrar, realizadas, noShow, propuestas, canceladas };
    }, [reunionesFiltradas]);

    const { hoy, proximas, sinRegistrar, realizadas, noShow, propuestas, canceladas } = clasificar();

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

    const [deleteDialog, setDeleteDialog] = useState(false);
    const [reunionAEliminar, setReunionAEliminar] = useState(null);

    const handleEliminar = (reunion) => {
        setReunionAEliminar(reunion);
        setDeleteDialog(true);
    };

    const handleConfirmarEliminar = async () => {
        if (!reunionAEliminar) return;
        setActionLoading(true);
        try {
            await SDRService.eliminarReunion(reunionAEliminar._id);
            mostrarSnackbar('Reunión eliminada');
            setDeleteDialog(false);
            setReunionAEliminar(null);
            cargarReuniones();
        } catch (error) {
            mostrarSnackbar(error.response?.data?.error || 'Error al eliminar', 'error');
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
                        fecha: appendBrowserTimezoneOffset(data.proximoContacto.fecha),
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
            <ReunionCardSDR
                reunion={r}
                variant={variant}
                onRealizada={() => handleMarcarRealizada(r)}
                onNoShow={() => handleMarcarNoShow(r)}
                onCancelada={() => handleCancelar(r)}
                onDelete={() => handleEliminar(r)}
                onVerContacto={() => handleVerContacto(r)}
                onCopiarLink={handleCopiarLink}
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
                cancelada: ['❌', 'No hay reuniones canceladas en este período.'],
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

    const tabCounts = [hoy.length, proximas.length, sinRegistrar.length, realizadas.length, noShow.length, propuestas.length, canceladas.length, 0];

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
                            <Button
                                size="small"
                                variant={showFiltros ? 'contained' : 'outlined'}
                                onClick={() => setShowFiltros(v => !v)}
                                color={filtros.desde || filtros.hasta ? 'primary' : 'inherit'}
                            >
                                {filtros.desde || filtros.hasta ? '🔍 Filtros activos' : '🔍 Filtrar'}
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Filtros de período */}
                    <Collapse in={showFiltros}>
                        <Paper variant="outlined" sx={{ mb: 2, p: 1.5 }}>
                            <Stack direction={isMobile ? 'column' : 'row'} spacing={1.5} alignItems={isMobile ? 'stretch' : 'center'} flexWrap="wrap">
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Filtrar por período:
                                </Typography>
                                <TextField
                                    label="Desde"
                                    type="date"
                                    size="small"
                                    value={filtros.desde}
                                    onChange={(e) => setFiltros(f => ({ ...f, desde: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: 150 }}
                                />
                                <TextField
                                    label="Hasta"
                                    type="date"
                                    size="small"
                                    value={filtros.hasta}
                                    onChange={(e) => setFiltros(f => ({ ...f, hasta: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: 150 }}
                                />
                                {(filtros.desde || filtros.hasta) && (
                                    <>
                                        <Button
                                            size="small"
                                            onClick={() => setFiltros({ desde: '', hasta: '' })}
                                            variant="outlined"
                                            color="inherit"
                                        >
                                            Limpiar
                                        </Button>
                                        <Typography variant="caption" color="text.secondary">
                                            {reunionesFiltradas.length} de {reuniones.length} reuniones
                                        </Typography>
                                    </>
                                )}
                            </Stack>
                        </Paper>
                    </Collapse>

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
                            {tab === 6 && renderReuniones(canceladas, 'cancelada')}
                            {tab === 7 && <CalendarSyncPendientes empresaId={empresaId} onVinculado={cargarReuniones} />}
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

            {/* Dialog Eliminar reunión */}
            <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>¿Eliminar reunión?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Esta acción es irreversible. La reunión se eliminará permanentemente.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmarEliminar} disabled={actionLoading}>
                        {actionLoading ? <CircularProgress size={20} /> : 'Eliminar'}
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
