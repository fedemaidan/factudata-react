// src/pages/stockMateriales.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMaterialesService from '../../services/stock/stockMaterialesService';

const emptyForm = {
  _id: '',
  nombre: '',
  SKU: '',
  desc_material: '',
  alias: '',           // texto simple (podés transformarlo a array en back)
  empresa_id: '',      // opcional: si tu back lo deduce, podés omitir
};

const emptyLink = {
  movimientoId: '',
  materialId: '',
  alias: '',
};

function mergeMaterialesConStock(materiales, stockItems) {
  const mapStock = new Map();
  for (const s of stockItems || []) {
    mapStock.set(s.id_material || 'null', s);
  }
  return (materiales || []).map(m => {
    const s = mapStock.get(m._id) || mapStock.get(m.id) || mapStock.get('null') || null;
    const stockTotal = s?.stockTotal ?? 0;
    return { ...m, stockTotal, porProyecto: s?.porProyecto || [] };
  });
}

const StockMateriales = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  // alerts
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert(prev => ({ ...prev, open: false }));

  // modal crear/editar
  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // eliminar
  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // vincular movimiento
  const [openLink, setOpenLink] = useState(false);
  const [linkForm, setLinkForm] = useState(emptyLink);

  async function fetchAll() {
    setLoading(true);
    try {
      const [materiales, stock] = await Promise.all([
        StockMaterialesService.listarMateriales(),
        StockMaterialesService.listarStock(),
      ]);
      const merged = mergeMaterialesConStock(materiales, stock);
      // orden por nombre
      merged.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setRows(merged);
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al cargar materiales/stock', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(r =>
      (r.nombre || '').toLowerCase().includes(qq) ||
      (r.SKU || '').toLowerCase().includes(qq) ||
      (r.desc_material || '').toLowerCase().includes(qq)
    );
  }, [rows, q]);

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
      // si alias viene como string "a, b, c" lo enviamos tal cual;
      // tu back puede transformarlo a array o guardarlo como Mixed.
      const payload = {
        nombre: form.nombre?.trim(),
        SKU: form.SKU?.trim() || null,
        desc_material: form.desc_material?.trim() || null,
        alias: form.alias?.trim() || null,
        ...(form.empresa_id ? { empresa_id: form.empresa_id } : {}),
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

  // --- vincular movimiento→material (y alias) ---
  const openVincular = (row) => {
    setLinkForm({ movimientoId: '', materialId: row?._id || '', alias: '' });
    setOpenLink(true);
  };

  const doVincular = async () => {
    if (!linkForm.movimientoId?.trim() || !linkForm.materialId?.trim()) {
      setAlert({ open: true, message: 'Completá movimiento y material', severity: 'warning' });
      return;
    }
    try {
      await StockMaterialesService.vincularMovimientoAMaterial({
        movimientoId: linkForm.movimientoId.trim(),
        materialId: linkForm.materialId.trim(),
        alias: linkForm.alias?.trim() || undefined,
      });
      setAlert({ open: true, message: 'Movimiento vinculado', severity: 'success' });
      setOpenLink(false);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error vinculando movimiento', severity: 'error' });
    }
  };

  return (
    <>
      <Head><title>Stock de materiales</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>

            {/* Barra superior: Agregar / Eliminar */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Stock de materiales</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Agregar material
              </Button>
            </Stack>

            {/* Filtros / búsqueda rápida */}
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre / SKU / descripción…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />

            {/* Tabla */}
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Alias</TableCell>
                    <TableCell align="right">Stock total</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body1" fontWeight={600}>{row.nombre}</Typography>
                          {/* mini detalle por obra */}
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                            {(row.porProyecto || []).map(p => (
                              <Chip key={p.proyecto_id || p.proyecto_nombre || Math.random()}
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
                        <Typography fontWeight={700}>{row.stockTotal ?? 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                          <EditIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => confirmDelete(row)} aria-label="Eliminar">
                          <DeleteIcon />
                        </IconButton>
                        <Tooltip title="Vincular un movimiento a este material (y agregar alias)">
                          <IconButton onClick={() => openVincular(row)} aria-label="Vincular">
                            <LinkIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
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

        {/* Vincular movimiento → material */}
        <Dialog open={openLink} onClose={() => setOpenLink(false)} fullWidth maxWidth="sm">
          <DialogTitle>Vincular movimiento a material</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="ID del movimiento"
                value={linkForm.movimientoId}
                onChange={(e) => setLinkForm({ ...linkForm, movimientoId: e.target.value })}
                placeholder="ObjectId del movimiento sin material"
              />
              <FormControl>
                <InputLabel id="mat-id-label">Material</InputLabel>
                <Select
                  labelId="mat-id-label"
                  label="Material"
                  value={linkForm.materialId}
                  onChange={(e) => setLinkForm({ ...linkForm, materialId: e.target.value })}
                >
                  {rows.map(m => (
                    <MenuItem key={m._id} value={m._id}>
                      {m.nombre} {m.SKU ? `(${m.SKU})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Alias a agregar (opcional)"
                value={linkForm.alias}
                onChange={(e) => setLinkForm({ ...linkForm, alias: e.target.value })}
                placeholder="Si lo dejás vacío, no se agrega alias"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenLink(false)}>Cancelar</Button>
            <Button variant="contained" onClick={doVincular}>Vincular</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

StockMateriales.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default StockMateriales;
