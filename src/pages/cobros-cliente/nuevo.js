/**
 * DEPRECADO como page propia — el alta de cobro ahora vive en un drawer dentro
 * de /cobros-cliente. Esta ruta redirige (abre el drawer).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';

const Page = () => {
  const router = useRouter();
  const { cliente } = router.query;
  useEffect(() => {
    router.replace(`/cobros-cliente?nuevo=1${cliente ? `&cliente=${cliente}` : ''}`);
  }, [cliente, router]);
  return (
    <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );
};

export default Page;
