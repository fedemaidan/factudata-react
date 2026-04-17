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
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import analyticsService from 'src/services/analyticsService';
import movimientosService from 'src/services/movimientosService';
import profileService from 'src/services/profileService';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';
import { FilterBarCajaProyecto } from 'src/components/FilterBarCajaProyecto';
import { useMovimientosFilters } from 'src/hooks/useMovimientosFilters';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const COLUMN_STORAGE_KEY = 'movimientos-globales-columnas-v1';
const MIN_FREE_TEXT_LENGTH = 3;
const MAX_FREE_TEXT_RANGE_DAYS = 31;

const GLOBAL_FILTER_EMPRESA = {
  categorias: [{}],
  proveedores: [{}],
  con_estados: true,
  comprobante_info: {
    subcategoria: true,
    medio_pago: true,
    etapa: true,
    cuenta_interna: true,
    empresa_facturacion: true,
    factura_cliente: true,
    createdAt: true,
    updatedAt: true,
  },
};

const flattenDashboardItems = (items = []) => items.flatMap((item) => {
  if (item?.tipo === 'grupo_prorrateo') return item.movimientos || [];
  return item?.data ? [item.data] : [];
});

const formatFilterDateParam = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const getRangeDiffInDays = (from, to) => {
  if (!from || !to) return null;
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
};

const validateFreeTextSearch = ({ filters, empresaId, proyectoIds = [] }) => {
  const palabras = (filters?.palabras || '').trim();
  if (!palabras) return null;

  if (palabras.length < MIN_FREE_TEXT_LENGTH) {
    return `La búsqueda libre requiere al menos ${MIN_FREE_TEXT_LENGTH} caracteres.`;
  }

  const hasScopedEmpresa = Boolean(empresaId);
  const hasScopedProyecto = Array.isArray(proyectoIds) && proyectoIds.length > 0;
  if (hasScopedEmpresa || hasScopedProyecto) return null;

  if (!filters?.fechaDesde || !filters?.fechaHasta) {
    return 'La búsqueda libre global requiere fecha desde y fecha hasta.';
  }

  const diffDays = getRangeDiffInDays(filters.fechaDesde, filters.fechaHasta);
  if (diffDays == null || diffDays < 0) {
    return 'La fecha hasta debe ser posterior a la fecha desde.';
  }
  if (diffDays > MAX_FREE_TEXT_RANGE_DAYS) {
    return `La búsqueda libre global permite un rango máximo de ${MAX_FREE_TEXT_RANGE_DAYS} días.`;
  }

  return null;
};

const buildDashboardParams = ({ filters, page, limit, empresaId, proyectoIds = [] }) => {
  const params = {
    page: page + 1,
    limit,
    includeOptions: 'false',
    includeTotals: 'false',
    groupProrrateos: 'false',
    sort: filters?.ordenarPor || 'fecha_factura',
    order: filters?.ordenarDir === 'asc' ? 'asc' : 'desc',
  };

  const assignArray = (key, value) => {
    if (Array.isArray(value) && value.length > 0) params[key] = value.join(',');
  };

  if (empresaId) params.empresaId = empresaId;
  if (proyectoIds.length > 0) params.proyectoIds = proyectoIds.join(',');

  if (filters?.palabras?.trim()) params.palabras = filters.palabras.trim();
  if (filters?.observacion?.trim()) params.observacion = filters.observacion.trim();
  if (filters?.codigoSync?.trim()) params.codigoSync = filters.codigoSync.trim();

  assignArray('categorias', filters?.categorias);
  assignArray('usuarios', filters?.usuarios);
  assignArray('subcategorias', filters?.subcategorias);
  assignArray('proveedores', filters?.proveedores);
  assignArray('medioPago', filters?.medioPago);
  assignArray('tipo', filters?.tipo);
  assignArray('moneda', filters?.moneda);
  assignArray('etapa', filters?.etapa);
  assignArray('estados', filters?.estados);
  assignArray('cuentaInterna', filters?.cuentaInterna);
  assignArray('tagsExtra', filters?.tagsExtra);
  assignArray('empresaFacturacion', filters?.empresaFacturacion);

  if (filters?.montoMin !== '' && filters?.montoMin != null) params.montoMin = filters.montoMin;
  if (filters?.montoMax !== '' && filters?.montoMax != null) params.montoMax = filters.montoMax;

  const fechaDesde = formatFilterDateParam(filters?.fechaDesde);
  const fechaHasta = formatFilterDateParam(filters?.fechaHasta);
  const fechaCreacionDesde = formatFilterDateParam(filters?.fechaCreacionDesde);
  const fechaCreacionHasta = formatFilterDateParam(filters?.fechaCreacionHasta);
  const fechaPagoDesde = formatFilterDateParam(filters?.fechaPagoDesde);
  const fechaPagoHasta = formatFilterDateParam(filters?.fechaPagoHasta);
  const fechaModificacionDesde = formatFilterDateParam(filters?.fechaModificacionDesde);
  const fechaModificacionHasta = formatFilterDateParam(filters?.fechaModificacionHasta);

  if (fechaDesde) params.fechaDesde = fechaDesde;
  if (fechaHasta) params.fechaHasta = fechaHasta;
  if (fechaCreacionDesde) params.fechaCreacionDesde = fechaCreacionDesde;
  if (fechaCreacionHasta) params.fechaCreacionHasta = fechaCreacionHasta;
  if (fechaPagoDesde) params.fechaPagoDesde = fechaPagoDesde;
  if (fechaPagoHasta) params.fechaPagoHasta = fechaPagoHasta;
  if (fechaModificacionDesde) params.fechaModificacionDesde = fechaModificacionDesde;
  if (fechaModificacionHasta) params.fechaModificacionHasta = fechaModificacionHasta;
  if (filters?.facturaCliente) params.facturaCliente = filters.facturaCliente;
  if (filters?.cajaChica) params.cajaChica = filters.cajaChica;
  if (filters?.aprobacion) params.aprobacion = filters.aprobacion;

  return params;
};

const getMovimientoDisplayEmpresa = (movimiento, empresasMap) => (
  movimiento.empresa_nombre
  || empresasMap[movimiento.empresa_id]?.nombre
  || '-'
);

const getMovimientoDisplayProyecto = (movimiento, proyectosMap) => (
  movimiento.proyecto_nombre
  || movimiento.proyectoNombre
  || proyectosMap[movimiento.proyecto_id]?.nombre
  || '-'
);

const renderFacturaCliente = (value) => {
  if (value === true) return 'Cliente';
  if (value === false) return 'Propia';
  return '-';
};

const renderCajaChica = (value) => {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  return '-';
};

const renderCellValue = (columnKey, movimiento, empresasMap, proyectosMap) => {
  switch (columnKey) {
    case 'empresa':
      return getMovimientoDisplayEmpresa(movimiento, empresasMap);
    case 'proyecto':
      return getMovimientoDisplayProyecto(movimiento, proyectosMap);
    case 'fecha_factura':
    case 'fecha_pago':
    case 'fecha_creacion':
    case 'createdAt':
    case 'updatedAt':
      return formatTimestamp(movimiento[columnKey]) || '-';
    case 'tipo':
      return movimiento.type === 'ingreso' ? 'Ingreso' : movimiento.type === 'egreso' ? 'Egreso' : '-';
    case 'total':
      return formatCurrencyWithCode(movimiento.total || 0, movimiento.moneda || 'ARS');
    case 'monto_aprobado':
      return Number(movimiento.monto_aprobado) > 0
        ? formatCurrencyWithCode(movimiento.monto_aprobado, movimiento.moneda || 'ARS')
        : '-';
    case 'factura_cliente':
      return renderFacturaCliente(movimiento.factura_cliente);
    case 'caja_chica':
      return renderCajaChica(movimiento.caja_chica);
    case 'tags_extra':
      return Array.isArray(movimiento.tags_extra) && movimiento.tags_extra.length > 0
        ? movimiento.tags_extra.join(' · ')
        : '-';
    default:
      return movimiento[columnKey] || '-';
  }
};

const JSON_DIFF_IGNORE_FIELDS = new Set(['id', '_id', '__v', 'logs']);

const normalizeJsonDiffValue = (value) => {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonDiffValue(item));
  }

  if (value && typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }

    const normalized = {};
    Object.keys(value).sort().forEach((key) => {
      if (value[key] !== undefined) {
        normalized[key] = normalizeJsonDiffValue(value[key]);
      }
    });
    return normalized;
  }

  return value;
};

const stringifyJsonDiffValue = (value) => {
  if (value === undefined) return 'Sin valor';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(normalizeJsonDiffValue(value), null, 2);
  } catch {
    return String(value);
  }
};

const areJsonDiffValuesDifferent = (beforeValue, afterValue) => (
  JSON.stringify(normalizeJsonDiffValue(beforeValue)) !== JSON.stringify(normalizeJsonDiffValue(afterValue))
);

const buildMovimientoJsonDiff = (before = {}, after = {}) => {
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  return [...keys]
    .filter((field) => !JSON_DIFF_IGNORE_FIELDS.has(field))
    .filter((field) => areJsonDiffValuesDifferent(before?.[field], after?.[field]))
    .sort((left, right) => left.localeCompare(right))
    .map((field) => ({
      field,
      before: before?.[field],
      after: after?.[field],
      beforeText: stringifyJsonDiffValue(before?.[field]),
      afterText: stringifyJsonDiffValue(after?.[field]),
    }));
};

const COLUMNS = [
  { key: 'codigo_operacion', label: 'Código', sort: 'codigo_operacion', minWidth: 110 },
  { key: 'empresa', label: 'Empresa', minWidth: 220 },
  { key: 'proyecto', label: 'Proyecto', sort: 'proyecto_nombre', minWidth: 220 },
  { key: 'fecha_factura', label: 'Fecha factura', sort: 'fecha_factura', minWidth: 130 },
  { key: 'createdAt', label: 'Creado', sort: 'createdAt', minWidth: 130 },
  { key: 'updatedAt', label: 'Últ. modificación', sort: 'updatedAt', minWidth: 150 },
  { key: 'fecha_pago', label: 'Fecha pago', sort: 'fecha_pago', minWidth: 130 },
  { key: 'tipo', label: 'Tipo', sort: 'type', minWidth: 100 },
  { key: 'moneda', label: 'Moneda', minWidth: 100 },
  { key: 'total', label: 'Total', sort: 'total', minWidth: 140, align: 'right' },
  { key: 'monto_aprobado', label: 'Monto aprobado', sort: 'monto_aprobado', minWidth: 150, align: 'right' },
  { key: 'categoria', label: 'Categoría', sort: 'categoria', minWidth: 180 },
  { key: 'subcategoria', label: 'Subcategoría', sort: 'subcategoria', minWidth: 180 },
  { key: 'nombre_proveedor', label: 'Proveedor', sort: 'proveedor', minWidth: 220 },
  { key: 'medio_pago', label: 'Medio de pago', sort: 'medio_pago', minWidth: 160 },
  { key: 'etapa', label: 'Etapa', minWidth: 150 },
  { key: 'estado', label: 'Estado', sort: 'estado', minWidth: 130 },
  { key: 'cuenta_interna', label: 'Cuenta interna', minWidth: 170 },
  { key: 'caja_chica', label: 'Caja chica', minWidth: 120 },
  { key: 'empresa_facturacion', label: 'Empresa facturación', sort: 'empresa_facturacion', minWidth: 210 },
  { key: 'factura_cliente', label: 'Factura cliente', sort: 'factura_cliente', minWidth: 140 },
  { key: 'nombre_user', label: 'Usuario', sort: 'nombre_user', minWidth: 180 },
  { key: 'observacion', label: 'Observación', sort: 'observacion', minWidth: 240 },
  { key: 'detalle', label: 'Detalle', sort: 'detalle', minWidth: 240 },
  { key: 'tags_extra', label: 'Tags', sort: 'tags_sort', minWidth: 180 },
];

const DEFAULT_VISIBLE_COLUMNS = COLUMNS.reduce((acc, column) => {
  acc[column.key] = !['detalle', 'monto_aprobado'].includes(column.key);
  return acc;
}, {});

const MovimientosGlobalesPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [options, setOptions] = useState({});
  const [movimientos, setMovimientos] = useState([]);
  const [loadingScope, setLoadingScope] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonDialogLoading, setJsonDialogLoading] = useState(false);
  const [jsonDialogSaving, setJsonDialogSaving] = useState(false);
  const [jsonDialogError, setJsonDialogError] = useState(null);
  const [jsonDialogSuccess, setJsonDialogSuccess] = useState(null);
  const [jsonDiffDialogOpen, setJsonDiffDialogOpen] = useState(false);
  const [pendingJsonPayload, setPendingJsonPayload] = useState(null);
  const [pendingJsonChanges, setPendingJsonChanges] = useState([]);
  const [selectedMovimientoJson, setSelectedMovimientoJson] = useState(null);
  const [jsonEditorValue, setJsonEditorValue] = useState('');
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
      const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      return stored ? { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(stored) } : DEFAULT_VISIBLE_COLUMNS;
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  const { filters, setFilters } = useMovimientosFilters({
    empresaId: selectedEmpresa?.id || 'global-admin',
    proyectoId: null,
    movimientos: [],
    movimientosUSD: [],
    cajaSeleccionada: null,
  });

  const empresasOptions = useMemo(
    () => [{ id: '', nombre: 'Todas las empresas' }, ...empresas],
    [empresas]
  );

  const availableProjects = useMemo(() => {
    if (!selectedEmpresa?.id) return proyectos;
    return proyectos.filter((project) => project.empresa_id === selectedEmpresa.id);
  }, [proyectos, selectedEmpresa]);

  const selectedProjectIds = useMemo(
    () => selectedProjects.map((project) => project.id).filter(Boolean),
    [selectedProjects]
  );
  const selectedProjectIdsKey = useMemo(() => selectedProjectIds.join(','), [selectedProjectIds]);

  const empresasMap = useMemo(
    () => Object.fromEntries(empresas.map((empresa) => [empresa.id, empresa])),
    [empresas]
  );
  const proyectosMap = useMemo(
    () => Object.fromEntries(proyectos.map((proyecto) => [proyecto.id, proyecto])),
    [proyectos]
  );
  const visibleColumns = useMemo(
    () => COLUMNS.filter((column) => columnasVisibles[column.key] !== false),
    [columnasVisibles]
  );

  const syncUserNames = useCallback(async (rows) => {
    const idsSinNombre = [...new Set(
      rows
        .filter((movimiento) => movimiento.id_user && !movimiento.nombre_user)
        .map((movimiento) => movimiento.id_user)
    )];

    if (idsSinNombre.length === 0) return rows;

    const profiles = await Promise.all(idsSinNombre.map(async (id) => {
      const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
      const name = profile
        ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || '-')
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
  }, []);

  const fetchScopeData = useCallback(async () => {
    if (!user?.admin) return;
    setLoadingScope(true);
    setError(null);
    try {
      const listaData = await analyticsService.getEmpresasLista();
      if (listaData?.error) {
        throw new Error(listaData.msg || 'No se pudieron cargar las empresas.');
      }

      const empresasCargadas = (listaData?.empresas || []).filter((empresa) => empresa?.id);
      setEmpresas(empresasCargadas);

      const proyectosResults = await Promise.allSettled(
        empresasCargadas.map(async (empresa) => {
          const empresaProyectos = await getProyectosByEmpresaId(empresa.id);
          return empresaProyectos
            .filter((proyecto) => proyecto?.id)
            .map((proyecto) => ({
              ...proyecto,
              empresa_id: proyecto.empresa_id || empresa.id,
              empresa_nombre: empresa.nombre,
            }));
        })
      );

      const proyectosCargados = proyectosResults.flatMap((result) => (
        result.status === 'fulfilled' ? result.value : []
      ));

      setProyectos(proyectosCargados);
    } catch (err) {
      console.error('Error cargando scope global de movimientos:', err);
      setError(err.message || 'No se pudo cargar el alcance de empresas y proyectos.');
    } finally {
      setLoadingScope(false);
    }
  }, [user?.admin]);

  const fetchOptions = useCallback(async () => {
    if (!user?.admin) return;
    setLoadingOptions(true);
    try {
      const params = {};
      if (selectedEmpresa?.id) params.empresaId = selectedEmpresa.id;
      if (selectedProjectIds.length > 0) params.proyectoIds = selectedProjectIds.join(',');
      const response = await movimientosService.getCajasOptions(params);
      setOptions(response?.options || {});
    } catch (err) {
      console.error('Error cargando options de movimientos globales:', err);
      setOptions({});
    } finally {
      setLoadingOptions(false);
    }
  }, [selectedEmpresa?.id, selectedProjectIds, user?.admin]);

  const fetchMovimientos = useCallback(async () => {
    if (!user?.admin) return;
    setLoadingMovimientos(true);
    setError(null);
    try {
      const validationError = validateFreeTextSearch({
        filters,
        empresaId: selectedEmpresa?.id || '',
        proyectoIds: selectedProjectIds,
      });
      if (validationError) {
        setMovimientos([]);
        setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
        setError(validationError);
        return;
      }

      const response = await movimientosService.getCajasDashboard(
        buildDashboardParams({
          filters,
          page,
          limit: rowsPerPage,
          empresaId: selectedEmpresa?.id || '',
          proyectoIds: selectedProjectIds,
        })
      );

      const flatRows = flattenDashboardItems(response?.items || []);
      const hydratedRows = await syncUserNames(flatRows);

      setMovimientos(hydratedRows);
      setPagination(response?.pagination || { page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
    } catch (err) {
      console.error('Error cargando movimientos globales:', err);
      setMovimientos([]);
      setPagination({ page: page + 1, limit: rowsPerPage, total: 0, totalPages: 0, hasNext: false, hasPrev: false });
      setError(err?.response?.data?.error || err.message || 'No se pudieron cargar los movimientos.');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [filters, page, rowsPerPage, selectedEmpresa?.id, selectedProjectIds, syncUserNames, user?.admin]);

  const handleRefresh = useCallback(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  const handleOpenMovimientoJson = useCallback(async (movimientoId) => {
    if (!movimientoId) return;

    setJsonDialogOpen(true);
    setJsonDialogLoading(true);
    setJsonDialogError(null);
    setJsonDialogSuccess(null);
    setSelectedMovimientoJson(null);
    setJsonEditorValue('');

    try {
      const movimiento = await movimientosService.getMovimientoById(movimientoId);
      if (!movimiento) {
        throw new Error('No se pudo cargar el JSON del movimiento.');
      }
      setSelectedMovimientoJson(movimiento);
      setJsonEditorValue(JSON.stringify(movimiento, null, 2));
    } catch (err) {
      console.error('Error cargando JSON del movimiento:', err);
      setJsonDialogError(err.message || 'No se pudo cargar el JSON del movimiento.');
    } finally {
      setJsonDialogLoading(false);
    }
  }, []);

  const handleCopyMovimientoJson = useCallback(async () => {
    if (!jsonEditorValue || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(jsonEditorValue);
    } catch (err) {
      console.error('Error copiando JSON del movimiento:', err);
    }
  }, [jsonEditorValue]);

  const handleFormatMovimientoJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonEditorValue);
      setJsonEditorValue(JSON.stringify(parsed, null, 2));
      setJsonDialogError(null);
    } catch (err) {
      setJsonDialogError(err.message || 'El JSON no es válido.');
    }
  }, [jsonEditorValue]);

  const handlePrepareMovimientoJsonSave = useCallback(() => {
    setJsonDialogError(null);
    setJsonDialogSuccess(null);

    let parsed;
    try {
      parsed = JSON.parse(jsonEditorValue);
    } catch (err) {
      setJsonDialogError(`JSON inválido: ${err.message}`);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setJsonDialogError('El payload debe ser un objeto JSON.');
      return;
    }

    const movimientoId = selectedMovimientoJson?.id || parsed.id;
    if (!movimientoId) {
      setJsonDialogError('No se encontró el id del movimiento a actualizar.');
      return;
    }

    const payload = { ...parsed };
    delete payload.id;
    delete payload._id;
    delete payload.__v;

    const changes = buildMovimientoJsonDiff(selectedMovimientoJson || {}, parsed);
    if (changes.length === 0) {
      setJsonDialogError('No hay cambios para guardar.');
      return;
    }

    setPendingJsonPayload({
      movimientoId,
      payload,
      audit: {
        source: 'movimientos-globales-json-hotfix',
        channel: 'admin-ui',
        note: `Hot fix JSON desde movimientos globales (${changes.length} cambio${changes.length === 1 ? '' : 's'})`,
      },
    });
    setPendingJsonChanges(changes);
    setJsonDiffDialogOpen(true);
  }, [jsonEditorValue, selectedMovimientoJson]);

  const handleSaveMovimientoJson = useCallback(async () => {
    if (!pendingJsonPayload?.movimientoId || !pendingJsonPayload?.payload) return;

    const nombreUsuario = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;

    setJsonDialogSaving(true);
    try {
      const result = await movimientosService.updateMovimiento(
        pendingJsonPayload.movimientoId,
        {
          ...pendingJsonPayload.payload,
          __audit: pendingJsonPayload.audit,
        },
        nombreUsuario
      );
      if (result?.error) {
        throw new Error('No se pudo guardar el JSON del movimiento.');
      }

      const refreshedMovimiento = await movimientosService.getMovimientoById(pendingJsonPayload.movimientoId);
      if (!refreshedMovimiento) {
        throw new Error('El movimiento se guardó, pero no se pudo recargar el JSON actualizado.');
      }

      setSelectedMovimientoJson(refreshedMovimiento);
      setJsonEditorValue(JSON.stringify(refreshedMovimiento, null, 2));
      setJsonDialogSuccess('Hot fix aplicado. Se recargó el JSON persistido.');
      setJsonDiffDialogOpen(false);
      setPendingJsonPayload(null);
      setPendingJsonChanges([]);
      fetchMovimientos();
    } catch (err) {
      console.error('Error guardando JSON del movimiento:', err);
      setJsonDialogError(err.message || 'No se pudo guardar el JSON del movimiento.');
    } finally {
      setJsonDialogSaving(false);
    }
  }, [fetchMovimientos, pendingJsonPayload, user?.email, user?.firstName, user?.lastName]);

  const handleCloseJsonDialog = useCallback(() => {
    if (jsonDialogLoading || jsonDialogSaving) return;
    setJsonDialogOpen(false);
    setJsonDiffDialogOpen(false);
    setJsonDialogError(null);
    setJsonDialogSuccess(null);
    setPendingJsonPayload(null);
    setPendingJsonChanges([]);
    setSelectedMovimientoJson(null);
    setJsonEditorValue('');
  }, [jsonDialogLoading, jsonDialogSaving]);

  useEffect(() => {
    fetchScopeData();
  }, [fetchScopeData]);

  useEffect(() => {
    setSelectedProjects((prev) => prev.filter((project) => availableProjects.some((item) => item.id === project.id)));
  }, [availableProjects]);

  useEffect(() => {
    if (page !== 0) setPage(0);
  }, [filters, selectedEmpresa?.id, selectedProjectIdsKey]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnasVisibles));
    } catch {}
  }, [columnasVisibles]);

  const handleSort = (column) => {
    if (!column.sort) return;
    setFilters((prev) => ({
      ...prev,
      ordenarPor: column.sort,
      ordenarDir: prev.ordenarPor === column.sort && prev.ordenarDir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const scopeLabel = selectedEmpresa?.id
    ? `${selectedEmpresa.nombre}${selectedProjects.length > 0 ? ` · ${selectedProjects.length} proyecto(s)` : ''}`
    : selectedProjects.length > 0
      ? `${selectedProjects.length} proyecto(s) seleccionados`
      : 'Todas las empresas y proyectos';

  if (!user) {
    return (
      <DashboardLayout title="Movimientos globales">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Movimientos globales">
      <Head>
        <title>Movimientos globales</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={800}>Buscador global de movimientos</Typography>
                <Typography variant="body2" color="text.secondary">
                  Vista admin paginada por movimiento, sin cálculo de totales agregados.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={scopeLabel} color="primary" variant="outlined" />
                <Chip label={`${pagination.total || 0} resultado(s)`} variant="outlined" />
                <Button variant="outlined" onClick={() => setColumnDialogOpen(true)}>
                  Columnas
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchMovimientos} disabled={loadingMovimientos}>
                  Actualizar
                </Button>
              </Stack>
            </Stack>

            {!user.admin && (
              <Alert severity="error">Esta pantalla está disponible solo para admins.</Alert>
            )}

            {user.admin && (
              <>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
                      <Autocomplete
                        options={empresasOptions}
                        value={selectedEmpresa || empresasOptions[0]}
                        onChange={(_event, value) => {
                          setSelectedEmpresa(value?.id ? value : null);
                        }}
                        getOptionLabel={(option) => option?.nombre || 'Todas las empresas'}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={loadingScope}
                        renderInput={(params) => (
                          <TextField {...params} label="Empresa" placeholder="Todas las empresas" />
                        )}
                        sx={{ minWidth: 280, maxWidth: 420 }}
                      />

                      <Autocomplete
                        multiple
                        options={availableProjects}
                        value={selectedProjects}
                        onChange={(_event, values) => setSelectedProjects(values)}
                        getOptionLabel={(option) => option?.nombre || 'Proyecto'}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={loadingScope}
                        filterSelectedOptions
                        renderInput={(params) => (
                          <TextField {...params} label="Proyectos" placeholder="Todos los proyectos" />
                        )}
                        sx={{ flex: 1, minWidth: 320 }}
                      />
                    </Stack>

                    <Divider />

                    <FilterBarCajaProyecto
                      filters={filters}
                      setFilters={setFilters}
                      options={options}
                      onRefresh={handleRefresh}
                      empresa={GLOBAL_FILTER_EMPRESA}
                      expanded={filtersExpanded}
                      onToggleExpanded={() => setFiltersExpanded((prev) => !prev)}
                      storageKey="movimientos-globales"
                      empresaId={selectedEmpresa?.id || null}
                      userId={user.user_id || user.uid || null}
                      showCodigoSync
                      searchRequiresSubmit
                      searchMinLength={MIN_FREE_TEXT_LENGTH}
                    />
                  </Stack>
                </Paper>

                {error && <Alert severity="error">{error}</Alert>}

                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  {(loadingMovimientos || loadingOptions) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={28} />
                    </Box>
                  )}

                  <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {visibleColumns.map((column) => {
                            const active = filters.ordenarPor === column.sort;
                            return (
                              <TableCell
                                key={column.key}
                                align={column.align || 'left'}
                                sx={{ minWidth: column.minWidth, fontWeight: 700, whiteSpace: 'nowrap' }}
                              >
                                {column.sort ? (
                                  <TableSortLabel
                                    active={active}
                                    direction={active && filters.ordenarDir === 'asc' ? 'asc' : 'desc'}
                                    onClick={() => handleSort(column)}
                                  >
                                    {column.label}
                                  </TableSortLabel>
                                ) : column.label}
                              </TableCell>
                            );
                          })}
                          <TableCell align="center" sx={{ minWidth: 110, fontWeight: 700 }}>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {movimientos.map((movimiento) => (
                          <TableRow hover key={movimiento.id}>
                            {visibleColumns.map((column) => (
                              <TableCell
                                key={`${movimiento.id}-${column.key}`}
                                align={column.align || 'left'}
                                sx={{ whiteSpace: column.key === 'observacion' || column.key === 'detalle' ? 'normal' : 'nowrap', verticalAlign: 'top' }}
                              >
                                {renderCellValue(column.key, movimiento, empresasMap, proyectosMap)}
                              </TableCell>
                            ))}
                            <TableCell align="center">
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleOpenMovimientoJson(movimiento.id)}
                                >
                                  JSON
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  endIcon={<OpenInNewIcon fontSize="small" />}
                                  onClick={() => {
                                    const proyectoNombre = getMovimientoDisplayProyecto(movimiento, proyectosMap);
                                    router.push({
                                      pathname: '/movementForm',
                                      query: {
                                        movimientoId: movimiento.id,
                                        proyectoId: movimiento.proyecto_id,
                                        proyectoName: proyectoNombre,
                                        lastPageName: 'Buscador global de movimientos',
                                        lastPageUrl: router.asPath,
                                      },
                                    });
                                  }}
                                >
                                  Ver
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}

                        {!loadingMovimientos && movimientos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={visibleColumns.length + 1} align="center" sx={{ py: 5 }}>
                              <Typography variant="body2" color="text.secondary">
                                No hay movimientos para el scope y filtros seleccionados.
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

                <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>Columnas visibles</DialogTitle>
                  <DialogContent dividers>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1 }}>
                      {COLUMNS.map((column) => (
                        <FormControlLabel
                          key={column.key}
                          control={(
                            <Checkbox
                              checked={columnasVisibles[column.key] !== false}
                              onChange={() => {
                                setColumnasVisibles((prev) => ({
                                  ...prev,
                                  [column.key]: prev[column.key] === false,
                                }));
                              }}
                            />
                          )}
                          label={column.label}
                        />
                      ))}
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setColumnasVisibles(DEFAULT_VISIBLE_COLUMNS)}>Restaurar</Button>
                    <Button onClick={() => setColumnDialogOpen(false)}>Cerrar</Button>
                  </DialogActions>
                </Dialog>

                <Dialog
                  open={jsonDialogOpen}
                  onClose={handleCloseJsonDialog}
                  maxWidth="lg"
                  fullWidth
                >
                  <DialogTitle>JSON del movimiento</DialogTitle>
                  <DialogContent dividers>
                    <Stack spacing={2}>
                      <Alert severity="warning">
                        Hot fix admin. Edita solo si sabés qué campos toca el backend, porque algunos valores se recalculan al guardar.
                      </Alert>

                    {jsonDialogLoading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                      </Box>
                    )}

                    {!jsonDialogLoading && jsonDialogError && (
                      <Alert severity="error">{jsonDialogError}</Alert>
                    )}

                    {!jsonDialogLoading && jsonDialogSuccess && (
                      <Alert severity="success">{jsonDialogSuccess}</Alert>
                    )}

                    {!jsonDialogLoading && selectedMovimientoJson && (
                      <TextField
                        value={jsonEditorValue}
                        onChange={(event) => {
                          setJsonEditorValue(event.target.value);
                          if (jsonDialogError) setJsonDialogError(null);
                          if (jsonDialogSuccess) setJsonDialogSuccess(null);
                        }}
                        multiline
                        minRows={20}
                        maxRows={28}
                        fullWidth
                        spellCheck={false}
                        disabled={jsonDialogSaving}
                        sx={{
                          '& .MuiInputBase-input': {
                            fontSize: 13,
                            lineHeight: 1.5,
                            fontFamily: 'Monaco, Menlo, Consolas, monospace',
                          },
                        }}
                      />
                    )}
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleFormatMovimientoJson} disabled={!jsonEditorValue || jsonDialogSaving || jsonDialogLoading}>
                      Formatear
                    </Button>
                    <Button
                      onClick={handleCopyMovimientoJson}
                      startIcon={<ContentCopyIcon />}
                      disabled={!jsonEditorValue || jsonDialogSaving}
                    >
                      Copiar
                    </Button>
                    <Button onClick={handlePrepareMovimientoJsonSave} variant="contained" disabled={!jsonEditorValue || jsonDialogSaving || jsonDialogLoading}>
                      Revisar diff
                    </Button>
                    <Button
                      onClick={handleCloseJsonDialog}
                      disabled={jsonDialogLoading || jsonDialogSaving}
                    >
                      Cerrar
                    </Button>
                  </DialogActions>
                </Dialog>

                <Dialog
                  open={jsonDiffDialogOpen}
                  onClose={() => {
                    if (jsonDialogSaving) return;
                    setJsonDiffDialogOpen(false);
                  }}
                  maxWidth="lg"
                  fullWidth
                >
                  <DialogTitle>Diff previo al hot fix</DialogTitle>
                  <DialogContent dividers>
                    <Stack spacing={2}>
                      <Alert severity="info">
                        Se van a guardar {pendingJsonChanges.length} cambio(s). La auditoría se registrará como hot fix JSON.
                      </Alert>

                      {pendingJsonChanges.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No hay cambios detectados.
                        </Typography>
                      )}

                      {pendingJsonChanges.map((change) => (
                        <Paper key={change.field} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <Stack spacing={1.5}>
                            <Typography variant="subtitle2" fontWeight={700}>{change.field}</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Antes</Typography>
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    p: 1.5,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1.5,
                                    overflow: 'auto',
                                    fontSize: 12,
                                    lineHeight: 1.45,
                                    fontFamily: 'Monaco, Menlo, Consolas, monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {change.beforeText}
                                </Box>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Después</Typography>
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    p: 1.5,
                                    bgcolor: 'success.lighter',
                                    borderRadius: 1.5,
                                    overflow: 'auto',
                                    fontSize: 12,
                                    lineHeight: 1.45,
                                    fontFamily: 'Monaco, Menlo, Consolas, monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {change.afterText}
                                </Box>
                              </Box>
                            </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setJsonDiffDialogOpen(false)} disabled={jsonDialogSaving}>
                      Volver
                    </Button>
                    <Button onClick={handleSaveMovimientoJson} variant="contained" disabled={jsonDialogSaving || pendingJsonChanges.length === 0}>
                      {jsonDialogSaving ? 'Guardando...' : 'Confirmar y guardar'}
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </DashboardLayout>
  );
};

export default MovimientosGlobalesPage;