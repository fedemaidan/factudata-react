/**
 * Listado de cobros de cliente (vertical corralón). Fila → drawer de detalle
 * (con anular). "Nuevo cobro" abre el CobroFormDrawer. Deep-link ?nuevo=1.
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import cobroService from 'src/services/cobroService';
import clienteService from 'src/services/clienteService';
import { formatCurrencyWithCode, formatTimestamp } from 'src/utils/formatters';
import CobroFormDrawer from 'src/components/clientes/CobroFormDrawer';
import CobroDetalleDrawer from 'src/components/clientes/CobroDetalleDrawer';

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', otro: 'Otro' };

function PageContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;

  const [cobros, setCobros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [data, cs] = await Promise.all([
        cobroService.listar(empresaId, { estado: filtroEstado || undefined, cliente_id: filtroCliente || undefined }),
        clienteService.getByEmpresa(empresaId).catch(() => []),
      ]);
      setCobros(Array.isArray(data) ? data : (data?.items || data?.data || []));
      setClientes(Array.isArray(cs) ? cs : []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [empresaId, filtroEstado, filtroCliente]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (router.query?.nuevo) {
      setNuevoOpen(true);
      const { nuevo, ...rest } = router.query;
      router.replace({ pathname: '/cobros-cliente', query: rest }, undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.nuevo]);

  const clientesById = useMemo(() => {
    const m = {};
    clientes.forEach((c) => { m[String(c._id || c.id)] = c; });
    return m;
  }, [clientes]);

  const detalleCliente = useMemo(() => {
    const c = cobros.find((x) => String(x._id) === String(detalleId));
    return c ? (clientesById[String(c.cliente_id)]?.nombre || c.nombre_cliente) : null;
  }, [cobros, detalleId, clientesById]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={600}>Cobros de cliente</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoOpen(true)}>Nuevo cobro</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Cliente</InputLabel>
              <Select label="Cliente" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {clientes.map((c) => <MenuItem key={c._id || c.id} value={c._id || c.id}>{c.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activos</MenuItem>
                <MenuItem value="anulado">Anulados</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
        ) : cobros.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No hay cobros con esos filtros.</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.neutral' }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Método</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell align="right">Sin imputar</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cobros.map((c) => {
                const cli = clientesById[String(c.cliente_id)];
                const anulado = c.estado === 'anulado';
                return (
                  <TableRow key={c._id} hover onClick={() => setDetalleId(c._id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>{formatTimestamp(c.fecha_cobro)}</TableCell>
                    <TableCell>{cli?.nombre || c.nombre_cliente || c.cliente_id || '—'}</TableCell>
                    <TableCell>{METODO_LABEL[c.metodo] || c.metodo || '—'}</TableCell>
                    <TableCell align="right">{formatCurrencyWithCode(c.monto_bruto, c.moneda)}</TableCell>
                    <TableCell align="right">
                      {(Number(c.monto_sin_imputar) || 0) > 0.005 ? formatCurrencyWithCode(c.monto_sin_imputar) : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={anulado ? 'Anulado' : 'Activo'} color={anulado ? 'default' : 'success'} variant="outlined" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      <CobroFormDrawer
        open={nuevoOpen}
        empresaId={empresaId}
        clientes={clientes}
        cajas={empresa?.cajas_virtuales || []}
        onClose={() => setNuevoOpen(false)}
        onSaved={() => cargar()}
      />

      <CobroDetalleDrawer
        open={Boolean(detalleId)}
        empresaId={empresaId}
        cobroId={detalleId}
        clienteNombre={detalleCliente}
        onClose={() => setDetalleId(null)}
        onChanged={() => cargar()}
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
      <Head><title>Cobros de cliente</title></Head>
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
