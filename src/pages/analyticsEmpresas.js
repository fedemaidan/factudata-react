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
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel
} from '@mui/material';
import {
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  PersonAdd as PersonAddIcon,
  PersonOff as PersonOffIcon,
  Business as BusinessIcon,
  Cancel as CancelIcon,
  DateRange as DateRangeIcon,
  Search as SearchIcon,
  Lightbulb as LightbulbIcon,
  WhatsApp as WhatsAppIcon,
  Web as WebIcon
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

// Componente de gráfico de barras simple
const SimpleBarChart = ({ data, title }) => {
  const maxValue = Math.max(...Object.values(data), 1);
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Box sx={{ mt: 2 }}>
          {Object.entries(data).map(([date, value]) => {
            const dayName = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
            return (
              <Box key={date} sx={{ mb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="textSecondary">
                    {dayName}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {value}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(value / maxValue) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

// Fila expandible de empresa
const EmpresaRow = ({ empresa, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !details) {
      setLoading(true);
      try {
        const data = await analyticsService.getEmpresaStats(empresa.id);
        setDetails(data);
      } catch (error) {
        console.error('Error cargando detalles:', error);
      }
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <TableRow 
        hover 
        sx={{ 
          cursor: 'pointer',
          backgroundColor: empresa.cuenta_suspendida ? 'action.disabledBackground' : 'inherit'
        }}
        onClick={handleExpand}
      >
        <TableCell>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography fontWeight="medium">{empresa.nombre}</Typography>
            {empresa.esCliente && !empresa.estaDadoDeBaja && (
              <Chip 
                label="Cliente" 
                size="small" 
                color="success" 
                icon={<PersonAddIcon />}
              />
            )}
            {empresa.esCliente && empresa.estaDadoDeBaja && (
              <Chip 
                label="Baja" 
                size="small" 
                color="error" 
                icon={<PersonOffIcon />}
              />
            )}
            {empresa.cuenta_suspendida && (
              <Chip label="Suspendida" size="small" color="warning" />
            )}
          </Box>
        </TableCell>
        <TableCell align="center">
          {empresa.totalUsuarios === null ? (
            <CircularProgress size={16} />
          ) : (
            <Tooltip title={`${empresa.usuariosValidados} validados`}>
              <span>{empresa.totalUsuarios}</span>
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.usuariosConMovimientos === null ? (
            <CircularProgress size={16} />
          ) : (
            <Chip 
              label={empresa.usuariosConMovimientos || 0} 
              size="small" 
              color={empresa.usuariosConMovimientos > 0 ? 'success' : 'default'}
              variant={empresa.usuariosConMovimientos > 0 ? 'filled' : 'outlined'}
            />
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.movimientosEnPeriodo === null ? (
            <CircularProgress size={16} />
          ) : (
            <Tooltip title={`Total histórico: ${empresa.totalMovimientos?.toLocaleString() || 0}`}>
              <span>{empresa.movimientosEnPeriodo || 0}</span>
            </Tooltip>
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
          {empresa.remitosEnPeriodo === null ? (
            <CircularProgress size={16} />
          ) : (
            <Tooltip title={`Acopios totales: ${empresa.totalAcopios || 0}`}>
              <span>{empresa.remitosEnPeriodo || 0}</span>
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="center">
          {empresa.insightsEnPeriodo === null && !empresa.metricasCargadas ? (
            <CircularProgress size={16} />
          ) : (
            <Tooltip title={`Insights generados en el periodo`}>
              <Chip 
                label={empresa.insightsEnPeriodo || 0} 
                size="small" 
                color={empresa.insightsEnPeriodo > 0 ? 'warning' : 'default'}
                variant={empresa.insightsEnPeriodo > 0 ? 'filled' : 'outlined'}
                icon={<LightbulbIcon />}
              />
            </Tooltip>
          )}
        </TableCell>
        <TableCell>
          {empresa.esCliente ? (
            <Tooltip title={empresa.estaDadoDeBaja ? `Baja: ${formatDate(empresa.fechaBaja)}` : 'Cliente activo'}>
              <Typography variant="body2" color={empresa.estaDadoDeBaja ? 'error' : 'success.main'}>
                {formatDate(empresa.fechaRegistroCliente).split(',')[0]}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="textSecondary">-</Typography>
          )}
        </TableCell>
        <TableCell>
          {empresa.ultimoUso === null && !empresa.metricasCargadas ? (
            <CircularProgress size={16} />
          ) : (
            <Typography variant="body2" color={empresa.ultimoUso ? 'textPrimary' : 'textSecondary'}>
              {formatDate(empresa.ultimoUso)}
            </Typography>
          )}
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : details ? (
                <Grid container spacing={3}>
                  {/* Estadísticas rápidas */}
                  <Grid item xs={12} md={3}>
                    <StatCard
                      title="Usuarios totales"
                      value={details.empresa?.totalUsuarios || 0}
                      subtitle={`${details.empresa?.usuariosValidados || 0} validados`}
                      icon={<PeopleIcon color="primary" />}
                      color="primary"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <StatCard
                      title="Usuarios con interacción"
                      value={details.empresa?.usuariosConInteraccion || 0}
                      subtitle="Han registrado movimientos"
                      icon={<CheckCircleIcon color="success" />}
                      color="success"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <StatCard
                      title="Movimientos de caja"
                      value={details.movimientos?.total || 0}
                      subtitle={`${details.movimientos?.ultimaSemana || 0} última semana`}
                      icon={<ReceiptIcon color="info" />}
                      color="info"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <StatCard
                      title="Remitos de acopio"
                      value={details.acopios?.totalRemitos || 0}
                      subtitle={`${details.acopios?.remitosUltimaSemana || 0} última semana`}
                      icon={<InventoryIcon color="warning" />}
                      color="warning"
                    />
                  </Grid>

                  {/* Gráficos por día */}
                  {details.resumenSemanal?.movimientosPorDia && Object.keys(details.resumenSemanal.movimientosPorDia).length > 0 && (
                    <Grid item xs={12} md={6}>
                      <SimpleBarChart 
                        data={details.resumenSemanal.movimientosPorDia} 
                        title="Movimientos por día (última semana)"
                      />
                    </Grid>
                  )}
                  {details.resumenSemanal?.remitosPorDia && Object.keys(details.resumenSemanal.remitosPorDia).length > 0 && (
                    <Grid item xs={12} md={6}>
                      <SimpleBarChart 
                        data={details.resumenSemanal.remitosPorDia} 
                        title="Remitos por día (última semana)"
                      />
                    </Grid>
                  )}

                  {/* Tabla de usuarios */}
                  {details.usuarios && details.usuarios.length > 0 && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>Detalle por usuario</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Nombre</TableCell>
                                  <TableCell>Teléfono</TableCell>
                                  <TableCell>Email</TableCell>
                                  <TableCell align="center">Validado</TableCell>
                                  <TableCell align="center">Admin</TableCell>
                                  <TableCell align="center">Mov. Totales</TableCell>
                                  <TableCell align="center">Mov. Semana</TableCell>
                                  <TableCell align="center">Insights</TableCell>
                                  <TableCell>Último uso</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {details.usuarios.map((usuario) => (
                                  <TableRow key={usuario.id}>
                                    <TableCell>{usuario.nombre}</TableCell>
                                    <TableCell>{usuario.phone}</TableCell>
                                    <TableCell>{usuario.email || '-'}</TableCell>
                                    <TableCell align="center">
                                      {usuario.validado ? (
                                        <CheckCircleIcon color="success" fontSize="small" />
                                      ) : (
                                        <Typography color="textSecondary">-</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell align="center">
                                      {usuario.admin ? (
                                        <Chip label="Admin" size="small" color="primary" />
                                      ) : '-'}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip 
                                        label={usuario.totalMovimientos} 
                                        size="small" 
                                        color={usuario.totalMovimientos > 0 ? 'primary' : 'default'}
                                        variant={usuario.totalMovimientos > 0 ? 'filled' : 'outlined'}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip 
                                        label={usuario.movimientosUltimaSemana} 
                                        size="small" 
                                        color={usuario.movimientosUltimaSemana > 0 ? 'success' : 'default'}
                                        variant={usuario.movimientosUltimaSemana > 0 ? 'filled' : 'outlined'}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip 
                                        label={usuario.insightsCount || 0} 
                                        size="small" 
                                        color={usuario.insightsCount > 0 ? 'warning' : 'default'}
                                        variant={usuario.insightsCount > 0 ? 'filled' : 'outlined'}
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
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Alert severity="info">No hay datos disponibles</Alert>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const AnalyticsEmpresasPage = () => {
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMetricas, setIsLoadingMetricas] = useState(false);
  const [progreso, setProgreso] = useState({ procesadas: 0, total: 0, porcentaje: 0 });
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filtroCliente, setFiltroCliente] = useState('clientes');
  
  // Estado para ordenamiento
  const [orderBy, setOrderBy] = useState('nombre');
  const [order, setOrder] = useState('asc');
  
  // Estado para el selector de fechas
  const [showDateSelector, setShowDateSelector] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Por defecto última semana
    return date;
  });
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [periodoInfo, setPeriodoInfo] = useState(null);
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
    
    if (diffDias > 31) {
      setDateError('El rango no puede ser mayor a 31 días');
      return false;
    }
    
    return true;
  };
  
  // Filtrar empresas según el tab activo
  const getEmpresasFiltradas = (lista, filtro) => {
    switch (filtro) {
      case 'clientes':
        return lista.filter(emp => emp.esCliente && !emp.estaDadoDeBaja);
      case 'dados-baja':
        return lista.filter(emp => emp.esCliente && emp.estaDadoDeBaja);
      case 'no-clientes':
        return lista.filter(emp => !emp.esCliente);
      default: // 'todos'
        return lista;
    }
  };
  
  // Cargar métricas solo de las empresas visibles en el tab actual
  const cargarMetricasDeEmpresasVisibles = async (todasLasEmpresas, filtro) => {
    // Obtener las empresas que corresponden al filtro y que no tienen métricas
    const empresasDelFiltro = getEmpresasFiltradas(todasLasEmpresas, filtro);
    const empresasSinMetricas = empresasDelFiltro.filter(e => !e.metricasCargadas);
    
    if (empresasSinMetricas.length === 0) {
      setIsLoadingMetricas(false);
      return;
    }
    
    setIsLoadingMetricas(true);
    setProgreso({ procesadas: 0, total: empresasSinMetricas.length, porcentaje: 0 });
    
    const empresaIds = empresasSinMetricas.map(e => e.id);
    
    await analyticsService.getMetricasBatch(
      empresaIds,
      fechaDesde,
      fechaHasta,
      5, // batch size
      (progressInfo) => {
        setProgreso(progressInfo);
        
        // Actualizar empresas con las métricas recién cargadas
        setEmpresas(prev => {
          const updated = [...prev];
          progressInfo.ultimoBatch.forEach(metricas => {
            if (metricas && !metricas.error) {
              const idx = updated.findIndex(e => e.id === metricas.empresaId);
              if (idx !== -1) {
                updated[idx] = {
                  ...updated[idx],
                  totalUsuarios: metricas.totalUsuarios,
                  usuariosValidados: metricas.usuariosValidados,
                  usuariosConMovimientos: metricas.usuariosConMovimientos,
                  movimientosEnPeriodo: metricas.movimientosEnPeriodo,
                  totalMovimientos: metricas.totalMovimientos,
                  totalAcopios: metricas.totalAcopios,
                  remitosEnPeriodo: metricas.remitosEnPeriodo,
                  insightsEnPeriodo: metricas.insightsEnPeriodo || 0,
                  movimientosPorOrigen: metricas.movimientosPorOrigen || { whatsapp: 0, web: 0, otro: 0 },
                  ultimoUso: metricas.ultimoUso,
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
  
  // Cargar datos con el rango de fechas seleccionado (carga progresiva)
  const handleCargarDatos = async () => {
    if (!validarFechas()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Paso 1: Cargar lista básica de empresas (rápido)
      const listaData = await analyticsService.getEmpresasLista();
      if (listaData.error) {
        setError(listaData.msg);
        setIsLoading(false);
        return;
      }
      
      // Inicializar empresas con datos básicos (sin métricas aún)
      const empresasConPlaceholder = listaData.empresas.map(emp => ({
        ...emp,
        totalUsuarios: null, // null indica "cargando"
        usuariosValidados: null,
        usuariosConMovimientos: null,
        movimientosEnPeriodo: null,
        totalMovimientos: null,
        totalAcopios: null,
        remitosEnPeriodo: null,
        insightsEnPeriodo: null,
        movimientosPorOrigen: null,
        ultimoUso: null,
        metricasCargadas: false,
      }));
      
      setEmpresas(empresasConPlaceholder);
      setPeriodoInfo({
        desde: fechaDesde.toISOString(),
        hasta: fechaHasta.toISOString(),
        dias: Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24))
      });
      setShowDateSelector(false);
      setIsLoading(false);
      
      // Paso 2: Cargar métricas SOLO de empresas del filtro activo
      await cargarMetricasDeEmpresasVisibles(empresasConPlaceholder, filtroCliente);
      
    } catch (err) {
      setError('Error al cargar las empresas');
      console.error(err);
      setIsLoading(false);
      setIsLoadingMetricas(false);
    }
  };
  
  // Manejar ordenamiento de columnas
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
      
      // Manejar valores null/undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Para fechas, convertir a timestamps
      if (orderBy === 'ultimoUso' || orderBy === 'fechaRegistroCliente') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      // Para strings, comparar en minúsculas
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

  // Manejar cambio de filtro - cargar métricas de las nuevas empresas visibles
  const handleFiltroChange = async (e, value) => {
    if (!value) return;
    setFiltroCliente(value);
    setPage(0); // Resetear paginación
    
    // Si ya hay empresas cargadas y no estamos cargando métricas, cargar las del nuevo filtro
    if (empresas.length > 0 && !isLoadingMetricas && periodoInfo) {
      await cargarMetricasDeEmpresasVisibles(empresas, value);
    }
  };

  const filteredEmpresas = useMemo(() => {
    let filtered = empresas;
    
    // Filtro por estado de cliente
    if (filtroCliente === 'clientes') {
      filtered = filtered.filter(emp => emp.esCliente && !emp.estaDadoDeBaja);
    } else if (filtroCliente === 'no-clientes') {
      filtered = filtered.filter(emp => !emp.esCliente);
    } else if (filtroCliente === 'dados-baja') {
      filtered = filtered.filter(emp => emp.esCliente && emp.estaDadoDeBaja);
    }
    // 'todos' no filtra
    
    // Filtro por búsqueda de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.nombre?.toLowerCase().includes(term) ||
        emp.tipo?.toLowerCase().includes(term)
      );
    }
    
    // Aplicar ordenamiento
    filtered = filtered.sort(getComparator(order, orderBy));
    
    return filtered;
  }, [empresas, searchTerm, filtroCliente, order, orderBy]);

  const paginatedEmpresas = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEmpresas.slice(start, start + rowsPerPage);
  }, [filteredEmpresas, page, rowsPerPage]);

  // Calcular totales - SOLO de clientes (activos + dados de baja) con métricas cargadas
  const totales = useMemo(() => {
    const clientes = empresas.filter(e => e.esCliente && !e.estaDadoDeBaja);
    const dadosBaja = empresas.filter(e => e.esCliente && e.estaDadoDeBaja);
    const noClientes = empresas.filter(e => !e.esCliente);
    const todosClientes = empresas.filter(e => e.esCliente); // activos + bajas
    
    // Solo sumar métricas de empresas que ya cargaron
    const clientesConMetricas = todosClientes.filter(e => e.metricasCargadas);
    const clientesActivosConMetricas = clientes.filter(e => e.metricasCargadas);
    
    return {
      // Contadores para los filtros
      empresas: empresas.length,
      clientes: clientes.length,
      dadosBaja: dadosBaja.length,
      noClientes: noClientes.length,
      
      // Métricas SOLO de clientes (activos + dados de baja) - EN EL PERIODO
      totalClientes: todosClientes.length,
      clientesConMetricas: clientesConMetricas.length,
      usuarios: clientesConMetricas.reduce((sum, e) => sum + (e.totalUsuarios || 0), 0),
      usuariosValidados: clientesConMetricas.reduce((sum, e) => sum + (e.usuariosValidados || 0), 0),
      movimientosEnPeriodo: clientesConMetricas.reduce((sum, e) => sum + (e.movimientosEnPeriodo || 0), 0),
      movimientosTotales: clientesConMetricas.reduce((sum, e) => sum + (e.totalMovimientos || 0), 0),
      acopios: clientesConMetricas.reduce((sum, e) => sum + (e.totalAcopios || 0), 0),
      remitosEnPeriodo: clientesConMetricas.reduce((sum, e) => sum + (e.remitosEnPeriodo || 0), 0),
      insightsEnPeriodo: clientesConMetricas.reduce((sum, e) => sum + (e.insightsEnPeriodo || 0), 0),
      
      // Métricas solo de clientes activos - EN EL PERIODO
      clientesActivosUsuarios: clientesActivosConMetricas.reduce((sum, e) => sum + (e.totalUsuarios || 0), 0),
      clientesActivosMovimientos: clientesActivosConMetricas.reduce((sum, e) => sum + (e.movimientosEnPeriodo || 0), 0),
      clientesActivosRemitos: clientesActivosConMetricas.reduce((sum, e) => sum + (e.remitosEnPeriodo || 0), 0),
      clientesActivosInsights: clientesActivosConMetricas.reduce((sum, e) => sum + (e.insightsEnPeriodo || 0), 0),
      
      // Totales por origen
      totalWhatsapp: clientesConMetricas.reduce((sum, e) => sum + (e.movimientosPorOrigen?.whatsapp || 0), 0),
      totalWeb: clientesConMetricas.reduce((sum, e) => sum + (e.movimientosPorOrigen?.web || 0), 0),
    };
  }, [empresas]);
  
  // Formatear fecha para mostrar
  const formatPeriodo = () => {
    if (!periodoInfo) return '';
    const desde = new Date(periodoInfo.desde).toLocaleDateString('es-AR');
    const hasta = new Date(periodoInfo.hasta).toLocaleDateString('es-AR');
    return `${desde} - ${hasta} (${periodoInfo.dias} días)`;
  };

  // Si hay que mostrar el selector de fechas
  if (showDateSelector) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <Head>
          <title>Analytics - Seleccionar Periodo</title>
        </Head>
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Container maxWidth="sm">
            <Card sx={{ p: 4 }}>
              <Stack spacing={3} alignItems="center">
                <DateRangeIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                <Typography variant="h4" textAlign="center">
                  Seleccionar Periodo de Análisis
                </Typography>
                <Typography variant="body1" color="textSecondary" textAlign="center">
                  Elija el rango de fechas para analizar. Máximo 31 días.
                </Typography>
                
                {dateError && (
                  <Alert severity="error" sx={{ width: '100%' }}>
                    {dateError}
                  </Alert>
                )}
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                  <DatePicker
                    label="Desde"
                    value={fechaDesde}
                    onChange={setFechaDesde}
                    maxDate={new Date()}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                  <DatePicker
                    label="Hasta"
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
                    label="Última semana" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setDate(desde.getDate() - 7);
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    clickable
                  />
                  <Chip 
                    label="Últimos 15 días" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setDate(desde.getDate() - 15);
                      setFechaDesde(desde);
                      setFechaHasta(hasta);
                    }}
                    variant="outlined"
                    clickable
                  />
                  <Chip 
                    label="Último mes" 
                    onClick={() => {
                      const hasta = new Date();
                      const desde = new Date();
                      desde.setDate(desde.getDate() - 30);
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
                  {isLoading ? 'Cargando...' : 'Analizar Periodo'}
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
        <title>Analytics - Empresas</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {/* Header con periodo */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h4">Analytics de Empresas</Typography>
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

            {/* Tarjetas de resumen - SOLO CLIENTES */}
            <Alert severity="info" sx={{ mb: 1 }}>
              📊 Las métricas del periodo muestran datos de <strong>clientes</strong> únicamente (activos + dados de baja)
              {isLoadingMetricas && (
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  — Cargando métricas: {progreso.procesadas}/{progreso.total}
                </Typography>
              )}
            </Alert>
            
            {/* Barra de progreso de carga de métricas */}
            {isLoadingMetricas && (
              <Box sx={{ width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" color="textSecondary">
                    Cargando métricas de empresas...
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
            
            <Grid container spacing={2}>
              {/* Resumen de clientes */}
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Clientes Activos"
                  value={totales.clientes}
                  subtitle={`${totales.clientesActivosUsuarios} usuarios`}
                  icon={<PersonAddIcon color="success" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Dados de Baja"
                  value={totales.dadosBaja}
                  icon={<PersonOffIcon color="error" />}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Usuarios (Clientes)"
                  value={totales.usuarios}
                  subtitle={`${totales.usuariosValidados} validados`}
                  icon={<PeopleIcon color="primary" />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Movimientos (Periodo)"
                  value={totales.movimientosEnPeriodo.toLocaleString()}
                  subtitle={`${totales.movimientosTotales.toLocaleString()} histórico`}
                  icon={<ReceiptIcon color="info" />}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Remitos (Periodo)"
                  value={totales.remitosEnPeriodo.toLocaleString()}
                  subtitle={`${totales.acopios} acopios totales`}
                  icon={<InventoryIcon color="warning" />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <StatCard
                  title="Insights (Periodo)"
                  value={totales.insightsEnPeriodo.toLocaleString()}
                  subtitle={`${totales.clientes > 0 ? Math.round(totales.clientesActivosInsights / totales.clientes) : 0} prom/cliente`}
                  icon={<LightbulbIcon color="secondary" />}
                  color="secondary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Promedio/cliente (periodo)
                    </Typography>
                    <Box display="flex" gap={2} mt={1}>
                      <Box>
                        <Typography variant="h6">
                          {totales.clientes > 0 ? Math.round(totales.clientesActivosMovimientos / totales.clientes) : 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">movs</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6">
                          {totales.clientes > 0 ? Math.round(totales.clientesActivosRemitos / totales.clientes) : 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">remitos</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6">
                          {totales.clientes > 0 ? Math.round(totales.clientesActivosInsights / totales.clientes) : 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">insights</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Filtros */}
            <Card sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                {/* Filtro por estado de cliente */}
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Filtrar por estado
                  </Typography>
                  <ToggleButtonGroup
                    value={filtroCliente}
                    exclusive
                    onChange={handleFiltroChange}
                    size="small"
                    disabled={isLoadingMetricas}
                  >
                    <ToggleButton value="clientes" color="success">
                      <PersonAddIcon sx={{ mr: 0.5 }} fontSize="small" />
                      Clientes ({totales.clientes})
                    </ToggleButton>
                    <ToggleButton value="dados-baja" color="error">
                      <PersonOffIcon sx={{ mr: 0.5 }} fontSize="small" />
                      Bajas ({totales.dadosBaja})
                    </ToggleButton>
                    <ToggleButton value="no-clientes" color="warning">
                      <BusinessIcon sx={{ mr: 0.5 }} fontSize="small" />
                      No clientes ({totales.noClientes})
                    </ToggleButton>
                    <ToggleButton value="todos">
                      Todos ({totales.empresas})
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                {/* Búsqueda */}
                <TextField
                  placeholder="Buscar por nombre o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ minWidth: 300 }}
                />
                
                {/* Indicador de resultados */}
                <Chip 
                  label={`${filteredEmpresas.length} resultados`} 
                  color="primary" 
                  variant="outlined"
                />
              </Stack>
            </Card>

            {/* Tabla de empresas */}
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
                        <TableCell align="center" sortDirection={orderBy === 'totalUsuarios' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'totalUsuarios'}
                            direction={orderBy === 'totalUsuarios' ? order : 'asc'}
                            onClick={() => handleRequestSort('totalUsuarios')}
                          >
                            Usuarios
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'usuariosConMovimientos' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'usuariosConMovimientos'}
                            direction={orderBy === 'usuariosConMovimientos' ? order : 'asc'}
                            onClick={() => handleRequestSort('usuariosConMovimientos')}
                          >
                            Con movimientos
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'movimientosEnPeriodo' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'movimientosEnPeriodo'}
                            direction={orderBy === 'movimientosEnPeriodo' ? order : 'asc'}
                            onClick={() => handleRequestSort('movimientosEnPeriodo')}
                          >
                            Movimientos (periodo)
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
                        <TableCell align="center" sortDirection={orderBy === 'remitosEnPeriodo' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'remitosEnPeriodo'}
                            direction={orderBy === 'remitosEnPeriodo' ? order : 'asc'}
                            onClick={() => handleRequestSort('remitosEnPeriodo')}
                          >
                            Remitos (periodo)
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sortDirection={orderBy === 'insightsEnPeriodo' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'insightsEnPeriodo'}
                            direction={orderBy === 'insightsEnPeriodo' ? order : 'asc'}
                            onClick={() => handleRequestSort('insightsEnPeriodo')}
                          >
                            Insights
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'fechaRegistroCliente' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'fechaRegistroCliente'}
                            direction={orderBy === 'fechaRegistroCliente' ? order : 'asc'}
                            onClick={() => handleRequestSort('fechaRegistroCliente')}
                          >
                            Cliente desde
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={orderBy === 'ultimoUso' ? order : false}>
                          <TableSortLabel
                            active={orderBy === 'ultimoUso'}
                            direction={orderBy === 'ultimoUso' ? order : 'asc'}
                            onClick={() => handleRequestSort('ultimoUso')}
                          >
                            Último uso
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedEmpresas.map((empresa) => (
                        <EmpresaRow key={empresa.id} empresa={empresa} />
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

AnalyticsEmpresasPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AnalyticsEmpresasPage;
