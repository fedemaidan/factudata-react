// src/pages/loteParaTodosMock/emprendimientos/[id]/edicion-masiva.js
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, Button, 
  Paper, Stepper, Step, StepLabel, Alert, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from '../../../../components/layouts/LoteParaTodosLayout';
import { 
  getEmprendimientoById
} from '../../../../data/loteParaTodos/mockEmprendimientos';
import { mockLotes } from '../../../../data/loteParaTodos/mockLotes';

const steps = [
  'Exportar lotes actuales',
  'Modificar en Excel',
  'Importar cambios',
  'Revisar y confirmar'
];

const EdicionMasivaEmprendimiento = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [cambiosDetectados, setCambiosDetectados] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  // Obtener datos del emprendimiento
  const emprendimiento = useMemo(() => {
    if (!id) return null;
    return getEmprendimientoById(parseInt(id));
  }, [id]);
  
  // Obtener lotes del emprendimiento
  const lotesEmprendimiento = useMemo(() => {
    if (!emprendimiento) return [];
    return mockLotes.filter(lote => lote.emprendimiento_id === emprendimiento.id);
  }, [emprendimiento]);
  
  // Funciones de manejo
  const handleExportarExcel = () => {
    // Simular descarga de Excel
    console.log('Exportando lotes a Excel...');
    
    // En una implementación real, aquí generarías el Excel con los datos actuales
    const csvContent = generateCSVContent(lotesEmprendimiento);
    downloadCSV(csvContent, `lotes_${emprendimiento.nombre}_${new Date().toISOString().split('T')[0]}.csv`);
    
    setActiveStep(1);
  };
  
  const generateCSVContent = (lotes) => {
    const headers = [
      'ID_Lote',
      'Manzana', 
      'Numero_Lote',
      'Superficie_m2',
      'Frente_m',
      'Fondo_m',
      'Precio_Actual',
      'Lista_Precios',
      'Estado',
      'Observaciones'
    ];
    
    const rows = lotes.map(lote => [
      lote.id,
      lote.manzana || '',
      lote.numero || '',
      lote.superficie || '',
      lote.frente || '',
      lote.fondo || '',
      lote.precio_base || '',
      lote.lista_precios || 'BASE',
      lote.estado || 'DISPONIBLE',
      lote.observaciones || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  };
  
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setProcessing(true);
      
      // Simular procesamiento
      setTimeout(() => {
        // Simular cambios detectados
        const cambiosSimulados = [
          {
            id: 1,
            lote: 'Mza A - Lote 15',
            campo: 'Precio',
            valorAnterior: '$450,000',
            valorNuevo: '$480,000',
            tipo: 'modificacion'
          },
          {
            id: 2,
            lote: 'Mza B - Lote 23',
            campo: 'Estado',
            valorAnterior: 'DISPONIBLE',
            valorNuevo: 'RESERVADO',
            tipo: 'modificacion'
          },
          {
            id: 3,
            lote: 'Mza C - Lote 7',
            campo: 'Lista Precios',
            valorAnterior: 'BASE',
            valorNuevo: 'PROMOCION_2024',
            tipo: 'modificacion'
          }
        ];
        
        setCambiosDetectados(cambiosSimulados);
        setProcessing(false);
        setActiveStep(3);
      }, 2000);
    }
  };
  
  const handleConfirmarCambios = () => {
    setProcessing(true);
    
    // Simular aplicación de cambios
    setTimeout(() => {
      setProcessing(false);
      setActiveStep(0);
      setCambiosDetectados([]);
      setUploadedFile(null);
      
      // Mostrar mensaje de éxito
      alert('¡Cambios aplicados exitosamente! Los lotes han sido actualizados.');
    }, 1500);
  };
  
  const resetProcess = () => {
    setActiveStep(0);
    setCambiosDetectados([]);
    setUploadedFile(null);
    setProcessing(false);
  };

  if (!emprendimiento) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Alert severity="error">Emprendimiento no encontrado</Alert>
      </LoteParaTodosLayout>
    );
  }

  return (
    <LoteParaTodosLayout currentModule="emprendimientos" pageTitle="Edición Masiva Excel">
      <Head>
        <title>Edición Masiva - {emprendimiento.nombre}</title> 
      </Head>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}`)}
            variant="outlined"
          >
            Volver
          </Button>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1">
              Edición Masiva por Excel
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {emprendimiento.nombre} • {lotesEmprendimiento.length} lotes
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={resetProcess}
            disabled={processing}
          >
            Reiniciar
          </Button>
        </Box>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Contenido según step */}
      {activeStep === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Paso 1: Exportar Lotes Actuales
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Descarga un archivo Excel con todos los lotes del emprendimiento para editarlo.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    El archivo incluirá las siguientes columnas editables:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Manzana y Número de Lote</li>
                    <li>Medidas (Superficie, Frente, Fondo)</li>
                    <li>Precio Actual</li>
                    <li>Lista de Precios Aplicada</li>
                    <li>Estado del Lote</li>
                    <li>Observaciones</li>
                  </ul>
                </Alert>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleExportarExcel}
                  fullWidth
                >
                  Descargar Excel con Lotes Actuales
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información del Emprendimiento
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total de lotes
                    </Typography>
                    <Typography variant="h6">
                      {lotesEmprendimiento.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Superficie total
                    </Typography>
                    <Typography variant="h6">
                      {emprendimiento.superficie_total_hectareas} ha
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Moneda
                    </Typography>
                    <Typography variant="h6">
                      {emprendimiento.moneda_principal}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Paso 2: Modificar en Excel
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Edita el archivo descargado con tus cambios de precios, estados y condiciones.
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600">
                Importante: No modifiques las columnas ID_Lote, Manzana y Numero_Lote.
              </Typography>
              <Typography variant="body2">
                Solo edita: Superficie, Precio, Lista de Precios, Estado y Observaciones.
              </Typography>
            </Alert>
            
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Una vez editado el archivo, súbelo aquí:
              </Typography>
              
              <input
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                id="upload-file"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="upload-file">
                <Button
                  variant="contained"
                  component="span"
                  size="large"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mt: 2 }}
                >
                  Subir Archivo Modificado
                </Button>
              </label>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && processing && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Procesando archivo...
              </Typography>
              <LinearProgress sx={{ mt: 2, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Detectando cambios y validando datos
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Paso 3: Revisar Cambios Detectados
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Se detectaron {cambiosDetectados.length} cambios. Revísalos antes de aplicar.
                </Typography>
                
                {cambiosDetectados.length > 0 && (
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Lote</strong></TableCell>
                          <TableCell><strong>Campo</strong></TableCell>
                          <TableCell><strong>Valor Anterior</strong></TableCell>
                          <TableCell><strong>Valor Nuevo</strong></TableCell>
                          <TableCell><strong>Tipo</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cambiosDetectados.map((cambio) => (
                          <TableRow key={cambio.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600">
                                {cambio.lote}
                              </Typography>
                            </TableCell>
                            <TableCell>{cambio.campo}</TableCell>
                            <TableCell>
                              <Chip 
                                label={cambio.valorAnterior} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={cambio.valorNuevo} 
                                size="small" 
                                color="primary"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={cambio.tipo} 
                                size="small"
                                color="info"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(1)}
                  >
                    Volver a Subir
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleConfirmarCambios}
                    disabled={processing}
                  >
                    Confirmar y Aplicar Cambios
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {processing && activeStep === 3 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" gutterBottom>
                Aplicando cambios...
              </Typography>
              <LinearProgress sx={{ mt: 2, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Actualizando lotes en el sistema
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notas Importantes sobre Edición Masiva
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Campos Editables:</strong>
                  <br />• Precio de cada lote individualmente
                  <br />• Lista de precios aplicada
                  <br />• Estado (Disponible, Reservado, Vendido, Bloqueado)
                  <br />• Observaciones específicas
                </Typography>
              </Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="warning">
                <Typography variant="body2">
                  <strong>Validaciones Automáticas:</strong>
                  <br />• Precios no pueden ser negativos
                  <br />• Estados deben ser válidos
                  <br />• No se pueden duplicar lotes
                  <br />• Formatos de medidas correctos
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </LoteParaTodosLayout>
  );
};

export default EdicionMasivaEmprendimiento;