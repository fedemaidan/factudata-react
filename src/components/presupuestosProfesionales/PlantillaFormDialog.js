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
import DeleteIcon from '@mui/icons-material/Delete';

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
  addTarea,
  removeTarea,
  updateTarea,
  focusRef,
}) => (
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
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onSave} disabled={saving}>
        {saving ? <CircularProgress size={20} /> : isEdit ? 'Guardar cambios' : 'Crear plantilla'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PlantillaFormDialog;
