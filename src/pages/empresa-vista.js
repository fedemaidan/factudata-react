import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Container, Stack, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import activacionRetencionService from 'src/services/activacionRetencionService';
import {
  EmpresaHeader,
  OnboardingSection,
  UsuariosTable,
  MetricasWASection,
  CadenaPostVentaSection,
  AccionesSection,
} from 'src/sections/activacion-retencion/empresa-vista';

const EmpresaVistaPage = () => {
  const router = useRouter();
  const { empresaId } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarDatos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await activacionRetencionService.getVistaCompleta(empresaId);
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleRecalcular = async () => {
    try {
      await activacionRetencionService.recalcular(empresaId);
      cargarDatos();
    } catch (err) {
      console.error('Error recalculando:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Vista Empresa | Sorbydata</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton onClick={() => router.push('/activacion-retencion')}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4">Vista Empresa</Typography>
            </Stack>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {!loading && data && (
              <Stack spacing={3}>
                <EmpresaHeader data={data} />
                <OnboardingSection onboarding={data.onboarding} />
                <UsuariosTable usuarios={data.onboarding?.usuarios} />
                <MetricasWASection metricas={data.metricasWA} />
                <CadenaPostVentaSection cadena={data.cadenaPostVenta} />
                <AccionesSection empresaId={empresaId} onRecalcular={handleRecalcular} />
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EmpresaVistaPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default EmpresaVistaPage;
