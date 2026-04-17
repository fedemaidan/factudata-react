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

async function loadCustomComponent(componentUrl) {
  const res = await fetch(componentUrl);
  if (!res.ok) throw new Error('No se pudo cargar el componente de plantilla');
  const jsCode = await res.text();

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

export async function downloadNotaPedidoPdf({ nota, layout, logoUrl, empresaNombre, componentUrl }) {
  const logoDataUrl = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  const code = nota?.codigo != null ? String(nota.codigo) : 'nota';

  let blob;
  if (componentUrl) {
    try {
      const PlantillaPDF = await loadCustomComponent(componentUrl);
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
