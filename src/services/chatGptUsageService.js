import api from './axiosConfig';

class ChatGptUsageService {
  /**
   * Obtiene estadísticas agrupadas
   * @param {Object} params - { from, to, groupBy: 'source'|'model' }
   */
  async getStats({ from, to, groupBy = 'source' } = {}) {
    try {
      const params = { groupBy };
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/chatgpt-usage/stats', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de ChatGPT:', error);
      throw error;
    }
  }

  /**
   * Obtiene resumen (hoy y mes)
   */
  async getSummary() {
    try {
      const response = await api.get('/chatgpt-usage/summary');
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener resumen de ChatGPT:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas diarias
   * @param {Object} params - { from, to }
   */
  async getDaily({ from, to } = {}) {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/chatgpt-usage/daily', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener estadísticas diarias:', error);
      throw error;
    }
  }

  /**
   * Obtiene las llamadas más recientes
   * @param {number} limit - cantidad de registros
   */
  async getRecent(limit = 50) {
    try {
      const response = await api.get('/chatgpt-usage/recent', { params: { limit } });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener llamadas recientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene los top sources por costo
   * @param {Object} params - { from, to, limit }
   */
  async getTopSources({ from, to, limit = 10 } = {}) {
    try {
      const params = { limit };
      if (from) params.from = from;
      if (to) params.to = to;
      
      const response = await api.get('/chatgpt-usage/top-sources', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener top sources:', error);
      throw error;
    }
  }
}

export default new ChatGptUsageService();
