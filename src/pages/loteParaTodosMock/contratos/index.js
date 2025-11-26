import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function ContratosRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/loteParaTodosMock/clientes');
  }, [router]);

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2
      }}
    >
      <CircularProgress color="primary" />
      <Typography variant="h6">
        Redirigiendo al módulo Clientes & Contratos...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        El listado de contratos ahora se administra desde Clientes.
      </Typography>
    </Box>
  );
}
