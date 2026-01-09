import api from './axiosConfig';

const MonedasService = {
  // ========================
  // DÓLAR HISTORIAL
  // ========================

  /**
   * Listar histórico de dólar
   * @param {Object} params - { from, to, limit } (from/to en formato YYYY-MM-DD)
   */
  listarDolar: async (params = {}) => {
    const res = await api.get('/monedas/dolar', { params });
    return res.data;
  },

  /**
   * Obtener dólar para una fecha específica
   * @param {string} fecha - formato YYYY-MM-DD
   */
  obtenerDolar: async (fecha) => {
    const res = await api.get(`/monedas/dolar/${encodeURIComponent(fecha)}`);
    return res.data;
  },

  /**
   * Crear/actualizar valores de dólar para una fecha
   * @param {Object} data - { fecha, oficial, blue, mep }
   */
  crearDolar: async (data) => {
    const res = await api.post('/monedas/dolar', data);
    return res.data;
  },

  /**
   * Actualizar valores de dólar para una fecha
   * @param {string} fecha - formato YYYY-MM-DD
   * @param {Object} data - { oficial, blue, mep }
   */
  actualizarDolar: async (fecha, data) => {
    const res = await api.put(`/monedas/dolar/${encodeURIComponent(fecha)}`, data);
    return res.data;
  },

  /**
   * Eliminar registro de dólar
   * @param {string} fecha - formato YYYY-MM-DD
   */
  eliminarDolar: async (fecha) => {
    const res = await api.delete(`/monedas/dolar/${encodeURIComponent(fecha)}`);
    return res.data;
  },

  // ========================
  // CAC INDICES
  // ========================

  /**
   * Listar histórico de índices CAC
   * @param {Object} params - { from, to, limit } (from/to en formato YYYY-MM)
   */
  listarCAC: async (params = {}) => {
    const res = await api.get('/monedas/cac', { params });
    return res.data;
  },

  /**
   * Obtener índice CAC para un mes específico
   * @param {string} fecha - formato YYYY-MM
   */
  obtenerCAC: async (fecha) => {
    const res = await api.get(`/monedas/cac/${encodeURIComponent(fecha)}`);
    return res.data;
  },

  /**
   * Crear/actualizar índice CAC para un mes
   * @param {Object} data - { fecha, general, materiales, mano_obra }
   */
  crearCAC: async (data) => {
    const res = await api.post('/monedas/cac', data);
    return res.data;
  },

  /**
   * Actualizar índice CAC para un mes
   * @param {string} fecha - formato YYYY-MM
   * @param {Object} data - { general, materiales, mano_obra }
   */
  actualizarCAC: async (fecha, data) => {
    const res = await api.put(`/monedas/cac/${encodeURIComponent(fecha)}`, data);
    return res.data;
  },

  /**
   * Eliminar índice CAC
   * @param {string} fecha - formato YYYY-MM
   */
  eliminarCAC: async (fecha) => {
    const res = await api.delete(`/monedas/cac/${encodeURIComponent(fecha)}`);
    return res.data;
  },
};

export default MonedasService;
