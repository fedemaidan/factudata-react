import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Stack,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

const DeleteConfirmationDialog = ({ open, onClose, onConfirm, noteTitle }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <WarningIcon color="error" />
          <span>Confirmar eliminación</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography>
          ¿Estás seguro de que deseas eliminar la nota{' '}
          <strong>"{noteTitle}"</strong>? Esta acción no se puede deshacer.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
