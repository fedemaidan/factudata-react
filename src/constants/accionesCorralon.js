/**
 * Permisos del vertical corralón — fuente única.
 *
 * Vivían duplicados y desincronizados en dos lugares: el preset de alta
 * (pages/empresas.js) y el selector del panel de admin
 * (sections/empresa/configuracionGeneral.js). El preset quedó congelado en el
 * set original de 17 y el selector nunca incluyó ninguno, así que todo corralón
 * dado de alta nacía sin poder operar y no había forma de arreglarlo desde la
 * web: había que escribir Mongo a mano.
 *
 * Al agregar una acción de corralón, agregarla ACÁ y nada más.
 * El catálogo que las consume vive en sorby_bot_wa/utils/acciones.js
 * (accionesPosibles) y en src/router/intentRegistry.js.
 */

/** Caja y movimientos: base común con el resto de los verticales. */
export const CORRALON_ACCIONES_BASE = [
  'VER_CAJAS',
  'CREAR_INGRESO',
  'CREAR_EGRESO',
  'VER_DRIVE',
  'GESTIONAR_MOVIMIENTO',
  'VER_SUCURSALES',
];

/** Clientes y su cuenta corriente. */
export const CORRALON_ACCIONES_CLIENTES = [
  'VER_CLIENTES',
  'CREAR_CLIENTE',
  'AGREGAR_ALIAS_CLIENTE',
  'VER_CC_CLIENTE',
  'VER_GRUPO_CLIENTE',
  'COMPARTIR_LINK_SALDO',
  'TRANSFERIR_SALDO',
];

/** Ventas a cuenta corriente y su ciclo de vida. */
export const CORRALON_ACCIONES_VENTAS = [
  'REGISTRAR_VENTA_CC',
  'VER_VENTAS_CLIENTE',
  'EDITAR_VENTA',
  'CANCELAR_VENTA',
  'COBRAR_VENTA',
];

/** Cobros e imputación. */
export const CORRALON_ACCIONES_COBROS = [
  'VER_COBROS',
  'REGISTRAR_COBRO',
  'ANULAR_COBRO',
];

/** Pedidos contra entrega. */
export const CORRALON_ACCIONES_PEDIDOS = [
  'VER_VENTAS_CONTRA_ENTREGA',
  'CREAR_VENTA_CONTRA_ENTREGA',
  'CREAR_PEDIDO_ENTREGA',
  'LISTAR_PEDIDOS',
  'VER_PEDIDO',
  'MARCAR_ENTREGADO',
  'MARCAR_PAGADO',
  'RESOLVER_RECEPCION',
  'REGISTRAR_DEVOLUCION',
];

/** Acopios de cliente. */
export const CORRALON_ACCIONES_ACOPIOS = [
  'VER_ACOPIOS',
  'CREAR_ACOPIO',
  'CREAR_ACOPIO_CLIENTE',
  'VER_ACOPIOS_CLIENTE',
  'VER_DETALLE_ACOPIO',
  'RECARGAR_ACOPIO',
  'CERRAR_ACOPIO',
  'REGISTRAR_DESACOPIO',
  'VER_REMITOS_ACOPIO',
];

/** Stock — habilitan las entradas del sidebar. */
export const CORRALON_ACCIONES_STOCK = [
  'VER_STOCK_MATERIALES',
  'VER_STOCK_SOLICITUDES',
  'VER_STOCK_MOVIMIENTOS',
];

/** Todas las del vertical, en el orden de los grupos de arriba. */
export const CORRALON_ACCIONES = [
  ...CORRALON_ACCIONES_BASE,
  ...CORRALON_ACCIONES_CLIENTES,
  ...CORRALON_ACCIONES_VENTAS,
  ...CORRALON_ACCIONES_COBROS,
  ...CORRALON_ACCIONES_PEDIDOS,
  ...CORRALON_ACCIONES_ACOPIOS,
  ...CORRALON_ACCIONES_STOCK,
];
