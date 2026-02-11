import api from './axiosConfig';

const FiltrosGuardadosService = {
  /**
   * Obtener filtros guardados para un proyecto
   * @param {string} proyectoId
   * @param {string} empresaId
   * @returns {Promise<Array>}
   */
  listar: async (proyectoId, empresaId) => {
    const res = await api.get('/filtros-guardados', {
      params: { proyecto_id: proyectoId, empresa_id: empresaId },
    });
    return res.data;
  },

  /**
   * Crear un filtro guardado
   * @param {Object} data - { proyecto_id, empresa_id, nombre, filtros, creado_por }
   * @returns {Promise<Object>}
   */
  crear: async (data) => {
    const res = await api.post('/filtros-guardados', data);
    return res.data;
  },

  /**
   * Toggle default de un filtro guardado
   * @param {string} id - _id del filtro
   * @returns {Promise<Object>}
   */
  toggleDefault: async (id) => {
    const res = await api.put(`/filtros-guardados/${id}/default`);
    return res.data;
  },

  /**
   * Eliminar un filtro guardado
   * @param {string} id - _id del filtro
   * @returns {Promise<Object>}
   */
  eliminar: async (id) => {
    const res = await api.delete(`/filtros-guardados/${id}`);
    return res.data;
  },
};

export default FiltrosGuardadosService;
