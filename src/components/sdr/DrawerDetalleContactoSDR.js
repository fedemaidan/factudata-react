import { useState, useEffect } from 'react';
import {
    Drawer, Box, Typography, IconButton, Divider, Chip, Stack,
    Button, TextField, CircularProgress, Paper, Tooltip, Avatar, useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions, Collapse, Fab, Badge,
    Menu, MenuItem, ListItemIcon, ListItemText, Select, FormControl, InputLabel,
    Tabs, Tab
} from '@mui/material';
import {
    Close as CloseIcon,
    Phone as PhoneIcon,
    WhatsApp as WhatsAppIcon,
    Email as EmailIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    History as HistoryIcon,
    Send as SendIcon,
    PhoneMissed as PhoneMissedIcon,
    DoNotDisturb as DoNotDisturbIcon,
    Comment as CommentIcon,
    Event as EventIcon,
    Assignment as AssignmentIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    PersonAdd as PersonAddIcon,
    PersonRemove as PersonRemoveIcon,
    LinkedIn as LinkedInIcon,
    CloudDownload as ImportIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Keyboard as KeyboardIcon,
    AccessTime as AccessTimeIcon,
    Schedule as ScheduleIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    NavigateNext as NavigateNextIcon,
    Call as CallIcon,
    Add as AddIcon,
    Edit as EditIcon,
    FiberNew as NewIcon,
    Work as WorkIcon,
    EventAvailable as MeetIcon,
    Verified as VerifiedIcon,
    Block as BlockIcon,
    PhoneDisabled as PhoneDisabledIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    OpenInFull as OpenInFullIcon,
    CloseFullscreen as CloseFullscreenIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    Mic as MicIcon,
    Stop as StopIcon,
    Pause as PauseIcon,
    PlayArrow as PlayArrowIcon,
    GraphicEq as GraphicEqIcon,
    DeleteOutline as DeleteOutlineIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';
import ModalSelectorTemplate from './ModalSelectorTemplate';
import ModalRegistrarAccion from './ModalRegistrarAccion';
import { getWhatsAppLink, getTelLink } from '../../utils/phoneUtils';
import { PLANES_SORBY, INTENCIONES_COMPRA, PRECALIFICACION_BOT } from '../../constant/sdrConstants';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MiniChatViewer from './MiniChatViewer';
import ContadoresActividad from './ContadoresActividad';
import useGrabadorAudio from '../../hooks/useGrabadorAudio';

// Opciones de tamaño de empresa
const RUBRO_OPTIONS = [
    { value: '', label: 'Sin especificar' },
    { value: 'constructora', label: 'Constructora' },
    { value: 'desarrolladora', label: 'Desarrolladora' },
    { value: 'estudio de arquitectura', label: 'Estudio de arquitectura' },
    { value: 'profesional independiente', label: 'Profesional independiente' },
];

const TAMANO_EMPRESA_OPTIONS = [
    { value: '', label: 'Sin especificar' },
    { value: '1-10', label: '1-10 empleados' },
    { value: '11-50', label: '11-50 empleados' },
    { value: '51-200', label: '51-200 empleados' },
    { value: '200+', label: '200+ empleados' },
];

// ==================== CONSTANTES DE COLORES ====================

// Colores por tipo de evento
const getEventoColor = (tipo) => {
    const colores = {
        // Llamadas
        'llamada_atendida': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'llamada_no_atendida': { bg: '#fff3e0', border: '#ff9800', icon: '#e65100' },
        
        // Mensajes
        'whatsapp_enviado': { bg: '#e3f2fd', border: '#2196f3', icon: '#1565c0' },
        'email_enviado': { bg: '#e8eaf6', border: '#3f51b5', icon: '#283593' },
        'linkedin_enviado': { bg: '#e1f5fe', border: '#0288d1', icon: '#01579b' },
        
        // Reuniones
        'reunion_coordinada': { bg: '#f3e5f5', border: '#9c27b0', icon: '#6a1b9a' },
        'reunion_realizada': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'reunion_no_show': { bg: '#ffebee', border: '#ef5350', icon: '#c62828' },
        'reunion_cancelada': { bg: '#fff3e0', border: '#fb8c00', icon: '#ef6c00' },
        'reunion_actualizada': { bg: '#e3f2fd', border: '#42a5f5', icon: '#1565c0' },
        'reunion_aprobada': { bg: '#e8f5e9', border: '#4caf50', icon: '#2e7d32' },
        'reunion_rechazada': { bg: '#ffebee', border: '#f44336', icon: '#c62828' },
        
        // Estados negativos
        'marcado_no_califica': { bg: '#fce4ec', border: '#e91e63', icon: '#880e4f' },
        'marcado_no_responde': { bg: '#fff8e1', border: '#ffc107', icon: '#ff8f00' },
        
        // Asignaciones
        'contacto_creado': { bg: '#e0f2f1', border: '#009688', icon: '#00695c' },
        'contacto_asignado': { bg: '#e8f5e9', border: '#66bb6a', icon: '#388e3c' },
        'contacto_desasignado': { bg: '#efebe9', border: '#8d6e63', icon: '#5d4037' },
        'contacto_reasignado': { bg: '#fff3e0', border: '#ffb74d', icon: '#f57c00' },
        
        // Importación
        'importado_excel': { bg: '#e8f5e9', border: '#81c784', icon: '#43a047' },
        'importado_notion': { bg: '#ede7f6', border: '#7e57c2', icon: '#512da8' },
        'contexto_inicial': { bg: '#f5f5f5', border: '#9e9e9e', icon: '#616161' },
        
        // Notas
        'nota_agregada': { bg: '#fffde7', border: '#ffee58', icon: '#f9a825' },
        'comentario': { bg: '#fffde7', border: '#ffee58', icon: '#f9a825' },
        'audio_grabado': { bg: '#fce4ec', border: '#f48fb1', icon: '#c2185b' },
        'proximo_contacto_programado': { bg: '#e1f5fe', border: '#29b6f6', icon: '#0277bd' },
        'contacto_editado': { bg: '#eceff1', border: '#90a4ae', icon: '#546e7a' },
        'estado_cambiado': { bg: '#e8eaf6', border: '#5c6bc0', icon: '#3949ab' },
    };
    return colores[tipo] || { bg: '#f5f5f5', border: '#bdbdbd', icon: '#757575' };
};

// Icono por tipo de evento
const getEventoIcon = (tipo) => {
    const iconos = {
        'llamada_atendida': <PhoneIcon fontSize="small" />,
        'llamada_no_atendida': <PhoneMissedIcon fontSize="small" />,
        'whatsapp_enviado': <WhatsAppIcon fontSize="small" />,
        'email_enviado': <EmailIcon fontSize="small" />,
        'linkedin_enviado': <LinkedInIcon fontSize="small" />,
        'reunion_coordinada': <EventIcon fontSize="small" />,
        'reunion_realizada': <CheckCircleIcon fontSize="small" />,
        'reunion_no_show': <CancelIcon fontSize="small" />,
        'reunion_cancelada': <CancelIcon fontSize="small" />,
        'reunion_actualizada': <ScheduleIcon fontSize="small" />,
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
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

// ==================== CHIP DE ESTADO (EXPORT NAMED) ====================

// Configuración de estados v2 (10 estados del pipeline comercial)
const ESTADOS_CONFIG = {
    'nuevo': { color: 'info', label: 'Nuevo', icon: <NewIcon fontSize="small" /> },
    'contactado': { color: 'warning', label: 'Contactado', icon: <PhoneIcon fontSize="small" /> },
    'calificado': { color: 'success', label: 'Calificado', icon: <VerifiedIcon fontSize="small" /> },
    'cierre': { color: 'secondary', label: 'En Cierre', icon: <AssignmentIcon fontSize="small" /> },
    'ganado': { color: 'success', label: 'Ganado', icon: <CheckCircleIcon fontSize="small" /> },
    'no_contacto': { color: 'default', label: 'No Contactado', icon: <PhoneMissedIcon fontSize="small" /> },
    'no_responde': { color: 'default', label: 'No Responde', icon: <PhoneDisabledIcon fontSize="small" /> },
    'revisar_mas_adelante': { color: 'warning', label: 'Revisar Después', icon: <ScheduleIcon fontSize="small" /> },
    'no_califica': { color: 'error', label: 'No Califica', icon: <BlockIcon fontSize="small" /> },
    'perdido': { color: 'error', label: 'Perdido', icon: <CancelIcon fontSize="small" /> },
};

export const EstadoChip = ({ estado, quiereReunion }) => {
    const { color, label } = ESTADOS_CONFIG[estado] || { color: 'default', label: estado };
    if (estado === 'calificado' && quiereReunion) {
        return (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: 'inline-flex' }}>
                <Chip size="small" color={color} label={label} />
                <Typography component="span" sx={{ fontSize: '0.9rem', lineHeight: 1 }}>🎯</Typography>
            </Stack>
        );
    }
    return <Chip size="small" color={color} label={label} />;
};

// Chip de estado editable (con menú desplegable)
export const EstadoChipEditable = ({ estado, contactoId, onEstadoCambiado, mostrarSnackbar }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [estadoLocal, setEstadoLocal] = useState(estado);
    const open = Boolean(anchorEl);
    
    // Sincronizar con prop cuando cambia el contacto
    useEffect(() => {
        setEstadoLocal(estado);
    }, [estado, contactoId]);
    
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleClose = () => {
        setAnchorEl(null);
    };
    
    const handleCambiarEstado = async (nuevoEstado) => {
        if (nuevoEstado === estadoLocal) {
            handleClose();
            return;
        }
        
        setLoading(true);
        try {
            await SDRService.cambiarEstado(contactoId, nuevoEstado);
            setEstadoLocal(nuevoEstado); // Actualizar visualmente inmediatamente
            onEstadoCambiado?.(nuevoEstado);
            mostrarSnackbar?.(`Estado cambiado a "${ESTADOS_CONFIG[nuevoEstado]?.label}"`, 'success');
        } catch (error) {
            console.error('Error cambiando estado:', error);
            mostrarSnackbar?.('Error al cambiar estado', 'error');
        } finally {
            setLoading(false);
            handleClose();
        }
    };
    
    const { color, label } = ESTADOS_CONFIG[estadoLocal] || { color: 'default', label: estadoLocal };
    
    return (
        <>
            <Chip 
                size="small" 
                color={color} 
                label={loading ? 'Cambiando...' : label}
                onClick={handleClick}
                onDelete={handleClick}
                deleteIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.85 }
                }}
            />
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                {Object.entries(ESTADOS_CONFIG).map(([key, config]) => (
                    <MenuItem 
                        key={key} 
                        onClick={() => handleCambiarEstado(key)}
                        selected={key === estadoLocal}
                        disabled={loading}
                    >
                        <ListItemIcon sx={{ color: `${config.color}.main` }}>
                            {config.icon}
                        </ListItemIcon>
                        <ListItemText>{config.label}</ListItemText>
                        {key === estadoLocal && <CheckCircleIcon sx={{ ml: 1, fontSize: 16, color: 'success.main' }} />}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

// ==================== DRAWER PRINCIPAL ====================

const DrawerDetalleContactoSDR = ({
    open,
    onClose,
    contacto,
    contactos = [],
    indiceActual = -1,
    onCambiarIndice,
    onAccion,
    onAgregarComentario,
    onMarcarNoCalifica,
    onRefresh,
    mostrarSnackbar,
    empresaId,
    historialVersion = 0,
    user = {}, // Usuario actual para templates
}) => {
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [enviandoComentario, setEnviandoComentario] = useState(false);
    
    // Estado para próximo contacto
    const [proximoContactoLocal, setProximoContactoLocal] = useState(null);
    const [guardandoProximo, setGuardandoProximo] = useState(false);
    const [modalProximoContacto, setModalProximoContacto] = useState({ open: false, direccion: null });
    // Editor de tarea
    const [editandoTarea, setEditandoTarea] = useState(false);
    const [editTareaTipo, setEditTareaTipo] = useState(null);
    const [editTareaFecha, setEditTareaFecha] = useState(null);
    const [editTareaNota, setEditTareaNota] = useState('');
    
    // Modales nuevos
    const [modalTemplateWhatsApp, setModalTemplateWhatsApp] = useState(false);
    const [modalRegistrarAccion, setModalRegistrarAccion] = useState(false);
    const [modalEditarContacto, setModalEditarContacto] = useState(false);
    
    // Scoring: plan estimado e intención de compra
    const [guardandoScoring, setGuardandoScoring] = useState(false);
    
    // Estado para historial expandido
    const [mostrarTodosEventos, setMostrarTodosEventos] = useState(false);
    
    // Estado para drawer expandido (pantalla completa)
    const [drawerExpandido, setDrawerExpandido] = useState(false);
    
    // Grabador de audio
    const grabador = useGrabadorAudio();
    const [subiendoAudio, setSubiendoAudio] = useState(false);
    const [reanalizandoEvento, setReanalizandoEvento] = useState(null);
    const [retranscribiendoEvento, setRetranscribiendoEvento] = useState(null);
    
    // Tab activo en vista desktop (0=Info, 1=Historial)
    const [drawerTab, setDrawerTab] = useState(0);
    
    // Estado local del contacto para poder actualizarlo sin refrescar
    const [contactoLocal, setContactoLocal] = useState(contacto);
    
    // Sincronizar contactoLocal cuando cambia el prop
    useEffect(() => {
        setContactoLocal(contacto);
    }, [contacto?._id, contacto]);
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Sincronizar próximo contacto con el contacto actual
    useEffect(() => {
        if (contactoLocal?.proximoContacto) {
            setProximoContactoLocal(new Date(contactoLocal.proximoContacto));
        } else {
            setProximoContactoLocal(null);
        }
    }, [contactoLocal?._id, contactoLocal?.proximoContacto]);

    // Cargar historial cuando cambia el contacto o historialVersion
    useEffect(() => {
        if (open && contactoLocal?._id) {
            cargarHistorial();
            setMostrarTodosEventos(false); // Resetear al cambiar de contacto
        }
    }, [open, contactoLocal?._id, historialVersion]);

    // Atajos de teclado para navegar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!open || contactos.length <= 1) return;
            
            if (e.key === 'ArrowLeft' && indiceActual > 0) {
                e.preventDefault();
                onCambiarIndice?.(indiceActual - 1);
            } else if (e.key === 'ArrowRight' && indiceActual < contactos.length - 1) {
                e.preventDefault();
                onCambiarIndice?.(indiceActual + 1);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, indiceActual, contactos.length, onCambiarIndice]);

    const cargarHistorial = async () => {
        if (!contactoLocal?._id) return;
        setLoadingHistorial(true);
        try {
            const data = await SDRService.obtenerHistorial(contactoLocal._id);
            setHistorial(data.historial || []);
        } catch (err) {
            console.error('Error cargando historial:', err);
        } finally {
            setLoadingHistorial(false);
        }
    };

    // Formatear teléfono para links
    const formatTelefono = (tel) => {
        if (!tel) return '';
        return tel.replace(/\D/g, '');
    };

    // Abrir WhatsApp con selector de templates
    const handleWhatsApp = () => {
        console.log('handleWhatsApp llamado, abriendo modal...');
        console.log('Estado actual modalTemplateWhatsApp:', modalTemplateWhatsApp);
        setModalTemplateWhatsApp(true);
    };
    
    // WhatsApp directo (sin template)
    const handleWhatsAppDirecto = () => {
        const tel = formatTelefono(contactoLocal?.telefono);
        if (!tel) return;
        const mensaje = encodeURIComponent(
            `¡Hola ${contactoLocal.nombre?.split(' ')[0] || contactoLocal.nombre}! Soy de Sorby, ¿cómo estás?`
        );
        window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
    };

    // Callback cuando se usa un template de WhatsApp
    const handleTemplateUsed = async (template, mensaje) => {
        // Registrar que se envió WhatsApp
        try {
            await SDRService.registrarIntento(contactoLocal._id, {
                tipo: 'whatsapp_enviado',
                canal: 'whatsapp',
                nota: `Template: ${template?.label || 'personalizado'}`,
                empresaId
            });
            await cargarHistorial();
            onRefresh?.();
            mostrarSnackbar?.('WhatsApp registrado', 'success');
        } catch (error) {
            console.error('Error registrando WhatsApp:', error);
        }
    };

    // Llamar
    const handleLlamar = () => {
        const tel = formatTelefono(contacto?.telefono);
        if (!tel) return;
        window.open(`tel:${tel}`, '_self');
    };
    
    // Abrir modal de registrar acción
    const handleAbrirRegistrarAccion = () => {
        setModalRegistrarAccion(true);
    };
    
    // Callback cuando se registra una acción
    const handleAccionRegistrada = (resultado) => {
        if (resultado?.abrirModalReunion) {
            // El padre debe manejar esto
            onAccion?.(contacto, 'reunion');
            return;
        }
        
        // Actualizar contacto local con el próximo contacto si se definió
        if (resultado?.proximoContacto) {
            setContactoLocal(prev => ({
                ...prev,
                proximoContacto: resultado.proximoContacto
            }));
        }
        
        cargarHistorial();
        onRefresh?.();
    };
    
    // Navegar al siguiente contacto
    const handleNavegarSiguiente = () => {
        if (puedeSiguiente) {
            handleNavegar('siguiente');
        }
        setModalRegistrarAccion(false);
    };

    // Agregar comentario
    const handleEnviarComentario = async () => {
        if (!nuevoComentario.trim() || !contactoLocal?._id) return;
        setEnviandoComentario(true);
        try {
            const success = await onAgregarComentario?.(contactoLocal._id, nuevoComentario.trim());
            if (success) {
                setNuevoComentario('');
                await cargarHistorial();
            }
        } catch (err) {
            console.error('Error agregando comentario:', err);
        } finally {
            setEnviandoComentario(false);
        }
    };

    // Enviar audio grabado
    const handleEnviarAudio = async () => {
        if (!grabador.audioBlob || !contactoLocal?._id) return;
        setSubiendoAudio(true);
        try {
            await SDRService.subirAudio(contactoLocal._id, grabador.audioBlob, {
                duracion: grabador.duracion,
                nota: nuevoComentario.trim() || '',
                empresaId
            });
            mostrarSnackbar?.('🎙️ Audio guardado y transcrito', 'success');
            grabador.limpiar();
            setNuevoComentario('');
            await cargarHistorial();
        } catch (err) {
            console.error('Error subiendo audio:', err);
            mostrarSnackbar?.('Error al subir el audio', 'error');
        } finally {
            setSubiendoAudio(false);
        }
    };

    const handleReanalizarAudio = async (eventoId) => {
        const comentario = prompt('💬 Indicación para el re-análisis (opcional):\nEj: "Enfocate en los problemas que mencionó"', '');
        if (comentario === null) return;

        setReanalizandoEvento(eventoId);
        try {
            await SDRService.reanalizarAudio(eventoId, comentario.trim());
            mostrarSnackbar?.('🤖 Audio re-analizado', 'success');
            await cargarHistorial();
        } catch (err) {
            console.error('Error re-analizando audio:', err);
            mostrarSnackbar?.(err?.response?.data?.error || 'Error al re-analizar el audio', 'error');
        } finally {
            setReanalizandoEvento(null);
        }
    };

    const handleRetranscribirAudio = async (eventoId) => {
        const comentario = prompt('💬 Contexto opcional para mejorar la re-transcripción y el resumen:\nEj: "Hablan de acopios y remitos"', '');
        if (comentario === null) return;

        setRetranscribiendoEvento(eventoId);
        try {
            await SDRService.retranscribirAudio(eventoId, comentario.trim());
            mostrarSnackbar?.('📝 Audio re-transcripto', 'success');
            await cargarHistorial();
        } catch (err) {
            console.error('Error re-transcribiendo audio:', err);
            mostrarSnackbar?.(err?.response?.data?.error || 'Error al re-transcribir el audio', 'error');
        } finally {
            setRetranscribiendoEvento(null);
        }
    };

    // ==================== PRÓXIMO CONTACTO ====================
    
    // Calcular fecha de próximo contacto
    const calcularFecha = (cantidad, unidad) => {
        const fecha = new Date();
        if (unidad === 'horas') {
            fecha.setHours(fecha.getHours() + cantidad);
        } else if (unidad === 'dias') {
            fecha.setDate(fecha.getDate() + cantidad);
            fecha.setHours(9, 0, 0, 0);
        } else if (unidad === 'meses') {
            fecha.setMonth(fecha.getMonth() + cantidad);
            fecha.setHours(9, 0, 0, 0);
        } else if (unidad === 'tarde') {
            const ahora = new Date();
            fecha.setHours(15, 0, 0, 0);
            if (fecha <= ahora) { fecha.setHours(17, 0, 0, 0); }
            if (fecha <= ahora) { fecha.setDate(fecha.getDate() + 1); fecha.setHours(15, 0, 0, 0); }
        } else if (unidad === 'manana') {
            fecha.setDate(fecha.getDate() + 1);
            fecha.setHours(9, 0, 0, 0);
        } else if (unidad === 'tarde_dia') {
            fecha.setDate(fecha.getDate() + 1);
            fecha.setHours(15, 0, 0, 0);
        }
        return fecha;
    };

    // Guardar próximo contacto / tarea
    const handleGuardarProximoContacto = async (fecha) => {
        if (!contactoLocal?._id) return;
        setGuardandoProximo(true);
        try {
            await SDRService.actualizarProximoContacto(contactoLocal._id, fecha, contactoLocal.empresaId);
            setProximoContactoLocal(fecha);
            mostrarSnackbar?.('Próxima tarea actualizada', 'success');
            onRefresh?.();
            await cargarHistorial();
        } catch (err) {
            console.error('Error guardando próximo contacto:', err);
            mostrarSnackbar?.('Error al actualizar', 'error');
        } finally {
            setGuardandoProximo(false);
        }
    };

    /** Guardar tarea completa (tipo + fecha + nota) */
    const handleGuardarProximaTarea = async (tipo, fecha, nota) => {
        if (!contactoLocal?._id || !tipo || !fecha) return;
        setGuardandoProximo(true);
        try {
            const proximaTarea = { tipo, fecha, nota: nota?.trim() || null, autoGenerada: false };
            await SDRService.actualizarProximoContacto(contactoLocal._id, fecha, contactoLocal.empresaId, proximaTarea);
            setProximoContactoLocal(fecha);
            setEditandoTarea(false);
            setEditTareaTipo(null);
            setEditTareaFecha(null);
            setEditTareaNota('');
            mostrarSnackbar?.('Próxima tarea guardada ✓', 'success');
            onRefresh?.();
            await cargarHistorial();
        } catch (err) {
            console.error('Error guardando tarea:', err);
            mostrarSnackbar?.('Error al guardar tarea', 'error');
        } finally {
            setGuardandoProximo(false);
        }
    };

    // Tipos de tarea para el editor
    const TIPOS_TAREA = [
        { key: 'llamada', icon: '📞', label: 'Llamar' },
        { key: 'whatsapp', icon: '💬', label: 'WhatsApp' },
        { key: 'email', icon: '✉️', label: 'Email' },
        { key: 'recordatorio', icon: '📝', label: 'Recordatorio' },
    ];

    // Botones rápidos de próximo contacto
    const botonesProximoContacto = [
        { label: 'Hoy tarde', cantidad: 0, unidad: 'tarde' },
        { label: 'Mañana AM', cantidad: 1, unidad: 'manana' },
        { label: 'Mañana PM', cantidad: 1, unidad: 'tarde_dia' },
        { label: '3 días', cantidad: 3, unidad: 'dias' },
        { label: '1 sem', cantidad: 7, unidad: 'dias' },
        { label: '2 meses', cantidad: 2, unidad: 'meses' },
    ];

    // Formatear fecha para mostrar - AHORA INCLUYE HORA EXACTA
    const formatearProximoContacto = (fecha) => {
        if (!fecha) return null;
        const d = new Date(fecha);
        const ahora = new Date();
        const diffMs = d - ahora;
        
        // Formato de hora exacta
        const horaExacta = d.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let estado = 'success';
        let descripcion = '';
        
        if (diffMs < 0) {
            estado = 'error';
            descripcion = 'Vencido - ';
        } else if (diffMs < 1000 * 60 * 60) {
            estado = 'warning';
            descripcion = 'Pronto - ';
        } else if (diffMs < 1000 * 60 * 60 * 24) {
            estado = 'warning';
            descripcion = 'Hoy - ';
        }
        
        return { 
            texto: `${descripcion}${horaExacta}`, 
            color: estado 
        };
    };
    
    // Convertir fecha a formato datetime-local para el input
    const fechaParaInput = (fecha) => {
        if (!fecha) return '';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        // Usar zona horaria Argentina para ser consistente en SSR y cliente
        const str = d.toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
        return str.substring(0, 16).replace(' ', 'T');
    };

    // ==================== SCORING: PLAN E INTENCIÓN ====================

    const handleActualizarPlan = async (plan) => {
        if (!contactoLocal?._id) return;
        setGuardandoScoring(true);
        try {
            await SDRService.actualizarPlanEstimado(contactoLocal._id, plan, empresaId);
            setContactoLocal(prev => ({ ...prev, planEstimado: plan }));
            mostrarSnackbar?.(`Plan actualizado a "${PLANES_SORBY[plan]?.label || plan}"`, 'success');
            onRefresh?.();
        } catch (err) {
            console.error('Error actualizando plan:', err);
            mostrarSnackbar?.('Error al actualizar plan', 'error');
        } finally {
            setGuardandoScoring(false);
        }
    };

    const handleActualizarIntencion = async (intencion) => {
        if (!contactoLocal?._id) return;
        setGuardandoScoring(true);
        try {
            await SDRService.actualizarIntencionCompra(contactoLocal._id, intencion, empresaId);
            setContactoLocal(prev => ({ ...prev, intencionCompra: intencion }));
            mostrarSnackbar?.(`Intención actualizada a "${INTENCIONES_COMPRA[intencion]?.label || intencion}"`, 'success');
            onRefresh?.();
        } catch (err) {
            console.error('Error actualizando intención:', err);
            mostrarSnackbar?.('Error al actualizar intención', 'error');
        } finally {
            setGuardandoScoring(false);
        }
    };

    // ==================== NAVEGACIÓN CON CONFIRMACIÓN ====================
    
    // Verificar si próximo contacto está vencido o vacío
    const proximoVencidoOVacio = () => {
        const proximo = proximoContactoLocal || contacto?.proximoContacto;
        if (!proximo) return true; // Vacío
        return new Date(proximo) < new Date(); // Vencido
    };
    
    const handleNavegar = (direccion) => {
        const nuevoIndice = direccion === 'anterior' ? indiceActual - 1 : indiceActual + 1;
        
        // Si no tiene próximo contacto o está vencido, preguntar
        if (proximoVencidoOVacio()) {
            setModalProximoContacto({ open: true, direccion, nuevoIndice });
        } else {
            onCambiarIndice?.(nuevoIndice);
        }
    };

    const handleConfirmarNavegacion = async (fechaProximo) => {
        const { nuevoIndice } = modalProximoContacto;
        
        if (fechaProximo) {
            // Guardar la fecha seleccionada
            await handleGuardarProximoContacto(fechaProximo);
        }
        
        setModalProximoContacto({ open: false, direccion: null, nuevoIndice: null });
        onCambiarIndice?.(nuevoIndice);
    };

    // Navegación
    const puedeAnterior = indiceActual > 0;
    const puedeSiguiente = indiceActual < contactos.length - 1;
    
    // Estado para secciones colapsables en mobile
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [mostrarAcciones, setMostrarAcciones] = useState(false);
    const [mostrarConversacion, setMostrarConversacion] = useState(false);

    if (!contacto || !contactoLocal) return null;

    // Info de próximo contacto formateada
    const proximoInfo = formatearProximoContacto(proximoContactoLocal || contacto?.proximoContacto);

    // ==================== VISTA MOBILE ====================
    if (isMobile) {
        return (
            <>
            <Drawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                PaperProps={{ 
                    sx: { 
                        height: '100%',
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0
                    } 
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
                    {/* Header mínimo */}
                    <Box sx={{ 
                        px: 1.5, 
                        py: 1,
                        bgcolor: 'white',
                        borderBottom: 1, 
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <IconButton onClick={onClose} edge="start">
                            <CloseIcon />
                        </IconButton>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            {contactos.length > 1 && (
                                <Chip 
                                    size="small" 
                                    label={`${indiceActual + 1} / ${contactos.length}`}
                                    variant="outlined"
                                />
                            )}
                            <IconButton 
                                onClick={() => {
                                    onRefresh?.();
                                    cargarHistorial();
                                    mostrarSnackbar?.('Datos actualizados', 'success');
                                }}
                                size="small"
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Box>

                    {/* Contenido scrolleable */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 20 }}>
                        
                        {/* Card de identidad y contacto */}
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3 }}>
                            {/* Nombre y cargo */}
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h5" fontWeight={700} noWrap>
                                        {contactoLocal.nombre}
                                    </Typography>
                                    {contactoLocal.cargo && (
                                        <Typography variant="body2" color="text.secondary">
                                            {contactoLocal.cargo}
                                        </Typography>
                                    )}
                                    {contactoLocal.empresa && (
                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                                            <BusinessIcon fontSize="small" color="action" sx={{ fontSize: 15 }} />
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {contactoLocal.empresa}
                                                {contactoLocal.tamanoEmpresa && (
                                                    <Chip size="small" label={contactoLocal.tamanoEmpresa} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                                )}
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>
                                <IconButton size="small" onClick={() => setModalEditarContacto(true)} sx={{ mt: 0.5 }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Stack>

                            {/* Estado + Segmento */}
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 2 }}>
                                <EstadoChipEditable 
                                    estado={contactoLocal.estado} 
                                    contactoId={contactoLocal._id}
                                    onEstadoCambiado={() => {
                                        onRefresh?.();
                                        cargarHistorial();
                                    }}
                                    mostrarSnackbar={mostrarSnackbar}
                                />
                                {contactoLocal.segmento && (
                                    <Chip 
                                        size="small" 
                                        variant="outlined"
                                        label={contactoLocal.segmento === 'outbound' ? 'Outbound' : '🟢 Inbound'} 
                                    />
                                )}
                            </Stack>

                            {/* Contadores de actividad */}
                            <ContadoresActividad contadores={contactoLocal.contadores} size="small" />

                            <Divider sx={{ mb: 2 }} />

                            {/* Datos de contacto con acciones inline */}
                            <Stack spacing={0.8} sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <PhoneIcon fontSize="small" color="action" />
                                    <Typography variant="body1" fontWeight={500}>{contactoLocal.telefono}</Typography>
                                    <IconButton size="small" href={getTelLink(contactoLocal.telefono)} sx={{ p: 0.3 }}>
                                        <CallIcon fontSize="small" color="success" />
                                    </IconButton>
                                    <IconButton size="small" href={getWhatsAppLink(contactoLocal.telefono)} target="_blank" sx={{ p: 0.3 }}>
                                        <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                                    </IconButton>
                                </Stack>
                                {contactoLocal.telefonosSecundarios?.map((tel, i) => (
                                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                                        <PhoneIcon fontSize="small" color="action" sx={{ opacity: 0.5 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {tel.numero}
                                            <Chip size="small" label={tel.etiqueta} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                        </Typography>
                                    </Stack>
                                ))}
                                {contactoLocal.email && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{contactoLocal.email}</Typography>
                                    </Stack>
                                )}
                            </Stack>

                            {/* Botones de acción */}
                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<PhoneIcon />}
                                    onClick={handleLlamar}
                                    sx={{ 
                                        py: 1.5,
                                        bgcolor: '#4caf50', 
                                        '&:hover': { bgcolor: '#388e3c' },
                                        borderRadius: 2,
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    Llamar
                                </Button>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<WhatsAppIcon />}
                                    onClick={handleWhatsApp}
                                    sx={{ 
                                        py: 1.5,
                                        bgcolor: '#25D366', 
                                        '&:hover': { bgcolor: '#128C7E' },
                                        borderRadius: 2,
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    WhatsApp
                                </Button>
                            </Stack>
                        </Paper>

                        {/* Scoring: Plan, Intención, Prioridad, Bot */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                <TrendingUpIcon color="action" fontSize="small" />
                                <Typography variant="subtitle2">Calificación comercial</Typography>
                                {guardandoScoring && <CircularProgress size={14} />}
                            </Stack>

                            {/* Plan Estimado */}
                            <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    Plan estimado
                                </Typography>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {Object.entries(PLANES_SORBY).map(([key, plan]) => (
                                        <Chip
                                            key={key}
                                            size="small"
                                            label={`${plan.icon} ${plan.label}`}
                                            color={contactoLocal.planEstimado === key ? plan.color : 'default'}
                                            variant={contactoLocal.planEstimado === key ? 'filled' : 'outlined'}
                                            onClick={() => handleActualizarPlan(key)}
                                            disabled={guardandoScoring}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            {/* Intención de Compra */}
                            <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                    Intención de compra
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    {Object.entries(INTENCIONES_COMPRA).map(([key, ic]) => (
                                        <Chip
                                            key={key}
                                            size="small"
                                            label={`${ic.icon} ${ic.label}`}
                                            color={contactoLocal.intencionCompra === key ? ic.color : 'default'}
                                            variant={contactoLocal.intencionCompra === key ? 'filled' : 'outlined'}
                                            onClick={() => handleActualizarIntencion(key)}
                                            disabled={guardandoScoring}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            {/* Prioridad Score + Precalificación Bot */}
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                {contactoLocal.prioridadScore > 0 && (
                                    <Chip
                                        size="small"
                                        label={`Prioridad: ${contactoLocal.prioridadScore}`}
                                        color={contactoLocal.prioridadScore >= 70 ? 'error' : contactoLocal.prioridadScore >= 40 ? 'warning' : 'default'}
                                        variant="filled"
                                        sx={{ fontWeight: 700 }}
                                    />
                                )}
                                {contactoLocal.precalificacionBot && contactoLocal.precalificacionBot !== 'sin_calificar' && (
                                    <Chip
                                        size="small"
                                        icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                                        label={PRECALIFICACION_BOT[contactoLocal.precalificacionBot]?.label || contactoLocal.precalificacionBot}
                                        color={PRECALIFICACION_BOT[contactoLocal.precalificacionBot]?.color || 'default'}
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        </Paper>

                        {/* Datos del Bot (si existen) */}
                        {contactoLocal.datosBot && (contactoLocal.datosBot.rubro || contactoLocal.datosBot.interes || contactoLocal.datosBot.saludoInicial || contactoLocal.datosBot.cantidadObras) && (
                            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, bgcolor: '#e3f2fd', border: '1px solid', borderColor: 'info.light' }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <SmartToyIcon color="info" fontSize="small" />
                                    <Typography variant="subtitle2" color="info.dark">Información del Bot</Typography>
                                </Stack>
                                <Stack spacing={0.8}>
                                    {contactoLocal.datosBot.rubro && (
                                        <Typography variant="body2">
                                            <strong>🏗️ Rubro:</strong> {contactoLocal.datosBot.rubro}
                                        </Typography>
                                    )}
                                    {contactoLocal.datosBot.interes && (
                                        <Typography variant="body2">
                                            <strong>💡 Interés:</strong> {contactoLocal.datosBot.interes === 'probar' ? 'Quiere probar' : contactoLocal.datosBot.interes === 'info' ? 'Pide info' : contactoLocal.datosBot.interes === 'humano' ? 'Pide hablar con humano' : contactoLocal.datosBot.interes === 'usuario_existente' ? 'Usuario existente' : contactoLocal.datosBot.interes}
                                        </Typography>
                                    )}
                                    {contactoLocal.datosBot.cantidadObras && (
                                        <Typography variant="body2">
                                            <strong>📊 Cantidad de obras:</strong> {contactoLocal.datosBot.cantidadObras}
                                        </Typography>
                                    )}
                                    {contactoLocal.datosBot.saludoInicial && (
                                        <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'white', p: 1, borderRadius: 1, mt: 0.5 }}>
                                            💬 "{contactoLocal.datosBot.saludoInicial}"
                                        </Typography>
                                    )}
                                    {contactoLocal.datosBot.interaccionFecha && (
                                        <Typography variant="caption" color="text.secondary">
                                            📅 Última interacción: {new Date(contactoLocal.datosBot.interaccionFecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    )}
                                    {contactoLocal.datosBot.empresaFirestoreId && (
                                        <Typography variant="caption" color="text.secondary">
                                            ✅ Empresa creada en onboarding
                                        </Typography>
                                    )}
                                </Stack>
                            </Paper>
                        )}

                        {/* Conversación del contacto */}
                        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
                            <Box 
                                onClick={() => setMostrarConversacion(!mostrarConversacion)}
                                sx={{ 
                                    p: 2, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    '&:active': { bgcolor: 'grey.100' }
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <ChatBubbleOutlineIcon color="action" fontSize="small" />
                                    <Typography variant="subtitle2">Conversación</Typography>
                                </Stack>
                                {mostrarConversacion ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Box>
                            <Collapse in={mostrarConversacion} unmountOnExit>
                                <Box sx={{ height: 350 }}>
                                    <MiniChatViewer telefono={contactoLocal?.telefono} />
                                </Box>
                            </Collapse>
                        </Paper>

                        {/* Próxima tarea — Editor completo */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <AccessTimeIcon color="action" fontSize="small" />
                                    <Typography variant="subtitle2">Próxima tarea</Typography>
                                </Stack>
                                {guardandoProximo && <CircularProgress size={16} />}
                            </Stack>
                            
                            {/* Modo vista */}
                            {proximoContactoLocal && !editandoTarea ? (
                                <Box>
                                    <Stack spacing={0.5} sx={{ mb: 1 }}>
                                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                            {contacto?.proximaTarea?.tipo && (
                                                <Chip size="small"
                                                    label={contacto.proximaTarea.tipo === 'llamada' ? '📞 Llamar' : contacto.proximaTarea.tipo === 'whatsapp' ? '💬 WhatsApp' : contacto.proximaTarea.tipo === 'email' ? '✉️ Email' : '📝 Recordatorio'}
                                                    color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                                            )}
                                            <Chip icon={<ScheduleIcon />}
                                                label={proximoInfo?.texto || 'Programado'}
                                                color={proximoInfo?.color === 'error' ? 'error' : proximoInfo?.color === 'warning' ? 'warning' : 'success'} />
                                        </Stack>
                                        {contacto?.proximaTarea?.nota && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pl: 0.5 }}>
                                                💬 {contacto.proximaTarea.nota}
                                            </Typography>
                                        )}
                                    </Stack>
                                    <Stack direction="row" spacing={0.5}>
                                        <Button size="small" variant="outlined"
                                            onClick={() => {
                                                setEditandoTarea(true);
                                                setEditTareaTipo(contacto?.proximaTarea?.tipo || null);
                                                setEditTareaFecha(proximoContactoLocal ? new Date(proximoContactoLocal) : null);
                                                setEditTareaNota(contacto?.proximaTarea?.nota || '');
                                            }}
                                            sx={{ fontSize: '0.7rem', textTransform: 'none' }}>✏️ Modificar</Button>
                                        <Button size="small" variant="outlined" color="error"
                                            onClick={() => handleGuardarProximoContacto(null)}
                                            disabled={guardandoProximo}
                                            sx={{ fontSize: '0.7rem', textTransform: 'none', minWidth: 'auto' }}>🗑️</Button>
                                    </Stack>
                                </Box>
                            ) : !editandoTarea ? (
                                <Button size="small" variant="outlined" color="primary"
                                    onClick={() => { setEditandoTarea(true); setEditTareaTipo(null); setEditTareaFecha(null); setEditTareaNota(''); }}
                                    sx={{ mb: 1, textTransform: 'none' }}>+ Crear tarea</Button>
                            ) : null}

                            {/* Editor */}
                            {editandoTarea && (
                                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: (editTareaTipo && editTareaFecha) ? 'success.light' : 'warning.light' }}>
                                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Tipo</Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                        {TIPOS_TAREA.map((t) => (
                                            <Chip key={t.key} size="small"
                                                icon={<span style={{ fontSize: '0.85rem' }}>{t.icon}</span>}
                                                label={t.label}
                                                color={editTareaTipo === t.key ? 'primary' : 'default'}
                                                variant={editTareaTipo === t.key ? 'filled' : 'outlined'}
                                                onClick={() => setEditTareaTipo(t.key)}
                                                sx={{ cursor: 'pointer', fontSize: '0.7rem' }} />
                                        ))}
                                    </Stack>

                                    <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Fecha</Typography>
                                    {editTareaFecha && (
                                        <Chip size="small"
                                            label={`📅 ${new Date(editTareaFecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(editTareaFecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                                            color="success" onDelete={() => setEditTareaFecha(null)} sx={{ fontWeight: 600, mb: 0.5 }} />
                                    )}
                                    {!editTareaFecha && (
                                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                            {botonesProximoContacto.map((btn) => (
                                                <Chip key={btn.label} label={btn.label} size="small" variant="outlined" color="primary"
                                                    onClick={() => setEditTareaFecha(calcularFecha(btn.cantidad, btn.unidad))}
                                                    sx={{ cursor: 'pointer', fontSize: '0.7rem' }} />
                                            ))}
                                        </Stack>
                                    )}
                                    {/* Inputs separados fecha + hora: siempre visibles */}
                                    {(() => {
                                        const partes = fechaParaInput(editTareaFecha).split('T');
                                        const fechaVal = partes[0] || '';
                                        const horaVal = partes[1] || '09:00';
                                        return (
                                            <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                                                <input type="date" value={fechaVal}
                                                    onChange={(e) => { const d = e.target.value; if (d) setEditTareaFecha(new Date(`${d}T${horaVal}`)); }}
                                                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', flex: 1, boxSizing: 'border-box' }} />
                                                <input type="time" value={horaVal}
                                                    onChange={(e) => {
                                                        const t = e.target.value;
                                                        if (!t) return;
                                                        if (fechaVal) { setEditTareaFecha(new Date(`${fechaVal}T${t}`)); }
                                                        else { const hoy = new Date(); const pad = n => String(n).padStart(2, '0'); setEditTareaFecha(new Date(`${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-${pad(hoy.getDate())}T${t}`)); }
                                                    }}
                                                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: 88, boxSizing: 'border-box' }} />
                                            </Stack>
                                        );
                                    })()}

                                    <Typography variant="caption" fontWeight={600} sx={{ mt: 1, mb: 0.5, display: 'block' }}>Comentario (opcional)</Typography>
                                    <input type="text" placeholder="Comentario para la tarea..."
                                        value={editTareaNota} onChange={(e) => setEditTareaNota(e.target.value)}
                                        style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }} />

                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                        <Button variant="contained" size="small" color="success"
                                            disabled={!editTareaTipo || !editTareaFecha || guardandoProximo}
                                            onClick={() => handleGuardarProximaTarea(editTareaTipo, editTareaFecha, editTareaNota)}
                                            sx={{ flex: 1, textTransform: 'none' }}>
                                            {guardandoProximo ? <CircularProgress size={18} color="inherit" /> : '💾 Guardar'}
                                        </Button>
                                        <Button variant="outlined" size="small"
                                            onClick={() => { setEditandoTarea(false); setEditTareaTipo(null); setEditTareaFecha(null); setEditTareaNota(''); }}
                                            sx={{ textTransform: 'none' }}>Cancelar</Button>
                                    </Stack>
                                </Box>
                            )}
                        </Paper>

                        {/* Comentario rápido + Grabación de audio */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            {/* Indicador de grabación activa */}
                            {(grabador.estado === 'grabando' || grabador.estado === 'pausado') && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, p: 1, bgcolor: grabador.estado === 'grabando' ? 'error.50' : 'warning.50', borderRadius: 2, border: 1, borderColor: grabador.estado === 'grabando' ? 'error.200' : 'warning.200' }}>
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
                                <Stack spacing={1} sx={{ mb: 1.5, p: 1.5, bgcolor: 'success.50', borderRadius: 2, border: 1, borderColor: 'success.200' }}>
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
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'white' } }}
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
                                        placeholder="Agregar nota rápida..."
                                        value={nuevoComentario}
                                        onChange={(e) => setNuevoComentario(e.target.value)}
                                        disabled={enviandoComentario || grabador.estado === 'grabando' || grabador.estado === 'pausado'}
                                        sx={{ 
                                            '& .MuiOutlinedInput-root': { 
                                                borderRadius: 2,
                                                bgcolor: 'grey.50'
                                            }
                                        }}
                                    />
                                    {grabador.estado === 'inactivo' && (
                                        <Tooltip title="Grabar audio">
                                            <IconButton 
                                                color="error"
                                                onClick={grabador.iniciar}
                                                sx={{ 
                                                    bgcolor: 'error.50',
                                                    '&:hover': { bgcolor: 'error.100' }
                                                }}
                                            >
                                                <MicIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <IconButton 
                                        color="primary"
                                        onClick={handleEnviarComentario}
                                        disabled={!nuevoComentario.trim() || enviandoComentario || grabador.estado !== 'inactivo'}
                                    >
                                        {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                    </IconButton>
                                </Stack>
                            )}
                        </Paper>

                        {/* Historial - Colapsable */}
                        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                            <Box 
                                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                sx={{ 
                                    p: 2, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    '&:active': { bgcolor: 'grey.100' }
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2">Historial</Typography>
                                    <Chip size="small" label={historial.length} />
                                </Stack>
                                {mostrarHistorial ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Box>
                            <Collapse in={mostrarHistorial}>
                                <Box sx={{ px: 2, pb: 2, maxHeight: 300, overflow: 'auto' }}>
                                    {loadingHistorial ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : historial.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                            Sin historial
                                        </Typography>
                                    ) : (
                                        <Stack spacing={1}>
                                            {(mostrarTodosEventos ? historial : historial.slice(0, 10)).map((evento) => {
                                                const colors = getEventoColor(evento.tipo);
                                                return (
                                                    <Box
                                                        key={evento._id}
                                                        sx={{
                                                            p: 1.5,
                                                            bgcolor: colors.bg,
                                                            borderLeft: 3,
                                                            borderColor: colors.border,
                                                            borderRadius: 1
                                                        }}
                                                    >
                                                        <Typography variant="body2" fontWeight={500}>
                                                            {evento.descripcion}
                                                        </Typography>
                                                        {(evento.audioUrl || evento.metadata?.audioUrl) && (
                                                            <Box sx={{ mt: 1 }}>
                                                                <audio 
                                                                    controls 
                                                                    src={evento.audioUrl || evento.metadata?.audioUrl} 
                                                                    style={{ width: '100%', height: 32 }} 
                                                                    preload="none"
                                                                />
                                                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                                    <Button size="small" variant="text" onClick={() => handleRetranscribirAudio(evento._id)} disabled={retranscribiendoEvento === evento._id}>
                                                                        {retranscribiendoEvento === evento._id ? 'Retranscribiendo...' : 'Re-transcribir'}
                                                                    </Button>
                                                                    {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                        <Button size="small" variant="text" onClick={() => handleReanalizarAudio(evento._id)} disabled={reanalizandoEvento === evento._id}>
                                                                            {reanalizandoEvento === evento._id ? 'Analizando...' : 'Re-analizar IA'}
                                                                        </Button>
                                                                    )}
                                                                </Stack>
                                                                {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                                                                        📝 {evento.transcripcion || evento.metadata?.transcripcion}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        )}
                                                        {evento.nota && (
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5, whiteSpace: 'pre-line' }}>
                                                                "{evento.nota}"
                                                            </Typography>
                                                        )}
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(evento.createdAt).toLocaleString('es-AR', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })}
                                            {historial.length > 10 && (
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    onClick={() => setMostrarTodosEventos(!mostrarTodosEventos)}
                                                    sx={{ alignSelf: 'center' }}
                                                >
                                                    {mostrarTodosEventos 
                                                        ? 'Ver menos' 
                                                        : `+${historial.length - 10} eventos más`
                                                    }
                                                </Button>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            </Collapse>
                        </Paper>
                    </Box>

                    {/* ========== BARRA STICKY INFERIOR - CTA PRINCIPAL ========== */}
                    <Box sx={{ 
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 2, 
                        bgcolor: 'white',
                        borderTop: 1, 
                        borderColor: 'divider',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                        pb: 'calc(env(safe-area-inset-bottom) + 16px)',
                        zIndex: 1300
                    }}>
                        {/* Botón principal: REGISTRAR ACCIÓN */}
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={handleAbrirRegistrarAccion}
                            sx={{ 
                                py: 2,
                                borderRadius: 3,
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                mb: contactos.length > 1 ? 1.5 : 0
                            }}
                        >
                            Registrar Acción
                        </Button>
                        
                        {/* Navegación */}
                        {contactos.length > 1 && (
                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ChevronLeftIcon />}
                                    onClick={() => handleNavegar('anterior')}
                                    disabled={!puedeAnterior}
                                    sx={{ borderRadius: 2, py: 1 }}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="primary"
                                    endIcon={<NavigateNextIcon />}
                                    onClick={() => handleNavegar('siguiente')}
                                    disabled={!puedeSiguiente}
                                    sx={{ borderRadius: 2, py: 1 }}
                                >
                                    Siguiente
                                </Button>
                            </Stack>
                        )}
                    </Box>
                </Box>

                {/* Modal de confirmación de próximo contacto */}
                <Dialog 
                    open={modalProximoContacto.open} 
                    onClose={() => setModalProximoContacto({ open: false, direccion: null, nuevoIndice: null })}
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 3, m: 2 } }}
                >
                    <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
                        <AccessTimeIcon color="warning" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="h6">
                            {proximoContactoLocal || contacto?.proximoContacto 
                                ? '⚠️ Próximo contacto vencido' 
                                : '¿Cuándo lo contactamos?'
                            }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {contacto?.nombre}
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={1.5}>
                            {botonesProximoContacto.map((btn) => (
                                <Button
                                    key={btn.label}
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    onClick={() => handleConfirmarNavegacion(calcularFecha(btn.cantidad, btn.unidad))}
                                    sx={{ borderRadius: 2, py: 1.5 }}
                                >
                                    {btn.label}
                                </Button>
                            ))}
                            <Divider sx={{ my: 1 }} />
                            <Button
                                fullWidth
                                variant="text"
                                color="inherit"
                                size="large"
                                onClick={() => handleConfirmarNavegacion(null)}
                            >
                                Omitir
                            </Button>
                        </Stack>
                    </DialogContent>
                </Dialog>
            </Drawer>
            
            {/* Modal Selector de Templates WhatsApp */}
            <ModalSelectorTemplate
                open={modalTemplateWhatsApp}
                onClose={() => setModalTemplateWhatsApp(false)}
                contacto={contacto}
                user={user}
                empresaId={empresaId}
                onTemplateUsed={handleTemplateUsed}
            />
            
            {/* Modal Registrar Acción */}
            <ModalRegistrarAccion
                open={modalRegistrarAccion}
                onClose={() => setModalRegistrarAccion(false)}
                contacto={contacto}
                empresaId={empresaId}
                onSuccess={handleAccionRegistrada}
                onNavegarSiguiente={handleNavegarSiguiente}
                mostrarBotonSiguiente={puedeSiguiente}
            />
            
            {/* Modal Editar Contacto - Mobile */}
            <ModalEditarContacto
                open={modalEditarContacto}
                onClose={() => setModalEditarContacto(false)}
                contacto={contactoLocal}
                empresaId={empresaId}
                onSuccess={(contactoActualizado) => {
                    // Actualizar estado local inmediatamente
                    if (contactoActualizado) {
                        setContactoLocal(contactoActualizado);
                    }
                    cargarHistorial();
                    setModalEditarContacto(false);
                    mostrarSnackbar?.('Contacto actualizado', 'success');
                    // Refrescar lista en background
                    onRefresh?.();
                }}
            />
            </>
        );
    }

    // ==================== VISTA DESKTOP ====================
    return (
        <>
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ 
                sx: { 
                    width: drawerExpandido 
                        ? { xs: '100%', sm: '100%', md: '80vw', lg: '70vw' }
                        : { xs: '100%', sm: 500, md: 550 },
                    maxWidth: '100vw',
                    transition: 'width 0.3s ease-in-out'
                } 
            }}
        >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header con navegación */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                            {contactos.length > 1 && (
                                <>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleNavegar('anterior')}
                                        disabled={!puedeAnterior}
                                    >
                                        <ChevronLeftIcon />
                                    </IconButton>
                                    <Typography variant="caption" color="text.secondary">
                                        {indiceActual + 1} / {contactos.length}
                                    </Typography>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleNavegar('siguiente')}
                                        disabled={!puedeSiguiente}
                                    >
                                        <ChevronRightIcon />
                                    </IconButton>
                                </>
                            )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {!isMobile && contactos.length > 1 && (
                                <Tooltip title="Usa ← → para navegar">
                                    <KeyboardIcon fontSize="small" color="action" />
                                </Tooltip>
                            )}
                            <Tooltip title="Refrescar datos">
                                <IconButton 
                                    onClick={() => {
                                        onRefresh?.();
                                        cargarHistorial();
                                        mostrarSnackbar?.('Datos actualizados', 'success');
                                    }}
                                    size="small"
                                >
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={drawerExpandido ? "Reducir panel" : "Expandir panel"}>
                                <IconButton 
                                    onClick={() => setDrawerExpandido(!drawerExpandido)}
                                    size="small"
                                    color={drawerExpandido ? "primary" : "default"}
                                >
                                    {drawerExpandido ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
                                </IconButton>
                            </Tooltip>
                            <IconButton onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                    </Stack>
                    
                    {/* Estado y metadatos */}
                    <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
                        <EstadoChipEditable 
                            estado={contactoLocal.estado} 
                            contactoId={contactoLocal._id}
                            onEstadoCambiado={() => {
                                onRefresh?.();
                                cargarHistorial();
                            }}
                            mostrarSnackbar={mostrarSnackbar}
                        />
                        {contactoLocal.segmento && (
                            <Chip 
                                size="small" 
                                variant="outlined"
                                label={contactoLocal.segmento === 'outbound' ? 'Outbound' : 'Inbound'} 
                            />
                        )}
                        {contactoLocal.sdrAsignadoNombre && (
                            <Chip 
                                size="small" 
                                icon={<PersonIcon />}
                                label={contactoLocal.sdrAsignadoNombre}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Stack>

                    {/* Contadores de actividad */}
                    <ContadoresActividad contadores={contactoLocal.contadores} />
                </Box>

                {/* Tabs: Info | Actividad */}
                <Tabs 
                    value={drawerTab} 
                    onChange={(_, v) => setDrawerTab(v)} 
                    sx={{ px: 2, borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
                    variant="fullWidth"
                >
                    <Tab label="Información" sx={{ minHeight: 40, py: 0 }} />
                    <Tab 
                        label={
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <span>Actividad</span>
                                {historial.length > 0 && (
                                    <Chip size="small" label={historial.length} sx={{ height: 20, fontSize: '0.7rem' }} />
                                )}
                            </Stack>
                        } 
                        sx={{ minHeight: 40, py: 0 }} 
                    />
                    <Tab 
                        label={
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                                <span>Chat</span>
                            </Stack>
                        } 
                        sx={{ minHeight: 40, py: 0 }} 
                    />
                </Tabs>

                {/* Tab 0: Información */}
                {drawerTab === 0 && (
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>

                {/* Nombre y datos principales */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box>
                            <Typography variant="h5" fontWeight={700}>
                                {contactoLocal.nombre}
                            </Typography>
                            {contactoLocal.cargo && (
                                <Typography variant="body2" color="text.secondary">
                                    {contactoLocal.cargo}
                                </Typography>
                            )}
                            {contactoLocal.empresa && (
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                                    <BusinessIcon fontSize="small" color="action" sx={{ fontSize: 16 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        {contactoLocal.empresa}
                                        {contactoLocal.tamanoEmpresa && (
                                            <Chip size="small" label={contactoLocal.tamanoEmpresa} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                        )}
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                        <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => setModalEditarContacto(true)}
                        >
                            Editar
                        </Button>
                    </Stack>

                {/* Datos de contacto */}
                    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={500}>{contactoLocal.telefono}</Typography>
                            <IconButton size="small" href={getTelLink(contactoLocal.telefono)} sx={{ p: 0.3 }}>
                                <CallIcon fontSize="small" color="success" />
                            </IconButton>
                            <IconButton size="small" href={getWhatsAppLink(contactoLocal.telefono)} target="_blank" sx={{ p: 0.3 }}>
                                <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                            </IconButton>
                        </Stack>
                        {/* Teléfonos secundarios */}
                        {contactoLocal.telefonosSecundarios?.map((tel, i) => (
                            <Stack key={i} direction="row" spacing={1} alignItems="center">
                                <PhoneIcon fontSize="small" color="action" sx={{ opacity: 0.5 }} />
                                <Typography variant="body2">
                                    {tel.numero}
                                    <Chip size="small" label={tel.etiqueta} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                </Typography>
                            </Stack>
                        ))}
                        {contactoLocal.email && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">{contactoLocal.email}</Typography>
                            </Stack>
                        )}
                    </Stack>
                    </Paper>

                    {/* Botones de contacto */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PhoneIcon />}
                            onClick={handleLlamar}
                            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' } }}
                        >
                            Llamar
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<WhatsAppIcon />}
                            onClick={handleWhatsApp}
                            sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#128C7E' } }}
                        >
                            WhatsApp
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ChatBubbleOutlineIcon />}
                            onClick={() => setDrawerTab(2)}
                        >
                            Ver chat
                        </Button>
                    </Stack>

                    {/* Scoring: Plan, Intención, Prioridad, Bot */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <TrendingUpIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2">Calificación comercial</Typography>
                            {guardandoScoring && <CircularProgress size={14} />}
                        </Stack>

                        {/* Plan Estimado */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Plan estimado
                        </Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                            {Object.entries(PLANES_SORBY).map(([key, plan]) => (
                                <Chip
                                    key={key}
                                    size="small"
                                    label={`${plan.icon} ${plan.label}`}
                                    color={contactoLocal.planEstimado === key ? plan.color : 'default'}
                                    variant={contactoLocal.planEstimado === key ? 'filled' : 'outlined'}
                                    onClick={() => handleActualizarPlan(key)}
                                    disabled={guardandoScoring}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>

                        {/* Intención de Compra */}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Intención de compra
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                            {Object.entries(INTENCIONES_COMPRA).map(([key, ic]) => (
                                <Chip
                                    key={key}
                                    size="small"
                                    label={`${ic.icon} ${ic.label}`}
                                    color={contactoLocal.intencionCompra === key ? ic.color : 'default'}
                                    variant={contactoLocal.intencionCompra === key ? 'filled' : 'outlined'}
                                    onClick={() => handleActualizarIntencion(key)}
                                    disabled={guardandoScoring}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>

                        {/* Prioridad Score + Bot */}
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            {contactoLocal.prioridadScore > 0 && (
                                <Chip
                                    size="small"
                                    label={`Prioridad: ${contactoLocal.prioridadScore}`}
                                    color={contactoLocal.prioridadScore >= 70 ? 'error' : contactoLocal.prioridadScore >= 40 ? 'warning' : 'default'}
                                    variant="filled"
                                    sx={{ fontWeight: 700 }}
                                />
                            )}
                            {contactoLocal.precalificacionBot && contactoLocal.precalificacionBot !== 'sin_calificar' && (
                                <Chip
                                    size="small"
                                    icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                                    label={PRECALIFICACION_BOT[contactoLocal.precalificacionBot]?.label || contactoLocal.precalificacionBot}
                                    color={PRECALIFICACION_BOT[contactoLocal.precalificacionBot]?.color || 'default'}
                                    variant="outlined"
                                />
                            )}
                        </Stack>
                    </Box>

                    {/* Datos del Bot (si existen) */}
                    {contactoLocal.datosBot && (contactoLocal.datosBot.rubro || contactoLocal.datosBot.interes || contactoLocal.datosBot.saludoInicial || contactoLocal.datosBot.cantidadObras) && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                <SmartToyIcon fontSize="small" color="info" />
                                <Typography variant="subtitle2" color="info.dark">Información del Bot</Typography>
                            </Stack>
                            <Stack spacing={0.8}>
                                {contactoLocal.datosBot.rubro && (
                                    <Typography variant="body2">
                                        <strong>🏗️ Rubro:</strong> {contactoLocal.datosBot.rubro}
                                    </Typography>
                                )}
                                {contactoLocal.datosBot.interes && (
                                    <Typography variant="body2">
                                        <strong>💡 Interés:</strong> {contactoLocal.datosBot.interes === 'probar' ? 'Quiere probar' : contactoLocal.datosBot.interes === 'info' ? 'Pide info' : contactoLocal.datosBot.interes === 'humano' ? 'Pide hablar con humano' : contactoLocal.datosBot.interes === 'usuario_existente' ? 'Usuario existente' : contactoLocal.datosBot.interes}
                                    </Typography>
                                )}
                                {contactoLocal.datosBot.cantidadObras && (
                                    <Typography variant="body2">
                                        <strong>📊 Cantidad de obras:</strong> {contactoLocal.datosBot.cantidadObras}
                                    </Typography>
                                )}
                                {contactoLocal.datosBot.saludoInicial && (
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'white', p: 1, borderRadius: 1, mt: 0.5 }}>
                                        💬 "{contactoLocal.datosBot.saludoInicial}"
                                    </Typography>
                                )}
                                {contactoLocal.datosBot.interaccionFecha && (
                                    <Typography variant="caption" color="text.secondary">
                                        📅 Última interacción: {new Date(contactoLocal.datosBot.interaccionFecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Typography>
                                )}
                                {contactoLocal.datosBot.empresaFirestoreId && (
                                    <Typography variant="caption" color="text.secondary">
                                        ✅ Empresa creada en onboarding
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    )}

                    {/* Próxima Tarea — Editor compacto */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2">Próxima tarea</Typography>
                            {guardandoProximo && <CircularProgress size={14} />}
                        </Stack>
                        
                        {/* Modo vista */}
                        {proximoContactoLocal && !editandoTarea ? (
                            <Box>
                                <Stack spacing={0.5} sx={{ mb: 1 }}>
                                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                        {contacto?.proximaTarea?.tipo && (
                                            <Chip size="small"
                                                label={contacto.proximaTarea.tipo === 'llamada' ? '📞 Llamar' : contacto.proximaTarea.tipo === 'whatsapp' ? '💬 WA' : contacto.proximaTarea.tipo === 'email' ? '✉️ Email' : '📝'}
                                                color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22 }} />
                                        )}
                                        <Chip size="small" icon={<ScheduleIcon />}
                                            label={proximoInfo?.texto || 'Programado'}
                                            color={proximoInfo?.color === 'error' ? 'error' : proximoInfo?.color === 'warning' ? 'warning' : 'success'} />
                                    </Stack>
                                    {contacto?.proximaTarea?.nota && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.65rem' }}>
                                            💬 {contacto.proximaTarea.nota}
                                        </Typography>
                                    )}
                                </Stack>
                                <Stack direction="row" spacing={0.5}>
                                    <Button size="small" variant="outlined"
                                        onClick={() => {
                                            setEditandoTarea(true);
                                            setEditTareaTipo(contacto?.proximaTarea?.tipo || null);
                                            setEditTareaFecha(proximoContactoLocal ? new Date(proximoContactoLocal) : null);
                                            setEditTareaNota(contacto?.proximaTarea?.nota || '');
                                        }}
                                        sx={{ fontSize: '0.65rem', textTransform: 'none' }}>✏️ Modificar</Button>
                                    <Button size="small" variant="outlined" color="error"
                                        onClick={() => handleGuardarProximoContacto(null)} disabled={guardandoProximo}
                                        sx={{ fontSize: '0.65rem', textTransform: 'none', minWidth: 'auto' }}>🗑️</Button>
                                </Stack>
                            </Box>
                        ) : !editandoTarea ? (
                            <Button size="small" variant="outlined" color="primary"
                                onClick={() => { setEditandoTarea(true); setEditTareaTipo(null); setEditTareaFecha(null); setEditTareaNota(''); }}
                                sx={{ mb: 1, textTransform: 'none', fontSize: '0.7rem' }}>+ Crear tarea</Button>
                        ) : null}

                        {/* Editor */}
                        {editandoTarea && (
                            <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: (editTareaTipo && editTareaFecha) ? 'success.light' : 'warning.light' }}>
                                <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                                    {TIPOS_TAREA.map((t) => (
                                        <Chip key={t.key} size="small"
                                            icon={<span style={{ fontSize: '0.8rem' }}>{t.icon}</span>}
                                            label={t.label}
                                            color={editTareaTipo === t.key ? 'primary' : 'default'}
                                            variant={editTareaTipo === t.key ? 'filled' : 'outlined'}
                                            onClick={() => setEditTareaTipo(t.key)}
                                            sx={{ cursor: 'pointer', fontSize: '0.65rem' }} />
                                    ))}
                                </Stack>
                                {editTareaFecha && (
                                    <Chip size="small"
                                        label={`📅 ${new Date(editTareaFecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} ${new Date(editTareaFecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                                        color="success" onDelete={() => setEditTareaFecha(null)} sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.7rem' }} />
                                )}
                                {!editTareaFecha && (
                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                        {botonesProximoContacto.map((btn) => (
                                            <Button key={btn.label} size="small" variant="outlined"
                                                onClick={() => setEditTareaFecha(calcularFecha(btn.cantidad, btn.unidad))}
                                                sx={{ minWidth: 'auto', px: 0.8, py: 0.2, fontSize: '0.65rem', textTransform: 'none' }}>{btn.label}</Button>
                                        ))}
                                    </Stack>
                                )}
                                {/* Inputs separados fecha + hora: siempre visibles */}
                                {(() => {
                                    const partes = fechaParaInput(editTareaFecha).split('T');
                                    const fechaVal = partes[0] || '';
                                    const horaVal = partes[1] || '09:00';
                                    return (
                                        <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
                                            <input type="date" value={fechaVal}
                                                onChange={(e) => { const d = e.target.value; if (d) setEditTareaFecha(new Date(`${d}T${horaVal}`)); }}
                                                style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', flex: 1, boxSizing: 'border-box' }} />
                                            <input type="time" value={horaVal}
                                                onChange={(e) => {
                                                    const t = e.target.value;
                                                    if (!t) return;
                                                    if (fechaVal) { setEditTareaFecha(new Date(`${fechaVal}T${t}`)); }
                                                    else { const hoy = new Date(); const pad = n => String(n).padStart(2, '0'); setEditTareaFecha(new Date(`${hoy.getFullYear()}-${pad(hoy.getMonth()+1)}-${pad(hoy.getDate())}T${t}`)); }
                                                }}
                                                style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', width: 76, boxSizing: 'border-box' }} />
                                        </Stack>
                                    );
                                })()}
                                <input type="text" placeholder="Comentario (opcional)..."
                                    value={editTareaNota} onChange={(e) => setEditTareaNota(e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, border: '1px solid #ccc', width: '100%', boxSizing: 'border-box', marginTop: 4 }} />
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Button variant="contained" size="small" color="success"
                                        disabled={!editTareaTipo || !editTareaFecha || guardandoProximo}
                                        onClick={() => handleGuardarProximaTarea(editTareaTipo, editTareaFecha, editTareaNota)}
                                        sx={{ flex: 1, textTransform: 'none', fontSize: '0.7rem' }}>
                                        {guardandoProximo ? <CircularProgress size={16} color="inherit" /> : '💾 Guardar'}
                                    </Button>
                                    <Button variant="outlined" size="small"
                                        onClick={() => { setEditandoTarea(false); setEditTareaTipo(null); setEditTareaFecha(null); setEditTareaNota(''); }}
                                        sx={{ textTransform: 'none', fontSize: '0.7rem' }}>Cancelar</Button>
                                </Stack>
                            </Box>
                        )}
                    </Box>
                    
                    {/* Botón Siguiente contacto prominente */}
                    {contactos.length > 1 && puedeSiguiente && (
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            endIcon={<ChevronRightIcon />}
                            onClick={() => handleNavegar('siguiente')}
                            sx={{ mt: 2 }}
                        >
                            Siguiente contacto
                        </Button>
                    )}
                </Box>
                )}

                {/* Tab 1: Actividad (Acciones + Comentario + Historial) */}
                {drawerTab === 1 && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Acciones rápidas */}
                <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Registrar acción
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Tooltip title="Llamada atendida">
                            <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => onAccion?.(contacto, 'llamada', true)}
                            >
                                <PhoneIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                        <Tooltip title="Llamada no atendida">
                            <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                onClick={() => onAccion?.(contacto, 'llamada', false)}
                            >
                                <PhoneMissedIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                        <Tooltip title="WhatsApp enviado">
                            <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => onAccion?.(contacto, 'whatsapp')}
                            >
                                <WhatsAppIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                        <Tooltip title="Agendar reunión">
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => onAccion?.(contacto, 'reunion')}
                            >
                                <EventIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                        <Tooltip title="No responde">
                            <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                onClick={() => onAccion?.(contacto, 'no_responde')}
                            >
                                <PhoneMissedIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                        <Tooltip title="No califica">
                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                    const motivo = window.prompt('Motivo por el que no califica:');
                                    if (motivo) onMarcarNoCalifica?.(contacto, motivo);
                                }}
                            >
                                <DoNotDisturbIcon fontSize="small" />
                            </Button>
                        </Tooltip>
                    </Stack>
                </Box>

                <Divider />

                {/* Agregar comentario */}
                <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Agregar comentario
                    </Typography>
                    <Stack direction="row" spacing={1}>
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
                </Box>

                <Divider />

                {/* Historial con colores */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Historial ({historial.length})
                    </Typography>
                    
                    {loadingHistorial ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : historial.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Sin historial aún
                        </Typography>
                    ) : (
                        <Stack spacing={1.5}>
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
                                                {(evento.audioUrl || evento.metadata?.audioUrl) && (
                                                    <Box sx={{ mt: 1 }}>
                                                        <audio 
                                                            controls 
                                                            src={evento.audioUrl || evento.metadata?.audioUrl} 
                                                            style={{ width: '100%', height: 32 }} 
                                                            preload="none"
                                                        />
                                                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                            <Button size="small" variant="text" onClick={() => handleRetranscribirAudio(evento._id)} disabled={retranscribiendoEvento === evento._id}>
                                                                {retranscribiendoEvento === evento._id ? 'Retranscribiendo...' : 'Re-transcribir'}
                                                            </Button>
                                                            {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                                <Button size="small" variant="text" onClick={() => handleReanalizarAudio(evento._id)} disabled={reanalizandoEvento === evento._id}>
                                                                    {reanalizandoEvento === evento._id ? 'Analizando...' : 'Re-analizar IA'}
                                                                </Button>
                                                            )}
                                                        </Stack>
                                                        {(evento.transcripcion || evento.metadata?.transcripcion) && (
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', lineHeight: 1.3 }}>
                                                                📝 {evento.transcripcion || evento.metadata?.transcripcion}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                                {evento.nota && (
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                        sx={{ mt: 0.5, fontStyle: 'italic', whiteSpace: 'pre-line' }}
                                                    >
                                                        "{evento.nota}"
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
                </Box>
                </Box>
                )}

                {/* Tab 2: Conversación */}
                {drawerTab === 2 && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <MiniChatViewer telefono={contactoLocal?.telefono} />
                </Box>
                )}
            </Box>

            {/* Modal de confirmación de próximo contacto */}
            <Dialog 
                open={modalProximoContacto.open} 
                onClose={() => setModalProximoContacto({ open: false, direccion: null, nuevoIndice: null })}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon color="warning" />
                        <Typography>
                            {proximoContactoLocal || contacto?.proximoContacto 
                                ? '⚠️ Próximo contacto vencido' 
                                : '¿Cuándo lo contactamos?'
                            }
                        </Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {proximoContactoLocal || contacto?.proximoContacto 
                            ? `El próximo contacto de ${contacto?.nombre} está vencido. ¿Cuándo debemos volver a contactarlo?`
                            : `No definiste un próximo contacto para ${contacto?.nombre}. ¿Cuándo debemos volver a contactarlo?`
                        }
                    </Typography>
                    <Stack spacing={1}>
                        {botonesProximoContacto.map((btn) => (
                            <Button
                                key={btn.label}
                                fullWidth
                                variant="outlined"
                                startIcon={<ScheduleIcon />}
                                onClick={() => handleConfirmarNavegacion(calcularFecha(btn.cantidad, btn.unidad))}
                            >
                                {btn.label}
                            </Button>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Button
                            fullWidth
                            variant="text"
                            color="inherit"
                            onClick={() => handleConfirmarNavegacion(null)}
                        >
                            Omitir por ahora
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </Drawer>
        
        {/* Modal Selector de Templates WhatsApp - Desktop */}
        <ModalSelectorTemplate
            open={modalTemplateWhatsApp}
            onClose={() => setModalTemplateWhatsApp(false)}
            contacto={contacto}
            user={user}
            empresaId={empresaId}
            onTemplateUsed={handleTemplateUsed}
        />
        
        {/* Modal Registrar Acción - Desktop */}
        <ModalRegistrarAccion
            open={modalRegistrarAccion}
            onClose={() => setModalRegistrarAccion(false)}
            contacto={contacto}
            empresaId={empresaId}
            onSuccess={handleAccionRegistrada}
            onNavegarSiguiente={handleNavegarSiguiente}
            mostrarBotonSiguiente={puedeSiguiente}
        />
        
        {/* Modal Editar Contacto */}
        <ModalEditarContacto
            open={modalEditarContacto}
            onClose={() => setModalEditarContacto(false)}
            contacto={contactoLocal}
            empresaId={empresaId}
            onSuccess={(contactoActualizado) => {
                // Actualizar estado local inmediatamente
                if (contactoActualizado) {
                    setContactoLocal(contactoActualizado);
                }
                cargarHistorial();
                setModalEditarContacto(false);
                mostrarSnackbar?.('Contacto actualizado', 'success');
                // Refrescar lista en background
                onRefresh?.();
            }}
        />
        </>
    );
};

// ==================== MODAL EDITAR CONTACTO ====================
export const ModalEditarContacto = ({ open, onClose, contacto, empresaId, onSuccess }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        empresa: '',
        cargo: '',
        tamanoEmpresa: '',
        rubro: '',
        telefonosSecundarios: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Sincronizar con contacto cuando se abre
    useEffect(() => {
        if (open && contacto) {
            setFormData({
                nombre: contacto.nombre || '',
                telefono: contacto.telefono || '',
                email: contacto.email || '',
                empresa: contacto.empresa || '',
                cargo: contacto.cargo || '',
                tamanoEmpresa: contacto.tamanoEmpresa || '',
                rubro: contacto.rubro || '',
                telefonosSecundarios: contacto.telefonosSecundarios || []
            });
            setError(null);
        }
    }, [open, contacto]);
    
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleAgregarTelefono = () => {
        setFormData(prev => ({
            ...prev,
            telefonosSecundarios: [...prev.telefonosSecundarios, { numero: '', etiqueta: 'Secundario' }]
        }));
    };
    
    const handleTelefonoSecundarioChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            telefonosSecundarios: prev.telefonosSecundarios.map((tel, i) => 
                i === index ? { ...tel, [field]: value } : tel
            )
        }));
    };
    
    const handleEliminarTelefono = (index) => {
        setFormData(prev => ({
            ...prev,
            telefonosSecundarios: prev.telefonosSecundarios.filter((_, i) => i !== index)
        }));
    };
    
    const handleGuardar = async () => {
        if (!formData.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }
        if (!formData.telefono.trim()) {
            setError('El teléfono principal es requerido');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            // Filtrar teléfonos secundarios vacíos
            const telefonosLimpios = formData.telefonosSecundarios.filter(t => t.numero.trim());
            
            const contactoActualizado = await SDRService.actualizarContacto(contacto._id, {
                ...formData,
                telefonosSecundarios: telefonosLimpios,
                empresaId
            });
            
            // Pasar el contacto actualizado al callback
            onSuccess?.(contactoActualizado);
        } catch (err) {
            console.error('Error actualizando contacto:', err);
            setError(err.response?.data?.error || 'Error al actualizar');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            fullWidth
            fullScreen={isMobile}
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">Editar contacto</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    {error && (
                        <Typography color="error" variant="body2">{error}</Typography>
                    )}
                    
                    {/* Datos básicos */}
                    <TextField
                        fullWidth
                        label="Nombre *"
                        value={formData.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        size="small"
                    />
                    
                    <TextField
                        fullWidth
                        label="Teléfono principal *"
                        value={formData.telefono}
                        onChange={(e) => handleChange('telefono', e.target.value)}
                        size="small"
                    />
                    
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        size="small"
                    />
                    
                    <Stack direction="row" spacing={2}>
                        <TextField
                            fullWidth
                            label="Empresa"
                            value={formData.empresa}
                            onChange={(e) => handleChange('empresa', e.target.value)}
                            size="small"
                        />
                        <TextField
                            fullWidth
                            label="Cargo"
                            value={formData.cargo}
                            onChange={(e) => handleChange('cargo', e.target.value)}
                            size="small"
                        />
                    </Stack>
                    
                    <FormControl fullWidth size="small">
                        <InputLabel>Tamaño de empresa</InputLabel>
                        <Select
                            value={formData.tamanoEmpresa}
                            label="Tamaño de empresa"
                            onChange={(e) => handleChange('tamanoEmpresa', e.target.value)}
                        >
                            {TAMANO_EMPRESA_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                        <InputLabel>Tipo de negocio</InputLabel>
                        <Select
                            value={RUBRO_OPTIONS.some(o => o.value === formData.rubro) ? formData.rubro : ''}
                            label="Tipo de negocio"
                            onChange={(e) => handleChange('rubro', e.target.value)}
                        >
                            {RUBRO_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    {/* Teléfonos secundarios */}
                    <Divider sx={{ my: 1 }} />
                    <Box>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2">Teléfonos secundarios</Typography>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={handleAgregarTelefono}
                            >
                                Agregar
                            </Button>
                        </Stack>
                        
                        {formData.telefonosSecundarios.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                Sin teléfonos secundarios
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {formData.telefonosSecundarios.map((tel, index) => (
                                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                                        <TextField
                                            size="small"
                                            placeholder="Número"
                                            value={tel.numero}
                                            onChange={(e) => handleTelefonoSecundarioChange(index, 'numero', e.target.value)}
                                            sx={{ flex: 2 }}
                                        />
                                        <TextField
                                            size="small"
                                            placeholder="Etiqueta"
                                            value={tel.etiqueta}
                                            onChange={(e) => handleTelefonoSecundarioChange(index, 'etiqueta', e.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <IconButton 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleEliminarTelefono(index)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleGuardar}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DrawerDetalleContactoSDR;
