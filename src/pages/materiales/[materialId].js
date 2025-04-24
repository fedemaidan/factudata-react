import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import {
  Container,
  TextField,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
} from '@mui/material';
import materialService from 'src/services/materialService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

const MaterialFormPage = () => {
  const router = useRouter();
  const { materialId } = router.query;
  const isNew = materialId === 'nuevo';

  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const handleCloseAlert = (_, reason) => {
    if (reason === 'clickaway') return;
    setAlert({ ...alert, open: false });
  };

  const formik = useFormik({
    initialValues: {
      nombre: '',
      SKU: '',
      marca: '',
      producto: '',
      rubro: '',
      zona: '',
    },
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre es requerido'),
      SKU: Yup.string().required('El SKU es requerido'),
    }),
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        if (isNew) {
          await materialService.createMaterial(values);
          setAlert({ open: true, message: 'Material creado con éxito', severity: 'success' });
        } else {
          await materialService.updateMaterial(materialId, values);
          setAlert({ open: true, message: 'Material actualizado con éxito', severity: 'success' });
        }
        setTimeout(() => router.push('/materiales'), 1500);
      } catch (error) {
        setAlert({ open: true, message: 'Error al guardar el material', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!isNew && materialId) {
        const data = await materialService.getMaterialById(materialId);
        if (data) {
          formik.setValues(data);
        }
      }
    };
    fetchMaterial();
  }, [materialId, isNew]);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isNew ? 'Crear Material' : 'Editar Material'}
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
          label="SKU"
          name="SKU"
          value={formik.values.SKU}
          onChange={formik.handleChange}
          error={formik.touched.SKU && Boolean(formik.errors.SKU)}
          helperText={formik.touched.SKU && formik.errors.SKU}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Marca"
          name="marca"
          value={formik.values.marca}
          onChange={formik.handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Producto"
          name="producto"
          value={formik.values.producto}
          onChange={formik.handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Rubro"
          name="rubro"
          value={formik.values.rubro}
          onChange={formik.handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Zona"
          name="zona"
          value={formik.values.zona}
          onChange={formik.handleChange}
          margin="normal"
        />

        <Box sx={{ py: 2 }}>
          <Button color="primary" variant="contained" type="submit" disabled={isLoading}>
            {!isLoading ? 'Guardar Material' : <CircularProgress size={24} />}
          </Button>
          <Button
            color="primary"
            variant="text"
            onClick={() => router.push('/materiales')}
            sx={{ ml: 2 }}
          >
            Cancelar
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

MaterialFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MaterialFormPage;
