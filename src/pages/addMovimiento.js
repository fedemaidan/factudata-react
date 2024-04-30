import { useState, useEffect} from 'react';
import { Box, Container, TextField, Typography, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import movimientosService from 'src/services/movimientosService'; // Asegúrate de que este servicio tiene un método para agregar movimientos
import { useAuthContext } from 'src/contexts/auth-context';
import {getEmpresaDetailsFromUser} from 'src/services/empresaService';
import { useRouter } from 'next/router';

const AddMovementPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { proyectoId, proyectoName } = router.query;
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info', 
  });

  const [tipos, setTipos] = useState([
    {value: 'egreso', name: 'Egreso'},
    {value: 'ingreso', name: 'Ingreso'},
  ]);
  const [monedas, setMonedas] = useState([
    {value: 'USD', name: 'USD - Dolar'},
    {value: 'ARS', name: 'ARS - Pesos'},
  ]);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    
      setIsLoading(true);

      async function fetchMovimientoData() {
        const empresa = await getEmpresaDetailsFromUser(user)
        setEmpresa(empresa)
        const cates = empresa.categorias
        const proveedores = empresa.proveedores
        cates.push({name: "Ingreso dinero", subcategorias: []})
        cates.push({name: "Ajuste", subcategorias: ["Ajuste"]})
        proveedores.push("Ajuste")
        setCategorias(cates)
        setProveedores(proveedores)

        formik.setValues({
          
        });
        
      }
      
      fetchMovimientoData();
      setIsLoading(false);
    
  }, []);


  
  // Define las categorías, tipos, monedas y proveedores como estados, 
  // y asegúrate de cargar estos datos tal vez desde un useEffect o contexto

  const formik = useFormik({
    initialValues: {
      fecha_factura: '',
      tipo: '',
      total: '',
      moneda: '',
      nombre_proveedor: '',
      categoria: '',
      subcategoria: '',
      observacion: '',
      // ... otros campos que necesites
    },
    validationSchema: Yup.object({
      // Aquí definirías las validaciones si es necesario
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        values = {
            ...values,
            proyecto: proyectoName,
            proyecto_id: proyectoId,
            user_phone: user.phone
        }
        const result = await movimientosService.addMovimiento(values); // Envía el UID del usuario u otro identificador si es necesario
        if (result) {
          setAlert({
            open: true,
            message: 'Movimiento agregado con éxito!',
            severity: 'success',
          });
          formik.resetForm();
        } else {
          throw new Error('Error al agregar el movimiento.');
        }
      } catch (error) {
        setAlert({
          open: true,
          message: error.message || 'Error al agregar el movimiento.',
          severity: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  useEffect(() => {
    // Encuentra la categoría seleccionada basada en el valor del formulario
    const foundCategory = categorias.find(c => c.name === formik.values.categoria);
    setCategoriaSeleccionada(foundCategory);
  }, [formik.values.categoria, categorias]); // Dependencias del useEffect


  return (
    <>
      <Container maxWidth="lg">
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 8
          }}
        >
          <Typography variant="h4" sx={{ mb: 3 }}>
            Agregar Movimiento
          </Typography>

          {/* Formulario */}
          <form onSubmit={formik.handleSubmit}>
            {/* ... Los campos de tu formulario ... */}
            <>
            <FormControl fullWidth margin="normal">
                <InputLabel id={`label-categorias`}>Tipo</InputLabel>
                <Select
                  labelId={`label-type`}
                  id="type"
                  name="type"
                  label="Tipo"
                  value={formik.values.type}
                  onChange={formik.handleChange}
                >
                  {tipos.map((element, index) => (
                    <MenuItem key={index} value={element.value}>
                      {element.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Total"
                name="total"
                type="number"
                value={formik.values.total}
                onChange={formik.handleChange}
                error={formik.touched.total && Boolean(formik.errors.total)}
                helperText={formik.touched.total && formik.errors.total}
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id={`label-monedas`}>Moneda</InputLabel>
                <Select
                  labelId={`label-moneda`}
                  id="moneda"
                  name="moneda"
                  label="Moneda"
                  value={formik.values.moneda}
                  onChange={formik.handleChange}
                >
                  {monedas.map((element, index) => (
                    <MenuItem key={index} value={element.value}>
                      {element.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id={`label-proveedor`}>Proveedor</InputLabel>
                <Select
                  labelId={`label-proveedor`}
                  id="nombre_proveedor"
                  name="nombre_proveedor"
                  label="Proveedor"
                  value={formik.values.nombre_proveedor}
                  onChange={formik.handleChange}
                >
                  {proveedores.map((element, index) => (
                    <MenuItem key={index} value={element}>
                      {element}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
      <FormControl fullWidth margin="normal">
            <InputLabel id={`label-categorias`}>Categorías</InputLabel>
            <Select
              labelId={`label-categorias`}
              id="categoria"
              name="categoria"
              label="Categoría"
              value={formik.values.categoria}
              onChange={formik.handleChange}
            >
              {categorias.map((element, index) => (
                <MenuItem key={index} value={element.name}>
                  {element.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        {(categoriaSeleccionada && categoriaSeleccionada.subcategorias?.length != 0) && 
          <FormControl fullWidth margin="normal">
            <InputLabel id={`label-subcategoria`}>Subcategoría</InputLabel>
            <Select
              labelId={`label-subcategorias`}
              id="subcategoria"
              name="subcategoria"
              label="Subcategoría"
              value={formik.values.subcategoria}
              onChange={formik.handleChange}
            >
              {categoriaSeleccionada.subcategorias.map((element, index) => (
                <MenuItem key={index} value={element}>
                  {element}
                </MenuItem>
              ))}
            </Select>
          </FormControl>}

          <TextField
            fullWidth
            label="Observación"
            name="observacion"
            multiline
            rows={4}
            value={formik.values.observacion}
            onChange={formik.handleChange}
            error={formik.touched.observacion && Boolean(formik.errors.observacion)}
            helperText={formik.touched.observacion && formik.errors.observacion}
            margin="normal"
          />
          </>
            <Box sx={{ py: 2 }}>
              <Button color="primary" variant="contained" type="submit" disabled={isLoading}>
                {isLoading ? 'Procesando...' : 'Agregar Movimiento'}
              </Button>
            </Box>
          </form>

          {/* Notificaciones */}
          <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
            <Alert severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </Snackbar>

          {/* Loading */}
          {isLoading && <CircularProgress />}
        </Box>
      </Container>
    </>
  );
};

export default AddMovementPage;
