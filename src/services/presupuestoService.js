import api from './axiosConfig';

const PresupuestoService = {
  /**
   * Crea un nuevo presupuesto
   * @param {Object} presupuestoData - Datos del presupuesto
   * @returns {Promise<Object>} - Datos del presupuesto creado
   */
  crearPresupuesto: async (presupuestoData) => {
    try {
      const response = await api.post('/presupuesto', presupuestoData);
      if (response.status === 201) {
        console.log('✅ Presupuesto creado con éxito');
        console.log('Presupuesto:', response.data);
        return response.data;
      } else {
        throw new Error('No se pudo crear el presupuesto.');
      }
    } catch (error) {
      console.error('❌ Error al crear presupuesto:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los presupuestos de una empresa
   * @param {string} empresaId
   * @returns {Promise<Array>}
   */
  listarPresupuestos: async (empresaId) => {
    try {
      const response = await api.get(`/presupuesto/empresa/${empresaId}`);
      if (response.status === 200) {
        console.log('✅ Presupuestos obtenidos con éxito');
        return response.data;
      } else {
        throw new Error('Error al obtener presupuestos');
      }
    } catch (error) {
      console.error('❌ Error al listar presupuestos:', error);
      throw error;
    }
  },

  /**
   * Modifica un presupuesto existente por código
   * @param {number} codigo - Código del presupuesto
   * @param {Object} data - Datos a modificar (incluye empresa_id y nuevo_monto)
   * @returns {Promise<void>}
   */
  modificarPresupuesto: async (codigo, data) => {
    try {
      const response = await api.put(`/presupuesto/${codigo}`, data);
      if (response.status === 200) {
        console.log('✅ Presupuesto actualizado con éxito');
      } else {
        throw new Error('Error al actualizar presupuesto');
      }
    } catch (error) {
      console.error('❌ Error al modificar presupuesto:', error);
      throw error;
    }
  },
    /**
   * Recalcula el ejecutado de un presupuesto por código
   * @param {number} codigo - Código del presupuesto
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Object>} - Presupuesto actualizado
   */
    recalcularPresupuesto: async (id, empresaId) => {
      try {
        const response = await api.post(`/presupuesto/${id}/recalcular`, {
          empresa_id: empresaId,
        });
        if (response.status === 200) {
          console.log('✅ Presupuesto recalculado con éxito');
          return response.data;
        } else {
          throw new Error('Error al recalcular presupuesto');
        }
      } catch (error) {
        console.error('❌ Error al recalcular presupuesto:', error);
        throw error;
      }
    },
    
  /**
   * Elimina un presupuesto por código
   * @param {number} codigo - Código del presupuesto
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<void>}
   */
  eliminarPresupuesto: async (codigo, empresaId) => {
    try {
      const response = await api.delete(`/presupuesto/${codigo}`, {
        data: { empresa_id: empresaId },
      });
      if (response.status === 200) {
        console.log('✅ Presupuesto eliminado con éxito');
      } else {
        throw new Error('Error al eliminar presupuesto');
      }
    } catch (error) {
      console.error('❌ Error al eliminar presupuesto:', error);
      throw error;
    }
  },
};

export default PresupuestoService;
