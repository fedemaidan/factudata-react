// src/pages/loteParaTodosMock/contratos/[id].js
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Container, Typography, Box, Grid, Card, CardContent, 
  Tabs, Tab, Button, Chip, Paper, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, MenuItem,
  IconButton, Tooltip
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
  TrendingUp as TrendingUpIcon,
  Close as CloseIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  Comment as CommentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// Importar datos
import { mockContratos } from '../../../data/loteParaTodos/mockContratos';
import { mockClientes } from '../../../data/loteParaTodos/mockClientes';
import { mockLotes } from '../../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../../data/loteParaTodos/mockEmprendimientos';
import { mockPlanes } from '../../../data/loteParaTodos/mockPlanes';
import LoteParaTodosLayout from '../../../components/layouts/LoteParaTodosLayout';

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
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);
  
  // Estados para comentarios
  const [comentarios, setComentarios] = useState([]);
  const [openComentarioDialog, setOpenComentarioDialog] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Estados para pagos
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState(null);
  const [montoPago, setMontoPago] = useState(0);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  // Estados para re-financiación
  const [openRefinanciacionDialog, setOpenRefinanciacionDialog] = useState(false);
  const [datosRefinanciacion, setDatosRefinanciacion] = useState({
    tipo: 'CAMBIO_CICLO',
    motivo: '',
    nuevo_ciclo: 1,
    nuevo_indice: 0,
    nuevas_cuotas: 0,
    nueva_cuota_mensual: 0,
    fecha_aplicacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

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

  // Sistema de cuotas organizadas por ciclos
  const cuotasYCiclos = useMemo(() => {
    if (!contrato) return { ciclos: [], entregaInicial: null, pagoContado: null };
    
    const fechaInicio = new Date(contrato.fecha_contrato);
    const ciclos = [];
    
    // Entrega inicial
    const entregaInicial = contrato.entrega_inicial > 0 ? {
      id: 'entrega_inicial',
      fecha: contrato.fecha_contrato,
      tipo: 'ENTREGA INICIAL',
      monto: contrato.entrega_inicial,
      estado: 'PAGADO',
      metodo_pago: 'TRANSFERENCIA'
    } : null;

    // Pago al contado adicional
    const pagoContado = contrato.pago_contado_hoy > 0 ? {
      id: 'pago_contado',
      fecha: contrato.fecha_contrato,
      tipo: 'PAGO AL CONTADO',
      monto: contrato.pago_contado_hoy,
      estado: 'PAGADO',
      metodo_pago: 'EFECTIVO'
    } : null;

    // Generar ciclos de cuotas (cada ciclo = 6 cuotas)
    const cuotasPorCiclo = 6;
    const totalCiclos = Math.ceil(contrato.cuotas_cantidad / cuotasPorCiclo);
    
    for (let ciclo = 1; ciclo <= totalCiclos; ciclo++) {
      const cuotasDelCiclo = [];
      const inicioDelCiclo = (ciclo - 1) * cuotasPorCiclo + 1;
      const finDelCiclo = Math.min(ciclo * cuotasPorCiclo, contrato.cuotas_cantidad);
      
      for (let numCuota = inicioDelCiclo; numCuota <= finDelCiclo; numCuota++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + numCuota);
        
        const hoy = new Date();
        const yaVencio = fechaCuota < hoy;
        
        // Lógica para determinar el estado de la cuota
        let estado = 'PENDIENTE';
        if (contrato.estado === 'COMPLETADO') {
          estado = 'PAGADO';
        } else if (contrato.estado === 'ACTIVO') {
          // Simular algunos pagos realizados y cuotas vencidas
          if (numCuota <= 2) estado = 'PAGADO';
          else if (numCuota >= 3 && numCuota <= 5 && yaVencio) estado = 'VENCIDO';
          else if (numCuota >= 3 && numCuota <= 5 && !yaVencio) estado = 'PENDIENTE';
          else estado = yaVencio ? 'VENCIDO' : 'PENDIENTE';
        }
        
        cuotasDelCiclo.push({
          id: `cuota_${numCuota}`,
          numero: numCuota,
          fecha: fechaCuota.toISOString().split('T')[0],
          monto: contrato.cuota_mensual,
          estado,
          metodo_pago: estado === 'PAGADO' ? 'TRANSFERENCIA' : null,
          fecha_pago: estado === 'PAGADO' ? fechaCuota.toISOString().split('T')[0] : null
        });
      }
      
      // Calcular estado del ciclo
      const cuotasPagadas = cuotasDelCiclo.filter(c => c.estado === 'PAGADO').length;
      const cuotasVencidas = cuotasDelCiclo.filter(c => c.estado === 'VENCIDO').length;
      
      let estadoCiclo = 'PENDIENTE';
      if (cuotasPagadas === cuotasDelCiclo.length) {
        estadoCiclo = 'COMPLETADO';
      } else if (cuotasVencidas > 0) {
        estadoCiclo = 'CON_VENCIDAS';
      } else if (cuotasPagadas > 0) {
        estadoCiclo = 'EN_PROGRESO';
      }
      
      ciclos.push({
        numero: ciclo,
        nombre: `Ciclo ${ciclo}`,
        cuotas: cuotasDelCiclo,
        estado: estadoCiclo,
        cuotasPagadas,
        totalCuotas: cuotasDelCiclo.length,
        montoTotal: cuotasDelCiclo.reduce((sum, c) => sum + c.monto, 0),
        montoPagado: cuotasDelCiclo.filter(c => c.estado === 'PAGADO').reduce((sum, c) => sum + c.monto, 0)
      });
    }

    return { ciclos, entregaInicial, pagoContado };
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

  // Función para detectar si hay cuotas vencidas
  const tieneCuotasVencidas = () => {
    return cuotasYCiclos.ciclos.some(ciclo => 
      ciclo.cuotas.some(cuota => cuota.estado === 'VENCIDO')
    );
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



  const calcularProgresoPagos = () => {
    const totalCuotas = cuotasYCiclos.ciclos.reduce((sum, ciclo) => sum + ciclo.totalCuotas, 0);
    const cuotasPagadas = cuotasYCiclos.ciclos.reduce((sum, ciclo) => sum + ciclo.cuotasPagadas, 0);
    return totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0;
  };

  // Funciones para edición
  const abrirEdicion = () => {
    setContratoEditando({ 
      ...contrato,
      // Campos adicionales que pueden no estar en el contrato
      beneficiario: contrato.beneficiario || 'MISMO_TITULAR',
      gremio: contrato.gremio || 'NO',
      fecha_sellado: contrato.fecha_sellado || '',
      monto_sellado: contrato.monto_sellado || 0,
      revision_ciclo1: contrato.revision_ciclo1 || 'NO',
      frecuencia_revision: contrato.frecuencia_revision || 'NO',
      fecha_ultima_revision: contrato.fecha_ultima_revision || ''
    });
    setOpenEditDialog(true);
  };

  const cerrarEdicion = () => {
    setContratoEditando(null);
    setOpenEditDialog(false);
  };

  const guardarCambios = () => {
    // Aquí implementarías la lógica de guardado real
    console.log('Guardando cambios:', contratoEditando);
    alert('Cambios guardados exitosamente');
    cerrarEdicion();
  };

  // Funciones para manejar pagos
  const abrirPago = (cuota) => {
    setCuotaSeleccionada(cuota);
    setMontoPago(cuota.monto);
    setOpenPagoDialog(true);
  };

  const cerrarPago = () => {
    setCuotaSeleccionada(null);
    setMontoPago(0);
    setOpenPagoDialog(false);
  };

  const registrarPago = () => {
    console.log('Registrando pago:', {
      cuota: cuotaSeleccionada,
      monto: montoPago,
      metodo: metodoPago,
      fecha: new Date().toISOString().split('T')[0]
    });
    alert('Pago registrado exitosamente');
    cerrarPago();
  };

  const obtenerProximaCuota = () => {
    for (const ciclo of cuotasYCiclos.ciclos) {
      const proximaCuota = ciclo.cuotas.find(c => c.estado === 'PENDIENTE');
      if (proximaCuota) return proximaCuota;
    }
    return null;
  };

  const obtenerUltimaCuotaCiclo = (cicloNumero) => {
    const ciclo = cuotasYCiclos.ciclos.find(c => c.numero === cicloNumero);
    if (!ciclo) return null;
    return ciclo.cuotas[ciclo.cuotas.length - 1];
  };

  // Funciones para comentarios
  React.useEffect(() => {
    // Simular comentarios existentes
    if (contrato) {
      setComentarios([
        {
          id: 1,
          texto: 'Cliente muy puntual con los pagos',
          fecha: '2024-01-15',
          usuario: 'Juan Pérez'
        },
        {
          id: 2,
          texto: 'Se acordó postergar la cuota de febrero por situación familiar',
          fecha: '2024-02-10',
          usuario: 'María García'
        }
      ]);
    }
  }, [contrato]);

  const abrirComentarios = () => {
    setOpenComentarioDialog(true);
  };

  const cerrarComentarios = () => {
    setOpenComentarioDialog(false);
    setNuevoComentario('');
  };

  const agregarComentario = () => {
    if (!nuevoComentario.trim()) return;
    
    const comentario = {
      id: Date.now(),
      texto: nuevoComentario,
      fecha: new Date().toISOString().split('T')[0],
      usuario: 'Usuario Actual' // En producción sería el usuario logueado
    };
    
    setComentarios(prev => [...prev, comentario]);
    setNuevoComentario('');
    alert('Comentario agregado exitosamente');
  };

  // Funciones para re-financiación
  const abrirRefinanciacion = () => {
    setDatosRefinanciacion({
      tipo: 'CAMBIO_CICLO',
      motivo: '',
      nuevo_ciclo: (contrato.ciclo_actual || 1) + 1,
      nuevo_indice: contrato.indice_actualizacion || 0,
      nuevas_cuotas: contrato.cuotas_cantidad || 0,
      nueva_cuota_mensual: contrato.cuota_mensual || 0,
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
    setOpenRefinanciacionDialog(true);
  };

  const cerrarRefinanciacion = () => {
    setOpenRefinanciacionDialog(false);
    setDatosRefinanciacion({
      tipo: 'CAMBIO_CICLO',
      motivo: '',
      nuevo_ciclo: 1,
      nuevo_indice: 0,
      nuevas_cuotas: 0,
      nueva_cuota_mensual: 0,
      fecha_aplicacion: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
  };

  const procesarRefinanciacion = () => {
    // Validaciones
    if (!datosRefinanciacion.motivo.trim()) {
      alert('Debe especificar el motivo de la re-financiación');
      return;
    }

    // Crear registro de re-financiación
    const refinanciacion = {
      id: Date.now(),
      contrato_id: contrato.id,
      fecha_creacion: new Date().toISOString(),
      tipo: datosRefinanciacion.tipo,
      motivo: datosRefinanciacion.motivo,
      datos_anteriores: {
        ciclo: contrato.ciclo_actual || 1,
        indice: contrato.indice_actualizacion || 0,
        cuotas: contrato.cuotas_cantidad || 0,
        cuota_mensual: contrato.cuota_mensual || 0
      },
      datos_nuevos: {
        ciclo: datosRefinanciacion.nuevo_ciclo,
        indice: datosRefinanciacion.nuevo_indice,
        cuotas: datosRefinanciacion.nuevas_cuotas,
        cuota_mensual: datosRefinanciacion.nueva_cuota_mensual
      },
      fecha_aplicacion: datosRefinanciacion.fecha_aplicacion,
      observaciones: datosRefinanciacion.observaciones,
      usuario: 'Usuario Actual', // En producción sería el usuario logueado
      estado: 'PENDIENTE_APLICACION'
    };

    console.log('Re-financiación creada:', refinanciacion);
    
    // Aquí se guardaría en la base de datos
    alert('Re-financiación creada exitosamente. Se aplicará en la fecha especificada.');
    
    // Agregar comentario automático
    const comentarioRefinanciacion = {
      id: Date.now() + 1,
      texto: `Re-financiación solicitada: ${datosRefinanciacion.tipo} - ${datosRefinanciacion.motivo}`,
      fecha: new Date().toISOString().split('T')[0],
      usuario: 'Sistema'
    };
    setComentarios(prev => [...prev, comentarioRefinanciacion]);

    cerrarRefinanciacion();
  };

  if (!contrato) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">
          Contrato no encontrado
        </Alert>
      </Container>
    );
  }

  // Datos con valores por defecto si no se encuentran
  const clienteData = cliente || { nombre: 'Cliente', apellido: 'No encontrado', dni: 'N/A', email: 'N/A', telefono: 'N/A', direccion: 'N/A', ciudad: 'N/A', ocupacion: 'N/A', estado_civil: 'N/A' };
  const loteData = lote || { numero: 'N/A', manzana: 'N/A', superficie: 0, frente: 0, fondo: 0, precio_m2: 0, estado: 'N/A' };
  const emprendimientoData = emprendimiento || { nombre: 'No encontrado', ubicacion: 'N/A', desarrollador: 'N/A', fecha_entrega: new Date().toISOString(), estado: 'N/A', servicios: [] };
  const vendedorData = vendedor || { nombre: 'No encontrado' };
  const planData = plan || { nombre: 'No encontrado' };

  return (
    <LoteParaTodosLayout currentModule="contratos" pageTitle={`Contrato #${contrato.id}`}>
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
            {clienteData.nombre} {clienteData.apellido} - Lote {loteData.numero}, {emprendimientoData.nombre}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={contrato.estado} 
            color={getColorEstado(contrato.estado)}
            size="large"
          />
          {contrato.estado === 'ACTIVO' && tieneCuotasVencidas() && (
            <Chip 
              label="CON MORA"
              color="error"
              size="large"
              icon={<WarningIcon />}
            />
          )}
          <Button
            variant="outlined"
            startIcon={<CommentIcon />}
            onClick={abrirComentarios}
          >
            Comentarios ({comentarios.length})
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={abrirEdicion}
          >
            Editar Contrato
          </Button>
        </Box>
      </Box>

      {/* Resumen del contrato */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={2.4}>
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

        <Grid item xs={12} md={2.4}>
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

        <Grid item xs={12} md={2.4}>
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

        <Grid item xs={12} md={2.4}>
          <Card sx={{ backgroundColor: '#ffebee' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DescriptionIcon sx={{ color: '#c62828', mr: 1 }} />
                <Typography variant="h6" color="#c62828">
                  Cuenta Corriente
                </Typography>
              </Box>
              <Typography variant="h4" color="#c62828" fontWeight="bold">
                {(() => {
                  // Calcular saldo actual de cuenta corriente (solo movimientos reales)
                  let saldoCC = contrato.precio_acordado;
                  
                  // Restar entrega inicial
                  if (contrato.entrega_inicial && contrato.entrega_inicial > 0) {
                    saldoCC -= contrato.entrega_inicial;
                  }
                  
                  // Sumar cuotas vencidas y restar pagos efectuados
                  const hoy = new Date();
                  cuotasYCiclos.ciclos.forEach(ciclo => {
                    ciclo.cuotas.forEach(cuota => {
                      const fechaCuota = new Date(cuota.fecha);
                      const yaVencio = fechaCuota <= hoy;
                      
                      if (yaVencio || cuota.estado === 'PAGADO') {
                        if (cuota.estado === 'PAGADO') {
                          // No afecta el saldo final (cuota + pago = 0)
                        } else {
                          // Cuota vencida sin pagar
                          saldoCC += cuota.monto;
                        }
                      }
                    });
                  });
                  
                  return formatearMoneda(Math.max(0, saldoCC));
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
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
              label="Cuotas y Pagos" 
              icon={<PaymentIcon />}
              iconPosition="start"
            />
            <Tab 
              label="Cuenta Corriente" 
              icon={<AccountBalanceIcon />}
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
                  <strong>Nombre:</strong> {clienteData.nombre} {clienteData.apellido}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>DNI:</strong> {clienteData.dni}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                  {clienteData.email}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                  {clienteData.telefono}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                  {clienteData.direccion}, {clienteData.ciudad}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Ocupación:</strong> {clienteData.ocupacion}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado Civil:</strong> {clienteData.estado_civil}
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
                  <strong>Vendedor:</strong> {vendedorData.nombre}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Plan de Financiación:</strong> {planData.nombre}
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
              </Paper>
            </Grid>
          </Grid>

          {/* Sección de Comentarios */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <DescriptionIcon sx={{ mr: 1 }} />
              Comentarios del Contrato
            </Typography>
            
            <Paper sx={{ p: 3, backgroundColor: '#fafafa' }}>
              {comentarios.length > 0 ? (
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {comentarios.map((comentario, index) => (
                    <Box 
                      key={comentario.id} 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        backgroundColor: 'white',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {comentario.texto}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Por {comentario.usuario} • {formatearFecha(comentario.fecha)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No hay comentarios para este contrato
                </Typography>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={abrirComentarios}
                >
                  Gestionar Comentarios
                </Button>
              </Box>
            </Paper>
          </Box>
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
                  <strong>Número de Lote:</strong> {loteData.numero}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Manzana:</strong> {loteData.manzana}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Superficie:</strong> {loteData.superficie} m²
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Frente:</strong> {loteData.frente} m
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Fondo:</strong> {loteData.fondo} m
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Precio por m²:</strong> {formatearMoneda(loteData.precio_m2)}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado:</strong> 
                  <Chip 
                    label={loteData.estado} 
                    color={loteData.estado === 'VENDIDO' ? 'error' : 'success'}
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
                  <strong>Nombre:</strong> {emprendimientoData.nombre}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Ubicación:</strong> {emprendimientoData.ubicacion}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Desarrollador:</strong> {emprendimientoData.desarrollador}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Fecha de Entrega:</strong> {formatearFecha(emprendimientoData.fecha_entrega)}
                </Typography>
                <Typography variant="body1">
                  <strong>Estado:</strong> 
                  <Chip 
                    label={emprendimientoData.estado} 
                    color="primary"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                
                {emprendimientoData.servicios && emprendimientoData.servicios.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Servicios:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {emprendimientoData.servicios.map((servicio, index) => (
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

        {/* Tab 3: Cuotas y Pagos */}
        <TabPanel value={tabActivo} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PaymentIcon sx={{ mr: 1 }} />
              Cuotas y Pagos
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Progreso de pagos: {Math.round(calcularProgresoPagos())}% completado
            </Alert>

            {/* Configuración de Ciclos y Cuotas */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" color="primary">
                    Configuración de Ciclos y Cuotas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Solo lectura - Use Re-financiación para cambios
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, backgroundColor: '#e3f2fd', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="primary">
                        Monto de Cuota 1
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatearMoneda(contrato.entrega_inicial || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Entrega inicial
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#f3e5f5', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="secondary">
                        Total Cuotas
                      </Typography>
                      <Typography variant="h6" color="secondary" fontWeight="bold">
                        {contrato.cuotas_cantidad || 48}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        cuotas
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#fff3e0', textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: '#f57c00' }}>
                        Ciclo Es Anticipo %
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#f57c00' }} fontWeight="bold">
                        {contrato.anticipo_porcentaje || 0}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        anticipo
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Paper sx={{ p: 2, backgroundColor: '#e8f5e8', textAlign: 'center' }}>
                      <Typography variant="subtitle2" color="success.main">
                        Ciclo Actual
                      </Typography>
                      <Typography variant="h6" color="success.main" fontWeight="bold">
                        {contrato.ciclo_actual || 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        actual
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Paper sx={{ p: 2, backgroundColor: '#fce4ec', textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: '#c2185b' }}>
                        Cuota Mensual
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#c2185b' }} fontWeight="bold">
                        {formatearMoneda(contrato.cuota_mensual || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        por mes
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Cant. Ctas. Ciclo 2
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {contrato.cuotas_ciclo2 || 0}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Índice Actualización %
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {contrato.indice_actualizacion || 0}%
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Gremio
                      </Typography>
                      <Chip 
                        label={contrato.gremio || 'No'} 
                        color={contrato.gremio === 'SI' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Vendedor
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {vendedorData.nombre}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Nota:</strong> Los valores de ciclos y cuotas no se pueden editar directamente. 
                    Para realizar cambios, utiliza el sistema de <strong>Re-financiación</strong> que mantiene 
                    un registro completo de todas las modificaciones realizadas al contrato.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Acciones Rápidas para Ciclos */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Gestión de Re-financiación
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<TrendingUpIcon />}
                      onClick={abrirRefinanciacion}
                    >
                      Nueva Re-financiación
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<DescriptionIcon />}
                      onClick={() => {
                        // Mostrar historial de re-financiaciones
                        alert('Ver historial de re-financiaciones');
                      }}
                    >
                      Ver Historial
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="info"
                      startIcon={<EditIcon />}
                      onClick={abrirEdicion}
                    >
                      Editar Datos Base
                    </Button>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, p: 2, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="body2" color="primary">
                    <strong>📋 Importante:</strong> Las re-financiaciones crean un nuevo plan de pagos manteniendo 
                    el historial completo. El contrato original permanece intacto para auditoría.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Resumen del Ciclo Actual */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Estado del Ciclo Actual ({contrato.ciclo_actual || 1})
                </Typography>
                
                {(() => {
                  const cicloActual = cuotasYCiclos.ciclos.find(c => c.numero === (contrato.ciclo_actual || 1));
                  if (!cicloActual) return <Alert severity="info">No hay información del ciclo actual</Alert>;
                  
                  return (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {cicloActual.cuotasPagadas}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Cuotas Pagadas
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="secondary" fontWeight="bold">
                            {cicloActual.totalCuotas}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total del Ciclo
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" color="success.main" fontWeight="bold">
                            {formatearMoneda(cicloActual.montoPagado)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Monto Pagado
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ color: '#f57c00' }} fontWeight="bold">
                            {formatearMoneda(cicloActual.montoTotal - cicloActual.montoPagado)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Saldo Pendiente
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={cicloActual.estado.replace('_', ' ')}
                            color={
                              cicloActual.estado === 'COMPLETADO' ? 'success' :
                              cicloActual.estado === 'CON_VENCIDAS' ? 'error' :
                              cicloActual.estado === 'EN_PROGRESO' ? 'warning' : 'default'
                            }
                            size="medium"
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Estado del Ciclo
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Botones de acción rápida para pagos */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={() => {
                  const proxima = obtenerProximaCuota();
                  if (proxima) abrirPago(proxima);
                  else alert('No hay cuotas pendientes');
                }}
              >
                Pagar Próxima Cuota
              </Button>
            </Box>
          </Box>

          {/* Entrega inicial y pago al contado */}
          {(cuotasYCiclos.entregaInicial || cuotasYCiclos.pagoContado) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pagos Iniciales
                </Typography>
                <Grid container spacing={2}>
                  {cuotasYCiclos.entregaInicial && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Entrega Inicial
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatearMoneda(cuotasYCiclos.entregaInicial.monto)}
                        </Typography>
                        <Chip label="PAGADO" color="success" size="small" />
                      </Paper>
                    </Grid>
                  )}
                  {cuotasYCiclos.pagoContado && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                        <Typography variant="subtitle1" fontWeight="600">
                          Pago al Contado
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {formatearMoneda(cuotasYCiclos.pagoContado.monto)}
                        </Typography>
                        <Chip label="PAGADO" color="success" size="small" />
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Ciclos de cuotas */}
          {cuotasYCiclos.ciclos.map((ciclo) => (
            <Card key={ciclo.numero} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    {ciclo.nombre}
                    <Chip 
                      label={ciclo.estado.replace('_', ' ')}
                      color={
                        ciclo.estado === 'COMPLETADO' ? 'success' :
                        ciclo.estado === 'CON_VENCIDAS' ? 'error' :
                        ciclo.estado === 'EN_PROGRESO' ? 'warning' : 'default'
                      }
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const ultimaCuota = obtenerUltimaCuotaCiclo(ciclo.numero);
                        if (ultimaCuota && ultimaCuota.estado === 'PENDIENTE') {
                          abrirPago(ultimaCuota);
                        } else {
                          alert('La última cuota del ciclo ya está pagada');
                        }
                      }}
                    >
                      Pagar Última del Ciclo
                    </Button>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Progreso: {ciclo.cuotasPagadas}/{ciclo.totalCuotas} cuotas pagadas - 
                  {formatearMoneda(ciclo.montoPagado)} de {formatearMoneda(ciclo.montoTotal)}
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                        <TableCell><strong>Cuota #</strong></TableCell>
                        <TableCell><strong>Fecha Venc.</strong></TableCell>
                        <TableCell><strong>Monto</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell><strong>Fecha Pago</strong></TableCell>
                        <TableCell align="center"><strong>Acciones</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ciclo.cuotas.map((cuota) => (
                        <TableRow 
                          key={cuota.id}
                          sx={{
                            backgroundColor: 
                              cuota.estado === 'PAGADO' ? '#e8f5e8' :
                              cuota.estado === 'VENCIDO' ? '#ffebee' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {cuota.numero}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {formatearFecha(cuota.fecha)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {formatearMoneda(cuota.monto)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cuota.estado}
                              color={
                                cuota.estado === 'PAGADO' ? 'success' :
                                cuota.estado === 'VENCIDO' ? 'error' : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {cuota.fecha_pago ? formatearFecha(cuota.fecha_pago) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            {cuota.estado === 'PENDIENTE' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => abrirPago(cuota)}
                              >
                                Pagar
                              </Button>
                            )}
                            {cuota.estado === 'VENCIDO' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => abrirPago(cuota)}
                              >
                                Regularizar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))}
        </TabPanel>

        {/* Tab 4: Cuenta Corriente */}
        <TabPanel value={tabActivo} index={3}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalanceIcon sx={{ mr: 1 }} />
            Cuenta Corriente del Contrato
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                      Estado de Cuenta - Contrato #{contrato.id}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button variant="outlined" startIcon={<PdfIcon />}>
                        Exportar PDF
                      </Button>
                      <Button variant="contained" startIcon={<PaymentIcon />}>
                        Nuevo Movimiento
                      </Button>
                    </Box>
                  </Box>



                  {/* Tabla de movimientos */}
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>Fecha</strong></TableCell>
                          <TableCell><strong>Concepto</strong></TableCell>
                          <TableCell align="right"><strong>Debe</strong></TableCell>
                          <TableCell align="right"><strong>Haber</strong></TableCell>
                          <TableCell align="right"><strong>Saldo</strong></TableCell>
                          <TableCell><strong>Estado</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const movimientos = [];
                          let saldoAcumulado = contrato.precio_acordado;

                          // Agregar entrega inicial si existe
                          if (contrato.entrega_inicial && contrato.entrega_inicial > 0) {
                            saldoAcumulado -= contrato.entrega_inicial;
                            movimientos.push({
                              fecha: contrato.fecha_contrato,
                              concepto: 'Entrega Inicial',
                              debe: 0,
                              haber: contrato.entrega_inicial,
                              saldo: saldoAcumulado,
                              estado: 'PAGADO',
                              tipo: 'pago'
                            });
                          }

                          // Agregar solo cuotas vencidas o pagadas (movimientos reales)
                          const hoy = new Date();
                          cuotasYCiclos.ciclos.forEach(ciclo => {
                            ciclo.cuotas.forEach(cuota => {
                              const fechaCuota = new Date(cuota.fecha);
                              const yaVencio = fechaCuota <= hoy;
                              
                              // Solo mostrar cuotas que ya vencieron o que fueron pagadas
                              if (yaVencio || cuota.estado === 'PAGADO') {
                                // Primero agregar la cuota (deuda)
                                if (cuota.estado !== 'PAGADO') {
                                  movimientos.push({
                                    fecha: cuota.fecha,
                                    concepto: `Cuota #${cuota.numero}`,
                                    debe: cuota.monto,
                                    haber: 0,
                                    saldo: saldoAcumulado + cuota.monto,
                                    estado: cuota.estado,
                                    tipo: 'cuota'
                                  });
                                  saldoAcumulado += cuota.monto;
                                }
                                
                                // Si está pagada, agregar también el pago
                                if (cuota.estado === 'PAGADO') {
                                  // Agregar la cuota
                                  movimientos.push({
                                    fecha: cuota.fecha,
                                    concepto: `Cuota #${cuota.numero}`,
                                    debe: cuota.monto,
                                    haber: 0,
                                    saldo: saldoAcumulado + cuota.monto,
                                    estado: 'FACTURADO',
                                    tipo: 'cuota'
                                  });
                                  saldoAcumulado += cuota.monto;
                                  
                                  // Agregar el pago
                                  movimientos.push({
                                    fecha: cuota.fecha_pago || cuota.fecha,
                                    concepto: `Pago Cuota #${cuota.numero} - ${cuota.metodo_pago || 'TRANSFERENCIA'}`,
                                    debe: 0,
                                    haber: cuota.monto,
                                    saldo: saldoAcumulado - cuota.monto,
                                    estado: 'PAGADO',
                                    tipo: 'pago'
                                  });
                                  saldoAcumulado -= cuota.monto;
                                }
                              }
                            });
                          });

                          // Ordenar movimientos por fecha
                          movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

                          return movimientos.map((movimiento, index) => (
                            <TableRow 
                              key={`movimiento_${index}`} 
                              sx={{
                                backgroundColor: movimiento.estado === 'VENCIDO' ? '#ffebee' : 
                                                movimiento.estado === 'PAGADO' ? '#e8f5e8' : 
                                                movimiento.tipo === 'pago' ? '#e8f5e8' : 'inherit'
                              }}
                            >
                              <TableCell>{formatearFecha(movimiento.fecha)}</TableCell>
                              <TableCell>{movimiento.concepto}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>
                                {movimiento.debe > 0 ? formatearMoneda(movimiento.debe) : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'success.main' }}>
                                {movimiento.haber > 0 ? formatearMoneda(movimiento.haber) : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                {formatearMoneda(Math.max(0, movimiento.saldo))}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={movimiento.estado}
                                  color={
                                    movimiento.estado === 'PAGADO' ? 'success' :
                                    movimiento.estado === 'VENCIDO' ? 'error' : 
                                    movimiento.estado === 'FACTURADO' ? 'info' : 'warning'
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 5: Documentos */}
        <TabPanel value={tabActivo} index={4}>
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
                    variant="outlined"
                    startIcon={<PdfIcon />}
                    fullWidth
                  >
                    Generar Reporte Completo
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

      {/* Modal de Edición de Contrato */}
      <Dialog 
        open={openEditDialog} 
        onClose={cerrarEdicion}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Editar Contrato #{contrato.id}
            <IconButton onClick={cerrarEdicion} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {contratoEditando && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'primary.main' }}>
                Datos Generales
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Fecha de Boleto"
                    type="date"
                    value={contratoEditando.fecha_contrato?.split('T')[0] || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      fecha_contrato: e.target.value
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Titular"
                    value={`${clienteData.nombre} ${clienteData.apellido}`}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <Button size="small" onClick={() => router.push(`/loteParaTodosMock/clientes/${cliente?.id}`)}>
                          Editar Cliente
                        </Button>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Beneficiario"
                    value={contratoEditando.beneficiario || 'MISMO_TITULAR'}
                  >
                    <MenuItem value="MISMO_TITULAR">Mismo titular</MenuItem>
                    <MenuItem value="OTRO">Otro beneficiario</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Monto de Cuota 1"
                    type="number"
                    value={contratoEditando.entrega_inicial || 0}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      entrega_inicial: parseFloat(e.target.value) || 0
                    })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Gremio"
                    value={contratoEditando.gremio || 'NO'}
                  >
                    <MenuItem value="SI">Si</MenuItem>
                    <MenuItem value="NO">No</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Vendedor"
                    value={contratoEditando.vendedor_id || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      vendedor_id: parseInt(e.target.value)
                    })}
                  >
                    {mockVendedores.map(v => (
                      <MenuItem key={v.id} value={v.id}>{v.nombre}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Fecha de Sellado"
                    type="date"
                    value={contratoEditando.fecha_sellado || ''}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Datos del Lote
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Lote"
                    value={contratoEditando.lote_id || ''}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      lote_id: parseInt(e.target.value)
                    })}
                  >
                    {mockLotes.map(l => (
                      <MenuItem key={l.id} value={l.id}>
                        Lote {l.numero} - Mza {l.manzana}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<HomeIcon />}
                    onClick={() => router.push(`/loteParaTodosMock/lotes/${lote?.id}`)}
                    sx={{ height: 56 }}
                  >
                    Editar Lote
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Monto de Sellado"
                    type="number"
                    value={contratoEditando.monto_sellado || 0}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Datos del Titular (Cliente)
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={clienteData.nombre}
                    InputProps={{ readOnly: true }}
                    helperText="Para editar, usar el botón 'Editar Cliente' arriba"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Apellido"
                    value={clienteData.apellido}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="DNI"
                    value={clienteData.dni}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="CUIL/CUIT"
                    value={clienteData.cuil || clienteData.dni}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Ocupación"
                    value={clienteData.ocupacion}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Teléfono Fijo"
                    value={clienteData.telefono}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Domicilio"
                    value={clienteData.direccion}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Localidad"
                    value={clienteData.ciudad}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Código Postal"
                    value={clienteData.codigo_postal || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
                Revisión y Estado
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Aplicar Revisión en Ciclo 1"
                    value={contratoEditando.revision_ciclo1 || 'NO'}
                  >
                    <MenuItem value="SI">Si</MenuItem>
                    <MenuItem value="NO">No</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Frecuencia Revisión (Meses)"
                    value={contratoEditando.frecuencia_revision || 'NO'}
                  >
                    <MenuItem value="NO">No</MenuItem>
                    <MenuItem value="6">6 meses</MenuItem>
                    <MenuItem value="12">12 meses</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Fecha Última Revisión"
                    type="date"
                    value={contratoEditando.fecha_ultima_revision || ''}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    select
                    fullWidth
                    label="Estado"
                    value={contratoEditando.estado}
                    onChange={(e) => setContratoEditando({
                      ...contratoEditando,
                      estado: e.target.value
                    })}
                  >
                    <MenuItem value="ACTIVO">Activo</MenuItem>
                    <MenuItem value="CAIDO">Caído</MenuItem>
                    <MenuItem value="COMPLETADO">Completado</MenuItem>
                    <MenuItem value="RESCINDIDO">Rescindido</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cerrarEdicion} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={guardarCambios} variant="contained">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Registro de Pago */}
      <Dialog open={openPagoDialog} onClose={cerrarPago} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registrar Pago - Cuota #{cuotaSeleccionada?.numero}
        </DialogTitle>
        <DialogContent dividers>
          {cuotaSeleccionada && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="body2">
                    <strong>Cuota:</strong> #{cuotaSeleccionada.numero}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fecha de Vencimiento:</strong> {formatearFecha(cuotaSeleccionada.fecha)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Monto Original:</strong> {formatearMoneda(cuotaSeleccionada.monto)}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Monto a Pagar"
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Método de Pago"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                >
                  <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                  <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                  <MenuItem value="CHEQUE">Cheque</MenuItem>
                  <MenuItem value="TARJETA">Tarjeta</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarPago}>Cancelar</Button>
          <Button onClick={registrarPago} variant="contained">
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Gestión de Comentarios */}
      <Dialog 
        open={openComentarioDialog} 
        onClose={cerrarComentarios}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Comentarios del Contrato #{contrato?.numero || id}
            </Typography>
            <IconButton onClick={cerrarComentarios} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* Lista de comentarios existentes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Historial de Comentarios ({comentarios.length})
            </Typography>
            
            {comentarios.length > 0 ? (
              <Box sx={{ 
                maxHeight: 300, 
                overflow: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                backgroundColor: '#fafafa'
              }}>
                {comentarios.map((comentario, index) => (
                  <Box 
                    key={comentario.id}
                    sx={{ 
                      p: 2, 
                      borderBottom: index < comentarios.length - 1 ? '1px solid #e0e0e0' : 'none',
                      backgroundColor: 'white',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {comentario.texto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {comentario.usuario} • 
                      <AccessTimeIcon sx={{ fontSize: 14, mx: 0.5, verticalAlign: 'middle' }} />
                      {formatearFecha(comentario.fecha)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Aún no hay comentarios para este contrato
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Formulario para nuevo comentario */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Agregar Nuevo Comentario
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Escribe tu comentario aquí..."
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                El comentario se guardará con tu usuario y la fecha actual
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={agregarComentario}
                disabled={!nuevoComentario.trim()}
              >
                Agregar Comentario
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={cerrarComentarios} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Re-financiación */}
      <Dialog 
        open={openRefinanciacionDialog} 
        onClose={cerrarRefinanciacion}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Nueva Re-financiación - Contrato #{contrato?.id}
            </Typography>
            <IconButton onClick={cerrarRefinanciacion} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            La re-financiación creará un nuevo plan de pagos manteniendo el historial completo del contrato original.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Tipo de Re-financiación"
                value={datosRefinanciacion.tipo}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  tipo: e.target.value
                })}
                required
              >
                <MenuItem value="CAMBIO_CICLO">Cambio de Ciclo</MenuItem>
                <MenuItem value="ACTUALIZACION_INDICE">Actualización de Índice</MenuItem>
                <MenuItem value="EXTENSION_PLAZO">Extensión de Plazo</MenuItem>
                <MenuItem value="REESTRUCTURACION">Reestructuración Completa</MenuItem>
                <MenuItem value="REDUCCION_CUOTA">Reducción de Cuota</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fecha de Aplicación"
                type="date"
                value={datosRefinanciacion.fecha_aplicacion}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  fecha_aplicacion: e.target.value
                })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo de la Re-financiación"
                multiline
                rows={2}
                value={datosRefinanciacion.motivo}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  motivo: e.target.value
                })}
                placeholder="Ej: Solicitud del cliente por cambio en situación económica"
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Datos Actuales vs Nuevos
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle1" gutterBottom color="text.secondary">
                  📋 Configuración Actual
                </Typography>
                <Typography variant="body2">
                  <strong>Ciclo:</strong> {contrato?.ciclo_actual || 1}
                </Typography>
                <Typography variant="body2">
                  <strong>Índice:</strong> {contrato?.indice_actualizacion || 0}%
                </Typography>
                <Typography variant="body2">
                  <strong>Cuotas:</strong> {contrato?.cuotas_cantidad || 0}
                </Typography>
                <Typography variant="body2">
                  <strong>Cuota Mensual:</strong> {formatearMoneda(contrato?.cuota_mensual || 0)}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  🔄 Nueva Configuración
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevo Ciclo"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevo_ciclo}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevo_ciclo: parseInt(e.target.value) || 1
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevo Índice (%)"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevo_indice}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevo_indice: parseFloat(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nuevas Cuotas"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nuevas_cuotas}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nuevas_cuotas: parseInt(e.target.value) || 0
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nueva Cuota Mensual"
                      type="number"
                      size="small"
                      value={datosRefinanciacion.nueva_cuota_mensual}
                      onChange={(e) => setDatosRefinanciacion({
                        ...datosRefinanciacion,
                        nueva_cuota_mensual: parseFloat(e.target.value) || 0
                      })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones Adicionales"
                multiline
                rows={3}
                value={datosRefinanciacion.observaciones}
                onChange={(e) => setDatosRefinanciacion({
                  ...datosRefinanciacion,
                  observaciones: e.target.value
                })}
                placeholder="Observaciones, condiciones especiales, etc."
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="body2" color="warning.main">
              <strong>⚠️ Importante:</strong> Esta acción creará un registro de re-financiación que se aplicará 
              en la fecha especificada. El contrato original se mantendrá para auditoría y el nuevo plan 
              de pagos se generará automáticamente.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={cerrarRefinanciacion} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={procesarRefinanciacion} 
            variant="contained"
            disabled={!datosRefinanciacion.motivo.trim()}
          >
            Crear Re-financiación
          </Button>
        </DialogActions>
      </Dialog>
    </LoteParaTodosLayout>
  );
}