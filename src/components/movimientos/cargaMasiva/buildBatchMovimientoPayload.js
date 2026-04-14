import { dateToTimestamp } from 'src/utils/formatters';
import {
  computeNetSubtotalFromTotalImpuestos,
  isSubtotalFieldEnabled,
} from 'src/components/movementFieldsConfig';

/**
 * Arma el payload para POST carga-masiva/confirmar alineado a movementForm.
 */
export function buildMovimientoPayloadFromBatchItem(form, context) {
  const {
    comprobante_info = {},
    ingreso_info = {},
    proyectoNombreById = {},
    userPhone,
  } = context;

  const tipoMov = form.type || 'egreso';
  const usaSubtotal = isSubtotalFieldEnabled(comprobante_info, ingreso_info, tipoMov);

  const nombreProyecto =
    proyectoNombreById[form.proyecto_id] || form.proyecto_nombre || form.proyecto || '';

  const payload = {
    type: tipoMov,
    moneda: form.moneda || 'ARS',
    total: form.total !== '' && form.total != null ? Number(form.total) : null,
    subtotal:
      form.subtotal !== '' && form.subtotal != null ? Number(form.subtotal) : null,
    total_original:
      form.total_original !== '' && form.total_original != null
        ? Number(form.total_original)
        : null,
    nombre_proveedor: form.nombre_proveedor || '',
    categoria: form.categoria || '',
    subcategoria: form.subcategoria || '',
    estado: form.estado || 'Pendiente',
    url_imagen: form.url_imagen || null,
    tags_extra: Array.isArray(form.tags_extra) ? form.tags_extra : [],
    caja_chica: Boolean(form.caja_chica),
    medio_pago: form.medio_pago || '',
    observacion: form.observacion || '',
    detalle: form.detalle || '',
    impuestos: Array.isArray(form.impuestos) ? form.impuestos : [],
    empresa_facturacion: form.empresa_facturacion || '',
    fecha_factura: dateToTimestamp(form.fecha_factura),
    fecha_pago: form.fecha_pago ? dateToTimestamp(form.fecha_pago) : null,
    dolar_referencia:
      form.dolar_referencia !== '' && form.dolar_referencia != null
        ? Number(form.dolar_referencia)
        : null,
    dolar_referencia_manual: Boolean(form.dolar_referencia_manual),
    etapa: form.etapa || '',
    obra: form.obra || '',
    cliente: form.cliente || '',
    factura_cliente: form.factura_cliente === true,
    cuenta_interna: form.cuenta_interna || '',
    tipo_factura: form.tipo_factura || '',
    numero_factura: form.numero_factura || '',
    proyecto_id: form.proyecto_id || null,
    proyecto_nombre: nombreProyecto,
    proyecto: nombreProyecto,
    user_phone: userPhone,
  };

  if (form.estado === 'Parcialmente Pagado' && tipoMov === 'egreso') {
    payload.monto_pagado =
      form.monto_pagado !== '' && form.monto_pagado != null
        ? Number(form.monto_pagado)
        : 0;
  } else if (tipoMov === 'egreso') {
    payload.monto_pagado = null;
  }

  if (!usaSubtotal) {
    payload.subtotal = computeNetSubtotalFromTotalImpuestos(
      Number(form.total) || 0,
      form.impuestos || [],
    );
  }

  return payload;
}
