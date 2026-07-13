// Resolver espejo del bot (TAR-393): acciones efectivas de un usuario EN una obra.
//   efectivo(user, obra) = empresa.acciones − permisosOcultos − permisosOcultosPorProyecto[obra]
// Todo sustractivo: la capa por-obra solo puede quitar. admin bypassa; la membresía
// (proyectos) decide qué obras aplican (proyectos vacío = todas, fallback existente).

// Set core configurable por obra.
export const ACCIONES_POR_PROYECTO = [
  'CREAR_EGRESO',
  'CREAR_EGRESO_SIMPLIFICADO',
  'CREAR_EGRESO_PRORATEADO',
  'CREAR_EGRESOS_MASIVO',
  'CREAR_INGRESO',
  'CREAR_INGRESO_IMAGEN',
  'VER_CAJAS',
  'LISTAR_MOVIMIENTOS',
  'GESTIONAR_MOVIMIENTO',
  'VENDER_DOLARES',
  'COMPRAR_DOLARES',
  'AJUSTAR_CAJAS',
  'VER_MIS_MOVIMIENTOS',
];

const empresaAccionesDe = (user) => user?.empresa?.acciones || user?.empresaData?.acciones || [];

const esMiembro = (user, proyectoId) => {
  const ids = (user?.proyectos || [])
    .map((p) => (typeof p === 'string' ? p : p?.id))
    .filter(Boolean)
    .map(String);
  if (ids.length === 0) return true; // sin membresía explícita = todas las obras
  return ids.includes(String(proyectoId));
};

// Techo global efectivo (empresa.acciones − permisosOcultos).
const accionesGlobales = (user) =>
  empresaAccionesDe(user).filter((a) => !(user?.permisosOcultos || []).includes(a));

export function accionesEnProyecto(user, proyectoId) {
  const global = accionesGlobales(user);
  if (user?.admin) return [...global];
  if (!proyectoId || !esMiembro(user, proyectoId)) return [];
  const ocultas = (user?.permisosOcultosPorProyecto || {})[String(proyectoId)] || [];
  return global.filter((a) => !ocultas.includes(a));
}

export function tieneAccionEnProyecto(user, proyectoId, accion) {
  if (user?.admin) return true;
  return accionesEnProyecto(user, proyectoId).includes(accion);
}

// todo / solo_mio / bloqueado — misma precedencia de lectura que el bot.
export function modoLecturaEnProyecto(user, proyectoId) {
  if (user?.admin) return 'todo';
  const efectivas = accionesEnProyecto(user, proyectoId);
  if (efectivas.includes('VER_CAJAS') || efectivas.includes('LISTAR_MOVIMIENTOS')) return 'todo';
  if (efectivas.includes('VER_MIS_MOVIMIENTOS')) return 'solo_mio';
  return 'bloqueado';
}

// Para el gating VISUAL del dashboard: true solo si la acción está disponible globalmente
// pero fue RECORTADA en esta obra. Así el gate refleja los recortes por-obra sin cambiar el
// comportamiento actual para quien no tiene la acción a nivel global (B0-safe).
export function accionRecortadaEnObra(user, proyectoId, accion) {
  if (user?.admin) return false;
  if (!proyectoId) return false; // sin obra en scope no hay recorte que aplicar
  const globalHas = accionesGlobales(user).includes(accion);
  if (!globalHas) return false;
  return !tieneAccionEnProyecto(user, proyectoId, accion);
}
