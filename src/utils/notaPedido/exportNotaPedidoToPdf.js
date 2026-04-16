import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { NotaPedidoPdfDocument } from './PdfNotaPedidoDocument';
import { loadImageAsDataUrl } from '../presupuestos/loadLogoForPdf';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

export async function downloadNotaPedidoPdf({ nota, layout, logoUrl, empresaNombre }) {
  const logoDataUrl = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  const blob = await pdf(
    <NotaPedidoPdfDocument
      nota={nota}
      layout={layout || {}}
      logoDataUrl={logoDataUrl}
      empresaNombre={empresaNombre || ''}
    />
  ).toBlob();

  const code = nota?.codigo != null ? String(nota.codigo) : 'nota';
  downloadBlob(blob, `nota-pedido-${code}.pdf`);
}
