import api from './axiosConfig';

class LatenciaBotService {
  /**
   * Stats agregadas de latencia del bot por ventana (24h/7d/30d), cacheadas
   * en el backend. `refresh` fuerza el recálculo del caché.
   * @returns {{ ventanas: Object, calculado_en: string, percentiles_disponibles: boolean }}
   */
  async getStats(refresh = false) {
    try {
      const params = refresh ? { refresh: '1' } : {};
      const response = await api.get('/metricas-latencia/stats', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener métricas de latencia del bot:', error);
      throw error;
    }
  }
}

export default new LatenciaBotService();
