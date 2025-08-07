import api from './axiosConfig';

const cache = new Map();
const TTL_MS = 15 * 60 * 1000; // 15 minutos

const getCacheKey = (params) => {
  const { monto, moneda_origen, moneda_destino, fecha, tipo_dolar } = params;
  return JSON.stringify({ monto, moneda_origen, moneda_destino, fecha, tipo_dolar });
};

const ConversorMonedaService = {
  /**
   * Convierte un monto entre monedas con lógica CAC y Dólar incluida.
   * @param {Object} params
   * @param {number} params.monto - Monto original
   * @param {string} params.moneda_origen - Moneda desde (ARS, USD, CAC)
   * @param {string} params.moneda_destino - Moneda destino (ARS, USD, CAC)
   * @param {string} [params.fecha] - Fecha de referencia (YYYY-MM-DD). Si no se envía, se toma hoy.
   * @param {string} [params.tipo_dolar] - Tipo de dólar (ej: BLUE_VENTA, OFICIAL_MEDIO)
   * @returns {Promise<Object>} resultado: { monto_convertido, detalle, fecha_utilizada }
   */
  convertirMoneda: async (params) => {
    const cacheKey = getCacheKey(params);
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.resultado;
    }

    try {
      const response = await api.post('/conversor/convertir', params);
      const resultado = response.data;

      cache.set(cacheKey, {
        timestamp: Date.now(),
        resultado
      });

      return resultado;
    } catch (error) {
      console.error('❌ Error en ConversorMonedaService.convertirMoneda:', error);
      throw error;
    }
  }
};

export default ConversorMonedaService;
