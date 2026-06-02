/**
 * DEPRECADO como page propia — la creación de ventas ahora vive en un drawer
 * dentro de /ventas (más ágil, no saca al usuario de la lista).
 * Esta ruta solo redirige abriendo el drawer.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/ventas?nueva=1');
  }, [router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
