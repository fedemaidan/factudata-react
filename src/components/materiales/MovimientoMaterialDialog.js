// components/materiales/MovimientoMaterialDialog.jsx
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Select, MenuItem, InputLabel, FormControl,
  Button, FormControlLabel, Checkbox
} from '@mui/material';
import ProyectoSelect from '../shared/ProyectoSelect';

// helpers sugeridos
const pad = (n) => String(n).padStart(2, '0');
export const toInputLocal = (v) => {
  if (!v) return '';
  let d = null;
  if (v.seconds ?? v._seconds) d = new Date((v.seconds ?? v._seconds) * 1000);
  else if (v instanceof Date) d = v;
  else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
  if (!d || isNaN(d)) return '';
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function MovimientoMaterialDialog({
  open,
  onClose,
  onSubmit,
  initial,
  empresaId,
  proyectos = [],
  showEmpresa = true,       // por si querés ocultar el field fijo
  showFecha = true,         // por si querés ocultar fecha
}) {
  const [form, setForm] = useState({
    empresa_id: empresaId || '',
    proyecto_id: '',
    nombre: '',
    cantidad: '',
    tipo: 'entrada',
    fecha_movimiento: '',
    validado: false,
    observacion: ''
  });

  useEffect(() => {
    if (initial) {
      setForm({
        empresa_id: empresaId || '',
        proyecto_id: initial.proyecto_id || '',
        nombre: initial.nombre || '',
        cantidad: initial.cantidad ?? '',
        tipo: initial.tipo || 'entrada',
        fecha_movimiento: toInputLocal(initial.fecha_movimiento),
        validado: !!initial.validado,
        observacion: initial.observacion || ''
      });
    } else {
      setForm((f) => ({ ...f, empresa_id: empresaId || '' }));
    }
  }, [initial, empresaId]);

  const handleChange = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial?.id ? 'Editar movimiento' : 'Crear movimiento'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {showEmpresa && <TextField label="Empresa ID" value={empresaId} disabled fullWidth />}

          <ProyectoSelect
            proyectos={proyectos}
            value={form.proyecto_id}
            onChange={(v) => handleChange('proyecto_id', v)}
          />

          <TextField label="Nombre *" value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} fullWidth />
          <TextField label="Cantidad *" type="number" value={form.cantidad} onChange={(e) => handleChange('cantidad', e.target.value)} fullWidth />

          <FormControl fullWidth>
            <InputLabel>Tipo *</InputLabel>
            <Select label="Tipo *" value={form.tipo} onChange={(e) => handleChange('tipo', e.target.value)}>
              <MenuItem value="entrada">Entrada</MenuItem>
              <MenuItem value="salida">Salida</MenuItem>
            </Select>
          </FormControl>

          {showFecha && (
            <TextField
              label="Fecha de movimiento"
              type="datetime-local"
              value={form.fecha_movimiento || ''}
              onChange={(e) => handleChange('fecha_movimiento', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          )}

          <FormControlLabel
            control={<Checkbox checked={form.validado || false} onChange={(e) => handleChange('validado', e.target.checked)} />}
            label="Validado"
          />

          <TextField label="Observación" value={form.observacion || ''} onChange={(e) => handleChange('observacion', e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSubmit({ ...form, empresa_id: empresaId })}>
          {initial?.id ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
