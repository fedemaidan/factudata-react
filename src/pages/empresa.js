import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Stack, 
  Typography, 
  TextField, 
  Button,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Skeleton,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Layout as DashboardLayout } from 'src/layouts/dashboard/layout';
import { ProyectosDetails } from 'src/sections/empresa/proyectosDetails';
import { CategoriasDetails } from 'src/sections/empresa/categoriasDetails';
import { ProveedoresDetails } from 'src/sections/empresa/proveedoresDetails';
import { UsuariosDetails } from 'src/sections/empresa/usuariosDetails';
import { MediosPagoDetails } from 'src/sections/empresa/mediosPagoDetails';
import { ImpuestosDetails } from 'src/sections/empresa/impuestosDetails';
import { ConfiguracionGeneral } from 'src/sections/empresa/configuracionGeneral';
import { updateEmpresaDetails, getEmpresaById, invalidateEmpresaCache } from 'src/services/empresaService'; 
import { getProyectosByEmpresa, hasPermission } from 'src/services/proyectosService'; 
import { useAuthContext } from 'src/contexts/auth-context';
import { useBreadcrumbs } from 'src/contexts/breadcrumbs-context';
import { useRouter } from 'next/router';
import { PermisosUsuarios } from 'src/sections/empresa/PermisosUsuarios';
import { EtapasDetails } from 'src/sections/empresa/etapasDetails';
import { SubEmpresasDetails } from 'src/sections/empresa/subEmpresasDetails';
import { ObrasDetails } from 'src/sections/empresa/obrasDetails';
import { CategoriasMaterialesDetails } from 'src/sections/empresa/categoriasMaterialesDetails';

// Icons
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CachedIcon from '@mui/icons-material/Cached';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import CategoryIcon from '@mui/icons-material/Category';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TimelineIcon from '@mui/icons-material/Timeline';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import ConstructionIcon from '@mui/icons-material/Construction';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';


const EmpresaPage = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const { setBreadcrumbs } = useBreadcrumbs();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [currentTab, setCurrentTab] = useState('');
  const [empresa, setEmpresa] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const { empresaId } = router.query;

  // Setear breadcrumbs cuando cambia la empresa
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Inicio', href: '/', icon: <HomeIcon fontSize="small" /> },
      { label: 'Empresas', href: '/empresas', icon: <BusinessIcon fontSize="small" /> },
      { label: empresa?.nombre || 'Cargando...', icon: <BusinessIcon fontSize="small" /> }
    ]);
    
    // Limpiar breadcrumbs al desmontar
    return () => setBreadcrumbs([]);
  }, [empresa?.nombre, setBreadcrumbs]); 

  // Tabs principales (siempre visibles)
  const mainTabs = [
    { value: 'categorias', label: 'Categorías', icon: <CategoryIcon /> },
    { value: 'proyectos', label: 'Proyectos', icon: <FolderIcon /> },
    { value: 'proveedores', label: 'Proveedores', icon: <LocalShippingIcon /> },
    { value: 'usuarios', label: 'Usuarios', icon: <PeopleIcon /> },
  ];

  // Tabs secundarios (en menú "Más")
  const moreTabs = [
    { value: 'sub_empresas', label: 'SubEmpresas', icon: <CorporateFareIcon /> },
    { value: 'categorias_materiales', label: 'Categorías Materiales', icon: <InventoryIcon /> },
    { value: 'etapas', label: 'Etapas', icon: <TimelineIcon /> },
    { value: 'medios_pago', label: 'Medios de Pago', icon: <PaymentIcon /> },
    { value: 'impuestos', label: 'Impuestos', icon: <ReceiptIcon /> },
    { value: 'obras', label: 'Obras', icon: <ConstructionIcon /> },
    { value: 'configuracion', label: 'Configuración', icon: <SettingsIcon /> },
    { value: 'permisos', label: 'Permisos', icon: <SecurityIcon /> },
  ];

  // Verificar si el tab actual está en "más"
  const currentTabInMore = moreTabs.find(t => t.value === currentTab);
  const moreMenuOpen = Boolean(moreMenuAnchor);

  useEffect(() => {
    const fetchEmpresaData = async () => {
      setIsLoading(true);
      try {
        const empresa = await getEmpresaById(empresaId);
        console.log(empresa);
        setEmpresa(empresa);
        setCurrentTab('categorias');
      } finally {
        setIsLoading(false);
      }
    };

    if (empresaId) {
      fetchEmpresaData();
    }
  }, [user, empresaId]);

  const handleTabChange = (value) => {
    setCurrentTab(value);
    setMoreMenuAnchor(null);
  };

  const handleMoreMenuOpen = (event) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    const updated = await updateEmpresaDetails(empresa.id, { nombre: empresa.nombre });
    if (updated) {
      console.log('Nombre de la empresa actualizado correctamente');
    } else {
      console.error('Error al actualizar el nombre de la empresa');
    }
    setIsEditing(false);
  };

  const handleChange = (event) => {
    const updatedEmpresa = { ...empresa, nombre: event.target.value };
    setEmpresa(updatedEmpresa);
  };

  const handleInvalidateCache = async () => {
    if (empresa?.id) {
      const success = await invalidateEmpresaCache(empresa.id);
      if (success) {
        alert('Caché invalidado correctamente');
      } else {
        alert('Error al invalidar caché');
      }
    }
  };

  return (
    <>
      <Head>
        <title>{empresa?.nombre || 'Empresa'} | Configuración</title>
      </Head>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 2, sm: 4, md: 6 }
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <Stack spacing={{ xs: 2, sm: 3 }}>
            {/* Header Card */}
            <Card 
              elevation={0}
              sx={{ 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.background.paper} 100%)`
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {isLoading ? (
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={56} height={56} />
                    <Stack spacing={1} flex={1}>
                      <Skeleton variant="text" width="40%" height={32} />
                      <Skeleton variant="text" width="20%" height={24} />
                    </Stack>
                  </Stack>
                ) : isEditing ? (
                  <Stack spacing={2}>
                    <TextField
                      label="Nombre de la Empresa"
                      value={empresa?.nombre || ''}
                      onChange={handleChange}
                      variant="outlined"
                      fullWidth
                      autoFocus
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        color="primary"
                        variant="contained"
                        onClick={handleSave}
                        startIcon={<SaveIcon />}
                      >
                        Guardar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    justifyContent="space-between" 
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar 
                        sx={{ 
                          width: { xs: 48, sm: 56 }, 
                          height: { xs: 48, sm: 56 }, 
                          bgcolor: theme.palette.primary.main,
                          fontSize: { xs: '1.25rem', sm: '1.5rem' }
                        }}
                      >
                        {empresa?.nombre?.charAt(0)?.toUpperCase() || 'E'}
                      </Avatar>
                      <Stack spacing={0.5}>
                        <Typography
                          variant="h4"
                          sx={{
                            fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2rem' },
                            fontWeight: 600
                          }}
                        >
                          {empresa?.nombre}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip 
                            label={`ID: ${empresa?.id}`} 
                            size="small" 
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.75rem' }}
                          />
                          {empresa?.cuit && (
                            <Chip 
                              label={`CUIT: ${empresa.cuit}`} 
                              size="small" 
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.75rem' }}
                            />
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                    
                    <Stack direction="row" spacing={1}>
                      {isMobile ? (
                        <>
                          <Tooltip title="Invalidar Caché">
                            <IconButton 
                              color="warning" 
                              onClick={handleInvalidateCache}
                              size="small"
                              sx={{ border: `1px solid ${theme.palette.warning.main}` }}
                            >
                              <CachedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar nombre">
                            <IconButton 
                              color="primary" 
                              onClick={handleEdit}
                              size="small"
                              sx={{ border: `1px solid ${theme.palette.primary.main}` }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Button
                            color="warning"
                            variant="outlined"
                            onClick={handleInvalidateCache}
                            startIcon={<CachedIcon />}
                            size={isTablet ? 'small' : 'medium'}
                          >
                            Invalidar Caché
                          </Button>
                          <Button
                            color="primary"
                            variant="outlined"
                            onClick={handleEdit}
                            startIcon={<EditIcon />}
                            size={isTablet ? 'small' : 'medium'}
                          >
                            Editar nombre
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Navigation Chips */}
            {!isLoading && (
              <Box 
                sx={{ 
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center'
                }}
              >
                {/* Tabs principales */}
                {mainTabs.map((tab) => (
                  <Chip
                    key={tab.value}
                    icon={tab.icon}
                    label={isMobile ? undefined : tab.label}
                    onClick={() => handleTabChange(tab.value)}
                    color={currentTab === tab.value ? 'primary' : 'default'}
                    variant={currentTab === tab.value ? 'filled' : 'outlined'}
                    sx={{
                      px: isMobile ? 0 : 1,
                      '& .MuiChip-icon': {
                        ml: isMobile ? 1 : undefined,
                        mr: isMobile ? -0.5 : undefined
                      },
                      fontWeight: currentTab === tab.value ? 600 : 400,
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      }
                    }}
                  />
                ))}

                {/* Si hay un tab de "más" seleccionado, mostrarlo como chip */}
                {currentTabInMore && (
                  <Chip
                    icon={currentTabInMore.icon}
                    label={isMobile ? undefined : currentTabInMore.label}
                    color="primary"
                    variant="filled"
                    onDelete={() => handleTabChange('categorias')}
                    sx={{
                      px: isMobile ? 0 : 1,
                      fontWeight: 600
                    }}
                  />
                )}

                {/* Botón "Más" */}
                <Chip
                  icon={<MoreHorizIcon />}
                  label={isMobile ? undefined : 'Más'}
                  onClick={handleMoreMenuOpen}
                  variant="outlined"
                  sx={{
                    px: isMobile ? 0 : 1,
                    '& .MuiChip-icon': {
                      ml: isMobile ? 1 : undefined,
                      mr: isMobile ? -0.5 : undefined
                    },
                    borderStyle: 'dashed',
                    '&:hover': {
                      borderStyle: 'solid',
                      bgcolor: 'action.hover'
                    }
                  }}
                />

                {/* Menú desplegable */}
                <Menu
                  anchorEl={moreMenuAnchor}
                  open={moreMenuOpen}
                  onClose={handleMoreMenuClose}
                  PaperProps={{
                    sx: {
                      maxHeight: 320,
                      minWidth: 220
                    }
                  }}
                >
                  {moreTabs.map((tab) => (
                    <MenuItem 
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      selected={currentTab === tab.value}
                    >
                      <ListItemIcon sx={{ color: currentTab === tab.value ? 'primary.main' : 'inherit' }}>
                        {tab.icon}
                      </ListItemIcon>
                      <ListItemText>{tab.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}

            {/* Content Area */}
            {isLoading ? (
              <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 3 }}>
                <Stack spacing={2}>
                  <Skeleton variant="rectangular" height={60} />
                  <Skeleton variant="rectangular" height={200} />
                </Stack>
              </Card>
            ) : (
              <>
                {currentTab === 'sub_empresas' && <SubEmpresasDetails empresa={empresa}/>}
                {currentTab === 'usuarios' && <UsuariosDetails empresa={empresa}/>}
                {currentTab === 'proyectos' && <ProyectosDetails empresa={empresa}/>} 
                {currentTab === 'categorias' && <CategoriasDetails empresa={empresa}/>}
                {currentTab === 'categorias_materiales' && <CategoriasMaterialesDetails empresa={empresa}/>}
                {currentTab === 'proveedores' && <ProveedoresDetails empresa={empresa}/>}
                {currentTab === 'etapas' && <EtapasDetails empresa={empresa} />} 
                {currentTab === 'configuracion' && <ConfiguracionGeneral empresa={empresa} updateEmpresaData={updateEmpresaDetails} hasPermission={hasPermission}/>}
                {currentTab === 'permisos' && <PermisosUsuarios empresa={empresa} />}
                {currentTab === 'medios_pago' && <MediosPagoDetails empresa={empresa} />}
                {currentTab === 'impuestos' && <ImpuestosDetails empresa={empresa} />}
                {currentTab === 'obras' && <ObrasDetails empresa={empresa} />}
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

EmpresaPage.getLayout = (page) => (
  <DashboardLayout>
    {page}
  </DashboardLayout>
);

export default EmpresaPage;
