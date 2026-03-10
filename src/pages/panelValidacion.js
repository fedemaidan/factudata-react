import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Button, Stack, Checkbox, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, IconButton, Chip
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import EditarBorradorDrawer from 'src/components/panelValidacion/EditarBorradorDrawer';
import PanelValidacionFiltersBar from 'src/components/panelValidacion/PanelValidacionFiltersBar';

const PanelValidacionPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [editDrawer, setEditDrawer] = useState({ open: false, mov: null, form: {} });
  const [proyectos, setProyectos] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  const [filtros, setFiltros] = useState({
    fechaDesde: hace30Dias.toISOString().split('T')[0],
    fechaHasta: hoy.toISOString().split('T')[0],
    proveedor: '',
    nombre_user: '',
    texto: '',
    estado: '',
  });

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const buildApiFilters = useCallback((f) => {
    const api = {
      fechaDesde: f.fechaDesde,
      fechaHasta: f.fechaHasta,
      proveedor: f.proveedor || undefined,
      nombre_user: f.nombre_user || undefined,
      texto: f.texto || undefined,
    };
    if (f.estado === 'confirmado') {
      api.estado_borrador = 'confirmado';
    } else if (f.estado && ['pendiente', 'completado', 'error'].includes(f.estado)) {
      api.estado_procesamiento = f.estado;
    }
    return api;
  }, []);

  const fetchBorradores = useCallback(async (filtrosToUse) => {
    if (!empresaId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const f = filtrosToUse ?? filtrosRef.current;
      const apiFilters = buildApiFilters(f);
      const res = await movimientosService.getBorradores(empresaId, apiFilters);
      setItems(res.items || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al cargar borradores', severity: 'error' });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, buildApiFilters]);

  useEffect(() => {
    if (empresaId) fetchBorradores();
  }, [empresaId, fetchBorradores]);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(items.map((m) => m.id));
    else setSelected([]);
  };

  const handleSelectOne = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirmar = async (idsOverride = null) => {
    const ids = idsOverride ?? selected;
    if (ids.length === 0) {
      setSnackbar({ open: true, message: 'Seleccioná al menos un movimiento', severity: 'warning' });
      return;
    }
    setConfirming(true);
    try {
      const res = await movimientosService.confirmarBorradores(ids);
      if (res.error) throw new Error(res.message);
      setSnackbar({ open: true, message: `Confirmados ${res.data?.ok ?? ids.length} movimientos`, severity: 'success' });
      setSelected((prev) => prev.filter((id) => !ids.includes(id)));
      fetchBorradores();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al confirmar', severity: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  const handleEditar = async (mov) => {
    let proys = [];

    if (empresaId) {
      try {
        const empresa = await getEmpresaById(empresaId);
        if (empresa?.proyectosIds?.length) proys = await getProyectosByEmpresa(empresa);
      } catch (e) {
        console.warn('Error cargando proyectos:', e);
      }
    }
    setProyectos(proys);

    const fechaVal = mov.fecha_factura;
    const fechaStr =
      typeof fechaVal === 'string' && fechaVal.includes('T')
        ? fechaVal.split('T')[0]
        : typeof fechaVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaVal)
          ? fechaVal
          : fechaVal?.toDate
            ? fechaVal.toDate().toISOString().split('T')[0]
            : '';

    setEditDrawer({
      open: true,
      mov,
      form: {
        proyecto_id: mov.proyecto_id || '',
        nombre_proveedor: mov.nombre_proveedor || '',
        observacion: mov.observacion || '',
        categoria: mov.categoria || '',
        subcategoria: mov.subcategoria || '',
        total: mov.total ?? '',
        numero_factura: mov.numero_factura || '',
        medio_pago: mov.medio_pago || '',
        fecha_factura: fechaStr,
      },
    });
  };

  const handleGuardarEdicion = async () => {
    const { mov, form } = editDrawer;
    if (!mov?.id) return;
    const payload = { ...form };
    if (form.proyecto_id) {
      const proy = proyectos.find((p) => p.id === form.proyecto_id);
      if (proy) payload.proyecto_nombre = proy.nombre;
    } else {
      payload.proyecto_id = null;
      payload.proyecto_nombre = null;
    }
    setSavingEdit(true);
    try {
      const res = await movimientosService.updateBorrador(mov.id, payload);
      if (res.error) throw new Error(res.message);
      setSnackbar({ open: true, message: 'Movimiento actualizado', severity: 'success' });
      setEditDrawer({ open: false, mov: null, form: {} });
      fetchBorradores();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al guardar', severity: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });

  const getProyectoNombre = (mov) => {
    const n = mov?.proyecto_nombre || mov?.proyecto;
    return (n && String(n).trim()) ? n : 'Sin proyecto';
  };

  const getEstadoProcesamientoLabel = (mov) => {
    const eb = mov?.estado_borrador || mov?.estado_carga;
    if (eb === 'confirmado') return { label: 'Confirmado', color: 'success', variant: 'filled' };
    const ep = mov?.estado_procesamiento;
    if (!ep) return null;
    if (ep === 'pendiente') return { label: 'Procesando...', color: 'warning', variant: 'filled' };
    if (ep === 'completado') return { label: 'Listo', color: 'success', variant: 'outlined' };
    if (ep === 'error') return { label: 'Error', color: 'error', variant: 'filled', title: mov?.procesamiento_error };
    return null;
  };

  return (
    <>
      <Head>
        <title>Panel de Validación</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, pt: 2, pb: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <PanelValidacionFiltersBar
                texto={filtros.texto}
                setTexto={(v) => setFiltros((f) => ({ ...f, texto: v }))}
                fechaDesde={filtros.fechaDesde}
                setFechaDesde={(v) => setFiltros((f) => ({ ...f, fechaDesde: v }))}
                fechaHasta={filtros.fechaHasta}
                setFechaHasta={(v) => setFiltros((f) => ({ ...f, fechaHasta: v }))}
                proveedor={filtros.proveedor}
                setProveedor={(v) => setFiltros((f) => ({ ...f, proveedor: v }))}
                nombre_user={filtros.nombre_user}
                setNombre_user={(v) => setFiltros((f) => ({ ...f, nombre_user: v }))}
                estado={filtros.estado}
                setEstado={(v) => setFiltros((f) => ({ ...f, estado: v }))}
                onFiltrar={() => fetchBorradores(filtros)}
                onRestablecer={() => {
                  const defaultFiltros = {
                    fechaDesde: hace30Dias.toISOString().split('T')[0],
                    fechaHasta: hoy.toISOString().split('T')[0],
                    proveedor: '',
                    nombre_user: '',
                    texto: '',
                    estado: '',
                  };
                  setFiltros(defaultFiltros);
                  filtrosRef.current = defaultFiltros;
                  fetchBorradores(defaultFiltros);
                }}
              />
              <Typography variant="body2">
                Total: {total} borradores
              </Typography>
            </Stack>

            {selected.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleConfirmar}
                  disabled={confirming}
                >
                  {confirming ? <CircularProgress size={20} /> : `Confirmar ${selected.length} seleccionados`}
                </Button>
                <Button variant="outlined" size="small" onClick={() => setSelected([])}>
                  Deseleccionar
                </Button>
              </Stack>
            )}

            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Typography color="text.secondary">No hay borradores pendientes</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={items.length > 0 && selected.length === items.length}
                        indeterminate={selected.length > 0 && selected.length < items.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Adjunto</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(m.id)}
                          onChange={() => handleSelectOne(m.id)}
                        />
                      </TableCell>
                      <TableCell>{formatTimestamp(m.fecha_factura)}</TableCell>
                      <TableCell>{getProyectoNombre(m)}</TableCell>
                      <TableCell>{m.nombre_proveedor || '-'}</TableCell>
                      <TableCell>{m.nombre_user || '-'}</TableCell>
                      <TableCell>{formatCurrency(m.total)} {m.moneda || 'ARS'}</TableCell>
                      <TableCell>
                        {(() => {
                          const epInfo = getEstadoProcesamientoLabel(m);
                          return epInfo ? (
                            <Chip
                              size="small"
                              label={epInfo.label}
                              color={epInfo.color}
                              variant={epInfo.variant || 'filled'}
                              title={epInfo.title}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {(m.url_imagen || m.url_image) && (
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); openImg(m.url_imagen || m.url_image); }}
                            title="Ver imagen/PDF"
                          >
                            <ImageIcon fontSize="small" />
                          </IconButton>
                        )}
                        {!m.url_imagen && !m.url_image && <Typography variant="caption" color="text.secondary">-</Typography>}
                      </TableCell>
                      <TableCell>
                        {(m?.estado_borrador === 'confirmado' || m?.estado_carga === 'confirmado') ? (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditar(m)}>
                              Editar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleConfirmar([m.id])}
                              disabled={confirming}
                            >
                              Confirmar
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Container>
      </Box>

      <Dialog open={imgPreview.open} onClose={closeImg} maxWidth="lg" fullWidth>
        <DialogTitle>Comprobante</DialogTitle>
        <DialogContent>
          {imgPreview.url && (
            <Box sx={{ minHeight: 400 }}>
              {String(imgPreview.url).toLowerCase().includes('.pdf') ? (
                <embed src={imgPreview.url} width="100%" height="600px" />
              ) : (
                <img src={imgPreview.url} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <EditarBorradorDrawer
        open={editDrawer.open}
        mov={editDrawer.mov}
        form={editDrawer.form}
        proyectos={proyectos}
        onClose={() => setEditDrawer({ open: false, mov: null, form: {} })}
        onSave={handleGuardarEdicion}
        onFormChange={(form) => setEditDrawer((d) => ({ ...d, form }))}
        saving={savingEdit}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

PanelValidacionPage.getLayout = (page) => (
  <DashboardLayout title="Panel de Validación">{page}</DashboardLayout>
);
export default PanelValidacionPage;
