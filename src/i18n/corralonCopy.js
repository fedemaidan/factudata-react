import { useMemo } from 'react';
import { useAuthContext } from 'src/contexts/auth-context';

/**
 * Copy contextual para verticales (en particular, corralón).
 *
 * Uso:
 *   const copy = useCorralonCopy(empresa?.vertical);
 *   copy.proveedor()                          // "Proveedor" / "Cliente"
 *   copy.acopio({ contraparte_rol: 'cliente' }) // "Acopio con cliente"
 *   copy.pago()                                // "Pago a proveedor" / "Cobro de cliente"
 *   copy.obra()                                // "Obra" / "Sucursal"
 *
 * No reemplaza un sistema i18n completo: es un mapping liviano y extensible
 * usado donde el copy depende de `empresa.vertical`.
 */

const DEFAULT_VERTICAL = 'constructora';

const dict = {
  constructora: {
    proveedor: () => 'Proveedor',
    proveedores: () => 'Proveedores',
    proveedorPlural: () => 'proveedores',
    cliente: () => 'Cliente',
    clientes: () => 'Clientes',
    obra: () => 'Obra',
    obras: () => 'Obras',
    pago: () => 'Pago a proveedor',
    pagos: () => 'Pagos a proveedores',
    cobro: () => 'Cobro',
    acopio: () => 'Acopio con proveedor',
    acopios: () => 'Acopios',
    cuentaCorrienteProveedores: () => 'Cuenta corriente proveedores',
    cuentaCorrienteClientes: () => 'Cuenta corriente clientes',
  },
  corralon: {
    proveedor: () => 'Proveedor',
    proveedores: () => 'Proveedores',
    proveedorPlural: () => 'proveedores',
    cliente: () => 'Cliente',
    clientes: () => 'Clientes',
    obra: () => 'Sucursal',
    obras: () => 'Sucursales',
    pago: (ctx = {}) =>
      ctx.contraparte_rol === 'cliente' ? 'Cobro de cliente' : 'Pago a proveedor',
    pagos: (ctx = {}) =>
      ctx.contraparte_rol === 'cliente' ? 'Cobros de clientes' : 'Pagos a proveedores',
    cobro: () => 'Cobro de cliente',
    acopio: (ctx = {}) =>
      ctx.contraparte_rol === 'proveedor'
        ? 'Acopio a proveedor'
        : 'Acopio con cliente',
    acopios: (ctx = {}) =>
      ctx.contraparte_rol === 'proveedor'
        ? 'Acopios a proveedor'
        : 'Acopios con cliente',
    cuentaCorrienteProveedores: () => 'CC proveedores',
    cuentaCorrienteClientes: () => 'CC clientes',
  },
  desarrolladora: {}, // hereda de constructora
  estudio: {},        // hereda de constructora
};

function buildCopy(vertical) {
  const base = dict.constructora;
  const overrides = dict[vertical] || {};
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        const fn = overrides[prop] || base[prop];
        if (!fn) {
          // Fallback: devuelve la clave para que sea evidente que falta copy.
          return () => String(prop);
        }
        return fn;
      },
    }
  );
}

/**
 * Versión "pura": dado un vertical devuelve el copy. Útil fuera de React.
 */
export function getCorralonCopy(vertical) {
  return buildCopy(vertical || DEFAULT_VERTICAL);
}

/**
 * Hook que recibe el vertical actual (de `empresa.vertical`) y devuelve un
 * objeto con funciones de copy. Si no se pasa nada intenta leerlo del user
 * (algunos lugares lo cachean en `user.empresaData.vertical`).
 */
export function useCorralonCopy(verticalOverride) {
  const { user } = useAuthContext() || {};
  const vertical =
    verticalOverride
    || user?.empresaData?.vertical
    || user?.empresa?.vertical
    || DEFAULT_VERTICAL;
  return useMemo(() => buildCopy(vertical), [vertical]);
}

export default useCorralonCopy;
