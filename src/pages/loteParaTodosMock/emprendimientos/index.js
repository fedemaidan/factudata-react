// src/pages/loteParaTodosMock/emprendimientos/index.js
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, Button, Chip,
  TextField, InputAdornment, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip,
  Alert, Stack, Divider, LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from '../../../components/layouts/LoteParaTodosLayout';
import { 
  mockEmprendimientos,
  ESTADO_EMPRENDIMIENTO,
  ESTADO_EMPRENDIMIENTO_LABELS,
  ESTADO_EMPRENDIMIENTO_COLORS,
  getEstadisticasGeneralesEmprendimientos,
  buscarEmprendimientos,
  getEmprendimientosByEstado
} from '../../../data/loteParaTodos/mockEmprendimientos';

const EmprendimientosIndex = () => {
  const router = useRouter();
  
  // Estados del componente
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState('');
  
  // Estadísticas generales
  const estadisticasGenerales = useMemo(() => {
    return getEstadisticasGeneralesEmprendimientos();
  }, []);
  
  // Emprendimientos filtrados
  const emprendimientosFiltrados = useMemo(() => {
    let emprendimientos = [...mockEmprendimientos];
    
    // Filtro por texto
    if (filtroTexto) {
      emprendimientos = buscarEmprendimientos(filtroTexto);
    }
    
    // Filtro por estado
    if (filtroEstado) {
      emprendimientos = emprendimientos.filter(emp => emp.estado === filtroEstado);
    }
    
    // Filtro por moneda
    if (filtroMoneda) {
      emprendimientos = emprendimientos.filter(emp => emp.moneda_principal === filtroMoneda);
    }
    
    // Ordenar por fecha de actualización (más recientes primero)
    return emprendimientos.sort((a, b) => 
      new Date(b.fecha_ultima_actualizacion) - new Date(a.fecha_ultima_actualizacion)
    );
  }, [filtroTexto, filtroEstado, filtroMoneda]);
  
  // Funciones auxiliares
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };
  
  const formatearMoneda = (monto, moneda = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda
    }).format(monto);
  };
  
  const calcularProgreso = (emprendimiento) => {
    const { lotes_vendidos, lotes_reservados, cantidad_lotes_total } = emprendimiento;
    const lotesComprometidos = (lotes_vendidos || 0) + (lotes_reservados || 0);
    return Math.round((lotesComprometidos / cantidad_lotes_total) * 100);
  };
  
  const navigateToEmprendimiento = (id) => {
    router.push(`/loteParaTodosMock/emprendimientos/${id}`);
  };
  
  const navigateToNuevo = () => {
    router.push('/loteParaTodosMock/emprendimientos/nuevo');
  };

  return (
    <LoteParaTodosLayout currentModule="emprendimientos" pageTitle="Gestión de Emprendimientos">
      <Head>
        <title>Emprendimientos - Lote Para Todos</title>
      </Head>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Gestión de Emprendimientos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Administra y configura todos los emprendimientos inmobiliarios
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={navigateToNuevo}
            size="large"
          >
            Nuevo Emprendimiento
          </Button>
        </Box>

        {/* Estadísticas Generales */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#e3f2fd' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BusinessIcon sx={{ color: '#1976d2', mr: 1 }} />
                  <Typography variant="h6" color="#1976d2">
                    Total Emprendimientos
                  </Typography>
                </Box>
                <Typography variant="h3" color="#1976d2" fontWeight="bold">
                  {estadisticasGenerales.total_emprendimientos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#e8f5e8' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ color: '#2e7d32', mr: 1 }} />
                  <Typography variant="h6" color="#2e7d32">
                    Activos
                  </Typography>
                </Box>
                <Typography variant="h3" color="#2e7d32" fontWeight="bold">
                  {estadisticasGenerales.activos}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#fff3e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ScheduleIcon sx={{ color: '#f57c00', mr: 1 }} />
                  <Typography variant="h6" color="#f57c00">
                    En Borrador
                  </Typography>
                </Box>
                <Typography variant="h3" color="#f57c00" fontWeight="bold">
                  {estadisticasGenerales.borrador}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: '#fce4ec' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssessmentIcon sx={{ color: '#c2185b', mr: 1 }} />
                  <Typography variant="h6" color="#c2185b">
                    Total Lotes
                  </Typography>
                </Box>
                <Typography variant="h3" color="#c2185b" fontWeight="bold">
                  {estadisticasGenerales.total_lotes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SearchIcon sx={{ mr: 1 }} />
            Filtros de Búsqueda
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Buscar emprendimiento"
                placeholder="Nombre, código, ciudad..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="">Todos los estados</MenuItem>
                {Object.entries(ESTADO_EMPRENDIMIENTO_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                label="Moneda"
                value={filtroMoneda}
                onChange={(e) => setFiltroMoneda(e.target.value)}
              >
                <MenuItem value="">Todas las monedas</MenuItem>
                <MenuItem value="ARS">Pesos Argentinos (ARS)</MenuItem>
                <MenuItem value="USD">Dólares (USD)</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setFiltroTexto('');
                  setFiltroEstado('');
                  setFiltroMoneda('');
                }}
                sx={{ height: '56px' }}
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alertas */}
      {estadisticasGenerales.suspendidos > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Hay {estadisticasGenerales.suspendidos} emprendimiento(s) suspendido(s) que requieren atención.
          </Typography>
        </Alert>
      )}

      {/* Tabla de Emprendimientos */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Emprendimientos ({emprendimientosFiltrados.length})
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Emprendimiento</strong></TableCell>
                  <TableCell><strong>Ubicación</strong></TableCell>
                  <TableCell><strong>Estado</strong></TableCell>
                  <TableCell align="center"><strong>Lotes</strong></TableCell>
                  <TableCell align="center"><strong>Progreso</strong></TableCell>
                  <TableCell><strong>Moneda</strong></TableCell>
                  <TableCell><strong>Última Act.</strong></TableCell>
                  <TableCell align="center"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emprendimientosFiltrados.map((emprendimiento) => {
                  const progreso = calcularProgreso(emprendimiento);
                  
                  return (
                    <TableRow 
                      key={emprendimiento.id} 
                      hover
                      sx={{ '&:hover': { backgroundColor: '#f8f9fa' } }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight="600">
                            {emprendimiento.nombre}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emprendimiento.codigo_interno} • {emprendimiento.sociedad_razon_social}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {emprendimiento.ciudad}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {emprendimiento.provincia}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={ESTADO_EMPRENDIMIENTO_LABELS[emprendimiento.estado]} 
                          color={ESTADO_EMPRENDIMIENTO_COLORS[emprendimiento.estado]}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="600">
                          {emprendimiento.cantidad_lotes_total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emprendimiento.superficie_total_hectareas} ha
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ width: '100%', maxWidth: 80 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={progreso} 
                            color={progreso > 70 ? 'success' : progreso > 40 ? 'warning' : 'primary'}
                            sx={{ mb: 0.5 }}
                          />
                          <Typography variant="caption">
                            {progreso}%
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={emprendimiento.moneda_principal}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {formatearFecha(emprendimiento.fecha_ultima_actualizacion)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          por {emprendimiento.modificado_por}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Ver detalle">
                            <IconButton 
                              size="small"
                              onClick={() => navigateToEmprendimiento(emprendimiento.id)}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton 
                              size="small"
                              onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${emprendimiento.id}/editar`)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {emprendimientosFiltrados.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No se encontraron emprendimientos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filtroTexto || filtroEstado || filtroMoneda 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primer emprendimiento'
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </LoteParaTodosLayout>
  );
};

export default EmprendimientosIndex;