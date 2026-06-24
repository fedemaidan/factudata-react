import { useEffect, useState } from 'react';
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
  Chip,
  Skeleton,
  Snackbar,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Card,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';

const fmtMoney = (n, mon = 'ARS') =>
  n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${mon}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

const AdminClientes = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setRows(await adminSuscripcionService.maestro());
      } catch (e) {
        setSnackbar({ open: true, message: 'Error al cargar clientes', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q || (r.nombre || '').toLowerCase().includes(q.toLowerCase()));

  const totalMensual = filtered
    .filter((r) => r.estado === 'activo')
    .reduce((s, r) => s + (Number(r.ingreso_mensual_equivalente) || 0), 0);

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
                  {filtered.length} clientes · ingreso mensual equivalente {fmtMoney(totalMensual)}
                </Typography>
              </div>
              <TextField
                size="small"
                placeholder="Buscar cliente"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
            </Stack>

            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell align="right">Mensual eq.</TableCell>
                    <TableCell>Próximo cobro</TableCell>
                    <TableCell>Factura</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && [...Array(6)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton height={28} /></TableCell></TableRow>
                  ))}
                  {!loading && filtered.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Typography variant="body2">{r.nombre}</Typography>
                        {r.paga_por_mp && <Chip label="MP" size="small" color="info" variant="outlined" sx={{ mt: 0.5 }} />}
                      </TableCell>
                      <TableCell>{r.plan || '—'}</TableCell>
                      <TableCell>{r.vendedor || '—'}</TableCell>
                      <TableCell align="right">{fmtMoney(r.ingreso_mensual_equivalente, r.suscripcion?.moneda)}</TableCell>
                      <TableCell>
                        {fmtDate(r.proximo_cobro)}
                        {r.proximo_cobro_importe ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {fmtMoney(r.proximo_cobro_importe, r.suscripcion?.moneda)}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell>{r.requiere_factura ? 'Sí' : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.estado === 'baja' ? 'Baja' : 'Activo'}
                          size="small"
                          color={r.estado === 'baja' ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          endIcon={<OpenInNewIcon />}
                          href={`/empresa/?empresaId=${r.id}`}
                        >
                          Ficha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay clientes para mostrar.</Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Stack>
        </Container>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminClientes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminClientes;
