import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

const TrabajoRegistradoService = {
  getTrabajoRegistradoByTrabajadorId: async (trabajadorId, params = {}) => {
    const { limit = 200, offset = 0, from, to, estado } = params;
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (from) queryParams.append('from', from);
    if (to) queryParams.append('to', to);
    if (estado) queryParams.append('estado', estado);
    const response = await axios.get(
      `${API_BASE_URL}/api/dhn/trabajo-diario-registrado/${trabajadorId}?${queryParams}`
    );
    return response.data;
  },


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

  update: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/dhn/trabajo-diario-registrado/${id}`, data);
    return response.data;
  }
};

export default TrabajoRegistradoService;