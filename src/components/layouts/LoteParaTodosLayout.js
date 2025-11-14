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
  Assignment as AssignmentIcon,
  Landscape as LandscapeIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  ArrowDropDown as ArrowDropDownIcon
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
  emprendimientos: {
    title: 'Emprendimientos',
    icon: BusinessIcon,
    path: '/loteParaTodosMock/emprendimientos',
    description: 'Configuración y administración de emprendimientos'
  },
  lotes: {
    title: 'Lotes',
    icon: LandscapeIcon,
    path: '/loteParaTodosMock/lotes',
    description: 'Gestión operativa de lotes'
  },
  clientes: {
    title: 'Clientes',
    icon: PersonIcon,
    path: '/loteParaTodosMock/clientes',
    description: 'Gestión de clientes y prospectos'
  },
  contratos: {
    title: 'Contratos',
    icon: AssignmentIcon,
    path: '/loteParaTodosMock/contratos',
    description: 'Administración de contratos y pagos'
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

  const getCurrentModule = () => {
    if (currentModule) return currentModule;
    
    const path = router.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/clientes')) return 'clientes';
    if (path.includes('/contratos')) return 'contratos';
    if (path.includes('/lotes')) return 'lotes';
    if (path.includes('/usuarios') || path.includes('/configurador-roles') || path.includes('/emprendimientos')) return 'configuracion';
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
                // Skip configuracion, usuarios, and emprendimientos from direct nav
                if (key === 'configuracion' || key === 'usuarios' || key === 'emprendimientos') return null;
                
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
              Configuración de roles y permisos
            </Typography>
          </ListItemText>
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem 
          onClick={() => handleConfigMenuItemClick('/loteParaTodosMock/emprendimientos')}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <BusinessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Emprendimientos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configuración de emprendimientos
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LoteParaTodosLayout;