import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Map as MapIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

import LoteParaTodosLayout from '../../../../../components/layouts/LoteParaTodosLayout';
import LoteInfoExtendida from '../../../../../components/loteParaTodos/LoteInfoExtendida';
import LoteFormDrawer from '../../../../../components/loteParaTodos/LoteFormDrawer';
import NuevaReservaDialog from '../../../../../components/loteParaTodos/NuevaReservaDialog';

import { getEmprendimientoById } from '../../../../../data/loteParaTodos/mockEmprendimientos';
import {
  mapLegacyEstadoToCondicion,
  mapLegacyEstadoToEstadoLegal,
  SITUACION_FISICA,
  SITUACION_FISICA_LABELS,
  SITUACION_FISICA_COLORS,
  CONDICION_LOTE,
  CONDICION_LOTE_LABELS,
  CONDICION_LOTE_COLORS,
  ESTADO_LEGAL_LABELS,
  ESTADO_LEGAL_COLORS,
  ESTADO_LEGAL
} from '../../../../../data/loteParaTodos/constantes';
import { getLoteById } from '../../../../../data/loteParaTodos/mockLotes';
import { getContratosByLoteId } from '../../../../../data/loteParaTodos/mockContratos';
import { getClienteById } from '../../../../../data/loteParaTodos/mockClientes';
import { getVendedorById } from '../../../../../data/loteParaTodos/mockVendedores';

const CONTRATO_COLOR_MAP = {
  ACTIVO: 'success',
  COMPLETADO: 'primary',
  RESERVADO: 'warning',
  CAIDO: 'error',
  SUSPENDIDO: 'default'
};

const normalizarLote = (lote = {}) => {
  if (!lote) return null;
  return {
    ...lote,
    condicion_lote: lote.condicion_lote || mapLegacyEstadoToCondicion(lote.estado),
    estado_legal: lote.estado_legal || mapLegacyEstadoToEstadoLegal(lote.estado),
    situacion_fisica: lote.situacion_fisica || SITUACION_FISICA.BALDIO,
    superficie: lote.superficie || 0,
    precio_base: lote.precio_base || 0,
    numero: lote.numero || `Lote ${lote.id}`,
    manzana: lote.manzana || 'Sin manzana'
  };
};

const formatCurrency = (value = 0, currency = 'ARS') => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency
  }).format(value || 0);
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-AR');
  } catch (error) {
    return value;
  }
};

const LoteDetallePage = () => {
  const router = useRouter();
  const { id, loteId } = router.query;

  const emprendimiento = useMemo(() => {
    if (!id) return null;
    return getEmprendimientoById(parseInt(id, 10));
  }, [id]);

  const loteBase = useMemo(() => {
    if (!loteId) return null;
    return getLoteById(parseInt(loteId, 10));
  }, [loteId]);

  const loteNormalizado = useMemo(() => {
    if (!loteBase) return null;
    return normalizarLote(loteBase);
  }, [loteBase]);

  const [lote, setLote] = useState(loteNormalizado);
  useEffect(() => {
    if (loteNormalizado) {
      setLote(loteNormalizado);
    }
  }, [loteNormalizado]);

  const contratosIniciales = useMemo(() => {
    if (!loteBase) return [];
    return getContratosByLoteId(loteBase.id);
  }, [loteBase]);

  const [contratos, setContratos] = useState(contratosIniciales);
  useEffect(() => {
    setContratos(contratosIniciales);
  }, [contratosIniciales]);

  const [isReservaDialogOpen, setIsReservaDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const contratoActual = useMemo(() => {
    return contratos.find((contrato) => ['ACTIVO', 'RESERVADO', 'COMPLETADO'].includes(contrato.estado));
  }, [contratos]);

  const clienteActivo = useMemo(() => {
    if (!contratoActual) return null;
    return getClienteById(contratoActual.cliente_id);
  }, [contratoActual]);

  const vendedorResponsable = useMemo(() => {
    if (!lote?.vendedor_responsable_id) return null;
    return getVendedorById(lote.vendedor_responsable_id);
  }, [lote?.vendedor_responsable_id]);

  const handleVolver = () => {
    router.push(`/loteParaTodosMock/emprendimientos/${id}`);
  };

  const handleVerMasterplan = () => {
    router.push(`/loteParaTodosMock/emprendimientos/${id}/masterplan?lote=${lote?.id}`);
  };

  const handleOpenEdicion = () => setIsDrawerOpen(true);
  const handleOpenReserva = () => setIsReservaDialogOpen(true);

  const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const handleGuardarLote = async (loteActualizado) => {
    setLote((prev) => ({
      ...prev,
      ...loteActualizado
    }));
    setSnackbar({ open: true, severity: 'success', message: 'Lote actualizado en el mock.' });
  };

  const handleReservaCreada = (ventaData) => {
    setLote((prev) => ({
      ...prev,
      condicion_lote: ventaData.nueva_condicion_lote,
      fecha_venta: ventaData.tipo_operacion === 'reservado' ? ventaData.fecha_venta?.toISOString?.() || new Date().toISOString() : prev.fecha_venta
    }));

    setContratos((prev) => [
      {
        id: Date.now(),
        lote_id: lote?.id,
        cliente_id: ventaData.cliente?.id || null,
        cliente_inline: ventaData.cliente,
        vendedor_id: ventaData.vendedor_id,
        estado: ventaData.tipo_operacion === 'pre_reservado' ? 'RESERVADO' : 'ACTIVO',
        fecha_contrato: ventaData.fecha_venta?.toISOString?.() || new Date().toISOString(),
        precio_acordado: ventaData.precio_final,
        entrega_inicial: ventaData.monto_seña,
        saldo_pendiente: ventaData.precio_final - ventaData.monto_seña,
        observaciones: ventaData.observaciones_venta || 'Operación registrada desde la ficha L1.'
      },
      ...prev
    ]);

    setIsReservaDialogOpen(false);
    setSnackbar({ open: true, severity: 'success', message: 'Reserva/Venta registrada (mock).' });
  };

  const getClienteResumen = (contrato) => {
    const cliente = contrato.cliente_id ? getClienteById(contrato.cliente_id) : null;
    if (cliente) {
      return {
        nombre: `${cliente.nombre} ${cliente.apellido}`,
        contacto: cliente.email,
        telefono: cliente.telefono
      };
    }

    if (contrato.cliente_inline) {
      const inline = contrato.cliente_inline;
      return {
        nombre: `${inline.nombre} ${inline.apellido}`,
        contacto: inline.email,
        telefono: inline.telefono
      };
    }

    return {
      nombre: 'Cliente sin registrar',
      contacto: '—',
      telefono: '—'
    };
  };

  if (!router.isReady) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </LoteParaTodosLayout>
    );
  }

  if (!emprendimiento) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Alert severity="error" sx={{ m: 3 }}>
          Emprendimiento no encontrado
        </Alert>
      </LoteParaTodosLayout>
    );
  }

  if (!lote || lote.emprendimiento_id !== emprendimiento.id) {
    return (
      <LoteParaTodosLayout currentModule="emprendimientos">
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="warning">
            No pudimos encontrar el lote solicitado dentro del emprendimiento seleccionado.
          </Alert>
          <Button sx={{ mt: 3 }} variant="contained" onClick={handleVolver} startIcon={<ArrowBackIcon />}>
            Volver al emprendimiento
          </Button>
        </Container>
      </LoteParaTodosLayout>
    );
  }

  const clienteResumen = contratoActual ? getClienteResumen(contratoActual) : null;

  const mostrarAlertas = lote.estado_legal !== ESTADO_LEGAL.NORMAL || lote.condicion_lote === CONDICION_LOTE.NO_A_LA_VENTA;

  return (
    <LoteParaTodosLayout currentModule="emprendimientos" pageTitle={`Lote ${lote.numero}`}>
      <Head>
        <title>Lote {lote.numero} - {emprendimiento.nombre}</title>
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack spacing={1}>
              <Breadcrumbs>
                <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={handleVolver}>
                  Emprendimiento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={handleVerMasterplan}>
                  Masterplan
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Lote {lote.numero}
                </Typography>
              </Breadcrumbs>
              <Typography variant="h4" fontWeight={700}>
                Lote {lote.numero} • Manzana {lote.manzana}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {emprendimiento.nombre} • {emprendimiento.ciudad}, {emprendimiento.provincia}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Chip label={CONDICION_LOTE_LABELS[lote.condicion_lote]} color={CONDICION_LOTE_COLORS[lote.condicion_lote]} />
                <Chip label={ESTADO_LEGAL_LABELS[lote.estado_legal]} color={ESTADO_LEGAL_COLORS[lote.estado_legal]} variant="outlined" />
                <Chip label={SITUACION_FISICA_LABELS[lote.situacion_fisica]} color={SITUACION_FISICA_COLORS[lote.situacion_fisica]} variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<MapIcon />} onClick={handleVerMasterplan}>
                  Ver en masterplan
                </Button>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenEdicion}>
                  Editar Lote
                </Button>
                {[CONDICION_LOTE.DISPONIBLE, CONDICION_LOTE.PRE_RESERVADO].includes(lote.condicion_lote) && (
                  <Button variant="contained" onClick={handleOpenReserva}>
                    Nueva Reserva/Venta
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>

          {mostrarAlertas && (
            <Alert severity="warning" icon={<WarningIcon fontSize="small" />}>
              Este lote tiene observaciones activas: estado legal {ESTADO_LEGAL_LABELS[lote.estado_legal]} o condición {CONDICION_LOTE_LABELS[lote.condicion_lote]}.
            </Alert>
          )}
        </Stack>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Superficie
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {lote.superficie} m²
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Manzana {lote.manzana}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Precio base
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {formatCurrency(lote.precio_base, emprendimiento.moneda_principal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Según catálogo oficial
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Última operación
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {contratoActual ? contratoActual.estado : 'Sin datos'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {contratoActual ? formatDate(contratoActual.fecha_contrato) : 'No hay contratos'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Responsable comercial
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {vendedorResponsable ? `${vendedorResponsable.nombre} ${vendedorResponsable.apellido}` : 'Sin asignar'}
                </Typography>
                {vendedorResponsable && (
                  <Typography variant="caption" color="text.secondary">
                    {vendedorResponsable.email}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <LoteInfoExtendida
          lote={lote}
          emprendimiento={emprendimiento}
          onNuevaReserva={handleOpenReserva}
          onEditarLote={handleOpenEdicion}
        />

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Historial comercial
                </Typography>
              </Stack>
              {contratos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Todavía no hay contratos asociados a este lote.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Línea de tiempo</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Vendedor</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell align="right">Saldo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contratos.map((contrato) => {
                      const cliente = getClienteResumen(contrato);
                      return (
                        <TableRow key={contrato.id} hover>
                          <TableCell>{formatDate(contrato.fecha_contrato)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {cliente.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cliente.contacto}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={contrato.estado}
                              size="small"
                              color={CONTRATO_COLOR_MAP[contrato.estado] || 'default'}
                            />
                          </TableCell>
                          <TableCell>{contrato.vendedor_id || '—'}</TableCell>
                          <TableCell align="right">{formatCurrency(contrato.precio_acordado)}</TableCell>
                          <TableCell align="right">{formatCurrency(contrato.saldo_pendiente)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <PeopleIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Cliente actual
                  </Typography>
                </Stack>
                {clienteResumen ? (
                  <Stack spacing={1}>
                    <Typography variant="body1" fontWeight={600}>
                      {clienteResumen.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {clienteResumen.contacto}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {clienteResumen.telefono}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Estado del contrato
                    </Typography>
                    <Chip
                      label={contratoActual?.estado || 'Sin contrato'}
                      color={CONTRATO_COLOR_MAP[contratoActual?.estado] || 'default'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Último movimiento: {formatDate(contratoActual?.fecha_contrato)}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay un cliente asociado actualmente.
                  </Typography>
                )}
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <EventIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Recordatorios operativos
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    • Revisar documentación municipal antes del {formatDate(emprendimiento.fecha_ultima_actualizacion)}.
                  </Typography>
                  <Typography variant="body2">
                    • Confirmar estado físico con obra cada 15 días.
                  </Typography>
                  <Typography variant="body2">
                    • Coordinar visita comercial para leads activos.
                  </Typography>
                </Stack>
              </Paper>

              <Paper sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <MoneyIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Resumen económico
                  </Typography>
                </Stack>
                {contratoActual ? (
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Precio acordado: {formatCurrency(contratoActual.precio_acordado)}
                    </Typography>
                    <Typography variant="body2">
                      Seña / entrega: {formatCurrency(contratoActual.entrega_inicial)}
                    </Typography>
                    <Typography variant="body2">
                      Saldo pendiente: {formatCurrency(contratoActual.saldo_pendiente)}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    El lote no posee reservas ni contratos registrados.
                  </Typography>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <LoteFormDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lote={lote}
        emprendimientoId={emprendimiento.id}
        onSave={handleGuardarLote}
      />

      <NuevaReservaDialog
        open={isReservaDialogOpen}
        onClose={() => setIsReservaDialogOpen(false)}
        lote={lote}
        emprendimiento={emprendimiento}
        onReservaCreada={handleReservaCreada}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LoteParaTodosLayout>
  );
};

export default LoteDetallePage;
