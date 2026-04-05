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
  Alert,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/router';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BusinessIcon from '@mui/icons-material/Business';
import ChatIcon from '@mui/icons-material/Chat';
import ContactsIcon from '@mui/icons-material/Contacts';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import HistoryIcon from '@mui/icons-material/History';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SettingsIcon from '@mui/icons-material/Settings';
import ScienceIcon from '@mui/icons-material/Science';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TodayIcon from '@mui/icons-material/Today';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import BotService from 'src/services/botService';
import ChatGptUsageService from 'src/services/chatGptUsageService';

const CompactCard = ({ title, description, icon: Icon, color = 'primary', onClick, badge }) => (
  <Card
    sx={{
      height: '100%',
      transition: 'all 0.2s ease-in-out',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
    }}
  >
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              bgcolor: `${color}.lightest`,
              borderRadius: 1.5,
              p: 0.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon sx={{ color: `${color}.main`, fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
              {description}
            </Typography>
            {badge != null && (
              <Chip label={badge} size="small" color={color} sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
        </Stack>
      </CardContent>
    </CardActionArea>
  </Card>
);

const ControlPanelPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ botUsers: null, chatgptToday: null, chatgptMonth: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [botUsers, chatgptSummary] = await Promise.all([
          BotService.listarUsuarios().catch(() => []),
          ChatGptUsageService.getSummary().catch(() => null),
        ]);
        setStats({
          botUsers: botUsers?.length || 0,
          chatgptToday: chatgptSummary?.today?.costUsd || 0,
          chatgptMonth: chatgptSummary?.month?.costUsd || 0,
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

  const categories = [
    {
      title: 'Control clientes',
      panels: [
        { title: 'Analytics Empresas', description: 'Uso y engagement por empresa', icon: AnalyticsIcon, color: 'primary', path: '/analyticsEmpresas' },
        { title: 'Analytics Onboarding', description: 'Adopción en primeros días', icon: RocketLaunchIcon, color: 'success', path: '/analyticsOnboarding' },
        { title: 'Empresas', description: 'Gestión y configuraciones', icon: BusinessIcon, color: 'primary', path: '/empresas' },
        { title: 'Usuarios del Bot', description: 'Estados activos en WhatsApp', icon: SmartToyIcon, color: 'info', path: '/bot-users', badge: !loading && stats.botUsers !== null ? `${stats.botUsers} activos` : null },
        { title: 'Conversaciones', description: 'Historial de mensajes', icon: ChatIcon, color: 'secondary', path: '/conversaciones' },
        { title: 'Monedas', description: 'Dólar, Blue, MEP e índices CAC', icon: CurrencyExchangeIcon, color: 'error', path: '/monedas' },
      ],
    },
    {
      title: 'Control ventas',
      panels: [
        { title: 'Gestión SDR', description: 'Métricas y seguimiento SDR', icon: SupportAgentIcon, color: 'success', path: '/gestionSDR' },
        { title: 'Contactos SDR', description: 'Pipeline comercial', icon: ContactsIcon, color: 'info', path: '/contactosSDR' },
        { title: 'Reuniones', description: 'Agenda y seguimiento de reuniones', icon: TodayIcon, color: 'primary', path: '/sdr/reuniones' },
        { title: 'Funnel', description: 'Embudo y estado del pipeline', icon: FilterListIcon, color: 'warning', path: '/funnel' },
        { title: 'A/B Landing Agenda', description: 'WhatsApp vs agendar reunión', icon: ScienceIcon, color: 'secondary', path: '/abTestLandingAgenda' },
      ],
    },
    {
      title: 'Conf extra',
      panels: [
        { title: 'Leads', description: 'Prospectos y oportunidades', icon: LeaderboardIcon, color: 'success', path: '/leads' },
        { title: 'Cadencias', description: 'Secuencias y tareas comerciales', icon: AccountTreeIcon, color: 'secondary', path: '/sdr/cadencias' },
        { title: 'Admin SDR', description: 'Configuración operativa SDR', icon: SettingsIcon, color: 'info', path: '/sdr/admin' },
        { title: 'Follow-Up Auto Config', description: 'Automatización de follow-ups', icon: AutorenewIcon, color: 'success', path: '/followUpAutoConfig' },
        { title: 'Templates WhatsApp', description: 'Gestión de templates Meta', icon: WhatsAppIcon, color: 'success', path: '/templatesMeta' },
        { title: 'Eventos', description: 'Historial de eventos del sistema', icon: HistoryIcon, color: 'primary', path: '/eventos' },
        { title: 'ChatGPT Usage', description: 'Costos y consumo de API', icon: PsychologyIcon, color: 'warning', path: '/chatgpt-usage', badge: !loading && stats.chatgptMonth !== null ? `$${stats.chatgptMonth.toFixed(2)}/mes` : null },
      ],
    },
    {
      title: 'Otros A/B testing',
      panels: [
        { title: 'A/B Activación', description: 'IA vs demo directa en onboarding', icon: ScienceIcon, color: 'warning', path: '/abTestContactActivation' },
      ],
    },
  ];


  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" fontWeight="bold">Panel de Control</Typography>
            {!loading && (
              <Stack direction="row" spacing={1.5} alignItems="center" mt={0.75} flexWrap="wrap">
                <Chip
                  icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                  label={`ChatGPT hoy: $${(stats.chatgptToday || 0).toFixed(4)}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<SmartToyIcon sx={{ fontSize: 14 }} />}
                  label={`Bot activos: ${stats.botUsers ?? '—'}`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </Stack>
            )}
          </Box>

          {error && (
            <Alert severity="warning" onClose={() => setError(null)}>{error}</Alert>
          )}

          {/* Categorías */}
          {categories.map((cat, i) => (
            <Box key={cat.title}>
              {i > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography
                variant="overline"
                color="text.secondary"
                fontWeight="bold"
                display="block"
                sx={{ mb: 1 }}
              >
                {cat.title}
              </Typography>
              <Grid container spacing={1.5}>
                {cat.panels.map((panel) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={panel.path}>
                    <CompactCard
                      title={panel.title}
                      description={panel.description}
                      icon={panel.icon}
                      color={panel.color}
                      onClick={() => router.push(panel.path)}
                      badge={panel.badge}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};

ControlPanelPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ControlPanelPage;
