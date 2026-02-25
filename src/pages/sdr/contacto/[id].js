import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    CircularProgress, Paper, IconButton, Card, CardContent,
    Snackbar, Alert, Avatar, Tooltip, Divider, Grid,
    useTheme, useMediaQuery, Skeleton
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Phone as PhoneIcon,
    WhatsApp as WhatsAppIcon,
    Email as EmailIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Send as SendIcon,
    PhoneMissed as PhoneMissedIcon,
    DoNotDisturb as DoNotDisturbIcon,
    Event as EventIcon,
    Edit as EditIcon,
    Refresh as RefreshIcon,
    AccessTime as AccessTimeIcon,
    Schedule as ScheduleIcon,
    History as HistoryIcon,
    Comment as CommentIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    PersonAdd as PersonAddIcon,
    PersonRemove as PersonRemoveIcon,
    LinkedIn as LinkedInIcon,
    CloudDownload as ImportIcon,
    PhoneDisabled as PhoneDisabledIcon,
    FiberNew as NewIcon,
    Verified as VerifiedIcon,
    Block as BlockIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    SkipNext as SkipNextIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import { EstadoChip, EstadoChipEditable } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalRegistrarAccion from 'src/components/sdr/ModalRegistrarAccion';
import { getWhatsAppLink, getTelLink } from 'src/utils/phoneUtils';
import {
    PLANES_SORBY,
    INTENCIONES_COMPRA,
    PRECALIFICACION_BOT,
    ESTADOS_REUNION
} from 'src/constant/sdrConstants';

// ==================== CONSTANTES ====================

const getEventoColor = (tipo) => {
    const colores = {
        'llamada_atendida': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'llamada_no_atendida': { bg: '#fff3e0', border: '#ff9800', icon: '#e65100' },
        'whatsapp_enviado': { bg: '#e3f2fd', border: '#2196f3', icon: '#1565c0' },
        'email_enviado': { bg: '#e8eaf6', border: '#3f51b5', icon: '#283593' },
        'linkedin_enviado': { bg: '#e1f5fe', border: '#0288d1', icon: '#01579b' },
        'reunion_coordinada': { bg: '#f3e5f5', border: '#9c27b0', icon: '#6a1b9a' },
        'reunion_aprobada': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'reunion_rechazada': { bg: '#ffebee', border: '#f44336', icon: '#c62828' },
        'marcado_no_califica': { bg: '#fce4ec', border: '#e91e63', icon: '#880e4f' },
        'marcado_no_responde': { bg: '#fff8e1', border: '#ffc107', icon: '#ff8f00' },
        'contacto_creado': { bg: '#e0f2f1', border: '#009688', icon: '#00695c' },
        'contacto_asignado': { bg: '#e8f5e9', border: '#66bb6a', icon: '#388e3c' },
        'contacto_desasignado': { bg: '#efebe9', border: '#8d6e63', icon: '#5d4037' },
        'contacto_reasignado': { bg: '#fff3e0', border: '#ffb74d', icon: '#f57c00' },
        'importado_excel': { bg: '#e8f5e9', border: '#81c784', icon: '#43a047' },
        'importado_notion': { bg: '#ede7f6', border: '#7e57c2', icon: '#512da8' },
        'contexto_inicial': { bg: '#f5f5f5', border: '#9e9e9e', icon: '#616161' },
        'nota_agregada': { bg: '#fffde7', border: '#ffee58', icon: '#f9a825' },
        'comentario': { bg: '#fffde7', border: '#ffee58', icon: '#f9a825' },
        'proximo_contacto_programado': { bg: '#e1f5fe', border: '#29b6f6', icon: '#0277bd' },
        'contacto_editado': { bg: '#eceff1', border: '#90a4ae', icon: '#546e7a' },
        'estado_cambiado': { bg: '#e8eaf6', border: '#5c6bc0', icon: '#3949ab' },
        'plan_estimado_actualizado': { bg: '#eceff1', border: '#90a4ae', icon: '#546e7a' },
        'intencion_compra_actualizada': { bg: '#eceff1', border: '#90a4ae', icon: '#546e7a' },
    };
    return colores[tipo] || { bg: '#f5f5f5', border: '#bdbdbd', icon: '#757575' };
};

const getEventoIcon = (tipo) => {
    const iconos = {
        'llamada_atendida': <PhoneIcon fontSize="small" />,
        'llamada_no_atendida': <PhoneMissedIcon fontSize="small" />,
        'whatsapp_enviado': <WhatsAppIcon fontSize="small" />,
        'email_enviado': <EmailIcon fontSize="small" />,
        'linkedin_enviado': <LinkedInIcon fontSize="small" />,
        'reunion_coordinada': <EventIcon fontSize="small" />,
        'reunion_aprobada': <CheckCircleIcon fontSize="small" />,
        'reunion_rechazada': <CancelIcon fontSize="small" />,
        'marcado_no_califica': <DoNotDisturbIcon fontSize="small" />,
        'marcado_no_responde': <PhoneMissedIcon fontSize="small" />,
        'contacto_creado': <PersonAddIcon fontSize="small" />,
        'contacto_asignado': <AssignmentIcon fontSize="small" />,
        'contacto_desasignado': <PersonRemoveIcon fontSize="small" />,
        'contacto_reasignado': <AssignmentIcon fontSize="small" />,
        'importado_excel': <ImportIcon fontSize="small" />,
        'importado_notion': <ImportIcon fontSize="small" />,
        'contexto_inicial': <CommentIcon fontSize="small" />,
        'nota_agregada': <CommentIcon fontSize="small" />,
        'comentario': <CommentIcon fontSize="small" />,
        'proximo_contacto_programado': <EventIcon fontSize="small" />,
        'contacto_editado': <PersonIcon fontSize="small" />,
        'estado_cambiado': <EditIcon fontSize="small" />,
        'plan_estimado_actualizado': <TrendingUpIcon fontSize="small" />,
        'intencion_compra_actualizada': <TrendingUpIcon fontSize="small" />,
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

const botonesProximoContacto = [
    { label: '1h', cantidad: 1, unidad: 'hours' },
    { label: '3h', cantidad: 3, unidad: 'hours' },
    { label: 'Mañana', cantidad: 1, unidad: 'days' },
    { label: '3 días', cantidad: 3, unidad: 'days' },
    { label: '1 semana', cantidad: 7, unidad: 'days' },
];

const calcularFecha = (cantidad, unidad) => {
    const ahora = new Date();
    if (unidad === 'hours') ahora.setHours(ahora.getHours() + cantidad);
    else if (unidad === 'days') ahora.setDate(ahora.getDate() + cantidad);
    return ahora;
};

// ==================== PÁGINA ====================

const ContactoSDRDetailPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuthContext();
    const empresaId = user?.empresa?.id || 'demo-empresa';
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Estado principal
    const [contacto, setContacto] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [reuniones, setReuniones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Scoring
    const [guardandoScoring, setGuardandoScoring] = useState(false);
    const [editandoPrioridadManual, setEditandoPrioridadManual] = useState(false);
    const [valorPrioridadManual, setValorPrioridadManual] = useState('');

    // Próximo contacto
    const [guardandoProximo, setGuardandoProximo] = useState(false);

    // Comentario
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [enviandoComentario, setEnviandoComentario] = useState(false);

    // Modal de acción avanzada
    const [modalRegistrarAccion, setModalRegistrarAccion] = useState(false);

    // Cadencia
    const [pasoActual, setPasoActual] = useState(null);
    const [cadencias, setCadencias] = useState([]);
    const [cargandoCadencia, setCargandoCadencia] = useState(false);
    const [asignandoCadencia, setAsignandoCadencia] = useState(false);

    // Navegación entre contactos (IDs guardados en sessionStorage)
    const [contactoIds, setContactoIds] = useState([]);
    const [indiceActual, setIndiceActual] = useState(-1);

    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    // ==================== CARGA DE DATOS ====================

    const cargarContacto = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await SDRService.obtenerContacto(id);
            setContacto(data);
            setHistorial(data.historial || []);
            setReuniones(data.reuniones || []);
            
            // Cargar paso actual de cadencia si tiene cadencia activa
            if (data.cadenciaActiva?.cadenciaId && !data.cadenciaActiva?.completada) {
                try {
                    const paso = await SDRService.obtenerPasoActual(id);
                    setPasoActual(paso);
                } catch {
                    setPasoActual(null);
                }
            } else {
                setPasoActual(null);
            }
        } catch (err) {
            console.error('Error cargando contacto:', err);
            mostrarSnackbar('Error al cargar contacto', 'error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        cargarContacto();
    }, [cargarContacto]);

    // Cargar cadencias disponibles
    useEffect(() => {
        if (!empresaId) return;
        SDRService.listarCadencias(empresaId)
            .then(data => setCadencias(data || []))
            .catch(() => setCadencias([]));
    }, [empresaId]);

    // Cargar IDs de contactos para navegación
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem('sdr_contacto_ids');
            if (stored) {
                const ids = JSON.parse(stored);
                setContactoIds(ids);
                const idx = ids.indexOf(id);
                setIndiceActual(idx);
            }
        } catch { /* ignore */ }
    }, [id]);

    // Atajos de teclado ← →
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'ArrowLeft' && puedeAnterior) navegar('anterior');
            if (e.key === 'ArrowRight' && puedeSiguiente) navegar('siguiente');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    // ==================== NAVEGACIÓN ====================

    const puedeAnterior = indiceActual > 0;
    const puedeSiguiente = indiceActual >= 0 && indiceActual < contactoIds.length - 1;

    const navegar = (direccion) => {
        const nuevoIndice = direccion === 'anterior' ? indiceActual - 1 : indiceActual + 1;
        if (nuevoIndice >= 0 && nuevoIndice < contactoIds.length) {
            router.push(`/sdr/contacto/${contactoIds[nuevoIndice]}`);
        }
    };

    // ==================== HANDLERS ====================

    const handleLlamar = () => {
        if (contacto?.telefono) window.open(getTelLink(contacto.telefono), '_self');
    };

    const handleWhatsApp = () => {
        if (contacto?.telefono) window.open(getWhatsAppLink(contacto.telefono), '_blank');
    };

    const handleAccion = async (tipo, atendida = null) => {
        if (!contacto) return;
        try {
            if (tipo === 'no_responde') {
                await SDRService.marcarNoResponde(contacto._id, { empresaId });
                mostrarSnackbar('Marcado como No responde');
                cargarContacto();
                return;
            }
            await SDRService.registrarIntento(contacto._id, {
                tipo: tipo === 'llamada' ? (atendida ? 'llamada_atendida' : 'llamada_no_atendida') : 'whatsapp_enviado',
                canal: tipo === 'llamada' ? 'llamada' : 'whatsapp',
                resultado: tipo === 'llamada' ? (atendida ? 'atendio' : 'no_atendio') : undefined,
                empresaId
            });
            mostrarSnackbar(
                tipo === 'llamada'
                    ? (atendida ? 'Llamada atendida registrada' : 'Llamada no atendida registrada')
                    : 'WhatsApp registrado'
            );
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error', 'error');
        }
    };

    const handleMarcarNoCalifica = async () => {
        const motivo = window.prompt('Motivo por el que no califica:');
        if (!motivo) return;
        try {
            await SDRService.marcarNoCalifica(contacto._id, { motivo, empresaId });
            mostrarSnackbar('Marcado como No califica');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error', 'error');
        }
    };

    const handleEnviarComentario = async () => {
        if (!nuevoComentario.trim() || !contacto) return;
        setEnviandoComentario(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: 'comentario',
                canal: 'otro',
                nota: nuevoComentario.trim(),
                empresaId
            });
            setNuevoComentario('');
            mostrarSnackbar('Comentario agregado');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al agregar comentario', 'error');
        } finally {
            setEnviandoComentario(false);
        }
    };

    const handleActualizarPlan = async (plan) => {
        if (!contacto?._id) return;
        setGuardandoScoring(true);
        try {
            await SDRService.actualizarPlanEstimado(contacto._id, plan);
            setContacto(prev => ({ ...prev, planEstimado: plan }));
            mostrarSnackbar(`Plan actualizado a "${PLANES_SORBY[plan]?.label || plan}"`);
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar plan', 'error');
        } finally {
            setGuardandoScoring(false);
        }
    };

    const handleActualizarIntencion = async (intencion) => {
        if (!contacto?._id) return;
        setGuardandoScoring(true);
        try {
            await SDRService.actualizarIntencionCompra(contacto._id, intencion);
            setContacto(prev => ({ ...prev, intencionCompra: intencion }));
            mostrarSnackbar(`Intención actualizada a "${INTENCIONES_COMPRA[intencion]?.label || intencion}"`);
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar intención', 'error');
        } finally {
            setGuardandoScoring(false);
        }
    };

    const handleGuardarPrioridadManual = async () => {
        if (!contacto?._id) return;
        const valor = parseInt(valorPrioridadManual, 10);
        if (isNaN(valor)) {
            mostrarSnackbar('Ingresá un número válido', 'error');
            return;
        }
        setGuardandoScoring(true);
        try {
            await SDRService.actualizarPrioridadManual(contacto._id, valor);
            setContacto(prev => ({ ...prev, prioridadManual: valor }));
            mostrarSnackbar(`Prioridad manual: ${valor} pts`);
            setEditandoPrioridadManual(false);
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar prioridad manual', 'error');
        } finally {
            setGuardandoScoring(false);
        }
    };

    const handleGuardarProximoContacto = async (fecha) => {
        if (!contacto?._id) return;
        setGuardandoProximo(true);
        try {
            await SDRService.actualizarProximoContacto(contacto._id, fecha);
            setContacto(prev => ({ ...prev, proximoContacto: fecha }));
            mostrarSnackbar(fecha ? 'Próximo contacto programado' : 'Próximo contacto eliminado');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar próximo contacto', 'error');
        } finally {
            setGuardandoProximo(false);
        }
    };

    const handleAccionAvanzada = async (datos) => {
        if (!contacto) return;
        try {
            await SDRService.registrarIntento(contacto._id, {
                ...datos,
                empresaId
            });
            mostrarSnackbar('Acción registrada');
            setModalRegistrarAccion(false);
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al registrar', 'error');
        }
    };

    // ==================== HANDLERS CADENCIA ====================

    const handleAsignarCadencia = async (cadenciaId) => {
        if (!contacto?._id) return;
        setAsignandoCadencia(true);
        try {
            await SDRService.asignarCadencia(contacto._id, cadenciaId);
            mostrarSnackbar('Cadencia asignada');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al asignar cadencia', 'error');
        } finally {
            setAsignandoCadencia(false);
        }
    };

    const handleDetenerCadencia = async () => {
        if (!contacto?._id) return;
        setCargandoCadencia(true);
        try {
            await SDRService.detenerCadencia(contacto._id, 'Detenida manualmente');
            mostrarSnackbar('Cadencia detenida');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al detener cadencia', 'error');
        } finally {
            setCargandoCadencia(false);
        }
    };

    const handleAvanzarPaso = async () => {
        if (!contacto?._id) return;
        setCargandoCadencia(true);
        try {
            await SDRService.avanzarPasoCadencia(contacto._id);
            mostrarSnackbar('Avanzado al siguiente paso');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al avanzar paso', 'error');
        } finally {
            setCargandoCadencia(false);
        }
    };

    const handleCopiarTemplate = (texto) => {
        navigator.clipboard.writeText(texto).then(() => {
            mostrarSnackbar('Template copiado al portapapeles');
        }).catch(() => {
            mostrarSnackbar('Error al copiar', 'error');
        });
    };

    // ==================== HELPERS ====================

    const getProximoInfo = () => {
        if (!contacto?.proximoContacto) return null;
        const fecha = new Date(contacto.proximoContacto);
        const ahora = new Date();
        const diffMs = fecha - ahora;
        const diffHoras = Math.abs(diffMs) / (1000 * 60 * 60);
        const vencido = diffMs < 0;

        let texto;
        if (diffHoras < 1) texto = vencido ? 'Vencido hace minutos' : 'En menos de 1h';
        else if (diffHoras < 24) texto = vencido ? `Vencido hace ${Math.floor(diffHoras)}h` : `En ${Math.floor(diffHoras)}h`;
        else {
            const dias = Math.floor(diffHoras / 24);
            texto = vencido ? `Vencido hace ${dias}d` : `En ${dias}d`;
        }

        return { texto, color: vencido ? 'error' : diffHoras < 3 ? 'warning' : 'success', vencido };
    };

    const proximoInfo = getProximoInfo();

    const fechaParaInput = (fecha) => {
        if (!fecha) return '';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 16);
    };

    // ==================== RENDER ====================

    // ==================== TOP-NAV TITLE & ACTIONS ====================
    const topNavTitle = loading ? 'Cargando...' : (contacto?.nombre || 'Contacto no encontrado');

    const topNavActions = contacto ? (
        <Stack direction="row" spacing={1} alignItems="center">
            <EstadoChipEditable
                estado={contacto.estado}
                contactoId={contacto._id}
                onEstadoCambiado={cargarContacto}
                mostrarSnackbar={mostrarSnackbar}
            />
            {contacto.segmento && (
                <Chip size="small" variant="outlined" label={contacto.segmento === 'outbound' ? 'Outbound' : 'Inbound'} />
            )}
            {contacto.sdrAsignadoNombre && (
                <Chip size="small" icon={<PersonIcon />} label={contacto.sdrAsignadoNombre} color="primary" variant="outlined" />
            )}
            {contactoIds.length > 1 && (
                <>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <IconButton onClick={() => navegar('anterior')} disabled={!puedeAnterior} size="small">
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                        {indiceActual + 1} / {contactoIds.length}
                    </Typography>
                    <IconButton onClick={() => navegar('siguiente')} disabled={!puedeSiguiente} size="small">
                        <ChevronRightIcon />
                    </IconButton>
                </>
            )}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Refrescar">
                <IconButton onClick={cargarContacto} size="small">
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => router.back()}>
                <ArrowBackIcon fontSize="small" />
            </IconButton>
        </Stack>
    ) : null;

    if (loading) {
        return (
            <DashboardLayout title={topNavTitle}>
                <Head><title>Cargando contacto...</title></Head>
                <Box sx={{ py: 4 }}>
                    <Container maxWidth="lg">
                        <Skeleton variant="text" width={300} height={40} />
                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            <Grid item xs={12} md={4}><Skeleton variant="rounded" height={200} /></Grid>
                            <Grid item xs={12} md={4}><Skeleton variant="rounded" height={200} /></Grid>
                            <Grid item xs={12} md={4}><Skeleton variant="rounded" height={200} /></Grid>
                        </Grid>
                        <Skeleton variant="rounded" height={400} sx={{ mt: 3 }} />
                    </Container>
                </Box>
            </DashboardLayout>
        );
    }

    if (!contacto) {
        return (
            <DashboardLayout title={topNavTitle}>
                <Head><title>Contacto no encontrado</title></Head>
                <Box sx={{ py: 8, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>Contacto no encontrado</Typography>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
                        Volver
                    </Button>
                </Box>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={topNavTitle} headerActions={topNavActions}>
            <Head>
                <title>{contacto.nombre} | SDR</title>
            </Head>
            <Box sx={{ py: { xs: 1, md: 3 }, pb: { xs: 12, md: 3 } }}>
                <Container maxWidth="lg">

                    {/* ==================== FILA DE CARDS ==================== */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* Card: Info del contacto */}
                        <Grid item xs={12} sm={6} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Información de contacto
                                        </Typography>
                                    </Stack>
                                    <Stack spacing={1.5}>
                                        {(contacto.empresa || contacto.tamanoEmpresa) && (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <BusinessIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {contacto.empresa || 'Sin empresa'}
                                                    {contacto.tamanoEmpresa && (
                                                        <Chip size="small" label={contacto.tamanoEmpresa} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                                    )}
                                                </Typography>
                                            </Stack>
                                        )}
                                        {contacto.cargo && (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <PersonIcon fontSize="small" color="action" />
                                                <Typography variant="body2">{contacto.cargo}</Typography>
                                            </Stack>
                                        )}
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <PhoneIcon fontSize="small" color="action" />
                                            <Typography variant="body2">{contacto.telefono}</Typography>
                                        </Stack>
                                        {contacto.telefonosSecundarios?.map((tel, i) => (
                                            <Stack key={i} direction="row" spacing={1} alignItems="center">
                                                <PhoneIcon fontSize="small" color="action" sx={{ opacity: 0.5 }} />
                                                <Typography variant="body2">
                                                    {tel.numero}
                                                    <Chip size="small" label={tel.etiqueta} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                                </Typography>
                                            </Stack>
                                        ))}
                                        {contacto.email && (
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <EmailIcon fontSize="small" color="action" />
                                                <Typography variant="body2">{contacto.email}</Typography>
                                            </Stack>
                                        )}
                                    </Stack>

                                    {/* Botones de contacto */}
                                    <Stack direction="row" spacing={1} mt={2}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<PhoneIcon />}
                                            onClick={handleLlamar}
                                            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, flex: 1 }}
                                        >
                                            Llamar
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<WhatsAppIcon />}
                                            onClick={handleWhatsApp}
                                            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, flex: 1 }}
                                        >
                                            WhatsApp
                                        </Button>
                                    </Stack>

                                    {/* Datos del Bot */}
                                    {contacto.datosBot && (contacto.datosBot.rubro || contacto.datosBot.interes || contacto.datosBot.saludoInicial) && (
                                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                                <SmartToyIcon fontSize="small" color="action" />
                                                <Typography variant="caption" fontWeight={600}>Datos del Bot</Typography>
                                            </Stack>
                                            <Stack spacing={0.3}>
                                                {contacto.datosBot.rubro && (
                                                    <Typography variant="caption" color="text.secondary">🏗️ {contacto.datosBot.rubro}</Typography>
                                                )}
                                                {contacto.datosBot.interes && (
                                                    <Typography variant="caption" color="text.secondary">💡 {contacto.datosBot.interes}</Typography>
                                                )}
                                                {contacto.datosBot.saludoInicial && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                        💬 "{contacto.datosBot.saludoInicial}"
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Card: Calificación comercial */}
                        <Grid item xs={12} sm={6} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                                        <TrendingUpIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Calificación comercial
                                        </Typography>
                                        {guardandoScoring && <CircularProgress size={14} />}
                                    </Stack>

                                    {/* Plan */}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Plan estimado
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                                        {Object.entries(PLANES_SORBY).map(([key, plan]) => (
                                            <Chip
                                                key={key}
                                                size="small"
                                                label={`${plan.icon} ${plan.label}`}
                                                color={contacto.planEstimado === key ? plan.color : 'default'}
                                                variant={contacto.planEstimado === key ? 'filled' : 'outlined'}
                                                onClick={() => handleActualizarPlan(key)}
                                                disabled={guardandoScoring}
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        ))}
                                    </Stack>

                                    {/* Intención */}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Intención de compra
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
                                        {Object.entries(INTENCIONES_COMPRA).map(([key, ic]) => (
                                            <Chip
                                                key={key}
                                                size="small"
                                                label={`${ic.icon} ${ic.label}`}
                                                color={contacto.intencionCompra === key ? ic.color : 'default'}
                                                variant={contacto.intencionCompra === key ? 'filled' : 'outlined'}
                                                onClick={() => handleActualizarIntencion(key)}
                                                disabled={guardandoScoring}
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        ))}
                                    </Stack>

                                    {/* Score + Prioridad manual + Bot */}
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                        {contacto.prioridadScore > 0 && (
                                            <Tooltip title="Click para ajustar puntos manuales">
                                                <Chip
                                                    size="small"
                                                    label={`Prioridad: ${contacto.prioridadScore}`}
                                                    color={contacto.prioridadScore >= 70 ? 'error' : contacto.prioridadScore >= 40 ? 'warning' : 'default'}
                                                    variant="filled"
                                                    sx={{ fontWeight: 700, cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setValorPrioridadManual(String(contacto.prioridadManual || 0));
                                                        setEditandoPrioridadManual(true);
                                                    }}
                                                />
                                            </Tooltip>
                                        )}
                                        {!editandoPrioridadManual && (contacto.prioridadManual > 0 || contacto.prioridadScore === 0) && (
                                            <Chip
                                                size="small"
                                                label={contacto.prioridadManual ? `Manual: +${contacto.prioridadManual}` : '+ Puntos'}
                                                color={contacto.prioridadManual ? 'info' : 'default'}
                                                variant={contacto.prioridadManual ? 'filled' : 'outlined'}
                                                sx={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    setValorPrioridadManual(String(contacto.prioridadManual || 0));
                                                    setEditandoPrioridadManual(true);
                                                }}
                                            />
                                        )}
                                        {editandoPrioridadManual && (
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <TextField
                                                    size="small"
                                                    type="number"
                                                    value={valorPrioridadManual}
                                                    onChange={(e) => setValorPrioridadManual(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleGuardarPrioridadManual();
                                                        if (e.key === 'Escape') setEditandoPrioridadManual(false);
                                                    }}
                                                    autoFocus
                                                    placeholder="Pts"
                                                    sx={{ width: 80 }}
                                                    InputProps={{ sx: { height: 28, fontSize: '0.8rem' } }}
                                                />
                                                <IconButton size="small" onClick={handleGuardarPrioridadManual} disabled={guardandoScoring} color="primary">
                                                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => setEditandoPrioridadManual(false)}>
                                                    <CancelIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Stack>
                                        )}
                                        {contacto.precalificacionBot && contacto.precalificacionBot !== 'sin_calificar' && (
                                            <Chip
                                                size="small"
                                                icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                                                label={PRECALIFICACION_BOT[contacto.precalificacionBot]?.label || contacto.precalificacionBot}
                                                color={PRECALIFICACION_BOT[contacto.precalificacionBot]?.color || 'default'}
                                                variant="outlined"
                                            />
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Card: Próximo contacto + Acciones rápidas */}
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    {/* Próximo contacto */}
                                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                        <AccessTimeIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Próximo contacto
                                        </Typography>
                                        {guardandoProximo && <CircularProgress size={14} />}
                                    </Stack>

                                    {contacto.proximoContacto ? (
                                        <Chip
                                            size="small"
                                            icon={<ScheduleIcon />}
                                            label={proximoInfo?.texto || 'Programado'}
                                            color={proximoInfo?.color || 'success'}
                                            onDelete={() => handleGuardarProximoContacto(null)}
                                            sx={{ mb: 1 }}
                                        />
                                    ) : (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            No definido
                                        </Typography>
                                    )}

                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                                        {botonesProximoContacto.map((btn) => (
                                            <Button
                                                key={btn.label}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleGuardarProximoContacto(calcularFecha(btn.cantidad, btn.unidad))}
                                                disabled={guardandoProximo}
                                                sx={{ minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                                            >
                                                {btn.label}
                                            </Button>
                                        ))}
                                    </Stack>

                                    <TextField
                                        type="datetime-local"
                                        size="small"
                                        fullWidth
                                        label="Elegir fecha/hora"
                                        value={fechaParaInput(contacto.proximoContacto)}
                                        onChange={(e) => {
                                            if (e.target.value) handleGuardarProximoContacto(new Date(e.target.value));
                                        }}
                                        disabled={guardandoProximo}
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ mb: { xs: 0, md: 2 } }}
                                    />

                                    <Divider sx={{ mb: 1.5, display: { xs: 'none', md: 'block' } }} />

                                    {/* Acciones rápidas - solo desktop (en mobile van en barra fija) */}
                                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Registrar acción
                                        </Typography>
                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                            <Tooltip title="Llamada atendida">
                                                <Button size="small" variant="outlined" color="success" onClick={() => handleAccion('llamada', true)}>
                                                    <PhoneIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Llamada no atendida">
                                                <Button size="small" variant="outlined" color="warning" onClick={() => handleAccion('llamada', false)}>
                                                    <PhoneMissedIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="WhatsApp">
                                                <Button size="small" variant="outlined" color="info" onClick={() => handleAccion('whatsapp')}>
                                                    <WhatsAppIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="No responde">
                                                <Button size="small" variant="outlined" color="inherit" onClick={() => handleAccion('no_responde')}>
                                                    <PhoneDisabledIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="No califica">
                                                <Button size="small" variant="outlined" color="error" onClick={handleMarcarNoCalifica}>
                                                    <DoNotDisturbIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Acción avanzada">
                                                <Button size="small" variant="outlined" color="primary" onClick={() => setModalRegistrarAccion(true)}>
                                                    <EditIcon fontSize="small" />
                                                </Button>
                                            </Tooltip>
                                        </Stack>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* ==================== REUNIONES (si existen) ==================== */}
                    {reuniones.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Reuniones ({reuniones.length})
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {reuniones.map((reunion) => {
                                    const estadoConf = ESTADOS_REUNION[reunion.estado] || {};
                                    return (
                                        <Chip
                                            key={reunion._id}
                                            icon={<EventIcon />}
                                            label={`${reunion.fecha ? new Date(reunion.fecha).toLocaleDateString('es-AR') : 'Sin fecha'} ${reunion.hora || ''} — ${estadoConf.label || reunion.estado}`}
                                            color={estadoConf.color || 'default'}
                                            variant="outlined"
                                            size="small"
                                        />
                                    );
                                })}
                            </Stack>
                        </Paper>
                    )}

                    {/* ==================== CADENCIA ==================== */}
                    {contacto.cadenciaActiva?.cadenciaId && !contacto.cadenciaActiva?.completada ? (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: 'primary.main', borderWidth: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PlayArrowIcon fontSize="small" color="primary" />
                                    <Typography variant="subtitle2" color="primary">
                                        Cadencia activa
                                    </Typography>
                                    {pasoActual && (
                                        <Chip
                                            size="small"
                                            label={`Paso ${(contacto.cadenciaActiva.pasoActual || 0) + 1}${pasoActual.paso ? ` — ${pasoActual.paso.nombre}` : ''}`}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    )}
                                    {cargandoCadencia && <CircularProgress size={16} />}
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Avanzar al siguiente paso">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={handleAvanzarPaso}
                                            disabled={cargandoCadencia}
                                            sx={{ minWidth: 'auto', px: 1 }}
                                        >
                                            <SkipNextIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Detener cadencia">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={handleDetenerCadencia}
                                            disabled={cargandoCadencia}
                                            sx={{ minWidth: 'auto', px: 1 }}
                                        >
                                            <StopIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Stack>

                            {/* Acciones sugeridas del paso actual */}
                            {pasoActual?.acciones && pasoActual.acciones.length > 0 && (
                                <Stack spacing={1.5}>
                                    {pasoActual.acciones.map((accion, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: accion.canal === 'llamada' ? 'success.50' : accion.canal === 'whatsapp' ? '#e8f5e9' : 'grey.50',
                                                borderRadius: 1,
                                                border: 1,
                                                borderColor: accion.canal === 'llamada' ? 'success.light' : accion.canal === 'whatsapp' ? '#81c784' : 'grey.300'
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                                {accion.canal === 'llamada' && <PhoneIcon fontSize="small" color="success" />}
                                                {accion.canal === 'whatsapp' && <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />}
                                                {accion.canal === 'email' && <EmailIcon fontSize="small" color="action" />}
                                                <Typography variant="body2" fontWeight={600}>
                                                    {accion.canal === 'llamada' ? 'Llamar' : accion.canal === 'whatsapp' ? 'WhatsApp' : accion.canal}
                                                </Typography>
                                                {accion.condicion && (
                                                    <Chip size="small" label={accion.condicion.replace(/_/g, ' ')} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                                                )}
                                                {accion.momentoBot && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {accion.momentoBot}
                                                    </Typography>
                                                )}
                                            </Stack>

                                            {/* Template sugerido */}
                                            {accion.template && (
                                                <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, position: 'relative' }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                        Mensaje sugerido:
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
                                                        {accion.template}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleCopiarTemplate(accion.template)}
                                                        sx={{ position: 'absolute', top: 4, right: 4 }}
                                                    >
                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    ))}
                                </Stack>
                            )}

                            {!pasoActual && !cargandoCadencia && (
                                <Typography variant="body2" color="text.secondary">
                                    No se pudo cargar el paso actual de la cadencia
                                </Typography>
                            )}
                        </Paper>
                    ) : (
                        /* Sin cadencia activa: mostrar botón para asignar */
                        cadencias.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                    <PlayArrowIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Cadencia
                                    </Typography>
                                    {contacto.cadenciaActiva?.completada && (
                                        <Chip size="small" label="Completada" color="success" variant="outlined" />
                                    )}
                                </Stack>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {cadencias.map((cad) => (
                                        <Button
                                            key={cad._id}
                                            size="small"
                                            variant="outlined"
                                            startIcon={<PlayArrowIcon />}
                                            onClick={() => handleAsignarCadencia(cad._id)}
                                            disabled={asignandoCadencia}
                                        >
                                            {cad.nombre}
                                        </Button>
                                    ))}
                                </Stack>
                            </Paper>
                        )
                    )}

                    {/* ==================== COMENTARIO + HISTORIAL ==================== */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        {/* Comentario */}
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Escribe un comentario..."
                                value={nuevoComentario}
                                onChange={(e) => setNuevoComentario(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEnviarComentario();
                                    }
                                }}
                                disabled={enviandoComentario}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleEnviarComentario}
                                disabled={!nuevoComentario.trim() || enviandoComentario}
                            >
                                {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                            </Button>
                        </Stack>

                        <Divider sx={{ mb: 2 }} />

                        {/* Historial / Timeline */}
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Historial ({historial.length})
                        </Typography>

                        {historial.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                Sin historial aún
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {historial.map((evento) => {
                                    const colors = getEventoColor(evento.tipo);
                                    return (
                                        <Paper
                                            key={evento._id}
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: colors.bg,
                                                borderLeft: 3,
                                                borderColor: colors.border,
                                            }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Avatar
                                                    sx={{
                                                        width: 28,
                                                        height: 28,
                                                        bgcolor: colors.border,
                                                        color: 'white'
                                                    }}
                                                >
                                                    {getEventoIcon(evento.tipo)}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={500}>
                                                        {evento.descripcion}
                                                    </Typography>
                                                    {evento.nota && (
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            sx={{ mt: 0.5, fontStyle: 'italic' }}
                                                        >
                                                            &ldquo;{evento.nota}&rdquo;
                                                        </Typography>
                                                    )}
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: 'block', mt: 0.5 }}
                                                    >
                                                        {new Date(evento.createdAt).toLocaleString('es-AR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                        {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        )}
                    </Paper>

                </Container>
            </Box>

            {/* ==================== BARRA FIJA MOBILE: Acciones rápidas ==================== */}
            {isMobile && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1200,
                        borderTop: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        px: 1,
                        py: 1,
                        pb: 'calc(8px + env(safe-area-inset-bottom))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        gap: 0.5
                    }}
                >
                    <IconButton size="small" onClick={() => handleAccion('llamada', true)} sx={{ bgcolor: '#4caf50', color: 'white', '&:hover': { bgcolor: '#388e3c' }, width: 40, height: 40 }}>
                        <PhoneIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleAccion('llamada', false)} sx={{ bgcolor: '#ff9800', color: 'white', '&:hover': { bgcolor: '#f57c00' }, width: 40, height: 40 }}>
                        <PhoneMissedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleAccion('whatsapp')} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#128C7E' }, width: 40, height: 40 }}>
                        <WhatsAppIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleAccion('no_responde')} sx={{ border: 1, borderColor: 'divider', width: 40, height: 40 }}>
                        <PhoneDisabledIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={handleMarcarNoCalifica} sx={{ border: 1, borderColor: 'error.main', color: 'error.main', width: 40, height: 40 }}>
                        <DoNotDisturbIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setModalRegistrarAccion(true)} sx={{ border: 1, borderColor: 'primary.main', color: 'primary.main', width: 40, height: 40 }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    {contactoIds.length > 1 && puedeSiguiente && (
                        <IconButton size="small" onClick={() => navegar('siguiente')} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, width: 40, height: 40 }}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    )}
                </Paper>
            )}

            {/* Modal acción avanzada */}
            {modalRegistrarAccion && (
                <ModalRegistrarAccion
                    open={modalRegistrarAccion}
                    onClose={() => setModalRegistrarAccion(false)}
                    contacto={contacto}
                    onRegistrar={handleAccionAvanzada}
                    mostrarSnackbar={mostrarSnackbar}
                />
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </DashboardLayout>
    );
};

export default ContactoSDRDetailPage;
