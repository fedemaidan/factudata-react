import api from './axiosConfig';

/**
 * Service HTTP para el header unificado de ventas (vertical corralón).
 * Espejo de ventaContraEntregaService, apuntando a /empresa/:id/ventas.
 *
 * Ver docs/corralones/04-endpoints.md §Ventas.
 */
const ventaService = {
  async listar(empresaId, filtros = {}) {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/ventas${params}`);
    return data;
  },

  async obtener(empresaId, id) {
    const { data } = await api.get(`/empresa/${empresaId}/ventas/${id}`);
    return data;
  },

  // Venta de productos (flujo único). payload.modalidad = contado | cc | contra_entrega.
  async crear(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas`, payload);
    return data;
  },

  // Acopio (lógica propia).
  async crearAcopio(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/acopio`, payload);
    return data;
  },

  async registrarEntrega(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/entregar`, payload);
    return data;
  },

  async cancelar(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/cancelar`, payload);
    return data;
  },

  async cobrar(empresaId, id, payload = {}) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/cobrar`, payload);
    return data;
  },

  async editar(empresaId, id, payload = {}) {
    const { data } = await api.put(`/empresa/${empresaId}/ventas/${id}`, payload);
    return data;
  },

  async eliminar(empresaId, id) {
    const { data } = await api.delete(`/empresa/${empresaId}/ventas/${id}`);
    return data;
  },

  // ── Borradores (venta inerte: se completa/confirma después) ──
  async crearBorrador(empresaId, payload) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/borrador`, payload);
    return data;
  },

  async editarBorrador(empresaId, id, payload = {}) {
    const { data } = await api.put(`/empresa/${empresaId}/ventas/${id}/borrador`, payload);
    return data;
  },

  async confirmarBorrador(empresaId, id) {
    const { data } = await api.post(`/empresa/${empresaId}/ventas/${id}/confirmar-borrador`);
    return data;
  },
};

export default ventaService;
