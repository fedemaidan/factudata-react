import api from '../axiosConfig';

const TrabajadorService = {
  getTrabajadorById: async (id) => {
    const response = await api.get(`/dhn/trabajadores/${id}`);
    return response.data;
  },

  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params.q) {
      queryParams.append('q', params.q);
    }
    const queryString = queryParams.toString();
    const url = queryString ? `/dhn/trabajadores?${queryString}` : `/dhn/trabajadores`;
    const response = await api.get(url);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(`/dhn/trabajadores`, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/dhn/trabajadores/${id}`, data);
    return response.data;
  }
}

export default TrabajadorService;