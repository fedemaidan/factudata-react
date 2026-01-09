import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Stack,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Alert
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaById } from 'src/services/empresaService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import importMovimientosService from 'src/services/importMovimientosService';

// Componentes de cada paso
import PasoSubirCsv from 'src/sections/importMovimientos/PasoSubirCsv';
import PasoRevisarCategorias from 'src/sections/importMovimientos/PasoRevisarCategorias';
import PasoRevisarProveedores from 'src/sections/importMovimientos/PasoRevisarProveedores';
import PasoAclaracionesMovimientos from 'src/sections/importMovimientos/PasoAclaracionesMovimientos';
import PasoResumen from 'src/sections/importMovimientos/PasoResumen';

const steps = [
  'Subir archivo CSV',
  'Revisar Categorías',
  'Revisar Proveedores',
  'Aclaraciones',
  'Resumen y Confirmación'
];

const ImportMovimientosPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { empresaId } = router.query;

  const [activeStep, setActiveStep] = useState(0);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado del wizard
  const [wizardData, setWizardData] = useState({
    archivos: [],
    analisisCsv: null,
    proyectoSeleccionado: null,
    tipoImportacion: 'general', // 'general' o 'proyecto_especifico'
    mapeosCategorias: [],
    mapeosSubcategorias: [],
    mapeosProveedores: [],
    aclaracionesUsuario: '', // Instrucciones prioritarias para el prompt
    entidadesResueltas: null,
    resultadoFinal: null
  });

  useEffect(() => {
    const fetchEmpresaData = async () => {
      if (!empresaId) return;
      
      try {
        setLoading(true);
        const empresaData = await getEmpresaById(empresaId);
        const proyectos = await getProyectosByEmpresa(empresaData);
        
        setEmpresa({
          ...empresaData,
          proyectos: proyectos
        });
      } catch (error) {
        console.error('Error cargando datos de empresa:', error);
        setError('Error cargando datos de la empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresaData();
  }, [empresaId]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleCancel = () => {
    router.push(`/empresa?empresaId=${empresaId}`);
  };

  const updateWizardData = (stepData) => {
    setWizardData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <PasoSubirCsv
            empresa={empresa}
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            setLoading={setLoading}
            setError={setError}
          />
        );
      case 1:
        return (
          <PasoRevisarCategorias
            empresa={empresa}
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
            setLoading={setLoading}
            setError={setError}
          />
        );
      case 2:
        return (
          <PasoRevisarProveedores
            empresa={empresa}
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
            setLoading={setLoading}
            setError={setError}
          />
        );
      case 3:
        return (
          <PasoAclaracionesMovimientos
            empresa={empresa}
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onNext={handleNext}
            onBack={handleBack}
            setLoading={setLoading}
            setError={setError}
          />
        );
      case 4:
        return (
          <PasoResumen
            empresa={empresa}
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            onFinish={() => {
              // Al finalizar exitosamente, regresar a empresa
              router.push(`/empresa?empresaId=${empresaId}`);
            }}
            onBack={handleBack}
            setLoading={setLoading}
            setError={setError}
          />
        );
      default:
        return <Typography>Paso desconocido</Typography>;
    }
  };

  if (loading && !empresa) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Cargando datos de la empresa...</Typography>
      </Box>
    );
  }

  if (!empresa) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">No se pudo cargar la empresa</Typography>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Importar Movimientos - {empresa.nombre}</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 8
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={3}>
            {/* Header */}
            <Box>
              <Typography variant="h4" gutterBottom>
                Importar Movimientos desde CSV
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {empresa.nombre}
              </Typography>
            </Box>

            {/* Stepper */}
            <Paper sx={{ p: 3 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Step Content */}
            <Paper sx={{ p: 3, minHeight: '60vh' }}>
              {renderStepContent()}
            </Paper>

            {/* Navigation Buttons */}
            <Box display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleCancel}
              >
                Cancelar y Volver
              </Button>
              
              {loading && (
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Procesando...
                </Typography>
              )}
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

ImportMovimientosPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default ImportMovimientosPage;