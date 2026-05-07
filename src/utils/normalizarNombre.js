/**
 * Normaliza un nombre (categoría, proveedor, etc.) a una forma comparable:
 * trim + lowercase + quitar acentos (NFD) + colapsar espacios.
 *
 * Mirror de sorby_bot_wa/utils/normalizarNombre.js — mantener en sync.
 */
export function normalizarNombre(s) {
  return (s == null ? '' : String(s))
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Busca el canónico de `detectado` dentro de `lista`.
 * Devuelve { estado, canonico }:
 *   - 'existe'   : match exacto.
 *   - 'variante' : match normalizado pero los strings difieren.
 *   - 'nueva'    : ningún match.
 *
 * `getName` extrae el nombre de cada elemento (por default `.name` o el string mismo).
 */
export function buscarCanonicoEnLista(detectado, lista, getName) {
  const nombre = detectado == null ? '' : String(detectado);
  if (!nombre.trim()) {
    return { estado: 'nueva', canonico: null };
  }
  const items = Array.isArray(lista) ? lista : [];
  const norm = normalizarNombre(nombre);
  const resolveName = typeof getName === 'function'
    ? getName
    : (x) => (x == null ? '' : (typeof x === 'string' ? x : (x.name || '')));

  let varianteCanonica = null;
  for (const item of items) {
    const candidato = resolveName(item);
    if (!candidato) continue;
    if (candidato === nombre) {
      return { estado: 'existe', canonico: candidato };
    }
    if (varianteCanonica === null && normalizarNombre(candidato) === norm) {
      varianteCanonica = candidato;
    }
  }
  if (varianteCanonica !== null) {
    return { estado: 'variante', canonico: varianteCanonica };
  }
  return { estado: 'nueva', canonico: null };
}
