import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

const PlantillaDeleteDialog = ({ open, onClose, plantilla, onConfirm }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs">
    <DialogTitle>Eliminar plantilla</DialogTitle>
    <DialogContent>
      <Typography>
        ¿Eliminar la plantilla <strong>{plantilla?.nombre}</strong>? Los presupuestos que
        ya la usaron no se ven afectados.
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

export default PlantillaDeleteDialog;
