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
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  Tooltip
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TokenIcon from '@mui/icons-material/Token';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TimelineIcon from '@mui/icons-material/Timeline';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import ChatGptUsageService from 'src/services/chatGptUsageService';

// Colores para los gráficos de barras
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const WATCHED_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'whisper-1', 'gpt-5.4', 'gpt-5.4-mini', 'o3'];
const EMPTY_PRICING_FORM = {
  model: '',
  pricingType: 'tokens',
  inputPerMillion: '',
  outputPerMillion: '',
  usdPerMinute: ''
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${value.toFixed(4)}`;
};

const formatRate = (value) => {
  if (value === null || value === undefined) return '-';
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
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

const formatPricing = (pricing) => {
  if (!pricing) return 'Tarifa no disponible';

  if (pricing.pricingType === 'audio') {
    return `${formatRate(pricing.usdPerMinute)}/min`;
  }

  return `${formatRate(pricing.inputPerMillion)} in / ${formatRate(pricing.outputPerMillion)} out`;
};

const getPricingSourceProps = (source) => {
  switch (source) {
    case 'custom':
      return { label: 'Personalizado', color: 'success' };
    case 'catalog':
      return { label: 'Catálogo', color: 'primary' };
    default:
      return { label: 'Default', color: 'warning' };
  }
};

const buildPricingForm = (entry) => {
  if (!entry) {
    return EMPTY_PRICING_FORM;
  }

  return {
    model: entry.model || '',
    pricingType: entry.pricing?.pricingType || 'tokens',
    inputPerMillion: entry.pricing?.inputPerMillion ?? '',
    outputPerMillion: entry.pricing?.outputPerMillion ?? '',
    usdPerMinute: entry.pricing?.usdPerMinute ?? ''
  };
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

const ChatGptUsagePage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [sourceCostSeries, setSourceCostSeries] = useState({ labels: [], series: [], interval: 'day' });
  const [modelCatalog, setModelCatalog] = useState([]);
  const [pricingForm, setPricingForm] = useState(EMPTY_PRICING_FORM);
  const [savingPricing, setSavingPricing] = useState(false);
  const [recalculatingHistory, setRecalculatingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('reportes');
  
  // Filtros
  const [sourceInterval, setSourceInterval] = useState('day');
  const [visibleSources, setVisibleSources] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, statsRes, dailyRes, sourceSeriesRes, recentRes, modelCatalogRes] = await Promise.all([
        ChatGptUsageService.getSummary(),
        ChatGptUsageService.getStats({ 
          from: dateRange.from, 
          to: dateRange.to, 
          groupBy: 'model'
        }),
        ChatGptUsageService.getDaily({ 
          from: dateRange.from, 
          to: dateRange.to 
        }),
        ChatGptUsageService.getSourceCostSeries({ 
          from: dateRange.from, 
          to: dateRange.to, 
          interval: sourceInterval,
          limit: 6
        }),
        ChatGptUsageService.getRecent(20),
        ChatGptUsageService.getModelCatalog({
          from: dateRange.from,
          to: dateRange.to
        })
      ]);
      
      setSummary(summaryRes);
      setStats(statsRes);
      setDailyData(dailyRes);
      setSourceCostSeries(sourceSeriesRes);
      setRecentCalls(recentRes);
      setModelCatalog(modelCatalogRes);
      setVisibleSources((prev) => {
        const available = sourceSeriesRes.series.map((item) => item.id);
        const filtered = prev.filter((item) => available.includes(item));
        return filtered.length > 0 ? filtered : available;
      });
    } catch (error) {
      console.error('Error al obtener datos:', error);
      setAlert({ open: true, message: 'Error al cargar estadísticas de ChatGPT', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateRange, sourceInterval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateChange = (field) => (event) => {
    setDateRange(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSourceIntervalChange = (event, newInterval) => {
    if (newInterval) {
      setSourceInterval(newInterval);
    }
  };

  const handleToggleSourceVisibility = (sourceId) => () => {
    setVisibleSources((prev) => (
      prev.includes(sourceId)
        ? prev.filter((item) => item !== sourceId)
        : [...prev, sourceId]
    ));
  };

  const handlePricingFormChange = (field) => (event) => {
    setPricingForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePricingTypeChange = (event, newPricingType) => {
    if (!newPricingType) {
      return;
    }

    setPricingForm((prev) => ({
      ...prev,
      pricingType: newPricingType
    }));
  };

  const handlePricingEdit = (entry) => {
    setPricingForm(buildPricingForm(entry));
  };

  const handlePricingReset = () => {
    setPricingForm(EMPTY_PRICING_FORM);
  };

  const handleSavePricing = async () => {
    const model = pricingForm.model.trim();

    if (!model) {
      setAlert({ open: true, message: 'Ingresá un nombre de modelo', severity: 'warning' });
      return;
    }

    const payload = {
      model,
      pricingType: pricingForm.pricingType
    };

    if (pricingForm.pricingType === 'audio') {
      const usdPerMinute = Number(pricingForm.usdPerMinute);

      if (!Number.isFinite(usdPerMinute) || usdPerMinute < 0) {
        setAlert({ open: true, message: 'Ingresá un valor válido para USD por minuto', severity: 'warning' });
        return;
      }

      payload.usdPerMinute = usdPerMinute;
    } else {
      const inputPerMillion = Number(pricingForm.inputPerMillion);
      const outputPerMillion = Number(pricingForm.outputPerMillion);

      if (!Number.isFinite(inputPerMillion) || inputPerMillion < 0 || !Number.isFinite(outputPerMillion) || outputPerMillion < 0) {
        setAlert({ open: true, message: 'Ingresá valores válidos para input y output por millón', severity: 'warning' });
        return;
      }

      payload.inputPerMillion = inputPerMillion;
      payload.outputPerMillion = outputPerMillion;
    }

    setSavingPricing(true);
    try {
      await ChatGptUsageService.saveModelPricing(payload);
      setAlert({ open: true, message: `Tarifa guardada para ${model}`, severity: 'success' });
      setPricingForm(EMPTY_PRICING_FORM);
      await fetchData();
    } catch (error) {
      console.error('Error al guardar tarifa:', error);
      setAlert({
        open: true,
        message: error?.response?.data?.error || 'No se pudo guardar la tarifa del modelo',
        severity: 'error'
      });
    } finally {
      setSavingPricing(false);
    }
  };

  const handleRecalculateHistory = async () => {
    const confirmed = window.confirm(
      `¿Recalcular costos históricos entre ${dateRange.from} y ${dateRange.to}? Esto actualizará registros guardados.`
    );

    if (!confirmed) {
      return;
    }

    setRecalculatingHistory(true);
    try {
      const result = await ChatGptUsageService.recalculateHistory({
        from: dateRange.from,
        to: dateRange.to,
        dryRun: false
      });

      const deltaLabel = formatCurrency(result.totalCostDelta || 0);
      setAlert({
        open: true,
        severity: 'success',
        message: `Histórico recalculado. ${formatNumber(result.updatedCount)} registros actualizados, ${formatNumber(result.inferredCount)} con split estimado, delta ${deltaLabel}.`
      });

      await fetchData();
    } catch (error) {
      console.error('Error al recalcular históricos:', error);
      setAlert({
        open: true,
        severity: 'error',
        message: error?.response?.data?.error || 'No se pudo recalcular el histórico'
      });
    } finally {
      setRecalculatingHistory(false);
    }
  };

  const watchedModels = WATCHED_MODELS
    .map((modelName) => modelCatalog.find((item) => item.model === modelName))
    .filter(Boolean);
  const geminiLegacyModel = watchedModels.find((model) => model.model === 'gemini-2.0-flash');
  const geminiCurrentModel = watchedModels.find((model) => model.model === 'gemini-2.5-flash');
  const visibleSourceSeries = sourceCostSeries.series.filter((series) => visibleSources.includes(series.id));
  const sourceChartSeries = visibleSourceSeries.map((series, index) => ({
    id: series.id,
    label: series.label,
    data: series.data,
    color: COLORS[index % COLORS.length],
    curve: 'linear',
    showMark: false,
    valueFormatter: (value) => formatCurrency(value || 0)
  }));

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

        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" allowScrollButtonsMobile>
              <Tab label="Reportes" value="reportes" />
              <Tab label="Modelos" value="modelos" />
            </Tabs>
          </CardContent>
        </Card>

        {/* Tarjetas de Resumen */}
        {summary && activeTab === 'reportes' && (
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
              {activeTab === 'reportes' && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                  <Typography variant="body2" color="text.secondary">
                    Serie temporal:
                  </Typography>
                  <ToggleButtonGroup
                    value={sourceInterval}
                    exclusive
                    onChange={handleSourceIntervalChange}
                    size="small"
                  >
                    <ToggleButton value="day">
                      Día
                    </ToggleButton>
                    <ToggleButton value="week">
                      Semana
                    </ToggleButton>
                    <ToggleButton value="month">
                      Mes
                    </ToggleButton>
                  </ToggleButtonGroup>
                </>
              )}
              {activeTab === 'modelos' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={handleRecalculateHistory}
                  disabled={recalculatingHistory || loading}
                >
                  {recalculatingHistory ? 'Recalculando...' : 'Recalcular Históricos'}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {!loading && activeTab === 'modelos' && (
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title="Tarifas por Modelo"
              subheader="Podés ver el precio aplicado, agregar modelos nuevos y modificar los existentes. Los cambios impactan en el cálculo futuro de costos."
            />
            <CardContent>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
                  <TextField
                    label="Modelo"
                    value={pricingForm.model}
                    onChange={handlePricingFormChange('model')}
                    size="small"
                    sx={{ minWidth: { xs: '100%', lg: 220 } }}
                    disabled={savingPricing}
                    placeholder="gpt-4.1-mini"
                  />
                  <ToggleButtonGroup
                    value={pricingForm.pricingType}
                    exclusive
                    onChange={handlePricingTypeChange}
                    size="small"
                    color="primary"
                  >
                    <ToggleButton value="tokens">Tokens</ToggleButton>
                    <ToggleButton value="audio">Audio</ToggleButton>
                  </ToggleButtonGroup>
                  {pricingForm.pricingType === 'audio' ? (
                    <TextField
                      label="USD por minuto"
                      type="number"
                      value={pricingForm.usdPerMinute}
                      onChange={handlePricingFormChange('usdPerMinute')}
                      size="small"
                      inputProps={{ min: 0, step: '0.001' }}
                      disabled={savingPricing}
                    />
                  ) : (
                    <>
                      <TextField
                        label="USD / 1M input"
                        type="number"
                        value={pricingForm.inputPerMillion}
                        onChange={handlePricingFormChange('inputPerMillion')}
                        size="small"
                        inputProps={{ min: 0, step: '0.001' }}
                        disabled={savingPricing}
                      />
                      <TextField
                        label="USD / 1M output"
                        type="number"
                        value={pricingForm.outputPerMillion}
                        onChange={handlePricingFormChange('outputPerMillion')}
                        size="small"
                        inputProps={{ min: 0, step: '0.001' }}
                        disabled={savingPricing}
                      />
                    </>
                  )}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={handleSavePricing}
                      disabled={savingPricing}
                    >
                      {savingPricing ? 'Guardando...' : 'Guardar tarifa'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handlePricingReset}
                      disabled={savingPricing}
                    >
                      Limpiar
                    </Button>
                  </Stack>
                </Stack>

                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Modelo</TableCell>
                        <TableCell>Tarifa</TableCell>
                        <TableCell>Fuente</TableCell>
                        <TableCell align="right">Llamadas</TableCell>
                        <TableCell align="right">Costo</TableCell>
                        <TableCell align="center">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {modelCatalog.length > 0 ? (
                        modelCatalog.map((entry) => {
                          const pricingSource = getPricingSourceProps(entry.pricing?.source);

                          return (
                            <TableRow key={entry.model}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {entry.model}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {formatPricing(entry.pricing)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={pricingSource.label}
                                  size="small"
                                  color={pricingSource.color}
                                  variant={entry.pricing?.source === 'custom' ? 'filled' : 'outlined'}
                                />
                              </TableCell>
                              <TableCell align="right">{formatNumber(entry.totalCalls)}</TableCell>
                              <TableCell align="right">{formatCurrency(entry.totalCostUsd)}</TableCell>
                              <TableCell align="center">
                                <Button size="small" onClick={() => handlePricingEdit(entry)}>
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No hay modelos cargados todavía
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress />
          </Box>
        ) : activeTab === 'modelos' ? (
          <Grid container spacing={3}>
            {watchedModels.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardHeader
                    title="Modelos Monitoreados"
                    subheader="Estado del rango seleccionado y tarifa aplicada por modelo"
                  />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Modelo</TableCell>
                          <TableCell>Tarifa</TableCell>
                          <TableCell align="right">Llamadas</TableCell>
                          <TableCell align="right">Tokens</TableCell>
                          <TableCell align="right">Costo</TableCell>
                          <TableCell align="center">Estado</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {watchedModels.map((model) => (
                          <TableRow key={model.model}>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant="body2" fontWeight="medium">
                                  {model.model}
                                </Typography>
                                {model.model === 'gemini-2.0-flash' && !model.hasUsage && geminiCurrentModel?.hasUsage && (
                                  <Typography variant="caption" color="text.secondary">
                                    Sin uso en este rango. La actividad detectada fue con gemini-2.5-flash.
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  {formatPricing(model.pricing)}
                                </Typography>
                                {model.pricing?.source === 'default' && (
                                  <Chip label="default" size="small" color="warning" variant="outlined" />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{formatNumber(model.totalCalls)}</TableCell>
                            <TableCell align="right">{formatTokens(model.totalTokens)}</TableCell>
                            <TableCell align="right">{formatCurrency(model.totalCostUsd)}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={model.hasUsage ? 'Activo' : 'Sin uso'}
                                size="small"
                                color={model.hasUsage ? 'success' : 'default'}
                                variant={model.hasUsage ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Top Sources por Costo"
                  subheader="Serie temporal del costo acumulado por source. Podés ocultar o mostrar líneas según necesites."
                  avatar={<TimelineIcon color="primary" />}
                />
                <CardContent>
                  {sourceCostSeries.series.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      No hay datos disponibles para el período seleccionado
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {sourceCostSeries.series.map((series, index) => {
                          const isVisible = visibleSources.includes(series.id);
                          return (
                            <Chip
                              key={series.id}
                              label={`${series.label} · ${formatCurrency(series.totalCostUsd)}`}
                              onClick={handleToggleSourceVisibility(series.id)}
                              variant={isVisible ? 'filled' : 'outlined'}
                              sx={{
                                borderColor: COLORS[index % COLORS.length],
                                backgroundColor: isVisible ? COLORS[index % COLORS.length] : 'transparent',
                                color: isVisible ? 'common.white' : 'text.primary'
                              }}
                            />
                          );
                        })}
                      </Stack>

                      {visibleSourceSeries.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                          Seleccioná al menos un source para ver el gráfico
                        </Typography>
                      ) : (
                        <Box sx={{ overflowX: 'auto' }}>
                          <LineChart
                            height={360}
                            grid={{ horizontal: true, vertical: false }}
                            xAxis={[{ scaleType: 'point', data: sourceCostSeries.labels }]}
                            yAxis={[{ min: 0, valueFormatter: (value) => formatCurrency(value || 0) }]}
                            margin={{ top: 24, right: 24, bottom: 24, left: 60 }}
                            series={sourceChartSeries}
                            slotProps={{ legend: { hidden: true } }}
                          />
                        </Box>
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Estadísticas Agrupadas */}
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Estadísticas por Modelo"
                  subheader="Desglose de uso con tarifa aplicada y tokens input/output"
                />
                <CardContent sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Modelo</TableCell>
                        <TableCell align="right">Llamadas</TableCell>
                        <TableCell align="right">Tokens</TableCell>
                        <TableCell align="right">Costo</TableCell>
                        <TableCell>Tarifa</TableCell>
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
                            <TableCell align="right">
                              <Stack spacing={0.25} alignItems="flex-end">
                                <Typography variant="body2">{formatTokens(row.totalTokens)}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatTokens(row.totalPromptTokens)} in / {formatTokens(row.totalCompletionTokens)} out
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(row.totalCostUsd)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="caption" color="text.secondary">
                                  {formatPricing(row.pricing)}
                                </Typography>
                                {row.pricing?.source === 'default' && (
                                  <Chip label="default" size="small" color="warning" variant="outlined" />
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
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
