import api from './axiosConfig';

/**
 * Desempaqueta la respuesta del backend { ok, data } → data
 */
const unwrap = (res) => {
  const payload = res?.data ?? {};
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload.data ?? {})
    : payload;
};

const ReportService = {
  /**
   * Lista todos los reportes de una empresa
   */
  list: async (empresaId) => {
    const res = await api.get('/reports', { params: { empresa_id: empresaId } });
    return unwrap(res);
  },

  /**
   * Obtiene un reporte completo por ID
   */
  getById: async (id, empresaId) => {
    const res = await api.get(`/reports/${id}`, { params: { empresa_id: empresaId } });
    return unwrap(res);
  },

  /**
   * Crea un nuevo reporte
   */
  create: async (data) => {
    const res = await api.post('/reports', data);
    return unwrap(res);
  },

  /**
   * Actualiza un reporte existente
   */
  update: async (id, data) => {
    const res = await api.put(`/reports/${id}`, data);
    return unwrap(res);
  },

  /**
   * Elimina un reporte
   */
  delete: async (id, empresaId) => {
    const res = await api.delete(`/reports/${id}`, { params: { empresa_id: empresaId } });
    return unwrap(res);
  },

  /**
   * Duplica un reporte existente
   */
  duplicate: async (id, empresaId, nombre) => {
    const res = await api.post(`/reports/${id}/duplicate`, { empresa_id: empresaId, nombre });
    return unwrap(res);
  },

  /**
   * Crea un reporte a partir de un template
   */
  createFromTemplate: async (templateId, empresaId, overrides = {}) => {
    const res = await api.post('/reports/from-template', {
      template_id: templateId,
      empresa_id: empresaId,
      ...overrides,
    });
    return unwrap(res);
  },

  /**
   * Obtiene templates disponibles
   */
  getTemplates: async (empresaId) => {
    const res = await api.get('/reports/templates', { params: { empresa_id: empresaId } });
    return unwrap(res);
  },

  /**
   * Obtiene un reporte público por token (sin auth)
   */
  getPublicByToken: async (token) => {
    const res = await api.get(`/reports/public/${token}`);
    return unwrap(res);
  },

  /**
   * Exporta un reporte a PDF enviando los resultados computados al backend.
   * Devuelve un Blob con el PDF.
   */
  exportPDF: async ({ reportConfig, results, displayCurrency, movimientosCount, filtrosTexto, cotizaciones }) => {
    const res = await api.post('/reports/export-pdf', {
      reportConfig,
      results,
      displayCurrency,
      movimientosCount,
      filtrosTexto,
      cotizaciones,
    }, { responseType: 'blob' });
    return res.data;
  },
};

export default ReportService;
