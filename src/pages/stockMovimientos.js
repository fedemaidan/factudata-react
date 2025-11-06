// src/pages/stockMovimientos.js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel, TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import ClearAllIcon from '@mui/icons-material/ClearAll';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMovimientosService from '../services/stock/stockMovimientosService';
import StockMaterialesService from '../services/stock/stockMaterialesService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';

const ORDER_MAP = {
  fecha: 'fecha_movimiento',
  nombre: 'nombre_item',
  proyecto: 'proyecto_nombre',
  usuario: 'usuario_mail',
  tipo: 'tipo',
  subtipo: 'subtipo',
  cantidad: 'cantidad',
  material: 'material_nombre',
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
  const [usuarios, setUsuarios] = useState([]);        // [{id, nombre}]
  const [fProyectoId, setFProyectoId] = useState('');
  const [fUsuarioId, setFUsuarioId] = useState('');
  const [fDesde, setFDesde] = useState('');            // YYYY-MM-DD
  const [fHasta, setFHasta] = useState('');            // YYYY-MM-DD
  const [fMaterial, setFMaterial] = useState('');      // Nombre del material (solo aplica si conciliado === 'true')
  // '' = TODOS, 'true' = Conciliado, 'false' = No conciliado
  const [conciliado, setConciliado] = useState('');

  // sort + paginación server-side
  const [orderBy, setOrderBy] = useState('fecha');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // diálogo Conciliar
  const [openConciliar, setOpenConciliar] = useState(false);
  const [rowToConciliar, setRowToConciliar] = useState(null);
  const [materialIdInput, setMaterialIdInput] = useState('');

  // cache de nombres de materiales para mostrar columna "Material"
  const [materialNameById, setMaterialNameById] = useState({}); // { [id]: nombre }

  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'fecha_movimiento';
    const dir = order === 'asc' ? 'asc' : 'desc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  // ====== cargar combos (proyectos/usuarios) una vez ======
  useEffect(() => {
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const [p, u] = await Promise.all([
          StockMovimientosService.listarProyectos({ empresa_id: empresa.id }),
          StockMovimientosService.listarUsuarios({ empresa_id: empresa.id }),
        ]);
        setProyectos(p || []);
        setUsuarios(u || []);
      } catch (e) {
        console.error('Error cargando combos', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== consulta principal ======
  async function fetchAll() {
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
        // Material solo si está conciliado
        ...(conciliado === 'true' && fMaterial.trim() ? { material_nombre: fMaterial.trim() } : {}),
        ...(conciliado !== '' ? { conciliado } : {}),
      };
      const resp = await StockMovimientosService.listarMovimientos(params);
      const items = resp.items || [];
      setRows(items);
      setTotal(resp.total || 0);

      // resolver nombres de material si el back no los devolvió
      const faltantes = items
        .map(x => x.id_material)
        .filter(Boolean)
        .filter(id => !(id in materialNameById));
      if (faltantes.length) {
        const uniq = Array.from(new Set(faltantes));
        const fetched = await Promise.all(
          uniq.map(async (id) => {
            try {
              const mat = await StockMaterialesService.obtenerMaterial(id);
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
  }, [fNombre, fProyectoId, fUsuarioId, fDesde, fHasta, fMaterial, conciliado, sortParam, page, rowsPerPage]);

  // ====== orden ======
  const handleRequestSort = (property) => {
    if (orderBy === property) setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(property); setOrder('asc'); }
    setPage(0);
  };
  const createSortHandler = (property) => (e) => { e.preventDefault(); handleRequestSort(property); };

  // ====== Conciliar ======
  const openConciliarDialog = (row) => {
    setRowToConciliar(row);
    setMaterialIdInput(row?.id_material || '');
    setOpenConciliar(true);
  };
  const doConciliar = async () => {
    try {
      if (!rowToConciliar?._id || !materialIdInput?.trim()) return;
      await StockMovimientosService.actualizarMovimiento(rowToConciliar._id, {
        id_material: materialIdInput.trim(),
      });
      setOpenConciliar(false);
      setRowToConciliar(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  // ====== paginación ======
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  // ====== chips & limpiar ======
  const activeChips = [
    fNombre?.trim() && { k: 'Nombre', v: fNombre, onDelete: () => setFNombre('') },
    fProyectoId && {
      k: 'Proyecto',
      v: proyectos.find(p => p.id === fProyectoId)?.nombre || fProyectoId,
      onDelete: () => setFProyectoId(''),
    },
    fUsuarioId && {
      k: 'Usuario',
      v: usuarios.find(u => u.id === fUsuarioId)?.nombre || fUsuarioId,
      onDelete: () => setFUsuarioId(''),
    },
    fDesde && { k: 'Desde', v: fDesde, onDelete: () => setFDesde('') },
    fHasta && { k: 'Hasta', v: fHasta, onDelete: () => setFHasta('') },
    conciliado === 'true' && fMaterial.trim() && { k: 'Material', v: fMaterial, onDelete: () => setFMaterial('') },
    conciliado !== '' && { k: 'Conciliación', v: conciliado === 'true' ? 'Conciliado' : 'No conciliado', onDelete: () => setConciliado('') },
  ].filter(Boolean);

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
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment> }}
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
                        <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>
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

                  <TextField
                    label="Material (conciliado)"
                    value={fMaterial}
                    onChange={(e) => { setFMaterial(e.target.value); setPage(0); }}
                    placeholder="Ej. Hierro del 8"
                    disabled={conciliado !== 'true'}
                    sx={{ minWidth: 260, flex: 1 }}
                  />
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
                  <Button onClick={limpiarFiltros} startIcon={<ClearAllIcon/>} variant="outlined">
                    Limpiar
                  </Button>
                </Stack>

                {/* Chips activos */}
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
                    <TableCell sortDirection={orderBy === 'proyecto' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'proyecto'}
                        direction={orderBy === 'proyecto' ? order : 'asc'}
                        onClick={createSortHandler('proyecto')}
                      >Proyecto</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'fecha' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'fecha'}
                        direction={orderBy === 'fecha' ? order : 'asc'}
                        onClick={createSortHandler('fecha')}
                      >Fecha</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'usuario' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'usuario'}
                        direction={orderBy === 'usuario' ? order : 'asc'}
                        onClick={createSortHandler('usuario')}
                      >Usuario</TableSortLabel>
                    </TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell sortDirection={orderBy === 'tipo' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'tipo'}
                        direction={orderBy === 'tipo' ? order : 'asc'}
                        onClick={createSortHandler('tipo')}
                      >Tipo</TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={orderBy === 'subtipo' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'subtipo'}
                        direction={orderBy === 'subtipo' ? order : 'asc'}
                        onClick={createSortHandler('subtipo')}
                      >Subtipo</TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sortDirection={orderBy === 'cantidad' ? order : false}>
                      <TableSortLabel
                        active={orderBy === 'cantidad'}
                        direction={orderBy === 'cantidad' ? order : 'asc'}
                        onClick={createSortHandler('cantidad')}
                      >Cantidad</TableSortLabel>
                    </TableCell>
                    <TableCell>Conciliación</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((r) => {
                    const estaConciliado = !!(r.id_material && String(r.id_material).trim());
                    const matName = r.material_nombre
                      || (r.id_material ? materialNameById[r.id_material] : '')
                      || (estaConciliado ? '(cargando...)' : '—');

                    return (
                      <TableRow key={r._id} hover>
                        <TableCell sx={{ maxWidth: 340 }}>
                          <Tooltip title={r.nombre_item || ''}>
                            <Typography variant="body2" noWrap fontWeight={600}>
                              {r.nombre_item || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" noWrap>
                            {r.proyecto_nombre || <em>(sin proyecto)</em>}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDateUtc(r.fecha_movimiento)}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" noWrap>{r.usuario_mail || r.usuario_id || '—'}</Typography>
                        </TableCell>

                        {/* MATERIAL */}
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Typography variant="body2" noWrap>{matName}</Typography>
                        </TableCell>

                        <TableCell>{r.tipo}</TableCell>
                        <TableCell>{r.subtipo}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{r.cantidad}</Typography>
                        </TableCell>
                        <TableCell>
                          {estaConciliado ? (
                            <Chip color="success" size="small" label="CONCILIADO" />
                          ) : (
                            <Chip color="warning" size="small" label="NO CONCILIADO" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {!estaConciliado ? (
                            <Button
                              size="small"
                              startIcon={<LinkIcon />}
                              onClick={() => openConciliarDialog(r)}
                              variant="outlined"
                            >
                              Conciliar
                            </Button>
                          ) : (
                            <IconButton title="Editar conciliación" onClick={() => openConciliarDialog(r)}>
                              <EditIcon />
                            </IconButton>
                          )}
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
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Paper>
          </Stack>
        </Container>

        {/* Conciliar diálogo */}
        <Dialog open={openConciliar} onClose={() => setOpenConciliar(false)} fullWidth maxWidth="sm">
          <DialogTitle>Conciliar movimiento</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Movimiento: <strong>{rowToConciliar?.nombre_item}</strong> — Cant.: {rowToConciliar?.cantidad}
              </Typography>
              <TextField
                label="Material ID"
                value={materialIdInput}
                onChange={(e) => setMaterialIdInput(e.target.value)}
                helperText="Ingresa el _id del material al que corresponde."
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConciliar(false)}>Cancelar</Button>
            <Button onClick={doConciliar} variant="contained">Guardar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

StockMovimientos.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default StockMovimientos;
