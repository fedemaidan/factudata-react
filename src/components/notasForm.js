import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

const NotasForm = ({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  profiles,
  isEditing = false,
}) => {
    if (!formData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Editar Nota' : 'Añadir Nota'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
        <TextField
            label="Título"
            value={formData?.titulo || ''}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            fullWidth
            />
          <TextField
            label="Descripción"
            value={formData?.descripcion || '' }
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
          {isEditing && (
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData?.estado || ''}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <MenuItem value="Pendiente">Pendiente</MenuItem>
                <MenuItem value="Haciendo">Haciendo</MenuItem>
                <MenuItem value="Completa">Completa</MenuItem>
              </Select>
            </FormControl>
          )}
          <FormControl fullWidth>
            <InputLabel>{isEditing ? 'Reasignar a' : 'Asignar a'}</InputLabel>
            <Select
              value={formData?.owner || ''}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            >
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.firstName + ' ' + profile.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={onSave} variant="contained">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotasForm;
