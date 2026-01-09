import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TableSortLabel,
  TextField, Typography, IconButton, Tooltip, Divider, Radio, LinearProgress, InputAdornment,
  Alert, Snackbar, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BuildIcon from '@mui/icons-material/Build';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GetAppIcon from '@mui/icons-material/GetApp';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory';
import SummarizeIcon from '@mui/icons-material/Summarize';
import FolderIcon from '@mui/icons-material/Folder';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PendingIcon from '@mui/icons-material/Pending';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import StockMovimientosService from 'src/services/stock/stockMovimientosService';
import StockMaterialesService from 'src/services/stock/stockMaterialesService';
import api from 'src/services/axiosConfig';
import { getProyectosFromUser } from 'src/services/proyectosService';
import MaterialAutocomplete from 'src/components/MaterialAutocomplete';
import IngresoDesdeFactura from 'src/components/stock/IngresoDesdeFactura';
import EgresoDesdeRemito from 'src/components/stock/EgresoDesdeRemito';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const TIPO_OPCIONES = ['INGRESO', 'EGRESO', 'TRANSFERENCIA', 'AJUSTE', 'COMPRA'];
const ESTADO_OPCIONES = ['PENDIENTE', 'PARCIALMENTE_ENTREGADO', 'ENTREGADO'];
const ORDER_MAP = { fecha: 'fecha', tipo: 'tipo', subtipo: 'subtipo', responsable: 'responsable', updated: 'updatedAt', estado: 'estado' };

// Helper para obtener color y etiqueta del estado
const getEstadoChip = (estado) => {
  switch (estado?.toUpperCase()) {
    case 'ENTREGADO':
      return { color: 'success', label: 'Entregado', icon: <CheckCircleIcon fontSize="small" /> };
    case 'PARCIALMENTE_ENTREGADO':
      return { color: 'warning', label: 'Parcial', icon: <HourglassEmptyIcon fontSize="small" /> };
    case 'PENDIENTE':
    default:
      return { color: 'error', label: 'Pendiente', icon: <PendingIcon fontSize="small" /> };
  }
};

function fmt(d) { 
  try { 
    const date = new Date(d);
    return date.toLocaleDateString('es-ES'); 
  } catch { 
    return d || '—'; 
  } 
}

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
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fEstado, setFEstado] = useState(''); // Nuevo filtro por estado
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ===== modal de entrega parcial (1 movimiento)
  const [openEntregaDialog, setOpenEntregaDialog] = useState(false);
  const [entregaMovimiento, setEntregaMovimiento] = useState(null);
  const [cantidadAEntregar, setCantidadAEntregar] = useState(0);
  const [entregaLoading, setEntregaLoading] = useState(false);

  // ===== modal de CONFIRMAR INGRESO (todos los movimientos de una solicitud)
  const [openConfirmarIngreso, setOpenConfirmarIngreso] = useState(false);
  const [confirmarIngresoSolicitud, setConfirmarIngresoSolicitud] = useState(null); // { solicitud, movimientos }
  const [pasoConfirmacion, setPasoConfirmacion] = useState('tipo'); // 'tipo' | 'lista'
  const [tipoConfirmacion, setTipoConfirmacion] = useState('total'); // 'total' | 'parcial'
  const [cantidadesIngreso, setCantidadesIngreso] = useState({}); // { movId: cantidad }
  const [confirmarIngresoLoading, setConfirmarIngresoLoading] = useState(false);

  // ===== modal de ingreso desde factura (IA)
  const [openIngresoFactura, setOpenIngresoFactura] = useState(false);

  // ===== modal de egreso desde remito (IA)
  const [openEgresoRemito, setOpenEgresoRemito] = useState(false);

  // ===== menús desplegables para acciones
  const [anchorElNuevo, setAnchorElNuevo] = useState(null);
  const [anchorElIA, setAnchorElIA] = useState(null);
  const openMenuNuevo = Boolean(anchorElNuevo);
  const openMenuIA = Boolean(anchorElIA);

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
    setFTipo(''); setFSubtipo('');
    setFDesde(''); setFHasta('');
    setFEstado('');
    setPage(0);
  };

  const chips = [
    fTipo && { k: 'Tipo', v: `${fTipo} (${total})`, onDelete: () => setFTipo('') },
    fSubtipo && { k: 'Subtipo', v: `${fSubtipo} (${total})`, onDelete: () => setFSubtipo('') },
    fEstado && { k: 'Estado', v: fEstado.replace('_', ' '), onDelete: () => setFEstado('') },
    fDesde && { k: 'Desde', v: fDesde, onDelete: () => setFDesde('') },
    fHasta && { k: 'Hasta', v: fHasta, onDelete: () => setFHasta('') },
  ].filter(Boolean);

  // ===== modal crear/editar
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'ingreso', 'egreso', 'transferencia', null

  // ===== para transferencia: 2 proyectos
  const [transProyectoEgreso, setTransProyectoEgreso] = useState('');
  const [transProyectoIngreso, setTransProyectoIngreso] = useState('');

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

  // Estados para mejoras UX - ya están definidos arriba

  const emptyForm = {
    tipo: '', subtipo: '', fecha: '', responsable: '', // responsable = email
    proveedor_nombre: '', proveedor_id: '', proveedor_cuit: '',
    id_compra: '', url_doc: '', documentos: [], // documentos = array de URLs de remitos
    proyecto_id: '', proyecto_nombre: '' // proyecto de la solicitud
  };
  const [form, setForm] = useState(emptyForm);
  const [movs, setMovs] = useState([]);

  const patchForm = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Helper para iconos por tipo
  const getTipoIcon = (tipo) => {
    switch (tipo?.toUpperCase()) {
      case 'INGRESO': return <CallReceivedIcon color="success" />;
      case 'EGRESO': return <CallMadeIcon color="error" />;
      case 'TRANSFERENCIA': return <SwapHorizIcon color="info" />;
      case 'AJUSTE': return <BuildIcon color="warning" />;
      case 'COMPRA': return <ShoppingCartIcon color="primary" />;
      default: return null;
    }
  };

  // Calcular totales por solicitud
  const calculateTotals = (movimientos) => {
    if (!Array.isArray(movimientos)) return { totalItems: 0, totalCantidad: 0 };
    return {
      totalItems: movimientos.length,
      totalCantidad: movimientos.reduce((sum, m) => sum + (Number(m.cantidad) || 0), 0)
    };
  };

  // Función para exportar datos actuales
  const exportarDatos = () => {
    const dataToExport = rows.map(entry => {
      const s = entry?.solicitud || {};
      const movs = Array.isArray(entry?.movimientos) ? entry.movimientos : [];
      const totals = calculateTotals(movs);
      return {
        Tipo: s.tipo,
        Subtipo: s.subtipo,
        Fecha: fmt(s.fecha),
        'Total Items': totals.totalItems,
        'Cantidad Total': totals.totalCantidad,
        Actualizado: fmt(s.updatedAt)
      };
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(dataToExport[0] || {}).join(",") + "\n"
      + dataToExport.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solicitudes_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({ open: true, message: 'Datos exportados correctamente', severity: 'success' });
  };



  // ===== consulta principal
  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);

      const params = {
        empresa_id: empresa.id,
        sort: sortParam,
        limit: rpp,
        page,
        ...(fTipo ? { tipo: fTipo } : {}),
        ...(fSubtipo?.trim() ? { subtipo: fSubtipo.trim() } : {}),
        ...(fEstado ? { estado: fEstado } : {}),
        ...(fDesde ? { fecha_desde: fDesde } : {}),
        ...(fHasta ? { fecha_hasta: fHasta } : {}),
      };

      const resp = await StockSolicitudesService.listarSolicitudes(params);
      const data = resp.items || [];
      setRows(data);
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
  }, [user, fTipo, fSubtipo, fEstado, fDesde, fHasta, sortParam, page, rpp]);

  // ===== helpers modal
  const resetModal = () => {
    setForm(emptyForm);
    setMovs([]);
    setEditMode(false);
    setEditId(null);
    setModalMode(null);
    setTransProyectoEgreso('');
    setTransProyectoIngreso('');
  };

  const openCreate = () => {
    resetModal();
    setEditMode(false);
    setOpenModal(true);
  };

  // Abrir crear con tipo específico
  const openCreateIngreso = () => {
    resetModal();
    setEditMode(false);
    setModalMode('ingreso');
    patchForm('tipo', 'INGRESO');
    const today = new Date();
    today.setHours(11, 0, 0, 0); // 11:00 del mediodía
    patchForm('fecha', today.toISOString().substring(0, 10));
    patchForm('responsable', user?.email || '');
    // No preseleccionar proyecto - dejar que el usuario elija o deje vacío para "Sin asignar"
    setOpenModal(true);
  };
  
  const openCreateEgreso = () => {
    resetModal();
    setEditMode(false);
    setModalMode('egreso');
    patchForm('tipo', 'EGRESO');
    const today = new Date();
    today.setHours(11, 0, 0, 0); // 11:00 del mediodía
    patchForm('fecha', today.toISOString().substring(0, 10));
    patchForm('responsable', user?.email || '');
    // No preseleccionar proyecto - dejar que el usuario elija o deje vacío para "Sin asignar"
    setOpenModal(true);
  };
  
  const openCreateTransferencia = () => {
    resetModal();
    setEditMode(false);
    setModalMode('transferencia');
    patchForm('tipo', 'TRANSFERENCIA');
    const today = new Date();
    today.setHours(11, 0, 0, 0); // 11:00 del mediodía
    patchForm('fecha', today.toISOString().substring(0, 10));
    patchForm('responsable', user?.email || '');
    // Proyectos de transferencia comienzan vacíos (sin asignar por defecto)
    setTransProyectoEgreso('');
    setTransProyectoIngreso('');
    setOpenModal(true);
  };

  const openEdit = (entry) => {
    // entry: { solicitud, movimientos }
    const s = entry?.solicitud || {};
    const m = Array.isArray(entry?.movimientos) ? entry.movimientos : [];

    setEditId(s._id || null);
    setEditMode(true);

    // Intentar obtener proyecto_id de la solicitud o del primer movimiento
    const proyectoIdFromSolicitud = s.proyecto_id || '';
    const proyectoNombreFromSolicitud = s.proyecto_nombre || '';
    
    // Si no hay proyecto en la solicitud, intentar obtenerlo del primer movimiento
    const primerMovConProyecto = m.find(mm => mm.proyecto_id);
    const proyectoId = proyectoIdFromSolicitud || primerMovConProyecto?.proyecto_id || '';
    const proyectoNombre = proyectoNombreFromSolicitud || primerMovConProyecto?.proyecto_nombre || '';

    setForm({
      tipo: s.tipo || '',
      subtipo: s.subtipo || '',
      fecha: s.fecha ? String(s.fecha).substring(0, 10) : '',
      responsable: s.responsable || '', // email
      proveedor_nombre: s?.proveedor?.nombre || '',
      proveedor_id: s?.proveedor?.id || '',
      proveedor_cuit: s?.proveedor?.cuit || '',
      id_compra: s.id_compra || '',
      url_doc: s.url_doc || '',
      documentos: Array.isArray(s.documentos) ? s.documentos : (s.url_doc ? [s.url_doc] : []), // Cargar documentos o fallback a url_doc
      proyecto_id: proyectoId,
      proyecto_nombre: proyectoNombre,
    });

    // Para transferencias, consolidar movimientos duplicados
    if (s.tipo === 'TRANSFERENCIA') {
      setModalMode('transferencia');
      
      // Buscar proyectos de egreso e ingreso
      const egresoMov = m.find(mm => String(mm.tipo || '').toUpperCase() === 'EGRESO');
      const ingresoMov = m.find(mm => String(mm.tipo || '').toUpperCase() === 'INGRESO');
      
      setTransProyectoEgreso(egresoMov?.proyecto_id || '');
      setTransProyectoIngreso(ingresoMov?.proyecto_id || '');

      // Agrupar movimientos por material (consolidar egreso + ingreso en uno solo para edición)
      const materialesMap = new Map();
      
      m.forEach(mm => {
        const key = mm.id_material || mm.nombre_item;
        if (!materialesMap.has(key)) {
          materialesMap.set(key, {
            nombre_item: mm.nombre_item || '',
            cantidad: Math.abs(mm.cantidad || 0), // mostrar cantidad positiva
            tipo: 'EGRESO', // placeholder
            subtipo: mm.subtipo || 'TRANSFERENCIA',
            fecha_movimiento: mm.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
            proyecto_id: '', // no se muestra en la UI para transferencias
            proyecto_nombre: '',
            observacion: mm.observacion || '',
            id_material: mm.id_material || '',
            _id_egreso: mm.tipo === 'EGRESO' ? mm._id : undefined,
            _id_ingreso: mm.tipo === 'INGRESO' ? mm._id : undefined,
          });
        } else {
          // Actualizar el _id correspondiente
          const existing = materialesMap.get(key);
          if (mm.tipo === 'EGRESO') existing._id_egreso = mm._id;
          if (mm.tipo === 'INGRESO') existing._id_ingreso = mm._id;
        }
      });

      setMovs(Array.from(materialesMap.values()));
    } else {
      // Caso normal
      if (s.tipo === 'INGRESO') setModalMode('ingreso');
      else if (s.tipo === 'EGRESO') setModalMode('egreso');
      else setModalMode(null);

      const normMovs = m.map(mm => ({
        nombre_item: mm?.nombre_item || '',
        cantidad: Math.abs(mm?.cantidad ?? 0), // Mostrar valor absoluto en UI
        tipo: mm?.tipo || 'EGRESO',
        subtipo: mm?.subtipo || 'GENERAL',
        fecha_movimiento: mm?.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
        proyecto_id: mm?.proyecto_id || '',
        proyecto_nombre: mm?.proyecto_nombre || '',
        observacion: mm?.observacion || '',
        id_material: mm?.id_material || '',
        _id: mm?._id || undefined,
        // ===== CAMPOS DE ESTADO DE ENTREGA =====
        estado: mm?.estado || 'PENDIENTE',
        cantidad_original: mm?.cantidad_original || Math.abs(mm?.cantidad ?? 0),
        cantidad_entregada: mm?.cantidad_entregada || 0,
        fecha_entrega: mm?.fecha_entrega || null,
        // ========================================
      }));
      setMovs(normMovs);
    }

    setOpenModal(true);
  };

  // ===== crear / actualizar
  const agregarMovimientoVacio = () => {
    setMovs(prev => [...prev, {
      nombre_item: '', cantidad: 0, tipo: form.tipo || 'INGRESO', subtipo: 'GENERAL',
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
        const endpoint = '/movimiento-material/' + id;
        await api.delete(endpoint);
      }
     // si la llamada fue ok, quitar de la UI
      quitarMov(idx);
    } catch (err) {
      console.error('[UI][solicitudes] remove movimiento error', err?.response || err);
      alert('No se pudo eliminar el movimiento en el servidor. Revisá la consola para más detalles.');
    }
  };

  // ===== FUNCIONES DE ENTREGA PARCIAL =====
  const handleAbrirEntregaDialog = (mov, idx) => {
    const cantidadOriginal = mov.cantidad_original || Math.abs(mov.cantidad || 0);
    const cantidadEntregada = mov.cantidad_entregada || 0;
    const pendiente = cantidadOriginal - cantidadEntregada;
    
    setEntregaMovimiento({ ...mov, idx, cantidadPendiente: pendiente });
    setCantidadAEntregar(pendiente); // Por defecto, entregar todo lo pendiente
    setOpenEntregaDialog(true);
  };

  const handleConfirmarEntrega = async () => {
    if (!entregaMovimiento?._id) return;
    
    setEntregaLoading(true);
    try {
      const response = await api.post(`/movimiento-material/${entregaMovimiento._id}/entregar`, {
        cantidad_entregada: cantidadAEntregar
      });
      
      if (response.data?.ok) {
        setSnackbar({
          open: true,
          message: response.data.data?.mensaje || 'Entrega registrada correctamente',
          severity: 'success'
        });
        
        // Actualizar la lista de movimientos localmente
        const movActualizado = response.data.data?.movimiento_entregado;
        const movPendiente = response.data.data?.movimiento_pendiente;
        
        setMovs(prev => {
          let nuevosMovs = [...prev];
          
          // Actualizar el movimiento entregado
          if (movActualizado) {
            nuevosMovs = nuevosMovs.map((m, i) => 
              i === entregaMovimiento.idx 
                ? { ...m, 
                    estado: movActualizado.estado, 
                    cantidad: movActualizado.cantidad,
                    cantidad_entregada: movActualizado.cantidad_entregada,
                    fecha_entrega: movActualizado.fecha_entrega
                  } 
                : m
            );
          }
          
          // Agregar el movimiento pendiente si existe (entrega parcial)
          if (movPendiente) {
            nuevosMovs.push({
              _id: movPendiente._id,
              nombre_item: movPendiente.nombre_item,
              cantidad: Math.abs(movPendiente.cantidad),
              cantidad_original: movPendiente.cantidad_original,
              cantidad_entregada: movPendiente.cantidad_entregada,
              estado: movPendiente.estado,
              tipo: movPendiente.tipo,
              subtipo: movPendiente.subtipo,
              id_material: movPendiente.id_material,
              observacion: movPendiente.observacion,
              proyecto_id: movPendiente.proyecto_id,
              proyecto_nombre: movPendiente.proyecto_nombre,
            });
          }
          
          return nuevosMovs;
        });
        
        // Refrescar la lista principal
        await fetchAll();
      }
    } catch (err) {
      console.error('[UI][solicitudes] entrega error', err?.response || err);
      setSnackbar({
        open: true,
        message: err?.response?.data?.error?.message || 'Error al registrar la entrega',
        severity: 'error'
      });
    } finally {
      setEntregaLoading(false);
      setOpenEntregaDialog(false);
      setEntregaMovimiento(null);
      setCantidadAEntregar(0);
    }
  };
  // =========================================

  // ===== FUNCIONES DE CONFIRMAR INGRESO (A NIVEL SOLICITUD) =====
  const handleAbrirConfirmarIngreso = (rowData) => {
    const solicitud = rowData?.solicitud || {};
    const movimientos = Array.isArray(rowData?.movimientos) ? rowData.movimientos : [];
    
    // Filtrar solo movimientos pendientes (no entregados completamente)
    const movsPendientes = movimientos.filter(m => {
      const cantOrig = m.cantidad_original || Math.abs(m.cantidad || 0);
      const cantEntr = m.cantidad_entregada || 0;
      return cantOrig > cantEntr;
    });
    
    if (movsPendientes.length === 0) {
      setSnackbar({
        open: true,
        message: 'No hay movimientos pendientes de entrega en este ticket',
        severity: 'info'
      });
      return;
    }
    
    // Inicializar cantidades con el valor pendiente (por defecto entrega total)
    const cantidadesInit = {};
    movsPendientes.forEach(m => {
      const cantOrig = m.cantidad_original || Math.abs(m.cantidad || 0);
      const cantEntr = m.cantidad_entregada || 0;
      cantidadesInit[m._id] = cantOrig - cantEntr;
    });
    
    setConfirmarIngresoSolicitud({ solicitud, movimientos: movsPendientes });
    setCantidadesIngreso(cantidadesInit);
    setPasoConfirmacion('tipo');
    setTipoConfirmacion('total');
    setOpenConfirmarIngreso(true);
  };

  const handleSiguientePasoConfirmacion = () => {
    if (pasoConfirmacion === 'tipo') {
      if (tipoConfirmacion === 'total') {
        // Entrega total: confirmar directamente
        handleConfirmarIngreso();
      } else {
        // Entrega parcial: mostrar lista para editar cantidades
        setPasoConfirmacion('lista');
      }
    }
  };

  const handleConfirmarIngreso = async () => {
    if (!confirmarIngresoSolicitud?.movimientos?.length) return;
    
    setConfirmarIngresoLoading(true);
    const resultados = { exitos: 0, errores: 0, mensajes: [] };
    
    try {
      // Procesar cada movimiento
      for (const mov of confirmarIngresoSolicitud.movimientos) {
        const cantidadAEntregar = cantidadesIngreso[mov._id] || 0;
        
        if (cantidadAEntregar <= 0) continue; // Saltar si no hay cantidad
        
        try {
          const response = await api.post(`/movimiento-material/${mov._id}/entregar`, {
            cantidad_entregada: cantidadAEntregar
          });
          
          if (response.data?.ok) {
            resultados.exitos++;
          } else {
            resultados.errores++;
            resultados.mensajes.push(`${mov.nombre_item}: Error desconocido`);
          }
        } catch (err) {
          resultados.errores++;
          resultados.mensajes.push(`${mov.nombre_item}: ${err?.response?.data?.error?.message || err.message}`);
        }
      }
      
      // Mostrar resultado
      if (resultados.errores === 0) {
        setSnackbar({
          open: true,
          message: `✅ ${resultados.exitos} movimiento(s) confirmado(s) exitosamente`,
          severity: 'success'
        });
      } else if (resultados.exitos > 0) {
        setSnackbar({
          open: true,
          message: `⚠️ ${resultados.exitos} exitoso(s), ${resultados.errores} con error`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `❌ Error al confirmar ingresos: ${resultados.mensajes[0] || 'Error desconocido'}`,
          severity: 'error'
        });
      }
      
      // Refrescar la lista
      await fetchAll();
      
    } catch (err) {
      console.error('[UI][solicitudes] confirmarIngreso error', err);
      setSnackbar({
        open: true,
        message: 'Error al procesar la confirmación',
        severity: 'error'
      });
    } finally {
      setConfirmarIngresoLoading(false);
      setOpenConfirmarIngreso(false);
      setConfirmarIngresoSolicitud(null);
      setCantidadesIngreso({});
      setPasoConfirmacion('tipo');
    }
  };

  const handleCantidadIngresoChange = (movId, value) => {
    const cantidad = Math.max(0, parseInt(value) || 0);
    setCantidadesIngreso(prev => ({ ...prev, [movId]: cantidad }));
  };

  const getTotalPendienteConfirmacion = () => {
    if (!confirmarIngresoSolicitud?.movimientos) return 0;
    return confirmarIngresoSolicitud.movimientos.reduce((acc, m) => {
      const cantOrig = m.cantidad_original || Math.abs(m.cantidad || 0);
      const cantEntr = m.cantidad_entregada || 0;
      return acc + (cantOrig - cantEntr);
    }, 0);
  };

  const getTotalAConfirmar = () => {
    return Object.values(cantidadesIngreso).reduce((acc, val) => acc + (val || 0), 0);
  };
  // ==============================================================

  // Abrir popup para agregar movimiento
  const openAddMovDialog = () => {
    setEditMovIdx(null);
    setMovFormData({
      nombre_item: '',
      cantidad: 0,
      tipo: form.tipo || 'INGRESO', // Heredar tipo de la solicitud
      subtipo: 'GENERAL',
      fecha_movimiento: '',
      proyecto_id: '',
      proyecto_nombre: '',
      observacion: '',
      id_material: '',
    });
    setOpenMovDialog(true);
  };

  // Abrir popup para editar movimiento existente
  const openEditMovDialog = (idx) => {
    const mov = movs[idx];
    setEditMovIdx(idx);
    setMovFormData({
      nombre_item: mov.nombre_item || '',
      cantidad: mov.cantidad || 0,
      tipo: mov.tipo || form.tipo || 'INGRESO', // Heredar tipo de la solicitud si el mov no tiene
      subtipo: mov.subtipo || 'GENERAL',
      fecha_movimiento: mov.fecha_movimiento || '',
      proyecto_id: mov.proyecto_id || '',
      proyecto_nombre: mov.proyecto_nombre || '',
      observacion: mov.observacion || '',
      id_material: mov.id_material || '',  // Pasar el material_id existente
    });
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

      let effectiveMovs = [];

      // ===== CASO TRANSFERENCIA =====
      if (modalMode === 'transferencia' || form.tipo === 'TRANSFERENCIA') {
        // Los proyectos son opcionales, si están vacíos se asignan a "Sin asignar"
        const proyEgresoId = transProyectoEgreso || null;
        const proyIngresoId = transProyectoIngreso || null;
        const proyEgresoNombre = proyEgresoId 
          ? (proyectos.find(p => p.id === proyEgresoId)?.nombre || 'Proyecto desconocido') 
          : 'Sin asignar';
        const proyIngresoNombre = proyIngresoId 
          ? (proyectos.find(p => p.id === proyIngresoId)?.nombre || 'Proyecto desconocido') 
          : 'Sin asignar';

        // Duplicar cada movimiento: uno de egreso y uno de ingreso
        effectiveMovs = movs.flatMap((m) => {
          const cantidad = Math.abs(Number(m.cantidad || 0));
          if (cantidad === 0) return [];

          const baseMovimiento = {
            _id: null, // para movimientos nuevos
            empresa_id: null, // se setea en el servicio
            usuario_id: null,
            usuario_mail: null,
            nombre_item: m.nombre_item?.trim() || '',
            subtipo: 'TRANSFERENCIA',
            fecha_movimiento: m.fecha_movimiento || form?.fecha || new Date().toISOString(),
            observacion: m.observacion || `Transferencia: ${proyEgresoNombre} → ${proyIngresoNombre}`,
            id_material: m.id_material || null,
          };

          return [
            // EGRESO (cantidad negativa)
            {
              ...baseMovimiento,
              _id: m._id_egreso ?? null, // si editamos, podría venir con _id
              cantidad: -cantidad, // negativa
              tipo: 'EGRESO',
              proyecto_id: proyEgresoId,
              proyecto_nombre: proyEgresoNombre,
            },
            // INGRESO (cantidad positiva)
            {
              ...baseMovimiento,
              _id: m._id_ingreso ?? null,
              cantidad: cantidad, // positiva
              tipo: 'INGRESO',
              proyecto_id: proyIngresoId,
              proyecto_nombre: proyIngresoNombre,
            },
          ];
        });
      } 
      // ===== CASO NORMAL (INGRESO/EGRESO) =====
      else {
        effectiveMovs = (movs || []).map((m) => {
          // Prioridad: 1. proyecto del movimiento individual, 2. proyecto del formulario, 3. null (sin asignar)
          const proyectoId = m.proyecto_id || form.proyecto_id || null;
          let proyectoNombre;
          
          if (proyectoId) {
            // Buscar el nombre del proyecto por ID
            const proyecto = proyectos.find(p => p.id === proyectoId);
            proyectoNombre = proyecto?.nombre || m.proyecto_nombre || 'Proyecto desconocido';
          } else {
            // Sin proyecto asignado
            proyectoNombre = 'Sin asignar';
          }
          
          return { 
            ...m, 
            proyecto_id: proyectoId, 
            proyecto_nombre: proyectoNombre 
          };
        });
      }

      // Asegurar que el responsable siempre sea el usuario actual
      const formWithUser = {
        ...form,
        responsable: user?.email || ''
      };

      // Delegar validación/normalización al servicio central
      const resp = await StockSolicitudesService.guardarSolicitud({
        user,
        form: formWithUser,
        movs: effectiveMovs,
        editMode,
        editId
      });

      // cerrar y resetear modal, recargar
      setOpenModal(false);
      resetModal();
      await fetchAll();
      
      setSnackbar({ 
        open: true, 
        message: editMode ? 'Solicitud actualizada correctamente' : 'Solicitud creada exitosamente', 
        severity: 'success' 
      });
      
      return resp;
    } catch (e) {
      console.error('[UI] guardarSolicitud', e);
      const serverMsg = e?.response?.data || e?.message || e;
      const errorMessage = typeof serverMsg === 'string' ? serverMsg 
                        : (serverMsg?.message || 'Error al guardar la solicitud');
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
      throw e;
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
        <MenuItem value=""><em>(sin proyecto - "Sin asignar")</em></MenuItem>
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
      setSnackbar({ 
        open: true, 
        message: 'Solicitud eliminada correctamente', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('[UI][solicitudes] eliminar solicitud error', err?.response || err);
      setSnackbar({ 
        open: true, 
        message: 'No se pudo eliminar la solicitud. Revisá la consola para más detalles.', 
        severity: 'error' 
      });
    }
  };

  return (
    <>
      <Head><title>Tickets</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Tickets</Typography>
              <Stack direction="row" spacing={1}>
                <Button 
                  startIcon={<GetAppIcon />} 
                  variant="outlined" 
                  onClick={exportarDatos}
                  disabled={rows.length === 0}
                >
                  Exportar
                </Button>
                
                {/* Menú: Cargar con IA */}
                <Button 
                  variant="contained" 
                  color="secondary"
                  startIcon={<AutoFixHighIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setAnchorElIA(e.currentTarget)}
                >
                  Cargar con IA
                </Button>
                <Menu
                  anchorEl={anchorElIA}
                  open={openMenuIA}
                  onClose={() => setAnchorElIA(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={() => { setAnchorElIA(null); setOpenIngresoFactura(true); }}>
                    <ListItemIcon><ReceiptLongIcon color="success" /></ListItemIcon>
                    <ListItemText primary="Ingreso desde Factura" secondary="Extraer materiales de una factura de compra" />
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorElIA(null); setOpenEgresoRemito(true); }}>
                    <ListItemIcon><LocalShippingIcon color="warning" /></ListItemIcon>
                    <ListItemText primary="Egreso desde Remito" secondary="Extraer materiales de un remito de entrega" />
                  </MenuItem>
                </Menu>

                {/* Menú: Nuevo ticket */}
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setAnchorElNuevo(e.currentTarget)}
                >
                  Nuevo ticket
                </Button>
                <Menu
                  anchorEl={anchorElNuevo}
                  open={openMenuNuevo}
                  onClose={() => setAnchorElNuevo(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateIngreso(); }}>
                    <ListItemIcon><CallReceivedIcon color="success" /></ListItemIcon>
                    <ListItemText primary="Registrar ingreso" />
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateEgreso(); }}>
                    <ListItemIcon><CallMadeIcon color="error" /></ListItemIcon>
                    <ListItemText primary="Registrar egreso" />
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateTransferencia(); }}>
                    <ListItemIcon><SwapHorizIcon color="info" /></ListItemIcon>
                    <ListItemText primary="Realizar transferencia" />
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>

            {/* Filtros */}
            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="tipo-label">Tipo</InputLabel>
                    <Select labelId="tipo-label" label="Tipo" value={fTipo} onChange={(e) => { setFTipo(e.target.value); setPage(0); }}>
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {TIPO_OPCIONES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>

                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="estado-label">Estado</InputLabel>
                    <Select labelId="estado-label" label="Estado" value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPage(0); }}>
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {ESTADO_OPCIONES.map(e => (
                        <MenuItem key={e} value={e}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getEstadoChip(e).icon}
                            {e.replace('_', ' ')}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField label="Subtipo" value={fSubtipo} onChange={(e) => { setFSubtipo(e.target.value); setPage(0); }} sx={{ minWidth: 200 }} />

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
                  <Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {total} resultado{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                      </Typography>
                      {chips.map(c => {
                        const key = c.k + '-' + c.v;
                        const label = c.k + ': ' + c.v;
                        return <Chip key={key} label={label} onDelete={c.onDelete} />;
                      })}
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={limpiarFiltros}
                        startIcon={<ClearAllIcon />}
                      >
                        Limpiar todo
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Tabla */}
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CategoryIcon fontSize="small" />
                        <span>Tipo</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LabelIcon fontSize="small" />
                        <span>Subtipo</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocalShippingIcon fontSize="small" />
                        <span>Estado</span>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarTodayIcon fontSize="small" />
                        <span>Fecha</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <UpdateIcon fontSize="small" />
                        <span>Actualizado</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end">
                        <InventoryIcon fontSize="small" />
                        <span>Items</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <FolderIcon fontSize="small" />
                        <span>Proyectos</span>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rows || []).map((e) => {
                    const s = e?.solicitud || {};
                    const movsArr = Array.isArray(e?.movimientos) ? e.movimientos : [];
                    const totals = calculateTotals(movsArr);
                    return (
                      <TableRow
                        key={s._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTipoIcon(s.tipo)}
                            <Typography variant="body2" fontWeight={600}>
                              {s.tipo}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{s.subtipo}</TableCell>
                        <TableCell>
                          {(() => {
                            const estadoInfo = getEstadoChip(s.estado);
                            return (
                              <Chip
                                icon={estadoInfo.icon}
                                label={estadoInfo.label}
                                size="small"
                                color={estadoInfo.color}
                                variant="filled"
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell>{fmt(s.fecha)}</TableCell>
                        <TableCell>{fmt(s.updatedAt)}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={totals.totalItems}
                            size="small"
                            variant="outlined"
                            color={totals.totalItems > 0 ? "primary" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexWrap="wrap" gap={0.5} maxWidth={200}>
                            {(() => {
                              // Obtener proyectos únicos de los movimientos
                              const proyectosUnicos = [...new Set(
                                movsArr
                                  .map(mov => mov.proyecto_nombre || 'Sin asignar')
                                  .filter(Boolean)
                              )];
                              
                              if (proyectosUnicos.length === 0) {
                                return (
                                  <Chip 
                                    label="Sin asignar" 
                                    size="small" 
                                    variant="outlined" 
                                    color="default"
                                  />
                                );
                              }
                              
                              return proyectosUnicos.slice(0, 3).map((proyecto, idx) => (
                                <Chip 
                                  key={idx}
                                  label={proyecto}
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ 
                                    maxWidth: 120,
                                    '& .MuiChip-label': {
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }
                                  }}
                                />
                              )).concat(
                                proyectosUnicos.length > 3 ? [
                                  <Chip 
                                    key="more"
                                    label={`+${proyectosUnicos.length - 3}`}
                                    size="small"
                                    variant="filled"
                                    color="secondary"
                                  />
                                ] : []
                              );
                            })()}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {/* Indicador de documentos adjuntos */}
                          {(s.documentos?.length > 0 || s.url_doc) && (
                            <Tooltip title={`${s.documentos?.length || 1} documento(s) adjunto(s) - Click para ver`}>
                              <IconButton 
                                size="small" 
                                color="info"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  let url = s.documentos?.[0] || s.url_doc;
                                  if (url) {
                                    // Convertir URL de Google Drive de descarga a preview
                                    if (url.includes('drive.google.com') && url.includes('/d/')) {
                                      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                      if (match) {
                                        url = `https://drive.google.com/file/d/${match[1]}/preview`;
                                      }
                                    }
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                              >
                                <AttachFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {/* Botón Confirmar Ingreso - solo para INGRESO pendiente */}
                          {s.tipo === 'INGRESO' && ['PENDIENTE', 'PARCIALMENTE_ENTREGADO'].includes(s.estado) && (
                            <Tooltip title="Confirmar Ingreso">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={(ev) => { ev.stopPropagation(); handleAbrirConfirmarIngreso(e); }}
                              >
                                <LocalShippingIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
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
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        <Stack spacing={2} alignItems="center">
                          <Typography variant="h6" color="text.secondary">
                            {chips.length > 0 
                              ? "No se encontraron tickets con estos filtros" 
                              : "No hay tickets registrados"
                            }
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {chips.length > 0
                              ? "Probá ajustar los criterios de búsqueda"
                              : "¡Creá tu primer ticket!"
                            }
                          </Typography>
                          {chips.length === 0 && (
                            <Stack direction="row" spacing={1}>
                              <Button 
                                variant="contained" 
                                startIcon={<AddIcon />} 
                                onClick={openCreateIngreso}
                                size="small"
                              >
                                Registrar Ingreso
                              </Button>
                              <Button 
                                variant="outlined" 
                                startIcon={<AddIcon />} 
                                onClick={openCreateEgreso}
                                size="small"
                              >
                                Registrar Egreso
                              </Button>
                            </Stack>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
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

      {/* Snackbar para feedback */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ======= CREAR / EDITAR ======= */}
      <Dialog
        open={openModal}
        onClose={() => { setOpenModal(false); resetModal(); }}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { width: '100%', maxWidth: 1200 } }}
      >
       <DialogTitle>
         {editMode ? 'Editar ticket' : ('Nuevo ticket - ' + (modalMode?.toUpperCase() || ''))}
       </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* En modo edición o creación normal, mostrar tipo/subtipo/fecha */}
            {!editMode && (editMode || !modalMode) && (
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
            )}

            {/* En edición, solo mostrar fecha (tipo y subtipo readonly) */}
            {editMode && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Tipo" value={form.tipo} disabled sx={{ minWidth: 150 }} />
                <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
                <FormControl sx={{ minWidth: 250 }}>
                  <InputLabel id="proyecto-edit">Proyecto</InputLabel>
                  <Select 
                    labelId="proyecto-edit" 
                    label="Proyecto" 
                    value={form.proyecto_id || ''} 
                    onChange={(e) => {
                      const proyId = e.target.value;
                      const proy = proyectos.find(p => p.id === proyId);
                      patchForm('proyecto_id', proyId);
                      patchForm('proyecto_nombre', proy?.nombre || 'Sin asignar');
                      // También actualizar el proyecto en todos los movimientos
                      setMovs(prev => prev.map(m => ({
                        ...m,
                        proyecto_id: proyId || null,
                        proyecto_nombre: proy?.nombre || 'Sin asignar'
                      })));
                    }}
                  >
                    <MenuItem value="">
                      <em>Sin asignar</em>
                    </MenuItem>
                    {proyectos.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* Mostrar documentos adjuntos (remitos) en modo edición */}
            {editMode && form.documentos && form.documentos.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AttachFileIcon color="primary" />
                    <Typography variant="subtitle2" color="primary">
                      Documentos adjuntos ({form.documentos.length})
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {form.documentos.map((url, idx) => (
                      <Paper 
                        key={idx} 
                        variant="outlined" 
                        sx={{ 
                          p: 1, 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { 
                            boxShadow: 2,
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={() => window.open(url, '_blank')}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            component="img"
                            src={url}
                            alt={`Remito ${idx + 1}`}
                            sx={{
                              width: 80,
                              height: 80,
                              objectFit: 'cover',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <Box 
                            sx={{ 
                              display: 'none', 
                              width: 80, 
                              height: 80, 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              bgcolor: 'grey.200',
                              borderRadius: 1
                            }}
                          >
                            <ImageIcon color="disabled" />
                          </Box>
                          <Stack>
                            <Typography variant="caption" color="text.secondary">
                              Página {idx + 1}
                            </Typography>
                            <Tooltip title="Abrir en nueva pestaña">
                              <IconButton size="small" color="primary">
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}

            {/* En modo creación rápida, solo fecha y observación */}
            {!editMode && modalMode && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.fecha} onChange={(e) => patchForm('fecha', e.target.value)} sx={{ minWidth: 200 }} />
                <TextField label="Observación" value={form.observacion || ''} onChange={(e) => patchForm('observacion', e.target.value)} sx={{ minWidth: 300 }} />
              </Stack>
            )}

             <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>

              {!editMode && !modalMode && (
                <>
                  <TextField label="Proveedor (nombre)" value={form.proveedor_nombre} onChange={(e) => patchForm('proveedor_nombre', e.target.value)} sx={{ minWidth: 280 }} />
                  <TextField label="Proveedor (CUIT)" value={form.proveedor_cuit} onChange={(e) => patchForm('proveedor_cuit', e.target.value)} sx={{ minWidth: 220 }} />
                </>
              )}
             </Stack>

           {!editMode && !modalMode && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="ID Compra" value={form.id_compra} onChange={(e) => patchForm('id_compra', e.target.value)} sx={{ minWidth: 220 }} />
                <TextField label="URL doc" value={form.url_doc} onChange={(e) => patchForm('url_doc', e.target.value)} sx={{ minWidth: 420 }} />
              </Stack>
            )}

            {/* Selector de proyecto (solo en creación rápida, ingreso/egreso/transferencia) */}
            {!editMode && modalMode && modalMode !== 'transferencia' && (
              <FormControl fullWidth>
                <InputLabel id="proy-rapida">Proyecto (opcional - sin proyecto = "Sin asignar")</InputLabel>
                <Select
                  labelId="proy-rapida"
                  label="Proyecto (opcional - sin proyecto = 'Sin asignar')"
                  value={form.proyecto_id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const p = proyectos.find(pp => pp.id === id);
                    patchForm('proyecto_id', id);
                    patchForm('proyecto_nombre', p?.nombre || '');
                  }}
                >
                  <MenuItem value=""><em>(sin proyecto - se asigna a "Sin asignar")</em></MenuItem>
                  {proyectos.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Selectors para TRANSFERENCIA: egreso e ingreso */}
            {!editMode && modalMode === 'transferencia' && (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="trans-egreso-label">Proyecto EGRESO (desde)</InputLabel>
                  <Select
                    labelId="trans-egreso-label"
                    label="Proyecto EGRESO (desde)"
                    value={transProyectoEgreso}
                    onChange={(e) => setTransProyectoEgreso(e.target.value)}
                  >
                    <MenuItem value=""><em>(sin proyecto - "Sin asignar")</em></MenuItem>
                    {proyectos.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="trans-ingreso-label">Proyecto INGRESO (hacia)</InputLabel>
                  <Select
                    labelId="trans-ingreso-label"
                    label="Proyecto INGRESO (hacia)"
                    value={transProyectoIngreso}
                    onChange={(e) => setTransProyectoIngreso(e.target.value)}
                  >
                    <MenuItem value=""><em>(sin proyecto - "Sin asignar")</em></MenuItem>
                    {proyectos.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            <Divider sx={{ my: 1 }} />
            <Typography variant="h6">Movimientos</Typography>
            
            {/* Lista resumida de movimientos (inline) */}
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>MATERIAL / NOMBRE</TableCell>
                    <TableCell align="right">CANTIDAD</TableCell>
                    {/* Mostrar columna de estado solo para INGRESO */}
                    {(modalMode === 'ingreso' || form.tipo === 'INGRESO') && editMode && (
                      <TableCell align="center">ESTADO</TableCell>
                    )}
                    <TableCell>OBSERVACIÓN</TableCell>
                    <TableCell align="right">ACCIONES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movs.map((m, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell width={350}>
                        <MaterialAutocomplete
                          user={user}
                          value={m.id_material || ''}
                          fallbackText={m.nombre_item || ''} // Mostrar nombre como fallback si no se encuentra el ID
                          onTextChange={(textLibre) => {
                            // Usuario escribió texto libre - limpiar id_material y usar texto como nombre_item
                            patchMov(idx, 'id_material', null);
                            patchMov(idx, 'nombre_item', textLibre || '');
                          }}
                          onMaterialSelect={(mat) => {
                            // Usuario seleccionó material de la lista - actualizar ambos campos
                            patchMov(idx, 'id_material', mat.id || null);
                            patchMov(idx, 'nombre_item', mat.label || mat.nombre || '');
                          }}
                          onMaterialCreated={(materialCreado) => {
                            // Cuando se crea un material nuevo
                            patchMov(idx, 'id_material', materialCreado.id);
                            patchMov(idx, 'nombre_item', materialCreado.nombre);
                            console.log('✅ Material creado en solicitud:', materialCreado);
                          }}
                          label="Material (elige o escribe)"
                          disabled={false}
                          fullWidth
                          showCreateOption={true} // Habilitar creación de materiales
                        />
                      </TableCell>

                      <TableCell align="right" width={100}>
                        <TextField
                          type="number"
                          value={m.cantidad || 0}
                          onChange={(e) => patchMov(idx, 'cantidad', e.target.value)}
                          size="small"
                          sx={{ maxWidth: 80 }}
                        />
                      </TableCell>

                      {/* Columna de estado solo para INGRESO en modo edición */}
                      {(modalMode === 'ingreso' || form.tipo === 'INGRESO') && editMode && (
                        <TableCell align="center" width={150}>
                          {(() => {
                            const estadoMov = m.estado || 'PENDIENTE';
                            const estadoInfo = getEstadoChip(estadoMov);
                            const cantidadOriginal = m.cantidad_original || Math.abs(m.cantidad || 0);
                            const cantidadEntregada = m.cantidad_entregada || 0;
                            
                            return (
                              <Stack spacing={0.5} alignItems="center">
                                <Chip
                                  icon={estadoInfo.icon}
                                  label={estadoInfo.label}
                                  size="small"
                                  color={estadoInfo.color}
                                  variant="filled"
                                />
                                {estadoMov === 'PARCIALMENTE_ENTREGADO' && (
                                  <Typography variant="caption" color="text.secondary">
                                    {cantidadEntregada}/{cantidadOriginal}
                                  </Typography>
                                )}
                              </Stack>
                            );
                          })()}
                        </TableCell>
                      )}

                      <TableCell width={200}>
                        <TextField
                          value={m.observacion || ''}
                          onChange={(e) => patchMov(idx, 'observacion', e.target.value)}
                          size="small"
                          fullWidth
                          multiline
                          rows={1}
                        />
                      </TableCell>

                      <TableCell align="right" width={80}>
                        <Tooltip title="Eliminar">
                          <IconButton onClick={() => handleQuitarMov(idx)} size="small" color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {movs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <em>Sin movimientos. Agregá al menos uno (opcional).</em>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
            {/* Botón para agregar nueva línea (inline) */}
            <Button onClick={() => {
              const newMov = {
                nombre_item: '', 
                cantidad: 0, 
                tipo: modalMode === 'transferencia' ? 'TRANSFERENCIA' : (form.tipo || 'INGRESO'), 
                subtipo: modalMode === 'transferencia' ? 'TRANSFERENCIA' : 'GENERAL',
                fecha_movimiento: form.fecha || '', 
                proyecto_id: '', // en transferencias no se muestra
                proyecto_nombre: '',
                observacion: '',
                id_material: ''
              };
              setMovs(prev => [...prev, newMov]);
            }} startIcon={<AddIcon />} variant="outlined" fullWidth>
              Agregar línea
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpenModal(false); resetModal(); }}>Cancelar</Button>
          <Button variant="contained" onClick={guardarSolicitud}>{editMode ? 'Guardar cambios' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ===== DIÁLOGO DE ENTREGA PARCIAL ===== */}
      <Dialog 
        open={openEntregaDialog} 
        onClose={() => !entregaLoading && setOpenEntregaDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="success" />
            <span>Registrar Entrega</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {entregaMovimiento && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="info">
                Registrá la cantidad de unidades que fueron entregadas para este material.
                Si es una entrega parcial, se creará un nuevo movimiento con el pendiente.
              </Alert>
              
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Material: <strong>{entregaMovimiento.nombre_item}</strong>
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Typography variant="body2">
                    Cantidad original: <strong>{entregaMovimiento.cantidad_original || Math.abs(entregaMovimiento.cantidad || 0)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Ya entregado: <strong>{entregaMovimiento.cantidad_entregada || 0}</strong>
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Pendiente: <strong>{entregaMovimiento.cantidadPendiente}</strong>
                  </Typography>
                </Stack>
              </Box>

              <TextField
                label="Cantidad a entregar ahora"
                type="number"
                value={cantidadAEntregar}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(Number(e.target.value), entregaMovimiento.cantidadPendiente));
                  setCantidadAEntregar(val);
                }}
                inputProps={{ 
                  min: 1, 
                  max: entregaMovimiento.cantidadPendiente,
                  step: 1
                }}
                fullWidth
                helperText={
                  cantidadAEntregar < entregaMovimiento.cantidadPendiente
                    ? `Se creará un movimiento pendiente de ${entregaMovimiento.cantidadPendiente - cantidadAEntregar} unidades`
                    : 'Entrega completa - el movimiento quedará como ENTREGADO'
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setOpenEntregaDialog(false)} 
            disabled={entregaLoading}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleConfirmarEntrega}
            disabled={entregaLoading || cantidadAEntregar <= 0}
            startIcon={entregaLoading ? null : <CheckCircleIcon />}
          >
            {entregaLoading ? 'Registrando...' : 'Confirmar Entrega'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ===================================== */}

      {/* ===== DIÁLOGO DE CONFIRMAR INGRESO (A NIVEL SOLICITUD) ===== */}
      <Dialog 
        open={openConfirmarIngreso} 
        onClose={() => !confirmarIngresoLoading && setOpenConfirmarIngreso(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="success" />
            <span>Confirmar Ingreso</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {confirmarIngresoSolicitud && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Paso 1: Elegir tipo de confirmación */}
              {pasoConfirmacion === 'tipo' && (
                <>
                  <Alert severity="info">
                    Seleccioná el tipo de confirmación para este ticket de ingreso.
                  </Alert>
                  
                  <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Ticket: <strong>{confirmarIngresoSolicitud.solicitud?.subtipo || 'Sin subtipo'}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Materiales pendientes: <strong>{confirmarIngresoSolicitud.movimientos?.length || 0}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Unidades totales pendientes: <strong>{getTotalPendienteConfirmacion()}</strong>
                    </Typography>
                  </Box>

                  <FormControl component="fieldset">
                    <Typography variant="subtitle2" gutterBottom>
                      ¿Cómo fue la entrega?
                    </Typography>
                    <Stack spacing={2}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: tipoConfirmacion === 'total' ? '2px solid' : '1px solid',
                          borderColor: tipoConfirmacion === 'total' ? 'success.main' : 'divider',
                          bgcolor: tipoConfirmacion === 'total' ? 'success.50' : 'transparent',
                          '&:hover': { borderColor: 'success.main' }
                        }}
                        onClick={() => setTipoConfirmacion('total')}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Radio 
                            checked={tipoConfirmacion === 'total'} 
                            color="success"
                            onChange={() => setTipoConfirmacion('total')}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              ✅ Entrega Total
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Se recibieron TODOS los materiales en las cantidades solicitadas
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>

                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: tipoConfirmacion === 'parcial' ? '2px solid' : '1px solid',
                          borderColor: tipoConfirmacion === 'parcial' ? 'warning.main' : 'divider',
                          bgcolor: tipoConfirmacion === 'parcial' ? 'warning.50' : 'transparent',
                          '&:hover': { borderColor: 'warning.main' }
                        }}
                        onClick={() => setTipoConfirmacion('parcial')}
                      >
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Radio 
                            checked={tipoConfirmacion === 'parcial'} 
                            color="warning"
                            onChange={() => setTipoConfirmacion('parcial')}
                          />
                          <Box>
                            <Typography variant="subtitle1" fontWeight={600}>
                              ⚠️ Entrega Parcial
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Algunos materiales llegaron incompletos o no llegaron
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Stack>
                  </FormControl>
                </>
              )}

              {/* Paso 2: Lista de materiales (solo para parcial) */}
              {pasoConfirmacion === 'lista' && (
                <>
                  <Alert severity="warning">
                    Indicá la cantidad recibida para cada material. Los pendientes se mantendrán en el ticket.
                  </Alert>

                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Material</TableCell>
                          <TableCell align="center">Pendiente</TableCell>
                          <TableCell align="center">Recibido</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {confirmarIngresoSolicitud.movimientos?.map((mov) => {
                          const cantOrig = mov.cantidad_original || Math.abs(mov.cantidad || 0);
                          const cantEntr = mov.cantidad_entregada || 0;
                          const pendiente = cantOrig - cantEntr;
                          return (
                            <TableRow key={mov._id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {mov.nombre_item}
                                </Typography>
                                {mov.observacion && (
                                  <Typography variant="caption" color="text.secondary">
                                    {mov.observacion}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={pendiente} 
                                  size="small" 
                                  color="warning" 
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ width: 120 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={cantidadesIngreso[mov._id] || 0}
                                  onChange={(e) => handleCantidadIngresoChange(mov._id, e.target.value)}
                                  inputProps={{ min: 0, max: pendiente, step: 1 }}
                                  sx={{ width: 80 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>

                  <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        Total pendiente: <strong>{getTotalPendienteConfirmacion()}</strong>
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        Total a confirmar: <strong>{getTotalAConfirmar()}</strong>
                      </Typography>
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {pasoConfirmacion === 'lista' && (
            <Button 
              onClick={() => setPasoConfirmacion('tipo')} 
              disabled={confirmarIngresoLoading}
            >
              Volver
            </Button>
          )}
          <Button 
            onClick={() => setOpenConfirmarIngreso(false)} 
            disabled={confirmarIngresoLoading}
          >
            Cancelar
          </Button>
          {pasoConfirmacion === 'tipo' && (
            <Button 
              variant="contained" 
              color={tipoConfirmacion === 'total' ? 'success' : 'warning'}
              onClick={handleSiguientePasoConfirmacion}
              disabled={confirmarIngresoLoading}
              startIcon={confirmarIngresoLoading ? null : (tipoConfirmacion === 'total' ? <CheckCircleIcon /> : <PendingIcon />)}
            >
              {confirmarIngresoLoading ? 'Procesando...' : (tipoConfirmacion === 'total' ? 'Confirmar Todo' : 'Siguiente')}
            </Button>
          )}
          {pasoConfirmacion === 'lista' && (
            <Button 
              variant="contained" 
              color="success"
              onClick={handleConfirmarIngreso}
              disabled={confirmarIngresoLoading || getTotalAConfirmar() <= 0}
              startIcon={confirmarIngresoLoading ? null : <CheckCircleIcon />}
            >
              {confirmarIngresoLoading ? 'Procesando...' : 'Confirmar Ingreso'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* ============================================================= */}

      {/* Diálogo de Ingreso desde Factura (IA) */}
      <IngresoDesdeFactura
        open={openIngresoFactura}
        onClose={() => setOpenIngresoFactura(false)}
        onSuccess={(resultado) => {
          setSnackbar({ 
            open: true, 
            message: 'Ingreso desde factura creado exitosamente', 
            severity: 'success' 
          });
          fetchAll(); // Recargar la lista
        }}
        user={user}
        proyectos={proyectos}
      />

      {/* Diálogo de Egreso desde Remito (IA) */}
      <EgresoDesdeRemito
        open={openEgresoRemito}
        onClose={() => setOpenEgresoRemito(false)}
        onSuccess={(resultado) => {
          setSnackbar({ 
            open: true, 
            message: 'Egreso desde remito creado exitosamente', 
            severity: 'success' 
          });
          fetchAll(); // Recargar la lista
        }}
        user={user}
        proyectos={proyectos}
      />
    </>
  );
}

StockSolicitudes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
