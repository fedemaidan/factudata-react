import api from './axiosConfig';

const pagoProveedorService = {
  /**
   * Lista pagos de una empresa con filtros opcionales.
   * @param {string} empresaId
   * @param {Object} [params] - { proveedor_id, desde, hasta, estado, limit, skip }
   * @returns {Promise<Array>}
   */
  async listar(empresaId, params = {}) {
    const { data } = await api.get(`/empresa/${empresaId}/pagos-proveedor`, { params });
    return data;
  },

  /**
   * Obtiene un pago por ID.
   * @param {string} empresaId
   * @param {string} pagoId
   * @returns {Promise<Object>}
   */
  async obtener(empresaId, pagoId) {
    const { data } = await api.get(`/empresa/${empresaId}/pagos-proveedor/${pagoId}`);
    return data;
  },

  /**
   * Registra un nuevo pago a proveedor.
   * Imputa automáticamente a los movimientos del array `imputaciones`
   * y actualiza su monto_pagado/estado.
   *
   * @param {string} empresaId
   * @param {Object} pagoData - { proveedor_id, proyecto_id, fecha_pago, monto_bruto,
   *   moneda, tipo_cambio, tipo_cambio_es_manual, metodo, nro_comprobante,
   *   retenciones: [{descripcion, porcentaje, monto}],
   *   imputaciones: [{movimiento_id, monto_imputado}],
   *   notas }
   * @returns {Promise<Object>}
   */
  async registrar(empresaId, pagoData) {
    const { data } = await api.post(`/empresa/${empresaId}/pagos-proveedor`, pagoData);
    return data;
  },

  /**
   * Anula un pago existente.
   * @param {string} empresaId
   * @param {string} pagoId
   * @param {{ motivo: string, accion_movimientos: 'revertir_a_pendiente' | 'mantener_pagados' }} opts
   * @returns {Promise<Object>}
   */
  async anular(empresaId, pagoId, { motivo, accion_movimientos }) {
    const { data } = await api.post(
      `/empresa/${empresaId}/pagos-proveedor/${pagoId}/anular`,
      { motivo, accion_movimientos }
    );
    return data;
  },

  /**
   * Sube uno o más comprobantes (imágenes/PDFs) a un pago existente.
   * @param {string} empresaId
   * @param {string} pagoId
   * @param {FileList | File[]} archivos
   * @returns {Promise<Object>} - { ok, comprobantes: [{url, nombre, tipo}] }
   */
  async subirComprobantes(empresaId, pagoId, archivos) {
    const formData = new FormData();
    Array.from(archivos).forEach((f) => formData.append('archivos', f));
    const { data } = await api.post(
      `/empresa/${empresaId}/pagos-proveedor/${pagoId}/comprobantes`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};

export default pagoProveedorService;
