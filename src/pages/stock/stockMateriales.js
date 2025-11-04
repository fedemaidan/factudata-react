// src/pages/stockMateriales.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMaterialesService from '../../services/stock/stockMaterialesService';

import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';

const emptyForm = {
  _id: '',
  nombre: '',
  SKU: '',
  desc_material: '',
  alias: '',
  empresa_id: '',        // (no se edita en UI; lo llenamos automático)
  empresa_nombre: '',    // idem
};

// 👇 Helper: toma la respuesta del servicio ({ ok, items, total, ... }) o un array crudo
function mapMateriales(resp) {
  const arr = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
  return arr.map((m) => ({
    ...m,
    stockTotal: typeof m.stock === 'number' ? m.stock : 0,
    porProyecto: Array.isArray(m.porProyecto) ? m.porProyecto : [],
  }));
}

// Ordenamiento
const sortables = {
  nombre: 'nombre',
  descripcion: 'desc_material',
  sku: 'SKU',
  stock: 'stockTotal',
};

function compareStrings(a = '', b = '', dir = 'asc') {
  const res = (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
  return dir === 'asc' ? res : -res;
}
function compareNumbers(a = 0, b = 0, dir = 'asc') {
  const res = (Number(a) || 0) - (Number(b) || 0);
  return dir === 'asc' ? res : -res;
}

const StockMateriales = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Búsqueda y filtros
  const [q, setQ] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all | gt0 | eq0 | lt0

  // Ordenamiento
  const [orderBy, setOrderBy] = useState('nombre'); // nombre | descripcion | sku | stock
  const [order, setOrder] = useState('asc'); // asc | desc

  const { user } = useAuthContext();
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const filters = { empresa_id: empresa.id };

      const resp = await StockMaterialesService.listarMateriales(filters);
      const mapped = mapMateriales(resp);
      setRows(mapped);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar materiales', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // Filtro + ordenamiento
  const filteredSorted = useMemo(() => {
    let list = rows;

    // Texto
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter((r) =>
        (r.nombre || '').toLowerCase().includes(qq) ||
        (r.SKU || '').toLowerCase().includes(qq) ||
        (r.desc_material || '').toLowerCase().includes(qq)
      );
    }

    // Stock
    if (stockFilter !== 'all') {
      list = list.filter((r) => {
        const s = typeof r.stock === 'number' ? r.stock : r.stockTotal ?? 0;
        if (stockFilter === 'gt0') return s > 0;
        if (stockFilter === 'eq0') return s === 0;
        if (stockFilter === 'lt0') return s < 0;
        return true;
      });
    }

    // Orden
    const key = sortables[orderBy] || 'nombre';
    const dir = order;
    const sorted = [...list].sort((a, b) => {
      if (key === 'stockTotal') {
        const av = typeof a.stock === 'number' ? a.stock : a.stockTotal ?? 0;
        const bv = typeof b.stock === 'number' ? b.stock : b.stockTotal ?? 0;
        return compareNumbers(av, bv, dir);
      }
      if (key === 'SKU') return compareStrings(a.SKU, b.SKU, dir);
      if (key === 'desc_material') return compareStrings(a.desc_material, b.desc_material, dir);
      return compareStrings(a.nombre, b.nombre, dir);
    });

    return sorted;
  }, [rows, q, stockFilter, orderBy, order]);

  // --- crear/editar ---
  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      _id: row._id,
      nombre: row.nombre || '',
      SKU: row.SKU || '',
      desc_material: row.desc_material || '',
      alias: Array.isArray(row.alias) ? row.alias.join(', ') : (row.alias || ''),
      empresa_id: row.empresa_id || '',
      empresa_nombre: row.empresa_nombre || '',
    });
    setOpenForm(true);
  };

  const validate = () => {
    if (!form.nombre?.trim()) return 'El nombre es requerido';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      setAlert({ open: true, message: err, severity: 'warning' });
      return;
    }
    try {
      // 🔑 SIEMPRE tomamos empresa desde el usuario logueado
      const empresa = await getEmpresaDetailsFromUser(user);
      const empresa_id = empresa?.id ?? form.empresa_id ?? null;
      const empresa_nombre = empresa?.nombre ?? form.empresa_nombre ?? null;

      const payload = {
        nombre: form.nombre?.trim(),
        SKU: form.SKU?.trim() || null,
        desc_material: form.desc_material?.trim() || null,
        alias: form.alias?.trim() || null,
        // 👉 incluimos ambos campos siempre para consistencia y validaciones en backend
        empresa_id,
        empresa_nombre,
      };

      if (isEdit) {
        await StockMaterialesService.actualizarMaterial(form._id, payload);
      } else {
        await StockMaterialesService.crearMaterial(payload);
      }

      setAlert({
        open: true,
        message: isEdit ? 'Material actualizado' : 'Material creado',
        severity: 'success',
      });
      setOpenForm(false);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error guardando material', severity: 'error' });
    }
  };

  // --- eliminar ---
  const confirmDelete = (row) => {
    setToDelete(row);
    setOpenDelete(true);
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await StockMaterialesService.eliminarMaterial(toDelete._id);
      setAlert({ open: true, message: 'Material eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando material', severity: 'error' });
    }
  };

  // Ordenamiento por header
  const handleRequestSort = (property) => {
    if (orderBy === property) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(property);
      setOrder('asc');
    }
  };

  // Util para TableSortLabel: estado activo del header
  const createSortHandler = (property) => (event) => {
    event.preventDefault();
    handleRequestSort(property);
  };

  return (
    <>
      <Head><title>Stock de materiales</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>

            {/* Barra superior */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Stock de materiales</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Agregar material
              </Button>
            </Stack>

            {/* Búsqueda + Filtro de stock */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                sx={{ flex: 1, minWidth: 260 }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre / SKU / descripción…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon /></InputAdornment>
                  ),
                }}
              />
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel id="stock-filter-label">Stock</InputLabel>
                <Select
                  labelId="stock-filter-label"
                  label="Stock"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="gt0">Con stock (&gt; 0)</MenuItem>
                  <MenuItem value="eq0">Sin stock (= 0)</MenuItem>
                  <MenuItem value="lt0">Stock negativo (&lt; 0)</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Tabla */}
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={orderBy === 'nombre' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'nombre'}
                        direction={orderBy === 'nombre' ? order : 'asc'}
                        onClick={createSortHandler('nombre')}
                      >
                        Nombre
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'descripcion' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'descripcion'}
                        direction={orderBy === 'descripcion' ? order : 'asc'}
                        onClick={createSortHandler('descripcion')}
                      >
                        Descripción
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'sku' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'sku'}
                        direction={orderBy === 'sku' ? order : 'asc'}
                        onClick={createSortHandler('sku')}
                      >
                        SKU
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Alias</TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'stock' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'stock'}
                        direction={orderBy === 'stock' ? order : 'asc'}
                        onClick={createSortHandler('stock')}
                      >
                        Stock total
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSorted.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body1" fontWeight={600}>{row.nombre}</Typography>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            {(row.porProyecto || []).map((p) => (
                              <Chip
                                key={p.proyecto_id || p.proyecto_nombre || Math.random()}
                                size="small"
                                label={`${p.proyecto_nombre || p.proyecto_id || 'Obra'}: ${p.cantidad}`}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Tooltip title={row.desc_material || ''}>
                          <Typography variant="body2" noWrap>
                            {row.desc_material || <em>(—)</em>}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{row.SKU || <em>(—)</em>}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        {Array.isArray(row.alias)
                          ? row.alias.join(', ')
                          : (row.alias || <em>(—)</em>)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>
                          {typeof row.stock === 'number' ? row.stock : (row.stockTotal ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => confirmDelete(row)} aria-label="Eliminar">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filteredSorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2">Sin resultados.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </Container>

        {/* Alertas */}
        <Snackbar open={alert.open} autoHideDuration={3200} onClose={closeAlert}>
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* Crear / Editar material */}
        <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="sm">
          <DialogTitle>{isEdit ? 'Editar material' : 'Nuevo material'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                autoFocus
              />
              <TextField
                label="Descripción"
                value={form.desc_material}
                onChange={(e) => setForm({ ...form, desc_material: e.target.value })}
              />
              <TextField
                label="SKU"
                value={form.SKU}
                onChange={(e) => setForm({ ...form, SKU: e.target.value })}
              />
              <TextField
                label="Alias (coma separada, opcional)"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                helperText="Ej.: varilla 8, hierro 8, fi8"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>
              {isEdit ? 'Guardar cambios' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Eliminar */}
        <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
          <DialogTitle>Eliminar material</DialogTitle>
          <DialogContent>
            ¿Seguro que querés eliminar <strong>{toDelete?.nombre}</strong>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={remove}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

StockMateriales.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default StockMateriales;
