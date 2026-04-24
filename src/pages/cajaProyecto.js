import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, IconButton, Menu, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip, MenuItem as MenuOption, Divider, TablePagination, Drawer, List, ListItem, ListItemText, Badge, Fab } from '@mui/material';

import { Checkbox, Popover, FormControlLabel, Switch, CircularProgress, Backdrop } from '@mui/material';

import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';

import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import ticketService from 'src/services/ticketService';
import { getProyectoById, recargarProyecto, updateProyecto } from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';
import profileService from 'src/services/profileService';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { getEmpresaDetailsFromUser, updateEmpresaDetails } from 'src/services/empresaService';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; 
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';
import { useMovimientosFilters } from 'src/hooks/useMovimientosFilters';
import { FilterBarCajaProyecto } from 'src/components/FilterBarCajaProyecto';
import AsistenteFlotanteProyecto from 'src/components/asistenteFlotanteProyecto';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import IntercambioMonedaDialog from 'src/components/IntercambioMonedaDialog';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import BulkEditDialog from 'src/components/BulkEditDialog';
import SortIcon from '@mui/icons-material/Sort';
import OrdenarColumnasDialog from 'src/components/OrdenarColumnasDialog';
import { getCajaColumnasConfig, applyColumnOrder, getHeaderLabel, getHeaderCellSx } from 'src/components/cajaProyecto/cajaColumnasConfig';
import CajaTablaCell from 'src/components/cajaProyecto/CajaTablaCell';
import ProyectoConfigDrawer from 'src/components/cajaProyecto/ProyectoConfigDrawer';
import ExportCsvDialog, { moveItem } from 'src/components/cajaProyecto/ExportCsvDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { buildCompletarPagoUpdateFields, puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';
import { formatCurrencyWithCode } from 'src/utils/formatters';


// tamaños mínimos por columna (px)
const COLS = {
  codigo: 120,
  fecha: 140,
  tipo: 120,
  obra: 200,
  cliente: 200,
  total: 160,
  subtotal: 160,
  impuestos: 160,
  montoPagado: 170,
  montoAprobado: 170,
  categoria: 160,
  subcategoria: 160,
  medioPago: 150,
  proveedor: 220,
  observacion: 160,
  detalle: 160,
  usuario: 140,
  tc: 120,
  usd: 160,
  mep: 160,
  estado: 140,
  empresaFacturacion: 200,
  facturaCliente: 140,
  fechaPago: 140,
  dolarReferencia: 140,
  totalDolar: 140,
  subtotalDolar: 140,
  tagsExtra: 180,
  acciones: 200,
};

// estilos comunes
const cellBase = { py: 0.75, px: 1, whiteSpace: 'nowrap' };
const ellipsis = (maxWidth) => ({
  ...cellBase,
  maxWidth,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const DEBUG_CAJA = true;

const formatDebugValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(formatDebugValue);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, current]) => {
      acc[key] = formatDebugValue(current);
      return acc;
    }, {});
  }
  return value;
};

const logCajaDebug = (label, payload) => {
  if (!DEBUG_CAJA) return;
  if (typeof payload === 'undefined') {
    console.log(`[CajaProyecto] ${label}`);
    return;
  }
  console.log(`[CajaProyecto] ${label}`, formatDebugValue(payload));
};

// Serializa el estado de filters para guardarlo en una caja (fechas → ISO string, excluye 'caja')
const serializeFilterSet = (f) => {
  const out = { ...f };
  delete out.caja;
  const dateKeys = [
    'fechaDesde', 'fechaHasta', 'fechaPagoDesde', 'fechaPagoHasta',
    'fechaCreacionDesde', 'fechaCreacionHasta', 'fechaModificacionDesde', 'fechaModificacionHasta',
  ];
  dateKeys.forEach((k) => {
    if (out[k] instanceof Date) out[k] = out[k].toISOString().slice(0, 10);
    else if (!out[k]) delete out[k];
  });
  return out;
};

// Restaura un filterSet almacenado, convirtiendo strings de fecha de vuelta a Date
const deserializeFilterSet = (stored) => {
  if (!stored) return {};
  const out = { ...stored };
  const dateKeys = [
    'fechaDesde', 'fechaHasta', 'fechaPagoDesde', 'fechaPagoHasta',
    'fechaCreacionDesde', 'fechaCreacionHasta', 'fechaModificacionDesde', 'fechaModificacionHasta',
  ];
  dateKeys.forEach((k) => {
    if (out[k] && typeof out[k] === 'string') out[k] = new Date(out[k]);
    else if (out[k]?.seconds) out[k] = new Date(out[k].seconds * 1000);
  });
  return out;
};

const parseFechaCsv = (value) => {
  if (!value) return '';
  let date;
  if (typeof value === 'object' && value.seconds != null) {
    date = new Date(value.seconds * 1000);
  } else if (typeof value === 'object' && value._seconds != null) {
    date = new Date(value._seconds * 1000);
  } else if (value?.toDate) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }
  return Number.isNaN(date?.getTime?.()) ? '' : date.toLocaleDateString('es-AR');
};

const formatCsvCell = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  const normalized = String(value).replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
  return /[",;]/.test(normalized) ? `"${normalized}"` : normalized;
};

const descargarArchivoCsv = (fileName, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getMovimientoCsvExportFields = () => [
  {
    key: 'id',
    label: 'ID',
    description: 'Identificador interno del movimiento',
    getValue: (mov) => mov.id || '',
  },
  {
    key: 'codigo',
    label: 'Codigo',
    description: 'Codigo de operacion visible en caja',
    getValue: (mov) => mov.codigo_operacion || mov.codigo || '',
  },
  {
    key: 'fecha',
    label: 'Fecha',
    description: 'Fecha de factura del movimiento',
    getValue: (mov) => parseFechaCsv(mov.fecha_factura),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    description: 'Ingreso o egreso',
    getValue: (mov) => mov.type || '',
  },
  {
    key: 'monedaOriginal',
    label: 'Moneda_Original',
    description: 'Moneda original del comprobante',
    getValue: (mov) => mov.moneda || '',
  },
  {
    key: 'totalOriginal',
    label: 'Total_Original',
    description: 'Total en la moneda original',
    getValue: (mov) => mov.total || 0,
  },
  {
    key: 'proveedor',
    label: 'Proveedor',
    description: 'Proveedor o contraparte',
    getValue: (mov) => mov.nombre_proveedor || '',
  },
  {
    key: 'categoria',
    label: 'Categoria',
    description: 'Categoria contable',
    getValue: (mov) => mov.categoria || '',
  },
  {
    key: 'medioPago',
    label: 'Medio_Pago',
    description: 'Medio de pago registrado',
    getValue: (mov) => mov.medio_pago || '',
  },
  {
    key: 'estado',
    label: 'Estado',
    description: 'Estado actual del movimiento',
    getValue: (mov) => mov.estado || '',
  },
  {
    key: 'usdBlue',
    label: 'USD_Blue',
    description: 'Equivalencia a USD blue',
    getValue: (mov) => mov.equivalencias?.total?.usd_blue ?? 'N/A',
  },
  {
    key: 'usdOficial',
    label: 'USD_Oficial',
    description: 'Equivalencia a USD oficial',
    getValue: (mov) => mov.equivalencias?.total?.usd_oficial ?? 'N/A',
  },
  {
    key: 'usdMepMedio',
    label: 'USD_MEP_Medio',
    description: 'Equivalencia a USD MEP medio',
    getValue: (mov) => mov.equivalencias?.total?.usd_mep_medio ?? 'N/A',
  },
  {
    key: 'tieneEquivalencias',
    label: 'Tiene_Equivalencias',
    description: 'Indica si el movimiento tiene equivalencias calculadas',
    getValue: (mov) => (mov.equivalencias ? 'SI' : 'NO'),
  },
  {
    key: 'proyecto',
    label: 'Proyecto',
    description: 'Proyecto asociado al movimiento',
    getValue: (mov) => mov.proyecto_nombre || '',
  },
  {
    key: 'tcEjecutado',
    label: 'TC_Ejecutado',
    description: 'Tipo de cambio ejecutado',
    getValue: (mov) => mov.tc ?? 'N/A',
  },
  {
    key: 'ratioUsdBlue',
    label: 'Ratio_USD_Blue_vs_Original',
    description: 'Relacion entre USD blue y total original',
    getValue: (mov) => {
      const usdBlue = mov.equivalencias?.total?.usd_blue;
      const total = Number(mov.total) || 0;
      return usdBlue && total > 0 ? (usdBlue / total).toFixed(4) : 'N/A';
    },
  },
  {
    key: 'observacion',
    label: 'Observacion',
    description: 'Observacion cargada en el movimiento',
    getValue: (mov) => mov.observacion || '',
  },
];


const TotalesFiltrados = ({ t, fmt, moneda, showUsdBlue = false, usdBlue = null, chips = [], onOpenFilters, isMobile = false, showDetails = false, onToggleDetails, baseCalculo = 'total' }) => {
  const up = (moneda || '').toUpperCase();
  const ingreso = t[up]?.ingreso ?? 0;
  const egreso  = t[up]?.egreso  ?? 0;
  const neto    = ingreso - egreso;
  const totalPeriodo = ingreso + egreso;

  return (
    <Stack spacing={1.25} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          flex: 1,
          minWidth: 260,
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Totales filtrados{baseCalculo === 'subtotal' ? ' (neto)' : ''}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {chips.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, maxWidth: isMobile ? 220 : 'none', overflowX: isMobile ? 'auto' : 'visible' }}>
                {chips.map((chip, idx) => (
                  <Chip
                    key={`${chip.label}-${idx}`}
                    label={chip.label}
                    onDelete={(e) => { e.stopPropagation(); chip.onDelete(); }}
                    onClick={() => onOpenFilters?.()}
                    size="small"
                    variant="outlined"
                    clickable
                  />
                ))}
              </Box>
            )}
            <Chip size="small" label={up} variant="outlined" />
          </Stack>
        </Stack>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: neto >= 0 ? 'success.main' : 'error.main' }}>
          Neto: {fmt(up, neto)}
        </Typography>
        {isMobile ? (
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography sx={{ color: 'text.secondary' }}>
              Total período: {fmt(up, totalPeriodo)}
            </Typography>
            <Button size="small" variant="text" onClick={onToggleDetails}>
              {showDetails ? 'Ocultar' : 'Ver más'}
            </Button>
            {showDetails && (
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
                  + {fmt(up, ingreso)}
                </Typography>
                <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
                  - {fmt(up, egreso)}
                </Typography>
              </Stack>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
              + {fmt(up, ingreso)}
            </Typography>
            <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
              - {fmt(up, egreso)}
            </Typography>
          </Stack>
        )}

      </Box>

      {showUsdBlue && usdBlue && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            flex: 1,
            minWidth: 260,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Totales USD blue
            </Typography>
            <Chip size="small" label="USD" variant="outlined" />
          </Stack>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              color: (usdBlue.neto ?? 0) >= 0 ? 'success.main' : 'error.main'
            }}
          >
            Neto: {fmt('USD', usdBlue.neto)}
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
              + {fmt('USD', usdBlue.ingreso)}
            </Typography>
            <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
              - {fmt('USD', usdBlue.egreso)}
            </Typography>
          </Stack>
        </Box>
      )}
      </Stack>

    </Stack>
  );
};





const ProyectoMovimientosPage = () => {
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const authUserUid = user?.user_id || user?.uid || null;
  // Ref estable para acceder al user actual sin re-disparar effects
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosUSD, setMovimientosUSD] = useState([]);
  const [tablaActiva, setTablaActiva] = useState('ARS');
  const [empresa, setEmpresa] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [filtrosActivos, setFiltrosActivos] = useState(true);
  const [accionesActivas, setAccionesActivas] = useState(false);
  const [showDolar, setShowDolar] = useState(true);
  const [showPesos, setShowPesos] = useState(true);
  const [proyecto, setProyecto] = useState(null);
  const [deletingElement, setDeletingElement] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [movimientoAEliminar, setMovimientoAEliminar] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [openTransferencia, setOpenTransferencia] = useState(false);
  const [openIntercambio, setOpenIntercambio] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const router = useRouter();
  const { proyectoId } = router.query;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Setear breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Proyectos', href: '/vistaResumen', icon: <FolderIcon fontSize="small" /> },
      { label: proyecto?.nombre || 'Caja', icon: <AccountBalanceWalletIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [proyecto?.nombre, setBreadcrumbs]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [cajasVirtuales, setCajasVirtuales] = useState([
    { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
    { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
    { nombre: 'Gastos en USD Blue', moneda: 'ARS', medio_pago: "" , equivalencia: 'usd_blue', type: 'egreso', baseCalculo: 'total' },
  ]);  
  const [showCrearCaja, setShowCrearCaja] = useState(false);
  const [nombreCaja, setNombreCaja] = useState('');
  const [monedaCaja, setMonedaCaja] = useState('ARS');
  const [estadoCaja, setEstadoCaja] = useState('');
  const [medioPagoCaja, setMedioPagoCaja] = useState('Efectivo');
  const [equivalenciaCaja, setEquivalenciaCaja] = useState('none'); // 'none' | 'usd_blue' | ...
  const [editandoCaja, setEditandoCaja] = useState(null); // null o index de la caja
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [savingCols, setSavingCols] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // opcional: feedback breve
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const [detalleMov, setDetalleMov] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTotalsDetails, setShowTotalsDetails] = useState(false);
  const [mobileActionAnchor, setMobileActionAnchor] = useState(null);
  const [mobileActionMov, setMobileActionMov] = useState(null);
  const [comentarioInput, setComentarioInput] = useState('');
  const [comentarioLoading, setComentarioLoading] = useState(false);
  const [comentarioError, setComentarioError] = useState(null);
  const [usuariosComentariosMap, setUsuariosComentariosMap] = useState({});
  const fetchedUserIdsRef = useRef(new Set());
  const [showCajasMobile, setShowCajasMobile] = useState(true);
  // ── Selección masiva ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvSelectedFields, setCsvSelectedFields] = useState([]);
  const [csvFieldOrder, setCsvFieldOrder] = useState([]);
  const [csvConfigHydrated, setCsvConfigHydrated] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [confirmarPagoMov, setConfirmarPagoMov] = useState(null);
  const [confirmarPagoLoading, setConfirmarPagoLoading] = useState(false);
  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });
  const openMobileActions = (event, mov) => {
    setMobileActionAnchor(event.currentTarget);
    setMobileActionMov(mov);
  };
  const closeMobileActions = () => {
    setMobileActionAnchor(null);
    setMobileActionMov(null);
  };
  
  const [anchorCajaEl, setAnchorCajaEl] = useState(null);
  const [cajaMenuIndex, setCajaMenuIndex] = useState(null);
  // ---- Columnas visibles + modo compacto ----
const [compactCols, setCompactCols] = useState(true);
const [anchorColsEl, setAnchorColsEl] = useState(null);
const [columnasOrden, setColumnasOrden] = useState([]);
const [openOrdenar, setOpenOrdenar] = useState(false);

// --- helpers de scroll horizontal ---
const scrollRef = useRef(null);      // contenedor principal con overflow
const topScrollRef = useRef(null);   // barra superior "fantasma"
const tableRef = useRef(null);
const [typeCaja, setTypeCaja] = useState(''); // '' | 'ingreso' | 'egreso'
const [baseCalculoCaja, setBaseCalculoCaja] = useState('total'); // 'total' | 'subtotal'
const [savedViewMode, setSavedViewMode] = useState(false); // true cuando se guarda vista con filtros

const [atEdges, setAtEdges] = useState({ left: true, right: false });
const [atStart, setAtStart] = useState(true);
const [atEnd, setAtEnd] = useState(false);
const [coachOpen, setCoachOpen] = useState(true); // se muestra en cada mount
const [topWidth, setTopWidth] = useState(0);
// --- paginación ---
const [page, setPage] = useState(0);           // página actual (0-based)
const [rowsPerPage, setRowsPerPage] = useState(25);  // filas por página

const csvExportFields = useMemo(() => getMovimientoCsvExportFields(), []);
const csvDefaultOrder = useMemo(() => csvExportFields.map((field) => field.key), [csvExportFields]);

 // helper: metadatos de equivalencias (moneda objetivo y path en mov.equivalencias)
 const EQUIV_META = {
   none:        { out: null,        path: null },                          // usa mov.total
   usd_blue:    { out: 'USD',       path: (e) => e?.total?.usd_blue },
   usd_oficial: { out: 'USD',       path: (e) => e?.total?.usd_oficial },  // si lo tenés
   usd_mep_medio: { out: 'USD',     path: (e) => e?.total?.usd_mep_medio },  // si lo tenés
   ars_oficial: { out: 'ARS',       path: (e) => e?.total?.ars_oficial },
   cac:         { out: 'ARS',       path: (e) => e?.total?.cac },          // ej. si calculás CAC a ARS
 };

// handlers
const handleChangePage = (_evt, newPage) => {
  setPage(newPage);
  // opcional: scrollear al tope de la tabla
  scrollRef.current?.scrollTo?.({ top: 0 });
};

const handleChangeRowsPerPage = (evt) => {
  const value = parseInt(evt.target.value, 10);
  setRowsPerPage(value);
  setPage(0);
};

const getMax = () => {
  const el = scrollRef.current; // el que realmente scrollea
  if (!el) return 0;
  return Math.max(0, el.scrollWidth - el.clientWidth);
};

useEffect(() => {
  if (csvConfigHydrated || csvDefaultOrder.length === 0) return;
  setCsvSelectedFields(csvDefaultOrder);
  setCsvFieldOrder(csvDefaultOrder);
  setCsvConfigHydrated(true);
}, [csvConfigHydrated, csvDefaultOrder]);


useEffect(() => {
  const cont = scrollRef.current;
  const table = tableRef.current;
  const top   = topScrollRef.current;
  if (!cont || !table || !top) return;

  const compute = () => {
    // Forzamos overflow real arriba
    setTopWidth(Math.max(table.scrollWidth, cont.clientWidth + 32));

    const max = getMax();
    const sl  = cont.scrollLeft;

    setAtStart(sl <= 0);
    setAtEnd(sl >= max - 1 || max <= 0);

    if (top.scrollLeft !== sl) top.scrollLeft = sl;
  };

  const onContScroll = () => compute();

  cont.addEventListener('scroll', onContScroll, { passive: true });

  const roCont  = new ResizeObserver(compute);
  const roTable = new ResizeObserver(compute);
  roCont.observe(cont);
  roTable.observe(table);

  requestAnimationFrame(compute);
  return () => {
    cont.removeEventListener('scroll', onContScroll);
    roCont.disconnect();
    roTable.disconnect();
  };
}, []);


const scrollByStep = (dir) => {
  const el = scrollRef.current;
  const table = tableRef.current;
  if (!el || !table) return;

  const max  = getMax();  // <- unificado
  const step = Math.max(240, Math.round(el.clientWidth * 0.8));
  let next   = dir === 'left'
    ? Math.max(0, el.scrollLeft - step)
    : Math.min(max, el.scrollLeft + step);

  // Snap a los extremos si quedamos muy cerca
  const snap = 16;
  if (dir === 'right' && max - next < snap) next = max;
  if (dir === 'left'  && next < snap)       next = 0;

  el.scrollTo({ left: next, behavior: 'smooth' });
};

const handleSaveCols = async () => {
    if (!proyecto?.id) return;
    try {
      setSavingCols(true);
      await updateProyecto(proyecto.id, {
        ...proyecto,
        ui_prefs: {
          ...(proyecto.ui_prefs || {}),
          columnas: {
            compact: compactCols,
            visible: visibleCols,
            orden: columnasOrden,
          },
        },
      });
      setSaveMsg('Configuración guardada');
    } catch (e) {
      setSaveMsg('No se pudo guardar');
    } finally {
      setSavingCols(false);
    }
  };

  const defaultVisible = useMemo(() => ({
    codigo: true,
    fechas: true,
    fechaFactura: !compactCols,
    fechaCreacion: !compactCols,
    tipo: !compactCols,
    total: true,
    subtotal: false,
    impuestos: false,
    montoPagado: false,
    montoAprobado: false,
    categoria: true,
    subcategoria: !compactCols && !!empresa?.comprobante_info?.subcategoria,
    medioPago: !!empresa?.comprobante_info?.medio_pago,
    proveedor: true,
    obra: false,        // <-- NUEVO
    cliente: false,     // <-- NUEVO
    observacion: true,
    detalle: !!empresa?.comprobante_info?.detalle,
    usuario: false,     // desactivada por defecto (igual que todosProyectos)
    tc: false,
    usd: true,
    mep: false, // activala en true si querés que venga visible por defecto
    estado: !!empresa?.con_estados,
    acciones: true,
    empresaFacturacion: false,
    facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
    fechaPago: false,
    dolarReferencia: false,
    totalDolar: false,
    subtotalDolar: false,
    tagsExtra: false,
  }), [compactCols, empresa]);
  

const [visibleCols, setVisibleCols] = useState(defaultVisible);
const hiddenColsCount = useMemo(() => Object.values(visibleCols).filter((v) => !v).length, [visibleCols]);

const applyPreset = (preset) => {
  const base = { ...defaultVisible };
  if (preset === 'finanzas') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      total: true,
      montoAprobado: true,
      categoria: true,
      subcategoria: !!empresa?.comprobante_info?.subcategoria,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      proveedor: true,
      estado: !!empresa?.con_estados,
      empresaFacturacion: !!empresa?.comprobante_info?.empresa_facturacion,
      facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
      observacion: false,
      detalle: !!empresa?.comprobante_info?.detalle,
    });
  }
  if (preset === 'operativo') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      tipo: !compactCols,
      proveedor: true,
      obra: true,
      cliente: true,
      observacion: true,
      detalle: !!empresa?.comprobante_info?.detalle,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      estado: !!empresa?.con_estados,
    });
  }
  if (preset === 'auditoria') {
    setVisibleCols({
      ...base,
      codigo: true,
      fechas: true,
      fechaFactura: true,
      fechaCreacion: true,
      tipo: true,
      total: true,
      montoAprobado: true,
      categoria: true,
      subcategoria: !!empresa?.comprobante_info?.subcategoria,
      medioPago: !!empresa?.comprobante_info?.medio_pago,
      proveedor: true,
      estado: !!empresa?.con_estados,
      empresaFacturacion: !!empresa?.comprobante_info?.empresa_facturacion,
      facturaCliente: !!empresa?.comprobante_info?.factura_cliente,
      tc: true,
      usd: true,
      mep: true,
      fechaPago: !!empresa?.comprobante_info?.fecha_pago,
      detalle: !!empresa?.comprobante_info?.detalle,
    });
  }
  if (preset === 'reset') {
    setVisibleCols(defaultVisible);
  }
};

// si todavía no hidratamos desde el proyecto, aplicamos defaults
useEffect(() => {
  if (!prefsHydrated) {
    setVisibleCols(defaultVisible);
  }
}, [defaultVisible, prefsHydrated]);

const toggleCol = (key) => {
  setVisibleCols((v) => ({ ...v, [key]: !v[key] }));
};

// botón Columnas (al lado de filtros/título)
const openCols = Boolean(anchorColsEl);
const handleOpenCols = (e) => setAnchorColsEl(e.currentTarget);
const handleCloseCols = () => setAnchorColsEl(null);

const handleOrdenColumnasChange = async (nuevoOrden) => {
  setColumnasOrden(nuevoOrden);
  if (proyecto?.id) {
    try {
      await updateProyecto(proyecto.id, {
        ...proyecto,
        ui_prefs: {
          ...(proyecto.ui_prefs || {}),
          columnas: {
            ...(proyecto.ui_prefs?.columnas || {}),
            compact: compactCols,
            visible: visibleCols,
            orden: nuevoOrden,
          },
        },
      });
    } catch (e) {
      setAlert((prev) => ({ ...prev, open: true, message: 'No se pudo guardar el orden', severity: 'error' }));
    }
  }
};


  const {
    filters,
    setFilters,
    options,
    movimientosFiltrados,
    totales
  } = useMovimientosFilters({
    empresaId: empresa?.id,
    proyectoId,
    movimientos,
    movimientosUSD,
    cajaSeleccionada,
  });

  useEffect(() => {
    logCajaDebug('Contexto inicial usuario/router', {
      proyectoId,
      authUserUid,
      userIdPerfil: user?.id || null,
      userUidDirecto: user?.uid || null,
      routerPath: router.asPath,
      routerQuery: router.query,
    });
  }, [authUserUid, proyectoId, router.asPath, router.query, user?.id, user?.uid]);

  const columnasConfig = useMemo(
    () => getCajaColumnasConfig(visibleCols, compactCols, empresa, options),
    [visibleCols, compactCols, empresa, options]
  );
  const columnasFiltradas = useMemo(
    () => applyColumnOrder(columnasConfig, columnasOrden),
    [columnasConfig, columnasOrden]
  );

  const handleOpenCajaMenu = (event, index) => {
    setAnchorCajaEl(event.currentTarget);
    setCajaMenuIndex(index);
  };
  
  const handleCloseCajaMenu = () => {
    setAnchorCajaEl(null);
    setCajaMenuIndex(null);
  };
  
  const handleEditarCaja = (index) => {
    const caja = cajasVirtuales[index];
    setEditandoCaja(index);
    setNombreCaja(caja.nombre);
    setMonedaCaja(caja.moneda);
    setMedioPagoCaja(caja.medio_pago || '');
    setShowCrearCaja(true);
    setTypeCaja(caja.type || '');
    setEstadoCaja(caja.estado || '');
    setBaseCalculoCaja(caja.baseCalculo || 'total');
    handleCloseCajaMenu();
    setEquivalenciaCaja(caja.equivalencia || 'none');
  };

  const applyCajaSelection = useCallback((caja) => {
    if (caja?.filterSet) {
      // Caja con vista guardada: aplica su filterSet completo
      const restoredFilters = deserializeFilterSet(caja.filterSet);
      logCajaDebug('Aplicando caja con filterSet', { caja, restoredFilters });
      setCajaSeleccionada(caja);
      setFilters((f) => ({ ...f, ...restoredFilters, caja }));
    } else {
      // Caja clásica: mapea campos a filtros
      const normalizedFilters = {
        caja: caja || null,
        moneda: caja?.moneda ? [caja.moneda] : [],
        medioPago: caja?.medio_pago ? [caja.medio_pago] : [],
        estados: caja?.estado ? [caja.estado] : [],
        tipo: caja?.type ? [caja.type] : [],
      };
      logCajaDebug('Aplicando selección de caja', { caja, normalizedFilters });
      setCajaSeleccionada(caja || null);
      setFilters((f) => ({ ...f, ...normalizedFilters }));
    }
  }, [setFilters]);
  
  const handleEliminarCaja = (index) => {
    const nuevas = cajasVirtuales.filter((_, i) => i !== index);
    setCajasVirtuales(nuevas);
    updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevas });
    if (cajaSeleccionada === cajasVirtuales[index]) {
      const fallback = nuevas[0] || null;
      applyCajaSelection(fallback);
    }
    handleCloseCajaMenu();
  };
  
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const handleRecargarProyecto = async (proyecto_id) => {
    const resultado = await recargarProyecto(proyecto_id);
    if (resultado) {
      setAlert({
        open: true,
        message: 'Sheets recalculados con éxito',
        severity: 'success',
      });
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular sheets',
        severity: 'error',
      });
    }
  };

  const handleFiltrosActivos = () => {
    setFiltersOpen(true);
    handleCloseMenu();
  };

   const formatCajaAmount = (caja, amount) => {
       const meta = EQUIV_META[caja.equivalencia || 'none'] || EQUIV_META.none;
       const out = (caja.equivalencia && caja.equivalencia !== 'none')
           ? (meta.out || 'ARS')
           : (caja.moneda || 'ARS');

       return (amount ?? 0).toLocaleString('es-AR', {
         style: 'currency',
         currency: out.toUpperCase() === 'USD' ? 'USD' : 'ARS',
         minimumFractionDigits: 2
       });
     };
    

  const eliminarMovimiento = async () => {
    setDeletingElement(movimientoAEliminar);
    const resultado = await movimientosService.deleteMovimientoById(movimientoAEliminar);
    if (resultado) {
      setMovimientos(movimientos.filter(mov => mov.id !== movimientoAEliminar));
      setMovimientosUSD(movimientosUSD.filter(mov => mov.id !== movimientoAEliminar));
      setAlert({
        open: true,
        message: 'Movimiento eliminado con éxito',
        severity: 'success',
      });
      setDeletingElement(null);
    } else {
      setAlert({
        open: true,
        message: 'Error al eliminar el elemento',
        severity: 'error',
      });
      setDeletingElement(null);
    }
    setOpenDialog(false);
  };

  const goToEdit = (mov) => {
    router.push({
      pathname: '/movementForm',
      query: {
        movimientoId: mov.id,
        lastPageName: proyecto?.nombre,
        proyectoId: proyecto?.id,
        proyectoName: proyecto?.nombre,
        lastPageUrl: router.asPath, // Next lo encodea
      },
    });
  };

  const openDetalle = useCallback((mov) => {
    setDetalleMov(mov);
    setDrawerOpen(true);
    setComentarioInput('');
    setComentarioError(null);
  }, []);

  const handleAgregarComentario = useCallback(async () => {
    if (!detalleMov?.id || !comentarioInput?.trim()) return;
    setComentarioLoading(true);
    setComentarioError(null);
    try {
      const nuevoComentario = await movimientosService.addComentario(detalleMov.id, comentarioInput.trim());
      if (nuevoComentario) {
        const movActualizado = {
          ...detalleMov,
          comentarios: [...(detalleMov.comentarios || []), nuevoComentario],
        };
        setDetalleMov(movActualizado);
        setComentarioInput('');
        const updater = (m) => (m.id === detalleMov.id ? { ...m, comentarios: movActualizado.comentarios } : m);
        setMovimientos((prev) => prev.map(updater));
        setMovimientosUSD((prev) => prev.map(updater));
        setAlert({ open: true, message: 'Comentario agregado', severity: 'success' });
      }
    } catch (err) {
      setComentarioError(err?.response?.data?.error || 'Error al agregar comentario');
    } finally {
      setComentarioLoading(false);
    }
  }, [detalleMov, comentarioInput]);

  useEffect(() => {
    const comentarios = detalleMov?.comentarios || [];
    const idsToFetch = [...new Set(comentarios.map((c) => c.userId).filter(Boolean))].filter(
      (id) => !fetchedUserIdsRef.current.has(id)
    );
    if (idsToFetch.length === 0) return;
    idsToFetch.forEach((id) => fetchedUserIdsRef.current.add(id));
    (async () => {
      for (const id of idsToFetch) {
        try {
          const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
          const name = profile
            ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || 'Usuario')
            : 'Usuario';
          setUsuariosComentariosMap((prev) => ({ ...prev, [id]: name }));
        } catch {
          setUsuariosComentariosMap((prev) => ({ ...prev, [id]: 'Usuario' }));
        }
      }
    })();
  }, [detalleMov?.id, detalleMov?.comentarios?.length]);

  
  const handleEliminarClick = (movimientoId) => {
    setMovimientoAEliminar(movimientoId);
    setOpenDialog(true);
  };
  
  

  // Fetch movimientos ARS+USD en paralelo e hidratar nombres de usuario
  const fetchAndHydrateMovimientos = useCallback(async (pid) => {
    logCajaDebug('Iniciando carga de movimientos', {
      proyectoId: pid,
      authUserUid,
    });
    const [movs, movsUsd] = await Promise.all([
      ticketService.getMovimientosForProyecto(pid, 'ARS'),
      ticketService.getMovimientosForProyecto(pid, 'USD'),
    ]);
    const allMovs = [...(movs || []), ...(movsUsd || [])];
    const idsSinNombre = [...new Set(allMovs.filter((m) => m.id_user && !m.nombre_user).map((m) => m.id_user))];
    logCajaDebug('Movimientos cargados antes de hidratar usuarios', {
      proyectoId: pid,
      ars: movs?.length || 0,
      usd: movsUsd?.length || 0,
      total: allMovs.length,
      idsSinNombre: idsSinNombre.length,
      primerosCodigos: allMovs.slice(0, 5).map((m) => ({
        id: m.id,
        codigo: m.codigo_operacion || m.codigo || null,
        moneda: m.moneda,
        total: m.total,
      })),
    });
    if (idsSinNombre.length > 0) {
      const profiles = await Promise.all(
        idsSinNombre.map(async (id) => {
          const profile = await profileService.getProfileById(id) || await profileService.getProfileByUserId(id);
          const name = profile
            ? ([profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.email || '-')
            : null;
          return { id, name };
        })
      );
      const usuariosMap = {};
      for (const { id, name } of profiles) { if (name) usuariosMap[id] = name; }
      for (const mov of allMovs) {
        if (mov.id_user && !mov.nombre_user && usuariosMap[mov.id_user]) {
          mov.nombre_user = usuariosMap[mov.id_user];
        }
      }
      logCajaDebug('Usuarios hidratados para movimientos', {
        proyectoId: pid,
        perfilesEncontrados: Object.keys(usuariosMap).length,
        idsSolicitados: idsSinNombre,
      });
    }
    setMovimientos(movs || []);
    setMovimientosUSD(movsUsd || []);
    logCajaDebug('Estados locales de movimientos actualizados', {
      proyectoId: pid,
      ars: movs?.length || 0,
      usd: movsUsd?.length || 0,
    });
    return { movs, movsUsd };
  }, [authUserUid]);

  const handleOpenConfirmarPago = useCallback((mov) => {
    setConfirmarPagoMov(mov);
  }, []);

  const handleCloseConfirmarPagoDialog = useCallback(() => {
    if (confirmarPagoLoading) return;
    setConfirmarPagoMov(null);
  }, [confirmarPagoLoading]);

  const handleConfirmarPagoEjecutar = useCallback(async () => {
    const mov = confirmarPagoMov;
    if (!mov?.id || !proyectoId) return;
    setConfirmarPagoLoading(true);
    try {
      const nombreUsuario = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || null;
      const patch = buildCompletarPagoUpdateFields(mov);
      const res = await movimientosService.updateMovimiento(mov.id, { ...mov, ...patch }, nombreUsuario);
      if (res?.error) {
        setAlert({ open: true, message: 'No se pudo confirmar el pago', severity: 'error' });
        return;
      }
      await fetchAndHydrateMovimientos(proyectoId);
      setAlert({ open: true, message: 'Pago confirmado correctamente', severity: 'success' });
      setConfirmarPagoMov(null);
      setDetalleMov((prev) => (prev?.id === mov.id ? { ...prev, ...patch } : prev));
    } catch {
      setAlert({ open: true, message: 'Error al confirmar el pago', severity: 'error' });
    } finally {
      setConfirmarPagoLoading(false);
    }
  }, [confirmarPagoMov, proyectoId, user, fetchAndHydrateMovimientos]);

  const handleRefresh = async () => {
    if (!proyectoId) return;
    await fetchAndHydrateMovimientos(proyectoId);
    setAlert({
      open: true,
      message: 'Listado actualizado correctamente',
      severity: 'success',
    });
  };
  

  useEffect(() => {
    if (isMobile) {
      setShowDolar(false);
      setShowPesos(true);
    }
    const fetchMovimientosData = async (proyectoId) => {
      setLoadingPage(true);
      logCajaDebug('Inicio fetchMovimientosData', {
        proyectoId,
        routerQuery: router.query,
        authUserUid,
      });
      // Limpiar datos anteriores para no mostrar info de otro proyecto
      setMovimientos([]);
      setMovimientosUSD([]);
      setProyecto(null);

      // Cargar empresa, proyecto y movimientos en paralelo
      const [empresa, proyecto] = await Promise.all([
        getEmpresaDetailsFromUser(userRef.current),
        getProyectoById(proyectoId),
      ]);
      logCajaDebug('Empresa y proyecto cargados', {
        empresaId: empresa?.id,
        empresaNombre: empresa?.nombre,
        proyectoId: proyecto?.id,
        proyectoNombre: proyecto?.nombre,
        soloDolar: empresa?.solo_dolar,
        conEstados: empresa?.con_estados,
        mediosPago: empresa?.medios_pago?.length || 0,
      });

      const cajasIniciales = empresa.cajas_virtuales?.length > 0 ? empresa.cajas_virtuales : [
        { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
        { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" , equivalencia: 'none', type: '', baseCalculo: 'total' },
      ];
      if (!empresa.cajas_virtuales || empresa.cajas_virtuales.length === 0) {
        updateEmpresaDetails(empresa.id, { cajas_virtuales: cajasIniciales }); // fire-and-forget
      }
      setEmpresa({ ...empresa, cajas_virtuales: cajasIniciales });
      setCajasVirtuales(cajasIniciales);

      // Autoseleccionar caja: la que coincida con el filtro de la URL, o la primera
      const cajaFromUrl = router.query.caja ? (() => { try { return JSON.parse(router.query.caja); } catch { return null; } })() : null;
      const cajaDefault = (cajaFromUrl && cajasIniciales.find(c => c.moneda === cajaFromUrl.moneda && c.medio_pago === (cajaFromUrl.medio_pago || '')))
        || cajasIniciales[0]
        || null;
      logCajaDebug('Resolución de cajas', {
        empresaId: empresa?.id,
        cajasIniciales,
        cajaFromUrl,
        cajaDefault,
      });
      applyCajaSelection(cajaDefault);

      // Cargar proyectos para transferencias (no bloquea la tabla)
      getProyectosByEmpresa(empresa).then(data => setProyectos(data || [])).catch(() => {});

      if (empresa.solo_dolar) {
        setTablaActiva("USD")
      }

      setProyecto(proyecto);
      // --- hidratar preferencias guardadas ---
      const savedCols = proyecto?.ui_prefs?.columnas;
      logCajaDebug('Preferencias guardadas de columnas', {
        proyectoId: proyecto?.id,
        savedCols: savedCols || null,
      });
      if (savedCols) {
        if (typeof savedCols.compact === 'boolean') {
          setCompactCols(savedCols.compact);
        }
        if (savedCols.visible && typeof savedCols.visible === 'object') {
          setVisibleCols((prev) => ({ ...defaultVisible, ...savedCols.visible }));
        }
        if (Array.isArray(savedCols.orden)) {
          setColumnasOrden(savedCols.orden);
        }
      }
      setPrefsHydrated(true);
      await fetchAndHydrateMovimientos(proyectoId);

      // Aplicar filtro desde query params si existe, o limpiar si no está
      if (router.query.codigoSync) {
        logCajaDebug('Aplicando codigoSync desde query', {
          codigoSync: router.query.codigoSync,
        });
        setFilters(prev => ({
          ...prev,
          codigoSync: router.query.codigoSync
        }));
      } else {
        // Si no hay codigoSync en la URL, limpiar el filtro
        logCajaDebug('Sin codigoSync en query; limpiando filtro', {
          routerQuery: router.query,
        });
        setFilters(prev => ({
          ...prev,
          codigoSync: ''
        }));
      }
    };

    const fetchData = async () => {
      try {
        let pid = proyectoId;

        if (!proyectoId) {
          const proyectos = await getProyectosByEmpresa(empresa);
          if (proyectos.length === 1) {
            pid = proyectos[0].id;
          }
        }

        if (pid) {
          await fetchMovimientosData(pid);
        } else {
          logCajaDebug('No se resolvió proyectoId para cargar caja', {
            proyectoId,
            empresaId: empresa?.id || null,
          });
        }
      } catch (err) {
        console.error('Error cargando datos de caja:', err);
        logCajaDebug('Error en fetchData de caja', {
          message: err?.message,
          stack: err?.stack,
        });
      } finally {
        setLoadingPage(false);
        logCajaDebug('FetchData finalizado', {
          proyectoId,
        });
      }
    };

    fetchData();
  }, [proyectoId, authUserUid]);

  useEffect(() => {
    if (movimientos.length === 0 && movimientosUSD.length === 0) return;
    logCajaDebug('Muestra de movimientos tras render', {
      primerosARS: movimientos.slice(0, 3).map((m) => ({
        id: m.id,
        codigo: m.codigo_operacion || m.codigo || null,
        fecha: m.fecha_factura || m.fecha || null,
        total: m.total,
        moneda: m.moneda,
        medioPago: m.medio_pago,
        estado: m.estado,
      })),
      primerosUSD: movimientosUSD.slice(0, 3).map((m) => ({
        id: m.id,
        codigo: m.codigo_operacion || m.codigo || null,
        fecha: m.fecha_factura || m.fecha || null,
        total: m.total,
        moneda: m.moneda,
        medioPago: m.medio_pago,
        estado: m.estado,
      })),
    });
  }, [movimientos, movimientosUSD]);
  
  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };

  const activeCaja = useMemo(() => filters.caja || cajaSeleccionada || null, [filters.caja, cajaSeleccionada]);
  const activeTotalsCurrency = useMemo(() => {
    // Para cajas con equivalencia (usd_blue, etc.), la moneda visible es la de salida
    if (activeCaja?.equivalencia && activeCaja.equivalencia !== 'none') {
      const meta = EQUIV_META[activeCaja.equivalencia];
      if (meta?.out) return meta.out;
    }
    return activeCaja?.moneda || tablaActiva || 'ARS';
  }, [activeCaja, tablaActiva]);

  const cajaCellCtx = useMemo(() => ({
    empresa,
    compactCols,
    formatTimestamp,
    formatCurrency,
    openImg,
    openDetalle,
    goToEdit,
    handleEliminarClick,
    onOpenConfirmarPago: handleOpenConfirmarPago,
    deletingElement,
    COLS,
    cellBase,
    ellipsis,
  }), [empresa, compactCols, deletingElement, openDetalle, handleOpenConfirmarPago]);

  const onSelectCaja = (caja) => {
    applyCajaSelection(caja);
  };

  // helper para normalizar fecha (Timestamp/Date/string/number)
const getTime = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return new Date(v).getTime() || 0;
  if (v?.toDate) return v.toDate().getTime();
  if (v?.seconds) return v.seconds * 1000;
  return 0;
};

  
  const totalesDetallados = useMemo(() => {
    const base = {
      ARS: { ingreso: 0, egreso: 0 },
      USD: { ingreso: 0, egreso: 0 },
    };

    // Si la caja activa tiene equivalencia, convertir montos a la moneda de salida
    const equiv = activeCaja?.equivalencia && activeCaja.equivalencia !== 'none'
      ? EQUIV_META[activeCaja.equivalencia]
      : null;
  
    const useSubtotal = activeCaja?.baseCalculo === 'subtotal' && (!activeCaja.equivalencia || activeCaja.equivalencia === 'none');

    movimientosFiltrados.forEach((m) => {
      const tipo = m.type === 'ingreso' ? 'ingreso' : 'egreso';

      if (equiv?.out && equiv.path) {
        // Con equivalencia: siempre usar total (las equivalencias se calculan sobre total)
        const converted = equiv.path(m.equivalencias);
        const val = typeof converted === 'number' ? converted : 0;
        const outKey = equiv.out.toUpperCase();
        if (!base[outKey]) base[outKey] = { ingreso: 0, egreso: 0 };
        base[outKey][tipo] += val;
      } else {
        // Sin equivalencia: usar subtotal o total según baseCalculo de la caja activa
        const monto = useSubtotal
          ? (Number(m.subtotal ?? m.total) || 0)
          : (Number(m.total) || 0);
        const moneda = (m.moneda || 'ARS').toUpperCase();
        if (!base[moneda]) base[moneda] = { ingreso: 0, egreso: 0 };
        base[moneda][tipo] += monto;
      }
    });
  
    return base;
  }, [movimientosFiltrados, activeCaja]);

  useEffect(() => {
    logCajaDebug('Diagnóstico de fuente para totales', {
      filtersCaja: filters.caja,
      cajaSeleccionada,
      activeCaja,
      activeTotalsCurrency,
      movimientosFiltradosPorMoneda: movimientosFiltrados.reduce((acc, mov) => {
        const moneda = (mov.moneda || 'SIN_MONEDA').toUpperCase();
        if (!acc[moneda]) acc[moneda] = { cantidad: 0, total: 0 };
        acc[moneda].cantidad += 1;
        acc[moneda].total += Number(mov.total) || 0;
        return acc;
      }, {}),
      totalesDetallados,
      netoVisible: (totalesDetallados[activeTotalsCurrency]?.ingreso || 0) - (totalesDetallados[activeTotalsCurrency]?.egreso || 0),
    });
  }, [filters.caja, cajaSeleccionada, activeCaja, activeTotalsCurrency, movimientosFiltrados, totalesDetallados]);

  useEffect(() => {
    if (!filters.caja || !cajaSeleccionada) return;
    const filtersCajaKey = JSON.stringify({
      moneda: filters.caja.moneda || null,
      medio_pago: filters.caja.medio_pago || '',
      estado: filters.caja.estado || '',
      type: filters.caja.type || '',
    });
    const selectedCajaKey = JSON.stringify({
      moneda: cajaSeleccionada.moneda || null,
      medio_pago: cajaSeleccionada.medio_pago || '',
      estado: cajaSeleccionada.estado || '',
      type: cajaSeleccionada.type || '',
    });
    if (filtersCajaKey !== selectedCajaKey) {
      logCajaDebug('Divergencia entre filters.caja y cajaSeleccionada', {
        filtersCaja: filters.caja,
        cajaSeleccionada,
        activeCaja,
        activeTotalsCurrency,
      });
    }
  }, [filters.caja, cajaSeleccionada, activeCaja, activeTotalsCurrency]);

  // helper: normaliza la fecha al inicio del día (ignora hora)
const getDayMs = (v) => {
  if (!v) return 0;
  let d;
  if (typeof v === 'number') d = new Date(v);
  else if (typeof v === 'string') {
    // Manejar formato DD/MM/YYYY (común en Argentina)
    const parts = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) {
      d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
    } else {
      d = new Date(v);
    }
  }
  else if (v?.toDate) d = v.toDate();
  else if (v?.seconds) d = new Date(v.seconds * 1000);
  else if (v?._seconds) d = new Date(v._seconds * 1000);
  else return 0;
  if (!d || isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

  // ordenar por fecha_factura (desc) y, si empata, por código (asc)
const sortedMovs = useMemo(() => {
  const arr = [...(movimientosFiltrados || [])];
  return arr.sort((a, b) => {
    const da = getDayMs(a.fecha_factura);
    const db = getDayMs(b.fecha_factura);
    if (db !== da) return db - da; // más reciente primero
    const ca = (a.codigo_operacion || a.codigo || '').toString();
    const cb = (b.codigo_operacion || b.codigo || '').toString();
    return cb.localeCompare(ca, 'es-AR', { numeric: true, sensitivity: 'base' });
  });
}, [movimientosFiltrados]);

// Agrupar movimientos por prorrateo
const movimientosConProrrateo = useMemo(() => {
  const grupos = {};
  const sueltos = [];
  
  sortedMovs.forEach(mov => {
    if (mov.prorrateo_grupo_id && mov.es_movimiento_prorrateo) {
      if (!grupos[mov.prorrateo_grupo_id]) {
        grupos[mov.prorrateo_grupo_id] = [];
      }
      grupos[mov.prorrateo_grupo_id].push(mov);
    } else {
      sueltos.push(mov);
    }
  });
  
  // Crear array final intercalando grupos y movimientos sueltos
  const resultado = [];
  
  sueltos.forEach(mov => {
    resultado.push({ tipo: 'movimiento', data: mov });
  });
  
  Object.entries(grupos).forEach(([grupoId, movimientos]) => {
    if (movimientos.length > 0) {
      // Ordenar los movimientos del grupo por fecha y código
      const movimientosOrdenados = movimientos.sort((a, b) => {
        const da = getDayMs(a.fecha_factura);
        const db = getDayMs(b.fecha_factura);
        if (db !== da) return db - da;
        const ca = (a.codigo_operacion || '').toString();
        const cb = (b.codigo_operacion || '').toString();
        return cb.localeCompare(ca, 'es-AR', { numeric: true });
      });
      
      resultado.push({ 
        tipo: 'grupo_prorrateo', 
        grupoId, 
        movimientos: movimientosOrdenados,
        totalGrupo: movimientosOrdenados.reduce((sum, m) => sum + (Number(m.total) || 0), 0),
        moneda: movimientosOrdenados[0]?.moneda || 'ARS',
        proveedor: movimientosOrdenados[0]?.nombre_proveedor,
        categoria: movimientosOrdenados[0]?.categoria,
        fecha_factura: movimientosOrdenados[0]?.fecha_factura
      });
    }
  });
  
  // Reordenar todo por fecha
  return resultado.sort((a, b) => {
    const getDate = (item) => {
      if (item.tipo === 'movimiento') return getDayMs(item.data.fecha_factura);
      return getDayMs(item.fecha_factura);
    };
    return getDate(b) - getDate(a);
  });
}, [sortedMovs]);

  const formatByCurrency = (currency, amount) => {
    const cur = currency === 'USD' ? 'USD' : 'ARS';
    return amount?.toLocaleString('es-AR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2
    }) ?? (cur === 'USD' ? 'US$ 0,00' : '$ 0,00');
  };


   const calcularTotalParaCaja = (caja) => {
       // EVITAR DUPLICADOS: Si un movimiento existe en ambos arrays, solo tomarlo una vez
       const movimientosUnicos = new Map();
       [...movimientos, ...movimientosUSD].forEach(mov => {
         movimientosUnicos.set(mov.id, mov);
       });
       const allMovs = Array.from(movimientosUnicos.values());
       
       const meta = EQUIV_META[caja.equivalencia || 'none'] || EQUIV_META.none;
       // Con equivalencia activa siempre usamos total (las equivalencias se calculan sobre total)
       const useSubtotal = caja.baseCalculo === 'subtotal' && (!caja.equivalencia || caja.equivalencia === 'none');
       
       if (caja.equivalencia && caja.equivalencia !== 'none') {
         console.group(`🔍 DEBUG Caja: ${caja.nombre} (${caja.equivalencia})`);
         console.log(`📊 Total movimientos únicos: ${allMovs.length}`);
       }
     
       const mergeMonedas = (caja.equivalencia && caja.equivalencia !== 'none');

       const result = allMovs.reduce((acc, mov) => {
         const matchMedioPago = caja.medio_pago ? mov.medio_pago === caja.medio_pago : true;
         const matchEstado    = caja.estado ? mov.estado === caja.estado : true;
         const matchType      = caja.type ? mov.type === caja.type : true;
         const matchMoneda    = mergeMonedas ? true : (caja.moneda ? mov.moneda === caja.moneda : true);
         if (!matchMedioPago || !matchEstado || !matchType || !matchMoneda) return acc;
     
         let val;
         if (meta.path) {
           const equivVal = meta.path(mov.equivalencias);
           if (typeof equivVal === 'number') {
             val = equivVal;
             if (caja.equivalencia && caja.equivalencia !== 'none') {
               console.log(`✅ ${mov.id}: ${mov.moneda} $${mov.total} → ${meta.out} $${val.toFixed(2)}`);
             }
           } else {
             val = 0;
             console.warn(`❌ Movimiento ${mov.id} (${mov.moneda} $${mov.total}) sin equivalencia ${caja.equivalencia} calculada`);
           }
         } else {
           // sin equivalencia → monto nativo (total o subtotal según config)
           val = useSubtotal ? (Number(mov.subtotal ?? mov.total) || 0) : (Number(mov.total) || 0);
         }
         
         const contribution = (mov.type === 'ingreso' ? val : -val);
         if (caja.equivalencia && caja.equivalencia !== 'none') {
           console.log(`📝 ${mov.type}: ${contribution > 0 ? '+' : ''}${contribution.toFixed(2)}`);
         }
         
         return acc + contribution;
       }, 0);
       
       if (caja.equivalencia && caja.equivalencia !== 'none') {
         console.log(`🎯 Total final: ${result.toFixed(2)}`);
         console.groupEnd();
       }
       
       return result;
     };

  const movimientosExportables = useMemo(() => {
    const movimientosUnicos = new Map();
    [...movimientos, ...movimientosUSD].forEach((mov) => {
      movimientosUnicos.set(mov.id, mov);
    });
    return Array.from(movimientosUnicos.values());
  }, [movimientos, movimientosUSD]);

  const handleOpenExportCsvDialog = useCallback(() => {
    if (!csvConfigHydrated) {
      setCsvSelectedFields(csvDefaultOrder);
      setCsvFieldOrder(csvDefaultOrder);
      setCsvConfigHydrated(true);
    }
    setCsvDialogOpen(true);
  }, [csvConfigHydrated, csvDefaultOrder]);

  const handleToggleCsvField = useCallback((fieldKey) => {
    setCsvSelectedFields((prev) => (
      prev.includes(fieldKey)
        ? prev.filter((key) => key !== fieldKey)
        : [...prev, fieldKey]
    ));
  }, []);

  const handleReorderCsvField = useCallback((fieldKey, direction) => {
    setCsvFieldOrder((prev) => {
      const currentIndex = prev.indexOf(fieldKey);
      if (currentIndex === -1) return prev;
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      return moveItem(prev, currentIndex, nextIndex);
    });
  }, []);

  const handleResetCsvConfig = useCallback(() => {
    setCsvSelectedFields(csvDefaultOrder);
    setCsvFieldOrder(csvDefaultOrder);
  }, [csvDefaultOrder]);

  const handleExportCsvAnalisis = useCallback(() => {
    const selectedFields = csvFieldOrder
      .filter((fieldKey) => csvSelectedFields.includes(fieldKey))
      .map((fieldKey) => csvExportFields.find((field) => field.key === fieldKey))
      .filter(Boolean);

    if (selectedFields.length === 0) {
      setAlert({
        open: true,
        message: 'Seleccioná al menos un campo para exportar',
        severity: 'warning',
      });
      return;
    }

    setCsvExporting(true);
    try {
      const headers = selectedFields.map((field) => formatCsvCell(field.label));
      const rows = movimientosExportables.map((mov) => (
        selectedFields.map((field) => formatCsvCell(field.getValue(mov)))
      ));
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      descargarArchivoCsv(
        `analisis_movimientos_${proyecto?.nombre || 'proyecto'}_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent
      );

      setCsvDialogOpen(false);
      setAlert({
        open: true,
        message: `CSV exportado con ${movimientosExportables.length} movimientos`,
        severity: 'success',
      });
    } finally {
      setCsvExporting(false);
    }
  }, [csvExportFields, csvFieldOrder, csvSelectedFields, movimientosExportables, proyecto?.nombre]);

  const handleGuardarCaja = async () => {
    const nuevaCaja = {
      nombre: nombreCaja,
      moneda: monedaCaja || '',
      medio_pago: medioPagoCaja,
      estado: estadoCaja,
      equivalencia: equivalenciaCaja || 'none',
      type: typeCaja || '',
      baseCalculo: baseCalculoCaja || 'total',
      ...(savedViewMode ? { filterSet: serializeFilterSet(filters) } : {}),
    };
  
    const nuevasCajas = [...cajasVirtuales];
  
    if (editandoCaja !== null) {
      nuevasCajas[editandoCaja] = nuevaCaja;
    } else {
      nuevasCajas.push(nuevaCaja);
    }
  
    setCajasVirtuales(nuevasCajas);
    setShowCrearCaja(false);
    setSavedViewMode(false);
    setNombreCaja('');
    setMonedaCaja('ARS');
    setMedioPagoCaja('Efectivo');
    setEstadoCaja('');
    setEquivalenciaCaja('none');
    setTypeCaja('');
    setBaseCalculoCaja('total');
    setEditandoCaja(null);
    await updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevasCajas });
  };
  
  const totalRows = movimientosConProrrateo.length;
  
  const paginatedMovs = useMemo(() => {
    const start = page * rowsPerPage;
    const end = Math.min(totalRows, start + rowsPerPage);
    return movimientosConProrrateo.slice(start, end);
  }, [movimientosConProrrateo, page, rowsPerPage, totalRows]);

  // ── Helpers selección masiva ──
  const allPageIds = useMemo(() => {
    const ids = [];
    paginatedMovs.forEach((item) => {
      if (item.tipo === 'grupo_prorrateo') {
        item.movimientos.forEach((m) => ids.push(m.id));
      } else {
        ids.push(item.data.id);
      }
    });
    return ids;
  }, [paginatedMovs]);

  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDone = async () => {
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
    await handleRefresh();
    setAlert({ open: true, message: 'Edición masiva completada', severity: 'success' });
  };
  
  
  const handleOpenTransferencia = () => {
    setOpenTransferencia(true);
  };

  const handleCloseTransferencia = () => {
    setOpenTransferencia(false);
  };

  const handleTransferenciaSuccess = (result) => {
    setAlert({
      open: true,
      message: 'Transferencia interna realizada con éxito',
      severity: 'success',
    });
    // Refrescar movimientos después de la transferencia
    handleRefresh();
  };

  const handleOpenIntercambio = () => {
    setOpenIntercambio(true);
  };

  const handleCloseIntercambio = () => {
    setOpenIntercambio(false);
  };

  const handleIntercambioSuccess = (result) => {
    setAlert({
      open: true,
      message: 'Operación de cambio realizada con éxito',
      severity: 'success',
    });
    handleRefresh();
  };

  const handleRecalcularEquivalencias = async () => {
    if (!proyectoId) return;
    setAlert({
      open: true,
      message: 'Este proceso puede durar varios minutos, por favor espere...',
      severity: 'warning',
    });
    const res = await movimientosService.recalcularEquivalenciasPorProyecto(proyectoId);
    
    if (!res.error) {
      setAlert({
        open: true,
        message: 'Equivalencias recalculadas con éxito',
        severity: 'success',
      });
      await handleRefresh(); // refresca los movimientos actualizados
    } else {
      setAlert({
        open: true,
        message: 'Error al recalcular equivalencias',
        severity: 'error',
      });
    }
  };

  
  const handleMenuOptionClick = (action) => {
    switch (action) {
      case 'filtrar':
        handleFiltrosActivos();
        break;
      case 'registrarMovimiento':
        router.push('/movementForm?proyectoName=' + proyecto.nombre + '&proyectoId=' + proyecto.id + '&lastPageUrl=' + router.asPath + "&lastPageName=" + proyecto.nombre);
        break;
      case 'recalcularSheets':
        handleRecargarProyecto(proyecto.id);
        break;
      case 'recalcularEquivalencias':
        handleRecalcularEquivalencias();
        break;
      default:
        break;
    }
    handleCloseMenu();
  };
  const formatDateChip = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '';
  const filterChips = useMemo(() => {
    const chips = [];
    const add = (label, onDelete) => chips.push({ label, onDelete });
    if (filters.fechaDesde || filters.fechaHasta) {
      const label = filters.fechaDesde && filters.fechaHasta
        ? `Fecha: ${formatDateChip(filters.fechaDesde)} - ${formatDateChip(filters.fechaHasta)}`
        : (filters.fechaDesde ? `Fecha desde: ${formatDateChip(filters.fechaDesde)}` : `Fecha hasta: ${formatDateChip(filters.fechaHasta)}`);
      add(label, () => setFilters((f) => ({ ...f, fechaDesde: null, fechaHasta: null })));
    }
    if (filters.fechaPagoDesde || filters.fechaPagoHasta) {
      const label = filters.fechaPagoDesde && filters.fechaPagoHasta
        ? `Pago: ${formatDateChip(filters.fechaPagoDesde)} - ${formatDateChip(filters.fechaPagoHasta)}`
        : (filters.fechaPagoDesde ? `Pago desde: ${formatDateChip(filters.fechaPagoDesde)}` : `Pago hasta: ${formatDateChip(filters.fechaPagoHasta)}`);
      add(label, () => setFilters((f) => ({ ...f, fechaPagoDesde: null, fechaPagoHasta: null })));
    }
    if (filters.palabras) add(`Buscar: ${filters.palabras}`, () => setFilters((f) => ({ ...f, palabras: '' })));
    if (filters.observacion) add(`Observación: ${filters.observacion}`, () => setFilters((f) => ({ ...f, observacion: '' })));
    if (filters.codigoSync) add(`Código: ${filters.codigoSync}`, () => setFilters((f) => ({ ...f, codigoSync: '' })));
    (filters.tipo || []).forEach((v) => add(`Tipo: ${v}`, () => setFilters((f) => ({ ...f, tipo: f.tipo.filter((x) => x !== v) }))));
    (filters.moneda || []).forEach((v) => add(`Moneda: ${v}`, () => setFilters((f) => ({ ...f, moneda: f.moneda.filter((x) => x !== v) }))));
    (filters.proveedores || []).forEach((v) => add(`Proveedor: ${v}`, () => setFilters((f) => ({ ...f, proveedores: f.proveedores.filter((x) => x !== v) }))));
    (filters.categorias || []).forEach((v) => add(`Categoría: ${v}`, () => setFilters((f) => ({ ...f, categorias: f.categorias.filter((x) => x !== v) }))));
    (filters.subcategorias || []).forEach((v) => add(`Subcategoría: ${v}`, () => setFilters((f) => ({ ...f, subcategorias: f.subcategorias.filter((x) => x !== v) }))));
    (filters.medioPago || []).forEach((v) => add(`Medio: ${v}`, () => setFilters((f) => ({ ...f, medioPago: f.medioPago.filter((x) => x !== v) }))));
    (filters.etapa || []).forEach((v) => add(`Etapa: ${v}`, () => setFilters((f) => ({ ...f, etapa: f.etapa.filter((x) => x !== v) }))));
    (filters.estados || []).forEach((v) => add(`Estado: ${v}`, () => setFilters((f) => ({ ...f, estados: f.estados.filter((x) => x !== v) }))));
    (filters.cuentaInterna || []).forEach((v) => add(`Cuenta: ${v}`, () => setFilters((f) => ({ ...f, cuentaInterna: f.cuentaInterna.filter((x) => x !== v) }))));
    (filters.tagsExtra || []).forEach((v) => add(`Tag: ${v}`, () => setFilters((f) => ({ ...f, tagsExtra: f.tagsExtra.filter((x) => x !== v) }))));
    (filters.empresaFacturacion || []).forEach((v) => add(`Emp. fact.: ${v}`, () => setFilters((f) => ({ ...f, empresaFacturacion: f.empresaFacturacion.filter((x) => x !== v) }))));
    if (filters.facturaCliente) add(filters.facturaCliente === 'cliente' ? 'Factura: Cliente' : 'Factura: Propia', () => setFilters((f) => ({ ...f, facturaCliente: '' })));
    if (filters.montoMin) add(`Monto min: ${filters.montoMin}`, () => setFilters((f) => ({ ...f, montoMin: '' })));
    if (filters.montoMax) add(`Monto max: ${filters.montoMax}`, () => setFilters((f) => ({ ...f, montoMax: '' })));
    return chips;
  }, [filters, setFilters]);

  useEffect(() => {
    logCajaDebug('Estado visible de filtros/caja/totales', {
      proyectoId,
      cajaSeleccionada,
      filters,
      movimientosARS: movimientos.length,
      movimientosUSD: movimientosUSD.length,
      movimientosFiltrados: movimientosFiltrados.length,
      totalRows,
      page,
      rowsPerPage,
      totalesDetallados,
      totalesHook: totales,
      filterChips: filterChips.map((chip) => chip.label),
    });
  }, [
    proyectoId,
    cajaSeleccionada,
    filters,
    movimientos.length,
    movimientosUSD.length,
    movimientosFiltrados.length,
    totalRows,
    page,
    rowsPerPage,
    totalesDetallados,
    totales,
    filterChips,
  ]);

  const totalesUsdBlue = useMemo(() => {
    let ingreso = 0, egreso = 0;
    (movimientosFiltrados || []).forEach(m => {
      const v = Number(m?.equivalencias?.total?.usd_blue) || 0;
      if (m.type === 'ingreso') ingreso += v; else egreso += v;
    });
    return { ingreso, egreso, neto: ingreso - egreso };
  }, [movimientosFiltrados]);
  
// si cambian los filtros y la página quedó fuera de rango, volvemos a 0
useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  if (page > maxPage) setPage(0);
}, [totalRows, rowsPerPage]); // intencional: no incluimos 'page' para evitar loop

  const tituloConCodigo = useMemo(() => {
    if (filters.codigoSync && filters.codigoSync.trim() !== '') {
      return `${proyecto?.nombre || 'Proyecto'} - Código: ${filters.codigoSync}`;
    }
    return proyecto?.nombre || 'Proyecto';
  }, [proyecto?.nombre, filters.codigoSync]);

  if (empresa?.cuenta_suspendida === true) {
    return 'Cuenta suspendida. Contacte al administrador.';
  }

  return (
    <DashboardLayout title={tituloConCodigo}>
      <Head>
        <title>{tituloConCodigo}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8, paddingTop: 2, position: 'relative' }}>
        {loadingPage && (
          <Backdrop open sx={{ position: 'absolute', zIndex: 10, bgcolor: 'rgba(255,255,255,0.7)' }}>
            <CircularProgress />
          </Backdrop>
        )}
        <Container maxWidth="xl">
          <Stack spacing={3}>
            
            <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="stretch">
              {isMobile ? (
                <Stack spacing={1}>
                  <Button size="small" variant="text" onClick={() => setShowCajasMobile((v) => !v)}>
                    {showCajasMobile ? 'Ocultar cajas' : 'Mostrar cajas'}
                  </Button>
                  {!showCajasMobile && cajaSeleccionada && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {cajaSeleccionada.nombre}
                        </Typography>
                        {cajaSeleccionada.equivalencia && cajaSeleccionada.equivalencia !== 'none' && (
                          <Typography variant="caption" color="text.secondary">
                            {cajaSeleccionada.equivalencia.replace('_', ' ')}
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCajaAmount(cajaSeleccionada, calcularTotalParaCaja(cajaSeleccionada))}
                      </Typography>
                    </Box>
                  )}
                  {showCajasMobile && (
                    <Stack spacing={0.5}>
                      {cajasVirtuales.map((caja, index) => {
                        const selected = cajaSeleccionada?.nombre === caja.nombre;
                        return (
                          <Box
                            key={index}
                            onClick={() => onSelectCaja(caja)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              px: 1.5,
                              py: 1,
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: selected ? 'primary.main' : 'divider',
                              bgcolor: selected ? 'action.hover' : 'background.paper',
                            }}
                          >
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {caja.nombre}
                              </Typography>
                              {caja.equivalencia && caja.equivalencia !== 'none' && (
                                <Typography variant="caption" color="text.secondary">
                                  {caja.equivalencia.replace('_', ' ')}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={0.5}>
                                {caja.baseCalculo === 'subtotal' && (
                                  <Chip size="small" label="neto" color="info" variant="outlined" />
                                )}
                                {caja.filterSet && (
                                  <Chip size="small" label="vista" color="secondary" variant="outlined" />
                                )}
                              </Stack>
                            </Stack>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCajaAmount(caja, calcularTotalParaCaja(caja))}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    overflowX: 'visible',
                  }}
                >
                  {cajasVirtuales.map((caja, index) => (
                    <Box key={index} sx={{ position: 'relative', width: '100%', mb: 1, display: 'flex' }}>
                      <Button
                        fullWidth
                        variant={cajaSeleccionada?.nombre === caja.nombre ? "contained" : "outlined"}
                        onClick={() => onSelectCaja(caja)}
                        sx={{
                          justifyContent: 'space-between',
                          pl: 2,
                          pr: 5,
                          minHeight: 56,
                          alignItems: 'center',
                          textAlign: 'left',
                        }}
                      >
                        <Typography>{caja.nombre}</Typography>
                        {caja.equivalencia && caja.equivalencia !== 'none' && (
                          <Chip size="small" label={caja.equivalencia.replace('_', ' ')} sx={{ ml: 1 }} />
                        )}
                        {caja.baseCalculo === 'subtotal' && (
                          <Chip size="small" label="neto" color="info" variant="outlined" sx={{ ml: 0.5 }} />
                        )}
                        {caja.filterSet && (
                          <Chip size="small" label="vista" color="secondary" variant="outlined" sx={{ ml: 0.5 }} />
                        )}
                        <Typography>{formatCajaAmount(caja, calcularTotalParaCaja(caja))}</Typography>
                      </Button>
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenCajaMenu(event, index)}
                        sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

<Menu
  anchorEl={anchorCajaEl}
  open={Boolean(anchorCajaEl)}
  onClose={handleCloseCajaMenu}
>
  <MenuItem onClick={() => handleEditarCaja(cajaMenuIndex)}>Editar</MenuItem>
  <MenuItem onClick={() => handleEliminarCaja(cajaMenuIndex)}>Eliminar</MenuItem>
</Menu>
<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
  {isMobile && (
    <Button
      variant="outlined"
      size="small"
      startIcon={<FilterListIcon />}
      onClick={() => setFiltersOpen(true)}
      fullWidth
    >
      <Badge color="primary" badgeContent={filterChips.length} invisible={filterChips.length === 0}>
        <span>Filtros</span>
      </Badge>
    </Button>
  )}
</Box>

{!isMobile && (
  <Stack spacing={0.75} sx={{ flexShrink: 0, justifyContent: 'center' }}>
    <Button
      variant="outlined"
      size="small"
      fullWidth
      startIcon={<SortIcon />}
      onClick={() => setOpenOrdenar(true)}
      sx={{ minWidth: 110, whiteSpace: 'nowrap' }}
    >
      Ordenar columnas
    </Button>
    <Button
      variant="outlined"
      size="small"
      fullWidth
      onClick={handleOpenCols}
      sx={{ minWidth: 110, whiteSpace: 'nowrap' }}
    >
      <Badge color="primary" badgeContent={hiddenColsCount} invisible={hiddenColsCount === 0}>
        <span>Columnas</span>
      </Badge>
    </Button>
    <Button
      variant="contained"
      size="small"
      fullWidth
      startIcon={<MoreVertIcon />}
      onClick={handleOpenMenu}
      sx={{ minWidth: 110, whiteSpace: 'nowrap' }}
    >
      Acciones
    </Button>
  </Stack>
)}

            </Stack>
            <Dialog open={showCrearCaja} onClose={() => { setShowCrearCaja(false); setSavedViewMode(false); }}>
  <DialogTitle>
    {savedViewMode ? 'Guardar vista actual como caja' : (editandoCaja !== null ? 'Editar caja' : 'Crear vista de caja personalizada')}
  </DialogTitle>
  <DialogContent>
    {savedViewMode && filterChips.length > 0 && (
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          Filtros activos que se guardarán con esta caja:
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {filterChips.map((chip, idx) => (
            <Chip key={idx} label={chip.label} size="small" variant="outlined" />
          ))}
        </Box>
      </Box>
    )}
    <TextField label="Nombre de la caja" fullWidth value={nombreCaja} onChange={(e) => setNombreCaja(e.target.value)} />
    {!savedViewMode && (
      <>
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Moneda</InputLabel>
      <Select value={monedaCaja} onChange={(e) => setMonedaCaja(e.target.value)}>
        <MenuItem value="">Todas</MenuItem>
        <MenuItem value="ARS">Pesos</MenuItem>
        <MenuItem value="USD">Dólares</MenuItem>
      </Select>
    </FormControl>
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Tipo</InputLabel>
      <Select value={typeCaja} label="Tipo" onChange={(e) => setTypeCaja(e.target.value)}>
        <MenuItem value="">Todos</MenuItem>
        <MenuItem value="ingreso">Ingresos</MenuItem>
        <MenuItem value="egreso">Egresos</MenuItem>
      </Select>
    </FormControl>
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Medio de pago</InputLabel>
      <Select value={medioPagoCaja} onChange={(e) => setMedioPagoCaja(e.target.value)}>
      <MenuItem key="" value="">
            Todos
          </MenuItem>
        {empresa?.medios_pago.map((medio) => (
          <MenuItem key={medio} value={medio}>
            {medio}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
    {empresa?.con_estados && (
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Estado</InputLabel>
        <Select value={estadoCaja} onChange={(e) => setEstadoCaja(e.target.value)}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Pendiente">Pendiente</MenuItem>
          <MenuItem value="Pagado">Pagado</MenuItem>
        </Select>
      </FormControl>
    )}
     <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Mostrar como</InputLabel>
      <Select
        value={equivalenciaCaja}
        label="Mostrar como"
        onChange={(e) => setEquivalenciaCaja(e.target.value)}
      >
        <MenuItem value="none">Moneda original</MenuItem>
        <MenuItem value="usd_blue">USD blue</MenuItem>
        <MenuItem value="usd_oficial">USD oficial</MenuItem>
        <MenuItem value="usd_mep_medio">USD mep (medio)</MenuItem>
      </Select>
    </FormControl>
    </>
    )}
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Base de cálculo</InputLabel>
      <Select
        value={baseCalculoCaja}
        label="Base de cálculo"
        onChange={(e) => setBaseCalculoCaja(e.target.value)}
      >
        <MenuItem value="total">Total (con impuestos)</MenuItem>
        <MenuItem value="subtotal">Subtotal (sin impuestos)</MenuItem>
      </Select>
    </FormControl>

  </DialogContent>
  <DialogActions>
    <Button onClick={() => { setShowCrearCaja(false); setSavedViewMode(false); }}>Cancelar</Button>
    <Button onClick={handleGuardarCaja}>Crear</Button>
  </DialogActions>
</Dialog>

{isMobile && (
  <Drawer
    anchor="bottom"
    open={filtersOpen}
    onClose={() => setFiltersOpen(false)}
    PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90vh' } }}
  >
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Filtros</Typography>
      <FilterBarCajaProyecto
        filters={filters}
        setFilters={setFilters}
        options={options}
        onRefresh={handleRefresh}
        empresa={empresa}
        expanded={true}
        onToggleExpanded={() => setFiltersOpen(false)}
        storageKey={proyectoId}
        empresaId={empresa?.id}
        userId={authUserUid}
      />
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2 }}>
        <Button variant="text" onClick={() => setFiltersOpen(false)}>Cancelar</Button>
        <Button variant="contained" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
      </Stack>
    </Box>
  </Drawer>
)}

{!isMobile && (
  <FilterBarCajaProyecto
    filters={filters}
    setFilters={setFilters}
    options={options}
    onRefresh={handleRefresh}
    empresa={empresa}
    expanded={filtersOpen}
    onToggleExpanded={() => setFiltersOpen((o) => !o)}
    storageKey={proyectoId}
    empresaId={empresa?.id}
    userId={authUserUid}
  />
)}
            <Paper>
              <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
                <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
                  {alert.message}
                </Alert>
              </Snackbar>
              <Stack spacing={1}>


              <TotalesFiltrados
                  t={totalesDetallados}
                  fmt={formatByCurrency}
                  moneda={activeTotalsCurrency}
                  showUsdBlue={false}
                  usdBlue={totalesUsdBlue}
                  chips={[]}
                  onOpenFilters={() => setFiltersOpen((o) => !o)}
                  isMobile={isMobile}
                  showDetails={showTotalsDetails}
                  onToggleDetails={() => setShowTotalsDetails((s) => !s)}
                  baseCalculo={activeCaja?.baseCalculo || 'total'}
                />

              </Stack>
                {isMobile ? (
                  <Stack spacing={2}>
                    {paginatedMovs.length === 0 && (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1">Sin resultados</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Probá ajustar fechas, categorías o limpiar filtros.
                        </Typography>
                      </Paper>
                    )}
                    {paginatedMovs.map((item, index) => {
                      // Si es un grupo de prorrateo - mostrar solo los movimientos individuales
                      if (item.tipo === 'grupo_prorrateo') {
                        return (
                          <React.Fragment key={`grupo-${item.grupoId}`}>
                            {item.movimientos.map((mov, subIndex) => {
                              const amountColor = mov.type === 'ingreso' ? 'success.main' : 'error.main';
                              
                              return (
                                <Card key={`${item.grupoId}-${subIndex}`} sx={{ mb: 1, cursor: 'pointer', bgcolor: 'background.paper' }} onClick={() => openDetalle(mov)}>
                                  <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {mov.codigo_operacion}
                                      </Typography>
                                      <Typography variant="subtitle1" color={amountColor}>
                                        {formatByCurrency(mov.moneda, mov.total)}
                                      </Typography>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                      {mov.nombre_proveedor || '—'} • {mov.categoria || '—'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => { e.stopPropagation(); openMobileActions(e, mov); }}
                                      sx={{ mt: 1 }}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </React.Fragment>
                        );
                      }
                      
                      // Si es un movimiento normal
                      const mov = item.data;
                      return (
                        <Card key={index} sx={{ cursor: 'pointer', bgcolor: 'background.paper' }} onClick={() => openDetalle(mov)}>
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {mov.codigo_operacion || '—'}
                              </Typography>
                              <Typography variant="subtitle1" color={mov.type === "ingreso" ? "green" : "red"}>
                                {formatCurrency(mov.total)}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {mov.nombre_proveedor || '—'} • {mov.categoria || '—'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); openMobileActions(e, mov); }}
                              sx={{ mt: 1 }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                  </Stack>
                ) : (
                  <>

<Popover
  open={openCols}
  anchorEl={anchorColsEl}
  onClose={handleCloseCols}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  PaperProps={{ sx: { p: 1, width: 280 } }}
>
  <Stack spacing={1.25}>
    <FormControlLabel
      control={<Switch size="small" checked={compactCols} onChange={(e) => setCompactCols(e.target.checked)} />}
      label="Modo compacto"
    />

    <Stack direction="row" spacing={1}>
      <Button size="small" variant="outlined" onClick={() => applyPreset('finanzas')}>Finanzas</Button>
      <Button size="small" variant="outlined" onClick={() => applyPreset('operativo')}>Operativo</Button>
    </Stack>
    <Stack direction="row" spacing={1}>
      <Button size="small" variant="outlined" onClick={() => applyPreset('auditoria')}>Auditoría</Button>
      <Button size="small" variant="text" onClick={() => applyPreset('reset')}>Reset</Button>
    </Stack>
    <Divider sx={{ my: 0.5 }} />

    {/* lista de columnas */}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.codigo}     onChange={() => toggleCol('codigo')} />}     label="Código" />
    {compactCols ? (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechas}     onChange={() => toggleCol('fechas')} />}     label="Fechas" />
    ) : (
      <>
        <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaFactura}  onChange={() => toggleCol('fechaFactura')} />}  label="Fecha factura" />
        <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaCreacion} onChange={() => toggleCol('fechaCreacion')} />} label="Fecha creación" />
      </>
    )}
    {!compactCols && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tipo} onChange={() => toggleCol('tipo')} />} label="Tipo" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.total}        onChange={() => toggleCol('total')} />}        label="Total" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subtotal}     onChange={() => toggleCol('subtotal')} />}     label="Subtotal (sin impuestos)" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.impuestos}    onChange={() => toggleCol('impuestos')} />}    label="Impuestos" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.montoPagado}  onChange={() => toggleCol('montoPagado')} />}  label="Monto pagado" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.montoAprobado} onChange={() => toggleCol('montoAprobado')} />} label="Monto aprobado" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.categoria}    onChange={() => toggleCol('categoria')} />}    label={compactCols ? "Categoría / Subcat." : "Categoría"} />
    {!compactCols && empresa?.comprobante_info?.subcategoria && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subcategoria} onChange={() => toggleCol('subcategoria')} />} label="Subcategoría" />
    )}
    {empresa?.comprobante_info?.medio_pago && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.medioPago}   onChange={() => toggleCol('medioPago')} />}   label="Medio de pago" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.proveedor}    onChange={() => toggleCol('proveedor')} />}    label="Proveedor" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.obra} onChange={() => toggleCol('obra')} />} label="Obra" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.cliente} onChange={() => toggleCol('cliente')} />} label="Cliente" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.observacion}  onChange={() => toggleCol('observacion')} />}  label="Observación" />
    {empresa?.comprobante_info?.detalle && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.detalle} onChange={() => toggleCol('detalle')} />} label="Detalle" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.usuario}      onChange={() => toggleCol('usuario')} />}      label="Usuario" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tc}           onChange={() => toggleCol('tc')} />}           label="TC ejecutado" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.usd}          onChange={() => toggleCol('usd')} />}          label="USD blue" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.mep} onChange={() => toggleCol('mep')} />} label="USD MEP" />
    {empresa?.con_estados && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.estado}      onChange={() => toggleCol('estado')} />}      label="Estado" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.empresaFacturacion} onChange={() => toggleCol('empresaFacturacion')} />} label="Empresa facturación" />
    {empresa?.comprobante_info?.factura_cliente && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.facturaCliente} onChange={() => toggleCol('facturaCliente')} />} label="Factura cliente" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaPago} onChange={() => toggleCol('fechaPago')} />} label="Fecha de pago" />
    {options?.tags?.length > 0 && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tagsExtra} onChange={() => toggleCol('tagsExtra')} />} label="Tags extra" />
    )}
    <Divider sx={{ my: 1 }} />
    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Dólar de referencia</Typography>
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.dolarReferencia} onChange={() => toggleCol('dolarReferencia')} />} label="TC Referencia" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.totalDolar} onChange={() => toggleCol('totalDolar')} />} label="Total USD" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subtotalDolar} onChange={() => toggleCol('subtotalDolar')} />} label="Subtotal USD" />
    <Divider sx={{ my: 1 }} />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.acciones}     onChange={() => toggleCol('acciones')} />}     label="Acciones" />
        <Box sx={{ display: 'flex', gap: 1, pt: 0.5 }}>
      <Button
        size="small"
        variant="outlined"
        onClick={handleCloseCols}
        fullWidth
      >
        Cerrar
      </Button>
      <Button
        size="small"
        variant="contained"
        onClick={handleSaveCols}
        disabled={!prefsHydrated || savingCols}
        fullWidth
      >
        {savingCols ? 'Guardando…' : 'Guardar configuración'}
      </Button>
    </Box>
  </Stack>
</Popover>

<OrdenarColumnasDialog
  open={openOrdenar}
  onClose={() => setOpenOrdenar(false)}
  columnasFiltradas={columnasFiltradas}
  columnasOrden={columnasOrden}
  onOrdenChange={handleOrdenColumnasChange}
  ordenPredeterminado={columnasConfig.map(([k]) => k)}
/>

{/* ===== Scrollbar superior sincronizada ===== */}
<Box sx={{ position: 'relative', mb: 0.5 }}>
<Box
  ref={topScrollRef}
  onScroll={(e) => {
    const cont = scrollRef.current;
    if (!cont) return;
    cont.scrollLeft = e.currentTarget.scrollLeft;

    const max = getMax();
    const sl  = cont.scrollLeft;
    setAtStart(sl <= 0);
    setAtEnd(sl >= max - 1 || max <= 0);
  }}

  sx={{
    width: '100%',
    overflowX: 'scroll',   // siempre visible
    overflowY: 'hidden',
    height: 14,

    // mismo look que TableContainer, pero MÁS OSCURO y SIEMPRE visible
    '&::-webkit-scrollbar': { height: 10 },
    '&::-webkit-scrollbar-track': {
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
      borderRadius: 8,
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 8,
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: (t) =>
        t.palette.mode === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)',
    },

    // Firefox
    scrollbarWidth: 'thin',
    scrollbarColor: (t) =>
      t.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.55) rgba(255,255,255,0.18)'
        : 'rgba(0,0,0,0.45) rgba(0,0,0,0.12)',
  }}
>
<Box sx={{ width: topWidth || '120%' , height: 1 }} />
</Box>


</Box>


{/* ===== Wrapper con fades y flechas ===== */}
<Box sx={{ position: 'relative' }}>
  {/* Fades laterales */}
  {!atStart && (
    <Box
      sx={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 28,
        zIndex: 3,
        background:
          'linear-gradient(to right, rgba(0,0,0,0.10), rgba(0,0,0,0.06), rgba(0,0,0,0.0))',
        borderTopLeftRadius: 4,
        borderBottomLeftRadius: 4,
      }}
    />
  )}
  
    <Box
      sx={{
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 28,
        zIndex: 3,
        background:
          'linear-gradient(to left, rgba(0,0,0,0.10), rgba(0,0,0,0.06), rgba(0,0,0,0.0))',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
      }}
    />
  

  {/* Flechas */}
  {!atStart && (
    <IconButton
      size="small"
      onClick={() => scrollByStep('left')}
      sx={{
        position: 'absolute',
        left: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
        bgcolor: 'background.paper',
        boxShadow: 1,
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      <ChevronLeftIcon fontSize="small" />
    </IconButton>
  )}
  
    <IconButton
      size="small"
      onClick={() => scrollByStep('right')}
      sx={{
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
        bgcolor: 'background.paper',
        boxShadow: 1,
        '&:hover': { bgcolor: 'background.paper' },
      }}
    >
      <ChevronRightIcon fontSize="small" />
    </IconButton>
  

  {/* Coachmark: se muestra siempre al entrar (no persiste) */}
  <Tooltip
    open={coachOpen && !isMobile}
    onClose={() => setCoachOpen(false)}
    arrow
    placement="top"
    title="Deslizá → para ver más columnas"
  >
    <Box
      onMouseEnter={() => setCoachOpen(false)}
      onClick={() => scrollByStep('right')}
      sx={{
        position: 'absolute',
        right: 40,
        top: -30,
        color: 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        zIndex: 5,
      }}
    >
      <InfoOutlinedIcon fontSize="small" />
      <Typography variant="caption">Deslizá →</Typography>
    </Box>
  </Tooltip>


<TableContainer
  component={Paper}
  ref={scrollRef}
  sx={{
    height: 'calc(100vh - 300px)',
    overflowX: 'auto',
    overflowY: 'auto',
    pr: 0, // espacio real lo aporta la barra
    '&::-webkit-scrollbar': { height: 10 },                // “barra siempre visible” en WebKit
    '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.25)', borderRadius: 8 },
  }}
>
  <Table ref={tableRef} stickyHeader size="small">
    <TableHead>
      <TableRow>
        {/* Checkbox selección masiva */}
        <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
          <Checkbox
            size="small"
            indeterminate={somePageSelected && !allPageSelected}
            checked={allPageSelected}
            onChange={toggleSelectAll}
          />
        </TableCell>
        {columnasFiltradas.map(([key]) => (
          <TableCell key={key} sx={getHeaderCellSx(key, COLS, cellBase)}>
            {getHeaderLabel(key, compactCols)}
          </TableCell>
        ))}

      </TableRow>
    </TableHead>

    <TableBody>
      {paginatedMovs.length === 0 && (
        <TableRow>
          <TableCell colSpan={Object.values(visibleCols).filter(Boolean).length + 1} sx={{ py: 4 }}>
            <Typography variant="subtitle1">Sin resultados</Typography>
            <Typography variant="body2" color="text.secondary">
              Probá ajustar fechas, categorías o limpiar filtros.
            </Typography>
          </TableCell>
        </TableRow>
      )}
      {paginatedMovs.map((item, index) => {
        // Si es un grupo de prorrateo
        if (item.tipo === 'grupo_prorrateo') {
          return (
            <React.Fragment key={`grupo-${item.grupoId}`}>
              {/* Sin fila de encabezado - solo mostrar los movimientos individuales */}
              
              {/* Filas de los movimientos del grupo */}
              {item.movimientos.map((mov, subIndex) => {
                const amountColor =
                  compactCols
                    ? (mov.type === 'ingreso' ? 'success.main' : 'error.main')
                    : 'inherit';
                
                return (
                  <TableRow 
                    key={`${item.grupoId}-${subIndex}`} 
                    hover
                    onClick={() => openDetalle(mov)}
                    sx={{ cursor: 'pointer', ...(selectedIds.has(mov.id) && { bgcolor: 'action.selected' }) }}
                  >
                    <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}>
                      <Checkbox
                        size="small"
                        checked={selectedIds.has(mov.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelectOne(mov.id)}
                      />
                    </TableCell>
                    {columnasFiltradas.map(([key]) => (
                      <CajaTablaCell
                        key={key}
                        colKey={key}
                        mov={mov}
                        amountColor={amountColor}
                        ctx={cajaCellCtx}
                        isProrrateo
                      />
                    ))}
                  </TableRow>
                );
              })}
            </React.Fragment>
          );
        }
        
        // Si es un movimiento normal
        const mov = item.data;
        const amountColor =
          compactCols
            ? (mov.type === 'ingreso' ? 'success.main' : 'error.main')
            : 'inherit';

        return (
          <TableRow key={index} hover onClick={() => openDetalle(mov)} sx={{ cursor: 'pointer', ...(selectedIds.has(mov.id) && { bgcolor: 'action.selected' }) }}>
            <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }}>
              <Checkbox
                size="small"
                checked={selectedIds.has(mov.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelectOne(mov.id)}
              />
            </TableCell>
            {columnasFiltradas.map(([key]) => (
              <CajaTablaCell
                key={key}
                colKey={key}
                mov={mov}
                amountColor={amountColor}
                ctx={cajaCellCtx}
              />
            ))}
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
</TableContainer>
<TablePagination
      component="div"
      rowsPerPageOptions={[10, 25, 50, 100]}
      count={totalRows}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage="Filas por página"
    />
</Box>
</>
                )}
            </Paper>
          </Stack>
          {/* <AsistenteFlotanteProyecto
  empresa={empresa}
  proyecto={proyecto}
  filtros={filters}
  movimientos={movimientos}
  movimientosUSD={movimientosUSD}
  cajasVirtuales={cajasVirtuales}
  visibleCols={visibleCols}
  compactCols={compactCols}
  totalesDetallados={totalesDetallados}
  totalesUsdBlue={totalesUsdBlue}
/> */}
        </Container>

<Menu
  anchorEl={anchorEl}
  open={Boolean(anchorEl)}
  onClose={handleCloseMenu}
  keepMounted
>
  <MenuOption onClick={() => handleMenuOptionClick('registrarMovimiento')}>
    <AddCircleIcon sx={{ mr: 1 }} />
    Registrar movimiento
  </MenuOption>
  <MenuOption onClick={() => {
    handleOpenTransferencia();
    handleCloseMenu();
  }}>
    <SwapHorizIcon sx={{ mr: 1 }} />
    Transferencia interna
  </MenuOption>
  <MenuOption onClick={() => {
    handleOpenIntercambio();
    handleCloseMenu();
  }}>
    <CurrencyExchangeIcon sx={{ mr: 1 }} />
    Compra/Venta Moneda
  </MenuOption>
  <MenuOption onClick={() => handleMenuOptionClick('recalcularSheets')}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular sheets
  </MenuOption>
  <MenuOption onClick={() => handleMenuOptionClick('filtrar')}>
    <FilterListIcon sx={{ mr: 1 }} />
    Filtros
  </MenuOption>

  <Divider sx={{ my: 1 }} />

  <MenuOption onClick={() => {
    setShowCrearCaja(true);
    handleCloseMenu();
  }}>
    <AddCircleIcon sx={{ mr: 1 }} />
    Agregar nueva caja
  </MenuOption>
  <MenuOption onClick={() => {
    setSavedViewMode(true);
    setEditandoCaja(null);
    setNombreCaja('');
    setMonedaCaja('');
    setMedioPagoCaja('');
    setEstadoCaja('');
    setEquivalenciaCaja('none');
    setTypeCaja('');
    setBaseCalculoCaja('total');
    setShowCrearCaja(true);
    handleCloseMenu();
  }}>
    <AccountBalanceWalletIcon sx={{ mr: 1 }} />
    Guardar vista actual como caja
  </MenuOption>
  <MenuOption onClick={() => {
    handleRefresh();
    handleCloseMenu();
  }}>
    <RefreshIcon sx={{ mr: 1 }} />
    Actualizar saldos
  </MenuOption>

  <MenuOption onClick={() => handleMenuOptionClick('recalcularEquivalencias')}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular valor dolar estimado
  </MenuOption>
  
  <Divider sx={{ my: 1 }} />

  <MenuOption onClick={() => {
    setConfigDrawerOpen(true);
    handleCloseMenu();
  }}>
    <SettingsIcon sx={{ mr: 1 }} />
    Configurar proyecto
  </MenuOption>
  
  <MenuOption onClick={() => {
    handleOpenExportCsvDialog();
    handleCloseMenu();
  }}>
    <DownloadIcon sx={{ mr: 1 }} />
    Exportar CSV para análisis
  </MenuOption>
</Menu>

      </Box>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirmar eliminación"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Estás seguro de que quieres eliminar este movimiento?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={eliminarMovimiento} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmarPagoMov)}
        onClose={handleCloseConfirmarPagoDialog}
        aria-labelledby="confirmar-pago-title"
      >
        <DialogTitle id="confirmar-pago-title">Confirmar pago</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            ¿Marcar este egreso como pagado por el total de{' '}
            <strong>
              {confirmarPagoMov
                ? formatCurrencyWithCode(Number(confirmarPagoMov.total) || 0, confirmarPagoMov.moneda || 'ARS')
                : ''}
            </strong>
            ?
            {confirmarPagoMov?.estado === 'Parcialmente Pagado' && (
              <Typography component="span" variant="body2" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                El monto abonado pasará a igualar al total del comprobante.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseConfirmarPagoDialog} disabled={confirmarPagoLoading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmarPagoEjecutar}
            disabled={confirmarPagoLoading}
            autoFocus
          >
            {confirmarPagoLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={imgPreview.open} onClose={closeImg} maxWidth="md" fullWidth>
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    Archivo adjunto
    <Box>
      {imgPreview.url && (
        <IconButton
          size="small"
          component="a"
          href={imgPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ mr: 1 }}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton size="small" onClick={closeImg}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  </DialogTitle>
  <DialogContent dividers>
    {imgPreview.url ? (
      imgPreview.url.toLowerCase().includes('.pdf') ? (
        <Box sx={{ height: '70vh' }}>
          <iframe
            src={imgPreview.url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={imgPreview.url}
            alt="Archivo"
            sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
          />
        </Box>
      )
    ) : (
      <Typography variant="body2" color="text.secondary">
        No hay archivo disponible.
      </Typography>
    )}
  </DialogContent>
</Dialog>

<Menu
  anchorEl={mobileActionAnchor}
  open={Boolean(mobileActionAnchor)}
  onClose={closeMobileActions}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
>
  {mobileActionMov?.url_imagen && (
    <MenuItem onClick={() => { openImg(mobileActionMov.url_imagen); closeMobileActions(); }}>
      Ver adjunto
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { openDetalle(mobileActionMov); closeMobileActions(); }}>
      Comentarios
    </MenuItem>
  )}
  {mobileActionMov && puedeCompletarPagoEgreso(mobileActionMov) && (
    <MenuItem
      onClick={() => {
        setConfirmarPagoMov(mobileActionMov);
        closeMobileActions();
      }}
    >
      <CheckCircleOutlineIcon sx={{ mr: 1, fontSize: 20, color: 'success.main' }} />
      Confirmar pago
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { goToEdit(mobileActionMov); closeMobileActions(); }}>
      Editar
    </MenuItem>
  )}
  {mobileActionMov && (
    <MenuItem onClick={() => { handleEliminarClick(mobileActionMov.id); closeMobileActions(); }}>
      Eliminar
    </MenuItem>
  )}
</Menu>

{isMobile && (
  <Fab
    color="primary"
    onClick={(e) => { setAnchorEl(e.currentTarget); }}
    sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1400 }}
  >
    <MoreVertIcon />
  </Fab>
)}

<Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
  <Box sx={{ width: 360, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <Box sx={{ p: 1.5, overflow: 'auto', flex: 1, minHeight: 0 }}>
      <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 600 }}>Detalle del movimiento</Typography>
      {detalleMov ? (
        <>
          <List dense disablePadding sx={{ '& .MuiListItem-root': { py: 0.25 }, '& .MuiListItemText-root': { my: 0 } }}>
            <ListItem><ListItemText primary="Código" secondary={detalleMov.codigo_operacion || detalleMov.codigo || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Fecha" secondary={formatTimestamp(detalleMov.fecha_factura, "DIA/MES/ANO") || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Tipo" secondary={detalleMov.type || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Total" secondary={formatCurrency(detalleMov.total)} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Moneda" secondary={detalleMov.moneda || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Proveedor" secondary={detalleMov.nombre_proveedor || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            <ListItem><ListItemText primary="Categoría" secondary={detalleMov.categoria || '—'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            {detalleMov.subcategoria && (
              <ListItem><ListItemText primary="Subcategoría" secondary={detalleMov.subcategoria} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.obra && (
              <ListItem><ListItemText primary="Obra" secondary={detalleMov.obra} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.cliente && (
              <ListItem><ListItemText primary="Cliente" secondary={detalleMov.cliente} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {empresa?.comprobante_info?.factura_cliente && (
              <ListItem><ListItemText primary="Factura cliente" secondary={detalleMov.factura_cliente ? 'Sí' : 'No'} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {detalleMov.observacion && (
              <ListItem><ListItemText primary="Observación" secondary={detalleMov.observacion} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
            {empresa?.comprobante_info?.detalle && detalleMov.detalle && (
              <ListItem><ListItemText primary="Detalle" secondary={detalleMov.detalle} primaryTypographyProps={{ variant: 'caption' }} secondaryTypographyProps={{ variant: 'body2' }} /></ListItem>
            )}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
            Comentarios ({detalleMov.comentarios?.length || 0})
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }} alignItems="flex-end">
            <TextField
              size="small"
              multiline
              minRows={1}
              maxRows={2}
              placeholder="Agregar comentario..."
              value={comentarioInput}
              onChange={(e) => setComentarioInput(e.target.value)}
              disabled={comentarioLoading}
              sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8125rem' } }}
              inputProps={{ maxLength: 1000 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAgregarComentario}
              disabled={!comentarioInput?.trim() || comentarioLoading}
              sx={{ flexShrink: 0 }}
            >
              Agregar
            </Button>
          </Stack>
          {comentarioError && (
            <Alert severity="error" onClose={() => setComentarioError(null)} sx={{ mb: 1, py: 0.5 }}>
              {comentarioError}
            </Alert>
          )}
          {(!detalleMov.comentarios || detalleMov.comentarios.length === 0) ? (
            <Typography variant="caption" color="text.secondary">Sin comentarios.</Typography>
          ) : (
            <Stack spacing={1}>
              {[...(detalleMov.comentarios || [])]
                .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
                .map((c) => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                      {usuariosComentariosMap[c.userId] || 'Usuario'} · {formatTimestamp(c.createdAt, 'DIA/MES/ANO')}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>{c.comment}</Typography>
                  </Paper>
                ))}
            </Stack>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">Sin datos.</Typography>
      )}
    </Box>
  </Box>
</Drawer>

{/* Dialog de Transferencia Interna */}
<TransferenciaInternaDialog
  open={openTransferencia}
  onClose={handleCloseTransferencia}
  proyectos={proyectos}
  onSuccess={handleTransferenciaSuccess}
  defaultProyectoEmisor={proyecto ? { id: proyecto.id, nombre: proyecto.nombre } : null}
  userPhone={user?.phone}
  mediosPago={empresa?.medios_pago || []}
  showMedioPago={!!empresa?.comprobante_info?.medio_pago}
/>

{/* Dialog de Intercambio de Moneda */}
<IntercambioMonedaDialog
  open={openIntercambio}
  onClose={handleCloseIntercambio}
  onSuccess={handleIntercambioSuccess}
  proyectoId={proyecto?.id}
  empresa={empresa}
/>

{/* ── Barra flotante de selección masiva ── */}
{selectedIds.size > 0 && (
  <Paper
    elevation={6}
    sx={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1300,
      px: 3,
      py: 1.5,
      borderRadius: 3,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
    </Typography>
    <Button
      size="small"
      variant="contained"
      color="inherit"
      sx={{ color: 'primary.main', fontWeight: 600 }}
      startIcon={<EditIcon />}
      onClick={() => setBulkDialogOpen(true)}
    >
      Editar
    </Button>
    <Button
      size="small"
      variant="text"
      sx={{ color: 'primary.contrastText' }}
      onClick={() => setSelectedIds(new Set())}
    >
      Cancelar
    </Button>
  </Paper>
)}

{/* Dialog edición masiva */}
<BulkEditDialog
  open={bulkDialogOpen}
  onClose={() => setBulkDialogOpen(false)}
  selectedCount={selectedIds.size}
  selectedIds={selectedIds}
  onDone={handleBulkDone}
  options={options}
  empresa={empresa}
/>

{/* Drawer de configuración del proyecto */}
<ProyectoConfigDrawer
  open={configDrawerOpen}
  onClose={() => setConfigDrawerOpen(false)}
  proyecto={proyecto}
  empresa={empresa}
  onProyectoUpdated={(updated) => setProyecto((prev) => ({ ...prev, ...updated }))}
/>

<ExportCsvDialog
  open={csvDialogOpen}
  onClose={() => setCsvDialogOpen(false)}
  fields={csvExportFields}
  selectedKeys={csvSelectedFields}
  orderedKeys={csvFieldOrder}
  onToggleField={handleToggleCsvField}
  onReorderField={handleReorderCsvField}
  onSelectAll={() => setCsvSelectedFields(csvDefaultOrder)}
  onClearAll={() => setCsvSelectedFields([])}
  onReset={handleResetCsvConfig}
  onExport={handleExportCsvAnalisis}
  exporting={csvExporting}
  totalRows={movimientosExportables.length}
/>


    </DashboardLayout>
  );
};

export default ProyectoMovimientosPage;
