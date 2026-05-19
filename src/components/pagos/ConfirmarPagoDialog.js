/**
 * ConfirmarPagoDialog — registra un PagoProveedor real a partir de uno o varios
 * movimientos seleccionados (en `/control-pagos` o en `movementForm`).
 *
 * Si los movimientos son de varios proveedores, crea un PagoProveedor por
 * cada proveedor con las imputaciones correspondientes.
 *
 * Props:
 *   open, onClose, onSuccess(resultados)
 *   empresaId
 *   movimientos: [{ id, total, monto_pagado, id_proveedor, nombre_proveedor,
 *                   fecha_factura, _montoAPagar }]
 *     - _montoAPagar (opcional): monto a imputar a este movimiento.
 *       Si no viene, usa max(0, total - monto_pagado).
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import pagoProveedorService from 'src/services/pagoProveedorService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const METODOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'otro',          label: 'Otro' },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizeAmount = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const calcMontoAPagar = (mov) => {
  if (typeof mov._montoAPagar === 'number') return Math.max(0, mov._montoAPagar);
  const total = Number(mov.total) || 0;
  const pagado = Number(mov.monto_pagado) || 0;
  return Math.max(0, total - pagado);
};

export default function ConfirmarPagoDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  movimientos = [],
}) {
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [metodo, setMetodo] = useState('transferencia');
  const [nroComprobante, setNroComprobante] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setFechaPago(todayISO());
    setMetodo('transferencia');
    setNroComprobante('');
    setNotas('');
    setError(null);
    setLoading(false);
  }, [open]);

  // Agrupar movimientos por proveedor (id_proveedor o nombre_proveedor como fallback)
  const gruposPorProveedor = useMemo(() => {
    const groups = new Map();
    for (const mov of movimientos) {
      const monto = calcMontoAPagar(mov);
      if (monto <= 0.005) continue;
      const provId = mov.id_proveedor || `__sin_id__::${mov.nombre_proveedor || 'Sin proveedor'}`;
      if (!groups.has(provId)) {
        groups.set(provId, {
          proveedor_id: mov.id_proveedor || null,
          nombre_proveedor: mov.nombre_proveedor || 'Sin proveedor',
          movimientos: [],
          total: 0,
        });
      }
      const g = groups.get(provId);
      g.movimientos.push({ ...mov, _montoAPagar: monto });
      g.total += monto;
    }
    return Array.from(groups.values());
  }, [movimientos]);

  const totalGeneral = useMemo(
    () => gruposPorProveedor.reduce((acc, g) => acc + g.total, 0),
    [gruposPorProveedor]
  );

  const totalMovimientos = useMemo(
    () => gruposPorProveedor.reduce((acc, g) => acc + g.movimientos.length, 0),
    [gruposPorProveedor]
  );

  const handleConfirmar = async () => {
    if (gruposPorProveedor.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const resultados = [];
      for (const grupo of gruposPorProveedor) {
        // Si el grupo no tiene proveedor_id (sólo nombre), no podemos crear el pago.
        // Estos casos quedan fuera de PagoProveedor — el usuario debe vincular el proveedor primero.
        if (!grupo.proveedor_id) {
          console.warn('[ConfirmarPagoDialog] Saltando movimientos sin proveedor_id:', grupo.nombre_proveedor);
          continue;
        }
        const payload = {
          proveedor_id: grupo.proveedor_id,
          fecha_pago: fechaPago,
          monto_bruto: grupo.total,
          moneda: 'ARS',
          metodo,
          nro_comprobante: nroComprobante.trim() || null,
          notas: notas.trim() || null,
          retenciones: [],
          imputaciones: grupo.movimientos.map((m) => ({
            movimiento_id: m.id || m._id,
            monto_imputado: m._montoAPagar,
          })),
        };
        const pago = await pagoProveedorService.registrar(empresaId, payload);
        resultados.push(pago);
      }
      onSuccess?.(resultados);
      onClose?.();
    } catch (err) {
      console.error('Error confirmando pago:', err);
      setError(err.response?.data?.error || 'No se pudo registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const sinProveedorAsignado = gruposPorProveedor.some((g) => !g.proveedor_id);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirmar pago</DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Resumen */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {totalMovimientos} movimiento{totalMovimientos !== 1 ? 's' : ''} ·{' '}
              {gruposPorProveedor.length} proveedor{gruposPorProveedor.length !== 1 ? 'es' : ''}
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatCurrencyWithCode(totalGeneral)}
            </Typography>
          </Stack>

          {gruposPorProveedor.length > 1 && (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {gruposPorProveedor.map((g, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    · {g.nombre_proveedor} ({g.movimientos.length})
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {formatCurrencyWithCode(g.total)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>

        {sinProveedorAsignado && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hay movimientos sin proveedor vinculado. Para registrar el pago como evento auditable,
            primero asigná un proveedor a esos movimientos.
          </Alert>
        )}

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Fecha del pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              select
              label="Método"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              fullWidth
            >
              {METODOS.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Nro de comprobante (opcional)"
            value={nroComprobante}
            onChange={(e) => setNroComprobante(e.target.value)}
            helperText="CBU, nro de cheque, transferencia, etc."
            fullWidth
          />

          <TextField
            label="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary">
          Al confirmar se crea un registro de pago auditable por cada proveedor, con las facturas
          seleccionadas imputadas. Para agregar retenciones o comprobantes adjuntos, usar la
          opción completa "Registrar pago" desde la ficha del proveedor.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirmar}
          disabled={loading || totalGeneral <= 0 || gruposPorProveedor.every((g) => !g.proveedor_id)}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Confirmando…' : 'Confirmar pago'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
