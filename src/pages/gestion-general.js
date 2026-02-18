import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GroupRemoveIcon from '@mui/icons-material/GroupRemove';
import FunnelIcon from '@mui/icons-material/FilterAlt';
import FlagIcon from '@mui/icons-material/Flag';
import SpeedIcon from '@mui/icons-material/Speed';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import leadershipService from 'src/services/leadershipService';

// ── PanelCard (mismo patrón que control-panel.js) ──
const PanelCard = ({
  title,
  description,
  icon: Icon,
  color = 'primary',
  path,
  metric,
  metricLabel,
  loading = false
}) => (
  <Card
    component="a"
    href={path}
    target="_blank"
    rel="noopener noreferrer"
    sx={{
      height: '100%',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4
      }
    }}
  >
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            backgroundColor: `${color}.lightest`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </Typography>
        </Box>
        {loading ? (
          <CircularProgress size={20} />
        ) : metric !== undefined && metric !== null && (
          <Stack alignItems="flex-end" sx={{ flexShrink: 0 }}>
            <Typography variant="h5" color={`${color}.main`} fontWeight="bold" lineHeight={1}>
              {metric}
            </Typography>
            {metricLabel && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {metricLabel}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </CardContent>
  </Card>
);

// ── Formato helpers ──
const formatMoney = (n) => {
  if (n == null || isNaN(n)) return null;
  return '$' + Math.round(n).toLocaleString('es-AR');
};

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
const GestionGeneralPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mrr: null,
    clientesActivos: null,
    porcentajeBreakEven: null,
    accionesVencidas: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [kpis, vencidasResp] = await Promise.all([
          leadershipService.getKPIsExpress().catch(() => null),
          leadershipService.getAccionesVencidas().catch(() => ({ vencidas: [] }))
        ]);

        const vencidas = Array.isArray(vencidasResp?.vencidas) ? vencidasResp.vencidas : [];

        setStats({
          mrr: kpis?.mrr ?? null,
          clientesActivos: kpis?.totalClientes ?? null,
          porcentajeBreakEven: kpis?.porcentajeBreakEven ?? null,
          accionesVencidas: vencidas.length
        });
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setError('Error al cargar algunas estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const panelCategories = [
    {
      title: '📊 Visión Estratégica',
      description: 'KPIs clave y resumen ejecutivo para las reuniones de liderazgo',
      panels: [
        {
          title: 'Resumen Ejecutivo',
          description: 'Break-even, MRR, altas y bajas. La foto completa del negocio.',
          icon: SpeedIcon,
          color: 'primary',
          path: '/analyticsResumenEjecutivo',
          metric: stats.porcentajeBreakEven != null ? `${stats.porcentajeBreakEven}%` : null,
          metricLabel: 'del break-even'
        },
        {
          title: 'Acciones de Leadership',
          description: 'Compromisos semanales del equipo, seguimiento y responsables.',
          icon: AssignmentIcon,
          color: 'warning',
          path: '/analyticsAcciones',
          metric: stats.accionesVencidas > 0 ? stats.accionesVencidas : null,
          metricLabel: stats.accionesVencidas > 0 ? 'vencidas ⚠️' : null
        }
      ]
    },
    {
      title: '💰 Ingresos y Cobranza',
      description: 'Suscripciones, facturación mensual y seguimiento de cobros',
      panels: [
        {
          title: 'Cobranza',
          description: 'Estado de pagos del mes, progreso de cobro y morosos.',
          icon: ReceiptLongIcon,
          color: 'success',
          path: '/analyticsCobranza',
          metric: formatMoney(stats.mrr),
          metricLabel: 'MRR actual'
        }
      ]
    },
    {
      title: '📈 Crecimiento',
      description: 'Pipeline de ventas y retención de clientes',
      panels: [
        {
          title: 'Ventas & Funnel',
          description: 'Pipeline comercial, conversión por canal y rendimiento SDR.',
          icon: FunnelIcon,
          color: 'info',
          path: '/analyticsVentas',
          metric: null,
          metricLabel: null
        },
        {
          title: 'Retención',
          description: 'Cohortes de retención, churn rate y clientes en riesgo.',
          icon: GroupRemoveIcon,
          color: 'error',
          path: '/analyticsRetencion',
          metric: stats.clientesActivos,
          metricLabel: 'clientes activos'
        }
      ]
    }
  ];

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Gestión General
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Centro de métricas y paneles para las reuniones semanales de liderazgo
            </Typography>
          </Box>

          {error && (
            <Alert severity="warning" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Métricas rápidas */}
          {!loading && stats.mrr != null && (
            <Card sx={{ bgcolor: 'primary.lightest' }}>
              <CardContent>
                <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon color="success" />
                    <Typography variant="body2" color="text.secondary">
                      MRR:
                    </Typography>
                    <Chip
                      label={formatMoney(stats.mrr)}
                      color="success"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Clientes activos:
                    </Typography>
                    <Chip
                      label={stats.clientesActivos ?? '–'}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlagIcon color={stats.porcentajeBreakEven >= 100 ? 'success' : 'warning'} />
                    <Typography variant="body2" color="text.secondary">
                      Break-even:
                    </Typography>
                    <Chip
                      label={stats.porcentajeBreakEven != null ? `${stats.porcentajeBreakEven}%` : '–'}
                      color={stats.porcentajeBreakEven >= 100 ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  {stats.accionesVencidas > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="error" />
                      <Typography variant="body2" color="text.secondary">
                        Acciones vencidas:
                      </Typography>
                      <Chip
                        label={stats.accionesVencidas}
                        color="error"
                        size="small"
                      />
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Grid de Paneles por Categoría */}
          {panelCategories.map((category, catIndex) => (
            <Box key={category.title}>
              {catIndex > 0 && <Divider sx={{ my: 2 }} />}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {category.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {category.description}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {category.panels.map((panel) => (
                  <Grid item xs={12} sm={6} key={panel.path}>
                    <PanelCard
                      title={panel.title}
                      description={panel.description}
                      icon={panel.icon}
                      color={panel.color}
                      path={panel.path}
                      metric={panel.metric}
                      metricLabel={panel.metricLabel}
                      loading={loading && panel.metric !== null}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}

          {/* Info */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sobre estos paneles
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Estos dashboards están diseñados para las reuniones semanales de liderazgo:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>• Resumen Ejecutivo:</strong> Break-even, MRR, ticket promedio, altas vs bajas mensuales
                </Typography>
                <Typography variant="body2">
                  <strong>• Acciones:</strong> Seguimiento de compromisos semanales con owners y deadlines
                </Typography>
                <Typography variant="body2">
                  <strong>• Cobranza:</strong> Estado de pagos del mes, distribución por semana, registro de cobros
                </Typography>
                <Typography variant="body2">
                  <strong>• Ventas & Funnel:</strong> Pipeline de ventas, rendimiento por canal y por SDR
                </Typography>
                <Typography variant="body2">
                  <strong>• Retención:</strong> Tabla de cohortes, churn mensual y alertas de clientes inactivos
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

GestionGeneralPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default GestionGeneralPage;
