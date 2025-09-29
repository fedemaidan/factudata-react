import api from './axiosConfig';

const base = '/asignaciones-material';

const AsignacionMaterialService = {
  async create(payload) {
    // payload = { plan_id, etapa_id, material_id, movimiento_material_id, cantidad_asignada, monto_asignado, usuario_id }
    try {
      const { data } = await api.post(base + '/', payload);
      return data; // { ok, data }
    }
    catch (e) {
      return { ok: false, error: e?.response?.data?.error};
    }
  },

  async listByPlan(planId, params = {}) {
    // params puede tener etapa_id, material_id, limit, cursor
    const { data } = await api.get(`${base}/plan/${encodeURIComponent(planId)}`, { params });
    return data;
  },

  async listByMovimiento(mmId, params = {}) {
    const { data } = await api.get(`${base}/movimiento/${encodeURIComponent(mmId)}`, { params });
    return data;
  },

  async update(id, patch) {
    try {
      const { data } = await api.patch(`${base}/${encodeURIComponent(id)}`, patch);
      return data;
    }
    catch (e) {
      return { ok: false, error: e?.response?.data?.error};
    }
  },

  async remove(id) {
    try {
      const { data } = await api.delete(`${base}/${encodeURIComponent(id)}`);
      return data;
    }
    catch (e) {
      return { ok: false, error: e?.response?.data?.error};
    }
  },
};

export default AsignacionMaterialService;
