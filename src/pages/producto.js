import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/router';
import { Container, TextField, Typography, Button, CircularProgress, Snackbar, Alert, Box, FormControlLabel, Checkbox } from '@mui/material';
import productsService from 'src/services/productService';

const ProductoFormPage = () => {
  const router = useRouter();
  const { productoId } = router.query;
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [producto, setProducto] = useState(null);

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    setAlert({ ...alert, open: false });
  };

  const formik = useFormik({
    initialValues: {
      registro: '',
      registro_senasa: '',
      registro_inase: '',
      especie: '',
      cultivar: '',
      marca: '',
      empresa: '',
      activos: '',
      banda_toxicologica: '',
      precio: '',
      producto_propio: false,
      stock: '',
      potencial_proveedor: '',
      rentabilidad: '',
      precio_minimo: '',     // Nuevo campo
      precio_maximo: '',     // Nuevo campo
    },
    validationSchema: Yup.object({
      registro: Yup.string().required('El registro es requerido'),
      // registro_senasa: Yup.number().required('El registro SENASA es requerido'),
      // registro_inase: Yup.number().required('El registro INASE es requerido'),
      // especie: Yup.string().required('La especie es requerida'),
      // cultivar: Yup.string().required('El cultivar es requerido'),
      // marca: Yup.string().required('La marca es requerida'),
      // empresa: Yup.string().required('La empresa es requerida'),
      // activos: Yup.string().required('Los activos son requeridos'),
      // banda_toxicologica: Yup.string().required('La banda toxicológica es requerida'),
      precio: Yup.number().required('El precio es requerido').min(0, 'El precio debe ser positivo'),
      stock: Yup.number().required('El stock es requerido').min(0, 'El stock debe ser positivo'),
      rentabilidad: Yup.number().required('La rentabilidad es requerida').min(0, 'La rentabilidad debe ser positiva'),
      // precio_minimo: Yup.number().required('El precio mínimo es requerido').min(0, 'Debe ser positivo'),  // Validación de precio mínimo
      // precio_maximo: Yup.number().required('El precio máximo es requerido').min(0, 'Debe ser positivo'),  // Validación de precio máximo
    }),
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        if (productoId) {
          await productsService.updateProduct(productoId, values);
          setAlert({ open: true, message: 'Producto actualizado con éxito', severity: 'success' });
        } else {
          await productsService.createProduct(values);
          setAlert({ open: true, message: 'Producto creado con éxito', severity: 'success' });
        }
      } catch (error) {
        setAlert({ open: true, message: 'Error al guardar el producto', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    const fetchProductoData = async () => {
      console.log("prodcutoid", productoId)
      if (productoId) {
        const data = await productsService.getProductById(productoId);
        if (data) {
          formik.setValues(data);
          setProducto(data);
        }
      }
    };
    fetchProductoData();
  }, [productoId]);

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" sx={{ mb: 3 }}>
        {productoId ? 'Editar Producto' : 'Crear Producto'}
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          label="Registro"
          name="registro"
          value={formik.values.registro}
          onChange={formik.handleChange}
          error={formik.touched.registro && Boolean(formik.errors.registro)}
          helperText={formik.touched.registro && formik.errors.registro}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Registro SENASA"
          name="registro_senasa"
          type="number"
          value={formik.values.registro_senasa}
          onChange={formik.handleChange}
          error={formik.touched.registro_senasa && Boolean(formik.errors.registro_senasa)}
          helperText={formik.touched.registro_senasa && formik.errors.registro_senasa}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Registro INASE"
          name="registro_inase"
          type="number"
          value={formik.values.registro_inase}
          onChange={formik.handleChange}
          error={formik.touched.registro_inase && Boolean(formik.errors.registro_inase)}
          helperText={formik.touched.registro_inase && formik.errors.registro_inase}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Especie"
          name="especie"
          value={formik.values.especie}
          onChange={formik.handleChange}
          error={formik.touched.especie && Boolean(formik.errors.especie)}
          helperText={formik.touched.especie && formik.errors.especie}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Cultivar"
          name="cultivar"
          value={formik.values.cultivar}
          onChange={formik.handleChange}
          error={formik.touched.cultivar && Boolean(formik.errors.cultivar)}
          helperText={formik.touched.cultivar && formik.errors.cultivar}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Marca"
          name="marca"
          value={formik.values.marca}
          onChange={formik.handleChange}
          error={formik.touched.marca && Boolean(formik.errors.marca)}
          helperText={formik.touched.marca && formik.errors.marca}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Empresa"
          name="empresa"
          value={formik.values.empresa}
          onChange={formik.handleChange}
          error={formik.touched.empresa && Boolean(formik.errors.empresa)}
          helperText={formik.touched.empresa && formik.errors.empresa}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Activos"
          name="activos"
          value={formik.values.activos}
          onChange={formik.handleChange}
          error={formik.touched.activos && Boolean(formik.errors.activos)}
          helperText={formik.touched.activos && formik.errors.activos}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Banda Toxicológica"
          name="banda_toxicologica"
          value={formik.values.banda_toxicologica}
          onChange={formik.handleChange}
          error={formik.touched.banda_toxicologica && Boolean(formik.errors.banda_toxicologica)}
          helperText={formik.touched.banda_toxicologica && formik.errors.banda_toxicologica}
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
        label="Precio Mínimo"
        name="precio_minimo"
        type="number"
        value={formik.values.precio_minimo}
        onChange={formik.handleChange}
        error={formik.touched.precio_minimo && Boolean(formik.errors.precio_minimo)}
        helperText={formik.touched.precio_minimo && formik.errors.precio_minimo}
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

        <FormControlLabel
          control={
            <Checkbox
              name="producto_propio"
              checked={formik.values.producto_propio}
              onChange={formik.handleChange}
            />
          }
          label="Producto Propio"
        />

        <TextField
          fullWidth
          label="Stock"
          name="stock"
          type="number"
          value={formik.values.stock}
          onChange={formik.handleChange}
          error={formik.touched.stock && Boolean(formik.errors.stock)}
          helperText={formik.touched.stock && formik.errors.stock}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Potencial Proveedor"
          name="potencial_proveedor"
          value={formik.values.potencial_proveedor}
          onChange={formik.handleChange}
          error={formik.touched.potencial_proveedor && Boolean(formik.errors.potencial_proveedor)}
          helperText={formik.touched.potencial_proveedor && formik.errors.potencial_proveedor}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Rentabilidad (%)"
          name="rentabilidad"
          type="number"
          value={formik.values.rentabilidad}
          onChange={formik.handleChange}
          error={formik.touched.rentabilidad && Boolean(formik.errors.rentabilidad)}
          helperText={formik.touched.rentabilidad && formik.errors.rentabilidad}
          margin="normal"
        />

        <Box sx={{ py: 2 }}>
          <Button color="primary" variant="contained" type="submit" disabled={isLoading}>
            {!isLoading ? 'Guardar Producto' : <CircularProgress />}
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

export default ProductoFormPage;
