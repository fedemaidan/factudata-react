import React from 'react';

/**
 * Renderiza una plantilla PDF a blob y dispara la descarga en el navegador.
 *
 * `Component` es el componente PlantillaPDF (default o custom compilada) que recibe
 * `{ data, logoDataUrl, empresaNombre }`. Se hace dynamic-import de @react-pdf/renderer
 * para no romper el SSR de Next.
 */
export async function renderPlantillaToPdf({
  Component,
  data,
  logoDataUrl = null,
  empresaNombre = '',
  fileName = 'documento',
}) {
  if (!Component) throw new Error('Falta el componente de la plantilla');
  const { pdf } = await import('@react-pdf/renderer');
  const element = React.createElement(Component, { data, logoDataUrl, empresaNombre });
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default renderPlantillaToPdf;
