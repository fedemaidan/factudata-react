// src/pages/loteParaTodosMock/emprendimientos/[id]/index.js
import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, Button, Chip,
  Tabs, Tab, Paper, Divider, LinearProgress, Alert, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from '../../../../components/layouts/LoteParaTodosLayout';
import { 
  mockEmprendimientos,
  getEmprendimientoById,
  ESTADO_EMPRENDIMIENTO,
  ESTADO_EMPRENDIMIENTO_LABELS,
  ESTADO_EMPRENDIMIENTO_COLORS
} from '../../../../data/loteParaTodos/mockEmprendimientos';
import { mockLotes, getEstadisticasLotes } from '../../../../data/loteParaTodos/mockLotes';
import { mockContratos, getEstadisticasContratos } from '../../../../data/loteParaTodos/mockContratos';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`emprendimiento-tabpanel-${index}`}
      aria-labelledby={`emprendimiento-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EmprendimientoDetalle = () => {
  const router = useRouter();
  const { id } = router.query;
  const [tabActivo, setTabActivo] = useState(0);
  
  // Obtener datos del emprendimiento
  const emprendimiento = useMemo(() => {
    if (!id) return null;
    return getEmprendimientoById(parseInt(id));
  }, [id]);
  
  // Datos relacionados (zonas eliminadas del modelo)
  
  // Calcular estadísticas del emprendimiento
  const estadisticas = useMemo(() => {
    if (!emprendimiento) return {};
    
    // Lotes del emprendimiento
    const lotesEmprendimiento = mockLotes.filter(lote => 
      lote.emprendimiento_id === emprendimiento.id
    );
    
    // Contratos del emprendimiento
    const contratosEmprendimiento = mockContratos.filter(contrato => 
      contrato.emprendimiento_id === emprendimiento.id
    );
    
    // Estadísticas de lotes
    const lotesPorEstado = {
      disponibles: lotesEmprendimiento.filter(l => l.estado === 'DISPONIBLE').length,
      vendidos: lotesEmprendimiento.filter(l => l.estado === 'VENDIDO').length,
      reservados: lotesEmprendimiento.filter(l => l.estado === 'RESERVADO').length,
      bloqueados: lotesEmprendimiento.filter(l => l.estado === 'BLOQUEADO').length
    };
    
    // Estadísticas de contratos
    const contratosPorEstado = {
      activo: contratosEmprendimiento.filter(c => c.estado === 'ACTIVO').length,
      finalizado: contratosEmprendimiento.filter(c => c.estado === 'FINALIZADO').length,
      cancelado: contratosEmprendimiento.filter(c => c.estado === 'CANCELADO').length,
      suspendido: contratosEmprendimiento.filter(c => c.estado === 'SUSPENDIDO').length
    };
    
    // Facturación
    const montoTotalVentas = contratosEmprendimiento.reduce((sum, c) => sum + c.monto_total, 0);
    const saldoPendiente = contratosEmprendimiento.reduce((sum, c) => sum + (c.monto_total - c.seña_pagada), 0);
    
    // Progreso general
    const lotesComprometidos = lotesPorEstado.vendidos + lotesPorEstado.reservados;
    const progresoVentas = lotesEmprendimiento.length > 0 
      ? Math.round((lotesComprometidos / lotesEmprendimiento.length) * 100)
      : 0;
    
    return {
      lotes: {
        total: lotesEmprendimiento.length,
        ...lotesPorEstado,
        progreso: progresoVentas
      },
      contratos: {
        total: contratosEmprendimiento.length,
        ...contratosPorEstado
      },
      financiero: {
        monto_total_ventas: montoTotalVentas,
        saldo_pendiente: saldoPendiente,
        monto_cobrado: montoTotalVentas - saldoPendiente
      }
    };
  }, [emprendimiento]);
  
  // Funciones auxiliares
  const formatearMoneda = (monto, moneda = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda
    }).format(monto);
  };
  
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  if (!emprendimiento) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Alert severity="error">
          Emprendimiento no encontrado
        </Alert>
      </LoteParaTodosLayout>
    );
  }

  return (
    <LoteParaTodosLayout currentModule="emprendimientos" pageTitle={emprendimiento.nombre}>
      <Head>
        <title>{emprendimiento.nombre} - Emprendimientos</title>
      </Head>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/loteParaTodosMock/emprendimientos')}
            variant="outlined"
          >
            Volver
          </Button>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1">
              {emprendimiento.nombre}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {emprendimiento.codigo_interno} • {emprendimiento.sociedad_razon_social}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip 
              label={ESTADO_EMPRENDIMIENTO_LABELS[emprendimiento.estado]}
              color={ESTADO_EMPRENDIMIENTO_COLORS[emprendimiento.estado]}
            />
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/editar`)}
            >
              Editar
            </Button>
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/configuracion`)}
            >
              Configurar
            </Button>
          </Stack>
        </Box>

        {/* Información básica */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <LocationIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
              <Box>
                <Typography variant="body2" fontWeight="600">
                  {emprendimiento.direccion}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {emprendimiento.ciudad}, {emprendimiento.provincia}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <BusinessIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
              <Box>
                <Typography variant="body2" fontWeight="600">
                  {emprendimiento.desarrollador.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {emprendimiento.desarrollador.contacto} • {emprendimiento.desarrollador.telefono}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <HomeIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6" color="#1976d2">
                  Total Lotes
                </Typography>
              </Box>
              <Typography variant="h3" color="#1976d2" fontWeight="bold">
                {estadisticas.lotes?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {emprendimiento.superficie_total_hectareas} hectáreas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: '#2e7d32', mr: 1 }} />
                <Typography variant="h6" color="#2e7d32">
                  Progreso Ventas
                </Typography>
              </Box>
              <Typography variant="h3" color="#2e7d32" fontWeight="bold">
                {estadisticas.lotes?.progreso || 0}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={estadisticas.lotes?.progreso || 0}
                color="success"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ color: '#f57c00', mr: 1 }} />
                <Typography variant="h6" color="#f57c00">
                  Contratos Activos
                </Typography>
              </Box>
              <Typography variant="h3" color="#f57c00" fontWeight="bold">
                {estadisticas.contratos?.activo || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                de {estadisticas.contratos?.total || 0} totales
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                <Typography variant="h6" color="#7b1fa2">
                  Facturación
                </Typography>
              </Box>
              <Typography variant="h4" color="#7b1fa2" fontWeight="bold">
                {formatearMoneda(estadisticas.financiero?.monto_total_ventas || 0, emprendimiento.moneda_principal)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pendiente: {formatearMoneda(estadisticas.financiero?.saldo_pendiente || 0, emprendimiento.moneda_principal)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs de contenido */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabActivo} onChange={(e, newValue) => setTabActivo(newValue)}>
            <Tab label="Información General" />
            <Tab label="Lotes y Estadísticas" />
            <Tab label="Dashboard Comercial" />
            <Tab label="Configuración" />
          </Tabs>
        </Box>

        {/* Tab 1: Información General */}
        <TabPanel value={tabActivo} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Datos del Emprendimiento
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Descripción
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.descripcion}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Lanzamiento
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.fecha_lanzamiento ? formatearFecha(emprendimiento.fecha_lanzamiento) : 'No lanzado'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Entrega Estimada
                  </Typography>
                  <Typography variant="body1">
                    {formatearFecha(emprendimiento.fecha_entrega_estimada)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Moneda Principal
                  </Typography>
                  <Chip label={emprendimiento.moneda_principal} size="small" />
                </Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Desarrollador
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Empresa
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.desarrollador.nombre}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Contacto
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.desarrollador.contacto}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Teléfono
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.desarrollador.telefono}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {emprendimiento.desarrollador.email}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Lotes y Estadísticas */}
        <TabPanel value={tabActivo} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Distribución de Lotes por Estado
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e8f5e8' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">
                      {estadisticas.lotes?.disponible || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Disponibles
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      {estadisticas.lotes?.vendido || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendidos
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#fff3e0' }}>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">
                      {estadisticas.lotes?.reservado || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Reservados
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#ffebee' }}>
                    <Typography variant="h4" color="error.main" fontWeight="bold">
                      {estadisticas.lotes?.bloqueado || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bloqueados
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Gestión de Lotes
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total de lotes
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {estadisticas.lotes?.total || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Superficie total
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {emprendimiento.superficie_total_hectareas} ha
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Progreso ventas
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {estadisticas.lotes?.progreso || 0}%
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/edicion-masiva`)}
                  >
                    Edición Masiva Excel
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Dashboard Comercial */}
        <TabPanel value={tabActivo} index={2}>
          <Typography variant="h6" gutterBottom>
            Resumen Comercial
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Estado de Contratos
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Activos</Typography>
                    <Chip label={estadisticas.contratos?.activo || 0} color="success" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Completados</Typography>
                    <Chip label={estadisticas.contratos?.completado || 0} color="primary" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">En Mora</Typography>
                    <Chip label={estadisticas.contratos?.mora || 0} color="warning" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Caídos</Typography>
                    <Chip label={estadisticas.contratos?.caido || 0} color="error" size="small" />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Resumen Financiero
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Monto Total Ventas
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {formatearMoneda(estadisticas.financiero?.monto_total_ventas || 0, emprendimiento.moneda_principal)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Monto Cobrado
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatearMoneda(estadisticas.financiero?.monto_cobrado || 0, emprendimiento.moneda_principal)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Saldo Pendiente
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatearMoneda(estadisticas.financiero?.saldo_pendiente || 0, emprendimiento.moneda_principal)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 4: Configuración */}
        <TabPanel value={tabActivo} index={3}>
          <Typography variant="h6" gutterBottom>
            Acciones de Configuración
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/edicion-masiva`)}
              >
                Edición Masiva Excel
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/lotes`)}
              >
                Carga Masiva Lotes
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/precios`)}
              >
                Listas de Precios
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/planes`)}
              >
                Planes Financiación
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/servicios`)}
              >
                Servicios
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => router.push(`/loteParaTodosMock/emprendimientos/${id}/reportes`)}
              >
                Reportes
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </LoteParaTodosLayout>
  );
};

export default EmprendimientoDetalle;