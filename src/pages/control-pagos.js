import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  Paper,
  Popover,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import movimientosService from 'src/services/movimientosService';
import profileService from 'src/services/profileService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { formatCurrencyWithCode, formatTimestamp, dateToTimestamp } from 'src/utils/formatters';
import { buildCompletarPagoUpdateFields, puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const MIN_FREE_TEXT_LENGTH = 3;

const ALL_TAB_OPTIONS = [
  {
    value: 'porPagar',
    label: 'Por pagar',
    tooltip: 'Egresos pendientes de pago.',
  },
  {
    value: 'pagados',
    label: 'Pagados',
    tooltip: 'Egresos pagados.',
  },
  {
    value: 'porAprobar',
    label: 'Por aprobar',
    tooltip: 'Egresos sin monto aprobado asignado todavía.',
  },
  {
    value: 'todos',
    label: 'Todos',
    tooltip: 'Todos los egresos del alcance actual.',
  },
];

const COLUMNS_STORAGE_KEY = 'control-pagos:hidden-columns';

const TABLE_COLUMNS = [
  { key: 'nombre_proveedor', label: 'Proveedor', minWidth: 130, sortField: 'proveedor' },
  { key: 'proyecto', label: 'Obra', minWidth: 100, sortField: 'proyecto_nombre' },
  { key: 'fecha_factura', label: 'Fecha', minWidth: 82, sortField: 'fecha_factura' },
  { key: 'categoria', label: 'Categoría', minWidth: 100, sortField: 'categoria' },
  { key: 'estado', label: 'Estado', minWidth: 80, sortField: 'estado' },
  { key: 'total', label: 'Saldo', minWidth: 110, align: 'right', sortField: 'total' },
  { key: 'monto_aprobado', label: 'Aprobado', minWidth: 170, align: 'right', sortField: 'monto_aprobado' },
  { key: 'monto_pagado', label: 'Pagado', minWidth: 170, align: 'right', sortField: 'monto_pagado' },
  { key: 'observacion', label: 'Observación', minWidth: 160, sortField: 'observacion' },
];


const flattenDashboardItems = (items = []) => items.flatMap((item) => {
  if (item?.tipo === 'grupo_prorrateo') return item.movimientos || [];
  return item?.data ? [item.data] : [];
});

const validateBuscar = (buscar) => {
  if (!buscar || !buscar.trim()) return null;
  if (buscar.trim().length < MIN_FREE_TEXT_LENGTH) {
    return `La búsqueda requiere al menos ${MIN_FREE_TEXT_LENGTH} caracteres.`;
  }
  return null;
};

const buildDashboardParams = ({ filterState, tabPreset, page, limit, empresaId, proyectoIds = [] }) => {
  const params = {
    page: page + 1,
    limit,
    includeOptions: 'false',
    includeTotals: 'false',
    groupProrrateos: 'false',
    sort: filterState.ordenarPor || 'fecha_factura',
    order: filterState.ordenarDir === 'asc' ? 'asc' : 'desc',
    tipo: 'egreso',
  };

  if (empresaId) params.empresaId = empresaId;
  if (proyectoIds.length > 0) params.proyectoIds = proyectoIds.join(',');
  if (filterState.buscar?.trim()) params.palabras = filterState.buscar.trim();
  if (filterState.proveedores?.length > 0) params.proveedores = filterState.proveedores.join(',');
  if (filterState.categorias?.length > 0) params.categorias = filterState.categorias.join(',');
  if (filterState.fechaDesde) params.fechaDesde = filterState.fechaDesde;
  if (filterState.fechaHasta) params.fechaHasta = filterState.fechaHasta;
  if (tabPreset.estados?.length > 0) params.estados = tabPreset.estados.join(',');
  if (tabPreset.aprobacion) params.aprobacion = tabPreset.aprobacion;

  return params;
};

const buildTabPreset = (tab, tieneMontoAprobado = true) => {
  if (tab === 'porPagar') {
    // Si monto_aprobado está desactivado, mostrar todos los pendientes sin filtro de aprobación.
    // Con monto_aprobado habilitado, solo mostrar los que tienen saldo aprobado sin pagar todavía.
    return { estados: ['Pendiente', 'Parcialmente Pagado'], aprobacion: tieneMontoAprobado ? 'pendiente_pago' : '' };
  }
  if (tab === 'pagados') {
    return { estados: ['Pagado'], aprobacion: '' };
  }
  if (tab === 'porAprobar') {
    return { estados: ['Pendiente', 'Parcialmente Pagado'], aprobacion: 'incompleto' };
  }
  return { estados: [], aprobacion: '' };
};

const getMovimientoDisplayProyecto = (movimiento, proyectosMap) => (
  movimiento.proyecto_nombre
  || movimiento.proyectoNombre
  || proyectosMap[movimiento.proyecto_id]?.nombre
  || '-'
);

const getNombreUsuario = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;

const normalizeAmountInput = (value) => {
  if (value == null) return null;
  const normalized = String(value).replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildTodayTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return dateToTimestamp(`${year}-${month}-${day}`);
};

const buildInlinePagoPatch = (movimiento, nextMontoPagado) => {
  const total = Number(movimiento?.total) || 0;
  const montoPagado = nextMontoPagado == null ? null : Math.max(0, Math.min(nextMontoPagado, total));

  if (!montoPagado || montoPagado <= 0) {
    return {
      monto_pagado: null,
      estado: 'Pendiente',
      fecha_pago: null,
    };
  }

  if (montoPagado >= total - 0.005) {
    return {
      monto_pagado: total,
      estado: 'Pagado',
      fecha_pago: movimiento?.fecha_pago || buildTodayTimestamp(),
    };
  }

  return {
    monto_pagado: montoPagado,
    estado: 'Parcialmente Pagado',
    fecha_pago: movimiento?.fecha_pago || buildTodayTimestamp(),
  };
};

const buildDraftPatch = (movimiento, draft = {}) => {
  const nextMontoAprobado = normalizeAmountInput(draft.monto_aprobado ?? movimiento.monto_aprobado);
  const nextMontoPagado = normalizeAmountInput(draft.monto_pagado ?? movimiento.monto_pagado);
  const currentMontoAprobado = normalizeAmountInput(movimiento.monto_aprobado);
  const currentMontoPagado = normalizeAmountInput(movimiento.monto_pagado);

  const montoAprobadoChanged = nextMontoAprobado !== currentMontoAprobado;
  const montoPagadoChanged = nextMontoPagado !== currentMontoPagado;
  if (!montoAprobadoChanged && !montoPagadoChanged) return null;

  const patch = {};
  if (montoAprobadoChanged) patch.monto_aprobado = nextMontoAprobado;
  if (montoPagadoChanged) Object.assign(patch, buildInlinePagoPatch(movimiento, nextMontoPagado));
  return patch;
};

const ESTADO_LABEL = {
  Pagado: 'Pagado',
  'Parcialmente Pagado': 'Parcial',
  Pendiente: 'Pendiente',
};

const renderEstadoChip = (estado) => {
  if (!estado) return <Chip size="small" label="—" variant="outlined" />;

  const color = estado === 'Pagado'
    ? 'success'
    : estado === 'Parcialmente Pagado'
      ? 'warning'
      : 'default';

  return <Chip size="small" label={ESTADO_LABEL[estado] ?? estado} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />;
};

const PagosAprobacionesPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();

  const tienePermiso = user?.admin || (user?.empresa?.acciones || user?.empresaData?.acciones || []).includes('VER_CONTROL_PAGOS');

  const [activeTab, setActiveTab] = useState('porPagar');
  const [empresa, setEmpresa] = useState(null);

  const tieneMontoAprobado = empresa?.comprobante_info?.monto_aprobado === true;

  const tabOptions = tieneMontoAprobado
    ? ALL_TAB_OPTIONS
    : ALL_TAB_OPTIONS.filter((t) => t.value === 'porPagar' || t.value === 'pagados');
  const [proyectos, setProyectos] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [options, setOptions] = useState({});
  const [movimientos, setMovimientos] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [globalMetrics, setGlobalMetrics] = useState(null);
  const [loadingGlobalMetrics, setLoadingGlobalMetrics] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [filterState, setFilterState] = useState({
    buscar: '',
    proveedores: [],
    categorias: [],
    fechaDesde: '',
    fechaHasta: '',
    ordenarPor: 'fecha_factura',
    ordenarDir: 'asc',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [draftsById, setDraftsById] = useState({});
  const [savingById, setSavingById] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPayLoading, setBulkPayLoading] = useState(false);
  const [bulkSaveLoading, setBulkSaveLoading] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try {
      const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [columnsAnchor, setColumnsAnchor] = useState(null);

  const selectedProjectIds = useMemo(
    () => selectedProjects.map((project) => project.id).filter(Boolean),
    [selectedProjects]
  );

  const selectedProjectIdsKey = useMemo(() => selectedProjectIds.join(','), [selectedProjectIds]);

  const visibleColumns = useMemo(
    () => TABLE_COLUMNS.filter((col) => !hiddenColumns.has(col.key)),
    [hiddenColumns]
  );

  const handleToggleColumn = useCallback((key) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }, []);

  const proyectosMap = useMemo(
    () => Object.fromEntries(proyectos.map((proyecto) => [proyecto.id, proyecto])),
    [proyectos]
  );

  const summary = useMemo(() => {
    const totalVisible = movimientos.reduce((acc, movimiento) => acc + (Number(movimiento.total) || 0), 0);
    const totalAprobado = movimientos.reduce((acc, movimiento) => acc + (Number(movimiento.monto_aprobado) || 0), 0);
    const pendientesAprobacion = movimientos.filter((movimiento) => !(Number(movimiento.monto_aprobado) > 0)).length;
    const pendientesPago = movimientos.filter((movimiento) => movimiento.estado !== 'Pagado').length;

    return {
      totalVisible,
      totalAprobado,
      pendientesAprobacion,
      pendientesPago,
    };
  }, [movimientos]);

  const allSelectedOnPage = useMemo(() => {
    if (movimientos.length === 0) return false;
    return movimientos.every((movimiento) => selectedIds.has(movimiento.id));
  }, [movimientos, selectedIds]);

  const selectedMovimientos = useMemo(
    () => movimientos.filter((movimiento) => selectedIds.has(movimiento.id)),
    [movimientos, selectedIds]
  );

  const selectedPayableMovimientos = useMemo(
    () => selectedMovimientos.filter((movimiento) => puedeCompletarPagoEgreso(movimiento)),
    [selectedMovimientos]
  );

  const dirtyMovimientos = useMemo(
    () => movimientos.flatMap((movimiento) => {
      const patch = buildDraftPatch(movimiento, draftsById[movimiento.id] || {});
      return patch ? [{ movimiento, patch }] : [];
    }),
    [draftsById, movimientos]
  );

  const dirtyMovimientoIds = useMemo(
    () => new Set(dirtyMovimientos.map(({ movimiento }) => movimiento.id)),
    [dirtyMovimientos]
  );

  const activeSortField = filterState.ordenarPor || 'fecha_factura';
  const activeSortDirection = filterState.ordenarDir === 'asc' ? 'asc' : 'desc';

  const syncUserNames = useCallback(async (rows) => {
    const userIds = [...new Set(
      rows
        .filter((movimiento) => movimiento.id_user && !movimiento.nombre_user)
        .map((movimiento) => movimiento.id_user)
    )];

    if (userIds.length === 0) return rows;

    try {
      const profiles = await Promise.all(userIds.map(async (id) => {
        const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
        const name = profile
          ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || null)
          : null;
        return { id, name };
      }));

      const usersMap = profiles.reduce((acc, entry) => {
        if (entry?.name) acc[entry.id] = entry.name;
        return acc;
      }, {});

      return rows.map((movimiento) => (
        movimiento.id_user && !movimiento.nombre_user && usersMap[movimiento.id_user]
          ? { ...movimiento, nombre_user: usersMap[movimiento.id_user] }
          : movimiento
      ));
    } catch (syncError) {
      console.error('Error sincronizando nombres de usuario:', syncError);
      return rows;
    }
  }, []);

  const fetchScopeData = useCallback(async () => {
    if (!user) return;

    setLoadingScope(true);
    setError(null);

    try {
      const empresaUsuario = await getEmpresaDetailsFromUser(user);
      const proyectosUsuario = await getProyectosFromUser(user);

      if (!empresaUsuario?.id) {
        throw new Error('No se pudo resolver la empresa del usuario.');
      }

      const proyectosNormalizados = (proyectosUsuario || []).map((proyecto) => ({
        ...proyecto,
        empresa_id: proyecto.empresa_id || empresaUsuario.id,
      }));

      setEmpresa(empresaUsuario);
      setProyectos(proyectosNormalizados);
      setSelectedProjects(proyectosNormalizados);
    } catch (scopeError) {
      console.error('Error cargando scope de pagos y aprobaciones:', scopeError);
      setError(scopeError.message || 'No se pudo cargar la empresa del usuario.');
    } finally {
      setLoadingScope(false);
    }
  }, [user]);

  const fetchOptions = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingOptions(true);
    try {
      const params = { empresaId: empresa.id };
      if (selectedProjectIds.length > 0) params.proyectoIds = selectedProjectIds.join(',');
      const response = await movimientosService.getCajasOptions(params);
      setOptions(response?.options || {});
    } catch (optionsError) {
      console.error('Error cargando opciones de filtros:', optionsError);
      setOptions({});
    } finally {
      setLoadingOptions(false);
    }
  }, [empresa?.id, selectedProjectIds]);

  const fetchGlobalMetrics = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingGlobalMetrics(true);
    try {
      const params = { tipo: 'egreso', empresaId: empresa.id };
      if (selectedProjectIds.length > 0) params.proyectoIds = selectedProjectIds.join(',');
      const result = await movimientosService.getCajasTotales(params);
      setGlobalMetrics(result?.totals || null);
    } catch (metricsError) {
      console.error('Error cargando métricas globales:', metricsError);
    } finally {
      setLoadingGlobalMetrics(false);
    }
  }, [empresa?.id, selectedProjectIds]);

  const fetchMovimientos = useCallback(async () => {
    if (!empresa?.id) return;

    setLoadingMovimientos(true);
    setError(null);

    try {
      const validationError = validateBuscar(filterState.buscar);
      if (validationError) {
        setMovimientos([]);
        setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
        setError(validationError);
        return;
      }

      const tabPreset = buildTabPreset(activeTab, tieneMontoAprobado);
      const response = await movimientosService.getCajasDashboard(
        buildDashboardParams({
          filterState,
          tabPreset,
          page,
          limit: rowsPerPage,
          empresaId: empresa.id,
          proyectoIds: selectedProjectIds,
        })
      );

      const flatRows = flattenDashboardItems(response?.items || []);
      const hydratedRows = await syncUserNames(flatRows);
      setMovimientos(hydratedRows);
      setPagination(response?.pagination || { page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setSelectedIds((prev) => new Set([...prev].filter((id) => hydratedRows.some((movimiento) => movimiento.id === id))));
    } catch (fetchError) {
      console.error('Error cargando movimientos de pagos y aprobaciones:', fetchError);
      setMovimientos([]);
      setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setError(fetchError?.response?.data?.error || fetchError.message || 'No se pudieron cargar los movimientos.');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [empresa?.id, filterState, activeTab, page, rowsPerPage, selectedProjectIds, syncUserNames]);

  const handleRefresh = useCallback(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleSort = useCallback((sortField) => {
    if (!sortField) return;
    setFilterState((prev) => ({
      ...prev,
      ordenarPor: sortField,
      ordenarDir: prev.ordenarPor === sortField && prev.ordenarDir === 'asc' ? 'desc' : 'asc',
    }));
    setPage(0);
  }, []);

  const handleTabChange = useCallback((_event, nextTab) => {
    setActiveTab(nextTab);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        movimientos.forEach((movimiento) => next.delete(movimiento.id));
        return next;
      }

      movimientos.forEach((movimiento) => next.add(movimiento.id));
      return next;
    });
  }, [allSelectedOnPage, movimientos]);

  const handleToggleSelectOne = useCallback((movimientoId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(movimientoId)) next.delete(movimientoId);
      else next.add(movimientoId);
      return next;
    });
  }, []);

  const handleOpenMovimiento = useCallback((movimiento) => {
    const proyectoNombre = getMovimientoDisplayProyecto(movimiento, proyectosMap);
    router.push({
      pathname: '/movementForm',
      query: {
        movimientoId: movimiento.id,
        proyectoId: movimiento.proyecto_id,
        proyectoName: proyectoNombre,
        lastPageName: 'Pagos y aprobaciones',
        lastPageUrl: router.asPath,
      },
    });
  }, [proyectosMap, router]);

  const handleDraftChange = useCallback((movimientoId, fieldName, value) => {
    setDraftsById((prev) => ({
      ...prev,
      [movimientoId]: {
        ...(prev[movimientoId] || {}),
        [fieldName]: value,
      },
    }));
  }, []);

  const getDraftValue = useCallback((movimiento, fieldName) => {
    const draft = draftsById[movimiento.id];
    if (draft && Object.prototype.hasOwnProperty.call(draft, fieldName)) {
      return draft[fieldName];
    }
    const value = movimiento[fieldName];
    return value == null ? '' : String(value);
  }, [draftsById]);

  const handleSaveChanges = useCallback(async () => {
    if (dirtyMovimientos.length === 0) return;

    const dirtyIds = dirtyMovimientos.map(({ movimiento }) => movimiento.id);
    setBulkSaveLoading(true);
    setFeedback(null);
    setSavingById((prev) => {
      const next = { ...prev };
      dirtyIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    try {
      const nombreUsuario = getNombreUsuario(user);
      const results = await Promise.all(dirtyMovimientos.map(async ({ movimiento, patch }) => {
        const response = await movimientosService.updateMovimiento(
          movimiento.id,
          { ...movimiento, ...patch },
          nombreUsuario
        );

        return {
          id: movimiento.id,
          ok: !response?.error,
          patch,
        };
      }));

      const successResults = results.filter((result) => result.ok);
      const successIds = successResults.map((result) => result.id);
      const patchMap = Object.fromEntries(successResults.map((result) => [result.id, result.patch]));

      setMovimientos((prev) => prev.map((current) => (
        patchMap[current.id] ? { ...current, ...patchMap[current.id] } : current
      )));
      setDraftsById((prev) => {
        const next = { ...prev };
        successIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });

      if (successIds.length === 0) {
        setFeedback({ severity: 'error', message: 'No se pudieron guardar los cambios.' });
      } else if (successIds.length === results.length) {
        setFeedback({ severity: 'success', message: `Se guardaron ${successIds.length} movimiento(s).` });
        fetchMovimientos();
      } else {
        setFeedback({ severity: 'warning', message: `Se guardaron ${successIds.length} de ${results.length} movimiento(s).` });
        fetchMovimientos();
      }
    } catch (saveError) {
      console.error('Error guardando cambios inline:', saveError);
      setFeedback({ severity: 'error', message: 'Error al guardar los cambios.' });
    } finally {
      setSavingById((prev) => {
        const next = { ...prev };
        dirtyIds.forEach((id) => {
          next[id] = false;
        });
        return next;
      });
      setBulkSaveLoading(false);
    }
  }, [dirtyMovimientos, fetchMovimientos, user]);

  const handlePagarSeleccionados = useCallback(async () => {
    if (selectedPayableMovimientos.length === 0) return;
    setBulkPayLoading(true);
    setFeedback(null);

    try {
      const nombreUsuario = getNombreUsuario(user);
      const results = await Promise.all(selectedPayableMovimientos.map(async (movimiento) => {
        const patch = buildCompletarPagoUpdateFields(movimiento);
        const response = await movimientosService.updateMovimiento(
          movimiento.id,
          { ...movimiento, ...patch },
          nombreUsuario
        );

        return {
          id: movimiento.id,
          ok: !response?.error,
          patch,
        };
      }));

      const successIds = results.filter((result) => result.ok).map((result) => result.id);
      const patchMap = Object.fromEntries(results.filter((result) => result.ok).map((result) => [result.id, result.patch]));

      setMovimientos((prev) => prev.map((movimiento) => (
        patchMap[movimiento.id] ? { ...movimiento, ...patchMap[movimiento.id] } : movimiento
      )));
      setSelectedIds(new Set());

      if (successIds.length === results.length) {
        setFeedback({ severity: 'success', message: `Se pagaron ${successIds.length} movimiento(s).` });
      } else {
        setFeedback({ severity: 'warning', message: `Se pagaron ${successIds.length} de ${results.length} movimiento(s).` });
      }
    } catch (bulkError) {
      console.error('Error en pago múltiple:', bulkError);
      setFeedback({ severity: 'error', message: 'Error al pagar los movimientos seleccionados.' });
    } finally {
      setBulkPayLoading(false);
    }
  }, [selectedPayableMovimientos, user]);

  useEffect(() => {
    fetchScopeData();
  }, [fetchScopeData]);

  // Si la empresa cargó sin monto_aprobado habilitado, resetear tabs que no son visibles
  useEffect(() => {
    if (empresa && !tieneMontoAprobado && (activeTab === 'porAprobar' || activeTab === 'todos')) {
      setActiveTab('porPagar');
    }
  }, [tieneMontoAprobado, empresa]);

  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  useEffect(() => {
    if (page !== 0) setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState, activeTab, selectedProjectIdsKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  if (!user) {
    return (
      <DashboardLayout title="Control de pagos">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!tienePermiso) {
    return (
      <DashboardLayout title="Control de pagos">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <Alert severity="warning">No tenés permiso para acceder a esta sección. Pedile a un administrador que habilite la acción <strong>VER_CONTROL_PAGOS</strong> en la configuración de la empresa.</Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Control de pagos">
      <Head>
        <title>Control de pagos</title>
      </Head>

      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Typography variant="h4" fontWeight={800}>Control de pagos</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={empresa?.nombre || 'Mi empresa'} variant="outlined" color="primary" />
                <Chip label={`${pagination.total || 0} resultado(s)`} variant="outlined" />
                <Button type="button" variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loadingMovimientos}>
                  Actualizar
                </Button>
              </Stack>
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 2, pt: 1.5 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  aria-label="Tabs de control de pagos"
                >
                  {tabOptions.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} />
                  ))}
                </Tabs>
              </Box>

            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" alignItems="flex-start">
                  <Autocomplete
                    multiple
                    options={proyectos}
                    value={selectedProjects}
                    onChange={(_event, values) => { setSelectedProjects(values); setPage(0); }}
                    getOptionLabel={(option) => option?.nombre || 'Obra'}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    loading={loadingScope}
                    filterSelectedOptions
                    renderInput={(params) => (
                      <TextField {...params} label="Obra" placeholder="Todas las obras" size="small" />
                    )}
                    sx={{ minWidth: 240, flex: 1 }}
                  />

                  <TextField
                    label="Buscar"
                    size="small"
                    value={filterState.buscar}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, buscar: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchMovimientos(); } }}
                    placeholder="Razón social, descripción..."
                    sx={{ minWidth: 220, flex: 1 }}
                  />

                  <Autocomplete
                    multiple
                    options={options?.proveedores || []}
                    value={filterState.proveedores}
                    onChange={(_e, values) => { setFilterState((prev) => ({ ...prev, proveedores: values })); setPage(0); }}
                    filterSelectedOptions
                    renderInput={(params) => (
                      <TextField {...params} label="Proveedor" size="small" />
                    )}
                    sx={{ minWidth: 220, flex: 1 }}
                  />

                  <Autocomplete
                    multiple
                    options={options?.categorias || []}
                    value={filterState.categorias}
                    onChange={(_e, values) => { setFilterState((prev) => ({ ...prev, categorias: values })); setPage(0); }}
                    filterSelectedOptions
                    renderInput={(params) => (
                      <TextField {...params} label="Categoría" size="small" />
                    )}
                    sx={{ minWidth: 200, flex: 1 }}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
                  <TextField
                    label="Fecha desde"
                    type="date"
                    size="small"
                    value={filterState.fechaDesde}
                    onChange={(e) => { setFilterState((prev) => ({ ...prev, fechaDesde: e.target.value })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="Fecha hasta"
                    type="date"
                    size="small"
                    value={filterState.fechaHasta}
                    onChange={(e) => { setFilterState((prev) => ({ ...prev, fechaHasta: e.target.value })); setPage(0); }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                </Stack>
              </Stack>
            </Paper>

            {error && <Alert severity="error">{error}</Alert>}
            {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

            {/* Métricas globales (sin filtros aplicados) */}
            <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, borderRadius: 3, bgcolor: 'background.neutral' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} flexWrap="wrap" alignItems="center">
                <Typography variant="body1" color="text.secondary">
                  Saldo a pagar: <strong>{globalMetrics ? formatCurrencyWithCode(globalMetrics.currencies?.ARS?.egreso || 0, 'ARS') : '—'}</strong>
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Aprobado: <strong>{globalMetrics ? formatCurrencyWithCode(globalMetrics.egresosAprobacion?.totalMontoAprobado || 0, 'ARS') : '—'}</strong>
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Pagado: <strong>{globalMetrics ? formatCurrencyWithCode(globalMetrics.egresosAprobacion?.totalMontoPagado || 0, 'ARS') : '—'}</strong>
                </Typography>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <Chip label={`${selectedIds.size} seleccionado(s)`} size="small" variant="outlined" />
                  <Chip label={`${selectedPayableMovimientos.length} pagables`} size="small" variant="outlined" color="success" />
                  <Chip label={`${dirtyMovimientos.length} con cambios`} size="small" variant="outlined" color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    {pagination.total || 0} resultados — Saldo: <strong>{formatCurrencyWithCode(summary.totalVisible, 'ARS')}</strong> — Aprobado: <strong>{formatCurrencyWithCode(summary.totalAprobado, 'ARS')}</strong>
                    {summary.pendientesAprobacion > 0 && <span style={{ marginLeft: 8, color: '#ed6c02', fontWeight: 600 }}>{summary.pendientesAprobacion} sin aprobar</span>}
                    {summary.pendientesPago > 0 && <span style={{ marginLeft: 8, color: '#d32f2f', fontWeight: 600 }}>{summary.pendientesPago} sin pagar</span>}
                  </Typography>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ViewColumnIcon fontSize="small" />}
                    onClick={(e) => setColumnsAnchor(e.currentTarget)}
                    size="small"
                  >
                    Columnas
                  </Button>
                  <Popover
                    open={Boolean(columnsAnchor)}
                    anchorEl={columnsAnchor}
                    onClose={() => setColumnsAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  >
                    <Box sx={{ p: 1.5, minWidth: 180 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Columnas visibles
                      </Typography>
                      {TABLE_COLUMNS.map((col) => (
                        <FormControlLabel
                          key={col.key}
                          control={
                            <Checkbox
                              size="small"
                              checked={!hiddenColumns.has(col.key)}
                              onChange={() => handleToggleColumn(col.key)}
                            />
                          }
                          label={<Typography variant="body2">{col.label}</Typography>}
                          sx={{ display: 'flex', m: 0 }}
                        />
                      ))}
                    </Box>
                  </Popover>
                  <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveOutlinedIcon fontSize="small" />}
                    onClick={handleSaveChanges}
                    disabled={bulkSaveLoading || dirtyMovimientos.length === 0}
                  >
                    {bulkSaveLoading ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  <Button
                    type="button"
                    variant="contained"
                    color="success"
                    onClick={handlePagarSeleccionados}
                    disabled={bulkPayLoading || selectedPayableMovimientos.length === 0}
                  >
                    {bulkPayLoading ? 'Pagando...' : 'Pagar seleccionados'}
                  </Button>
                </Stack>
              </Stack>

              {(loadingMovimientos || loadingOptions) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              )}

              <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={allSelectedOnPage}
                          indeterminate={!allSelectedOnPage && selectedIds.size > 0}
                          onChange={handleToggleSelectAll}
                        />
                      </TableCell>
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align || 'left'}
                          sx={{ minWidth: column.minWidth, fontWeight: 700, whiteSpace: 'nowrap' }}
                          sortDirection={activeSortField === column.sortField ? activeSortDirection : false}
                        >
                          <TableSortLabel
                            active={activeSortField === column.sortField}
                            direction={activeSortField === column.sortField ? activeSortDirection : 'asc'}
                            onClick={() => handleSort(column.sortField)}
                          >
                            {column.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ minWidth: 160, fontWeight: 700 }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {movimientos.map((movimiento) => {
                      const savingRow = !!savingById[movimiento.id];
                      const draftMontoAprobado = getDraftValue(movimiento, 'monto_aprobado');
                      const draftMontoPagado = getDraftValue(movimiento, 'monto_pagado');
                      const rowDirty = dirtyMovimientoIds.has(movimiento.id);

                      return (
                        <TableRow
                          hover
                          key={movimiento.id}
                          selected={selectedIds.has(movimiento.id)}
                          sx={{
                            '& .MuiTableCell-root': { py: 0.5 },
                            ...(rowDirty ? { backgroundColor: 'rgba(255, 244, 229, 0.6)' } : {}),
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedIds.has(movimiento.id)}
                              onChange={() => handleToggleSelectOne(movimiento.id)}
                            />
                          </TableCell>

                          {visibleColumns.map((column) => {
                            if (column.key === 'proyecto') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} sx={{ whiteSpace: 'nowrap' }}>
                                  {getMovimientoDisplayProyecto(movimiento, proyectosMap)}
                                </TableCell>
                              );
                            }

                            if (column.key === 'estado') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`}>
                                  {renderEstadoChip(movimiento.estado)}
                                </TableCell>
                              );
                            }

                            if (column.key === 'total') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  {formatCurrencyWithCode(movimiento.total || 0, movimiento.moneda || 'ARS')}
                                </TableCell>
                              );
                            }

                            if (column.key === 'monto_aprobado') {
                              const pctAprobado = (() => {
                                const v = normalizeAmountInput(draftMontoAprobado);
                                const t = movimiento.total;
                                if (!v || !t || t <= 0) return null;
                                return Math.round((v / t) * 100);
                              })();
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={pctAprobado ?? ''}
                                      onChange={(event) => {
                                        const pct = parseFloat(event.target.value);
                                        const t = Number(movimiento.total) || 0;
                                        if (Number.isFinite(pct) && t > 0) {
                                          handleDraftChange(movimiento.id, 'monto_aprobado', String(Math.round((pct / 100) * t)));
                                        } else if (event.target.value === '') {
                                          handleDraftChange(movimiento.id, 'monto_aprobado', '');
                                        }
                                      }}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 4px', fontSize: '0.7rem', textAlign: 'right' }, min: 0, max: 100 }}
                                      sx={{ width: 52 }}
                                    />
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>%</Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={draftMontoAprobado}
                                      onChange={(event) => handleDraftChange(movimiento.id, 'monto_aprobado', event.target.value)}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 8px', fontSize: '0.8125rem' } }}
                                      sx={{ width: 110 }}
                                    />
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="text"
                                      title="Aprobar monto total"
                                      onClick={() => handleDraftChange(movimiento.id, 'monto_aprobado', String(movimiento.total || ''))}
                                      disabled={savingRow || bulkSaveLoading}
                                      sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.7rem', color: 'text.secondary', textTransform: 'none' }}
                                    >
                                      total
                                    </Button>
                                  </Stack>
                                </TableCell>
                              );
                            }

                            if (column.key === 'monto_pagado') {
                              const pctPagado = (() => {
                                const v = normalizeAmountInput(draftMontoPagado);
                                const t = movimiento.total;
                                if (!v || !t || t <= 0) return null;
                                return Math.round((v / t) * 100);
                              })();
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} align="right" sx={{ whiteSpace: 'nowrap' }}>
                                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={pctPagado ?? ''}
                                      onChange={(event) => {
                                        const pct = parseFloat(event.target.value);
                                        const t = Number(movimiento.total) || 0;
                                        if (Number.isFinite(pct) && t > 0) {
                                          handleDraftChange(movimiento.id, 'monto_pagado', String(Math.round((pct / 100) * t)));
                                        } else if (event.target.value === '') {
                                          handleDraftChange(movimiento.id, 'monto_pagado', '');
                                        }
                                      }}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 4px', fontSize: '0.7rem', textAlign: 'right' }, min: 0, max: 100 }}
                                      sx={{ width: 52 }}
                                    />
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>%</Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={draftMontoPagado}
                                      onChange={(event) => handleDraftChange(movimiento.id, 'monto_pagado', event.target.value)}
                                      onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }}
                                      disabled={savingRow || bulkSaveLoading}
                                      inputProps={{ style: { padding: '3px 8px', fontSize: '0.8125rem' } }}
                                      sx={{ width: 110 }}
                                    />
                                    <Button
                                      type="button"
                                      size="small"
                                      variant="text"
                                      title="Marcar como pagado"
                                      onClick={() => {
                                        const aprobado = normalizeAmountInput(draftMontoAprobado) ?? normalizeAmountInput(movimiento.monto_aprobado);
                                        const fill = aprobado || movimiento.total || '';
                                        handleDraftChange(movimiento.id, 'monto_pagado', String(fill));
                                      }}
                                      disabled={savingRow || bulkSaveLoading}
                                      sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.7rem', color: 'success.main', textTransform: 'none', fontWeight: 600 }}
                                    >
                                      OK
                                    </Button>
                                  </Stack>
                                </TableCell>
                              );
                            }

                            if (column.key === 'fecha_factura') {
                              return (
                                <TableCell key={`${movimiento.id}-${column.key}`} sx={{ whiteSpace: 'nowrap' }}>
                                  {formatTimestamp(movimiento[column.key], 'DIA/MES/ANO') || '-'}
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell
                                key={`${movimiento.id}-${column.key}`}
                                align={column.align || 'left'}
                                sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                              >
                                {movimiento[column.key] || '-'}
                              </TableCell>
                            );
                          })}

                          <TableCell align="center" sx={{ whiteSpace: 'nowrap', py: 0.5 }}>
                            <Button
                              type="button"
                              size="small"
                              variant="outlined"
                              endIcon={<OpenInNewIcon sx={{ fontSize: '0.875rem !important' }} />}
                              onClick={() => handleOpenMovimiento(movimiento)}
                              disabled={savingRow || bulkSaveLoading}
                              sx={{ py: 0.25, px: 1, fontSize: '0.75rem', minWidth: 0 }}
                            >
                              Abrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {!loadingMovimientos && movimientos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length + 2} align="center" sx={{ py: 5 }}>
                          <Typography variant="body2" color="text.secondary">
                            No hay movimientos para la vista activa con el scope seleccionado.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={pagination.total || 0}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={(_event, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
              />
            </Paper>
          </Stack>
        </Container>
      </Box>
    </DashboardLayout>
  );
};

export default PagosAprobacionesPage;