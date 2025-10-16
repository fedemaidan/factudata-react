import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

const TrabajadorService = {
  getTrabajadorById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/api/dhn/trabajador/${id}`);
    return response.data;
  },
  
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
};

export default TrabajadorService;