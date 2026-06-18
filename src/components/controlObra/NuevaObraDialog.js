import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Button, Card, CardContent, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ControlObraService from 'src/services/controlObra/controlObraService';

const PERFILES = [
  { value: 'reforma', label: 'Obra chica / reforma' },
  { value: 'vivienda', label: 'Casa / vivienda' },
  { value: 'privada', label: 'Obra privada / desarrollo (CAC + retención)' },
  { value: 'publica', label: 'Obra grande / pública (CAC + retención + anticipo)' },
];

// Diálogo de carga manual de una obra (rubros → sub-rubros con monto).
export default function NuevaObraDialog({ open, onClose, empresaId, proyectoId = null, onCreated }) {
  const [titulo, setTitulo] = useState('');
  const [perfil, setPerfil] = useState('vivienda');
  const [rubros, setRubros] = useState([{ nombre: '', subrubros: [{ nombre: '', monto: '' }] }]);
  const [error, setError] = useState(null);

  const crear = useMutation({
    mutationFn: () => ControlObraService.crearObra({
      empresa_id: empresaId,
      proyecto_id: proyectoId,
      origen: { tipo: 'manual' },
      titulo,
      perfil,
      rubros: rubros.map((r) => ({
        nombre: r.nombre,
        subrubros: r.subrubros.filter((s) => s.nombre && s.monto).map((s) => ({ nombre: s.nombre, monto: Number(s.monto) })),
      })),
    }),
    onSuccess: (obra) => onCreated(obra._id),
    onError: (e) => setError(e?.response?.data?.error?.message || e.message),
  });

  const setSub = (ri, si, key, val) => setRubros((rs) => rs.map((r, i) => i !== ri ? r : {
    ...r, subrubros: r.subrubros.map((s, j) => j !== si ? s : { ...s, [key]: val }),
  }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva obra (carga manual)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth />
          <TextField select label="Perfil de obra" value={perfil} onChange={(e) => setPerfil(e.target.value)} fullWidth helperText="Define indexación CAC, retención y anticipo">
            {PERFILES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </TextField>
          {rubros.map((r, ri) => (
            <Card key={ri} variant="outlined"><CardContent>
              <TextField
                label="Rubro" size="small" fullWidth value={r.nombre}
                onChange={(e) => setRubros((rs) => rs.map((x, i) => i === ri ? { ...x, nombre: e.target.value } : x))}
                sx={{ mb: 1 }}
              />
              {r.subrubros.map((s, si) => (
                <Stack key={si} direction="row" spacing={1} mb={1}>
                  <TextField label="Sub-rubro" size="small" value={s.nombre} onChange={(e) => setSub(ri, si, 'nombre', e.target.value)} sx={{ flex: 1 }} />
                  <TextField label="Monto" size="small" type="number" value={s.monto} onChange={(e) => setSub(ri, si, 'monto', e.target.value)} sx={{ width: 130 }} />
                </Stack>
              ))}
              <Button size="small" onClick={() => setRubros((rs) => rs.map((x, i) => i === ri ? { ...x, subrubros: [...x.subrubros, { nombre: '', monto: '' }] } : x))}>+ sub-rubro</Button>
            </CardContent></Card>
          ))}
          <Button size="small" onClick={() => setRubros((rs) => [...rs, { nombre: '', subrubros: [{ nombre: '', monto: '' }] }])}>+ rubro</Button>
        </Stack>
        {error && <Typography color="error" variant="body2" mt={1}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => { setError(null); crear.mutate(); }} disabled={crear.isPending || !titulo}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}
