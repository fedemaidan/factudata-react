// hooks/useProyectosByEmpresa.js
import { useEffect, useState } from 'react';
import { getProyectosByEmpresa } from 'src/services/proyectosService';
import { getEmpresaById } from 'src/services/empresaService';

export function useProyectosByEmpresa(empresaId) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      setLoading(true);
      try {
        const empresa = await getEmpresaById(empresaId);
        const proys = await getProyectosByEmpresa(empresa);
        setProyectos(proys || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId]);

  return { proyectos, loading };
}
