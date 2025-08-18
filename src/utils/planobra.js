/** number -> string abreviado */
export const numberFmt = (n) => (isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-');

/** Valor planificado de materiales (sum(cant_plan * $unit_plan)) */
export const valorPlanMateriales = (materiales = []) =>
  materiales.reduce((acc, m) => acc + (Number(m.cantidad_plan || 0) * Number(m.precio_unit_plan || 0)), 0);

/** Valor ejecutado de materiales (min(cant_usada, cant_plan) * $unit_plan) */
export const valorUsadoMateriales = (materiales = []) =>
  materiales.reduce((acc, m) => {
    const cantUsada = Math.min(Number(m.cantidad_usada || 0), Number(m.cantidad_plan || 0));
    return acc + (cantUsada * Number(m.precio_unit_plan || 0));
  }, 0);

export const avanceMaterialesPct = (materiales = []) => {
  const plan = valorPlanMateriales(materiales);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((valorUsadoMateriales(materiales) / plan) * 100)));
};

/** Valor planificado de certificados (sum(monto)) */
export const valorPlanCertificados = (certificados = []) =>
  certificados.reduce((acc, c) => acc + Number(c.monto || 0), 0);

/** Valor certificado (sum(monto * %/100)) */
export const valorCertificado = (certificados = []) =>
  certificados.reduce((acc, c) => acc + (Number(c.monto || 0) * Number(c.porcentaje_certificado || 0) / 100), 0);

export const avanceCertificadosPct = (certificados = []) => {
  const plan = valorPlanCertificados(certificados);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((valorCertificado(certificados) / plan) * 100)));
};

export const planTotalEtapa = (materiales = [], certificados = []) =>
  valorPlanMateriales(materiales) + valorPlanCertificados(certificados);

export const ejecutadoEtapa = (materiales = [], certificados = []) =>
  valorUsadoMateriales(materiales) + valorCertificado(certificados);

export const avanceEtapaPct = (materiales = [], certificados = []) => {
  const plan = planTotalEtapa(materiales, certificados);
  if (plan <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((ejecutadoEtapa(materiales, certificados) / plan) * 100)));
};

export const avanceObraPct = (etapas = []) => {
  const plan = etapas.reduce((acc, e) => acc + planTotalEtapa(e.materiales, e.certificados), 0);
  if (plan <= 0) return 0;
  const ejec = etapas.reduce((acc, e) => acc + ejecutadoEtapa(e.materiales, e.certificados), 0);
  return Math.max(0, Math.min(100, Math.round((ejec / plan) * 100)));
};

export const tienePrecioFaltante = (materiales = []) =>
  materiales.some(m => (m.cantidad_plan || 0) > 0 && !m.precio_unit_plan);

export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** Merge por nombre de etapa (case-insensitive, trim). Append-only */
export const mergeEtapasAppend = (prevEtapas, nuevasEtapas) => {
  const map = new Map();
  prevEtapas.forEach(e => map.set((e.nombre || '').trim().toLowerCase(), deepClone(e)));
  nuevasEtapas.forEach(ne => {
    const key = (ne.nombre || 'sin etapa').trim().toLowerCase();
    const ex = map.get(key);
    if (ex) {
      ex.materiales = [...(ex.materiales || []), ...(ne.materiales || [])];
      ex.certificados = [...(ex.certificados || []), ...(ne.certificados || [])];
      map.set(key, ex);
    } else {
      map.set(key, { nombre: ne.nombre || 'Sin etapa', materiales: ne.materiales || [], certificados: ne.certificados || [] });
    }
  });
  return Array.from(map.values());
};
