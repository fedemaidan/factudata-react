import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ConstructionIcon from '@mui/icons-material/Construction';
import { useEffect, useState } from 'react';

/**
 * Dialog de selección de destino al confirmar un desacopio.
 *
 * Props:
 *  - open       : boolean
 *  - onClose    : () => void
 *  - onConfirm  : ({ destino, proyecto_id?, proyecto_nombre? }) => void
 *  - proyectos  : Array<{ id, nombre }>  — lista de proyectos de la empresa
 *  - loading    : boolean
 */
export default function DestinoDesacopioDialog({ open, onClose, onConfirm, proyectos = [], loading = false }) {
  const [destino, setDestino] = useState('deposito');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);

  useEffect(() => {
    if (open) {
      setDestino('deposito');
      setProyectoSeleccionado(null);
    }
  }, [open]);

  const handleConfirm = () => {
    const payload = { destino };
    if (destino === 'obra' && proyectoSeleccionado) {
      payload.proyecto_id = proyectoSeleccionado.id;
      payload.proyecto_nombre = proyectoSeleccionado.nombre;
    }
    onConfirm(payload);
  };

  const puedeConfirmar = destino === 'deposito' || (destino === 'obra' && proyectoSeleccionado);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>¿A dónde van estos materiales?</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Seleccioná el destino de los materiales desacopiados. Se registrarán automáticamente en Stock.
          </Typography>

          <RadioGroup value={destino} onChange={(e) => setDestino(e.target.value)}>
            <FormControlLabel
              value="deposito"
              control={<Radio />}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WarehouseIcon fontSize="small" color="primary" />
                  <span>A depósito</span>
                </Stack>
              }
            />
            <FormControlLabel
              value="obra"
              control={<Radio />}
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <ConstructionIcon fontSize="small" color="warning" />
                  <span>A obra</span>
                </Stack>
              }
            />
          </RadioGroup>

          {destino === 'obra' && (
            <Autocomplete
              options={proyectos}
              getOptionLabel={(p) => p.nombre || ''}
              value={proyectoSeleccionado}
              onChange={(_, newVal) => setProyectoSeleccionado(newVal)}
              renderInput={(params) => (
                <TextField {...params} label="Seleccionar proyecto / obra" placeholder="Buscar..." />
              )}
              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              noOptionsText="Sin proyectos"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!puedeConfirmar || loading}
        >
          {loading ? 'Procesando...' : 'Confirmar desacopio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
