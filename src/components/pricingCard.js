import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Button, Stack, SvgIcon } from '@mui/material';

const CheckIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
  </SvgIcon>
);

export default function PricingCard({pricePerCredit, name, totalCredits, totalPrice}) {
    const formattedPrice = totalPrice.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,  // No mostrar decimales
    maximumFractionDigits: 0   // No mostrar decimales
  });
    
  return (
    <Card elevation={1} sx={{ borderRadius: '12px', width: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6">{name}</Typography>
          
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h4">{totalCredits}</Typography>
            <Typography variant="subtitle2">creditos</Typography>
          </Box>
        <Box>
        <Divider sx={{ my: 2 }} />
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center">
              <CheckIcon color="success" fontSize="medium" />
              <Typography variant="body2">Pagas ${pricePerCredit} por factura</Typography>
            </Stack>
          </Stack>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" color="primary" fullWidth>
              Contratalo por {formattedPrice}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
