import React from 'react';
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
import { MONEDAS, formatCurrency, formatPct } from './constants';

const PresupuestoFormDialog = ({
  open,
  onClose,
  isEdit,
  form,
  onFormChange,
  proyectos = [],
  plantillas = [],
  totalVivo,
  saving,
  onSave,
  onProyectoChange,
  onAplicarPlantilla,
  addRubro,
  removeRubro,
  updateRubro,
  moveRubro,
  addTarea,
  removeTarea,
  updateTarea,
  focusRef,
}) => (
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

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle1" fontWeight={600}>
              Rubros ({form.rubros.length})
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Total: {formatCurrency(totalVivo, form.moneda)}
              </Typography>
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
                <TextField
                  size="small"
                  label="Monto"
                  type="number"
                  value={rubro.monto}
                  onChange={(e) => updateRubro(ri, 'monto', e.target.value)}
                  sx={{ width: 150 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
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
          helperText="Se pre-carga un texto sugerido por SorbyData al crear. Podés editarlo libremente."
        />

        <Typography variant="subtitle2" color="text.secondary">
          Análisis de superficies (opcional)
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            size="small"
            label="Sup. cubierta (m²)"
            type="number"
            value={form.analisis_superficies?.sup_cubierta_m2 || ''}
            onChange={(e) =>
              onFormChange({
                ...form,
                analisis_superficies: {
                  ...form.analisis_superficies,
                  sup_cubierta_m2: e.target.value,
                },
              })
            }
          />
          <TextField
            size="small"
            label="Sup. patios (m²)"
            type="number"
            value={form.analisis_superficies?.sup_patios_m2 || ''}
            onChange={(e) =>
              onFormChange({
                ...form,
                analisis_superficies: {
                  ...form.analisis_superficies,
                  sup_patios_m2: e.target.value,
                },
              })
            }
          />
          <TextField
            size="small"
            label="Sup. ponderada (m²)"
            type="number"
            value={form.analisis_superficies?.sup_ponderada_m2 || ''}
            onChange={(e) =>
              onFormChange({
                ...form,
                analisis_superficies: {
                  ...form.analisis_superficies,
                  sup_ponderada_m2: e.target.value,
                },
              })
            }
          />
        </Stack>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onSave} disabled={saving}>
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear presupuesto'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PresupuestoFormDialog;
