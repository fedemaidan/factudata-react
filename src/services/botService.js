import api from './axiosConfig';


class BotService {
  async listarUsuarios(phone = '') {
    try {
      const params = {};
      if (phone) params.phone = phone;
      
      const response = await api.get(`/bot-state/users-state`, { params });
      return response.data;
    } catch (error) {
      console.error('Error al listar usuarios del bot:', error);
      throw error;
    }
  }

  async detectarInconsistentes(minMinutes = 10) {
    try {
      const response = await api.get(`/bot-state/inconsistent-states`, { params: { minMinutes } });
      return response.data;
    } catch (error) {
      console.error('Error al detectar estados inconsistentes:', error);
      throw error;
    }
  }

  async resetearEstado(phone) {
    try {
      const response = await api.post(`/bot-state/reset-state`, { phone });
      return response.data;
    } catch (error) {
      console.error('Error al resetear estado:', error);
      throw error;
    }
  }
}

export default new BotService();
