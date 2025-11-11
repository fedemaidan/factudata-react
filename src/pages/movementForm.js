// pages/movementForm/index.jsx
import Head from 'next/head';
import {
  Box, Container, Typography, Button, CircularProgress, Snackbar, Alert,
  Grid, Paper, Stack, Chip, Divider, TextField, MenuItem, Select,
  FormControl, InputLabel, Tooltip, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { dateToTimestamp, formatCurrency, formatTimestamp } from 'src/utils/formatters';
import MovementFields from 'src/components/movementFields';
import profileService from 'src/services/profileService';
import MaterialesEditor from 'src/components/materiales/MaterialesEditor';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Tabs, Tab } from '@mui/material';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import AssignToPlanDialog from 'src/components/planobra/AssignToPlanDialog';
import MovimientoMaterialService from 'src/services/movimientoMaterialService';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ProrrateoDialog from 'src/components/ProrrateoDialog';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import EgresoConCajaPagadoraDialog from 'src/components/EgresoConCajaPagadoraDialog';
import PagoEntreCajasInfo from 'src/components/PagoEntreCajasInfo';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallSplitIcon from '@mui/icons-material/CallSplit';

// Componente para mostrar información de prorrateo
const ProrrateoInfo = ({ movimiento, onVerRelacionados }) => {
  const [movimientosRelacionados, setMovimientosRelacionados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarMovimientosRelacionados = async () => {
      if (!movimiento?.prorrateo_grupo_id) return;
      
      setLoading(true);
      try {
        const movimientos = await movimientosService.getMovimientosByGrupoProrrateo(movimiento.prorrateo_grupo_id);
        // Filtrar el movimiento actual
        const otros = movimientos.filter(m => m.id !== movimiento.id);
        setMovimientosRelacionados(otros);
      } catch (error) {
        console.error('Error cargando movimientos relacionados:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarMovimientosRelacionados();
  }, [movimiento?.prorrateo_grupo_id, movimiento?.id]);

  const formatCurrencyLocal = (amount, currency = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Paper sx={{ p: 4, mt: 3, backgroundColor: '#e3f2fd', border: '2px solid #1976d2' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Chip 
          label="🔄 MOVIMIENTO PRORRATEADO" 
          color="primary" 
          variant="filled" 
          sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
        />
      </Box>

      <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 2 }}>
        📊 Distribución del Gasto
      </Typography>
      
      <Box sx={{ mb: 3, bgcolor: 'white', p: 2, borderRadius: 1, border: '1px solid #bbdefb' }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
          💰 Este proyecto: {formatCurrencyLocal(movimiento.total, movimiento.moneda)} 
          {movimiento.prorrateo_porcentaje && ` (${movimiento.prorrateo_porcentaje}%)`}
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Cargando distribución completa...
            </Typography>
          </Box>
        )}
        
        {!loading && movimientosRelacionados.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Otros proyectos:
            </Typography>
            {movimientosRelacionados.map((mov, index) => (
              <Typography key={mov.id} variant="body2" color="text.secondary" sx={{ ml: 2, mb: 0.5 }}>
                • <strong>{mov.proyecto}:</strong> {formatCurrencyLocal(mov.total, mov.moneda)}
                {mov.prorrateo_porcentaje && ` (${mov.prorrateo_porcentaje}%)`}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      {movimientosRelacionados.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="medium"
            onClick={onVerRelacionados}
            sx={{ alignSelf: 'flex-start' }}
          >
            Ver todos los movimientos ({movimientosRelacionados.length + 1})
          </Button>
          
          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
            💸 Total distribuido: {formatCurrencyLocal(
              Number(movimiento.total) + movimientosRelacionados.reduce((sum, m) => sum + Number(m.total), 0),
              movimiento.moneda
            )}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const MovementFormPage = () => {
  const { user } = useAuthContext();
  const router = useRouter();
  const { movimientoId, proyectoId, proyectoName, lastPageUrl, lastPageName } = router.query;
  const isEditMode = Boolean(movimientoId);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [comprobante_info, setComprobanteInfo] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [isReemplazandoImagen, setIsReemplazandoImagen] = useState(false);
  const [tagsExtra, setTagsExtra] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openTransferencia, setOpenTransferencia] = useState(false);
  const [openEgresoConCajaPagadora, setOpenEgresoConCajaPagadora] = useState(false);
  const [accionesMenuAnchor, setAccionesMenuAnchor] = useState(null);
  const [mediosPago, setMediosPago] = useState(['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque']);
  const [urlTemporal, setUrlTemporal] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [viewerHeightVh, setViewerHeightVh] = useState(70);
  const [isWide, setIsWide] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  // arriba con otros useState
  const [obrasEmpresa, setObrasEmpresa] = useState([]);
  const [obrasOptions, setObrasOptions] = useState([]);
  const [clientesOptions, setClientesOptions] = useState([]);

  // MM (movimientos de materiales) visibles en la sección inferior
  const [mmRows, setMmRows] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRow, setAssignRow] = useState(null);
  const [assignPresetCantidad, setAssignPresetCantidad] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  // Alta rápida MM
  const [mmQuick, setMmQuick] = useState({ descripcion: '', cantidad: '', tipo: 'entrada' });
  
  // Prorrateo
  const [prorrateoOpen, setProrrateoOpen] = useState(false);

  // Flags y utilidades para sincronizar Materiales <-> MM
  const SYNC_DEBOUNCE_MS = 500;
  const syncTimer = useRef(null);
  const syncingRef = useRef(false);

  const savePayload = async (payload) => {
    try {
      const result = isEditMode
        ? await movimientosService.updateMovimiento(movimientoId, { ...movimiento, ...payload })
        : await movimientosService.addMovimiento({ ...payload, user_phone: user.phone });

      if (result?.id && !isEditMode) {
        // si recién se crea, redirigimos al mismo form con el id para habilitar asignaciones
        router.replace({ pathname: router.pathname, query: { ...router.query, movimientoId: result.id } });
      }

      if (result?.data?.movimiento?.id) {
        // si recién se crea, redirigimos al mismo form con el id para habilitar asignaciones
        router.replace({ pathname: router.pathname, query: { ...router.query, movimientoId: result?.data?.movimiento?.id } });
      }

      if (result.error) throw new Error('Error al agregar o editar el movimiento');
      setAlert({ open: true, message: 'Movimiento guardado con éxito!', severity: 'success' });
    } catch (err) {
      setAlert({ open: true, message: err.message, severity: 'error' });
    } finally {
      setIsLoading(false);
      setConfirmOpen(false);
      setPendingPayload(null);
    }
  };

  const increaseHeight = () => setViewerHeightVh(h => Math.min(95, h + 10));
  const decreaseHeight = () => setViewerHeightVh(h => Math.max(40, h - 10));
  const toggleWide = () => setIsWide(w => !w);
  const handleCloseAlert = () => setAlert({ ...alert, open: false });
  const hasComprobante = Boolean(movimiento?.url_imagen || urlTemporal);

  const handleUploadImage = async () => {
    if (!nuevoArchivo) return;
    setIsReemplazandoImagen(true);
    try {
      if (isEditMode && movimiento?.url_imagen) {
        await movimientosService.reemplazarImagen(movimientoId, nuevoArchivo);
        setMovimiento(m => ({ ...m, url_imagen: (m?.url_imagen || '') + `?${Date.now()}` }));
      } else {
        const res = await movimientosService.subirImagenTemporal(nuevoArchivo);
        setMovimiento(m => ({ ...m, url_imagen: (res.url_imagen || '') + `?${Date.now()}` }));
        setUrlTemporal(res.url_imagen);
      }
      setAlert({ open: true, message: 'Imagen cargada con éxito!', severity: 'success' });
    } catch (e) {
      setAlert({ open: true, message: 'Error al cargar imagen.', severity: 'error' });
    } finally {
      setIsReemplazandoImagen(false);
    }
  };

  const handleExtraerDatos = async () => {
    const urlImagen = isEditMode ? movimiento?.url_imagen : urlTemporal;
    if (!urlImagen || !empresa) return;
    setIsExtractingData(true);
    try {
      const result = await movimientosService.extraerDatosDesdeImagen(
        urlImagen,
        nuevoArchivo,
        {
          proveedores,
          categorias,
          medios_pago: empresa.medios_pago?.length ? empresa.medios_pago : mediosPago,
          medio_pago_default: 'Efectivo',
          proyecto_id: proyectoId,
          proyecto_nombre: proyectoName
        }
      );
      formik.setValues({ ...formik.values, ...result });
      setAlert({ open: true, message: 'Datos extraídos con éxito!', severity: 'success' });
    } catch {
      setAlert({ open: true, message: 'No se pudieron extraer los datos.', severity: 'warning' });
    } finally {
      setIsExtractingData(false);
    }
  };

  const creatorLabel =
  createdUser?.firstName ? createdUser?.firstName + " " +  createdUser?.lastName :
  createdUser?.alias ||
  createdUser?.email ||
  createdUser?.phone ||
  movimiento?.user_phone ||
  '-';

const createdAtStr = (() => {
  if (!movimiento?.fecha_creacion) return '';
  try {
    return formatTimestamp(movimiento?.fecha_creacion); // ya lo estás importando arriba
  } catch {
    return typeof movimiento?.fecha_creacion === 'string' ? t : new Date(movimiento?.fecha_creacion).toLocaleString();
  }
})();


  const formik = useFormik({
    initialValues: {
      fecha_factura: '',
      type: 'egreso',
      total: '',
      subtotal: '',
      total_original: '',
      moneda: 'ARS',
      nombre_proveedor: '',
      categoria: '',
      subcategoria: '',
      estado: 'Pendiente',
      url_imagen: null,
      tags_extra: [],
      caja_chica: false,
      medio_pago: '',
      observacion: '',
      impuestos: [],
      materiales: [],
      empresa_facturacion: '',
      fecha_pago: '',
      dolar_referencia: '',
      subtotal_dolar: 0,
      total_dolar: 0,
      // <<< opcional: guardar "etapa" de la compra (string)
      etapa: '',
      obra: '',
      cliente: ''
    },
    validationSchema: Yup.object({}),
    validate: () => ({}),
    onSubmit: async (values) => {
      setIsLoading(true);
      const payload = {
        ...values,
        fecha_factura: dateToTimestamp(values.fecha_factura),
        fecha_pago: values.fecha_pago ? dateToTimestamp(values.fecha_pago) : null,
        proyecto: proyectoName,
        proyecto_id: proyectoId,
        tags_extra: values.tags_extra || [],
        url_imagen: movimiento?.url_imagen ?? values.url_imagen,
        impuestos: values.impuestos || [],
        obra: values.obra || '',         // <-- NUEVO
        cliente: values.cliente || ''    // <-- NUEVO
      };

      const subtotal  = Number(values.subtotal) || 0;
      const impTotal  = (values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
      const total     = Number(values.total) || 0;
      const diff = Math.abs((subtotal + impTotal) - total);

      if (diff > 0.01) {
        setPendingPayload(payload);
        setConfirmOpen(true);
        setIsLoading(false);
        return;
      }
      await savePayload(payload);
    }
  });

  // --- Carga inicial
  const fetchMmList = async () => {
    if (!movimientoId) return;
    try {
      const mmList = await MovimientoMaterialService.listarPorCompra(movimientoId, { limit: 500 });
      setMmRows(mmList.items || []);
    } catch {
      setMmRows([]);
    }
  };

  useEffect(() => {
    (async () => {
      const empresa = await getEmpresaDetailsFromUser(user);
      setEmpresa(empresa);
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
      const cates = [...empresa.categorias, { name: 'Ingreso dinero', subcategorias: [] }, { name: 'Ajuste', subcategorias: ['Ajuste'] }];
      const provs = [...empresa.proveedores, 'Ajuste'];
      setComprobanteInfo(empresa.comprobante_info || []);
      setCategorias(cates);
      setProveedores(provs);
      setTagsExtra(empresa.tags_extra || []);
      setMediosPago(empresa.medios_pago?.length ? empresa.medios_pago : mediosPago);

      const obras = Array.isArray(empresa.obras) ? empresa.obras : [];
      setObrasEmpresa(obras);
      setObrasOptions(obras.map(o => o.nombre).filter(Boolean));
      setClientesOptions([...new Set(obras.map(o => o.cliente).filter(Boolean))]);

      if (isEditMode) {
        const data = await movimientosService.getMovimientoById(movimientoId);
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        if (data.fecha_pago) data.fecha_pago = formatTimestamp(data.fecha_pago);
        setMovimiento(data);
        const created_user = await profileService.getProfileByPhone(data.user_phone);
        setCreatedUser(created_user);
        formik.setValues({
          ...formik.values,
          ...data,
          fecha_factura: data.fecha_factura,
          fecha_pago: data.fecha_pago || '',
          tags_extra: data.tags_extra || [],
          caja_chica: data.caja_chica ?? false,
          impuestos: data.impuestos || [],
          materiales: data.materiales || [],
          etapa: data.etapa || '',
          obra: data.obra || '',         // <-- NUEVO
          cliente: data.cliente || ''    // <-- NUEVO
        });
        await fetchMmList();
      }
      setIsInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoId]);
  
  useEffect(() => {
    if (!formik.values.obra) return;
    const o = obrasEmpresa.find(x => x.nombre === formik.values.obra);
    if (o?.cliente && formik.values.cliente !== o.cliente) {
      formik.setFieldValue('cliente', o.cliente);
    }
  }, [formik.values.obra, obrasEmpresa]); 
  
  // Selección de categoría
  useEffect(() => {
    const cat = categorias.find(c => c.name === formik.values.categoria);
    setCategoriaSeleccionada(cat);
  }, [formik.values.categoria, categorias]);

  const titulo = isEditMode ? `Editar Movimiento (${movimiento?.codigo_operacion || '-'})` : 'Agregar Movimiento';

  // === 1) Sincronizar “Materiales” (del formulario) con MM (tabla de abajo)
  //     - Sólo para tipo 'entrada' y atados a este movimiento_compra_id
  //     - Crear/actualizar/borrar MM según cambios en Materiales
  const reconcileMmFromMateriales = async () => {
    if (!isEditMode || !empresa?.id) return;
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const materiales = Array.isArray(formik.values.materiales) ? formik.values.materiales : [];

      // Index por descripcion normalizada
      const norm = (s) => (s || '').trim().toLowerCase();
      const wanted = new Map(); // key -> {descripcion, cantidad}
      materiales.forEach(m => {
        const key = norm(m.descripcion);
        if (!key) return;
        const cantidad = Number(m.cantidad) || 0;
        if (cantidad <= 0) return;
        wanted.set(key, { descripcion: m.descripcion, cantidad });
      });

      // MM actuales (solo entradas)
      const current = (mmRows || []).filter(x => x.tipo === 'entrada');

      // Crear/Actualizar
      for (const [key, target] of wanted.entries()) {
        const found = current.find(x => norm(x.descripcion) === key);
        if (!found) {
          // crear
          await MovimientoMaterialService.crear({
            empresa_id: empresa.id,
            proyecto_id: proyectoId || '',
            descripcion: target.descripcion,
            cantidad: target.cantidad,
            tipo: 'entrada',
            movimiento_compra_id: movimientoId
          });
        } else {
          // actualizar cantidad si cambió
          const qtyNow = Number(found.cantidad) || 0;
          if (Math.abs(qtyNow - Number(target.cantidad)) > 1e-9) {
            await MovimientoMaterialService.actualizar(found.id, { cantidad: Number(target.cantidad) });
          }
        }
      }

      // Borrar MM que ya no están en “Materiales”
      for (const mm of current) {
        const key = norm(mm.descripcion);
        if (!wanted.has(key)) {
          await MovimientoMaterialService.eliminar(mm.id);
        }
      }

      // refrescar lista
      await fetchMmList();
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'No se pudo sincronizar materiales', severity: 'error' });
    } finally {
      syncingRef.current = false;
    }
  };

  // --- SYNC: materiales <-> movimientos de materiales (sin duplicar) ---
function syncMaterialesWithMovs(currentMateriales = [], mmRows = [], { proyecto_id } = {}) {
  // Mapear por clave estable (mm_id) y, como fallback, por descripcion normalizada
  const norm = (s) => (s || '').trim().toLowerCase();
  const byId = new Map();
  const byDesc = new Map();

  (currentMateriales || []).forEach((m, idx) => {
    if (m.mm_id) byId.set(String(m.mm_id), { m, idx });
    else byDesc.set(norm(m.descripcion), { m, idx }); // sólo si no tiene mm_id
  });

  const next = [...(currentMateriales || [])];

  mmRows.forEach((mm) => {
    const key = String(mm.id);
    const desc = norm(mm.descripcion);
    const matchById = byId.get(key);
    const matchByDesc = byDesc.get(desc);

    if (matchById) {
      // Ya existe: actualizo descripción (por si cambió) y NO duplico
      const i = matchById.idx;
      next[i] = {
        ...next[i],
        descripcion: mm.descripcion ?? next[i].descripcion,
        // NO piso cantidad si el usuario ya la ajustó; si querés forzar, descomentá:
        // cantidad: next[i].cantidad ?? Number(mm.cantidad) || 0,
        proyecto_id: next[i].proyecto_id ?? proyecto_id
      };
    } else if (matchByDesc) {
      // Existía sólo por descripción ⇒ enlazo al movimiento (seteo mm_id)
      const i = matchByDesc.idx;
      next[i] = {
        ...next[i],
        mm_id: key,
        descripcion: mm.descripcion ?? next[i].descripcion,
        proyecto_id: next[i].proyecto_id ?? proyecto_id
      };
      // Además lo registro por id para no re-enlazar:
      byId.set(key, { m: next[i], idx: i });
    } else {
      // No existía ⇒ lo agrego 1 vez
      next.push({
        mm_id: key,
        descripcion: mm.descripcion || '',
        cantidad: Number(mm.cantidad) || 0,
        valorUnitario: 0,
        validado: true,
        proyecto_id
      });
    }
     const mmIds = new Set(mmRows.map(r => String(r.id)));
  const filtered = next.filter(m => !m.mm_id || mmIds.has(String(m.mm_id)));
  return filtered;
  });

  // (Opcional) remover materiales huérfanos que tenían mm_id pero ya no están en la lista:
  // const mmIds = new Set(mmRows.map(r => String(r.id)));
  // const filtered = next.filter(m => !m.mm_id || mmIds.has(String(m.mm_id)));
  // return filtered;

  return next;
}

  // Disparar reconcile con debounce cuando cambian los “Materiales”
  useEffect(() => {
    if (!isEditMode) return;
    if (!Array.isArray(mmRows) || mmRows.length === 0) return;
  
    // Evita loops: sólo sincroniza si realmente hay algo distinto
    const current = formik.values.materiales || [];
    const next = syncMaterialesWithMovs(current, mmRows, { proyecto_id: proyectoId });
  
    // Chequeo barato para no hacer set si no cambió
    const sameLen = next.length === current.length;
    const sameJson = sameLen && JSON.stringify(next) === JSON.stringify(current);
    if (!sameJson) {
      formik.setFieldValue('materiales', next, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(mmRows.map(r => r.id))]); 
  
  // Alta rápida de un MM manual (igual seguirá sincronizado si coinciden descripciones)
  const crearMmRapido = async () => {
    if (!empresa?.id || !movimientoId) return;
    if (!mmQuick.descripcion || !mmQuick.cantidad) {
      setAlert({ open: true, message: 'Completá descripción y cantidad', severity: 'warning' });
      return;
    }
    try {
      await MovimientoMaterialService.crear({
        empresa_id: empresa.id,
        proyecto_id: proyectoId || '',
        descripcion: mmQuick.descripcion,
        cantidad: Number(mmQuick.cantidad),
        tipo: mmQuick.tipo || 'entrada',
        movimiento_compra_id: movimientoId
      });
      setMmQuick({ descripcion: '', cantidad: '', tipo: 'entrada' });
      await fetchMmList();
      setAlert({ open: true, message: 'Movimiento de material creado', severity: 'success' });
    } catch (e) {
      setAlert({ open: true, message: e?.message || 'No se pudo crear el movimiento de material', severity: 'error' });
    }
  };

  // Abrir diálogo de asignación con presets:
  //   - proyecto → proyectoId de la compra
  //   - etapa → formik.values.etapa (texto) (el diálogo intentará matchear por nombre)
  //   - movimiento fijo → este mm (forceMovimientoId)
  const abrirAsignacion = (mm, presetCantidad = null) => {
    setAssignRow(mm);
    setAssignPresetCantidad(presetCantidad);
    setAssignOpen(true);
  };

  const pendienteDe = (mm) => Math.max(0, (Number(mm.cantidad) || 0) - (Number(mm.asignado_qty) || 0));

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
  };

  const handleOpenEgresoConCajaPagadora = () => {
    console.log('Debug - Estado para pago entre cajas:', {
      proyectoId,
      total: formik.values.total,
      type: formik.values.type,
      proyectosLength: proyectos.length,
      isEditMode
    });
    setOpenEgresoConCajaPagadora(true);
  };

  const handleCloseEgresoConCajaPagadora = () => {
    setOpenEgresoConCajaPagadora(false);
  };

  const handleEgresoConCajaPagadoraSuccess = (result) => {
    setAlert({
      open: true,
      message: 'Egreso con caja pagadora creado con éxito',
      severity: 'success',
    });
    // Opcional: redirigir o refrescar datos
    setTimeout(() => {
      router.push(lastPageUrl || `/cajaProyecto?proyectoId=${proyectoId}`);
    }, 1500);
  };

  const handleAccionesMenuOpen = (event) => {
    setAccionesMenuAnchor(event.currentTarget);
  };

  const handleAccionesMenuClose = () => {
    setAccionesMenuAnchor(null);
  };

  const handleAccionesMenuItemClick = (action) => {
    handleAccionesMenuClose();
    switch (action) {
      case 'transferencia':
        handleOpenTransferencia();
        break;
      case 'pagoOtraCaja':
        handleOpenEgresoConCajaPagadora();
        break;
      case 'prorrateo':
        setProrrateoOpen(true);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <Head><title>{titulo}</title></Head>

      <Container maxWidth="xl" sx={{ pt: 0, pb: 6 }}>
        {/* CABECERA */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5 }}>{titulo}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {proyectoName && <Chip size="small" label={`${proyectoName}`} />}
                {formik.values?.fecha_factura && <Chip size="small" label={`${formik.values.fecha_factura}`} />}
                {formik.values.type && <Chip size="small" color={formik.values?.type === 'ingreso' ? 'success' : 'error'} label={`${formik.values.type.toUpperCase()}`} />}
                {formik.values.caja_chica && <Chip size="small" color="info" label='Caja chica'/>}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {/* Acciones principales */}
              <Button
                variant="outlined"
                color="secondary"
                startIcon={isExtractingData ? <CircularProgress size={16} /> : <DocumentScannerIcon />}
                onClick={handleExtraerDatos}
                disabled={isExtractingData || !hasComprobante}
              >
                {isExtractingData ? 'Extrayendo...' : 'Extraer datos'}
              </Button>

              {/* Menú de acciones avanzadas */}
              <Button
                variant="outlined"
                color="primary"
                startIcon={<MoreVertIcon />}
                onClick={handleAccionesMenuOpen}
                disabled={isLoading}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Acciones
              </Button>

              <Menu
                anchorEl={accionesMenuAnchor}
                open={Boolean(accionesMenuAnchor)}
                onClose={handleAccionesMenuClose}
                PaperProps={{
                  sx: { minWidth: 200 }
                }}
              >
                <MenuItem 
                  onClick={() => handleAccionesMenuItemClick('transferencia')}
                  disabled={!proyectoId}
                >
                  <ListItemIcon>
                    <SwapHorizIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Transferencia interna" />
                </MenuItem>

                {!isEditMode && (
                  <MenuItem 
                    onClick={() => handleAccionesMenuItemClick('pagoOtraCaja')}
                    disabled={!proyectoId || !formik.values.total || proyectos.length <= 1 || formik.values.type !== 'egreso'}
                  >
                    <ListItemIcon>
                      <AccountBalanceWalletIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Pagar desde otra caja" 
                      secondary={
                        !proyectoId ? "Falta proyecto" :
                        !formik.values.total ? "Falta total" :
                        proyectos.length <= 1 ? "Faltan proyectos" :
                        formik.values.type !== 'egreso' ? "Solo para egresos" : null
                      }
                    />
                  </MenuItem>
                )}

                {!isEditMode && proyectos.length >= 1 && (
                  <MenuItem 
                    onClick={() => handleAccionesMenuItemClick('prorrateo')}
                    disabled={isLoading || !formik.values.total}
                  >
                    <ListItemIcon>
                      <CallSplitIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Prorratear por Proyectos"
                      secondary={!formik.values.total ? "Falta total" : null}
                    />
                  </MenuItem>
                )}
              </Menu>
              
              {/* Acciones principales de navegación */}
              <Button variant="outlined" onClick={() => router.push(lastPageUrl || '/')}>
                Volver sin guardar
              </Button>
              <Button variant="contained" onClick={formik.submitForm} disabled={isLoading}>
                {isLoading ? <CircularProgress size={22} /> : (isEditMode ? 'Guardar' : 'Crear')}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {isInitialLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* COLUMNA IZQUIERDA */}
            <Grid item xs={12} md={isWide ? 9 : 7}>
              <Paper sx={{ p: 0, mb: 2 }}>
                {/* Header + Tabs */}
                <Box sx={{ px: 2, pt: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">Edición de movimiento</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={toggleWide}>{isWide ? 'Vista normal' : 'Vista ancha'}</Button>
                      <Button size="small" variant="contained" onClick={formik.submitForm} disabled={isLoading}>
                        {isLoading ? <CircularProgress size={18} /> : (isEditMode ? 'Guardar' : 'Crear')}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Tab label="Info general" />
                  <Tab label="Importes e impuestos" />
                  <Tab label="Imagen de la factura" />
                  {formik.values.categoria === 'Materiales' && <Tab label="Materiales" />}
                </Tabs>

                {tab === 0 && (
                  <Box sx={{ p: 0 }}>
                    <form onSubmit={formik.handleSubmit}>
                      <MovementFields
                        group="general"
                        formik={formik}
                        comprobante_info={comprobante_info}
                        empresa={empresa}
                        etapas={empresa?.etapas || []}
                        proveedores={proveedores}
                        categorias={categorias}
                        categoriaSeleccionada={categoriaSeleccionada}
                        tagsExtra={tagsExtra}
                        mediosPago={mediosPago}
                        isEditMode={isEditMode}
                        isLoading={isLoading}
                        router={router}
                        lastPageUrl={lastPageUrl}
                        lastPageName={lastPageName}
                        movimiento={movimiento}
                        obrasOptions={obrasOptions}
                        clientesOptions={clientesOptions}
                      />
                    </form>
                  </Box>
                )}

                {tab === 1 && (
                  <Box sx={{ p: 0 }}>
                    <form onSubmit={formik.handleSubmit}>
                      <MovementFields
                        group="montos"
                        formik={formik}
                        comprobante_info={comprobante_info}
                        empresa={empresa}
                        etapas={empresa?.etapas || []}
                        proveedores={proveedores}
                        categorias={categorias}
                        categoriaSeleccionada={categoriaSeleccionada}
                        tagsExtra={tagsExtra}
                        mediosPago={mediosPago}
                        isEditMode={isEditMode}
                        isLoading={isLoading}
                        router={router}
                        lastPageUrl={lastPageUrl}
                        lastPageName={lastPageName}
                        movimiento={movimiento}
                      />
                    </form>
                  </Box>
                )}

                {tab === 2 && (
                  <Box sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">Comprobante</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" startIcon={<RemoveIcon />} onClick={decreaseHeight}>Alto</Button>
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={increaseHeight}>Alto</Button>
                        <Button size="small" variant="contained" startIcon={<OpenInFullIcon />} onClick={() => setFullOpen(true)} disabled={!movimiento?.url_imagen && !urlTemporal}>Full</Button>
                        <Button variant="outlined" size="small" onClick={handleExtraerDatos} disabled={isExtractingData || (!movimiento?.url_imagen && !urlTemporal)}>
                          {isExtractingData ? <CircularProgress size={18} /> : 'Extraer datos'}
                        </Button>
                      </Stack>
                    </Stack>

                    <input accept="image/*,application/pdf" type="file" onChange={(e) => setNuevoArchivo(e.target.files[0])} />
                    <Button variant="contained" onClick={handleUploadImage} disabled={!nuevoArchivo || isReemplazandoImagen} sx={{ mt: 2 }}>
                      {isReemplazandoImagen ? <CircularProgress size={22} /> : 'Subir comprobante'}
                    </Button>

                    {(movimiento?.url_imagen || urlTemporal) && (
                      <Box mt={2}>
                        {String(movimiento?.url_imagen || urlTemporal).includes('.pdf') ? (
                          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: `${viewerHeightVh}vh` }} onDoubleClick={() => setFullOpen(true)}>
                            <embed src={movimiento?.url_imagen || urlTemporal} width="100%" height="100%"/>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              width: '100%', height: `${viewerHeightVh}vh`, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                              backgroundImage: `url('${movimiento?.url_imagen || urlTemporal}')`,
                              backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', cursor: 'zoom-in'
                            }}
                            onDoubleClick={() => setFullOpen(true)}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                )}

                {formik.values.categoria === 'Materiales' && tab === 3 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Materiales</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <MaterialesEditor
                      items={formik.values.materiales || []}
                      proyecto_id={proyectoId}
                      onChange={(next) => formik.setFieldValue('materiales', next)}
                    />
                  </Box>
                )}
              </Paper>

              {/* ===== Movimientos de materiales + Asignación ===== */}
              <Paper sx={{ p: 2, mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6">
                    Movimientos de materiales (de esta compra)
                  </Typography>
                  {isEditMode && (
                    <Button size="small" variant="outlined" onClick={fetchMmList}>Refrescar</Button>
                  )}
                </Stack>

                {!isEditMode ? (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Guardá el movimiento para habilitar la creación y asignación de <b>movimientos de materiales</b>.
                  </Alert>
                ) : (
                  <>
                    {/* Alta rápida */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} alignItems="center">
                      <TextField
                        label="Descripción"
                        value={mmQuick.descripcion}
                        onChange={(e) => setMmQuick(q => ({ ...q, descripcion: e.target.value }))}
                        fullWidth
                      />
                      <TextField
                        label="Cantidad"
                        type="number"
                        value={mmQuick.cantidad}
                        onChange={(e) => setMmQuick(q => ({ ...q, cantidad: e.target.value }))}
                        sx={{ minWidth: 160 }}
                      />
                      <FormControl sx={{ minWidth: 160 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          label="Tipo"
                          value={mmQuick.tipo}
                          onChange={(e) => setMmQuick(q => ({ ...q, tipo: e.target.value }))}
                        >
                          <MenuItem value="entrada">Entrada</MenuItem>
                          <MenuItem value="salida">Salida</MenuItem>
                        </Select>
                      </FormControl>
                      <Button variant="contained" onClick={crearMmRapido}>Agregar</Button>
                    </Stack>

                    {mmRows.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        No se registraron movimientos de materiales para este comprobante.
                      </Typography>
                    ) : (
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {mmRows.map((mm) => {
                          const pend = pendienteDe(mm);
                          const estado = mm.tipo === 'salida'
                            ? '—'
                            : (mm.asignado_estado || (mm.asignado_qty > 0 ? 'parcial' : 'ninguno'));
                          const estadoChip =
                            mm.tipo === 'salida'
                              ? { label: '—', color: 'default' }
                              : estado === 'completo'
                              ? { label: 'Completo', color: 'success' }
                              : estado === 'parcial'
                              ? { label: 'Parcial', color: 'warning' }
                              : { label: 'No asignado', color: 'default' };

                          return (
                            <Paper key={mm.id} sx={{ p: 1.25 }}>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                                <Typography sx={{ flex: 1 }}>
                                  <b>{mm.descripcion}</b> — {mm.tipo} — Cant: {mm.cantidad}
                                </Typography>

                                {mm.tipo === 'entrada' && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip size="small" label={estadoChip.label} color={estadoChip.color} />
                                    <Typography variant="body2">
                                      {(Number(mm.asignado_qty) || 0)} / {(Number(mm.cantidad) || 0)}
                                    </Typography>
                                  </Stack>
                                )}

                                <Stack direction="row" spacing={1}>
                                  <Button size="small" variant="outlined" onClick={() => abrirAsignacion(mm, null)}>
                                    Asignar
                                  </Button>
                                  {mm.tipo === 'entrada' && pend > 0 && (
                                    <Tooltip title={`Asignar todo: ${pend}`}>
                                      <span>
                                        <Button size="small" variant="contained" onClick={() => abrirAsignacion(mm, pend)}>
                                          Asignar todo
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </>
                )}
              </Paper>

              {/* Diálogo de Asignación con presets/forzado */}
              <AssignToPlanDialog
  open={assignOpen}
  onClose={async (result) => {
    setAssignOpen(false);
    setAssignRow(null);
    if (result?.ok) {
      setAlert({ open: true, message: 'Asignación creada', severity: 'success' });
      await fetchMmList();
    } else if (result && result.error) {
      setAlert({ open: true, message: result.error, severity: 'error' });
    }
  }}
  movimiento={assignRow}
  empresaId={empresa?.id}
  proyectos={proyectos}
  presetProyectoId={assignRow?.proyecto_id}
/>

            </Grid>

            {/* COLUMNA DERECHA */}
            <Grid item xs={12} md={isWide ? 3 : 5}>
              <Stack spacing={2} sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Resumen</Typography>
                  <Stack spacing={1}>
                    {(() => {
                      const V = formik.values || {};
                      const impuestos = Array.isArray(V.impuestos) ? V.impuestos : [];
                      const impuestosTotal = impuestos.reduce((a, i) => a + (Number(i.monto) || 0), 0);
                      const yesNo = (b) => (b ? 'Sí' : 'No');

                      const summaryConfig = [
                        { key: '__creator',     label: 'Creador',         render: () => (<Typography variant="body2">{creatorLabel}</Typography>) },
                        { key: '__created_at',  label: 'Fecha de creación', render: () => (<Typography variant="body2">{createdAtStr || '—'}</Typography>) },
                        { key: 'nombre_proveedor', label: 'Proveedor' },
                        { key: 'fecha_factura',    label: 'Fecha' },
                        { key: 'type',             label: 'Tipo', format: (v) => (v ? v.toUpperCase() : '-') },
                        { key: 'categoria',        label: 'Categoría' },
                        { key: 'subcategoria',     label: 'Subcategoría' },
                        { key: 'numero_factura',   label: 'N° Factura' },
                        { key: 'tipo_factura',     label: 'Tipo de Factura' },
                        { key: 'medio_pago',       label: 'Medio de Pago' },
                        { key: 'empresa_facturacion', label: 'Empresa de facturación' },
                        { key: 'fecha_pago',          label: 'Fecha de pago' },
                        { key: 'moneda',           label: 'Moneda' },
                        { key: 'subtotal',         label: 'Subtotal', format: (v)=>formatCurrency(v,2) },
                        { key: 'total_original',   label: 'Total Original', format: (v)=>formatCurrency(v,2) },
                        { key: 'total',            label: 'Total', format: (v)=>formatCurrency(v,2) },
                        { key: 'estado',           label: 'Estado',
                          render: () => (
                            <Chip size="small" color={V.estado === 'Pagado' ? 'success' : 'warning'} label={V.estado || 'Pendiente'} sx={{ ml: 0.5 }} />
                          )
                        },
                        { key: 'caja_chica',       label: 'Caja Chica', format: yesNo },
                        { key: 'cuenta_interna',   label: 'Cuenta Interna' },
                        { key: 'etapa',            label: 'Etapa' },
                        { key: 'obra',    label: 'Obra' },
                        { key: 'cliente', label: 'Cliente' },
                        { key: 'tags_extra',       label: 'Tags',
                          render: () =>
                            Array.isArray(V.tags_extra) && V.tags_extra.length > 0 ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {V.tags_extra.map((t) => (<Chip key={t} size="small" label={t} variant="outlined" />))}
                              </Stack>
                            ) : null
                        },
                      ];

                      const rows = summaryConfig
                        .filter(({ key, render }) => render || (V[key] !== undefined && String(V[key]).trim() !== ''))
                        .map(({ key, label, format, render }) => (
                          <Stack key={key} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>{label}:</Typography>
                            {render ? render() : (<Typography variant="body2">{format ? format(V[key]) : V[key]}</Typography>)}
                          </Stack>
                        ));

                      const impuestosRow = (
                        <Stack key="__impuestos" spacing={0.5}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>Impuestos:</Typography>
                            <Typography variant="body2">
                              {impuestos.length > 0 ? `${impuestos.length} ítem(s) • ${formatCurrency(impuestosTotal, 2)}` : '—'}
                            </Typography>
                          </Stack>
                        </Stack>
                      );

                      const materialesList = (formik.values.categoria === 'Materiales') && (
                        <Stack key="__materiales" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>Materiales:</Typography>
                          {(formik.values.materiales || []).length > 0 ? (
                            <Box sx={{ pl: 2 }}>
                              {formik.values.materiales.map((m, idx) => (
                                <Typography key={idx} variant="body2">• {m.descripcion || '—'}  {m.cantidad || 0} {m.valorUnitario || ''}</Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ pl: 2 }}>Sin materiales</Typography>
                          )}
                        </Stack>
                      );

                      return (
                        <>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>Proyecto:</Typography>
                            <Typography variant="body2">{proyectoName || '-'}</Typography>
                          </Stack>
                          {rows}
                          {impuestosRow}
                          {materialesList}
                        </>
                      );
                    })()}
                  </Stack>
                </Paper>

                {/* Información de Prorrateo */}
                {isEditMode && movimiento?.es_movimiento_prorrateo && (
                  <ProrrateoInfo 
                    movimiento={movimiento}
                    onVerRelacionados={() => {
                      router.push(`/movimientos-prorrateo?grupoId=${movimiento.prorrateo_grupo_id}`);
                    }}
                  />
                )}

                {/* Información de Pago Entre Cajas */}
                {isEditMode && movimiento?.es_pago_entre_cajas && (
                  <PagoEntreCajasInfo 
                    movimiento={movimiento}
                  />
                )}

                {/* HISTORIAL / ACCIONES secundarias… (sin cambios) */}
                {/* ... */}
              </Stack>
            </Grid>
          </Grid>
        )}

        {/* Fullscreen comprobante */}
        <Dialog fullScreen open={fullOpen} onClose={() => setFullOpen(false)} PaperProps={{ sx: { bgcolor: 'black' } }}>
          <Box sx={{ position: 'fixed', top: 8, right: 8, zIndex: 10 }}>
            <IconButton onClick={() => setFullOpen(false)} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
              <CloseIcon sx={{ color: 'white' }} />
            </IconButton>
          </Box>
          {(movimiento?.url_imagen || urlTemporal) && (
            <Box sx={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1, md: 3 } }}>
              {String(movimiento?.url_imagen || urlTemporal).includes('.pdf') ? (
                <embed src={movimiento?.url_imagen || urlTemporal} width="100%" height="100%" style={{ border: 0 }} />
              ) : (
                <img src={movimiento?.url_imagen || urlTemporal} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              )}
            </Box>
          )}
        </Dialog>

        {/* Confirm totales */}
        <Dialog open={confirmOpen} onClose={() => { setConfirmOpen(false); setPendingPayload(null); }}>
          <DialogTitle>¿Guardar con totales diferentes?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Detectamos que <b>Subtotal + Impuestos</b> no coincide con <b>Total</b>.
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">Subtotal: {formatCurrency(Number(formik.values.subtotal)||0, 2)}</Typography>
              <Typography variant="body2">
                Impuestos: {formatCurrency((formik.values.impuestos||[]).reduce((a, i)=>a+(Number(i.monto)||0),0), 2)}
              </Typography>
              <Typography variant="body2">Total: {formatCurrency(Number(formik.values.total)||0, 2)}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">
                Diferencia: {formatCurrency(Math.abs(((Number(formik.values.subtotal)||0) + (formik.values.impuestos||[]).reduce((a,i)=>a+(Number(i.monto)||0),0)) - (Number(formik.values.total)||0)), 2)}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ mt: 2 }}>
              ¿Querés guardar de todos modos?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConfirmOpen(false); setPendingPayload(null); }} variant="outlined">
              Revisar
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!pendingPayload) return;
                setIsLoading(true);
                await savePayload(pendingPayload);
              }}
            >
              Guardar igual
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo de Prorrateo */}
        <ProrrateoDialog 
          open={prorrateoOpen}
          onClose={(success) => {
            setProrrateoOpen(false);
            if (success) {
              setAlert({
                open: true,
                message: 'Movimientos prorrateo creados con éxito',
                severity: 'success'
              });
              // Redirigir a la lista o mostrar éxito
              setTimeout(() => {
                router.push(lastPageUrl || `/cajaProyecto?proyectoId=${proyectoId}`);
              }, 1500);
            }
          }}
          datosBase={{
            ...formik.values,
            proyecto_id: proyectoId,
            proyecto_nombre: proyectoName
          }}
          proyectos={proyectos}
          onSuccess={(data) => {
            console.log('Prorrateo exitoso:', data);
          }}
        />

        {/* Diálogo de Transferencia Interna */}
        <TransferenciaInternaDialog
          open={openTransferencia}
          onClose={handleCloseTransferencia}
          proyectos={proyectos}
          onSuccess={handleTransferenciaSuccess}
          defaultProyectoEmisor={proyectoId && proyectoName ? { id: proyectoId, nombre: proyectoName } : null}
          userPhone={user?.phone}
        />

        {/* Diálogo de Egreso con Caja Pagadora */}
        <EgresoConCajaPagadoraDialog
          open={openEgresoConCajaPagadora}
          onClose={handleCloseEgresoConCajaPagadora}
          datosEgreso={{
            ...formik.values,
            proyecto_id: proyectoId,
            proyecto_nombre: proyectoName,
            user_phone: user?.phone,
            empresa_id: empresa?.id
          }}
          proyectos={proyectos}
          onSuccess={handleEgresoConCajaPagadoraSuccess}
        />

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormPage;
