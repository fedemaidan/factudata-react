/**
 * Matcher client-side del constructor de filtros (TAR-633). Espejo en JS de
 * condicionesToMongo del backend. Se usa para el saldo client-side de
 * /cajaProyecto, matchCaja del hook y los contadores del FilterBar.
 *
 * PARIDAD con Mongo (no romper sin actualizar el backend + golden tests):
 *  - vacío:    v == null || v === ''           (NUNCA usar !v: 0 y false NO son vacíos)
 *  - no vacío: v != null && v !== ''
 *  - "no es"/"distinto" con valor ausente → matchea (missing ≠ valor), igual que $nin/$ne.
 *  - comparadores numéricos exigen número finito (Mongo no matchea null con $gte/$lte).
 */

import { getCampoMeta } from './catalogo';
import { resolverFechaRelativa, rangoDiaAR } from './resolverFechaRelativa';

const esNumeroFinito = (v) => typeof v === 'number' && Number.isFinite(v);

// Normaliza fecha del movimiento (Date | ISO string | Firestore Timestamp | ms) a epoch ms.
const aMs = (v) => {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    const secs = v._seconds ?? v.seconds;
    if (typeof secs === 'number') return secs * 1000;
    if (typeof v.toDate === 'function') { const d = v.toDate(); return d ? d.getTime() : null; }
    return null;
  }
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

const matchSelect = (v, cond) => {
  switch (cond.operador) {
    case 'es':       return (cond.valores || []).includes(v);
    case 'no_es':    return !(cond.valores || []).includes(v);
    case 'vacio':    return v == null || v === '';
    case 'no_vacio': return v != null && v !== '';
    default:         return false;
  }
};

const matchNumber = (v, cond) => {
  const num = esNumeroFinito(v);
  switch (cond.operador) {
    case 'igual':       return num && v === cond.valor;
    case 'distinto':    return !(num && v === cond.valor); // missing/null ≠ valor → true
    case 'mayor':       return num && v > cond.valor;
    case 'mayor_igual': return num && v >= cond.valor;
    case 'menor':       return num && v < cond.valor;
    case 'menor_igual': return num && v <= cond.valor;
    case 'entre': {
      if (!num) return false;
      const okMin = cond.valor == null || v >= cond.valor;
      const okMax = cond.valorHasta == null || v <= cond.valorHasta;
      return okMin && okMax;
    }
    default: return false;
  }
};

const matchDate = (v, cond, now) => {
  let desde = null;
  let hasta = null;
  if (cond.operador === 'relativa') {
    const r = resolverFechaRelativa(cond.valor, now, cond.cantidad);
    if (!r) return false;
    ({ desde, hasta } = r);
  } else {
    if (cond.valor) { const r = rangoDiaAR(cond.valor); if (r) desde = r.desde; }
    if (cond.valorHasta) { const r = rangoDiaAR(cond.valorHasta); if (r) hasta = r.hasta; }
  }
  const t = aMs(v);
  if (t == null) return false;
  if (desde && t < desde.getTime()) return false;
  if (hasta && t > hasta.getTime()) return false;
  return true;
};

const matchCondicion = (mov, cond, now) => {
  const meta = getCampoMeta(cond.campo);
  if (!meta) return true; // condición desconocida no restringe (defensivo)
  const v = mov?.[meta.campoMov];
  if (meta.tipo === 'select') return matchSelect(v, cond);
  if (meta.tipo === 'number') return matchNumber(v, cond);
  if (meta.tipo === 'date') return matchDate(v, cond, now);
  return true;
};

/**
 * ¿El movimiento cumple los filtros de la caja? `all` → todas; `any` → alguna.
 * Sin condiciones → true.
 */
export const movimientoMatchesCondiciones = (mov, filtros, now = new Date()) => {
  const condiciones = filtros?.condiciones;
  if (!Array.isArray(condiciones) || condiciones.length === 0) return true;
  if (filtros.match === 'any') return condiciones.some((c) => matchCondicion(mov, c, now));
  return condiciones.every((c) => matchCondicion(mov, c, now));
};
