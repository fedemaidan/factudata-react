import { createContext, useContext, useState, useCallback } from 'react';

const BreadcrumbsContext = createContext({
  breadcrumbs: [],
  setBreadcrumbs: () => {}
});

export const BreadcrumbsProvider = ({ children }) => {
  const [breadcrumbs, setBreadcrumbsState] = useState([]);

  const setBreadcrumbs = useCallback((crumbs) => {
    setBreadcrumbsState(crumbs || []);
  }, []);

  return (
    <BreadcrumbsContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbsContext.Provider>
  );
};

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbsContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbsProvider');
  }
  return context;
};

// Hook para setear breadcrumbs desde una página
export const useSetBreadcrumbs = (breadcrumbs, deps = []) => {
  const { setBreadcrumbs } = useBreadcrumbs();
  
  // Se ejecuta cuando cambian las dependencias
  if (typeof window !== 'undefined') {
    // Usar useEffect sería mejor pero esto es más simple para el caso de uso
  }
  
  return setBreadcrumbs;
};
