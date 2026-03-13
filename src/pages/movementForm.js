// pages/movementForm/index.jsx
import Head from 'next/head';
import {
  Box, Container, Typography, Button, CircularProgress, Snackbar, Alert,
  Grid, Paper, Stack, Chip, Divider, TextField, MenuItem,
  Tooltip, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { dateToTimestamp, formatCurrency, formatTimestamp } from 'src/utils/formatters';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import ReceiptIcon from '@mui/icons-material/Receipt';
import MovementFields from 'src/components/movementFields';
import profileService from 'src/services/profileService';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Tabs, Tab } from '@mui/material';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import MaterialesFacturaActions from 'src/components/stock/MaterialesFacturaActions';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ProrrateoDialog from 'src/components/ProrrateoDialog';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import EgresoConCajaPagadoraDialog from 'src/components/EgresoConCajaPagadoraDialog';
import PagoEntreCajasInfo from 'src/components/PagoEntreCajasInfo';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LanguageIcon from '@mui/icons-material/Language';
import SyncIcon from '@mui/icons-material/Sync';
import MovimientoLogsPanel from 'src/components/movimientos/MovimientoLogsPanel';

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
  const { user, signOut } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const router = useRouter();
  const { movimientoId, proyectoId, proyectoName, lastPageUrl, lastPageName, showStockPopup } = router.query;
  const isEditMode = Boolean(movimientoId);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [movimiento, setMovimiento] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [comprobante_info, setComprobanteInfo] = useState([]);
  const [ingreso_info, setIngresoInfo] = useState({});
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [isReemplazandoImagen, setIsReemplazandoImagen] = useState(false);
  const [tagsExtra, setTagsExtra] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [loadingError, setLoadingError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [openTransferencia, setOpenTransferencia] = useState(false);
  const [openEgresoConCajaPagadora, setOpenEgresoConCajaPagadora] = useState(false);
  const [accionesMenuAnchor, setAccionesMenuAnchor] = useState(null);
  const [mediosPago, setMediosPago] = useState(['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque']);
  const [urlTemporal, setUrlTemporal] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [viewerHeightVh, setViewerHeightVh] = useState(70);
  const [isWide, setIsWide] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);

  // Setear breadcrumbs
  useEffect(() => {
    const titulo = isEditMode ? `Editar (${movimiento?.codigo_operacion || ''})` : 'Nuevo Movimiento';
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: proyectoName || 'Proyecto', href: proyectoId ? `/cajaProyecto?proyectoId=${proyectoId}` : '/proyectos', icon: <FolderIcon fontSize="small" /> },
      { label: titulo, icon: <ReceiptIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [isEditMode, movimiento?.codigo_operacion, proyectoId, proyectoName, setBreadcrumbs]);
  const [tab, setTab] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  // arriba con otros useState
  const [obrasEmpresa, setObrasEmpresa] = useState([]);
  const [obrasOptions, setObrasOptions] = useState([]);
  const [clientesOptions, setClientesOptions] = useState([]);

  const [proyectos, setProyectos] = useState([]);
  
  // Prorrateo
  const [prorrateoOpen, setProrrateoOpen] = useState(false);
  const [stockPopupOpen, setStockPopupOpen] = useState(false);

  const savePayload = async (payload) => {
    try {
      const nombreUsuario =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || null;
      const result = isEditMode
        ? await movimientosService.updateMovimiento(movimientoId, { ...movimiento, ...payload }, nombreUsuario)
        : await movimientosService.addMovimiento({ ...payload, user_phone: user.phone });

      // Determinar si debe abrir el popup de stock después de crear
      const shouldShowStockPopup = !isEditMode
        && payload.categoria === 'Materiales'
        && empresa?.stock_config?.caja_a_stock === true;

      const newMovId = result?.id || result?.data?.movimiento?.id;

      if (newMovId && !isEditMode) {
        const extraQuery = shouldShowStockPopup ? { showStockPopup: 'true' } : {};
        router.replace({ pathname: router.pathname, query: { ...router.query, movimientoId: newMovId, ...extraQuery } });
      }

      if (result.error) throw new Error('Error al agregar o editar el movimiento');

      if (isEditMode) {
        const updatedMovimiento = await movimientosService.getMovimientoById(movimientoId);
        if (updatedMovimiento) {
          setMovimiento(updatedMovimiento);
        }
      }

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

  // Función para cargar todos los datos iniciales
  const loadInitialData = async (attempt = 1) => {
    const maxRetries = 3;
    
    try {
      setLoadingError(null);
      setIsRetrying(attempt > 1);

      // Verificar conexión antes de intentar
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Sin conexión a internet');
      }

      // Verificar que el usuario tenga datos válidos antes de continuar
      if (!user || !user.id) {
        const userError = new Error('Sesión inválida: datos de usuario incompletos');
        userError.code = 'sorby/invalid-user';
        userError.details = { userId: user?.id, userPhone: user?.phone, userEmail: user?.email };
        throw userError;
      }
      
      const empresa = await getEmpresaDetailsFromUser(user);
      if (!empresa) {
        const empresaError = new Error('No se pudo obtener la información de la empresa');
        empresaError.code = 'sorby/no-empresa';
        empresaError.details = { userId: user?.id };
        throw empresaError;
      }
      
      setEmpresa(empresa);
      const proyectosData = await getProyectosByEmpresa(empresa);
      setProyectos(proyectosData);
      const cates = [...empresa.categorias, { name: 'Ingreso dinero', subcategorias: [] }, { name: 'Ajuste', subcategorias: ['Ajuste'] }];
      const provs = [...empresa.proveedores, 'Ajuste'];
      setComprobanteInfo(empresa.comprobante_info || []);
      setIngresoInfo(empresa.ingreso_info || {});
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
        if (!data) {
          throw new Error('No se pudo cargar el movimiento solicitado');
        }
        
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        if (data.fecha_pago) data.fecha_pago = formatTimestamp(data.fecha_pago);
        setMovimiento(data);
        
        // Cargar perfil del creador (no crítico si falla)
        try {
          const created_user = await profileService.getProfileByPhone(data.user_phone);
          setCreatedUser(created_user);
        } catch (profileErr) {
          console.warn('No se pudo cargar el perfil del creador:', profileErr);
          setCreatedUser(null);
        }
        
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
          obra: data.obra || '',
          cliente: data.cliente || '',
          factura_cliente: typeof data.factura_cliente === 'boolean' ? data.factura_cliente : false,
          dolar_referencia_manual: data.dolar_referencia_manual ?? false
        });
      }
      
      // Éxito: resetear contador de reintentos
      setRetryCount(0);
      setLoadingError(null);
      setIsInitialLoading(false);
      setIsRetrying(false);
      
    } catch (error) {
      // Logging detallado para diagnosticar errores
      console.error(`❌ [MovementForm] Error cargando datos (intento ${attempt}/${maxRetries}):`, {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
        user: { id: user?.id, phone: user?.phone, email: user?.email }
      });
      
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const isNetworkError = error.message?.includes('network') || error.message?.includes('conexión') || error.message?.includes('internet') || isOffline;
      
      // Detectar errores de usuario/sesión corrupta
      const isUserError = 
        error.code === 'sorby/invalid-user' || 
        error.code === 'sorby/no-empresa' ||
        error.code === 'sorby/deleted-user' ||
        error.message?.includes('usuario') ||
        error.message?.includes('perfil') ||
        error.message?.includes('undefined') ||
        error.message?.includes('null');

      // Si es error de usuario, no reintentar - ir directo a mostrar opción de re-login
      if (isUserError) {
        console.warn('⚠️ [MovementForm] Error de sesión/usuario detectado, requiere re-login');
        setLoadingError(error);
        setAlert({ 
          open: true, 
          message: 'Tu sesión tiene un problema. Por favor, cerrá sesión y volvé a ingresar.', 
          severity: 'warning' 
        });
        setIsInitialLoading(false);
        setIsRetrying(false);
        return;
      }

      // Si no hemos alcanzado el máximo de reintentos, seguimos intentando (útil para microcortes)
      if (attempt < maxRetries && !isUserError) {
        const nextAttempt = attempt + 1;
        setRetryCount(nextAttempt);
        
        // Backoff exponencial: 2s, 3s, 4.5s...
        const delay = 2000 * Math.pow(1.5, attempt - 1);
        
        console.log(`Reintentando en ${delay}ms... (intento ${nextAttempt}/${maxRetries})`);
        setTimeout(() => {
          loadInitialData(nextAttempt);
        }, delay);
        
        return; // No mostrar error aún, seguimos intentando
      }
      
      // Máximo de reintentos alcanzado
      setLoadingError(error);
      setAlert({ 
        open: true, 
        message: isNetworkError 
          ? `Problema de conexión. Verificá tu internet. (${error.message})` 
          : `Error al cargar datos: ${error.message || 'Error desconocido'}`, 
        severity: 'error' 
      });
      setIsInitialLoading(false);
      setIsRetrying(false);
    }
  };

  // Función para reintentar manualmente
  const handleRetry = () => {
    setIsInitialLoading(true);
    setRetryCount(0);
    loadInitialData(1);
  };

  const handleUploadImage = async () => {
    if (!nuevoArchivo) return;
    setIsReemplazandoImagen(true);
    try {
      if (isEditMode && movimiento?.url_imagen) {
        const res = await movimientosService.reemplazarImagen(movimientoId, nuevoArchivo);
        // El backend devuelve { message, data: { url: ... } }
        const nuevaUrl = res?.data?.url || res?.url || movimiento.url_imagen;
        const separator = nuevaUrl.includes('?') ? '&' : '?';
        setMovimiento(m => ({ ...m, url_imagen: `${nuevaUrl}${separator}t=${Date.now()}` }));
      } else {
        const res = await movimientosService.subirImagenTemporal(nuevoArchivo);
        const nuevaUrl = res?.url_imagen || res?.url;
        const separator = nuevaUrl.includes('?') ? '&' : '?';
        const urlFinal = `${nuevaUrl}${separator}t=${Date.now()}`;
        setMovimiento(m => ({ ...m, url_imagen: urlFinal }));
        setUrlTemporal(urlFinal);
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
      empresa_facturacion: '',
      fecha_pago: '',
      dolar_referencia: '',
      dolar_referencia_manual: false,
      subtotal_dolar: 0,
      total_dolar: 0,
      // <<< opcional: guardar "etapa" de la compra (string)
      etapa: '',
      obra: '',
      cliente: '',
      factura_cliente: false
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
        cliente: values.cliente || '',   // <-- NUEVO
        factura_cliente: values.factura_cliente === true
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


  useEffect(() => {
    loadInitialData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimientoId]);

  // Abrir popup de stock automáticamente si viene showStockPopup=true y no fue procesado
  useEffect(() => {
    if (showStockPopup === 'true' && movimiento && !movimiento.stock_procesado && !movimiento.solicitud_stock_id && !movimiento.acopio_id) {
      setStockPopupOpen(true);
    }
  }, [showStockPopup, movimiento]);
  
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

  const handleCloseStockPopup = () => {
    setStockPopupOpen(false);
    // Limpiar query param showStockPopup
    const { showStockPopup: _, ...restQuery } = router.query;
    router.replace({ pathname: router.pathname, query: restQuery }, undefined, { shallow: true });
  };

  const handleStockComplete = (result) => {
    if (result.solicitud_stock_id) {
      setMovimiento(prev => ({ ...prev, solicitud_stock_id: result.solicitud_stock_id }));
    } else if (result.acopio_id) {
      setMovimiento(prev => ({ ...prev, acopio_id: result.acopio_id }));
    }
    setAlert({ open: true, message: 'Materiales procesados correctamente', severity: 'success' });
    handleCloseStockPopup();
  };

  const handleStockDismiss = async () => {
    // Marcar como procesado para no volver a preguntar
    try {
      await movimientosService.updateMovimiento(movimientoId, { ...movimiento, stock_procesado: true });
      setMovimiento(prev => ({ ...prev, stock_procesado: true }));
    } catch (err) {
      console.error('Error al marcar stock_procesado:', err);
    }
    handleCloseStockPopup();
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

  // Tab Materiales removido — materiales se gestionan vía MaterialesFacturaActions (Dialog post-egreso)
  // Tab Auditoría es siempre index 3 (Info=0, Importes=1, Imagen=2, Auditoría=3)

  return (
    <>
      <Head><title>{titulo}</title></Head>

      <Container maxWidth="xl" sx={{ pt: 0, pb: 6 }}>
        {/* CABECERA */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5" sx={{ mb: 0.5 }}>{titulo}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                {proyectoName && <Chip size="small" label={`${proyectoName}`} />}
                {formik.values?.fecha_factura && <Chip size="small" label={`${formik.values.fecha_factura}`} />}
                {formik.values.type && <Chip size="small" color={formik.values?.type === 'ingreso' ? 'success' : 'error'} label={`${formik.values.type.toUpperCase()}`} />}
                {formik.values.caja_chica && <Chip size="small" color="info" label='Caja chica'/>}
                {isEditMode && movimiento?.origen && (
                  <Tooltip title={`Origen: ${movimiento.origen}`}>
                    <Chip 
                      size="small" 
                      variant="outlined"
                      color={movimiento.origen === 'whatsapp' ? 'success' : movimiento.origen === 'web' ? 'info' : 'default'}
                      icon={
                        movimiento.origen === 'whatsapp' ? <WhatsAppIcon fontSize="small" /> :
                        movimiento.origen === 'web' ? <LanguageIcon fontSize="small" /> :
                        movimiento.origen?.includes('sync') || movimiento.id_sincronizacion ? <SyncIcon fontSize="small" /> :
                        null
                      }
                      label={movimiento.origen === 'whatsapp' ? 'WhatsApp' : movimiento.origen === 'web' ? 'Web' : movimiento.origen}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Tooltip>
                )}
                {isEditMode && movimiento?.id_sincronizacion && !movimiento?.origen?.includes('sync') && (
                  <Tooltip title={`Sincronizado: ${movimiento.id_sincronizacion}`}>
                    <Chip 
                      size="small" 
                      variant="outlined"
                      color="secondary"
                      icon={<SyncIcon fontSize="small" />}
                      label="Sync"
                    />
                  </Tooltip>
                )}
                {isRetrying && (
                  <Chip 
                    size="small" 
                    color="warning" 
                    label="Reintentando conexión..." 
                    icon={<CircularProgress size={12} />}
                  />
                )}
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
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh" spacing={2}>
            <CircularProgress />
            {isRetrying && retryCount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Reintentando... (intento {retryCount}/3)
              </Typography>
            )}
            {!isRetrying && retryCount === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Cargando datos...
              </Typography>
            )}
          </Box>
        ) : loadingError ? (
          <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh" spacing={2}>
            <Alert 
              severity={loadingError.code?.startsWith('sorby/') ? 'warning' : 'error'} 
              sx={{ mb: 2, maxWidth: 600 }}
            >
              <Typography variant="h6" gutterBottom>
                {loadingError.code?.startsWith('sorby/') 
                  ? 'Problema con tu sesión' 
                  : 'Error al cargar los datos'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {loadingError.code?.startsWith('sorby/') 
                  ? 'Tu sesión parece estar desactualizada o incompleta. Por favor, cerrá sesión y volvé a ingresar.'
                  : (loadingError.message || 'Ha ocurrido un error inesperado')}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => router.push(lastPageUrl || '/')}
                >
                  Volver
                </Button>
                {loadingError.code?.startsWith('sorby/') ? (
                  <Button 
                    variant="contained" 
                    color="warning"
                    onClick={() => {
                      signOut();
                      router.push('/auth/login');
                    }}
                  >
                    Cerrar sesión
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleRetry}
                    startIcon={isInitialLoading ? <CircularProgress size={16} /> : null}
                    disabled={isInitialLoading}
                  >
                    {isInitialLoading ? 'Reintentando...' : 'Reintentar'}
                  </Button>
                )}
              </Stack>
            </Alert>
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
                  <Tab label="Auditoria" />
                </Tabs>

                {tab === 0 && (
                  <Box sx={{ p: 0 }}>
                    <form onSubmit={formik.handleSubmit}>
                      <MovementFields
                        group="general"
                        formik={formik}
                        comprobante_info={comprobante_info}
                        ingreso_info={ingreso_info}
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
                        ingreso_info={ingreso_info}
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
                          <Box 
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', height: `${viewerHeightVh}vh` }} 
                            onDoubleClick={() => setFullOpen(true)}
                          >
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

                {tab === 3 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Auditoria de cambios</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <MovimientoLogsPanel logs={movimiento?.logs || []} />
                  </Box>
                )}
              </Paper>



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

                      // Defaults para resumen (mismos que en configuracionGeneral)
                      const comprobanteDefaults = {
                        categoria: true, observacion: true, proveedor: true, proyecto: true,
                        subcategoria: false, total_original: false, medio_pago: false,
                        tipo_factura: false, tags_extra: false, caja_chica: false,
                        impuestos: false, numero_factura: false, subtotal: false,
                        cuenta_interna: false, etapa: false, empresa_facturacion: false,
                        fecha_pago: false, obra: false, cliente: false, factura_cliente: false,
                        dolar_referencia: false,
                      };
                      const ingresoDefaults = {
                        observacion: true, medio_pago: false, categoria: false,
                        subcategoria: false, tags_extra: false, dolar_referencia: false,
                      };
                      const tipoMov = V.type || 'egreso';
                      const rawInfo = tipoMov === 'ingreso' ? ingreso_info : comprobante_info;
                      const defaults = tipoMov === 'ingreso' ? ingresoDefaults : comprobanteDefaults;
                      const camposCfg = { ...defaults, ...(rawInfo || {}) };

                      // configKey: clave en comprobante_info/ingreso_info. null = siempre visible.
                      const summaryConfig = [
                        { key: '__creator',     label: 'Creador',         configKey: null, render: () => (<Typography variant="body2">{creatorLabel}</Typography>) },
                        { key: '__created_at',  label: 'Fecha de creación', configKey: null, render: () => (<Typography variant="body2">{createdAtStr || '—'}</Typography>) },
                        { key: 'nombre_proveedor', label: 'Proveedor', configKey: 'proveedor' },
                        { key: 'fecha_factura',    label: 'Fecha', configKey: null },
                        { key: 'type',             label: 'Tipo', configKey: null, format: (v) => (v ? v.toUpperCase() : '-') },
                        { key: 'categoria',        label: 'Categoría', configKey: 'categoria' },
                        { key: 'subcategoria',     label: 'Subcategoría', configKey: 'subcategoria' },
                        { key: 'numero_factura',   label: 'N° Factura', configKey: 'numero_factura' },
                        { key: 'tipo_factura',     label: 'Tipo de Factura', configKey: 'tipo_factura' },
                        { key: 'medio_pago',       label: 'Medio de Pago', configKey: 'medio_pago' },
                        { key: 'empresa_facturacion', label: 'Empresa de facturación', configKey: 'empresa_facturacion' },
                        { key: 'factura_cliente', label: 'Factura de cliente', configKey: 'factura_cliente', format: yesNo },
                        { key: 'fecha_pago',          label: 'Fecha de pago', configKey: 'fecha_pago' },
                        { key: 'moneda',           label: 'Moneda', configKey: null },
                        { key: 'subtotal',         label: 'Subtotal', configKey: 'subtotal', format: (v)=>formatCurrency(v,2) },
                        { key: 'total_original',   label: 'Total Original', configKey: 'total_original', format: (v)=>formatCurrency(v,2) },
                        { key: 'total',            label: 'Total', configKey: null, format: (v)=>formatCurrency(v,2) },
                        { key: 'estado',           label: 'Estado', configKey: null,
                          render: () => (
                            <Chip size="small" color={V.estado === 'Pagado' ? 'success' : 'warning'} label={V.estado || 'Pendiente'} sx={{ ml: 0.5 }} />
                          )
                        },
                        { key: 'caja_chica',       label: 'Caja Chica', configKey: 'caja_chica', format: yesNo },
                        { key: 'cuenta_interna',   label: 'Cuenta Interna', configKey: 'cuenta_interna' },
                        { key: 'etapa',            label: 'Etapa', configKey: 'etapa' },
                        { key: 'obra',    label: 'Obra', configKey: 'obra' },
                        { key: 'cliente', label: 'Cliente', configKey: 'cliente' },
                        { key: 'tags_extra',       label: 'Tags', configKey: 'tags_extra',
                          render: () =>
                            Array.isArray(V.tags_extra) && V.tags_extra.length > 0 ? (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {V.tags_extra.map((t) => (<Chip key={t} size="small" label={t} variant="outlined" />))}
                              </Stack>
                            ) : null
                        },
                      ];

                      const rows = summaryConfig
                        // Filtrar por configuración: si tiene configKey, solo mostrar si está habilitado
                        .filter(({ configKey }) => configKey === null || configKey === undefined || camposCfg[configKey])
                        .filter(({ key, render }) => render || (V[key] !== undefined && String(V[key]).trim() !== ''))
                        .map(({ key, label, format, render }) => (
                          <Stack key={key} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>{label}:</Typography>
                            {render ? render() : (<Typography variant="body2">{format ? format(V[key]) : V[key]}</Typography>)}
                          </Stack>
                        ));

                      const impuestosRow = camposCfg.impuestos ? (
                        <Stack key="__impuestos" spacing={0.5}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 130 }}>Impuestos:</Typography>
                            <Typography variant="body2">
                              {impuestos.length > 0 ? `${impuestos.length} ítem(s) • ${formatCurrency(impuestosTotal, 2)}` : '—'}
                            </Typography>
                          </Stack>
                        </Stack>
                      ) : null;

                      const stockRefId = movimiento?.acopio_id || movimiento?.solicitud_stock_id;
                      const stockRefTipo = movimiento?.acopio_id ? 'acopio' : (movimiento?.solicitud_stock_id ? 'solicitud' : null);
                      const showStockSection = isEditMode && formik.values.categoria === 'Materiales' && empresa?.stock_config?.caja_a_stock === true;

                      const materialesList = showStockSection && (
                        <Stack key="__materiales_stock" spacing={1} sx={{ mt: 1 }}>
                          <Divider />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>📦 Stock:</Typography>
                          {stockRefId ? (
                            <Stack spacing={0.5} sx={{ pl: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 16 }} />
                                <Typography variant="body2" color="success.dark">
                                  {stockRefTipo === 'acopio' ? 'Acopio creado' : 'Solicitud de stock creada'}
                                </Typography>
                              </Stack>
                              <Button
                                size="small"
                                variant="text"
                                href={stockRefTipo === 'acopio'
                                  ? `/movimientosAcopio?acopioId=${stockRefId}`
                                  : `/stockSolicitudes?solicitudId=${stockRefId}`}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none', pl: 0 }}
                              >
                                {stockRefTipo === 'acopio' ? 'Ver acopio →' : 'Ver solicitud →'}
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                color="warning"
                                onClick={() => setStockPopupOpen(true)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none', pl: 0 }}
                              >
                                Reprocesar materiales
                              </Button>
                            </Stack>
                          ) : (
                            <Stack spacing={0.5} sx={{ pl: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {movimiento?.stock_procesado
                                  ? 'Se eligió no procesar. Podés procesarlos cuando quieras.'
                                  : 'Materiales pendientes de procesar.'}
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setStockPopupOpen(true)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                              >
                                Procesar materiales
                              </Button>
                            </Stack>
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

        {/* Diálogo de Stock — Destino de materiales */}
        {empresa?.stock_config?.caja_a_stock === true && isEditMode && movimientoId && (
          <MaterialesFacturaActions
            open={stockPopupOpen}
            onClose={handleCloseStockPopup}
            empresaId={empresa?.id}
            empresaNombre={empresa?.nombre}
            movimientoId={movimientoId}
            movimiento={movimiento}
            stockConfig={empresa?.stock_config || {}}
            proyectos={proyectos}
            proveedores={proveedores}
            nombreProveedor={formik.values.nombre_proveedor || ''}
            onComplete={handleStockComplete}
            onDismiss={handleStockDismiss}
            onError={(msg) => setAlert({ open: true, message: msg, severity: 'error' })}
          />
        )}

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert severity={alert.severity}>{alert.message}</Alert>
        </Snackbar>
      </Container>
    </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormPage;
