import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button
} from '@mui/material';

export default function ClonarUnidadDialog({ open, nuevoPath, onChangePath, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Clonar Grupo</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Nuevo nombre del grupo"
          value={nuevoPath}
          onChange={e => onChangePath(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm}>Clonar</Button>
      </DialogActions>
    </Dialog>
  );
}
