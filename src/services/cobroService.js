import api from './axiosConfig';

/**
 * Cobros a clientes (vertical corralón).
 * No confundir con `planCobroService` (plan de cobros de constructoras).
 */
const cobroService = {
  /**
   * Crea un cobro de cliente.
   * @param {string} empresaId
   * @param {object} payload - {
   *   cliente_id, fecha_cobro, monto_bruto, moneda, metodo, caja_id,
   *   imputaciones: [{ movimiento_id, monto_imputado }],
   *   retenciones?, notas?
   * }
   */
  async crear(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/cobros-cliente`, payload);
    return data;
  },

  async listar(empresaId, filtros = {}) {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/cobros-cliente${params}`);
    return data;
  },

  async obtener(empresaId, id) {
    const { data } = await api.get(`/empresa/${empresaId}/cobros-cliente/${id}`);
    return data;
  },

  async anular(empresaId, id, payload = {}) {
    const { data } = await api.post(
      `/empresa/${empresaId}/cobros-cliente/${id}/anular`,
      payload
    );
    return data;
  },
};

export default cobroService;
