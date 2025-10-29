export const buildPreview = (rows, max = 10) => {
  const sample = rows.slice(0, max);
  if (!sample.length) return { cols: [], rows: [] };

  // Si las filas son arrays (sin claves)
  if (Array.isArray(sample[0])) {
    const longest = sample.reduce((a, r) => (r.length > a ? r.length : a), 0);
    const cols = Array.from({ length: longest }, (_, i) => `col${i}`);
    const previewRows = sample.map((r) =>
      Array.from({ length: longest }, (_, i) => r[i] ?? '')
    );
    return { cols, rows: previewRows };
  }

  // Si las filas son objetos (con claves)
  const keys = Array.from(
    sample.reduce((s, r) => {
      Object.keys(r || {}).forEach((k) => s.add(k));
      return s;
    }, new Set())
  );
  const previewRows = sample.map((r) => keys.map((k) => r?.[k] ?? ''));
  return { cols: keys, rows: previewRows };
};
