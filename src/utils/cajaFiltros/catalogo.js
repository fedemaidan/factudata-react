/**
 * Catálogo del constructor de filtros de cajas (TAR-633) — fuente de verdad del
 * frontend. Espejo de sorby_bot_wa/utils/movimientoCaja/cajaFiltros.js (CATALOGO
 * + OPERADORES_POR_TIPO). Agregar un campo filtrable = una entrada acá.
 */

// key → { label, campoMov (campo del movimiento), tipo, optionsKey?, opciones?, soloSiConEstados? }
export const CAMPOS = [
  { key: 'categoria',     label: 'Categoría',        campoMov: 'categoria',        tipo: 'select', optionsKey: 'categorias' },
  { key: 'subcategoria',  label: 'Subcategoría',     campoMov: 'subcategoria',     tipo: 'select', optionsKey: 'subcategorias' },
  { key: 'medio_pago',    label: 'Medio de pago',    campoMov: 'medio_pago',       tipo: 'select', optionsKey: 'mediosPago' },
  { key: 'tipo',          label: 'Tipo',             campoMov: 'type',             tipo: 'select', opciones: ['ingreso', 'egreso'] },
  { key: 'estado',        label: 'Estado',           campoMov: 'estado',           tipo: 'select', opciones: ['Pendiente', 'Pagado'], soloSiConEstados: true },
  { key: 'asignado',      label: 'Asignado',         campoMov: 'asignado',         tipo: 'select', optionsKey: 'asignados' },
  { key: 'proveedor',     label: 'Proveedor',        campoMov: 'nombre_proveedor', tipo: 'select', optionsKey: 'proveedores' },
  { key: 'usuario',       label: 'Usuario',          campoMov: 'nombre_user',      tipo: 'select', optionsKey: 'usuarios' },
  { key: 'monto',         label: 'Monto',            campoMov: 'total',            tipo: 'number' },
  { key: 'fecha_factura', label: 'Fecha de factura', campoMov: 'fecha_factura',    tipo: 'date' },
];

const CAMPOS_POR_KEY = CAMPOS.reduce((acc, c) => { acc[c.key] = c; return acc; }, {});

export const getCampoMeta = (key) => CAMPOS_POR_KEY[key] || null;

// operadores por tipo. `sinValor`: no requiere valor (vacío/no vacío). `rango`: dos valores.
export const OPERADORES = {
  select: [
    { key: 'es',       label: 'es' },
    { key: 'no_es',    label: 'no es' },
    { key: 'vacio',    label: 'está vacío',    sinValor: true },
    { key: 'no_vacio', label: 'no está vacío', sinValor: true },
  ],
  number: [
    { key: 'igual',       label: 'igual a' },
    { key: 'distinto',    label: 'distinto de' },
    { key: 'mayor',       label: 'mayor a' },
    { key: 'mayor_igual', label: 'mayor o igual a' },
    { key: 'menor',       label: 'menor a' },
    { key: 'menor_igual', label: 'menor o igual a' },
    { key: 'entre',       label: 'entre', rango: true },
  ],
  date: [
    { key: 'relativa', label: 'es' },
    { key: 'entre',    label: 'entre', rango: true },
  ],
};

export const getOperadores = (tipo) => OPERADORES[tipo] || [];
export const getOperadorMeta = (tipo, opKey) => getOperadores(tipo).find((o) => o.key === opKey) || null;

// presets de fecha relativa (valor de la condición cuando operador === 'relativa')
export const PRESETS_RELATIVOS = [
  { key: 'hoy',            label: 'hoy' },
  { key: 'esta_semana',   label: 'esta semana' },
  { key: 'este_mes',      label: 'este mes' },
  { key: 'mes_pasado',    label: 'el mes pasado' },
  { key: 'este_anio',     label: 'este año' },
  { key: 'ultimos_n_dias', label: 'últimos N días', conCantidad: true },
];

export const getPresetLabel = (key) => (PRESETS_RELATIVOS.find((p) => p.key === key)?.label || key);
