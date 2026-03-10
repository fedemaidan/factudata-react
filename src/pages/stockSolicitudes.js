import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert, Box, Button, Chip, Container, Divider, FormControl, IconButton, InputLabel,
  Menu, MenuItem, ListItemIcon, ListItemText, Paper, Select, Snackbar, Stack,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import CategoryIcon from '@mui/icons-material/Category';
import LabelIcon from '@mui/icons-material/Label';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory';
import FolderIcon from '@mui/icons-material/Folder';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TuneIcon from '@mui/icons-material/Tune';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import StockSolicitudesService from 'src/services/stock/stockSolicitudesService';
import StockMovimientosService from 'src/services/stock/stockMovimientosService';
import StockConfigService from 'src/services/stock/stockConfigService';
import api from 'src/services/axiosConfig';
import { getProyectosFromUser } from 'src/services/proyectosService';

// Sub-componentes extraídos
import IngresoDesdeFactura from 'src/components/stock/IngresoDesdeFactura';
import EgresoDesdeRemito from 'src/components/stock/EgresoDesdeRemito';
import SolicitudFormDialog from 'src/components/stock/solicitudes/SolicitudFormDialog';
import EntregaParcialDialog from 'src/components/stock/solicitudes/EntregaParcialDialog';
import ConfirmarIngresoDialog from 'src/components/stock/solicitudes/ConfirmarIngresoDialog';
import AjusteStockDialog from 'src/components/stock/solicitudes/AjusteStockDialog';
import {
  TIPO_OPCIONES, ESTADO_OPCIONES, ORDER_MAP, SUBTIPO_POR_TIPO,
  getEstadoChip, fmt, getTipoIcon, calculateTotals,
} from 'src/components/stock/solicitudes/constants';

/* ═══════════════════════════════════════════════════════════
   Página principal de Tickets / Solicitudes de Stock
   ═══════════════════════════════════════════════════════════ */
export default function StockSolicitudes() {
  const { user } = useAuthContext();
  const router = useRouter();

  // ===== tabla
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(25);
  const [orderBy, setOrderBy] = useState('updated');
  const [order, setOrder] = useState('desc');

  // ===== combos
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  // ===== filtros
  const [fTipo, setFTipo] = useState('');
  const [fSubtipo, setFSubtipo] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fPendientes, setFPendientes] = useState(false);

  // ===== feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // ===== modal de entrega parcial (1 movimiento)
  const [openEntregaDialog, setOpenEntregaDialog] = useState(false);
  const [entregaMovimiento, setEntregaMovimiento] = useState(null);
  const [cantidadAEntregar, setCantidadAEntregar] = useState(0);
  const [entregaLoading, setEntregaLoading] = useState(false);

  // ===== modal de confirmar ingreso (wizard)
  const [openConfirmarIngreso, setOpenConfirmarIngreso] = useState(false);
  const [confirmarIngresoSolicitud, setConfirmarIngresoSolicitud] = useState(null);
  const [confirmarIngresoLoading, setConfirmarIngresoLoading] = useState(false);

  // ===== modal IA
  const [openIngresoFactura, setOpenIngresoFactura] = useState(false);
  const [openEgresoRemito, setOpenEgresoRemito] = useState(false);

  // ===== modal ajuste de stock
  const [openAjusteModal, setOpenAjusteModal] = useState(false);
  const [ajusteLoading, setAjusteLoading] = useState(false);

  // ===== stock config de la empresa (Fase T / Fase 3)
  const [stockConfig, setStockConfig] = useState({});

  // ===== menús desplegables
  const [anchorElNuevo, setAnchorElNuevo] = useState(null);
  const [anchorElIA, setAnchorElIA] = useState(null);
  const openMenuNuevo = Boolean(anchorElNuevo);
  const openMenuIA = Boolean(anchorElIA);

  // ===== modal crear/editar
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalMode, setModalMode] = useState(null);

  // ===== transferencia
  const [transProyectoEgreso, setTransProyectoEgreso] = useState('');
  const [transProyectoIngreso, setTransProyectoIngreso] = useState('');

  const emptyForm = {
    tipo: '', subtipo: '', fecha: '', responsable: '',
    proveedor_nombre: '', proveedor_id: '', proveedor_cuit: '',
    id_compra: '', url_doc: '', documentos: [],
    proyecto_id: '', proyecto_nombre: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [movs, setMovs] = useState([]);

  const patchForm = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const patchMov = (idx, k, v) => setMovs((prev) => prev.map((m, i) => (i === idx ? { ...m, [k]: v } : m)));

  const sortParam = useMemo(() => {
    const field = ORDER_MAP[orderBy] || 'updatedAt';
    const dir = order === 'asc' ? 'asc' : 'desc';
    return `${field}:${dir}`;
  }, [orderBy, order]);

  // ───── Cargar usuarios y proyectos ─────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        // Leer stock_config de la empresa (Fase T / Fase 3)
        setStockConfig(empresa?.stock_config || {});
        try {
          const lista = await StockSolicitudesService.listarUsuarios({ empresa_id: empresa.id });
          setUsuarios(
            (lista ?? [])
              .map((u) => ({ id: u?.id || u?.uid || u?._id, nombre: u?.nombre || u?.displayName || '', email: u?.email || '' }))
              .filter((x) => x.id && x.email)
          );
        } catch { setUsuarios([]); }
        try {
          let projsRaw = [];
          try { projsRaw = await getProyectosFromUser(user); } catch { /* */ }
          if (!Array.isArray(projsRaw) || projsRaw.length === 0) {
            try { projsRaw = await StockMovimientosService.listarProyectos({ empresa_id: empresa.id }); } catch { projsRaw = []; }
          }
          setProyectos(
            (projsRaw ?? [])
              .map((p) => ({ id: p?.id || p?._id || p?.proyecto_id || p?.codigo, nombre: p?.nombre || p?.name || '(sin nombre)' }))
              .filter((p) => p.id)
          );
        } catch { setProyectos([]); }
      } catch { /* */ }
    })();
  }, [user]);

  // ───── Filtros chips ─────
  const limpiarFiltros = () => {
    setFTipo(''); setFSubtipo(''); setFDesde(''); setFHasta(''); setFEstado(''); setFPendientes(false); setPage(0);
  };

  const chips = [
    fPendientes && { k: 'Filtro', v: `Sin conciliar (${total})`, onDelete: () => setFPendientes(false) },
    fTipo && { k: 'Tipo', v: `${fTipo} (${total})`, onDelete: () => setFTipo('') },
    fSubtipo && { k: 'Subtipo', v: `${fSubtipo} (${total})`, onDelete: () => setFSubtipo('') },
    fEstado && { k: 'Estado', v: fEstado.replace('_', ' '), onDelete: () => setFEstado('') },
    fDesde && { k: 'Desde', v: fDesde, onDelete: () => setFDesde('') },
    fHasta && { k: 'Hasta', v: fHasta, onDelete: () => setFHasta('') },
  ].filter(Boolean);

  // ───── Exportar CSV ─────
  const exportarDatos = () => {
    const data = rows.map((entry) => {
      const s = entry?.solicitud || {};
      const ms = Array.isArray(entry?.movimientos) ? entry.movimientos : [];
      const t = calculateTotals(ms);
      return {
        Tipo: s.tipo, Subtipo: s.subtipo, Fecha: fmt(s.fecha),
        'Total Items': t.totalItems, 'Cantidad Total': t.totalCantidad,
        Actualizado: fmt(s.updatedAt),
      };
    });
    if (!data.length) return;
    const csv = 'data:text/csv;charset=utf-8,'
      + Object.keys(data[0]).join(',') + '\n'
      + data.map((r) => Object.values(r).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `solicitudes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSnackbar({ open: true, message: 'Datos exportados correctamente', severity: 'success' });
  };

  // ───── Consulta principal ─────
  async function fetchAll() {
    if (!user) return;
    setLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const params = {
        empresa_id: empresa.id, sort: sortParam, limit: rpp,
        // Si "Pendientes de conciliar" está activo, traemos más data para filtrar client-side
        page: fPendientes ? 0 : page,
        ...(fPendientes ? { limit: 200 } : {}),
        ...(fTipo ? { tipo: fTipo } : {}),
        ...(fEstado ? { estado: fEstado } : {}),
        ...(fSubtipo?.trim() ? { subtipo: fSubtipo.trim() } : {}),
        ...(fDesde ? { fecha_desde: fDesde } : {}),
        ...(fHasta ? { fecha_hasta: fHasta } : {}),
      };
      const resp = await StockSolicitudesService.listarSolicitudes(params);
      let items = resp.items || [];
      let totalCount = Number(resp.total || 0);

      // Filtro client-side: solo tickets con al menos 1 item sin conciliar (sin id_material)
      if (fPendientes) {
        items = items.filter((entry) => {
          const ms = Array.isArray(entry?.movimientos) ? entry.movimientos : [];
          return ms.some((m) => !m.id_material);
        });
        totalCount = items.length;
      }

      setRows(items);
      setTotal(totalCount);
    } catch {
      setRows([]); setTotal(0);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, [user, fTipo, fSubtipo, fEstado, fPendientes, fDesde, fHasta, sortParam, page, rpp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ───── Helpers modal crear/editar ─────
  const resetModal = () => {
    setForm(emptyForm); setMovs([]); setEditMode(false); setEditId(null);
    setModalMode(null); setTransProyectoEgreso(''); setTransProyectoIngreso('');
  };

  const openCreateWithMode = (mode, tipo) => {
    resetModal();
    setModalMode(mode);
    const subtipos = SUBTIPO_POR_TIPO[tipo] || [];
    setForm((prev) => ({
      ...prev,
      tipo,
      subtipo: subtipos[0] || '',
      fecha: (() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d.toISOString().substring(0, 10); })(),
      responsable: user?.email || '',
    }));
    if (mode === 'transferencia') {
      setTransProyectoEgreso('');
      setTransProyectoIngreso('');
    }
    setOpenModal(true);
  };

  // Leer query params para pre-cargar material (navegación desde stockMateriales)
  const [queryProcessed, setQueryProcessed] = useState(false);
  useEffect(() => {
    if (!router.isReady || queryProcessed) return;
    const { crear, tipo, subtipo, material_id, material_nombre } = router.query;
    if (crear !== '1' || !tipo) { setQueryProcessed(true); return; }
    setQueryProcessed(true);
    const mode = tipo === 'TRANSFERENCIA' ? 'transferencia' : tipo === 'EGRESO' ? 'egreso' : 'ingreso';
    resetModal();
    setModalMode(mode);
    setForm((prev) => ({
      ...prev,
      tipo,
      subtipo: subtipo || '',
      fecha: (() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d.toISOString().substring(0, 10); })(),
      responsable: user?.email || '',
    }));
    if (material_id && material_nombre) {
      setMovs([{
        nombre_item: material_nombre,
        id_material: material_id,
        cantidad: 1,
        tipo,
        subtipo: subtipo || '',
        observacion: '',
      }]);
    }
    setOpenModal(true);
    router.replace('/stockSolicitudes', undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, queryProcessed]);

  const openEdit = (entry) => {
    const s = entry?.solicitud || {};
    const m = Array.isArray(entry?.movimientos) ? entry.movimientos : [];
    setEditId(s._id || null);
    setEditMode(true);

    const primerMovConProyecto = m.find((mm) => mm.proyecto_id);
    const proyectoId = s.proyecto_id || primerMovConProyecto?.proyecto_id || '';
    const proyectoNombre = s.proyecto_nombre || primerMovConProyecto?.proyecto_nombre || '';

    setForm({
      tipo: s.tipo || '', subtipo: s.subtipo || '',
      fecha: s.fecha ? String(s.fecha).substring(0, 10) : '',
      responsable: s.responsable || '',
      proveedor_nombre: s?.proveedor?.nombre || '',
      proveedor_id: s?.proveedor?.id || '',
      proveedor_cuit: s?.proveedor?.cuit || '',
      id_compra: s.id_compra || '', url_doc: s.url_doc || '',
      documentos: Array.isArray(s.documentos) ? s.documentos : (s.url_doc ? [s.url_doc] : []),
      proyecto_id: proyectoId, proyecto_nombre: proyectoNombre,
    });

    if (s.tipo === 'TRANSFERENCIA') {
      setModalMode('transferencia');
      const egresoMov = m.find((mm) => String(mm.tipo || '').toUpperCase() === 'EGRESO');
      const ingresoMov = m.find((mm) => String(mm.tipo || '').toUpperCase() === 'INGRESO');
      setTransProyectoEgreso(egresoMov?.proyecto_id || '');
      setTransProyectoIngreso(ingresoMov?.proyecto_id || '');

      const materialesMap = new Map();
      m.forEach((mm) => {
        const key = mm.id_material || mm.nombre_item;
        if (!materialesMap.has(key)) {
          materialesMap.set(key, {
            nombre_item: mm.nombre_item || '',
            cantidad: Math.abs(mm.cantidad || 0),
            tipo: 'EGRESO', subtipo: mm.subtipo || 'TRANSFERENCIA',
            fecha_movimiento: mm.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
            proyecto_id: '', proyecto_nombre: '',
            observacion: mm.observacion || '',
            id_material: mm.id_material || '',
            _id_egreso: mm.tipo === 'EGRESO' ? mm._id : undefined,
            _id_ingreso: mm.tipo === 'INGRESO' ? mm._id : undefined,
          });
        } else {
          const ex = materialesMap.get(key);
          if (mm.tipo === 'EGRESO') ex._id_egreso = mm._id;
          if (mm.tipo === 'INGRESO') ex._id_ingreso = mm._id;
        }
      });
      setMovs(Array.from(materialesMap.values()));
    } else {
      if (s.tipo === 'INGRESO') setModalMode('ingreso');
      else if (s.tipo === 'EGRESO') setModalMode('egreso');
      else setModalMode(null);

      setMovs(m.map((mm) => ({
        nombre_item: mm?.nombre_item || '',
        cantidad: Math.abs(mm?.cantidad ?? 0),
        tipo: mm?.tipo || 'EGRESO',
        subtipo: mm?.subtipo || 'GENERAL',
        fecha_movimiento: mm?.fecha_movimiento ? String(mm.fecha_movimiento).substring(0, 10) : '',
        proyecto_id: mm?.proyecto_id || '',
        proyecto_nombre: mm?.proyecto_nombre || '',
        observacion: mm?.observacion || '',
        id_material: mm?.id_material || '',
        _id: mm?._id || undefined,
        estado: mm?.estado || 'PENDIENTE',
        cantidad_original: mm?.cantidad_original || Math.abs(mm?.cantidad ?? 0),
        cantidad_entregada: mm?.cantidad_entregada || 0,
        fecha_entrega: mm?.fecha_entrega || null,
      })));
    }
    setOpenModal(true);
  };

  // Eliminar movimiento del backend si es edición
  const handleQuitarMov = async (idx) => {
    const m = movs[idx];
    if (!m?._id || !editMode) {
      setMovs((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    try {
      if (typeof StockMovimientosService?.remove === 'function') {
        await StockMovimientosService.remove(m._id);
      } else {
        await api.delete('/movimiento-material/' + m._id);
      }
      setMovs((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      console.error('[UI][solicitudes] remove movimiento error', err?.response || err);
      alert('No se pudo eliminar el movimiento en el servidor.');
    }
  };

  // ───── Guardar solicitud (crear/editar) ─────
  const guardarSolicitud = async () => {
    try {
      if (!user) throw new Error('Usuario no autenticado');

      let effectiveMovs = [];
      if (modalMode === 'transferencia' || form.tipo === 'TRANSFERENCIA') {
        const proyEgresoId = transProyectoEgreso || null;
        const proyIngresoId = transProyectoIngreso || null;
        const proyEgresoNombre = proyEgresoId
          ? (proyectos.find((p) => p.id === proyEgresoId)?.nombre || 'Proyecto desconocido')
          : 'Sin asignar';
        const proyIngresoNombre = proyIngresoId
          ? (proyectos.find((p) => p.id === proyIngresoId)?.nombre || 'Proyecto desconocido')
          : 'Sin asignar';

        effectiveMovs = movs.flatMap((m) => {
          const cantidad = Math.abs(Number(m.cantidad || 0));
          if (cantidad === 0) return [];
          const base = {
            _id: null, empresa_id: null, usuario_id: null, usuario_mail: null,
            nombre_item: m.nombre_item?.trim() || '',
            subtipo: 'TRANSFERENCIA',
            fecha_movimiento: m.fecha_movimiento || form?.fecha || new Date().toISOString(),
            observacion: m.observacion || `Transferencia: ${proyEgresoNombre} → ${proyIngresoNombre}`,
            id_material: m.id_material || null,
          };
          return [
            { ...base, _id: m._id_egreso ?? null, cantidad: -cantidad, tipo: 'EGRESO', proyecto_id: proyEgresoId, proyecto_nombre: proyEgresoNombre },
            { ...base, _id: m._id_ingreso ?? null, cantidad, tipo: 'INGRESO', proyecto_id: proyIngresoId, proyecto_nombre: proyIngresoNombre },
          ];
        });
      } else {
        effectiveMovs = (movs || []).map((m) => {
          const proyectoId = m.proyecto_id || form.proyecto_id || null;
          const proyectoNombre = proyectoId
            ? (proyectos.find((p) => p.id === proyectoId)?.nombre || m.proyecto_nombre || 'Proyecto desconocido')
            : 'Sin asignar';
          return { ...m, proyecto_id: proyectoId, proyecto_nombre: proyectoNombre };
        });
      }

      await StockSolicitudesService.guardarSolicitud({
        user, form: { ...form, responsable: user?.email || '' },
        movs: effectiveMovs, editMode, editId,
      });

      setOpenModal(false);
      resetModal();
      await fetchAll();
      setSnackbar({
        open: true,
        message: editMode ? 'Solicitud actualizada correctamente' : 'Solicitud creada exitosamente',
        severity: 'success',
      });
    } catch (e) {
      const serverMsg = e?.response?.data || e?.message || e;
      setSnackbar({
        open: true,
        message: typeof serverMsg === 'string' ? serverMsg : (serverMsg?.message || 'Error al guardar la solicitud'),
        severity: 'error',
      });
    }
  };

  // ───── Eliminar solicitud ─────
  const handleEliminarSolicitud = async (solicitudId) => {
    if (!window.confirm('¿Eliminar esta solicitud y todos sus movimientos?')) return;
    try {
      await StockSolicitudesService.eliminarSolicitud(solicitudId);
      await fetchAll();
      setSnackbar({ open: true, message: 'Solicitud eliminada correctamente', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'No se pudo eliminar la solicitud.', severity: 'error' });
    }
  };

  // ───── Entrega parcial ─────
  const handleAbrirEntregaDialog = (mov) => {
    const orig = mov.cantidad_original || Math.abs(mov.cantidad || 0);
    const entr = mov.cantidad_entregada || 0;
    setEntregaMovimiento({ ...mov, cantidadPendiente: orig - entr });
    setCantidadAEntregar(orig - entr);
    setOpenEntregaDialog(true);
  };

  const handleConfirmarEntrega = async () => {
    if (!entregaMovimiento?._id) return;
    setEntregaLoading(true);
    try {
      const response = await api.post(
        `/movimiento-material/${entregaMovimiento._id}/entregar`,
        { cantidad_entregada: cantidadAEntregar },
      );
      if (response.data?.ok) {
        setSnackbar({
          open: true,
          message: response.data.data?.mensaje || 'Entrega registrada correctamente',
          severity: 'success',
        });
        await fetchAll();
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.error?.message || 'Error al registrar la entrega',
        severity: 'error',
      });
    } finally {
      setEntregaLoading(false);
      setOpenEntregaDialog(false);
      setEntregaMovimiento(null);
      setCantidadAEntregar(0);
    }
  };

  // ───── Confirmar ingreso (wizard) ─────
  const handleAbrirConfirmarIngreso = (rowData) => {
    const solicitud = rowData?.solicitud || {};
    const movimientos = (rowData?.movimientos || []).filter((m) => {
      if (m.estado === 'ENTREGADO') return false;
      return (m.cantidad_original || Math.abs(m.cantidad || 0)) > (m.cantidad_entregada || 0);
    });
    if (movimientos.length === 0) {
      setSnackbar({ open: true, message: 'No hay movimientos pendientes de entrega en este ticket', severity: 'info' });
      return;
    }
    setConfirmarIngresoSolicitud({ solicitud, movimientos });
    setOpenConfirmarIngreso(true);
  };

  const handleConfirmarIngreso = async (cantidades) => {
    if (!confirmarIngresoSolicitud?.movimientos?.length) return;
    setConfirmarIngresoLoading(true);
    const resultados = { exitos: 0, errores: 0 };

    try {
      for (const mov of confirmarIngresoSolicitud.movimientos) {
        const cant = Number(cantidades[mov._id]) || 0;
        if (cant <= 0) continue;
        try {
          const r = await api.post(`/movimiento-material/${mov._id}/entregar`, { cantidad_entregada: cant });
          if (r.data?.ok) resultados.exitos++;
          else resultados.errores++;
        } catch { resultados.errores++; }
      }
      if (resultados.errores === 0) {
        setSnackbar({ open: true, message: `✅ ${resultados.exitos} movimiento(s) confirmado(s)`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `⚠️ ${resultados.exitos} exitoso(s), ${resultados.errores} con error`, severity: 'warning' });
      }
      await fetchAll();
    } catch {
      setSnackbar({ open: true, message: 'Error al procesar la confirmación', severity: 'error' });
    } finally {
      setConfirmarIngresoLoading(false);
      setOpenConfirmarIngreso(false);
      setConfirmarIngresoSolicitud(null);
    }
  };

  // ───── Ajuste de stock ─────
  const handleGuardarAjuste = async (lineasConDiferencia, proyecto) => {
    setAjusteLoading(true);
    try {
      const empresa = await getEmpresaDetailsFromUser(user);
      const today = new Date();
      today.setHours(11, 0, 0, 0);

      const movimientos = lineasConDiferencia.map((linea) => {
        const diferencia = (linea.cantidad_objetivo || 0) - (linea.stock_actual || 0);
        const proyectoId = linea.proyecto_id || proyecto || null;
        const proyectoNombre = linea.proyecto_nombre
          || proyectos.find((p) => p.id === proyectoId)?.nombre
          || 'Sin asignar';
        return {
          id_material: linea.id_material,
          nombre_item: linea.nombre_item,
          cantidad: diferencia,
          tipo: 'AJUSTE',
          subtipo: diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
          empresa_id: empresa.id, empresa_nombre: empresa.nombre,
          proyecto_id: proyectoId, proyecto_nombre: proyectoNombre,
          observacion: linea.motivo || `Ajuste de stock: ${linea.stock_actual} → ${linea.cantidad_objetivo}`,
          fecha_movimiento: today.toISOString(),
        };
      });

      await StockSolicitudesService.crearSolicitud({
        tipo: 'AJUSTE',
        subtipo: `Ajuste de ${movimientos.length} material(es)`,
        fecha: today.toISOString(),
        responsable: user?.email || '',
        empresa_id: empresa.id, empresa_nombre: empresa.nombre,
        proyecto_id: proyecto || null,
        proyecto_nombre: proyectos.find((p) => p.id === proyecto)?.nombre || 'Sin asignar',
        estado: 'ENTREGADO',
        movimientos,
      });

      setSnackbar({
        open: true,
        message: `✅ Ajuste de stock registrado (${movimientos.length} movimiento(s))`,
        severity: 'success',
      });
      setOpenAjusteModal(false);
      await fetchAll();
    } catch (e) {
      setSnackbar({
        open: true,
        message: `Error al guardar ajuste: ${e?.message || 'Error desconocido'}`,
        severity: 'error',
      });
    } finally {
      setAjusteLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <Head><title>Tickets</title></Head>

      <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            {/* ─── Header ─── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">Tickets</Typography>
              <Stack direction="row" spacing={1}>
                <Button startIcon={<GetAppIcon />} variant="outlined" onClick={exportarDatos} disabled={rows.length === 0}>
                  Exportar
                </Button>

                {/* Menú: Cargar con IA */}
                <Button
                  variant="contained" color="secondary"
                  startIcon={<AutoFixHighIcon />} endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setAnchorElIA(e.currentTarget)}
                >
                  Cargar con IA
                </Button>
                <Menu
                  anchorEl={anchorElIA} open={openMenuIA}
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
                  variant="contained" startIcon={<AddIcon />} endIcon={<KeyboardArrowDownIcon />}
                  onClick={(e) => setAnchorElNuevo(e.currentTarget)}
                >
                  Nuevo ticket
                </Button>
                <Menu
                  anchorEl={anchorElNuevo} open={openMenuNuevo}
                  onClose={() => setAnchorElNuevo(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateWithMode('ingreso', 'INGRESO'); }}>
                    <ListItemIcon><CallReceivedIcon color="success" /></ListItemIcon>
                    <ListItemText primary="Registrar ingreso" />
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateWithMode('egreso', 'EGRESO'); }}>
                    <ListItemIcon><CallMadeIcon color="error" /></ListItemIcon>
                    <ListItemText primary="Registrar egreso" />
                  </MenuItem>
                  <MenuItem onClick={() => { setAnchorElNuevo(null); openCreateWithMode('transferencia', 'TRANSFERENCIA'); }}>
                    <ListItemIcon><SwapHorizIcon color="info" /></ListItemIcon>
                    <ListItemText primary="Realizar transferencia" />
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { setAnchorElNuevo(null); setOpenAjusteModal(true); }}>
                    <ListItemIcon><TuneIcon color="secondary" /></ListItemIcon>
                    <ListItemText primary="Ajustar stock" secondary="Corregir cantidades de inventario" />
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>

            {/* ─── Filtros ─── */}
            <Paper sx={{ p: 2 }}>
              <Stack spacing={2}>
                {/* ─── Acceso rápido: Pendientes de conciliar ─── */}
                <Button
                  variant={fPendientes ? 'contained' : 'outlined'}
                  color={fPendientes ? 'warning' : 'inherit'}
                  startIcon={<PendingActionsIcon />}
                  onClick={() => { setFPendientes((prev) => !prev); setPage(0); }}
                  sx={{
                    alignSelf: 'flex-start',
                    fontWeight: fPendientes ? 700 : 400,
                    borderStyle: fPendientes ? undefined : 'dashed',
                  }}
                >
                  {fPendientes ? `Sin conciliar (${total})` : 'Sin conciliar'}
                </Button>

                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="tipo-label">Tipo</InputLabel>
                    <Select labelId="tipo-label" label="Tipo" value={fTipo} onChange={(e) => { setFTipo(e.target.value); setPage(0); }}>
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {TIPO_OPCIONES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id="estado-label">Estado</InputLabel>
                    <Select labelId="estado-label" label="Estado" value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPage(0); }}>
                      <MenuItem value=""><em>— Todos —</em></MenuItem>
                      {ESTADO_OPCIONES.map((e) => (
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
                  <TextField type="date" label="Desde" InputLabelProps={{ shrink: true }} value={fDesde} onChange={(e) => { setFDesde(e.target.value); setPage(0); }} sx={{ minWidth: 180 }} />
                  <TextField type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={fHasta} onChange={(e) => { setFHasta(e.target.value); setPage(0); }} sx={{ minWidth: 180 }} />
                  <Button onClick={limpiarFiltros} startIcon={<ClearAllIcon />} variant="outlined">Limpiar</Button>
                </Stack>

                {chips.length > 0 && (
                  <Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {total} resultado{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                      </Typography>
                      {chips.map((c) => (
                        <Chip key={c.k + '-' + c.v} label={c.k + ': ' + c.v} onDelete={c.onDelete} />
                      ))}
                      <Button size="small" variant="outlined" onClick={limpiarFiltros} startIcon={<ClearAllIcon />}>
                        Limpiar todo
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* ─── Tabla ─── */}
            <Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><CategoryIcon fontSize="small" /><span>Tipo</span></Stack></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><LabelIcon fontSize="small" /><span>Subtipo</span></Stack></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><LocalShippingIcon fontSize="small" /><span>Estado</span></Stack></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><CalendarTodayIcon fontSize="small" /><span>Fecha</span></Stack></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><UpdateIcon fontSize="small" /><span>Actualizado</span></Stack></TableCell>
                    <TableCell align="right"><Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end"><InventoryIcon fontSize="small" /><span>Items</span></Stack></TableCell>
                    <TableCell><Stack direction="row" alignItems="center" spacing={1}><FolderIcon fontSize="small" /><span>Proyectos</span></Stack></TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rows || []).map((e) => {
                    const s = e?.solicitud || {};
                    const movsArr = Array.isArray(e?.movimientos) ? e.movimientos : [];
                    const totals = calculateTotals(movsArr);
                    return (
                      <TableRow key={s._id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTipoIcon(s.tipo)}
                            <Typography variant="body2" fontWeight={600}>{s.tipo}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{s.subtipo}</TableCell>
                        <TableCell>
                          {s.tipo === 'INGRESO' ? (() => {
                            const ei = getEstadoChip(s.estado);
                            return <Chip icon={ei.icon} label={ei.label} size="small" color={ei.color} variant="filled" />;
                          })() : <Typography variant="caption" color="text.secondary">—</Typography>}
                        </TableCell>
                        <TableCell>{fmt(s.fecha)}</TableCell>
                        <TableCell>{fmt(s.updatedAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            <Chip label={totals.totalItems} size="small" variant="outlined" color={totals.totalItems > 0 ? 'primary' : 'default'} />
                            {totals.sinConciliar > 0 && (
                              <Tooltip title={`${totals.sinConciliar} de ${totals.totalItems} sin conciliar`}>
                                <Chip
                                  label={`${totals.sinConciliar} sin conc.`}
                                  size="small" variant="filled"
                                  color="error"
                                  sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexWrap="wrap" gap={0.5} maxWidth={200}>
                            {(() => {
                              const pu = [...new Set(movsArr.map((mv) => mv.proyecto_nombre || 'Sin asignar').filter(Boolean))];
                              if (pu.length === 0) return <Chip label="Sin asignar" size="small" variant="outlined" color="default" />;
                              return pu.slice(0, 3).map((p, i) => (
                                <Chip key={i} label={p} size="small" variant="outlined" color="primary"
                                  sx={{ maxWidth: 120, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                                />
                              )).concat(pu.length > 3
                                ? [<Chip key="more" label={`+${pu.length - 3}`} size="small" variant="filled" color="secondary" />]
                                : []);
                            })()}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {(s.documentos?.length > 0 || s.url_doc) && (
                            <Tooltip title={`${s.documentos?.length || 1} documento(s) adjunto(s)`}>
                              <IconButton size="small" color="info" onClick={(ev) => {
                                ev.stopPropagation();
                                let url = s.documentos?.[0] || s.url_doc;
                                if (url) {
                                  if (url.includes('drive.google.com') && url.includes('/d/')) {
                                    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                                    if (match) url = `https://drive.google.com/file/d/${match[1]}/preview`;
                                  }
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }
                              }}>
                                <AttachFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {s.tipo === 'INGRESO' && ['PENDIENTE', 'PARCIALMENTE_ENTREGADO'].includes(s.estado) && (
                            <Tooltip title="Confirmar Ingreso">
                              <IconButton size="small" color="success" onClick={(ev) => { ev.stopPropagation(); handleAbrirConfirmarIngreso(e); }}>
                                <LocalShippingIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {s.estado === 'PENDIENTE_CONFIRMACION' && (
                            <Tooltip title="Confirmar recepción (validación de movimientos)">
                              <IconButton size="small" color="warning" onClick={async (ev) => {
                                ev.stopPropagation();
                                try {
                                  await StockConfigService.confirmarSolicitud(s._id);
                                  setSnackbar({ open: true, message: 'Solicitud confirmada correctamente', severity: 'success' });
                                  // Recargar datos
                                  setPage(0);
                                } catch (err) {
                                  setSnackbar({ open: true, message: err?.response?.data?.error?.message || 'Error al confirmar', severity: 'error' });
                                }
                              }}>
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Editar">
                            <IconButton onClick={() => openEdit(e)} size="small"><EditIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton onClick={(ev) => { ev.stopPropagation(); handleEliminarSolicitud(s._id); }} size="small" color="error">
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
                            {chips.length > 0 ? 'No se encontraron tickets con estos filtros' : 'No hay tickets registrados'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {chips.length > 0 ? 'Probá ajustar los criterios de búsqueda' : '¡Creá tu primer ticket!'}
                          </Typography>
                          {chips.length === 0 && (
                            <Stack direction="row" spacing={1}>
                              <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreateWithMode('ingreso', 'INGRESO')} size="small">
                                Registrar Ingreso
                              </Button>
                              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openCreateWithMode('egreso', 'EGRESO')} size="small">
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
                component="div" count={total} page={page}
                onPageChange={(_e, p) => setPage(p)}
                rowsPerPage={rpp}
                onRowsPerPageChange={(e) => { setRpp(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Paper>
          </Stack>
        </Container>
      </Box>

      {/* ─── Snackbar ─── */}
      <Snackbar
        open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar((p) => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ─── Dialogs ─── */}
      <SolicitudFormDialog
        open={openModal}
        onClose={() => { setOpenModal(false); resetModal(); }}
        onGuardar={guardarSolicitud}
        editMode={editMode}
        modalMode={modalMode}
        form={form}
        patchForm={patchForm}
        movs={movs}
        setMovs={setMovs}
        patchMov={patchMov}
        handleQuitarMov={handleQuitarMov}
        proyectos={proyectos}
        transProyectoEgreso={transProyectoEgreso}
        setTransProyectoEgreso={setTransProyectoEgreso}
        transProyectoIngreso={transProyectoIngreso}
        setTransProyectoIngreso={setTransProyectoIngreso}
        user={user}
        stockConfig={stockConfig}
      />

      <EntregaParcialDialog
        open={openEntregaDialog}
        onClose={() => { setOpenEntregaDialog(false); setEntregaMovimiento(null); setCantidadAEntregar(0); }}
        movimiento={entregaMovimiento}
        cantidadAEntregar={cantidadAEntregar}
        onCantidadChange={setCantidadAEntregar}
        onConfirmar={handleConfirmarEntrega}
        loading={entregaLoading}
      />

      <ConfirmarIngresoDialog
        open={openConfirmarIngreso}
        onClose={() => { setOpenConfirmarIngreso(false); setConfirmarIngresoSolicitud(null); }}
        solicitudData={confirmarIngresoSolicitud}
        onConfirmar={handleConfirmarIngreso}
        loading={confirmarIngresoLoading}
      />

      <AjusteStockDialog
        open={openAjusteModal}
        onClose={() => setOpenAjusteModal(false)}
        onGuardar={handleGuardarAjuste}
        proyectos={proyectos}
        user={user}
        loading={ajusteLoading}
      />

      <IngresoDesdeFactura
        open={openIngresoFactura}
        onClose={() => setOpenIngresoFactura(false)}
        onSuccess={() => { setSnackbar({ open: true, message: 'Ingreso desde factura creado exitosamente', severity: 'success' }); fetchAll(); }}
        user={user}
        proyectos={proyectos}
      />

      <EgresoDesdeRemito
        open={openEgresoRemito}
        onClose={() => setOpenEgresoRemito(false)}
        onSuccess={() => { setSnackbar({ open: true, message: 'Egreso desde remito creado exitosamente', severity: 'success' }); fetchAll(); }}
        user={user}
        proyectos={proyectos}
      />
    </>
  );
}

StockSolicitudes.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
