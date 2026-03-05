// components/cajaChica/MovimientoCajaChicaModal.js
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const MovimientoCajaChicaModal = ({
  open,
  onClose,
  onSubmit,
  proyectos = [],
  categorias = [],
  usuarioDestino = null,
  isLoading = false,
  tipoInicial = 'egreso',
}) => {
  const [formData, setFormData] = useState({
    type: tipoInicial,
    total: '',
    proyecto_id: '',
    categoria: '',
    observacion: '',
    nombre_proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10),
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleTypeChange = (_event, newType) => {
    if (newType) {
      setFormData((prev) => ({ ...prev, type: newType }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.total) {
      newErrors.total = 'El monto es requerido';
    } else if (parseFloat(formData.total) <= 0) {
      newErrors.total = 'El monto debe ser mayor a 0';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'Debe seleccionar una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const proyectoSeleccionado = proyectos.find((p) => p.id === formData.proyecto_id);

    const movimientoData = {
      type: formData.type,
      total: parseFloat(formData.total),
      moneda: 'ARS',
      proyecto_id: formData.proyecto_id,
      proyecto: proyectoSeleccionado?.nombre || '',
      categoria: formData.categoria,
      observacion: formData.observacion || '',
      nombre_proveedor: formData.nombre_proveedor || '',
      fecha_factura: { seconds: Math.floor(new Date(formData.fecha_factura + 'T12:00:00').getTime() / 1000) },
      caja_chica: true,
      origen: 'web',
    };

    onSubmit(movimientoData);
  };

  const handleClose = () => {
    setFormData({
      type: tipoInicial,
      total: '',
      proyecto_id: '',
      categoria: '',
      observacion: '',
      nombre_proveedor: '',
      fecha_factura: new Date().toISOString().slice(0, 10),
    });
    setErrors({});
    onClose();
  };

  const nombreUsuario = usuarioDestino
    ? `${usuarioDestino.firstName || ''} ${usuarioDestino.lastName || ''}`.trim()
    : '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5">
          Nuevo movimiento de caja chica
        </Typography>
        {nombreUsuario && (
          <Typography variant="body2" color="text.secondary">
            Para: {nombreUsuario}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Tipo: Ingreso / Egreso */}
          <ToggleButtonGroup
            value={formData.type}
            exclusive
            onChange={handleTypeChange}
            fullWidth
            color={formData.type === 'ingreso' ? 'success' : 'error'}
          >
            <ToggleButton value="ingreso">
              <AddCircleOutlineIcon sx={{ mr: 1 }} />
              Ingreso
            </ToggleButton>
            <ToggleButton value="egreso">
              <RemoveCircleOutlineIcon sx={{ mr: 1 }} />
              Egreso
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Monto */}
          <TextField
            type="number"
            label="Monto"
            value={formData.total}
            onChange={handleChange('total')}
            error={!!errors.total}
            helperText={errors.total}
            inputProps={{ min: '0', step: '0.01' }}
            fullWidth
            required
          />

          {/* Proyecto (opcional) */}
          <TextField
            select
            label="Proyecto"
            value={formData.proyecto_id}
            onChange={handleChange('proyecto_id')}
            error={!!errors.proyecto_id}
            helperText={errors.proyecto_id || 'Opcional'}
            fullWidth
          >
            <MenuItem value="">
              <em>Seleccionar proyecto</em>
            </MenuItem>
            {proyectos.map((proy) => (
              <MenuItem key={proy.id} value={proy.id}>
                {proy.nombre}
              </MenuItem>
            ))}
          </TextField>

          {/* Categoría */}
          <TextField
            select
            label="Categoría"
            value={formData.categoria}
            onChange={handleChange('categoria')}
            error={!!errors.categoria}
            helperText={errors.categoria}
            fullWidth
            required
          >
            <MenuItem value="">
              <em>Seleccionar categoría</em>
            </MenuItem>
            {categorias.map((cat, idx) => (
              <MenuItem key={idx} value={cat.name || cat}>
                {cat.name || cat}
              </MenuItem>
            ))}
          </TextField>

          {/* Proveedor (opcional) */}
          {formData.type === 'egreso' && (
            <TextField
              label="Proveedor"
              value={formData.nombre_proveedor}
              onChange={handleChange('nombre_proveedor')}
              fullWidth
              placeholder="Opcional"
            />
          )}

          {/* Fecha */}
          <TextField
            type="date"
            label="Fecha"
            value={formData.fecha_factura}
            onChange={handleChange('fecha_factura')}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* Observación */}
          <TextField
            label="Observación"
            value={formData.observacion}
            onChange={handleChange('observacion')}
            multiline
            rows={3}
            fullWidth
            placeholder="Descripción opcional del movimiento..."
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={formData.type === 'ingreso' ? 'success' : 'error'}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading
            ? 'Guardando...'
            : formData.type === 'ingreso'
              ? 'Crear Ingreso'
              : 'Crear Egreso'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MovimientoCajaChicaModal;
