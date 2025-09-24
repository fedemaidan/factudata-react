import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography, MenuItem, Select, InputLabel,
  FormControl, InputAdornment, Link as MuiLink, Button, Chip, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LaunchIcon from '@mui/icons-material/Launch';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import LeadsService from 'src/services/leadsService';
import * as XLSX from 'xlsx';

const emptyForm = {
  id: '',
  notionId: '',
  nombre: '',
  phone: '',
  rubro: '',
  saludoInicial: '',
  utm_campaign: '',
  fbp: '',
  ip: '',
  userAgent: '',
  status_sum: 'BOT',
  quiere_reunion: false,
  seguirFollowUP: false,
  proximo_mensaje: '',
  proximo_mensaje_vencimiento: '',
  createdAt: '',
  updatedAt: '',
  notionUrl: null,
};

function docId(row) {
  return row?.id || row?.notionId || row?.phone || '';
}

function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtLocal(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  } catch {
    return dt;
  }
}

function getDefaultWeekFilter() {
  const today = new Date();
  const to = ymdLocal(today);
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 6);
  const from = ymdLocal(fromDate);
  return { field: 'created', mode: 'range', on: '', from, to };
}

const LeadsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [filters, setFilters] = useState(getDefaultWeekFilter());

  const fetchBy = async (flt) => {
    setLoading(true);
    try {
      const { field, mode, on, from, to } = flt;
      const params = { field };
      if (mode === 'on' && on) params.on = on;
      if (mode === 'range') {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      const data = await LeadsService.listar(params);

      data.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      );
      setRows(data);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar leads', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const def = getDefaultWeekFilter();
    setFilters(def);
    fetchBy(def);
  }, []);

  const applyFilters = async () => { await fetchBy(filters); };
  const clearFilters = async () => {
    const def = getDefaultWeekFilter();
    setFilters(def);
    await fetchBy(def);
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(r => {
      const values = [
        docId(r),
        r?.nombre,
        r?.phone,
        r?.rubro,
        r?.utm_campaign,
        r?.ip,
        r?.fbp,
        r?.status_sum,
        r?.proximo_mensaje,
        r?.userAgent,
      ].map(x => (x || '').toString().toLowerCase());
      return values.some(v => v.includes(qq));
    });
  }, [rows, q]);

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      ...emptyForm,
      ...row,
      id: docId(row)
    });
    setOpenForm(true);
  };

  const validate = () => {
    if (!form.nombre?.trim()) return 'El nombre es requerido.';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setAlert({ open: true, message: err, severity: 'warning' });
      return;
    }
    try {
      const payload = {
        nombre: form.nombre || '',
        rubro: form.rubro || '',
        saludoInicial: form.saludoInicial || '',
        utm_campaign: form.utm_campaign || '',
        status_sum: form.status_sum || 'BOT',
        quiere_reunion: !!form.quiere_reunion,
        seguirFollowUP: !!form.seguirFollowUP,
        proximo_mensaje: form.proximo_mensaje || '',
        proximo_mensaje_vencimiento: form.proximo_mensaje_vencimiento || '',
      };
      const idForUpdate = form.id;
      await LeadsService.actualizar(idForUpdate, payload);
      setAlert({ open: true, message: 'Lead actualizado', severity: 'success' });
      setOpenForm(false);
      await fetchBy(filters);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error guardando el lead', severity: 'error' });
    }
  };

  const confirmDelete = (row) => {
    setToDelete(docId(row));
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await LeadsService.eliminar(toDelete);
      setAlert({ open: true, message: 'Lead eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetchBy(filters);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando lead', severity: 'error' });
    }
  };

  const handleExportExcel = () => {
    if (!filtered || filtered.length === 0) {
      setAlert({ open: true, message: 'No hay datos para exportar', severity: 'info' });
      return;
    }

    const rowsForXlsx = filtered.map(r => {
      const notionUrl = r?.notionUrl || (r?.notionId ? `https://www.notion.so/${r.notionId}` : '');
      return {
        ID: docId(r),
        Telefono: r?.phone || '',
        Nombre: r?.nombre || '',
        Rubro: r?.rubro || '',
        Saludo: r?.saludoInicial || '',
        'UTM Campaign': r?.utm_campaign || '',
        Estado: r?.status_sum || '',
        'Quiere reunión': r?.quiere_reunion ? 'Sí' : 'No',
        'Seguir FollowUp': r?.seguirFollowUP ? 'Sí' : 'No',
        'Próximo mensaje': r?.proximo_mensaje || '',
        'Venc. próximo mensaje': r?.proximo_mensaje_vencimiento ? fmtLocal(r.proximo_mensaje_vencimiento) : '',
        'Notion ID': r?.notionId || '',
        'Notion URL': notionUrl,
        IP: r?.ip || '',
        FBP: r?.fbp || '',
        'User Agent': r?.userAgent || '',
        Creado: r?.createdAt ? fmtLocal(r.createdAt) : '',
        Actualizado: r?.updatedAt ? fmtLocal(r.updatedAt) : '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rowsForXlsx);
    const headers = Object.keys(rowsForXlsx[0] || {});
    ws['!cols'] = headers.map(h => ({ wch: Math.max(12, h.length + 2) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const field = (filters?.field || 'created');
    const mode = (filters?.mode || 'range');
    const fname = `leads_${field}_${mode}_${ts}.xlsx`;

    XLSX.writeFile(wb, fname);
    setAlert({ open: true, message: 'Excel generado', severity: 'success' });
  };

  return (
    <>
      <Head><title>Leads</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4">Leads</Typography>
              <Button variant="outlined" onClick={handleExportExcel}>
                Exportar Excel
              </Button>
            </Stack>

            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por Teléfono / Nombre / Rubro / UTM / IP / Estado…"
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />

            <Paper sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel id="field-label">Campo</InputLabel>
                  <Select
                    labelId="field-label"
                    value={filters.field}
                    label="Campo"
                    onChange={(e) => setFilters(prev => ({ ...prev, field: e.target.value }))}
                  >
                    {/* Ajustá estos values si tu API espera createdAt/updatedAt */}
                    <MenuItem value="created">Creado (createdAt)</MenuItem>
                    <MenuItem value="updated">Actualizado (updatedAt)</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel id="mode-label">Modo</InputLabel>
                  <Select
                    labelId="mode-label"
                    value={filters.mode}
                    label="Modo"
                    onChange={(e) => setFilters(prev => ({ ...prev, mode: e.target.value }))}
                  >
                    <MenuItem value="on">Un día</MenuItem>
                    <MenuItem value="range">Rango</MenuItem>
                  </Select>
                </FormControl>

                {filters.mode === 'on' ? (
                  <TextField
                    label="Día"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.on}
                    onChange={(e) => setFilters(prev => ({ ...prev, on: e.target.value }))}
                    sx={{ minWidth: 200 }}
                  />
                ) : (
                  <>
                    <TextField
                      label="Desde"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.from}
                      onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                      sx={{ minWidth: 200 }}
                    />
                    <TextField
                      label="Hasta"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={filters.to}
                      onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                      sx={{ minWidth: 200 }}
                    />
                  </>
                )}

                <Button variant="contained" onClick={applyFilters} disabled={loading}>
                  Filtrar
                </Button>
                <Button onClick={clearFilters} disabled={loading}>
                  Limpiar
                </Button>
              </Stack>
            </Paper>

            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Rubro</TableCell>
                    <TableCell>UTM</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Quiere reunión</TableCell>
                    <TableCell>FollowUp</TableCell>
                    <TableCell>Próx. mensaje</TableCell>
                    <TableCell>Vencimiento</TableCell>
                    <TableCell>Notion</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>FBP</TableCell>
                    <TableCell>Creado</TableCell>
                    <TableCell>Actualizado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => {
                    const id = docId(row);
                    const notionUrl = row?.notionUrl || (row?.notionId ? `https://www.notion.so/${row.notionId}` : null);
                    return (
                      <TableRow key={id} hover>
                        <TableCell>{row.phone || <em>(—)</em>}</TableCell>
                        <TableCell>
                          <Tooltip title={row.saludoInicial || ''}>
                            <span>{row.nombre || <em>(sin nombre)</em>}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{row.rubro || <em>(—)</em>}</TableCell>
                        <TableCell>{row.utm_campaign || <em>(—)</em>}</TableCell>
                        <TableCell>
                          <Chip size="small" label={row.status_sum || '—'} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={row.quiere_reunion ? 'Sí' : 'No'} color={row.quiere_reunion ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={row.seguirFollowUP ? 'Sí' : 'No'} color={row.seguirFollowUP ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 240 }}>
                          <Tooltip title={row.proximo_mensaje || ''}>
                            <Typography variant="body2" noWrap>
                              {row.proximo_mensaje || <em>(—)</em>}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{row.proximo_mensaje_vencimiento ? fmtLocal(row.proximo_mensaje_vencimiento) : <em>(—)</em>}</TableCell>
                        <TableCell>
                          {row?.notionId ? (
                            <MuiLink href={notionUrl} target="_blank" rel="noopener noreferrer" underline="hover">
                              {row.notionId}
                              <LaunchIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                            </MuiLink>
                          ) : <em>(—)</em>}
                        </TableCell>
                        <TableCell>{row.ip || <em>(—)</em>}</TableCell>
                        <TableCell>{row.fbp || <em>(—)</em>}</TableCell>
                        <TableCell>{row.createdAt ? fmtLocal(row.createdAt) : <em>(—)</em>}</TableCell>
                        <TableCell>{row.updatedAt ? fmtLocal(row.updatedAt) : <em>(—)</em>}</TableCell>
                        <TableCell align="right">
                          <IconButton color="primary" onClick={() => handleOpenEdit(row)}><EditIcon /></IconButton>
                          <IconButton color="error" onClick={() => confirmDelete(row)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={15}>
                        <Typography variant="body2">Sin resultados.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>

        <Snackbar open={alert.open} autoHideDuration={3500} onClose={closeAlert}>
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Diálogo editar */}
        <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
          <DialogTitle>Editar lead</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="ID (doc/phone/notionId)" value={form.id} disabled />
                <TextField fullWidth label="Notion ID" value={form.notionId} disabled />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <TextField fullWidth label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <TextField fullWidth label="Rubro" value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} />
              </Stack>

              <TextField label="Saludo inicial" value={form.saludoInicial} onChange={(e) => setForm({ ...form, saludoInicial: e.target.value })} multiline minRows={2} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="UTM Campaign" value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} />
                <TextField fullWidth label="Estado (status_sum)" value={form.status_sum} onChange={(e) => setForm({ ...form, status_sum: e.target.value })} />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="¿Quiere reunión? (true/false)" value={form.quiere_reunion ? 'true' : 'false'} onChange={(e) => setForm({ ...form, quiere_reunion: e.target.value === 'true' })} />
                <TextField fullWidth label="Seguir FollowUp (true/false)" value={form.seguirFollowUP ? 'true' : 'false'} onChange={(e) => setForm({ ...form, seguirFollowUP: e.target.value === 'true' })} />
              </Stack>

              <TextField label="Próximo mensaje" value={form.proximo_mensaje} onChange={(e) => setForm({ ...form, proximo_mensaje: e.target.value })} multiline minRows={2} />

              <TextField
                label="Vencimiento próximo mensaje (ISO/fecha)"
                value={form.proximo_mensaje_vencimiento || ''}
                onChange={(e) => setForm({ ...form, proximo_mensaje_vencimiento: e.target.value })}
                helperText="Ej.: 2025-09-21T15:30:00"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="IP" value={form.ip || ''} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
                <TextField fullWidth label="FBP" value={form.fbp || ''} onChange={(e) => setForm({ ...form, fbp: e.target.value })} />
              </Stack>

              <TextField
                label="User Agent"
                value={form.userAgent || ''}
                onChange={(e) => setForm({ ...form, userAgent: e.target.value })}
                multiline
                minRows={2}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField fullWidth label="Creado" value={fmtLocal(form.createdAt)} disabled />
                <TextField fullWidth label="Actualizado" value={fmtLocal(form.updatedAt)} disabled />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>Guardar cambios</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo eliminar */}
        <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
          <DialogTitle>Eliminar lead</DialogTitle>
          <DialogContent>¿Seguro que querés eliminar <strong>{toDelete}</strong>?</DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

LeadsPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default LeadsPage;
