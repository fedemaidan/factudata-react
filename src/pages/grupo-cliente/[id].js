/**
 * DEPRECADO como page propia — el detalle del titular ahora se muestra en un
 * drawer dentro de /grupos-cliente. Esta ruta redirige (deep-link).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  useEffect(() => {
    if (id) router.replace(`/grupos-cliente?grupo=${id}`);
  }, [id, router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
