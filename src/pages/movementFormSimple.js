// pages/movementForm-simple/index.jsx
// Versión simplificada del formulario de movimientos (producto "caja central") ajustada a los nuevos requisitos:
// - El ID de proveedor no es visible ni editable: se completa automáticamente según la selección.
// - El proveedor es opcional.
// - El comprobante se carga siempre desde un archivo (no editable como URL manualmente).
// - La fecha se inicializa con la fecha actual.
// - Obra y cliente se ubican antes de proveedor y el cliente se autocompleta según la obra seleccionada.

import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import {  Button,  Container,  Paper,  Stack,  Typography,  TextField,  Autocomplete,  Divider,  Snackbar,  Alert,  IconButton,  Box} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import movimientosService from 'src/services/movimientosService';
import { useRouter } from 'next/router';
import { dateToTimestamp } from 'src/utils/formatters';
import { getProyectosByEmpresa } from 'src/services/proyectosService';

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
  url_image: Yup.string().nullable(),
  type: Yup.string().oneOf(['ingreso', 'egreso']).default('egreso'),
});


const normalize = (s) => (s || '').toString().trim();

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

const MovementFormSimplePage = () => {
  const router = useRouter();
  const { movimientoId } = router.query;
  const isEditMode = Boolean(movimientoId);
  const { user } = useAuthContext();
  const { empresa, proveedores, obras, clientes, categorias } = useEmpresaData(user);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState(null); // sólo para previsualizar
    

  const proveedorOptions = useMemo(() => (
    proveedores.map((p) => ({ label: p.nombre, id: p.id }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
  ), [proveedores]);
  const obraOptions = useMemo(() => obras.map((o) => ({ label: o.nombre, cliente: o.cliente })), [obras]);
  const clienteOptions = useMemo(() => clientes.map((c) => ({ label: c })), [clientes]);

const categoriaOptions = useMemo(() => {
  const arr = Array.isArray(categorias) ? categorias : [];
  const names = arr
    .map((c) => (c && typeof c === 'object' ? normalize(c.name) : ''))
    .filter(Boolean);

  // eliminar duplicados case-insensitive
  const unique = [...new Map(names.map(n => [n.toLowerCase(), n])).values()];

  return unique
    .map((label) => ({ label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
}, [categorias]);

const categoriaLabels = useMemo(() => categoriaOptions.map((c) => c.label), [categoriaOptions]);
const validationSchema = useMemo(() => createSchema(categoriaLabels), [categoriaLabels]);

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
            proyecto_id: proyectosData[0].id,
          fecha_factura: dateToTimestamp(values.fecha_factura),
          nombre_proveedor: normalize(values.nombre_proveedor) || null,
          categoria: normalize(values.categoria) || null,
          total: values.total === '' ? null : Number(values.total),
          moneda: values.moneda || 'ARS',
          cliente: normalize(values.cliente) || null,
          obra: normalize(values.obra) || null,
          type: values.type || 'egreso',
          url_imagen: values.url_imagen || null,
        };
        let res;
        if (isEditMode && movimientoId) {
          res = await (movimientosService.updateSimpleMovimiento?.(movimientoId, payload) || movimientosService.updateMovimiento(movimientoId, payload));
        } else {
          res = await (movimientosService.addSimpleMovimiento?.(payload) || movimientosService.addMovimiento(payload));
        }
        if (res?.error) throw new Error(res.error || 'Error al guardar');
        setAlert({ open: true, message: 'Movimiento guardado', severity: 'success' });
        if (!isEditMode && res?.id) router.replace({ pathname: router.pathname, query: { movimientoId: res.id } });
      } catch (e) {
        setAlert({ open: true, message: e?.message || 'No se pudo guardar', severity: 'error' });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const currentCategoriaOption = useMemo(() => {
  const v = formik.values.categoria;
  if (!v) return null;
  const found = categoriaOptions.find(o => o.label.toLowerCase() === v.toLowerCase());
  return found || { label: v }; // muestra el valor actual aunque la lista no haya llegado aún
}, [categoriaOptions, formik.values.categoria]);

  // Autocompletar cliente desde obra
  useEffect(() => {
    const obraSel = obraOptions.find((o) => o.label === formik.values.obra);
    if (obraSel?.cliente) {
      formik.setFieldValue('cliente', obraSel.cliente);
    }
  }, [formik.values.obra, obraOptions]);

  const handleProveedorChange = (_e, optionOrString) => {
  if (!optionOrString) {
    formik.setFieldValue('nombre_proveedor', '');
    return;
  }
  if (typeof optionOrString === 'string') {
    formik.setFieldValue('nombre_proveedor', optionOrString);
  } else {
    formik.setFieldValue('nombre_proveedor', optionOrString.label || '');
  }
};

  const uploadImage = async () => {
  if (!file) return;
  try {
    const res = await movimientosService.subirImagenTemporal?.(file);
    
    // Intenta detectar el *path local* que tu backend necesita para leer con fs
    const localPath =
      res?.path_local || res?.local_path || res?.filePath || res?.path || res?.url_local;

    // URL pública para mostrar en la UI (si tu uploader la devuelve)
    const publicUrl = res?.url_imagen;

   if (!publicUrl) {
     setAlert({ open: true, message: 'No se pudo obtener la URL de la imagen', severity: 'warning' });
     return;
   }
   // lo que persiste / se envía
   formik.setFieldValue('url_imagen', publicUrl);
   // para la preview, con cache-buster
   setPreviewUrl(publicUrl + `?${Date.now()}`);

    setAlert({ open: true, message: 'Comprobante subido', severity: 'success' });
  } catch {
    setAlert({ open: true, message: 'Error al subir imagen', severity: 'error' });
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

  return (
    <>
      <Head>
        <title>{isEditMode ? 'Editar movimiento' : 'Nuevo movimiento'} · Simple</title>
      </Head>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5">{isEditMode ? 'Editar movimiento' : 'Nuevo movimiento'}</Typography>
          <Stack direction="row" spacing={1}>
            {isEditMode && (
              <IconButton color="error" onClick={borrarMovimiento}>
                <DeleteOutlineIcon />
              </IconButton>
            )}
            <Button variant="contained" onClick={formik.submitForm} disabled={isLoading}>
              {isEditMode ? 'Guardar' : 'Crear'}
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            {/* Fecha */}
            <TextField
              label="Fecha de factura"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formik.values.fecha_factura}
              onChange={(e) => formik.setFieldValue('fecha_factura', e.target.value)}
              error={Boolean(formik.touched.fecha_factura && formik.errors.fecha_factura)}
              helperText={formik.touched.fecha_factura && formik.errors.fecha_factura}
            />

            {/* Obra y Cliente */}
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
                <TextField {...params} label="Cliente (opcional)" placeholder="Se puede autocompletar desde la obra" />
              )}
            />

            {/* Proveedor */}
            <Autocomplete
              freeSolo
              options={proveedorOptions}
              value={formik.values.nombre_proveedor || ''}
              onChange={handleProveedorChange}
              onInputChange={(_e, v) => { formik.setFieldValue('nombre_proveedor', v); formik.setFieldValue('id_proveedor', null); }}
              renderInput={(params) => (
                <TextField {...params} label="Proveedor (opcional)" placeholder="Escribí o elegí de la lista" />
              )}
            />

            {/* Categoría (no editable) */}
            <Autocomplete
  options={categoriaOptions}
  value={currentCategoriaOption}
  onChange={(_e, opt) => formik.setFieldValue('categoria', opt?.label || '')}
  isOptionEqualToValue={(option, value) =>
    option.label?.toLowerCase() === value?.label?.toLowerCase()
  }
  noOptionsText="Sin categorías disponibles"
  renderInput={(params) => (
    <TextField
      {...params}
      name="categoria"
      label="Categoría"
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
<TextField
  select
  label="Tipo de movimiento"
  value={formik.values.type}
  onChange={(e) => formik.setFieldValue('type', e.target.value)}
  SelectProps={{ native: true }}
  helperText="Elegí si el movimiento es un ingreso o un egreso"
>
  <option value="egreso">Egreso</option>
  <option value="ingreso">Ingreso</option>
</TextField>



            {/* Total y Moneda */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Total"
                type="number"
                value={formik.values.total}
                onChange={(e) => formik.setFieldValue('total', e.target.value)}
                error={Boolean(formik.touched.total && formik.errors.total)}
                helperText={formik.touched.total && formik.errors.total}
              />
              <TextField
                label="Moneda"
                select
                value={formik.values.moneda}
                onChange={(e) => formik.setFieldValue('moneda', e.target.value)}
                SelectProps={{ native: true }}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </TextField>
            </Stack>

            <Divider />

            {/* Subir comprobante */}
<Stack spacing={1}>
  <Typography variant="subtitle2">Comprobante</Typography>

  <input
    accept="image/*,application/pdf"
    type="file"
    onChange={(e) => setFile(e.target.files?.[0] || null)}
  />
  <Button
    variant="contained"
    onClick={uploadImage}
    disabled={!file}
  >
    Subir comprobante
  </Button>

  {previewUrl && (
    <Box mt={2}>
      {String(previewUrl || formik.values.url_imagen).includes('.pdf') ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'hidden',
            height: '60vh',
          }}
        >
          <embed src={previewUrl} width="100%" height="100%" />
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '60vh',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            backgroundImage: `url('${previewUrl}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      )}
    </Box>
  )}
</Stack>

<Divider />

            {/* Acciones */}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => router.back()}>Volver</Button>
              <Button variant="contained" onClick={formik.submitForm} disabled={isLoading}>
                {isEditMode ? 'Guardar' : 'Crear'}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert({ ...alert, open: false })}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormSimplePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormSimplePage;
