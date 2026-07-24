// Selecciona la variante de CAC según el modo de la empresa ('legacy' | 'estimado' | 'automatico').
// Un valor CAC puede ser un objeto { legacy, estimado, automatico } (nuevo modelo) o un número
// (docs viejos aún no backfilleados) → se devuelve tal cual. Si falta la variante pedida, cae a
// automatico → legacy → estimado.
export function pickCac(valor, modo = 'legacy') {
  if (valor == null) return null;
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'object') {
    const v = valor[modo];
    if (v != null) return v;
    return valor.automatico ?? valor.legacy ?? valor.estimado ?? null;
  }
  return null;
}

// Índice CAC de un cotizacion_snapshot según subíndice + modo. Soporta el nuevo shape
// (snapshot.cac[cacTipo][modo]) y el viejo (snapshot.cac_indice / cac_general / ...).
export function snapshotCacIndice(snapshot, cacTipo = 'general', modo = 'legacy') {
  if (!snapshot) return null;
  if (snapshot.cac && typeof snapshot.cac === 'object') {
    const v = pickCac(snapshot.cac[cacTipo] || snapshot.cac.general, modo);
    if (v != null) return v;
  }
  const viejoPorTipo = cacTipo === 'mano_obra' ? snapshot.cac_mano_obra
    : cacTipo === 'materiales' ? snapshot.cac_materiales
    : snapshot.cac_general;
  return snapshot.cac_indice ?? viejoPorTipo ?? (typeof snapshot.cac === 'number' ? snapshot.cac : null);
}

// Equivalencia CAC de un nivel de equivalencias de movimiento (total/subtotal), según el
// subíndice del presupuesto y el modo de la empresa. Soporta el shape nuevo (variantes por
// subíndice: cac / cac_mano_obra / cac_materiales como {legacy,estimado,automatico}) y el
// viejo (números). Si falta el campo del subíndice, cae al general (movs pre-subíndices).
export function equivalenciaCac(eqNivel, cacTipo = 'general', modo = 'legacy') {
  if (!eqNivel) return null;
  const campo = cacTipo === 'mano_obra' ? 'cac_mano_obra'
    : cacTipo === 'materiales' ? 'cac_materiales'
    : 'cac';
  const v = pickCac(eqNivel[campo], modo);
  if (v != null) return v;
  return campo === 'cac' ? null : pickCac(eqNivel.cac, modo);
}

export default pickCac;
