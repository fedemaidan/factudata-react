// src/utils/importar/excelImportUtils.js
import * as XLSX from 'xlsx';

export function readSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isCSV = /\.csv$/i.test(file.name);

    reader.onload = () => {
      try {
        let wb;
        if (isCSV) wb = XLSX.read(reader.result, { type: 'string', raw: false });
        else wb = XLSX.read(new Uint8Array(reader.result), { type: 'array', cellDates: true });

        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };

    reader.onerror = reject;

    if (isCSV) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function guessMapping(headers, tipoLista) {
  const m = {};
  headers.forEach((h) => {
    const n = norm(h);
    if (n.includes('cod')) m[h] = 'codigo';
    else if (n.includes('descr') || n.includes('artic') || n.includes('producto')) m[h] = 'descripcion';
    else if (tipoLista === 'materiales' && (n === 'cant' || n.includes('cantidad') || n === 'qty')) m[h] = 'cantidad';
    else if (n.includes('unit') || n.includes('precio') || n.includes('valor')) m[h] = 'valorUnitario';
    else if (tipoLista === 'materiales' && (n.includes('total') || n.includes('importe'))) m[h] = 'valorTotal';
    else m[h] = '';
  });
  return m;
}

export function toNumberSafe(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const s = String(v).replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function buildProductosFromMatrix(matrix, mapping, includeHeaderAsRow, tipoLista, acopioId) {
  if (!matrix || !matrix.length) return [];
  const [headerRow, ...dataRows] = matrix;
  const rows = includeHeaderAsRow ? [headerRow, ...dataRows] : dataRows;

  const headerIndex = {};
  headerRow.forEach((h, i) => { headerIndex[String(h)] = i; });

  const productos = rows.map((r, idx) => {
    const get = (dest) => {
      const srcKey = Object.keys(mapping).find((k) => mapping[k] === dest);
      const i = headerIndex[srcKey];
      return i == null ? '' : r[i];
    };

    const codigo = String(get('codigo') || '').trim();
    const descripcion = String(get('descripcion') || '').trim();
    const cantidad = tipoLista === 'materiales' ? toNumberSafe(get('cantidad')) : undefined;
    const valorUnitario = toNumberSafe(get('valorUnitario'));
    const valorTotal = tipoLista === 'materiales'
      ? (toNumberSafe(get('valorTotal')) || (cantidad * valorUnitario))
      : undefined;

    return {
      id: `${acopioId || 'tmp'}-${idx}-${codigo || Math.random().toString(36).slice(2, 7)}`,
      codigo,
      descripcion,
      cantidad: tipoLista === 'materiales' ? cantidad || 0 : undefined,
      valorUnitario,
      valorTotal: tipoLista === 'materiales' ? valorTotal || 0 : undefined,
    };
  });

  return productos.filter(p => p.codigo || p.descripcion);
}
