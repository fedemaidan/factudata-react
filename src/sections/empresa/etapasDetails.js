import React, { useState } from 'react';
import {
  Card, CardHeader, Divider, CardContent, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Snackbar, Alert, Autocomplete, Chip
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const EtapasDetails = ({ empresa, refreshEmpresa }) => {
  const [etapas, setEtapas] = useState(empresa?.etapas || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', categorias: [], proveedores: [] });
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const categoriasOptions = (empresa.categorias || []).flatMap(cat => [
    cat.name,
    ...(cat.subcategorias || []).map(sub => `${cat.name} - ${sub}`)
  ]);
  const proveedoresOptions = empresa.proveedores ?? [];

  const abrirModal = (index = null) => {
    setEditingIndex(index);
    if (index !== null) {
      setForm(etapas[index]);
    } else {
      setForm({ nombre: '', descripcion: '', categorias: [], proveedores: [] });
    }
    setOpen(true);
  };

  const cerrarModal = () => {
    setEditingIndex(null);
    setForm({ nombre: '', descripcion: '', categorias: [], proveedores: [] });
    setOpen(false);
  };

  const guardarEtapa = async () => {
    const nuevasEtapas = [...etapas];
    if (editingIndex !== null) {
      nuevasEtapas[editingIndex] = form;
    } else {
      nuevasEtapas.push(form);
    }

    try {
      await updateEmpresaDetails(empresa.id, { etapas: nuevasEtapas });
      setEtapas(nuevasEtapas);
      await refreshEmpresa?.();
      setSnackbar({ open: true, message: 'Etapa guardada con éxito', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al guardar', severity: 'error' });
    } finally {
      cerrarModal();
    }
  };

  const eliminarEtapa = async (index) => {
    const nuevas = etapas.filter((_, i) => i !== index);
    try {
      await updateEmpresaDetails(empresa.id, { etapas: nuevas });
      await refreshEmpresa?.();
      setEtapas(nuevas);
      setSnackbar({ open: true, message: 'Etapa eliminada', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Error al eliminar', severity: 'error' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="Etapas de Obra" />
        <Divider />
        <CardContent>
          <List>
            {etapas.map((etapa, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={etapa.nombre}
                  secondary={`Descripción: ${etapa.descripcion || '—'} | Categorías: ${etapa.categorias.join(', ')} | Proveedores: ${etapa.proveedores.join(', ')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => abrirModal(index)}><EditIcon /></IconButton>
                  <IconButton onClick={() => eliminarEtapa(index)}><DeleteIcon /></IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => abrirModal()}>
            Agregar Etapa
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={cerrarModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Editar Etapa' : 'Nueva Etapa'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            sx={{ mt: 2 }}
          />
          <Autocomplete
            multiple
            options={categoriasOptions}
            value={form.categorias}
            onChange={(e, value) => setForm({ ...form, categorias: value })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip key={index} label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Categorías relacionadas" sx={{ mt: 2 }} />
            )}
          />
          <Autocomplete
            multiple
            options={proveedoresOptions}
            value={form.proveedores}
            onChange={(e, value) => setForm({ ...form, proveedores: value })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip key={index} label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Proveedores relacionados" sx={{ mt: 2 }} />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarModal}>Cancelar</Button>
          <Button startIcon={<SaveIcon />} onClick={guardarEtapa} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
