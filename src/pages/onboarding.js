import React, { useState } from 'react';
import { Container, Stepper, Step, StepLabel, Box, Typography, Grid, Paper } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StepNombre from 'src/sections/onboarding/stepNombre';
import StepProyectos from 'src/sections/onboarding/stepProyectos';
// import StepCategorias from 'src/sections/onboarding/stepCategorias';
import StepProveedores from 'src/sections/onboarding/stepProveedores';
import ReviewStep from 'src/sections/onboarding/reviewStep';
import OnboardingPreview from 'src/sections/onboarding/onboardingPreview';
import { useAuthContext } from 'src/contexts/auth-context';

const OnboardingPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const { user } = useAuthContext();
  const [formData, setFormData] = useState({
    empresa: {},
    proyectos: [],
    proveedores: []
  });

  const steps = ['Crear Empresa', 'Crear Proyectos', 'Crear Proveedores', 'Revisión'];

  const handleNext = () => setActiveStep((prevStep) => prevStep + 1);
  const handleBack = () => setActiveStep((prevStep) => prevStep - 1);
  const handleDataChange = (stepData) => {
    const newFormData = {
        nombre: stepData.nombre ?? formData.nombre,
        proyectos: stepData.proyectos ? formData.proyectos.concat(stepData.proyectos) : formData.proyectos,
        proveedores: stepData.proveedores ? formData.proveedores.concat(stepData.proveedores) : formData.proveedores,
    }
    console.log(newFormData)
    setFormData(newFormData);
  };

  const handleDelete = (type, index) => {
    const newFormData = { ...formData };
    if (type === 'proyecto') {
      newFormData.proyectos.splice(index, 1);
    } else if (type === 'proveedor') {
      newFormData.proveedores.splice(index, 1);
    }
    setFormData(newFormData);
  };


  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return <StepNombre handleNext={handleNext} handleDataChange={handleDataChange} />;
      case 1:
        return <StepProyectos handleNext={handleNext} handleBack={handleBack} handleDataChange={handleDataChange} />;
      case 2:
        return <StepProveedores handleNext={handleNext} handleBack={handleBack} handleDataChange={handleDataChange} />;
      case 3:
        return <ReviewStep formData={formData} handleBack={handleBack}/>;
      default:
        return <Typography variant="h6">Paso desconocido</Typography>;
    }
  };

  return (
    <Container>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box mt={3}>
        {activeStep === steps.length - 1 ? (
          <ReviewStep formData={formData} handleBack={handleBack} handleDelete={handleDelete} />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {renderStepContent(activeStep)}
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3}>
                <OnboardingPreview formData={formData} handleDelete={handleDelete} />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
};

OnboardingPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default OnboardingPage;
