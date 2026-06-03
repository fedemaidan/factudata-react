// src/services/materialService.js
import api from './axiosConfigStock';

const materialService = {
  // Buscar materiales por nombre (para autocomplete)
  searchMateriales: async (empresaId, q) => {
    try {
      const response = await api.get('/materiales', {
        params: { empresa_id: empresaId, nombre: q, limit: 20 },
      });
      return response.data?.items || response.data?.data || [];
    } catch (err) {
      console.error('Error al buscar materiales:', err);
      return [];
    }
  },

  // Stock real por sucursal (+ sin asignar) para varios materiales.
  // Devuelve { [material_id]: { total, sucursales: [{ sucursal_id, stock }] } }
  getStockPorSucursal: async (empresaId, materialIds = []) => {
    const ids = (Array.isArray(materialIds) ? materialIds : [materialIds]).filter(Boolean);
    if (!ids.length) return {};
    try {
      const response = await api.get('/materiales/stock/por-sucursal', {
        params: { empresa_id: empresaId, material_ids: ids.join(',') },
      });
      return response.data?.data || {};
    } catch (err) {
      console.error('Error al obtener stock por sucursal:', err);
      return {};
    }
  },

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
