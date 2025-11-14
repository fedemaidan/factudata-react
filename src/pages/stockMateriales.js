import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel, TablePagination, FormHelperText, LinearProgress, Backdrop, CircularProgress,
  Collapse, Tabs, Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImportExportIcon from '@mui/icons-material/ImportExport';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMaterialesService from '../services/stock/stockMaterialesService';
import ExportarStock from '../components/stock/ExportarStock';
import ImportarStock from '../components/stock/ImportarStock';
import AjusteStockService from '../services/stock/ajusteStockService';

import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
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
  categoria: '',
  subcategoria: '',
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

// Helper para obtener estado de stock
const getStockStatus = (stock) => {
  if (stock <= 0) return { color: 'error', label: 'Sin Stock', icon: WarningIcon };
  return { color: 'success', label: 'En Stock', icon: CheckCircleIcon };
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

  // Estados para expansión de filas y tabs
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentTab, setCurrentTab] = useState('general');
  const [proyectos, setProyectos] = useState([]);

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

  // Estados para exportar/importar
  const [openExportar, setOpenExportar] = useState(false);
  const [openImportar, setOpenImportar] = useState(false);

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

  // Función toggle expand para filas
  const toggleRowExpansion = (materialId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

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
      categoria: row.categoria || '',
      subcategoria: row.subcategoria || '',
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
        categoria: form.categoria?.trim() || null,
        subcategoria: form.subcategoria?.trim() || null,
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

  // Cargar proyectos del usuario para el filtro y tabs
  useEffect(() => {
    const loadProyectos = async () => {
      try {
        if (!user) return;
        
        // Obtener proyectos reales del usuario (mismo patrón que stockSolicitudes.js)
        let projsRaw = [];
        try {
          projsRaw = await getProyectosFromUser(user);
        } catch (e) {
          console.warn('[stockMateriales] Error obteniendo proyectos del usuario:', e);
          projsRaw = [];
        }
        
        const normProjs = (projsRaw || []).map(p => ({
          id: p?.id || p?._id || p?.proyecto_id || p?.codigo,
          nombre: p?.nombre || p?.name || p?.titulo || '(sin nombre)',
        })).filter(p => p.id);
        
        setProyectos(normProjs);
        
      } catch (e) {
        console.error('Error cargando proyectos', e);
        setProyectos([]);
      }
    };
    loadProyectos();
  }, [user]);

  // Componente TabPanel
  const TabPanel = ({ children, value, index }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        style={{ width: '100%' }}
      >
        {value === index && children}
      </div>
    );
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

  // Función para manejar la confirmación de ajustes desde la importación
  const handleConfirmAjustes = async (ajustes) => {
    try {
      // Validar ajustes antes de procesar
      const validacion = AjusteStockService.validarAjustes(ajustes);
      if (!validacion.validos) {
        const erroresTexto = validacion.errores
          .map(err => `${err.material}: ${err.errores.join(', ')}`)
          .join('\n');
        throw new Error(`Errores de validación:\n${erroresTexto}`);
      }

      // Procesar ajustes
      const resultado = await AjusteStockService.procesarAjustes(ajustes, user);
      
      // Mostrar resultado
      const mensaje = `Procesamiento completo: ${resultado.exitosos} ajustes exitosos, ${resultado.errores.length} errores`;
      setAlert({ 
        open: true, 
        message: mensaje, 
        severity: resultado.errores.length > 0 ? 'warning' : 'success' 
      });

      // Recargar datos si hubo ajustes exitosos
      if (resultado.exitosos > 0) {
        await fetchAll();
      }

      // Log errores si los hay
      if (resultado.errores.length > 0) {
        console.error('Errores en ajustes:', resultado.errores);
      }

    } catch (error) {
      console.error('Error confirmando ajustes:', error);
      setAlert({ 
        open: true, 
        message: `Error procesando ajustes: ${error.message}`, 
        severity: 'error' 
      });
      throw error; // Re-throw para que el componente ImportarStock pueda manejarlo
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
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="outlined" 
                  startIcon={<ImportExportIcon />}
                  onClick={() => setOpenExportar(true)}
                  color="primary"
                >
                  Exportar
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<UploadFileIcon />}
                  onClick={() => setOpenImportar(true)}
                  color="secondary"
                >
                  Importar
                </Button>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                  Agregar material
                </Button>
              </Stack>
            </Stack>

            {/* Sistema de Tabs */}
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                  <Tab label="General" value="general" />
                  <Tab label="Sin asignar" value="sin-asignar" />
                  {proyectos.map(proyecto => (
                    <Tab 
                      key={proyecto.id} 
                      label={proyecto.nombre} 
                      value={proyecto.id}
                    />
                  ))}
                </Tabs>
              </Box>

              <TabPanel value={currentTab} index="general">
                <Stack spacing={3} sx={{ mt: 2 }}>
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

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="stock-filter-label">Estado Stock</InputLabel>
                <Select
                  labelId="stock-filter-label"
                  label="Estado Stock"
                  value={stockFilter}
                  onChange={(e) => { setStockFilter(e.target.value); setPage(0); }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="eq0">
                    <Box display="flex" alignItems="center" gap={1}>
                      <WarningIcon color="error" fontSize="small" />
                      Sin Stock
                    </Box>
                  </MenuItem>
                  <MenuItem value="gt0">
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      Con Stock
                    </Box>
                  </MenuItem>
                  </Select>
                </FormControl>
              </Stack>            {/* Tabla */}
            <Paper>
              {/* 🔵 Barra fina de carga */}
              {loading && <LinearProgress />}

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={60}>
                      {/* Columna para expansión */}
                    </TableCell>
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
                    <TableCell>Último Proveedor</TableCell>
                    <TableCell>Última Fecha</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => [
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleRowExpansion(row._id)}
                          >
                            {expandedRows.has(row._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                          <Tooltip title={`Stock en ${(row.porProyecto || []).length} proyectos`}>
                            <Chip 
                              label={`${(row.porProyecto || []).length} proyectos`}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight={600}>{row.nombre}</Typography>
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
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                          {(() => {
                            const stockValue = typeof row.stock === 'number' ? row.stock : (row.stockTotal ?? 0);
                            const status = getStockStatus(stockValue);
                            const IconComponent = status.icon;
                            return (
                              <Box display="flex" alignItems="center" gap={1}>
                                <IconComponent 
                                  color={status.color} 
                                  fontSize="small" 
                                />
                                <Typography 
                                  variant="body1" 
                                  fontWeight="bold"
                                  color={status.color === 'error' ? 'error.main' : 'success.main'}
                                >
                                  {stockValue}
                                </Typography>
                              </Box>
                            );
                          })()} 
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.ultimoProveedor || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.ultimaFechaMovimiento ? 
                            new Date(row.ultimaFechaMovimiento).toLocaleDateString('es-ES') : 
                            '—'
                          }
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
                    </TableRow>,
                    expandedRows.has(row._id) && (
                      <TableRow key={`${row._id}-expanded`}>
                        <TableCell colSpan={9} sx={{ py: 0 }}>
                          <Collapse in={expandedRows.has(row._id)}>
                            <Box sx={{ margin: 1 }}>
                              <Typography variant="h6" gutterBottom>
                                Stock por Proyecto
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Proyecto</TableCell>
                                    <TableCell align="right">Stock</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(row.porProyecto || []).map((proj) => (
                                    <TableRow key={proj.proyecto_id}>
                                      <TableCell>{proj.proyecto_nombre}</TableCell>
                                      <TableCell align="right">
                                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                          {(() => {
                                            const stockValue = proj.stock || proj.cantidad || 0;
                                            const isError = stockValue <= 0;
                                            const IconComponent = isError ? WarningIcon : CheckCircleIcon;
                                            return (
                                              <Box display="flex" alignItems="center" gap={1}>
                                                <IconComponent 
                                                  color={isError ? 'error' : 'success'} 
                                                  fontSize="small" 
                                                />
                                                <Typography 
                                                  variant="body1" 
                                                  fontWeight="bold"
                                                  color={isError ? 'error.main' : 'success.main'}
                                                >
                                                  {stockValue}
                                                </Typography>
                                              </Box>
                                            );
                                          })()} 
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {(row.porProyecto || []).length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={2}>
                                        <Typography variant="body2" color="text.secondary">
                                          No hay stock distribuido por proyectos
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )
                  ]).flat()}
                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9}>
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
              </TabPanel>

              {/* Tab para materiales sin proyecto asignado */}
              <TabPanel value={currentTab} index="sin-asignar">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <Typography variant="h6">
                    Materiales sin proyecto asignado
                  </Typography>
                  
                  {/* Tabla filtrada por materiales sin proyecto */}
                  <Paper>
                    {loading && <LinearProgress />}
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Descripción</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Stock Sin Asignar</TableCell>
                          <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          // Debug: agregar logs para entender los datos
                          console.log('🔍 [Debug] rows en sin-asignar:', rows.length);
                          console.log('🔍 [Debug] sample row:', rows[0]);
                          
                          const materialesConStockSinAsignar = rows.filter(row => {
                            // Buscar específicamente proyectos con ID "SIN_ASIGNAR" o que tengan stock sin asignar
                            const tieneStockSinAsignar = (row.porProyecto || []).some(p => 
                              (p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null) && (p.stock || 0) > 0
                            );
                            
                            console.log(`🔍 [Debug] ${row.nombre}: tieneStockSinAsignar=${tieneStockSinAsignar}, porProyecto:`, row.porProyecto);
                            
                            return tieneStockSinAsignar;
                          });
                          
                          console.log('🔍 [Debug] materialesConStockSinAsignar:', materialesConStockSinAsignar.length);
                          
                          if (materialesConStockSinAsignar.length === 0 && !loading) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  <Typography variant="body2">No hay materiales con stock sin asignar a proyectos.</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Total de materiales: {rows.length}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          return materialesConStockSinAsignar.map((row) => {
                            // Encontrar el stock sin asignar
                            const stockSinAsignar = (row.porProyecto || [])
                              .filter(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null)
                              .reduce((sum, p) => sum + (p.stock || 0), 0);
                            
                            return (
                              <TableRow key={row._id} hover>
                                <TableCell>
                                  <Typography variant="body1" fontWeight={600}>{row.nombre}</Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 280 }}>
                                  <Tooltip title={row.desc_material || ''}>
                                    <Typography variant="body2" noWrap>
                                      {row.desc_material || <em>(—)</em>}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>{row.SKU || <em>(—)</em>}</TableCell>
                                <TableCell align="right">
                                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                    {(() => {
                                      const isError = stockSinAsignar <= 0;
                                      const IconComponent = isError ? WarningIcon : CheckCircleIcon;
                                      return (
                                        <Box display="flex" alignItems="center" gap={1}>
                                          <IconComponent 
                                            color={isError ? 'error' : 'success'} 
                                            fontSize="small" 
                                          />
                                          <Typography 
                                            variant="body1" 
                                            fontWeight="bold"
                                            color={isError ? 'error.main' : 'warning.main'}
                                          >
                                            {stockSinAsignar}
                                          </Typography>
                                        </Box>
                                      );
                                    })()} 
                                    <Typography variant="caption" color="text.secondary">
                                      (sin proyecto asignado)
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                                    <EditIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </Paper>
                </Stack>
              </TabPanel>

              {/* Tab para cada proyecto */}
              {proyectos.map(proyecto => (
                <TabPanel key={proyecto.id} value={currentTab} index={proyecto.id}>
                  <Stack spacing={3} sx={{ mt: 2 }}>
                    <Typography variant="h6">
                      Stock en {proyecto.nombre}
                    </Typography>
                    
                    {/* Misma tabla pero filtrada por proyecto */}
                    <Paper>
                      {loading && <LinearProgress />}
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell>SKU</TableCell>
                            <TableCell align="right">Stock en Proyecto</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.filter(row => 
                            (row.porProyecto || []).some(p => p.proyecto_id === proyecto.id)
                          ).map((row) => {
                            const proyectoStock = (row.porProyecto || []).find(p => p.proyecto_id === proyecto.id);
                            return (
                              <TableRow key={row._id} hover>
                                <TableCell>
                                  <Typography variant="body1" fontWeight={600}>{row.nombre}</Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 280 }}>
                                  <Tooltip title={row.desc_material || ''}>
                                    <Typography variant="body2" noWrap>
                                      {row.desc_material || <em>(—)</em>}
                                    </Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>{row.SKU || <em>(—)</em>}</TableCell>
                                <TableCell align="right">
                                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                    {(() => {
                                      const stockValue = proyectoStock?.stock || proyectoStock?.cantidad || 0;
                                      const isError = stockValue <= 0;
                                      const IconComponent = isError ? WarningIcon : CheckCircleIcon;
                                      return (
                                        <Box display="flex" alignItems="center" gap={1}>
                                          <IconComponent 
                                            color={isError ? 'error' : 'success'} 
                                            fontSize="small" 
                                          />
                                          <Typography 
                                            variant="body1" 
                                            fontWeight="bold"
                                            color={isError ? 'error.main' : 'success.main'}
                                          >
                                            {stockValue}
                                          </Typography>
                                        </Box>
                                      );
                                    })()} 
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton color="primary" onClick={() => handleOpenEdit(row)} aria-label="Editar">
                                    <EditIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {rows.filter(row => 
                            (row.porProyecto || []).some(p => p.proyecto_id === proyecto.id)
                          ).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <Typography variant="body2">Sin materiales en este proyecto.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Stack>
                </TabPanel>
              ))}
            </Box>
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
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Categoría"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  fullWidth
                  placeholder="Ej: Ferretería, Electricidad, etc."
                />
                <TextField
                  label="Subcategoría"
                  value={form.subcategoria}
                  onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
                  fullWidth
                  placeholder="Ej: Tornillos, Cables, etc."
                />
              </Stack>

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

        {/* Diálogo Exportar Stock */}
        <ExportarStock
          open={openExportar}
          onClose={() => setOpenExportar(false)}
          materiales={rows}
          proyectos={proyectos}
          user={user}
        />

        {/* Diálogo Importar Stock */}
        <ImportarStock
          open={openImportar}
          onClose={() => setOpenImportar(false)}
          onConfirmAjustes={handleConfirmAjustes}
          materiales={rows} // Pasar los materiales actuales para comparar
          proyectos={proyectos} // Pasar los proyectos para convertir nombres a IDs
          user={user}
        />

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
