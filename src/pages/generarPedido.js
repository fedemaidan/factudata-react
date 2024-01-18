import React, { useState, useEffect } from 'react';
import { Container, Grid, Stack, Snackbar, Alert } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import OnboardingStep1 from 'src/components/onboarding/onboardingStep1';
import OnboardingStep2 from 'src/components/onboarding/onboardingStep2';
import OnboardingStep3 from 'src/components/onboarding/onboardingStep3';
import ticketService from 'src/services/ticketService';
import workTypeService from 'src/services/workTypeService';
import {getFacturasByTicketId} from 'src/services/facturasService';
import { useRouter } from 'next/router';
import { useAuthContext } from 'src/contexts/auth-context';


const GenerarPedidoPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [fileType, setFileType] = useState('');
  const [compatibleType, setCompatibleType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedTagsData, setSelectedTagsData] = useState([]);
  const [reason, setReason] = useState('');
  const [extractionMethod, setExtractionMethod] = useState('manual'); // 'manual' o 'excel'
  const [excelFileModel, setExcelFileModel] = useState(null);
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
      setCompatibleType(data.compatibleType);
      setSelectedTagsData(workTypeService.getTags(data.fileType, data.compatibleType));
      if (data.fileType == 'comprobantes_compatibles_con' && data.compatibleType != 'Otros') {
        setActiveStep(3);
      }
    } else if (activeStep === 2) {
      setSelectedTagsData(data.tags);
      setReason(data.reason);
      setExtractionMethod(data.extractionMethod)
      setExcelFileModel(data.excelFileModel)
    }
  };

  const handleRemoveFile = (fileToRemove) => {
    setFiles((prevFiles) => prevFiles.filter(file => file !== fileToRemove));
  };
  
  const handleConfirmNewFiles = (newFiles) => {
    setFiles(prevSelectedFiles => [...prevSelectedFiles, ...newFiles]);
  };

  const fetchTicketProgress = async (id) => {
    // if (isLoading) {
      // Obtener el ticket actual
      const archivos = await getFacturasByTicketId(id);
      
      if (archivos) {
        // Calcular el progreso de carga
        const totalFiles = files.length;
        const uploadedFiles = archivos.length;
        const progress = (uploadedFiles / totalFiles) * 100;
        
        // Actualizar el estado de progreso de carga
        setUploadProgress(progress);
        
      // }
    }
  };


  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handleSave = async () => {
    setIsLoading(true);

      try {
        const ticketData = {
          tipo: fileType, 
          tags: selectedTagsData,
          archivos: files,
          userId: user.id,
          userEmail: user.email,
          reason: reason,
          excelFileModel: excelFileModel,
          extractionMethod: extractionMethod,
          compatibleType: compatibleType
        };
        
        let ticketCreationResult = await ticketService.createTicket(ticketData);
        
        const interval = setInterval(() => {
          fetchTicketProgress(ticketCreationResult.id);
        }, 4000);

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
                fileType={fileType}
                onPreviousStep={handlePreviousStep}
                onNextStep={handleNextStep}
              />
            )}
            {activeStep === 3 && (
              <OnboardingStep3
                selectedFiles={files}
                fileType={fileType}
                selectedTags={selectedTagsData}
                excelFileModel={excelFileModel}
                extractionMethod={extractionMethod}
                onPreviousStep={handlePreviousStep}
                compatibleType={compatibleType}
                eta={ticketService.calcularEta(files.length)}
                onSave={handleSave}
                isLoading={isLoading}
                progress={uploadProgress}
                onRemoveFile={handleRemoveFile}
                onConfirmNewFiles={handleConfirmNewFiles}
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
