export const DEFINICION_CAMPOS = [
  { section: 'basicos', name: 'fecha_factura', label: 'Fecha de la Factura', type: 'date', stitchBlock: 'details', stitchOrder: 10 },
  { section: 'basicos', name: 'fecha_pago', label: 'Fecha de pago', type: 'date', visibleIf: (info) => info.fecha_pago, stitchBlock: 'details', stitchOrder: 20 },
  { section: 'basicos', name: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'date', visibleIf: (info) => info.fecha_vencimiento, stitchBlock: 'details', stitchOrder: 25 },
  { section: 'basicos', name: 'type', label: 'Tipo', type: 'select', options: ['egreso', 'ingreso'], stitchBlock: 'details', stitchOrder: 30 },
  { section: 'basicos', name: 'nombre_proveedor', label: 'Proveedor', type: 'autocomplete', optionsKey: 'proveedores', visibleIf: (info) => info.proveedor, stitchBlock: 'details', stitchOrder: 40 },
  { section: 'basicos', name: 'numero_factura', label: 'Numero de Factura', type: 'text', visibleIf: (info) => info.numero_factura, stitchBlock: 'details', stitchOrder: 50 },
  { section: 'extras', name: 'tipo_factura', label: 'Tipo de Factura', type: 'select', options: ['FACTURA A', 'FACTURA B', 'FACTURA C', 'No definido'], visibleIf: (info) => info.tipo_factura, stitchBlock: 'details', stitchOrder: 60 },
  { section: 'basicos', name: 'observacion', label: 'Observacion', type: 'textarea', visibleIf: (info) => info.observacion, stitchBlock: 'details', stitchOrder: 70 },
  { section: 'basicos', name: 'detalle', label: 'Detalle', type: 'textarea', visibleIf: (info) => info.detalle, stitchBlock: 'details', stitchOrder: 80 },
  { section: 'basicos', name: 'categoria', label: 'Categoria', type: 'select', optionsKey: 'categorias', visibleIf: (info) => info.categoria, stitchBlock: 'classification', stitchOrder: 10 },
  { section: 'basicos', name: 'subcategoria', label: 'Subcategoria', type: 'select', optionsKey: 'subcategorias', visibleIf: (info) => info.subcategoria, stitchBlock: 'classification', stitchOrder: 20 },
  { section: 'basicos', name: 'obra', label: 'Obra', type: 'autocomplete', optionsKey: 'obras', visibleIf: (info) => info.obra, stitchBlock: 'classification', stitchOrder: 30 },
  { section: 'basicos', name: 'cliente', label: 'Cliente', type: 'autocomplete', optionsKey: 'clientes', visibleIf: (info) => info.cliente, stitchBlock: 'classification', stitchOrder: 40 },
  { section: 'extras', name: 'cuenta_interna', label: 'Cuenta Interna', type: 'select', optionsKey: 'cuentasInternas', visibleIf: (info) => info.cuenta_interna, stitchBlock: 'classification', stitchOrder: 50 },
  { section: 'extras', name: 'etapa', label: 'Etapa', type: 'autocomplete', optionsKey: 'etapas', visibleIf: (info) => info.etapa, stitchBlock: 'classification', stitchOrder: 60 },
  { section: 'pago', name: 'empresa_facturacion', label: 'Empresa de facturacion', type: 'select', optionsKey: 'subempresas', visibleIf: (info) => info.empresa_facturacion, stitchBlock: 'classification', stitchOrder: 70 },
  { section: 'pago', name: 'factura_cliente', label: 'Factura de cliente', type: 'boolean', visibleIf: (info) => info.factura_cliente, stitchBlock: 'classification', stitchOrder: 80 },
  { section: 'extras', name: 'tags_extra', label: 'Tags Extra', type: 'tags', optionsKey: 'tagsExtra', visibleIf: (info) => info.tags_extra, stitchBlock: 'classification', stitchOrder: 90 },
  { section: 'importes', name: 'total', label: 'Total', type: 'number', stitchBlock: 'financial', stitchOrder: 10 },
  { section: 'importes', name: 'moneda', label: 'Moneda', type: 'select', options: ['ARS', 'USD'], stitchBlock: 'financial', stitchOrder: 20 },
  { section: 'pago', name: 'medio_pago', label: 'Medio de Pago', type: 'select', optionsKey: 'mediosPago', visibleIf: (info) => info.medio_pago, stitchBlock: 'financial', stitchOrder: 30 },
  { section: 'pago', name: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Parcialmente Pagado', 'Pagado'], visibleIf: (_, empresa) => empresa?.con_estados, stitchBlock: 'financial', stitchOrder: 40 },
  { section: 'pago', name: 'monto_aprobado', label: 'Monto aprobado', type: 'number', visibleIf: (info, _empresa, tipoMovimiento) => tipoMovimiento === 'egreso' && info.monto_aprobado, stitchBlock: 'financial', stitchOrder: 50 },
  { section: 'pago', name: 'caja_chica', label: 'Caja Chica', type: 'boolean', visibleIf: (info) => info.caja_chica, stitchBlock: 'financial', stitchOrder: 90 },
  { section: 'importes', name: 'subtotal', label: 'Subtotal', type: 'number', visibleIf: (info) => info.subtotal, stitchBlock: 'financial', stitchOrder: 100 },
  { section: 'importes', name: 'total_original', label: 'Total Original', type: 'number', visibleIf: (info) => info.total_original, stitchBlock: 'financial', stitchOrder: 110 },
  { section: 'importes', name: 'dolar_referencia', label: 'Dolar de Referencia', type: 'number', visibleIf: (info) => info.dolar_referencia, stitchBlock: 'financial', stitchOrder: 120 },
  { section: 'importes', name: 'subtotal_dolar', label: 'Subtotal USD', type: 'number', readonly: true, stitchBlock: 'financial', stitchOrder: 130 },
  { section: 'importes', name: 'total_dolar', label: 'Total USD', type: 'number', readonly: true, stitchBlock: 'financial', stitchOrder: 140 },
  { section: 'impuestos', name: 'impuestos', label: 'Impuestos', type: 'impuestos', visibleIf: (info) => info.impuestos, stitchBlock: 'financial', stitchOrder: 150 },
];

export const COMPROBANTE_INFO_DEFAULT = {
  categoria: true,
  observacion: true,
  proveedor: true,
  proyecto: true,
  subcategoria: false,
  total_original: false,
  medio_pago: false,
  tipo_factura: false,
  tags_extra: false,
  caja_chica: false,
  impuestos: false,
  numero_factura: false,
  subtotal: false,
  cuenta_interna: false,
  etapa: false,
  empresa_facturacion: false,
  fecha_pago: false,
  fecha_vencimiento: false,
  obra: false,
  cliente: false,
  factura_cliente: false,
  dolar_referencia: false,
  detalle: false,
};

export const INGRESO_INFO_DEFAULT = {
  observacion: true,
  medio_pago: false,
  categoria: false,
  subcategoria: false,
  tags_extra: false,
  dolar_referencia: false,
};

export const GROUP_SECTIONS = {
  general: ['basicos', 'pago', 'extras'],
  montos: ['importes', 'impuestos'],
};

export const getCamposVisibles = (comprobanteInfo, empresa, ingresoInfo, tipoMovimiento) => {
  const info = getCamposConfig(comprobanteInfo, ingresoInfo, tipoMovimiento);

  return DEFINICION_CAMPOS.filter((campo) => {
    if (!campo.visibleIf) return true;
    return campo.visibleIf(info, empresa, tipoMovimiento);
  });
};

export const getCamposConfig = (comprobanteInfo, ingresoInfo, tipoMovimiento) => {
  const rawInfo = tipoMovimiento === 'ingreso' ? ingresoInfo : comprobanteInfo;
  const defaults = tipoMovimiento === 'ingreso' ? INGRESO_INFO_DEFAULT : COMPROBANTE_INFO_DEFAULT;
  return { ...defaults, ...(rawInfo || {}) };
};

export const isSubtotalFieldEnabled = (comprobanteInfo, ingresoInfo, tipoMovimiento) =>
  Boolean(getCamposConfig(comprobanteInfo, ingresoInfo, tipoMovimiento).subtotal);

const sumImpuestos = (impuestos) =>
  (Array.isArray(impuestos) ? impuestos : []).reduce((a, i) => a + (Number(i?.monto) || 0), 0);

/**
 * Neto imponible coherente con total e impuestos cuando el usuario no edita Subtotal.
 * Si impuestos > total (datos incoherentes), evita persistir subtotal negativo.
 */
export const computeNetSubtotalFromTotalImpuestos = (total, impuestos) => {
  const t = Number(total) || 0;
  const imp = sumImpuestos(impuestos);
  return Math.max(0, t - imp);
};

export const getSubempresasOptions = (empresa = null) => {
  const sources = [
    ...(Array.isArray(empresa?.sub_empresas_data) ? empresa.sub_empresas_data : []),
    ...(Array.isArray(empresa?.subempresas) ? empresa.subempresas : []),
    ...(Array.isArray(empresa?.sub_empresas) ? empresa.sub_empresas : []),
  ];

  return [...new Set(
    sources
      .map((subempresa) => {
        if (typeof subempresa === 'string') return subempresa.trim();
        return (
          subempresa?.fantasia ||
          subempresa?.nombre ||
          subempresa?.razon_social ||
          subempresa?.name ||
          ''
        ).trim();
      })
      .filter(Boolean)
  )];
};

export const getOptionsFromContext = (key, context = {}) => {
  const {
    proveedores = [],
    categorias = [],
    categoriaSeleccionada = null,
    tagsExtra = [],
    mediosPago = [],
    empresa = null,
    etapas = [],
    obrasOptions = [],
    clientesOptions = [],
  } = context;

  switch (key) {
    case 'proveedores':
      return proveedores;
    case 'categorias':
      return categorias.map((c) => c.name);
    case 'subcategorias':
      return categoriaSeleccionada?.subcategorias || [];
    case 'tagsExtra':
      return tagsExtra;
    case 'mediosPago':
      return mediosPago;
    case 'subempresas':
      return getSubempresasOptions(empresa);
    case 'etapas':
      return etapas.map((e) => e.nombre);
    case 'cuentasInternas':
      return empresa?.cuentas || ['Cuenta A', 'Cuenta B', 'Cuenta C'];
    case 'obras':
      return obrasOptions;
    case 'clientes':
      return clientesOptions;
    default:
      return [];
  }
};
