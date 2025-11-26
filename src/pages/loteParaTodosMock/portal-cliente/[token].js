// src/pages/loteParaTodosMock/portal-cliente/[token].js
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  Button,
  Divider,
  Stack,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Home as HomeIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  Payment as PaymentIcon,
  CloudDownload as CloudDownloadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  ExitToApp as LogoutIcon,
  SwapHoriz as SwapIcon,
  MiscellaneousServices as ServicesIcon,
  Grass as GrassIcon,
  Landscape as LandscapeIcon,
  Lightbulb as LightbulbIcon,
  Security as SecurityIcon,
  LocalFlorist as LocalFloristIcon,
  Fence as FenceIcon
} from '@mui/icons-material';

// Mock data - Múltiples contratos del cliente
const mockContratosCliente = [
  {
    id: 1,
    numero: '2024-CR1-001',
    cliente: {
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '35.123.456',
      email: 'juan.perez@email.com',
      telefono: '+54 9 11 1234-5678'
    },
    emprendimiento: {
      nombre: 'Cerro Rico 1',
      ubicacion: 'La Matanza, Buenos Aires'
    },
    lote: {
      numero: '15',
      manzana: 'A',
      superficie: 350,
      frente: 10,
      fondo: 35
    },
    estado: 'ACTIVO',
    precio_acordado: 280000,
    saldo_pendiente: 196000,
    entrega_inicial: 84000,
    cuota_mensual: 8167,
    cuotas_cantidad: 24,
    fecha_contrato: '2023-03-15',
    fecha_vencimiento: '2025-03-15',
    ultimo_pago: '2024-11-10',
    ultimo_pago_monto: 8167,
    servicios: [
      {
        id: 1,
        tipo: 'ALAMBRADO',
        nombre: 'Alambrado Perimetral Básico',
        estado: 'COMPLETADO',
        precio: 28500,
        pagado: 28500,
        saldo: 0,
        porcentaje_avance: 100,
        fecha_inicio: '2023-08-15',
        fecha_estimada_fin: '2023-08-22',
        metros_medidos: 190,
        descripcion: 'Alambrado con postes de quebracho y alambre de púas - 4 hilos. Incluye postes cada 2.5 metros'
      },
      {
        id: 2,
        tipo: 'NIVELACION',
        nombre: 'Nivelación de Terreno',
        estado: 'EN_PROCESO',
        precio: 24000,
        pagado: 12000,
        saldo: 12000,
        porcentaje_avance: 50,
        fecha_inicio: '2024-10-15',
        fecha_estimada_fin: '2024-11-30',
        metros_medidos: 350,
        cuotas: 2,
        cuota_mensual: 12000,
        descripcion: 'Nivelación y compactación del terreno. Incluye maquinaria y compactación'
      },
      {
        id: 3,
        tipo: 'CORTE_CESPED',
        nombre: 'Corte de Césped Mensual',
        estado: 'ACTIVO',
        precio: 3500,
        pagado: 0,
        saldo: 3500,
        fecha_inicio: '2024-11-01',
        descripcion: 'Servicio mensual de corte y limpieza del lote. Próximo corte: 15/12/2024'
      }
    ]
  },
  {
    id: 2,
    numero: '2024-CR1-042',
    cliente: {
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '35.123.456',
      email: 'juan.perez@email.com',
      telefono: '+54 9 11 1234-5678'
    },
    emprendimiento: {
      nombre: 'Cerro Rico 1',
      ubicacion: 'La Matanza, Buenos Aires'
    },
    lote: {
      numero: '28',
      manzana: 'C',
      superficie: 400,
      frente: 12,
      fondo: 33.33
    },
    estado: 'RESERVA',
    precio_acordado: 320000,
    saldo_pendiente: 288000,
    entrega_inicial: 32000,
    cuota_mensual: 12000,
    cuotas_cantidad: 24,
    fecha_contrato: '2024-10-20',
    fecha_vencimiento: '2026-10-20',
    ultimo_pago: '2024-10-20',
    ultimo_pago_monto: 32000,
    servicios: [
      {
        id: 4,
        tipo: 'AGUA',
        nombre: 'Conexión de Agua Potable',
        estado: 'EN_PROCESO',
        precio: 35000,
        pagado: 0,
        saldo: 35000,
        porcentaje_avance: 30,
        fecha_inicio: '2024-11-01',
        fecha_estimada_fin: '2024-12-15',
        descripcion: 'Conexión a red de agua potable con medidor. Incluye medidor y conexión domiciliaria'
      },
      {
        id: 5,
        tipo: 'ELECTRICIDAD',
        nombre: 'Instalación Eléctrica Básica',
        estado: 'COTIZADO',
        precio: 42000,
        pagado: 0,
        saldo: 42000,
        fecha_estimada_fin: '2025-01-20',
        descripcion: 'Conexión eléctrica domiciliaria con medidor. Incluye tablero principal y medidor'
      },
      {
        id: 6,
        tipo: 'LIMPIEZA',
        nombre: 'Limpieza y Desmonte Inicial',
        estado: 'PENDIENTE',
        precio: 25000,
        pagado: 0,
        saldo: 25000,
        metros_medidos: 400,
        descripcion: 'Limpieza completa del lote y desmonte de vegetación. Incluye retiro de material vegetal'
      }
    ]
  }
];

const mockMovimientos = [
  {
    id: 1,
    fecha: '2023-03-15',
    descripcion: 'Entrega Inicial',
    categoria: 'pago',
    debito: 0,
    credito: 84000,
    saldo: 196000,
    estado: 'PAGADO',
    comprobante: '/comprobantes/001.pdf'
  },
  {
    id: 2,
    fecha: '2023-04-10',
    descripcion: 'Cuota #1',
    categoria: 'cuota',
    debito: 8167,
    credito: 0,
    saldo: 204167,
    estado: 'FACTURADO'
  },
  {
    id: 3,
    fecha: '2023-04-10',
    descripcion: 'Pago Cuota #1',
    categoria: 'pago',
    debito: 0,
    credito: 8167,
    saldo: 196000,
    estado: 'PAGADO',
    comprobante: '/comprobantes/002.pdf'
  },
  {
    id: 4,
    fecha: '2024-11-10',
    descripcion: 'Cuota #20',
    categoria: 'cuota',
    debito: 8167,
    credito: 0,
    saldo: 204167,
    estado: 'FACTURADO'
  },
  {
    id: 5,
    fecha: '2024-11-10',
    descripcion: 'Pago Cuota #20',
    categoria: 'pago',
    debito: 0,
    credito: 8167,
    saldo: 196000,
    estado: 'PAGADO',
    comprobante: '/comprobantes/020.pdf'
  },
  {
    id: 6,
    fecha: '2024-12-10',
    descripcion: 'Cuota #21',
    categoria: 'cuota',
    debito: 8167,
    credito: 0,
    saldo: 204167,
    estado: 'PENDIENTE',
    alerta: 'proximo'
  }
];

const mockDocumentos = [
  {
    id: 1,
    nombre: 'Contrato de Compraventa',
    tipo: 'contrato',
    fecha: '2023-03-15',
    estado: 'firmado',
    url: '/documentos/contrato-001.pdf'
  },
  {
    id: 2,
    nombre: 'Boleto de Reserva',
    tipo: 'boleto',
    fecha: '2023-03-01',
    estado: 'firmado',
    url: '/documentos/boleto-001.pdf'
  },
  {
    id: 3,
    nombre: 'Cronograma de Pagos',
    tipo: 'cronograma',
    fecha: '2023-03-15',
    estado: 'vigente',
    url: '/documentos/cronograma-001.pdf'
  },
  {
    id: 4,
    nombre: 'Reglamento del Emprendimiento',
    tipo: 'reglamento',
    fecha: '2023-03-15',
    estado: 'vigente',
    url: '/documentos/reglamento-cr1.pdf'
  }
];

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PortalCliente() {
  const router = useRouter();
  const { token } = router.query;
  const [contratoActual, setContratoActual] = useState(0); // Índice del contrato seleccionado
  const [tabActivo, setTabActivo] = useState(0);
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [openCambiarContratoDialog, setOpenCambiarContratoDialog] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [formPago, setFormPago] = useState({
    medio: 'transferencia',
    monto: 0,
    comprobante: null,
    observaciones: ''
  });

  // Contrato seleccionado actualmente
  const mockContratoCliente = mockContratosCliente[contratoActual];

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(monto);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const getIconoServicio = (tipo) => {
    switch(tipo) {
      case 'ALAMBRADO': return <FenceIcon />;
      case 'NIVELACION': return <LandscapeIcon />;
      case 'CORTE_CESPED': return <GrassIcon />;
      case 'AGUA': return <LocalFloristIcon />;
      case 'ELECTRICIDAD': return <LightbulbIcon />;
      case 'LIMPIEZA': return <GrassIcon />;
      case 'GAS': return <SecurityIcon />;
      default: return <ServicesIcon />;
    }
  };

  const getColorEstadoServicio = (estado) => {
    switch(estado) {
      case 'COMPLETADO': return 'success';
      case 'EN_PROCESO': return 'info';
      case 'ACTIVO': return 'success';
      case 'PENDIENTE': return 'warning';
      case 'COTIZADO': return 'default';
      default: return 'default';
    }
  };

  const resumenFinanciero = useMemo(() => {
    const cuotasVencidas = mockMovimientos.filter(m => m.estado === 'VENCIDO').length;
    const proximoVencimiento = mockMovimientos.find(m => m.alerta === 'proximo');
    const totalPagado = mockContratoCliente.precio_acordado - mockContratoCliente.saldo_pendiente;
    const progreso = (totalPagado / mockContratoCliente.precio_acordado) * 100;

    return {
      cuotasVencidas,
      proximoVencimiento,
      totalPagado,
      progreso
    };
  }, [contratoActual]);

  const cambiarContrato = (index) => {
    setContratoActual(index);
    setOpenCambiarContratoDialog(false);
    setTabActivo(0); // Volver al inicio
  };

  const abrirDialogPago = (tipo) => {
    const monto = tipo === 'cuota' ? mockContratoCliente.cuota_mensual : 0;
    setPagoSeleccionado(tipo);
    setFormPago({
      ...formPago,
      monto
    });
    setOpenPagoDialog(true);
  };

  const cerrarDialogPago = () => {
    setOpenPagoDialog(false);
    setPagoSeleccionado(null);
  };

  const procesarPago = () => {
    // Simular procesamiento de pago
    alert('Pago procesado exitosamente. Será validado por el área de Tesorería.');
    cerrarDialogPago();
  };

  const cerrarSesion = () => {
    router.push('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Header */}
      <Box sx={{ backgroundColor: '#1976d2', color: 'white', py: 2, boxShadow: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight="bold">
                Portal del Cliente
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {mockContratoCliente.cliente.nombre} {mockContratoCliente.cliente.apellido}
              </Typography>
            </Box>
            
            {/* Selector de Contratos (si tiene más de uno) */}
            {mockContratosCliente.length > 1 && (
              <Box sx={{ mx: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SwapIcon />}
                  onClick={() => setOpenCambiarContratoDialog(true)}
                  sx={{ color: 'white', borderColor: 'white' }}
                >
                  Contrato {mockContratoCliente.numero}
                </Button>
              </Box>
            )}

            <Button
              startIcon={<LogoutIcon />}
              onClick={cerrarSesion}
              sx={{ color: 'white', borderColor: 'white' }}
              variant="outlined"
            >
              Salir
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Navegación por tabs */}
      <Box sx={{ backgroundColor: 'white', borderBottom: 1, borderColor: 'divider', boxShadow: 1 }}>
        <Container maxWidth="lg">
          <Tabs value={tabActivo} onChange={(e, newValue) => setTabActivo(newValue)}>
            <Tab label="Inicio" icon={<HomeIcon />} iconPosition="start" />
            <Tab label="Estado de Cuenta" icon={<AccountBalanceIcon />} iconPosition="start" />
            <Tab label="Mis Servicios" icon={<ServicesIcon />} iconPosition="start" />
            <Tab label="Documentos" icon={<DescriptionIcon />} iconPosition="start" />
            <Tab label="Realizar Pago" icon={<PaymentIcon />} iconPosition="start" />
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* PC1 - Home del Cliente */}
        <TabPanel value={tabActivo} index={0}>
          <Stack spacing={3}>
            {/* Alertas */}
            {resumenFinanciero.cuotasVencidas > 0 && (
              <Alert severity="error" icon={<WarningIcon />}>
                <strong>Atención:</strong> Tienes {resumenFinanciero.cuotasVencidas} cuota(s) vencida(s). 
                <Button size="small" sx={{ ml: 2 }} onClick={() => setTabActivo(3)}>
                  Pagar ahora
                </Button>
              </Alert>
            )}

            {resumenFinanciero.proximoVencimiento && (
              <Alert severity="warning" icon={<InfoIcon />}>
                <strong>Próximo vencimiento:</strong> {resumenFinanciero.proximoVencimiento.descripcion} - 
                Vence el {formatearFecha(resumenFinanciero.proximoVencimiento.fecha)}
              </Alert>
            )}

            {/* Resumen del Contrato */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resumen de tu Contrato
                </Typography>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Emprendimiento</Typography>
                    <Typography variant="body1" fontWeight={600}>{mockContratoCliente.emprendimiento.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">{mockContratoCliente.emprendimiento.ubicacion}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Tu Lote</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      Lote {mockContratoCliente.lote.numero} - Manzana {mockContratoCliente.lote.manzana}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mockContratoCliente.lote.superficie} m² ({mockContratoCliente.lote.frente}x{mockContratoCliente.lote.fondo})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">N° de Contrato</Typography>
                    <Typography variant="body1" fontWeight={600}>{mockContratoCliente.numero}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Estado</Typography>
                    <Chip label={mockContratoCliente.estado} color="success" size="small" />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Fecha de Contrato</Typography>
                    <Typography variant="body1">{formatearFecha(mockContratoCliente.fecha_contrato)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">Vencimiento Final</Typography>
                    <Typography variant="body1">{formatearFecha(mockContratoCliente.fecha_vencimiento)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Indicadores Financieros */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                  <Typography variant="body2" color="primary">Precio Acordado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatearMoneda(mockContratoCliente.precio_acordado)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#e8f5e8', textAlign: 'center' }}>
                  <Typography variant="body2" color="success.main">Total Pagado</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatearMoneda(resumenFinanciero.totalPagado)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#fff3e0', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#f57c00' }}>Saldo Pendiente</Typography>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#f57c00' }}>
                    {formatearMoneda(mockContratoCliente.saldo_pendiente)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, backgroundColor: '#f3e5f5', textAlign: 'center' }}>
                  <Typography variant="body2" color="secondary">Cuota Mensual</Typography>
                  <Typography variant="h5" fontWeight="bold" color="secondary">
                    {formatearMoneda(mockContratoCliente.cuota_mensual)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Progreso de Pagos */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Progreso de Pagos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={resumenFinanciero.progreso}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {Math.round(resumenFinanciero.progreso)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Has completado {Math.round(resumenFinanciero.progreso)}% del total del contrato
                </Typography>
              </CardContent>
            </Card>

            {/* Servicios Contratados (si existen) */}
            {mockContratoCliente.servicios && mockContratoCliente.servicios.length > 0 && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Servicios Contratados
                    </Typography>
                    <Button
                      size="small"
                      endIcon={<ServicesIcon />}
                      onClick={() => setTabActivo(2)}
                    >
                      Ver todos
                    </Button>
                  </Box>
                  <Stack spacing={2}>
                    {mockContratoCliente.servicios.slice(0, 2).map((servicio) => (
                      <Paper key={servicio.id} sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ color: 'primary.main' }}>
                              {getIconoServicio(servicio.tipo)}
                            </Box>
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {servicio.nombre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {servicio.descripcion}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip 
                            label={servicio.estado.replace('_', ' ')}
                            color={getColorEstadoServicio(servicio.estado)}
                            size="small"
                          />
                        </Box>
                        {servicio.porcentaje_avance !== undefined && (
                          <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">Avance</Typography>
                              <Typography variant="caption" fontWeight="bold">{servicio.porcentaje_avance}%</Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={servicio.porcentaje_avance}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Acciones Rápidas */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Acciones Rápidas
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={<PaymentIcon />}
                      onClick={() => setTabActivo(4)}
                    >
                      Pagar Ahora
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<ServicesIcon />}
                      onClick={() => setTabActivo(2)}
                    >
                      Mis Servicios
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<DescriptionIcon />}
                      onClick={() => setTabActivo(3)}
                    >
                      Ver Documentos
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      startIcon={<AccountBalanceIcon />}
                      onClick={() => setTabActivo(1)}
                    >
                      Estado de Cuenta
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Último Pago */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Último Pago Registrado
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Fecha</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatearFecha(mockContratoCliente.ultimo_pago)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Monto</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {formatearMoneda(mockContratoCliente.ultimo_pago_monto)}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* PC2 - Estado de Cuenta */}
        <TabPanel value={tabActivo} index={1}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Estado de Cuenta Detallado
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    onClick={() => alert('Descargando estado de cuenta...')}
                  >
                    Descargar PDF
                  </Button>
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                      <Typography variant="body2" color="primary">Total Generado</Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {formatearMoneda(mockContratoCliente.precio_acordado)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                      <Typography variant="body2" color="success.main">Total Pagado</Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {formatearMoneda(resumenFinanciero.totalPagado)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                      <Typography variant="body2" color="warning.main">Saldo Actual</Typography>
                      <Typography variant="h6" fontWeight="bold" color="warning.main">
                        {formatearMoneda(mockContratoCliente.saldo_pendiente)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell><strong>Fecha</strong></TableCell>
                        <TableCell><strong>Concepto</strong></TableCell>
                        <TableCell align="right"><strong>Debe</strong></TableCell>
                        <TableCell align="right"><strong>Haber</strong></TableCell>
                        <TableCell align="right"><strong>Saldo</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell align="center"><strong>Comprobante</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockMovimientos.map((mov) => (
                        <TableRow 
                          key={mov.id}
                          sx={{
                            backgroundColor: mov.estado === 'PAGADO' ? '#e8f5e8' : 
                                           mov.estado === 'VENCIDO' ? '#ffebee' : 'inherit'
                          }}
                        >
                          <TableCell>{formatearFecha(mov.fecha)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{mov.descripcion}</Typography>
                            {mov.alerta && (
                              <Typography variant="caption" color={mov.alerta === 'vencido' ? 'error' : 'warning.main'}>
                                {mov.alerta === 'vencido' ? 'Vencido' : 'Próximo vencimiento'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            {mov.debito ? formatearMoneda(mov.debito) : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            {mov.credito ? formatearMoneda(mov.credito) : '-'}
                          </TableCell>
                          <TableCell align="right" fontWeight="bold">
                            {formatearMoneda(mov.saldo)}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={mov.estado}
                              size="small"
                              color={
                                mov.estado === 'PAGADO' ? 'success' :
                                mov.estado === 'VENCIDO' ? 'error' : 'warning'
                              }
                            />
                          </TableCell>
                          <TableCell align="center">
                            {mov.comprobante && (
                              <Tooltip title="Descargar comprobante">
                                <IconButton size="small" onClick={() => window.open(mov.comprobante, '_blank')}>
                                  <CloudDownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* PC2.5 - Mis Servicios */}
        <TabPanel value={tabActivo} index={2}>
          <Stack spacing={3}>
            {mockContratoCliente.servicios && mockContratoCliente.servicios.length > 0 ? (
              <>
                <Alert severity="info">
                  Aquí puedes ver todos los servicios contratados asociados a tu lote
                </Alert>

                <Grid container spacing={3}>
                  {mockContratoCliente.servicios.map((servicio) => (
                    <Grid item xs={12} key={servicio.id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            {/* Icono del servicio */}
                            <Box sx={{ 
                              p: 2, 
                              backgroundColor: '#e3f2fd', 
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {getIconoServicio(servicio.tipo)}
                            </Box>

                            {/* Información del servicio */}
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight="bold">
                                  {servicio.nombre}
                                </Typography>
                                <Chip 
                                  label={servicio.estado.replace('_', ' ')}
                                  color={getColorEstadoServicio(servicio.estado)}
                                  size="small"
                                />
                              </Box>

                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {servicio.descripcion}
                              </Typography>

                              <Grid container spacing={2}>
                                <Grid item xs={12} md={3}>
                                  <Typography variant="caption" color="text.secondary">Precio Total</Typography>
                                  <Typography variant="body1" fontWeight={600}>
                                    {formatearMoneda(servicio.precio)}
                                  </Typography>
                                </Grid>

                                {servicio.pagado > 0 && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Pagado</Typography>
                                    <Typography variant="body1" fontWeight={600} color="success.main">
                                      {formatearMoneda(servicio.pagado)}
                                    </Typography>
                                  </Grid>
                                )}

                                {servicio.saldo > 0 && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Saldo</Typography>
                                    <Typography variant="body1" fontWeight={600} color="warning.main">
                                      {formatearMoneda(servicio.saldo)}
                                    </Typography>
                                  </Grid>
                                )}

                                {servicio.cuotas && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Cuota Mensual</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                      {formatearMoneda(servicio.cuota_mensual)} x {servicio.cuotas}
                                    </Typography>
                                  </Grid>
                                )}

                                {servicio.fecha_inicio && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Fecha de Inicio</Typography>
                                    <Typography variant="body1">
                                      {formatearFecha(servicio.fecha_inicio)}
                                    </Typography>
                                  </Grid>
                                )}

                                {servicio.fecha_estimada_fin && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Fecha Estimada de Finalización</Typography>
                                    <Typography variant="body1">
                                      {formatearFecha(servicio.fecha_estimada_fin)}
                                    </Typography>
                                  </Grid>
                                )}

                                {servicio.metros_medidos && (
                                  <Grid item xs={12} md={3}>
                                    <Typography variant="caption" color="text.secondary">Metros Medidos</Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                      {servicio.metros_medidos} m{servicio.tipo === 'ALAMBRADO' ? '' : '²'}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>

                              {/* Barra de progreso para servicios en proceso */}
                              {servicio.porcentaje_avance !== undefined && (
                                <Box sx={{ mt: 3 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Avance del Servicio
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold">
                                      {servicio.porcentaje_avance}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={servicio.porcentaje_avance}
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Resumen de servicios */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Resumen de Servicios
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                          <Typography variant="body2" color="primary">Total en Servicios</Typography>
                          <Typography variant="h6" fontWeight="bold" color="primary">
                            {formatearMoneda(
                              mockContratoCliente.servicios.reduce((sum, s) => sum + s.precio, 0)
                            )}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                          <Typography variant="body2" color="success.main">Pagado en Servicios</Typography>
                          <Typography variant="h6" fontWeight="bold" color="success.main">
                            {formatearMoneda(
                              mockContratoCliente.servicios.reduce((sum, s) => sum + s.pagado, 0)
                            )}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                          <Typography variant="body2" color="warning.main">Saldo en Servicios</Typography>
                          <Typography variant="h6" fontWeight="bold" color="warning.main">
                            {formatearMoneda(
                              mockContratoCliente.servicios.reduce((sum, s) => sum + s.saldo, 0)
                            )}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert severity="info">
                No tienes servicios adicionales contratados en este momento.
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* PC3 - Documentos */}
        <TabPanel value={tabActivo} index={3}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tus Documentos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Accede a toda la documentación oficial de tu contrato
                </Typography>

                <Grid container spacing={2}>
                  {mockDocumentos.map((doc) => (
                    <Grid item xs={12} md={6} key={doc.id}>
                      <Paper 
                        sx={{ 
                          p: 3, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          '&:hover': { boxShadow: 3 },
                          transition: 'box-shadow 0.3s'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <DescriptionIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {doc.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatearFecha(doc.fecha)} • {doc.tipo}
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          variant="contained"
                          startIcon={<CloudDownloadIcon />}
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          Descargar
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* PC4 - Realizar Pago */}
        <TabPanel value={tabActivo} index={4}>
          <Stack spacing={3}>
            <Alert severity="info">
              Selecciona qué deseas pagar y completa los datos del medio de pago
            </Alert>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ¿Qué deseas pagar?
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Paper 
                      sx={{ 
                        p: 3, 
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4, backgroundColor: '#f5f7fa' },
                        transition: 'all 0.3s'
                      }}
                      onClick={() => abrirDialogPago('cuota')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PaymentIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            Pagar Cuota del Mes
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatearMoneda(mockContratoCliente.cuota_mensual)}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper 
                      sx={{ 
                        p: 3, 
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 4, backgroundColor: '#f5f7fa' },
                        transition: 'all 0.3s'
                      }}
                      onClick={() => abrirDialogPago('anticipo')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MoneyIcon sx={{ fontSize: 48, color: 'success.main' }} />
                        <Box>
                          <Typography variant="h6" fontWeight="bold">
                            Pagar Anticipo
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Adelanta pagos futuros
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Datos Bancarios para Transferencia
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Banco</Typography>
                    <Typography variant="body1" fontWeight={600}>Banco Nación</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">CBU</Typography>
                    <Typography variant="body1" fontWeight={600}>0110599520000012345678</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Alias</Typography>
                    <Typography variant="body1" fontWeight={600}>LOTE.PARA.TODOS</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Titular</Typography>
                    <Typography variant="body1" fontWeight={600}>Factudata Desarrollos S.A.</Typography>
                  </Grid>
                </Grid>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Importante:</strong> Luego de realizar la transferencia, debes subir el comprobante en el formulario de pago.
                </Alert>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>
      </Container>

      {/* Dialog de Pago */}
      <Dialog open={openPagoDialog} onClose={cerrarDialogPago} maxWidth="sm" fullWidth>
        <DialogTitle>
          Realizar Pago - {pagoSeleccionado === 'cuota' ? 'Cuota del Mes' : 'Anticipo'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Monto a Pagar"
              type="number"
              value={formPago.monto}
              onChange={(e) => setFormPago({ ...formPago, monto: parseFloat(e.target.value) })}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />

            <TextField
              select
              fullWidth
              label="Medio de Pago"
              value={formPago.medio}
              onChange={(e) => setFormPago({ ...formPago, medio: e.target.value })}
            >
              <MenuItem value="transferencia">Transferencia Bancaria</MenuItem>
              <MenuItem value="debito">Tarjeta de Débito</MenuItem>
              <MenuItem value="credito">Tarjeta de Crédito</MenuItem>
            </TextField>

            {formPago.medio === 'transferencia' && (
              <>
                <Alert severity="info">
                  Por favor, realiza la transferencia a la cuenta bancaria indicada y luego sube el comprobante.
                </Alert>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                >
                  Subir Comprobante
                  <input
                    type="file"
                    hidden
                    accept="image/*,.pdf"
                    onChange={(e) => setFormPago({ ...formPago, comprobante: e.target.files[0] })}
                  />
                </Button>
                {formPago.comprobante && (
                  <Typography variant="caption" color="success.main">
                    ✓ Archivo seleccionado: {formPago.comprobante.name}
                  </Typography>
                )}
              </>
            )}

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observaciones (opcional)"
              value={formPago.observaciones}
              onChange={(e) => setFormPago({ ...formPago, observaciones: e.target.value })}
            />

            <Alert severity="warning">
              El pago será validado por el área de Tesorería. Recibirás una notificación cuando sea acreditado.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialogPago}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={procesarPago}
            disabled={!formPago.monto || (formPago.medio === 'transferencia' && !formPago.comprobante)}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cambio de Contrato */}
      <Dialog 
        open={openCambiarContratoDialog} 
        onClose={() => setOpenCambiarContratoDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Seleccionar Contrato
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Tienes {mockContratosCliente.length} contratos registrados. Selecciona el que deseas visualizar.
          </Typography>
          
          <Stack spacing={2}>
            {mockContratosCliente.map((contrato, index) => (
              <Paper
                key={contrato.id}
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  border: contratoActual === index ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  backgroundColor: contratoActual === index ? '#e3f2fd' : 'white',
                  '&:hover': { boxShadow: 3 },
                  transition: 'all 0.3s'
                }}
                onClick={() => cambiarContrato(index)}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {contrato.emprendimiento.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lote {contrato.lote.numero} - Manzana {contrato.lote.manzana} • {contrato.lote.superficie} m²
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Contrato N° {contrato.numero}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip 
                        label={contrato.estado} 
                        color={contrato.estado === 'ACTIVO' ? 'success' : 'warning'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Saldo: <strong>{formatearMoneda(contrato.saldo_pendiente)}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCambiarContratoDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
