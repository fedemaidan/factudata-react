import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Divider, ListItemIcon, Menu, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import FormDrawer from 'src/components/controlObra/FormDrawer';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ControlObraService from 'src/services/controlObra/controlObraService';

// Menú de acciones sobre un rubro: editar nombre, agregar sub-rubro, eliminar.
export default function RubroAccionesMenu({ obra, rubro, empresaId, anchorEl, onClose }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // 'editar' | 'agregar' | 'eliminar'
  const refresh = () => qc.invalidateQueries({ queryKey: ['control-obra'] });
  const cerrarTodo = () => { setDialog(null); onClose(); };

  if (!rubro) return null;

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && !dialog} onClose={onClose}>
        <MenuItem disabled sx={{ opacity: 1 }}>
          <Typography variant="caption" color="text.secondary">{rubro.nombre}</Typography>
        </MenuItem>
        <MenuItem onClick={() => setDialog('agregar')}><ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>Agregar sub-rubro</MenuItem>
        <MenuItem onClick={() => setDialog('editar')}><ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Editar nombre</MenuItem>
        <Divider />
        <MenuItem onClick={() => setDialog('eliminar')} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>Eliminar rubro
        </MenuItem>
      </Menu>

      {dialog === 'editar' && <EditarRubro obra={obra} rubro={rubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />}
      {dialog === 'agregar' && <AgregarSubrubro obra={obra} rubro={rubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />}
      {dialog === 'eliminar' && <EliminarRubro obra={obra} rubro={rubro} empresaId={empresaId} onClose={cerrarTodo} onDone={() => { refresh(); cerrarTodo(); }} />}
    </>
  );
}

function EditarRubro({ obra, rubro, empresaId, onClose, onDone }) {
  const [nombre, setNombre] = useState(rubro.nombre || '');
  const m = useMutation({ mutationFn: () => ControlObraService.editarRubro(obra._id, rubro.uid, empresaId, nombre), onSuccess: onDone });
  return (
    <FormDrawer
      open onClose={onClose} title="Editar rubro"
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={m.isPending || !nombre} onClick={() => m.mutate()}>Guardar</Button>
        </>
      )}
    >
      <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth size="small" />
    </FormDrawer>
  );
}

function AgregarSubrubro({ obra, rubro, empresaId, onClose, onDone }) {
  const [form, setForm] = useState({ nombre: '', monto: '', unidad: '', cantidad: '' });
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const m = useMutation({
    mutationFn: () => ControlObraService.agregarSubrubro(obra._id, rubro.uid, empresaId, {
      nombre: form.nombre, monto: Number(form.monto) || 0, unidad: form.unidad || null, cantidad: form.cantidad === '' ? null : Number(form.cantidad),
    }),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  return (
    <FormDrawer
      open onClose={onClose} title={`Agregar sub-rubro a ${rubro.nombre}`}
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" disabled={m.isPending || !form.nombre} onClick={() => { setError(null); m.mutate(); }}>Agregar</Button>
        </>
      )}
    >
      <Stack spacing={2}>
        <TextField label="Nombre" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} fullWidth size="small" />
        <TextField label="Monto de contrato" type="number" value={form.monto} onChange={(e) => set('monto', e.target.value)} fullWidth size="small" />
        <Stack direction="row" spacing={1}>
          <TextField label="Unidad" value={form.unidad} onChange={(e) => set('unidad', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Cantidad" type="number" value={form.cantidad} onChange={(e) => set('cantidad', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Stack>
      </Stack>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}

function EliminarRubro({ obra, rubro, empresaId, onClose, onDone }) {
  const [error, setError] = useState(null);
  const m = useMutation({
    mutationFn: () => ControlObraService.eliminarRubro(obra._id, rubro.uid, empresaId),
    onSuccess: onDone,
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });
  return (
    <FormDrawer
      open onClose={onClose} title="Eliminar rubro"
      actions={(
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={m.isPending} onClick={() => { setError(null); m.mutate(); }}>Eliminar</Button>
        </>
      )}
    >
      <Typography variant="body2">¿Eliminar <b>{rubro.nombre}</b> y todos sus sub-rubros? Queda en el historial.</Typography>
      {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
    </FormDrawer>
  );
}
