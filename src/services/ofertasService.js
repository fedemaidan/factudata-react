import api from './axiosConfig';

const ofertasService = {
  // Obtener una oferta por su ID
  getOfertaById: async (ofertaId) => {
    try {
      const response = await api.get(`/oferta/${ofertaId}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener la oferta:', err);
      return null;
    }
  },

  // Obtener todas las ofertas
  getAllOfertas: async () => {
    try {
      const response = await api.get('/oferta');
      return response.data;
    } catch (err) {
      console.error('Error al obtener las ofertas:', err);
      return [];
    }
  },

  // Crear una nueva oferta
  createOferta: async (ofertaData) => {
    try {
      const response = await api.post('/oferta', ofertaData);
      return response.data;
    } catch (err) {
      console.error('Error al crear la oferta:', err);
      return null;
    }
  },

  // Actualizar una oferta
  updateOferta: async (ofertaId, ofertaData) => {
    try {
      const response = await api.put(`/oferta/${ofertaId}`, ofertaData);
      return response.data;
    } catch (err) {
      console.error('Error al actualizar la oferta:', err);
      return null;
    }
  },

  // Eliminar una oferta
  deleteOfertaById: async (ofertaId) => {
    try {
      const response = await api.delete(`/oferta/${ofertaId}`);
      return response.data;
    } catch (err) {
      console.error('Error al eliminar la oferta:', err);
      return null;
    }
  },
};

export default ofertasService;
