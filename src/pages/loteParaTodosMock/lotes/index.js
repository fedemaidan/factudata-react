import Head from 'next/head';
import React, { useMemo, useState } from 'react';
import {
  Box, Button, Container, Paper, Stack, Typography, Grid, Card, CardContent,
  Chip, IconButton, Tooltip, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useRouter } from 'next/router';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { 
  mockEmprendimientos,
  mockLotes,
  mockContratos
} from 'src/data/loteParaTodos/index';

const LotesDashboard = () => {
  const router = useRouter();

  // Calcular estadísticas por emprendimiento
  const emprendimientosConEstadisticas = useMemo(() => {
    return mockEmprendimientos.map(emprendimiento => {
      // Obtener todos los lotes del emprendimiento
      const lotesEmprendimiento = mockLotes.filter(lote => lote.emprendimiento_id === emprendimiento.id);
      
      // Contar por estado
      const estadisticas = {
        disponibles: 0,
        vendidos: 0,
        reservados: 0,
        bloqueados: 0,
        total: lotesEmprendimiento.length
      };

      lotesEmprendimiento.forEach(lote => {
        switch (lote.estado) {
          case 'DISPONIBLE':
            estadisticas.disponibles++;
            break;
          case 'VENDIDO':
            estadisticas.vendidos++;
            break;
          case 'RESERVADO':
            estadisticas.reservados++;
            break;
          case 'BLOQUEADO':
            estadisticas.bloqueados++;
            break;
          default:
            break;
        }
      });

      // Encontrar última actividad (último contrato del emprendimiento)
      const contratosMasRecientes = mockContratos
        .filter(contrato => {
          const lote = mockLotes.find(l => l.id === contrato.lote_id);
          return lote && lote.emprendimiento_id === emprendimiento.id;
        })
        .sort((a, b) => new Date(b.fecha_contrato) - new Date(a.fecha_contrato));

      const ultimaActividad = contratosMasRecientes.length > 0 
        ? `Última venta: ${new Date(contratosMasRecientes[0].fecha_contrato).toLocaleDateString('es-AR')}`
        : 'Sin actividad reciente';

      return {
        ...emprendimiento,
        estadisticas,
        ultimaActividad
      };
    });
  }, []);

  // Estadísticas totales
  const estadisticasTotales = useMemo(() => {
    return emprendimientosConEstadisticas.reduce((total, emp) => ({
      disponibles: total.disponibles + emp.estadisticas.disponibles,
      vendidos: total.vendidos + emp.estadisticas.vendidos,
      reservados: total.reservados + emp.estadisticas.reservados,
      bloqueados: total.bloqueados + emp.estadisticas.bloqueados,
      total: total.total + emp.estadisticas.total,
      emprendimientos: total.emprendimientos + 1
    }), {
      disponibles: 0,
      vendidos: 0, 
      reservados: 0,
      bloqueados: 0,
      total: 0,
      emprendimientos: 0
    });
  }, [emprendimientosConEstadisticas]);

  const handleVerEmprendimiento = (emprendimiento) => {
    // Crear slug del nombre
    const slug = emprendimiento.nombre
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    router.push(`/loteParaTodosMock/lotes/${slug}?id=${emprendimiento.id}`);
  };

  const exportToExcel = () => {
    // Implementar exportación
    console.log('Exportar estadísticas a Excel');
  };

  const getEstadoColor = (porcentaje) => {
    if (porcentaje >= 80) return 'success';
    if (porcentaje >= 50) return 'warning';
    return 'error';
  };

  return (
    <>
      <Head>
        <title>Gestión de Lotes | Dashboard</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          {/* HEADER */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                  Gestión de Lotes
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Dashboard general de emprendimientos inmobiliarios
                </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="outlined" 
                  startIcon={<DownloadIcon />} 
                  onClick={exportToExcel}
                >
                  Exportar
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/loteParaTodosMock/lotes/nuevo')}
                >
                  Nuevo Emprendimiento
                </Button>
              </Stack>
            </Stack>

            {/* ESTADÍSTICAS GENERALES */}
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Paper sx={{ p: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {estadisticasTotales.emprendimientos}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Emprendimientos
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {estadisticasTotales.disponibles}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lotes Disponibles
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {estadisticasTotales.vendidos}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lotes Vendidos
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Paper sx={{ p: 2, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.200' }}>
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {estadisticasTotales.reservados}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lotes Reservados
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100', border: '1px solid', borderColor: 'grey.300' }}>
                    <Typography variant="h4" fontWeight={700} color="text.primary">
                      {estadisticasTotales.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Lotes
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* GRID DE EMPRENDIMIENTOS */}
          <Grid container spacing={3}>
            {emprendimientosConEstadisticas.map((emprendimiento) => {
              const porcentajeVendido = emprendimiento.estadisticas.total > 0 
                ? Math.round((emprendimiento.estadisticas.vendidos / emprendimiento.estadisticas.total) * 100)
                : 0;

              return (
                <Grid item xs={12} sm={6} lg={4} key={emprendimiento.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                        borderColor: 'primary.main'
                      },
                      border: '1px solid',
                      borderColor: 'grey.200',
                      height: '100%'
                    }}
                    onClick={() => handleVerEmprendimiento(emprendimiento)}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {/* HEADER DEL CARD */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                            {emprendimiento.nombre}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {emprendimiento.ubicacion}
                            </Typography>
                          </Stack>
                        </Box>
                        <Chip 
                          label={emprendimiento.estado} 
                          size="small" 
                          color={emprendimiento.estado === 'ACTIVO' ? 'success' : 'default'}
                        />
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      {/* ESTADÍSTICAS */}
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: '50%' }} />
                            <Typography variant="body2" color="text.secondary">Disponibles</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {emprendimiento.estadisticas.disponibles}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, bgcolor: 'info.main', borderRadius: '50%' }} />
                            <Typography variant="body2" color="text.secondary">Vendidos</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {emprendimiento.estadisticas.vendidos}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, bgcolor: 'warning.main', borderRadius: '50%' }} />
                            <Typography variant="body2" color="text.secondary">Reservados</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {emprendimiento.estadisticas.reservados}
                          </Typography>
                        </Stack>

                        <Stack direction="row" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ width: 12, height: 12, bgcolor: 'grey.400', borderRadius: '50%' }} />
                            <Typography variant="body2" color="text.secondary">Bloqueados</Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {emprendimiento.estadisticas.bloqueados}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      {/* PIE DEL CARD */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Total: {emprendimiento.estadisticas.total} lotes
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emprendimiento.ultimaActividad}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${porcentajeVendido}% vendido`}
                          size="small"
                          color={getEstadoColor(porcentajeVendido)}
                          variant="outlined"
                        />
                      </Stack>

                      {/* BOTÓN DE ACCIÓN */}
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button 
                          variant="outlined" 
                          startIcon={<VisibilityIcon />}
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerEmprendimiento(emprendimiento);
                          }}
                        >
                          Ver Detalle
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

LotesDashboard.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default LotesDashboard;