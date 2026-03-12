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

export function plantillaRubrosToPresupuestoRubros(rubros = []) {
  return (rubros || []).map((r) => ({
    nombre: r.nombre || '',
    monto: 0,
    incidencia_objetivo_pct: parseIncidenciaSugerida(r.incidencia_pct_sugerida),
    tareas: (r.tareas || []).map((t) => ({ descripcion: t.descripcion || '' })),
  }));
}

export function sumaIncidenciasObjetivo(rubros) {
  return (rubros || []).reduce((s, r) => s + (Number(r.incidencia_objetivo_pct) || 0), 0);
}

/**
 * Distribuye montos según incidencias objetivo, manteniendo el total exacto.
 * Ajusta el último rubro con incidencia válida para compensar redondeos.
 * @param {number} total - Total neto deseado
 * @param {Array} rubros - Rubros con incidencia_objetivo_pct
 * @returns {Array} Rubros con monto e incidencia_pct actualizados
 */
export function distribuirMontosPorIncidencia(total, rubros) {
  if (!Array.isArray(rubros) || rubros.length === 0) return rubros;
  const totalNum = Number(total) || 0;
  const rubrosConPct = rubros.map((r) => {
    const pct = parseIncidencia(r.incidencia_objetivo_pct);
    const valido = !Number.isNaN(pct) && pct >= 0 && pct <= 100;
    return { ...r, _pctValido: valido, _pct: valido ? pct : 0, _pctParsed: pct };
  });
  const sumaPct = rubrosConPct.reduce((s, r) => s + r._pct, 0);
  if (sumaPct <= 0) return rubros;

  const montos = rubrosConPct.map((r) =>
    r._pctValido ? Math.round((totalNum * r._pct) / 100 * 100) / 100 : Number(r.monto) || 0
  );
  const sumaMontos = montos.reduce((s, m) => s + m, 0);
  const diff = Math.round((totalNum - sumaMontos) * 100) / 100;


  const sumaCercaDe100 = Math.abs(sumaPct - 100) < 0.01;
  let lastIdx = -1;
  if (sumaCercaDe100) {
    for (let i = rubrosConPct.length - 1; i >= 0; i--) {
      if (rubrosConPct[i]._pctValido) {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx >= 0 && Math.abs(diff) > 0.001) {
      montos[lastIdx] = Math.round((montos[lastIdx] + diff) * 100) / 100;
    }
  }

  return rubrosConPct.map((r, i) => {
    const { _pctValido, _pct, _pctParsed, ...resto } = r;
    const monto = montos[i];
    const incidencia_pct = totalNum > 0 ? (monto / totalNum) * 100 : 0;
    const keepRawIncidencia =
      typeof r.incidencia_objetivo_pct === 'string' && /[.,]$/.test(r.incidencia_objetivo_pct);
    return {
      ...resto,
      monto,
      incidencia_pct,
      incidencia_objetivo_pct: keepRawIncidencia
        ? r.incidencia_objetivo_pct
        : _pctParsed != null && !Number.isNaN(_pctParsed)
          ? _pctParsed
          : null,
      tareas: (r.tareas || []).map((t, j) => ({ ...t, orden: j + 1 })),
      orden: i + 1,
    };
  });
}
