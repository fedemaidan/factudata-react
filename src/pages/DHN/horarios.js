import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Stack,
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
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
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
      const noct = c?.nocturno && typeof c.nocturno === 'object' ? c.nocturno : {};
      const fraccionMinutos = typeof c?.fraccion?.minutos === 'number' ? c.fraccion.minutos : 20;
      const fraccionDecimal = typeof c?.fraccion?.decimal === 'number' ? c.fraccion.decimal : 0.34;
      const fraccionNoctMinutos = typeof noct?.fraccion?.minutos === 'number' ? noct.fraccion.minutos : fraccionMinutos;
      const fraccionNoctDecimal = typeof noct?.fraccion?.decimal === 'number' ? noct.fraccion.decimal : fraccionDecimal;
      ui[d.key] = {
        ingreso: normalizeTime(c.ingreso ?? ''),
        salida: normalizeTime(c.salida ?? ''),
        fraccion: {
          minutos: fraccionMinutos,
          decimal: fraccionDecimal,
        },
        nocturno: {
          ingreso: normalizeTime(noct.ingreso ?? ''),
          salida: normalizeTime(noct.salida ?? ''),
          fraccion: {
            minutos: fraccionNoctMinutos,
            decimal: fraccionNoctDecimal,
          }
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

      const noct = c?.nocturno && typeof c.nocturno === 'object' ? c.nocturno : {};
      const noctIngresoNorm = normalizeTime(noct.ingreso);
      const noctSalidaNorm = normalizeTime(noct.salida);
      const noctIngreso = noctIngresoNorm !== '' ? noctIngresoNorm : null;
      const noctSalida = noctSalidaNorm !== '' ? noctSalidaNorm : null;
      const noctMinutos = Number.isFinite(Number(noct?.fraccion?.minutos)) ? Number(noct.fraccion.minutos) : minutos;
      const noctDecimal = decimalCeil2(noctMinutos / 60);

      out[d.key] = {
        ingreso,
        salida,
        fraccion: { minutos, decimal },
        nocturno: {
          ingreso: noctIngreso,
          salida: noctSalida,
          fraccion: { minutos: noctMinutos, decimal: noctDecimal }
        }
      };
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

  const buildTimeErrorKey = (turno, field) => `${turno}.${field}`;

  const handleTimeChange = useCallback((dia, turno, field, value) => {
    setConfig((prev) => {
      if (!prev) return prev;
      if (turno === 'nocturno') {
        return {
          ...prev,
          [dia]: {
            ...prev[dia],
            nocturno: {
              ...(prev[dia]?.nocturno || {}),
              [field]: value
            }
          }
        };
      }
      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          [field]: value
        }
      };
    });

    if (field !== 'ingreso' && field !== 'salida') return;
    setErrors((prev) => ({
      ...prev,
      [dia]: {
        ...(prev[dia] || {}),
        [buildTimeErrorKey(turno, field)]: !isValidTime24(value) ? 'Formato inválido. Use HH:mm (24h)' : ''
      }
    }));
  }, []);

  const handleFraccionChange = useCallback((dia, field, value) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          fraccion: {
            ...prev[dia]?.fraccion,
            [field]: value
          }
        }
      };
    });
  }, []);

  const isDirty = useMemo(() => {
    if (!config || !original) return false;
    return JSON.stringify(config) !== JSON.stringify(original);
  }, [config, original]);

  const hasTimeErrors = useMemo(() => {
    if (!errors || typeof errors !== 'object') return false;
    return Object.values(errors).some((dayErrors) => {
      if (!dayErrors || typeof dayErrors !== 'object') return false;
      return Object.values(dayErrors).some((msg) => Boolean(msg));
    });
  }, [errors]);

  const handleReset = () => {
    setConfig(original);
    setErrors({});
  };

  const handleSave = async () => {
    try {
      // Validación previa - detectar qué días tienen error
      const invalidDays = dias.filter(d => {
        const c = config?.[d.key] || {};
        const n = c?.nocturno || {};
        return (
          !isValidTime24(c.ingreso) ||
          !isValidTime24(c.salida) ||
          !isValidTime24(n.ingreso) ||
          !isValidTime24(n.salida)
        );
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
              <Card>
                <CardContent>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small" aria-label="tabla de horarios por día">
                      <TableHead>
                        <TableRow>
                          <TableCell rowSpan={2} sx={{ fontWeight: 600, width: 140 }}>Día</TableCell>
                          <TableCell align="center" colSpan={2} sx={{ fontWeight: 600 }}>Turno día</TableCell>
                          <TableCell align="center" colSpan={2} sx={{ fontWeight: 600 }}>Turno noche</TableCell>
                          <TableCell rowSpan={2} align="right" sx={{ fontWeight: 600, width: 190 }}>
                            Fracción (min)
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Entrada</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Salida</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Entrada</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Salida</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dias.map(({ key, label }) => {
                          const dayCfg = config?.[key] || {};
                          const noct = dayCfg?.nocturno || {};
                          const minutes = Number(dayCfg?.fraccion?.minutos ?? 20);
                          const dec = (Math.ceil((minutes / 60) * 100) / 100).toFixed(2);

                          const dayIngresoError = errors?.[key]?.[buildTimeErrorKey('diurno', 'ingreso')] || '';
                          const daySalidaError = errors?.[key]?.[buildTimeErrorKey('diurno', 'salida')] || '';
                          const noctIngresoError = errors?.[key]?.[buildTimeErrorKey('nocturno', 'ingreso')] || '';
                          const noctSalidaError = errors?.[key]?.[buildTimeErrorKey('nocturno', 'salida')] || '';

                          return (
                            <TableRow
                              key={key}
                              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                              <TableCell component="th" scope="row">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {label}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <TextField
                                  value={dayCfg.ingreso || ''}
                                  onChange={(e) => handleTimeChange(key, 'diurno', 'ingreso', e.target.value)}
                                  size="small"
                                  placeholder="HH:mm"
                                  inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                                  error={Boolean(dayIngresoError)}
                                  sx={{ width: 120 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={dayCfg.salida || ''}
                                  onChange={(e) => handleTimeChange(key, 'diurno', 'salida', e.target.value)}
                                  size="small"
                                  placeholder="HH:mm"
                                  inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                                  error={Boolean(daySalidaError)}
                                  sx={{ width: 120 }}
                                />
                              </TableCell>

                              <TableCell>
                                <TextField
                                  value={noct.ingreso || ''}
                                  onChange={(e) => handleTimeChange(key, 'nocturno', 'ingreso', e.target.value)}
                                  size="small"
                                  placeholder="HH:mm"
                                  inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                                  error={Boolean(noctIngresoError)}
                                  sx={{ width: 120 }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  value={noct.salida || ''}
                                  onChange={(e) => handleTimeChange(key, 'nocturno', 'salida', e.target.value)}
                                  size="small"
                                  placeholder="HH:mm"
                                  inputProps={{ inputMode: 'numeric', pattern: '([01]\\d|2[0-3]):[0-5]\\d' }}
                                  error={Boolean(noctSalidaError)}
                                  sx={{ width: 120 }}
                                />
                              </TableCell>

                              <TableCell align="right">
                                <Stack spacing={0.25} alignItems="flex-end">
                                  <TextField
                                    value={dayCfg?.fraccion?.minutos ?? 20}
                                    onChange={(e) => handleFraccionChange(key, 'minutos', e.target.value)}
                                    size="small"
                                    type="number"
                                    InputProps={{ inputProps: { min: 0, step: 1 } }}
                                    sx={{ width: 140 }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Decimal: {dec}
                                  </Typography>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
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