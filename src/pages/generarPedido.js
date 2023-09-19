import React, { useState, useEffect } from 'react';
import { Container, Grid, Stack, Snackbar, Alert } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import OnboardingStep1 from 'src/components/onboarding/onboardingStep1';
import OnboardingStep2 from 'src/components/onboarding/onboardingStep2';
import OnboardingStep3 from 'src/components/onboarding/onboardingStep3';
import ticketService from 'src/services/ticketService';
import {getFacturasByTicketId} from 'src/services/facturasService';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';


const GenerarPedidoPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [fileType, setFileType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedTagsData, setSelectedTagsData] = useState([]);
  const [reason, setReason] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // Puedes usar 'error' para errores
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { user } = useAuthContext();
  
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
    
    let result;
    let creditoRestante = cantidad - user.credit;

    if (creditoRestante < 20)
      {result = "Puedes utilizar la prueba gratuita";}
    else if (creditoRestante < 400)
      {result = "$20.000 - Plan Inicial";}
    else if (creditoRestante < 2500)
     { result = "$100.000 - Plan emprendedor";}
    else if (creditoRestante < 6000)
     { result = "$210.000 - Plan empresa";}
    else {
      result = "$35 por factura - Plan empresa plus";
    }
    
    return result;
  }

  const fetchTicketProgress = async (id) => {
    console.log("te boludeo con id", id);
    if (isLoading) {
      // Obtener el ticket actual
      const archivos = await getFacturasByTicketId(id);
      console.log("archivos", archivos)
      if (archivos) {
        // Calcular el progreso de carga
        const totalFiles = files.length;
        const uploadedFiles = archivos.length;
        const progress = (uploadedFiles / totalFiles) * 100;
        
        // Actualizar el estado de progreso de carga
        setUploadProgress(progress);
        
        if (progress < 100) {
          const interval = setInterval(() => {
            fetchTicketProgress(id);
          }, 4000);
      
        }
        
      }
    }
  };


  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handlePay = async () => {
    setIsLoading(true);

      try {
        const ticketData = {
          tipo: fileType, 
          tags: selectedTagsData,
          precioEstimado: estimatedPrice,
          archivos: files,
          userId: user.id
        };
  
        let ticketCreationResult = await ticketService.createTicket(ticketData);
        fetchTicketProgress(ticketCreationResult.id);
        console.log("aaaaaa")
        console.log("estos archivos", files)
        await ticketService.finishTicketWithFiles(ticketCreationResult.id, ticketData);
        
        
        if (ticketCreationResult) {
          setSnackbarSeverity('success');
          setSnackbarMessage('Ticket creado exitosamente');
          setSnackbarOpen(true);
          router.push(`/ticketDetails?ticketId=${ticketCreationResult.id}`);
        } else {
          setSnackbarSeverity('error');
          setSnackbarMessage('Error al crear el ticket');
          setSnackbarOpen(true);
        }
      } catch (error) {
        console.error('Error:', error);
        setSnackbarSeverity('error');
        setSnackbarMessage('Ocurrió un error al intentar crear el ticket');
        setSnackbarOpen(true);
      } finally {
        setIsLoading(false);
      }

  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const updateUploadProgress = (progress) => {
    setUploadProgress(progress);
  };

  return (
    <Container maxWidth="md">
      <Grid container spacing={3}>
        {/* Primera columna que ocupa 2 tercios */}
        <Grid item xs={12}>
          <Stack spacing={3}>
            {activeStep === 1 && <OnboardingStep1 onNextStep={handleNextStep} />}
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
                isLoading={isLoading}
                progress={uploadProgress}
              />
            )}
          </Stack>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
      >
        <Alert severity={snackbarSeverity} onClose={handleCloseSnackbar}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

GenerarPedidoPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default GenerarPedidoPage;
