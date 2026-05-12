import React, { useState } from "react";
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
  Collapse,
  ListSubheader,
  Button,
} from "@mui/material";
import { Logo } from "src/components/logo";
import { Scrollbar } from "src/components/scrollbar";
import { SideNavItem } from "./side-nav-item";
import { SideNavCelulandia } from "./side-nav-celulandia";
import { SideNavDHN } from "./side-nav-dhn";
import { useAuthContext } from "src/contexts/auth-context";
import { useDashboardNavGroups } from "src/hooks/useDashboardNavGroups";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const SideNav = (props) => {
  const { open, onClose, collapsed = false, onToggleCollapsed, width = 280 } = props;
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"), { noSsr: true });
  const { isSpying } = useAuthContext();
  const { groups, empresa, navType, permisos } = useDashboardNavGroups();

  const [openGroups, setOpenGroups] = useState({
    finanzas: true, materiales: true, obras: true,
    revision: true, gestion: true, configuracion: false,
  });
  const toggleGroup = (id) => setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const paperSx = {
    backgroundColor: isSpying() ? "neutral.600" : "neutral.800",
    color: "common.white",
    width,
    overflowX: "hidden",
    // reglas globales para los items (funciona con MUI ListItemButton / tu SideNavItem)
    "& .MuiListItemButton-root": {
      minHeight: 44,
      px: collapsed ? 0 : 1.5,
      justifyContent: collapsed ? "center" : "flex-start",
      borderRadius: 1,
    },
    "& .MuiListItemIcon-root": {
      minWidth: 0,
      mr: collapsed ? 0 : 1.5,
      justifyContent: "center",
    },
    "& .MuiListItemText-root": {
      display: collapsed ? "none" : "block",
    },
    // subheaders y separadores más compactos
    "& .MuiListSubheader-root": {
      display: collapsed ? "none" : "block",
      lineHeight: 1.2,
    },
  };

  // Navs de empresas específicas
  if (navType === "celulandia") {
    return <SideNavCelulandia {...props} empresa={empresa} permisos={permisos} />;
  }
  if (navType === "dhn") {
    return <SideNavDHN {...props} empresa={empresa} permisos={permisos} />;
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
        {/* Header compacto */}
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Box component={NextLink} href="/" sx={{ display: "inline-flex", height: 28, width: 28 }}>
            <Logo />
          </Box>
          {!collapsed && (
            <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
              {empresa?.nombre || "Sorbydata"}
            </Typography>
          )}
          <IconButton onClick={onToggleCollapsed} size="small" aria-label="toggle sidenav">
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "neutral.700" }} />

        {/* Navegación */}
        <Box component="nav" sx={{ flexGrow: 1, px: 1, py: 1 }}>
          <Stack component="ul" spacing={0} sx={{ listStyle: "none", p: 0, m: 0 }}>
            {groups.map((group) => (
              <React.Fragment key={group.id}>
                {!collapsed && group.label && (
                  <ListSubheader
                    component="div"
                    disableSticky
                    onClick={() => !group.alwaysOpen && toggleGroup(group.id)}
                    sx={{
                      color: "neutral.400",
                      pl: 1,
                      display: "flex",
                      alignItems: "center",
                      cursor: group.alwaysOpen ? "default" : "pointer",
                      userSelect: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      mt: 0.5,
                      lineHeight: "32px",
                      backgroundColor: "transparent",
                    }}
                  >
                    {!group.alwaysOpen && (
                      <Box component="span" sx={{ mr: 0.5, display: "inline-flex", alignItems: "center" }}>
                        {openGroups[group.id] ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                      </Box>
                    )}
                    {group.label}
                  </ListSubheader>
                )}
                <Collapse in={!!group.alwaysOpen || !!collapsed || !!openGroups[group.id]} unmountOnExit>
                  {group.items.map((item) => {
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
                    ) : node;
                  })}
                </Collapse>
              </React.Fragment>
            ))}
          </Stack>
        </Box>
        <Divider sx={{ borderColor: "neutral.700" }} />
        {!collapsed && (
          <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsIcon fontSize="small" />
            <Typography variant="caption" color="neutral.400">
              v1.0 • Vista compacta
            </Typography>
          </Box>
        )}
        {/* Footer minimal: sin imagen promocional */}
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

SideNav.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool,
  collapsed: PropTypes.bool,
  onToggleCollapsed: PropTypes.func,
  width: PropTypes.number,
};
