// src/services/stock/vistaObraService.js
// Fase 1 — Client API para vista unificada de materiales por obra
import api from '../axiosConfig';

const VistaObraService = {
  /**
   * Obtener vista de materiales para una obra/proyecto.
   * GET /api/materiales/vista-obra/:proyectoId?empresa_id=xxx
   *
   * @param {string} proyectoId — ID del proyecto
   * @param {string} empresaId — ID de la empresa
   * @returns {{ items, total_valorizado, items_sin_precio, cantidad_pendiente_total, fuentes }}
   */
  obtenerVistaObra: async (proyectoId, empresaId) => {
    if (!proyectoId) throw new Error('proyectoId es requerido');
    if (!empresaId) throw new Error('empresaId es requerido');

    const res = await api.get(`/materiales/vista-obra/${proyectoId}`, {
      params: { empresa_id: empresaId },
    });

    const payload = res?.data ?? {};
    return payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload;
  },
};

export default VistaObraService;
