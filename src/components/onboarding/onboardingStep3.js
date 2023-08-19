import React from 'react';
import { Box, Button  } from '@mui/material';
import TicketInfo from 'src/components/ticketInfo';

const OnboardingStep3 = ({ estimatedPrice, selectedTags, selectedFiles, fileType, onPreviousStep, onPay }) => {
  
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
      <Button onClick={onPay}>Confirmar Pedido</Button>
    </Box>
  );
};

export default OnboardingStep3;

