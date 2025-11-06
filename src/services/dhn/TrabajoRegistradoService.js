import api from '../axiosConfig';


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
    const response = await api.get(
      `/dhn/trabajo-diario-registrado/${trabajadorId}?${queryParams}`
    );
    return response.data;
  },

  getQuincenas: async () => {
    const response = await api.get('/dhn/trabajo-diario-registrado/quincenas');
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

    const response = await api.get(`/dhn/trabajo-diario-registrado?${queryParams}`);
    return response.data;
  },

  getByRange: async (fromDate, toDate, params = {}) => {
    console.log("fromDate", fromDate)
    console.log("toDate", toDate)
    console.log("params", params)
    const { limit = 500, offset = 0, estado } = params;

    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const queryParams = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      from: start.toISOString(),
      to: end.toISOString(),
    });
    if (estado) queryParams.append('estado', estado);

    const response = await api.get(`/dhn/trabajo-diario-registrado?${queryParams}`);
    console.log("response", response.data)
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/dhn/trabajo-diario-registrado/${id}`, data);
    return response.data;
  },

  getStatsByQuincena: async (quincena) => {
    const queryParams = new URLSearchParams({
      quincena
    });
    const response = await api.get(`/dhn/trabajo-diario-registrado/stats-day-by-quincena?${queryParams}`);
    return response.data;
  }
};

export default TrabajoRegistradoService;