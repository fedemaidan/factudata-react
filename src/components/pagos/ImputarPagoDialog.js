/**
 * ImputarPagoDialog — distribuye un pago entre remitos pendientes seleccionados de un proveedor.
 *
 * Paso 1: seleccionar qué facturas incluir (checkboxes) + ingresar monto + fecha.
 * Paso 2: tabla de remitos seleccionados con input editable por fila.
 *         La suma debe coincidir con el monto ingresado en paso 1.
 *
 * Al confirmar lanza un PATCH por cada remito afectado usando buildInlinePagoPatch.
 * Prop `remitoInicial`: si se provee, pre-selecciona solo esa factura al abrir.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import movimientosService from 'src/services/movimientosService';
import { dateToTimestamp, formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Helpers locales ──────────────────────────────────────────────────────────

const normalizeAmount = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const buildTodayTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return dateToTimestamp(`${y}-${m}-${d}`);
};

/**
 * Replica la lógica de buildInlinePagoPatch de control-pagos.js.
 * Dado un movimiento y el nuevo monto pagado devuelve el patch a aplicar.
 */
const buildPatch = (movimiento, nextMontoPagado, fechaPago) => {
  const total = Number(movimiento?.total) || 0;
  const prevPagado = Number(movimiento?.monto_pagado) || 0;
  const acumulado = prevPagado + nextMontoPagado;
  const capped = Math.max(0, Math.min(acumulado, total));
  const fechaFinal = fechaPago || movimiento?.fecha_pago || buildTodayTimestamp();

  if (!capped || capped <= 0) {
    return { monto_pagado: null, estado: 'Pendiente', fecha_pago: null };
  }
  if (capped >= total - 0.005) {
    return { monto_pagado: total, estado: 'Pagado', fecha_pago: fechaFinal };
  }
  return { monto_pagado: capped, estado: 'Parcialmente Pagado', fecha_pago: fechaFinal };
};

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * @param {object}   props
 * @param {boolean}  props.open
 * @param {Function} props.onClose       — () => void
 * @param {Function} props.onSuccess     — () => void  (recarga la lista tras guardar)
 * @param {string}   props.proveedor     — nombre del proveedor
 * @param {Array}    props.remitos        — movimientos pendientes del proveedor
 */
export default function ImputarPagoDialog({ open, onClose, onSuccess, proveedor, remitos = [], remitoInicial = null, selectedIdsInicial = null }) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [montoTotal, setMontoTotal] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [importes, setImportes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Remitos filtrados según selección
  const remitosFiltrados = useMemo(
    () => remitos.filter((r) => selectedIds.has(r.id || r._id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remitos, selectedIds]
  );

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Montos rápidos precalculados (sobre las facturas seleccionadas)
  const totalAprobadoPendiente = useMemo(
    () => remitosFiltrados.reduce((acc, r) => acc + Math.max(0, (Number(r.monto_aprobado) || 0) - (Number(r.monto_pagado) || 0)), 0),
    [remitosFiltrados]
  );
  const totalPedidoPendiente = useMemo(
    () => remitosFiltrados.reduce((acc, r) => acc + Math.max(0, (Number(r.total) || 0) - (Number(r.monto_pagado) || 0)), 0),
    [remitosFiltrados]
  );

  // Inicializar al abrir
  useEffect(() => {
    if (open) {
      const hoy = new Date();
      const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      setFechaPago(iso);
      setMontoTotal('');
      setImportes({});
      setStep(1);
      setError(null);
    // Selección inicial: prioridad selectedIdsInicial > remitoInicial > todo
      if (selectedIdsInicial?.length > 0) {
        setSelectedIds(new Set(selectedIdsInicial));
      } else if (remitoInicial) {
        const rid = remitoInicial.id || remitoInicial._id;
        setSelectedIds(new Set([rid]));
      } else {
        setSelectedIds(new Set(remitos.map((r) => r.id || r._id)));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const montoTotalNum = normalizeAmount(montoTotal) || 0;
  const sumaImportes = useMemo(
    () => Object.values(importes).reduce((acc, v) => acc + (normalizeAmount(v) || 0), 0),
    [importes]
  );
  const diferencia = montoTotalNum - sumaImportes;
  const importesValidos = selectedIds.size > 0 && Math.abs(diferencia) < 0.005;

  const handleMontoChange = (id, value) => {
    setImportes((prev) => ({ ...prev, [id]: value }));
  };

  // Distribuir automáticamente el monto entre los remitos seleccionados (FIFO por deuda)
  const handleAutoDistribuir = () => {
    let restante = montoTotalNum;
    const nuevo = {};
    for (const rem of remitosFiltrados) {
      if (restante <= 0) break;
      const deuda = (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0);
      const asignar = Math.min(restante, deuda);
      if (asignar > 0) {
        nuevo[rem.id || rem._id] = String(asignar.toFixed(2));
        restante -= asignar;
      }
    }
    setImportes(nuevo);
  };

  const handleConfirmar = async () => {
    setError(null);
    setLoading(true);
    const fechaTs = dateToTimestamp(fechaPago) || buildTodayTimestamp();
    try {
      const tareas = remitosFiltrados
        .map((rem) => {
          const id = rem.id || rem._id;
          const monto = normalizeAmount(importes[id]);
          if (!monto || monto <= 0) return null;
          const patch = buildPatch(rem, monto, fechaTs);
          return movimientosService.updateMovimiento(id, patch);
        })
        .filter(Boolean);

      await Promise.all(tareas);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Error al imputar pagos:', err);
      setError('Ocurrió un error al guardar. Verificá la conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Confirma directamente (sin step 2) cuando no hace falta distribuir:
  // - 1 sola factura, O
  // - monto cubre la deuda total de todas las seleccionadas
  const puedeConfirmarDirecto = remitosFiltrados.length === 1 || montoTotalNum >= totalPedidoPendiente - 0.005;

  const handleConfirmarDirecto = async () => {
    setError(null);
    setLoading(true);
    const fechaTs = dateToTimestamp(fechaPago) || buildTodayTimestamp();
    try {
      // Distribuir FIFO: cubrir la deuda de cada factura en orden
      let restante = montoTotalNum;
      const tareas = [];
      for (const rem of remitosFiltrados) {
        if (restante <= 0) break;
        const deuda = Math.max(0, (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0));
        const asignar = Math.min(restante, deuda);
        if (asignar > 0) {
          const id = rem.id || rem._id;
          tareas.push(movimientosService.updateMovimiento(id, buildPatch(rem, asignar, fechaTs)));
          restante -= asignar;
        }
      }
      await Promise.all(tareas);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Error al imputar pago:', err);
      setError('Ocurrió un error al guardar. Verificá la conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Registrar pago — <Typography component="span" fontWeight={700}>{proveedor}</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {step === 1 && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* Resumen de facturas incluidas */}
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                {remitosFiltrados.length === 1 ? 'Factura a pagar' : `Facturas a pagar (${remitosFiltrados.length})`}
              </Typography>
              {remitosFiltrados.map((rem) => {
                const deuda = Math.max(0, (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0));
                return (
                  <Typography key={rem.id || rem._id} variant="body2" color="text.primary">
                    {formatTimestamp(rem.fecha_factura)}{rem.categoria ? ` — ${rem.categoria}` : ''}
                    {' '}
                    <Typography component="span" variant="body2" color="text.secondary">
                      (deuda: {formatCurrencyWithCode(deuda)})
                    </Typography>
                  </Typography>
                );
              })}
              {remitosFiltrados.length === 0 && (
                <Typography variant="body2" color="warning.main">No hay facturas seleccionadas.</Typography>
              )}
            </Box>

            <TextField
              label="Monto total del pago"
              type="number"
              value={montoTotal}
              onChange={(e) => setMontoTotal(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              fullWidth
              autoFocus
            />

            {/* Atajos de monto */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Typography variant="caption" color="text.secondary" alignSelf="center" sx={{ mr: 0.5 }}>
                Completar con:
              </Typography>
              <Tooltip title="Suma del monto aprobado menos lo ya pagado">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={totalAprobadoPendiente <= 0}
                  onClick={() => setMontoTotal(String(totalAprobadoPendiente.toFixed(2)))}
                >
                  Deuda aprobada ({formatCurrencyWithCode(totalAprobadoPendiente)})
                </Button>
              </Tooltip>
              <Tooltip title="Suma del saldo del proveedor menos lo ya pagado">
                <Button
                  size="small"
                  variant="outlined"
                  disabled={totalPedidoPendiente <= 0}
                  onClick={() => setMontoTotal(String(totalPedidoPendiente.toFixed(2)))}
                >
                  Deuda pedida ({formatCurrencyWithCode(totalPedidoPendiente)})
                </Button>
              </Tooltip>
            </Stack>

            <Divider />
            <TextField
              label="Fecha del pago"
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        )}

        {step === 2 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Indicá cuánto se imputa a cada operación. Total del pago:{' '}
                <strong>{formatCurrencyWithCode(montoTotalNum)}</strong>
              </Typography>
              <Button size="small" variant="outlined" onClick={handleAutoDistribuir}>
                Auto-distribuir
              </Button>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Deuda restante</TableCell>
                    <TableCell align="right" sx={{ minWidth: 140 }}>Importe a imputar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remitosFiltrados.map((rem) => {
                    const id = rem.id || rem._id;
                    const deuda = (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0);
                    return (
                      <TableRow key={id}>
                        <TableCell>{formatTimestamp(rem.fecha_factura)}</TableCell>
                        <TableCell>{rem.categoria || '—'}</TableCell>
                        <TableCell align="right">{formatCurrencyWithCode(deuda)}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={importes[id] ?? ''}
                            onChange={(e) => handleMontoChange(id, e.target.value)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            sx={{ width: 130 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
              <Typography
                variant="body2"
                color={importesValidos ? 'success.main' : 'error.main'}
              >
                {importesValidos
                  ? 'Distribución completa ✓'
                  : `Restante por asignar: ${formatCurrencyWithCode(diferencia)}`}
              </Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>

        {step === 1 && (
          <Button
            variant="contained"
            disabled={selectedIds.size === 0 || montoTotalNum <= 0 || !fechaPago || loading}
            onClick={() => puedeConfirmarDirecto ? handleConfirmarDirecto() : setStep(2)}
            startIcon={loading && puedeConfirmarDirecto ? <CircularProgress size={16} /> : null}
          >
            {puedeConfirmarDirecto ? 'Confirmar pago' : 'Siguiente — distribuir'}
          </Button>
        )}

        {step === 2 && (
          <>
            <Button onClick={() => setStep(1)} disabled={loading}>Atrás</Button>
            <Button
              variant="contained"
              disabled={!importesValidos || loading}
              onClick={handleConfirmar}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              Confirmar pago
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
