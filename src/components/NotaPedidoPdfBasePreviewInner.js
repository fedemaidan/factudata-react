import React, { useMemo } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { NotaPedidoPdfDocument } from 'src/utils/notaPedido/PdfNotaPedidoDocument';

const NotaPedidoPdfBasePreviewInner = ({ nota, logoDataUrl, empresaNombre }) => {
  const doc = useMemo(
    () => (
      <NotaPedidoPdfDocument
        nota={nota}
        layout={{}}
        logoDataUrl={logoDataUrl}
        empresaNombre={empresaNombre || ''}
      />
    ),
    [nota, logoDataUrl, empresaNombre]
  );

  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
      {doc}
    </PDFViewer>
  );
};

export default React.memo(NotaPedidoPdfBasePreviewInner);
