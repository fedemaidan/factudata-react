import api from './axiosConfig';

const planCobroService = {
  crearPlan: (data) => api.post('/cobros', data),

  listarPlanes: (empresaId, filters = {}) => {
    const params = { ...filters };
    return api.get(`/cobros/empresa/${empresaId}`, { params });
  },

  getPlan: (id, empresaId) =>
    api.get(`/cobros/${id}`, { params: { empresa_id: empresaId } }),

  editarPlan: (id, data) => api.put(`/cobros/${id}`, data),

  confirmarPlan: (id, data) => api.post(`/cobros/${id}/confirmar`, data),

  marcarCuotaCobrada: (planId, cuotaId, data) =>
    api.post(`/cobros/${planId}/cuotas/${cuotaId}/cobrar`, data),

  revertirCobro: (planId, cuotaId, data) =>
    api.post(`/cobros/${planId}/cuotas/${cuotaId}/revertir`, data),

  previewCAC: (fecha_base, cac_tipo = 'general') =>
    api.get('/cobros/cac-preview', { params: { fecha_base, cac_tipo } }),

  previewUSD: (fecha_base, usd_fuente = 'blue') =>
    api.get('/cobros/usd-preview', { params: { fecha_base, usd_fuente } }),

  exportarPDF: (id, empresaId) =>
    api.get(`/cobros/${id}/pdf`, { params: { empresa_id: empresaId }, responseType: 'blob' }),

  eliminarPlan: (id, empresaId) =>
    api.delete(`/cobros/${id}`, { data: { empresa_id: empresaId } }),

  editarCuota: (planId, cuotaId, data) =>
    api.put(`/cobros/${planId}/cuotas/${cuotaId}`, data),

  eliminarCuota: (planId, cuotaId, data) =>
    api.delete(`/cobros/${planId}/cuotas/${cuotaId}`, { data }),

  agregarCuota: (planId, data) =>
    api.post(`/cobros/${planId}/cuotas`, data),

  // Saldo sin asignar (Fase 4)
  asignarSaldoACuota: (planId, cuotaId, empresaId) =>
    api.post(`/cobros/${planId}/cuotas/${cuotaId}/asignar-saldo`, { empresa_id: empresaId }),

  agregarCuotaDesdeSaldo: (planId, data) =>
    api.post(`/cobros/${planId}/saldo/nueva-cuota`, data),

  ajustarTotalAlDistribuido: (planId, empresaId) =>
    api.post(`/cobros/${planId}/saldo/ajustar-total`, { empresa_id: empresaId }),

  // Ajuste manual periódico (Fase 5)
  aplicarAjusteManual: (planId, data) =>
    api.post(`/cobros/${planId}/ajuste-manual`, data),

  // Movimientos de ingreso no vinculados (para cobro por "vincular existente")
  listarMovimientosVinculables: (empresaId, proyectoId = null) =>
    api.get('/cobros/movimientos-vinculables', { params: { empresa_id: empresaId, proyecto_id: proyectoId || undefined } }),

  // Anexos / agregados (Fase 6 ronda 2)
  agregarAnexo: (planId, data) =>
    api.post(`/cobros/${planId}/anexos`, data),

  // Cashflow proyectado agregado (Fase G)
  getCashflow: (empresaId, proyectoId = null, granularidad = 'mes', { incluirHistorico = false } = {}) =>
    api.get('/cobros/cashflow', { params: { empresa_id: empresaId, proyecto_id: proyectoId || undefined, granularidad, incluir_historico: incluirHistorico || undefined } }),
};

export default planCobroService;
