// Snapshot del estado de navegación de la caja que NO vive en la URL.
// Los filtros y el orden ya se sincronizan vía useMovimientosFilters; este ctx
// solo transporta paginación, tabla activa y scroll para restaurarlos al volver
// desde el form de edición de movimientos.

export const NAV_CTX_PARAM = 'mvCtx';

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

// Devuelve el JSON crudo del snapshot (sin encodeURIComponent). El encoding
// HTTP lo hacen URLSearchParams o el router al serializar el query.
export const encodeNavCtx = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const payload = {};
  if (isFiniteNumber(snapshot.page)) payload.p = snapshot.page;
  if (isFiniteNumber(snapshot.rowsPerPage)) payload.r = snapshot.rowsPerPage;
  if (typeof snapshot.tablaActiva === 'string' && snapshot.tablaActiva) payload.t = snapshot.tablaActiva;
  if (isFiniteNumber(snapshot.scrollY) && snapshot.scrollY > 0) payload.s = Math.round(snapshot.scrollY);
  if (Object.keys(payload).length === 0) return null;
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
};

export const decodeNavCtx = (raw) => {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value.length === 0) return null;
  // Robusto frente a doble-encoding accidental (ej. si en algún flujo se aplica
  // encodeURIComponent al pasar el ctx por una URL armada a mano).
  let candidate = value;
  if (candidate[0] !== '{') {
    try { candidate = decodeURIComponent(candidate); } catch { /* keep as-is */ }
  }
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      page: isFiniteNumber(parsed.p) ? parsed.p : null,
      rowsPerPage: isFiniteNumber(parsed.r) ? parsed.r : null,
      tablaActiva: typeof parsed.t === 'string' ? parsed.t : null,
      scrollY: isFiniteNumber(parsed.s) ? parsed.s : null,
    };
  } catch {
    return null;
  }
};

// Adjunta `navCtxValue` a un URL existente (puede contener query y hash).
// Se usa cuando el destino viene como string ya armado (ej. `lastPageUrl`
// que es un `router.asPath`).
export const appendNavCtxToUrl = (url, navCtxValue) => {
  if (!url || !navCtxValue) return url;
  const [base, hash = ''] = url.split('#');
  const [path, search = ''] = base.split('?');
  const params = new URLSearchParams(search);
  params.set(NAV_CTX_PARAM, navCtxValue);
  const next = `${path}?${params.toString()}`;
  return hash ? `${next}#${hash}` : next;
};

// Parsea un asPath (o cualquier URL relativa) en `{ pathname, query }` listos
// para pasarle a `router.push`/`router.replace`. Llamar a `router.push` con un
// string que contiene caracteres no-URL-safe (ej. `caja={"nombre":...}` ya
// decodeado tras un round-trip) no siempre preserva el query: Next reparsea el
// string y puede descartar params malformados. Usando la forma objeto, los
// values se re-encodean correctamente al construir la URL final.
export const parseAsPathForRouter = (asPath) => {
  if (!asPath || typeof asPath !== 'string') return null;
  const [base, hash = ''] = asPath.split('#');
  const [pathname, search = ''] = base.split('?');
  if (!pathname) return null;
  // URLSearchParams maneja correctamente el decode de cada value, incluso si
  // contienen `=` o `&` escapados, y devuelve los valores ya decodeados.
  const params = new URLSearchParams(search);
  const query = {};
  for (const [key, value] of params.entries()) {
    if (key in query) {
      // Duplicados → array (Next soporta este formato en query).
      query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
    } else {
      query[key] = value;
    }
  }
  return { pathname, query, hash: hash ? `#${hash}` : '' };
};
