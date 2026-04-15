import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Container, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Button, Stack, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Chip, Tabs, Tab, TablePagination, Checkbox,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BlockIcon from '@mui/icons-material/Block';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import proveedorService from 'src/services/proveedorService';
import { formatCurrency, formatTimestamp } from 'src/utils/formatters';
import EditarBorradorDrawer from 'src/components/panelValidacion/EditarBorradorDrawer';
import PanelValidacionFiltersBar from 'src/components/panelValidacion/PanelValidacionFiltersBar';
import useAssistedCorrectionFlow from 'src/hooks/common/useAssistedCorrectionFlow';
import AssistedCorrectionNavigator from 'src/components/common/AssistedCorrectionNavigator';
import { getCamposConfig } from 'src/components/movementFieldsConfig';

/** Tamaño de lote para construir el set completo de corrección asistida. */
const BORRADORES_FETCH_LIMIT = 100;

const PanelValidacionPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const pageRef = useRef(0);
  const rowsPerPageRef = useRef(100);
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
  const [rechazoDialog, setRechazoDialog] = useState({ open: false, mov: null });
  const [confirmacionDialog, setConfirmacionDialog] = useState({ open: false, mov: null });
  const [confirmacionMasivaDialogOpen, setConfirmacionMasivaDialogOpen] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [isPreparingCorreccion, setIsPreparingCorreccion] = useState(false);
  const [confirmandoDirectoIds, setConfirmandoDirectoIds] = useState({});
  const [confirmandoSeleccionados, setConfirmandoSeleccionados] = useState(false);
  const [selectedItemsMap, setSelectedItemsMap] = useState(() => new Map());

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
  pageRef.current = page;
  rowsPerPageRef.current = rowsPerPage;

  const getBorradorId = useCallback((item) => item?.id ?? null, []);

  const clearSelectedItems = useCallback(() => {
    setSelectedItemsMap(new Map());
  }, []);

  const removeSelectedItemsByIds = useCallback((ids) => {
    const validIds = (Array.isArray(ids) ? ids : []).filter(Boolean);
    if (validIds.length === 0) return;
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      validIds.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const selectedItems = useMemo(
    () => Array.from(selectedItemsMap.values()),
    [selectedItemsMap]
  );

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

  /**
   * Misma llamada y mismo formato de respuesta que el backend POST panel-validacion/confirmar
   * (un solo request con todos los ids; el servidor procesa cada id en el mismo handler).
   */
  const ejecutarConfirmarBorradores = useCallback(async (rawIds) => {
    const ids = [...new Set((Array.isArray(rawIds) ? rawIds : []).filter(Boolean))];
    if (ids.length === 0) {
      return { ok: false, razon: 'sin_ids' };
    }
    const confirmRes = await movimientosService.confirmarBorradores(ids);
    if (confirmRes.error) {
      return { ok: false, razon: 'http', message: confirmRes.message };
    }
    const data = confirmRes.data || {};
    return {
      ok: true,
      okList: data.ok || [],
      erroresList: data.errores || [],
      data,
    };
  }, []);

  const panelCorreccionStrategies = useMemo(
    () => ({
      getRowId: (row) => row?.id ?? null,
      isEligible: (row) =>
        Boolean(row) &&
        row.estado_borrador !== 'confirmado' &&
        row.estado_carga !== 'confirmado' &&
        row.estado_borrador !== 'duplicado' &&
        !row.borrador_rechazado,
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
    if (f.estado === 'rechazado') {
      api.rechazados = 'solo';
    } else if (f.estado === '') {
      api.rechazados = 'incluir';
    } else {
      api.rechazados = 'excluir';
      if (f.estado === 'confirmado') {
        api.estado_borrador = 'confirmado';
      } else if (f.estado && ['pendiente', 'completado', 'error'].includes(f.estado)) {
        api.estado_procesamiento = f.estado;
      }
    }
    return api;
  }, []);

  const fetchBorradores = useCallback(async (filtrosToUse, options = {}) => {
    const {
      targetPage = pageRef.current,
      targetRowsPerPage = rowsPerPageRef.current,
    } = options;
    if (!empresaId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const f = filtrosToUse ?? filtrosRef.current;
      const apiFilters = buildApiFilters(f);
      const res = await movimientosService.getBorradores(empresaId, {
        ...apiFilters,
        limit: targetRowsPerPage,
        offset: targetPage * targetRowsPerPage,
      });
      const pageItems = res.items || [];
      const totalCount = typeof res.total === 'number' ? res.total : pageItems.length;
      if (targetPage > 0 && pageItems.length === 0 && totalCount > 0) {
        const lastPage = Math.max(0, Math.ceil(totalCount / targetRowsPerPage) - 1);
        if (lastPage !== targetPage) {
          const retryRes = await movimientosService.getBorradores(empresaId, {
            ...apiFilters,
            limit: targetRowsPerPage,
            offset: lastPage * targetRowsPerPage,
          });
          setPage(lastPage);
          setItems(retryRes.items || []);
          setTotal(typeof retryRes.total === 'number' ? retryRes.total : totalCount);
          return;
        }
      }
      setItems(pageItems);
      setTotal(totalCount);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Error al cargar borradores', severity: 'error' });
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, buildApiFilters]);

  const fetchBorradoresParaCorreccion = useCallback(async (filtrosToUse) => {
    if (!empresaId) return [];
    const f = filtrosToUse ?? filtrosRef.current;
    const apiBase = buildApiFilters(f);
    const allItems = [];
    let reportedTotal = 0;
    for (let offset = 0; ; offset += BORRADORES_FETCH_LIMIT) {
      const res = await movimientosService.getBorradores(empresaId, {
        ...apiBase,
        limit: BORRADORES_FETCH_LIMIT,
        offset,
      });
      const batch = res.items || [];
      if (typeof res.total === 'number') {
        reportedTotal = res.total;
      }
      allItems.push(...batch);
      if (batch.length < BORRADORES_FETCH_LIMIT) break;
      if (reportedTotal > 0 && allItems.length >= reportedTotal) break;
    }
    return allItems;
  }, [empresaId, buildApiFilters]);

  const aplicarFiltroEstado = useCallback(
    (nuevoEstado) => {
      const next = { ...filtrosRef.current, estado: nuevoEstado };
      setFiltros(next);
      clearSelectedItems();
      setPage(0);
      fetchBorradores(next, { targetPage: 0 });
    },
    [clearSelectedItems, fetchBorradores]
  );

  const handleActualizar = useCallback(() => {
    fetchBorradores();
  }, [fetchBorradores]);

  useEffect(() => {
    if (!empresaId) return;
    clearSelectedItems();
    setPage(0);
    fetchBorradores(undefined, { targetPage: 0 });
  }, [empresaId, clearSelectedItems, fetchBorradores]);

  const handleChangePage = useCallback((_event, newPage) => {
    setPage(newPage);
    fetchBorradores(undefined, { targetPage: newPage });
  }, [fetchBorradores]);

  const handleChangeRowsPerPage = useCallback((event) => {
    const nextRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(nextRowsPerPage);
    setPage(0);
    fetchBorradores(undefined, { targetPage: 0, targetRowsPerPage: nextRowsPerPage });
  }, [fetchBorradores]);

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
      const provNombres = await proveedorService.getNombres(empresaData.id);
      setDrawerCatalogos({
        comprobanteInfo: empresaData.comprobante_info || {},
        ingresoInfo: empresaData.ingreso_info || {},
        proveedores: [...provNombres, 'Ajuste'],
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
      removeSelectedItemsByIds([mov.id]);
      setEditDrawer({ open: false, mov: null, form: {} });
    } catch (e) {
      setItems(previousItems);
      setSnackbar({ open: true, message: e.message || 'Error al guardar', severity: 'error', autoHideDuration: 4000 });
      throw e;
    } finally {
      setSavingEdit(false);
    }
  }, [editDrawer, items, buildPayloadFromForm, removeSelectedItemsByIds]);

  const handleCloseCorreccionFlow = useCallback(() => {
    detenerCorreccion();
    setEditDrawer({ open: false, mov: null, form: {} });
  }, [detenerCorreccion]);

  const borradorPendienteRevision = useCallback(
    (m) =>
      Boolean(m) &&
      m.estado_borrador !== 'confirmado' &&
      m.estado_carga !== 'confirmado' &&
      m.estado_borrador !== 'duplicado' &&
      !m.borrador_rechazado,
    []
  );

  const selectableItemsInPage = useMemo(
    () => items.filter((item) => borradorPendienteRevision(item)),
    [items, borradorPendienteRevision]
  );

  const selectedCountInPage = useMemo(
    () => selectableItemsInPage.filter((item) => selectedItemsMap.has(getBorradorId(item))).length,
    [selectableItemsInPage, selectedItemsMap, getBorradorId]
  );

  const allSelectedInPage = selectableItemsInPage.length > 0 && selectedCountInPage === selectableItemsInPage.length;
  const someSelectedInPage = selectedCountInPage > 0 && !allSelectedInPage;

  const handleToggleItemSelection = useCallback((item) => {
    if (!borradorPendienteRevision(item)) return;
    const id = getBorradorId(item);
    if (!id) return;
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, item);
      }
      return next;
    });
  }, [borradorPendienteRevision, getBorradorId]);

  const handleToggleSelectAllInPage = useCallback((event) => {
    const checked = event.target.checked;
    setSelectedItemsMap((prev) => {
      const next = new Map(prev);
      selectableItemsInPage.forEach((item) => {
        const id = getBorradorId(item);
        if (!id) return;
        if (checked) {
          next.set(id, item);
          return;
        }
        next.delete(id);
      });
      return next;
    });
  }, [selectableItemsInPage, getBorradorId]);

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
          removeSelectedItemsByIds([mov.id]);
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
          removeSelectedItemsByIds([mov.id]);
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
    removeSelectedItemsByIds,
  ]);

  const handleIniciarCorreccion = useCallback(async () => {
    if (!empresaId) return;
    setIsPreparingCorreccion(true);
    try {
      const allItems = await fetchBorradoresParaCorreccion();
      const firstRow = iniciarCorreccion(allItems);
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
    } catch (e) {
      setSnackbar({
        open: true,
        message: e.message || 'Error al iniciar corrección asistida',
        severity: 'error',
        autoHideDuration: 4000,
      });
    } finally {
      setIsPreparingCorreccion(false);
    }
  }, [empresaId, fetchBorradoresParaCorreccion, iniciarCorreccion, handleEditar]);

  const handleOpenRechazoDialog = useCallback((mov) => {
    if (!mov?.id) return;
    setRechazoDialog({ open: true, mov });
  }, []);

  const handleOpenConfirmacionDialog = useCallback((mov) => {
    if (!mov?.id) return;
    setConfirmacionDialog({ open: true, mov });
  }, []);

  const handleCloseConfirmacionDialog = useCallback(() => {
    const id = confirmacionDialog.mov?.id;
    if (id && confirmandoDirectoIds[id]) return;
    setConfirmacionDialog({ open: false, mov: null });
  }, [confirmacionDialog.mov, confirmandoDirectoIds]);

  const handleOpenConfirmacionMasivaDialog = useCallback(() => {
    if (selectedItems.length === 0) return;
    setConfirmacionMasivaDialogOpen(true);
  }, [selectedItems.length]);

  const handleCloseConfirmacionMasivaDialog = useCallback(() => {
    if (confirmandoSeleccionados) return;
    setConfirmacionMasivaDialogOpen(false);
  }, [confirmandoSeleccionados]);

  const handleConfirmarDirecto = useCallback(async (mov) => {
    const id = mov?.id;
    if (!id) return;

    setConfirmandoDirectoIds((prev) => ({ ...prev, [id]: true }));
    try {
      const result = await ejecutarConfirmarBorradores([id]);
      if (!result.ok) {
        if (result.razon === 'sin_ids') return;
        throw new Error(result.message || 'Error al confirmar movimiento');
      }

      const errEntry = result.erroresList.find((e) => e.borradorId === id);
      if (errEntry) throw new Error(errEntry.error);

      const codigo = result.okList.find((o) => o.borradorId === id)?.codigoOperacion;
      setSnackbar({
        open: true,
        message: codigo ? `Movimiento confirmado: ${codigo}` : 'Movimiento confirmado',
        severity: 'success',
        autoHideDuration: 3500,
      });
      removeSelectedItemsByIds([id]);
      setConfirmacionDialog({ open: false, mov: null });
      await fetchBorradores();
    } catch (e) {
      setSnackbar({
        open: true,
        message: e.message || 'Error al confirmar movimiento',
        severity: 'error',
        autoHideDuration: 4000,
      });
    } finally {
      setConfirmandoDirectoIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [ejecutarConfirmarBorradores, fetchBorradores, removeSelectedItemsByIds]);

  const handleConfirmarDirectoDesdeDialog = useCallback(() => {
    handleConfirmarDirecto(confirmacionDialog.mov);
  }, [handleConfirmarDirecto, confirmacionDialog.mov]);

  const handleConfirmarSeleccionados = useCallback(async () => {
    const ids = selectedItems.map((item) => getBorradorId(item)).filter(Boolean);
    if (ids.length === 0) return;

    setConfirmandoSeleccionados(true);
    try {
      const result = await ejecutarConfirmarBorradores(ids);
      if (!result.ok) {
        if (result.razon === 'sin_ids') return;
        throw new Error(result.message || 'Error al confirmar movimientos seleccionados');
      }

      const { okList, erroresList } = result;
      const okIds = okList.map((item) => item?.borradorId).filter(Boolean);

      removeSelectedItemsByIds(okIds);
      setConfirmacionMasivaDialogOpen(false);
      await fetchBorradores();

      if (erroresList.length > 0 && okIds.length > 0) {
        setSnackbar({
          open: true,
          message: `Se confirmaron ${okIds.length} movimientos y ${erroresList.length} quedaron con error`,
          severity: 'warning',
          autoHideDuration: 4500,
        });
        return;
      }

      if (erroresList.length > 0) {
        throw new Error(erroresList[0]?.error || 'Error al confirmar movimientos seleccionados');
      }

      if (okIds.length === 1) {
        const soloId = okIds[0];
        const codigo = okList.find((o) => o.borradorId === soloId)?.codigoOperacion;
        setSnackbar({
          open: true,
          message: codigo ? `Movimiento confirmado: ${codigo}` : 'Movimiento confirmado',
          severity: 'success',
          autoHideDuration: 3500,
        });
        return;
      }

      setSnackbar({
        open: true,
        message: `${okIds.length} movimiento${okIds.length !== 1 ? 's' : ''} confirmado${okIds.length !== 1 ? 's' : ''}`,
        severity: 'success',
        autoHideDuration: 3500,
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: e.message || 'Error al confirmar movimientos seleccionados',
        severity: 'error',
        autoHideDuration: 4000,
      });
    } finally {
      setConfirmandoSeleccionados(false);
    }
  }, [selectedItems, getBorradorId, ejecutarConfirmarBorradores, removeSelectedItemsByIds, fetchBorradores]);

  const handleCloseRechazoDialog = useCallback(() => {
    if (rechazando) return;
    setRechazoDialog({ open: false, mov: null });
  }, [rechazando]);

  const handleConfirmarRechazo = useCallback(async () => {
    const mov = rechazoDialog.mov;
    const id = mov?.id;
    if (!id) return;
    setRechazando(true);
    try {
      const res = await movimientosService.rechazarBorradores([id]);
      if (res.error) throw new Error(res.message);
      const errEntry = res.data?.errores?.find((e) => e.borradorId === id);
      if (errEntry) throw new Error(errEntry.error);
      setRechazoDialog({ open: false, mov: null });
      removeSelectedItemsByIds([id]);
      setEditDrawer((d) => (d.mov?.id === id ? { open: false, mov: null, form: {} } : d));
      if (correccionActiva) {
        detenerCorreccion();
      }
      await fetchBorradores();
      setSnackbar({
        open: true,
        message: 'Borrador rechazado',
        severity: 'success',
        autoHideDuration: 4000,
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: e.message || 'Error al rechazar',
        severity: 'error',
        autoHideDuration: 4000,
      });
    } finally {
      setRechazando(false);
    }
  }, [rechazoDialog.mov, correccionActiva, detenerCorreccion, fetchBorradores, removeSelectedItemsByIds]);

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
      !form?.fecha_factura
    );
  }, [editDrawer.form, drawerCatalogos.comprobanteInfo, drawerCatalogos.ingresoInfo, savingEdit]);

  const tabPrincipalValue = useMemo(() => {
    if (filtros.estado === 'completado') return 'por_revisar';
    if (filtros.estado === 'confirmado') return 'confirmados';
    return false;
  }, [filtros.estado]);

  const handleTabPrincipalChange = useCallback(
    (_event, newValue) => {
      if (newValue === 'por_revisar') {
        aplicarFiltroEstado('completado');
        return;
      }
      if (newValue === 'confirmados') {
        aplicarFiltroEstado('confirmado');
      }
    },
    [aplicarFiltroEstado]
  );

  const totalContexto = useMemo(() => {
    const estadoLabels = {
      '': 'Total (todos)',
      completado: 'Total por revisar',
      error: 'Total con error',
      confirmado: 'Total confirmados',
      rechazado: 'Total rechazados',
    };
    const label = estadoLabels[filtros.estado] ?? 'Total';
    return { label };
  }, [filtros.estado]);

  const emptyListMessage = useMemo(() => {
    if (filtros.estado === 'completado') return 'No hay borradores para revisar';
    if (filtros.estado === 'confirmado') return 'No hay borradores confirmados con los filtros actuales';
    if (filtros.estado === 'error') return 'No hay borradores con error';
    if (filtros.estado === 'rechazado') return 'No hay borradores rechazados';
    return 'No hay borradores con los filtros actuales';
  }, [filtros.estado]);

  const filterChips = useMemo(() => {
    const chips = [];
    const estadoLabels = {
      '': 'Todos',
      completado: 'Por revisar',
      error: 'Error',
      confirmado: 'Confirmado',
      rechazado: 'Rechazado',
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
    if (mov?.borrador_rechazado || mov?.estado_borrador === 'duplicado') {
      return { label: 'Rechazado', color: 'warning', variant: 'filled' };
    }
    const eb = mov?.estado_borrador || mov?.estado_carga;
    if (eb === 'confirmado') return { label: 'Confirmado', color: 'success', variant: 'filled' };
    const ep = mov?.estado_procesamiento;
    if (!ep) return null;
    if (ep === 'pendiente') return { label: 'Procesando...', color: 'warning', variant: 'filled' };
    if (ep === 'completado') return { label: 'Pendiente de revisión', color: 'warning', variant: 'outlined' };
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
                  onFiltrar={() => {
                    clearSelectedItems();
                    setPage(0);
                    fetchBorradores(undefined, { targetPage: 0 });
                  }}
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
                    clearSelectedItems();
                    setPage(0);
                    fetchBorradores(defaultFiltros, { targetPage: 0 });
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
                    disabled={
                      isLoading ||
                      isPreparingCorreccion ||
                      !empresaId ||
                      items.length === 0 ||
                      filtros.estado === 'confirmado'
                    }
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: 1,
                      '&:hover': { boxShadow: 2 },
                    }}
                  >
                    {isPreparingCorreccion ? 'Preparando...' : 'Corrección asistida'}
                  </Button>
                </Box>
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

            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Tabs
                value={tabPrincipalValue}
                onChange={handleTabPrincipalChange}
                aria-label="Vista principal del panel de validación"
                variant="standard"
              >
                <Tab label="Por revisar" value="por_revisar" />
                <Tab label="Confirmados" value="confirmados" />
              </Tabs>
              <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {totalContexto.label}
                </Box>
                {': '}
                {total}
                {' '}
                {total === 1 ? 'borrador' : 'borradores'}
              </Typography>
            </Box>

            {selectedItems.length > 0 && filtros.estado !== 'confirmado' && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                sx={{
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {selectedItems.length} movimiento{selectedItems.length !== 1 ? 's' : ''} seleccionado{selectedItems.length !== 1 ? 's' : ''}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={clearSelectedItems}
                    disabled={confirmandoSeleccionados}
                  >
                    Limpiar selección
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<TaskAltIcon />}
                    onClick={handleOpenConfirmacionMasivaDialog}
                    disabled={confirmandoSeleccionados}
                  >
                    Confirmar seleccionados ({selectedItems.length})
                  </Button>
                </Stack>
              </Stack>
            )}

            {isLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress />
              </Box>
            ) : items.length === 0 ? (
              <Typography color="text.secondary">{emptyListMessage}</Typography>
            ) : (
              <Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {filtros.estado !== 'confirmado' && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          indeterminate={someSelectedInPage}
                          checked={allSelectedInPage}
                          onChange={handleToggleSelectAllInPage}
                          disabled={selectableItemsInPage.length === 0 || rechazando || confirmandoSeleccionados}
                          inputProps={{ 'aria-label': 'Seleccionar movimientos de la página' }}
                        />
                      </TableCell>
                    )}
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
                      {filtros.estado !== 'confirmado' && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={selectedItemsMap.has(getBorradorId(m))}
                            onChange={() => handleToggleItemSelection(m)}
                            disabled={!borradorPendienteRevision(m) || rechazando || Boolean(confirmandoDirectoIds[m.id]) || confirmandoSeleccionados}
                            inputProps={{ 'aria-label': `Seleccionar movimiento ${m.id}` }}
                          />
                        </TableCell>
                      )}
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
                        {!borradorPendienteRevision(m) ? (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        ) : (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                            <Tooltip title="Confirmar movimiento">
                              <span>
                                <IconButton
                                  size="small"
                                  color="success"
                                  aria-label="Confirmar movimiento"
                                  onClick={() => handleOpenConfirmacionDialog(m)}
                                  disabled={rechazando || confirmandoSeleccionados || Boolean(confirmandoDirectoIds[m.id])}
                                >
                                  <TaskAltIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Revisar borrador">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label="Revisar borrador"
                                  onClick={() => handleEditar(m)}
                                  disabled={confirmandoSeleccionados || Boolean(confirmandoDirectoIds[m.id])}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Rechazar borrador">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  aria-label="Rechazar borrador"
                                  onClick={() => handleOpenRechazoDialog(m)}
                                  disabled={rechazando || confirmandoSeleccionados || Boolean(confirmandoDirectoIds[m.id])}
                                >
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[25, 50, 100, 200]}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
              </Box>
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
        onRechazar={editDrawer.mov?.id ? () => handleOpenRechazoDialog(editDrawer.mov) : undefined}
        rechazando={rechazando}
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
          showRechazarButton={Boolean(editDrawer.mov?.id)}
          onRechazar={() => handleOpenRechazoDialog(editDrawer.mov)}
          rechazarDisabled={rechazando}
          position="top"
        />
      )}

      <Dialog open={confirmacionDialog.open} onClose={handleCloseConfirmacionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>¿Confirmar movimiento?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              El comprobante se registrará en caja como movimiento confirmado y dejará de mostrarse como borrador en este listado.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseConfirmacionDialog} disabled={Boolean(confirmacionDialog.mov?.id && confirmandoDirectoIds[confirmacionDialog.mov.id])}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmarDirectoDesdeDialog}
            disabled={Boolean(confirmacionDialog.mov?.id && confirmandoDirectoIds[confirmacionDialog.mov.id])}
          >
            {confirmacionDialog.mov?.id && confirmandoDirectoIds[confirmacionDialog.mov.id] ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmacionMasivaDialogOpen} onClose={handleCloseConfirmacionMasivaDialog} maxWidth="xs" fullWidth>
        <DialogTitle>¿Confirmar movimientos seleccionados?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Se confirmarán {selectedItems.length} movimiento{selectedItems.length !== 1 ? 's' : ''} y dejarán de mostrarse como borradores en este listado.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseConfirmacionMasivaDialog} disabled={confirmandoSeleccionados}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmarSeleccionados}
            disabled={confirmandoSeleccionados || selectedItems.length === 0}
          >
            {confirmandoSeleccionados ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rechazoDialog.open} onClose={handleCloseRechazoDialog} maxWidth="xs" fullWidth>
        <DialogTitle>¿Rechazar borrador?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              El comprobante no se registrará en caja y dejará de mostrarse en este listado.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseRechazoDialog} disabled={rechazando}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmarRechazo}
            disabled={rechazando}
          >
            {rechazando ? 'Rechazando...' : 'Rechazar'}
          </Button>
        </DialogActions>
      </Dialog>

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
