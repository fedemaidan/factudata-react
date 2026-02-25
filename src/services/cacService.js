import api from './axiosConfig';

const cacService = {
  /**
   * Obtener índice CAC del mes actual
   * @returns {Promise<{ fecha: string, general: number, mano_obra: number, materiales: number }>}
   */
  getCacActual: async () => {
    const response = await api.get('/monedas/cac/actual');
    return response.data;
  },

  /**
   * Obtener índice CAC para un mes específico
   * @param {string} fecha - formato YYYY-MM
   * @returns {Promise<{ fecha: string, general: number, mano_obra: number, materiales: number }>}
   */
  getCacPorFecha: async (fecha) => {
    const response = await api.get(`/monedas/cac/${encodeURIComponent(fecha)}`);
    return response.data;
  },
};

export default cacService;
