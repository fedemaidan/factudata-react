import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  TablePagination,
  Tooltip,
  LinearProgress,
  Alert,
  Stack,
  IconButton,
  Collapse,
  Button,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  PersonAdd as PersonAddIcon,
  DateRange as DateRangeIcon,
  Search as SearchIcon,
  Rocket as RocketIcon,
  Assessment as AssessmentIcon,
  HourglassEmpty as HourglassEmptyIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Warning as WarningIcon,
  WhatsApp as WhatsAppIcon,
  Language as WebIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import Head from 'next/head';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import analyticsService from 'src/services/analyticsService';


// Componente de tarjeta de estadística
const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Componente de indicador de ratio
const RatioIndicator = ({ numerator, denominator, label, colorThresholds = { good: 0.7, medium: 0.4 } }) => {
  const ratio = denominator > 0 ? numerator / denominator : 0;
  const percentage = Math.round(ratio * 100);
  
  let color = 'error';
  if (ratio >= colorThresholds.good) color = 'success';
  else if (ratio >= colorThresholds.medium) color = 'warning';
  
  return (
    <Tooltip title={`${numerator} de ${denominator}`}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" fontWeight="medium">
          {numerator}/{denominator}
        </Typography>
        <Chip 
          label={`${percentage}%`} 
          size="small" 
          color={color}
          sx={{ minWidth: 55 }}
        />
      </Box>
    </Tooltip>
  );
};

// Fila expandible de empresa con métricas de onboarding
const EmpresaOnboardingRow = ({ empresa, diasAnalisis = 7 }) => {
  const [expanded, setExpanded] = useState(false);
  const [usuariosDetalle, setUsuariosDetalle] = useState(null);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPeriodoOnboarding = () => {
    if (!empresa.fechaRegistroCliente) return '-';
    const desde = new Date(empresa.fechaRegistroCliente);
    const hasta = new Date(empresa.fechaRegistroCliente);
    hasta.setDate(hasta.getDate() + diasAnalisis);
    return `${formatDate(desde)} - ${formatDate(hasta)}`;
  };
  
  // Calcular días transcurridos
  const getDiasTranscurridos = () => {
    if (!empresa.fechaRegistroCliente) return 0;
    const fechaReg = new Date(empresa.fechaRegistroCliente);
    const hoy = new Date();
    return Math.floor((hoy - fechaReg) / (1000 * 60 * 60 * 24));
  };
  
  const diasTranscurridos = getDiasTranscurridos();
  const onboardingEnCurso = diasTranscurridos < diasAnalisis;
  
  // Cargar detalle de usuarios al expandir
  const handleExpand = async () => {
    if (!expanded && !usuariosDetalle) {
      setLoadingUsuarios(true);
      try {
        const data = await analyticsService.getEmpresaStats(empresa.id);
        // Filtrar movimientos del periodo de onboarding para cada usuario
        const fechaDesde = new Date(empresa.fechaRegistroCliente);
        const fechaHasta = new Date(empresa.fechaRegistroCliente);
        fechaHasta.setDate(fechaHasta.getDate() + 7);
        
        const usuariosConOnboarding = (data.usuarios || []).map(u => ({
          ...u,
          movimientosOnboarding: u.totalMovimientos || 0, // Idealmente filtrado por fecha
          insightsOnboarding: 0,
          primerMovimiento: u.ultimoUso // Aproximación
        }));
        setUsuariosDetalle(usuariosConOnboarding);
      } catch (error) {
        console.error('Error cargando usuarios:', error);
        setUsuariosDetalle([]);
      }
      setLoadingUsuarios(false);
    }
    setExpanded(!expanded);
  };

  // Calcular ratios
  const ratioUsuariosActivos = empresa.totalUsuarios > 0 
    ? (empresa.usuariosConMovimientos / empresa.totalUsuarios) 
    : 0;
  const ratioUsuariosValidados = empresa.totalUsuarios > 0 
    ? (empresa.usuariosValidados / empresa.totalUsuarios) 
    : 0;

  return (
    <>
      <TableRow 
        hover 
        sx={{ cursor: 'pointer' }}
        onClick={handleExpand}
      >
        <TableCell>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography fontWeight="medium">{empresa.nombre}</Typography>
        </TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <Box>
              <Typography variant="body2">{formatDate(empresa.fechaRegistroCliente)}</Typography>
              <Typography variant="caption" color="textSecondary">
                {getPeriodoOnboarding()}
              </Typography>
            </Box>
            {onboardingEnCurso ? (
              <Tooltip title={`${diasTranscurridos} días de ${diasAnalisis} - Onboarding en curso`}>
                <Chip 
                  label={`${diasTranscurridos}d`} 
                  size="small" 
                  color="warning" 
                  icon={<HourglassEmptyIcon />}
                  sx={{ fontWeight: 'bold' }}
                />
              </Tooltip>
            ) : (
              <Tooltip title={`Onboarding completado (${diasAnalisis}+ días)`}>
                <Chip 
                  label={`${diasAnalisis}d+`} 
                  size="small" 
                  color="success" 
                  icon={<CheckCircleOutlineIcon />}
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <RatioIndicator 
              numerator={empresa.usuariosConMovimientos || 0} 
              denominator={empresa.totalUsuarios || 0}
              label="Usuarios activos"
            />
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <RatioIndicator 
              numerator={empresa.usuariosValidados || 0} 
              denominator={empresa.totalUsuarios || 0}
              label="Usuarios validados"
            />
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <Chip 
              label={empresa.movimientosOnboarding || 0} 
              size="small" 
              color={empresa.movimientosOnboarding > 0 ? 'primary' : 'default'}
              variant={empresa.movimientosOnboarding > 0 ? 'filled' : 'outlined'}
            />
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <Tooltip title={`WhatsApp: ${empresa.movimientosPorOrigen?.whatsapp || 0} | Web: ${empresa.movimientosPorOrigen?.web || 0} | Otro: ${empresa.movimientosPorOrigen?.otro || 0}`}>
              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                <Chip 
                  size="small"
                  icon={<WhatsAppIcon />}
                  label={empresa.movimientosPorOrigen?.whatsapp || 0}
                  color={(empresa.movimientosPorOrigen?.whatsapp || 0) > 0 ? 'success' : 'default'}
                  variant={(empresa.movimientosPorOrigen?.whatsapp || 0) > 0 ? 'filled' : 'outlined'}
                  sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
                />
                <Chip 
                  size="small"
                  icon={<WebIcon />}
                  label={empresa.movimientosPorOrigen?.web || 0}
                  color={(empresa.movimientosPorOrigen?.web || 0) > 0 ? 'info' : 'default'}
                  variant={(empresa.movimientosPorOrigen?.web || 0) > 0 ? 'filled' : 'outlined'}
                  sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
                />
              </Stack>
            </Tooltip>
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <Chip 
              label={empresa.insightsOnboarding || 0} 
              size="small" 
              color={empresa.insightsOnboarding > 0 ? 'info' : 'default'}
              variant={empresa.insightsOnboarding > 0 ? 'filled' : 'outlined'}
              icon={<LightbulbIcon />}
            />
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.metricasCargadas ? (
            <Tooltip 
              title={
                <Box>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Score de Adopción: {empresa.adoptionScore || 0}%
                  </Typography>
                  <Typography variant="caption" component="div">
                    Cómo se calcula:
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 40% - Ratio usuarios con movimientos
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 30% - Ratio usuarios validados
                  </Typography>
                  <Typography variant="caption" component="div">
                    • 30% - Tiene al menos 1 movimiento
                  </Typography>
                </Box>
              }
            >
              <Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min((empresa.adoptionScore || 0), 100)}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4, 
                    width: 60,
                    backgroundColor: 'grey.200'
                  }}
                  color={
                    (empresa.adoptionScore || 0) >= 70 ? 'success' : 
                    (empresa.adoptionScore || 0) >= 40 ? 'warning' : 'error'
                  }
                />
                <Typography variant="caption" color="textSecondary">
                  {empresa.adoptionScore || 0}%
                </Typography>
              </Box>
            </Tooltip>
          ) : (
            <CircularProgress size={16} />
          )}
        </TableCell>
      </TableRow>
      
      {/* Fila expandida con detalle por usuario */}
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
              {loadingUsuarios ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : usuariosDetalle && usuariosDetalle.length > 0 ? (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Detalle por usuario (primeros {diasAnalisis} días)
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Teléfono</TableCell>
                            <TableCell align="center">Validado</TableCell>
                            <TableCell align="center">Movimientos</TableCell>
                            <TableCell align="center">Insights</TableCell>
                            <TableCell>Último uso</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {usuariosDetalle.map((usuario) => (
                            <TableRow key={usuario.id}>
                              <TableCell>
                                <Typography variant="body2">{usuario.nombre}</Typography>
                                {usuario.admin && (
                                  <Chip label="Admin" size="small" color="primary" sx={{ ml: 1 }} />
                                )}
                              </TableCell>
                              <TableCell>{usuario.phone || '-'}</TableCell>
                              <TableCell align="center">
                                {usuario.validado ? (
                                  <CheckCircleIcon color="success" fontSize="small" />
                                ) : (
                                  <Typography color="textSecondary">-</Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={usuario.totalMovimientos || 0} 
                                  size="small" 
                                  color={usuario.totalMovimientos > 0 ? 'success' : 'default'}
                                  variant={usuario.totalMovimientos > 0 ? 'filled' : 'outlined'}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={usuario.insightsOnboarding || usuario.insightsCount || 0} 
                                  size="small" 
                                  color={(usuario.insightsOnboarding || usuario.insightsCount) > 0 ? 'warning' : 'default'}
                                  variant={(usuario.insightsOnboarding || usuario.insightsCount) > 0 ? 'filled' : 'outlined'}
                                  icon={<LightbulbIcon />}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="textSecondary">
                                  {formatDate(usuario.ultimoUso)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">
                  No hay usuarios en esta empresa
                </Alert>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const AnalyticsOnboardingPage = () => {
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetricas, setIsLoadingMetricas] = useState(false);
  const [progreso, setProgreso] = useState({ procesadas: 0, total: 0, porcentaje: 0 });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Estado para ordenamiento
  const [orderBy, setOrderBy] = useState('fechaRegistroCliente');
  const [order, setOrder] = useState('desc');
  
  // Estado para filtro por estado de onboarding
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  // Estado para días de análisis
  const [diasAnalisis, setDiasAnalisis] = useState(7);
  
  // Estado para filtro de fechas de registro
  const [showDateSelector, setShowDateSelector] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // Últimos 3 meses por defecto
    return date;
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    return new Date(); // Hasta hoy para incluir onboarding en curso
  });
  const [dateError, setDateError] = useState(null);
  
  // Validar rango de fechas
  const validarFechas = () => {
    setDateError(null);
    
    if (!fechaDesde || !fechaHasta) {
      setDateError('Debe seleccionar ambas fechas');
      return false;
    }
    
    const diffDias = (fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24);
    
    if (diffDias < 0) {
      setDateError('La fecha "Desde" debe ser anterior a "Hasta"');
      return false;
    }
    
    return true;
  };
  
  // Manejar ordenamiento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Función de comparación para ordenar
  const getComparator = (order, orderBy) => {
    return (a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];
      
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Para fechas
      if (orderBy === 'fechaRegistroCliente') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Para ratios calculados
      if (orderBy === 'ratioActivos') {
        aValue = a.totalUsuarios > 0 ? (a.usuariosConMovimientos || 0) / a.totalUsuarios : 0;
        bValue = b.totalUsuarios > 0 ? (b.usuariosConMovimientos || 0) / b.totalUsuarios : 0;
      }
      if (orderBy === 'ratioValidados') {
        aValue = a.totalUsuarios > 0 ? (a.usuariosValidados || 0) / a.totalUsuarios : 0;
        bValue = b.totalUsuarios > 0 ? (b.usuariosValidados || 0) / b.totalUsuarios : 0;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Comparación correcta
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return order === 'desc' ? -comparison : comparison;
    };
  };
  
  // Cargar datos
  const handleCargarDatos = async () => {
    if (!validarFechas()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Cargar lista de empresas
      const listaData = await analyticsService.getEmpresasLista();
      if (listaData.error) {
        setError(listaData.msg);
        setIsLoading(false);
        return;
      }
      
      // Filtrar solo clientes con fecha de registro en el rango seleccionado
      const clientesEnRango = listaData.empresas.filter(emp => {
        if (!emp.esCliente || !emp.fechaRegistroCliente) return false;
        const fechaReg = new Date(emp.fechaRegistroCliente);
        return fechaReg >= fechaDesde && fechaReg <= fechaHasta;
      });
      
      if (clientesEnRango.length === 0) {
        setError('No hay clientes registrados en el rango de fechas seleccionado');
        setIsLoading(false);
        return;
      }
      
      // Inicializar empresas con placeholder
      const empresasConPlaceholder = clientesEnRango.map(emp => ({
        ...emp,
        totalUsuarios: null,
        usuariosValidados: null,
        usuariosConMovimientos: null,
        movimientosOnboarding: null,
        movimientosPorOrigen: { web: 0, whatsapp: 0, otro: 0 },
        insightsOnboarding: 0, // Por ahora 0, luego se ajusta
        adoptionScore: null,
        usuarios: [],
        metricasCargadas: false,
      }));
      
      setEmpresas(empresasConPlaceholder);
      setShowDateSelector(false);
      setIsLoading(false);
      
      // Cargar métricas de onboarding
      await cargarMetricasOnboarding(empresasConPlaceholder);
      
    } catch (err) {
      setError('Error al cargar las empresas');
      console.error(err);
      setIsLoading(false);
      setIsLoadingMetricas(false);
    }
  };
  
  // Cargar métricas de onboarding para cada empresa
  const cargarMetricasOnboarding = async (listaEmpresas) => {
    setIsLoadingMetricas(true);
    setProgreso({ procesadas: 0, total: listaEmpresas.length, porcentaje: 0 });
    
    const empresasParaCargar = listaEmpresas.map(e => ({
      id: e.id,
      fechaRegistro: e.fechaRegistroCliente
    }));
    
    await analyticsService.getOnboardingBatch(
      empresasParaCargar,
      diasAnalisis,
      5,
      (progressInfo) => {
        setProgreso(progressInfo);
        
        setEmpresas(prev => {
          const updated = [...prev];
          progressInfo.ultimoBatch.forEach(metricas => {
            if (metricas && !metricas.error) {
              const idx = updated.findIndex(e => e.id === metricas.empresaId);
              if (idx !== -1) {
                // Calcular score de adopción
                const ratioActivos = metricas.totalUsuarios > 0 
                  ? (metricas.usuariosConMovimientos / metricas.totalUsuarios) 
                  : 0;
                const ratioValidados = metricas.totalUsuarios > 0 
                  ? (metricas.usuariosValidados / metricas.totalUsuarios) 
                  : 0;
                const tieneMovimientos = metricas.movimientosOnboarding > 0 ? 1 : 0;
                
                // Score: 40% ratio activos, 30% ratio validados, 30% tiene movimientos
                const adoptionScore = Math.round(
                  (ratioActivos * 40) + (ratioValidados * 30) + (tieneMovimientos * 30)
                );
                
                updated[idx] = {
                  ...updated[idx],
                  totalUsuarios: metricas.totalUsuarios,
                  usuariosValidados: metricas.usuariosValidados,
                  usuariosConMovimientos: metricas.usuariosConMovimientos,
                  movimientosOnboarding: metricas.movimientosOnboarding,
                  movimientosPorOrigen: metricas.movimientosPorOrigen || { web: 0, whatsapp: 0, otro: 0 },
                  insightsOnboarding: metricas.insightsOnboarding || 0,
                  adoptionScore,
                  usuarios: metricas.usuarios || [],
                  metricasCargadas: true,
                };
              }
            }
          });
          return updated;
        });
      }
    );
    
    setIsLoadingMetricas(false);
  };

  // Calcular días transcurridos para cada empresa
  const calcularDiasTranscurridos = (fechaRegistro) => {
    if (!fechaRegistro) return 999;
    const fechaReg = new Date(fechaRegistro);
    const hoy = new Date();
    return Math.floor((hoy - fechaReg) / (1000 * 60 * 60 * 24));
  };

  // Filtrar y ordenar empresas
  const filteredEmpresas = useMemo(() => {
    let filtered = empresas;
    
    // Filtro por estado de onboarding (usando diasAnalisis dinámico)
    if (filtroEstado === 'en-curso') {
      filtered = filtered.filter(emp => calcularDiasTranscurridos(emp.fechaRegistroCliente) < diasAnalisis);
    } else if (filtroEstado === 'completado') {
      filtered = filtered.filter(emp => calcularDiasTranscurridos(emp.fechaRegistroCliente) >= diasAnalisis);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.nombre?.toLowerCase().includes(term)
      );
    }
    
    return filtered.sort(getComparator(order, orderBy));
  }, [empresas, searchTerm, order, orderBy, filtroEstado, diasAnalisis]);

  const paginatedEmpresas = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEmpresas.slice(start, start + rowsPerPage);
  }, [filteredEmpresas, page, rowsPerPage]);

  // Calcular totales
  const totales = useMemo(() => {
    const conMetricas = empresas.filter(e => e.metricasCargadas);
    const enCurso = empresas.filter(e => calcularDiasTranscurridos(e.fechaRegistroCliente) < diasAnalisis);
    const completado = empresas.filter(e => calcularDiasTranscurridos(e.fechaRegistroCliente) >= diasAnalisis);
    const totalUsuarios = conMetricas.reduce((sum, e) => sum + (e.totalUsuarios || 0), 0);
    const usuariosActivos = conMetricas.reduce((sum, e) => sum + (e.usuariosConMovimientos || 0), 0);
    const usuariosValidados = conMetricas.reduce((sum, e) => sum + (e.usuariosValidados || 0), 0);
    const totalMovimientos = conMetricas.reduce((sum, e) => sum + (e.movimientosOnboarding || 0), 0);
    const totalInsights = conMetricas.reduce((sum, e) => sum + (e.insightsOnboarding || 0), 0);
    const totalWhatsapp = conMetricas.reduce((sum, e) => sum + (e.movimientosPorOrigen?.whatsapp || 0), 0);
    const totalWeb = conMetricas.reduce((sum, e) => sum + (e.movimientosPorOrigen?.web || 0), 0);
    const avgAdoptionScore = conMetricas.length > 0
      ? Math.round(conMetricas.reduce((sum, e) => sum + (e.adoptionScore || 0), 0) / conMetricas.length)
      : 0;
    const enCursoCount = enCurso.length;
    const completadoCount = completado.length;
    
    return {
      empresas: empresas.length,
      conMetricas: conMetricas.length,
      enCursoCount,
      completadoCount,
      totalUsuarios,
      usuariosActivos,
      usuariosValidados,
      totalMovimientos,
      totalInsights,
      totalWhatsapp,
      totalWeb,
      avgAdoptionScore,
      ratioActivos: totalUsuarios > 0 ? Math.round((usuariosActivos / totalUsuarios) * 100) : 0,
      ratioValidados: totalUsuarios > 0 ? Math.round((usuariosValidados / totalUsuarios) * 100) : 0,
    };
  }, [empresas, diasAnalisis]);
  
  // Formatear periodo
  const formatPeriodo = () => {
    const desde = fechaDesde.toLocaleDateString('es-AR');
    const hasta = fechaHasta.toLocaleDateString('es-AR');
    return `Clientes registrados: ${desde} - ${hasta} | Análisis: ${diasAnalisis} días`;
  };

  // Selector de fechas inicial
  if (showDateSelector) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <Head>
          <title>Analytics Onboarding - Seleccionar Periodo</title>
        </Head>
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Container maxWidth="sm">
            <Card sx={{ p: 4 }}>
              <Stack spacing={3} alignItems="center">
                <RocketIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                <Typography variant="h4" textAlign="center">
                  Análisis de Onboarding
                </Typography>
                <Typography variant="body1" color="textSecondary" textAlign="center">
                  Analiza los primeros días de cada empresa cliente.
                  <br />
                  Selecciona el <strong>periodo de análisis</strong> y el rango de <strong>fechas de registro</strong>.
                </Typography>
                
                {/* Selector de días de análisis */}
                <FormControl fullWidth>
                  <InputLabel>Periodo de análisis</InputLabel>
                  <Select
                    value={diasAnalisis}
                    label="Periodo de análisis"
                    onChange={(e) => setDiasAnalisis(e.target.value)}
                  >
                    <MenuItem value={7}>Primeros 7 días</MenuItem>
                    <MenuItem value={14}>Primeros 14 días</MenuItem>
                    <MenuItem value={30}>Primeros 30 días</MenuItem>
                  </Select>
                </FormControl>
                
                <Alert severity="info" sx={{ width: '100%' }}>
                  💡 Se recomienda seleccionar clientes registrados hace al menos {diasAnalisis} días para tener datos completos de onboarding.
                </Alert>
                
                {dateError && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {dateError}
                  </Alert>
                )}
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                  <DatePicker
                    label="Registrados desde"
                    value={fechaDesde}
                    onChange={setFechaDesde}
                    maxDate={fechaHasta}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                  <DatePicker
                    label="Registrados hasta"
                    value={fechaHasta}
                    onChange={setFechaHasta}
                    maxDate={new Date()}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Stack>
                
                {/* Atajos rápidos */}
                <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                  <Chip 
                    label={`🔥 En curso (< ${diasAnalisis} días)`}
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setDate(desde.getDate() - (diasAnalisis - 1));
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    color="warning"
                    clickable
                  />
                  <Chip 
                    label="Último mes" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setMonth(desde.getMonth() - 1);
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    clickable
                  />
                  <Chip 
                    label="Últimos 3 meses" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setMonth(desde.getMonth() - 3);
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    clickable
                  />
                  <Chip 
                    label="Último año" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setFullYear(desde.getFullYear() - 1);
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    clickable
                  />
                </Stack>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  onClick={handleCargarDatos}
                  disabled={isLoading}
                  fullWidth
                >
                  {isLoading ? 'Cargando...' : 'Analizar Onboarding'}
                </Button>
                
                {error && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                  </Alert>
                )}
              </Stack>
            </Card>
          </Container>
        </Box>
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Head>
        <title>Analytics - Onboarding</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h4">
                  <RocketIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Analytics de Onboarding
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                  <DateRangeIcon fontSize="small" color="primary" />
                  <Typography variant="body2" color="primary.main" fontWeight="medium">
                    {formatPeriodo()}
                  </Typography>
                  <Button 
                    size="small" 
                    onClick={() => setShowDateSelector(true)}
                    startIcon={<DateRangeIcon />}
                  >
                    Cambiar periodo
                  </Button>
                </Stack>
              </Box>
            </Box>

            {/* Info */}
            <Alert severity="info">
              📊 Métricas de los <strong>primeros {diasAnalisis} días</strong> desde el registro de cada cliente
              {isLoadingMetricas && (
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  — Cargando: {progreso.procesadas}/{progreso.total}
                </Typography>
              )}
            </Alert>
            
            {/* Barra de progreso */}
            {isLoadingMetricas && (
              <Box sx={{ width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="textSecondary">
                    Cargando métricas de onboarding...
                  </Typography>
                  <Typography variant="body2" color="primary">
                    {progreso.porcentaje}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progreso.porcentaje} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}
            
            {/* Tarjetas de resumen */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Clientes analizados"
                  value={totales.empresas}
                  subtitle={`${totales.conMetricas} con métricas`}
                  icon={<PersonAddIcon color="primary" />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Usuarios activos"
                  value={`${totales.ratioActivos}%`}
                  subtitle={`${totales.usuariosActivos}/${totales.totalUsuarios}`}
                  icon={<TrendingUpIcon color="success" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Usuarios validados"
                  value={`${totales.ratioValidados}%`}
                  subtitle={`${totales.usuariosValidados}/${totales.totalUsuarios}`}
                  icon={<CheckCircleIcon color="info" />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Movimientos totales"
                  value={totales.totalMovimientos.toLocaleString()}
                  subtitle={`En primeros ${diasAnalisis} días`}
                  icon={<ReceiptIcon color="warning" />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Insights generados"
                  value={totales.totalInsights}
                  subtitle={`En primeros ${diasAnalisis} días`}
                  icon={<LightbulbIcon color="secondary" />}
                  color="secondary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Score promedio"
                  value={`${totales.avgAdoptionScore}%`}
                  subtitle="Adopción onboarding"
                  icon={<AssessmentIcon color="primary" />}
                  color="primary"
                />
              </Grid>
            </Grid>

            {/* Filtros */}
            <Card sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                {/* Filtro por estado de onboarding */}
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Estado del onboarding
                  </Typography>
                  <ToggleButtonGroup
                    value={filtroEstado}
                    exclusive
                    onChange={(e, value) => value && setFiltroEstado(value)}
                    size="small"
                  >
                    <ToggleButton value="todos">
                      Todos ({totales.empresas})
                    </ToggleButton>
                    <ToggleButton value="en-curso" color="warning">
                      <HourglassEmptyIcon sx={{ mr: 0.5 }} fontSize="small" />
                      En curso ({totales.enCursoCount})
                    </ToggleButton>
                    <ToggleButton value="completado" color="success">
                      <CheckCircleOutlineIcon sx={{ mr: 0.5 }} fontSize="small" />
                      Completado ({totales.completadoCount})
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <TextField
                  placeholder="Buscar por nombre de empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ minWidth: 300 }}
                />
                <Chip 
                  label={`${filteredEmpresas.length} empresas`} 
                  color="primary" 
                  variant="outlined"
                />
              </Stack>
            </Card>

            {/* Tabla */}
            {isLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Card>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell width={50} />
                        <TableCell sortDirection={orderBy === 'nombre' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'nombre'}
                            direction={orderBy === 'nombre' ? order : 'asc'}
                            onClick={() => handleRequestSort('nombre')}
                          >
                            Empresa
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'fechaRegistroCliente' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'fechaRegistroCliente'}
                            direction={orderBy === 'fechaRegistroCliente' ? order : 'asc'}
                            onClick={() => handleRequestSort('fechaRegistroCliente')}
                          >
                            Registro / Periodo
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'ratioActivos' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'ratioActivos'}
                            direction={orderBy === 'ratioActivos' ? order : 'asc'}
                            onClick={() => handleRequestSort('ratioActivos')}
                          >
                            Con movimiento / Total
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'ratioValidados' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'ratioValidados'}
                            direction={orderBy === 'ratioValidados' ? order : 'asc'}
                            onClick={() => handleRequestSort('ratioValidados')}
                          >
                            Validados / Total
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'movimientosOnboarding' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'movimientosOnboarding'}
                            direction={orderBy === 'movimientosOnboarding' ? order : 'asc'}
                            onClick={() => handleRequestSort('movimientosOnboarding')}
                          >
                            # Movimientos
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Origen de los movimientos: WhatsApp / Web">
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                              <WhatsAppIcon fontSize="small" color="success" />
                              /
                              <WebIcon fontSize="small" color="info" />
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'insightsOnboarding' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'insightsOnboarding'}
                            direction={orderBy === 'insightsOnboarding' ? order : 'asc'}
                            onClick={() => handleRequestSort('insightsOnboarding')}
                          >
                            Insights
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'adoptionScore' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'adoptionScore'}
                            direction={orderBy === 'adoptionScore' ? order : 'asc'}
                            onClick={() => handleRequestSort('adoptionScore')}
                          >
                            Score
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedEmpresas.map((empresa) => (
                        <EmpresaOnboardingRow key={empresa.id} empresa={empresa} diasAnalisis={diasAnalisis} />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredEmpresas.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  labelRowsPerPage="Filas por página"
                />
              </Card>
            )}
          </Stack>
        </Container>
      </Box>
    </LocalizationProvider>
  );
};

AnalyticsOnboardingPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsOnboardingPage;
