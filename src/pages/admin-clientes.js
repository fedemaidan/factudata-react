import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Skeleton,
  Snackbar,
  Alert,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Card,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';
import FichaComercialDrawer from 'src/components/admin/FichaComercialDrawer';

const PERIODICIDADES = ['mensual', 'bimestral', 'semestral', 'anual'];
const fmtMoney = (n, mon = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${mon}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

const SORT = {
  nombre: (r) => (r.nombre || '').toLowerCase(),
  plan: (r) => (r.plan || '').toLowerCase(),
  vendedor: (r) => (r.vendedor || '').toLowerCase(),
  importe: (r) => Number(r.suscripcion?.importe) || 0,
  periodicidad: (r) => r.suscripcion?.periodicidad || '',
  mp: (r) => (r.paga_por_mp ? 1 : 0),
  ime: (r) => Number(r.ingreso_mensual_equivalente) || 0,
  proximo: (r) => (r.proximo_cobro ? new Date(r.proximo_cobro).getTime() : Infinity),
  estado: (r) => r.estado || '',
};

const AdminClientes = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fPlan, setFPlan] = useState('');
  const [fVendedor, setFVendedor] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fMp, setFMp] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fCaja, setFCaja] = useState('');
  const [orderBy, setOrderBy] = useState('nombre');
  const [order, setOrder] = useState('asc');
  const [fichaId, setFichaId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await adminSuscripcionService.maestro());
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al cargar clientes', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleSort = (key) => {
    if (orderBy === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(key); setOrder('asc'); }
  };

  const distinct = (getter) => [...new Set(rows.map(getter).filter(Boolean))].sort();
  const planes = distinct((r) => r.plan);
  const vendedores = distinct((r) => r.vendedor);
  const cajas = distinct((r) => r.suscripcion?.caja_default);

  const filtered = rows.filter((r) => {
    if (q && !(r.nombre || '').toLowerCase().includes(q.toLowerCase())) return false;
    if (fPlan && (r.plan || '') !== fPlan) return false;
    if (fVendedor && (r.vendedor || '') !== fVendedor) return false;
    if (fPeriod && (r.suscripcion?.periodicidad || '') !== fPeriod) return false;
    if (fMp === 'si' && !r.paga_por_mp) return false;
    if (fMp === 'no' && r.paga_por_mp) return false;
    if (fEstado && r.estado !== fEstado) return false;
    if (fCaja && (r.suscripcion?.caja_default || '') !== fCaja) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const g = SORT[orderBy] || SORT.nombre;
    const av = g(a); const bv = g(b);
    if (av < bv) return order === 'asc' ? -1 : 1;
    if (av > bv) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const totalMensual = filtered
    .filter((r) => r.estado === 'activo')
    .reduce((s, r) => s + (Number(r.ingreso_mensual_equivalente) || 0), 0);

  const exportXlsx = () => {
    const data = sorted.map((r) => ({
      Cliente: r.nombre,
      Plan: r.plan || '',
      Vendedor: r.vendedor || '',
      Importe: r.suscripcion?.importe ?? '',
      Moneda: r.suscripcion?.moneda || '',
      Periodicidad: r.suscripcion?.periodicidad || '',
      Cuotas: r.suscripcion?.cantidad_cuotas || '',
      MP: r.paga_por_mp ? 'Sí' : 'No',
      Semana: r.suscripcion?.semana_pago ?? '',
      Caja: r.suscripcion?.caja_default || '',
      'Mensual eq.': r.ingreso_mensual_equivalente ?? '',
      'Próximo cobro': r.proximo_cobro ? new Date(r.proximo_cobro).toLocaleDateString('es-AR') : '',
      'Requiere factura': r.requiere_factura ? 'Sí' : 'No',
      Estado: r.estado,
      empresaId: r.id,
    }));
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Cliente: 'Sin datos' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'clientes-sorby.xlsx');
  };

  const selProps = { size: 'small', select: true, sx: { minWidth: 130 } };

  const Header = ({ id, label, align = 'left' }) => (
    <TableCell align={align} sortDirection={orderBy === id ? order : false}>
      <TableSortLabel active={orderBy === id} direction={orderBy === id ? order : 'asc'} onClick={() => handleSort(id)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <>
      <Head><title>Clientes · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <div>
                <Typography variant="h4">Clientes</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filtered.length} clientes · ingreso mensual equivalente {fmtMoney(totalMensual)} · <em>click en una fila para abrir la ficha</em>
                </Typography>
              </div>
              <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={exportXlsx}>
                Exportar Excel
              </Button>
            </Stack>

            <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
              <TextField
                size="small"
                placeholder="Buscar cliente"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
              <TextField {...selProps} label="Plan" value={fPlan} onChange={(e) => setFPlan(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {planes.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="Vendedor" value={fVendedor} onChange={(e) => setFVendedor(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {vendedores.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="Periodicidad" value={fPeriod} onChange={(e) => setFPeriod(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {PERIODICIDADES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="MP" value={fMp} onChange={(e) => setFMp(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <TextField {...selProps} label="Caja" value={fCaja} onChange={(e) => setFCaja(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {cajas.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="Estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="baja">Baja</MenuItem>
              </TextField>
              {(q || fPlan || fVendedor || fPeriod || fMp || fCaja || fEstado) && (
                <Button size="small" onClick={() => { setQ(''); setFPlan(''); setFVendedor(''); setFPeriod(''); setFMp(''); setFCaja(''); setFEstado(''); }}>
                  Limpiar
                </Button>
              )}
            </Stack>

            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <Header id="nombre" label="Cliente" />
                    <Header id="plan" label="Plan" />
                    <Header id="vendedor" label="Vendedor" />
                    <Header id="importe" label="Importe" align="right" />
                    <Header id="periodicidad" label="Period." />
                    <Header id="mp" label="MP" align="center" />
                    <Header id="ime" label="Mensual eq." align="right" />
                    <Header id="proximo" label="Próx. cobro" />
                    <Header id="estado" label="Estado" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && [...Array(6)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9}><Skeleton height={28} /></TableCell></TableRow>
                  ))}
                  {!loading && sorted.map((r) => (
                    <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setFichaId(r.id)}>
                      <TableCell>{r.nombre}</TableCell>
                      <TableCell>{r.plan || '—'}</TableCell>
                      <TableCell>{r.vendedor || '—'}</TableCell>
                      <TableCell align="right">{fmtMoney(r.suscripcion?.importe, r.suscripcion?.moneda)}</TableCell>
                      <TableCell>{r.suscripcion?.periodicidad || '—'}</TableCell>
                      <TableCell align="center">{r.paga_por_mp ? <Chip label="MP" size="small" color="info" variant="outlined" /> : '—'}</TableCell>
                      <TableCell align="right">{fmtMoney(r.ingreso_mensual_equivalente, r.suscripcion?.moneda)}</TableCell>
                      <TableCell>
                        {fmtDate(r.proximo_cobro)}
                        {r.proximo_cobro_importe ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {fmtMoney(r.proximo_cobro_importe, r.suscripcion?.moneda)}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.estado === 'baja' ? 'Baja' : 'Activo'}
                          size="small"
                          color={r.estado === 'baja' ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && sorted.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay clientes para mostrar.</Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Stack>
        </Container>
      </Box>

      <FichaComercialDrawer
        empresaId={fichaId}
        open={!!fichaId}
        onClose={() => setFichaId(null)}
        onSaved={cargar}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminClientes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminClientes;
