/**
 * Adapter de lectura y helpers del constructor de filtros (TAR-633).
 *
 * Precedencia: filterSet (vista guardada) > filtros (nuevo) > escalares legacy.
 * Una caja `filterSet` mantiene su path actual (no se convierte) → acá devuelve null.
 */

import { getCampoMeta, getPresetLabel } from './catalogo';

export const SIN_ASIGNAR_SENTINEL = '__sin_asignar__';

const getMediosPago = (caja) => {
  if (Array.isArray(caja?.medios_pago) && caja.medios_pago.length > 0) return caja.medios_pago;
  return caja?.medio_pago ? [caja.medio_pago] : [];
};

// ¿La caja usa el editor de "vista guardada" (filterSet) en vez del builder?
export const esCajaVista = (caja) => Boolean(caja?.filterSet);

/**
 * Filtros (condiciones) efectivos de una caja para filtrar/matchear.
 * - filterSet → null (esa caja se aplica por el path de vista, no por condiciones).
 * - filtros con condiciones → se usa tal cual.
 * - si no → se derivan de los escalares legacy (moneda NO: es control dedicado).
 */
export const cajaToFiltros = (caja) => {
  if (!caja) return null;
  if (esCajaVista(caja)) return null;
  if (caja.filtros && Array.isArray(caja.filtros.condiciones) && caja.filtros.condiciones.length > 0) {
    return caja.filtros;
  }
  const condiciones = [];
  const push = (campo, valores) => {
    const vals = (valores || []).filter((v) => v != null && v !== '');
    if (vals.length > 0) condiciones.push({ campo, operador: 'es', valores: vals });
  };
  const medios = getMediosPago(caja);
  push('medio_pago', medios);
  if (caja.estado) push('estado', [caja.estado]);
  if (caja.type) push('tipo', [caja.type]);
  push('categoria', caja.categorias);

  const asignados = Array.isArray(caja.asignados) ? caja.asignados : [];
  const nombres = asignados.filter((a) => a && a !== SIN_ASIGNAR_SENTINEL);
  if (nombres.length > 0) push('asignado', nombres);
  else if (asignados.includes(SIN_ASIGNAR_SENTINEL)) condiciones.push({ campo: 'asignado', operador: 'vacio' });

  if (condiciones.length === 0) return null;
  return { match: 'all', condiciones };
};

// JSON para el query param `cajaFiltros`. null si no hay condiciones.
export const filtrosToParam = (filtros) => {
  if (!filtros || !Array.isArray(filtros.condiciones) || filtros.condiciones.length === 0) return null;
  return JSON.stringify(filtros);
};

/**
 * Escalares legacy denormalizados desde condiciones `es`, para consumidores que
 * leen la caja directo (cobros, cache). Best-effort: solo campos con operador `es`.
 */
export const denormalizarEscalares = (filtros) => {
  const out = { medio_pago: '', medios_pago: [], estado: '', type: '', categorias: [], asignados: [] };
  const condiciones = filtros?.condiciones || [];
  condiciones.forEach((c) => {
    if (c.operador !== 'es' || !Array.isArray(c.valores)) return;
    if (c.campo === 'medio_pago') { out.medios_pago = c.valores; out.medio_pago = c.valores[0] || ''; }
    if (c.campo === 'estado') out.estado = c.valores[0] || '';
    if (c.campo === 'tipo') out.type = c.valores[0] || '';
    if (c.campo === 'categoria') out.categorias = c.valores;
    if (c.campo === 'asignado') out.asignados = c.valores;
  });
  return out;
};

const SIMBOLO_NUM = {
  igual: '=', distinto: '≠', mayor: '>', mayor_igual: '≥', menor: '<', menor_igual: '≤',
};

const fmtNum = (v) => (v == null ? '' : Number(v).toLocaleString('es-AR'));

// Texto legible de cada condición (para los chips read-only). Devuelve string[].
export const describirCondiciones = (filtros) => {
  const condiciones = filtros?.condiciones || [];
  return condiciones.map((c) => {
    const meta = getCampoMeta(c.campo);
    const label = meta?.label || c.campo;
    if (meta?.tipo === 'select') {
      if (c.operador === 'vacio') return `${label} vacío`;
      if (c.operador === 'no_vacio') return `${label} con valor`;
      const vals = (c.valores || []).join(', ');
      return c.operador === 'no_es' ? `${label} no es ${vals}` : `${label} es ${vals}`;
    }
    if (meta?.tipo === 'number') {
      if (c.operador === 'entre') return `${label} entre ${fmtNum(c.valor)} y ${fmtNum(c.valorHasta)}`;
      return `${label} ${SIMBOLO_NUM[c.operador] || ''} ${fmtNum(c.valor)}`.trim();
    }
    if (meta?.tipo === 'date') {
      if (c.operador === 'relativa') return `${label}: ${getPresetLabel(c.valor)}`;
      const a = c.valor ? String(c.valor).slice(0, 10) : '';
      const b = c.valorHasta ? String(c.valorHasta).slice(0, 10) : '';
      if (a && b) return `${label} entre ${a} y ${b}`;
      return a ? `${label} desde ${a}` : `${label} hasta ${b}`;
    }
    return label;
  });
};
