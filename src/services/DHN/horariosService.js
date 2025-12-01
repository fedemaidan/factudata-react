import api from 'src/services/axiosConfig';

const horariosService = {
  async getHorarios() {
    const { data } = await api.get('/dhn/horarios');
    return data?.data ?? data ?? {};
  },

  async updateHorarios(payload) {
    const { data } = await api.put('/dhn/horarios', payload);
    return data?.data ?? data ?? {};
  }
};

export default horariosService;
