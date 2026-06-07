import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import acopioService from 'src/services/acopioService';
import ventaService from 'src/services/ventaService';
import CobroFormDrawer from 'src/components/clientes/CobroFormDrawer';
import ClienteDetalleDrawer from 'src/components/clientes/ClienteDetalleDrawer';
import VentaDetalleDrawer from 'src/components/ventas/VentaDetalleDrawer';
import { formatCurrencyWithCode } from 'src/utils/formatters';

/**
 * Dashboard de corralón. Vista de control diario: métricas de cobranza y
 * entregas, CC pendiente con cobro inline (drawer), ventas por entregar y
 * acopios activos. Usa el módulo unificado de Ventas (/ventas) y el design
 * system existente.
 */

const ENTREGA_COLOR = { pendiente: 'warning', parcial: 'info', entregado: 'success', na: 'default' };
const ENTREGA_LABEL = { pendiente: 'Pendiente', parcial: 'Parcial', entregado: 'Entregado', na: 'N/A' };

function MetricCard({ icon, label, value, color = 'text.primary', onClick }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        ...(onClick ? { cursor: 'pointer', transition: 'box-shadow .15s', '&:hover': { boxShadow: 2 } } : {}),
      }}
      onClick={onClick}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ color }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h6" fontWeight={700} color={color}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function DashboardContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa?.id || empresa?._id;
  const { sucursalId } = useSucursalContext();

  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [acopios, setAcopios] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cobro inline desde la tabla de CC pendiente.
  const [cobroCliente, setCobroCliente] = useState(null);
  // Detalle inline (drawers) sin salir del dashboard.
  const [detalleClienteId, setDetalleClienteId] = useState(null);
  const [detalleVentaId, setDetalleVentaId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [cl, res, acs, vts] = await Promise.all([
        clienteService.getByEmpresa(empresaId).catch(() => []),
        clienteService.getResumenFinanciero(empresaId).catch(() => []),
        acopioService.listarAcopios(empresaId).catch(() => []),
        ventaService.listar(empresaId, { sucursal_id: sucursalId || undefined }).catch(() => []),
      ]);
      setClientes(cl || []);
      setResumen(res || []);
      setAcopios(acs || []);
      setVentas(Array.isArray(vts) ? vts : []);
    } catch {
      setError('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [empresaId, sucursalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrado por sucursal global
  const acopiosFiltrados = useMemo(
    () =>
      (acopios || []).filter((a) => {
        if (a.archivado || a.estado === 'cerrado') return false;
        if (sucursalId && a.sucursal_id && a.sucursal_id !== sucursalId) return false;
        return true;
      }),
    [acopios, sucursalId]
  );

  const clientesById = useMemo(() => {
    const m = {};
    (clientes || []).forEach((c) => {
      m[c._id || c.id] = c;
    });
    return m;
  }, [clientes]);

  const ccPendientes = useMemo(() => {
    return (resumen || [])
      .filter((r) => (r.saldo || 0) > 0.005)
      .filter((r) => {
        if (!sucursalId) return true;
        const c = clientesById[r.cliente_id];
        return !c?.sucursal_id || c.sucursal_id === sucursalId;
      })
      .sort((a, b) => (b.saldo || 0) - (a.saldo || 0));
  }, [resumen, sucursalId, clientesById]);

  const totalCC = ccPendientes.reduce((acc, r) => acc + (r.saldo || 0), 0);
  const vencidas = ccPendientes.filter((r) => r.tiene_vencidas).length;

  // Métricas del módulo unificado de Ventas.
  const ventasPendEntregar = useMemo(
    () => ventas.filter((v) => ['pendiente', 'parcial'].includes(v.entrega?.estado)),
    [ventas]
  );
  const ventasPendCobrar = useMemo(
    () => ventas.filter((v) => v.cobro?.estado && v.cobro.estado !== 'pagado'),
    [ventas]
  );
  const ventadoMes = useMemo(() => {
    const ahora = new Date();
    return ventas
      .filter((v) => {
        const f = v.fecha ? new Date(v.fecha) : null;
        return f && f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  }, [ventas]);
  const proximasEntregas = useMemo(
    () =>
      ventasPendEntregar
        .slice()
        .sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0))
        .slice(0, 6),
    [ventasPendEntregar]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" fontWeight={600}>
            Dashboard corralón
          </Typography>
          {sucursalId && (
            <Chip label="Filtrado por sucursal" size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PaymentsIcon />} onClick={() => router.push('/cobros-cliente')}>
            Cobros
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/ventas?nueva=1')}>
            Nueva venta
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Cobranza */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<AttachMoneyIcon />}
            label="CC pendiente"
            value={formatCurrencyWithCode(totalCC)}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<WarningAmberIcon />}
            label="Clientes con deuda"
            value={ccPendientes.length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<WarningAmberIcon />}
            label="Con vencidas"
            value={vencidas}
            color={vencidas > 0 ? 'error.main' : 'text.primary'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<InventoryIcon />}
            label="Acopios activos"
            value={acopiosFiltrados.length}
          />
        </Grid>
      </Grid>

      {/* Ventas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <MetricCard
            icon={<ReceiptLongIcon />}
            label="Vendido este mes"
            value={formatCurrencyWithCode(ventadoMes)}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            icon={<LocalShippingIcon />}
            label="Por entregar"
            value={ventasPendEntregar.length}
            color={ventasPendEntregar.length > 0 ? 'warning.main' : 'text.primary'}
            onClick={() => router.push('/ventas?estado_entrega=pendiente')}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <MetricCard
            icon={<PaymentsIcon />}
            label="Por cobrar"
            value={ventasPendCobrar.length}
            color={ventasPendCobrar.length > 0 ? 'warning.main' : 'text.primary'}
            onClick={() => router.push('/ventas?estado_cobro=pendiente')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Cuenta corriente pendiente con cobro inline */}
        <Grid item xs={12} md={7}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Cuenta corriente pendiente
            </Typography>
            <Button size="small" onClick={() => router.push('/clientes')}>
              Ver clientes
            </Button>
          </Stack>
          <Paper variant="outlined">
            {loading ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : ccPendientes.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Todos los clientes al día.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell>Cliente</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ccPendientes.slice(0, 10).map((r) => {
                    const c = clientesById[r.cliente_id];
                    return (
                      <TableRow key={r.cliente_id} hover>
                        <TableCell
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setDetalleClienteId(r.cliente_id)}
                        >
                          {c?.nombre || r.cliente_id}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={r.tiene_vencidas ? 'error.main' : 'warning.main'}
                          >
                            {formatCurrencyWithCode(r.saldo || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PaymentsIcon />}
                            onClick={() =>
                              setCobroCliente({ _id: r.cliente_id, nombre: c?.nombre || r.cliente_id })
                            }
                          >
                            Cobrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Ventas por entregar */}
        <Grid item xs={12} md={5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Ventas por entregar
            </Typography>
            <Button size="small" onClick={() => router.push('/ventas?estado_entrega=pendiente')}>
              Ver todas
            </Button>
          </Stack>
          <Paper variant="outlined">
            {loading ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : proximasEntregas.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay entregas pendientes.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'background.neutral' }}>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell align="right">Por entregar</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proximasEntregas.map((v) => {
                    const c = clientesById[v.cliente_id];
                    return (
                      <TableRow
                        key={v._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => setDetalleVentaId(String(v._id))}
                      >
                        <TableCell>{c?.nombre || v.cliente_nombre || v.cliente_id}</TableCell>
                        <TableCell>
                          {v.fecha ? new Date(v.fecha).toLocaleDateString('es-AR') : '—'}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrencyWithCode(v.saldo_a_entregar ?? v.total ?? 0, v.moneda)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ENTREGA_LABEL[v.entrega?.estado] || v.entrega?.estado}
                            color={ENTREGA_COLOR[v.entrega?.estado] || 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Acopios activos */}
      <Box sx={{ mt: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Acopios activos
          </Typography>
          <Button size="small" onClick={() => router.push('/acopios')}>
            Ver todos
          </Button>
        </Stack>
        <Paper variant="outlined">
          {loading ? (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : acopiosFiltrados.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No hay acopios activos.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell>Contraparte</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="right">Saldo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {acopiosFiltrados.slice(0, 10).map((a) => (
                  <TableRow key={a._id || a.id} hover>
                    <TableCell>{a.proveedor || a.contraparte_nombre || a.proveedor_nombre || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={a.contraparte_rol === 'cliente' ? 'Cliente' : 'Proveedor'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(a.totalValor ?? a.saldo ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>

      <CobroFormDrawer
        open={Boolean(cobroCliente)}
        cliente={cobroCliente}
        empresaId={empresaId}
        cajas={empresa?.cajas_virtuales || []}
        onClose={() => setCobroCliente(null)}
        onSaved={() => {
          setCobroCliente(null);
          fetchData();
        }}
      />

      <ClienteDetalleDrawer
        open={Boolean(detalleClienteId)}
        clienteId={detalleClienteId}
        empresaId={empresaId}
        esCorralon
        cajas={empresa?.cajas_virtuales || []}
        onClose={() => setDetalleClienteId(null)}
        onChanged={() => fetchData()}
        onEdit={(c) => { setDetalleClienteId(null); router.push(`/clientes?cliente=${c._id || c.id}`); }}
      />

      <VentaDetalleDrawer
        open={Boolean(detalleVentaId)}
        ventaId={detalleVentaId}
        empresaId={empresaId}
        cajas={empresa?.cajas_virtuales || []}
        onClose={() => setDetalleVentaId(null)}
        onChanged={() => fetchData()}
        onEdit={(v) => { setDetalleVentaId(null); router.push(`/ventas?venta=${v._id}`); }}
      />
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
      <DashboardLayout>
        <Head>
          <title>Dashboard Corralón</title>
        </Head>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">Solo disponible para corralones.</Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard Corralón</title>
      </Head>
      {empresa ? (
        <DashboardContent empresa={empresa} />
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
