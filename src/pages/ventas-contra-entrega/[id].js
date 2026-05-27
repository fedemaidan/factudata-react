/**
 * Detalle de venta contra entrega (Fase 5).
 */
import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventIcon from '@mui/icons-material/Event';
import CancelIcon from '@mui/icons-material/Cancel';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ventaContraEntregaService from 'src/services/ventaContraEntregaService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const ESTADO_ENTREGA_COLOR = {
  PENDIENTE: 'warning',
  PARCIALMENTE_ENTREGADO: 'info',
  ENTREGADO: 'success',
  CANCELADA: 'default',
};
const ESTADO_PAGO_COLOR = {
  PENDIENTE: 'warning',
  PARCIAL: 'info',
  PAGADO: 'success',
};

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('es-AR');
  } catch {
    return String(d);
  }
}

function DetalleContent({ empresa, ventaId }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actMsg, setActMsg] = useState('');

  const [openPagar, setOpenPagar] = useState(false);
  const [openCancelar, setOpenCancelar] = useState(false);
  const [openFecha, setOpenFecha] = useState(false);

  const [cajaId, setCajaId] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('transferencia');
  const [motivoCancel, setMotivoCancel] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const v = await ventaContraEntregaService.obtener(empresaId, ventaId);
      setVenta(v);
      if (v?.fecha_entrega_estimada) {
        setNuevaFecha(new Date(v.fecha_entrega_estimada).toISOString().slice(0, 10));
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [empresaId, ventaId]);

  useEffect(() => {
    if (ventaId) cargar();
  }, [ventaId, cargar]);

  async function accion(fn, msg) {
    setError('');
    try {
      await fn();
      setActMsg(msg);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
  }

  if (loading || !venta) {
    return (
      <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const total = venta.total || 0;
  const entregada = venta.estado === 'ENTREGADO';
  const cancelada = venta.estado === 'CANCELADA';
  const pagada = venta.estado_pago === 'PAGADO';
  const cerrado = entregada && pagada;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => router.push('/ventas-contra-entrega')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Venta #{String(venta._id).slice(-6)}
        </Typography>
        {cerrado && <Chip color="success" label="Círculo cerrado" size="small" />}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {actMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActMsg('')}>
          {actMsg}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Cliente</Typography>
            <Typography>{venta.cliente_nombre || venta.cliente_id}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Sucursal</Typography>
            <Typography>{venta.sucursal_id || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Fecha entrega estimada</Typography>
            <Typography>
              {venta.fecha_entrega_estimada
                ? new Date(venta.fecha_entrega_estimada).toLocaleDateString('es-AR')
                : '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Estado entrega</Typography>
            <Box><Chip
              size="small"
              label={venta.estado}
              color={ESTADO_ENTREGA_COLOR[venta.estado] || 'default'}
            /></Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Estado pago</Typography>
            <Box><Chip
              size="small"
              label={venta.estado_pago}
              color={ESTADO_PAGO_COLOR[venta.estado_pago] || 'default'}
            /></Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography fontWeight={600}>{formatCurrencyWithCode(total)}</Typography>
          </Grid>
          {venta.notas && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Notas</Typography>
              <Typography>{venta.notas}</Typography>
            </Grid>
          )}
          {venta.motivo_cancelacion && (
            <Grid item xs={12}>
              <Alert severity="warning">Cancelada: {venta.motivo_cancelacion}</Alert>
            </Grid>
          )}
        </Grid>
      </Paper>

      {!cancelada && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {!entregada && (
            <Button
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={() =>
                accion(
                  () => ventaContraEntregaService.entregar(empresaId, ventaId, {}),
                  'Marcada como entregada'
                )
              }
            >
              Marcar entregado
            </Button>
          )}
          {!pagada && (
            <Button
              variant="contained"
              color="success"
              startIcon={<PaymentsIcon />}
              onClick={() => {
                setMontoPago(String(total || ''));
                setOpenPagar(true);
              }}
            >
              Marcar pagado
            </Button>
          )}
          <Button startIcon={<EventIcon />} onClick={() => setOpenFecha(true)}>
            Modificar fecha
          </Button>
          <Button color="error" startIcon={<CancelIcon />} onClick={() => setOpenCancelar(true)}>
            Cancelar
          </Button>
        </Stack>
      )}

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Materiales</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Material</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(venta.movimientos || []).map((m) => {
              const cant = Math.abs(Number(m.cantidad) || 0);
              const pu = Number(m.precio_unitario) || 0;
              return (
                <TableRow key={m._id}>
                  <TableCell>{m.nombre_item || m.nombre_material}</TableCell>
                  <TableCell align="right">{cant}</TableCell>
                  <TableCell align="right">{pu.toFixed(2)}</TableCell>
                  <TableCell align="right">{(cant * pu).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={m.estado} variant="outlined" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
          Timeline
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            • Creada {fmtDate(venta.fecha)} {venta.creado_por ? `por ${venta.creado_por}` : ''}
          </Typography>
          {venta.fecha_entrega_real && (
            <Typography variant="body2">
              • Entregada {fmtDate(venta.fecha_entrega_real)}{' '}
              {venta.entregado_por ? `por ${venta.entregado_por}` : ''}
            </Typography>
          )}
          {venta.pagado_at && (
            <Typography variant="body2">
              • Pagada {fmtDate(venta.pagado_at)}{' '}
              {venta.pagado_por ? `por ${venta.pagado_por}` : ''}
            </Typography>
          )}
          {venta.cancelado_at && (
            <Typography variant="body2" color="error">
              • Cancelada {fmtDate(venta.cancelado_at)}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Modal pagar */}
      <Dialog open={openPagar} onClose={() => setOpenPagar(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar cobro</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Caja ID"
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              helperText="ID de la caja donde se acredita el ingreso"
              size="small"
            />
            <TextField
              label="Monto"
              type="number"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
              size="small"
            />
            <Select size="small" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="cheque">Cheque</MenuItem>
              <MenuItem value="otro">Otro</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPagar(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setOpenPagar(false);
              await accion(
                () =>
                  ventaContraEntregaService.pagar(empresaId, ventaId, {
                    caja_id: cajaId || null,
                    monto: Number(montoPago) || null,
                    metodo: metodoPago,
                  }),
                'Cobro registrado'
              );
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal cancelar */}
      <Dialog open={openCancelar} onClose={() => setOpenCancelar(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Motivo"
            multiline
            minRows={2}
            value={motivoCancel}
            onChange={(e) => setMotivoCancel(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelar(false)}>Volver</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setOpenCancelar(false);
              await accion(
                () =>
                  ventaContraEntregaService.cancelar(empresaId, ventaId, {
                    motivo: motivoCancel || null,
                  }),
                'Venta cancelada'
              );
            }}
          >
            Cancelar venta
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal fecha */}
      <Dialog open={openFecha} onClose={() => setOpenFecha(false)} fullWidth maxWidth="xs">
        <DialogTitle>Modificar fecha de entrega</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFecha(false)}>Volver</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setOpenFecha(false);
              await accion(
                () => ventaContraEntregaService.modificarFechaEntrega(empresaId, ventaId, nuevaFecha),
                'Fecha actualizada'
              );
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

const Page = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    getEmpresaDetailsFromUser(user).then(setEmpresa);
  }, [user]);

  if (empresa && empresa.vertical !== 'corralon') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Solo disponible para corralones.</Alert>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Venta contra entrega</title>
      </Head>
      {empresa && id ? (
        <DetalleContent empresa={empresa} ventaId={id} />
      ) : (
        <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      )}
    </>
  );
};

Page.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default Page;
