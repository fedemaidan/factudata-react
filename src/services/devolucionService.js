import api from './axiosConfig';

/**
 * Devoluciones / reintegros de material (vertical corralón).
 * Evento inverso a la salida de material. Ver docs/corralones/11-propuesta-funcionalidades.md §1.
 */
const devolucionService = {
  /**
   * Registra una devolución.
   * @param {string} empresaId
   * @param {object} payload - {
   *   origen: { tipo: 'acopio'|'contra_entrega'|'contado'|'cc', acopio_id?, solicitud_id?, cliente_id?, sucursal_id?, monto_credito? },
   *   materiales: [{ material_id?, codigo?, descripcion, cantidad, precio_unitario? }],
   *   url_remito?, observacion?, destino_reintegro?: 'acopio'|'stock'|'cc'
   * }
   */
  async registrar(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/devoluciones`, payload);
    return data;
  },

  /**
   * Pedidos entregados de un cliente, con sus materiales entregados.
   * Alimenta el modo simple del drawer de devolución.
   * @returns {Promise<Array>} [{ venta_id, tipo, fecha, solicitud_id, total, materiales: [...] }]
   */
  async elegibles(empresaId, clienteId) {
    const { data } = await api.get(`/empresa/${empresaId}/devoluciones/elegibles`, {
      params: { cliente_id: clienteId },
    });
    return Array.isArray(data) ? data : [];
  },
};

export default devolucionService;
