// src/components/layouts/LoteParaTodosLayout.js
import React from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container,
  Breadcrumbs,
  Link,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Home as HomeIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  ArrowDropDown as ArrowDropDownIcon,
  MonetizationOn as SalesIcon,
  Assignment as AssignmentIcon,
  AccountBalance as BankIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import NextLink from 'next/link';

const moduleConfig = {
  dashboard: {
    title: 'Dashboard',
    icon: BusinessIcon,
    path: '/loteParaTodosMock/dashboard',
    description: 'Resumen general y métricas principales'
  },
  ventas: {
    title: 'Ventas',
    icon: SalesIcon,
    path: '/loteParaTodosMock/ventas',
    description: 'Catálogo y gestión de reservas'
  },
  clientes: {
    title: 'Clientes & Contratos',
    icon: PersonIcon,
    path: '/loteParaTodosMock/clientes',
    description: 'Gestión de clientes y prospectos'
  },
  tesoreria: {
    title: 'Tesorería',
    icon: BankIcon,
    path: '/loteParaTodosMock/tesoreria',
    description: 'Cajas, bancos y movimientos'
  },
  configuracion: {
    title: 'Configuración',
    icon: SettingsIcon,
    path: '/loteParaTodosMock/configuracion',
    description: 'Configuración del sistema y administración'
  },
  usuarios: {
    title: 'Usuarios',
    icon: PeopleIcon,
    path: '/loteParaTodosMock/usuarios',
    description: 'Gestión de usuarios del sistema'
  }
};

const LoteParaTodosLayout = ({ children, currentModule, pageTitle }) => {
  const router = useRouter();
  const [configMenuAnchor, setConfigMenuAnchor] = React.useState(null);
  const [ventasMenuAnchor, setVentasMenuAnchor] = React.useState(null);
  const [tesoreriaMenuAnchor, setTesoreriaMenuAnchor] = React.useState(null);

  const getCurrentModule = () => {
    if (currentModule) return currentModule;
    
    const path = router.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/ventas')) return 'ventas';
    if (path.includes('/clientes') || path.includes('/contratos')) return 'clientes';
    if (path.includes('/tesoreria')) return 'tesoreria';
    if (path.includes('/emprendimientos')) return 'emprendimientos';
    if (path.includes('/usuarios') || path.includes('/configurador-roles')) return 'configuracion';
    return 'dashboard'; // default
  };

  const handleConfigMenuOpen = (event) => {
    setConfigMenuAnchor(event.currentTarget);
  };

  const handleConfigMenuClose = () => {
    setConfigMenuAnchor(null);
  };

  const handleConfigMenuItemClick = (path) => {
    router.push(path);
    handleConfigMenuClose();
  };

  const handleVentasMenuOpen = (event) => {
    setVentasMenuAnchor(event.currentTarget);
  };

  const handleVentasMenuClose = () => {
    setVentasMenuAnchor(null);
  };

  const handleVentasMenuItemClick = (path) => {
    router.push(path);
    handleVentasMenuClose();
  };

  const handleTesoreriaMenuOpen = (event) => {
    setTesoreriaMenuAnchor(event.currentTarget);
  };

  const handleTesoreriaMenuClose = () => {
    setTesoreriaMenuAnchor(null);
  };

  const handleTesoreriaMenuItemClick = (path) => {
    router.push(path);
    handleTesoreriaMenuClose();
  };

  const activeModule = getCurrentModule();
  const ActiveIcon = moduleConfig[activeModule]?.icon || BusinessIcon;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header/Navigation */}
      <AppBar 
        position="static" 
        elevation={1}
        sx={{ 
          backgroundColor: '#1976d2',
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <BusinessIcon sx={{ mr: 2, fontSize: 28 }} />
            <Typography variant="h6" sx={{ mr: 4, fontWeight: 600 }}>
              Lote Para Todos
            </Typography>
            
            {/* Module Navigation */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {Object.entries(moduleConfig).map(([key, config]) => {
                // Skip configuracion, usuarios, emprendimientos AND ventas from direct nav
                if (key === 'configuracion' || key === 'usuarios' || key === 'emprendimientos' || key === 'ventas' || key === 'tesoreria') return null;
                
                const isActive = key === activeModule;
                const ModuleIcon = config.icon;
                
                return (
                  <Button
                    key={key}
                    component={NextLink}
                    href={config.path}
                    variant={isActive ? "contained" : "outlined"}
                    startIcon={<ModuleIcon />}
                    sx={{
                      color: isActive ? 'white' : 'rgba(255,255,255,0.8)',
                      borderColor: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: 'white'
                      }
                    }}
                  >
                    {config.title}
                  </Button>
                );
              })}

              {/* Ventas Dropdown Menu */}
              <Button
                onClick={handleVentasMenuOpen}
                variant={activeModule === 'ventas' ? "contained" : "outlined"}
                startIcon={<SalesIcon />}
                endIcon={<ArrowDropDownIcon />}
                sx={{
                  color: activeModule === 'ventas' ? 'white' : 'rgba(255,255,255,0.8)',
                  borderColor: activeModule === 'ventas' ? 'white' : 'rgba(255,255,255,0.3)',
                  backgroundColor: activeModule === 'ventas' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Ventas
              </Button>

              {/* Tesorería Dropdown Menu */}
              <Button
                onClick={handleTesoreriaMenuOpen}
                variant={activeModule === 'tesoreria' ? "contained" : "outlined"}
                startIcon={<BankIcon />}
                endIcon={<ArrowDropDownIcon />}
                sx={{
                  color: activeModule === 'tesoreria' ? 'white' : 'rgba(255,255,255,0.8)',
                  borderColor: activeModule === 'tesoreria' ? 'white' : 'rgba(255,255,255,0.3)',
                  backgroundColor: activeModule === 'tesoreria' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Tesorería
              </Button>
              
              {/* Configuración Dropdown Menu */}
              <Button
                onClick={handleConfigMenuOpen}
                variant={activeModule === 'configuracion' ? "contained" : "outlined"}
                startIcon={<SettingsIcon />}
                endIcon={<ArrowDropDownIcon />}
                sx={{
                  color: activeModule === 'configuracion' ? 'white' : 'rgba(255,255,255,0.8)',
                  borderColor: activeModule === 'configuracion' ? 'white' : 'rgba(255,255,255,0.3)',
                  backgroundColor: activeModule === 'configuracion' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                Configuración
              </Button>
            </Box>
          </Box>

          <Button
            component={NextLink}
            href="/"
            startIcon={<HomeIcon />}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { color: 'white' }
            }}
          >
            Dashboard Principal
          </Button>
        </Toolbar>
      </AppBar>

      {/* Module Info Bar */}
      <Box 
        sx={{ 
          backgroundColor: '#f5f5f5', 
          py: 1,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<ActiveIcon />}
                label={`Módulo: ${moduleConfig[activeModule]?.title || 'Lote Para Todos'}`}
                variant="filled"
                color="primary"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {moduleConfig[activeModule]?.description || 'Sistema de gestión inmobiliaria'}
              </Typography>
            </Box>
            
            {pageTitle && (
              <Typography variant="h6" color="primary" sx={{ fontWeight: 500 }}>
                {pageTitle}
              </Typography>
            )}
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>

      {/* Footer */}
      <Box 
        sx={{ 
          backgroundColor: '#f8f9fa', 
          py: 2, 
          mt: 'auto',
          borderTop: '1px solid #e0e0e0'
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 Lote Para Todos - Sistema de Gestión Inmobiliaria
          </Typography>
        </Container>
      </Box>

      {/* Menu de Configuración */}
      <Menu
        anchorEl={configMenuAnchor}
        open={Boolean(configMenuAnchor)}
        onClose={handleConfigMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            mt: 1
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem 
          onClick={() => handleConfigMenuItemClick('/loteParaTodosMock/usuarios')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <PeopleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Usuarios
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gestión de usuarios del sistema
            </Typography>
          </ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleConfigMenuItemClick('/loteParaTodosMock/configurador-roles')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <SecurityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Roles y Permisos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configuración de accesos
            </Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem 
          onClick={() => handleConfigMenuItemClick('/loteParaTodosMock/configuracion')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Configuración del Sistema
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Plantillas y parámetros generales
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Menu de Ventas */}
      <Menu
        anchorEl={ventasMenuAnchor}
        open={Boolean(ventasMenuAnchor)}
        onClose={handleVentasMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            mt: 1
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem 
          onClick={() => handleVentasMenuItemClick('/loteParaTodosMock/ventas')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Catálogo de Lotes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ver disponibilidad y precios
            </Typography>
          </ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleVentasMenuItemClick('/loteParaTodosMock/ventas/contratos')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <SalesIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Gestión de Reservas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Administrar señas y contratos
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Menu de Tesorería */}
      <Menu
        anchorEl={tesoreriaMenuAnchor}
        open={Boolean(tesoreriaMenuAnchor)}
        onClose={handleTesoreriaMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 240,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            mt: 1
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem 
          onClick={() => handleTesoreriaMenuItemClick('/loteParaTodosMock/tesoreria')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <BankIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Cajas y Bancos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Saldos y movimientos generales
            </Typography>
          </ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem 
          onClick={() => handleTesoreriaMenuItemClick('/loteParaTodosMock/tesoreria')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <ReceiptIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Movimientos Admin.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gastos e ingresos varios
            </Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={() => handleTesoreriaMenuItemClick('/loteParaTodosMock/tesoreria/conciliacion')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Conciliación Bancaria
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Control de extractos
            </Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem 
          onClick={() => handleTesoreriaMenuItemClick('/loteParaTodosMock/tesoreria/cashflow')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <TrendingUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Proyecciones & Cash Flow
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Flujo de fondos futuro
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LoteParaTodosLayout;