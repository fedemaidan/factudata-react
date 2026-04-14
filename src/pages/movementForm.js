// pages/movementForm/index.jsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  HomeIcon,
  FolderIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  WalletIcon,
  EllipsisVerticalIcon,
  ChartPieIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  GlobeAltIcon,
  ArrowPathRoundedSquareIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import movimientosService from 'src/services/movimientosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { useAuthContext } from 'src/contexts/auth-context';
import proveedorService from 'src/services/proveedorService';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { dateToTimestamp, formatCurrency, formatTimestamp } from 'src/utils/formatters';
import { buildCompletarPagoUpdateFields, puedeCompletarPagoEgreso } from 'src/utils/movimientoPagoCompleto';
import MovementFields from 'src/components/movementFields';
import {
  DEFINICION_CAMPOS,
  computeNetSubtotalFromTotalImpuestos,
  isSubtotalFieldEnabled,
} from 'src/components/movementFieldsConfig';
import profileService from 'src/services/profileService';
import MaterialesFacturaActions from 'src/components/stock/MaterialesFacturaActions';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import ProrrateoDialog from 'src/components/ProrrateoDialog';
import TransferenciaInternaDialog from 'src/components/TransferenciaInternaDialog';
import EgresoConCajaPagadoraDialog from 'src/components/EgresoConCajaPagadoraDialog';
import PagoEntreCajasInfo from 'src/components/PagoEntreCajasInfo';
import MovimientoLogsPanel from 'src/components/movimientos/MovimientoLogsPanel';
import ComprobanteModal from 'src/components/celulandia/ComprobanteModal';
import ComprobantePdfModal from 'src/components/celulandia/ComprobantePdfModal';

const getTodayLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ensureFechaFactura = (fecha) => fecha || getTodayLocalDate();

const BASE_REQUIRED_FIELDS = ['fecha_factura', 'type', 'moneda', 'total'];
const DEFAULT_EMPRESA_REQUIRED_FIELDS = ['proyecto', 'categoria', 'total'];
const EMPTY_REQUIRED_VALUES = new Set([null, undefined, '', 'No definido', 'No encontrado', 'null']);
const FIELD_LABELS = DEFINICION_CAMPOS.reduce(
  (acc, campo) => ({ ...acc, [campo.name]: campo.label }),
  {
    proyecto: 'Proyecto',
    type: 'Tipo',
    moneda: 'Moneda',
    total: 'Total',
    categoria: 'Categoria',
    observacion: 'Observacion',
    detalle: 'Detalle',
    nombre_proveedor: 'Proveedor',
    fecha_factura: 'Fecha de la Factura',
    factura_cliente: 'Factura de cliente',
  }
);

const isEmptyRequiredValue = (value) => EMPTY_REQUIRED_VALUES.has(value);

const getEmpresaRequiredFields = (empresa) => {
  const configuredFields = Array.isArray(empresa?.camposObligatorios) ? empresa.camposObligatorios.filter(Boolean) : [];
  return configuredFields.length > 0 ? configuredFields : DEFAULT_EMPRESA_REQUIRED_FIELDS;
};

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
    <div className="mt-2 rounded-xl border-2 border-primary-main/40 bg-primary-lightest p-3">
      <div className="mb-2">
        <span className="inline-block rounded-full bg-primary-main px-2 py-0.5 text-xs font-bold text-white">
          MOVIMIENTO PRORRATEADO
        </span>
      </div>
      <h3 className="mb-2 text-sm font-semibold text-primary-dark">Distribución del gasto</h3>
      <div className="mb-2 rounded-lg border border-primary-light bg-white p-2">
        <p className="text-xs font-bold text-primary-dark">
          Este proyecto: {formatCurrencyLocal(movimiento.total, movimiento.moneda)}
          {movimiento.prorrateo_porcentaje && ` (${movimiento.prorrateo_porcentaje}%)`}
        </p>
        {loading && (
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Cargando distribución…
          </p>
        )}
        {!loading && movimientosRelacionados.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-neutral-800">Otros proyectos:</p>
            <ul className="mt-1 list-inside list-disc text-xs text-neutral-600">
              {movimientosRelacionados.map((mov) => (
                <li key={mov.id}>
                  <strong>{mov.proyecto}:</strong> {formatCurrencyLocal(mov.total, mov.moneda)}
                {mov.prorrateo_porcentaje && ` (${mov.prorrateo_porcentaje}%)`}
                </li>
            ))}
            </ul>
          </div>
        )}
      </div>
      {movimientosRelacionados.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onVerRelacionados}
            className="w-fit rounded-lg bg-primary-main px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            Ver todos los movimientos ({movimientosRelacionados.length + 1})
          </button>
          <p className="text-xs font-bold text-success-dark">
            Total distribuido:{' '}
            {formatCurrencyLocal(
              Number(movimiento.total) + movimientosRelacionados.reduce((sum, m) => sum + Number(m.total), 0),
              movimiento.moneda
            )}
          </p>
        </div>
      )}
    </div>
  );
};

const StitchBlock = ({ step, title, children }) => (
  <section className="flex shrink-0 flex-col rounded-xl border border-divider bg-white shadow-sm">
    <div className="flex shrink-0 items-center gap-2 border-b border-divider px-2 py-1">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-main text-[11px] font-bold text-white"
        aria-hidden
      >
        {step}
      </span>
      <h2 className="text-xs font-semibold tracking-tight text-neutral-900">{title}</h2>
    </div>
    <div className="px-2 py-1.5">{children}</div>
  </section>
);

const MovementFormPage = () => {
  const { user, signOut } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const router = useRouter();
  const { movimientoId, proyectoId, proyectoName, lastPageUrl, lastPageName, showStockPopup } = router.query;
  const isEditMode = Boolean(movimientoId);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [modoIngreso, setModoIngreso] = useState(null); // null=pantalla selección, 'manual'
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
  const [accionesOpen, setAccionesOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const accionesRef = useRef(null);
  const [mediosPago, setMediosPago] = useState(['Efectivo', 'Transferencia', 'Tarjeta', 'Mercado Pago', 'Cheque']);
  const [urlTemporal, setUrlTemporal] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const pendingExtraccionRef = useRef(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [imagenModal, setImagenModal] = useState('');
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [parcialMonto, setParcialMonto] = useState('');
  const [completarPagoDialogOpen, setCompletarPagoDialogOpen] = useState(false);
  const [completarPagoLoading, setCompletarPagoLoading] = useState(false);

  // En edit mode, priorizar datos del movimiento sobre query params
  const effectiveProyectoId = (isEditMode && movimiento?.proyecto_id) || proyectoId || null;
  const effectiveProyectoName = (isEditMode && movimiento?.proyecto) || proyectoName || null;

  // Setear breadcrumbs
  useEffect(() => {
    const titulo = isEditMode ? `Editar (${movimiento?.codigo_operacion || ''})` : 'Nuevo Movimiento';
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon className="h-4 w-4" /> },
      { label: effectiveProyectoName || 'Proyecto', href: effectiveProyectoId ? `/cajaProyecto?proyectoId=${effectiveProyectoId}` : '/proyectos', icon: <FolderIcon className="h-4 w-4" /> },
      { label: titulo, icon: <DocumentTextIcon className="h-4 w-4" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [isEditMode, movimiento?.codigo_operacion, effectiveProyectoId, effectiveProyectoName, setBreadcrumbs]);
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

  useEffect(() => {
    if (!accionesOpen) return undefined;
    const onDown = (e) => {
      if (accionesRef.current && !accionesRef.current.contains(e.target)) {
        setAccionesOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accionesOpen]);

  const savePayload = async (payload) => {
    try {
      const payloadProyectoId = payload?.proyecto_id ?? formik.values?.proyecto_id ??
        (isEditMode ? movimiento?.proyecto_id : null);
      console.log('savePayload start', {
        isEditMode,
        movimientoProyectoId: movimiento?.proyecto_id,
        payloadProyectoId,
        payloadKeys: Object.keys(payload || {})
      });
      const nombreUsuario =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || null;
      if (isEditMode && nuevoArchivo) {
        const replaceRes = await movimientosService.reemplazarImagen(movimientoId, nuevoArchivo);
        const replaceData = replaceRes?.data ?? replaceRes;
        if (!replaceData?.success || !replaceData?.url) {
          throw new Error('No se pudo reemplazar el comprobante');
        }
        payload.url_imagen = replaceData.url;
        if (replaceData?.googleDriveId) {
          payload.googleDriveId = replaceData.googleDriveId;
        }
        setNuevoArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

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

  const handleCloseAlert = () => setAlert({ ...alert, open: false });
  const handleFileInputClick = (event) => {
    event.target.value = '';
  };
  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setNuevoArchivo(file);
  };
  const hasComprobante = Boolean(movimiento?.url_imagen || urlTemporal || previewUrl);
  const comprobanteSrc = previewUrl || movimiento?.url_imagen || urlTemporal || '';
  const isComprobantePdf = Boolean(comprobanteSrc) && (
    String(comprobanteSrc).toLowerCase().includes('.pdf') ||
    nuevoArchivo?.type === 'application/pdf'
  );

  const handleCloseComprobanteModal = () => {
    setComprobanteModalOpen(false);
    setImagenModal('');
  };
  const handleCloseComprobantePdfModal = () => {
    setPdfModalOpen(false);
  };
  const handleCloseAuditDialog = () => {
    setAuditOpen(false);
  };

  // Vista previa al seleccionar archivo (antes de subir)
  useEffect(() => {
    if (!nuevoArchivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(nuevoArchivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [nuevoArchivo]);

  // Auto-extracción cuando hay extracción pendiente al seleccionar archivo
  useEffect(() => {
    if (!nuevoArchivo || !pendingExtraccionRef.current) return;
    pendingExtraccionRef.current = false;
    if (!isEditMode) {
      // Nuevo movimiento: subir y extraer en paralelo
      (async () => {
        setIsExtractingData(true);
        try {
          const [uploadRes, result] = await Promise.all([
            movimientosService.subirImagenTemporal(nuevoArchivo).catch(() => null),
            movimientosService.extraerDatosDesdeImagen(null, nuevoArchivo, {
              proyecto_id: effectiveProyectoId,
              proyecto_nombre: effectiveProyectoName,
            }),
          ]);
          if (uploadRes) {
            const nuevaUrl = uploadRes?.url_imagen || uploadRes?.url;
            const sep = nuevaUrl.includes('?') ? '&' : '?';
            const urlFinal = `${nuevaUrl}${sep}t=${Date.now()}`;
            setMovimiento(m => ({ ...m, url_imagen: urlFinal }));
            setUrlTemporal(urlFinal);
            formik.setFieldValue('url_imagen', urlFinal);
            setNuevoArchivo(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
          formik.setValues(prev => ({
            ...prev,
            ...result,
            fecha_factura: ensureFechaFactura(result?.fecha_factura || prev.fecha_factura),
          }));
          setAlert({ open: true, message: '¡Datos extraídos con éxito!', severity: 'success' });
        } catch (err) {
          const msg = err?.response?.data?.error || 'No se pudieron extraer los datos.';
          const severity = err?.response?.status === 400 ? 'error' : 'warning';
          setAlert({ open: true, message: msg, severity });
        } finally {
          setIsExtractingData(false);
          setModoIngreso('manual');
        }
      })();
    } else {
      handleExtraerDatos(nuevoArchivo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevoArchivo]);

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
      const provs = await proveedorService.getNombres(empresa.id);
      setComprobanteInfo(empresa.comprobante_info || []);
      setIngresoInfo(empresa.ingreso_info || {});
      setCategorias(cates);
      setProveedores([...provs, 'Ajuste']);
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
        
        const isParcialPagado = data.estado === 'Parcialmente Pagado';
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
          dolar_referencia_manual: data.dolar_referencia_manual ?? false,
          total: data.total,
        });
        if (isParcialPagado) {
          const montoPagado = data.monto_pagado;
          setParcialMonto(montoPagado != null ? String(montoPagado) : '');
        }
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
    if (!nuevoArchivo || isEditMode) return;
    setIsReemplazandoImagen(true);
    try {
      const res = await movimientosService.subirImagenTemporal(nuevoArchivo);
      const nuevaUrl = res?.url_imagen || res?.url;
      const separator = nuevaUrl.includes('?') ? '&' : '?';
      const urlFinal = `${nuevaUrl}${separator}t=${Date.now()}`;
      setMovimiento(m => ({ ...m, url_imagen: urlFinal }));
      setUrlTemporal(urlFinal);
      setNuevoArchivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setAlert({ open: true, message: 'Imagen cargada con éxito!', severity: 'success' });
    } catch (e) {
      setAlert({ open: true, message: 'Error al cargar imagen.', severity: 'error' });
    } finally {
      setIsReemplazandoImagen(false);
    }
  };

  const handleExtraerDatos = async (archivoOverride = null) => {
    // Edit mode sin imagen ni archivo: pedir archivo primero
    if (isEditMode && !movimiento?.url_imagen && !nuevoArchivo && !archivoOverride) {
      pendingExtraccionRef.current = true;
      fileInputRef.current?.click();
      return;
    }
    const archivo = archivoOverride || nuevoArchivo;
    const urlImagen = isEditMode ? movimiento?.url_imagen : urlTemporal;
    if (!urlImagen && !archivo) return;
    if (!empresa) return;
    setIsExtractingData(true);
    try {
      const result = await movimientosService.extraerDatosDesdeImagen(
        urlImagen,
        archivo,
        { proyecto_id: effectiveProyectoId, proyecto_nombre: effectiveProyectoName }
      );
      formik.setValues(prev => ({
        ...prev,
        ...result,
        fecha_factura: ensureFechaFactura(result?.fecha_factura || prev.fecha_factura),
      }));
      setAlert({ open: true, message: 'Datos extraídos con éxito!', severity: 'success' });
    } catch (err) {
      const msg = err?.response?.data?.error || 'No se pudieron extraer los datos.';
      const severity = err?.response?.status === 400 ? 'error' : 'warning';
      setAlert({ open: true, message: msg, severity });
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
    return typeof movimiento?.fecha_creacion === 'string'
      ? movimiento.fecha_creacion
      : new Date(movimiento?.fecha_creacion).toLocaleString();
  }
})();

  const requiredFieldNames = useMemo(
    () => [...new Set([...BASE_REQUIRED_FIELDS, ...getEmpresaRequiredFields(empresa)])],
    [empresa]
  );

  const getValidationLabel = (fieldName) => FIELD_LABELS[fieldName] || fieldName;

  const validateMovementForm = (values) => {
    const errors = {};

    requiredFieldNames.forEach((fieldName) => {
      if (fieldName === 'proyecto') {
        const hasProject = !isEmptyRequiredValue(effectiveProyectoId)
          || !isEmptyRequiredValue(effectiveProyectoName)
          || !isEmptyRequiredValue(values?.proyecto_id)
          || !isEmptyRequiredValue(values?.proyecto_nombre);

        if (!hasProject) {
          errors.proyecto = 'El proyecto es obligatorio';
        }
        return;
      }

      if (isEmptyRequiredValue(values?.[fieldName])) {
        errors[fieldName] = `${getValidationLabel(fieldName)} es obligatorio`;
      }
    });

    return errors;
  };

  const handleSubmitForm = async () => {
    const validationErrors = await formik.validateForm();
    const errorKeys = Object.keys(validationErrors || {});

    if (errorKeys.length > 0) {
      const touchedFields = errorKeys.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(formik.values, key)) {
          acc[key] = true;
        }
        return acc;
      }, {});

      if (Object.keys(touchedFields).length > 0) {
        formik.setTouched({ ...formik.touched, ...touchedFields }, true);
      }

      const labels = errorKeys.map(getValidationLabel);
      setAlert({
        open: true,
        message: `Completá los campos obligatorios: ${labels.join(', ')}`,
        severity: 'error',
      });
      return;
    }

    await formik.submitForm();
  };


  const formik = useFormik({
    initialValues: {
      fecha_factura: getTodayLocalDate(),
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
      detalle: '',
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
    validate: validateMovementForm,
    onSubmit: async (values) => {
      setIsLoading(true);
      const fechaFactura = ensureFechaFactura(values.fecha_factura);
      const payload = {
        ...values,
        fecha_factura: dateToTimestamp(fechaFactura),
        fecha_pago: values.fecha_pago ? dateToTimestamp(values.fecha_pago) : null,
        proyecto: effectiveProyectoName,
        proyecto_id: effectiveProyectoId,
        proyecto_nombre: effectiveProyectoName,
        tags_extra: values.tags_extra || [],
        url_imagen: movimiento?.url_imagen ?? values.url_imagen,
        impuestos: values.impuestos || [],
        obra: values.obra || '',
        cliente: values.cliente || '',
        factura_cliente: values.factura_cliente === true
      };

      // Pago parcial: total = importe completo; monto_pagado = parte abonada (informativo)
      if (values.estado === 'Parcialmente Pagado' && values.type === 'egreso') {
        payload.monto_pagado = Number(parcialMonto) || 0;
      } else if (values.type === 'egreso') {
        payload.monto_pagado = null;
      }

      const tipoMov = values.type || 'egreso';
      const usaSubtotal = isSubtotalFieldEnabled(comprobante_info, ingreso_info, tipoMov);

      if (!usaSubtotal) {
        payload.subtotal = computeNetSubtotalFromTotalImpuestos(values.total, values.impuestos);
        await savePayload(payload);
        return;
      }

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

  // Subtotal oculto en config: mantener neto = total − impuestos para UI (USD, ImpuestosEditor) y coherencia al guardar
  useEffect(() => {
    if (isInitialLoading) return;
    const tipoMov = formik.values.type || 'egreso';
    if (isSubtotalFieldEnabled(comprobante_info, ingreso_info, tipoMov)) return;
    const net = computeNetSubtotalFromTotalImpuestos(formik.values.total, formik.values.impuestos);
    const cur = Number(formik.values.subtotal) || 0;
    if (Math.abs(cur - net) > 0.005) {
      const scrollContainer =
        typeof document !== 'undefined'
          ? document.querySelector('[data-movement-form-scroll="true"]')
          : null;
      const previousScrollTop = scrollContainer?.scrollTop ?? null;
      formik.setFieldValue('subtotal', net, false);
      if (previousScrollTop != null) {
        requestAnimationFrame(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = previousScrollTop;
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sincronizar solo ante total/impuestos/tipo/config
  }, [
    isInitialLoading,
    formik.values.total,
    formik.values.impuestos,
    formik.values.type,
    comprobante_info,
    ingreso_info,
  ]);

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

  useEffect(() => {
    if (formik.values.estado !== 'Parcialmente Pagado' || formik.values.type !== 'egreso') {
      setParcialMonto('');
    }
  }, [formik.values.estado, formik.values.type]);

  const handleParcialMontoChange = (value) => {
    setParcialMonto(value);
  };

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
      proyectoId: effectiveProyectoId,
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
      router.push(lastPageUrl || `/cajaProyecto?proyectoId=${effectiveProyectoId}`);
    }, 1500);
  };

  const handleAccionesMenuItemClick = (action) => {
    setAccionesOpen(false);
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
      case 'auditoria':
        setAuditOpen(true);
        break;
      case 'completarPago':
        setCompletarPagoDialogOpen(true);
        break;
      default:
        break;
    }
  };

  const snapshotCompletarPago = useMemo(
    () => ({
      type: formik.values.type,
      estado: formik.values.estado,
      total: formik.values.total,
      monto_pagado:
        parcialMonto !== ''
          ? Number(parcialMonto)
          : Number(formik.values.monto_pagado ?? movimiento?.monto_pagado) || 0,
      fecha_pago: formik.values.fecha_pago || movimiento?.fecha_pago,
    }),
    [
      formik.values.type,
      formik.values.estado,
      formik.values.total,
      formik.values.monto_pagado,
      formik.values.fecha_pago,
      parcialMonto,
      movimiento?.monto_pagado,
      movimiento?.fecha_pago,
    ]
  );

  const mostrarCompletarPago = isEditMode && puedeCompletarPagoEgreso(snapshotCompletarPago);

  const handleCompletarPagoConfirm = async () => {
    if (!movimientoId || !movimiento) return;
    if (!puedeCompletarPagoEgreso(snapshotCompletarPago)) {
      setCompletarPagoDialogOpen(false);
      return;
    }
    setCompletarPagoLoading(true);
    try {
      const nombreUsuario =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || null;
      const patch = buildCompletarPagoUpdateFields(snapshotCompletarPago);
      const res = await movimientosService.updateMovimiento(
        movimientoId,
        { ...movimiento, ...patch },
        nombreUsuario
      );
      if (res?.error) throw new Error('update failed');
      const updated = await movimientosService.getMovimientoById(movimientoId);
      if (updated) {
        setMovimiento(updated);
        const data = { ...updated };
        data.fecha_factura = formatTimestamp(data.fecha_factura);
        if (data.fecha_pago) data.fecha_pago = formatTimestamp(data.fecha_pago);
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
          dolar_referencia_manual: data.dolar_referencia_manual ?? false,
          total: data.total,
        });
      }
      setParcialMonto('');
      setCompletarPagoDialogOpen(false);
      setAlert({ open: true, message: 'Pago completado correctamente', severity: 'success' });
    } catch {
      setAlert({ open: true, message: 'No se pudo completar el pago', severity: 'error' });
    } finally {
      setCompletarPagoLoading(false);
    }
  };

  const sharedFieldProps = {
    formik,
    comprobante_info,
    ingreso_info,
    empresa,
    etapas: empresa?.etapas || [],
    proveedores,
    categorias,
    categoriaSeleccionada,
    tagsExtra,
    mediosPago,
    isEditMode,
    isLoading,
    router,
    lastPageUrl,
    lastPageName,
    movimiento,
    obrasOptions,
    clientesOptions,
    parcialMonto,
    onParcialMontoChange: handleParcialMontoChange,
    requiredFieldNames,
    hideFooterButtons: true,
  };
  const renderSummaryBody = () => {
                      const V = formik.values || {};
                      const impuestos = Array.isArray(V.impuestos) ? V.impuestos : [];
                      const impuestosTotal = impuestos.reduce((a, i) => a + (Number(i.monto) || 0), 0);
                      const yesNo = (b) => (b ? 'Sí' : 'No');
                      const comprobanteDefaults = {
                        categoria: true, observacion: true, proveedor: true, proyecto: true,
                        subcategoria: false, total_original: false, medio_pago: false,
                        tipo_factura: false, tags_extra: false, caja_chica: false,
                        impuestos: false, numero_factura: false, subtotal: false,
                        cuenta_interna: false, etapa: false, empresa_facturacion: false,
                        fecha_pago: false, obra: false, cliente: false, factura_cliente: false,
                        dolar_referencia: false, detalle: false,
                      };
                      const ingresoDefaults = {
                        observacion: true, medio_pago: false, categoria: false,
                        subcategoria: false, tags_extra: false, dolar_referencia: false,
                      };
                      const tipoMov = V.type || 'egreso';
                      const rawInfo = tipoMov === 'ingreso' ? ingreso_info : comprobante_info;
                      const defaults = tipoMov === 'ingreso' ? ingresoDefaults : comprobanteDefaults;
                      const camposCfg = { ...defaults, ...(rawInfo || {}) };
                      const shouldShowMontoPagado = V.type === 'egreso' && V.estado === 'Parcialmente Pagado';
                      const montoPagadoResumen = Number(parcialMonto || V.monto_pagado || 0);
                      const summaryConfig = [
      { key: '__creator', label: 'Creador', configKey: null, render: () => <span className="text-xs text-neutral-800">{creatorLabel}</span> },
      { key: '__created_at', label: 'Fecha de creación', configKey: null, render: () => <span className="text-xs text-neutral-800">{createdAtStr || '—'}</span> },
                        { key: 'nombre_proveedor', label: 'Proveedor', configKey: 'proveedor' },
      { key: 'fecha_factura', label: 'Fecha', configKey: null },
      { key: 'type', label: 'Tipo', configKey: null, format: (v) => (v ? v.toUpperCase() : '-') },
      { key: 'categoria', label: 'Categoría', configKey: 'categoria' },
      { key: 'subcategoria', label: 'Subcategoría', configKey: 'subcategoria' },
      { key: 'numero_factura', label: 'N° Factura', configKey: 'numero_factura' },
      { key: 'tipo_factura', label: 'Tipo de Factura', configKey: 'tipo_factura' },
      { key: 'medio_pago', label: 'Medio de Pago', configKey: 'medio_pago' },
                        { key: 'empresa_facturacion', label: 'Empresa de facturación', configKey: 'empresa_facturacion' },
                        { key: 'factura_cliente', label: 'Factura de cliente', configKey: 'factura_cliente', format: yesNo },
      { key: 'fecha_pago', label: 'Fecha de pago', configKey: 'fecha_pago' },
      { key: 'moneda', label: 'Moneda', configKey: null },
      { key: 'subtotal', label: 'Subtotal', configKey: 'subtotal', format: (v) => formatCurrency(v, 2) },
      { key: 'total_original', label: 'Total Original', configKey: 'total_original', format: (v) => formatCurrency(v, 2) },
      { key: 'total', label: 'Total', configKey: null, format: (v) => formatCurrency(v, 2) },
      { key: 'estado', label: 'Estado', configKey: null,
                          render: () => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              V.estado === 'Pagado' ? 'bg-success-main/15 text-success-dark' :
              V.estado === 'Parcialmente Pagado' ? 'bg-info-main/15 text-info-dark' :
              'bg-warning-main/15 text-warning-dark'
            }`}
          >
            {V.estado || 'Pendiente'}
          </span>
        ),
      },
      { key: 'caja_chica', label: 'Caja Chica', configKey: 'caja_chica', format: yesNo },
      { key: 'cuenta_interna', label: 'Cuenta Interna', configKey: 'cuenta_interna' },
      { key: 'etapa', label: 'Etapa', configKey: 'etapa' },
      { key: 'observacion', label: 'Observación', configKey: 'observacion' },
      { key: 'detalle', label: 'Detalle', configKey: 'detalle' },
      { key: 'obra', label: 'Obra', configKey: 'obra' },
                        { key: 'cliente', label: 'Cliente', configKey: 'cliente' },
      { key: 'tags_extra', label: 'Tags', configKey: 'tags_extra',
                          render: () =>
                            Array.isArray(V.tags_extra) && V.tags_extra.length > 0 ? (
            <span className="flex flex-wrap gap-0.5">
              {V.tags_extra.map((t) => (
                <span key={t} className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-700">{t}</span>
              ))}
            </span>
          ) : null,
      },
    ];
                      if (shouldShowMontoPagado) {
                        const totalIndex = summaryConfig.findIndex((item) => item.key === 'total');
                        summaryConfig.splice(totalIndex + 1, 0, {
                          key: '__monto_pagado',
                          label: 'Monto ya pagado',
                          configKey: null,
                          render: () => (
          <span className="text-xs font-semibold text-success-dark">{formatCurrency(montoPagadoResumen, 2)}</span>
        ),
      });
    }
                      const rows = summaryConfig
                        .filter(({ configKey }) => configKey === null || configKey === undefined || camposCfg[configKey])
                        .filter(({ key, render }) => render || (V[key] !== undefined && String(V[key]).trim() !== ''))
                        .map(({ key, label, format, render }) => (
        <div key={key} className="flex flex-wrap gap-x-1 gap-y-0.5 border-b border-divider/80 py-1 last:border-0">
          <span className="w-28 shrink-0 text-[11px] font-bold text-neutral-600">{label}:</span>
          <div className="min-w-0 flex-1 text-xs text-neutral-900">
            {render ? render() : (format ? format(V[key]) : V[key])}
          </div>
        </div>
      ));
                      const impuestosRow = camposCfg.impuestos ? (
      <div key="__impuestos" className="flex flex-wrap gap-1 border-b border-divider/80 py-1">
        <span className="w-28 shrink-0 text-[11px] font-bold text-neutral-600">Impuestos:</span>
        <span className="text-xs text-neutral-800">
                              {impuestos.length > 0 ? `${impuestos.length} ítem(s) • ${formatCurrency(impuestosTotal, 2)}` : '—'}
        </span>
      </div>
                      ) : null;
                      const stockRefId = movimiento?.acopio_id || movimiento?.solicitud_stock_id;
                      const stockRefTipo = movimiento?.acopio_id ? 'acopio' : (movimiento?.solicitud_stock_id ? 'solicitud' : null);
                      const showStockSection = isEditMode && formik.values.categoria === 'Materiales' && empresa?.stock_config?.caja_a_stock === true;
                      const materialesList = showStockSection && (
      <div className="mt-2 border-t border-divider pt-2">
        <p className="text-[11px] font-bold text-neutral-800">Stock</p>
                          {stockRefId ? (
          <div className="mt-1 space-y-1 pl-0.5">
            <div className="flex items-center gap-1 text-xs text-success-dark">
              <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden />
                                  {stockRefTipo === 'acopio' ? 'Acopio creado' : 'Solicitud de stock creada'}
            </div>
            <a
              className="block text-xs text-primary-dark hover:underline"
              href={stockRefTipo === 'acopio' ? `/movimientosAcopio?acopioId=${stockRefId}` : `/stockSolicitudes?solicitudId=${stockRefId}`}
                              >
                                {stockRefTipo === 'acopio' ? 'Ver acopio →' : 'Ver solicitud →'}
            </a>
            <button
              type="button"
              className="block text-left text-xs text-warning-dark hover:underline"
                                onClick={() => setStockPopupOpen(true)}
                              >
                                Reprocesar materiales
            </button>
          </div>
                          ) : (
          <div className="mt-1 space-y-1 pl-0.5">
            <p className="text-[10px] text-neutral-500">
                                {movimiento?.stock_procesado
                                  ? 'Se eligió no procesar. Podés procesarlos cuando quieras.'
                                  : 'Materiales pendientes de procesar.'}
            </p>
            <button
              type="button"
                                onClick={() => setStockPopupOpen(true)}
              className="rounded border border-primary-main px-2 py-0.5 text-[11px] font-medium text-primary-dark"
                              >
                                Procesar materiales
            </button>
          </div>
                          )}
      </div>
                      );
                      return (
                        <>
        <div className="flex flex-wrap gap-1 border-b border-divider/80 py-1">
          <span className="w-28 shrink-0 text-[11px] font-bold text-neutral-600">Proyecto:</span>
          <span className="text-xs text-neutral-900">{effectiveProyectoName || '-'}</span>
        </div>
                          {rows}
                          {impuestosRow}
                          {materialesList}
                        </>
                      );
  };
  return (
    <>
      <Head><title>{titulo}</title></Head>

      <input
        ref={fileInputRef}
        accept="image/*,application/pdf"
        type="file"
        className="hidden"
        onClick={handleFileInputClick}
        onChange={handleFileChange}
        aria-hidden
      />
      <div className="flex h-[calc(100dvh-4.5rem)] max-h-[calc(100vh-4.5rem)] min-h-0 flex-col gap-2 overflow-hidden bg-neutral-50 px-2 pb-2 pt-1">
        <header className="shrink-0 rounded-xl border border-divider bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-neutral-900 md:text-lg">{titulo}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {effectiveProyectoName && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{effectiveProyectoName}</span>
                )}
                {formik.values?.fecha_factura && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800">{formik.values.fecha_factura}</span>
                )}
                {formik.values.type && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                      formik.values.type === 'ingreso' ? 'bg-success-main/15 text-success-dark' : 'bg-error-main/15 text-error-dark'
                    }`}
                  >
                    {formik.values.type}
                  </span>
                )}
                {formik.values.caja_chica && (
                  <span className="rounded-full bg-info-main/15 px-2 py-0.5 text-[11px] font-medium text-info-dark">Caja chica</span>
                )}
                {isEditMode && movimiento?.origen && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] capitalize text-neutral-700"
                    title={`Origen: ${movimiento.origen}`}
                  >
                    {movimiento.origen === 'whatsapp' ? <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5 text-success-main" /> : null}
                    {movimiento.origen === 'web' ? <GlobeAltIcon className="h-3.5 w-3.5 text-info-main" /> : null}
                    {(movimiento.origen?.includes('sync') || movimiento.id_sincronizacion) && movimiento.origen !== 'whatsapp' && movimiento.origen !== 'web' ? (
                      <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
                    ) : null}
                    {movimiento.origen === 'whatsapp' ? 'WhatsApp' : movimiento.origen === 'web' ? 'Web' : movimiento.origen}
                  </span>
                )}
                {isEditMode && movimiento?.id_sincronizacion && !movimiento?.origen?.includes('sync') && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300 px-2 py-0.5 text-[11px]" title={`Sincronizado: ${movimiento.id_sincronizacion}`}>
                    <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5" />
                    Sync
                  </span>
                )}
                {isRetrying && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-main/15 px-2 py-0.5 text-[11px] text-warning-dark">
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Reintentando…
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(isEditMode || modoIngreso === 'manual') && (
                <button
                  type="button"
                  onClick={() => handleExtraerDatos()}
                  disabled={isExtractingData || (!isEditMode && !hasComprobante)}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  {isExtractingData ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <DocumentMagnifyingGlassIcon className="h-4 w-4" aria-hidden />
                  )}
                  {isExtractingData ? 'Extrayendo…' : 'Extraer datos de archivo'}
                </button>
              )}
              <div className="relative" ref={accionesRef}>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setAccionesOpen((o) => !o)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-main bg-white px-3 py-1.5 text-sm font-medium text-primary-dark shadow-sm hover:bg-primary-lightest disabled:opacity-50"
                >
                  <EllipsisVerticalIcon className="h-4 w-4" aria-hidden />
                  Acciones
                </button>
                {accionesOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-30 mt-1 min-w-[14rem] rounded-lg border border-divider bg-white py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!effectiveProyectoId}
                      onClick={() => handleAccionesMenuItemClick('transferencia')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <ArrowsRightLeftIcon className="h-4 w-4 text-neutral-600" />
                      Transferencia interna
                    </button>
                    {!isEditMode && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!effectiveProyectoId || !formik.values.total || proyectos.length <= 1 || formik.values.type !== 'egreso'}
                        onClick={() => handleAccionesMenuItemClick('pagoOtraCaja')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-40"
                      >
                        <WalletIcon className="h-4 w-4 text-neutral-600" />
                        Pagar desde otra caja
                      </button>
                    )}
                    {!isEditMode && proyectos.length >= 1 && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isLoading || !formik.values.total}
                        onClick={() => handleAccionesMenuItemClick('prorrateo')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-40"
                      >
                        <ChartPieIcon className="h-4 w-4 text-neutral-600" />
                        Prorratear por proyectos
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      disabled={!isEditMode}
                      onClick={() => handleAccionesMenuItemClick('auditoria')}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-40"
                    >
                      <DocumentTextIcon className="h-4 w-4 text-neutral-600" />
                      Ver auditoría
                    </button>
                    {mostrarCompletarPago && (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={isLoading || completarPagoLoading}
                        onClick={() => handleAccionesMenuItemClick('completarPago')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-40"
                      >
                        <CheckCircleIcon className="h-4 w-4 text-success-dark" />
                        Completar pago
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(lastPageUrl || '/')}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
              >
                Volver sin guardar
              </button>
              <button
                type="button"
                onClick={handleSubmitForm}
                disabled={isLoading}
                className="inline-flex min-w-[5.5rem] items-center justify-center rounded-lg bg-primary-main px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-primary-dark disabled:opacity-50"
              >
                {isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" aria-label="Cargando" /> : (isEditMode ? 'Guardar' : 'Crear')}
              </button>
            </div>
          </div>
        </header>

        {isInitialLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <ArrowPathIcon className="h-10 w-10 animate-spin text-primary-main" aria-hidden />
            {isRetrying && retryCount > 0 && (
              <p className="text-sm text-neutral-600">Reintentando… ({retryCount}/3)</p>
            )}
            {!isRetrying && retryCount === 0 && (
              <p className="text-sm text-neutral-600">Cargando datos…</p>
            )}
          </div>
        ) : loadingError ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <div
              className={`max-w-lg rounded-xl border px-4 py-3 ${
                loadingError.code?.startsWith('sorby/') ? 'border-warning-main/40 bg-warning-main/10' : 'border-error-main/40 bg-error-main/10'
              }`}
            >
              <p className="text-sm font-semibold text-neutral-900">
                {loadingError.code?.startsWith('sorby/') ? 'Problema con tu sesión' : 'Error al cargar los datos'}
              </p>
              <p className="mt-2 text-sm text-neutral-700">
                {loadingError.code?.startsWith('sorby/')
                  ? 'Tu sesión parece estar desactualizada o incompleta. Cerrá sesión y volvé a ingresar.'
                  : (loadingError.message || 'Error inesperado')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(lastPageUrl || '/')}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm"
                >
                  Volver
                </button>
                {loadingError.code?.startsWith('sorby/') ? (
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      router.push('/auth/login');
                    }}
                    className="rounded-lg bg-warning-main px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Cerrar sesión
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isInitialLoading}
                    className="rounded-lg bg-primary-main px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isInitialLoading ? 'Reintentando…' : 'Reintentar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : modoIngreso === null && !isEditMode ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md rounded-xl border border-divider bg-white p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900">¿Cómo querés cargar el movimiento?</h2>
              {effectiveProyectoName && (
                <p className="mt-2 text-sm text-neutral-600">Proyecto: {effectiveProyectoName}</p>
              )}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    pendingExtraccionRef.current = true;
                    fileInputRef.current?.click();
                  }}
                  disabled={isExtractingData}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-main px-4 py-3 text-sm font-semibold text-white shadow hover:bg-primary-dark disabled:opacity-50"
                >
                  {isExtractingData ? (
                    <ArrowPathIcon className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <DocumentMagnifyingGlassIcon className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {isExtractingData ? 'Extrayendo datos…' : 'Tengo una factura o comprobante'}
                </button>
                <button
                  type="button"
                  onClick={() => setModoIngreso('manual')}
                  disabled={isExtractingData}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Carga manual
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:flex-row lg:gap-3">
            <form
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden"
              onSubmit={formik.handleSubmit}
            >
              <div
                data-movement-form-scroll="true"
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
              >
                <div className="flex flex-col gap-2 pb-1">
                  <StitchBlock step={1} title="Detalles del movimiento">
                    <MovementFields {...sharedFieldProps} block="details" />
                  </StitchBlock>
                  <StitchBlock step={2} title="Clasificación">
                    <MovementFields {...sharedFieldProps} block="classification" />
                  </StitchBlock>
                  <StitchBlock step={3} title="Detalles financieros e impuestos">
                    <MovementFields {...sharedFieldProps} block="financial" />
                  </StitchBlock>
                </div>
              </div>
              <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-divider bg-neutral-50 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasComprobante) {
                      fileInputRef.current?.click();
                      return;
                    }
                    if (isComprobantePdf) {
                      setPdfModalOpen(true);
                      return;
                    }
                    setImagenModal(comprobanteSrc);
                    setComprobanteModalOpen(true);
                  }}
                  className="text-sm font-medium text-primary-dark hover:underline"
                >
                  Ver imagen de factura
                </button>
                {!isEditMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-medium text-neutral-700 hover:underline"
                    >
                      Elegir archivo
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadImage}
                      disabled={!nuevoArchivo || isReemplazandoImagen}
                      className="rounded-lg border border-primary-main px-2 py-1 text-xs font-semibold text-primary-dark disabled:opacity-40"
                    >
                      {isReemplazandoImagen ? 'Subiendo…' : 'Subir comprobante'}
                    </button>
                  </>
                )}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-medium text-neutral-700 hover:underline"
                  >
                    Reemplazar comprobante
                  </button>
                )}
              </footer>
            </form>

            <aside className="hidden min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-divider bg-white shadow-sm lg:flex lg:w-[280px]">
              <div className="border-b border-divider px-3 py-2">
                <h2 className="text-sm font-semibold text-neutral-900">Resumen</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">{renderSummaryBody()}</div>
                {isEditMode && movimiento?.es_movimiento_prorrateo && (
                <div className="shrink-0 border-t border-divider px-2 pb-2">
                  <ProrrateoInfo 
                    movimiento={movimiento}
                    onVerRelacionados={() => {
                      router.push(`/movimientos-prorrateo?grupoId=${movimiento.prorrateo_grupo_id}`);
                    }}
                  />
                </div>
                )}
                {isEditMode && movimiento?.es_pago_entre_cajas && (
                <div className="shrink-0 border-t border-divider px-2 pb-2">
                  <PagoEntreCajasInfo movimiento={movimiento} />
                </div>
              )}
            </aside>

            <div className="shrink-0 rounded-xl border border-divider bg-white p-3 shadow-sm lg:hidden">
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">Resumen</h2>
              <div className="max-h-48 overflow-y-auto text-xs">{renderSummaryBody()}</div>
              {isEditMode && movimiento?.es_movimiento_prorrateo && (
                <ProrrateoInfo
                    movimiento={movimiento}
                  onVerRelacionados={() => {
                    router.push(`/movimientos-prorrateo?grupoId=${movimiento.prorrateo_grupo_id}`);
                  }}
                />
              )}
              {isEditMode && movimiento?.es_pago_entre_cajas && <PagoEntreCajasInfo movimiento={movimiento} />}
            </div>
          </div>
        )}
        <ComprobanteModal
          open={comprobanteModalOpen}
          onClose={handleCloseComprobanteModal}
          imagenUrl={imagenModal}
        />
        <ComprobantePdfModal
          open={pdfModalOpen}
          onClose={handleCloseComprobantePdfModal}
          pdfUrl={hasComprobante && isComprobantePdf ? comprobanteSrc : ''}
        />

        <Dialog
          open={auditOpen}
          onClose={handleCloseAuditDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ pr: 6 }}>
            Auditoría de cambios
            <IconButton
              aria-label="Cerrar"
              onClick={handleCloseAuditDialog}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ minHeight: 240, maxHeight: '80vh' }}>
            <MovimientoLogsPanel logs={movimiento?.logs || []} />
          </DialogContent>
        </Dialog>

        <Dialog
          open={completarPagoDialogOpen}
          onClose={() => !completarPagoLoading && setCompletarPagoDialogOpen(false)}
          aria-labelledby="completar-pago-dialog-title"
        >
          <DialogTitle id="completar-pago-dialog-title">Completar pago</DialogTitle>
          <DialogContent>
            <DialogContentText component="div">
              ¿Marcar este egreso como pagado por el total de{' '}
              <strong>
                {formatCurrency(
                  Number(formik.values.total) || 0,
                  formik.values.moneda || 'ARS'
                )}
              </strong>
              ?
              {formik.values.estado === 'Parcialmente Pagado' && (
                <Typography component="span" variant="body2" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                  El monto abonado pasará a igualar al total del comprobante.
                </Typography>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCompletarPagoDialogOpen(false)} disabled={completarPagoLoading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleCompletarPagoConfirm}
              disabled={completarPagoLoading}
              autoFocus
            >
              {completarPagoLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>

        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
              <h3 className="text-sm font-semibold text-neutral-900">¿Guardar con totales diferentes?</h3>
              <p className="mt-2 text-xs text-neutral-700">
                Subtotal + Impuestos no coincide con Total.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-neutral-800">
                <li>Subtotal: {formatCurrency(Number(formik.values.subtotal) || 0, 2)}</li>
                <li>
                  Impuestos:{' '}
                  {formatCurrency((formik.values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0), 2)}
                </li>
                <li>Total: {formatCurrency(Number(formik.values.total) || 0, 2)}</li>
                <li className="border-t border-divider pt-1 font-medium">
                  Diferencia:{' '}
                  {formatCurrency(
                    Math.abs(
                      (Number(formik.values.subtotal) || 0) +
                        (formik.values.impuestos || []).reduce((a, i) => a + (Number(i.monto) || 0), 0) -
                        (Number(formik.values.total) || 0)
                    ),
                    2
                  )}
                </li>
              </ul>
              <p className="mt-3 text-xs text-neutral-700">¿Guardar de todos modos?</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    setPendingPayload(null);
                  }}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                >
              Revisar
                </button>
                <button
                  type="button"
              onClick={async () => {
                if (!pendingPayload) return;
                setIsLoading(true);
                await savePayload(pendingPayload);
              }}
                  className="rounded-lg bg-primary-main px-3 py-1.5 text-sm font-semibold text-white"
            >
              Guardar igual
                </button>
              </div>
            </div>
          </div>
        )}

        <ProrrateoDialog 
          open={prorrateoOpen}
          onClose={(success) => {
            setProrrateoOpen(false);
            if (success) {
              setAlert({
                open: true,
                message: 'Movimientos prorrateo creados con éxito',
                severity: 'success',
              });
              setTimeout(() => {
                router.push(lastPageUrl || `/cajaProyecto?proyectoId=${effectiveProyectoId}`);
              }, 1500);
            }
          }}
          datosBase={{
            ...formik.values,
            fecha_factura: ensureFechaFactura(formik.values.fecha_factura),
            proyecto_id: effectiveProyectoId,
            proyecto_nombre: effectiveProyectoName,
          }}
          proyectos={proyectos}
          onSuccess={(data) => {
            console.log('Prorrateo exitoso:', data);
          }}
        />

        <TransferenciaInternaDialog
          open={openTransferencia}
          onClose={handleCloseTransferencia}
          proyectos={proyectos}
          onSuccess={handleTransferenciaSuccess}
          defaultProyectoEmisor={effectiveProyectoId && effectiveProyectoName ? { id: effectiveProyectoId, nombre: effectiveProyectoName } : null}
          userPhone={user?.phone}
          mediosPago={empresa?.medios_pago || []}
          showMedioPago={!!empresa?.comprobante_info?.medio_pago}
        />

        <EgresoConCajaPagadoraDialog
          open={openEgresoConCajaPagadora}
          onClose={handleCloseEgresoConCajaPagadora}
          datosEgreso={{
            ...formik.values,
            proyecto_id: effectiveProyectoId,
            proyecto_nombre: effectiveProyectoName,
            user_phone: user?.phone,
            empresa_id: empresa?.id,
          }}
          proyectos={proyectos}
          onSuccess={handleEgresoConCajaPagadoraSuccess}
        />

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

        {alert.open && (
          <div
            className={`fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
              alert.severity === 'success'
                ? 'border-success-main/40 bg-white text-success-dark'
                : alert.severity === 'error'
                  ? 'border-error-main/40 bg-white text-error-dark'
                  : 'border-warning-main/40 bg-white text-warning-dark'
            }`}
            role="status"
          >
            <div className="flex items-start justify-between gap-2">
              <span>{alert.message}</span>
              <button type="button" onClick={handleCloseAlert} className="text-neutral-500 hover:text-neutral-800" aria-label="Cerrar">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

MovementFormPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;
export default MovementFormPage;
