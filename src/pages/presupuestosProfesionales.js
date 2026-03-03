import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PostAddIcon from '@mui/icons-material/PostAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';
import MonedasService from 'src/services/monedasService';
import cacService from 'src/services/cacService';
import {
  PresupuestoFormDialog,
  PresupuestoDeleteDialog,
  CambiarEstadoDialog,
  PresupuestoDetalleDialog,
  AgregarAnexoDialog,
  PlantillaFormDialog,
  PlantillaDeleteDialog,
  ImportarPlantillaDialog,
  distribuirMontosPorIncidencia,
  ESTADOS,
  ESTADO_LABEL,
  ESTADO_COLOR,
  TRANSICIONES_VALIDAS,
  MONEDAS,
  formatCurrency,
  formatDate,
  formatPct,
  TEXTO_NOTAS_DEFAULT,
  parseNumberInput,
  CAC_TIPOS,
  INDEXACION_VALUES,
  USD_FUENTES,
  USD_VALORES,
  hoyIso,
  normalizarAjusteMoneda,
} from 'src/components/presupuestosProfesionales';

/* ================================================================
   Formulario vacío – Presupuesto
   ================================================================ */

const emptyPresupuesto = {
  titulo: '',
  proyecto_id: '',
  proyecto_nombre: '',
  obra_direccion: '',
  moneda: 'ARS',
  indexacion: INDEXACION_VALUES.FIJO,
  cac_tipo: CAC_TIPOS.GENERAL,
  usd_fuente: USD_FUENTES.OFICIAL,
  usd_valor: USD_VALORES.PROMEDIO,
  rubros: [],
  notas_texto: '',
  analisis_superficies: {
    sup_cubierta_m2: '',
    sup_patios_m2: '',
    coef_patios: 0.5,
    sup_ponderada_m2: '',
  },
  plantilla_id: '',
};

const emptyRubro = { nombre: '', monto: 0, incidencia_objetivo_pct: null, tareas: [] };
const emptyTarea = { descripcion: '' };

const CAC_LABELS = {
  [CAC_TIPOS.GENERAL]: 'Promedio',
  [CAC_TIPOS.MANO_OBRA]: 'Mano de Obra',
  [CAC_TIPOS.MATERIALES]: 'Materiales',
};

const toMes = (fechaIso = '') => {
  if (!fechaIso || typeof fechaIso !== 'string' || fechaIso.length < 7) return '';
  return fechaIso.slice(0, 7);
};

const pickUsdValue = (dolarData, fuente, tipo) => {
  const bloque = dolarData?.[fuente];
  if (!bloque) return null;
  const value = Number(bloque?.[tipo]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const pickCacValue = (cacData, tipo) => {
  const value = Number(cacData?.[tipo]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/* ================================================================
   Formulario vacío – Plantilla
   ================================================================ */

const emptyPlantilla = {
  nombre: '',
  tipo: '',
  activa: true,
  rubros: [],
  notas: '',
};

/* ================================================================
   Componente principal
   ================================================================ */

const PresupuestosProfesionales = () => {
  const { user } = useAuthContext();

  // ── Datos globales ──
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [plantillas, setPlantillas] = useState([]);

  // ── Tab principal ──
  const [currentTab, setCurrentTab] = useState(0);

  // ── Presupuestos: lista ──
  const [presupuestos, setPresupuestos] = useState([]);
  const [presupuestosLoading, setPresupuestosLoading] = useState(false);
  const [totalPresupuestos, setTotalPresupuestos] = useState(0);
  const [ppPage, setPpPage] = useState(0);
  const [ppRowsPerPage, setPpRowsPerPage] = useState(25);

  // ── Presupuestos: filtros ──
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState('');
  const [filtroTitulo, setFiltroTitulo] = useState('');

  // ── Presupuestos: formulario crear / editar ──
  const [openPPForm, setOpenPPForm] = useState(false);
  const [ppIsEdit, setPpIsEdit] = useState(false);
  const [ppForm, setPpForm] = useState(emptyPresupuesto);
  const [ppEditId, setPpEditId] = useState(null);
  const [ppSaving, setPpSaving] = useState(false);
  const [ppModoDistribuir, setPpModoDistribuir] = useState(false);
  const [ppTotalObjetivo, setPpTotalObjetivo] = useState('');

  // ── Presupuestos: eliminar ──
  const [openPPDelete, setOpenPPDelete] = useState(false);
  const [ppToDelete, setPpToDelete] = useState(null);

  // ── Presupuestos: cambiar estado ──
  const [openEstado, setOpenEstado] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');

  // ── Presupuestos: detalle / versiones ──
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleTab, setDetalleTab] = useState(0);
  const [detallePdfExporting, setDetallePdfExporting] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState(null);

  // ── Presupuestos: agregar anexo ──
  const [openAnexo, setOpenAnexo] = useState(false);
  const [anexoTarget, setAnexoTarget] = useState(null);
  const [anexoForm, setAnexoForm] = useState({
    motivo: '',
    tipo: 'adicion',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    detalle: '',
    impacto: 'positivo',
  });

  // ── Plantillas: lista ──
  const [plantillasLoading, setPlantillasLoading] = useState(false);

  // ── Plantillas: formulario crear / editar ──
  const [openPlForm, setOpenPlForm] = useState(false);
  const [plIsEdit, setPlIsEdit] = useState(false);
  const [plForm, setPlForm] = useState(emptyPlantilla);
  const [plEditId, setPlEditId] = useState(null);
  const [plSaving, setPlSaving] = useState(false);

  // ── Plantillas: eliminar ──
  const [openPlDelete, setOpenPlDelete] = useState(false);
  const [plToDelete, setPlToDelete] = useState(null);

  // ── Plantillas: importar archivo ──
  const [openImport, setOpenImport] = useState(false);
  const [importFiles, setImportFiles] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importName, setImportName] = useState('');
  const [importTipo, setImportTipo] = useState('');
  const [importPhase, setImportPhase] = useState('idle');
  const isImageFile = (file) =>
    file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);
  const validateImportFiles = (files) => {
    if (!files.length) return null;
    const allImages = files.every(isImageFile);
    const hasNonImages = files.some((file) => !isImageFile(file));
    if (allImages && hasNonImages) return 'Subí solo imágenes o solo un PDF/Excel.';
    if (allImages && files.length > 10) return 'Máximo 10 imágenes por importación.';
    if (!allImages && files.length > 1) return 'Solo se permite un archivo PDF o Excel.';
    if (!allImages) {
      const file = files[0];
      if (!/\.(xls|xlsx|pdf)$/i.test(file.name)) {
        return 'Formato no soportado.';
      }
    }
    return null;
  };
  const fileGroupError = useMemo(() => validateImportFiles(importFiles), [importFiles]);

  const handleAddImportFiles = (files = []) => {
    if (!files.length) return;
    setImportFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveImportFile = (index) => {
    setImportFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImportFile = (fromIndex, toIndex) => {
    setImportFiles((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const resetImportDialog = () => {
    setImportFiles([]);
    setImportName('');
    setImportTipo('');
    setImportPhase('idle');
  };

  const handleCloseImportDialog = () => {
    setOpenImport(false);
    resetImportDialog();
  };

  // ── Rubros expandidos ──
  const [expandedRubros, setExpandedRubros] = useState(new Set());

  // ── Focus refs para auto-focus al agregar tarea/rubro ──
  const ppFocusRef = useRef(null);
  const plFocusRef = useRef(null);

  // ── Snackbar ──
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = () => setAlert((prev) => ({ ...prev, open: false }));
  const showAlert = (message, severity = 'success') => setAlert({ open: true, message, severity });

  /* ================================================================
     Init: cargar empresa, plantillas
     ================================================================ */

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        if (empresa) {
          setEmpresaId(empresa.id);
          setEmpresaNombre(empresa.nombre || '');
        }
      } catch (err) {
        console.error('Error inicializando presupuestos profesionales:', err);
      }
    })();
  }, [user]);

  /* ================================================================
     Fetch: Presupuestos
     ================================================================ */

  const fetchPresupuestos = useCallback(async () => {
    if (!empresaId) return;
    setPresupuestosLoading(true);
    try {
      const filters = {
        empresa_id: empresaId,
        limit: ppRowsPerPage,
        page: ppPage,
      };
      if (filtroEstado) filters.estado = filtroEstado;
      if (filtroMoneda) filters.moneda = filtroMoneda;
      if (filtroTitulo.trim()) filters.titulo = filtroTitulo.trim();
      const resp = await PresupuestoProfesionalService.listar(filters);
      setPresupuestos(resp.items || []);
      setTotalPresupuestos(resp.total || 0);
    } catch (err) {
      console.error('Error al listar presupuestos profesionales:', err);
      showAlert('Error al cargar presupuestos', 'error');
    } finally {
      setPresupuestosLoading(false);
    }
  }, [empresaId, ppPage, ppRowsPerPage, filtroEstado, filtroMoneda, filtroTitulo]);

  useEffect(() => {
    if (currentTab === 0) fetchPresupuestos();
  }, [currentTab, fetchPresupuestos]);

  /* ================================================================
     Fetch: Plantillas
     ================================================================ */

  const fetchPlantillas = useCallback(async () => {
    if (!empresaId) return;
    setPlantillasLoading(true);
    try {
      const items = await PresupuestoProfesionalService.listarPlantillas(empresaId, false);
      setPlantillas(items);
    } catch (err) {
      console.error('Error al listar plantillas:', err);
      showAlert('Error al cargar plantillas', 'error');
    } finally {
      setPlantillasLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (empresaId) {
      fetchPlantillas();
    }
  }, [empresaId, fetchPlantillas]);

  useEffect(() => {
    if (currentTab === 1) fetchPlantillas();
  }, [currentTab, fetchPlantillas]);

  /* ================================================================
     Presupuesto: Crear / Editar
     ================================================================ */

  const resolverCotizacionSnapshot = async (form) => {
    const ajuste = normalizarAjusteMoneda(form);
    const fechaHoy = hoyIso();

    if (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) {
      const dolarData = await MonedasService.obtenerDolar(fechaHoy);
      const valorUsd = pickUsdValue(dolarData, ajuste.usd_fuente, ajuste.usd_valor);
      if (!valorUsd) {
        throw new Error(`No hay cotización USD ${ajuste.usd_fuente}/${ajuste.usd_valor} para ${fechaHoy}`);
      }
      return {
        tipo: 'USD',
        fuente: ajuste.usd_fuente,
        referencia: ajuste.usd_valor,
        valor: valorUsd,
        fecha_origen: dolarData?.fecha || fechaHoy,
      };
    }

    if (ajuste.indexacion === INDEXACION_VALUES.CAC) {
      const mesReferencia = toMes(fechaHoy);
      const cacData = await cacService.getCacPorFecha(mesReferencia);
      const valorCac = pickCacValue(cacData, ajuste.cac_tipo);
      if (!valorCac) {
        const tipoLabel = CAC_LABELS[ajuste.cac_tipo] || ajuste.cac_tipo;
        throw new Error(`No hay índice CAC (${tipoLabel}) para ${mesReferencia}`);
      }
      return {
        tipo: 'CAC',
        fuente: 'cac',
        referencia: ajuste.cac_tipo,
        valor: valorCac,
        fecha_origen: cacData?.fecha || mesReferencia,
      };
    }

    return null;
  };

  const handleOpenPPCreate = () => {
    setPpForm({
      ...emptyPresupuesto,
      plantilla_id: '',
      notas_texto: TEXTO_NOTAS_DEFAULT,
    });
    setPpIsEdit(false);
    setPpEditId(null);
    setPpModoDistribuir(false);
    setPpTotalObjetivo('');
    setOpenPPForm(true);
  };

  const handleOpenPPEdit = async (row) => {
    try {
      const full = await PresupuestoProfesionalService.obtenerPorId(row._id);
      setPpForm({
        titulo: full.titulo || '',
        proyecto_id: full.proyecto_id || '',
        proyecto_nombre: full.proyecto_nombre || '',
        obra_direccion: full.obra_direccion || '',
        moneda: full.moneda || 'ARS',
        indexacion: full.indexacion ?? ((full.moneda || 'ARS') === 'USD' ? INDEXACION_VALUES.USD : INDEXACION_VALUES.FIJO),
        cac_tipo: full.cac_tipo || CAC_TIPOS.GENERAL,
        usd_fuente: full.usd_fuente || USD_FUENTES.OFICIAL,
        usd_valor: full.usd_valor || USD_VALORES.PROMEDIO,
        rubros: (full.rubros || []).map((r) => ({
          nombre: r.nombre || '',
          monto: r.monto || 0,
          incidencia_objetivo_pct:
            r.incidencia_objetivo_pct != null && !Number.isNaN(Number(r.incidencia_objetivo_pct))
              ? Number(r.incidencia_objetivo_pct)
              : null,
          tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
        })),
        notas_texto: full.notas_texto || '',
        analisis_superficies: (() => {
          const a = Number(full.analisis_superficies?.sup_cubierta_m2) || 0;
          const b = Number(full.analisis_superficies?.sup_patios_m2) || 0;
          const c = Number(full.analisis_superficies?.coef_patios) >= 0
            ? (Number(full.analisis_superficies?.coef_patios) || 0.5)
            : 0.5;
          const computed = a >= 0 && b >= 0 ? Math.round((a + b * c) * 100) / 100 : '';
          return {
            sup_cubierta_m2: full.analisis_superficies?.sup_cubierta_m2 ?? '',
            sup_patios_m2: full.analisis_superficies?.sup_patios_m2 ?? '',
            coef_patios: full.analisis_superficies?.coef_patios ?? 0.5,
            sup_ponderada_m2: computed,
          };
        })(),
        plantilla_id: '',
      });
      setPpIsEdit(true);
      setPpEditId(full._id);
      setOpenPPForm(true);
    } catch (err) {
      showAlert('Error al cargar detalle del presupuesto', 'error');
    }
  };

  const handleSavePP = async () => {
    if (!empresaId) {
      showAlert('Error: no se pudo resolver la empresa. Recargá la página.', 'error');
      return;
    }
    if (!ppForm.titulo?.trim()) {
      showAlert('El título es obligatorio', 'warning');
      return;
    }
    setPpSaving(true);
    try {
      const ajuste = normalizarAjusteMoneda(ppForm);
      const cotizacionSnapshot = await resolverCotizacionSnapshot(ppForm);

      const payload = {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        titulo: ppForm.titulo,
        proyecto_id: ppForm.proyecto_id || null,
        proyecto_nombre: ppForm.proyecto_nombre || null,
        obra_direccion: ppForm.obra_direccion || null,
        moneda: ajuste.moneda,
        fecha: hoyIso(),
        fecha_presupuesto: hoyIso(),
        indexacion: ajuste.moneda === 'ARS' ? ajuste.indexacion : INDEXACION_VALUES.USD,
        cac_tipo: ajuste.indexacion === INDEXACION_VALUES.CAC ? ajuste.cac_tipo : null,
        usd_fuente: (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) ? ajuste.usd_fuente : null,
        usd_valor: (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) ? ajuste.usd_valor : null,
        cotizacion_snapshot: cotizacionSnapshot,
        rubros: ppForm.rubros
          .filter((r) => r.nombre?.trim())
          .map((r) => ({
            nombre: r.nombre.trim(),
            monto: Number(r.monto) || 0,
            incidencia_objetivo_pct:
              r.incidencia_objetivo_pct != null && !Number.isNaN(Number(r.incidencia_objetivo_pct))
                ? Number(r.incidencia_objetivo_pct)
                : null,
            tareas: (r.tareas || [])
              .filter((t) => t.descripcion?.trim())
              .map((t) => ({ descripcion: t.descripcion.trim() })),
          })),
        notas_texto: ppForm.notas_texto,
        analisis_superficies: (() => {
          const as = ppForm.analisis_superficies || {};
          const a = Number(as.sup_cubierta_m2) || 0;
          const b = Number(as.sup_patios_m2) || 0;
          const c = Number(as.coef_patios) >= 0 ? (Number(as.coef_patios) || 0.5) : 0.5;
          const supPonderada = a >= 0 && b >= 0 ? Math.round((a + b * c) * 100) / 100 : null;
          return {
            ...as,
            sup_cubierta_m2: as.sup_cubierta_m2 !== '' && as.sup_cubierta_m2 != null ? Number(as.sup_cubierta_m2) : null,
            sup_patios_m2: as.sup_patios_m2 !== '' && as.sup_patios_m2 != null ? Number(as.sup_patios_m2) : null,
            coef_patios: c,
            sup_ponderada_m2: supPonderada,
          };
        })(),
      };


      if (ppIsEdit) {
        await PresupuestoProfesionalService.actualizar(ppEditId, payload);
        showAlert('Presupuesto actualizado');
      } else {
        await PresupuestoProfesionalService.crear(payload);
        showAlert('Presupuesto creado');
      }
      setOpenPPForm(false);
      fetchPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al guardar';
      showAlert(msg, 'error');
    } finally {
      setPpSaving(false);
    }
  };

  /* ================================================================
     Presupuesto: Eliminar
     ================================================================ */

  const handleConfirmDeletePP = async () => {
    if (!ppToDelete) return;
    try {
      await PresupuestoProfesionalService.eliminar(ppToDelete._id);
      showAlert('Presupuesto eliminado');
      setOpenPPDelete(false);
      setPpToDelete(null);
      fetchPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al eliminar';
      showAlert(msg, 'error');
    }
  };

  /* ================================================================
     Presupuesto: Cambiar Estado
     ================================================================ */

  const handleOpenCambiarEstado = (row) => {
    setEstadoTarget(row);
    setNuevoEstado('');
    setOpenEstado(true);
  };

  const handleConfirmCambiarEstado = async () => {
    if (!estadoTarget || !nuevoEstado) return;
    try {
      await PresupuestoProfesionalService.cambiarEstado(estadoTarget._id, nuevoEstado);
      showAlert(`Estado cambiado a "${ESTADO_LABEL[nuevoEstado]}"`);
      setOpenEstado(false);
      fetchPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al cambiar estado';
      showAlert(msg, 'error');
    }
  };

  /* ================================================================
     Presupuesto: Ver Detalle (versiones, historial, anexos)
     ================================================================ */

  const handleOpenDetalle = async (row) => {
    setDetalleLoading(true);
    setOpenDetalle(true);
    setDetalleTab(0);
    try {
      const full = await PresupuestoProfesionalService.obtenerPorId(row._id);
      setDetalleData(full);
    } catch (err) {
      showAlert('Error al cargar detalle', 'error');
      setOpenDetalle(false);
    } finally {
      setDetalleLoading(false);
    }
  };

  const handleExportPdfFromRow = async (row) => {
    if (exportingPdfId === row._id) return;
    if (!row.rubros?.length) {
      showAlert('El presupuesto no tiene rubros', 'warning');
      return;
    }

    setExportingPdfId(row._id);
    try {
      const full = await PresupuestoProfesionalService.obtenerPorId(row._id);
      const { exportPresupuestoToPdfRenderer } = await import(
        'src/utils/presupuestos/exportPresupuestoToPdfRenderer'
      );
      await exportPresupuestoToPdfRenderer(full, { empresa: { nombre: empresaNombre } });
      showAlert('PDF descargado', 'success');
    } catch (err) {
      console.error('Error exportando presupuesto a PDF:', err);
      showAlert('Error al generar el PDF', 'error');
    } finally {
      setExportingPdfId((current) => (current === row._id ? null : current));
    }
  };

  const handleExportPdfFromDetalle = async () => {
    if (!detalleData) return;
    if (!detalleData.rubros?.length) {
      showAlert('El presupuesto no tiene rubros', 'warning');
      return;
    }

    setDetallePdfExporting(true);
    try {
      const { exportPresupuestoToPdfRenderer } = await import(
        'src/utils/presupuestos/exportPresupuestoToPdfRenderer'
      );
      await exportPresupuestoToPdfRenderer(detalleData, { empresa: { nombre: empresaNombre } });
      showAlert('PDF descargado', 'success');
    } catch (err) {
      console.error('Error exportando PDF desde detalle:', err);
      showAlert('Error al generar el PDF', 'error');
    } finally {
      setDetallePdfExporting(false);
    }
  };

  /* ================================================================
     Presupuesto: Agregar Anexo
     ================================================================ */

  const handleOpenAnexo = (row) => {
    setAnexoTarget(row);
    setAnexoForm({
      motivo: '',
      tipo: 'adicion',
      monto: '',
      fecha: new Date().toISOString().slice(0, 10),
      detalle: '',
      impacto: 'positivo',
    });
    setOpenAnexo(true);
  };

  const handleConfirmAnexo = async () => {
    if (!anexoTarget || !anexoForm.motivo.trim()) {
      showAlert('El motivo es obligatorio', 'warning');
      return;
    }
    const monto = Number(anexoForm.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      showAlert('El monto es obligatorio y debe ser mayor a 0', 'warning');
      return;
    }
    try {
      await PresupuestoProfesionalService.agregarAnexo(anexoTarget._id, {
        motivo: anexoForm.motivo.trim(),
        tipo: anexoForm.tipo,
        monto,
        fecha: anexoForm.fecha || undefined,
        detalle: anexoForm.detalle?.trim() || undefined,
        impacto: anexoForm.tipo === 'modificacion' ? anexoForm.impacto : undefined,
      });
      showAlert('Anexo agregado correctamente');
      setOpenAnexo(false);
      setAnexoTarget(null);
      fetchPresupuestos();
      if (openDetalle && detalleData?._id === anexoTarget._id) {
        const full = await PresupuestoProfesionalService.obtenerPorId(anexoTarget._id);
        setDetalleData(full);
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al agregar anexo';
      showAlert(msg, 'error');
    }
  };

  /* ================================================================
     Rubros editor helpers (para presupuesto form)
     ================================================================ */

  const ppAddRubro = () => {
    setPpForm((f) => {
      ppFocusRef.current = { type: 'rubro', rubroIdx: f.rubros.length };
      return { ...f, rubros: [...f.rubros, { ...emptyRubro, tareas: [] }] };
    });
  };

  const ppRemoveRubro = (idx) => {
    setPpForm((f) => ({ ...f, rubros: f.rubros.filter((_, i) => i !== idx) }));
  };

  const ppUpdateRubro = (idx, field, value) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      rubros[idx] = { ...rubros[idx], [field]: value };
      if (field === 'monto') {
        const total = rubros.reduce((s, r) => s + (Number(r.monto) || 0), 0);
        if (total > 0) {
          rubros[idx] = {
            ...rubros[idx],
            incidencia_objetivo_pct: ((Number(rubros[idx].monto) || 0) / total) * 100,
          };
        }
      }
      return { ...f, rubros };
    });
  };

  const ppDistribuirPorTotal = (totalStr) => {
    setPpTotalObjetivo(totalStr);
    const total = Number(totalStr) || 0;
    setPpForm((f) => {
      const rubrosDist = distribuirMontosPorIncidencia(total, f.rubros);
      return { ...f, rubros: rubrosDist };
    });
  };

  const ppTotalObjetivoRef = useRef(ppTotalObjetivo);
  ppTotalObjetivoRef.current = ppTotalObjetivo;

  const ppUpdateIncidenciaObjetivo = (idx, value) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      let stored;
      if (value === '' || value == null) {
        stored = null;
      } else if (typeof value === 'string' && /[.,]$/.test(value)) {
        const parsed = parseNumberInput(value);
        stored = parsed != null ? parsed : value;
      } else {
        const parsed = Number(value);
        stored = parsed != null && !Number.isNaN(parsed) ? parsed : null;
      }
      rubros[idx] = {
        ...rubros[idx],
        incidencia_objetivo_pct: stored,
      };
      const totalObjetivo = ppTotalObjetivoRef.current;
      const totalParaDistribuir =
        totalObjetivo !== '' && Number(totalObjetivo) >= 0
          ? Number(totalObjetivo) || 0
          : f.rubros.reduce((s, r) => s + (Number(r.monto) || 0), 0);
      const rubrosDist = distribuirMontosPorIncidencia(totalParaDistribuir, rubros);
      return { ...f, rubros: rubrosDist };
    });
  };

  const ppMoveRubro = (idx, dir) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= rubros.length) return f;
      [rubros[idx], rubros[newIdx]] = [rubros[newIdx], rubros[idx]];
      return { ...f, rubros };
    });
  };

  const ppAddTarea = (rubroIdx) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      const newTareaIdx = (rubros[rubroIdx].tareas || []).length;
      ppFocusRef.current = { type: 'tarea', rubroIdx, tareaIdx: newTareaIdx };
      rubros[rubroIdx] = {
        ...rubros[rubroIdx],
        tareas: [...(rubros[rubroIdx].tareas || []), { ...emptyTarea }],
      };
      return { ...f, rubros };
    });
  };

  const ppRemoveTarea = (rubroIdx, tareaIdx) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      rubros[rubroIdx] = {
        ...rubros[rubroIdx],
        tareas: rubros[rubroIdx].tareas.filter((_, i) => i !== tareaIdx),
      };
      return { ...f, rubros };
    });
  };

  const ppUpdateTarea = (rubroIdx, tareaIdx, value) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      const tareas = [...rubros[rubroIdx].tareas];
      tareas[tareaIdx] = { ...tareas[tareaIdx], descripcion: value };
      rubros[rubroIdx] = { ...rubros[rubroIdx], tareas };
      return { ...f, rubros };
    });
  };

  // Calcular total vivo
  const ppTotalVivo = useMemo(() => {
    return ppForm.rubros.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
  }, [ppForm.rubros]);

  // Aplicar plantilla seleccionada al form
  const handleAplicarPlantilla = async (plantillaId) => {
    if (!plantillaId) {
      setPpForm((f) => ({
        ...f,
        plantilla_id: '',
        rubros: [],
        notas_texto: TEXTO_NOTAS_DEFAULT,
      }));
      setPpModoDistribuir(false);
      setPpTotalObjetivo('');
      return;
    }
    setPpTotalObjetivo('');
    try {
      const pl = await PresupuestoProfesionalService.obtenerPlantilla(plantillaId);
      if (pl && pl.rubros) {
        setPpForm((f) => ({
          ...f,
          plantilla_id: plantillaId,
          rubros: pl.rubros.map((r) => ({
            nombre: r.nombre,
            monto: 0,
            incidencia_objetivo_pct:
              r.incidencia_pct_sugerida != null &&
              !Number.isNaN(Number(r.incidencia_pct_sugerida)) &&
              r.incidencia_pct_sugerida >= 0 &&
              r.incidencia_pct_sugerida <= 100
                ? Number(r.incidencia_pct_sugerida)
                : null,
            tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion })),
          })),
          notas_texto: pl.notas?.trim() || '',
        }));
        showAlert('Rubros cargados desde plantilla', 'info');
      }
    } catch (err) {
      showAlert('Error al cargar plantilla', 'error');
    }
  };

  /* ================================================================
     Plantillas: CRUD
     ================================================================ */

  const handleOpenPlCreate = () => {
    setPlForm({ ...emptyPlantilla, rubros: [] });
    setPlIsEdit(false);
    setPlEditId(null);
    setOpenPlForm(true);
  };

  const handleOpenPlEdit = async (row) => {
    try {
      const full = await PresupuestoProfesionalService.obtenerPlantilla(row._id);
      setPlForm({
        nombre: full.nombre || '',
        tipo: full.tipo || '',
        activa: full.activa !== false,
        notas: full.notas || '',
        rubros: (full.rubros || []).map((r) => ({
          nombre: r.nombre || '',
          incidencia_pct_sugerida: r.incidencia_pct_sugerida != null && !Number.isNaN(Number(r.incidencia_pct_sugerida))
            ? Number(r.incidencia_pct_sugerida)
            : null,
          tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
        })),
      });
      setPlIsEdit(true);
      setPlEditId(full._id);
      setOpenPlForm(true);
    } catch (err) {
      showAlert('Error al cargar plantilla', 'error');
    }
  };

  const handleSavePl = async () => {
    if (!empresaId) {
      showAlert('Error: no se pudo resolver la empresa. Recargá la página.', 'error');
      return;
    }
    if (!plForm.nombre?.trim()) {
      showAlert('El nombre es obligatorio', 'warning');
      return;
    }
    const sumaInc = plForm.rubros.reduce((s, r) => s + (Number(r.incidencia_pct_sugerida) || 0), 0);
    if (sumaInc > 100) {
      showAlert('La suma de incidencias no puede superar 100%', 'warning');
      return;
    }
    setPlSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        nombre: plForm.nombre,
        tipo: plForm.tipo || null,
        activa: plForm.activa,
        notas: plForm.notas?.trim() || '',
        rubros: plForm.rubros
          .filter((r) => r.nombre?.trim())
          .map((r) => ({
            nombre: r.nombre.trim(),
            incidencia_pct_sugerida: r.incidencia_pct_sugerida != null && !Number.isNaN(Number(r.incidencia_pct_sugerida))
              ? Number(r.incidencia_pct_sugerida)
              : null,
            tareas: (r.tareas || [])
              .filter((t) => t.descripcion?.trim())
              .map((t) => ({ descripcion: t.descripcion.trim() })),
          })),
      };

      if (plIsEdit) {
        await PresupuestoProfesionalService.actualizarPlantilla(plEditId, payload);
        showAlert('Plantilla actualizada');
      } else {
        await PresupuestoProfesionalService.crearPlantilla(payload);
        showAlert('Plantilla creada');
      }
      setOpenPlForm(false);
      fetchPlantillas();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al guardar plantilla';
      showAlert(msg, 'error');
    } finally {
      setPlSaving(false);
    }
  };

  const handleConfirmDeletePl = async () => {
    if (!plToDelete) return;
    try {
      await PresupuestoProfesionalService.eliminarPlantilla(plToDelete._id);
      showAlert('Plantilla eliminada');
      setOpenPlDelete(false);
      setPlToDelete(null);
      fetchPlantillas();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al eliminar plantilla';
      showAlert(msg, 'error');
    }
  };

  /* ================================================================
     Plantilla rubros editor helpers
     ================================================================ */

  const plAddRubro = () => {
    setPlForm((f) => {
      plFocusRef.current = { type: 'rubro', rubroIdx: f.rubros.length };
      return { ...f, rubros: [...f.rubros, { nombre: '', tareas: [], incidencia_pct_sugerida: null }] };
    });
  };

  const plRemoveRubro = (idx) => {
    setPlForm((f) => ({ ...f, rubros: f.rubros.filter((_, i) => i !== idx) }));
  };

  const plUpdateRubroNombre = (idx, value) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      rubros[idx] = { ...rubros[idx], nombre: value };
      return { ...f, rubros };
    });
  };

  const plUpdateRubroIncidencia = (idx, value) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      const parsed = value === '' || value == null ? null : Number(value);
      rubros[idx] = {
        ...rubros[idx],
        incidencia_pct_sugerida: parsed != null && !Number.isNaN(parsed) ? parsed : null,
      };
      return { ...f, rubros };
    });
  };

  const plAddTarea = (rubroIdx) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      const newTareaIdx = (rubros[rubroIdx].tareas || []).length;
      plFocusRef.current = { type: 'tarea', rubroIdx, tareaIdx: newTareaIdx };
      rubros[rubroIdx] = {
        ...rubros[rubroIdx],
        tareas: [...(rubros[rubroIdx].tareas || []), { descripcion: '' }],
      };
      return { ...f, rubros };
    });
  };

  const plRemoveTarea = (rubroIdx, tareaIdx) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      rubros[rubroIdx] = {
        ...rubros[rubroIdx],
        tareas: rubros[rubroIdx].tareas.filter((_, i) => i !== tareaIdx),
      };
      return { ...f, rubros };
    });
  };

  const plUpdateTarea = (rubroIdx, tareaIdx, value) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      const tareas = [...rubros[rubroIdx].tareas];
      tareas[tareaIdx] = { ...tareas[tareaIdx], descripcion: value };
      rubros[rubroIdx] = { ...rubros[rubroIdx], tareas };
      return { ...f, rubros };
    });
  };

  /* ================================================================
     Importar archivo → plantilla
     ================================================================ */

  const handleImportPlantilla = async () => {
    if (!importFiles.length) {
      showAlert('Seleccioná un archivo', 'warning');
      return;
    }
    if (fileGroupError) {
      showAlert(fileGroupError, 'warning');
      return;
    }
    setImportPhase('uploading');
    setImportLoading(true);
    try {
      setImportPhase('analizando');
      const result = await PresupuestoProfesionalService.uploadPlantilla(
        importFiles,
        empresaId,
        importName,
        importTipo
      );
      const rubrosParseados = (result.rubros || []).map((r) => ({
        nombre: r.nombre || '',
        incidencia_pct_sugerida: r.incidencia_pct_sugerida != null && !Number.isNaN(Number(r.incidencia_pct_sugerida))
          ? Number(r.incidencia_pct_sugerida)
          : null,
        tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
      }));

      // Abrir el form de plantilla con los rubros pre-cargados para que el usuario revise y guarde
      const sourceName = importFiles[0]?.name || '';
      const nombreSug = result.nombre_sugerido || importName || sourceName.replace(/\.[^.]+$/, '') || 'Importada';
      const tipoSug = result.tipo_sugerido || importTipo || '';
      setPlForm({
        nombre: nombreSug,
        tipo: tipoSug,
        activa: true,
        rubros: rubrosParseados,
        notas: result.notas || '',
      });
      setPlIsEdit(false);
      setPlEditId(null);
      setOpenImport(false);
      resetImportDialog();
      setOpenPlForm(true);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al importar';
      showAlert(msg, 'error');
    } finally {
      setImportLoading(false);
      setImportPhase('idle');
    }
  };

  /* ================================================================
     Toggle rubros expandidos en tabla
     ================================================================ */

  const toggleExpanded = (id) => {
    setExpandedRubros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <>
      <Head>
        <title>Presupuestos Profesionales | SorbyData</title>
      </Head>

      <Box component="main" sx={{ flexGrow: 1, pb: 4 }}>
        <Container maxWidth="xl">
          {/* ── Tabs ── */}
          <Tabs
            value={currentTab}
            onChange={(_, v) => setCurrentTab(v)}
            sx={{ mb: 0, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Presupuestos" />
            <Tab label="Plantillas de Rubros" />
          </Tabs>

          {/* ════════════════════════════════════════════════════════
              TAB 0: PRESUPUESTOS
              ════════════════════════════════════════════════════════ */}
          {currentTab === 0 && (
            <>
              {/* ── Filtros ── */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    size="small"
                    label="Buscar por título"
                    value={filtroTitulo}
                    onChange={(e) => { setFiltroTitulo(e.target.value); setPpPage(0); }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                      value={filtroEstado}
                      label="Estado"
                      onChange={(e) => { setFiltroEstado(e.target.value); setPpPage(0); }}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {ESTADOS.map((e) => (
                        <MenuItem key={e} value={e}>{ESTADO_LABEL[e]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Moneda</InputLabel>
                    <Select
                      value={filtroMoneda}
                      label="Moneda"
                      onChange={(e) => { setFiltroMoneda(e.target.value); setPpPage(0); }}
                    >
                      <MenuItem value="">Todas</MenuItem>
                      {MONEDAS.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenPPCreate}>
                    Nuevo presupuesto
                  </Button>
                </Stack>
              </Paper>

              {/* ── Loading ── */}
              {presupuestosLoading && <LinearProgress sx={{ mb: 1 }} />}

              {/* ── Tabla ── */}
              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell>Título</TableCell>
                      <TableCell>Moneda</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Versión</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {presupuestos.length === 0 && !presupuestosLoading && (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No hay presupuestos profesionales aún.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {presupuestos.map((row) => {
                      const isExpanded = expandedRubros.has(row._id);
                      return (
                        <React.Fragment key={row._id}>
                          <TableRow hover>
                            <TableCell sx={{ width: 40 }}>
                              {row.rubros?.length > 0 && (
                                <IconButton size="small" onClick={() => toggleExpanded(row._id)}>
                                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {row.titulo || '(Sin título)'}
                              </Typography>
                            </TableCell>
                            <TableCell>{row.moneda}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.total_neto, row.moneda)}
                              {row.estado === 'aceptado' &&
                                (row.anexos || []).length > 0 && (
                                  <>
                                    <br />
                                    <Typography variant="caption" color="primary">
                                      Actualizado:{' '}
                                      {formatCurrency(
                                        (row.total_neto || 0) +
                                          (row.anexos || []).reduce(
                                            (s, a) => s + (Number(a.monto_diferencia) || 0),
                                            0
                                          ),
                                        row.moneda
                                      )}
                                    </Typography>
                                  </>
                                )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ESTADO_LABEL[row.estado] || row.estado}
                                color={ESTADO_COLOR[row.estado] || 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatDate(row.fecha || row.createdAt)}</TableCell>
                            <TableCell align="center">
                              {row.version_actual > 0 ? `v${row.version_actual}` : '—'}
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0} justifyContent="center">
                                <Tooltip title="Ver detalle">
                                  <IconButton size="small" onClick={() => handleOpenDetalle(row)}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={!row.rubros?.length ? 'Sin rubros' : 'Exportar PDF'}>
                                  <span
                                    style={{ display: 'inline-flex' }}
                                    onClick={() => handleExportPdfFromRow(row)}
                                  >
                                    <IconButton
                                      size="small"
                                      disabled={exportingPdfId === row._id || !row.rubros?.length}
                                    >
                                      {exportingPdfId === row._id ? (
                                        <CircularProgress size={20} />
                                      ) : (
                                        <PictureAsPdfIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {row.estado === 'borrador' && (
                                  <Tooltip title="Editar">
                                    <IconButton size="small" onClick={() => handleOpenPPEdit(row)}>
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {TRANSICIONES_VALIDAS[row.estado]?.length > 0 && (
                                  <Tooltip title="Cambiar estado">
                                    <IconButton size="small" onClick={() => handleOpenCambiarEstado(row)}>
                                      <SwapHorizIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Agregar anexo">
                                  <IconButton size="small" onClick={() => handleOpenAnexo(row)}>
                                    <PostAddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {row.estado === 'borrador' && (
                                  <Tooltip title="Eliminar">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setPpToDelete(row);
                                        setOpenPPDelete(true);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                          {/* Fila expandida con rubros */}
                          {isExpanded && (
                            <TableRow key={`${row._id}-rubros`}>
                              <TableCell colSpan={9} sx={{ py: 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ m: 1, ml: 6 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Rubros ({row.rubros.length})
                                    </Typography>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>#</TableCell>
                                          <TableCell>Rubro</TableCell>
                                          <TableCell align="right">Monto</TableCell>
                                          <TableCell align="right">Incidencia</TableCell>
                                          <TableCell>Tareas</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {row.rubros.map((rubro, ri) => (
                                          <TableRow key={ri}>
                                            <TableCell>{rubro.orden || ri + 1}</TableCell>
                                            <TableCell>{rubro.nombre}</TableCell>
                                            <TableCell align="right">
                                              {formatCurrency(rubro.monto, row.moneda)}
                                            </TableCell>
                                            <TableCell align="right">
                                              {formatPct(rubro.incidencia_pct)}
                                            </TableCell>
                                            <TableCell>
                                              {(rubro.tareas || []).length > 0
                                                ? rubro.tareas.map((t) => t.descripcion).join(', ')
                                                : '—'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={totalPresupuestos}
                  page={ppPage}
                  onPageChange={(_, p) => setPpPage(p)}
                  rowsPerPage={ppRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setPpRowsPerPage(parseInt(e.target.value, 10));
                    setPpPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50]}
                  labelRowsPerPage="Filas por página"
                />
              </Paper>
            </>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 1: PLANTILLAS DE RUBROS
              ════════════════════════════════════════════════════════ */}
          {currentTab === 1 && (
            <>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    Plantillas de rubros reutilizables para tus presupuestos.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => {
                      resetImportDialog();
                      setOpenImport(true);
                    }}
                  >
                    Importar archivo
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenPlCreate}>
                    Nueva plantilla
                  </Button>
                </Stack>
              </Paper>

              {plantillasLoading && <LinearProgress sx={{ mb: 1 }} />}

              <Paper>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="center">Rubros</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Creada</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {plantillas.length === 0 && !plantillasLoading && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No hay plantillas. Creá una o importá desde un archivo.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {plantillas.map((pl) => (
                      <TableRow key={pl._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{pl.nombre}</Typography>
                        </TableCell>
                        <TableCell>{pl.tipo || '—'}</TableCell>
                        <TableCell align="center">{(pl.rubros || []).length}</TableCell>
                        <TableCell>
                          <Chip
                            label={pl.activa ? 'Activa' : 'Inactiva'}
                            color={pl.activa ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(pl.createdAt)}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0} justifyContent="center">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleOpenPlEdit(pl)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Duplicar como nuevo presupuesto">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setPpForm({
                                    ...emptyPresupuesto,
                                    plantilla_id: pl._id,
                                    rubros: (pl.rubros || []).map((r) => ({
                                      nombre: r.nombre,
                                      monto: 0,
                                      incidencia_objetivo_pct:
                                        r.incidencia_pct_sugerida != null &&
                                        !Number.isNaN(Number(r.incidencia_pct_sugerida)) &&
                                        r.incidencia_pct_sugerida >= 0 &&
                                        r.incidencia_pct_sugerida <= 100
                                          ? Number(r.incidencia_pct_sugerida)
                                          : null,
                                      tareas: (r.tareas || []).map((t) => ({
                                        descripcion: t.descripcion,
                                      })),
                                    })),
                                  });
                                  setPpIsEdit(false);
                                  setPpEditId(null);
                                  setCurrentTab(0);
                                  setOpenPPForm(true);
                                  showAlert('Rubros de plantilla cargados. Completá el presupuesto.', 'info');
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setPlToDelete(pl);
                                  setOpenPlDelete(true);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          )}
        </Container>
      </Box>

      {/* ════════════════════════════════════════════════════════════
          DIALOGS
          ════════════════════════════════════════════════════════════ */}

      <PresupuestoFormDialog
        open={openPPForm}
        onClose={() => setOpenPPForm(false)}
        isEdit={ppIsEdit}
        form={ppForm}
        onFormChange={setPpForm}
        plantillas={plantillas}
        totalVivo={ppTotalVivo}
        totalObjetivo={ppTotalObjetivo}
        saving={ppSaving}
        onSave={handleSavePP}
        onAplicarPlantilla={handleAplicarPlantilla}
        modoDistribuir={ppModoDistribuir}
        onModoDistribuirChange={(checked) => {
          setPpModoDistribuir(checked);
          if (!checked) setPpTotalObjetivo('');
        }}
        onDistribuirPorTotal={ppDistribuirPorTotal}
        onUpdateIncidenciaObjetivo={ppUpdateIncidenciaObjetivo}
        addRubro={ppAddRubro}
        removeRubro={ppRemoveRubro}
        updateRubro={ppUpdateRubro}
        moveRubro={ppMoveRubro}
        addTarea={ppAddTarea}
        removeTarea={ppRemoveTarea}
        updateTarea={ppUpdateTarea}
        focusRef={ppFocusRef}
      />

      <PresupuestoDeleteDialog
        open={openPPDelete}
        onClose={() => setOpenPPDelete(false)}
        presupuesto={ppToDelete}
        onConfirm={handleConfirmDeletePP}
      />

      <CambiarEstadoDialog
        open={openEstado}
        onClose={() => setOpenEstado(false)}
        presupuesto={estadoTarget}
        nuevoEstado={nuevoEstado}
        onNuevoEstadoChange={setNuevoEstado}
        onConfirm={handleConfirmCambiarEstado}
      />

      <PresupuestoDetalleDialog
        open={openDetalle}
        onClose={() => setOpenDetalle(false)}
        data={detalleData}
        loading={detalleLoading}
        tab={detalleTab}
        onTabChange={setDetalleTab}
        onExportPDF={handleExportPdfFromDetalle}
        exportingPdf={detallePdfExporting}
        onAgregarAnexo={detalleData ? () => handleOpenAnexo(detalleData) : undefined}
      />

      <AgregarAnexoDialog
        open={openAnexo}
        onClose={() => setOpenAnexo(false)}
        presupuesto={anexoTarget}
        form={anexoForm}
        onFormChange={setAnexoForm}
        onConfirm={handleConfirmAnexo}
      />

      <PlantillaFormDialog
        open={openPlForm}
        onClose={() => setOpenPlForm(false)}
        isEdit={plIsEdit}
        form={plForm}
        onFormChange={setPlForm}
        saving={plSaving}
        onSave={handleSavePl}
        addRubro={plAddRubro}
        removeRubro={plRemoveRubro}
        updateRubroNombre={plUpdateRubroNombre}
        updateRubroIncidencia={plUpdateRubroIncidencia}
        addTarea={plAddTarea}
        removeTarea={plRemoveTarea}
        updateTarea={plUpdateTarea}
        focusRef={plFocusRef}
      />

      <PlantillaDeleteDialog
        open={openPlDelete}
        onClose={() => setOpenPlDelete(false)}
        plantilla={plToDelete}
        onConfirm={handleConfirmDeletePl}
      />

      <ImportarPlantillaDialog
        open={openImport}
        onClose={handleCloseImportDialog}
        importFiles={importFiles}
        onAddFiles={handleAddImportFiles}
        onRemoveFile={handleRemoveImportFile}
        onMoveFile={handleMoveImportFile}
        fileGroupError={fileGroupError}
        onImport={handleImportPlantilla}
        loading={importLoading}
        nombre={importName}
        tipo={importTipo}
        onNombreChange={setImportName}
        onTipoChange={setImportTipo}
        status={importPhase}
      />

      {/* ── Snackbar global ── */}
      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={closeAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeAlert} severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default function Page() {
  return (
    <DashboardLayout title="Presupuestos Profesionales">
      <PresupuestosProfesionales />
    </DashboardLayout>
  );
}
