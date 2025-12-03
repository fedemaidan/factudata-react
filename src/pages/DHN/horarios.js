import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Stack,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Box,
  Divider,
  Typography
} from '@mui/material';
import horariosService from 'src/services/dhn/horariosService';

const HorariosPage = () => {
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const dias = useMemo(() => ([
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' },
    { key: 'feriado', label: 'Feriado' },
  ]), []);

  // Valida formato HH:mm o H:mm (24h)
  const isValidTime24 = (value) => {
    if (!value || String(value).trim() === '') return true;
    return /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value).trim());
  };

  const normalizeTime = (value) => {
    if (!value || String(value).trim() === '') return '';
    const trimmed = String(value).trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const hour = match[1].padStart(2, '0');
      return `${hour}:${match[2]}`;
    }
    return trimmed;
  };

  const toUiConfig = (serverCfg) => {
    const ui = {};
    for (const d of dias) {
      const c = serverCfg?.[d.key] || {};
      ui[d.key] = {
        ingreso: normalizeTime(c.ingreso ?? ''),
        salida: normalizeTime(c.salida ?? ''),
        fraccion: {
          minutos: typeof c?.fraccion?.minutos === 'number' ? c.fraccion.minutos : 20,
          decimal: typeof c?.fraccion?.decimal === 'number' ? c.fraccion.decimal : 0.34,
        }
      };
    }
    return ui;
  };

  const toServerConfig = (uiCfg) => {
    const decimalCeil2 = (value) => Math.ceil(value * 100) / 100;
    const out = {};
    for (const d of dias) {
      const c = uiCfg?.[d.key] || {};
      const ingresoNorm = normalizeTime(c.ingreso);
      const salidaNorm = normalizeTime(c.salida);
      const ingreso = ingresoNorm !== '' ? ingresoNorm : null;
      const salida = salidaNorm !== '' ? salidaNorm : null;
      const minutos = Number.isFinite(Number(c?.fraccion?.minutos)) ? Number(c.fraccion.minutos) : 20;
      const decimal = decimalCeil2(minutos / 60);
      out[d.key] = { ingreso, salida, fraccion: { minutos, decimal } };
    }
    return out;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const cfg = await horariosService.getHorarios();
        if (!active) return;
        const ui = toUiConfig(cfg);
        setConfig(ui);
        setOriginal(ui);
        setErrors({});
      } catch (e) {
        setError('No se pudo cargar la configuración de horarios');
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleChange = (dia, field, value) => {
    setConfig(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [field]: value
      }
    }));
    if (field === 'ingreso' || field === 'salida') {
      setErrors(prev => ({
        ...prev,
        [dia]: {
          ...(prev[dia] || {}),
          [field]: !isValidTime24(value) ? 'Formato inválido. Use HH:mm (24h)' : ''
        }
      }));
    }
  };

  const handleFraccionChange = (dia, field, value) => {
    setConfig(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        fraccion: {
          ...prev[dia]?.fraccion,
          [field]: value
        }
      }
    }));
  };

  const isDirty = useMemo(() => {
    if (!config || !original) return false;
    return JSON.stringify(config) !== JSON.stringify(original);
  }, [config, original]);

  const handleReset = () => {
    setConfig(original);
    setErrors({});
  };

  const handleSave = async () => {
    try {
      // Validación previa - detectar qué días tienen error
      const invalidDays = dias.filter(d => {
        const c = config?.[d.key] || {};
        return !isValidTime24(c.ingreso) || !isValidTime24(c.salida);
      });
      if (invalidDays.length > 0) {
        const dayLabels = invalidDays.map(d => d.label).join(', ');
        setError(`Revise los campos con error en: ${dayLabels}. Formato esperado HH:mm (24h).`);
        return;
      }

      setSaving(true);
      const payload = toServerConfig(config);
      await horariosService.updateHorarios(payload);
      setOriginal(config);
      setSuccess(true);
    } catch (e) {
      setError('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Horarios">
      <Container maxWidth="xl">
        <Stack spacing={2} sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={handleReset} disabled={!isDirty || saving}>Cancelar</Button>
              <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
                {saving ? <CircularProgress size={20} /> : 'Guardar cambios'}
              </Button>
            </Stack>
          </Stack>
          <Divider />
          {loading ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
              <Grid container spacing={2}>
                {dias.map(({ key, label }) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Card>
                      <CardHeader title={label} />
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1.5}>
                            <TextField
                              label="Ingreso"
                              type="text"
                              value={config?.[key]?.ingreso || ''}
                              onChange={(e) => handleChange(key, 'ingreso', e.target.value)}
                              fullWidth
                              size="small"
                              placeholder="HH:mm"
                              inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                              error={Boolean(errors?.[key]?.ingreso)}
                              helperText={errors?.[key]?.ingreso || 'Dejar vacío si no aplica'}
                            />
                            <TextField
                              label="Salida"
                              type="text"
                              value={config?.[key]?.salida || ''}
                              onChange={(e) => handleChange(key, 'salida', e.target.value)}
                              fullWidth
                              size="small"
                              placeholder="HH:mm"
                              inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                              error={Boolean(errors?.[key]?.salida)}
                              helperText={errors?.[key]?.salida || 'Dejar vacío si no aplica'}
                            />
                          </Stack>
                          <Stack direction="row" spacing={1.5} alignItems="flex-end">
                            <TextField
                              label="Fracción (minutos)"
                              type="number"
                              value={config?.[key]?.fraccion?.minutos ?? 20}
                              onChange={(e) => handleFraccionChange(key, 'minutos', e.target.value)}
                              fullWidth
                              size="small"
                              InputProps={{ inputProps: { min: 0, step: 1 } }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                              {(() => {
                                const m = Number(config?.[key]?.fraccion?.minutos ?? 20);
                                const dec = (Math.ceil((m / 60) * 100) / 100).toFixed(2);
                                return `Decimal: ${dec}`;
                              })()}
                            </Typography>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Stack>
        <Snackbar
          open={success}
          autoHideDuration={3000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccess(false)}>
            Configuración guardada correctamente
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
};

export default HorariosPage;