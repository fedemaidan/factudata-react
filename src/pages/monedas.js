import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Box, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Alert, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography, Tab, Tabs, Button, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import MonedasService from 'src/services/monedasService';

// ============== HELPERS ==============
function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ymLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '—';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

// ============== FORMULARIOS VACÍOS ==============
const emptyDolarForm = {
  fecha: '',
  oficial_compra: '',
  oficial_venta: '',
  oficial_promedio: '',
  blue_compra: '',
  blue_venta: '',
  blue_promedio: '',
  mep_compra: '',
  mep_venta: '',
  mep_promedio: '',
};

const emptyCACForm = {
  fecha: '',
  general: '',
  materiales: '',
  mano_obra: '',
};

// ============== COMPONENTE TABLA DÓLAR ==============
function DolarTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyDolarForm);
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await MonedasService.listarDolar({ limit: 200 });
      setRows(data);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar histórico de dólar', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filteredRows = search
    ? rows.filter(r => r.fecha?.includes(search))
    : rows;

  const handleOpenAdd = () => {
    setIsEdit(false);
    setForm({ ...emptyDolarForm, fecha: ymdLocal(new Date()) });
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      fecha: row.fecha,
      oficial_compra: row.oficial?.compra ?? '',
      oficial_venta: row.oficial?.venta ?? '',
      oficial_promedio: row.oficial?.promedio ?? '',
      blue_compra: row.blue?.compra ?? '',
      blue_venta: row.blue?.venta ?? '',
      blue_promedio: row.blue?.promedio ?? '',
      mep_compra: row.mep?.compra ?? '',
      mep_venta: row.mep?.venta ?? '',
      mep_promedio: row.mep?.promedio ?? '',
    });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.fecha) {
      setAlert({ open: true, message: 'La fecha es requerida', severity: 'warning' });
      return;
    }
    try {
      const payload = {
        fecha: form.fecha,
        oficial: {
          compra: parseFloat(form.oficial_compra) || 0,
          venta: parseFloat(form.oficial_venta) || 0,
          promedio: parseFloat(form.oficial_promedio) || 0,
        },
        blue: {
          compra: parseFloat(form.blue_compra) || 0,
          venta: parseFloat(form.blue_venta) || 0,
          promedio: parseFloat(form.blue_promedio) || 0,
        },
        mep: {
          compra: parseFloat(form.mep_compra) || 0,
          venta: parseFloat(form.mep_venta) || 0,
          promedio: parseFloat(form.mep_promedio) || 0,
        },
      };

      if (isEdit) {
        await MonedasService.actualizarDolar(form.fecha, payload);
        setAlert({ open: true, message: 'Dólar actualizado', severity: 'success' });
      } else {
        await MonedasService.crearDolar(payload);
        setAlert({ open: true, message: 'Dólar creado', severity: 'success' });
      }
      setOpenForm(false);
      await fetch();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar', severity: 'error' });
    }
  };

  const confirmDelete = (row) => {
    setToDelete(row.fecha);
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await MonedasService.eliminarDolar(toDelete);
      setAlert({ open: true, message: 'Registro eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetch();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al eliminar', severity: 'error' });
    }
  };

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por fecha (YYYY-MM-DD)"
          size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ width: 280 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Agregar
        </Button>
        <IconButton onClick={fetch} disabled={loading}><RefreshIcon /></IconButton>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Oficial Compra</TableCell>
              <TableCell align="right">Oficial Venta</TableCell>
              <TableCell align="right">Blue Compra</TableCell>
              <TableCell align="right">Blue Venta</TableCell>
              <TableCell align="right">MEP Compra</TableCell>
              <TableCell align="right">MEP Venta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.fecha} hover>
                <TableCell>{row.fecha}</TableCell>
                <TableCell align="right">{formatNumber(row.oficial?.compra)}</TableCell>
                <TableCell align="right">{formatNumber(row.oficial?.venta)}</TableCell>
                <TableCell align="right">{formatNumber(row.blue?.compra)}</TableCell>
                <TableCell align="right">{formatNumber(row.blue?.venta)}</TableCell>
                <TableCell align="right">{formatNumber(row.mep?.compra)}</TableCell>
                <TableCell align="right">{formatNumber(row.mep?.venta)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => confirmDelete(row)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}><Typography variant="body2">Sin resultados.</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Diálogo Agregar/Editar */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
        <DialogTitle>{isEdit ? 'Editar Dólar' : 'Agregar Dólar'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Fecha (YYYY-MM-DD)"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              disabled={isEdit}
              type="date"
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Dólar Oficial</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Compra" type="number" value={form.oficial_compra} onChange={(e) => setForm({ ...form, oficial_compra: e.target.value })} />
              <TextField fullWidth label="Venta" type="number" value={form.oficial_venta} onChange={(e) => setForm({ ...form, oficial_venta: e.target.value })} />
              <TextField fullWidth label="Promedio" type="number" value={form.oficial_promedio} onChange={(e) => setForm({ ...form, oficial_promedio: e.target.value })} />
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Dólar Blue</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Compra" type="number" value={form.blue_compra} onChange={(e) => setForm({ ...form, blue_compra: e.target.value })} />
              <TextField fullWidth label="Venta" type="number" value={form.blue_venta} onChange={(e) => setForm({ ...form, blue_venta: e.target.value })} />
              <TextField fullWidth label="Promedio" type="number" value={form.blue_promedio} onChange={(e) => setForm({ ...form, blue_promedio: e.target.value })} />
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Dólar MEP</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Compra" type="number" value={form.mep_compra} onChange={(e) => setForm({ ...form, mep_compra: e.target.value })} />
              <TextField fullWidth label="Venta" type="number" value={form.mep_venta} onChange={(e) => setForm({ ...form, mep_venta: e.target.value })} />
              <TextField fullWidth label="Promedio" type="number" value={form.mep_promedio} onChange={(e) => setForm({ ...form, mep_promedio: e.target.value })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Eliminar registro de dólar</DialogTitle>
        <DialogContent>¿Seguro que querés eliminar el registro del <strong>{toDelete}</strong>?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={3500} onClose={closeAlert}>
        <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
}

// ============== COMPONENTE TABLA CAC ==============
function CACTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyCACForm);
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await MonedasService.listarCAC({ limit: 200 });
      setRows(data);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar índices CAC', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filteredRows = search
    ? rows.filter(r => r.fecha?.includes(search))
    : rows;

  const handleOpenAdd = () => {
    setIsEdit(false);
    setForm({ ...emptyCACForm, fecha: ymLocal(new Date()) });
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      fecha: row.fecha,
      general: row.general ?? '',
      materiales: row.materiales ?? '',
      mano_obra: row.mano_obra ?? '',
    });
    setOpenForm(true);
  };

  const save = async () => {
    if (!form.fecha) {
      setAlert({ open: true, message: 'La fecha es requerida', severity: 'warning' });
      return;
    }
    try {
      const payload = {
        fecha: form.fecha,
        general: parseFloat(form.general) || 0,
        materiales: parseFloat(form.materiales) || 0,
        mano_obra: parseFloat(form.mano_obra) || 0,
      };

      if (isEdit) {
        await MonedasService.actualizarCAC(form.fecha, payload);
        setAlert({ open: true, message: 'Índice CAC actualizado', severity: 'success' });
      } else {
        await MonedasService.crearCAC(payload);
        setAlert({ open: true, message: 'Índice CAC creado', severity: 'success' });
      }
      setOpenForm(false);
      await fetch();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar', severity: 'error' });
    }
  };

  const confirmDelete = (row) => {
    setToDelete(row.fecha);
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await MonedasService.eliminarCAC(toDelete);
      setAlert({ open: true, message: 'Índice eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetch();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al eliminar', severity: 'error' });
    }
  };

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por fecha (YYYY-MM)"
          size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ width: 280 }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Agregar
        </Button>
        <IconButton onClick={fetch} disabled={loading}><RefreshIcon /></IconButton>
      </Stack>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha (YYYY-MM)</TableCell>
              <TableCell align="right">General</TableCell>
              <TableCell align="right">Materiales</TableCell>
              <TableCell align="right">Mano de Obra</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow key={row.fecha} hover>
                <TableCell>{row.fecha}</TableCell>
                <TableCell align="right">{formatNumber(row.general)}</TableCell>
                <TableCell align="right">{formatNumber(row.materiales)}</TableCell>
                <TableCell align="right">{formatNumber(row.mano_obra)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => handleOpenEdit(row)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => confirmDelete(row)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}><Typography variant="body2">Sin resultados.</Typography></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Diálogo Agregar/Editar */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? 'Editar Índice CAC' : 'Agregar Índice CAC'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Fecha (YYYY-MM)"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              disabled={isEdit}
              type="month"
              InputLabelProps={{ shrink: true }}
            />
            <TextField label="Índice General" type="number" value={form.general} onChange={(e) => setForm({ ...form, general: e.target.value })} />
            <TextField label="Materiales" type="number" value={form.materiales} onChange={(e) => setForm({ ...form, materiales: e.target.value })} />
            <TextField label="Mano de Obra" type="number" value={form.mano_obra} onChange={(e) => setForm({ ...form, mano_obra: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Eliminar */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Eliminar índice CAC</DialogTitle>
        <DialogContent>¿Seguro que querés eliminar el índice del <strong>{toDelete}</strong>?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={3500} onClose={closeAlert}>
        <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
}

// ============== PÁGINA PRINCIPAL ==============
const MonedasPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <>
      <Head><title>Monedas de Referencia</title></Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Monedas de Referencia</Typography>
            <Typography variant="body2" color="text.secondary">
              Administrá los valores históricos del dólar (Oficial, Blue, MEP) y los índices CAC.
            </Typography>

            <Paper sx={{ px: 2 }}>
              <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                <Tab label="Dólar Histórico" />
                <Tab label="Índice CAC" />
              </Tabs>
            </Paper>

            <Box sx={{ mt: 2 }}>
              {tab === 0 && <DolarTab />}
              {tab === 1 && <CACTab />}
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
};

MonedasPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MonedasPage;
