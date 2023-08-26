import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

const PaymentComponent = ({ticketId}) => {
  return (
    <Box mt={4}>
      <Typography variant="h6">Realizar Pago</Typography>
      <Divider sx={{ my: 2 }} />

      <Typography variant="body1">
        Por favor, realiza una transferencia bancaria con los siguientes datos:
      </Typography>

      <Box mt={2}>
        <Typography variant="subtitle1">Banco: Banco Ejemplo</Typography>
        <Typography variant="subtitle1">Número de cuenta: 1234-5678-9012-3456</Typography>
        <Typography variant="subtitle1">Titular de la cuenta: Nombre Apellido</Typography>
      </Box>

      <Typography variant="body1" mt={2}>
        Una vez realizada la transferencia, por favor envía el comprobante a contacto@tusitio.com
        para confirmar tu pago con una referencia al ticket: {ticketId}
      </Typography>
    </Box>
  );
};

export default PaymentComponent;
