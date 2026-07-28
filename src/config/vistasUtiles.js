// Catálogo de "Vistas útiles": dashboards que cruzan varios datasets en un pantallazo.
// Fuente única de verdad usada por el sidebar (useDashboardNavGroups) y por el
// configurador (/vistas/configurador).
//
// Tres niveles de activación (de más fuerte a más débil):
//   - Empresa (master)        → empresa.vistas_config = { [id]: boolean }. Default: activada.
//   - Empresa por usuario      → empresa.vistas_usuarios = { [id]: { ocultosPara: [userId, ...] } }.
//                                Lo decide un admin de usuarios; el usuario NO lo puede revertir.
//   - Usuario (self)           → user.vistas_ocultas = [id, ...]. Blacklist personal.
// Una vista se ve si: la empresa la tiene activa, el admin no la bloqueó para ese usuario,
// y el usuario no la ocultó para sí mismo.

export const VISTAS_UTILES = [
  {
    id: 'vista-obra',
    title: 'Vista de obra',
    path: '/vistas/obra',
    descripcion: 'Presupuestado vs gastado vs cobrado, por obra o cartera. Todo dolarizado.',
  },
];

export function getVistaUtil(id) {
  return VISTAS_UTILES.find((v) => v.id === id) || null;
}

// ¿La empresa tiene activada esta vista? Sin config previa → activada por default.
export function vistaHabilitadaEmpresa(empresa, id) {
  const cfg = empresa?.vistas_config;
  if (!cfg || cfg[id] === undefined) return true;
  return cfg[id] !== false;
}

// ¿El usuario ocultó esta vista para sí mismo?
export function vistaOcultaUsuario(user, id) {
  return (user?.vistas_ocultas || []).includes(id);
}

// ¿Un admin bloqueó esta vista para este usuario puntual? (decisión de empresa, no revertible por el usuario)
export function vistaBloqueadaParaUsuario(empresa, id, userId) {
  if (userId == null) return false;
  const lista = empresa?.vistas_usuarios?.[id]?.ocultosPara || [];
  return lista.includes(userId);
}

// Vistas efectivamente visibles para un (empresa, usuario).
export function vistasVisiblesPara(empresa, user) {
  return VISTAS_UTILES.filter(
    (v) =>
      vistaHabilitadaEmpresa(empresa, v.id) &&
      !vistaBloqueadaParaUsuario(empresa, v.id, user?.id) &&
      !vistaOcultaUsuario(user, v.id),
  );
}
