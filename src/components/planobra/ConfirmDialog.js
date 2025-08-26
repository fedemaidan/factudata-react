import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

const ConfirmDialog = ({ open, title = 'Confirmar', content, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography variant="body2">{content}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button color="error" variant="contained" onClick={onConfirm}>Eliminar</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
