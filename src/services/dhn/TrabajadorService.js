import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

const TrabajadorService = {
  getTrabajadorById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/api/dhn/trabajadores/${id}`);
    return response.data;
  },

  getAll: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/dhn/trabajadores`);
    console.log('response', response.data);
    return response.data;
  },

  create: async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/dhn/trabajadores`, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/dhn/trabajadores/${id}`, data);
    return response.data;
  }
}

export default TrabajadorService;