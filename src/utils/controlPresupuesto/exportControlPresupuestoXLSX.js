import * as XLSX from 'xlsx';

/**
 * Exporta a Excel SOLO la tabla de movimientos del control de presupuesto, con las
 * mismas columnas que el recibo PDF (PdfControlPresupuestoDocument) según el modo
 * elegido (nominal / CAC / USD), más las columnas de equivalencia USD/CAC cuando los
 * chips correspondientes estaban activos en la grilla (mostrar_equiv_usd/_cac del
 * data). No incluye encabezado, resumen ni plantilla: solo la tabla, una fila por
 * movimiento. Los importes van como números (Excel los suma).
 *
 * Recibe el mismo `data` que produce buildControlPresupuestoData.
 */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function exportControlPresupuestoXLSX(data, fileName = 'control-presupuesto') {
  const d = data || {};
  const movs = Array.isArray(d.movimientos) ? d.movimientos : [];
  const mostrarEquiv = !!d.mostrar_equiv;
  const mostrarEquivUsd = !!d.mostrar_equiv_usd;
  const mostrarEquivCac = !!d.mostrar_equiv_cac;
  const moneda = d.moneda || 'ARS';
  const equivLabel = d.equiv_label || '';
  const equivCacLabel = d.equiv_cac_label || 'CAC';
  const montoHeader = moneda === 'USD' ? 'MONTO USD' : 'MONTO $';

  // Mismas columnas que el PDF: N° · Fecha · Detalle · Monto · [equiv] · Acumulado,
  // más las equivalencias USD/CAC si los chips estaban activos en la grilla.
  const header = ['N°', 'FECHA', 'DETALLE', montoHeader];
  if (mostrarEquiv) header.push(equivLabel || 'EQUIV.');
  header.push('ACUMULADO');
  if (mostrarEquivUsd) header.push('USD');
  if (mostrarEquivCac) header.push(equivCacLabel);

  const rows = movs.map((m, i) => {
    const row = [
      m.numero != null ? m.numero : i + 1,
      m.fecha || '',
      m.detalle || m.proveedor || '',
      num(m.monto),
    ];
    if (mostrarEquiv) row.push(num(m.monto_equiv));
    row.push(mostrarEquiv ? num(m.acumulado_equiv) : num(m.acumulado));
    if (mostrarEquivUsd) row.push(m.equiv_usd != null ? num(m.equiv_usd) : '');
    if (mostrarEquivCac) row.push(m.equiv_cac != null ? num(m.equiv_cac) : '');
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  // Anchos en píxeles, alineados por índice de columna: Detalle 250, Monto y
  // Acumulado 150. El resto queda con el ancho por defecto.
  const cols = [{}, {}, { wpx: 250 }, { wpx: 150 }];
  if (mostrarEquiv) cols.push({});
  cols.push({ wpx: 150 });
  if (mostrarEquivUsd) cols.push({ wpx: 110 });
  if (mostrarEquivCac) cols.push({ wpx: 110 });
  ws['!cols'] = cols;

  // Formato de número: signo de moneda + sin decimales (el valor real se mantiene
  // para que Excel pueda sumar). $ pesos / USD dólares, y la unidad (CAC) como sufijo
  // en la columna equivalente. Mismo criterio que el PDF.
  const fmtMoneda = moneda === 'USD' ? '"USD "#,##0' : '"$ "#,##0';
  const fmtEquivU = `#,##0" ${equivLabel || 'CAC'}"`;
  const idxMonto = 3;
  const idxAcum = mostrarEquiv ? 5 : 4;
  const idxEquivUsd = mostrarEquivUsd ? idxAcum + 1 : null;
  const idxEquivCac = mostrarEquivCac ? idxAcum + 1 + (mostrarEquivUsd ? 1 : 0) : null;
  const formatos = { [idxMonto]: fmtMoneda, [idxAcum]: mostrarEquiv ? fmtEquivU : fmtMoneda };
  if (mostrarEquiv) formatos[4] = fmtEquivU;
  if (idxEquivCac != null) formatos[idxEquivCac] = `#,##0.00" ${equivCacLabel}"`;
  for (let r = 1; r <= rows.length; r++) {
    for (const c of Object.keys(formatos)) {
      const ref = XLSX.utils.encode_cell({ r, c: Number(c) });
      if (ws[ref]) ws[ref].z = formatos[c];
    }
    // La columna USD espeja la grilla: en movs nativos en USD el valor es su
    // equivalente en pesos → formato $; en el resto es el usd_blue → formato USD.
    if (idxEquivUsd != null) {
      const ref = XLSX.utils.encode_cell({ r, c: idxEquivUsd });
      if (ws[ref]) ws[ref].z = movs[r - 1]?.moneda_mov === 'USD' ? '"$ "#,##0' : '"USD "#,##0.00';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  XLSX.writeFile(wb, `${(fileName || 'control-presupuesto').replace(/\.xlsx$/i, '')}.xlsx`);
}

export default exportControlPresupuestoXLSX;
