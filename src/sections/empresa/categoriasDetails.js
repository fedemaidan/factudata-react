import React, { useState } from 'react';
import {
  Box, Button, Card, CardActions, CardContent, CardHeader, Divider,
  TextField, Typography, IconButton, List, ListItem, ListItemText,
  ListItemSecondaryAction, LinearProgress, Chip
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const CategoriasDetails = ( {empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState(empresa.categorias);
  const [editingCategoria, setEditingCategoria] = useState(null);

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
      if (editingCategoria) {
        const newCategories = categorias.map((cat) => cat.id === editingCategoria.id ? { ...cat, name: values.name } : cat);
        setCategorias(newCategories);
        setEditingCategoria(null);
        await updateEmpresaDetails(empresa.id, {categorias: newCategories})
      } else {
        const newCategoria = { id: Date.now(), name: values.name, subcategorias: [] };
        setCategorias([...categorias, newCategoria]);
        await updateEmpresaDetails(empresa.id, {categorias: [...categorias, newCategoria]})
      }
      resetForm();
      setIsLoading(false);
    },
  });

  const agregarSubcategoria = async (categoriaId, subcategoria) => {
    setIsLoading(true);
    const newCategorias = categorias.map((cat) =>
    cat.id === categoriaId ? { ...cat, subcategorias: [...cat.subcategorias, subcategoria] } : cat
  )
    setCategorias(newCategorias);
    formik.setFieldValue('subcategoria', '', false);
    await updateEmpresaDetails(empresa.id, {categorias: newCategorias})
    setIsLoading(false);
  };

  const eliminarSubcategoria = async (categoriaId, subcategoria) => {
    setIsLoading(true)
    const newCategorias = categorias.map((cat) =>
    cat.id === categoriaId ? { ...cat, subcategorias: cat.subcategorias.filter(sub => sub !== subcategoria) } : cat
  )
    setCategorias(newCategorias);
    await updateEmpresaDetails(empresa.id, {categorias: newCategorias})
    setIsLoading(false);
  };

  const startEditCategoria = (categoria) => {
    setEditingCategoria(categoria);
    formik.setFieldValue('name', categoria.name, false);
  };

  const eliminarCategoria = async (id) => {
    setIsLoading(true);
    const newCategorias =categorias.filter((cat) => cat.id !== id);
    setCategorias(newCategorias);
    await updateEmpresaDetails(empresa.id, {categorias: newCategorias})
    setIsLoading(false);
  };

  return (
    <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', mb: 1 }}>
            <TextField
              fullWidth
              name="name"
              label="Nombre de la Categoría"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />
            {editingCategoria && (
              <TextField
                fullWidth
                name="subcategoria"
                label="Añadir Subcategoría"
                value={formik.values.subcategoria}
                onChange={formik.handleChange}
                onKeyPress={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    agregarSubcategoria(editingCategoria.id, formik.values.subcategoria);
                  }
                }}
              />
            )}
            <IconButton type="submit" color="primary">
              <AddCircleIcon />
            </IconButton>
            {editingCategoria && (
              <Button onClick={() => setEditingCategoria(null)}>
                Cancelar
              </Button>
            )}
          </Box>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          {/* <Button variant="contained" startIcon={<SaveIcon />} type="submit">Guardar Cambios</Button> */}
        </CardActions>
      </Card>
      {isLoading && <LinearProgress />}
    </form>
  );
};
