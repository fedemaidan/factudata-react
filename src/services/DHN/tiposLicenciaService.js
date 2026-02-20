import api from 'src/services/axiosConfig';

const tiposLicenciaService = {
  async getAll() {
    const { data } = await api.get('/dhn/licencias');
    return data?.data ?? data ?? [];
  },

  async create(payload) {
    const { data } = await api.post('/dhn/licencias', payload);
    return data?.data ?? data ?? null;
  },

  async update(id, payload) {
    const { data } = await api.put(`/dhn/licencias/${id}`, payload);
    return data?.data ?? data ?? null;
  },

  async remove(id) {
    const { data } = await api.delete(`/dhn/licencias/${id}`);
    return data?.data ?? data ?? null;
  }
};

export default tiposLicenciaService;
