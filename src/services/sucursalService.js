import api from './axiosConfig';

/**
 * CRUD de sucursales (vertical corralón).
 */
const sucursalService = {
  /**
   * @param {string} empresaId
   * @param {{ incluirArchivadas?: boolean }} [opts]
   */
  async getByEmpresa(empresaId, opts = {}) {
    const qs = new URLSearchParams();
    if (opts.incluirArchivadas) qs.set('incluirArchivadas', 'true');
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/sucursales${params}`);
    return data;
  },

  async crear(empresaId, sucursal) {
    const { data } = await api.post(`/empresa/${empresaId}/sucursales`, sucursal);
    return data;
  },

  async actualizar(empresaId, sucursalId, updates) {
    const { data } = await api.put(
      `/empresa/${empresaId}/sucursales/${sucursalId}`,
      updates
    );
    return data;
  },

  async eliminar(empresaId, sucursalId) {
    const { data } = await api.delete(
      `/empresa/${empresaId}/sucursales/${sucursalId}`
    );
    return data;
  },
};

export default sucursalService;
