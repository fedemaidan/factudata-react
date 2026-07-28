import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { safeRouterReplace } from 'src/utils/safeRouter';

// /cajaProyecto quedó deprecada: su UI se unificó en /cajas. La ruta se mantiene
// SOLO como redirect para no romper los links existentes (menú, drawers, import
// de movimientos) que apuntan a /cajaProyecto?proyectoId=... — se forwardean a
// /cajas con la misma query. Antes este archivo tenía ~3000 líneas que no se
// ejecutaban nunca (el redirect dispara en el mount), lo que confundía haciendo
// creer que era código vivo.
const ProyectoMovimientosPage = () => {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    safeRouterReplace(router, { pathname: '/cajas', query: router.query });
  }, [router.isReady]);
  return null;
};

export default ProyectoMovimientosPage;
