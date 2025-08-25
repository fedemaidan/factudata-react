import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';

const CertificadoFormDialog = ({ open, initialValue, onClose, onSave }) => {
  const [form, setForm] = useState({
    descripcion: '', contratista: '', fecha_inicio: '', fecha_fin: '',
    monto: 0, porcentaje_certificado: 0, moneda: 'ARS'
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        descripcion: initialValue.descripcion || '',
        contratista: initialValue.contratista || '',
        fecha_inicio: initialValue.fecha_inicio || '',
        fecha_fin: initialValue.fecha_fin || '',
        monto: initialValue.monto ?? 0,
        porcentaje_certificado: initialValue.porcentaje_certificado ?? 0,
        moneda: initialValue.moneda || 'ARS',
      });
    } else {
      setForm({ descripcion: '', contratista: '', fecha_inicio: '', fecha_fin: '', monto: 0, porcentaje_certificado: 0, moneda: 'ARS' });
    }
  }, [initialValue, open]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    const payload = {
      ...initialValue,
      descripcion: form.descripcion.trim(),
      contratista: form.contratista.trim() || undefined,
      fecha_inicio: form.fecha_inicio || undefined,
      fecha_fin: form.fecha_fin || undefined,
      monto: Number(form.monto) || 0,
      porcentaje_certificado: Math.max(0, Math.min(100, Number(form.porcentaje_certificado) || 0)),
      moneda: form.moneda || 'ARS',
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValue ? 'Editar certificado' : 'Nuevo certificado'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><TextField fullWidth label="Descripción" value={form.descripcion} onChange={update('descripcion')} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Contratista" value={form.contratista} onChange={update('contratista')} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth label="Inicio (YYYY-MM-DD)" value={form.fecha_inicio} onChange={update('fecha_inicio')} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth label="Fin (YYYY-MM-DD)" value={form.fecha_fin} onChange={update('fecha_fin')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="Monto" value={form.monto} onChange={update('monto')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth type="number" label="% Certificado" value={form.porcentaje_certificado} onChange={update('porcentaje_certificado')} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth label="Moneda" value={form.moneda} onChange={update('moneda')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CertificadoFormDialog;

