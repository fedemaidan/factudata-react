import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    Box, Container, Stack, Typography, Button, TextField, Chip,
    CircularProgress, Paper, IconButton, Card, CardContent,
    Snackbar, Alert, Avatar, Tooltip, Divider, Grid,
    Tabs, Tab,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel,
    useTheme, useMediaQuery, Skeleton,
    Menu, ListItemIcon, ListItemText
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
    ScheduleSend as ScheduleSendIcon,
    Mic as MicIcon,
    Pause as PauseIcon,
    GraphicEq as GraphicEqIcon,
    DeleteOutline as DeleteOutlineIcon,
    FileUpload as FileUploadIcon,
    Download as DownloadIcon
} from '@mui/icons-material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import SDRService from 'src/services/sdrService';
import { EstadoChip, EstadoChipEditable, ModalEditarContacto } from 'src/components/sdr/DrawerDetalleContactoSDR';
import ModalRegistrarAccion from 'src/components/sdr/ModalRegistrarAccion';
import ModalSelectorTemplate, { replaceVariables } from 'src/components/sdr/ModalSelectorTemplate';
import ModalCrearReunion from 'src/components/sdr/ModalCrearReunion';
import { detectarContextoTemplate, obtenerMejorTemplate } from 'src/utils/templateContexto';
import { getWhatsAppLink, getTelLink } from 'src/utils/phoneUtils';
import {
    PLANES_SORBY,
    INTENCIONES_COMPRA,
    PRECALIFICACION_BOT,
    ESTADOS_REUNION
} from 'src/constant/sdrConstants';
import MiniChatViewer from 'src/components/sdr/MiniChatViewer';
import useGrabadorAudio from 'src/hooks/useGrabadorAudio';
import SendTemplateDialog from 'src/components/conversaciones/SendTemplateDialog';
import config from 'src/config/config';

// Helper: convierte URL relativa de audio (/api/sdr/audios/...) a URL absoluta del backend
const resolveAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // config.apiUrl = 'http://localhost:3003/api' → base = 'http://localhost:3003'
    const baseUrl = config.apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
};

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
        'audio_grabado': { bg: '#fce4ec', border: '#f48fb1', icon: '#c2185b' },
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
        'audio_grabado': <GraphicEqIcon fontSize="small" />,
        'proximo_contacto_programado': <EventIcon fontSize="small" />,
        'contacto_editado': <PersonIcon fontSize="small" />,
        'estado_cambiado': <EditIcon fontSize="small" />,
        'plan_estimado_actualizado': <TrendingUpIcon fontSize="small" />,
        'intencion_compra_actualizada': <TrendingUpIcon fontSize="small" />,
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

const botonesProximoContacto = [
    { label: '⚡ Ahora', cantidad: 0, unidad: 'ahora' },
    { label: 'Hoy tarde', cantidad: 0, unidad: 'tarde' },
    { label: 'Mañana AM', cantidad: 1, unidad: 'manana' },
    { label: 'Mañana PM', cantidad: 1, unidad: 'tarde_dia' },
    { label: '3 días', cantidad: 3, unidad: 'days' },
    { label: '1 semana', cantidad: 7, unidad: 'days' },
    { label: '2 meses', cantidad: 2, unidad: 'months' },
];

// Categorías para filtrar historial
const FILTROS_HISTORIAL = [
    { key: 'todos', label: 'Todos', icon: '📋', tipos: null },
    { key: 'comentarios', label: 'Comentarios', icon: '💭', tipos: ['comentario', 'nota_agregada', 'contexto_inicial'] },
    { key: 'llamadas', label: 'Llamadas', icon: '📞', tipos: ['llamada_atendida', 'llamada_no_atendida'] },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬', tipos: ['whatsapp_enviado', 'whatsapp_respuesta_confirmada'] },
    { key: 'email', label: 'Email / LinkedIn', icon: '✉️', tipos: ['email_enviado', 'linkedin_enviado'] },
    { key: 'reuniones', label: 'Reuniones', icon: '📅', tipos: ['reunion_coordinada', 'reunion_aprobada', 'reunion_rechazada'] },
    { key: 'audio', label: 'Audios', icon: '🎙️', tipos: ['audio_grabado'] },
    { key: 'sistema', label: 'Sistema', icon: '⚙️', tipos: ['contacto_creado', 'contacto_asignado', 'contacto_desasignado', 'contacto_reasignado', 'importado_excel', 'importado_notion', 'contacto_editado', 'estado_cambiado', 'plan_estimado_actualizado', 'intencion_compra_actualizada', 'proximo_contacto_programado', 'marcado_no_califica', 'marcado_no_responde', 'cadencia_iniciada', 'cadencia_paso_completado', 'cadencia_completada', 'cadencia_detenida'] },
];

/** Agrupa eventos del historial por bloques temporales (misma sesión ~30min) */
const agruparEventosPorBloque = (eventos) => {
    if (!eventos?.length) return [];
    const grupos = [];
    let grupoActual = null;

    for (const evento of eventos) {
        const fecha = new Date(evento.createdAt);
        // Nuevo grupo si: no hay grupo actual, o si pasaron más de 30 min desde el último evento del grupo
        if (!grupoActual || (grupoActual.ultimaFecha - fecha) > 30 * 60 * 1000) {
            grupoActual = { fecha, ultimaFecha: fecha, eventos: [evento] };
            grupos.push(grupoActual);
        } else {
            grupoActual.eventos.push(evento);
            grupoActual.ultimaFecha = fecha;
        }
    }
    return grupos;
};

/** Formatea la etiqueta temporal del grupo */
const formatearEtiquetaGrupo = (fecha) => {
    const ahora = new Date();
    const diff = ahora - fecha;
    const dias = Math.floor(diff / 86400000);
    const horas = fecha.getHours().toString().padStart(2, '0');
    const mins = fecha.getMinutes().toString().padStart(2, '0');

    if (dias === 0) return `Hoy ${horas}:${mins}`;
    if (dias === 1) return `Ayer ${horas}:${mins}`;
    if (dias < 7) {
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `${diasSemana[fecha.getDay()]} ${horas}:${mins}`;
    }
    return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ` ${horas}:${mins}`;
};

const calcularFecha = (cantidad, unidad) => {
    const ahora = new Date();
    if (unidad === 'ahora') {
        ahora.setMinutes(ahora.getMinutes() + 1);
        return ahora;
    } else if (unidad === 'hours') {
        ahora.setHours(ahora.getHours() + cantidad);
    } else if (unidad === 'days') {
        ahora.setDate(ahora.getDate() + cantidad);
        ahora.setHours(9, 0, 0, 0);
    } else if (unidad === 'months') {
        ahora.setMonth(ahora.getMonth() + cantidad);
        ahora.setHours(9, 0, 0, 0);
    } else if (unidad === 'tarde') {
        // Hoy a las 15:00 (si ya pasó, poner 17:00; si ya pasó también, mañana 15:00)
        const hoy = new Date();
        hoy.setHours(15, 0, 0, 0);
        if (hoy <= ahora) { hoy.setHours(17, 0, 0, 0); }
        if (hoy <= ahora) { hoy.setDate(hoy.getDate() + 1); hoy.setHours(15, 0, 0, 0); }
        return hoy;
    } else if (unidad === 'manana') {
        // Mañana a las 9:00
        ahora.setDate(ahora.getDate() + 1);
        ahora.setHours(9, 0, 0, 0);
    } else if (unidad === 'tarde_dia') {
        // Mañana a las 15:00
        ahora.setDate(ahora.getDate() + 1);
        ahora.setHours(15, 0, 0, 0);
    }
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

    // Próximo contacto / Tarea
    const [guardandoProximo, setGuardandoProximo] = useState(false);
    const [proximoManualInput, setProximoManualInput] = useState(''); // valor pendiente del datetime-local
    // Editor de tarea
    const [editandoTarea, setEditandoTarea] = useState(false);
    const [editTareaTipo, setEditTareaTipo] = useState(null);
    const [editTareaFecha, setEditTareaFecha] = useState(null);
    const [editTareaNota, setEditTareaNota] = useState('');

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

    // Modal selector de templates WhatsApp (Fase 2)
    const [modalTemplateWA, setModalTemplateWA] = useState(false);
    const [templatesWA, setTemplatesWA] = useState([]); // Cache de templates cargados

    // Modal envío de template Meta (aprobado) via bot
    const [modalMetaTemplate, setModalMetaTemplate] = useState(false);
    const tienePermisoEnviarBot = user?.admin || (user?.empresa?.acciones || []).includes('ENVIAR_MENSAJE_BOT');

    // Tab mobile para chat/historial
    const [tabMobile, setTabMobile] = useState(0);
    // Tab desktop (Info / Historial / Chat)
    const [tabDesktop, setTabDesktop] = useState(0);
    // Filtro de historial por categoría
    const [filtroHistorial, setFiltroHistorial] = useState('todos');

    // Re-asignación de SDR
    const [menuAsignarAnchor, setMenuAsignarAnchor] = useState(null);
    const [sdrsDisponibles, setSdrsDisponibles] = useState([]);
    const [cargandoSdrs, setCargandoSdrs] = useState(false);
    const [asignando, setAsignando] = useState(false);

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
    const [tipoTareaWizard, setTipoTareaWizard] = useState(null); // 'llamada' | 'whatsapp' | 'email' | 'recordatorio'
    const [notaTareaWizard, setNotaTareaWizard] = useState(''); // nota de la próxima tarea

    // Audio
    const grabador = useGrabadorAudio();
    const [subiendoAudio, setSubiendoAudio] = useState(false);
    const [subiendoArchivo, setSubiendoArchivo] = useState(false);
    const [reanalizandoEvento, setReanalizandoEvento] = useState(null); // eventoId que se está re-analizando
    const fileInputRef = useRef(null);

    // Navegación entre contactos (IDs guardados en sessionStorage)
    const [contactoIds, setContactoIds] = useState([]);
    const [indiceActual, setIndiceActual] = useState(-1);

    const mostrarSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    // Historial filtrado por categoría
    const historialFiltrado = filtroHistorial === 'todos'
        ? historial
        : historial.filter(e => {
            const cat = FILTROS_HISTORIAL.find(f => f.key === filtroHistorial);
            return cat?.tipos?.includes(e.tipo);
        });

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

    // Abrir menú de re-asignación de SDR
    const handleAbrirMenuAsignar = async (event) => {
        setMenuAsignarAnchor(event.currentTarget);
        setCargandoSdrs(true);
        try {
            const data = await SDRService.obtenerSDRsDisponibles(empresaId);
            setSdrsDisponibles(data.sdrs || data || []);
        } catch (err) {
            console.error('Error cargando SDRs:', err);
            mostrarSnackbar('Error al cargar SDRs disponibles', 'error');
        } finally {
            setCargandoSdrs(false);
        }
    };

    // Re-asignar a otro SDR
    const handleReasignar = async (nuevoSdrId, nuevoSdrNombre) => {
        setAsignando(true);
        try {
            await SDRService.asignarContactos([contacto._id], nuevoSdrId, nuevoSdrNombre, empresaId);
            mostrarSnackbar(`Contacto re-asignado a ${nuevoSdrNombre}`);
            setMenuAsignarAnchor(null);
            await cargarContacto();
        } catch (err) {
            console.error('Error re-asignando:', err);
            mostrarSnackbar('Error al re-asignar contacto', 'error');
        } finally {
            setAsignando(false);
        }
    };

    // Desasignar contacto
    const handleDesasignar = async () => {
        if (!window.confirm('¿Desasignar este contacto? Quedará sin SDR asignado.')) return;
        setAsignando(true);
        try {
            await SDRService.desasignarContactos([contacto._id], empresaId);
            mostrarSnackbar('Contacto desasignado');
            setMenuAsignarAnchor(null);
            await cargarContacto();
        } catch (err) {
            console.error('Error desasignando:', err);
            mostrarSnackbar('Error al desasignar contacto', 'error');
        } finally {
            setAsignando(false);
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

    // Cargar templates de WA (para auto-fill) — Fase 2
    useEffect(() => {
        if (empresaId) {
            SDRService.listarTemplatesWhatsApp(empresaId)
                .then(data => setTemplatesWA(data.templates || []))
                .catch(() => setTemplatesWA([]));
        }
    }, [empresaId]);

    // Auto-fill mensajeWA con mejor template cuando cambia el contacto (Fase 2)
    useEffect(() => {
        if (contacto && templatesWA.length > 0 && !mensajeWA) {
            const mejor = obtenerMejorTemplate(templatesWA, contacto);
            if (mejor) {
                const mensaje = replaceVariables(mejor.body, contacto, user);
                if (mensaje) setMensajeWA(mensaje);
            }
        }
    }, [contacto?._id, contacto?.estado, templatesWA.length]);

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
            setTipoTareaWizard(null);
            setNotaTareaWizard('');
            setNotaWizard('');
            setMensajeWA('');
        } else {
            setSubPasoIdx(0);
            setResultadoLlamada(null);
            setResultadoWA(null);
            setWizardFase('accion');
            setSeguimientoWizard(null);
            setProximoContactoWizard(null);
            setTipoTareaWizard(null);
            setNotaTareaWizard('');
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

    /** Ir al siguiente contacto o al listado, validando que tenga próximo contacto futuro. */
    const handleSiguienteContacto = () => {
        const prox = contacto?.proximoContacto ? new Date(contacto.proximoContacto) : null;
        
        if (prox && prox > new Date()) {
            if (puedeSiguiente) {
                navegar('siguiente');
            } else {
                router.push('/contactosSDR');
            }
        } else {
            mostrarSnackbar('Definí una fecha de próximo contacto antes de continuar', 'warning');
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

    const handleEnviarAudio = async () => {
        if (!grabador.audioBlob || !contacto?._id) return;
        setSubiendoAudio(true);
        try {
            await SDRService.subirAudio(contacto._id, grabador.audioBlob, {
                duracion: grabador.duracion,
                nota: nuevoComentario.trim() || '',
                empresaId
            });
            mostrarSnackbar('🎙️ Audio guardado y transcrito', 'success');
            grabador.limpiar();
            setNuevoComentario('');
            await cargarContacto();
        } catch (err) {
            console.error('Error subiendo audio:', err);
            mostrarSnackbar('Error al subir el audio', 'error');
        } finally {
            setSubiendoAudio(false);
        }
    };

    const handleSubirGrabacion = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !contacto?._id) return;
        // Reset input para poder seleccionar el mismo archivo de nuevo
        e.target.value = '';
        
        // Pedir comentario opcional para contexto del análisis IA
        const comentario = prompt('💬 Comentario para el análisis IA (opcional):\nEj: "Llamada de seguimiento, le interesaba el módulo de stock"', '');
        if (comentario === null) return; // Canceló
        
        setSubiendoArchivo(true);
        try {
            const notaFinal = comentario.trim() 
                ? `📁 ${file.name} — ${comentario.trim()}`
                : `📁 Archivo subido: ${file.name}`;
            await SDRService.subirAudio(contacto._id, file, {
                duracion: null,
                nota: notaFinal,
                empresaId
            });
            mostrarSnackbar('📁 Grabación subida y analizada', 'success');
            await cargarContacto();
        } catch (err) {
            console.error('Error subiendo grabación:', err);
            mostrarSnackbar('Error al subir la grabación', 'error');
        } finally {
            setSubiendoArchivo(false);
        }
    };

    const handleReanalizarAudio = async (eventoId) => {
        const comentario = prompt('💬 Indicación para el re-análisis (opcional):\nEj: "Enfocate en los problemas que mencionó", "Es una constructora grande"', '');
        if (comentario === null) return; // Canceló
        
        setReanalizandoEvento(eventoId);
        try {
            await SDRService.reanalizarAudio(eventoId, comentario.trim());
            mostrarSnackbar('🤖 Audio re-analizado', 'success');
            await cargarContacto();
        } catch (err) {
            console.error('Error re-analizando:', err);
            mostrarSnackbar('Error al re-analizar el audio', 'error');
        } finally {
            setReanalizandoEvento(null);
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
            await SDRService.actualizarProximoContacto(contacto._id, fecha, empresaId);
            setContacto(prev => ({ ...prev, proximoContacto: fecha }));
            mostrarSnackbar(fecha ? 'Próxima tarea programada' : 'Próxima tarea eliminada');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al actualizar próximo contacto', 'error');
        } finally {
            setGuardandoProximo(false);
        }
    };

    /** Guardar tarea completa (tipo + fecha + nota) */
    const handleGuardarProximaTarea = async (tipo, fecha, nota) => {
        if (!contacto?._id || !tipo || !fecha) return;
        setGuardandoProximo(true);
        try {
            const proximaTarea = { tipo, fecha, nota: nota?.trim() || null, autoGenerada: false };
            await SDRService.actualizarProximoContacto(contacto._id, fecha, empresaId, proximaTarea);
            setContacto(prev => ({
                ...prev,
                proximoContacto: fecha,
                proximaTarea
            }));
            setEditandoTarea(false);
            setEditTareaTipo(null);
            setEditTareaFecha(null);
            setEditTareaNota('');
            mostrarSnackbar('Próxima tarea guardada ✓');
            cargarContacto();
        } catch (err) {
            mostrarSnackbar('Error al guardar tarea', 'error');
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
                await SDRService.avanzarPasoCadencia(contacto._id, proximoContactoWizard || undefined);
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

    /** Construye el objeto proximaTarea desde el estado del wizard */
    const buildProximaTarea = () => {
        if (!proximoContactoWizard) return undefined;
        // Usar tipo auto-seleccionado del seguimiento, o el elegido manualmente, o 'recordatorio'
        let tipo = tipoTareaWizard;
        if (seguimientoWizard === 'llamar_despues') tipo = 'llamada';
        else if (seguimientoWizard === 'mensaje_despues') tipo = 'whatsapp';
        else if (seguimientoWizard === 'coordinar_reunion') tipo = 'recordatorio';
        return {
            tipo: tipo || 'recordatorio',
            fecha: proximoContactoWizard,
            nota: notaTareaWizard?.trim() || null,
            autoGenerada: false
        };
    };

    /** Registra llamada del wizard y avanza */
    const handleWizardRegistrarLlamada = async () => {
        setRegistrandoWizard(true);
        try {
            const proximaTarea = buildProximaTarea();
            await SDRService.registrarIntento(contacto._id, {
                tipo: resultadoLlamada === 'atendio' ? 'llamada_atendida' : 'llamada_no_atendida',
                canal: 'llamada',
                resultado: resultadoLlamada,
                seguimiento: seguimientoWizard || undefined,
                proximoContacto: proximoContactoWizard || undefined,
                proximaTarea,
                empresaId
            });
            // Actualizar próximo contacto y tarea en el contacto local
            if (proximoContactoWizard) {
                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard, proximaTarea: proximaTarea || prev.proximaTarea }));
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

    /** Callback cuando el usuario elige un template desde el modal */
    const handleTemplateSelected = (mensaje) => {
        setMensajeWA(mensaje);
        setModalTemplateWA(false);
    };

    /** Confirma envío de WA, registra y avanza */
    const handleWizardConfirmarWA = async () => {
        setRegistrandoWizard(true);
        const esPendiente = contacto?.cadenciaActiva?.waPendienteRespuesta;
        try {
            const proximaTarea = buildProximaTarea();
            await SDRService.registrarIntento(contacto._id, {
                tipo: esPendiente ? 'whatsapp_respuesta_confirmada' : 'whatsapp_enviado',
                canal: 'whatsapp',
                resultado: resultadoWA,
                seguimiento: seguimientoWizard || undefined,
                nota: mensajeWA?.trim() || undefined,
                proximoContacto: proximoContactoWizard || undefined,
                proximaTarea,
                confirmarRespuestaWA: esPendiente || undefined,
                empresaId
            });
            if (proximoContactoWizard) {
                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard, proximaTarea: proximaTarea || prev.proximaTarea }));
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
            // Para "esperar respuesta", la tarea es un recordatorio para revisar si respondió
            const proximaTarea = proximoContactoWizard ? {
                tipo: 'recordatorio',
                fecha: proximoContactoWizard,
                nota: 'Revisar si respondió al WhatsApp',
                autoGenerada: true
            } : undefined;
            await SDRService.registrarIntento(contacto._id, {
                tipo: 'whatsapp_enviado',
                canal: 'whatsapp',
                resultado: 'pendiente',
                nota: mensajeWA?.trim() || undefined,
                proximoContacto: proximoContactoWizard,
                proximaTarea,
                pendienteRespuesta: true,
                waSubPasoIdx: subPasoIdx,
                empresaId
            });
            setContacto(prev => ({
                ...prev,
                proximoContacto: proximoContactoWizard,
                proximaTarea: proximaTarea || prev.proximaTarea,
                cadenciaActiva: { ...prev.cadenciaActiva, waPendienteRespuesta: true, waSubPasoIdx: subPasoIdx }
            }));
            mostrarSnackbar('WA registrado. Te preguntaremos en el próximo contacto ⏳');
            setWizardFase('pendiente_confirmacion');
            setResultadoWA(null);
            setNotaWizard('');
            setProximoContactoWizard(null);
            setTipoTareaWizard(null);
            setNotaTareaWizard('');
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
        // Formatear en hora LOCAL (no UTC) para que el input datetime-local muestre correctamente
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // ==================== PROXIMO CONTACTO / TAREA PICKER ====================
    
    // Iconos y labels para tipos de tarea
    const TIPOS_TAREA = [
        { key: 'llamada', icon: '📞', label: 'Llamar' },
        { key: 'whatsapp', icon: '💬', label: 'WhatsApp' },
        { key: 'email', icon: '✉️', label: 'Email' },
        { key: 'recordatorio', icon: '📝', label: 'Recordatorio' },
    ];

    // Auto-seleccionar tipo de tarea basado en seguimiento del wizard
    const autoSeleccionarTipoTarea = () => {
        if (seguimientoWizard === 'llamar_despues') return 'llamada';
        if (seguimientoWizard === 'mensaje_despues') return 'whatsapp';
        if (seguimientoWizard === 'coordinar_reunion') return 'recordatorio';
        return tipoTareaWizard;
    };

    const renderProximoContactoPicker = (compact = false) => {
        const tipoTareaActual = autoSeleccionarTipoTarea() || tipoTareaWizard;
        const tareaCompleta = proximoContactoWizard && tipoTareaActual;

        return (
        <Box sx={{ mb: compact ? 1 : 1.5, p: compact ? 1 : 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: tareaCompleta ? 'success.light' : 'warning.light' }}>
            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                🎯 Próxima tarea {!tareaCompleta && <span style={{ color: '#d32f2f' }}>*</span>}
            </Typography>

            {/* Tipo de tarea */}
            <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                {TIPOS_TAREA.map((t) => (
                    <Chip
                        key={t.key}
                        size="small"
                        icon={<span style={{ fontSize: '0.85rem' }}>{t.icon}</span>}
                        label={t.label}
                        color={tipoTareaActual === t.key ? 'primary' : 'default'}
                        variant={tipoTareaActual === t.key ? 'filled' : 'outlined'}
                        onClick={() => setTipoTareaWizard(t.key)}
                        sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                    />
                ))}
            </Stack>

            {/* Fecha */}
            {proximoContactoWizard ? (
                <Chip
                    size="small"
                    label={`📅 ${new Date(proximoContactoWizard).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(proximoContactoWizard).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                    color="success"
                    onDelete={() => setProximoContactoWizard(null)}
                    sx={{ fontWeight: 600, mb: 0.5 }}
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

            {/* Nota de tarea (opcional) */}
            {(proximoContactoWizard || tipoTareaActual) && (
                <input
                    type="text"
                    placeholder="Nota para la tarea (opcional)..."
                    value={notaTareaWizard}
                    onChange={(e) => setNotaTareaWizard(e.target.value)}
                    style={{ fontSize: compact ? '0.7rem' : '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box', marginTop: 6 }}
                />
            )}
        </Box>
        );
    };

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
                                        {contacto.sdrAsignadoNombre ? (
                                            <Tooltip title="Clic para re-asignar o desasignar">
                                                <Chip
                                                    size="small"
                                                    icon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                                                    label={`👤 ${contacto.sdrAsignadoNombre}`}
                                                    variant="outlined"
                                                    onClick={handleAbrirMenuAsignar}
                                                    sx={{ 
                                                        height: 22, 
                                                        fontSize: '0.72rem',
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: 'action.hover' }
                                                    }}
                                                />
                                            </Tooltip>
                                        ) : (
                                            <Chip
                                                size="small"
                                                icon={<PersonAddIcon sx={{ fontSize: 14 }} />}
                                                label="Sin asignar"
                                                variant="outlined"
                                                color="warning"
                                                onClick={handleAbrirMenuAsignar}
                                                sx={{ height: 22, fontSize: '0.72rem', cursor: 'pointer' }}
                                            />
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

                        {/* Card: Próxima tarea — Editor completo */}
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    {/* Header */}
                                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                        <AccessTimeIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Próxima tarea
                                        </Typography>
                                        {guardandoProximo && <CircularProgress size={14} />}
                                    </Stack>

                                    {/* Tarea existente (modo vista) */}
                                    {contacto.proximoContacto && !editandoTarea ? (
                                        <Box>
                                            <Stack spacing={0.5} sx={{ mb: 1 }}>
                                                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                                    {contacto.proximaTarea?.tipo && (
                                                        <Chip
                                                            size="small"
                                                            label={
                                                                contacto.proximaTarea.tipo === 'llamada' ? '📞 Llamar' :
                                                                contacto.proximaTarea.tipo === 'whatsapp' ? '💬 WhatsApp' :
                                                                contacto.proximaTarea.tipo === 'email' ? '✉️ Email' : '📝 Recordatorio'
                                                            }
                                                            color="primary"
                                                            variant="outlined"
                                                            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                    <Chip
                                                        size="small"
                                                        icon={<ScheduleIcon />}
                                                        label={proximoInfo?.texto || 'Programado'}
                                                        color={proximoInfo?.color || 'success'}
                                                    />
                                                </Stack>
                                                {contacto.proximaTarea?.nota && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 0.5 }}>
                                                        💬 {contacto.proximaTarea.nota}
                                                    </Typography>
                                                )}
                                            </Stack>
                                            <Stack direction="row" spacing={0.5}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setEditandoTarea(true);
                                                        setEditTareaTipo(contacto.proximaTarea?.tipo || null);
                                                        setEditTareaFecha(contacto.proximoContacto ? new Date(contacto.proximoContacto) : null);
                                                        setEditTareaNota(contacto.proximaTarea?.nota || '');
                                                    }}
                                                    sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                                                >
                                                    ✏️ Modificar
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => handleGuardarProximoContacto(null)}
                                                    disabled={guardandoProximo}
                                                    sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 'auto' }}
                                                >
                                                    🗑️
                                                </Button>
                                            </Stack>
                                        </Box>
                                    ) : !editandoTarea ? (
                                        /* Sin tarea: botón crear */
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => {
                                                setEditandoTarea(true);
                                                setEditTareaTipo(null);
                                                setEditTareaFecha(null);
                                                setEditTareaNota('');
                                            }}
                                            sx={{ mb: 1, textTransform: 'none' }}
                                        >
                                            + Crear tarea
                                        </Button>
                                    ) : null}

                                    {/* Editor de tarea (crear/modificar) */}
                                    {editandoTarea && (
                                        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: (editTareaTipo && editTareaFecha) ? 'success.light' : 'warning.light' }}>
                                            {/* Tipo */}
                                            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Tipo de tarea</Typography>
                                            <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                {TIPOS_TAREA.map((t) => (
                                                    <Chip
                                                        key={t.key}
                                                        size="small"
                                                        icon={<span style={{ fontSize: '0.85rem' }}>{t.icon}</span>}
                                                        label={t.label}
                                                        color={editTareaTipo === t.key ? 'primary' : 'default'}
                                                        variant={editTareaTipo === t.key ? 'filled' : 'outlined'}
                                                        onClick={() => setEditTareaTipo(t.key)}
                                                        sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                                    />
                                                ))}
                                            </Stack>

                                            {/* Fecha */}
                                            <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Fecha</Typography>
                                            {editTareaFecha ? (
                                                <Chip
                                                    size="small"
                                                    label={`📅 ${new Date(editTareaFecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(editTareaFecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                                                    color="success"
                                                    onDelete={() => setEditTareaFecha(null)}
                                                    sx={{ fontWeight: 600, mb: 0.5 }}
                                                />
                                            ) : (
                                                <Stack spacing={0.5} sx={{ mb: 0.5 }}>
                                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                                        {botonesProximoContacto.map((btn) => (
                                                            <Button
                                                                key={btn.label}
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => setEditTareaFecha(calcularFecha(btn.cantidad, btn.unidad))}
                                                                sx={{ minWidth: 'auto', px: 1, py: 0.3, fontSize: '0.7rem', textTransform: 'none' }}
                                                            >
                                                                {btn.label}
                                                            </Button>
                                                        ))}
                                                    </Stack>
                                                    <input
                                                        type="datetime-local"
                                                        value={fechaParaInput(editTareaFecha)}
                                                        onChange={(e) => { if (e.target.value) setEditTareaFecha(new Date(e.target.value)); }}
                                                        style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                </Stack>
                                            )}

                                            {/* Nota / Comentario */}
                                            <Typography variant="caption" fontWeight={600} sx={{ mt: 1, mb: 0.5, display: 'block' }}>Comentario (opcional)</Typography>
                                            <input
                                                type="text"
                                                placeholder="Comentario para la tarea..."
                                                value={editTareaNota}
                                                onChange={(e) => setEditTareaNota(e.target.value)}
                                                style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                                            />

                                            {/* Botones guardar / cancelar */}
                                            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    color="success"
                                                    disabled={!editTareaTipo || !editTareaFecha || guardandoProximo}
                                                    onClick={() => handleGuardarProximaTarea(editTareaTipo, editTareaFecha, editTareaNota)}
                                                    sx={{ flex: 1, textTransform: 'none' }}
                                                >
                                                    {guardandoProximo ? <CircularProgress size={18} color="inherit" /> : '💾 Guardar tarea'}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => { setEditandoTarea(false); setEditTareaTipo(null); setEditTareaFecha(null); setEditTareaNota(''); }}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    Cancelar
                                                </Button>
                                            </Stack>
                                        </Box>
                                    )}

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

                        {/* Card: Resumen SDR (IA) */}
                        <Grid item xs={12}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={1}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <AutoFixHighIcon fontSize="small" color="action" />
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Resumen SDR (IA)
                                            </Typography>
                                        </Stack>
                                        <Button
                                            size="small"
                                            variant={contacto.resumenSDR ? 'outlined' : 'contained'}
                                            onClick={async () => {
                                                try {
                                                    setGuardandoScoring(true);
                                                    const data = await SDRService.generarResumenContacto(contacto._id);
                                                    setContacto(prev => ({ ...prev, resumenSDR: data.resumenSDR }));
                                                    mostrarSnackbar('Resumen generado con IA ✨');
                                                } catch (err) {
                                                    mostrarSnackbar(err.response?.data?.error || 'Error al generar resumen', 'error');
                                                } finally {
                                                    setGuardandoScoring(false);
                                                }
                                            }}
                                            disabled={guardandoScoring}
                                            sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                                        >
                                            {guardandoScoring ? <CircularProgress size={16} /> : contacto.resumenSDR ? '🔄 Regenerar' : '✨ Generar resumen'}
                                        </Button>
                                    </Stack>
                                    {contacto.resumenSDR ? (
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.82rem', lineHeight: 1.6 }}>
                                            {contacto.resumenSDR}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                            Sin resumen generado. Hacé click en "Generar resumen" para que la IA analice el historial del contacto.
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* ==================== REUNIONES (si existen) ==================== */}
                    {reuniones.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                📅 Reuniones ({reuniones.length})
                            </Typography>
                            <Stack spacing={1.5}>
                                {reuniones
                                    .sort((a, b) => new Date(b.fecha || b.fechaHora) - new Date(a.fecha || a.fechaHora))
                                    .map((reunion) => {
                                    const estadoConf = ESTADOS_REUNION[reunion.estado] || {};
                                    const fechaReunion = reunion.fecha || reunion.fechaHora;
                                    const calificacionMap = {
                                        frio: { label: '❄️ Frío', color: 'info' },
                                        tibio: { label: '🌤️ Tibio', color: 'warning' },
                                        caliente: { label: '🔥 Caliente', color: 'error' },
                                        listo_para_cerrar: { label: '🎯 Listo para cerrar', color: 'success' }
                                    };
                                    const calChip = reunion.calificacionRapida ? calificacionMap[reunion.calificacionRapida] : null;
                                    const borderColorMap = {
                                        realizada: '#4caf50',
                                        no_show: '#f44336',
                                        cancelada: '#9e9e9e',
                                        agendada: '#2196f3'
                                    };

                                    return (
                                        <Paper
                                            key={reunion._id}
                                            variant="outlined"
                                            sx={{
                                                p: 1.5,
                                                borderLeft: `4px solid ${borderColorMap[reunion.estado] || '#e0e0e0'}`,
                                                bgcolor: reunion.estado === 'realizada' ? 'rgba(76,175,80,0.04)'
                                                    : reunion.estado === 'no_show' ? 'rgba(244,67,54,0.04)'
                                                    : reunion.estado === 'cancelada' ? 'rgba(158,158,158,0.04)'
                                                    : 'transparent'
                                            }}
                                        >
                                            {/* Fila principal: fecha + estado + calificación */}
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Chip
                                                    icon={<EventIcon />}
                                                    label={fechaReunion ? new Date(fechaReunion).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                                {reunion.hora && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {reunion.hora}
                                                    </Typography>
                                                )}
                                                <Chip
                                                    label={`${estadoConf.icon || ''} ${estadoConf.label || reunion.estado}`}
                                                    size="small"
                                                    color={estadoConf.color || 'default'}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                                {calChip && (
                                                    <Chip
                                                        label={calChip.label}
                                                        size="small"
                                                        color={calChip.color}
                                                        variant="outlined"
                                                    />
                                                )}
                                                {reunion.numero && (
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        Meet #{reunion.numero}
                                                    </Typography>
                                                )}
                                            </Stack>

                                            {/* Comentario del SDR */}
                                            {reunion.comentario && (
                                                <Typography variant="body2" sx={{ mt: 1, pl: 1, borderLeft: '2px solid #e0e0e0', color: 'text.secondary', fontStyle: 'italic' }}>
                                                    💬 {reunion.comentario}
                                                </Typography>
                                            )}

                                            {/* Motivo de rechazo / cancelación */}
                                            {reunion.estado === 'cancelada' && reunion.motivoRechazo && (
                                                <Typography variant="body2" sx={{ mt: 1, pl: 1, borderLeft: '2px solid #f44336', color: 'error.main' }}>
                                                    🚫 {reunion.motivoRechazo}
                                                </Typography>
                                            )}

                                            {/* No show - mensaje destacado */}
                                            {reunion.estado === 'no_show' && (
                                                <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 500 }}>
                                                    ❌ El contacto no se presentó a la reunión
                                                    {reunion.notasEvaluador ? ` — ${reunion.notasEvaluador}` : ''}
                                                </Typography>
                                            )}

                                            {/* Resumen IA */}
                                            {reunion.resumenIA && (
                                                <Paper variant="outlined" sx={{ mt: 1, p: 1, bgcolor: 'grey.50', maxHeight: 120, overflow: 'auto' }}>
                                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                        🤖 Resumen IA
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.8rem' }}>
                                                        {reunion.resumenIA.substring(0, 500)}{reunion.resumenIA.length > 500 ? '...' : ''}
                                                    </Typography>
                                                </Paper>
                                            )}

                                            {/* Next steps */}
                                            {reunion.nextSteps && (
                                                <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                                    📋 <strong>Próximos pasos:</strong> {reunion.nextSteps}
                                                </Typography>
                                            )}

                                            {/* Módulos de interés */}
                                            {reunion.modulosInteres?.length > 0 && (
                                                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                                                        Módulos:
                                                    </Typography>
                                                    {reunion.modulosInteres.map(m => (
                                                        <Chip key={m} label={m} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                    ))}
                                                </Stack>
                                            )}

                                            {/* Duración */}
                                            {reunion.duracionMinutos && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                    ⏱️ Duración: {reunion.duracionMinutos} min
                                                </Typography>
                                            )}

                                            {/* Link de reunión (solo si agendada) */}
                                            {reunion.estado === 'agendada' && reunion.link && (
                                                <Chip
                                                    label="Abrir link"
                                                    size="small"
                                                    icon={<OpenInNewIcon />}
                                                    onClick={() => window.open(reunion.link, '_blank')}
                                                    clickable
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mt: 1 }}
                                                />
                                            )}
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    )}

                    {/* ==================== HISTORIAL + CADENCIA SIDE BY SIDE (desktop) ==================== */}
                    <Grid container spacing={2} sx={{ display: { xs: 'none', md: 'flex' } }}>
                        {/* COLUMNA IZQUIERDA: Comentario + Historial */}
                        <Grid item xs={12} md={6}>

                    {/* ==================== COMENTARIO RÁPIDO + AUDIO ==================== */}
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Agregar comentario / audio
                            </Typography>

                            {/* Indicador de grabación activa */}
                            {(grabador.estado === 'grabando' || grabador.estado === 'pausado') && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, p: 1, bgcolor: grabador.estado === 'grabando' ? '#ffebee' : '#fff8e1', borderRadius: 2, border: 1, borderColor: grabador.estado === 'grabando' ? 'error.light' : 'warning.light' }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: grabador.estado === 'grabando' ? 'error.main' : 'warning.main', animation: grabador.estado === 'grabando' ? 'pulse 1.5s infinite' : 'none', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                                    <Typography variant="body2" fontWeight={600} color={grabador.estado === 'grabando' ? 'error.main' : 'warning.main'}>
                                        {grabador.estado === 'grabando' ? 'Grabando...' : 'Pausado'}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                        {grabador.duracionFormateada}
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    {grabador.estado === 'grabando' ? (
                                        <IconButton size="small" onClick={grabador.pausar} sx={{ color: 'warning.main' }}>
                                            <PauseIcon fontSize="small" />
                                        </IconButton>
                                    ) : (
                                        <IconButton size="small" onClick={grabador.reanudar} sx={{ color: 'success.main' }}>
                                            <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton size="small" onClick={grabador.detener} sx={{ color: 'error.main' }}>
                                        <StopIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            )}

                            {/* Audio listo para enviar */}
                            {grabador.estado === 'detenido' && grabador.audioBlob && (
                                <Stack spacing={1} sx={{ mb: 1.5, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 2, border: 1, borderColor: 'success.light' }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <GraphicEqIcon sx={{ color: 'success.main' }} />
                                        <Typography variant="body2" fontWeight={600} color="success.dark">
                                            Audio listo ({grabador.duracionFormateada})
                                        </Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <IconButton size="small" onClick={grabador.limpiar} sx={{ color: 'text.secondary' }}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                    <audio
                                        controls
                                        src={URL.createObjectURL(grabador.audioBlob)}
                                        style={{ width: '100%', height: 36 }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Agregar nota al audio (opcional)..."
                                        value={nuevoComentario}
                                        onChange={(e) => setNuevoComentario(e.target.value)}
                                    />
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        startIcon={subiendoAudio ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                                        onClick={handleEnviarAudio}
                                        disabled={subiendoAudio}
                                        fullWidth
                                        sx={{ textTransform: 'none', borderRadius: 2 }}
                                    >
                                        {subiendoAudio ? 'Subiendo y transcribiendo...' : 'Enviar audio'}
                                    </Button>
                                </Stack>
                            )}

                            {/* Error de grabación */}
                            {grabador.error && (
                                <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                                    {grabador.error}
                                </Typography>
                            )}

                            {/* Input de texto + botones */}
                            {grabador.estado !== 'detenido' && (
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
                                        disabled={enviandoComentario || grabador.estado === 'grabando' || grabador.estado === 'pausado'}
                                        multiline
                                        maxRows={3}
                                    />
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Grabar audio">
                                            <IconButton
                                                color="error"
                                                onClick={grabador.iniciar}
                                                sx={{ bgcolor: '#ffebee', '&:hover': { bgcolor: '#ffcdd2' } }}
                                            >
                                                <MicIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Subir grabación de llamada">
                                            <IconButton
                                                color="primary"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={subiendoArchivo}
                                                sx={{ bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}
                                            >
                                                {subiendoArchivo ? <CircularProgress size={24} /> : <FileUploadIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleEnviarComentario}
                                        disabled={!nuevoComentario.trim() || enviandoComentario || grabador.estado !== 'inactivo'}
                                        sx={{ minWidth: 'auto', px: 2 }}
                                    >
                                        {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                    </Button>
                                </Stack>
                            )}
                        </Paper>

                    {/* ==================== HISTORIAL INLINE (desktop) ==================== */}
                    {historial.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Historial reciente ({historialFiltrado.length})
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
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                {FILTROS_HISTORIAL.map((filtro) => {
                                    const count = filtro.tipos
                                        ? historial.filter(e => filtro.tipos.includes(e.tipo)).length
                                        : historial.length;
                                    return (
                                        <Chip
                                            key={filtro.key}
                                            label={`${filtro.icon} ${filtro.label}${count > 0 ? ` (${count})` : ''}`}
                                            size="small"
                                            color={filtroHistorial === filtro.key ? 'primary' : 'default'}
                                            variant={filtroHistorial === filtro.key ? 'filled' : 'outlined'}
                                            onClick={() => setFiltroHistorial(filtro.key)}
                                            sx={{ fontSize: '0.68rem', flexShrink: 0 }}
                                        />
                                    );
                                })}
                            </Stack>
                            <Stack spacing={1}>
                                {historialFiltrado.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                                        No hay eventos de este tipo
                                    </Typography>
                                ) : (() => {
                                    const grupos = agruparEventosPorBloque(historialFiltrado.slice(0, 8));
                                    let eventosRendered = 0;
                                    return grupos.map((grupo, gi) => {
                                        if (eventosRendered >= 5) return null;
                                        return (
                                            <Box key={gi}>
                                                {/* Separador temporal del grupo */}
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, mt: gi > 0 ? 1 : 0 }}>
                                                    <Divider sx={{ flex: 1 }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap', px: 0.5 }}>
                                                        {formatearEtiquetaGrupo(grupo.fecha)}
                                                    </Typography>
                                                    <Divider sx={{ flex: 1 }} />
                                                </Stack>
                                                {/* Eventos del grupo */}
                                                <Stack spacing={0.5}>
                                                    {grupo.eventos.map((evento) => {
                                                        if (eventosRendered >= 5) return null;
                                                        eventosRendered++;
                                                        const colors = getEventoColor(evento.tipo);
                                                        const esGrupoMultiple = grupo.eventos.length > 1;
                                                        return (
                                                            <Paper key={evento._id} elevation={0}
                                                                sx={{ p: esGrupoMultiple ? 0.8 : 1, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}>
                                                                <Stack direction="row" spacing={0.8} alignItems="flex-start">
                                                                    <Avatar sx={{ width: esGrupoMultiple ? 20 : 24, height: esGrupoMultiple ? 20 : 24, bgcolor: colors.border, color: 'white', '& .MuiSvgIcon-root': { fontSize: esGrupoMultiple ? '0.75rem' : '0.85rem' } }}>
                                                                        {getEventoIcon(evento.tipo)}
                                                                    </Avatar>
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="body2" fontWeight={500} fontSize={esGrupoMultiple ? '0.75rem' : '0.8rem'}>
                                                                            {evento.descripcion}
                                                                        </Typography>
                                                                        {evento.nota && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', fontSize: '0.7rem' }}>
                                                                                &ldquo;{evento.nota.length > 100 ? evento.nota.substring(0, 100) + '...' : evento.nota}&rdquo;
                                                                            </Typography>
                                                                        )}
                                                                        {(evento.audioUrl || evento.metadata?.audioUrl) && (
                                                                            <Box sx={{ mt: 0.5 }}>
                                                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                                    <audio controls src={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} style={{ flex: 1, height: 32 }} />
                                                                                    <Tooltip title="Descargar audio">
                                                                                        <IconButton size="small" component="a" href={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} download={evento.audioNombre || evento.metadata?.audioNombre || 'audio.mp3'} sx={{ color: 'primary.main' }}>
                                                                                            <DownloadIcon sx={{ fontSize: 18 }} />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </Stack>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.resumen || evento.metadata?.resumen) && (
                                                                            <Box sx={{ position: 'relative', mt: 0.5 }}>
                                                                                <Typography variant="caption" component="div" sx={{ display: 'block', p: 1, pr: 4, bgcolor: '#e8f5e9', borderRadius: 1, fontSize: '0.76rem', lineHeight: 1.5, border: '1px solid #c8e6c9', whiteSpace: 'pre-wrap' }}>
                                                                                    {evento.resumen || evento.metadata?.resumen}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar resumen">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.resumen || evento.metadata?.resumen); mostrarSnackbar('Resumen copiado', 'success'); }} sx={{ position: 'absolute', top: 4, right: 4, p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3 }}>
                                                                                <Typography variant="caption" sx={{ flex: 1, p: 0.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, fontStyle: 'italic', fontSize: '0.72rem', cursor: 'pointer' }} onClick={(e) => { const el = e.currentTarget; el.dataset.expanded = el.dataset.expanded === 'true' ? 'false' : 'true'; el.innerText = el.dataset.expanded === 'true' ? '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion) : '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion).substring(0, 100) + '...'; }} title="Click para expandir">
                                                                                    📝 {(evento.transcripcion || evento.metadata?.transcripcion).substring(0, 100)}{(evento.transcripcion || evento.metadata?.transcripcion).length > 100 ? '...' : ''}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar transcripción">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.transcripcion || evento.metadata?.transcripcion); mostrarSnackbar('Transcripción copiada', 'success'); }} sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <Tooltip title="Re-analizar con IA">
                                                                                    <IconButton size="small" onClick={() => handleReanalizarAudio(evento._id)} disabled={reanalizandoEvento === evento._id} sx={{ p: 0.3 }}>
                                                                                        {reanalizandoEvento === evento._id ? <CircularProgress size={14} /> : <AutoFixHighIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Stack>
                                                                        )}
                                                                        {!esGrupoMultiple && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                                                                {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                                {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                </Stack>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Stack>
                                            </Box>
                                        );
                                    });
                                })()}
                                {historialFiltrado.length > 5 && (
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setTabDesktop(1)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'center' }}
                                    >
                                        Ver {historialFiltrado.length - 5} evento(s) más →
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    )}

                        </Grid>

                        {/* COLUMNA DERECHA: Wizard de acción (guiado por tarea) */}
                        <Grid item xs={12} md={6}>

                    {/* ==================== WIZARD GUIADO POR TAREA ==================== */}
                    {(() => {
                        const tipoTarea = contacto.proximaTarea?.tipo;
                        const tieneTarea = !!tipoTarea;
                        // Determinar canal del wizard según el tipo de tarea
                        let canalWizard = tipoTarea === 'llamada' ? 'llamada' : tipoTarea === 'whatsapp' ? 'whatsapp' : tipoTarea === 'email' ? 'email' : null;
                        // También detectar si hay WA pendiente de respuesta
                        const waPendiente = contacto.cadenciaActiva?.waPendienteRespuesta;
                        // Fallback: si no hay tarea pero hay cadencia activa, derivar del paso actual
                        const tareaDeCadencia = !tieneTarea && pasoActual?.acciones?.[subPasoIdx];
                        const tipoCadencia = tareaDeCadencia ? (tareaDeCadencia.tipo || tareaDeCadencia.canal) : null;
                        if (!canalWizard && tipoCadencia && ['llamada', 'whatsapp', 'email'].includes(tipoCadencia)) {
                            canalWizard = tipoCadencia;
                        }
                        const tieneAccionCadencia = !tieneTarea && !!canalWizard;

                        return (
                        <Paper variant="outlined" sx={{ p: 2, borderColor: tieneTarea ? 'primary.main' : tieneAccionCadencia ? 'info.main' : 'divider', borderWidth: (tieneTarea || tieneAccionCadencia) ? 2 : 1 }}>
                            {/* Header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    {(tieneTarea || tieneAccionCadencia) ? (
                                        <>
                                            <span style={{ fontSize: '1.1rem' }}>
                                                {(tipoTarea || canalWizard) === 'llamada' ? '📞' : (tipoTarea || canalWizard) === 'whatsapp' ? '💬' : (tipoTarea || canalWizard) === 'email' ? '✉️' : '📝'}
                                            </span>
                                            <Typography variant="subtitle2" color={tieneTarea ? 'primary' : 'info.main'} fontWeight={700}>
                                                {(tipoTarea || canalWizard) === 'llamada' ? 'Llamar' : (tipoTarea || canalWizard) === 'whatsapp' ? 'Enviar WhatsApp' : (tipoTarea || canalWizard) === 'email' ? 'Enviar Email' : 'Recordatorio'}
                                            </Typography>
                                            {tieneAccionCadencia && (
                                                <Chip size="small" label="cadencia" variant="outlined" color="info" sx={{ height: 20, fontSize: '0.65rem' }} />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <PlayArrowIcon fontSize="small" color="action" />
                                            <Typography variant="subtitle2" color="text.secondary">
                                                Acción rápida
                                            </Typography>
                                        </>
                                    )}
                                    {tieneTarea && wizardFase === 'accion' && proximoInfo && (
                                        <Chip
                                            size="small"
                                            label={proximoInfo.texto}
                                            color={proximoInfo.color}
                                            variant={proximoInfo.vencido ? 'filled' : 'outlined'}
                                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                        />
                                    )}
                                    {(registrandoWizard) && <CircularProgress size={16} />}
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    {contacto.proximaTarea?.nota && wizardFase === 'accion' && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', maxWidth: 180, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            💬 {contacto.proximaTarea.nota}
                                        </Typography>
                                    )}
                                    {tieneTarea && wizardFase === 'accion' && (
                                        <>
                                            <Tooltip title="Modificar tarea">
                                                <IconButton size="small" onClick={() => {
                                                    setEditTareaTipo(contacto.proximaTarea?.tipo || 'llamada');
                                                    setEditTareaFecha(contacto.proximaTarea?.fecha ? new Date(contacto.proximaTarea.fecha) : new Date());
                                                    setEditTareaNota(contacto.proximaTarea?.nota || '');
                                                    setEditandoTarea(true);
                                                }} sx={{ color: 'text.secondary', p: 0.5 }}>
                                                    <EditIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Eliminar tarea">
                                                <IconButton size="small" onClick={() => handleGuardarProximoContacto(null)} sx={{ color: 'error.light', p: 0.5 }}>
                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </Stack>
                            </Stack>

                            {/* === LLAMADA WIZARD === */}
                            {(canalWizard === 'llamada' || (!tieneTarea && wizardFase !== 'accion')) && canalWizard !== 'whatsapp' && canalWizard !== 'email' && (
                            <Box>
                                {wizardFase === 'accion' && canalWizard === 'llamada' && (
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
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoLlamada('atendio'); setWizardFase('seguimiento'); }}
                                                sx={{ flex: 1, py: 1 }}>
                                                Atendió
                                            </Button>
                                            <Button variant="contained" color="warning" startIcon={<PhoneMissedIcon />}
                                                onClick={() => { setResultadoLlamada('no_atendio'); setWizardFase('nota'); }}
                                                sx={{ flex: 1, py: 1 }}>
                                                No atendió
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'seguimiento' && (
                                    <Box>
                                        <Chip size="small" label="✅ Atendió" color="success" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>¿Qué acordaron?</Typography>
                                        <Stack spacing={1}>
                                            <Button variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                startIcon={<PhoneCallbackIcon />}
                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>
                                                Llamar más adelante
                                            </Button>
                                            <Button variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                startIcon={<ScheduleSendIcon />}
                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>
                                                Mandar mensaje más adelante
                                            </Button>
                                            <Button variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                startIcon={<EventIcon />}
                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>
                                                Coordinar reunión
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'nota' && (
                                    <Box>
                                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Chip size="small"
                                                label={resultadoLlamada === 'atendio' ? '✅ Atendió' : '❌ No atendió'}
                                                color={resultadoLlamada === 'atendio' ? 'success' : 'warning'} />
                                            {seguimientoWizard && (
                                                <Chip size="small"
                                                    label={seguimientoWizard === 'llamar_despues' ? '📞 Llamar después' : seguimientoWizard === 'mensaje_despues' ? '💬 Mensaje después' : '📅 Coordinar reunión'}
                                                    color="info" variant="outlined"
                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }} />
                                            )}
                                        </Stack>
                                        {renderProximoContactoPicker()}
                                        <Button variant="contained" color="primary"
                                            onClick={handleWizardRegistrarLlamada}
                                            disabled={registrandoWizard || !proximoContactoWizard}
                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <SkipNextIcon />}
                                            fullWidth sx={{ py: 1 }}>
                                            Registrar y continuar
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                            )}

                            {/* === WHATSAPP WIZARD === */}
                            {(canalWizard === 'whatsapp' || waPendiente) && (
                            <Box>
                                {wizardFase === 'accion' && !waPendiente && (
                                    <Box>
                                        <TextField fullWidth size="small" multiline minRows={3} maxRows={8}
                                            value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)}
                                            sx={{ mb: 1 }} placeholder="Mensaje para WhatsApp..." />
                                        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                            <Button variant="contained" startIcon={<WhatsAppIcon />}
                                                onClick={handleWizardEnviarWA}
                                                disabled={!mensajeWA.trim()} fullWidth
                                                sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, py: 1 }}>
                                                Enviar por WhatsApp
                                            </Button>
                                            <Tooltip title="Elegir template">
                                                <Button variant="outlined" size="small"
                                                    onClick={() => setModalTemplateWA(true)}
                                                    sx={{ minWidth: 40, px: 1 }}>
                                                    📋
                                                </Button>
                                            </Tooltip>
                                            {tienePermisoEnviarBot && (
                                                <Tooltip title="Enviar template via Bot">
                                                    <Button variant="outlined" size="small" color="success"
                                                        onClick={() => setModalMetaTemplate(true)}
                                                        sx={{ minWidth: 40, px: 1 }}>
                                                        <SmartToyIcon fontSize="small" />
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'accion' && waPendiente && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA enviado previamente" color="info" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                            ¿Te respondió el contacto al WhatsApp que enviaste?
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }}
                                                sx={{ flex: 1, py: 1 }}>Sí, respondió</Button>
                                            <Button variant="contained" color="warning" startIcon={<AccessTimeIcon />}
                                                onClick={() => { setResultadoWA('no_respondio'); setWizardFase('nota'); }}
                                                sx={{ flex: 1, py: 1 }}>No respondió</Button>
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'resultado' && (
                                    <Box>
                                        <Chip size="small" icon={<CheckCircleIcon />} label="Mensaje enviado" color="success" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>¿Te respondió?</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }}
                                                sx={{ flex: 1, py: 1 }}>Ya respondió</Button>
                                            <Button variant="contained" color="info" startIcon={<AccessTimeIcon />}
                                                onClick={() => setWizardFase('esperar_respuesta')}
                                                sx={{ flex: 1, py: 1 }}>Esperar respuesta</Button>
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'esperar_respuesta' && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="Esperando respuesta" color="info" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>Agendá cuándo revisar si respondió</Typography>
                                        {renderProximoContactoPicker()}
                                        <Button variant="contained" color="primary"
                                            onClick={handleWizardEsperarRespuesta}
                                            disabled={registrandoWizard || !proximoContactoWizard}
                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                            fullWidth sx={{ py: 1 }}>
                                            Confirmar y esperar
                                        </Button>
                                    </Box>
                                )}

                                {wizardFase === 'seguimiento' && (
                                    <Box>
                                        <Chip size="small" label="✅ Respondió" color="success" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>¿Qué acordaron?</Typography>
                                        <Stack spacing={1}>
                                            <Button variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'}
                                                startIcon={<PhoneCallbackIcon />}
                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>Llamar más adelante</Button>
                                            <Button variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'}
                                                startIcon={<ScheduleSendIcon />}
                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>Mandar mensaje más adelante</Button>
                                            <Button variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'}
                                                startIcon={<EventIcon />}
                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }}
                                                fullWidth sx={{ justifyContent: 'flex-start', py: 0.8 }}>Coordinar reunión</Button>
                                        </Stack>
                                    </Box>
                                )}

                                {wizardFase === 'nota' && (
                                    <Box>
                                        <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Chip size="small"
                                                label={resultadoWA === 'respondio' ? '✅ Respondió' : '⏳ No respondió'}
                                                color={resultadoWA === 'respondio' ? 'success' : 'warning'} />
                                            {seguimientoWizard && (
                                                <Chip size="small"
                                                    label={seguimientoWizard === 'llamar_despues' ? '📞 Llamar después' : seguimientoWizard === 'mensaje_despues' ? '💬 Mensaje después' : '📅 Coordinar reunión'}
                                                    color="info" variant="outlined"
                                                    onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }} />
                                            )}
                                        </Stack>
                                        {renderProximoContactoPicker()}
                                        <Button variant="contained" color="primary"
                                            onClick={handleWizardConfirmarWA}
                                            disabled={registrandoWizard || !proximoContactoWizard}
                                            endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <SkipNextIcon />}
                                            fullWidth sx={{ py: 1 }}>
                                            Registrar y continuar
                                        </Button>
                                    </Box>
                                )}

                                {wizardFase === 'pendiente_confirmacion' && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA pendiente" color="info" sx={{ mb: 1.5 }} />
                                        <Typography variant="body2" color="text.secondary" mb={1}>¿Respondió al WA?</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }}
                                                sx={{ flex: 1, py: 1 }}>Sí, respondió</Button>
                                            <Button variant="contained" color="warning" startIcon={<AccessTimeIcon />}
                                                onClick={() => { setResultadoWA('no_respondio'); setWizardFase('nota'); }}
                                                sx={{ flex: 1, py: 1 }}>No respondió</Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                            )}

                            {/* === EMAIL WIZARD === */}
                            {canalWizard === 'email' && (
                            <Box>
                                <TextField fullWidth size="small" multiline minRows={3}
                                    value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)}
                                    sx={{ mb: 1.5 }} placeholder="Contenido del email..." />
                                {renderProximoContactoPicker()}
                                <Button variant="contained" startIcon={<EmailIcon />}
                                    onClick={async () => {
                                        if (contacto.email) window.open(`mailto:${contacto.email}?body=${encodeURIComponent(mensajeWA)}`);
                                        setRegistrandoWizard(true);
                                        try {
                                            const proximaTarea = buildProximaTarea();
                                            await SDRService.registrarIntento(contacto._id, { tipo: 'email_enviado', canal: 'email', nota: mensajeWA.trim() || undefined, empresaId, proximoContacto: proximoContactoWizard || undefined, proximaTarea });
                                            if (proximoContactoWizard) {
                                                setContacto(prev => ({ ...prev, proximoContacto: proximoContactoWizard, proximaTarea: proximaTarea || prev.proximaTarea }));
                                            }
                                            mostrarSnackbar('Email registrado ✓');
                                            cargarContacto();
                                        } catch (err) {
                                            mostrarSnackbar('Error al registrar', 'error');
                                        } finally {
                                            setRegistrandoWizard(false);
                                        }
                                    }}
                                    disabled={registrandoWizard || !proximoContactoWizard} fullWidth sx={{ py: 1 }}>
                                    Enviar Email
                                </Button>
                            </Box>
                            )}

                            {/* === RECORDATORIO: completar === */}
                            {tipoTarea === 'recordatorio' && wizardFase === 'accion' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" mb={1.5}>
                                    {contacto.proximaTarea?.nota || 'Tienes un recordatorio pendiente'}
                                </Typography>
                                {renderProximoContactoPicker()}
                                <Button variant="contained" color="primary"
                                    onClick={async () => {
                                        setRegistrandoWizard(true);
                                        try {
                                            const proximaTarea = buildProximaTarea();
                                            await SDRService.registrarIntento(contacto._id, { tipo: 'recordatorio_completado', canal: 'otro', nota: notaWizard?.trim() || 'Recordatorio completado', empresaId, proximoContacto: proximoContactoWizard || undefined, proximaTarea });
                                            mostrarSnackbar('Recordatorio completado ✓');
                                            cargarContacto();
                                        } catch (err) {
                                            mostrarSnackbar('Error al registrar', 'error');
                                        } finally {
                                            setRegistrandoWizard(false);
                                        }
                                    }}
                                    disabled={registrandoWizard || !proximoContactoWizard}
                                    endIcon={registrandoWizard ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                    fullWidth sx={{ py: 1 }}>
                                    Completar y programar siguiente
                                </Button>
                            </Box>
                            )}

                            {/* === SIN TAREA: botones de acción directa === */}
                            {!tieneTarea && !tieneAccionCadencia && wizardFase === 'accion' && (
                            <Box>
                                <Typography variant="body2" color="text.secondary" mb={1.5}>
                                    No hay tarea programada. Elegí una acción:
                                </Typography>
                                <Stack spacing={1}>
                                    <Button variant="outlined" startIcon={<PhoneIcon />} fullWidth
                                        onClick={() => { handleLlamar(); setWizardFase('resultado'); }}
                                        sx={{ justifyContent: 'flex-start', py: 0.8, color: '#4caf50', borderColor: '#4caf50' }}>
                                        Llamar
                                    </Button>
                                    <Button variant="outlined" startIcon={<WhatsAppIcon />} fullWidth
                                        onClick={() => setWizardFase('accion_wa')}
                                        sx={{ justifyContent: 'flex-start', py: 0.8, color: '#25D366', borderColor: '#25D366' }}>
                                        Enviar WhatsApp
                                    </Button>
                                    <Button variant="outlined" startIcon={<EmailIcon />} fullWidth
                                        onClick={() => setWizardFase('accion_email')}
                                        sx={{ justifyContent: 'flex-start', py: 0.8 }}>
                                        Enviar Email
                                    </Button>
                                </Stack>
                            </Box>
                            )}

                            {/* WA desde acción directa (sin tarea) */}
                            {!tieneTarea && wizardFase === 'accion_wa' && (
                            <Box>
                                <TextField fullWidth size="small" multiline minRows={3} maxRows={8}
                                    value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)}
                                    sx={{ mb: 1 }} placeholder="Mensaje para WhatsApp..." />
                                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                                    <Button variant="contained" startIcon={<WhatsAppIcon />}
                                        onClick={handleWizardEnviarWA}
                                        disabled={!mensajeWA.trim()} fullWidth
                                        sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' }, py: 1 }}>
                                        Enviar por WhatsApp
                                    </Button>
                                    <Tooltip title="Elegir template">
                                        <Button variant="outlined" size="small"
                                            onClick={() => setModalTemplateWA(true)}
                                            sx={{ minWidth: 40, px: 1 }}>
                                            📋
                                        </Button>
                                    </Tooltip>
                                    {tienePermisoEnviarBot && (
                                        <Tooltip title="Enviar template via Bot">
                                            <Button variant="outlined" size="small" color="success"
                                                onClick={() => setModalMetaTemplate(true)}
                                                sx={{ minWidth: 40, px: 1 }}>
                                                <SmartToyIcon fontSize="small" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </Box>
                            )}

                            {/* Email desde acción directa (sin tarea) */}
                            {!tieneTarea && wizardFase === 'accion_email' && (
                            <Box>
                                <TextField fullWidth size="small" multiline minRows={3}
                                    value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)}
                                    sx={{ mb: 1.5 }} placeholder="Contenido del email..." />
                                {renderProximoContactoPicker()}
                                <Button variant="contained" startIcon={<EmailIcon />}
                                    onClick={async () => {
                                        if (contacto.email) window.open(`mailto:${contacto.email}?body=${encodeURIComponent(mensajeWA)}`);
                                        setRegistrandoWizard(true);
                                        try {
                                            const proximaTarea = buildProximaTarea();
                                            await SDRService.registrarIntento(contacto._id, { tipo: 'email_enviado', canal: 'email', nota: mensajeWA.trim() || undefined, empresaId, proximoContacto: proximoContactoWizard || undefined, proximaTarea });
                                            mostrarSnackbar('Email registrado ✓');
                                            cargarContacto();
                                        } catch (err) {
                                            mostrarSnackbar('Error al registrar', 'error');
                                        } finally { setRegistrandoWizard(false); }
                                    }}
                                    disabled={registrandoWizard || !proximoContactoWizard} fullWidth sx={{ py: 1 }}>
                                    Enviar Email
                                </Button>
                            </Box>
                            )}

                            {/* Escape: acción manual */}
                            <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                                <Button size="small" variant="text" color="inherit"
                                    onClick={() => setModalRegistrarAccion(true)}
                                    sx={{ fontSize: '0.75rem', textTransform: 'none', color: 'text.secondary' }}>
                                    Hacer otra acción →
                                </Button>
                                {wizardFase !== 'accion' && (
                                    <Button size="small" variant="text" color="inherit"
                                        onClick={() => { setWizardFase('accion'); setResultadoLlamada(null); setResultadoWA(null); setSeguimientoWizard(null); setNotaWizard(''); setProximoContactoWizard(null); setTipoTareaWizard(null); setNotaTareaWizard(''); setMensajeWA(''); }}
                                        sx={{ fontSize: '0.75rem', textTransform: 'none', color: 'text.secondary', ml: 1 }}>
                                        ← Volver al inicio
                                    </Button>
                                )}
                            </Box>

                            {/* Botón siguiente contacto */}
                            <Button variant="contained" fullWidth
                                onClick={handleSiguienteContacto}
                                endIcon={<ChevronRightIcon />}
                                sx={{ mt: 2, py: 1.2, fontWeight: 600, fontSize: '0.95rem', borderRadius: 2 }}>
                                {puedeSiguiente ? `Siguiente contacto (${indiceActual + 2}/${contactoIds.length})` : 'Volver al listado'}
                            </Button>
                        </Paper>
                        );
                    })()}

                        </Grid>
                    </Grid>
                    {/* ==================== FIN GRID DESKTOP HISTORIAL + CADENCIA ==================== */}

                    {/* ==================== MOBILE: COMENTARIO + AUDIO + HISTORIAL ==================== */}
                    {isMobile && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Agregar comentario / audio
                            </Typography>

                            {/* Indicador de grabación activa */}
                            {(grabador.estado === 'grabando' || grabador.estado === 'pausado') && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, p: 1, bgcolor: grabador.estado === 'grabando' ? '#ffebee' : '#fff8e1', borderRadius: 2, border: 1, borderColor: grabador.estado === 'grabando' ? 'error.light' : 'warning.light' }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: grabador.estado === 'grabando' ? 'error.main' : 'warning.main', animation: grabador.estado === 'grabando' ? 'pulse 1.5s infinite' : 'none', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                                    <Typography variant="body2" fontWeight={600} color={grabador.estado === 'grabando' ? 'error.main' : 'warning.main'}>
                                        {grabador.estado === 'grabando' ? 'Grabando...' : 'Pausado'}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                        {grabador.duracionFormateada}
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    {grabador.estado === 'grabando' ? (
                                        <IconButton size="small" onClick={grabador.pausar} sx={{ color: 'warning.main' }}>
                                            <PauseIcon fontSize="small" />
                                        </IconButton>
                                    ) : (
                                        <IconButton size="small" onClick={grabador.reanudar} sx={{ color: 'success.main' }}>
                                            <PlayArrowIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton size="small" onClick={grabador.detener} sx={{ color: 'error.main' }}>
                                        <StopIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            )}

                            {/* Audio listo para enviar */}
                            {grabador.estado === 'detenido' && grabador.audioBlob && (
                                <Stack spacing={1} sx={{ mb: 1.5, p: 1.5, bgcolor: '#e8f5e9', borderRadius: 2, border: 1, borderColor: 'success.light' }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <GraphicEqIcon sx={{ color: 'success.main' }} />
                                        <Typography variant="body2" fontWeight={600} color="success.dark">
                                            Audio listo ({grabador.duracionFormateada})
                                        </Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <IconButton size="small" onClick={grabador.limpiar} sx={{ color: 'text.secondary' }}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                    <audio
                                        controls
                                        src={URL.createObjectURL(grabador.audioBlob)}
                                        style={{ width: '100%', height: 36 }}
                                    />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Agregar nota al audio (opcional)..."
                                        value={nuevoComentario}
                                        onChange={(e) => setNuevoComentario(e.target.value)}
                                    />
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        startIcon={subiendoAudio ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                                        onClick={handleEnviarAudio}
                                        disabled={subiendoAudio}
                                        fullWidth
                                        sx={{ textTransform: 'none', borderRadius: 2 }}
                                    >
                                        {subiendoAudio ? 'Subiendo y transcribiendo...' : 'Enviar audio'}
                                    </Button>
                                </Stack>
                            )}

                            {/* Error de grabación */}
                            {grabador.error && (
                                <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                                    {grabador.error}
                                </Typography>
                            )}

                            {/* Input de texto + botones */}
                            {grabador.estado !== 'detenido' && (
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
                                        disabled={enviandoComentario || grabador.estado === 'grabando' || grabador.estado === 'pausado'}
                                        multiline
                                        maxRows={3}
                                    />
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Grabar audio">
                                            <IconButton
                                                color="error"
                                                onClick={grabador.iniciar}
                                                sx={{ bgcolor: '#ffebee', '&:hover': { bgcolor: '#ffcdd2' } }}
                                            >
                                                <MicIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Subir grabación de llamada">
                                            <IconButton
                                                color="primary"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={subiendoArchivo}
                                                sx={{ bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}
                                            >
                                                {subiendoArchivo ? <CircularProgress size={24} /> : <FileUploadIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleEnviarComentario}
                                        disabled={!nuevoComentario.trim() || enviandoComentario || grabador.estado !== 'inactivo'}
                                        sx={{ minWidth: 'auto', px: 2 }}
                                    >
                                        {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                    </Button>
                                </Stack>
                            )}
                        </Paper>
                    )}

                    {isMobile && historial.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <HistoryIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Historial reciente ({historialFiltrado.length})
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
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
                                {FILTROS_HISTORIAL.map((filtro) => {
                                    const count = filtro.tipos
                                        ? historial.filter(e => filtro.tipos.includes(e.tipo)).length
                                        : historial.length;
                                    return (
                                        <Chip
                                            key={filtro.key}
                                            label={`${filtro.icon} ${filtro.label}${count > 0 ? ` (${count})` : ''}`}
                                            size="small"
                                            color={filtroHistorial === filtro.key ? 'primary' : 'default'}
                                            variant={filtroHistorial === filtro.key ? 'filled' : 'outlined'}
                                            onClick={() => setFiltroHistorial(filtro.key)}
                                            sx={{ fontSize: '0.68rem', flexShrink: 0 }}
                                        />
                                    );
                                })}
                            </Stack>
                            <Stack spacing={0.5}>
                                {historialFiltrado.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                                        No hay eventos de este tipo
                                    </Typography>
                                ) : (() => {
                                    const grupos = agruparEventosPorBloque(historialFiltrado.slice(0, 6));
                                    let eventosRendered = 0;
                                    return grupos.map((grupo, gi) => {
                                        if (eventosRendered >= 3) return null;
                                        return (
                                            <Box key={gi}>
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, mt: gi > 0 ? 0.5 : 0 }}>
                                                    <Divider sx={{ flex: 1 }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600, whiteSpace: 'nowrap', px: 0.5 }}>
                                                        {formatearEtiquetaGrupo(grupo.fecha)}
                                                    </Typography>
                                                    <Divider sx={{ flex: 1 }} />
                                                </Stack>
                                                <Stack spacing={0.5}>
                                                    {grupo.eventos.map((evento) => {
                                                        if (eventosRendered >= 3) return null;
                                                        eventosRendered++;
                                                        const colors = getEventoColor(evento.tipo);
                                                        const esGrupoMultiple = grupo.eventos.length > 1;
                                                        return (
                                                            <Paper key={evento._id} elevation={0}
                                                                sx={{ p: esGrupoMultiple ? 0.7 : 1, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}>
                                                                <Stack direction="row" spacing={0.8} alignItems="flex-start">
                                                                    <Avatar sx={{ width: esGrupoMultiple ? 18 : 24, height: esGrupoMultiple ? 18 : 24, bgcolor: colors.border, color: 'white', '& .MuiSvgIcon-root': { fontSize: esGrupoMultiple ? '0.7rem' : '0.85rem' } }}>
                                                                        {getEventoIcon(evento.tipo)}
                                                                    </Avatar>
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="body2" fontWeight={500} fontSize={esGrupoMultiple ? '0.72rem' : '0.8rem'}>
                                                                            {evento.descripcion}
                                                                        </Typography>
                                                                        {evento.nota && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', fontSize: '0.68rem' }}>
                                                                                &ldquo;{evento.nota.length > 80 ? evento.nota.substring(0, 80) + '...' : evento.nota}&rdquo;
                                                                            </Typography>
                                                                        )}
                                                                        {(evento.audioUrl || evento.metadata?.audioUrl) && (
                                                                            <Box sx={{ mt: 0.5 }}>
                                                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                                    <audio controls src={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} style={{ flex: 1, height: 32 }} />
                                                                                    <Tooltip title="Descargar audio">
                                                                                        <IconButton size="small" component="a" href={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} download={evento.audioNombre || evento.metadata?.audioNombre || 'audio.mp3'} sx={{ color: 'primary.main' }}>
                                                                                            <DownloadIcon sx={{ fontSize: 18 }} />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </Stack>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.resumen || evento.metadata?.resumen) && (
                                                                            <Box sx={{ position: 'relative', mt: 0.5 }}>
                                                                                <Typography variant="caption" component="div" sx={{ display: 'block', p: 1, pr: 4, bgcolor: '#e8f5e9', borderRadius: 1, fontSize: '0.74rem', lineHeight: 1.5, border: '1px solid #c8e6c9', whiteSpace: 'pre-wrap' }}>
                                                                                    {evento.resumen || evento.metadata?.resumen}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar resumen">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.resumen || evento.metadata?.resumen); mostrarSnackbar('Resumen copiado', 'success'); }} sx={{ position: 'absolute', top: 4, right: 4, p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3 }}>
                                                                                <Typography variant="caption" sx={{ flex: 1, p: 0.5, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, fontStyle: 'italic', fontSize: '0.70rem', cursor: 'pointer' }} onClick={(e) => { const el = e.currentTarget; el.dataset.expanded = el.dataset.expanded === 'true' ? 'false' : 'true'; el.innerText = el.dataset.expanded === 'true' ? '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion) : '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion).substring(0, 80) + '...'; }} title="Click para expandir">
                                                                                    📝 {(evento.transcripcion || evento.metadata?.transcripcion).substring(0, 80)}{(evento.transcripcion || evento.metadata?.transcripcion).length > 80 ? '...' : ''}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar transcripción">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.transcripcion || evento.metadata?.transcripcion); mostrarSnackbar('Transcripción copiada', 'success'); }} sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <Tooltip title="Re-analizar con IA">
                                                                                    <IconButton size="small" onClick={() => handleReanalizarAudio(evento._id)} disabled={reanalizandoEvento === evento._id} sx={{ p: 0.3 }}>
                                                                                        {reanalizandoEvento === evento._id ? <CircularProgress size={14} /> : <AutoFixHighIcon sx={{ fontSize: 16, color: 'secondary.main' }} />}
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Stack>
                                                                        )}
                                                                        {!esGrupoMultiple && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                                                                {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                                {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                                            </Typography>
                                                                        )}
                                                                    </Box>
                                                                </Stack>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Stack>
                                            </Box>
                                        );
                                    });
                                })()}
                                {historialFiltrado.length > 3 && (
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => setTabMobile(1)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem', alignSelf: 'center' }}
                                    >
                                        Ver {historialFiltrado.length - 3} evento(s) más →
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
                            {/* Comentario + Audio */}
                            {/* Indicador de grabación en tab historial */}
                            {(grabador.estado === 'grabando' || grabador.estado === 'pausado') && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, p: 1, bgcolor: grabador.estado === 'grabando' ? '#ffebee' : '#fff8e1', borderRadius: 2, border: 1, borderColor: grabador.estado === 'grabando' ? 'error.light' : 'warning.light' }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: grabador.estado === 'grabando' ? 'error.main' : 'warning.main', animation: grabador.estado === 'grabando' ? 'pulse 1.5s infinite' : 'none', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                                    <Typography variant="caption" fontWeight={600} color={grabador.estado === 'grabando' ? 'error.main' : 'warning.main'}>
                                        {grabador.estado === 'grabando' ? 'Grabando' : 'Pausado'} {grabador.duracionFormateada}
                                    </Typography>
                                    <Box sx={{ flex: 1 }} />
                                    {grabador.estado === 'grabando' ? (
                                        <IconButton size="small" onClick={grabador.pausar}><PauseIcon sx={{ fontSize: 18 }} /></IconButton>
                                    ) : (
                                        <IconButton size="small" onClick={grabador.reanudar}><PlayArrowIcon sx={{ fontSize: 18 }} /></IconButton>
                                    )}
                                    <IconButton size="small" onClick={grabador.detener} sx={{ color: 'error.main' }}><StopIcon sx={{ fontSize: 18 }} /></IconButton>
                                </Stack>
                            )}
                            {/* Audio listo en tab historial */}
                            {grabador.estado === 'detenido' && grabador.audioBlob && (
                                <Stack spacing={1} sx={{ mb: 1.5, p: 1, bgcolor: '#e8f5e9', borderRadius: 2, border: 1, borderColor: 'success.light' }}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <GraphicEqIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                        <Typography variant="caption" fontWeight={600} color="success.dark">Audio listo ({grabador.duracionFormateada})</Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <IconButton size="small" onClick={grabador.limpiar}><DeleteOutlineIcon sx={{ fontSize: 16 }} /></IconButton>
                                    </Stack>
                                    <audio controls src={URL.createObjectURL(grabador.audioBlob)} style={{ width: '100%', height: 32 }} />
                                    <Stack direction="row" spacing={1}>
                                        <TextField fullWidth size="small" placeholder="Nota (opcional)..." value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} />
                                        <Button variant="contained" color="success" size="small" onClick={handleEnviarAudio} disabled={subiendoAudio} sx={{ minWidth: 'auto', px: 2 }}>
                                            {subiendoAudio ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                            {grabador.estado !== 'detenido' && (
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
                                        disabled={enviandoComentario || grabador.estado !== 'inactivo'}
                                    />
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Grabar audio">
                                            <IconButton color="error" onClick={grabador.iniciar} sx={{ bgcolor: '#ffebee', '&:hover': { bgcolor: '#ffcdd2' } }}>
                                                <MicIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Subir grabación">
                                            <IconButton color="primary" onClick={() => fileInputRef.current?.click()} disabled={subiendoArchivo} sx={{ bgcolor: '#e3f2fd', '&:hover': { bgcolor: '#bbdefb' } }}>
                                                {subiendoArchivo ? <CircularProgress size={24} /> : <FileUploadIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleEnviarComentario}
                                        disabled={!nuevoComentario.trim() || enviandoComentario || grabador.estado !== 'inactivo'}
                                    >
                                        {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                    </Button>
                                </Stack>
                            )}

                            <Divider sx={{ mb: 1 }} />

                            {/* Filtro por categoría */}
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, overflowX: 'auto', flexShrink: 0, pb: 0.5 }}>
                                {FILTROS_HISTORIAL.map((filtro) => {
                                    const count = filtro.tipos 
                                        ? historial.filter(e => filtro.tipos.includes(e.tipo)).length
                                        : historial.length;
                                    return (
                                        <Chip
                                            key={filtro.key}
                                            label={`${filtro.icon} ${filtro.label}${count > 0 ? ` (${count})` : ''}`}
                                            size="small"
                                            color={filtroHistorial === filtro.key ? 'primary' : 'default'}
                                            variant={filtroHistorial === filtro.key ? 'filled' : 'outlined'}
                                            onClick={() => setFiltroHistorial(filtro.key)}
                                            sx={{ fontSize: '0.72rem', flexShrink: 0 }}
                                        />
                                    );
                                })}
                            </Stack>

                            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                                {historial.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        Sin historial aún
                                    </Typography>
                                ) : historialFiltrado.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        No hay eventos de tipo &ldquo;{FILTROS_HISTORIAL.find(f => f.key === filtroHistorial)?.label}&rdquo;
                                    </Typography>
                                ) : (
                                    <Stack spacing={0.5}>
                                        {agruparEventosPorBloque(historialFiltrado).map((grupo, gi) => (
                                            <Box key={gi}>
                                                {/* Separador temporal */}
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, mt: gi > 0 ? 1.5 : 0 }}>
                                                    <Divider sx={{ flex: 1 }} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', px: 0.5 }}>
                                                        {formatearEtiquetaGrupo(grupo.fecha)}
                                                        {grupo.eventos.length > 1 && ` (${grupo.eventos.length})`}
                                                    </Typography>
                                                    <Divider sx={{ flex: 1 }} />
                                                </Stack>
                                                {/* Eventos agrupados */}
                                                <Stack spacing={0.5}>
                                                    {grupo.eventos.map((evento) => {
                                                        const colors = getEventoColor(evento.tipo);
                                                        const esGrupoMultiple = grupo.eventos.length > 1;
                                                        return (
                                                            <Paper key={evento._id} elevation={0}
                                                                sx={{ p: esGrupoMultiple ? 1 : 1.5, bgcolor: colors.bg, borderLeft: 3, borderColor: colors.border }}>
                                                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                                                    <Avatar sx={{ width: esGrupoMultiple ? 22 : 28, height: esGrupoMultiple ? 22 : 28, bgcolor: colors.border, color: 'white', '& .MuiSvgIcon-root': { fontSize: esGrupoMultiple ? '0.8rem' : 'inherit' } }}>
                                                                        {getEventoIcon(evento.tipo)}
                                                                    </Avatar>
                                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                        <Typography variant="body2" fontWeight={500} fontSize={esGrupoMultiple ? '0.82rem' : undefined}>
                                                                            {evento.descripcion}
                                                                        </Typography>
                                                                        {evento.nota && (
                                                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontStyle: 'italic', fontSize: esGrupoMultiple ? '0.78rem' : undefined }}>
                                                                                &ldquo;{evento.nota.length > 200 ? evento.nota.substring(0, 200) + '...' : evento.nota}&rdquo;
                                                                            </Typography>
                                                                        )}
                                                                        {(evento.audioUrl || evento.metadata?.audioUrl) && (
                                                                            <Box sx={{ mt: 0.5 }}>
                                                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                                                    <audio controls src={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} style={{ flex: 1, height: 36 }} />
                                                                                    <Tooltip title="Descargar audio">
                                                                                        <IconButton size="small" component="a" href={resolveAudioUrl(evento.audioUrl || evento.metadata?.audioUrl)} download={evento.audioNombre || evento.metadata?.audioNombre || 'audio.mp3'} sx={{ color: 'primary.main' }}>
                                                                                            <DownloadIcon sx={{ fontSize: 20 }} />
                                                                                        </IconButton>
                                                                                    </Tooltip>
                                                                                </Stack>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.resumen || evento.metadata?.resumen) && (
                                                                            <Box sx={{ position: 'relative', mt: 0.5 }}>
                                                                                <Typography variant="caption" component="div" sx={{ display: 'block', p: 1.5, pr: 4.5, bgcolor: '#e8f5e9', borderRadius: 1, fontSize: '0.82rem', lineHeight: 1.6, border: '1px solid #c8e6c9', whiteSpace: 'pre-wrap' }}>
                                                                                    {evento.resumen || evento.metadata?.resumen}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar resumen">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.resumen || evento.metadata?.resumen); mostrarSnackbar('Resumen copiado', 'success'); }} sx={{ position: 'absolute', top: 6, right: 6, p: 0.4, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Box>
                                                                        )}
                                                                        {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                                                                                <Typography variant="caption" sx={{ flex: 1, p: 0.8, bgcolor: 'rgba(255,255,255,0.7)', borderRadius: 1, fontStyle: 'italic', lineHeight: 1.4, cursor: 'pointer' }} onClick={(e) => { const el = e.currentTarget; el.dataset.expanded = el.dataset.expanded === 'true' ? 'false' : 'true'; el.innerText = el.dataset.expanded === 'true' ? '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion) : '📝 ' + (evento.transcripcion || evento.metadata?.transcripcion).substring(0, 150) + '... (click para ver)'; }} title="Click para expandir">
                                                                                    📝 {(evento.transcripcion || evento.metadata?.transcripcion).substring(0, 150)}{(evento.transcripcion || evento.metadata?.transcripcion).length > 150 ? '... (click para ver)' : ''}
                                                                                </Typography>
                                                                                <Tooltip title="Copiar transcripción">
                                                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(evento.transcripcion || evento.metadata?.transcripcion); mostrarSnackbar('Transcripción copiada', 'success'); }} sx={{ p: 0.4, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <Tooltip title="Re-analizar con IA">
                                                                                    <IconButton size="small" onClick={() => handleReanalizarAudio(evento._id)} disabled={reanalizandoEvento === evento._id} sx={{ p: 0.4 }}>
                                                                                        {reanalizandoEvento === evento._id ? <CircularProgress size={16} /> : <AutoFixHighIcon sx={{ fontSize: 18, color: 'secondary.main' }} />}
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Stack>
                                                                        )}
                                                                        {!esGrupoMultiple && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                                                {new Date(evento.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                {evento.sdrNombre && ` • ${evento.sdrNombre}`}
                                                                            </Typography>
                                                                        )}
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
                                            </Box>
                                        ))}
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
                        borderColor: contacto.proximaTarea?.tipo ? 'primary.main' : 'divider',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.12)',
                        px: 1.5,
                        py: 1,
                        pb: 'calc(8px + env(safe-area-inset-bottom))',
                    }}
                >
                    {(() => {
                        const tipoTarea = contacto.proximaTarea?.tipo;
                        const tieneTarea = !!tipoTarea;
                        let canalWizard = tipoTarea === 'llamada' ? 'llamada' : tipoTarea === 'whatsapp' ? 'whatsapp' : tipoTarea === 'email' ? 'email' : null;
                        const waPendiente = contacto.cadenciaActiva?.waPendienteRespuesta;
                        // Fallback: si no hay tarea pero hay cadencia activa, derivar del paso actual
                        const tareaDeCadencia = !tieneTarea && pasoActual?.acciones?.[subPasoIdx];
                        const tipoCadencia = tareaDeCadencia ? (tareaDeCadencia.tipo || tareaDeCadencia.canal) : null;
                        if (!canalWizard && tipoCadencia && ['llamada', 'whatsapp', 'email'].includes(tipoCadencia)) {
                            canalWizard = tipoCadencia;
                        }
                        const tieneAccionCadencia = !tieneTarea && !!canalWizard;

                        return (
                        <Box>
                            {/* Mini header */}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    {(tieneTarea || tieneAccionCadencia) ? (
                                        <>
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {(tipoTarea || canalWizard) === 'llamada' ? '📞' : (tipoTarea || canalWizard) === 'whatsapp' ? '💬' : (tipoTarea || canalWizard) === 'email' ? '✉️' : '📝'}
                                            </span>
                                            <Typography variant="caption" color={tieneTarea ? 'primary' : 'info.main'} fontWeight={600}>
                                                {(tipoTarea || canalWizard) === 'llamada' ? 'Llamar' : (tipoTarea || canalWizard) === 'whatsapp' ? 'WhatsApp' : (tipoTarea || canalWizard) === 'email' ? 'Email' : 'Recordatorio'}
                                            </Typography>
                                            {tieneAccionCadencia && (
                                                <Chip size="small" label="cadencia" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.6rem' }} />
                                            )}
                                            {tieneTarea && wizardFase === 'accion' && proximoInfo && (
                                                <Chip
                                                    size="small"
                                                    label={proximoInfo.texto}
                                                    color={proximoInfo.color}
                                                    variant={proximoInfo.vencido ? 'filled' : 'outlined'}
                                                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Acción</Typography>
                                    )}
                                    {registrandoWizard && <CircularProgress size={14} />}
                                </Stack>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    {tieneTarea && wizardFase === 'accion' && (
                                        <>
                                            <IconButton size="small" onClick={() => {
                                                setEditTareaTipo(contacto.proximaTarea?.tipo || 'llamada');
                                                setEditTareaFecha(contacto.proximaTarea?.fecha ? new Date(contacto.proximaTarea.fecha) : new Date());
                                                setEditTareaNota(contacto.proximaTarea?.nota || '');
                                                setEditandoTarea(true);
                                            }} sx={{ color: 'text.secondary', p: 0.3 }}>
                                                <EditIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleGuardarProximoContacto(null)} sx={{ color: 'error.light', p: 0.3 }}>
                                                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </>
                                    )}
                                    {wizardFase !== 'accion' && (
                                        <Button size="small" variant="text" color="inherit"
                                            onClick={() => { setWizardFase('accion'); setResultadoLlamada(null); setResultadoWA(null); setSeguimientoWizard(null); setNotaWizard(''); setProximoContactoWizard(null); setTipoTareaWizard(null); setNotaTareaWizard(''); setMensajeWA(''); }}
                                            sx={{ fontSize: '0.65rem', textTransform: 'none', color: 'text.secondary', py: 0, minWidth: 'auto' }}>
                                            ← Inicio
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>

                            {/* === LLAMADA MOBILE === */}
                            {(canalWizard === 'llamada' || (!tieneTarea && !waPendiente && wizardFase !== 'accion' && wizardFase !== 'accion_wa' && wizardFase !== 'accion_email')) && canalWizard !== 'whatsapp' && canalWizard !== 'email' && (
                            <Box>
                                {wizardFase === 'accion' && canalWizard === 'llamada' && (
                                    <Button variant="contained" startIcon={<PhoneIcon />}
                                        onClick={() => { handleLlamar(); setWizardFase('resultado'); }}
                                        fullWidth sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, py: 1 }}>
                                        Llamar a {contacto.nombre?.split(' ')[0] || 'contacto'}
                                    </Button>
                                )}
                                {wizardFase === 'resultado' && (
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="contained" color="success" startIcon={<CheckCircleIcon />}
                                            onClick={() => { setResultadoLlamada('atendio'); setWizardFase('seguimiento'); }} sx={{ flex: 1 }}>Atendió</Button>
                                        <Button variant="contained" color="warning" startIcon={<PhoneMissedIcon />}
                                            onClick={() => { setResultadoLlamada('no_atendio'); setWizardFase('nota'); }} sx={{ flex: 1 }}>No atendió</Button>
                                    </Stack>
                                )}
                                {wizardFase === 'seguimiento' && (
                                    <Box>
                                        <Chip size="small" label="✅ Atendió" color="success" sx={{ mb: 1 }} />
                                        <Stack direction="row" spacing={0.5}>
                                            <Button variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'} size="small" startIcon={<PhoneCallbackIcon />}
                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Llamar después</Button>
                                            <Button variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'} size="small" startIcon={<ScheduleSendIcon />}
                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Mensaje después</Button>
                                            <Button variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'} size="small" startIcon={<EventIcon />}
                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Reunión</Button>
                                        </Stack>
                                    </Box>
                                )}
                                {wizardFase === 'nota' && (
                                    <Box>
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Chip size="small" label={resultadoLlamada === 'atendio' ? '✅ Atendió' : '❌ No atendió'} color={resultadoLlamada === 'atendio' ? 'success' : 'warning'} />
                                            {seguimientoWizard && (
                                                <Chip size="small" label={seguimientoWizard === 'llamar_despues' ? '📞' : seguimientoWizard === 'mensaje_despues' ? '💬' : '📅'}
                                                    color="info" variant="outlined" onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }} sx={{ height: 22 }} />
                                            )}
                                        </Stack>
                                        {renderProximoContactoPicker(true)}
                                        <Button variant="contained" onClick={handleWizardRegistrarLlamada} disabled={registrandoWizard || !proximoContactoWizard} fullWidth size="small">
                                            {registrandoWizard ? <CircularProgress size={20} color="inherit" /> : 'Registrar ✓'}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                            )}

                            {/* === WHATSAPP MOBILE === */}
                            {(canalWizard === 'whatsapp' || waPendiente || wizardFase === 'accion_wa') && (
                            <Box>
                                {(wizardFase === 'accion' || wizardFase === 'accion_wa') && !waPendiente && (
                                    <Box>
                                        <TextField fullWidth size="small" multiline maxRows={3}
                                            value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)} sx={{ mb: 1 }} placeholder="Mensaje para WhatsApp..." />
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" startIcon={<WhatsAppIcon />}
                                                onClick={handleWizardEnviarWA} disabled={!mensajeWA.trim()} fullWidth
                                                sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}>Enviar por WhatsApp</Button>
                                            <Tooltip title="Elegir template">
                                                <Button variant="outlined" size="small"
                                                    onClick={() => setModalTemplateWA(true)}
                                                    sx={{ minWidth: 40, px: 1 }}>
                                                    📋
                                                </Button>
                                            </Tooltip>
                                            {tienePermisoEnviarBot && (
                                                <Tooltip title="Enviar template via Bot">
                                                    <Button variant="outlined" size="small" color="success"
                                                        onClick={() => setModalMetaTemplate(true)}
                                                        sx={{ minWidth: 40, px: 1 }}>
                                                        <SmartToyIcon fontSize="small" />
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </Box>
                                )}
                                {wizardFase === 'accion' && waPendiente && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA pendiente" color="info" sx={{ mb: 1 }} />
                                        <Typography variant="caption" color="text.secondary" mb={0.5} display="block">¿Respondió al WA?</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" size="small" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }} sx={{ flex: 1 }}>Sí</Button>
                                            <Button variant="contained" color="warning" size="small" startIcon={<AccessTimeIcon />}
                                                onClick={() => { setResultadoWA('no_respondio'); setWizardFase('nota'); }} sx={{ flex: 1 }}>No</Button>
                                        </Stack>
                                    </Box>
                                )}
                                {wizardFase === 'resultado' && (
                                    <Box>
                                        <Chip size="small" icon={<CheckCircleIcon />} label="Enviado" color="success" sx={{ mb: 1 }} />
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" size="small" startIcon={<CheckCircleIcon />}
                                                onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }} sx={{ flex: 1 }}>Ya respondió</Button>
                                            <Button variant="contained" color="info" size="small" startIcon={<AccessTimeIcon />}
                                                onClick={() => setWizardFase('esperar_respuesta')} sx={{ flex: 1 }}>Esperar</Button>
                                        </Stack>
                                    </Box>
                                )}
                                {wizardFase === 'esperar_respuesta' && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="Esperando" color="info" sx={{ mb: 1 }} />
                                        {renderProximoContactoPicker(true)}
                                        <Button variant="contained" onClick={handleWizardEsperarRespuesta} disabled={registrandoWizard || !proximoContactoWizard} fullWidth size="small">
                                            {registrandoWizard ? <CircularProgress size={16} color="inherit" /> : 'Confirmar y esperar'}
                                        </Button>
                                    </Box>
                                )}
                                {wizardFase === 'seguimiento' && (
                                    <Box>
                                        <Chip size="small" label="✅ Respondió" color="success" sx={{ mb: 1 }} />
                                        <Stack direction="row" spacing={0.5}>
                                            <Button variant={seguimientoWizard === 'llamar_despues' ? 'contained' : 'outlined'} size="small" startIcon={<PhoneCallbackIcon />}
                                                onClick={() => { setSeguimientoWizard('llamar_despues'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Llamar después</Button>
                                            <Button variant={seguimientoWizard === 'mensaje_despues' ? 'contained' : 'outlined'} size="small" startIcon={<ScheduleSendIcon />}
                                                onClick={() => { setSeguimientoWizard('mensaje_despues'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Mensaje después</Button>
                                            <Button variant={seguimientoWizard === 'coordinar_reunion' ? 'contained' : 'outlined'} size="small" startIcon={<EventIcon />}
                                                onClick={() => { setSeguimientoWizard('coordinar_reunion'); setWizardFase('nota'); }} sx={{ flex: 1, fontSize: '0.65rem', px: 0.5 }}>Reunión</Button>
                                        </Stack>
                                    </Box>
                                )}
                                {wizardFase === 'nota' && (
                                    <Box>
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Chip size="small" label={resultadoWA === 'respondio' ? '✅ Respondió' : '⏳ No respondió'} color={resultadoWA === 'respondio' ? 'success' : 'warning'} />
                                            {seguimientoWizard && (
                                                <Chip size="small" label={seguimientoWizard === 'llamar_despues' ? '📞' : seguimientoWizard === 'mensaje_despues' ? '💬' : '📅'}
                                                    color="info" variant="outlined" onDelete={() => { setSeguimientoWizard(null); setWizardFase('seguimiento'); }} sx={{ height: 22 }} />
                                            )}
                                        </Stack>
                                        {renderProximoContactoPicker(true)}
                                        <Button variant="contained" onClick={handleWizardConfirmarWA} disabled={registrandoWizard || !proximoContactoWizard} fullWidth size="small">
                                            {registrandoWizard ? <CircularProgress size={20} color="inherit" /> : 'Registrar ✓'}
                                        </Button>
                                    </Box>
                                )}
                                {wizardFase === 'pendiente_confirmacion' && (
                                    <Box>
                                        <Chip size="small" icon={<AccessTimeIcon />} label="📩 WA pendiente" color="info" sx={{ mb: 1 }} />
                                        <Stack direction="row" spacing={1}>
                                            <Button variant="contained" color="success" size="small" onClick={() => { setResultadoWA('respondio'); setWizardFase('seguimiento'); }} sx={{ flex: 1 }}>Sí respondió</Button>
                                            <Button variant="contained" color="warning" size="small" onClick={() => { setResultadoWA('no_respondio'); setWizardFase('nota'); }} sx={{ flex: 1 }}>No respondió</Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                            )}

                            {/* === EMAIL MOBILE === */}
                            {(canalWizard === 'email' || wizardFase === 'accion_email') && (
                            <Box>
                                <TextField fullWidth size="small" multiline maxRows={3}
                                    value={mensajeWA} onChange={(e) => setMensajeWA(e.target.value)} sx={{ mb: 1 }} placeholder="Contenido del email..." />
                                {renderProximoContactoPicker(true)}
                                <Button variant="contained" startIcon={<EmailIcon />}
                                    onClick={async () => {
                                        if (contacto.email) window.open(`mailto:${contacto.email}?body=${encodeURIComponent(mensajeWA)}`);
                                        setRegistrandoWizard(true);
                                        try {
                                            const proximaTarea = buildProximaTarea();
                                            await SDRService.registrarIntento(contacto._id, { tipo: 'email_enviado', canal: 'email', nota: mensajeWA.trim() || undefined, empresaId, proximoContacto: proximoContactoWizard || undefined, proximaTarea });
                                            mostrarSnackbar('Email registrado ✓');
                                            cargarContacto();
                                        } catch (err) { mostrarSnackbar('Error al registrar', 'error'); }
                                        finally { setRegistrandoWizard(false); }
                                    }}
                                    disabled={registrandoWizard || !proximoContactoWizard} fullWidth>Enviar Email</Button>
                            </Box>
                            )}

                            {/* === RECORDATORIO MOBILE === */}
                            {tipoTarea === 'recordatorio' && wizardFase === 'accion' && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                    {contacto.proximaTarea?.nota || 'Recordatorio pendiente'}
                                </Typography>
                                {renderProximoContactoPicker(true)}
                                <Button variant="contained" color="primary"
                                    onClick={async () => {
                                        setRegistrandoWizard(true);
                                        try {
                                            const proximaTarea = buildProximaTarea();
                                            await SDRService.registrarIntento(contacto._id, { tipo: 'recordatorio_completado', canal: 'otro', nota: 'Recordatorio completado', empresaId, proximoContacto: proximoContactoWizard || undefined, proximaTarea });
                                            mostrarSnackbar('Recordatorio completado ✓');
                                            cargarContacto();
                                        } catch (err) { mostrarSnackbar('Error al registrar', 'error'); }
                                        finally { setRegistrandoWizard(false); }
                                    }}
                                    disabled={registrandoWizard || !proximoContactoWizard} fullWidth size="small">
                                    {registrandoWizard ? <CircularProgress size={16} color="inherit" /> : 'Completar ✓'}
                                </Button>
                            </Box>
                            )}

                            {/* === SIN TAREA: botones de acción rápidos === */}
                            {!tieneTarea && !tieneAccionCadencia && !waPendiente && wizardFase === 'accion' && (
                                <Stack direction="row" justifyContent="space-around" alignItems="center">
                                    <IconButton onClick={() => { handleLlamar(); setWizardFase('resultado'); }} sx={{ bgcolor: '#4caf50', color: 'white', '&:hover': { bgcolor: '#388e3c' }, width: 42, height: 42 }}>
                                        <PhoneIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton onClick={() => setWizardFase('accion_wa')} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#128C7E' }, width: 42, height: 42 }}>
                                        <WhatsAppIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton onClick={() => setWizardFase('accion_email')} sx={{ border: 1, borderColor: 'grey.400', width: 42, height: 42 }}>
                                        <EmailIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton onClick={() => setModalReunion(true)} sx={{ border: 1, borderColor: 'primary.light', color: 'primary.main', width: 42, height: 42 }}>
                                        <EventIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton onClick={() => setModalRegistrarAccion(true)} sx={{ border: 1, borderColor: 'primary.light', color: 'primary.main', width: 42, height: 42 }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Stack>
                            )}

                            {/* Otra acción + siguiente */}
                            {wizardFase !== 'accion' && (
                                <Box sx={{ textAlign: 'center', mt: 1 }}>
                                    <Button size="small" variant="text" color="inherit"
                                        onClick={() => setModalRegistrarAccion(true)}
                                        sx={{ fontSize: '0.7rem', textTransform: 'none', color: 'text.secondary', py: 0 }}>Otra acción →</Button>
                                </Box>
                            )}

                            <Button variant="contained" fullWidth onClick={handleSiguienteContacto} endIcon={<ChevronRightIcon />}
                                size="small" sx={{ mt: 1.5, py: 1, fontWeight: 600, borderRadius: 2 }}>
                                {puedeSiguiente ? `Siguiente (${indiceActual + 2}/${contactoIds.length})` : 'Volver al listado'}
                            </Button>
                        </Box>
                        );
                    })()}
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
            <ModalCrearReunion
                open={modalReunion}
                onClose={() => setModalReunion(false)}
                contacto={contacto}
                onSubmit={handleRegistrarReunion}
                loading={guardandoReunion}
            />

            {/* Menú de re-asignación SDR */}
            <Menu
                anchorEl={menuAsignarAnchor}
                open={Boolean(menuAsignarAnchor)}
                onClose={() => setMenuAsignarAnchor(null)}
                PaperProps={{ sx: { minWidth: 220, maxHeight: 350 } }}
            >
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block', fontWeight: 600 }}>
                    Re-asignar a:
                </Typography>
                <Divider />
                {cargandoSdrs ? (
                    <MenuItem disabled>
                        <CircularProgress size={18} sx={{ mr: 1 }} /> Cargando SDRs...
                    </MenuItem>
                ) : sdrsDisponibles.length === 0 ? (
                    <MenuItem disabled>No hay SDRs disponibles</MenuItem>
                ) : (
                    sdrsDisponibles.map((sdr) => {
                        const sdrIdVal = sdr._id || sdr.id || sdr.uid;
                        const sdrNombreVal = sdr.nombre || sdr.displayName || `${sdr.firstName || ''} ${sdr.lastName || ''}`.trim() || sdr.email;
                        const esActual = sdrIdVal === contacto?.sdrAsignado;
                        return (
                            <MenuItem
                                key={sdrIdVal}
                                onClick={() => !esActual && handleReasignar(sdrIdVal, sdrNombreVal)}
                                disabled={esActual || asignando}
                                sx={{ fontSize: '0.85rem' }}
                            >
                                <ListItemIcon>
                                    {esActual ? <CheckCircleIcon fontSize="small" color="success" /> : <PersonIcon fontSize="small" />}
                                </ListItemIcon>
                                <ListItemText>
                                    {sdrNombreVal}
                                    {esActual && <Typography variant="caption" color="text.secondary"> (actual)</Typography>}
                                </ListItemText>
                            </MenuItem>
                        );
                    })
                )}
                <Divider />
                {contacto?.sdrAsignado && (
                    <MenuItem 
                        onClick={handleDesasignar} 
                        disabled={asignando}
                        sx={{ color: 'error.main', fontSize: '0.85rem' }}
                    >
                        <ListItemIcon>
                            <PersonRemoveIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Desasignar</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Input file oculto para subir grabaciones */}
            <input
                type="file"
                ref={fileInputRef}
                accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.aac,.amr,.3gp"
                style={{ display: 'none' }}
                onChange={handleSubirGrabacion}
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

            {/* Modal Selector de Templates WA */}
            <ModalSelectorTemplate
                open={modalTemplateWA}
                onClose={() => setModalTemplateWA(false)}
                contacto={contacto}
                user={user}
                empresaId={empresaId}
                onTemplateUsed={(template, mensaje) => setMensajeWA(mensaje)}
                onTemplateSelected={handleTemplateSelected}
            />

            {/* Modal Envío de Template Meta via Bot */}
            {tienePermisoEnviarBot && (
                <SendTemplateDialog
                    open={modalMetaTemplate}
                    onClose={() => setModalMetaTemplate(false)}
                    phone={contacto?.telefono?.replace(/\D/g, '') || ''}
                    contactName={contacto?.nombre || contacto?.empresa || ''}
                    empresaId={empresaId}
                    onSent={(result) => {
                        setSnackbar({ open: true, message: result.message || 'Template enviado via bot', severity: 'success' });
                    }}
                />
            )}
        </DashboardLayout>
    );
};

export default ContactoSDRDetailPage;
