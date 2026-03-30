/** Superficie ponderada (m²) para costos / promedios en PDF y UI. */
export function getM2BaseFromPresupuesto(presupuesto) {
  const analisis = presupuesto?.analisis_superficies;
  if (!analisis) return 0;
  const cubierta = Number(analisis.sup_cubierta_m2) || 0;
  const patios = Number(analisis.sup_patios_m2) || 0;
  const coefPatios = Number(analisis.coef_patios) >= 0 ? (Number(analisis.coef_patios) || 0.5) : 0.5;
  const vereda = Number(analisis.sup_vereda_m2) || 0;
  const coefVereda = Number(analisis.coef_vereda) >= 0 ? (Number(analisis.coef_vereda) || 0.25) : 0.25;
  const ponderadaOriginal = Number(analisis.sup_ponderada_m2) || 0;
  return ponderadaOriginal || cubierta + patios * coefPatios + vereda * coefVereda || 0;
}
