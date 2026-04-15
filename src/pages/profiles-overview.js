import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedIcon from '@mui/icons-material/Verified';
import TuneIcon from '@mui/icons-material/Tune';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import profileService from 'src/services/profileService';
import { getAllEmpresas } from 'src/services/empresaService';

const BOOLEAN_FILTER_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'true', label: 'Sí' },
    { value: 'false', label: 'No' },
  ];

  const MATCH_OPERATOR_OPTIONS = [
    { value: 'contains', label: 'Contiene' },
    { value: 'equals', label: 'Es igual a' },
    { value: 'startsWith', label: 'Empieza con' },
    { value: 'empty', label: 'Vacío' },
    { value: 'notEmpty', label: 'No vacío' },
    { value: 'true', label: 'Es true' },
    { value: 'false', label: 'Es false' },
  ];

  const PROFILE_DEFAULT_FILTERS = {
    search: '',
    empresaId: '',
    confirmed: 'all',
    admin: 'all',
    sdr: 'all',
    conEmpresa: 'all',
    defaultCajaChica: 'all',
    notificacionNotaPedido: 'all',
    empresaEsCliente: 'true',
    empresaAccion: '',
    empresaSuspendida: 'all',
    profileField: '',
    profileOperator: 'contains',
    profileValue: '',
    empresaField: '',
    empresaOperator: 'contains',
    empresaValue: '',
  };

  function normalizeText(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function toDisplayText(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map((item) => toDisplayText(item)).join(', ');
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function toValidDate(value) {
    if (!value) return null;
    const parsedDate = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
  }

  function collectFieldPaths(value, prefix = '', depth = 0, maxDepth = 2, paths = new Set()) {
    if (!value || depth > maxDepth) return paths;

    Object.entries(value).forEach(([key, nestedValue]) => {
      if (key.startsWith('_') && key !== '_id') return;

      const path = prefix ? `${prefix}.${key}` : key;
      paths.add(path);

      if (isPlainObject(nestedValue) && depth < maxDepth) {
        collectFieldPaths(nestedValue, path, depth + 1, maxDepth, paths);
      }
    });

    return paths;
  }

  function getValueByPath(source, path) {
    if (!source || !path) return undefined;

    return path.split('.').reduce((accumulator, key) => {
      if (accumulator == null) return undefined;
      return accumulator[key];
    }, source);
  }

  function matchesTriState(value, filterValue) {
    if (filterValue === 'all') return true;
    return Boolean(value).toString() === filterValue;
  }

  function matchesDateRange(value, from, to) {
    if (!from && !to) return true;

    const parsedDate = toValidDate(value);
    if (!parsedDate) return false;

    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      if (parsedDate < fromDate) return false;
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      if (parsedDate > toDate) return false;
    }

    return true;
  }

  function matchesFieldFilter(source, field, operator, expectedValue) {
    if (!field) return true;

    const value = getValueByPath(source, field);
    const normalizedValue = normalizeText(toDisplayText(value));
    const normalizedExpected = normalizeText(expectedValue);

    if (operator === 'empty') {
      return value == null || normalizedValue === '' || (Array.isArray(value) && value.length === 0);
    }

    if (operator === 'notEmpty') {
      return !(value == null || normalizedValue === '' || (Array.isArray(value) && value.length === 0));
    }

    if (operator === 'true') return Boolean(value) === true;
    if (operator === 'false') return Boolean(value) === false;
    if (!normalizedExpected) return true;
    if (operator === 'equals') return normalizedValue === normalizedExpected;
    if (operator === 'startsWith') return normalizedValue.startsWith(normalizedExpected);

    return normalizedValue.includes(normalizedExpected);
  }

  function hasConfiguredItems(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (isPlainObject(value)) return Object.keys(value).length > 0;
    return Boolean(value);
  }

  function getActionLabels(value) {
    if (!value) return [];

    const extractedLabels = [];

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (!item) return;
        if (typeof item === 'string' || typeof item === 'number') {
          extractedLabels.push(String(item));
          return;
        }

        if (isPlainObject(item)) {
          const candidate = item.label || item.nombre || item.name || item.tipo || item.key || item.id;
          if (candidate) {
            extractedLabels.push(String(candidate));
          }
        }
      });
    } else if (isPlainObject(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        if (!nestedValue) return;
        if (typeof nestedValue === 'string') {
          extractedLabels.push(nestedValue);
          return;
        }

        extractedLabels.push(key);
      });
    } else {
      extractedLabels.push(String(value));
    }

    return Array.from(new Set(extractedLabels.map((label) => label.trim()).filter(Boolean)));
  }

  function formatDateTime(value) {
    const parsedDate = toValidDate(value);
    if (!parsedDate) return '—';

    return parsedDate.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatListPreview(value) {
    if (Array.isArray(value) && value.length) return value.join(', ');
    return '—';
  }

  function escapeCsvValue(value) {
    const normalizedValue = String(value ?? '');
    if (!/[",\n]/.test(normalizedValue)) return normalizedValue;
    return `"${normalizedValue.replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, rows) {
    const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function compareValues(left, right, direction) {
    if (left == null && right == null) return 0;
    if (left == null) return direction === 'asc' ? -1 : 1;
    if (right == null) return direction === 'asc' ? 1 : -1;

    if (typeof left === 'boolean' || typeof right === 'boolean') {
      return direction === 'asc'
        ? Number(Boolean(left)) - Number(Boolean(right))
        : Number(Boolean(right)) - Number(Boolean(left));
    }

    const leftDate = toValidDate(left);
    const rightDate = toValidDate(right);
    if (leftDate && rightDate) {
      return direction === 'asc' ? leftDate - rightDate : rightDate - leftDate;
    }

    const leftText = normalizeText(left);
    const rightText = normalizeText(right);
    if (leftText < rightText) return direction === 'asc' ? -1 : 1;
    if (leftText > rightText) return direction === 'asc' ? 1 : -1;
    return 0;
  }

  function getRowStatusSx(row) {
    const isClient = Boolean(row?.empresa?.esCliente);
    const isSuspended = Boolean(row?.empresa?.cuenta_suspendida);

    if (isClient && !isSuspended) {
      return {
        backgroundColor: 'rgba(46, 125, 50, 0.06)',
        '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.1)' },
      };
    }

    if (isClient && isSuspended) {
      return {
        backgroundColor: 'rgba(211, 47, 47, 0.06)',
        '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
      };
    }

    return {
      backgroundColor: 'rgba(25, 118, 210, 0.05)',
      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.09)' },
    };
  }

  const StatCard = React.memo(function StatCard({ title, value, subtitle, icon }) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">{title}</Typography>
              <Typography variant="h4" fontWeight="bold">{value}</Typography>
              {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
            </Box>
            <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          </Stack>
        </CardContent>
      </Card>
    );
  });

  StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subtitle: PropTypes.string,
    icon: PropTypes.node.isRequired,
  };

  StatCard.defaultProps = {
    subtitle: '',
  };

  function ProfilesOverviewPage() {
    const [rows, setRows] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copyMessage, setCopyMessage] = useState(null);
    const [filters, setFilters] = useState(PROFILE_DEFAULT_FILTERS);
    const [profileCreatedFrom, setProfileCreatedFrom] = useState(null);
    const [profileCreatedTo, setProfileCreatedTo] = useState(null);
    const [empresaCreatedFrom, setEmpresaCreatedFrom] = useState(null);
    const [empresaCreatedTo, setEmpresaCreatedTo] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const loadData = useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const [profilesData, empresasData] = await Promise.all([
          profileService.getProfiles(),
          getAllEmpresas(),
        ]);

        const empresasMap = new Map((empresasData || []).map((empresa) => [String(empresa._id || empresa.id), empresa]));
        const mergedRows = (profilesData || []).map((profile) => {
          const empresa = empresasMap.get(String(profile.empresa_id)) || null;
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();

          return {
            ...profile,
            id: String(profile.id || profile._id),
            fullName,
            empresa,
            empresaNombre: empresa?.nombre || 'Sin empresa',
            profileActionLabels: getActionLabels(profile?.acciones),
            empresaActionLabels: getActionLabels(empresa?.acciones),
            empresaTieneAcciones: hasConfiguredItems(empresa?.acciones),
            searchBlob: normalizeText(JSON.stringify({ ...profile, empresa, fullName })),
          };
        });

        const sortedEmpresas = (empresasData || []).slice().sort((left, right) => (left.nombre || '').localeCompare(right.nombre || ''));
        setRows(mergedRows);
        setEmpresas(sortedEmpresas);
        setSelectedEmpresa((currentSelectedEmpresa) => {
          if (!currentSelectedEmpresa) return null;
          return sortedEmpresas.find((empresa) => String(empresa._id || empresa.id) === String(currentSelectedEmpresa._id || currentSelectedEmpresa.id)) || null;
        });
      } catch (loadError) {
        console.error('Error al cargar perfiles globales:', loadError);
        setError('No se pudieron cargar los perfiles globales');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadData();
    }, [loadData]);

    const profileFieldOptions = useMemo(() => {
      const paths = new Set();
      rows.forEach((row) => collectFieldPaths(row, '', 0, 2, paths));
      return Array.from(paths).filter((path) => !path.startsWith('empresa.') && path !== 'searchBlob').sort((left, right) => left.localeCompare(right));
    }, [rows]);

    const empresaFieldOptions = useMemo(() => {
      const paths = new Set();
      rows.forEach((row) => collectFieldPaths(row.empresa || {}, '', 0, 2, paths));
      return Array.from(paths).sort((left, right) => left.localeCompare(right));
    }, [rows]);

    const empresaActionOptions = useMemo(() => {
      const actionSet = new Set();
      rows.forEach((row) => {
        row.empresaActionLabels.forEach((actionLabel) => actionSet.add(actionLabel));
      });
      return Array.from(actionSet).sort((left, right) => left.localeCompare(right));
    }, [rows]);

    const filteredRows = useMemo(() => rows.filter((row) => {
      if (filters.search && !row.searchBlob.includes(normalizeText(filters.search))) return false;
      if (filters.empresaId && String(row.empresa_id || '') !== String(filters.empresaId)) return false;
      if (!matchesTriState(row.confirmed, filters.confirmed)) return false;
      if (!matchesTriState(row.admin, filters.admin)) return false;
      if (!matchesTriState(row.sdr, filters.sdr)) return false;
      if (!matchesTriState(Boolean(row.empresa_id), filters.conEmpresa)) return false;
      if (!matchesTriState(row.default_caja_chica, filters.defaultCajaChica)) return false;
      if (!matchesTriState(row.notificacion_nota_pedido, filters.notificacionNotaPedido)) return false;
      if (!matchesTriState(row.empresa?.esCliente, filters.empresaEsCliente)) return false;
      if (filters.empresaAccion && !row.empresaActionLabels.some((actionLabel) => normalizeText(actionLabel) === normalizeText(filters.empresaAccion))) return false;
      if (!matchesTriState(row.empresa?.cuenta_suspendida, filters.empresaSuspendida)) return false;
      if (!matchesDateRange(row.created_at, profileCreatedFrom, profileCreatedTo)) return false;
      if (!matchesDateRange(row.empresa?.createdAt, empresaCreatedFrom, empresaCreatedTo)) return false;
      if (!matchesFieldFilter(row, filters.profileField, filters.profileOperator, filters.profileValue)) return false;
      if (!matchesFieldFilter(row.empresa, filters.empresaField, filters.empresaOperator, filters.empresaValue)) return false;
      return true;
    }), [rows, filters, profileCreatedFrom, profileCreatedTo, empresaCreatedFrom, empresaCreatedTo]);

    const sortedRows = useMemo(() => {
      const rowsToSort = filteredRows.slice();
      const getters = {
        fullName: (row) => row.fullName,
        empresaNombre: (row) => row.empresaNombre,
        confirmed: (row) => row.confirmed,
        created_at: (row) => row.created_at,
      };
      const getter = getters[sortBy] || getters.created_at;
      rowsToSort.sort((left, right) => compareValues(getter(left), getter(right), sortDirection));
      return rowsToSort;
    }, [filteredRows, sortBy, sortDirection]);

    const paginatedRows = useMemo(() => {
      const start = page * rowsPerPage;
      return sortedRows.slice(start, start + rowsPerPage);
    }, [sortedRows, page, rowsPerPage]);

    const selectedRow = useMemo(() => {
      if (!selectedRowId) return null;
      return rows.find((row) => row.id === selectedRowId) || null;
    }, [rows, selectedRowId]);

    const summary = useMemo(() => {
      const empresasVisibles = new Set(filteredRows.map((row) => row.empresa_id).filter(Boolean));
      return {
        totalProfiles: rows.length,
        filteredProfiles: filteredRows.length,
        empresasVisibles: empresasVisibles.size,
        confirmados: filteredRows.filter((row) => row.confirmed).length,
        accionesEmpresaDistintas: new Set(filteredRows.flatMap((row) => row.empresaActionLabels)).size,
      };
    }, [rows, filteredRows]);

    const activeFilterChips = useMemo(() => {
      const triStateLabels = {
        confirmed: 'Confirmado',
        admin: 'Admin',
        sdr: 'SDR',
        conEmpresa: 'Con empresa',
        defaultCajaChica: 'Caja chica',
        notificacionNotaPedido: 'Notif. nota pedido',
        empresaEsCliente: 'Empresa cliente',
        empresaSuspendida: 'Emp. suspendida',
      };

      const chips = [];
      if (filters.search) chips.push({ key: 'search', label: `Búsqueda: ${filters.search}` });
      if (selectedEmpresa) chips.push({ key: 'empresaId', label: `Empresa: ${selectedEmpresa.nombre}` });

      Object.entries(triStateLabels).forEach(([key, label]) => {
        if (filters[key] !== 'all') chips.push({ key, label: `${label}: ${filters[key] === 'true' ? 'Sí' : 'No'}` });
      });

      if (filters.profileField) chips.push({ key: 'profileField', label: `Campo profile: ${filters.profileField}` });
      if (filters.profileValue) chips.push({ key: 'profileValue', label: `Valor profile: ${filters.profileValue}` });
      if (filters.empresaAccion) chips.push({ key: 'empresaAccion', label: `Acción empresa: ${filters.empresaAccion}` });
      if (filters.empresaField) chips.push({ key: 'empresaField', label: `Campo empresa: ${filters.empresaField}` });
      if (filters.empresaValue) chips.push({ key: 'empresaValue', label: `Valor empresa: ${filters.empresaValue}` });
      if (profileCreatedFrom) chips.push({ key: 'profileCreatedFrom', label: `Perfil desde: ${formatDateTime(profileCreatedFrom)}` });
      if (profileCreatedTo) chips.push({ key: 'profileCreatedTo', label: `Perfil hasta: ${formatDateTime(profileCreatedTo)}` });
      if (empresaCreatedFrom) chips.push({ key: 'empresaCreatedFrom', label: `Empresa desde: ${formatDateTime(empresaCreatedFrom)}` });
      if (empresaCreatedTo) chips.push({ key: 'empresaCreatedTo', label: `Empresa hasta: ${formatDateTime(empresaCreatedTo)}` });
      return chips;
    }, [filters, selectedEmpresa, profileCreatedFrom, profileCreatedTo, empresaCreatedFrom, empresaCreatedTo]);

    useEffect(() => {
      setPage(0);
    }, [filters, profileCreatedFrom, profileCreatedTo, empresaCreatedFrom, empresaCreatedTo, sortBy, sortDirection]);

    const handleFilterChange = useCallback((event) => {
      const { name, value } = event.target;
      setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
    }, []);

    const handleEmpresaChange = useCallback((_event, value) => {
      const empresaId = value ? String(value._id || value.id) : '';
      setSelectedEmpresa(value || null);
      setFilters((currentFilters) => ({ ...currentFilters, empresaId }));
    }, []);

    const handleProfileFieldChange = useCallback((_event, value) => {
      setFilters((currentFilters) => ({ ...currentFilters, profileField: value || '' }));
    }, []);

    const handleEmpresaFieldChange = useCallback((_event, value) => {
      setFilters((currentFilters) => ({ ...currentFilters, empresaField: value || '' }));
    }, []);

    const handleResetFilters = useCallback(() => {
      setFilters(PROFILE_DEFAULT_FILTERS);
      setSelectedEmpresa(null);
      setProfileCreatedFrom(null);
      setProfileCreatedTo(null);
      setEmpresaCreatedFrom(null);
      setEmpresaCreatedTo(null);
    }, []);

    const handleRemoveFilterChip = useCallback((key) => {
      if (key === 'empresaId') {
        setSelectedEmpresa(null);
        setFilters((currentFilters) => ({ ...currentFilters, empresaId: '' }));
        return;
      }
      if (key === 'profileCreatedFrom') return setProfileCreatedFrom(null);
      if (key === 'profileCreatedTo') return setProfileCreatedTo(null);
      if (key === 'empresaCreatedFrom') return setEmpresaCreatedFrom(null);
      if (key === 'empresaCreatedTo') return setEmpresaCreatedTo(null);

      const triStateKeys = ['confirmed', 'admin', 'sdr', 'conEmpresa', 'defaultCajaChica', 'notificacionNotaPedido', 'empresaEsCliente', 'empresaSuspendida'];
      setFilters((currentFilters) => ({
        ...currentFilters,
        [key]: triStateKeys.includes(key) ? 'all' : '',
      }));
    }, []);

    const handleRequestSort = useCallback((field) => {
      if (sortBy === field) {
        setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setSortBy(field);
      setSortDirection(field === 'fullName' || field === 'empresaNombre' ? 'asc' : 'desc');
    }, [sortBy]);

    const handleToggleFiltersExpanded = useCallback(() => {
      setFiltersExpanded((currentExpanded) => !currentExpanded);
    }, []);

    const handleToggleQuickFilter = useCallback((key, activeValue) => {
      setFilters((currentFilters) => ({
        ...currentFilters,
        [key]: currentFilters[key] === activeValue ? 'all' : activeValue,
      }));
    }, []);

    const handleProfileCreatedFromChange = useCallback((value) => setProfileCreatedFrom(value), []);
    const handleProfileCreatedToChange = useCallback((value) => setProfileCreatedTo(value), []);
    const handleEmpresaCreatedFromChange = useCallback((value) => setEmpresaCreatedFrom(value), []);
    const handleEmpresaCreatedToChange = useCallback((value) => setEmpresaCreatedTo(value), []);
    const handleChangePage = useCallback((_event, nextPage) => setPage(nextPage), []);
    const handleChangeRowsPerPage = useCallback((event) => {
      setRowsPerPage(Number(event.target.value));
      setPage(0);
    }, []);
    const handleOpenDetail = useCallback((event) => {
      const { rowid } = event.currentTarget.dataset;
      if (rowid) setSelectedRowId(rowid);
    }, []);
    const handleCloseDetail = useCallback(() => setSelectedRowId(null), []);
    const handleClearError = useCallback(() => setError(null), []);
    const handleCloseCopyMessage = useCallback(() => setCopyMessage(null), []);

    const handleExportCsv = useCallback(() => {
      const csvRows = [
        ['Nombre', 'Email', 'Telefono', 'Empresa', 'Empresa cliente', 'Confirmado', 'Admin', 'SDR', 'Creado perfil'],
        ...sortedRows.map((row) => [
          row.fullName || '',
          row.email || '',
          row.phone || '',
          row.empresaNombre || '',
          row.empresa?.esCliente ? 'si' : 'no',
          row.confirmed ? 'si' : 'no',
          row.admin ? 'si' : 'no',
          row.sdr ? 'si' : 'no',
          formatDateTime(row.created_at),
        ]),
      ];
      downloadCsv('perfiles-globales.csv', csvRows);
    }, [sortedRows]);

    const handleCopyValue = useCallback(async (value, label) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(String(value));
        setCopyMessage(`${label} copiado`);
      } catch (copyError) {
        console.error('No se pudo copiar al portapapeles:', copyError);
        setCopyMessage(`No se pudo copiar ${label.toLowerCase()}`);
      }
    }, []);

    const profileJson = useMemo(() => {
      if (!selectedRow) return '';
      const sanitizedRow = { ...selectedRow, empresa: undefined, searchBlob: undefined };
      return JSON.stringify(sanitizedRow, null, 2);
    }, [selectedRow]);

    const empresaJson = useMemo(() => JSON.stringify(selectedRow?.empresa || null, null, 2), [selectedRow]);

    return (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <>
          <Head>
            <title>Perfiles Globales</title>
          </Head>

          <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
            <Container maxWidth="xl">
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">Perfiles Globales</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vista consolidada de todos los perfiles con foco inicial en empresas cliente.
                  </Typography>
                </Box>

                {error ? <Alert severity="error" onClose={handleClearError}>{error}</Alert> : null}
                {copyMessage ? <Alert severity="success" onClose={handleCloseCopyMessage}>{copyMessage}</Alert> : null}

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}><StatCard title="Perfiles cargados" value={summary.totalProfiles} subtitle={`${summary.filteredProfiles} visibles`} icon={<PeopleIcon />} /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Empresas visibles" value={summary.empresasVisibles} subtitle={`${empresas.length} empresas totales`} icon={<BusinessIcon />} /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Perfiles confirmados" value={summary.confirmados} subtitle="Dentro del resultado actual" icon={<VerifiedIcon />} /></Grid>
                  <Grid item xs={12} md={3}><StatCard title="Acciones distintas" value={summary.accionesEmpresaDistintas} subtitle="Tipos de acción en empresas visibles" icon={<TuneIcon />} /></Grid>
                </Grid>

                <Card>
                  <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                      <Box>
                        <Typography variant="h6">Explorador</Typography>
                        <Typography variant="body2" color="text.secondary">Podés combinar búsqueda, quick filters y filtros avanzados.</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button variant="outlined" startIcon={<FilterListIcon />} endIcon={filtersExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />} onClick={handleToggleFiltersExpanded}>Filtros avanzados</Button>
                        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCsv} disabled={!sortedRows.length}>Exportar CSV</Button>
                        <Button variant="outlined" startIcon={<ClearAllIcon />} onClick={handleResetFilters}>Limpiar</Button>
                        <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading}>Recargar</Button>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mb={2}>
                      <Chip label="No confirmados" color={filters.confirmed === 'false' ? 'warning' : 'default'} variant={filters.confirmed === 'false' ? 'filled' : 'outlined'} onClick={() => handleToggleQuickFilter('confirmed', 'false')} />
                      <Chip label="Empresas suspendidas" color={filters.empresaSuspendida === 'true' ? 'warning' : 'default'} variant={filters.empresaSuspendida === 'true' ? 'filled' : 'outlined'} onClick={() => handleToggleQuickFilter('empresaSuspendida', 'true')} />
                      <Chip label="Sin empresa" color={filters.conEmpresa === 'false' ? 'error' : 'default'} variant={filters.conEmpresa === 'false' ? 'filled' : 'outlined'} onClick={() => handleToggleQuickFilter('conEmpresa', 'false')} />
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={5}>
                        <TextField
                          fullWidth
                          label="Búsqueda global"
                          name="search"
                          value={filters.search}
                          onChange={handleFilterChange}
                          placeholder="Nombre, mail, teléfono, empresa, acciones..."
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Autocomplete
                          options={empresas}
                          getOptionLabel={(option) => option?.nombre || ''}
                          value={selectedEmpresa}
                          onChange={handleEmpresaChange}
                          renderInput={(params) => <TextField {...params} label="Empresa" />}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Empresa cliente</InputLabel>
                          <Select label="Empresa cliente" name="empresaEsCliente" value={filters.empresaEsCliente} onChange={handleFilterChange}>
                            {BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    <Collapse in={filtersExpanded}>
                      <Divider sx={{ my: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Confirmado</InputLabel><Select label="Confirmado" name="confirmed" value={filters.confirmed} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Admin</InputLabel><Select label="Admin" name="admin" value={filters.admin} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>SDR</InputLabel><Select label="SDR" name="sdr" value={filters.sdr} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Con empresa</InputLabel><Select label="Con empresa" name="conEmpresa" value={filters.conEmpresa} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Emp. suspendida</InputLabel><Select label="Emp. suspendida" name="empresaSuspendida" value={filters.empresaSuspendida} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={4}><Autocomplete options={empresaActionOptions} value={filters.empresaAccion} onChange={(_event, value) => setFilters((currentFilters) => ({ ...currentFilters, empresaAccion: value || '' }))} renderInput={(params) => <TextField {...params} label="Acción de empresa" placeholder="Filtrar por acción exacta" />} /></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Caja chica default</InputLabel><Select label="Caja chica default" name="defaultCajaChica" value={filters.defaultCajaChica} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Notif. nota pedido</InputLabel><Select label="Notif. nota pedido" name="notificacionNotaPedido" value={filters.notificacionNotaPedido} onChange={handleFilterChange}>{BOOLEAN_FILTER_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={3}><DatePicker label="Perfil creado desde" value={profileCreatedFrom} onChange={handleProfileCreatedFromChange} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} md={3}><DatePicker label="Perfil creado hasta" value={profileCreatedTo} onChange={handleProfileCreatedToChange} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} md={3}><DatePicker label="Empresa creada desde" value={empresaCreatedFrom} onChange={handleEmpresaCreatedFromChange} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                        <Grid item xs={12} md={3}><DatePicker label="Empresa creada hasta" value={empresaCreatedTo} onChange={handleEmpresaCreatedToChange} slotProps={{ textField: { fullWidth: true } }} /></Grid>
                      </Grid>

                      <Divider sx={{ my: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}><Autocomplete freeSolo options={profileFieldOptions} value={filters.profileField} onInputChange={handleProfileFieldChange} renderInput={(params) => <TextField {...params} label="Campo de profile" placeholder="firstName, phone, acciones..." />} /></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Operador</InputLabel><Select label="Operador" name="profileOperator" value={filters.profileOperator} onChange={handleFilterChange}>{MATCH_OPERATOR_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={3}><TextField fullWidth label="Valor de profile" name="profileValue" value={filters.profileValue} onChange={handleFilterChange} placeholder="Texto o valor esperado" /></Grid>
                        <Grid item xs={12} md={4}><Autocomplete freeSolo options={empresaFieldOptions} value={filters.empresaField} onInputChange={handleEmpresaFieldChange} renderInput={(params) => <TextField {...params} label="Campo de empresa" placeholder="nombre, acciones, tipo, razon_social..." />} /></Grid>
                        <Grid item xs={12} md={2}><FormControl fullWidth><InputLabel>Operador</InputLabel><Select label="Operador" name="empresaOperator" value={filters.empresaOperator} onChange={handleFilterChange}>{MATCH_OPERATOR_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid item xs={12} md={3}><TextField fullWidth label="Valor de empresa" name="empresaValue" value={filters.empresaValue} onChange={handleFilterChange} placeholder="Texto o valor esperado" /></Grid>
                      </Grid>
                    </Collapse>

                    {activeFilterChips.length ? (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={2}>
                        {activeFilterChips.map((chip) => <Chip key={chip.key} label={chip.label} onDelete={() => handleRemoveFilterChip(chip.key)} />)}
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent sx={{ pb: 0 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} mb={2}>
                      <Typography variant="h6">Resultados</Typography>
                      <Chip color="primary" label={`${sortedRows.length} perfiles`} />
                    </Stack>
                  </CardContent>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : !sortedRows.length ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>No hay perfiles para los filtros actuales</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Probá limpiar filtros o desactivar Empresa cliente.</Typography>
                      <Button variant="outlined" onClick={handleResetFilters}>Limpiar filtros</Button>
                    </Box>
                  ) : (
                    <>
                      <TableContainer sx={{ maxHeight: 720 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><TableSortLabel active={sortBy === 'fullName'} direction={sortBy === 'fullName' ? sortDirection : 'asc'} onClick={() => handleRequestSort('fullName')}>Perfil</TableSortLabel></TableCell>
                              <TableCell><TableSortLabel active={sortBy === 'empresaNombre'} direction={sortBy === 'empresaNombre' ? sortDirection : 'asc'} onClick={() => handleRequestSort('empresaNombre')}>Empresa</TableSortLabel></TableCell>
                              <TableCell><TableSortLabel active={sortBy === 'confirmed'} direction={sortBy === 'confirmed' ? sortDirection : 'desc'} onClick={() => handleRequestSort('confirmed')}>Flags perfil</TableSortLabel></TableCell>
                              <TableCell>Config profile</TableCell>
                              <TableCell><TableSortLabel active={sortBy === 'created_at'} direction={sortBy === 'created_at' ? sortDirection : 'desc'} onClick={() => handleRequestSort('created_at')}>Fechas</TableSortLabel></TableCell>
                              <TableCell align="right">Detalle</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedRows.map((row) => (
                              <TableRow key={row.id} hover sx={getRowStatusSx(row)}>
                                <TableCell sx={{ minWidth: 240 }}>
                                  <Typography variant="subtitle2">{row.fullName || 'Sin nombre'}</Typography>
                                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                    <Typography variant="caption" color="text.secondary">{row.email || 'Sin email'}</Typography>
                                    {row.email ? <Tooltip title="Copiar email"><IconButton size="small" onClick={() => handleCopyValue(row.email, 'Email')}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip> : null}
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                    <Typography variant="caption" color="text.secondary">{row.phone || 'Sin teléfono'}</Typography>
                                    {row.phone ? <Tooltip title="Copiar teléfono"><IconButton size="small" onClick={() => handleCopyValue(row.phone, 'Teléfono')}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip> : null}
                                  </Stack>
                                  <Typography variant="caption" display="block" color="text.secondary">user_id: {row.user_id || '—'}</Typography>
                                </TableCell>
                                <TableCell sx={{ minWidth: 260, '& .hover-actions': { opacity: 0, maxHeight: 0, overflow: 'hidden', transition: 'opacity 0.15s ease, max-height 0.15s ease, margin 0.15s ease' }, '&:hover .hover-actions': { opacity: 1, maxHeight: 80, mt: 0.5 } }}>
                                  <Typography variant="subtitle2">{row.empresaNombre}</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">ID: {row.empresa_id || '—'}</Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">Razón social: {row.empresa?.razon_social || '—'}</Typography>
                                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                                    <Chip label={row.empresa?.esCliente ? 'Cliente' : 'No cliente'} size="small" color={row.empresa?.esCliente ? 'success' : 'info'} variant={row.empresa?.esCliente ? 'filled' : 'outlined'} />
                                    <Chip label={row.empresa?.cuenta_suspendida ? 'Suspendida' : 'Activa'} size="small" color={row.empresa?.cuenta_suspendida ? 'warning' : 'default'} variant={row.empresa?.cuenta_suspendida ? 'filled' : 'outlined'} />
                                  </Stack>
                                  <Typography className="hover-actions" variant="caption" display="block" color="text.secondary">Acciones empresa: {formatListPreview(row.empresaActionLabels)}</Typography>
                                  {row.empresa_id ? <Button size="small" href={`/empresa/?empresaId=${row.empresa_id}`} sx={{ px: 0, mt: 0.5 }}>Abrir empresa</Button> : null}
                                </TableCell>
                                <TableCell sx={{ minWidth: 220 }}>
                                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                    <Chip label={row.confirmed ? 'Confirmado' : 'No confirmado'} size="small" color={row.confirmed ? 'success' : 'default'} variant={row.confirmed ? 'filled' : 'outlined'} />
                                    <Chip label={row.admin ? 'Admin' : 'No admin'} size="small" color={row.admin ? 'primary' : 'default'} variant={row.admin ? 'filled' : 'outlined'} />
                                    <Chip label={row.sdr ? 'SDR' : 'No SDR'} size="small" color={row.sdr ? 'secondary' : 'default'} variant={row.sdr ? 'filled' : 'outlined'} />
                                  </Stack>
                                </TableCell>
                                <TableCell sx={{ minWidth: 260, '& .hover-actions': { opacity: 0, maxHeight: 0, overflow: 'hidden', transition: 'opacity 0.15s ease, max-height 0.15s ease, margin 0.15s ease' }, '&:hover .hover-actions': { opacity: 1, maxHeight: 60, mt: 0.5 } }}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption">Validación remito: {row.tipo_validacion_remito || '—'}</Typography>
                                    <Typography variant="caption">Modo carga bot: {row.modo_estado_carga_bot || '—'}</Typography>
                                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                      <Chip label={row.default_caja_chica ? 'Caja chica ON' : 'Caja chica OFF'} size="small" color={row.default_caja_chica ? 'success' : 'default'} variant={row.default_caja_chica ? 'filled' : 'outlined'} />
                                      <Chip label={row.notificacion_nota_pedido ? 'Notif. NP ON' : 'Notif. NP OFF'} size="small" color={row.notificacion_nota_pedido ? 'warning' : 'default'} variant={row.notificacion_nota_pedido ? 'filled' : 'outlined'} />
                                    </Stack>
                                    <Typography className="hover-actions" variant="caption" color="text.secondary">Acciones: {formatListPreview(row.profileActionLabels)}</Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell sx={{ minWidth: 220 }}>
                                  <Typography variant="caption" display="block">Perfil: {formatDateTime(row.created_at)}</Typography>
                                  <Typography variant="caption" display="block">Empresa: {formatDateTime(row.empresa?.createdAt)}</Typography>
                                  <Typography variant="caption" display="block">Última interacción: {formatDateTime(row.last_interaction_timestamp)}</Typography>
                                </TableCell>
                                <TableCell align="right"><Button size="small" data-rowid={row.id} onClick={handleOpenDetail}>Ver detalle</Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <TablePagination component="div" count={sortedRows.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Filas por página" />
                    </>
                  )}
                </Card>
              </Stack>
            </Container>
          </Box>

          <Drawer anchor="right" open={Boolean(selectedRow)} onClose={handleCloseDetail} PaperProps={{ sx: { width: { xs: '100%', md: 640 } } }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">Detalle del perfil</Typography>
                  <Typography variant="body2" color="text.secondary">Inspección completa del profile y su empresa.</Typography>
                </Box>
                <IconButton onClick={handleCloseDetail}><CloseIcon /></IconButton>
              </Stack>

              {selectedRow ? (
                <Stack spacing={2}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">Resumen</Typography>
                      <Typography variant="body2">Nombre: {selectedRow.fullName || 'Sin nombre'}</Typography>
                      <Typography variant="body2">Email: {selectedRow.email || 'Sin email'}</Typography>
                      <Typography variant="body2">Teléfono: {selectedRow.phone || 'Sin teléfono'}</Typography>
                      <Typography variant="body2">Empresa: {selectedRow.empresaNombre}</Typography>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Profile</Typography>
                      <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflowX: 'auto', fontSize: 12 }}>{profileJson}</Box>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Empresa</Typography>
                      <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflowX: 'auto', fontSize: 12 }}>{empresaJson}</Box>
                    </CardContent>
                  </Card>
                </Stack>
              ) : null}
            </Box>
          </Drawer>
        </>
      </LocalizationProvider>
    );
  }

  ProfilesOverviewPage.getLayout = function getLayout(page) {
    return <DashboardLayout>{page}</DashboardLayout>;
  };

  export default ProfilesOverviewPage;