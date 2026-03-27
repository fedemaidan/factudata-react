import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import EditarBorradorDrawer from 'src/components/panelValidacion/EditarBorradorDrawer';
import PanelValidacionFiltersBar from 'src/components/panelValidacion/PanelValidacionFiltersBar';
import useAssistedCorrectionFlow from 'src/hooks/common/useAssistedCorrectionFlow';
import AssistedCorrectionNavigator from 'src/components/common/AssistedCorrectionNavigator';
import { getCamposConfig } from 'src/components/movementFieldsConfig';

const PanelValidacionPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success', autoHideDuration: 4000 });
  const [notifications, setNotifications] = useState([]);
  const notificationIdRef = useRef(0);
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [editDrawer, setEditDrawer] = useState({ open: false, mov: null, form: {} });
  const [proyectos, setProyectos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  /** Empresa cargada al entrar al panel (misma fuente de verdad que movementForm para comprobante_info). */
  const [empresaPanel, setEmpresaPanel] = useState(null);
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
    estado: 'completado',
  });

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const addNotification = useCallback(({ message, severity = 'info', autoHideDuration = 4000 }) => {
    const id = (notificationIdRef.current += 1);
    setNotifications((prev) => [...prev, { id, message, severity, autoHideDuration, open: true }]);
    return id;
  }, []);

  const updateNotification = useCallback((id, patch) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const panelCorreccionStrategies = useMemo(
    () => ({
      getRowId: (row) => row?.id ?? null,
      isEligible: (row) =>
        Boolean(row) &&
        row.estado_borrador !== 'confirmado' &&
        row.estado_carga !== 'confirmado',
      getModalType: () => 'borrador',
    }),
    []
  );

  const {
    activa: correccionActiva,
    textoProgreso: correccionTextoProgreso,
    iniciar: iniciarCorreccion,
    detener: detenerCorreccion,
    actualRow: correccionActualRow,
    hasPrev: correccionHasPrev,
    hasNext: correccionHasNext,
    irAnterior: irCorreccionAnterior,
    irSiguiente: irCorreccionSiguiente,
    confirmarYAvanzar: correccionConfirmarYAvanzar,
  } = useAssistedCorrectionFlow(items, panelCorreccionStrategies);

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

  const aplicarFiltroEstado = useCallback(
    (nuevoEstado) => {
      const next = { ...filtrosRef.current, estado: nuevoEstado };
      setFiltros(next);
      fetchBorradores(next);
    },
    [fetchBorradores]
  );

  const handleActualizar = useCallback(() => {
    fetchBorradores();
  }, [fetchBorradores]);

  useEffect(() => {
    if (empresaId) fetchBorradores();
  }, [empresaId, fetchBorradores]);

  useEffect(() => {
    if (!empresaId) {
      setEmpresaPanel(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getEmpresaById(empresaId);
        if (!cancelled) setEmpresaPanel(data);
      } catch {
        if (!cancelled) setEmpresaPanel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  const panelCamposCfg = useMemo(
    () => getCamposConfig(empresaPanel?.comprobante_info || {}, empresaPanel?.ingreso_info || {}, 'egreso'),
    [empresaPanel],
  );
  const tablaUsaFechaPago = Boolean(panelCamposCfg.fecha_pago);

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


    const fechaFacturaStr = formatTimestamp(mov.fecha_factura) || '';
    const fechaPagoStr = mov.fecha_pago ? formatTimestamp(mov.fecha_pago) || '' : '';

    setEditDrawer({
      open: true,
      mov,
      form: {
        ...mov,
        type: 'egreso',
        proyecto_id: mov.proyecto_id || '',
        fecha_factura: fechaFacturaStr,
        fecha_pago: fechaPagoStr,
        impuestos: Array.isArray(mov.impuestos) ? mov.impuestos : [],
        tags_extra: Array.isArray(mov.tags_extra) ? mov.tags_extra : [],
      },
    });
  };

  const buildPayloadFromForm = useCallback(
    (form) => {
      const payload = { ...form };
      if (form.proyecto_id) {
        const proy = proyectos.find((p) => p.id === form.proyecto_id);
        if (proy) payload.proyecto_nombre = proy.nombre;
      } else {
        payload.proyecto_id = null;
        payload.proyecto_nombre = null;
      }
      return payload;
    },
    [proyectos]
  );

  const handleGuardarEdicion = useCallback(async () => {
    const { mov, form } = editDrawer;
    if (!mov?.id) return;

    const payload = buildPayloadFromForm(form);
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

    try {
      const res = await movimientosService.updateBorrador(mov.id, payload);
      if (res.error) throw new Error(res.message);

      const confirmRes = await movimientosService.confirmarBorradores([mov.id]);
      if (confirmRes.error) throw new Error(confirmRes.message);

      const codigo = confirmRes.data?.ok?.[0]?.codigoOperacion;
      setSnackbar({
        open: true,
        message: codigo ? `Movimiento confirmado: ${codigo}` : 'Movimiento revisado y confirmado',
        severity: 'success',
        autoHideDuration: 4000,
      });
    } catch (e) {
      setItems(previousItems);
      setSnackbar({ open: true, message: e.message || 'Error al guardar', severity: 'error', autoHideDuration: 4000 });
      throw e;
    } finally {
      setSavingEdit(false);
    }
  }, [editDrawer, items, buildPayloadFromForm]);

  const handleCloseCorreccionFlow = useCallback(() => {
    detenerCorreccion();
    setEditDrawer({ open: false, mov: null, form: {} });
  }, [detenerCorreccion]);

  const handleGuardarEdicionConAvance = useCallback(() => {
    const { mov, form } = editDrawer;
    if (!mov?.id) return;

    const payload = buildPayloadFromForm(form);
    const previousItems = items;
    const optimisticItem = {
      ...mov,
      ...payload,
      estado_borrador: 'confirmado',
      estado_carga: 'confirmado',
      estado_procesamiento: 'completado',
      procesamiento_error: null,
    };

    const notificationId = addNotification({
      message: 'Confirmando movimiento...',
      severity: 'info',
      autoHideDuration: null,
    });

    setItems((prev) => prev.map((item) => (item.id === mov.id ? optimisticItem : item)));
    setEditDrawer({ open: false, mov: null, form: {} });

    const next = correccionConfirmarYAvanzar();
    if (next) {
      handleEditar(next);
    } else {
      handleCloseCorreccionFlow();
      fetchBorradores();
    }

    (async () => {
      try {
        const updateRes = await movimientosService.updateBorrador(mov.id, payload);
        if (updateRes.error) throw new Error(updateRes.message);

        const confirmRes = await movimientosService.confirmarBorradores([mov.id]);
        if (confirmRes.error) throw new Error(confirmRes.message);

        const okList = confirmRes.data?.ok || [];
        const erroresList = confirmRes.data?.errores || [];
        const firstOk = okList.find((o) => o.borradorId === mov.id);
        const firstErr = erroresList.find((e) => e.borradorId === mov.id);

        if (firstOk?.codigoOperacion) {
          updateNotification(notificationId, {
            message: `Movimiento confirmado: ${firstOk.codigoOperacion}`,
            severity: 'success',
            autoHideDuration: 3000,
          });
        } else if (firstErr) {
          updateNotification(notificationId, {
            message: `Error al confirmar: ${firstErr.error}`,
            severity: 'error',
            autoHideDuration: 4000,
          });
          setItems(previousItems);
        } else {
          updateNotification(notificationId, {
            message: 'Movimiento confirmado',
            severity: 'success',
            autoHideDuration: 3000,
          });
        }
      } catch (e) {
        updateNotification(notificationId, {
          message: `Error al confirmar: ${e.message || 'Error desconocido'}`,
          severity: 'error',
          autoHideDuration: 4000,
        });
        setItems(previousItems);
      }
    })();
  }, [
    editDrawer,
    items,
    buildPayloadFromForm,
    addNotification,
    updateNotification,
    correccionConfirmarYAvanzar,
    handleCloseCorreccionFlow,
    fetchBorradores,
    handleEditar,
  ]);

  const handleIniciarCorreccion = useCallback(() => {
    const firstRow = iniciarCorreccion();
    if (!firstRow) {
      setSnackbar({
        open: true,
        message: 'No hay borradores pendientes para corrección asistida',
        severity: 'info',
        autoHideDuration: 4000,
      });
      return;
    }
    handleEditar(firstRow);
  }, [iniciarCorreccion]);

  const handleCorreccionAnterior = useCallback(() => {
    const row = irCorreccionAnterior();
    if (row) handleEditar(row);
  }, [irCorreccionAnterior]);

  const handleCorreccionSiguiente = useCallback(() => {
    const row = irCorreccionSiguiente();
    if (row) handleEditar(row);
  }, [irCorreccionSiguiente]);

  const continuarDisabled = useMemo(() => {
    const { form } = editDrawer;
    const camposConfig = getCamposConfig(drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo, 'egreso');
    const shouldShowProyecto = Boolean(camposConfig?.proyecto);
    return (
      savingEdit ||
      (shouldShowProyecto && !form?.proyecto_id) ||
      form?.total === '' ||
      form?.total === undefined ||
      form?.total === null ||
      !form?.fecha_factura ||
      (Boolean(camposConfig.fecha_pago) && !form?.fecha_pago)
    );
  }, [editDrawer.form, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo, savingEdit]);

  const filterChips = useMemo(() => {
    const chips = [];
    const estadoLabels = {
      '': 'Todos',
      completado: 'Listo',
      error: 'Error',
      confirmado: 'Confirmado',
    };
    const t = filtros.texto?.trim();
    if (t) chips.push(`Buscar: ${t}`);
    if (filtros.fechaDesde) chips.push(`Desde: ${filtros.fechaDesde}`);
    if (filtros.fechaHasta) chips.push(`Hasta: ${filtros.fechaHasta}`);
    if (filtros.proveedor?.trim()) chips.push(`Proveedor: ${filtros.proveedor.trim()}`);
    if (filtros.nombre_user?.trim()) chips.push(`Usuario: ${filtros.nombre_user.trim()}`);
    if (filtros.estado) {
      chips.push(`Estado: ${estadoLabels[filtros.estado] ?? filtros.estado}`);
    }
    return chips;
  }, [filtros]);

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
            <Stack spacing={1}>
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
                  onEstadoAplicar={aplicarFiltroEstado}
                  onFiltrar={() => fetchBorradores()}
                  onRestablecer={() => {
                    const defaultFiltros = {
                      fechaDesde: '',
                      fechaHasta: '',
                      proveedor: '',
                      nombre_user: '',
                      texto: '',
                      estado: 'completado',
                    };
                    setFiltros(defaultFiltros);
                    filtrosRef.current = defaultFiltros;
                    fetchBorradores(defaultFiltros);
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleIniciarCorreccion}
                    disabled={isLoading || !empresaId || items.length === 0}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 1,
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    Corrección asistida
                  </Button>
                </Box>
                <Typography variant="body2">
                  Total: {total} borradores
                </Typography>
              </Stack>
              {filterChips.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: -0.5 }}
                >
                  {filterChips.map((label, idx) => (
                    <Chip
                      key={`filter-chip-${idx}`}
                      label={label}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11 }}
                    />
                  ))}
                </Stack>
              )}
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
                    <TableCell>{tablaUsaFechaPago ? 'Fecha de pago' : 'Fecha factura'}</TableCell>
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
                      <TableCell>
                        {formatTimestamp(tablaUsaFechaPago ? (m.fecha_pago || m.fecha_factura) : m.fecha_factura)}
                      </TableCell>
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
        onClose={correccionActiva ? handleCloseCorreccionFlow : () => setEditDrawer({ open: false, mov: null, form: {} })}
        onSave={correccionActiva ? handleGuardarEdicionConAvance : handleGuardarEdicion}
        onFormChange={(form) => setEditDrawer((d) => ({ ...d, form }))}
        saving={savingEdit}
      />

      {correccionActiva && (
        <AssistedCorrectionNavigator
          visible
          textoProgreso={correccionTextoProgreso}
          hasPrev={correccionHasPrev}
          hasNext={correccionHasNext}
          onPrev={handleCorreccionAnterior}
          onNext={handleCorreccionSiguiente}
          onConfirmarYContinuar={handleGuardarEdicionConAvance}
          onCloseFlow={handleCloseCorreccionFlow}
          showConfirmButton
          confirmLabel={savingEdit ? 'Continuando...' : 'Continuar'}
          confirmDisabled={continuarDisabled}
          position="top"
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.autoHideDuration}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {notifications.map((n, idx) => (
        <Snackbar
          key={n.id}
          open={n.open}
          autoHideDuration={n.autoHideDuration}
          onClose={() => removeNotification(n.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: 16 + idx * 56 }}
        >
          <Alert severity={n.severity} onClose={() => removeNotification(n.id)}>
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};

PanelValidacionPage.getLayout = (page) => (
  <DashboardLayout title="Panel de Validación">{page}</DashboardLayout>
);
export default PanelValidacionPage;
