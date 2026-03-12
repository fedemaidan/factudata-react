import { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Button, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, IconButton, Tooltip, Chip
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', autoHideDuration: 4000 });
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [editDrawer, setEditDrawer] = useState({ open: false, mov: null, form: {} });
  const [proyectos, setProyectos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [drawerCatalogos, setDrawerCatalogos] = useState({
    comprobanteInfo: {},
    ingresoInfo: {},
    proveedores: [],
    categorias: [],
    tagsExtra: [],
    mediosPago: ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
    etapas: [],
    obrasOptions: [],
    clientesOptions: [],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
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

  const handleActualizar = useCallback(() => {
    fetchBorradores();
  }, [fetchBorradores]);

  useEffect(() => {
    if (empresaId) fetchBorradores();
  }, [empresaId, fetchBorradores]);

  const handleEditar = async (mov) => {
    let proys = [];
    let empresaData = null;

    if (empresaId) {
      try {
        empresaData = await getEmpresaById(empresaId);
        if (empresaData?.proyectosIds?.length) proys = await getProyectosByEmpresa(empresaData);
      } catch (e) {
        console.warn('Error cargando proyectos:', e);
      }
    }
    setEmpresa(empresaData);
    setProyectos(proys);
    if (empresaData) {
      const obras = Array.isArray(empresaData.obras) ? empresaData.obras : [];
      setDrawerCatalogos({
        comprobanteInfo: empresaData.comprobante_info || {},
        ingresoInfo: empresaData.ingreso_info || {},
        proveedores: [...(empresaData.proveedores || []), 'Ajuste'],
        categorias: [...(empresaData.categorias || []), { name: 'Ingreso dinero', subcategorias: [] }, { name: 'Ajuste', subcategorias: ['Ajuste'] }],
        tagsExtra: empresaData.tags_extra || [],
        mediosPago: empresaData.medios_pago?.length ? empresaData.medios_pago : ['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque'],
        etapas: empresaData.etapas || [],
        obrasOptions: obras.map((o) => o.nombre).filter(Boolean),
        clientesOptions: [...new Set(obras.map((o) => o.cliente).filter(Boolean))],
      });
    }

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
        ...mov,
        type: 'egreso',
        proyecto_id: mov.proyecto_id || '',
        fecha_factura: fechaStr,
        fecha_pago:
          typeof mov.fecha_pago === 'string' && mov.fecha_pago.includes('T')
            ? mov.fecha_pago.split('T')[0]
            : typeof mov.fecha_pago === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(mov.fecha_pago)
              ? mov.fecha_pago
              : mov.fecha_pago?.toDate
                ? mov.fecha_pago.toDate().toISOString().split('T')[0]
                : (mov.fecha_pago || ''),
        impuestos: Array.isArray(mov.impuestos) ? mov.impuestos : [],
        tags_extra: Array.isArray(mov.tags_extra) ? mov.tags_extra : [],
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

    const previousItems = items;
    const optimisticItem = {
      ...mov,
      ...payload,
      estado_borrador: 'confirmado',
      estado_carga: 'confirmado',
      estado_procesamiento: 'completado',
      procesamiento_error: null,
    };

    setSavingEdit(true);
    setSnackbar({ open: true, message: 'Guardando movimiento...', severity: 'info', autoHideDuration: 3000 });
    setItems((prev) => prev.map((item) => (item.id === mov.id ? optimisticItem : item)));
    setEditDrawer({ open: false, mov: null, form: {} });

    try {
      const res = await movimientosService.updateBorrador(mov.id, payload);
      if (res.error) throw new Error(res.message);

      const confirmRes = await movimientosService.confirmarBorradores([mov.id]);
      if (confirmRes.error) throw new Error(confirmRes.message);

      setSnackbar({ open: true, message: 'Movimiento revisado y confirmado', severity: 'success', autoHideDuration: 4000 });
    } catch (e) {
      setItems(previousItems);
      setSnackbar({ open: true, message: e.message || 'Error al guardar', severity: 'error', autoHideDuration: 4000 });
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
                    fechaDesde: '',
                    fechaHasta: '',
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title="Actualizar lista">
                  <IconButton
                    size="small"
                    aria-label="Actualizar borradores"
                    onClick={handleActualizar}
                    disabled={isLoading || !empresaId}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 1,
                      '&:hover': { boxShadow: 2 },
                      p: 0.75,
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2">
                Total: {total} borradores
              </Typography>
            </Stack>

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
                          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditar(m)}>
                            Revisar
                          </Button>
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
        empresa={empresa}
        comprobanteInfo={drawerCatalogos.comprobanteInfo}
        ingresoInfo={drawerCatalogos.ingresoInfo}
        proveedores={drawerCatalogos.proveedores}
        categorias={drawerCatalogos.categorias}
        tagsExtra={drawerCatalogos.tagsExtra}
        mediosPago={drawerCatalogos.mediosPago}
        etapas={drawerCatalogos.etapas}
        obrasOptions={drawerCatalogos.obrasOptions}
        clientesOptions={drawerCatalogos.clientesOptions}
        onClose={() => setEditDrawer({ open: false, mov: null, form: {} })}
        onSave={handleGuardarEdicion}
        onFormChange={(form) => setEditDrawer((d) => ({ ...d, form }))}
        saving={savingEdit}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
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
