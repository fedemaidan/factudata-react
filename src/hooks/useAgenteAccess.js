import { useEffect, useState } from 'react';
import { useAuthContext } from 'src/contexts/auth-context';
import numerosAgentesService from 'src/services/numerosAgentesService';

const digitsOnly = (phone) => String(phone || '').replace(/\D/g, '');

// Misma puerta que aplica el bot de WhatsApp en
// sorby_bot_wa/src/services/numerosAgentesService.js > isPhoneEnabledForMovimientoAgent:
// el teléfono del usuario tiene que estar en la collection `numeros_agentes`.
// El toggle se gestiona desde factudata-react/src/sections/empresa/usuariosDetails.js.
export function useAgenteAccess() {
  const { user } = useAuthContext();
  const [state, setState] = useState({ loading: true, canUse: false });

  useEffect(() => {
    let mounted = true;
    const phone = digitsOnly(user?.phone);
    if (!phone) {
      setState({ loading: false, canUse: false });
      return undefined;
    }
    (async () => {
      try {
        const items = await numerosAgentesService.list();
        if (!mounted) return;
        const enabled = items.some((i) => digitsOnly(i.phone) === phone);
        setState({ loading: false, canUse: enabled });
      } catch {
        if (mounted) setState({ loading: false, canUse: false });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.phone]);

  return state;
}
