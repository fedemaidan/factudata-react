import { useState, useEffect } from 'react';
import {
    Drawer, Box, Typography, IconButton, Divider, Chip, Stack,
    Button, TextField, CircularProgress, Paper, Tooltip, Avatar, useMediaQuery, useTheme,
    Dialog, DialogTitle, DialogContent, DialogActions, Collapse, Fab, Badge
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
    Call as CallIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

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
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

// ==================== CHIP DE ESTADO (EXPORT NAMED) ====================

export const EstadoChip = ({ estado }) => {
    const config = {
        'nuevo': { color: 'info', label: 'Nuevo' },
        'en_gestion': { color: 'warning', label: 'En Gestión' },
        'meet': { color: 'secondary', label: 'Reunión' },
        'calificado': { color: 'success', label: 'Calificado' },
        'no_califica': { color: 'error', label: 'No Califica' },
        'no_responde': { color: 'default', label: 'No Responde' },
    };
    const { color, label } = config[estado] || { color: 'default', label: estado };
    return <Chip size="small" color={color} label={label} />;
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
}) => {
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [enviandoComentario, setEnviandoComentario] = useState(false);
    
    // Estado para próximo contacto
    const [proximoContactoLocal, setProximoContactoLocal] = useState(null);
    const [guardandoProximo, setGuardandoProximo] = useState(false);
    const [modalProximoContacto, setModalProximoContacto] = useState({ open: false, direccion: null });
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Sincronizar próximo contacto con el contacto actual
    useEffect(() => {
        if (contacto?.proximoContacto) {
            setProximoContactoLocal(new Date(contacto.proximoContacto));
        } else {
            setProximoContactoLocal(null);
        }
    }, [contacto?._id, contacto?.proximoContacto]);

    // Cargar historial cuando cambia el contacto o historialVersion
    useEffect(() => {
        if (open && contacto?._id) {
            cargarHistorial();
        }
    }, [open, contacto?._id, historialVersion]);

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
        if (!contacto?._id) return;
        setLoadingHistorial(true);
        try {
            const data = await SDRService.obtenerHistorial(contacto._id);
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

    // Abrir WhatsApp
    const handleWhatsApp = () => {
        const tel = formatTelefono(contacto?.telefono);
        if (!tel) return;
        const mensaje = encodeURIComponent(
            `¡Hola ${contacto.nombre}! Soy de Sorby, ¿cómo estás?`
        );
        window.open(`https://wa.me/${tel}?text=${mensaje}`, '_blank');
    };

    // Llamar
    const handleLlamar = () => {
        const tel = formatTelefono(contacto?.telefono);
        if (!tel) return;
        window.open(`tel:${tel}`, '_self');
    };

    // Agregar comentario
    const handleEnviarComentario = async () => {
        if (!nuevoComentario.trim() || !contacto?._id) return;
        setEnviandoComentario(true);
        try {
            const success = await onAgregarComentario?.(contacto._id, nuevoComentario.trim());
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
        if (!contacto?._id) return;
        setGuardandoProximo(true);
        try {
            await SDRService.actualizarProximoContacto(contacto._id, fecha);
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

    if (!contacto) return null;

    // Info de próximo contacto formateada
    const proximoInfo = formatearProximoContacto(proximoContactoLocal || contacto?.proximoContacto);

    // ==================== VISTA MOBILE ====================
    if (isMobile) {
        return (
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
                                {contacto.nombre}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                                <EstadoChip estado={contacto.estado} />
                                {contacto.empresa && (
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        • {contacto.empresa}
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
                        <IconButton onClick={onClose} edge="end">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Contenido scrolleable */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        
                        {/* Card principal de contacto */}
                        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3 }}>
                            {/* Botones grandes de acción */}
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

                            {/* Info de contacto */}
                            <Stack spacing={1} sx={{ mb: 2 }}>
                                <Typography variant="body1" fontWeight={500}>
                                    📞 {contacto.telefono}
                                </Typography>
                                {contacto.cargo && (
                                    <Typography variant="body2" color="text.secondary">
                                        👤 {contacto.cargo}
                                    </Typography>
                                )}
                                {contacto.email && (
                                    <Typography variant="body2" color="text.secondary">
                                        ✉️ {contacto.email}
                                    </Typography>
                                )}
                            </Stack>
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
                                InputLabelProps={{ shrink: true }}
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: 2,
                                        bgcolor: 'grey.50'
                                    }
                                }}
                            />
                        </Paper>

                        {/* Registrar acción - Colapsable */}
                        <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}>
                            <Box 
                                onClick={() => setMostrarAcciones(!mostrarAcciones)}
                                sx={{ 
                                    p: 2, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    '&:active': { bgcolor: 'grey.100' }
                                }}
                            >
                                <Typography variant="subtitle2">Registrar acción</Typography>
                                {mostrarAcciones ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Box>
                            <Collapse in={mostrarAcciones}>
                                <Box sx={{ px: 2, pb: 2 }}>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Chip 
                                            icon={<PhoneIcon />} 
                                            label="Atendió" 
                                            color="success" 
                                            onClick={() => onAccion?.(contacto, 'llamada', true)}
                                        />
                                        <Chip 
                                            icon={<PhoneMissedIcon />} 
                                            label="No atendió" 
                                            color="warning"
                                            onClick={() => onAccion?.(contacto, 'llamada', false)}
                                        />
                                        <Chip 
                                            icon={<WhatsAppIcon />} 
                                            label="WhatsApp" 
                                            color="info"
                                            onClick={() => onAccion?.(contacto, 'whatsapp')}
                                        />
                                        <Chip 
                                            icon={<EventIcon />} 
                                            label="Reunión" 
                                            color="primary"
                                            onClick={() => onAccion?.(contacto, 'reunion')}
                                        />
                                        <Chip 
                                            icon={<PhoneMissedIcon />} 
                                            label="No responde" 
                                            variant="outlined"
                                            onClick={() => onAccion?.(contacto, 'no_responde')}
                                        />
                                        <Chip 
                                            icon={<DoNotDisturbIcon />} 
                                            label="No califica" 
                                            color="error"
                                            variant="outlined"
                                            onClick={() => {
                                                const motivo = window.prompt('Motivo por el que no califica:');
                                                if (motivo) onMarcarNoCalifica?.(contacto, motivo);
                                            }}
                                        />
                                    </Stack>
                                </Box>
                            </Collapse>
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
                                            {historial.slice(0, 5).map((evento) => {
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
                                            {historial.length > 5 && (
                                                <Typography variant="caption" color="text.secondary" textAlign="center">
                                                    +{historial.length - 5} eventos más
                                                </Typography>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            </Collapse>
                        </Paper>
                    </Box>

                    {/* Barra inferior fija - Navegación */}
                    {contactos.length > 1 && (
                        <Box sx={{ 
                            p: 2, 
                            bgcolor: 'white',
                            borderTop: 1, 
                            borderColor: 'divider',
                            pb: 'calc(env(safe-area-inset-bottom) + 16px)'
                        }}>
                            <Stack direction="row" spacing={2}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    startIcon={<ChevronLeftIcon />}
                                    onClick={() => handleNavegar('anterior')}
                                    disabled={!puedeAnterior}
                                    sx={{ borderRadius: 2, py: 1.5 }}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    endIcon={<NavigateNextIcon />}
                                    onClick={() => handleNavegar('siguiente')}
                                    disabled={!puedeSiguiente}
                                    sx={{ borderRadius: 2, py: 1.5 }}
                                >
                                    Siguiente
                                </Button>
                            </Stack>
                        </Box>
                    )}
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
        );
    }

    // ==================== VISTA DESKTOP ====================
    return (
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
                            <IconButton onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                    </Stack>
                    
                    {/* Nombre y estado */}
                    <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
                        {contacto.nombre}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
                        <EstadoChip estado={contacto.estado} />
                        {contacto.segmento && (
                            <Chip 
                                size="small" 
                                variant="outlined"
                                label={contacto.segmento === 'outbound' ? 'Outbound' : 'Inbound'} 
                            />
                        )}
                        {contacto.sdrAsignadoNombre && (
                            <Chip 
                                size="small" 
                                icon={<PersonIcon />}
                                label={contacto.sdrAsignadoNombre}
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                </Box>

                {/* Info del contacto */}
                <Box sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                        {contacto.empresa && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <BusinessIcon fontSize="small" color="action" />
                                <Typography variant="body2">{contacto.empresa}</Typography>
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
                        {contacto.email && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">{contacto.email}</Typography>
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
    );
};

export default DrawerDetalleContactoSDR;
