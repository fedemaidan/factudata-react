/**
 * Helpers del módulo legacy de presupuestos (page `presupuestos.js` + `PresupuestoDrawer`).
 * NO confundir con el módulo "presupuestos profesionales".
 */

export function getClasificacionesEfectivas(presupuesto) {
  if (!presupuesto) return [];
  if (Array.isArray(presupuesto.clasificaciones) && presupuesto.clasificaciones.length > 0) {
    return presupuesto.clasificaciones.map((c) => ({
      categoria: c.categoria,
      subcategorias: Array.isArray(c.subcategorias) ? [...c.subcategorias] : [],
    }));
  }
  if (presupuesto.categoria && presupuesto.subcategoria) {
    return [{ categoria: presupuesto.categoria, subcategorias: [presupuesto.subcategoria] }];
  }
  if (presupuesto.categoria) {
    return [{ categoria: presupuesto.categoria, subcategorias: [] }];
  }
  return [];
}

export function normalizarClasificacionesUI(clasif) {
  if (!Array.isArray(clasif)) return [];
  const map = new Map();
  for (const c of clasif) {
    if (!c || !c.categoria) continue;
    const cat = String(c.categoria).trim();
    if (!cat) continue;
    const subs = Array.isArray(c.subcategorias)
      ? Array.from(new Set(c.subcategorias.map((s) => String(s || '').trim()).filter(Boolean)))
      : [];
    if (map.has(cat)) {
      const prev = map.get(cat);
      map.set(cat, Array.from(new Set([...prev, ...subs])));
    } else {
      map.set(cat, subs);
    }
  }
  return Array.from(map.entries()).map(([categoria, subcategorias]) => ({ categoria, subcategorias }));
}

export function coincideMovimientoConClasificaciones(presupuesto, mov) {
  const clasif = getClasificacionesEfectivas(presupuesto);
  if (clasif.length === 0) return true;
  return clasif.some((c) => {
    if (c.categoria !== mov.categoria) return false;
    if (c.subcategorias.length === 0) return true;
    return c.subcategorias.includes(mov.subcategoria);
  });
}

export function formatClasificacionesText(clasif) {
  if (!Array.isArray(clasif) || clasif.length === 0) return '';
  return clasif
    .map((c) =>
      c.subcategorias.length === 0
        ? `${c.categoria} (todas)`
        : `${c.categoria} › ${c.subcategorias.join(', ')}`
    )
    .join(' | ');
}
