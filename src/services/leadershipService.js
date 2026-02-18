import api from './axiosConfig';

/**
 * Servicio de Leadership para métricas de reuniones semanales
 */
const leadershipService = {

  // ==================== SUSCRIPCIONES ====================

  crearSuscripcion: async (data) => {
    try {
      const response = await api.post('/leadership/suscripciones', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear suscripción:', error);
      throw error;
    }
  },

  listarSuscripciones: async (filtros = {}) => {
    try {
      const response = await api.get('/leadership/suscripciones', { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Error al listar suscripciones:', error);
      throw error;
    }
  },

  getSuscripcionByEmpresa: async (empresaId) => {
    try {
      const response = await api.get(`/leadership/suscripciones/${empresaId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener suscripción:', error);
      throw error;
    }
  },

  actualizarSuscripcion: async (id, data) => {
    try {
      const response = await api.put(`/leadership/suscripciones/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar suscripción:', error);
      throw error;
    }
  },

  cancelarSuscripcion: async (id, data) => {
    try {
      const response = await api.put(`/leadership/suscripciones/${id}/cancelar`, data);
      return response.data;
    } catch (error) {
      console.error('Error al cancelar suscripción:', error);
      throw error;
    }
  },

  reactivarSuscripcion: async (id) => {
    try {
      const response = await api.put(`/leadership/suscripciones/${id}/reactivar`);
      return response.data;
    } catch (error) {
      console.error('Error al reactivar suscripción:', error);
      throw error;
    }
  },

  eliminarSuscripcion: async (id) => {
    try {
      const response = await api.delete(`/leadership/suscripciones/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar suscripción:', error);
      throw error;
    }
  },

  getMRR: async () => {
    try {
      const response = await api.get('/leadership/suscripciones/mrr');
      return response.data;
    } catch (error) {
      console.error('Error al obtener MRR:', error);
      throw error;
    }
  },

  getDistribucionPorPlan: async () => {
    try {
      const response = await api.get('/leadership/suscripciones/distribucion-plan');
      return response.data;
    } catch (error) {
      console.error('Error al obtener distribución por plan:', error);
      throw error;
    }
  },

  getMovimientosPorMes: async (meses) => {
    try {
      const response = await api.get('/leadership/suscripciones/movimientos', { params: { meses } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener movimientos por mes:', error);
      throw error;
    }
  },

  // ==================== PAGOS ====================

  crearPago: async (data) => {
    try {
      const response = await api.post('/leadership/pagos', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  },

  generarPagosPendientes: async (mes, anio) => {
    try {
      const response = await api.post('/leadership/pagos/generar-pendientes', { periodoMes: mes, periodoAnio: anio });
      return response.data;
    } catch (error) {
      console.error('Error al generar pagos pendientes:', error);
      throw error;
    }
  },

  registrarPago: async (id, data) => {
    try {
      const response = await api.put(`/leadership/pagos/${id}/registrar`, data);
      return response.data;
    } catch (error) {
      console.error('Error al registrar pago:', error);
      throw error;
    }
  },

  getPagosPorPeriodo: async (mes, anio) => {
    try {
      const response = await api.get('/leadership/pagos/periodo', { params: { mes, anio } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener pagos por período:', error);
      throw error;
    }
  },

  getResumenCobranza: async (mes, anio) => {
    try {
      const response = await api.get('/leadership/pagos/resumen-cobranza', { params: { mes, anio } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener resumen de cobranza:', error);
      throw error;
    }
  },

  getHistorialCobros: async (meses) => {
    try {
      const response = await api.get('/leadership/pagos/historial', { params: { meses } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener historial de cobros:', error);
      throw error;
    }
  },

  marcarVencidos: async () => {
    try {
      const response = await api.post('/leadership/pagos/marcar-vencidos');
      return response.data;
    } catch (error) {
      console.error('Error al marcar vencidos:', error);
      throw error;
    }
  },

  actualizarPago: async (id, data) => {
    try {
      const response = await api.put(`/leadership/pagos/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar pago:', error);
      throw error;
    }
  },

  eliminarPago: async (id) => {
    try {
      const response = await api.delete(`/leadership/pagos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar pago:', error);
      throw error;
    }
  },

  // ==================== ACCIONES ====================

  crearAccion: async (data) => {
    try {
      const response = await api.post('/leadership/acciones', data);
      return response.data;
    } catch (error) {
      console.error('Error al crear acción:', error);
      throw error;
    }
  },

  listarAcciones: async (filtros = {}) => {
    try {
      const response = await api.get('/leadership/acciones', { params: filtros });
      return response.data;
    } catch (error) {
      console.error('Error al listar acciones:', error);
      throw error;
    }
  },

  getAccionesSemanaActual: async () => {
    try {
      const response = await api.get('/leadership/acciones/semana-actual');
      return response.data;
    } catch (error) {
      console.error('Error al obtener acciones de la semana:', error);
      throw error;
    }
  },

  actualizarAccion: async (id, data) => {
    try {
      const response = await api.put(`/leadership/acciones/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar acción:', error);
      throw error;
    }
  },

  cambiarEstadoAccion: async (id, estado, resultado) => {
    try {
      const response = await api.put(`/leadership/acciones/${id}/estado`, { estado, resultado });
      return response.data;
    } catch (error) {
      console.error('Error al cambiar estado de acción:', error);
      throw error;
    }
  },

  eliminarAccion: async (id) => {
    try {
      const response = await api.delete(`/leadership/acciones/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar acción:', error);
      throw error;
    }
  },

  getDashboardAcciones: async () => {
    try {
      const response = await api.get('/leadership/acciones/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error al obtener dashboard de acciones:', error);
      throw error;
    }
  },

  getResumenPorOwner: async () => {
    try {
      const response = await api.get('/leadership/acciones/resumen-owners');
      return response.data;
    } catch (error) {
      console.error('Error al obtener resumen por owner:', error);
      throw error;
    }
  },

  getSemanas: async () => {
    try {
      const response = await api.get('/leadership/acciones/semanas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener semanas:', error);
      throw error;
    }
  },

  getAccionesVencidas: async () => {
    try {
      const response = await api.get('/leadership/acciones/vencidas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener acciones vencidas:', error);
      throw error;
    }
  },

  // ==================== ANALYTICS: RETENCIÓN ====================

  getCohortes: async (meses = 6) => {
    try {
      const response = await api.get('/leadership/analytics/retencion/cohortes', { params: { meses } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener cohortes:', error);
      throw error;
    }
  },

  getInactivas: async (dias = 14) => {
    try {
      const response = await api.get('/leadership/analytics/retencion/inactivas', { params: { dias } });
      return response.data;
    } catch (error) {
      console.error('Error al obtener inactivas:', error);
      throw error;
    }
  },

  // ==================== ANALYTICS: VENTAS / FUNNEL ====================

  getFunnel: async (fechaDesde, fechaHasta) => {
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde.toISOString();
      if (fechaHasta) params.fechaHasta = fechaHasta.toISOString();
      const response = await api.get('/leadership/analytics/ventas/funnel', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener funnel:', error);
      throw error;
    }
  },

  getMetricasPorCanal: async (fechaDesde, fechaHasta) => {
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde.toISOString();
      if (fechaHasta) params.fechaHasta = fechaHasta.toISOString();
      const response = await api.get('/leadership/analytics/ventas/por-canal', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener métricas por canal:', error);
      throw error;
    }
  },

  getMetricasPorSDR: async (fechaDesde, fechaHasta) => {
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde.toISOString();
      if (fechaHasta) params.fechaHasta = fechaHasta.toISOString();
      const response = await api.get('/leadership/analytics/ventas/por-sdr', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener métricas por SDR:', error);
      throw error;
    }
  },

  getDashboardVentas: async (fechaDesde, fechaHasta) => {
    try {
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde.toISOString();
      if (fechaHasta) params.fechaHasta = fechaHasta.toISOString();
      const response = await api.get('/leadership/analytics/ventas/dashboard', { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener dashboard de ventas:', error);
      throw error;
    }
  },

  // ==================== ANALYTICS: RESUMEN EJECUTIVO ====================

  getResumenEjecutivo: async () => {
    try {
      const response = await api.get('/leadership/analytics/resumen');
      return response.data;
    } catch (error) {
      console.error('Error al obtener resumen ejecutivo:', error);
      throw error;
    }
  },

  getKPIsExpress: async () => {
    try {
      const response = await api.get('/leadership/analytics/kpis');
      return response.data;
    } catch (error) {
      console.error('Error al obtener KPIs express:', error);
      throw error;
    }
  },

  getDashboardReunion: async () => {
    try {
      const response = await api.get('/leadership/analytics/dashboard-reunion');
      return response.data;
    } catch (error) {
      console.error('Error al obtener dashboard de reunión:', error);
      throw error;
    }
  }
};

export default leadershipService;
