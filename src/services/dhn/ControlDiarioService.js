import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

const ControlDiarioService = {
  /**
   * Obtiene trabajo registrado para un día (from/to = mismo día)
   * @param {Date|string} date - fecha base
   * @param {{ limit?: number, offset?: number, estado?: string }} params
   */
  getByDay: async (date, params = {}) => {
    const { limit = 500, offset = 0, estado } = params;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      from: start.toISOString(),
      to: end.toISOString(),
    });
    if (estado) queryParams.append('estado', estado);

    const response = await axios.get(`${API_BASE_URL}/api/dhn/trabajo-diario-registrado?${queryParams}`);
    return response.data;
  },
};

export default ControlDiarioService;


