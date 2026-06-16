/**
 * Helpers puros de carga/normalización de datos para reportes. Compartidos por
 * `useReportData` (página /reportes/[id]) y `useReportDataSources` (preview en vivo del
 * agente) para que la previsualización del borrador coincida 1:1 con el reporte guardado.
 */

export function buildUserOptions(usuariosEmpresa = [], movimientos = []) {
  const normalize = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

  const labelsByKey = new Map();
  const add = (value) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = normalize(label);
    if (!key) return;
    if (!labelsByKey.has(key)) labelsByKey.set(key, label);
  };

  for (const u of usuariosEmpresa || []) {
    const nombre = `${u.firstName || u.nombre || ''} ${u.lastName || u.apellido || ''}`.trim();
    add(nombre);
    add(u.nombre);
  }

  for (const m of movimientos || []) {
    const nombre = m.usuario_nombre || m.usuario || m.userName;
    if (typeof nombre === 'object') {
      add(`${nombre.firstName || nombre.nombre || ''} ${nombre.lastName || nombre.apellido || ''}`);
      add(nombre.name || nombre.nombre || nombre.usuario_nombre || nombre.usuario || nombre.userName);
    } else {
      add(nombre);
    }
  }

  return [...labelsByKey.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function toMovimientoDate(mov) {
  const raw = mov?.fecha_factura || mov?.fecha;
  if (!raw) return null;
  if (raw?.toDate) {
    const d = raw.toDate();
    return isNaN(d?.getTime?.()) ? null : d;
  }
  if (raw?.seconds) {
    const d = new Date(raw.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizeFilterOptionText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

export function normalizeCategoryLabel(value) {
  return value == null || value === '' ? 'Sin categoría' : value;
}

export function getExcludedCategorySetFromLayout(layout = []) {
  const set = new Set();
  for (const block of layout || []) {
    const cats = block?.excluir?.categorias;
    if (!Array.isArray(cats)) continue;
    for (const category of cats) {
      const key = normalizeFilterOptionText(normalizeCategoryLabel(category));
      if (key) set.add(key);
    }
  }
  return set;
}

export function applyDateBoundsToFilters(defaultFilters, filtrosSchema, movimientos) {
  if (!filtrosSchema?.fecha?.enabled) return defaultFilters;

  const dates = (movimientos || []).map(toMovimientoDate).filter(Boolean);
  if (dates.length === 0) return defaultFilters;

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const today = new Date();

  return {
    ...defaultFilters,
    fecha_from: minDate,
    fecha_to: today,
  };
}
