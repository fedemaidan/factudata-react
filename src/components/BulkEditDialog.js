import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Autocomplete, Stack, Typography, Chip, InputAdornment,
  Box, Alert, LinearProgress, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import movimientosService from 'src/services/movimientosService';

// ── Operaciones disponibles ──
const IMPORTE_OPS = [
  { value: 'set',  label: 'Fijar en',       symbol: '=' },
  { value: 'add',  label: 'Sumar',          symbol: '+' },
  { value: 'sub',  label: 'Restar',         symbol: '−' },
  { value: 'mul',  label: 'Multiplicar por', symbol: '×' },
  { value: 'div',  label: 'Dividir por',    symbol: '÷' },
  { value: 'pct',  label: 'Ajustar %',      symbol: '%' },
];

const FECHA_OPS = [
  { value: 'set',      label: 'Fijar en',    symbol: '📅' },
  { value: 'add_days', label: 'Sumar días',  symbol: '+' },
  { value: 'sub_days', label: 'Restar días', symbol: '−' },
];

// ── Campos editables en modo masivo ──
const BULK_FIELDS = [
  { name: 'total',            label: 'Importe',               type: 'operation_number' },
  { name: 'fecha_creacion',   label: 'Fecha',                 type: 'operation_date' },
  { name: 'nombre_proveedor', label: 'Proveedor',              type: 'autocomplete', optionsKey: 'proveedores' },
  { name: 'categoria',        label: 'Categoría',              type: 'select',       optionsKey: 'categorias' },
  { name: 'subcategoria',     label: 'Subcategoría',           type: 'select',       optionsKey: 'subcategorias' },
  { name: 'type',             label: 'Tipo',                   type: 'select',       options: ['ingreso', 'egreso'] },
  { name: 'moneda',           label: 'Moneda',                 type: 'select',       options: ['ARS', 'USD'] },
  { name: 'medio_pago',       label: 'Medio de Pago',          type: 'select',       optionsKey: 'mediosPago' },
  { name: 'estado',           label: 'Estado',                 type: 'select',       options: ['Pendiente', 'Pagado'], visibleIf: (empresa) => empresa?.con_estados },
  { name: 'cuenta_interna',   label: 'Cuenta Interna',         type: 'select',       optionsKey: 'cuentasInternas' },
  { name: 'obra',             label: 'Obra',                   type: 'autocomplete', optionsKey: 'obras' },
  { name: 'cliente',          label: 'Cliente',                type: 'autocomplete', optionsKey: 'clientes' },
  { name: 'etapa',            label: 'Etapa',                  type: 'autocomplete', optionsKey: 'etapas' },
  { name: 'empresa_facturacion', label: 'Empresa Facturación', type: 'select',       optionsKey: 'subempresas' },
  { name: 'observacion',      label: 'Observación',            type: 'text' },
];

const POLL_INTERVAL = 3000; // 3 segundos

/**
 * BulkEditDialog
 * Props:
 *  - open, onClose, selectedCount, selectedIds (Set)
 *  - onDone: () => void — callback cuando el job terminó (para refresh + limpiar selección)
 *  - options, empresa
 */
const BulkEditDialog = ({ open, onClose, selectedCount, selectedIds, onDone, options = {}, empresa }) => {
  const [selectedFields, setSelectedFields] = useState([]);
  const [values, setValues] = useState({});
  const [phase, setPhase] = useState('form'); // 'form' | 'polling' | 'done' | 'error'
  const [job, setJob] = useState(null);       // { total, completed, errors, status, result }
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef(null);

  const visibleFields = useMemo(() =>
    BULK_FIELDS.filter((f) => !f.visibleIf || f.visibleIf(empresa)),
    [empresa]
  );

  const getOptions = (field) => {
    if (field.options) return field.options;
    if (field.optionsKey && options[field.optionsKey]) return options[field.optionsKey];
    if (field.optionsKey === 'subempresas') {
      const list = empresa?.subempresas || empresa?.sub_empresas || [];
      return list.map((s) => (typeof s === 'string' ? s : s?.nombre || s?.razon_social || '')).filter(Boolean);
    }
    if (field.optionsKey === 'cuentasInternas') return empresa?.cuentas || [];
    if (field.optionsKey === 'obras') return options.obras || [];
    if (field.optionsKey === 'clientes') return options.clientes || [];
    return [];
  };

  const handleToggleField = (fieldName) => {
    setSelectedFields((prev) => {
      if (prev.includes(fieldName)) {
        const next = prev.filter((f) => f !== fieldName);
        setValues((v) => { const copy = { ...v }; delete copy[fieldName]; return copy; });
        return next;
      }
      // Inicializar operación por defecto para campos con operación
      const fieldDef = visibleFields.find((f) => f.name === fieldName);
      if (fieldDef?.type === 'operation_number') {
        setValues((v) => ({ ...v, [fieldName]: { op: 'set', value: '' } }));
      } else if (fieldDef?.type === 'operation_date') {
        setValues((v) => ({ ...v, [fieldName]: { op: 'set', value: null } }));
      }
      return [...prev, fieldName];
    });
  };

  const setValue = (name, val) => setValues((prev) => ({ ...prev, [name]: val }));
  const setOpField = (name, key, val) => setValues((prev) => ({
    ...prev,
    [name]: { ...(prev[name] || {}), [key]: val },
  }));

  // ── Polling ──
  const startPolling = useCallback((jobId) => {
    const poll = async () => {
      const status = await movimientosService.getJobStatus(jobId);
      if (!status) return; // Error de red, reintentar en el próximo tick

      setJob(status);

      if (status.status === 'done') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPhase('done');
      } else if (status.status === 'error') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPhase('error');
        setErrorMsg('Error en el procesamiento del servidor');
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL);
    // Primera consulta inmediata
    poll();
  }, []);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Enviar ──
  const handleApply = async () => {
    const campos = {};
    selectedFields.forEach((name) => {
      const fieldDef = visibleFields.find((f) => f.name === name);
      const val = values[name];
      if (fieldDef?.type === 'operation_number') {
        if (val?.op && val?.value !== '' && val?.value !== undefined) {
          campos[name] = { op: val.op, value: parseFloat(val.value) };
        }
      } else if (fieldDef?.type === 'operation_date') {
        if (val?.op && val?.value !== null && val?.value !== '' && val?.value !== undefined) {
          if (val.op === 'set') {
            // Enviar como timestamp en milisegundos
            campos[name] = { op: 'set', value: new Date(val.value).getTime() };
          } else {
            campos[name] = { op: val.op, value: parseInt(val.value, 10) };
          }
        }
      } else if (val !== undefined && val !== '') {
        campos[name] = val;
      }
    });
    if (Object.keys(campos).length === 0) return;

    setPhase('polling');
    setJob({ total: selectedCount, completed: 0, errors: [], status: 'pending' });
    setErrorMsg('');

    const ids = [...selectedIds];
    const result = await movimientosService.bulkUpdate(ids, campos);

    if (!result.ok) {
      setPhase('error');
      setErrorMsg(result.error || 'No se pudo iniciar la edición masiva');
      return;
    }

    // Iniciar polling
    startPolling(result.jobId);
  };

  // ── Cerrar ──
  const handleClose = () => {
    if (phase === 'polling') return; // no cerrar mientras procesa
    if (pollRef.current) clearInterval(pollRef.current);
    setSelectedFields([]);
    setValues({});
    setPhase('form');
    setJob(null);
    setErrorMsg('');
    if (phase === 'done') onDone?.();
    onClose();
  };

  const renderFieldInput = (field) => {
    const opts = getOptions(field);

    // ── Importe con operación ──
    if (field.type === 'operation_number') {
      const opVal = values[field.name] || { op: 'set', value: '' };
      const currentOp = IMPORTE_OPS.find((o) => o.value === opVal.op);
      const helperText = opVal.op === 'pct'
        ? 'Ej: 10 = sumar 10%, -15 = restar 15%'
        : opVal.op === 'mul' || opVal.op === 'div'
          ? 'Factor numérico'
          : '';
      return (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            {field.label}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={opVal.op}
                onChange={(e) => setOpField(field.name, 'op', e.target.value)}
              >
                {IMPORTE_OPS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, width: 18, textAlign: 'center' }}>{o.symbol}</Typography>
                      <Typography variant="body2">{o.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              placeholder={opVal.op === 'set' ? 'Nuevo importe' : 'Valor'}
              value={opVal.value}
              onChange={(e) => setOpField(field.name, 'value', e.target.value)}
              helperText={helperText}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: currentOp ? (
                  <InputAdornment position="start">{currentOp.symbol}</InputAdornment>
                ) : null,
              }}
            />
          </Stack>
        </Box>
      );
    }

    // ── Fecha con operación ──
    if (field.type === 'operation_date') {
      const opVal = values[field.name] || { op: 'set', value: null };
      return (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            {field.label}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={opVal.op}
                onChange={(e) => {
                  const newOp = e.target.value;
                  setOpField(field.name, 'op', newOp);
                  // Resetear valor al cambiar tipo de operación
                  setOpField(field.name, 'value', newOp === 'set' ? null : '');
                }}
              >
                {FECHA_OPS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, width: 18, textAlign: 'center' }}>{o.symbol}</Typography>
                      <Typography variant="body2">{o.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {opVal.op === 'set' ? (
              <DatePicker
                value={opVal.value ? new Date(opVal.value) : null}
                onChange={(date) => setOpField(field.name, 'value', date)}
                slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
                format="dd/MM/yyyy"
              />
            ) : (
              <TextField
                size="small"
                type="number"
                placeholder="Cantidad de días"
                value={opVal.value}
                onChange={(e) => setOpField(field.name, 'value', e.target.value)}
                sx={{ flex: 1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">días</InputAdornment>,
                }}
              />
            )}
          </Stack>
        </Box>
      );
    }

    if (field.type === 'select') {
      return (
        <FormControl fullWidth size="small">
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)}>
            {opts.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </Select>
        </FormControl>
      );
    }
    if (field.type === 'autocomplete') {
      return (
        <Autocomplete freeSolo size="small" options={opts} value={values[field.name] || ''}
          onChange={(_, val) => setValue(field.name, val || '')}
          renderInput={(params) => <TextField {...params} label={field.label} />}
        />
      );
    }
    return (
      <TextField fullWidth size="small" label={field.label}
        value={values[field.name] || ''} onChange={(e) => setValue(field.name, e.target.value)}
      />
    );
  };

  const canApply = selectedFields.length > 0 && selectedFields.some((n) => {
    const fieldDef = visibleFields.find((f) => f.name === n);
    const val = values[n];
    if (fieldDef?.type === 'operation_number') return val?.op && val?.value !== '' && val?.value !== undefined;
    if (fieldDef?.type === 'operation_date') return val?.op && val?.value !== null && val?.value !== '' && val?.value !== undefined;
    return val !== undefined && val !== '';
  });
  const progress = job ? Math.round((job.completed / Math.max(job.total, 1)) * 100) : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={phase === 'polling'}>
      <DialogTitle>
        Edición masiva
        <Typography variant="body2" color="text.secondary">
          {selectedCount} movimiento{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* ── Estado: Polling / Progreso ── */}
        {(phase === 'polling' || phase === 'done') && job && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {phase === 'done' ? 'Completado' : 'Procesando...'}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {job.completed} / {job.total}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={phase === 'done' ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
            {job.errors?.length > 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {job.errors.length} error{job.errors.length !== 1 ? 'es' : ''}
              </Typography>
            )}
          </Box>
        )}

        {phase === 'done' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {job?.result?.ok || job?.completed} movimiento{(job?.result?.ok || job?.completed) !== 1 ? 's' : ''} actualizado{(job?.result?.ok || job?.completed) !== 1 ? 's' : ''} correctamente
            {job?.result?.errores > 0 ? ` (${job.result.errores} con error)` : ''}
          </Alert>
        )}

        {phase === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* ── Formulario (solo en fase form) ── */}
        {phase === 'form' && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Elegí qué campos querés modificar:
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {visibleFields.map((field) => (
                <Chip
                  key={field.name}
                  label={field.label}
                  size="small"
                  variant={selectedFields.includes(field.name) ? 'filled' : 'outlined'}
                  color={selectedFields.includes(field.name) ? 'primary' : 'default'}
                  onClick={() => handleToggleField(field.name)}
                  clickable
                />
              ))}
            </Box>

            {selectedFields.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Nuevos valores:
                </Typography>
                <Stack spacing={2}>
                  {selectedFields.map((name) => {
                    const field = visibleFields.find((f) => f.name === name);
                    if (!field) return null;
                    return <Box key={name}>{renderFieldInput(field)}</Box>;
                  })}
                </Stack>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {phase === 'form' && (
          <>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button variant="contained" onClick={handleApply} disabled={!canApply}>
              Aplicar a {selectedCount} movimiento{selectedCount !== 1 ? 's' : ''}
            </Button>
          </>
        )}
        {phase === 'polling' && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
            No cierres esta ventana...
          </Typography>
        )}
        {(phase === 'done' || phase === 'error') && (
          <Button variant="contained" onClick={handleClose}>
            Cerrar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkEditDialog;
