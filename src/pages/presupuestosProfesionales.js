import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PostAddIcon from '@mui/icons-material/PostAdd';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { getProyectosFromUser } from 'src/services/proyectosService';
import PresupuestoProfesionalService from 'src/services/presupuestoProfesional/presupuestoProfesionalService';

/* ================================================================
   Constantes
   ================================================================ */

const ESTADOS = ['borrador', 'enviado', 'aceptado', 'rechazado', 'vencido'];

const ESTADO_LABEL = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
};

const ESTADO_COLOR = {
  borrador: 'default',
  enviado: 'info',
  aceptado: 'success',
  rechazado: 'error',
  vencido: 'warning',
};

const TRANSICIONES_VALIDAS = {
  borrador: ['enviado'],
  enviado: ['aceptado', 'rechazado'],
  aceptado: ['vencido'],
  rechazado: ['borrador'],
  vencido: [],
};

const MONEDAS = ['ARS', 'USD'];

const TIPOS_ANEXO = [
  { value: 'adicion', label: 'Adición' },
  { value: 'deduccion', label: 'Deducción' },
  { value: 'modificacion', label: 'Modificación' },
];

const formatCurrency = (val, moneda = 'ARS') => {
  const num = Number(val) || 0;
  return num.toLocaleString('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  });
};

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatPct = (v) => `${(Number(v) || 0).toFixed(1)}%`;

/* ================================================================
   Formulario vacío – Presupuesto
   ================================================================ */

const emptyPresupuesto = {
  titulo: '',
  proyecto_id: '',
  proyecto_nombre: '',
  obra_direccion: '',
  moneda: 'ARS',
  rubros: [],
  notas_texto: '',
  analisis_superficies: {
    sup_cubierta_m2: '',
    sup_patios_m2: '',
    sup_ponderada_m2: '',
  },
  plantilla_id: '',
};

const emptyRubro = { nombre: '', monto: 0, tareas: [] };
const emptyTarea = { descripcion: '' };

/* ================================================================
   Formulario vacío – Plantilla
   ================================================================ */

const emptyPlantilla = {
  nombre: '',
  tipo: '',
  activa: true,
  rubros: [],
};

/* ================================================================
   Componente principal
   ================================================================ */

const PresupuestosProfesionales = () => {
  const { user } = useAuthContext();

  // ── Datos globales ──
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [proyectos, setProyectos] = useState([]);
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
  const [filtroProyecto, setFiltroProyecto] = useState('');

  // ── Presupuestos: formulario crear / editar ──
  const [openPPForm, setOpenPPForm] = useState(false);
  const [ppIsEdit, setPpIsEdit] = useState(false);
  const [ppForm, setPpForm] = useState(emptyPresupuesto);
  const [ppEditId, setPpEditId] = useState(null);
  const [ppSaving, setPpSaving] = useState(false);

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

  // ── Presupuestos: agregar anexo ──
  const [openAnexo, setOpenAnexo] = useState(false);
  const [anexoTarget, setAnexoTarget] = useState(null);
  const [anexoForm, setAnexoForm] = useState({ motivo: '', tipo: 'adicion', rubros_cambios: [] });

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
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

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
     Init: cargar empresa, proyectos, plantillas
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
        const proys = await getProyectosFromUser(user);
        setProyectos(proys || []);
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
      if (filtroProyecto) filters.proyecto_id = filtroProyecto;

      const resp = await PresupuestoProfesionalService.listar(filters);
      setPresupuestos(resp.items || []);
      setTotalPresupuestos(resp.total || 0);
    } catch (err) {
      console.error('Error al listar presupuestos profesionales:', err);
      showAlert('Error al cargar presupuestos', 'error');
    } finally {
      setPresupuestosLoading(false);
    }
  }, [empresaId, ppPage, ppRowsPerPage, filtroEstado, filtroMoneda, filtroTitulo, filtroProyecto]);

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

  const handleOpenPPCreate = () => {
    setPpForm({ ...emptyPresupuesto, plantilla_id: '' });
    setPpIsEdit(false);
    setPpEditId(null);
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
        rubros: (full.rubros || []).map((r) => ({
          nombre: r.nombre || '',
          monto: r.monto || 0,
          tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
        })),
        notas_texto: full.notas_texto || '',
        analisis_superficies: full.analisis_superficies || {
          sup_cubierta_m2: '',
          sup_patios_m2: '',
          sup_ponderada_m2: '',
        },
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
      const payload = {
        empresa_id: empresaId,
        empresa_nombre: empresaNombre,
        titulo: ppForm.titulo,
        proyecto_id: ppForm.proyecto_id || null,
        proyecto_nombre: ppForm.proyecto_nombre || null,
        obra_direccion: ppForm.obra_direccion || null,
        moneda: ppForm.moneda,
        rubros: ppForm.rubros
          .filter((r) => r.nombre?.trim())
          .map((r) => ({
            nombre: r.nombre.trim(),
            monto: Number(r.monto) || 0,
            tareas: (r.tareas || [])
              .filter((t) => t.descripcion?.trim())
              .map((t) => ({ descripcion: t.descripcion.trim() })),
          })),
        notas_texto: ppForm.notas_texto,
        analisis_superficies: ppForm.analisis_superficies,
      };

      if (ppForm.plantilla_id) {
        payload.plantilla_id = ppForm.plantilla_id;
      }

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

  /* ================================================================
     Presupuesto: Agregar Anexo
     ================================================================ */

  const handleOpenAnexo = (row) => {
    setAnexoTarget(row);
    setAnexoForm({ motivo: '', tipo: 'adicion', rubros_cambios: [] });
    setOpenAnexo(true);
  };

  const handleConfirmAnexo = async () => {
    if (!anexoTarget || !anexoForm.motivo.trim()) {
      showAlert('El motivo es obligatorio', 'warning');
      return;
    }
    try {
      await PresupuestoProfesionalService.agregarAnexo(anexoTarget._id, {
        motivo: anexoForm.motivo,
        tipo: anexoForm.tipo,
        rubros_cambios: anexoForm.rubros_cambios,
      });
      showAlert('Anexo agregado correctamente');
      setOpenAnexo(false);
      fetchPresupuestos();
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
      return { ...f, rubros };
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
    if (!plantillaId) return;
    try {
      const pl = await PresupuestoProfesionalService.obtenerPlantilla(plantillaId);
      if (pl && pl.rubros) {
        setPpForm((f) => ({
          ...f,
          plantilla_id: plantillaId,
          rubros: pl.rubros.map((r) => ({
            nombre: r.nombre,
            monto: 0,
            tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion })),
          })),
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
        rubros: (full.rubros || []).map((r) => ({
          nombre: r.nombre || '',
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
    setPlSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        nombre: plForm.nombre,
        tipo: plForm.tipo || null,
        activa: plForm.activa,
        rubros: plForm.rubros
          .filter((r) => r.nombre?.trim())
          .map((r) => ({
            nombre: r.nombre.trim(),
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
      return { ...f, rubros: [...f.rubros, { nombre: '', tareas: [] }] };
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
    if (!importFile) {
      showAlert('Seleccioná un archivo', 'warning');
      return;
    }
    setImportLoading(true);
    try {
      const result = await PresupuestoProfesionalService.uploadPlantilla(importFile, empresaId);
      const rubrosParseados = (result.rubros || []).map((r) => ({
        nombre: r.nombre || '',
        tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
      }));

      // Abrir el form de plantilla con los rubros pre-cargados para que el usuario revise y guarde
      setPlForm({
        nombre: importFile.name.replace(/\.[^.]+$/, '') || 'Importada',
        tipo: '',
        activa: true,
        rubros: rubrosParseados,
      });
      setPlIsEdit(false);
      setPlEditId(null);
      setOpenImport(false);
      setImportFile(null);
      setOpenPlForm(true);

      const confianza = result.confianza || 'N/A';
      const tipo = result.tipo_extraccion || '';
      showAlert(
        `Se extrajeron ${rubrosParseados.length} rubros (${tipo}, confianza: ${confianza}). Revisá y guardá la plantilla.`,
        'info'
      );
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Error al importar';
      showAlert(msg, 'error');
    } finally {
      setImportLoading(false);
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
     Selección de proyecto en formulario
     ================================================================ */

  const handleProyectoChange = (proyId) => {
    const proy = proyectos.find((p) => p.id === proyId);
    setPpForm((f) => ({
      ...f,
      proyecto_id: proyId,
      proyecto_nombre: proy?.nombre || '',
    }));
  };

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <>
      <Head>
        <title>Presupuestos Profesionales | SorbyData</title>
      </Head>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="xl">
          {/* ── Header ── */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4">Presupuestos Profesionales</Typography>
              <Typography variant="body2" color="text.secondary">
                Creá, gestioná y seguí tus presupuestos de obra.
              </Typography>
            </Box>
          </Stack>

          {/* ── Tabs ── */}
          <Tabs
            value={currentTab}
            onChange={(_, v) => setCurrentTab(v)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
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
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Proyecto</InputLabel>
                    <Select
                      value={filtroProyecto}
                      label="Proyecto"
                      onChange={(e) => { setFiltroProyecto(e.target.value); setPpPage(0); }}
                    >
                      <MenuItem value="">Todos</MenuItem>
                      {proyectos.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
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
                      <TableCell>Proyecto</TableCell>
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
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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
                            <TableCell>{row.proyecto_nombre || '—'}</TableCell>
                            <TableCell>{row.moneda}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(row.total_neto, row.moneda)}
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
                                {row.estado === 'aceptado' && (
                                  <Tooltip title="Agregar anexo">
                                    <IconButton size="small" onClick={() => handleOpenAnexo(row)}>
                                      <PostAddIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
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
                    onClick={() => setOpenImport(true)}
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

      {/* ── Dialog: Crear/Editar Presupuesto ── */}
      <Dialog open={openPPForm} onClose={() => setOpenPPForm(false)} fullWidth maxWidth="lg">
        <DialogTitle>{ppIsEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto Profesional'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Encabezado */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Título *"
                fullWidth
                value={ppForm.titulo}
                onChange={(e) => setPpForm((f) => ({ ...f, titulo: e.target.value }))}
              />
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={ppForm.moneda}
                  label="Moneda"
                  onChange={(e) => setPpForm((f) => ({ ...f, moneda: e.target.value }))}
                >
                  {MONEDAS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={ppForm.proyecto_id}
                  label="Proyecto"
                  onChange={(e) => handleProyectoChange(e.target.value)}
                >
                  <MenuItem value="">Sin proyecto</MenuItem>
                  {proyectos.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Dirección de obra"
                fullWidth
                value={ppForm.obra_direccion}
                onChange={(e) => setPpForm((f) => ({ ...f, obra_direccion: e.target.value }))}
              />
            </Stack>

            <Divider />

            {/* Cargar desde plantilla */}
            {!ppIsEdit && plantillas.length > 0 && (
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Cargar rubros desde plantilla</InputLabel>
                  <Select
                    value={ppForm.plantilla_id || ''}
                    label="Cargar rubros desde plantilla"
                    onChange={(e) => handleAplicarPlantilla(e.target.value)}
                  >
                    <MenuItem value="">Ninguna</MenuItem>
                    {plantillas.filter((p) => p.activa).map((p) => (
                      <MenuItem key={p._id} value={p._id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">
                  Reemplaza los rubros actuales con los de la plantilla.
                </Typography>
              </Stack>
            )}

            {/* Rubros editor */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Rubros ({ppForm.rubros.length})
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Total: {formatCurrency(ppTotalVivo, ppForm.moneda)}
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={ppAddRubro}>
                    Agregar rubro
                  </Button>
                </Stack>
              </Stack>

              {ppForm.rubros.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  No hay rubros todavía. Agregá uno o cargalos desde una plantilla.
                </Typography>
              )}

              {ppForm.rubros.map((rubro, ri) => (
                <Paper key={ri} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                      #{ri + 1}
                    </Typography>
                    <TextField
                      size="small"
                      label="Nombre del rubro"
                      value={rubro.nombre}
                      onChange={(e) => ppUpdateRubro(ri, 'nombre', e.target.value)}
                      sx={{ flexGrow: 1 }}
                      inputRef={(el) => {
                        if (el && ppFocusRef.current?.type === 'rubro' && ppFocusRef.current.rubroIdx === ri) {
                          setTimeout(() => el.focus(), 0);
                          ppFocusRef.current = null;
                        }
                      }}
                    />
                    <TextField
                      size="small"
                      label="Monto"
                      type="number"
                      value={rubro.monto}
                      onChange={(e) => ppUpdateRubro(ri, 'monto', e.target.value)}
                      sx={{ width: 150 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                    />
                    {ppTotalVivo > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                        {formatPct(((Number(rubro.monto) || 0) / ppTotalVivo) * 100)}
                      </Typography>
                    )}
                    <Tooltip title="Subir">
                      <span>
                        <IconButton size="small" disabled={ri === 0} onClick={() => ppMoveRubro(ri, -1)}>
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Bajar">
                      <span>
                        <IconButton
                          size="small"
                          disabled={ri === ppForm.rubros.length - 1}
                          onClick={() => ppMoveRubro(ri, 1)}
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Eliminar rubro">
                      <IconButton size="small" color="error" onClick={() => ppRemoveRubro(ri)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Tareas del rubro */}
                  <Box sx={{ ml: 4 }}>
                    {(rubro.tareas || []).map((tarea, ti) => (
                      <Stack key={ti} direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                          {ri + 1}.{ti + 1}
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="Descripción de tarea"
                          value={tarea.descripcion}
                          onChange={(e) => ppUpdateTarea(ri, ti, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (e.ctrlKey || e.metaKey) {
                                ppAddRubro();
                              } else {
                                ppAddTarea(ri);
                              }
                            }
                          }}
                          inputRef={(el) => {
                            if (el && ppFocusRef.current?.type === 'tarea' && ppFocusRef.current.rubroIdx === ri && ppFocusRef.current.tareaIdx === ti) {
                              setTimeout(() => el.focus(), 0);
                              ppFocusRef.current = null;
                            }
                          }}
                        />
                        <IconButton size="small" color="error" onClick={() => ppRemoveTarea(ri, ti)}>
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Stack>
                    ))}
                    <Button size="small" onClick={() => ppAddTarea(ri)} sx={{ mt: 0.5 }}>
                      + Tarea
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>

            <Divider />

            {/* Notas */}
            <TextField
              label="Notas / Condiciones"
              multiline
              minRows={4}
              maxRows={10}
              value={ppForm.notas_texto}
              onChange={(e) => setPpForm((f) => ({ ...f, notas_texto: e.target.value }))}
              helperText="Se pre-carga un texto sugerido por SorbyData al crear. Podés editarlo libremente."
            />

            {/* Análisis de superficies (opcional) */}
            <Typography variant="subtitle2" color="text.secondary">
              Análisis de superficies (opcional)
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="Sup. cubierta (m²)"
                type="number"
                value={ppForm.analisis_superficies?.sup_cubierta_m2 || ''}
                onChange={(e) =>
                  setPpForm((f) => ({
                    ...f,
                    analisis_superficies: {
                      ...f.analisis_superficies,
                      sup_cubierta_m2: e.target.value,
                    },
                  }))
                }
              />
              <TextField
                size="small"
                label="Sup. patios (m²)"
                type="number"
                value={ppForm.analisis_superficies?.sup_patios_m2 || ''}
                onChange={(e) =>
                  setPpForm((f) => ({
                    ...f,
                    analisis_superficies: {
                      ...f.analisis_superficies,
                      sup_patios_m2: e.target.value,
                    },
                  }))
                }
              />
              <TextField
                size="small"
                label="Sup. ponderada (m²)"
                type="number"
                value={ppForm.analisis_superficies?.sup_ponderada_m2 || ''}
                onChange={(e) =>
                  setPpForm((f) => ({
                    ...f,
                    analisis_superficies: {
                      ...f.analisis_superficies,
                      sup_ponderada_m2: e.target.value,
                    },
                  }))
                }
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPPForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePP} disabled={ppSaving}>
            {ppSaving ? <CircularProgress size={20} /> : ppIsEdit ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Eliminar Presupuesto ── */}
      <Dialog open={openPPDelete} onClose={() => setOpenPPDelete(false)} maxWidth="xs">
        <DialogTitle>Eliminar presupuesto</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de eliminar <strong>{ppToDelete?.titulo || '(sin título)'}</strong>?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPPDelete(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeletePP}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Cambiar Estado ── */}
      <Dialog open={openEstado} onClose={() => setOpenEstado(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar estado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Presupuesto: <strong>{estadoTarget?.titulo}</strong>
            <br />
            Estado actual:{' '}
            <Chip
              label={ESTADO_LABEL[estadoTarget?.estado] || ''}
              color={ESTADO_COLOR[estadoTarget?.estado] || 'default'}
              size="small"
            />
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Nuevo estado</InputLabel>
            <Select
              value={nuevoEstado}
              label="Nuevo estado"
              onChange={(e) => setNuevoEstado(e.target.value)}
            >
              {(TRANSICIONES_VALIDAS[estadoTarget?.estado] || []).map((e) => (
                <MenuItem key={e} value={e}>{ESTADO_LABEL[e]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {nuevoEstado === 'aceptado' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Al aceptar se congelará una versión del presupuesto con las equivalencias CAC/USD
              actuales. Los rubros ya no podrán editarse directamente (solo mediante anexos).
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEstado(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmCambiarEstado} disabled={!nuevoEstado}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Ver Detalle (rubros, versiones, historial, anexos) ── */}
      <Dialog open={openDetalle} onClose={() => setOpenDetalle(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          Detalle: {detalleData?.titulo || '...'}
          <Chip
            label={ESTADO_LABEL[detalleData?.estado] || ''}
            color={ESTADO_COLOR[detalleData?.estado] || 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          {detalleLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : detalleData ? (
            <>
              {/* Info general */}
              <Stack direction="row" spacing={4} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Moneda</Typography>
                  <Typography>{detalleData.moneda}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Total neto</Typography>
                  <Typography fontWeight={600}>
                    {formatCurrency(detalleData.total_neto, detalleData.moneda)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Proyecto</Typography>
                  <Typography>{detalleData.proyecto_nombre || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Dirección</Typography>
                  <Typography>{detalleData.obra_direccion || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Versión</Typography>
                  <Typography>
                    {detalleData.version_actual > 0 ? `v${detalleData.version_actual}` : 'Sin versión congelada'}
                  </Typography>
                </Box>
              </Stack>

              {/* Sub-tabs detalle */}
              <Tabs
                value={detalleTab}
                onChange={(_, v) => setDetalleTab(v)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Rubros actuales" />
                <Tab label={`Versiones (${(detalleData.versiones || []).length})`} />
                <Tab label={`Historial (${(detalleData.historial_estados || []).length})`} />
                <Tab label={`Anexos (${(detalleData.anexos || []).length})`} />
              </Tabs>

              {/* Sub-tab 0: Rubros */}
              {detalleTab === 0 && (
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
                    {(detalleData.rubros || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.orden || i + 1}</TableCell>
                        <TableCell>{r.nombre}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(r.monto, detalleData.moneda)}
                        </TableCell>
                        <TableCell align="right">{formatPct(r.incidencia_pct)}</TableCell>
                        <TableCell>
                          {(r.tareas || []).map((t) => t.descripcion).join(', ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(detalleData.rubros || []).length > 0 && (
                      <TableRow>
                        <TableCell />
                        <TableCell>
                          <Typography fontWeight={600}>TOTAL</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>
                            {formatCurrency(detalleData.total_neto, detalleData.moneda)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>100%</Typography>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Sub-tab 1: Versiones */}
              {detalleTab === 1 && (
                <Box>
                  {(detalleData.versiones || []).length === 0 ? (
                    <Typography color="text.secondary">
                      No hay versiones congeladas todavía.
                    </Typography>
                  ) : (
                    (detalleData.versiones || []).map((v, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                          <Chip label={`v${v.numero_version}`} size="small" color="primary" />
                          <Typography variant="body2">{formatDate(v.fecha)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {v.motivo || ''}
                          </Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Typography variant="body2" fontWeight={600}>
                            Total: {formatCurrency(v.total_neto, detalleData.moneda)}
                          </Typography>
                        </Stack>
                        {v.equivalencias && (
                          <Stack direction="row" spacing={3} mb={1}>
                            {v.equivalencias.valor_cac && (
                              <Typography variant="caption">
                                CAC: {v.equivalencias.valor_cac} → {v.equivalencias.monto_en_cac?.toFixed(2)} unidades
                              </Typography>
                            )}
                            {v.equivalencias.tipo_cambio_usd && (
                              <Typography variant="caption">
                                USD Blue: ${v.equivalencias.tipo_cambio_usd} → {formatCurrency(v.equivalencias.monto_en_usd, 'USD')}
                              </Typography>
                            )}
                          </Stack>
                        )}
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Rubro</TableCell>
                              <TableCell align="right">Monto</TableCell>
                              <TableCell align="right">Incidencia</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(v.rubros_snapshot || []).map((rs, j) => (
                              <TableRow key={j}>
                                <TableCell>{rs.nombre}</TableCell>
                                <TableCell align="right">
                                  {formatCurrency(rs.monto, detalleData.moneda)}
                                </TableCell>
                                <TableCell align="right">{formatPct(rs.incidencia_pct)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Paper>
                    ))
                  )}
                </Box>
              )}

              {/* Sub-tab 2: Historial de estados */}
              {detalleTab === 2 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Usuario</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detalleData.historial_estados || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary">Sin historial.</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (detalleData.historial_estados || []).map((h, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Chip
                              label={ESTADO_LABEL[h.estado] || h.estado}
                              color={ESTADO_COLOR[h.estado] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(h.fecha)}</TableCell>
                          <TableCell>{h.user_id || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Sub-tab 3: Anexos */}
              {detalleTab === 3 && (
                <Box>
                  {(detalleData.anexos || []).length === 0 ? (
                    <Typography color="text.secondary">No hay anexos.</Typography>
                  ) : (
                    (detalleData.anexos || []).map((ax, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                          <Chip label={`Anexo #${ax.numero}`} size="small" color="secondary" />
                          <Chip
                            label={ax.tipo}
                            size="small"
                            variant="outlined"
                            color={
                              ax.tipo === 'adicion'
                                ? 'success'
                                : ax.tipo === 'deduccion'
                                ? 'error'
                                : 'info'
                            }
                          />
                          <Typography variant="body2">{formatDate(ax.fecha)}</Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Typography variant="body2" fontWeight={600}>
                            Diferencia: {formatCurrency(ax.monto_diferencia, detalleData.moneda)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" gutterBottom>
                          <strong>Motivo:</strong> {ax.motivo}
                        </Typography>
                        {(ax.rubros_afectados || []).length > 0 && (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Rubro</TableCell>
                                <TableCell align="right">Monto anterior</TableCell>
                                <TableCell align="right">Monto nuevo</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {ax.rubros_afectados.map((ra, j) => (
                                <TableRow key={j}>
                                  <TableCell>{ra.rubro_nombre}</TableCell>
                                  <TableCell align="right">
                                    {formatCurrency(ra.monto_anterior, detalleData.moneda)}
                                  </TableCell>
                                  <TableCell align="right">
                                    {formatCurrency(ra.monto_nuevo, detalleData.moneda)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Paper>
                    ))
                  )}
                </Box>
              )}

              {/* Notas */}
              {detalleData.notas_texto && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2">Notas / Condiciones</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap' }}>
                    <Typography variant="body2">{detalleData.notas_texto}</Typography>
                  </Paper>
                </Box>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetalle(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Agregar Anexo ── */}
      <Dialog open={openAnexo} onClose={() => setOpenAnexo(false)} fullWidth maxWidth="sm">
        <DialogTitle>Agregar Anexo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Presupuesto: <strong>{anexoTarget?.titulo}</strong>
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Motivo del anexo *"
              multiline
              minRows={2}
              value={anexoForm.motivo}
              onChange={(e) => setAnexoForm((f) => ({ ...f, motivo: e.target.value }))}
              placeholder="Ej: Cliente pidió ampliar cocina"
            />
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={anexoForm.tipo}
                label="Tipo"
                onChange={(e) => setAnexoForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                {TIPOS_ANEXO.map((t) => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info">
              Los rubros afectados y montos se calculan automáticamente en el backend al agregar
              el anexo. Asegurate de haber editado los rubros del presupuesto antes si es necesario.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAnexo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleConfirmAnexo} disabled={!anexoForm.motivo.trim()}>
            Agregar anexo
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Crear/Editar Plantilla ── */}
      <Dialog open={openPlForm} onClose={() => setOpenPlForm(false)} fullWidth maxWidth="md">
        <DialogTitle>{plIsEdit ? 'Editar Plantilla' : 'Nueva Plantilla de Rubros'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Nombre *"
                fullWidth
                value={plForm.nombre}
                onChange={(e) => setPlForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Residencial estándar"
              />
              <TextField
                label="Tipo (opcional)"
                value={plForm.tipo}
                onChange={(e) => setPlForm((f) => ({ ...f, tipo: e.target.value }))}
                placeholder="Ej: residencial, comercial"
                sx={{ minWidth: 200 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={plForm.activa}
                    onChange={(e) => setPlForm((f) => ({ ...f, activa: e.target.checked }))}
                  />
                }
                label="Activa"
              />
            </Stack>

            <Divider />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight={600}>
                Rubros ({plForm.rubros.length})
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={plAddRubro}>
                Agregar rubro
              </Button>
            </Stack>

            {plForm.rubros.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Agregá rubros y tareas para armar la plantilla.
              </Typography>
            )}

            {plForm.rubros.map((rubro, ri) => (
              <Paper key={ri} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                    #{ri + 1}
                  </Typography>
                  <TextField
                    size="small"
                    label="Nombre del rubro"
                    value={rubro.nombre}
                    onChange={(e) => plUpdateRubroNombre(ri, e.target.value)}
                    sx={{ flexGrow: 1 }}
                    inputRef={(el) => {
                      if (el && plFocusRef.current?.type === 'rubro' && plFocusRef.current.rubroIdx === ri) {
                        setTimeout(() => el.focus(), 0);
                        plFocusRef.current = null;
                      }
                    }}
                  />
                  <Tooltip title="Eliminar rubro">
                    <IconButton size="small" color="error" onClick={() => plRemoveRubro(ri)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Box sx={{ ml: 4 }}>
                  {(rubro.tareas || []).map((tarea, ti) => (
                    <Stack key={ti} direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                        {ri + 1}.{ti + 1}
                      </Typography>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Descripción de tarea"
                        value={tarea.descripcion}
                        onChange={(e) => plUpdateTarea(ri, ti, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (e.ctrlKey || e.metaKey) {
                              plAddRubro();
                            } else {
                              plAddTarea(ri);
                            }
                          }
                        }}
                        inputRef={(el) => {
                          if (el && plFocusRef.current?.type === 'tarea' && plFocusRef.current.rubroIdx === ri && plFocusRef.current.tareaIdx === ti) {
                            setTimeout(() => el.focus(), 0);
                            plFocusRef.current = null;
                          }
                        }}
                      />
                      <IconButton size="small" color="error" onClick={() => plRemoveTarea(ri, ti)}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" onClick={() => plAddTarea(ri)} sx={{ mt: 0.5 }}>
                    + Tarea
                  </Button>
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSavePl} disabled={plSaving}>
            {plSaving ? <CircularProgress size={20} /> : plIsEdit ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Eliminar Plantilla ── */}
      <Dialog open={openPlDelete} onClose={() => setOpenPlDelete(false)} maxWidth="xs">
        <DialogTitle>Eliminar plantilla</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar la plantilla <strong>{plToDelete?.nombre}</strong>? Los presupuestos que
            ya la usaron no se ven afectados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPlDelete(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeletePl}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Importar archivo de plantilla ── */}
      <Dialog open={openImport} onClose={() => setOpenImport(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar plantilla desde archivo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Subí un archivo Excel (.xlsx), PDF o imagen con rubros y tareas. El sistema intentará
            extraer la estructura automáticamente.
          </Typography>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            {importFile ? importFile.name : 'Seleccionar archivo'}
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </Button>
          {importFile && (
            <Typography variant="caption" sx={{ ml: 1 }}>
              {importFile.name} ({(importFile.size / 1024).toFixed(0)} KB)
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenImport(false); setImportFile(null); }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleImportPlantilla}
            disabled={!importFile || importLoading}
          >
            {importLoading ? <CircularProgress size={20} /> : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>

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

/* ================================================================
   Layout wrapper
   ================================================================ */

PresupuestosProfesionales.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default PresupuestosProfesionales;
