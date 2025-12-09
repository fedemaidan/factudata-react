import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import importMovimientosService from 'src/services/importMovimientosService';

const PasoSubirCsv = ({ 
  empresa, 
  wizardData, 
  updateWizardData, 
  onNext, 
  setLoading, 
  setError 
}) => {
  const [dragging, setDragging] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [archivosAcumulados, setArchivosAcumulados] = useState([]);
  const [analisisAcumulado, setAnalisisAcumulado] = useState(null);

  const handleFileUpload = async (file) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setError('Por favor, selecciona un archivo CSV o Excel válido (.csv, .xlsx, .xls)');
      return;
    }

    // Agregar archivo a la lista
    const nuevosArchivos = [...archivosAcumulados, file];
    setArchivosAcumulados(nuevosArchivos);
  };

  const eliminarArchivo = (index) => {
    const nuevosArchivos = archivosAcumulados.filter((_, i) => i !== index);
    setArchivosAcumulados(nuevosArchivos);
    
    if (nuevosArchivos.length === 0) {
      setAnalisisAcumulado(null);
      updateWizardData({
        archivos: [],
        analisisCsv: null
      });
    }
  };

  const analizarTodosLosArchivos = async () => {
    if (archivosAcumulados.length === 0) {
      setError('No hay archivos para analizar');
      return;
    }

    setAnalizando(true);
    setError('');
    
    try {
      // Los archivos ya están como File objects en archivosAcumulados
      const files = archivosAcumulados;
      
      console.log('[PasoSubirCsv] Subiendo archivos a Firebase Storage:', {
        cantidad: files.length,
        empresaId: empresa.id
      });
      
      // Solo subir archivos a Firebase Storage
      const resultado = await importMovimientosService.subirArchivos(
        files,
        empresa.id,
        '' // Sin especificaciones en este paso
      );
      
      console.log('[PasoSubirCsv] Archivos subidos exitosamente:', resultado);
      
      // Crear análisis básico para mostrar en UI
      const analisisBasico = {
        archivos: resultado.urls_archivos || [],
        archivos_subidos: resultado.archivos_subidos || files.length,
        timestamp: resultado.timestamp,
        // Datos necesarios para los siguientes pasos
        _archivosUrls: resultado.urls_archivos,
        _empresaId: empresa.id,
        _especificacionUsuario: '' // Sin especificaciones en este paso inicial
      };
      
      // Actualizar estado con los resultados
      setAnalisisAcumulado(analisisBasico);
      
      // Pasar los datos al wizard
      updateWizardData({ 
        archivos: archivosAcumulados,
        analisisCsv: analisisBasico
      });
      
    } catch (error) {
      console.error('[PasoSubirCsv] Error subiendo archivos:', error);
      setError(error.message);
    } finally {
      setAnalizando(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFileUpload(file));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => handleFileUpload(file));
  };

  const handleTipoImportacionChange = (event) => {
    updateWizardData({ tipoImportacion: event.target.value });
  };

  const handleProyectoChange = (event) => {
    const proyectoId = event.target.value;
    const proyecto = empresa.proyectos?.find(p => p.id === proyectoId);
    updateWizardData({ 
      proyectoSeleccionado: proyecto ? { id: proyecto.id, nombre: proyecto.nombre } : null 
    });
  };

  // Usar analisisAcumulado si existe, sino usar el del wizard
  const analisisCsv = analisisAcumulado || wizardData.analisisCsv;
  const { tipoImportacion, proyectoSeleccionado } = wizardData;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Paso 1: Subir Archivo CSV o Excel
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Selecciona uno o más archivos CSV o Excel con los movimientos a importar. Los archivos deben contener las columnas necesarias para cada movimiento.
      </Typography>

      <Grid container spacing={3}>
        {/* Selector de tipo de importación */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tipo de importación
              </Typography>
              <RadioGroup
                value={tipoImportacion || 'general'}
                onChange={handleTipoImportacionChange}
              >
                <FormControlLabel 
                  value="general" 
                  control={<Radio />} 
                  label="General - Los movimientos se asignarán según el proyecto indicado en cada fila del CSV" 
                />
                <FormControlLabel 
                  value="proyecto_especifico" 
                  control={<Radio />} 
                  label="Proyecto específico - Todos los movimientos se asignarán a un proyecto seleccionado" 
                />
              </RadioGroup>

              {tipoImportacion === 'proyecto_especifico' && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Seleccionar proyecto</InputLabel>
                  <Select
                    value={proyectoSeleccionado?.id || ''}
                    onChange={handleProyectoChange}
                    label="Seleccionar proyecto"
                  >
                    {empresa.proyectos?.map((proyecto) => (
                      <MenuItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Área de subida */}
        <Grid item xs={12}>
          <Box>
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: dragging ? '2px dashed #2196f3' : '2px dashed #ccc',
                backgroundColor: dragging ? '#f3f9ff' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-input').click()}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {dragging ? 'Suelta los archivos aquí' : 'Arrastra y suelta archivos CSV o Excel'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                o haz clic para seleccionar archivos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Formatos soportados: .csv, .xlsx, .xls
              </Typography>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Paper>

            {archivosAcumulados.length > 0 && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Archivos cargados ({archivosAcumulados.length})
                  </Typography>
                  <List dense>
                    {archivosAcumulados.map((archivo, index) => (
                      <ListItem key={index}>
                        <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
                        <ListItemText
                          primary={archivo.name}
                          secondary={`${Math.round(archivo.size / 1024)} KB`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => eliminarArchivo(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={analizarTodosLosArchivos}
                      disabled={analizando}
                    >
                      {analizando ? 'Subiendo archivos...' : 'Subir y continuar'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setArchivosAcumulados([]);
                        setAnalisisAcumulado(null);
                        updateWizardData({ archivos: [], analisisCsv: null });
                      }}
                    >
                      Limpiar todo
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {analizando && (
              <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography>Subiendo archivos a Firebase Storage...</Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Botón para continuar después de subir archivos */}
        {analisisCsv && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                onClick={onNext}
                size="large"
                disabled={!analisisCsv || (tipoImportacion === 'proyecto_especifico' && !proyectoSeleccionado)}
              >
                {!analisisCsv && 'Primero sube los archivos'}
                {analisisCsv && tipoImportacion === 'proyecto_especifico' && !proyectoSeleccionado && 'Selecciona un proyecto'}
                {analisisCsv && (tipoImportacion === 'general' || proyectoSeleccionado) && 'Continuar al siguiente paso'}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PasoSubirCsv;