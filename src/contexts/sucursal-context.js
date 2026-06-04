import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Contexto global de sucursal seleccionada (vertical corralón).
 *
 * Lo escribe el selector que vive en el top-nav y lo leen las páginas
 * (acopios, movimientos, dashboard, etc.) para filtrar por sucursal.
 *
 * Persistido en localStorage para que sobreviva al refresh.
 */

const STORAGE_KEY = 'sorby:sucursal_seleccionada';

const SucursalContext = createContext({
  sucursalId: null,
  setSucursalId: () => {},
});

export const SucursalProvider = ({ children }) => {
  const [sucursalId, setSucursalIdState] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSucursalIdState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setSucursalId = useCallback((id) => {
    setSucursalIdState(id || null);
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ sucursalId, setSucursalId }),
    [sucursalId, setSucursalId]
  );

  return <SucursalContext.Provider value={value}>{children}</SucursalContext.Provider>;
};

SucursalProvider.propTypes = { children: PropTypes.node };

export const useSucursalContext = () => useContext(SucursalContext);

export default SucursalContext;
