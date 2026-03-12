export const DEFINICION_CAMPOS = [
  { section: 'extras', name: 'tipo_factura', label: 'Tipo de Factura', type: 'select', options: ['FACTURA A', 'FACTURA B', 'FACTURA C', 'No definido'], visibleIf: (info) => info.tipo_factura },
  { section: 'basicos', name: 'numero_factura', label: 'Numero de Factura', type: 'text', visibleIf: (info) => info.numero_factura },
  { section: 'basicos', name: 'fecha_factura', label: 'Fecha de la Factura', type: 'date' },
  { section: 'basicos', name: 'fecha_pago', label: 'Fecha de pago', type: 'date', visibleIf: (info) => info.fecha_pago },
  { section: 'basicos', name: 'type', label: 'Tipo', type: 'select', options: ['egreso', 'ingreso'] },
  { section: 'basicos', name: 'nombre_proveedor', label: 'Proveedor', type: 'autocomplete', optionsKey: 'proveedores', visibleIf: (info) => info.proveedor },
  { section: 'basicos', name: 'categoria', label: 'Categoria', type: 'select', optionsKey: 'categorias', visibleIf: (info) => info.categoria },
  { section: 'basicos', name: 'subcategoria', label: 'Subcategoria', type: 'select', optionsKey: 'subcategorias', visibleIf: (info) => info.subcategoria },
  { section: 'basicos', name: 'obra', label: 'Obra', type: 'autocomplete', optionsKey: 'obras', visibleIf: (info) => info.obra },
  { section: 'basicos', name: 'cliente', label: 'Cliente', type: 'autocomplete', optionsKey: 'clientes', visibleIf: (info) => info.cliente },
  { section: 'extras', name: 'cuenta_interna', label: 'Cuenta Interna', type: 'select', optionsKey: 'cuentasInternas', visibleIf: (info) => info.cuenta_interna },
  { section: 'extras', name: 'etapa', label: 'Etapa', type: 'autocomplete', optionsKey: 'etapas', visibleIf: (info) => info.etapa },
  { section: 'importes', name: 'moneda', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
  { section: 'importes', name: 'subtotal', label: 'Subtotal', type: 'number', visibleIf: (info) => info.subtotal },
  { section: 'importes', name: 'total', label: 'Total', type: 'number' },
  { section: 'importes', name: 'total_original', label: 'Total Original', type: 'number', visibleIf: (info) => info.total_original },
  { section: 'importes', name: 'dolar_referencia', label: 'Dolar de Referencia', type: 'number', visibleIf: (info) => info.dolar_referencia },
  { section: 'importes', name: 'subtotal_dolar', label: 'Subtotal USD', type: 'number', readonly: true },
  { section: 'importes', name: 'total_dolar', label: 'Total USD', type: 'number', readonly: true },
  { section: 'pago', name: 'medio_pago', label: 'Medio de Pago', type: 'select', optionsKey: 'mediosPago', visibleIf: (info) => info.medio_pago },
  { section: 'pago', name: 'estado', label: 'Estado', type: 'select', options: ['Pendiente', 'Pagado'], visibleIf: (_, empresa) => empresa?.con_estados },
  { section: 'pago', name: 'caja_chica', label: 'Caja Chica', type: 'boolean', visibleIf: (info) => info.caja_chica },
  { section: 'pago', name: 'empresa_facturacion', label: 'Empresa de facturacion', type: 'select', optionsKey: 'subempresas', visibleIf: (info) => info.empresa_facturacion },
  { section: 'pago', name: 'factura_cliente', label: 'Factura de cliente', type: 'boolean', visibleIf: (info) => info.factura_cliente },
  { section: 'impuestos', name: 'impuestos', label: 'Impuestos', type: 'impuestos', visibleIf: (info) => info.impuestos },
  { section: 'extras', name: 'tags_extra', label: 'Tags Extra', type: 'tags', optionsKey: 'tagsExtra', visibleIf: (info) => info.tags_extra },
  { section: 'basicos', name: 'observacion', label: 'Observacion', type: 'textarea', visibleIf: (info) => info.observacion },
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
  obra: false,
  cliente: false,
  factura_cliente: false,
  dolar_referencia: false,
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
    return campo.visibleIf(info, empresa);
  });
};

export const getCamposConfig = (comprobanteInfo, ingresoInfo, tipoMovimiento) => {
  const rawInfo = tipoMovimiento === 'ingreso' ? ingresoInfo : comprobanteInfo;
  const defaults = tipoMovimiento === 'ingreso' ? INGRESO_INFO_DEFAULT : COMPROBANTE_INFO_DEFAULT;
  return { ...defaults, ...(rawInfo || {}) };
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
    case 'subempresas': {
      const list = empresa?.subempresas || empresa?.sub_empresas || [];
      return list
        .map((s) => {
          if (typeof s === 'string') return s;
          return s?.nombre || s?.razon_social || s?.name || '';
        })
        .filter(Boolean);
    }
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
