import { toNumber } from './numbers.js';

export function applyPriceFormulaToValue(original, formula) {
  const base = toNumber(original);

  if (!formula || typeof formula !== 'string') return base;

  const trimmed = formula.trim();

  // %x => aumenta x por ciento
  if (trimmed.startsWith('%')) {
    const pct = toNumber(trimmed.slice(1)) / 100;
    return base * (1 + pct);
  }

  // =x => setea el valor exacto
  if (trimmed.startsWith('=')) {
    return toNumber(trimmed.slice(1));
  }

  // *x => multiplica
  if (trimmed.startsWith('*')) {
    return base * toNumber(trimmed.slice(1));
  }

  // /x => divide
  if (trimmed.startsWith('/')) {
    return base / toNumber(trimmed.slice(1));
  }

  // Por defecto, si es un número suelto (ej. 0.91)
  const direct = toNumber(trimmed);
  return Number.isFinite(direct) ? base * direct : base;
}
