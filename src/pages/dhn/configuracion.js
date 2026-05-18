import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Stack,
  Card,
  CardContent,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Box,
  Divider,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import horariosService from 'src/services/dhn/horariosService';
import tiposLicenciaService from 'src/services/dhn/tiposLicenciaService';
import HorariosConfigTable from 'src/components/dhn/HorariosConfigTable';
import FeriadosCalendar from 'src/components/dhn/FeriadosCalendar';
import Alerts from 'src/components/alerts';

const ConfiguracionPage = () => {
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [feriadosFechas, setFeriadosFechas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState(0);

  // Tipos de licencia (tab 2)
  const [tiposLicencia, setTiposLicencia] = useState([]);
  const [loadingLicencias, setLoadingLicencias] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: 'success', message: '' });
  const [licenciaDialog, setLicenciaDialog] = useState({ open: false, id: null, codigo: '', nombre: '' });
  const [licenciaSaving, setLicenciaSaving] = useState(false);

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
        setFeriadosFechas(Array.isArray(cfg?.feriadosFechas) ? cfg.feriadosFechas : []);
        setErrors({});
      } catch (e) {
        setError('No se pudo cargar la configuración de horarios');
      } finally {
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const fetchTiposLicencia = useCallback(async () => {
    try {
      setLoadingLicencias(true);
      const data = await tiposLicenciaService.getAll();
      setTiposLicencia(Array.isArray(data) ? data : []);
    } catch (e) {
      setAlert({ open: true, severity: 'error', message: e?.response?.data?.message || e?.message || 'No se pudieron cargar los tipos de licencia' });
    } finally {
      setLoadingLicencias(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 2) fetchTiposLicencia();
  }, [tab, fetchTiposLicencia]);

  const handleAlertClose = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);

  const handleOpenLicenciaDialog = useCallback((item = null) => {
    setLicenciaDialog({
      open: true,
      id: item?._id ?? null,
      codigo: item?.codigo ?? '',
      nombre: item?.nombre ?? ''
    });
  }, []);

  const handleCloseLicenciaDialog = useCallback(() => {
    setLicenciaDialog({ open: false, id: null, codigo: '', nombre: '' });
  }, []);

  const handleLicenciaDialogChange = useCallback((field, value) => {
    setLicenciaDialog((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLicenciaSave = useCallback(async () => {
    const { id, codigo, nombre } = licenciaDialog;
    const codigoTrim = String(codigo ?? '').trim();
    const nombreTrim = String(nombre ?? '').trim();
    if (!codigoTrim || !nombreTrim) {
      setAlert({ open: true, severity: 'error', message: 'Código y nombre son requeridos' });
      return;
    }
    try {
      setLicenciaSaving(true);
      if (id) {
        await tiposLicenciaService.update(id, { codigo: codigoTrim, nombre: nombreTrim });
        setAlert({ open: true, severity: 'success', message: 'Tipo de licencia actualizado correctamente' });
      } else {
        await tiposLicenciaService.create({ codigo: codigoTrim, nombre: nombreTrim });
        setAlert({ open: true, severity: 'success', message: 'Tipo de licencia creado correctamente' });
      }
      handleCloseLicenciaDialog();
      fetchTiposLicencia();
    } catch (e) {
      setAlert({ open: true, severity: 'error', message: e?.response?.data?.message || e?.message || 'No se pudo guardar' });
    } finally {
      setLicenciaSaving(false);
    }
  }, [licenciaDialog, handleCloseLicenciaDialog, fetchTiposLicencia]);

  const handleLicenciaDelete = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar este tipo de licencia?')) return;
    try {
      setLicenciaSaving(true);
      await tiposLicenciaService.remove(id);
      setAlert({ open: true, severity: 'success', message: 'Tipo de licencia eliminado correctamente' });
      fetchTiposLicencia();
    } catch (e) {
      setAlert({ open: true, severity: 'error', message: e?.response?.data?.message || e?.message || 'No se pudo eliminar' });
    } finally {
      setLicenciaSaving(false);
    }
  }, [fetchTiposLicencia]);

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
        [`${turno}.${field}`]: !isValidTime24(value) ? 'Formato inválido. Use HH:mm (24h)' : ''
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

  const handleTabChange = useCallback((_, newValue) => {
    setTab(newValue);
  }, []);

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

  const handleAddFeriado = useCallback(async (fecha) => {
    try {
      const result = await horariosService.addFeriado(fecha);
      const fechas = Array.isArray(result?.feriadosFechas) ? result.feriadosFechas : [];
      setFeriadosFechas(fechas);
    } catch (e) {
      throw new Error(e?.response?.data?.message || e?.message || 'No se pudo agregar el feriado');
    }
  }, []);

  const handleRemoveFeriado = useCallback(async (fecha) => {
    try {
      const result = await horariosService.removeFeriado(fecha);
      const fechas = Array.isArray(result?.feriadosFechas) ? result.feriadosFechas : [];
      setFeriadosFechas(fechas);
    } catch (e) {
      throw new Error(e?.response?.data?.message || e?.message || 'No se pudo eliminar el feriado');
    }
  }, []);

  return (
    <DashboardLayout title="Horarios">
      <Container maxWidth="xl">
        <Stack spacing={2} sx={{ py: 2 }}>
          <Card>
            <Tabs value={tab} onChange={handleTabChange} aria-label="tabs de configuración">
              <Tab label="Horarios" value={0} />
              <Tab label="Feriados" value={1} />
              <Tab label="Tipos de licencia" value={2} />
            </Tabs>
          </Card>

          {(loading && tab !== 2) || (tab === 2 && loadingLicencias) ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
              {tab === 0 ? (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={handleReset} disabled={!isDirty || saving}>
                        Cancelar
                      </Button>
                      <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
                        {saving ? <CircularProgress size={20} /> : 'Guardar cambios'}
                      </Button>
                    </Stack>
                  </Stack>

                  <Divider />

                  {hasTimeErrors ? (
                    <Alert severity="warning" variant="outlined">
                      Hay campos con formato inválido. Usá <strong>HH:mm</strong> (24hs).
                    </Alert>
                  ) : null}

                  <Card>
                    <CardContent>
                      <Stack spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Formato 24hs (HH:mm). Turno noche puede cruzar medianoche (ej: 21:00 a 06:00).
                        </Typography>
                      </Stack>

                      <HorariosConfigTable
                        dias={dias}
                        config={config}
                        errors={errors}
                        onTimeChange={handleTimeChange}
                        onFraccionChange={handleFraccionChange}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : tab === 1 ? (
                <FeriadosCalendar
                  feriadosFechas={feriadosFechas}
                  onAddFeriado={handleAddFeriado}
                  onRemoveFeriado={handleRemoveFeriado}
                  loading={loading}
                />
              ) : (
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="subtitle1">Tipos de licencia y justificaciones</Typography>
                      <Button variant="contained" size="small" onClick={() => handleOpenLicenciaDialog()} disabled={licenciaSaving}>
                        Agregar
                      </Button>
                    </Stack>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Código</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell align="right" sx={{ width: 100 }}>Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tiposLicencia.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                No hay tipos de licencia
                              </TableCell>
                            </TableRow>
                          ) : (
                            tiposLicencia.map((t) => (
                              <TableRow key={t._id}>
                                <TableCell>{t.codigo}</TableCell>
                                <TableCell>{t.nombre}</TableCell>
                                <TableCell align="right">
                                  <IconButton size="small" onClick={() => handleOpenLicenciaDialog(t)} disabled={licenciaSaving} aria-label="Editar">
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleLicenciaDelete(t._id)} disabled={licenciaSaving} aria-label="Eliminar">
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
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

        <Dialog open={licenciaDialog.open} onClose={handleCloseLicenciaDialog} maxWidth="xs" fullWidth>
          <DialogTitle>{licenciaDialog.id ? 'Editar tipo de licencia' : 'Agregar tipo de licencia'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Código"
                value={licenciaDialog.codigo}
                onChange={(e) => handleLicenciaDialogChange('codigo', e.target.value)}
                size="small"
                fullWidth
                placeholder="ej: FC"
              />
              <TextField
                label="Nombre"
                value={licenciaDialog.nombre}
                onChange={(e) => handleLicenciaDialogChange('nombre', e.target.value)}
                size="small"
                fullWidth
                placeholder="ej: Franco Compensatorio"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLicenciaDialog}>Cancelar</Button>
            <Button variant="contained" onClick={handleLicenciaSave} disabled={licenciaSaving}>
              {licenciaSaving ? <CircularProgress size={20} /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        <Alerts alert={alert} onClose={handleAlertClose} />
      </Container>
    </DashboardLayout>
  );
};

export default ConfiguracionPage;