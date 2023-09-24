import React from 'react';
import { Container, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import PaymentComponent from 'src/components/paymentComponent'; 
import { useRouter } from 'next/router';
import { addCreditsForUser } from 'src/services/creditService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useAuth } from 'src/hooks/use-auth';



const PaymentPage = () => {

  const router = useRouter();
  const { paymentValue, creditAmount, ticketId } = router.query; 
  const { user } = useAuthContext();
  const auth = useAuth();
  const handlePaymentConfirm = async (payment, credit, selectedFile) => {
    await addCreditsForUser(user.id,credit, payment, selectedFile);
    await auth.refreshUser(user);
    
    if (ticketId)
      router.push('/ticketDetails?ticketId='+ticketId)
    else
      router.push('/creditos')
  };

  return (
    <Container maxWidth="md">
      <PaymentComponent 
        paymentValue={paymentValue}
        creditAmount={creditAmount}
        onPaymentConfirm={handlePaymentConfirm}
      /> 
    </Container>
  );
};

PaymentPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default PaymentPage;
