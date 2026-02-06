import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { useRouter } from 'next/router';
import BusinessIcon from '@mui/icons-material/Business';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatIcon from '@mui/icons-material/Chat';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ContactsIcon from '@mui/icons-material/Contacts';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BotService from 'src/services/botService';
import ChatGptUsageService from 'src/services/chatGptUsageService';

const PanelCard = ({ 
  title, 
  description, 
  icon: Icon, 
  color = 'primary', 
  onClick, 
  metric, 
  metricLabel,
  loading = false 
}) => (
  <Card 
    sx={{ 
      height: '100%',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-8px)',
        boxShadow: 6
      }
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              backgroundColor: `${color}.lightest`,
              borderRadius: 3,
              p: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'fit-content'
            }}
          >
            <Icon sx={{ color: `${color}.main`, fontSize: 40 }} />
          </Box>
          
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={24} />
            </Box>
          ) : metric !== undefined && (
            <Box>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="h3" color={`${color}.main`} fontWeight="bold">
                  {metric}
                </Typography>
                {metricLabel && (
                  <Typography variant="body2" color="text.secondary">
                    {metricLabel}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </CardActionArea>
  </Card>
);

const ControlPanelPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    botUsers: null,
    chatgptToday: null,
    chatgptMonth: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [botUsers, chatgptSummary] = await Promise.all([
          BotService.listarUsuarios().catch(() => []),
          ChatGptUsageService.getSummary().catch(() => null)
        ]);

        setStats({
          botUsers: botUsers?.length || 0,
          chatgptToday: chatgptSummary?.today?.costUsd || 0,
          chatgptMonth: chatgptSummary?.month?.costUsd || 0
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

  // Paneles organizados por categorías
  const panelCategories = [
    {
      title: '📊 Analytics y Métricas',
      description: 'Análisis de uso y adopción del sistema',
      panels: [
        {
          title: 'Analytics Empresas',
          description: 'Métricas de uso por empresa y usuarios',
          icon: AnalyticsIcon,
          color: 'primary',
          path: '/analyticsEmpresas',
          metric: null,
          metricLabel: null
        },
        {
          title: 'Analytics Onboarding',
          description: 'Análisis de adopción en primeros días',
          icon: RocketLaunchIcon,
          color: 'success',
          path: '/analyticsOnboarding',
          metric: null,
          metricLabel: null
        }
      ]
    },
    {
      title: '🏢 Gestión de Empresas',
      description: 'Administración de clientes y configuraciones',
      panels: [
        {
          title: 'Empresas',
          description: 'Gestión de empresas y configuraciones',
          icon: BusinessIcon,
          color: 'primary',
          path: '/empresas',
          metric: null,
          metricLabel: null
        }
      ]
    },
    {
      title: '💼 Ventas y CRM',
      description: 'Gestión comercial y prospectos',
      panels: [
        {
          title: 'Contactos SDR',
          description: 'Gestión de contactos y prospectos comerciales',
          icon: ContactsIcon,
          color: 'info',
          path: '/contactosSDR',
          metric: null,
          metricLabel: null
        },
        {
          title: 'Panel SDR',
          description: 'Dashboard de seguimiento y métricas SDR',
          icon: SupportAgentIcon,
          color: 'success',
          path: '/gestionSDR',
          metric: null,
          metricLabel: null
        },
        {
          title: 'Leads',
          description: 'Seguimiento de prospectos y oportunidades',
          icon: LeaderboardIcon,
          color: 'success',
          path: '/leads',
          metric: null,
          metricLabel: null
        }
      ]
    },
    {
      title: '🤖 Bot y Conversaciones',
      description: 'Gestión del bot de WhatsApp',
      panels: [
        {
          title: 'Usuarios del Bot',
          description: 'Estados activos y gestión de usuarios',
          icon: SmartToyIcon,
          color: 'info',
          path: '/bot-users',
          metric: stats.botUsers,
          metricLabel: 'activos'
        },
        {
          title: 'Conversaciones',
          description: 'Historial y búsqueda de mensajes',
          icon: ChatIcon,
          color: 'secondary',
          path: '/conversaciones',
          metric: null,
          metricLabel: null
        }
      ]
    },
    {
      title: '⚙️ Sistema y Configuración',
      description: 'Monitoreo y configuración del sistema',
      panels: [
        {
          title: 'Uso de ChatGPT',
          description: 'Monitoreo de costos y consumo de API',
          icon: PsychologyIcon,
          color: 'warning',
          path: '/chatgpt-usage',
          metric: stats.chatgptMonth !== null ? `$${stats.chatgptMonth.toFixed(2)}` : null,
          metricLabel: 'este mes'
        },
        {
          title: 'Monedas',
          description: 'Valores de dólar (Oficial, Blue, MEP) e índices CAC',
          icon: CurrencyExchangeIcon,
          color: 'error',
          path: '/monedas',
          metric: null,
          metricLabel: null
        }
      ]
    }
  ];

  // Flatten para compatibilidad con métricas rápidas
  const allPanels = panelCategories.flatMap(cat => cat.panels);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          {/* Header */}
          <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Panel de Control
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Acceso rápido a las herramientas de administración y monitoreo del sistema
            </Typography>
          </Box>

          {error && (
            <Alert severity="warning" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Métricas Rápidas */}
          {!loading && stats.chatgptToday !== null && (
            <Card sx={{ bgcolor: 'primary.lightest' }}>
              <CardContent>
                <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      ChatGPT hoy:
                    </Typography>
                    <Chip 
                      label={`$${stats.chatgptToday.toFixed(4)}`}
                      color="primary"
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToyIcon color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Usuarios activos:
                    </Typography>
                    <Chip 
                      label={stats.botUsers}
                      color="info"
                      size="small"
                    />
                  </Box>
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
              <Grid container spacing={3}>
                {category.panels.map((panel) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={panel.path}>
                    <PanelCard
                      title={panel.title}
                      description={panel.description}
                      icon={panel.icon}
                      color={panel.color}
                      onClick={() => router.push(panel.path)}
                      metric={panel.metric}
                      metricLabel={panel.metricLabel}
                      loading={loading && panel.metric !== null}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}

          {/* Información Adicional */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accesos Rápidos
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Este panel te permite acceder rápidamente a las principales herramientas del sistema:
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>• Empresas:</strong> Configura y gestiona las empresas del sistema
                </Typography>
                <Typography variant="body2">
                  <strong>• Leads:</strong> Visualiza y gestiona los prospectos comerciales
                </Typography>
                <Typography variant="body2">
                  <strong>• Bot Users:</strong> Administra los usuarios activos del bot de WhatsApp
                </Typography>
                <Typography variant="body2">
                  <strong>• Conversaciones:</strong> Accede al historial completo de mensajes
                </Typography>
                <Typography variant="body2">
                  <strong>• ChatGPT Usage:</strong> Monitorea costos y uso de la API de OpenAI
                </Typography>
                <Typography variant="body2">
                  <strong>• Monedas:</strong> Administra valores históricos del dólar e índices CAC
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
};

ControlPanelPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ControlPanelPage;
