// src/services/materialService.js
import api from './axiosConfigStock';

const materialService = {
  // Obtener todos los materiales
  getAllMateriales: async () => {
    try {
      const response = await api.get('/materiales');
      return response.data;
    } catch (err) {
      console.error('Error al obtener los materiales:', err);
      return [];
    }
  },

  // Obtener un material por ID
  getMaterialById: async (materialId) => {
    try {
      const response = await api.get(`/materiales/${materialId}`);
      return response.data;
    } catch (err) {
      console.error('Error al obtener el material:', err);
      return null;
    }
  },

  // Crear un nuevo material
  createMaterial: async (materialData) => {
    try {
      const response = await api.post('/materiales', materialData);
      return response.data;
    } catch (err) {
      console.error('Error al crear el material:', err);
      return null;
    }
  },

  // Actualizar un material existente
  updateMaterial: async (materialId, materialData) => {
    try {
      const response = await api.put(`/materiales/${materialId}`, materialData);
      return response.data;
    } catch (err) {
      console.error('Error al actualizar el material:', err);
      return null;
    }
  },

  // Eliminar un material
  deleteMaterialById: async (materialId) => {
    try {
      const response = await api.delete(`/materiales/${materialId}`);
      return response.data;
    } catch (err) {
      console.error('Error al eliminar el material:', err);
      return null;
    }
  },
};

export default materialService;
