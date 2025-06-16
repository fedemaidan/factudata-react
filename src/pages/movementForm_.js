// pages/MovementFormPage.js
import Head from 'next/head';
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Snackbar,
  Alert,
  Grid,
  Paper
} from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from 'src/utils/formatters';

const dateToTimestamp = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return Timestamp.fromDate(new Date(year, month - 1, day, 13, 30));
};

const MovementFormPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { movimientoId, proyectoId, proyectoName, lastPageUrl, lastPageName } = router.query;
  const isEditMode = Boolean(movimientoId);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isExtractingData, setIsExtractingData] = useState(false);

  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [comprobante_info, setComprobanteInfo] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [isReemplazandoImagen, setIsReemplazandoImagen] = useState(false);
  const [tagsExtra, setTagsExtra] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [mediosPago, setMediosPago] = useState(['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque']);
  const [urlTemporal, setUrlTemporal] = useState(null);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const handleUploadImage = async () => {
    if (!nuevoArchivo) return;
    setIsReemplazandoImagen(true);
    try {
      let result;
      if (isEditMode && movimiento?.url_imagen) {
        result = await movimientosService.reemplazarImagen(movimientoId, nuevoArchivo);
        const nuevoMovimiento = { ...movimiento, url_imagen: movimiento.url_imagen + `?${Date.now()}` };
        setMovimiento(nuevoMovimiento);
      } else {
        result = await movimientosService.subirImagenTemporal(nuevoArchivo);
        const nuevoMovimiento = {...movimiento, url_imagen: result.url_imagen + `?${Date.now()}`};
        setMovimiento(nuevoMovimiento);
        setUrlTemporal(result.url_imagen);
      }
      setAlert({ open: true, message: 'Imagen cargada con éxito!', severity: 'success' });
    } catch (e) {
      console.log(e);
      setAlert({ open: true, message: 'Error al cargar imagen.', severity: 'error' });
    } finally {
      setIsReemplazandoImagen(false);
    }
  };

  const handleExtraerDatos = async () => {
    const urlImagen = isEditMode ? movimiento?.url_imagen : urlTemporal;
    if (!urlImagen || !empresa) return;
    setIsExtractingData(true);

    try {
      const result = await movimientosService.extraerDatosDesdeImagen(
        urlImagen,
        nuevoArchivo,
        {
          proveedores,
          categorias,
          medios_pago: empresa.medios_pago?.length ? empresa.medios_pago : ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
          medio_pago_default: 'Efectivo',
          proyecto_id: proyectoId,
          proyecto_nombre: proyectoName
        }
      );
      formik.setValues({ ...formik.values, ...result });
      setIsExtractingData(false);

      setAlert({ open: true, message: 'Datos extraídos con éxito!', severity: 'success' });
    } catch (error) {
      console.error(error);
      setIsExtractingData(false);
      setAlert({ open: true, message: 'No se pudieron extraer los datos.', severity: 'warning' });
    }
  };

  const tipos = [
    { value: 'egreso', name: 'Egreso' },
    { value: 'ingreso', name: 'Ingreso' },
  ];
  const monedas = [
    { value: 'USD', name: 'USD - Dólar' },
    { value: 'ARS', name: 'ARS - Pesos' },
  ];

  const formik = useFormik({
    initialValues: {
      fecha_factura: '',
      type: '',
      total: '',
      total_original: '',
      moneda: '',
      nombre_proveedor: '',
      categoria: '',
      subcategoria: '',
      observacion: '',
      estado: 'Pendiente',
      url_imagen: null,
      tags_extra: [],
      caja_chica: false,
      medio_pago: ''
    },
    validationSchema: Yup.object({}),
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const payload = {
          ...values,
          fecha_factura: dateToTimestamp(values.fecha_factura),
          proyecto: proyectoName,
          proyecto_id: proyectoId,
          user_phone: user.phone,
          tags_extra: values.tags_extra || [],
          url_imagen: movimiento?.url_imagen,
        };

        const result = isEditMode
          ? await movimientosService.updateMovimiento(movimientoId, { ...movimiento, ...payload })
          : await movimientosService.addMovimiento(payload);
        
          if (result.error) {
            setAlert({
              open: true,
              message: "Error al agregar o editar el movimiento",
              severity: 'error',
            });
            return;
          }
          if (!isEditMode) {
            console.log(result, "res")
            if (result.data.movimiento.id) {
              setAlert({
                open: true,
                message: 'Movimiento agregado con éxito!',
                severity: 'success',
              });
              router.push(lastPageUrl)
            } else {
              setAlert({
                open: true,
                message: 'Error al agregar el movimiento.',
                severity: 'error',
              });
            }
          } else {
            setAlert({
              open: true,
              message: 'Movimiento agregado con éxito!',
              severity: 'success',
            });
            router.push(lastPageUrl)
          }
        

      } catch (err) {
        setAlert({ open: true, message: 'Error al guardar el movimiento.', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    }
  });

  useEffect(() => {
    async function fetchData() {
      const empresa = await getEmpresaDetailsFromUser(user);
      setEmpresa(empresa);
      const cates = [...empresa.categorias, { name: 'Ingreso dinero', subcategorias: [] }, { name: 'Ajuste', subcategorias: ['Ajuste'] }];
      const provs = [...empresa.proveedores, 'Ajuste'];
      setComprobanteInfo(empresa.comprobante_info || []);
      setCategorias(cates);
      setProveedores(provs);
      setTagsExtra(empresa.tags_extra || []);
      setMediosPago(empresa.medios_pago?.length ? empresa.medios_pago : ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque']);

      if (isEditMode) {
        const data = await movimientosService.getMovimientoById(movimientoId);
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        setMovimiento(data);
        formik.setValues({ ...data, tags_extra: data.tags_extra || [], caja_chica: data.caja_chica ?? false });
        const cat = cates.find(c => c.name === data.categoria);
        setCategoriaSeleccionada(cat);
      }
    }
    fetchData().finally(() => {
      setIsInitialLoading(false);
    });

  }, [movimientoId]);

  useEffect(() => {
    const cat = categorias.find(c => c.name === formik.values.categoria);
    setCategoriaSeleccionada(cat);
  }, [formik.values.categoria, categorias]);

  return (
    <>
    <Head><title>{isEditMode ? 'Editar Movimiento' : 'Agregar Movimiento'}</title></Head>
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>{isEditMode ? `Editar Movimiento (${movimiento?.codigo_operacion})` : 'Agregar Movimiento'}</Typography>
      {isInitialLoading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      )}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Comprobante</Typography>
            <input accept="image/*" type="file" onChange={(e) => setNuevoArchivo(e.target.files[0])} />
            <Button variant="contained" onClick={handleUploadImage} disabled={!nuevoArchivo || isReemplazandoImagen} sx={{ mt: 2 }}>
              {isReemplazandoImagen ? <CircularProgress size={24} /> : 'Subir Comprobante'}
            </Button>
            {movimiento?.url_imagen && (
              <Box mt={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={handleExtraerDatos}
                  disabled={isExtractingData}
                >
                  {isExtractingData ? <CircularProgress size={24} /> : 'Extraer Datos del Comprobante'}
                </Button>
                {movimiento.url_imagen.includes('.pdf') ? (
                   <embed src={movimiento.url_imagen} width="500px" height="800px" />
                ) : (
                   <Box sx={{ width: '100%', height: '500px', backgroundImage: `url('${movimiento.url_imagen}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <form onSubmit={formik.handleSubmit}>
            <Paper sx={{ p: 2 }}>
              <TextField fullWidth label="Fecha de la Factura" name="fecha_factura" type="date" value={formik.values.fecha_factura} onChange={formik.handleChange} margin="normal" />
              <FormControl fullWidth margin="normal">
                <InputLabel>Tipo</InputLabel>
                <Select name="type" value={formik.values.type} onChange={formik.handleChange}>
                  {tipos.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth label="Total" name="total" type="number" value={formik.values.total} onChange={formik.handleChange} margin="normal" />
              {comprobante_info.total_original && <TextField fullWidth label="Total Original" name="total_original" type="number" value={formik.values.total_original} onChange={formik.handleChange} margin="normal" />}
              <FormControl fullWidth margin="normal">
                <InputLabel>Moneda</InputLabel>
                <Select name="moneda" value={formik.values.moneda} onChange={formik.handleChange}>
                  {monedas.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.name}</MenuItem>)}
                </Select>
              </FormControl>
              {comprobante_info.proveedor && <Autocomplete freeSolo options={proveedores} value={formik.values.nombre_proveedor || ''} onChange={(_, val) => formik.setFieldValue('nombre_proveedor', val || '')} renderInput={(params) => <TextField {...params} label="Proveedor" fullWidth margin="normal" />} />}
              {comprobante_info.categoria &&
              <FormControl fullWidth margin="normal">
                <InputLabel>Categoría</InputLabel>
                <Select name="categoria" value={formik.values.categoria} onChange={formik.handleChange}>
                  {categorias.map(opt => <MenuItem key={opt.name} value={opt.name}>{opt.name}</MenuItem>)}
                </Select>
              </FormControl>}
              {comprobante_info.subcategoria && categoriaSeleccionada?.subcategorias?.length > 0 && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Subcategoría</InputLabel>
                  <Select name="subcategoria" value={formik.values.subcategoria} onChange={formik.handleChange}>
                    {categoriaSeleccionada.subcategorias.map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {comprobante_info.tags_extra && <Autocomplete multiple freeSolo options={tagsExtra} value={formik.values.tags_extra || []} onChange={(_, val) => formik.setFieldValue('tags_extra', val)} renderInput={(params) => <TextField {...params} label="Tags Extra" fullWidth margin="normal" />} />}
              {empresa?.con_estados &&
              <FormControl fullWidth margin="normal">
                <InputLabel>Estado</InputLabel>
                <Select name="estado" value={formik.values.estado} onChange={formik.handleChange}>
                  <MenuItem value="">Ninguno</MenuItem>
                  <MenuItem value="Pendiente">Pendiente</MenuItem>
                  <MenuItem value="Pagado">Pagado</MenuItem>
                </Select>
              </FormControl>}
              {comprobante_info.medio_pago &&
              <FormControl fullWidth margin="normal">
                <InputLabel id="label-medio-pago">Medio de Pago</InputLabel>
                <Select
                  labelId="label-medio-pago"
                  id="medio_pago"
                  name="medio_pago"
                  value={formik.values.medio_pago}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">Ninguno</MenuItem>
                  {mediosPago.map((medio) => (
                    <MenuItem key={medio} value={medio}>{medio}</MenuItem>
                  ))}
                </Select>
              </FormControl>}
              <FormControl fullWidth margin="normal">
                <InputLabel>Caja Chica</InputLabel>
                <Select name="caja_chica" value={formik.values.caja_chica} onChange={formik.handleChange}>
                  <MenuItem value={true}>Sí</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth label="Observación" name="observacion" multiline rows={4} value={formik.values.observacion} onChange={formik.handleChange} margin="normal" />
              <Box sx={{ py: 2 }}>
                <Button color="primary" variant="contained" type="submit" disabled={isLoading} fullWidth>
                  {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Agregar Movimiento'}
                </Button>
                <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={() => router.push(lastPageUrl || `/cajaProyecto?proyectoId=${movimiento?.proyecto_id}`)}>
                  Volver a {lastPageName || movimiento?.proyecto_nombre}
                </Button>
              </Box>
            </Paper>
          </form>
        </Grid>
      </Grid>

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </Container>
  </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovementFormPage;