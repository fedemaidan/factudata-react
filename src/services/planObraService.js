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
// Endpoints granulares (POR ID, no por índice)
// =========================

// Etapas
export async function addEtapa(planId, etapa) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapa`, etapa);
  return unwrap(res);             // devuelve el PLAN actualizado
}

export async function updateEtapa(planId, etapaId, etapaParcial) {
  const res = await api.patch(`/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}`, etapaParcial);
  return unwrap(res);
}
export async function deleteEtapa(planId, etapaId) {
  const res = await api.delete(`/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}`);
  return unwrap(res);
}

// Materiales
export async function addMaterial(planId, etapaId, material) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/material`, material);
  return unwrap(res);
}
export async function updateMaterial(planId, etapaId, materialId, parcial) {
  const res = await api.patch(
    `/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/material/${encodeURIComponent(materialId)}`,
    parcial
  );
  return unwrap(res);
}
export async function deleteMaterial(planId, etapaId, materialId) {
  const res = await api.delete(
    `/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/material/${encodeURIComponent(materialId)}`
  );
  return unwrap(res);
}

// Certificados
export async function addCertificado(planId, etapaId, cert) {
  const res = await api.post(`/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/certificado`, cert);
  return unwrap(res);
}
export async function updateCertificado(planId, etapaId, certId, parcial) {
  const res = await api.patch(
    `/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/certificado/${encodeURIComponent(certId)}`,
    parcial
  );
  return unwrap(res);
}
export async function deleteCertificado(planId, etapaId, certId) {
  const res = await api.delete(
    `/plan-obra/${encodeURIComponent(planId)}/etapa/${encodeURIComponent(etapaId)}/certificado/${encodeURIComponent(certId)}`
  );
  return unwrap(res);
}

// Caches
export async function recalcularPlan(proyectoId) {
  const res = await api.post(`/plan-obra/recalcular/${encodeURIComponent(proyectoId)}`);
  return unwrap(res);
}
