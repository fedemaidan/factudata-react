import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Stack
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptIcon from '@mui/icons-material/Receipt';
import movimientosService from 'src/services/movimientosService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const EgresoConCajaPagadoraDialog = ({
  open,
  onClose,
  datosEgreso,
  proyectos = [],
  onSuccess
}) => {
  const [proyectoPagadorId, setProyectoPagadorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const proyectoPagadorSeleccionado = proyectos.find(p => p.id === proyectoPagadorId);

  // Filtrar proyectos disponibles (excluir el proyecto del egreso)
  const proyectosDisponibles = proyectos.filter(p => p.id !== datosEgreso?.proyecto_id);

  const handleSubmit = async () => {
    if (!proyectoPagadorId) {
      setError('Debe seleccionar una caja pagadora');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultado = await movimientosService.createEgresoConCajaPagadora(
        datosEgreso,
        proyectoPagadorId,
        proyectoPagadorSeleccionado.nombre
      );

      if (resultado.error) {
        setError(resultado.message || 'Error al crear el egreso');
        return;
      }

      onSuccess && onSuccess(resultado.data);
      handleClose();
    } catch (err) {
      setError('Error inesperado al procesar el egreso');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProyectoPagadorId('');
    setError('');
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setProyectoPagadorId('');
      setError('');
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="primary" />
          <Typography variant="h6">
            Pagar desde otra caja
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Información del egreso */}
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon fontSize="small" />
              Detalles del gasto
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Proyecto:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {datosEgreso?.proyecto_nombre || 'Sin especificar'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Proveedor:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {datosEgreso?.nombre_proveedor || 'Sin especificar'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Categoría:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {datosEgreso?.categoria || 'Sin especificar'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Total:</Typography>
                <Chip 
                  label={formatCurrencyWithCode(datosEgreso?.total || 0, datosEgreso?.moneda || 'ARS')}
                  color="error"
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Stack>
          </Paper>

          {/* Selector de caja pagadora */}
          <FormControl fullWidth>
            <InputLabel>Seleccionar caja pagadora</InputLabel>
            <Select
              value={proyectoPagadorId}
              onChange={(e) => setProyectoPagadorId(e.target.value)}
              label="Seleccionar caja pagadora"
              startAdornment={<AccountBalanceWalletIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {proyectosDisponibles.map((proyecto) => (
                <MenuItem key={proyecto.id} value={proyecto.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="body1">{proyecto.nombre}</Typography>
                    {proyecto.descripcion && (
                      <Typography variant="caption" color="text.secondary">
                        {proyecto.descripcion}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Explicación del proceso */}
          <Alert 
            severity="info" 
            icon={<InfoIcon />}
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              ¿Qué sucederá al confirmar?
            </Typography>
            <Typography variant="body2" component="div">
              Se crearán automáticamente 3 movimientos:
              <Box component="ol" sx={{ mt: 1, pl: 2 }}>
                <li>
                  <strong>Egreso por transferencia</strong> en{' '}
                  <em>{proyectoPagadorSeleccionado?.nombre || '[Caja pagadora]'}</em>
                </li>
                <li>
                  <strong>Ingreso por transferencia</strong> en{' '}
                  <em>{datosEgreso?.proyecto_nombre || '[Proyecto del gasto]'}</em>
                </li>
                <li>
                  <strong>Egreso operativo</strong> en{' '}
                  <em>{datosEgreso?.proyecto_nombre || '[Proyecto del gasto]'}</em>{' '}
                  por {datosEgreso?.categoria || 'el concepto indicado'}
                </li>
              </Box>
            </Typography>
          </Alert>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !proyectoPagadorId}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <SwapHorizIcon />}
        >
          {loading ? 'Procesando...' : 'Confirmar pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EgresoConCajaPagadoraDialog;