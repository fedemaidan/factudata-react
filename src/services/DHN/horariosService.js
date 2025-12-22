import api from 'src/services/axiosConfig';

const horariosService = {
  async getHorarios() {
    const { data } = await api.get('/dhn/horarios');
    return data?.data ?? data ?? {};
  },

  async updateHorarios(payload) {
    const { data } = await api.put('/dhn/horarios', payload);
    return data?.data ?? data ?? {};
  },

  async addFeriado(fecha) {
    const { data } = await api.post('/dhn/horarios/feriados', { fecha });
    return data?.data ?? data ?? {};
  },

  async removeFeriado(fecha) {
    const safeFecha = encodeURIComponent(String(fecha || '').trim());
    const { data } = await api.delete(`/dhn/horarios/feriados/${safeFecha}`);
    return data?.data ?? data ?? {};
  }
};

export default horariosService;
