import { useState, useMemo, useEffect } from 'react';
import { useRef } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import Head from 'next/head';
import { Box, Container, Stack, Chip, Typography, TextField, InputAdornment, Paper, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, useMediaQuery, IconButton, Menu, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Tooltip, MenuItem as MenuOption, Divider, TablePagination } from '@mui/material';

import { Checkbox, Popover, FormControlLabel, Switch } from '@mui/material';

import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';

import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import ticketService from 'src/services/ticketService';
import { getProyectoById, recargarProyecto, updateProyecto } from 'src/services/proyectosService';
import movimientosService from 'src/services/movimientosService';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser, updateEmpresaDetails } from 'src/services/empresaService'; 
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { formatTimestamp } from 'src/utils/formatters';
import { useMovimientosFilters } from 'src/hooks/useMovimientosFilters';
import { FilterBarCajaProyecto } from 'src/components/FilterBarCajaProyecto';


// tamaños mínimos por columna (px)
const COLS = {
  codigo: 120,
  fecha: 140,
  tipo: 120,
  total: 160,
  categoria: 160,
  subcategoria: 160,
  medioPago: 150,
  proveedor: 220,
  observacion: 160,
  tc: 120,
  usd: 160,
  estado: 140,
  empresaFacturacion: 200,
  fechaPago: 140,
  acciones: 96,
};

// estilos comunes
const cellBase = { py: 0.75, px: 1, whiteSpace: 'nowrap' };
const ellipsis = (maxWidth) => ({
  ...cellBase,
  maxWidth,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});


const TotalesFiltrados = ({ t, fmt, moneda }) => {
  const up = moneda.toUpperCase();
  const ingreso = t[up]?.ingreso ?? 0;
  const egreso  = t[up]?.egreso  ?? 0;
  const neto    = ingreso - egreso;

  return (
    <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1, mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Totales filtrados ({up})
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Typography sx={{ color: 'success.main', fontWeight: 600 }}>
          + {fmt(up, ingreso)}
        </Typography>
        <Typography sx={{ color: 'error.main', fontWeight: 600 }}>
          - {fmt(up, egreso)}
        </Typography>
        <Typography
          sx={{ color: neto >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}
        >
          Neto: {fmt(up, neto)}
        </Typography>
      </Stack>
    </Box>
  );
};



const ProyectoMovimientosPage = () => {
  const { user } = useAuthContext();
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosUSD, setMovimientosUSD] = useState([]);
  const [tablaActiva, setTablaActiva] = useState('ARS');
  const [empresa, setEmpresa] = useState(null);
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
  const router = useRouter();
  const { proyectoId } = router.query;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [cajasVirtuales, setCajasVirtuales] = useState([
    { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" },
    { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" }
  ]);  
  const [showCrearCaja, setShowCrearCaja] = useState(false);
  const [nombreCaja, setNombreCaja] = useState('');
  const [monedaCaja, setMonedaCaja] = useState('ARS');
  const [estadoCaja, setEstadoCaja] = useState('');
  const [medioPagoCaja, setMedioPagoCaja] = useState('Efectivo');
  const [editandoCaja, setEditandoCaja] = useState(null); // null o index de la caja
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [savingCols, setSavingCols] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // opcional: feedback breve
  const [imgPreview, setImgPreview] = useState({ open: false, url: null });
  const openImg = (url) => setImgPreview({ open: true, url });
  const closeImg = () => setImgPreview({ open: false, url: null });
  
  const [anchorCajaEl, setAnchorCajaEl] = useState(null);
  const [cajaMenuIndex, setCajaMenuIndex] = useState(null);
  // ---- Columnas visibles + modo compacto ----
const [compactCols, setCompactCols] = useState(true);
const [anchorColsEl, setAnchorColsEl] = useState(null);

// --- helpers de scroll horizontal ---
const scrollRef = useRef(null);      // contenedor principal con overflow
const topScrollRef = useRef(null);   // barra superior "fantasma"
const tableRef = useRef(null);

const [atEdges, setAtEdges] = useState({ left: true, right: false });
const [atStart, setAtStart] = useState(true);
const [atEnd, setAtEnd] = useState(false);
const [coachOpen, setCoachOpen] = useState(true); // se muestra en cada mount
const [topWidth, setTopWidth] = useState(0);
// --- paginación ---
const [page, setPage] = useState(0);           // página actual (0-based)
const [rowsPerPage, setRowsPerPage] = useState(25);  // filas por página

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



const handleTopScroll = () => {
  if (!topScrollRef.current || !scrollRef.current) return;
  scrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
};

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
  fechas: true,            // combinado (cuando compactCols=true)
  fechaFactura: !compactCols,
  fechaCreacion: !compactCols,
  tipo: !compactCols,      // en compacto, se colorea TOTAL y se oculta TIPO
  total: true,
  categoria: true,         // en compacto: muestra "cat / subcat"
  subcategoria: !compactCols && !!empresa?.comprobante_info?.subcategoria,
  medioPago: !!empresa?.comprobante_info?.medio_pago,
  proveedor: true,
  observacion: true,
  tc: false,
  usd: true,
  estado: !!empresa?.con_estados,
  acciones: true,
  empresaFacturacion: false,
  fechaPago: false,
}), [compactCols, empresa]);

const [visibleCols, setVisibleCols] = useState(defaultVisible);

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
    userId: user?.user_id,
  });

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
    setEstadoCaja(caja.estado || '');
    handleCloseCajaMenu();
  };
  
  const handleEliminarCaja = (index) => {
    const nuevas = cajasVirtuales.filter((_, i) => i !== index);
    setCajasVirtuales(nuevas);
    updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevas });
    if (cajaSeleccionada === cajasVirtuales[index]) setCajaSeleccionada(null);
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
    setFiltrosActivos(!filtrosActivos);
    handleCloseMenu();
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

  
  const handleEliminarClick = (movimientoId) => {
    setMovimientoAEliminar(movimientoId);
    setOpenDialog(true);
  };
  
  

  const handleRefresh = async () => {
    if (!proyectoId) return;
  
    const movs = await ticketService.getMovimientosForProyecto(proyectoId, 'ARS');
    const movsUsd = await ticketService.getMovimientosForProyecto(proyectoId, 'USD');
  
    setMovimientos(movs);
    setMovimientosUSD(movsUsd);
  
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

      const empresa = await getEmpresaDetailsFromUser(user);
      const cajasIniciales = empresa.cajas_virtuales?.length > 0 ? empresa.cajas_virtuales : [
        { nombre: 'Caja en Pesos', moneda: 'ARS', medio_pago: "" },
        { nombre: 'Caja en Dólares', moneda: 'USD', medio_pago: "" }
      ];
      if (!empresa.cajas_virtuales || empresa.cajas_virtuales.length === 0) {
        await updateEmpresaDetails(empresa.id, { cajas_virtuales: cajasIniciales });
      }
      setEmpresa({ ...empresa, cajas_virtuales: cajasIniciales });
      setCajasVirtuales(cajasIniciales);

      if (empresa.solo_dolar) {
        setTablaActiva("USD")
      }

      const proyecto = await getProyectoById(proyectoId);
      setProyecto(proyecto);
            // --- hidratar preferencias guardadas ---
      const savedCols = proyecto?.ui_prefs?.columnas;
      if (savedCols) {
        // respetamos lo guardado
        if (typeof savedCols.compact === 'boolean') {
          setCompactCols(savedCols.compact);
        }
        if (savedCols.visible && typeof savedCols.visible === 'object') {
          // merge con defaults actuales para no perder llaves nuevas
          setVisibleCols((prev) => ({ ...defaultVisible, ...savedCols.visible }));
        }
      }
      setPrefsHydrated(true);
      const movs = await ticketService.getMovimientosForProyecto(proyectoId, 'ARS');
      const movsUsd = await ticketService.getMovimientosForProyecto(proyectoId, 'USD');
      setMovimientos(movs);
      setMovimientosUSD(movsUsd);
    };

    const fetchData = async () => {
      let pid = proyectoId;

      if (!proyectoId) {
        
        const proyectos = await getProyectosByEmpresa(empresa);
        if (proyectos.length === 1) {
          pid = proyectos[0].id;
        }
        

      }

      if (pid) {
        await fetchMovimientosData(pid);
      }
    };

    fetchData();
  }, [proyectoId, user]);
  
  const formatCurrency = (amount) => {
    if (amount)
      return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
    else
      return "$ 0";
  };

  const onSelectCaja = (caja) => {
    setCajaSeleccionada(caja);
    setFilters((f) => ({ ...f, caja }));
  };
  
  const totalesDetallados = useMemo(() => {
    const base = {
      ARS: { ingreso: 0, egreso: 0 },
      USD: { ingreso: 0, egreso: 0 },
    };
  
    movimientosFiltrados.forEach((m) => {
      const moneda = (m.moneda || 'ARS').toUpperCase();
      const tipo = m.type === 'ingreso' ? 'ingreso' : 'egreso';
      if (!base[moneda]) base[moneda] = { ingreso: 0, egreso: 0 };
      base[moneda][tipo] += m.total || 0;
    });
  
    return base;
  }, [movimientosFiltrados]);

  const formatByCurrency = (currency, amount) => {
    const cur = currency === 'USD' ? 'USD' : 'ARS';
    return amount?.toLocaleString('es-AR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2
    }) ?? (cur === 'USD' ? 'US$ 0,00' : '$ 0,00');
  };


  const calcularTotalParaCaja = (caja) => {
    const baseMovimientos = caja.moneda === 'USD' ? movimientosUSD : movimientos;
  
    return baseMovimientos.reduce((acc, mov) => {
      const matchMedioPago = caja.medio_pago
        ? mov.medio_pago === caja.medio_pago
        : true;
  
        const matchEstado = caja.estado ? mov.estado === caja.estado : true;
        
        if (!matchMedioPago || !matchEstado) return acc;
  
      if (mov.type === 'ingreso') return acc + mov.total;
      return acc - mov.total;
    }, 0);
  };
  
  


  const handleGuardarCaja = async () => {
    const nuevaCaja = {
      nombre: nombreCaja,
      moneda: monedaCaja,
      medio_pago: medioPagoCaja,
      estado: estadoCaja 
    };
    
  
    const nuevasCajas = [...cajasVirtuales];
  
    if (editandoCaja !== null) {
      nuevasCajas[editandoCaja] = nuevaCaja;
    } else {
      nuevasCajas.push(nuevaCaja);
    }
  
    setCajasVirtuales(nuevasCajas);
    setShowCrearCaja(false);
    setNombreCaja('');
    setMonedaCaja('ARS');
    setMedioPagoCaja('Efectivo');
    setEstadoCaja('');
    setEditandoCaja(null);
    await updateEmpresaDetails(empresa.id, { cajas_virtuales: nuevasCajas });
  };
  
  const totalRows = movimientosFiltrados.length;
  
  const paginatedMovs = useMemo(() => {
    const start = page * rowsPerPage;
    const end = Math.min(totalRows, start + rowsPerPage);
    return movimientosFiltrados.slice(start, end);
  }, [movimientosFiltrados, page, rowsPerPage, totalRows]);
  
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
  
  
// si cambian los filtros y la página quedó fuera de rango, volvemos a 0
useEffect(() => {
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);
  if (page > maxPage) setPage(0);
}, [totalRows, rowsPerPage]); // intencional: no incluimos 'page' para evitar loop


  if (empresa?.cuenta_suspendida === true) {
    return ("Cuenta suspendida. Contacte al administrador." )
  }
    return (
    <DashboardLayout title={proyecto?.nombre || 'Proyecto'}>
      <Head>
        <title>{proyecto?.nombre}</title>
      </Head>
      <Box component="main" sx={{ flexGrow: 1, py: 8, paddingTop: 2 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            
            <Stack direction="row" spacing={2}>
              {cajasVirtuales.map((caja, index) => (
                <Box key={index} sx={{ position: 'relative', width: '100%', mb: 1 }}>
                  <Button
                    fullWidth
                    variant={cajaSeleccionada?.nombre === caja.nombre ? "contained" : "outlined"}
                    onClick={() => onSelectCaja(caja)}
                    sx={{ justifyContent: 'space-between', pl: 2, pr: 5 }}
                  >
              <Typography>{caja.nombre}</Typography>
              <Typography>{formatCurrency(calcularTotalParaCaja(caja))}</Typography>
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

<Menu
  anchorEl={anchorCajaEl}
  open={Boolean(anchorCajaEl)}
  onClose={handleCloseCajaMenu}
>
  <MenuItem onClick={() => handleEditarCaja(cajaMenuIndex)}>Editar</MenuItem>
  <MenuItem onClick={() => handleEliminarCaja(cajaMenuIndex)}>Eliminar</MenuItem>
</Menu>
<Box sx={{ display: 'flex', gap: 1 }}>
  <Button
    variant="outlined"
    size="small"
    startIcon={<MoreVertIcon />}
    onClick={handleOpenMenu}   // abre el mismo menú de acciones
  >
    Acciones
  </Button>

  <Button
    variant="outlined"
    size="small"
    onClick={handleOpenCols}
  >
    Columnas
  </Button>
</Box>

            </Stack>
            <Dialog open={showCrearCaja} onClose={() => setShowCrearCaja(false)}>
  <DialogTitle>Crear vista de caja personalizada</DialogTitle>
  <DialogContent>
    <TextField label="Nombre de la caja" fullWidth value={nombreCaja} onChange={(e) => setNombreCaja(e.target.value)} />
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Moneda</InputLabel>
      <Select value={monedaCaja} onChange={(e) => setMonedaCaja(e.target.value)}>
        <MenuItem value="ARS">Pesos</MenuItem>
        <MenuItem value="USD">Dólares</MenuItem>
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
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowCrearCaja(false)}>Cancelar</Button>
    <Button onClick={handleGuardarCaja}>Crear</Button>
  </DialogActions>
</Dialog>

{filtrosActivos && (
  <FilterBarCajaProyecto
    filters={filters}
    setFilters={setFilters}
    options={options}
    onRefresh={handleRefresh}
    empresa={empresa}
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
                    moneda={cajaSeleccionada?.moneda || 'ARS'}
                  />
              </Stack>
                {isMobile ? (
                  <Stack spacing={2}>
                    {paginatedMovs.map((mov, index) => (
                      <Card key={index}>
                        <CardContent>
                          <Typography variant="h6" color={mov.type === "ingreso" ? "green" : "red"}>
                            {mov.type === "ingreso" ? `Ingreso: ${formatCurrency(mov.total)}` : `Egreso: ${formatCurrency(mov.total)}`}
                          </Typography>
                          <Typography variant="body2">{mov.observacion}</Typography>
                          {mov.tc && <Typography variant="body2">Tipo de cambio: ${mov.tc}</Typography>}
                          <Typography variant="caption" color="textSecondary">
                            {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Código de operación: {mov.codigo_operacion || "Ninguno"}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={2}>
                            <Button
                              color="primary"
                              startIcon={<EditIcon />}
                              onClick={() => goToEdit(mov)}
                            >
                              Ver / Editar 
                            </Button>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleEliminarClick(mov.id)}
                            >
                              {deletingElement !== mov.id ? "Eliminar" : "Eliminando..."}
                            </Button>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    
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
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.categoria}    onChange={() => toggleCol('categoria')} />}    label={compactCols ? "Categoría / Subcat." : "Categoría"} />
    {!compactCols && empresa?.comprobante_info?.subcategoria && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.subcategoria} onChange={() => toggleCol('subcategoria')} />} label="Subcategoría" />
    )}
    {empresa?.comprobante_info?.medio_pago && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.medioPago}   onChange={() => toggleCol('medioPago')} />}   label="Medio de pago" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.proveedor}    onChange={() => toggleCol('proveedor')} />}    label="Proveedor" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.observacion}  onChange={() => toggleCol('observacion')} />}  label="Observación" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.tc}           onChange={() => toggleCol('tc')} />}           label="TC ejecutado" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.usd}          onChange={() => toggleCol('usd')} />}          label="USD blue" />
    {empresa?.con_estados && (
      <FormControlLabel control={<Checkbox size="small" checked={visibleCols.estado}      onChange={() => toggleCol('estado')} />}      label="Estado" />
    )}
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.empresaFacturacion} onChange={() => toggleCol('empresaFacturacion')} />} label="Empresa facturación" />
    <FormControlLabel control={<Checkbox size="small" checked={visibleCols.fechaPago} onChange={() => toggleCol('fechaPago')} />} label="Fecha de pago" />
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
        {visibleCols.codigo && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.codigo, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper' }}>
            CÓDIGO
          </TableCell>
        )}

        {compactCols ? (
          visibleCols.fechas && (
            <TableCell sx={{ ...cellBase, minWidth: COLS.fecha + 40 }}>
              FECHAS
            </TableCell>
          )
        ) : (
          <>
            {visibleCols.fechaFactura && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.fecha }}>FECHA FACTURA</TableCell>
            )}
            {visibleCols.fechaCreacion && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.fecha }}>FECHA CREACIÓN</TableCell>
            )}
          </>
        )}

        {!compactCols && visibleCols.tipo && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.tipo }}>TIPO</TableCell>
        )}

        {visibleCols.total && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.total, textAlign: 'right' }}>TOTAL</TableCell>
        )}

        {visibleCols.categoria && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.categoria }}>
            {compactCols ? 'CATEGORÍA / SUBCAT.' : 'CATEGORÍA'}
          </TableCell>
        )}

        {!compactCols && empresa?.comprobante_info?.subcategoria && visibleCols.subcategoria && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.subcategoria }}>SUBCATEGORÍA</TableCell>
        )}

        {empresa?.comprobante_info?.medio_pago && visibleCols.medioPago && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.medioPago }}>MEDIO DE PAGO</TableCell>
        )}

        {visibleCols.proveedor && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.proveedor }}>PROVEEDOR</TableCell>
        )}

        {visibleCols.observacion && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.observacion }}>OBSERVACIÓN</TableCell>
        )}

        {visibleCols.tc && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.tc }}>TC EJECUTADO</TableCell>
        )}

        {visibleCols.usd && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.usd }}>USD BLUE</TableCell>
        )}

        {empresa?.con_estados && visibleCols.estado && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.estado }}>ESTADO</TableCell>
        )}
        {visibleCols.empresaFacturacion && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.empresaFacturacion }}>EMPRESA FACTURACIÓN</TableCell>
        )}

        {visibleCols.fechaPago && (
          <TableCell sx={{ ...cellBase, minWidth: COLS.fechaPago }}>FECHA PAGO</TableCell>
        )}


{visibleCols.acciones && (
  <TableCell
    sx={{
      ...cellBase,
      minWidth: COLS.acciones,
      textAlign: 'center',
      position: 'sticky',
      right: 0,
      zIndex: 2,
      bgcolor: 'background.paper',
      boxShadow: 'inset 8px 0 8px -8px rgba(0,0,0,0.15)',
    }}
  >
    ACCIONES
  </TableCell>
)}

      </TableRow>
    </TableHead>

    <TableBody>
      {paginatedMovs.map((mov, index) => {
        const amountColor =
          compactCols
            ? (mov.type === 'ingreso' ? 'success.main' : 'error.main')
            : 'inherit';

        return (
          <TableRow key={index} hover>
            {visibleCols.codigo && (
              <TableCell
                sx={{ ...cellBase, minWidth: COLS.codigo, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}
              >
                {mov.codigo_operacion}
              </TableCell>
            )}

            {compactCols ? (
              visibleCols.fechas && (
                <TableCell sx={{ ...cellBase, minWidth: COLS.fecha + 40 }}>
                  {/* compacto: ambas fechas en una sola celda */}
                  <Stack direction="row" spacing={1} divider={<span>•</span>}>
                    <Typography variant="body2">Fac: {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cre: {formatTimestamp(mov.fecha_creacion, "DIA/MES/ANO")}
                    </Typography>
                  </Stack>
                </TableCell>
              )
            ) : (
              <>
                {visibleCols.fechaFactura && (
                  <TableCell sx={{ ...cellBase, minWidth: COLS.fecha }}>
                    {formatTimestamp(mov.fecha_factura, "DIA/MES/ANO")}
                  </TableCell>
                )}
                {visibleCols.fechaCreacion && (
                  <TableCell sx={{ ...cellBase, minWidth: COLS.fecha }}>
                    {formatTimestamp(mov.fecha_creacion, "DIA/MES/ANO")}
                  </TableCell>
                )}
              </>
            )}

            {!compactCols && visibleCols.tipo && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.tipo }}>
                <Chip
                  label={mov.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  color={mov.type === 'ingreso' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
            )}

            {visibleCols.total && (
              <TableCell
                sx={{ ...cellBase, minWidth: COLS.total, textAlign: 'right', fontWeight: 700, color: amountColor }}
              >
                {formatCurrency(mov.total)}
              </TableCell>
            )}

            {visibleCols.categoria && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.categoria }}>
                {compactCols
                  ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <span>{mov.categoria}</span>
                      {empresa?.comprobante_info?.subcategoria && mov.subcategoria && (
                        <Typography variant="caption" color="text.secondary">/ {mov.subcategoria}</Typography>
                      )}
                    </Stack>
                  )
                  : mov.categoria}
              </TableCell>
            )}

            {!compactCols && empresa?.comprobante_info?.subcategoria && visibleCols.subcategoria && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.subcategoria }}>
                {mov.subcategoria}
              </TableCell>
            )}

            {empresa?.comprobante_info?.medio_pago && visibleCols.medioPago && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.medioPago }}>
                <Chip size="small" label={mov.medio_pago || '-'} />
              </TableCell>
            )}

            {visibleCols.proveedor && (
              <TableCell sx={ellipsis(COLS.proveedor)}>
                <Tooltip title={mov.nombre_proveedor || ''}>
                  <span>{mov.nombre_proveedor}</span>
                </Tooltip>
              </TableCell>
            )}

            {visibleCols.observacion && (
              <TableCell sx={ellipsis(COLS.observacion)}>
                <Tooltip title={mov.observacion || ''}>
                  <span>{mov.observacion}</span>
                </Tooltip>
              </TableCell>
            )}

            {visibleCols.tc && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.tc }}>
                {mov.tc ? `$ ${mov.tc}` : '-'}
              </TableCell>
            )}

            {visibleCols.usd && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.usd }}>
                {mov.equivalencias
                  ? `US$ ${mov.equivalencias.total.usd_blue?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                  : '-'}
              </TableCell>
            )}

            {empresa?.con_estados && visibleCols.estado && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.estado }}>
                {mov.estado ? <Chip size="small" label={mov.estado} /> : ''}
              </TableCell>
            )}

            {visibleCols.empresaFacturacion && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.empresaFacturacion }}>
                {mov.empresa_facturacion || '—'}
              </TableCell>
            )}

            {visibleCols.fechaPago && (
              <TableCell sx={{ ...cellBase, minWidth: COLS.fechaPago }}>
                {mov.fecha_pago ? formatTimestamp(mov.fecha_pago, "DIA/MES/ANO") : '—'}
              </TableCell>
            )}


            {visibleCols.acciones && (
              <TableCell sx={{
                ...cellBase,
                minWidth: COLS.acciones,
                textAlign: 'center',
                position: 'sticky',
                right: 0,
                zIndex: 1,
                bgcolor: 'background.paper',
                boxShadow: 'inset 8px 0 8px -8px rgba(0,0,0,0.12)',
              }}>    
                  {mov.url_imagen && <IconButton
                    size="small"
                    onClick={() => openImg(mov.url_imagen)}
                  >
                    <ImageIcon fontSize="small" />
                  </IconButton>}
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => goToEdit(mov)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleEliminarClick(mov.id)}
                  disabled={deletingElement === mov.id}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            )}
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
  <MenuOption onClick={() => handleMenuOptionClick('recalcularSheets')}>
    <RefreshIcon sx={{ mr: 1 }} />
    Recalcular sheets
  </MenuOption>
  <MenuOption onClick={() => handleMenuOptionClick('filtrar')}>
    <FilterListIcon sx={{ mr: 1 }} />
    {filtrosActivos ? "Ocultar filtro" : "Filtrar"}
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


    </DashboardLayout>
  );
};

export default ProyectoMovimientosPage;
