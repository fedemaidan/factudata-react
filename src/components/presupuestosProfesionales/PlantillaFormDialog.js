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
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';

const sumaIncidenciasPlantilla = (rubros) =>
  (rubros || []).reduce((s, r) => s + (Number(r.incidencia_pct_sugerida) || 0), 0);

const sumaIncidenciasSubrubros = (tareas) =>
  (tareas || []).reduce((s, t) => s + (Number(t.incidencia_pct_sugerida) || 0), 0);

const PlantillaFormDialog = ({
  open,
  onClose,
  isEdit,
  form,
  onFormChange,
  saving,
  onSave,
  addRubro,
  removeRubro,
  updateRubroNombre,
  updateRubroIncidencia,
  addTarea,
  removeTarea,
  updateTarea,
  updateTareaIncidencia,
  moveTarea,
  focusRef,
}) => {
  const sumaIncidencias = useMemo(() => sumaIncidenciasPlantilla(form.rubros), [form.rubros]);
  const sumaInvalida = sumaIncidencias > 100;
  const sumaSubrubrosInvalida = useMemo(
    () => (form.rubros || []).some((r) => sumaIncidenciasSubrubros(r.tareas) > 100),
    [form.rubros]
  );
  const sumaOk = sumaIncidencias >= 99.5 && sumaIncidencias <= 100.5;
  const sumaBaja = sumaIncidencias < 99.5 && sumaIncidencias >= 0;

  return (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>{isEdit ? 'Editar Plantilla' : 'Nueva Plantilla de Rubros'}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Nombre *"
            fullWidth
            value={form.nombre}
            onChange={(e) => onFormChange({ ...form, nombre: e.target.value })}
            placeholder="Ej: Residencial estándar"
          />
          <TextField
            label="Tipo (opcional)"
            value={form.tipo}
            onChange={(e) => onFormChange({ ...form, tipo: e.target.value })}
            placeholder="Ej: residencial, comercial"
            sx={{ minWidth: 200 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.activa}
                onChange={(e) => onFormChange({ ...form, activa: e.target.checked })}
              />
            }
            label="Activa"
          />
        </Stack>

        <TextField
          label="Notas / Condiciones"
          multiline
          minRows={3}
          maxRows={6}
          value={form.notas || ''}
          onChange={(e) => onFormChange({ ...form, notas: e.target.value })}
          helperText="Incluí aclaraciones comerciales, forma de pago y validez."
          fullWidth
        />

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            Rubros ({form.rubros.length})
          </Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addRubro}>
            Agregar rubro
          </Button>
        </Stack>

        {form.rubros.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Agregá rubros y tareas para armar la plantilla.
          </Typography>
        )}

        {form.rubros.length > 0 && (
          <Typography
            variant="body2"
            sx={{
              color: sumaInvalida ? 'error.main' : sumaOk ? 'success.main' : sumaBaja ? 'warning.main' : 'text.secondary',
            }}
          >
            Suma incidencias: {sumaIncidencias.toFixed(1)}%
          </Typography>
        )}

        {form.rubros.map((rubro, ri) => (
          <Paper key={ri} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                #{ri + 1}
              </Typography>
              <TextField
                size="small"
                label="Nombre del rubro"
                value={rubro.nombre}
                onChange={(e) => updateRubroNombre(ri, e.target.value)}
                sx={{ flexGrow: 1 }}
                inputRef={(el) => {
                  if (el && focusRef?.current?.type === 'rubro' && focusRef.current.rubroIdx === ri) {
                    setTimeout(() => el.focus(), 0);
                    focusRef.current = null;
                  }
                }}
              />
              <TextField
                size="small"
                label="Incidencia %"
                type="number"
                value={rubro.incidencia_pct_sugerida ?? ''}
                onChange={(e) => updateRubroIncidencia(ri, e.target.value)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (e.target.value !== '' && !Number.isNaN(v)) {
                    if (v < 0) updateRubroIncidencia(ri, 0);
                    else if (v > 100) updateRubroIncidencia(ri, 100);
                  }
                }}
                placeholder="Ej: 20"
                sx={{ width: 100 }}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
              <Tooltip title="Eliminar rubro">
                <IconButton size="small" color="error" onClick={() => removeRubro(ri)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Box sx={{ ml: 4 }}>
              {(rubro.tareas || []).length > 0 && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{
                    mb: 0.5,
                    color:
                      sumaIncidenciasSubrubros(rubro.tareas) > 100
                        ? 'error.main'
                        : 'text.secondary',
                  }}
                >
                  Subrubros (incid. % sobre el rubro): suma{' '}
                  {sumaIncidenciasSubrubros(rubro.tareas).toFixed(1)}%
                  {sumaIncidenciasSubrubros(rubro.tareas) > 100 && ' — excede 100%'}
                </Typography>
              )}
              {(rubro.tareas || []).map((tarea, ti) => (
                <Stack key={ti} direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                    {ri + 1}.{ti + 1}
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    sx={{ flex: '1 1 200px', minWidth: 160 }}
                    placeholder="Descripción (subrubro)"
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
                  <TextField
                    size="small"
                    label="% rubro"
                    type="number"
                    value={tarea.incidencia_pct_sugerida ?? ''}
                    onChange={(e) => updateTareaIncidencia?.(ri, ti, e.target.value)}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (e.target.value !== '' && !Number.isNaN(v)) {
                        if (v < 0) updateTareaIncidencia?.(ri, ti, 0);
                        else if (v > 100) updateTareaIncidencia?.(ri, ti, 100);
                      }
                    }}
                    placeholder="%"
                    sx={{ width: 100 }}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                  />
                  <Tooltip title="Subir">
                    <span>
                      <IconButton size="small" disabled={ti === 0} onClick={() => moveTarea?.(ri, ti, -1)}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Bajar">
                    <span>
                      <IconButton
                        size="small"
                        disabled={ti === (rubro.tareas || []).length - 1}
                        onClick={() => moveTarea?.(ri, ti, 1)}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
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
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onSave} disabled={saving || sumaInvalida || sumaSubrubrosInvalida}>
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear plantilla'}
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default PlantillaFormDialog;
