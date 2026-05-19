// Detección genérica de duplicados sospechosos.
// Devuelve un Set con los ids de los items que coinciden con otro item según las claves dadas.
// Cada clave es una función (item) => string|null. Items con null en una clave no aportan a esa clave.

export function detectarDuplicados(items = [], keyFns = []) {
  const dupSet = new Set();
  for (const keyFn of keyFns) {
    const buckets = new Map();
    for (const it of items) {
      const k = keyFn(it);
      if (k == null || k === '') continue;
      const id = it.id ?? it._id;
      if (!id) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(id);
    }
    for (const ids of buckets.values()) {
      if (ids.length > 1) ids.forEach((id) => dupSet.add(String(id)));
    }
  }
  return dupSet;
}

// Claves típicas para remitos de acopio
export const REMITO_KEYS = [
  (r) => (r.numero_remito ? r.numero_remito.trim().toLowerCase() : null),
  (r) => (r.numero_factura ? r.numero_factura.trim().toLowerCase() : null),
  (r) => {
    if (!r.fecha) return null;
    const f = new Date(r.fecha).toISOString().split('T')[0];
    const v = Number(r.valorOperacion || r.valor_operacion || 0);
    return `${v}_${f}`;
  },
];

// Claves típicas para movimientos de caja (egresos a proveedores)
export const MOVIMIENTO_CAJA_KEYS = [
  (m) => {
    const pid = m.proveedor_id || m.nombre_proveedor;
    if (!pid || !m.numero_factura) return null;
    return `${pid}::${m.numero_factura.trim().toLowerCase()}`;
  },
  (m) => {
    const pid = m.proveedor_id || m.nombre_proveedor;
    if (!pid || !m.fecha_factura) return null;
    const f = new Date(m.fecha_factura).toISOString().split('T')[0];
    const v = Number(m.total ?? m.monto ?? 0);
    if (!v) return null;
    return `${pid}::${v}::${f}`;
  },
];
