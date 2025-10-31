/**
 * Genera un código a partir de una descripción.
 * Estrategia simple:
 *  - quita tildes/acentos
 *  - toma primeras letras de cada palabra (máx 4)
 *  - agrega dígitos presentes en la descripción (máx 4)
 *  - aplica prefix si viene
 *  - limpia a [A-Z0-9-_], recorta a maxLen
 *  - asegura unicidad con sufijos -2, -3...
 */
export const codeFromDescription = (desc = '', { prefix = '', maxLen = 16 } = {}, used = new Set()) => {
  if (!desc) return '';

  const normalize = (s) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

  const clean = (s) => s.replace(/[^A-Z0-9-_]/g, '');

  const words = normalize(desc).split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 6).map(w => w[0]).slice(0, 4).join('');
  const digits = (normalize(desc).match(/\d+/g) || []).join('').slice(0, 4);

  let base = clean(`${prefix ? normalize(prefix) + '-' : ''}${initials}${digits ? '-' + digits : ''}`);
  if (!base) base = clean(`${prefix ? normalize(prefix) : 'ITEM'}`);

  if (base.length > maxLen) base = base.slice(0, maxLen);

  let candidate = base;
  let i = 2;
  while (used.has(candidate)) {
    const suf = `-${i}`;
    const room = maxLen - suf.length;
    candidate = (room > 0 ? base.slice(0, room) : base) + suf;
    i += 1;
  }
  used.add(candidate);
  return candidate;
};
