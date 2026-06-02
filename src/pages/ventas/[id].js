/**
 * DEPRECADO como page propia — el detalle de venta ahora se muestra en un drawer
 * dentro de /ventas. Esta ruta redirige abriendo ese drawer (deep-link).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  useEffect(() => {
    if (id) router.replace(`/ventas?venta=${id}`);
  }, [id, router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
