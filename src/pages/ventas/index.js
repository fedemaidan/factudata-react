/**
 * Listado unificado de ventas (vertical corralón).
 *
 * Una sola página que muestra todos los tipos de venta (acopio, contra entrega,
 * cuenta corriente, contado) con sus dos dimensiones de avance: entrega y cobro.
 * Ver docs/corralones/02-modelo-datos.md §Venta.
 */
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
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ventaService from 'src/services/ventaService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode } from 'src/utils/formatters';
import NuevaVentaDrawer from 'src/components/ventas/NuevaVentaDrawer';
import VentaDetalleDrawer from 'src/components/ventas/VentaDetalleDrawer';

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

function ProgresoCobro({ venta }) {
  const total = Number(venta.total) || 0;
  const cobrado = Number(venta.cobro?.monto_cobrado) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((cobrado / total) * 100)) : 0;
  return (
    <Tooltip title={`${formatCurrencyWithCode(cobrado)} de ${formatCurrencyWithCode(total)}`}>
      <Box sx={{ minWidth: 90 }}>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 1 }} />
        <Typography variant="caption" color="text.secondary">{pct}%</Typography>
      </Box>
    </Tooltip>
  );
}

function PageContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;
  const { sucursalId } = useSucursalContext();

  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEntrega, setFiltroEntrega] = useState('');
  const [filtroCobro, setFiltroCobro] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detalleId, setDetalleId] = useState(null);
  const [ventaEdit, setVentaEdit] = useState(null);

  // Auto-abrir el drawer de alta si llegan con ?nueva=1 (redirect de /ventas/nuevo).
  useEffect(() => {
    if (router.query?.nueva) {
      setDrawerOpen(true);
      const { nueva, ...rest } = router.query;
      router.replace({ pathname: '/ventas', query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.nueva]);

  // Auto-abrir el detalle si llegan con ?venta=<id> (deep-link / redirect de /ventas/[id]).
  useEffect(() => {
    if (router.query?.venta) {
      setDetalleId(String(router.query.venta));
      const { venta, ...rest } = router.query;
      router.replace({ pathname: '/ventas', query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.venta]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, cs] = await Promise.all([
        ventaService.listar(empresaId, {
          sucursal_id: sucursalId || undefined,
          tipo: filtroTipo || undefined,
          estado_entrega: filtroEntrega || undefined,
          estado_cobro: filtroCobro || undefined,
          cliente_id: filtroCliente || undefined,
        }),
        clienteService.getByEmpresa(empresaId).catch(() => []),
      ]);
      setVentas(Array.isArray(data) ? data : []);
      setClientes(Array.isArray(cs) ? cs : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [empresaId, sucursalId, filtroTipo, filtroEntrega, filtroCobro, filtroCliente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const clientesById = useMemo(() => {
    const m = {};
    clientes.forEach((c) => {
      m[c._id || c.id] = c;
    });
    return m;
  }, [clientes]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Ventas</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDrawerOpen(true)}
        >
          Nueva venta
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Entrega</InputLabel>
              <Select label="Entrega" value={filtroEntrega} onChange={(e) => setFiltroEntrega(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="entregado">Entregado</MenuItem>
                <MenuItem value="na">N/A</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Cobro</InputLabel>
              <Select label="Cobro" value={filtroCobro} onChange={(e) => setFiltroCobro(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="parcial">Parcial</MenuItem>
                <MenuItem value="pagado">Pagado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select label="Cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {clientes.map((c) => (
                  <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : ventas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No hay ventas con esos filtros.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Tipo</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Entrega</TableCell>
                <TableCell>Cobro</TableCell>
                <TableCell>Avance cobro</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ventas.map((v) => {
                const c = clientesById[v.cliente_id];
                const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-AR') : '—';
                return (
                  <TableRow
                    key={v._id}
                    hover
                    onClick={() => setDetalleId(v._id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Chip size="small" label={TIPO_LABEL[v.tipo] || v.tipo} variant="filled" />
                    </TableCell>
                    <TableCell>{c?.nombre || v.cliente_nombre || v.cliente_id || '—'}</TableCell>
                    <TableCell>{fecha}</TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(v.total || 0, v.moneda)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ENTREGA_LABEL[v.entrega?.estado] || v.entrega?.estado}
                        color={ENTREGA_COLOR[v.entrega?.estado] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={COBRO_LABEL[v.cobro?.estado] || v.cobro?.estado}
                        color={COBRO_COLOR[v.cobro?.estado] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <ProgresoCobro venta={v} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <NuevaVentaDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setVentaEdit(null); }}
        empresa={empresa}
        ventaEdit={ventaEdit}
        onCreated={(result) => {
          const fueEdicion = Boolean(ventaEdit);
          setVentaEdit(null);
          cargar();
          // Tras editar, reabrir el detalle para ver el cambio aplicado.
          if (fueEdicion && result?._id) setDetalleId(String(result._id));
        }}
      />

      <VentaDetalleDrawer
        open={Boolean(detalleId)}
        ventaId={detalleId}
        empresaId={empresaId}
        onClose={() => setDetalleId(null)}
        onChanged={() => cargar()}
        onEdit={(v) => { setDetalleId(null); setVentaEdit(v); setDrawerOpen(true); }}
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Solo disponible para corralones.</Alert>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Ventas</title>
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
