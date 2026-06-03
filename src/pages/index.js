import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CircularProgress, Container } from '@mui/material';
import VistaResumen from 'src/pages/vistaResumen';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

const Page = () => {
  const router = useRouter();
  const { user, authReady } = useAuthContext();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    (async () => {
      const empresa = await getEmpresaDetailsFromUser(user);
      if (!active) return;
      if (empresa?.vertical === 'corralon') {
        router.replace('/dashboard-corralon');
      } else {
        setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authReady, user, router]);

  if (checking) {
    return (
      <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return <VistaResumen />;
};

Page.getLayout = VistaResumen.getLayout;

export default Page;
