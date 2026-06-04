import dayjs from 'dayjs';
import { loadImageAsDataUrl } from 'src/utils/presupuestos/loadLogoForPdf';

/**
 * Construye el objeto `data` para las plantillas de Comprobante de Movimiento a
 * partir del movimiento + los valores actuales del formulario (movementForm).
 *
 * Async: si el movimiento tiene un comprobante adjunto (`url_imagen`), lo convierte
 * a data URL (via proxy anti-CORS) para poder embeberlo en el PDF.
 */
const fmtFecha = (val) => {
  if (!val) return '';
  const d = dayjs(val);
  return d.isValid() ? d.format('D/M/YYYY') : String(val);
};

export async function buildComprobanteMovimientoData({
  movimiento = {},
  formValues = {},
  empresaNombre = '',
  obra = '',
} = {}) {
  const v = formValues || {};
  const m = movimiento || {};
  const tipo = v.type || m.type || 'egreso';
  const esIngreso = tipo === 'ingreso';

  const impuestos = (Array.isArray(v.impuestos) ? v.impuestos : []).map((i) => ({
    nombre: i.nombre || 'Impuesto',
    monto: Number(i.monto) || 0,
  }));
  const impuestosTotal = impuestos.reduce((a, i) => a + i.monto, 0);
  const total = Number(v.total) || 0;
  const subtotal = Number(v.subtotal) || (total - impuestosTotal);

  const comprobante = [v.tipo_factura, v.numero_factura].filter(Boolean).join(' ');
  const categoria = [v.categoria, v.subcategoria].filter(Boolean).join(' · ');
  const contraparte = esIngreso ? (v.cliente || v.nombre_proveedor || '') : (v.nombre_proveedor || '');

  const urlImagen = m.url_imagen || v.url_imagen || null;
  let imagen_url = null;
  if (urlImagen) {
    imagen_url = await loadImageAsDataUrl(urlImagen);
  }

  return {
    titulo: esIngreso ? 'COMPROBANTE DE COBRO' : 'COMPROBANTE DE PAGO',
    tipo,
    fecha_emision: dayjs().format('D/M/YYYY'),
    empresa_nombre: empresaNombre,
    contraparte_label: esIngreso ? 'Cliente' : 'Proveedor',
    contraparte,
    obra: obra || v.obra || '',
    codigo_operacion: m.codigo_operacion || '',
    fecha: fmtFecha(v.fecha_factura),
    comprobante,
    categoria,
    etapa: v.etapa || '',
    medio_pago: v.medio_pago || '',
    moneda: v.moneda || 'ARS',
    subtotal,
    impuestos,
    total,
    observacion: v.observacion || v.detalle || '',
    imagen_url,
  };
}

export default buildComprobanteMovimientoData;
