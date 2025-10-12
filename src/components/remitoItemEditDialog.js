import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Button, Stack
} from '@mui/material';

export default function RemitoItemEditDialog({ open, item, onClose, onSave, onDelete }) {
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [valorUnitario, setValorUnitario] = useState('');

  useEffect(() => {
    if (!open) return;
    setCodigo(item?.codigo || '');
    setDescripcion(item?.descripcion || '');
    setCantidad(String(item?.cantidad ?? ''));
    setValorUnitario(String(item?.valorUnitario ?? ''));
  }, [open, item]);

  const total = useMemo(() => {
    const c = parseFloat(cantidad) || 0;
    const vu = parseFloat(valorUnitario) || 0;
    return c * vu;
  }, [cantidad, valorUnitario]);

  const handleSave = () => {
    const c = parseFloat(cantidad);
    const vu = parseFloat(valorUnitario);
    if (Number.isNaN(c) || Number.isNaN(vu)) return;
    onSave({
      ...(item || {}),
      codigo: codigo || '',
      descripcion: descripcion || '',
      cantidad: c,
      valorUnitario: vu
    });
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete(item);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Editar ítem</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} fullWidth autoFocus />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} fullWidth inputMode="decimal" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} fullWidth multiline minRows={2} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Valor unitario" value={valorUnitario} onChange={(e) => setValorUnitario(e.target.value)} fullWidth inputMode="decimal" />
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack>
              <TextField
                label="Valor total"
                value={new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total || 0)}
                fullWidth
                InputProps={{ readOnly: true }}
              />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button color="error" variant="outlined" onClick={handleDelete}>Eliminar</Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
