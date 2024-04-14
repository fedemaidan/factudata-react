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
  LinearProgress,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';

export const NumerosTelefonoDetails = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [numerosTelefonos, setNumerosTelefonos] = useState(['5491162948395']);

  // Función para agregar un nuevo número de teléfono al estado
  const agregarTelefono = (telefono) => {
    setNumerosTelefonos([...numerosTelefonos, telefono]);
  };

  // Función para eliminar un número de teléfono del estado
  const eliminarTelefono = (index) => {
    const nuevosTelefonos = numerosTelefonos.filter((_, i) => i !== index);
    setNumerosTelefonos(nuevosTelefonos);
  };

  // useFormik para manejar el formulario (como ejemplo, solo se muestra para los números de teléfono)
  const formik = useFormik({
    initialValues: {
      nuevoTelefono: '',
    },
    validationSchema: Yup.object({
      nuevoTelefono: Yup.string().matches(/^\+\d+$/, 'Debe ser un número de teléfono válido').required('El número de teléfono es requerido'),
    }),
    onSubmit: (values, { resetForm }) => {
      agregarTelefono(values.nuevoTelefono);
      resetForm();
    },
  });

  return (
    <form autoComplete="off" noValidate onSubmit={formik.handleSubmit}>
      {/* ... */}
      <Card>
        <CardHeader title="Gestionar números de whatsapp" />
        <Divider />
        <CardContent>
          {/* UI para Números de Teléfono */}
          <Typography variant="h6">Números de Teléfono</Typography>
          {numerosTelefonos.map((telefono, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ mr: 2 }}>{telefono}</Typography>
              <IconButton onClick={() => eliminarTelefono(index)} color="error">
                <RemoveCircleIcon />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TextField
              fullWidth
              name="nuevoTelefono"
              label="Agregar Teléfono"
              value={formik.values.nuevoTelefono}
              onChange={formik.handleChange}
              error={formik.touched.nuevoTelefono && Boolean(formik.errors.nuevoTelefono)}
              helperText={formik.touched.nuevoTelefono && formik.errors.nuevoTelefono}
            />
            <IconButton type="submit" color="primary">
              <AddCircleIcon />
            </IconButton>
          </Box>
          <CardContent>
          
        </CardContent>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<SaveIcon />} type="submit">Guardar Cambios</Button>
        </CardActions>
      </Card>
      {/* Muestra de alertas y progreso */}
      {isLoading && <LinearProgress />}
    </form>
  );
};
