import { useEffect, useState } from "react";
import { SvgIcon } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import StoreIcon from "@mui/icons-material/Store";
import NoteAltIcon from "@mui/icons-material/NoteAlt";
import EngineeringIcon from "@mui/icons-material/Engineering";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SettingsIcon from "@mui/icons-material/Settings";
import { AccountBalanceWallet, Checklist, LocalAtm } from "@mui/icons-material";
import InventoryIcon from "@mui/icons-material/Inventory";
import PaymentsIcon from "@mui/icons-material/Payments";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ContactsIcon from "@mui/icons-material/Contacts";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ConstructionIcon from "@mui/icons-material/Construction";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import { useAuthContext } from "src/contexts/auth-context";
import { getProyectosFromUser } from "src/services/proyectosService";
import { getEmpresaDetailsFromUser } from "src/services/empresaService";

const icon = (Icon) => (
  <SvgIcon fontSize="small">
    <Icon />
  </SvgIcon>
);

const getPermisosVisibles = (empresaAcciones, permisosOcultos = []) =>
  (empresaAcciones || []).filter((accion) => !(permisosOcultos || []).includes(accion));

// Navegación dedicada de corralón: reorganizada por "lo que hace el usuario"
// (Ventas / Clientes / Materiales / Caja y reportes / Configuración) en vez de
// por categoría abstracta. Ver docs/corralones/11-propuesta-funcionalidades.md.
function buildCorralonGroups({ user, empresa, permisosUsuario, esAdmin }) {
  const empId = empresa.id;
  const groups = [];

  // ——— INICIO ———
  const inicioItems = [];
  inicioItems.push({ title: "Asistente IA (Beta)", path: "/agente", icon: icon(AutoAwesomeRoundedIcon) });
  if (user?.admin) {
    inicioItems.push({ title: "Panel de Control", path: "/control-panel", icon: icon(AdminPanelSettingsIcon) });
  }
  inicioItems.push({ title: "Dashboard corralón", path: `/dashboard-corralon?empresaId=${empId}`, icon: icon(DashboardIcon) });
  groups.push({ id: "inicio", label: "Inicio", alwaysOpen: true, items: inicioItems });

  // ——— VENTAS (el corazón operativo) ———
  const ventasItems = [];
  ventasItems.push({ title: "Ventas", path: "/ventas", icon: icon(PaymentsIcon) });
  ventasItems.push({ title: "Acopio", path: `/acopios?empresaId=${empId}`, icon: icon(InventoryIcon) });
  ventasItems.push({ title: "Devoluciones", path: "/devoluciones", icon: icon(AssignmentReturnIcon) });
  ventasItems.push({ title: "Cobranzas", path: "/cobros-cliente", icon: icon(AttachMoneyIcon) });
  groups.push({ id: "ventas", label: "Ventas", items: ventasItems });

  // ——— CLIENTES (ambas entradas por ahora, a pedido) ———
  const clientesItems = [];
  clientesItems.push({ title: "Clientes", path: "/clientes", icon: icon(PeopleIcon) });
  clientesItems.push({ title: "Grupos de cliente", path: "/grupos-cliente", icon: icon(PeopleIcon) });
  groups.push({ id: "clientes", label: "Clientes", items: clientesItems });

  // ——— MATERIALES ———
  const materialesItems = [];
  materialesItems.push({ title: "Stock de materiales", path: `/stockMateriales?empresaId=${empId}`, icon: icon(InventoryIcon) });
  materialesItems.push({ title: "Qué entregar", path: "/que-entregar", icon: icon(EventAvailableIcon) });
  materialesItems.push({ title: "Recepción de proveedor", path: "/recepcion-proveedor", icon: icon(MoveToInboxIcon) });
  materialesItems.push({ title: "Proveedores", path: "/proveedores", icon: icon(StoreIcon) });
  groups.push({ id: "materiales", label: "Materiales", items: materialesItems });

  // ——— CAJA Y REPORTES ———
  const cajaItems = [];
  if (esAdmin) {
    cajaItems.push({ title: "Todos los movimientos", path: `/cajas?empresaId=${empId}&vista=todos`, icon: icon(AccountBalanceWallet) });
    cajaItems.push({ title: "Revisión de facturas", path: `/revisionFacturas?empresaId=${empId}`, icon: icon(Checklist) });
  }
  cajaItems.push({ title: "Reportes", path: "/reportes", icon: icon(AssessmentIcon) });
  groups.push({ id: "caja", label: "Caja y reportes", items: cajaItems });

  // ——— CONFIGURACIÓN ———
  const configItems = [];
  configItems.push({ title: "Sucursales", path: "/sucursales", icon: icon(StoreIcon) });
  configItems.push({ title: "Mi cuenta", path: "/account", icon: icon(PeopleIcon) });
  if (user?.admin) {
    configItems.push({ title: "Configurar " + empresa.nombre, path: `/empresa?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  if (permisosUsuario.includes("ADMIN_USUARIOS")) {
    configItems.push({ title: "Administración", path: `/configuracionBasica/?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  if (permisosUsuario.includes("VER_UNIDADES")) {
    configItems.push({ title: "Unidades", path: `/unidadesTable?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  groups.push({ id: "configuracion", label: "Configuración", items: configItems });

  return groups;
}

async function buildDefaultGroups({ user, empresa, permisosUsuario }) {
  const empId = empresa.id;
  const esAdmin =
    permisosUsuario.includes("VER_CAJAS") &&
    !permisosUsuario.includes("CREAR_EGRESO_SIMPLIFICADO");
  const esCorralon = empresa?.vertical === "corralon";

  // Corralón usa una navegación propia, reorganizada por flujo de trabajo.
  if (esCorralon) {
    return buildCorralonGroups({ user, empresa, permisosUsuario, esAdmin });
  }

  const groups = [];

  // ——— INICIO ———
  const inicioItems = [];
  inicioItems.push({ title: "Asistente IA (Beta)", path: "/agente", icon: icon(AutoAwesomeRoundedIcon) });
  if (user?.admin) {
    inicioItems.push({ title: "Panel de Control", path: "/control-panel", icon: icon(AdminPanelSettingsIcon) });
  }
  if (esAdmin) {
    inicioItems.push({ title: "Resumen general", path: `/vistaResumen?empresaId=${empId}`, icon: icon(DashboardIcon) });
  }
  inicioItems.push({ title: "Reportes", path: "/reportes", icon: icon(AssessmentIcon) });
  groups.push({ id: "inicio", label: "Inicio", alwaysOpen: true, items: inicioItems });

  // ——— FINANZAS ———
  const finanzasItems = [];
  if (esAdmin) {
    finanzasItems.push({ title: "Todos los movimientos", path: `/cajas?empresaId=${empId}&vista=todos`, icon: icon(DashboardIcon) });
  }
  if (permisosUsuario.includes("CREAR_EGRESO_SIMPLIFICADO")) {
    finanzasItems.push({ title: "Ver caja", path: "/cajaSimple", icon: icon(AccountBalanceWallet) });
  }
  if (permisosUsuario.includes("VER_MI_CAJA_CHICA")) {
    finanzasItems.push({ title: "Caja chica", path: "/cajaChica", icon: icon(AttachMoneyIcon) });
  }
  if (esAdmin && permisosUsuario.includes("VER_MI_CAJA_CHICA")) {
    finanzasItems.push({ title: "Todas las cajas chicas", path: "/perfilesEmpresa", icon: icon(AttachMoneyIcon) });
  }
  if (permisosUsuario.includes("VER_RESERVAS_OBRA") && !esCorralon) {
    // Reserva de Obra: reserva interna de fondos por obra (≠ caja chica personal).
    // Visible solo con la acción VER_RESERVAS_OBRA configurada en la empresa.
    finanzasItems.push({ title: "Reservas por obra", path: "/reservasObra", icon: icon(AccountBalanceWallet) });
  }
  if (permisosUsuario.includes("VER_CONTROL_PAGOS")) {
    finanzasItems.push({ title: "Control de pagos", path: "/control-pagos", icon: icon(LocalAtm) });
  }
  if (permisosUsuario.includes("GESTIONAR_PROVEEDORES") || permisosUsuario.includes("VER_CUENTA_CORRIENTE_PROVEEDORES")) {
    finanzasItems.push({ title: "Proveedores", path: "/proveedores", icon: icon(StoreIcon) });
  }
  if (permisosUsuario.includes("VER_PLANES_COBRO") && !esCorralon) {
    // Plan de cobros (PlanCobroModel) es para constructoras. En corralón no aplica.
    finanzasItems.push({ title: "Plan de cobros", path: "/cobros", icon: icon(AttachMoneyIcon) });
  }
  if (esAdmin && !esCorralon) {
    // Control de presupuestos / presupuestos profesionales son de obra (constructora).
    finanzasItems.push({ title: "Control presupuestos", path: "/control-presupuestos", icon: icon(NoteAltIcon) });
    if (permisosUsuario.includes("VER_PRESUPUESTOS_PROFESIONALES")) {
      finanzasItems.push({ title: "Presupuestos profesionales", path: "/presupuestosProfesionales", icon: icon(NoteAltIcon) });
    }
    finanzasItems.push({ title: "Control de Obra", path: "/control-obra", icon: icon(EngineeringIcon) });
  }
  if (finanzasItems.length > 0) groups.push({ id: "finanzas", label: "Finanzas", items: finanzasItems });

  // ——— MATERIALES ———
  const materialesItems = [];
  if (permisosUsuario.includes("VER_STOCK_MATERIALES")) {
    materialesItems.push({ title: "Stock de materiales", path: `/stockMateriales?empresaId=${empId}`, icon: icon(InventoryIcon) });
  }
  if (permisosUsuario.includes("VER_INVENTARIO_PRODUCTOS")) {
    materialesItems.push({ title: "Inventario productos", path: `/inventarioProductos?empresaId=${empId}`, icon: icon(InventoryIcon) });
  }
  if (permisosUsuario.includes("CREAR_ACOPIO")) {
    materialesItems.push({ title: "Acopio", path: `/acopios?empresaId=${empId}`, icon: icon(InventoryIcon) });
  }
  if (permisosUsuario.includes("VER_NOTAS_DE_PEDIDO")) {
    materialesItems.push({ title: "Notas de pedido", path: "/notaPedido", icon: icon(NoteAltIcon) });
  }
  if (permisosUsuario.includes("VER_STOCK_SOLICITUDES")) {
    materialesItems.push({ title: "Tickets de stock", path: `/stockSolicitudes?empresaId=${empId}`, icon: icon(NoteAltIcon) });
  }
  if (permisosUsuario.includes("VER_STOCK_MOVIMIENTOS")) {
    materialesItems.push({ title: "Movimientos de stock", path: `/stockMovimientos?empresaId=${empId}`, icon: icon(CompareArrowsIcon) });
  }
  if (
    permisosUsuario.includes("VER_STOCK_MATERIALES") ||
    permisosUsuario.includes("VER_STOCK_SOLICITUDES")
  ) {
    materialesItems.push({ title: "Materiales por obra", path: `/stockVistaObra?empresaId=${empId}`, icon: icon(ConstructionIcon) });
  }
  if (materialesItems.length > 0) groups.push({ id: "materiales", label: "Materiales", items: materialesItems });

  // ——— OBRAS ———
  if (esAdmin) {
    let proys = await getProyectosFromUser(user);
    proys = (proys || []).filter((p) => p.activo);
    if (proys.length > 0) {
      const finGroup = groups.find((g) => g.id === "finanzas");
      if (finGroup) {
        finGroup.items.push({ title: "Cajas", path: "/cajas", icon: icon(AccountBalanceWallet) });
      }
      groups.push({
        id: "obras",
        label: "Obras",
        items: proys.map((proy) => ({
          title: proy.nombre,
          path: `/cajas?proyectoId=${proy.id}`,
          icon: (
            <SvgIcon fontSize="small" sx={{ color: proy.activo ? "success.main" : "text.disabled" }}>
              <StoreIcon />
            </SvgIcon>
          ),
        })),
      });
    }
  }

  // ——— REVISIÓN ———
  const revisionItems = [];
  if (esAdmin) {
    revisionItems.push({ title: "Revisión de facturas", path: `/revisionFacturas?empresaId=${empId}`, icon: icon(DashboardIcon) });
  }
  if (permisosUsuario.includes("VER_VALIDACION_BORRADORES")) {
    revisionItems.push({ title: "Validación borradores", path: `/panelValidacion?empresaId=${empId}`, icon: icon(Checklist) });
  }
  if (revisionItems.length > 0) groups.push({ id: "revision", label: "Revisión", items: revisionItems });

  // ——— GESTIÓN ———
  const gestionItems = [];
  if (user?.sdr === true) {
    gestionItems.push({ title: "Contactos SDR", path: "/contactosSDR", icon: icon(ContactsIcon) });
  }
  gestionItems.push({ title: "Mi cuenta", path: "/account", icon: icon(PeopleIcon) });
  groups.push({ id: "gestion", label: "Gestión", items: gestionItems });

  // ——— CONFIGURACIÓN ———
  const configItems = [];
  if (user?.admin) {
    configItems.push({ title: "Configurar " + empresa.nombre, path: `/empresa?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  configItems.push({ title: "Plantillas y logos", path: "/plantillas-pdf", icon: icon(AutoAwesomeRoundedIcon) });
  if (permisosUsuario.includes("ADMIN_USUARIOS")) {
    configItems.push({ title: "Administración", path: `/configuracionBasica/?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  if (permisosUsuario.includes("VER_UNIDADES")) {
    configItems.push({ title: "Unidades", path: `/unidadesTable?empresaId=${empId}`, icon: icon(SettingsIcon) });
  }
  if (permisosUsuario.includes("INTEGRACION_ODOO")) {
    configItems.push({ title: "Integración con Odoo", path: `/odooIntegracion?empresaId=${empId}`, icon: icon(NoteAltIcon) });
  }
  if (configItems.length > 0) groups.push({ id: "configuracion", label: "Configuración", items: configItems });

  return groups;
}

const INITIAL_STATE = {
  loading: true,
  empresa: null,
  navType: null, // 'default' | 'celulandia' | 'dhn' | 'logistica' | 'onboarding' | 'suspended' | null
  permisos: [],
  groups: [],
};

// Hook compartido que arma la navegación del dashboard.
// Es la fuente de verdad de qué módulos ve el usuario según permisos:
// lo consume el SideNav y también el AgentLauncherDialog para listar páginas.
export function useDashboardNavGroups() {
  const { user } = useAuthContext();
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const emp = await getEmpresaDetailsFromUser(user);
      if (cancelled) return;

      if (emp?.cuenta_suspendida) {
        setState({ loading: false, empresa: null, navType: "suspended", permisos: [], groups: [] });
        return;
      }

      if (!emp) {
        setState({
          loading: false,
          empresa: null,
          navType: "onboarding",
          permisos: [],
          groups: [
            {
              id: "onboarding",
              label: null,
              alwaysOpen: true,
              items: [{ title: "Onboarding", path: "/onboarding", icon: icon(DashboardIcon) }],
            },
          ],
        });
        return;
      }

      if (emp?.tipo === "Logistica") {
        setState({
          loading: false,
          empresa: emp,
          navType: "logistica",
          permisos: [],
          groups: [
            {
              id: "logistica",
              label: null,
              alwaysOpen: true,
              items: [
                {
                  title: "Hojas de ruta",
                  path: "/hojasDeRuta?empresaId=" + emp.id,
                  icon: icon(DashboardIcon),
                },
              ],
            },
          ],
        });
        return;
      }

      const permisosUsuario = getPermisosVisibles(emp.acciones || [], user?.permisosOcultos || []);

      if (permisosUsuario.some((p) => p.startsWith("CELULANDIA_"))) {
        setState({
          loading: false,
          empresa: emp,
          navType: "celulandia",
          permisos: permisosUsuario,
          groups: [],
        });
        return;
      }

      if (permisosUsuario.includes("MOCK_DHN")) {
        setState({
          loading: false,
          empresa: emp,
          navType: "dhn",
          permisos: permisosUsuario,
          groups: [],
        });
        return;
      }

      const groups = await buildDefaultGroups({
        user,
        empresa: emp,
        permisosUsuario,
      });
      if (cancelled) return;
      setState({
        loading: false,
        empresa: emp,
        navType: "default",
        permisos: permisosUsuario,
        groups,
      });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
