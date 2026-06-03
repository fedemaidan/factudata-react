import api from './axiosConfig';

/**
 * Service HTTP para "ventas contra entrega" (Fase 5 vertical corralón).
 * Espejo de cobroService / clienteService.
 */
const ventaContraEntregaService = {
  async crear(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas-contra-entrega`, payload);
    return data;
  },

  async listar(empresaId, filtros = {}) {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/ventas-contra-entrega${params}`);
    return data;
  },

  async obtener(empresaId, id) {
    const { data } = await api.get(`/empresa/${empresaId}/ventas-contra-entrega/${id}`);
    return data;
  },

  async entregar(empresaId, id, payload = {}) {
    const { data } = await api.post(
      `/empresa/${empresaId}/ventas-contra-entrega/${id}/entregar`,
      payload
    );
    return data;
  },

  async pagar(empresaId, id, payload) {
    const { data } = await api.post(
      `/empresa/${empresaId}/ventas-contra-entrega/${id}/pagar`,
      payload
    );
    return data;
  },

  async cancelar(empresaId, id, payload = {}) {
    const { data } = await api.post(
      `/empresa/${empresaId}/ventas-contra-entrega/${id}/cancelar`,
      payload
    );
    return data;
  },

  async modificarFechaEntrega(empresaId, id, fecha_entrega_estimada) {
    const { data } = await api.patch(
      `/empresa/${empresaId}/ventas-contra-entrega/${id}/fecha-entrega`,
      { fecha_entrega_estimada }
    );
    return data;
  },
};

export default ventaContraEntregaService;
