/**
 * Listado de ventas contra entrega (Fase 5 vertical corralón).
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
import AddIcon from '@mui/icons-material/Add';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import ventaContraEntregaService from 'src/services/ventaContraEntregaService';
import clienteService from 'src/services/clienteService';
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

function PageContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;
  const { sucursalId } = useSucursalContext();

  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPago, setFiltroPago] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, cs] = await Promise.all([
        ventaContraEntregaService.listar(empresaId, {
          sucursal_id: sucursalId || undefined,
          estado: filtroEstado || undefined,
          estado_pago: filtroPago || undefined,
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
  }, [empresaId, sucursalId, filtroEstado, filtroPago, filtroCliente]);

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
        <Typography variant="h5" fontWeight={600}>
          Ventas contra entrega
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/ventas-contra-entrega/nuevo')}
        >
          Nuevo pedido
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado entrega</InputLabel>
              <Select
                label="Estado entrega"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="PARCIALMENTE_ENTREGADO">Parcial</MenuItem>
                <MenuItem value="ENTREGADO">Entregado</MenuItem>
                <MenuItem value="CANCELADA">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado pago</InputLabel>
              <Select
                label="Estado pago"
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="PARCIAL">Parcial</MenuItem>
                <MenuItem value="PAGADO">Pagado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select
                label="Cliente"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {clientes.map((c) => (
                  <MenuItem key={c._id || c.id} value={c._id || c.id}>
                    {c.nombre}
                  </MenuItem>
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
              No hay ventas registradas con esos filtros.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha entrega</TableCell>
                <TableCell align="right"># materiales</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Entrega</TableCell>
                <TableCell>Pago</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {ventas.map((v) => {
                const c = clientesById[v.cliente_id];
                const fechaEnt = v.fecha_entrega_estimada
                  ? new Date(v.fecha_entrega_estimada).toLocaleDateString('es-AR')
                  : '—';
                return (
                  <TableRow key={v._id} hover>
                    <TableCell>{c?.nombre || v.cliente_nombre || v.cliente_id || '—'}</TableCell>
                    <TableCell>{fechaEnt}</TableCell>
                    <TableCell align="right">{v.n_materiales || 0}</TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(v.total || 0)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={v.estado}
                        color={ESTADO_ENTREGA_COLOR[v.estado] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={v.estado_pago}
                        color={ESTADO_PAGO_COLOR[v.estado_pago] || 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => router.push(`/ventas-contra-entrega/${v._id}`)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
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
        <title>Ventas contra entrega</title>
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
