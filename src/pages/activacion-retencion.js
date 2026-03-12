import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
  Alert,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import activacionRetencionService from 'src/services/activacionRetencionService';

// ─── Helpers ──────────────────────────────────────────────────────

const ESTADO_CONFIG = {
  en_riesgo: { label: '🔴 En Riesgo', color: 'error', order: 0 },
  inactivo: { label: '💤 Inactivo', color: 'warning', order: 1 },
  churneado: { label: '❌ Churneado', color: 'error', order: 2 },
  onboarding: { label: '📦 Onboarding', color: 'info', order: 3 },
  activo: { label: '✅ Activo', color: 'success', order: 4 },
};

function formatPercent(v) {
  if (v == null) return '-';
  return `${Math.round(v * 100)}%`;
}

// ─── Tarjeta de empresa ──────────────────────────────────────────

const EmpresaCard = ({ empresa, onClick }) => {
  const config = ESTADO_CONFIG[empresa.estado] || { label: empresa.estado, color: 'default' };
  const score = empresa.metricas?.scoreOnboarding;
  const diasSinUso = empresa.metricas?.diasSinUso;

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {empresa.empresaId}
              </Typography>
              <Chip
                label={config.label}
                color={config.color}
                size="small"
              />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Score: {formatPercent(score)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {diasSinUso != null ? `${diasSinUso}d sin uso` : ''}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

// ─── Página principal ────────────────────────────────────────────

const ActivacionRetencionPage = () => {
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const response = await activacionRetencionService.getDashboard();
        setEmpresas(response.data || []);
      } catch (err) {
        setError(err.message || 'Error cargando dashboard');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const enRiesgo = empresas.filter(e =>
    e.estado === 'en_riesgo' || e.estado === 'inactivo' || e.estado === 'churneado'
  ).sort((a, b) => (ESTADO_CONFIG[a.estado]?.order ?? 5) - (ESTADO_CONFIG[b.estado]?.order ?? 5));

  const enOnboarding = empresas.filter(e => e.estado === 'onboarding');

  const activas = empresas.filter(e => e.estado === 'activo');

  const tabs = [
    { label: `🔴 En riesgo (${enRiesgo.length})`, data: enRiesgo },
    { label: `📦 Onboarding (${enOnboarding.length})`, data: enOnboarding },
    { label: `✅ Activas (${activas.length})`, data: activas },
  ];

  const handleClickEmpresa = (empresaId) => {
    router.push(`/empresa-vista?empresaId=${empresaId}`);
  };

  return (
    <>
      <Head>
        <title>Activación & Retención | Sorbydata</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">📊 Dashboard CS — Activación & Retención</Typography>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {!loading && (
              <>
                {/* Resumen rápido */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">{enRiesgo.length}</Typography>
                        <Typography variant="body1" align="center">En Riesgo / Inactivas</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">{enOnboarding.length}</Typography>
                        <Typography variant="body1" align="center">En Onboarding</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                      <CardContent>
                        <Typography variant="h3" align="center">{activas.length}</Typography>
                        <Typography variant="body1" align="center">Activas</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Tabs con tarjetas */}
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  {tabs.map((t, i) => (
                    <Tab key={i} label={t.label} />
                  ))}
                </Tabs>

                <Grid container spacing={2}>
                  {tabs[tab].data.length === 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info">No hay empresas en esta categoría</Alert>
                    </Grid>
                  )}
                  {tabs[tab].data.map((empresa) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={empresa.empresaId}>
                      <EmpresaCard
                        empresa={empresa}
                        onClick={() => handleClickEmpresa(empresa.empresaId)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

ActivacionRetencionPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ActivacionRetencionPage;
