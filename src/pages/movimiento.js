import Head from 'next/head';
import { Box, Container, TextField, Typography, Button, CircularProgress, Tab, Tabs, FormControl, InputLabel, Select, MenuItem, Autocomplete } from '@mui/material';
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
import { formatTimestamp } from 'src/utils/formatters';

const dateToTimestamp = (dateString) => {
  if (!dateString) {
    return null;
  }

  const dateParts = dateString.split('-');
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  const date = new Date(year, month, day, 13, 30);
  const timestamp = Timestamp.fromDate(date);
  
  return timestamp;
};

const MovementDataEntryPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { movimientoId, lastPageUrl, lastPageName } = router.query;
  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [isReemplazandoImagen, setIsReemplazandoImagen] = useState(false);
  const [tagsExtra, setTagsExtra] = useState([]);

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

  const handleTagsExtraChange = (event, newValue) => {
    setTagsExtra(newValue);
  };
  

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
      tags_extra: [],
      caja_chica: false,
      medio_pago: '',
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
        const success = await movimientosService.updateMovimiento(movimientoId, { ...movimiento , ...values, tags_extra: values.tags_extra  || [] });
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
        setTagsExtra(empresa.tags_extra || []);

        const data = await movimientosService.getMovimientoById(movimientoId);
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        setMovimiento(data);

        if (data.categoria) {
          const categoriaEncontrada = empresa.categorias.find(c => c.name === formik.values.categoria);
          setCategoriaSeleccionada(categoriaEncontrada);
        }
        console.log("data", data)

        formik.setValues({
          ...data,
          categoria: data.categoria || '',
          tags_extra: data.tags_extra || [],
          caja_chica: data.caja_chica ?? false,
          medio_pago: data.medio_pago || '', // <--- agregar
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
        <title>Detalle del Movimiento - {movimiento.codigo_operacion}</title>
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
            Caja {movimiento.proyecto} ({movimiento.codigo_operacion})
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
                      <embed src={movimiento.url_imagen} width="800px" height="2100px" />
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

                <Autocomplete
                  freeSolo
                  options={proveedores}
                  value={formik.values.nombre_proveedor || ''}
                  onChange={(event, newValue) => {
                    formik.setFieldValue('nombre_proveedor', newValue || '');
                  }}
                  onInputChange={(event, newInputValue) => {
                    // Esto asegura que también se guarde si el usuario escribe directamente y no selecciona
                    if (event?.type === 'change') {
                      formik.setFieldValue('nombre_proveedor', newInputValue);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Proveedor"
                      fullWidth
                      margin="normal"
                      error={formik.touched.nombre_proveedor && Boolean(formik.errors.nombre_proveedor)}
                      helperText={formik.touched.nombre_proveedor && formik.errors.nombre_proveedor}
                    />
                  )}
                />

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

                  <Autocomplete
                    multiple
                    options={tagsExtra} // Opciones predefinidas si las hay, sino queda vacío
                    value={formik.values.tags_extra || []}
                    onChange={(event, newValue) => formik.setFieldValue("tags_extra", newValue)} // Actualizar formik
                    freeSolo
                    renderInput={(params) => (
                      <TextField {...params} label="Tags Extra" variant="outlined" fullWidth />
                    )}
                  />

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

                <FormControl fullWidth margin="normal">
                <InputLabel id="label-medio-pago">Medio de Pago</InputLabel>
                <Select
                  labelId="label-medio-pago"
                  id="medio_pago"
                  name="medio_pago"
                  label="Medio de Pago"
                  value={formik.values.medio_pago}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Ninguno</MenuItem>
                  <MenuItem value="Efectivo">Efectivo</MenuItem>
                  <MenuItem value="Transferencia">Transferencia</MenuItem>
                  <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                  <MenuItem value="Mercado Pago">Mercado Pago</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                </Select>
              </FormControl>


                <FormControl fullWidth margin="normal">
                  <InputLabel id="label-caja-chica">Caja chica</InputLabel>
                  <Select
                    labelId="label-caja-chica"
                    id="caja_chica"
                    name="caja_chica"
                    label="Caja chica"
                    value={formik.values.caja_chica}
                    onChange={formik.handleChange}
                  >
                    <MenuItem value={true}>Sí</MenuItem>
                    <MenuItem value={false}>No</MenuItem>
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
                onClick={() => router.push(lastPageUrl? lastPageUrl: '/cajaProyecto?proyectoId=' + movimiento.proyecto_id)}
              >
                Volver a {lastPageName? lastPageName :  movimiento.proyecto}
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
