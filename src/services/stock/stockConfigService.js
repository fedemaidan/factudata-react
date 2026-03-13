// src/services/stock/stockConfigService.js
// Fase T — Client API para configuración de stock por empresa
import api from '../axiosConfig';

const StockConfigService = {
  /**
   * Confirmar una solicitud pendiente de confirmación.
   * PUT /api/solicitud-material/:solicitudId/confirmar
   *
   * @param {string} solicitudId
   * @returns {{ solicitud, movimientos }}
   */
  confirmarSolicitud: async (solicitudId) => {
    if (!solicitudId) throw new Error('solicitudId es requerido');
    const res = await api.put(`/solicitud-material/${solicitudId}/confirmar`);
    const payload = res?.data ?? {};
    return payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload;
  },
};

export default StockConfigService;
