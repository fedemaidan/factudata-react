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
  LinearProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { updateEmpresaDetails } from 'src/services/empresaService';

export const ProveedoresDetails = ({ empresa }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [proveedores, setProveedores] = useState(empresa.proveedores);

  // useFormik para manejar el formulario de proveedores
  const formik = useFormik({
    initialValues: {
      nombre: '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre del proveedor es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const newProveedor = values.nombre;
      const newProveedores = [...proveedores, newProveedor]
      setProveedores([...proveedores, newProveedor]);
      await updateEmpresaDetails(empresa.id, {proveedores: newProveedores})
      resetForm();
      setIsLoading(false);
    },
  });

  const eliminarProveedor = async (nombreProveedor) => {
    setIsLoading(true);
    const newProveedores = proveedores.filter((prov) => prov !== nombreProveedor);
    setProveedores(newProveedores);
    await updateEmpresaDetails(empresa.id, { proveedores: newProveedores })
    setIsLoading(false);
  };

  return (
    <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
      <Card>
        <CardHeader title="Gestionar Proveedores" />
        <Divider />
        <CardContent>
          <List>
            {proveedores.map((proveedor, index) => ( // Usar index como key en caso de que haya nombres duplicados
              <ListItem key={index} divider> 
                <ListItemText primary={proveedor} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => eliminarProveedor(proveedor)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              name="nombre"
              label="Nombre del Proveedor"
              value={formik.values.nombre}
              onChange={formik.handleChange}
              error={formik.touched.nombre && Boolean(formik.errors.nombre)}
              helperText={formik.touched.nombre && formik.errors.nombre}
            />
            <IconButton type="submit" color="primary">
              <AddCircleIcon />
            </IconButton>
          </Box>
        </CardContent>
        <Divider />
      </Card>
      {isLoading && <LinearProgress />}
    </form>
  );
};
