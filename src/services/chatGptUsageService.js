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

  /**
   * Obtiene serie temporal de costo para los top sources.
   * @param {Object} params - { from, to, interval, limit }
   */
  async getSourceCostSeries({ from, to, interval = 'day', limit = 5 } = {}) {
    try {
      const params = { interval, limit };
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await api.get('/chatgpt-usage/source-cost-series', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener serie temporal de sources:', error);
      throw error;
    }
  }

  /**
   * Obtiene catálogo de modelos conocidos con sus tarifas y uso dentro del rango.
   * @param {Object} params - { from, to }
   */
  async getModelCatalog({ from, to } = {}) {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await api.get('/chatgpt-usage/model-catalog', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener catálogo de modelos:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza la tarifa de un modelo.
   * @param {Object} payload - { model, pricingType, inputPerMillion, outputPerMillion, usdPerMinute }
   */
  async saveModelPricing(payload) {
    try {
      const response = await api.put('/chatgpt-usage/model-pricing', payload);
      return response.data.data;
    } catch (error) {
      console.error('Error al guardar tarifa del modelo:', error);
      throw error;
    }
  }

  /**
   * Recalcula costos históricos dentro de un rango.
   * @param {Object} payload - { from, to, dryRun }
   */
  async recalculateHistory(payload) {
    try {
      const response = await api.post('/chatgpt-usage/recalculate-history', payload);
      return response.data.data;
    } catch (error) {
      console.error('Error al recalcular históricos:', error);
      throw error;
    }
  }
}

export default new ChatGptUsageService();
