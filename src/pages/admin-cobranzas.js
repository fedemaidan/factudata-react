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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import adminSuscripcionService from 'src/services/adminSuscripcionService';
import FichaComercialDrawer from 'src/components/admin/FichaComercialDrawer';

const fmtMoney = (n, mon = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${mon}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
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
const ESTADOS = ['pendiente', 'pago_parcial', 'pagado', 'vencido'];

const MOTIVOS = ['descuento', 'bonificacion', 'comision', 'dif_cambio', 'ajuste', 'otro'];
const MP_FEE = 0.05; // costo Mercado Pago (debe coincidir con SORBY_MP_COMISION del backend)

const SORT = {
  cliente: (r) => (r.empresa_nombre || '').toLowerCase(),
  vencimiento: (r) => (r.fecha_vencimiento ? new Date(r.fecha_vencimiento).getTime() : Infinity),
  esperado: (r) => Number(r.importe_esperado) || 0,
  saldo: (r) => Number(r.saldo) || 0,
  semana: (r) => Number(r.semana_pago) || 0,
  estado: (r) => r.estado || '',
};

const AdminCobranzas = () => {
  const [periodo, setPeriodo] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fSemana, setFSemana] = useState('');
  const [fMp, setFMp] = useState('');
  const [orderBy, setOrderBy] = useState('vencimiento');
  const [order, setOrder] = useState('asc');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fichaId, setFichaId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [anularState, setAnularState] = useState(null);
  const [anularMotivo, setAnularMotivo] = useState('');

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

  const handleSort = (key) => {
    if (orderBy === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(key); setOrder('asc'); }
  };

  const abrirCobro = (row) => {
    setDialog({ row, mode: 'registrar' });
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

  const abrirEditar = (row, cobro) => {
    setDialog({ row, mode: 'editar', cobro });
    setForm({
      tipo: 'parcial',
      monto: String(cobro.importe_cobrado ?? ''),
      caja: cobro.caja_key || 'facu',
      medio_pago: cobro.medio_pago || 'transferencia',
      facturado: !!cobro.facturado,
      factura_a_nombre_de: '',
      motivo_diferencia: '',
    });
    cerrarMenu();
  };

  const abrirMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };
  const cerrarMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const confirmar = async () => {
    const row = dialog.row;
    const monto = round2(form.monto);

    // Modo editar: anula el cobro original y registra uno nuevo con los datos editados.
    if (dialog.mode === 'editar') {
      try {
        setSaving(true);
        await adminSuscripcionService.editarCobro(dialog.cobro.id, {
          importe_cobrado: monto,
          caja: form.caja,
          medio_pago: form.medio_pago,
          facturado: form.facturado,
          factura_a_nombre_de: form.factura_a_nombre_de || null,
        });
        setSnackbar({ open: true, message: 'Cobro actualizado', severity: 'success' });
        setDialog(null);
        await cargar();
      } catch (e) {
        setSnackbar({ open: true, message: e?.response?.data?.error || 'Error al editar el cobro', severity: 'error' });
      } finally {
        setSaving(false);
      }
      return;
    }

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

  const confirmarAnular = async () => {
    try {
      setSaving(true);
      await adminSuscripcionService.anularCobro(anularState.cobro.id, { motivo: anularMotivo || null });
      setSnackbar({ open: true, message: 'Cobro descartado', severity: 'success' });
      setAnularState(null);
      setAnularMotivo('');
      await cargar();
    } catch (e) {
      setSnackbar({ open: true, message: e?.response?.data?.error || 'Error al descartar el cobro', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (q && !(r.empresa_nombre || '').toLowerCase().includes(q.toLowerCase())) return false;
    if (fEstado && r.estado !== fEstado) return false;
    if (fSemana && String(r.semana_pago || '') !== fSemana) return false;
    if (fMp === 'si' && !r.paga_por_mp) return false;
    if (fMp === 'no' && r.paga_por_mp) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const g = SORT[orderBy] || SORT.cliente;
    const av = g(a); const bv = g(b);
    if (av < bv) return order === 'asc' ? -1 : 1;
    if (av > bv) return order === 'asc' ? 1 : -1;
    return 0;
  });

  // Métricas: montos + cantidad de clientes por estado (sobre lo filtrado).
  const tot = filtered.reduce((a, r) => {
    a.esperado += Number(r.importe_esperado) || 0;
    a.cobrado += Number(r.importe_cobrado) || 0;
    if (r.estado === 'vencido') a.vencido += Number(r.saldo) || 0;
    a.count[r.estado] = (a.count[r.estado] || 0) + 1;
    return a;
  }, { esperado: 0, cobrado: 0, vencido: 0, count: {} });

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
      <Head><title>Cobranzas · Sorby Admin</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="h4">Cobranzas</Typography>
              <TextField
                type="month" size="small" label="Período"
                InputLabelProps={{ shrink: true }}
                value={periodo} onChange={(e) => setPeriodo(e.target.value)}
              />
            </Stack>

            {/* Métricas: montos */}
            <Grid container spacing={2}>
              {[
                { k: 'Esperado', v: fmtMoney(round2(tot.esperado)), c: 'text.primary' },
                { k: 'Cobrado', v: fmtMoney(round2(tot.cobrado)), c: 'success.main' },
                { k: 'Vencido', v: fmtMoney(round2(tot.vencido)), c: 'error.main' },
              ].map((m) => (
                <Grid item xs={6} sm={4} key={m.k}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">{m.k}</Typography>
                    <Typography variant="h5" sx={{ color: m.c }}>{m.v}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Métricas: cantidad de clientes por estado */}
            <Grid container spacing={2}>
              {ESTADOS.map((est) => (
                <Grid item xs={6} sm={3} key={est}>
                  <Card
                    variant="outlined"
                    sx={{ p: 2, cursor: 'pointer', borderColor: fEstado === est ? 'primary.main' : undefined }}
                    onClick={() => setFEstado((s) => (s === est ? '' : est))}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Chip label={ESTADO_CHIP[est].label} size="small" color={ESTADO_CHIP[est].color} variant="outlined" />
                      <Typography variant="h5">{tot.count[est] || 0}</Typography>
                    </Stack>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Filtros */}
            <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
              <TextField
                size="small" placeholder="Buscar cliente" value={q}
                onChange={(e) => setQ(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              />
              <TextField {...selProps} label="Estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {ESTADOS.map((est) => <MenuItem key={est} value={est}>{ESTADO_CHIP[est].label}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="Semana" value={fSemana} onChange={(e) => setFSemana(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {[1, 2, 3, 4].map((s) => <MenuItem key={s} value={String(s)}>{s}</MenuItem>)}
              </TextField>
              <TextField {...selProps} label="MP" value={fMp} onChange={(e) => setFMp(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="si">Sí</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              {(q || fEstado || fSemana || fMp) && (
                <Button size="small" onClick={() => { setQ(''); setFEstado(''); setFSemana(''); setFMp(''); }}>Limpiar</Button>
              )}
            </Stack>

            <Card variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <Header id="cliente" label="Cliente" />
                    <TableCell>Período</TableCell>
                    <Header id="vencimiento" label="Vence" />
                    <Header id="semana" label="Sem" align="center" />
                    <Header id="esperado" label="Esperado" align="right" />
                    <Header id="saldo" label="Saldo" align="right" />
                    <Header id="estado" label="Estado" />
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && [...Array(6)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton height={28} /></TableCell></TableRow>
                  ))}
                  {!loading && sorted.map((r, i) => {
                    const chip = ESTADO_CHIP[r.estado] || ESTADO_CHIP.pendiente;
                    const pagado = r.estado === 'pagado';
                    return (
                      <TableRow key={`${r.empresa_id}-${r.periodo}-${i}`} hover>
                        <TableCell>
                          <Button
                            variant="text" size="small" sx={{ textTransform: 'none', p: 0, minWidth: 0, fontWeight: 500, textAlign: 'left' }}
                            onClick={() => setFichaId(r.empresa_id)}
                          >
                            {r.empresa_nombre}
                          </Button>
                        </TableCell>
                        <TableCell>{r.periodo}{r.numero_cuota ? ` · cuota ${r.numero_cuota}` : ''}</TableCell>
                        <TableCell>{fmtDate(r.fecha_vencimiento)}</TableCell>
                        <TableCell align="center">{r.semana_pago || '—'}</TableCell>
                        <TableCell align="right">{fmtMoney(r.importe_esperado, r.moneda)}</TableCell>
                        <TableCell align="right">{fmtMoney(r.saldo, r.moneda)}</TableCell>
                        <TableCell><Chip label={chip.label} size="small" color={chip.color} variant="outlined" /></TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            <Button
                              size="small" variant={pagado ? 'outlined' : 'contained'} startIcon={<PaidIcon />}
                              onClick={() => abrirCobro(r)}
                            >
                              {pagado ? 'Cobrado' : 'Registrar cobro'}
                            </Button>
                            {r.cobros?.length > 0 && (
                              <IconButton size="small" onClick={(e) => abrirMenu(e, r)}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && sorted.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No hay cobranzas para este filtro.</Typography>
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
            <DialogTitle>{dialog.mode === 'editar' ? 'Editar cobro' : 'Registrar cobro'}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {dialog.row.empresa_nombre} · período {dialog.row.periodo}
              </Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {dialog.mode === 'editar' && (
                  <Alert severity="info" sx={{ py: 0 }}>
                    Se reversa el cobro original en la caja y se registra uno nuevo con estos datos (queda auditado).
                  </Alert>
                )}
                {dialog.mode !== 'editar' && (
                  <ToggleButtonGroup
                    exclusive size="small" fullWidth value={form.tipo}
                    onChange={(_, v) => v && setF('tipo', v)}
                  >
                    <ToggleButton value="total">Pago total</ToggleButton>
                    <ToggleButton value="parcial">Pago parcial</ToggleButton>
                  </ToggleButtonGroup>
                )}
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
                  <MenuItem value="lucha">Caja Lucha</MenuItem>
                </TextField>
                <TextField label="Medio de pago" select size="small" fullWidth
                  value={form.medio_pago} onChange={(e) => setF('medio_pago', e.target.value)}>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="mp">Mercado Pago</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
                {form.medio_pago === 'mp' && round2(form.monto) > 0 && (
                  <Alert severity="info" sx={{ py: 0 }}>
                    Costo Mercado Pago ({Math.round(MP_FEE * 100)}%): {fmtMoney(round2(round2(form.monto) * MP_FEE), dialog.row.moneda)} (egreso) · neto en caja {fmtMoney(round2(round2(form.monto) * (1 - MP_FEE)), dialog.row.moneda)}
                  </Alert>
                )}
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
                {dialog.mode !== 'editar' && form.tipo === 'total' && Math.abs(round2(form.monto) - round2(dialog.row.saldo)) > 0.001 && (
                  <TextField label="Motivo de la diferencia" select size="small" fullWidth
                    value={form.motivo_diferencia} onChange={(e) => setF('motivo_diferencia', e.target.value)}>
                    {MOTIVOS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </TextField>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <Button variant="contained" onClick={confirmar} disabled={saving}>
                {dialog.mode === 'editar' ? 'Guardar cambios' : 'Confirmar cobro'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Menú de acciones sobre los cobros del período */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={cerrarMenu}>
        {(menuRow?.cobros || []).flatMap((c) => [
          <MenuItem key={`edit-${c.id}`} onClick={() => abrirEditar(menuRow, c)}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`Editar ${fmtMoney(c.importe_cobrado, menuRow.moneda)}`}
              secondary={fmtDate(c.fecha_cobro)}
            />
          </MenuItem>,
          <MenuItem
            key={`del-${c.id}`}
            onClick={() => { setAnularState({ cobro: c, row: menuRow }); cerrarMenu(); }}
          >
            <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText primary={`Descartar ${fmtMoney(c.importe_cobrado, menuRow.moneda)}`} />
          </MenuItem>,
        ])}
      </Menu>

      {/* Confirmar descarte (anulación) de un cobro */}
      <Dialog open={!!anularState} onClose={() => setAnularState(null)} maxWidth="xs" fullWidth>
        {anularState && (
          <>
            <DialogTitle>Descartar cobro</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {anularState.row.empresa_nombre} · período {anularState.row.periodo} · {fmtMoney(anularState.cobro.importe_cobrado, anularState.row.moneda)}
              </Typography>
              <Alert severity="warning" sx={{ my: 1 }}>
                Se anula el cobro y se genera un movimiento de reverso en la caja. Queda registrado (no se borra).
              </Alert>
              <TextField
                label="Motivo (opcional)" select size="small" fullWidth sx={{ mt: 1 }}
                value={anularMotivo} onChange={(e) => setAnularMotivo(e.target.value)}
              >
                <MenuItem value="">—</MenuItem>
                {MOTIVOS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAnularState(null)}>Cancelar</Button>
              <Button color="error" variant="contained" onClick={confirmarAnular} disabled={saving}>Descartar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <FichaComercialDrawer
        empresaId={fichaId}
        open={!!fichaId}
        onClose={() => setFichaId(null)}
        onSaved={cargar}
      />

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

AdminCobranzas.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default AdminCobranzas;
