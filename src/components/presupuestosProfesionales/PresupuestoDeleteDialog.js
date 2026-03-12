import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

const PresupuestoDeleteDialog = ({ open, onClose, presupuesto, onConfirm }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs">
    <DialogTitle>Eliminar presupuesto</DialogTitle>
    <DialogContent>
      <Typography>
        ¿Estás seguro de eliminar <strong>{presupuesto?.titulo || '(sin título)'}</strong>?
        Esta acción no se puede deshacer.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" color="error" onClick={onConfirm}>
        Eliminar
      </Button>
    </DialogActions>
  </Dialog>
);

export default PresupuestoDeleteDialog;
