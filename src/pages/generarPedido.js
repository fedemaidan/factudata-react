import React, { useState } from 'react';
import { Container, Grid, Stack, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import OnboardingStep1 from 'src/components/onboarding/onboardingStep1';
import OnboardingStep2 from 'src/components/onboarding/onboardingStep2';
import OnboardingStep3 from 'src/components/onboarding/onboardingStep3';

const GenerarPedidoPage = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [fileType, setFileType] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedTagsData, setSelectedTagsData] = useState([]);
  const [reason, setReason] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [rowAmountType, setRowAmountType] = useState('exact');
  const [rowAmount, setRowAmount] = useState('');

  const handleNextStep = (data) => {
    setActiveStep(activeStep + 1);
    if (activeStep === 1) {
      setFileType(data.fileType);
      setFiles(data.selectedFiles)
    } else if (activeStep === 2) {
      setSelectedTagsData(data.tags);
      setReason(data.reason);
      setRowAmount(data.rowValue);
      setRowAmountType(data.rowOption);
      console.log(data)
      if (data.rowOption == 'exact') {
        const price = data.tags.length * data.rowValue * files.length * 50;
        setEstimatedPrice(`$${price}`);
      } 
    }
  };

  const handlePreviousStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handlePay = () => {
    // Handle the payment process here
    alert(`You clicked Pay, the estimated price is: ${estimatedPrice}`);
  };

  return (
    <Container maxWidth="sm">
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
                rowAmountType={rowAmountType}
                rowAmount={rowAmount}
              />
            )}
            {activeStep === 3 && (
              <OnboardingStep3
                estimatedPrice={estimatedPrice}
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
