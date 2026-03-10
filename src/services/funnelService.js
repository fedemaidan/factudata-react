import api from './axiosConfig';

const funnelService = {
  /**
   * Funnel de Conversión Producto
   * @param {{ desde: string, hasta: string, segmento?: string, sdrAsignado?: string }} params
   */
  async getConversionProducto(params) {
    const res = await api.get('/funnel/conversion-producto', { params });
    return res.data;
  },

  /**
   * Funnel de Pipeline Comercial
   * @param {{ desde: string, hasta: string, segmento?: string, sdrAsignado?: string }} params
   */
  async getPipelineComercial(params) {
    const res = await api.get('/funnel/pipeline-comercial', { params });
    return res.data;
  },
};

export default funnelService;
