import React from 'react';
import { Box, Button, CircularProgress, Backdrop } from '@mui/material';
import TicketInfo from 'src/components/ticketInfo';

const OnboardingStep3 = ({ estimatedPrice, selectedTags, selectedFiles, fileType, onPreviousStep, onSave, isLoading, progress,onRemoveFile, onConfirmNewFiles }) => {
  return (
    <Box>
      <TicketInfo
        estimatedPrice={estimatedPrice}
        selectedTags={selectedTags}
        selectedFiles={selectedFiles}
        fileType={fileType}
        status="Borrador"
        onConfirmNewFiles={onConfirmNewFiles}
        onRemoveFile={onRemoveFile}
      />
      <Button onClick={onPreviousStep}>Volver</Button>
      <Button onClick={onSave} disabled={isLoading}>Guardar solicitud</Button>
      {isLoading && (
        <Backdrop open={isLoading}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
        <div>Este proceso puede demorar. Porcentaje de completitud: </div>
          <div>{`${Math.round(progress)}%`}</div>
      </Backdrop>
      )}
    </Box>
  );
};

export default OnboardingStep3;
