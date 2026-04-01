import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Fade,
  Grid,
  InputAdornment,
  MenuItem,
  Radio,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Snackbar,
  Alert,
  FormHelperText,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoService from 'src/services/presupuestoService';
import planCobroService from 'src/services/planCobroService';
import { CuotasTableEdit } from 'src/components/planCobro/CuotasTable';
import { formatCurrency, formatNumberInput, parseNumberInput } from 'src/utils/formatters';

const STEPS = ['Datos del plan', 'Distribución', 'Ajustar montos', 'Confirmar'];

const FRECUENCIAS = [
  { value: 'mensual',     label: 'Mensual',        meses: 1    },
  { value: 'bimestral',   label: 'Bimestral',      meses: 2    },
  { value: 'trimestral',  label: 'Trimestral',     meses: 3    },
  { value: 'avance_obra', label: 'Avance de obra', meses: null },
  { value: 'custom',      label: 'Cada X meses',   meses: null },
];

const FRECUENCIA_LABELS = {
  mensual: 'mensuales', bimestral: 'bimestrales', trimestral: 'trimestrales',
  avance_obra: 'por avance de obra', custom: 'cada X meses',
};

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

const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
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
  const [generador, setGenerador] = useState({ cantidad: '', frecuencia: 'mensual', fecha_inicio: '', monto_cuota: '', custom_meses: '2' });
  const [modoDistribucion, setModoDistribucion] = useState('iguales'); // 'iguales' | 'personalizados'
  const [cantPersonalizados, setCantPersonalizados] = useState('');
  const [usaPorcentaje, setUsaPorcentaje] = useState(false);
  const [porcentajes, setPorcentajes] = useState([]);

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
    const val = field === 'monto_total' ? parseNumberInput(e.target.value) : e.target.value;
    setPlanData((prev) => ({ ...prev, [field]: val }));
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
    if (!cant || cant < 1) return;
    const freq = FRECUENCIAS.find((f) => f.value === generador.frecuencia);
    const mesesEfectivos = freq.value === 'custom' ? parseInt(generador.custom_meses, 10) || 1 : freq.meses;
    if (mesesEfectivos !== null && !generador.fecha_inicio) return;
    const montoTotal = Number(planData.monto_total) || 0;
    const montoCuota = generador.monto_cuota
      ? Number(generador.monto_cuota)
      : montoTotal > 0
        ? Math.round((montoTotal / cant) * 100) / 100
        : 0;

    const nuevas = Array.from({ length: cant }, (_, i) => ({
      fecha_vencimiento: mesesEfectivos !== null && generador.fecha_inicio
        ? addMonths(generador.fecha_inicio, mesesEfectivos * i)
        : '',
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
    const errs = {};
    if (modoDistribucion === 'iguales') {
      if (!generador.cantidad || parseInt(generador.cantidad, 10) < 1)
        errs.generador = 'Ingresá la cantidad de cuotas';
      const freq = FRECUENCIAS.find((f) => f.value === generador.frecuencia);
      const mesesEff = freq?.value === 'custom' ? parseInt(generador.custom_meses, 10) || 1 : freq?.meses;
      if (mesesEff !== null && !generador.fecha_inicio)
        errs.generador = 'Ingresá la fecha de la primera cuota';
    }
    return errs;
  };

  const validarStep3 = () => {
    if (cuotas.length === 0) return { cuotas: 'Agregá al menos una cuota' };
    const requireFecha = modoDistribucion === 'iguales' && generador.frecuencia !== 'avance_obra';
    for (const c of cuotas) {
      if (requireFecha && !c.fecha_vencimiento) return { cuotas: 'Todas las cuotas deben tener fecha de vencimiento' };
      if (!c.monto || isNaN(c.monto) || Number(c.monto) <= 0)
        return { cuotas: 'Todos los montos deben ser mayores a 0' };
    }
    return {};
  };

  const handleNext = () => {
    if (step === 0) {
      const errs = validarStep1();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    if (step === 1) {
      const errs = validarStep2();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      // Auto-generar cuotas al avanzar si modo iguales
      if (modoDistribucion === 'iguales') {
        handleGenerar();
      } else {
        // Modo personalizado
        const cant = parseInt(cantPersonalizados, 10);
        if (cant > 0 && usaPorcentaje) {
          setCuotas(porcentajes.map((pct, i) => ({
            fecha_vencimiento: '',
            monto: montoTotal > 0 ? String(Math.round(montoTotal * (Number(pct) || 0) / 100 * 100) / 100) : '',
            descripcion: `Cuota ${i + 1}`,
          })));
        } else if (cant > 0) {
          setCuotas(Array.from({ length: cant }, (_, i) => ({
            fecha_vencimiento: '',
            monto: '',
            descripcion: `Cuota ${i + 1}`,
          })));
        } else if (cuotas.length === 0) {
          setCuotas([{ fecha_vencimiento: '', monto: '', descripcion: '' }]);
        }
      }
    }
    if (step === 2) {
      const errs = validarStep3();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    const errs = validarStep3();
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

  const monedaDisplay = planData.moneda;

  return (
    <>
      <Head>
        <title>Nuevo Plan de Cobro | Sorby</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h5" fontWeight={700} mb={1}>
            Nuevo plan de cobro
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {STEPS.map((label, i) => (
              <Step key={label} completed={step > i}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ─── PASO 0: DATOS GENERALES ─── */}
          <Fade in={step === 0} mountOnEnter unmountOnExit>
            <Box sx={{ display: step === 0 ? 'block' : 'none' }}>
              <Grid container spacing={4}>
                {/* Columna izquierda: campos del plan */}
                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <TextField
                      label="Nombre del plan *"
                      value={planData.nombre}
                      onChange={handleFieldChange('nombre')}
                      error={!!errors.nombre}
                      helperText={errors.nombre}
                      fullWidth
                    />

                    <FormControl fullWidth error={!!errors.proyecto_id}>
                      <InputLabel>Proyecto asociado *</InputLabel>
                      <Select
                        value={planData.proyecto_id}
                        label="Proyecto asociado *"
                        onChange={handleFieldChange('proyecto_id')}
                      >
                        <MenuItem value="">Sin proyecto</MenuItem>
                        {proyectos.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.nombre}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.proyecto_id && <FormHelperText>{errors.proyecto_id}</FormHelperText>}
                    </FormControl>

                    {presupuestos.length > 0 && (
                      <Box>
                        <FormControl fullWidth>
                          <InputLabel>Presupuesto de ingreso (opcional)</InputLabel>
                          <Select
                            value={planData.presupuesto_id}
                            label="Presupuesto de ingreso (opcional)"
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
                        {planData.presupuesto_id && (
                          <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'info.main' }} />
                            <Typography variant="caption" color="text.secondary">
                              El monto total se pre-llena desde el presupuesto
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    )}

                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <ToggleButtonGroup
                        value={planData.moneda}
                        exclusive
                        onChange={(_, val) => {
                          if (!val) return;
                          setPlanData((prev) => ({
                            ...prev,
                            moneda: val,
                            indexacion: val === 'USD' ? '' : prev.indexacion,
                          }));
                          setErrors((prev) => ({ ...prev, moneda: '' }));
                        }}
                        sx={{
                          height: 56,
                          '& .MuiToggleButton-root': { px: 2, fontWeight: 600 },
                        }}
                      >
                        <ToggleButton value="ARS">ARS</ToggleButton>
                        <ToggleButton value="USD">USD</ToggleButton>
                      </ToggleButtonGroup>
                      <TextField
                        label="Monto total a cobrar *"
                        value={formatNumberInput(planData.monto_total)}
                        onChange={handleFieldChange('monto_total')}
                        fullWidth
                        inputProps={{ inputMode: 'decimal' }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                      />
                    </Stack>

                    <TextField
                      label="Notas"
                      value={planData.notas}
                      onChange={handleFieldChange('notas')}
                      multiline
                      rows={3}
                      fullWidth
                      placeholder="Observaciones adicionales..."
                    />
                  </Stack>
                </Grid>

                {/* Columna derecha: Indexación */}
                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', height: '100%' }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                      Indexación
                    </Typography>

                    {planData.moneda === 'USD' ? (
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Al operar en dólares no se aplica indexación.
                        </Typography>
                      </Stack>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" mb={1.5}>
                          Ajuste por inflación
                        </Typography>
                        <Stack spacing={1} mb={3}>
                          {[
                            { value: '', label: 'Sin ajuste (pesos fijos)' },
                            { value: 'CAC', label: 'CAC (Cámara de la Construcción)' },
                            { value: 'USD', label: 'Dólar (indexado a tipo de cambio)' },
                          ].map((opt) => (
                            <Paper
                              key={opt.value}
                              variant="outlined"
                              onClick={() => {
                                setPlanData((prev) => ({ ...prev, indexacion: opt.value }));
                                setErrors((prev) => ({ ...prev, moneda: '' }));
                              }}
                              sx={{
                                p: 1.5,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                borderColor: planData.indexacion === opt.value ? 'primary.main' : 'divider',
                                borderWidth: planData.indexacion === opt.value ? 2 : 1,
                                bgcolor: planData.indexacion === opt.value ? 'primary.50' : 'background.paper',
                                transition: 'all 0.15s',
                                '&:hover': { borderColor: 'primary.light' },
                              }}
                            >
                              <Radio
                                checked={planData.indexacion === opt.value}
                                size="small"
                                sx={{ p: 0 }}
                              />
                              <Typography variant="body2" fontWeight={planData.indexacion === opt.value ? 600 : 400}>
                                {opt.label}
                              </Typography>
                            </Paper>
                          ))}
                        </Stack>
                        {errors.moneda && (
                          <Typography variant="caption" color="error" display="block" mb={1}>
                            {errors.moneda}
                          </Typography>
                        )}

                    {planData.indexacion === 'CAC' && (
                      <>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Tipo de índice CAC
                        </Typography>
                        <ToggleButtonGroup
                          value={planData.cac_tipo}
                          exclusive
                          onChange={(_, val) => {
                            if (val) setPlanData((prev) => ({ ...prev, cac_tipo: val }));
                          }}
                          size="small"
                          sx={{ mb: 3 }}
                        >
                          <ToggleButton value="general">Promedio</ToggleButton>
                          <ToggleButton value="mano_obra">M. de Obra</ToggleButton>
                          <ToggleButton value="materiales">Materiales</ToggleButton>
                        </ToggleButtonGroup>

                        <Paper
                          variant="outlined"
                          sx={{ p: 2, bgcolor: 'info.50', borderColor: 'info.200', borderRadius: 1.5 }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" color="text.secondary">
                              Fecha base
                            </Typography>
                            <TextField
                              type="date"
                              size="small"
                              value={planData.fecha_base}
                              onChange={handleFieldChange('fecha_base')}
                              InputLabelProps={{ shrink: true }}
                              error={!!errors.fecha_base}
                              sx={{ width: 170 }}
                            />
                          </Stack>
                          {errors.fecha_base && (
                            <Typography variant="caption" color="error" display="block" mb={1}>
                              {errors.fecha_base}
                            </Typography>
                          )}

                          {cacLoading && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <CircularProgress size={14} />
                              <Typography variant="caption" color="text.secondary">
                                Consultando índice...
                              </Typography>
                            </Stack>
                          )}
                          {cacPreview && !cacLoading && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                Índice aplicado
                              </Typography>
                              <Typography variant="body2" fontWeight={700} color="primary.main">
                                CAC {planData.cac_tipo === 'general' ? 'Promedio' : planData.cac_tipo === 'mano_obra' ? 'M. Obra' : 'Mat.'}{' '}
                                {cacPreview.cac_fecha || ''} = {cacPreview.cac_indice}
                              </Typography>
                            </Stack>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                            <InfoOutlinedIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                            Se usa el índice de 2 meses antes de la fecha base (igual que Presupuestos).
                          </Typography>
                        </Paper>
                      </>
                    )}
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Botones Paso 0 */}
              <Stack direction="row" justifyContent="flex-end" spacing={2} mt={4}>
                <Button variant="outlined" onClick={() => router.push('/cobros')}>
                  Cancelar
                </Button>
                <Button variant="contained" onClick={handleNext} sx={{ px: 4 }}>
                  Continuar →
                </Button>
              </Stack>
            </Box>
          </Fade>

          {/* ─── PASO 1: DISTRIBUCIÓN ─── */}
          <Fade in={step === 1} mountOnEnter unmountOnExit>
            <Box sx={{ display: step === 1 ? 'block' : 'none' }}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                ¿Cómo distribuir los pagos?
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Total a cobrar: <strong>{formatCurrency(montoTotal, monedaDisplay)}</strong>
              </Typography>

              {/* Tarjetas de modo */}
              <Grid container spacing={3} mb={4}>
                {[
                  {
                    value: 'iguales',
                    icon: <GridViewIcon sx={{ fontSize: 36 }} />,
                    title: 'Cuotas iguales',
                    desc: 'Dividí el total en N cuotas del mismo monto, con frecuencia fija.',
                  },
                  {
                    value: 'personalizados',
                    icon: <ViewListIcon sx={{ fontSize: 36 }} />,
                    title: 'Montos personalizados',
                    desc: 'Definí cada cuota a mano con el monto y la fecha que quieras.',
                  },
                ].map((modo) => (
                  <Grid item xs={12} sm={6} key={modo.value}>
                    <Paper
                      variant="outlined"
                      onClick={() => setModoDistribucion(modo.value)}
                      sx={{
                        p: 3,
                        cursor: 'pointer',
                        textAlign: 'center',
                        borderColor: modoDistribucion === modo.value ? 'primary.main' : 'divider',
                        borderWidth: modoDistribucion === modo.value ? 2 : 1,
                        bgcolor: modoDistribucion === modo.value ? 'primary.50' : 'background.paper',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: 'primary.light', bgcolor: 'grey.50' },
                      }}
                    >
                      <Box sx={{ color: modoDistribucion === modo.value ? 'primary.main' : 'text.secondary', mb: 1 }}>
                        {modo.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {modo.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {modo.desc}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              {/* Configuración según modo */}
              {modoDistribucion === 'iguales' && (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end" flexWrap="wrap">
                      <TextField
                        label="Cantidad de cuotas"
                        type="number"
                        size="small"
                        value={generador.cantidad}
                        onChange={(e) => setGenerador((g) => ({ ...g, cantidad: e.target.value }))}
                        error={!!errors.generador}
                        sx={{ width: 140 }}
                        inputProps={{ min: 1 }}
                      />
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">Frecuencia</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {FRECUENCIAS.map((f) => (
                            <Button
                              key={f.value}
                              variant={generador.frecuencia === f.value ? 'contained' : 'outlined'}
                              size="small"
                              onClick={() => setGenerador((g) => ({ ...g, frecuencia: f.value }))}
                              sx={{ borderRadius: 2, textTransform: 'none', minWidth: 0 }}
                            >
                              {f.label}
                            </Button>
                          ))}
                        </Stack>
                      </Stack>
                      {generador.frecuencia === 'custom' && (
                        <TextField
                          label="Cada cuántos meses"
                          type="number"
                          size="small"
                          value={generador.custom_meses}
                          onChange={(e) => setGenerador((g) => ({ ...g, custom_meses: e.target.value }))}
                          sx={{ width: 130 }}
                          inputProps={{ min: 1, max: 24 }}
                        />
                      )}
                      {generador.frecuencia !== 'avance_obra' && (
                        <TextField
                          label="Fecha primera cuota"
                          type="date"
                          size="small"
                          value={generador.fecha_inicio}
                          onChange={(e) => setGenerador((g) => ({ ...g, fecha_inicio: e.target.value }))}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 180 }}
                        />
                      )}
                    </Stack>
                    {errors.generador && (
                      <Typography color="error" variant="caption">{errors.generador}</Typography>
                    )}
                    {generador.cantidad && (generador.frecuencia === 'avance_obra' || generador.fecha_inicio) && montoTotal > 0 && (() => {
                      const freq = FRECUENCIAS.find((f) => f.value === generador.frecuencia);
                      const mesesEff = freq?.value === 'custom' ? parseInt(generador.custom_meses, 10) || 1 : freq?.meses;
                      const cant = parseInt(generador.cantidad, 10);
                      return (
                        <Paper sx={{ p: 2, bgcolor: '#F0FAF7', border: '1px solid #B2DFDB', borderRadius: 1.5 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <CalendarTodayIcon sx={{ fontSize: 18, color: '#1B9E85' }} />
                            <Typography variant="body2">
                              <strong>{cant} cuotas</strong>
                              {freq?.value === 'custom'
                                ? <> cada <strong>{mesesEff} mes{mesesEff !== 1 ? 'es' : ''}</strong></>
                                : <> {FRECUENCIA_LABELS[generador.frecuencia] || generador.frecuencia}</>}
                              {' '}de <strong>{formatCurrency(Math.round((montoTotal / cant) * 100) / 100, monedaDisplay)}</strong>
                              {generador.fecha_inicio && (
                                <>{' '}desde el <strong>{new Date(generador.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR')}</strong></>
                              )}
                            </Typography>
                          </Stack>
                        </Paper>
                      );
                    })()}
                    <Button
                      variant="contained"
                      onClick={handleGenerar}
                      disabled={!generador.cantidad || (!generador.fecha_inicio && generador.frecuencia !== 'avance_obra')}
                      startIcon={<AutorenewIcon />}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', borderRadius: 2 }}
                    >
                      Generar cuotas
                    </Button>
                  </Stack>
                </Paper>
              )}

              {modoDistribucion === 'personalizados' && (
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Cantidad de cuotas"
                      type="number"
                      size="small"
                      value={cantPersonalizados}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCantPersonalizados(val);
                        const n = parseInt(val, 10);
                        if (n > 0) setPorcentajes(Array.from({ length: n }, () => ''));
                      }}
                      inputProps={{ min: 1, max: 120 }}
                      sx={{ width: 200 }}
                    />

                    {cantPersonalizados && parseInt(cantPersonalizados, 10) > 0 && (
                      <>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={usaPorcentaje}
                              onChange={(e) => setUsaPorcentaje(e.target.checked)}
                            />
                          }
                          label="Distribuir por porcentaje"
                        />

                        {usaPorcentaje && (
                          <Box>
                            <Typography variant="body2" color="text.secondary" mb={1.5}>
                              Ingresá el % de cada cuota (deben sumar 100%)
                            </Typography>
                            <Stack spacing={1}>
                              {porcentajes.map((pct, i) => (
                                <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                                  <Typography variant="body2" sx={{ minWidth: 70 }}>Cuota {i + 1}</Typography>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={pct}
                                    onChange={(e) => {
                                      const newPcts = [...porcentajes];
                                      newPcts[i] = e.target.value;
                                      setPorcentajes(newPcts);
                                    }}
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                    }}
                                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                                    sx={{ width: 120 }}
                                  />
                                  {montoTotal > 0 && pct && (
                                    <Typography variant="caption" color="text.secondary">
                                      = {formatCurrency(Math.round(montoTotal * Number(pct) / 100 * 100) / 100, monedaDisplay)}
                                    </Typography>
                                  )}
                                </Stack>
                              ))}
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ mt: 1.5 }}
                              color={Math.abs(porcentajes.reduce((s, p) => s + (Number(p) || 0), 0) - 100) < 0.01 ? 'success.main' : 'warning.main'}
                              fontWeight={600}
                            >
                              Total: {porcentajes.reduce((s, p) => s + (Number(p) || 0), 0).toFixed(1)}%
                              {Math.abs(porcentajes.reduce((s, p) => s + (Number(p) || 0), 0) - 100) < 0.01 ? ' ✓' : ' (debe sumar 100%)'}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}

                    {(!usaPorcentaje || !cantPersonalizados) && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {cantPersonalizados && parseInt(cantPersonalizados, 10) > 0
                            ? 'En el siguiente paso vas a poder editar los montos y fechas de cada cuota.'
                            : 'En el siguiente paso vas a poder agregar y editar cada cuota manualmente.'}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Botones Paso 1 */}
              <Stack direction="row" justifyContent="flex-end" spacing={2} mt={4}>
                <Button variant="outlined" onClick={() => setStep(0)}>
                  ← Atrás
                </Button>
                <Button variant="contained" onClick={handleNext} sx={{ px: 4 }}>
                  Continuar →
                </Button>
              </Stack>
            </Box>
          </Fade>

          {/* ─── PASO 2: AJUSTAR MONTOS ─── */}
          <Fade in={step === 2} mountOnEnter unmountOnExit>
            <Box sx={{ display: step === 2 ? 'block' : 'none' }}>
              <Typography variant="h6" fontWeight={600} mb={0.5}>
                {modoDistribucion === 'iguales' ? 'Revisá y ajustá los montos' : 'Definí tus cuotas'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                {modoDistribucion === 'iguales'
                  ? 'Las cuotas se generaron automáticamente. Podés ajustar montos individuales si necesitás redondear o redistribuir.'
                  : 'Agregá las cuotas con las fechas y montos que necesites.'}
              </Typography>

              {/* Indicador suma vs total */}
              {montoTotal > 0 && cuotas.length > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 3,
                    borderColor: sumaOk ? 'success.main' : 'warning.main',
                    bgcolor: sumaOk ? '#E8F5E9' : '#FFF8E1',
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ sm: 'center' }}
                    spacing={1}
                  >
                    <Typography variant="body2">
                      Total del plan: <strong>{formatCurrency(montoTotal, monedaDisplay)}</strong>
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {sumaOk ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      ) : (
                        <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={sumaOk ? 'success.main' : 'warning.main'}
                      >
                        Suma de cuotas: {formatCurrency(sumaCuotas, monedaDisplay)}
                        {sumaOk ? ' — cuadra' : ` (dif: ${formatCurrency(sumaDiff, monedaDisplay)})`}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {/* Regenerar (solo modo iguales) */}
              {modoDistribucion === 'iguales' && (
                <Stack direction="row" justifyContent="flex-end" mb={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReplayIcon />}
                    onClick={handleGenerar}
                  >
                    Regenerar cuotas
                  </Button>
                </Stack>
              )}

              {/* Tabla de cuotas */}
              <CuotasTableEdit
                cuotas={cuotas}
                onChange={setCuotas}
                moneda={monedaDisplay}
                showCAC={planData.indexacion === 'CAC'}
                cacPreview={cacPreview}
                montoTotal={montoTotal}
              />

              {errors.cuotas && (
                <Typography variant="caption" color="error" mt={1} display="block">
                  {errors.cuotas}
                </Typography>
              )}

              {/* Warning banner */}
              {montoTotal > 0 && cuotas.length > 0 && !sumaOk && (
                <Paper
                  sx={{ mt: 3, p: 2, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 1.5 }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <WarningAmberIcon sx={{ color: '#F9A825', mt: 0.2 }} />
                    <Typography variant="body2">
                      <strong>Aviso:</strong> los montos no suman exactamente el total del plan.{' '}
                      <strong>No bloquea la creación</strong> — el total puede ser referencial.
                    </Typography>
                  </Stack>
                </Paper>
              )}

              {/* Botones Paso 2 */}
              <Stack direction="row" justifyContent="flex-end" spacing={2} mt={4}>
                <Button variant="outlined" onClick={() => setStep(1)}>
                  ← Atrás
                </Button>
                <Button variant="contained" onClick={handleNext} sx={{ px: 4 }}>
                  Continuar → Revisar
                </Button>
              </Stack>
            </Box>
          </Fade>

          {/* ─── PASO 3: RESUMEN Y CONFIRMACIÓN ─── */}
          <Fade in={step === 3} mountOnEnter unmountOnExit>
            <Box sx={{ display: step === 3 ? 'block' : 'none' }}>
              <Typography variant="h6" fontWeight={600} mb={3}>
                Resumen del plan de cobro
              </Typography>

              {/* Datos generales */}
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Typography variant="overline" color="text.secondary" display="block" mb={1}>
                  DATOS DEL PLAN
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Nombre</Typography>
                    <Typography variant="body2" fontWeight={600}>{planData.nombre}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Monto total</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(montoTotal, monedaDisplay)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Moneda</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {planData.moneda}{planData.indexacion === 'CAC' ? ' + CAC' : ''}
                    </Typography>
                  </Grid>
                  {planData.proyecto_id && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Proyecto</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {proyectos.find((p) => p.id === planData.proyecto_id)?.nombre || '-'}
                      </Typography>
                    </Grid>
                  )}
                  {planData.indexacion === 'CAC' && cacPreview && (
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" color="text.secondary">Índice CAC</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {planData.cac_tipo === 'general' ? 'Promedio' : planData.cac_tipo === 'mano_obra' ? 'M. Obra' : 'Materiales'}{' '}
                        = {cacPreview.cac_indice}
                      </Typography>
                    </Grid>
                  )}
                  {planData.notas && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Notas</Typography>
                      <Typography variant="body2">{planData.notas}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Cuotas resumen */}
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="overline" color="text.secondary">
                    CUOTAS ({cuotas.length})
                  </Typography>
                  <Typography variant="body2">
                    Suma: <strong>{formatCurrency(sumaCuotas, monedaDisplay)}</strong>
                    {montoTotal > 0 && (
                      <Chip
                        label={sumaOk ? 'Cuadra' : `Dif: ${formatCurrency(sumaDiff, monedaDisplay)}`}
                        color={sumaOk ? 'success' : 'warning'}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {cuotas.map((c, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ py: 1, px: 1.5, bgcolor: i % 2 === 0 ? 'grey.50' : 'transparent', borderRadius: 1 }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 24 }}>
                          {i + 1}
                        </Typography>
                        <Typography variant="body2">
                          {c.fecha_vencimiento
                            ? new Date(c.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-AR')
                            : 'Sin fecha'}
                        </Typography>
                        {c.descripcion && (
                          <Typography variant="body2" color="text.secondary">
                            {c.descripcion}
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(Number(c.monto) || 0, monedaDisplay)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              {/* Warning si no cuadra */}
              {montoTotal > 0 && !sumaOk && (
                <Paper
                  sx={{ p: 2, mb: 3, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 1.5 }}
                >
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <WarningAmberIcon sx={{ color: '#F9A825', mt: 0.2 }} />
                    <Typography variant="body2">
                      La suma de cuotas no coincide con el total. El plan se creará igual.
                    </Typography>
                  </Stack>
                </Paper>
              )}

              {/* Botones Paso 3 */}
              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button variant="outlined" onClick={() => setStep(2)}>
                  ← Modificar cuotas
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={saving}
                  sx={{
                    px: 5,
                    py: 1.5,
                    bgcolor: '#1B9E85',
                    '&:hover': { bgcolor: '#15836E' },
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  {saving ? 'Creando plan...' : 'Crear plan de cobro'}
                </Button>
              </Stack>
            </Box>
          </Fade>
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
