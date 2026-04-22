import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  Fab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
  FormControl,
  InputLabel,
  TablePagination,
  IconButton,
  Divider,
  Tooltip,
  CircularProgress,
  Badge,
  Drawer,
  Tabs,
  Tab,
  LinearProgress,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CommentIcon from '@mui/icons-material/Comment';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';
import notaPedidoService from 'src/services/notaPedidoService';
import { useAuthContext } from 'src/contexts/auth-context';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import DeleteIcon from '@mui/icons-material/Delete';
import profileService from 'src/services/profileService';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InboxIcon from '@mui/icons-material/Inbox';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Popover from '@mui/material/Popover';
import Paper from '@mui/material/Paper';
import Menu from '@mui/material/Menu';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useCallback } from 'react';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { formatTimestamp } from 'src/utils/formatters';
import { Timestamp } from 'firebase/firestore';
import { Router } from 'react-router-dom';
import { useRouter } from 'next/router';
import { NotaPedidoAddDialog } from 'src/components/NotaPedidoAddDialog';
import NotaPedidoPdfTemplateDialog, { NotaPedidoLogoRequeridoDialog } from 'src/components/NotaPedidoPdfDialogs';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import { downloadNotaPedidoPdf } from 'src/utils/notaPedido/exportNotaPedidoToPdf';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  slate900: '#0f172a',
  slate800: '#1e293b',
  slate700: '#334155',
  slate600: '#475569',
  slate400: '#94a3b8',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50:  '#f8fafc',
  indigo600: '#4f46e5',
  indigo500: '#6366f1',
  indigo50:  '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
};

const font = "'Plus Jakarta Sans', system-ui, sans-serif";

const NotaPedidoPage = () => {
  const router = useRouter();
  const { user, isSpying } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [notas, setNotas] = useState([]);
  const [filteredNotas, setFilteredNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const [openFilters, setOpenFilters] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false); // Estado para añadir nota
  const [currentNota, setCurrentNota] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [notaToDelete, setNotaToDelete] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [notasEstados, setNotasEstados] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'fechaCreacion', direction: 'desc' });
  const [comentariosDialogNota, setComentariosDialogNota] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const nuevoComentarioRef = useRef();
  const [userById, setUserById] = useState(null);

const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const [comentariosCargando, setComentariosCargando] = useState(false);
  const [comentarioEditandoIdx, setComentarioEditandoIdx] = useState(null);
  const [comentarioEditadoTexto, setComentarioEditadoTexto] = useState('');
  const [drawerTab, setDrawerTab] = useState(0); // 0: Detalles, 1: Comentarios, 2: Historial
  const [hoveredComentario, setHoveredComentario] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [mobileMenuNota, setMobileMenuNota] = useState(null);
  const [openPdfPlantillasDialog, setOpenPdfPlantillasDialog] = useState(false);
  const [openLogoRequeridoModal, setOpenLogoRequeridoModal] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [basePdfTemplate, setBasePdfTemplate] = useState(null);
  const [pdfUiLoading, setPdfUiLoading] = useState(false);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState(null);
  const [selectedNotaIds, setSelectedNotaIds] = useState(new Set());
  const [bulkPdfDownloading, setBulkPdfDownloading] = useState(false);
  const [bulkPdfProgress, setBulkPdfProgress] = useState({ current: 0, total: 0 });
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    codigo: true,
    proyecto_nombre: true,
    proveedor: true,
    owner_name: true,
    descripcion: true,
    estado: true,
    fechaCreacion: true,
    fechaEstimadaFin: false,
  });
  const COLUMN_LABELS = {
    codigo: 'Código',
    proyecto_nombre: 'Proyecto',
    proveedor: 'Proveedor',
    owner_name: 'Asignado',
    descripcion: 'Descripción',
    estado: 'Estado',
    fechaCreacion: 'Fecha Creación',
    fechaEstimadaFin: 'Finalización estimada',
  };

  const [formData, setFormData] = useState({
    descripcion: '', proyecto_id: '', estado: '', owner: '', creador: '', proveedor: '', fechaEstimadaFin: ''
  });
  const [filters, setFilters] = useState({ text: '', estado: '', proyecto_id: '', proveedor: '', misNotas: false });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'), { noSsr: true });
  
  const sortedNotas = useMemo(() => {
    return [...filteredNotas].sort((a, b) => {
      if (!a[sortConfig.key] || !b[sortConfig.key]) return 0; // Evitar errores con valores nulos
    
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
    
      // Si es una fecha, convertir a timestamp
      if (sortConfig.key === 'fechaCreacion') {
        aValue = aValue._seconds || 0;
        bValue = bValue._seconds || 0;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
    
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredNotas, sortConfig]);

  const paginatedNotas = useMemo(() => {
    return sortedNotas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedNotas, page, rowsPerPage]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  
  const handleGuardarComentarioEditado = async (idx) => {
    if (!comentarioEditadoTexto.trim() || !comentariosDialogNota) return;
  
    const comentariosActualizados = [...comentariosDialogNota.comentarios];
    comentariosActualizados[idx].texto = comentarioEditadoTexto.trim();
  
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
    try {
      const notaServidor = await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      if (!notaServidor) throw new Error('No se pudo actualizar la nota');
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n))
      );
      setComentariosDialogNota(notaServidor);
      setComentarioEditandoIdx(null);
      setComentarioEditadoTexto('');
      setAlert({ open: true, message: 'Comentario editado', severity: 'success' });
    } catch (error) {
      console.error('Error al editar comentario:', error);
      setAlert({ open: true, message: 'Error al editar comentario', severity: 'error' });
    }
  };

  const handleEliminarComentario = async (idx) => {
    if (!comentariosDialogNota) return;
  
    const comentariosActualizados = [...comentariosDialogNota.comentarios];
    comentariosActualizados.splice(idx, 1);
  
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
    try {
      const notaServidor = await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      if (!notaServidor) throw new Error('No se pudo actualizar la nota');
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n))
      );
      setComentariosDialogNota(notaServidor);
      setAlert({ open: true, message: 'Comentario eliminado', severity: 'success' });
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      setAlert({ open: true, message: 'Error al eliminar comentario', severity: 'error' });
    }
  };

  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Notas de Pedido');

      // Definir columnas
      worksheet.columns = [
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Proyecto', key: 'proyecto_nombre', width: 25 },
        { header: 'Proveedor', key: 'proveedor', width: 25 },
        { header: 'Responsable', key: 'owner_name', width: 25 },
        { header: 'Creador', key: 'creador_name', width: 25 },
        { header: 'Descripción', key: 'descripcion', width: 50 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Fecha Creación', key: 'fechaCreacion', width: 20 },
      ];

      // Estilo del encabezado
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' },
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Agregar datos
      sortedNotas.forEach((nota) => {
        worksheet.addRow({
          codigo: nota.codigo || '',
          proyecto_nombre: nota.proyecto_nombre || '',
          proveedor: nota.proveedor || '',
          owner_name: nota.owner_name || '',
          creador_name: nota.creador_name || '',
          descripcion: nota.descripcion || '',
          estado: nota.estado || '',
          fechaCreacion: formatTimestamp(nota.fechaCreacion) || '',
        });
      });

      // Generar y descargar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fecha = new Date().toISOString().split('T')[0];
      saveAs(blob, `notas_pedido_${fecha}.xlsx`);

      setAlert({ open: true, message: 'Excel exportado con éxito', severity: 'success' });
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      setAlert({ open: true, message: 'Error al exportar a Excel', severity: 'error' });
    }
  };

  const getEmpresaId = () => user?.empresa?.id || user?.empresaData?.id || user?.empresa_id;

  const loadPdfBaseForDrawer = useCallback(async () => {
    const eid = getEmpresaId();
    if (!eid) return;
    const base = await notaPedidoService.getPdfBaseTemplate(eid);
    setBasePdfTemplate(base);
  }, [user]);

  useEffect(() => {
    if (user) loadPdfBaseForDrawer();
  }, [user, loadPdfBaseForDrawer]);

  useEffect(() => {
    if (comentariosDialogNota) loadPdfBaseForDrawer();
  }, [comentariosDialogNota, loadPdfBaseForDrawer]);

  const handleDownloadPdfNota = async () => {
    if (!comentariosDialogNota) return;
    const eid = getEmpresaId();
    if (!eid) {
      setAlert({ open: true, message: 'No se pudo identificar la empresa', severity: 'error' });
      return;
    }
    setPdfDownloading(true);
    try {
      const result = await notaPedidoService.postPdfRenderConfig({
        notaId: comentariosDialogNota.id,
        empresaId: eid,
        plantillaId: selectedPlantillaId || undefined,
      });
      if (!result.success) {
        if (result.needsLogo) { setOpenLogoRequeridoModal(true); return; }
        setAlert({ open: true, message: result.errorMessage || 'No se pudo generar el PDF', severity: 'error' });
        return;
      }
      const cfg = result.config;
      if (!cfg?.layout) throw new Error('Sin configuración de PDF');
      await downloadNotaPedidoPdf({
        nota: comentariosDialogNota,
        layout: cfg.layout,
        logoUrl: cfg.logoUrl,
        empresaNombre: cfg.empresaNombre,
        templateId: cfg.templateId || null,
      });
      setAlert({ open: true, message: 'PDF descargado', severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo generar el PDF', severity: 'error' });
    } finally {
      setPdfDownloading(false);
    }
  };

  const toggleSelectNota = useCallback((id, e) => {
    e.stopPropagation();
    setSelectedNotaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedNotaIds.size === paginatedNotas.length && paginatedNotas.length > 0) {
      setSelectedNotaIds(new Set());
    } else {
      setSelectedNotaIds(new Set(paginatedNotas.map(n => n.id)));
    }
  }, [selectedNotaIds.size, paginatedNotas]);

  const handleBulkDownloadPdf = async () => {
    const eid = getEmpresaId();
    if (!eid || selectedNotaIds.size === 0) return;
    const selectedList = sortedNotas.filter(n => selectedNotaIds.has(n.id));
    setBulkPdfDownloading(true);
    setBulkPdfProgress({ current: 0, total: selectedList.length });
    try {
      const configResult = await notaPedidoService.postPdfRenderConfig({
        notaId: selectedList[0].id,
        empresaId: eid,
        plantillaId: selectedPlantillaId || undefined,
      });
      if (!configResult.success) {
        if (configResult.needsLogo) { setOpenLogoRequeridoModal(true); return; }
        setAlert({ open: true, message: configResult.errorMessage || 'Error de configuración', severity: 'error' });
        return;
      }
      const cfg = configResult.config;
      for (let i = 0; i < selectedList.length; i++) {
        setBulkPdfProgress({ current: i + 1, total: selectedList.length });
        await downloadNotaPedidoPdf({
          nota: selectedList[i],
          layout: cfg.layout,
          logoUrl: cfg.logoUrl,
          empresaNombre: cfg.empresaNombre,
          templateId: cfg.templateId || null,
        });
        if (i < selectedList.length - 1) await new Promise(r => setTimeout(r, 400));
      }
      setAlert({ open: true, message: `${selectedList.length} PDF${selectedList.length !== 1 ? 's' : ''} descargados`, severity: 'success' });
      setSelectedNotaIds(new Set());
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Error al generar los PDFs', severity: 'error' });
    } finally {
      setBulkPdfDownloading(false);
      setBulkPdfProgress({ current: 0, total: 0 });
    }
  };

  const handleSaveLogoFromDialog = async (file) => {
    const eid = getEmpresaId();
    if (!eid || !file) return;
    setPdfUiLoading(true);
    try {
      const url = await notaPedidoService.uploadPdfTemplateLogo(eid, file);
      if (!url) throw new Error('Upload falló');
      const updatedBase = await notaPedidoService.putPdfBaseLogo(eid, { logo_url: url });
      setBasePdfTemplate(updatedBase);
      await loadPdfBaseForDrawer();
      setAlert({ open: true, message: 'Logo guardado', severity: 'success' });
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar el logo', severity: 'error' });
    } finally {
      setPdfUiLoading(false);
    }
  };

  const handleLogoRequiredSaveAndDownload = async (file) => {
    const eid = getEmpresaId();
    if (!eid || !file) return;
    setPdfUiLoading(true);
    try {
      const url = await notaPedidoService.uploadPdfTemplateLogo(eid, file);
      if (!url) throw new Error('Upload falló');
      const updatedBase = await notaPedidoService.putPdfBaseLogo(eid, { logo_url: url });
      setBasePdfTemplate(updatedBase);
      setOpenLogoRequeridoModal(false);
      await loadPdfBaseForDrawer();
    } catch (e) {
      console.error(e);
      setAlert({ open: true, message: 'Error al guardar el logo', severity: 'error' });
      setPdfUiLoading(false);
      return;
    }
    setPdfUiLoading(false);
    await handleDownloadPdfNota();
  };

  
  const fetchProfiles = async () => {
    try {
      const empresaId = user?.empresa?.id || user?.empresaData?.id || user?.empresa_id;
      const profilesData = await profileService.getProfileByEmpresa(empresaId);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error al obtener perfiles:', error);
    }
  };

  const fetchProyectos = useCallback(async () => {
    try {
      // Obtener solo los proyectos asignados al usuario
      const proyectosData = await getProyectosFromUser(user);
      console.log('Proyectos asignados al usuario:', proyectosData);
      setProyectos(proyectosData);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
    }
  }, [user]);
  
  
  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const notasEstados = empresa.notas_estados || ["Pendiente", "En proceso", "Completa"]
        setNotasEstados(notasEstados);
      } catch (error) {
        console.error('Error al obtener los estados de nota de pedido:', error);
      }
    };
  
    if (user) {
      fetchEmpresa();
    }
  }, [user]);

  const getEstadoSiguiente = (estado) => {
    const index = notasEstados.indexOf(estado);
    if (index === -1) return null;
    if (index === notasEstados.length - 1) return null;
    return notasEstados[index + 1]; 
  }
  
  const getEstadoColor = (index) => {
    // Si el índice es negativo o inválido, devolver color por defecto
    // Usamos "primary" como fallback ya que es válido tanto para Button como Chip
    if (index < 0) return "primary";
    
    let colors;
    switch (notasEstados.length) {
      case 0:
      case 1:
        return "primary";
      case 2:
        colors = ["primary", "success"];
        break
      case 3:
        colors = ["warning", "primary", "success"];
        break;
      case 4:
        colors = ["warning", "info", "primary", "success"];
        break;
      case 5:
      default:
        // Para 5 o más estados
        colors = ["secondary", "warning", "info", "primary", "success"];
        break;
    }
    
    return colors[index % colors.length] || "primary"; 
  };
  
  
  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchProyectos();
    }
  }, [user]);
  
  const handleAgregarComentario = async () => {
    const texto = nuevoComentarioRef.current.value.trim();
    if (!comentariosDialogNota || !texto) return;
  
    const nuevo = {
      texto,
      autor: `${user.firstName} ${user.lastName}`,
      fecha: new Date().toISOString(),
    };
  
    const comentariosActualizados = [...(comentariosDialogNota.comentarios || []), nuevo];
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
  
    try {
      setComentariosCargando(true);
      const notaServidor = await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      if (!notaServidor) throw new Error('No se pudo actualizar la nota');

      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n))
      );
      setComentariosDialogNota(notaServidor);
      nuevoComentarioRef.current.value = ''; // limpiás el input
      setAlert({ open: true, message: 'Comentario agregado con éxito', severity: 'success' });
    } catch (error) {
      console.error('Error al guardar comentario:', error);
      setAlert({ open: true, message: 'Error al agregar comentario', severity: 'error' });
    } finally {
      setComentariosCargando(false);
    }
  };
  

  const fetchNotas = useCallback(async () => {
    try {
      setLoading(true);
      const empresa = await getEmpresaDetailsFromUser(user);

      // Si está en modo espía, enviar el user_id (Firebase Auth UID) directamente
      let targetUserId = null;
      if (isSpying()) {
        setUserById(user);
        targetUserId = user.user_id;
      } else {
        setUserById(null);
      }

      const notasData = await notaPedidoService.getNotasByEmpresa(empresa.id, targetUserId);
      setNotas(notasData);
      setFilteredNotas(notasData);
    } catch (error) {
      console.error('Error al obtener notas:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isSpying]);
  

  const applyFilters = () => {
    let filtered = notas;
    if (filters.text) {
      filtered = filtered.filter(
          (nota) =>
              nota.descripcion.toLowerCase().includes(filters.text.toLowerCase()) ||
              (nota.proveedor && nota.proveedor.toLowerCase().includes(filters.text.toLowerCase()))
      );
  }
  

    if (filters.estado) {
      filtered = filtered.filter((nota) => nota.estado === filters.estado);
    }

    if (filters.proyecto_id) {
      filtered = filtered.filter((nota) => nota.proyecto_id === filters.proyecto_id);
    }

    // Filtro "Mis notas" - filtra por owner o creador igual al usuario actual
    if (filters.misNotas && user) {
      filtered = filtered.filter((nota) => 
        nota.owner === user.id || nota.creador === user.id
      );
    }
  
    setFilteredNotas(filtered);
  };

  const setEstado = (estado) => {
    if (estado === filters.estado) {
      setFilters({ ...filters, estado: '' });
    } else {
      setFilters({ ...filters, estado });
    }
  };

  const handleEdit = (nota) => {
    setCurrentNota(nota);
    setFormData({ descripcion: nota.descripcion, estado: nota.estado, owner: nota.owner, creador: nota.creador, proyecto_id: nota.proyecto_id, proveedor: nota.proveedor, fechaEstimadaFin: nota.fechaEstimadaFin ? new Date(nota.fechaEstimadaFin instanceof Object && nota.fechaEstimadaFin.seconds ? nota.fechaEstimadaFin.seconds * 1000 : nota.fechaEstimadaFin).toISOString().split('T')[0] : '' });
    setIsEditing(true);
  };

  const handleSaveNewNote = async (data) => {
    try {
      const ownerObj = profiles.find((p) => p.id === data.owner);
      const proyectoObj = proyectos.find((p) => p.id === data.proyecto_id);
      
      const newNote = {
        ...data,
        owner: data.owner || user.id,
        owner_name: ownerObj ? (ownerObj.firstName + " " + ownerObj.lastName) : (user.firstName + " " + user.lastName),
        estado: notasEstados[0],
        empresaId: user?.empresa?.id || user?.empresaData?.id || user?.empresa_id,
        creador: user.id,
        creador_name: user.firstName + " " + user.lastName,
        proyecto_id: data.proyecto_id,
        proyecto_nombre: proyectoObj ? proyectoObj.nombre : null,
        proveedor: data.proveedor || '',
      };
      
      const savedNote = await notaPedidoService.createNota(newNote);
      setNotas([savedNote, ...notas]);
      setAlert({ open: true, message: 'Nota añadida con éxito', severity: 'success' });
      setOpenAddDialog(false);
    } catch (error) {
      console.error('Error al añadir nota:', error);
      setAlert({ open: true, message: 'Error al añadir la nota', severity: 'error' });
    }
  };
  
  const openDeleteConfirmation = (nota) => {
    setNotaToDelete(nota);
    setOpenDeleteDialog(true);
  };
  
  const closeDeleteConfirmation = () => {
    setNotaToDelete(null);
    setOpenDeleteDialog(false);
  };
  

  const handleSaveEdit = async () => {
    try {
      console.log("currentNota", currentNota)
      console.log("formData", formData)
      if (formData?.owner) {
        const ownerObj = profiles.filter( (p) => p.id === formData.owner)[0]
        formData.owner_name = ownerObj.firstName + " " + ownerObj.lastName
      }

      if (formData?.proyecto_id) {
        const proyectoObj = proyectos.filter( (p) => p.id === formData.proyecto_id)[0]
        formData.proyecto_nombre = proyectoObj.nombre
      }

      if (formData?.proyecto_id === '') {
        formData.proyecto_nombre = null;
        formData.proyecto_id = null;
      }

      const updatedNota = { ...currentNota, ...formData };
      console.log("updatedNota", updatedNota)
      
      const notaServidor = await notaPedidoService.updateNota(currentNota.id, {
        ...updatedNota,
        _userName: `${user.firstName} ${user.lastName}`
      });
      if (notaServidor) {
        setNotas(notas.map((n) => (n.id === currentNota.id ? notaServidor : n)));
        setAlert({ open: true, message: 'Nota actualizada con éxito', severity: 'success' });
      } else {
        setAlert({ open: true, message: 'Error al actualizar la nota', severity: 'error' });
      }
      setIsEditing(false);
      setCurrentNota(null);
    } catch (error) {
      console.error('Error al actualizar la nota:', error);
      setAlert({ open: true, message: 'Error al actualizar la nota', severity: 'error' });
    }
  };

  const handleChangeEstado = async (nota) => {
    const index = notasEstados.indexOf(nota.estado);
    if (index === -1) return;
    if (index === notasEstados.length - 1) return;

    const nuevoEstado = notasEstados[index + 1];
  
    if (!nuevoEstado) return; // Si ya está en "Completa", no cambiar más.
  
    try {
      const updatedNota = { 
        ...nota, 
        estado: nuevoEstado,
        _userName: `${user.firstName} ${user.lastName}` // Para el historial
      };
      const notaServidor = await notaPedidoService.updateNota(nota.id, updatedNota);
  
      if (notaServidor) {
        setNotas(notas.map((n) => (n.id === nota.id ? notaServidor : n)));
        // Actualizar drawer si está abierto
        if (comentariosDialogNota?.id === nota.id) {
          setComentariosDialogNota(notaServidor);
        }
        setAlert({ open: true, message: `Estado cambiado a "${nuevoEstado}"`, severity: 'success' });
      } else {
        setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
    }
  };
  
  // Setear breadcrumbs
  useEffect(() => {
    const label = userById
      ? `Notas de Pedido de ${userById.firstName || ''} ${userById.lastName || ''}`.trim()
      : 'Notas de Pedido';
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label, icon: <AssignmentIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, userById]);

  useEffect(() => {
    if (user) fetchNotas();
  }, [user, fetchNotas]);
  

  useEffect(() => {
    applyFilters();
  }, [filters, notas]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: isMobile ? 2 : 4, px: isMobile ? 1.5 : 3 }}>
      <Container maxWidth={false}>
        <Stack
  direction={isMobile ? 'column' : 'row'}
  spacing={2}
  alignItems={isMobile ? 'center' : 'flex-start'}
  mb={3}
>
  
  {isMobile ? (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Búsqueda rápida siempre visible */}
      <TextField
        placeholder="Buscar código, descripción, proveedor..."
        value={filters.text}
        onChange={(e) => setFilters({ ...filters, text: e.target.value })}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
        }}
        sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
      />
      {/* Chips de estado scrolleables */}
      <Box sx={{ 
        display: 'flex', 
        gap: 0.75, 
        overflowX: 'auto', 
        pb: 0.5,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        <Chip
          label={`Todos (${notas.length})`}
          size="small"
          color={filters.estado === '' ? 'primary' : 'default'}
          variant={filters.estado === '' ? 'filled' : 'outlined'}
          onClick={() => setEstado('')}
          sx={{ flexShrink: 0, fontWeight: filters.estado === '' ? 600 : 400 }}
        />
        {notasEstados.map((estado, index) => {
          const count = notas.filter((n) => n.estado === estado).length;
          return (
            <Chip
              key={estado}
              label={`${estado} (${count})`}
              size="small"
              color={filters.estado === estado ? getEstadoColor(index) : 'default'}
              variant={filters.estado === estado ? 'filled' : 'outlined'}
              onClick={() => setEstado(estado)}
              sx={{ flexShrink: 0, fontWeight: filters.estado === estado ? 600 : 400 }}
            />
          );
        })}
      </Box>
    </Box>
  ) : (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        p: 2,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      {/* Fila única: Filtros + Estados + Acciones */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} flexWrap="wrap">
        {/* Filtros de texto */}
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Proyecto</InputLabel>
            <Select
              value={filters.proyecto_id}
              onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
              label="Proyecto"
            >
              <MenuItem value="">Todos</MenuItem>
              {proyectos.map((proyecto) => (
                <MenuItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Buscar"
            placeholder="Código, descripción, proveedor..."
            value={filters.text}
            onChange={(e) => setFilters({ ...filters, text: e.target.value })}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <Chip
            label="Mis notas"
            color={filters.misNotas ? 'primary' : 'default'}
            variant={filters.misNotas ? 'filled' : 'outlined'}
            onClick={() => setFilters({ ...filters, misNotas: !filters.misNotas })}
            sx={{ cursor: 'pointer' }}
          />
        </Stack>

        {/* Filtros de estado - diseño mejorado */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {notasEstados.map((estado, index) => {
            const count = notas.filter((n) => n.estado === estado).length;
            const isSelected = filters.estado === estado;
            return (
              <Button
                key={estado}
                size="small"
                variant={isSelected ? 'contained' : 'text'}
                color={isSelected ? getEstadoColor(index) : 'inherit'}
                onClick={() => setEstado(estado)}
                sx={{
                  minWidth: 'auto',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected ? undefined : 'transparent',
                  '&:hover': {
                    backgroundColor: isSelected ? undefined : 'action.hover',
                  },
                }}
              >
                <Badge
                  badgeContent={count}
                  color={isSelected ? 'default' : getEstadoColor(index)}
                  sx={{
                    '& .MuiBadge-badge': {
                      position: 'relative',
                      transform: 'none',
                      mr: 0.75,
                      minWidth: 20,
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : undefined,
                    },
                  }}
                />
                {estado}
              </Button>
            );
          })}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Button
            size="small"
            variant={filters.estado === '' ? 'contained' : 'text'}
            color={filters.estado === '' ? 'primary' : 'inherit'}
            onClick={() => setEstado('')}
            sx={{
              minWidth: 'auto',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: filters.estado === '' ? 600 : 400,
            }}
          >
            <Badge
              badgeContent={notas.length}
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  position: 'relative',
                  transform: 'none',
                  mr: 0.75,
                  minWidth: 20,
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: filters.estado === '' ? 'rgba(255,255,255,0.3)' : undefined,
                },
              }}
            />
            Todos
          </Button>
        </Stack>

        {/* Acciones */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Actualizar">
            <IconButton onClick={fetchNotas} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar Excel">
            <IconButton onClick={handleExportToExcel} size="small">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Columnas visibles">
            <IconButton onClick={(e) => setColumnMenuAnchor(e.currentTarget)} size="small">
              <ViewColumnIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddDialog(true)}
          >
            Agregar nota
          </Button>
        </Stack>
      </Stack>
    </Box>
  )}
</Stack>

{/* Popover selector de columnas */}
<Popover
  open={Boolean(columnMenuAnchor)}
  anchorEl={columnMenuAnchor}
  onClose={() => setColumnMenuAnchor(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
>
  <Box sx={{ p: 2, minWidth: 220 }}>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>Columnas visibles</Typography>
    {Object.entries(COLUMN_LABELS).map(([key, label]) => (
      <Box key={key} sx={{ display: 'block' }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={visibleColumns[key]}
              onChange={(e) => setVisibleColumns(prev => ({ ...prev, [key]: e.target.checked }))}
              size="small"
            />
          }
          label={<Typography variant="body2">{label}</Typography>}
        />
      </Box>
    ))}
  </Box>
</Popover>

        {/* ── PDF CONFIG STRIP ─────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            px: { xs: 2, md: 2.5 },
            py: 1.5,
            border: `1.5px dashed ${alpha(C.indigo500, 0.35)}`,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(C.indigo50, 0.9)} 0%, ${alpha(C.indigo100, 0.5)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              bgcolor: 'white',
              border: `1px solid ${alpha(C.indigo500, 0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: `0 2px 8px ${alpha(C.indigo500, 0.1)}`,
              flexShrink: 0,
            }}>
              {basePdfTemplate?.logo_url ? (
                <img
                  src={basePdfTemplate.logo_url}
                  alt="logo empresa"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                />
              ) : (
                <PictureAsPdfIcon sx={{ color: alpha(C.indigo500, 0.5), fontSize: 22 }} />
              )}
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: C.indigo600, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: font, lineHeight: 1, display: 'block' }}
              >
                Configuración de PDF
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, lineHeight: 1.3, fontFamily: font }}>
                {pdfUiLoading
                  ? 'Actualizando...'
                  : basePdfTemplate?.logo_url
                    ? selectedPlantillaId
                      ? 'Logo configurado · Plantilla personalizada activa'
                      : 'Logo configurado · Plantilla base activa'
                    : 'Sin logo — requerido para generar PDFs'}
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon sx={{ fontSize: 16 }} />}
            onClick={() => { setOpenPdfPlantillasDialog(true); loadPdfBaseForDrawer(); }}
            sx={{
              borderColor: alpha(C.indigo500, 0.5),
              color: C.indigo600,
              fontFamily: font,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { borderColor: C.indigo500, bgcolor: alpha(C.indigo500, 0.06) },
            }}
          >
            Gestionar plantillas
          </Button>
        </Paper>

        {/* Estado de carga */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Empty state */}
        {!loading && filteredNotas.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              px: 3,
              textAlign: 'center',
            }}
          >
            <InboxIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {notas.length === 0 
                ? 'No hay notas de pedido' 
                : 'No se encontraron notas con los filtros aplicados'}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mb: 3, maxWidth: 400 }}>
              {notas.length === 0
                ? 'Comienza creando tu primera nota de pedido para gestionar tus solicitudes.'
                : 'Intenta ajustar los filtros de búsqueda para encontrar lo que buscas.'}
            </Typography>
            {notas.length === 0 ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddDialog(true)}
              >
                Crear primera nota
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setFilters({ text: '', estado: '', proyecto_id: '', proveedor: '', misNotas: false })}
              >
                Limpiar filtros
              </Button>
            )}
          </Box>
        )}

        {!loading && filteredNotas.length > 0 && (isMobile ? (
          <Box sx={{ pb: 16 }}>{/* padding inferior para no tapar con la toolbar fija */}
            <Stack spacing={1.5}>
              {paginatedNotas.map((nota) => (
                <Card
                  key={nota.id}
                  onClick={() => setComentariosDialogNota(nota)}
                  sx={{
                    cursor: 'pointer',
                    '&:active': { transform: 'scale(0.98)' },
                    transition: 'transform 0.1s, background-color 0.15s',
                    backgroundColor: selectedNotaIds.has(nota.id) ? alpha(C.indigo50, 0.9) : undefined,
                    border: selectedNotaIds.has(nota.id) ? `1.5px solid ${alpha(C.indigo500, 0.4)}` : '1.5px solid transparent',
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    {/* Header: código + estado + menú */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Checkbox
                          checked={selectedNotaIds.has(nota.id)}
                          onChange={(e) => toggleSelectNota(nota.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          size="small"
                          sx={{
                            p: 0.25,
                            mr: 0.5,
                            color: alpha(C.indigo500, 0.4),
                            '&.Mui-checked': { color: C.indigo600 },
                          }}
                        />
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          #{nota.codigo}
                        </Typography>
                        <Chip
                          label={nota.estado}
                          color={getEstadoColor(notasEstados.indexOf(nota.estado))}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 22 }}
                        />
                      </Stack>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileMenuAnchor(e.currentTarget);
                          setMobileMenuNota(nota);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    {/* Proyecto */}
                    {nota.proyecto_nombre && (
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {nota.proyecto_nombre}
                      </Typography>
                    )}

                    {/* Descripción truncada a 3 líneas */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {nota.descripcion}
                    </Typography>

                    {/* Info compacta en una fila */}
                    <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
                      {nota.proveedor && (
                        <Typography variant="caption" color="text.secondary">
                          <BusinessIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />
                          {nota.proveedor}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        <PersonIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />
                        {nota.owner_name}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatTimestamp(nota.fechaCreacion)}
                      </Typography>
                      {nota.comentarios?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          <CommentIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />
                          {nota.comentarios.length}
                        </Typography>
                      )}
                    </Stack>

                    {/* Botón de acción principal */}
                    {getEstadoSiguiente(nota.estado) && (
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        color={getEstadoColor(notasEstados.indexOf(nota.estado)+1)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangeEstado(nota);
                        }}
                        sx={{ mt: 1, textTransform: 'none', fontWeight: 500 }}
                      >
                        → {getEstadoSiguiente(nota.estado)}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Menú contextual de 3 puntos */}
            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={() => { setMobileMenuAnchor(null); setMobileMenuNota(null); }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => {
                setComentariosDialogNota(mobileMenuNota);
                setMobileMenuAnchor(null);
                setMobileMenuNota(null);
              }}>
                <CommentIcon fontSize="small" sx={{ mr: 1 }} /> Ver detalles
              </MenuItem>
              <MenuItem onClick={() => {
                handleEdit(mobileMenuNota);
                setMobileMenuAnchor(null);
                setMobileMenuNota(null);
              }}>
                <EditIcon fontSize="small" sx={{ mr: 1 }} /> Editar
              </MenuItem>
              {mobileMenuNota?.urlNota && (
                <MenuItem onClick={() => {
                  window.open(mobileMenuNota.urlNota, '_blank');
                  setMobileMenuAnchor(null);
                  setMobileMenuNota(null);
                }}>
                  <AttachFileIcon fontSize="small" sx={{ mr: 1 }} /> Ver adjunto
                </MenuItem>
              )}
              <MenuItem onClick={() => {
                openDeleteConfirmation(mobileMenuNota);
                setMobileMenuAnchor(null);
                setMobileMenuNota(null);
              }} sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Eliminar
              </MenuItem>
            </Menu>

            {/* Paginación */}
            <Card sx={{ mt: 2, boxShadow: 1 }}>
              <TablePagination
                component="div"
                count={filteredNotas.length}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[10, 25, 50, 100]}
                labelRowsPerPage=""
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    minHeight: 48,
                    py: 0.5,
                  },
                  '& .MuiTablePagination-actions': {
                    '& .MuiIconButton-root': { p: 1.5 },
                  },
                }}
              />
            </Card>
          </Box>
        ) : (
          <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ width: 48 }}>
                  <Checkbox
                    indeterminate={selectedNotaIds.size > 0 && selectedNotaIds.size < paginatedNotas.length}
                    checked={paginatedNotas.length > 0 && selectedNotaIds.size === paginatedNotas.length}
                    onChange={toggleSelectAll}
                    size="small"
                    sx={{ color: alpha(C.indigo500, 0.5), '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: C.indigo600 } }}
                  />
                </TableCell>
                {visibleColumns.codigo && (
                <TableCell onClick={() => handleSort('codigo')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Código {sortConfig.key === 'codigo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.proyecto_nombre && (
                <TableCell onClick={() => handleSort('proyecto_nombre')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Proyecto {sortConfig.key === 'proyecto_nombre' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.proveedor && (
                <TableCell onClick={() => handleSort('proveedor')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Proveedor {sortConfig.key === 'proveedor' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.owner_name && (
                <TableCell onClick={() => handleSort('owner_name')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Asignado {sortConfig.key === 'owner_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.descripcion && (
                <TableCell onClick={() => handleSort('descripcion')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Descripción {sortConfig.key === 'descripcion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.estado && (
                <TableCell onClick={() => handleSort('estado')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Estado {sortConfig.key === 'estado' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.fechaCreacion && (
                <TableCell onClick={() => handleSort('fechaCreacion')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Fecha Creación {sortConfig.key === 'fechaCreacion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                {visibleColumns.fechaEstimadaFin && (
                <TableCell onClick={() => handleSort('fechaEstimadaFin')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Finalización estimada {sortConfig.key === 'fechaEstimadaFin' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                )}
                <TableCell sx={{ textAlign: 'right' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedNotas.map((nota) => (
                <TableRow
                  key={nota.id}
                  onClick={() => setComentariosDialogNota(nota)}
                  sx={{
                    '&:hover': {
                      backgroundColor: selectedNotaIds.has(nota.id) ? alpha(C.indigo100, 0.7) : 'action.hover',
                      '& .row-checkbox': { opacity: 1 },
                    },
                    transition: 'background-color 0.15s',
                    cursor: 'pointer',
                    backgroundColor: selectedNotaIds.has(nota.id) ? alpha(C.indigo50, 0.9) : undefined,
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => toggleSelectNota(nota.id, e)} sx={{ width: 48 }}>
                    <Checkbox
                      className="row-checkbox"
                      checked={selectedNotaIds.has(nota.id)}
                      size="small"
                      sx={{
                        opacity: selectedNotaIds.has(nota.id) ? 1 : 0,
                        transition: 'opacity 0.15s',
                        color: alpha(C.indigo500, 0.5),
                        '&.Mui-checked': { color: C.indigo600 },
                      }}
                    />
                  </TableCell>
                  {visibleColumns.codigo && <TableCell>{nota.codigo}</TableCell>}
                  {visibleColumns.proyecto_nombre && <TableCell>{nota.proyecto_nombre}</TableCell>}
                  {visibleColumns.proveedor && <TableCell>{nota.proveedor}</TableCell>}
                  {visibleColumns.owner_name && (
                  <TableCell>
                    <Typography variant="body2">{nota.owner_name}</Typography>
                    {nota.creador_name && nota.creador_name !== nota.owner_name && (
                      <Typography variant="caption" color="text.secondary">
                        Creado por: {nota.creador_name}
                      </Typography>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.descripcion && (
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Tooltip 
                      title={nota.descripcion || ''} 
                      arrow 
                      placement="top"
                      enterDelay={500}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          whiteSpace: 'pre-line',
                          cursor: 'default',
                        }}
                      >
                        {nota.descripcion}
                      </Typography>
                    </Tooltip>
                    {nota.urlNota && nota.urlNota.trim() !== '' && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => window.open(nota.urlNota, '_blank')}
                        sx={{ mt: 1 }}
                      >
                        Ver adjunto
                      </Button>
                    )}
                  </TableCell>
                  )}
                  {visibleColumns.estado && (
                  <TableCell>
                    <Chip
                      label={nota.estado}
                      color={
                        getEstadoColor(notasEstados.indexOf(nota.estado))
                      }
                    />
                  </TableCell>
                  )}
                  {visibleColumns.fechaCreacion && <TableCell>{formatTimestamp(nota.fechaCreacion)}</TableCell>}
                  {visibleColumns.fechaEstimadaFin && <TableCell>{nota.fechaEstimadaFin ? formatTimestamp(nota.fechaEstimadaFin) : '—'}</TableCell>}
                  <TableCell sx={{ minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                      {/* Acción principal visible */}
                      {notasEstados.indexOf(nota.estado) !== (notasEstados.length - 1) && (
                        <Button
                          variant="contained"
                          size="small"
                          color={getEstadoColor(notasEstados.indexOf(nota.estado)+1)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeEstado(nota);
                          }}
                        >
                          → {getEstadoSiguiente(nota.estado)}
                        </Button>
                      )}
                      
                      {/* Comentarios - mostrar como chip si hay */}
                      {nota.comentarios?.length > 0 && (
                        <Chip
                          icon={<CommentIcon fontSize="small" />}
                          label={nota.comentarios.length}
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            setComentariosDialogNota(nota);
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                    </Stack>

                    </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredNotas.length}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50, 100]}
            labelRowsPerPage="Filas por página:"
          />
          </>
        ))}
  {isMobile && (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        px: 1,
        py: 1,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Button
        size="small"
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenAddDialog(true)}
        sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}
      >
        Agregar
      </Button>
      <IconButton onClick={() => setOpenFilters(true)} color="primary">
        <Badge variant="dot" invisible={!filters.estado && !filters.proyecto_id && !filters.misNotas} color="error">
          <FilterListIcon />
        </Badge>
      </IconButton>
      <IconButton onClick={fetchNotas} color="primary">
        <RefreshIcon />
      </IconButton>
      <IconButton onClick={handleExportToExcel} color="primary">
        <DownloadIcon />
      </IconButton>
    </Paper>
  )}

        {/* Dialog para editar nota */}
        <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth="sm" fullWidth>
  <DialogTitle>Editar Nota</DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <TextField
        label="Descripción"
        value={formData.descripcion}
        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
        multiline
        rows={3}
        fullWidth
      />
      <TextField
        label="Proveedor"
        value={formData.proveedor}
        onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
        >
          {notasEstados.map((estado) => (
            <MenuItem key={estado} value={estado}>
              {estado}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
  <InputLabel>Asignar a</InputLabel>
  <Select
    value={formData.owner || ''}
    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
  >
    {profiles.map((profile) => (
      <MenuItem key={profile.id} value={profile.id}>
        {profile.firstName + " "+ profile.lastName}
      </MenuItem>
    ))}
  </Select>
</FormControl>
<FormControl fullWidth>
  <InputLabel>Proyecto</InputLabel>
  <Select
    value={formData.proyecto_id || ''}
    onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })}
  >
    {proyectos.map((proyecto) => (
      <MenuItem key={proyecto.id} value={proyecto.id}>
        {proyecto.nombre}
      </MenuItem>
    ))}
    <MenuItem key='no-definido' value=''>
        No definido
      </MenuItem>
  </Select>
</FormControl>
<TextField
  label="Fecha estimada de finalización"
  type="date"
  value={formData.fechaEstimadaFin || ''}
  onChange={(e) => setFormData({ ...formData, fechaEstimadaFin: e.target.value || null })}
  fullWidth
  InputLabelProps={{ shrink: true }}
/>
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
    <Button onClick={handleSaveEdit} variant="contained">
      Guardar Cambios
    </Button>
  </DialogActions>
</Dialog>

        <NotaPedidoAddDialog
          open={openAddDialog}
          onClose={() => setOpenAddDialog(false)}
          onSave={handleSaveNewNote}
          profiles={profiles}
          proyectos={proyectos}
        />

<Dialog open={openDeleteDialog} onClose={closeDeleteConfirmation}>
  <DialogTitle>Confirmar eliminación</DialogTitle>
  <DialogContent>
    <Typography>
      ¿Estás seguro de que deseas eliminar la nota con código <strong>&quot;{notaToDelete?.codigo}&quot;</strong>? Esta acción no se puede deshacer.
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={closeDeleteConfirmation}>Cancelar</Button>
    <Button
      color="error"
      variant="contained"
      onClick={async () => {
        try {
          const success = await notaPedidoService.deleteNota(notaToDelete.id);
          if (success) {
            setNotas(notas.filter((n) => n.id !== notaToDelete.id));
            setAlert({ open: true, message: 'Nota eliminada con éxito', severity: 'success' });
          } else {
            setAlert({ open: true, message: 'Error al eliminar la nota', severity: 'error' });
          }
        } catch (error) {
          console.error('Error al eliminar nota:', error);
          setAlert({ open: true, message: 'Error al eliminar la nota', severity: 'error' });
        }
        closeDeleteConfirmation();
      }}
    >
      Eliminar
    </Button>
  </DialogActions>
</Dialog>

<NotaPedidoLogoRequeridoDialog
  open={openLogoRequeridoModal}
  onClose={() => setOpenLogoRequeridoModal(false)}
  loading={pdfUiLoading}
  onSaveAndDownload={handleLogoRequiredSaveAndDownload}
/>

<NotaPedidoPdfTemplateDialog
  open={openPdfPlantillasDialog}
  onClose={() => setOpenPdfPlantillasDialog(false)}
  baseTemplate={basePdfTemplate}
  loading={pdfUiLoading}
  onSaveLogo={handleSaveLogoFromDialog}
  empresaId={getEmpresaId()}
  sampleNota={comentariosDialogNota}
  selectedPlantillaId={selectedPlantillaId}
  onTemplateSelected={(id) => setSelectedPlantillaId(id)}
  onPlantillaGuardada={() => {
    loadPdfBaseForDrawer();
    setAlert({ open: true, message: 'Plantilla guardada correctamente', severity: 'success' });
  }}
/>

{/* Drawer lateral estilo Notion para ver detalles de la nota */}
<Drawer
  anchor="right"
  open={!!comentariosDialogNota}
  onClose={() => {
    setComentariosDialogNota(null);
    setDrawerTab(0);
  }}
  PaperProps={{
    sx: { width: { xs: '100%', sm: 500 }, p: 0 }
  }}
>
  {comentariosDialogNota && (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header mejorado */}
      <Box sx={{ 
        p: 2.5, 
        background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            {/* Código + Proyecto */}
            <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                #{comentariosDialogNota.codigo}
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                {comentariosDialogNota.proyecto_nombre}
              </Typography>
            </Stack>
            
            {/* Estado como badge pequeño */}
            <Chip
              label={comentariosDialogNota.estado}
              color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado))}
              size="small"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          </Box>
          <IconButton 
            onClick={() => {
              setComentariosDialogNota(null);
              setDrawerTab(0);
            }} 
            size="small"
            sx={{ bgcolor: 'action.hover' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Stepper de progreso */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Paso {notasEstados.indexOf(comentariosDialogNota.estado) + 1} de {notasEstados.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Math.round(((notasEstados.indexOf(comentariosDialogNota.estado) + 1) / notasEstados.length) * 100)}%
            </Typography>
          </Stack>
          <LinearProgress 
            variant="determinate" 
            value={((notasEstados.indexOf(comentariosDialogNota.estado) + 1) / notasEstados.length) * 100}
            color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado))}
            sx={{ 
              height: 6, 
              borderRadius: 3,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': { borderRadius: 3 }
            }}
          />
          <Stack direction="row" justifyContent="space-between" mt={0.5}>
            {notasEstados.map((estado, idx) => (
              <Typography 
                key={estado}
                variant="caption" 
                color={idx <= notasEstados.indexOf(comentariosDialogNota.estado) ? `${getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado))}.main` : 'text.disabled'}
                fontWeight={idx === notasEstados.indexOf(comentariosDialogNota.estado) ? 600 : 400}
                sx={{ fontSize: '0.65rem' }}
              >
                {estado}
              </Typography>
            ))}
          </Stack>
        </Box>

        {/* Acción principal prominente */}
        {notasEstados.indexOf(comentariosDialogNota.estado) !== (notasEstados.length - 1) && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado)+1)}
            onClick={() => handleChangeEstado(comentariosDialogNota)}
            sx={{ 
              mt: 2, 
              py: 1.5, 
              fontWeight: 600,
              boxShadow: 2,
            }}
          >
            → Pasar a {getEstadoSiguiente(comentariosDialogNota.estado)}
          </Button>
        )}

        {/* Acciones secundarias como links */}
        <Stack direction="row" spacing={2} mt={1.5} justifyContent="center">
          <Button
            size="small"
            color="inherit"
            startIcon={<EditIcon fontSize="small" />}
            onClick={() => {
              handleEdit(comentariosDialogNota);
              setComentariosDialogNota(null);
            }}
            sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.8rem' }}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon fontSize="small" />}
            onClick={() => {
              openDeleteConfirmation(comentariosDialogNota);
              setComentariosDialogNota(null);
            }}
            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
          >
            Eliminar
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={pdfDownloading ? <CircularProgress size={12} color="inherit" /> : <PictureAsPdfIcon />}
            disabled={pdfDownloading}
            onClick={handleDownloadPdfNota}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.8rem' }}
          >
            Descargar PDF
          </Button>
        </Stack>
      </Box>

      {/* Tabs de navegación */}
      <Tabs 
        value={drawerTab} 
        onChange={(e, v) => setDrawerTab(v)}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          minHeight: 48,
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500, px: 2 }
        }}
      >
        <Tab 
          label="Detalles" 
          icon={<DescriptionIcon sx={{ fontSize: 18 }} />} 
          iconPosition="start"
        />
        <Tab 
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Comentarios</span>
              {(comentariosDialogNota.comentarios?.length || 0) > 0 && (
                <Chip label={comentariosDialogNota.comentarios.length} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<CommentIcon sx={{ fontSize: 18 }} />} 
          iconPosition="start"
        />
        <Tab 
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Historial</span>
              {(comentariosDialogNota.historial?.length || 0) > 0 && (
                <Chip label={comentariosDialogNota.historial.length} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Stack>
          }
          icon={<HistoryIcon sx={{ fontSize: 18 }} />} 
          iconPosition="start"
        />
      </Tabs>

      {/* Contenido por Tab */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        
        {/* TAB 0: Detalles */}
        {drawerTab === 0 && (
          <Stack spacing={2.5}>
            {/* Descripción */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {comentariosDialogNota.descripcion || 'Sin descripción'}
              </Typography>
            </Box>

            {/* Info compacta con iconos */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 2,
            }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <BusinessIcon fontSize="small" color="action" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Proveedor</Typography>
                  <Typography variant="body2" fontWeight={500}>{comentariosDialogNota.proveedor || '-'}</Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Responsable</Typography>
                  <Typography variant="body2" fontWeight={500}>{comentariosDialogNota.owner_name}</Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Creado por</Typography>
                  <Typography variant="body2" fontWeight={500}>{comentariosDialogNota.creador_name}</Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body2" fontWeight={500}>{formatTimestamp(comentariosDialogNota.fechaCreacion)}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Finalización estimada</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {comentariosDialogNota.fechaEstimadaFin ? formatTimestamp(comentariosDialogNota.fechaEstimadaFin) : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Adjunto de la nota */}
            {comentariosDialogNota.urlNota && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AttachFileIcon />}
                onClick={() => window.open(comentariosDialogNota.urlNota, '_blank')}
              >
                Ver adjunto de la nota
              </Button>
            )}
          </Stack>
        )}

        {/* TAB 1: Comentarios */}
        {drawerTab === 1 && (
          <Stack spacing={2}>
            {/* Input de comentario o archivo */}
            <Box sx={{ 
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.200',
            }}>
              {/* Textarea + botón enviar */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  placeholder="Escribe un comentario..."
                  multiline
                  maxRows={3}
                  fullWidth
                  size="small"
                  inputRef={nuevoComentarioRef}
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                  sx={{ '& .MuiInputBase-root': { p: 0 } }}
                />
                <IconButton 
                  color="primary" 
                  onClick={handleAgregarComentario}
                  disabled={comentariosCargando}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  {comentariosCargando ? <CircularProgress size={20} /> : <SendIcon />}
                </IconButton>
              </Box>

              {/* Separador con "o" */}
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary">o adjunta un archivo</Typography>
              </Divider>

              {/* Zona de subir archivo compacta */}
              <Box
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files[0]) {
                    setArchivoSeleccionado(e.dataTransfer.files[0]);
                  }
                }}
                sx={{
                  border: '1px dashed',
                  borderColor: isDragging ? 'primary.main' : 'grey.300',
                  borderRadius: 1.5,
                  p: 1.5,
                  textAlign: 'center',
                  bgcolor: isDragging ? alpha('#1976d2', 0.05) : 'transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
                component="label"
              >
                <input
                  type="file"
                  hidden
                  onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
                />
                <CloudUploadIcon sx={{ fontSize: 20, color: isDragging ? 'primary.main' : 'grey.400' }} />
                {archivoSeleccionado ? (
                  <Typography variant="body2" fontWeight={500} color="primary.main">
                    {archivoSeleccionado.name}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Arrastra o selecciona un archivo
                  </Typography>
                )}
              </Box>
              {archivoSeleccionado && (
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<CloudUploadIcon />}
                  onClick={async () => {
                    if (!comentariosDialogNota || !archivoSeleccionado) return;
                    try {
                      const nota = await notaPedidoService.subirArchivo(comentariosDialogNota.id, archivoSeleccionado);
                      if (nota) {
                        setNotas(notas.map((n) => (n.id === nota.id ? nota : n)));
                        setComentariosDialogNota(nota);
                        setAlert({ open: true, message: 'Archivo subido con éxito', severity: 'success' });
                      } else {
                        setAlert({ open: true, message: 'Error al subir archivo', severity: 'error' });
                      }
                      setArchivoSeleccionado(null);
                    } catch (error) {
                      console.error('Error subiendo archivo:', error);
                      setAlert({ open: true, message: 'Error al subir archivo', severity: 'error' });
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  Subir archivo
                </Button>
              )}
            </Box>

            {/* Lista de comentarios */}
            {comentariosDialogNota?.comentarios?.length > 0 ? (
              <Stack spacing={1.5}>
                {comentariosDialogNota.comentarios.map((comentario, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'background.paper', 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100',
                      position: 'relative',
                      '&:hover .comment-actions': { opacity: 1 },
                    }}
                    onMouseEnter={() => setHoveredComentario(idx)}
                    onMouseLeave={() => setHoveredComentario(null)}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box sx={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Typography variant="caption" color="white" fontWeight={600}>
                          {comentario.autor?.charAt(0)?.toUpperCase() || 'U'}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {comentario.autor}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatTimestamp(comentario.fecha)}
                          </Typography>
                        </Stack>
                        
                        {comentarioEditandoIdx === idx ? (
                          <Box mt={1}>
                            <TextField
                              fullWidth
                              multiline
                              value={comentarioEditadoTexto}
                              onChange={(e) => setComentarioEditadoTexto(e.target.value)}
                              rows={2}
                              size="small"
                            />
                            <Stack direction="row" spacing={1} mt={1}>
                              <Button size="small" variant="contained" onClick={() => handleGuardarComentarioEditado(idx)}>
                                Guardar
                              </Button>
                              <Button size="small" onClick={() => { setComentarioEditandoIdx(null); setComentarioEditadoTexto(''); }}>
                                Cancelar
                              </Button>
                            </Stack>
                          </Box>
                        ) : (
                          <>
                            {comentario.texto && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                                {comentario.texto}
                              </Typography>
                            )}
                            {comentario.url && (
                              <Button size="small" variant="text" startIcon={<AttachFileIcon />} onClick={() => window.open(comentario.url, '_blank')} sx={{ mt: 1, p: 0 }}>
                                Ver archivo
                              </Button>
                            )}
                          </>
                        )}
                      </Box>
                    </Stack>

                    {/* Acciones ocultas hasta hover */}
                    {hoveredComentario === idx && comentarioEditandoIdx !== idx && (
                      <Stack 
                        className="comment-actions"
                        direction="row" 
                        spacing={0.5}
                        sx={{ 
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                      >
                        {comentario.texto && (
                          <IconButton size="small" onClick={() => { setComentarioEditandoIdx(idx); setComentarioEditadoTexto(comentario.texto); }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton size="small" color="error" onClick={() => handleEliminarComentario(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CommentIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No hay comentarios aún
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {/* TAB 2: Historial */}
        {drawerTab === 2 && (
          <>
            {comentariosDialogNota?.historial?.length > 0 ? (
              <Box sx={{ position: 'relative', pl: 3 }}>
                {/* Línea vertical del timeline */}
                <Box sx={{ 
                  position: 'absolute', 
                  left: 8, 
                  top: 8, 
                  bottom: 8, 
                  width: 2, 
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                }} />
                
                <Stack spacing={2}>
                  {[...comentariosDialogNota.historial].reverse().map((evento, idx) => (
                    <Box 
                      key={idx} 
                      sx={{ 
                        position: 'relative',
                        pl: 2,
                      }}
                    >
                      {/* Punto del timeline */}
                      <Box sx={{ 
                        position: 'absolute', 
                        left: -19, 
                        top: 4,
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%',
                        bgcolor: evento.campo === 'Estado' ? 'primary.main' : 'grey.400',
                        border: '2px solid',
                        borderColor: 'background.paper',
                        boxShadow: 1,
                      }} />
                      
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.100',
                      }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          {evento.campo === 'Estado' && <AssignmentIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                          {evento.campo === 'Descripción' && <DescriptionIcon sx={{ fontSize: 16, color: 'grey.500' }} />}
                          {evento.campo === 'Proveedor' && <BusinessIcon sx={{ fontSize: 16, color: 'grey.500' }} />}
                          {evento.campo === 'Responsable' && <PersonIcon sx={{ fontSize: 16, color: 'grey.500' }} />}
                          {evento.campo === 'Proyecto' && <HomeIcon sx={{ fontSize: 16, color: 'grey.500' }} />}
                          <Typography variant="body2" fontWeight={600}>
                            {evento.campo}
                          </Typography>
                        </Stack>
                        
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              textDecoration: 'line-through', 
                              color: 'text.disabled',
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {evento.valor_anterior}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">→</Typography>
                          {evento.campo === 'Estado' ? (
                            <Chip
                              label={evento.valor_nuevo}
                              size="small"
                              color={getEstadoColor(notasEstados.indexOf(evento.valor_nuevo))}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ) : (
                            <Typography 
                              variant="body2" 
                              fontWeight={500}
                              sx={{ 
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {evento.valor_nuevo}
                            </Typography>
                          )}
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {formatTimestamp(evento.fecha)} • {evento.usuario_nombre || 'Sistema'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <HistoryIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Sin cambios registrados
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  )}
</Drawer>

        <Dialog open={openFilters} onClose={() => setOpenFilters(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Filtros</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label="Buscar por texto"
                value={filters.text}
                onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.estado}
                  onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {notasEstados.map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {estado}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filters.proyecto_id}
                  onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                    {proyectos.map((proyecto) => (
                      <MenuItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              <Chip
                label="Mis notas"
                color={filters.misNotas ? 'primary' : 'default'}
                variant={filters.misNotas ? 'filled' : 'outlined'}
                onClick={() => setFilters({ ...filters, misNotas: !filters.misNotas })}
                sx={{ cursor: 'pointer', alignSelf: 'flex-start' }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFilters(false)}>Cerrar</Button>
            <Button
              onClick={() => {
                applyFilters();
                setOpenFilters(false);
              }}
              variant="contained"
            >
              Aplicar
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
            {alert.message}
          </Alert>
        </Snackbar>

        {/* ── Bulk action bar ─────────────────────────────────────────────── */}
        {selectedNotaIds.size > 0 && (
          <Paper
            elevation={0}
            sx={{
              position: 'fixed',
              bottom: isMobile ? 76 : 28,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1300,
              borderRadius: 3,
              px: 2.5,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: `linear-gradient(135deg, ${C.slate900} 0%, ${C.slate800} 100%)`,
              border: `1px solid ${alpha(C.indigo500, 0.35)}`,
              boxShadow: `0 12px 40px ${alpha(C.slate900, 0.45)}, 0 0 0 1px ${alpha(C.indigo500, 0.15)}, inset 0 1px 0 ${alpha('#ffffff', 0.04)}`,
              minWidth: isMobile ? 'calc(100vw - 32px)' : 360,
              maxWidth: isMobile ? 'calc(100vw - 32px)' : 560,
            }}
          >
            {/* Count / progress */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {bulkPdfDownloading ? (
                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.7), fontFamily: font }}>
                      Descargando {bulkPdfProgress.current} de {bulkPdfProgress.total}...
                    </Typography>
                    <Typography variant="caption" sx={{ color: C.indigo500, fontWeight: 700, fontFamily: font }}>
                      {Math.round((bulkPdfProgress.current / bulkPdfProgress.total) * 100)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(bulkPdfProgress.current / bulkPdfProgress.total) * 100}
                    sx={{
                      height: 3,
                      borderRadius: 2,
                      bgcolor: alpha('#ffffff', 0.08),
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${C.indigo600}, ${C.indigo500})`,
                      },
                    }}
                  />
                </Box>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: 1,
                      bgcolor: alpha(C.indigo500, 0.2),
                      border: `1px solid ${alpha(C.indigo500, 0.4)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: C.indigo500, fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }}>
                      {selectedNotaIds.size}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.9), fontFamily: font, fontWeight: 500 }}>
                    Nota{selectedNotaIds.size !== 1 ? 's' : ''} seleccionada{selectedNotaIds.size !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
              )}
            </Box>

            {/* Deselect */}
            <Button
              size="small"
              onClick={() => setSelectedNotaIds(new Set())}
              disabled={bulkPdfDownloading}
              sx={{
                color: alpha('#ffffff', 0.5),
                fontFamily: font,
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '0.78rem',
                minWidth: 'auto',
                px: 1,
                '&:hover': { color: alpha('#ffffff', 0.85), bgcolor: alpha('#ffffff', 0.06) },
              }}
            >
              Limpiar
            </Button>

            {/* Download PDFs */}
            <Button
              variant="contained"
              size="small"
              startIcon={bulkPdfDownloading
                ? <CircularProgress size={13} sx={{ color: 'white' }} />
                : <PictureAsPdfIcon sx={{ fontSize: '14px !important' }} />
              }
              onClick={handleBulkDownloadPdf}
              disabled={bulkPdfDownloading}
              sx={{
                background: `linear-gradient(135deg, ${C.indigo600} 0%, ${C.indigo500} 100%)`,
                fontFamily: font,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.82rem',
                px: 2,
                py: 0.75,
                borderRadius: 2,
                boxShadow: `0 4px 14px ${alpha(C.indigo600, 0.5)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${C.indigo500} 0%, ${C.indigo600} 100%)`,
                  boxShadow: `0 6px 20px ${alpha(C.indigo600, 0.6)}`,
                },
                '&:disabled': { background: alpha(C.indigo600, 0.35), boxShadow: 'none' },
                whiteSpace: 'nowrap',
              }}
            >
              Descargar PDF{selectedNotaIds.size !== 1 ? 's' : ''}
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

NotaPedidoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default NotaPedidoPage;
