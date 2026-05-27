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
import PaymentsIcon from '@mui/icons-material/Payments';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import acopioService from 'src/services/acopioService';
import ventaContraEntregaService from 'src/services/ventaContraEntregaService';
import { formatCurrencyWithCode } from 'src/utils/formatters';

/**
 * Dashboard de corralón. Inspirado en `propuestas/mock-corralones-demo.html`,
 * pero usa el design system existente. No es pixel-perfect: prioriza tres
 * bloques (métricas top, acopios activos, CC pendiente con CTA "Cobrar").
 */

function MetricCard({ icon, label, value, color = 'text.primary' }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
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
  const empresaId = empresa?.id;
  const { sucursalId } = useSucursalContext();

  const [clientes, setClientes] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [acopios, setAcopios] = useState([]);
  const [ventasCE, setVentasCE] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const [cl, res, acs, vces] = await Promise.all([
        clienteService.getByEmpresa(empresaId).catch(() => []),
        clienteService.getResumenFinanciero(empresaId).catch(() => []),
        acopioService.getByEmpresa
          ? acopioService.getByEmpresa(empresaId).catch(() => [])
          : Promise.resolve([]),
        ventaContraEntregaService
          .listar(empresaId, { sucursal_id: sucursalId || undefined })
          .catch(() => []),
      ]);
      setClientes(cl || []);
      setResumen(res || []);
      setAcopios(acs || []);
      setVentasCE(vces || []);
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

  // Métricas ventas contra entrega
  const ventasPendEntregar = useMemo(
    () => ventasCE.filter((v) => ['PENDIENTE', 'PARCIALMENTE_ENTREGADO'].includes(v.estado)),
    [ventasCE]
  );
  const ventasPendCobrar = useMemo(
    () => ventasCE.filter((v) => v.estado_pago !== 'PAGADO' && v.estado !== 'CANCELADA'),
    [ventasCE]
  );
  const ventasCerradasMes = useMemo(() => {
    const ahora = new Date();
    return ventasCE.filter((v) => {
      if (v.estado !== 'ENTREGADO' || v.estado_pago !== 'PAGADO') return false;
      const f = v.pagado_at ? new Date(v.pagado_at) : null;
      if (!f) return false;
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }).length;
  }, [ventasCE]);
  const proximasEntregas = useMemo(
    () =>
      ventasPendEntregar
        .slice()
        .sort((a, b) => {
          const fa = a.fecha_entrega_estimada ? new Date(a.fecha_entrega_estimada).getTime() : Infinity;
          const fb = b.fecha_entrega_estimada ? new Date(b.fecha_entrega_estimada).getTime() : Infinity;
          return fa - fb;
        })
        .slice(0, 5),
    [ventasPendEntregar]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          Dashboard corralón
        </Typography>
        {sucursalId && (
          <Chip label="Filtrado por sucursal" size="small" color="primary" variant="outlined" />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            icon={<InventoryIcon />}
            label="Acopios activos"
            value={acopiosFiltrados.length}
          />
        </Grid>
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
            label="Vencidas"
            value={vencidas}
            color={vencidas > 0 ? 'error.main' : 'text.primary'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Acopios activos
          </Typography>
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
                      <TableCell>{a.contraparte_nombre || a.proveedor_nombre || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={a.contraparte_rol === 'cliente' ? 'Cliente' : 'Proveedor'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrencyWithCode(a.saldo || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Cuenta corriente pendiente
          </Typography>
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
                        <TableCell>{c?.nombre || r.cliente_id}</TableCell>
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
                              router.push(
                                `/cobros-cliente/nuevo?cliente=${r.cliente_id}`
                              )
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
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          Pedidos contra entrega
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <MetricCard
              icon={<InventoryIcon />}
              label="Pendientes de entregar"
              value={ventasPendEntregar.length}
              color="warning.main"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MetricCard
              icon={<AttachMoneyIcon />}
              label="Pendientes de cobrar"
              value={ventasPendCobrar.length}
              color="warning.main"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <MetricCard
              icon={<PaymentsIcon />}
              label="Cerrados este mes"
              value={ventasCerradasMes}
              color="success.main"
            />
          </Grid>
        </Grid>

        <Paper variant="outlined">
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Próximas entregas
            </Typography>
            <Button size="small" onClick={() => router.push('/ventas-contra-entrega')}>
              Ver todos
            </Button>
          </Box>
          {proximasEntregas.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No hay pedidos pendientes.
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Fecha entrega</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Entrega</TableCell>
                  <TableCell>Pago</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proximasEntregas.map((v) => (
                  <TableRow
                    key={v._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/ventas-contra-entrega/${v._id}`)}
                  >
                    <TableCell>{v.cliente_nombre || v.cliente_id}</TableCell>
                    <TableCell>
                      {v.fecha_entrega_estimada
                        ? new Date(v.fecha_entrega_estimada).toLocaleDateString('es-AR')
                        : '—'}
                    </TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(v.total || 0)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={v.estado} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={v.estado_pago} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
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
