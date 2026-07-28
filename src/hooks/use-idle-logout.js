import { useEffect, useRef } from 'react';
import { getLastActivityMs, forceSessionLogout } from 'src/services/sessionActivity';

// Espejo del default del backend (SESSION_IDLE_DEFAULT_SECONDS). El backend es la
// fuente de verdad; esto es solo UX para no esperar al próximo 401.
const IDLE_DEFAULT_SECONDS = 7 * 24 * 3600;
const CHECK_INTERVAL_MS = 30 * 1000;

// Logout proactivo por inactividad. Si el usuario no genera actividad (requests
// no-background) por más de su timeout, lo mandamos a login. Sin aviso/countdown.
//   idleSeconds: null/undefined → default global; 0 → desactivado.
export const useIdleLogout = (idleSeconds) => {
  const idleMsRef = useRef(0);
  idleMsRef.current = (idleSeconds == null ? IDLE_DEFAULT_SECONDS : idleSeconds) * 1000;

  useEffect(() => {
    const intervalId = setInterval(() => {
      const idleMs = idleMsRef.current;
      if (idleMs <= 0) return; // inactividad desactivada
      if (Date.now() - getLastActivityMs() > idleMs) {
        forceSessionLogout();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);
};
