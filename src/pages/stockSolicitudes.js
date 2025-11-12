import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableSortLabel,
  TextField, Typography, IconButton, Tooltip, Divider, Radio, LinearProgress, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import StockMovimientosService from 'src/services/stock/stockMovimientosService';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import api from 'src/services/axiosConfig';
import { getProyectosFromUser } from 'src/services/proyectosService';

const TIPO_OPCIONES = ['INGRESO', 'EGRESO', 'TRANSFERENCIA', 'AJUSTE', 'COMPRA'];
const ORDER_MAP = { fecha: 'fecha', tipo: 'tipo', subtipo: 'subtipo', responsable: 'responsable', updated: 'updatedAt' };
function fmt(d) { try { return new Date(d).toLocaleString(); } catch { return d || '—'; } }

export default function StockSolicitudes() {
  const { user } = useAuthContext();

  // ===== tabla
  const [rows, setRows] = useState([]); // [{ solicitud, movimientos }]
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(25);
  const [orderBy, setOrderBy] = useState('updated');
  const [order, setOrder] = useState('desc');

  // ===== combos
  const [usuarios, setUsuarios] = useState([]);  // [{id, nombre, email}]
  const [proyectos, setProyectos] = useState([]); // [{id, nombre}]

  // ===== filtros
  const [fTipo, setFTipo] = useState('');
  const [fSubtipo, setFSubtipo] = useState('');
  const [fResponsable, setFResponsable] = useState(''); // email
  const [fProveedor, setFProveedor] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fId, setFId] = useState(''); // lookup directo por ID

  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'updatedAt';
    const dir = order === 'asc' ? 'asc' : 'desc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  // ===== cargar usuarios y proyectos
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);

        // Usuarios (emails)
        try {
          const lista = await StockSolicitudesService.listarUsuarios({ empresa_id: empresa.id });
          const norm = (lista ?? [])
            .map(u => ({
              id: u?.id || u?.uid || u?._id,
              nombre: u?.nombre || u?.displayName || u?.name || '',
              email: u?.email || '',
            }))
            .filter(x => x.id && x.email);
          setUsuarios(norm);
        } catch (e) {
          console.warn('[UI][solicitudes] listarUsuarios', e?.message || e);
          setUsuarios([]);
        }
        
        // Proyectos
        try {
          let projsRaw = [];
          try { projsRaw = await getProyectosFromUser(user); } catch { }
          if (!Array.isArray(projsRaw) || projsRaw.length === 0) {
            try { projsRaw = await StockMovimientosService.listarProyectos({ empresa_id: empresa.id }); }
            catch { projsRaw = []; }
          }
          const normProjs = (projsRaw ?? []).map(p => ({
            id: p?.id || p?._id || p?.proyecto_id || p?.codigo,
            nombre: p?.nombre || p?.name || p?.titulo || '(sin nombre)',
          })).filter(p => p.id);
          setProyectos(normProjs);
        } catch (e) {
          console.warn('[UI][solicitudes] listarProyectos', e?.message || e);
          setProyectos([]);
        }
      } catch (e) {
        console.error('[UI][solicitudes] combos', e);
      }
    })();
  }, [user]);

  const limpiarFiltros = () => {
    setFTipo(''); setFSubtipo(''); setFResponsable('');
    setFProveedor(''); setFDesde(''); setFHasta('');
    setFId('');
    setPage(0);
  };

  const chips = [
    fTipo && { k: 'Tipo', v: fTipo, onDelete: () => setFTipo('') },
    fSubtipo && { k: 'Subtipo', v: fSubtipo, onDelete: () => setFSubtipo('') },
    fResponsable && { k: 'Responsable', v: fResponsable, onDelete: () => setFResponsable('') },
    fProveedor && { k: 'Proveedor', v: fProveedor, onDelete: () => setFProveedor('') },
    fDesde && { k: 'Desde', v: fDesde, onDelete: () => setFDesde('') },
    fHasta && { k: 'Hasta', v: fHasta, onDelete: () => setFHasta('') },
    fId && { k: 'ID', v: fId, onDelete: () => setFId('') },
  ].filter(Boolean);

  // ===== modal crear/editar
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // ===== popup para editar/agregar movimientos
  const [openMovDialog, setOpenMovDialog] = useState(false);
  const [editMovIdx, setEditMovIdx] = useState(null);
  const [movFormData, setMovFormData] = useState({
    nombre_item: '',
    cantidad: 0,
    tipo: 'EGRESO',
    subtipo: 'GENERAL',
    fecha_movimiento: '',
    proyecto_id: '',
    proyecto_nombre: '',
    observacion: '',
    id_material: '',
  });

  // ===== popup conciliar material (dentro del movimiento)
  const [openConciliarMat, setOpenConciliarMat] = useState(false);
  const [matLoading, setMatLoading] = useState(false);
  const [matRows, setMatRows] = useState([]);
  const [matTotal, setMatTotal] = useState(0);
  const [matPage, setMatPage] = useState(0);
  const [matRpp, setMatRpp] = useState(10);
  const [matOrderBy, setMatOrderBy] = useState('nombre');
  const [matOrder, setMatOrder] = useState('asc');
  const [mfNombre, setMfNombre] = useState('');
  const [mfDesc, setMfDesc] = useState('');
  const [mfSku, setMfSku] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialIdInput, setMaterialIdInput] = useState('');

  const emptyForm = {
    tipo: '', subtipo: '', fecha: '', responsable: '', // responsable = email
    proveedor_nombre: '', proveedor_id: '', proveedor_cuit: '',
    id_compra: '', url_doc: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [movs, setMovs] = useState([]);

  const patchForm = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ===== consulta principal
  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);

      if (fId?.trim()) {
        const uno = await StockSolicitudesService.obtenerSolicitud({ solicitudId: fId.trim() });
        const items = uno ? [uno] : [];
        setRows(items);
        setTotal(items.length);
        return;
      }

      const params = {
        empresa_id: empresa.id,
        sort: sortParam,
        limit: rpp,
        page,
        ...(fTipo ? { tipo: fTipo } : {}),
        ...(fSubtipo?.trim() ? { subtipo: fSubtipo.trim() } : {}),
        ...(fResponsable?.trim() ? { responsable: fResponsable.trim() } : {}),
        ...(fProveedor?.trim() ? { proveedor: fProveedor.trim() } : {}),
        ...(fDesde ? { fecha_desde: fDesde } : {}),
        ...(fHasta ? { fecha_hasta: fHasta } : {}),
      };

      const resp = await StockSolicitudesService.listarSolicitudes(params);
      setRows(resp.items || []);
      setTotal(Number(resp.total || 0));
    } catch (e) {
      console.error('[UI][solicitudes] fetchAll', e);
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fTipo, fSubtipo, fResponsable, fProveedor, fDesde, fHasta, fId, sortParam, page, rpp]);

  // ===== helpers modal
  const resetModal = () => {
    setForm(emptyForm);
    setMovs([]);
    setEditMode(false);
    setEditId(null);
  };

  const openCreate = () => {
    resetModal();
    setEditMode(false);
    setOpenModal(true);
  };

  const openEdit = (entry) => {
    // entry: { solicitud, movimientos }
    const s = entry?.solicitud || {};
    const m = Array.isArray(entry?.movimientos) ? entry.movimientos : [];

    setEditId(s._id || null);
    setEditMode(true);

    setForm({
      tipo: s.tipo || '',
      subtipo: s.subtipo || '',
      fecha: s.fecha ? String(s.fecha).substring(0, 10) : '',
      responsable: s.responsable || '', // email
      proveedor_nombre: s?.proveedor?.nombre || '',
      proveedor_id: s?.proveedor?.id || '',
      proveedor_cuit: s?.proveedor?.cuit || '',
      id_compra: s.id_compra || '',
      url_doc: s.url_doc || ''
    });

    const normMovs = m.map(mm => ({
      nombre_item: mm?.nombre_item || '',
      cantidad: mm?.cantidad ?? 0,
      tipo: mm?.tipo || 'EGRESO',
      subtipo: mm?.subtipo || 'GENERAL',
      fecha_movimiento: mm?.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
      proyecto_id: mm?.proyecto_id || '',
      proyecto_nombre: mm?.proyecto_nombre || '',
      observacion: mm?.observacion || '',
      _id: mm?._id || undefined,
    }));
    setMovs(normMovs);

    setOpenModal(true);
  };

  // ===== crear / actualizar
  const agregarMovimientoVacio = () => {
    setMovs(prev => [...prev, {
      nombre_item: '', cantidad: 0, tipo: 'EGRESO', subtipo: 'GENERAL',
      fecha_movimiento: '', proyecto_id: '', proyecto_nombre: '', observacion: ''
    }]);
  };
  const patchMov = (idx, k, v) => setMovs(prev => prev.map((m, i) => i === idx ? { ...m, [k]: v } : m));
  const quitarMov = (idx) => setMovs(prev => prev.filter((_, i) => i !== idx));

  // Eliminar movimiento: si tiene _id y estamos editando, llamar al backend antes de quitarlo de la UI
  const handleQuitarMov = async (idx) => {
    const m = movs[idx];
    // si no existe _id o no estamos en editMode, sólo quitar localmente
    if (!m?._id || !editMode) {
      quitarMov(idx);
      return;
    }

    const id = m._id;
    try {
     // preferir método del servicio si existe
      if (StockMovimientosService && typeof StockMovimientosService.remove === 'function') {
        await StockMovimientosService.remove(id);
      } else {
        // fallback directo al API
        await api.delete(`/movimiento-material/${id}`);
      }
     // si la llamada fue ok, quitar de la UI
      quitarMov(idx);
    } catch (err) {
      console.error('[UI][solicitudes] remove movimiento error', err?.response || err);
      alert('No se pudo eliminar el movimiento en el servidor. Revisá la consola para más detalles.');
    }
  };

  // Abrir popup para agregar movimiento
  const openAddMovDialog = () => {
    setEditMovIdx(null);
    setMovFormData({
      nombre_item: '',
      cantidad: 0,
      tipo: 'EGRESO',
      subtipo: 'GENERAL',
      fecha_movimiento: '',
      proyecto_id: '',
      proyecto_nombre: '',
      observacion: '',
    });
    setOpenMovDialog(true);
  };

  // Abrir popup para editar movimiento existente
  const openEditMovDialog = (idx) => {
    setEditMovIdx(idx);
    setMovFormData({ ...movs[idx] });
    setOpenMovDialog(true);
  };

  // Guardar movimiento (agregar o actualizar)
  const saveMovimiento = () => {
    if (editMovIdx === null) {
      // Agregar nuevo
      setMovs(prev => [...prev, movFormData]);
    } else {
      // Actualizar existente
      setMovs(prev => prev.map((m, i) => i === editMovIdx ? movFormData : m));
    }
    setOpenMovDialog(false);
  };

  // Patch para el formulario del popup
  const patchMovForm = (k, v) => setMovFormData(prev => ({ ...prev, [k]: v }));

  const matORDER_MAP = { nombre: 'nombre', descripcion: 'desc_material', sku: 'SKU', stock: 'stock' };
  const matSortParam = useMemo(() => {
    const field = matORDER_MAP[matOrderBy] || 'nombre';
    const dir = matOrder === 'desc' ? 'desc' : 'asc';
    return `${field}:${dir}`;
  }, [matOrderBy, matOrder]);

  // Fetch materiales del popup de conciliación
  useEffect(() => {
    if (!openConciliarMat || !user) return;
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
          ...(mfDesc?.trim() ? { desc_material: mfDesc.trim() } : {}),
          ...(mfSku?.trim() ? { SKU: mfSku.trim() } : {}),
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
  }, [openConciliarMat, user, mfNombre, mfDesc, mfSku, matPage, matRpp, matSortParam]);

  // Abrir popup de conciliación dentro del movimiento
  const openConciliarMatDialog = () => {
    setSelectedMaterialId(movFormData.id_material || '');
    setMaterialIdInput(movFormData.id_material || '');
    setMfNombre('');
    setMfDesc('');
    setMfSku('');
    setMatPage(0);
    setMatOrderBy('nombre');
    setMatOrder('asc');
    setOpenConciliarMat(true);
  };

  // Guardar selección de material
  const saveMaterialSelection = () => {
    const chosenId = selectedMaterialId?.trim() || materialIdInput?.trim();
    if (chosenId) {
      patchMovForm('id_material', chosenId);
    }
    setOpenConciliarMat(false);
  };

  const matHandleRequestSort = (prop) => {
    if (matOrderBy === prop) setMatOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setMatOrderBy(prop); setMatOrder('asc'); }
    setMatPage(0);
  };
  const matCreateSortHandler = (prop) => (e) => { e.preventDefault(); matHandleRequestSort(prop); };

  const guardarSolicitud = async () => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      const empresa = await getEmpresaDetailsFromUser(user);

      // Normalizar movimientos para el payload (sin _id para creación)
      console.log('[UI] movs raw =', movs);
      const movimientosPayload = (movs || [])
        .filter(m => (m?.nombre_item?.trim() && Number(m?.cantidad)))
        .map(m => ({
          empresa_id: empresa.id,
          usuario_id: user?.uid || user?.id || null,
          usuario_mail: user?.email || null,
          // también registrar cada movimiento normalizado para debug
          // (no cambiar comportamiento de envío)
        nombre_item: m.nombre_item.trim(),
          cantidad: Number(m.cantidad),
          tipo: String(m.tipo || 'EGRESO').toUpperCase(),
          subtipo: m.subtipo ? String(m.subtipo).toUpperCase() : null,
          fecha_movimiento: m.fecha_movimiento || form?.fecha || new Date().toISOString(),
          proyecto_id: m.proyecto_id || null,
          proyecto_nombre: m.proyecto_nombre || null,
          observacion: m.observacion || null,
          id_material: m.id_material ?? null,
        }));
      console.log('[UI] movimientosPayload =', movimientosPayload);
      // opcional: avisar si no hay movimientos (puedes quitar el alert si no lo quieres)
      if (movimientosPayload.length === 0) {
        console.warn('[UI] No se incluirán movimientos en el payload. Asegurate de completar "nombre ítem" y cantidad > 0 en al menos un movimiento.');
      }

      const payload = {
        solicitud: {
          empresa_id: empresa.id,
          tipo: form?.tipo || 'INGRESO',
          subtipo: form?.subtipo?.trim() || '-',
          responsable: form?.responsable?.trim() || null,
          proveedor: (form?.proveedor_nombre || form?.proveedor_id || form?.proveedor_cuit)
            ? { id: form.proveedor_id || null, nombre: form.proveedor_nombre || null, cuit: form.proveedor_cuit || null }
            : null,
          id_compra: form?.id_compra?.trim() || null,
          url_doc: form?.url_doc?.trim() || null,
          fecha: form?.fecha || new Date().toISOString(),
        },
        movimientos: movimientosPayload,
      };

      let resp;
      if (editMode) {
        // mantener el flujo de edición existente (servicio centralizado)
        resp = await StockSolicitudesService.guardarSolicitud({
          user,
          form,
          movs,
          editMode,
          editId
        });
      } else {
        // creación: usar explícitamente crearSolicitud
        resp = await StockSolicitudesService.crearSolicitud(payload);
      }

      // cerrar y resetear modal
      setOpenModal(false);
      resetModal();

      const createdId = resp?.solicitud?._id || resp?._id;
      if (editMode) {
        await fetchAll();
      } else {
        if (createdId) setFId(createdId);
        else await fetchAll();
      }
    } catch (e) {
      console.error('[UI] guardarSolicitud', e);
      alert(e?.message || 'Error al guardar la solicitud');
    }
  };

  // helper para seleccionar proyecto en una fila
  const ProyectoSelector = ({ valueId, onChange }) => (
    <FormControl size="medium" sx={{ minWidth: 220 }}>
      <InputLabel id="proy-sel">Proyecto</InputLabel>
      <Select
        labelId="proy-sel"
        label="Proyecto"
        value={valueId || ''}
        onChange={(e) => {
          const id = e.target.value;
          const p = proyectos.find(pp => pp.id === id);
          onChange({ id, nombre: p?.nombre || '' });
        }}
      >
        <MenuItem value=""><em>(sin proyecto)</em></MenuItem>
        {proyectos.map(p => (
          <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  // Eliminar solicitud completa (con todos sus movimientos)
  const handleEliminarSolicitud = async (solicitudId) => {
    if (!window.confirm('¿Eliminar esta solicitud y todos sus movimientos?')) return;

    try {
      await StockSolicitudesService.eliminarSolicitud(solicitudId);
      // si fue ok, recargar la lista
      await fetchAll();
    } catch (err) {
      console.error('[UI][solicitudes] eliminar solicitud error', err?.response || err);
      alert('No se pudo eliminar la solicitud. Revisá la consola para más detalles.');
    }
  };

  return (
    <>
      <Head><title>Solicitudes</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Solicitudes</Typography>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
                Nueva solicitud
              </Button>
            </Stack>

            {/* Filtros */}
            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="tipo-label">Tipo</InputLabel>
                    <Select labelId="tipo-label" label="Tipo" value={fTipo} onChange={(e) => { setFTipo(e.target.value); setPage(0); }}>
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {TIPO_OPCIONES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <TextField label="Subtipo" value={fSubtipo} onChange={(e) => { setFSubtipo(e.target.value); setPage(0); }} sx={{ minWidth: 200 }} />

                  <FormControl sx={{ minWidth: 220 }}>
                    <InputLabel id="responsable-label">Responsable (email)</InputLabel>
                    <Select
                      labelId="responsable-label"
                      label="Responsable (email)"
                      value={fResponsable}
                      onChange={(e) => { setFResponsable(e.target.value); setPage(0); }}
                    >
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {usuarios.map((u) => (
                        <MenuItem key={u.id} value={u.email}>{u.email}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField label="Proveedor" value={fProveedor} onChange={(e) => { setFProveedor(e.target.value); setPage(0); }} sx={{ minWidth: 220 }} helperText="Coincidencia parcial por nombre" />
                  <TextField label="ID solicitud" value={fId} onChange={(e) => { setFId(e.target.value); setPage(0); }} sx={{ minWidth: 180 }} />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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

                {chips.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {chips.map(c => <Chip key={`${c.k}-${c.v}`} label={`${c.k}: ${c.v}`} onDelete={c.onDelete} />)}
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Tabla */}
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Subtipo</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Actualizado</TableCell>
                    <TableCell align="right">Movs</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rows || []).map((e) => {
                    const s = e?.solicitud || {};
                    const movsArr = Array.isArray(e?.movimientos) ? e.movimientos : [];
                    const prov = s?.proveedor?.nombre || s?.proveedor?.id || s?.proveedor || '—';
                    return (
                      <TableRow
                        key={s._id}
                        hover
                      >
                        <TableCell>{s.tipo}</TableCell>
                        <TableCell>{s.subtipo}</TableCell>
                        <TableCell>{s.responsable || '—'}</TableCell>
                        <TableCell>{prov}</TableCell>
                        <TableCell>{fmt(s.fecha)}</TableCell>
                        <TableCell>{fmt(s.updatedAt)}</TableCell>
                        <TableCell align="right">{movsArr.length}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton onClick={() => openEdit(e)} size="small">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton onClick={(e) => { e.stopPropagation(); handleEliminarSolicitud(s._id); }} size="small" color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!loading && (!rows || rows.length === 0) && (
                    <TableRow><TableCell colSpan={8}>Sin resultados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_e, p) => setPage(p)}
                rowsPerPage={rpp}
                onRowsPerPageChange={(e) => { setRpp(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* ======= CREAR / EDITAR ======= */}
      <Dialog
        open={openModal}
        onClose={() => { setOpenModal(false); resetModal(); }}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: '100%', maxWidth: 1200 } }}
      >
        <DialogTitle>{editMode ? 'Editar solicitud' : 'Nueva solicitud'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="ntipo">Tipo</InputLabel>
                <Select labelId="ntipo" label="Tipo" value={form.tipo} onChange={(e) => patchForm('tipo', e.target.value)}>
                  {TIPO_OPCIONES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField label="Subtipo" value={form.subtipo} onChange={(e) => patchForm('subtipo', e.target.value)} sx={{ minWidth: 200 }} />
              <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {usuarios.length > 0 ? (
                <FormControl sx={{ minWidth: 300 }}>
                  <InputLabel id="nresponsable">Responsable (email)</InputLabel>
                  <Select
                    labelId="nresponsable"
                    label="Responsable (email)"
                    value={form.responsable || ''}
                    onChange={(e) => patchForm('responsable', e.target.value)}
                  >
                    <MenuItem value=""><em>(sin asignar)</em></MenuItem>
                    {usuarios.map((u) => (
                      <MenuItem key={u.id} value={u.email}>{u.email}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField label="Responsable (email)" value={form.responsable} onChange={(e) => patchForm('responsable', e.target.value)} sx={{ minWidth: 300 }} />
              )}

              <TextField label="Proveedor (nombre)" value={form.proveedor_nombre} onChange={(e) => patchForm('proveedor_nombre', e.target.value)} sx={{ minWidth: 280 }} />
              <TextField label="Proveedor (CUIT)" value={form.proveedor_cuit} onChange={(e) => patchForm('proveedor_cuit', e.target.value)} sx={{ minWidth: 220 }} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField label="ID Compra" value={form.id_compra} onChange={(e) => patchForm('id_compra', e.target.value)} sx={{ minWidth: 220 }} />
              <TextField label="URL doc" value={form.url_doc} onChange={(e) => patchForm('url_doc', e.target.value)} sx={{ minWidth: 420 }} />
            </Stack>

            <Divider sx={{ my: 1 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Movimientos</Typography>
              <Button onClick={openAddMovDialog} startIcon={<AddIcon />}>Agregar movimiento</Button>
            </Stack>

            {/* Lista resumida de movimientos */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>NOMBRE ÍTEM</TableCell>
                    <TableCell align="right">CANTIDAD</TableCell>
                    <TableCell>TIPO</TableCell>
                    <TableCell>PROYECTO</TableCell>
                    <TableCell>FECHA</TableCell>
                    <TableCell align="right">ACCIONES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movs.map((m, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{m.nombre_item || '—'}</TableCell>
                      <TableCell align="right">{m.cantidad}</TableCell>
                      <TableCell>{m.tipo}</TableCell>
                      <TableCell>{m.proyecto_nombre || '—'}</TableCell>
                      <TableCell>{m.fecha_movimiento || '—'}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton onClick={() => openEditMovDialog(idx)} size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton onClick={() => handleQuitarMov(idx)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movs.length === 0 && (
                    <TableRow><TableCell colSpan={6}><em>Sin movimientos. Agregá al menos uno (opcional).</em></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpenModal(false); resetModal(); }}>Cancelar</Button>
          <Button variant="contained" onClick={guardarSolicitud}>{editMode ? 'Guardar cambios' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

     {/* ========= POPUP EDITAR/AGREGAR MOVIMIENTO ========= */}
     <Dialog open={openMovDialog} onClose={() => setOpenMovDialog(false)} fullWidth maxWidth="md">
       <DialogTitle>{editMovIdx === null ? 'Agregar movimiento' : 'Editar movimiento'}</DialogTitle>
       <DialogContent>
         <Stack spacing={2} sx={{ mt: 2 }}>
           <TextField
             label="Nombre del ítem"
             value={movFormData.nombre_item}
             onChange={(e) => patchMovForm('nombre_item', e.target.value)}
             fullWidth
             required
           />

           <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
             <TextField
               type="number"
               label="Cantidad"
               value={movFormData.cantidad}
               onChange={(e) => patchMovForm('cantidad', e.target.value)}
               sx={{ flex: 1 }}
               required
             />

             <FormControl sx={{ flex: 1 }}>
               <InputLabel id="tipo-mov">Tipo</InputLabel>
               <Select
                 labelId="tipo-mov"
                 label="Tipo"
                 value={movFormData.tipo}
                 onChange={(e) => patchMovForm('tipo', e.target.value)}
               >
                 <MenuItem value="EGRESO">EGRESO</MenuItem>
                 <MenuItem value="INGRESO">INGRESO</MenuItem>
                 <MenuItem value="TRANSFERENCIA">TRANSFERENCIA</MenuItem>
                 <MenuItem value="AJUSTE">AJUSTE</MenuItem>
               </Select>
             </FormControl>
           </Stack>

           <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
             <TextField
               label="Subtipo"
               value={movFormData.subtipo}
               onChange={(e) => patchMovForm('subtipo', e.target.value)}
               sx={{ flex: 1 }}
             />

             <TextField
               type="date"
               label="Fecha"
               InputLabelProps={{ shrink: true }}
               value={movFormData.fecha_movimiento}
               onChange={(e) => patchMovForm('fecha_movimiento', e.target.value)}
               sx={{ flex: 1 }}
             />
           </Stack>

           <ProyectoSelector
             valueId={movFormData.proyecto_id}
             onChange={({ id, nombre }) => {
               patchMovForm('proyecto_id', id);
               patchMovForm('proyecto_nombre', nombre);
             }}
           />

           <TextField
             label="Observación"
             value={movFormData.observacion}
             onChange={(e) => patchMovForm('observacion', e.target.value)}
             fullWidth
             multiline
             rows={3}
           />

          {/* Sección: Material */}
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1">Material</Typography>
            <Button onClick={openConciliarMatDialog} startIcon={<LinkIcon />} variant="outlined" size="small">
              {movFormData.id_material ? 'Cambiar material' : 'Conciliar material'}
            </Button>
          </Stack>

          <TextField
            label="Material ID"
            value={movFormData.id_material || ''}
            onChange={(e) => patchMovForm('id_material', e.target.value)}
            fullWidth
            helperText="Se rellena automáticamente al seleccionar un material"
            disabled
          />
         </Stack>
       </DialogContent>
       <DialogActions sx={{ px: 3, pb: 2 }}>
         <Button onClick={() => setOpenMovDialog(false)}>Cancelar</Button>
         <Button variant="contained" onClick={saveMovimiento}>
           {editMovIdx === null ? 'Agregar' : 'Guardar cambios'}
         </Button>
       </DialogActions>
     </Dialog>

    {/* ========= POPUP CONCILIAR MATERIAL (dentro del movimiento) ========= */}
    <Dialog open={openConciliarMat} onClose={() => setOpenConciliarMat(false)} fullWidth maxWidth="md">
      <DialogTitle>Seleccionar material</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Filtros */}
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
          </Stack>

          {/* Tabla de materiales */}
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
                      onClick={matCreateSortHandler('nombre')}
                    >Nombre</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={matOrderBy === 'descripcion' ? matOrder : false}>
                    <TableSortLabel
                      active={matOrderBy === 'descripcion'}
                      direction={matOrderBy === 'descripcion' ? matOrder : 'asc'}
                      onClick={matCreateSortHandler('descripcion')}
                    >Descripción</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={matOrderBy === 'sku' ? matOrder : false}>
                    <TableSortLabel
                      active={matOrderBy === 'sku'}
                      direction={matOrderBy === 'sku' ? matOrder : 'asc'}
                      onClick={matCreateSortHandler('sku')}
                    >SKU</TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={matOrderBy === 'stock' ? matOrder : false}>
                    <TableSortLabel
                      active={matOrderBy === 'stock'}
                      direction={matOrderBy === 'stock' ? matOrder : 'asc'}
                      onClick={matCreateSortHandler('stock')}
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
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{m.nombre || '(sin nombre)'}</Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
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

          {/* Fallback: Material ID manual */}
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
        <Button onClick={() => setOpenConciliarMat(false)}>Cancelar</Button>
        <Button variant="contained" onClick={saveMaterialSelection} disabled={!selectedMaterialId && !materialIdInput}>
          Seleccionar material
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

StockSolicitudes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
