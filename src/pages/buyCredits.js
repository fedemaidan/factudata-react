// pages/buyCredits.js

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import PricingCard from 'src/components/pricingCard';

const BuyCreditsPage = () => {
  const router = useRouter();
  const [creditQuantity, setCreditQuantity] = useState(0);
  
  useEffect(() => {
    if (router.query.credits) {
      setCreditQuantity(parseInt(router.query.credits));
    }
  }, [router.query.credits]);

  const packages = [
    { name: 'Paquete a medida', pricePerCredit: 60, totalCredits: creditQuantity, totalPrice: creditQuantity * 60 },
    { name: 'Sorby Independiente', pricePerCredit: 50, totalCredits: 400, totalPrice: 20000 },
    { name: 'Sorby Avanzado', pricePerCredit: 40, totalCredits: 2500, totalPrice: 100000 },
    { name: 'Sorby Pro', pricePerCredit: 35, totalCredits: 6000, totalPrice: 210000 }
  ];

  const handleBuy = (packageName) => {
    // Implement your buy logic here
    console.log(`Buying package: ${packageName}`);
  };

  return (
    <Box sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom align="center">
        Costos del Servicio
      </Typography>
      <Typography variant="subtitle1" gutterBottom align="center">
        <strong>Hay un paquete pensado para la etapa profesional en la que te encontrás: elegilo.</strong>
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {packages.map((pkg) => (
      
          <Card key={pkg.name} sx={{ maxWidth: 200, m: 2 }}>
            <PricingCard 
              name={pkg.name}
              totalPrice={pkg.totalPrice}
              totalCredits={pkg.totalCredits}
              pricePerCredit={pkg.pricePerCredit}
              />
          </Card>
        ))}
      </Box>
    </Box>
  );
};

BuyCreditsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default BuyCreditsPage;
