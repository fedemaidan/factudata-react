// import ChartBarIcon from '@heroicons/react/24/solid/ChartBarIcon';
// import CogIcon from '@heroicons/react/24/solid/CogIcon';
// import LockClosedIcon from '@heroicons/react/24/solid/LockClosedIcon';
import ShoppingBagIcon from '@heroicons/react/24/solid/ShoppingBagIcon';
import UserIcon from '@heroicons/react/24/solid/UserIcon';
// import UserPlusIcon from '@heroicons/react/24/solid/UserPlusIcon';
// import UsersIcon from '@heroicons/react/24/solid/UsersIcon';
// import XCircleIcon from '@heroicons/react/24/solid/XCircleIcon';
import { SvgIcon } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import AddCircleIcon from '@mui/icons-material/AddCircle';

export const items = [
  {
    title: 'Vista general',
    path: '/resumenConstructoras',
    icon: (
      <SvgIcon fontSize="small">
        <DashboardIcon />
      </SvgIcon>
    )
  },
  {
    title: 'Caja Lares 7633',
    path: '/cajaProyecto',
    icon: (
      <SvgIcon fontSize="small">
        <StoreIcon />
      </SvgIcon>
    )
  },
  {
    title: 'Caja La Martona 92',
    path: '/cajaProyecto',
    icon: (
      <SvgIcon fontSize="small">
        <StoreIcon />
      </SvgIcon>
    )
  },
  {
    title: 'Caja La Martona 259',
    path: '/cajaProyecto',
    icon: (
      <SvgIcon fontSize="small">
        <StoreIcon />
      </SvgIcon>
    )
  },
  {
    title: 'Caja Lares 138',
    path: '/cajaProyecto',
    icon: (
      <SvgIcon fontSize="small">
        <StoreIcon />
      </SvgIcon>
    )
  },
  {
    title: 'Agregar proyecto',
    path: '/cajaProyecto',
    icon: (
      <SvgIcon fontSize="small">
        <AddCircleIcon />
      </SvgIcon>
    )
  }
];
