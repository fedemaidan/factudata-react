// src/sections/empresa/impuestosDetails.js
import React, { useState } from 'react';
import {
  Card, CardHeader, CardContent, CardActions, Divider,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Snackbar, Alert, Select, MenuItem, FormControl,
  InputLabel, Switch, Typography
} from '@mui/material';
import { updateEmpresaDetails } from 'src/services/empresaService';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { v4 as uuidv4 } from 'uuid';
import { Box } from '@mui/system';

const impuestosDefault = [
  { id: uuidv4(), nombre: "IVA 21%", tipo: "porcentaje", valor: 21, aplicacion: "ambos", incluir_en_total: false, activo: true },
  { id: uuidv4(), nombre: "IVA 10.5%", tipo: "porcentaje", valor: 10.5, aplicacion: "ambos", incluir_en_total: false, activo: true },
  { id: uuidv4(), nombre: "IVA 27%", tipo: "porcentaje", valor: 27, aplicacion: "ambos", incluir_en_total: false, activo: true },
  { id: uuidv4(), nombre: "Percepción IIBB Buenos Aires", tipo: "porcentaje", valor: 3, aplicacion: "compra", incluir_en_total: true, activo: true },
  { id: uuidv4(), nombre: "Percepción IIBB CABA", tipo: "porcentaje", valor: 3, aplicacion: "compra", incluir_en_total: true, activo: true },
  { id: uuidv4(), nombre: "Percepción IVA", tipo: "porcentaje", valor: 10, aplicacion: "compra", incluir_en_total: true, activo: true },
  { id: uuidv4(), nombre: "Retención Ganancias", tipo: "porcentaje", valor: 2, aplicacion: "compra", incluir_en_total: false, activo: true },
];

export const ImpuestosDetails = ({ empresa }) => {
  const [impuestos, setImpuestos] = useState(() => {
    if (!empresa.impuestos_data || empresa.impuestos_data.length === 0) {
      return impuestosDefault;
    }
    return empresa.impuestos_data;
  });

  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'porcentaje',
    valor: '',
    aplicacion: 'ambos',
    incluir_en_total: false,
    activo: true,
    cuenta_contable: '',
    descripcion: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const reset = () => {
    setForm({
      nombre: '', tipo: 'porcentaje', valor: '', aplicacion: 'ambos',
      incluir_en_total: false, activo: true, cuenta_contable: '', descripcion: ''
    });
    setEditingIndex(null);
    setOpen(false);
  };

  const guardarImpuesto = async () => {
    const nuevo = {
      ...form,
      valor: parseFloat(form.valor),
      id: editingIndex !== null ? impuestos[editingIndex].id : uuidv4()
    };
    const nuevos = [...impuestos];
    if (editingIndex !== null) nuevos[editingIndex] = nuevo;
    else nuevos.push(nuevo);
    setImpuestos(nuevos);
    await updateEmpresaDetails(empresa.id, { impuestos_data: nuevos });
    setSnackbar({ open: true, message: editingIndex !== null ? 'Impuesto actualizado' : 'Impuesto agregado', severity: 'success' });
    reset();
  };

  const eliminarImpuesto = async (index) => {
    const nuevos = impuestos.filter((_, i) => i !== index);
    setImpuestos(nuevos);
    await updateEmpresaDetails(empresa.id, { impuestos_data: nuevos });
    setSnackbar({ open: true, message: 'Impuesto eliminado', severity: 'success' });
  };

  const moverImpuesto = async (index, direccion) => {
    const nuevos = [...impuestos];
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= nuevos.length) return;
    const temp = nuevos[index];
    nuevos[index] = nuevos[nuevoIndex];
    nuevos[nuevoIndex] = temp;
    setImpuestos(nuevos);
    await updateEmpresaDetails(empresa.id, { impuestos_data: nuevos });
  };

  return (
    <>
      <Card>
        <CardHeader title="Impuestos Configurados" />
        <Divider />
        <CardContent>
          <List>
            {impuestos.map((imp, i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={imp.nombre}
                  secondary={`Tipo: ${imp.tipo} - Valor: ${imp.valor} - Aplicación: ${imp.aplicacion}${imp.incluir_en_total ? ' (Incluido en total)' : ''}`}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => moverImpuesto(i, 'arriba')}><ArrowUpwardIcon /></IconButton>
                  <IconButton onClick={() => moverImpuesto(i, 'abajo')}><ArrowDownwardIcon /></IconButton>
                  <IconButton onClick={() => {
                    setEditingIndex(i);
                    setForm(imp);
                    setOpen(true);
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => eliminarImpuesto(i)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
        <CardActions>
          <Button startIcon={<AddCircleIcon />} onClick={() => { setEditingIndex(null); setOpen(true); }} variant="contained">
            Agregar Impuesto
          </Button>
        </CardActions>
      </Card>

      <Dialog open={open} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Editar Impuesto' : 'Agregar Impuesto'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} sx={{ mt: 2 }} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <MenuItem value="porcentaje">Porcentaje</MenuItem>
              <MenuItem value="fijo">Monto fijo</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Valor" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} sx={{ mt: 2 }} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Aplicación</InputLabel>
            <Select value={form.aplicacion} onChange={(e) => setForm({ ...form, aplicacion: e.target.value })}>
              <MenuItem value="compra">Compra</MenuItem>
              <MenuItem value="venta">Venta</MenuItem>
              <MenuItem value="ambos">Ambos</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Cuenta Contable (opcional)" value={form.cuenta_contable} onChange={(e) => setForm({ ...form, cuenta_contable: e.target.value })} sx={{ mt: 2 }} />
          <TextField fullWidth label="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} sx={{ mt: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <Typography sx={{ mr: 2 }}>¿Incluido en total?</Typography>
            <Switch checked={form.incluir_en_total} onChange={(e) => setForm({ ...form, incluir_en_total: e.target.checked })} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography sx={{ mr: 2 }}>¿Activo?</Typography>
            <Switch checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={reset}>Cancelar</Button>
          <Button startIcon={<SaveIcon />} variant="contained" onClick={guardarImpuesto}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};
