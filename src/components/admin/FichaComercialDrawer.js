import { useEffect, useState } from 'react';
import {
  Drawer, Box, Stack, Typography, Divider, Tabs, Tab, Grid, Card, CardContent,
  TextField, MenuItem, Switch, FormControlLabel, Button, Chip, IconButton,
  Skeleton, Snackbar, Alert, Autocomplete, Tooltip, Link,
  Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SaveIcon from '@mui/icons-material/Save';
import adminSuscripcionService from 'src/services/adminSuscripcionService';
import { updateEmpresaDetails } from 'src/services/empresaService';

const PERIODICIDADES = ['mensual', 'bimestral', 'semestral', 'anual'];
const PLANES = ['Plan Independiente', 'Plan Básico', 'Plan Intermedio', 'Plan Premium'];
const CAJAS = ['facu', 'fede', 'puente', 'lucha'];
const fmtMoney = (n, mon = 'ARS') => (n == null ? '—' : `${Number(n).toLocaleString('es-AR')} ${mon}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('es-AR') : '—');
const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const Metric = ({ label, value }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6">{value ?? '—'}</Typography>
    </CardContent>
  </Card>
);

export default function FichaComercialDrawer({ empresaId, open, onClose, onSaved }) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ficha, setFicha] = useState(null);
  const [form, setForm] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [ingDialog, setIngDialog] = useState(false);
  const [ingForm, setIngForm] = useState({ caja: 'facu', importe: '', moneda: 'ARS', fecha: '', concepto: 'implementacion', descripcion: '' });
  const [atrDialog, setAtrDialog] = useState(false);
  const [sinAtribuir, setSinAtribuir] = useState([]);
  const [loadingSA, setLoadingSA] = useState(false);

  const cargar = async () => {
    if (!empresaId) return;
    try {
      setLoading(true);
      const data = await adminSuscripcionService.fichaCliente(empresaId);
      setFicha(data);
      const e = data.empresa;
      const s = e.suscripcion || {};
      setForm({
        vendedor: e.vendedor || '', canal_adquisicion: e.canal_adquisicion || '', plan: e.plan || '',
        notion_url: e.notion_url || '',
        esCliente: !!e.esCliente, estaDadoDeBaja: e.estado === 'baja',
        fechaRegistroCliente: toInput(e.fechaRegistroCliente), fechaBaja: toInput(e.fechaBaja), motivoBaja: e.motivoBaja || '',
        activa: s.activa !== false, importe: s.importe ?? '', moneda: s.moneda || 'ARS',
        periodicidad: s.periodicidad || 'mensual', en_cuotas: !!s.en_cuotas, cantidad_cuotas: s.cantidad_cuotas ?? '',
        fecha_inicio: toInput(s.fecha_inicio), semana_pago: s.semana_pago ?? '', caja_default: s.caja_default || '',
        paga_por_mp: !!s.paga_por_mp, mp_name: s.mp_name || '',
        requiere_factura: !!s.requiere_factura, responsable_facturacion: s.responsable_facturacion || '',
        razon_social_facturacion: s.razon_social_facturacion || '', cuit_facturacion: s.cuit_facturacion || '',
      });
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al cargar la ficha', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open && empresaId) cargar(); /* eslint-disable-next-line */ }, [open, empresaId]);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    try {
      setSaving(true);
      const payload = {
        vendedor: form.vendedor || null,
        canal_adquisicion: form.canal_adquisicion || null,
        plan: form.plan || null,
        notion_url: form.notion_url || null,
        esCliente: form.esCliente,
        estaDadoDeBaja: form.estaDadoDeBaja,
        fechaBaja: form.fechaBaja ? new Date(form.fechaBaja).toISOString() : null,
        motivoBaja: form.motivoBaja || null,
        fechaRegistroCliente: form.fechaRegistroCliente ? new Date(form.fechaRegistroCliente).toISOString() : null,
        suscripcion: {
          activa: form.activa,
          importe: Number(form.importe) || 0,
          moneda: form.moneda,
          periodicidad: form.periodicidad,
          en_cuotas: form.en_cuotas,
          cantidad_cuotas: form.en_cuotas ? (Number(form.cantidad_cuotas) || null) : null,
          fecha_inicio: form.fecha_inicio ? new Date(form.fecha_inicio).toISOString() : null,
          semana_pago: form.semana_pago ? Number(form.semana_pago) : null,
          caja_default: form.caja_default || null,
          paga_por_mp: form.paga_por_mp,
          mp_name: form.mp_name || null,
          requiere_factura: form.requiere_factura,
          responsable_facturacion: form.responsable_facturacion || null,
          razon_social_facturacion: form.razon_social_facturacion || null,
          cuit_facturacion: form.cuit_facturacion || null,
        },
      };
      const ok = await updateEmpresaDetails(empresaId, payload);
      if (!ok) throw new Error('No se pudo guardar');
      setSnackbar({ open: true, message: 'Guardado', severity: 'success' });
      await cargar();
      onSaved && onSaved();
    } catch (err) {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Error al guardar', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const actualizarUso = async () => {
    try {
      setRefreshing(true);
      const data = await adminSuscripcionService.refreshAnalytics(empresaId);
      setFicha(data);
      setSnackbar({ open: true, message: 'Uso actualizado', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'No se pudo actualizar el uso', severity: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const guardarIngreso = async () => {
    try {
      if (!ingForm.importe) { setSnackbar({ open: true, message: 'Falta el importe', severity: 'warning' }); return; }
      await adminSuscripcionService.registrarIngreso(empresaId, {
        caja: ingForm.caja,
        importe: Number(ingForm.importe),
        moneda: ingForm.moneda,
        fecha: ingForm.fecha ? new Date(ingForm.fecha).toISOString() : undefined,
        concepto: ingForm.concepto || null,
        descripcion: ingForm.descripcion || null,
      });
      setIngDialog(false);
      setIngForm({ caja: 'facu', importe: '', moneda: 'ARS', fecha: '', concepto: 'implementacion', descripcion: '' });
      setSnackbar({ open: true, message: 'Ingreso registrado', severity: 'success' });
      await cargar();
    } catch (err) {
      setSnackbar({ open: true, message: err?.response?.data?.error || 'Error al registrar', severity: 'error' });
    }
  };

  const abrirAtribuir = async () => {
    setAtrDialog(true);
    try {
      setLoadingSA(true);
      setSinAtribuir(await adminSuscripcionService.ingresosSinAtribuir());
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al cargar ingresos sin atribuir', severity: 'error' });
    } finally {
      setLoadingSA(false);
    }
  };

  const atribuir = async (movId) => {
    try {
      await adminSuscripcionService.atribuirMovimiento(movId, empresaId);
      setSinAtribuir((prev) => prev.filter((m) => m.id !== movId));
      setSnackbar({ open: true, message: 'Ingreso atribuido', severity: 'success' });
      await cargar();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al atribuir', severity: 'error' });
    }
  };

  const quitarAtribucion = async (movId) => {
    try {
      await adminSuscripcionService.atribuirMovimiento(movId, null);
      setSnackbar({ open: true, message: 'Atribución quitada', severity: 'success' });
      await cargar();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al quitar atribución', severity: 'error' });
    }
  };

  const e = ficha?.empresa;
  const uso = ficha?.uso;
  const d = uso?.data || {};
  const com = ficha?.comercial;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 640 } } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{e?.nombre || 'Ficha comercial'}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        {e && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip size="small" label={e.estado === 'baja' ? 'Baja' : 'Activo'} color={e.estado === 'baja' ? 'error' : 'success'} variant="outlined" />
            {e.cuit && <Typography variant="caption" color="text.secondary">CUIT {e.cuit}</Typography>}
            {e.notion_url && (
              <Link href={e.notion_url} target="_blank" rel="noopener" sx={{ fontSize: 13 }}>
                Notion <OpenInNewIcon sx={{ fontSize: 13, verticalAlign: '-2px' }} />
              </Link>
            )}
          </Stack>
        )}
      </Box>
      <Divider />

      {loading || !form ? (
        <Box sx={{ p: 2 }}><Skeleton height={40} /><Skeleton height={200} /></Box>
      ) : (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Comercial" />
            <Tab label="Uso" />
            <Tab label="Cobranzas" />
            <Tab label="Historial" />
          </Tabs>

          {/* COMERCIAL */}
          {tab === 0 && (
            <Box sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">Datos comerciales</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}><TextField label="Vendedor" size="small" fullWidth value={form.vendedor} onChange={(ev) => setF('vendedor', ev.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Canal" size="small" fullWidth value={form.canal_adquisicion} onChange={(ev) => setF('canal_adquisicion', ev.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}>
                    <Autocomplete freeSolo size="small" options={PLANES} value={form.plan}
                      onChange={(ev, nv) => setF('plan', nv || '')} onInputChange={(ev, nv) => setF('plan', nv)}
                      renderInput={(p) => <TextField {...p} label="Plan" />} />
                  </Grid>
                  <Grid item xs={12}><TextField label="Link Notion" size="small" fullWidth value={form.notion_url} onChange={(ev) => setF('notion_url', ev.target.value)} placeholder="https://notion.so/..." /></Grid>
                </Grid>

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">Estado de cliente</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}><FormControlLabel control={<Switch checked={form.esCliente} onChange={(ev) => setF('esCliente', ev.target.checked)} />} label="Es cliente" /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Fecha de alta" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.fechaRegistroCliente} onChange={(ev) => setF('fechaRegistroCliente', ev.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}><FormControlLabel control={<Switch checked={form.estaDadoDeBaja} color="error" onChange={(ev) => setF('estaDadoDeBaja', ev.target.checked)} />} label="Baja" /></Grid>
                  {form.estaDadoDeBaja && <>
                    <Grid item xs={12} sm={4}><TextField label="Fecha de baja" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.fechaBaja} onChange={(ev) => setF('fechaBaja', ev.target.value)} /></Grid>
                    <Grid item xs={12} sm={8}><TextField label="Motivo de baja" size="small" fullWidth value={form.motivoBaja} onChange={(ev) => setF('motivoBaja', ev.target.value)} /></Grid>
                  </>}
                </Grid>

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">Suscripción</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}><TextField label="Importe" type="number" size="small" fullWidth value={form.importe} onChange={(ev) => setF('importe', ev.target.value)} /></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Moneda" select size="small" fullWidth value={form.moneda} onChange={(ev) => setF('moneda', ev.target.value)}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Periodicidad" select size="small" fullWidth value={form.periodicidad} onChange={(ev) => setF('periodicidad', ev.target.value)}>{PERIODICIDADES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Inicio" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.fecha_inicio} onChange={(ev) => setF('fecha_inicio', ev.target.value)} /></Grid>
                  <Grid item xs={6} sm={3}><FormControlLabel control={<Switch checked={form.en_cuotas} onChange={(ev) => setF('en_cuotas', ev.target.checked)} />} label="En cuotas" /></Grid>
                  {form.en_cuotas && <Grid item xs={6} sm={3}><TextField label="Cant. cuotas" type="number" size="small" fullWidth value={form.cantidad_cuotas} onChange={(ev) => setF('cantidad_cuotas', ev.target.value)} /></Grid>}
                  <Grid item xs={6} sm={3}><TextField label="Semana pago" type="number" size="small" fullWidth value={form.semana_pago} onChange={(ev) => setF('semana_pago', ev.target.value)} /></Grid>
                  <Grid item xs={6} sm={3}><TextField label="Caja" select size="small" fullWidth value={form.caja_default} onChange={(ev) => setF('caja_default', ev.target.value)}><MenuItem value="">—</MenuItem>{CAJAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
                  <Grid item xs={6} sm={3}><FormControlLabel control={<Switch checked={form.paga_por_mp} onChange={(ev) => setF('paga_por_mp', ev.target.checked)} />} label="Paga por MP" /></Grid>
                  {form.paga_por_mp && <Grid item xs={6} sm={3}><TextField label="MP Name" size="small" fullWidth value={form.mp_name} onChange={(ev) => setF('mp_name', ev.target.value)} /></Grid>}
                </Grid>

                <Divider />
                <Typography variant="subtitle2" color="text.secondary">Facturación</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}><FormControlLabel control={<Switch checked={form.requiere_factura} onChange={(ev) => setF('requiere_factura', ev.target.checked)} />} label="Requiere factura" /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Responsable" select size="small" fullWidth value={form.responsable_facturacion} onChange={(ev) => setF('responsable_facturacion', ev.target.value)}><MenuItem value="">—</MenuItem><MenuItem value="facu">Facu</MenuItem><MenuItem value="fede">Fede</MenuItem><MenuItem value="otro">Otro</MenuItem></TextField></Grid>
                  <Grid item xs={12} sm={4}><TextField label="CUIT facturación" size="small" fullWidth value={form.cuit_facturacion} onChange={(ev) => setF('cuit_facturacion', ev.target.value)} /></Grid>
                  <Grid item xs={12}><TextField label="Razón social facturación" size="small" fullWidth value={form.razon_social_facturacion} onChange={(ev) => setF('razon_social_facturacion', ev.target.value)} /></Grid>
                </Grid>

                <Stack direction="row" justifyContent="flex-end">
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={guardar} disabled={saving}>Guardar</Button>
                </Stack>
              </Stack>
            </Box>
          )}

          {/* USO */}
          {tab === 1 && (
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Último cálculo: {fmtDateTime(uso?.computedAt)}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={actualizarUso} disabled={refreshing}>Actualizar</Button>
              </Stack>
              {uso?.error && <Alert severity="warning" sx={{ mb: 2 }}>{uso.error}</Alert>}
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={4}><Metric label="Último uso" value={fmtDate(d.ultimoUso)} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Último login" value={fmtDate(d.ultimoLogin)} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Movimientos (total)" value={d.totalMovimientos} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Movimientos (30d)" value={d.movimientosEnPeriodo} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Usuarios" value={d.totalUsuarios} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Usuarios c/ mov." value={d.usuariosConMovimientos} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Acopios (30d)" value={d.acopiosEnPeriodo} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Notas pedido (30d)" value={d.notasPedidoPeriodo} /></Grid>
                <Grid item xs={6} sm={4}><Metric label="Presupuestos (30d)" value={d.presupuestosPeriodo} /></Grid>
                <Grid item xs={12} sm={6}><Metric label="Por origen" value={d.movimientosPorOrigen ? `WA ${d.movimientosPorOrigen.whatsapp || 0} · Web ${d.movimientosPorOrigen.web || 0}` : '—'} /></Grid>
                <Grid item xs={12} sm={6}><Metric label="Tendencia (sem 1-4)" value={[d.movsSemana1, d.movsSemana2, d.movsSemana3, d.movsSemana4].filter((x) => x != null).join(' · ') || '—'} /></Grid>
              </Grid>
            </Box>
          )}

          {/* COBRANZAS / situación comercial */}
          {tab === 2 && (
            <Box sx={{ p: 2 }}>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}><Metric label="Ingreso mensual eq." value={fmtMoney(com?.ingreso_mensual_equivalente, com?.suscripcion?.moneda)} /></Grid>
                <Grid item xs={6} sm={3}><Metric label="Próximo cobro" value={fmtDate(com?.proximo_cobro)} /></Grid>
                <Grid item xs={6} sm={3}><Metric label="Importe próximo" value={fmtMoney(com?.proximo_cobro_importe, com?.suscripcion?.moneda)} /></Grid>
                <Grid item xs={6} sm={3}><Metric label="Total ingresos" value={fmtMoney(com?.total_ingresos, com?.suscripcion?.moneda)} /></Grid>
              </Grid>

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Historial de ingresos</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setIngDialog(true)}>Registrar ingreso</Button>
                  <Button size="small" onClick={abrirAtribuir}>Atribuir existente</Button>
                </Stack>
              </Stack>
              {(!com?.ingresos || com.ingresos.length === 0) ? (
                <Typography color="text.secondary" variant="body2">Sin ingresos registrados.</Typography>
              ) : (
                <Card variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Concepto</TableCell>
                        <TableCell align="right">Importe</TableCell>
                        <TableCell>Caja</TableCell>
                        <TableCell align="center">Factura</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {com.ingresos.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell>{fmtDate(i.fecha)}</TableCell>
                          <TableCell>
                            {i.concepto}
                            {!i.es_suscripcion && <Chip label="suelto" size="small" variant="outlined" sx={{ ml: 0.5, height: 18 }} />}
                          </TableCell>
                          <TableCell align="right">{fmtMoney(i.importe, i.moneda)}</TableCell>
                          <TableCell>{i.caja || '—'}</TableCell>
                          <TableCell align="center">{i.facturado == null ? '—' : (i.facturado ? 'Sí' : 'No')}</TableCell>
                          <TableCell align="right">
                            {!i.es_suscripcion && (
                              <Tooltip title="Quitar atribución a este cliente">
                                <Button size="small" color="error" onClick={() => quitarAtribucion(i.id)}>Quitar</Button>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </Box>
          )}

          {/* HISTORIAL */}
          {tab === 3 && (
            <Box sx={{ p: 2 }}>
              {(!ficha?.historial || ficha.historial.length === 0) && <Typography color="text.secondary">Sin cambios registrados.</Typography>}
              <Stack spacing={1.5}>
                {(ficha?.historial || []).map((log) => (
                  <Card key={log._id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">{fmtDateTime(log.fecha)} · {log.userName || 'sistema'}</Typography>
                      <Stack sx={{ mt: 0.5 }}>
                        {(log.changes || []).map((c, i) => (
                          <Typography key={i} variant="body2">
                            <b>{c.field}</b>{c.tipo === 'array'
                              ? `: +${(c.agregados || []).length} / −${(c.quitados || []).length}${c.modificados ? ` / ~${c.modificados.length}` : ''}`
                              : `: ${c.from ?? '—'} → ${c.to ?? '—'}`}
                          </Typography>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}

      {/* Dialog: registrar ingreso suelto */}
      <Dialog open={ingDialog} onClose={() => setIngDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar ingreso</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Concepto" size="small" fullWidth value={ingForm.concepto} onChange={(ev) => setIngForm((p) => ({ ...p, concepto: ev.target.value }))} placeholder="implementacion / otro" />
            <TextField label="Importe" type="number" size="small" fullWidth value={ingForm.importe} onChange={(ev) => setIngForm((p) => ({ ...p, importe: ev.target.value }))} />
            <Stack direction="row" spacing={2}>
              <TextField label="Moneda" select size="small" fullWidth value={ingForm.moneda} onChange={(ev) => setIngForm((p) => ({ ...p, moneda: ev.target.value }))}><MenuItem value="ARS">ARS</MenuItem><MenuItem value="USD">USD</MenuItem></TextField>
              <TextField label="Caja" select size="small" fullWidth value={ingForm.caja} onChange={(ev) => setIngForm((p) => ({ ...p, caja: ev.target.value }))}>{CAJAS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
            </Stack>
            <TextField label="Fecha" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={ingForm.fecha} onChange={(ev) => setIngForm((p) => ({ ...p, fecha: ev.target.value }))} />
            <TextField label="Descripción" size="small" fullWidth value={ingForm.descripcion} onChange={(ev) => setIngForm((p) => ({ ...p, descripcion: ev.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIngDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarIngreso}>Registrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: atribuir ingreso existente */}
      <Dialog open={atrDialog} onClose={() => setAtrDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Atribuir ingreso existente a {e?.nombre}</DialogTitle>
        <DialogContent>
          {loadingSA ? <Skeleton height={120} /> : (
            (!sinAtribuir.length) ? <Typography color="text.secondary">No hay ingresos sin atribuir en las cajas de Sorby.</Typography> : (
              <Table size="small">
                <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Detalle</TableCell><TableCell align="right">Importe</TableCell><TableCell>Caja</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {sinAtribuir.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{fmtDate(m.fecha)}</TableCell>
                      <TableCell>{m.descripcion || m.categoria || '—'}</TableCell>
                      <TableCell align="right">{fmtMoney(m.importe, m.moneda)}</TableCell>
                      <TableCell>{m.caja || '—'}</TableCell>
                      <TableCell align="right"><Button size="small" onClick={() => atribuir(m.id)}>Atribuir</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAtrDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Drawer>
  );
}
