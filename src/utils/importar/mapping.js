import { toNumber } from './numbers';

export const inferInitialMapping = (cols, rows/* preview */, tipoLista) => {
  const mapping = {};
  cols.forEach((c) => {
    const lc = String(c).toLowerCase();
    if (/(cod|c[óo]d)/.test(lc)) mapping[c] = 'codigo';
    else if (/(desc|detalle|producto|material|nombre)/.test(lc)) mapping[c] = 'descripcion';
    else if (/(cant|qty|cantidad)/.test(lc)) mapping[c] = 'cantidad';
    else if (/(precio|unit|unitario|valor_unit|unit_price|price)/.test(lc)) mapping[c] = 'valorUnitario';
    else if (/(total|importe)/.test(lc)) mapping[c] = 'valorTotal';
  });

  const colStats = cols.map((_, idx) => {
    const values = rows.map((r) => r[idx]);
    const nums = values.filter((v) => !isNaN(Number(String(v).toString().replace(',', '.'))));
    return { idx, numericRatio: nums.length / Math.max(1, values.length) };
  });

  if (!Object.values(mapping).includes('cantidad')) {
    const candidate = colStats.filter((s) => s.numericRatio > 0.6).sort((a, b) => a.idx - b.idx)[0];
    if (candidate) mapping[cols[candidate.idx]] = 'cantidad';
  }
  if (!Object.values(mapping).includes('valorUnitario')) {
    const candidate = colStats.filter((s) => s.numericRatio > 0.6).reverse()[0];
    if (candidate) mapping[cols[candidate.idx]] = 'valorUnitario';
  }
  if (!Object.values(mapping).includes('descripcion')) {
    const idx = cols.findIndex((c) => !mapping[c]); if (idx >= 0) mapping[cols[idx]] = 'descripcion';
  }
  if (!Object.values(mapping).includes('codigo')) {
    const idx = cols.findIndex((c) => !mapping[c]); if (idx >= 0) mapping[cols[idx]] = 'codigo';
  }
  return mapping;
};

export const applyMappingToRows = (rows, cols, mapping, tipoLista) => {
  return rows.map((row, rowIndex) => {
    const out = {
      id: `row-${rowIndex}`,
      codigo: '',
      descripcion: '',
      cantidad: 0,
      valorUnitario: 0,
      valorTotal: 0,
    };

    // Preservar campo de verificación si existe (para mostrar discrepancias en la UI)
    if (row && typeof row === 'object' && row._verificacion) {
      out._verificacion = row._verificacion;
    }

    cols.forEach((colName, colIdx) => {
      const role = mapping[colName];
      if (!role || role === 'ignorar') return;

      const val = Array.isArray(row) ? row[colIdx] : row[colName];
      if (role === 'codigo') out.codigo = val ?? '';
      if (role === 'descripcion') out.descripcion = val ?? '';
      if (role === 'cantidad') out.cantidad = toNumber(val);
      if (role === 'valorUnitario') out.valorUnitario = toNumber(val);
      if (role === 'valorTotal') out.valorTotal = toNumber(val);
    });

    if (tipoLista === 'materiales') {
      if (!out.valorTotal) out.valorTotal = out.cantidad * out.valorUnitario;
    } else {
      out.cantidad = undefined;
      out.valorTotal = undefined;
    }

    return out;
  });
};
