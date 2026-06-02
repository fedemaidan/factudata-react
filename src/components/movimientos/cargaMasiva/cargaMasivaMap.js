/**
 * Normaliza a YYYY-MM-DD para input type="date".
 *
 * Usa componentes UTC para los timestamps/ISO: las fechas de movimientos se persisten
 * ancladas a las 13:30 (mediodía), así que el día calendario en UTC es estable y evita
 * el corrimiento de -1 día que daban los getters locales en zonas negativas (UTC-3) cuando
 * la fecha venía como medianoche UTC / ISO desde el OCR de fotos.
 */
export function toDateInputValue(v) {
  if (!v && v !== 0) return '';
  // Ya viene como YYYY-MM-DD
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY
  if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim())) {
    const [d, m, y] = v.trim().split('/');
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // Firestore Timestamp ({seconds}/{_seconds} o .toDate()), ISO string, Date o epoch ms
  let ms = null;
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function') ms = v.toDate().getTime();
    else {
      const seconds = v.seconds !== undefined ? v.seconds : v._seconds;
      if (seconds !== undefined) ms = seconds * 1000;
    }
  } else if (typeof v === 'string') {
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) ms = parsed;
  } else if (typeof v === 'number') {
    ms = v;
  }
  if (ms === null) return '';
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
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
    categoria:
      ex.categoria
      || (Array.isArray(ctx.default_categorias) && ctx.default_categorias.length === 1
        ? ctx.default_categorias[0]
        : '')
      || ctx.default_categoria
      || '',
    subcategoria: ex.subcategoria || ctx.default_subcategoria || '',
    estado: ex.estado || 'Pendiente',
    url_imagen: ex.url_imagen || ex.url_image || null,
    tags_extra: Array.isArray(ex.tags_extra) ? ex.tags_extra : [],
    caja_chica: Boolean(ex.caja_chica),
    medio_pago:
      ex.medio_pago
      || (Array.isArray(ctx.default_medios_pago) && ctx.default_medios_pago.length === 1
        ? ctx.default_medios_pago[0]
        : '')
      || ctx.default_medio_pago
      || '',
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

/**
 * Campos de un formulario de comprobante que TÍPICAMENTE comparten todas las páginas
 * de un mismo PDF cuando se splittea con "una página = un comprobante" (mismo proveedor,
 * misma fecha de factura, mismo proyecto, etc.). Los importes y números de factura NO
 * están acá porque son específicos de cada comprobante.
 */
export const SHAREABLE_FIELDS = [
  'type',
  'moneda',
  'nombre_proveedor',
  'fecha_factura',
  'categoria',
  'subcategoria',
  'proyecto_id',
  'proyecto_nombre',
  'medio_pago',
  'etapa',
];

function isFieldEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Copia los campos compartibles de `source` a `target`. Pure (no muta).
 * @param {object} source - form del comprobante origen.
 * @param {object} target - form del comprobante destino.
 * @param {object} [opts]
 * @param {boolean} [opts.overwrite=false] - si true, pisa valores ya cargados en target.
 * @returns {object} nuevo form combinado.
 */
export function copyShareableFields(source, target, { overwrite = false } = {}) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return target;
  const out = { ...target };
  SHAREABLE_FIELDS.forEach((key) => {
    const srcVal = source[key];
    if (isFieldEmpty(srcVal)) return;
    if (overwrite || isFieldEmpty(target[key])) {
      out[key] = srcVal;
    }
  });
  return out;
}
