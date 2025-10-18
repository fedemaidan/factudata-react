import api from '../axiosConfig';

const TrabajadorService = {
  getTrabajadorById: async (id) => {
    const response = await api.get(`/dhn/trabajadores/${id}`);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get(`/dhn/trabajadores`);
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