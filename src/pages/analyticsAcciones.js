import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Stack,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Done as DoneIcon
} from '@mui/icons-material';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── Constantes ──
const FOCOS = ['activacion', 'retencion', 'ventas', 'caja', 'producto', 'otro'];
const ESTADOS = ['pendiente', 'en_progreso', 'completada', 'cancelada'];

const estadoColor = {
  pendiente: 'warning',
  en_progreso: 'info',
  completada: 'success',
  cancelada: 'default'
};

const estadoLabel = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  cancelada: 'Cancelada'
};

const focoColor = {
  activacion: '#2196f3',
  retencion: '#ff9800',
  ventas: '#4caf50',
  caja: '#9c27b0',
  producto: '#00bcd4',
  otro: '#757575'
};

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ── StatCard ──
const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>{title}</Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>{value}</Typography>
          {subtitle && <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ backgroundColor: `${color}.light`, borderRadius: 2, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Resumen por Owner ──
const OwnerResumen = ({ resumen = [] }) => {
  const maxAcciones = Math.max(...resumen.map(r => r.total || 0), 1);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Acciones por Responsable</Typography>
        {resumen.length === 0 ? (
          <Typography color="textSecondary">Sin datos</Typography>
        ) : (
          <Box>
            {resumen.map((owner, idx) => (
              <Box key={idx} mb={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight="bold">{owner._id || 'Sin asignar'}</Typography>
                  <Stack direction="row" gap={0.5}>
                    <Chip label={`${owner.completadas || 0} ✓`} size="small" color="success" />
                    <Chip label={`${owner.pendientes || 0} ⏳`} size="small" color="warning" />
                  </Stack>
                </Stack>
                <Tooltip title={`${owner.completadas || 0} de ${owner.total || 0} completadas (${pct(owner.completadas || 0, owner.total || 0)}%)`}>
                  <LinearProgress
                    variant="determinate"
                    value={pct(owner.completadas || 0, owner.total || 0)}
                    color={pct(owner.completadas || 0, owner.total || 0) >= 70 ? 'success' : 'warning'}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ── Dialog crear/editar acción ──
const AccionDialog = ({ open, accion, onClose, onSave }) => {
  const [form, setForm] = useState({
    descripcion: '',
    owner: '',
    foco: 'otro',
    deadline: '',
    ...accion
  });

  useEffect(() => {
    if (accion) {
      setForm({
        descripcion: accion.descripcion || '',
        owner: accion.owner || '',
        foco: accion.foco || 'otro',
        deadline: accion.deadline ? new Date(accion.deadline).toISOString().split('T')[0] : '',
      });
    } else {
      setForm({ descripcion: '', owner: '', foco: 'otro', deadline: '' });
    }
  }, [accion, open]);

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{accion?._id ? 'Editar Acción' : 'Nueva Acción'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Descripción"
            value={form.descripcion}
            onChange={handleChange('descripcion')}
            multiline
            rows={3}
            fullWidth
          />
          <TextField
            label="Responsable"
            value={form.owner}
            onChange={handleChange('owner')}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Foco</InputLabel>
            <Select value={form.foco} label="Foco" onChange={handleChange('foco')}>
              {FOCOS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Deadline"
            type="date"
            value={form.deadline}
            onChange={handleChange('deadline')}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.descripcion || !form.owner}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
const AnalyticsAcciones = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acciones, setAcciones] = useState([]);
  const [vencidas, setVencidas] = useState([]);
  const [resumenOwner, setResumenOwner] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFoco, setFiltroFoco] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accionEditing, setAccionEditing] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accionesResp, vencidasResp, ownerResp] = await Promise.all([
        leadershipService.getAccionesSemanaActual(),
        leadershipService.getAccionesVencidas(),
        leadershipService.getResumenPorOwner()
      ]);
      setAcciones(Array.isArray(accionesResp?.acciones) ? accionesResp.acciones : []);
      setVencidas(Array.isArray(vencidasResp?.vencidas) ? vencidasResp.vencidas : []);
      setResumenOwner(Array.isArray(ownerResp?.resumen) ? ownerResp.resumen : []);
    } catch (err) {
      console.error('Error cargando acciones:', err);
      setError('No se pudieron cargar las acciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const handleSave = async (form) => {
    try {
      if (accionEditing?._id) {
        await leadershipService.actualizarAccion(accionEditing._id, form);
      } else {
        await leadershipService.crearAccion(form);
      }
      setDialogOpen(false);
      setAccionEditing(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando acción:', err);
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      await leadershipService.cambiarEstadoAccion(id, nuevoEstado);
      cargarDatos();
    } catch (err) {
      console.error('Error cambiando estado:', err);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta acción?')) return;
    try {
      await leadershipService.eliminarAccion(id);
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando acción:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Filtrar acciones
  const accionesFiltradas = acciones.filter(a => {
    if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
    if (filtroFoco !== 'todos' && a.foco !== filtroFoco) return false;
    return true;
  });

  const totalAcciones = acciones.length;
  const completadas = acciones.filter(a => a.estado === 'completada').length;
  const pendientes = acciones.filter(a => a.estado === 'pendiente' || a.estado === 'en_progreso').length;

  return (
    <>
      <Head><title>Acciones | Leadership</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4">Acciones de Leadership</Typography>
              <Typography variant="body2" color="textSecondary">
                Seguimiento de compromisos semanales de la reunión de liderazgo
              </Typography>
            </Box>
            <Stack direction="row" gap={2}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setAccionEditing(null); setDialogOpen(true); }}>
                Nueva Acción
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarDatos}>
                Actualizar
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Vencidas alert */}
          {vencidas.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
              Hay <strong>{vencidas.length}</strong> acción(es) vencida(s) sin completar.
            </Alert>
          )}

          {/* KPIs */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={6} sm={3}>
              <StatCard title="Total Semana" value={totalAcciones} icon={<AssignmentIcon color="primary" />} color="primary" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                title="Completadas"
                value={completadas}
                subtitle={`${pct(completadas, totalAcciones)}%`}
                icon={<CheckIcon color="success" />}
                color="success"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Pendientes" value={pendientes} icon={<WarningIcon color="warning" />} color="warning" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard title="Vencidas" value={vencidas.length} icon={<WarningIcon color="error" />} color="error" />
            </Grid>
          </Grid>

          {/* Filtros + Contenido */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                    <Typography variant="h6">Acciones de la Semana</Typography>
                    <Stack direction="row" gap={1}>
                      <ToggleButtonGroup
                        size="small"
                        value={filtroEstado}
                        exclusive
                        onChange={(_, v) => v && setFiltroEstado(v)}
                      >
                        <ToggleButton value="todos">Todos</ToggleButton>
                        {ESTADOS.map(e => (
                          <ToggleButton key={e} value={e}>{estadoLabel[e]}</ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select value={filtroFoco} onChange={(e) => setFiltroFoco(e.target.value)} displayEmpty>
                          <MenuItem value="todos">Todos focos</MenuItem>
                          {FOCOS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Stack>

                  {accionesFiltradas.length === 0 ? (
                    <Typography color="textSecondary">No hay acciones que coincidan con los filtros.</Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Owner</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Foco</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Deadline</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {accionesFiltradas.map((accion) => {
                            const vencida = accion.deadline && new Date(accion.deadline) < new Date() && accion.estado !== 'completada' && accion.estado !== 'cancelada';
                            return (
                              <TableRow key={accion._id} sx={{ backgroundColor: vencida ? '#fff3e0' : 'inherit' }}>
                                <TableCell sx={{ maxWidth: 300 }}>
                                  <Typography variant="body2">{accion.descripcion}</Typography>
                                </TableCell>
                                <TableCell>{accion.owner}</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={accion.foco}
                                    size="small"
                                    sx={{ backgroundColor: (focoColor[accion.foco] || '#757575') + '22', borderLeft: `3px solid ${focoColor[accion.foco] || '#757575'}` }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip label={estadoLabel[accion.estado]} size="small" color={estadoColor[accion.estado]} />
                                </TableCell>
                                <TableCell align="center">
                                  {accion.deadline ? (
                                    <Tooltip title={vencida ? '¡Vencida!' : ''}>
                                      <Typography variant="body2" color={vencida ? 'error' : 'textPrimary'} fontWeight={vencida ? 'bold' : 'normal'}>
                                        {new Date(accion.deadline).toLocaleDateString('es-AR')}
                                      </Typography>
                                    </Tooltip>
                                  ) : '–'}
                                </TableCell>
                                <TableCell align="center">
                                  <Stack direction="row" gap={0.5} justifyContent="center">
                                    {accion.estado === 'pendiente' && (
                                      <Tooltip title="Iniciar">
                                        <IconButton size="small" color="info" onClick={() => handleCambiarEstado(accion._id, 'en_progreso')}>
                                          <PlayIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {(accion.estado === 'pendiente' || accion.estado === 'en_progreso') && (
                                      <Tooltip title="Completar">
                                        <IconButton size="small" color="success" onClick={() => handleCambiarEstado(accion._id, 'completada')}>
                                          <DoneIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Editar">
                                      <IconButton size="small" onClick={() => { setAccionEditing(accion); setDialogOpen(true); }}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Eliminar">
                                      <IconButton size="small" color="error" onClick={() => handleEliminar(accion._id)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <OwnerResumen resumen={resumenOwner} />
            </Grid>
          </Grid>

          {/* Dialog */}
          <AccionDialog
            open={dialogOpen}
            accion={accionEditing}
            onClose={() => { setDialogOpen(false); setAccionEditing(null); }}
            onSave={handleSave}
          />
        </Container>
      </Box>
    </>
  );
};

AnalyticsAcciones.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsAcciones;
