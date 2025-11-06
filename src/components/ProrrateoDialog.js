import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Paper,
  Divider,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Calculate as CalculateIcon,
  PieChart as PieChartIcon
} from '@mui/icons-material';

const ProrrateoDialog = ({ 
  open, 
  onClose, 
  datosBase, 
  proyectos = [],
  onSuccess 
}) => {
  const [distribuciones, setDistribuciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar con el proyecto actual si existe
  useEffect(() => {
    if (open && proyectos.length > 0) {
      // Intentar encontrar el proyecto actual por ID o por nombre
      let proyectoActual = null;
      
      if (datosBase?.proyecto_id) {
        proyectoActual = proyectos.find(p => p.id === datosBase.proyecto_id);
      }
      
      // Si no lo encuentra por ID, buscar por nombre
      if (!proyectoActual && datosBase?.proyecto_nombre) {
        proyectoActual = proyectos.find(p => p.nombre === datosBase.proyecto_nombre);
      }
      
      // Si aún no lo encuentra, usar el primer proyecto disponible
      if (!proyectoActual) {
        proyectoActual = proyectos[0];
      }
      
      if (proyectoActual) {
        setDistribuciones([{
          id: 1,
          proyecto_id: proyectoActual.id,
          proyecto_nombre: proyectoActual.nombre,
          monto: Number(datosBase.total || 0),
          porcentaje: 100
        }]);
      } else {
        // Fallback: distribución vacía
        setDistribuciones([{
          id: 1,
          proyecto_id: '',
          proyecto_nombre: '',
          monto: Number(datosBase.total || 0),
          porcentaje: 0
        }]);
      }
    } else if (open) {
      // Si no hay proyectos, crear una distribución vacía
      setDistribuciones([{
        id: 1,
        proyecto_id: '',
        proyecto_nombre: '',
        monto: Number(datosBase.total || 0),
        porcentaje: 0
      }]);
    }
  }, [open, datosBase, proyectos]);

  // Calcular totales
  const totales = useMemo(() => {
    const totalMonto = distribuciones.reduce((sum, d) => sum + Number(d.monto || 0), 0);
    const totalPorcentaje = distribuciones.reduce((sum, d) => sum + Number(d.porcentaje || 0), 0);
    const montoBase = Number(datosBase?.total || 0);
    
    // Validar que todas las distribuciones tengan proyecto seleccionado
    const todasTienenProyecto = distribuciones.every(d => d.proyecto_id && d.proyecto_id.trim() !== '');
    
    return {
      totalMonto,
      totalPorcentaje,
      montoBase,
      diferenciaMonto: montoBase - totalMonto,
      diferenciaPorcentaje: 100 - totalPorcentaje,
      todasTienenProyecto,
      esValido: Math.abs(montoBase - totalMonto) <= 1 && Math.abs(100 - totalPorcentaje) <= 1 && todasTienenProyecto
    };
  }, [distribuciones, datosBase?.total]);

  const formatCurrency = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const agregarDistribucion = () => {
    const newId = Math.max(...distribuciones.map(d => d.id || 0), 0) + 1;
    setDistribuciones([
      ...distribuciones,
      {
        id: newId,
        proyecto_id: '',
        proyecto_nombre: '',
        monto: 0,
        porcentaje: 0
      }
    ]);
  };

  const removerDistribucion = (id) => {
    if (distribuciones.length > 1) {
      setDistribuciones(distribuciones.filter(d => d.id !== id));
    }
  };

  const actualizarDistribucion = (id, campo, valor) => {
    setDistribuciones(prev => prev.map(d => {
      if (d.id !== id) return d;
      
      const updated = { ...d, [campo]: valor };
      
      // Si cambió el proyecto, actualizar el nombre
      if (campo === 'proyecto_id') {
        const proyecto = proyectos.find(p => p.id === valor);
        updated.proyecto_nombre = proyecto?.nombre || '';
      }
      
      // Si cambió el monto, recalcular porcentaje
      if (campo === 'monto') {
        const montoNum = Number(valor || 0);
        updated.porcentaje = totales.montoBase > 0 ? 
          ((montoNum / totales.montoBase) * 100).toFixed(2) : 0;
      }
      
      // Si cambió el porcentaje, recalcular monto
      if (campo === 'porcentaje') {
        const porcentajeNum = Number(valor || 0);
        updated.monto = ((totales.montoBase * porcentajeNum) / 100).toFixed(2);
      }
      
      return updated;
    }));
  };

  const distribuirEquitativamente = () => {
    const montoPorProyecto = (totales.montoBase / distribuciones.length).toFixed(2);
    const porcentajePorProyecto = (100 / distribuciones.length).toFixed(2);
    
    setDistribuciones(prev => prev.map(d => ({
      ...d,
      monto: montoPorProyecto,
      porcentaje: porcentajePorProyecto
    })));
  };

  const limpiarDistribucion = () => {
    setDistribuciones(prev => prev.map(d => ({
      ...d,
      monto: 0,
      porcentaje: 0
    })));
  };

  // Ajustar una distribución específica con la diferencia
  const ajustarDistribucion = (id) => {
    setDistribuciones(prev => prev.map(d => {
      if (d.id === id) {
        const nuevoMonto = Number(d.monto || 0) + totales.diferenciaMonto;
        return {
          ...d,
          monto: Math.max(0, nuevoMonto).toFixed(2),
          porcentaje: totales.montoBase > 0 ? 
            ((Math.max(0, nuevoMonto) / totales.montoBase) * 100).toFixed(2) : 0
        };
      }
      return d;
    }));
  };

  // Distribuir la diferencia proporcionalmente entre todas las distribuciones
  const distribuirDiferencia = () => {
    const distribucionesValidas = distribuciones.filter(d => d.proyecto_id && Number(d.monto) > 0);
    if (distribucionesValidas.length === 0) return;
    
    const diferenciaPorDistribucion = totales.diferenciaMonto / distribucionesValidas.length;
    
    setDistribuciones(prev => prev.map(d => {
      if (d.proyecto_id && Number(d.monto) > 0) {
        const nuevoMonto = Number(d.monto) + diferenciaPorDistribucion;
        return {
          ...d,
          monto: Math.max(0, nuevoMonto).toFixed(2),
          porcentaje: totales.montoBase > 0 ? 
            ((Math.max(0, nuevoMonto) / totales.montoBase) * 100).toFixed(2) : 0
        };
      }
      return d;
    }));
  };

  const handleSubmit = async () => {
    if (!totales.esValido) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Filtrar distribuciones válidas
      const distribucionesValidas = distribuciones.filter(d => 
        d.proyecto_id && Number(d.monto) > 0
      );
      
      if (distribucionesValidas.length === 0) {
        throw new Error('No hay distribuciones válidas');
      }
      
      // Llamar al servicio
      const movimientosService = (await import('../services/movimientosService')).default;
      const result = await movimientosService.crearMovimientoProrrateo(datosBase, distribucionesValidas);
      
      if (result.error) {
        throw new Error(result.message || 'Error al crear movimientos');
      }
      
      // Éxito
      onSuccess && onSuccess(result.data);
      onClose(true);
      
    } catch (err) {
      console.error('Error en prorrateo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setDistribuciones([]);
    onClose(false);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PieChartIcon color="primary" />
          <Typography variant="h6">
            Prorratear Gasto por Proyectos
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Resumen del gasto */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>Resumen del Gasto</strong>
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Proveedor:</strong> {datosBase?.nombre_proveedor || 'No definido'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                <strong>Categoría:</strong> {datosBase?.categoria || 'No definido'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color={totales.esValido ? 'success.main' : 'error.main'}>
                <strong>Total a distribuir:</strong> {formatCurrency(totales.montoBase, datosBase?.moneda)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color={totales.esValido ? 'success.main' : 'error.main'}>
                <strong>Total distribuido:</strong> {formatCurrency(totales.totalMonto, datosBase?.moneda)}
              </Typography>
            </Grid>
          </Grid>
          
          {!totales.esValido && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {!totales.todasTienenProyecto && 'Todas las filas deben tener un proyecto seleccionado'}
              {!totales.todasTienenProyecto && (Math.abs(totales.diferenciaMonto) > 1 || Math.abs(totales.diferenciaPorcentaje) > 1) && ' | '}
              {Math.abs(totales.diferenciaMonto) > 1 && 
                `${totales.diferenciaMonto > 0 ? 'Faltan' : 'Sobran'} ${formatCurrency(Math.abs(totales.diferenciaMonto), datosBase?.moneda)}`
              }
              {Math.abs(totales.diferenciaPorcentaje) > 1 && 
                ` | ${totales.diferenciaPorcentaje > 0 ? 'Falta' : 'Sobra'} ${Math.abs(totales.diferenciaPorcentaje).toFixed(1)}%`
              }
            </Alert>
          )}
        </Paper>

        {/* Botones de acceso rápido */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button 
            variant="outlined" 
            onClick={distribuirEquitativamente}
            startIcon={<CalculateIcon />}
          >
            Distribuir Equitativamente
          </Button>
          <Button 
            variant="outlined" 
            onClick={limpiarDistribucion}
          >
            Limpiar
          </Button>
          <Button 
            variant="outlined" 
            onClick={agregarDistribucion}
            startIcon={<AddIcon />}
          >
            Agregar Proyecto
          </Button>
        </Stack>

        {/* Lista de distribuciones */}
        <Stack spacing={2}>
          {distribuciones.map((dist, index) => (
            <Paper key={dist.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip 
                  label={`#${index + 1}`} 
                  color="primary" 
                  variant="outlined" 
                  size="small" 
                />
                
                <FormControl 
                  sx={{ minWidth: 200, flex: 1 }}
                  error={!dist.proyecto_id || dist.proyecto_id.trim() === ''}
                >
                  <InputLabel>Proyecto</InputLabel>
                  <Select
                    value={dist.proyecto_id}
                    label="Proyecto"
                    onChange={(e) => actualizarDistribucion(dist.id, 'proyecto_id', e.target.value)}
                    error={!dist.proyecto_id || dist.proyecto_id.trim() === ''}
                  >
                    {proyectos.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                  {(!dist.proyecto_id || dist.proyecto_id.trim() === '') && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                      Selecciona un proyecto
                    </Typography>
                  )}
                </FormControl>
                
                <TextField
                  type="number"
                  label="Monto"
                  value={dist.monto || ''}
                  onChange={(e) => actualizarDistribucion(dist.id, 'monto', e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  sx={{ width: 150 }}
                />
                
                <TextField
                  type="number"
                  label="Porcentaje"
                  value={dist.porcentaje || ''}
                  onChange={(e) => actualizarDistribucion(dist.id, 'porcentaje', e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                  sx={{ width: 120 }}
                />
                
                {/* Botón de ajustar cuando hay diferencias */}
                {!totales.esValido && Math.abs(totales.diferenciaMonto) > 1 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => ajustarDistribucion(dist.id)}
                    sx={{ minWidth: 'auto', px: 1 }}
                    title={`Ajustar con ${totales.diferenciaMonto > 0 ? '+' : ''}${formatCurrency(totales.diferenciaMonto, datosBase?.moneda)}`}
                  >
                    Ajustar
                  </Button>
                )}
                
                {distribuciones.length > 1 && (
                  <IconButton 
                    onClick={() => removerDistribucion(dist.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!totales.esValido || loading}
          startIcon={loading ? null : <PieChartIcon />}
        >
          {loading ? 'Creando...' : `Crear ${distribuciones.filter(d => d.proyecto_id && d.monto > 0).length} Movimientos`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProrrateoDialog;