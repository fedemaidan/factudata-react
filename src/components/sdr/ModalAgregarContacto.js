/**
 * Modal para Agregar Contacto Manualmente
 * Permite al SDR crear un nuevo contacto con validación
 */
import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Box, Typography, Button, TextField, Stack, Alert,
    CircularProgress, IconButton, InputAdornment
} from '@mui/material';
import {
    Close as CloseIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Business as BusinessIcon,
    Comment as CommentIcon
} from '@mui/icons-material';
import SDRService from '../../services/sdrService';
import { normalizeToE164, isValidPhone } from '../../utils/phoneUtils';

const ModalAgregarContacto = ({
    open,
    onClose,
    empresaId,
    sdrId,
    sdrNombre,
    onSuccess, // Callback al crear contacto exitosamente
}) => {
    const [form, setForm] = useState({
        nombre: '',
        telefono: '',
        email: '',
        empresa: '',
        cargo: '',
        notas: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset form al abrir
    const handleClose = () => {
        setForm({
            nombre: '',
            telefono: '',
            email: '',
            empresa: '',
            cargo: '',
            notas: ''
        });
        setError(null);
        onClose();
    };

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        setError(null);
    };

    const validarForm = () => {
        if (!form.nombre.trim()) {
            setError('El nombre es requerido');
            return false;
        }
        if (!form.telefono.trim()) {
            setError('El teléfono es requerido');
            return false;
        }
        if (!isValidPhone(form.telefono)) {
            setError('El teléfono no es válido (mínimo 8 dígitos)');
            return false;
        }
        if (form.email && !form.email.includes('@')) {
            setError('El email no es válido');
            return false;
        }
        return true;
    };

    const handleGuardar = async () => {
        if (!validarForm()) return;

        setLoading(true);
        setError(null);

        try {
            // Normalizar teléfono
            const telefonoNormalizado = normalizeToE164(form.telefono);

            const contacto = {
                nombre: form.nombre.trim(),
                telefono: telefonoNormalizado,
                email: form.email.trim() || undefined,
                empresa: form.empresa.trim() || undefined,
                cargo: form.cargo.trim() || undefined,
                empresaId,
                sdrAsignado: sdrId,
                sdrAsignadoNombre: sdrNombre,
                estado: 'nuevo',
                origen: 'manual'
            };

            const resultado = await SDRService.crearContacto(contacto);

            // Si hay notas iniciales, agregarlas
            if (form.notas.trim() && resultado._id) {
                await SDRService.registrarIntento(resultado._id, {
                    tipo: 'comentario',
                    canal: 'otro',
                    nota: form.notas.trim(),
                    empresaId
                });
            }

            onSuccess?.(resultado);
            handleClose();
        } catch (err) {
            console.error('Error creando contacto:', err);
            if (err.response?.data?.error?.includes('duplicado') || 
                err.response?.data?.error?.includes('existe')) {
                setError('Ya existe un contacto con ese teléfono');
            } else {
                setError(err.response?.data?.error || 'Error al crear el contacto');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Agregar Contacto</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {/* Nombre */}
                    <TextField
                        label="Nombre *"
                        value={form.nombre}
                        onChange={handleChange('nombre')}
                        fullWidth
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PersonIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Teléfono */}
                    <TextField
                        label="Teléfono *"
                        value={form.telefono}
                        onChange={handleChange('telefono')}
                        fullWidth
                        placeholder="1123456789"
                        helperText="Se normalizará automáticamente a formato internacional"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <PhoneIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Email */}
                    <TextField
                        label="Email"
                        value={form.email}
                        onChange={handleChange('email')}
                        fullWidth
                        type="email"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <EmailIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Empresa */}
                    <TextField
                        label="Empresa"
                        value={form.empresa}
                        onChange={handleChange('empresa')}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <BusinessIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Cargo */}
                    <TextField
                        label="Cargo"
                        value={form.cargo}
                        onChange={handleChange('cargo')}
                        fullWidth
                        placeholder="Ej: Gerente, Dueño, etc."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Notas iniciales */}
                    <TextField
                        label="Notas iniciales"
                        value={form.notas}
                        onChange={handleChange('notas')}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Contexto inicial del contacto..."
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                                    <CommentIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    {/* Error */}
                    {error && (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="inherit">
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleGuardar}
                    disabled={loading}
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    {loading ? <CircularProgress size={20} /> : 'Crear Contacto'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ModalAgregarContacto;
