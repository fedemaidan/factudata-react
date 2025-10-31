import api from '../axiosConfig';

const StockMaterialesService = {
  /**
   * Crea un nuevo material
   * @param {Object} data - { nombre, SKU?, desc_material?, alias?, empresa_id? }
   * @returns {Promise<Object>}
   */
  crearMaterial: async (data) => {
    try {
    console.log('📦 Creando material con datos:', data);
      const response = await api.post('/materiales', data);
      if (response.status === 201 || response.status === 200) {
        console.log('✅ Material creado con éxito');
        return response.data;
      } else {
        throw new Error('No se pudo crear el material.');
      }
    } catch (error) {
      console.error('❌ Error al crear material:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los materiales con filtros opcionales
   * @param {Object} [params] - Ej: { nombre, SKU, empresa_id }
   * @returns {Promise<Array>}
   */
  listarMateriales: async (params = {}) => {
    try {
      const response = await api.get('/materiales', { params });
      if (response.status === 200) {
        console.log('✅ Materiales obtenidos con éxito');
        return response.data;
      } else {
        throw new Error('Error al obtener materiales.');
      }
    } catch (error) {
      console.error('❌ Error al listar materiales:', error);
      throw error;
    }
  },

  /**
   * Obtiene un material por su ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  obtenerMaterialPorId: async (id) => {
    try {
      const response = await api.get(`/materiales/${id}`);
      if (response.status === 200) {
        console.log(`✅ Material ${id} obtenido con éxito`);
        return response.data;
      } else {
        throw new Error('Error al obtener el material.');
      }
    } catch (error) {
      console.error(`❌ Error al obtener material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Modifica un material existente (PUT completo)
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  actualizarMaterial: async (id, data) => {
    try {
      const response = await api.put(`/materiales/${id}`, data);
      if (response.status === 200) {
        console.log(`✅ Material ${id} actualizado con éxito`);
        return response.data;
      } else {
        throw new Error('Error al actualizar el material.');
      }
    } catch (error) {
      console.error(`❌ Error al actualizar material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Actualiza parcialmente un material (PATCH)
   * @param {string} id
   * @param {Object} data - Campos a modificar
   * @returns {Promise<Object>}
   */
  patchMaterial: async (id, data) => {
    try {
      const response = await api.patch(`/materiales/${id}`, data);
      if (response.status === 200) {
        console.log(`✅ Material ${id} actualizado parcialmente`);
        return response.data;
      } else {
        throw new Error('Error al hacer PATCH de material.');
      }
    } catch (error) {
      console.error(`❌ Error en PATCH de material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Elimina un material por ID
   * @param {string} id
   * @returns {Promise<void>}
   */
  eliminarMaterial: async (id) => {
    try {
      const response = await api.delete(`/materiales/${id}`);
      if (response.status === 200) {
        console.log(`✅ Material ${id} eliminado con éxito`);
      } else {
        throw new Error('Error al eliminar el material.');
      }
    } catch (error) {
      console.error(`❌ Error al eliminar material ${id}:`, error);
      throw error;
    }
  },

  /**
   * Vincula un movimiento con un material y agrega alias si corresponde.
   * (Utiliza PATCH tanto en movimiento como en material)
   * @param {string} movimientoId
   * @param {string} materialId
   * @param {string} [alias]
   * @returns {Promise<void>}
   */
  vincularMovimientoAMaterial: async (movimientoId, materialId, alias) => {
    try {
      // 1) actualiza el movimiento con id_material
      const movRes = await api.patch(`/movimiento-material/${movimientoId}`, { id_material: materialId });
      if (movRes.status !== 200) throw new Error('No se pudo vincular el material al movimiento.');

      // 2) agrega alias al material (si viene)
      if (alias && alias.trim()) {
        const aliasRes = await api.patch(`/materiales/${materialId}`, { $addToSet: { alias: alias.trim() } });
        if (aliasRes.status !== 200) throw new Error('No se pudo agregar el alias al material.');
      }

      console.log(`✅ Movimiento ${movimientoId} vinculado al material ${materialId} con éxito`);
    } catch (error) {
      console.error('❌ Error al vincular movimiento con material:', error);
      throw error;
    }
  },
};

export default StockMaterialesService;
