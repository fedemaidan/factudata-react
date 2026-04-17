import Head from 'next/head';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
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
  Skeleton,
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
import Paper from '@mui/material/Paper';
import Menu from '@mui/material/Menu';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getProyectosFromUser } from 'src/services/proyectosService';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import { formatTimestamp } from 'src/utils/formatters';
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
  const [openAddDialog, setOpenAddDialog] = useState(false);
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
  const [drawerTab, setDrawerTab] = useState(0);
  const [hoveredComentario, setHoveredComentario] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [mobileMenuNota, setMobileMenuNota] = useState(null);
  const [openPdfPlantillasDialog, setOpenPdfPlantillasDialog] = useState(false);
  const [openLogoRequeridoModal, setOpenLogoRequeridoModal] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [basePdfTemplate, setBasePdfTemplate] = useState(null);
  const [pdfUiLoading, setPdfUiLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '', proyecto_id: '', estado: '', owner: '', creador: '', proveedor: ''
  });
  const [filters, setFilters] = useState({ text: '', estado: '', proyecto_id: '', proveedor: '', misNotas: false });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'), { noSsr: true });

  const sortedNotas = useMemo(() => {
    return [...filteredNotas].sort((a, b) => {
      if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
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

  const handlePageChange = (event, newPage) => setPage(newPage);
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => { setPage(0); }, [filters]);

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
      setNotas((prev) => prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n)));
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
      setNotas((prev) => prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n)));
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
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
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
        componentUrl: cfg.componentUrl || null,
      });
      setAlert({ open: true, message: 'PDF descargado', severity: 'success' });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'No se pudo generar el PDF', severity: 'error' });
    } finally {
      setPdfDownloading(false);
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
      const proyectosData = await getProyectosFromUser(user);
      setProyectos(proyectosData);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
    }
  }, [user]);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const empresa = await getEmpresaDetailsFromUser(user);
        const estados = empresa.notas_estados || ['Pendiente', 'En proceso', 'Completa'];
        setNotasEstados(estados);
      } catch (error) {
        console.error('Error al obtener los estados de nota de pedido:', error);
      }
    };
    if (user) fetchEmpresa();
  }, [user]);

  const getEstadoSiguiente = (estado) => {
    const index = notasEstados.indexOf(estado);
    if (index === -1 || index === notasEstados.length - 1) return null;
    return notasEstados[index + 1];
  };

  const getEstadoColor = (index) => {
    if (index < 0) return 'primary';
    let colors;
    switch (notasEstados.length) {
      case 0: case 1: return 'primary';
      case 2: colors = ['primary', 'success']; break;
      case 3: colors = ['warning', 'primary', 'success']; break;
      case 4: colors = ['warning', 'info', 'primary', 'success']; break;
      default: colors = ['secondary', 'warning', 'info', 'primary', 'success']; break;
    }
    return colors[index % colors.length] || 'primary';
  };

  useEffect(() => {
    if (user) { fetchProfiles(); fetchProyectos(); }
  }, [user]);

  const handleAgregarComentario = async () => {
    const texto = nuevoComentarioRef.current.value.trim();
    if (!comentariosDialogNota || !texto) return;
    const nuevo = { texto, autor: `${user.firstName} ${user.lastName}`, fecha: new Date().toISOString() };
    const comentariosActualizados = [...(comentariosDialogNota.comentarios || []), nuevo];
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
    try {
      setComentariosCargando(true);
      const notaServidor = await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      if (!notaServidor) throw new Error('No se pudo actualizar la nota');
      setNotas((prev) => prev.map((n) => (n.id === comentariosDialogNota.id ? notaServidor : n)));
      setComentariosDialogNota(notaServidor);
      nuevoComentarioRef.current.value = '';
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
    if (filters.estado) filtered = filtered.filter((nota) => nota.estado === filters.estado);
    if (filters.proyecto_id) filtered = filtered.filter((nota) => nota.proyecto_id === filters.proyecto_id);
    if (filters.misNotas && user) {
      filtered = filtered.filter((nota) => nota.owner === user.id || nota.creador === user.id);
    }
    setFilteredNotas(filtered);
  };

  const setEstado = (estado) => {
    setFilters({ ...filters, estado: filters.estado === estado ? '' : estado });
  };

  const handleEdit = (nota) => {
    setCurrentNota(nota);
    setFormData({ descripcion: nota.descripcion, estado: nota.estado, owner: nota.owner, creador: nota.creador, proyecto_id: nota.proyecto_id, proveedor: nota.proveedor });
    setIsEditing(true);
  };

  const handleSaveNewNote = async (data) => {
    try {
      const ownerObj = profiles.find((p) => p.id === data.owner);
      const proyectoObj = proyectos.find((p) => p.id === data.proyecto_id);
      const newNote = {
        ...data,
        owner: data.owner || user.id,
        owner_name: ownerObj ? `${ownerObj.firstName} ${ownerObj.lastName}` : `${user.firstName} ${user.lastName}`,
        estado: notasEstados[0],
        empresaId: user?.empresa?.id || user?.empresaData?.id || user?.empresa_id,
        creador: user.id,
        creador_name: `${user.firstName} ${user.lastName}`,
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

  const openDeleteConfirmation = (nota) => { setNotaToDelete(nota); setOpenDeleteDialog(true); };
  const closeDeleteConfirmation = () => { setNotaToDelete(null); setOpenDeleteDialog(false); };

  const handleSaveEdit = async () => {
    try {
      if (formData?.owner) {
        const ownerObj = profiles.filter((p) => p.id === formData.owner)[0];
        formData.owner_name = `${ownerObj.firstName} ${ownerObj.lastName}`;
      }
      if (formData?.proyecto_id) {
        const proyectoObj = proyectos.filter((p) => p.id === formData.proyecto_id)[0];
        formData.proyecto_nombre = proyectoObj.nombre;
      }
      if (formData?.proyecto_id === '') {
        formData.proyecto_nombre = null;
        formData.proyecto_id = null;
      }
      const updatedNota = { ...currentNota, ...formData };
      const notaServidor = await notaPedidoService.updateNota(currentNota.id, {
        ...updatedNota, _userName: `${user.firstName} ${user.lastName}`
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
    if (index === -1 || index === notasEstados.length - 1) return;
    const nuevoEstado = notasEstados[index + 1];
    if (!nuevoEstado) return;
    try {
      const updatedNota = { ...nota, estado: nuevoEstado, _userName: `${user.firstName} ${user.lastName}` };
      const notaServidor = await notaPedidoService.updateNota(nota.id, updatedNota);
      if (notaServidor) {
        setNotas(notas.map((n) => (n.id === nota.id ? notaServidor : n)));
        if (comentariosDialogNota?.id === nota.id) setComentariosDialogNota(notaServidor);
        setAlert({ open: true, message: `Estado cambiado a "${nuevoEstado}"`, severity: 'success' });
      } else {
        setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
      }
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      setAlert({ open: true, message: 'Error al cambiar el estado', severity: 'error' });
    }
  };

  useEffect(() => {
    const label = userById
      ? `Notas de Pedido de ${userById.firstName || ''} ${userById.lastName || ''}`.trim()
      : 'Notas de Pedido';
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label, icon: <AssignmentIcon fontSize="small" /> },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, userById]);

  useEffect(() => { if (user) fetchNotas(); }, [user, fetchNotas]);
  useEffect(() => { applyFilters(); }, [filters, notas]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const SortLabel = ({ col }) => (
    <Box component="span" sx={{ ml: 0.5, opacity: 0.5, fontSize: '0.7rem' }}>
      {sortConfig.key === col ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
    </Box>
  );

  const estadoCountMap = useMemo(() => {
    const map = {};
    notasEstados.forEach((e) => { map[e] = notas.filter((n) => n.estado === e).length; });
    return map;
  }, [notas, notasEstados]);

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: isMobile ? 2 : 4,
          px: isMobile ? 1.5 : 3,
          bgcolor: C.slate50,
          fontFamily: font,
          minHeight: '100vh',
        }}
      >
        <Container maxWidth={false}>

          {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
          {!isMobile && (
            <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: C.slate400, letterSpacing: '0.12em', fontFamily: font, fontWeight: 600, fontSize: '0.7rem' }}
                >
                  Gestión de compras
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontFamily: font, fontWeight: 800, color: C.slate900, lineHeight: 1.15, mt: 0.25 }}
                >
                  Notas de Pedido
                </Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Chip
                    label={`${notas.length} total`}
                    size="small"
                    sx={{ bgcolor: C.slate200, color: C.slate700, fontFamily: font, fontWeight: 600, borderRadius: 1.5 }}
                  />
                  {notasEstados.map((estado, idx) => {
                    const count = estadoCountMap[estado] || 0;
                    return count > 0 ? (
                      <Chip
                        key={estado}
                        label={`${count} ${estado}`}
                        size="small"
                        color={getEstadoColor(idx)}
                        variant="outlined"
                        sx={{ fontFamily: font, fontWeight: 500, borderRadius: 1.5 }}
                      />
                    ) : null;
                  })}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Actualizar">
                  <IconButton onClick={fetchNotas} sx={{ border: `1px solid ${C.slate200}`, bgcolor: 'white' }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exportar Excel">
                  <IconButton onClick={handleExportToExcel} sx={{ border: `1px solid ${C.slate200}`, bgcolor: 'white' }}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddDialog(true)}
                  sx={{
                    bgcolor: C.slate900,
                    color: 'white',
                    fontFamily: font,
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    boxShadow: `0 4px 14px ${alpha(C.slate900, 0.25)}`,
                    '&:hover': { bgcolor: C.slate800 },
                  }}
                >
                  Nueva nota
                </Button>
              </Stack>
            </Box>
          )}

          {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
          <Paper
            elevation={0}
            sx={{
              mb: 2,
              border: `1px solid ${C.slate200}`,
              borderRadius: 3,
              bgcolor: 'white',
              overflow: 'hidden',
            }}
          >
            {isMobile ? (
              <Box sx={{ p: 1.5 }}>
                <TextField
                  placeholder="Buscar código, descripción, proveedor..."
                  value={filters.text}
                  onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                  size="small"
                  fullWidth
                  InputProps={{ startAdornment: <SearchIcon sx={{ color: C.slate400, mr: 1, fontSize: 18 }} /> }}
                  sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Box sx={{
                  display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5,
                  '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
                }}>
                  <Chip
                    label={`Todos (${notas.length})`} size="small"
                    color={filters.estado === '' ? 'primary' : 'default'}
                    variant={filters.estado === '' ? 'filled' : 'outlined'}
                    onClick={() => setEstado('')}
                    sx={{ flexShrink: 0, fontFamily: font, fontWeight: 600, borderRadius: 10 }}
                  />
                  {notasEstados.map((estado, index) => (
                    <Chip
                      key={estado}
                      label={`${estado} (${estadoCountMap[estado] || 0})`}
                      size="small"
                      color={filters.estado === estado ? getEstadoColor(index) : 'default'}
                      variant={filters.estado === estado ? 'filled' : 'outlined'}
                      onClick={() => setEstado(estado)}
                      sx={{ flexShrink: 0, fontFamily: font, fontWeight: filters.estado === estado ? 600 : 400, borderRadius: 10 }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                  {/* Left: text + project + mis notas */}
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <TextField
                      placeholder="Buscar..."
                      value={filters.text}
                      onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                      size="small"
                      sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: C.slate400, mr: 0.75, fontSize: 18 }} />,
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ fontFamily: font }}>Proyecto</InputLabel>
                      <Select
                        value={filters.proyecto_id}
                        onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
                        label="Proyecto"
                        sx={{ borderRadius: 2, fontFamily: font }}
                      >
                        <MenuItem value="">Todos</MenuItem>
                        {proyectos.map((p) => (
                          <MenuItem key={p.id} value={p.id} sx={{ fontFamily: font }}>{p.nombre}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Chip
                      label="Mis notas"
                      size="small"
                      color={filters.misNotas ? 'primary' : 'default'}
                      variant={filters.misNotas ? 'filled' : 'outlined'}
                      onClick={() => setFilters({ ...filters, misNotas: !filters.misNotas })}
                      sx={{ cursor: 'pointer', fontFamily: font, borderRadius: 10 }}
                    />
                  </Stack>

                  {/* Center: status pills */}
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant={filters.estado === '' ? 'contained' : 'text'}
                      onClick={() => setEstado('')}
                      sx={{
                        borderRadius: 10, textTransform: 'none', fontFamily: font,
                        fontWeight: filters.estado === '' ? 700 : 500,
                        px: 1.5, minWidth: 'auto',
                        bgcolor: filters.estado === '' ? C.slate900 : 'transparent',
                        color: filters.estado === '' ? 'white' : C.slate600,
                        '&:hover': { bgcolor: filters.estado === '' ? C.slate800 : C.slate100 },
                      }}
                    >
                      Todos · {notas.length}
                    </Button>
                    {notasEstados.map((estado, index) => (
                      <Button
                        key={estado}
                        size="small"
                        variant={filters.estado === estado ? 'contained' : 'text'}
                        color={filters.estado === estado ? getEstadoColor(index) : 'inherit'}
                        onClick={() => setEstado(estado)}
                        sx={{
                          borderRadius: 10, textTransform: 'none', fontFamily: font,
                          fontWeight: filters.estado === estado ? 700 : 500,
                          px: 1.5, minWidth: 'auto',
                          color: filters.estado === estado ? undefined : C.slate600,
                          '&:hover': { bgcolor: alpha('#000', 0.05) },
                        }}
                      >
                        {estado} · {estadoCountMap[estado] || 0}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            )}
          </Paper>

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
                      ? 'Logo configurado · Plantilla base activa'
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

          {/* ── LOADING STATE ────────────────────────────────────────────────── */}
          {loading && (
            <Stack spacing={1.5}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 2 }} />
              ))}
            </Stack>
          )}

          {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
          {!loading && filteredNotas.length === 0 && (
            <Box sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', py: 10, px: 3, textAlign: 'center',
            }}>
              <Box sx={{
                width: 80, height: 80, borderRadius: '50%',
                bgcolor: C.slate100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5,
              }}>
                <InboxIcon sx={{ fontSize: 40, color: C.slate400 }} />
              </Box>
              <Typography variant="h6" sx={{ fontFamily: font, fontWeight: 700, color: C.slate900, mb: 0.75 }}>
                {notas.length === 0 ? 'No hay notas de pedido' : 'Sin resultados'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, fontFamily: font }}>
                {notas.length === 0
                  ? 'Comenzá creando tu primera nota de pedido para gestionar tus solicitudes de compra.'
                  : 'No se encontraron notas con los filtros aplicados. Intentá con otros criterios.'}
              </Typography>
              {notas.length === 0 ? (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAddDialog(true)}
                  sx={{ bgcolor: C.slate900, '&:hover': { bgcolor: C.slate800 }, fontFamily: font, fontWeight: 700, borderRadius: 2 }}
                >
                  Crear primera nota
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setFilters({ text: '', estado: '', proyecto_id: '', proveedor: '', misNotas: false })}
                  sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none' }}
                >
                  Limpiar filtros
                </Button>
              )}
            </Box>
          )}

          {/* ── TABLE / MOBILE CARDS ─────────────────────────────────────────── */}
          {!loading && filteredNotas.length > 0 && (
            isMobile ? (
              <Box sx={{ pb: 16 }}>
                <Stack spacing={1.25}>
                  {paginatedNotas.map((nota) => (
                    <Card
                      key={nota.id}
                      onClick={() => setComentariosDialogNota(nota)}
                      elevation={0}
                      sx={{
                        cursor: 'pointer',
                        border: `1px solid ${C.slate200}`,
                        borderRadius: 2.5,
                        transition: 'all 0.15s ease',
                        '&:active': { transform: 'scale(0.985)', boxShadow: `0 0 0 2px ${alpha(C.indigo500, 0.2)}` },
                      }}
                    >
                      <CardContent sx={{ py: 1.75, px: 2, '&:last-child': { pb: 1.75 } }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                              <Typography variant="subtitle2" sx={{ fontFamily: font, fontWeight: 700, color: C.slate900 }}>
                                #{nota.codigo}
                              </Typography>
                              <Chip
                                label={nota.estado}
                                color={getEstadoColor(notasEstados.indexOf(nota.estado))}
                                size="small"
                                sx={{ height: 20, fontSize: '0.65rem', fontFamily: font, borderRadius: 10 }}
                              />
                            </Stack>
                            {nota.proyecto_nombre && (
                              <Typography variant="caption" sx={{ color: C.indigo600, fontFamily: font, fontWeight: 600 }}>
                                {nota.proyecto_nombre}
                              </Typography>
                            )}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 0.5, fontFamily: font,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {nota.descripcion}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{ ml: 1, flexShrink: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileMenuAnchor(e.currentTarget);
                              setMobileMenuNota(nota);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1.5} mt={1.25} flexWrap="wrap" alignItems="center">
                          {nota.proveedor && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: font, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <BusinessIcon sx={{ fontSize: 11 }} />{nota.proveedor}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: font, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <PersonIcon sx={{ fontSize: 11 }} />{nota.owner_name}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: font }}>
                            {formatTimestamp(nota.fechaCreacion)}
                          </Typography>
                          {nota.comentarios?.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: font, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <CommentIcon sx={{ fontSize: 11 }} />{nota.comentarios.length}
                            </Typography>
                          )}
                        </Stack>

                        {getEstadoSiguiente(nota.estado) && (
                          <Button
                            fullWidth variant="outlined" size="small"
                            color={getEstadoColor(notasEstados.indexOf(nota.estado) + 1)}
                            onClick={(e) => { e.stopPropagation(); handleChangeEstado(nota); }}
                            sx={{ mt: 1.25, textTransform: 'none', fontFamily: font, fontWeight: 600, borderRadius: 2 }}
                          >
                            → {getEstadoSiguiente(nota.estado)}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                <Menu
                  anchorEl={mobileMenuAnchor}
                  open={Boolean(mobileMenuAnchor)}
                  onClose={() => { setMobileMenuAnchor(null); setMobileMenuNota(null); }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{ sx: { borderRadius: 2.5, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}
                >
                  <MenuItem onClick={() => { setComentariosDialogNota(mobileMenuNota); setMobileMenuAnchor(null); setMobileMenuNota(null); }}
                    sx={{ fontFamily: font, fontSize: '0.875rem' }}>
                    <CommentIcon fontSize="small" sx={{ mr: 1.25, color: C.slate400 }} /> Ver detalles
                  </MenuItem>
                  <MenuItem onClick={() => { handleEdit(mobileMenuNota); setMobileMenuAnchor(null); setMobileMenuNota(null); }}
                    sx={{ fontFamily: font, fontSize: '0.875rem' }}>
                    <EditIcon fontSize="small" sx={{ mr: 1.25, color: C.slate400 }} /> Editar
                  </MenuItem>
                  {mobileMenuNota?.urlNota && (
                    <MenuItem onClick={() => { window.open(mobileMenuNota.urlNota, '_blank'); setMobileMenuAnchor(null); setMobileMenuNota(null); }}
                      sx={{ fontFamily: font, fontSize: '0.875rem' }}>
                      <AttachFileIcon fontSize="small" sx={{ mr: 1.25, color: C.slate400 }} /> Ver adjunto
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => { openDeleteConfirmation(mobileMenuNota); setMobileMenuAnchor(null); setMobileMenuNota(null); }}
                    sx={{ fontFamily: font, fontSize: '0.875rem', color: 'error.main' }}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1.25 }} /> Eliminar
                  </MenuItem>
                </Menu>

                <Card elevation={0} sx={{ mt: 2, border: `1px solid ${C.slate200}`, borderRadius: 2 }}>
                  <TablePagination
                    component="div"
                    count={filteredNotas.length}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    labelRowsPerPage=""
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                    sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center', minHeight: 48 } }}
                  />
                </Card>
              </Box>
            ) : (
              <>
                <Paper elevation={0} sx={{ border: `1px solid ${C.slate200}`, borderRadius: 3, overflow: 'hidden' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: C.slate50 }}>
                        {[
                          { label: 'Código', key: 'codigo' },
                          { label: 'Proyecto', key: 'proyecto_nombre' },
                          { label: 'Proveedor', key: 'proveedor' },
                          { label: 'Asignado', key: 'owner_name' },
                          { label: 'Descripción', key: 'descripcion' },
                          { label: 'Estado', key: 'estado' },
                          { label: 'Fecha', key: 'fechaCreacion' },
                          { label: 'Acciones', key: null },
                        ].map(({ label, key }) => (
                          <TableCell
                            key={label}
                            onClick={key ? () => handleSort(key) : undefined}
                            sx={{
                              cursor: key ? 'pointer' : 'default',
                              userSelect: 'none',
                              fontFamily: font,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: C.slate600,
                              borderBottom: `2px solid ${C.slate200}`,
                              py: 1.5,
                              textAlign: key === null ? 'right' : 'left',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {label}{key && <SortLabel col={key} />}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedNotas.map((nota, i) => (
                        <TableRow
                          key={nota.id}
                          onClick={() => setComentariosDialogNota(nota)}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: i % 2 === 0 ? 'white' : alpha(C.slate50, 0.6),
                            transition: 'background 0.12s ease',
                            '&:hover': { bgcolor: alpha(C.indigo500, 0.04) },
                            '& td': { borderBottom: `1px solid ${C.slate100}`, py: 1.5 },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 700, color: C.slate900 }}>
                              #{nota.codigo}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: font, color: C.slate700 }}>
                              {nota.proyecto_nombre || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: font, color: C.slate700 }}>
                              {nota.proveedor || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 500, color: C.slate900 }}>
                              {nota.owner_name}
                            </Typography>
                            {nota.creador_name && nota.creador_name !== nota.owner_name && (
                              <Typography variant="caption" sx={{ color: C.slate400, fontFamily: font }}>
                                por {nota.creador_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Tooltip title={nota.descripcion || ''} arrow placement="top" enterDelay={600}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontFamily: font,
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                }}
                              >
                                {nota.descripcion}
                              </Typography>
                            </Tooltip>
                            {nota.urlNota && nota.urlNota.trim() !== '' && (
                              <Button
                                variant="text" size="small"
                                onClick={(e) => { e.stopPropagation(); window.open(nota.urlNota, '_blank'); }}
                                sx={{ mt: 0.5, p: 0, fontFamily: font, textTransform: 'none', color: C.indigo600, fontSize: '0.75rem' }}
                                startIcon={<AttachFileIcon sx={{ fontSize: '14px !important' }} />}
                              >
                                adjunto
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={nota.estado}
                              color={getEstadoColor(notasEstados.indexOf(nota.estado))}
                              size="small"
                              sx={{ fontFamily: font, fontWeight: 600, borderRadius: 10 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: font, color: C.slate600, whiteSpace: 'nowrap' }}>
                              {formatTimestamp(nota.fechaCreacion)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                              {notasEstados.indexOf(nota.estado) !== notasEstados.length - 1 && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  color={getEstadoColor(notasEstados.indexOf(nota.estado) + 1)}
                                  onClick={(e) => { e.stopPropagation(); handleChangeEstado(nota); }}
                                  sx={{ borderRadius: 10, textTransform: 'none', fontFamily: font, fontWeight: 600, fontSize: '0.75rem', px: 1.5 }}
                                >
                                  → {getEstadoSiguiente(nota.estado)}
                                </Button>
                              )}
                              {nota.comentarios?.length > 0 && (
                                <Chip
                                  icon={<CommentIcon sx={{ fontSize: '14px !important' }} />}
                                  label={nota.comentarios.length}
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => { e.stopPropagation(); setComentariosDialogNota(nota); }}
                                  sx={{ cursor: 'pointer', fontFamily: font, borderRadius: 10 }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
                <TablePagination
                  component="div"
                  count={filteredNotas.length}
                  page={page}
                  onPageChange={handlePageChange}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  labelRowsPerPage="Filas por página:"
                  sx={{ fontFamily: font }}
                />
              </>
            )
          )}

          {/* ── MOBILE BOTTOM BAR ────────────────────────────────────────────── */}
          {isMobile && (
            <Paper
              elevation={8}
              sx={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
                borderTop: `1px solid ${C.slate200}`,
                bgcolor: 'white',
                px: 1.5, py: 1,
                display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 0.5,
              }}
            >
              <Button
                size="small" variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddDialog(true)}
                sx={{ flex: 1, textTransform: 'none', fontWeight: 700, fontFamily: font, bgcolor: C.slate900, '&:hover': { bgcolor: C.slate800 }, borderRadius: 2 }}
              >
                Agregar
              </Button>
              <IconButton onClick={() => setOpenFilters(true)} color="primary">
                <Badge variant="dot" invisible={!filters.estado && !filters.proyecto_id && !filters.misNotas} color="error">
                  <FilterListIcon />
                </Badge>
              </IconButton>
              <IconButton onClick={fetchNotas} color="primary"><RefreshIcon /></IconButton>
              <IconButton onClick={handleExportToExcel} color="primary"><DownloadIcon /></IconButton>
            </Paper>
          )}

          {/* ── EDIT DIALOG ──────────────────────────────────────────────────── */}
          <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontFamily: font, fontWeight: 700 }}>Editar Nota</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 0.5 }}>
                <TextField label="Descripción" value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  multiline rows={3} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <TextField label="Proveedor" value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} label="Estado" sx={{ borderRadius: 2 }}>
                    {notasEstados.map((estado) => (
                      <MenuItem key={estado} value={estado} sx={{ fontFamily: font }}>{estado}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Asignar a</InputLabel>
                  <Select value={formData.owner || ''} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} label="Asignar a" sx={{ borderRadius: 2 }}>
                    {profiles.map((profile) => (
                      <MenuItem key={profile.id} value={profile.id} sx={{ fontFamily: font }}>
                        {`${profile.firstName} ${profile.lastName}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Proyecto</InputLabel>
                  <Select value={formData.proyecto_id || ''} onChange={(e) => setFormData({ ...formData, proyecto_id: e.target.value })} label="Proyecto" sx={{ borderRadius: 2 }}>
                    {proyectos.map((proyecto) => (
                      <MenuItem key={proyecto.id} value={proyecto.id} sx={{ fontFamily: font }}>{proyecto.nombre}</MenuItem>
                    ))}
                    <MenuItem value="" sx={{ fontFamily: font }}>No definido</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setIsEditing(false)} sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none' }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} variant="contained"
                sx={{ bgcolor: C.slate900, '&:hover': { bgcolor: C.slate800 }, fontFamily: font, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}>
                Guardar cambios
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

          {/* ── DELETE DIALOG ────────────────────────────────────────────────── */}
          <Dialog open={openDeleteDialog} onClose={closeDeleteConfirmation}
            PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontFamily: font, fontWeight: 700 }}>Eliminar nota</DialogTitle>
            <DialogContent>
              <Typography sx={{ fontFamily: font }}>
                ¿Estás seguro de que querés eliminar la nota <strong>&quot;{notaToDelete?.codigo}&quot;</strong>? Esta acción no se puede deshacer.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={closeDeleteConfirmation} sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none' }}>
                Cancelar
              </Button>
              <Button
                color="error" variant="contained"
                sx={{ fontFamily: font, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
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
            onPlantillaGuardada={() => {
              loadPdfBaseForDrawer();
              setAlert({ open: true, message: 'Plantilla guardada correctamente', severity: 'success' });
            }}
          />

          {/* ── MOBILE FILTERS DIALOG ────────────────────────────────────────── */}
          <Dialog open={openFilters} onClose={() => setOpenFilters(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontFamily: font, fontWeight: 700 }}>Filtros</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 0.5 }}>
                <TextField label="Buscar por texto" value={filters.text}
                  onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                  fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })} label="Estado" sx={{ borderRadius: 2 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {notasEstados.map((estado) => <MenuItem key={estado} value={estado} sx={{ fontFamily: font }}>{estado}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Proyecto</InputLabel>
                  <Select value={filters.proyecto_id} onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })} label="Proyecto" sx={{ borderRadius: 2 }}>
                    <MenuItem value="">Todos</MenuItem>
                    {proyectos.map((proyecto) => <MenuItem key={proyecto.id} value={proyecto.id} sx={{ fontFamily: font }}>{proyecto.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
                <Chip
                  label="Mis notas"
                  color={filters.misNotas ? 'primary' : 'default'}
                  variant={filters.misNotas ? 'filled' : 'outlined'}
                  onClick={() => setFilters({ ...filters, misNotas: !filters.misNotas })}
                  sx={{ cursor: 'pointer', alignSelf: 'flex-start', fontFamily: font, borderRadius: 10 }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setOpenFilters(false)} sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none' }}>Cerrar</Button>
              <Button
                variant="contained"
                onClick={() => { applyFilters(); setOpenFilters(false); }}
                sx={{ bgcolor: C.slate900, '&:hover': { bgcolor: C.slate800 }, fontFamily: font, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
              >
                Aplicar
              </Button>
            </DialogActions>
          </Dialog>

          {/* ── DETAIL DRAWER ────────────────────────────────────────────────── */}
          <Drawer
            anchor="right"
            open={!!comentariosDialogNota}
            onClose={() => { setComentariosDialogNota(null); setDrawerTab(0); }}
            PaperProps={{
              sx: {
                width: { xs: '100%', sm: 520 },
                p: 0,
                bgcolor: C.slate50,
              }
            }}
          >
            {comentariosDialogNota && (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Drawer Header */}
                <Box sx={{
                  p: 2.5,
                  bgcolor: 'white',
                  borderBottom: `1px solid ${C.slate200}`,
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                        <Typography variant="h5" sx={{ fontFamily: font, fontWeight: 800, color: C.slate900 }}>
                          #{comentariosDialogNota.codigo}
                        </Typography>
                        {comentariosDialogNota.proyecto_nombre && (
                          <Typography variant="body2" sx={{ color: C.indigo600, fontFamily: font, fontWeight: 600 }}>
                            {comentariosDialogNota.proyecto_nombre}
                          </Typography>
                        )}
                      </Stack>
                      <Chip
                        label={comentariosDialogNota.estado}
                        color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado))}
                        size="small"
                        sx={{ fontFamily: font, fontWeight: 700, borderRadius: 10 }}
                      />
                    </Box>
                    <IconButton
                      onClick={() => { setComentariosDialogNota(null); setDrawerTab(0); }}
                      size="small"
                      sx={{ bgcolor: C.slate100, '&:hover': { bgcolor: C.slate200 } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  {/* Progress bar */}
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400 }}>
                        Paso {notasEstados.indexOf(comentariosDialogNota.estado) + 1} de {notasEstados.length}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400 }}>
                        {Math.round(((notasEstados.indexOf(comentariosDialogNota.estado) + 1) / notasEstados.length) * 100)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={((notasEstados.indexOf(comentariosDialogNota.estado) + 1) / notasEstados.length) * 100}
                      color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado))}
                      sx={{ height: 5, borderRadius: 3, bgcolor: C.slate200, '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
                    />
                    <Stack direction="row" justifyContent="space-between" mt={0.75}>
                      {notasEstados.map((estado, idx) => (
                        <Typography
                          key={estado} variant="caption"
                          sx={{
                            fontFamily: font,
                            fontSize: '0.62rem',
                            fontWeight: idx === notasEstados.indexOf(comentariosDialogNota.estado) ? 700 : 400,
                            color: idx <= notasEstados.indexOf(comentariosDialogNota.estado) ? C.slate700 : C.slate400,
                          }}
                        >
                          {estado}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>

                  {/* Primary action */}
                  {notasEstados.indexOf(comentariosDialogNota.estado) !== notasEstados.length - 1 && (
                    <Button
                      fullWidth variant="contained" size="large"
                      color={getEstadoColor(notasEstados.indexOf(comentariosDialogNota.estado) + 1)}
                      onClick={() => handleChangeEstado(comentariosDialogNota)}
                      sx={{ borderRadius: 2, fontFamily: font, fontWeight: 700, textTransform: 'none', py: 1.25, mb: 1.5 }}
                    >
                      → Pasar a {getEstadoSiguiente(comentariosDialogNota.estado)}
                    </Button>
                  )}

                  {/* Secondary actions */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" startIcon={<EditIcon fontSize="small" />}
                        onClick={() => { handleEdit(comentariosDialogNota); setComentariosDialogNota(null); }}
                        sx={{ textTransform: 'none', fontFamily: font, color: C.slate600, fontSize: '0.8rem', borderRadius: 1.5 }}>
                        Editar
                      </Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon fontSize="small" />}
                        onClick={() => { openDeleteConfirmation(comentariosDialogNota); setComentariosDialogNota(null); }}
                        sx={{ textTransform: 'none', fontFamily: font, fontSize: '0.8rem', borderRadius: 1.5 }}>
                        Eliminar
                      </Button>
                    </Stack>
                    <Button
                      size="small" variant="outlined"
                      startIcon={pdfDownloading ? <CircularProgress size={12} color="inherit" /> : <PictureAsPdfIcon />}
                      disabled={pdfDownloading}
                      onClick={handleDownloadPdfNota}
                      sx={{ textTransform: 'none', fontFamily: font, fontWeight: 600, borderRadius: 2, borderColor: C.slate300, color: C.slate700 }}
                    >
                      Descargar PDF
                    </Button>
                  </Stack>
                </Box>

                {/* Tabs */}
                <Tabs
                  value={drawerTab}
                  onChange={(e, v) => setDrawerTab(v)}
                  sx={{
                    bgcolor: 'white',
                    borderBottom: `1px solid ${C.slate200}`,
                    '& .MuiTab-root': { textTransform: 'none', fontFamily: font, fontWeight: 600, fontSize: '0.85rem', minHeight: 44 },
                    '& .MuiTabs-indicator': { height: 3, borderRadius: 3 },
                  }}
                >
                  <Tab label="Detalles" icon={<DescriptionIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                  <Tab
                    label={
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span>Comentarios</span>
                        {(comentariosDialogNota.comentarios?.length || 0) > 0 && (
                          <Chip label={comentariosDialogNota.comentarios.length} size="small" color="primary"
                            sx={{ height: 18, fontSize: '0.65rem', fontFamily: font }} />
                        )}
                      </Stack>
                    }
                    icon={<CommentIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                  <Tab
                    label={
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span>Historial</span>
                        {(comentariosDialogNota.historial?.length || 0) > 0 && (
                          <Chip label={comentariosDialogNota.historial.length} size="small" variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', fontFamily: font }} />
                        )}
                      </Stack>
                    }
                    icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                  />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>

                  {/* TAB 0: Detalles */}
                  {drawerTab === 0 && (
                    <Stack spacing={2}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2.5, border: `1px solid ${C.slate100}` }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: font, lineHeight: 1.7, color: C.slate700 }}>
                          {comentariosDialogNota.descripcion || 'Sin descripción'}
                        </Typography>
                      </Paper>

                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        {[
                          { icon: <BusinessIcon />, label: 'Proveedor', value: comentariosDialogNota.proveedor },
                          { icon: <PersonIcon />, label: 'Responsable', value: comentariosDialogNota.owner_name },
                          { icon: <PersonIcon />, label: 'Creado por', value: comentariosDialogNota.creador_name },
                          { icon: <CalendarTodayIcon />, label: 'Fecha', value: formatTimestamp(comentariosDialogNota.fechaCreacion) },
                        ].map(({ icon, label, value }) => (
                          <Paper key={label} elevation={0} sx={{ p: 1.5, bgcolor: 'white', borderRadius: 2, border: `1px solid ${C.slate100}` }}>
                            <Stack direction="row" spacing={1.25} alignItems="flex-start">
                              <Box sx={{ color: C.slate400, mt: 0.1, '& svg': { fontSize: 16 } }}>{icon}</Box>
                              <Box>
                                <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400, display: 'block', lineHeight: 1 }}>
                                  {label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 600, color: C.slate900, mt: 0.3 }}>
                                  {value || '—'}
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        ))}
                      </Box>

                      {comentariosDialogNota.urlNota && (
                        <Button
                          variant="outlined" size="small" startIcon={<AttachFileIcon />}
                          onClick={() => window.open(comentariosDialogNota.urlNota, '_blank')}
                          sx={{ textTransform: 'none', fontFamily: font, borderRadius: 2, alignSelf: 'flex-start' }}
                        >
                          Ver adjunto de la nota
                        </Button>
                      )}
                    </Stack>
                  )}

                  {/* TAB 1: Comentarios */}
                  {drawerTab === 1 && (
                    <Stack spacing={2}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2.5, border: `1px solid ${C.slate100}` }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                          <TextField
                            placeholder="Escribe un comentario..."
                            multiline maxRows={3} fullWidth size="small"
                            inputRef={nuevoComentarioRef}
                            variant="standard"
                            InputProps={{ disableUnderline: true }}
                            sx={{ '& .MuiInputBase-root': { p: 0, fontFamily: font, fontSize: '0.875rem' } }}
                          />
                          <IconButton color="primary" onClick={handleAgregarComentario}
                            disabled={comentariosCargando} sx={{ alignSelf: 'flex-end' }}>
                            {comentariosCargando ? <CircularProgress size={20} /> : <SendIcon />}
                          </IconButton>
                        </Box>
                        <Divider sx={{ my: 1 }}>
                          <Typography variant="caption" sx={{ color: C.slate400, fontFamily: font }}>o adjuntá un archivo</Typography>
                        </Divider>
                        <Box
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) setArchivoSeleccionado(e.dataTransfer.files[0]); }}
                          component="label"
                          sx={{
                            border: `1px dashed ${isDragging ? C.indigo500 : C.slate200}`,
                            borderRadius: 2, p: 1.5, textAlign: 'center',
                            bgcolor: isDragging ? alpha(C.indigo500, 0.04) : C.slate50,
                            transition: 'all 0.2s', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                          }}
                        >
                          <input type="file" hidden onChange={(e) => setArchivoSeleccionado(e.target.files[0])} />
                          <CloudUploadIcon sx={{ fontSize: 18, color: isDragging ? C.indigo500 : C.slate400 }} />
                          {archivoSeleccionado ? (
                            <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 600, color: C.indigo600 }}>
                              {archivoSeleccionado.name}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400 }}>
                              Arrastrá o seleccioná un archivo
                            </Typography>
                          )}
                        </Box>
                        {archivoSeleccionado && (
                          <Button fullWidth variant="contained" size="small" startIcon={<CloudUploadIcon />}
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
                            sx={{ mt: 1, fontFamily: font, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                          >
                            Subir archivo
                          </Button>
                        )}
                      </Paper>

                      {comentariosDialogNota?.comentarios?.length > 0 ? (
                        <Stack spacing={1.25}>
                          {comentariosDialogNota.comentarios.map((comentario, idx) => (
                            <Paper key={idx} elevation={0} sx={{
                              p: 2, bgcolor: 'white', borderRadius: 2.5,
                              border: `1px solid ${C.slate100}`, position: 'relative',
                            }}
                              onMouseEnter={() => setHoveredComentario(idx)}
                              onMouseLeave={() => setHoveredComentario(null)}
                            >
                              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <Box sx={{
                                  width: 34, height: 34, borderRadius: '50%',
                                  bgcolor: C.slate900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontFamily: font }}>
                                    {comentario.autor?.charAt(0)?.toUpperCase() || 'U'}
                                  </Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 700, color: C.slate900 }}>
                                      {comentario.autor}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400 }}>
                                      {formatTimestamp(comentario.fecha)}
                                    </Typography>
                                  </Stack>
                                  {comentarioEditandoIdx === idx ? (
                                    <Box mt={1}>
                                      <TextField fullWidth multiline value={comentarioEditadoTexto}
                                        onChange={(e) => setComentarioEditadoTexto(e.target.value)}
                                        rows={2} size="small"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontFamily: font } }} />
                                      <Stack direction="row" spacing={1} mt={1}>
                                        <Button size="small" variant="contained"
                                          onClick={() => handleGuardarComentarioEditado(idx)}
                                          sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                                          Guardar
                                        </Button>
                                        <Button size="small"
                                          onClick={() => { setComentarioEditandoIdx(null); setComentarioEditadoTexto(''); }}
                                          sx={{ fontFamily: font, borderRadius: 2, textTransform: 'none' }}>
                                          Cancelar
                                        </Button>
                                      </Stack>
                                    </Box>
                                  ) : (
                                    <>
                                      {comentario.texto && (
                                        <Typography variant="body2" sx={{ fontFamily: font, color: C.slate600, mt: 0.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                          {comentario.texto}
                                        </Typography>
                                      )}
                                      {comentario.url && (
                                        <Button size="small" variant="text" startIcon={<AttachFileIcon />}
                                          onClick={() => window.open(comentario.url, '_blank')}
                                          sx={{ mt: 0.75, p: 0, fontFamily: font, textTransform: 'none', color: C.indigo600, fontSize: '0.75rem' }}>
                                          Ver archivo
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </Box>
                              </Stack>
                              {hoveredComentario === idx && comentarioEditandoIdx !== idx && (
                                <Stack direction="row" spacing={0.25} sx={{ position: 'absolute', top: 8, right: 8 }}>
                                  {comentario.texto && (
                                    <IconButton size="small"
                                      onClick={() => { setComentarioEditandoIdx(idx); setComentarioEditadoTexto(comentario.texto); }}
                                      sx={{ bgcolor: C.slate100, '&:hover': { bgcolor: C.slate200 } }}>
                                      <EditIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  )}
                                  <IconButton size="small" color="error"
                                    onClick={() => handleEliminarComentario(idx)}
                                    sx={{ bgcolor: alpha('#ef4444', 0.08), '&:hover': { bgcolor: alpha('#ef4444', 0.15) } }}>
                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Stack>
                              )}
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 5 }}>
                          <CommentIcon sx={{ fontSize: 44, color: C.slate200, mb: 1 }} />
                          <Typography variant="body2" sx={{ fontFamily: font, color: C.slate400 }}>
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
                          <Box sx={{
                            position: 'absolute', left: 8, top: 8, bottom: 8,
                            width: 2, bgcolor: C.slate200, borderRadius: 1,
                          }} />
                          <Stack spacing={2}>
                            {[...comentariosDialogNota.historial].reverse().map((evento, idx) => (
                              <Box key={idx} sx={{ position: 'relative', pl: 2 }}>
                                <Box sx={{
                                  position: 'absolute', left: -19, top: 6,
                                  width: 10, height: 10, borderRadius: '50%',
                                  bgcolor: evento.campo === 'Estado' ? C.indigo500 : C.slate300,
                                  border: '2px solid white', boxShadow: 1,
                                }} />
                                <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: `1px solid ${C.slate100}` }}>
                                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                    {evento.campo === 'Estado' && <AssignmentIcon sx={{ fontSize: 15, color: C.indigo500 }} />}
                                    {evento.campo === 'Descripción' && <DescriptionIcon sx={{ fontSize: 15, color: C.slate400 }} />}
                                    {evento.campo === 'Proveedor' && <BusinessIcon sx={{ fontSize: 15, color: C.slate400 }} />}
                                    {evento.campo === 'Responsable' && <PersonIcon sx={{ fontSize: 15, color: C.slate400 }} />}
                                    {evento.campo === 'Proyecto' && <HomeIcon sx={{ fontSize: 15, color: C.slate400 }} />}
                                    <Typography variant="body2" sx={{ fontFamily: font, fontWeight: 700, color: C.slate900 }}>
                                      {evento.campo}
                                    </Typography>
                                  </Stack>
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body2" sx={{
                                      textDecoration: 'line-through', fontFamily: font, color: C.slate400,
                                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                      {evento.valor_anterior}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: C.slate300 }}>→</Typography>
                                    {evento.campo === 'Estado' ? (
                                      <Chip label={evento.valor_nuevo} size="small"
                                        color={getEstadoColor(notasEstados.indexOf(evento.valor_nuevo))}
                                        sx={{ fontFamily: font, fontWeight: 600, borderRadius: 10, fontSize: '0.72rem' }} />
                                    ) : (
                                      <Typography variant="body2" sx={{
                                        fontFamily: font, fontWeight: 600, color: C.slate900,
                                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        {evento.valor_nuevo}
                                      </Typography>
                                    )}
                                  </Stack>
                                  <Typography variant="caption" sx={{ fontFamily: font, color: C.slate400, mt: 0.75, display: 'block' }}>
                                    {formatTimestamp(evento.fecha)} · {evento.usuario_nombre || 'Sistema'}
                                  </Typography>
                                </Paper>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 5 }}>
                          <HistoryIcon sx={{ fontSize: 44, color: C.slate200, mb: 1 }} />
                          <Typography variant="body2" sx={{ fontFamily: font, color: C.slate400 }}>
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

          <Snackbar
            open={alert.open}
            autoHideDuration={5000}
            onClose={() => setAlert({ ...alert, open: false })}
          >
            <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity} sx={{ fontFamily: font }}>
              {alert.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </>
  );
};

NotaPedidoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default NotaPedidoPage;
