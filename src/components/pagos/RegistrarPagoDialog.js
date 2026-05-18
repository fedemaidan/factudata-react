/**
 * RegistrarPagoDialog — registra un nuevo pago a proveedor con stepper de 3 pasos:
 *   Paso 0: Datos del pago (fecha, monto, método, retenciones)
 *   Paso 1: Imputar a facturas (opcional, distribución FIFO)
 *   Paso 2: Adjuntar comprobantes (opcional)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
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
  Select,
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
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import pagoProveedorService from 'src/services/pagoProveedorService';
import monedasService from 'src/services/monedasService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTodayString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const PASOS = ['Datos del pago', 'Imputar a facturas', 'Comprobantes'];

const METODOS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' },
];

const MONEDAS = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'USD' },
];

/**
 * Distribuye el monto total entre los remitos seleccionados de forma FIFO.
 * Devuelve un array { movimiento_id, monto_imputado }.
 */
const distribuirFIFO = (remitosSeleccionados, montoTotal) => {
  let restante = montoTotal;
  return remitosSeleccionados.map((rem) => {
    const id = rem._id || rem.id;
    const deuda = Math.max(0, (rem.total || 0) - (rem.monto_pagado || 0));
    const asignado = Math.min(deuda, restante);
    restante = Math.max(0, restante - asignado);
    return { movimiento_id: id, monto_imputado: asignado };
  });
};

// ─── Componente ───────────────────────────────────────────────────────────────

const RegistrarPagoDialog = ({
  open,
  onClose,
  onSuccess,
  empresaId,
  proveedor,
  proveedorId,
  remitos = [],
  remitoInicial = null,
}) => {
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Paso 0: Datos del pago ─────────────────────────────────────────────────
  const [fechaPago, setFechaPago] = useState(getTodayString);
  const [metodo, setMetodo] = useState('transferencia');
  const [nroComprobante, setNroComprobante] = useState('');
  const [montoBruto, setMontoBruto] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [tipoCambio, setTipoCambio] = useState('');
  const [tipoCambioEsManual, setTipoCambioEsManual] = useState(false);
  const [tipoCambioDia, setTipoCambioDia] = useState(null);
  const [notas, setNotas] = useState('');
  const [retencionesOpen, setRetencionesOpen] = useState(false);
  const [retenciones, setRetenciones] = useState([]);

  // ── Paso 1: Imputaciones ───────────────────────────────────────────────────
  const remitosPendientes = useMemo(() => remitos.filter((r) => r.estado !== 'Pagado'), [remitos]);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [imputaciones, setImputaciones] = useState([]);

  // ── Paso 2: Comprobantes ───────────────────────────────────────────────────
  const [archivos, setArchivos] = useState([]);

  // ── Reiniciar estado al abrir ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setPaso(0);
    setLoading(false);
    setError(null);
    setFechaPago(getTodayString());
    setMetodo('transferencia');
    setNroComprobante('');
    setMontoBruto('');
    setMoneda('ARS');
    setTipoCambio('');
    setTipoCambioEsManual(false);
    setTipoCambioDia(null);
    setNotas('');
    setRetencionesOpen(false);
    setRetenciones([]);
    setArchivos([]);

    // Pre-seleccionar remito inicial si existe
    if (remitoInicial) {
      const id = remitoInicial._id || remitoInicial.id;
      setSeleccionados(new Set([id]));
    } else {
      const ids = remitosPendientes.map((r) => r._id || r.id);
      setSeleccionados(new Set(ids));
    }
  }, [open]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar tipo de cambio del día cuando moneda = USD ─────────────────────
  useEffect(() => {
    if (!open || moneda !== 'USD') return;
    let cancelled = false;
    const cargarTC = async () => {
      try {
        const resultado = await monedasService.obtenerDolar(fechaPago);
        if (cancelled) return;
        const valor = resultado?.oficial || resultado?.blue || resultado?.mep || null;
        setTipoCambioDia(valor);
        if (!tipoCambioEsManual && valor) {
          setTipoCambio(String(valor));
        }
      } catch (_) {
        // silencio — no hay cotización disponible
      }
    };
    cargarTC();
    return () => { cancelled = true; };
  }, [open, moneda, fechaPago]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calcular totales de retenciones ───────────────────────────────────────
  const totalRetenciones = useMemo(
    () => retenciones.reduce((sum, r) => sum + (parseFloat(r.monto) || 0), 0),
    [retenciones]
  );

  const montoNeto = useMemo(
    () => (parseFloat(montoBruto) || 0) - totalRetenciones,
    [montoBruto, totalRetenciones]
  );

  // ── Calcular sin imputar ──────────────────────────────────────────────────
  const totalImputado = useMemo(
    () => imputaciones.reduce((sum, i) => sum + (parseFloat(i.monto_imputado) || 0), 0),
    [imputaciones]
  );

  const sinImputar = useMemo(
    () => (parseFloat(montoBruto) || 0) - totalImputado,
    [montoBruto, totalImputado]
  );

  // ── Handlers retenciones ──────────────────────────────────────────────────
  const handleAgregarRetencion = useCallback(() => {
    setRetenciones((prev) => [...prev, { descripcion: '', porcentaje: '', monto: '' }]);
  }, []);

  const handleEliminarRetencion = useCallback((idx) => {
    setRetenciones((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCambiarRetencion = useCallback((idx, field, value) => {
    setRetenciones((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'porcentaje' && value !== '') {
        const pct = parseFloat(value);
        const base = parseFloat(montoBruto) || 0;
        if (Number.isFinite(pct) && base > 0) {
          next[idx].monto = String(Math.round(base * pct / 100 * 100) / 100);
        }
      }
      return next;
    });
  }, [montoBruto]);

  // ── Handlers selección imputaciones ───────────────────────────────────────
  const handleToggleSeleccion = useCallback((id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Auto-distribuir FIFO ──────────────────────────────────────────────────
  const handleAutoDistribuir = useCallback(() => {
    const selArr = remitosPendientes.filter((r) => seleccionados.has(r._id || r.id));
    const distribuidas = distribuirFIFO(selArr, parseFloat(montoBruto) || 0);
    setImputaciones(distribuidas);
  }, [remitosPendientes, seleccionados, montoBruto]);

  const handleCambiarImputacion = useCallback((idx, valor) => {
    setImputaciones((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], monto_imputado: valor };
      return next;
    });
  }, []);

  // ── Entrar al paso 1: auto-distribuir ────────────────────────────────────
  const handleAvanzarAPaso1 = useCallback(() => {
    const selArr = remitosPendientes.filter((r) => seleccionados.has(r._id || r.id));
    const distribuidas = distribuirFIFO(selArr, parseFloat(montoBruto) || 0);
    setImputaciones(distribuidas);
    setPaso(1);
  }, [remitosPendientes, seleccionados, montoBruto]);

  // ── Navegación ────────────────────────────────────────────────────────────
  const handleSiguiente = useCallback(() => {
    if (paso === 0) {
      handleAvanzarAPaso1();
    } else {
      setPaso((p) => p + 1);
    }
  }, [paso, handleAvanzarAPaso1]);

  const handleAtras = useCallback(() => {
    setPaso((p) => p - 1);
  }, []);

  const handleSaltarImputacion = useCallback(() => {
    setImputaciones([]);
    setPaso(2);
  }, []);

  // ── Validación paso 0 ─────────────────────────────────────────────────────
  const paso0Valido = useMemo(() => {
    const mb = parseFloat(montoBruto);
    return Number.isFinite(mb) && mb > 0 && !!fechaPago;
  }, [montoBruto, fechaPago]);

  // ── Confirmar ─────────────────────────────────────────────────────────────
  const handleConfirmar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const retencionesLimpias = retenciones.map((r) => ({
        descripcion: r.descripcion || null,
        porcentaje: r.porcentaje !== '' ? parseFloat(r.porcentaje) : null,
        monto: parseFloat(r.monto) || 0,
      }));

      const imputacionesLimpias = imputaciones
        .filter((i) => parseFloat(i.monto_imputado) > 0)
        .map((i) => ({
          movimiento_id: i.movimiento_id,
          monto_imputado: parseFloat(i.monto_imputado) || 0,
        }));

      const pagoData = {
        proveedor_id: proveedorId,
        fecha_pago: fechaPago,
        monto_bruto: parseFloat(montoBruto),
        moneda,
        tipo_cambio: tipoCambio !== '' ? parseFloat(tipoCambio) : null,
        tipo_cambio_es_manual: tipoCambioEsManual,
        metodo,
        nro_comprobante: nroComprobante || null,
        notas: notas || null,
        retenciones: retencionesLimpias,
        imputaciones: imputacionesLimpias,
      };

      const pago = await pagoProveedorService.registrar(empresaId, pagoData);

      if (archivos.length > 0) {
        await pagoProveedorService.subirComprobantes(empresaId, pago._id, archivos);
      }

      onSuccess(pago);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  }, [
    retenciones, imputaciones, proveedorId, fechaPago, montoBruto,
    moneda, tipoCambio, tipoCambioEsManual, metodo, nroComprobante,
    notas, archivos, empresaId, onSuccess, onClose,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderPaso0 = () => (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Fecha del pago"
          type="date"
          size="small"
          fullWidth
          value={fechaPago}
          onChange={(e) => setFechaPago(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          label="Método de pago"
          select
          size="small"
          fullWidth
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
        >
          {METODOS.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <TextField
        label="N° comprobante (opcional)"
        size="small"
        fullWidth
        value={nroComprobante}
        onChange={(e) => setNroComprobante(e.target.value)}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Monto bruto"
          type="number"
          size="small"
          fullWidth
          required
          value={montoBruto}
          onChange={(e) => setMontoBruto(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="Moneda"
          select
          size="small"
          sx={{ minWidth: 100 }}
          value={moneda}
          onChange={(e) => {
            setMoneda(e.target.value);
            setTipoCambioEsManual(false);
          }}
        >
          {MONEDAS.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {moneda === 'USD' && (
        <TextField
          label="Tipo de cambio"
          type="number"
          size="small"
          fullWidth
          value={tipoCambio}
          onChange={(e) => {
            setTipoCambio(e.target.value);
            setTipoCambioEsManual(true);
          }}
          helperText={
            tipoCambioEsManual
              ? '(Manual)'
              : tipoCambioDia
                ? `(Del día: $${tipoCambioDia})`
                : 'Sin cotización disponible para esta fecha'
          }
          inputProps={{ min: 0, step: '0.01' }}
        />
      )}

      {/* Retenciones */}
      <Accordion
        expanded={retencionesOpen}
        onChange={(_, exp) => setRetencionesOpen(exp)}
        variant="outlined"
        sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600}>
            Retenciones {retenciones.length > 0 && `(${retenciones.length})`}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {retenciones.map((ret, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Descripción"
                  size="small"
                  value={ret.descripcion}
                  onChange={(e) => handleCambiarRetencion(idx, 'descripcion', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="% (opc.)"
                  type="number"
                  size="small"
                  value={ret.porcentaje}
                  onChange={(e) => handleCambiarRetencion(idx, 'porcentaje', e.target.value)}
                  inputProps={{ min: 0, max: 100, step: '0.01' }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Monto"
                  type="number"
                  size="small"
                  value={ret.monto}
                  onChange={(e) => handleCambiarRetencion(idx, 'monto', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  inputProps={{ min: 0, step: '0.01' }}
                  sx={{ flex: 1 }}
                />
                <Tooltip title="Eliminar retención">
                  <IconButton size="small" onClick={() => handleEliminarRetencion(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAgregarRetencion}
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            >
              Agregar retención
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Resumen */}
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Typography variant="body2">
            Bruto: <strong>{formatCurrencyWithCode(parseFloat(montoBruto) || 0)}</strong>
          </Typography>
          {totalRetenciones > 0 && (
            <Typography variant="body2">
              Retenciones: <strong>{formatCurrencyWithCode(totalRetenciones)}</strong>
            </Typography>
          )}
          <Typography variant="body2">
            Neto al proveedor: <strong>{formatCurrencyWithCode(montoNeto)}</strong>
          </Typography>
        </Stack>
      </Paper>

      <TextField
        label="Notas (opcional)"
        multiline
        rows={2}
        size="small"
        fullWidth
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
      />
    </Stack>
  );

  const renderPaso1 = () => {
    const remitosDisp = remitosPendientes;
    return (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Typography variant="body2">
              Monto disponible: <strong>{formatCurrencyWithCode(parseFloat(montoBruto) || 0)}</strong>
            </Typography>
            <Typography variant="body2">
              Imputado: <strong>{formatCurrencyWithCode(totalImputado)}</strong>
            </Typography>
            <Typography variant="body2" color={sinImputar > 0.005 ? 'warning.main' : 'success.main'}>
              Sin imputar: <strong>{formatCurrencyWithCode(sinImputar)}</strong>
            </Typography>
          </Stack>
        </Paper>

        {remitosDisp.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay facturas pendientes para este proveedor.
          </Typography>
        ) : (
          <>
            <Stack direction="row" justifyContent="flex-end">
              <Button size="small" variant="outlined" onClick={handleAutoDistribuir}>
                Auto-distribuir (FIFO)
              </Button>
            </Stack>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Categoría</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Deuda</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>A imputar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {imputaciones.map((imp, idx) => {
                    const rem = remitosDisp.find((r) => (r._id || r.id) === imp.movimiento_id);
                    if (!rem) return null;
                    const deuda = Math.max(0, (rem.total || 0) - (rem.monto_pagado || 0));
                    return (
                      <TableRow key={imp.movimiento_id}>
                        <TableCell>{formatTimestamp(rem.fecha_factura)}</TableCell>
                        <TableCell>{rem.categoria || '—'}</TableCell>
                        <TableCell align="right">{formatCurrencyWithCode(deuda)}</TableCell>
                        <TableCell align="right" sx={{ width: 140 }}>
                          <TextField
                            type="number"
                            size="small"
                            value={imp.monto_imputado}
                            onChange={(e) => handleCambiarImputacion(idx, e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            inputProps={{ min: 0, max: deuda, step: '0.01' }}
                            sx={{ width: 130 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {imputaciones.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                          Seleccioná facturas y hacé clic en Auto-distribuir
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Stack>
    );
  };

  const renderPaso2 = () => (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Podés adjuntar comprobantes ahora o más tarde.
      </Typography>
      <Button
        variant="outlined"
        component="label"
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Adjuntar archivos
        <input
          type="file"
          hidden
          multiple
          accept="image/*,.pdf"
          onChange={(e) => {
            const nuevos = Array.from(e.target.files || []);
            setArchivos((prev) => [...prev, ...nuevos]);
            e.target.value = '';
          }}
        />
      </Button>
      {archivos.length > 0 && (
        <Stack spacing={0.5}>
          {archivos.map((f, idx) => (
            <Stack key={idx} direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name} ({(f.size / 1024).toFixed(1)} KB)
              </Typography>
              <IconButton
                size="small"
                onClick={() => setArchivos((prev) => prev.filter((_, i) => i !== idx))}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Registrar pago — {proveedor}
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={paso} sx={{ mb: 3 }}>
          {PASOS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {paso === 0 && renderPaso0()}
        {paso === 1 && renderPaso1()}
        {paso === 2 && renderPaso2()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {paso === 1 && (
            <Button size="small" variant="text" color="inherit" onClick={handleSaltarImputacion}>
              Saltar — no imputar ahora
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {paso > 0 && (
            <Button onClick={handleAtras} disabled={loading}>
              Atrás
            </Button>
          )}
          <Button variant="outlined" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {paso < PASOS.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSiguiente}
              disabled={paso === 0 && !paso0Valido}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConfirmar}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Guardando…' : 'Confirmar pago'}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default RegistrarPagoDialog;
