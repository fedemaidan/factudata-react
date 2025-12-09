import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Card, CardContent, Container, Dialog, DialogActions, 
  DialogContent, DialogTitle, Grid, IconButton, Paper, Snackbar, Stack, 
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
  Chip, Tooltip, FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  LinearProgress, CircularProgress, Backdrop
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TemplateIcon from '@mui/icons-material/ContentCopy';
import SmartToyIcon from '@mui/icons-material/SmartToy';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import AsistenteOperativoService from '../services/asistenteOperativoService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';

const emptyOperacion = {
  nombre: '',
  descripcion: '',
  tipo: '',
  parametros: {},
  activa: true,
};

const emptyPlantilla = {
  nombre: '',
  descripcion: '',
  configuracion: {},
  tipo_operacion: '',
};

const AsistenteOperativo = () => {
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  // Estados para configuración
  const [configuracion, setConfiguracion] = useState(null);
  const [openConfigDialog, setOpenConfigDialog] = useState(false);
  
  // Estados para historial
  const [historial, setHistorial] = useState([]);
  const [totalHistorial, setTotalHistorial] = useState(0);
  const [pageHistorial, setPageHistorial] = useState(0);
  const [rowsPerPageHistorial, setRowsPerPageHistorial] = useState(25);
  
  // Estados para plantillas
  const [plantillas, setPlantillas] = useState([]);
  const [openPlantillaDialog, setOpenPlantillaDialog] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState(null);
  const [formPlantilla, setFormPlantilla] = useState(emptyPlantilla);
  
  // Estados para operaciones
  const [openOperacionDialog, setOpenOperacionDialog] = useState(false);
  const [formOperacion, setFormOperacion] = useState(emptyOperacion);
  const [ejecutandoOperacion, setEjecutandoOperacion] = useState(false);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState(null);
  const [periodoStats, setPeriodoStats] = useState('mes');

  const { user } = useAuthContext();
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  // Cargar datos iniciales
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, currentTab]);

  const loadInitialData = async () => {
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      
      if (currentTab === 'dashboard') {
        await Promise.all([
          loadConfiguracion(empresa.id),
          loadEstadisticas(empresa.id)
        ]);
      } else if (currentTab === 'historial') {
        await loadHistorial(empresa.id);
      } else if (currentTab === 'plantillas') {
        await loadPlantillas(empresa.id);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setAlert({ open: true, message: 'Error al cargar datos', severity: 'error' });
    }
  };

  const loadConfiguracion = async (empresaId) => {
    try {
      setLoading(true);
      const config = await AsistenteOperativoService.obtenerConfiguracion(empresaId);
      setConfiguracion(config);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Si no existe configuración, crear una vacía
      setConfiguracion({
        activo: false,
        configuraciones: {},
        empresa_id: empresaId
      });
    } finally {
      setLoading(false);
    }
  };

  const loadHistorial = async (empresaId) => {
    try {
      setLoading(true);
      const params = {
        empresa_id: empresaId,
        page: pageHistorial,
        limit: rowsPerPageHistorial
      };
      const result = await AsistenteOperativoService.obtenerHistorial(params);
      setHistorial(result.items);
      setTotalHistorial(result.total);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setAlert({ open: true, message: 'Error al cargar historial', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadPlantillas = async (empresaId) => {
    try {
      setLoading(true);
      const result = await AsistenteOperativoService.obtenerPlantillas(empresaId);
      setPlantillas(result);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      setAlert({ open: true, message: 'Error al cargar plantillas', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadEstadisticas = async (empresaId) => {
    try {
      const stats = await AsistenteOperativoService.obtenerEstadisticas(empresaId, periodoStats);
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas({
        operaciones_ejecutadas: 0,
        tiempo_ahorrado: 0,
        errores: 0,
        eficiencia: 0
      });
    }
  };

  const handleEjecutarOperacion = async (operacion) => {
    try {
      setEjecutandoOperacion(true);
      const empresa = await getEmpresaDetailsFromUser(user);
      
      const operacionData = {
        ...operacion,
        empresa_id: empresa.id,
        usuario_id: user.uid || user.id
      };

      const resultado = await AsistenteOperativoService.ejecutarOperacion(operacionData);
      
      setAlert({ 
        open: true, 
        message: `Operación ejecutada exitosamente: ${resultado.mensaje}`, 
        severity: 'success' 
      });
      
      setOpenOperacionDialog(false);
      setFormOperacion(emptyOperacion);
      
      // Recargar historial si estamos en esa tab
      if (currentTab === 'historial') {
        loadHistorial(empresa.id);
      }
    } catch (error) {
      console.error('Error ejecutando operación:', error);
      setAlert({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    } finally {
      setEjecutandoOperacion(false);
    }
  };

  const handleGuardarPlantilla = async () => {
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const plantillaData = {
        ...formPlantilla,
        empresa_id: empresa.id
      };

      if (editingPlantilla) {
        // Actualizar plantilla existente (necesitarías implementar este endpoint)
        // await AsistenteOperativoService.actualizarPlantilla(editingPlantilla._id, plantillaData);
      } else {
        await AsistenteOperativoService.crearPlantilla(plantillaData);
      }

      setAlert({ 
        open: true, 
        message: `Plantilla ${editingPlantilla ? 'actualizada' : 'creada'} exitosamente`, 
        severity: 'success' 
      });
      
      setOpenPlantillaDialog(false);
      setEditingPlantilla(null);
      setFormPlantilla(emptyPlantilla);
      loadPlantillas(empresa.id);
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      setAlert({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  const handleEliminarPlantilla = async (plantillaId) => {
    try {
      await AsistenteOperativoService.eliminarPlantilla(plantillaId);
      setAlert({ open: true, message: 'Plantilla eliminada exitosamente', severity: 'success' });
      
      const empresa = await getEmpresaDetailsFromUser(user);
      loadPlantillas(empresa.id);
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      setAlert({ open: true, message: `Error: ${error.message}`, severity: 'error' });
    }
  };

  // Componente TabPanel
  const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index} style={{ width: '100%' }}>
      {value === index && children}
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'exitoso': return 'success';
      case 'error': return 'error';
      case 'en_progreso': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <Head><title>Asistente Operativo</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>

            {/* Barra superior */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={2}>
                <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h4">Asistente Operativo</Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="outlined" 
                  startIcon={<SettingsIcon />}
                  onClick={() => setOpenConfigDialog(true)}
                  color="primary"
                >
                  Configuración
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setOpenOperacionDialog(true)}
                >
                  Nueva Operación
                </Button>
              </Stack>
            </Stack>

            {/* Sistema de Tabs */}
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                  <Tab icon={<AssessmentIcon />} label="Dashboard" value="dashboard" />
                  <Tab icon={<HistoryIcon />} label="Historial" value="historial" />
                  <Tab icon={<TemplateIcon />} label="Plantillas" value="plantillas" />
                </Tabs>
              </Box>

              {/* Tab Dashboard */}
              <TabPanel value={currentTab} index="dashboard">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  {/* Estadísticas */}
                  {estadisticas && (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={3}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Operaciones</Typography>
                            <Typography variant="h4" color="primary.main">
                              {estadisticas.operaciones_ejecutadas || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Este {periodoStats}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Tiempo Ahorrado</Typography>
                            <Typography variant="h4" color="success.main">
                              {estadisticas.tiempo_ahorrado || 0}h
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Automatización
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Errores</Typography>
                            <Typography variant="h4" color="error.main">
                              {estadisticas.errores || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Fallos detectados
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Eficiencia</Typography>
                            <Typography variant="h4" color="info.main">
                              {estadisticas.eficiencia || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Tasa de éxito
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {/* Estado del Asistente */}
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Estado del Asistente</Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Chip 
                          label={configuracion?.activo ? 'Activo' : 'Inactivo'}
                          color={configuracion?.activo ? 'success' : 'default'}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {configuracion?.activo 
                            ? 'El asistente está ejecutando operaciones automáticamente'
                            : 'El asistente está pausado'
                          }
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Stack>
              </TabPanel>

              {/* Tab Historial */}
              <TabPanel value={currentTab} index="historial">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <Typography variant="h6">Historial de Operaciones</Typography>
                  
                  <Paper>
                    {loading && <LinearProgress />}
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Operación</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Duración</TableCell>
                          <TableCell>Detalles</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historial.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(item.fecha).toLocaleString('es-ES')}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.nombre_operacion}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.tipo_operacion}</TableCell>
                            <TableCell>
                              <Chip 
                                label={item.estado}
                                color={getStatusColor(item.estado)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{item.duracion || '--'}</TableCell>
                            <TableCell>
                              <Tooltip title={item.detalles || 'Sin detalles'}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                  {item.detalles || 'Sin detalles'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {historial.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No hay operaciones en el historial
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Paper>
                </Stack>
              </TabPanel>

              {/* Tab Plantillas */}
              <TabPanel value={currentTab} index="plantillas">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Plantillas de Operaciones</Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingPlantilla(null);
                        setFormPlantilla(emptyPlantilla);
                        setOpenPlantillaDialog(true);
                      }}
                    >
                      Nueva Plantilla
                    </Button>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {plantillas.map((plantilla, index) => (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                              <Typography variant="h6" component="div">
                                {plantilla.nombre}
                              </Typography>
                              <Box>
                                <IconButton 
                                  size="small" 
                                  onClick={() => {
                                    setEditingPlantilla(plantilla);
                                    setFormPlantilla(plantilla);
                                    setOpenPlantillaDialog(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleEliminarPlantilla(plantilla._id || plantilla.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                              {plantilla.descripcion}
                            </Typography>
                            <Chip 
                              label={plantilla.tipo_operacion}
                              size="small"
                              variant="outlined"
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    {plantillas.length === 0 && !loading && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                          <Typography variant="body1" color="text.secondary">
                            No hay plantillas creadas aún
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Crea tu primera plantilla para automatizar operaciones
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Stack>
              </TabPanel>

            </Box>
          </Stack>
        </Container>

        {/* Alertas */}
        <Snackbar open={alert.open} autoHideDuration={6000} onClose={closeAlert}>
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Dialog Configuración */}
        <Dialog open={openConfigDialog} onClose={() => setOpenConfigDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Configuración del Asistente Operativo</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl>
                <TextField
                  label="Estado"
                  select
                  value={configuracion?.activo ? 'activo' : 'inactivo'}
                  onChange={(e) => setConfiguracion({
                    ...configuracion,
                    activo: e.target.value === 'activo'
                  })}
                  fullWidth
                >
                  <MenuItem value="activo">Activo</MenuItem>
                  <MenuItem value="inactivo">Inactivo</MenuItem>
                </TextField>
              </FormControl>
              {/* Aquí puedes agregar más campos de configuración */}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConfigDialog(false)}>Cancelar</Button>
            <Button 
              variant="contained" 
              onClick={async () => {
                try {
                  await AsistenteOperativoService.actualizarConfiguracion(configuracion);
                  setAlert({ open: true, message: 'Configuración guardada', severity: 'success' });
                  setOpenConfigDialog(false);
                } catch (error) {
                  setAlert({ open: true, message: `Error: ${error.message}`, severity: 'error' });
                }
              }}
            >
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Nueva Operación */}
        <Dialog open={openOperacionDialog} onClose={() => setOpenOperacionDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Ejecutar Nueva Operación</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Nombre de la Operación"
                value={formOperacion.nombre}
                onChange={(e) => setFormOperacion({...formOperacion, nombre: e.target.value})}
                fullWidth
              />
              <TextField
                label="Descripción"
                value={formOperacion.descripcion}
                onChange={(e) => setFormOperacion({...formOperacion, descripcion: e.target.value})}
                multiline
                rows={3}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Tipo de Operación</InputLabel>
                <Select
                  value={formOperacion.tipo}
                  onChange={(e) => setFormOperacion({...formOperacion, tipo: e.target.value})}
                  label="Tipo de Operación"
                >
                  <MenuItem value="automatizacion">Automatización</MenuItem>
                  <MenuItem value="validacion">Validación</MenuItem>
                  <MenuItem value="sincronizacion">Sincronización</MenuItem>
                  <MenuItem value="reporte">Reporte</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenOperacionDialog(false)} disabled={ejecutandoOperacion}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              onClick={() => handleEjecutarOperacion(formOperacion)}
              disabled={ejecutandoOperacion || !formOperacion.nombre || !formOperacion.tipo}
              startIcon={ejecutandoOperacion ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            >
              {ejecutandoOperacion ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Plantilla */}
        <Dialog open={openPlantillaDialog} onClose={() => setOpenPlantillaDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Nombre"
                value={formPlantilla.nombre}
                onChange={(e) => setFormPlantilla({...formPlantilla, nombre: e.target.value})}
                fullWidth
              />
              <TextField
                label="Descripción"
                value={formPlantilla.descripcion}
                onChange={(e) => setFormPlantilla({...formPlantilla, descripcion: e.target.value})}
                multiline
                rows={3}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Tipo de Operación</InputLabel>
                <Select
                  value={formPlantilla.tipo_operacion}
                  onChange={(e) => setFormPlantilla({...formPlantilla, tipo_operacion: e.target.value})}
                  label="Tipo de Operación"
                >
                  <MenuItem value="automatizacion">Automatización</MenuItem>
                  <MenuItem value="validacion">Validación</MenuItem>
                  <MenuItem value="sincronizacion">Sincronización</MenuItem>
                  <MenuItem value="reporte">Reporte</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPlantillaDialog(false)}>Cancelar</Button>
            <Button 
              variant="contained" 
              onClick={handleGuardarPlantilla}
              disabled={!formPlantilla.nombre || !formPlantilla.tipo_operacion}
            >
              {editingPlantilla ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Backdrop Loading */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    </>
  );
};

AsistenteOperativo.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AsistenteOperativo;