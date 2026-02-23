import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { ESTADO_LABEL, ESTADO_COLOR, TRANSICIONES_VALIDAS } from './constants';

const CambiarEstadoDialog = ({
  open,
  onClose,
  presupuesto,
  nuevoEstado,
  onNuevoEstadoChange,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Cambiar estado</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Presupuesto: <strong>{presupuesto?.titulo}</strong>
        <br />
        Estado actual:{' '}
        <Chip
          label={ESTADO_LABEL[presupuesto?.estado] || ''}
          color={ESTADO_COLOR[presupuesto?.estado] || 'default'}
          size="small"
        />
      </Typography>
      <FormControl fullWidth>
        <InputLabel>Nuevo estado</InputLabel>
        <Select
          value={nuevoEstado}
          label="Nuevo estado"
          onChange={(e) => onNuevoEstadoChange(e.target.value)}
        >
          {(TRANSICIONES_VALIDAS[presupuesto?.estado] || []).map((e) => (
            <MenuItem key={e} value={e}>{ESTADO_LABEL[e]}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {nuevoEstado === 'aceptado' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Al aceptar se congelará una versión del presupuesto con las equivalencias CAC/USD
          actuales. Los rubros ya no podrán editarse directamente (solo mediante anexos).
        </Alert>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onConfirm} disabled={!nuevoEstado}>
        Confirmar
      </Button>
    </DialogActions>
  </Dialog>
);

export default CambiarEstadoDialog;
