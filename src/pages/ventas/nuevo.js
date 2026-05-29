/**
 * Nueva venta (vertical corralón) — wizard unificado.
 *
 * Paso 1: elegir tipo (acopio / contra entrega / cuenta corriente / contado).
 * Paso 2: completar los campos propios del tipo y crear.
 * Cada tipo delega en su endpoint de ventaService. Ver docs/corralones/04-endpoints.md.
 */
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
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
import ventaService from 'src/services/ventaService';

const TIPOS = [
  { key: 'acopio', titulo: 'Acopio', desc: 'El cliente acopia mercadería; se desacopia con remitos.' },
  { key: 'contra_entrega', titulo: 'Contra entrega', desc: 'Pedido que se entrega y se cobra contra entrega.' },
  { key: 'cc', titulo: 'Cuenta corriente', desc: 'Venta a crédito; se cobra luego con cobros/plan.' },
  { key: 'contado', titulo: 'Contado', desc: 'Entrega y cobro inmediatos.' },
];

function FormContent({ empresa }) {
  const router = useRouter();
  const empresaId = empresa.id || empresa._id;
  const { sucursalId: sucursalGlobal } = useSucursalContext();

  const [tipo, setTipo] = useState(router.query.tipo || '');
  const [clientes, setClientes] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [sucursalSel, setSucursalSel] = useState('');
  const [fecha, setFecha] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [totalManual, setTotalManual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cobrado, setCobrado] = useState(true);
  const [notas, setNotas] = useState('');

  // Materiales (solo contra_entrega)
  const [items, setItems] = useState([{ material_id: '', nombre: '', cantidad: 1, precio_unitario: 0 }]);
  const [matOptions, setMatOptions] = useState({});
  const [matLoading, setMatLoading] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    clienteService.getByEmpresa(empresaId).then((c) => setClientes(c || []));
    sucursalService?.getByEmpresa?.(empresaId)?.then?.((s) => setSucursales(s || [])).catch?.(() => {});
  }, [empresaId]);

  useEffect(() => {
    if (sucursalGlobal && !sucursalSel) setSucursalSel(sucursalGlobal);
  }, [sucursalGlobal, sucursalSel]);

  const totalItems = useMemo(
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

  const baseValido = clienteSel != null;

  async function submit() {
    setError('');
    if (!clienteSel) {
      setError('Seleccioná un cliente');
      return;
    }
    const cliente_id = clienteSel._id || clienteSel.id;
    const sucursal_id = sucursalSel || null;
    setSubmitting(true);
    try {
      let res;
      if (tipo === 'contra_entrega') {
        const matsValid = items.filter((it) => it.nombre && Number(it.cantidad) > 0);
        if (matsValid.length === 0) {
          setError('Agregá al menos un material con cantidad');
          setSubmitting(false);
          return;
        }
        res = await ventaService.crearContraEntrega(empresaId, {
          cliente_id,
          sucursal_id,
          fecha: fecha || null,
          fecha_entrega_estimada: fechaEntrega || null,
          moneda,
          notas: notas || null,
          materiales: matsValid.map((it) => ({
            material_id: it.material_id || null,
            nombre: it.nombre,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario) || 0,
          })),
        });
      } else {
        const total = Number(totalManual);
        if (!Number.isFinite(total) || total < 0) {
          setError('Ingresá un total válido');
          setSubmitting(false);
          return;
        }
        const common = { cliente_id, sucursal_id, fecha: fecha || null, total, moneda, notas: notas || null };
        if (tipo === 'acopio') {
          res = await ventaService.crearAcopio(empresaId, { ...common, codigo: codigo || null, descripcion: descripcion || null });
        } else if (tipo === 'cc') {
          res = await ventaService.crearCC(empresaId, common);
        } else if (tipo === 'contado') {
          res = await ventaService.crearContado(empresaId, { ...common, cobrado });
        }
      }
      const ventaId = res?.venta?._id;
      router.push(ventaId ? `/ventas/${ventaId}` : '/ventas');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Paso 1: elegir tipo ────────────────────────────────────────────────────
  if (!tipo) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.push('/ventas')}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" fontWeight={600}>Nueva venta — elegí el tipo</Typography>
        </Stack>
        <Grid container spacing={2}>
          {TIPOS.map((t) => (
            <Grid item xs={12} sm={6} md={3} key={t.key}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea sx={{ p: 2, height: '100%' }} onClick={() => setTipo(t.key)}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>{t.titulo}</Typography>
                  <Typography variant="body2" color="text.secondary">{t.desc}</Typography>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  const tipoMeta = TIPOS.find((t) => t.key === tipo);

  // ── Paso 2: formulario por tipo ────────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => setTipo('')}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={600}>Nueva venta — {tipoMeta?.titulo}</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
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
              <Select label="Sucursal" value={sucursalSel} onChange={(e) => setSucursalSel(e.target.value)}>
                <MenuItem value="">(ninguna)</MenuItem>
                {sucursales.map((s) => (
                  <MenuItem key={s._id || s.id} value={s._id || s.id}>{s.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" label="Fecha" type="date"
              value={fecha} onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Moneda — común a todos */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Moneda</InputLabel>
              <Select label="Moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                <MenuItem value="ARS">ARS</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Total manual — todos menos contra_entrega (que lo deriva de items) */}
          {tipo !== 'contra_entrega' && (
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth size="small" label="Total" type="number"
                value={totalManual} onChange={(e) => setTotalManual(e.target.value)}
              />
            </Grid>
          )}

          {/* Campos propios de acopio */}
          {tipo === 'acopio' && (
            <>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </Grid>
            </>
          )}

          {/* Fecha de entrega — contra_entrega */}
          {tipo === 'contra_entrega' && (
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth size="small" label="Fecha entrega estimada" type="date"
                value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {/* Cobrado — contado */}
          {tipo === 'contado' && (
            <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={cobrado} onChange={(e) => setCobrado(e.target.checked)} />}
                label="Cobrado al crear"
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth size="small" label="Notas" multiline minRows={2}
              value={notas} onChange={(e) => setNotas(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Materiales — solo contra_entrega */}
      {tipo === 'contra_entrega' && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>Materiales</Typography>
            <Button startIcon={<AddIcon />} onClick={addItem} size="small">Agregar</Button>
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
                      freeSolo size="small"
                      options={matOptions[idx] || []}
                      getOptionLabel={(o) => (typeof o === 'string' ? o : o?.nombre || '')}
                      loading={!!matLoading[idx]}
                      onInputChange={(_, v) => { updateItem(idx, { nombre: v }); buscarMateriales(idx, v); }}
                      onChange={(_, v) => {
                        if (v && typeof v === 'object') updateItem(idx, { material_id: v._id || v.id || '', nombre: v.nombre });
                      }}
                      renderInput={(params) => <TextField {...params} placeholder="Buscar material..." />}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={it.cantidad}
                      onChange={(e) => updateItem(idx, { cantidad: e.target.value })} sx={{ width: 80 }} />
                  </TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={it.precio_unitario}
                      onChange={(e) => updateItem(idx, { precio_unitario: e.target.value })} sx={{ width: 110 }} />
                  </TableCell>
                  <TableCell align="right">
                    {((Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => removeItem(idx)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ p: 2, textAlign: 'right' }}>
            <Typography variant="subtitle2">Total: {totalItems.toFixed(2)}</Typography>
          </Box>
        </Paper>
      )}

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button onClick={() => router.push('/ventas')} disabled={submitting}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={submitting || !baseValido}>
          {submitting ? 'Guardando…' : 'Crear venta'}
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
        <title>Nueva venta</title>
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
