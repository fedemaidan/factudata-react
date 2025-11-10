// src/pages/loteParaTodosMock/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoteParaTodosMockIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir automáticamente al dashboard
    router.replace('/loteParaTodosMock/dashboard');
  }, [router]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 2
      }}
    >
      <CircularProgress />
      <Typography variant="h6" color="text.secondary">
        Cargando Lote Para Todos...
      </Typography>
    </Box>
  );
}