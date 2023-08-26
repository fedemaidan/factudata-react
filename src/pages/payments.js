import React from 'react';
import { Container, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import PaymentComponent from 'src/components/paymentComponent'; 
import { useRouter } from 'next/router';


const PaymentPage = () => {

  const router = useRouter();
  const { ticketId } = router.query; 
  
  return (
    <Container maxWidth="md">
      <PaymentComponent ticketId={ticketId} /> 
    </Container>
  );
};

PaymentPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default PaymentPage;
