import Head from 'next/head';
import { Box, Container, TextField, Typography, Button, CircularProgress, Tab, Tabs, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import {getEmpresaDetailsFromUser} from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Timestamp } from 'firebase/firestore';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { margin } from '@mui/system';

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp.seconds * 1000);
  const year = date.getFullYear();
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const day = `0${date.getDate()}`.slice(-2);

  return `${year}-${month}-${day}`;
};

const dateToTimestamp = (dateString) => {
  if (!dateString) {
    return null;
  }

  const dateParts = dateString.split('-');
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  const date = new Date(year, month, day);
  const timestamp = Timestamp.fromDate(date);
  
  return timestamp;
};

const MovementDataEntryPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { movimientoId } = router.query;
  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [isReemplazandoImagen, setIsReemplazandoImagen] = useState(false);

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
  const [empresa, setEmpresa] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('');

  const tabs = [
    { value: 'datos', label: 'Datos' },
    { value: 'comprobante', label: 'Comprobante' },
  ];

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const formik = useFormik({
    initialValues: {
      categoria: '',
      fecha_factura: '',
      moneda: '',
      nombre_proveedor: '',
      observacion: '',
      categoria: '',
      subcategoria: '',
      total: '',
      total_original: '',
      type: '',
      estado: 'Pendiente',
      url_imagen: null,
    },
    validationSchema: Yup.object({
      // Validaciones de cada campo
    }),
    onSubmit: async (values) => {
      try {
        console.log("Values",values)
        setIsLoading(true);
        const originalValues = {...values};
        console.log("originalValues",originalValues)
        values.fecha_factura = dateToTimestamp(values.fecha_factura);
        const success = await movimientosService.updateMovimiento(movimientoId, { ...movimiento , ...values });
        values.fecha_factura = formatTimestamp(values.fecha_factura);
        setIsLoading(false);
    
        if (success) {
          setAlert({
            open: true,
            message: 'Movimiento actualizado con éxito!',
            severity: 'success',
          });
        } else {
          setAlert({
            open: true,
            message: 'Error al actualizar el movimiento.',
            severity: 'error',
          });
          values = {...originalValues};
        }
      } catch (error) {
        setAlert({
          open: true,
          message: 'Error inesperado al actualizar.',
          severity: 'error',
        });
        values = {...originalValues};
        setIsLoading(false);
      }
    },
  });
  
  const handleTabsChange = (event, value) => {
    setCurrentTab(value);
  };

  const handleReemplazarImagen = async () => {
    if (!nuevoArchivo) {
      setAlert({
        open: true,
        message: 'Por favor selecciona un archivo para reemplazar la imagen.',
        severity: 'warning',
      });
      return;
    }
  
    try {
      setIsReemplazandoImagen(true);
      const result = await movimientosService.reemplazarImagen(movimientoId, nuevoArchivo);
  
      setAlert({
        open: true,
        message: 'Imagen reemplazada con éxito!',
        severity: 'success',
      });
      
      setMovimiento((prevMovimiento) => ({
        ...prevMovimiento,
        url_imagen: `${prevMovimiento.url_imagen}&t=${new Date().getTime()}`,
      }));
  
      setNuevoArchivo(null);
    } catch (error) {
      setAlert({
        open: true,
        message: 'Error al reemplazar la imagen.',
        severity: 'error',
      });
    } finally {
      setIsReemplazandoImagen(false);
    }
  };
  

  useEffect(() => {
    if (movimientoId) {
      setIsLoading(true);

      async function fetchMovimientoData() {
        const empresa = await getEmpresaDetailsFromUser(user);
        setEmpresa(empresa);
        const cates = empresa.categorias;
        const proveedores = empresa.proveedores;
        cates.push({ name: "Ingreso dinero", subcategorias: [] });
        setCategorias(cates);
        setProveedores(proveedores);

        const data = await movimientosService.getMovimientoById(movimientoId);
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        setMovimiento(data);

        if (data.categoria) {
          const categoriaEncontrada = empresa.categorias.find(c => c.name === formik.values.categoria);
          setCategoriaSeleccionada(categoriaEncontrada);
        }

        formik.setValues({
          ...data,
          categoria: data.categoria || '',
        });
        setCurrentTab('datos');
      }
      
      fetchMovimientoData();
      setIsLoading(false);
    }
  }, [movimientoId]);

  if (!movimiento) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Detalle del Movimiento</title>
      </Head>
      <Container maxWidth="lg">
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            py: 8,
          }}
        >
          <Typography variant="h4" sx={{ mb: 3 }}>
            Detalle del Movimiento - Caja {movimiento.proyecto}
          </Typography>
          <Tabs
            value={currentTab}
            onChange={handleTabsChange}
            textColor="primary"
            indicatorColor="primary"
          >
            {tabs.map((tab) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} />
            ))}
          </Tabs>

          <form onSubmit={formik.handleSubmit}>
            {currentTab === 'comprobante' && (
              <>
                {/* Botón para reemplazar la imagen */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={handleReemplazarImagen}
                    disabled={isReemplazandoImagen || !nuevoArchivo}
                  >
                    {isReemplazandoImagen ? <CircularProgress size={24} /> : 'Reemplazar Imagen'}
                  </Button>

                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => setNuevoArchivo(event.currentTarget.files[0])}
                    style={{ marginTop: '10px' }}
                  />

                  {!formik.values.url_imagen && (
                    <Typography variant="p" sx={{ mb: 3 }}>
                      Movimiento sin comprobante asociado
                    </Typography>
                  )}

                  {formik.values.url_imagen && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={movimiento.url_imagen}  // La nueva imagen con el timestamp
                        alt="Imagen del movimiento"
                        style={{ maxWidth: '100%', maxHeight: '500px', marginTop: '10px' }}
                      />
                    </Box>
                  )}
                </Box>
              </>
            )}

            {currentTab === 'datos' && (
              <>
                <Typography variant="p" sx={{ mb: 3 }}>
                  Whatsapp: {movimiento.user_phone}
                </Typography>
                <TextField
                  fullWidth
                  label="Fecha de la Factura"
                  name="fecha_factura"
                  type="date"
                  value={formik.values.fecha_factura}
                  onChange={formik.handleChange}
                  error={formik.touched.fecha_factura && Boolean(formik.errors.fecha_factura)}
                  helperText={formik.touched.fecha_factura && formik.errors.fecha_factura}
                  margin="normal"
                />
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
                <TextField
                  fullWidth
                  label="Total Original"
                  name="total_original"
                  type="number"
                  value={formik.values.total_original}
                  onChange={formik.handleChange}
                  error={formik.touched.total_original && Boolean(formik.errors.total_original)}
                  helperText={formik.touched.total_original && formik.errors.total_original}
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

                {(categoriaSeleccionada && categoriaSeleccionada.subcategorias?.length !== 0) && (
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
                  </FormControl>
                )}
                <FormControl fullWidth margin="normal">
                  <InputLabel id="label-estado">Estado</InputLabel>
                  <Select
                    labelId="label-estado"
                    id="estado"
                    name="estado"
                    label="Estado"
                    value={formik.values.estado || ''}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value="">Ninguno</MenuItem>
                    <MenuItem value="Pendiente">Pendiente</MenuItem>
                    <MenuItem value="Pagado">Pagado</MenuItem>
                  </Select>
                </FormControl>


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
            )}

            <Box sx={{ py: 2 }}>
             { currentTab === 'datos' &&
              <Button color="primary" variant="contained" type="submit">
                {!isLoading && 'Guardar cambios'}
                {isLoading && 'Guardando cambios'}
                {isLoading && <CircularProgress />}
              </Button> }
              <Button
                color="primary"
                variant="text"
                type="submit"
                onClick={() => router.push('/cajaProyecto?proyectoId=' + movimiento.proyecto_id)}
              >
                Volver a caja {movimiento.proyecto}
              </Button>
            </Box>
          </form>
          <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
            <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </Snackbar>
        </Box>
      </Container>
    </>
  );
};

MovementDataEntryPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovementDataEntryPage;
