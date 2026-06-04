/**
 * Datos de muestra para previsualizar plantillas de Comprobante de Movimiento.
 * Mismo shape que el objeto `data` del export real (ver buildComprobanteMovimientoData).
 * imagen_url es un PNG transparente 1x1: en el preview se ve el marco vacío del
 * "comprobante adjunto" (en el export real se embebe la imagen del movimiento).
 */
const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const COMPROBANTE_MOVIMIENTO_SAMPLE_DATA = {
  titulo: 'COMPROBANTE DE PAGO',
  tipo: 'egreso',
  fecha_emision: '3/6/2026',
  empresa_nombre: 'Tu empresa',
  contraparte_label: 'Proveedor',
  contraparte: 'Acme S.A.',
  obra: 'Casa Tatán',
  codigo_operacion: 'OP-001042',
  fecha: '28/5/2026',
  comprobante: 'Factura A 0001-0042',
  categoria: 'Materiales · Hierro',
  etapa: 'Estructura',
  medio_pago: 'Transferencia',
  moneda: 'ARS',
  subtotal: 100000,
  impuestos: [{ nombre: 'IVA 21%', monto: 21000 }],
  total: 121000,
  observacion: 'Pago correspondiente a la compra de hierro para la estructura.',
  imagen_url: PLACEHOLDER_IMG,
};

export default COMPROBANTE_MOVIMIENTO_SAMPLE_DATA;
