import api from './axiosConfig';

/**
 * Compromisos por material — vista "qué entregar" (vertical corralón).
 * Agrupa el material comprometido por material/semana. Ver §2 de la propuesta.
 */
const compromisosService = {
  /**
   * @param {string} empresaId
   * @param {object} filtros - { sucursal_id?, desde?, hasta? }
   * @returns {Promise<{ con_fecha: Array, a_demanda: Array }>}
   */
  async porMaterial(empresaId, filtros = {}) {
    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const params = qs.toString() ? `?${qs.toString()}` : '';
    const { data } = await api.get(`/empresa/${empresaId}/materiales/compromisos${params}`);
    return data;
  },
};

export default compromisosService;
