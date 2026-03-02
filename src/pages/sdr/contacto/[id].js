import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    CircularProgress, Paper, IconButton, Card, CardContent,
    Snackbar, Alert, Avatar, Tooltip, Divider, Grid,
    Tabs, Tab,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel,
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
    ContentCopy as ContentCopyIcon,
    PhoneCallback as PhoneCallbackIcon,
    ScheduleSend as ScheduleSendIcon
} from '@mui/icons-material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import { EstadoChip, EstadoChipEditable, ModalEditarContacto } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalRegistrarAccion from 'src/components/sdr/ModalRegistrarAccion';
import { getWhatsAppLink, getTelLink } from 'src/utils/phoneUtils';
import {
    PLANES_SORBY,
    INTENCIONES_COMPRA,
    PRECALIFICACION_BOT,
    ESTADOS_REUNION
} from 'src/constant/sdrConstants';
import MiniChatViewer from 'src/components/sdr/MiniChatViewer';

// ==================== CONSTANTES ====================

const getEventoColor = (tipo) => {
    const colores = {
        'llamada_atendida': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'llamada_no_atendida': { bg: '#fff3e0', border: '#ff9800', icon: '#e65100' },
        'whatsapp_enviado': { bg: '#e3f2fd', border: '#2196f3', icon: '#1565c0' },
        'whatsapp_respuesta_confirmada': { bg: '#e8f5e9', border: '#66bb6a', icon: '#388e3c' },
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
        'whatsapp_respuesta_confirmada': <WhatsAppIcon fontSize="small" />,
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
    
    // Modal reunión
    const [modalReunion, setModalReunion] = useState(false);
    const [guardandoReunion, setGuardandoReunion] = useState(false);

    // Modal editar contacto
    const [modalEditarContacto, setModalEditarContacto] = useState(false);

    // Tab mobile para chat/historial
    const [tabMobile, setTabMobile] = useState(0);
    // Tab desktop (Info / Historial / Chat)
    const [tabDesktop, setTabDesktop] = useState(0);

    // Cadencia
    const [pasoActual, setPasoActual] = useState(null);
    const [cadencias, setCadencias] = useState([]);
    const [cargandoCadencia, setCargandoCadencia] = useState(false);
    const [asignandoCadencia, setAsignandoCadencia] = useState(false);

    // Wizard cadencia (sub-pasos)
    const [subPasoIdx, setSubPasoIdx] = useState(0);
    const [wizardFase, setWizardFase] = useState('accion'); // 'accion' | 'resultado' | 'seguimiento' | 'nota'
    const [resultadoLlamada, setResultadoLlamada] = useState(null); // 'atendio' | 'no_atendio'
    const [resultadoWA, setResultadoWA] = useState(null); // 'respondio' | 'no_respondio'
    const [seguimientoWizard, setSeguimientoWizard] = useState(null); // 'llamar_despues' | 'mensaje_despues' | 'coordinar_reunion'
    const [notaWizard, setNotaWizard] = useState('');
    const [mensajeWA, setMensajeWA] = useState('');
    const [registrandoWizard, setRegistrandoWizard] = useState(false);
    const [proximoContactoWizard, setProximoContactoWizard] = useState(null); // Date or null

    // Navegación entre contactos (IDs guardados en sessionStorage)
    const [contactoIds, setContactoIds] = useState([]);
    const [indiceActual, setIndiceActual] = useState(-1);

    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    // Eliminar evento del historial
    const handleEliminarEvento = async (eventoId) => {
        if (!window.confirm('¿Estás seguro de eliminar este evento del historial?')) return;
        try {
            await SDRService.eliminarEventoHistorial(eventoId);
            setHistorial(prev => prev.filter(e => e._id !== eventoId));
            mostrarSnackbar('Evento eliminado');
        } catch (err) {
            console.error('Error eliminando evento:', err);
            mostrarSnackbar('Error al eliminar evento', 'error');
        }
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

    // Cargar cadencias disponibles (globales)
    useEffect(() => {
        SDRService.listarCadencias()
            .then(data => setCadencias(data || []))
            .catch(() => setCadencias([]));
    }, []);

    // Reset wizard cuando cambia el paso actual (respeta WA pendiente)
    useEffect(() => {
        const tienePendiente = contacto?.cadenciaActiva?.waPendienteRespuesta;
        if (tienePendiente && pasoActual?.acciones?.length) {
            // Restaurar al sub-paso del WA pendiente
            const idx = contacto.cadenciaActiva.waSubPasoIdx;
            if (typeof idx === 'number' && idx >= 0 && idx < pasoActual.acciones.length) {
                setSubPasoIdx(idx);
            } else {
                setSubPasoIdx(0);
            }
            setWizardFase('pendiente_confirmacion');
            setResultadoLlamada(null);
            setResultadoWA(null);
            setSeguimientoWizard(null);
            setProximoContactoWizard(null);
            setNotaWizard('');
            setMensajeWA('');
        } else {
            setSubPasoIdx(0);
            setResultadoLlamada(null);
            setResultadoWA(null);
            setWizardFase('accion');
            setSeguimientoWizard(null);
            setProximoContactoWizard(null);
            setNotaWizard('');
            const primeraAccion = pasoActual?.acciones?.[0];
            setMensajeWA(primeraAccion?.templateResuelto || primeraAccion?.varianteSeleccionada?.templateTexto || '');
        }
    }, [pasoActual, contacto?.cadenciaActiva?.waPendienteRespuesta]);

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
            if (e.key === 'ArrowRight') handleSiguienteContacto();
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

    /** Ir al siguiente contacto o al listado, validando que tenga próximo contacto futuro */
    const handleSiguienteContacto = () => {
        const prox = contacto?.proximoContacto ? new Date(contacto.proximoContacto) : null;
        if (!prox || prox <= new Date()) {
            mostrarSnackbar('Definí una fecha de próximo contacto antes de continuar', 'warning');
            return;
        }
        if (puedeSiguiente) {
            navegar('siguiente');
        } else {
            router.push('/contactosSDR');
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

    const handleToggleQuiereReunion = async () => {
        if (!contacto?._id) return;
        setGuardandoScoring(true);
        const nuevoValor = contacto.precalificacionBot === 'quiere_meet' ? 'calificado' : 'quiere_meet';
        try {
            await SDRService.actualizarContacto(contacto._id, { precalificacionBot: nuevoValor });
            setContacto(prev => ({ ...prev, precalificacionBot: nuevoValor }));
            mostrarSnackbar(nuevoValor === 'quiere_meet' ? 'Marcado como quiere reunión ✓' : 'Desmarcado quiere reunión');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar', 'error');
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
        // Si viene del ModalRegistrarAccion pidiendo abrir modal de reunión
        if (datos?.abrirModalReunion) {
            setModalRegistrarAccion(false);
            setModalReunion(true);
            return;
        }
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

    const handleRegistrarReunion = async (formData) => {
        if (!contacto?._id) return;
        setGuardandoReunion(true);
        try {
            await SDRService.registrarReunion(contacto._id, { ...formData, empresaId });
            mostrarSnackbar('¡Reunión registrada con éxito! 📅');
            setModalReunion(false);
            cargarContacto();
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al registrar reunión', 'error');
        } finally {
            setGuardandoReunion(false);
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

    // ==================== WIZARD CADENCIA ====================

    /** Busca el siguiente sub-paso válido según condiciones */
    const obtenerSiguienteSubPaso = (desdeIdx, resLlamada, resWA) => {
        const acciones = pasoActual?.acciones || [];
        for (let i = desdeIdx; i < acciones.length; i++) {
            const accion = acciones[i];
            const tipo = accion.tipo || accion.canal;
            if (tipo === 'espera') continue;
            const condicion = accion.condicion;
            if (!condicion) return i;
            // Condiciones de llamada
            if (condicion === 'si_no_atendio' && resLlamada === 'no_atendio') return i;
            if (condicion === 'si_atendio' && resLlamada === 'atendio') return i;
            // Condiciones de WhatsApp
            if (condicion === 'si_respondio' && resWA === 'respondio') return i;
            if (condicion === 'si_no_respondio' && resWA === 'no_respondio') return i;
            // Condición no cumplida → saltar
        }
        return -1; // Todas completadas
    };

    /** Avanza al siguiente sub-paso o al siguiente paso si se acabaron */
    const avanzarSubPasoWizard = async (resLlamada, resWA) => {
        const siguiente = obtenerSiguienteSubPaso(subPasoIdx + 1, resLlamada, resWA);
        if (siguiente === -1) {
            // Todas las sub-acciones completadas → avanzar paso
            setCargandoCadencia(true);
            try {
                await SDRService.avanzarPasoCadencia(contacto._id);
                mostrarSnackbar('Paso completado ✓');
                cargarContacto();
            } catch (err) {
                mostrarSnackbar(err.response?.data?.error || 'Error al avanzar paso', 'error');
            } finally {
                setCargandoCadencia(false);
            }
        } else {
            setSubPasoIdx(siguiente);
            setWizardFase('accion');
            setNotaWizard('');
            // NO resetear resultadoLlamada ni resultadoWA: persisten dentro del paso
            // para que condiciones de acciones posteriores puedan evaluarlas
            const accion = pasoActual?.acciones?.[siguiente];
            setMensajeWA(accion?.templateResuelto || accion?.varianteSeleccionada?.templateTexto || '');
        }
    };

    /** Registra llamada del wizard y avanza */
    const handleWizardRegistrarLlamada = async () => {
        setRegistrandoWizard(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: resultadoLlamada === 'atendio' ? 'llamada_atendida' : 'llamada_no_atendida',
                canal: 'llamada',
                resultado: resultadoLlamada,
                seguimiento: seguimientoWizard || undefined,
                proximoContacto: proximoContactoWizard || undefined,
                empresaId
            });
            // Actualizar próximo contacto en el contacto
            if (proximoContactoWizard) {
                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard }));
            }
            mostrarSnackbar(resultadoLlamada === 'atendio' ? 'Llamada atendida ✓' : 'Llamada no atendida ✓');
            if (seguimientoWizard === 'coordinar_reunion') {
                setModalReunion(true);
            }
            await avanzarSubPasoWizard(resultadoLlamada, resultadoWA);
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al registrar', 'error');
        } finally {
            setRegistrandoWizard(false);
        }
    };

    /** Abre WhatsApp y pasa a fase de confirmación */
    const handleWizardEnviarWA = () => {
        window.open(getWhatsAppLink(contacto.telefono, mensajeWA), '_blank');
        setWizardFase('resultado');
    };

    /** Confirma envío de WA, registra y avanza */
    const handleWizardConfirmarWA = async () => {
        setRegistrandoWizard(true);
        const esPendiente = contacto?.cadenciaActiva?.waPendienteRespuesta;
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: esPendiente ? 'whatsapp_respuesta_confirmada' : 'whatsapp_enviado',
                canal: 'whatsapp',
                resultado: resultadoWA,
                seguimiento: seguimientoWizard || undefined,
                nota: mensajeWA?.trim() || undefined,
                proximoContacto: proximoContactoWizard || undefined,
                confirmarRespuestaWA: esPendiente || undefined,
                empresaId
            });
            if (proximoContactoWizard) {
                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard }));
            }
            if (esPendiente) {
                setContacto(prev => ({ ...prev, cadenciaActiva: { ...prev.cadenciaActiva, waPendienteRespuesta: false } }));
            }
            mostrarSnackbar('WhatsApp registrado ✓');
            if (seguimientoWizard === 'coordinar_reunion') {
                setModalReunion(true);
            }
            await avanzarSubPasoWizard(resultadoLlamada, resultadoWA);
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al registrar', 'error');
        } finally {
            setRegistrandoWizard(false);
        }
    };

    /** Registra WA enviado sin avanzar, marca pendiente de respuesta */
    const handleWizardEsperarRespuesta = async () => {
        if (!proximoContactoWizard) return;
        setRegistrandoWizard(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: 'whatsapp_enviado',
                canal: 'whatsapp',
                resultado: 'pendiente',
                nota: mensajeWA?.trim() || undefined,
                proximoContacto: proximoContactoWizard,
                pendienteRespuesta: true,
                waSubPasoIdx: subPasoIdx,
                empresaId
            });
            setContacto(prev => ({
                ...prev,
                proximoContacto: proximoContactoWizard,
                cadenciaActiva: { ...prev.cadenciaActiva, waPendienteRespuesta: true, waSubPasoIdx: subPasoIdx }
            }));
            mostrarSnackbar('WA registrado. Te preguntaremos en el próximo contacto ⏳');
            setWizardFase('pendiente_confirmacion');
            setResultadoWA(null);
            setNotaWizard('');
            setProximoContactoWizard(null);
            setSeguimientoWizard(null);
        } catch (err) {
            mostrarSnackbar(err.response?.data?.error || 'Error al registrar', 'error');
        } finally {
            setRegistrandoWizard(false);
        }
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

    // ==================== PROXIMO CONTACTO PICKER ====================
    const renderProximoContactoPicker = (compact = false) => (
        <Box sx={{ mb: compact ? 1 : 1.5, p: compact ? 1 : 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: proximoContactoWizard ? 'success.light' : 'warning.light' }}>
            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                📅 Próximo contacto {!proximoContactoWizard && <span style={{ color: '#d32f2f' }}>*</span>}
            </Typography>
            {proximoContactoWizard ? (
                <Chip
                    size="small"
                    label={`📅 ${new Date(proximoContactoWizard).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(proximoContactoWizard).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                    color="success"
                    onDelete={() => setProximoContactoWizard(null)}
                    sx={{ fontWeight: 600 }}
                />
            ) : (
                <Stack spacing={0.5}>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {botonesProximoContacto.map((btn) => (
                            <Button
                                key={btn.label}
                                size="small"
                                variant="outlined"
                                onClick={() => setProximoContactoWizard(calcularFecha(btn.cantidad, btn.unidad))}
                                sx={{ minWidth: 'auto', px: compact ? 0.8 : 1.2, py: 0.3, fontSize: compact ? '0.65rem' : '0.7rem', textTransform: 'none' }}
                            >
                                {btn.label}
                            </Button>
                        ))}
                    </Stack>
                    <input
                        type="datetime-local"
                        value={fechaParaInput(proximoContactoWizard)}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) setProximoContactoWizard(new Date(val));
                        }}
                        style={{ fontSize: compact ? '0.7rem' : '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                    />
                </Stack>
            )}
        </Box>
    );

    // ==================== RENDER ====================

    // ==================== TOP-NAV TITLE & ACTIONS ====================
    const topNavTitle = loading ? 'Cargando...' : 'Contacto SDR';

    const topNavActions = contacto ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            {contactoIds.length > 1 && (
                <>
                    <IconButton onClick={() => navegar('anterior')} disabled={!puedeAnterior} size="small">
                        <ChevronLeftIcon />
                    </IconButton>
                    {!isMobile && (
                        <Typography variant="caption" color="text.secondary">
                            {indiceActual + 1} / {contactoIds.length}
                        </Typography>
                    )}
                    <IconButton onClick={() => navegar('siguiente')} disabled={!puedeSiguiente} size="small">
                        <ChevronRightIcon />
                    </IconButton>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                </>
            )}
            <Tooltip title="Refrescar">
                <IconButton onClick={cargarContacto} size="small">
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Button
                startIcon={<ArrowBackIcon />}
                size="small"
                variant="outlined"
                onClick={() => router.push('/contactosSDR')}
                sx={{ textTransform: 'none', ml: 0.5 }}
            >
                Volver a contactos
            </Button>
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
            <Box sx={{ py: { xs: 1, md: 3 }, pb: { xs: 28, md: 3 } }}>
                <Container maxWidth="lg">

                    {/* ==================== TABS ==================== */}
                    {isMobile ? (
                        <Tabs
                            value={tabMobile}
                            onChange={(_, v) => setTabMobile(v)}
                            variant="fullWidth"
                            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
                        >
                            <Tab icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Info" sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none' }} />
                            <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Historial (${historial.length})`} sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none' }} />
                            <Tab icon={<ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Chat" sx={{ minHeight: 40, fontSize: '0.8rem', textTransform: 'none' }} />
                        </Tabs>
                    ) : (
                        <Tabs
                            value={tabDesktop}
                            onChange={(_, v) => setTabDesktop(v)}
                            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                        >
                            <Tab icon={<PersonIcon />} iconPosition="start" label="Info" sx={{ textTransform: 'none', minHeight: 48 }} />
                            <Tab icon={<HistoryIcon />} iconPosition="start" label={`Historial (${historial.length})`} sx={{ textTransform: 'none', minHeight: 48 }} />
                            <Tab icon={<ChatBubbleOutlineIcon />} iconPosition="start" label="Chat" sx={{ textTransform: 'none', minHeight: 48 }} />
                        </Tabs>
                    )}

                    {/* ===== TAB INFO ===== */}
                    {((isMobile && tabMobile === 0) || (!isMobile && tabDesktop === 0)) && (<>

                    {/* ==================== FILA DE CARDS ==================== */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* Card: Info del contacto */}
                        <Grid item xs={12} sm={6} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
                                    {/* Nombre y cargo */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.8 }}>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="h6" fontWeight={700} noWrap>
                                                {contacto.nombre}
                                            </Typography>
                                            {contacto.cargo && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {contacto.cargo}
                                                </Typography>
                                            )}
                                        </Box>
                                        <IconButton size="small" onClick={() => setModalEditarContacto(true)} sx={{ p: 0.3, mt: 0.5 }}>
                                            <EditIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </IconButton>
                                    </Stack>

                                    {/* Estado · Segmento · SDR */}
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.8, flexWrap: 'wrap', gap: 0.3 }}>
                                        <EstadoChipEditable
                                            estado={contacto.estado}
                                            contactoId={contacto._id}
                                            onEstadoCambiado={cargarContacto}
                                            mostrarSnackbar={mostrarSnackbar}
                                        />
                                        {contacto.segmento && (
                                            <Typography variant="caption" color="text.secondary">
                                                · {contacto.segmento === 'inbound' ? '🟢 Inbound' : '🟠 Outbound'}
                                            </Typography>
                                        )}
                                        {contacto.sdrAsignadoNombre && (
                                            <Typography variant="caption" color="text.secondary">
                                                · 👤 {contacto.sdrAsignadoNombre}
                                            </Typography>
                                        )}
                                    </Stack>

                                    {/* Línea 2: Teléfono con icon buttons inline */}
                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 500 }}>
                                            {contacto.telefono}
                                        </Typography>
                                        <Tooltip title="Llamar">
                                            <IconButton
                                                size="small"
                                                onClick={handleLlamar}
                                                sx={{ p: 0.4, bgcolor: '#e8f5e9', '&:hover': { bgcolor: '#c8e6c9' } }}
                                            >
                                                <PhoneIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="WhatsApp">
                                            <IconButton
                                                size="small"
                                                onClick={handleWhatsApp}
                                                sx={{ p: 0.4, bgcolor: '#e8f5e9', '&:hover': { bgcolor: '#c8e6c9' } }}
                                            >
                                                <WhatsAppIcon sx={{ fontSize: 16, color: '#25D366' }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>

                                    {/* Teléfonos secundarios */}
                                    {contacto.telefonosSecundarios?.map((tel, i) => (
                                        <Typography key={i} variant="caption" color="text.secondary" sx={{ display: 'block', pl: 0.5, fontSize: '0.72rem' }}>
                                            📞 {tel.numero} ({tel.etiqueta})
                                        </Typography>
                                    ))}

                                    {/* Empresa / email — compacto */}
                                    <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                                        {(contacto.empresa || contacto.tamanoEmpresa) && (
                                            <Typography variant="caption" color="text.secondary" fontSize="0.78rem">
                                                🏢 {contacto.empresa || 'Sin empresa'}
                                                {contacto.tamanoEmpresa && <> · {contacto.tamanoEmpresa}</>}
                                            </Typography>
                                        )}
                                        {contacto.email && (
                                            <Typography variant="caption" color="text.secondary" fontSize="0.78rem">
                                                ✉️ {contacto.email}
                                            </Typography>
                                        )}
                                    </Stack>

                                    {/* Datos del Bot — inline key:value */}
                                    {contacto.datosBot && (contacto.datosBot.rubro || contacto.datosBot.interes || contacto.datosBot.saludoInicial || contacto.datosBot.cantidadObras) && (
                                        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                            <Typography variant="caption" color="text.disabled" fontWeight={600} fontSize="0.68rem" textTransform="uppercase" letterSpacing={0.5}>
                                                🤖 Bot
                                            </Typography>
                                            <Stack spacing={0.2} sx={{ mt: 0.3 }}>
                                                {contacto.datosBot.rubro && (
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                                        <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>Rubro:</Box> {contacto.datosBot.rubro}
                                                    </Typography>
                                                )}
                                                {contacto.datosBot.cantidadObras && (
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                                        <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>Obras:</Box> {contacto.datosBot.cantidadObras}
                                                    </Typography>
                                                )}
                                                {contacto.datosBot.interes && (
                                                    <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                                        <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500 }}>Interés:</Box> {contacto.datosBot.interes}
                                                    </Typography>
                                                )}
                                                {contacto.datosBot.saludoInicial && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.72rem', mt: 0.2, lineHeight: 1.3 }}>
                                                        "{contacto.datosBot.saludoInicial}"
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

                                    {/* Quiere reunión */}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                        Quiere reunión
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }}>
                                        <Chip
                                            size="small"
                                            icon={<EventIcon sx={{ fontSize: 14 }} />}
                                            label={contacto.precalificacionBot === 'quiere_meet' ? '✅ Sí' : '❌ No'}
                                            color={contacto.precalificacionBot === 'quiere_meet' ? 'primary' : 'default'}
                                            variant={contacto.precalificacionBot === 'quiere_meet' ? 'filled' : 'outlined'}
                                            onClick={handleToggleQuiereReunion}
                                            disabled={guardandoScoring}
                                            sx={{ cursor: 'pointer' }}
                                        />
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
                                        {!editandoPrioridadManual && (
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
                                            <Tooltip title="Agendar reunión">
                                                <Button size="small" variant="outlined" color="primary" onClick={() => setModalReunion(true)}>
                                                    <EventIcon fontSize="small" />
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

                    {/* ==================== HISTORIAL + CADENCIA SIDE BY SIDE (desktop) ==================== */}
                    <Grid container spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
                        {/* COLUMNA IZQUIERDA: Comentario + Historial */}
                        <Grid item xs={12} md={6}>

                    {/* ==================== COMENTARIO RÁPIDO ==================== */}
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Agregar comentario
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Escribe un comentario rápido..."
                                    value={nuevoComentario}
                                    onChange={(e) => setNuevoComentario(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleEnviarComentario();
                                        }
                                    }}
                                    disabled={enviandoComentario}
                                    multiline
                                    maxRows={3}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleEnviarComentario}
                                    disabled={!nuevoComentario.trim() || enviandoComentario}
                                    sx={{ minWidth: 'auto', px: 2 }}
                                >
                                    {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                </Button>
                            </Stack>
                        </Paper>

                    {/* ==================== HISTORIAL INLINE (desktop) ==================== */}
                    {historial.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Historial reciente ({historial.length})
                                    </Typography>
                                </Stack>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setTabDesktop(1)}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                    Ver todo →
                                </Button>
                            </Stack>
                            <Stack spacing={1}>
                                {historial.slice(0, 5).map((evento) => {
                                    const colors = getEventoColor(evento.tipo);
                                    return (
                                        <Paper
                                            key={evento._id}
                                            elevation={0}
                                            sx={{ p: 1, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: colors.border, color: 'white' }}>
                                                    {getEventoIcon(evento.tipo)}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                                                        {evento.descripcion}
                                                    </Typography>
                                                    {evento.nota && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                                            &ldquo;{evento.nota.length > 120 ? evento.nota.substring(0, 120) + '...' : evento.nota}&rdquo;
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                                {historial.length > 5 && (
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setTabDesktop(1)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'center' }}
                                    >
                                        Ver {historial.length - 5} evento(s) más →
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    )}

                        </Grid>

                        {/* COLUMNA DERECHA: Cadencia */}
                        <Grid item xs={12} md={6}>

                    {/* ==================== CADENCIA - WIZARD ==================== */}
                    {/* En mobile la cadencia va en la barra fija de abajo */}
                    {contacto.cadenciaActiva?.cadenciaId && !contacto.cadenciaActiva?.completada ? (
                        <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main', borderWidth: 2 }}>
                            {/* Header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
                                    {(cargandoCadencia || registrandoWizard) && <CircularProgress size={16} />}
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Avanzar paso manualmente">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={handleAvanzarPaso}
                                            disabled={cargandoCadencia || registrandoWizard}
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
                                            disabled={cargandoCadencia || registrandoWizard}
                                            sx={{ minWidth: 'auto', px: 1 }}
                                        >
                                            <StopIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                </Stack>
                            </Stack>

                            {/* Wizard: una acción a la vez */}
                            {pasoActual?.acciones?.length > 0 && (() => {
                                const accion = pasoActual.acciones[subPasoIdx];
                                if (!accion) {
                                    return (
                                        <Box sx={{ textAlign: 'center', py: 2 }}>
                                            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                Todas las acciones de este paso completadas
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={handleAvanzarPaso}
                                                sx={{ mt: 1 }}
                                                disabled={cargandoCadencia}
                                                endIcon={<SkipNextIcon />}
                                            >
                                                Avanzar al siguiente paso
                                            </Button>
                                        </Box>
                                    );
                                }

                                const canal = accion.tipo || accion.canal;

                                return (
                                    <Box>
                                        {/* Indicador de sub-acción */}
                                        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                                            {canal === 'llamada' && <PhoneIcon fontSize="small" color="success" />}
                                            {canal === 'whatsapp' && <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />}
                                            {canal === 'email' && <EmailIcon fontSize="small" color="action" />}
                                            <Typography variant="body2" fontWeight={600}>
                                                {canal === 'llamada' ? 'Llamar' : canal === 'whatsapp' ? 'Enviar WhatsApp' : canal === 'email' ? 'Enviar Email' : canal}
                                            </Typography>
                                            {accion.condicion && (
                                                <Chip size="small" label={accion.condicion.replace(/_/g, ' ')} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                                            )}
                                        </Stack>

                                        {/* === LLAMADA: 3 fases === */}
                                        {canal === 'llamada' && (
                                            <Box>
                                                {wizardFase === 'accion' && (
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<PhoneIcon />}
                                                        onClick={() => {
                                                            handleLlamar();
                                                            setWizardFase('resultado');
                                                        }}
                                                        fullWidth
                                                        sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, py: 1.2 }}
                                                    >
                                                        Llamar a {contacto.nombre?.split(' ')[0] || 'contacto'}
                                                    </Button>
                                                )}

                                                {wizardFase === 'resultado' && (
                                                    <Box>
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            ¿Cómo fue la llamada?
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => {
                                                                    setResultadoLlamada('atendio');
                                                                    setWizardFase('seguimiento');
                                                                }}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                Atendió
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                startIcon={<PhoneMissedIcon />}
                                                                onClick={() => {
                                                                    setResultadoLlamada('no_atendio');
                                                                    setWizardFase('nota');
                                                                }}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                No atendió
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {wizardFase === 'seguimiento' && (
                                                    <Box>
                                                        <Chip size="small" label="✅ Atendió" color="success" sx={{ mb: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            ¿Qué acordaron?
                                                        </Typography>
                                                        <Stack spacing={1}>
                                                            <Button
                                                                variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                                startIcon={<PhoneCallbackIcon />}
                                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Llamar más adelante
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                                startIcon={<ScheduleSendIcon />}
                                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Mandar mensaje más adelante
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                                startIcon={<EventIcon />}
                                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Coordinar reunión
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {wizardFase === 'nota' && (
                                                    <Box>
                                                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                            <Chip
                                                                size="small"
                                                                label={resultadoLlamada === 'atendio' ? '✅ Atendió' : '❌ No atendió'}
                                                                color={resultadoLlamada === 'atendio' ? 'success' : 'warning'}
                                                            />
                                                            {seguimientoWizard && (
                                                                <Chip
                                                                    size="small"
                                                                    label={seguimientoWizard === 'llamar_despues' ? '📞 Llamar después' : seguimientoWizard === 'mensaje_despues' ? '💬 Mensaje después' : '📅 Coordinar reunión'}
                                                                    color="info"
                                                                    variant="outlined"
                                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }}
                                                                />
                                                            )}
                                                        </Stack>
                                                        {renderProximoContactoPicker()}
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={handleWizardRegistrarLlamada}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <SkipNextIcon />}
                                                            fullWidth
                                                            sx={{ py: 1 }}
                                                        >
                                                            Registrar y continuar
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* === WHATSAPP: 3 fases === */}
                                        {canal === 'whatsapp' && (
                                            <Box>
                                                {wizardFase === 'accion' && (
                                                    <Box>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            multiline
                                                            minRows={3}
                                                            maxRows={8}
                                                            value={mensajeWA}
                                                            onChange={(e) => setMensajeWA(e.target.value)}
                                                            sx={{ mb: 1.5 }}
                                                            placeholder="Mensaje para WhatsApp..."
                                                        />
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<WhatsAppIcon />}
                                                            onClick={handleWizardEnviarWA}
                                                            disabled={!mensajeWA.trim()}
                                                            fullWidth
                                                            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, py: 1 }}
                                                        >
                                                            Enviar por WhatsApp
                                                        </Button>
                                                    </Box>
                                                )}

                                                {wizardFase === 'resultado' && (
                                                    <Box>
                                                        <Chip size="small" icon={<CheckCircleIcon />} label="Mensaje enviado" color="success" sx={{ mb: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            ¿Te respondió el contacto?
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => {
                                                                    setResultadoWA('respondio');
                                                                    setWizardFase('seguimiento');
                                                                }}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                Ya respondió
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="info"
                                                                startIcon={<AccessTimeIcon />}
                                                                onClick={() => setWizardFase('esperar_respuesta')}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                Esperar respuesta
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {wizardFase === 'pendiente_confirmacion' && (
                                                    <Box>
                                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA enviado previamente" color="info" sx={{ mb: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            ¿Te respondió el contacto al WhatsApp que enviaste?
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => {
                                                                    setResultadoWA('respondio');
                                                                    setWizardFase('seguimiento');
                                                                }}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                Sí, respondió
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                startIcon={<AccessTimeIcon />}
                                                                onClick={() => {
                                                                    setResultadoWA('no_respondio');
                                                                    setWizardFase('nota');
                                                                }}
                                                                sx={{ flex: 1, py: 1 }}
                                                            >
                                                                No respondió
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {wizardFase === 'esperar_respuesta' && (
                                                    <Box>
                                                        <Chip size="small" icon={<AccessTimeIcon />} label="Esperando respuesta" color="info" sx={{ mb: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            Agendá cuándo revisar si respondió
                                                        </Typography>
                                                        {renderProximoContactoPicker()}
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={handleWizardEsperarRespuesta}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                                            fullWidth
                                                            sx={{ py: 1 }}
                                                        >
                                                            Confirmar y esperar
                                                        </Button>
                                                    </Box>
                                                )}

                                                {wizardFase === 'seguimiento' && (
                                                    <Box>
                                                        <Chip size="small" label="✅ Respondió" color="success" sx={{ mb: 1.5 }} />
                                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                                            ¿Qué acordaron?
                                                        </Typography>
                                                        <Stack spacing={1}>
                                                            <Button
                                                                variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                                startIcon={<PhoneCallbackIcon />}
                                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Llamar más adelante
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                                startIcon={<ScheduleSendIcon />}
                                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Mandar mensaje más adelante
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                                startIcon={<EventIcon />}
                                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                                fullWidth
                                                                sx={{ justifyContent: 'flex-start', py: 0.8 }}
                                                            >
                                                                Coordinar reunión
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}

                                                {wizardFase === 'nota' && (
                                                    <Box>
                                                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                                            <Chip
                                                                size="small"
                                                                label={resultadoWA === 'respondio' ? '✅ Respondió' : '⏳ No respondió'}
                                                                color={resultadoWA === 'respondio' ? 'success' : 'warning'}
                                                            />
                                                            {seguimientoWizard && (
                                                                <Chip
                                                                    size="small"
                                                                    label={seguimientoWizard === 'llamar_despues' ? '📞 Llamar después' : seguimientoWizard === 'mensaje_despues' ? '💬 Mensaje después' : '📅 Coordinar reunión'}
                                                                    color="info"
                                                                    variant="outlined"
                                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }}
                                                                />
                                                            )}
                                                        </Stack>
                                                        {resultadoWA === 'no_respondio' && pasoActual?.paso?.delayDias > 0 && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                                                                El próximo paso se activa en {pasoActual.paso.delayDias} día{pasoActual.paso.delayDias > 1 ? 's' : ''}. Podés continuar con la siguiente acción.
                                                            </Typography>
                                                        )}
                                                        {renderProximoContactoPicker()}
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={handleWizardConfirmarWA}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <SkipNextIcon />}
                                                            fullWidth
                                                            sx={{ py: 1 }}
                                                        >
                                                            Registrar y continuar
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* === EMAIL: similar a WA === */}
                                        {canal === 'email' && (
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    minRows={3}
                                                    value={mensajeWA}
                                                    onChange={(e) => setMensajeWA(e.target.value)}
                                                    sx={{ mb: 1.5 }}
                                                    placeholder="Contenido del email..."
                                                />
                                                {renderProximoContactoPicker()}
                                                <Button
                                                    variant="contained"
                                                    startIcon={<EmailIcon />}
                                                    onClick={async () => {
                                                        if (contacto.email) window.open(`mailto:${contacto.email}?body=${encodeURIComponent(mensajeWA)}`);
                                                        setRegistrandoWizard(true);
                                                        try {
                                                            await SDRService.registrarIntento(contacto._id, { tipo: 'email_enviado', canal: 'email', nota: mensajeWA.trim() || undefined, empresaId, proximoContacto: proximoContactoWizard || undefined });
                                                            if (proximoContactoWizard) {
                                                                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard }));
                                                            }
                                                            mostrarSnackbar('Email registrado ✓');
                                                            await avanzarSubPasoWizard(resultadoLlamada, resultadoWA);
                                                        } catch (err) {
                                                            mostrarSnackbar('Error al registrar', 'error');
                                                        } finally {
                                                            setRegistrandoWizard(false);
                                                        }
                                                    }}
                                                    disabled={registrandoWizard || !proximoContactoWizard}
                                                    fullWidth
                                                    sx={{ py: 1 }}
                                                >
                                                    Enviar Email
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })()}

                            {!pasoActual && !cargandoCadencia && (
                                <Typography variant="body2" color="text.secondary">
                                    No se pudo cargar el paso actual de la cadencia
                                </Typography>
                            )}

                            {/* Escape: acción manual */}
                            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                                <Button
                                    size="small"
                                    variant="text"
                                    color="inherit"
                                    onClick={() => setModalRegistrarAccion(true)}
                                    sx={{ fontSize: '0.75rem', textTransform: 'none', color: 'text.secondary' }}
                                >
                                    Hacer otra acción →
                                </Button>
                            </Box>

                            {/* Botón siguiente contacto */}
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleSiguienteContacto}
                                endIcon={<ChevronRightIcon />}
                                sx={{ mt: 2, py: 1.2, fontWeight: 600, fontSize: '0.95rem', borderRadius: 2 }}
                            >
                                {puedeSiguiente ? `Siguiente contacto (${indiceActual + 2}/${contactoIds.length})` : 'Volver al listado'}
                            </Button>
                        </Paper>
                    ) : (
                        /* Sin cadencia activa: mostrar botón para asignar */
                        cadencias.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
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

                        </Grid>
                    </Grid>
                    {/* ==================== FIN GRID DESKTOP HISTORIAL + CADENCIA ==================== */}

                    {/* ==================== MOBILE: COMENTARIO + HISTORIAL ==================== */}
                    {isMobile && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Agregar comentario
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Escribe un comentario rápido..."
                                    value={nuevoComentario}
                                    onChange={(e) => setNuevoComentario(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleEnviarComentario();
                                        }
                                    }}
                                    disabled={enviandoComentario}
                                    multiline
                                    maxRows={3}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleEnviarComentario}
                                    disabled={!nuevoComentario.trim() || enviandoComentario}
                                    sx={{ minWidth: 'auto', px: 2 }}
                                >
                                    {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {isMobile && historial.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Historial reciente ({historial.length})
                                    </Typography>
                                </Stack>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setTabMobile(1)}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                    Ver todo →
                                </Button>
                            </Stack>
                            <Stack spacing={1}>
                                {historial.slice(0, 3).map((evento) => {
                                    const colors = getEventoColor(evento.tipo);
                                    return (
                                        <Paper
                                            key={evento._id}
                                            elevation={0}
                                            sx={{ p: 1, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}
                                        >
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Avatar sx={{ width: 24, height: 24, bgcolor: colors.border, color: 'white' }}>
                                                    {getEventoIcon(evento.tipo)}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                                                        {evento.descripcion}
                                                    </Typography>
                                                    {evento.nota && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                                                            &ldquo;{evento.nota.length > 80 ? evento.nota.substring(0, 80) + '...' : evento.nota}&rdquo;
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                                {historial.length > 3 && (
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setTabMobile(1)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'center' }}
                                    >
                                        Ver {historial.length - 3} evento(s) más →
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    )}

                    {/* ==================== FIN TAB INFO ==================== */}
                    </>)}

                    {/* ==================== TAB HISTORIAL ==================== */}
                    {((isMobile && tabMobile === 1) || (!isMobile && tabDesktop === 1)) && (
                        <Paper variant="outlined" sx={{ p: 2, height: { xs: 'auto', md: 600 }, display: 'flex', flexDirection: 'column' }}>
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

                            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
                                                    sx={{ p: 1.5, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}
                                                >
                                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                                        <Avatar sx={{ width: 28, height: 28, bgcolor: colors.border, color: 'white' }}>
                                                            {getEventoIcon(evento.tipo)}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="body2" fontWeight={500}>
                                                                {evento.descripcion}
                                                            </Typography>
                                                            {evento.nota && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                                    &ldquo;{evento.nota}&rdquo;
                                                                </Typography>
                                                            )}
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                                {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                            </Typography>
                                                        </Box>
                                                        <Tooltip title="Eliminar evento">
                                                            <IconButton 
                                                                size="small" 
                                                                onClick={() => handleEliminarEvento(evento._id)}
                                                                sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
                                                            >
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Paper>
                    )}

                    {/* ==================== TAB CHAT ==================== */}
                    {((isMobile && tabMobile === 2) || (!isMobile && tabDesktop === 2)) && (
                        <Paper variant="outlined" sx={{ overflow: 'hidden', height: { xs: 400, md: 600 } }}>
                            {contacto.telefono ? (
                                <MiniChatViewer telefono={contacto.telefono} />
                            ) : (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">Sin teléfono registrado</Typography>
                                </Box>
                            )}
                        </Paper>
                    )}

                </Container>
            </Box>

            {/* ==================== BARRA FIJA MOBILE ==================== */}
            {isMobile && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 1200,
                        bgcolor: 'background.paper',
                        borderTop: 2,
                        borderColor: contacto.cadenciaActiva?.cadenciaId && !contacto.cadenciaActiva?.completada ? 'primary.main' : 'divider',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.12)',
                        px: 1.5,
                        py: 1,
                        pb: 'calc(8px + env(safe-area-inset-bottom))',
                    }}
                >
                    {/* --- CADENCIA ACTIVA: wizard en barra fija --- */}
                    {contacto.cadenciaActiva?.cadenciaId && !contacto.cadenciaActiva?.completada ? (
                        <Box>
                            {/* Mini header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <PlayArrowIcon sx={{ fontSize: 16 }} color="primary" />
                                    <Typography variant="caption" color="primary" fontWeight={600}>
                                        {pasoActual?.paso?.nombre || `Paso ${(contacto.cadenciaActiva.pasoActual || 0) + 1}`}
                                    </Typography>
                                    {(cargandoCadencia || registrandoWizard) && <CircularProgress size={14} />}
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                    <IconButton size="small" onClick={handleAvanzarPaso} disabled={cargandoCadencia || registrandoWizard} sx={{ width: 28, height: 28 }}>
                                        <SkipNextIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={handleDetenerCadencia} disabled={cargandoCadencia || registrandoWizard} sx={{ width: 28, height: 28 }}>
                                        <StopIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Stack>
                            </Stack>

                            {/* Wizard compacto */}
                            {pasoActual?.acciones?.length > 0 && (() => {
                                const accion = pasoActual.acciones[subPasoIdx];
                                if (!accion) {
                                    return (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleAvanzarPaso}
                                            disabled={cargandoCadencia}
                                            endIcon={<SkipNextIcon />}
                                            fullWidth
                                        >
                                            Avanzar al siguiente paso
                                        </Button>
                                    );
                                }
                                const canal = accion.tipo || accion.canal;

                                return (
                                    <Box>
                                        {/* LLAMADA */}
                                        {canal === 'llamada' && (
                                            <Box>
                                                {wizardFase === 'accion' && (
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<PhoneIcon />}
                                                        onClick={() => { handleLlamar(); setWizardFase('resultado'); }}
                                                        fullWidth
                                                        sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, py: 1 }}
                                                    >
                                                        Llamar a {contacto.nombre?.split(' ')[0] || 'contacto'}
                                                    </Button>
                                                )}
                                                {wizardFase === 'resultado' && (
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<CheckCircleIcon />}
                                                            onClick={() => { setResultadoLlamada('atendio'); setWizardFase('seguimiento'); }}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            Atendió
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            color="warning"
                                                            startIcon={<PhoneMissedIcon />}
                                                            onClick={() => { setResultadoLlamada('no_atendio'); setWizardFase('nota'); }}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            No atendió
                                                        </Button>
                                                    </Stack>
                                                )}
                                                {wizardFase === 'seguimiento' && (
                                                    <Box>
                                                        <Chip size="small" label="✅ Atendió" color="success" sx={{ mb: 1 }} />
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Button
                                                                variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<PhoneCallbackIcon />}
                                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Llamar después
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<ScheduleSendIcon />}
                                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Mensaje después
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<EventIcon />}
                                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Reunión
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}
                                                {wizardFase === 'nota' && (
                                                    <Box>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                            <Chip
                                                                size="small"
                                                                label={resultadoLlamada === 'atendio' ? '✅ Atendió' : '❌ No atendió'}
                                                                color={resultadoLlamada === 'atendio' ? 'success' : 'warning'}
                                                            />
                                                            {seguimientoWizard && (
                                                                <Chip
                                                                    size="small"
                                                                    label={seguimientoWizard === 'llamar_despues' ? '📞' : seguimientoWizard === 'mensaje_despues' ? '💬' : '📅'}
                                                                    color="info"
                                                                    variant="outlined"
                                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }}
                                                                    sx={{ height: 22 }}
                                                                />
                                                            )}
                                                        </Stack>
                                                        {renderProximoContactoPicker(true)}
                                                        <Button
                                                            variant="contained"
                                                            onClick={handleWizardRegistrarLlamada}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            fullWidth
                                                            size="small"
                                                        >
                                                            {registrandoWizard ? <CircularProgress size={20} color="inherit" /> : 'Registrar ✓'}
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* WHATSAPP */}
                                        {canal === 'whatsapp' && (
                                            <Box>
                                                {wizardFase === 'accion' && (
                                                    <Box>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            multiline
                                                            maxRows={3}
                                                            value={mensajeWA}
                                                            onChange={(e) => setMensajeWA(e.target.value)}
                                                            sx={{ mb: 1 }}
                                                            placeholder="Mensaje para WhatsApp..."
                                                        />
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<WhatsAppIcon />}
                                                            onClick={handleWizardEnviarWA}
                                                            disabled={!mensajeWA.trim()}
                                                            fullWidth
                                                            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
                                                        >
                                                            Enviar por WhatsApp
                                                        </Button>
                                                    </Box>
                                                )}
                                                {wizardFase === 'resultado' && (
                                                    <Box>
                                                        <Chip size="small" icon={<CheckCircleIcon />} label="Enviado" color="success" sx={{ mb: 1 }} />
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }}
                                                                sx={{ flex: 1 }}
                                                            >
                                                                Ya respondió
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="info"
                                                                size="small"
                                                                startIcon={<AccessTimeIcon />}
                                                                onClick={() => setWizardFase('esperar_respuesta')}
                                                                sx={{ flex: 1 }}
                                                            >
                                                                Esperar
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}
                                                {wizardFase === 'pendiente_confirmacion' && (
                                                    <Box>
                                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA pendiente" color="info" sx={{ mb: 1 }} />
                                                        <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                                                            ¿Respondió al WA que enviaste?
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }}
                                                                sx={{ flex: 1 }}
                                                            >
                                                                Sí
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                size="small"
                                                                startIcon={<AccessTimeIcon />}
                                                                onClick={() => { setResultadoWA('no_respondio'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1 }}
                                                            >
                                                                No
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}
                                                {wizardFase === 'esperar_respuesta' && (
                                                    <Box>
                                                        <Chip size="small" icon={<AccessTimeIcon />} label="Esperando" color="info" sx={{ mb: 1 }} />
                                                        {renderProximoContactoPicker(true)}
                                                        <Button
                                                            variant="contained"
                                                            onClick={handleWizardEsperarRespuesta}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            fullWidth
                                                            size="small"
                                                        >
                                                            {registrandoWizard ? <CircularProgress size={16} color="inherit" /> : 'Confirmar y esperar'}
                                                        </Button>
                                                    </Box>
                                                )}
                                                {wizardFase === 'seguimiento' && (
                                                    <Box>
                                                        <Chip size="small" label="✅ Respondió" color="success" sx={{ mb: 1 }} />
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Button
                                                                variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<PhoneCallbackIcon />}
                                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Llamar después
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<ScheduleSendIcon />}
                                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Mensaje después
                                                            </Button>
                                                            <Button
                                                                variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                                size="small"
                                                                startIcon={<EventIcon />}
                                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                                sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}
                                                            >
                                                                Reunión
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                )}
                                                {wizardFase === 'nota' && (
                                                    <Box>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                            <Chip
                                                                size="small"
                                                                label={resultadoWA === 'respondio' ? '✅ Respondió' : '⏳ No respondió'}
                                                                color={resultadoWA === 'respondio' ? 'success' : 'warning'}
                                                            />
                                                            {seguimientoWizard && (
                                                                <Chip
                                                                    size="small"
                                                                    label={seguimientoWizard === 'llamar_despues' ? '📞' : seguimientoWizard === 'mensaje_despues' ? '💬' : '📅'}
                                                                    color="info"
                                                                    variant="outlined"
                                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }}
                                                                    sx={{ height: 22 }}
                                                                />
                                                            )}
                                                            {resultadoWA === 'no_respondio' && pasoActual?.paso?.delayDias > 0 && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                                    Próximo paso en {pasoActual.paso.delayDias}d
                                                                </Typography>
                                                            )}
                                                        </Stack>
                                                        {renderProximoContactoPicker(true)}
                                                        <Button
                                                            variant="contained"
                                                            onClick={handleWizardConfirmarWA}
                                                            disabled={registrandoWizard || !proximoContactoWizard}
                                                            fullWidth
                                                            size="small"
                                                        >
                                                            {registrandoWizard ? <CircularProgress size={20} color="inherit" /> : 'Registrar ✓'}
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* EMAIL */}
                                        {canal === 'email' && (
                                            <Box>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    maxRows={3}
                                                    value={mensajeWA}
                                                    onChange={(e) => setMensajeWA(e.target.value)}
                                                    sx={{ mb: 1 }}
                                                    placeholder="Contenido del email..."
                                                />
                                                {renderProximoContactoPicker(true)}
                                                <Button
                                                    variant="contained"
                                                    startIcon={<EmailIcon />}
                                                    onClick={async () => {
                                                        if (contacto.email) window.open(`mailto:${contacto.email}?body=${encodeURIComponent(mensajeWA)}`);
                                                        setRegistrandoWizard(true);
                                                        try {
                                                            await SDRService.registrarIntento(contacto._id, { tipo: 'email_enviado', canal: 'email', nota: mensajeWA.trim() || undefined, empresaId, proximoContacto: proximoContactoWizard || undefined });
                                                            if (proximoContactoWizard) {
                                                                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard }));
                                                            }
                                                            mostrarSnackbar('Email registrado ✓');
                                                            await avanzarSubPasoWizard(resultadoLlamada, resultadoWA);
                                                        } catch (err) {
                                                            mostrarSnackbar('Error al registrar', 'error');
                                                        } finally {
                                                            setRegistrandoWizard(false);
                                                        }
                                                    }}
                                                    disabled={registrandoWizard || !proximoContactoWizard}
                                                    fullWidth
                                                >
                                                    Enviar Email
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })()}

                            {!pasoActual && !cargandoCadencia && (
                                <Typography variant="caption" color="text.secondary">
                                    No se pudo cargar la cadencia
                                </Typography>
                            )}

                            {/* Botón para otra acción */}
                            <Box sx={{ textAlign: 'center', mt: 1 }}>
                                <Button
                                    size="small"
                                    variant="text"
                                    color="inherit"
                                    onClick={() => setModalRegistrarAccion(true)}
                                    sx={{ fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary', py: 0 }}
                                >
                                    Otra acción →
                                </Button>
                            </Box>

                            {/* Botón siguiente contacto */}
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleSiguienteContacto}
                                endIcon={<ChevronRightIcon />}
                                size="small"
                                sx={{ mt: 1.5, py: 1, fontWeight: 600, borderRadius: 2 }}
                            >
                                {puedeSiguiente ? `Siguiente (${indiceActual + 2}/${contactoIds.length})` : 'Volver al listado'}
                            </Button>
                        </Box>
                    ) : (
                        /* --- SIN CADENCIA: botones de acción clásicos --- */
                        <Stack direction="row" justifyContent="space-around" alignItems="center">
                            <IconButton onClick={() => handleAccion('llamada', true)} sx={{ bgcolor: '#4caf50', color: 'white', '&:hover': { bgcolor: '#388e3c' }, width: 42, height: 42 }}>
                                <PhoneIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleAccion('llamada', false)} sx={{ bgcolor: '#ff9800', color: 'white', '&:hover': { bgcolor: '#f57c00' }, width: 42, height: 42 }}>
                                <PhoneMissedIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleAccion('whatsapp')} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#128C7E' }, width: 42, height: 42 }}>
                                <WhatsAppIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleAccion('no_responde')} sx={{ border: 1, borderColor: 'grey.400', width: 42, height: 42 }}>
                                <PhoneDisabledIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={handleMarcarNoCalifica} sx={{ border: 1, borderColor: 'error.light', color: 'error.main', width: 42, height: 42 }}>
                                <DoNotDisturbIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => setModalReunion(true)} sx={{ border: 1, borderColor: 'primary.light', color: 'primary.main', width: 42, height: 42 }}>
                                <EventIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => setModalRegistrarAccion(true)} sx={{ border: 1, borderColor: 'primary.light', color: 'primary.main', width: 42, height: 42 }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    )}
                </Box>
            )}

            {/* Modal editar contacto */}
            <ModalEditarContacto
                open={modalEditarContacto}
                onClose={() => setModalEditarContacto(false)}
                contacto={contacto}
                empresaId={empresaId}
                onSuccess={(contactoActualizado) => {
                    if (contactoActualizado) setContacto(contactoActualizado);
                    setModalEditarContacto(false);
                    mostrarSnackbar('Contacto actualizado');
                    cargarContacto();
                }}
            />

            {/* Modal acción avanzada */}
            {modalRegistrarAccion && (
                <ModalRegistrarAccion
                    open={modalRegistrarAccion}
                    onClose={() => setModalRegistrarAccion(false)}
                    contacto={contacto}
                    empresaId={empresaId}
                    onSuccess={handleAccionAvanzada}
                    mostrarSnackbar={mostrarSnackbar}
                />
            )}

            {/* Modal Reunión */}
            <ModalReunionSDR
                open={modalReunion}
                onClose={() => setModalReunion(false)}
                contacto={contacto}
                onSubmit={handleRegistrarReunion}
                loading={guardandoReunion}
            />

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

// ==================== MODAL REUNIÓN ====================
const TAMANOS_EMPRESA = ['1-10', '11-50', '51-200', '200+'];

const ModalReunionSDR = ({ open, onClose, contacto, onSubmit, loading }) => {
    const [form, setForm] = useState({
        fechaHora: '',
        empresaNombre: '',
        tamanoEmpresa: '',
        contactoPrincipal: '',
        rolContacto: '',
        puntosDeDolor: '',
        modulosPotenciales: '',
        linkAgenda: ''
    });

    useEffect(() => {
        if (contacto && open) {
            setForm({
                fechaHora: '',
                empresaNombre: contacto.empresa || '',
                tamanoEmpresa: contacto.tamanoEmpresa || '',
                contactoPrincipal: contacto.nombre || '',
                rolContacto: contacto.cargo || '',
                puntosDeDolor: '',
                modulosPotenciales: '',
                linkAgenda: ''
            });
        }
    }, [contacto, open]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>📅 Registrar Reunión</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Fecha y hora *"
                        type="datetime-local"
                        value={form.fechaHora}
                        onChange={(e) => setForm({ ...form, fechaHora: e.target.value })}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <TextField
                        label="Nombre de la empresa *"
                        value={form.empresaNombre}
                        onChange={(e) => setForm({ ...form, empresaNombre: e.target.value })}
                        fullWidth
                        required
                    />
                    <FormControl fullWidth required>
                        <InputLabel>Tamaño de empresa *</InputLabel>
                        <Select
                            value={form.tamanoEmpresa}
                            label="Tamaño de empresa *"
                            onChange={(e) => setForm({ ...form, tamanoEmpresa: e.target.value })}
                        >
                            {TAMANOS_EMPRESA.map(t => (
                                <MenuItem key={t} value={t}>{t} empleados</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Contacto principal *"
                        value={form.contactoPrincipal}
                        onChange={(e) => setForm({ ...form, contactoPrincipal: e.target.value })}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Rol del contacto"
                        value={form.rolContacto}
                        onChange={(e) => setForm({ ...form, rolContacto: e.target.value })}
                        fullWidth
                        placeholder="Ej: Gerente, Dueño, etc."
                    />
                    <TextField
                        label="Puntos de dolor"
                        value={form.puntosDeDolor}
                        onChange={(e) => setForm({ ...form, puntosDeDolor: e.target.value })}
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="¿Qué problemas tiene la empresa?"
                    />
                    <TextField
                        label="Módulos potenciales"
                        value={form.modulosPotenciales}
                        onChange={(e) => setForm({ ...form, modulosPotenciales: e.target.value })}
                        fullWidth
                        placeholder="Ej: Facturación, Stock, etc."
                    />
                    <TextField
                        label="Link de la reunión"
                        value={form.linkAgenda}
                        onChange={(e) => setForm({ ...form, linkAgenda: e.target.value })}
                        fullWidth
                        placeholder="Google Meet, Zoom, etc."
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    onClick={() => onSubmit(form)}
                    disabled={!form.fechaHora || !form.empresaNombre || !form.tamanoEmpresa || !form.contactoPrincipal || loading}
                >
                    {loading ? <CircularProgress size={20} /> : 'Registrar Reunión'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ContactoSDRDetailPage;
