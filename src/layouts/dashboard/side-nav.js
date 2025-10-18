import React, { useState, useEffect, useMemo } from "react";
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

export const SideNav = (props) => {
  const { open, onClose, collapsed = false, onToggleCollapsed, width = 280 } = props;
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const { user, isSpying } = useAuthContext();

  const [items, setItems] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [proyectosPlanObra, setProyectosPlanObra] = useState([]);

  const [empresa, setEmpresa] = useState(null);
  const [showProyectos, setShowProyectos] = useState(true);

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
      if (emp?.cuenta_suspendida) {
        return;
      }
      setEmpresa(emp || null);


      if (!emp) {
        setItems([
          {
            title: "Onboarding",
            path: "/onboarding",
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            ),
          },
        ]);
        setProyectos([]);
        return;
      } else if (emp?.tipo === "Logistica") {
        setItems([
          {
            title: "Hojas de ruta",
            path: "/hojasDeRuta?empresaId=" + emp.id,
            icon: (
              <SvgIcon fontSize="small">
                <DashboardIcon />
              </SvgIcon>
            ),
          },
        ]);
        setProyectos([]);
        return;
      }

      // Empresa estándar
      const permisosUsuario = getPermisosVisibles(emp.acciones || [], user?.permisosOcultos || []);
      let baseItems = [
        {
          title: "Cuenta",
          path: "account",
          icon: (
            <SvgIcon fontSize="small">
              <PeopleIcon />
            </SvgIcon>
          ),
        },
      ];

      if (permisosUsuario.includes("CELULANDIA_COMPROBANTES")) {
        baseItems.push({
          title: "Comprobantes",
          path: "/celulandia/comprobantes",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_ENTREGAS")) {
        baseItems.push({
          title: "Entregas",
          path: "/celulandia/entregas",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_PAGOS")) {
        baseItems.push({
          title: "Pagos",
          path: "/celulandia/pagos",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_CONCILIACION")) {
        baseItems.push({
          title: "Conciliación bancaria",
          path: "/celulandia/conciliacionBancaria",
          icon: (
            <SvgIcon fontSize="small">
              <Checklist />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_CUENTA_CORRIENTE")) {
        baseItems.push({
          title: "Cuenta Corriente",
          path: "/celulandia/cuentaCorriente",
          icon: (
            <SvgIcon fontSize="small">
              <PeopleIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_CLIENTES")) {
        baseItems.push({
          title: "Clientes",
          path: "/celulandia/clientes",
          icon: (
            <SvgIcon fontSize="small">
              <PeopleIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_CHEQUES")) {
        baseItems.push({
          title: "Cheques",
          path: "/celulandia/cheques",
          icon: (
            <SvgIcon fontSize="small">
              <AttachMoneyIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_ARQUEO_CAJA")) {
        baseItems.push({
          title: "Arqueo de caja",
          path: "/celulandia/arqueoCaja",
          icon: (
            <SvgIcon fontSize="small">
              <LocalAtm />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_EZE_NICO")) {
        baseItems.push({
          title: "Eze y Nico",
          path: "/celulandia/ezeNico",
          icon: (
            <SvgIcon fontSize="small">
              <AccountBalanceWallet />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_PROYECCIONES")) {
        baseItems.push({
          title: "Proyecciones",
          path: "/celulandia/proyecciones",
          icon: (
            <SvgIcon fontSize="small">
              <InventoryIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CELULANDIA_RESUMEN")) {
        baseItems.push({
          title: "Resumen",
          path: "/celulandia/resumen",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("VER_CONVERSACIONES")) {
        baseItems.push({
          title: "Conversaciones",
          path: "/conversaciones",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });
      }

      if (user?.admin) {
        baseItems.push({
          title: "Configurar " + emp.nombre,
          path: "empresa?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <SettingsIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("ADMIN_USUARIOS")) {
        baseItems.push({
          title: "Administrar" + emp.nombre,
          path: "/configuracionBasica/?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <SettingsIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("VER_CUENTAS_PENDIENTES")) {
        baseItems.push({
          title: "Cuentas pendientes",
          path: "cuentasPendientes?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <SettingsIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("VER_UNIDADES")) {
        baseItems.push({
          title: "Unidades",
          path: "unidadesTable?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <SettingsIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("GESTIONAR_MATERIALES")) {
        baseItems.push({
          title: "Movimientos de material",
          path: "movimientosMateriales/?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <SettingsIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("VER_NOTAS_DE_PEDIDO")) {
        baseItems.push({
          title: "Notas de pedido",
          path: "/notaPedido",
          icon: (
            <SvgIcon fontSize="small">
              <NoteAltIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("CREAR_ACOPIO")) {
        baseItems.push({
          title: "Acopio",
          path: "/acopios?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <InventoryIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("VER_MI_CAJA_CHICA")) {
        baseItems.push({
          title: "Caja Chica",
          path: "/cajaChica",
          icon: (
            <SvgIcon fontSize="small">
              <AttachMoneyIcon />
            </SvgIcon>
          ),
        });
      }

      if (permisosUsuario.includes("MOCK_DHN")) {
        baseItems.push({
          title: "Trabajadores",
          path: "/dhn/trabajador",
          icon: (
            <SvgIcon fontSize="small">
              <PeopleIcon />
            </SvgIcon>
          ),
        });

        baseItems.push({
          title: "Sincronización",
          path: "/dhn/cargarDrive",
          icon: (
            <SvgIcon fontSize="small">
              <PeopleIcon />
            </SvgIcon>
          ),
        });
  
        baseItems.push({
          title: "Control Diario",
          path: "/dhn/controlDiario",
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        });

      }

      if (permisosUsuario.includes("VER_CAJAS")) {
        if (permisosUsuario.includes("VER_MI_CAJA_CHICA")) {
          baseItems.push({
            title: "Ver cajas chicas",
            path: "/perfilesEmpresa",
            icon: (
              <SvgIcon fontSize="small">
                <AttachMoneyIcon />
              </SvgIcon>
            ),
          });
        }


        baseItems.push({
          title: "Presupuestos",
          path: "/presupuestos",
          icon: (
            <SvgIcon fontSize="small">
              <NoteAltIcon />
            </SvgIcon>
          ),
        });

        const vista7 = {
          title: "Vista 7 días",
          path: "/resumenMovimientos?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        };
        const todos = {
          title: "Todos los movimientos",
          path: "/todosProyectos?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        };
        const revision = {
          title: "Revision de facturas",
          path: "/revisionFacturas?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <DashboardIcon />
            </SvgIcon>
          ),
        };

        baseItems = [vista7, todos, revision, ...baseItems];

        // proyectos activos
        let proys = await getProyectosFromUser(user);
        proys = (proys || []).filter((p) => p.activo);
        setProyectos(proys);
      } else {
        setProyectos([]);
      }

      if (permisosUsuario.includes("GESTIONAR_PLAN_DE_OBRA")) {
        let proys = await getProyectosFromUser(user);
        proys = (proys || []).filter((p) => p.activo);
        setProyectosPlanObra(proys);
      }

      if (permisosUsuario.includes("INTEGRACION_ODOO")) {
        baseItems.push({
          title: "Integración con Odoo",
          path: "/odooIntegracion?empresaId=" + emp.id,
          icon: (
            <SvgIcon fontSize="small">
              <NoteAltIcon />
            </SvgIcon>
          ),
        });
      }

      setItems(baseItems);
    };

    fetchProyectosData();
  }, [user]);

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

            {/* Proyectos agrupados */}
            {proyectos.length > 0 && (
              <>
                {!collapsed && (
                  <ListSubheader
                    component="div"
                    disableSticky
                    sx={{ color: "neutral.400", pl: 1, display: "flex", alignItems: "center" }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setShowProyectos((v) => !v)}
                      sx={{ mr: 0.5 }}
                    >
                      {showProyectos ? (
                        <ExpandMoreIcon fontSize="small" />
                      ) : (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </IconButton>
                    Cajas de proyectos
                  </ListSubheader>
                )}
                <Box sx={{ px: collapsed ? 0 : 0.5 }}>
                  <Collapse in={showProyectos || collapsed}>
                    {proyectos.map((proy) => {
                      const el = (
                        <SideNavItem
                          compact={collapsed}
                          key={proy.id}
                          title={proy.nombre}
                          path={`cajaProyecto?proyectoId=${proy.id}`}
                          icon={
                            <SvgIcon
                              fontSize="small"
                              sx={{ color: proy.activo ? "success.main" : "text.disabled" }}
                            >
                              <StoreIcon />
                            </SvgIcon>
                          }
                        />
                      );
                      return collapsed ? (
                        <Tooltip key={proy.id} title={proy.nombre} placement="right">
                          <span>{el}</span>
                        </Tooltip>
                      ) : (
                        el
                      );
                    })}
                  </Collapse>
                </Box>
              </>
            )}

            {proyectosPlanObra.length > 0 && (
              <>
                {!collapsed && (
                  <ListSubheader
                    component="div"
                    disableSticky
                    sx={{ color: "neutral.400", pl: 1, display: "flex", alignItems: "center" }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setShowProyectos((v) => !v)}
                      sx={{ mr: 0.5 }}
                    >
                      {showProyectos ? (
                        <ExpandMoreIcon fontSize="small" />
                      ) : (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </IconButton>
                    Plan de obras
                  </ListSubheader>
                )}
                <Box sx={{ px: collapsed ? 0 : 0.5 }}>
                  <Collapse in={showProyectos || collapsed}>
                    {proyectosPlanObra.map((proy) => {
                      const el = (
                        <SideNavItem
                          compact={collapsed}
                          key={proy.id}
                          title={proy.nombre}
                          path={`planobra?proyectoId=${proy.id}`}
                          icon={
                            <SvgIcon
                              fontSize="small"
                              sx={{ color: proy.activo ? "success.main" : "text.disabled" }}
                            >
                              <StoreIcon />
                            </SvgIcon>
                          }
                        />
                      );
                      return collapsed ? (
                        <Tooltip key={proy.id} title={proy.nombre} placement="right">
                          <span>{el}</span>
                        </Tooltip>
                      ) : (
                        el
                      );
                    })}
                  </Collapse>
                </Box>
              </>
            )}
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
