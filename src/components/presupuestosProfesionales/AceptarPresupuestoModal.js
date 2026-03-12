import { useState, useEffect } from 'react';
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
  Typography,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

const AceptarPresupuestoModal = ({
  open,
  onClose,
  onConfirm,
  presupuesto,
  proyectos = [],
  loading = false,
}) => {
  const [proyectoId, setProyectoId] = useState('');

  useEffect(() => {
    if (!open) setProyectoId('');
  }, [open]);

  const canConfirm = proyectoId && proyectos.length > 0 && !loading;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(proyectoId, 'ingreso');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Aceptar presupuesto - Asignar a proyecto</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Para crear el control de presupuestos, seleccioná el proyecto.
        </Typography>
        {proyectos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay proyectos. Creá uno primero.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Proyecto</InputLabel>
              <Select
                value={proyectoId}
                label="Proyecto"
                onChange={(e) => setProyectoId(e.target.value)}
                displayEmpty
                renderValue={(v) => {
                  if (!v) return 'Seleccionar proyecto...';
                  const p = proyectos.find((pr) => pr.id === v);
                  return p?.nombre || v;
                }}
              >
                <MenuItem value="">
                  <em>Seleccionar proyecto...</em>
                </MenuItem>
                {proyectos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre || p.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Procesando...' : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AceptarPresupuestoModal;
