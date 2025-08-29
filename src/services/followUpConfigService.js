// src/services/followUpConfigService.js
import api from './axiosConfig';

const FollowUpConfigService = {
  /**
   * Lista todos los documentos de followUpConfig
   * GET /api/follow-up-config
   */
  listar: async () => {
    try {
      const response = await api.get('/follow-up-config');
      return response.data;
    } catch (error) {
      console.error('❌ Error al listar followUpConfig:', error);
      throw error;
    }
  },

  /**
   * Crea/reescribe un documento (requiere { id, ...data })
   * POST /api/follow-up-config
   */
  crear: async (config) => {
    try {
      if (!config?.id) throw new Error('El id es obligatorio');
      const response = await api.post('/follow-up-config', config);
      if (response.status === 201) {
        console.log('✅ followUpConfig creado con éxito');
        return response.data; // { message: 'Creado', id }
      } else {
        throw new Error('No se pudo crear el followUpConfig.');
      }
    } catch (error) {
      console.error('❌ Error al crear followUpConfig:', error);
      throw error;
    }
  },

  /**
   * Actualiza campos del documento por id
   * PUT /api/follow-up-config/:id
   */
  actualizar: async (id, data) => {
    try {
      if (!id) throw new Error('El id es obligatorio');
      const response = await api.put(`/follow-up-config/${encodeURIComponent(id)}`, data);
      return response.data; // objeto actualizado
    } catch (error) {
      console.error('❌ Error al actualizar followUpConfig:', error);
      throw error;
    }
  },

  /**
   * Elimina un documento por id
   * DELETE /api/follow-up-config/:id
   */
  eliminar: async (id) => {
    try {
      if (!id) throw new Error('El id es obligatorio');
      const response = await api.delete(`/follow-up-config/${encodeURIComponent(id)}`);
      return response.data; // { message: 'Eliminado', id }
    } catch (error) {
      console.error('❌ Error al eliminar followUpConfig:', error);
      throw error;
    }
  },
};

export default FollowUpConfigService;
