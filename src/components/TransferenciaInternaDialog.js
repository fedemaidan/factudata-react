import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Autocomplete,
  TextField,
  Typography,
  Box,
  Alert,
  InputAdornment,
  Divider,
  Paper
} from '@mui/material';
import { formatCurrencyWithCode } from 'src/utils/formatters';
import movimientosService from 'src/services/movimientosService';

const TransferenciaInternaDialog = ({ 
  open, 
  onClose, 
  proyectos = [], 
  onSuccess,
  defaultProyectoEmisor = null,
  userPhone = null
}) => {
  const [proyectoEmisor, setProyectoEmisor] = useState(defaultProyectoEmisor);
  const [proyectoReceptor, setProyectoReceptor] = useState(null);
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Opciones de moneda
  const monedasOptions = [
    { value: 'ARS', label: 'Pesos (ARS)' },
    { value: 'USD', label: 'Dólares (USD)' }
  ];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setProyectoEmisor(defaultProyectoEmisor);
      setProyectoReceptor(null);
      setMonto('');
      setMoneda('ARS');
      setObservacion('');
      setError('');
    }
  }, [open, defaultProyectoEmisor]);

  // Filtrar proyectos para que no aparezca el mismo proyecto en ambos campos
  const proyectosReceptorOptions = proyectos.filter(p => 
    !proyectoEmisor || p.id !== proyectoEmisor.id
  );

  const proyectosEmisorOptions = proyectos.filter(p => 
    !proyectoReceptor || p.id !== proyectoReceptor.id
  );

  const handleSubmit = async () => {
    setError('');

    // Validaciones
    if (!proyectoEmisor) {
      setError('Debe seleccionar un proyecto emisor');
      return;
    }

    if (!proyectoReceptor) {
      setError('Debe seleccionar un proyecto receptor');
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (proyectoEmisor.id === proyectoReceptor.id) {
      setError('El proyecto emisor y receptor no pueden ser el mismo');
      return;
    }

    setLoading(true);

    try {
      const transferencia = {
        proyecto_emisor_id: proyectoEmisor.id,
        proyecto_emisor_nombre: proyectoEmisor.nombre,
        proyecto_receptor_id: proyectoReceptor.id,
        proyecto_receptor_nombre: proyectoReceptor.nombre,
        total: parseFloat(monto),
        moneda: moneda,
        user_phone: userPhone,
        observacion: observacion || `Transferencia de ${proyectoEmisor.nombre} a ${proyectoReceptor.nombre}`
      };

      const result = await movimientosService.createTransferenciaInterna(transferencia);
      
      if (result.error) {
        setError(result.message || 'Error al procesar la transferencia');
      } else {
        // Éxito
        if (onSuccess) {
          onSuccess(result.data);
        }
        onClose();
      }
    } catch (err) {
      setError('Error inesperado al procesar la transferencia');
      console.error('Error en transferencia:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const formatMontoDisplay = (value) => {
    if (!value) return '';
    return formatCurrencyWithCode(parseFloat(value), moneda);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Transferencia Interna entre Proyectos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Transfiere dinero de un proyecto a otro. Se creará un egreso en el proyecto emisor y un ingreso en el receptor.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Proyecto Emisor */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  Proyecto Emisor (Egreso)
                </Typography>
                <Autocomplete
                  value={proyectoEmisor}
                  onChange={(event, newValue) => setProyectoEmisor(newValue)}
                  options={proyectosEmisorOptions}
                  getOptionLabel={(option) => option?.nombre || ''}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar proyecto emisor"
                      required
                      variant="outlined"
                      sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white'
                        }
                      }}
                    />
                  )}
                />
              </Paper>
            </Grid>

            {/* Proyecto Receptor */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                  Proyecto Receptor (Ingreso)
                </Typography>
                <Autocomplete
                  value={proyectoReceptor}
                  onChange={(event, newValue) => setProyectoReceptor(newValue)}
                  options={proyectosReceptorOptions}
                  getOptionLabel={(option) => option?.nombre || ''}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar proyecto receptor"
                      required
                      variant="outlined"
                      sx={{ 
                        bgcolor: 'white', 
                        borderRadius: 1,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white'
                        }
                      }}
                    />
                  )}
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Monto y Moneda */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Monto a transferir"
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                fullWidth
                required
                inputProps={{ step: "0.01", min: "0" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {moneda === 'USD' ? '$' : '$'}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Autocomplete
                value={monedasOptions.find(m => m.value === moneda) || monedasOptions[0]}
                onChange={(event, newValue) => setMoneda(newValue?.value || 'ARS')}
                options={monedasOptions}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Moneda"
                    required
                  />
                )}
              />
            </Grid>

            {/* Observación */}
            <Grid item xs={12}>
              <TextField
                label="Observación (opcional)"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Ingrese una descripción para la transferencia..."
              />
            </Grid>

            {/* Preview */}
            {proyectoEmisor && proyectoReceptor && monto && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom>
                    Resumen de la Transferencia
                  </Typography>
                  <Typography variant="body1">
                    <strong>De:</strong> {proyectoEmisor.nombre} → <strong>Hacia:</strong> {proyectoReceptor.nombre}
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ mt: 1 }}>
                    {formatMontoDisplay(monto)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Se creará un egreso por {formatMontoDisplay(monto)} en "{proyectoEmisor.nombre}" y un ingreso por el mismo monto en "{proyectoReceptor.nombre}".
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !proyectoEmisor || !proyectoReceptor || !monto}
        >
          {loading ? 'Procesando...' : 'Realizar Transferencia'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransferenciaInternaDialog;