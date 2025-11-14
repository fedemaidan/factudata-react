// src/components/loteParaTodos/LoteFormDrawer.js
import React, { useState, useEffect } from 'react';
import {
  Drawer, Box, Typography, Stack, TextField, MenuItem,
  Button, Grid, Alert, Autocomplete
} from '@mui/material';

import { 
  CONDICION_LOTE, 
  CONDICION_LOTE_LABELS,
  ESTADO_LEGAL,
  ESTADO_LEGAL_LABELS,
  SITUACION_FISICA,
  SITUACION_FISICA_LABELS,
  puedeTransicionarCondicion
} from '../../data/loteParaTodos/constantes.js';
import { mockVendedores } from '../../data/loteParaTodos/mockVendedores.js';

const LoteFormDrawer = ({
  open,
  onClose,
  lote = null,
  emprendimientoId,
  onSave
}) => {
  const [formData, setFormData] = useState({
    numero: '',
    manzana: '',
    superficie: '',
    precio_base: '',
    condicion_lote: CONDICION_LOTE.DISPONIBLE,
    estado_legal: ESTADO_LEGAL.NORMAL,
    situacion_fisica: SITUACION_FISICA.BALDIO,
    observaciones_lote: '',
    numero_partida: '',
    vendedor_responsable_id: null
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const isEditing = !!lote;

  useEffect(() => {
    if (open) {
      if (lote) {
        // Cargar datos del lote para edición
        setFormData({
          numero: lote.numero || '',
          manzana: lote.manzana || '',
          superficie: lote.superficie?.toString() || '',
          precio_base: lote.precio_base?.toString() || '',
          condicion_lote: lote.condicion_lote || CONDICION_LOTE.DISPONIBLE,
          estado_legal: lote.estado_legal || ESTADO_LEGAL.NORMAL,
          situacion_fisica: lote.situacion_fisica || SITUACION_FISICA.BALDIO,
          observaciones_lote: lote.observaciones_lote || '',
          numero_partida: lote.numero_partida || '',
          vendedor_responsable_id: lote.vendedor_responsable_id || null
        });
      } else {
        // Reset para nuevo lote
        setFormData({
          numero: '',
          manzana: '',
          superficie: '',
          precio_base: '',
          condicion_lote: CONDICION_LOTE.DISPONIBLE,
          estado_legal: ESTADO_LEGAL.NORMAL,
          situacion_fisica: SITUACION_FISICA.BALDIO,
          observaciones_lote: '',
          numero_partida: '',
          vendedor_responsable_id: null
        });
      }
      setErrors({});
    }
  }, [open, lote]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo al modificarlo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.numero.trim()) {
      newErrors.numero = 'El número de lote es obligatorio';
    }
    
    if (!formData.manzana.trim()) {
      newErrors.manzana = 'La manzana es obligatoria';
    }
    
    if (!formData.superficie || parseFloat(formData.superficie) <= 0) {
      newErrors.superficie = 'La superficie debe ser mayor a 0';
    }
    
    if (formData.precio_base && parseFloat(formData.precio_base) < 0) {
      newErrors.precio_base = 'El precio base no puede ser negativo';
    }
    
    // Validar transición de condición si es edición
    if (isEditing && lote.condicion_lote !== formData.condicion_lote) {
      if (!puedeTransicionarCondicion(lote.condicion_lote, formData.condicion_lote)) {
        newErrors.condicion_lote = `No se puede cambiar de ${CONDICION_LOTE_LABELS[lote.condicion_lote]} a ${CONDICION_LOTE_LABELS[formData.condicion_lote]}`;
      }
    }
    
    // Validar formato de partida municipal (opcional)
    if (formData.numero_partida && !/^\d{2}-\d{3}-\d{3}$/.test(formData.numero_partida)) {
      newErrors.numero_partida = 'Formato inválido. Use: XX-XXX-XXX';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const loteData = {
        ...formData,
        emprendimiento_id: emprendimientoId,
        id: lote?.id,
        superficie: parseFloat(formData.superficie),
        precio_base: formData.precio_base ? parseFloat(formData.precio_base) : null,
        // Mantener compatibilidad con campo legacy
        estado: mapCondicionToLegacyEstado(formData.condicion_lote),
        fecha_venta: lote?.fecha_venta || null
      };
      
      await onSave(loteData);
      handleClose();
      
    } catch (error) {
      console.error('Error al guardar lote:', error);
      setErrors({ general: 'Error al guardar el lote. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      numero: '',
      manzana: '',
      superficie: '',
      precio_base: '',
      condicion_lote: CONDICION_LOTE.DISPONIBLE,
      estado_legal: ESTADO_LEGAL.NORMAL,
      situacion_fisica: SITUACION_FISICA.BALDIO,
      observaciones_lote: '',
      numero_partida: '',
      vendedor_responsable_id: null
    });
    setErrors({});
    onClose();
  };

  // Mapeo para mantener compatibilidad
  const mapCondicionToLegacyEstado = (condicion) => {
    const mapping = {
      [CONDICION_LOTE.DISPONIBLE]: 'DISPONIBLE',
      [CONDICION_LOTE.ACTIVO]: 'VENDIDO',
      [CONDICION_LOTE.RESERVADO]: 'RESERVADO',
      [CONDICION_LOTE.PRE_RESERVADO]: 'RESERVADO',
      [CONDICION_LOTE.NO_A_LA_VENTA]: 'BLOQUEADO',
      [CONDICION_LOTE.OFICINA]: 'BLOQUEADO'
    };
    return mapping[condicion] || 'DISPONIBLE';
  };

  const vendedorSeleccionado = formData.vendedor_responsable_id 
    ? mockVendedores.find(v => v.id === formData.vendedor_responsable_id)
    : null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: 600 } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {isEditing ? 'Editar Lote' : 'Nuevo Lote'}
        </Typography>
        
        {errors.general && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.general}
          </Alert>
        )}
        
        <Stack spacing={3}>
          {/* Información básica */}
          <Typography variant="h6" color="primary">
            Información Básica
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Número de Lote"
                value={formData.numero}
                onChange={(e) => handleChange('numero', e.target.value)}
                fullWidth
                required
                error={!!errors.numero}
                helperText={errors.numero}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Manzana"
                value={formData.manzana}
                onChange={(e) => handleChange('manzana', e.target.value)}
                fullWidth
                required
                error={!!errors.manzana}
                helperText={errors.manzana}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Superficie (m²)"
                type="number"
                value={formData.superficie}
                onChange={(e) => handleChange('superficie', e.target.value)}
                fullWidth
                required
                error={!!errors.superficie}
                helperText={errors.superficie}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                label="Precio Base"
                type="number"
                value={formData.precio_base}
                onChange={(e) => handleChange('precio_base', e.target.value)}
                fullWidth
                error={!!errors.precio_base}
                helperText={errors.precio_base}
                InputProps={{
                  startAdornment: '$'
                }}
              />
            </Grid>
          </Grid>

          {/* Estados */}
          <Typography variant="h6" color="primary">
            Estados
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Condición del Lote"
                select
                fullWidth
                value={formData.condicion_lote}
                onChange={(e) => handleChange('condicion_lote', e.target.value)}
                error={!!errors.condicion_lote}
                helperText={errors.condicion_lote}
              >
                {Object.entries(CONDICION_LOTE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Estado Legal"
                select
                fullWidth
                value={formData.estado_legal}
                onChange={(e) => handleChange('estado_legal', e.target.value)}
              >
                {Object.entries(ESTADO_LEGAL_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Situación Física"
                select
                fullWidth
                value={formData.situacion_fisica}
                onChange={(e) => handleChange('situacion_fisica', e.target.value)}
              >
                {Object.entries(SITUACION_FISICA_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Información adicional */}
          <Typography variant="h6" color="primary">
            Información Adicional
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número de Partida"
                value={formData.numero_partida}
                onChange={(e) => handleChange('numero_partida', e.target.value)}
                fullWidth
                placeholder="XX-XXX-XXX"
                error={!!errors.numero_partida}
                helperText={errors.numero_partida || "Formato: XX-XXX-XXX"}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={mockVendedores}
                getOptionLabel={(option) => `${option.nombre} ${option.apellido}`}
                value={vendedorSeleccionado}
                onChange={(event, newValue) => {
                  handleChange('vendedor_responsable_id', newValue?.id || null);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vendedor Responsable"
                    helperText="Vendedor asignado al lote"
                  />
                )}
              />
            </Grid>
          </Grid>
          
          <TextField
            label="Observaciones del Lote"
            multiline
            rows={4}
            value={formData.observaciones_lote}
            onChange={(e) => handleChange('observaciones_lote', e.target.value)}
            fullWidth
            helperText="Observaciones permanentes del lote"
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Button 
            onClick={handleClose} 
            fullWidth
            color="inherit"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            fullWidth
            disabled={loading}
          >
            {loading ? 'Guardando...' : (isEditing ? 'Guardar' : 'Crear')}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default LoteFormDrawer;