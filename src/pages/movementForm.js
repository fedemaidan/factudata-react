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
  Paper,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { dateToTimestamp, formatCurrency, formatTimestamp } from 'src/utils/formatters';
import MovementFields from 'src/components/movementFields';
import profileService from 'src/services/profileService';
import MaterialesEditor from 'src/components/materiales/MaterialesEditor';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import WidthWideIcon from '@mui/icons-material/WidthFull';
import FullscreenDialog from '@mui/material/Dialog';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Tabs, Tab } from '@mui/material';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';


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
  const [createdUser, setCreatedUser] = useState(null);
  const [viewerHeightVh, setViewerHeightVh] = useState(70);
  const [isWide, setIsWide] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);          
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  
  const savePayload = async (payload) => {
    try {
      const result = isEditMode
        ? await movimientosService.updateMovimiento(movimientoId, { ...movimiento, ...payload })
        : await movimientosService.addMovimiento({ ...payload, user_phone: user.phone });
      if (result.error) throw new Error('Error al agregar o editar el movimiento');
      setAlert({ open: true, message: 'Movimiento guardado con éxito!', severity: 'success' });
      // router.push(lastPageUrl || '/');
    } catch (err) {
      setAlert({ open: true, message: err.message, severity: 'error' });
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
      setPendingPayload(null);
    }
  };
  
  const increaseHeight = () => setViewerHeightVh(h => Math.min(95, h + 10));
  const decreaseHeight = () => setViewerHeightVh(h => Math.max(40, h - 10));
  const toggleWide = () => setIsWide(w => !w);
  const handleCloseAlert = () => setAlert({ ...alert, open: false });
  const hasComprobante = Boolean(movimiento?.url_imagen || urlTemporal);

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
      estado: 'Pendiente',
      url_imagen: null,
      tags_extra: [],
      caja_chica: false,
      medio_pago: '',
      observacion: '',
      impuestos: [],
      materiales: []
    },
    validationSchema: Yup.object({}),
    validate: (values) => {
      return {}; 
    },
    onSubmit: async (values) => {
      setIsLoading(true);
      const payload = {
        ...values,
        fecha_factura: dateToTimestamp(values.fecha_factura),
        proyecto: proyectoName,
        proyecto_id: proyectoId,
        tags_extra: values.tags_extra || [],
        url_imagen: movimiento?.url_imagen ?? values.url_imagen,
        impuestos: values.impuestos || []
      };

      const subtotal  = Number(values.subtotal) || 0;
      const impTotal  = (values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
      const total     = Number(values.total) || 0;
      const diff = Math.abs((subtotal + impTotal) - total);
    
      if (diff > 0.01) {
        // pedir confirmación
        console.log("estoy acá")
        setPendingPayload(payload);
        setConfirmOpen(true);
        setIsLoading(false);
        return;
      }
    
      // sin diferencia => guardar directo
      await savePayload(payload);
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
        const created_user = await profileService.getProfileByPhone(data.user_phone);
        setCreatedUser(created_user);
        formik.setValues({
          ...formik.values,
          ...data,
          fecha_factura: data.fecha_factura,
          tags_extra: data.tags_extra || [],
          caja_chica: data.caja_chica ?? false,
          impuestos: data.impuestos || [],
          materiales: data.materiales || []
        });
        const cat = cates.find(c => c.name === data.categoria);
        setCategoriaSeleccionada(cat);
      }
    }
    fetchData().finally(() => setIsInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoId]);

  useEffect(() => {
    const cat = categorias.find(c => c.name === formik.values.categoria);
    setCategoriaSeleccionada(cat);
  }, [formik.values.categoria, categorias]);

  const titulo = isEditMode ? `Editar Movimiento (${movimiento?.codigo_operacion || '-'})` : 'Agregar Movimiento';

  return (
    <>
      <Head><title>{titulo}</title></Head>

      <Container maxWidth="xl" sx={{ pt: 0, pb: 6 }}>
        {/* CABECERA */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5 }}>
                {titulo}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {proyectoName && <Chip size="small" label={`${proyectoName}`} />}
                {formik.values?.fecha_factura && <Chip size="small" label={`${formik.values.fecha_factura}`} />}
                {empresa?.con_estados && <Chip
                  size="small"
                  color={formik.values?.estado === 'Pagado' ? 'success' : 'warning'}
                  label={`${formik.values?.estado === 'Pagado' ? 'Pagado' : 'Pendiente pago'}`}
                />}
                {formik.values.type && <Chip size="small" color={formik.values?.etypestado === 'Ingreso' ? 'success' : 'error'} label={`${formik.values.type.toUpperCase()}`} />}
                {formik.values.caja_chica && <Chip size="small" color="info" label='Caja chica'/>}
              </Stack>
            </Box>

           <Stack direction="row" spacing={1} flexWrap="wrap">
           <Button
                variant="outlined"
                color="secondary"
                startIcon={isExtractingData ? <CircularProgress size={16} /> : <DocumentScannerIcon />}
                onClick={handleExtraerDatos}
                disabled={isExtractingData || !hasComprobante}
                title={hasComprobante ? 'Extrae datos del comprobante' : 'Subí o seleccioná un comprobante primero'}
              >
                {isExtractingData ? 'Extrayendo...' : 'Extraer datos'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push(lastPageUrl || '/')}
              >
                Volver sin guardar
              </Button>
              <Button
                variant="contained"
                onClick={formik.submitForm}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={22} /> : (isEditMode ? 'Guardar' : 'Crear')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {isInitialLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* COLUMNA IZQUIERDA (principal) */}
            <Grid item xs={12} md={isWide ? 9 : 7}>
  <Paper sx={{ p: 0, mb: 2 }}>
    {/* ENCABEZADO DE TABS */}
    <Box sx={{ px: 2, pt: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Edición de movimiento</Typography>
        <Stack direction="row" spacing={1}>
          {/* Atajos rápidos globales */}
          <Button size="small" variant="outlined" onClick={toggleWide}>
            {isWide ? 'Vista normal' : 'Vista ancha'}
          </Button>
          <Button size="small" variant="contained" onClick={formik.submitForm} disabled={isLoading}>
            {isLoading ? <CircularProgress size={18} /> : (isEditMode ? 'Guardar' : 'Crear')}
          </Button>
        </Stack>
      </Stack>
    </Box>

    {/* TABS */}
    <Tabs
      value={tab}
      onChange={(_, v) => setTab(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}
    >
      <Tab label="Info general" />
      <Tab label="Importes e impuestos" />
      <Tab label="Imagen de la factura" />
      {formik.values.categoria === 'Materiales' && <Tab label="Materiales" />}
    </Tabs>


    {/* PANEL: FORMULARIO */}
{tab === 0 && (
  <Box sx={{ p: 0 }}>
    <form onSubmit={formik.handleSubmit}>
      <MovementFields
        group="general"            // << Nuevo
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
  </Box>
)}

{tab === 1 && (
  <Box sx={{ p: 0 }}>
    <form onSubmit={formik.handleSubmit}>
      <MovementFields
        group="montos"             // << Nuevo
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
  </Box>
)}

    {/* PANEL: COMPROBANTE */}
    {tab === 2 && (
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Comprobante</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RemoveIcon />}
              onClick={decreaseHeight}
              title="Reducir alto"
            >
              Alto
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={increaseHeight}
              title="Aumentar alto"
            >
              Alto
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<OpenInFullIcon />}
              onClick={() => setFullOpen(true)}
              disabled={!movimiento?.url_imagen && !urlTemporal}
              title="Pantalla completa"
            >
              Full
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExtraerDatos}
              disabled={isExtractingData || (!movimiento?.url_imagen && !urlTemporal)}
            >
              {isExtractingData ? <CircularProgress size={18} /> : 'Extraer datos'}
            </Button>
          </Stack>
        </Stack>

        {/* Carga/replace de archivo */}
        <input
          accept="image/*,application/pdf"
          type="file"
          onChange={(e) => setNuevoArchivo(e.target.files[0])}
        />
        <Button
          variant="contained"
          onClick={handleUploadImage}
          disabled={!nuevoArchivo || isReemplazandoImagen}
          sx={{ mt: 2 }}
        >
          {isReemplazandoImagen ? <CircularProgress size={22} /> : 'Subir comprobante'}
        </Button>

        {(movimiento?.url_imagen || urlTemporal) && (
          <Box mt={2}>
            {String(movimiento?.url_imagen || urlTemporal).includes('.pdf') ? (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  height: `${viewerHeightVh}vh`,
                }}
                onDoubleClick={() => setFullOpen(true)}
              >
                <embed
                  src={movimiento?.url_imagen || urlTemporal}
                  width="100%"
                  height="100%"
                />
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: `${viewerHeightVh}vh`,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundImage: `url('${movimiento?.url_imagen || urlTemporal}')`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  cursor: 'zoom-in'
                }}
                onDoubleClick={() => setFullOpen(true)}
              />
            )}
          </Box>
        )}
      </Box>
    )}

    {/* PANEL: MATERIALES (solo si categoría = Materiales) */}
    {formik.values.categoria === 'Materiales' && tab === 3 && (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Materiales</Typography>
        <Divider sx={{ mb: 2 }} />
        <MaterialesEditor
          items={formik.values.materiales || []}
          proyecto_id={proyectoId}
          onChange={(next) => formik.setFieldValue('materiales', next)}
        />
      </Box>
    )}
  </Paper>
</Grid>


            {/* COLUMNA DERECHA (sticky sidebar) */}
            <Grid item xs={12} md={isWide ? 3 : 5}>
              <Stack spacing={2} sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
                {/* RESUMEN */}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Resumen</Typography>
                  <Stack spacing={1}>
  {(() => {
    const V = formik.values || {};
    const impuestos = Array.isArray(V.impuestos) ? V.impuestos : [];
    const impuestosTotal = impuestos.reduce((a, i) => a + (Number(i.monto) || 0), 0);

    const nonEmpty = (x) => x !== undefined && x !== null && String(x).trim() !== '';
    const yesNo = (b) => (b ? 'Sí' : 'No');

    const summaryConfig = [
      { key: 'nombre_proveedor', label: 'Proveedor' },
      { key: 'fecha_factura',    label: 'Fecha' },
      { key: 'type',             label: 'Tipo', format: (v) => (v ? v.toUpperCase() : '-') },
      { key: 'categoria',        label: 'Categoría' },
      { key: 'subcategoria',     label: 'Subcategoría' },
      { key: 'numero_factura',   label: 'N° Factura' },
      { key: 'tipo_factura',     label: 'Tipo de Factura' },
      { key: 'medio_pago',       label: 'Medio de Pago' },
      { key: 'moneda',           label: 'Moneda' },
      { key: 'subtotal',         label: 'Subtotal', format: (v)=>formatCurrency(v,2) },
      { key: 'total_original',   label: 'Total Original', format: (v)=>formatCurrency(v,2) },
      { key: 'total',            label: 'Total', format: (v)=>formatCurrency(v,2) },
      { key: 'estado',           label: 'Estado',
        render: () => (
          <Chip
            size="small"
            color={V.estado === 'Pagado' ? 'success' : 'warning'}
            label={V.estado || 'Pendiente'}
            sx={{ ml: 0.5 }}
          />
        )
      },
      { key: 'caja_chica',       label: 'Caja Chica', format: yesNo },
      { key: 'cuenta_interna',   label: 'Cuenta Interna' },
      { key: 'etapa',            label: 'Etapa' },
      { key: 'tags_extra',       label: 'Tags',
        render: () =>
          Array.isArray(V.tags_extra) && V.tags_extra.length > 0 ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {V.tags_extra.map((t) => (
                <Chip key={t} size="small" label={t} variant="outlined" />
              ))}
            </Stack>
          ) : null
      },
    ];

    const rows = summaryConfig
      .filter(({ key, render }) => render || nonEmpty(V[key]))
      .map(({ key, label, format, render }) => (
        <Stack key={key} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>{label}:</Typography>
          {render
            ? render()
            : <Typography variant="body2">
                {format ? format(V[key]) : V[key]}
              </Typography>}
        </Stack>
      ));

    const impuestosRow = (
      <Stack key="__impuestos" spacing={0.5}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>Impuestos:</Typography>
          <Typography variant="body2">
            {impuestos.length > 0
              ? `${impuestos.length} ítem(s) • ${formatCurrency(impuestosTotal, 2)}`
              : '—'}
          </Typography>
        </Stack>
      </Stack>
    );

    // Listado de materiales
    const materialesList = (formik.values.categoria === 'Materiales') && (
      <Stack key="__materiales" spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Materiales:</Typography>
        {(formik.values.materiales || []).length > 0 ? (
          <Box sx={{ pl: 2 }}>
            {formik.values.materiales.map((m, idx) => (
              <Typography key={idx} variant="body2">
                • {m.descripcion || '—'}  {m.cantidad || 0} {m.valorUnitario || ''}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ pl: 2 }}>Sin materiales</Typography>
        )}
      </Stack>
    );

    return (
      <>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>Proyecto:</Typography>
          <Typography variant="body2">{proyectoName || '-'}</Typography>
        </Stack>

        {rows}
        {impuestosRow}
        {materialesList}
      </>
    );
  })()}
</Stack>

                </Paper>

                {/* HISTORIAL */}
                {!!(isEditMode || createdUser) && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Historial</Typography>
                    <Stack spacing={0.5}>
                      {createdUser && (
                        <Typography variant="body2">
                          <b>Creado por:</b> {createdUser?.firstName} {createdUser?.lastName}
                        </Typography>
                      )}
                      {movimiento?.fecha_creacion && (
                        <Typography variant="body2">
                          <b>Creado:</b> {formatTimestamp(movimiento.fecha_creacion)}
                        </Typography>
                      )}
                      {movimiento?.fecha_actualizacion && (
                        <Typography variant="body2">
                          <b>Última edición:</b> {formatTimestamp(movimiento.fecha_actualizacion)}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* ACCIONES SECUNDARIAS */}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Acciones</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {!(!urlTemporal && !nuevoArchivo) && <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setNuevoArchivo(null);
                      setUrlTemporal(null);
                      formik.setFieldValue('url_imagen', null);
                    }}
                  >
                    Limpiar archivo temporal
                  </Button>}

                    {isEditMode && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={async () => {
                          try {
                            await movimientosService.deleteMovimiento(movimientoId);
                            setAlert({ open: true, message: 'Movimiento eliminado', severity: 'success' });
                            router.push(lastPageUrl || '/');
                          } catch (e) {
                            setAlert({ open: true, message: 'No se pudo eliminar', severity: 'error' });
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => formik.submitForm()}
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={18} /> : 'Guardar'}
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
            
          </Grid>
        )}

<Dialog
  fullScreen
  open={fullOpen}
  onClose={() => setFullOpen(false)}
  PaperProps={{ sx: { bgcolor: 'black' } }}
>
  <Box sx={{ position: 'fixed', top: 8, right: 8, zIndex: 10 }}>
    <IconButton onClick={() => setFullOpen(false)} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
      <CloseIcon sx={{ color: 'white' }} />
    </IconButton>
  </Box>

  {(movimiento?.url_imagen || urlTemporal) && (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1, md: 3 }
      }}
    >
      {String(movimiento?.url_imagen || urlTemporal).includes('.pdf') ? (
        <embed
          src={movimiento?.url_imagen || urlTemporal}
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
      ) : (
        <img
          src={movimiento?.url_imagen || urlTemporal}
          alt="Comprobante"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      )}
    </Box>
  )}
</Dialog>
<Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setPendingPayload(null); }}>
  <DialogTitle>¿Guardar con totales diferentes?</DialogTitle>
  <DialogContent>
    <Typography variant="body2" sx={{ mb: 1 }}>
      Detectamos que <b>Subtotal + Impuestos</b> no coincide con <b>Total</b>.
    </Typography>
    <Stack spacing={0.5}>
      <Typography variant="body2">Subtotal: {formatCurrency(Number(formik.values.subtotal)||0, 2)}</Typography>
      <Typography variant="body2">
        Impuestos: {formatCurrency((formik.values.impuestos||[]).reduce((a, i)=>a+(Number(i.monto)||0),0), 2)}
      </Typography>
      <Typography variant="body2">Total: {formatCurrency(Number(formik.values.total)||0, 2)}</Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2">
        Diferencia: {formatCurrency(Math.abs(((Number(formik.values.subtotal)||0) + (formik.values.impuestos||[]).reduce((a,i)=>a+(Number(i.monto)||0),0)) - (Number(formik.values.total)||0)), 2)}
      </Typography>
    </Stack>
    <Typography variant="body2" sx={{ mt: 2 }}>
      ¿Querés guardar de todos modos?
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => { setConfirmOpen(false); setPendingPayload(null); }} variant="outlined">
      Revisar
    </Button>
    <Button
      variant="contained"
      onClick={async () => {
        if (!pendingPayload) return;
        setIsLoading(true);
        await savePayload(pendingPayload);
      }}
    >
      Guardar igual
    </Button>
  </DialogActions>
</Dialog>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormPage;
