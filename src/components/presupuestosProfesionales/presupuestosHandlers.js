/**
 * Funciones puras de actualización del formulario de presupuestos profesionales.
 *
 * Invariante clave (modo normal):
 *   Editar un input nunca debe modificar otro input que el usuario no tocó.
 *   Solo se recalculan campos derivados (rubro.monto = Σ tareas, total = Σ rubros).
 *   Los campos *_objetivo_pct se persisten igual y solo cambian cuando el usuario
 *   los edita o cuando explícitamente se invoca una distribución.
 *
 * Modo distribuir:
 *   Editar % objetivo de rubro/tarea sí dispara redistribución de montos. Esto se
 *   invoca explícitamente desde la UI cuando `modoDistribuir = true`.
 *
 * Estas funciones son puras: reciben el form actual y devuelven un nuevo form.
 */

import {
  distribuirMontosPorIncidencia,
  distribuirMontosPorIncidenciaTareas,
} from './incidenciaHelpers';
import { parseNumberInput } from './constants';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Suma efectiva de una lista de tareas: Σ (cantidad || 1) × monto.
 * Si está expuesta porque la UI la usa para decidir si el monto del rubro
 * es editable directamente (sumaEfectiva = 0) o derivado (sumaEfectiva > 0).
 */
export const sumaEfectivaTareas = (tareas) =>
  (tareas || []).reduce(
    (s, t) => s + (Number(t.cantidad) || 1) * (Number(t.monto) || 0),
    0
  );

const sumaTareas = sumaEfectivaTareas;

const parseMonto = (rawValue) => {
  if (rawValue === '' || rawValue == null) return null;
  const v = parseNumberInput(String(rawValue));
  if (v !== null) {
    const r = round2(v);
    return r < 0 ? 0 : r;
  }
  const n = Number(rawValue);
  return Number.isNaN(n) ? 0 : Math.max(0, round2(n));
};

const parseCantidad = (rawValue) => {
  if (rawValue === '' || rawValue == null) return null;
  const n = Math.max(0, Number(rawValue) || 0);
  return n || null;
};

const parseIncidenciaInput = (value) => {
  if (value === '' || value == null) return null;
  if (typeof value === 'string' && /[.,]$/.test(value)) return value;
  const parsed = Number(value);
  return parsed != null && !Number.isNaN(parsed) ? parsed : null;
};

const reemplazarRubro = (rubros, idx, nuevoRubro) => {
  const next = [...rubros];
  next[idx] = nuevoRubro;
  return next;
};

const reemplazarTarea = (tareas, idx, nuevaTarea) => {
  const next = [...(tareas || [])];
  next[idx] = nuevaTarea;
  return next;
};

/**
 * Recalcula el monto del rubro a partir de las tareas.
 * Si Σ tareas > 0, el monto del rubro es derivado (= Σ).
 * Si Σ tareas = 0, preserva el monto que el usuario haya escrito a mano
 * (caso "rubro suelto sin desglose").
 */
const conMontoRecalculado = (rubro, tareas) => {
  const suma = sumaTareas(tareas);
  if (suma > 0) return { ...rubro, tareas, monto: suma };
  return { ...rubro, tareas };
};

/**
 * Edita el monto (val. unitario) de una tarea.
 * Solo recalcula rubro.monto cuando las tareas tienen valor (preserva el
 * monto manual si todas las tareas quedan vacías). No toca incidencias.
 */
export function aplicarUpdateTareaMonto(form, rubroIdx, tareaIdx, rawValue) {
  const rubro = form.rubros[rubroIdx];
  const tareas = reemplazarTarea(rubro.tareas, tareaIdx, {
    ...rubro.tareas[tareaIdx],
    monto: parseMonto(rawValue),
  });
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, rubroIdx, conMontoRecalculado(rubro, tareas)),
  };
}

/**
 * Edita la cantidad de una tarea. Misma lógica que aplicarUpdateTareaMonto.
 */
export function aplicarUpdateTareaCantidad(form, rubroIdx, tareaIdx, rawValue) {
  const rubro = form.rubros[rubroIdx];
  const tareas = reemplazarTarea(rubro.tareas, tareaIdx, {
    ...rubro.tareas[tareaIdx],
    cantidad: parseCantidad(rawValue),
  });
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, rubroIdx, conMontoRecalculado(rubro, tareas)),
  };
}

/**
 * Edita la descripción de una tarea (no afecta cálculos).
 */
export function aplicarUpdateTareaDescripcion(form, rubroIdx, tareaIdx, value) {
  const rubro = form.rubros[rubroIdx];
  const tareas = reemplazarTarea(rubro.tareas, tareaIdx, {
    ...rubro.tareas[tareaIdx],
    descripcion: value,
  });
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, rubroIdx, { ...rubro, tareas }),
  };
}

/**
 * Elimina una tarea. Recalcula rubro.monto si quedan tareas con valor;
 * si la lista resultante queda toda vacía, preserva el monto que el rubro
 * ya tenía (que pudo haber sido escrito a mano).
 */
export function aplicarRemoveTarea(form, rubroIdx, tareaIdx) {
  const rubro = form.rubros[rubroIdx];
  const tareas = (rubro.tareas || []).filter((_, i) => i !== tareaIdx);
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, rubroIdx, conMontoRecalculado(rubro, tareas)),
  };
}

/**
 * Edita un campo simple del rubro (nombre, etc.).
 * Para el campo "monto":
 *   - Modo distribuir: redistribuye los montos de las tareas según incidencia_objetivo_pct.
 *   - Modo normal:
 *       · Si Σ tareas (efectiva) = 0: el rubro no tiene desglose, se permite
 *         editar el monto directamente (caso "rubro suelto").
 *       · Si Σ tareas > 0: el monto es derivado, no se puede pisar a mano (no-op).
 */
export function aplicarUpdateRubro(form, idx, field, value, { modoDistribuir = false } = {}) {
  const rubro = { ...form.rubros[idx] };
  if (field === 'monto') {
    const raw = value === '' || value == null ? 0 : Number(value);
    const newMonto = Number.isFinite(raw) ? round2(raw) : 0;
    if (modoDistribuir) {
      const tareas = distribuirMontosPorIncidenciaTareas(newMonto, rubro.tareas || []);
      return {
        ...form,
        rubros: reemplazarRubro(form.rubros, idx, { ...rubro, monto: newMonto, tareas }),
      };
    }
    if (sumaTareas(rubro.tareas) > 0) return form;
    return {
      ...form,
      rubros: reemplazarRubro(form.rubros, idx, { ...rubro, monto: newMonto }),
    };
  }
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, idx, { ...rubro, [field]: value }),
  };
}

/**
 * Edita el % objetivo del rubro. Solo redistribuye si modoDistribuir = true.
 * En modo normal: solo persiste el valor (el campo no debe estar visible, pero
 * por seguridad respetamos esta invariante).
 */
export function aplicarUpdateIncidenciaObjetivoRubro(
  form,
  idx,
  value,
  { modoDistribuir = false, totalObjetivo = '' } = {}
) {
  const rubros = [...form.rubros];
  rubros[idx] = { ...rubros[idx], incidencia_objetivo_pct: parseIncidenciaInput(value) };
  if (!modoDistribuir) return { ...form, rubros };
  const totalParaDistribuir =
    totalObjetivo !== '' && Number(totalObjetivo) >= 0
      ? Number(totalObjetivo) || 0
      : form.rubros.reduce((s, r) => s + (Number(r.monto) || 0), 0);
  return { ...form, rubros: distribuirMontosPorIncidencia(totalParaDistribuir, rubros) };
}

/**
 * Edita el % objetivo de una tarea. Solo redistribuye si modoDistribuir = true.
 */
export function aplicarUpdateIncidenciaObjetivoTarea(
  form,
  rubroIdx,
  tareaIdx,
  value,
  { modoDistribuir = false } = {}
) {
  const rubro = form.rubros[rubroIdx];
  const tareas = reemplazarTarea(rubro.tareas, tareaIdx, {
    ...rubro.tareas[tareaIdx],
    incidencia_objetivo_pct: parseIncidenciaInput(value),
  });
  if (!modoDistribuir) {
    return {
      ...form,
      rubros: reemplazarRubro(form.rubros, rubroIdx, { ...rubro, tareas }),
    };
  }
  const tareasDist = distribuirMontosPorIncidenciaTareas(Number(rubro.monto) || 0, tareas);
  return {
    ...form,
    rubros: reemplazarRubro(form.rubros, rubroIdx, { ...rubro, tareas: tareasDist }),
  };
}

/**
 * Aplica una distribución global por total objetivo (uso desde "Distribuir por total"
 * en modo distribuir). Reemplaza los montos de rubros (y de tareas internas).
 */
export function aplicarDistribuirPorTotal(form, totalStr) {
  const total = Number(totalStr) || 0;
  return { ...form, rubros: distribuirMontosPorIncidencia(total, form.rubros) };
}
