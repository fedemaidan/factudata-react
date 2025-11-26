import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, FormControl,
  InputLabel, Select, MenuItem, Divider, Alert
} from '@mui/material';
import { formatCurrency } from 'src/utils/formatters';

export default function VenderUnidadDialog({ 
  unidad, 
  onClose, 
  onConfirm 
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    precio_venta_acordado: '',
    moneda: 'USD',
    contado: 0,
    moneda_contado: 'USD',
    cuenta_pendiente: null
  });

  const [cuentaPendienteForm, setCuentaPendienteForm] = useState({
    valor: '',
    moneda: 'USD',
    indexacion: '',
    frecuencia_indexacion: 'mensual',
    cantidad_cuotas: ''
  });

  const [tipoPago, setTipoPago] = useState(''); // 'solo_contado', 'solo_financiado', 'mixto'

  useEffect(() => {
    if (unidad) {
      setFormData({
        nombre_cliente: '',
        precio_venta_acordado: unidad.total_uf || unidad.valor_uf || '',
        moneda: 'USD',
        contado: 0,
        moneda_contado: 'USD',
        cuenta_pendiente: null
      });
      setStep(1);
      setTipoPago('');
    }
  }, [unidad]);

  if (!unidad) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCuentaPendienteChange = (field, value) => {
    setCuentaPendienteForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.nombre_cliente || !formData.precio_venta_acordado) {
        alert('Por favor completá el cliente y el precio de venta');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!tipoPago) {
        alert('Por favor seleccioná una forma de pago');
        return;
      }

      let cuentaPendiente = null;
      let contado = 0;

      if (tipoPago === 'solo_contado') {
        contado = parseFloat(formData.precio_venta_acordado);
      } else if (tipoPago === 'solo_financiado') {
        cuentaPendiente = {
          ...cuentaPendienteForm,
          valor: parseFloat(cuentaPendienteForm.valor || formData.precio_venta_acordado)
        };
      } else if (tipoPago === 'mixto') {
        contado = parseFloat(formData.contado || 0);
        const saldo = parseFloat(formData.precio_venta_acordado) - contado;
        cuentaPendiente = {
          ...cuentaPendienteForm,
          valor: parseFloat(cuentaPendienteForm.valor || saldo)
        };
      }

      const ventaFinal = {
        ...formData,
        contado,
        cuenta_pendiente: cuentaPendiente,
        proyecto_id: unidad.proyectoId,
        proyecto_nombre: unidad.proyecto,
        subproyecto: unidad.nombre,
        subproyecto_id: unidad.nombre,
        edificio: unidad.edificio,
        lote: unidad.lote,
        tipificacion: unidad.tipificacion,
        cocheras: unidad.cocheras
      };

      onConfirm(ventaFinal);
    }
  };

  const renderStep1 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info">
        Vendiendo: <strong>{unidad.nombre}</strong> del proyecto <strong>{unidad.proyecto}</strong>
      </Alert>

      <TextField
        label="Nombre del cliente"
        value={formData.nombre_cliente}
        onChange={(e) => handleChange('nombre_cliente', e.target.value)}
        fullWidth
        required
      />

      <TextField
        label="Precio de venta acordado"
        type="number"
        value={formData.precio_venta_acordado}
        onChange={(e) => handleChange('precio_venta_acordado', e.target.value)}
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
    </Box>
  );

  const renderStep2 = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">
        Total de venta: {formatCurrency(formData.precio_venta_acordado)} {formData.moneda}
      </Typography>

      <Divider />

      <Typography variant="subtitle1" fontWeight="bold">
        ¿Cómo se pagó esta venta?
      </Typography>

      <FormControl fullWidth>
        <InputLabel>Forma de pago</InputLabel>
        <Select
          value={tipoPago}
          onChange={(e) => setTipoPago(e.target.value)}
          label="Forma de pago"
        >
          <MenuItem value="solo_contado">Todo al contado</MenuItem>
          <MenuItem value="solo_financiado">Todo financiado (cuenta pendiente)</MenuItem>
          <MenuItem value="mixto">Mixto (contado + financiado)</MenuItem>
        </Select>
      </FormControl>

      {tipoPago === 'mixto' && (
        <>
          <TextField
            label="Monto pagado al contado"
            type="number"
            value={formData.contado}
            onChange={(e) => handleChange('contado', e.target.value)}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Moneda del contado</InputLabel>
            <Select
              value={formData.moneda_contado}
              onChange={(e) => handleChange('moneda_contado', e.target.value)}
              label="Moneda del contado"
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="ARS">ARS</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary">
            Saldo a financiar: {formatCurrency(
              parseFloat(formData.precio_venta_acordado) - parseFloat(formData.contado || 0)
            )} {formData.moneda}
          </Typography>
        </>
      )}

      {(tipoPago === 'solo_financiado' || tipoPago === 'mixto') && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight="bold">
            Datos de la cuenta pendiente
          </Typography>

          <TextField
            label="Valor de la cuenta pendiente"
            type="number"
            value={cuentaPendienteForm.valor}
            onChange={(e) => handleCuentaPendienteChange('valor', e.target.value)}
            fullWidth
            helperText="Si dejás vacío, se calcula automáticamente"
          />

          <FormControl fullWidth>
            <InputLabel>Moneda</InputLabel>
            <Select
              value={cuentaPendienteForm.moneda}
              onChange={(e) => handleCuentaPendienteChange('moneda', e.target.value)}
              label="Moneda"
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="ARS">ARS</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Indexación</InputLabel>
            <Select
              value={cuentaPendienteForm.indexacion}
              onChange={(e) => handleCuentaPendienteChange('indexacion', e.target.value)}
              label="Indexación"
            >
              <MenuItem value="">Sin indexación</MenuItem>
              <MenuItem value="CAC">CAC</MenuItem>
              <MenuItem value="UVA">UVA</MenuItem>
              <MenuItem value="USD">Dólar</MenuItem>
            </Select>
          </FormControl>

          {cuentaPendienteForm.indexacion && (
            <FormControl fullWidth>
              <InputLabel>Frecuencia de indexación</InputLabel>
              <Select
                value={cuentaPendienteForm.frecuencia_indexacion}
                onChange={(e) => handleCuentaPendienteChange('frecuencia_indexacion', e.target.value)}
                label="Frecuencia de indexación"
              >
                <MenuItem value="mensual">Mensual</MenuItem>
                <MenuItem value="trimestral">Trimestral</MenuItem>
                <MenuItem value="anual">Anual</MenuItem>
              </Select>
            </FormControl>
          )}

          <TextField
            label="Cantidad de cuotas"
            type="number"
            value={cuentaPendienteForm.cantidad_cuotas}
            onChange={(e) => handleCuentaPendienteChange('cantidad_cuotas', e.target.value)}
            fullWidth
          />
        </>
      )}
    </Box>
  );

  return (
    <Dialog open={!!unidad} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Vender Unidad - Paso {step} de 2
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        {step > 1 && (
          <Button onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        )}
        <Button variant="contained" onClick={handleNext}>
          {step === 1 ? 'Siguiente' : 'Confirmar Venta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
