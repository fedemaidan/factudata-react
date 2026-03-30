import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';
import presupuestoService from 'src/services/presupuestoService';
import MonedasService from 'src/services/monedasService';
import cacService from 'src/services/cacService';
import usePresupuestosList from 'src/hooks/presupuestosProfesionales/usePresupuestosList';
import usePlantillasList from 'src/hooks/presupuestosProfesionales/usePlantillasList';
import usePlantillaImport from 'src/hooks/presupuestosProfesionales/usePlantillaImport';
import { getM2BaseFromPresupuesto } from 'src/utils/presupuestos/presupuestoM2Base';
import { validateLogoFileForUpload } from 'src/utils/presupuestos/logoFileValidation';
import {
  PresupuestoFormDialog,
  PresupuestoDeleteDialog,
  PresupuestoDetalleDialog,
  AgregarAnexoDialog,
  AceptarPresupuestoModal,
  PlantillaFormDialog,
  PlantillaDeleteDialog,
  ImportarPlantillaDialog,
  PresupuestosFilters,
  PresupuestosTableRow,
  PlantillasTable,
  distribuirMontosPorIncidencia,
  plantillaRubrosToPresupuestoRubros,
  ESTADOS,
  ESTADO_LABEL,
  ESTADO_COLOR,
  MONEDAS,
  formatCurrency,
  formatPct,
  TEXTO_NOTAS_DEFAULT,
  PLANTILLA_SORBYDATA_ID,
  PLANTILLA_SORBYDATA,
  parseNumberInput,
  CAC_TIPOS,
  INDEXACION_VALUES,
  USD_FUENTES,
  USD_VALORES,
  hoyIso,
  toMesAnterior,
  normalizarAjusteMoneda,
} from 'src/components/presupuestosProfesionales';

/* ================================================================
   Formulario vacío – Presupuesto
   ================================================================ */

const presupuestoFechaDocAFormIso = (fechaVal) => {
  if (fechaVal == null || fechaVal === '') return hoyIso();
  const dt = fechaVal instanceof Date ? fechaVal : new Date(fechaVal);
  if (Number.isNaN(dt.getTime())) return hoyIso();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const emptyPresupuesto = {
  titulo: '',
  fecha: '',
  proyecto_id: '',
  proyecto_nombre: '',
  obra_direccion: '',
  moneda: 'ARS',
  indexacion: INDEXACION_VALUES.FIJO,
  cac_tipo: CAC_TIPOS.GENERAL,
  base_calculo: 'total',
  usd_fuente: USD_FUENTES.OFICIAL,
  usd_valor: USD_VALORES.PROMEDIO,
  empresa_logo_url: '',
  header_bg_color: '#0a4791',
  header_text_color: '#ffffff',
  rubros: [],
  notas_texto: '',
  analisis_superficies: {
    sup_cubierta_m2: '',
    sup_patios_m2: '',
    coef_patios: 0.5,
    sup_vereda_m2: '',
    coef_vereda: 0.25,
    sup_ponderada_m2: '',
  },
  plantilla_id: '',
  plantilla_notas_id: '',
};

const emptyRubro = { nombre: '', monto: 0, incidencia_objetivo_pct: null, tareas: [] };
const emptyTarea = { descripcion: '' };

const presupuestoConSuperficieParaPdf = (p) =>
  p && typeof p === 'object'
    ? { ...p, analisis_superficies: p.analisis_superficies ?? emptyPresupuesto.analisis_superficies }
    : p;

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

  // ── Tab principal ──
  const [currentTab, setCurrentTab] = useState(0);

  // ── Presupuestos: lista ──
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
  const [ppLogoFile, setPpLogoFile] = useState(null);
  const [ppLogoPreviewUrl, setPpLogoPreviewUrl] = useState('');
  const [ppModoDistribuir, setPpModoDistribuir] = useState(false);
  const [ppTotalObjetivo, setPpTotalObjetivo] = useState('');

  useEffect(() => {
    return () => {
      if (ppLogoPreviewUrl) URL.revokeObjectURL(ppLogoPreviewUrl);
    };
  }, [ppLogoPreviewUrl]);

  // ── Presupuestos: eliminar ──
  const [openPPDelete, setOpenPPDelete] = useState(false);
  const [ppToDelete, setPpToDelete] = useState(null);

  // ── Presupuestos: cambiar estado (inline en tabla) ──
  const [changingEstadoId, setChangingEstadoId] = useState(null);

  // ── Presupuestos: aceptar → modal proyecto para control ──
  const [aceptarModal, setAceptarModal] = useState({ open: false, row: null });
  const [proyectos, setProyectos] = useState([]);

  // ── Presupuestos: detalle / versiones ──
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalleData, setDetalleData] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleTab, setDetalleTab] = useState(0);
  const [detallePdfExporting, setDetallePdfExporting] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState(null);
  const [pdfExportOpcionesOpen, setPdfExportOpcionesOpen] = useState(false);
  const [pdfIncluirTotalesM2, setPdfIncluirTotalesM2] = useState(true);
  const [pdfExportCtx, setPdfExportCtx] = useState(null);

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

  // ── Plantillas: formulario crear / editar ──
  const [openPlForm, setOpenPlForm] = useState(false);
  const [plIsEdit, setPlIsEdit] = useState(false);
  const [plForm, setPlForm] = useState(emptyPlantilla);
  const [plEditId, setPlEditId] = useState(null);
  const [plSaving, setPlSaving] = useState(false);

  // ── Plantillas: eliminar ──
  const [openPlDelete, setOpenPlDelete] = useState(false);
  const [plToDelete, setPlToDelete] = useState(null);

  // ── Rubros expandidos ──
  const [expandedRubros, setExpandedRubros] = useState(new Set());

  // ── Focus refs para auto-focus al agregar tarea/rubro ──
  const ppFocusRef = useRef(null);
  const plFocusRef = useRef(null);

  // ── Snackbar ──
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, open: false }));
  }, []);
  const showAlert = useCallback((message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  }, []);

  const {
    presupuestos,
    presupuestosLoading,
    totalPresupuestos,
    refreshPresupuestos,
  } = usePresupuestosList({
    empresaId,
    currentTab,
    ppPage,
    ppRowsPerPage,
    filtroEstado,
    filtroMoneda,
    filtroTitulo,
    showAlert,
  });

  const { plantillas, plantillasLoading, refreshPlantillas } = usePlantillasList({
    empresaId,
    currentTab,
    showAlert,
  });

  const {
    openImport,
    importFiles,
    importLoading,
    importName,
    importTipo,
    importPhase,
    fileGroupError,
    setImportName,
    setImportTipo,
    handleOpenImportDialog,
    handleCloseImportDialog,
    handleAddImportFiles,
    handleRemoveImportFile,
    handleMoveImportFile,
    handleImportPlantilla,
  } = usePlantillaImport({
    empresaId,
    showAlert,
    onImportSuccess: (formData) => {
      setPlForm(formData);
      setPlIsEdit(false);
      setPlEditId(null);
      setOpenPlForm(true);
    },
  });

  /* ================================================================
     Init: cargar empresa, plantillas
     ================================================================ */

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [empresa, proyectosData] = await Promise.all([
          getEmpresaDetailsFromUser(user),
          getProyectosFromUser(user),
        ]);
        if (empresa) {
          setEmpresaId(empresa.id);
          setEmpresaNombre(empresa.nombre || '');
        }
        setProyectos(proyectosData || []);
      } catch (err) {
        console.error('Error inicializando presupuestos profesionales:', err);
      }
    })();
  }, [user]);

  /* ================================================================
     Presupuesto: Crear / Editar
     ================================================================ */

  const resolverCotizacionSnapshot = async (form) => {
    const ajuste = normalizarAjusteMoneda(form);
    const fechaRef = (form.fecha && String(form.fecha).trim()) || hoyIso();
    const snap = form.cotizacion_snapshot;
    const snapValor = snap?.valor;
    const tieneOverride = snap && Number.isFinite(Number(snapValor)) && Number(snapValor) > 0;

    if (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) {
      if (tieneOverride && snap.tipo === 'USD') {
        return {
          tipo: 'USD',
          fuente: ajuste.usd_fuente,
          referencia: ajuste.usd_valor,
          valor: Number(snapValor),
          fecha_origen: form.cotizacion_snapshot?.fecha_origen || fechaRef,
        };
      }
      const dolarData = await MonedasService.obtenerDolar(fechaRef);
      const valorUsd = pickUsdValue(dolarData, ajuste.usd_fuente, ajuste.usd_valor);
      if (!valorUsd) {
        throw new Error(`No hay cotización USD ${ajuste.usd_fuente}/${ajuste.usd_valor} para ${fechaRef}`);
      }
      return {
        tipo: 'USD',
        fuente: ajuste.usd_fuente,
        referencia: ajuste.usd_valor,
        valor: valorUsd,
        fecha_origen: dolarData?.fecha || fechaRef,
      };
    }

    if (ajuste.indexacion === INDEXACION_VALUES.CAC) {
      if (tieneOverride && snap.tipo === 'CAC') {
        return {
          tipo: 'CAC',
          fuente: 'cac',
          referencia: ajuste.cac_tipo,
          valor: Number(snapValor),
          fecha_origen: form.cotizacion_snapshot?.fecha_origen || fechaRef,
        };
      }
      const mesReferencia = toMesAnterior(fechaRef);
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
      fecha: hoyIso(),
      plantilla_id: '',
      plantilla_notas_id: '',
      notas_texto: TEXTO_NOTAS_DEFAULT,
    });
    setPpIsEdit(false);
    setPpEditId(null);
    setPpLogoFile(null);
    setPpLogoPreviewUrl('');
    setPpModoDistribuir(false);
    setPpTotalObjetivo('');
    setOpenPPForm(true);
  };

  const handleOpenPPEdit = async (row) => {
    try {
      const full = await PresupuestoProfesionalService.obtenerPorId(row._id);
      setPpForm({
        titulo: full.titulo || '',
        fecha: presupuestoFechaDocAFormIso(full.fecha),
        proyecto_id: full.proyecto_id || '',
        proyecto_nombre: full.proyecto_nombre || '',
        obra_direccion: full.obra_direccion || '',
        moneda: full.moneda || 'ARS',
        indexacion: full.indexacion ?? ((full.moneda || 'ARS') === 'USD' ? INDEXACION_VALUES.USD : INDEXACION_VALUES.FIJO),
        cac_tipo: full.cac_tipo || CAC_TIPOS.GENERAL,
        base_calculo: full.base_calculo || 'total',
        usd_fuente: full.usd_fuente || USD_FUENTES.OFICIAL,
        usd_valor: full.usd_valor || USD_VALORES.PROMEDIO,
        cotizacion_snapshot: full.cotizacion_snapshot || null,
        plantilla_notas_id: '',
        empresa_logo_url: full.empresa_logo_url || '',
        header_bg_color: full.header_bg_color || '#0a4791',
        header_text_color: full.header_text_color || '#ffffff',
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
          const d = Number(full.analisis_superficies?.sup_vereda_m2) || 0;
          const e = Number(full.analisis_superficies?.coef_vereda) >= 0
            ? (Number(full.analisis_superficies?.coef_vereda) || 0.25)
            : 0.25;
          const computed = a >= 0 && b >= 0 && d >= 0 ? Math.round((a + b * c + d * e) * 100) / 100 : '';
          return {
            sup_cubierta_m2: full.analisis_superficies?.sup_cubierta_m2 ?? '',
            sup_patios_m2: full.analisis_superficies?.sup_patios_m2 ?? '',
            coef_patios: full.analisis_superficies?.coef_patios ?? 0.5,
            sup_vereda_m2: full.analisis_superficies?.sup_vereda_m2 ?? '',
            coef_vereda: full.analisis_superficies?.coef_vereda ?? 0.25,
            sup_ponderada_m2: computed,
          };
        })(),
        plantilla_id: '',
      });
      setPpIsEdit(true);
      setPpEditId(full._id);
      setPpLogoFile(null);
      setPpLogoPreviewUrl('');
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

      const userEmail = user?.email;
      const fechaPresupuestoIso = (ppForm.fecha && String(ppForm.fecha).trim()) || hoyIso();
      const payload = {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        titulo: ppForm.titulo,
        ...(userEmail && !ppIsEdit ? { creado_por_user_id: userEmail } : {}),
        proyecto_id: ppForm.proyecto_id || null,
        proyecto_nombre: ppForm.proyecto_nombre || null,
        obra_direccion: ppForm.obra_direccion || null,
        moneda: ajuste.moneda,
        fecha: fechaPresupuestoIso,
        fecha_presupuesto: fechaPresupuestoIso,
        indexacion: ajuste.moneda === 'ARS' ? ajuste.indexacion : INDEXACION_VALUES.USD,
        cac_tipo: ajuste.indexacion === INDEXACION_VALUES.CAC ? ajuste.cac_tipo : null,
        base_calculo: ppForm.base_calculo || 'total',
        usd_fuente: (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) ? ajuste.usd_fuente : null,
        usd_valor: (ajuste.moneda === 'USD' || ajuste.indexacion === INDEXACION_VALUES.USD) ? ajuste.usd_valor : null,
        cotizacion_snapshot: cotizacionSnapshot,
        empresa_logo_url: ppForm.empresa_logo_url || null,
        header_bg_color: ppForm.header_bg_color || '#0a4791',
        header_text_color: ppForm.header_text_color || '#ffffff',
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
          const d = Number(as.sup_vereda_m2) || 0;
          const e = Number(as.coef_vereda) >= 0 ? (Number(as.coef_vereda) || 0.25) : 0.25;
          const supPonderada = a >= 0 && b >= 0 && d >= 0 ? Math.round((a + b * c + d * e) * 100) / 100 : null;
          return {
            ...as,
            sup_cubierta_m2: as.sup_cubierta_m2 !== '' && as.sup_cubierta_m2 != null ? Number(as.sup_cubierta_m2) : null,
            sup_patios_m2: as.sup_patios_m2 !== '' && as.sup_patios_m2 != null ? Number(as.sup_patios_m2) : null,
            coef_patios: c,
            sup_vereda_m2: as.sup_vereda_m2 !== '' && as.sup_vereda_m2 != null ? Number(as.sup_vereda_m2) : null,
            coef_vereda: e,
            sup_ponderada_m2: supPonderada,
          };
        })(),
      };


      if (ppIsEdit) {
        await PresupuestoProfesionalService.actualizar(ppEditId, payload);
        showAlert('Presupuesto actualizado');
      } else {
        await PresupuestoProfesionalService.crear(payload, ppLogoFile);
        showAlert('Presupuesto creado');
      }
      setOpenPPForm(false);
      setPpLogoFile(null);
      setPpLogoPreviewUrl('');
      refreshPresupuestos();
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
      refreshPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al eliminar';
      showAlert(msg, 'error');
    }
  };

  /* ================================================================
     Presupuesto: Cambiar Estado (inline en columna Estado)
     ================================================================ */

  const handleCambiarEstado = async (row, nuevoEstado) => {
    if (!row?._id || !nuevoEstado || nuevoEstado === row.estado) return;
    if (nuevoEstado === 'aceptado') {
      setAceptarModal({ open: true, row });
      return;
    }
    setChangingEstadoId(row._id);
    const userEmail = user?.email;
    try {
      await PresupuestoProfesionalService.cambiarEstado(row._id, nuevoEstado, userEmail ? { user_id: userEmail } : {});
      showAlert(`Estado cambiado a "${ESTADO_LABEL[nuevoEstado]}"`);
      refreshPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al cambiar estado';
      showAlert(msg, 'error');
    } finally {
      setChangingEstadoId(null);
    }
  };

  const mapCotizacionOverride = (snap) => {
    if (!snap || typeof snap !== 'object') return null;
    const valor = Number(snap.valor);
    if (!Number.isFinite(valor) || valor <= 0) return null;
    if (snap.tipo === 'CAC') return { cac_indice: valor };
    if (snap.tipo === 'USD') return { dolar_blue: valor };
    return null;
  };

  const aplicarAnexosAControl = async (anexos, rubros, totalNeto, rubroToControlId, creadoPor) => {
    if (!anexos?.length || !rubros?.length) return;
    for (const anexo of anexos) {
      const concepto = anexo.motivo || 'Anexo';
      const rubrosAfectados = anexo.rubros_afectados || [];
      const montoDiferencia = Number(anexo.monto_diferencia) || 0;

      if (rubrosAfectados.length > 0) {
        for (const af of rubrosAfectados) {
          const presupuestoId = rubroToControlId[af.rubro_nombre];
          if (!presupuestoId) continue;
          const monto = (Number(af.monto_nuevo) || 0) - (Number(af.monto_anterior) || 0);
          if (monto === 0) continue;
          try {
            await presupuestoService.agregarAdicional(presupuestoId, { concepto, monto, creadoPor });
          } catch (e) {
            console.warn('Error al agregar anexo al control:', e);
          }
        }
      } else if (montoDiferencia !== 0 && totalNeto > 0) {
        for (const rubro of rubros) {
          const presupuestoId = rubroToControlId[rubro.nombre];
          if (!presupuestoId) continue;
          const montoRubro = Number(rubro.monto) || 0;
          const monto = (montoDiferencia * montoRubro) / totalNeto;
          if (Math.abs(monto) < 0.01) continue;
          try {
            await presupuestoService.agregarAdicional(presupuestoId, { concepto, monto, creadoPor });
          } catch (e) {
            console.warn('Error al agregar anexo al control:', e);
          }
        }
      }
    }
  };

  const handleConfirmarAceptar = async (proyectoId, tipo = 'ingreso') => {
    const row = aceptarModal.row;
    if (!row?._id || !proyectoId || !empresaId) return;
    if (!row.rubros?.length) {
      showAlert('El presupuesto no tiene rubros', 'warning');
      return;
    }
    setChangingEstadoId(row._id);
    try {
      const full = await PresupuestoProfesionalService.obtenerPorId(row._id);
      const cotizacionOverride = mapCotizacionOverride(full.cotizacion_snapshot);
      const rubros = full.rubros || row.rubros;
      const presupuestosToCreate = rubros.map((rubro) => ({
        empresa_id: empresaId,
        proyecto_id: proyectoId,
        tipo,
        monto: rubro.monto,
        moneda: full.moneda || row.moneda || 'ARS',
        indexacion: full.indexacion || row.indexacion || null,
        base_calculo: full.base_calculo || row.base_calculo || 'total',
        fecha_presupuesto: full.fecha_presupuesto || row.fecha_presupuesto || new Date().toISOString().slice(0, 10),
        cac_tipo: (full.indexacion || row.indexacion) === 'CAC' ? (full.cac_tipo || row.cac_tipo || 'general') : null,
        etapa: rubro.nombre,
        categoria: null,
        subcategoria: null,
        cotizacion_override: cotizacionOverride,
      }));
      const results = await Promise.all(presupuestosToCreate.map((p) => presupuestoService.crearPresupuesto(p)));
      const rubroToControlId = {};
      rubros.forEach((rubro, i) => {
        const presup = results[i]?.presupuesto;
        if (presup?.id) rubroToControlId[rubro.nombre] = presup.id;
      });
      const totalNeto = Number(full.total_neto) || rubros.reduce((s, r) => s + (Number(r.monto) || 0), 0);
      if (full.anexos?.length > 0) {
        await aplicarAnexosAControl(
          full.anexos,
          rubros,
          totalNeto,
          rubroToControlId,
          user?.email || null
        );
      }
      await PresupuestoProfesionalService.cambiarEstado(row._id, 'aceptado', user?.email ? { user_id: user.email } : {});
      showAlert(`Presupuesto aceptado. Se crearon ${presupuestosToCreate.length} presupuestos de control.`);
      setAceptarModal({ open: false, row: null });
      refreshPresupuestos();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al crear control de presupuestos';
      showAlert(msg, 'error');
    } finally {
      setChangingEstadoId(null);
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

  const openPdfExportOpciones = useCallback((ctx) => {
    setPdfIncluirTotalesM2(true);
    setPdfExportCtx(ctx);
    setPdfExportOpcionesOpen(true);
  }, []);

  const ejecutarExportPresupuestoPdf = async (ctx, incluirTotalesM2, options = {}) => {
    const { rowFull } = options;
    try {
      const { exportPresupuestoToPdfRenderer } = await import(
        '../utils/presupuestos/exportPresupuestoToPdfRenderer'
      );
      const opts = {
        empresa: { nombre: empresaNombre },
        incluirTotalesM2,
      };

      if (ctx.source === 'row') {
        setExportingPdfId(ctx.row._id);
        const full =
          rowFull ||
          ctx.prefetchedFull ||
          (await PresupuestoProfesionalService.obtenerPorId(ctx.row._id));
        await exportPresupuestoToPdfRenderer(presupuestoConSuperficieParaPdf(full), opts);
        showAlert('PDF descargado', 'success');
      } else {
        setDetallePdfExporting(true);
        await exportPresupuestoToPdfRenderer(presupuestoConSuperficieParaPdf(detalleData), opts);
        showAlert('PDF descargado', 'success');
      }
    } catch (err) {
      console.error('Error exportando presupuesto a PDF:', err);
      showAlert('Error al generar el PDF', 'error');
    } finally {
      if (ctx.source === 'row') {
        setExportingPdfId((current) => (current === ctx.row._id ? null : current));
      } else {
        setDetallePdfExporting(false);
      }
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
      const base = getM2BaseFromPresupuesto(presupuestoConSuperficieParaPdf(full));
      if (base <= 0) {
        await ejecutarExportPresupuestoPdf({ source: 'row', row }, false, { rowFull: full });
      } else {
        setExportingPdfId(null);
        openPdfExportOpciones({ source: 'row', row, prefetchedFull: full });
      }
    } catch (err) {
      console.error('Error preparando PDF:', err);
      showAlert('Error al obtener el presupuesto', 'error');
      setExportingPdfId((current) => (current === row._id ? null : current));
    }
  };

  const handleExportPdfFromDetalle = () => {
    if (!detalleData) return;
    if (!detalleData.rubros?.length) {
      showAlert('El presupuesto no tiene rubros', 'warning');
      return;
    }
    const base = getM2BaseFromPresupuesto(presupuestoConSuperficieParaPdf(detalleData));
    if (base <= 0) {
      void ejecutarExportPresupuestoPdf({ source: 'detalle' }, false);
      return;
    }
    openPdfExportOpciones({ source: 'detalle' });
  };

  const handleCancelPdfExportOpciones = () => {
    setPdfExportOpcionesOpen(false);
    setPdfExportCtx(null);
  };

  const handleConfirmPdfExportOpciones = async () => {
    if (!pdfExportCtx) return;
    const ctx = pdfExportCtx;
    const incluir = pdfIncluirTotalesM2;
    setPdfExportOpcionesOpen(false);
    setPdfExportCtx(null);
    await ejecutarExportPresupuestoPdf(ctx, incluir);
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
    const userEmail = user?.email;
    try {
      await PresupuestoProfesionalService.agregarAnexo(anexoTarget._id, {
        motivo: anexoForm.motivo.trim(),
        tipo: anexoForm.tipo,
        monto,
        fecha: anexoForm.fecha || undefined,
        detalle: anexoForm.detalle?.trim() || undefined,
        impacto: anexoForm.tipo === 'modificacion' ? anexoForm.impacto : undefined,
        ...(userEmail ? { user_id: userEmail } : {}),
      });
      showAlert('Anexo agregado correctamente');
      setOpenAnexo(false);
      setAnexoTarget(null);
      refreshPresupuestos();
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
        stored = value;
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

  const ppMoveTarea = (rubroIdx, tareaIdx, dir) => {
    setPpForm((f) => {
      const rubros = [...f.rubros];
      const tareas = [...(rubros[rubroIdx].tareas || [])];
      const newIdx = tareaIdx + dir;
      if (newIdx < 0 || newIdx >= tareas.length) return f;
      [tareas[tareaIdx], tareas[newIdx]] = [tareas[newIdx], tareas[tareaIdx]];
      rubros[rubroIdx] = { ...rubros[rubroIdx], tareas };
      return { ...f, rubros };
    });
  };

  // Calcular total vivo
  const ppTotalVivo = useMemo(() => {
    return ppForm.rubros.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
  }, [ppForm.rubros]);

  const handleAplicarPlantilla = async (plantillaId) => {
    if (!plantillaId) {
      setPpForm((f) => ({
        ...f,
        plantilla_id: '',
        rubros: [],
      }));
      setPpModoDistribuir(false);
      setPpTotalObjetivo('');
      return;
    }
    setPpTotalObjetivo('');
    if (plantillaId === PLANTILLA_SORBYDATA_ID) {
      const pl = PLANTILLA_SORBYDATA;
      setPpForm((f) => ({
        ...f,
        plantilla_id: PLANTILLA_SORBYDATA_ID,
        rubros: plantillaRubrosToPresupuestoRubros(pl.rubros),
      }));
      showAlert('Rubros cargados desde Plantilla SorbyData', 'info');
      return;
    }
    try {
      const pl = await PresupuestoProfesionalService.obtenerPlantilla(plantillaId);
      if (pl && pl.rubros) {
        setPpForm((f) => ({
          ...f,
          plantilla_id: plantillaId,
          rubros: plantillaRubrosToPresupuestoRubros(pl.rubros),
        }));
        showAlert('Rubros cargados desde plantilla', 'info');
      }
    } catch (err) {
      showAlert('Error al cargar plantilla', 'error');
    }
  };

  const handleAplicarPlantillaNotas = async (plantillaNotasId) => {
    if (!plantillaNotasId) {
      setPpForm((f) => ({
        ...f,
        plantilla_notas_id: '',
        notas_texto: TEXTO_NOTAS_DEFAULT,
      }));
      return;
    }
    if (plantillaNotasId === PLANTILLA_SORBYDATA_ID) {
      const pl = PLANTILLA_SORBYDATA;
      setPpForm((f) => ({
        ...f,
        plantilla_notas_id: PLANTILLA_SORBYDATA_ID,
        notas_texto: pl.notas?.trim() || TEXTO_NOTAS_DEFAULT,
      }));
      showAlert('Notas cargadas desde Plantilla SorbyData', 'info');
      return;
    }
    try {
      const pl = await PresupuestoProfesionalService.obtenerPlantilla(plantillaNotasId);
      if (pl) {
        setPpForm((f) => ({
          ...f,
          plantilla_notas_id: plantillaNotasId,
          notas_texto: pl.notas?.trim() || TEXTO_NOTAS_DEFAULT,
        }));
        showAlert('Notas cargadas desde plantilla', 'info');
      }
    } catch (err) {
      showAlert('Error al cargar notas de plantilla', 'error');
    }
  };

  const handleUploadLogo = async (file) => {
    if (!file) return;
    const check = validateLogoFileForUpload(file);
    if (!check.ok) {
      showAlert(check.message, 'warning');
      return;
    }
    if (ppLogoPreviewUrl) URL.revokeObjectURL(ppLogoPreviewUrl);
    setPpLogoFile(file);
    setPpLogoPreviewUrl(URL.createObjectURL(file));
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
      refreshPlantillas();
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
      refreshPlantillas();
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

  const plMoveTarea = (rubroIdx, tareaIdx, dir) => {
    setPlForm((f) => {
      const rubros = [...f.rubros];
      const tareas = [...(rubros[rubroIdx].tareas || [])];
      const newIdx = tareaIdx + dir;
      if (newIdx < 0 || newIdx >= tareas.length) return f;
      [tareas[tareaIdx], tareas[newIdx]] = [tareas[newIdx], tareas[tareaIdx]];
      rubros[rubroIdx] = { ...rubros[rubroIdx], tareas };
      return { ...f, rubros };
    });
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
              <PresupuestosFilters
                filtroTitulo={filtroTitulo}
                onFiltroTituloChange={(value) => {
                  setFiltroTitulo(value);
                  setPpPage(0);
                }}
                filtroEstado={filtroEstado}
                onFiltroEstadoChange={(value) => {
                  setFiltroEstado(value);
                  setPpPage(0);
                }}
                estados={ESTADOS}
                estadoLabel={ESTADO_LABEL}
                filtroMoneda={filtroMoneda}
                onFiltroMonedaChange={(value) => {
                  setFiltroMoneda(value);
                  setPpPage(0);
                }}
                monedas={MONEDAS}
                onNuevoPresupuesto={handleOpenPPCreate}
              />

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
                    {presupuestos.map((row) => (
                      <PresupuestosTableRow
                        key={row._id}
                        row={row}
                        isExpanded={expandedRubros.has(row._id)}
                        exportingPdfId={exportingPdfId}
                        changingEstadoId={changingEstadoId}
                        onToggleExpanded={toggleExpanded}
                        onOpenDetalle={handleOpenDetalle}
                        onExportPdf={handleExportPdfFromRow}
                        onOpenEdit={handleOpenPPEdit}
                        onCambiarEstado={handleCambiarEstado}
                        onOpenAnexo={handleOpenAnexo}
                        onDelete={(target) => {
                          setPpToDelete(target);
                          setOpenPPDelete(true);
                        }}
                      />
                    ))}
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
            <PlantillasTable
              plantillas={plantillas}
              plantillasLoading={plantillasLoading}
              sorbyRubrosCount={PLANTILLA_SORBYDATA.rubros.length}
              onImportarArchivo={handleOpenImportDialog}
              onNuevaPlantilla={handleOpenPlCreate}
              onDuplicarSorbyData={() => {
                setPpForm({
                  ...emptyPresupuesto,
                  fecha: hoyIso(),
                  plantilla_id: PLANTILLA_SORBYDATA_ID,
                  plantilla_notas_id: PLANTILLA_SORBYDATA_ID,
                  notas_texto: PLANTILLA_SORBYDATA.notas?.trim() || TEXTO_NOTAS_DEFAULT,
                  rubros: plantillaRubrosToPresupuestoRubros(PLANTILLA_SORBYDATA.rubros),
                });
                setPpIsEdit(false);
                setPpEditId(null);
                setCurrentTab(0);
                setOpenPPForm(true);
                showAlert('Rubros de plantilla cargados. Completá el presupuesto.', 'info');
              }}
              onEditarPlantilla={handleOpenPlEdit}
              onDuplicarPlantilla={(pl) => {
                setPpForm({
                  ...emptyPresupuesto,
                  fecha: hoyIso(),
                  plantilla_id: pl._id,
                  plantilla_notas_id: pl._id,
                  notas_texto: pl.notas?.trim() || TEXTO_NOTAS_DEFAULT,
                  rubros: plantillaRubrosToPresupuestoRubros(pl.rubros),
                });
                setPpIsEdit(false);
                setPpEditId(null);
                setCurrentTab(0);
                setOpenPPForm(true);
                showAlert('Rubros de plantilla cargados. Completá el presupuesto.', 'info');
              }}
              onEliminarPlantilla={(pl) => {
                setPlToDelete(pl);
                setOpenPlDelete(true);
              }}
            />
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
        onAplicarPlantillaNotas={handleAplicarPlantillaNotas}
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
        moveTarea={ppMoveTarea}
        focusRef={ppFocusRef}
        logoUploading={ppSaving}
        logoPreviewUrl={ppLogoPreviewUrl}
        onUploadLogo={handleUploadLogo}
        onLogoPickError={(msg) => showAlert(msg, 'warning')}
        onRemoveLogo={() => {
          setPpLogoFile(null);
          setPpLogoPreviewUrl('');
          setPpForm((prev) => ({ ...prev, empresa_logo_url: '' }));
        }}
      />

      <PresupuestoDeleteDialog
        open={openPPDelete}
        onClose={() => setOpenPPDelete(false)}
        presupuesto={ppToDelete}
        onConfirm={handleConfirmDeletePP}
      />

      <Dialog open={pdfExportOpcionesOpen} onClose={handleCancelPdfExportOpciones} fullWidth maxWidth="sm">
        <DialogTitle>Exportar PDF</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Podés incluir o no los importes por metro cuadrado (ARS, USD, CAC) junto al total del presupuesto,
            y el promedio monetario en la sección &quot;Análisis de superficies&quot;.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={pdfIncluirTotalesM2}
                onChange={(e) => setPdfIncluirTotalesM2(e.target.checked)}
              />
            }
            label="Incluir totales por m² en el PDF"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancelPdfExportOpciones}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmPdfExportOpciones}>
            Descargar PDF
          </Button>
        </DialogActions>
      </Dialog>

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

      <AceptarPresupuestoModal
        open={aceptarModal.open}
        onClose={() => setAceptarModal({ open: false, row: null })}
        onConfirm={handleConfirmarAceptar}
        presupuesto={aceptarModal.row}
        proyectos={proyectos}
        loading={changingEstadoId === aceptarModal.row?._id}
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
        moveTarea={plMoveTarea}
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
