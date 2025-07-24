import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
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
import MovementFields from 'src/components/movementFields';

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
        const nuevoMovimiento = { ...movimiento, url_imagen: result.url_imagen + `?${Date.now()}` };
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
      const result = await movimientosService.extraerDatosDesdeImagen(urlImagen, nuevoArchivo, {
        proveedores,
        categorias,
        medios_pago: empresa.medios_pago?.length ? empresa.medios_pago : mediosPago,
        medio_pago_default: 'Efectivo',
        proyecto_id: proyectoId,
        proyecto_nombre: proyectoName
      });
      formik.setValues({ ...formik.values, ...result });
      setAlert({ open: true, message: 'Datos extraídos con éxito!', severity: 'success' });
    } catch (error) {
      console.error(error);
      setAlert({ open: true, message: 'No se pudieron extraer los datos.', severity: 'warning' });
    } finally {
      setIsExtractingData(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      fecha_factura: '',
      type: '',
      total: '',
      subtotal: '',
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
      medio_pago: '',
      impuestos: []
    },
    validationSchema: Yup.object({}),
    validate: (values) => {
          const errors = {};
          const subtotal  = Number(values.subtotal) || 0;
          const impTotal  = (values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
          const total     = Number(values.total) || 0;
          if (values.impuestos.length > 0 || values.subtotal > 0) {
            if (Math.abs((subtotal + impTotal) - total) > 0.01) {
              errors.total = `Subtotal (${subtotal.toFixed(2)}) + Impuestos (${impTotal.toFixed(2)}) ≠ Total (${total.toFixed(2)})`;
            }
          }
          return errors;
        },
      
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
          impuestos: values.impuestos || []
        };
        const result = isEditMode
          ? await movimientosService.updateMovimiento(movimientoId, { ...movimiento, ...payload })
          : await movimientosService.addMovimiento(payload);
        if (result.error) throw new Error('Error al agregar o editar el movimiento');
        setAlert({ open: true, message: 'Movimiento guardado con éxito!', severity: 'success' });
        router.push(lastPageUrl);
      } catch (err) {
        setAlert({ open: true, message: err.message, severity: 'error' });
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
      setMediosPago(empresa.medios_pago?.length ? empresa.medios_pago : mediosPago);
      if (isEditMode) {
        const data = await movimientosService.getMovimientoById(movimientoId);
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        setMovimiento(data);
        formik.setValues({ ...data, tags_extra: data.tags_extra || [], caja_chica: data.caja_chica ?? false, impuestos: data.impuestos || [] });
        const cat = cates.find(c => c.name === data.categoria);
        setCategoriaSeleccionada(cat);
      }
    }
    fetchData().finally(() => setIsInitialLoading(false));
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
        {isInitialLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        ) : (
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
                    <Button variant="outlined" fullWidth sx={{ mt: 2 }} onClick={handleExtraerDatos} disabled={isExtractingData}>
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
                <MovementFields
                  formik={formik}
                  comprobante_info={comprobante_info}
                  empresa={empresa}
                  etapas={empresa?.etapas || []}
                  proveedores={proveedores}
                  categorias={categorias}
                  categoriaSeleccionada={categoriaSeleccionada}
                  tagsExtra={tagsExtra}
                  mediosPago={mediosPago}
                  isEditMode={isEditMode}
                  isLoading={isLoading}
                  router={router}
                  lastPageUrl={lastPageUrl}
                  lastPageName={lastPageName}
                  movimiento={movimiento}
                />
              </form>
            </Grid>
          </Grid>
        )}
        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default MovementFormPage;
