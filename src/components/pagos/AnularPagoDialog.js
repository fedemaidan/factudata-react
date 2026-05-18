/**
 * AnularPagoDialog — anula un Pago a proveedor preguntando qué hacer con
 * las facturas imputadas.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import pagoProveedorService from 'src/services/pagoProveedorService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

export default function AnularPagoDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  pago,
  proveedorNombre,
}) {
  const [accion, setAccion] = useState('revertir_a_pendiente');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setAccion('revertir_a_pendiente');
      setMotivo('');
      setError(null);
    }
  }, [open]);

  if (!pago) return null;

  const cantidadImputaciones = pago.imputaciones?.length || 0;

  const handleConfirmar = async () => {
    setError(null);
    setLoading(true);
    try {
      await pagoProveedorService.anular(empresaId, pago._id, {
        motivo: motivo.trim() || null,
        accion_movimientos: accion,
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Error anulando pago:', err);
      setError(err.response?.data?.error || 'No se pudo anular el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberIcon color="warning" />
          <span>Anular pago</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Proveedor</Typography>
            <Typography variant="body2" fontWeight={600}>{proveedorNombre || '—'}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Fecha</Typography>
            <Typography variant="body2">{formatTimestamp(pago.fecha_pago)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Monto bruto</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrencyWithCode(pago.monto_bruto)} {pago.moneda}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Facturas imputadas</Typography>
            <Typography variant="body2">{cantidadImputaciones}</Typography>
          </Stack>
        </Paper>

        {cantidadImputaciones > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Este pago tiene <strong>{cantidadImputaciones} factura{cantidadImputaciones !== 1 ? 's' : ''}</strong> imputada{cantidadImputaciones !== 1 ? 's' : ''}. ¿Qué hacés con ellas?
            </Typography>

            <FormControl>
              <RadioGroup
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
              >
                <FormControlLabel
                  value="revertir_a_pendiente"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Volver a pendiente</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Las facturas se descuentan y vuelven a aparecer como deuda.
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="mantener_pagados"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Mantener como pagadas</Typography>
                      <Typography variant="caption" color="text.secondary">
                        El pago se marca como anulado por cuestión contable pero las facturas siguen cerradas.
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            Este pago no tiene facturas imputadas. Se marcará como anulado sin afectar movimientos.
          </Alert>
        )}

        <TextField
          label="Motivo de anulación"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          multiline
          rows={2}
          fullWidth
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirmar}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Confirmar anulación
        </Button>
      </DialogActions>
    </Dialog>
  );
}
