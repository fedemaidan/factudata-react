import Head from 'next/head';
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Support as SupportIcon,
  Business as BusinessIcon,
  AccountBalance as AccountBalanceIcon,
  Gavel as GavelIcon,
  SupervisorAccount as SupervisorIcon,
  Build as BuildIcon,
  Web as WebIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Payment as PaymentIcon,
  RoomService as ServiceIcon,
  AccountBalanceWallet as LoanIcon,
  Description as DocumentIcon,
  MonetizationOn as MoneyIcon,
  CompareArrows as ConciliarIcon,
  ShoppingCart as VentaIcon,
  Edit as EditIcon,
  Home as LoteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  WorkOutline as WorkIcon,
  Security as SecurityIcon,
  Group as GroupRoleIcon,
  MoreVert as MoreVertIcon,
  EditNote as EditNoteIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import LoteParaTodosLayout from 'src/components/layouts/LoteParaTodosLayout';

// Catálogo oficial de emprendimientos y gremios
const emprendimientosOficiales = [
  { id: 'CR1', label: 'Cerro Rico 1' },
  { id: 'CR2', label: 'Cerro Rico 2' },
  { id: 'CR2E2', label: 'Cerro Rico 2 Etapa 2' },
  { id: 'MO', label: 'Moreno' },
  { id: 'LG1', label: 'La Glorieta 1' },
  { id: 'LG2', label: 'La Glorieta 2' },
  { id: 'CR3', label: 'Cerro Rico 3' },
  { id: 'NH', label: 'Nuevo Horizonte' },
  { id: 'PC', label: 'Parque Central' },
  { id: 'PI', label: 'Pinares del Casco' },
  { id: 'EP', label: 'El Portal' },
  { id: 'PB', label: 'Parque Bicentenario' },
  { id: 'LF', label: 'La Fraternidad' },
  { id: 'VM', label: 'Vaca Muerta' }
];

const gremiosOficiales = [
  { id: 'UOM', label: 'UOM' },
  { id: 'Comercio', label: 'Sindicato de Comercio' },
  { id: 'Docentes', label: 'Docentes' },
  { id: 'Bancarios', label: 'Bancarios' },
  { id: 'Petroleros', label: 'Petroleros' },
  { id: 'Municipales', label: 'Municipales' }
];

const reportPermissions = [
  { id: 'reporte-mora', label: 'Reporte de Mora' },
  { id: 'reporte-caja', label: 'Reporte de Caja y Tesorería' },
  { id: 'reporte-ventas', label: 'Reporte Comercial / Ventas' },
  { id: 'reporte-lotes', label: 'Reporte de Lotes y Masterplan' }
];

// Datos de roles del sistema
const rolesData = [
  {
    id: 'vendedor',
    nombre: 'Vendedor',
    icon: <PersonIcon />,
    color: 'info',
    descripcion: 'Personal de ventas y atención comercial',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Registrar Pagos',
      'Iniciar Venta',
      'Ver Cajas y Bancos'
    ],
    reportes: ['reporte-ventas', 'reporte-lotes'],
    emprendimientosDisponibles: ['CR1', 'CR2', 'CR2E2', 'CR3', 'LG1', 'LG2', 'NH', 'PC', 'EP', 'PB'],
    gremiosDisponibles: ['UOM', 'Comercio', 'Docentes']
  },
  {
    id: 'atencion-cliente',
    nombre: 'Atención al Cliente',
    icon: <SupportIcon />,
    color: 'success',
    descripcion: 'Soporte y atención post-venta',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Cargar Servicios',
      'Generar Documentos'
    ],
    reportes: ['reporte-ventas'],
    emprendimientosDisponibles: ['CR1', 'CR2', 'CR2E2', 'MO', 'LG1', 'LG2', 'CR3', 'NH', 'PC', 'EP', 'PB', 'LF'],
    gremiosDisponibles: ['UOM', 'Comercio', 'Docentes', 'Bancarios']
  },
  {
    id: 'administracion',
    nombre: 'Administración',
    icon: <BusinessIcon />,
    color: 'primary',
    descripcion: 'Gestión administrativa general',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Registrar Pagos',
      'Cargar Servicios',
      'Cargar Préstamos',
      'Generar Documentos',
      'Ver Cajas y Bancos',
      'Editar Emprendimientos',
      'Editar Lotes'
    ],
    reportes: ['reporte-mora', 'reporte-caja', 'reporte-ventas', 'reporte-lotes'],
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: gremiosOficiales.map((item) => item.id)
  },
  {
    id: 'tesoreria',
    nombre: 'Tesorería / Caja',
    icon: <AccountBalanceIcon />,
    color: 'warning',
    descripcion: 'Manejo de fondos y conciliaciones',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Registrar Pagos',
      'Cargar Préstamos',
      'Ver Cajas y Bancos',
      'Conciliar'
    ],
    reportes: ['reporte-caja', 'reporte-mora'],
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: ['UOM', 'Comercio', 'Bancarios', 'Petroleros']
  },
  {
    id: 'legales',
    nombre: 'Legales',
    icon: <GavelIcon />,
    color: 'secondary',
    descripcion: 'Aspectos legales y documentación',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Generar Documentos'
    ],
    reportes: ['reporte-mora'],
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: gremiosOficiales.map((item) => item.id)
  },
  {
    id: 'supervisor',
    nombre: 'Supervisor / Dirección',
    icon: <SupervisorIcon />,
    color: 'error',
    descripcion: 'Supervisión y dirección general',
    activo: true,
    permisos: [
      'Ver Clientes',
      'Ver Contratos',
      'Registrar Pagos',
      'Cargar Servicios',
      'Cargar Préstamos',
      'Generar Documentos',
      'Ver Cajas y Bancos',
      'Conciliar',
      'Iniciar Venta',
      'Editar Emprendimientos',
      'Editar Lotes'
    ],
    reportes: reportPermissions.map((item) => item.id),
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: gremiosOficiales.map((item) => item.id)
  },
  {
    id: 'configuracion',
    nombre: 'Configuración / Setup',
    icon: <BuildIcon />,
    color: 'default',
    descripcion: 'Configuración del sistema',
    activo: true,
    permisos: [
      'Editar Emprendimientos',
      'Editar Lotes'
    ],
    reportes: ['reporte-lotes'],
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: gremiosOficiales.map((item) => item.id)
  },
  {
    id: 'portal-cliente',
    nombre: 'Portal Cliente',
    icon: <WebIcon />,
    color: 'info',
    descripcion: 'Acceso limitado para clientes',
    activo: true,
    permisos: [
      'Ver Contratos'
    ],
    reportes: [],
    emprendimientosDisponibles: [],
    gremiosDisponibles: []
  }
];

// Lista completa de permisos disponibles
const todosLosPermisos = [
  { id: 'ver-clientes', label: 'Ver Clientes', icon: <VisibilityIcon fontSize="small" /> },
  { id: 'ver-contratos', label: 'Ver Contratos', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'registrar-pagos', label: 'Registrar Pagos', icon: <PaymentIcon fontSize="small" /> },
  { id: 'cargar-servicios', label: 'Cargar Servicios', icon: <ServiceIcon fontSize="small" /> },
  { id: 'cargar-prestamos', label: 'Cargar Préstamos', icon: <LoanIcon fontSize="small" /> },
  { id: 'generar-documentos', label: 'Generar Documentos', icon: <DocumentIcon fontSize="small" /> },
  { id: 'ver-cajas-bancos', label: 'Ver Cajas y Bancos', icon: <MoneyIcon fontSize="small" /> },
  { id: 'conciliar', label: 'Conciliar', icon: <ConciliarIcon fontSize="small" /> },
  { id: 'iniciar-venta', label: 'Iniciar Venta', icon: <VentaIcon fontSize="small" /> },
  { id: 'editar-emprendimientos', label: 'Editar Emprendimientos', icon: <EditIcon fontSize="small" /> },
  { id: 'editar-lotes', label: 'Editar Lotes', icon: <LoteIcon fontSize="small" /> }
];

// Íconos disponibles para roles nuevos
const iconosDisponibles = [
  { id: 'person', label: 'Persona', icon: <PersonIcon /> },
  { id: 'support', label: 'Soporte', icon: <SupportIcon /> },
  { id: 'business', label: 'Negocios', icon: <BusinessIcon /> },
  { id: 'account', label: 'Finanzas', icon: <AccountBalanceIcon /> },
  { id: 'gavel', label: 'Legal', icon: <GavelIcon /> },
  { id: 'supervisor', label: 'Supervisor', icon: <SupervisorIcon /> },
  { id: 'build', label: 'Herramientas', icon: <BuildIcon /> },
  { id: 'web', label: 'Web', icon: <WebIcon /> },
  { id: 'work', label: 'Trabajo', icon: <WorkIcon /> },
  { id: 'security', label: 'Seguridad', icon: <SecurityIcon /> },
  { id: 'group', label: 'Grupo', icon: <GroupRoleIcon /> }
];

const coloresDisponibles = [
  { id: 'primary', label: 'Azul', color: 'primary' },
  { id: 'secondary', label: 'Púrpura', color: 'secondary' },
  { id: 'success', label: 'Verde', color: 'success' },
  { id: 'warning', label: 'Naranja', color: 'warning' },
  { id: 'error', label: 'Rojo', color: 'error' },
  { id: 'info', label: 'Cian', color: 'info' }
];

const ConfiguradorRolesPage = () => {
  const router = useRouter();
  const [roles, setRoles] = useState(rolesData);
  const [rolSeleccionado, setRolSeleccionado] = useState(rolesData[0]); // Vendedor por defecto
  const [permisosModificados, setPermisosModificados] = useState(rolesData[0].permisos);
  const [reportesSeleccionados, setReportesSeleccionados] = useState(rolesData[0].reportes || []);
  const [emprendimientosAsignados, setEmprendimientosAsignados] = useState(
    rolesData[0].emprendimientosDisponibles || emprendimientosOficiales.map((item) => item.id)
  );
  const [gremiosAsignados, setGremiosAsignados] = useState(
    rolesData[0].gremiosDisponibles || gremiosOficiales.map((item) => item.id)
  );
  
  // Estados para el modal de nuevo rol
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoRol, setNuevoRol] = useState({
    nombre: '',
    descripcion: '',
    icono: 'person',
    color: 'primary',
    permisos: [],
    reportes: [],
    emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
    gremiosDisponibles: gremiosOficiales.map((item) => item.id)
  });

  // Estados para edición de roles
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false);
  const [rolEditando, setRolEditando] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [rolMenuSeleccionado, setRolMenuSeleccionado] = useState(null);

  const handleSeleccionarRol = (rol) => {
    setRolSeleccionado(rol);
    setPermisosModificados([...rol.permisos]);
    setReportesSeleccionados([...(rol.reportes || [])]);
    setEmprendimientosAsignados([...(rol.emprendimientosDisponibles || [])]);
    setGremiosAsignados([...(rol.gremiosDisponibles || [])]);
  };

  const handleTogglePermiso = (permisoLabel) => {
    if (permisosModificados.includes(permisoLabel)) {
      setPermisosModificados(permisosModificados.filter(p => p !== permisoLabel));
    } else {
      setPermisosModificados([...permisosModificados, permisoLabel]);
    }
  };

  const handleToggleReporte = (reporteId) => {
    if (reportesSeleccionados.includes(reporteId)) {
      setReportesSeleccionados(reportesSeleccionados.filter((rep) => rep !== reporteId));
    } else {
      setReportesSeleccionados([...reportesSeleccionados, reporteId]);
    }
  };

  const handleToggleEmprendimiento = (codigo) => {
    if (emprendimientosAsignados.includes(codigo)) {
      setEmprendimientosAsignados(emprendimientosAsignados.filter((item) => item !== codigo));
    } else {
      setEmprendimientosAsignados([...emprendimientosAsignados, codigo]);
    }
  };

  const handleToggleGremio = (gremioId) => {
    if (gremiosAsignados.includes(gremioId)) {
      setGremiosAsignados(gremiosAsignados.filter((item) => item !== gremioId));
    } else {
      setGremiosAsignados([...gremiosAsignados, gremioId]);
    }
  };

  const handleGuardar = () => {
    console.log('Guardando permisos para:', rolSeleccionado.nombre);
    console.log('Permisos:', permisosModificados);
    
    // Actualizar el rol en la lista
    const rolesActualizados = roles.map(rol => 
      rol.id === rolSeleccionado.id 
        ? {
            ...rol,
            permisos: [...permisosModificados],
            reportes: [...reportesSeleccionados],
            emprendimientosDisponibles: [...emprendimientosAsignados],
            gremiosDisponibles: [...gremiosAsignados]
          }
        : rol
    );
    setRoles(rolesActualizados);
    
    // Actualizar el rol seleccionado
    const rolActualizado = {
      ...rolSeleccionado,
      permisos: [...permisosModificados],
      reportes: [...reportesSeleccionados],
      emprendimientosDisponibles: [...emprendimientosAsignados],
      gremiosDisponibles: [...gremiosAsignados]
    };
    setRolSeleccionado(rolActualizado);
  };

  const handleCancelar = () => {
    setPermisosModificados([...rolSeleccionado.permisos]);
    setReportesSeleccionados([...(rolSeleccionado.reportes || [])]);
    setEmprendimientosAsignados([...(rolSeleccionado.emprendimientosDisponibles || [])]);
    setGremiosAsignados([...(rolSeleccionado.gremiosDisponibles || [])]);
  };

  // Funciones para el modal de nuevo rol
  const handleAbrirModal = () => {
    setModalAbierto(true);
    setNuevoRol({
      nombre: '',
      descripcion: '',
      icono: 'person',
      color: 'primary',
      permisos: [],
      reportes: [],
      emprendimientosDisponibles: emprendimientosOficiales.map((item) => item.id),
      gremiosDisponibles: gremiosOficiales.map((item) => item.id)
    });
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
  };

  const handleCambioNuevoRol = (campo, valor) => {
    setNuevoRol(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleTogglePermisoNuevoRol = (permisoLabel) => {
    const permisosActuales = nuevoRol.permisos;
    if (permisosActuales.includes(permisoLabel)) {
      setNuevoRol(prev => ({
        ...prev,
        permisos: permisosActuales.filter(p => p !== permisoLabel)
      }));
    } else {
      setNuevoRol(prev => ({
        ...prev,
        permisos: [...permisosActuales, permisoLabel]
      }));
    }
  };

  const handleToggleListaNuevoRol = (campo, valor) => {
    setNuevoRol((prev) => {
      const listaActual = prev[campo] || [];
      const existe = listaActual.includes(valor);
      return {
        ...prev,
        [campo]: existe ? listaActual.filter((item) => item !== valor) : [...listaActual, valor]
      };
    });
  };

  const handleCrearRol = () => {
    if (!nuevoRol.nombre.trim()) {
      return;
    }

    const iconoSeleccionado = iconosDisponibles.find(i => i.id === nuevoRol.icono)?.icon || <PersonIcon />;
    
    const rolCreado = {
      id: `custom-${Date.now()}`,
      nombre: nuevoRol.nombre,
      icon: iconoSeleccionado,
      color: nuevoRol.color,
      descripcion: nuevoRol.descripcion || 'Rol personalizado',
      permisos: [...nuevoRol.permisos],
      reportes: [...nuevoRol.reportes],
      emprendimientosDisponibles: [...nuevoRol.emprendimientosDisponibles],
      gremiosDisponibles: [...nuevoRol.gremiosDisponibles],
      esPersonalizado: true,
      activo: true
    };

    // Agregar el nuevo rol a la lista
    const nuevosRoles = [...roles, rolCreado];
    setRoles(nuevosRoles);
    
    // Seleccionar el nuevo rol
    setRolSeleccionado(rolCreado);
    setPermisosModificados([...rolCreado.permisos]);
  setReportesSeleccionados([...rolCreado.reportes]);
  setEmprendimientosAsignados([...rolCreado.emprendimientosDisponibles]);
  setGremiosAsignados([...rolCreado.gremiosDisponibles]);
    
    // Cerrar modal
    handleCerrarModal();
    
    console.log('Rol creado:', rolCreado);
  };

  // Funciones para menú de opciones de rol
  const handleAbrirMenu = (event, rol) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setRolMenuSeleccionado(rol);
  };

  const handleCerrarMenu = () => {
    setMenuAnchorEl(null);
    setRolMenuSeleccionado(null);
  };

  const handleEditarRol = () => {
    setRolEditando({...rolMenuSeleccionado});
    setModalEdicionAbierto(true);
    handleCerrarMenu();
  };

  const handleToggleActivoRol = () => {
    const rolesActualizados = roles.map(rol => 
      rol.id === rolMenuSeleccionado.id 
        ? { ...rol, activo: !rol.activo }
        : rol
    );
    setRoles(rolesActualizados);
    
    // Si se desactiva el rol actualmente seleccionado, seleccionar otro
    const rolAfectado = rolesActualizados.find(r => r.id === rolMenuSeleccionado.id);
    if (rolSeleccionado.id === rolMenuSeleccionado.id && rolAfectado && !rolAfectado.activo) {
      const primerRolActivo = rolesActualizados.find(r => r.activo);
      if (primerRolActivo) {
        setRolSeleccionado(primerRolActivo);
        setPermisosModificados([...primerRolActivo.permisos]);
        setReportesSeleccionados([...(primerRolActivo.reportes || [])]);
        setEmprendimientosAsignados([...(primerRolActivo.emprendimientosDisponibles || [])]);
        setGremiosAsignados([...(primerRolActivo.gremiosDisponibles || [])]);
      }
    }
    
    handleCerrarMenu();
  };

  // Funciones para modal de edición
  const handleCerrarModalEdicion = () => {
    setModalEdicionAbierto(false);
    setRolEditando(null);
  };

  const handleGuardarEdicionRol = () => {
    if (!rolEditando.nombre.trim()) {
      return;
    }

    const iconoSeleccionado = iconosDisponibles.find(i => i.id === rolEditando.icono)?.icon || rolEditando.icon;
    
    const rolActualizado = {
      ...rolEditando,
      icon: iconoSeleccionado
    };

    const rolesActualizados = roles.map(rol => 
      rol.id === rolEditando.id ? rolActualizado : rol
    );
    setRoles(rolesActualizados);
    
    // Si es el rol seleccionado, actualizarlo
    if (rolSeleccionado.id === rolEditando.id) {
      setRolSeleccionado(rolActualizado);
    }
    
    handleCerrarModalEdicion();
  };

  const handleCambioRolEditando = (campo, valor) => {
    setRolEditando(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  return (
    <>
      <Head>
        <title>Configurador de Roles - Lote Para Todos</title>
      </Head>
      
      <LoteParaTodosLayout currentModule="configuracion" pageTitle="Configurador de Roles">
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Configurador de Roles
              </Typography>
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              Gestiona los permisos de cada rol del sistema. Los cambios afectan a todos los usuarios asignados a cada rol.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* Panel izquierdo: Lista de roles */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: 'fit-content' }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Roles del Sistema
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Selecciona un rol para configurar sus permisos
                    </Typography>
                  </Box>
                  
                  
                  {/* Botón Agregar Rol */}
                  <Box sx={{ px: 3, pb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAbrirModal}
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        py: 1.5,
                        borderStyle: 'dashed',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.50',
                          borderStyle: 'dashed',
                        },
                      }}
                    >
                      Agregar Nuevo Rol
                    </Button>
                  </Box>

                  <List sx={{ px: 2, pb: 2 }}>
                    {roles.map((rol) => (
                      <ListItem key={rol.id} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                          selected={rolSeleccionado.id === rol.id}
                          onClick={() => handleSeleccionarRol(rol)}
                          disabled={rol.activo === false}
                          sx={{
                            borderRadius: 2,
                            py: 1.5,
                            px: 2,
                            opacity: rol.activo === false ? 0.5 : 1,
                            '&.Mui-selected': {
                              backgroundColor: 'primary.50',
                              borderLeft: '4px solid',
                              borderLeftColor: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.100',
                              },
                            },
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                            '&.Mui-disabled': {
                              opacity: 0.5,
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ color: rolSeleccionado.id === rol.id ? 'primary.main' : 'text.secondary' }}>
                                {rol.icon}
                              </Box>
                              {rol.activo === false && (
                                <Chip
                                  label="Inactivo"
                                  size="small"
                                  color="default"
                                  sx={{
                                    height: 16,
                                    fontSize: '0.6rem',
                                    '& .MuiChip-label': { px: 0.5 }
                                  }}
                                />
                              )}
                            </Stack>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: rolSeleccionado.id === rol.id ? 600 : 500,
                                    color: rolSeleccionado.id === rol.id ? 'primary.main' : 'text.primary',
                                    textDecoration: rol.activo === false ? 'line-through' : 'none'
                                  }}
                                >
                                  {rol.nombre}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleAbrirMenu(e, rol)}
                                  sx={{
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1 }
                                  }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {rol.descripcion}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Panel derecho: Permisos del rol seleccionado */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 4 }}>
                  {/* Header del panel de permisos */}
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                    <Box sx={{ color: 'primary.main' }}>
                      {rolSeleccionado.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Permisos del Rol: {rolSeleccionado.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rolSeleccionado.descripcion}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto' }}>
                      <Chip
                        label={`${permisosModificados.length} permisos / ${reportesSeleccionados.length} reportes`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Stack>

                  <Divider sx={{ mb: 4 }} />

                  {/* Grid de permisos */}
                  <FormGroup>
                    <Grid container spacing={3}>
                      {todosLosPermisos.map((permiso) => (
                        <Grid item xs={12} sm={6} md={4} key={permiso.id}>
                          <Paper
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              backgroundColor: permisosModificados.includes(permiso.label) 
                                ? 'primary.50' 
                                : 'grey.50',
                              border: '1px solid',
                              borderColor: permisosModificados.includes(permiso.label)
                                ? 'primary.200'
                                : 'grey.200',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: 1,
                              },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={permisosModificados.includes(permiso.label)}
                                  onChange={() => handleTogglePermiso(permiso.label)}
                                  sx={{
                                    '&.Mui-checked': {
                                      color: 'primary.main',
                                    },
                                  }}
                                />
                              }
                              label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Box sx={{ color: 'text.secondary' }}>
                                    {permiso.icon}
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: permisosModificados.includes(permiso.label) ? 600 : 400,
                                      color: 'text.primary'
                                    }}
                                  >
                                    {permiso.label}
                                  </Typography>
                                </Stack>
                              }
                              sx={{
                                m: 0,
                                width: '100%',
                                '& .MuiFormControlLabel-label': {
                                  flex: 1,
                                },
                              }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>

                  

                  {/* Sección: Emprendimientos disponibles */}
                  <Box sx={{ mt: 5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <BusinessIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Emprendimientos habilitados
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Solo podrás asignar usuarios a los emprendimientos seleccionados para este rol.
                    </Typography>
                    <Grid container spacing={2}>
                      {emprendimientosOficiales.map((emprendimiento) => (
                        <Grid item xs={12} sm={6} md={4} key={emprendimiento.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={emprendimientosAsignados.includes(emprendimiento.id)}
                                onChange={() => handleToggleEmprendimiento(emprendimiento.id)}
                                sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                              />
                            }
                            label={`${emprendimiento.id} - ${emprendimiento.label}`}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Sección: Gremios disponibles */}
                  <Box sx={{ mt: 5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <GroupRoleIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Gremios disponibles
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Determina qué gremios o agrupaciones puede gestionar cada rol. Se usarán en el formulario de usuarios.
                    </Typography>
                    <Grid container spacing={2}>
                      {gremiosOficiales.map((gremio) => (
                        <Grid item xs={12} sm={6} md={4} key={gremio.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={gremiosAsignados.includes(gremio.id)}
                                onChange={() => handleToggleGremio(gremio.id)}
                                sx={{ '&.Mui-checked': { color: 'success.main' } }}
                              />
                            }
                            label={gremio.label}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Sección: Reportes habilitados */}
                  <Box sx={{ mt: 5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <DocumentIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Reportes habilitados
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Definí qué reportes avanzados podrá consultar este rol. Los reportes suelen incluir datos sensibles.
                    </Typography>
                    <Grid container spacing={2}>
                      {reportPermissions.map((reporte) => (
                        <Grid item xs={12} sm={6} key={reporte.id}>
                          <Paper
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              backgroundColor: reportesSeleccionados.includes(reporte.id)
                                ? 'secondary.50'
                                : 'grey.50',
                              border: '1px solid',
                              borderColor: reportesSeleccionados.includes(reporte.id)
                                ? 'secondary.200'
                                : 'grey.200'
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={reportesSeleccionados.includes(reporte.id)}
                                  onChange={() => handleToggleReporte(reporte.id)}
                                  sx={{ '&.Mui-checked': { color: 'secondary.main' } }}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {reporte.label}
                                </Typography>
                              }
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  {/* Notas aclaratorias */}
                  <Box sx={{ mt: 4, mb: 3 }}>
                    <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Configuración de Rol:</strong> Puedes modificar permisos, nombre y estado de todos los roles.
                      </Typography>
                    </Alert>
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      <Typography variant="body2">
                        Los cambios afectan a todos los usuarios con este rol asignado.
                      </Typography>
                    </Alert>
                  </Box>

                  {/* Botones de acción */}
                  <Paper 
                    sx={{ 
                      p: 3, 
                      borderRadius: 2, 
                      backgroundColor: 'grey.50',
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                      <Button
                        variant="outlined"
                        onClick={handleCancelar}
                        size="large"
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 500,
                          px: 4,
                          py: 1.5,
                          borderColor: 'grey.300',
                          color: 'text.secondary',
                          '&:hover': {
                            borderColor: 'grey.400',
                            backgroundColor: 'grey.100',
                          },
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleGuardar}
                        size="large"
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 4,
                          py: 1.5,
                          boxShadow: 'none',
                          '&:hover': {
                            boxShadow: 2,
                          },
                        }}
                      >
                        Guardar cambios
                      </Button>
                    </Stack>
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Modal para crear nuevo rol */}
          <Dialog
            open={modalAbierto}
            onClose={handleCerrarModal}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                minHeight: '70vh'
              }
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AddIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Crear Nuevo Rol
                  </Typography>
                </Stack>
                <IconButton onClick={handleCerrarModal} size="small">
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Define un nuevo rol personalizado con sus permisos específicos
              </Typography>
            </DialogTitle>

            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={4}>
                {/* Información básica */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Información Básica
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Nombre del Rol"
                        value={nuevoRol.nombre}
                        onChange={(e) => handleCambioNuevoRol('nombre', e.target.value)}
                        placeholder="Ej: Marketing"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Descripción"
                        value={nuevoRol.descripcion}
                        onChange={(e) => handleCambioNuevoRol('descripcion', e.target.value)}
                        placeholder="Breve descripción del rol"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Apariencia */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Apariencia
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Ícono</InputLabel>
                        <Select
                          value={nuevoRol.icono}
                          label="Ícono"
                          onChange={(e) => handleCambioNuevoRol('icono', e.target.value)}
                          sx={{ borderRadius: 2 }}
                        >
                          {iconosDisponibles.map((icono) => (
                            <MenuItem key={icono.id} value={icono.id}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                {icono.icon}
                                <Typography>{icono.label}</Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Color</InputLabel>
                        <Select
                          value={nuevoRol.color}
                          label="Color"
                          onChange={(e) => handleCambioNuevoRol('color', e.target.value)}
                          sx={{ borderRadius: 2 }}
                        >
                          {coloresDisponibles.map((color) => (
                            <MenuItem key={color.id} value={color.color}>
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    bgcolor: `${color.color}.main`
                                  }}
                                />
                                <Typography>{color.label}</Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Permisos */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Permisos del Rol
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Selecciona los permisos que tendrá este rol
                  </Typography>
                  
                  <FormGroup>
                    <Grid container spacing={2}>
                      {todosLosPermisos.map((permiso) => (
                        <Grid item xs={12} sm={6} md={4} key={permiso.id}>
                          <Paper
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              backgroundColor: nuevoRol.permisos.includes(permiso.label) 
                                ? 'primary.50' 
                                : 'grey.50',
                              border: '1px solid',
                              borderColor: nuevoRol.permisos.includes(permiso.label)
                                ? 'primary.200'
                                : 'grey.200',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: 1,
                              },
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={nuevoRol.permisos.includes(permiso.label)}
                                  onChange={() => handleTogglePermisoNuevoRol(permiso.label)}
                                  sx={{
                                    '&.Mui-checked': {
                                      color: 'primary.main',
                                    },
                                  }}
                                />
                              }
                              label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Box sx={{ color: 'text.secondary' }}>
                                    {permiso.icon}
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: nuevoRol.permisos.includes(permiso.label) ? 600 : 400,
                                      color: 'text.primary'
                                    }}
                                  >
                                    {permiso.label}
                                  </Typography>
                                </Stack>
                              }
                              sx={{
                                m: 0,
                                width: '100%',
                                '& .MuiFormControlLabel-label': {
                                  flex: 1,
                                },
                              }}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>

                  {/* Contador de permisos seleccionados */}
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Chip
                      label={`${nuevoRol.permisos.length} permisos seleccionados / ${nuevoRol.reportes.length} reportes`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Grid>

                {/* Reportes */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Reportes habilitados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Indicá qué reportes avanzados podrán consultar las personas con este rol.
                  </Typography>
                  <FormGroup>
                    <Grid container spacing={2}>
                      {reportPermissions.map((reporte) => (
                        <Grid item xs={12} sm={6} key={reporte.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={nuevoRol.reportes.includes(reporte.id)}
                                onChange={() => handleToggleListaNuevoRol('reportes', reporte.id)}
                                sx={{ '&.Mui-checked': { color: 'secondary.main' } }}
                              />
                            }
                            label={reporte.label}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </Grid>

                {/* Emprendimientos */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Emprendimientos habilitados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Estos códigos se usarán como límite al asignar usuarios desde el formulario.
                  </Typography>
                  <FormGroup>
                    <Grid container spacing={2}>
                      {emprendimientosOficiales.map((emprendimiento) => (
                        <Grid item xs={12} sm={6} md={4} key={emprendimiento.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={nuevoRol.emprendimientosDisponibles.includes(emprendimiento.id)}
                                onChange={() => handleToggleListaNuevoRol('emprendimientosDisponibles', emprendimiento.id)}
                              />
                            }
                            label={`${emprendimiento.id} - ${emprendimiento.label}`}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </Grid>

                {/* Gremios */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Gremios disponibles
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Limita qué gremios puede seleccionar un usuario al recibir este rol.
                  </Typography>
                  <FormGroup>
                    <Grid container spacing={2}>
                      {gremiosOficiales.map((gremio) => (
                        <Grid item xs={12} sm={6} md={4} key={gremio.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={nuevoRol.gremiosDisponibles.includes(gremio.id)}
                                onChange={() => handleToggleListaNuevoRol('gremiosDisponibles', gremio.id)}
                              />
                            }
                            label={gremio.label}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button
                onClick={handleCerrarModal}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearRol}
                variant="contained"
                disabled={!nuevoRol.nombre.trim()}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  fontWeight: 600,
                }}
              >
                Crear Rol
              </Button>
            </DialogActions>
          </Dialog>

          {/* Menú de opciones de rol */}
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleCerrarMenu}
            PaperProps={{
              sx: {
                borderRadius: 2,
                minWidth: 180,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }
            }}
          >
            <MenuItem onClick={handleEditarRol} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <EditNoteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Editar Rol</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleToggleActivoRol} sx={{ py: 1.5 }}>
              <ListItemIcon>
                {rolMenuSeleccionado?.activo ? 
                  <ToggleOffIcon fontSize="small" /> : 
                  <ToggleOnIcon fontSize="small" />
                }
              </ListItemIcon>
              <ListItemText>
                {rolMenuSeleccionado?.activo ? 'Desactivar' : 'Activar'}
              </ListItemText>
            </MenuItem>
          </Menu>

          {/* Modal para editar rol */}
          <Dialog
            open={modalEdicionAbierto}
            onClose={handleCerrarModalEdicion}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3
              }
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <EditNoteIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Editar Rol
                  </Typography>
                </Stack>
                <IconButton onClick={handleCerrarModalEdicion} size="small">
                  <CloseIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Modifica la información básica del rol personalizado
              </Typography>
            </DialogTitle>

            <DialogContent sx={{ py: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nombre del Rol"
                    value={rolEditando?.nombre || ''}
                    onChange={(e) => handleCambioRolEditando('nombre', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    value={rolEditando?.descripcion || ''}
                    onChange={(e) => handleCambioRolEditando('descripcion', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ícono</InputLabel>
                    <Select
                      value={rolEditando?.icono || 'person'}
                      label="Ícono"
                      onChange={(e) => handleCambioRolEditando('icono', e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {iconosDisponibles.map((icono) => (
                        <MenuItem key={icono.id} value={icono.id}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            {icono.icon}
                            <Typography>{icono.label}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Color</InputLabel>
                    <Select
                      value={rolEditando?.color || 'primary'}
                      label="Color"
                      onChange={(e) => handleCambioRolEditando('color', e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      {coloresDisponibles.map((color) => (
                        <MenuItem key={color.id} value={color.color}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: `${color.color}.main`
                              }}
                            />
                            <Typography>{color.label}</Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button
                onClick={handleCerrarModalEdicion}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardarEdicionRol}
                variant="contained"
                disabled={!rolEditando?.nombre?.trim()}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  fontWeight: 600,
                }}
              >
                Guardar Cambios
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </LoteParaTodosLayout>
    </>
  );
};

export default ConfiguradorRolesPage;