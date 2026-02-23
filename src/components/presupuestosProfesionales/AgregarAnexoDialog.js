import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { TIPOS_ANEXO } from './constants';

const AgregarAnexoDialog = ({
  open,
  onClose,
  presupuesto,
  form,
  onFormChange,
  onConfirm,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Agregar Anexo</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Presupuesto: <strong>{presupuesto?.titulo}</strong>
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Motivo del anexo *"
          multiline
          minRows={2}
          value={form.motivo}
          onChange={(e) => onFormChange({ ...form, motivo: e.target.value })}
          placeholder="Ej: Cliente pidió ampliar cocina"
        />
        <FormControl fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select
            value={form.tipo}
            label="Tipo"
            onChange={(e) => onFormChange({ ...form, tipo: e.target.value })}
          >
            {TIPOS_ANEXO.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Alert severity="info">
          Los rubros afectados y montos se calculan automáticamente en el backend al agregar
          el anexo. Asegurate de haber editado los rubros del presupuesto antes si es necesario.
        </Alert>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="contained" onClick={onConfirm} disabled={!form.motivo.trim()}>
        Agregar anexo
      </Button>
    </DialogActions>
  </Dialog>
);

export default AgregarAnexoDialog;
