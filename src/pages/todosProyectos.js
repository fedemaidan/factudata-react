import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';

// "Todos los movimientos" fue unificado dentro de /cajas. Esta página redirige
// para mantener los bookmarks que tenían los usuarios y mostrar el aviso de
// integración en Caja (vista=todos).
const TodosProyectosPage = () => {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const { empresaId } = router.query;
    const params = new URLSearchParams();
    if (empresaId) params.set('empresaId', String(empresaId));
    params.set('vista', 'todos');
    router.replace(`/cajas?${params.toString()}`);
  }, [router.isReady]);

  return (
    <DashboardLayout>
      <Head><title>Redirigiendo a Caja...</title></Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Todos los movimientos ahora está integrado dentro de Caja...
        </Typography>
      </Box>
    </DashboardLayout>
  );
};

export default TodosProyectosPage;
