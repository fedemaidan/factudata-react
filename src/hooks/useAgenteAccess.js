import { useAuthContext } from 'src/contexts/auth-context';

// El acceso al agente web se controla con el campo `agenteWebEnabled` del perfil del usuario.
// El toggle se gestiona desde factudata-react/src/sections/empresa/usuariosDetails.js.
export function useAgenteAccess() {
  const { user } = useAuthContext();
  return { loading: false, canUse: user?.agenteWebEnabled === true };
}
