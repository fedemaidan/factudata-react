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
  Chip
} from '@mui/material';
import { 
  Home as HomeIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Landscape as LandscapeIcon,
  Business as BusinessIcon
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
  lotes: {
    title: 'Lotes',
    icon: LandscapeIcon,
    path: '/loteParaTodosMock/lotes',
    description: 'Gestión de lotes y emprendimientos'
  }
};

const LoteParaTodosLayout = ({ children, currentModule, pageTitle }) => {
  const router = useRouter();

  const getCurrentModule = () => {
    if (currentModule) return currentModule;
    
    const path = router.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/clientes')) return 'clientes';
    if (path.includes('/contratos')) return 'contratos';
    if (path.includes('/lotes')) return 'lotes';
    return 'dashboard'; // default
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
    </Box>
  );
};

export default LoteParaTodosLayout;