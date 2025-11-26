import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, FormControl,
  InputLabel, Select, MenuItem, Divider, Alert
} from '@mui/material';
import { formatCurrency } from 'src/utils/formatters';

export default function AlquilarUnidadDialog({ 
  unidad, 
  onClose, 
  onConfirm 
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    precio_alquiler_acordado: '',
    moneda: 'USD',
    meses: '',
    dia_vencimiento: 1
  });

  useEffect(() => {
    if (unidad) {
      setFormData({
        nombre_cliente: '',
        precio_alquiler_acordado: '',
        moneda: 'USD',
        meses: '',
        dia_vencimiento: 1
      });
      setStep(1);
    }
  }, [unidad]);

  if (!unidad) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.nombre_cliente || !formData.precio_alquiler_acordado || !formData.meses) {
        alert('Por favor completá el cliente, precio de alquiler y cantidad de meses');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const alquilerFinal = {
        ...formData,
        precio_alquiler_acordado: parseFloat(formData.precio_alquiler_acordado),
        meses: parseInt(formData.meses),
        dia_vencimiento: parseInt(formData.dia_vencimiento),
        proyecto_id: unidad.proyectoId,
        proyecto_nombre: unidad.proyecto,
        subproyecto: unidad.nombre,
        subproyecto_id: unidad.nombre,
        subproyecto_nombre: unidad.nombre,
        edificio: unidad.edificio,
        lote: unidad.lote,
        tipificacion: unidad.tipificacion,
        cocheras: unidad.cocheras
      };

      onConfirm(alquilerFinal);
    }
  };

  const renderStep1 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info">
        Alquilando: <strong>{unidad.nombre}</strong> del proyecto <strong>{unidad.proyecto}</strong>
      </Alert>

      <TextField
        label="Nombre del cliente"
        value={formData.nombre_cliente}
        onChange={(e) => handleChange('nombre_cliente', e.target.value)}
        fullWidth
        required
      />

      <TextField
        label="Precio de alquiler mensual"
        type="number"
        value={formData.precio_alquiler_acordado}
        onChange={(e) => handleChange('precio_alquiler_acordado', e.target.value)}
        fullWidth
        required
      />

      <FormControl fullWidth>
        <InputLabel>Moneda</InputLabel>
        <Select
          value={formData.moneda}
          onChange={(e) => handleChange('moneda', e.target.value)}
          label="Moneda"
        >
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="ARS">ARS</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Cantidad de meses"
        type="number"
        value={formData.meses}
        onChange={(e) => handleChange('meses', e.target.value)}
        fullWidth
        required
        inputProps={{ min: 1 }}
      />
    </Box>
  );

  const renderStep2 = () => {
    const totalContrato = parseFloat(formData.precio_alquiler_acordado || 0) * parseInt(formData.meses || 0);
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="success">
          <Typography variant="h6">
            Resumen del alquiler
          </Typography>
        </Alert>

        <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
          <Typography><strong>Unidad:</strong> {unidad.nombre}</Typography>
          <Typography><strong>Proyecto:</strong> {unidad.proyecto}</Typography>
          <Typography><strong>Cliente:</strong> {formData.nombre_cliente}</Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography><strong>Precio mensual:</strong> {formatCurrency(formData.precio_alquiler_acordado)} {formData.moneda}</Typography>
          <Typography><strong>Cantidad de meses:</strong> {formData.meses}</Typography>
          <Typography><strong>Día de vencimiento:</strong> {formData.dia_vencimiento}</Typography>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="h6" color="primary">
            <strong>Total del contrato:</strong> {formatCurrency(totalContrato)} {formData.moneda}
          </Typography>
        </Box>

        <TextField
          label="Día de vencimiento de cada cuota (1-31)"
          type="number"
          value={formData.dia_vencimiento}
          onChange={(e) => handleChange('dia_vencimiento', e.target.value)}
          fullWidth
          inputProps={{ min: 1, max: 31 }}
          helperText="Día del mes en que vence cada cuota de alquiler"
        />

        <Alert severity="info">
          Se creará una cuenta a cobrar con {formData.meses} cuotas mensuales de {formatCurrency(formData.precio_alquiler_acordado)} {formData.moneda}.
        </Alert>
      </Box>
    );
  };

  return (
    <Dialog open={Boolean(unidad)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Alquilar Unidad - Paso {step} de 2
      </DialogTitle>
      
      <DialogContent>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </DialogContent>
      
      <DialogActions>
        {step === 2 && (
          <Button onClick={() => setStep(1)}>
            Atrás
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button 
          onClick={handleNext} 
          variant="contained" 
          color="primary"
        >
          {step === 1 ? 'Siguiente' : 'Confirmar Alquiler'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
