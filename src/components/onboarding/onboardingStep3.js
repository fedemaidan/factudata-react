// OnboardingStep3.js
import React from 'react';
import { Box, Button, Typography } from '@mui/material';

const OnboardingStep3 = ({ estimatedPrice, onPreviousStep, onPay }) => {
  return (
    <Box>
      <Typography variant="h5">Paso 3: Presupuesto estimado</Typography>
      <Typography variant="body1">Presupuesto estimado: {estimatedPrice}</Typography>
      <Button onClick={onPreviousStep}>Volver</Button>
      <Button onClick={onPay}>Pagar 50%</Button>
    </Box>
  );
};

export default OnboardingStep3;
