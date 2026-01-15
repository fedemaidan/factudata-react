import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import {
  Box, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, MenuItem, Select, InputLabel, FormControl,
  InputAdornment, Link as MuiLink, Button, Tabs, Tab, Card, CardContent, Grid,
  Chip, Divider, LinearProgress, Tooltip, Collapse, List, ListItem, ListItemText,
  ListItemIcon, Avatar, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LaunchIcon from '@mui/icons-material/Launch';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PhoneIcon from '@mui/icons-material/Phone';
import CampaignIcon from '@mui/icons-material/Campaign';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TimelineIcon from '@mui/icons-material/Timeline';
import LinkIcon from '@mui/icons-material/Link';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import LeadsService from 'src/services/leadsService';

import * as XLSX from 'xlsx';

// ==================== COMPONENTES DE DASHBOARD ====================

// Tarjeta de métrica individual
const MetricCard = ({ title, value, subtitle, icon, color = 'primary', trend, trendValue, onClick, selected }) => (
  <Card 
    sx={{ 
      height: '100%', 
      cursor: onClick ? 'pointer' : 'default',
      border: selected ? 2 : 0,
      borderColor: `${color}.main`,
      transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {}
    }}
    onClick={onClick}
  >
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 700, color: `${color}.main` }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
              {trend === 'up' ? (
                <TrendingUpIcon color="success" fontSize="small" />
              ) : (
                <TrendingDownIcon color="error" fontSize="small" />
              )}
              <Typography variant="caption" color={trend === 'up' ? 'success.main' : 'error.main'}>
                {trendValue}
              </Typography>
            </Stack>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

// Tarjeta de estadísticas de match
const MatchStatsCard = ({ title, conCampana, sinCampana, conTelefono, sinTelefono, conCampanaSinTel, total, period, details, color = 'info' }) => {
  const [expanded, setExpanded] = useState(false);
  const flujoRate = conCampana > 0 ? (((conCampana - conCampanaSinTel) / conCampana) * 100).toFixed(0) : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
          <Chip label={period} size="small" color={color} variant="outlined" />
        </Stack>
        
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main" fontWeight={700}>{total}</Typography>
              <Typography variant="caption" color="text.secondary">Total</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight={700}>{conTelefono}</Typography>
              <Typography variant="caption" color="text.secondary">Con Tel</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main" fontWeight={700}>{conCampana}</Typography>
              <Typography variant="caption" color="text.secondary">Con Campaña</Typography>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main" fontWeight={700}>{conCampanaSinTel}</Typography>
              <Typography variant="caption" color="text.secondary">Sin WhatsApp</Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mb: 1 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2">Flujo completo (campaña → WhatsApp)</Typography>
            <Typography variant="body2" fontWeight={600}>{flujoRate}%</Typography>
          </Stack>
          <LinearProgress 
            variant="determinate" 
            value={Number(flujoRate)} 
            sx={{ height: 8, borderRadius: 4 }}
            color={Number(flujoRate) >= 80 ? 'success' : Number(flujoRate) >= 50 ? 'warning' : 'error'}
          />
        </Box>

        {details && details.length > 0 && (
          <>
            <Button 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ mt: 1 }}
            >
              {expanded ? 'Ocultar detalle' : 'Ver detalle'}
            </Button>
            <Collapse in={expanded}>
              <List dense sx={{ mt: 1, maxHeight: 250, overflow: 'auto' }}>
                {details.slice(0, 10).map((lead, idx) => (
                  <ListItem key={idx} divider sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {lead.utm_campaign ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <CancelIcon color="error" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={lead.nombre || lead.phone || 'Sin nombre'}
                        secondary={`${lead.utm_campaign || 'Sin campaña'} • ${fmtDateTime(lead.createdAt)}`}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </Stack>
                    {lead.saludoInicial && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        sx={{ 
                          mt: 0.5, 
                          pl: 4, 
                          fontStyle: 'italic',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        "{lead.saludoInicial}"
                      </Typography>
                    )}
                  </ListItem>
                ))}
                {details.length > 10 && (
                  <ListItem>
                    <ListItemText 
                      primary={`... y ${details.length - 10} más`}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Panel de ideas y sugerencias
const InsightsPanel = ({ stats }) => {
  const insights = useMemo(() => {
    const ideas = [];
    
    // Análisis de tendencia
    if (stats.today.total > stats.yesterday.total) {
      ideas.push({
        type: 'positive',
        title: 'Tendencia positiva',
        description: `Hoy llegaron ${stats.today.total - stats.yesterday.total} leads más que ayer.`
      });
    } else if (stats.today.total < stats.yesterday.total) {
      ideas.push({
        type: 'warning',
        title: 'Menos leads hoy',
        description: `Hoy llegaron ${stats.yesterday.total - stats.today.total} leads menos que ayer. Revisar campañas activas.`
      });
    }

    // Análisis de leads con campaña
    const todayCampaignRate = stats.today.total > 0 ? (stats.today.conCampana / stats.today.total) * 100 : 0;
    const weekCampaignRate = stats.week.total > 0 ? (stats.week.conCampana / stats.week.total) * 100 : 0;
    
    if (todayCampaignRate < weekCampaignRate - 10) {
      ideas.push({
        type: 'warning',
        title: 'Menos leads con campaña hoy',
        description: `Solo ${todayCampaignRate.toFixed(1)}% de leads hoy tienen campaña, vs ${weekCampaignRate.toFixed(1)}% promedio semanal.`
      });
    }

    // Leads con campaña pero sin teléfono (no completaron el flujo)
    if (stats.today.conCampanaSinTel > 0) {
      ideas.push({
        type: 'warning',
        title: 'Leads sin WhatsApp',
        description: `${stats.today.conCampanaSinTel} leads de hoy tienen campaña pero no enviaron WhatsApp. Posible abandono del flujo.`
      });
    }

    // Tasa de conversión del flujo (campaña → WhatsApp)
    if (stats.week.conCampana > 0) {
      const flujoCompleto = stats.week.conCampana - stats.week.conCampanaSinTel;
      const tasaFlujo = (flujoCompleto / stats.week.conCampana) * 100;
      if (tasaFlujo < 80) {
        ideas.push({
          type: 'action',
          title: 'Flujo incompleto',
          description: `Solo ${tasaFlujo.toFixed(0)}% de leads con campaña completaron el flujo de WhatsApp esta semana.`
        });
      }
    }

    // UTM con mejor rendimiento
    if (stats.topUtm) {
      ideas.push({
        type: 'info',
        title: 'Mejor campaña',
        description: `"${stats.topUtm.name}" generó ${stats.topUtm.count} leads esta semana. ${stats.topUtm.conTel} enviaron WhatsApp (${stats.topUtm.convRate.toFixed(0)}% conversión).`
      });
    }

    // Leads sin campaña que necesitan atención
    if (stats.today.sinCampana > 0) {
      ideas.push({
        type: 'info',
        title: 'Leads sin campaña',
        description: `Hay ${stats.today.sinCampana} leads de hoy sin campaña identificada. Podrían ser tráfico orgánico o directo.`
      });
    }

    // Promedio diario
    const dailyAvg = stats.week.total / 7;
    ideas.push({
      type: 'info',
      title: 'Promedio semanal',
      description: `Promedio: ${dailyAvg.toFixed(1)} leads/día. Total semana: ${stats.week.total} leads.`
    });

    return ideas;
  }, [stats]);

  const getChipColor = (type) => {
    switch (type) {
      case 'positive': return 'success';
      case 'warning': return 'warning';
      case 'action': return 'error';
      default: return 'info';
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <LightbulbIcon color="warning" />
          <Typography variant="h6" fontWeight={600}>Insights y Sugerencias</Typography>
        </Stack>
        <Stack spacing={2}>
          {insights.map((insight, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Chip label={insight.type} size="small" color={getChipColor(insight.type)} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>{insight.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Panel de campañas por período (Hoy, Ayer, Semana)
const CampaignsByPeriodPanel = ({ todayLeads, yesterdayLeads, weekLeads }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const getCampaignStats = useCallback((leads) => {
    const byUtm = {};
    leads.forEach(lead => {
      const utm = lead.utm_campaign || '(sin campaña)';
      if (!byUtm[utm]) {
        byUtm[utm] = { total: 0, conTel: 0, sinTel: 0 };
      }
      byUtm[utm].total++;
      if (lead.phone) {
        byUtm[utm].conTel++;
      } else {
        byUtm[utm].sinTel++;
      }
    });

    return Object.entries(byUtm)
      .map(([name, data]) => ({
        name,
        ...data,
        matchRate: data.total > 0 ? (data.conTel / data.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, []);

  const periods = useMemo(() => ({
    today: { label: 'Hoy', leads: todayLeads, color: 'primary' },
    yesterday: { label: 'Ayer', leads: yesterdayLeads, color: 'secondary' },
    week: { label: 'Última Semana', leads: weekLeads, color: 'info' }
  }), [todayLeads, yesterdayLeads, weekLeads]);

  const currentStats = useMemo(() => 
    getCampaignStats(periods[selectedPeriod].leads),
    [getCampaignStats, periods, selectedPeriod]
  );

  const totals = useMemo(() => {
    const leads = periods[selectedPeriod].leads;
    return {
      total: leads.length,
      conTel: leads.filter(l => l.phone).length,
      sinTel: leads.filter(l => !l.phone).length,
      conCampana: leads.filter(l => l.utm_campaign).length,
      sinCampana: leads.filter(l => !l.utm_campaign).length
    };
  }, [periods, selectedPeriod]);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CampaignIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>Leads por Campaña</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {Object.entries(periods).map(([key, { label, color }]) => (
              <Chip
                key={key}
                label={label}
                color={selectedPeriod === key ? color : 'default'}
                variant={selectedPeriod === key ? 'filled' : 'outlined'}
                onClick={() => setSelectedPeriod(key)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Stack>

        {/* Resumen del período */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2.4}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={700} color="primary.main">{totals.total}</Typography>
                <Typography variant="caption" color="text.secondary">Total Leads</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={700} color="success.main">{totals.conTel}</Typography>
                <Typography variant="caption" color="text.secondary">Con Teléfono</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={700} color="warning.main">{totals.sinTel}</Typography>
                <Typography variant="caption" color="text.secondary">Sin Teléfono</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={700} color="info.main">{totals.conCampana}</Typography>
                <Typography variant="caption" color="text.secondary">Con Campaña</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={700} color="text.secondary">{totals.sinCampana}</Typography>
                <Typography variant="caption" color="text.secondary">Sin Campaña</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabla de campañas */}
        {currentStats.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            No hay leads en este período
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Campaña</TableCell>
                <TableCell align="center">Total</TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <CheckCircleIcon fontSize="small" color="success" />
                    <span>Con Tel</span>
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <CancelIcon fontSize="small" color="warning" />
                    <span>Sin Tel</span>
                  </Stack>
                </TableCell>
                <TableCell align="center">% Match</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentStats.map((campaign, idx) => (
                <TableRow key={idx} hover sx={{ 
                  bgcolor: campaign.name === '(sin campaña)' ? 'grey.50' : 'inherit'
                }}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {campaign.name === '(sin campaña)' ? (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          {campaign.name}
                        </Typography>
                      ) : (
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {campaign.name}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={campaign.total} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600} color="success.main">{campaign.conTel}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600} color="warning.main">{campaign.sinTel}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${campaign.matchRate.toFixed(0)}%`}
                      size="small"
                      color={campaign.matchRate >= 80 ? 'success' : campaign.matchRate >= 50 ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {/* Fila de totales */}
              <TableRow sx={{ bgcolor: 'primary.lighter' }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>TOTAL</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight={700}>{totals.total}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight={700} color="success.main">{totals.conTel}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography fontWeight={700} color="warning.main">{totals.sinTel}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${totals.total > 0 ? ((totals.conTel / totals.total) * 100).toFixed(0) : 0}%`}
                    size="small"
                    color="primary"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// Panel de desglose por UTM Campaign
const UtmBreakdownPanel = ({ leads }) => {
  const utmStats = useMemo(() => {
    const byUtm = {};
    leads.forEach(lead => {
      const utm = lead.utm_campaign || '(sin campaña)';
      if (!byUtm[utm]) {
        byUtm[utm] = { total: 0, conTel: 0, sinTel: 0, leads: [] };
      }
      byUtm[utm].total++;
      if (lead.phone) {
        byUtm[utm].conTel++;
      } else {
        byUtm[utm].sinTel++;
      }
      byUtm[utm].leads.push(lead);
    });

    return Object.entries(byUtm)
      .map(([name, data]) => ({
        name,
        total: data.total,
        conTel: data.conTel,
        sinTel: data.sinTel,
        leads: data.leads,
        hasMessage: data.leads.filter(l => l.saludoInicial).length,
        convRate: data.total > 0 ? (data.conTel / data.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const [expandedUtm, setExpandedUtm] = useState(null);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CampaignIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>Desglose por Campaña (Semana)</Typography>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Campaña</TableCell>
              <TableCell align="center">Total</TableCell>
              <TableCell align="center">Con Tel</TableCell>
              <TableCell align="center">Sin Tel</TableCell>
              <TableCell align="center">% Conv</TableCell>
              <TableCell align="center">Ver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {utmStats.slice(0, 8).map((utm, idx) => (
              <>
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      {utm.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={utm.total} size="small" color="primary" />
                  </TableCell>
                  <TableCell align="center">
                    <Typography color="success.main" fontWeight={600}>{utm.conTel}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography color="warning.main" fontWeight={600}>{utm.sinTel}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`${utm.convRate.toFixed(0)}%`} 
                      size="small" 
                      color={utm.convRate >= 80 ? 'success' : utm.convRate >= 50 ? 'warning' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      onClick={() => setExpandedUtm(expandedUtm === utm.name ? null : utm.name)}
                    >
                      {expandedUtm === utm.name ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                {expandedUtm === utm.name && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ bgcolor: 'grey.50', py: 0 }}>
                      <Collapse in={expandedUtm === utm.name}>
                        <Box sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                          {utm.leads.slice(0, 5).map((lead, lidx) => (
                            <Paper key={lidx} variant="outlined" sx={{ p: 1.5, mb: 1, borderLeft: 3, borderColor: lead.phone ? 'success.main' : 'warning.main' }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" fontWeight={600}>
                                      {lead.nombre || lead.phone || 'Sin nombre'}
                                    </Typography>
                                    {lead.phone ? (
                                      <Chip icon={<PhoneIcon />} label="Con Tel" size="small" color="success" variant="outlined" />
                                    ) : (
                                      <Chip label="Sin WhatsApp" size="small" color="warning" variant="outlined" />
                                    )}
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary">
                                    {lead.phone || 'Sin teléfono'} • {fmtDateTime(lead.createdAt)}
                                  </Typography>
                                </Box>
                              </Stack>
                              {lead.saludoInicial && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mt: 1, 
                                    p: 1, 
                                    bgcolor: 'background.paper', 
                                    borderRadius: 1,
                                    borderLeft: 3,
                                    borderColor: 'primary.main',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  "{lead.saludoInicial}"
                                </Typography>
                              )}
                            </Paper>
                          ))}
                          {utm.leads.length > 5 && (
                            <Typography variant="caption" color="text.secondary">
                              ... y {utm.leads.length - 5} más
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
        {utmStats.length > 8 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Mostrando top 8 de {utmStats.length} campañas
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== COMPONENTE PARA POSIBLES MATCHES ====================

// Calcular diferencia de tiempo en minutos
const getTimeDiffMinutes = (date1, date2) => {
  const d1 = toDateSafe(date1);
  const d2 = toDateSafe(date2);
  if (!d1 || !d2) return Infinity;
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60);
};

// Formatear diferencia de tiempo
const formatTimeDiff = (minutes) => {
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Panel de posibles matches
const PotentialMatchesPanel = ({ leads, maxTimeDiff = 10, onMatch, onRefresh }) => {
  const [timeDiffFilter, setTimeDiffFilter] = useState(maxTimeDiff);
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [matchingId, setMatchingId] = useState(null); // ID del lead que está siendo matcheado
  const [matchedIds, setMatchedIds] = useState(new Set()); // IDs de leads ya matcheados
  const [realMessages, setRealMessages] = useState({}); // Cache de mensajes reales por phone
  const [loadingMessages, setLoadingMessages] = useState({}); // Estado de carga por phone

  const handleMatch = async (leadCampanaId, leadTelefonoId) => {
    if (!onMatch) return;
    setMatchingId(leadCampanaId);
    try {
      await onMatch(leadCampanaId, leadTelefonoId);
      setMatchedIds(prev => new Set([...prev, leadCampanaId, leadTelefonoId]));
    } finally {
      setMatchingId(null);
    }
  };

  // Cargar primer mensaje real de conversación
  const loadRealMessage = async (phone) => {
    if (realMessages[phone] || loadingMessages[phone]) return;
    
    setLoadingMessages(prev => ({ ...prev, [phone]: true }));
    try {
      const result = await LeadsService.getPrimerMensaje(phone);
      setRealMessages(prev => ({ ...prev, [phone]: result }));
    } catch (e) {
      console.error('Error cargando mensaje real:', e);
      setRealMessages(prev => ({ ...prev, [phone]: { found: false, error: true } }));
    } finally {
      setLoadingMessages(prev => ({ ...prev, [phone]: false }));
    }
  };

  // Separar leads
  const { conCampanaSinTel, conTelSinCampana, potentialMatches } = useMemo(() => {
    const conCampanaSinTel = leads.filter(l => l.utm_campaign && !l.phone);
    const conTelSinCampana = leads.filter(l => l.phone && !l.utm_campaign);
    
    // Buscar posibles matches basados en tiempo
    const matches = [];
    
    conCampanaSinTel.forEach(leadCampana => {
      const campaniaTime = toDateSafe(leadCampana.createdAt);
      if (!campaniaTime) return;
      
      const possibleMatches = conTelSinCampana
        .map(leadTel => {
          const timeDiff = getTimeDiffMinutes(leadCampana.createdAt, leadTel.createdAt);
          return { lead: leadTel, timeDiff };
        })
        .filter(m => m.timeDiff <= timeDiffFilter)
        .sort((a, b) => a.timeDiff - b.timeDiff);
      
      if (possibleMatches.length > 0) {
        matches.push({
          leadCampana,
          possibleMatches,
          bestMatch: possibleMatches[0]
        });
      }
    });
    
    // Ordenar por mejor match (menor diferencia de tiempo)
    matches.sort((a, b) => a.bestMatch.timeDiff - b.bestMatch.timeDiff);
    
    return { conCampanaSinTel, conTelSinCampana, potentialMatches: matches };
  }, [leads, timeDiffFilter]);

  const getConfidenceColor = (timeDiff) => {
    if (timeDiff <= 2) return 'success';
    if (timeDiff <= 5) return 'info';
    if (timeDiff <= 10) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (timeDiff) => {
    if (timeDiff <= 2) return 'Muy probable';
    if (timeDiff <= 5) return 'Probable';
    if (timeDiff <= 10) return 'Posible';
    return 'Poco probable';
  };

  return (
    <Stack spacing={3}>
      {/* Resumen */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                  <CampaignIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {conCampanaSinTel.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Con campaña, sin WhatsApp
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                  <PhoneIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {conTelSinCampana.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Con WhatsApp, sin campaña
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.lighter' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: 'success.main', color: 'white' }}>
                  <LinkIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {potentialMatches.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Posibles matches encontrados
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtro de tiempo */}
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <AccessTimeIcon color="action" />
          <Typography variant="body2">Diferencia máxima de tiempo:</Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={timeDiffFilter}
              onChange={(e) => setTimeDiffFilter(e.target.value)}
            >
              <MenuItem value={2}>2 minutos (muy probable)</MenuItem>
              <MenuItem value={5}>5 minutos (probable)</MenuItem>
              <MenuItem value={10}>10 minutos (posible)</MenuItem>
              <MenuItem value={30}>30 minutos</MenuItem>
              <MenuItem value={60}>1 hora</MenuItem>
              <MenuItem value={1440}>24 horas</MenuItem>
            </Select>
          </FormControl>
          <Chip 
            label={`${potentialMatches.length} coincidencias`} 
            color="success" 
            variant="outlined" 
          />
        </Stack>
      </Paper>

      {/* Lista de posibles matches */}
      {potentialMatches.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No se encontraron posibles matches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intenta aumentar la diferencia máxima de tiempo o verifica que haya leads en ambos grupos.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {potentialMatches.map((match, idx) => (
            <Card key={idx} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  {/* Header del match */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip 
                        icon={<AccessTimeIcon />}
                        label={formatTimeDiff(match.bestMatch.timeDiff)}
                        color={getConfidenceColor(match.bestMatch.timeDiff)}
                        size="small"
                      />
                      <Chip 
                        label={getConfidenceLabel(match.bestMatch.timeDiff)}
                        color={getConfidenceColor(match.bestMatch.timeDiff)}
                        variant="outlined"
                        size="small"
                      />
                      {match.possibleMatches.length > 1 && (
                        <Chip 
                          label={`+${match.possibleMatches.length - 1} alternativas`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                    <IconButton 
                      size="small"
                      onClick={() => setExpandedMatch(expandedMatch === idx ? null : idx)}
                    >
                      {expandedMatch === idx ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>

                  {/* Comparación visual */}
                  <Grid container spacing={2} alignItems="stretch">
                    {/* Lead con campaña (sin tel) */}
                    <Grid item xs={12} md={5}>
                      <Paper sx={{ p: 2, bgcolor: 'warning.lighter', height: '100%' }}>
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CampaignIcon color="warning" />
                            <Typography variant="subtitle2" fontWeight={600}>
                              Lead con Campaña
                            </Typography>
                          </Stack>
                          <Divider />
                          <Typography variant="body2">
                            <strong>Nombre:</strong> {match.leadCampana.nombre || '(sin nombre)'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Campaña:</strong> {match.leadCampana.utm_campaign}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Creado:</strong> {fmtDateTime(match.leadCampana.createdAt)}
                          </Typography>
                          {match.leadCampana.saludoInicial && (
                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">Mensaje:</Typography>
                              <Typography variant="body2" fontStyle="italic">
                                "{match.leadCampana.saludoInicial}"
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>

                    {/* Flecha de conexión */}
                    <Grid item xs={12} md={2}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        minHeight: 60
                      }}>
                        <CompareArrowsIcon sx={{ fontSize: 40, color: 'success.main' }} />
                      </Box>
                    </Grid>

                    {/* Lead con tel (sin campaña) - Mejor match */}
                    <Grid item xs={12} md={5}>
                      <Paper sx={{ p: 2, bgcolor: 'info.lighter', height: '100%' }}>
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon color="info" />
                            <Typography variant="subtitle2" fontWeight={600}>
                              Lead con WhatsApp
                            </Typography>
                            <Chip label="Mejor match" size="small" color="success" />
                          </Stack>
                          <Divider />
                          <Typography variant="body2">
                            <strong>Nombre:</strong> {match.bestMatch.lead.nombre || '(sin nombre)'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Teléfono:</strong> {match.bestMatch.lead.phone}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Creado:</strong> {fmtDateTime(match.bestMatch.lead.createdAt)}
                          </Typography>
                          {match.bestMatch.lead.saludoInicial && (
                            <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                              <Typography variant="caption" color="text.secondary">Mensaje guardado en lead:</Typography>
                              <Typography variant="body2" fontStyle="italic">
                                "{match.bestMatch.lead.saludoInicial}"
                              </Typography>
                            </Box>
                          )}
                          
                          {/* Mensaje real de la conversación */}
                          <Box sx={{ p: 1, bgcolor: 'success.lighter', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="success.dark" fontWeight={600}>
                                💬 Mensaje REAL en WhatsApp:
                              </Typography>
                              {!realMessages[match.bestMatch.lead.phone] && !loadingMessages[match.bestMatch.lead.phone] && (
                                <Button 
                                  size="small" 
                                  onClick={() => loadRealMessage(match.bestMatch.lead.phone)}
                                  sx={{ fontSize: '0.7rem', py: 0 }}
                                >
                                  Consultar
                                </Button>
                              )}
                            </Stack>
                            {loadingMessages[match.bestMatch.lead.phone] && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <CircularProgress size={14} />
                                <Typography variant="caption">Consultando...</Typography>
                              </Box>
                            )}
                            {realMessages[match.bestMatch.lead.phone]?.found && (
                              <Typography variant="body2" fontStyle="italic" color="success.dark" sx={{ mt: 0.5 }}>
                                "{realMessages[match.bestMatch.lead.phone].primerMensaje}"
                              </Typography>
                            )}
                            {realMessages[match.bestMatch.lead.phone]?.found === false && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {realMessages[match.bestMatch.lead.phone]?.serviceUnavailable 
                                  ? '⚠️ Servicio de conversaciones no disponible'
                                  : 'No se encontró mensaje'}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Botón de Match Manual */}
                  {!matchedIds.has(match.leadCampana.id) && !matchedIds.has(match.bestMatch.lead.id) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={matchingId === match.leadCampana.id ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
                        onClick={() => handleMatch(match.leadCampana.id, match.bestMatch.lead.id)}
                        disabled={matchingId !== null}
                      >
                        {matchingId === match.leadCampana.id ? 'Procesando...' : 'Hacer Match y Enviar a Facebook'}
                      </Button>
                    </Box>
                  )}
                  {(matchedIds.has(match.leadCampana.id) || matchedIds.has(match.bestMatch.lead.id)) && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="Match realizado ✓" 
                        color="success" 
                        variant="filled"
                      />
                    </Box>
                  )}

                  {/* Alternativas expandibles */}
                  <Collapse in={expandedMatch === idx}>
                    {match.possibleMatches.length > 1 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Otras posibles coincidencias:</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Confianza</TableCell>
                              <TableCell>Diferencia</TableCell>
                              <TableCell>Nombre</TableCell>
                              <TableCell>Teléfono</TableCell>
                              <TableCell>Creado</TableCell>
                              <TableCell>Mensaje</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {match.possibleMatches.slice(1, 6).map((alt, altIdx) => (
                              <TableRow key={altIdx} hover>
                                <TableCell>
                                  <Chip 
                                    label={getConfidenceLabel(alt.timeDiff)}
                                    color={getConfidenceColor(alt.timeDiff)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>{formatTimeDiff(alt.timeDiff)}</TableCell>
                                <TableCell>{alt.lead.nombre || '(sin nombre)'}</TableCell>
                                <TableCell>{alt.lead.phone}</TableCell>
                                <TableCell>{fmtDateTime(alt.lead.createdAt)}</TableCell>
                                <TableCell>
                                  <Tooltip title={alt.lead.saludoInicial || 'Sin mensaje'}>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                      {alt.lead.saludoInicial || '—'}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {match.possibleMatches.length > 6 && (
                          <Typography variant="caption" color="text.secondary">
                            ... y {match.possibleMatches.length - 6} más
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Collapse>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Listas sin match */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CampaignIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Sin posible match ({conCampanaSinTel.filter(l => !potentialMatches.find(m => m.leadCampana === l)).length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Leads con campaña que no tienen ninguna coincidencia temporal cercana
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Campaña</TableCell>
                      <TableCell>Creado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conCampanaSinTel
                      .filter(l => !potentialMatches.find(m => m.leadCampana === l))
                      .slice(0, 10)
                      .map((lead, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{lead.nombre || '(sin nombre)'}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {lead.utm_campaign}
                            </Typography>
                          </TableCell>
                          <TableCell>{fmtDateTime(lead.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Sin posible match ({conTelSinCampana.filter(l => !potentialMatches.find(m => m.possibleMatches.some(pm => pm.lead === l))).length})
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Leads con WhatsApp que no coinciden con ninguna campaña cercana
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Creado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conTelSinCampana
                      .filter(l => !potentialMatches.find(m => m.possibleMatches.some(pm => pm.lead === l)))
                      .slice(0, 10)
                      .map((lead, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{lead.nombre || '(sin nombre)'}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{fmtDateTime(lead.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

// ==================== FIN COMPONENTES DASHBOARD ====================

const emptyForm = {
  id: '',
  notionId: '',
  nombre: '',
  phone: '',
  rubro: '',
  saludoInicial: '',
  utm_campaign: '',
  fbp: '',
  ip: '',
  userAgent: '',
  status_sum: 'BOT',
  quiere_reunion: false,
  seguirFollowUP: false,
  proximo_mensaje: '',
  proximo_mensaje_vencimiento: '',
  createdAt: '',
  updatedAt: '',
  notionUrl: null,
};

function docId(row) {
  return row?.id || row?.notionId || row?.phone || '';
}

function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Utilidades para timestamps (string/number/Date/Firestore Timestamp) ---
function toDateSafe(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function') return v.toDate(); // Firestore Timestamp
    if ('seconds' in v) {
      const ms = v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
      return new Date(ms);
    }
  }
  return null;
}
function fmtDateTime(v) {
  const d = toDateSafe(v);
  return d ? d.toLocaleString() : '—';
}

// Para <input type="datetime-local"> requiere YYYY-MM-DDTHH:mm
function toDatetimeLocalValue(v) {
  const d = toDateSafe(v);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Default: última semana (incluye HOY como to, y from = hoy-6)
function getDefaultWeekFilter() {
  const today = new Date();
  const to = ymdLocal(today);
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 6);
  const from = ymdLocal(fromDate);
  return { field: 'created', mode: 'range', on: '', from, to };
}

const LeadsPage = () => {
  const [rows, setRows] = useState([]);
  const [allLeads, setAllLeads] = useState([]); // Para estadísticas generales
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [filters, setFilters] = useState(getDefaultWeekFilter());
  const [activeTab, setActiveTab] = useState(0); // 0 = Dashboard, 1 = Listado
  const [selectedPeriod, setSelectedPeriod] = useState(null); // Para filtrar detalle

  // Cargar todos los leads de la última semana para estadísticas
  const fetchAllForStats = useCallback(async () => {
    try {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      
      const params = {
        field: 'created',
        from: ymdLocal(weekAgo),
        to: ymdLocal(today)
      };
      
      const data = await LeadsService.listar(params);
      setAllLeads(data);
    } catch (e) {
      console.error('Error cargando stats:', e);
    }
  }, []);

  // Calcular estadísticas
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = ymdLocal(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = ymdLocal(yesterday);

    const getDateStr = (lead) => {
      const d = toDateSafe(lead.createdAt);
      return d ? ymdLocal(d) : null;
    };

    const todayLeads = allLeads.filter(l => getDateStr(l) === todayStr);
    const yesterdayLeads = allLeads.filter(l => getDateStr(l) === yesterdayStr);
    const weekLeads = allLeads;

    const calcStats = (leads) => ({
      total: leads.length,
      conCampana: leads.filter(l => l.utm_campaign).length,
      sinCampana: leads.filter(l => !l.utm_campaign).length,
      conTelefono: leads.filter(l => l.phone).length,
      sinTelefono: leads.filter(l => !l.phone).length,
      conCampanaSinTel: leads.filter(l => l.utm_campaign && !l.phone).length, // Tienen campaña pero no enviaron WhatsApp
      leads
    });

    // Calcular mejor UTM
    const utmMap = {};
    weekLeads.forEach(lead => {
      const utm = lead.utm_campaign || '(sin campaña)';
      if (!utmMap[utm]) utmMap[utm] = { total: 0, conTel: 0, sinTel: 0 };
      utmMap[utm].total++;
      if (lead.phone) {
        utmMap[utm].conTel++;
      } else {
        utmMap[utm].sinTel++;
      }
    });

    let topUtm = null;
    let maxCount = 0;
    Object.entries(utmMap).forEach(([name, data]) => {
      if (data.total > maxCount && name !== '(sin campaña)') {
        maxCount = data.total;
        const convRate = data.total > 0 ? (data.conTel / data.total) * 100 : 0;
        topUtm = { 
          name, 
          count: data.total,
          conTel: data.conTel,
          sinTel: data.sinTel,
          convRate
        };
      }
    });

    return {
      today: calcStats(todayLeads),
      yesterday: calcStats(yesterdayLeads),
      week: calcStats(weekLeads),
      topUtm
    };
  }, [allLeads]);

  const fetchBy = async (flt) => {
    setLoading(true);
    try {
      const { field, mode, on, from, to } = flt;
      const params = { field };
      if (mode === 'on' && on) params.on = on;
      if (mode === 'range') {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      const data = await LeadsService.listar(params);

      // Ordenar por updatedAt luego createdAt (manejando múltiples formatos)
      const ts = (r) =>
        (toDateSafe(r.updatedAt) || toDateSafe(r.createdAt) || new Date(0)).getTime();
      data.sort((a, b) => ts(b) - ts(a));

      setRows(data);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar leads', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const def = getDefaultWeekFilter();
    setFilters(def);
    fetchBy(def);
    fetchAllForStats(); // Cargar datos para estadísticas
  }, [fetchAllForStats]);

  const applyFilters = async () => { await fetchBy(filters); };
  const clearFilters = async () => {
    const def = getDefaultWeekFilter();
    setFilters(def);
    await fetchBy(def);
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(r => {
      const values = [
        docId(r),
        r?.nombre,
        r?.phone,
        r?.utm_campaign,
        r?.saludoInicial
      ].map(x => (x || '').toString().toLowerCase());
      return values.some(v => v.includes(qq));
    });
  }, [rows, q]);

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({ ...emptyForm, ...row, id: docId(row) });
    setOpenForm(true);
  };

  const validate = () => {
    if (!form.nombre?.trim()) return 'El nombre es requerido.';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setAlert({ open: true, message: err, severity: 'warning' });
      return;
    }
    try {
      const payload = {
        nombre: form.nombre || '',
        rubro: form.rubro || '',
        saludoInicial: form.saludoInicial || '',
        utm_campaign: form.utm_campaign || '',
        status_sum: form.status_sum || 'BOT',
        quiere_reunion: !!form.quiere_reunion,
        seguirFollowUP: !!form.seguirFollowUP,
        proximo_mensaje: form.proximo_mensaje || '',
        // Guardamos lo que hay en el input (YYYY-MM-DDTHH:mm).
        // Si tu backend necesita ISO UTC, convertir aquí con new Date(value).toISOString()
        proximo_mensaje_vencimiento: form.proximo_mensaje_vencimiento || '',
      };
      const idForUpdate = form.id;
      await LeadsService.actualizar(idForUpdate, payload);
      setAlert({ open: true, message: 'Lead actualizado', severity: 'success' });
      setOpenForm(false);
      await fetchBy(filters);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error guardando el lead', severity: 'error' });
    }
  };

  const confirmDelete = (row) => {
    setToDelete(docId(row));
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await LeadsService.eliminar(toDelete);
      setAlert({ open: true, message: 'Lead eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetchBy(filters);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando lead', severity: 'error' });
    }
  };

  // Match manual entre dos leads
  const handleMatchManual = async (leadCampanaId, leadTelefonoId) => {
    try {
      const result = await LeadsService.matchManual(leadCampanaId, leadTelefonoId);
      setAlert({ 
        open: true, 
        message: '✅ Match realizado y evento enviado a Facebook', 
        severity: 'success' 
      });
      // Refrescar los datos
      await fetchAllForStats();
      return result;
    } catch (e) {
      console.error('Error en match manual:', e);
      setAlert({ 
        open: true, 
        message: `Error: ${e.response?.data?.error || e.message}`, 
        severity: 'error' 
      });
      throw e;
    }
  };

  const handleExportExcel = () => {
    if (!filtered || filtered.length === 0) {
      setAlert({ open: true, message: 'No hay datos para exportar', severity: 'info' });
      return;
    }

    const rowsForXlsx = filtered.map(r => {
      const notionUrl = r?.notionUrl || (r?.notionId ? `https://www.notion.so/${r.notionId}` : '');
      return {
        ID: docId(r),
        Telefono: r?.phone || '',
        Nombre: r?.nombre || '',
        Rubro: r?.rubro || '',
        Saludo: r?.saludoInicial || '',
        'UTM Campaign': r?.utm_campaign || '',
        'Estado': r?.status_sum || '',
        'Quiere reunión': r?.quiere_reunion ? 'Sí' : 'No',
        'Seguir FollowUp': r?.seguirFollowUP ? 'Sí' : 'No',
        'Próximo mensaje': r?.proximo_mensaje || '',
        'Venc. próximo mensaje': r?.proximo_mensaje_vencimiento ? fmtDateTime(r.proximo_mensaje_vencimiento) : '',
        'Notion ID': r?.notionId || '',
        'Notion URL': notionUrl,
        IP: r?.ip || '',
        FBP: r?.fbp || '',
        'User Agent': r?.userAgent || '',
        'Creado': r?.createdAt ? fmtDateTime(r.createdAt) : '',
        'Actualizado': r?.updatedAt ? fmtDateTime(r.updatedAt) : '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rowsForXlsx);
    const headers = Object.keys(rowsForXlsx[0] || {});
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, h.length + 2) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const field = (filters?.field || 'created');
    const mode = (filters?.mode || 'range');
    const fname = `leads_${field}_${mode}_${ts}.xlsx`;

    XLSX.writeFile(wb, fname);
    setAlert({ open: true, message: 'Excel generado', severity: 'success' });
  };

  // Función para seleccionar período y ver detalle
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(selectedPeriod === period ? null : period);
  };

  // Leads filtrados por período seleccionado (para el detalle)
  const periodFilteredLeads = useMemo(() => {
    if (!selectedPeriod) return null;
    return stats[selectedPeriod]?.leads || [];
  }, [selectedPeriod, stats]);

  return (
    <>
      <Head><title>Leads - Dashboard</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {/* Header con pestañas */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">Leads</Typography>
              <Button variant="outlined" onClick={handleExportExcel}>
                Exportar Excel
              </Button>
            </Stack>

            <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                <Tab icon={<TimelineIcon />} iconPosition="start" label="Dashboard" />
                <Tab icon={<LinkIcon />} iconPosition="start" label="Posibles Matches" />
                <Tab icon={<PeopleIcon />} iconPosition="start" label="Listado de Leads" />
              </Tabs>
            </Paper>

            {/* ==================== TAB 0: DASHBOARD ==================== */}
            {activeTab === 0 && (
              <Stack spacing={3}>
                {/* Métricas principales */}
                <Typography variant="h6" color="text.secondary">
                  Resumen de Leads
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="Hoy"
                      value={stats.today.total}
                      subtitle={`${stats.today.conTelefono} con tel • ${stats.today.conCampanaSinTel} sin WhatsApp`}
                      icon={<TodayIcon />}
                      color="primary"
                      onClick={() => handlePeriodSelect('today')}
                      selected={selectedPeriod === 'today'}
                      trend={stats.today.total >= stats.yesterday.total ? 'up' : 'down'}
                      trendValue={stats.today.total >= stats.yesterday.total 
                        ? `+${stats.today.total - stats.yesterday.total} vs ayer`
                        : `${stats.today.total - stats.yesterday.total} vs ayer`}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="Ayer"
                      value={stats.yesterday.total}
                      subtitle={`${stats.yesterday.conTelefono} con tel • ${stats.yesterday.conCampanaSinTel} sin WhatsApp`}
                      icon={<DateRangeIcon />}
                      color="secondary"
                      onClick={() => handlePeriodSelect('yesterday')}
                      selected={selectedPeriod === 'yesterday'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="Última Semana"
                      value={stats.week.total}
                      subtitle={`${stats.week.conTelefono} con tel • ${stats.week.conCampanaSinTel} sin WhatsApp`}
                      icon={<PeopleIcon />}
                      color="info"
                      onClick={() => handlePeriodSelect('week')}
                      selected={selectedPeriod === 'week'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                      title="Completaron Flujo"
                      value={`${stats.week.conCampana > 0 ? (((stats.week.conCampana - stats.week.conCampanaSinTel) / stats.week.conCampana) * 100).toFixed(0) : 0}%`}
                      subtitle={`${stats.week.conCampanaSinTel} sin WhatsApp de ${stats.week.conCampana} con campaña`}
                      icon={<PhoneIcon />}
                      color={stats.week.conCampana > 0 && ((stats.week.conCampana - stats.week.conCampanaSinTel) / stats.week.conCampana) >= 0.8 ? 'success' : 'warning'}
                    />
                  </Grid>
                </Grid>

                {/* Detalle del período seleccionado */}
                {selectedPeriod && periodFilteredLeads && (
                  <Paper sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6">
                        Detalle: {selectedPeriod === 'today' ? 'Hoy' : selectedPeriod === 'yesterday' ? 'Ayer' : 'Última Semana'}
                        <Chip label={`${periodFilteredLeads.length} leads`} size="small" sx={{ ml: 1 }} />
                        <Chip label={`${periodFilteredLeads.filter(l => l.phone).length} con tel`} size="small" color="success" sx={{ ml: 1 }} />
                        <Chip label={`${periodFilteredLeads.filter(l => l.utm_campaign && !l.phone).length} sin WhatsApp`} size="small" color="warning" sx={{ ml: 1 }} />
                      </Typography>
                      <Button size="small" onClick={() => setSelectedPeriod(null)}>Cerrar</Button>
                    </Stack>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Estado</TableCell>
                          <TableCell>Teléfono</TableCell>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Campaña</TableCell>
                          <TableCell>Mensaje Inicial</TableCell>
                          <TableCell>Hora</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {periodFilteredLeads.slice(0, 15).map((lead, idx) => (
                          <TableRow key={idx} hover sx={{ bgcolor: !lead.phone && lead.utm_campaign ? 'warning.lighter' : 'inherit' }}>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                {lead.phone ? (
                                  <Tooltip title="Envió WhatsApp">
                                    <CheckCircleIcon color="success" fontSize="small" />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="No envió WhatsApp">
                                    <CancelIcon color="warning" fontSize="small" />
                                  </Tooltip>
                                )}
                                {lead.utm_campaign ? (
                                  <Tooltip title="Con campaña">
                                    <CampaignIcon color="info" fontSize="small" />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Sin campaña">
                                    <CampaignIcon color="disabled" fontSize="small" />
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {lead.phone || <Typography variant="body2" color="warning.main" fontStyle="italic">Sin teléfono</Typography>}
                            </TableCell>
                            <TableCell>{lead.nombre || '(sin nombre)'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                {lead.utm_campaign || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={lead.saludoInicial || 'Sin mensaje'}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    cursor: 'help'
                                  }}
                                >
                                  {lead.saludoInicial || '—'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{fmtDateTime(lead.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {periodFilteredLeads.length > 15 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Mostrando 15 de {periodFilteredLeads.length} leads. 
                        <Button size="small" onClick={() => setActiveTab(1)}>Ver todos en Listado</Button>
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* Stats de Match por período */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <MatchStatsCard
                      title="Hoy"
                      conCampana={stats.today.conCampana}
                      sinCampana={stats.today.sinCampana}
                      conTelefono={stats.today.conTelefono}
                      sinTelefono={stats.today.sinTelefono}
                      conCampanaSinTel={stats.today.conCampanaSinTel}
                      total={stats.today.total}
                      period="Hoy"
                      details={stats.today.leads}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MatchStatsCard
                      title="Ayer"
                      conCampana={stats.yesterday.conCampana}
                      sinCampana={stats.yesterday.sinCampana}
                      conTelefono={stats.yesterday.conTelefono}
                      sinTelefono={stats.yesterday.sinTelefono}
                      conCampanaSinTel={stats.yesterday.conCampanaSinTel}
                      total={stats.yesterday.total}
                      period="Ayer"
                      details={stats.yesterday.leads}
                      color="secondary"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MatchStatsCard
                      title="Última Semana"
                      conCampana={stats.week.conCampana}
                      sinCampana={stats.week.sinCampana}
                      conTelefono={stats.week.conTelefono}
                      sinTelefono={stats.week.sinTelefono}
                      conCampanaSinTel={stats.week.conCampanaSinTel}
                      total={stats.week.total}
                      period="7 días"
                      details={stats.week.leads}
                      color="info"
                    />
                  </Grid>
                </Grid>

                {/* Panel de campañas por período */}
                <CampaignsByPeriodPanel 
                  todayLeads={stats.today.leads}
                  yesterdayLeads={stats.yesterday.leads}
                  weekLeads={stats.week.leads}
                />

                {/* Desglose por UTM y Insights */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <UtmBreakdownPanel leads={allLeads} />
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <InsightsPanel stats={stats} />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {/* ==================== TAB 1: POSIBLES MATCHES ==================== */}
            {activeTab === 1 && (
              <Stack spacing={3}>
                <Typography variant="h6" color="text.secondary">
                  Encuentra leads que podrían ser la misma persona
                </Typography>
                <Alert severity="info">
                  Esta herramienta busca coincidencias entre leads que tienen campaña pero no enviaron WhatsApp,
                  y leads que enviaron WhatsApp pero no tienen campaña asignada, basándose en la cercanía temporal.
                </Alert>
                <PotentialMatchesPanel 
                  leads={allLeads} 
                  maxTimeDiff={10} 
                  onMatch={handleMatchManual}
                  onRefresh={fetchAllForStats}
                />
              </Stack>
            )}

            {/* ==================== TAB 2: LISTADO ==================== */}
            {activeTab === 2 && (
              <Stack spacing={3}>
                <TextField
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por Teléfono / Nombre / UTM…"
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                />

                <Paper sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                    <FormControl sx={{ minWidth: 160 }}>
                      <InputLabel id="field-label">Campo</InputLabel>
                      <Select
                        labelId="field-label"
                        value={filters.field}
                        onChange={(e) => setFilters(prev => ({ ...prev, field: e.target.value }))}
                      >
                        <MenuItem value="created">Creado (createdAt)</MenuItem>
                        <MenuItem value="updated">Actualizado (updatedAt)</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 140 }}>
                      <InputLabel id="mode-label">Modo</InputLabel>
                      <Select
                        labelId="mode-label"
                        value={filters.mode}
                        onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value }))}
                      >
                        <MenuItem value="on">Un día</MenuItem>
                        <MenuItem value="range">Rango</MenuItem>
                      </Select>
                    </FormControl>

                    {filters.mode === 'on' ? (
                      <TextField
                        label="Día"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={filters.on}
                        onChange={(e) => setFilters(prev => ({ ...prev, on: e.target.value }))}
                        sx={{ minWidth: 200 }}
                      />
                    ) : (
                      <>
                        <TextField
                          label="Desde"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={filters.from}
                          onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                          sx={{ minWidth: 200 }}
                        />
                        <TextField
                          label="Hasta"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={filters.to}
                          onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                          sx={{ minWidth: 200 }}
                        />
                      </>
                    )}

                    <Button variant="contained" onClick={applyFilters} disabled={loading}>
                      Filtrar
                    </Button>
                    <Button onClick={clearFilters} disabled={loading}>
                      Limpiar
                    </Button>
                  </Stack>
                </Paper>

                {/* Resumen rápido del listado actual */}
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack direction="row" spacing={4} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2">
                      <strong>{filtered.length}</strong> leads en el listado
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography variant="body2">
                        {filtered.filter(l => l.utm_campaign).length} con campaña
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CancelIcon color="error" fontSize="small" />
                      <Typography variant="body2">
                        {filtered.filter(l => !l.utm_campaign).length} sin campaña
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>

                <Paper>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Estado</TableCell>
                        <TableCell>Teléfono</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Campaña</TableCell>
                        <TableCell sx={{ minWidth: 250 }}>Mensaje Inicial</TableCell>
                        <TableCell>Creado</TableCell>
                        <TableCell>Actualizado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((row) => {
                        const id = docId(row);
                        return (
                          <TableRow key={id} hover>
                            <TableCell>
                              {row.utm_campaign ? (
                                <Tooltip title="Con campaña">
                                  <CheckCircleIcon color="success" />
                                </Tooltip>
                              ) : (
                                <Tooltip title="Sin campaña">
                                  <CancelIcon color="error" />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell>{row.phone || <em>(—)</em>}</TableCell>
                            <TableCell>{row.nombre || <em>(sin nombre)</em>}</TableCell>
                            <TableCell>
                              <Chip 
                                label={row.utm_campaign || 'Sin campaña'} 
                                size="small" 
                                color={row.utm_campaign ? 'primary' : 'default'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={row.saludoInicial || 'Sin mensaje'} arrow>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    maxWidth: 300, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    cursor: row.saludoInicial ? 'help' : 'default',
                                    fontStyle: row.saludoInicial ? 'normal' : 'italic',
                                    color: row.saludoInicial ? 'text.primary' : 'text.disabled'
                                  }}
                                >
                                  {row.saludoInicial || '(sin mensaje)'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{fmtDateTime(row.createdAt)}</TableCell>
                            <TableCell>{fmtDateTime(row.updatedAt)}</TableCell>
                            <TableCell align="right">
                              <IconButton color="primary" onClick={() => handleOpenEdit(row)}><EditIcon /></IconButton>
                              <IconButton color="error" onClick={() => confirmDelete(row)}><DeleteIcon /></IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!loading && filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <Typography variant="body2">Sin resultados.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </Stack>
            )}
          </Stack>
        </Container>

        <Snackbar open={alert.open} autoHideDuration={3500} onClose={closeAlert}>
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Diálogo editar */}
        <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
          <DialogTitle>Editar lead</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="ID" value={form.id} disabled />
              <TextField label="notionId" value={form.notionId} disabled />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Rubro"
                  value={form.rubro}
                  onChange={(e) => setForm({ ...form, rubro: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel id="estado-label">Estado (status_sum)</InputLabel>
                  <Select
                    labelId="estado-label"
                    label="Estado (status_sum)"
                    value={form.status_sum}
                    onChange={(e) => setForm({ ...form, status_sum: e.target.value })}
                  >
                    <MenuItem value="BOT">BOT</MenuItem>
                    <MenuItem value="HUMANO">HUMANO</MenuItem>
                    <MenuItem value="CERRADO">CERRADO</MenuItem>
                    <MenuItem value="DESCARTADO">DESCARTADO</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="reunion-label">¿Quiere reunión?</InputLabel>
                  <Select
                    labelId="reunion-label"
                    label="¿Quiere reunión?"
                    value={form.quiere_reunion ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, quiere_reunion: e.target.value === '1' })}
                  >
                    <MenuItem value="1">Sí</MenuItem>
                    <MenuItem value="0">No</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="seguirfu-label">¿Seguir FollowUp?</InputLabel>
                  <Select
                    labelId="seguirfu-label"
                    label="¿Seguir FollowUp?"
                    value={form.seguirFollowUP ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, seguirFollowUP: e.target.value === '1' })}
                  >
                    <MenuItem value="1">Sí</MenuItem>
                    <MenuItem value="0">No</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Próximo mensaje"
                multiline
                minRows={2}
                value={form.proximo_mensaje}
                onChange={(e) => setForm({ ...form, proximo_mensaje: e.target.value })}
              />

              <TextField
                label="Vencimiento del próximo mensaje"
                type="datetime-local"
                value={toDatetimeLocalValue(form.proximo_mensaje_vencimiento)}
                onChange={(e) =>
                  setForm({ ...form, proximo_mensaje_vencimiento: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Saludo inicial"
                value={form.saludoInicial}
                onChange={(e) => setForm({ ...form, saludoInicial: e.target.value })}
              />
              <TextField
                label="UTM Campaign"
                value={form.utm_campaign}
                onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
              />

              {/* Técnicos solo lectura */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="IP" value={form.ip || ''} disabled />
                <TextField fullWidth label="FBP" value={form.fbp || ''} disabled />
              </Stack>
              <TextField label="User Agent" value={form.userAgent || ''} disabled multiline minRows={2} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="createdAt" value={fmtDateTime(form.createdAt)} disabled />
                <TextField fullWidth label="updatedAt" value={fmtDateTime(form.updatedAt)} disabled />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>Guardar cambios</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo eliminar */}
        <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
          <DialogTitle>Eliminar lead</DialogTitle>
          <DialogContent>¿Seguro que querés eliminar <strong>{toDelete}</strong>?</DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

LeadsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default LeadsPage;
