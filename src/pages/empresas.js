import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
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
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import BusinessIcon from '@mui/icons-material/Business';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Head from 'next/head';
import Link from 'next/link';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { getAllEmpresas, deleteEmpresa, getInfoToDeleteEmpresa } from 'src/services/empresaService';
import { getProyectosByEmpresaId } from 'src/services/proyectosService';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

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

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getActionLabels(value) {
  if (!value) return [];

  const labels = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string' || typeof item === 'number') {
        labels.push(String(item));
        return;
      }

      if (isPlainObject(item)) {
        const candidate = item.label || item.nombre || item.name || item.tipo || item.key || item.id;
        if (candidate) labels.push(String(candidate));
      }
    });
  } else if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (!nestedValue) return;
      if (typeof nestedValue === 'string') {
        labels.push(nestedValue);
        return;
      }
      labels.push(key);
    });
  } else {
    labels.push(String(value));
  }

  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean)));
}

function matchesTriState(value, filterValue) {
  if (filterValue === 'all') return true;
  return Boolean(value).toString() === filterValue;
}

function toValidDate(value) {
  if (!value) return null;
  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

function compareValues(left, right, direction) {
  if (left == null && right == null) return 0;
  if (left == null) return direction === 'asc' ? -1 : 1;
  if (right == null) return direction === 'asc' ? 1 : -1;
  if (typeof left === 'number' && typeof right === 'number') {
    return direction === 'asc' ? left - right : right - left;
  }
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);
  if (leftText < rightText) return direction === 'asc' ? -1 : 1;
  if (leftText > rightText) return direction === 'asc' ? 1 : -1;
  return 0;
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

function EmpresasListPage() {
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);
  const [infoToDelete, setInfoToDelete] = useState(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [soloClientes, setSoloClientes] = useState(true);
  const [filters, setFilters] = useState({
    nombre: '',
    proyectoNombre: '',
    razonSocial: '',
    cuit: '',
    accion: '',
    proyectos: '',
    suspendida: 'all',
  });
  const [createdFrom, setCreatedFrom] = useState(null);
  const [createdTo, setCreatedTo] = useState(null);
  const [activationFrom, setActivationFrom] = useState(null);
  const [activationTo, setActivationTo] = useState(null);
  const [suspensionFrom, setSuspensionFrom] = useState(null);
  const [suspensionTo, setSuspensionTo] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const loadEmpresas = useCallback(async () => {
    try {
      setIsLoading(true);
      const empresasList = await getAllEmpresas();
      const enrichedEmpresas = await Promise.all((empresasList || []).map(async (empresa) => {
        const empresaId = String(empresa.id || empresa._id || '');
        const proyectoIds = Array.isArray(empresa?.proyectosIds) ? empresa.proyectosIds : [];
        const proyectosData = empresaId && proyectoIds.length ? await getProyectosByEmpresaId(empresaId) : [];
        const projectNames = proyectosData.map((proyecto) => proyecto?.nombre).filter(Boolean);
        const actionLabels = getActionLabels(empresa?.acciones);

        return {
          ...empresa,
          id: empresaId,
          projectNames,
          projectSearchBlob: normalizeText(projectNames.join(' ')),
          accionesLabels: actionLabels,
        };
      }));

      setEmpresas(enrichedEmpresas);
      setSelectedEmpresas((currentSelected) => currentSelected.filter((id) => enrichedEmpresas.some((empresa) => empresa.id === id)));
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setAlert({ open: true, message: 'Error al cargar las empresas.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  const actionOptions = useMemo(() => {
    const actionsSet = new Set();
    empresas.forEach((empresa) => {
      empresa?.accionesLabels?.forEach((label) => actionsSet.add(label));
    });
    return Array.from(actionsSet).sort((left, right) => left.localeCompare(right));
  }, [empresas]);

  const filteredEmpresas = useMemo(() => empresas.filter((empresa) => {
    const matchesNombre = normalizeText(empresa?.nombre).includes(normalizeText(filters.nombre));
    const matchesProyectoNombre = !filters.proyectoNombre || empresa?.projectSearchBlob?.includes(normalizeText(filters.proyectoNombre));
    const matchesRazonSocial = normalizeText(empresa?.razon_social).includes(normalizeText(filters.razonSocial));
    const matchesCuit = normalizeText(empresa?.cuit).includes(normalizeText(filters.cuit));
    const matchesAccion = !filters.accion || empresa?.accionesLabels?.some((label) => normalizeText(label) === normalizeText(filters.accion));
    const proyectosCount = empresa?.proyectosIds?.length || 0;
    const matchesProyectos = filters.proyectos ? proyectosCount === parseInt(filters.proyectos, 10) : true;
    const matchesCliente = soloClientes ? empresa?.esCliente === true : true;
    const matchesSuspendida = matchesTriState(empresa?.cuenta_suspendida, filters.suspendida);
    const matchesCreatedAt = matchesDateRange(empresa?.createdAt, createdFrom, createdTo);
    const matchesActivationDate = matchesDateRange(empresa?.fechaRegistroCliente, activationFrom, activationTo);
    const matchesSuspensionDate = matchesDateRange(empresa?.fechaBaja, suspensionFrom, suspensionTo);
    return matchesNombre && matchesProyectoNombre && matchesRazonSocial && matchesCuit && matchesAccion && matchesProyectos && matchesCliente && matchesSuspendida && matchesCreatedAt && matchesActivationDate && matchesSuspensionDate;
  }), [empresas, filters, soloClientes, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  const sortedEmpresas = useMemo(() => {
    const rows = filteredEmpresas.slice();
    const getters = {
      nombre: (empresa) => empresa?.nombre,
      razonSocial: (empresa) => empresa?.razon_social,
      proyectos: (empresa) => empresa?.proyectosIds?.length || 0,
      esCliente: (empresa) => (empresa?.esCliente ? 1 : 0),
      suspendida: (empresa) => (empresa?.cuenta_suspendida ? 1 : 0),
    };
    const getter = getters[sortBy] || getters.nombre;
    rows.sort((left, right) => compareValues(getter(left), getter(right), sortDirection));
    return rows;
  }, [filteredEmpresas, sortBy, sortDirection]);

  const paginatedEmpresas = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedEmpresas.slice(start, start + rowsPerPage);
  }, [sortedEmpresas, page, rowsPerPage]);

  const currentPageIds = useMemo(() => paginatedEmpresas.map((empresa) => empresa.id), [paginatedEmpresas]);

  const summary = useMemo(() => ({
    total: empresas.length,
    visibles: filteredEmpresas.length,
    clientesVisibles: filteredEmpresas.filter((empresa) => empresa?.esCliente).length,
    proyectosVisibles: filteredEmpresas.reduce((accumulator, empresa) => accumulator + (empresa?.proyectosIds?.length || 0), 0),
    seleccionadas: selectedEmpresas.length,
  }), [empresas.length, filteredEmpresas, selectedEmpresas.length]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (soloClientes) chips.push({ key: 'soloClientes', label: 'Solo clientes' });
    if (filters.nombre) chips.push({ key: 'nombre', label: `Nombre: ${filters.nombre}` });
    if (filters.proyectoNombre) chips.push({ key: 'proyectoNombre', label: `Proyecto: ${filters.proyectoNombre}` });
    if (filters.razonSocial) chips.push({ key: 'razonSocial', label: `Razón social: ${filters.razonSocial}` });
    if (filters.cuit) chips.push({ key: 'cuit', label: `CUIT: ${filters.cuit}` });
    if (filters.accion) chips.push({ key: 'accion', label: `Acción: ${filters.accion}` });
    if (filters.proyectos) chips.push({ key: 'proyectos', label: `Proyectos: ${filters.proyectos}` });
    if (filters.suspendida !== 'all') chips.push({ key: 'suspendida', label: `Suspendida: ${filters.suspendida === 'true' ? 'Sí' : 'No'}` });
    if (createdFrom) chips.push({ key: 'createdFrom', label: `Creada desde: ${formatDateTime(createdFrom)}` });
    if (createdTo) chips.push({ key: 'createdTo', label: `Creada hasta: ${formatDateTime(createdTo)}` });
    if (activationFrom) chips.push({ key: 'activationFrom', label: `Activada desde: ${formatDateTime(activationFrom)}` });
    if (activationTo) chips.push({ key: 'activationTo', label: `Activada hasta: ${formatDateTime(activationTo)}` });
    if (suspensionFrom) chips.push({ key: 'suspensionFrom', label: `Suspendida desde: ${formatDateTime(suspensionFrom)}` });
    if (suspensionTo) chips.push({ key: 'suspensionTo', label: `Suspendida hasta: ${formatDateTime(suspensionTo)}` });
    return chips;
  }, [filters, soloClientes, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  useEffect(() => {
    setPage(0);
  }, [filters, soloClientes, sortBy, sortDirection, createdFrom, createdTo, activationFrom, activationTo, suspensionFrom, suspensionTo]);

  const handleCloseAlert = useCallback((_event, reason) => {
    if (reason === 'clickaway') return;
    setAlert((currentAlert) => ({ ...currentAlert, open: false }));
  }, []);

  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  }, []);

  const handleToggleSoloClientes = useCallback((event) => {
    setSoloClientes(event.target.checked);
  }, []);

  const handleToggleFiltersExpanded = useCallback(() => {
    setFiltersExpanded((currentExpanded) => !currentExpanded);
  }, []);

  const handleToggleSelection = useCallback((empresaId) => {
    setSelectedEmpresas((currentSelected) => (
      currentSelected.includes(empresaId)
        ? currentSelected.filter((id) => id !== empresaId)
        : [...currentSelected, empresaId]
    ));
  }, []);

  const handleSelectCurrentPage = useCallback((event) => {
    setSelectedEmpresas((currentSelected) => {
      if (event.target.checked) return Array.from(new Set([...currentSelected, ...currentPageIds]));
      return currentSelected.filter((id) => !currentPageIds.includes(id));
    });
  }, [currentPageIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedEmpresas([]);
  }, []);

  const handleOpenConfirmDialog = useCallback(async (ids) => {
    if (!ids.length) return;
    setPendingDeleteIds(ids);
    setConfirmDialogOpen(true);
    setInfoToDelete(null);
    try {
      const info = await Promise.all(ids.map((id) => getInfoToDeleteEmpresa(id)));
      setInfoToDelete(info.filter(Boolean));
    } catch (error) {
      console.error('Error preparando confirmación:', error);
      setInfoToDelete([]);
      setAlert({ open: true, message: 'No se pudo cargar la info de borrado.', severity: 'error' });
    }
  }, []);

  const handleOpenSelectedDelete = useCallback(() => {
    handleOpenConfirmDialog(selectedEmpresas);
  }, [handleOpenConfirmDialog, selectedEmpresas]);

  const handleOpenSingleDelete = useCallback((empresaId) => {
    handleOpenConfirmDialog([empresaId]);
  }, [handleOpenConfirmDialog]);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingDeleteIds([]);
    setInfoToDelete(null);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!pendingDeleteIds.length) return;

    setIsDeleting(true);
    setDeleteProgress('Comenzando a eliminar empresas seleccionadas...');

    try {
      for (let index = 0; index < pendingDeleteIds.length; index += 1) {
        const empresaId = pendingDeleteIds[index];
        setDeleteProgress(`Eliminando empresa ${index + 1} de ${pendingDeleteIds.length}`);
        await deleteEmpresa(empresaId);
        setEmpresas((currentEmpresas) => currentEmpresas.filter((empresa) => empresa.id !== empresaId));
      }

      setSelectedEmpresas((currentSelected) => currentSelected.filter((id) => !pendingDeleteIds.includes(id)));
      setAlert({ open: true, message: 'Empresas eliminadas con éxito.', severity: 'success' });
      handleCloseConfirmDialog();
    } catch (error) {
      console.error('Error eliminando empresas:', error);
      setAlert({ open: true, message: 'Ocurrió un error eliminando empresas.', severity: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteProgress('');
    }
  }, [handleCloseConfirmDialog, pendingDeleteIds]);

  const handleRequestSort = useCallback((field) => {
    if (sortBy === field) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection(field === 'proyectos' ? 'desc' : 'asc');
  }, [sortBy]);

  const handleChangePage = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ nombre: '', proyectoNombre: '', razonSocial: '', cuit: '', accion: '', proyectos: '', suspendida: 'all' });
    setSoloClientes(true);
    setCreatedFrom(null);
    setCreatedTo(null);
    setActivationFrom(null);
    setActivationTo(null);
    setSuspensionFrom(null);
    setSuspensionTo(null);
  }, []);

  const handleRemoveFilterChip = useCallback((key) => {
    if (key === 'soloClientes') {
      setSoloClientes(false);
      return;
    }

    if (key === 'createdFrom') return setCreatedFrom(null);
    if (key === 'createdTo') return setCreatedTo(null);
    if (key === 'activationFrom') return setActivationFrom(null);
    if (key === 'activationTo') return setActivationTo(null);
    if (key === 'suspensionFrom') return setSuspensionFrom(null);
    if (key === 'suspensionTo') return setSuspensionTo(null);

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: '',
    }));
  }, []);

  const handleExportCsv = useCallback(() => {
    const csvRows = [
      ['Nombre', 'Razon social', 'CUIT', 'Cliente', 'Suspendida', 'Cantidad de proyectos', 'Proyectos', 'Acciones'],
      ...sortedEmpresas.map((empresa) => [
        empresa?.nombre || '',
        empresa?.razon_social || '',
        empresa?.cuit || '',
        empresa?.esCliente ? 'si' : 'no',
        empresa?.cuenta_suspendida ? 'si' : 'no',
        empresa?.proyectosIds?.length || 0,
        (empresa?.projectNames || []).join(' | '),
        (empresa?.accionesLabels || []).join(' | '),
      ]),
    ];
    downloadCsv('empresas.csv', csvRows);
  }, [sortedEmpresas]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
    <>
      <Head>
        <title>Listado de Empresas {filteredEmpresas.length}</title>
      </Head>

      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" fontWeight="bold">Empresas</Typography>
              <Typography variant="body2" color="text.secondary">
                La vista arranca filtrando solo clientes para priorizar las empresas relevantes.
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><StatCard title="Empresas cargadas" value={summary.total} subtitle={`${summary.visibles} visibles`} icon={<BusinessIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Clientes visibles" value={summary.clientesVisibles} subtitle="Con filtro actual" icon={<ApartmentIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Proyectos visibles" value={summary.proyectosVisibles} subtitle="Suma de proyectos" icon={<PlaylistAddCheckIcon />} /></Grid>
              <Grid item xs={12} md={3}><StatCard title="Seleccionadas" value={summary.seleccionadas} subtitle="Para acciones masivas" icon={<DeleteIcon />} /></Grid>
            </Grid>

            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} mb={2}>
                  <Box>
                    <Typography variant="h6">Filtros</Typography>
                    <Typography variant="body2" color="text.secondary">Búsqueda rápida y filtros básicos de la lista.</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button variant="outlined" startIcon={<FilterListIcon />} endIcon={filtersExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />} onClick={handleToggleFiltersExpanded}>Más filtros</Button>
                    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCsv} disabled={!sortedEmpresas.length}>Exportar CSV</Button>
                    <Button variant="outlined" startIcon={<ClearAllIcon />} onClick={handleResetFilters}>Limpiar</Button>
                    <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadEmpresas} disabled={isLoading}>Recargar</Button>
                  </Stack>
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField label="Buscar por nombre" variant="outlined" name="nombre" value={filters.nombre} onChange={handleFilterChange} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Buscar por nombre de proyecto" variant="outlined" name="proyectoNombre" value={filters.proyectoNombre} onChange={handleFilterChange} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Switch checked={soloClientes} onChange={handleToggleSoloClientes} color="primary" />} label={soloClientes ? 'Solo clientes' : 'Todas las empresas'} />
                  </Grid>
                </Grid>

                <Collapse in={filtersExpanded}>
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <TextField label="Razón social" variant="outlined" name="razonSocial" value={filters.razonSocial} onChange={handleFilterChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField label="CUIT" variant="outlined" name="cuit" value={filters.cuit} onChange={handleFilterChange} fullWidth />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Autocomplete
                          options={actionOptions}
                          value={filters.accion}
                          onChange={(_event, value) => setFilters((currentFilters) => ({ ...currentFilters, accion: value || '' }))}
                          renderInput={(params) => <TextField {...params} label="Acción" placeholder="Filtrar por acción" />}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                          <InputLabel>Suspendida</InputLabel>
                          <Select label="Suspendida" name="suspendida" value={filters.suspendida} onChange={handleFilterChange}>
                            <MenuItem value="all">Todas</MenuItem>
                            <MenuItem value="true">Sí</MenuItem>
                            <MenuItem value="false">No</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField label="Cantidad exacta de proyectos" variant="outlined" name="proyectos" value={filters.proyectos} onChange={handleFilterChange} type="number" fullWidth />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Creada desde" value={createdFrom} onChange={setCreatedFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Creada hasta" value={createdTo} onChange={setCreatedTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Activada desde" value={activationFrom} onChange={setActivationFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Activada hasta" value={activationTo} onChange={setActivationTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Suspendida desde" value={suspensionFrom} onChange={setSuspensionFrom} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <DatePicker label="Suspendida hasta" value={suspensionTo} onChange={setSuspensionTo} slotProps={{ textField: { fullWidth: true } }} />
                      </Grid>
                    </Grid>
                  </Box>
                </Collapse>

                {activeFilterChips.length ? (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={2}>
                    {activeFilterChips.map((chip) => (
                      <Chip key={chip.key} label={chip.label} onDelete={() => handleRemoveFilterChip(chip.key)} />
                    ))}
                  </Stack>
                ) : null}
              </CardContent>
            </Card>

            {selectedEmpresas.length ? (
              <Alert
                severity="warning"
                sx={{ position: 'sticky', top: 16, zIndex: 2 }}
                action={(
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" size="small" onClick={handleClearSelection}>Limpiar</Button>
                    <Button color="inherit" size="small" variant="outlined" onClick={handleOpenSelectedDelete}>Borrar seleccionadas</Button>
                  </Stack>
                )}
              >
                {selectedEmpresas.length} empresas seleccionadas.
              </Alert>
            ) : null}

            <Card>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : !sortedEmpresas.length ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>No hay empresas para los filtros actuales</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Probá limpiar filtros o desactivar Solo clientes.
                  </Typography>
                  <Button variant="outlined" onClick={handleResetFilters}>Limpiar filtros</Button>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ maxHeight: 720 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={currentPageIds.some((id) => selectedEmpresas.includes(id)) && !currentPageIds.every((id) => selectedEmpresas.includes(id))}
                              checked={currentPageIds.length > 0 && currentPageIds.every((id) => selectedEmpresas.includes(id))}
                              onChange={handleSelectCurrentPage}
                            />
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'nombre'} direction={sortBy === 'nombre' ? sortDirection : 'asc'} onClick={() => handleRequestSort('nombre')}>
                              Nombre
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'razonSocial'} direction={sortBy === 'razonSocial' ? sortDirection : 'asc'} onClick={() => handleRequestSort('razonSocial')}>
                              Razón social
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'proyectos'} direction={sortBy === 'proyectos' ? sortDirection : 'desc'} onClick={() => handleRequestSort('proyectos')}>
                              Cantidad de proyectos
                            </TableSortLabel>
                          </TableCell>
                          <TableCell>
                            <TableSortLabel active={sortBy === 'suspendida'} direction={sortBy === 'suspendida' ? sortDirection : 'asc'} onClick={() => handleRequestSort('suspendida')}>
                              Estado
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedEmpresas.map((empresa) => (
                          <TableRow key={empresa.id} hover selected={selectedEmpresas.includes(empresa.id)}>
                            <TableCell padding="checkbox">
                              <Checkbox checked={selectedEmpresas.includes(empresa.id)} onChange={() => handleToggleSelection(empresa.id)} />
                            </TableCell>
                            <TableCell>
                              <Link href={`/empresa/?empresaId=${empresa.id}`} passHref>
                                <Typography component="a" variant="body1" sx={{ textDecoration: 'underline', color: 'primary.main', fontWeight: 600 }}>
                                  {empresa.nombre}
                                </Typography>
                              </Link>
                              <Typography variant="caption" display="block" color="text.secondary">CUIT: {empresa.cuit || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{empresa.razon_social || '—'}</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">{empresa.tipo || 'Sin tipo'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{empresa.proyectosIds?.length || 0}</Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {(empresa.projectNames || []).slice(0, 2).join(', ') || 'Sin proyectos'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ minWidth: 240, '& .hover-actions': { opacity: 0, maxHeight: 0, overflow: 'hidden', transition: 'opacity 0.15s ease, max-height 0.15s ease, margin 0.15s ease' }, '&:hover .hover-actions': { opacity: 1, maxHeight: 80, mt: 0.5 } }}>
                              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                                <Chip label={empresa.esCliente ? 'Cliente' : 'No cliente'} size="small" color={empresa.esCliente ? 'success' : 'default'} variant={empresa.esCliente ? 'filled' : 'outlined'} />
                                <Chip label={empresa.cuenta_suspendida ? 'Suspendida' : 'Activa'} size="small" color={empresa.cuenta_suspendida ? 'warning' : 'default'} variant={empresa.cuenta_suspendida ? 'filled' : 'outlined'} />
                              </Stack>
                              <Typography className="hover-actions" variant="caption" display="block" color="text.secondary">
                                Acciones: {(empresa.accionesLabels || []).join(', ') || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Borrar esta empresa">
                                  <IconButton color="error" onClick={() => handleOpenSingleDelete(empresa.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    component="div"
                    count={sortedEmpresas.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage="Filas por página"
                  />
                </>
              )}
            </Card>

            {isDeleting ? (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{deleteProgress}</Typography>
                <LinearProgress />
              </Box>
            ) : null}
          </Stack>

          <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
            <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
              {alert.message}
            </Alert>
          </Snackbar>

          <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog} maxWidth="md" fullWidth>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Esta acción eliminará empresas, perfiles y proyectos vinculados. Revisá el impacto antes de continuar.
              </DialogContentText>
              {!infoToDelete ? (
                <CircularProgress />
              ) : (
                <Stack spacing={2}>
                  {infoToDelete.map((info) => (
                    <Card key={info.nombre} variant="outlined">
                      <CardContent>
                        <Typography variant="h6">{info.nombre}</Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1, mb: 1 }}>
                          <Chip label={`${info.profiles?.length || 0} perfiles`} size="small" color="warning" />
                          <Chip label={`${info.proyectos?.length || 0} proyectos`} size="small" color="error" />
                        </Stack>
                        {info.profiles?.length ? (
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">Perfiles</Typography>
                            {info.profiles.slice(0, 5).map((profile) => (
                              <Typography key={`${info.nombre}-${profile.email}-${profile.phone}`} variant="body2" color="text.secondary">
                                {profile.email || 'Sin email'} - {profile.phone || 'Sin teléfono'}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}
                        {info.proyectos?.length ? (
                          <Box>
                            <Typography variant="body2" fontWeight="bold">Proyectos</Typography>
                            {info.proyectos.slice(0, 5).map((proyecto) => (
                              <Typography key={`${info.nombre}-${proyecto.nombre}`} variant="body2" color="text.secondary">
                                {proyecto.nombre} - movimientos: {proyecto.movimientosCount}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
              <Button onClick={handleDeleteConfirmed} color="error" variant="contained" disabled={isDeleting || !pendingDeleteIds.length}>
                Confirmar eliminación
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </>
    </LocalizationProvider>
  );
}

EmpresasListPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EmpresasListPage;
