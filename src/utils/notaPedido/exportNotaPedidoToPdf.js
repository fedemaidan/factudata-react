import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { NotaPedidoPdfDocument } from './PdfNotaPedidoDocument';
import { loadImageAsDataUrl } from '../presupuestos/loadLogoForPdf';
import notaPedidoService from 'src/services/notaPedidoService';

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

async function loadCustomComponentById(templateId) {
  const jsCode = await notaPedidoService.getComponentCode(templateId);
  if (!jsCode) throw new Error('No se pudo obtener el código del componente');

  const { Document, Page, Text, View, Image, StyleSheet } = await import('@react-pdf/renderer');

  // eslint-disable-next-line no-new-func
  const factory = new Function(
    'React', 'Document', 'Page', 'Text', 'View', 'Image', 'StyleSheet',
    `${jsCode}\nreturn typeof PlantillaPDF !== 'undefined' ? PlantillaPDF : null;`
  );

  const Component = factory(React, Document, Page, Text, View, Image, StyleSheet);
  if (!Component) throw new Error('PlantillaPDF no está definido en la plantilla');
  return Component;
}

export async function downloadNotaPedidoPdf({ nota, layout, logoUrl, empresaNombre, templateId }) {
  const logoDataUrl = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  const code = nota?.codigo != null ? String(nota.codigo) : 'nota';

  let blob;
  if (templateId) {
    try {
      const PlantillaPDF = await loadCustomComponentById(templateId);
      blob = await pdf(
        <PlantillaPDF nota={nota} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre || ''} />
      ).toBlob();
    } catch (err) {
      console.warn('Plantilla personalizada falló, usando default:', err);
      blob = await pdf(
        <NotaPedidoPdfDocument nota={nota} layout={layout || {}} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre || ''} />
      ).toBlob();
    }
  } else {
    blob = await pdf(
      <NotaPedidoPdfDocument nota={nota} layout={layout || {}} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre || ''} />
    ).toBlob();
  }

  downloadBlob(blob, `nota-pedido-${code}.pdf`);
}
