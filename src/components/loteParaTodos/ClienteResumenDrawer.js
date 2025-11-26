// src/components/loteParaTodos/ClienteResumenDrawer.js
import React, { useState, useMemo } from 'react';
import {
  Drawer, Box, Typography, Grid, Card, CardContent, 
  Button, Chip, Divider, Table, TableBody, TableCell, 
  TableHead, TableRow, LinearProgress, Alert, Stack,
  IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, FormControlLabel, Checkbox, RadioGroup, Radio, InputAdornment
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  OpenInNew as OpenInNewIcon,
  Build as BuildIcon,
  MonetizationOn as MoneyIcon,
  Assignment as AssignmentIcon,
  Gavel as GavelIcon,
  Lock as LockIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';

// Importar los nuevos datos y constantes
import { 
  ESTADO_CONTRATO, ESTADO_CONTRATO_LABELS, ESTADO_CONTRATO_COLORS,
  SITUACION_FISICA, SITUACION_FISICA_LABELS, SITUACION_FISICA_COLORS,
  CONFIG_DEUDA_MUNICIPAL,
  ESTADO_LEGAL, ESTADO_LEGAL_LABELS, ESTADO_LEGAL_COLORS,
  TIPO_PAGO, TIPO_PAGO_LABELS,
  METODO_PAGO, METODO_PAGO_LABELS
} from '../../data/loteParaTodos/constantes';
import { mockContratos, getContratosByClienteId } from '../../data/loteParaTodos/mockContratos';
import { mockLotes } from '../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../data/loteParaTodos/mockEmprendimientos';
import { getPagosByCliente, getUltimoPago, getSaldoPendiente } from '../../data/loteParaTodos/mockPagos';
import { getServiciosContratadosByCliente, getServiciosContratadosByContrato, mockServicios } from '../../data/loteParaTodos/mockServicios';
import { 
  getPrestamosByCliente, getPrestamosByContrato, 
  calcularCreditoDisponible, calcularCreditoDisponiblePorContrato
} from '../../data/loteParaTodos/mockPrestamos';
import { 
  getDocumentosByContrato, getDocumentosRequiredByContrato, generarUrlDocumento,
  TIPO_DOCUMENTO_LABELS, ESTADO_DOCUMENTO_LABELS
} from '../../data/loteParaTodos/mockDocumentos';

const ClienteResumenDrawer = ({ cliente, open, onClose }) => {
  const router = useRouter();
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [openServicioDialog, setOpenServicioDialog] = useState(false);
  const [openPrestamoDialog, setOpenPrestamoDialog] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [pagoForm, setPagoForm] = useState({
    contratoId: '',
    tipoMovimiento: TIPO_PAGO.CUOTA,
    imputacion: 'cuotas_vencidas',
    monto: '',
    metodo: METODO_PAGO.TRANSFERENCIA,
    adjuntoRef: '',
    notas: '',
    enviarRecibo: true
  });
  const [servicioForm, setServicioForm] = useState({
    contratoId: '',
    servicioId: mockServicios[0]?.id || '',
    fechaInicio: new Date().toISOString().slice(0, 10),
    precio: mockServicios[0]?.precio_base || 0,
    notas: '',
    requiereSenia: true
  });
  const [prestamoForm, setPrestamoForm] = useState({
    contratoId: '',
    montoSolicitado: '',
    plazoMeses: 12,
    destino: 'Construcción de vivienda',
    usaGarantiaContrato: true,
    enviarDocumentacion: true
  });
  const reglasImputacion = [
    { value: 'cuotas_vencidas', label: 'Cuotas vencidas (orden cronológico)' },
    { value: 'proxima_cuota', label: 'Próxima cuota del plan' },
    { value: 'saldo_manual', label: 'Aplicar manualmente al saldo' }
  ];
  const opcionesPlazoPrestamo = [12, 18, 24, 36, 48];

  // Obtener datos relacionados del cliente
  const contratos = useMemo(() => {
    if (!cliente) return [];
    return getContratosByClienteId(cliente.id).map(contrato => {
      const lote = mockLotes.find(l => l.id === contrato.lote_id);
      const emprendimiento = mockEmprendimientos.find(e => e.id === lote?.emprendimiento_id);
      const vendedor = mockVendedores.find(v => v.id === contrato.vendedor_id);
      const ultimoPago = getUltimoPago(contrato.id);
      const saldoPendiente = getSaldoPendiente(contrato.id);
      
      // Calcular monto pagado para este contrato específico
      const montoPagado = contrato.precio_acordado - saldoPendiente;
      
      // Calcular crédito disponible específico para este lote
      const creditoLote = calcularCreditoDisponiblePorContrato(contrato.lote_id, montoPagado);
      
      // Obtener servicios, préstamos y documentos específicos del lote
      const serviciosLote = getServiciosContratadosByContrato(contrato.id, contrato.lote_id);
      const prestamosLote = getPrestamosByContrato(contrato.id, contrato.lote_id);
      const documentosContrato = getDocumentosByContrato(contrato.id);
      const estadoDocumentos = getDocumentosRequiredByContrato(contrato.id);
      
      return {
        ...contrato,
        lote,
        emprendimiento,
        vendedor,
        ultimo_pago_detalle: ultimoPago,
        saldo_pendiente_actual: saldoPendiente,
        monto_pagado: montoPagado,
        credito_lote: creditoLote,
        servicios_lote: serviciosLote,
        prestamos_lote: prestamosLote,
        documentos: documentosContrato,
        estado_documentos: estadoDocumentos
      };
    });
  }, [cliente]);

  const pagos = useMemo(() => {
    if (!cliente) return [];
    return getPagosByCliente(cliente.id).slice(-10); // Últimos 10 pagos
  }, [cliente]);

  // Los servicios y préstamos ahora están incluidos en cada contrato
  const todosLosServicios = useMemo(() => {
    return contratos.flatMap(contrato => contrato.servicios_lote || []);
  }, [contratos]);

  const todosLosPrestamos = useMemo(() => {
    return contratos.flatMap(contrato => contrato.prestamos_lote || []);
  }, [contratos]);
  const lotesBloqueados = useMemo(() => (
    contratos.filter(contrato => contrato.lote?.estado_legal === ESTADO_LEGAL.BLOQUEADO)
  ), [contratos]);
  const lotesEnLegales = useMemo(() => (
    contratos.filter(contrato => contrato.lote?.estado_legal === ESTADO_LEGAL.EN_LEGALES)
  ), [contratos]);
  const clienteBloqueado = lotesBloqueados.length > 0;

  const creditoInfo = useMemo(() => {
    if (!cliente) return null;
    
    // Sumar crédito disponible de todos los lotes del cliente
    const creditoTotal = contratos.reduce((total, contrato) => {
      return {
        credito_maximo: total.credito_maximo + contrato.credito_lote.credito_maximo,
        deuda_prestamos_actual: total.deuda_prestamos_actual + contrato.credito_lote.deuda_prestamos_actual,
        credito_disponible: total.credito_disponible + contrato.credito_lote.credito_disponible
      };
    }, { credito_maximo: 0, deuda_prestamos_actual: 0, credito_disponible: 0 });
    
    return creditoTotal;
  }, [cliente, contratos]);
  const creditoDisponible = creditoInfo?.credito_disponible || 0;
  const puedeSolicitarPrestamo = creditoDisponible > 0 && !clienteBloqueado;

  React.useEffect(() => {
    if (contratos.length === 0) return;
    setPagoForm(prev => ({
      ...prev,
      contratoId: prev.contratoId || contratos[0].id,
      monto: prev.monto || contratos[0].cuota_mensual || contratos[0].precio_acordado || ''
    }));
    setServicioForm(prev => ({
      ...prev,
      contratoId: prev.contratoId || contratos[0].id
    }));
    setPrestamoForm(prev => ({
      ...prev,
      contratoId: prev.contratoId || contratos[0].id
    }));
  }, [contratos]);

  const estadisticasResumen = useMemo(() => {
    const totalContratos = contratos.length;
    const contratosActivos = contratos.filter(c => c.estado === 'ACTIVO').length;
    const saldoTotal = contratos.reduce((total, c) => total + (c.saldo_pendiente_actual || 0), 0);
    const totalPagado = contratos.reduce((total, c) => total + (c.monto_pagado || 0), 0);
    
    // Contar servicios y préstamos de todos los lotes
    const totalServicios = contratos.reduce((total, c) => total + c.servicios_lote.length, 0);
    const totalPrestamos = contratos.reduce((total, c) => total + c.prestamos_lote.length, 0);
    
    return {
      total_contratos: totalContratos,
      contratos_activos: contratosActivos,
      saldo_total: saldoTotal,
      total_pagado: totalPagado,
      total_servicios: totalServicios,
      total_prestamos: totalPrestamos
    };
  }, [contratos]);

  const generarUrlDeudaMunicipal = (numeroPartida) => {
    return CONFIG_DEUDA_MUNICIPAL.URL_TEMPLATE.replace('{partida}', numeroPartida);
  };

  const formatCantidad = (cantidad, singular, plural) => {
    const pluralFinal = plural || `${singular}s`;
    if (cantidad === 1) return `1 ${singular}`;
    return `${cantidad} ${pluralFinal}`;
  };

  const handleOpenPagoDialog = (contrato = null) => {
    const contratoBase = contrato || contratos.find(c => c.id === pagoForm.contratoId) || contratos[0];
    setPagoForm(prev => ({
      ...prev,
      contratoId: contratoBase?.id || prev.contratoId,
      monto: contratoBase?.cuota_mensual || prev.monto || contratoBase?.precio_acordado || ''
    }));
    setOpenPagoDialog(true);
  };

  const handleOpenServicioDialog = (contrato = null) => {
    const contratoBase = contrato || contratos.find(c => c.id === servicioForm.contratoId) || contratos[0];
    setContratoSeleccionado(contratoBase || null);
    setServicioForm(prev => ({
      ...prev,
      contratoId: contratoBase?.id || prev.contratoId
    }));
    setOpenServicioDialog(true);
  };

  const handleOpenPrestamoDialog = (contrato = null) => {
    const contratoBase = contrato || contratos.find(c => c.id === prestamoForm.contratoId) || contratos[0];
    setContratoSeleccionado(contratoBase || null);
    setPrestamoForm(prev => ({
      ...prev,
      contratoId: contratoBase?.id || prev.contratoId,
      montoSolicitado: prev.montoSolicitado || (contratoBase?.credito_lote?.credito_disponible?.toString() ?? '')
    }));
    setOpenPrestamoDialog(true);
  };

  const handlePagoFormChange = (field, value) => setPagoForm(prev => ({ ...prev, [field]: value }));
  const handleServicioFormChange = (field, value) => setServicioForm(prev => ({ ...prev, [field]: value }));
  const getContratoById = (contratoId) => contratos.find(c => c.id === Number(contratoId));
  const handleServicioContratoChange = (value) => {
    const contratoTarget = getContratoById(value);
    setContratoSeleccionado(contratoTarget || null);
    setServicioForm(prev => ({ ...prev, contratoId: value }));
  };
  const handlePrestamoContratoChange = (value) => {
    if (!value) {
      setContratoSeleccionado(null);
      setPrestamoForm(prev => ({ ...prev, contratoId: '', montoSolicitado: '' }));
      return;
    }
    const contratoTarget = getContratoById(value);
    const creditoDisponibleContrato = contratoTarget?.credito_lote?.credito_disponible || 0;
    setContratoSeleccionado(contratoTarget || null);
    setPrestamoForm(prev => ({
      ...prev,
      contratoId: value,
      montoSolicitado: prev.montoSolicitado
        ? Math.min(Number(prev.montoSolicitado), creditoDisponibleContrato).toString()
        : (creditoDisponibleContrato || '').toString()
    }));
  };
  const handlePrestamoFormChange = (field, value) => {
    setPrestamoForm(prev => {
      if (field === 'montoSolicitado') {
        if (value === '') {
          return { ...prev, montoSolicitado: '' };
        }
        const contratoActual = getContratoById(prev.contratoId);
        const creditoDisponibleContrato = contratoActual?.credito_lote?.credito_disponible;
        const montoNormalizado = Number(value) || 0;
        const montoLimitado = creditoDisponibleContrato
          ? Math.min(montoNormalizado, creditoDisponibleContrato)
          : montoNormalizado;
        return { ...prev, montoSolicitado: montoLimitado.toString() };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmitPago = () => {
    console.log('Pago mock registrado', pagoForm);
    setOpenPagoDialog(false);
  };

  const handleSubmitServicio = () => {
    console.log('Servicio mock solicitado', servicioForm);
    setOpenServicioDialog(false);
    setContratoSeleccionado(null);
  };

  const handleSubmitPrestamo = () => {
    console.log('Préstamo mock solicitado', prestamoForm);
    setOpenPrestamoDialog(false);
    setContratoSeleccionado(null);
  };

  if (!cliente) return null;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 800, md: 1000 } }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header del cliente */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {cliente.nombre} {cliente.apellido}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                DNI: {cliente.dni} | Email: {cliente.email}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {cliente.estado_legal_general && (
                <Chip
                  icon={<GavelIcon />}
                  label={`Legal: ${ESTADO_LEGAL_LABELS[cliente.estado_legal_general] || 'Sin dato'}`}
                  color={ESTADO_LEGAL_COLORS[cliente.estado_legal_general] || 'default'}
                  variant={cliente.estado_legal_general === ESTADO_LEGAL.NORMAL ? 'outlined' : 'filled'}
                />
              )}
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>

          {clienteBloqueado && (
            <Alert severity="error" icon={<LockIcon />} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                Operaciones bloqueadas por legales
              </Typography>
              <Typography variant="body2">
                Los lotes {lotesBloqueados.map(lb => lb.lote?.numero).join(', ')} se encuentran en estado <strong>Bloqueado</strong>.
                Solo se permiten acciones de cobranza hasta que el equipo legal libere el caso.
              </Typography>
            </Alert>
          )}
          {!clienteBloqueado && lotesEnLegales.length > 0 && (
            <Alert severity="warning" icon={<GavelIcon />} sx={{ mb: 3 }}>
              Hay lotes en seguimiento legal: {lotesEnLegales.map(le => le.lote?.numero).join(', ')}.
              Las nuevas operaciones requerirán autorización.
            </Alert>
          )}

          {/* Resumen de estadísticas */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <HomeIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight="bold">
                    {estadisticasResumen.total_contratos}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contratos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <MoneyIcon color="success" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight="bold">
                    ${estadisticasResumen.total_pagado?.toLocaleString('es-AR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Pagado
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PaymentIcon color="warning" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight="bold">
                    ${estadisticasResumen.saldo_total?.toLocaleString('es-AR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saldo Pendiente
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AccountBalanceIcon color="info" sx={{ fontSize: 40 }} />
                  <Typography variant="h6" fontWeight="bold">
                    ${creditoInfo?.credito_disponible?.toLocaleString('es-AR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Crédito Disponible
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Acciones principales */}
          <Stack
            direction="row"
            spacing={2}
            sx={{ mb: 4, flexWrap: 'wrap', rowGap: 1.5, columnGap: 2 }}
          >
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              color={clienteBloqueado ? 'warning' : 'primary'}
              onClick={() => handleOpenPagoDialog()}
            >
              Registrar Pago
            </Button>
            <Tooltip
              title={clienteBloqueado ? 'Bloqueado por legales: no se pueden contratar servicios hasta regularizar.' : ''}
              disableHoverListener={!clienteBloqueado}
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<BuildIcon />}
                  onClick={() => handleOpenServicioDialog()}
                  disabled={clienteBloqueado}
                >
                  Contratar Servicio
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={!puedeSolicitarPrestamo ? 'Sin crédito disponible o bloqueado por legales.' : ''}
              disableHoverListener={puedeSolicitarPrestamo}
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<MoneyIcon />}
                  onClick={() => handleOpenPrestamoDialog()}
                  disabled={!puedeSolicitarPrestamo}
                >
                  Solicitar Préstamo
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {/* Contratos del cliente */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                Mis Lotes ({contratos.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {contratos.map((contrato) => (
                  <Grid item xs={12} key={contrato.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={2}>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                Lote {contrato.lote?.numero} - {contrato.emprendimiento?.nombre}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Vendedor: {contrato.vendedor?.nombre} {contrato.vendedor?.apellido}
                              </Typography>
                            </Box>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ flexWrap: 'wrap', rowGap: 1, columnGap: 1 }}
                            >
                              <Button 
                                size="small" 
                                variant="contained"
                                onClick={() => router.push(`/loteParaTodosMock/contratos/${contrato.id}`)}
                              >
                                Ver Plan de Pagos
                              </Button>
                              <Button 
                                size="small"
                                variant="outlined"
                                startIcon={<PaymentIcon />}
                                onClick={() => handleOpenPagoDialog(contrato)}
                              >
                                Pago
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined"
                                startIcon={<BuildIcon />}
                                onClick={() => handleOpenServicioDialog(contrato)}
                                disabled={clienteBloqueado}
                              >
                                Servicio
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined"
                                startIcon={<MoneyIcon />}
                                onClick={() => handleOpenPrestamoDialog(contrato)}
                                disabled={!contrato.credito_lote?.credito_disponible || contrato.credito_lote.credito_disponible <= 0}
                              >
                                Préstamo
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined"
                                startIcon={<DescriptionIcon />}
                                onClick={() => {
                                  // Scroll to documents section or open dialog
                                  const element = document.getElementById(`docs-contrato-${contrato.id}`);
                                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                                }}
                              >
                                Documentos
                              </Button>
                            </Stack>
                          </Stack>

                          <Grid container spacing={2} alignItems="stretch">
                            <Grid item xs={12} md={7}>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">
                                    Precio Acordado
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600">
                                    ${contrato.precio_acordado?.toLocaleString('es-AR')}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">
                                    Saldo Pendiente
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600" color="warning.main">
                                    ${contrato.saldo_pendiente_actual?.toLocaleString('es-AR')}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">
                                    Crédito Disponible
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600" color="success.main">
                                    ${contrato.credito_lote?.credito_disponible?.toLocaleString('es-AR')}
                                  </Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">
                                    Último Pago
                                  </Typography>
                                  <Typography variant="body1" fontWeight="600">
                                    {contrato.ultimo_pago_detalle?.fecha_pago || 'Sin pagos'}
                                  </Typography>
                                </Grid>
                              </Grid>

                              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1, columnGap: 1 }}>
                                <Chip
                                  label={ESTADO_CONTRATO_LABELS[contrato.estado] || contrato.estado}
                                  color={ESTADO_CONTRATO_COLORS[contrato.estado] || 'default'}
                                  size="small"
                                />
                                <Chip
                                  label={SITUACION_FISICA_LABELS[contrato.lote?.situacion_fisica] || contrato.lote?.situacion_fisica}
                                  color={SITUACION_FISICA_COLORS[contrato.lote?.situacion_fisica] || 'default'}
                                  size="small"
                                />
                                {contrato.lote?.numero_partida && (
                                  <Tooltip title="Consultar deuda municipal">
                                    <Chip
                                      label={`Partida: ${contrato.lote.numero_partida}`}
                                      size="small"
                                      clickable
                                      onClick={() => window.open(generarUrlDeudaMunicipal(contrato.lote.numero_partida), '_blank')}
                                      icon={<OpenInNewIcon />}
                                    />
                                  </Tooltip>
                                )}
                              </Stack>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <Box sx={{ height: '100%', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  Información del Contrato:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                  {contrato.servicios_lote.length > 0 && (
                                    <Chip 
                                      label={formatCantidad(contrato.servicios_lote.length, 'Servicio')} 
                                      size="small" 
                                      color="info"
                                      icon={<BuildIcon />}
                                    />
                                  )}
                                  {contrato.prestamos_lote.length > 0 && (
                                    <Chip 
                                      label={formatCantidad(contrato.prestamos_lote.length, 'Préstamo')}
                                      size="small" 
                                      color="warning"
                                      icon={<MoneyIcon />}
                                    />
                                  )}
                                  {contrato.documentos.length > 0 && (
                                    <Chip 
                                      label={formatCantidad(contrato.documentos.length, 'Documento')} 
                                      size="small" 
                                      color="default"
                                      icon={<DescriptionIcon />}
                                    />
                                  )}
                                  {contrato.estado_documentos && (
                                    <Chip 
                                      label={`${contrato.estado_documentos.porcentaje_completitud.toFixed(0)}% Docs`} 
                                      size="small" 
                                      color={contrato.estado_documentos.porcentaje_completitud === 100 ? 'success' : 'warning'}
                                    />
                                  )}
                                </Stack>
                              </Box>
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Servicios contratados */}
          {todosLosServicios.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" fontWeight="bold">
                  Servicios Contratados ({todosLosServicios.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Servicio</TableCell>
                      <TableCell>Lote</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Precio</TableCell>
                      <TableCell>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todosLosServicios.map((servicio) => (
                      <TableRow key={servicio.id}>
                        <TableCell>{servicio.servicio_id}</TableCell>
                        <TableCell>Lote {servicio.lote_id}</TableCell>
                        <TableCell>
                          <Chip label={servicio.estado} size="small" />
                        </TableCell>
                        <TableCell>${servicio.precio_acordado?.toLocaleString('es-AR')}</TableCell>
                        <TableCell>{servicio.fecha_contratacion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Préstamos */}
          {todosLosPrestamos.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" fontWeight="bold">
                  Préstamos ({todosLosPrestamos.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Garantía</TableCell>
                      <TableCell>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {todosLosPrestamos.map((prestamo) => (
                      <TableRow key={prestamo.id}>
                        <TableCell>{prestamo.tipo}</TableCell>
                        <TableCell>${prestamo.monto_aprobado?.toLocaleString('es-AR')}</TableCell>
                        <TableCell>
                          <Chip label={prestamo.estado} size="small" />
                        </TableCell>
                        <TableCell>Lote {prestamo.garantia_lote_id}</TableCell>
                        <TableCell>{prestamo.fecha_solicitud}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Documentos del cliente */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                Documentos por Contrato
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {contratos.map((contrato) => (
                <Box key={contrato.id} id={`docs-contrato-${contrato.id}`} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Lote {contrato.lote?.numero} - {contrato.emprendimiento?.nombre}
                  </Typography>
                  
                  {contrato.documentos.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Documento</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Fecha</TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contrato.documentos.map((documento) => (
                          <TableRow key={documento.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600">
                                {TIPO_DOCUMENTO_LABELS[documento.tipo_documento]}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {documento.titulo}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={ESTADO_DOCUMENTO_LABELS[documento.estado]} 
                                size="small"
                                color={
                                  documento.estado === 'firmado' ? 'success' : 
                                  documento.estado === 'generado' ? 'warning' : 
                                  documento.estado === 'vencido' ? 'error' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {documento.fecha_firma || documento.fecha_generacion}
                              </Typography>
                              {documento.fecha_vencimiento && (
                                <Typography variant="caption" color="text.secondary">
                                  Vence: {documento.fecha_vencimiento}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => window.open(generarUrlDocumento(documento), '_blank')}
                                title="Descargar documento"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      No hay documentos generados para este contrato
                    </Alert>
                  )}
                  
                  {/* Indicador de completitud de documentos */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Completitud de documentos: {contrato.estado_documentos?.porcentaje_completitud.toFixed(0)}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={contrato.estado_documentos?.porcentaje_completitud || 0}
                      color={contrato.estado_documentos?.porcentaje_completitud === 100 ? 'success' : 'warning'}
                    />
                    {contrato.estado_documentos?.faltantes.length > 0 && (
                      <Typography variant="caption" color="warning.main">
                        Documentos faltantes: {contrato.estado_documentos.faltantes.map(tipo => 
                          TIPO_DOCUMENTO_LABELS[tipo]
                        ).join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>

          {/* Últimos pagos */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                Últimos Pagos ({pagos.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Método</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>{pago.fecha_pago || pago.fecha_vencimiento}</TableCell>
                      <TableCell>{pago.tipo_pago}</TableCell>
                      <TableCell>${pago.monto?.toLocaleString('es-AR')}</TableCell>
                      <TableCell>{pago.metodo_pago || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={pago.estado} 
                          size="small"
                          color={pago.estado === 'pagado' ? 'success' : pago.estado === 'vencido' ? 'error' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Drawer>

      {/* Diálogos para acciones */}
      <Dialog open={openPagoDialog} onClose={() => setOpenPagoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Contrato / Lote"
              value={pagoForm.contratoId}
              onChange={(e) => handlePagoFormChange('contratoId', e.target.value)}
            >
              {contratos.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  #{c.id} · Lote {c.lote?.numero} · saldo ${c.saldo_pendiente_actual?.toLocaleString('es-AR')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tipo de movimiento"
              value={pagoForm.tipoMovimiento}
              onChange={(e) => handlePagoFormChange('tipoMovimiento', e.target.value)}
            >
              {Object.entries(TIPO_PAGO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Regla de imputación"
              value={pagoForm.imputacion}
              onChange={(e) => handlePagoFormChange('imputacion', e.target.value)}
              helperText="Define cómo se distribuirá el pago"
            >
              {reglasImputacion.map((regla) => (
                <MenuItem key={regla.value} value={regla.value}>{regla.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Monto"
              type="number"
              value={pagoForm.monto}
              onChange={(e) => handlePagoFormChange('monto', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
            <TextField
              select
              label="Método de pago"
              value={pagoForm.metodo}
              onChange={(e) => handlePagoFormChange('metodo', e.target.value)}
            >
              {Object.entries(METODO_PAGO_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Referencia de adjunto / comprobante"
              value={pagoForm.adjuntoRef}
              onChange={(e) => handlePagoFormChange('adjuntoRef', e.target.value)}
              placeholder="Ej: comprobante_123.pdf o enlace"
              InputProps={{ endAdornment: <AttachFileIcon fontSize="small" /> }}
            />
            <TextField
              label="Notas internas"
              multiline
              minRows={3}
              value={pagoForm.notas}
              onChange={(e) => handlePagoFormChange('notas', e.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pagoForm.enviarRecibo}
                  onChange={(e) => handlePagoFormChange('enviarRecibo', e.target.checked)}
                />
              }
              label="Enviar comprobante automáticamente al cliente"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPagoDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitPago} startIcon={<ReceiptIcon />}>
            Registrar pago mock
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openServicioDialog} onClose={() => setOpenServicioDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Contratar Servicio - Lote {contratoSeleccionado?.lote?.numero}
        </DialogTitle>
        <DialogContent dividers>
          {contratoSeleccionado && (
            <Stack spacing={2}>
              <Alert severity="info">
                <strong>Lote:</strong> {contratoSeleccionado.lote?.numero} - {contratoSeleccionado.emprendimiento?.nombre}
                <br />
                <strong>Servicios actuales:</strong> {contratoSeleccionado.servicios_lote?.length || 0}
              </Alert>
              <TextField
                select
                label="Contrato / Lote"
                value={servicioForm.contratoId}
                onChange={(e) => handleServicioContratoChange(e.target.value)}
              >
                {contratos.map((c) => (
                  <MenuItem key={`serv-${c.id}`} value={c.id}>
                    Lote {c.lote?.numero} · {c.emprendimiento?.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Servicio"
                value={servicioForm.servicioId}
                onChange={(e) => {
                  const servicioSeleccionado = mockServicios.find(s => s.id === parseInt(e.target.value, 10));
                  handleServicioFormChange('servicioId', e.target.value);
                  handleServicioFormChange('precio', servicioSeleccionado?.precio_base || servicioForm.precio);
                }}
              >
                {mockServicios.map((servicio) => (
                  <MenuItem key={servicio.id} value={servicio.id}>
                    {servicio.nombre} · ${servicio.precio_base.toLocaleString('es-AR')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha de inicio"
                type="date"
                value={servicioForm.fechaInicio}
                onChange={(e) => handleServicioFormChange('fechaInicio', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Precio estimado"
                type="number"
                value={servicioForm.precio}
                onChange={(e) => handleServicioFormChange('precio', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
              <TextField
                label="Notas para operaciones"
                multiline
                minRows={3}
                value={servicioForm.notas}
                onChange={(e) => handleServicioFormChange('notas', e.target.value)}
                placeholder="Plan de obra, responsable, agenda, etc."
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={servicioForm.requiereSenia}
                    onChange={(e) => handleServicioFormChange('requiereSenia', e.target.checked)}
                  />
                }
                label="Solicitar seña del 20% para activar el servicio"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenServicioDialog(false);
            setContratoSeleccionado(null);
          }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmitServicio} startIcon={<BuildIcon />} disabled={clienteBloqueado}>
            Registrar solicitud
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPrestamoDialog} onClose={() => setOpenPrestamoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Solicitar Préstamo - Lote {contratoSeleccionado?.lote?.numero}
        </DialogTitle>
        <DialogContent dividers>
          {contratoSeleccionado && (
            <Stack spacing={2}>
              <Alert severity="success">
                <strong>Lote garantía:</strong> {contratoSeleccionado.lote?.numero} - {contratoSeleccionado.emprendimiento?.nombre}
                <br />
                <strong>Crédito disponible:</strong> ${contratoSeleccionado.credito_lote?.credito_disponible?.toLocaleString('es-AR')}
                <br />
                <strong>Monto pagado:</strong> ${contratoSeleccionado.monto_pagado?.toLocaleString('es-AR')}
              </Alert>
              <TextField
                select
                label="Contrato / Lote garantía"
                value={prestamoForm.contratoId}
                onChange={(e) => handlePrestamoContratoChange(e.target.value)}
              >
                {contratos.map((c) => (
                  <MenuItem key={`prest-${c.id}`} value={c.id}>
                    Lote {c.lote?.numero} · crédito ${c.credito_lote?.credito_disponible?.toLocaleString('es-AR')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Monto solicitado"
                type="number"
                value={prestamoForm.montoSolicitado}
                onChange={(e) => handlePrestamoFormChange('montoSolicitado', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                helperText={
                  contratoSeleccionado?.credito_lote?.credito_disponible
                    ? `Máximo autorizado: $${contratoSeleccionado.credito_lote.credito_disponible.toLocaleString('es-AR')}`
                    : 'Sin crédito disponible en este lote'
                }
              />
              <TextField
                select
                label="Plazo estimado"
                value={prestamoForm.plazoMeses}
                onChange={(e) => handlePrestamoFormChange('plazoMeses', Number(e.target.value))}
              >
                {opcionesPlazoPrestamo.map((meses) => (
                  <MenuItem key={`plazo-${meses}`} value={meses}>
                    {meses} meses
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Destino del préstamo"
                value={prestamoForm.destino}
                onChange={(e) => handlePrestamoFormChange('destino', e.target.value)}
                placeholder="Ej: construcción, cancelación anticipada, mejoras"
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Uso del crédito asignado
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(() => {
                    const disponible = contratoSeleccionado?.credito_lote?.credito_disponible || 0;
                    if (!disponible) return 0;
                    const solicitado = Number(prestamoForm.montoSolicitado) || 0;
                    return Math.min((solicitado / disponible) * 100, 100);
                  })()}
                  color="info"
                />
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={prestamoForm.usaGarantiaContrato}
                    onChange={(e) => handlePrestamoFormChange('usaGarantiaContrato', e.target.checked)}
                  />
                }
                label="Usar este contrato como garantía del préstamo"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={prestamoForm.enviarDocumentacion}
                    onChange={(e) => handlePrestamoFormChange('enviarDocumentacion', e.target.checked)}
                  />
                }
                label="Enviar documentación de respaldo al cliente"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPrestamoDialog(false);
            setContratoSeleccionado(null);
          }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitPrestamo}
            startIcon={<MoneyIcon />}
            disabled={!puedeSolicitarPrestamo || !prestamoForm.montoSolicitado}
          >
            Simular préstamo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClienteResumenDrawer;