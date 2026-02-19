import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, TextField, Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Dialog para registrar la entrega parcial o total de un único movimiento.
 *
 * Props:
 *  - open              : boolean
 *  - onClose           : () => void
 *  - movimiento        : objeto { _id, nombre_item, cantidad, cantidad_original, cantidad_entregada, cantidadPendiente }
 *  - cantidadAEntregar : number
 *  - onCantidadChange  : (number) => void
 *  - onConfirmar       : () => void
 *  - loading           : boolean
 */
export default function EntregaParcialDialog({
  open,
  onClose,
  movimiento,
  cantidadAEntregar,
  onCantidadChange,
  onConfirmar,
  loading = false,
}) {
  if (!movimiento) return null;

  const cantidadOriginal = movimiento.cantidad_original || Math.abs(movimiento.cantidad || 0);
  const cantidadEntregada = movimiento.cantidad_entregada || 0;
  const cantidadPendiente = movimiento.cantidadPendiente ?? (cantidadOriginal - cantidadEntregada);

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalShippingIcon color="success" />
          <span>Registrar Entrega</span>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info">
            Registrá la cantidad de unidades que fueron entregadas para este material.
            Si es una entrega parcial, se creará un nuevo movimiento con el pendiente.
          </Alert>

          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Material: <strong>{movimiento.nombre_item}</strong>
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2">
                Cantidad original: <strong>{cantidadOriginal}</strong>
              </Typography>
              <Typography variant="body2">
                Ya entregado: <strong>{cantidadEntregada}</strong>
              </Typography>
              <Typography variant="body2" color="error.main">
                Pendiente: <strong>{cantidadPendiente}</strong>
              </Typography>
            </Stack>
          </Box>

          <TextField
            label="Cantidad a entregar ahora"
            type="number"
            value={cantidadAEntregar}
            onChange={(e) => {
              const val = Math.max(0, Math.min(Number(e.target.value), cantidadPendiente));
              onCantidadChange(val);
            }}
            inputProps={{ min: 1, max: cantidadPendiente, step: 1 }}
            fullWidth
            helperText={
              cantidadAEntregar < cantidadPendiente
                ? `Se creará un movimiento pendiente de ${cantidadPendiente - cantidadAEntregar} unidades`
                : 'Entrega completa - el movimiento quedará como ENTREGADO'
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          color="success"
          onClick={onConfirmar}
          disabled={loading || cantidadAEntregar <= 0}
          startIcon={loading ? null : <CheckCircleIcon />}
        >
          {loading ? 'Registrando...' : 'Confirmar Entrega'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
