import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import TicketInfo from 'src/components/ticketInfo';

const OnboardingStep3 = ({ estimatedPrice, selectedTags, selectedFiles, fileType, onPreviousStep, onPay, isLoading }) => {
  return (
    <Box>
      <TicketInfo
        estimatedPrice={estimatedPrice}
        selectedTags={selectedTags}
        selectedFiles={selectedFiles}
        fileType={fileType}
        status="Confirmación pendiente"
      />
      <Button onClick={onPreviousStep}>Volver</Button>
      <Button onClick={onPay} disabled={isLoading}>Confirmar Pedido</Button>
      {isLoading && <CircularProgress />}
    </Box>
  );
};

export default OnboardingStep3;
