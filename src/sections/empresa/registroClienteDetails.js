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
  Grid,
  MenuItem
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
import PaidIcon from '@mui/icons-material/Paid';
import { updateEmpresaDetails } from 'src/services/empresaService';
import { updateConversacionesEmpresa } from 'src/services/conversacionService';

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

  // Suscripción interna (admin de Sorby) + datos comerciales.
  const [susc, setSusc] = useState({
    activa: true, importe: '', moneda: 'ARS', periodicidad: 'mensual',
    en_cuotas: false, cantidad_cuotas: '', fecha_inicio: null, semana_pago: '',
    paga_por_mp: false, mp_name: '',
    requiere_factura: false, responsable_facturacion: '', razon_social_facturacion: '', cuit_facturacion: '',
    vendedor: '', canal_adquisicion: '', plan: '',
  });
  const [hasSuscChanges, setHasSuscChanges] = useState(false);

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
      const s = empresa.suscripcion || {};
      setSusc({
        activa: s.activa !== false,
        importe: s.importe ?? '',
        moneda: s.moneda || 'ARS',
        periodicidad: s.periodicidad || 'mensual',
        en_cuotas: !!s.en_cuotas,
        cantidad_cuotas: s.cantidad_cuotas ?? '',
        fecha_inicio: s.fecha_inicio ? new Date(s.fecha_inicio) : null,
        semana_pago: s.semana_pago ?? '',
        paga_por_mp: !!s.paga_por_mp,
        mp_name: s.mp_name || '',
        requiere_factura: !!s.requiere_factura,
        responsable_facturacion: s.responsable_facturacion || '',
        razon_social_facturacion: s.razon_social_facturacion || '',
        cuit_facturacion: s.cuit_facturacion || '',
        vendedor: empresa.vendedor || '',
        canal_adquisicion: empresa.canal_adquisicion || '',
        plan: empresa.plan || '',
      });
      setHasSuscChanges(false);
    }
  }, [empresa]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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

  const handleSuscChange = (field, value) => {
    setSusc(prev => ({ ...prev, [field]: value }));
    setHasSuscChanges(true);
  };

  // Ingreso mensual equivalente (mensual = importe; anual = importe / 12).
  const ingresoMensualEq = (() => {
    if (susc.activa === false) return 0;
    const imp = Number(susc.importe) || 0;
    const meses = { mensual: 1, bimestral: 2, semestral: 6, anual: 12 }[susc.periodicidad] || 1;
    return Math.round((imp / meses) * 100) / 100;
  })();

  const handleSaveSuscripcion = async () => {
    setIsLoading(true);
    try {
      const suscripcion = {
        activa: susc.activa,
        importe: Number(susc.importe) || 0,
        moneda: susc.moneda,
        periodicidad: susc.periodicidad,
        en_cuotas: susc.en_cuotas,
        cantidad_cuotas: susc.en_cuotas ? (Number(susc.cantidad_cuotas) || null) : null,
        fecha_inicio: susc.fecha_inicio ? susc.fecha_inicio.toISOString() : null,
        semana_pago: susc.semana_pago ? Number(susc.semana_pago) : null,
        paga_por_mp: susc.paga_por_mp,
        mp_name: susc.mp_name || null,
        requiere_factura: susc.requiere_factura,
        responsable_facturacion: susc.responsable_facturacion || null,
        razon_social_facturacion: susc.razon_social_facturacion || null,
        cuit_facturacion: susc.cuit_facturacion || null,
      };
      const success = await updateEmpresaDetails(empresa.id, {
        suscripcion,
        vendedor: susc.vendedor || null,
        canal_adquisicion: susc.canal_adquisicion || null,
        plan: susc.plan || null,
        esCliente: true,
      });
      if (success) {
        setHasSuscChanges(false);
        showSnackbar('Suscripción guardada correctamente');
      } else {
        showSnackbar('Error al guardar la suscripción', 'error');
      }
    } catch (error) {
      console.error('Error al guardar suscripción:', error);
      showSnackbar('Error al guardar la suscripción', 'error');
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

        {/* Card de Suscripción y Facturación (admin de Sorby) */}
        <Card
          elevation={0}
          sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
        >
          <CardHeader
            title={
              <Stack direction="row" alignItems="center" spacing={1}>
                <PaidIcon color="primary" />
                <Typography variant="h6">Suscripción y Facturación</Typography>
                {ingresoMensualEq > 0 && (
                  <Chip
                    label={`Mensual eq. ${ingresoMensualEq.toLocaleString('es-AR')} ${susc.moneda}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            }
            action={
              hasSuscChanges && (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSuscripcion}
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
              {/* Suscripción */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Suscripción</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Importe" type="number" size="small" fullWidth
                      value={susc.importe}
                      onChange={(e) => handleSuscChange('importe', e.target.value)} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField label="Moneda" select size="small" fullWidth
                      value={susc.moneda}
                      onChange={(e) => handleSuscChange('moneda', e.target.value)}>
                      <MenuItem value="ARS">ARS</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField label="Periodicidad" select size="small" fullWidth
                      value={susc.periodicidad}
                      onChange={(e) => handleSuscChange('periodicidad', e.target.value)}>
                      <MenuItem value="mensual">Mensual</MenuItem>
                      <MenuItem value="bimestral">Bimestral</MenuItem>
                      <MenuItem value="semestral">Semestral</MenuItem>
                      <MenuItem value="anual">Anual</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <DatePicker label="Fecha de inicio"
                      value={susc.fecha_inicio}
                      onChange={(date) => handleSuscChange('fecha_inicio', date)}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }} />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <TextField label="Semana de pago" type="number" size="small" fullWidth
                      value={susc.semana_pago}
                      onChange={(e) => handleSuscChange('semana_pago', e.target.value)}
                      helperText="1 a 4" />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <FormControlLabel
                        control={<Switch checked={susc.en_cuotas}
                          onChange={(e) => handleSuscChange('en_cuotas', e.target.checked)} />}
                        label="En cuotas" />
                      {susc.en_cuotas && (
                        <TextField label="Cantidad" type="number" size="small"
                          sx={{ maxWidth: 100 }}
                          value={susc.cantidad_cuotas}
                          onChange={(e) => handleSuscChange('cantidad_cuotas', e.target.value)} />
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Mercado Pago */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Mercado Pago</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={<Switch checked={susc.paga_por_mp}
                        onChange={(e) => handleSuscChange('paga_por_mp', e.target.checked)} />}
                      label="Paga por MP" />
                  </Grid>
                  {susc.paga_por_mp && (
                    <Grid item xs={12} sm={8}>
                      <TextField label="MP Name" size="small" fullWidth
                        value={susc.mp_name}
                        onChange={(e) => handleSuscChange('mp_name', e.target.value)}
                        helperText="Nombre con que aparece la acreditación" />
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Facturación */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Facturación</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={<Switch checked={susc.requiere_factura}
                        onChange={(e) => handleSuscChange('requiere_factura', e.target.checked)} />}
                      label="Requiere factura" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Responsable" select size="small" fullWidth
                      value={susc.responsable_facturacion}
                      onChange={(e) => handleSuscChange('responsable_facturacion', e.target.value)}>
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="facu">Facu</MenuItem>
                      <MenuItem value="fede">Fede</MenuItem>
                      <MenuItem value="otro">Otro</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="CUIT facturación" size="small" fullWidth
                      value={susc.cuit_facturacion}
                      onChange={(e) => handleSuscChange('cuit_facturacion', e.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Razón social facturación" size="small" fullWidth
                      value={susc.razon_social_facturacion}
                      onChange={(e) => handleSuscChange('razon_social_facturacion', e.target.value)} />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Datos comerciales */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Datos comerciales</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Vendedor" size="small" fullWidth
                      value={susc.vendedor}
                      onChange={(e) => handleSuscChange('vendedor', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Canal de adquisición" size="small" fullWidth
                      value={susc.canal_adquisicion}
                      onChange={(e) => handleSuscChange('canal_adquisicion', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField label="Plan / tier" size="small" fullWidth
                      value={susc.plan}
                      onChange={(e) => handleSuscChange('plan', e.target.value)} />
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </CardContent>
        </Card>

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
