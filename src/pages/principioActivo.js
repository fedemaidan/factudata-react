import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import { Container, TextField, Typography, Button, CircularProgress, Snackbar, Alert, Box, FormControlLabel, Checkbox, Chip } from '@mui/material';
import principioActivoService from 'src/services/principioActivoService';

const PrincipioActivoFormPage = () => {
  const router = useRouter();
  const { principioActivoId } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [aliasInput, setAliasInput] = useState(''); // Para manejar el input de alias

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    setAlert({ ...alert, open: false });
  };

  const formik = useFormik({
    initialValues: {
      nombre: '',
      precio: '',
      precio_maximo: '',
      alias: [], // Ahora es un array de alias
      activo: true,
    },
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre es requerido'),
      precio: Yup.number().required('El precio es requerido').min(0, 'El precio debe ser positivo'),
      precio_maximo: Yup.number().min(0, 'El precio máximo debe ser positivo'),
    }),
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        if (principioActivoId) {
          await principioActivoService.updatePrincipioActivo(principioActivoId, values);
          setAlert({ open: true, message: 'Principio activo actualizado con éxito', severity: 'success' });
        } else {
          await principioActivoService.createPrincipioActivo(values);
          setAlert({ open: true, message: 'Principio activo creado con éxito', severity: 'success' });
        }
      } catch (error) {
        setAlert({ open: true, message: 'Error al guardar el principio activo', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    const fetchPrincipioActivoData = async () => {
      if (principioActivoId) {
        const data = await principioActivoService.getPrincipioActivoById(principioActivoId);
        if (data) {
          formik.setValues(data);
        }
      }
    };
    fetchPrincipioActivoData();
  }, [principioActivoId]);

  // Manejo de alias
  const handleAddAlias = () => {
    if (aliasInput.trim() && !formik.values.alias.includes(aliasInput.trim())) {
      formik.setFieldValue('alias', [...formik.values.alias, aliasInput.trim()]);
      setAliasInput('');
    }
  };

  const handleRemoveAlias = (aliasToRemove) => {
    formik.setFieldValue(
      'alias',
      formik.values.alias.filter((alias) => alias !== aliasToRemove)
    );
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {principioActivoId ? 'Editar Principio Activo' : 'Crear Principio Activo'}
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          label="Nombre"
          name="nombre"
          value={formik.values.nombre}
          onChange={formik.handleChange}
          error={formik.touched.nombre && Boolean(formik.errors.nombre)}
          helperText={formik.touched.nombre && formik.errors.nombre}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Precio"
          name="precio"
          type="number"
          value={formik.values.precio}
          onChange={formik.handleChange}
          error={formik.touched.precio && Boolean(formik.errors.precio)}
          helperText={formik.touched.precio && formik.errors.precio}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Precio Máximo"
          name="precio_maximo"
          type="number"
          value={formik.values.precio_maximo}
          onChange={formik.handleChange}
          error={formik.touched.precio_maximo && Boolean(formik.errors.precio_maximo)}
          helperText={formik.touched.precio_maximo && formik.errors.precio_maximo}
          margin="normal"
        />

        {/* Campo para manejar alias */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <TextField
            label="Agregar Alias"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAlias();
              }
            }}
            margin="normal"
          />
          <Button variant="contained" onClick={handleAddAlias}>
            Agregar
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {formik.values.alias.map((alias, index) => (
            <Chip
              key={index}
              label={alias}
              onDelete={() => handleRemoveAlias(alias)}
              color="primary"
            />
          ))}
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              name="activo"
              checked={formik.values.activo}
              onChange={formik.handleChange}
            />
          }
          label="Activo"
        />
        <Box sx={{ py: 2 }}>
          <Button color="primary" variant="contained" type="submit" disabled={isLoading}>
            {!isLoading ? 'Guardar Principio Activo' : <CircularProgress />}
          </Button>
        </Box>
      </form>
      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PrincipioActivoFormPage;
