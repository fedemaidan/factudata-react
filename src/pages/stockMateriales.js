import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  Checkbox, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  TableSortLabel, TablePagination, FormHelperText, LinearProgress, Backdrop, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import StockMaterialesService from '../services/stock/stockMaterialesService';
import ExportarStock from '../components/stock/ExportarStock';
import ImportarStock from '../components/stock/ImportarStock';
import AjusteStockService from '../services/stock/ajusteStockService';

import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { useRouter } from 'next/router';
import MaterialDetailDrawer from '../components/stock/materiales/MaterialDetailDrawer';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';

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

const SearchBox = memo(({ initialValue, onApply }) => {
  const [local, setLocal] = useState(initialValue || '');

  useEffect(() => {
    setLocal(initialValue || '');
  }, [initialValue]);

  const apply = useCallback(() => {
    onApply(local);
  }, [local, onApply]);

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    }
  }, [apply]);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: 260, flex: 1 }}>
      <TextField
        fullWidth
        label="Buscar"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Nombre, SKU, alias o descripción…"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon /></InputAdornment>
          ),
        }}
      />
      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        onClick={apply}
        sx={{ height: 40, alignSelf: 'center' }}
      >
        Buscar
      </Button>
    </Stack>
  );
});

const RowItem = memo(
  ({ row, checked, onToggle, onClick }) => (
    <TableRow
      hover
      onClick={() => onClick(row)}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onChange={(e) => onToggle(row._id, e.target.checked)}
          inputProps={{ 'aria-label': `Seleccionar ${row.nombre || 'material'}` }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight={600}>{row.nombre}</Typography>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            SKU: {row.SKU || '—'}
          </Typography>
          {(Array.isArray(row.alias) ? row.alias.length > 0 : !!row.alias) && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {Array.isArray(row.alias)
                ? row.alias.map((a, i) => (
                    <Chip key={`${a}-${i}`} label={a} size="small" sx={{ mb: .5 }} />
                  ))
                : row.alias}
            </Box>
          )}
        </Stack>
      </TableCell>
      <TableCell sx={{ maxWidth: 160 }}>
        {row.categoria ? (
          <Typography variant="body2" noWrap>
            <strong>{row.categoria}</strong>
            {row.subcategoria && (
              <Typography component="span" variant="caption" color="text.secondary">
                {' / '}{row.subcategoria}
              </Typography>
            )}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {row.precio_unitario != null ? (
          (() => {
            const STALE_DAYS = 30;
            const fechaPrecio = row.fecha_precio ? new Date(row.fecha_precio) : null;
            const diasDesdeActualizacion = fechaPrecio ? Math.floor((Date.now() - fechaPrecio.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isStale = diasDesdeActualizacion != null && diasDesdeActualizacion > STALE_DAYS;
            const fechaLabel = fechaPrecio
              ? (() => { try { return fechaPrecio.toLocaleDateString('es-AR'); } catch { return '—'; } })()
              : null;
            const tooltipText = isStale
              ? `⚠️ Precio de hace ${diasDesdeActualizacion} días (${fechaLabel})`
              : fechaLabel
                ? `Actualizado: ${fechaLabel}`
                : 'Sin fecha de actualización';
            return (
              <Tooltip title={tooltipText}>
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                  {isStale && <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    color={isStale ? 'warning.main' : 'text.primary'}
                  >
                    ${Number(row.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Stack>
              </Tooltip>
            );
          })()
        ) : (
          <Tooltip title="Sin precio unitario cargado">
            <Typography variant="caption" color="text.secondary">—</Typography>
          </Tooltip>
        )}
      </TableCell>
      <TableCell align="right">
        <Stack spacing={0.5} alignItems="flex-end">
          {(() => {
            const stockValue = typeof row.stock === 'number' ? row.stock : (row.stockTotal ?? 0);
            const status = getStockStatus(stockValue);
            return (
              <Typography
                variant="body1"
                fontWeight="bold"
                color={status.color === 'error' ? 'error.main' : 'success.main'}
              >
                {stockValue}
              </Typography>
            );
          })()}
          {/* Desglose depósito / obra — solo si hay algo en obra (mezcla o solo obra) */}
          {(row.stock_obra > 0) && (
            <Stack spacing={0} alignItems="flex-end" sx={{ mt: 0.25 }}>
              {row.stock_deposito > 0 && (
                <Typography variant="caption" sx={{ color: '#1565c0', lineHeight: 1.3 }}>
                  🏪 {row.stock_deposito} dep.
                </Typography>
              )}
              {row.stock_obra > 0 && (
                <Typography variant="caption" sx={{ color: '#2e7d32', lineHeight: 1.3 }}>
                  🏗️ {row.stock_obra} obra
                </Typography>
              )}
            </Stack>
          )}
          {row.tienePendientes && (
            <Tooltip title={`${row.cantidadPendienteEntrega || 0} pendientes de recibir`}>
              <Chip
                icon={<HourglassEmptyIcon />}
                label={row.cantidadPendienteEntrega || 0}
                size="small"
                color="warning"
                variant="filled"
                sx={{ height: 20, '& .MuiChip-label': { px: 0.5 } }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  ),
  (prev, next) => prev.row === next.row && prev.checked === next.checked
);


const emptyForm = {
  _id: '',
  nombre: '',
  SKU: '',
  desc_material: '',
  categoria: '',
  subcategoria: '',
  aliasChips: [],            // ← chips en el form
  precio_unitario: '',
  empresa_id: '',
  empresa_nombre: '',
};

// helper mapea items del back y da fallback a stockTotal
const SIN_CATEGORIA_VALUE = '__SIN_CATEGORIA__';

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
  precio_unitario: 'precio_unitario',
};

// Helper para obtener estado de stock
const getStockStatus = (stock) => {
  if (stock <= 0) return { color: 'error', label: 'Sin Stock' };
  return { color: 'success', label: 'En Stock' };
};

const StockMateriales = () => {
  const [allRows, setAllRows] = useState([]); // Datos de la página actual
  const [loading, setLoading] = useState(false);

  // estados de filtros/orden/paginación (server-side)
  const [nombre, setNombre] = useState('');            // 🔎 nombre
  // filtros de texto (buscador único)
  const [stockFilter, setStockFilter] = useState('all'); // all | gt0 | eq0 | lt0
  const [estadoEntrega, setEstadoEntrega] = useState('all'); // all | entregado | no_entregado
  const [categoriaFilter, setCategoriaFilter] = useState(''); // filtro por categoría
  const [subcategoriaFilter, setSubcategoriaFilter] = useState(''); // filtro por subcategoría

  const [orderBy, setOrderBy] = useState('nombre'); // nombre | descripcion | sku | stock
  const [order, setOrder] = useState('asc'); // asc | desc
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Estados para tabs y drawer de detalle
  const [currentTab, setCurrentTab] = useState('general');
  const [proyectos, setProyectos] = useState([]);
  const [drawerMaterial, setDrawerMaterial] = useState(null);

  // total para paginación (backend)
  const [totalRows, setTotalRows] = useState(0);

  // totales valorizados por proyecto (desde endpoint dedicado)
  const [totalesStock, setTotalesStock] = useState(null);

  const { user } = useAuthContext();
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert((prev) => ({ ...prev, open: false }));

  const [openForm, setOpenForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aliasInput, setAliasInput] = useState('');   // input del dialog chips

  const [openDelete, setOpenDelete] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Selección masiva + categorizador
  const [selectedIds, setSelectedIds] = useState([]);
  const [openBulkCategoria, setOpenBulkCategoria] = useState(false);
  const [bulkCategoria, setBulkCategoria] = useState('');
  const [bulkSubcategoria, setBulkSubcategoria] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estados para exportar/importar
  const [openExportar, setOpenExportar] = useState(false);
  const [openImportar, setOpenImportar] = useState(false);

  // Estado para categorías de materiales de la empresa
  const [categoriasMateriales, setCategoriasMateriales] = useState([]);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Stock de materiales', icon: <InventoryIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);
  
  // Subcategorías disponibles según la categoría seleccionada (para el form de crear/editar)
  const subcategoriasDisponibles = useMemo(() => {
    if (!form.categoria) return [];
    const cat = categoriasMateriales.find(c => c.name === form.categoria);
    return cat?.subcategorias || [];
  }, [form.categoria, categoriasMateriales]);

  // Subcategorías disponibles para el FILTRO (basado en categoriaFilter)
  const subcategoriasFilterDisponibles = useMemo(() => {
    if (!categoriaFilter || categoriaFilter === SIN_CATEGORIA_VALUE) return [];
    const cat = categoriasMateriales.find(c => c.name === categoriaFilter);
    return cat?.subcategorias || [];
  }, [categoriaFilter, categoriasMateriales]);

  // Subcategorías disponibles para el categorizador masivo
  const subcategoriasBulkDisponibles = useMemo(() => {
    if (!bulkCategoria) return [];
    const cat = categoriasMateriales.find(c => c.name === bulkCategoria);
    return cat?.subcategorias || [];
  }, [bulkCategoria, categoriasMateriales]);

  // construye el string sort "campo:asc|desc" para el back
  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'nombre';
    const dir = order === 'desc' ? 'desc' : 'asc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  const onApplySearch = useCallback((value) => {
    setNombre(value);
    setPage(0);
  }, []);

  // fetch al back en base a filtros/orden (sin búsqueda de texto)
  async function fetchAll() {
    if (!user) {
      setAllRows([]);
      setTotalRows(0);
      return;
    }
    setLoading(true);
    const startedAt = Date.now();
    try {
      const empresa = await getEmpresaDetailsFromUser(user);

      const params = {
        empresa_id: empresa.id,
        limit: rowsPerPage,
        page,
        sort: sortParam, // ej: "stock:desc"
      };

      // 🔎 filtros (solo envío si hay valor)
      if (stockFilter !== 'all') params.stockFilter   = stockFilter; // 'gt0' | 'eq0' | 'lt0'
      if (estadoEntrega !== 'all') params.estadoEntrega = estadoEntrega; // 'entregado' | 'no_entregado'
      if (categoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE) {
        params.categoria = categoriaFilter;
      }
      if (subcategoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE) {
        params.subcategoria = subcategoriaFilter;
      }
      if (categoriaFilter === SIN_CATEGORIA_VALUE) {
        params.sin_categoria = true;
      }

      if ((nombre || '').trim()) params.text = nombre.trim();

      const resp = await StockMaterialesService.listarMateriales(params);
      const pageData = mapItems(resp.items || []);
      setAllRows(pageData);
      setTotalRows(Number(resp.total) || 0);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error?.message || e?.message || 'Error al cargar materiales';
      setAlert({ open: true, message: `Error al cargar materiales: ${msg}`, severity: 'error' });
    } finally {
      // mínimo 1s de loader visible
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      if (wait) await sleep(wait);
      setLoading(false);
    }
  }

  const total = totalRows;

  const pageRows = useMemo(() => allRows, [allRows]);

  // dispara el fetch cuando cambian filtros/orden/página (paginación backend)
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, stockFilter, estadoEntrega, categoriaFilter, subcategoriaFilter, sortParam, page, rowsPerPage, nombre]);

  // cargar totales valorizados (independiente de la paginación)
  useEffect(() => {
    let cancelled = false;
    const fetchTotales = async () => {
      try {
        if (!user) return;
        const empresa = await getEmpresaDetailsFromUser(user);
        const params = {
          empresa_id: empresa.id,
          ...(stockFilter !== 'all' ? { stockFilter } : {}),
          ...(estadoEntrega !== 'all' ? { estadoEntrega } : {}),
          ...(categoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE ? { categoria: categoriaFilter } : {}),
          ...(subcategoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE ? { subcategoria: subcategoriaFilter } : {}),
          ...(categoriaFilter === SIN_CATEGORIA_VALUE ? { sin_categoria: true } : {}),
          ...((nombre || '').trim() ? { text: nombre.trim() } : {}),
        };
        const data = await StockMaterialesService.obtenerTotalesStock(params);
        if (!cancelled) setTotalesStock(data);
      } catch (e) {
        console.warn('[stockMateriales] Error obteniendo totales:', e);
      }
    };
    fetchTotales();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, stockFilter, estadoEntrega, categoriaFilter, subcategoriaFilter, nombre]);

  // limpiar selección al refrescar datos
  useEffect(() => {
    setSelectedIds([]);
  }, [allRows, page, rowsPerPage, currentTab]);

  const pageIds = pageRows.map(r => r?._id).filter(Boolean);
  const selectedInPage = pageIds.filter(id => selectedIds.includes(id));
  const allSelectedInPage = pageIds.length > 0 && selectedInPage.length === pageIds.length;
  const someSelectedInPage = selectedInPage.length > 0 && selectedInPage.length < pageIds.length;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelectAllPage = useCallback((checked) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, ...pageIds]));
      return prev.filter(id => !pageIds.includes(id));
    });
  }, [pageIds]);

  const toggleSelectOne = useCallback((id, checked) => {
    if (!id) return;
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter(x => x !== id);
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const allIds = pageRows.map(r => r?._id).filter(Boolean);
    setSelectedIds(Array.from(new Set(allIds)));
  }, [pageRows]);

  const handleOpenDetail = useCallback((row) => {
    setDrawerMaterial(row);
  }, []);

  // --- crear/editar ---
  const handleOpenCreate = () => {
    setIsEdit(false);
    setForm({ ...emptyForm, aliasChips: [] });
    setAliasInput('');
    setOpenForm(true);
  };

  // handleOpenEdit removed — edit is now inside the detail drawer

  const validate = () => {
    if (!form.nombre?.trim()) return 'El nombre es requerido';
    if (!form.categoria?.trim()) return 'La categoría es requerida. Seleccioná una categoría para organizar el material.';
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
        precio_unitario: form.precio_unitario !== '' ? Number(form.precio_unitario) : null,
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
  const confirmDelete = useCallback((row) => {
    setToDelete(row);
    setOpenDelete(true);
  }, []);

  // --- drawer handlers ---
  const saveFromDrawer = async (drawerForm) => {
    if (!drawerForm.nombre?.trim()) {
      setAlert({ open: true, message: 'El nombre es requerido', severity: 'warning' });
      return;
    }
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const payload = {
        nombre: drawerForm.nombre?.trim(),
        SKU: drawerForm.SKU?.trim() || null,
        desc_material: drawerForm.desc_material?.trim() || null,
        categoria: drawerForm.categoria?.trim() || null,
        subcategoria: drawerForm.subcategoria?.trim() || null,
        alias: drawerForm.aliasChips?.length ? drawerForm.aliasChips : null,
        precio_unitario: drawerForm.precio_unitario !== '' ? Number(drawerForm.precio_unitario) : null,
        empresa_id: empresa?.id,
        empresa_nombre: empresa?.nombre,
      };
      await StockMaterialesService.actualizarMaterial(drawerForm._id, payload);
      setAlert({ open: true, message: 'Material actualizado', severity: 'success' });
      setDrawerMaterial(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error guardando material', severity: 'error' });
    }
  };

  const deleteFromDrawer = async (mat) => {
    try {
      await StockMaterialesService.eliminarMaterial(mat._id);
      setAlert({ open: true, message: 'Material eliminado', severity: 'success' });
      setDrawerMaterial(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando material', severity: 'error' });
    }
  };

  const handleCreateTicket = useCallback((tipo, subtipo, material) => {
    const params = new URLSearchParams({ crear: '1', tipo });
    if (subtipo) params.set('subtipo', subtipo);
    if (material?._id) params.set('material_id', material._id);
    if (material?.nombre) params.set('material_nombre', material.nombre);
    router.push(`/stockSolicitudes?${params.toString()}`);
  }, [router]);

  const tableRows = useMemo(() => (
    pageRows.map((row) => (
      <RowItem
        key={row._id}
        row={row}
        checked={selectedIdSet.has(row._id)}
        onToggle={toggleSelectOne}
        onClick={handleOpenDetail}
      />
    ))
  ), [pageRows, selectedIdSet, toggleSelectOne, handleOpenDetail]);

  const remove = async () => {
    if (!toDelete) return;
    try {
      await StockMaterialesService.eliminarMaterial(toDelete._id);
      setAlert({ open: true, message: 'Material eliminado', severity: 'success' });
      setOpenDelete(false);
      setToDelete(null);

      const isLastOnPage = pageRows.length === 1 && page > 0;
      if (isLastOnPage) setPage((p) => Math.max(0, p - 1));
      else await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error eliminando material', severity: 'error' });
    }
  };

  const handleOpenBulkCategoria = () => {
    setBulkCategoria('');
    setBulkSubcategoria('');
    setOpenBulkCategoria(true);
  };

  const handleBulkCategoria = async () => {
    if (!selectedIds.length || !bulkCategoria) return;
    setBulkLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      await StockMaterialesService.actualizarCategoriaMasiva({
        empresa_id: empresa.id,
        material_ids: selectedIds,
        categoria: bulkCategoria,
        subcategoria: bulkSubcategoria,
      });

      setAlert({ open: true, message: 'Categorías actualizadas', severity: 'success' });
      setOpenBulkCategoria(false);
      setSelectedIds([]);
      await fetchAll();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error actualizando categorías', severity: 'error' });
    } finally {
      setBulkLoading(false);
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

        // Cargar categorías de materiales de la empresa
        try {
          const empresa = await getEmpresaDetailsFromUser(user);
          const cats = empresa?.categorias_materiales || [];
          setCategoriasMateriales(cats);
        } catch (e) {
          console.warn('[stockMateriales] Error obteniendo categorías de materiales:', e);
          setCategoriasMateriales([]);
        }
        
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

      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button 
                size="small"
                variant="outlined" 
                startIcon={<ImportExportIcon />}
                onClick={() => setOpenExportar(true)}
                color="primary"
              >
                Exportar
              </Button>
              <Button 
                size="small"
                variant="outlined" 
                startIcon={<UploadFileIcon />}
                onClick={() => setOpenImportar(true)}
                color="secondary"
              >
                Importar
              </Button>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                Agregar material
              </Button>
            </Stack>

            {/* Resumen consolidado */}
            {totalesStock && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary">Stock total valorizado</Typography>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      ${(totalesStock.general?.totalDinero ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Unidades totales</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {(totalesStock.general?.totalUnidades ?? 0).toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                  {(totalesStock.general?.sinPrecio ?? 0) > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Materiales sin precio</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                        <Typography variant="h6" fontWeight={600} color="warning.main">
                          {totalesStock.general.sinPrecio}
                        </Typography>
                      </Stack>
                    </Box>
                  )}
                  {(totalesStock.sinAsignar?.totalUnidades ?? 0) > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Sin asignar a proyecto</Typography>
                      <Typography variant="h6" fontWeight={600} color="warning.main">
                        {totalesStock.sinAsignar.totalUnidades} u · ${(totalesStock.sinAsignar.totalDinero ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            )}

            {/* Selector de vista: botones-card */}
            <Box sx={{ width: '100%' }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  pb: 1,
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                }}
              >
                {/* --- General --- */}
                {(() => {
                  const isSelected = currentTab === 'general';
                  const t = totalesStock?.general || {};
                  const totalUnidades = t.totalUnidades ?? 0;
                  const totalDinero = t.totalDinero ?? 0;
                  const sinPrecio = t.sinPrecio ?? 0;
                  return (
                    <Paper
                      variant={isSelected ? 'elevation' : 'outlined'}
                      elevation={isSelected ? 4 : 0}
                      onClick={() => setCurrentTab('general')}
                      sx={{
                        px: 2, py: 1.5, cursor: 'pointer', minWidth: 170, flexShrink: 0,
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.lightest' : 'background.paper',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} noWrap>General</Typography>
                      <Typography variant="h6" fontWeight={700} color={totalDinero > 0 ? 'success.main' : 'text.disabled'} sx={{ lineHeight: 1.3 }}>
                        ${totalDinero.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
                        {sinPrecio > 0 && ` · ${sinPrecio} sin precio`}
                      </Typography>
                    </Paper>
                  );
                })()}

                {/* --- Sin asignar --- */}
                {(() => {
                  const isSelected = currentTab === 'sin-asignar';
                  const t = totalesStock?.sinAsignar || {};
                  const totalUnidades = t.totalUnidades ?? 0;
                  const totalDinero = t.totalDinero ?? 0;
                  const sinPrecio = t.sinPrecio ?? 0;
                  return (
                    <Paper
                      variant={isSelected ? 'elevation' : 'outlined'}
                      elevation={isSelected ? 4 : 0}
                      onClick={() => setCurrentTab('sin-asignar')}
                      sx={{
                        px: 2, py: 1.5, cursor: 'pointer', minWidth: 170, flexShrink: 0,
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected ? 'warning.main' : 'divider',
                        bgcolor: isSelected ? 'warning.lightest' : 'background.paper',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: 'warning.main', bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} noWrap>Sin asignar</Typography>
                      <Typography variant="h6" fontWeight={700} color={totalDinero > 0 ? 'warning.main' : 'text.disabled'} sx={{ lineHeight: 1.3 }}>
                        ${totalDinero.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
                        {sinPrecio > 0 && ` · ${sinPrecio} sin precio`}
                      </Typography>
                    </Paper>
                  );
                })()}

                {/* --- Proyectos --- */}
                {(totalesStock?.porProyecto || []).map((proj) => {
                  const isSelected = currentTab === proj.proyecto_id;
                  const totalUnidades = proj.totalUnidades ?? 0;
                  const totalDinero = proj.totalDinero ?? 0;
                  const sinPrecio = proj.sinPrecio ?? 0;
                  return (
                    <Paper
                      key={proj.proyecto_id}
                      variant={isSelected ? 'elevation' : 'outlined'}
                      elevation={isSelected ? 4 : 0}
                      onClick={() => setCurrentTab(proj.proyecto_id)}
                      sx={{
                        px: 2, py: 1.5, cursor: 'pointer', minWidth: 170, flexShrink: 0,
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.lightest' : 'background.paper',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} noWrap>{proj.proyecto_nombre}</Typography>
                      <Typography variant="h6" fontWeight={700} color={totalDinero > 0 ? 'success.main' : 'text.disabled'} sx={{ lineHeight: 1.3 }}>
                        ${totalDinero.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
                        {sinPrecio > 0 && ` · ${sinPrecio} sin precio`}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>

              <TabPanel value={currentTab} index="general">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  {/* Filtros */}
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} flexWrap="wrap">
                    <SearchBox initialValue={nombre} onApply={onApplySearch} />

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

                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel id="entrega-filter-label">Estado Entrega</InputLabel>
                      <Select
                        labelId="entrega-filter-label"
                        label="Estado Entrega"
                        value={estadoEntrega}
                        onChange={(e) => { setEstadoEntrega(e.target.value); setPage(0); }}
                      >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="no_entregado">
                          <Box display="flex" alignItems="center" gap={1}>
                            <HourglassEmptyIcon color="warning" fontSize="small" />
                            Pendientes de entrega
                          </Box>
                        </MenuItem>
                        <MenuItem value="entregado">
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocalShippingIcon color="success" fontSize="small" />
                            Entregados
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel id="categoria-filter-label">Categoría</InputLabel>
                      <Select
                        labelId="categoria-filter-label"
                        label="Categoría"
                        value={categoriaFilter}
                        onChange={(e) => { 
                          setCategoriaFilter(e.target.value); 
                          setSubcategoriaFilter(''); // Reset subcategoría al cambiar categoría
                          setPage(0); 
                        }}
                      >
                        <MenuItem value="">Todas las categorías</MenuItem>
                        <MenuItem value={SIN_CATEGORIA_VALUE}>Sin categoría</MenuItem>
                        {categoriasMateriales.map(cat => (
                          <MenuItem key={cat.id || cat.name} value={cat.name}>{cat.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel id="subcategoria-filter-label">Subcategoría</InputLabel>
                      <Select
                        labelId="subcategoria-filter-label"
                        label="Subcategoría"
                        value={subcategoriaFilter}
                        onChange={(e) => { setSubcategoriaFilter(e.target.value); setPage(0); }}
                        disabled={!categoriaFilter || categoriaFilter === SIN_CATEGORIA_VALUE}
                      >
                        <MenuItem value="">Todas las subcategorías</MenuItem>
                        {subcategoriasFilterDisponibles.map(sub => (
                          <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                  </Stack>

              {(pageRows.length > 0 || selectedIds.length > 0) && (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">
                      Seleccionados: <strong>{selectedIds.length}</strong>
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={selectAllFiltered}>
                        Seleccionar página
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleOpenBulkCategoria}
                        disabled={selectedIds.length === 0}
                      >
                        Asignar categoría
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedIds([])}
                        disabled={selectedIds.length === 0}
                      >
                        Limpiar selección
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Selecciona todos los materiales de la página actual
                  </Typography>
                </Paper>
              )}

              {/* Tabla */}
            <Paper>
              {/* 🔵 Barra fina de carga */}
              {loading && <LinearProgress />}

              <Table size="small" sx={{ '& th, & td': { py: 0.5 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={someSelectedInPage}
                        checked={allSelectedInPage}
                        onChange={(e) => toggleSelectAllPage(e.target.checked)}
                        inputProps={{ 'aria-label': 'Seleccionar todos en la página' }}
                      />
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
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={orderBy === 'precio_unitario'}
                        direction={orderBy === 'precio_unitario' ? order : 'asc'}
                        onClick={createSortHandler('precio_unitario')}
                      >
                        Precio
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <TableSortLabel
                          active={orderBy === 'stock'}
                          direction={orderBy === 'stock' ? order : 'asc'}
                          onClick={createSortHandler('stock')}
                        >
                          Stock / Pend.
                        </TableSortLabel>
                        <Tooltip title="Cantidad de materiales con movimientos pendientes de entrega (comprados pero no recibidos)">
                          <span>ⓘ</span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows}
                  {!loading && pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
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
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            </Paper>
                </Stack>
              </TabPanel>

              {/* Tab para materiales sin proyecto asignado */}
              <TabPanel value={currentTab} index="sin-asignar">
                <Stack spacing={3} sx={{ mt: 2 }}>
                  <Typography variant="h6">
                    Stock sin asignar a proyecto
                  </Typography>
                  
                  <Paper>
                    {loading && <LinearProgress />}
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Precio unit.</TableCell>
                          <TableCell align="right">Costo</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const materialesConStockSinAsignar = allRows.filter(row => {
                            const tieneStockSinAsignar = (row.porProyecto || []).some(p => 
                              (p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null) && (p.stock || 0) > 0
                            );
                            return tieneStockSinAsignar;
                          });
                          
                          if (materialesConStockSinAsignar.length === 0 && !loading) {
                            return (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  <Typography variant="body2">No hay materiales con stock sin asignar a proyectos.</Typography>
                                </TableCell>
                              </TableRow>
                            );
                          }

                          let costoTotal = 0;
                          const filas = materialesConStockSinAsignar.map((row) => {
                            const stockSinAsignar = (row.porProyecto || [])
                              .filter(p => p.proyecto_id === 'SIN_ASIGNAR' || p.proyecto_id === null)
                              .reduce((sum, p) => sum + (p.stock || 0), 0);
                            const precio = row.precio_unitario;
                            const costo = precio != null ? stockSinAsignar * precio : null;
                            if (costo != null) costoTotal += costo;
                            return (
                              <TableRow key={row._id} hover onClick={() => handleOpenDetail(row)} sx={{ cursor: 'pointer' }}>
                                <TableCell>
                                  <Tooltip title={row.desc_material || ''}>
                                    <Typography variant="body2" fontWeight={600}>{row.nombre}</Typography>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>{row.SKU || <em>(—)</em>}</TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body1"
                                    fontWeight="bold"
                                    color={stockSinAsignar <= 0 ? 'error.main' : 'success.main'}
                                  >
                                    {stockSinAsignar}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {precio != null ? (
                                    <Typography variant="body2">
                                      ${Number(precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.disabled">—</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  {costo != null
                                    ? <Typography variant="body2">${costo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                    : <Typography variant="caption" color="text.disabled">—</Typography>
                                  }
                                </TableCell>
                              </TableRow>
                            );
                          });
                          return (
                            <>
                              {filas}
                              {costoTotal > 0 && (
                                <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider' } }}>
                                  <TableCell colSpan={4} align="right">
                                    <Typography variant="body2" fontWeight={700}>Total invertido</Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography fontWeight={700}>
                                      ${costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </Paper>
                </Stack>
              </TabPanel>

              {/* Tab para cada proyecto */}
              {/* Usa proyectos del endpoint de totales (completo) + fallback a proyectos del usuario */}
              {(() => {
                const totalesProyectos = totalesStock?.porProyecto || [];
                // Merge: proyectos del endpoint de totales + proyectos del usuario
                const proyectoIds = new Set();
                const mergedProyectos = [];
                totalesProyectos.forEach(p => {
                  if (p.proyecto_id) { proyectoIds.add(p.proyecto_id); mergedProyectos.push({ id: p.proyecto_id, nombre: p.proyecto_nombre }); }
                });
                proyectos.forEach(p => {
                  if (!proyectoIds.has(p.id)) { mergedProyectos.push(p); }
                });
                return mergedProyectos.map(proyecto => (
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
                            <TableCell>SKU</TableCell>
                            <TableCell align="right">Stock</TableCell>
                            <TableCell align="right">Precio unit.</TableCell>
                            <TableCell align="right">Costo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            const rowsEnProyecto = allRows.filter(row =>
                              (row.porProyecto || []).some(p => p.proyecto_id === proyecto.id)
                            );
                            if (rowsEnProyecto.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={5}>
                                    <Typography variant="body2">Sin materiales en este proyecto.</Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            let costoTotal = 0;
                            const filas = rowsEnProyecto.map((row) => {
                              const proyectoStock = (row.porProyecto || []).find(p => p.proyecto_id === proyecto.id);
                              const stockValue = proyectoStock?.stock || proyectoStock?.cantidad || 0;
                              const precio = row.precio_unitario;
                              const costo = precio != null ? stockValue * precio : null;
                              if (costo != null) costoTotal += costo;
                              return (
                                <TableRow key={row._id} hover onClick={() => handleOpenDetail(row)} sx={{ cursor: 'pointer' }}>
                                  <TableCell>
                                    <Tooltip title={row.desc_material || ''}>
                                      <Typography variant="body2" fontWeight={600}>{row.nombre}</Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>{row.SKU || <em>(—)</em>}</TableCell>
                                  <TableCell align="right">
                                    <Typography
                                      variant="body1"
                                      fontWeight="bold"
                                      color={stockValue <= 0 ? 'error.main' : 'success.main'}
                                    >
                                      {stockValue}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    {(() => {
                                      if (precio == null) return <Typography variant="caption" color="text.disabled">—</Typography>;
                                      const STALE_DAYS = 30;
                                      const fp = row.fecha_precio ? new Date(row.fecha_precio) : null;
                                      const dias = fp ? Math.floor((Date.now() - fp.getTime()) / 86400000) : null;
                                      const isStale = dias != null && dias > STALE_DAYS;
                                      return (
                                        <Tooltip title={isStale ? `⚠️ Precio de hace ${dias} días` : ''}>
                                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                            {isStale && <WarningIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                                            <Typography variant="body2" color={isStale ? 'warning.main' : 'text.primary'}>
                                              ${Number(precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </Typography>
                                          </Stack>
                                        </Tooltip>
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell align="right">
                                    {costo != null
                                      ? <Typography variant="body2">${costo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                                      : <Typography variant="caption" color="text.disabled">—</Typography>
                                    }
                                  </TableCell>
                                </TableRow>
                              );
                            });
                            return (
                              <>
                                {filas}
                                {costoTotal > 0 && (
                                  <TableRow sx={{ '& td': { borderTop: 2, borderColor: 'divider' } }}>
                                    <TableCell colSpan={4} align="right">
                                      <Typography variant="body2" fontWeight={700}>Total invertido</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography fontWeight={700}>
                                        ${costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Stack>
                </TabPanel>
              ));
              })()}
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
              <TextField
                label="Precio unitario ($)"
                type="number"
                value={form.precio_unitario}
                onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                helperText={isEdit && form._id
                  ? `Última actualización de precio: ${(() => {
                      const row = allRows.find(r => r._id === form._id);
                      if (!row?.fecha_precio) return 'nunca';
                      try { return new Date(row.fecha_precio).toLocaleDateString('es-AR'); } catch { return '—'; }
                    })()}`
                  : 'Se registra la fecha de carga automáticamente'
                }
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth required error={!form.categoria && form.nombre?.trim()?.length > 0}>
                  <InputLabel>Categoría *</InputLabel>
                  <Select
                    label="Categoría *"
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value, subcategoria: '' })}
                  >
                    <MenuItem value="">
                      <em>Sin categoría</em>
                    </MenuItem>
                    {categoriasMateriales.map((cat) => (
                      <MenuItem key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {categoriasMateriales.length === 0 ? (
                    <FormHelperText>
                      Configura categorías en Empresa → Categorías Materiales
                    </FormHelperText>
                  ) : !form.categoria && form.nombre?.trim()?.length > 0 ? (
                    <FormHelperText error>
                      Seleccioná una categoría para continuar
                    </FormHelperText>
                  ) : (
                    <FormHelperText>
                      Obligatorio para organizar el inventario
                    </FormHelperText>
                  )}
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Subcategoría</InputLabel>
                  <Select
                    label="Subcategoría"
                    value={form.subcategoria}
                    onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
                    disabled={!form.categoria}
                  >
                    <MenuItem value="">
                      <em>Sin subcategoría</em>
                    </MenuItem>
                    {subcategoriasDisponibles.map((sub) => (
                      <MenuItem key={sub} value={sub}>
                        {sub}
                      </MenuItem>
                    ))}
                  </Select>
                  {form.categoria && subcategoriasDisponibles.length === 0 && (
                    <FormHelperText>
                      Esta categoría no tiene subcategorías
                    </FormHelperText>
                  )}
                </FormControl>
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

        {/* Drawer detalle de material */}
        <MaterialDetailDrawer
          open={!!drawerMaterial}
          material={drawerMaterial}
          onClose={() => setDrawerMaterial(null)}
          onSave={saveFromDrawer}
          onDelete={deleteFromDrawer}
          onCreateTicket={handleCreateTicket}
          categoriasMateriales={categoriasMateriales}
        />

        {/* Categorizador masivo */}
        <Dialog open={openBulkCategoria} onClose={() => setOpenBulkCategoria(false)} fullWidth maxWidth="sm">
          <DialogTitle>Asignar categoría a {selectedIds.length} materiales</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="bulk-categoria-label">Categoría</InputLabel>
                <Select
                  labelId="bulk-categoria-label"
                  label="Categoría"
                  value={bulkCategoria}
                  onChange={(e) => {
                    setBulkCategoria(e.target.value);
                    setBulkSubcategoria('');
                  }}
                >
                  <MenuItem value=""><em>Seleccionar categoría</em></MenuItem>
                  {categoriasMateriales.map(cat => (
                    <MenuItem key={cat.id || cat.name} value={cat.name}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!bulkCategoria}>
                <InputLabel id="bulk-subcategoria-label">Subcategoría</InputLabel>
                <Select
                  labelId="bulk-subcategoria-label"
                  label="Subcategoría"
                  value={bulkSubcategoria}
                  onChange={(e) => setBulkSubcategoria(e.target.value)}
                >
                  <MenuItem value=""><em>(sin subcategoría)</em></MenuItem>
                  {subcategoriasBulkDisponibles.map(sub => (
                    <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  La subcategoría es opcional
                </FormHelperText>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBulkCategoria(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleBulkCategoria}
              disabled={!bulkCategoria || bulkLoading}
            >
              {bulkLoading ? 'Aplicando…' : 'Aplicar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo Exportar Stock */}
        <ExportarStock
          open={openExportar}
          onClose={() => setOpenExportar(false)}
          materiales={allRows}
          proyectos={proyectos}
          user={user}
          exportFilters={{
            enabled: true,
            text: (nombre || '').trim() || undefined,
            stockFilter,
            estadoEntrega,
            categoria: categoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE ? categoriaFilter : undefined,
            subcategoria: subcategoriaFilter && categoriaFilter !== SIN_CATEGORIA_VALUE ? subcategoriaFilter : undefined,
            sin_categoria: categoriaFilter === SIN_CATEGORIA_VALUE,
            sort: sortParam,
          }}
        />

        {/* Diálogo Importar Stock */}
        <ImportarStock
          open={openImportar}
          onClose={() => setOpenImportar(false)}
          onConfirmAjustes={handleConfirmAjustes}
          materiales={allRows} // Pasar los materiales actuales para comparar
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
