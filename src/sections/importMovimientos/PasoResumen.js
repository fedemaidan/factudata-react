import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Warning as WarningIcon,
  CloudUpload as CloudUploadIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  FolderOpen as FolderOpenIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import importMovimientosService from 'src/services/importMovimientosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { getProyectosByEmpresa } from 'src/services/proyectosService';

const PasoResumen = ({ 
  empresa, 
  wizardData, 
  updateWizardData, 
  onFinish, 
  onBack, 
  setLoading, 
  setError 
}) => {
  const { user } = useAuthContext();
  const [importando, setImportando] = useState(false);
  const [progresoImport, setProgresoImport] = useState(0);
  const [dialogConfirmacion, setDialogConfirmacion] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);
  const [etapaActual, setEtapaActual] = useState('');
  const [codigoImportacion, setCodigoImportacion] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const pollingIntervalRef = useRef(null);
  const [dialogEliminar, setDialogEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Cargar proyectos al montar
  useEffect(() => {
    const cargarProyectos = async () => {
      if (empresa?.id) {
        try {
          const proyectosData = await getProyectosByEmpresa(empresa);
          setProyectos(proyectosData || []);
        } catch (error) {
          console.error('[PasoResumen] Error cargando proyectos:', error);
        }
      }
    };
    cargarProyectos();
  }, [empresa]);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const calcularResumen = () => {
    const { mapeosCategorias = [], mapeosProveedores = [], analisisCsv, tipoImportacion, proyectoSeleccionado } = wizardData;

    const resumen = {
      categorias: {
        nuevas: mapeosCategorias.filter(m => m.accion === 'crear_nueva').length,
        existentes: mapeosCategorias.filter(m => m.accion === 'usar_existente').length,
        total: mapeosCategorias.length
      },
      proveedores: {
        nuevos: mapeosProveedores.filter(m => m.accion === 'crear_nuevo').length,
        existentes: mapeosProveedores.filter(m => m.accion === 'usar_existente').length,
        total: mapeosProveedores.length
      },
      movimientos: {
        total: analisisCsv?.movimientosValidos || 0,
        ars: analisisCsv?.todosMovimientos?.filter(m => m.moneda === 'ARS').length || 0,
        usd: analisisCsv?.todosMovimientos?.filter(m => m.moneda === 'USD').length || 0,
        egresos: analisisCsv?.todosMovimientos?.filter(m => m.type === 'egreso').length || 0,
        ingresos: analisisCsv?.todosMovimientos?.filter(m => m.type === 'ingreso').length || 0
      },
      importacion: {
        tipo: tipoImportacion,
        proyecto: proyectoSeleccionado,
        archivos: analisisCsv?.archivos?.length || 0
      }
    };

    return resumen;
  };

  const resumen = calcularResumen();

  const handleConfirmarImport = () => {
    setDialogConfirmacion(true);
  };

  const handleCancelarImport = () => {
    setDialogConfirmacion(false);
  };

  const handleEjecutarImport = async () => {
    setDialogConfirmacion(false);
    setImportando(true);
    setProgresoImport(0);
    setError('');

    try {
      console.log('[PasoResumen] Iniciando importación directa (NO BLOQUEANTE)');
      
      // 1. Obtener URLs de archivos ya subidos
      setEtapaActual('Preparando archivos...');
      setProgresoImport(10);
      
      const archivosUrls = wizardData.analisisCsv?._archivosUrls;
      if (!archivosUrls || archivosUrls.length === 0) {
        throw new Error('No hay archivos subidos para procesar');
      }

      console.log('[PasoResumen] Archivos a procesar:', archivosUrls);
      
      // 2. Iniciar importación (retorna inmediatamente con código)
      setEtapaActual('Iniciando procesamiento...');
      setProgresoImport(20);
      
      const inicioImportacion = await importMovimientosService.importarDirecto(
        archivosUrls,
        empresa.id,
        user.id,
        user.firstName + ' ' + user.lastName
      );

      console.log('[PasoResumen] Importación iniciada:', inicioImportacion);
      // inicioImportacion = { codigo: "N242R", resultado: null }

      if (!inicioImportacion.codigo) {
        throw new Error('No se recibió código de importación');
      }

      setCodigoImportacion(inicioImportacion.codigo);
      setEtapaActual(`Procesando... (Código: ${inicioImportacion.codigo})`);
      setProgresoImport(30);

      // 3. Iniciar polling cada 20 segundos (continúa hasta desmontar componente)
      pollingIntervalRef.current = setInterval(async () => {
        try {
          console.log('[PasoResumen] Consultando estado:', inicioImportacion.codigo);
          
          const estado = await importMovimientosService.consultarEstadoImportacion(inicioImportacion.codigo);
          
          console.log('[PasoResumen] Estado recibido:', estado);
          // estado = { codigo: "N242R", resultado: {...} o null }

          if (estado.resultado !== null) {
            // ¡Completado! Pero NO detener polling - continuar hasta que usuario salga
            console.log('[PasoResumen] Importación completada - mostrando resultado');

            setProgresoImport(100);
            setEtapaActual('Importación completada');
            setImportando(false);

            if (estado.resultado.success) {
              setResultadoImport({
                success: true,
                codigo: estado.codigo,
                total: estado.resultado.numero_movimientos,
                exitosos: estado.resultado.completas,
                fallidos: estado.resultado.errores,
                detalles: estado.resultado.detalles
              });
              updateWizardData({ resultadoFinal: estado.resultado });
            } else {
              throw new Error(estado.resultado.error || 'Error en importación');
            }
            
            // NO limpiar el intervalo - dejarlo correr hasta que el componente se desmonte
          } else {
            // Aún procesando
            setProgresoImport(prev => Math.min(prev + 5, 90)); // Incrementar hasta 90%
          }

        } catch (pollingError) {
          console.error('[PasoResumen] Error en polling:', pollingError);
          // No detener el polling por un error puntual - continuar intentando
        }
      }, 20000); // 20 segundos

    } catch (error) {
      console.error('[PasoResumen] Error en importación:', error);
      setError('Error durante la importación: ' + error.message);
      setProgresoImport(0);
      setEtapaActual('');
      setImportando(false);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-AR').format(num);
  };

  const handleEliminarMovimientos = async () => {
    setDialogEliminar(false);
    setEliminando(true);
    setError('');

    try {
      const resultado = await importMovimientosService.eliminarMovimientosPorCodigo(resultadoImport.codigo);
      
      if (resultado.success) {
        setError('');
        // Actualizar el resultado para reflejar la eliminación
        setResultadoImport(prev => ({
          ...prev,
          movimientosEliminados: resultado.movimientos_eliminados
        }));
        alert(`Se eliminaron ${resultado.movimientos_eliminados} movimientos exitosamente`);
      } else {
        setError(resultado.error || 'Error al eliminar movimientos');
      }
    } catch (error) {
      console.error('Error eliminando movimientos:', error);
      setError('Error al eliminar movimientos: ' + error.message);
    } finally {
      setEliminando(false);
    }
  };

  if (importando) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          Importando movimientos...
        </Typography>
        
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Procesando importación
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Por favor espera mientras procesamos tus movimientos
              </Typography>
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progresoImport} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {progresoImport}% completado
              </Typography>

              {etapaActual && (
                <Typography variant="body2" sx={{ mt: 2, fontWeight: 500, color: 'primary.main' }}>
                  {etapaActual}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (resultadoImport) {
    const { total, exitosos, fallidos, codigo } = resultadoImport;
    
    return (
      <Box>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            ¡Importación Completada!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {formatNumber(exitosos)} de {formatNumber(total)} movimientos importados
          </Typography>
        </Box>
        
        {codigo && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Código de importación:</strong> {codigo}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Los proyectos se filtrarán automáticamente con este código
            </Typography>
          </Alert>
        )}

        {fallidos > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {formatNumber(fallidos)} movimientos no se pudieron importar
          </Alert>
        )}

        {/* Lista de proyectos simplificada */}
        {proyectos.length > 0 && codigo && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Acceder a proyectos
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {proyectos.map((proyecto) => (
                  <Grid item xs={12} sm={6} md={4} key={proyecto.id}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ 
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        py: 1.5
                      }}
                      onClick={() => {
                        window.open(
                          `/cajaProyecto?proyectoId=${proyecto.id}&codigoSync=${codigo}`,
                          '_blank'
                        );
                      }}
                    >
                      <Box>
                        <Typography variant="body2" noWrap>
                          {proyecto.nombre || proyecto.name}
                        </Typography>
                      </Box>
                      <FolderOpenIcon fontSize="small" color="primary" />
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Resumen compacto */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="success.main">
                  {formatNumber(exitosos)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Exitosos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="primary">
                  {resumen.categorias.nuevas}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Categorías
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5" color="info.main">
                  {resumen.proveedores.nuevos}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Proveedores
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            size="large"
            startIcon={<DeleteIcon />}
            onClick={() => setDialogEliminar(true)}
            disabled={eliminando || !resultadoImport.codigo}
          >
            Eliminar Importación
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={onFinish}
          >
            Finalizar
          </Button>
        </Box>

        {/* Diálogo de confirmación para eliminar */}
        <Dialog open={dialogEliminar} onClose={() => setDialogEliminar(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="error" />
              Confirmar Eliminación
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography paragraph>
              ¿Está seguro que desea eliminar TODOS los movimientos importados con el código <strong>{resultadoImport.codigo}</strong>?
            </Typography>
            <Typography variant="body2" color="error">
              Esta acción NO se puede deshacer. Se eliminarán {formatNumber(resultadoImport.exitosos)} movimientos.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogEliminar(false)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEliminarMovimientos}
              variant="contained"
              color="error"
              disabled={eliminando}
            >
              {eliminando ? 'Eliminando...' : 'Eliminar Todo'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Resumen de Importación
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Revisa los datos detectados antes de confirmar la importación.
      </Typography>

      {/* Resumen compacto */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {resumen.categorias.nuevas}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categorías nuevas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main">
                {resumen.proveedores.nuevos}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Proveedores nuevos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Advertencias */}
      {resumen.movimientos.total > 500 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Importarás {formatNumber(resumen.movimientos.total)} movimientos. El proceso puede tomar algunos minutos.
        </Alert>
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
          color="primary"
          onClick={handleConfirmarImport}
          size="large"
          startIcon={<CloudUploadIcon />}
        >
          Importar Movimientos
        </Button>
      </Box>

      {/* Dialog de confirmación */}
      <Dialog open={dialogConfirmacion} onClose={handleCancelarImport} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Confirmar Importación
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            ¿Desea continuar importando los movimientos?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Este proceso puede demorar algunos minutos. Por favor espere hasta que finalice.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelarImport}>
            Cancelar
          </Button>
          <Button 
            onClick={handleEjecutarImport}
            variant="contained"
            color="primary"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PasoResumen;