/**
 * Agrupación de permisos para el selector del panel de admin.
 *
 * Antes era una lista plana de 109 constantes en mayúsculas, sin separación:
 * imposible saber si `VER_ACOPIO` era de constructora o de corralón, ni qué
 * tocar al configurar una empresa nueva.
 *
 * Reglas:
 *  - Cada acción aparece en EXACTAMENTE un grupo (si estuviera en dos, el Select
 *    mostraría dos checkboxes para el mismo valor). El test de abajo lo verifica.
 *  - Agrupar es solo presentación: todas siguen disponibles para cualquier
 *    empresa. Una constructora puede tildar algo del grupo Corralón si lo necesita.
 *  - Las de corralón se derivan de CORRALON_ACCIONES (fuente única del vertical),
 *    restando las que ya viven en Generales/Stock. Así no hay que mantener dos listas.
 *
 * La clasificación de las acciones históricas entre Generales / Constructora /
 * Stock es un criterio, no algo que estuviera declarado en el código: si alguna
 * quedó en el grupo equivocado, moverla acá es inocuo (no cambia permisos).
 */
import { CORRALON_ACCIONES } from './accionesCorralon';

/** Caja, movimientos, usuarios: comunes a todos los verticales. */
export const ACCIONES_GENERALES = [
  'ENVIAR_MENSAJE_BOT',
  'VER_CAJAS',
  'AJUSTAR_CAJAS',
  'TRANSFERIR_ENTRE_CAJAS',
  'TRANSFERIR_ENTRE_CAJAS_CHICAS',
  'CREAR_INGRESO',
  'CREAR_INGRESO_IMAGEN',
  'CREAR_INGRESO_CAJA_CHICA',
  'VER_MI_CAJA_CHICA',
  'CREAR_EGRESO',
  'CREAR_EGRESO_SIMPLIFICADO',
  'CREAR_EGRESO_PRORATEADO',
  'CREAR_EGRESOS_MASIVO',
  'GESTIONAR_MOVIMIENTO',
  'LISTAR_MOVIMIENTOS',
  'VER_MIS_MOVIMIENTOS',
  'VER_VALIDACION_BORRADORES',
  'CONFIRMAR_PAGOS_PENDIENTES',
  'VALIDAR_CODIGO',
  'VENDER_DOLARES',
  'COMPRAR_DOLARES',
  'VER_DRIVE',
  'ADMIN_USUARIOS',
  'VER_CONVERSACIONES',
  'REPORTE_MANUAL',
  'CARGAR_REMITO',
  'VER_CUENTAS_PENDIENTES',
  'VER_GASTOS_RECURRENTES',
  'VER_CUENTA_CORRIENTE_PROVEEDORES',
  'GESTIONAR_PROVEEDORES',
  'VER_PLANES_PAGO',
  'VER_CONTROL_PAGOS',
];

/** Obra, presupuestos, notas de pedido: el core de constructora / desarrolladora. */
export const ACCIONES_CONSTRUCTORA = [
  'CREAR_NUEVO_PROYECTO',
  'CREAR_OBRA',
  'GESTIONAR_PLAN_DE_OBRA',
  'VER_CONTROL_OBRA',
  'VER_RESERVAS_OBRA',
  'GESTIONAR_RESERVAS_OBRA',
  'VER_PLANES_COBRO',
  'VER_UNIDADES',
  'CREAR_PRESUPUESTO',
  'VER_PRESUPUESTOS',
  'MODIFICAR_PRESUPUESTO',
  'ELIMINAR_PRESUPUESTO',
  'VER_PRESUPUESTOS_PROFESIONALES',
  'CREAR_NOTA_PEDIDO',
  'MODIFICAR_NOTA_PEDIDO',
  'ELIMINAR_NOTA_PEDIDO',
  'RESOLVER_NOTA_PEDIDO',
  'VER_NOTAS_DE_PEDIDO',
  'VER_ACOPIO',
  'DESACOPIAR_MANUAL',
];

/** Stock e inventario: lo comparten constructora y corralón. */
export const ACCIONES_STOCK = [
  'GESTIONAR_MATERIALES',
  'VER_STOCK_MATERIALES',
  'VER_STOCK_SOLICITUDES',
  'CREAR_SOLICITUD_MATERIAL',
  'VER_STOCK_MOVIMIENTOS',
  'VER_INVENTARIO_PRODUCTOS',
];

export const ACCIONES_ODOO = [
  'INTEGRACION_ODOO',
  'ODOO_GUARDAR_CONFIRMANDO',
  'ODOO_FACTURAS_PROVEEDOR_NO_EDI',
];

export const ACCIONES_DHN = [
  'DHN_SYNC_DRIVE',
  'DHN_SOLO_LECTURA',
];

export const ACCIONES_CELULANDIA = [
  'CELULANDIA_COMPROBANTES',
  'CELULANDIA_CLIENTES',
  'CELULANDIA_ENTREGAS',
  'CELULANDIA_PAGOS',
  'CELULANDIA_CONCILIACION',
  'CELULANDIA_CUENTA_CORRIENTE',
  'CELULANDIA_CHEQUES',
  'CELULANDIA_ARQUEO_CAJA',
  'CELULANDIA_EZE_NICO',
  'CELULANDIA_PROYECCIONES',
  'CELULANDIA_RESUMEN',
  'CELULANDIA_BACKUPS',
];

/**
 * Las de corralón que no estén ya en Generales/Stock. Derivado, no duplicado:
 * agregar una acción en accionesCorralon.js la hace aparecer acá sola.
 */
const YA_AGRUPADAS = new Set([...ACCIONES_GENERALES, ...ACCIONES_STOCK]);
export const ACCIONES_CORRALON = CORRALON_ACCIONES.filter((a) => !YA_AGRUPADAS.has(a));

/** Orden en que se muestran los grupos en el selector. */
export const GRUPOS_ACCIONES = [
  { label: 'Generales (todos los verticales)', acciones: ACCIONES_GENERALES },
  { label: 'Sorby Constructora — obra y presupuestos', acciones: ACCIONES_CONSTRUCTORA },
  { label: 'Sorby Corralón', acciones: ACCIONES_CORRALON },
  { label: 'Stock e inventario', acciones: ACCIONES_STOCK },
  { label: 'Integraciones — Odoo', acciones: ACCIONES_ODOO },
  { label: 'DHN', acciones: ACCIONES_DHN },
  { label: 'Celulandia', acciones: ACCIONES_CELULANDIA },
];

/** Todas, aplanadas. Equivalente a la vieja `opcionesAcciones`. */
export const TODAS_LAS_ACCIONES = GRUPOS_ACCIONES.flatMap((g) => g.acciones);
