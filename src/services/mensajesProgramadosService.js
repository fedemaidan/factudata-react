import api from './axiosConfig';

const mensajesProgramadosService = {
  createMensaje: async (data) => {
    const response = await api.post('/mensajes-programados', data);
    return response.data;
  },
  getMensajes: async (params = {}) => {
    // Si no se especifica limit, traer todos (o un número grande)
    const defaultParams = { limit: 1000, ...params };
    const response = await api.get('/mensajes-programados', { params: defaultParams });
    return response.data;
  },
  updateMensaje: async (id, data) => {
    const response = await api.patch(`/mensajes-programados/${id}`, data);
    return response.data;
  },
  deleteMensaje: async (id) => {
    const response = await api.delete(`/mensajes-programados/${id}`);
    return response.data;
  }
};

export default mensajesProgramadosService;
