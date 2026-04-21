/**
 * Configuración de columnas para cajaProyecto.
 * Usado por OrdenarColumnasDialog y para renderizar la tabla con orden personalizado.
 */

export const CAJA_COL_DEFAULT_ORDER = [
  'codigo',
  'proyecto',
  'fechas',
  'fechaFactura',
  'fechaCreacion',
  'tipo',
  'total',
  'montoPagado',
  'montoAprobado',
  'categoria',
  'subcategoria',
  'medioPago',
  'proveedor',
  'obra',
  'cliente',
  'observacion',
  'detalle',
  'tc',
  'usd',
  'mep',
  'estado',
  'empresaFacturacion',
  'facturaCliente',
  'fechaPago',
  'tagsExtra',
  'dolarReferencia',
  'totalDolar',
  'subtotalDolar',
  'usuario',  
  'acciones',  
];

const LABELS = {
  codigo: 'Código',
  proyecto: 'Proyecto',
  fechas: 'Fechas',
  fechaFactura: 'Fecha factura',
  fechaCreacion: 'Fecha creación',
  tipo: 'Tipo',
  total: 'Total',
  montoPagado: 'Monto pagado',
  montoAprobado: 'Monto aprobado',
  categoria: 'Categoría',
  subcategoria: 'Subcategoría',
  medioPago: 'Medio de pago',
  proveedor: 'Proveedor',
  obra: 'Obra',
  cliente: 'Cliente',
  observacion: 'Observación',
  detalle: 'Detalle',
  usuario: 'Usuario',
  tc: 'TC ejecutado',
  usd: 'USD blue',
  mep: 'USD MEP',
  estado: 'Estado',
  empresaFacturacion: 'Empresa facturación',
  facturaCliente: 'Factura cliente',
  fechaPago: 'Fecha de pago',
  tagsExtra: 'Tags extra',
  dolarReferencia: 'TC Referencia',
  totalDolar: 'Total USD',
  subtotalDolar: 'Subtotal USD',
  acciones: 'Acciones',
};

/**
 * Obtiene el array de columnas visibles [[key, label], ...] según visibleCols, compactCols y empresa.
 * Excluye columnas que dependen de empresa/options y no están habilitadas.
 */
export function getCajaColumnasConfig(visibleCols, compactCols, empresa, options = {}) {
  const result = [];

  if (visibleCols?.codigo) result.push(['codigo', LABELS.codigo]);
  if (visibleCols?.proyecto) result.push(['proyecto', LABELS.proyecto]);

  if (compactCols) {
    if (visibleCols?.fechas) result.push(['fechas', LABELS.fechas]);
  } else {
    if (visibleCols?.fechaFactura) result.push(['fechaFactura', LABELS.fechaFactura]);
    if (visibleCols?.fechaCreacion) result.push(['fechaCreacion', LABELS.fechaCreacion]);
  }

  if (!compactCols && visibleCols?.tipo) result.push(['tipo', LABELS.tipo]);
  if (visibleCols?.total) result.push(['total', LABELS.total]);
  if (visibleCols?.montoPagado) result.push(['montoPagado', LABELS.montoPagado]);
  if (visibleCols?.montoAprobado) result.push(['montoAprobado', LABELS.montoAprobado]);
  if (visibleCols?.categoria) result.push(['categoria', LABELS.categoria]);
  if (!compactCols && empresa?.comprobante_info?.subcategoria && visibleCols?.subcategoria) {
    result.push(['subcategoria', LABELS.subcategoria]);
  }
  if (empresa?.comprobante_info?.medio_pago && visibleCols?.medioPago) {
    result.push(['medioPago', LABELS.medioPago]);
  }
  if (visibleCols?.proveedor) result.push(['proveedor', LABELS.proveedor]);
  if (visibleCols?.obra) result.push(['obra', LABELS.obra]);
  if (visibleCols?.cliente) result.push(['cliente', LABELS.cliente]);
  if (visibleCols?.observacion) result.push(['observacion', LABELS.observacion]);
  if (empresa?.comprobante_info?.detalle && visibleCols?.detalle) {
    result.push(['detalle', LABELS.detalle]);
  }
  if (visibleCols?.usuario) result.push(['usuario', LABELS.usuario]);
  if (visibleCols?.tc) result.push(['tc', LABELS.tc]);
  if (visibleCols?.usd) result.push(['usd', LABELS.usd]);
  if (visibleCols?.mep) result.push(['mep', LABELS.mep]);
  if (empresa?.con_estados && visibleCols?.estado) result.push(['estado', LABELS.estado]);
  if (visibleCols?.empresaFacturacion) result.push(['empresaFacturacion', LABELS.empresaFacturacion]);
  if (empresa?.comprobante_info?.factura_cliente && visibleCols?.facturaCliente) {
    result.push(['facturaCliente', LABELS.facturaCliente]);
  }
  if (visibleCols?.fechaPago) result.push(['fechaPago', LABELS.fechaPago]);
  if (options?.tags?.length > 0 && visibleCols?.tagsExtra) result.push(['tagsExtra', LABELS.tagsExtra]);
  if (visibleCols?.dolarReferencia) result.push(['dolarReferencia', LABELS.dolarReferencia]);
  if (visibleCols?.totalDolar) result.push(['totalDolar', LABELS.totalDolar]);
  if (visibleCols?.subtotalDolar) result.push(['subtotalDolar', LABELS.subtotalDolar]);
  if (visibleCols?.acciones) result.push(['acciones', LABELS.acciones]);

  return result;
}

/**
 * Aplica el orden personalizado (columnasOrden) al array de columnas visibles.
 * La columna 'acciones' siempre queda al final.
 */
export function applyColumnOrder(columnasConfig, columnasOrden) {
  if (!columnasOrden?.length) return columnasConfig;
  const ordenMap = Object.fromEntries(columnasOrden.map((k, i) => [k, i]));
  const sorted = [...columnasConfig].sort((a, b) => {
    const keyA = a[0];
    const keyB = b[0];
    if (keyA === 'acciones') return 1;
    if (keyB === 'acciones') return -1;
    const idxA = ordenMap[keyA] ?? 999;
    const idxB = ordenMap[keyB] ?? 999;
    return idxA - idxB;
  });
  return sorted;
}

/** Labels para headers de tabla (mayúsculas). categoria usa compactCols. */
export function getHeaderLabel(key, compactCols) {
  if (key === 'categoria') return compactCols ? 'CATEGORÍA / SUBCAT.' : 'CATEGORÍA';
  const map = {
    codigo: 'CÓDIGO',
    proyecto: 'PROYECTO',
    fechas: 'FECHAS',
    fechaFactura: 'FECHA FACTURA',
    fechaCreacion: 'FECHA CREACIÓN',
    tipo: 'TIPO',
    total: 'TOTAL',
    montoPagado: 'MONTO PAGADO',
    montoAprobado: 'MONTO APROBADO',
    subcategoria: 'SUBCATEGORÍA',
    medioPago: 'MEDIO DE PAGO',
    proveedor: 'PROVEEDOR',
    obra: 'OBRA',
    cliente: 'CLIENTE',
    observacion: 'OBSERVACIÓN',
    detalle: 'DETALLE',
    usuario: 'USUARIO',
    tc: 'TC EJECUTADO',
    usd: 'USD BLUE',
    mep: 'USD MEP',
    estado: 'ESTADO',
    empresaFacturacion: 'EMPRESA FACTURACIÓN',
    facturaCliente: 'FACTURA CLIENTE',
    fechaPago: 'FECHA PAGO',
    tagsExtra: 'TAGS EXTRA',
    dolarReferencia: 'TC REF.',
    totalDolar: 'TOTAL USD',
    subtotalDolar: 'SUBTOTAL USD',
    acciones: 'ACCIONES',
  };
  return map[key] || key;
}

/** Retorna sx para TableCell del header según la key. COLS es el objeto de anchos. */
export function getHeaderCellSx(key, COLS, cellBase) {
  const base = {
    ...cellBase,
    bgcolor: 'rgba(246, 246, 246, 0.96)',
    color: '#1E4469',
    fontSize: '0.68rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid',
    borderColor: 'divider',
  };
  const stickyLeft = { position: 'sticky', left: 0, zIndex: 2, bgcolor: 'rgba(246, 246, 246, 0.98)' };
  const stickyRight = {
    position: 'sticky', right: 0, zIndex: 2, bgcolor: 'rgba(246, 246, 246, 0.98)',
    boxShadow: 'inset 8px 0 8px -8px rgba(0,0,0,0.15)',
  };
  const configs = {
    codigo: { minWidth: COLS.codigo, ...stickyLeft },
    proyecto: { minWidth: COLS.proyecto },
    fechas: { minWidth: COLS.fecha + 40 },
    fechaFactura: { minWidth: COLS.fecha },
    fechaCreacion: { minWidth: COLS.fecha },
    tipo: { minWidth: COLS.tipo },
    total: { minWidth: COLS.total, textAlign: 'right' },
    montoPagado: { minWidth: COLS.montoPagado, textAlign: 'right' },
    montoAprobado: { minWidth: COLS.montoAprobado, textAlign: 'right' },
    categoria: { minWidth: COLS.categoria },
    subcategoria: { minWidth: COLS.subcategoria },
    medioPago: { minWidth: COLS.medioPago },
    proveedor: { minWidth: COLS.proveedor },
    obra: { minWidth: COLS.obra },
    cliente: { minWidth: COLS.cliente },
    observacion: { minWidth: COLS.observacion },
    detalle: { minWidth: COLS.detalle },
    usuario: { minWidth: COLS.usuario },
    tc: { minWidth: COLS.tc },
    usd: { minWidth: COLS.usd },
    mep: { minWidth: COLS.mep },
    estado: { minWidth: COLS.estado },
    empresaFacturacion: { minWidth: COLS.empresaFacturacion },
    facturaCliente: { minWidth: COLS.facturaCliente },
    fechaPago: { minWidth: COLS.fechaPago },
    tagsExtra: { minWidth: COLS.tagsExtra },
    dolarReferencia: { minWidth: COLS.dolarReferencia },
    totalDolar: { minWidth: COLS.totalDolar, textAlign: 'right' },
    subtotalDolar: { minWidth: COLS.subtotalDolar, textAlign: 'right' },
    acciones: { minWidth: COLS.acciones, textAlign: 'center', ...stickyRight },
  };
  const cfg = configs[key];
  return cfg ? { ...base, ...cfg } : base;
}
