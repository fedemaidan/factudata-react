import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Stack, Paper, 
  CircularProgress, Chip, InputAdornment, Checkbox,
  Button, Divider, FormControlLabel, MenuItem, Select,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, LinearProgress, IconButton, Backdrop
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ImageIcon from '@mui/icons-material/Image';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import { formatCurrency } from 'src/utils/formatters';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import ticketService from 'src/services/ticketService';
import { getProyectosByEmpresa, getProyectoById } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';

export default function StepDesdeFactura({ 
  empresaId, 
  proveedor,
  proyecto,
  onSelectFacturas,
  onNext 
}) {
  const [movimientos, setMovimientos] = useState([]);
  const [proyectoNombre, setProyectoNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [selectedMovimientos, setSelectedMovimientos] = useState([]);
  const [soloProveedor, setSoloProveedor] = useState(true);
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(proyecto || '');
  
  // Estados para diálogo de opciones
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimientoActual, setMovimientoActual] = useState(null);
  const [extrayendo, setExtrayendo] = useState(false);
  const [errorExtraccion, setErrorExtraccion] = useState('');
  const [progresoExtraccion, setProgresoExtraccion] = useState('');

  // Cargar lista de proyectos
  useEffect(() => {
    const cargarProyectos = async () => {
      if (!empresaId) return;
      try {
        const empresa = await getEmpresaById(empresaId);
        const proyectosData = await getProyectosByEmpresa(empresa);
        console.log('Proyectos cargados:', proyectosData?.length);
        setProyectos(proyectosData || []);
        
        // Si no hay proyecto seleccionado y hay proyectos, seleccionar el primero o el del prop
        if (!proyectoSeleccionado && proyecto) {
          setProyectoSeleccionado(proyecto);
        }
      } catch (err) {
        console.error('Error cargando proyectos:', err);
      }
    };
    cargarProyectos();
  }, [empresaId]);

  // Cargar movimientos del proyecto seleccionado
  useEffect(() => {
    const cargar = async () => {
      // Usar proyectoSeleccionado o el proyecto del prop
      const proyId = proyectoSeleccionado || proyecto;
      
      console.log('Cargando movimientos - empresaId:', empresaId, 'proyId:', proyId);
      
      if (!empresaId) {
        console.log('No hay empresaId');
        return;
      }
      
      try {
        setLoading(true);
        setMovimientos([]);
        
        if (proyId) {
          console.log('Cargando movimientos del proyecto:', proyId);
          const proy = await getProyectoById(proyId);
          console.log('Proyecto obtenido:', proy?.nombre);
          
          if (proy) {
            setProyectoNombre(proy.nombre || '');
            const movs = await ticketService.getMovimientosForProyecto(proyId, 'ARS');
            console.log('Movimientos totales:', movs?.length);
            
            // Filtrar solo egresos
            const egresos = movs.filter(m => m.type === 'egreso');
            console.log('Egresos encontrados:', egresos.length);

            // Ordenar por fecha descendente
            egresos.sort((a, b) => {
              const fechaA = a.fecha_factura?.seconds || 0;
              const fechaB = b.fecha_factura?.seconds || 0;
              return fechaB - fechaA;
            });

            setMovimientos(egresos.slice(0, 50));
          }
        } else if (proyectos.length > 0) {
          // Sin proyecto seleccionado, cargar de todos los proyectos
          console.log('Cargando de todos los proyectos:', proyectos.length);
          setProyectoNombre('');
          const todosMovimientos = [];
          for (const proy of proyectos.slice(0, 5)) {
            const movs = await ticketService.getMovimientosForProyecto(proy.id, 'ARS');
            const egresos = movs.filter(m => m.type === 'egreso');
            console.log(`Proyecto ${proy.nombre}: ${egresos.length} egresos`);
            todosMovimientos.push(...egresos.map(m => ({
              ...m,
              proyecto_nombre: proy.nombre
            })));
          }

          // Ordenar y limitar
          todosMovimientos.sort((a, b) => {
            const fechaA = a.fecha_factura?.seconds || 0;
            const fechaB = b.fecha_factura?.seconds || 0;
            return fechaB - fechaA;
          });

          setMovimientos(todosMovimientos.slice(0, 30));
        } else {
          console.log('No hay proyecto seleccionado ni proyectos cargados');
        }
      } catch (err) {
        console.error('Error cargando movimientos:', err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [empresaId, proyectoSeleccionado, proyectos, proyecto]);

  // Filtrar por búsqueda
  const movimientosFiltrados = movimientos.filter(m => {
    if (!busqueda) return true;
    const texto = busqueda.toLowerCase();
    return (
      String(m.numero_factura || '').toLowerCase().includes(texto) ||
      String(m.nombre_proveedor || m.proveedor || m.cliente || '').toLowerCase().includes(texto) ||
      String(m.descripcion || m.observacion || '').toLowerCase().includes(texto) ||
      String(m.categoria || '').toLowerCase().includes(texto) ||
      String(m.codigo_operacion || '').toLowerCase().includes(texto)
    );
  });

  // Filtrar por proveedor si el checkbox está activo
  const movimientosFinal = soloProveedor && proveedor
    ? movimientosFiltrados.filter(m => {
        const provMov = String(m.nombre_proveedor || m.proveedor || m.cliente || '').toLowerCase();
        return provMov.includes(proveedor.toLowerCase());
      })
    : movimientosFiltrados;

  // Helper para obtener el nombre del proveedor/cliente
  const getProveedorNombre = (mov) => mov.nombre_proveedor || mov.proveedor || mov.cliente || mov.categoria || 'Sin proveedor';

  const handleToggleMovimiento = (mov) => {
    const exists = selectedMovimientos.find(m => m.id === mov.id);
    
    // Si ya está seleccionado, deseleccionar
    if (exists) {
      setSelectedMovimientos(prev => prev.filter(m => m.id !== mov.id));
      return;
    }
    
    // Si tiene imagen, siempre extraer materiales con IA
    if (mov.url_imagen) {
      handleExtraerMateriales(mov);
      return;
    }
    
    // Si no tiene imagen, agregar directamente
    setSelectedMovimientos(prev => [...prev, mov]);
  };

  // Usar el total directamente como un material
  const handleUsarTotal = () => {
    if (!movimientoActual) return;
    setSelectedMovimientos(prev => [...prev, movimientoActual]);
    setDialogOpen(false);
    setMovimientoActual(null);
  };

  // Extraer materiales de la imagen con IA
  const handleExtraerMateriales = async (mov) => {
    const movimiento = mov || movimientoActual;
    if (!movimiento?.url_imagen) {
      setErrorExtraccion('Este movimiento no tiene imagen adjunta');
      return;
    }

    try {
      setExtrayendo(true);
      setErrorExtraccion('');
      setProgresoExtraccion('Analizando imagen con IA...');

      const onProgress = ({ attempt }) => {
        const segundos = attempt * 3;
        setProgresoExtraccion(`Analizando imagen con IA... (${segundos}s)`);
      };

      const datos = await StockSolicitudesService.extraerDatosFactura(movimiento.url_imagen, onProgress);
      
      if (!datos || !datos.success) {
        throw new Error(datos?.error || 'No se pudieron extraer datos de la imagen');
      }

      // Crear materiales extraídos
      const materialesExtraidos = (datos.materiales || []).map((mat, idx) => ({
        id: `caja-${movimiento.id}-mat-${idx}`,
        codigo: mat.SKU || '',
        descripcion: mat.Nombre || mat.nombre || 'Material extraído',
        cantidad: parseFloat(mat.cantidad) || 1,
        valorUnitario: mat.precio_unitario || 0,
        valorTotal: mat.subtotal || (parseFloat(mat.cantidad || 1) * (mat.precio_unitario || 0)),
        unidad: mat.unidad || 'u',
        movimiento_caja_id: movimiento.id,
        numero_factura: datos.numero_factura || movimiento.numero_factura,
        proveedor_original: datos.proveedor || movimiento.nombre_proveedor || movimiento.proveedor,
        extraido_con_ia: true,
        total_factura_original: movimiento.total || 0
      }));

      if (materialesExtraidos.length === 0) {
        throw new Error('No se encontraron materiales en la imagen');
      }

      // Agregar a seleccionados con flag especial
      const movConMateriales = {
        ...movimiento,
        _materialesExtraidos: materialesExtraidos,
        _totalOriginal: movimiento.total || 0
      };
      
      // Importar directamente y pasar al siguiente paso
      const itemsImportados = materialesExtraidos;
      
      if (onSelectFacturas) {
        onSelectFacturas(itemsImportados, movimiento.total || 0);
      }
      if (onNext) onNext();
      
      setProgresoExtraccion('');

    } catch (err) {
      console.error('Error extrayendo materiales:', err);
      setErrorExtraccion(err?.message || 'Error al extraer materiales de la imagen');
    } finally {
      setExtrayendo(false);
    }
  };

  const handleContinue = () => {
    if (selectedMovimientos.length === 0) return;
    
    // Convertir movimientos de caja a formato de materiales
    const itemsImportados = [];
    
    selectedMovimientos.forEach((mov, i) => {
      // Si tiene materiales extraídos con IA, usarlos
      if (mov._materialesExtraidos && mov._materialesExtraidos.length > 0) {
        itemsImportados.push(...mov._materialesExtraidos);
      } else {
        // Si no, usar el total como un único material
        itemsImportados.push({
          id: `caja-${mov.id}-${i}`,
          codigo: String(mov.codigo_operacion || mov.numero_factura || ''),
          descripcion: mov.descripcion || mov.observacion || mov.categoria || 'Material importado',
          cantidad: 1,
          valorUnitario: mov.total || 0,
          valorTotal: mov.total || 0,
          movimiento_caja_id: mov.id,
          numero_factura: mov.numero_factura,
          proveedor_original: mov.nombre_proveedor || mov.proveedor
        });
      }
    });

    if (onSelectFacturas) {
      onSelectFacturas(itemsImportados);
    }
    if (onNext) onNext();
  };

  const totalSeleccionado = selectedMovimientos.reduce((acc, m) => acc + (m.total || 0), 0);

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    if (fecha.seconds) {
      return dayjs(fecha.seconds * 1000).format('DD/MM/YYYY');
    }
    return dayjs(fecha).format('DD/MM/YYYY');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Backdrop de carga mientras extrae con IA */}
        <Backdrop
          sx={{ 
            color: '#fff', 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            flexDirection: 'column',
            gap: 2
          }}
          open={extrayendo}
        >
          <CircularProgress color="inherit" size={60} />
          <Paper sx={{ p: 3, maxWidth: 400, textAlign: 'center' }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Extrayendo materiales con IA
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {progresoExtraccion || 'Analizando la imagen de la factura...'}
            </Typography>
            <LinearProgress />
          </Paper>
        </Backdrop>

        <Typography variant="h6" gutterBottom>
          Importar desde compras de caja
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Seleccioná compras de cualquier proyecto para importar como materiales
        </Typography>

        {/* Selector de proyecto */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Proyecto</InputLabel>
          <Select
            value={proyectoSeleccionado}
            onChange={(e) => setProyectoSeleccionado(e.target.value)}
            label="Proyecto"
          >
            <MenuItem value=""><em>Todos los proyectos</em></MenuItem>
            {proyectos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nombre}
                {p.id === proyecto && ' (actual)'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filtros */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            placeholder="Buscar por factura o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {proveedor && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={soloProveedor}
                  onChange={(e) => setSoloProveedor(e.target.checked)}
                  size="small"
                />
              }
              label={`Solo de ${proveedor}`}
              sx={{ whiteSpace: 'nowrap' }}
            />
          )}
        </Stack>

        {movimientosFinal.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover' }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No hay compras (egresos) en este proyecto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verificá que hayas registrado compras en la caja del proyecto
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {movimientosFinal.length} compra(s) encontrada(s)
            </Typography>
            <Stack spacing={1.5} sx={{ maxHeight: 350, overflow: 'auto', mb: 2 }}>
              {movimientosFinal.map((m) => {
                const isSelected = selectedMovimientos.some(sm => sm.id === m.id);
                const provNombre = getProveedorNombre(m);
                const isProveedorMatch = proveedor && provNombre.toLowerCase().includes(proveedor.toLowerCase());
                
                return (
                  <Paper
                    key={m.id}
                    onClick={() => handleToggleMovimiento(m)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : (isProveedorMatch ? 'success.light' : 'divider'),
                      bgcolor: isSelected ? 'primary.lighter' : 'background.paper',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Checkbox checked={isSelected} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {provNombre}
                          </Typography>
                          {isProveedorMatch && (
                            <Chip label="✓ Mismo prov." size="small" color="success" variant="outlined" />
                          )}
                          {m.url_imagen && (
                            <Chip 
                              icon={<ImageIcon sx={{ fontSize: 14 }} />} 
                              label="Imagen" 
                              size="small" 
                              color="info" 
                              variant="outlined" 
                            />
                          )}
                          {selectedMovimientos.find(sm => sm.id === m.id)?._materialesExtraidos && (
                            <Chip 
                              icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />} 
                              label="IA" 
                              size="small" 
                              color="secondary" 
                              variant="filled"
                            />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {m.descripcion || m.numero_factura || m.categoria || ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            <CalendarTodayIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                            {formatFecha(m.fecha_factura)}
                          </Typography>
                          {m.proyecto_nombre && (
                            <Chip label={m.proyecto_nombre} size="small" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                        {formatCurrency(m.total || 0)}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            {selectedMovimientos.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {selectedMovimientos.length} compra(s) seleccionada(s)
                  </Typography>
                  <Typography variant="h6">
                    Total: {formatCurrency(totalSeleccionado)}
                  </Typography>
                </Stack>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleContinue}
                  sx={{ mt: 2 }}
                >
                  Importar como materiales
                </Button>
              </>
            )}
          </>
        )}

        {/* Diálogo de opciones cuando tiene imagen y total */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => !extrayendo && setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">¿Cómo querés importar?</Typography>
              <IconButton 
                onClick={() => setDialogOpen(false)} 
                disabled={extrayendo}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            {movimientoActual && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Compra de <strong>{getProveedorNombre(movimientoActual)}</strong>
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatCurrency(movimientoActual.total || 0)}
                </Typography>
                {movimientoActual.descripcion && (
                  <Typography variant="body2" color="text.secondary">
                    {movimientoActual.descripcion}
                  </Typography>
                )}
              </Box>
            )}

            {errorExtraccion && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorExtraccion}
              </Alert>
            )}

            {extrayendo && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {progresoExtraccion || 'Procesando...'}
                </Typography>
              </Box>
            )}

            <Stack spacing={2}>
              <Button
                variant="outlined"
                size="large"
                startIcon={<AttachMoneyIcon />}
                onClick={handleUsarTotal}
                disabled={extrayendo}
                fullWidth
                sx={{ justifyContent: 'flex-start', py: 2 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Usar el total
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Importar como un único material con el valor total
                  </Typography>
                </Box>
              </Button>

              <Button
                variant="contained"
                size="large"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => handleExtraerMateriales()}
                disabled={extrayendo || !movimientoActual?.url_imagen}
                fullWidth
                sx={{ justifyContent: 'flex-start', py: 2 }}
              >
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Extraer materiales con IA
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Analizar la imagen y extraer cada material
                  </Typography>
                </Box>
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
