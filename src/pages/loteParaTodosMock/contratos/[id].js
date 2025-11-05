// src/pages/loteParaTodosMock/contratos/[id].js
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Tabs, Tab, Button, Chip, Paper, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

// Importar datos
import { mockContratos } from '../../../data/loteParaTodos/mockContratos';
import { mockClientes } from '../../../data/loteParaTodos/mockClientes';
import { mockLotes } from '../../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../../data/loteParaTodos/mockEmprendimientos';
import { mockPlanes } from '../../../data/loteParaTodos/mockPlanes';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contrato-tabpanel-${index}`}
      aria-labelledby={`contrato-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ContratoDetalle() {
  const router = useRouter();
  const { id } = router.query;
  const [tabActivo, setTabActivo] = useState(0);

  const contrato = useMemo(() => {
    if (!id) return null;
    return mockContratos.find(c => c.id === parseInt(id));
  }, [id]);

  const cliente = useMemo(() => {
    if (!contrato) return null;
    return mockClientes.find(c => c.id === contrato.cliente_id);
  }, [contrato]);

  const lote = useMemo(() => {
    if (!contrato) return null;
    return mockLotes.find(l => l.id === contrato.lote_id);
  }, [contrato]);

  const emprendimiento = useMemo(() => {
    if (!lote) return null;
    return mockEmprendimientos.find(e => e.id === lote.emprendimiento_id);
  }, [lote]);

  const vendedor = useMemo(() => {
    if (!contrato) return null;
    return mockVendedores.find(v => v.id === contrato.vendedor_id);
  }, [contrato]);

  const plan = useMemo(() => {
    if (!contrato) return null;
    return mockPlanes.find(p => p.id === contrato.plan_financiacion_id);
  }, [contrato]);

  // Generar historial de pagos simulado
  const historialPagos = useMemo(() => {
    if (!contrato) return [];
    
    const pagos = [];
    const fechaInicio = new Date(contrato.fecha_contrato);
    
    // Pago inicial
    if (contrato.entrega_inicial > 0) {
      pagos.push({
        id: 1,
        fecha: contrato.fecha_contrato,
        tipo: 'ENTREGA INICIAL',
        monto: contrato.entrega_inicial,
        estado: 'PAGADO',
        metodo_pago: 'TRANSFERENCIA',
        observaciones: 'Entrega inicial del contrato'
      });
    }

    // Pago al contado adicional
    if (contrato.pago_contado_hoy > 0) {
      pagos.push({
        id: 2,
        fecha: contrato.fecha_contrato,
        tipo: 'PAGO AL CONTADO',
        monto: contrato.pago_contado_hoy,
        estado: 'PAGADO',
        metodo_pago: 'EFECTIVO',
        observaciones: 'Pago adicional al contado'
      });
    }

    // Cuotas mensuales
    if (contrato.cuotas_cantidad > 1) {
      for (let i = 1; i <= contrato.cuotas_cantidad; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        
        const yaVencio = fechaCuota < new Date();
        const estaPagada = contrato.estado === 'COMPLETADO' || 
          (contrato.estado === 'ACTIVO' && Math.random() > 0.3);

        pagos.push({
          id: i + 2,
          fecha: fechaCuota.toISOString().split('T')[0],
          tipo: `CUOTA ${i}/${contrato.cuotas_cantidad}`,
          monto: contrato.cuota_mensual,
          estado: estaPagada ? 'PAGADO' : (yaVencio ? 'VENCIDO' : 'PENDIENTE'),
          metodo_pago: estaPagada ? 'TRANSFERENCIA' : null,
          observaciones: estaPagada ? 'Cuota pagada en término' : null
        });
      }
    }

    return pagos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [contrato]);

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'COMPLETADO': return 'primary';
      case 'CAIDO': return 'warning';
      case 'RESCINDIDO': return 'error';
      default: return 'default';
    }
  };

  const getColorPago = (estado) => {
    switch (estado) {
      case 'PAGADO': return 'success';
      case 'PENDIENTE': return 'warning';
      case 'VENCIDO': return 'error';
      default: return 'default';
    }
  };

  const calcularProgresoPagos = () => {
    const pagosTotales = historialPagos.length;
    const pagosPagados = historialPagos.filter(p => p.estado === 'PAGADO').length;
    return (pagosPagados / pagosTotales) * 100;
  };

  if (!contrato || !cliente || !lote || !emprendimiento || !vendedor || !plan) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Contrato no encontrado o datos incompletos
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/loteParaTodosMock/contratos')}
          variant="outlined"
        >
          Volver
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            Contrato #{contrato.id}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {cliente.nombre} {cliente.apellido} - Lote {lote.numero}, {emprendimiento.nombre}
          </Typography>
        </Box>
        <Chip 
          label={contrato.estado} 
          color={getColorEstado(contrato.estado)}
          size="large"
        />
      </Box>

      {/* Resumen del contrato */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6" color="#1976d2">
                  Precio Acordado
                </Typography>
              </Box>
              <Typography variant="h4" color="#1976d2" fontWeight="bold">
                {formatearMoneda(contrato.precio_acordado)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: '#2e7d32', mr: 1 }} />
                <Typography variant="h6" color="#2e7d32">
                  Pagado
                </Typography>
              </Box>
              <Typography variant="h4" color="#2e7d32" fontWeight="bold">
                {formatearMoneda(contrato.precio_acordado - contrato.saldo_pendiente)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PaymentIcon sx={{ color: '#f57c00', mr: 1 }} />
                <Typography variant="h6" color="#f57c00">
                  Saldo Pendiente
                </Typography>
              </Box>
              <Typography variant="h4" color="#f57c00" fontWeight="bold">
                {formatearMoneda(contrato.saldo_pendiente)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                <Typography variant="h6" color="#7b1fa2">
                  Progreso
                </Typography>
              </Box>
              <Typography variant="h5" color="#7b1fa2" fontWeight="bold">
                {Math.round(calcularProgresoPagos())}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={calcularProgresoPagos()} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabActivo} 
            onChange={(e, newValue) => setTabActivo(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="Información General" 
              icon={<PersonIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Detalles del Lote" 
              icon={<HomeIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Historial de Pagos" 
              icon={<PaymentIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Documentos" 
              icon={<DescriptionIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab 1: Información General */}
        <TabPanel value={tabActivo} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Información del Cliente
              </Typography>
              <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Nombre:</strong> {cliente.nombre} {cliente.apellido}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>DNI:</strong> {cliente.dni}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                  {cliente.email}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                  {cliente.telefono}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                  {cliente.direccion}, {cliente.ciudad}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Ocupación:</strong> {cliente.ocupacion}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado Civil:</strong> {cliente.estado_civil}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Detalles del Contrato
              </Typography>
              <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Fecha de Contrato:</strong> {formatearFecha(contrato.fecha_contrato)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Fecha de Vencimiento:</strong> {formatearFecha(contrato.fecha_vencimiento)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Vendedor:</strong> {vendedor.nombre}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Plan de Financiación:</strong> {plan.nombre}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" gutterBottom>
                  <strong>Entrega Inicial:</strong> {formatearMoneda(contrato.entrega_inicial)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Pago al Contado:</strong> {formatearMoneda(contrato.pago_contado_hoy)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Cantidad de Cuotas:</strong> {contrato.cuotas_cantidad}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Cuota Mensual:</strong> {formatearMoneda(contrato.cuota_mensual)}
                </Typography>
                {contrato.observaciones && (
                  <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                    <strong>Observaciones:</strong> {contrato.observaciones}
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 2: Detalles del Lote */}
        <TabPanel value={tabActivo} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <HomeIcon sx={{ mr: 1 }} />
                Información del Lote
              </Typography>
              <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Número de Lote:</strong> {lote.numero}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Manzana:</strong> {lote.manzana}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Superficie:</strong> {lote.superficie} m²
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Frente:</strong> {lote.frente} m
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Fondo:</strong> {lote.fondo} m
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Precio por m²:</strong> {formatearMoneda(lote.precio_m2)}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado:</strong> 
                  <Chip 
                    label={lote.estado} 
                    color={lote.estado === 'VENDIDO' ? 'error' : 'success'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Información del Emprendimiento
              </Typography>
              <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Nombre:</strong> {emprendimiento.nombre}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Ubicación:</strong> {emprendimiento.ubicacion}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Desarrollador:</strong> {emprendimiento.desarrollador}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Fecha de Entrega:</strong> {formatearFecha(emprendimiento.fecha_entrega)}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado:</strong> 
                  <Chip 
                    label={emprendimiento.estado} 
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                
                {emprendimiento.servicios && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Servicios:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {emprendimiento.servicios.map((servicio, index) => (
                        <Chip
                          key={index}
                          label={servicio}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 3: Historial de Pagos */}
        <TabPanel value={tabActivo} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PaymentIcon sx={{ mr: 1 }} />
              Historial de Pagos
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Progreso de pagos: {Math.round(calcularProgresoPagos())}% completado
            </Alert>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Fecha</strong></TableCell>
                  <TableCell><strong>Tipo de Pago</strong></TableCell>
                  <TableCell><strong>Monto</strong></TableCell>
                  <TableCell><strong>Estado</strong></TableCell>
                  <TableCell><strong>Método de Pago</strong></TableCell>
                  <TableCell><strong>Observaciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historialPagos.map((pago) => (
                  <TableRow 
                    key={pago.id}
                    sx={{ 
                      backgroundColor: pago.estado === 'VENCIDO' ? '#ffebee' : 
                                      pago.estado === 'PAGADO' ? '#e8f5e8' : 'inherit'
                    }}
                  >
                    <TableCell>
                      {formatearFecha(pago.fecha)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {pago.tipo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {formatearMoneda(pago.monto)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={pago.estado} 
                        color={getColorPago(pago.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {pago.metodo_pago || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {pago.observaciones || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 4: Documentos */}
        <TabPanel value={tabActivo} index={3}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1 }} />
            Documentos del Contrato
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Documentos Disponibles
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Contrato de Compraventa
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Plano del Lote
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Cronograma de Pagos
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Documentación del Cliente
                  </Button>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Acciones Rápidas
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    fullWidth
                  >
                    Editar Contrato
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                  >
                    Generar Reporte Completo
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    fullWidth
                  >
                    Enviar por Email
                  </Button>
                  
                  <Divider />
                  
                  <Typography variant="body2" color="text.secondary" align="center">
                    Última actualización: {formatearFecha(contrato.ultimo_pago)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Container>
  );
}