// Detalle de Reserva de Obra (reserva interna de fondos de una obra/proyecto).
// Concepto distinto de la Caja Chica personal. Ver docs/RESERVA_DE_OBRA_TECNICO.md — Ticket 2.
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Stack, TextField, MenuItem, Grid,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Snackbar, Alert,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
  CircularProgress, Card, CardContent, Autocomplete, IconButton, Divider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import BalanceIcon from '@mui/icons-material/Balance';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import SouthIcon from '@mui/icons-material/South';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import LockIcon from '@mui/icons-material/Lock';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import reservaObraService from 'src/services/reservaObraService';
import profileService from 'src/services/profileService';
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

const TIPO_MOV = {
  asignacion: { label: 'Asignación', color: 'success' },
  reposicion: { label: 'Reposición', color: 'success' },
  ajuste: { label: 'Ajuste', color: 'warning' },
  egreso: { label: 'Egreso', color: 'error' },
};

const ROL_LABEL = { responsable: 'Responsable', operador: 'Operador', lector: 'Lector' };

const ReservaObraDetallePage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { id } = router.query;

  const [reserva, setReserva] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [selectedMoneda, setSelectedMoneda] = useState('ARS');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Dialog genérico de operación de ledger: asignacion | reposicion | ajuste
  const [ledgerDialog, setLedgerDialog] = useState(null); // null | 'asignacion' | 'reposicion' | 'ajuste'
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [formMoneda, setFormMoneda] = useState('ARS');
  const [formMonto, setFormMonto] = useState('');
  const [formObs, setFormObs] = useState('');

  // "Registrar gasto" reusa el form de movimientos real (no se duplica):
  // un gasto de reserva ES un MovimientoCaja (egreso) con reserva_id.
  const irARegistrarGasto = () => {
    if (!reserva) return;
    const backUrl = `/reservaObra?id=${id}`;
    const params = new URLSearchParams({
      proyectoId: reserva.proyecto_id || '',
      proyectoName: reserva.proyecto_nombre || '',
      reservaId: reserva._id || id,
      lastPageUrl: backUrl,
      lastPageName: `Reserva de Obra · ${reserva.proyecto_nombre || ''}`,
    });
    router.push(`/movementForm?${params.toString()}`);
  };

  // Dialog de participantes
  const [partOpen, setPartOpen] = useState(false);
  const [partSaving, setPartSaving] = useState(false);
  const [perfiles, setPerfiles] = useState([]);
  const [formPerfil, setFormPerfil] = useState(null);
  const [formRol, setFormRol] = useState('operador');

  // Permisos por acciones configuradas de la empresa (ver configuracionGeneral.js)
  const accionesEmpresa = user?.empresa?.acciones || user?.empresaData?.acciones || [];
  const permisosOcultos = user?.permisosOcultos || [];
  const tienePermiso = (accion) => accionesEmpresa.includes(accion) && !permisosOcultos.includes(accion);
  const puedeGestionar = user?.admin || tienePermiso('GESTIONAR_RESERVAS_OBRA');

  const fetchReserva = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [doc, movs] = await Promise.all([
        reservaObraService.obtener(id),
        reservaObraService.movimientos(id),
      ]);
      setReserva(doc);
      setMovimientos(movs);
    } catch (err) {
      console.error('Error cargando reserva:', err);
      setAlert({ open: true, message: 'Error al cargar la reserva', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!router.isReady || !user) return;
    fetchReserva();
  }, [router.isReady, user, fetchReserva]);

  // Título en la top-nav (breadcrumbs) en vez de un H4 dentro de la página.
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Reservas por obra', href: '/reservasObra', icon: <LockIcon fontSize="small" /> },
      { label: reserva ? `Reserva de Obra · ${reserva.proyecto_nombre || ''}` : 'Reserva de Obra', icon: <LockIcon fontSize="small" /> },
    ]);
    return () => setBreadcrumbs([]);
  }, [reserva, setBreadcrumbs]);

  const resetForm = () => {
    setFormMoneda(selectedMoneda);
    setFormMonto('');
    setFormObs('');
  };

  const handleLedgerSubmit = async () => {
    const monto = Number(formMonto);
    const esAjuste = ledgerDialog === 'ajuste';
    if (!Number.isFinite(monto) || monto === 0 || (!esAjuste && monto <= 0)) {
      setAlert({ open: true, message: esAjuste ? 'El ajuste debe ser un número distinto de 0' : 'El monto debe ser mayor a 0', severity: 'warning' });
      return;
    }
    setLedgerSaving(true);
    try {
      const payload = { moneda: formMoneda, monto, observacion: formObs || null };
      if (ledgerDialog === 'asignacion') await reservaObraService.asignarFondos(id, payload);
      else if (ledgerDialog === 'reposicion') await reservaObraService.registrarReposicion(id, payload);
      else await reservaObraService.registrarAjuste(id, payload);
      setAlert({ open: true, message: 'Movimiento registrado', severity: 'success' });
      setLedgerDialog(null);
      resetForm();
      await fetchReserva();
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      setAlert({ open: true, message: err?.response?.data?.error || err.message || 'Error al registrar', severity: 'error' });
    } finally {
      setLedgerSaving(false);
    }
  };


  const handleOpenParticipantes = async () => {
    setPartOpen(true);
    if (perfiles.length === 0) {
      try {
        const empId = user?.empresa?.id || user?.empresaData?.id || user?.empresa_id;
        const perfs = await profileService.getProfileByEmpresa(empId);
        setPerfiles(perfs || []);
      } catch (err) {
        console.error('Error cargando perfiles:', err);
      }
    }
  };

  const handleAgregarParticipante = async () => {
    if (!formPerfil) return;
    setPartSaving(true);
    try {
      const doc = await reservaObraService.agregarParticipante(id, {
        userId: formPerfil.id || formPerfil.user_id || null,
        userPhone: formPerfil.phone || null,
        nombre: [formPerfil.firstName, formPerfil.lastName].filter(Boolean).join(' '),
        rol: formRol,
      });
      setReserva(doc);
      setFormPerfil(null);
      setAlert({ open: true, message: 'Participante agregado', severity: 'success' });
    } catch (err) {
      console.error('Error agregando participante:', err);
      setAlert({ open: true, message: err?.response?.data?.error || 'Error al agregar participante', severity: 'error' });
    } finally {
      setPartSaving(false);
    }
  };

  const handleQuitarParticipante = async (p) => {
    try {
      const doc = await reservaObraService.quitarParticipante(id, p.user_id || p.user_phone);
      setReserva(doc);
    } catch (err) {
      console.error('Error quitando participante:', err);
      setAlert({ open: true, message: 'Error al quitar participante', severity: 'error' });
    }
  };

  const handleCloseAlert = () => setAlert({ ...alert, open: false });

  const chip = reserva ? (ESTADO_CHIP[reserva.estado] || { label: reserva.estado, color: 'default' }) : null;

  const LEDGER_TITLES = {
    asignacion: 'Agregar fondos',
    reposicion: 'Reposición',
    ajuste: 'Ajuste / Arqueo',
  };

  return (
    <>
      <Head>
        <title>{reserva ? `Reserva de Obra · ${reserva.proyecto_nombre || ''}` : 'Reserva de Obra'}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : !reserva ? (
            <Paper sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">No se encontró la reserva</Typography>
              <Button sx={{ mt: 2 }} onClick={() => router.push('/reservasObra')}>← Volver a Reservas por Obra</Button>
            </Paper>
          ) : (
            <Stack spacing={2.5}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip icon={<FolderOutlinedIcon />} label={`Proyecto: ${reserva.proyecto_nombre || '—'}`} size="small" variant="outlined" />
                  <Chip icon={<PersonOutlineIcon />} label={`Responsable actual: ${reserva.responsable_nombre || '—'}`} size="small" variant="outlined" />
                  {chip && <Chip label={chip.label} color={chip.color} size="small" />}
                </Stack>
                <ToggleButtonGroup
                  value={selectedMoneda}
                  exclusive
                  size="small"
                  onChange={(e, val) => val && setSelectedMoneda(val)}
                >
                  <ToggleButton value="ARS">ARS</ToggleButton>
                  <ToggleButton value="USD">USD</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Indicadores de la moneda seleccionada (mockup) */}
              {(() => {
                const sm = reserva.saldos?.[selectedMoneda] || {};
                const cards = [
                  { label: 'Saldo reservado actual', value: sm.reservado || 0, Icon: LockOutlinedIcon, bg: 'error.lighter', circle: '#FDE7E7', color: (sm.reservado || 0) >= 0 ? 'success.main' : 'error.main', iconColor: 'error.main' },
                  { label: 'Fondos asignados', value: sm.asignado || 0, Icon: AccountBalanceWalletOutlinedIcon, circle: '#E3F6EC', color: 'success.main', iconColor: 'success.main' },
                  { label: 'Gastos registrados', value: -(sm.gastado || 0), Icon: SouthIcon, circle: '#FDE7E7', color: 'error.main', iconColor: 'error.main' },
                  { label: 'Saldo disponible', value: sm.reservado || 0, Icon: AccountBalanceWalletOutlinedIcon, circle: '#EEF0F4', color: 'text.primary', iconColor: 'text.secondary' },
                ];
                return (
                  <Grid container spacing={2}>
                    {cards.map((c) => (
                      <Grid item xs={6} md={2.4} key={c.label}>
                        <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                          <CardContent>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: c.circle, color: c.iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                <c.Icon sx={{ fontSize: 20 }} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{c.label}</Typography>
                                <Typography variant="h6" sx={{ color: c.color, fontWeight: 700 }}>
                                  {formatCurrency(c.value, selectedMoneda)}
                                </Typography>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    <Grid item xs={6} md={2.4}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', bgcolor: 'action.hover' }}>
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Typography variant="caption" color="text.secondary">
                              La Reserva de Obra es una reserva interna de la obra.
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                );
              })()}

              {/* Acciones principales (requieren GESTIONAR_RESERVAS_OBRA, salvo Registrar gasto) */}
              <Box display="flex" gap={1} flexWrap="wrap">
                {puedeGestionar && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => { resetForm(); setLedgerDialog('asignacion'); }}
                  >
                    Agregar fondos
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RemoveCircleOutlineIcon />}
                  onClick={irARegistrarGasto}
                >
                  Registrar gasto
                </Button>
                {puedeGestionar && (
                  <Button
                    variant="outlined"
                    startIcon={<BalanceIcon />}
                    onClick={() => { resetForm(); setLedgerDialog('ajuste'); }}
                  >
                    Ajuste / Arqueo
                  </Button>
                )}
                {puedeGestionar && (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => { resetForm(); setLedgerDialog('reposicion'); }}
                  >
                    Reposición
                  </Button>
                )}
                <Box flexGrow={1} />
                <Button
                  variant="outlined"
                  startIcon={<PersonAddAltIcon />}
                  onClick={handleOpenParticipantes}
                >
                  Participantes ({(reserva.participantes || []).length})
                </Button>
              </Box>

              {/* Filtros + tabla de movimientos unificada (ledger + gastos) */}
              {(() => {
                const ql = busqueda.trim().toLowerCase();
                const movsVista = movimientos.filter((m) => (
                  (m.moneda || 'ARS') === selectedMoneda
                  && (!filtroTipo || m.tipo === filtroTipo)
                  && (!ql
                    || (m.observacion || '').toLowerCase().includes(ql)
                    || (m.nombre_proveedor || '').toLowerCase().includes(ql)
                    || (m.categoria || '').toLowerCase().includes(ql))
                ));
                return (
                  <>
                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                      <TextField
                        placeholder="Buscar por observación, proveedor o categoría"
                        size="small"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        sx={{ minWidth: 280, flex: 1 }}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
                      />
                      <TextField select size="small" label="Tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} sx={{ minWidth: 160 }}>
                        <MenuItem value="">Todos los tipos</MenuItem>
                        <MenuItem value="asignacion">Asignación</MenuItem>
                        <MenuItem value="egreso">Egreso</MenuItem>
                        <MenuItem value="ajuste">Ajuste</MenuItem>
                        <MenuItem value="reposicion">Reposición</MenuItem>
                      </TextField>
                      {(busqueda || filtroTipo) && (
                        <Button size="small" variant="text" onClick={() => { setBusqueda(''); setFiltroTipo(''); }}>
                          Limpiar filtros
                        </Button>
                      )}
                    </Stack>

                    {movsVista.length === 0 ? (
                      <Paper sx={{ p: 5, textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          {movimientos.length === 0 ? 'Sin movimientos todavía' : `Sin movimientos en ${selectedMoneda}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {movimientos.length === 0 ? 'Empezá agregando fondos a la reserva' : 'Probá cambiar de moneda o limpiar los filtros'}
                        </Typography>
                      </Paper>
                    ) : (
                      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Código</TableCell>
                              <TableCell>Fecha</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell align="right">Total</TableCell>
                              <TableCell align="right">Saldo luego del movimiento</TableCell>
                              <TableCell>Categoría</TableCell>
                              <TableCell>Proveedor</TableCell>
                              <TableCell>Observación</TableCell>
                              <TableCell>Cargado por</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {movsVista.map((m, index) => {
                              const tipoChip = TIPO_MOV[m.tipo] || { label: m.tipo, color: 'default' };
                              const esEgreso = m.tipo === 'egreso' || m.tipo === 'ajuste';
                              const montoMostrado = esEgreso && m.monto > 0 ? -m.monto : m.monto;
                              return (
                                <TableRow key={m._id || index} hover>
                                  <TableCell sx={{ color: 'text.secondary' }}>{m.codigo || '—'}</TableCell>
                                  <TableCell>{m.fecha ? formatTimestamp(m.fecha) : '—'}</TableCell>
                                  <TableCell>
                                    <Chip label={tipoChip.label} color={tipoChip.color} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: montoMostrado < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                                    {formatCurrency(montoMostrado, m.moneda)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {m.saldo_resultante != null ? formatCurrency(m.saldo_resultante, m.moneda) : '—'}
                                  </TableCell>
                                  <TableCell>{m.categoria || '—'}</TableCell>
                                  <TableCell>{m.nombre_proveedor || '—'}</TableCell>
                                  <TableCell>{m.observacion || '—'}</TableCell>
                                  <TableCell>{m.nombre_user || '—'}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Paper>
                    )}
                  </>
                );
              })()}
            </Stack>
          )}
        </Container>

        {/* Dialog ledger: asignacion / reposicion / ajuste */}
        <Dialog open={!!ledgerDialog} onClose={() => setLedgerDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{LEDGER_TITLES[ledgerDialog] || ''}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
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
                label={ledgerDialog === 'ajuste' ? 'Monto (+/- para arqueo)' : 'Monto'}
                type="number"
                value={formMonto}
                onChange={(e) => setFormMonto(e.target.value)}
                size="small"
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
                {ledgerDialog === 'ajuste'
                  ? 'El ajuste registra una diferencia de arqueo. Puede ser positivo o negativo.'
                  : 'No genera un egreso: es una separación interna del dinero de la obra.'}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLedgerDialog(null)}>Cancelar</Button>
            <Button onClick={handleLedgerSubmit} variant="contained" disabled={ledgerSaving}>
              {ledgerSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog participantes */}
        <Dialog open={partOpen} onClose={() => setPartOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Participantes de la Reserva</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              {(reserva?.participantes || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nadie participa de esta reserva todavía.
                </Typography>
              ) : (
                (reserva?.participantes || []).map((p, i) => (
                  <Box key={i} display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{p.nombre || p.user_phone || p.user_id}</Typography>
                      <Typography variant="caption" color="text.secondary">{ROL_LABEL[p.rol] || p.rol}</Typography>
                    </Box>
                    {puedeGestionar && (
                      <IconButton size="small" onClick={() => handleQuitarParticipante(p)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))
              )}
              {puedeGestionar && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Agregar participante</Typography>
                  <Autocomplete
                    options={perfiles}
                    getOptionLabel={(p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.phone || ''}
                    value={formPerfil}
                    onChange={(e, val) => setFormPerfil(val)}
                    renderInput={(params) => <TextField {...params} label="Usuario" size="small" />}
                  />
                  <TextField
                    select
                    label="Rol"
                    value={formRol}
                    onChange={(e) => setFormRol(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="responsable">Responsable</MenuItem>
                    <MenuItem value="operador">Operador</MenuItem>
                    <MenuItem value="lector">Lector</MenuItem>
                  </TextField>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPartOpen(false)}>Cerrar</Button>
            {puedeGestionar && (
              <Button onClick={handleAgregarParticipante} variant="contained" disabled={partSaving || !formPerfil}>
                {partSaving ? 'Agregando…' : 'Agregar'}
              </Button>
            )}
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

ReservaObraDetallePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ReservaObraDetallePage;
