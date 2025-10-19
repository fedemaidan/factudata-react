// pages/movementForm-simple/index.jsx
// Formulario simple (crear/editar) “todo a la vista” para "caja central"

import Head from 'next/head';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Button, Container, Paper, Stack, Typography, TextField, Autocomplete, Divider,
  Snackbar, Alert, IconButton, Box, CircularProgress, Chip, Grid, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import movimientosService from 'src/services/movimientosService';
import { useRouter } from 'next/router';
import { dateToTimestamp, formatTimestamp } from 'src/utils/formatters';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const getMovimientoIdFromResponse = (res) =>
  res?.id || res?.data?.movimiento?.id || res?.movimiento_id || null;

const createSchema = (categoriaLabels) => Yup.object({
  fecha_factura: Yup.string()
    .nullable()
    .transform((v, o) => (o === '' ? null : v))
    .matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, { message: 'Formato esperado YYYY-MM-DD', excludeEmptyString: true })
    .test('anio>=2025', 'La fecha debe ser 2025 o posterior', (v) => !v || Number(v.slice(0, 4)) >= 2025),
  nombre_proveedor: Yup.string().nullable(),
  categoria: Yup.string()
    .required('Seleccioná una categoría')
    .test('categoria-valida', 'Seleccioná una categoría válida', (value) => {
      if (!value) return false;
      if (!categoriaLabels?.length) return true;
      return categoriaLabels.some(l => l.toLowerCase() === String(value).toLowerCase());
    }),
  total: Yup.number().nullable().min(0, 'Total no puede ser negativo'),
  moneda: Yup.string().oneOf(['ARS', 'USD']).default('ARS'),
  cliente: Yup.string().nullable(),
  obra: Yup.string().nullable(),
  url_imagen: Yup.string().nullable(),
  type: Yup.string().oneOf(['ingreso', 'egreso']).default('egreso'),
});

const normalize = (s) => (s || '').toString().trim();
const today = new Date().toISOString().slice(0, 10);

const initialValues = {
  fecha_factura: today,
  nombre_proveedor: '',
  id_proveedor: null,
  categoria: '',
  total: '',
  moneda: 'ARS',
  cliente: '',
  obra: '',
  url_imagen: '',
  type: 'egreso'
};

function useEmpresaData(user) {
  const [empresa, setEmpresa] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    (async () => {
      const e = await getEmpresaDetailsFromUser(user);
      setEmpresa(e);

      const provs = Array.isArray(e?.proveedores) ? e.proveedores : [];
      const provOptions = provs
        .filter(Boolean)
        .map((p) => (typeof p === 'string' ? { id: null, nombre: p } : { id: p.id ?? null, nombre: p.nombre ?? '' }))
        .filter((p) => p.nombre)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
      setProveedores(provOptions);

      const obrasList = Array.isArray(e?.obras) ? e.obras : [];
      setObras(obrasList.map((o) => ({ nombre: o?.nombre || '', cliente: o?.cliente || null })).filter((x) => x.nombre));

      const clientesSet = new Set(obrasList.map((o) => normalize(o?.cliente)).filter(Boolean));
      setClientes([...clientesSet]);

      const categoriasList = Array.isArray(e?.categorias) ? e.categorias : [];
      setCategorias(categoriasList);
    })();
  }, [user]);

  return { empresa, proveedores, obras, clientes, categorias };
}

const MovementFormSimplePage = () => {
  const router = useRouter();
  const { movimientoId } = router.query;
  const isEditMode = Boolean(movimientoId);
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { empresa, proveedores, obras, clientes, categorias } = useEmpresaData(user);
  const [isInitialLoading, setIsInitialLoading] = useState(isEditMode);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingUpload, setPendingUpload] = useState(false);
  const [codigoOperacion, setCodigoOperacion] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [viewerFull, setViewerFull] = useState(false);
  const resetAfterSaveRef = useRef(false);

  // Opciones UI
  const proveedorOptions = useMemo(
    () => proveedores.map((p) => ({ label: p.nombre, id: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
    [proveedores]
  );
  const obraOptions = useMemo(() => obras.map((o) => ({ label: o.nombre, cliente: o.cliente })), [obras]);
  const clienteOptions = useMemo(() => clientes.map((c) => ({ label: c })), [clientes]);

  const categoriaOptions = useMemo(() => {
    const arr = Array.isArray(categorias) ? categorias : [];
    const names = arr
      .map((c) => (c && typeof c === 'object' ? normalize(c.name) : ''))
      .filter(Boolean);
    const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
    return unique
      .map((label) => ({ label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [categorias]);

  const categoriaLabels = useMemo(() => categoriaOptions.map((c) => c.label), [categoriaOptions]);
  const validationSchema = useMemo(() => createSchema(categoriaLabels), [categoriaLabels]);

  // Form
  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        const proyectosData = await getProyectosByEmpresa(empresa);
        const payload = {
          empresa_id: empresa.id,
          proyecto_id: proyectosData?.[0]?.id || null,
          fecha_factura: dateToTimestamp(values.fecha_factura),
          nombre_proveedor: (values.nombre_proveedor || '').trim() || null,
          categoria: (values.categoria || '').trim() || null,
          total: values.total === '' ? null : Number(values.total),
          moneda: values.moneda || 'ARS',
          cliente: (values.cliente || '').trim() || null,
          obra: (values.obra || '').trim() || null,
          type: values.type || 'egreso',
          url_imagen: values.url_imagen || null,
        };

        let res;
        if (isEditMode && movimientoId) {
          res = await (movimientosService.updateSimpleMovimiento?.(movimientoId, payload)
            || movimientosService.updateMovimiento(movimientoId, payload));
        } else {
          res = await (movimientosService.addSimpleMovimiento?.(payload)
            || movimientosService.addMovimiento(payload));
        }
        if (res?.error) throw new Error(res.error || 'Error al guardar');

        const savedId = isEditMode ? movimientoId : getMovimientoIdFromResponse(res);
        if (!isEditMode && savedId) {
          // redirige a edición del recién creado
          router.replace({ pathname: router.pathname, query: { movimientoId: savedId } });
        }

        setLastSavedAt(new Date());
        setAlert({ open: true, message: 'Movimiento guardado', severity: 'success' });

        if (resetAfterSaveRef.current) {
         resetAfterSaveRef.current = false;   // consume el flag
         // reset visual a "nuevo" (misma ruta, sin query)
         clearComprobante()
         // opcional: limpiar form al instante
         setTimeout(() => formik.resetForm({ values: { ...initialValues } }), 0);
         router.replace({ pathname: router.pathname, query: {} }, undefined, { shallow: true });

       }
      } catch (e) {
        setAlert({ open: true, message: e?.message || 'No se pudo guardar', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const clearComprobante = () => {
    setFile(null);
    setPreviewUrl(null);const [pendingUpload, setPendingUpload] = useState(false); // <-- NUEVO
    // aseguramos que el form no tenga la imagen anterior
    formik.setFieldValue('url_imagen', '', false);
    setPendingUpload(false);
    };
  // Carga inicial edición
  useEffect(() => {
    if (!isEditMode || !movimientoId) return;
    (async () => {
      try {
        const data = await movimientosService.getMovimientoById(movimientoId);
        if (data?.fecha_factura) {
          try { data.fecha_factura = formatTimestamp(data.fecha_factura); } catch {}
        } else {
          data.fecha_factura = today;
        }
        formik.setValues({
          ...initialValues,
          ...data,
          fecha_factura: data.fecha_factura || today,
          nombre_proveedor: data?.nombre_proveedor || '',
          categoria: data?.categoria || '',
          total: data?.total ?? '',
          moneda: data?.moneda || 'ARS',
          cliente: data?.cliente || '',
          obra: data?.obra || '',
          url_imagen: data?.url_imagen || '',
          type: data?.type || 'egreso',
        });
        if (data?.codigo_operacion) setCodigoOperacion(data?.codigo_operacion);
        if (data?.url_imagen) setPreviewUrl(`${data.url_imagen}?${Date.now()}`);
      } catch (e) {
        setAlert({ open: true, message: 'No se pudo cargar el movimiento', severity: 'error' });
      } finally {
        setIsInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, movimientoId]);

  // Autocompletar cliente desde obra
  useEffect(() => {
    const obraSel = obraOptions.find((o) => o.label === formik.values.obra);
    if (obraSel?.cliente) formik.setFieldValue('cliente', obraSel.cliente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.obra, obraOptions]);

  // Handlers
  const handleProveedorChange = (_e, optionOrString) => {
    if (!optionOrString) { formik.setFieldValue('nombre_proveedor', ''); return; }
    if (typeof optionOrString === 'string') formik.setFieldValue('nombre_proveedor', optionOrString);
    else formik.setFieldValue('nombre_proveedor', optionOrString.label || '');
  };

  const uploadImage = async () => {
    if (!file) return;
    try {
      if (isEditMode && movimientoId && formik.values.url_imagen) {
        await (movimientosService.reemplazarImagen?.(movimientoId, file));
        const nextUrl = (formik.values.url_imagen || '') + `?${Date.now()}`;
        formik.setFieldValue('url_imagen', nextUrl);
        setPreviewUrl(nextUrl);
      } else {
        const res = await (movimientosService.subirImagenTemporal?.(file));
        const publicUrl = res?.url_imagen || res?.url || res?.public_url;
        if (!publicUrl) {
          setAlert({ open: true, message: 'No se pudo obtener la URL de la imagen', severity: 'warning' });
          return;
        }
        formik.setFieldValue('url_imagen', publicUrl);
        setPreviewUrl(publicUrl + `?${Date.now()}`);
      }
      setAlert({ open: true, message: 'Comprobante subido', severity: 'success' });
      setPendingUpload(false);   
    } catch (e) {
      setAlert({ open: true, message: 'Error al subir/reemplazar imagen', severity: 'error' });
    }
  };

  const borrarMovimiento = async () => {
    if (!isEditMode || !movimientoId) return;
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await movimientosService.deleteMovimiento?.(movimientoId);
      setAlert({ open: true, message: 'Movimiento eliminado', severity: 'success' });
      router.push('/movements');
    } catch {
      setAlert({ open: true, message: 'No se pudo eliminar', severity: 'error' });
    }
  };

  const currentCategoriaOption = useMemo(() => {
    const v = formik.values.categoria;
    if (!v) return null;
    const found = categoriaOptions.find((o) => o.label.toLowerCase() === v.toLowerCase());
    return found || { label: v };
  }, [categoriaOptions, formik.values.categoria]);

  // Enter = Guardar (excepto inputs tipo file)
  const handleKeyDown = useCallback((e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (e.key === 'Enter' && tag !== 'textarea' && tag !== 'button' && e.target.type !== 'file') {
      e.preventDefault();
      if (!pendingUpload) formik.submitForm();
    }
  }, [formik]);

  // Chip helpers
  const TypeChip = ({ type }) => (
    <Chip
      size="small"
      color={type === 'ingreso' ? 'success' : 'error'}
      label={String(type || '').toUpperCase() || '-'}
      sx={{ fontWeight: 700 }}
    />
  );

  const MonedaChip = ({ moneda }) => (
    <Chip size="small" label={moneda || '-'} variant="outlined" />
  );

  const FechaChip = ({ fecha }) => (
    <Chip size="small" label={fecha || today} variant="outlined" />
  );

  // Acciones especiales
  const handleGuardarYCargarOtro = async () => {
     if (pendingUpload) {
       setAlert({ open: true, message: 'Tenés un archivo seleccionado sin subir. Subilo para continuar.', severity: 'warning' });
        return;
    }
    const errors = await formik.validateForm();
    if (Object.keys(errors).length) {
      setAlert({ open: true, message: 'Revisá los errores antes de guardar', severity: 'warning' });
      return;
    }
    resetAfterSaveRef.current = true;
    formik.submitForm();
  };

  return (
    <>
      <Head>
        <title>{isEditMode ? 'Editar movimiento · Simple' : 'Nuevo movimiento · Simple'}</title>
      </Head>

      <Container maxWidth="xl" sx={{ py: 2 }} onKeyDown={handleKeyDown}>
        {/* CABECERA */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button variant="text" onClick={() => router.back()} sx={{ mr: 1 }}>← Volver</Button>
              <Typography variant="h6">
                {isEditMode ? `Editar movimiento${codigoOperacion ? ` (${codigoOperacion})` : ''}` : 'Nuevo movimiento'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <FechaChip fecha={formik.values.fecha_factura} />
              <TypeChip type={formik.values.type} />
              <MonedaChip moneda={formik.values.moneda} />
              {lastSavedAt && (
                <Chip size="small" label={`Guardado ${lastSavedAt.toLocaleTimeString()}`} />
              )}
            </Stack>
          </Stack>

          {/* Resumen instantáneo */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {`${(formik.values.type || 'egreso').toUpperCase()} • ${formik.values.total ? `${formik.values.total} ${formik.values.moneda}` : '—'} • ${formik.values.categoria || '—'} • Obra: ${formik.values.obra || '—'} • Prov.: ${formik.values.nombre_proveedor || '—'}`}
          </Typography>
        </Paper>

        {isInitialLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {/* IZQUIERDA: FORM COMPLETO */}
            <Grid item xs={12} md={7} order={{ xs: 2, md: 1 }}>
              <Paper sx={{ p: 2 }}>
                {/* DATOS PRINCIPALES */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Datos principales
                </Typography>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      autoFocus
                      fullWidth
                      label="Total (obligatorio)"
                      type="number"
                      value={formik.values.total}
                      onChange={(e) => formik.setFieldValue('total', e.target.value)}
                      error={Boolean(formik.touched.total && formik.errors.total)}
                      helperText={formik.touched.total && formik.errors.total || 'Ej.: 125000'}
                      inputProps={{ inputMode: 'numeric' }}
                    />

<FormControl fullWidth sx={{ minWidth: 160 }}>
  <InputLabel id="tipo-label">Tipo</InputLabel>
  <Select
    labelId="tipo-label"
    value={formik.values.type}
    label="Tipo"
    onChange={(e) => formik.setFieldValue('type', e.target.value)}
  >
    <MenuItem value="egreso">Egreso</MenuItem>
    <MenuItem value="ingreso">Ingreso</MenuItem>
  </Select>
</FormControl>

<FormControl fullWidth sx={{ minWidth: 120 }}>
  <InputLabel id="moneda-label">Moneda</InputLabel>
  <Select
    labelId="moneda-label"
    value={formik.values.moneda}
    label="Moneda"
    onChange={(e) => formik.setFieldValue('moneda', e.target.value)}
  >
    <MenuItem value="ARS">ARS</MenuItem>
    <MenuItem value="USD">USD</MenuItem>
  </Select>
</FormControl>

                  </Stack>

                  <Autocomplete
                    options={categoriaOptions}
                    value={(() => {
                      const v = formik.values.categoria;
                      if (!v) return null;
                      const found = categoriaOptions.find((o) => o.label.toLowerCase() === v.toLowerCase());
                      return found || { label: v };
                    })()}
                    onChange={(_e, opt) => formik.setFieldValue('categoria', opt?.label || '')}
                    isOptionEqualToValue={(option, value) =>
                      option.label?.toLowerCase() === value?.label?.toLowerCase()
                    }
                    noOptionsText="Sin categorías disponibles"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        name="categoria"
                        label="Categoría (obligatorio)"
                        placeholder="Elegí una categoría"
                        error={Boolean(formik.touched.categoria && formik.errors.categoria)}
                        helperText={formik.touched.categoria && formik.errors.categoria}
                        onBlur={(event) => {
                          formik.setFieldTouched('categoria', true);
                          formik.handleBlur(event);
                        }}
                      />
                    )}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* OBRA Y CLIENTE */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Obra y cliente
                </Typography>
                <Stack spacing={2}>
                  <Autocomplete
                    freeSolo
                    options={obraOptions}
                    value={formik.values.obra || ''}
                    onChange={(_e, opt) => formik.setFieldValue('obra', typeof opt === 'string' ? opt : opt?.label || '')}
                    onInputChange={(_e, v) => formik.setFieldValue('obra', v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Obra (opcional)" placeholder="Escribí o elegí de la lista" />
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    options={clienteOptions}
                    value={formik.values.cliente || ''}
                    onChange={(_e, opt) => formik.setFieldValue('cliente', typeof opt === 'string' ? opt : opt?.label || '')}
                    onInputChange={(_e, v) => formik.setFieldValue('cliente', v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Cliente (opcional)" placeholder="Se completa solo desde la Obra" />
                    )}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                {/* PROVEEDOR */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Proveedor
                </Typography>
                <Autocomplete
                  freeSolo
                  options={proveedorOptions}
                  value={formik.values.nombre_proveedor || ''}
                  onChange={handleProveedorChange}
                  onInputChange={(_e, v) => {
                    formik.setFieldValue('nombre_proveedor', v);
                    formik.setFieldValue('id_proveedor', null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Proveedor (opcional)" placeholder="Escribí o elegí de la lista" />
                  )}
                />

                <Divider sx={{ my: 2 }} />

                {/* IMPORTE */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Importe y fecha
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Fecha"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formik.values.fecha_factura}
                    onChange={(e) => formik.setFieldValue('fecha_factura', e.target.value)}
                    error={Boolean(formik.touched.fecha_factura && formik.errors.fecha_factura)}
                    helperText={formik.touched.fecha_factura && formik.errors.fecha_factura}
                    sx={{ minWidth: 220 }}
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* DERECHA: PREVIEW + UPLOAD, SIEMPRE VISIBLE */}
            <Grid item xs={12} md={5} order={{ xs: 1, md: 2 }}>
              <Paper sx={{ p: 2, position: 'sticky', top: 12 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Comprobante
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<OpenInFullIcon />}
                      onClick={() => setViewerFull(true)}
                      disabled={!previewUrl && !formik.values.url_imagen}
                    >
                      Ver grande
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                  >
                    {isEditMode && formik.values.url_imagen ? 'Reemplazar' : 'Subir archivo'}
                     <input
   hidden
   accept="image/*,application/pdf"
   type="file"
   onChange={(e) => {
     const f = e.target.files?.[0] || null;
     setFile(f);
     setPendingUpload(!!f);          // <-- si eligió archivo, hay subida pendiente
   }}
 />
                  </Button>
                  <Button variant="contained" onClick={uploadImage} disabled={!file}>
                    Cargar
                  </Button>
                </Stack>

                {(previewUrl || formik.values.url_imagen) ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      height: isMobile ? '40vh' : '60vh',
                      cursor: 'zoom-in'
                    }}
                    onDoubleClick={() => setViewerFull(true)}
                  >
                    {String(previewUrl || formik.values.url_imagen).includes('.pdf') ? (
                      <embed src={previewUrl || formik.values.url_imagen} width="100%" height="100%" />
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url('${previewUrl || formik.values.url_imagen}')`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                        }}
                      />
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 3,
                      textAlign: 'center',
                      color: 'text.secondary'
                    }}
                  >
                    No hay comprobante cargado. Subí una imagen o PDF.
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* BARRA DE ACCIONES FIJA */}
        <Paper
          elevation={3}
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            px: 2,
            py: 1.5,
            mt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: 10
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
               {pendingUpload && (
                        <Alert severity="warning" sx={{ mb: { xs: 1, sm: 0 } }}>
                        Tenés un archivo seleccionado sin subir. Hacé clic en <b>Cargar</b> para poder guardar.
                        </Alert>
                   )}
            <Stack direction="row" spacing={1}>
              {isEditMode && (
                <Button color="error" variant="outlined" onClick={borrarMovimiento} startIcon={<DeleteOutlineIcon />}>
                  Eliminar
                </Button>
              )}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => router.back()}>Volver</Button>
              <Button variant="contained" onClick={() => formik.submitForm()} disabled={isLoading || pendingUpload}>
                {isLoading ? <CircularProgress size={20} /> : (isEditMode ? 'Guardar' : 'Crear')}
              </Button>
              <Button variant="contained" color="secondary" onClick={handleGuardarYCargarOtro} disabled={isLoading || pendingUpload}>
                {isLoading ? <CircularProgress size={20} /> : 'Guardar y cargar otro'}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* FULLSCREEN VIEWER (simple con nueva pestaña) */}
        {viewerFull && (previewUrl || formik.values.url_imagen) && (
          <Box sx={{ display: 'none' }}>
            {typeof window !== 'undefined' && (window.open(previewUrl || formik.values.url_imagen, '_blank'), setViewerFull(false))}
          </Box>
        )}

        <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormSimplePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormSimplePage;
