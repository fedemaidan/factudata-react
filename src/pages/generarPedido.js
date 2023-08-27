import React, { useState } from 'react';
import { Container, Grid, Stack } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import OnboardingStep1 from 'src/components/onboarding/onboardingStep1';
import OnboardingStep2 from 'src/components/onboarding/onboardingStep2';
import OnboardingStep3 from 'src/components/onboarding/onboardingStep3';
import ticketService from 'src/services/ticketService';
import { useRouter } from 'next/router';


const GenerarPedidoPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [fileType, setFileType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedTagsData, setSelectedTagsData] = useState([]);
  const [reason, setReason] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const router = useRouter();

  const handleNextStep = (data) => {
    setActiveStep(activeStep + 1);
    if (activeStep === 1) {
      setFileType(data.fileType);
      setFiles(data.selectedFiles);
    } else if (activeStep === 2) {
      setSelectedTagsData(data.tags);
      setReason(data.reason);
      const paquete = recomendarPaquete(files.length);
      setEstimatedPrice(paquete);
    }
  };

  const recomendarPaquete = (cantidad) => {
    console.log(cantidad)
    let result;
    if (cantidad < 20)
      {result = "Puedes utilizar la prueba gratuita";}
    else if (cantidad < 400)
      {result = "$20.000 - Plan Inicial";}
    else if (cantidad < 2500)
     { result = "$100.000 - Plan emprendedor"; }
    else if (cantidad < 6000)
     { result = "$210.000 - Plan empresa";}
    else {
      result = "$35 por factura - Plan empresa plus"; 
    }
    console.log(result)
    return result;
  }

  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handlePay = async () => {

      try {
        const ticketData = {
          tipo: fileType, 
          tags: selectedTagsData,
          precioEstimado: estimatedPrice,
          archivos: files
        };
  
        const ticketCreationResult = await ticketService.createTicket(ticketData);
        
        if (ticketCreationResult) {
          alert('Ticket creado exitosamente');
          router.push(`/ticketDetails?ticketId=${ticketCreationResult.id}`);
        } else {
          alert('Error al crear el ticket');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al intentar crear el ticket');
      }

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
