import React, { useState, useEffect } from "react";
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
  SvgIcon,
  Button,
} from "@mui/material";
import { Logo } from "src/components/logo";
import { Scrollbar } from "src/components/scrollbar";
import { SideNavItem } from "./side-nav-item";
import { SideNavCelulandia } from "./side-nav-celulandia";
import { SideNavDHN } from "./side-nav-dhn";
import { useAuthContext } from "src/contexts/auth-context";
import { getProyectosFromUser } from "src/services/proyectosService";
import { getEmpresaDetailsFromUser } from "src/services/empresaService";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AccountBalanceWallet, Checklist, LocalAtm } from "@mui/icons-material";
import InventoryIcon from "@mui/icons-material/Inventory";
import SyncIcon from "@mui/icons-material/Sync";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import BackupIcon from "@mui/icons-material/Backup";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ContactsIcon from "@mui/icons-material/Contacts";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ConstructionIcon from "@mui/icons-material/Construction";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

export const SideNav = (props) => {
  const { open, onClose, collapsed = false, onToggleCollapsed, width = 280 } = props;
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"), { noSsr: true });
  const { user, isSpying } = useAuthContext();

  const [groups, setGroups] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [navType, setNavType] = useState(null); // null = loading | 'celulandia' | 'dhn' | 'default'
  const [navPermisos, setNavPermisos] = useState([]);
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

  const getPermisosVisibles = (empresaAcciones, permisosOcultos = []) =>
    (empresaAcciones || []).filter((accion) => !(permisosOcultos || []).includes(accion));

  useEffect(() => {
    const fetchProyectosData = async () => {
      const emp = await getEmpresaDetailsFromUser(user);
      if (emp?.cuenta_suspendida) return;
      setEmpresa(emp || null);

      if (!emp) {
        setGroups([{ id: "onboarding", label: null, alwaysOpen: true, items: [
          { title: "Onboarding", path: "/onboarding", icon: <SvgIcon fontSize="small"><DashboardIcon /></SvgIcon> },
        ]}]);
        return;
      }

      if (emp?.tipo === "Logistica") {
        setGroups([{ id: "logistica", label: null, alwaysOpen: true, items: [
          { title: "Hojas de ruta", path: "/hojasDeRuta?empresaId=" + emp.id, icon: <SvgIcon fontSize="small"><DashboardIcon /></SvgIcon> },
        ]}]);
        return;
      }

      const permisosUsuario = getPermisosVisibles(emp.acciones || [], user?.permisosOcultos || []);

      if (permisosUsuario.some((p) => p.startsWith("CELULANDIA_"))) {
        setNavType("celulandia");
        setNavPermisos(permisosUsuario);
        return;
      }
      if (permisosUsuario.includes("MOCK_DHN")) {
        setNavType("dhn");
        setNavPermisos(permisosUsuario);
        return;
      }

      setNavType("default");
      const empId = emp.id;
      const esAdmin = permisosUsuario.includes("VER_CAJAS") && !permisosUsuario.includes("CREAR_EGRESO_SIMPLIFICADO");
      const newGroups = [];

      // ——— INICIO ———
      const inicioItems = [];
      inicioItems.push({ title: "Asistente IA", path: "/agente", icon: <SvgIcon fontSize="small"><AutoAwesomeRoundedIcon /></SvgIcon> });
      if (user?.admin) inicioItems.push({ title: "Panel de Control", path: "/control-panel", icon: <SvgIcon fontSize="small"><AdminPanelSettingsIcon /></SvgIcon> });
      if (esAdmin) inicioItems.push({ title: "Resumen general", path: `/vistaResumen?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><DashboardIcon /></SvgIcon> });
      inicioItems.push({ title: "Reportes", path: "/reportes", icon: <SvgIcon fontSize="small"><AssessmentIcon /></SvgIcon> });
      newGroups.push({ id: "inicio", label: "Inicio", alwaysOpen: true, items: inicioItems });

      // ——— FINANZAS ———
      const finanzasItems = [];
      if (esAdmin) finanzasItems.push({ title: "Todos los movimientos", path: `/todosProyectos?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><DashboardIcon /></SvgIcon> });
      if (permisosUsuario.includes("CREAR_EGRESO_SIMPLIFICADO")) finanzasItems.push({ title: "Ver caja", path: "/cajaSimple", icon: <SvgIcon fontSize="small"><AccountBalanceWallet /></SvgIcon> });
      if (permisosUsuario.includes("VER_MI_CAJA_CHICA")) finanzasItems.push({ title: "Caja chica", path: "/cajaChica", icon: <SvgIcon fontSize="small"><AttachMoneyIcon /></SvgIcon> });
      if (esAdmin && permisosUsuario.includes("VER_MI_CAJA_CHICA")) finanzasItems.push({ title: "Todas las cajas chicas", path: "/perfilesEmpresa", icon: <SvgIcon fontSize="small"><AttachMoneyIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_CONTROL_PAGOS")) finanzasItems.push({ title: "Control de pagos", path: "/control-pagos", icon: <SvgIcon fontSize="small"><LocalAtm /></SvgIcon> });
      if (permisosUsuario.includes("VER_CUENTA_CORRIENTE_PROVEEDORES")) finanzasItems.push({ title: "Cta. cte. proveedores", path: "/cuenta-corriente-proveedores", icon: <SvgIcon fontSize="small"><LocalAtm /></SvgIcon> });
      if (permisosUsuario.includes("VER_PLANES_COBRO")) finanzasItems.push({ title: "Plan de cobros", path: "cobros", icon: <SvgIcon fontSize="small"><AttachMoneyIcon /></SvgIcon> });
      if (esAdmin) {
        finanzasItems.push({ title: "Control presupuestos", path: "/control-presupuestos", icon: <SvgIcon fontSize="small"><NoteAltIcon /></SvgIcon> });
        if (permisosUsuario.includes("VER_PRESUPUESTOS_PROFESIONALES")) finanzasItems.push({ title: "Presupuestos profesionales", path: "/presupuestosProfesionales", icon: <SvgIcon fontSize="small"><NoteAltIcon /></SvgIcon> });
      }
      if (finanzasItems.length > 0) newGroups.push({ id: "finanzas", label: "Finanzas", items: finanzasItems });

      // ——— MATERIALES ———
      const materialesItems = [];
      if (permisosUsuario.includes("VER_STOCK_MATERIALES")) materialesItems.push({ title: "Stock de materiales", path: `/stockMateriales?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><InventoryIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_INVENTARIO_PRODUCTOS")) materialesItems.push({ title: "Inventario productos", path: `/inventarioProductos?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><InventoryIcon /></SvgIcon> });
      if (permisosUsuario.includes("CREAR_ACOPIO")) materialesItems.push({ title: "Acopio", path: `/acopios?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><InventoryIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_NOTAS_DE_PEDIDO")) materialesItems.push({ title: "Notas de pedido", path: "/notaPedido", icon: <SvgIcon fontSize="small"><NoteAltIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_STOCK_SOLICITUDES")) materialesItems.push({ title: "Tickets de stock", path: `/stockSolicitudes?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><NoteAltIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_STOCK_MOVIMIENTOS")) materialesItems.push({ title: "Movimientos de stock", path: `/stockMovimientos?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><CompareArrowsIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_STOCK_MATERIALES") || permisosUsuario.includes("VER_STOCK_SOLICITUDES")) materialesItems.push({ title: "Materiales por obra", path: `/stockVistaObra?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><ConstructionIcon /></SvgIcon> });
      if (materialesItems.length > 0) newGroups.push({ id: "materiales", label: "Materiales", items: materialesItems });

      // ——— OBRAS ———
      if (esAdmin) {
        let proys = await getProyectosFromUser(user);
        proys = (proys || []).filter((p) => p.activo);
        if (proys.length > 0) {
          // Cajas (beta) va en Finanzas
          const finGroup = newGroups.find((g) => g.id === "finanzas");
          if (finGroup) finGroup.items.push({ title: "Cajas (beta)", path: "/cajas", icon: <SvgIcon fontSize="small"><AccountBalanceWallet /></SvgIcon> });
          // Proyectos van en Obras
          newGroups.push({
            id: "obras", label: "Obras",
            items: proys.map((proy) => ({
              title: proy.nombre,
              path: `cajaProyecto?proyectoId=${proy.id}`,
              icon: <SvgIcon fontSize="small" sx={{ color: proy.activo ? "success.main" : "text.disabled" }}><StoreIcon /></SvgIcon>,
            })),
          });
        }
      }

      // ——— REVISIÓN ———
      const revisionItems = [];
      if (esAdmin) revisionItems.push({ title: "Revisión de facturas", path: `/revisionFacturas?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><DashboardIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_VALIDACION_BORRADORES")) revisionItems.push({ title: "Validación borradores", path: `/panelValidacion?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><Checklist /></SvgIcon> });
      if (revisionItems.length > 0) newGroups.push({ id: "revision", label: "Revisión", items: revisionItems });

      // ——— GESTIÓN ———
      const gestionItems = [];
      if (user?.sdr === true) gestionItems.push({ title: "Contactos SDR", path: "/contactosSDR", icon: <SvgIcon fontSize="small"><ContactsIcon /></SvgIcon> });
      gestionItems.push({ title: "Mi cuenta", path: "/account", icon: <SvgIcon fontSize="small"><PeopleIcon /></SvgIcon> });
      newGroups.push({ id: "gestion", label: "Gestión", items: gestionItems });

      // ——— CONFIGURACIÓN ———
      const configItems = [];
      if (user?.admin) configItems.push({ title: "Configurar " + emp.nombre, path: `empresa?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><SettingsIcon /></SvgIcon> });
      if (permisosUsuario.includes("ADMIN_USUARIOS")) configItems.push({ title: "Administración", path: `/configuracionBasica/?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><SettingsIcon /></SvgIcon> });
      if (permisosUsuario.includes("VER_UNIDADES")) configItems.push({ title: "Unidades", path: `unidadesTable?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><SettingsIcon /></SvgIcon> });
      if (permisosUsuario.includes("INTEGRACION_ODOO")) configItems.push({ title: "Integración con Odoo", path: `/odooIntegracion?empresaId=${empId}`, icon: <SvgIcon fontSize="small"><NoteAltIcon /></SvgIcon> });
      if (configItems.length > 0) newGroups.push({ id: "configuracion", label: "Configuración", items: configItems });

      setGroups(newGroups);
    };

    fetchProyectosData();
  }, [user]);

  // Navs de empresas específicas
  if (navType === "celulandia") {
    return <SideNavCelulandia {...props} empresa={empresa} permisos={navPermisos} />;
  }
  if (navType === "dhn") {
    return <SideNavDHN {...props} empresa={empresa} permisos={navPermisos} />;
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
