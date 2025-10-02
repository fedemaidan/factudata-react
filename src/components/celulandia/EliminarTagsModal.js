import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';

const EliminarTagsModal = ({ open, onClose, isSaving, selectedCount, onConfirm, error }) => {
  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      fullWidth
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>Eliminar todos los tags</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          ¿Estás seguro de que deseas eliminar <strong>TODOS los tags</strong> de los{' '}
          {selectedCount} productos seleccionados?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Esta acción eliminará todos los tags asociados a los productos seleccionados y no se puede
          deshacer.
        </Typography>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isSaving ? 'Eliminando...' : 'Eliminar todos los tags'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EliminarTagsModal;
