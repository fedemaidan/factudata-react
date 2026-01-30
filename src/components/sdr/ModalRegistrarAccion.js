/**
 * Modal para Registrar Acción
 * Componente completo con todos los tipos de acción, outcome, próximo contacto
 * Optimizado para mobile (accesible con pulgar)
 */
import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, Chip, Stack, TextField, Paper,
    IconButton, Divider, Alert, CircularProgress, Collapse,
    ToggleButton, ToggleButtonGroup, Slide
} from '@mui/material';
import {
    Close as CloseIcon,
    Phone as PhoneIcon,
    PhoneMissed as PhoneMissedIcon,
    WhatsApp as WhatsAppIcon,
    Event as EventIcon,
    DoNotDisturb as DoNotDisturbIcon,
    Comment as CommentIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    NavigateNext as NavigateNextIcon,
    AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';

// Tipos de acción disponibles
const TIPOS_ACCION = [
    { 
        id: 'llamada_atendida', 
        label: 'Llamada atendida', 
        shortLabel: 'Atendió',
        icon: <PhoneIcon />, 
        color: 'success',
        requiereSeguimiento: false
    },
    { 
        id: 'llamada_no_atendida', 
        label: 'Llamada no atendida', 
        shortLabel: 'No atendió',
        icon: <PhoneMissedIcon />, 
        color: 'warning',
        requiereSeguimiento: true,
        seguimientoDefault: '3h'
    },
    { 
        id: 'whatsapp_enviado', 
        label: 'WhatsApp enviado', 
        shortLabel: 'WhatsApp',
        icon: <WhatsAppIcon />, 
        color: 'info',
        requiereSeguimiento: true,
        seguimientoDefault: '24h'
    },
    { 
        id: 'reunion_coordinada', 
        label: 'Reunión agendada', 
        shortLabel: 'Reunión',
        icon: <EventIcon />, 
        color: 'primary',
        requiereSeguimiento: false,
        abreModalReunion: true
    },
    { 
        id: 'no_responde', 
        label: 'No responde', 
        shortLabel: 'No responde',
        icon: <PhoneMissedIcon />, 
        color: 'default',
        requiereSeguimiento: true,
        seguimientoDefault: '3d'
    },
    { 
        id: 'no_califica', 
        label: 'No califica', 
        shortLabel: 'No califica',
        icon: <DoNotDisturbIcon />, 
        color: 'error',
        requiereSeguimiento: false,
        requiereMotivo: true
    },
    { 
        id: 'nota', 
        label: 'Agregar nota', 
        shortLabel: 'Nota',
        icon: <CommentIcon />, 
        color: 'default',
        requiereSeguimiento: false
    },
];

// Opciones de próximo contacto
const OPCIONES_PROXIMO = [
    { label: '1h', valor: 1, unidad: 'horas' },
    { label: '3h', valor: 3, unidad: 'horas' },
    { label: '24h', valor: 24, unidad: 'horas' },
    { label: '3 días', valor: 3, unidad: 'dias' },
    { label: '1 sem', valor: 7, unidad: 'dias' },
];

const ModalRegistrarAccion = ({
    open,
    onClose,
    contacto,
    empresaId,
    onSuccess, // Callback al registrar acción exitosamente
    onNavegarSiguiente, // Callback para ir al siguiente contacto
    mostrarBotonSiguiente = true,
}) => {
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [nota, setNota] = useState('');
    const [motivoNoCalifica, setMotivoNoCalifica] = useState('');
    const [proximoContacto, setProximoContacto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exito, setExito] = useState(false);
    const [error, setError] = useState(null);

    // Reset al abrir
    useEffect(() => {
        if (open) {
            setTipoSeleccionado(null);
            setNota('');
            setMotivoNoCalifica('');
            setProximoContacto(null);
            setExito(false);
            setError(null);
        }
    }, [open]);

    // Auto-seleccionar próximo contacto si el tipo lo requiere
    useEffect(() => {
        if (tipoSeleccionado?.requiereSeguimiento && tipoSeleccionado?.seguimientoDefault) {
            const opcion = OPCIONES_PROXIMO.find(o => o.label === tipoSeleccionado.seguimientoDefault);
            if (opcion) {
                setProximoContacto(calcularFecha(opcion.valor, opcion.unidad));
            }
        }
    }, [tipoSeleccionado]);

    const calcularFecha = (cantidad, unidad) => {
        const fecha = new Date();
        if (unidad === 'horas') {
            fecha.setHours(fecha.getHours() + cantidad);
        } else if (unidad === 'dias') {
            fecha.setDate(fecha.getDate() + cantidad);
        }
        return fecha;
    };

    const handleSeleccionarTipo = (tipo) => {
        setTipoSeleccionado(tipo);
        setError(null);
        
        // Si es reunión, cerrar y abrir modal de reunión
        if (tipo.abreModalReunion) {
            onClose();
            // El componente padre debería manejar abrir el modal de reunión
            onSuccess?.({ tipo: 'reunion', abrirModalReunion: true });
            return;
        }
    };

    const handleGuardar = async () => {
        if (!tipoSeleccionado) {
            setError('Selecciona un tipo de acción');
            return;
        }

        if (tipoSeleccionado.requiereMotivo && !motivoNoCalifica.trim()) {
            setError('Ingresa el motivo');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (tipoSeleccionado.id === 'no_califica') {
                // Marcar como no califica
                await SDRService.marcarNoCalifica(contacto._id, {
                    motivo: motivoNoCalifica,
                    empresaId
                });
            } else if (tipoSeleccionado.id === 'no_responde') {
                // Marcar como no responde
                await SDRService.marcarNoResponde(contacto._id, { empresaId });
                
                // Actualizar próximo contacto si está definido
                if (proximoContacto) {
                    await SDRService.actualizarProximoContacto(contacto._id, proximoContacto);
                }
            } else if (tipoSeleccionado.id === 'nota') {
                // Solo agregar nota
                if (nota.trim()) {
                    await SDRService.registrarIntento(contacto._id, {
                        tipo: 'comentario',
                        canal: 'otro',
                        nota: nota.trim(),
                        empresaId
                    });
                }
            } else {
                // Registrar intento (llamada, whatsapp, etc)
                await SDRService.registrarIntento(contacto._id, {
                    tipo: tipoSeleccionado.id,
                    canal: tipoSeleccionado.id.includes('llamada') ? 'llamada' : 
                           tipoSeleccionado.id.includes('whatsapp') ? 'whatsapp' : 'otro',
                    nota: nota.trim() || undefined,
                    empresaId
                });

                // Actualizar próximo contacto si está definido
                if (proximoContacto) {
                    await SDRService.actualizarProximoContacto(contacto._id, proximoContacto);
                }
            }

            setExito(true);
            
            // Notificar éxito
            onSuccess?.({ 
                tipo: tipoSeleccionado.id,
                nota: nota.trim(),
                proximoContacto
            });

        } catch (err) {
            console.error('Error registrando acción:', err);
            setError(err.response?.data?.error || 'Error al registrar la acción');
        } finally {
            setLoading(false);
        }
    };

    const handleSiguiente = () => {
        onNavegarSiguiente?.();
        onClose();
    };

    const handleCerrar = () => {
        setExito(false);
        onClose();
    };

    // Vista de éxito
    if (exito) {
        return (
            <Dialog 
                open={open} 
                onClose={handleCerrar}
                fullWidth
                maxWidth="xs"
                PaperProps={{ 
                    sx: { 
                        borderRadius: 3,
                        m: 2,
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        margin: 'auto',
                        maxHeight: '80vh'
                    } 
                }}
                TransitionComponent={Slide}
                TransitionProps={{ direction: 'up' }}
            >
                <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        ¡Acción registrada!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {tipoSeleccionado?.label} para {contacto?.nombre}
                    </Typography>
                    {proximoContacto && (
                        <Chip 
                            icon={<ScheduleIcon />}
                            label={`Próximo: ${proximoContacto.toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}`}
                            color="primary"
                            sx={{ mt: 2 }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0, flexDirection: 'column', gap: 1 }}>
                    {mostrarBotonSiguiente && (
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            endIcon={<NavigateNextIcon />}
                            onClick={handleSiguiente}
                            sx={{ borderRadius: 2, py: 1.5 }}
                        >
                            Siguiente contacto
                        </Button>
                    )}
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleCerrar}
                        sx={{ borderRadius: 2 }}
                    >
                        Volver
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{ 
                sx: { 
                    borderRadius: 3,
                    m: 2,
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    margin: 'auto',
                    maxHeight: '85vh'
                } 
            }}
            TransitionComponent={Slide}
            TransitionProps={{ direction: 'up' }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Registrar acción</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    {contacto?.nombre}
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pb: 1 }}>
                <Stack spacing={2}>
                    {/* Selector de tipo de acción - Grid de chips grandes */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Tipo de acción
                        </Typography>
                        <Box sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: 1 
                        }}>
                            {TIPOS_ACCION.map(tipo => (
                                <Paper
                                    key={tipo.id}
                                    elevation={0}
                                    onClick={() => handleSeleccionarTipo(tipo)}
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        border: 2,
                                        borderColor: tipoSeleccionado?.id === tipo.id 
                                            ? `${tipo.color}.main` 
                                            : 'divider',
                                        borderRadius: 2,
                                        bgcolor: tipoSeleccionado?.id === tipo.id 
                                            ? `${tipo.color}.50` 
                                            : 'white',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        transition: 'all 0.2s',
                                        '&:active': {
                                            transform: 'scale(0.98)'
                                        }
                                    }}
                                >
                                    <Box sx={{ 
                                        color: tipoSeleccionado?.id === tipo.id 
                                            ? `${tipo.color}.main` 
                                            : 'text.secondary' 
                                    }}>
                                        {tipo.icon}
                                    </Box>
                                    <Typography 
                                        variant="caption" 
                                        fontWeight={tipoSeleccionado?.id === tipo.id ? 600 : 400}
                                        textAlign="center"
                                    >
                                        {tipo.shortLabel}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </Box>

                    {/* Campos adicionales según el tipo */}
                    <Collapse in={!!tipoSeleccionado}>
                        <Stack spacing={2}>
                            {/* Motivo para No Califica */}
                            {tipoSeleccionado?.requiereMotivo && (
                                <TextField
                                    label="Motivo *"
                                    value={motivoNoCalifica}
                                    onChange={(e) => setMotivoNoCalifica(e.target.value)}
                                    fullWidth
                                    size="small"
                                    placeholder="¿Por qué no califica?"
                                    error={error && !motivoNoCalifica.trim()}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                            )}

                            {/* Nota opcional */}
                            {!tipoSeleccionado?.requiereMotivo && (
                                <TextField
                                    label={tipoSeleccionado?.id === 'nota' ? 'Nota *' : 'Nota (opcional)'}
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    fullWidth
                                    size="small"
                                    multiline
                                    rows={2}
                                    placeholder="Agregar detalles..."
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                />
                            )}

                            {/* Próximo contacto */}
                            {tipoSeleccionado?.requiereSeguimiento && (
                                <Box>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                        <AccessTimeIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2">
                                            Próximo contacto
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {OPCIONES_PROXIMO.map(opcion => {
                                            const fecha = calcularFecha(opcion.valor, opcion.unidad);
                                            const isSelected = proximoContacto?.getTime() === fecha.getTime();
                                            return (
                                                <Chip
                                                    key={opcion.label}
                                                    label={opcion.label}
                                                    size="small"
                                                    color={isSelected ? 'primary' : 'default'}
                                                    variant={isSelected ? 'filled' : 'outlined'}
                                                    onClick={() => setProximoContacto(fecha)}
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            );
                                        })}
                                        <Chip
                                            label="Sin definir"
                                            size="small"
                                            variant={!proximoContacto ? 'filled' : 'outlined'}
                                            onClick={() => setProximoContacto(null)}
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    </Stack>
                                </Box>
                            )}
                        </Stack>
                    </Collapse>

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1 }}>
                <Button 
                    onClick={onClose} 
                    color="inherit"
                    sx={{ borderRadius: 2 }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleGuardar}
                    disabled={!tipoSeleccionado || loading}
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    {loading ? <CircularProgress size={20} /> : 'Guardar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalRegistrarAccion;
