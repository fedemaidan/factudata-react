import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';

const MaterialFormDialog = ({ open, initialValue, onClose, onSave }) => {
  const [form, setForm] = useState({
    nombre: '', unidad: '', cantidad_plan: 0, cantidad_usada: 0,
    precio_unit_plan: 0, moneda: 'ARS', sku: '', aliases: ''
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        nombre: initialValue.nombre || '',
        unidad: initialValue.unidad || '',
        cantidad_plan: initialValue.cantidad_plan ?? 0,
        cantidad_usada: initialValue.cantidad_usada ?? 0,
        precio_unit_plan: initialValue.precio_unit_plan ?? 0,
        moneda: initialValue.moneda || 'ARS',
        sku: initialValue.sku || '',
        aliases: (initialValue.aliases || []).join(', ')
      });
    } else {
      setForm({ nombre: '', unidad: '', cantidad_plan: 0, cantidad_usada: 0, precio_unit_plan: 0, moneda: 'ARS', sku: '', aliases: '' });
    }
  }, [initialValue, open]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    const payload = {
      ...initialValue,
      nombre: form.nombre.trim(),
      unidad: form.unidad.trim(),
      cantidad_plan: Number(form.cantidad_plan) || 0,
      cantidad_usada: Number(form.cantidad_usada) || 0,
      precio_unit_plan: Number(form.precio_unit_plan) || 0,
      moneda: form.moneda || 'ARS',
      sku: form.sku.trim() || undefined,
      aliases: form.aliases.split(',').map(s => s.trim()).filter(Boolean),
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValue ? 'Editar material' : 'Nuevo material'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Nombre" value={form.nombre} onChange={update('nombre')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Unidad" value={form.unidad} onChange={update('unidad')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Cant. plan" value={form.cantidad_plan} onChange={update('cantidad_plan')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Cant. usada" value={form.cantidad_usada} onChange={update('cantidad_usada')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Precio unit." value={form.precio_unit_plan} onChange={update('precio_unit_plan')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Moneda" value={form.moneda} onChange={update('moneda')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="SKU" value={form.sku} onChange={update('sku')} /></Grid>
          <Grid item xs={12} sm={12}><TextField fullWidth label="Aliases (separados por coma)" value={form.aliases} onChange={update('aliases')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaterialFormDialog;
