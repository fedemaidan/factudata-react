/**
 * AnularPagoDialog — permite anular un PagoProveedor con motivo opcional
 * y elección de qué hacer con los movimientos imputados.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import pagoProveedorService from 'src/services/pagoProveedorService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

const AnularPagoDialog = ({ open, onClose, onSuccess, empresaId, pago }) => {
  const [accionMovimientos, setAccionMovimientos] = useState('revertir_a_pendiente');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAccionMovimientos('revertir_a_pendiente');
    setMotivo('');
    setLoading(false);
    setError(null);
  }, [open]);

  const handleConfirmar = useCallback(async () => {
    if (!pago) return;
    setLoading(true);
    setError(null);
    try {
      const pagoAnulado = await pagoProveedorService.anular(empresaId, pago._id, {
        motivo: motivo || null,
        accion_movimientos: accionMovimientos,
      });
      onSuccess(pagoAnulado);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al anular el pago');
    } finally {
      setLoading(false);
    }
  }, [pago, empresaId, motivo, accionMovimientos, onSuccess, onClose]);

  if (!pago) return null;

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Anular pago</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Resumen del pago */}
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">Proveedor</Typography>
            <Typography variant="body1" fontWeight={600}>{pago.proveedor_nombre || pago.proveedor_id}</Typography>
          </Stack>
          <Stack direction="row" spacing={3}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Fecha</Typography>
              <Typography variant="body1">{formatTimestamp(pago.fecha_pago)}</Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">Monto bruto</Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatCurrencyWithCode(pago.monto_bruto)}
              </Typography>
            </Stack>
          </Stack>

          <Divider />

          {/* Acción sobre movimientos */}
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={600}>
              ¿Qué hacer con las facturas imputadas?
            </Typography>
            <RadioGroup
              value={accionMovimientos}
              onChange={(e) => setAccionMovimientos(e.target.value)}
            >
              <FormControlLabel
                value="revertir_a_pendiente"
                control={<Radio size="small" />}
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={500}>Revertir a pendiente</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Los montos pagados se descontarán de las facturas imputadas.
                    </Typography>
                  </Stack>
                }
              />
              <FormControlLabel
                value="mantener_pagados"
                control={<Radio size="small" />}
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={500}>Mantener como pagadas</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Las facturas conservan su estado actual.
                    </Typography>
                  </Stack>
                }
              />
            </RadioGroup>
          </Stack>

          {/* Motivo */}
          <TextField
            label="Motivo (opcional)"
            multiline
            rows={2}
            size="small"
            fullWidth
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirmar}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Anulando…' : 'Confirmar anulación'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnularPagoDialog;
