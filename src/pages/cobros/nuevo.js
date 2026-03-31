import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  Container,
  Fade,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Snackbar,
  Alert,
  FormHelperText,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import planCobroService from 'src/services/planCobroService';
import { CuotasTableEdit } from 'src/components/planCobro/CuotasTable';
import { formatCurrency } from 'src/utils/formatters';

const STEPS = ['Configuración del plan', 'Cuotas'];

const FRECUENCIAS = [
  { value: 'mensual', label: 'Mensual', days: 30 },
  { value: 'quincenal', label: 'Quincenal', days: 15 },
  { value: 'semanal', label: 'Semanal', days: 7 },
  { value: 'bimestral', label: 'Bimestral', days: 60 },
];

const defaultPlan = {
  nombre: '',
  proyecto_id: '',
  presupuesto_id: '',
  monto_total: '',
  moneda: 'ARS',
  indexacion: '',
  cac_tipo: 'general',
  fecha_base: '',
  notas: '',
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const NuevoPlanPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [empresaId, setEmpresaId] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [planData, setPlanData] = useState(defaultPlan);
  const [cuotas, setCuotas] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  // CAC preview state
  const [cacPreview, setCacPreview] = useState(null);
  const [cacLoading, setCacLoading] = useState(false);

  // Generador de cuotas
  const [generador, setGenerador] = useState({ cantidad: '', frecuencia: 'mensual', fecha_inicio: '', monto_cuota: '' });

  useEffect(() => {
    if (!user) return;
    getEmpresaDetailsFromUser(user).then((empresa) => {
      if (empresa?.id) {
        setEmpresaId(empresa.id);
        PresupuestoService.listarPresupuestos(empresa.id).then((list) => setPresupuestos(list || [])).catch(() => {});
      }
    });
    getProyectosFromUser(user).then((list) => setProyectos(list || []));
  }, [user]);

  // Fetch CAC preview when fecha_base or cac_tipo change
  useEffect(() => {
    if (planData.indexacion !== 'CAC' || !planData.fecha_base) {
      setCacPreview(null);
      return;
    }
    setCacLoading(true);
    planCobroService.previewCAC(planData.fecha_base, planData.cac_tipo)
      .then((res) => {
        const d = res?.data;
        if (d?.ok) setCacPreview(d.data);
        else setCacPreview(null);
      })
      .catch(() => setCacPreview(null))
      .finally(() => setCacLoading(false));
  }, [planData.indexacion, planData.fecha_base, planData.cac_tipo]);

  const handleFieldChange = (field) => (e) => {
    setPlanData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handlePresupuestoChange = (e) => {
    const id = e.target.value;
    const found = presupuestos.find((p) => p._id === id || p.id === id);
    setPlanData((prev) => ({
      ...prev,
      presupuesto_id: id,
      monto_total: found?.monto_total ? String(found.monto_total) : prev.monto_total,
    }));
  };

  const handleGenerar = () => {
    const cant = parseInt(generador.cantidad, 10);
    if (!cant || cant < 1 || !generador.fecha_inicio) return;
    const freq = FRECUENCIAS.find((f) => f.value === generador.frecuencia);
    const montoTotal = Number(planData.monto_total) || 0;
    const montoCuota = generador.monto_cuota
      ? Number(generador.monto_cuota)
      : montoTotal > 0
        ? Math.round((montoTotal / cant) * 100) / 100
        : 0;

    const nuevas = Array.from({ length: cant }, (_, i) => ({
      fecha_vencimiento: addDays(generador.fecha_inicio, freq.days * i),
      monto: montoCuota > 0 ? String(montoCuota) : '',
      descripcion: `Cuota ${i + 1}`,
    }));
    setCuotas(nuevas);
  };

  const sumaCuotas = useMemo(
    () => cuotas.reduce((s, c) => s + (Number(c.monto) || 0), 0),
    [cuotas]
  );

  const montoTotal = Number(planData.monto_total) || 0;
  const sumaDiff = montoTotal > 0 ? Math.abs(sumaCuotas - montoTotal) : 0;
  const sumaOk = montoTotal > 0 && sumaDiff < 0.01;

  const validarStep1 = () => {
    const errs = {};
    if (!planData.nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (!planData.moneda) errs.moneda = 'La moneda es requerida';
    if (planData.indexacion === 'CAC' && !planData.fecha_base)
      errs.fecha_base = 'La fecha base es requerida para indexación CAC';
    return errs;
  };

  const validarStep2 = () => {
    if (cuotas.length === 0) return { cuotas: 'Agregá al menos una cuota' };
    for (const c of cuotas) {
      if (!c.fecha_vencimiento) return { cuotas: 'Todas las cuotas deben tener fecha de vencimiento' };
      if (!c.monto || isNaN(c.monto) || Number(c.monto) <= 0)
        return { cuotas: 'Todos los montos deben ser mayores a 0' };
    }
    return {};
  };

  const handleNext = () => {
    const errs = validarStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(1);
  };

  const handleSubmit = async () => {
    const errs = validarStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        nombre: planData.nombre.trim(),
        proyecto_id: planData.proyecto_id || undefined,
        presupuesto_id: planData.presupuesto_id || undefined,
        monto_total: montoTotal || undefined,
        moneda: planData.moneda,
        indexacion: planData.indexacion || null,
        cac_tipo: planData.indexacion === 'CAC' ? planData.cac_tipo : null,
        fecha_base: planData.fecha_base || null,
        notas: planData.notas.trim() || undefined,
      };

      const res = await planCobroService.crearPlan(payload);
      const d = res?.data;
      if (!d?.ok) throw new Error(d?.error || 'Error al crear');
      const plan = d.data;

      const cuotasPayload = cuotas.map((c) => ({
        fecha_vencimiento: c.fecha_vencimiento,
        monto: Number(c.monto),
        descripcion: c.descripcion || undefined,
      }));
      const resConfirm = await planCobroService.confirmarPlan(plan._id, {
        empresa_id: empresaId,
        cuotas: cuotasPayload,
      });
      const dc = resConfirm?.data;
      if (!dc?.ok) throw new Error(dc?.error || 'Error al confirmar');

      router.push(`/cobros/${plan._id}`);
    } catch (err) {
      setAlert({ open: true, message: err.message || 'Error al guardar el plan', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const monedaDisplay = planData.moneda === 'CAC' ? 'ARS' : planData.moneda;

  return (
    <>
      <Head>
        <title>Nuevo Plan de Cobro | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="md">
          <Typography variant="h5" fontWeight={700} mb={3}>
            Nuevo Plan de Cobro
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Fade in={step === 0} mountOnEnter unmountOnExit>
              <Stack spacing={3} sx={{ display: step === 0 ? 'flex' : 'none' }}>
                <TextField
                  label="Nombre del plan *"
                  value={planData.nombre}
                  onChange={handleFieldChange('nombre')}
                  error={!!errors.nombre}
                  helperText={errors.nombre}
                  fullWidth
                />

                <TextField
                  label="Monto total del plan"
                  type="number"
                  value={planData.monto_total}
                  onChange={handleFieldChange('monto_total')}
                  fullWidth
                  inputProps={{ min: 0, step: '0.01' }}
                  helperText="Se usa para distribuir cuotas automáticamente y verificar la suma"
                />

                <FormControl fullWidth>
                  <InputLabel>Proyecto (opcional)</InputLabel>
                  <Select
                    value={planData.proyecto_id}
                    label="Proyecto (opcional)"
                    onChange={handleFieldChange('proyecto_id')}
                  >
                    <MenuItem value="">Sin proyecto</MenuItem>
                    {proyectos.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {presupuestos.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel>Presupuesto (opcional)</InputLabel>
                    <Select
                      value={planData.presupuesto_id}
                      label="Presupuesto (opcional)"
                      onChange={handlePresupuestoChange}
                    >
                      <MenuItem value="">Sin presupuesto</MenuItem>
                      {presupuestos.map((p) => (
                        <MenuItem key={p._id || p.id} value={p._id || p.id}>
                          {p.nombre || p.codigo || `Presupuesto #${p._id?.slice(-4)}`}
                          {p.monto_total ? ` — ${formatCurrency(p.monto_total, monedaDisplay)}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl fullWidth error={!!errors.moneda}>
                  <InputLabel>Moneda *</InputLabel>
                  <Select value={planData.moneda} label="Moneda *" onChange={handleFieldChange('moneda')}>
                    <MenuItem value="ARS">ARS - Pesos</MenuItem>
                    <MenuItem value="USD">USD - Dólares</MenuItem>
                    <MenuItem value="CAC">CAC - Costo de Construcción</MenuItem>
                  </Select>
                  {errors.moneda && <FormHelperText>{errors.moneda}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Indexación</InputLabel>
                  <Select
                    value={planData.indexacion}
                    label="Indexación"
                    onChange={handleFieldChange('indexacion')}
                  >
                    <MenuItem value="">Sin indexación</MenuItem>
                    <MenuItem value="CAC">CAC</MenuItem>
                    <MenuItem value="USD">USD</MenuItem>
                  </Select>
                </FormControl>

                {planData.indexacion === 'CAC' && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de índice CAC</InputLabel>
                      <Select
                        value={planData.cac_tipo}
                        label="Tipo de índice CAC"
                        onChange={handleFieldChange('cac_tipo')}
                      >
                        <MenuItem value="general">General</MenuItem>
                        <MenuItem value="mano_obra">Mano de obra</MenuItem>
                        <MenuItem value="materiales">Materiales</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label="Fecha base *"
                      type="date"
                      value={planData.fecha_base}
                      onChange={handleFieldChange('fecha_base')}
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.fecha_base}
                      helperText={errors.fecha_base || 'Se usa el CAC de 2 meses antes de esta fecha'}
                      fullWidth
                    />

                    {/* CAC Preview */}
                    {cacLoading && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">Consultando índice CAC...</Typography>
                      </Stack>
                    )}
                    {cacPreview && !cacLoading && (
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                          <InfoOutlinedIcon fontSize="small" color="info" />
                          <Typography variant="subtitle2">Preview del índice CAC</Typography>
                        </Stack>
                        <Typography variant="body2">
                          Valor: <strong>{cacPreview.valor}</strong>
                          {cacPreview.fecha_utilizada && ` (período ${cacPreview.fecha_utilizada})`}
                        </Typography>
                        {cacPreview.mano_obra != null && (
                          <Typography variant="caption" color="text.secondary">
                            Mano de obra: {cacPreview.mano_obra} · Materiales: {cacPreview.materiales}
                          </Typography>
                        )}
                      </Paper>
                    )}
                  </>
                )}

                <TextField
                  label="Notas"
                  value={planData.notas}
                  onChange={handleFieldChange('notas')}
                  multiline
                  rows={3}
                  fullWidth
                />

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button variant="outlined" onClick={() => router.push('/cobros')}>
                    Cancelar
                  </Button>
                  <Button variant="contained" onClick={handleNext}>
                    Siguiente
                  </Button>
                </Stack>
              </Stack>
            </Fade>

            <Fade in={step === 1} mountOnEnter unmountOnExit>
              <Stack spacing={3} sx={{ display: step === 1 ? 'flex' : 'none' }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Cuotas del plan — Moneda: {planData.moneda}
                </Typography>

                {/* Generador automático */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <AutoFixHighIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2">Generador automático de cuotas</Typography>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                    <TextField
                      label="Cantidad"
                      type="number"
                      size="small"
                      value={generador.cantidad}
                      onChange={(e) => setGenerador((g) => ({ ...g, cantidad: e.target.value }))}
                      inputProps={{ min: 1, max: 120 }}
                      sx={{ width: 100 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Frecuencia</InputLabel>
                      <Select
                        value={generador.frecuencia}
                        label="Frecuencia"
                        onChange={(e) => setGenerador((g) => ({ ...g, frecuencia: e.target.value }))}
                      >
                        {FRECUENCIAS.map((f) => (
                          <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Fecha inicio"
                      type="date"
                      size="small"
                      value={generador.fecha_inicio}
                      onChange={(e) => setGenerador((g) => ({ ...g, fecha_inicio: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 170 }}
                    />
                    <TextField
                      label={`Monto c/u (${monedaDisplay})`}
                      type="number"
                      size="small"
                      value={generador.monto_cuota}
                      onChange={(e) => setGenerador((g) => ({ ...g, monto_cuota: e.target.value }))}
                      inputProps={{ min: 0, step: '0.01' }}
                      sx={{ width: 140 }}
                      helperText={montoTotal > 0 ? 'Vacío = divide el total' : ''}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleGenerar}
                      disabled={!generador.cantidad || !generador.fecha_inicio}
                    >
                      Generar
                    </Button>
                  </Stack>
                </Paper>

                {/* Indicador suma vs total */}
                {montoTotal > 0 && cuotas.length > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2">
                      Total del plan: <strong>{formatCurrency(montoTotal, monedaDisplay)}</strong>
                    </Typography>
                    <Typography variant="body2">·</Typography>
                    <Typography variant="body2">
                      Suma de cuotas: <strong>{formatCurrency(sumaCuotas, monedaDisplay)}</strong>
                    </Typography>
                    <Chip
                      label={sumaOk ? 'Coincide' : `Diferencia: ${formatCurrency(sumaDiff, monedaDisplay)}`}
                      color={sumaOk ? 'success' : 'warning'}
                      size="small"
                    />
                  </Stack>
                )}

                <CuotasTableEdit
                  cuotas={cuotas}
                  onChange={setCuotas}
                  moneda={monedaDisplay}
                  showCAC={planData.indexacion === 'CAC'}
                  cacPreview={cacPreview}
                />

                {errors.cuotas && (
                  <Typography variant="caption" color="error">
                    {errors.cuotas}
                  </Typography>
                )}

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button variant="outlined" onClick={() => setStep(0)}>
                    Atrás
                  </Button>
                  <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Guardando...' : 'Crear plan'}
                  </Button>
                </Stack>
              </Stack>
            </Fade>
          </Paper>
        </Container>
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

NuevoPlanPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default NuevoPlanPage;
