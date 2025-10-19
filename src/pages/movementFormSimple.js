// pages/movementForm-simple/index.jsx
// Formulario simple (crear/editar) para "caja central"

import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Container, Paper, Stack, Typography, TextField, Autocomplete, Divider,
  Snackbar, Alert, IconButton, Box, CircularProgress
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import movimientosService from 'src/services/movimientosService';
import { useRouter } from 'next/router';
import { dateToTimestamp, formatTimestamp } from 'src/utils/formatters';
import { getProyectosByEmpresa } from 'src/services/proyectosService';

// arriba del componente, cerca de imports/helpers
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

  const { empresa, proveedores, obras, clientes, categorias } = useEmpresaData(user);
  const [isInitialLoading, setIsInitialLoading] =   useState(isEditMode); // sólo carga inicial pesada en edición
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  // archivo a subir y preview
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [codigoOperacion, setCodigoOperacion] = useState(null)

  // ===== Opciones UI =====
  const proveedorOptions = useMemo(
    () =>
      proveedores
        .map((p) => ({ label: p.nombre, id: p.id }))
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

      // === redirect estilo movementForm ===
      if (!isEditMode) {
        const newId = getMovimientoIdFromResponse(res);
        if (newId) {
          router.replace({ pathname: router.pathname, query: { movimientoId: newId } });
        }
      }

      setAlert({ open: true, message: 'Movimiento guardado', severity: 'success' });
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'No se pudo guardar', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  },
});

  // === Carga inicial si estoy editando ===
  useEffect(() => {
    if (!isEditMode || !movimientoId) return;
    (async () => {
      try {
        const data = await movimientosService.getMovimientoById(movimientoId);
        // formateo de fecha para el input date
        if (data?.fecha_factura) {
          try {
            data.fecha_factura = formatTimestamp(data.fecha_factura);
          } catch {
            // fallback: nada
          }
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

        if (data?.codigo_operacion)
            setCodigoOperacion(data?.codigo_operacion)
        // Preview si ya tenía imagen
        if (data?.url_imagen) {
          setPreviewUrl(`${data.url_imagen}?${Date.now()}`);
        }
      } catch (e) {
        console.log(e)
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
    if (obraSel?.cliente) {
      formik.setFieldValue('cliente', obraSel.cliente);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Subida/reemplazo de comprobante
  const uploadImage = async () => {
    if (!file) return;
    try {
      if (isEditMode && movimientoId && formik.values.url_imagen) {
        // Reemplazo (usa endpoint real si lo tenés así)
        await (movimientosService.reemplazarImagen?.(movimientoId, file));
        const nextUrl = (formik.values.url_imagen || '') + `?${Date.now()}`;
        formik.setFieldValue('url_imagen', nextUrl);
        setPreviewUrl(nextUrl);
      } else {
        // Alta temporal y guardar url
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

  return (
    <>
      <Head>
        <title>{isEditMode ? 'Editar movimiento · Simple' : 'Nuevo movimiento · Simple'}</title>
      </Head>

      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5">
            {isEditMode ? 'Editar movimiento' + (codigoOperacion ? "(" + codigoOperacion + ")": "") : 'Nuevo movimiento'}
          </Typography>
          <Stack direction="row" spacing={1}>
            {isEditMode && (
              <IconButton color="error" onClick={borrarMovimiento} title="Eliminar">
                <DeleteOutlineIcon />
              </IconButton>
            )}
            <Button variant="contained" onClick={formik.submitForm} disabled={isLoading}>
              {isLoading ? <CircularProgress size={20} /> : (isEditMode ? 'Guardar' : 'Crear')}
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2 }}>
          {isInitialLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
              <CircularProgress />
            </Box>
          ) : (
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
                onChange={(_e, opt) =>
                  formik.setFieldValue('obra', typeof opt === 'string' ? opt : opt?.label || '')
                }
                onInputChange={(_e, v) => formik.setFieldValue('obra', v)}
                renderInput={(params) => (
                  <TextField {...params} label="Obra (opcional)" placeholder="Escribí o elegí de la lista" />
                )}
              />
              <Autocomplete
                freeSolo
                options={clienteOptions}
                value={formik.values.cliente || ''}
                onChange={(_e, opt) =>
                  formik.setFieldValue('cliente', typeof opt === 'string' ? opt : opt?.label || '')
                }
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
                onInputChange={(_e, v) => {
                  formik.setFieldValue('nombre_proveedor', v);
                  formik.setFieldValue('id_proveedor', null);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Proveedor (opcional)" placeholder="Escribí o elegí de la lista" />
                )}
              />

              {/* Categoría */}
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
                <Button variant="contained" onClick={uploadImage} disabled={!file}>
                  {isEditMode && formik.values.url_imagen ? 'Reemplazar comprobante' : 'Subir comprobante'}
                </Button>

                {(previewUrl || formik.values.url_imagen) && (
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
                        <embed src={previewUrl || formik.values.url_imagen} width="100%" height="100%" />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: '100%',
                          height: '60vh',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundImage: `url('${previewUrl || formik.values.url_imagen}')`,
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
                  {isLoading ? <CircularProgress size={20} /> : (isEditMode ? 'Guardar' : 'Crear')}
                </Button>
              </Stack>
            </Stack>
          )}
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
