// src/pages/stockMateriales.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel, TablePagination, FormHelperText, LinearProgress, Backdrop, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMaterialesService from '../services/stock/stockMaterialesService';

import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';

/* ======================
   Helpers alias <-> chips (para crear/editar)
   ====================== */
function parseAliasToChips(src) {
  if (Array.isArray(src)) {
    return [...new Set(src.map(String).map((s) => s.trim()).filter(Boolean))];
  }
  if (src == null) return [];
  return [...new Set(String(src)
    .split(/[,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
  )];
}
function removeChip(list, idx) {
  return list.filter((_, i) => i !== idx);
}

/* ======================
   Delay mínimo para el loader
   ====================== */
const MIN_LOADING_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ====================== */

const emptyForm = {
  _id: '',
  nombre: '',
  SKU: '',
  desc_material: '',
  aliasChips: [],            // ← chips en el form
  empresa_id: '',
  empresa_nombre: '',
};

// helper mapea items del back y da fallback a stockTotal
function mapItems(items) {
  return (items || []).map((m) => ({
    ...m,
    stockTotal:
      typeof m.stock === 'number'
        ? m.stock
        : (typeof m.stockTotal === 'number' ? m.stockTotal : 0),
    porProyecto: Array.isArray(m.porProyecto) ? m.porProyecto : [],
  }));
}

// columnas que exponemos en UI para ordenar -> nombre de campo que el back entiende
const ORDER_MAP = {
  nombre: 'nombre',
  descripcion: 'desc_material',
  sku: 'SKU',
  stock: 'stock',
};

const StockMateriales = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // estados de filtros/orden/paginación (server-side)
  const [nombre, setNombre] = useState('');            // 🔎 nombre
  const [descripcion, setDescripcion] = useState('');  // 🔎 descripción
  const [sku, setSku] = useState('');                  // 🔎 SKU
  const [aliasText, setAliasText] = useState('');      // 🔎 alias como texto
  const [stockFilter, setStockFilter] = useState('all'); // all | gt0 | eq0 | lt0

  const [orderBy, setOrderBy] = useState('nombre'); // nombre | descripcion | sku | stock
  const [order, setOrder] = useState('asc'); // asc | desc
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // total que llega desde el back (para paginación)
  const [total, setTotal] = useState(0);

  const { user } = useAuthContext();
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aliasInput, setAliasInput] = useState('');   // input del dialog chips

  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // construye el string sort "campo:asc|desc" para el back
  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'nombre';
    const dir = order === 'desc' ? 'desc' : 'asc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  // fetch al back en base a filtros/orden/paginación
  async function fetchAll() {
    setLoading(true);
    const startedAt = Date.now();
    try {
      const empresa = await getEmpresaDetailsFromUser(user);

      const params = {
        empresa_id: empresa.id,
        limit: rowsPerPage,
        page,                // tu back calcula skip = page * limit
        sort: sortParam,     // ej: "stock:desc"
      };

      // 🔎 filtros (solo envío si hay valor)
      if (nombre?.trim())        params.nombre        = nombre.trim();
      if (descripcion?.trim())   params.desc_material = descripcion.trim();
      if (sku?.trim())           params.SKU           = sku.trim();
      if (aliasText?.trim())     params.alias         = aliasText.trim();
      if (stockFilter !== 'all') params.stockFilter   = stockFilter; // 'gt0' | 'eq0' | 'lt0'

      const resp = await StockMaterialesService.listarMateriales(params);
      setRows(mapItems(resp.items));
      setTotal(resp.total || 0);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar materiales', severity: 'error' });
    } finally {
      // mínimo 1s de loader visible
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      if (wait) await sleep(wait);
      setLoading(false);
    }
  }

  // dispara el fetch cuando cambian filtros/orden/paginación
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, descripcion, sku, aliasText, stockFilter, sortParam, page, rowsPerPage]);

  // --- crear/editar ---
  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm({ ...emptyForm, aliasChips: [] });
    setAliasInput('');
    setOpenForm(true);
  };

  const handleOpenEdit = (row) => {
    setIsEdit(true);
    setForm({
      _id: row._id,
      nombre: row.nombre || '',
      SKU: row.SKU || '',
      desc_material: row.desc_material || '',
      aliasChips: parseAliasToChips(row.alias),       // ← chips desde DB
      empresa_id: row.empresa_id || '',
      empresa_nombre: row.empresa_nombre || '',
    });
    setAliasInput('');
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
      const empresa = await getEmpresaDetailsFromUser(user);
      const empresa_id = empresa?.id ?? form.empresa_id ?? null;
      const empresa_nombre = empresa?.nombre ?? form.empresa_nombre ?? null;

      const payload = {
        nombre: form.nombre?.trim(),
        SKU: form.SKU?.trim() || null,
        desc_material: form.desc_material?.trim() || null,
        alias: form.aliasChips && form.aliasChips.length ? form.aliasChips : null, // ← array
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

      const isLastOnPage = rows.length === 1 && page > 0;
      if (isLastOnPage) setPage((p) => Math.max(0, p - 1));
      else await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando material', severity: 'error' });
    }
  };

  // Ordenamiento por header (server-side)
  const handleRequestSort = (property) => {
    if (orderBy === property) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(property);
      setOrder('asc');
    }
    setPage(0);
  };
  const createSortHandler = (property) => (event) => {
    event.preventDefault();
    handleRequestSort(property);
  };

  // paginación
  const handleChangePage = (_evt, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (evt) => {
    setRowsPerPage(parseInt(evt.target.value, 10));
    setPage(0);
  };

  // handler chips dentro del diálogo (crear/editar)
  const onAliasFormKeyDown = (e) => {
    const raw = String(e.target.value || '');
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      const newOnes = parseAliasToChips(raw);
      if (newOnes.length) {
        setForm((f) => ({ ...f, aliasChips: [...new Set([...(f.aliasChips || []), ...newOnes])] }));
      }
      setAliasInput('');
    }
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

            {/* Filtros */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
              <Box sx={{ minWidth: 220, flex: 1 }}>
                <TextField
                  fullWidth
                  label="Nombre"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setPage(0); }}
                  placeholder="Buscar por nombre…"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start"><SearchIcon /></InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TextField
                label="Descripción"
                value={descripcion}
                onChange={(e) => { setDescripcion(e.target.value); setPage(0); }}
                sx={{ minWidth: 220 }}
                placeholder="Filtrar por descripción…"
              />

              <TextField
                label="SKU"
                value={sku}
                onChange={(e) => { setSku(e.target.value); setPage(0); }}
                sx={{ minWidth: 160 }}
                placeholder="Filtrar por SKU…"
              />

              {/* Alias como texto (filtro) */}
              <TextField
                label="Alias"
                value={aliasText}
                onChange={(e) => { setAliasText(e.target.value); setPage(0); }}
                sx={{ minWidth: 220 }}
                placeholder="Filtrar por alias…"
                helperText="Coincidencia parcial en cualquier alias"
              />

              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="stock-filter-label">Stock</InputLabel>
                <Select
                  labelId="stock-filter-label"
                  label="Stock"
                  value={stockFilter}
                  onChange={(e) => { setStockFilter(e.target.value); setPage(0); }}
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
              {/* 🔵 Barra fina de carga */}
              {loading && <LinearProgress />}

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
                  {rows.map((row) => (
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
                      <TableCell sx={{ maxWidth: 300 }}>
                        {Array.isArray(row.alias)
                          ? row.alias.length
                            ? row.alias.map((a, i) => (
                                <Chip key={`${a}-${i}`} label={a} size="small" sx={{ mr: .5, mb: .5 }} />
                              ))
                            : <em>(—)</em>
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
                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography variant="body2">Sin resultados.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* paginación server-side */}
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
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

              {/* Alias en formato chips (crear/editar) */}
              <FormControl>
                <InputLabel shrink>Alias (chips)</InputLabel>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    flexWrap: 'wrap',
                    p: 1,
                    pt: 3.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    minHeight: 56
                  }}
                >
                  {(form.aliasChips || []).map((a, idx) => (
                    <Chip
                      key={`${a}-${idx}`}
                      label={a}
                      onDelete={() => setForm(f => ({ ...f, aliasChips: removeChip(f.aliasChips, idx) }))}
                      size="small"
                    />
                  ))}
                  <TextField
                    variant="standard"
                    placeholder="Ingresa un alias (Enter , ;)"
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={onAliasFormKeyDown}
                    sx={{ minWidth: 140 }}
                  />
                </Stack>
                <FormHelperText>Se guarda como array de alias</FormHelperText>
              </FormControl>
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

        {/* 🔵 Overlay centrado mientras carga */}
        <Backdrop
          sx={{ color: '#fff', zIndex: (t) => t.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress />
        </Backdrop>
      </Box>
    </>
  );
};

StockMateriales.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default StockMateriales;
