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
  Chip,
  Skeleton,
  Snackbar,
  Alert,
  Button,
  TextField,
  MenuItem,
  Card,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';

const fmtMoney = (n, mon = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${mon}`);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const ESTADO_CHIP = {
  pagado: { label: 'Pagado', color: 'success' },
  pago_parcial: { label: 'Pago parcial', color: 'warning' },
  pendiente: { label: 'Pendiente', color: 'default' },
  vencido: { label: 'Vencido', color: 'error' },
};

const MOTIVOS = ['descuento', 'bonificacion', 'comision', 'dif_cambio', 'ajuste', 'otro'];

const AdminCobranzas = () => {
  const [periodo, setPeriodo] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState(null); // { row }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setRows(await adminSuscripcionService.cobranzas(periodo));
    } catch (e) {
      setSnackbar({ open: true, message: 'Error al cargar cobranzas', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCobro = (row) => {
    setDialog({ row });
    setForm({
      tipo: 'total',
      monto: String(row.saldo || row.importe_esperado || ''),
      caja: 'facu',
      medio_pago: row.paga_por_mp ? 'mp' : 'transferencia',
      facturado: false,
      factura_a_nombre_de: '',
      motivo_diferencia: '',
    });
  };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const confirmar = async () => {
    const row = dialog.row;
    const monto = round2(form.monto);
    const diff = form.tipo === 'total' && Math.abs(monto - round2(row.saldo)) > 0.001;
    if (diff && !form.motivo_diferencia) {
      setSnackbar({ open: true, message: 'El monto difiere del saldo: indicá un motivo.', severity: 'warning' });
      return;
    }
    try {
      setSaving(true);
      await adminSuscripcionService.registrarCobro({
        empresa_cliente_id: row.empresa_id,
        periodo: row.periodo,
        numero_cuota: row.numero_cuota,
        importe_cobrado: monto,
        importe_esperado: row.importe_esperado,
        moneda: row.moneda,
        caja: form.caja,
        medio_pago: form.medio_pago,
        facturado: form.facturado,
        factura_a_nombre_de: form.factura_a_nombre_de || null,
        motivo_diferencia: diff ? form.motivo_diferencia : null,
      });
      setSnackbar({ open: true, message: 'Cobro registrado', severity: 'success' });
      setDialog(null);
      await cargar();
    } catch (e) {
      setSnackbar({ open: true, message: e?.response?.data?.error || 'Error al registrar el cobro', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const tot = rows.reduce((a, r) => {
    a.esperado += Number(r.importe_esperado) || 0;
    a.cobrado += Number(r.importe_cobrado) || 0;
    if (r.estado === 'vencido') a.vencido += Number(r.saldo) || 0;
    return a;
  }, { esperado: 0, cobrado: 0, vencido: 0 });

  return (
    <>
      <Head><title>Cobranzas · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="h4">Cobranzas</Typography>
              <TextField
                type="month"
                size="small"
                label="Período"
                InputLabelProps={{ shrink: true }}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              />
            </Stack>

            <Grid container spacing={2}>
              {[
                { k: 'Esperado', v: tot.esperado, c: 'text.primary' },
                { k: 'Cobrado', v: tot.cobrado, c: 'success.main' },
                { k: 'Vencido', v: tot.vencido, c: 'error.main' },
              ].map((m) => (
                <Grid item xs={12} sm={4} key={m.k}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">{m.k}</Typography>
                    <Typography variant="h5" sx={{ color: m.c }}>{fmtMoney(round2(m.v))}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell align="right">Esperado</TableCell>
                    <TableCell align="right">Saldo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && [...Array(6)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton height={28} /></TableCell></TableRow>
                  ))}
                  {!loading && rows.map((r, i) => {
                    const chip = ESTADO_CHIP[r.estado] || ESTADO_CHIP.pendiente;
                    const pagado = r.estado === 'pagado';
                    return (
                      <TableRow key={`${r.empresa_id}-${r.periodo}-${i}`} hover>
                        <TableCell>{r.empresa_nombre}</TableCell>
                        <TableCell>{r.periodo}{r.numero_cuota ? ` · cuota ${r.numero_cuota}` : ''}</TableCell>
                        <TableCell align="right">{fmtMoney(r.importe_esperado, r.moneda)}</TableCell>
                        <TableCell align="right">{fmtMoney(r.saldo, r.moneda)}</TableCell>
                        <TableCell><Chip label={chip.label} size="small" color={chip.color} variant="outlined" /></TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PaidIcon />}
                            disabled={pagado}
                            onClick={() => abrirCobro(r)}
                          >
                            {pagado ? 'Cobrado' : 'Registrar cobro'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay cobranzas para este período.</Typography>
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </Stack>
        </Container>
      </Box>

      {/* Modal Registrar cobro */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        {dialog && form && (
          <>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {dialog.row.empresa_nombre} · período {dialog.row.periodo}
              </Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <ToggleButtonGroup
                  exclusive size="small" fullWidth value={form.tipo}
                  onChange={(_, v) => v && setF('tipo', v)}
                >
                  <ToggleButton value="total">Pago total</ToggleButton>
                  <ToggleButton value="parcial">Pago parcial</ToggleButton>
                </ToggleButtonGroup>
                <TextField
                  label="Monto cobrado" type="number" size="small" fullWidth
                  value={form.monto} onChange={(e) => setF('monto', e.target.value)}
                  helperText={`Saldo esperado: ${fmtMoney(dialog.row.saldo, dialog.row.moneda)}`}
                />
                <TextField label="Caja de impacto" select size="small" fullWidth
                  value={form.caja} onChange={(e) => setF('caja', e.target.value)}>
                  <MenuItem value="facu">Caja Facu</MenuItem>
                  <MenuItem value="fede">Caja Fede</MenuItem>
                  <MenuItem value="puente">Caja Puente</MenuItem>
                </TextField>
                <TextField label="Medio de pago" select size="small" fullWidth
                  value={form.medio_pago} onChange={(e) => setF('medio_pago', e.target.value)}>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="mp">Mercado Pago</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
                <Stack direction="row" spacing={2} alignItems="center">
                  <FormControlLabel
                    control={<Switch checked={form.facturado} onChange={(e) => setF('facturado', e.target.checked)} />}
                    label="Facturado"
                  />
                  {form.facturado && (
                    <TextField label="A nombre de" select size="small" sx={{ minWidth: 120 }}
                      value={form.factura_a_nombre_de} onChange={(e) => setF('factura_a_nombre_de', e.target.value)}>
                      <MenuItem value="facu">Facu</MenuItem>
                      <MenuItem value="fede">Fede</MenuItem>
                    </TextField>
                  )}
                </Stack>
                {form.tipo === 'total' && Math.abs(round2(form.monto) - round2(dialog.row.saldo)) > 0.001 && (
                  <TextField label="Motivo de la diferencia" select size="small" fullWidth
                    value={form.motivo_diferencia} onChange={(e) => setF('motivo_diferencia', e.target.value)}>
                    {MOTIVOS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </TextField>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <Button variant="contained" onClick={confirmar} disabled={saving}>Confirmar cobro</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminCobranzas.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminCobranzas;
