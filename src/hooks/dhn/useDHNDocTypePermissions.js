import { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from 'src/contexts/auth-context';
import { getEmpresaDetailsFromUser } from 'src/services/empresaService';

const TIPO_PERMISO = {
  parte: 'DHN_VER_PARTES',
  licencia: 'DHN_VER_LICENCIAS',
  horas: 'DHN_VER_HORAS',
};

const ALL_TIPOS = ['parte', 'licencia', 'horas'];

export default function useDHNDocTypePermissions() {
  const { user } = useAuthContext();
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    getEmpresaDetailsFromUser(user)
      .then((emp) => {
        if (!cancelled) {
          setEmpresa(emp || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmpresa(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return useMemo(() => {
    const isAdmin = Boolean(user?.admin);
    const accionesEmpresa = Array.isArray(empresa?.acciones) ? empresa.acciones : [];
    const permisosOcultos = Array.isArray(user?.permisosOcultos) ? user.permisosOcultos : [];
    const efectivos = accionesEmpresa.filter((a) => !permisosOcultos.includes(a));

    const allowedTypes = isAdmin
      ? [...ALL_TIPOS]
      : ALL_TIPOS.filter((t) => efectivos.includes(TIPO_PERMISO[t]));

    const hasAll = allowedTypes.length === ALL_TIPOS.length;
    const hasAny = allowedTypes.length > 0;
    const canSeeAll = isAdmin || hasAll;

    return {
      loading,
      isAdmin,
      allowedTypes,
      hasAll,
      hasAny,
      canSeeAll,
      isTypeAllowed: (tipo) => {
        if (isAdmin) return true;
        return allowedTypes.includes(String(tipo || '').toLowerCase());
      },
    };
  }, [user, empresa, loading]);
}

export { ALL_TIPOS, TIPO_PERMISO };
