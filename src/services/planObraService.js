import api from './axiosConfig';

export async function getPlanObra(proyectoId, opts = {}) {
  try {
    const { signal } = opts;
    const { data } = await api.get(`/plan-obra/${encodeURIComponent(proyectoId)}`, { signal });
    return data; // plan
  } catch (err) {
    if (err?.response?.status === 404) return null; // 👈 no existe el plan
    throw err;
  }
}

export async function upsertPlanObra(proyectoId, payload, opts = {}) {
  const { signal } = opts;
  payload.proyecto_id = proyectoId; // forzar
  const { data } = await api.post(`/plan-obra/`, payload, { signal });
  return data;
}
