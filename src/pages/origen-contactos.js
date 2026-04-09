import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import { LineChart } from '@mui/x-charts/LineChart';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import LeadsService from 'src/services/leadsService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ORIGEN_CONFIG = {
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    chipColor: 'info',
    icon: <FacebookIcon sx={{ fontSize: 18 }} />,
    bgAvatar: '#e8f0fe',
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    chipColor: 'error',
    icon: <InstagramIcon sx={{ fontSize: 18 }} />,
    bgAvatar: '#fce4ec',
  },
  noDefinido: {
    label: 'No definido',
    color: '#9E9E9E',
    chipColor: 'default',
    icon: <HelpOutlineIcon sx={{ fontSize: 18 }} />,
    bgAvatar: '#f5f5f5',
  },
};

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

const StatCard = ({ label, count, total, config, selected, onClick }) => {
  const percentage = pct(count, total);
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: selected ? 2 : 1,
        borderColor: selected ? config.color : 'divider',
        transition: 'all 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" mb={1.5}>
          <Avatar sx={{ bgcolor: config.bgAvatar, color: config.color, width: 44, height: 44 }}>
            {config.icon}
          </Avatar>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: config.color }}>
              {count}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': { bgcolor: config.color, borderRadius: 3 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 34 }}>
            {percentage}%
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ─── Estado SDR Chip ─────────────────────────────────────────────────────────

const ESTADO_SDR_CONFIG = {
  nuevo:                 { label: 'Nuevo',              color: 'default' },
  contactado:            { label: 'Contactado',         color: 'info' },
  calificado:            { label: 'Calificado',         color: 'primary' },
  cierre:                { label: 'Cierre',             color: 'warning' },
  ganado:                { label: 'Ganado',             color: 'success' },
  no_contacto:           { label: 'Sin contacto',       color: 'default' },
  no_responde:           { label: 'No responde',        color: 'default' },
  revisar_mas_adelante:  { label: 'Revisar después',    color: 'warning' },
  no_califica:           { label: 'No califica',        color: 'error' },
  perdido:               { label: 'Perdido',            color: 'error' },
};

const EstadoSDRChip = ({ estado }) => {
  if (!estado) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const cfg = ESTADO_SDR_CONFIG[estado] || { label: estado, color: 'default' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      color={cfg.color}
      variant="outlined"
      sx={{ height: 20, fontSize: '0.68rem' }}
    />
  );
};

// ─── Origin Chip ─────────────────────────────────────────────────────────────

const OrigenChip = ({ origen }) => {
  const cfg = ORIGEN_CONFIG[origen] || ORIGEN_CONFIG.noDefinido;
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.bgAvatar,
        color: cfg.color,
        fontWeight: 600,
        '& .MuiChip-icon': { color: cfg.color },
      }}
    />
  );
};

// ─── Helpers de agrupación ──────────────────────────────────────────────────

function getWeekKey(iso) {
  const d = new Date(iso);
  // lunes de esa semana
  const day = d.getDay(); // 0=dom
  const diff = (day === 0 ? -6 : 1 - day);
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diff);
  return lunes.toISOString().slice(0, 10); // YYYY-MM-DD del lunes
}

function getMonthKey(iso) {
  return iso ? iso.slice(0, 7) : null; // YYYY-MM
}

function labelSemana(key) {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function labelMes(key) {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}

function agruparLeads(leads, agrupacion) {
  const getKey = agrupacion === 'semana' ? getWeekKey : getMonthKey;
  const getLabel = agrupacion === 'semana' ? labelSemana : labelMes;

  const mapa = {}; // key → { facebook, instagram, noDefinido }

  for (const l of leads) {
    if (!l.createdAt) continue;
    const key = getKey(l.createdAt);
    if (!key) continue;
    if (!mapa[key]) mapa[key] = { key, facebook: 0, instagram: 0, noDefinido: 0 };
    mapa[key][l.origen] = (mapa[key][l.origen] || 0) + 1;
  }

  const sorted = Object.values(mapa).sort((a, b) => a.key.localeCompare(b.key));
  return {
    labels: sorted.map(r => String(getLabel(r.key) || r.key || 'Sin fecha')),
    facebook: sorted.map(r => Number(r.facebook) || 0),
    instagram: sorted.map(r => Number(r.instagram) || 0),
    noDefinido: sorted.map(r => Number(r.noDefinido) || 0),
  };
}

// ─── Helpers de fecha ───────────────────────────────────────────────────────

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultDesde() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toInputDate(d);
}

function defaultHasta() {
  return toInputDate(new Date());
}

// ─── Page ────────────────────────────────────────────────────────────────────

const OrigenContactosPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [filtroOrigen, setFiltroOrigen] = useState('todos');
  const [filtroTelefono, setFiltroTelefono] = useState('conTelefono');
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(defaultDesde);
  const [fechaHasta, setFechaHasta] = useState(defaultHasta);
  const [tab, setTab] = useState(0);
  const [agrupacion, setAgrupacion] = useState('semana');

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (fechaDesde) params.from = fechaDesde;
      if (fechaHasta) params.to = fechaHasta;
      const res = await LeadsService.getOrigenStats(params);
      setData(res);
    } catch (err) {
      console.error('Error cargando origen stats:', err);
      setError('No se pudo cargar la información. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta]);

  // leadsBase = filtrado por teléfono + búsqueda (sin filtro de origen, para que las tarjetas reflejen esos filtros)
  const leadsBase = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads.filter((l) => {
      if (filtroTelefono === 'conTelefono' && !l.phone) return false;
      if (filtroTelefono === 'sinTelefono' && l.phone) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const nombre = (l.nombre || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const utm = (l.utm_campaign || '').toLowerCase();
        if (!nombre.includes(q) && !phone.includes(q) && !utm.includes(q)) return false;
      }
      return true;
    });
  }, [data, filtroTelefono, busqueda]);

  const leadsFiltrados = useMemo(() => {
    if (filtroOrigen === 'todos') return leadsBase;
    return leadsBase.filter(l => l.origen === filtroOrigen);
  }, [leadsBase, filtroOrigen]);

  // métricas reactivas a leadsBase
  const metricas = useMemo(() => {
    const facebook = leadsBase.filter(l => l.origen === 'facebook').length;
    const instagram = leadsBase.filter(l => l.origen === 'instagram').length;
    const noDefinido = leadsBase.filter(l => l.origen === 'noDefinido').length;
    return { total: leadsBase.length, facebook, instagram, noDefinido };
  }, [leadsBase]);

  const cuentaTelefono = useMemo(() => {
    if (!data?.leads) return { conTelefono: 0, sinTelefono: 0 };
    return {
      conTelefono: data.leads.filter(l => !!l.phone).length,
      sinTelefono: data.leads.filter(l => !l.phone).length,
    };
  }, [data]);

  const chartData = useMemo(() => agruparLeads(leadsBase, agrupacion), [leadsBase, agrupacion]);

  const chartSeries = useMemo(() => [
    {
      id: 'facebook',
      label: 'Facebook',
      data: chartData.facebook,
      color: ORIGEN_CONFIG.facebook.color,
      curve: 'linear',
      showMark: true,
    },
    {
      id: 'instagram',
      label: 'Instagram',
      data: chartData.instagram,
      color: ORIGEN_CONFIG.instagram.color,
      curve: 'linear',
      showMark: true,
    },
    {
      id: 'noDefinido',
      label: 'No definido',
      data: chartData.noDefinido,
      color: ORIGEN_CONFIG.noDefinido.color,
      curve: 'linear',
      showMark: true,
    },
  ], [chartData]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Origen de Contactos
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              De dónde provienen los leads: Facebook, Instagram o sin datos de atribución.
            </Typography>
          </Box>

          {/* Filtros de fecha */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              label="Desde"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              sx={{ width: 170 }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              sx={{ width: 170 }}
            />
            <Chip
              label="Últimos 30 días"
              size="small"
              variant="outlined"
              onClick={() => { setFechaDesde(defaultDesde()); setFechaHasta(defaultHasta()); }}
            />
            <Chip
              label="Limpiar fechas"
              size="small"
              onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
            />
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {/* Tabs */}
          {!loading && data && (
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Resumen" />
              <Tab label="Gráfico temporal" />
            </Tabs>
          )}

          {/* Stats cards */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : data && (
            <>
              {/* ── TAB 0: Resumen ── */}
              <Box hidden={tab !== 0}>
              <Grid container spacing={2}>
                {/* Total */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    onClick={() => setFiltroOrigen('todos')}
                    sx={{
                      cursor: 'pointer',
                      border: filtroOrigen === 'todos' ? 2 : 1,
                      borderColor: filtroOrigen === 'todos' ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center" mb={1.5}>
                        <Avatar sx={{ bgcolor: '#e3f2fd', color: 'primary.main', width: 44, height: 44 }}>
                          <PeopleIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="overline" color="text.secondary" fontWeight={600}>
                            Total
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">
                            {metricas.total}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Facebook */}
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Facebook"
                    count={metricas.facebook}
                    total={metricas.total}
                    config={ORIGEN_CONFIG.facebook}
                    selected={filtroOrigen === 'facebook'}
                    onClick={() => setFiltroOrigen(filtroOrigen === 'facebook' ? 'todos' : 'facebook')}
                  />
                </Grid>

                {/* Instagram */}
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="Instagram"
                    count={metricas.instagram}
                    total={metricas.total}
                    config={ORIGEN_CONFIG.instagram}
                    selected={filtroOrigen === 'instagram'}
                    onClick={() => setFiltroOrigen(filtroOrigen === 'instagram' ? 'todos' : 'instagram')}
                  />
                </Grid>

                {/* No definido */}
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    label="No definido"
                    count={metricas.noDefinido}
                    total={metricas.total}
                    config={ORIGEN_CONFIG.noDefinido}
                    selected={filtroOrigen === 'noDefinido'}
                    onClick={() => setFiltroOrigen(filtroOrigen === 'noDefinido' ? 'todos' : 'noDefinido')}
                  />
                </Grid>
              </Grid>

              {/* Barra de distribución visual */}
              {metricas.total > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    Distribución
                  </Typography>
                  <Box sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', height: 24 }}>
                    {metricas.facebook > 0 && (
                      <Tooltip title={`Facebook: ${metricas.facebook} (${pct(metricas.facebook, metricas.total)}%)`}>
                        <Box
                          sx={{
                            width: `${pct(metricas.facebook, metricas.total)}%`,
                            bgcolor: ORIGEN_CONFIG.facebook.color,
                            transition: 'width 0.5s',
                          }}
                        />
                      </Tooltip>
                    )}
                    {metricas.instagram > 0 && (
                      <Tooltip title={`Instagram: ${metricas.instagram} (${pct(metricas.instagram, metricas.total)}%)`}>
                        <Box
                          sx={{
                            width: `${pct(metricas.instagram, metricas.total)}%`,
                            bgcolor: ORIGEN_CONFIG.instagram.color,
                            transition: 'width 0.5s',
                          }}
                        />
                      </Tooltip>
                    )}
                    {metricas.noDefinido > 0 && (
                      <Tooltip title={`No definido: ${metricas.noDefinido} (${pct(metricas.noDefinido, metricas.total)}%)`}>
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: ORIGEN_CONFIG.noDefinido.color,
                            transition: 'width 0.5s',
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <Stack direction="row" spacing={2} mt={1.5} flexWrap="wrap">
                    {['facebook', 'instagram', 'noDefinido'].map((key) => (
                      <Stack key={key} direction="row" spacing={0.75} alignItems="center">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: ORIGEN_CONFIG[key].color,
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {ORIGEN_CONFIG[key].label}: {metricas[key]}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Filtros de tabla */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
                <TextField
                  placeholder="Buscar por nombre, teléfono o campaña..."
                  size="small"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: 20 }} /> }}
                  sx={{ flex: 1, maxWidth: 400 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Origen</InputLabel>
                  <Select
                    value={filtroOrigen}
                    label="Origen"
                    onChange={(e) => setFiltroOrigen(e.target.value)}
                  >
                    <MenuItem value="todos">Todos ({metricas.total})</MenuItem>
                    <MenuItem value="facebook">Facebook ({metricas.facebook})</MenuItem>
                    <MenuItem value="instagram">Instagram ({metricas.instagram})</MenuItem>
                    <MenuItem value="noDefinido">No definido ({metricas.noDefinido})</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Teléfono</InputLabel>
                  <Select
                    value={filtroTelefono}
                    label="Teléfono"
                    onChange={(e) => setFiltroTelefono(e.target.value)}
                  >
                    <MenuItem value="todos">Todos ({data.total})</MenuItem>
                    <MenuItem value="conTelefono">Con teléfono — usaron bot ({cuentaTelefono.conTelefono})</MenuItem>
                    <MenuItem value="sinTelefono">Sin teléfono — solo clic ({cuentaTelefono.sinTelefono})</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">
                  {leadsFiltrados.length} contacto{leadsFiltrados.length !== 1 ? 's' : ''}
                </Typography>
              </Stack>

              {/* Tabla */}
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Origen</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Teléfono</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Estado SDR</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reunión</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Campaña</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>fbc / fbp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leadsFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Sin resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      leadsFiltrados.map((lead) => (
                        <TableRow key={lead.id} hover>
                          <TableCell>
                            <OrigenChip origen={lead.origen} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {lead.nombre || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {lead.phone || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <EstadoSDRChip estado={lead.estadoSDR} />
                          </TableCell>
                          <TableCell>
                            {lead.reuniones > 0 ? (
                              <Chip
                                label={`✅ ${lead.reuniones}`}
                                size="small"
                                color="success"
                                variant="filled"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.utm_campaign ? (
                              <Chip
                                label={lead.utm_campaign}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(lead.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                label="fbc"
                                size="small"
                                color={lead.fbc ? 'success' : 'default'}
                                variant={lead.fbc ? 'filled' : 'outlined'}
                                sx={{ height: 18, fontSize: '0.6rem' }}
                              />
                              <Chip
                                label="fbp"
                                size="small"
                                color={lead.fbp ? 'success' : 'default'}
                                variant={lead.fbp ? 'filled' : 'outlined'}
                                sx={{ height: 18, fontSize: '0.6rem' }}
                              />
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
              </Box>

              {/* ── TAB 1: Gráfico temporal ── */}
              {tab === 1 && (
                <Box>
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Agrupar por
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      value={agrupacion}
                      exclusive
                      onChange={(_, v) => v && setAgrupacion(v)}
                    >
                      <ToggleButton value="semana">Semana</ToggleButton>
                      <ToggleButton value="mes">Mes</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                      {leadsBase.length} contacto{leadsBase.length !== 1 ? 's' : ''} en el período
                    </Typography>
                  </Stack>

                  {chartData.labels.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                      Sin datos para mostrar
                    </Typography>
                  ) : (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <LineChart
                        height={360}
                        grid={{ horizontal: true, vertical: false }}
                        xAxis={[{ scaleType: 'point', data: chartData.labels }]}
                        yAxis={[{ min: 0 }]}
                        series={chartSeries}
                        margin={{ top: 24, right: 24, bottom: 24, left: 48 }}
                        slotProps={{ legend: { hidden: false } }}
                      />
                    </Paper>
                  )}
                </Box>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

OrigenContactosPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default OrigenContactosPage;
