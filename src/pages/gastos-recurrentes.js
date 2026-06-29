import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import {
  Box, Container, Stack, Typography, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Checkbox, Button, TextField, MenuItem, Card, CardContent, Skeleton, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Grid,
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import gastoRecurrenteService from 'src/services/gastoRecurrenteService';

const PERIODICIDADES = ['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'];
const fmtMoney = (n, m = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${m}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
const ESTADO = {
  pendiente: { label: 'Pendiente', color: 'default' },
  proximo: { label: 'Próximo', color: 'info' },
  vencido: { label: 'Vencido', color: 'error' },
  registrado: { label: 'Registrado', color: 'warning' },
  pagado: { label: 'Pagado', color: 'success' },
};
const FORM_VACIO = {
  concepto: '', nombre_proveedor: '', categoria: '', importe: '', moneda: 'ARS',
  periodicidad: 'mensual', dia_vencimiento: 1, medio_pago: '', observaciones: '',
  fecha_inicio: new Date().toISOString().slice(0, 10), activo: true,
};

const GastosRecurrentes = () => {
  const { user } = useAuthContext();
  const [empresaId, setEmpresaId] = useState(null);
  const [tab, setTab] = useState(0);
  const [aCargar, setACargar] = useState([]);
  const [defs, setDefs] = useState([]);
  const [sugs, setSugs] = useState([]);
  const [sel, setSel] = useState({});
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [defDialog, setDefDialog] = useState(null);   // { form, id? }
  const [regDialog, setRegDialog] = useState(null);   // { row, importe, fecha, estado }

  const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  useEffect(() => { (async () => { const e = await getEmpresaDetailsFromUser(user); setEmpresaId(e?.id || null); })(); }, [user]);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const [ac, df] = await Promise.all([
        gastoRecurrenteService.aCargar(empresaId),
        gastoRecurrenteService.listar(empresaId, {}),
      ]);
      setACargar(ac); setDefs(df);
    } catch (e) { notify('Error al cargar', 'error'); } finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarSugerencias = async () => {
    try { setSugs(await gastoRecurrenteService.sugerencias(empresaId)); }
    catch (e) { notify('Error al cargar sugerencias', 'error'); }
  };
  useEffect(() => { if (tab === 2 && empresaId) cargarSugerencias(); /* eslint-disable-next-line */ }, [tab, empresaId]);

  // ── Registrar ──
  const abrirRegistrar = (row) => setRegDialog({ row, importe: String(row.importe_estandar ?? ''), fecha: new Date().toISOString().slice(0, 10), estado: 'Pagado' });
  const confirmarRegistro = async () => {
    try {
      await gastoRecurrenteService.registrar(empresaId, regDialog.row.gasto_id, {
        periodo: regDialog.row.periodo, importe: Number(regDialog.importe) || 0,
        fecha: regDialog.fecha ? new Date(regDialog.fecha).toISOString() : undefined, estado: regDialog.estado,
      });
      setRegDialog(null); notify('Egreso registrado'); await cargar();
    } catch (e) { notify(e?.response?.data?.error || 'Error al registrar', 'error'); }
  };
  const omitir = async (row) => {
    try { await gastoRecurrenteService.omitir(empresaId, row.gasto_id, row.periodo); notify('Período omitido'); await cargar(); }
    catch (e) { notify('Error al omitir', 'error'); }
  };
  const confirmarSeleccionados = async () => {
    const items = aCargar.filter((r) => sel[`${r.gasto_id}|${r.periodo}`]).map((r) => ({ gasto_id: r.gasto_id, periodo: r.periodo, importe: r.importe_estandar }));
    if (!items.length) return;
    try { const res = await gastoRecurrenteService.confirmarLote(empresaId, items); const ok = res.filter((x) => x.ok).length; notify(`${ok}/${items.length} registrados`); setSel({}); await cargar(); }
    catch (e) { notify('Error al confirmar', 'error'); }
  };

  // ── Definiciones ──
  const guardarDef = async () => {
    const f = defDialog.form;
    if (!f.concepto) { notify('Falta el concepto', 'warning'); return; }
    const payload = { ...f, importe: Number(f.importe) || 0, dia_vencimiento: Number(f.dia_vencimiento) || 1 };
    try {
      if (defDialog.id) await gastoRecurrenteService.editar(empresaId, defDialog.id, payload);
      else await gastoRecurrenteService.crear(empresaId, payload);
      setDefDialog(null); notify('Guardado'); await cargar();
    } catch (e) { notify(e?.response?.data?.error || 'Error al guardar', 'error'); }
  };
  const archivar = async (id) => {
    try { await gastoRecurrenteService.archivar(empresaId, id); notify('Archivado'); await cargar(); }
    catch (e) { notify('Error al archivar', 'error'); }
  };

  // ── Sugerencias ──
  const crearDesdeSug = (s) => setDefDialog({ form: {
    ...FORM_VACIO, concepto: s.proveedor || s.categoria || 'Gasto', nombre_proveedor: s.proveedor || '',
    categoria: s.categoria || '', importe: String(s.importe_sugerido || ''), moneda: s.moneda || 'ARS',
    periodicidad: s.periodicidad || 'mensual', dia_vencimiento: s.dia_vencimiento || 1,
  } });
  const descartarSug = async (clave) => {
    try { await gastoRecurrenteService.descartarSugerencia(empresaId, clave); setSugs((p) => p.filter((x) => x.clave !== clave)); }
    catch (e) { notify('Error al descartar', 'error'); }
  };

  const setF = (k, v) => setDefDialog((p) => ({ ...p, form: { ...p.form, [k]: v } }));

  return (
    <>
      <Head><title>Gastos recurrentes</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="h4">Gastos recurrentes</Typography>
              <Button variant="contained" onClick={() => setDefDialog({ form: { ...FORM_VACIO } })}>Nuevo gasto</Button>
            </Stack>

            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label={`A cargar${aCargar.length ? ` (${aCargar.length})` : ''}`} />
              <Tab label="Definiciones" />
              <Tab label="Sugerencias" />
            </Tabs>

            {/* A CARGAR */}
            {tab === 0 && (
              <Card variant="outlined">
                {Object.values(sel).some(Boolean) && (
                  <Box sx={{ p: 1.5, borderBottom: '0.5px solid', borderColor: 'divider' }}>
                    <Button size="small" variant="contained" onClick={confirmarSeleccionados}>Confirmar seleccionados</Button>
                  </Box>
                )}
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>Concepto</TableCell>
                      <TableCell>Vence</TableCell>
                      <TableCell align="right">Estimado</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && [...Array(4)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton height={26} /></TableCell></TableRow>)}
                    {!loading && aCargar.map((r) => {
                      const key = `${r.gasto_id}|${r.periodo}`;
                      const chip = ESTADO[r.estado] || ESTADO.pendiente;
                      return (
                        <TableRow key={key} hover>
                          <TableCell padding="checkbox"><Checkbox size="small" checked={!!sel[key]} onChange={(e) => setSel((s) => ({ ...s, [key]: e.target.checked }))} /></TableCell>
                          <TableCell>{r.concepto}<Typography variant="caption" color="text.secondary" display="block">{r.proveedor || ''}{r.periodo ? ` · ${r.periodo}` : ''}</Typography></TableCell>
                          <TableCell>{fmtDate(r.fecha_vencimiento)}</TableCell>
                          <TableCell align="right">{fmtMoney(r.importe_estandar, r.moneda)}</TableCell>
                          <TableCell><Chip size="small" label={chip.label} color={chip.color} variant="outlined" /></TableCell>
                          <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                            <Button size="small" variant="contained" onClick={() => abrirRegistrar(r)}>Registrar</Button>{' '}
                            <Button size="small" onClick={() => omitir(r)}>Omitir</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && !aCargar.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Nada por cargar.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* DEFINICIONES */}
            {tab === 1 && (
              <Card variant="outlined">
                <Table size="small">
                  <TableHead><TableRow><TableCell>Concepto</TableCell><TableCell>Proveedor</TableCell><TableCell>Frecuencia</TableCell><TableCell align="right">Importe</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {!loading && defs.map((d) => (
                      <TableRow key={d._id} hover>
                        <TableCell>{d.concepto}</TableCell>
                        <TableCell>{d.nombre_proveedor || '—'}</TableCell>
                        <TableCell>{d.periodicidad}</TableCell>
                        <TableCell align="right">{fmtMoney(d.importe, d.moneda)}</TableCell>
                        <TableCell>{d.activo ? <Chip size="small" label="Activo" color="success" variant="outlined" /> : <Chip size="small" label="Pausado" variant="outlined" />}</TableCell>
                        <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                          <Button size="small" onClick={() => setDefDialog({ id: d._id, form: { ...FORM_VACIO, ...d, fecha_inicio: d.fecha_inicio ? new Date(d.fecha_inicio).toISOString().slice(0, 10) : '' } })}>Editar</Button>{' '}
                          {d.activo && <Button size="small" color="error" onClick={() => archivar(d._id)}>Archivar</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && !defs.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Sin gastos definidos.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* SUGERENCIAS */}
            {tab === 2 && (
              <Stack spacing={1.5}>
                {!sugs.length && <Typography color="text.secondary">No hay sugerencias (o ya están todas configuradas/descartadas).</Typography>}
                {sugs.map((s) => (
                  <Card key={s.clave} variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                      <div>
                        <Typography variant="subtitle2">{s.proveedor} <Chip size="small" label={s.periodicidad} variant="outlined" sx={{ ml: 0.5 }} /></Typography>
                        <Typography variant="body2" color="text.secondary">~{fmtMoney(s.importe_sugerido, s.moneda)} (rango {fmtMoney(s.importe_min)}–{fmtMoney(s.importe_max)}) · {s.categoria || 's/categoría'}</Typography>
                        <Typography variant="caption" color="text.secondary">Apareció {s.ocurrencias}× en {s.meses} meses · día ~{s.dia_vencimiento}</Typography>
                      </div>
                      <Stack spacing={0.5}>
                        <Button size="small" variant="contained" onClick={() => crearDesdeSug(s)}>Crear</Button>
                        <Button size="small" onClick={() => descartarSug(s.clave)}>Descartar</Button>
                      </Stack>
                    </Stack>
                  </CardContent></Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Dialog definición */}
      <Dialog open={!!defDialog} onClose={() => setDefDialog(null)} maxWidth="sm" fullWidth>
        {defDialog && (<>
          <DialogTitle>{defDialog.id ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid item xs={12} sm={6}><TextField label="Concepto" size="small" fullWidth value={defDialog.form.concepto} onChange={(e) => setF('concepto', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Proveedor" size="small" fullWidth value={defDialog.form.nombre_proveedor} onChange={(e) => setF('nombre_proveedor', e.target.value)} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Importe" type="number" size="small" fullWidth value={defDialog.form.importe} onChange={(e) => setF('importe', e.target.value)} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Moneda" select size="small" fullWidth value={defDialog.form.moneda} onChange={(e) => setF('moneda', e.target.value)}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField></Grid>
              <Grid item xs={6} sm={4}><TextField label="Frecuencia" select size="small" fullWidth value={defDialog.form.periodicidad} onChange={(e) => setF('periodicidad', e.target.value)}>{PERIODICIDADES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
              <Grid item xs={6} sm={4}><TextField label="Día de vencimiento" type="number" size="small" fullWidth value={defDialog.form.dia_vencimiento} onChange={(e) => setF('dia_vencimiento', e.target.value)} /></Grid>
              <Grid item xs={6} sm={4}><TextField label="Inicio" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={defDialog.form.fecha_inicio} onChange={(e) => setF('fecha_inicio', e.target.value)} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="Categoría" size="small" fullWidth value={defDialog.form.categoria} onChange={(e) => setF('categoria', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Medio de pago" size="small" fullWidth value={defDialog.form.medio_pago} onChange={(e) => setF('medio_pago', e.target.value)} /></Grid>
              <Grid item xs={12} sm={6}><FormControlLabel control={<Switch checked={defDialog.form.activo} onChange={(e) => setF('activo', e.target.checked)} />} label="Activo" /></Grid>
              <Grid item xs={12}><TextField label="Observaciones" size="small" fullWidth value={defDialog.form.observaciones} onChange={(e) => setF('observaciones', e.target.value)} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions><Button onClick={() => setDefDialog(null)}>Cancelar</Button><Button variant="contained" onClick={guardarDef}>Guardar</Button></DialogActions>
        </>)}
      </Dialog>

      {/* Dialog registrar */}
      <Dialog open={!!regDialog} onClose={() => setRegDialog(null)} maxWidth="xs" fullWidth>
        {regDialog && (<>
          <DialogTitle>Registrar egreso</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>{regDialog.row.concepto} · {regDialog.row.periodo}</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Importe" type="number" size="small" fullWidth value={regDialog.importe} onChange={(e) => setRegDialog((p) => ({ ...p, importe: e.target.value }))} />
              <TextField label="Fecha" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={regDialog.fecha} onChange={(e) => setRegDialog((p) => ({ ...p, fecha: e.target.value }))} />
              <TextField label="Estado" select size="small" fullWidth value={regDialog.estado} onChange={(e) => setRegDialog((p) => ({ ...p, estado: e.target.value }))}><MenuItem value="Pagado">Pagado</MenuItem><MenuItem value="Pendiente">Pendiente (registrado, sin pagar)</MenuItem></TextField>
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setRegDialog(null)}>Cancelar</Button><Button variant="contained" onClick={confirmarRegistro}>Registrar</Button></DialogActions>
        </>)}
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

GastosRecurrentes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default GastosRecurrentes;
