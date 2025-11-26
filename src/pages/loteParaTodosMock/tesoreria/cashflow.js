import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Stack, LinearProgress, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, Divider,
  Tabs, Tab
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';
import { mockContratos } from 'src/data/loteParaTodos/mockContratos';
import { getClienteById } from 'src/data/loteParaTodos/mockClientes';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CashFlowPage = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Calcular proyecciones basadas en contratos activos
  const proyecciones = useMemo(() => {
    const meses = [];
    const hoy = new Date();
    
    // Generar próximos 6 meses
    for (let i = 0; i < 6; i++) {
      const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const nombreMes = fechaMes.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      
      const contratosDelMes = [];

      // Calcular ingresos por cuotas de contratos activos
      const ingresosCuotas = mockContratos.reduce((total, contrato) => {
        if (contrato.estado !== 'ACTIVO') return total;
        
        const fechaInicio = new Date(contrato.fecha_contrato);
        const fechaFin = new Date(fechaInicio);
        fechaFin.setMonth(fechaFin.getMonth() + contrato.cuotas_cantidad);
        
        // Si el mes actual de iteración está dentro del rango del contrato
        if (fechaMes >= fechaInicio && fechaMes <= fechaFin) {
          const cliente = getClienteById(contrato.cliente_id);
          contratosDelMes.push({
            id: contrato.id,
            cliente: cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente ${contrato.cliente_id}`,
            monto: contrato.cuota_mensual,
            lote_id: contrato.lote_id
          });
          return total + contrato.cuota_mensual;
        }
        return total;
      }, 0);

      // Mock de egresos detallados
      const comisiones = Math.round(ingresosCuotas * 0.05); // 5% comisiones
      const egresosDetalle = [
        { concepto: 'Sueldos Personal', monto: 1200000, tipo: 'FIJO' },
        { concepto: 'Seguridad Privada', monto: 500000, tipo: 'FIJO' },
        { concepto: 'Mantenimiento Predio', monto: 300000, tipo: 'FIJO' },
        { concepto: 'Comisiones Ventas (Est.)', monto: comisiones, tipo: 'VARIABLE' },
        { concepto: 'Impuestos y Tasas', monto: Math.round(ingresosCuotas * 0.03), tipo: 'VARIABLE' }
      ];
      
      const totalEgresos = egresosDetalle.reduce((acc, item) => acc + item.monto, 0);

      meses.push({
        mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
        ingresos: ingresosCuotas,
        egresos: totalEgresos,
        saldo: ingresosCuotas - totalEgresos,
        detallesIngresos: contratosDelMes,
        detallesEgresos: egresosDetalle
      });
    }
    return meses;
  }, []);

  const handleOpenDetails = (mesData) => {
    setSelectedMonthData(mesData);
    setTabValue(0);
    setOpenDialog(true);
  };

  const handleCloseDetails = () => {
    setOpenDialog(false);
    setSelectedMonthData(null);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const totalIngresos = proyecciones.reduce((acc, p) => acc + p.ingresos, 0);
  const totalEgresos = proyecciones.reduce((acc, p) => acc + p.egresos, 0);
  const saldoAcumulado = totalIngresos - totalEgresos;

  const chartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded'
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: proyecciones.map(p => p.mes),
    },
    yaxis: {
      title: { text: '$ (Pesos)' }
    },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: function (val) {
          if (val === undefined || val === null) return "$ 0";
          return "$ " + val.toLocaleString();
        }
      }
    },
    colors: ['#2e7d32', '#d32f2f', '#1976d2']
  };

  const chartSeries = [
    {
      name: 'Ingresos Estimados',
      data: proyecciones.map(p => p.ingresos)
    },
    {
      name: 'Egresos Estimados',
      data: proyecciones.map(p => p.egresos)
    },
    {
      name: 'Flujo Neto',
      data: proyecciones.map(p => p.saldo)
    }
  ];

  return (
    <LoteParaTodosLayout title="Proyecciones y Cash Flow">
      <Head>
        <title>Cash Flow | Lote Para Todos</title>
      </Head>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Proyecciones y Cash Flow
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Análisis de flujo de caja proyectado para los próximos 6 meses basado en contratos activos.
          </Typography>
        </Box>

        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>Ingresos Proyectados (6m)</Typography>
                    <Typography variant="h4" fontWeight="bold">$ {totalIngresos.toLocaleString()}</Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'error.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>Egresos Proyectados (6m)</Typography>
                    <Typography variant="h4" fontWeight="bold">$ {totalEgresos.toLocaleString()}</Typography>
                  </Box>
                  <TrendingDownIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.8 }}>Saldo Acumulado Proyectado</Typography>
                    <Typography variant="h4" fontWeight="bold">$ {saldoAcumulado.toLocaleString()}</Typography>
                  </Box>
                  <MoneyIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Chart Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Evolución Financiera Proyectada</Typography>
          <Box sx={{ height: 400 }}>
            <Chart
              options={chartOptions}
              series={chartSeries}
              type="bar"
              height={350}
            />
          </Box>
        </Paper>

        {/* Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell>Periodo</TableCell>
                  <TableCell align="right">Ingresos Estimados</TableCell>
                  <TableCell align="right">Egresos Estimados</TableCell>
                  <TableCell align="right">Flujo Neto</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Detalle</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proyecciones.map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.mes}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarIcon color="action" fontSize="small" />
                        <Typography variant="body2">{row.mes}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      $ {row.ingresos.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      $ {row.egresos.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      $ {row.saldo.toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label="Proyectado" 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleOpenDetails(row)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dialog Detalle */}
        <Dialog open={openDialog} onClose={handleCloseDetails} maxWidth="md" fullWidth>
          <DialogTitle>
            Detalle Financiero - {selectedMonthData?.mes}
          </DialogTitle>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="detalle tabs">
              <Tab label="Ingresos (Contratos)" />
              <Tab label="Egresos (Estimados)" />
            </Tabs>
          </Box>
          <DialogContent dividers>
            {tabValue === 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Contratos que generan ingresos este mes:
                </Typography>
                <List>
                  {selectedMonthData?.detallesIngresos.length > 0 ? (
                    selectedMonthData.detallesIngresos.map((detalle, index) => (
                      <React.Fragment key={detalle.id}>
                        <ListItem>
                          <ListItemText
                            primary={detalle.cliente}
                            secondary={`Contrato #${detalle.id} - Lote ${detalle.lote_id}`}
                          />
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            $ {detalle.monto.toLocaleString()}
                          </Typography>
                        </ListItem>
                        {index < selectedMonthData.detallesIngresos.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No hay ingresos proyectados por contratos para este mes.
                    </Typography>
                  )}
                </List>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Egresos estimados para el periodo:
                </Typography>
                <List>
                  {selectedMonthData?.detallesEgresos.length > 0 ? (
                    selectedMonthData.detallesEgresos.map((egreso, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={egreso.concepto}
                            secondary={egreso.tipo === 'FIJO' ? 'Costo Fijo' : 'Costo Variable'}
                          />
                          <Typography variant="body2" fontWeight="bold" color="error.main">
                            $ {egreso.monto.toLocaleString()}
                          </Typography>
                        </ListItem>
                        {index < selectedMonthData.detallesEgresos.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No hay egresos proyectados.
                    </Typography>
                  )}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDetails}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LoteParaTodosLayout>
  );
};

export default CashFlowPage;
