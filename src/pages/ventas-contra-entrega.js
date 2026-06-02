/**
 * DEPRECADO — la venta contra entrega se unificó en /ventas (vertical corralón).
 * Esta page solo redirige para no romper links viejos.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ventas');
  }, [router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
