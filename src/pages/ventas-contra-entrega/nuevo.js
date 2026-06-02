/**
 * DEPRECADO — usar /ventas/nuevo (flujo unificado de ventas). Redirige.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ventas/nuevo');
  }, [router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
