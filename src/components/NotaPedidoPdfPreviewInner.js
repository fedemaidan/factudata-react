import React, { useMemo } from 'react';
import { PDFViewer } from '@react-pdf/renderer';

/**
 * Solo cliente: cargado con dynamic(..., { ssr: false }).
 * Renderiza el componente PlantillaPDF dinámico en el PDFViewer.
 */
const NotaPedidoPdfPreviewInner = ({ PlantillaPDF, nota, logoDataUrl, empresaNombre }) => {
  const document = useMemo(
    () => <PlantillaPDF nota={nota} logoDataUrl={logoDataUrl} empresaNombre={empresaNombre} />,
    [PlantillaPDF, nota, logoDataUrl, empresaNombre]
  );

  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
      {document}
    </PDFViewer>
  );
};

export default React.memo(NotaPedidoPdfPreviewInner);
