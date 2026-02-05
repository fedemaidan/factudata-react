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
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';

const NotaPedidoPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
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

const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const [comentariosCargando, setComentariosCargando] = useState(false);
  const [comentarioEditandoIdx, setComentarioEditandoIdx] = useState(null);
  const [comentarioEditadoTexto, setComentarioEditadoTexto] = useState('');
  const [drawerTab, setDrawerTab] = useState(0); // 0: Detalles, 1: Comentarios, 2: Historial
  const [hoveredComentario, setHoveredComentario] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    descripcion: '', proyecto_id: '', estado: '', owner: '', creador: '', proveedor: ''
  });
  const [filters, setFilters] = useState({ text: '', estado: '', proyecto_id: '', proveedor: '', misNotas: false });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  
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
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
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
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
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

  
  const fetchProfiles = async () => {
    try {
      const profilesData = await profileService.getProfileByEmpresa(user.empresa.id);
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
    let colors;
    switch (notasEstados.length) {
      case 0:
      case 1:
        return "default";
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
        colors = ["default", "warning", "info", "primary", "success"];
        break;
      default:
        return "default";
    }
    
    return colors[index % colors.length]; 
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
      fecha: Timestamp.fromDate(new Date()),
    };
  
    const comentariosActualizados = [...(comentariosDialogNota.comentarios || []), nuevo];
    const notaActualizada = { ...comentariosDialogNota, comentarios: comentariosActualizados };
  
    try {
      setComentariosCargando(true);
      await notaPedidoService.updateNota(comentariosDialogNota.id, notaActualizada);
  
      setNotas((prev) =>
        prev.map((n) => (n.id === comentariosDialogNota.id ? notaActualizada : n))
      );
      setComentariosDialogNota(notaActualizada);
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
      const notasData = await notaPedidoService.getNotasByEmpresa(user.empresa.id);
      setNotas(notasData);
      setFilteredNotas(notasData);
    } catch (error) {
      console.error('Error al obtener notas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.empresa?.id]);
  

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
        owner_name: ownerObj ? (ownerObj.firstName + " " + ownerObj.lastName) : (user.firstName + " " + user.lastName),
        estado: notasEstados[0],
        empresaId: user.empresa.id,
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
      
      const success = await notaPedidoService.updateNota(currentNota.id, updatedNota);
      if (success) {
        setNotas(notas.map((n) => (n.id === currentNota.id ? updatedNota : n)));
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
      const success = await notaPedidoService.updateNota(nota.id, updatedNota);
  
      if (success) {
        // Actualizar nota localmente con el historial
        const notaConHistorial = {
          ...nota,
          estado: nuevoEstado,
          historial: [
            ...(nota.historial || []),
            {
              tipo: 'cambio_campo',
              campo: 'Estado',
              valor_anterior: nota.estado,
              valor_nuevo: nuevoEstado,
              fecha: { _seconds: Math.floor(Date.now() / 1000) },
              usuario_nombre: `${user.firstName} ${user.lastName}`,
            }
          ]
        };
        setNotas(notas.map((n) => (n.id === nota.id ? notaConHistorial : n)));
        // Actualizar drawer si está abierto
        if (comentariosDialogNota?.id === nota.id) {
          setComentariosDialogNota(notaConHistorial);
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
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Notas de Pedido', icon: <AssignmentIcon fontSize="small" /> }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (user) fetchNotas();
  }, [user, fetchNotas]);
  

  useEffect(() => {
    applyFilters();
  }, [filters, notas]);

  return (
    <Box component="main" sx={{ flexGrow: 1, py: 4, px: 3 }}>
      <Container maxWidth={false}>
        <Stack
  direction={isMobile ? 'column' : 'row'}
  spacing={2}
  alignItems={isMobile ? 'center' : 'flex-start'}
  mb={3}
>
  
  {isMobile ? (
    <ButtonGroup variant="text" color="primary" orientation="horizontal">
      {notasEstados.map((estado, index) => (
        <Button
          key={estado}
          variant={filters.estado === estado ? 'contained' : 'outlined'}
          startIcon={
            <Chip
              label={notas.filter((n) => n.estado === estado).length}
              color={getEstadoColor(index)}
            />
          }
          onClick={() => setEstado(estado)}
        >
          {estado.substr(0, 1)}
        </Button>
  ))}
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={fetchNotas}
      ></Button>
      <Button
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={handleExportToExcel}
      ></Button>
    </ButtonGroup>
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
          <Stack spacing={2}>
            {paginatedNotas.map((nota) => (
              <Card key={nota.id}>
                <CardContent>
                  <Typography variant="h6">Código: {nota.codigo} - {nota.proyecto_nombre}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
                  {nota.descripcion}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Responsable: {nota.owner_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Creado el: {formatTimestamp(nota.fechaCreacion)} por {nota.creador_name}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Proveedor: {nota.proveedor}
                  </Typography>
                  <Chip
                    label={nota.estado}
                    color={
                      getEstadoColor(notasEstados.indexOf(nota.estado))
                    }
                    sx={{ mt: 1 }}
                  />
                  {nota.notaUrl && nota.notaUrl.trim() !== '' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => window.open(nota.notaUrl, '_blank')}
                    >
                      Ver adjunto
                    </Button>
                  )}
                  <Stack direction="row" spacing={1} mt={2}>
                  {getEstadoSiguiente(nota.estado) && (<Button
                        variant="outlined"
                        color={getEstadoColor(notasEstados.indexOf(nota.estado)+1)}
                        onClick={() => handleChangeEstado(nota)}
                      >
                        Marcar en {getEstadoSiguiente(nota.estado)}
                      </Button>)}
                      <Button
                        startIcon={<EditIcon />}
                        color="secondary"
                        onClick={() => handleEdit(nota)}
                      >

                      </Button>
                      <Button
                        startIcon={<DeleteIcon />}
                        color="error"
                        onClick={() => openDeleteConfirmation(nota)}
                      >
                      </Button>

                    </Stack>
                </CardContent>
              </Card>
            ))}
            <TablePagination
              component="div"
              count={filteredNotas.length}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Filas:"
            />
          </Stack>
        ) : (
          <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('codigo')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Código {sortConfig.key === 'codigo' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('proyecto_nombre')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Proyecto {sortConfig.key === 'proyecto_nombre' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('proveedor')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Proveedor {sortConfig.key === 'proveedor' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('owner_name')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Asignado {sortConfig.key === 'owner_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('descripcion')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Descripción {sortConfig.key === 'descripcion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('estado')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Estado {sortConfig.key === 'estado' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
                <TableCell onClick={() => handleSort('fechaCreacion')} sx={{ cursor: 'pointer', userSelect: 'none' }}>
                  Fecha Creación {sortConfig.key === 'fechaCreacion' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </TableCell>
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
                      backgroundColor: 'action.hover',
                    },
                    transition: 'background-color 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <TableCell>{nota.codigo}</TableCell>
                  <TableCell>{nota.proyecto_nombre}</TableCell>
                  <TableCell>{nota.proveedor}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{nota.owner_name}</Typography>
                    {nota.creador_name && nota.creador_name !== nota.owner_name && (
                      <Typography variant="caption" color="text.secondary">
                        Creado por: {nota.creador_name}
                      </Typography>
                    )}
                  </TableCell>
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

                  <TableCell>
                    <Chip
                      label={nota.estado}
                      color={
                        getEstadoColor(notasEstados.indexOf(nota.estado))
                      }
                    />
                  </TableCell>
                  <TableCell>{formatTimestamp(nota.fechaCreacion)}</TableCell>
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
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Filas por página:"
          />
          </>
        ))}
  {isMobile && (
    <>
        <Fab
          color="primary"
          aria-label="filter"
          onClick={() => setOpenFilters(true)}
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <FilterListIcon />
        </Fab>

        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setOpenAddDialog(true)}
          sx={{ position: 'fixed', bottom: 96, right: 16 }}
        >
          <AddIcon />
        </Fab>
        </>
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
              <FormControl>
                <InputLabel>Proyecto</InputLabel>
                <Select
                  value={filters.proyecto_id}
                  onChange={(e) => setFilters({ ...filters, proyecto_id: e.target.value })}
                >
                  <MenuItem value="">No definido</MenuItem>
                    {proyectos.map((proyecto) => (
                      <MenuItem key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
      </Container>
    </Box>
  );
};

NotaPedidoPage.getLayout = (page) => <DashboardLayout>{page}</DashboardLayout>;

export default NotaPedidoPage;
