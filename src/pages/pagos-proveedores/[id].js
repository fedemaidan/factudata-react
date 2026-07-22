import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ControlObraService from 'src/services/controlObra/controlObraService';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';

// Estados de cuota de PAGO (difieren de cobro: hay 'aprobada' + 'pagada_parcial').
const ESTADO_COLOR = {
  pendiente: 'info',
  pendiente_vencida: 'error',
  aprobada: 'primary',
  pagada: 'success',
  pagada_parcial: 'warning',
  pagada_parcial_vencida: 'warning',
  anulada: 'default',
};
const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  pendiente_vencida: 'Vencida',
  aprobada: 'Aprobada',
  pagada: 'Pagada',
  pagada_parcial: 'Pagada parcial',
  pagada_parcial_vencida: 'Pagada parcial vencida',
  anulada: 'Anulada',
};
const PLAN_COLOR = { activo: 'primary', completado: 'success', anulado: 'default' };

const money = (n, moneda) =>
  (Number(n) || 0).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 });

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

const DetallePlanPagoPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { id } = router.query;
  const planId = id ? String(id) : null;

  const [empresaId, setEmpresaId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [busy, setBusy] = useState(false);

  // Dialogs
  const [pagarCuota, setPagarCuota] = useState(null);
  const [tipoPago, setTipoPago] = useState('total'); // 'total' | 'parcial'
  const [montoParcial, setMontoParcial] = useState('');
  const [fechaPago, setFechaPago] = useState('');
  const [editCuota, setEditCuota] = useState(null);
  const [editForm, setEditForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  const [deleteCuota, setDeleteCuota] = useState(null);
  const [showAddCuota, setShowAddCuota] = useState(false);
  const [addForm, setAddForm] = useState({ monto: '', fecha_vencimiento: '', descripcion: '' });
  const [showPeriodicas, setShowPeriodicas] = useState(false);
  const [periForm, setPeriForm] = useState({ monto: '', cantidad: '', frecuencia: 'mensual', fecha_inicio: '', descripcion: '' });
  const [confirmEliminarPlan, setConfirmEliminarPlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((emp) => { if (emp?.id) setEmpresaId(emp.id); });
  }, [user]);

  const refresh = () => {
    if (!planId || !empresaId) return Promise.resolve();
    setLoading(true);
    return ControlObraService.getPlanPago(planId, empresaId)
      .then((p) => setPlan(p || null))
      .catch(() => setAlert({ open: true, message: 'No se pudo cargar el plan de pago', severity: 'error' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!planId || !empresaId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, empresaId]);

  const moneda = plan?.moneda || 'ARS';
  const resumen = plan?.resumen || {};
  const cuotas = useMemo(
    () => [...(plan?.cuotas || [])].sort((a, b) => (a.numero || 0) - (b.numero || 0)),
    [plan]
  );
  const pct = resumen.total ? Math.round((resumen.pagado || 0) / resumen.total * 100) : 0;

  const notify = (message, severity = 'success') => setAlert({ open: true, message, severity });

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (okMsg) notify(okMsg);
    } catch (err) {
      notify(err?.response?.data?.error?.message || err.message || 'Error en la operación', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ─── Acciones de cuota ───────────────────────────────────────────────────
  const handleAprobar = (cuota) =>
    run(() => ControlObraService.aprobarCuotaPago(planId, cuota._id, empresaId), 'Cuota aprobada');

  const handleRevertir = (cuota) =>
    run(() => ControlObraService.revertirPagoCuota(planId, cuota._id, empresaId), 'Pago revertido');

  const openPagar = (cuota) => {
    setPagarCuota(cuota);
    setTipoPago('total');
    setMontoParcial('');
    setFechaPago('');
  };
  const confirmarPago = () =>
    run(async () => {
      await ControlObraService.pagarCuotaPago(planId, pagarCuota._id, empresaId, {
        monto_parcial: tipoPago === 'parcial' ? Number(parseNumberInput(montoParcial)) : null,
        fecha_pago: fechaPago || null,
      });
      setPagarCuota(null);
    }, 'Pago registrado');

  const openEdit = (cuota) => {
    setEditCuota(cuota);
    setEditForm({
      monto: String(cuota.monto ?? ''),
      fecha_vencimiento: cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toISOString().split('T')[0] : '',
      descripcion: cuota.descripcion || '',
    });
  };
  const confirmarEdit = () =>
    run(async () => {
      await ControlObraService.editarCuotaPago(planId, editCuota._id, empresaId, {
        monto: Number(parseNumberInput(editForm.monto)),
        fecha_vencimiento: editForm.fecha_vencimiento || null,
        descripcion: editForm.descripcion || null,
      });
      setEditCuota(null);
    }, 'Cuota actualizada');

  const confirmarDelete = () =>
    run(async () => {
      await ControlObraService.eliminarCuotaPago(planId, deleteCuota._id, empresaId);
      setDeleteCuota(null);
    }, 'Cuota eliminada');

  const confirmarAdd = () =>
    run(async () => {
      await ControlObraService.agregarCuotaPago(planId, {
        empresa_id: empresaId,
        tipo: 'fija',
        monto: Number(parseNumberInput(addForm.monto)),
        fecha_vencimiento: addForm.fecha_vencimiento || null,
        descripcion: addForm.descripcion || null,
      });
      setShowAddCuota(false);
      setAddForm({ monto: '', fecha_vencimiento: '', descripcion: '' });
    }, 'Cuota agregada');

  const confirmarPeriodicas = () =>
    run(async () => {
      await ControlObraService.generarCuotasPeriodicas(planId, {
        empresa_id: empresaId,
        monto: Number(parseNumberInput(periForm.monto)),
        cantidad: Number(periForm.cantidad),
        frecuencia: periForm.frecuencia,
        fecha_inicio: periForm.fecha_inicio || null,
        descripcion: periForm.descripcion || null,
      });
      setShowPeriodicas(false);
      setPeriForm({ monto: '', cantidad: '', frecuencia: 'mensual', fecha_inicio: '', descripcion: '' });
    }, 'Cuotas periódicas generadas');

  const handleGenerarAvance = () =>
    run(() => ControlObraService.generarCuotasPorAvance(planId, empresaId), 'Cuotas por avance generadas');

  const handleEliminarPlan = () =>
    run(async () => {
      await ControlObraService.eliminarPlanPago(planId, empresaId);
      router.push(plan?.control_obra_id ? `/control-obra/${plan.control_obra_id}` : '/pagos-proveedores');
    });

  if (loading && !plan) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={240} />
          </Stack>
        </Container>
      </Box>
    );
  }

  if (!plan) {
    return (
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error">No se encontró el plan de pago.</Alert>
          <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => router.push('/pagos-proveedores')}>
            Volver
          </Button>
        </Container>
      </Box>
    );
  }

  const editable = plan.estado === 'activo';

  return (
    <>
      <Head>
        <title>{plan.nombre || 'Plan de pago'} | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(plan.control_obra_id ? `/control-obra/${plan.control_obra_id}` : '/pagos-proveedores')} sx={{ mb: 1 }}>
            Volver
          </Button>

          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2} mb={3}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight={700}>{plan.nombre}</Typography>
                <Chip size="small" label={plan.estado} color={PLAN_COLOR[plan.estado] || 'default'} />
                {plan.indexacion && <Chip size="small" variant="outlined" label={plan.indexacion} />}
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Proveedor: <strong>{plan.proveedor_nombre || 's/d'}</strong>
                {plan.obra_titulo ? ` · Obra: ${plan.obra_titulo}` : ''}
                {plan.moneda ? ` · ${plan.moneda}` : ''}
              </Typography>
              {plan.notas && <Typography variant="body2" color="text.secondary" mt={0.5}>{plan.notas}</Typography>}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {editable && (
                <>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setShowAddCuota(true)}>Agregar cuota</Button>
                  <Button size="small" variant="outlined" startIcon={<AutorenewIcon />} onClick={() => setShowPeriodicas(true)}>Periódicas</Button>
                  {/* "Por avance" solo aplica dentro de una obra (devenga contra sus sub-rubros). */}
                  {plan.control_obra_id && (
                    <Button size="small" variant="outlined" disabled={busy} onClick={handleGenerarAvance}>Generar por avance</Button>
                  )}
                </>
              )}
              <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => setConfirmEliminarPlan(true)}>Eliminar plan</Button>
            </Stack>
          </Stack>

          {/* Métricas */}
          <Grid container spacing={2} mb={3}>
            <MetricCard label="TOTAL DEL PLAN" value={money(resumen.total, moneda)} color="#1976d2" />
            <MetricCard label="PAGADO" value={money(resumen.pagado, moneda)} color="#2e7d32" />
            <MetricCard label="PENDIENTE" value={money(resumen.pendiente, moneda)} color="#c62828" />
            {resumen.vencido > 0 && <MetricCard label="VENCIDO" value={money(resumen.vencido, moneda)} color="#ed6c02" />}
          </Grid>

          {/* Progreso */}
          <Box mb={3}>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">Avance de pago</Typography>
              <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={pct} color={plan.estado === 'completado' ? 'success' : resumen.vencido > 0 ? 'error' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
          </Box>

          {busy && <LinearProgress sx={{ mb: 2 }} />}

          {/* Cronograma de cuotas */}
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1.5}>Cronograma de cuotas</Typography>
            {cuotas.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Este plan todavía no tiene cuotas. Agregá una cuota{plan.control_obra_id ? ', generá periódicas o generá por avance devengado del proveedor.' : ' o generá cuotas periódicas.'}
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell>Vencimiento</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="right">Pagado</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cuotas.map((c) => {
                      const estadoUi = c.estado_ui || c.estado;
                      const saldo = c.saldo != null ? c.saldo : (c.monto || 0) - (c.monto_pagado || 0);
                      const puedeAprobar = c.estado === 'pendiente';
                      const puedePagar = ['pendiente', 'aprobada', 'pagada_parcial'].includes(c.estado);
                      const puedeRevertir = ['pagada', 'pagada_parcial'].includes(c.estado);
                      const puedeEditar = ['pendiente', 'aprobada'].includes(c.estado);
                      return (
                        <TableRow key={c._id} hover>
                          <TableCell>{c.numero}</TableCell>
                          <TableCell>
                            {c.descripcion || c.tipo}
                            {c.tipo === 'por_avance' && <Chip size="small" variant="outlined" label="avance" sx={{ ml: 0.5 }} />}
                          </TableCell>
                          <TableCell>{fmtDate(c.fecha_vencimiento)}</TableCell>
                          <TableCell align="right">
                            {money(c.monto, moneda)}
                            {c.monto_cac != null && (
                              <Tooltip title="Monto en unidades CAC">
                                <Typography variant="caption" color="text.secondary" display="block">{formatNumberInput(Math.round((c.monto_cac || 0) * 100) / 100)} CAC</Typography>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">{c.monto_pagado ? money(c.monto_pagado, moneda) : '—'}</TableCell>
                          <TableCell><Chip size="small" label={ESTADO_LABEL[estadoUi] || estadoUi} color={ESTADO_COLOR[estadoUi] || 'default'} /></TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                              {puedeAprobar && (
                                <Button size="small" disabled={busy} onClick={() => handleAprobar(c)}>Aprobar</Button>
                              )}
                              {puedePagar && (
                                <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => openPagar(c)}>
                                  {c.estado === 'pagada_parcial' ? 'Pagar resto' : 'Pagar'}
                                </Button>
                              )}
                              {puedeEditar && (
                                <Tooltip title="Editar cuota"><span>
                                  <Button size="small" disabled={busy} onClick={() => openEdit(c)}><EditIcon fontSize="small" /></Button>
                                </span></Tooltip>
                              )}
                              {puedeRevertir && (
                                <Tooltip title="Revertir pago"><span>
                                  <Button size="small" color="warning" disabled={busy} onClick={() => handleRevertir(c)}><UndoIcon fontSize="small" /></Button>
                                </span></Tooltip>
                              )}
                              {puedeEditar && (
                                <Tooltip title="Eliminar cuota"><span>
                                  <Button size="small" color="error" disabled={busy} onClick={() => setDeleteCuota(c)}><DeleteIcon fontSize="small" /></Button>
                                </span></Tooltip>
                              )}
                            </Stack>
                            {saldo > 0 && c.estado === 'pagada_parcial' && (
                              <Typography variant="caption" color="text.secondary" display="block">Saldo: {money(saldo, moneda)}</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      {/* ─── Dialog: Pagar cuota ─── */}
      <Dialog open={!!pagarCuota} onClose={() => setPagarCuota(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar pago</DialogTitle>
        <DialogContent>
          {pagarCuota && (
            <Stack spacing={2} mt={0.5}>
              <Typography variant="body2" color="text.secondary">
                Cuota {pagarCuota.numero} · {money(pagarCuota.monto, moneda)} · vence {fmtDate(pagarCuota.fecha_vencimiento)}
              </Typography>
              <ToggleButtonGroup value={tipoPago} exclusive size="small" onChange={(_, v) => { if (v) setTipoPago(v); }}>
                <ToggleButton value="total">Pago total</ToggleButton>
                <ToggleButton value="parcial">Pago parcial</ToggleButton>
              </ToggleButtonGroup>
              {tipoPago === 'parcial' && (
                <TextField
                  label="Monto a pagar" size="small"
                  value={formatNumberInput(montoParcial)}
                  onChange={(e) => setMontoParcial(parseNumberInput(e.target.value))}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={`Saldo de la cuota: ${money((pagarCuota.saldo != null ? pagarCuota.saldo : pagarCuota.monto), moneda)}`}
                  inputProps={{ inputMode: 'decimal' }}
                />
              )}
              <TextField
                label="Fecha de pago" type="date" size="small"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Opcional. Por defecto, hoy."
              />
              <Typography variant="caption" color="text.secondary">
                Se genera un egreso en la caja imputado a los sub-rubros del proveedor.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagarCuota(null)}>Cancelar</Button>
          <Button variant="contained" color="success" disabled={busy} onClick={confirmarPago}>Registrar pago</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Editar cuota ─── */}
      <Dialog open={!!editCuota} onClose={() => setEditCuota(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar cuota</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Monto" size="small"
              value={formatNumberInput(editForm.monto)}
              onChange={(e) => setEditForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Vencimiento" type="date" size="small"
              value={editForm.fecha_vencimiento}
              onChange={(e) => setEditForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Descripción" size="small"
              value={editForm.descripcion}
              onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCuota(null)}>Cancelar</Button>
          <Button variant="contained" disabled={busy} onClick={confirmarEdit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Eliminar cuota ─── */}
      <Dialog open={!!deleteCuota} onClose={() => setDeleteCuota(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar cuota</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteCuota && `¿Eliminar la cuota ${deleteCuota.numero} de ${money(deleteCuota.monto, moneda)}? Esta acción no se puede deshacer.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCuota(null)}>Cancelar</Button>
          <Button variant="contained" color="error" disabled={busy} onClick={confirmarDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Agregar cuota ─── */}
      <Dialog open={showAddCuota} onClose={() => setShowAddCuota(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar cuota</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Monto *" size="small"
              value={formatNumberInput(addForm.monto)}
              onChange={(e) => setAddForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Vencimiento" type="date" size="small"
              value={addForm.fecha_vencimiento}
              onChange={(e) => setAddForm((f) => ({ ...f, fecha_vencimiento: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Descripción" size="small"
              value={addForm.descripcion}
              onChange={(e) => setAddForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddCuota(false)}>Cancelar</Button>
          <Button variant="contained" disabled={busy || !parseNumberInput(addForm.monto)} onClick={confirmarAdd}>Agregar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Generar periódicas ─── */}
      <Dialog open={showPeriodicas} onClose={() => setShowPeriodicas(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Generar cuotas periódicas</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <TextField
              label="Monto por cuota *" size="small"
              value={formatNumberInput(periForm.monto)}
              onChange={(e) => setPeriForm((f) => ({ ...f, monto: parseNumberInput(e.target.value) }))}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Cantidad *" type="number" size="small"
              value={periForm.cantidad}
              onChange={(e) => setPeriForm((f) => ({ ...f, cantidad: e.target.value }))}
              inputProps={{ min: 1, max: 120 }}
            />
            <ToggleButtonGroup
              value={periForm.frecuencia} exclusive size="small"
              onChange={(_, v) => { if (v) setPeriForm((f) => ({ ...f, frecuencia: v })); }}
            >
              <ToggleButton value="semanal">Semanal</ToggleButton>
              <ToggleButton value="quincenal">Quincenal</ToggleButton>
              <ToggleButton value="mensual">Mensual</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Fecha primera cuota" type="date" size="small"
              value={periForm.fecha_inicio}
              onChange={(e) => setPeriForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Descripción base" size="small"
              value={periForm.descripcion}
              onChange={(e) => setPeriForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPeriodicas(false)}>Cancelar</Button>
          <Button variant="contained" disabled={busy || !parseNumberInput(periForm.monto) || !periForm.cantidad} onClick={confirmarPeriodicas}>Generar</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog: Eliminar plan ─── */}
      <Dialog open={confirmEliminarPlan} onClose={() => setConfirmEliminarPlan(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar plan de pago</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se eliminarán el plan y todas sus cuotas. Los egresos generados por cuotas pagadas se revierten de la caja. ¿Continuar?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminarPlan(false)}>Cancelar</Button>
          <Button variant="contained" color="error" disabled={busy} onClick={() => { setConfirmEliminarPlan(false); handleEliminarPlan(); }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
};

function MetricCard({ label, value, color }) {
  return (
    <Grid item xs={6} sm={3}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderTop: `3px solid ${color}` }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="h6" fontWeight={700}>{value}</Typography>
      </Paper>
    </Grid>
  );
}

DetallePlanPagoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default DetallePlanPagoPage;
