import api from './axiosConfig';

const activacionRetencionService = {
  /**
   * Obtiene todas las empresas con su estado de salud para el dashboard CS.
   */
  getDashboard: async () => {
    const response = await api.get('/salud/dashboard');
    return response.data;
  },

  /**
   * Obtiene la vista completa de una empresa (onboarding, salud, métricas WA, cadena).
   */
  getVistaCompleta: async (empresaId) => {
    const response = await api.get(`/salud/vista-completa/${empresaId}`);
    return response.data;
  },

  /**
   * Obtiene el estado de salud de una empresa.
   */
  getEstadoSalud: async (empresaId) => {
    const response = await api.get(`/salud/${empresaId}`);
    return response.data;
  },

  /**
   * Lista empresas por estado de salud.
   */
  listarPorEstado: async (estado) => {
    const response = await api.get(`/salud/listar/${estado}`);
    return response.data;
  },

  /**
   * Fuerza recálculo del estado de una empresa.
   */
  recalcular: async (empresaId) => {
    const response = await api.post(`/salud/${empresaId}/recalcular`);
    return response.data;
  },

  /**
   * Obtiene métricas de sesiones WA de una empresa.
   */
  getMetricasWA: async (empresaId, dias = 30) => {
    const response = await api.get(`/flow-sessions/${empresaId}/metricas?dias=${dias}`);
    return response.data;
  },

  /**
   * Obtiene historial de salud de una empresa.
   */
  getHistorial: async (empresaId) => {
    const response = await api.get(`/salud/${empresaId}/historial`);
    return response.data;
  },
};

export default activacionRetencionService;
