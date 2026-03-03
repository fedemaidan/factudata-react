import React, { useMemo } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  MONEDAS,
  formatCurrency,
  formatPct,
  TEXTO_NOTAS_DEFAULT,
  formatNumberForInput,
  parseNumberInput,
  handleNumericKeyDown,
} from './constants';
import { sumaIncidenciasObjetivo } from './incidenciaHelpers';

const COEF_PATIOS_DEFAULT = 0.5;

const computeSupPonderada = (supCubierta, supPatios, coefPatios) => {
  const a = Number(supCubierta) || 0;
  const b = Number(supPatios) || 0;
  const c = Number(coefPatios) >= 0 ? (Number(coefPatios) || COEF_PATIOS_DEFAULT) : COEF_PATIOS_DEFAULT;
  if (a < 0 || b < 0) return null;
  const result = a + b * c;
  return Math.round(result * 100) / 100;
};

const AnalisisSuperficiesBlock = ({ form, onFormChange }) => {
  const as = form.analisis_superficies || {};
  const supCubierta = as.sup_cubierta_m2 ?? '';
  const supPatios = as.sup_patios_m2 ?? '';
  const coefPatios = as.coef_patios ?? COEF_PATIOS_DEFAULT;

  const supPonderada = useMemo(() => {
    const computed = computeSupPonderada(supCubierta, supPatios, coefPatios);
    return computed !== null ? computed : '';
  }, [supCubierta, supPatios, coefPatios]);

  const handleChange = (field, value) => {
    const next = { ...as, [field]: value };
    const nextSupCubierta = field === 'sup_cubierta_m2' ? value : supCubierta;
    const nextSupPatios = field === 'sup_patios_m2' ? value : supPatios;
    const nextCoefPatios = field === 'coef_patios' ? value : coefPatios;
    const nextPonderada = computeSupPonderada(nextSupCubierta, nextSupPatios, nextCoefPatios);
    if (nextPonderada !== null) next.sup_ponderada_m2 = nextPonderada;
    onFormChange({ ...form, analisis_superficies: next });
  };

  const handleBlur = (field, value) => {
    const num = parseNumberInput(value) ?? Number(value);
    if (value !== '' && num !== null && !Number.isNaN(num) && num < 0) {
      handleChange(field, 0);
    }
  };

  return (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Análisis de superficies (opcional)
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
        <TextField
          size="small"
          label="Sup. cubierta (m²)"
          value={formatNumberForInput(supCubierta, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('sup_cubierta_m2', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('sup_cubierta_m2', v);
          }}
          onBlur={(e) => handleBlur('sup_cubierta_m2', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Sup. patios (m²)"
          value={formatNumberForInput(supPatios, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('sup_patios_m2', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('sup_patios_m2', v);
          }}
          onBlur={(e) => handleBlur('sup_patios_m2', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Coef. patios"
          value={formatNumberForInput(coefPatios, 2)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              handleChange('coef_patios', '');
              return;
            }
            const v = parseNumberInput(raw);
            if (v !== null) handleChange('coef_patios', v);
          }}
          onBlur={(e) => handleBlur('coef_patios', e.target.value)}
          onKeyDown={handleNumericKeyDown}
          helperText="Ponderación de superficie de patios"
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
        />
        <TextField
          size="small"
          label="Sup. ponderada (m²)"
          value={supPonderada !== '' ? formatNumberForInput(supPonderada, 2) : ''}
          disabled
          inputProps={{ readOnly: true }}
        />
      </Stack>
    </>
  );
};

const PresupuestoFormDialog = ({
  open,
  onClose,
  isEdit,
  form,
  onFormChange,
  proyectos = [],
  plantillas = [],
  totalVivo,
  totalObjetivo = '',
  saving,
  onSave,
  onProyectoChange,
  onAplicarPlantilla,
  modoDistribuir = false,
  onModoDistribuirChange,
  onDistribuirPorTotal,
  onUpdateIncidenciaObjetivo,
  addRubro,
  removeRubro,
  updateRubro,
  moveRubro,
  addTarea,
  removeTarea,
  updateTarea,
  focusRef,
}) => {
  const puedeDistribuirPorIncidencias = !isEdit;
  const sumaIncidencias = useMemo(() => sumaIncidenciasObjetivo(form.rubros), [form.rubros]);
  const sumaInvalida = sumaIncidencias > 100;
  const sumaBaja = sumaIncidencias < 100 && sumaIncidencias >= 0;

  return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle>{isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto Profesional'}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Título *"
            fullWidth
            value={form.titulo}
            onChange={(e) => onFormChange({ ...form, titulo: e.target.value })}
          />
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>Moneda</InputLabel>
            <Select
              value={form.moneda}
              label="Moneda"
              onChange={(e) => onFormChange({ ...form, moneda: e.target.value })}
            >
              {MONEDAS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Proyecto</InputLabel>
            <Select
              value={form.proyecto_id}
              label="Proyecto"
              onChange={(e) => onProyectoChange(e.target.value)}
            >
              <MenuItem value="">Sin proyecto</MenuItem>
              {proyectos.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Dirección de obra"
            fullWidth
            value={form.obra_direccion}
            onChange={(e) => onFormChange({ ...form, obra_direccion: e.target.value })}
          />
        </Stack>

        <Divider />

        {!isEdit && plantillas.length > 0 && (
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Cargar rubros desde plantilla</InputLabel>
              <Select
                value={form.plantilla_id || ''}
                label="Cargar rubros desde plantilla"
                onChange={(e) => onAplicarPlantilla(e.target.value)}
              >
                <MenuItem value="">Ninguna</MenuItem>
                {plantillas.filter((p) => p.activa).map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Reemplaza los rubros actuales con los de la plantilla.
            </Typography>
          </Stack>
        )}

        {puedeDistribuirPorIncidencias && (
          <FormControlLabel
            control={
              <Switch
                checked={modoDistribuir}
                onChange={(e) => onModoDistribuirChange?.(e.target.checked)}
              />
            }
            label="Distribuir por incidencias"
          />
        )}

        {modoDistribuir && puedeDistribuirPorIncidencias && (
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              label="Total neto"
              value={
                totalObjetivo !== ''
                  ? formatNumberForInput(totalObjetivo, 2)
                  : formatNumberForInput(totalVivo, 2)
              }
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onDistribuirPorTotal?.('');
                  return;
                }
                const v = parseNumberInput(raw);
                if (v !== null) onDistribuirPorTotal?.(String(v));
              }}
              onKeyDown={handleNumericKeyDown}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
              sx={{ width: 180 }}
            />
            {sumaInvalida && (
              <Typography variant="body2" color="error">
                La suma de incidencias supera 100%
              </Typography>
            )}
            {sumaBaja && !sumaInvalida && (
              <Typography variant="body2" color="warning.main">
                Falta {(100 - sumaIncidencias).toFixed(1)}% sin asignar
              </Typography>
            )}
          </Stack>
        )}

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              Rubros ({form.rubros.length})
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {!modoDistribuir && (
                <Typography variant="body2" color="text.secondary">
                  Total: {formatCurrency(totalVivo, form.moneda)}
                </Typography>
              )}
              <Button size="small" startIcon={<AddIcon />} onClick={addRubro}>
                Agregar rubro
              </Button>
            </Stack>
          </Stack>

          {form.rubros.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No hay rubros todavía. Agregá uno o cargalos desde una plantilla.
            </Typography>
          )}

          {form.rubros.map((rubro, ri) => (
            <Paper key={ri} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                  #{ri + 1}
                </Typography>
                <TextField
                  size="small"
                  label="Nombre del rubro"
                  value={rubro.nombre}
                  onChange={(e) => updateRubro(ri, 'nombre', e.target.value)}
                  sx={{ flexGrow: 1 }}
                  inputRef={(el) => {
                    if (el && focusRef?.current?.type === 'rubro' && focusRef.current.rubroIdx === ri) {
                      setTimeout(() => el.focus(), 0);
                      focusRef.current = null;
                    }
                  }}
                />
                {modoDistribuir && puedeDistribuirPorIncidencias && (
                  <TextField
                    size="small"
                    label="Incidencia %"
                    value={
                      typeof rubro.incidencia_objetivo_pct === 'string' && /[.,]$/.test(rubro.incidencia_objetivo_pct)
                        ? rubro.incidencia_objetivo_pct
                        : formatNumberForInput(rubro.incidencia_objetivo_pct ?? '', 1)
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        onUpdateIncidenciaObjetivo?.(ri, '');
                        return;
                      }
                      if (/[.,]$/.test(raw)) {
                        onUpdateIncidenciaObjetivo?.(ri, raw);
                        return;
                      }
                      const v = parseNumberInput(raw);
                      if (v !== null) onUpdateIncidenciaObjetivo?.(ri, v);
                    }}
                    onBlur={(e) => {
                      const v = parseNumberInput(e.target.value);
                      if (e.target.value !== '' && v !== null) {
                        if (v < 0) onUpdateIncidenciaObjetivo?.(ri, 0);
                        else if (v > 100) onUpdateIncidenciaObjetivo?.(ri, 100);
                      }
                    }}
                    onKeyDown={handleNumericKeyDown}
                    placeholder="%"
                    sx={{ width: 90 }}
                    inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                    error={
                      rubro.incidencia_objetivo_pct != null &&
                      (Number(rubro.incidencia_objetivo_pct) < 0 || Number(rubro.incidencia_objetivo_pct) > 100)
                    }
                  />
                )}
                <TextField
                  size="small"
                  label="Monto"
                  value={formatNumberForInput(rubro.monto, 2)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      updateRubro(ri, 'monto', 0);
                      return;
                    }
                    const v = parseNumberInput(raw);
                    if (v !== null) updateRubro(ri, 'monto', Math.round(v * 100) / 100);
                  }}
                  onKeyDown={handleNumericKeyDown}
                  sx={{ width: 150 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                />
                {totalVivo > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                    {formatPct(((Number(rubro.monto) || 0) / totalVivo) * 100)}
                  </Typography>
                )}
                <Tooltip title="Subir">
                  <span>
                    <IconButton size="small" disabled={ri === 0} onClick={() => moveRubro(ri, -1)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Bajar">
                  <span>
                    <IconButton
                      size="small"
                      disabled={ri === form.rubros.length - 1}
                      onClick={() => moveRubro(ri, 1)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Eliminar rubro">
                  <IconButton size="small" color="error" onClick={() => removeRubro(ri)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Box sx={{ ml: 4 }}>
                {(rubro.tareas || []).map((tarea, ti) => (
                  <Stack key={ti} direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                      {ri + 1}.{ti + 1}
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Descripción de tarea"
                      value={tarea.descripcion}
                      onChange={(e) => updateTarea(ri, ti, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (e.ctrlKey || e.metaKey) {
                            addRubro();
                          } else {
                            addTarea(ri);
                          }
                        }
                      }}
                      inputRef={(el) => {
                        if (el && focusRef?.current?.type === 'tarea' && focusRef.current.rubroIdx === ri && focusRef.current.tareaIdx === ti) {
                          setTimeout(() => el.focus(), 0);
                          focusRef.current = null;
                        }
                      }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeTarea(ri, ti)}>
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={() => addTarea(ri)} sx={{ mt: 0.5 }}>
                  + Tarea
                </Button>
              </Box>
            </Paper>
          ))}
        </Box>

        <Divider />

        <TextField
          label="Notas / Condiciones"
          multiline
          minRows={4}
          maxRows={10}
          value={form.notas_texto}
          onChange={(e) => onFormChange({ ...form, notas_texto: e.target.value })}
          helperText={
            form.notas_texto === TEXTO_NOTAS_DEFAULT && !form.plantilla_id
              ? 'Se pre-carga un texto sugerido por SorbyData al crear. Podés editarlo libremente.'
              : ''
          }
        />

        <AnalisisSuperficiesBlock form={form} onFormChange={onFormChange} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button
        variant="contained"
        onClick={onSave}
        disabled={saving || (modoDistribuir && sumaInvalida)}
      >
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default PresupuestoFormDialog;
