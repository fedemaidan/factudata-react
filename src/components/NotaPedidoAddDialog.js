import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

export const NotaPedidoAddDialog = ({ open, onClose, onSave, profiles, proyectos }) => {
  const [newNoteData, setNewNoteData] = useState({ descripcion: '', proyecto_id: '', proveedor: '', owner: '' });

  useEffect(() => {
    if (open) {
      setNewNoteData({ descripcion: '', proyecto_id: '', proveedor: '', owner: '' });
    }
  }, [open]);

  const handleSave = () => {
    onSave(newNoteData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Añadir Nota</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Descripción"
            value={newNoteData.descripcion}
            onChange={(e) => setNewNoteData({ ...newNoteData, descripcion: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
          <TextField
            label="Proveedor"
            value={newNoteData.proveedor}
            onChange={(e) => setNewNoteData({ ...newNoteData, proveedor: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Asignar a</InputLabel>
            <Select
              value={newNoteData.owner || ''}
              onChange={(e) => setNewNoteData({ ...newNoteData, owner: e.target.value })}
            >
              {profiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.firstName + " " + profile.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Proyecto</InputLabel>
            <Select
              value={newNoteData.proyecto_id || ''}
              onChange={(e) => setNewNoteData({ ...newNoteData, proyecto_id: e.target.value })}
            >
              {proyectos.map((proyecto) => (
                <MenuItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
