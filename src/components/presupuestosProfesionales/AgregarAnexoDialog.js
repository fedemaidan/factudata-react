import {
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

const IMPACTO_OPTIONS = [
  { value: 'positivo', label: 'Suma (+)' },
  { value: 'negativo', label: 'Resta (-)' },
];

const formatMontoDisplay = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val ?? '');
  return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const parseMontoInput = (str) => {
  if (!str || typeof str !== 'string') return '';
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '.') return '';
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : '';
};

const AgregarAnexoDialog = ({
  open,
  onClose,
  presupuesto,
  form,
  onFormChange,
  onConfirm,
}) => {
  const motivoOk = form.motivo?.trim();
  const montoOk = Number(form.monto) > 0;
  const canSubmit = motivoOk && montoOk;
  const isModificacion = form.tipo === 'modificacion';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar Anexo</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Presupuesto: <strong>{presupuesto?.titulo}</strong>
        </Typography>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Tipo *</InputLabel>
            <Select
              value={form.tipo}
              label="Tipo *"
              onChange={(e) => onFormChange({ ...form, tipo: e.target.value })}
            >
              {TIPOS_ANEXO.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Motivo *"
            multiline
            minRows={2}
            value={form.motivo}
            onChange={(e) => onFormChange({ ...form, motivo: e.target.value })}
            placeholder="Ej: Cliente pidió ampliar cocina"
          />
          <TextField
            label="Monto *"
            inputMode="decimal"
            value={formatMontoDisplay(form.monto)}
            onChange={(e) => {
              const parsed = parseMontoInput(e.target.value);
              onFormChange({ ...form, monto: parsed === '' ? '' : parsed });
            }}
            placeholder="0"
            helperText="Valor absoluto. El signo se aplica según el tipo."
          />
          {isModificacion && (
            <FormControl fullWidth>
              <InputLabel>Impacto</InputLabel>
              <Select
                value={form.impacto || 'positivo'}
                label="Impacto"
                onChange={(e) => onFormChange({ ...form, impacto: e.target.value })}
              >
                {IMPACTO_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField
            label="Fecha"
            type="date"
            value={form.fecha || new Date().toISOString().slice(0, 10)}
            onChange={(e) => onFormChange({ ...form, fecha: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Detalle (opcional)"
            multiline
            minRows={2}
            value={form.detalle || ''}
            onChange={(e) => onFormChange({ ...form, detalle: e.target.value })}
            placeholder="Aclaraciones adicionales"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm} disabled={!canSubmit}>
          Agregar anexo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgregarAnexoDialog;
