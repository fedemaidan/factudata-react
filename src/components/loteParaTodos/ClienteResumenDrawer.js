// src/components/loteParaTodos/ClienteResumenDrawer.js
import React, { useState, useMemo } from 'react';
import {
  Drawer, Box, Typography, Grid, Card, CardContent, 
  Button, Chip, Divider, Table, TableBody, TableCell, 
  TableHead, TableRow, LinearProgress, Alert, Stack,
  IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField
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
  Assignment as AssignmentIcon
} from '@mui/icons-material';

// Importar los nuevos datos y constantes
import { 
  ESTADO_CONTRATO, ESTADO_CONTRATO_LABELS, ESTADO_CONTRATO_COLORS,
  SITUACION_FISICA, SITUACION_FISICA_LABELS, SITUACION_FISICA_COLORS,
  CONFIG_DEUDA_MUNICIPAL
} from '../../data/loteParaTodos/constantes';
import { mockContratos, getContratosByClienteId } from '../../data/loteParaTodos/mockContratos';
import { mockLotes } from '../../data/loteParaTodos/mockLotes';
import { mockVendedores } from '../../data/loteParaTodos/mockVendedores';
import { mockEmprendimientos } from '../../data/loteParaTodos/mockEmprendimientos';
import { getPagosByCliente, getUltimoPago, getSaldoPendiente } from '../../data/loteParaTodos/mockPagos';
import { getServiciosContratadosByCliente, getServiciosContratadosByContrato } from '../../data/loteParaTodos/mockServicios';
import { 
  getPrestamosByCliente, getPrestamosByContrato, 
  calcularCreditoDisponible, calcularCreditoDisponiblePorContrato
} from '../../data/loteParaTodos/mockPrestamos';
import { 
  getDocumentosByContrato, getDocumentosRequiredByContrato, generarUrlDocumento,
  TIPO_DOCUMENTO_LABELS, ESTADO_DOCUMENTO_LABELS
} from '../../data/loteParaTodos/mockDocumentos';

const ClienteResumenDrawer = ({ cliente, open, onClose }) => {
  const [openPagoDialog, setOpenPagoDialog] = useState(false);
  const [openServicioDialog, setOpenServicioDialog] = useState(false);
  const [openPrestamoDialog, setOpenPrestamoDialog] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);

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
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>

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
          <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              onClick={() => setOpenPagoDialog(true)}
            >
              Registrar Pago
            </Button>
            <Button
              variant="outlined"
              startIcon={<BuildIcon />}
              onClick={() => setOpenServicioDialog(true)}
            >
              Contratar Servicio
            </Button>
            <Button
              variant="outlined"
              startIcon={<MoneyIcon />}
              onClick={() => setOpenPrestamoDialog(true)}
              disabled={!creditoInfo?.credito_disponible || creditoInfo.credito_disponible <= 0}
            >
              Solicitar Préstamo
            </Button>
          </Stack>

          {/* Contratos del cliente */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" fontWeight="bold">
                Contratos ({contratos.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {contratos.map((contrato) => (
                  <Grid item xs={12} key={contrato.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              Lote {contrato.lote?.numero} - {contrato.emprendimiento?.nombre}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Vendedor: {contrato.vendedor?.nombre} {contrato.vendedor?.apellido}
                            </Typography>
                            
                            <Grid container spacing={2} sx={{ mb: 2 }}>
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

                            {/* Resumen de servicios, préstamos y documentos por lote */}
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Información del Contrato:
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                {contrato.servicios_lote.length > 0 && (
                                  <Chip 
                                    label={`${contrato.servicios_lote.length} Servicios`} 
                                    size="small" 
                                    color="info"
                                    icon={<BuildIcon />}
                                  />
                                )}
                                {contrato.prestamos_lote.length > 0 && (
                                  <Chip 
                                    label={`${contrato.prestamos_lote.length} Préstamos`} 
                                    size="small" 
                                    color="warning"
                                    icon={<MoneyIcon />}
                                  />
                                )}
                                {contrato.documentos.length > 0 && (
                                  <Chip 
                                    label={`${contrato.documentos.length} Documentos`} 
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

                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
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
                          </Box>
                          
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined">
                              Ver Detalle
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              startIcon={<BuildIcon />}
                              onClick={() => {
                                setContratoSeleccionado(contrato);
                                setOpenServicioDialog(true);
                              }}
                            >
                              Servicio
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              startIcon={<MoneyIcon />}
                              onClick={() => {
                                setContratoSeleccionado(contrato);
                                setOpenPrestamoDialog(true);
                              }}
                              disabled={!contrato.credito_lote?.credito_disponible || contrato.credito_lote.credito_disponible <= 0}
                            >
                              Préstamo
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined"
                              startIcon={<DescriptionIcon />}
                              onClick={() => {
                                // Mostrar documentos del contrato
                                console.log('Documentos del contrato:', contrato.documentos);
                              }}
                            >
                              Documentos
                            </Button>
                            <Button size="small" variant="contained">
                              Actualizar
                            </Button>
                          </Stack>
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
                <Box key={contrato.id} sx={{ mb: 3 }}>
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
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Funcionalidad en desarrollo
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPagoDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openServicioDialog} onClose={() => setOpenServicioDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Contratar Servicio - Lote {contratoSeleccionado?.lote?.numero}
        </DialogTitle>
        <DialogContent>
          {contratoSeleccionado && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Lote:</strong> {contratoSeleccionado.lote?.numero} - {contratoSeleccionado.emprendimiento?.nombre}
                <br />
                <strong>Servicios actuales:</strong> {contratoSeleccionado.servicios_lote?.length || 0}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Funcionalidad en desarrollo - Permitirá contratar servicios específicos para este lote
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenServicioDialog(false);
            setContratoSeleccionado(null);
          }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPrestamoDialog} onClose={() => setOpenPrestamoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Solicitar Préstamo - Lote {contratoSeleccionado?.lote?.numero}
        </DialogTitle>
        <DialogContent>
          {contratoSeleccionado && (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>Lote garantía:</strong> {contratoSeleccionado.lote?.numero} - {contratoSeleccionado.emprendimiento?.nombre}
                <br />
                <strong>Crédito disponible:</strong> ${contratoSeleccionado.credito_lote?.credito_disponible?.toLocaleString('es-AR')}
                <br />
                <strong>Monto pagado:</strong> ${contratoSeleccionado.monto_pagado?.toLocaleString('es-AR')}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Funcionalidad en desarrollo - Permitirá solicitar préstamos garantizados con este lote específico
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenPrestamoDialog(false);
            setContratoSeleccionado(null);
          }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClienteResumenDrawer;