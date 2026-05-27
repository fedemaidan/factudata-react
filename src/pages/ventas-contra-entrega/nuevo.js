/**
 * Nueva venta contra entrega (Fase 5).
 */
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  IconButton,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { useSucursalContext } from 'src/contexts/sucursal-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import clienteService from 'src/services/clienteService';
import materialService from 'src/services/materialService';
import sucursalService from 'src/services/sucursalService';
import ventaContraEntregaService from 'src/services/ventaContraEntregaService';

function FormContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;
  const { sucursalId: sucursalGlobal } = useSucursalContext();

  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [sucursalSel, setSucursalSel] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([
    { material_id: '', nombre: '', cantidad: 1, precio_unitario: 0 },
  ]);
  const [matOptions, setMatOptions] = useState({}); // por fila
  const [matLoading, setMatLoading] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clienteService.getByEmpresa(empresaId).then((c) => setClientes(c || []));
    sucursalService
      ?.getByEmpresa?.(empresaId)
      ?.then?.((s) => setSucursales(s || []))
      .catch?.(() => {});
  }, [empresaId]);

  useEffect(() => {
    if (sucursalGlobal && !sucursalSel) setSucursalSel(sucursalGlobal);
  }, [sucursalGlobal, sucursalSel]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0),
    [items]
  );

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((prev) => [...prev, { material_id: '', nombre: '', cantidad: 1, precio_unitario: 0 }]);
  }

  async function buscarMateriales(idx, q) {
    if (!q || q.length < 2) return;
    setMatLoading((m) => ({ ...m, [idx]: true }));
    try {
      const res = await materialService.searchMateriales(empresaId, q);
      setMatOptions((m) => ({ ...m, [idx]: res || [] }));
    } finally {
      setMatLoading((m) => ({ ...m, [idx]: false }));
    }
  }

  async function submit() {
    setError('');
    if (!clienteSel) {
      setError('Seleccioná un cliente');
      return;
    }
    const matsValid = items.filter((it) => it.nombre && Number(it.cantidad) > 0);
    if (matsValid.length === 0) {
      setError('Agregá al menos un material con cantidad');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        cliente_id: clienteSel._id || clienteSel.id,
        sucursal_id: sucursalSel || null,
        fecha_entrega_estimada: fechaEntrega || null,
        notas: notas || null,
        materiales: matsValid.map((it) => ({
          material_id: it.material_id || null,
          nombre: it.nombre,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario) || 0,
        })),
      };
      const res = await ventaContraEntregaService.crear(empresaId, payload);
      router.push(`/ventas-contra-entrega/${res.solicitud._id}`);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => router.push('/ventas-contra-entrega')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Nueva venta contra entrega
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={clientes}
              getOptionLabel={(o) => o?.nombre || ''}
              value={clienteSel}
              onChange={(_, v) => setClienteSel(v)}
              renderInput={(params) => <TextField {...params} label="Cliente" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sucursal</InputLabel>
              <Select
                label="Sucursal"
                value={sucursalSel}
                onChange={(e) => setSucursalSel(e.target.value)}
              >
                <MenuItem value="">(ninguna)</MenuItem>
                {sucursales.map((s) => (
                  <MenuItem key={s._id || s.id} value={s._id || s.id}>
                    {s.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Fecha entrega estimada"
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Notas"
              multiline
              minRows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Materiales
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addItem} size="small">
            Agregar
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '45%' }}>Material</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell align="right">Precio unitario</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Autocomplete
                    freeSolo
                    size="small"
                    options={matOptions[idx] || []}
                    getOptionLabel={(o) => (typeof o === 'string' ? o : o?.nombre || '')}
                    loading={!!matLoading[idx]}
                    onInputChange={(_, v) => {
                      updateItem(idx, { nombre: v });
                      buscarMateriales(idx, v);
                    }}
                    onChange={(_, v) => {
                      if (v && typeof v === 'object') {
                        updateItem(idx, {
                          material_id: v._id || v.id || '',
                          nombre: v.nombre,
                        });
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Buscar material..." />
                    )}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    value={it.cantidad}
                    onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    type="number"
                    value={it.precio_unitario}
                    onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })}
                    sx={{ width: 110 }}
                  />
                </TableCell>
                <TableCell align="right">
                  {((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)).toFixed(2)}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => removeItem(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ p: 2, textAlign: 'right' }}>
          <Typography variant="subtitle2">Total: {total.toFixed(2)}</Typography>
        </Box>
      </Paper>

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button onClick={() => router.push('/ventas-contra-entrega')} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={submit} disabled={submitting}>
          {submitting ? 'Guardando…' : 'Crear pedido'}
        </Button>
      </Stack>
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
        <title>Nueva venta contra entrega</title>
      </Head>
      {empresa ? (
        <FormContent empresa={empresa} />
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
