import { useState, useEffect } from 'react';
import {
    Drawer, Box, Typography, IconButton, Divider, Chip, Stack,
    Button, TextField, CircularProgress, Paper, Tooltip, Avatar, useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions, Collapse, Fab, Badge,
    Menu, MenuItem, ListItemIcon, ListItemText, Select, FormControl, InputLabel
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
    Refresh as RefreshIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';
import ModalSelectorTemplate from './ModalSelectorTemplate';
import ModalRegistrarAccion from './ModalRegistrarAccion';
import { getWhatsAppLink, getTelLink } from '../../utils/phoneUtils';

// Opciones de tamaño de empresa
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
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

// ==================== CHIP DE ESTADO (EXPORT NAMED) ====================

// Configuración de estados
const ESTADOS_CONFIG = {
    'nuevo': { color: 'info', label: 'Nuevo', icon: <NewIcon fontSize="small" /> },
    'en_gestion': { color: 'warning', label: 'En Gestión', icon: <WorkIcon fontSize="small" /> },
    'meet': { color: 'secondary', label: 'Reunión', icon: <MeetIcon fontSize="small" /> },
    'calificado': { color: 'success', label: 'Calificado', icon: <VerifiedIcon fontSize="small" /> },
    'no_califica': { color: 'error', label: 'No Califica', icon: <BlockIcon fontSize="small" /> },
    'no_responde': { color: 'default', label: 'No Responde', icon: <PhoneDisabledIcon fontSize="small" /> },
};

export const EstadoChip = ({ estado }) => {
    const { color, label } = ESTADOS_CONFIG[estado] || { color: 'default', label: estado };
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
    
    // Modales nuevos
    const [modalTemplateWhatsApp, setModalTemplateWhatsApp] = useState(false);
    const [modalRegistrarAccion, setModalRegistrarAccion] = useState(false);
    const [modalEditarContacto, setModalEditarContacto] = useState(false);
    
    // Estado para historial expandido
    const [mostrarTodosEventos, setMostrarTodosEventos] = useState(false);
    
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

    // ==================== PRÓXIMO CONTACTO ====================
    
    // Calcular fecha de próximo contacto
    const calcularFecha = (cantidad, unidad) => {
        const fecha = new Date();
        if (unidad === 'horas') {
            fecha.setHours(fecha.getHours() + cantidad);
        } else if (unidad === 'dias') {
            fecha.setDate(fecha.getDate() + cantidad);
        }
        return fecha;
    };

    // Guardar próximo contacto
    const handleGuardarProximoContacto = async (fecha) => {
        if (!contactoLocal?._id) return;
        setGuardandoProximo(true);
        try {
            await SDRService.actualizarProximoContacto(contactoLocal._id, fecha);
            setProximoContactoLocal(fecha);
            mostrarSnackbar?.('Próximo contacto actualizado', 'success');
            onRefresh?.();
            await cargarHistorial();
        } catch (err) {
            console.error('Error guardando próximo contacto:', err);
            mostrarSnackbar?.('Error al actualizar', 'error');
        } finally {
            setGuardandoProximo(false);
        }
    };

    // Botones rápidos de próximo contacto
    const botonesProximoContacto = [
        { label: '1h', cantidad: 1, unidad: 'horas' },
        { label: '3h', cantidad: 3, unidad: 'horas' },
        { label: '24h', cantidad: 24, unidad: 'horas' },
        { label: '3 días', cantidad: 3, unidad: 'dias' },
        { label: '1 sem', cantidad: 7, unidad: 'dias' },
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
        // Formato: YYYY-MM-DDTHH:mm
        return d.toISOString().slice(0, 16);
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
                    {/* Header compacto */}
                    <Box sx={{ 
                        p: 2, 
                        bgcolor: 'white',
                        borderBottom: 1, 
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight={700} noWrap>
                                {contactoLocal.nombre}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <EstadoChipEditable 
                                    estado={contactoLocal.estado} 
                                    contactoId={contactoLocal._id}
                                    onEstadoCambiado={() => {
                                        onRefresh?.();
                                        cargarHistorial();
                                    }}
                                    mostrarSnackbar={mostrarSnackbar}
                                />
                                {contactoLocal.empresa && (
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        • {contactoLocal.empresa}
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                        {contactos.length > 1 && (
                            <Chip 
                                size="small" 
                                label={`${indiceActual + 1}/${contactos.length}`}
                                sx={{ mr: 1 }}
                            />
                        )}
                        <Tooltip title="Refrescar datos">
                            <IconButton 
                                onClick={() => {
                                    onRefresh?.();
                                    cargarHistorial();
                                    mostrarSnackbar?.('Datos actualizados', 'success');
                                }}
                                size="small"
                                sx={{ mr: 0.5 }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <IconButton onClick={onClose} edge="end">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Contenido scrolleable */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2, pb: 20 }}>
                        
                        {/* Card principal de contacto */}
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3 }}>
                            {/* Botones grandes de acción - LLAMAR y WHATSAPP */}
                            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={<PhoneIcon />}
                                    onClick={handleLlamar}
                                    sx={{ 
                                        py: 2,
                                        bgcolor: '#4caf50', 
                                        '&:hover': { bgcolor: '#388e3c' },
                                        borderRadius: 2,
                                        fontSize: '1rem'
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
                                        py: 2,
                                        bgcolor: '#25D366', 
                                        '&:hover': { bgcolor: '#128C7E' },
                                        borderRadius: 2,
                                        fontSize: '1rem'
                                    }}
                                >
                                    WhatsApp
                                </Button>
                            </Stack>

                            {/* Info de contacto con botón editar */}
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Información
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => setModalEditarContacto(true)}
                                    >
                                        Editar
                                    </Button>
                                </Stack>
                                <Stack spacing={0.5}>
                                    <Typography variant="body1" fontWeight={500}>
                                        📞 {contactoLocal.telefono}
                                    </Typography>
                                    {/* Teléfonos secundarios */}
                                    {contactoLocal.telefonosSecundarios?.map((tel, i) => (
                                        <Typography key={i} variant="body2" color="text.secondary">
                                            📱 {tel.numero} <Chip size="small" label={tel.etiqueta} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                        </Typography>
                                    ))}
                                    {contactoLocal.cargo && (
                                        <Typography variant="body2" color="text.secondary">
                                            👤 {contactoLocal.cargo}
                                        </Typography>
                                    )}
                                    {(contactoLocal.empresa || contactoLocal.tamanoEmpresa) && (
                                        <Typography variant="body2" color="text.secondary">
                                            🏢 {contactoLocal.empresa || 'Sin empresa'}
                                            {contactoLocal.tamanoEmpresa && (
                                                <Chip size="small" label={contactoLocal.tamanoEmpresa} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                            )}
                                        </Typography>
                                    )}
                                    {contactoLocal.email && (
                                        <Typography variant="body2" color="text.secondary">
                                            ✉️ {contactoLocal.email}
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </Paper>

                        {/* Próximo contacto */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <AccessTimeIcon color="action" fontSize="small" />
                                    <Typography variant="subtitle2">Próximo contacto</Typography>
                                </Stack>
                                {guardandoProximo && <CircularProgress size={16} />}
                            </Stack>
                            
                            {proximoContactoLocal ? (
                                <Chip
                                    icon={<ScheduleIcon />}
                                    label={proximoInfo?.texto || 'Programado'}
                                    color={proximoInfo?.color === 'error' ? 'error' : proximoInfo?.color === 'warning' ? 'warning' : 'success'}
                                    onDelete={() => handleGuardarProximoContacto(null)}
                                    sx={{ mb: 1.5 }}
                                />
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Sin definir
                                </Typography>
                            )}
                            
                            {/* Botones rápidos */}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                                {botonesProximoContacto.map((btn) => (
                                    <Chip
                                        key={btn.label}
                                        label={btn.label}
                                        size="small"
                                        variant={proximoContactoLocal ? 'outlined' : 'filled'}
                                        color="primary"
                                        onClick={() => handleGuardarProximoContacto(calcularFecha(btn.cantidad, btn.unidad))}
                                        disabled={guardandoProximo}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                ))}
                            </Stack>
                            
                            {/* Selector de fecha/hora específica */}
                            <TextField
                                type="datetime-local"
                                size="small"
                                fullWidth
                                label="Fecha y hora específica"
                                value={fechaParaInput(proximoContactoLocal)}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleGuardarProximoContacto(new Date(e.target.value));
                                    }
                                }}
                                disabled={guardandoProximo}
                                InputLabelProps={{ 
                                    shrink: true,
                                    sx: { 
                                        bgcolor: 'white', 
                                        px: 0.5,
                                        ml: -0.5
                                    }
                                }}
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: 2,
                                        bgcolor: 'grey.50'
                                    },
                                    '& .MuiOutlinedInput-input': {
                                        pt: 1.5
                                    }
                                }}
                            />
                        </Paper>

                        {/* Comentario rápido */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Agregar nota rápida..."
                                    value={nuevoComentario}
                                    onChange={(e) => setNuevoComentario(e.target.value)}
                                    disabled={enviandoComentario}
                                    sx={{ 
                                        '& .MuiOutlinedInput-root': { 
                                            borderRadius: 2,
                                            bgcolor: 'grey.50'
                                        }
                                    }}
                                />
                                <IconButton 
                                    color="primary"
                                    onClick={handleEnviarComentario}
                                    disabled={!nuevoComentario.trim() || enviandoComentario}
                                >
                                    {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                                </IconButton>
                            </Stack>
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
                                                        {evento.nota && (
                                                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
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
                    width: { xs: '100%', sm: 500, md: 550 },
                    maxWidth: '100vw'
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
                            <IconButton onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                    </Stack>
                    
                    {/* Nombre y estado */}
                    <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
                        {contactoLocal.nombre}
                    </Typography>
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
                </Box>

                {/* Info del contacto */}
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Información</Typography>
                        <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => setModalEditarContacto(true)}
                        >
                            Editar
                        </Button>
                    </Stack>
                    <Stack spacing={1.5}>
                        {(contactoLocal.empresa || contactoLocal.tamanoEmpresa) && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <BusinessIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                    {contactoLocal.empresa || 'Sin empresa'}
                                    {contactoLocal.tamanoEmpresa && (
                                        <Chip size="small" label={contactoLocal.tamanoEmpresa} sx={{ ml: 0.5, height: 18, fontSize: '0.7rem' }} />
                                    )}
                                </Typography>
                            </Stack>
                        )}
                        {contactoLocal.cargo && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <PersonIcon fontSize="small" color="action" />
                                <Typography variant="body2">{contactoLocal.cargo}</Typography>
                            </Stack>
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">{contactoLocal.telefono}</Typography>
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

                    {/* Botones de contacto */}
                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
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
                    </Stack>

                    {/* Próximo Contacto */}
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2">Próximo contacto</Typography>
                            {guardandoProximo && <CircularProgress size={14} />}
                        </Stack>
                        
                        {proximoContactoLocal ? (
                            <Chip
                                size="small"
                                icon={<ScheduleIcon />}
                                label={proximoInfo?.texto || 'Programado'}
                                color={proximoInfo?.color === 'error' ? 'error' : proximoInfo?.color === 'warning' ? 'warning' : 'success'}
                                onDelete={() => handleGuardarProximoContacto(null)}
                                sx={{ mb: 1 }}
                            />
                        ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                No definido
                            </Typography>
                        )}
                        
                        {/* Botones rápidos */}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                            {botonesProximoContacto.map((btn) => (
                                <Button
                                    key={btn.label}
                                    size="small"
                                    variant={proximoContactoLocal ? 'text' : 'outlined'}
                                    onClick={() => handleGuardarProximoContacto(calcularFecha(btn.cantidad, btn.unidad))}
                                    disabled={guardandoProximo}
                                    sx={{ 
                                        minWidth: 'auto', 
                                        px: 1,
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    {btn.label}
                                </Button>
                            ))}
                        </Stack>
                        
                        {/* Selector de fecha/hora específica */}
                        <TextField
                            type="datetime-local"
                            size="small"
                            fullWidth
                            label="Elegir fecha/hora"
                            value={fechaParaInput(proximoContactoLocal)}
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleGuardarProximoContacto(new Date(e.target.value));
                                }
                            }}
                            disabled={guardandoProximo}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mt: 1 }}
                        />
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

                <Divider />

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
                                                {evento.nota && (
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                        sx={{ mt: 0.5, fontStyle: 'italic' }}
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
const ModalEditarContacto = ({ open, onClose, contacto, empresaId, onSuccess }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        empresa: '',
        cargo: '',
        tamanoEmpresa: '',
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
