import React, { useState } from 'react';
import { Box, Typography, Divider, Button, Input, Stack } from '@mui/material';
import { CircularProgress } from '@mui/material';

const PaymentComponent = ({ paymentValue, creditAmount,onPaymentConfirm }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("Ningún archivo seleccionado");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "Ningún archivo seleccionado");
  };

  const handleConfirm = async () => {
    setLoading(true);  
    await onPaymentConfirm(parseInt(paymentValue), parseInt(creditAmount), file);
    setLoading(false);  
  };

  return (
    <Box mt={4}>
      <Typography variant="h6">Realizar Pago</Typography>
      <Divider sx={{ my: 2 }} />

      <Typography variant="body1">
        Por favor, realiza una transferencia bancaria con los siguientes datos:
      </Typography>
      
      <Box mt={2}>
        <Typography variant="subtitle1">Banco: BANCO HSBC</Typography>
        <Typography variant="subtitle1">CBU: 1500691400069166131300</Typography>
        <Typography variant="subtitle1">Alias: TIENTO.BOLSA.POZO</Typography>
        <Typography variant="subtitle1">Titular de la cuenta: FACUNDO JAVIER FERRO</Typography>
      </Box>

      <Typography variant="body1" mt={2}>
        Subí el comprobante de tu pago de ${paymentValue} por {creditAmount} créditos
      </Typography>

      <Box mt={2}>
        <Stack spacing={2}>
          <input
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            id="contained-button-file"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="contained-button-file">
            <Button variant="contained" component="span" color="primary">
              Seleccionar Archivo
            </Button>
          </label>
          <Typography variant="body2" color="textSecondary">{fileName}</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            disabled={!file || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Confirmar Operación"}          
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default PaymentComponent;
