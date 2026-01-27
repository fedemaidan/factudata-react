import React, { useState, useEffect, useMemo } from 'react';
import profileService from 'src/services/profileService';
import {
  Typography, Button, Card, CardContent, CardActions, CardHeader, Divider, IconButton, LinearProgress, TextField, Select, MenuItem, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert, Box, Autocomplete,
  Checkbox, Toolbar, alpha, Chip, TableSortLabel, TablePagination, Stack, useMediaQuery, useTheme, Collapse
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import InputAdornment from '@mui/material/InputAdornment';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ComputerIcon from '@mui/icons-material/Computer';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getProyectosByEmpresa, getProyectosFromUser } from 'src/services/proyectosService';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import { green } from '@mui/material/colors';
import templateService from 'src/services/templateService';

const normalizePhone = (phone) => (phone || '').toString().replace(/[^\d]/g, '');

function reemplazarUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => reemplazarUndefined(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const nuevoObj = {};
    for (const key in obj) {
      if (obj[key] === undefined) {
        nuevoObj[key] = "";
      } else {
        nuevoObj[key] = reemplazarUndefined(obj[key]);
      }
    }
    return nuevoObj;
  }

  return obj;
}


export const UsuariosDetails = ({ empresa }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isLoading, setIsLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [dupEmpresaLink, setDupEmpresaLink] = useState(null);
  const [dupEmpresaName, setDupEmpresaName] = useState('');

  // Estados para selección masiva
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Estados para configuración masiva
  const [bulkConfigDialogOpen, setBulkConfigDialogOpen] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
    tipo_validacion_remito: '',
    default_caja_chica: null,
    notificacion_nota_pedido: null,
    proyectos: []
  });
  
  // Estados para envío masivo de templates
  const [bulkTemplateDialogOpen, setBulkTemplateDialogOpen] = useState(false);
  const [bulkTemplateForm, setBulkTemplateForm] = useState({
    proveedorEjemplo: '',
    proyectoEjemplo: '',
    fechaEnvio: '',
    horaEnvio: '',
    enviarAhora: true
  });

  // Estado para búsqueda
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para filtros rápidos
  const [activeFilter, setActiveFilter] = useState(null); // 'sin_email', 'sin_proyectos', 'whatsapp', 'web'
  const [showFilters, setShowFilters] = useState(false); // Para mostrar/ocultar filtros en móvil

  // Estados para ordenamiento
  const [orderBy, setOrderBy] = useState('firstName');
  const [order, setOrder] = useState('asc');

  // Estados para paginación
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Estado para hover en filas
  const [hoveredRow, setHoveredRow] = useState(null);

  // Estados para agregar/remover proyectos masivamente
  const [bulkAddProjectDialogOpen, setBulkAddProjectDialogOpen] = useState(false);
  const [bulkRemoveProjectDialogOpen, setBulkRemoveProjectDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Estados para envío de templates
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateUsuario, setTemplateUsuario] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    nombre: '',
    proveedorEjemplo: '',
    proyectoEjemplo: '',
    fechaEnvio: '',
    horaEnvio: '',
    enviarAhora: true
  });

  // Opciones de proveedores desde la empresa
  const proveedoresOptions = useMemo(() => {
    if (empresa?.proveedores_data?.length > 0) {
      return empresa.proveedores_data.map(p => p?.nombre).filter(Boolean);
    }
    return (empresa?.proveedores || []).filter(Boolean);
  }, [empresa]);

  // Opciones de proyectos (nombres)
  const proyectosOptions = useMemo(() => {
    return proyectos.filter(p => p?.nombre).map(p => p.nombre).filter(Boolean);
  }, [proyectos]);

  // Contadores para filtros rápidos
  const filterCounts = useMemo(() => ({
    sin_email: usuarios.filter(u => !u.confirmed).length,
    sin_proyectos: usuarios.filter(u => !u.proyectosData?.length || u.proyectosData.every(p => !p)).length,
    whatsapp: usuarios.filter(u => u.tipo_validacion_remito === 'whatsapp').length,
    web: usuarios.filter(u => u.tipo_validacion_remito === 'web').length,
    caja_chica: usuarios.filter(u => u.default_caja_chica === true).length,
    notificacion_np: usuarios.filter(u => u.notificacion_nota_pedido === true).length,
  }), [usuarios]);

  // Usuarios filtrados por búsqueda y filtros rápidos
  const filteredUsuarios = useMemo(() => {
    let result = usuarios;

    // Aplicar filtro rápido
    if (activeFilter) {
      switch (activeFilter) {
        case 'sin_email':
          result = result.filter(u => !u.confirmed);
          break;
        case 'sin_proyectos':
          result = result.filter(u => !u.proyectosData?.length || u.proyectosData.every(p => !p));
          break;
        case 'whatsapp':
          result = result.filter(u => u.tipo_validacion_remito === 'whatsapp');
          break;
        case 'web':
          result = result.filter(u => u.tipo_validacion_remito === 'web');
          break;
        case 'caja_chica':
          result = result.filter(u => u.default_caja_chica === true);
          break;
        case 'notificacion_np':
          result = result.filter(u => u.notificacion_nota_pedido === true);
          break;
      }
    }

    // Aplicar búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(u => 
        (u.email || '').toLowerCase().includes(query) ||
        (u.firstName || '').toLowerCase().includes(query) ||
        (u.lastName || '').toLowerCase().includes(query) ||
        (u.phone || '').toLowerCase().includes(query) ||
        (u.proyectosData || []).some(p => (p?.nombre || '').toLowerCase().includes(query))
      );
    }

    // Aplicar ordenamiento
    result = [...result].sort((a, b) => {
      let aVal, bVal;
      switch (orderBy) {
        case 'nombre':
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'phone':
          aVal = (a.phone || '').toLowerCase();
          bVal = (b.phone || '').toLowerCase();
          break;
        default:
          aVal = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          bVal = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
      }
      if (order === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return result;
  }, [usuarios, searchQuery, activeFilter, orderBy, order]);

  // Usuarios paginados
  const paginatedUsuarios = useMemo(() => {
    return filteredUsuarios.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredUsuarios, page, rowsPerPage]);

  // Handlers para ordenamiento y paginación
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (filter) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setPage(0);
  };

  const { user } = useAuthContext();
  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      const profiles = await profileService.getProfileByEmpresa(empresa.id);

      const profilesWithProjects = await Promise.all(profiles.map(async (prof) => {
        prof.proyectosData = await getProyectosFromUser(prof);
        return prof;
      }));
      
      setUsuarios(profilesWithProjects);
      setIsLoading(false);
    };

    const fetchProyectos = async () => {
      const proyectos = await getProyectosByEmpresa(empresa);
      setProyectos(proyectos);
    };

    fetchProfiles();
    fetchProyectos();
  }, [empresa]);

  const formik = useFormik({
    initialValues: {
      email: editingUsuario ? editingUsuario.email : '',
      phone: editingUsuario ? editingUsuario.phone : '',
      firstName: editingUsuario ? editingUsuario.firstName : '',
      lastName: editingUsuario ? editingUsuario.lastName : '',
      proyectos: editingUsuario ? editingUsuario.proyectosData.map(proj => proj?.id) : [],
      tipo_validacion_remito: editingUsuario ? editingUsuario.tipo_validacion_remito : "",
      default_caja_chica: editingUsuario ? editingUsuario.default_caja_chica : null,
      notificacion_nota_pedido: editingUsuario ? editingUsuario.notificacion_nota_pedido : false,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      email: Yup.string().email('El email no es válido').required('El email es requerido'),
      phone: Yup.string().required('El whatsapp es requerido'),
      firstName: Yup.string().required('El nombre es requerido'),
      lastName: Yup.string().required('El apellido es requerido'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      values = reemplazarUndefined(values);
      let existeDuplicado;
      try {
        const phoneTrim = (values.phone || '').trim();
    const phoneNorm = normalizePhone(phoneTrim);

    const otherProfile = await profileService.getProfileByPhone(phoneNorm);
    existeDuplicado = otherProfile && (editingUsuario && otherProfile.id !== editingUsuario.id || !editingUsuario);

    if (existeDuplicado) {
      setSnackbarMessage('Ya existe un usuario con ese WhatsApp.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setIsLoading(false);
      if (user?.admin) {
        const empresa = await getEmpresaDetailsFromUser(otherProfile);
        if (empresa?.id) {
          setDupEmpresaLink(`https://admin.sorbydata.com/empresa/?empresaId=${empresa.id}`);
          setDupEmpresaName(empresa?.nombre || '');
        }
      }
      return;
    }
        if (editingUsuario) {
          const updatedUsuario = { ...values };
          const updatedUsuarios = usuarios.map((user) =>
            user.id === editingUsuario.id ? { ...user, ...updatedUsuario, proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)) } : user
          );
          setUsuarios(updatedUsuarios);
          const result = await profileService.updateProfile(editingUsuario.id, updatedUsuario);
          console.log(result, "result")
          setSnackbarMessage('Usuario actualizado con éxito');
        } else {
          const newUsuario = {
            email: values.email.trim(),
            phone: phoneTrim,                 
            firstName: values.firstName,
            lastName: values.lastName,
            proyectos: values.proyectos,
            proyectosData: values.proyectos.map(projId => proyectos.find(p => p.id === projId)),
            tipo_validacion_remito: values.tipo_validacion_remito ?? "",
            default_caja_chica: values.default_caja_chica,
            notificacion_nota_pedido: values.notificacion_nota_pedido || false,
          };
          const createdUsuario = await profileService.createProfile(newUsuario, empresa);
          setUsuarios([...usuarios, createdUsuario]);
          setSnackbarMessage('Usuario agregado con éxito');
        }
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al actualizar/agregar el usuario:', error);
        setSnackbarMessage('Error al actualizar/agregar el usuario');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        
        if (!existeDuplicado) {
          resetForm();
          setIsDialogOpen(false);
        }
          
        setIsLoading(false);
        setEditingUsuario(null);
      }
    },
  });

  const handleOpenDialog = () => {
    setEditingUsuario(null);
    formik.resetForm();
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingUsuario(null);
    formik.resetForm();
    setIsDialogOpen(false);
  };

  const startEditUsuario = (usuario) => {
    setEditingUsuario(usuario);
    formik.setValues({
      email: usuario.email,
      phone: usuario.phone,
      firstName: usuario.firstName,
      lastName: usuario.lastName,
      proyectos: usuario.proyectosData.map(proj => proj?.id),
      tipo_validacion_remito: usuario.tipo_validacion_remito ?? "",
      notificacion_nota_pedido: usuario.notificacion_nota_pedido || false,
    });
    setIsDialogOpen(true);
  };

  const confirmarEliminacion = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => () => {
      action();
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const eliminarUsuario = async (id) => {
    confirmarEliminacion(`¿Estás seguro de que deseas eliminar este usuario?`, async () => {
      setIsLoading(true);
      try {
        const updatedUsuarios = usuarios.filter((user) => user.id !== id);
        setUsuarios(updatedUsuarios);
        await profileService.deleteProfile(id);
        setSnackbarMessage('Usuario eliminado con éxito');
        setSnackbarSeverity('success');
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        setSnackbarMessage('Error al eliminar usuario');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        setIsLoading(false);
      }
    });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    setDupEmpresaLink(null);
    setDupEmpresaName('');
  };

  // Funciones para envío de templates
  const openTemplateDialog = (usuario) => {
    // Pre-cargar datos del usuario y empresa
    const primerProyecto = usuario.proyectosData?.find(p => p?.nombre)?.nombre || '';
    setTemplateUsuario(usuario);
    setTemplateForm({
      nombre: usuario.firstName || '',
      proveedorEjemplo: empresa?.proveedores?.[0]?.nombre || 'Proveedor Ejemplo',
      proyectoEjemplo: primerProyecto || 'Proyecto Ejemplo',
      fechaEnvio: '',
      horaEnvio: '',
      enviarAhora: true
    });
    setTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setTemplateUsuario(null);
  };

  const handleTemplateFormChange = (field) => (e) => {
    const value = field === 'enviarAhora' ? e.target.value === 'true' : e.target.value;
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTemplate = async () => {
    if (!templateUsuario) return;

    const { nombre, proveedorEjemplo, proyectoEjemplo, fechaEnvio, horaEnvio, enviarAhora } = templateForm;

    if (!nombre || !proveedorEjemplo || !proyectoEjemplo) {
      setSnackbarMessage('Todos los campos son requeridos');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        phone: normalizePhone(templateUsuario.phone),
        nombre,
        proveedorEjemplo,
        proyectoEjemplo
      };

      // Si no es envío inmediato, agregar fecha programada
      if (!enviarAhora && fechaEnvio && horaEnvio) {
        payload.fechaEnvio = new Date(`${fechaEnvio}T${horaEnvio}:00`).toISOString();
      }

      await templateService.sendBienvenidaPrimerEgreso(payload);

      setSnackbarMessage(enviarAhora 
        ? 'Template enviado correctamente' 
        : `Template programado para ${fechaEnvio} a las ${horaEnvio}`
      );
      setSnackbarSeverity('success');
      closeTemplateDialog();
    } catch (error) {
      console.error('Error enviando template:', error);
      setSnackbarMessage(error.response?.data?.error || 'Error al enviar el template');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  // === FUNCIONES PARA SELECCIÓN MASIVA ===
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedUsers(filteredUsuarios.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const isSelected = (userId) => selectedUsers.includes(userId);

  // === FUNCIONES PARA CONFIGURACIÓN MASIVA ===
  const openBulkConfigDialog = () => {
    setBulkConfig({
      tipo_validacion_remito: '',
      default_caja_chica: null,
      notificacion_nota_pedido: null,
      proyectos: []
    });
    setBulkConfigDialogOpen(true);
  };

  const closeBulkConfigDialog = () => {
    setBulkConfigDialogOpen(false);
  };

  const handleBulkConfigChange = (field) => (e) => {
    setBulkConfig(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBulkConfigSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = {};
      if (bulkConfig.tipo_validacion_remito !== '') {
        updates.tipo_validacion_remito = bulkConfig.tipo_validacion_remito;
      }
      if (bulkConfig.default_caja_chica !== null) {
        updates.default_caja_chica = bulkConfig.default_caja_chica;
      }
      if (bulkConfig.notificacion_nota_pedido !== null) {
        updates.notificacion_nota_pedido = bulkConfig.notificacion_nota_pedido;
      }
      if (bulkConfig.proyectos.length > 0) {
        updates.proyectos = bulkConfig.proyectos;
      }

      if (Object.keys(updates).length === 0) {
        setSnackbarMessage('No hay cambios para aplicar');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        setIsLoading(false);
        return;
      }

      // Actualizar cada usuario seleccionado
      const updatePromises = selectedUsers.map(userId => 
        profileService.updateProfile(userId, updates)
      );
      await Promise.all(updatePromises);

      // Actualizar estado local
      setUsuarios(prev => prev.map(user => {
        if (selectedUsers.includes(user.id)) {
          return {
            ...user,
            ...updates,
            ...(updates.proyectos && { proyectosData: updates.proyectos.map(projId => proyectos.find(p => p.id === projId)) })
          };
        }
        return user;
      }));

      setSnackbarMessage(`${selectedUsers.length} usuario(s) actualizados correctamente`);
      setSnackbarSeverity('success');
      setSelectedUsers([]);
      closeBulkConfigDialog();
    } catch (error) {
      console.error('Error en configuración masiva:', error);
      setSnackbarMessage('Error al actualizar usuarios');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  // === FUNCIONES PARA ELIMINACIÓN MASIVA ===
  const handleBulkDelete = () => {
    confirmarEliminacion(
      `¿Estás seguro de que deseas eliminar ${selectedUsers.length} usuario(s)?`,
      async () => {
        setIsLoading(true);
        try {
          const deletePromises = selectedUsers.map(userId => 
            profileService.deleteProfile(userId)
          );
          await Promise.all(deletePromises);

          setUsuarios(prev => prev.filter(user => !selectedUsers.includes(user.id)));
          setSnackbarMessage(`${selectedUsers.length} usuario(s) eliminados correctamente`);
          setSnackbarSeverity('success');
          setSelectedUsers([]);
        } catch (error) {
          console.error('Error en eliminación masiva:', error);
          setSnackbarMessage('Error al eliminar usuarios');
          setSnackbarSeverity('error');
        } finally {
          setSnackbarOpen(true);
          setIsLoading(false);
        }
      }
    );
  };

  // === FUNCIONES PARA ENVÍO MASIVO DE TEMPLATES ===
  const openBulkTemplateDialog = () => {
    setBulkTemplateForm({
      proveedorEjemplo: proveedoresOptions[0] || 'Proveedor Ejemplo',
      proyectoEjemplo: proyectosOptions[0] || 'Proyecto Ejemplo',
      fechaEnvio: '',
      horaEnvio: '',
      enviarAhora: true
    });
    setBulkTemplateDialogOpen(true);
  };

  const closeBulkTemplateDialog = () => {
    setBulkTemplateDialogOpen(false);
  };

  const handleBulkTemplateFormChange = (field) => (e) => {
    const value = field === 'enviarAhora' ? e.target.value === 'true' : e.target.value;
    setBulkTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleBulkSendTemplate = async () => {
    const { proveedorEjemplo, proyectoEjemplo, fechaEnvio, horaEnvio, enviarAhora } = bulkTemplateForm;

    if (!proveedorEjemplo || !proyectoEjemplo) {
      setSnackbarMessage('Proveedor y proyecto son requeridos');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const selectedUsuarios = usuarios.filter(u => selectedUsers.includes(u.id));
      
      const sendPromises = selectedUsuarios.map(usuario => {
        const payload = {
          phone: normalizePhone(usuario.phone),
          nombre: usuario.firstName || 'Usuario',
          proveedorEjemplo,
          proyectoEjemplo
        };

        if (!enviarAhora && fechaEnvio && horaEnvio) {
          payload.fechaEnvio = new Date(`${fechaEnvio}T${horaEnvio}:00`).toISOString();
        }

        return templateService.sendBienvenidaPrimerEgreso(payload);
      });

      await Promise.all(sendPromises);

      setSnackbarMessage(
        enviarAhora 
          ? `Template enviado a ${selectedUsuarios.length} usuario(s)`
          : `Template programado para ${selectedUsuarios.length} usuario(s)`
      );
      setSnackbarSeverity('success');
      setSelectedUsers([]);
      closeBulkTemplateDialog();
    } catch (error) {
      console.error('Error en envío masivo:', error);
      setSnackbarMessage('Error al enviar templates');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  // === FUNCIONES PARA AGREGAR/REMOVER PROYECTOS MASIVAMENTE ===
  const openBulkAddProjectDialog = () => {
    setSelectedProjectId('');
    setBulkAddProjectDialogOpen(true);
  };

  const closeBulkAddProjectDialog = () => {
    setBulkAddProjectDialogOpen(false);
    setSelectedProjectId('');
  };

  const openBulkRemoveProjectDialog = () => {
    setSelectedProjectId('');
    setBulkRemoveProjectDialogOpen(true);
  };

  const closeBulkRemoveProjectDialog = () => {
    setBulkRemoveProjectDialogOpen(false);
    setSelectedProjectId('');
  };

  const handleBulkAddProject = async () => {
    if (!selectedProjectId) {
      setSnackbarMessage('Seleccioná un proyecto');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const updatePromises = selectedUsers.map(userId => {
        const user = usuarios.find(u => u.id === userId);
        const currentProjects = user?.proyectosData?.map(p => p?.id).filter(Boolean) || [];
        
        // Solo agregar si no lo tiene
        if (!currentProjects.includes(selectedProjectId)) {
          return profileService.updateProfile(userId, {
            proyectos: [...currentProjects, selectedProjectId]
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // Actualizar estado local
      setUsuarios(prev => prev.map(user => {
        if (selectedUsers.includes(user.id)) {
          const currentProjects = user.proyectosData?.map(p => p?.id).filter(Boolean) || [];
          if (!currentProjects.includes(selectedProjectId)) {
            const newProject = proyectos.find(p => p.id === selectedProjectId);
            return {
              ...user,
              proyectosData: [...(user.proyectosData || []), newProject].filter(Boolean)
            };
          }
        }
        return user;
      }));

      setSnackbarMessage(`Proyecto agregado a ${selectedUsers.length} usuario(s)`);
      setSnackbarSeverity('success');
      setSelectedUsers([]);
      closeBulkAddProjectDialog();
    } catch (error) {
      console.error('Error agregando proyecto:', error);
      setSnackbarMessage('Error al agregar proyecto');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  const handleBulkRemoveProject = async () => {
    if (!selectedProjectId) {
      setSnackbarMessage('Seleccioná un proyecto');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const updatePromises = selectedUsers.map(userId => {
        const user = usuarios.find(u => u.id === userId);
        const currentProjects = user?.proyectosData?.map(p => p?.id).filter(Boolean) || [];
        
        // Solo remover si lo tiene
        if (currentProjects.includes(selectedProjectId)) {
          return profileService.updateProfile(userId, {
            proyectos: currentProjects.filter(pId => pId !== selectedProjectId)
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      // Actualizar estado local
      setUsuarios(prev => prev.map(user => {
        if (selectedUsers.includes(user.id)) {
          return {
            ...user,
            proyectosData: (user.proyectosData || []).filter(p => p?.id !== selectedProjectId)
          };
        }
        return user;
      }));

      setSnackbarMessage(`Proyecto removido de ${selectedUsers.length} usuario(s)`);
      setSnackbarSeverity('success');
      setSelectedUsers([]);
      closeBulkRemoveProjectDialog();
    } catch (error) {
      console.error('Error removiendo proyecto:', error);
      setSnackbarMessage('Error al remover proyecto');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'}>Gestionar Usuarios</Typography>
              <Chip label={usuarios.length} size="small" color="primary" />
            </Box>
          }
          sx={{ pb: isMobile ? 1 : 2 }}
        />
        <Divider />
        <CardContent sx={{ px: isMobile ? 1 : 2, pt: isMobile ? 1 : 2 }}>
          {/* Buscador y Filtros rápidos */}
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                placeholder={isMobile ? "Buscar..." : "Buscar por email, nombre, teléfono o proyecto..."}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              {/* Botón para mostrar/ocultar filtros en móvil */}
              {isMobile && (
                <IconButton 
                  onClick={() => setShowFilters(!showFilters)}
                  color={activeFilter ? 'primary' : 'default'}
                  sx={{ 
                    border: '1px solid',
                    borderColor: activeFilter ? 'primary.main' : 'divider',
                    borderRadius: 1
                  }}
                >
                  <FilterListIcon />
                  {activeFilter && <Box sx={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} />}
                </IconButton>
              )}
            </Stack>
            
            {/* Filtros rápidos - Colapsable en móvil */}
            <Collapse in={!isMobile || showFilters}>
              <Box sx={{ 
                mt: 1.5, 
                overflowX: 'auto', 
                pb: 1,
                mx: isMobile ? -1 : 0,
                px: isMobile ? 1 : 0,
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 }
              }}>
                <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                  <Chip
                    icon={isMobile ? undefined : <ErrorOutlineIcon />}
                    label={isMobile ? `No email (${filterCounts.sin_email})` : `Sin validar email (${filterCounts.sin_email})`}
                    size="small"
                    variant={activeFilter === 'sin_email' ? 'filled' : 'outlined'}
                    color={activeFilter === 'sin_email' ? 'warning' : 'default'}
                    onClick={() => handleFilterClick('sin_email')}
                    disabled={filterCounts.sin_email === 0}
                  />
                  <Chip
                    icon={isMobile ? undefined : <FolderOffIcon />}
                    label={isMobile ? `Sin proy. (${filterCounts.sin_proyectos})` : `Sin proyectos (${filterCounts.sin_proyectos})`}
                    size="small"
                    variant={activeFilter === 'sin_proyectos' ? 'filled' : 'outlined'}
                    color={activeFilter === 'sin_proyectos' ? 'error' : 'default'}
                    onClick={() => handleFilterClick('sin_proyectos')}
                    disabled={filterCounts.sin_proyectos === 0}
                  />
                  <Chip
                    icon={isMobile ? undefined : <PhoneAndroidIcon />}
                    label={`WA (${filterCounts.whatsapp})`}
                    size="small"
                    variant={activeFilter === 'whatsapp' ? 'filled' : 'outlined'}
                    color={activeFilter === 'whatsapp' ? 'success' : 'default'}
                    onClick={() => handleFilterClick('whatsapp')}
                    disabled={filterCounts.whatsapp === 0}
                  />
                  <Chip
                    icon={isMobile ? undefined : <ComputerIcon />}
                    label={`Web (${filterCounts.web})`}
                    size="small"
                    variant={activeFilter === 'web' ? 'filled' : 'outlined'}
                    color={activeFilter === 'web' ? 'info' : 'default'}
                    onClick={() => handleFilterClick('web')}
                    disabled={filterCounts.web === 0}
                  />
                  <Chip
                    icon={isMobile ? undefined : <AccountBalanceWalletIcon />}
                    label={`Caja (${filterCounts.caja_chica})`}
                    size="small"
                    variant={activeFilter === 'caja_chica' ? 'filled' : 'outlined'}
                    color={activeFilter === 'caja_chica' ? 'secondary' : 'default'}
                    onClick={() => handleFilterClick('caja_chica')}
                    disabled={filterCounts.caja_chica === 0}
                  />
                  <Chip
                    icon={isMobile ? undefined : <NotificationsActiveIcon />}
                    label={`NP (${filterCounts.notificacion_np})`}
                    size="small"
                    variant={activeFilter === 'notificacion_np' ? 'filled' : 'outlined'}
                    color={activeFilter === 'notificacion_np' ? 'primary' : 'default'}
                    onClick={() => handleFilterClick('notificacion_np')}
                    disabled={filterCounts.notificacion_np === 0}
                  />
                  {activeFilter && (
                    <Chip
                      icon={<ClearIcon />}
                      label="Limpiar"
                      size="small"
                      variant="outlined"
                      onClick={() => setActiveFilter(null)}
                    />
                  )}
                </Stack>
              </Box>
            </Collapse>

            {(searchQuery || activeFilter) && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {filteredUsuarios.length} de {usuarios.length} usuario(s)
              </Typography>
            )}
          </Box>

          {/* Barra de acciones masivas */}
          {selectedUsers.length > 0 && (
            <Toolbar
              sx={{
                pl: { xs: 1, sm: 2 },
                pr: { xs: 1, sm: 1 },
                mb: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 1 : 0,
                py: isMobile ? 1 : 0,
              }}
            >
              <Typography 
                sx={{ flex: isMobile ? 'none' : '1 1 100%', mb: isMobile ? 1 : 0 }} 
                color="inherit" 
                variant={isMobile ? 'body2' : 'subtitle1'}
                fontWeight={500}
              >
                {selectedUsers.length} seleccionado(s)
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5,
                justifyContent: isMobile ? 'center' : 'flex-end'
              }}>
                <Tooltip title="Enviar onboarding masivo">
                  {isMobile ? (
                    <IconButton onClick={openBulkTemplateDialog} color="primary" size="small">
                      <SendIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      startIcon={<SendIcon />}
                      onClick={openBulkTemplateDialog}
                      variant="outlined"
                      size="small"
                    >
                      Onboarding
                    </Button>
                  )}
                </Tooltip>
                <Tooltip title="Configurar masivamente">
                  {isMobile ? (
                    <IconButton onClick={openBulkConfigDialog} size="small">
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      startIcon={<SettingsIcon />}
                      onClick={openBulkConfigDialog}
                      variant="outlined"
                      size="small"
                    >
                      Configurar
                    </Button>
                  )}
                </Tooltip>
                <Tooltip title="Agregar proyecto">
                  {isMobile ? (
                    <IconButton onClick={openBulkAddProjectDialog} color="success" size="small">
                      <PlaylistAddIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      startIcon={<PlaylistAddIcon />}
                      onClick={openBulkAddProjectDialog}
                      variant="outlined"
                      size="small"
                      color="success"
                    >
                      + Proyecto
                    </Button>
                  )}
                </Tooltip>
                <Tooltip title="Remover proyecto">
                  {isMobile ? (
                    <IconButton onClick={openBulkRemoveProjectDialog} color="warning" size="small">
                      <PlaylistRemoveIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      startIcon={<PlaylistRemoveIcon />}
                      onClick={openBulkRemoveProjectDialog}
                      variant="outlined"
                      size="small"
                      color="warning"
                    >
                      - Proyecto
                    </Button>
                  )}
                </Tooltip>
                <Tooltip title="Eliminar seleccionados">
                  {isMobile ? (
                    <IconButton onClick={handleBulkDelete} color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={handleBulkDelete}
                      color="error"
                      variant="outlined"
                      size="small"
                    >
                      Eliminar
                    </Button>
                  )}
                </Tooltip>
              </Box>
            </Toolbar>
          )}
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsuarios.length}
                      checked={filteredUsuarios.length > 0 && selectedUsers.length === filteredUsuarios.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'nombre'}
                      direction={orderBy === 'nombre' ? order : 'asc'}
                      onClick={() => handleSort('nombre')}
                    >
                      Usuario
                    </TableSortLabel>
                  </TableCell>
                  {!isMobile && (
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'email'}
                        direction={orderBy === 'email' ? order : 'asc'}
                        onClick={() => handleSort('email')}
                      >
                        Email
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && (
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'phone'}
                        direction={orderBy === 'phone' ? order : 'asc'}
                        onClick={() => handleSort('phone')}
                      >
                        WhatsApp
                      </TableSortLabel>
                    </TableCell>
                  )}
                  {!isMobile && <TableCell>Validación</TableCell>}
                  <TableCell>{isMobile ? '✓' : 'Email'}</TableCell>
                  {!isTablet && <TableCell>Proyectos</TableCell>}
                  <TableCell align="center">{isMobile ? '' : 'Acciones'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsuarios.map((usuario) => (
                  <TableRow 
                    key={usuario.id}
                    selected={isSelected(usuario.id)}
                    hover
                    onMouseEnter={() => setHoveredRow(usuario.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    sx={{
                      bgcolor: !usuario.confirmed ? 'rgba(255, 193, 7, 0.08)' : 'inherit'
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(usuario.id)}
                        onChange={() => handleSelectUser(usuario.id)}
                        size={isMobile ? 'small' : 'medium'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                          {usuario.firstName} {usuario.lastName}
                        </Typography>
                        {/* En móvil mostramos email y teléfono debajo del nombre */}
                        {isMobile && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            {usuario.email}
                          </Typography>
                        )}
                        {isMobile && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                            📱 {usuario.phone}
                          </Typography>
                        )}
                        {/* En tablet mostramos proyectos aquí */}
                        {isTablet && !isMobile && usuario.proyectosData?.filter(p => p?.nombre).length > 0 && (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                            {usuario.proyectosData.filter(p => p?.nombre).slice(0, 2).map(project => (
                              <Chip key={project?.id} label={project?.nombre} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                            ))}
                            {usuario.proyectosData.filter(p => p?.nombre).length > 2 && (
                              <Chip label={`+${usuario.proyectosData.filter(p => p?.nombre).length - 2}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                            )}
                          </Stack>
                        )}
                        {(usuario.default_caja_chica || usuario.notificacion_nota_pedido) && (
                          <Box sx={{ mt: 0.5 }}>
                            {usuario.default_caja_chica && (
                              <Chip label={isMobile ? '💰' : 'Caja chica'} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            )}
                            {usuario.notificacion_nota_pedido && (
                              <Chip label={isMobile ? '🔔' : 'Notif. NP'} size="small" sx={{ fontSize: '0.65rem', height: 18, ml: 0.5 }} color="info" />
                            )}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{usuario.email}</Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{usuario.phone}</Typography>
                      </TableCell>
                    )}
                    {!isMobile && (
                      <TableCell>
                        {usuario.tipo_validacion_remito === 'whatsapp' && (
                          <Chip icon={<PhoneAndroidIcon />} label="WA" size="small" color="success" variant="outlined" />
                        )}
                        {usuario.tipo_validacion_remito === 'web' && (
                          <Chip icon={<ComputerIcon />} label="Web" size="small" color="info" variant="outlined" />
                        )}
                        {!usuario.tipo_validacion_remito && (
                          <Chip label="—" size="small" variant="outlined" />
                        )}
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ px: isMobile ? 0.5 : 2 }}>
                      {usuario.confirmed ? (
                        <CheckCircleIcon sx={{ color: green[500], fontSize: isMobile ? 18 : 20 }} />
                      ) : (
                        <Tooltip title="Copiar link de registro">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const mensaje = `Hola ${usuario.firstName || ''} ${usuario.lastName || ''}, con email ${usuario.email || ''}, te comparto el link para que puedas registrarte en Sorbydata. El email podés modificarlo ahí mismo.\n\nImportante: Recordá que cada link es único.\n\nhttps://admin.sorbydata.com/auth/register/?code=${usuario.confirmationCode}`;
                              navigator.clipboard.writeText(mensaje);
                              setSnackbarMessage('Link copiado al portapapeles');
                              setSnackbarSeverity('success');
                              setSnackbarOpen(true);
                            }}
                          >
                            <ContentCopyIcon fontSize="small" color="warning" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    {!isTablet && (
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {usuario.proyectosData.filter(project => project && project.nombre).length === 0 ? (
                            <Chip label="Sin proyectos" size="small" variant="outlined" color="error" sx={{ fontSize: '0.7rem', height: 22 }} />
                          ) : (
                            usuario.proyectosData.filter(project => project && project.nombre).map(project => (
                              <Chip key={project?.id} label={project?.nombre} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                            ))
                          )}
                        </Stack>
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ px: isMobile ? 0.5 : 1 }}>
                      <Box sx={{ 
                        opacity: hoveredRow === usuario.id || isSelected(usuario.id) ? 1 : 0.3,
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => startEditUsuario(usuario)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isMobile && (
                          <Tooltip title="Enviar onboarding">
                            <IconButton size="small" onClick={() => openTemplateDialog(usuario)} color="primary">
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar">
                          <IconButton size="small" onClick={() => eliminarUsuario(usuario.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredUsuarios.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={isMobile ? [5, 10, 25] : [5, 10, 25, 50]}
            labelRowsPerPage={isMobile ? '' : 'Por página:'}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to}/${count}`}
            sx={{
              '.MuiTablePagination-selectLabel': { display: isMobile ? 'none' : 'block' },
              '.MuiTablePagination-displayedRows': { fontSize: isMobile ? '0.75rem' : '0.875rem' },
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Button 
              startIcon={<AddCircleIcon />} 
              color="primary" 
              variant="contained" 
              onClick={handleOpenDialog}
              fullWidth={isMobile}
              size={isMobile ? 'medium' : 'large'}
            >
              {isMobile ? 'Agregar' : 'Agregar Usuario'}
            </Button>
          </Box>
        </CardContent>
        {isLoading && <LinearProgress />}
      </Card>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullScreen={isMobile}>
        <DialogTitle>{editingUsuario ? "Editar Usuario" : "Agregar Usuario"}</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              name="email"
              label="Email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            <TextField
              fullWidth
              margin="dense"
              name="phone"
              label="WhatsApp"
              value={formik.values.phone}
              onChange={formik.handleChange}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              helperText={formik.touched.phone && formik.errors.phone}
            />
            <TextField
              fullWidth
              margin="dense"
              name="firstName"
              label="Nombre"
              value={formik.values.firstName}
              onChange={formik.handleChange}
              error={formik.touched.firstName && Boolean(formik.errors.firstName)}
              helperText={formik.touched.firstName && formik.errors.firstName}
            />
            <TextField
              fullWidth
              margin="dense"
              name="lastName"
              label="Apellido"
              value={formik.values.lastName}
              onChange={formik.handleChange}
              error={formik.touched.lastName && Boolean(formik.errors.lastName)}
              helperText={formik.touched.lastName && formik.errors.lastName}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Proyectos</InputLabel>
              <Select
                multiple
                value={formik.values.proyectos}
                onChange={formik.handleChange}
                name="proyectos"
                renderValue={(selected) => selected.map((projId) => {
                  const project = proyectos.find(p => p.id === projId);
                  return project ? project.nombre : '';
                }).join(', ')}
              >
                {proyectos.map((project) => (
                  <MenuItem key={project?.id} value={project?.id}>
                    {project.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="tipo-validacion-label">Validación de remito</InputLabel>
              <Select
                labelId="tipo-validacion-label"
                name="tipo_validacion_remito"
                value={formik.values.tipo_validacion_remito}
                onChange={formik.handleChange}
              >
                <MenuItem value="web">Web</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="">No Definido</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="default-caja-chica-label">Caja chica por defecto</InputLabel>
              <Select
                labelId="default-caja-chica-label"
                name="default_caja_chica"
                value={formik.values.default_caja_chica}
                onChange={formik.handleChange}
              >
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
                <MenuItem value={null}>Ninguno</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="default-caja-chica-label">Notificación Nota Pedido</InputLabel>
              <Select
                labelId="default-caja-chica-label"
                name="notificacion_nota_pedido"
                value={formik.values.notificacion_nota_pedido}
                onChange={formik.handleChange}
              >
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
                <MenuItem value={null}>Ninguno</MenuItem>
              </Select>
            </FormControl>

          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {editingUsuario ? "Guardar Cambios" : "Agregar"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={confirmAction}
            color="primary"
            variant="contained"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para enviar template de bienvenida */}
      <Dialog open={templateDialogOpen} onClose={closeTemplateDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Enviar Template de Bienvenida</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enviar a: <strong>{templateUsuario?.firstName} {templateUsuario?.lastName}</strong> ({templateUsuario?.phone})
            </Typography>

            <TextField
              fullWidth
              margin="dense"
              label="Nombre del usuario ({{1}})"
              value={templateForm.nombre}
              onChange={handleTemplateFormChange('nombre')}
              helperText="Cómo se va a saludar al usuario"
            />

            <Autocomplete
              freeSolo
              options={proveedoresOptions}
              value={templateForm.proveedorEjemplo}
              onChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proveedor de ejemplo ({{2}})"
                  helperText={proveedoresOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Ferretería López, Corralón Norte"}
                />
              )}
            />

            <Autocomplete
              freeSolo
              options={proyectosOptions}
              value={templateForm.proyectoEjemplo}
              onChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proyecto de ejemplo ({{3}})"
                  helperText={proyectosOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Obra Av. Corrientes, Edificio Centro"}
                />
              )}
            />

            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>¿Cuándo enviar?</InputLabel>
              <Select
                value={templateForm.enviarAhora}
                onChange={handleTemplateFormChange('enviarAhora')}
                label="¿Cuándo enviar?"
              >
                <MenuItem value={true}>Enviar ahora</MenuItem>
                <MenuItem value={false}>Programar envío</MenuItem>
              </Select>
            </FormControl>

            {!templateForm.enviarAhora && (
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  type="date"
                  label="Fecha"
                  value={templateForm.fechaEnvio}
                  onChange={handleTemplateFormChange('fechaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="time"
                  label="Hora"
                  value={templateForm.horaEnvio}
                  onChange={handleTemplateFormChange('horaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Vista previa:</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                {`¡Hola ${templateForm.nombre || '{{1}}'}! Soy Sorby 👋

Voy a ser tu asistente para registrar gastos y egresos de forma simple.

¿Arrancamos con tu primer registro? Es muy fácil 🙌

Simplemente mandame:

📸 Una foto de un ticket, factura o comprobante
🎙️ Un audio contándome el gasto
✍️ O escribime algo como: "Pagué 15.000 a ${templateForm.proveedorEjemplo || '{{2}}'} para ${templateForm.proyectoEjemplo || '{{3}}'}"

Probá ahora, te espero acá 👇`}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTemplateDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleSendTemplate} 
            color="primary" 
            variant="contained"
            startIcon={<SendIcon />}
            disabled={isLoading}
          >
            {templateForm.enviarAhora ? 'Enviar ahora' : 'Programar envío'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para configuración masiva */}
      <Dialog open={bulkConfigDialogOpen} onClose={closeBulkConfigDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Configurar {selectedUsers.length} usuario(s)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Solo se aplicarán los campos que modifiques. Los campos vacíos no se cambiarán.
            </Typography>

            <FormControl fullWidth margin="dense">
              <InputLabel>Validación de remito</InputLabel>
              <Select
                value={bulkConfig.tipo_validacion_remito}
                onChange={handleBulkConfigChange('tipo_validacion_remito')}
                label="Validación de remito"
              >
                <MenuItem value="">-- No cambiar --</MenuItem>
                <MenuItem value="web">Web</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="ninguno">No Definido</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Caja chica por defecto</InputLabel>
              <Select
                value={bulkConfig.default_caja_chica}
                onChange={handleBulkConfigChange('default_caja_chica')}
                label="Caja chica por defecto"
              >
                <MenuItem value={null}>-- No cambiar --</MenuItem>
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Notificación Nota Pedido</InputLabel>
              <Select
                value={bulkConfig.notificacion_nota_pedido}
                onChange={handleBulkConfigChange('notificacion_nota_pedido')}
                label="Notificación Nota Pedido"
              >
                <MenuItem value={null}>-- No cambiar --</MenuItem>
                <MenuItem value={true}>Sí</MenuItem>
                <MenuItem value={false}>No</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Proyectos</InputLabel>
              <Select
                multiple
                value={bulkConfig.proyectos}
                onChange={handleBulkConfigChange('proyectos')}
                label="Proyectos"
                renderValue={(selected) => selected.map((projId) => {
                  const project = proyectos.find(p => p.id === projId);
                  return project ? project.nombre : '';
                }).join(', ')}
              >
                {proyectos.map((project) => (
                  <MenuItem key={project?.id} value={project?.id}>
                    {project.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkConfigDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkConfigSubmit} 
            color="primary" 
            variant="contained"
            startIcon={<SettingsIcon />}
            disabled={isLoading}
          >
            Aplicar cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para envío masivo de templates */}
      <Dialog open={bulkTemplateDialogOpen} onClose={closeBulkTemplateDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Enviar onboarding a {selectedUsers.length} usuario(s)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Se usará el nombre de cada usuario automáticamente.
            </Typography>

            <Autocomplete
              freeSolo
              options={proveedoresOptions}
              value={bulkTemplateForm.proveedorEjemplo}
              onChange={(_, newValue) => setBulkTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setBulkTemplateForm(prev => ({ ...prev, proveedorEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proveedor de ejemplo ({{2}})"
                  helperText={proveedoresOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Ferretería López, Corralón Norte"}
                />
              )}
            />

            <Autocomplete
              freeSolo
              options={proyectosOptions}
              value={bulkTemplateForm.proyectoEjemplo}
              onChange={(_, newValue) => setBulkTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              onInputChange={(_, newValue) => setBulkTemplateForm(prev => ({ ...prev, proyectoEjemplo: newValue || '' }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="dense"
                  label="Proyecto de ejemplo ({{3}})"
                  helperText={proyectosOptions.length > 0 
                    ? "Seleccioná uno existente o escribí uno nuevo" 
                    : "Ej: Obra Av. Corrientes, Edificio Centro"}
                />
              )}
            />

            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel>¿Cuándo enviar?</InputLabel>
              <Select
                value={bulkTemplateForm.enviarAhora}
                onChange={handleBulkTemplateFormChange('enviarAhora')}
                label="¿Cuándo enviar?"
              >
                <MenuItem value={true}>Enviar ahora</MenuItem>
                <MenuItem value={false}>Programar envío</MenuItem>
              </Select>
            </FormControl>

            {!bulkTemplateForm.enviarAhora && (
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  type="date"
                  label="Fecha"
                  value={bulkTemplateForm.fechaEnvio}
                  onChange={handleBulkTemplateFormChange('fechaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  type="time"
                  label="Hora"
                  value={bulkTemplateForm.horaEnvio}
                  onChange={handleBulkTemplateFormChange('horaEnvio')}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Vista previa (se personalizará el nombre):</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                {`¡Hola [Nombre del usuario]! Soy Sorby 👋

Voy a ser tu asistente para registrar gastos y egresos de forma simple.

¿Arrancamos con tu primer registro? Es muy fácil 🙌

Simplemente mandame:

📸 Una foto de un ticket, factura o comprobante
🎙️ Un audio contándome el gasto
✍️ O escribime algo como: "Pagué 15.000 a ${bulkTemplateForm.proveedorEjemplo || '{{2}}'} para ${bulkTemplateForm.proyectoEjemplo || '{{3}}'}"

Probá ahora, te espero acá 👇`}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkTemplateDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkSendTemplate} 
            color="primary" 
            variant="contained"
            startIcon={<SendIcon />}
            disabled={isLoading}
          >
            {bulkTemplateForm.enviarAhora ? `Enviar a ${selectedUsers.length}` : `Programar para ${selectedUsers.length}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para agregar proyecto masivamente */}
      <Dialog open={bulkAddProjectDialogOpen} onClose={closeBulkAddProjectDialog} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle>Agregar proyecto a {selectedUsers.length} usuario(s)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Proyecto a agregar</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                label="Proyecto a agregar"
              >
                {proyectos.map((project) => (
                  <MenuItem key={project?.id} value={project?.id}>
                    {project.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkAddProjectDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkAddProject} 
            color="success" 
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            disabled={isLoading || !selectedProjectId}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para remover proyecto masivamente */}
      <Dialog open={bulkRemoveProjectDialogOpen} onClose={closeBulkRemoveProjectDialog} maxWidth="xs" fullWidth fullScreen={isMobile}>
        <DialogTitle>Remover proyecto de {selectedUsers.length} usuario(s)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Proyecto a remover</InputLabel>
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                label="Proyecto a remover"
              >
                {proyectos.map((project) => (
                  <MenuItem key={project?.id} value={project?.id}>
                    {project.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Solo se removerá de los usuarios que tengan este proyecto asignado.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkRemoveProjectDialog} color="secondary">
            Cancelar
          </Button>
          <Button 
            onClick={handleBulkRemoveProject} 
            color="warning" 
            variant="contained"
            startIcon={<PlaylistRemoveIcon />}
            disabled={isLoading || !selectedProjectId}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={dupEmpresaLink ? null : 6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
         <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
            action={
              dupEmpresaLink ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.open(dupEmpresaLink, '_blank')}
                >
                  Ver empresa{dupEmpresaName ? ` (${dupEmpresaName})` : ''}
                </Button>
              ) : null
            }
          >
            {snackbarMessage}
          </Alert>
      </Snackbar>
    </div>
  );
};
