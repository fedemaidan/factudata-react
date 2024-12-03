import api from './axiosConfig';

const principioActivoService = {
  // Obtener un principio activo por su ID
  getPrincipioActivoById: async (principioActivoId) => {
    try {
      const response = await api.get(`/principio-activo/${principioActivoId}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener el principio activo:', err);
      return null;
    }
  },

  // Obtener todos los principios activos
  getAllPrincipiosActivos: async () => {
    try {
      const response = await api.get('/principio-activo');
      return response.data;
    } catch (err) {
      console.error('Error al obtener los principios activos:', err);
      return [];
    }
  },

  // Crear un nuevo principio activo
  createPrincipioActivo: async (principioActivoData) => {
    try {
      const response = await api.post('/principio-activo', principioActivoData);
      return response.data;
    } catch (err) {
      console.error('Error al crear el principio activo:', err);
      return null;
    }
  },

  // Actualizar un principio activo
  updatePrincipioActivo: async (principioActivoId, principioActivoData) => {
    try {
        console.log(principioActivoData)
      const response = await api.put(`/principio-activo/${principioActivoId}`, principioActivoData);
      return response.data;
    } catch (err) {
      console.error('Error al actualizar el principio activo:', err);
      return null;
    }
  },

  // Eliminar un principio activo
  deletePrincipioActivoById: async (principioActivoId) => {
    try {
      const response = await api.delete(`/principio-activo/${principioActivoId}`);
      return response.data;
    } catch (err) {
      console.error('Error al eliminar el principio activo:', err);
      return null;
    }
  },
};

export default principioActivoService;
