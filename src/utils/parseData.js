/**
 * Parsea un valor de query-param (string, array, undefined) a un array de strings.
 * Única fuente de verdad; importada tanto en useMovimientosFilters como en cajas.js.
 */
export const parseQueryParamList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Number(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const normalizeDate = (value) => {
  if (!value) return null;
  return typeof value === "number" ? new Date(value) : new Date(value);
};

/**
 * Campos de filtro que siempre deben ser arrays.
 * Única fuente de verdad — importar acá en vez de duplicar en cada archivo.
 */
export const FILTER_ARRAY_KEYS = [
  'tipo', 'moneda', 'proveedores', 'categorias', 'subcategorias', 'usuarios',
  'medioPago', 'estados', 'etapa', 'cuentaInterna', 'tagsExtra', 'empresaFacturacion',
];

/**
 * Todas las keys de fecha que se persisten / deserializan como Date.
 */
export const FILTER_DATE_KEYS = [
  'fechaDesde', 'fechaHasta',
  'fechaPagoDesde', 'fechaPagoHasta',
  'fechaCreacionDesde', 'fechaCreacionHasta',
  'fechaModificacionDesde', 'fechaModificacionHasta',
];

/**
 * Estado de filtros vacío (defaults). Única fuente de verdad compartida entre
 * useMovimientosFilters y FilterBarCajaProyecto.
 */
export const defaultMovimientosFilters = {
  fechaDesde: null,
  fechaHasta: null,
  palabras: '',
  observacion: '',
  aprobacion: '',
  codigoSync: '',
  categorias: [],
  subcategorias: [],
  proveedores: [],
  usuarios: [],
  medioPago: [],
  tipo: [],
  moneda: [],
  etapa: [],
  estados: [],
  cuentaInterna: [],
  tagsExtra: [],
  montoMin: '',
  montoMax: '',
  ordenarPor: 'fecha_factura',
  ordenarDir: 'desc',
  empresaFacturacion: [],
  fechaPagoDesde: null,
  fechaPagoHasta: null,
  fechaCreacionDesde: null,
  fechaCreacionHasta: null,
  fechaModificacionDesde: null,
  fechaModificacionHasta: null,
  caja: null,
  facturaCliente: '',
  cajaChica: '',
};