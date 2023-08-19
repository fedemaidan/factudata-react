import React, { useState } from 'react';
import { Container, Grid, Stack, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import OnboardingStep1 from 'src/components/onboarding/onboardingStep1';
import OnboardingStep2 from 'src/components/onboarding/onboardingStep2';
import OnboardingStep3 from 'src/components/onboarding/onboardingStep3';
import ticketService from 'src/services/ticketService';


const GenerarPedidoPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [fileType, setFileType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedTagsData, setSelectedTagsData] = useState([]);
  const [reason, setReason] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');

  const handleNextStep = (data) => {
    setActiveStep(activeStep + 1);
    if (activeStep === 1) {
      setFileType(data.fileType);
      setFiles(data.selectedFiles);
    } else if (activeStep === 2) {
      setSelectedTagsData(data.tags);
      setReason(data.reason);
      const price = data.tags.length * files.length * 50;
      setEstimatedPrice(`$${price}`);
    }
  };

  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handlePay = async () => {

      try {
        // 1. Generar ticket
        const ticketData = {
          tipo: fileType, // Ejemplo de tipo de ticket
          tags: selectedTagsData,
          precioEstimado: estimatedPrice,
          archivos: files
        };
  
        const ticketCreationResult = await ticketService.createTicket(ticketData);
        
        if (ticketCreationResult) {
          alert('Ticket creado exitosamente');
        } else {
          alert('Error al crear el ticket');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al intentar crear el ticket');
      }

    /*
      1. Generar ticket.
        - tipo
        - tags
        - precio_estimado
      2. Crear facturas asociadas al ticket
        - crear las facturas y tengan el ticket asociado
      3. agregar links a las facturas al ticket
    */
  };

  return (
    <Container maxWidth="md">
      <Grid container spacing={3}>
        {/* Primera columna que ocupa 2 tercios */}
        <Grid item xs={12}>
          <Stack spacing={3}>
            {activeStep === 1 && (
              <OnboardingStep1 onNextStep={handleNextStep} />
            )}
            {activeStep === 2 && (
              <OnboardingStep2
                selectedTagsData={selectedTagsData}
                reason={reason}
                onPreviousStep={handlePreviousStep}
                onNextStep={handleNextStep}
                />
            )}
            {activeStep === 3 && (
              <OnboardingStep3
                estimatedPrice={estimatedPrice}
                selectedFiles={files}
                fileType={fileType}
                selectedTags={selectedTagsData}
                onPreviousStep={handlePreviousStep}
                onPay={handlePay}
              />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
};

GenerarPedidoPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default GenerarPedidoPage;
