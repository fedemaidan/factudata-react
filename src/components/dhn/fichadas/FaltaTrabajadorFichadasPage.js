import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BackButton from 'src/components/shared/BackButton';
import TrabajadorChip from 'src/components/dhn/TrabajadorChip';
import ResolverTrabajadorModal from 'src/components/dhn/ResolverTrabajadorModal';
import AssistedCorrectionNavigator from 'src/components/common/AssistedCorrectionNavigator';
import useAssistedCorrectionFlow from 'src/hooks/common/useAssistedCorrectionFlow';
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

const pendientesDe = (row) =>
  Array.isArray(row?.trabajadoresNoIdentificadosPendientes)
    ? row.trabajadoresNoIdentificadosPendientes
    : [];

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
  const [mostrarEstadoFinal, setMostrarEstadoFinal] = useState(false);
  const [procesandoIds, setProcesandoIds] = useState(() => new Set());
  const [procesandoTotal, setProcesandoTotal] = useState(0);
  const [mostrarBannerProcesoCompleto, setMostrarBannerProcesoCompleto] = useState(false);
  const procesandoStartedAtRef = useRef(null);

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!router.isReady || !desdeParam || !hastaParam) return;
      if (!silent) setIsLoading(true);
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
      } catch (e) {
        if (!silent) {
          setErrorMessage(e?.message || 'Error al cargar la lista');
          setItems([]);
          setStats(null);
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [router.isReady, desdeParam, hastaParam, searchTerm]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const archivosConPendientes = useMemo(
    () => items.filter((r) => pendientesDe(r).length > 0),
    [items]
  );

  const archivosListos = useMemo(
    () => items.filter((r) => pendientesDe(r).length === 0),
    [items]
  );

  const trabajadoresUnicos = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      for (const t of pendientesDe(row)) {
        const k = trabajadorKey(t);
        if (!map.has(k)) map.set(k, t);
      }
    }
    return Array.from(map.values());
  }, [items]);

  const archivosListosIds = useMemo(
    () => archivosListos.map((r) => String(r._id)),
    [archivosListos]
  );

  useEffect(() => {
    if (archivosListosIds.length === 0) return;
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of archivosListosIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [archivosListosIds]);

  // Cuando un archivo desaparece de items (ya no tiene trabajadoresNoIdentificados),
  // sacarlo de selectedIds para que el contador del botón refleje la realidad.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const itemIds = new Set(items.map((r) => String(r._id)));
      const next = new Set();
      let changed = false;
      for (const id of prev) {
        if (itemIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [items]);

  // Polling silencioso mientras hay archivos en procesamiento (~10s/archivo, 5s
  // de intervalo da feedback suave sin saturar). Detenemos al llegar a cero.
  useEffect(() => {
    if (procesandoIds.size === 0) return undefined;
    const interval = setInterval(() => {
      fetchData({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [procesandoIds, fetchData]);

  // Después de cada refetch, comparamos: si un id que estaba procesando ya no
  // está en items (porque el aggregate excluye archivos con trabajadoresNoIdentificados
  // vacío en DB), o si su updated_at superó el momento del start, fue procesado.
  useEffect(() => {
    if (procesandoIds.size === 0) return;
    const startedAt = procesandoStartedAtRef.current || 0;
    const itemsById = new Map(items.map((r) => [String(r._id), r]));
    const terminadosIds = [];
    for (const id of procesandoIds) {
      const row = itemsById.get(id);
      if (!row) {
        terminadosIds.push(id);
        continue;
      }
      const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (updatedAt > startedAt) {
        terminadosIds.push(id);
      }
    }
    if (terminadosIds.length === 0) return;
    setProcesandoIds((prev) => {
      const next = new Set(prev);
      for (const id of terminadosIds) next.delete(id);
      return next;
    });
  }, [items, procesandoIds]);

  // Mostrar banner final cuando todos los archivos terminaron de procesarse.
  useEffect(() => {
    if (procesandoIds.size === 0 && procesandoStartedAtRef.current) {
      setMostrarBannerProcesoCompleto(true);
      procesandoStartedAtRef.current = null;
    }
  }, [procesandoIds]);

  const archivosPorTrabajador = useCallback(
    (trabajador) => {
      if (!trabajador) return [];
      const key = trabajadorKey(trabajador);
      return items
        .filter((row) => pendientesDe(row).some((t) => trabajadorKey(t) === key))
        .map((row) => ({
          _id: row._id,
          file_name: row.file_name,
          fechasDetectadas: row.fechasDetectadas,
          url_storage: row.url_storage,
        }));
    },
    [items]
  );

  const correccion = useAssistedCorrectionFlow(trabajadoresUnicos, {
    getRowId: trabajadorKey,
    isEligible: () => true,
  });

  const correccionActivaRef = useRef(false);
  useEffect(() => {
    correccionActivaRef.current = correccion.activa;
  }, [correccion.activa]);

  // El modal de ResolverTrabajador llama onClose en dos casos: (1) auto-cierre 800ms
  // después de notifyResolved; (2) cierre genuino del usuario (botón Cerrar / ESC /
  // backdrop). Esta ref distingue entre ambos para que el auto-cierre NO detenga el
  // flujo asistido pero el cierre del usuario sí.
  const autoClosingAfterResolveRef = useRef(false);

  const handleIniciarCorreccion = () => {
    setMostrarEstadoFinal(false);
    correccion.iniciar(trabajadoresUnicos);
  };

  const handleCerrarCorreccion = () => {
    correccion.detener();
  };

  const handleToggleRow = (id, disabled) => {
    if (disabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const archivosListosCount = archivosListos.length;
  const archivosListosSelected = archivosListos.filter((r) => selectedIds.has(String(r._id))).length;

  const handleToggleAllListos = () => {
    if (archivosListosSelected === archivosListosCount && archivosListosCount > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of archivosListosIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of archivosListosIds) next.add(id);
        return next;
      });
    }
  };

  const handleOpenResolver = (trabajador, row) => {
    setResolverState({
      open: true,
      trabajador,
      urlStorage: row?.url_storage || null,
      row,
    });
  };

  const handleCloseResolver = () => {
    if (correccionActivaRef.current) return;
    setResolverState({ open: false, trabajador: null, urlStorage: null });
  };

  const handleResolvedManual = async () => {
    setResolverState({ open: false, trabajador: null, urlStorage: null });
    await fetchData();
  };

  const handleResolvedInFlow = () => {
    // El modal interno hará setTimeout(handleClose, 800) tras notifyResolved.
    // Marcamos el flag durante ~1s para que el onClose disparado por ese
    // setTimeout no detenga el flujo. Cualquier onClose después de eso es
    // un cierre genuino del usuario y sí detiene la corrección.
    autoClosingAfterResolveRef.current = true;
    setTimeout(() => {
      autoClosingAfterResolveRef.current = false;
    }, 1000);
    const next = correccion.confirmarYAvanzar();
    fetchData();
    if (!next) {
      setMostrarEstadoFinal(true);
    }
  };

  const handleResyncSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setResyncing(true);
    try {
      const result = await cargarUrlDriveService.resyncUrlStorageBulk(ids, { tipo: 'horas' });
      if (result?.ok) {
        const enq = result?.enqueued ?? ids.length;
        procesandoStartedAtRef.current = Date.now();
        setProcesandoIds(new Set(ids));
        setProcesandoTotal(ids.length);
        setMostrarBannerProcesoCompleto(false);
        setAlert({
          open: true,
          message: `Procesando ${enq} archivo${enq === 1 ? '' : 's'}. Puede tardar unos minutos.`,
          severity: 'success',
        });
        setSelectedIds(new Set());
        setMostrarEstadoFinal(false);
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

  const handleResyncFinal = async () => {
    setSelectedIds(new Set(archivosListosIds));
    await handleResyncSelected();
  };

  const isFlowActive = correccion.activa && correccion.actualRow !== null;
  const trabajadorEnFlujo = correccion.actualRow;
  const archivosAfectadosFlujo = useMemo(
    () => (trabajadorEnFlujo ? archivosPorTrabajador(trabajadorEnFlujo) : []),
    [trabajadorEnFlujo, archivosPorTrabajador]
  );
  const urlStorageFlujo = archivosAfectadosFlujo[0]?.url_storage || null;

  const modalOpen = isFlowActive ? true : resolverState.open;
  const modalTrabajador = isFlowActive ? trabajadorEnFlujo : resolverState.trabajador;
  const modalUrlStorage = isFlowActive ? urlStorageFlujo : resolverState.urlStorage;
  const archivosAfectadosManual = useMemo(
    () => (resolverState.trabajador ? archivosPorTrabajador(resolverState.trabajador) : []),
    [resolverState.trabajador, archivosPorTrabajador]
  );
  const modalArchivosAfectados = isFlowActive ? archivosAfectadosFlujo : archivosAfectadosManual;
  const modalOnResolved = isFlowActive ? handleResolvedInFlow : handleResolvedManual;
  // En modo flujo el modal dispara onClose en dos casos: auto-cierre tras resolver
  // (ignoramos vía autoClosingAfterResolveRef) o cierre genuino del usuario
  // (botón Cerrar / ESC / backdrop) → detenemos el flujo.
  const modalOnClose = isFlowActive
    ? () => {
        if (autoClosingAfterResolveRef.current) return;
        handleCerrarCorreccion();
      }
    : handleCloseResolver;

  // Key estable por trabajador detectado. En modo flujo, cambiar de trabajador
  // fuerza unmount/remount del modal, lo que (a) garantiza que el useEffect interno
  // inicialice el formData con los datos del nuevo trabajador y (b) "cancela"
  // visualmente el setTimeout(handleClose, 800) del modal anterior — el componente
  // viejo ya está desmontado cuando dispara.
  const modalKey = isFlowActive && modalTrabajador
    ? `flow:${trabajadorKey(modalTrabajador)}`
    : resolverState.trabajador
    ? `manual:${trabajadorKey(resolverState.trabajador)}`
    : 'idle';

  const selectedCount = selectedIds.size;
  const totalArchivos = items.length;
  const tieneTrabajadoresPendientes = trabajadoresUnicos.length > 0;
  const mostrarBannerExito =
    mostrarEstadoFinal && !tieneTrabajadoresPendientes && archivosListosCount > 0;

  const textoProgresoCustom = useMemo(() => {
    if (!correccion.activa) return correccion.textoProgreso;
    const archivosCount = archivosAfectadosFlujo.length;
    const archivosTxt = archivosCount > 0 ? ` · en ${archivosCount} archivo${archivosCount === 1 ? '' : 's'}` : '';
    const current = correccion.totalElegibles
      ? Math.min(correccion.indiceActual + 1, correccion.totalElegibles)
      : 0;
    return `Trabajador ${current}/${correccion.totalElegibles}${archivosTxt} · Resueltos: ${correccion.indiceActual}`;
  }, [
    correccion.activa,
    correccion.textoProgreso,
    correccion.totalElegibles,
    correccion.indiceActual,
    archivosAfectadosFlujo.length,
  ]);

  return (
    <DashboardLayout title={TITLE}>
      <Container maxWidth="xl" sx={{ pb: 14 }}>
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
              <Button
                variant="outlined"
                size="small"
                color="warning"
                startIcon={<PlayArrowIcon />}
                onClick={handleIniciarCorreccion}
                disabled={isLoading || !tieneTrabajadoresPendientes}
              >
                Corrección asistida
              </Button>
            </Box>
          </LocalizationProvider>

          {tieneTrabajadoresPendientes && !mostrarBannerExito ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
              <WarningAmberIcon fontSize="small" />
              <Typography variant="body2">
                Hay {trabajadoresUnicos.length} trabajador
                {trabajadoresUnicos.length === 1 ? '' : 'es'} no identificado
                {trabajadoresUnicos.length === 1 ? '' : 's'} en {archivosConPendientes.length} archivo
                {archivosConPendientes.length === 1 ? '' : 's'}. Resolvelos antes de resincronizar.
              </Typography>
            </Box>
          ) : null}

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          {mostrarBannerProcesoCompleto && procesandoIds.size === 0 ? (
            <Alert
              severity="success"
              icon={<CheckCircleIcon />}
              onClose={() => setMostrarBannerProcesoCompleto(false)}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Listo. Todos los archivos fueron procesados.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Los Excels se reprocesaron con los trabajadores que resolviste.
              </Typography>
            </Alert>
          ) : null}

          {mostrarBannerExito ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderColor: 'success.light',
                bgcolor: (theme) => theme.palette.success.lighter || 'rgba(46, 125, 50, 0.06)',
              }}
            >
              <Stack spacing={2} alignItems="center" textAlign="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="h6">Todos los trabajadores fueron resueltos</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                  Quedaron {archivosListosCount} archivo{archivosListosCount === 1 ? '' : 's'} listo
                  {archivosListosCount === 1 ? '' : 's'} para resincronizar. Al resincronizar, el sistema
                  vuelve a procesar las fichadas con los trabajadores que acabás de resolver.
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={resyncing ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                  onClick={handleResyncFinal}
                  disabled={resyncing || procesandoIds.size > 0}
                  sx={{ textTransform: 'none', px: 4, py: 1.25 }}
                >
                  Re-sincronizar {archivosListosCount === 1
                    ? 'el archivo corregido'
                    : `los ${archivosListosCount} archivos corregidos`}
                </Button>
                <Button
                  variant="text"
                  onClick={() => setMostrarEstadoFinal(false)}
                  sx={{ textTransform: 'none', color: 'text.secondary' }}
                >
                  Ver tabla
                </Button>
              </Stack>
            </Paper>
          ) : null}

          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Tooltip
                        title={
                          archivosListosCount === 0
                            ? 'Aún no hay archivos listos para resincronizar'
                            : ''
                        }
                      >
                        <span>
                          <Checkbox
                            indeterminate={
                              archivosListosSelected > 0 &&
                              archivosListosSelected < archivosListosCount
                            }
                            checked={
                              archivosListosCount > 0 &&
                              archivosListosSelected === archivosListosCount
                            }
                            onChange={handleToggleAllListos}
                            disabled={archivosListosCount === 0}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>Archivo</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Identificados</TableCell>
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
                        <Stack spacing={0.5} alignItems="center" sx={{ maxWidth: 720, mx: 'auto' }}>
                          <Typography variant="body2" color="text.secondary">
                            {stats?.archivosTotalEnPeriodo === 0
                              ? 'No se procesaron Excels de fichadas en este período.'
                              : 'No hay archivos con trabajadores no identificados pendientes en el período seleccionado.'}
                          </Typography>
                          {stats ? (
                            <Typography variant="caption" color="text.secondary">
                              Procesados en el período: {stats.archivosTotalEnPeriodo} Excel
                              {stats.archivosTotalEnPeriodo === 1 ? '' : 's'} • con no identificados:{' '}
                              {stats.archivosConNoIdentificados}
                              {stats.archivosFullIgnorados > 0
                                ? ` (${stats.archivosFullIgnorados} con todos ignorados)`
                                : ''}
                              .
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => {
                      const id = String(row._id);
                      const pendientes = pendientesDe(row);
                      const isListo = pendientes.length === 0;
                      const isProcesando = procesandoIds.has(id);
                      const isSelected = selectedIds.has(id);
                      return (
                        <TableRow
                          key={id}
                          hover
                          selected={isSelected && !isProcesando}
                          sx={{
                            verticalAlign: 'top',
                            opacity: isProcesando ? 0.7 : 1,
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Tooltip
                              title={
                                isProcesando
                                  ? 'Procesando este archivo...'
                                  : !isListo
                                  ? `Resolvé los ${pendientes.length} pendientes primero`
                                  : ''
                              }
                            >
                              <span>
                                <Checkbox
                                  checked={isListo && isSelected && !isProcesando}
                                  onChange={() => handleToggleRow(id, !isListo || isProcesando)}
                                  disabled={!isListo || isProcesando}
                                />
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 320 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {row.file_name || '(sin nombre)'}
                            </Typography>
                            {row.folder_path ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                {row.folder_path}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>{formatFechaDetectada(row.fechasDetectadas)}</TableCell>
                          <TableCell>
                            {isProcesando ? (
                              <Chip
                                size="small"
                                color="info"
                                icon={<CircularProgress size={12} thickness={6} color="inherit" />}
                                label="Procesando..."
                                sx={{ fontWeight: 500 }}
                              />
                            ) : isListo ? (
                              <Chip
                                size="small"
                                color="success"
                                icon={<CheckCircleIcon />}
                                label="Listo"
                                sx={{ fontWeight: 500 }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                color="warning"
                                icon={<WarningAmberIcon />}
                                label={`${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}`}
                                sx={{ fontWeight: 500 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {row.trabajadoresEncontrados ?? '—'}/{row.totalTrabajadores ?? '—'}
                          </TableCell>
                          <TableCell>
                            {isProcesando ? (
                              <Typography variant="caption" color="text.secondary">
                                Esperando resultado...
                              </Typography>
                            ) : isListo ? (
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {pendientes.map((t, idx) => (
                                  <TrabajadorChip
                                    key={`${id}-${idx}`}
                                    trabajador={t}
                                    onClick={(trabajador) => handleOpenResolver(trabajador, row)}
                                  />
                                ))}
                              </Box>
                            )}
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          zIndex: 1,
        }}
      >
        {procesandoIds.size > 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'info.main' }}>
            <CircularProgress size={18} color="inherit" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Procesando {procesandoTotal - procesandoIds.size} de {procesandoTotal} archivo
              {procesandoTotal === 1 ? '' : 's'}...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Esto puede tardar unos minutos. La pantalla se actualiza sola.
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {archivosListosCount} de {totalArchivos} archivo
            {totalArchivos === 1 ? '' : 's'} listo{archivosListosCount === 1 ? '' : 's'} para
            resincronizar
          </Typography>
        )}
        <Button
          variant="contained"
          color="primary"
          disabled={selectedCount === 0 || resyncing || procesandoIds.size > 0}
          onClick={handleResyncSelected}
          startIcon={resyncing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          sx={{ textTransform: 'none' }}
        >
          {`Re-sincronizar ${selectedCount} archivo${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </Box>

      <AssistedCorrectionNavigator
        visible={correccion.activa}
        textoProgreso={textoProgresoCustom}
        hasPrev={correccion.hasPrev}
        hasNext={correccion.hasNext}
        onPrev={correccion.irAnterior}
        onNext={correccion.irSiguiente}
        onCloseFlow={handleCerrarCorreccion}
        position="bottom"
      />

      <ResolverTrabajadorModal
        key={modalKey}
        open={modalOpen}
        onClose={modalOnClose}
        trabajadorDetectado={modalTrabajador}
        urlStorage={modalUrlStorage}
        onResolved={modalOnResolved}
        archivosAfectados={modalArchivosAfectados}
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
