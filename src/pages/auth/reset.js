import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { clearAllBrowserStorage } from 'src/utils/clearBrowserStorage';

const ResetPage = () => {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Limpiar lo crítico de forma síncrona (no puede colgar)
    try { localStorage.clear(); } catch (_) {}
    try { sessionStorage.clear(); } catch (_) {}

    // Lanzar limpieza profunda en background (IndexedDB puede tardar en Safari)
    clearAllBrowserStorage().catch(() => {});

    // Redirigir sin esperar la limpieza profunda
    router.replace('/auth/login');
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Limpiando sesión…
      </Typography>
    </Box>
  );
};

export default ResetPage;
