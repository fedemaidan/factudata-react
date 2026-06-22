// Detecta solapamientos de un certificado en armado contra otros certificados
// pendientes (borrador/enviado) de la obra. `selUids` = sub-rubros que el nuevo
// certificado va a tocar. Devuelve:
//   - porSubrubro: { uid: [certs pendientes que ya lo incluyen] }
//   - avisos: [{ cert, rel }] con la relación (subconjunto / superconjunto / parcial)
export function solapamientos(certs, selUids, excludeId = null) {
  const pendientes = (certs || []).filter((c) => ['borrador', 'enviado'].includes(c.estado) && c._id !== excludeId);
  const porSubrubro = {};
  pendientes.forEach((c) => (c.lineas || []).forEach((l) => {
    (porSubrubro[l.subrubro_uid] = porSubrubro[l.subrubro_uid] || []).push(c);
  }));
  const sel = new Set(selUids);
  const avisos = [];
  pendientes.forEach((c) => {
    const pend = new Set((c.lineas || []).map((l) => l.subrubro_uid));
    const comunes = [...sel].filter((u) => pend.has(u));
    if (comunes.length === 0) return;
    const subset = comunes.length === sel.size; // todo lo de éste ya está en el otro
    const superset = comunes.length === pend.size; // éste cubre todo lo del otro
    let rel = `comparte ${comunes.length} tarea(s)`;
    if (subset && superset) rel = 'cubre exactamente las mismas tareas';
    else if (subset) rel = 'ya cubre todas estas tareas';
    else if (superset) rel = 'éste cubre todo lo de ese y además otras';
    avisos.push({ cert: c, rel });
  });
  return { porSubrubro, avisos };
}
