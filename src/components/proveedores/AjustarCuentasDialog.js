/**
 * AjustarCuentasDialog — cierra el saldo histórico de uno o varios proveedores
 * generando un PagoProveedor "Ajuste inicial" por cada uno que imputa todo el
 * pendiente. Útil al onboarding: empresa que arranca a usar la CCC y quiere
 * partir desde cero sin arrastrar movimientos viejos.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import proveedorService from 'src/services/proveedorService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AjustarCuentasDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  /** Array de proveedores con su resumen: [{ _id, nombre, saldo }] */
  proveedores = [],
}) {
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [descripcion, setDescripcion] = useState('Ajuste inicial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (open) {
      setFechaPago(todayISO());
      setDescripcion('Ajuste inicial');
      setError(null);
      setResultado(null);
      setLoading(false);
    }
  }, [open]);

  // Sólo tiene sentido ajustar proveedores con saldo positivo (deuda).
  const proveedoresAjustables = useMemo(
    () => (proveedores || []).filter((p) => (p.saldo || 0) > 0.005),
    [proveedores]
  );

  const totalDeuda = useMemo(
    () => proveedoresAjustables.reduce((acc, p) => acc + (p.saldo || 0), 0),
    [proveedoresAjustables]
  );

  const handleConfirmar = async () => {
    if (proveedoresAjustables.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const ids = proveedoresAjustables.map((p) => p._id);
      const data = await proveedorService.ajustarCuentas(empresaId, ids, {
        fecha_pago: fechaPago,
        descripcion: descripcion.trim() || 'Ajuste inicial',
      });
      setResultado(data);
      // Esperar un momento para que el user vea el resumen y después cerrar
      setTimeout(() => {
        onSuccess?.(data);
        onClose?.();
      }, 2500);
    } catch (err) {
      console.error('Error ajustando cuentas:', err);
      setError(err.response?.data?.error || 'No se pudo completar el ajuste.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberIcon color="warning" />
          <span>Ajustar cuentas</span>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {resultado ? (
          <Alert severity="success">
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Ajuste completado
            </Typography>
            <Typography variant="body2">
              · Proveedores ajustados: <strong>{resultado.totals?.proveedores_ajustados ?? 0}</strong>
            </Typography>
            <Typography variant="body2">
              · Movimientos cerrados: <strong>{resultado.totals?.movimientos_cerrados ?? 0}</strong>
            </Typography>
            <Typography variant="body2">
              · Monto total compensado: <strong>{formatCurrencyWithCode(resultado.totals?.monto_total ?? 0)}</strong>
            </Typography>
            {(resultado.totals?.proveedores_sin_deuda ?? 0) > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {resultado.totals.proveedores_sin_deuda} proveedor(es) se saltearon por no tener deuda pendiente.
              </Typography>
            )}
            {(resultado.totals?.errores ?? 0) > 0 && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                {resultado.totals.errores} proveedor(es) tuvieron error — revisar consola.
              </Typography>
            )}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Vas a cerrar el saldo histórico de los proveedores seleccionados generando un{' '}
              <strong>Pago</strong> con descripción <em>"{descripcion}"</em> por cada uno, imputando
              todo el pendiente de sus movimientos abiertos. <strong>El saldo de cada proveedor
              queda en cero</strong> a partir de la fecha del ajuste.
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              Esta acción crea pagos auditables. <strong>No es destructiva</strong>: si te
              equivocás, podés anular cada pago de ajuste desde la ficha del proveedor.
            </Alert>

            {/* Resumen */}
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Proveedores a ajustar
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {proveedoresAjustables.length}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Deuda total a compensar
                </Typography>
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  {formatCurrencyWithCode(totalDeuda)}
                </Typography>
              </Stack>
            </Box>

            {/* Lista de proveedores (primeros 8) */}
            {proveedoresAjustables.length > 0 && (
              <Box sx={{ mb: 2, maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {proveedoresAjustables.slice(0, 8).map((p) => (
                  <Stack key={p._id} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
                    <Typography variant="caption">{p.nombre}</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {formatCurrencyWithCode(p.saldo)}
                    </Typography>
                  </Stack>
                ))}
                {proveedoresAjustables.length > 8 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    … y {proveedoresAjustables.length - 8} proveedor(es) más
                  </Typography>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <TextField
                label="Fecha del ajuste"
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Descripción del pago"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                helperText="Es la nota que va a quedar en cada Pago creado."
                fullWidth
              />
            </Stack>

            {proveedoresAjustables.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Ninguno de los proveedores seleccionados tiene deuda pendiente. Nada para ajustar.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {resultado ? 'Cerrar' : 'Cancelar'}
        </Button>
        {!resultado && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmar}
            disabled={loading || proveedoresAjustables.length === 0}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Ajustando…' : `Ajustar ${proveedoresAjustables.length} proveedor${proveedoresAjustables.length !== 1 ? 'es' : ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
