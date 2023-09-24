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

  const recomendedAndPricingRange = [
    {min: 0, max: 400, recommendedId: 2, pricePerCredit: 60},
    {min: 401, max: 2500, recommendedId: 3, pricePerCredit: 50},
    {min: 2501, max: 6000, recommendedId: 4, pricePerCredit: 40},
    {min: 6000, max: 999999, recommendedId: 1, pricePerCredit: 35},
  ]

  const dataForPackages = recomendedAndPricingRange.find((element) => 
       element.min <= creditQuantity && creditQuantity <= element.max
      )

  const defaultPackages = [
    { id: 1, name: 'Paquete a medida', pricePerCredit: dataForPackages.pricePerCredit, totalCredits: creditQuantity, totalPrice: creditQuantity * dataForPackages.pricePerCredit, recommended: dataForPackages.recommendedId == 1 ? true: false },
    { id: 2, name: 'Sorby Independiente', pricePerCredit: 50, totalCredits: 400, totalPrice: 20000, recommended: dataForPackages.recommendedId == 2 ? true: false },
    { id: 3, name: 'Sorby Avanzado', pricePerCredit: 40, totalCredits: 2500, totalPrice: 100000, recommended: dataForPackages.recommendedId == 3 ? true: false },
    { id: 4, name: 'Sorby Pro', pricePerCredit: 35, totalCredits: 6000, totalPrice: 210000, recommended: dataForPackages.recommendedId == 4 ? true: false }
  ];

  const packages = defaultPackages.filter((p) => p.totalCredits >= creditQuantity);

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
              recommended={pkg.recommended}
              />
          </Card>
        ))}
      </Box>
    </Box>
  );
};

BuyCreditsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default BuyCreditsPage;
