// components/cajaChica/TransferenciaModal.js
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  MenuItem,
  CircularProgress
} from '@mui/material';

const TransferenciaModal = ({
  open,
  onClose,
  onSubmit,
  profiles = [],
  userActual = null,
  isLoading = false,
  usuarioFijo = null // Cuando hay un usuario fijo como origen
}) => {
  const [formData, setFormData] = useState({
    usuario_origen_id: usuarioFijo?.id || '',
    usuario_destino_id: '',
    monto: '',
    observacion: '',
    fecha: new Date().toISOString().slice(0, 10)
  });
  
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar origen solo si no hay usuario fijo
    if (!usuarioFijo && !formData.usuario_origen_id) {
      newErrors.usuario_origen_id = 'Debe seleccionar un usuario origen';
    }

    if (!formData.usuario_destino_id) {
      newErrors.usuario_destino_id = 'Debe seleccionar un usuario destino';
    } else if (formData.usuario_destino_id === (usuarioFijo?.id || formData.usuario_origen_id)) {
      newErrors.usuario_destino_id = 'No puede transferir al mismo usuario';
    }

    if (!formData.monto) {
      newErrors.monto = 'El monto es requerido';
    } else if (parseFloat(formData.monto) <= 0) {
      newErrors.monto = 'El monto debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    console.log('🔍 [Debug] userActual completo:', userActual);
    console.log('🔍 [Debug] usuarioFijo:', usuarioFijo);

    // Determinar usuario origen: usuarioFijo o seleccionado del form
    const usuarioOrigen = usuarioFijo || profiles.find(p => p.id === formData.usuario_origen_id);
    const usuarioDestino = profiles.find(p => p.id === formData.usuario_destino_id);

    const transferData = {
      empresa_id: userActual?.empresa?.id,
      empresa_nombre: userActual?.empresa?.nombre || userActual?.empresa?.name || null,
      usuario_origen_id: usuarioOrigen?.id,
      usuario_origen_nombre: `${usuarioOrigen?.firstName} ${usuarioOrigen?.lastName}`,
      user_phone_origen: usuarioOrigen?.phone || usuarioOrigen?.telefono || null,
      usuario_destino_id: formData.usuario_destino_id,
      usuario_destino_nombre: usuarioDestino ? `${usuarioDestino.firstName} ${usuarioDestino.lastName}` : '',
      user_phone_destino: usuarioDestino?.phone || usuarioDestino?.telefono || null,
      monto: parseFloat(formData.monto),
      fecha: formData.fecha,
      observacion: formData.observacion || null
    };

    console.log('🔍 [Debug] transferData eniado:', transferData);
    onSubmit(transferData);
  };

  const handleClose = () => {
    setFormData({
      usuario_origen_id: usuarioFijo?.id || '',
      usuario_destino_id: '',
      monto: '',
      observacion: '',
      fecha: new Date().toISOString().slice(0, 10)
    });
    setErrors({});
    onClose();
  };

  // Filtrar perfiles para origen (excluir usuario actual si no hay usuario fijo)
  const perfilesOrigen = profiles.filter(profile => profile.id !== userActual?.id);
  
  // Filtrar perfiles para destino (excluir origen seleccionado)
  const origenSeleccionado = usuarioFijo?.id || formData.usuario_origen_id;
  const perfilesDestino = profiles.filter(profile => profile.id !== origenSeleccionado);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Nueva Transferencia</Typography>
        <Typography variant="body2" color="text.secondary">
          Transferencia desde: {userActual?.firstName} {userActual?.lastName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Selector de usuario origen - solo si no hay usuario fijo */}
          {!usuarioFijo && (
            <TextField
              select
              label="Usuario Origen"
              value={formData.usuario_origen_id}
              onChange={handleChange('usuario_origen_id')}
              error={!!errors.usuario_origen_id}
              helperText={errors.usuario_origen_id}
              fullWidth
              required
            >
              <MenuItem value="">
                <em>Seleccionar usuario origen</em>
              </MenuItem>
              {perfilesOrigen.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.firstName} {profile.lastName} ({profile.email})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            label="Usuario Destino"
            value={formData.usuario_destino_id}
            onChange={handleChange('usuario_destino_id')}
            error={!!errors.usuario_destino_id}
            helperText={errors.usuario_destino_id}
            fullWidth
            required
          >
            <MenuItem value="">
              <em>Seleccionar usuario destino</em>
            </MenuItem>
            {perfilesDestino.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.firstName} {profile.lastName} ({profile.email})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="number"
            label="Monto"
            value={formData.monto}
            onChange={handleChange('monto')}
            error={!!errors.monto}
            helperText={errors.monto}
            inputProps={{ min: "0", step: "0.01" }}
            fullWidth
            required
          />

          <TextField
            type="date"
            label="Fecha"
            value={formData.fecha}
            onChange={handleChange('fecha')}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="Observación"
            value={formData.observacion}
            onChange={handleChange('observacion')}
            multiline
            rows={3}
            fullWidth
            placeholder="Descripción opcional de la transferencia..."
          />

          {perfilesDestino.length === 0 && (
            <Alert severity="warning">
              No hay usuarios disponibles para realizar transferencias.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || perfilesDestino.length === 0}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Procesando...' : 'Crear Transferencia'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferenciaModal;