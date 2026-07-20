// components/cajaChica/MovimientoCajaChicaModal.js
import { useState, useEffect } from 'react';
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
  Autocomplete,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';

const MovimientoCajaChicaModal = ({
  open,
  onClose,
  onSubmit,
  onProrratear,
  proyectos = [],
  categorias = [],
  proveedores = [],
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

  // Resetear el form cada vez que el modal se abre, para que arranque limpio sin importar
  // cómo se cerró antes (incluido el camino de prorrateo, que cierra desde el padre).
  useEffect(() => {
    if (open) {
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
    }
  }, [open, tipoInicial]);

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

    if (formData.type === 'egreso' && !formData.categoria) {
      newErrors.categoria = 'Debe seleccionar una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const proyectoSeleccionado = proyectos.find((p) => p.id === formData.proyecto_id);

    const base = {
      type: formData.type,
      total: parseFloat(formData.total),
      moneda: 'ARS',
      categoria: formData.categoria,
      observacion: formData.observacion || '',
      nombre_proveedor: formData.nombre_proveedor || '',
      fecha_factura: { seconds: Math.floor(new Date(formData.fecha_factura + 'T12:00:00').getTime() / 1000) },
      caja_chica: true,
      origen: 'web',
    };
    const movimientoData = formData.type === 'ingreso'
      ? {
          ...base,
          proyecto_id: null,
          proyecto_origen_id: formData.proyecto_id || null,
          proyecto_origen_nombre: proyectoSeleccionado?.nombre || null,
        }
      : {
          ...base,
          proyecto_id: formData.proyecto_id,
          proyecto: proyectoSeleccionado?.nombre || '',
        };

    onSubmit(movimientoData);
  };

  // Abre el diálogo de prorrateo (distribuir el egreso entre varios proyectos). La identidad del
  // dueño de la caja chica + empresa_id las inyecta el padre (cajaChica.js), igual que en el egreso normal.
  const handleProrratear = () => {
    if (!validateForm()) return;
    const proyectoSeleccionado = proyectos.find((p) => p.id === formData.proyecto_id);
    onProrratear({
      type: 'egreso',
      total: parseFloat(formData.total),
      categoria: formData.categoria,
      observacion: formData.observacion || '',
      nombre_proveedor: formData.nombre_proveedor || '',
      fecha_factura: { seconds: Math.floor(new Date(formData.fecha_factura + 'T12:00:00').getTime() / 1000) },
      proyecto_id: formData.proyecto_id || null,
      proyecto_nombre: proyectoSeleccionado?.nombre || null,
    });
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

          {/* Proyecto (opcional). En ingreso es la caja de la que sale el dinero. */}
          <TextField
            select
            label={formData.type === 'ingreso' ? 'Proyecto de origen del dinero' : 'Proyecto'}
            value={formData.proyecto_id}
            onChange={handleChange('proyecto_id')}
            error={!!errors.proyecto_id}
            helperText={errors.proyecto_id || (formData.type === 'ingreso'
              ? 'Opcional — caja de la que sale el dinero que ingresa a la caja chica'
              : 'Opcional')}
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

          {/* Categoría (solo para egresos) */}
          {formData.type === 'egreso' && (
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
          )}

          {/* Proveedor (opcional) */}
          {formData.type === 'egreso' && (
            <Autocomplete
              freeSolo
              options={proveedores}
              value={formData.nombre_proveedor}
              onInputChange={(_e, val) => {
                setFormData((prev) => ({ ...prev, nombre_proveedor: val }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  fullWidth
                  placeholder="Opcional"
                />
              )}
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
        {formData.type === 'egreso' && onProrratear && (
          <Button
            onClick={handleProrratear}
            variant="outlined"
            color="error"
            startIcon={<PieChartOutlineIcon />}
            disabled={isLoading}
            sx={{ mr: 'auto' }}
          >
            Prorratear entre proyectos
          </Button>
        )}
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
