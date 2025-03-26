import api from './axiosConfig';

const AcopioService = {

       subirCSVAcopio: async (empresaId, proveedor, codigoAcopio, proyectoId, archivo) => {
        try {
          const formData = new FormData();
          formData.append('archivo', archivo);
          formData.append('empresaId', empresaId);
          formData.append('proveedor', proveedor);
          formData.append('codigoAcopio', codigoAcopio);
          formData.append('proyectoId', proyectoId);
      
          const response = await api.post(`/acopio/create-by-file`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
      
          return response.data;
        } catch (err) {
          console.error('Error al subir el archivo CSV para acopio:', err);
          throw err;
        }
      },
      

  /**
   * Obtiene la lista de acopios de una empresa
   * @param {string} empresaId - ID de la empresa
   * @returns {Promise<Array>}
   */
  listarAcopios: async (empresaId) => {
    try {
      const response = await api.get(`acopio/listar/${empresaId}`);
      if (response.status === 200) {
        console.log('Acopios obtenidos con éxito');
        return response.data;
      } else {
        console.error('Error al obtener acopios');
        return [];
      }
    } catch (err) {
      console.error('Error al obtener acopios:', err);
      return [];
    }
  },

  /**
   * Obtiene los detalles de un acopio específico
   * @param {string} acopioId - ID del acopio
   * @returns {Promise<Object | null>}
   */
  obtenerAcopio: async (acopioId) => {
    try {
      const response = await api.get(`acopio/${acopioId}`);
      if (response.status === 200) {
        console.log('Acopio obtenido con éxito');
        return response.data;
      } else {
        console.error('Error al obtener el acopio');
        return null;
      }
    } catch (err) {
      console.error('Error al obtener el acopio:', err);
      return null;
    }
  },

  /**
   * Agrega un nuevo movimiento a un acopio
   * @param {string} acopioId - ID del acopio
   * @param {Object} movimiento - Datos del movimiento (codigo, descripcion, cantidad, valor_unitario, tipo)
   * @returns {Promise<boolean>}
   */
  agregarMovimiento: async (acopioId, movimiento) => {
    try {
      const response = await api.post(`acopio/${acopioId}/movimiento`, movimiento);
      if (response.status === 201) {
        console.log('Movimiento agregado con éxito');
        return true;
      } else {
        console.error('Error al agregar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al agregar movimiento:', err);
      return false;
    }
  },

  /**
   * Modifica un movimiento existente en un acopio
   * @param {string} acopioId - ID del acopio
   * @param {string} movimientoId - ID del movimiento
   * @param {Object} datosActualizados - Campos a actualizar en el movimiento
   * @returns {Promise<boolean>}
   */
  modificarMovimiento: async (acopioId, movimientoId, datosActualizados) => {
    try {
      const response = await api.put(`acopio/${acopioId}/movimiento/${movimientoId}`, datosActualizados);
      if (response.status === 200) {
        console.log('Movimiento actualizado con éxito');
        return true;
      } else {
        console.error('Error al modificar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al modificar movimiento:', err);
      return false;
    }
  },

  /**
   * Elimina un movimiento de un acopio
   * @param {string} acopioId - ID del acopio
   * @param {string} movimientoId - ID del movimiento
   * @returns {Promise<boolean>}
   */
  eliminarMovimiento: async (acopioId, movimientoId) => {
    try {
      const response = await api.delete(`acopio/${acopioId}/movimiento/${movimientoId}`);
      if (response.status === 200) {
        console.log('Movimiento eliminado con éxito');
        return true;
      } else {
        console.error('Error al eliminar movimiento');
        return false;
      }
    } catch (err) {
      console.error('Error al eliminar movimiento:', err);
      return false;
    }
  },

  /**
       * Obtiene los movimientos de un acopio específico.
       * @param {string} acopioId - ID del acopio.
       * @returns {Promise<Array>} - Lista de movimientos.
       */
      obtenerMovimientos: async (acopioId) => {
        try {
          const response = await api.get(`/acopio/${acopioId}/movimientos`);
          return response.data;
        } catch (error) {
          console.error('Error al obtener movimientos del acopio:', error);
          return [];
        }
      },
};

export default AcopioService;
