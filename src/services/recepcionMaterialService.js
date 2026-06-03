import api from './axiosConfig';

/**
 * Recepción de material no acordado (vertical corralón).
 * Clasifica líneas OCR de un remito de proveedor y resuelve las no acordadas
 * (aceptar → entra al acopio/stock; rechazar → se devuelve). Ver §3 de la propuesta.
 */
const recepcionMaterialService = {
  /**
   * @param {string} acopioId
   * @param {Array} items - [{ codigo?, descripcion, cantidad, valorUnitario? }]
   * @returns {Promise<{ matcheados: Array, no_acordados: Array }>}
   */
  async clasificar(acopioId, items) {
    const { data } = await api.post(`/acopio/${acopioId}/recepcion/clasificar`, { items });
    return data;
  },

  /**
   * @param {string} acopioId
   * @param {object} payload - {
   *   empresa_id, empresa_nombre?, sucursal_id?, destino?: 'acopio'|'stock',
   *   items: [{ codigo?, descripcion, cantidad, valorUnitario?, estado_recepcion: 'aceptado'|'rechazado' }]
   * }
   */
  async resolver(acopioId, payload) {
    const { data } = await api.post(`/acopio/${acopioId}/recepcion/resolver`, payload);
    return data;
  },
};

export default recepcionMaterialService;
