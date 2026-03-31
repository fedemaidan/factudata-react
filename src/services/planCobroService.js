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
};

export default planCobroService;
