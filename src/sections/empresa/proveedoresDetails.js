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
  Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';
import Papa from 'papaparse';

export const ProveedoresDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [proveedores, setProveedores] = useState(empresa.proveedores);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const formik = useFormik({
    initialValues: {
      nombre: editingProveedor ? editingProveedor : '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proveedor es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        const newProveedor = values.nombre;
        let newProveedores;
        if (editingProveedor) {
          newProveedores = proveedores.map((prov) => (prov === editingProveedor ? newProveedor : prov));
          setSnackbarMessage('Proveedor actualizado con éxito');
        } else {
          newProveedores = [...proveedores, newProveedor];
          setSnackbarMessage('Proveedor agregado con éxito');
        }
        setProveedores(newProveedores);
        await updateEmpresaDetails(empresa.id, { proveedores: newProveedores });
        setEditingProveedor(null);
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/agregar el proveedor:', error);
        setSnackbarMessage('Error al actualizar/agregar el proveedor');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setOpenModal(false);
        setIsLoading(false);
      }
    },
  });

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarProveedor = async (nombreProveedor) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar el proveedor "${nombreProveedor}"?`, async () => {
      setIsLoading(true);
      try {
        const newProveedores = proveedores.filter((prov) => prov !== nombreProveedor);
        setProveedores(newProveedores);
        await updateEmpresaDetails(empresa.id, { proveedores: newProveedores });
        setSnackbarMessage('Proveedor eliminado con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        setSnackbarMessage('Error al eliminar proveedor');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const iniciarEdicionProveedor = (proveedor) => {
    setEditingProveedor(proveedor);
    formik.setValues({ nombre: proveedor });
    setOpenModal(true);
  };

  const iniciarCreacionProveedor = () => {
    setEditingProveedor(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingProveedor(null);
    formik.resetForm();
    setOpenModal(false);
  };


const handleImportarProveedoresCSV = async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  try {
    const texto = await archivo.text();
    const resultado = Papa.parse(texto, {
      header: true,
      skipEmptyLines: true
    });

    const nuevos = resultado.data
      .map(row => row.Proveedor?.trim())
      .filter(Boolean);

    const proveedoresUnicos = Array.from(new Set([...proveedores, ...nuevos]));

    setProveedores(proveedoresUnicos);
    await updateEmpresaDetails(empresa.id, { proveedores: proveedoresUnicos });

    setSnackbarMessage('Proveedores importados con éxito');
    setSnackbarSeverity('success');
  } catch (error) {
    console.error('Error al importar proveedores:', error);
    setSnackbarMessage('Error al importar el CSV de proveedores');
    setSnackbarSeverity('error');
  } finally {
    setSnackbarOpen(true);
  }
};


  return (
    <>
      <Card>
        <CardHeader title="Gestionar Proveedores" />
        <Divider />
        <CardContent>
          <List>
            {proveedores.map((proveedor, index) => (
              <ListItem key={index} divider>
                <ListItemText primary={proveedor} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => iniciarEdicionProveedor(proveedor)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => eliminarProveedor(proveedor)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
        <Divider />
        <Button
            color="primary"
            variant="outlined"
            component="label"
          >
            Importar desde CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleImportarProveedoresCSV}
            />
          </Button>
          <Button
            variant="text"
            onClick={() => {
              const contenido = "Proveedor\nGómez Construcciones\nAcero SA";
              const blob = new Blob([contenido], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'proveedores_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar ejemplo CSV
          </Button>

        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionProveedor}
          >
            Agregar Proveedor
          </Button>
          
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">{editingProveedor ? 'Editar Proveedor' : 'Agregar Proveedor'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="nombre"
              label="Nombre del Proveedor"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
              style={{ marginTop: '1rem' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelarEdicion} color="primary">
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              type="submit"
              sx={{ ml: 2 }}
            >
              {editingProveedor ? 'Guardar Cambios' : 'Agregar Proveedor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmAction}
            color="primary"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {isLoading && <LinearProgress />}
    </>
  );
};
