// Filtro + orden client-side reutilizable para las vistas de cartera (Cobranzas, Pagos a obra).

// Obras únicas presentes en los ítems → [{ id, titulo }] ordenadas por título.
export function obrasDeItems(items = []) {
  const map = new Map();
  for (const i of items) {
    if (i.obra_id && !map.has(i.obra_id)) map.set(i.obra_id, i.obra_titulo || '(sin título)');
  }
  return [...map.entries()]
    .map(([id, titulo]) => ({ id, titulo }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
}

function comparar(a, b, key) {
  const va = a?.[key];
  const vb = b?.[key];
  if (va == null && vb == null) return 0;
  if (va == null) return 1; // nulls al final
  if (vb == null) return -1;
  if (key.startsWith('fecha')) return new Date(va) - new Date(vb);
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb), 'es', { numeric: true });
}

/**
 * Filtra por obra y por rango de fecha, y ordena por una columna.
 * @param {Array} items
 * @param {{filtroObra?:string, desde?:string, hasta?:string, campoFecha?:string, orderBy?:string, order?:'asc'|'desc'}} opts
 */
export function aplicarFiltroOrden(items = [], opts = {}) {
  const { filtroObra = '', desde = '', hasta = '', campoFecha = 'fecha_vencimiento', orderBy = null, order = 'asc' } = opts;
  let out = items;
  if (filtroObra) out = out.filter((i) => String(i.obra_id) === String(filtroObra));
  if (desde) { const d = new Date(desde); out = out.filter((i) => i[campoFecha] && new Date(i[campoFecha]) >= d); }
  if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59, 999); out = out.filter((i) => i[campoFecha] && new Date(i[campoFecha]) <= h); }
  if (orderBy) out = [...out].sort((a, b) => { const c = comparar(a, b, orderBy); return order === 'asc' ? c : -c; });
  return out;
}
