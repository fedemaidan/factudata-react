import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';

const EtapaFormDialog = ({ open, initialValue, onClose, onSave }) => {
  const [nombre, setNombre] = useState(initialValue?.nombre || '');

  useEffect(() => {
    setNombre(initialValue?.nombre || '');
  }, [initialValue]);

  const handleSave = () => onSave({ ...initialValue, nombre: nombre.trim() || 'Sin nombre' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initialValue ? 'Editar etapa' : 'Nueva etapa'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus fullWidth label="Nombre de etapa" value={nombre}
          onChange={(e) => setNombre(e.target.value)} sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EtapaFormDialog;
