import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BackButton from 'src/components/shared/BackButton';
import TrabajadorChip from 'src/components/dhn/TrabajadorChip';
import ResolverTrabajadorModal from 'src/components/dhn/ResolverTrabajadorModal';
import FaltaTrabajadorService from 'src/services/dhn/FaltaTrabajadorService';
import cargarUrlDriveService from 'src/services/dhn/cargarUrlDriveService';
import { safeRouterReplace } from 'src/utils/safeRouter';

const DATE_PICKER_SLOT_PROPS = {
  textField: { size: 'small', sx: { width: 180 } },
};

const TITLE = 'Falta trabajador en Fichadas';

const getDefaultRange = () => {
  const today = dayjs();
  return {
    desde: today.startOf('month').format('YYYY-MM-DD'),
    hasta: today.format('YYYY-MM-DD'),
  };
};

const readQS = (raw) => (Array.isArray(raw) ? raw[0] : raw);

const trabajadorKey = (t) => {
  const dni = t?.dni ? String(t.dni).trim() : '';
  if (dni) return `dni:${dni}`;
  const nombre = (t?.nombre || '').toString().trim().toLowerCase();
  const apellido = (t?.apellido || '').toString().trim().toLowerCase();
  return `na:${nombre}|${apellido}`;
};

const formatFechaDetectada = (raw) => {
  if (!raw || typeof raw !== 'string') return '—';
  return raw;
};

const FaltaTrabajadorFichadasPage = () => {
  const router = useRouter();

  const desdeParam = useMemo(() => {
    const raw = readQS(router.query.desde);
    return raw ? String(raw) : null;
  }, [router.query.desde]);

  const hastaParam = useMemo(() => {
    const raw = readQS(router.query.hasta);
    return raw ? String(raw) : null;
  }, [router.query.hasta]);

  useEffect(() => {
    if (!router.isReady) return;
    if (desdeParam && hastaParam) return;
    const def = getDefaultRange();
    safeRouterReplace(
      router,
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          desde: desdeParam || def.desde,
          hasta: hastaParam || def.hasta,
        },
      },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, desdeParam, hastaParam, router]);

  const handleChangeDesde = useCallback(
    (nv) => {
      const v = (nv || dayjs()).format('YYYY-MM-DD');
      const nextQuery = { ...router.query, desde: v };
      delete nextQuery.page;
      safeRouterReplace(router, { pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  const handleChangeHasta = useCallback(
    (nv) => {
      const v = (nv || dayjs()).format('YYYY-MM-DD');
      const nextQuery = { ...router.query, hasta: v };
      delete nextQuery.page;
      safeRouterReplace(router, { pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearchTerm(searchInput), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [resolverState, setResolverState] = useState({ open: false, trabajador: null, urlStorage: null });
  const [resyncing, setResyncing] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    if (!router.isReady || !desdeParam || !hastaParam) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await FaltaTrabajadorService.list({
        fechaDetectadaFrom: desdeParam,
        fechaDetectadaTo: hastaParam,
        search: searchTerm || undefined,
        limit: 200,
        offset: 0,
        sortField: 'created_at',
        sortDirection: 'desc',
      });
      setItems(Array.isArray(result.items) ? result.items : []);
      setStats(result?.stats || null);
      setSelectedIds(new Set());
    } catch (e) {
      setErrorMessage(e?.message || 'Error al cargar la lista');
      setItems([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [router.isReady, desdeParam, hastaParam, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allRowIds = useMemo(() => items.map((r) => String(r._id)), [items]);
  const allSelected = allRowIds.length > 0 && allRowIds.every((id) => selectedIds.has(id));
  const someSelected = allRowIds.some((id) => selectedIds.has(id));

  const handleToggleAll = () => {
    setSelectedIds(() => {
      if (allSelected) return new Set();
      return new Set(allRowIds);
    });
  };

  const archivosPorTrabajador = useCallback(
    (trabajador) => {
      const key = trabajadorKey(trabajador);
      return items
        .filter((row) =>
          (row.trabajadoresNoIdentificadosPendientes || []).some((t) => trabajadorKey(t) === key)
        )
        .map((row) => ({
          _id: row._id,
          file_name: row.file_name,
          fechasDetectadas: row.fechasDetectadas,
          url_storage: row.url_storage,
        }));
    },
    [items]
  );

  const handleOpenResolver = (trabajador, row) => {
    setResolverState({
      open: true,
      trabajador,
      urlStorage: row?.url_storage || null,
      row,
    });
  };

  const handleCloseResolver = () => {
    setResolverState({ open: false, trabajador: null, urlStorage: null });
  };

  const handleResolved = async () => {
    handleCloseResolver();
    await fetchData();
  };

  const handleResyncSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setResyncing(true);
    try {
      const result = await cargarUrlDriveService.resyncUrlStorageBulk(ids, { tipo: 'horas' });
      if (result?.ok) {
        const enq = result?.enqueued ?? ids.length;
        setAlert({
          open: true,
          message: `${enq} archivo${enq === 1 ? '' : 's'} encolado${enq === 1 ? '' : 's'}. Se procesarán de a uno.`,
          severity: 'success',
        });
        setSelectedIds(new Set());
      } else {
        setAlert({
          open: true,
          message: result?.error?.message || 'Error al encolar la resincronización',
          severity: 'error',
        });
      }
    } catch (e) {
      setAlert({
        open: true,
        message: e?.message || 'Error de red al encolar la resincronización',
        severity: 'error',
      });
    } finally {
      setResyncing(false);
    }
  };

  const selectedCount = selectedIds.size;

  const archivosAfectadosResolver = useMemo(() => {
    if (!resolverState.trabajador) return [];
    return archivosPorTrabajador(resolverState.trabajador);
  }, [resolverState.trabajador, archivosPorTrabajador]);

  return (
    <DashboardLayout title={TITLE}>
      <Container maxWidth="xl" sx={{ pb: 10 }}>
        <Stack spacing={3}>
          <BackButton onClick={() => router.back()} />

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DatePicker
                label="Desde"
                value={desdeParam ? dayjs(desdeParam) : null}
                onChange={handleChangeDesde}
                format="DD/MM/YYYY"
                slotProps={DATE_PICKER_SLOT_PROPS}
              />
              <DatePicker
                label="Hasta"
                value={hastaParam ? dayjs(hastaParam) : null}
                onChange={handleChangeHasta}
                format="DD/MM/YYYY"
                slotProps={DATE_PICKER_SLOT_PROPS}
              />
              <TextField
                label="Buscar archivo"
                size="small"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                sx={{ width: 240 }}
                InputProps={{
                  endAdornment: searchInput.length > 0 ? (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setSearchInput('')}
                        edge="end"
                        size="small"
                        sx={{ color: 'text.secondary' }}
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <Button
                startIcon={<RefreshIcon />}
                size="small"
                variant="text"
                onClick={fetchData}
                disabled={isLoading}
                sx={{ textTransform: 'none', color: 'text.secondary' }}
              >
                Refrescar
              </Button>
            </Box>
          </LocalizationProvider>

          {errorMessage ? (
            <Alert severity="error">{errorMessage}</Alert>
          ) : null}

          {stats && (
            stats.trabajadoresIgnoradosFiltrados > 0 ||
            stats.ignoradosEnPeriodoFichadas > 0
          ) ? (
            <Alert severity="info" variant="outlined" icon={false} sx={{ py: 0.5 }}>
              <Stack spacing={0.25}>
                {stats.ignoradosEnPeriodoFichadas > 0 ? (
                  <Typography variant="body2">
                    En el período, {stats.ignoradosEnPeriodoFichadas} fichada
                    {stats.ignoradosEnPeriodoFichadas === 1 ? '' : 's'} de trabajadores marcados como
                    {' '}<strong>ignorados</strong> (mensuales/externos) ya estaban skipeadas al procesar
                    {stats.archivosConIgnoradosEnPeriodo > 0
                      ? ` (en ${stats.archivosConIgnoradosEnPeriodo} archivo${stats.archivosConIgnoradosEnPeriodo === 1 ? '' : 's'})`
                      : ''}
                    .
                  </Typography>
                ) : null}
                {stats.trabajadoresIgnoradosFiltrados > 0 ? (
                  <Typography variant="body2">
                    Además, {stats.trabajadoresIgnoradosFiltrados} ocurrencia
                    {stats.trabajadoresIgnoradosFiltrados === 1 ? '' : 's'} que habían quedado como
                    {' '}no identificadas se filtran ahora porque sus trabajadores fueron marcados como ignorados
                    {stats.archivosFullIgnorados > 0
                      ? ` (${stats.archivosFullIgnorados} archivo${stats.archivosFullIgnorados === 1 ? '' : 's'} sin nada pendiente)`
                      : ''}
                    .
                  </Typography>
                ) : null}
              </Stack>
            </Alert>
          ) : null}

          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={!allSelected && someSelected}
                        checked={allSelected}
                        onChange={handleToggleAll}
                        disabled={items.length === 0}
                      />
                    </TableCell>
                    <TableCell>Archivo</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Identificados</TableCell>
                    <TableCell align="right">No id.</TableCell>
                    <TableCell>Trabajadores no identificados</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Stack spacing={0.5} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            No hay archivos con trabajadores no identificados pendientes en el período seleccionado.
                          </Typography>
                          {stats && stats.archivosConNoIdentificados > 0 && stats.archivosFullIgnorados === stats.archivosConNoIdentificados ? (
                            <Typography variant="caption" color="text.secondary">
                              Los {stats.archivosConNoIdentificados} archivo
                              {stats.archivosConNoIdentificados === 1 ? '' : 's'} con trabajadores no identificados del período
                              {' '}solo contienen trabajadores ya marcados como ignorados.
                            </Typography>
                          ) : null}
                          {stats && stats.ignoradosEnPeriodoFichadas > 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              {stats.ignoradosEnPeriodoFichadas} fichada
                              {stats.ignoradosEnPeriodoFichadas === 1 ? '' : 's'} fueron skipeadas porque pertenecen a trabajadores ya marcados como ignorados.
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => {
                      const id = String(row._id);
                      const pendientes = row.trabajadoresNoIdentificadosPendientes || [];
                      const isSelected = selectedIds.has(id);
                      return (
                        <TableRow
                          key={id}
                          hover
                          selected={isSelected}
                          sx={{ verticalAlign: 'top' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleRow(id)}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {row.file_name || '(sin nombre)'}
                            </Typography>
                            {row.folder_path ? (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {row.folder_path}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>{formatFechaDetectada(row.fechasDetectadas)}</TableCell>
                          <TableCell align="right">
                            {row.trabajadoresEncontrados ?? '—'}/{row.totalTrabajadores ?? '—'}
                          </TableCell>
                          <TableCell align="right">{pendientes.length}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {pendientes.map((t, idx) => (
                                <TrabajadorChip
                                  key={`${id}-${idx}`}
                                  trabajador={t}
                                  onClick={(trabajador) => handleOpenResolver(trabajador, row)}
                                />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Container>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          py: 1.5,
          px: 3,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 1,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          disabled={selectedCount === 0 || resyncing}
          onClick={handleResyncSelected}
          startIcon={resyncing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
        >
          {`Re-sincronizar ${selectedCount} archivo${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </Box>

      <ResolverTrabajadorModal
        open={resolverState.open}
        onClose={handleCloseResolver}
        trabajadorDetectado={resolverState.trabajador}
        urlStorage={resolverState.urlStorage}
        onResolved={handleResolved}
        archivosAfectados={archivosAfectadosResolver}
      />

      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
      >
        <Alert
          onClose={() => setAlert((p) => ({ ...p, open: false }))}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
};

export default FaltaTrabajadorFichadasPage;
