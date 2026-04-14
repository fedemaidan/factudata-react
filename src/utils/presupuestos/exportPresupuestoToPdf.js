import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageAsDataUrl } from './loadLogoForPdf';

const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const ACCENT_COLOR_DEFAULT = [10, 71, 145];
const TEXT_COLOR_DEFAULT = [255, 255, 255];
const LIGHT_GREY = [245, 245, 245];
const BORDER_COLOR = 200;

const isValidHex = (v) => v && /^#[0-9A-Fa-f]{6}$/.test(v);
const hexToRgb = (hex) => {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const formatCurrency = (value, currency = 'ARS') => {
  const num = Number(value) || 0;
  return num.toLocaleString('es-AR', { style: 'currency', currency });
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFechaCabecera = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const sanitizeFileName = (value) => {
  return (value || 'presupuesto')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
};

const buildRubroRows = (rubros = [], totalNeto) => {
  const body = [];
  const metadata = [];

  rubros.forEach((rubro, index) => {
    const orden = rubro.orden ?? index + 1;
    const monto = Number(rubro.monto) || 0;
    const incidencia = Number(rubro.incidencia_pct);
    const incidenciaPct = Number.isFinite(incidencia)
      ? incidencia
      : totalNeto > 0
      ? (monto / totalNeto) * 100
      : 0;

    body.push([
      `${orden}`,
      rubro.nombre || 'Rubro sin título',
      monto ? formatCurrency(monto, rubro.moneda || 'ARS') : '-',
      `${incidenciaPct.toFixed(1)}%`,
    ]);
    metadata.push({ type: 'rubro' });

    (rubro.tareas || []).forEach((tarea, tareaIdx) => {
      const taskIndex = `${orden}.${tareaIdx + 1}`;
      const tm = Number(tarea.monto) || 0;
      const incTarea = Number.isFinite(Number(tarea.incidencia_pct))
        ? Number(tarea.incidencia_pct)
        : monto > 0
        ? (tm / monto) * 100
        : 0;
      const mostrar = tm > 0 || (Number(tarea.incidencia_pct) || 0) > 0;
      body.push([
        taskIndex,
        `  ${tarea.descripcion || 'Tarea sin descripción'}`,
        mostrar ? formatCurrency(tm, rubro.moneda || 'ARS') : '-',
        mostrar ? `${incTarea.toFixed(1)}%` : '-',
      ]);
      metadata.push({ type: 'tarea' });
    });
  });

  return { body, metadata };
};

const addFooter = (doc, formaPago) => {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Este documento no es válido como factura.', MARGIN, PAGE_HEIGHT - 10);
    if (formaPago) {
      doc.text(`Forma de pago: ${formaPago}`, MARGIN, PAGE_HEIGHT - 15);
    }
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, {
      align: 'right',
    });
  }
};

const buildSurfaceLines = (analisis, totalNeto, currency) => {
  if (!analisis) return [];

  const cubierta = Number(analisis.sup_cubierta_m2) || 0;
  const patios = Number(analisis.sup_patios_m2) || 0;
  const coefPatios = Number(analisis.coef_patios) >= 0 ? (Number(analisis.coef_patios) || 0.5) : 0.5;
  const vereda = Number(analisis.sup_vereda_m2) || 0;
  const coefVereda = Number(analisis.coef_vereda) >= 0 ? (Number(analisis.coef_vereda) || 0.25) : 0.25;
  const ponderadaOriginal = Number(analisis.sup_ponderada_m2) || 0;
  const ponderada = ponderadaOriginal || cubierta + patios * coefPatios + vereda * coefVereda;
  if (!cubierta && !patios && !vereda && !ponderada) return [];

  const promedio = ponderada > 0 ? totalNeto / ponderada : null;

  const lines = [
    `Superficie cubierta: ${cubierta ? `${Math.round(cubierta)} m²` : '—'}`,
    `Superficie patios: ${patios ? `${Math.round(patios)} m²` : '—'}`,
    `Superficie vereda: ${vereda ? `${Math.round(vereda)} m²` : '—'}`,
    `Superficie ponderada: ${ponderada ? `${Math.round(ponderada)} m²` : '—'}`,
  ];

  if (promedio !== null && Number.isFinite(promedio) && promedio > 0) {
    lines.push(`Promedio por m²: ${formatCurrency(promedio, currency)}`);
  }

  return lines;
};

/** Genera fila Total en USD/CAC: { label, value } o null */
const buildTotalEquivalenteRow = (presupuesto, totalActualizado) => {
  const snap = presupuesto?.cotizacion_snapshot || null;
  const moneda = (presupuesto?.moneda || 'ARS').toUpperCase();
  if (!snap || !['CAC', 'USD'].includes(snap.tipo) || !Number.isFinite(Number(snap.valor))) return null;
  const valor = Number(snap.valor);
  let value = null;
  let tipo = '';
  if (snap.tipo === 'USD') {
    tipo = 'USD';
    value = moneda === 'USD' ? totalActualizado : totalActualizado / valor;
  } else {
    tipo = 'CAC';
    value = totalActualizado / valor;
  }
  if (!Number.isFinite(value) || value <= 0) return null;
  const partes = [];
  if (snap.tipo === 'USD') {
    if (snap.fuente) partes.push(snap.fuente === 'blue' ? 'Blue' : 'Oficial');
    if (snap.referencia) partes.push(snap.referencia.charAt(0).toUpperCase() + snap.referencia.slice(1));
  } else {
    const ref = snap.referencia === 'mano_obra' ? 'Mano de Obra' : snap.referencia === 'materiales' ? 'Materiales' : 'Promedio';
    partes.push(ref);
  }
  if (snap.fecha_origen) {
    const f = snap.fecha_origen;
    partes.push(f.length >= 7 ? `${f.slice(5, 7)}/${f.slice(0, 4)}` : f);
  }
  const labelSuffix = partes.length ? ` (${partes.join(', ')})` : '';
  const formatted = tipo === 'USD'
    ? formatCurrency(value, 'USD')
    : `CAC ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { label: `Total en ${tipo}`, value: `${formatted}${labelSuffix}` };
};

const addMetadataBlock = (doc, presupuesto, empresaNombre) => {
  const yStart = 58;
  const list = [
    ['Empresa', empresaNombre || presupuesto.empresa_nombre || '—'],
    ['Fecha', formatDate(presupuesto.fecha || presupuesto.createdAt)],
  ];

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setDrawColor(BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, yStart + 4, PAGE_WIDTH - MARGIN, yStart + 4);

  let currentY = yStart + 12;
  const columnWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  list.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * columnWidth;
    const y = currentY + row * 7;
    doc.text(`${label}:`, x, y);
    doc.text(value, x + 40, y);
  });

  return currentY + Math.ceil(list.length / 2) * 7 + 6;
};

export async function exportPresupuestoToPdf(presupuesto, { empresa } = {}) {
  if (!presupuesto) {
    throw new Error('Presupuesto inválido');
  }

  const rubros = presupuesto.rubros || [];
  if (!rubros.length) {
    throw new Error('El presupuesto no tiene rubros');
  }

  const totalNeto =
    Number(presupuesto.total_neto) ||
    rubros.reduce((acc, rubro) => acc + (Number(rubro.monto) || 0), 0);
  const currency = presupuesto.moneda || 'ARS';

  const accentRgb = isValidHex(presupuesto.header_bg_color)
    ? hexToRgb(presupuesto.header_bg_color)
    : ACCENT_COLOR_DEFAULT;
  const textRgb = isValidHex(presupuesto.header_text_color)
    ? hexToRgb(presupuesto.header_text_color)
    : TEXT_COLOR_DEFAULT;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');

  const FONT_SIZE_HEADER = 8; 
  const logoUrl = presupuesto.empresa_logo_url;
  const logoDataUrl = await loadImageAsDataUrl(logoUrl);
  const LOGO_WIDTH = 85;
  const LOGO_HEIGHT = 47;
  const logoX = (PAGE_WIDTH - LOGO_WIDTH) / 2;

  const HEADER_HEIGHT = logoDataUrl ? 58 : 28;
  doc.setFillColor(...accentRgb);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');

  doc.setFontSize(FONT_SIZE_HEADER);
  doc.setTextColor(...textRgb);
  doc.text(presupuesto.obra_direccion || '—', MARGIN, 6);
  doc.text(formatFechaCabecera(presupuesto.fecha || presupuesto.createdAt), PAGE_WIDTH - MARGIN, 6, {
    align: 'right',
  });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, 12, LOGO_WIDTH, LOGO_HEIGHT);
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(empresa?.nombre || presupuesto.empresa_nombre || '—', PAGE_WIDTH / 2, 18, {
      align: 'center',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZE_HEADER);
  }

  // Metadata
  doc.setTextColor(0);
  doc.setFontSize(11);
  const finalMetaY = addMetadataBlock(doc, presupuesto, empresa?.nombre);

  // Tabla de rubros y tareas
  const { body, metadata } = buildRubroRows(
    rubros.map((r) => ({ ...r, moneda: currency })),
    totalNeto
  );
  body.push(['', 'TOTAL PRESUPUESTO', formatCurrency(totalNeto, currency), '100%']);
  metadata.push({ type: 'total' });

  const equivRow = buildTotalEquivalenteRow(presupuesto, totalNeto);
  if (equivRow) {
    body.push(['', equivRow.label, equivRow.value, '']);
    metadata.push({ type: 'equiv' });
  }

  autoTable(doc, {
    startY: finalMetaY + 4,
    head: [['Item', 'Descripción', 'Total', 'Inc.']],
    body,
    theme: 'grid',
    headStyles: { fillColor: accentRgb, textColor: textRgb },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 90 },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (data) => {
      const meta = metadata[data.row.index];
      if (!meta) return;
      if (meta.type === 'rubro') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = LIGHT_GREY;
        data.cell.styles.textColor = 30;
      } else if (meta.type === 'total') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = textRgb;
        data.cell.styles.fillColor = accentRgb;
        if (data.column.index === 1) {
          data.cell.styles.halign = 'left';
        }
      } else if (meta.type === 'equiv') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = textRgb;
        data.cell.styles.fillColor = accentRgb;
      } else {
        data.cell.styles.textColor = 90;
        if (data.column.index === 1) {
          data.cell.styles.cellPadding = 2;
        }
      }
      if (data.column.index === 0 && meta?.type === 'tarea') {
        data.cell.styles.halign = 'right';
      }
    },
  });

  let currentY = doc.lastAutoTable?.finalY || MARGIN + 120;
  currentY += 6;

  const notes = presupuesto.notas_texto?.trim() || '';
  const formaPagoMatch = notes.match(/Forma de pago[:\\-]\\s*(.+)/i);
  const formaPago = formaPagoMatch?.[1]?.trim() || '';
  const notesForBlock = notes.replace(/Forma de pago[:\\-]\\s*.+/i, '').trim();

  const surfaceLines = buildSurfaceLines(presupuesto.analisis_superficies, totalNeto, currency);

  if (notesForBlock || surfaceLines.length) {
    const infoWidth = PAGE_WIDTH - MARGIN * 2;
    const startY = currentY + 4;
    const padding = 6;
    let blockHeight = 0;

    const noteLines = notesForBlock
      ? doc.splitTextToSize(notesForBlock, infoWidth - padding * 2)
      : [];
    blockHeight += noteLines.length * 5;
    blockHeight += surfaceLines.length * 5;
    blockHeight += 12; // headers and spacing

    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, startY, infoWidth, blockHeight + padding, 'S');

    let textY = startY + 8;
    if (noteLines.length) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notas / Condiciones', MARGIN + padding, textY);
      textY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(noteLines, MARGIN + padding, textY);
      textY += noteLines.length * 5 + 5;
    }
    if (surfaceLines.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Análisis de superficies', MARGIN + padding, textY);
      textY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      surfaceLines.forEach((line) => {
        doc.text(line, MARGIN + padding, textY);
        textY += 5;
      });
    }
    currentY = startY + blockHeight + padding;
  }

  addFooter(doc, formaPago);

  const fileName = `${sanitizeFileName(presupuesto.titulo)}_${formatDate(
    presupuesto.fecha || presupuesto.createdAt
  )}`.replace(/ /g, '_');
  doc.save(`${fileName || 'presupuesto'}.pdf`);
}
