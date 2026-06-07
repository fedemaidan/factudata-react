import { useMemo } from 'react';
import { useAgenteAccess } from 'src/hooks/useAgenteAccess';
import { useDashboardNavGroups } from 'src/hooks/useDashboardNavGroups';

// Réplica de los gates por specialist del backend
// (sorby_bot_wa/src/agents/web/chatHandler.js → buildPermissions).
// Mantener sincronizado con utils/acciones.js del bot.
const MOVIMIENTO_ACTIONS = [
  'CREAR_EGRESO',
  'CREAR_EGRESO_SIMPLIFICADO',
  'CREAR_EGRESO_PRORATEADO',
  'CREAR_EGRESOS_MASIVO',
  'CREAR_INGRESO',
  'GESTIONAR_MOVIMIENTO',
  'LISTAR_MOVIMIENTOS',
];

const REPORTES_ACTIONS = [
  'LISTAR_MOVIMIENTOS',
  'GESTIONAR_MOVIMIENTO',
  'CREAR_EGRESO',
  'CREAR_INGRESO',
];

// Espejo de CONVERSATIONAL_CORRALON_PERMISOS (backend utils/acciones.js).
// El gate de corralón exige además empresa.vertical === 'corralon'.
const CORRALON_ACTIONS = [
  'VER_CAJAS',
  'GESTIONAR_MOVIMIENTO',
  'CREAR_INGRESO',
  'LISTAR_MOVIMIENTOS',
];

const NO_SPECIALISTS = {
  movimiento: false,
  reportes: false,
  presupuestos_profesionales: false,
  presupuestos: false,
  corralon: false,
};

const hasAny = (acciones, list) => list.some((a) => acciones.includes(a));

/**
 * Devuelve qué specialists del agente conversacional tiene habilitados el usuario,
 * replicando el filtro del backend. Lo consume el EmptyState de /agente y el
 * AgentLauncherDialog para mostrar acciones rápidas y prompts de ejemplo solo de
 * los módulos a los que el usuario tiene acceso.
 */
export function useAgenteSpecialists() {
  const { canUse } = useAgenteAccess();
  const { permisos, empresa, loading } = useDashboardNavGroups();

  return useMemo(() => {
    if (!canUse) {
      return { loading, specialists: NO_SPECIALISTS };
    }
    const acciones = Array.isArray(permisos) ? permisos : [];
    const esAdmin =
      acciones.includes('VER_CAJAS') && !acciones.includes('CREAR_EGRESO_SIMPLIFICADO');
    const esCorralon = empresa?.vertical === 'corralon';
    return {
      loading,
      specialists: {
        movimiento: hasAny(acciones, MOVIMIENTO_ACTIONS),
        reportes: hasAny(acciones, REPORTES_ACTIONS),
        presupuestos_profesionales: acciones.includes('VER_PRESUPUESTOS_PROFESIONALES'),
        presupuestos: esAdmin,
        corralon: esCorralon && hasAny(acciones, CORRALON_ACTIONS),
      },
    };
  }, [canUse, permisos, empresa, loading]);
}
