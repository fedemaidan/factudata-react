import api from './axiosConfig';

// Helper para respuestas { ok, data }
const unwrap = (res) => {
  const d = res?.data;
  if (d?.ok) return d.data;     // devolvemos el plan (objeto), no el wrapper
  throw new Error(d?.error || 'Error desconocido');
};

export async function getPlanObra(proyectoId, opts = {}) {
  try {
    const { signal } = opts;
    const res = await api.get(`/plan-obra/${encodeURIComponent(proyectoId)}`, { signal });
    return unwrap(res); // 👉 devuelve el plan directamente
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export async function upsertPlanObra(proyectoId, payload, opts = {}) {
    const { signal } = opts;
    const body = { ...payload, proyecto_id: proyectoId };
    const res = await api.post(`/plan-obra`, body, { signal });
    return unwrap(res); // 👉 devuelve el plan directamente
  }

// =========================
// Endpoints granulares
// =========================
// Etapas
export async function addEtapa(planId, etapa) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapas`, etapa);
  return unwrap(res); // devuelve plan actualizado o la etapa según tu service; asumo plan
}
export async function updateEtapa(planId, etapaIndex, etapaParcial) {
  const res = await api.patch(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}`, etapaParcial);
  return unwrap(res);
}
export async function deleteEtapa(planId, etapaIndex) {
  const res = await api.delete(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}`);
  return unwrap(res);
}

// Materiales
export async function addMaterial(planId, etapaIndex, material) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/materiales`, material);
  return unwrap(res);
}
export async function updateMaterial(planId, etapaIndex, materialIndex, parcial) {
  const res = await api.patch(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/materiales/${materialIndex}`, parcial);
  return unwrap(res);
}
export async function deleteMaterial(planId, etapaIndex, materialIndex) {
  const res = await api.delete(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/materiales/${materialIndex}`);
  return unwrap(res);
}

// Certificados
export async function addCertificado(planId, etapaIndex, certificado) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/certificados`, certificado);
  return unwrap(res);
}
export async function updateCertificado(planId, etapaIndex, certIndex, parcial) {
  const res = await api.patch(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/certificados/${certIndex}`, parcial);
  return unwrap(res);
}
export async function deleteCertificado(planId, etapaIndex, certIndex) {
  const res = await api.delete(`/plan-obra/${encodeURIComponent(planId)}/etapas/${etapaIndex}/certificados/${certIndex}`);
  return unwrap(res);
}

// Caches
export async function recalcularPlan(proyectoId) {
  const res = await api.post(`/plan-obra/recalcular/${encodeURIComponent(proyectoId)}`);
  return unwrap(res);
}
