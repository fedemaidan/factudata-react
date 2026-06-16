// Panel de Reservas por Obra (Reserva de Obra = reserva interna de fondos de una
// obra/proyecto; concepto distinto de la Caja Chica personal).
// Ver docs/RESERVA_DE_OBRA_TECNICO.md — Ticket 3.
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, MenuItem,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Snackbar, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Avatar,
  CircularProgress, Card, CardContent, FormControlLabel, Switch, Autocomplete,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HomeIcon from '@mui/icons-material/Home';
import LockIcon from '@mui/icons-material/Lock';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import reservaObraService from 'src/services/reservaObraService';
import profileService from 'src/services/profileService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';

const formatCurrency = (amount, moneda = 'ARS') => {
  if (!amount) return moneda === 'USD' ? 'US$ 0' : '$ 0';
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
  });
};

const ESTADO_CHIP = {
  activa: { label: 'Activa', color: 'success' },
  sin_movimientos: { label: 'Sin movimientos', color: 'default' },
  inactiva: { label: 'Inactiva', color: 'default' },
  saldo_negativo: { label: 'Con saldo negativo', color: 'error' },
  pendiente_arqueo: { label: 'Pendiente de arqueo', color: 'warning' },
};

const AVATAR_COLORS = ['#635BFF', '#0097B2', '#2E7D32', '#ED6C02', '#9C27B0', '#D81B60', '#5D4037'];

const getInitials = (nombre) => {
  const palabras = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '—';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
};

const avatarColor = (nombre) => {
  const str = String(nombre || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const ReservasObraPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();

  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [busqueda, setBusqueda] = useState('');
  const [soloActivas, setSoloActivas] = useState(true);
  const [empresaId, setEmpresaId] = useState(null);

  // Dialog Asignar fondos
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [asignarSaving, setAsignarSaving] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [formProyecto, setFormProyecto] = useState(null);
  const [formMoneda, setFormMoneda] = useState('ARS');
  const [formMonto, setFormMonto] = useState('');
  const [formResponsable, setFormResponsable] = useState(null);
  const [formObs, setFormObs] = useState('');

  const resolveEmpresaId = useCallback(() => (
    user?.empresa?.id || user?.empresaData?.id || user?.empresa_id
  ), [user]);

  // Permisos por acciones configuradas de la empresa (ver configuracionGeneral.js)
  const accionesEmpresa = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const permisosOcultos = user?.permisosOcultos || [];
  const tienePermiso = (accion) => accionesEmpresa.includes(accion) && !permisosOcultos.includes(accion);
  const puedeGestionar = user?.admin || tienePermiso('GESTIONAR_RESERVAS_OBRA');

  const fetchReservas = useCallback(async () => {
    const empId = resolveEmpresaId();
    if (!empId) return;
    setEmpresaId(empId);
    setIsLoading(true);
    try {
      const items = await reservaObraService.listar({ empresaId: empId });
      setReservas(items);
    } catch (err) {
      console.error('Error cargando reservas:', err);
      setAlert({ open: true, message: 'Error al cargar las reservas', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [resolveEmpresaId]);

  useEffect(() => {
    if (!user) return;
    fetchReservas();
  }, [user, fetchReservas]);

  // Título en la top-nav (breadcrumbs).
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Reservas por obra', icon: <LockIcon fontSize="small" /> },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  // Carga diferida de proyectos y perfiles para el dialog de Asignar fondos
  const handleOpenAsignar = async () => {
    setAsignarOpen(true);
    if (proyectos.length === 0) {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const empId = resolveEmpresaId();
        const [pys, perfs] = await Promise.all([
          getProyectosByEmpresa(empresa),
          profileService.getProfileByEmpresa(empId),
        ]);
        setProyectos(pys || []);
        setPerfiles(perfs || []);
      } catch (err) {
        console.error('Error cargando proyectos/perfiles:', err);
      }
    }
  };

  const handleAsignarFondos = async () => {
    if (!formProyecto || !formMonto || Number(formMonto) <= 0) {
      setAlert({ open: true, message: 'Elegí una obra y un monto mayor a 0', severity: 'warning' });
      return;
    }
    setAsignarSaving(true);
    try {
      const proyectoId = formProyecto._id || formProyecto.id;
      let reserva = reservas.find((r) => r.proyecto_id === proyectoId);
      if (!reserva) {
        reserva = await reservaObraService.crear({
          empresaId,
          proyectoId,
          proyectoNombre: formProyecto.nombre,
          responsableId: formResponsable ? (formResponsable.id || formResponsable.user_id) : null,
          responsableNombre: formResponsable
            ? [formResponsable.firstName, formResponsable.lastName].filter(Boolean).join(' ')
            : null,
          participantes: formResponsable ? [{
            user_id: formResponsable.id || formResponsable.user_id || null,
            user_phone: formResponsable.phone || null,
            nombre: [formResponsable.firstName, formResponsable.lastName].filter(Boolean).join(' '),
            rol: 'responsable',
          }] : [],
        });
      }
      await reservaObraService.asignarFondos(reserva._id || reserva.id, {
        moneda: formMoneda,
        monto: Number(formMonto),
        observacion: formObs || null,
      });
      setAlert({ open: true, message: 'Fondos asignados a la reserva', severity: 'success' });
      setAsignarOpen(false);
      setFormProyecto(null);
      setFormMonto('');
      setFormObs('');
      setFormResponsable(null);
      await fetchReservas();
    } catch (err) {
      console.error('Error asignando fondos:', err);
      setAlert({ open: true, message: err?.response?.data?.error || err.message || 'Error al asignar fondos', severity: 'error' });
    } finally {
      setAsignarSaving(false);
    }
  };

  const reservasFiltradas = useMemo(() => {
    const ql = busqueda.toLowerCase();
    return reservas.filter((r) => {
      if (soloActivas && !r.activa) return false;
      if (ql && !(r.proyecto_nombre || '').toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [reservas, busqueda, soloActivas]);

  const totales = useMemo(() => {
    const t = { ARS: 0, USD: 0, activas: 0 };
    reservasFiltradas.forEach((r) => {
      t.ARS += r.saldos?.ARS?.reservado || 0;
      t.USD += r.saldos?.USD?.reservado || 0;
      if (r.estado === 'activa' || r.estado === 'saldo_negativo') t.activas += 1;
    });
    return t;
  }, [reservasFiltradas]);

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  return (
    <>
      <Head>
        <title>Reservas por Obra</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          <Stack spacing={2.5}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                La Reserva de Obra es una reserva interna de fondos de cada obra.
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <FormControlLabel
                  control={<Switch checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} size="small" />}
                  label="Solo activas"
                />
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchReservas}>
                  Refrescar
                </Button>
                {puedeGestionar && (
                  <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenAsignar}>
                    Asignar fondos
                  </Button>
                )}
              </Box>
            </Box>

            {/* Cards resumen */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Card sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Total reservado ARS</Typography>
                  <Typography variant="h5" color={totales.ARS >= 0 ? 'text.primary' : 'error.main'}>
                    {formatCurrency(totales.ARS, 'ARS')}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Total reservado USD</Typography>
                  <Typography variant="h5" color={totales.USD >= 0 ? 'text.primary' : 'error.main'}>
                    {formatCurrency(totales.USD, 'USD')}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Obras con Reserva activa</Typography>
                  <Typography variant="h5">{totales.activas}</Typography>
                </CardContent>
              </Card>
            </Stack>

            <TextField
              placeholder="Buscar obra..."
              variant="outlined"
              size="small"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              sx={{ maxWidth: 360 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress />
              </Box>
            ) : reservasFiltradas.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {reservas.length === 0
                    ? 'Todavía no hay Reservas de Obra'
                    : 'No hay reservas que coincidan con la búsqueda'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {reservas.length === 0
                    ? 'Usá "Asignar fondos" para crear la primera reserva de una obra'
                    : 'Probá ajustando la búsqueda o el filtro de activas'}
                </Typography>
              </Paper>
            ) : (
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Obra / Proyecto</TableCell>
                      <TableCell>Responsable actual</TableCell>
                      <TableCell align="right">Saldo ARS</TableCell>
                      <TableCell align="right">Saldo USD</TableCell>
                      <TableCell>Último movimiento</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservasFiltradas.map((r) => {
                      const chip = ESTADO_CHIP[r.estado] || { label: r.estado, color: 'default' };
                      const saldoArs = r.saldos?.ARS?.reservado || 0;
                      const saldoUsd = r.saldos?.USD?.reservado || 0;
                      return (
                        <TableRow key={r._id || r.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Avatar sx={{ width: 34, height: 34, bgcolor: avatarColor(r.proyecto_nombre || r.nombre), fontSize: '0.78rem', fontWeight: 700 }}>
                                {getInitials(r.proyecto_nombre || r.nombre)}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                  {r.proyecto_nombre || r.nombre || '—'}
                                </Typography>
                                {r.nombre && r.nombre !== r.proyecto_nombre && (
                                  <Typography variant="caption" color="text.secondary" noWrap>{r.nombre}</Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>{r.responsable_nombre || '—'}</TableCell>
                          <TableCell align="right">
                            {saldoArs === 0 ? (
                              <Typography variant="body2" color="text.secondary">$ 0</Typography>
                            ) : (
                              <Chip
                                label={formatCurrency(saldoArs, 'ARS')}
                                size="small"
                                color={saldoArs < 0 ? 'error' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {saldoUsd === 0 ? (
                              <Typography variant="body2" color="text.secondary">US$ 0</Typography>
                            ) : (
                              <Chip
                                label={formatCurrency(saldoUsd, 'USD')}
                                size="small"
                                color={saldoUsd < 0 ? 'error' : 'success'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>{r.updatedAt ? formatTimestamp(r.updatedAt) : '—'}</TableCell>
                          <TableCell>
                            <Chip label={chip.label} color={chip.color} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => router.push(`/reservaObra?id=${r._id || r.id}`)}
                            >
                              Ver Reserva
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Stack>
        </Container>

        {/* Dialog Asignar fondos */}
        <Dialog open={asignarOpen} onClose={() => setAsignarOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Asignar fondos a una Reserva</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Autocomplete
                options={proyectos}
                getOptionLabel={(p) => p?.nombre || ''}
                value={formProyecto}
                onChange={(e, val) => setFormProyecto(val)}
                renderInput={(params) => <TextField {...params} label="Obra / Proyecto" size="small" />}
              />
              <TextField
                select
                label="Moneda"
                value={formMoneda}
                onChange={(e) => setFormMoneda(e.target.value)}
                size="small"
              >
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
              <TextField
                label="Monto"
                type="number"
                value={formMonto}
                onChange={(e) => setFormMonto(e.target.value)}
                size="small"
              />
              <Autocomplete
                options={perfiles}
                getOptionLabel={(p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.phone || ''}
                value={formResponsable}
                onChange={(e, val) => setFormResponsable(val)}
                renderInput={(params) => <TextField {...params} label="Responsable (al crear la reserva)" size="small" />}
              />
              <TextField
                label="Observación"
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                size="small"
                multiline
                rows={2}
              />
              <Typography variant="caption" color="text.secondary">
                Asignar fondos no genera un egreso: es una separación interna del dinero de la obra.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAsignarOpen(false)}>Cancelar</Button>
            <Button onClick={handleAsignarFondos} variant="contained" disabled={asignarSaving}>
              {asignarSaving ? 'Asignando…' : 'Asignar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

ReservasObraPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ReservasObraPage;
