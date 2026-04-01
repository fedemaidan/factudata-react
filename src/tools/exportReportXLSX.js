import * as XLSX from 'xlsx';
import { getAmount, getMes, formatValue, groupBy, aggregate } from 'src/tools/reportEngine';

/**
 * Exporta los resultados de un reporte a un archivo Excel (.xlsx)
 *
 * @param {Object} reportConfig   - Configuración del reporte
 * @param {Array}  results        - Resultado de executeReport()
 * @param {Array}  movimientos    - Movimientos filtrados (para tabla de movimientos)
 * @param {string} filename       - Nombre del archivo (sin extensión)
 */
export function exportReportToXLSX(reportConfig, results, movimientos = [], displayCurrencies, filename) {
  const wb = XLSX.utils.book_new();
  const currencies = displayCurrencies && displayCurrencies.length > 0
    ? displayCurrencies
    : [reportConfig.display_currency || 'ARS'];
  const displayCurrency = currencies[0];
  const safeName = (name, maxLen = 31) => {
    // Excel limita nombres de hojas a 31 chars y prohíbe ciertos chars
    return (name || 'Hoja')
      .replace(/[\\/*?:[\]]/g, '')
      .substring(0, maxLen);
  };

  let sheetIndex = 0;

  for (const block of results) {
    if (!block.data) continue;
    sheetIndex++;
    const sheetName = safeName(block.titulo || `Bloque ${sheetIndex}`);

    switch (block.type) {
      case 'metric_cards':
        exportMetricCards(wb, sheetName, block.data, displayCurrency);
        break;
      case 'summary_table':
        exportSummaryTable(wb, sheetName, block.data, displayCurrency);
        break;
      case 'movements_table':
        exportMovementsTable(wb, sheetName, block.data, displayCurrency);
        break;
      case 'budget_vs_actual':
        exportBudgetVsActual(wb, sheetName, block.data, displayCurrency);
        break;
      case 'category_budget_matrix':
        exportCategoryBudgetMatrix(wb, sheetName, block.data, displayCurrency);
        break;
      default:
        break;
    }
  }

  if (wb.SheetNames.length === 0) {
    // Al menos una hoja vacía
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sin datos']]), 'Vacío');
  }

  const fname = (filename || reportConfig.nombre || 'Reporte').replace(/[^\w\s-]/g, '');
  XLSX.writeFile(wb, `${fname}.xlsx`);
}

function exportMetricCards(wb, name, data, displayCurrency) {
  const rows = data.map((m) => {
    const row = { Métrica: m.titulo };
    if (m.valores && Object.keys(m.valores).length > 1) {
      for (const [cur, val] of Object.entries(m.valores)) {
        row[`Valor (${cur})`] = val;
        row[`Formateado (${cur})`] = formatValue(val, m.formato, cur);
      }
    } else {
      row.Valor = m.valor;
      row['Valor formateado'] = formatValue(m.valor, m.formato, displayCurrency);
    }
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportSummaryTable(wb, name, data, displayCurrency) {
  const { headers, rows, totals } = data;

  const xlsRows = rows.map((row) => {
    const obj = {};
    for (const h of headers) {
      if (h.id === '_porcentaje') {
        obj[h.titulo] = row._porcentaje != null ? `${(row._porcentaje * 100).toFixed(1)}%` : '';
      } else {
        obj[h.titulo] = row[h.id] ?? '';
      }
    }
    return obj;
  });

  // Fila totales
  if (totals) {
    const totalRow = {};
    for (const h of headers) {
      if (h.id === '_porcentaje') {
        totalRow[h.titulo] = totals._porcentaje != null ? `${(totals._porcentaje * 100).toFixed(1)}%` : '';
      } else {
        totalRow[h.titulo] = totals[h.id] ?? '';
      }
    }
    xlsRows.push(totalRow);
  }

  const ws = XLSX.utils.json_to_sheet(xlsRows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportMovementsTable(wb, name, data, displayCurrency) {
  const { columnas, rows } = data;

  const LABELS = {
    fecha_factura: 'Fecha',
    tipo: 'Tipo',
    categoria: 'Categoría',
    proveedor_nombre: 'Proveedor',
    proyecto_nombre: 'Proyecto',
    monto_display: 'Monto',
    subtotal_display: 'Subtotal',
    moneda: 'Moneda',
    medioPago: 'Medio de pago',
    notas: 'Notas',
    etapa: 'Etapa',
    estado: 'Estado',
    usuario_nombre: 'Usuario',
  };

  const xlsRows = rows.map((row) => {
    const obj = {};
    for (const col of columnas) {
      const label = LABELS[col] || col;
      if (col === 'fecha_factura') {
        const f = row.fecha_factura || row.fecha;
        const d = f?.toDate ? f.toDate() : f?.seconds ? new Date(f.seconds * 1000) : new Date(f);
        obj[label] = isNaN(d?.getTime()) ? '' : d.toLocaleDateString('es-AR');
      } else if (col === 'monto_display' || col === 'subtotal_display') {
        obj[label] = row[col] ?? 0;
      } else if (col.startsWith('monto_display__') || col.startsWith('subtotal_display__')) {
        const currency = col.split('__')[1];
        const base = col.startsWith('monto') ? 'Monto' : 'Subtotal';
        obj[`${base} (${currency})`] = row[col] ?? 0;
      } else if (col === 'tipo') {
        obj[label] = row.type === 'egreso' ? 'Egreso' : row.type === 'ingreso' ? 'Ingreso' : (row.type || '');
      } else if (col === 'proveedor_nombre') {
        obj[label] = row.nombre_proveedor || '';
      } else if (col === 'proyecto_nombre') {
        obj[label] = row.proyecto || '';
      } else if (col === 'medioPago') {
        obj[label] = row.medio_pago || '';
      } else if (col === 'notas') {
        obj[label] = row.observacion || '';
      } else {
        obj[label] = row[col] ?? '';
      }
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(xlsRows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportBudgetVsActual(wb, name, data, displayCurrency) {
  const { rows, totals } = data;

  const xlsRows = rows.map((r) => ({
    Categoría: r.categoria,
    Presupuestado: r.presupuestado,
    Ejecutado: r.ejecutado,
    Disponible: r.disponible,
    '% Ejecución': `${(r.porcentaje * 100).toFixed(1)}%`,
  }));

  if (totals) {
    xlsRows.push({
      Categoría: 'TOTAL',
      Presupuestado: totals.presupuestado,
      Ejecutado: totals.ejecutado,
      Disponible: totals.disponible,
      '% Ejecución': `${(totals.porcentaje * 100).toFixed(1)}%`,
    });
  }

  const ws = XLSX.utils.json_to_sheet(xlsRows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportCategoryBudgetMatrix(wb, name, data, displayCurrency) {
  const { categoria, rowHeaderTitle, projectColumns = [], rows = [] } = data || {};

  const header = [rowHeaderTitle || 'Concepto', ...projectColumns.map((p) => p.nombre)];
  const aoa = [
    [`Categoria: ${categoria || 'Todas'}`],
    [],
    header,
  ];

  // Si hay tipos de creación, agregar una fila adicional con ellos
  if (projectColumns.some(p => p.tiposCreacion && p.tiposCreacion.length > 0)) {
    const tiposRow = ['Tipo de creación'];
    for (const p of projectColumns) {
      const tipos = (p.tiposCreacion || []).join(' / ') || '';
      tiposRow.push(tipos);
    }
    aoa.push(tiposRow);
    aoa.push([]); // Línea vacía para separar
  }

  for (const row of rows) {
    const line = [row.label];
    for (const p of projectColumns) {
      const val = Number(row.values?.[p.id] || 0);
      line.push(row.type === 'additional' && val === 0 ? '' : val);
    }
    aoa.push(line);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name);
}
