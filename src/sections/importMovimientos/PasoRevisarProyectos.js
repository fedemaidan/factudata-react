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
  Business as BusinessIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import importMovimientosService from 'src/services/importMovimientosService';

const PasoRevisarProyectos = ({ 
  empresa, 
  wizardData, 
  updateWizardData, 
  onNext, 
  onBack, 
  setLoading, 
  setError 
}) => {
  const [mapeosProyectos, setMapeosProyectos] = useState([]);
  const [editandoProyecto, setEditandoProyecto] = useState(null);
  const [nuevoProyecto, setNuevoProyecto] = useState('');

  useEffect(() => {
    if (wizardData.analisisCsv && empresa.proyectos) {
      cargarAnalisisProyectos();
    }
  }, [wizardData.analisisCsv, empresa.proyectos]);

  const cargarAnalisisProyectos = async () => {
    try {
      setLoading(true);
      
      const entidadesExistentes = {
        proyectos: empresa.proyectos || []
      };

      const analisisComparacion = await importMovimientosService.compararConExistentes(
        wizardData.analisisCsv,
        entidadesExistentes
      );

      setMapeosProyectos(analisisComparacion.proyectos);
    } catch (error) {
      console.error('Error analizando proyectos:', error);
      setError('Error analizando los proyectos');
    } finally {
      setLoading(false);
    }
  };

  const handleCambioAccion = (index, nuevaAccion) => {
    const nuevosMapeos = [...mapeosProyectos];
    nuevosMapeos[index].accion = nuevaAccion;
    
    if (nuevaAccion === 'crear_nuevo') {
      nuevosMapeos[index].mapeoA = nuevosMapeos[index].nombre;
      nuevosMapeos[index].id = null;
    }
    
    setMapeosProyectos(nuevosMapeos);
  };

  const handleCambioMapeo = (index, proyectoSeleccionado) => {
    const nuevosMapeos = [...mapeosProyectos];
    const proyecto = empresa.proyectos.find(p => p.id === proyectoSeleccionado);
    
    if (proyecto) {
      nuevosMapeos[index].mapeoA = proyecto.nombre;
      nuevosMapeos[index].id = proyecto.id;
    }
    
    setMapeosProyectos(nuevosMapeos);
  };

  const handleEditarProyecto = (index) => {
    setEditandoProyecto(index);
    setNuevoProyecto(mapeosProyectos[index].mapeoA);
  };

  const handleGuardarEdicion = () => {
    if (nuevoProyecto.trim()) {
      const nuevosMapeos = [...mapeosProyectos];
      nuevosMapeos[editandoProyecto].mapeoA = nuevoProyecto.trim();
      nuevosMapeos[editandoProyecto].accion = 'crear_nuevo';
      nuevosMapeos[editandoProyecto].id = null;
      setMapeosProyectos(nuevosMapeos);
    }
    setEditandoProyecto(null);
    setNuevoProyecto('');
  };

  const handleCancelarEdicion = () => {
    setEditandoProyecto(null);
    setNuevoProyecto('');
  };

  const handleContinuar = () => {
    updateWizardData({ mapeosProyectos });
    onNext();
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

  const proyectosACrear = mapeosProyectos.filter(m => m.accion === 'crear_nuevo').length;
  const proyectosExistentes = mapeosProyectos.filter(m => m.accion === 'usar_existente').length;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Paso 4: Revisar Proyectos
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Revisa los proyectos detectados en el CSV y decide si usar proyectos existentes o crear nuevos.
      </Typography>

      {/* Resumen */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <FolderOpenIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" color="primary">
                {mapeosProyectos.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Proyectos detectados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" color="success.main">
                {proyectosExistentes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Usar existentes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {proyectosACrear}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Crear nuevos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {proyectosACrear > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Se crearán {proyectosACrear} proyectos nuevos en tu empresa. 
          Los proyectos nuevos estarán disponibles inmediatamente para todos los usuarios.
        </Alert>
      )}

      {/* Información sobre proyectos existentes */}
      {empresa.proyectos && empresa.proyectos.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Proyectos actuales en tu empresa
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {empresa.proyectos.slice(0, 10).map((proyecto) => (
                <Chip
                  key={proyecto.id}
                  icon={<FolderOpenIcon />}
                  label={proyecto.nombre}
                  size="small"
                  color="default"
                  variant="outlined"
                />
              ))}
              {empresa.proyectos.length > 10 && (
                <Chip
                  label={`+${empresa.proyectos.length - 10} más`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabla de proyectos */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Proyectos detectados
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Proyecto en CSV</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acción</TableCell>
                  <TableCell>Mapear a</TableCell>
                  <TableCell>Opciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mapeosProyectos.map((mapeo, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FolderOpenIcon color="action" fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {mapeo.nombre}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={mapeo.estado === 'existe' ? <CheckCircleIcon /> : <WarningIcon />}
                        label={mapeo.estado === 'existe' ? 'Existe' : 'Nuevo'}
                        color={getEstadoColor(mapeo.estado)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={mapeo.accion}
                          onChange={(e) => handleCambioAccion(index, e.target.value)}
                        >
                          {mapeo.estado === 'existe' && (
                            <MenuItem value="usar_existente">Usar existente</MenuItem>
                          )}
                          <MenuItem value="crear_nuevo">Crear nuevo</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    
                    <TableCell>
                      {editandoProyecto === index ? (
                        <Box display="flex" gap={1} alignItems="center">
                          <TextField
                            size="small"
                            value={nuevoProyecto}
                            onChange={(e) => setNuevoProyecto(e.target.value)}
                            sx={{ minWidth: 200 }}
                            placeholder="Nombre del proyecto"
                          />
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
                      ) : (
                        <Box display="flex" alignItems="center" gap={1}>
                          {mapeo.accion === 'usar_existente' ? (
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                              <Select
                                value={mapeo.id || ''}
                                onChange={(e) => handleCambioMapeo(index, e.target.value)}
                              >
                                {empresa.proyectos?.map((proyecto) => (
                                  <MenuItem key={proyecto.id} value={proyecto.id}>
                                    {proyecto.nombre}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={mapeo.mapeoA}
                                color={getAccionColor(mapeo.accion)}
                                size="small"
                                icon={<FolderOpenIcon />}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleEditarProyecto(index)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {mapeo.estado === 'nuevo' && mapeo.accion === 'crear_nuevo' && (
                        <Chip
                          icon={<AddIcon />}
                          label="Nuevo"
                          color="info"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {mapeosProyectos.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FolderOpenIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No se detectaron proyectos en el CSV
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Los movimientos se asignarán sin proyecto específico
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      {proyectosACrear > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Información importante sobre proyectos nuevos
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Los proyectos nuevos se crearán automáticamente en tu empresa
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Estarán disponibles para todos los usuarios autorizados
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Podrás configurarlos posteriormente (presupuesto, usuarios, etc.)
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Se asignarán automáticamente a los movimientos correspondientes
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

export default PasoRevisarProyectos;