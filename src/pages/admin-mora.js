import { useEffect, useState, useCallback, Fragment } from 'react';
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
  Grid,
  IconButton,
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';
import FichaComercialDrawer from 'src/components/admin/FichaComercialDrawer';

const fmtMoney = (n, mon = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ${mon}`);
// Fecha pura 'YYYY-MM-DD' → 'dd/MM/yyyy' sin conversión de zona horaria (T6b).
const fmtFechaPura = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).split('-');
  return d ? `${d}/${m}/${y}` : s;
};

const ESTADO_CHIP = {
  vencido: { label: 'Vencido', color: 'error' },
  pago_parcial: { label: 'Pago parcial', color: 'warning' },
};

const AdminMora = () => {
  const [data, setData] = useState({ total: 0, total_mas_de_un_mes: 0, clientes_con_deuda: 0, clientes: [], corte: null });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState({});
  const [fichaId, setFichaId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setData(await adminSuscripcionService.mora());
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al cargar la deuda', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const clientes = (data.clientes || []).filter(
    (c) => !q || (c.empresa_nombre || '').toLowerCase().includes(q.toLowerCase()),
  );

  const KPIS = [
    { k: 'Clientes con deuda', v: data.clientes_con_deuda || 0, c: 'text.primary' },
    { k: 'Deuda total', v: fmtMoney(data.total), c: 'error.main' },
    { k: 'Deuda con +1 mes de atraso', v: fmtMoney(data.total_mas_de_un_mes), c: 'error.main' },
  ];

  return (
    <>
      <Head><title>Deuda / Mora · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <div>
              <Typography variant="h4">Deuda / Mora</Typography>
              <Typography variant="body2" color="text.secondary">
                Deuda vencida hasta {data.corte ? fmtFechaPura(data.corte) : 'fin del mes anterior'} (no incluye el mes corriente).
              </Typography>
            </div>

            <Grid container spacing={2}>
              {KPIS.map((m) => (
                <Grid item xs={12} sm={4} key={m.k}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">{m.k}</Typography>
                    <Typography variant="h5" sx={{ color: m.c }}>{m.v}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TextField
              size="small" placeholder="Buscar cliente" value={q} sx={{ maxWidth: 320 }}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />

            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell>Cliente</TableCell>
                    <TableCell align="right">Deuda total</TableCell>
                    <TableCell align="right">+1 mes</TableCell>
                    <TableCell align="center">Períodos</TableCell>
                    <TableCell align="center">MP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && [...Array(6)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton height={28} /></TableCell></TableRow>
                  ))}
                  {!loading && clientes.map((c) => (
                    <Fragment key={c.empresa_id}>
                      <TableRow hover>
                        <TableCell padding="checkbox">
                          <IconButton size="small" onClick={() => toggle(c.empresa_id)}>
                            {expanded[c.empresa_id] ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text" size="small" sx={{ textTransform: 'none', p: 0, minWidth: 0, fontWeight: 500 }}
                            onClick={() => setFichaId(c.empresa_id)}
                          >
                            {c.empresa_nombre}
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error.main" fontWeight={600}>{fmtMoney(c.deuda_total, c.moneda)}</Typography>
                        </TableCell>
                        <TableCell align="right">{c.deuda_mas_de_un_mes ? fmtMoney(c.deuda_mas_de_un_mes, c.moneda) : '—'}</TableCell>
                        <TableCell align="center">{c.periodos?.length || 0}</TableCell>
                        <TableCell align="center">
                          {c.paga_por_mp ? <Chip label={c.mp_name || 'MP'} size="small" color="info" variant="outlined" /> : '—'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded[c.empresa_id] ? undefined : 'none' }}>
                          <Collapse in={!!expanded[c.empresa_id]} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 1.5, pl: 6 }}>
                              <Typography variant="caption" color="text.secondary">Deuda formada por:</Typography>
                              <Table size="small" sx={{ mt: 0.5, maxWidth: 640 }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Período</TableCell>
                                    <TableCell>Vence</TableCell>
                                    <TableCell align="right">Esperado</TableCell>
                                    <TableCell align="right">Saldo</TableCell>
                                    <TableCell>Estado</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(c.periodos || []).map((p, idx) => {
                                    const chip = ESTADO_CHIP[p.estado] || { label: p.estado, color: 'default' };
                                    return (
                                      <TableRow key={`${c.empresa_id}-${p.periodo}-${idx}`}>
                                        <TableCell>
                                          {p.periodo}{p.numero_cuota ? ` · cuota ${p.numero_cuota}` : ''}
                                          {p.mas_de_un_mes && (
                                            <Chip label="+1 mes" size="small" color="error" variant="outlined"
                                              sx={{ ml: 0.5, height: 18, '& .MuiChip-label': { px: 0.6, fontSize: 10 } }} />
                                          )}
                                        </TableCell>
                                        <TableCell>{fmtFechaPura(p.fecha_vencimiento_str)}</TableCell>
                                        <TableCell align="right">{fmtMoney(p.esperado, c.moneda)}</TableCell>
                                        <TableCell align="right">{fmtMoney(p.saldo, c.moneda)}</TableCell>
                                        <TableCell><Chip label={chip.label} size="small" color={chip.color} variant="outlined" /></TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  ))}
                  {!loading && clientes.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay clientes con deuda vencida. 🎉</Typography>
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

AdminMora.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminMora;
