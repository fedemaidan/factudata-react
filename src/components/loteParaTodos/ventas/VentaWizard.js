import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Drawer, Typography, Stepper, Step, StepLabel,
  Stack, TextField, Autocomplete, Divider, MenuItem, Paper, Chip,
  InputAdornment, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { 
  mockClientes, 
  mockEmprendimientos,
  getEmprendimientosActivos,
  mockLotes,
  mockPlanes,
  getPlanesActivos,
  calcularFinanciacion
} from 'src/data/loteParaTodos/index';

const VentaWizard = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [clientes, setClientes] = useState(mockClientes); // Estado local para simular nuevos clientes
  const [lotes, setLotes] = useState(mockLotes);
  
  // Estados del flujo
  const [clienteSeleccionadoVenta, setClienteSeleccionadoVenta] = useState(null);
  const [showCreateClienteForm, setShowCreateClienteForm] = useState(false);
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [emprendimientoSeleccionado, setEmprendimientoSeleccionado] = useState(null);
  const [precioEditMode, setPrecioEditMode] = useState(false);
  const [tempPrecio, setTempPrecio] = useState('');

  const emprendimientosActivos = useMemo(() => getEmprendimientosActivos(), []);
  const planesActivos = useMemo(() => getPlanesActivos(), []);

  const ventaSteps = [
    'Buscar o Crear Cliente',
    'Seleccionar Proyecto y Lote', 
    'Configurar Modo de Pago',
    'Datos Adicionales'
  ];

  // Formularios
  const initialForm = { 
    nombre: '', apellido: '', dni: '', telefono: '', email: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const initialContrato = {
    emprendimiento_id: '',
    lote_id: '',
    plan_financiacion_id: '',
    precio_acordado: 0,
    entrega_inicial: 0,
    cuotas_cantidad: 0,
    cuota_mensual: 0,
    pago_contado_hoy: 0,
    fecha_contrato: new Date().toISOString().slice(0, 10),
    vendedor: '',
    observaciones: '',
    condiciones_especiales: []
  };
  const [contratoData, setContratoData] = useState(initialContrato);

  // Handlers
  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);
  
  const handleReset = () => {
    setActiveStep(0);
    setClienteSeleccionadoVenta(null);
    setShowCreateClienteForm(false);
    setContratoData(initialContrato);
    setFormData(initialForm);
    setEmprendimientoSeleccionado(null);
    setLotesDisponibles([]);
  };

  const selectClienteForVenta = (cliente) => {
    setClienteSeleccionadoVenta(cliente);
    handleNext();
  };

  const createNewClienteInVenta = () => {
    setShowCreateClienteForm(true);
    setFormData(initialForm);
  };

  const saveClienteInVenta = () => {
    if (!formData.nombre || !formData.apellido || !formData.dni) {
      alert('Complete los campos obligatorios');
      return;
    }
    
    const newCliente = {
      id: Math.max(...clientes.map(c => c.id)) + 1,
      ...formData,
      nombre: `${formData.nombre} ${formData.apellido}`,
      estado_cuenta: 'POTENCIAL',
      contratos: []
    };
    
    setClientes([...clientes, newCliente]);
    setClienteSeleccionadoVenta(newCliente);
    setShowCreateClienteForm(false);
    handleNext();
  };

  const handleEmprendimientoChange = (emprendimientoId) => {
    const empId = parseInt(emprendimientoId);
    setContratoData({ 
      ...contratoData, 
      emprendimiento_id: emprendimientoId,
      lote_id: '' // Reset lote
    });
    
    const emp = mockEmprendimientos.find(e => e.id === empId);
    setEmprendimientoSeleccionado(emp);
    
    if (emp) {
      // Filtrar lotes disponibles de este emprendimiento
      const lotesDelEmprendimiento = lotes.filter(l => 
        l.emprendimiento_id === empId && 
        l.estado === 'DISPONIBLE'
      );
      setLotesDisponibles(lotesDelEmprendimiento);
    } else {
      setLotesDisponibles([]);
    }
  };

  const calcularResumenVenta = (precioPersonalizado = null) => {
    // Esta función se llama cuando cambia el lote o el plan
    // En una implementación real, actualizaría el estado con los cálculos
    // Aquí confiamos en que el renderizado hará el cálculo usando calcularFinanciacion
  };

  const recalcularConPrecioManual = (nuevoPrecio) => {
    setContratoData(prev => ({
      ...prev,
      precio_acordado: parseFloat(nuevoPrecio)
    }));
    setPrecioEditMode(false);
  };

  const handleFinalizarVenta = () => {
    // Simular creación de contrato
    const nuevoContrato = {
      ...contratoData,
      cliente_id: clienteSeleccionadoVenta.id,
      estado: 'PRE-RESERVA' // Estado inicial comercial
    };
    
    if (onSuccess) onSuccess(nuevoContrato);
    onClose();
    handleReset();
  };

  return (
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={() => { onClose(); handleReset(); }}
      PaperProps={{ sx: { width: 800 } }}
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Venta de Lote
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 3 }}>
          {ventaSteps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* PASO 1: BUSCAR O CREAR CLIENTE */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Paso 1: Seleccionar Cliente</Typography>
              {!showCreateClienteForm ? (
                <Stack spacing={3}>
                  <Autocomplete
                    options={clientes}
                    getOptionLabel={(option) => `${option.nombre} - ${option.dni}`}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Buscar cliente existente" 
                        placeholder="Escriba el nombre o DNI del cliente"
                        fullWidth
                      />
                    )}
                    onChange={(event, value) => {
                      if (value) selectClienteForVenta(value);
                    }}
                  />
                  
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">O</Typography>
                  </Divider>
                  
                  <Button 
                    variant="outlined" 
                    onClick={createNewClienteInVenta}
                    fullWidth
                  >
                    Crear Nuevo Cliente
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={3}>
                  <Typography variant="subtitle1">Datos del Nuevo Cliente</Typography>
                  <Stack direction="row" spacing={2}>
                    <TextField 
                      label="Nombre (*)" 
                      value={formData.nombre} 
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                      required 
                      fullWidth 
                    />
                    <TextField 
                      label="Apellido (*)" 
                      value={formData.apellido} 
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} 
                      required 
                      fullWidth 
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField 
                      label="DNI (*)" 
                      value={formData.dni} 
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '') })} 
                      required 
                      fullWidth 
                    />
                    <TextField 
                      label="Teléfono (*)" 
                      value={formData.telefono} 
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                      required 
                      fullWidth 
                    />
                  </Stack>
                  <TextField 
                    label="Email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    fullWidth 
                  />
                  
                  <Stack direction="row" spacing={2}>
                    <Button 
                      onClick={() => setShowCreateClienteForm(false)} 
                      color="inherit"
                      fullWidth
                    >
                      Volver a Buscar
                    </Button>
                    <Button 
                      onClick={saveClienteInVenta} 
                      variant="contained"
                      fullWidth
                    >
                      Crear y Continuar
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Box>
          )}

          {/* PASO 2: PROYECTO Y LOTE */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Paso 2: Proyecto y Lote</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Cliente seleccionado: <strong>{clienteSeleccionadoVenta?.nombre}</strong>
              </Typography>
              
              <Stack spacing={3}>
                <TextField 
                  label="Emprendimiento" 
                  select
                  value={contratoData.emprendimiento_id} 
                  onChange={(e) => handleEmprendimientoChange(e.target.value)} 
                  fullWidth
                  required
                >
                  <MenuItem value="">Seleccionar emprendimiento</MenuItem>
                  {emprendimientosActivos.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      <Box>
                        <Typography variant="body2">{e.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {e.ubicacion} • {e.lotes_disponibles} disponibles
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
                
                <TextField 
                  label="Lote" 
                  select
                  value={contratoData.lote_id} 
                  onChange={(e) => {
                    setContratoData({ ...contratoData, lote_id: e.target.value });
                  }} 
                  fullWidth
                  required
                  disabled={!emprendimientoSeleccionado}
                  helperText={emprendimientoSeleccionado ? `${lotesDisponibles.length} lotes disponibles` : "Selecciona un emprendimiento primero"}
                >
                  <MenuItem value="">Seleccionar lote</MenuItem>
                  {lotesDisponibles.map((lote) => (
                    <MenuItem key={lote.id} value={lote.id}>
                      <Box>
                        <Typography variant="body2">
                          {lote.numero} - Manzana {lote.manzana}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lote.superficie}m² • ${lote.precio_base?.toLocaleString()}
                          {lote.observaciones && ` • ${lote.observaciones}`}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                {contratoData.lote_id && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Resumen del Lote</Typography>
                    {(() => {
                      const loteSeleccionado = lotes.find(l => l.id === parseInt(contratoData.lote_id));
                      return loteSeleccionado && (
                        <Stack spacing={1}>
                          <Typography variant="body2">
                            <strong>Lote:</strong> {loteSeleccionado.numero} - Manzana {loteSeleccionado.manzana}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Superficie:</strong> {loteSeleccionado.superficie} m²
                          </Typography>
                          <Typography variant="body2">
                            <strong>Precio base:</strong> ${loteSeleccionado.precio_base?.toLocaleString()}
                          </Typography>
                        </Stack>
                      );
                    })()}
                  </Paper>
                )}
              </Stack>
            </Box>
          )}

          {/* PASO 3: MODO DE PAGO */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Paso 3: Configuración de Pago</Typography>
              
              <Stack spacing={3}>
                <TextField 
                  label="Plan de Financiación" 
                  select
                  value={contratoData.plan_financiacion_id} 
                  onChange={(e) => {
                    setContratoData({ ...contratoData, plan_financiacion_id: e.target.value });
                  }} 
                  fullWidth
                  required
                >
                  <MenuItem value="">Seleccionar plan</MenuItem>
                  {planesActivos.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      <Box>
                        <Typography variant="body2">{plan.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plan.cuotas_cantidad} cuotas • {plan.interes_mensual}% mensual
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                {contratoData.plan_financiacion_id && contratoData.lote_id && (() => {
                  const lote = lotes.find(l => l.id === parseInt(contratoData.lote_id));
                  const precioACalcular = contratoData.precio_acordado > 0 ? contratoData.precio_acordado : (lote?.precio_base || 0);
                  const calculacion = calcularFinanciacion(precioACalcular, parseInt(contratoData.plan_financiacion_id));
                  
                  return calculacion && (
                    <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: 'success.800' }}>💰 Resumen Financiero</Typography>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">Precio Final:</Typography>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {!precioEditMode ? (
                              <>
                                <Typography variant="body2" fontWeight={600}>
                                  ${precioACalcular.toLocaleString('es-AR')}
                                </Typography>
                                <IconButton size="small" onClick={() => {
                                  setTempPrecio(precioACalcular);
                                  setPrecioEditMode(true);
                                }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </>
                            ) : (
                              <Stack direction="row" spacing={1}>
                                <TextField 
                                  size="small" 
                                  value={tempPrecio} 
                                  onChange={(e) => setTempPrecio(e.target.value)}
                                  type="number"
                                  sx={{ width: 120 }}
                                />
                                <IconButton size="small" color="success" onClick={() => recalcularConPrecioManual(tempPrecio)}>
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setPrecioEditMode(false)}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            )}
                          </Stack>
                        </Stack>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Anticipo ({calculacion.porcentaje_anticipo}%):</Typography>
                          <Typography variant="body2" fontWeight={600}>${calculacion.anticipo_monto.toLocaleString('es-AR')}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Saldo a financiar:</Typography>
                          <Typography variant="body2">${calculacion.saldo_financiar.toLocaleString('es-AR')}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1, bgcolor: 'success.100', p: 1, borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="success.900">
                            {calculacion.cuotas_cantidad} cuotas de:
                          </Typography>
                          <Typography variant="subtitle2" color="success.900" fontWeight={700}>
                            ${calculacion.cuota_valor.toLocaleString('es-AR')}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })()}
              </Stack>
            </Box>
          )}

          {/* PASO 4: DATOS ADICIONALES */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Paso 4: Datos Adicionales</Typography>
              <Stack spacing={3}>
                <TextField
                  label="Vendedor Responsable"
                  select
                  value={contratoData.vendedor}
                  onChange={(e) => setContratoData({ ...contratoData, vendedor: e.target.value })}
                  fullWidth
                >
                  <MenuItem value="Juan Pérez">Juan Pérez</MenuItem>
                  <MenuItem value="María García">María García</MenuItem>
                  <MenuItem value="Carlos López">Carlos López</MenuItem>
                </TextField>

                <TextField
                  label="Observaciones"
                  multiline
                  rows={4}
                  value={contratoData.observaciones}
                  onChange={(e) => setContratoData({ ...contratoData, observaciones: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Fecha de Firma Estimada"
                  type="date"
                  value={contratoData.fecha_contrato}
                  onChange={(e) => setContratoData({ ...contratoData, fecha_contrato: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Atrás
          </Button>
          <Button
            variant="contained"
            onClick={activeStep === ventaSteps.length - 1 ? handleFinalizarVenta : handleNext}
            disabled={
              (activeStep === 1 && !contratoData.lote_id) ||
              (activeStep === 2 && !contratoData.plan_financiacion_id)
            }
          >
            {activeStep === ventaSteps.length - 1 ? 'Finalizar Venta' : 'Siguiente'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default VentaWizard;
