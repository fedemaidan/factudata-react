// src/pages/stockMovimientos.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel, TablePagination, Radio, LinearProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import ClearAllIcon from '@mui/icons-material/ClearAll';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMovimientosService from '../services/stock/stockMovimientosService';
import StockMaterialesService from '../services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';

const ORDER_MAP = {
  fecha: 'fecha_movimiento',
  nombre: 'nombre_item',
  proyecto: 'proyecto_nombre',
  usuario: 'usuario_id',
  tipo: 'tipo',
  subtipo: 'subtipo',
  cantidad: 'cantidad',
  material: 'nombre_material', // ← campo persistido post conciliación
};

function formatDateUtc(d) {
  try { return new Date(d).toLocaleString(); } catch { return d || '—'; }
}

const StockMovimientos = () => {
  const { user } = useAuthContext();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // ====== filtros ======
  const [fNombre, setFNombre] = useState('');
  const [proyectos, setProyectos] = useState([]);      // [{id, nombre}]
  const [usuarios, setUsuarios] = useState([]);        // [{id, nombre, email}]
  const [fProyectoId, setFProyectoId] = useState('');
  const [fUsuarioId, setFUsuarioId] = useState('');    // 🔸 filtra por id
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fMaterial, setFMaterial] = useState('');
  const [conciliado, setConciliado] = useState('');

  const [orderBy, setOrderBy] = useState('fecha');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ====== Conciliar (popup) ======
  const [openConciliar, setOpenConciliar] = useState(false);
  const [rowToConciliar, setRowToConciliar] = useState(null);
  const [materialIdInput, setMaterialIdInput] = useState('');
  const [materialNameById, setMaterialNameById] = useState({});

  // Mini-listado de materiales dentro del popup
  const [matLoading, setMatLoading] = useState(false);
  const [matRows, setMatRows] = useState([]);
  const [matTotal, setMatTotal] = useState(0);
  const [matPage, setMatPage] = useState(0);
  const [matRpp, setMatRpp] = useState(10);
  const [matOrderBy, setMatOrderBy] = useState('nombre'); // nombre | descripcion | sku | stock
  const [matOrder, setMatOrder] = useState('asc');

  // Filtros del popup
  const [mfNombre, setMfNombre] = useState('');
  const [mfDesc, setMfDesc] = useState('');
  const [mfSku, setMfSku] = useState('');
  const [mfAlias, setMfAlias] = useState('');

  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'fecha_movimiento';
    const dir = order === 'asc' ? 'asc' : 'desc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  const matORDER_MAP = { nombre: 'nombre', descripcion: 'desc_material', sku: 'SKU', stock: 'stock' };
  const matSortParam = useMemo(() => {
    const field = matORDER_MAP[matOrderBy] || 'nombre';
    const dir = matOrder === 'desc' ? 'desc' : 'asc';
    return `${field}:${dir}`;
  }, [matOrderBy, matOrder]);

  // ====== combos ======
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);

        // ---- PROYECTOS ----
        let projsRaw = [];
        try { projsRaw = await getProyectosFromUser(user); } catch {}
        if (!Array.isArray(projsRaw) || projsRaw.length === 0) {
          try { projsRaw = await StockMovimientosService.listarProyectos({ empresa_id: empresa.id }); }
          catch { projsRaw = []; }
        }
        const normProjs = (projsRaw ?? []).map(p => ({
          id: p?.id || p?._id || p?.proyecto_id || p?.codigo,
          nombre: p?.nombre || p?.name || p?.titulo || '(sin nombre)',
        })).filter(p => p.id);
        setProyectos(normProjs);

        // ---- USUARIOS ----
        try {
          const u = await StockMovimientosService.listarUsuarios({ empresa_id: empresa.id });
          const normUsers = (u ?? []).map(x => ({
            id: x?.id,
            nombre: x?.nombre || '(sin nombre)',
            email: x?.email || '',
          })).filter(x => x.id);
          setUsuarios(normUsers);
        } catch (e) {
          console.warn('[UI] listarUsuarios falló:', e?.message || e);
          setUsuarios([]);
        }
      } catch (e) {
        console.error('Error cargando combos', e);
      }
    })();
  }, [user]);

  // ====== consulta principal ======
  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const params = {
        empresa_id: empresa.id,
        limit: rowsPerPage,
        page,
        sort: sortParam,
        ...(fNombre?.trim() ? { nombre_item: fNombre.trim() } : {}),
        ...(fProyectoId ? { proyecto_id: fProyectoId } : {}),
        ...(fUsuarioId ? { usuario_id: fUsuarioId } : {}),
        ...(fDesde ? { fecha_desde: fDesde } : {}),
        ...(fHasta ? { fecha_hasta: fHasta } : {}),
        ...(conciliado === 'true' && fMaterial.trim()
          ? { nombre_material: fMaterial.trim() } // manda ambos nombres vía service
          : {}),
        ...(conciliado !== '' ? { conciliado } : {}),
      };

      const resp = await StockMovimientosService.listarMovimientos(params);
      const items = resp.items || [];
      setRows(items);
      setTotal(resp.total || 0);

      // Resolver nombres de material si faltan (fallback)
      const faltantes = items
        .map(x => x.id_material)
        .filter(Boolean)
        .filter(id => !(id in materialNameById));
      if (faltantes.length) {
        const uniq = Array.from(new Set(faltantes));
        const fetched = await Promise.all(
          uniq.map(async (id) => {
            try {
              const mat = await StockMaterialesService.obtenerMaterialPorId(id);
              return [id, mat?.nombre || mat?.name || 'Material'];
            } catch { return [id, 'Material']; }
          })
        );
        setMaterialNameById(prev => {
          const next = { ...prev };
          fetched.forEach(([id, nombre]) => { next[id] = nombre; });
          return next;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fNombre, fProyectoId, fUsuarioId, fDesde, fHasta, fMaterial, conciliado, sortParam, page, rowsPerPage]);

  const handleRequestSort = (property) => {
    if (orderBy === property) setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(property); setOrder('asc'); }
    setPage(0);
  };
  const createSortHandler = (property) => (e) => { e.preventDefault(); handleRequestSort(property); };

  const openConciliarDialog = (row) => {
    setRowToConciliar(row);
    setMaterialIdInput(row?.id_material || '');
    setSelectedMaterialId(row?.id_material || '');
    // limpiar filtros/paginación del popup
    setMfNombre(''); setMfDesc(''); setMfSku(''); setMfAlias('');
    setMatPage(0); setMatOrderBy('nombre'); setMatOrder('asc');
    setOpenConciliar(true);
  };

  // ====== fetch materiales del popup ======
  useEffect(() => {
    if (!openConciliar || !user) return;
    (async () => {
      setMatLoading(true);
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const params = {
          empresa_id: empresa.id,
          limit: matRpp,
          page: matPage,
          sort: matSortParam,
          ...(mfNombre?.trim() ? { nombre: mfNombre.trim() } : {}),
          ...(mfDesc?.trim()   ? { desc_material: mfDesc.trim() } : {}),
          ...(mfSku?.trim()    ? { SKU: mfSku.trim() } : {}),
          ...(mfAlias?.trim()  ? { alias: mfAlias.trim() } : {}),
        };
        const resp = await StockMaterialesService.listarMateriales(params);
        setMatRows(resp.items || []);
        setMatTotal(resp.total || 0);
      } catch (e) {
        console.error('[popup] listarMateriales', e);
        setMatRows([]); setMatTotal(0);
      } finally {
        setMatLoading(false);
      }
    })();
  }, [openConciliar, user, mfNombre, mfDesc, mfSku, mfAlias, matPage, matRpp, matSortParam]);

  const doConciliar = async () => {
    try {
      const chosenId = selectedMaterialId?.trim() || materialIdInput?.trim();
      if (!rowToConciliar?._id || !chosenId) return;
      await StockMovimientosService.actualizarMovimiento(rowToConciliar._id, { id_material: chosenId });
      setOpenConciliar(false);
      setRowToConciliar(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const limpiarFiltros = () => {
    setFNombre('');
    setFProyectoId('');
    setFUsuarioId('');
    setFDesde('');
    setFHasta('');
    setFMaterial('');
    setConciliado('');
    setPage(0);
  };

  const activeChips = [
    fNombre?.trim() && { k: 'Nombre', v: fNombre, onDelete: () => setFNombre('') },
    fProyectoId && { k: 'Proyecto', v: proyectos.find(p => p.id === fProyectoId)?.nombre || fProyectoId, onDelete: () => setFProyectoId('') },
    fUsuarioId && {
      k: 'Usuario',
      v: usuarios.find(u => u.id === fUsuarioId)?.email || usuarios.find(u => u.id === fUsuarioId)?.nombre,
      onDelete: () => setFUsuarioId(''),
    },
    fDesde && { k: 'Desde', v: fDesde, onDelete: () => setFDesde('') },
    fHasta && { k: 'Hasta', v: fHasta, onDelete: () => setFHasta('') },
    conciliado === 'true' && fMaterial.trim() && { k: 'Material', v: fMaterial, onDelete: () => setFMaterial('') },
    conciliado !== '' && { k: 'Conciliación', v: conciliado === 'true' ? 'Conciliado' : 'No conciliado', onDelete: () => setConciliado('') },
  ].filter(Boolean);

  // handlers orden/pag del popup
  const matHandleRequestSort = (prop) => {
    if (matOrderBy === prop) setMatOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setMatOrderBy(prop); setMatOrder('asc'); }
    setMatPage(0);
  };
  const matCreateSortHandler = (prop) => (e) => { e.preventDefault(); matHandleRequestSort(prop); };

  return (
    <>
      <Head><title>Movimientos</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Typography variant="h4">Movimientos</Typography>

            {/* Filtros */}
            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <TextField
                    label="Nombre (item)"
                    value={fNombre}
                    onChange={(e) => { setFNombre(e.target.value); setPage(0); }}
                    placeholder="Ej. Varilla 8"
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                    sx={{ minWidth: 260, flex: 1 }}
                  />

                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id="proyecto-label">Proyecto</InputLabel>
                    <Select
                      labelId="proyecto-label"
                      label="Proyecto"
                      value={fProyectoId}
                      onChange={(e) => { setFProyectoId(e.target.value); setPage(0); }}
                    >
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {proyectos.map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id="usuario-label">Usuario</InputLabel>
                    <Select
                      labelId="usuario-label"
                      label="Usuario"
                      value={fUsuarioId}
                      onChange={(e) => { setFUsuarioId(e.target.value); setPage(0); }}
                    >
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {usuarios.map(u => (
                        <MenuItem key={u.id} value={u.id}>{u.email || u.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel id="conciliado-label">Conciliación</InputLabel>
                    <Select
                      labelId="conciliado-label"
                      label="Conciliación"
                      value={conciliado}
                      onChange={(e) => { setConciliado(e.target.value); setPage(0); }}
                    >
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      <MenuItem value="false">No conciliado</MenuItem>
                      <MenuItem value="true">Conciliado</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    type="date"
                    label="Desde"
                    InputLabelProps={{ shrink: true }}
                    value={fDesde}
                    onChange={(e) => { setFDesde(e.target.value); setPage(0); }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    type="date"
                    label="Hasta"
                    InputLabelProps={{ shrink: true }}
                    value={fHasta}
                    onChange={(e) => { setFHasta(e.target.value); setPage(0); }}
                    sx={{ minWidth: 180 }}
                  />
                  <Button onClick={limpiarFiltros} startIcon={<ClearAllIcon />} variant="outlined">Limpiar</Button>
                </Stack>

                {activeChips.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {activeChips.map((c) => (
                      <Chip key={`${c.k}-${c.v}`} label={`${c.k}: ${c.v}`} onDelete={c.onDelete} />
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

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
                      >Nombre</TableSortLabel>
                    </TableCell>
                    {/* Movidos cerca de Nombre */}
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Acciones</TableCell>

                    <TableCell>Proyecto</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Subtipo</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Conciliación</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((r) => {
                    const estaConciliado = !!(r.id_material && String(r.id_material).trim());
                    const matName =
                      r.nombre_material // ← principal persistido post conciliación
                      || r.material_nombre // ← compat
                      || (r.id_material ? materialNameById[r.id_material] : '')
                      || (estaConciliado ? '(cargando...)' : '—');

                    return (
                      <TableRow key={r._id} hover>
                        <TableCell>{r.nombre_item || '—'}</TableCell>
                        <TableCell>{matName}</TableCell>
                        <TableCell align="right">
                          {!estaConciliado ? (
                            <Button size="small" startIcon={<LinkIcon />} onClick={() => openConciliarDialog(r)} variant="outlined">
                              Conciliar
                            </Button>
                          ) : (
                            <IconButton title="Ver / cambiar conciliación" onClick={() => openConciliarDialog(r)}>
                              <LinkIcon />
                            </IconButton>
                          )}
                        </TableCell>

                        <TableCell>{r.proyecto_nombre || <em>(sin proyecto)</em>}</TableCell>
                        <TableCell>{formatDateUtc(r.fecha_movimiento)}</TableCell>
                        <TableCell>{r.usuario_nombre || r.usuario_mail || r.usuario_id || '—'}</TableCell>
                        <TableCell>{r.tipo}</TableCell>
                        <TableCell>{r.subtipo}</TableCell>
                        <TableCell align="right">{r.cantidad}</TableCell>
                        <TableCell>
                          {estaConciliado
                            ? <Chip color="success" size="small" label="CONCILIADO" />
                            : <Chip color="warning" size="small" label="NO CONCILIADO" />}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={10}>Sin resultados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* ========= D I Á L O G O   C O N C I L I A R ========= */}
      <Dialog open={openConciliar} onClose={() => setOpenConciliar(false)} fullWidth maxWidth="md">
        <DialogTitle>Conciliar material</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Filtros mini (como materiales) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
              <TextField
                label="Nombre"
                value={mfNombre}
                onChange={(e) => { setMfNombre(e.target.value); setMatPage(0); }}
                placeholder="Buscar por nombre…"
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                sx={{ minWidth: 220 }}
              />
              <TextField
                label="Descripción"
                value={mfDesc}
                onChange={(e) => { setMfDesc(e.target.value); setMatPage(0); }}
                sx={{ minWidth: 220 }}
              />
              <TextField
                label="SKU"
                value={mfSku}
                onChange={(e) => { setMfSku(e.target.value); setMatPage(0); }}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Alias"
                value={mfAlias}
                onChange={(e) => { setMfAlias(e.target.value); setMatPage(0); }}
                sx={{ minWidth: 200 }}
                helperText="Coincidencia parcial"
              />
            </Stack>

            <Paper variant="outlined">
              {matLoading && <LinearProgress />}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    <TableCell sortDirection={matOrderBy === 'nombre' ? matOrder : false}>
                      <TableSortLabel
                        active={matOrderBy === 'nombre'}
                        direction={matOrderBy === 'nombre' ? matOrder : 'asc'}
                        onClick={(e) => { e.preventDefault(); matHandleRequestSort('nombre'); }}
                      >Nombre</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={matOrderBy === 'descripcion' ? matOrder : false}>
                      <TableSortLabel
                        active={matOrderBy === 'descripcion'}
                        direction={matOrderBy === 'descripcion' ? matOrder : 'asc'}
                        onClick={(e) => { e.preventDefault(); matHandleRequestSort('descripcion'); }}
                      >Descripción</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={matOrderBy === 'sku' ? matOrder : false}>
                      <TableSortLabel
                        active={matOrderBy === 'sku'}
                        direction={matOrderBy === 'sku' ? matOrder : 'asc'}
                        onClick={(e) => { e.preventDefault(); matHandleRequestSort('sku'); }}
                      >SKU</TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={matOrderBy === 'stock' ? matOrder : false}>
                      <TableSortLabel
                        active={matOrderBy === 'stock'}
                        direction={matOrderBy === 'stock' ? matOrder : 'asc'}
                        onClick={(e) => { e.preventDefault(); matHandleRequestSort('stock'); }}
                      >Stock total</TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matRows.map((m) => {
                    const id = m._id || m.id_material || m.id || '';
                    const stock = typeof m.stock === 'number' ? m.stock : (typeof m.stockTotal === 'number' ? m.stockTotal : 0);
                    return (
                      <TableRow key={id} hover onClick={() => setSelectedMaterialId(id)} sx={{ cursor: 'pointer' }}>
                        <TableCell width={56}>
                          <Radio
                            checked={selectedMaterialId === id}
                            onChange={() => setSelectedMaterialId(id)}
                            value={id}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>{m.nombre || '(sin nombre)'}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Tooltip title={m.desc_material || ''}>
                            <Typography variant="body2" noWrap>{m.desc_material || <em>(—)</em>}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{m.SKU || <em>(—)</em>}</TableCell>
                        <TableCell align="right"><Typography fontWeight={700}>{stock}</Typography></TableCell>
                      </TableRow>
                    );
                  })}
                  {!matLoading && matRows.length === 0 && (
                    <TableRow><TableCell colSpan={5}>Sin materiales.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={matTotal}
                page={matPage}
                onPageChange={(_e, p) => setMatPage(p)}
                rowsPerPage={matRpp}
                onRowsPerPageChange={(e) => { setMatRpp(parseInt(e.target.value, 10)); setMatPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </Paper>

            {/* Fallback: pegar ID manual si hace falta */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                label="Material ID (manual)"
                value={materialIdInput}
                onChange={(e) => { setMaterialIdInput(e.target.value); setSelectedMaterialId(''); }}
                sx={{ minWidth: 280 }}
                helperText="Opcional: si ya conocés el ID exacto"
              />
              <Typography variant="body2" sx={{ opacity: .8 }}>
                Seleccionado: {selectedMaterialId || '(ninguno)'}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConciliar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={doConciliar} disabled={!selectedMaterialId && !materialIdInput}>
            Guardar conciliación
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

StockMovimientos.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default StockMovimientos;
