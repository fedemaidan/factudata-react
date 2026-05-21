import { useDashboardNavGroups } from 'src/hooks/useDashboardNavGroups';

// El asistente IA (beta) está disponible para cualquier usuario con el sidenav común.
// Quedan excluidos los navs especiales: dhn, celulandia, logistica, onboarding y suspended.
// El alcance real (qué specialists y qué tools puede usar) se resuelve en el backend
// a partir de las acciones configuradas para el usuario.
export function useAgenteAccess() {
  const { navType, loading } = useDashboardNavGroups();
  return { loading, canUse: navType === 'default' };
}
