// src/components/loteParaTodos/NuevaReservaDialog.js
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stepper, Step, StepLabel, Box, Typography,
  Grid, TextField, MenuItem, Autocomplete, Chip,
  Alert, Stack, Paper, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

import { CONDICION_LOTE, CONDICION_LOTE_LABELS } from '../../data/loteParaTodos/constantes.js';
import { getPlanesActivos } from '../../data/loteParaTodos/mockPlanes.js';
import { buscarClientes } from '../../data/loteParaTodos/mockClientes.js';
import { mockVendedores } from '../../data/loteParaTodos/mockVendedores.js';

const PASOS_VENTA = [
  'Plan de Financiación',
  'Datos del Cliente',
  'Condiciones de Venta',
  'Confirmación'
];

const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' }
];

const NuevaReservaDialog = ({ 
  open, 
  onClose, 
  lote, 
  emprendimiento,
  onReservaCreada
}) => {
  const [pasoActual, setPasoActual] = useState(0);
  const [planes, setPlanes] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    // Paso 1: Plan
    planSeleccionado: null,
    precio_personalizado: '',
    descuento_adicional: '',
    
    // Paso 2: Cliente
    cliente: null,
    cliente_nuevo: {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      dni: '',
      direccion: '',
      localidad: '',
      codigo_postal: '',
      fecha_nacimiento: null,
      estado_civil: '',
      ocupacion: '',
      observaciones: ''
    },
    es_cliente_nuevo: false,
    
    // Paso 3: Datos de reserva
    fecha_boleto: new Date(),
    monto_seña: '',
    medio_pago: 'efectivo',
    vendedor_id: null,
    observaciones_reserva: '',
    tipo_reserva: 'pre_reservado' // pre_reservado | reservado
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (open) {
      setPlanes(getPlanesActivos());
      setClientes(buscarClientes(''));
      
      // Reset form
      setPasoActual(0);
      setFormData(prev => ({
        ...prev,
        planSeleccionado: null,
        cliente: null,
        es_cliente_nuevo: false
      }));
      setErrors({});
    }
  }, [open]);

  const handlePasoSiguiente = () => {
    if (validarPasoActual()) {
      setPasoActual(prev => prev + 1);
    }
  };

  const handlePasoAnterior = () => {
    setPasoActual(prev => prev - 1);
  };

  const validarPasoActual = () => {
    const newErrors = {};
    
    switch (pasoActual) {
      case 0: // Plan
        if (!formData.planSeleccionado) {
          newErrors.plan = 'Debe seleccionar un plan de financiación';
        }
        break;
        
      case 1: // Cliente
        if (formData.es_cliente_nuevo) {
          if (!formData.cliente_nuevo.nombre) newErrors.nombre = 'Nombre es obligatorio';
          if (!formData.cliente_nuevo.apellido) newErrors.apellido = 'Apellido es obligatorio';
          if (!formData.cliente_nuevo.email) newErrors.email = 'Email es obligatorio';
          if (!formData.cliente_nuevo.telefono) newErrors.telefono = 'Teléfono es obligatorio';
          if (!formData.cliente_nuevo.dni) newErrors.dni = 'DNI es obligatorio';
        } else {
          if (!formData.cliente) newErrors.cliente = 'Debe seleccionar un cliente';
        }
        break;
        
      case 2: // Datos de reserva
        if (!formData.fecha_boleto) newErrors.fecha_boleto = 'Fecha de boleto es obligatoria';
        if (!formData.monto_seña || parseFloat(formData.monto_seña) <= 0) {
          newErrors.monto_seña = 'Monto de seña debe ser mayor a 0';
        }
        if (!formData.vendedor_id) newErrors.vendedor_id = 'Debe seleccionar un vendedor';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCrearReserva = async () => {
    if (!validarPasoActual()) return;
    
    setLoading(true);
    
    try {
      // Determinar precio final
      const precioFinal = formData.precio_personalizado 
        ? parseFloat(formData.precio_personalizado)
        : lote.precio_base;
      
      const montoSeña = parseFloat(formData.monto_seña);
      const porcentajeSeña = (montoSeña / precioFinal) * 100;
      
      // Crear datos de la venta/reserva basado en la selección del usuario
      const ventaData = {
        lote_id: lote.id,
        emprendimiento_id: emprendimiento.id,
        plan_id: formData.planSeleccionado.id,
        cliente: formData.es_cliente_nuevo ? formData.cliente_nuevo : formData.cliente,
        fecha_venta: formData.fecha_boleto,
        monto_seña: montoSeña,
        medio_pago: formData.medio_pago,
        vendedor_id: formData.vendedor_id,
        observaciones_venta: formData.observaciones_reserva,
        tipo_operacion: formData.tipo_reserva,
        nueva_condicion_lote: formData.tipo_reserva === 'pre_reservado' 
          ? CONDICION_LOTE.PRE_RESERVADO 
          : CONDICION_LOTE.RESERVADO,
        fecha_creacion: new Date().toISOString(),
        precio_final: precioFinal,
        porcentaje_seña: porcentajeSeña
      };
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Datos de la venta:', ventaData);
      console.log(`Operación: ${ventaData.tipo_operacion} (${porcentajeSeña.toFixed(1)}% de seña)`);
      
      // Aquí iría la llamada a la API para crear la venta
      // y actualizar la condición del lote
      // await api.crearVenta(ventaData);
      // await api.actualizarLote(lote.id, { condicion_lote: formData.tipo_reserva });
      
      onReservaCreada(ventaData);
      handleClose();
      
    } catch (error) {
      console.error('Error al crear reserva:', error);
      setErrors({ general: 'Error al crear la reserva. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPasoActual(0);
    setFormData({
      planSeleccionado: null,
      precio_personalizado: '',
      descuento_adicional: '',
      cliente: null,
        cliente_nuevo: {
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        dni: '',
        direccion: '',
        localidad: '',
        codigo_postal: '',
        fecha_nacimiento: null,
        estado_civil: '',
        ocupacion: '',
        observaciones: ''
      },
      es_cliente_nuevo: false,
      fecha_boleto: new Date(),
      monto_seña: '',
      medio_pago: 'efectivo',
      vendedor_id: null,
      observaciones_reserva: '',
      tipo_reserva: 'pre_reservado'
    });
    setErrors({});
    onClose();
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 0:
        return renderPasoPlanes();
      case 1:
        return renderPasoCliente();
      case 2:
        return renderPasoDatosReserva();
      case 3:
        return renderPasoConfirmacion();
      default:
        return null;
    }
  };

  const renderPasoPlanes = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Seleccionar Plan de Financiación
      </Typography>
      
      <Grid container spacing={2}>
        {planes.map(plan => (
          <Grid item xs={12} sm={6} key={plan.id}>
            <Paper 
              sx={{ 
                p: 2,
                cursor: 'pointer',
                border: formData.planSeleccionado?.id === plan.id ? 2 : 1,
                borderColor: formData.planSeleccionado?.id === plan.id ? 'primary.main' : 'grey.300',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => setFormData(prev => ({ ...prev, planSeleccionado: plan }))}
            >
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                {plan.nombre}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {plan.descripcion}
              </Typography>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Cuotas:</Typography>
                  <Typography variant="body2" fontWeight={600}>{plan.cuotas_cantidad}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Interés mensual:</Typography>
                  <Typography variant="body2" fontWeight={600}>{plan.interes_mensual}%</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Entrega mín.:</Typography>
                  <Typography variant="body2" fontWeight={600}>{plan.entrega_inicial_minima}%</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {errors.plan && (
        <Alert severity="error" sx={{ mt: 2 }}>{errors.plan}</Alert>
      )}
      
      {formData.planSeleccionado && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Condiciones Especiales (Opcional)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio Personalizado"
                type="number"
                fullWidth
                value={formData.precio_personalizado}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  precio_personalizado: e.target.value
                }))}
                helperText={`Precio base del lote: $${lote.precio_base?.toLocaleString('es-AR')}`}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Descuento Adicional (%)"
                type="number"
                fullWidth
                value={formData.descuento_adicional}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  descuento_adicional: e.target.value
                }))}
                helperText="Descuento extra sobre el plan"
              />
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );

  const renderPasoCliente = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Seleccionar o Crear Cliente
      </Typography>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant={!formData.es_cliente_nuevo ? 'contained' : 'outlined'}
          onClick={() => setFormData(prev => ({ ...prev, es_cliente_nuevo: false }))}
        >
          Cliente Existente
        </Button>
        <Button
          variant={formData.es_cliente_nuevo ? 'contained' : 'outlined'}
          onClick={() => setFormData(prev => ({ ...prev, es_cliente_nuevo: true }))}
        >
          Nuevo Cliente
        </Button>
      </Stack>
      
      {!formData.es_cliente_nuevo ? (
        <Autocomplete
          options={clientes}
          getOptionLabel={(option) => `${option.nombre} ${option.apellido} - ${option.dni}`}
          value={formData.cliente}
          onChange={(event, newValue) => {
            setFormData(prev => ({ ...prev, cliente: newValue }));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar cliente"
              error={!!errors.cliente}
              helperText={errors.cliente}
            />
          )}
        />
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre"
              fullWidth
              required
              value={formData.cliente_nuevo.nombre}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, nombre: e.target.value }
              }))}
              error={!!errors.nombre}
              helperText={errors.nombre}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Apellido"
              fullWidth
              required
              value={formData.cliente_nuevo.apellido}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, apellido: e.target.value }
              }))}
              error={!!errors.apellido}
              helperText={errors.apellido}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.cliente_nuevo.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, email: e.target.value }
              }))}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono"
              fullWidth
              required
              value={formData.cliente_nuevo.telefono}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, telefono: e.target.value }
              }))}
              error={!!errors.telefono}
              helperText={errors.telefono}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="DNI"
              fullWidth
              required
              value={formData.cliente_nuevo.dni}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, dni: e.target.value }
              }))}
              error={!!errors.dni}
              helperText={errors.dni}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Dirección"
              fullWidth
              value={formData.cliente_nuevo.direccion}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, direccion: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Localidad"
              fullWidth
              value={formData.cliente_nuevo.localidad}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, localidad: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Código Postal"
              fullWidth
              value={formData.cliente_nuevo.codigo_postal}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, codigo_postal: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Fecha de Nacimiento"
              value={formData.cliente_nuevo.fecha_nacimiento}
              onChange={(newValue) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, fecha_nacimiento: newValue }
              }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Estado Civil"
              select
              fullWidth
              value={formData.cliente_nuevo.estado_civil}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, estado_civil: e.target.value }
              }))}
            >
              <MenuItem value="soltero">Soltero/a</MenuItem>
              <MenuItem value="casado">Casado/a</MenuItem>
              <MenuItem value="divorciado">Divorciado/a</MenuItem>
              <MenuItem value="viudo">Viudo/a</MenuItem>
              <MenuItem value="concubinato">Concubinato</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Ocupación"
              fullWidth
              value={formData.cliente_nuevo.ocupacion}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, ocupacion: e.target.value }
              }))}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Observaciones del Cliente"
              fullWidth
              multiline
              rows={3}
              value={formData.cliente_nuevo.observaciones}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cliente_nuevo: { ...prev.cliente_nuevo, observaciones: e.target.value }
              }))}
              placeholder="Información adicional sobre el cliente..."
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderPasoDatosReserva = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Datos de la Reserva
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Tipo de Reserva"
            select
            fullWidth
            value={formData.tipo_reserva}
            onChange={(e) => setFormData(prev => ({ ...prev, tipo_reserva: e.target.value }))}
          >
            <MenuItem value="pre_reservado">Pre-reservado (Seña)</MenuItem>
            <MenuItem value="reservado">Reservado (Confirmado)</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Fecha de Boleto"
            value={formData.fecha_boleto}
            onChange={(newValue) => setFormData(prev => ({ ...prev, fecha_boleto: newValue }))}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                error={!!errors.fecha_boleto}
                helperText={errors.fecha_boleto}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Monto de Seña"
            type="number"
            fullWidth
            required
            value={formData.monto_seña}
            onChange={(e) => setFormData(prev => ({ ...prev, monto_seña: e.target.value }))}
            error={!!errors.monto_seña}
            helperText={errors.monto_seña}
            InputProps={{
              startAdornment: '$'
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Medio de Pago"
            select
            fullWidth
            value={formData.medio_pago}
            onChange={(e) => setFormData(prev => ({ ...prev, medio_pago: e.target.value }))}
          >
            {MEDIOS_PAGO.map(medio => (
              <MenuItem key={medio.value} value={medio.value}>
                {medio.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Vendedor Responsable"
            select
            fullWidth
            required
            value={formData.vendedor_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, vendedor_id: e.target.value }))}
            error={!!errors.vendedor_id}
            helperText={errors.vendedor_id}
          >
            {mockVendedores.map(vendedor => (
              <MenuItem key={vendedor.id} value={vendedor.id}>
                {vendedor.nombre} {vendedor.apellido}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Observaciones de la Reserva"
            multiline
            rows={3}
            fullWidth
            value={formData.observaciones_reserva}
            onChange={(e) => setFormData(prev => ({ ...prev, observaciones_reserva: e.target.value }))}
            helperText="Detalles específicos de esta reserva/venta"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderPasoConfirmacion = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Confirmar Reserva
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Revise todos los datos antes de confirmar la reserva. Una vez creada, el lote cambiará su estado.
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              📍 Lote
            </Typography>
            <Typography variant="body2">
              <strong>Lote:</strong> {lote.numero} - Manzana {lote.manzana}
            </Typography>
            <Typography variant="body2">
              <strong>Superficie:</strong> {lote.superficie}m²
            </Typography>
            <Typography variant="body2">
              <strong>Precio:</strong> ${(formData.precio_personalizado || lote.precio_base)?.toLocaleString('es-AR')}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              👤 Cliente
            </Typography>
            {formData.es_cliente_nuevo ? (
              <>
                <Typography variant="body2">
                  <strong>Nombre:</strong> {formData.cliente_nuevo.nombre} {formData.cliente_nuevo.apellido}
                </Typography>
                <Typography variant="body2">
                  <strong>DNI:</strong> {formData.cliente_nuevo.dni}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {formData.cliente_nuevo.email}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2">
                  <strong>Nombre:</strong> {formData.cliente?.nombre} {formData.cliente?.apellido}
                </Typography>
                <Typography variant="body2">
                  <strong>DNI:</strong> {formData.cliente?.dni}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {formData.cliente?.email}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              💰 Reserva
            </Typography>
            <Stack direction="row" spacing={4}>
              <Typography variant="body2">
                <strong>Tipo:</strong> {CONDICION_LOTE_LABELS[formData.tipo_reserva]}
              </Typography>
              <Typography variant="body2">
                <strong>Seña:</strong> ${parseFloat(formData.monto_seña || 0).toLocaleString('es-AR')}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha Boleto:</strong> {formData.fecha_boleto?.toLocaleDateString('es-AR')}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      
      {errors.general && (
        <Alert severity="error" sx={{ mt: 2 }}>{errors.general}</Alert>
      )}
    </Box>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { minHeight: '70vh' } }}
      >
      <DialogTitle>
        Nueva Reserva - Lote {lote?.numero}
      </DialogTitle>
      
      <DialogContent sx={{ pb: 0 }}>
        <Stepper activeStep={pasoActual} sx={{ mb: 3 }}>
          {PASOS_VENTA.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderPasoActual()}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {pasoActual > 0 && (
          <Button onClick={handlePasoAnterior}>
            Anterior
          </Button>
        )}

        {pasoActual < PASOS_VENTA.length - 1 ? (
          <Button 
            onClick={handlePasoSiguiente}
            variant="contained"
          >
            Siguiente
          </Button>
        ) : (
          <Button 
            onClick={handleCrearReserva}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Reserva'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
    </LocalizationProvider>
  );
};

export default NuevaReservaDialog;