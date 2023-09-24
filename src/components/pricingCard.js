import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Button, Stack, SvgIcon } from '@mui/material';
import { textAlign } from '@mui/system';

const CheckIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
  </SvgIcon>
);

export default function PricingCard({ onSelectedPayment, pricePerCredit, name, totalCredits, totalPrice, recommended = false }) {
  const formattedPrice = totalPrice.toLocaleString('es-AR', {
    // style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const handleButtonClick = () => {
    if (onSelectedPayment) {
      onSelectedPayment(formattedPrice, totalCredits);
    }
  };

  return (
    <Card elevation={recommended ? 3 : 1} sx={{ borderRadius: '12px', width: '100%', position: 'relative' }}>
      {recommended && (
        <Box sx={{ width: '100%', textAlign: 'center', position: 'absolute', top: 0, right: 0, backgroundColor: 'primary.main', color: 'white', padding: 1, borderTopRightRadius: '12px' }}>
          <Typography variant="subtitle2">Recomendado para vos</Typography>
        </Box>
      )}
      <CardContent>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6">{name}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h4">{totalCredits}</Typography>
          <Typography variant="subtitle2" sx={{ marginLeft: 1 }}>creditos</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center">
            <CheckIcon color="success" fontSize="medium" />
            <Typography variant="body2">Pagas ${pricePerCredit} por factura</Typography>
          </Stack>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Button variant={recommended ? 'contained' : 'outlined'} color="primary" fullWidth onClick={handleButtonClick}>
            Contratalo por ${formattedPrice}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
