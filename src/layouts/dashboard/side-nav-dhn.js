import React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import PropTypes from "prop-types";
import {
  Box,
  Divider,
  Drawer,
  Stack,
  Typography,
  useMediaQuery,
  Tooltip,
  IconButton,
  Button,
  SvgIcon,
} from "@mui/material";
import { Logo } from "src/components/logo";
import { Scrollbar } from "src/components/scrollbar";
import { SideNavItem } from "./side-nav-item";
import { useAuthContext } from "src/contexts/auth-context";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import SyncIcon from "@mui/icons-material/Sync";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export const SideNavDHN = ({
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  width = 280,
  empresa,
  permisos,
}) => {
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"), { noSsr: true });
  const { user, isSpying } = useAuthContext();

  const paperSx = {
    backgroundColor: isSpying() ? "neutral.600" : "neutral.800",
    color: "common.white",
    width,
    overflowX: "hidden",
    "& .MuiListItemButton-root": {
      minHeight: 44,
      px: collapsed ? 0 : 1.5,
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 1,
    },
    "& .MuiListItemIcon-root": { minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: "center" },
    "& .MuiListItemText-root": { display: collapsed ? "none" : "block" },
    "& .MuiListSubheader-root": { display: collapsed ? "none" : "block", lineHeight: 1.2 },
  };

  // Los ítems DHN sólo se muestran si el permiso MOCK_DHN está presente
  // (la detección ya fue hecha en SideNav, pero la dejamos por claridad)
  const items = [
    {
      title: "Trabajadores",
      path: "/dhn/trabajador",
      icon: <SvgIcon fontSize="small"><PeopleIcon /></SvgIcon>,
    },
    {
      title: "Sincronización",
      path: "/dhn/cargarDrive",
      icon: <SvgIcon fontSize="small"><SyncIcon /></SvgIcon>,
    },
    {
      title: "Errores",
      path: "/dhn/sync/errores",
      icon: <SvgIcon fontSize="small"><ErrorOutlineIcon /></SvgIcon>,
    },
    {
      title: "Control Diario",
      path: "/dhn/controlDiario",
      icon: <SvgIcon fontSize="small"><TodayIcon /></SvgIcon>,
    },
    {
      title: "Control Quincenal",
      path: "/dhn/controlQuincenal",
      icon: <SvgIcon fontSize="small"><DateRangeIcon /></SvgIcon>,
    },
    {
      title: "Conciliación",
      path: "/dhn/conciliacion",
      icon: <SvgIcon fontSize="small"><CompareArrowsIcon /></SvgIcon>,
    },
    {
      title: "Horarios / Licencias",
      path: "/dhn/configuracion",
      icon: <SvgIcon fontSize="small"><ScheduleIcon /></SvgIcon>,
    },
    // --- Cuenta (siempre) ---
    {
      title: "Mi cuenta",
      path: "/account",
      icon: <SvgIcon fontSize="small"><AccountCircleIcon /></SvgIcon>,
    },
  ];

  // --- Admin global ---
  if (user?.admin) {
    items.push({
      title: "Panel de Control",
      path: "/control-panel",
      icon: <SvgIcon fontSize="small"><AdminPanelSettingsIcon /></SvgIcon>,
    });
    items.push({
      title: "Configurar " + (empresa?.nombre || "empresa"),
      path: "empresa?empresaId=" + empresa?.id,
      icon: <SvgIcon fontSize="small"><SettingsIcon /></SvgIcon>,
    });
  }

  const content = (
    <Scrollbar
      sx={{
        height: "100%",
        "& .simplebar-content": { height: "100%" },
        "& .simplebar-scrollbar:before": { background: "neutral.400" },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Header */}
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Box component={NextLink} href="/" sx={{ display: "inline-flex", height: 28, width: 28 }}>
            <Logo />
          </Box>
          {!collapsed && (
            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
              {empresa?.nombre || "DHN"}
            </Typography>
          )}
          <IconButton onClick={onToggleCollapsed} size="small" aria-label="toggle sidenav">
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "neutral.700" }} />

        {/* Navegación */}
        <Box component="nav" sx={{ flexGrow: 1, px: 1, py: 1 }}>
          <Stack component="ul" spacing={0.25} sx={{ listStyle: "none", p: 0, m: 0 }}>
            {items.map((item) => {
              const active = item.path ? pathname === item.path : false;
              const node = (
                <SideNavItem
                  compact={collapsed}
                  active={active}
                  disabled={item.disabled}
                  external={item.external}
                  icon={item.icon}
                  key={item.title}
                  path={item.path}
                  title={item.title}
                />
              );
              return collapsed ? (
                <Tooltip key={item.title} title={item.title} placement="right">
                  <span>{node}</span>
                </Tooltip>
              ) : (
                node
              );
            })}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: "neutral.700" }} />

        {!collapsed && (
          <Button
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}
            onClick={() => window.location.reload(true)}
          >
            Forzar refrescar
          </Button>
        )}
      </Box>
    </Scrollbar>
  );

  if (lgUp) {
    return (
      <Drawer anchor="left" onClose={onClose} open variant="permanent" PaperProps={{ sx: paperSx }}>
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="left"
      onClose={onClose}
      open={open}
      variant="temporary"
      PaperProps={{ sx: paperSx }}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 100 }}
    >
      {content}
    </Drawer>
  );
};

SideNavDHN.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool,
  collapsed: PropTypes.bool,
  onToggleCollapsed: PropTypes.func,
  width: PropTypes.number,
  empresa: PropTypes.object,
  permisos: PropTypes.arrayOf(PropTypes.string),
};
