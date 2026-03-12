/**
 * useTrackPrimeraVisita.js
 * 
 * Hook que registra la primera visita web de un usuario a un módulo
 * en el sistema de onboarding. Usa localStorage para evitar llamadas
 * repetidas y envía un POST al backend la primera vez.
 * 
 * Uso:
 *   useTrackPrimeraVisita('caja', 'accederWeb');
 */

import { useEffect, useRef } from 'react';
import { useAuthContext } from 'src/contexts/auth-context';
import api from 'src/services/axiosConfig';

const STORAGE_PREFIX = 'sorby_onb_visit_';

/**
 * @param {string} modulo - Nombre del módulo (ej: 'caja')
 * @param {string} paso - Nombre del paso (ej: 'accederWeb')
 */
export function useTrackPrimeraVisita(modulo, paso) {
  const { user } = useAuthContext();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    if (!user?.id || !user?.empresa?.id) return;

    const key = `${STORAGE_PREFIX}${user.id}_${modulo}_${paso}`;

    // Si ya se registró en este navegador, no hacer nada
    if (typeof window !== 'undefined' && localStorage.getItem(key)) {
      tracked.current = true;
      return;
    }

    tracked.current = true;

    // Fire-and-forget: registrar paso en backend
    api
      .post(`/onboarding/${user.id}/paso`, {
        empresaId: user.empresa.id,
        modulo,
        paso,
      })
      .then(() => {
        // Guardar en localStorage para no volver a llamar
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, new Date().toISOString());
        }
      })
      .catch((err) => {
        // No bloquear al usuario, solo loguear
        console.warn('[useTrackPrimeraVisita] Error registrando paso:', err?.message);
        // Resetear para reintentar en próxima visita
        tracked.current = false;
      });
  }, [user, modulo, paso]);
}

export default useTrackPrimeraVisita;
