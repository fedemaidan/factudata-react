import { parseNumberInput } from './constants';

const parseIncidencia = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value === 'string') return parseNumberInput(value);
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIncidenciaSugerida = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
};

/**
 * Reparte un total entre N items según porcentajes, garantizando suma exacta.
 * Trabaja en centavos enteros y aplica el método de "largest remainder" (Hamilton):
 * cada item recibe el piso de su cuota; los centavos sobrantes se asignan a los
 * items con mayor parte fraccional. Garantiza Σ resultado === totalCentavos exacto.
 *
 * @param {number} totalCentavos - total en centavos enteros
 * @param {Array<{ pct: number, valido: boolean }>} items
 * @returns {number[]} montos en centavos (mismo orden que items)
 */
function repartirLargestRemainder(totalCentavos, items) {
  const n = items.length;
  if (n === 0 || totalCentavos <= 0) return new Array(n).fill(0);

  const cuotas = items.map((it) => (it.valido ? (totalCentavos * it.pct) / 100 : 0));
  const piso = cuotas.map((c) => Math.floor(c));
  const sumaPiso = piso.reduce((s, x) => s + x, 0);

  // Solo redistribuimos sobrante entre los items válidos. Si la suma de pcts
  // está cerca de 100, sobrante == totalCentavos - sumaPiso. Si no llega a 100,
  // dejamos lo que sobra sin asignar (no inventamos centavos).
  const sumaPct = items.reduce((s, it) => s + (it.valido ? it.pct : 0), 0);
  const llegaA100 = Math.abs(sumaPct - 100) < 0.01;
  if (!llegaA100) return piso;

  let sobrante = totalCentavos - sumaPiso;
  const orden = cuotas
    .map((c, i) => ({ i, frac: c - Math.floor(c), valido: items[i].valido }))
    .filter((x) => x.valido)
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < orden.length && sobrante > 0; k += 1) {
    piso[orden[k].i] += 1;
    sobrante -= 1;
  }
  return piso;
}

const aCentavos = (n) => Math.round((Number(n) || 0) * 100);
const deCentavos = (c) => Math.round(c) / 100;

export function plantillaRubrosToPresupuestoRubros(rubros = []) {
  return (rubros || []).map((r) => ({
    nombre: r.nombre || '',
    monto: 0,
    incidencia_objetivo_pct: parseIncidenciaSugerida(r.incidencia_pct_sugerida),
    tareas: (r.tareas || []).map((t) => ({
      descripcion: t.descripcion || '',
      monto: null,
      cantidad: t.cantidad || null,
      incidencia_objetivo_pct: parseIncidenciaSugerida(t.incidencia_pct_sugerida),
    })),
  }));
}

export function sumaIncidenciasObjetivo(rubros) {
  return (rubros || []).reduce((s, r) => s + (Number(r.incidencia_objetivo_pct) || 0), 0);
}

/** Suma de incidencias objetivo de subrubros dentro de un rubro (respecto del total del rubro). */
export function sumaIncidenciasObjetivoTareas(tareas) {
  return (tareas || []).reduce((s, t) => s + (Number(t.incidencia_objetivo_pct) || 0), 0);
}

/**
 * Reparte el monto del rubro entre subrubros (tareas) según incidencia_objetivo_pct.
 * Usa largest remainder en centavos para garantizar suma exacta.
 */
export function distribuirMontosPorIncidenciaTareas(totalRubro, tareas) {
  if (!Array.isArray(tareas) || tareas.length === 0) return tareas || [];
  const totalNum = Number(totalRubro) || 0;
  const totalCentavos = aCentavos(totalNum);

  const tareasConPct = tareas.map((t) => {
    const pct = parseIncidencia(t.incidencia_objetivo_pct);
    const valido = pct != null && !Number.isNaN(pct) && pct >= 0 && pct <= 100;
    return { ...t, _pctValido: valido, _pct: valido ? pct : 0, _pctParsed: pct };
  });
  const sumaPct = tareasConPct.reduce((s, t) => s + t._pct, 0);

  if (sumaPct <= 0) {
    // Sin incidencias: si las tareas tienen montos actuales, escalamos proporcionalmente.
    const sumT = tareas.reduce(
      (s, t) => s + (Number(t.cantidad) || 1) * (Number(t.monto) || 0),
      0
    );
    if (sumT > 0 && totalNum > 0) {
      const items = tareas.map((t) => ({
        pct: ((Number(t.cantidad) || 1) * (Number(t.monto) || 0) * 100) / sumT,
        valido: true,
      }));
      const efectivosCentavos = repartirLargestRemainder(totalCentavos, items);
      return tareas.map((t, j) => {
        const efectivoTotal = deCentavos(efectivosCentavos[j]);
        const cantidad = Number(t.cantidad) || 1;
        const monto = deCentavos(Math.round(efectivosCentavos[j] / cantidad));
        const incidencia_pct = totalNum > 0 ? (efectivoTotal / totalNum) * 100 : 0;
        return { ...t, monto, incidencia_pct, orden: j + 1 };
      });
    }
    return tareas.map((t, j) => {
      const efectivoMonto = (Number(t.cantidad) || 1) * (Number(t.monto) || 0);
      const incidencia_pct = totalNum > 0 ? (efectivoMonto / totalNum) * 100 : 0;
      return { ...t, incidencia_pct, orden: j + 1 };
    });
  }

  const items = tareasConPct.map((t) => ({ pct: t._pct, valido: t._pctValido }));
  const efectivosCentavos = repartirLargestRemainder(totalCentavos, items);

  return tareasConPct.map((t, i) => {
    const { _pctValido, _pct, _pctParsed, ...resto } = t;
    const efectivoTotal = _pctValido
      ? deCentavos(efectivosCentavos[i])
      : Number(t.monto) || 0;
    const cantidad = Number(t.cantidad) || 1;
    const monto = _pctValido
      ? deCentavos(Math.round(efectivosCentavos[i] / cantidad))
      : Number(t.monto) || 0;
    const incidencia_pct = totalNum > 0 ? (efectivoTotal / totalNum) * 100 : 0;
    const keepRawIncidencia =
      typeof t.incidencia_objetivo_pct === 'string' && /[.,]$/.test(t.incidencia_objetivo_pct);
    return {
      ...resto,
      monto,
      incidencia_pct,
      incidencia_objetivo_pct: keepRawIncidencia
        ? t.incidencia_objetivo_pct
        : _pctParsed != null && !Number.isNaN(_pctParsed)
          ? _pctParsed
          : null,
      orden: i + 1,
    };
  });
}

/**
 * Distribuye un total entre rubros según incidencia_objetivo_pct.
 * Usa largest remainder en centavos para garantizar suma exacta.
 */
export function distribuirMontosPorIncidencia(total, rubros) {
  if (!Array.isArray(rubros) || rubros.length === 0) return rubros;
  const totalNum = Number(total) || 0;
  const totalCentavos = aCentavos(totalNum);

  const rubrosConPct = rubros.map((r) => {
    const pct = parseIncidencia(r.incidencia_objetivo_pct);
    const valido = pct != null && !Number.isNaN(pct) && pct >= 0 && pct <= 100;
    return { ...r, _pctValido: valido, _pct: valido ? pct : 0, _pctParsed: pct };
  });
  const sumaPct = rubrosConPct.reduce((s, r) => s + r._pct, 0);
  if (sumaPct <= 0) return rubros;

  const items = rubrosConPct.map((r) => ({ pct: r._pct, valido: r._pctValido }));
  const montosCentavos = repartirLargestRemainder(totalCentavos, items);

  return rubrosConPct.map((r, i) => {
    const { _pctValido, _pct, _pctParsed, ...resto } = r;
    const monto = _pctValido ? deCentavos(montosCentavos[i]) : Number(r.monto) || 0;
    const incidencia_pct = totalNum > 0 ? (monto / totalNum) * 100 : 0;
    const keepRawIncidencia =
      typeof r.incidencia_objetivo_pct === 'string' && /[.,]$/.test(r.incidencia_objetivo_pct);
    const tareasInternas = distribuirMontosPorIncidenciaTareas(monto, r.tareas || []);
    return {
      ...resto,
      monto,
      incidencia_pct,
      incidencia_objetivo_pct: keepRawIncidencia
        ? r.incidencia_objetivo_pct
        : _pctParsed != null && !Number.isNaN(_pctParsed)
          ? _pctParsed
          : null,
      tareas: tareasInternas,
      orden: i + 1,
    };
  });
}
