import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/solid/ArrowTopRightOnSquareIcon';
import ChevronUpDownIcon from '@heroicons/react/24/solid/ChevronUpDownIcon';
import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
  useMediaQuery
} from '@mui/material';
import { Logo } from 'src/components/logo';
import { Scrollbar } from 'src/components/scrollbar';
// import { items } from './config';
import { SideNavItem } from './side-nav-item';
import { useAuthContext } from 'src/contexts/auth-context';
import { getProyectosFromUser } from 'src/services/proyectosService'; 
import { getEmpresaDetailsFromUser } from 'src/services/empresaService'; 
import { SvgIcon } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CogIcon from '@heroicons/react/24/solid/CogIcon';
import UserPlusIcon from '@heroicons/react/24/solid/UserPlusIcon';
import InventoryIcon from '@mui/icons-material/Inventory';

export const SideNav = (props) => {
  const { open, onClose } = props;
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const { user } = useAuthContext();
  const [items, setItems] = useState([])
  const [proyectos, setProyectos] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  useEffect( () => {
    const fetchProyectosData = async () => {
      
      const empresa = await getEmpresaDetailsFromUser(user)

      if (user.email == "nico@mail.com") {
          const productosElement = {
            title: 'Productos',
            path: '/productos',
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            )
          }

          const ofertasElement = {
            title: 'Ofertas',
            path: '/ofertas',
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            )
          }

          const principiosActivosElement = {
            title: 'Principios Activos',
            path: '/principiosActivos',
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            )
          }

          setItems([productosElement, ofertasElement, principiosActivosElement])
      }
      else if (!empresa) {
        const onboardingPage = {
          title: 'Onboarding',
          path: '/onboarding',
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          )
        }

        setItems([onboardingPage])
      }
      else if (empresa.tipo == "Logistica") {
        const hojasDeRutaPage = {
          title: 'Hojas de ruta',
          path: '/hojasDeRuta?empresaId=' + empresa.id,
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          )
        }

        setItems([hojasDeRutaPage])
      } else {
        let proyectos = await getProyectosFromUser(user)
        proyectos = proyectos.filter(proyecto => proyecto.activo);
        setProyectos(proyectos)
        const hasPermisosOcultos = user.permisosOcultos ? true : false;

        let newItems = [{
          title: "Cuenta ",
          path: 'account',
          icon: (
            <SvgIcon fontSize="small">
              <UserPlusIcon />
            </SvgIcon>
          )
        }];
        
        if (user.admin) {
            newItems.push({
              title: "Configurar " + empresa.nombre,
              path: 'empresa?empresaId=' + empresa.id,
              icon: (
                <SvgIcon fontSize="small">
                  <CogIcon />
                </SvgIcon>
              )
            })
        }

        if (!hasPermisosOcultos || !user.permisosOcultos.includes('VER_NOTAS_DE_PEDIDO')) {
          newItems.push({
            title: 'Notas de pedido',
            path: '/notaPedido',
            icon: (
              <SvgIcon fontSize="small">
                <NoteAltIcon />
              </SvgIcon>
            )
          })
        }

        if (!hasPermisosOcultos || !user.permisosOcultos.includes('CREAR_ACOPIO')) {
          newItems.push({
            title: 'Acopio',
            path: '/acopios?empresaId=' + empresa.id,
            icon: (
              <SvgIcon fontSize="small">
                <InventoryIcon />
              </SvgIcon>
            )
          })
        }
        
        if (!hasPermisosOcultos || !user.permisosOcultos.includes('VER_MI_CAJA_CHICA')) {
          newItems.push({
            title: 'Caja Chica',
            path: '/cajaChica',
            icon: (
              <SvgIcon fontSize="small">
                <AttachMoneyIcon />
              </SvgIcon>
            )
          })
        }
        
        if (!hasPermisosOcultos || !user.permisosOcultos.includes('VER_CAJAS')) {

          newItems.push({
            title: 'Ver cajas chicas',
            path: '/perfilesEmpresa',
            icon: (
              <SvgIcon fontSize="small">
                <AttachMoneyIcon />
              </SvgIcon>
            )
          })
        
          
          const vistaGeneralElement = {
            title: 'Vista 7 días',
            path: '/resumenMovimientos?empresaId=' + empresa.id,
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            )
          }
  
          const vistaTodosLosMovElement = {
            title: 'Todos los movimientos',
            path: '/todosProyectos?empresaId=' + empresa.id,
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            )
          }
          newItems = [vistaGeneralElement, vistaTodosLosMovElement, ...newItems];
            const cajasProyectoItems = proyectos.map((proy) => ({
            title: proy.nombre,
            path: 'cajaProyecto?proyectoId=' + proy.id,
            icon: (
              <SvgIcon fontSize="small" sx={{ color: proy.activo ? 'green' : 'grey' }}>
                <StoreIcon />
              </SvgIcon>
            )
          }));
          
          newItems = [...newItems, ...cajasProyectoItems]; 
        }

        const odooIntegration = {
          title: 'Integración con Odoo',
          path: '/odooIntegracion?empresaId=' + empresa.id,
          icon: (
            <SvgIcon fontSize="small">
              <NoteAltIcon />
            </SvgIcon>
          )
        }
        
        newItems.push(odooIntegration)
        setItems(newItems)
      }
    };

    fetchProyectosData();
    
  }, [user]);

  const content = (
    <Scrollbar
      sx={{
        height: '100%',
        '& .simplebar-content': {
          height: '100%'
        },
        '& .simplebar-scrollbar:before': {
          background: 'neutral.400'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box
            component={NextLink}
            href="/"
            sx={{
              display: 'inline-flex',
              height: 32,
              width: 32
            }}
          >
            <Logo />
          </Box>
          <Box
            sx={{
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              mt: 2,
              p: '12px'
            }}
          >
            <div>
              <Typography
                color="inherit"
                variant="subtitle1"
              >
                Sorbydata
              </Typography>
              <Typography
                color="neutral.400"
                variant="body2"
              >
                {/* Aceleramos  */}
              </Typography>
            </div>
            <SvgIcon
              fontSize="small"
              sx={{ color: 'neutral.500' }}
            >
              <ChevronUpDownIcon />
            </SvgIcon>
          </Box>
        </Box>
        <Divider sx={{ borderColor: 'neutral.700' }} />
        <Box
          component="nav"
          sx={{
            flexGrow: 1,
            px: 2,
            py: 3
          }}
        >
          <Stack
            component="ul"
            spacing={0.5}
            sx={{
              listStyle: 'none',
              p: 0,
              m: 0
            }}
          >
            {items.map((item) => {
              const active = item.path ? (pathname === item.path) : false;

              return (
                <SideNavItem
                  active={active}
                  disabled={item.disabled}
                  external={item.external}
                  icon={item.icon}
                  key={item.title}
                  path={item.path}
                  title={item.title}
                />
              );
            })}
          </Stack>
        </Box>
        <Divider sx={{ borderColor: 'neutral.700' }} />
        <Box
          sx={{
            px: 2,
            py: 3
          }}
        >
         
          <Box
            sx={{
              display: 'flex',
              mt: 2,
              mx: 'auto',
              width: '160px',
              '& img': {
                width: '100%'
              }
            }}
          >
            <img
              alt="Go to pro"
              src="/assets/devias-kit-pro.png"
            />
          </Box>
          
        </Box>
      </Box>
    </Scrollbar>
  );

  if (lgUp) {
    return (
      <Drawer
        anchor="left"
        onClose={onClose}
        open={open}
        PaperProps={{
          sx: {
            backgroundColor: 'neutral.800',
            color: 'common.white',
            width: 280
          }
        }}
        variant="permanent"
        //variant="temporary" si queremos jugar con que sea más flexible
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="left"
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          backgroundColor: 'neutral.800',
          color: 'common.white',
          width: 280
        }
      }}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 100 }}
      variant="temporary"
    >
      {content}
    </Drawer>
  );
};

SideNav.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool
};
