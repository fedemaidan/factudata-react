import { useState, useEffect } from 'react';
import {
    Drawer, Box, Typography, IconButton, Divider, Chip, Stack,
    Button, TextField, CircularProgress, Paper, Tooltip, Avatar
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
    CloudDownload as ImportIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

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
        'proximo_contacto_programado': <EventIcon fontSize="small" />,
        'contacto_editado': <PersonIcon fontSize="small" />,
    };
    return iconos[tipo] || <HistoryIcon fontSize="small" />;
};

// Chip de estado
const EstadoChip = ({ estado }) => {
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

const ContactoDrawer = ({
    open,
    onClose,
    contacto,
    empresaId,
    onContactoActualizado,
    showActions = true, // Mostrar botones de acción
    showAssignment = false, // Mostrar info de asignación (para líderes)
}) => {
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [nuevoComentario, setNuevoComentario] = useState('');
    const [enviandoComentario, setEnviandoComentario] = useState(false);
    
    // Modal para notas en acciones
    const [modalNota, setModalNota] = useState({ open: false, tipo: null, atendida: false });
    const [notaAccion, setNotaAccion] = useState('');

    useEffect(() => {
        if (open && contacto?._id) {
            cargarHistorial();
        }
    }, [open, contacto?._id]);

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

    // Abrir WhatsApp con plantilla
    const handleWhatsApp = (conPlantilla = false) => {
        const tel = formatTelefono(contacto?.telefono);
        if (!tel) return;
        let url = `https://wa.me/${tel}`;
        if (conPlantilla) {
            const mensaje = encodeURIComponent(
                `¡Hola ${contacto.nombre}! Soy de Sorby, ¿cómo estás? Me gustaría coordinar una llamada para mostrarte nuestra solución.`
            );
            url += `?text=${mensaje}`;
        }
        window.open(url, '_blank');
    };

    // Llamar
    const handleLlamar = () => {
        const tel = formatTelefono(contacto?.telefono);
        if (!tel) return;
        window.open(`tel:${tel}`, '_self');
    };

    // Registrar acción
    const handleRegistrarAccion = (tipo, atendida = false) => {
        setModalNota({ open: true, tipo, atendida });
        setNotaAccion('');
    };

    const confirmarAccion = async () => {
        const { tipo, atendida } = modalNota;
        setActionLoading(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: tipo === 'llamada' ? (atendida ? 'llamada_atendida' : 'llamada_no_atendida') : 'whatsapp_enviado',
                canal: tipo === 'llamada' ? 'llamada' : 'whatsapp',
                nota: notaAccion,
                empresaId
            });
            await cargarHistorial();
            if (onContactoActualizado) onContactoActualizado();
            setModalNota({ open: false, tipo: null, atendida: false });
        } catch (err) {
            console.error('Error registrando acción:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // Marcar como No Responde
    const handleMarcarNoResponde = async () => {
        setActionLoading(true);
        try {
            await SDRService.marcarNoResponde(contacto._id, { empresaId });
            await cargarHistorial();
            if (onContactoActualizado) onContactoActualizado();
        } catch (err) {
            console.error('Error marcando no responde:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // Marcar como No Califica
    const handleMarcarNoCalifica = async () => {
        setActionLoading(true);
        try {
            await SDRService.marcarNoCalifica(contacto._id, { empresaId });
            await cargarHistorial();
            if (onContactoActualizado) onContactoActualizado();
        } catch (err) {
            console.error('Error marcando no califica:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // Agregar comentario directo
    const handleAgregarComentario = async () => {
        if (!nuevoComentario.trim()) return;
        setEnviandoComentario(true);
        try {
            await SDRService.registrarIntento(contacto._id, {
                tipo: 'nota_agregada',
                canal: 'otro',
                nota: nuevoComentario.trim(),
                empresaId
            });
            setNuevoComentario('');
            await cargarHistorial();
        } catch (err) {
            console.error('Error agregando comentario:', err);
        } finally {
            setEnviandoComentario(false);
        }
    };

    if (!contacto) return null;

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{ sx: { width: { xs: '100%', sm: 450 } } }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" noWrap sx={{ maxWidth: 300 }}>
                                {contacto.nombre}
                            </Typography>
                            <IconButton onClick={onClose}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        <Stack direction="row" spacing={1} mt={1} alignItems="center">
                            <EstadoChip estado={contacto.estado} />
                            {contacto.segmento && (
                                <Chip 
                                    size="small" 
                                    variant="outlined"
                                    label={contacto.segmento === 'outbound' ? 'Outbound' : 'Inbound'} 
                                />
                            )}
                            {showAssignment && contacto.sdrAsignadoNombre && (
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

                        {/* Botones de contacto rápido */}
                        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<PhoneIcon />}
                                onClick={handleLlamar}
                                sx={{ bgcolor: '#4caf50' }}
                            >
                                Llamar
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<WhatsAppIcon />}
                                onClick={() => handleWhatsApp(true)}
                                sx={{ bgcolor: '#25D366' }}
                            >
                                WhatsApp
                            </Button>
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Acciones rápidas */}
                    {showActions && (
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
                                        onClick={() => handleRegistrarAccion('llamada', true)}
                                        disabled={actionLoading}
                                    >
                                        <PhoneIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Llamada no atendida">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        onClick={() => handleRegistrarAccion('llamada', false)}
                                        disabled={actionLoading}
                                    >
                                        <PhoneMissedIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="WhatsApp enviado">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="info"
                                        onClick={() => handleRegistrarAccion('whatsapp', false)}
                                        disabled={actionLoading}
                                    >
                                        <WhatsAppIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="No responde">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="default"
                                        onClick={handleMarcarNoResponde}
                                        disabled={actionLoading}
                                    >
                                        <PhoneMissedIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="No califica">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={handleMarcarNoCalifica}
                                        disabled={actionLoading}
                                    >
                                        <DoNotDisturbIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                            </Stack>
                        </Box>
                    )}

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
                                        handleAgregarComentario();
                                    }
                                }}
                                disabled={enviandoComentario}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleAgregarComentario}
                                disabled={!nuevoComentario.trim() || enviandoComentario}
                            >
                                {enviandoComentario ? <CircularProgress size={20} /> : <SendIcon />}
                            </Button>
                        </Stack>
                    </Box>

                    <Divider />

                    {/* Historial */}
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
            </Drawer>

            {/* Modal para agregar nota a la acción */}
            <Drawer
                anchor="bottom"
                open={modalNota.open}
                onClose={() => setModalNota({ open: false, tipo: null, atendida: false })}
                PaperProps={{ 
                    sx: { 
                        borderTopLeftRadius: 16, 
                        borderTopRightRadius: 16,
                        maxHeight: '50vh'
                    } 
                }}
            >
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {modalNota.tipo === 'llamada' 
                            ? (modalNota.atendida ? '📞 Llamada atendida' : '📵 Llamada no atendida')
                            : '💬 WhatsApp enviado'
                        }
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Agregar nota (opcional)..."
                        value={notaAccion}
                        onChange={(e) => setNotaAccion(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setModalNota({ open: false, tipo: null, atendida: false })}
                        >
                            Cancelar
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={confirmarAccion}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <CircularProgress size={20} /> : 'Registrar'}
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </>
    );
};

export default ContactoDrawer;
