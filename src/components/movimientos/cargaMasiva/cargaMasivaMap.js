import { formatTimestamp } from 'src/utils/formatters';

/**
 * Normaliza a YYYY-MM-DD para input type="date".
 */
export function toDateInputValue(v) {
  if (!v && v !== 0) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const ft = formatTimestamp(v);
  if (ft && /^\d{4}-\d{2}-\d{2}$/.test(ft)) return ft;
  if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim())) {
    const [d, m, y] = v.trim().split('/');
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
  }
  return '';
}

/**
 * @param {object|null} extracted - respuesta del backend por archivo
 * @param {object} ctx - defaults del paso de preguntas
 */
export function mapExtractedToForm(extracted, ctx) {
  const ex = extracted && typeof extracted === 'object' ? extracted : {};
  const type = ex.type || ctx.default_type || 'egreso';
  const moneda = ex.moneda || ctx.default_moneda || 'ARS';

  return {
    type,
    moneda,
    total: ex.total != null && ex.total !== '' ? ex.total : '',
    subtotal: ex.subtotal != null && ex.subtotal !== '' ? ex.subtotal : '',
    total_original: ex.total_original != null && ex.total_original !== '' ? ex.total_original : '',
    nombre_proveedor: ex.nombre_proveedor || '',
    categoria: ex.categoria || ctx.default_categoria || '',
    subcategoria: ex.subcategoria || ctx.default_subcategoria || '',
    estado: ex.estado || 'Pendiente',
    url_imagen: ex.url_imagen || ex.url_image || null,
    tags_extra: Array.isArray(ex.tags_extra) ? ex.tags_extra : [],
    caja_chica: Boolean(ex.caja_chica),
    medio_pago: ex.medio_pago || ctx.default_medio_pago || '',
    observacion: ex.observacion || '',
    detalle: ex.detalle || '',
    impuestos: Array.isArray(ex.impuestos) ? ex.impuestos : [],
    empresa_facturacion: ex.empresa_facturacion || '',
    fecha_factura: toDateInputValue(ex.fecha_factura),
    fecha_pago: ex.fecha_pago ? toDateInputValue(ex.fecha_pago) : '',
    dolar_referencia: ex.dolar_referencia ?? '',
    dolar_referencia_manual: Boolean(ex.dolar_referencia_manual),
    etapa: ex.etapa || ctx.default_etapa || '',
    obra: ex.obra || '',
    cliente: ex.cliente || '',
    factura_cliente: Boolean(ex.factura_cliente),
    cuenta_interna: ex.cuenta_interna || '',
    tipo_factura: ex.tipo_factura || '',
    numero_factura: ex.numero_factura || '',
    proyecto_id: ex.proyecto_id || ctx.proyecto_id || '',
    proyecto_nombre: ex.proyecto_nombre || ctx.proyecto_nombre || '',
    monto_pagado: ex.monto_pagado != null ? ex.monto_pagado : '',
  };
}

export function emptyForm(ctx) {
  return mapExtractedToForm(null, ctx);
}
