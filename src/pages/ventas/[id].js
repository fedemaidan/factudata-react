/**
 * Detalle de venta (vertical corralón) — header unificado.
 *
 * Muestra las dos dimensiones (entrega y cobro), el avance de cada una y las
 * acciones disponibles: registrar entrega y cancelar. Los cobros se registran
 * desde el flujo de cobros de cliente (imputan a esta venta).
 * Ver docs/corralones/02-modelo-datos.md §Venta.
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
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Checkbox,
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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ventaService from 'src/services/ventaService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

const TIPO_LABEL = {
  acopio: 'Acopio',
  contra_entrega: 'Contra entrega',
  cc: 'Cuenta corriente',
  contado: 'Contado',
};
const ENTREGA_COLOR = { pendiente: 'warning', parcial: 'info', entregado: 'success', na: 'default' };
const COBRO_COLOR = { pendiente: 'warning', parcial: 'info', pagado: 'success' };
const ENTREGA_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', entregado: 'Entregado', na: 'N/A' };
const COBRO_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' };

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-AR');
  } catch {
    return '—';
  }
}

function DimensionCard({ titulo, estado, color, label, monto, total, moneda }) {
  const pct = total > 0 ? Math.min(100, Math.round(((monto || 0) / total) * 100)) : 0;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">{titulo}</Typography>
        <Chip size="small" label={label} color={color} variant="outlined" />
      </Stack>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
      <Typography variant="body2">
        {formatCurrencyWithCode(monto || 0, moneda)} de {formatCurrencyWithCode(total || 0, moneda)} ({pct}%)
      </Typography>
    </Paper>
  );
}

function PageContent({ empresa }) {
  const router = useRouter();
  const { id } = router.query;
  const empresaId = empresa.id || empresa._id;

  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [entregaOpen, setEntregaOpen] = useState(false);
  const [entregaMonto, setEntregaMonto] = useState('');
  const [entregaTotal, setEntregaTotal] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await ventaService.obtener(empresaId, id);
      setVenta(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [empresaId, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrarEntrega() {
    setBusy(true);
    setError('');
    try {
      await ventaService.registrarEntrega(empresaId, id, {
        total: entregaTotal,
        monto: entregaTotal ? null : Number(entregaMonto) || 0,
      });
      setEntregaOpen(false);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelar() {
    setBusy(true);
    setError('');
    try {
      await ventaService.cancelar(empresaId, id, { motivo: cancelMotivo || null });
      setCancelOpen(false);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Container sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }
  if (!venta) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Venta no encontrada'}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => router.push('/ventas')}>
          Volver
        </Button>
      </Container>
    );
  }

  const puedeEntregar = ['pendiente', 'parcial'].includes(venta.entrega?.estado);
  const puedeCancelar = !venta.cerrada && (venta.cobro?.monto_cobrado || 0) === 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => router.push('/ventas')}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={600}>
          Venta — {TIPO_LABEL[venta.tipo] || venta.tipo}
        </Typography>
        {venta.cerrada && <Chip size="small" color="success" label="Cerrada" sx={{ ml: 1 }} />}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">Cliente</Typography>
            <Typography variant="body1">{venta.cliente_nombre || venta.cliente_id || '—'}</Typography>
          </Grid>
          <Grid item xs={6} sm={2}>
            <Typography variant="caption" color="text.secondary">Fecha</Typography>
            <Typography variant="body1">{fmtDate(venta.fecha)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography variant="body1">{formatCurrencyWithCode(venta.total || 0, venta.moneda)}</Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">Saldo a entregar</Typography>
            <Typography variant="body1">{formatCurrencyWithCode(venta.saldo_a_entregar || 0, venta.moneda)}</Typography>
          </Grid>
          {venta.notas && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">Notas</Typography>
              <Typography variant="body2">{venta.notas}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <DimensionCard
            titulo="Entrega"
            estado={venta.entrega?.estado}
            color={ENTREGA_COLOR[venta.entrega?.estado] || 'default'}
            label={ENTREGA_LABEL[venta.entrega?.estado] || venta.entrega?.estado}
            monto={venta.entrega?.monto_entregado}
            total={venta.total}
            moneda={venta.moneda}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DimensionCard
            titulo="Cobro"
            estado={venta.cobro?.estado}
            color={COBRO_COLOR[venta.cobro?.estado] || 'default'}
            label={COBRO_LABEL[venta.cobro?.estado] || venta.cobro?.estado}
            monto={venta.cobro?.monto_cobrado}
            total={venta.total}
            moneda={venta.moneda}
          />
        </Grid>
      </Grid>

      {Array.isArray(venta.materiales) && venta.materiales.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Productos</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material / descripción</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Entregado</TableCell>
                <TableCell align="right">Precio unit.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {venta.materiales.map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{m.nombre}</TableCell>
                  <TableCell align="right">{m.cantidad}</TableCell>
                  <TableCell align="right">{m.cantidad_entregada || 0}</TableCell>
                  <TableCell align="right">{formatCurrencyWithCode(m.precio_unitario || 0, venta.moneda)}</TableCell>
                  <TableCell align="right">
                    {formatCurrencyWithCode((Number(m.cantidad) || 0) * (Number(m.precio_unitario) || 0), venta.moneda)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {puedeEntregar && (
          <Button variant="contained" startIcon={<LocalShippingIcon />} onClick={() => setEntregaOpen(true)}>
            Registrar entrega
          </Button>
        )}
        {puedeCancelar && (
          <Button color="error" startIcon={<CancelIcon />} onClick={() => setCancelOpen(true)}>
            Cancelar venta
          </Button>
        )}
      </Stack>

      {/* Dialog entrega */}
      <Dialog open={entregaOpen} onClose={() => setEntregaOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Registrar entrega</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox checked={entregaTotal} onChange={(e) => setEntregaTotal(e.target.checked)} />}
            label="Entrega total"
            sx={{ mb: 1 }}
          />
          {!entregaTotal && (
            <TextField
              fullWidth size="small" type="number" label="Monto entregado"
              value={entregaMonto} onChange={(e) => setEntregaMonto(e.target.value)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntregaOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={registrarEntrega} disabled={busy}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog cancelar */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Motivo" multiline minRows={2}
            value={cancelMotivo} onChange={(e) => setCancelMotivo(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={busy}>Volver</Button>
          <Button color="error" variant="contained" onClick={cancelar} disabled={busy}>Cancelar venta</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

const Page = () => {
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
        <title>Detalle de venta</title>
      </Head>
      {empresa ? (
        <PageContent empresa={empresa} />
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
