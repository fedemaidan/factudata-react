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
      case 'group_month_matrix':
        exportSummaryTable(wb, sheetName, block.data, displayCurrency);
        break;
      case 'movements_table':
        exportMovementsTable(wb, sheetName, block.data, displayCurrency);
        break;
      case 'budget_vs_actual':
        exportBudgetVsActual(wb, sheetName, block.data, displayCurrency);
        break;
      case 'monthly_budget_control':
        exportMonthlyBudgetControl(wb, sheetName, block.data, displayCurrency);
        break;
      case 'category_budget_matrix':
        exportCategoryBudgetMatrix(wb, sheetName, block.data, displayCurrency);
        break;
      case 'category_subcategory_accordion':
        exportCategorySubcategoryAccordion(wb, sheetName, block.data, displayCurrency);
        break;
      case 'subcategory_monthly_evolution':
        exportSummaryTable(wb, sheetName, block.data.matrix || block.data, displayCurrency);
        break;
      case 'income_budget_control':
        exportIncomeBudgetControl(wb, sheetName, block.data);
        break;
      case 'balance_between_partners':
        exportBalanceBetweenPartners(wb, sheetName, block.data, displayCurrency);
        break;
      // Plan de cobros: mismas shapes que metric_cards / summary_table.
      case 'collections_summary':
        exportMetricCards(wb, sheetName, block.data, displayCurrency);
        break;
      case 'collections_schedule':
      case 'collections_due_ranges':
      case 'collections_chart':
      case 'collections_aging':
      case 'collections_plans':
      case 'collections_installments':
        exportSummaryTable(wb, sheetName, block.data, displayCurrency);
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
      row['Valor formateado'] = formatValue(m.valor, m.formato, m.display_currency || displayCurrency);
    }
    if (m.mostrar_sin_cotizacion === true && m.sin_cotizacion > 0) {
      row['Sin cotización'] = m.sin_cotizacion;
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
    monto_original: 'Monto original',
    equivalente_display: `Equivalente (${data.displayCurrency || displayCurrency})`,
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
      } else if (col === 'monto_original') {
        obj[label] = row.monto_original ?? 0;
      } else if (col === 'equivalente_display' || col === 'monto_display' || col === 'subtotal_display') {
        const missingQuote = row._sin_cotizacion && (col === 'equivalente_display' || col === 'monto_display');
        obj[label] = missingQuote
          ? (data.mostrarSinCotizacion === true ? 'Sin cotización' : '')
          : (row[col] ?? 0);
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
  const groupLabel = data?.groupLabel || 'Categoría';
  const showBreakdown = data?.showBudgetBreakdown === true;

  const xlsRows = [];
  for (const r of rows) {
    xlsRows.push({
      [groupLabel]: r.categoria,
      Presupuestado: r.presupuestado,
      Ejecutado: r.ejecutado,
      Disponible: r.disponible,
      '% Ejecución': `${(r.porcentaje * 100).toFixed(1)}%`,
    });

    if (showBreakdown) {
      for (const detail of r.details || []) {
        xlsRows.push({
          [groupLabel]: `  ${detail.label}`,
          Presupuestado: detail.presupuestado,
          Ejecutado: detail.ejecutado,
          Disponible: detail.disponible,
          '% Ejecución': `${(detail.porcentaje * 100).toFixed(1)}%`,
        });
      }
    }
  }

  if (totals) {
    xlsRows.push({
      [groupLabel]: 'TOTAL',
      Presupuestado: totals.presupuestado,
      Ejecutado: totals.ejecutado,
      Disponible: totals.disponible,
      '% Ejecución': `${(totals.porcentaje * 100).toFixed(1)}%`,
    });
  }

  const ws = XLSX.utils.json_to_sheet(xlsRows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportMonthlyBudgetControl(wb, name, data) {
  const {
    obra_nombre: obraNombre,
    fecha_inicio: fechaInicio,
    presupuesto_label: presupuestoLabel,
    presupuesto_total: presupuestoTotal = 0,
    categories = [],
    rows = [],
    totals,
  } = data || {};

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR');
  };

  const aoa = [
    ['Control presupuestario'],
    ['Obra', obraNombre || ''],
    ['Fecha de inicio', formatDate(fechaInicio)],
    [presupuestoLabel || 'Egresos proyectados', presupuestoTotal],
    [],
    ['Mes', ...categories, 'Total mes', 'Acumulado', '% avance', 'Gasto CAC'],
  ];

  for (const row of rows) {
    aoa.push([
      row.mesLabel,
      ...categories.map((category) => Number(row.categorias?.[category] || 0)),
      Number(row.total || 0),
      Number(row.acumulado || 0),
      row.porcentaje_avance != null ? `${(row.porcentaje_avance * 100).toFixed(2)}%` : '',
      Number(row.total_cac || 0),
    ]);
  }

  if (totals) {
    aoa.push([
      totals.label || 'Total',
      ...categories.map((category) => Number(totals.categorias?.[category] || 0)),
      Number(totals.total || 0),
      Number(totals.acumulado || 0),
      totals.porcentaje_avance != null ? `${(totals.porcentaje_avance * 100).toFixed(2)}%` : '',
      Number(totals.total_cac || 0),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
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

function exportCategorySubcategoryAccordion(wb, name, data, displayCurrency) {
  const categories = data?.categories || [];
  const currency = data?.displayCurrency || displayCurrency;
  const showCounts = data?.showCounts !== false;
  const showSubcategories = data?.showSubcategories !== false;
  const showMissingQuotes = data?.mostrarSinCotizacion === true && Number(data?.sinCotizacion || 0) > 0;
  const headers = ['Categoria / Subcategoria'];
  if (showCounts) headers.push('Movimientos');
  if (showMissingQuotes) headers.push('Sin cotización');
  headers.push(`Total (${currency})`);
  const aoa = [headers];

  for (const category of categories) {
    const categoryRow = [String(category.label || '').toUpperCase()];
    if (showCounts) categoryRow.push(Number(category.count || 0));
    if (showMissingQuotes) categoryRow.push(Number(category.sinCotizacion || 0));
    categoryRow.push(Number(category.total || 0));
    aoa.push(categoryRow);
    if (showSubcategories) {
      for (const sub of category.subcategories || []) {
        const subRow = [`  ${sub.label || ''}`];
        if (showCounts) subRow.push(Number(sub.count || 0));
        if (showMissingQuotes) subRow.push(Number(sub.sinCotizacion || 0));
        subRow.push(Number(sub.total || 0));
        aoa.push(subRow);
      }
    }
  }

  aoa.push([]);
  const totalRow = ['TOTAL'];
  if (showCounts) totalRow.push(Number(data?.count || 0));
  if (showMissingQuotes) totalRow.push(Number(data?.sinCotizacion || 0));
  totalRow.push(Number(data?.total || 0));
  aoa.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function formatXlsxDate(value) {
  if (!value) return '';
  const d = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR');
}

function exportIncomeBudgetControl(wb, name, data) {
  const presupuestoRows = data?.presupuesto?.rows || [];
  const presupuestoTotals = data?.presupuesto?.totals || {};
  const recibidoRows = data?.recibidos?.rows || [];
  const recibidoTotals = data?.recibidos?.totals || {};
  const saldo = data?.saldo || {};

  const aoa = [
    ['Resumen presupuestos'],
    ['N°', 'Concepto', 'Fecha', 'I.CAC', 'Subtotal neto', 'U.CAC'],
  ];

  for (const row of presupuestoRows) {
    aoa.push([
      row.nro,
      row.concepto,
      formatXlsxDate(row.fecha),
      Number(row.icac || 0),
      Number(row.subtotal_neto || 0),
      Number(row.cac_equivalente || 0),
    ]);
  }
  aoa.push([
    'TOTALES',
    '',
    '',
    '',
    Number(presupuestoTotals.subtotal_neto || 0),
    Number(presupuestoTotals.cac_equivalente || 0),
  ]);

  aoa.push([]);
  aoa.push(['Pagos netos recibidos']);
  aoa.push(['N°', 'Fecha de pagos recibidos', 'I.CAC a la fecha', 'Pago neto ARS recibidos', 'U.CAC recibidos']);

  for (const row of recibidoRows) {
    aoa.push([
      row.nro,
      formatXlsxDate(row.fecha),
      Number(row.icac || 0),
      Number(row.pago_neto_ars || 0),
      Number(row.cac_recibidos || 0),
    ]);
  }
  aoa.push([
    'TOTALES NETOS',
    '',
    '',
    Number(recibidoTotals.pago_neto_ars || 0),
    Number(recibidoTotals.cac_recibidos || 0),
  ]);

  aoa.push([]);
  aoa.push(['Saldo U.CAC', Number(saldo.cac || 0)]);
  aoa.push(['CAC hoy', Number(data?.cac_hoy || 0)]);
  aoa.push(['Saldo (ARS) a la fecha', Number(saldo.ars_hoy || 0)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function exportBalanceBetweenPartners(wb, name, data, displayCurrency) {
  const { socios = [], saldoNetoTotal = 0, aporteIdeal = 0, transfers = [], isBalanced = false } = data || {};

  const aoa = [
    ['Balance entre socios'],
    [],
    ['Saldo neto total', saldoNetoTotal],
    ['Saldo ideal por socio', aporteIdeal],
    ['Estado', isBalanced ? 'Balanceado' : 'Con diferencias'],
    [],
    ['Socio', 'Telefono', 'Saldo', 'Saldo ideal', 'Diferencia', 'Estado'],
  ];

  for (const s of socios) {
    aoa.push([
      s.socio,
      s.telefono,
      Number(s.saldo || 0),
      Number(s.aporteIdeal || 0),
      Number(s.diferencia || 0),
      s.estado,
    ]);
  }

  aoa.push([]);
  aoa.push(['Resumen de deudas']);
  if (isBalanced || transfers.length === 0) {
    aoa.push(['Balanceado']);
  } else {
    for (const t of transfers) {
      aoa.push([
        `${t.fromName} debe ${formatValue(t.amount, 'currency', displayCurrency)} a ${t.toName}`,
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, name);
}
