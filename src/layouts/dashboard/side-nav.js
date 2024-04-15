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
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CogIcon from '@heroicons/react/24/solid/CogIcon';
import UserPlusIcon from '@heroicons/react/24/solid/UserPlusIcon';

const initialItems = [
  {
    title: "Cuenta ",
    path: 'account',
    icon: (
      <SvgIcon fontSize="small">
        <UserPlusIcon />
      </SvgIcon>
    )
  }
]
export const SideNav = (props) => {
  const { open, onClose } = props;
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'));
  const { user } = useAuthContext();
  const [items, setItems] = useState(initialItems)
  const [proyectos, setProyectos] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  useEffect( () => {
    const fetchProyectosData = async () => {
      const empresa = await getEmpresaDetailsFromUser(user)
      const proyectos = await getProyectosFromUser(user)
      setProyectos(proyectos)
      const empresaElement = {
        title: "Configurar " + empresa.nombre,
        path: 'empresa?empresaId=' + empresa.id,
        icon: (
          <SvgIcon fontSize="small">
            <CogIcon />
          </SvgIcon>
        )
      }
      // const vistaGeneralElement = {
      //   title: 'Vista general',
      //   path: '/resumenConstructoras?empresaId=' + empresa.id,
      //   icon: (
      //     <SvgIcon fontSize="small">
      //       <DashboardIcon />
      //     </SvgIcon>
      //   )
      // }
      let newItems = [empresaElement, ...initialItems]
      await proyectos.forEach( (proy ) => {
        newItems.push(
          {
            title: proy.nombre,
            path: 'cajaProyecto?proyectoId=' + proy.id,
            icon: (
              <SvgIcon fontSize="small">
                <StoreIcon />
              </SvgIcon>
            )
          }
        )
      })
      

      setItems(newItems)
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
