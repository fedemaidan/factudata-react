import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  useTheme,
  Alert,
  Tooltip,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import CancelIcon from '@mui/icons-material/Cancel';
import RestoreIcon from '@mui/icons-material/Restore';
import { updateEmpresaDetails } from 'src/services/empresaService';
import { updateConversacionesEmpresa } from 'src/services/conversacionService';
import leadershipService from 'src/services/leadershipService';

const PLANES = ['basico', 'intermedio', 'avanzado', 'custom'];
const FRECUENCIAS = ['mensual', 'anual'];
const METODOS_PAGO = ['mercadopago', 'transferencia', 'efectivo'];
const CANALES = ['meta', 'cold_calling', 'organico', 'alianza', 'referido', 'mailing', 'otro'];

const PLAN_LABELS = { basico: 'Básico', intermedio: 'Intermedio', avanzado: 'Avanzado', custom: 'Custom' };
const ESTADO_COLORS = { activa: 'success', cancelada: 'error', pausada: 'warning', trial: 'info' };

export const RegistroClienteDetails = ({ empresa }) => {
  const theme = useTheme();
  
  // Estado del cliente
  const [clienteData, setClienteData] = useState({
    esCliente: false,
    fechaRegistroCliente: null,
    estaDadoDeBaja: false,
    fechaBaja: null,
    motivoBaja: ''
  });
  
  // Estado de reuniones
  const [reuniones, setReuniones] = useState([]);
  const [openReunionDialog, setOpenReunionDialog] = useState(false);
  const [editingReunion, setEditingReunion] = useState(null);
  const [reunionForm, setReunionForm] = useState({
    fecha: new Date(),
    titulo: '',
    descripcion: '',
    participantes: '',
    notas: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Estado de suscripción
  const [suscripcion, setSuscripcion] = useState(null);
  const [loadingSuscripcion, setLoadingSuscripcion] = useState(false);
  const [suscripcionForm, setSuscripcionForm] = useState({
    plan: 'basico',
    monto: '',
    frecuenciaCobro: 'mensual',
    metodoPago: 'mercadopago',
    canalAdquisicion: 'meta',
    notas: ''
  });
  const [editingSuscripcion, setEditingSuscripcion] = useState(false);
  const [savingSuscripcion, setSavingSuscripcion] = useState(false);

  // Cargar datos al montar desde los campos de empresa
  useEffect(() => {
    if (empresa) {
      setClienteData({
        esCliente: empresa.esCliente || false,
        fechaRegistroCliente: empresa.fechaRegistroCliente ? new Date(empresa.fechaRegistroCliente) : null,
        estaDadoDeBaja: empresa.estaDadoDeBaja || false,
        fechaBaja: empresa.fechaBaja ? new Date(empresa.fechaBaja) : null,
        motivoBaja: empresa.motivoBaja || ''
      });
      setReuniones(empresa.reuniones || []);
    }
  }, [empresa]);

  // Cargar suscripción de la empresa
  const fetchSuscripcion = useCallback(async () => {
    if (!empresa?.id) return;
    setLoadingSuscripcion(true);
    try {
      const resp = await leadershipService.getSuscripcionByEmpresa(empresa.id);
      if (resp && !resp.error) {
        setSuscripcion(resp);
        setSuscripcionForm({
          plan: resp.plan || 'basico',
          monto: resp.monto || '',
          frecuenciaCobro: resp.frecuenciaCobro || 'mensual',
          metodoPago: resp.metodoPago || 'mercadopago',
          canalAdquisicion: resp.canalAdquisicion || 'meta',
          notas: resp.notas || ''
        });
      }
    } catch (err) {
      // 404 = no tiene suscripción, es normal
      if (err?.response?.status !== 404) {
        console.error('Error cargando suscripción:', err);
      }
    } finally {
      setLoadingSuscripcion(false);
    }
  }, [empresa?.id]);

  useEffect(() => {
    if (empresa?.id && clienteData.esCliente) {
      fetchSuscripcion();
    }
  }, [empresa?.id, clienteData.esCliente, fetchSuscripcion]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSuscripcionFormChange = (field, value) => {
    setSuscripcionForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCrearSuscripcion = async () => {
    if (!suscripcionForm.monto || isNaN(suscripcionForm.monto) || Number(suscripcionForm.monto) <= 0) {
      showSnackbar('El monto es requerido y debe ser mayor a 0', 'error');
      return;
    }
    setSavingSuscripcion(true);
    try {
      const data = {
        empresaId: empresa.id,
        empresaNombre: empresa.nombre || empresa.name || empresa.id,
        plan: suscripcionForm.plan,
        monto: Number(suscripcionForm.monto),
        frecuenciaCobro: suscripcionForm.frecuenciaCobro,
        metodoPago: suscripcionForm.metodoPago,
        canalAdquisicion: suscripcionForm.canalAdquisicion,
        notas: suscripcionForm.notas,
        fechaInicio: new Date().toISOString()
      };
      const resp = await leadershipService.crearSuscripcion(data);
      if (resp && !resp.error) {
        setSuscripcion(resp);
        setEditingSuscripcion(false);
        showSnackbar('Suscripción creada correctamente');
      } else {
        showSnackbar(resp?.msg || 'Error al crear suscripción', 'error');
      }
    } catch (err) {
      const msg = err?.response?.data?.msg || 'Error al crear suscripción';
      showSnackbar(msg, 'error');
    } finally {
      setSavingSuscripcion(false);
    }
  };

  const handleActualizarSuscripcion = async () => {
    if (!suscripcionForm.monto || isNaN(suscripcionForm.monto) || Number(suscripcionForm.monto) <= 0) {
      showSnackbar('El monto es requerido y debe ser mayor a 0', 'error');
      return;
    }
    setSavingSuscripcion(true);
    try {
      const data = {
        plan: suscripcionForm.plan,
        monto: Number(suscripcionForm.monto),
        frecuenciaCobro: suscripcionForm.frecuenciaCobro,
        metodoPago: suscripcionForm.metodoPago,
        canalAdquisicion: suscripcionForm.canalAdquisicion,
        notas: suscripcionForm.notas
      };
      const resp = await leadershipService.actualizarSuscripcion(suscripcion._id, data);
      if (resp && !resp.error) {
        setSuscripcion(resp);
        setEditingSuscripcion(false);
        showSnackbar('Suscripción actualizada');
      } else {
        showSnackbar(resp?.msg || 'Error al actualizar', 'error');
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.msg || 'Error al actualizar', 'error');
    } finally {
      setSavingSuscripcion(false);
    }
  };

  const handleCancelarSuscripcion = async () => {
    if (!window.confirm('¿Estás seguro de cancelar esta suscripción?')) return;
    setSavingSuscripcion(true);
    try {
      const resp = await leadershipService.cancelarSuscripcion(suscripcion._id, { razon: 'Cancelado desde panel' });
      if (resp && !resp.error) {
        setSuscripcion(resp);
        showSnackbar('Suscripción cancelada');
      }
    } catch (err) {
      showSnackbar('Error al cancelar', 'error');
    } finally {
      setSavingSuscripcion(false);
    }
  };

  const handleReactivarSuscripcion = async () => {
    setSavingSuscripcion(true);
    try {
      const resp = await leadershipService.reactivarSuscripcion(suscripcion._id);
      if (resp && !resp.error) {
        setSuscripcion(resp);
        showSnackbar('Suscripción reactivada');
      }
    } catch (err) {
      showSnackbar('Error al reactivar', 'error');
    } finally {
      setSavingSuscripcion(false);
    }
  };

  const handleClienteChange = (field, value) => {
    setClienteData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSaveClienteData = async () => {
    setIsLoading(true);
    try {
      // Preparar datos para guardar (convertir fechas a ISO string para Firebase)
      const dataToSave = {
        esCliente: clienteData.esCliente,
        fechaRegistroCliente: clienteData.fechaRegistroCliente ? clienteData.fechaRegistroCliente.toISOString() : null,
        estaDadoDeBaja: clienteData.estaDadoDeBaja,
        fechaBaja: clienteData.fechaBaja ? clienteData.fechaBaja.toISOString() : null,
        motivoBaja: clienteData.motivoBaja
      };
      
      // Guardar en Firebase
      const success = await updateEmpresaDetails(empresa.id, dataToSave);
      
      if (success) {
        // Sincronizar con MongoDB (conversaciones)
        try {
          await updateConversacionesEmpresa(empresa.id, dataToSave);
        } catch (syncError) {
          console.warn('Error al sincronizar conversaciones (no crítico):', syncError);
        }
        
        setHasChanges(false);
        showSnackbar('Datos guardados correctamente');
      } else {
        showSnackbar('Error al guardar los datos', 'error');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      showSnackbar('Error al guardar los datos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReunionDialog = (reunion = null) => {
    if (reunion) {
      setEditingReunion(reunion);
      setReunionForm({
        fecha: new Date(reunion.fecha),
        titulo: reunion.titulo,
        descripcion: reunion.descripcion || '',
        participantes: reunion.participantes || '',
        notas: reunion.notas || ''
      });
    } else {
      setEditingReunion(null);
      setReunionForm({
        fecha: new Date(),
        titulo: '',
        descripcion: '',
        participantes: '',
        notas: ''
      });
    }
    setOpenReunionDialog(true);
  };

  const handleCloseReunionDialog = () => {
    setOpenReunionDialog(false);
    setEditingReunion(null);
  };

  const handleSaveReunion = async () => {
    if (!reunionForm.titulo) {
      showSnackbar('El título es requerido', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const nuevaReunion = {
        ...reunionForm,
        id: editingReunion?.id || Date.now(),
        fecha: reunionForm.fecha.toISOString()
      };

      let nuevasReuniones;
      if (editingReunion) {
        nuevasReuniones = reuniones.map(r => r.id === editingReunion.id ? nuevaReunion : r);
      } else {
        nuevasReuniones = [...reuniones, nuevaReunion];
      }

      // Guardar en Firebase como campo de empresa
      const success = await updateEmpresaDetails(empresa.id, { reuniones: nuevasReuniones });
      
      if (success) {
        setReuniones(nuevasReuniones);
        showSnackbar(editingReunion ? 'Reunión actualizada' : 'Reunión guardada');
        handleCloseReunionDialog();
      } else {
        showSnackbar('Error al guardar la reunión', 'error');
      }
    } catch (error) {
      console.error('Error al guardar reunión:', error);
      showSnackbar('Error al guardar la reunión', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReunion = async (reunionId) => {
    if (window.confirm('¿Está seguro de eliminar esta reunión?')) {
      setIsLoading(true);
      try {
        const nuevasReuniones = reuniones.filter(r => r.id !== reunionId);
        const success = await updateEmpresaDetails(empresa.id, { reuniones: nuevasReuniones });
        
        if (success) {
          setReuniones(nuevasReuniones);
          showSnackbar('Reunión eliminada');
        } else {
          showSnackbar('Error al eliminar la reunión', 'error');
        }
      } catch (error) {
        console.error('Error al eliminar reunión:', error);
        showSnackbar('Error al eliminar la reunión', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Stack spacing={3}>
        {/* Card de Estado de Cliente */}
        <Card 
          elevation={0} 
          sx={{ 
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2
          }}
        >
          <CardHeader 
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <PersonAddIcon color="primary" />
                <Typography variant="h6">Estado de Cliente</Typography>
              </Stack>
            }
            action={
              hasChanges && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveClienteData}
                  disabled={isLoading}
                  size="small"
                >
                  Guardar Cambios
                </Button>
              )
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {/* Registro como cliente */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={clienteData.esCliente}
                      onChange={(e) => handleClienteChange('esCliente', e.target.checked)}
                      color="success"
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography>Registrado como Cliente</Typography>
                      {clienteData.esCliente && (
                        <Chip 
                          label="Cliente Activo" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  }
                />
                
                {clienteData.esCliente && (
                  <Box sx={{ mt: 2, ml: 2 }}>
                    <DatePicker
                      label="Fecha de Registro"
                      value={clienteData.fechaRegistroCliente}
                      onChange={(date) => handleClienteChange('fechaRegistroCliente', date)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: false,
                          sx: { maxWidth: 200 }
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Baja del cliente */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={clienteData.estaDadoDeBaja}
                      onChange={(e) => handleClienteChange('estaDadoDeBaja', e.target.checked)}
                      color="error"
                      disabled={!clienteData.esCliente}
                    />
                  }
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography color={!clienteData.esCliente ? 'text.disabled' : 'text.primary'}>
                        Dado de Baja
                      </Typography>
                      {clienteData.estaDadoDeBaja && (
                        <Chip 
                          label="Baja" 
                          color="error" 
                          size="small" 
                          variant="outlined"
                          icon={<PersonOffIcon />}
                        />
                      )}
                    </Stack>
                  }
                />
                
                {clienteData.estaDadoDeBaja && (
                  <Stack spacing={2} sx={{ mt: 2, ml: 2 }}>
                    <DatePicker
                      label="Fecha de Baja"
                      value={clienteData.fechaBaja}
                      onChange={(date) => handleClienteChange('fechaBaja', date)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: false,
                          sx: { maxWidth: 200 }
                        }
                      }}
                    />
                    <TextField
                      label="Motivo de Baja"
                      value={clienteData.motivoBaja}
                      onChange={(e) => handleClienteChange('motivoBaja', e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                      sx={{ maxWidth: 400 }}
                    />
                  </Stack>
                )}
              </Box>

              {/* Resumen */}
              {clienteData.esCliente && (
                <>
                  <Divider />
                  <Alert 
                    severity={clienteData.estaDadoDeBaja ? 'warning' : 'success'}
                    icon={clienteData.estaDadoDeBaja ? <PersonOffIcon /> : <PersonAddIcon />}
                  >
                    {clienteData.estaDadoDeBaja ? (
                      <>
                        Cliente dado de baja el {formatDate(clienteData.fechaBaja)}.
                        {clienteData.motivoBaja && ` Motivo: ${clienteData.motivoBaja}`}
                      </>
                    ) : (
                      <>Cliente registrado desde el {formatDate(clienteData.fechaRegistroCliente)}.</>
                    )}
                  </Alert>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Card de Suscripción — solo si es cliente */}
        {clienteData.esCliente && (
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}
          >
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SubscriptionsIcon color="primary" />
                  <Typography variant="h6">Suscripción</Typography>
                  {suscripcion && (
                    <Chip
                      label={suscripcion.estado?.toUpperCase()}
                      color={ESTADO_COLORS[suscripcion.estado] || 'default'}
                      size="small"
                    />
                  )}
                </Stack>
              }
              action={
                suscripcion && !editingSuscripcion && suscripcion.estado === 'activa' && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setEditingSuscripcion(true)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={handleCancelarSuscripcion}
                      disabled={savingSuscripcion}
                    >
                      Cancelar
                    </Button>
                  </Stack>
                )
              }
            />
            <Divider />
            <CardContent>
              {loadingSuscripcion ? (
                <Stack spacing={2}>
                  <Skeleton variant="rectangular" height={40} />
                  <Skeleton variant="rectangular" height={40} />
                </Stack>
              ) : !suscripcion || editingSuscripcion ? (
                /* Formulario de crear / editar */
                <Stack spacing={2.5}>
                  {!suscripcion && (
                    <Alert severity="info" variant="outlined">
                      Esta empresa no tiene suscripción registrada. Completá los datos para crearla.
                    </Alert>
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Plan</InputLabel>
                      <Select
                        value={suscripcionForm.plan}
                        label="Plan"
                        onChange={(e) => handleSuscripcionFormChange('plan', e.target.value)}
                      >
                        {PLANES.map(p => (
                          <MenuItem key={p} value={p}>{PLAN_LABELS[p] || p}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Monto"
                      type="number"
                      size="small"
                      value={suscripcionForm.monto}
                      onChange={(e) => handleSuscripcionFormChange('monto', e.target.value)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      sx={{ maxWidth: 180 }}
                      required
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Frecuencia</InputLabel>
                      <Select
                        value={suscripcionForm.frecuenciaCobro}
                        label="Frecuencia"
                        onChange={(e) => handleSuscripcionFormChange('frecuenciaCobro', e.target.value)}
                      >
                        {FRECUENCIAS.map(f => (
                          <MenuItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Método de pago</InputLabel>
                      <Select
                        value={suscripcionForm.metodoPago}
                        label="Método de pago"
                        onChange={(e) => handleSuscripcionFormChange('metodoPago', e.target.value)}
                      >
                        {METODOS_PAGO.map(m => (
                          <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Canal adquisición</InputLabel>
                      <Select
                        value={suscripcionForm.canalAdquisicion}
                        label="Canal adquisición"
                        onChange={(e) => handleSuscripcionFormChange('canalAdquisicion', e.target.value)}
                      >
                        {CANALES.map(c => (
                          <MenuItem key={c} value={c}>{c.replace('_', ' ').charAt(0).toUpperCase() + c.replace('_', ' ').slice(1)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <TextField
                    label="Notas"
                    size="small"
                    value={suscripcionForm.notas}
                    onChange={(e) => handleSuscripcionFormChange('notas', e.target.value)}
                    multiline
                    rows={2}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={savingSuscripcion ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                      onClick={suscripcion ? handleActualizarSuscripcion : handleCrearSuscripcion}
                      disabled={savingSuscripcion}
                      size="small"
                    >
                      {suscripcion ? 'Actualizar' : 'Crear Suscripción'}
                    </Button>
                    {editingSuscripcion && (
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingSuscripcion(false);
                          // Restaurar form con datos actuales
                          setSuscripcionForm({
                            plan: suscripcion.plan || 'basico',
                            monto: suscripcion.monto || '',
                            frecuenciaCobro: suscripcion.frecuenciaCobro || 'mensual',
                            metodoPago: suscripcion.metodoPago || 'mercadopago',
                            canalAdquisicion: suscripcion.canalAdquisicion || 'meta',
                            notas: suscripcion.notas || ''
                          });
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </Stack>
                </Stack>
              ) : (
                /* Vista resumen de suscripción existente */
                <Stack spacing={2}>
                  <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Plan</Typography>
                      <Typography fontWeight={600}>{PLAN_LABELS[suscripcion.plan] || suscripcion.plan}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Monto</Typography>
                      <Typography fontWeight={600} color="success.main">
                        ${Number(suscripcion.monto).toLocaleString('es-AR')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Frecuencia</Typography>
                      <Typography fontWeight={600}>{suscripcion.frecuenciaCobro}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Método de pago</Typography>
                      <Typography fontWeight={600}>{suscripcion.metodoPago}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Canal</Typography>
                      <Typography fontWeight={600}>{suscripcion.canalAdquisicion?.replace('_', ' ')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Desde</Typography>
                      <Typography fontWeight={600}>{formatDate(suscripcion.fechaInicio)}</Typography>
                    </Box>
                  </Stack>
                  {suscripcion.notas && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Notas:</strong> {suscripcion.notas}
                    </Typography>
                  )}
                  {suscripcion.estado === 'cancelada' && (
                    <Alert
                      severity="error"
                      action={
                        <Button
                          size="small"
                          startIcon={<RestoreIcon />}
                          onClick={handleReactivarSuscripcion}
                          disabled={savingSuscripcion}
                        >
                          Reactivar
                        </Button>
                      }
                    >
                      Suscripción cancelada el {formatDate(suscripcion.fechaCancelacion)}
                    </Alert>
                  )}
                  {suscripcion.estado === 'pausada' && (
                    <Alert severity="warning">
                      Suscripción pausada
                    </Alert>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card de Reuniones */}
        <Card 
          elevation={0} 
          sx={{ 
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2
          }}
        >
          <CardHeader 
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventIcon color="primary" />
                <Typography variant="h6">Reuniones</Typography>
                <Chip label={reuniones.length} size="small" color="primary" />
              </Stack>
            }
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenReunionDialog()}
                size="small"
              >
                Nueva Reunión
              </Button>
            }
          />
          <Divider />
          <CardContent>
            {reuniones.length === 0 ? (
              <Box 
                sx={{ 
                  py: 4, 
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <EventIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography>No hay reuniones registradas</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenReunionDialog()}
                  sx={{ mt: 2 }}
                >
                  Registrar primera reunión
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Título</TableCell>
                      <TableCell>Participantes</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reuniones
                      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                      .map((reunion) => (
                        <TableRow key={reunion.id} hover>
                          <TableCell>
                            <Chip 
                              label={formatDate(reunion.fecha)} 
                              size="small" 
                              variant="outlined"
                              icon={<EventIcon />}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={500}>
                              {reunion.titulo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {reunion.participantes || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ 
                                maxWidth: 200, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {reunion.descripcion || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton 
                                size="small" 
                                onClick={() => handleOpenReunionDialog(reunion)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteReunion(reunion.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Dialog para crear/editar reunión */}
        <Dialog 
          open={openReunionDialog} 
          onClose={handleCloseReunionDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingReunion ? 'Editar Reunión' : 'Nueva Reunión'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <DatePicker
                label="Fecha de la Reunión"
                value={reunionForm.fecha}
                onChange={(date) => setReunionForm(prev => ({ ...prev, fecha: date }))}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
              <TextField
                label="Título"
                value={reunionForm.titulo}
                onChange={(e) => setReunionForm(prev => ({ ...prev, titulo: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Participantes"
                value={reunionForm.participantes}
                onChange={(e) => setReunionForm(prev => ({ ...prev, participantes: e.target.value }))}
                fullWidth
                placeholder="Ej: Juan Pérez, María García"
              />
              <TextField
                label="Descripción"
                value={reunionForm.descripcion}
                onChange={(e) => setReunionForm(prev => ({ ...prev, descripcion: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Notas adicionales"
                value={reunionForm.notas}
                onChange={(e) => setReunionForm(prev => ({ ...prev, notas: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReunionDialog}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveReunion}
              startIcon={<SaveIcon />}
              disabled={isLoading}
            >
              {editingReunion ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar para notificaciones */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Stack>
    </LocalizationProvider>
  );
};
