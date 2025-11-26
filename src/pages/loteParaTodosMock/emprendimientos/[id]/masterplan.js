import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Collapse,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FilterAlt as FilterIcon,
  Layers as LayersIcon,
  Warning as WarningIcon,
  Map as MapIcon,
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  Visibility as VisibilityIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from '../../../../components/layouts/LoteParaTodosLayout';
import { getEmprendimientoById } from '../../../../data/loteParaTodos/mockEmprendimientos';
import { mockLotes } from '../../../../data/loteParaTodos/mockLotes';
import {
  CONDICION_LOTE,
  CONDICION_LOTE_LABELS,
  CONDICION_LOTE_COLORS,
  ESTADO_LEGAL,
  ESTADO_LEGAL_LABELS,
  ESTADO_LEGAL_COLORS,
  SITUACION_FISICA,
  SITUACION_FISICA_LABELS,
  SITUACION_FISICA_COLORS
} from '../../../../data/loteParaTodos/constantes';
import { getVendedorById } from '../../../../data/loteParaTodos/mockVendedores';

const MasterplanEmprendimiento = () => {
  const router = useRouter();
  const { id } = router.query;
  const [filters, setFilters] = useState({
    search: '',
    manzana: '',
    condicion: '',
    estadoLegal: '',
    situacionFisica: '',
    responsable: ''
  });
  const [mostrarSoloAlertas, setMostrarSoloAlertas] = useState(false);
  const [selectedLotes, setSelectedLotes] = useState([]);
  const [mostrarIndicadores, setMostrarIndicadores] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const emprendimiento = useMemo(() => {
    if (!id) return null;
    return getEmprendimientoById(parseInt(id, 10));
  }, [id]);

  const lotesEmprendimiento = useMemo(() => {
    if (!id) return [];
    return mockLotes.filter((lote) => lote.emprendimiento_id === parseInt(id, 10));
  }, [id]);

  const manzanasDisponibles = useMemo(() => {
    const set = new Set();
    lotesEmprendimiento.forEach((lote) => {
      if (lote.manzana) {
        set.add(lote.manzana);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [lotesEmprendimiento]);

  const responsablesDisponibles = useMemo(() => {
    const ids = new Set();
    const result = [];
    lotesEmprendimiento.forEach((lote) => {
      if (lote.vendedor_responsable_id && !ids.has(lote.vendedor_responsable_id)) {
        ids.add(lote.vendedor_responsable_id);
        const vendedor = getVendedorById(lote.vendedor_responsable_id);
        if (vendedor) {
          result.push({ id: vendedor.id, label: `${vendedor.nombre} ${vendedor.apellido}` });
        }
      }
    });
    return result;
  }, [lotesEmprendimiento]);

  const alertasCriticas = useMemo(() => {
    return lotesEmprendimiento.filter(
      (lote) =>
        lote.estado_legal !== ESTADO_LEGAL.NORMAL ||
        lote.condicion_lote === CONDICION_LOTE.NO_A_LA_VENTA
    );
  }, [lotesEmprendimiento]);

  const lotesFiltrados = useMemo(() => {
    return lotesEmprendimiento.filter((lote) => {
      if (mostrarSoloAlertas) {
        const esCritico =
          lote.estado_legal !== ESTADO_LEGAL.NORMAL ||
          lote.condicion_lote === CONDICION_LOTE.NO_A_LA_VENTA;
        if (!esCritico) return false;
      }

      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchesSearch =
          lote.numero?.toLowerCase().includes(term) ||
          lote.manzana?.toLowerCase().includes(term) ||
          lote.numero_partida?.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      if (filters.condicion && lote.condicion_lote !== filters.condicion) {
        return false;
      }

      if (filters.manzana && (lote.manzana || '') !== filters.manzana) {
        return false;
      }

      if (filters.estadoLegal && lote.estado_legal !== filters.estadoLegal) {
        return false;
      }

      if (filters.situacionFisica && lote.situacion_fisica !== filters.situacionFisica) {
        return false;
      }

      if (
        filters.responsable &&
        String(lote.vendedor_responsable_id || '') !== String(filters.responsable)
      ) {
        return false;
      }

      return true;
    });
  }, [lotesEmprendimiento, filters, mostrarSoloAlertas]);

  const toggleSeleccionLote = (loteId) => {
    setSelectedLotes((prev) =>
      prev.includes(loteId) ? prev.filter((idSeleccionado) => idSeleccionado !== loteId) : [...prev, loteId]
    );
  };

  const seleccionarTodo = () => {
    setSelectedLotes(lotesFiltrados.map((lote) => lote.id));
  };

  const limpiarSeleccion = () => {
    setSelectedLotes([]);
  };

  const limpiarFiltros = () => {
    setFilters({ search: '', manzana: '', condicion: '', estadoLegal: '', situacionFisica: '', responsable: '' });
    setMostrarSoloAlertas(false);
  };

  const highlightedLoteId = router.query?.lote ? parseInt(router.query.lote, 10) : null;

  const handleVerLote = (lote) => {
    router.push(`/loteParaTodosMock/emprendimientos/${id}/lotes/${lote.id}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedIndicadores = window.localStorage.getItem('masterplanIndicadoresVisibles');
    const savedFiltros = window.localStorage.getItem('masterplanFiltrosVisibles');
    if (savedIndicadores !== null) {
      setMostrarIndicadores(savedIndicadores === 'true');
    }
    if (savedFiltros !== null) {
      setMostrarFiltros(savedFiltros === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('masterplanIndicadoresVisibles', mostrarIndicadores ? 'true' : 'false');
  }, [mostrarIndicadores]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('masterplanFiltrosVisibles', mostrarFiltros ? 'true' : 'false');
  }, [mostrarFiltros]);

  const filtrosActivos = useMemo(() => {
    const activos = [];
    if (filters.search) {
      activos.push({ key: 'search', label: `Búsqueda: "${filters.search}"` });
    }
    if (filters.manzana) {
      activos.push({ key: 'manzana', label: `Manzana ${filters.manzana}` });
    }
    if (filters.condicion) {
      activos.push({ key: 'condicion', label: CONDICION_LOTE_LABELS[filters.condicion] });
    }
    if (filters.estadoLegal) {
      activos.push({ key: 'estadoLegal', label: ESTADO_LEGAL_LABELS[filters.estadoLegal] });
    }
    if (filters.situacionFisica) {
      activos.push({ key: 'situacionFisica', label: SITUACION_FISICA_LABELS[filters.situacionFisica] });
    }
    if (filters.responsable) {
      const responsableSeleccionado = responsablesDisponibles.find(
        (responsable) => String(responsable.id) === String(filters.responsable)
      );
      if (responsableSeleccionado) {
        activos.push({ key: 'responsable', label: `Resp. ${responsableSeleccionado.label}` });
      }
    }
    if (mostrarSoloAlertas) {
      activos.push({ key: 'alertas', label: 'Solo alertas' });
    }
    return activos;
  }, [filters, mostrarSoloAlertas, responsablesDisponibles]);

  if (!emprendimiento) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Alert severity="error" sx={{ m: 3 }}>
          Emprendimiento no encontrado
        </Alert>
      </LoteParaTodosLayout>
    );
  }

  return (
    <LoteParaTodosLayout currentModule="emprendimientos" pageTitle={`Masterplan • ${emprendimiento.nombre}`}>
      <Head>
        <title>Masterplan - {emprendimiento.nombre}</title>
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}`)}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h4" fontWeight={700}>
                Masterplan operativo
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={() => window.open(emprendimiento.master_plan_url || '#', '_blank')}
              >
                Ver plano oficial
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<LayersIcon />}
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/edicion-masiva`)}
              >
                Edición masiva
              </Button>
            </Stack>
          </Stack>
          <Breadcrumbs sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {emprendimiento.codigo_interno}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {emprendimiento.ciudad} • {emprendimiento.provincia}
            </Typography>
          </Breadcrumbs>
        </Box>

        {alertasCriticas.length > 0 && (
          <Box
            sx={{
              mb: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.light',
              backgroundColor: 'warning.50',
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              fontSize: 14
            }}
          >
            <WarningIcon color="warning" fontSize="small" />
            <Typography variant="body2" color="warning.dark" sx={{ flexGrow: 1 }}>
              Hay {alertasCriticas.length} lote(s) con observaciones críticas. Activá el filtro &quot;Solo alertas&quot; para verlos primero.
            </Typography>
            <Button size="small" variant="text" color="warning" onClick={() => setMostrarSoloAlertas(true)}>
              Ver alertas
            </Button>
          </Box>
        )}

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Typography variant="h6">Indicadores operativos</Typography>
              <Button
                size="small"
                startIcon={mostrarIndicadores ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setMostrarIndicadores((prev) => !prev)}
              >
                {mostrarIndicadores ? 'Ocultar' : 'Mostrar'}
              </Button>
            </Stack>

            {!mostrarIndicadores && (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip label={`Lotes: ${lotesEmprendimiento.length}`} size="small" />
                <Chip label={`Activos: ${lotesEmprendimiento.filter((l) => l.condicion_lote === CONDICION_LOTE.ACTIVO).length}`} size="small" color="success" />
                <Chip
                  label={`Reservados: ${lotesEmprendimiento.filter((l) =>
                    [CONDICION_LOTE.RESERVADO, CONDICION_LOTE.PRE_RESERVADO].includes(l.condicion_lote)
                  ).length}`}
                  size="small"
                  color="warning"
                />
                <Chip label={`Alertas: ${alertasCriticas.length}`} size="small" color="error" />
                <Chip
                  label={`Act. ${new Date(emprendimiento.fecha_ultima_actualizacion).toLocaleDateString('es-AR')}`}
                  size="small"
                />
              </Stack>
            )}

            <Collapse in={mostrarIndicadores} timeout="auto" unmountOnExit>
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)',
                    xl: 'repeat(5, 1fr)'
                  }
                }}
              >
                <Card sx={{ backgroundColor: '#e3f2fd' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LayersIcon sx={{ color: '#1976d2', mr: 1 }} />
                      <Typography variant="h6" color="#1976d2">
                        Total de lotes
                      </Typography>
                    </Box>
                    <Typography variant="h3" color="#1976d2" fontWeight="bold">
                      {lotesEmprendimiento.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {emprendimiento.superficie_total_hectareas} hectáreas
                    </Typography>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ScheduleIcon sx={{ color: 'text.secondary', mr: 1 }} />
                      <Typography variant="h6">Última actualización</Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={700}>
                      {new Date(emprendimiento.fecha_ultima_actualizacion).toLocaleDateString('es-AR')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Según control operativo
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'success.50' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Vendidos / activos
                    </Typography>
                    <Typography variant="h4" color="success.main" fontWeight={700}>
                      {lotesEmprendimiento.filter((l) => l.condicion_lote === CONDICION_LOTE.ACTIVO).length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Incluye lotes con boleto firmado
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'warning.50' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Reservados / pre-reservados
                    </Typography>
                    <Typography variant="h4" color="warning.main" fontWeight={700}>
                      {lotesEmprendimiento.filter((l) =>
                        [CONDICION_LOTE.RESERVADO, CONDICION_LOTE.PRE_RESERVADO].includes(l.condicion_lote)
                      ).length}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ bgcolor: 'error.50' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Alertas legales / bloqueados
                    </Typography>
                    <Typography variant="h4" color="error.main" fontWeight={700}>
                      {alertasCriticas.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Incluye lotes en legales o no comercializables
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: mostrarFiltros ? 3 : 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <FilterIcon color="primary" />
              <Typography variant="h6">Filtros y capas</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {filtrosActivos.length > 0 && (
                <Button size="small" variant="text" onClick={limpiarFiltros} startIcon={<ClearAllIcon />}>
                  Limpiar filtros
                </Button>
              )}
              <Button
                size="small"
                startIcon={mostrarFiltros ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setMostrarFiltros((prev) => !prev)}
              >
                {mostrarFiltros ? 'Ocultar' : 'Mostrar'}
              </Button>
            </Stack>
          </Stack>

          {!mostrarFiltros && (
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {filtrosActivos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin filtros activos
                </Typography>
              ) : (
                filtrosActivos.map((filtro) => (
                  <Chip key={filtro.key} label={filtro.label} size="small" />
                ))
              )}
            </Stack>
          )}

          <Collapse in={mostrarFiltros} timeout="auto" unmountOnExit>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Buscar (lote, manzana o partida)"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><InfoIcon fontSize="small" /></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Manzana"
                  value={filters.manzana}
                  onChange={(e) => setFilters((prev) => ({ ...prev, manzana: e.target.value }))}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {manzanasDisponibles.map((manzana) => (
                    <MenuItem key={manzana} value={manzana}>
                      {manzana}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Condición"
                  value={filters.condicion}
                  onChange={(e) => setFilters((prev) => ({ ...prev, condicion: e.target.value }))}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {Object.values(CONDICION_LOTE).map((condicion) => (
                    <MenuItem key={condicion} value={condicion}>
                      {CONDICION_LOTE_LABELS[condicion]}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Estado legal"
                  value={filters.estadoLegal}
                  onChange={(e) => setFilters((prev) => ({ ...prev, estadoLegal: e.target.value }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Object.values(ESTADO_LEGAL).map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {ESTADO_LEGAL_LABELS[estado]}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Situación física"
                  value={filters.situacionFisica}
                  onChange={(e) => setFilters((prev) => ({ ...prev, situacionFisica: e.target.value }))}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {Object.values(SITUACION_FISICA).map((situacion) => (
                    <MenuItem key={situacion} value={situacion}>
                      {SITUACION_FISICA_LABELS[situacion]}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Responsable"
                  value={filters.responsable}
                  onChange={(e) => setFilters((prev) => ({ ...prev, responsable: e.target.value }))}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {responsablesDisponibles.map((responsable) => (
                    <MenuItem key={responsable.id} value={responsable.id}>
                      {responsable.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Checkbox
                    checked={mostrarSoloAlertas}
                    onChange={(e) => setMostrarSoloAlertas(e.target.checked)}
                  />
                  <Typography variant="body2">Solo alertas</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button variant="outlined" fullWidth startIcon={<ClearAllIcon />} onClick={limpiarFiltros}>
                  Limpiar
                </Button>
              </Grid>
            </Grid>
          </Collapse>
        </Paper>

        {selectedLotes.length > 0 && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.50', border: '1px dashed', borderColor: 'primary.main' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" spacing={2} justifyContent="space-between">
              <Typography variant="body1" fontWeight={600}>
                {selectedLotes.length} lote(s) seleccionados
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" color="primary" onClick={() => console.log('Aplicar condición masiva')}>
                  Cambiar condición
                </Button>
                <Button variant="outlined" color="warning" onClick={() => console.log('Bloquear lotes')}>
                  Bloquear
                </Button>
                <Button variant="outlined" color="success" onClick={() => console.log('Liberar lotes')}>
                  Liberar
                </Button>
                <Button variant="text" color="inherit" startIcon={<ClearAllIcon />} onClick={limpiarSeleccion}>
                  Limpiar selección
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button
            startIcon={<SelectAllIcon />}
            variant="outlined"
            onClick={seleccionarTodo}
            disabled={lotesFiltrados.length === 0}
          >
            Seleccionar visibles
          </Button>
          <Button startIcon={<ClearAllIcon />} variant="text" onClick={limpiarSeleccion}>
            Limpiar selección
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {lotesFiltrados.length} lote(s) cumpliendo filtros
          </Typography>
        </Stack>

        {lotesFiltrados.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6">No hay lotes que coincidan con los filtros aplicados.</Typography>
            <Typography variant="body2" color="text.secondary">
              Ajustá los filtros o limpiá la búsqueda para ver el masterplan completo.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="secondary"
                      indeterminate={selectedLotes.length > 0 && selectedLotes.length < lotesFiltrados.length}
                      checked={
                        lotesFiltrados.length > 0 && selectedLotes.length === lotesFiltrados.length
                      }
                      onChange={(e) => (e.target.checked ? seleccionarTodo() : limpiarSeleccion())}
                    />
                  </TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Manzana</TableCell>
                  <TableCell>Condición</TableCell>
                  <TableCell>Estado legal</TableCell>
                  <TableCell>Situación física</TableCell>
                  <TableCell>Superficie</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lotesFiltrados.map((lote) => {
                  const vendedor = lote.vendedor_responsable_id
                    ? getVendedorById(lote.vendedor_responsable_id)
                    : null;
                  const isSelected = selectedLotes.includes(lote.id);
                  const isHighlighted = highlightedLoteId === lote.id;
                  const isAlerta =
                    lote.estado_legal !== ESTADO_LEGAL.NORMAL ||
                    lote.condicion_lote === CONDICION_LOTE.NO_A_LA_VENTA;

                  return (
                    <TableRow
                      key={lote.id}
                      hover
                      selected={isSelected}
                      sx={{
                        backgroundColor: isHighlighted
                          ? 'rgba(25, 118, 210, 0.08)'
                          : isAlerta
                            ? 'rgba(255, 193, 7, 0.08)'
                            : 'inherit'
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="secondary"
                          checked={isSelected}
                          onChange={() => toggleSeleccionLote(lote.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {lote.numero}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Partida {lote.numero_partida || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{lote.manzana || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={CONDICION_LOTE_LABELS[lote.condicion_lote]}
                          color={CONDICION_LOTE_COLORS[lote.condicion_lote] || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ESTADO_LEGAL_LABELS[lote.estado_legal]}
                          color={ESTADO_LEGAL_COLORS[lote.estado_legal] || 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {SITUACION_FISICA_LABELS[lote.situacion_fisica]}
                      </TableCell>
                      <TableCell>{lote.superficie} m²</TableCell>
                      <TableCell>
                        {vendedor ? `${vendedor.nombre} ${vendedor.apellido}` : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {isAlerta && (
                            <Tooltip title="Lote con alerta activa">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleVerLote(lote)}
                            startIcon={<VisibilityIcon fontSize="small" />}
                          >
                            Ficha L1
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </LoteParaTodosLayout>
  );
};

export default MasterplanEmprendimiento;
