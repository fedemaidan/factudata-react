import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  LinearProgress,
  Tooltip,
  IconButton,
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TokenIcon from '@mui/icons-material/Token';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CallMadeIcon from '@mui/icons-material/CallMade';
import PieChartIcon from '@mui/icons-material/PieChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import ChatGptUsageService from 'src/services/chatGptUsageService';

// Colores para los gráficos de barras
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${value.toFixed(4)}`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString('es-AR');
};

const formatTokens = (value) => {
  if (value === null || value === undefined) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString('es-AR');
};

// Componente de Tarjeta Métrica
const MetricCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="text.secondary" variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {Icon && (
          <Box
            sx={{
              backgroundColor: `${color}.lightest`,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
          </Box>
        )}
      </Stack>
    </CardContent>
  </Card>
);

// Componente de Barra de Progreso para visualizar proporción
const ProgressBar = ({ value, max, label, color, index }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: '60%' }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(value)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            backgroundColor: COLORS[index % COLORS.length],
            borderRadius: 4
          }
        }}
      />
    </Box>
  );
};

const ChatGptUsagePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [topSources, setTopSources] = useState([]);
  
  // Filtros
  const [groupBy, setGroupBy] = useState('source');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, statsRes, dailyRes, topSourcesRes, recentRes] = await Promise.all([
        ChatGptUsageService.getSummary(),
        ChatGptUsageService.getStats({ 
          from: dateRange.from, 
          to: dateRange.to, 
          groupBy 
        }),
        ChatGptUsageService.getDaily({ 
          from: dateRange.from, 
          to: dateRange.to 
        }),
        ChatGptUsageService.getTopSources({ 
          from: dateRange.from, 
          to: dateRange.to, 
          limit: 10 
        }),
        ChatGptUsageService.getRecent(20)
      ]);
      
      setSummary(summaryRes);
      setStats(statsRes);
      setDailyData(dailyRes);
      setTopSources(topSourcesRes);
      setRecentCalls(recentRes);
    } catch (error) {
      console.error('Error al obtener datos:', error);
      setAlert({ open: true, message: 'Error al cargar estadísticas de ChatGPT', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateRange, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGroupByChange = (event, newGroupBy) => {
    if (newGroupBy !== null) {
      setGroupBy(newGroupBy);
    }
  };

  const handleDateChange = (field) => (event) => {
    setDateRange(prev => ({ ...prev, [field]: event.target.value }));
  };

  // Calcular el máximo para la barra de progreso
  const maxCost = topSources.length > 0 ? topSources[0].totalCostUsd : 0;

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={4}>
          <Box>
            <Typography variant="h4">Uso de ChatGPT</Typography>
            <Typography color="text.secondary" variant="body2">
              Monitoreo de costos y consumo de la API de OpenAI
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={fetchData}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Stack>

        {/* Tarjetas de Resumen */}
        {summary && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Costo Hoy"
                value={formatCurrency(summary.today.costUsd)}
                subtitle={`${formatNumber(summary.today.calls)} llamadas`}
                icon={AttachMoneyIcon}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Costo del Mes"
                value={formatCurrency(summary.month.costUsd)}
                subtitle={`${formatNumber(summary.month.calls)} llamadas`}
                icon={TrendingUpIcon}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Tokens Hoy"
                value={formatTokens(summary.today.tokens)}
                subtitle="tokens consumidos"
                icon={TokenIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Tokens del Mes"
                value={formatTokens(summary.month.tokens)}
                subtitle="tokens consumidos"
                icon={TokenIcon}
                color="info"
              />
            </Grid>
          </Grid>
        )}

        {/* Filtros */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Desde"
                type="date"
                value={dateRange.from}
                onChange={handleDateChange('from')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                label="Hasta"
                type="date"
                value={dateRange.to}
                onChange={handleDateChange('to')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Typography variant="body2" color="text.secondary">
                Agrupar por:
              </Typography>
              <ToggleButtonGroup
                value={groupBy}
                exclusive
                onChange={handleGroupByChange}
                size="small"
              >
                <ToggleButton value="source">
                  <PieChartIcon sx={{ mr: 1 }} /> Source
                </ToggleButton>
                <ToggleButton value="model">
                  <BarChartIcon sx={{ mr: 1 }} /> Modelo
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Top Sources por Costo */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardHeader 
                  title="Top Sources por Costo" 
                  subheader="Mayores consumidores de la API"
                />
                <CardContent>
                  {topSources.length > 0 ? (
                    topSources.map((source, index) => (
                      <ProgressBar
                        key={source._id}
                        label={source._id || 'unknown'}
                        value={source.totalCostUsd}
                        max={maxCost}
                        color={COLORS[index % COLORS.length]}
                        index={index}
                      />
                    ))
                  ) : (
                    <Typography color="text.secondary" align="center">
                      No hay datos disponibles
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Estadísticas Agrupadas */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardHeader 
                  title={`Estadísticas por ${groupBy === 'source' ? 'Source' : 'Modelo'}`}
                  subheader="Desglose de uso"
                />
                <CardContent sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{groupBy === 'source' ? 'Source' : 'Modelo'}</TableCell>
                        <TableCell align="right">Llamadas</TableCell>
                        <TableCell align="right">Tokens</TableCell>
                        <TableCell align="right">Costo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.length > 0 ? (
                        stats.map((row) => (
                          <TableRow key={row._id}>
                            <TableCell>
                              <Tooltip title={row._id || 'unknown'}>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                  {row._id || 'unknown'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">{formatNumber(row.totalCalls)}</TableCell>
                            <TableCell align="right">{formatTokens(row.totalTokens)}</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={formatCurrency(row.totalCostUsd)} 
                                size="small" 
                                color={row.totalCostUsd > 1 ? 'warning' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No hay datos disponibles
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>

            {/* Uso Diario */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Uso Diario" 
                  subheader="Evolución del consumo en el período seleccionado"
                />
                <CardContent>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha</TableCell>
                          <TableCell align="right">Llamadas</TableCell>
                          <TableCell align="right">Tokens</TableCell>
                          <TableCell align="right">Costo</TableCell>
                          <TableCell align="right">Éxitos</TableCell>
                          <TableCell align="right">Errores</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dailyData.length > 0 ? (
                          dailyData.slice().reverse().map((row) => (
                            <TableRow key={row.date}>
                              <TableCell>{row.date}</TableCell>
                              <TableCell align="right">{formatNumber(row.totalCalls)}</TableCell>
                              <TableCell align="right">{formatTokens(row.totalTokens)}</TableCell>
                              <TableCell align="right">{formatCurrency(row.totalCostUsd)}</TableCell>
                              <TableCell align="right">
                                <Chip 
                                  label={row.successCount} 
                                  size="small" 
                                  color="success" 
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                {row.errorCount > 0 ? (
                                  <Chip 
                                    label={row.errorCount} 
                                    size="small" 
                                    color="error" 
                                    variant="outlined"
                                  />
                                ) : (
                                  <Typography variant="body2" color="text.secondary">0</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No hay datos para el período seleccionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Llamadas Recientes */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Llamadas Recientes" 
                  subheader="Últimas 20 llamadas a la API"
                />
                <CardContent>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fecha/Hora</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Modelo</TableCell>
                          <TableCell align="right">Tokens</TableCell>
                          <TableCell align="right">Costo</TableCell>
                          <TableCell align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentCalls.length > 0 ? (
                          recentCalls.map((call, index) => (
                            <TableRow key={call._id || index}>
                              <TableCell>
                                <Typography variant="body2" noWrap>
                                  {new Date(call.created_at).toLocaleString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Tooltip title={call.source}>
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                    {call.source}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={call.model} 
                                  size="small" 
                                  variant="outlined"
                                  color={call.model.includes('4o') ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="right">{formatTokens(call.tokens?.total || 0)}</TableCell>
                              <TableCell align="right">{formatCurrency(call.estimatedCostUsd)}</TableCell>
                              <TableCell align="center">
                                {call.success ? (
                                  <Chip label="OK" size="small" color="success" />
                                ) : (
                                  <Chip label="Error" size="small" color="error" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              No hay llamadas recientes
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Snackbar 
          open={alert.open} 
          autoHideDuration={6000} 
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert 
            onClose={() => setAlert({ ...alert, open: false })} 
            severity={alert.severity}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

ChatGptUsagePage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default ChatGptUsagePage;
