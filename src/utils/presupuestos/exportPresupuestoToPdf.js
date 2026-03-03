import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const ACCENT_COLOR = [10, 71, 145];
const LIGHT_GREY = [245, 245, 245];
const BORDER_COLOR = 200;

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

const sanitizeFileName = (value) => {
  return (value || 'presupuesto')
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
    .slice(0, 40);
};

const loadImageAsDataUrl = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.debug('No se pudo cargar el logo para el PDF', error);
    return null;
  }
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
      body.push([
        taskIndex,
        `  ${tarea.descripcion || 'Tarea sin descripción'}`,
        '-',
        '-',
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
  const coef = Number(analisis.coef_patios) >= 0 ? (Number(analisis.coef_patios) || 0.5) : 0.5;
  const ponderadaOriginal = Number(analisis.sup_ponderada_m2) || 0;
  const ponderada = ponderadaOriginal || cubierta + patios * coef;
  const promedio = ponderada > 0 ? totalNeto / ponderada : null;

  const lines = [
    `Superficie cubierta: ${cubierta ? `${cubierta.toFixed(2)} m²` : '—'}`,
    `Superficie patios: ${patios ? `${patios.toFixed(2)} m²` : '—'}`,
    `Superficie ponderada: ${ponderada ? `${ponderada.toFixed(2)} m²` : '—'}`,
  ];

  if (promedio !== null && Number.isFinite(promedio)) {
    lines.push(`Promedio por m²: ${formatCurrency(promedio, currency)}`);
  }

  return lines;
};

const buildAjusteMonetarioLines = (presupuesto) => {
  const moneda = (presupuesto?.moneda || 'ARS').toUpperCase();
  const indexacion = moneda === 'USD'
    ? 'USD'
    : (presupuesto?.indexacion === 'CAC' || presupuesto?.indexacion === 'USD' ? presupuesto.indexacion : null);
  const modo = moneda === 'USD'
    ? 'Ajustar por dólar'
    : indexacion === 'CAC'
      ? 'Ajustar por CAC'
      : indexacion === 'USD'
        ? 'Ajustar por dólar'
        : 'Pesos fijos';
  const snap = presupuesto?.cotizacion_snapshot || null;

  const lines = [`Modo: ${modo}`];
  if (indexacion === 'CAC' && presupuesto?.cac_tipo) {
    const label = presupuesto.cac_tipo === 'mano_obra'
      ? 'Mano de Obra'
      : presupuesto.cac_tipo === 'materiales'
        ? 'Materiales'
        : 'Promedio';
    lines.push(`Tipo CAC: ${label}`);
  }
  if (indexacion === 'USD') {
    if (presupuesto?.usd_fuente) lines.push(`Fuente USD: ${presupuesto.usd_fuente === 'blue' ? 'Blue' : 'Oficial'}`);
    if (presupuesto?.usd_valor) lines.push(`Referencia: ${presupuesto.usd_valor}`);
  }
  if (Number.isFinite(Number(snap?.valor))) {
    lines.push(`Valor guardado: ${Number(snap.valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  if (snap?.fecha_origen) lines.push(`Fecha de cotización: ${snap.fecha_origen}`);
  return lines;
};

const addMetadataBlock = (doc, presupuesto, empresaNombre, displayCurrency) => {
  const yStart = 40;
  const list = [
    ['Empresa', empresaNombre || presupuesto.empresa_nombre || '—'],
    ['Dirección de obra', presupuesto.obra_direccion || '—'],
    ['Proyecto', presupuesto.proyecto_nombre || '—'],
    ['Moneda', displayCurrency],
    ['Fecha', formatDate(presupuesto.fecha || presupuesto.createdAt)],
  ];

  doc.setFontSize(10);
  doc.setTextColor(255);
  doc.setDrawColor(255);
  doc.setLineWidth(0.7);
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
  const displayCurrency = currency.toUpperCase();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'normal');

  // Header
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 0, PAGE_WIDTH, 38, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255);
  doc.text('Presupuesto Profesional', MARGIN, 16);

  doc.setFontSize(10);
  doc.text(formatDate(presupuesto.fecha || presupuesto.createdAt), MARGIN, 23);

  const logoUrl = presupuesto.empresa_logo_url;
  const logoDataUrl = await loadImageAsDataUrl(logoUrl);
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', PAGE_WIDTH - MARGIN - 35, 5, 35, 28);
  } else if (empresa?.nombre) {
    doc.setFontSize(12);
    doc.text(empresa.nombre, PAGE_WIDTH - MARGIN - 35, 23, { align: 'right' });
  }

  // Metadata
  doc.setTextColor(0);
  doc.setFontSize(11);
  const finalMetaY = addMetadataBlock(doc, presupuesto, empresa?.nombre, displayCurrency);

  // Tabla de rubros y tareas
  const { body, metadata } = buildRubroRows(
    rubros.map((r) => ({ ...r, moneda: currency })),
    totalNeto
  );
  body.push(['', 'TOTAL PRESUPUESTO', formatCurrency(totalNeto, currency), '100%']);
  metadata.push({ type: 'total' });

  autoTable(doc, {
    startY: finalMetaY + 4,
    head: [['Item', 'Descripción', 'Total', 'Inc.']],
    body,
    theme: 'grid',
    headStyles: { fillColor: [10, 71, 145], textColor: 255 },
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
        data.cell.styles.textColor = 255;
        data.cell.styles.fillColor = ACCENT_COLOR;
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
  const ajusteMonetarioLines = buildAjusteMonetarioLines(presupuesto);

  if (notesForBlock || surfaceLines.length || ajusteMonetarioLines.length) {
    const infoWidth = PAGE_WIDTH - MARGIN * 2;
    const startY = currentY + 4;
    const padding = 6;
    let blockHeight = 0;

    const noteLines = notesForBlock
      ? doc.splitTextToSize(notesForBlock, infoWidth - padding * 2)
      : [];
    blockHeight += noteLines.length * 5;

    blockHeight += ajusteMonetarioLines.length * 5;
    blockHeight += surfaceLines.length * 5;
    blockHeight += 12; // headers and spacing

    doc.setDrawColor(BORDER_COLOR);
    doc.rect(MARGIN, startY, infoWidth, blockHeight + padding, 'S');

    let textY = startY + 8;
    if (ajusteMonetarioLines.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Ajuste monetario', MARGIN + padding, textY);
      textY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      ajusteMonetarioLines.forEach((line) => {
        doc.text(line, MARGIN + padding, textY);
        textY += 5;
      });
      textY += 3;
    }

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
