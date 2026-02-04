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

  /**
   * Agregar adicional a un presupuesto
   * @param {string} presupuestoId - ID del presupuesto
   * @param {Object} adicionalData - Datos del adicional (concepto, monto)
   * @returns {Promise<Object>} - Presupuesto actualizado
   */
  agregarAdicional: async (presupuestoId, adicionalData) => {
    try {
      const response = await api.post(`/presupuesto/${presupuestoId}/adicional`, adicionalData);
      if (response.status === 200) {
        console.log('✅ Adicional agregado con éxito');
        return response.data;
      } else {
        throw new Error('Error al agregar adicional');
      }
    } catch (error) {
      console.error('❌ Error al agregar adicional:', error);
      throw error;
    }
  },

  /**
   * Editar monto de un presupuesto (con historial)
   * @param {string} presupuestoId - ID del presupuesto
   * @param {Object} data - { nuevoMonto, motivo, creadoPor }
   * @returns {Promise<Object>}
   */
  editarPresupuesto: async (presupuestoId, data) => {
    try {
      const response = await api.put(`/presupuesto/${presupuestoId}/editar`, data);
      if (response.status === 200) {
        console.log('✅ Presupuesto editado con éxito');
        return response.data;
      } else {
        throw new Error('Error al editar presupuesto');
      }
    } catch (error) {
      console.error('❌ Error al editar presupuesto:', error);
      throw error;
    }
  },

  /**
   * Obtener resumen de presupuestos por proyecto
   * @param {string} proyectoId - ID del proyecto
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Object>} - Resumen con ingresos, egresos y totales
   */
  obtenerResumenProyecto: async (proyectoId, empresaId) => {
    try {
      const response = await api.get(`/presupuesto/proyecto/${proyectoId}/resumen?empresa_id=${empresaId}`);
      if (response.status === 200) {
        console.log('✅ Resumen de proyecto obtenido');
        return response.data;
      } else {
        throw new Error('Error al obtener resumen de proyecto');
      }
    } catch (error) {
      console.error('❌ Error al obtener resumen de proyecto:', error);
      throw error;
    }
  },

  /**
   * Eliminar presupuesto por ID de documento
   * @param {string} presupuestoId - ID del presupuesto
   * @returns {Promise<Object>}
   */
  eliminarPresupuestoPorId: async (presupuestoId) => {
    try {
      const response = await api.delete(`/presupuesto/doc/${presupuestoId}`);
      if (response.status === 200) {
        console.log('✅ Presupuesto eliminado con éxito');
        return response.data;
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


