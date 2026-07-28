import api from './axiosConfig';

// Solo los params con valor: el backend interpreta ausente como null exacto.
const soloConValor = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));

class LatenciaBotService {
  /**
   * Stats agregadas de latencia del bot por ventana (24h/7d/30d): snapshots
   * diarios + parcial de hoy calculado en vivo.
   * @returns {{ ventanas: Object, calculado_en: string, percentiles_disponibles: boolean }}
   */
  async getStats() {
    try {
      const response = await api.get('/metricas-latencia/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener métricas de latencia del bot:', error);
      throw error;
    }
  }

  /**
   * Desglose día por día de una métrica (drill-down nivel 1).
   * @returns {{ serie: Array, retencion_registros_dias: number }}
   */
  async getSerie({ tipo, flujo, accion, step, dias = 30 }) {
    try {
      const params = soloConValor({ tipo, flujo, accion, step, dias });
      const response = await api.get('/metricas-latencia/serie', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener la serie diaria de latencia:', error);
      throw error;
    }
  }

  /**
   * Mediciones individuales de un día para una métrica (drill-down nivel 2).
   * @returns {{ registros: Array, total: number, page: number, limit: number }}
   */
  async getRegistros({ fecha, tipo, flujo, accion, step, page = 0, limit = 50 }) {
    try {
      const params = soloConValor({ fecha, tipo, flujo, accion, step, page, limit });
      const response = await api.get('/metricas-latencia/registros', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error al obtener registros de latencia:', error);
      throw error;
    }
  }

  /**
   * Resuelve el wamid de una métrica a su conversación real.
   * @returns {{ conversationId: string, messageId: string }}
   */
  async getConversacionDeMensaje(mensajeId) {
    try {
      const response = await api.get('/metricas-latencia/conversacion-de-mensaje', {
        params: { mensajeId },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error al resolver el mensaje de una métrica:', error);
      throw error;
    }
  }
}

export default new LatenciaBotService();
