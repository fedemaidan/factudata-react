import api from './axiosConfig';

class NumerosAgentesService {
  async list() {
    const response = await api.get('/numeros-agentes');
    return response.data?.items || [];
  }

  async add(phone) {
    const response = await api.post('/numeros-agentes', { phone });
    return response.data;
  }

  async remove(phone) {
    await api.delete('/numeros-agentes', { params: { phone } });
  }
}

export default new NumerosAgentesService();
