import { useMemo } from "react";
import { useAuthContext } from "src/contexts/auth-context";

// Verdadero cuando la empresa tiene la acción DHN_SOLO_LECTURA y el usuario no es
// admin (los admin nunca quedan en modo solo lectura). permisosOcultos actúa como
// deny-list, igual que en el resto de los permisos.
const useDhnSoloLectura = () => {
  const { user } = useAuthContext();
  return useMemo(() => {
    if (user?.admin) return false;
    const acciones = user?.empresa?.acciones || user?.empresaData?.acciones || [];
    const ocultos = user?.permisosOcultos || [];
    return acciones.includes("DHN_SOLO_LECTURA") && !ocultos.includes("DHN_SOLO_LECTURA");
  }, [user]);
};

export default useDhnSoloLectura;
