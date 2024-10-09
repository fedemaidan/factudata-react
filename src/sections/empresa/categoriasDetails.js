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
  Chip,
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

export const CategoriasDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState(empresa.categorias);
  const [editingCategoria, setEditingCategoria] = useState(null);
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
      name: editingCategoria ? editingCategoria.name : '',
      subcategoria: '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('El nombre de la categoría es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      try {
        if (editingCategoria) {
          let newCategories = categorias.map((cat) =>
            cat.id === editingCategoria.id ? { ...cat, name: values.name } : cat
          );
          if (values.subcategoria) {
            newCategories = newCategories.map((cat) =>
            cat.id === editingCategoria.id ? { ...cat, subcategorias: [...cat.subcategorias, values.subcategoria] } : cat
          );
          }

          setCategorias(newCategories);
          setEditingCategoria(null);
          setSnackbarMessage('Categoría actualizada con éxito');
        } else {
          const newCategoria = { id: Date.now(), name: values.name, subcategorias: [] };
          setCategorias([...categorias, newCategoria]);
          setSnackbarMessage('Categoría creada con éxito');
        }
        await updateEmpresaDetails(empresa.id, { categorias });
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/crear la categoría:', error);
        setSnackbarMessage('Error al actualizar/crear la categoría');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        resetForm();
        setOpenModal(false);
        setIsLoading(false);
      }
    },
  });

  const agregarSubcategoria = async (categoriaId, subcategoria) => {
    setIsLoading(true);
    try {
      const newCategorias = categorias.map((cat) =>
        cat.id === categoriaId ? { ...cat, subcategorias: [...cat.subcategorias, subcategoria] } : cat
      );
      setCategorias(newCategorias);
      formik.setFieldValue('subcategoria', '', false);
      await updateEmpresaDetails(empresa.id, { categorias: newCategorias });
      setSnackbarMessage('Subcategoría agregada con éxito');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error al agregar subcategoría:', error);
      setSnackbarMessage('Error al agregar subcategoría');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarSubcategoria = async (categoriaId, subcategoria) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar la subcategoría "${subcategoria}"?`, async () => {
      setIsLoading(true);
      try {
        const newCategorias = categorias.map((cat) =>
          cat.id === categoriaId ? { ...cat, subcategorias: cat.subcategorias.filter(sub => sub !== subcategoria) } : cat
        );
        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { categorias: newCategorias });
        setSnackbarMessage('Subcategoría eliminada con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar subcategoría:', error);
        setSnackbarMessage('Error al eliminar subcategoría');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const eliminarCategoria = async (id) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar la categoría?`, async () => {
      setIsLoading(true);
      try {
        const newCategorias = categorias.filter((cat) => cat.id !== id);
        setCategorias(newCategorias);
        await updateEmpresaDetails(empresa.id, { categorias: newCategorias });
        setSnackbarMessage('Categoría eliminada con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar categoría:', error);
        setSnackbarMessage('Error al eliminar categoría');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const startEditCategoria = (categoria) => {
    setEditingCategoria(categoria);
    formik.setValues({ name: categoria.name, subcategoria: '' });
    setOpenModal(true);
  };

  const iniciarCreacionCategoria = () => {
    setEditingCategoria(null);
    formik.resetForm();
    setOpenModal(true);
  };

  const cancelarEdicion = () => {
    setEditingCategoria(null);
    formik.resetForm();
    setOpenModal(false);
  };

  return (
    <>
      <Card>
        <CardHeader title="Gestionar Categorías" />
        <Divider />
        <CardContent>
          <List>
            {categorias.map((categoria) => (
              <ListItem key={categoria.id} divider>
                <ListItemText primary={categoria.name} secondary={
                  categoria.subcategorias.map(sub => (
                    <Chip
                      key={sub}
                      label={sub}
                      onDelete={() => eliminarSubcategoria(categoria.id, sub)}
                      color="primary"
                      size="small"
                      style={{ margin: 2 }}
                    />
                  ))
                } />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => startEditCategoria(categoria)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => eliminarCategoria(categoria.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={iniciarCreacionCategoria}
          >
            Agregar Categoría
          </Button>
        </CardActions>
      </Card>

      <Dialog open={openModal} onClose={cancelarEdicion} aria-labelledby="form-dialog-title">
        <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
          <DialogTitle id="form-dialog-title">{editingCategoria ? 'Editar Categoría' : 'Agregar Categoría'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="name"
              label="Nombre de la Categoría"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
              style={{ marginTop: '1rem' }}
            />
            {editingCategoria && (
              <TextField
                fullWidth
                name="subcategoria"
                label="Añadir Subcategoría"
                value={formik.values.subcategoria}
                onChange={formik.handleChange}
                // onKeyPress={event => {
                //   console.log("paso")
                //   // if (event.key === 'Enter') {
                //     console.log("paso1")
                //     event.preventDefault();
                //     console.log("paso2")
                //     agregarSubcategoria(editingCategoria.id, formik.values.subcategoria);
                //   // }
                // }}
                style={{ marginTop: '1rem' }}
              />
            )}
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
              {editingCategoria ? 'Guardar Cambios' : 'Agregar Categoría'}
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
