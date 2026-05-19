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
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import horariosService from 'src/services/dhn/horariosService';
import tiposLicenciaService from 'src/services/dhn/tiposLicenciaService';
import HorariosGridEditor from 'src/components/dhn/HorariosGridEditor';
import FeriadosCalendar from 'src/components/dhn/FeriadosCalendar';
import Alerts from 'src/components/alerts';
import {
  DIAS,
  TIPOS_HORA,
  TIPOS_VALIDOS,
  emptyHours,
} from 'src/utils/dhn/tiposHora';

const decimalCeil2 = (v) => Math.ceil(v * 100) / 100;

function normalizeHourCell(cell) {
  if (cell?.split && typeof cell.split === 'object') {
    const { atMin, before, after } = cell.split;
    if (Number.isInteger(atMin) && TIPOS_VALIDOS.includes(before) && TIPOS_VALIDOS.includes(after)) {
      return { split: { atMin, before, after } };
    }
  }
  if (TIPOS_VALIDOS.includes(cell?.tipo)) return { tipo: cell.tipo };
  return { tipo: TIPOS_HORA.NO_CUENTA };
}

function sanitizeTurnos(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((t) => t && typeof t === 'object' && typeof t.entrada === 'string' && typeof t.salida === 'string')
    .map((t) => ({ entrada: t.entrada, salida: t.salida }));
}

function toUiConfig(server) {
  const out = {};
  for (const d of DIAS) {
    const dia = server?.[d.key];
    const hoursRaw = Array.isArray(dia?.hours) ? dia.hours : [];
    const hours = Array.from({ length: 24 }, (_, i) => normalizeHourCell(hoursRaw[i]));
    const minutos = Number.isFinite(Number(dia?.fraccion?.minutos)) ? Number(dia.fraccion.minutos) : 20;
    out[d.key] = {
      hours,
      fraccion: { minutos, decimal: decimalCeil2(minutos / 60) },
      turnos: sanitizeTurnos(dia?.turnos),
    };
  }
  return out;
}

function toServerConfig(ui) {
  const out = {};
  for (const d of DIAS) {
    const dia = ui?.[d.key];
    const hours = Array.isArray(dia?.hours) ? dia.hours.map(normalizeHourCell) : emptyHours();
    const minutos = Number.isFinite(Number(dia?.fraccion?.minutos)) ? Number(dia.fraccion.minutos) : 20;
    out[d.key] = {
      hours,
      fraccion: { minutos, decimal: decimalCeil2(minutos / 60) },
      turnos: sanitizeTurnos(dia?.turnos),
    };
  }
  return out;
}

const ConfiguracionPage = () => {
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [feriadosFechas, setFeriadosFechas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState(0);

  const [tiposLicencia, setTiposLicencia] = useState([]);
  const [loadingLicencias, setLoadingLicencias] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: 'success', message: '' });
  const [licenciaDialog, setLicenciaDialog] = useState({ open: false, id: null, codigo: '', nombre: '' });
  const [licenciaSaving, setLicenciaSaving] = useState(false);

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
      nombre: item?.nombre ?? '',
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

  const handleConfigChange = useCallback((next) => {
    setConfig(next);
  }, []);

  const handleFraccionChange = useCallback((dia, minutos) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const m = Math.max(0, Math.round(Number(minutos) || 0));
      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          fraccion: { minutos: m, decimal: decimalCeil2(m / 60) },
        },
      };
    });
  }, []);

  const isDirty = useMemo(() => {
    if (!config || !original) return false;
    return JSON.stringify(config) !== JSON.stringify(original);
  }, [config, original]);

  const handleReset = () => {
    setConfig(original);
  };

  const handleTabChange = useCallback((_, newValue) => {
    setTab(newValue);
  }, []);

  const handleSave = async () => {
    try {
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
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Pintá cada hora del día con el tipo que corresponde. Una hora puede dividirse en 2 sub-slots cada 10 minutos.
                      </Typography>
                    </Box>
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

                  <HorariosGridEditor
                    config={config}
                    onChange={handleConfigChange}
                  />

                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Fracción de redondeo
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        Minutos a los que se redondea el ingreso (hacia adelante) y la salida (hacia atrás). Aplica antes de mapear los minutos a la grilla.
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(8, 1fr)' }, gap: 1.5 }}>
                        {DIAS.map((d) => {
                          const minutos = config?.[d.key]?.fraccion?.minutos ?? 20;
                          const decimal = decimalCeil2(minutos / 60).toFixed(2);
                          return (
                            <Stack key={d.key} spacing={0.25}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.label}</Typography>
                              <TextField
                                value={minutos}
                                onChange={(e) => handleFraccionChange(d.key, e.target.value)}
                                size="small"
                                type="number"
                                InputProps={{ inputProps: { min: 0, step: 5 } }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {decimal}h
                              </Typography>
                            </Stack>
                          );
                        })}
                      </Box>
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
