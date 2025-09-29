import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Switch
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import Papa from 'papaparse';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const ObrasDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Estructura: [{ id, nombre, cliente }]
  const [obras, setObras] = useState(() => {
    const arr = Array.isArray(empresa?.obras) ? empresa.obras : [];
    return arr.map(o => ({
      id: o.id ?? crypto.randomUUID(),
      nombre: o.nombre ?? '',
      cliente: o.cliente ?? '',
      activo: o.activo !== undefined ? o.activo : true
    }));
  });
  

  const [editingIndex, setEditingIndex] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const closeSnack = () => setSnack(s => ({ ...s, open: false }));

  const formik = useFormik({
    initialValues: { nombre: '', cliente: '' },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre es obligatorio')
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        const nuevaObra = {
          id: editingIndex !== null ? obras[editingIndex].id : crypto.randomUUID(),
          nombre: values.nombre.trim(),
          cliente: (values.cliente || '').trim(),
          activo: editingIndex !== null ? obras[editingIndex].activo : true
        };

        const next = [...obras];
        if (editingIndex !== null) next[editingIndex] = nuevaObra;
        else next.push(nuevaObra);

        setObras(next);
        await updateEmpresaDetails(empresa.id, { obras: next });

        setSnack({ open: true, msg: editingIndex !== null ? 'Obra actualizada' : 'Obra agregada', sev: 'success' });
      } catch (e) {
        console.error(e);
        setSnack({ open: true, msg: 'Error al guardar la obra', sev: 'error' });
      } finally {
        setOpenModal(false);
        setEditingIndex(null);
        resetForm();
        setIsLoading(false);
      }
    }
  });

  const iniciarCreacion = () => {
    setEditingIndex(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const toggleActivo = async (id) => {
    setIsLoading(true);
    try {
      const next = obras.map(o =>
        o.id === id ? { ...o, activo: !o.activo } : o
      );
      setObras(next);
      await updateEmpresaDetails(empresa.id, { obras: next });
      setSnack({ open: true, msg: 'Estado de la obra actualizado', sev: 'success' });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, msg: 'Error al cambiar estado', sev: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const iniciarEdicion = (index) => {
    const o = obras[index];
    setEditingIndex(index);
    formik.setValues({ nombre: o.nombre, cliente: o.cliente });
    setOpenModal(true);
  };

  const cancelar = () => {
    setEditingIndex(null);
    formik.resetForm();
    setOpenModal(false);
  };

  const confirmar = (msg, action) => {
    setConfirmMsg(msg);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarObra = (id) => {
    confirmar('¿Eliminar esta obra?', async () => {
      setIsLoading(true);
      try {
        const next = obras.filter(o => o.id !== id);
        setObras(next);
        await updateEmpresaDetails(empresa.id, { obras: next });
        setSnack({ open: true, msg: 'Obra eliminada', sev: 'success' });
      } catch (e) {
        console.error(e);
        setSnack({ open: true, msg: 'Error al eliminar obra', sev: 'error' });
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      const nuevos = parsed.data
        .map(row => ({
          id: crypto.randomUUID(),
          nombre: (row.Nombre || '').trim(),
          cliente: (row.Cliente || '').trim()
        }))
        .filter(o => o.nombre);

      const merged = [...obras, ...nuevos];
      setObras(merged);
      await updateEmpresaDetails(empresa.id, { obras: merged });

      setSnack({ open: true, msg: 'Obras importadas con éxito', sev: 'success' });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, msg: 'Error al importar CSV', sev: 'error' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Obras" />
        <Divider />
        <CardContent>
          {(!obras || obras.length === 0) && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Aún no tenés obras cargadas. Agregá la primera para empezar.
            </Typography>
          )}
          <List>
            {obras.map((o, idx) => (
              <ListItem key={o.id} divider>
              <ListItemText
                primary={o.nombre}
                secondary={`Cliente: ${o.cliente || '—'}`}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={o.activo}
                  onChange={(e) => toggleActivo(o.id, e.target.checked)}
                  color="primary"
                />
                <IconButton edge="end" onClick={() => iniciarEdicion(idx)}>
                  <EditIcon />
                </IconButton>
                <IconButton edge="end" onClick={() => eliminarObra(o.id)}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            
            ))}
          </List>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Button color="primary" variant="outlined" component="label">
            Importar desde CSV
            <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
          </Button>
          <Button
            variant="text"
            onClick={() => {
              const contenido = "Nombre,Cliente\nBoedo 123,Juan Pérez\nMiralla 450,";
              const blob = new Blob([contenido], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'obras_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar ejemplo CSV
          </Button>
          <Button color="primary" variant="contained" startIcon={<AddCircleIcon />} onClick={iniciarCreacion}>
            Agregar Obra
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelar}>
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle>{editingIndex !== null ? 'Editar Obra' : 'Agregar Obra'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="nombre"
              label="Nombre de la obra"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              name="cliente"
              label="Cliente (texto libre)"
              value={formik.values.cliente}
              onChange={formik.handleChange}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelar}>Cancelar</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMsg}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={confirmAction} variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.sev} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>

      {isLoading && <LinearProgress />}
    </>
  );
};
