import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Button,
  IconButton,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import importMovimientosService from 'src/services/importMovimientosService';

const PasoRevisarProveedores = ({ 
  empresa, 
  wizardData, 
  updateWizardData, 
  onNext, 
  onBack, 
  setLoading, 
  setError 
}) => {
  const [mapeosProveedores, setMapeosProveedores] = useState([]);
  const [editandoProveedor, setEditandoProveedor] = useState(null);
  const [proveedorEditado, setProveedorEditado] = useState({
    nombre: '',
    alias: [],
    categorias: [],
    cuit: '',
    direccion: '',
    razon_social: ''
  });
  const [especificacionUsuario, setEspecificacionUsuario] = useState('');
  const [cargaInicial, setCargaInicial] = useState(false);

  useEffect(() => {
    // Cargar proveedores al montar el componente si tenemos los datos necesarios
    if (wizardData.analisisCsv && empresa && !cargaInicial) {
      console.log('[PasoRevisarProveedores] useEffect disparado - Cargando análisis');
      console.log('[PasoRevisarProveedores] wizardData.analisisCsv:', wizardData.analisisCsv);
      console.log('[PasoRevisarProveedores] empresa:', empresa);
      setCargaInicial(true);
      cargarAnalisisProveedores();
    }
  }, [wizardData.analisisCsv, empresa, cargaInicial]);

  const cargarAnalisisProveedores = async () => {
    try {
      setLoading(true);
      console.log('[PasoRevisarProveedores] Extrayendo proveedores de archivos subidos');
      console.log('[PasoRevisarProveedores] wizardData completo:', wizardData);
      
      const archivosUrls = wizardData.analisisCsv?._archivosUrls;
      const empresaId = wizardData.analisisCsv?._empresaId || empresa.id;
      
      console.log('[PasoRevisarProveedores] archivosUrls:', archivosUrls);
      console.log('[PasoRevisarProveedores] empresaId:', empresaId);
      
      if (!archivosUrls || archivosUrls.length === 0) {
        throw new Error('No se encontraron URLs de archivos. Regrese al paso anterior.');
      }
      
      // Extraer proveedores específicamente del backend
      const analisisProveedores = await importMovimientosService.extraerProveedores(
        archivosUrls,
        empresaId, 
        especificacionUsuario || ''
      );
      
      console.log('[PasoRevisarProveedores] Proveedores extraídos:', analisisProveedores);
      console.log('[PasoRevisarProveedores] Estructura de comparacion:', analisisProveedores.comparacion);
      
      // El backend YA hizo la comparación con proveedores existentes
      // Solo tomamos los datos de comparacion.proveedores directamente
      const proveedoresComparados = analisisProveedores.comparacion?.proveedores || [];
      
      console.log('[PasoRevisarProveedores] Proveedores comparados desde backend:', proveedoresComparados);
      
      // Normalizar - extraer valores si vienen como objetos anidados
      const proveedoresNormalizados = proveedoresComparados.map(prov => {
        // Si nombre es un objeto, extraer el campo nombre del objeto
        const nombreReal = typeof prov.nombre === 'object' && prov.nombre !== null 
          ? (prov.nombre.nombre || String(prov.nombre))
          : (prov.nombre || '');
        
        // Si mapeoA es un objeto, extraer el campo nombre del objeto
        const mapeoAReal = typeof prov.mapeoA === 'object' && prov.mapeoA !== null
          ? (prov.mapeoA.nombre || String(prov.mapeoA))
          : (prov.mapeoA || nombreReal);
        
        // Extraer alias y categorias del objeto nombre si está anidado
        const aliasReal = Array.isArray(prov.alias) && prov.alias.length > 0
          ? prov.alias
          : (typeof prov.nombre === 'object' && Array.isArray(prov.nombre?.alias) ? prov.nombre.alias : []);
          
        const categoriasReal = Array.isArray(prov.categorias) && prov.categorias.length > 0
          ? prov.categorias
          : (typeof prov.nombre === 'object' && Array.isArray(prov.nombre?.categorias) ? prov.nombre.categorias : []);
        
        const cuitReal = prov.cuit || (typeof prov.nombre === 'object' ? prov.nombre?.cuit : '') || '';
        const direccionReal = prov.direccion || (typeof prov.nombre === 'object' ? prov.nombre?.direccion : '') || '';
        const razonSocialReal = prov.razon_social || (typeof prov.nombre === 'object' ? prov.nombre?.razon_social : '') || '';
        
        return {
          nombre: nombreReal,
          alias: aliasReal.map(a => typeof a === 'string' ? a : String(a)),
          categorias: categoriasReal.map(c => typeof c === 'string' ? c : String(c)),
          cuit: cuitReal,
          direccion: direccionReal,
          razon_social: razonSocialReal,
          estado: prov.estado || 'nuevo',
          coincidencia: prov.coincidencia || null,
          accion: prov.accion || 'crear_nuevo',
          mapeoA: mapeoAReal
        };
      });
      
      console.log('[PasoRevisarProveedores] Proveedores normalizados:', proveedoresNormalizados);
      setMapeosProveedores(proveedoresNormalizados);
      
    } catch (error) {
      console.error('[PasoRevisarProveedores] Error cargando análisis:', error);
      setError(`Error cargando proveedores: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCambioAccion = (index, nuevaAccion) => {
    const nuevosMapeos = [...mapeosProveedores];
    nuevosMapeos[index].accion = nuevaAccion;
    
    if (nuevaAccion === 'crear_nuevo') {
      nuevosMapeos[index].mapeoA = nuevosMapeos[index].nombre;
    }
    
    setMapeosProveedores(nuevosMapeos);
  };

  const handleCambioMapeo = (index, nuevoMapeo) => {
    const nuevosMapeos = [...mapeosProveedores];
    nuevosMapeos[index].mapeoA = nuevoMapeo;
    setMapeosProveedores(nuevosMapeos);
  };

  const handleEditarProveedor = (index) => {
    const proveedor = mapeosProveedores[index];
    setEditandoProveedor(index);
    setProveedorEditado({
      nombre: proveedor.nombre || '',
      alias: proveedor.alias || [],
      categorias: proveedor.categorias || [],
      cuit: proveedor.cuit || '',
      direccion: proveedor.direccion || '',
      razon_social: proveedor.razon_social || ''
    });
  };

  const handleGuardarEdicion = () => {
    if (proveedorEditado.nombre.trim()) {
      const nuevosMapeos = [...mapeosProveedores];
      nuevosMapeos[editandoProveedor] = {
        ...nuevosMapeos[editandoProveedor],
        nombre: proveedorEditado.nombre.trim(),
        mapeoA: proveedorEditado.nombre.trim(),
        alias: proveedorEditado.alias,
        categorias: proveedorEditado.categorias,
        cuit: proveedorEditado.cuit,
        direccion: proveedorEditado.direccion,
        razon_social: proveedorEditado.razon_social,
        accion: 'crear_nuevo'
      };
      setMapeosProveedores(nuevosMapeos);
    }
    setEditandoProveedor(null);
    setProveedorEditado({
      nombre: '',
      alias: [],
      categorias: [],
      cuit: '',
      direccion: '',
      razon_social: ''
    });
  };

  const handleCancelarEdicion = () => {
    setEditandoProveedor(null);
    setProveedorEditado({
      nombre: '',
      alias: [],
      categorias: [],
      cuit: '',
      direccion: '',
      razon_social: ''
    });
  };

  const handleEliminarProveedor = (index) => {
    const nuevosMapeos = mapeosProveedores.filter((_, i) => i !== index);
    setMapeosProveedores(nuevosMapeos);
  };

  const handleContinuar = async () => {
    try {
      setLoading(true);
      console.log('[PasoRevisarProveedores] Persistiendo proveedores');
      
      const empresaId = wizardData.analisisCsv?._empresaId || empresa.id;
      
      // Persistir proveedores en el backend
      const resultadoPersistencia = await importMovimientosService.persistirProveedores(
        empresaId,
        mapeosProveedores
      );
      
      console.log('[PasoRevisarProveedores] Persistencia exitosa:', resultadoPersistencia);
      
      // Actualizar wizard data
      updateWizardData({ 
        mapeosProveedores,
        proveedoresPersistidos: true,
        mapeosFinalProveedores: resultadoPersistencia.mapeos_finales
      });
      
      onNext();
      
    } catch (error) {
      console.error('[PasoRevisarProveedores] Error persistiendo:', error);
      setError(`Error persistiendo proveedores: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'existe': return 'success';
      case 'nuevo': return 'warning';
      default: return 'default';
    }
  };

  const getAccionColor = (accion) => {
    switch (accion) {
      case 'usar_existente': return 'success';
      case 'crear_nuevo': return 'info';
      default: return 'default';
    }
  };

  const proveedoresACrear = mapeosProveedores.filter(m => m.accion === 'crear_nuevo').length;
  const proveedoresExistentes = mapeosProveedores.filter(m => m.accion === 'usar_existente').length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Paso 3: Revisar Proveedores
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Revisa los proveedores detectados en el CSV y decide si usar proveedores existentes o crear nuevos.
      </Typography>

      {/* Debug / Cargar manualmente si no se cargó automáticamente */}
      {!cargaInicial && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2">
              Los proveedores no se cargaron automáticamente. Haz clic para cargarlos.
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setCargaInicial(true);
                cargarAnalisisProveedores();
              }}
            >
              Cargar Proveedores
            </Button>
          </Box>
        </Alert>
      )}

      {/* Campo de especificaciones del usuario */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Especificaciones adicionales (opcional)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Proporciona instrucciones específicas para el análisis de proveedores. Ejemplo: "los proveedores aparecen con su CUIT entre paréntesis"
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={especificacionUsuario}
            onChange={(e) => setEspecificacionUsuario(e.target.value)}
            placeholder="Ej: Los proveedores tienen su CUIT al final, ignorar números de documento..."
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            onClick={cargarAnalisisProveedores}
            disabled={!especificacionUsuario.trim()}
          >
            Volver a analizar con especificaciones
          </Button>
        </CardContent>
      </Card>

      {/* Resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary">
                {mapeosProveedores.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Proveedores a crear
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {mapeosProveedores.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Nuevos en tu empresa
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {mapeosProveedores.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Se crearán {mapeosProveedores.length} proveedores nuevos en tu empresa. Puedes editar los nombres antes de continuar.
        </Alert>
      )}

      {/* Tabla de proveedores */}
    
      { <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Proveedores detectados
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Alias</TableCell>
                  <TableCell>Categorías</TableCell>
                  <TableCell>CUIT</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mapeosProveedores.map((mapeo, index) => (
                  <TableRow key={index}>
                    {editandoProveedor === index ? (
                      <>
                        <TableCell colSpan={5}>
                          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Nombre *"
                                  value={proveedorEditado.nombre}
                                  onChange={(e) => setProveedorEditado({...proveedorEditado, nombre: e.target.value})}
                                  placeholder="Nombre del proveedor"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="CUIT"
                                  value={proveedorEditado.cuit}
                                  onChange={(e) => setProveedorEditado({...proveedorEditado, cuit: e.target.value})}
                                  placeholder="20-12345678-9"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Razón Social"
                                  value={proveedorEditado.razon_social}
                                  onChange={(e) => setProveedorEditado({...proveedorEditado, razon_social: e.target.value})}
                                  placeholder="Razón social"
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Dirección"
                                  value={proveedorEditado.direccion}
                                  onChange={(e) => setProveedorEditado({...proveedorEditado, direccion: e.target.value})}
                                  placeholder="Calle 123, Ciudad"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Alias (separados por coma)"
                                  value={Array.isArray(proveedorEditado.alias) ? proveedorEditado.alias.join(', ') : ''}
                                  onChange={(e) => setProveedorEditado({
                                    ...proveedorEditado, 
                                    alias: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                                  })}
                                  placeholder="Alias 1, Alias 2, Alias 3"
                                  helperText="Nombres alternativos o variaciones del proveedor"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Categorías (separadas por coma)"
                                  value={Array.isArray(proveedorEditado.categorias) ? proveedorEditado.categorias.join(', ') : ''}
                                  onChange={(e) => setProveedorEditado({
                                    ...proveedorEditado, 
                                    categorias: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                                  })}
                                  placeholder="Materiales, Corralón, Ferretería"
                                  helperText="Categorías relacionadas con este proveedor"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Box display="flex" gap={1} justifyContent="flex-end">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleGuardarEdicion}
                                  >
                                    Guardar
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={handleCancelarEdicion}
                                  >
                                    Cancelar
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PersonIcon color="action" fontSize="small" />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {mapeo.nombre}
                              </Typography>
                              {mapeo.razon_social && (
                                <Typography variant="caption" color="text.secondary">
                                  {mapeo.razon_social}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          {mapeo.alias && Array.isArray(mapeo.alias) && mapeo.alias.length > 0 ? (
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {mapeo.alias.slice(0, 2).map((alias, i) => (
                                <Chip key={i} label={typeof alias === 'string' ? alias : String(alias)} size="small" variant="outlined" />
                              ))}
                              {mapeo.alias.length > 2 && (
                                <Chip label={`+${mapeo.alias.length - 2}`} size="small" variant="outlined" />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {mapeo.categorias && Array.isArray(mapeo.categorias) && mapeo.categorias.length > 0 ? (
                            <Box display="flex" gap={0.5} flexWrap="wrap">
                              {mapeo.categorias.slice(0, 2).map((cat, i) => (
                                <Chip key={i} label={typeof cat === 'string' ? cat : String(cat)} size="small" color="primary" variant="outlined" />
                              ))}
                              {mapeo.categorias.length > 2 && (
                                <Chip label={`+${mapeo.categorias.length - 2}`} size="small" color="primary" variant="outlined" />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {mapeo.cuit || '-'}
                          </Typography>
                          {mapeo.direccion && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {mapeo.direccion}
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEditarProveedor(index)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEliminarProveedor(index)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {mapeosProveedores.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No se detectaron proveedores en el CSV
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card> }

      {/* Información adicional */}
      {mapeosProveedores.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información importante
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Todos los proveedores detectados son nuevos y se crearán automáticamente
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Puedes editar los nombres haciendo clic en el ícono de editar
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Los proveedores se asignarán automáticamente a los movimientos correspondientes
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={onBack}
          size="large"
        >
          Volver
        </Button>
        
        <Button
          variant="contained"
          onClick={handleContinuar}
          size="large"
        >
          Continuar al Resumen
        </Button>
      </Box>
    </Box>
  );
};

export default PasoRevisarProveedores;