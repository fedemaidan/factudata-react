/**
 * RegistrarPagoDialog — registra un Pago a proveedor con retenciones,
 * imputaciones a movimientos y comprobantes adjuntos.
 *
 * Flujo en 3 pasos con Stepper:
 *   0. Datos del pago (fecha, monto, moneda, método, retenciones)
 *   1. Imputación a facturas pendientes (opcional)
 *   2. Comprobantes adjuntos (opcional)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import pagoProveedorService from 'src/services/pagoProveedorService';
import monedasService from 'src/services/monedasService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeAmount = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const parsed = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STEPS = ['Datos del pago', 'Imputar a facturas', 'Comprobantes'];

const METODOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RegistrarPagoDialog({
  open,
  onClose,
  onSuccess,
  empresaId,
  proveedor,
  proveedorId,
  remitos = [],
  remitoInicial = null,
}) {
  const [activeStep, setActiveStep] = useState(0);

  // Paso 0
  const [fechaPago, setFechaPago] = useState(todayISO());
  const [montoBruto, setMontoBruto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [tipoCambio, setTipoCambio] = useState('');
  const [tipoCambioDelDia, setTipoCambioDelDia] = useState(null);
  const [tipoCambioEsManual, setTipoCambioEsManual] = useState(false);
  const [metodo, setMetodo] = useState('transferencia');
  const [nroComprobante, setNroComprobante] = useState('');
  const [notas, setNotas] = useState('');
  const [retenciones, setRetenciones] = useState([]);

  // Paso 1 — Imputaciones
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [importes, setImportes] = useState({});

  // Paso 2 — Comprobantes
  const [archivos, setArchivos] = useState([]);

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const montoBrutoNum = normalizeAmount(montoBruto) || 0;
  const totalRetenciones = useMemo(
    () => retenciones.reduce((sum, r) => sum + (normalizeAmount(r.monto) || 0), 0),
    [retenciones]
  );
  const montoNetoProveedor = Math.max(0, montoBrutoNum - totalRetenciones);

  const remitosSeleccionados = useMemo(
    () => remitos.filter((r) => selectedIds.has(r.id || r._id)),
    [remitos, selectedIds]
  );
  const sumaImputado = useMemo(
    () => Object.values(importes).reduce((acc, v) => acc + (normalizeAmount(v) || 0), 0),
    [importes]
  );
  const montoSinImputar = Math.max(0, montoBrutoNum - sumaImputado);

  // ── Reset al abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setFechaPago(todayISO());
    setMontoBruto('');
    setMoneda('ARS');
    setTipoCambio('');
    setTipoCambioDelDia(null);
    setTipoCambioEsManual(false);
    setMetodo('transferencia');
    setNroComprobante('');
    setNotas('');
    setRetenciones([]);
    setImportes({});
    setArchivos([]);
    setError(null);

    // Selección inicial de remitos
    if (remitoInicial) {
      const rid = remitoInicial.id || remitoInicial._id;
      setSelectedIds(new Set([rid]));
    } else {
      setSelectedIds(new Set(remitos.map((r) => r.id || r._id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Cotización del día al cambiar a USD ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (moneda !== 'USD') return;
    if (tipoCambioEsManual) return;

    const cargarCotizacion = async () => {
      try {
        const dolar = await monedasService.obtenerDolar(fechaPago);
        const valor = dolar?.blue?.venta ?? dolar?.oficial?.venta ?? dolar?.mep?.venta ?? null;
        if (valor) {
          setTipoCambioDelDia(valor);
          setTipoCambio(String(valor));
        }
      } catch (_) {
        // sin cotización del día — el usuario carga manualmente
      }
    };
    cargarCotizacion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, fechaPago, open]);

  // ── Distribución FIFO automática al entrar al paso 1 ──────────────────────
  useEffect(() => {
    if (activeStep !== 1) return;
    if (Object.keys(importes).length > 0) return; // no sobreescribir
    let restante = montoBrutoNum;
    const nuevo = {};
    for (const rem of remitosSeleccionados) {
      if (restante <= 0) break;
      const deuda = Math.max(0, (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0));
      const asignar = Math.min(restante, deuda);
      if (asignar > 0) {
        nuevo[rem.id || rem._id] = String(asignar.toFixed(2));
        restante -= asignar;
      }
    }
    setImportes(nuevo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTipoCambioChange = (e) => {
    setTipoCambio(e.target.value);
    setTipoCambioEsManual(true);
  };

  const handleToggleRemito = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleImporteChange = (id, value) => {
    setImportes((prev) => ({ ...prev, [id]: value }));
  };

  const handleAutoDistribuir = () => {
    let restante = montoBrutoNum;
    const nuevo = {};
    for (const rem of remitosSeleccionados) {
      if (restante <= 0) break;
      const deuda = Math.max(0, (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0));
      const asignar = Math.min(restante, deuda);
      if (asignar > 0) {
        nuevo[rem.id || rem._id] = String(asignar.toFixed(2));
        restante -= asignar;
      }
    }
    setImportes(nuevo);
  };

  // Retenciones
  const handleAddRetencion = () => {
    setRetenciones((prev) => [...prev, { descripcion: '', porcentaje: '', monto: '' }]);
  };
  const handleRemoveRetencion = (idx) => {
    setRetenciones((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleRetencionChange = (idx, field, value) => {
    setRetenciones((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      // si cambian el porcentaje, recalcular monto
      if (field === 'porcentaje' && montoBrutoNum > 0) {
        const pct = normalizeAmount(value);
        if (pct != null) {
          updated.monto = ((montoBrutoNum * pct) / 100).toFixed(2);
        }
      }
      return updated;
    }));
  };

  // Archivos
  const handleAddArchivos = (e) => {
    const files = Array.from(e.target.files || []);
    setArchivos((prev) => [...prev, ...files]);
    e.target.value = ''; // permite re-seleccionar el mismo archivo
  };
  const handleRemoveArchivo = (idx) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Navegación
  const canProceedStep0 = montoBrutoNum > 0 && fechaPago && (moneda === 'ARS' || normalizeAmount(tipoCambio));

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  // Submit final
  const handleConfirmar = async () => {
    setError(null);
    setLoading(true);
    try {
      const imputaciones = remitosSeleccionados
        .map((rem) => {
          const id = rem.id || rem._id;
          const monto = normalizeAmount(importes[id]);
          if (!monto || monto <= 0) return null;
          return { movimiento_id: id, monto_imputado: monto };
        })
        .filter(Boolean);

      const retencionesPayload = retenciones
        .map((r) => ({
          descripcion: r.descripcion?.trim() || null,
          porcentaje: normalizeAmount(r.porcentaje),
          monto: normalizeAmount(r.monto) || 0,
        }))
        .filter((r) => r.monto > 0);

      const payload = {
        proveedor_id: proveedorId,
        fecha_pago: fechaPago,
        monto_bruto: montoBrutoNum,
        moneda,
        tipo_cambio: moneda === 'USD' ? normalizeAmount(tipoCambio) : null,
        tipo_cambio_es_manual: moneda === 'USD' ? tipoCambioEsManual : false,
        metodo,
        nro_comprobante: nroComprobante.trim() || null,
        notas: notas.trim() || null,
        retenciones: retencionesPayload,
        imputaciones,
      };

      const pago = await pagoProveedorService.registrar(empresaId, payload);

      if (archivos.length > 0) {
        await pagoProveedorService.subirComprobantes(empresaId, pago._id, archivos);
      }

      onSuccess?.(pago);
      onClose?.();
    } catch (err) {
      console.error('Error registrando pago:', err);
      setError(err.response?.data?.error || 'Ocurrió un error al registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Registrar pago — <Typography component="span" fontWeight={700}>{proveedor}</Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ───── PASO 0: Datos del pago ─────────────────────────────────────── */}
        {activeStep === 0 && (
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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Monto bruto"
                type="number"
                value={montoBruto}
                onChange={(e) => setMontoBruto(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
                autoFocus
              />
              <TextField
                select
                label="Moneda"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
            </Stack>

            {moneda === 'USD' && (
              <TextField
                label="Tipo de cambio"
                type="number"
                value={tipoCambio}
                onChange={handleTipoCambioChange}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                helperText={
                  tipoCambioEsManual
                    ? `Manual${tipoCambioDelDia ? ` (Cotización del día: $${tipoCambioDelDia})` : ''}`
                    : tipoCambioDelDia
                      ? `Cotización del día`
                      : 'Cargá manualmente — no hay cotización del día disponible'
                }
                fullWidth
              />
            )}

            <TextField
              label="Nro de comprobante"
              value={nroComprobante}
              onChange={(e) => setNroComprobante(e.target.value)}
              helperText="CBU, nro de cheque, transferencia, etc."
              fullWidth
            />

            <TextField
              label="Notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />

            {/* Retenciones */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Retenciones {retenciones.length > 0 && `(${retenciones.length})`}
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddRetencion}>
                  Agregar
                </Button>
              </Stack>

              {retenciones.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Sin retenciones aplicadas.
                </Typography>
              )}

              {retenciones.map((r, idx) => (
                <Stack key={idx} direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Descripción"
                    value={r.descripcion}
                    onChange={(e) => handleRetencionChange(idx, 'descripcion', e.target.value)}
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    placeholder="%"
                    value={r.porcentaje}
                    onChange={(e) => handleRetencionChange(idx, 'porcentaje', e.target.value)}
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    sx={{ width: 100 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Monto"
                    value={r.monto}
                    onChange={(e) => handleRetencionChange(idx, 'monto', e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    sx={{ width: 130 }}
                  />
                  <IconButton size="small" onClick={() => handleRemoveRetencion(idx)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Box>

            {/* Resumen */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Bruto</Typography>
                <Typography variant="body2" fontWeight={500}>{formatCurrencyWithCode(montoBrutoNum)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Retenciones</Typography>
                <Typography variant="body2" fontWeight={500}>− {formatCurrencyWithCode(totalRetenciones)}</Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>Neto al proveedor</Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formatCurrencyWithCode(montoNetoProveedor)}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* ───── PASO 1: Imputaciones ───────────────────────────────────────── */}
        {activeStep === 1 && (
          <Stack spacing={2}>
            {remitos.length === 0 ? (
              <Alert severity="info">
                Este proveedor no tiene facturas pendientes. El pago quedará sin imputar — podés imputarlo más tarde.
              </Alert>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Monto del pago: <strong>{formatCurrencyWithCode(montoBrutoNum)}</strong>
                  </Typography>
                  <Button size="small" variant="outlined" onClick={handleAutoDistribuir}>
                    Auto-distribuir
                  </Button>
                </Stack>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>Fecha</TableCell>
                        <TableCell>Categoría</TableCell>
                        <TableCell align="right">Deuda</TableCell>
                        <TableCell align="right" sx={{ minWidth: 140 }}>A imputar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {remitos.map((rem) => {
                        const id = rem.id || rem._id;
                        const isSelected = selectedIds.has(id);
                        const deuda = Math.max(0, (Number(rem.total) || 0) - (Number(rem.monto_pagado) || 0));
                        return (
                          <TableRow key={id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                onChange={() => handleToggleRemito(id)}
                              />
                            </TableCell>
                            <TableCell>{formatTimestamp(rem.fecha_factura)}</TableCell>
                            <TableCell>{rem.categoria || '—'}</TableCell>
                            <TableCell align="right">{formatCurrencyWithCode(deuda)}</TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={importes[id] ?? ''}
                                onChange={(e) => handleImporteChange(id, e.target.value)}
                                disabled={!isSelected}
                                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                                sx={{ width: 130 }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Imputado: <strong>{formatCurrencyWithCode(sumaImputado)}</strong>
                  </Typography>
                  <Typography
                    variant="body2"
                    color={montoSinImputar > 0.005 ? 'warning.main' : 'success.main'}
                    fontWeight={600}
                  >
                    Sin imputar: {formatCurrencyWithCode(montoSinImputar)}
                  </Typography>
                </Stack>

                {montoSinImputar > 0.005 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    El monto sin imputar quedará registrado en el pago. Podés imputarlo más tarde.
                  </Alert>
                )}
              </>
            )}
          </Stack>
        )}

        {/* ───── PASO 2: Comprobantes ───────────────────────────────────────── */}
        {activeStep === 2 && (
          <Stack spacing={2}>
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<AttachFileIcon />}
              >
                Adjuntar archivos
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleAddArchivos}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Imágenes (JPG, PNG, WEBP) o PDF. Podés adjuntarlos más tarde si querés.
              </Typography>
            </Box>

            {archivos.length > 0 && (
              <Stack spacing={1}>
                {archivos.map((file, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{file.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleRemoveArchivo(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* Resumen final */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Resumen</Typography>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Proveedor</Typography>
                <Typography variant="body2">{proveedor}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Fecha</Typography>
                <Typography variant="body2">{fechaPago}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Monto bruto</Typography>
                <Typography variant="body2">{formatCurrencyWithCode(montoBrutoNum)} {moneda}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Retenciones</Typography>
                <Typography variant="body2">− {formatCurrencyWithCode(totalRetenciones)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={700}>Neto al proveedor</Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formatCurrencyWithCode(montoNetoProveedor)}
                </Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Imputado</Typography>
                <Typography variant="body2">{formatCurrencyWithCode(sumaImputado)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Sin imputar</Typography>
                <Typography variant="body2" color={montoSinImputar > 0.005 ? 'warning.main' : 'text.primary'}>
                  {formatCurrencyWithCode(montoSinImputar)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Comprobantes</Typography>
                <Chip size="small" label={archivos.length} />
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>Atrás</Button>
        )}
        {activeStep < STEPS.length - 1 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && !canProceedStep0}
          >
            Siguiente
          </Button>
        )}
        {activeStep === STEPS.length - 1 && (
          <Button
            variant="contained"
            onClick={handleConfirmar}
            disabled={loading || !canProceedStep0}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            Confirmar pago
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
